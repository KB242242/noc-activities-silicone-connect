import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

const TICKET_VIEW_ACTION = 'ticket_viewed';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') ?? '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const rows = await (db as any).ticketHistory.findMany({
      where: {
        userId,
        action: TICKET_VIEW_ACTION,
      },
      select: {
        ticketId: true,
      },
      distinct: ['ticketId'],
      orderBy: {
        timestamp: 'desc',
      },
    });

    const ticketIds = Array.from(
      new Set(
        rows
          .map((row: any) => String(row?.ticketId ?? '').trim())
          .filter(Boolean)
      )
    );

    return NextResponse.json({ ticketIds });
  } catch (err) {
    console.error('[tickets/views GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId ?? '').trim();
    const ticketId = String(body?.ticketId ?? '').trim();

    if (!userId || !ticketId) {
      return NextResponse.json({ error: 'Utilisateur et ticket requis' }, { status: 400 });
    }

    const existing = await (db as any).ticketHistory.findFirst({
      where: {
        userId,
        ticketId,
        action: TICKET_VIEW_ACTION,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      await (db as any).ticketHistory.create({
        data: {
          ticketId,
          userId,
          userName: 'Utilisateur',
          action: TICKET_VIEW_ACTION,
          field: 'read_state',
          oldValue: null,
          newValue: 'viewed',
          timestamp: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tickets/views POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
