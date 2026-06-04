import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

function parseTimeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { date, startTime, endTime, note, technicianId, technicianName } = await req.json();
    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Heures requises' }, { status: 400 });
    }
    if (!technicianId) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, technicianId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const startMinutes = parseTimeToMinutes(String(startTime));
    const endMinutes = parseTimeToMinutes(String(endTime));
    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json({ error: 'Format heure invalide (HH:mm)' }, { status: 400 });
    }
    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: "L'heure de fin doit etre apres l'heure de debut" }, { status: 400 });
    }
    const durationMinutes = endMinutes - startMinutes;

    const payload = {
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      startTime,
      endTime,
      durationMinutes,
      note: String(note ?? '').trim(),
      technicianId: technicianId ?? '',
      technicianName: technicianName ?? '',
    };

    const entry = await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: technicianId ?? 'system',
        userName: technicianName ?? 'Systeme',
        action: 'time_entry_added',
        field: 'time_entry',
        oldValue: null,
        newValue: JSON.stringify(payload),
      },
    });

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({
      id: entry.id,
      ticketId: id,
      technicianId: payload.technicianId,
      technicianName: payload.technicianName,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      durationMinutes: payload.durationMinutes,
      note: payload.note,
      createdAt: entry.timestamp,
    }, { status: 201 });
  } catch (err) {
    console.error('[time POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
