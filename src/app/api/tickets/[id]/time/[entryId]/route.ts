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

function parseTimeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
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
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const current = await (db as any).ticketHistory.findUnique({ where: { id: entryId } });
    if (!current || current.ticketId !== id || (current.field !== 'time_entry' && current.action !== 'time_entry_added')) {
      return NextResponse.json({ error: 'Entree de temps introuvable' }, { status: 404 });
    }

    if (!canManageHistoryEntry({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const existingPayload = parseExistingPayload(current.newValue);
    const startTime = String(body.startTime ?? existingPayload.startTime ?? '').trim();
    const endTime = String(body.endTime ?? existingPayload.endTime ?? '').trim();
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json({ error: 'Format heure invalide (HH:mm)' }, { status: 400 });
    }
    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: "L'heure de fin doit etre apres l'heure de debut" }, { status: 400 });
    }

    const payload = {
      date: String(body.date ?? existingPayload.date ?? new Date().toISOString()),
      startTime,
      endTime,
      durationMinutes: endMinutes - startMinutes,
      note: String(body.note ?? existingPayload.note ?? '').trim(),
      technicianId: String(existingPayload.technicianId ?? current.userId ?? ''),
      technicianName: String(existingPayload.technicianName ?? current.userName ?? 'Systeme'),
    };

    const updated = await (db as any).ticketHistory.update({
      where: { id: entryId },
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
    console.error('[time/:entryId PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId : null;
    const requesterRole = typeof body.requesterRole === 'string' ? body.requesterRole : null;

    const current = await (db as any).ticketHistory.findUnique({ where: { id: entryId } });
    if (!current || current.ticketId !== id || (current.field !== 'time_entry' && current.action !== 'time_entry_added')) {
      return NextResponse.json({ error: 'Entree de temps introuvable' }, { status: 404 });
    }

    if (!canManageHistoryEntry({ requesterId, requesterRole, authorId: current.userId })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    await (db as any).ticketHistory.delete({ where: { id: entryId } });

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[time/:entryId DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
