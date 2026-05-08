import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type SiteRow = {
  id: bigint;
  site_ref: string;
  site_name: string;
  site_type_infra: string;
  departement: string;
  arrondissement: string | null;
  quartier: string | null;
  localite: string | null;
  latitude: string | null;
  longitude: string | null;
  lieu_exact: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  service_phone: string | null;
  status: string;
  description: string | null;
  infrastructure_notes: string | null;
  created_at: Date;
  updated_at: Date;
  equipment_count?: bigint;
  vigiles_count?: bigint;
};

type EquipRow = {
  id_equipement: bigint;
  equipement_code: string;
  equipement_type: string;
  vendor: string | null;
  model: string | null;
  status: string;
  client_name: string | null;
};

type GuardRow = {
  id: bigint;
  first_name: string;
  last_name: string;
  personal_phone: string | null;
  is_active: number;
};

function serializeSite(row: SiteRow, equipements?: EquipRow[], vigiles?: GuardRow[]) {
  return {
    id: String(row.id),
    site_ref: row.site_ref,
    site_name: row.site_name,
    site_type_infra: row.site_type_infra,
    departement: row.departement,
    arrondissement: row.arrondissement ?? null,
    quartier: row.quartier ?? null,
    localite: row.localite ?? null,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    lieu_exact: row.lieu_exact ?? null,
    responsible_name: row.responsible_name ?? null,
    responsible_phone: row.responsible_phone ?? null,
    contact_email: row.contact_email ?? null,
    contact_phone: row.contact_phone ?? null,
    service_phone: row.service_phone ?? null,
    status: row.status,
    description: row.description ?? null,
    infrastructure_notes: row.infrastructure_notes ?? null,
    equipment_count: Number(row.equipment_count ?? 0),
    vigiles_count: Number(row.vigiles_count ?? 0),
    equipements: equipements
      ? equipements.map((e) => ({
          id: String(e.id_equipement),
          equipement_code: e.equipement_code,
          equipement_type: e.equipement_type,
          vendor: e.vendor,
          model: e.model,
          status: e.status,
          client_name: e.client_name,
        }))
      : undefined,
    vigiles: vigiles
      ? vigiles.map((vigile) => ({
          id: String(vigile.id),
          first_name: vigile.first_name,
          last_name: vigile.last_name,
          full_name: `${vigile.first_name} ${vigile.last_name}`.trim(),
          personal_phone: vigile.personal_phone ?? null,
          is_active: Boolean(vigile.is_active),
        }))
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (id) {
      const siteId = BigInt(id);
      const [sites, equipements, vigiles] = await Promise.all([
        db.$queryRaw<SiteRow[]>`
          SELECT s.*,
            (SELECT COUNT(*) FROM noc_site_equipements se WHERE se.site_id = s.id) AS equipment_count,
            (SELECT COUNT(*) FROM noc_site_vigiles sv WHERE sv.site_id = s.id) AS vigiles_count
          FROM noc_sites s
          WHERE s.id = ${siteId}
          LIMIT 1
        `,
        db.$queryRaw<EquipRow[]>`
          SELECT e.id_equipement, e.equipement_code, e.equipement_type,
                 e.vendor, e.model, e.status, c.client_name
          FROM noc_site_equipements se
          JOIN noc_equipements e ON e.id_equipement = se.equipement_id
          LEFT JOIN noc_clients c ON c.id_client = e.client_id
          WHERE se.site_id = ${siteId}
          ORDER BY e.equipement_code ASC
        `,
        db.$queryRaw<GuardRow[]>`
          SELECT sv.id, sv.first_name, sv.last_name, sv.personal_phone, sv.is_active
          FROM noc_site_vigiles sv
          WHERE sv.site_id = ${siteId}
          ORDER BY sv.last_name ASC, sv.first_name ASC
        `,
      ]);

      if (sites.length === 0) {
        return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
      }
      return NextResponse.json(serializeSite(sites[0], equipements, vigiles));
    }

    // List all sites with equipment count
    const [sites, totalResult] = await Promise.all([
      db.$queryRaw<SiteRow[]>`
        SELECT s.*,
          (SELECT COUNT(*) FROM noc_site_equipements se WHERE se.site_id = s.id) AS equipment_count,
          (SELECT COUNT(*) FROM noc_site_vigiles sv WHERE sv.site_id = s.id) AS vigiles_count
        FROM noc_sites s
        ORDER BY s.site_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM noc_sites`,
    ]);

    const total = Number(totalResult[0]?.total || 0);
    return NextResponse.json({
      data: sites.map((s) => serializeSite(s)),
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Sites API GET]', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      site_ref, site_name, site_type_infra, departement,
      arrondissement, quartier, localite,
      latitude, longitude, lieu_exact,
      responsible_name, responsible_phone,
      contact_email, contact_phone, service_phone, status,
      description, infrastructure_notes,
      vigiles = [],
      equipement_ids = [],
    } = body;

    if (!site_ref?.trim() || !site_name?.trim() || !departement?.trim() || !status) {
      return NextResponse.json(
        { error: 'Champs obligatoires : site_ref, site_name, departement, status' },
        { status: 400 }
      );
    }

    const existing = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_sites WHERE site_ref = ${site_ref} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: `Référence '${site_ref}' déjà utilisée` }, { status: 409 });
    }

    await db.$executeRaw`
      INSERT INTO noc_sites (
        site_ref, site_name, site_type_infra, departement,
        arrondissement, quartier, localite,
        latitude, longitude, lieu_exact,
        responsible_name, responsible_phone,
        contact_email, contact_phone, service_phone, status,
        description, infrastructure_notes, created_at, updated_at
      ) VALUES (
        ${site_ref.trim()}, ${site_name.trim()},
        ${site_type_infra || 'ACTIF'}, ${departement.trim()},
        ${arrondissement?.trim() || null}, ${quartier?.trim() || null}, ${localite?.trim() || null},
        ${latitude != null ? parseFloat(String(latitude)) : null},
        ${longitude != null ? parseFloat(String(longitude)) : null},
        ${lieu_exact?.trim() || null},
        ${responsible_name?.trim() || null}, ${responsible_phone?.trim() || null},
        ${contact_email?.trim() || null}, ${contact_phone?.trim() || null}, ${service_phone?.trim() || null},
        ${status},
        ${description?.trim() || null}, ${infrastructure_notes?.trim() || null},
        NOW(), NOW()
      )
    `;

    const inserted = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_sites WHERE site_ref = ${site_ref} LIMIT 1
    `;
    const newId = inserted[0].id;

    if (Array.isArray(equipement_ids) && equipement_ids.length > 0) {
      for (const eid of equipement_ids) {
        const equipId = BigInt(eid);
        await db.$executeRaw`
          INSERT IGNORE INTO noc_site_equipements (site_id, equipement_id) VALUES (${newId}, ${equipId})
        `;
      }
    }

    if (Array.isArray(vigiles) && vigiles.length > 0) {
      for (const vigile of vigiles) {
        const firstName = vigile?.first_name?.trim();
        const lastName = vigile?.last_name?.trim();
        if (!firstName || !lastName) continue;
        await db.$executeRaw`
          INSERT INTO noc_site_vigiles (site_id, first_name, last_name, personal_phone, is_active)
          VALUES (${newId}, ${firstName}, ${lastName}, ${vigile?.personal_phone?.trim() || null}, 1)
        `;
      }
    }

    const [siteRows, equipRows, guardRows] = await Promise.all([
      db.$queryRaw<SiteRow[]>`
        SELECT s.*,
          (SELECT COUNT(*) FROM noc_site_equipements se WHERE se.site_id = s.id) AS equipment_count,
          (SELECT COUNT(*) FROM noc_site_vigiles sv WHERE sv.site_id = s.id) AS vigiles_count
        FROM noc_sites s WHERE s.id = ${newId} LIMIT 1
      `,
      db.$queryRaw<EquipRow[]>`
        SELECT e.id_equipement, e.equipement_code, e.equipement_type, e.vendor, e.model, e.status, c.client_name
        FROM noc_site_equipements se
        JOIN noc_equipements e ON e.id_equipement = se.equipement_id
        LEFT JOIN noc_clients c ON c.id_client = e.client_id
        WHERE se.site_id = ${newId} ORDER BY e.equipement_code ASC
      `,
      db.$queryRaw<GuardRow[]>`
        SELECT sv.id, sv.first_name, sv.last_name, sv.personal_phone, sv.is_active
        FROM noc_site_vigiles sv
        WHERE sv.site_id = ${newId}
        ORDER BY sv.last_name ASC, sv.first_name ASC
      `,
    ]);

    return NextResponse.json(serializeSite(siteRows[0], equipRows, guardRows), { status: 201 });
  } catch (error) {
    console.error('[Sites API POST]', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id, site_ref, site_name, site_type_infra, departement,
      arrondissement, quartier, localite,
      latitude, longitude, lieu_exact,
      responsible_name, responsible_phone,
      contact_email, contact_phone, service_phone, status,
      description, infrastructure_notes, vigiles, equipement_ids,
    } = body;

    if (!id) return NextResponse.json({ error: 'Champ id obligatoire' }, { status: 400 });

    const siteId = BigInt(id);

    const existing = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_sites WHERE id = ${siteId} LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
    }

    if (site_ref) {
      const refConflict = await db.$queryRaw<{ id: bigint }[]>`
        SELECT id FROM noc_sites WHERE site_ref = ${site_ref} AND id != ${siteId} LIMIT 1
      `;
      if (refConflict.length > 0) {
        return NextResponse.json({ error: `Référence '${site_ref}' déjà utilisée` }, { status: 409 });
      }
    }

    await db.$executeRaw`
      UPDATE noc_sites SET
        site_ref          = COALESCE(${site_ref?.trim() ?? null}, site_ref),
        site_name         = COALESCE(${site_name?.trim() ?? null}, site_name),
        site_type_infra   = COALESCE(${site_type_infra ?? null}, site_type_infra),
        departement       = COALESCE(${departement?.trim() ?? null}, departement),
        arrondissement    = COALESCE(${arrondissement?.trim() ?? null}, arrondissement),
        quartier          = COALESCE(${quartier?.trim() ?? null}, quartier),
        localite          = COALESCE(${localite?.trim() ?? null}, localite),
        latitude          = COALESCE(${latitude != null ? parseFloat(String(latitude)) : null}, latitude),
        longitude         = COALESCE(${longitude != null ? parseFloat(String(longitude)) : null}, longitude),
        lieu_exact        = COALESCE(${lieu_exact?.trim() ?? null}, lieu_exact),
        responsible_name  = COALESCE(${responsible_name?.trim() ?? null}, responsible_name),
        responsible_phone = COALESCE(${responsible_phone?.trim() ?? null}, responsible_phone),
        contact_email     = COALESCE(${contact_email?.trim() ?? null}, contact_email),
        contact_phone     = COALESCE(${contact_phone?.trim() ?? null}, contact_phone),
        service_phone     = COALESCE(${service_phone?.trim() ?? null}, service_phone),
        status            = COALESCE(${status ?? null}, status),
        description       = COALESCE(${description?.trim() ?? null}, description),
        infrastructure_notes = COALESCE(${infrastructure_notes?.trim() ?? null}, infrastructure_notes),
        updated_at        = NOW()
      WHERE id = ${siteId}
    `;

    if (Array.isArray(equipement_ids)) {
      await db.$executeRaw`DELETE FROM noc_site_equipements WHERE site_id = ${siteId}`;
      for (const eid of equipement_ids) {
        const equipId = BigInt(eid);
        await db.$executeRaw`
          INSERT IGNORE INTO noc_site_equipements (site_id, equipement_id) VALUES (${siteId}, ${equipId})
        `;
      }
    }

    if (Array.isArray(vigiles)) {
      await db.$executeRaw`DELETE FROM noc_site_vigiles WHERE site_id = ${siteId}`;
      for (const vigile of vigiles) {
        const firstName = vigile?.first_name?.trim();
        const lastName = vigile?.last_name?.trim();
        if (!firstName || !lastName) continue;
        await db.$executeRaw`
          INSERT INTO noc_site_vigiles (site_id, first_name, last_name, personal_phone, is_active)
          VALUES (${siteId}, ${firstName}, ${lastName}, ${vigile?.personal_phone?.trim() || null}, ${vigile?.is_active === false ? 0 : 1})
        `;
      }
    }

    const [siteRows, equipRows, guardRows] = await Promise.all([
      db.$queryRaw<SiteRow[]>`
        SELECT s.*,
          (SELECT COUNT(*) FROM noc_site_equipements se WHERE se.site_id = s.id) AS equipment_count,
          (SELECT COUNT(*) FROM noc_site_vigiles sv WHERE sv.site_id = s.id) AS vigiles_count
        FROM noc_sites s WHERE s.id = ${siteId} LIMIT 1
      `,
      db.$queryRaw<EquipRow[]>`
        SELECT e.id_equipement, e.equipement_code, e.equipement_type, e.vendor, e.model, e.status, c.client_name
        FROM noc_site_equipements se
        JOIN noc_equipements e ON e.id_equipement = se.equipement_id
        LEFT JOIN noc_clients c ON c.id_client = e.client_id
        WHERE se.site_id = ${siteId} ORDER BY e.equipement_code ASC
      `,
      db.$queryRaw<GuardRow[]>`
        SELECT sv.id, sv.first_name, sv.last_name, sv.personal_phone, sv.is_active
        FROM noc_site_vigiles sv
        WHERE sv.site_id = ${siteId}
        ORDER BY sv.last_name ASC, sv.first_name ASC
      `,
    ]);

    return NextResponse.json(serializeSite(siteRows[0], equipRows, guardRows));
  } catch (error) {
    console.error('[Sites API PUT]', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Paramètre id obligatoire' }, { status: 400 });

    const siteId = BigInt(id);
    const existing = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_sites WHERE id = ${siteId} LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
    }

    await db.$executeRaw`DELETE FROM noc_sites WHERE id = ${siteId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sites API DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}
