// ============================================
// TICKETS FEATURE — API Mapping Helpers
// ============================================

import type { TicketStatus, TicketPriority, TicketCategory, TicketItem } from './types';

export function mapApiTicketStatusToLegacy(status?: string): TicketStatus {
  switch (status) {
    case 'IN_PROGRESS': return 'in_progress';
    case 'PENDING':
    case 'ESCALATED': return 'pending';
    case 'RESOLVED': return 'resolved';
    case 'CLOSED': return 'closed';
    default: return 'open';
  }
}

export function mapLegacyTicketStatusToApi(status?: TicketStatus): string {
  switch (status) {
    case 'in_progress': return 'IN_PROGRESS';
    case 'pending': return 'PENDING';
    case 'resolved': return 'RESOLVED';
    case 'closed': return 'CLOSED';
    default: return 'OPEN';
  }
}

export function mapApiTicketPriorityToLegacy(priority?: string): TicketPriority {
  switch (priority) {
    case 'LOW': return 'low';
    case 'HIGH': return 'high';
    case 'CRITICAL': return 'critical';
    default: return 'medium';
  }
}

export function mapLegacyTicketPriorityToApi(priority?: TicketPriority): string {
  switch (priority) {
    case 'low': return 'LOW';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return 'MEDIUM';
  }
}

export function mapApiTicketTypeToLegacyCategory(type?: string): TicketCategory {
  switch (type) {
    case 'SU':
    case 'FD':
    case 'VS':
    case 'REQUEST': return 'request';
    case 'PC':
    case 'MP':
    case 'PROBLEM': return 'problem';
    case 'MC':
    case 'CHANGE': return 'change';
    case 'OTHER': return 'other';
    default: return 'incident';
  }
}

export function mapLegacyTicketCategoryToApiType(category?: TicketCategory): string {
  switch (category) {
    case 'request': return 'REQUEST';
    case 'problem': return 'PROBLEM';
    case 'change': return 'CHANGE';
    case 'other': return 'OTHER';
    default: return 'INCIDENT';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiTicketToLegacy(ticket: any): TicketItem {
  const technicianNames = Array.isArray(ticket.technicians)
    ? ticket.technicians.map((t: { name?: string }) => t.name).filter(Boolean)
    : [];
  const siteNames = Array.isArray(ticket.sites) ? ticket.sites.filter(Boolean) : [];
  const localities = Array.isArray(ticket.localities) ? ticket.localities.filter(Boolean) : [];

  return {
    id: String(ticket.id),
    numero: ticket.numero ?? '',
    objet: ticket.objet ?? '',
    description: ticket.description ?? '',
    status: mapApiTicketStatusToLegacy(ticket.status),
    priority: mapApiTicketPriorityToLegacy(ticket.priority),
    category: mapApiTicketTypeToLegacyCategory(ticket.type),
    site: siteNames.join(', '),
    localite: localities.join(', '),
    technicien: technicianNames.join(', '),
    reporterId: ticket.creatorId ?? '',
    reporterName: ticket.creatorName ?? '',
    assigneeId: ticket.technicians?.[0]?.id ?? undefined,
    assigneeName: ticket.technicians?.[0]?.name ?? undefined,
    comments: Array.isArray(ticket.comments)
      ? ticket.comments.map((c: any) => ({
          id: String(c.id),
          ticketId: String(c.ticketId ?? ticket.id),
          authorId: String(c.authorId ?? ''),
          authorName: c.authorName ?? '',
          content: c.content ?? '',
          isPrivate: Boolean(c.isPrivate),
          isEdited: Boolean(c.isEdited),
          createdAt: new Date(c.createdAt),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        }))
      : [],
    attachments: Array.isArray(ticket.attachments)
      ? ticket.attachments.map((a: any) => ({
          id: String(a.id),
          ticketId: String(a.ticketId ?? ticket.id),
          fileName: a.name ?? '',
          fileSize: Number(a.size ?? 0),
          fileType: a.mimeType ?? '',
          fileData: a.url ?? '',
          uploadedBy: a.uploadedBy ?? '',
          uploadedAt: new Date(a.uploadedAt ?? a.createdAt ?? Date.now()),
        }))
      : [],
    history: Array.isArray(ticket.history)
      ? ticket.history.map((h: any) => ({
          id: String(h.id),
          ticketId: String(h.ticketId ?? ticket.id),
          userId: String(h.userId ?? ''),
          userName: h.userName ?? '',
          action: h.action ?? '',
          field: h.field,
          oldValue: h.oldValue,
          newValue: h.newValue,
          timestamp: new Date(h.createdAt ?? h.timestamp ?? Date.now()),
        }))
      : [],
    tags: [],
    createdAt: new Date(ticket.createdAt),
    updatedAt: new Date(ticket.updatedAt),
    resolvedAt: ticket.endDate ? new Date(ticket.endDate) : undefined,
    closedAt: ticket.closedAt ? new Date(ticket.closedAt) : undefined,
    dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
    etr: ticket.etr ? new Date(ticket.etr) : undefined,
    sla: ticket.sla ?? undefined,
    slr: ticket.slr ?? undefined,
    isArchived: Boolean(ticket.isArchived),
    archivedAt: ticket.archivedAt ? new Date(ticket.archivedAt) : undefined,
    archiveYear: Number.isFinite(Number(ticket.archiveYear)) ? Number(ticket.archiveYear) : undefined,
    isDeleted: Boolean(ticket.isDeleted),
    deletedAt: ticket.deletedAt ? new Date(ticket.deletedAt) : undefined,
    deletedBy: ticket.deletedBy ?? undefined,
  };
}
