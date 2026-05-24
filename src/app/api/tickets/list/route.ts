import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';
import { sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';
import { extractTechnicianIds, validateTechnicianWeeklyCapacity } from '@/lib/tickets/technicianCapacity';
import { promises as fs } from 'fs';
import path from 'path';

function mapTypeToCategory(type?: string): 'INCIDENT' | 'REQUEST' | 'PROBLEM' | 'OTHER' {
  switch (type) {
    case 'INC':
    case 'PC':
    case 'MC':
    case 'FI':
      return 'INCIDENT';
    case 'FD':
    case 'MP':
    case 'VS':
    case 'SU':
      return 'REQUEST';
    default:
      return 'OTHER';
  }
}

type TicketSettingsLite = {
  numberFormat: string;
  numberSeed: number;
  notificationEmails: string[];
  defaultSlaHours?: number;
  slaByCategory?: Record<string, number>;
  trashRetentionDays?: number;
};

const TICKET_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ticket_settings.json');
const DEFAULT_DUE_DAYS = 3;

async function loadTicketSettings(): Promise<TicketSettingsLite> {
  try {
    const raw = await fs.readFile(TICKET_SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TicketSettingsLite>;
    return {
      numberFormat: typeof parsed.numberFormat === 'string' && parsed.numberFormat.trim()
        ? parsed.numberFormat.trim()
        : '#SC{date}-{seq}',
      numberSeed: Number.isFinite(Number(parsed.numberSeed))
        ? Math.max(1, Math.floor(Number(parsed.numberSeed)))
        : 100000000,
      notificationEmails: Array.isArray(parsed.notificationEmails)
        ? parsed.notificationEmails.map((item) => String(item).trim()).filter(Boolean)
        : ['ange.bata@siliconeconnect.com'],
      defaultSlaHours: Number.isFinite(Number(parsed.defaultSlaHours))
        ? Math.max(1, Math.floor(Number(parsed.defaultSlaHours)))
        : 24,
      slaByCategory: parsed.slaByCategory && typeof parsed.slaByCategory === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.slaByCategory)
              .map(([key, value]) => [key, Math.max(1, Math.floor(Number(value) || 0))])
              .filter(([, value]) => {
                const numericValue = Number(value);
                return Number.isFinite(numericValue) && numericValue > 0;
              })
          )
        : {},
      trashRetentionDays: Number.isFinite(Number((parsed as any).trashRetentionDays))
        ? Math.min(365, Math.max(1, Math.floor(Number((parsed as any).trashRetentionDays))))
        : 30,
    };
  } catch {
    return {
      numberFormat: '#SC{date}-{seq}',
      numberSeed: 100000000,
      notificationEmails: ['ange.bata@siliconeconnect.com'],
      defaultSlaHours: 24,
      slaByCategory: {},
      trashRetentionDays: 30,
    };
  }
}

