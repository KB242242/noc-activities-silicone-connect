import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canManageTicketEntities } from '@/lib/tickets/permissions';

type LocalityOption = {
  id?: string;
  name: string;
  countryCode?: string | null;
  countryName?: string | null;
  departement?: string | null;
  city?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  address?: string | null;
  reference?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  value: string;
  label: string;
};

function normalizeLocality(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(/(\s+|-|')/)
    .map((chunk) => {
      if (!chunk || /^(\s+|-|')$/.test(chunk)) return chunk;
      const [first, ...rest] = chunk;
      return `${first.toUpperCase()}${rest.join('').toLowerCase()}`;
    })
    .join('');
}

function normalizeLocalityKey(value: string): string {
  return normalizeLocality(value)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeLocality(value);
  return normalized.length > 0 ? normalized : null;
}

function toNullableCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return null;
  return cleaned.slice(0, 10);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNullableFreeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned.length > 0 ? cleaned : null;
}

function buildLocalityName(input: {
  directName?: string | null;
  countryName?: string | null;
  departement?: string | null;
  city?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  const directName = toNullableText(input.directName);
  if (directName) {
    return directName;
  }

  const parts = [
    toNullableText(input.countryName),
    toNullableText(input.departement),
    toNullableText(input.city),
    toNullableText(input.arrondissement),
    toNullableText(input.quartier),
    toNullableText(input.address),
  ].filter(Boolean) as string[];

  const lat = input.latitude;
  const lng = input.longitude;
  const coordinates = lat !== null && lat !== undefined && lng !== null && lng !== undefined
    ? `${lat}, ${lng}`
    : null;

  const base = parts.join(' - ');
  if (coordinates && base) {
    return `${base} (${coordinates})`;
  }
  if (coordinates) {
    return coordinates;
  }
  return base;
}

function toPersistedLocalityName(value: string): string {
  // DB column is VARCHAR(255); trimming avoids insertion failures for long concatenations.
  return value.length > 255 ? value.slice(0, 255) : value;
}

async function ensureTicketLocalitiesTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_ticket_localities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      name_normalized VARCHAR(255) NOT NULL,
      country_code VARCHAR(10) NULL,
      country_name VARCHAR(255) NULL,
      departement VARCHAR(120) NULL,
      city VARCHAR(120) NULL,
      arrondissement VARCHAR(120) NULL,
      quartier VARCHAR(120) NULL,
      address TEXT NULL,
      reference_note TEXT NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ticket_localities_name_normalized (name_normalized)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Add columns that may be missing in older deployments.
  // Using try/catch is more reliable than information_schema checks which can race or vary by MySQL locale.
  const addColumnIfMissing = async (sql: string) => {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore "duplicate column" errors (MySQL 1060) in any locale
      if (!/1060|duplicate column|already exists|d.j. utilis/i.test(msg)) throw err;
    }
  };

  await addColumnIfMissing(`ALTER TABLE noc_ticket_localities ADD COLUMN departement VARCHAR(120) NULL AFTER country_name`);
  await addColumnIfMissing(`ALTER TABLE noc_ticket_localities ADD COLUMN reference_note TEXT NULL AFTER address`);
}

async function hasTicketManagementAccess(body: Record<string, unknown>): Promise<boolean> {
  const actorId = String(
    body.requesterId
    ?? body.actorId
    ?? body.userId
    ?? body.creatorId
    ?? body.createdBy
    ?? body.updatedById
    ?? body.deletedBy
    ?? ''
  ).trim();

  if (!actorId) return false;

  const actor = await (db as any).user.findUnique({
    where: { id: actorId },
    select: { role: true },
  }).catch(() => null);

  return canManageTicketEntities(actor?.role);
}

export async function GET() {
  try {
    await ensureTicketLocalitiesTable();

    const siteRows = await db.$queryRaw<Array<{ localite: string | null }>>`
      SELECT DISTINCT localite
      FROM noc_sites
      WHERE localite IS NOT NULL AND TRIM(localite) <> ''
      ORDER BY localite ASC
    `.catch(() => []);

    const ticketRows = await db.$queryRaw<Array<{ localite: string | null }>>`
      SELECT DISTINCT localite
      FROM tickets
      WHERE localite IS NOT NULL AND TRIM(localite) <> ''
      ORDER BY localite ASC
    `.catch(() => []);

    const localitiesToEnsure = new Map<string, string>();
    [...siteRows, ...ticketRows].forEach((row) => {
      if (!row.localite) return;

      row.localite
        .split(',')
        .map((part) => normalizeLocality(part))
        .filter(Boolean)
        .forEach((locality) => {
          const key = normalizeLocalityKey(locality);
          if (!localitiesToEnsure.has(key)) localitiesToEnsure.set(key, locality);
        });
    });

    // Backfill managed table so all existing localities are editable from the "Modifier" tab.
    for (const [normalizedName, localityName] of localitiesToEnsure.entries()) {
      await db.$executeRaw`
        INSERT INTO noc_ticket_localities (name, name_normalized)
        VALUES (${localityName}, ${normalizedName})
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    const managedRows = await db.$queryRaw<Array<{
      id: bigint;
      name: string;
      country_code: string | null;
      country_name: string | null;
      departement: string | null;
      city: string | null;
      arrondissement: string | null;
      quartier: string | null;
      address: string | null;
      reference_note: string | null;
      latitude: number | null;
      longitude: number | null;
    }>>`
      SELECT id, name, country_code, country_name, departement, city, arrondissement, quartier, address, reference_note, latitude, longitude
      FROM noc_ticket_localities
      ORDER BY name ASC
    `.catch(() => []);

    const options = new Map<string, LocalityOption>();

    managedRows.forEach((row) => {
      const name = normalizeLocality(row.name ?? '');
      if (!name) return;
      const key = normalizeLocalityKey(name);

      options.set(key, {
        id: String(row.id),
        name,
        countryCode: row.country_code,
        countryName: row.country_name,
        departement: row.departement,
        city: row.city,
        arrondissement: row.arrondissement,
        quartier: row.quartier,
        address: row.address,
        reference: row.reference_note,
        latitude: row.latitude,
        longitude: row.longitude,
        value: name,
        label: name,
      });
    });

    const data: LocalityOption[] = Array.from(options.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return NextResponse.json(data);
  } catch (error) {
    console.error('[tickets/localities GET]', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    await ensureTicketLocalitiesTable();

    const body = await req.json().catch(() => ({}));
    if (!(await hasTicketManagementAccess(body as Record<string, unknown>))) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const countryCode = toNullableCountryCode(body.countryCode);
    const countryName = toNullableFreeText(body.countryName); // preserve accents
    const departement = toNullableText(body.departement);
    const city = toNullableText(body.city);
    const arrondissement = toNullableText(body.arrondissement);
    const quartier = toNullableText(body.quartier);
    const address = toNullableText(body.address);
    const reference = toNullableFreeText(body.reference);
    const directName = toNullableText(body.name ?? body.locality ?? body.localite);
    const latitude = toNullableNumber(body.latitude);
    const longitude = toNullableNumber(body.longitude);

    const generatedName = normalizeLocality(
      buildLocalityName({
        directName,
        countryName,
        departement,
        city,
        arrondissement,
        quartier,
        address,
        latitude,
        longitude,
      })
    );

    const name = toPersistedLocalityName(generatedName);

    if (!name) {
      return NextResponse.json(
        { error: 'Une localité ou au moins un champ de localisation est requis.' },
        { status: 400 }
      );
    }

    const normalizedName = toPersistedLocalityName(normalizeLocalityKey(name));

    await db.$executeRaw`
      INSERT INTO noc_ticket_localities
        (name, name_normalized, country_code, country_name, departement, city, arrondissement, quartier, address, reference_note, latitude, longitude)
      VALUES
        (${name}, ${normalizedName}, ${countryCode}, ${countryName}, ${departement}, ${city}, ${arrondissement}, ${quartier}, ${address}, ${reference}, ${latitude}, ${longitude})
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        country_code = VALUES(country_code),
        country_name = VALUES(country_name),
        departement = VALUES(departement),
        city = VALUES(city),
        arrondissement = VALUES(arrondissement),
        quartier = VALUES(quartier),
        address = VALUES(address),
        reference_note = VALUES(reference_note),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        updated_at = CURRENT_TIMESTAMP
    `;

    const rows = await db.$queryRaw<Array<{
      id: bigint;
      name: string;
      country_code: string | null;
      country_name: string | null;
      departement: string | null;
      city: string | null;
      arrondissement: string | null;
      quartier: string | null;
      address: string | null;
      reference_note: string | null;
      latitude: number | null;
      longitude: number | null;
    }>>`
      SELECT id, name, country_code, country_name, departement, city, arrondissement, quartier, address, reference_note, latitude, longitude
      FROM noc_ticket_localities
      WHERE name_normalized = ${normalizedName}
      LIMIT 1
    `;

    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: 'La localité a été enregistrée mais n\'a pas pu être relue.' },
        { status: 500 }
      );
    }

    const data: LocalityOption = {
      id: String(created.id),
      name: created.name,
      countryCode: created.country_code,
      countryName: created.country_name,
      departement: created.departement,
      city: created.city,
      arrondissement: created.arrondissement,
      quartier: created.quartier,
      address: created.address,
      reference: created.reference_note,
      latitude: created.latitude,
      longitude: created.longitude,
      value: created.name,
      label: created.name,
    };

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[tickets/localities POST]', error);
    const details = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Erreur serveur', details }, { status: 500 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureTicketLocalitiesTable();

    const body = await req.json().catch(() => ({}));
    if (!(await hasTicketManagementAccess(body as Record<string, unknown>))) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const rawId = String(body.id ?? '').trim();
    if (!rawId) {
      return NextResponse.json({ error: 'Identifiant de localité requis.' }, { status: 400 });
    }

    let localityId: bigint;
    try {
      localityId = BigInt(rawId);
    } catch {
      return NextResponse.json({ error: 'Identifiant de localité invalide.' }, { status: 400 });
    }

    const countryCode = toNullableCountryCode(body.countryCode);
    const countryName = toNullableFreeText(body.countryName); // preserve accents
    const departement = toNullableText(body.departement);
    const city = toNullableText(body.city);
    const arrondissement = toNullableText(body.arrondissement);
    const quartier = toNullableText(body.quartier);
    const address = toNullableText(body.address);
    const reference = toNullableFreeText(body.reference);
    const directName = toNullableText(body.name ?? body.locality ?? body.localite);
    const latitude = toNullableNumber(body.latitude);
    const longitude = toNullableNumber(body.longitude);

    const generatedName = normalizeLocality(
      buildLocalityName({
        directName,
        countryName,
        departement,
        city,
        arrondissement,
        quartier,
        address,
        latitude,
        longitude,
      })
    );

    const name = toPersistedLocalityName(generatedName);

    if (!name) {
      return NextResponse.json({ error: 'Le nom de la localité est requis.' }, { status: 400 });
    }

    const normalizedName = toPersistedLocalityName(normalizeLocalityKey(name));

    await db.$executeRaw`
      UPDATE noc_ticket_localities
      SET
        name = ${name},
        name_normalized = ${normalizedName},
        country_code = ${countryCode},
        country_name = ${countryName},
        departement = ${departement},
        city = ${city},
        arrondissement = ${arrondissement},
        quartier = ${quartier},
        address = ${address},
        reference_note = ${reference},
        latitude = ${latitude},
        longitude = ${longitude},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${localityId}
      LIMIT 1
    `;

    const rows = await db.$queryRaw<Array<{
      id: bigint;
      name: string;
      country_code: string | null;
      country_name: string | null;
      departement: string | null;
      city: string | null;
      arrondissement: string | null;
      quartier: string | null;
      address: string | null;
      reference_note: string | null;
      latitude: number | null;
      longitude: number | null;
    }>>`
      SELECT id, name, country_code, country_name, departement, city, arrondissement, quartier, address, reference_note, latitude, longitude
      FROM noc_ticket_localities
      WHERE id = ${localityId}
      LIMIT 1
    `;

    const updated = rows[0];
    if (!updated) {
      return NextResponse.json({ error: 'Localité introuvable.' }, { status: 404 });
    }

    const data: LocalityOption = {
      id: String(updated.id),
      name: updated.name,
      countryCode: updated.country_code,
      countryName: updated.country_name,
      departement: updated.departement,
      city: updated.city,
      arrondissement: updated.arrondissement,
      quartier: updated.quartier,
      address: updated.address,
      reference: updated.reference_note,
      latitude: updated.latitude,
      longitude: updated.longitude,
      value: updated.name,
      label: updated.name,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('[tickets/localities PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTicketLocalitiesTable();

    const body = await req.json().catch(() => ({}));
    if (!(await hasTicketManagementAccess(body as Record<string, unknown>))) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const rawId = String(body.id ?? '').trim();
    if (!rawId) {
      return NextResponse.json({ error: 'Identifiant de localité requis.' }, { status: 400 });
    }

    let localityId: bigint;
    try {
      localityId = BigInt(rawId);
    } catch {
      return NextResponse.json({ error: 'Identifiant de localité invalide.' }, { status: 400 });
    }

    await db.$executeRaw`
      DELETE FROM noc_ticket_localities
      WHERE id = ${localityId}
      LIMIT 1
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tickets/localities DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
