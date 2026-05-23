import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function canManageHistoryEntry(input: { requesterId?: string | null; requesterRole?: string | null; authorId?: string | null }) {
  const requesterId = String(input.requesterId ?? '').trim();
  const requesterRole = String(input.requesterRole ?? '').toUpperCase();
  const authorId = String(input.authorId ?? '').trim();
  if (!requesterId) return false;
  if (requesterRole === 'SUPER_ADMIN') return true;
  return Boolean(authorId) && requesterId === authorId;
}

function parseExistingPayload(raw?: string | null) {
  if (!raw) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { id, subtaskId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const current = await (db as any).ticketHistory.findUnique({ where: { id: subtaskId } });
    if (!current || current.ticketId !== id || (current.field !== 'subtask' && current.action !== 'subtask_created')) {
      return NextResponse.json({ error: 'Activite introuvable' }, { status: 404 });
    }

    if (!canManageHistoryEntry({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const existingPayload = parseExistingPayload(current.newValue);
    const description = String(body.description ?? existingPayload.description ?? '').trim();
    if (!description) {
      return NextResponse.json({ error: 'Description requise' }, { status: 400 });
    }

    const payload = {
      description,
      status: String(body.status ?? existingPayload.status ?? 'TODO'),
      linkedTicketId: existingPayload.linkedTicketId ?? null,
      linkedTicketNumero: existingPayload.linkedTicketNumero ?? null,
      linkedTicketObjet: existingPayload.linkedTicketObjet ?? null,
      linkedTicketStatus: existingPayload.linkedTicketStatus ?? null,
      linkedTicketPriority: existingPayload.linkedTicketPriority ?? null,
      referenceTicketIds: Array.isArray(existingPayload.referenceTicketIds)
        ? existingPayload.referenceTicketIds
        : [],
      manualTechnicianNames: Array.isArray(existingPayload.manualTechnicianNames)
        ? existingPayload.manualTechnicianNames
        : [],
      selectedLocalities: Array.isArray(existingPayload.selectedLocalities)
        ? existingPayload.selectedLocalities
        : [],
      activityKind: String(existingPayload.activityKind ?? 'task'),
    };

    const updated = await (db as any).ticketHistory.update({
      where: { id: subtaskId },
      data: {
        newValue: JSON.stringify(payload),
        timestamp: new Date(),
      },
    });

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({
      id: updated.id,
      ticketId: id,
      ...payload,
      createdAt: updated.timestamp,
    });
  } catch (err) {
    console.error('[subtasks/:subtaskId PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { id, subtaskId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const current = await (db as any).ticketHistory.findUnique({ where: { id: subtaskId } });
    if (!current || current.ticketId !== id || (current.field !== 'subtask' && current.action !== 'subtask_created')) {
      return NextResponse.json({ error: 'Activite introuvable' }, { status: 404 });
    }

    if (!canManageHistoryEntry({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    await (db as any).ticketHistory.delete({ where: { id: subtaskId } });

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subtasks/:subtaskId DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
