import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type LocalityOption = {
  id?: string;
  name: string;
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  value: string;
  label: string;
};

function normalizeLocality(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeLocality(value);
  return normalized.length > 0 ? normalized : null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildLocalityName(input: {
  directName?: string | null;
  countryName?: string | null;
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

async function ensureTicketLocalitiesTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_ticket_localities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      name_normalized VARCHAR(255) NOT NULL,
      country_code VARCHAR(10) NULL,
      country_name VARCHAR(120) NULL,
      city VARCHAR(120) NULL,
      arrondissement VARCHAR(120) NULL,
      quartier VARCHAR(120) NULL,
      address TEXT NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ticket_localities_name_normalized (name_normalized)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET() {
  try {
    await ensureTicketLocalitiesTable();

    const managedRows = await db.$queryRaw<Array<{
      id: bigint;
      name: string;
      country_code: string | null;
      country_name: string | null;
      city: string | null;
      arrondissement: string | null;
      quartier: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
    }>>`
      SELECT id, name, country_code, country_name, city, arrondissement, quartier, address, latitude, longitude
      FROM noc_ticket_localities
      ORDER BY name ASC
    `.catch(() => []);

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

    const values = new Map<string, string>();
    const options = new Map<string, LocalityOption>();

    managedRows.forEach((row) => {
      const name = normalizeLocality(row.name ?? '');
      if (!name) return;
      const key = name.toLowerCase();

      options.set(key, {
        id: String(row.id),
        name,
        countryCode: row.country_code,
        countryName: row.country_name,
        city: row.city,
        arrondissement: row.arrondissement,
        quartier: row.quartier,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        value: name,
        label: name,
      });
    });

    [...siteRows, ...ticketRows].forEach((row) => {
      if (!row.localite) return;

      row.localite
        .split(',')
        .map((part) => normalizeLocality(part))
        .filter(Boolean)
        .forEach((locality) => {
          const key = locality.toLowerCase();
          if (!values.has(key)) {
            values.set(key, locality);
          }
          if (!options.has(key)) {
            options.set(key, {
              name: locality,
              value: locality,
              label: locality,
            });
          }
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
    const countryCode = toNullableText(body.countryCode);
    const countryName = toNullableText(body.countryName);
    const city = toNullableText(body.city);
    const arrondissement = toNullableText(body.arrondissement);
    const quartier = toNullableText(body.quartier);
    const address = toNullableText(body.address);
    const directName = toNullableText(body.name ?? body.locality ?? body.localite);
    const latitude = toNullableNumber(body.latitude);
    const longitude = toNullableNumber(body.longitude);

    const name = normalizeLocality(
      buildLocalityName({
        directName,
        countryName,
        city,
        arrondissement,
        quartier,
        address,
        latitude,
        longitude,
      })
    );

    if (!name) {
      return NextResponse.json(
        { error: 'Une localité ou au moins un champ de localisation est requis.' },
        { status: 400 }
      );
    }

    const normalizedName = name.toLowerCase();

    await db.$executeRaw`
      INSERT INTO noc_ticket_localities
        (name, name_normalized, country_code, country_name, city, arrondissement, quartier, address, latitude, longitude)
      VALUES
        (${name}, ${normalizedName}, ${countryCode}, ${countryName}, ${city}, ${arrondissement}, ${quartier}, ${address}, ${latitude}, ${longitude})
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        country_code = VALUES(country_code),
        country_name = VALUES(country_name),
        city = VALUES(city),
        arrondissement = VALUES(arrondissement),
        quartier = VALUES(quartier),
        address = VALUES(address),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        updated_at = CURRENT_TIMESTAMP
    `;

    const rows = await db.$queryRaw<Array<{
      id: bigint;
      name: string;
      country_code: string | null;
      country_name: string | null;
      city: string | null;
      arrondissement: string | null;
      quartier: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
    }>>`
      SELECT id, name, country_code, country_name, city, arrondissement, quartier, address, latitude, longitude
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
      city: created.city,
      arrondissement: created.arrondissement,
      quartier: created.quartier,
      address: created.address,
      latitude: created.latitude,
      longitude: created.longitude,
      value: created.name,
      label: created.name,
    };

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[tickets/localities POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
