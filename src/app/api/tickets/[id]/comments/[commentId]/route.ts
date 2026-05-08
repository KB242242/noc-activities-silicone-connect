import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── DELETE /api/tickets/[id]/comments/[commentId] ─────────────

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    await (db as any).ticketComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[comments/:commentId DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
