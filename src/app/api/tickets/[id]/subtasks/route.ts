import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { description, creatorId } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description requise' }, { status: 400 });
    }
    // Store sub-tasks as history entries for now (no dedicated model)
    const entry = await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: `sous-tâche: ${description.trim()}`,
        userId: creatorId ?? 'system',
        userName: 'Système',
      },
    });
    return NextResponse.json({
      id: entry.id,
      ticketId: id,
      description: description.trim(),
      status: 'TODO',
      createdAt: entry.createdAt,
    }, { status: 201 });
  } catch (err) {
    console.error('[subtasks POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
