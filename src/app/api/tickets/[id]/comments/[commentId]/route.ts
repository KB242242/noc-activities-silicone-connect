import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function canManageComment(input: { requesterId?: string | null; requesterRole?: string | null; authorId?: string | null }) {
  const requesterId = String(input.requesterId ?? '').trim();
  const authorId = String(input.authorId ?? '').trim();
  if (!requesterId) return false;
  return Boolean(authorId) && requesterId === authorId;
}

async function resolveComment(commentId: string) {
  return (db as any).ticketComment.findUnique({ where: { id: commentId } });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const content = String(body.content ?? '').trim();
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    if (!content) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    const current = await resolveComment(commentId);
    if (!current) {
      return NextResponse.json({ error: 'Commentaire non trouve' }, { status: 404 });
    }

    if (String(current.ticketId ?? '') !== id) {
      return NextResponse.json({ error: 'Commentaire non trouve' }, { status: 404 });
    }

    if (!canManageComment({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const updated = await (db as any).ticketComment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: updated.id,
      ticketId: updated.ticketId,
      authorId: updated.userId ?? '',
      authorName: updated.userName ?? '',
      content: updated.content ?? '',
      isPrivate: updated.isPrivate ?? false,
      isEdited: true,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error('[comments/:commentId PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── DELETE /api/tickets/[id]/comments/[commentId] ─────────────

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const current = await resolveComment(commentId);
    if (!current) {
      return NextResponse.json({ error: 'Commentaire non trouve' }, { status: 404 });
    }

    if (String(current.ticketId ?? '') !== id) {
      return NextResponse.json({ error: 'Commentaire non trouve' }, { status: 404 });
    }

    if (!canManageComment({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    await (db as any).ticketComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[comments/:commentId DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
