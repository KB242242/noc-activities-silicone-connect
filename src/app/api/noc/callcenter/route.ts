import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type SettingsRow = {
  id: number;
  line1: string;
  line2: string;
  provider: 'NONE' | 'TWILIO' | 'ASTERISK' | '3CX';
  webhook_url: string | null;
};

type CallRow = {
  id: bigint;
  customer_name: string;
  customer_phone: string;
  line_number: string;
  direction: 'INCOMING' | 'OUTGOING';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'RINGING' | 'IN_PROGRESS' | 'MISSED' | 'DONE';
  reason: string | null;
  external_call_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const DEFAULT_SETTINGS: SettingsRow = {
  id: 1,
  line1: '+242053895704',
  line2: '+242067236935',
  provider: 'NONE',
  webhook_url: null,
};

function isMissingTableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('1146') || error.message.includes('doesn\'t exist');
}

function serializeCall(row: CallRow) {
  return {
    id: String(row.id),
    customer: row.customer_name,
    phone: row.customer_phone,
    line: row.line_number,
    direction: row.direction,
    priority: row.priority,
    status: row.status,
    reason: row.reason ?? '',
    external_call_id: row.external_call_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

    const [settingsRows, callRows] = await Promise.all([
      db.$queryRaw<SettingsRow[]>`SELECT id, line1, line2, provider, webhook_url FROM noc_callcenter_settings WHERE id = 1 LIMIT 1`,
      db.$queryRaw<CallRow[]>`
        SELECT id, customer_name, customer_phone, line_number, direction, priority, status, reason, external_call_id, created_at, updated_at
        FROM noc_callcenter_calls
        ORDER BY created_at DESC
        LIMIT ${limit}
      `,
    ]);

    return NextResponse.json({
      settings: settingsRows[0] ?? DEFAULT_SETTINGS,
      calls: callRows.map(serializeCall),
    });
  } catch (error) {
    console.error('[CallCenter API GET]', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({
        error: 'Tables Call Center absentes. Appliquez database/noc_callcenter_migration.sql',
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch call center data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.kind === 'settings') {
      const line1 = String(body?.line1 || '').trim();
      const line2 = String(body?.line2 || '').trim();
      const provider = body?.provider;
      const webhookUrl = typeof body?.webhook_url === 'string' ? body.webhook_url.trim() : null;

      if (!line1 || !line2) {
        return NextResponse.json({ error: 'line1 et line2 sont obligatoires' }, { status: 400 });
      }
      if (!['NONE', 'TWILIO', 'ASTERISK', '3CX'].includes(provider)) {
        return NextResponse.json({ error: 'provider invalide' }, { status: 400 });
      }

      await db.$executeRaw`
        INSERT INTO noc_callcenter_settings (id, line1, line2, provider, webhook_url)
        VALUES (1, ${line1}, ${line2}, ${provider}, ${webhookUrl || null})
        ON DUPLICATE KEY UPDATE
          line1 = VALUES(line1),
          line2 = VALUES(line2),
          provider = VALUES(provider),
          webhook_url = VALUES(webhook_url),
          updated_at = CURRENT_TIMESTAMP
      `;

      const rows = await db.$queryRaw<SettingsRow[]>`
        SELECT id, line1, line2, provider, webhook_url FROM noc_callcenter_settings WHERE id = 1 LIMIT 1
      `;

      return NextResponse.json({ settings: rows[0] ?? DEFAULT_SETTINGS });
    }

    const customer = String(body?.customer || '').trim();
    const phone = String(body?.phone || '').trim();
    const line = String(body?.line || '').trim();
    const direction = body?.direction;
    const priority = body?.priority;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!customer || !phone || !line) {
      return NextResponse.json({ error: 'customer, phone, line sont obligatoires' }, { status: 400 });
    }
    if (!['INCOMING', 'OUTGOING'].includes(direction)) {
      return NextResponse.json({ error: 'direction invalide' }, { status: 400 });
    }
    if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
      return NextResponse.json({ error: 'priority invalide' }, { status: 400 });
    }

    const status = direction === 'INCOMING' ? 'RINGING' : 'IN_PROGRESS';

    await db.$executeRaw`
      INSERT INTO noc_callcenter_calls (
        customer_name, customer_phone, line_number, direction, priority, status, reason, created_at, updated_at
      ) VALUES (
        ${customer}, ${phone}, ${line}, ${direction}, ${priority}, ${status}, ${reason || null}, NOW(), NOW()
      )
    `;

    const inserted = await db.$queryRaw<CallRow[]>`
      SELECT id, customer_name, customer_phone, line_number, direction, priority, status, reason, external_call_id, created_at, updated_at
      FROM noc_callcenter_calls
      ORDER BY id DESC
      LIMIT 1
    `;

    return NextResponse.json({ call: serializeCall(inserted[0]) }, { status: 201 });
  } catch (error) {
    console.error('[CallCenter API POST]', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({
        error: 'Tables Call Center absentes. Appliquez database/noc_callcenter_migration.sql',
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create call center entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body?.id;
    const status = body?.status;

    if (!id) {
      return NextResponse.json({ error: 'id obligatoire' }, { status: 400 });
    }
    if (!['RINGING', 'IN_PROGRESS', 'MISSED', 'DONE'].includes(status)) {
      return NextResponse.json({ error: 'status invalide' }, { status: 400 });
    }

    await db.$executeRaw`
      UPDATE noc_callcenter_calls
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${BigInt(id)}
    `;

    const rows = await db.$queryRaw<CallRow[]>`
      SELECT id, customer_name, customer_phone, line_number, direction, priority, status, reason, external_call_id, created_at, updated_at
      FROM noc_callcenter_calls
      WHERE id = ${BigInt(id)}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Appel introuvable' }, { status: 404 });
    }

    return NextResponse.json({ call: serializeCall(rows[0]) });
  } catch (error) {
    console.error('[CallCenter API PUT]', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({
        error: 'Tables Call Center absentes. Appliquez database/noc_callcenter_migration.sql',
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to update call status' }, { status: 500 });
  }
}