async function purgeExpiredDeletedTickets(retentionDays: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const warningWindowMs = 3 * 24 * 60 * 60 * 1000;

  const settings = await loadTicketSettings();
  const users = await (db as any).user.findMany({
    where: {
      role: {
        in: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR'],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  }).catch(() => []);

  const uniqueEmails = (values: string[]) => Array.from(new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean)));
  const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE']);
  const agentRoles = new Set(['TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR']);

  const adminEmails = uniqueEmails([
    ...(Array.isArray(settings.notificationEmails) ? settings.notificationEmails : []),
    ...users
      .filter((user: any) => user?.isActive !== false && adminRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? '')),
  ]);
  const agentEmails = uniqueEmails(
    users
      .filter((user: any) => user?.isActive !== false && agentRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? ''))
  );

  const actorNameById = new Map<string, string>(
    users
      .filter((user: any) => user?.id)
      .map((user: any) => [String(user.id), String(user.name ?? user.email ?? user.id)])
  );

  const trashedTickets = await (db as any).ticket.findMany({
    where: { isDeleted: true, deletedAt: { not: null } },
    select: {
      id: true,
      numero: true,
      objet: true,
      reporterName: true,
      deletedAt: true,
      deletedBy: true,
    },
  });

  for (const ticket of trashedTickets) {
    const deletedAt = ticket.deletedAt ? new Date(ticket.deletedAt) : null;
    if (!deletedAt || Number.isNaN(deletedAt.getTime())) continue;

    const purgeAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const remainingMs = purgeAt.getTime() - now.getTime();

    if (remainingMs > 0 && remainingMs <= warningWindowMs) {
      const hasWarning = await (db as any).ticketHistory.findFirst({
        where: {
          ticketId: String(ticket.id),
          action: 'trash_purge_warning_sent',
        },
        select: { id: true },
      }).catch(() => null);

      if (!hasWarning) {
        const remainingDays = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
        const warningTemplates = [
          `Le ticket ${ticket.numero} concernant "${ticket.objet}" sera supprimé dans ${remainingDays} jour${remainingDays > 1 ? 's' : ''}.`,
          `Alerte corbeille: ${ticket.numero} (${ticket.objet}) arrive à échéance dans ${remainingDays} jour${remainingDays > 1 ? 's' : ''}.`,
          `Le ticket ${ticket.numero} est proche de la suppression automatique (${remainingDays} jour${remainingDays > 1 ? 's' : ''} restant${remainingDays > 1 ? 's' : ''}).`,
        ];
        const warningMessage = warningTemplates[Math.abs(purgeAt.getTime()) % warningTemplates.length];

        await (db as any).ticketHistory.create({
          data: {
            ticketId: String(ticket.id),
            userId: 'system',
            userName: 'Systeme',
            action: 'trash_purge_warning_sent',
            field: 'system_notification',
            oldValue: null,
            newValue: warningMessage,
            timestamp: now,
          },
        }).catch(() => null);

        await Promise.all(
          agentEmails.map((receiver) =>
            sendTicketLifecycleEmail({
              action: 'trash_warning',
              ticketNumber: String(ticket.numero ?? ticket.id),
              subject: String(ticket.objet ?? 'Ticket'),
              status: 'TRASHED',
              creatorName: String(ticket.reporterName ?? ''),
              receiver,
              customMessage: warningMessage,
            })
          )
        );
      }
    }

    if (deletedAt <= cutoff) {
      const actorName = String(actorNameById.get(String(ticket.deletedBy ?? '')) ?? 'Systeme');
      const deletionTemplates = [
        `Le ticket ${ticket.numero} (${ticket.objet}) a été définitivement supprimé par le système après la période de corbeille.`,
        `Nettoyage automatique: ${ticket.numero} vient d'être supprimé définitivement par le système.`,
        `Le ticket ${ticket.numero} créé par ${ticket.reporterName ?? 'N/A'} a été retiré automatiquement de la corbeille.`,
      ];
      const finalMessage = deletionTemplates[Math.abs(now.getTime() + deletedAt.getTime()) % deletionTemplates.length];

      const finalRecipients = uniqueEmails([...adminEmails, ...agentEmails]);
      await Promise.all(
        finalRecipients.map((receiver) =>
          sendTicketLifecycleEmail({
            action: 'deleted_permanently',
            ticketNumber: String(ticket.numero ?? ticket.id),
            subject: String(ticket.objet ?? 'Ticket'),
            status: 'DELETED',
            creatorName: String(ticket.reporterName ?? ''),
            receiver,
            customMessage: `${finalMessage} Dernier suppressseur connu: ${actorName}.`,
          })
        )
      );

      await (db as any).auditLog.create({
        data: {
          userId: 'system',
          userName: 'Systeme',
          action: 'TICKET_PURGED_BY_SYSTEM',
          details: finalMessage,
          status: 'SUCCESS',
        },
      }).catch(() => null);

      await (db as any).ticket.delete({ where: { id: String(ticket.id) } }).catch(() => null);
    }
  }
}

function buildTicketNumero(date: Date, type?: string, settings?: TicketSettingsLite) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const dateToken = `${dd}${mm}${yyyy}`;
  const year = date.getFullYear();
  const counterPrefix = `SC${dateToken}`;
  const numberFormat = settings?.numberFormat ?? '#SC{date}-{seq}';
  const seed = settings?.numberSeed ?? 100000000;

  return {
    year,
    counterPrefix,
    numberFormat,
    dateToken,
    seed,
    type,
  };
}

async function getNextTicketSequence(counterPrefix: string, year: number, seed: number): Promise<number> {
  await db.$executeRawUnsafe(`
    INSERT INTO ticket_counters (id, prefix, current_number, year)
    VALUES (UUID(), ?, ?, ?)
    ON DUPLICATE KEY UPDATE current_number = current_number + 1
  `, counterPrefix, seed + 1, year);

  const rows = await db.$queryRawUnsafe<Array<{ current_number: number }>>(
    `SELECT current_number FROM ticket_counters WHERE prefix = ? AND year = ? LIMIT 1`,
    counterPrefix,
    year
  );

  return Number(rows[0]?.current_number ?? seed + 1);
}

