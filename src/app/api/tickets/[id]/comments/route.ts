import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    });
    return NextResponse.json(
      comments.map((c: any) => ({
        id: c.id,
        ticketId: c.ticketId,
        authorId: c.authorId ?? '',
        authorName: c.authorName ?? '',
        content: c.content ?? c.message ?? '',
        isPrivate: c.isPrivate ?? false,
        isEdited: false,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
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
    const { content, isPrivate, authorId, authorName } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    const comment = await (db as any).ticketComment.create({
      data: {
        ticketId: id,
        authorId: authorId ?? null,
        authorName: authorName ?? 'Anonyme',
        content: content.trim(),
        isPrivate: isPrivate ?? false,
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
      authorId: comment.authorId ?? '',
      authorName: comment.authorName ?? '',
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
