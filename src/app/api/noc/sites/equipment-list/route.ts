import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type EquipRow = {
  id_equipement: bigint;
  equipement_code: string;
  equipement_type: string;
  vendor: string | null;
  model: string | null;
  status: string;
  client_name: string | null;
};

/**
 * GET /api/noc/sites/equipment-list
 * Returns a list of all equipment for use in the sites form.
 * Optional query param: ?site_id=<id> — marks equipment already linked to this site.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('site_id');

    const rows = await db.$queryRaw<EquipRow[]>`
      SELECT e.id_equipement, e.equipement_code, e.equipement_type,
             e.vendor, e.model, e.status,
             c.client_name
      FROM noc_equipements e
      LEFT JOIN noc_clients c ON c.id_client = e.client_id
      ORDER BY e.equipement_code ASC
      LIMIT 2000
    `;

    let linkedIds = new Set<string>();
    if (siteId) {
      const linked = await db.$queryRaw<{ equipement_id: bigint }[]>`
        SELECT equipement_id FROM noc_site_equipements WHERE site_id = ${BigInt(siteId)}
      `;
      linkedIds = new Set(linked.map((r) => String(r.equipement_id)));
    }

    const data = rows.map((e) => ({
      id: String(e.id_equipement),
      equipement_code: e.equipement_code,
      equipement_type: e.equipement_type,
      vendor: e.vendor,
      model: e.model,
      status: e.status,
      client_name: e.client_name,
      linked: linkedIds.has(String(e.id_equipement)),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Sites equipment-list API]', error);
    return NextResponse.json({ error: 'Failed to fetch equipment list' }, { status: 500 });
  }
}
