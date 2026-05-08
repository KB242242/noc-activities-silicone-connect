import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── POST /api/tickets/[id]/restore ────────────────────────────

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await (db as any).ticket.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tickets/:id/restore POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
