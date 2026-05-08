import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TOKEN = process.env.CALLCENTER_INGEST_TOKEN || '';

type IngestBody = {
  token?: string;
  external_call_id?: string;
  customer?: string;
  customer_phone?: string;
  line?: string;
  direction?: 'INCOMING' | 'OUTGOING';
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'RINGING' | 'IN_PROGRESS' | 'MISSED' | 'DONE';
  reason?: string;
};

function normalizeStatus(status?: string) {
  if (status === 'RINGING' || status === 'IN_PROGRESS' || status === 'MISSED' || status === 'DONE') return status;
  return 'RINGING';
}

function normalizePriority(priority?: string) {
  if (priority === 'CRITICAL' || priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') return priority;
  return 'MEDIUM';
}

function normalizeDirection(direction?: string) {
  if (direction === 'INCOMING' || direction === 'OUTGOING') return direction;
  return 'INCOMING';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IngestBody;

    if (TOKEN && body.token !== TOKEN) {
      return NextResponse.json({ error: 'Unauthorized ingest token' }, { status: 401 });
    }

    const customer = String(body.customer || 'Appel externe').trim();
    const customerPhone = String(body.customer_phone || '').trim();
    const line = String(body.line || '').trim();
    const direction = normalizeDirection(body.direction);
    const priority = normalizePriority(body.priority);
    const status = normalizeStatus(body.status);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const externalId = typeof body.external_call_id === 'string' ? body.external_call_id.trim() : '';

    if (!customerPhone || !line) {
      return NextResponse.json({ error: 'customer_phone et line sont obligatoires' }, { status: 400 });
    }

    if (externalId) {
      const existing = await db.$queryRaw<{ id: bigint }[]>`
        SELECT id FROM noc_callcenter_calls WHERE external_call_id = ${externalId} LIMIT 1
      `;

      if (existing.length > 0) {
        await db.$executeRaw`
          UPDATE noc_callcenter_calls
          SET customer_name = ${customer},
              customer_phone = ${customerPhone},
              line_number = ${line},
              direction = ${direction},
              priority = ${priority},
              status = ${status},
              reason = ${reason || null},
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;

        return NextResponse.json({ success: true, mode: 'updated', id: String(existing[0].id) });
      }
    }

    await db.$executeRaw`
      INSERT INTO noc_callcenter_calls (
        customer_name, customer_phone, line_number, direction, priority, status, reason, external_call_id, created_at, updated_at
      ) VALUES (
        ${customer}, ${customerPhone}, ${line}, ${direction}, ${priority}, ${status}, ${reason || null}, ${externalId || null}, NOW(), NOW()
      )
    `;

    const created = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_callcenter_calls ORDER BY id DESC LIMIT 1
    `;

    return NextResponse.json({ success: true, mode: 'created', id: String(created[0]?.id ?? '') }, { status: 201 });
  } catch (error) {
    console.error('[CallCenter Ingest POST]', error);
    return NextResponse.json({ error: 'Failed to ingest call event' }, { status: 500 });
  }
}
