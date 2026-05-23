import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';
import { sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';
import { extractTechnicianIds, validateTechnicianWeeklyCapacity } from '@/lib/tickets/technicianCapacity';
import { promises as fs } from 'fs';
import path from 'path';

const TICKET_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ticket_settings.json');

type TicketSettingsLite = {
  notificationEmails?: unknown[];
  trashRetentionDays?: unknown;
};

async function loadTicketSettings(): Promise<TicketSettingsLite> {
  try {
    const raw = await fs.readFile(TICKET_SETTINGS_FILE, 'utf8');
    return JSON.parse(raw) as TicketSettingsLite;
  } catch {
    return {};
  }
}

function resolveTrashRetentionDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(365, Math.max(1, Math.floor(parsed)));
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}

async function purgeExpiredDeletedTickets(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  await (db as any).ticket.deleteMany({
    where: {
      isDeleted: true,
      deletedAt: { lte: cutoff },
    },
  });
}

async function loadNotificationEmails(): Promise<string[]> {
  try {
    const parsed = await loadTicketSettings();
    const emails = Array.isArray(parsed.notificationEmails)
      ? parsed.notificationEmails.map((item) => String(item).trim()).filter(Boolean)
      : [];
    return emails.length > 0 ? emails : ['ange.bata@siliconeconnect.com'];
  } catch {
    return ['ange.bata@siliconeconnect.com'];
  }
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean)));
}

async function loadRecipientGroups(): Promise<{ adminEmails: string[]; agentEmails: string[] }> {
  const configEmails = await loadNotificationEmails();
  const users = await (db as any).user.findMany({
    where: {
      role: {
        in: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR'],
      },
    },
    select: {
      email: true,
      role: true,
      isActive: true,
    },
  }).catch(() => []);

  const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE']);
  const agentRoles = new Set(['TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR']);

  const adminEmails = uniqueEmails([
    ...configEmails,
    ...users
      .filter((user: any) => user?.isActive !== false && adminRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? '')),
  ]);

  const agentEmails = uniqueEmails(
    users
      .filter((user: any) => user?.isActive !== false && agentRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? ''))
  );

  return { adminEmails, agentEmails };
}

async function writeAuditLog(payload: { userId: string; userName: string; action: string; details: string; status?: string }) {
  try {
    await (db as any).auditLog.create({
      data: {
        userId: payload.userId,
        userName: payload.userName,
        action: payload.action,
        details: payload.details,
        status: payload.status ?? 'SUCCESS',
      },
    });
  } catch {
    // audit log is best-effort only
  }
}

function pickMessage(templates: string[], seed: number): string {
  if (templates.length === 0) return '';
  return templates[Math.abs(seed) % templates.length];
}

