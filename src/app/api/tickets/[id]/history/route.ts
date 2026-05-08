import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const history = await (db as any).ticketHistory.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' },
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
        createdAt: h.createdAt,
      }))
    );
  } catch (err) {
    console.error('[tickets/:id/history GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
