import { NextRequest, NextResponse } from 'next/server';

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
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));

    // Return the entry (stored in-memory / client-side for now)
    return NextResponse.json({
      id: `te-${Date.now()}`,
      ticketId: id,
      technicianId: technicianId ?? '',
      technicianName: technicianName ?? '',
      date: new Date(date),
      startTime,
      endTime,
      durationMinutes,
      note: note ?? '',
    }, { status: 201 });
  } catch (err) {
    console.error('[time POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
