import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';
import { promises as fs } from 'fs';
import path from 'path';

const TICKET_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ticket_settings.json');

async function loadNotificationEmails(): Promise<string[]> {
  try {
    const raw = await fs.readFile(TICKET_SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { notificationEmails?: unknown[] };
    const emails = Array.isArray(parsed.notificationEmails)
      ? parsed.notificationEmails.map((item) => String(item).trim()).filter(Boolean)
      : [];
    return emails.length > 0 ? emails : ['ange.bata@siliconeconnect.com'];
  } catch {
    return ['ange.bata@siliconeconnect.com'];
  }
}

// ── POST /api/tickets/[id]/restore ────────────────────────────

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const restoredByRaw = String(body.restoredBy ?? '').trim();
    const restoredByName = String(body.restoredByName ?? '').trim();

    const actorById = restoredByRaw
      ? await (db as any).user.findUnique({
          where: { id: restoredByRaw },
          select: { id: true, name: true },
        }).catch(() => null)
      : null;
    const actor = actorById || (restoredByRaw
      ? await (db as any).user.findFirst({
          where: {
            OR: [{ email: restoredByRaw }, { username: restoredByRaw }, { name: restoredByRaw }],
          },
          select: { id: true, name: true },
        }).catch(() => null)
      : null);

    const ticket = await (db as any).ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    await (db as any).ticket.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });

    const actorId = String((actor?.id ?? restoredByRaw) || 'system');
    const actorName = String(((actor?.name ?? restoredByName) || restoredByRaw) || 'Utilisateur');
    const restoredAt = new Date();

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: actorId,
        userName: actorName,
        action: 'ticket_restored',
        field: 'admin_action',
        oldValue: 'ticket_in_trash',
        newValue: `Ticket restauré par ${actorName} le ${restoredAt.toLocaleString('fr-FR')}`,
        timestamp: restoredAt,
      },
    }).catch(() => null);

    const adminEmails = await loadNotificationEmails();
    const restorationMessages = [
      `${actorName} a restauré le ticket ${ticket.numero} (${ticket.objet}) depuis la corbeille.`,
      `Le ticket ${ticket.numero} vient d'être remis en circulation par ${actorName}.`,
      `Restauration confirmée: ${actorName} a réactivé le ticket ${ticket.numero}.`,
    ];
    const message = restorationMessages[Math.abs(restoredAt.getTime()) % restorationMessages.length];

    // Notifications and audit are best-effort and must not break restore success.
    void Promise.allSettled(
      adminEmails.map((receiver) =>
        sendTicketLifecycleEmail({
          action: 'restored',
          ticketNumber: String(ticket.numero ?? id),
          subject: String(ticket.objet ?? 'Ticket'),
          status: 'OPEN',
          creatorName: String(ticket.reporterName ?? ''),
          receiver,
          customMessage: message,
        })
      )
    ).catch(() => null);

    void (db as any).auditLog.create({
      data: {
        userId: actorId,
        userName: actorName,
        action: 'TICKET_RESTORED',
        details: `${message} (${restoredAt.toLocaleString('fr-FR')})`,
        status: 'SUCCESS',
      },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tickets/:id/restore POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