// ── GET /api/tickets/list ──────────────────────────────────────

export const revalidate = 30; // Cache list for 30 seconds for instant loading

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isTrash = searchParams.get('trash') === 'true';
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const type = searchParams.get('type') ?? '';
    const site = searchParams.get('site') ?? '';
    const locality = searchParams.get('locality') ?? '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const settings = await loadTicketSettings();
    await purgeExpiredDeletedTickets(settings.trashRetentionDays ?? 30);

    const where: Record<string, unknown> = { isDeleted: isTrash };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.tags = { contains: `"type":"${type}"` };
    if (site) where.site = { contains: site };
    if (locality) where.localite = { contains: locality };

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { numero: { contains: search } },
        { objet: { contains: search } },
        { description: { contains: search } },
        { reporterName: { contains: search } },
        { assigneeName: { contains: search } },
        { site: { contains: search } },
        { localite: { contains: search } },
      ];
    }

    const tickets = await (db as any).ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: true,
        comments: { take: 3, orderBy: { createdAt: 'desc' } },
      },
    });

    // Map prisma Ticket to NocTicket shape
    const mapped = tickets.map(mapTicket);
    return NextResponse.json(mapped);
  } catch (err) {
    console.error('[tickets/list GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── POST /api/tickets/list ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, objet, description, priority, status, channel, language, classification,
      contactName, contactEmail, contactPhone,
      clientIds, technicianIds, siteIds, localities,
      link, ticketZoho,
      startDate, endDate, dueDate,
      eta, etr,
      resolutionDescription, resolutionCause,
      outageStartTime, outageEndTime,
      creatorId, creatorName,
      ownerTechnicianId, ownerTechnicianName,
      slaDuration, slr,
      channelRequestTime, channelEmailLink,
      descriptionHtml,
      categoryLabel,
      categoryKey,
      maintenanceMode,
      incidentLevel,
      attachments,
    } = body;

    const incomingStatus = String(status ?? 'OPEN').toUpperCase();

    if (!objet?.trim()) {
      return NextResponse.json({ error: "L'objet est requis" }, { status: 400 });
    }

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Utilisateur createur requis' }, { status: 400 });
    }

    const settings = await loadTicketSettings();
    const now = new Date(startDate ?? new Date());
    const resolvedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(now.getTime() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000);
    const numeroParts = buildTicketNumero(now, type, settings);
    const sequence = await getNextTicketSequence(numeroParts.counterPrefix, numeroParts.year, numeroParts.seed);
    const numero = numeroParts.numberFormat
      .replace('{date}', numeroParts.dateToken)
      .replace('{seq}', String(sequence))
      .replace('{category}', String(type ?? 'INC'));

    const parsedSla = Number(slaDuration);
    const resolvedSlaDuration = Number.isFinite(parsedSla) && parsedSla > 0
      ? parsedSla
      : Number(settings.slaByCategory?.[String(categoryKey ?? '')] ?? settings.defaultSlaHours ?? 24);

    const numericClientIds = Array.isArray(clientIds)
      ? (clientIds as string[])
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n))
      : [];

    const selectedClients = numericClientIds.length > 0
      ? await db.$queryRawUnsafe<Array<{ id_client: bigint; client_name: string; service_type: string | null }>>(
          `SELECT id_client, client_name, service_type
           FROM noc_clients
           WHERE id_client IN (${numericClientIds.join(',')})`
        ).catch(() => [])
      : [];

    const selectedTechnicians = Array.isArray(technicianIds) && technicianIds.length > 0
      ? await (db as any).user.findMany({
          where: { id: { in: technicianIds as string[] } },
          select: { id: true, name: true, email: true },
        }).catch(() => [])
      : [];

    if (incomingStatus !== 'RESOLVED' && incomingStatus !== 'CLOSED') {
      const technicianScope = extractTechnicianIds({
        ownerTechnicianId,
        technicianIds,
      });
      const capacity = await validateTechnicianWeeklyCapacity({ technicianIds: technicianScope });
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

    const numericSiteIds = Array.isArray(siteIds)
      ? (siteIds as string[])
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n))
      : [];

    const selectedSites = numericSiteIds.length > 0
      ? await db.$queryRawUnsafe<Array<{ id: bigint; site_name: string; localite: string | null }>>(
          `SELECT id, site_name, localite
           FROM noc_sites
           WHERE id IN (${numericSiteIds.join(',')})`
        ).catch(() => [])
      : [];

    const normalizedLocalities = Array.isArray(localities)
      ? [...new Set((localities as string[]).map((item) => String(item).trim()).filter(Boolean))]
      : [];

    const siteNames = selectedSites.map((site) => site.site_name);
    const siteLocalities = selectedSites
      .map((site) => site.localite?.trim())
      .filter((value): value is string => Boolean(value));

    const allLocalities = [...new Set([...normalizedLocalities, ...siteLocalities])];

    const clientPayload = selectedClients.map((client) => ({
      id: String(client.id_client),
      name: client.client_name,
      serviceType: client.service_type ?? undefined,
    }));

    const technicianPayload = selectedTechnicians.map((tech: { id: string; name: string; email: string | null }) => ({
      id: tech.id,
      name: tech.name,
      pseudo: tech.email ? tech.email.split('@')[0] : undefined,
    }));

    const ticket = await (db as any).ticket.create({
      data: {
        numero,
        objet: objet.trim(),
        description: description ?? null,
        status: incomingStatus,
        priority: priority ?? 'MEDIUM',
        category: mapTypeToCategory(type),
        site: siteNames.join(', ') || null,
        localite: allLocalities.join(', ') || null,
        technicien: technicianPayload.map((tech) => tech.name).join(', ') || null,
        assigneeId: ownerTechnicianId ?? technicianPayload[0]?.id ?? null,
        assigneeName: ownerTechnicianName ?? technicianPayload[0]?.name ?? null,
        reporterId: creatorId,
        reporterName: creatorName,
        dueDate: resolvedDueDate,
        tags: JSON.stringify({
          type, channel, language, classification,
          contactName, contactEmail, contactPhone,
          clientIds, clientNames: clientPayload,
          technicianIds, technicianNames: technicianPayload,
          siteIds, siteNames,
          localities: allLocalities,
          link, ticketZoho, startDate, endDate, eta, etr,
          resolutionDescription, resolutionCause,
          outageStartTime, outageEndTime,
          ownerTechnicianId,
          ownerTechnicianName,
          slaDuration: resolvedSlaDuration,
          slr,
          channelRequestTime,
          channelEmailLink,
          descriptionHtml,
          categoryLabel,
          categoryKey,
          maintenanceMode,
          incidentLevel,
          ticketNumberPattern: numeroParts.numberFormat,
        }),
      },
      include: { attachments: true, comments: true },
    });

    const files = Array.isArray(attachments)
      ? attachments
          .map((item) => ({
            name: typeof item?.name === 'string' ? item.name : '',
            type: typeof item?.type === 'string' ? item.type : 'application/octet-stream',
            size: Number(item?.size ?? 0),
            dataUrl: typeof item?.dataUrl === 'string' ? item.dataUrl : '',
          }))
          .filter((item) => item.name && item.dataUrl)
      : [];

    if (files.length > 0) {
      await Promise.all(
        files.map((file) => {
          const base64 = file.dataUrl.includes(',') ? file.dataUrl.split(',')[1] : file.dataUrl;
          return (db as any).ticketAttachment.create({
            data: {
              ticketId: ticket.id,
              fileName: file.name,
              fileType: file.type,
              fileSize: Number.isFinite(file.size) ? file.size : 0,
              fileData: base64,
              uploadedBy: creatorId,
            },
          });
        })
      );
    }

    await (db as any).ticketHistory.create({
      data: {
        ticketId: ticket.id,
        userId: creatorId,
        userName: creatorName,
        action: 'created',
        field: null,
        oldValue: null,
        newValue: JSON.stringify({
          numero,
          categoryLabel,
          type,
          ownerTechnicianName: ownerTechnicianName ?? technicianPayload[0]?.name ?? null,
        }),
      },
    }).catch(() => null);

    for (const receiver of settings.notificationEmails) {
      void sendTicketLifecycleEmail({
        action: 'created',
        ticketNumber: numero,
        subject: objet,
        status: status ?? 'OPEN',
        creatorName,
        receiver,
      });
    }

    const created = await (db as any).ticket.findUnique({
      where: { id: ticket.id },
      include: { attachments: true, comments: true, history: { orderBy: { timestamp: 'desc' }, take: 50 } },
    });

    return NextResponse.json(mapTicket(created ?? ticket), { status: 201 });
  } catch (err) {
    console.error('[tickets/list POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

