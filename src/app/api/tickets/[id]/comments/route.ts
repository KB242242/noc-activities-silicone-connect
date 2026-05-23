import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeAvatarPath(value: string, userId?: string) {
  const src = String(value ?? '').trim().replace(/\\/g, '/');
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  if (src.startsWith('/public/')) return src.slice('/public'.length);
  if (src.startsWith('public/')) return `/${src.slice('public/'.length)}`;
  if (src.startsWith('/')) return src;
  if (src.startsWith('profile-avatars/') || src.startsWith('upload/')) return `/${src}`;
  if (userId && !src.includes('/') && /\.(png|jpe?g|webp|gif|svg)$/i.test(src)) {
    return `/profile-avatars/${userId}/${src}`;
  }
  return `/${src}`;
}

// ── GET /api/tickets/[id]/comments ────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const comments = await (db as any).ticketComment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    return NextResponse.json(
      comments.map((c: any) => {
        const authorId = String(c.userId ?? c.user?.id ?? '').trim();
        const authorName = String(c.user?.username ?? '').trim() || String(c.userName ?? '').trim() || 'Utilisateur';
        const rawAvatar = String(c.user?.avatar ?? c.authorAvatar ?? '').trim();
        const userAvatar = normalizeAvatarPath(rawAvatar, authorId);
        const authorAvatar = userAvatar || '/profile-avatars/default.svg';

        return {
          id: c.id,
          ticketId: c.ticketId,
          authorId,
          authorName,
          authorAvatar,
          content: c.content ?? c.message ?? '',
          isPrivate: c.isPrivate ?? false,
          isEdited: false,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );
  } catch (err) {
    console.error('[comments GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── POST /api/tickets/[id]/comments ───────────────────────────

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const content = String(body.content ?? '').trim();
    const userId = String(body.userId ?? body.authorId ?? '').trim();
    const userName = String(body.userName ?? body.authorName ?? '').trim() || 'Anonyme';
    const isPrivate = Boolean(body.isPrivate ?? false);

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const contentBytes = new TextEncoder().encode(content).length;
    if (contentBytes > 65000) {
      return NextResponse.json({ error: 'Commentaire trop volumineux' }, { status: 400 });
    }

    const existingUser = await (db as any).user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 400 });
    }

    const comment = await (db as any).ticketComment.create({
      data: {
        ticketId: id,
        userId: existingUser.id,
        userName: userName || String(existingUser.username ?? 'Utilisateur'),
        content,
        isPrivate,
        // Update ticket's updatedAt
      },
    });

    // Bump ticket updatedAt
    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.userId ?? '',
      authorName: comment.userName ?? '',
      content: comment.content ?? '',
      isPrivate: comment.isPrivate ?? false,
      isEdited: false,
      createdAt: comment.createdAt,
    }, { status: 201 });
  } catch (err) {
    console.error('[comments POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
