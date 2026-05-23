import { db } from '@/lib/db';

const MAX_ACTIVE_TICKETS_PER_WEEK = 3;
const INACTIVE_STATUSES = new Set(['RESOLVED', 'CLOSED']);

type TicketLite = {
  id: string;
  assigneeId?: string | null;
  tags?: string | null;
};

function getWeekBounds(reference = new Date()) {
  const date = new Date(reference);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

function parseTags(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function collectTechnicianIdsFromTicket(ticket: TicketLite): string[] {
  const ids = new Set<string>();
  if (ticket.assigneeId) ids.add(String(ticket.assigneeId));

  const tags = parseTags(ticket.tags);
  const owner = tags.ownerTechnicianId;
  if (typeof owner === 'string' && owner.trim()) {
    ids.add(owner.trim());
  }

  const technicianIds = tags.technicianIds;
  if (Array.isArray(technicianIds)) {
    for (const value of technicianIds) {
      if (typeof value === 'string' && value.trim()) {
        ids.add(value.trim());
      }
    }
  }

  const technicianNames = tags.technicianNames;
  if (Array.isArray(technicianNames)) {
    for (const value of technicianNames) {
      if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
        const id = String((value as { id?: string }).id).trim();
        if (id) ids.add(id);
      }
    }
  }

  return Array.from(ids);
}

export function extractTechnicianIds(input: {
  ownerTechnicianId?: unknown;
  technicianIds?: unknown;
  technicianNames?: unknown;
  assigneeId?: unknown;
}): string[] {
  const ids = new Set<string>();

  const collect = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      ids.add(value.trim());
    }
  };

  collect(input.ownerTechnicianId);
  collect(input.assigneeId);

  if (Array.isArray(input.technicianIds)) {
    for (const value of input.technicianIds) {
      collect(value);
    }
  }

  if (Array.isArray(input.technicianNames)) {
    for (const value of input.technicianNames) {
      if (value && typeof value === 'object') {
        collect((value as { id?: unknown }).id);
      }
    }
  }

  return Array.from(ids);
}

export async function validateTechnicianWeeklyCapacity(options: {
  technicianIds: string[];
  excludeTicketId?: string;
  referenceDate?: Date;
}): Promise<{ ok: true } | { ok: false; technicians: Array<{ id: string; activeCount: number; limit: number }> }> {
  const normalizedIds = [...new Set(options.technicianIds.map((id) => String(id).trim()).filter(Boolean))];
  if (normalizedIds.length === 0) return { ok: true };

  const { start, end } = getWeekBounds(options.referenceDate ?? new Date());

  const activeTickets = await (db as any).ticket.findMany({
    where: {
      isDeleted: false,
      status: { notIn: Array.from(INACTIVE_STATUSES) },
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      id: true,
      assigneeId: true,
      tags: true,
    },
  });

  const counter = new Map<string, number>();
  for (const technicianId of normalizedIds) {
    counter.set(technicianId, 0);
  }

  for (const ticket of activeTickets as TicketLite[]) {
    if (options.excludeTicketId && ticket.id === options.excludeTicketId) continue;
    const ticketTechnicians = collectTechnicianIdsFromTicket(ticket);
    if (ticketTechnicians.length === 0) continue;

    for (const technicianId of normalizedIds) {
      if (ticketTechnicians.includes(technicianId)) {
        counter.set(technicianId, (counter.get(technicianId) ?? 0) + 1);
      }
    }
  }

  const exceeded = normalizedIds
    .map((id) => ({ id, activeCount: counter.get(id) ?? 0, limit: MAX_ACTIVE_TICKETS_PER_WEEK }))
    .filter((entry) => entry.activeCount >= MAX_ACTIVE_TICKETS_PER_WEEK);

  if (exceeded.length > 0) {
    return { ok: false, technicians: exceeded };
  }

  return { ok: true };
}
