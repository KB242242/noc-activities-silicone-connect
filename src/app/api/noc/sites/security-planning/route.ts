import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type PlanningRow = {
  id: bigint;
  site_id: bigint;
  site_name: string;
  site_ref: string;
  responsible_name: string | null;
  responsible_phone: string | null;
  service_phone: string | null;
  vigile_id: bigint;
  vigile_first_name: string;
  vigile_last_name: string;
  vigile_phone: string | null;
  shift_start: Date;
  shift_end: Date;
  status: string;
  notes: string | null;
};

function toMonthBounds(month: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function serializePlanning(row: PlanningRow) {
  const now = new Date();
  const vigileName = `${row.vigile_first_name} ${row.vigile_last_name}`.trim();
  return {
    id: String(row.id),
    site_id: String(row.site_id),
    site_name: row.site_name,
    site_ref: row.site_ref,
    responsible_name: row.responsible_name,
    responsible_phone: row.responsible_phone,
    service_phone: row.service_phone,
    vigile_id: String(row.vigile_id),
    vigile_name: vigileName,
    vigile_phone: row.vigile_phone,
    shift_start: row.shift_start.toISOString(),
    shift_end: row.shift_end.toISOString(),
    status: row.status,
    notes: row.notes,
    is_active_now: row.shift_start <= now && row.shift_end >= now && row.status !== 'CANCELLED',
  };
}

async function getPlanningRows(params: {
  siteId?: string | null;
  vigileId?: string | null;
  month?: string | null;
}) {
  const conditions: string[] = [];
  const values: Array<string | Date> = [];

  if (params.siteId) {
    conditions.push('p.site_id = ?');
    values.push(params.siteId);
  }

  if (params.vigileId) {
    conditions.push('p.vigile_id = ?');
    values.push(params.vigileId);
  }

  const bounds = toMonthBounds(params.month ?? null);
  if (bounds) {
    conditions.push('p.shift_start >= ?');
    conditions.push('p.shift_start < ?');
    values.push(bounds.start, bounds.end);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.$queryRawUnsafe<PlanningRow[]>(
    `
      SELECT
        p.id,
        p.site_id,
        s.site_name,
        s.site_ref,
        s.responsible_name,
        s.responsible_phone,
        s.service_phone,
        p.vigile_id,
        v.first_name AS vigile_first_name,
        v.last_name AS vigile_last_name,
        v.personal_phone AS vigile_phone,
        p.shift_start,
        p.shift_end,
        p.status,
        p.notes
      FROM noc_site_security_planning p
      INNER JOIN noc_sites s ON s.id = p.site_id
      INNER JOIN noc_site_vigiles v ON v.id = p.vigile_id
      ${whereClause}
      ORDER BY p.shift_start ASC, s.site_name ASC, v.last_name ASC, v.first_name ASC
    `,
    ...values,
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('site_id');
    const vigileId = url.searchParams.get('vigile_id');
    const month = url.searchParams.get('month');
    const rows = await getPlanningRows({ siteId, vigileId, month });
    return NextResponse.json({ data: rows.map(serializePlanning) });
  } catch (error) {
    console.error('[Sites Security Planning GET]', error);
    return NextResponse.json({ error: 'Failed to fetch security planning' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { site_id, vigile_id, shift_start, shift_end, status = 'PLANNED', notes } = body;

    if (!site_id || !vigile_id || !shift_start || !shift_end) {
      return NextResponse.json({ error: 'Champs obligatoires : site_id, vigile_id, shift_start, shift_end' }, { status: 400 });
    }

    const start = new Date(shift_start);
    const end = new Date(shift_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Période de service invalide' }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `
        INSERT INTO noc_site_security_planning
          (site_id, vigile_id, shift_start, shift_end, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      site_id,
      vigile_id,
      start,
      end,
      status,
      notes?.trim() || null,
    );

    const inserted = await db.$queryRawUnsafe<{ id: bigint }[]>(
      `
        SELECT id
        FROM noc_site_security_planning
        WHERE site_id = ? AND vigile_id = ? AND shift_start = ? AND shift_end = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      site_id,
      vigile_id,
      start,
      end,
    );

    const rows = await getPlanningRows({});
    const created = rows.find((row) => row.id === inserted[0]?.id);
    return NextResponse.json(created ? serializePlanning(created) : null, { status: 201 });
  } catch (error) {
    console.error('[Sites Security Planning POST]', error);
    return NextResponse.json({ error: 'Failed to create security planning entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, vigile_id, shift_start, shift_end, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Champ id obligatoire' }, { status: 400 });
    }

    const existing = await db.$queryRawUnsafe<{ id: bigint; site_id: bigint }[]>(
      'SELECT id, site_id FROM noc_site_security_planning WHERE id = ? LIMIT 1',
      id,
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 });
    }

    const start = shift_start ? new Date(shift_start) : null;
    const end = shift_end ? new Date(shift_end) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }
    if (start && end && end <= start) {
      return NextResponse.json({ error: 'La fin de service doit etre apres le debut' }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `
        UPDATE noc_site_security_planning
        SET vigile_id = COALESCE(?, vigile_id),
            shift_start = COALESCE(?, shift_start),
            shift_end = COALESCE(?, shift_end),
            status = COALESCE(?, status),
            notes = COALESCE(?, notes),
            updated_at = NOW()
        WHERE id = ?
      `,
      vigile_id ?? null,
      start,
      end,
      status ?? null,
      typeof notes === 'string' ? notes.trim() || null : null,
      id,
    );

    const rows = await getPlanningRows({ siteId: String(existing[0].site_id) });
    const updated = rows.find((row) => String(row.id) === String(id));
    return NextResponse.json(updated ? serializePlanning(updated) : null);
  } catch (error) {
    console.error('[Sites Security Planning PUT]', error);
    return NextResponse.json({ error: 'Failed to update security planning entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Paramètre id obligatoire' }, { status: 400 });
    }

    await db.$executeRawUnsafe('DELETE FROM noc_site_security_planning WHERE id = ?', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sites Security Planning DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete security planning entry' }, { status: 500 });
  }
}