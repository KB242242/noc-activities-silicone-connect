import type { TicketCategory, TicketItem, TicketPriority, TicketStatus } from '@/features/app-shell/types';

export function mapApiTicketStatusToLegacy(status?: string): TicketStatus {
  switch (status) {
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'PENDING':
      return 'pending';
    case 'ESCALATED':
      return 'escalated';
    case 'SUSPENDED':
      return 'suspended';
    case 'WAITING_FICHE':
      return 'waiting_fiche';
    case 'RESOLVED':
      return 'resolved';
    case 'CLOSED':
      return 'closed';
    default:
      return 'open';
  }
}

export function mapLegacyTicketStatusToApi(status?: TicketStatus): string {
  switch (status) {
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'pending':
      return 'PENDING';
    case 'escalated':
      return 'ESCALATED';
    case 'suspended':
      return 'SUSPENDED';
    case 'waiting_fiche':
      return 'WAITING_FICHE';
    case 'resolved':
      return 'RESOLVED';
    case 'closed':
      return 'CLOSED';
    default:
      return 'OPEN';
  }
}

export function mapApiTicketPriorityToLegacy(priority?: string): TicketPriority {
  switch (priority) {
    case 'LOW':
      return 'low';
    case 'HIGH':
      return 'high';
    case 'CRITICAL':
      return 'critical';
    default:
      return 'medium';
  }
}

export function mapLegacyTicketPriorityToApi(priority?: TicketPriority): string {
  switch (priority) {
    case 'low':
      return 'LOW';
    case 'high':
      return 'HIGH';
    case 'critical':
      return 'CRITICAL';
    default:
      return 'MEDIUM';
  }
}

export function mapApiTicketTypeToLegacyCategory(type?: string): TicketCategory {
  switch (type) {
    case 'SU':
    case 'FD':
    case 'VS':
      return 'request';
    case 'PC':
    case 'MP':
      return 'problem';
    case 'MC':
      return 'change';
    case 'INC':
    case 'FI':
    default:
      return 'incident';
  }
}

export function mapLegacyTicketCategoryToApiType(category?: TicketCategory): string {
  switch (category) {
    case 'request':
      return 'SU';
    case 'problem':
      return 'PC';
    case 'change':
      return 'MC';
    case 'other':
      return 'INC';
    case 'incident':
    default:
      return 'INC';
  }
}

export function mapApiTicketToLegacy(ticket: any): TicketItem {
  const technicianNames = Array.isArray(ticket.technicians)
    ? ticket.technicians.map((technician: { name?: string }) => technician.name).filter(Boolean)
    : [];
  const clientNames = Array.isArray(ticket.clients)
    ? ticket.clients.map((client: { name?: string }) => client.name).filter(Boolean)
    : [];
  const siteNames = Array.isArray(ticket.sites) ? ticket.sites.filter(Boolean) : [];
  const localities = Array.isArray(ticket.localities) ? ticket.localities.filter(Boolean) : [];
  const latestComment = Array.isArray(ticket.comments) && ticket.comments.length > 0
    ? ticket.comments
        .slice()
        .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
    : null;

  return {
    id: String(ticket.id),
    numero: ticket.numero ?? '',
    objet: ticket.objet ?? '',
    contactName: ticket.contactName ?? ticket.creatorName ?? ticket.reporterName ?? '-',
    accountName: clientNames[0] ?? '-',
    recentThread: latestComment?.content ? String(latestComment.content).slice(0, 90) : '-',
    description: ticket.description ?? '',
    status: mapApiTicketStatusToLegacy(ticket.status),
    priority: mapApiTicketPriorityToLegacy(ticket.priority),
    category: mapApiTicketTypeToLegacyCategory(ticket.type),
    channel: ticket.channel ?? '-',
    site: siteNames.join(', '),
    localite: localities.join(', '),
    technicien: technicianNames.join(', '),
    reporterId: ticket.creatorId ?? '',
    reporterName: ticket.creatorName ?? '',
    assigneeId: ticket.technicians?.[0]?.id ?? undefined,
    assigneeName: ticket.technicians?.[0]?.name ?? undefined,
    comments: Array.isArray(ticket.comments)
      ? ticket.comments.map((comment: any) => ({
          id: String(comment.id),
          ticketId: String(comment.ticketId ?? ticket.id),
          userId: String(comment.authorId ?? ''),
          userName: comment.authorName ?? '',
          content: comment.content ?? '',
          isPrivate: Boolean(comment.isPrivate),
          createdAt: new Date(comment.createdAt),
          updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
        }))
      : [],
    attachments: Array.isArray(ticket.attachments)
      ? ticket.attachments.map((attachment: any) => ({
          id: String(attachment.id),
          ticketId: String(attachment.ticketId ?? ticket.id),
          fileName: attachment.name ?? '',
          fileSize: Number(attachment.size ?? 0),
          fileType: attachment.mimeType ?? '',
          fileData: attachment.url ?? '',
          uploadedBy: attachment.uploadedBy ?? '',
          uploadedAt: new Date(attachment.uploadedAt ?? attachment.createdAt ?? Date.now()),
        }))
      : [],
    history: Array.isArray(ticket.history)
      ? ticket.history.map((entry: any) => ({
          id: String(entry.id),
          ticketId: String(entry.ticketId ?? ticket.id),
          userId: String(entry.userId ?? ''),
          userName: entry.userName ?? '',
          action: entry.action ?? '',
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          timestamp: new Date(entry.createdAt ?? entry.timestamp ?? Date.now()),
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
    archivedYear: Number.isFinite(Number(ticket.archivedYear)) ? Number(ticket.archivedYear) : undefined,
    isDeleted: Boolean(ticket.isDeleted),
    deletedAt: ticket.deletedAt ? new Date(ticket.deletedAt) : undefined,
    deletedBy: ticket.deletedBy ?? undefined,
  };
}
