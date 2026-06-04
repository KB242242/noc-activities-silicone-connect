import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const history = await (db as any).ticketHistory.findMany({
      where: { ticketId: id },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return NextResponse.json(
      history.map((h: any) => ({
        id: h.id,
        ticketId: h.ticketId,
        userId: h.userId ?? '',
        userName: h.userName ?? 'Système',
        action: h.action ?? '',
        field: h.field ?? undefined,
        oldValue: h.oldValue ?? undefined,
        newValue: h.newValue ?? undefined,
        createdAt: h.timestamp ?? null,
      }))
    );
  } catch (err) {
    console.error('[tickets/:id/history GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'ticket_modified');
    const field = body.field ? String(body.field) : null;
    const oldValue = body.oldValue === undefined ? null : String(body.oldValue ?? '');
    const newValue = body.newValue === undefined ? null : String(body.newValue ?? '');
    const userId = String(body.userId ?? 'system');
    const userName = String(body.userName ?? 'Système');

    const actorAccess = await resolveTicketManagerFromActorId(db, userId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const created = await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action,
        field,
        oldValue,
        newValue,
        userId,
        userName,
      },
    });

    return NextResponse.json({
      success: true,
      history: {
        id: created.id,
        ticketId: created.ticketId,
        userId: created.userId ?? '',
        userName: created.userName ?? 'Système',
        action: created.action ?? '',
        field: created.field ?? undefined,
        oldValue: created.oldValue ?? undefined,
        newValue: created.newValue ?? undefined,
        createdAt: created.timestamp ?? null,
      },
    });
  } catch (err) {
    console.error('[tickets/:id/history POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
