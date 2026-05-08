import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';

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

// ── GET /api/tickets/list ──────────────────────────────────────

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
    } = body;

    if (!objet?.trim()) {
      return NextResponse.json({ error: "L'objet est requis" }, { status: 400 });
    }

    // Generate numero: SC-{TYPE}-{dd-MM-yyyy}-{seq}
    const now = new Date(startDate ?? new Date());
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const prefix = `SC-${type ?? 'INC'}-${dd}-${mm}-${yyyy}`;

    // Count existing tickets with same prefix to get sequence
    const existing = await (db as any).ticket.count({
      where: { numero: { startsWith: prefix } },
    });
    const seq = String(existing + 1).padStart(3, '0');
    const numero = `${prefix}-${seq}`;

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
        status: status ?? 'OPEN',
        priority: priority ?? 'MEDIUM',
        category: mapTypeToCategory(type),
        site: siteNames.join(', ') || null,
        localite: allLocalities.join(', ') || null,
        technicien: technicianPayload.map((tech) => tech.name).join(', ') || null,
        assigneeId: technicianPayload[0]?.id ?? null,
        assigneeName: technicianPayload[0]?.name ?? null,
        reporterId: creatorId ?? null,
        reporterName: creatorName ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
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
        }),
      },
      include: { attachments: true, comments: true },
    });

    return NextResponse.json(mapTicket(ticket), { status: 201 });
  } catch (err) {
    console.error('[tickets/list POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