// ── GET /api/tickets/[id] ──────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await (db as any).ticket.findUnique({
      where: { id },
      include: {
        attachments: {
          select: {
            id: true,
            ticketId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                firstName: true,
              },
            },
          },
        },
        comments: {
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
        },
        history: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    return NextResponse.json(mapTicket(ticket));
  } catch (err) {
    console.error('[tickets/:id GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── PUT /api/tickets/[id] ──────────────────────────────────────

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const {
      status, priority, objet, description, dueDate, updatedBy,
      resolutionDescription, resolutionCause,
      // extended fields stored in tags
      ...rest
    } = body;

    // Get existing tags
    const existing = await (db as any).ticket.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    let tags: Record<string, unknown> = {};
    try { tags = JSON.parse(existing.tags ?? '{}'); } catch { /* noop */ }

    // Merge updated fields into tags
    const updatedTags = {
      ...tags,
      ...rest,
      ...(resolutionDescription !== undefined ? { resolutionDescription } : {}),
      ...(resolutionCause !== undefined ? { resolutionCause } : {}),
    };

    const updateData: Record<string, unknown> = {};
    const updatedTagsJson = safeStringify(updatedTags);
    const existingTagsJson = existing.tags ?? '{}';
    if (updatedTagsJson !== existingTagsJson) {
      updateData.tags = updatedTagsJson;
    }

    const nextStatusNormalized = status !== undefined ? String(status).toUpperCase() : undefined;
    if (nextStatusNormalized !== undefined && nextStatusNormalized !== String(existing.status ?? '').toUpperCase()) {
      updateData.status = nextStatusNormalized;
    }

    if (priority !== undefined && priority !== existing.priority) updateData.priority = priority;
    if (objet !== undefined && objet !== existing.objet) updateData.objet = objet;
    if (description !== undefined && description !== existing.description) updateData.description = description;
    if (dueDate !== undefined) {
      const nextDueDate = dueDate ? new Date(dueDate) : null;
      const currDueDateIso = existing.dueDate ? new Date(existing.dueDate).toISOString() : null;
      const nextDueDateIso = nextDueDate ? nextDueDate.toISOString() : null;
      if (currDueDateIso !== nextDueDateIso) {
        updateData.dueDate = nextDueDate;
      }
    }

    const localities = Array.isArray((updatedTags as any).localities)
      ? (updatedTags as any).localities.map((v: string) => String(v).trim()).filter(Boolean)
      : [];
    const siteNames = Array.isArray((updatedTags as any).siteNames)
      ? (updatedTags as any).siteNames.map((v: string) => String(v).trim()).filter(Boolean)
      : [];
    const technicianNames = Array.isArray((updatedTags as any).technicianNames)
      ? (updatedTags as any).technicianNames
          .map((v: { name?: string }) => v?.name?.trim())
          .filter((v: string | undefined): v is string => Boolean(v))
      : [];

    if ('localities' in rest) {
      const localite = localities.length > 0 ? localities.join(', ') : null;
      if (localite !== (existing.localite ?? null)) updateData.localite = localite;
    }
    if ('siteNames' in rest || 'siteIds' in rest) {
      const siteValue = siteNames.length > 0 ? siteNames.join(', ') : null;
      if (siteValue !== (existing.site ?? null)) updateData.site = siteValue;
    }
    if ('technicianNames' in rest || 'technicianIds' in rest) {
      const technicien = technicianNames.length > 0 ? technicianNames.join(', ') : null;
      const assigneeName = technicianNames.length > 0 ? technicianNames[0] : null;
      if (technicien !== (existing.technicien ?? null)) updateData.technicien = technicien;
      if (assigneeName !== (existing.assigneeName ?? null)) updateData.assigneeName = assigneeName;
    }

    const nextStatus = String(status ?? existing.status ?? 'OPEN').toUpperCase();
    if (nextStatus !== 'RESOLVED' && nextStatus !== 'CLOSED') {
      const existingTags = tags && typeof tags === 'object' ? tags : {};
      const technicianScope = extractTechnicianIds({
        assigneeId: ('assigneeId' in rest ? (rest as Record<string, unknown>).assigneeId : existing.assigneeId),
        ownerTechnicianId: ('ownerTechnicianId' in rest ? (rest as Record<string, unknown>).ownerTechnicianId : (existingTags as Record<string, unknown>).ownerTechnicianId),
        technicianIds: ('technicianIds' in rest ? (rest as Record<string, unknown>).technicianIds : (existingTags as Record<string, unknown>).technicianIds),
        technicianNames: ('technicianNames' in rest ? (rest as Record<string, unknown>).technicianNames : (existingTags as Record<string, unknown>).technicianNames),
      });
      const capacity = await validateTechnicianWeeklyCapacity({
        technicianIds: technicianScope,
        excludeTicketId: id,
      });
      if (!capacity.ok) {
        return NextResponse.json(
          {
            error: 'technician_capacity_exceeded',
            message: 'Un technicien a deja 3 tickets actifs cette semaine. Veuillez reassigner le ticket.',
            details: capacity.technicians,
          },
          { status: 409 }
        );
      }
    }

    // Keep lifecycle timestamps aligned with the new status
    if (nextStatus === 'CLOSED' && !existing.closedAt) {
      updateData.closedAt = new Date();
    } else if (nextStatus === 'RESOLVED' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    } else if (nextStatus === 'OPEN' || nextStatus === 'IN_PROGRESS' || nextStatus === 'ESCALATED' || nextStatus === 'PENDING') {
      if (existing.closedAt !== null) updateData.closedAt = null;
      if (existing.resolvedAt !== null) updateData.resolvedAt = null;
    }

    if (Object.keys(updateData).length === 0) {
      const unchanged = await (db as any).ticket.findUnique({
        where: { id },
        include: {
          attachments: {
            select: {
              id: true,
              ticketId: true,
              fileName: true,
              fileType: true,
              fileSize: true,
              uploadedBy: true,
              uploadedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  firstName: true,
                },
              },
            },
          },
          comments: {
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
          },
          history: { orderBy: { timestamp: 'desc' }, take: 50 },
        },
      });
      return NextResponse.json(mapTicket(unchanged ?? existing));
    }

    updateData.updatedAt = new Date();

    const historyEntries: Record<string, unknown>[] = [];
    const pushHistory = (field: string, oldValue: unknown, newValue: unknown, action = 'updated_field') => {
      if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) return;
      historyEntries.push({
        action,
        field,
        oldValue: oldValue === undefined || oldValue === null ? null : String(typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue),
        newValue: newValue === undefined || newValue === null ? null : String(typeof newValue === 'object' ? JSON.stringify(newValue) : newValue),
        userId: body.updatedById ?? 'system',
        userName: updatedBy ?? 'Systeme',
        ticketId: id,
      });
    };

    pushHistory('status', existing.status, status ? String(status).toUpperCase() : undefined);
    pushHistory('priority', existing.priority, priority);
    pushHistory('objet', existing.objet, objet);
    pushHistory('description', existing.description, description);
    pushHistory('dueDate', existing.dueDate ? new Date(existing.dueDate).toISOString() : null, dueDate ?? null);
    pushHistory('tags', existing.tags ?? null, updatedTagsJson);

    const updated = await (db as any).ticket.update({
      where: { id },
      data: updateData,
      include: {
        attachments: {
          select: {
            id: true,
            ticketId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                firstName: true,
              },
            },
          },
        },
        comments: {
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
        },
        history: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });

    // Create history entries
    if (historyEntries.length > 0) {
      await Promise.all(
        historyEntries.map((h) =>
          (db as any).ticketHistory.create({ data: h }).catch(() => null)
        )
      );
    }

    if (status === 'CLOSED' && existing.status !== 'CLOSED') {
      const receivers = await loadNotificationEmails();
      for (const receiver of receivers) {
        void sendTicketLifecycleEmail({
          action: 'closed',
          ticketNumber: updated.numero,
          subject: updated.objet,
          status: 'CLOSED',
          creatorName: updated.reporterName,
          receiver,
        });
      }
    }

    return NextResponse.json(mapTicket(updated));
  } catch (err) {
    console.error('[tickets/:id PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── DELETE /api/tickets/[id] ────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { permanent } = body;

    const settings = await loadTicketSettings();
    const retentionDays = resolveTrashRetentionDays(settings.trashRetentionDays);
    await purgeExpiredDeletedTickets(retentionDays);

    const ticket = await (db as any).ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    const deletedByRaw = String(body.deletedBy ?? '').trim();
    const actorById = deletedByRaw
      ? await (db as any).user.findUnique({
          where: { id: deletedByRaw },
          select: { id: true, name: true, email: true, username: true },
        }).catch(() => null)
      : null;
    const actor = actorById || (deletedByRaw
      ? await (db as any).user.findFirst({
          where: {
            OR: [
              { email: deletedByRaw },
              { username: deletedByRaw },
              { name: deletedByRaw },
            ],
          },
          select: { id: true, name: true, email: true, username: true },
        }).catch(() => null)
      : null);

    const deletedById = String((actor?.id ?? deletedByRaw) || 'system');
    const actorName = String((actor?.name ?? body.deletedByName ?? deletedByRaw) || 'Utilisateur');
    const deletionTimestamp = new Date();
    const deletionMessage = `[${actorName}] a supprime le ticket [${ticket.numero}] a ${deletionTimestamp.toLocaleString('fr-FR')}`;
    const { adminEmails } = await loadRecipientGroups();

    if (permanent) {
      await (db as any).ticketHistory.create({
        data: {
          ticketId: id,
          userId: actor?.id ?? deletedById,
          userName: actorName,
          action: 'deleted',
          field: 'admin_action',
          oldValue: 'ticket_in_trash',
          newValue: `${deletionMessage} (suppression definitive)`,
          timestamp: deletionTimestamp,
        },
      }).catch(() => null);

      await (db as any).ticket.delete({ where: { id } });

      const templates = [
        `${actorName} a supprimé définitivement le ticket ${ticket.numero} (${ticket.objet}) le ${deletionTimestamp.toLocaleString('fr-FR')}.`,
        `Le ticket ${ticket.numero} - ${ticket.objet} vient d'être retiré de la corbeille de façon définitive par ${actorName}.`,
        `Action finale: ${actorName} a validé la suppression définitive du ticket ${ticket.numero} à ${deletionTimestamp.toLocaleString('fr-FR')}.`,
      ];
      const adminMessage = pickMessage(templates, deletionTimestamp.getTime());
      await Promise.all(
        adminEmails.map((receiver) =>
          sendTicketLifecycleEmail({
            action: 'deleted_permanently',
            ticketNumber: String(ticket.numero ?? id),
            subject: String(ticket.objet ?? 'Ticket'),
            status: 'DELETED',
            creatorName: String(ticket.reporterName ?? ''),
            receiver,
            customMessage: adminMessage,
          })
        )
      );

      await writeAuditLog({
        userId: deletedById,
        userName: actorName,
        action: 'TICKET_DELETED_PERMANENTLY',
        details: adminMessage,
      });

      return NextResponse.json({ success: true, retentionDays });
    }

    // Soft delete
    await (db as any).ticket.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: deletionTimestamp,
        deletedBy: deletedById,
      },
    });

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: actor?.id ?? deletedById,
        userName: actorName,
        action: 'soft_deleted',
        field: 'admin_action',
        oldValue: 'active_ticket',
        newValue: `${deletionMessage} (retention: ${retentionDays} jours)`,
        timestamp: deletionTimestamp,
      },
    }).catch(() => null);

    const trashTemplates = [
      `${actorName} a déplacé le ticket ${ticket.numero} (${ticket.objet}) dans la corbeille.`,
      `Ticket ${ticket.numero} envoyé en corbeille par ${actorName}. Suppression automatique dans ${retentionDays} jours.`,
      `Le ticket ${ticket.numero} a été supprimé par ${actorName} et restera ${retentionDays} jours en corbeille.`,
    ];
    const adminTrashMessage = pickMessage(trashTemplates, deletionTimestamp.getTime());

    await Promise.all(
      adminEmails.map((receiver) =>
        sendTicketLifecycleEmail({
          action: 'trashed',
          ticketNumber: String(ticket.numero ?? id),
          subject: String(ticket.objet ?? 'Ticket'),
          status: 'TRASHED',
          creatorName: String(ticket.reporterName ?? ''),
          receiver,
          customMessage: adminTrashMessage,
        })
      )
    );

    await writeAuditLog({
      userId: deletedById,
      userName: actorName,
      action: 'TICKET_TRASHED',
      details: `${adminTrashMessage} Date: ${deletionTimestamp.toLocaleString('fr-FR')}`,
    });

    return NextResponse.json({ success: true, retentionDays });
  } catch (err) {
    console.error('[tickets/:id DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
