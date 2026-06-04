import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

function stripCommentHtml(value: string) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function canManageComment(input: { requesterId?: string | null; requesterRole?: string | null; authorId?: string | null }) {
  const requesterId = String(input.requesterId ?? '').trim();
  const requesterRole = String(input.requesterRole ?? '').trim().toUpperCase();
  const authorId = String(input.authorId ?? '').trim();
  if (!requesterId) return false;
  if (requesterRole === 'SUPER_ADMIN') return true;
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
    const requesterRoleFromBody = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const actorAccess = await resolveTicketManagerFromActorId(db, requesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const requesterRole = actorAccess.role || requesterRoleFromBody;

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

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: 'comment_updated',
        field: 'comment',
        oldValue: JSON.stringify({
          commentId: updated.id,
          content: stripCommentHtml(String(current.content ?? current.message ?? '')),
          isPrivate: Boolean(current.isPrivate ?? false),
          authorId: current.userId ?? '',
          authorName: current.userName ?? '',
          commentType: Boolean(current.isPrivate ?? false) ? 'private' : 'public',
        }),
        newValue: JSON.stringify({
          commentId: updated.id,
          content,
          isPrivate: Boolean(updated.isPrivate ?? false),
          authorId: updated.userId ?? '',
          authorName: updated.userName ?? '',
          commentType: Boolean(updated.isPrivate ?? false) ? 'private' : 'public',
        }),
        userId: requesterId ?? updated.userId ?? '',
        userName: updated.userName ?? '',
      },
    }).catch(() => null);

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
    const requesterRoleFromBody = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const actorAccess = await resolveTicketManagerFromActorId(db, requesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const requesterRole = actorAccess.role || requesterRoleFromBody;

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

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: 'comment_deleted',
        field: 'comment',
        oldValue: JSON.stringify({
          commentId: current.id,
          content: stripCommentHtml(String(current.content ?? current.message ?? '')),
          isPrivate: Boolean(current.isPrivate ?? false),
          authorId: current.userId ?? '',
          authorName: current.userName ?? '',
          commentType: Boolean(current.isPrivate ?? false) ? 'private' : 'public',
        }),
        newValue: null,
        userId: requesterId ?? current.userId ?? '',
        userName: current.userName ?? '',
      },
    }).catch(() => null);

    await (db as any).ticketComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[comments/:commentId DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
