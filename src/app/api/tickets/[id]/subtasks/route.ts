import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const {
      description,
      creatorId,
      creatorName,
      linkedTicketId,
      linkedTicketNumero,
      linkedTicketObjet,
      linkedTicketStatus,
      linkedTicketPriority,
      referenceTicketIds,
      manualTechnicianNames,
      selectedLocalities,
      activityKind,
    } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description requise' }, { status: 400 });
    }
    if (!creatorId) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, creatorId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const normalizedReferences = Array.isArray(referenceTicketIds)
      ? referenceTicketIds.map((value) => String(value ?? '').trim()).filter(Boolean)
      : [];
    const normalizedManualTechnicians = Array.isArray(manualTechnicianNames)
      ? manualTechnicianNames.map((value) => String(value ?? '').trim()).filter(Boolean)
      : [];
    const normalizedLocalities = Array.isArray(selectedLocalities)
      ? selectedLocalities.map((value) => String(value ?? '').trim()).filter(Boolean)
      : [];

    const payload = {
      description: description.trim(),
      status: 'TODO',
      linkedTicketId: String(linkedTicketId ?? '').trim() || null,
      linkedTicketNumero: String(linkedTicketNumero ?? '').trim() || null,
      linkedTicketObjet: String(linkedTicketObjet ?? '').trim() || null,
      linkedTicketStatus: String(linkedTicketStatus ?? '').trim() || null,
      linkedTicketPriority: String(linkedTicketPriority ?? '').trim() || null,
      referenceTicketIds: normalizedReferences,
      manualTechnicianNames: normalizedManualTechnicians,
      selectedLocalities: normalizedLocalities,
      activityKind: String(activityKind ?? 'task').trim() || 'task',
    };

    const entry = await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: 'subtask_created',
        field: 'subtask',
        oldValue: null,
        newValue: JSON.stringify(payload),
        userId: creatorId ?? 'system',
        userName: creatorName ?? 'Systeme',
      },
    });

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({
      id: entry.id,
      ticketId: id,
      ...payload,
      createdAt: entry.timestamp,
    }, { status: 201 });
  } catch (err) {
    console.error('[subtasks POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
