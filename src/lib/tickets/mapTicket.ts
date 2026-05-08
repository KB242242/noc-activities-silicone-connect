function mapCategoryToType(category?: string): string {
  switch (category) {
    case 'INCIDENT':
      return 'INC';
    case 'REQUEST':
      return 'SU';
    case 'PROBLEM':
      return 'PC';
    default:
      return 'INC';
  }
}

export function mapTicket(t: any) {
  let tags: Record<string, unknown> = {};
  try {
    tags = JSON.parse(t.tags ?? '{}');
  } catch {
    // noop
  }

  const clientFromTags = Array.isArray(tags.clientNames)
    ? (tags.clientNames as Array<{ id?: string; name?: string; serviceType?: string }>)
    : [];
  const clientIds = Array.isArray(tags.clientIds) ? (tags.clientIds as string[]) : [];

  const technicianFromTags = Array.isArray(tags.technicianNames)
    ? (tags.technicianNames as Array<{ id?: string; name?: string; pseudo?: string }>)
    : [];
  const technicianIds = Array.isArray(tags.technicianIds) ? (tags.technicianIds as string[]) : [];

  const localitiesFromTags = Array.isArray(tags.localities) ? (tags.localities as string[]) : [];
  const localitiesFromDb = (t.localite as string | null)?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
  const localities = [...new Set([...localitiesFromTags, ...localitiesFromDb])];

  return {
    id: t.id,
    numero: t.numero ?? '',
    ticketZoho: (tags.ticketZoho as string) ?? '',
    type: (tags.type as string) ?? mapCategoryToType(t.category),
    objet: t.objet ?? '',
    description: t.description ?? '',
    contactName: (tags.contactName as string) ?? '',
    contactEmail: (tags.contactEmail as string) ?? '',
    contactPhone: (tags.contactPhone as string) ?? '',
    clients:
      clientFromTags.length > 0
        ? clientFromTags.map((client) => ({
            id: client.id ?? client.name ?? '',
            name: client.name ?? client.id ?? '',
            serviceType: client.serviceType,
          }))
        : clientIds.map((id: string) => ({ id, name: id })),
    technicians:
      technicianFromTags.length > 0
        ? technicianFromTags.map((tech) => ({
            id: tech.id ?? tech.name ?? '',
            name: tech.name ?? tech.id ?? '',
            pseudo: tech.pseudo,
          }))
        : technicianIds.map((id: string) => ({ id, name: id })),
    localities,
    siteIds: Array.isArray(tags.siteIds) ? (tags.siteIds as string[]) : [],
    sites: Array.isArray(tags.siteNames)
      ? (tags.siteNames as string[])
      : (t.site ? String(t.site).split(',').map((v: string) => v.trim()).filter(Boolean) : []),
    link: (tags.link as string) ?? '',
    priority: t.priority ?? 'MEDIUM',
    status: t.status ?? 'OPEN',
    channel: (tags.channel as string) ?? '',
    language: (tags.language as string) ?? 'FR',
    classification: (tags.classification as string) ?? '',
    startDate: (tags.startDate as string) ?? t.createdAt,
    endDate: (tags.endDate as string) ?? t.resolvedAt ?? null,
    dueDate: t.dueDate ?? null,
    eta: (tags.eta as string) ?? '',
    etr: (tags.etr as string) ?? '',
    resolutionDescription: (tags.resolutionDescription as string) ?? '',
    resolutionCause: (tags.resolutionCause as string) ?? '',
    outageStartTime: (tags.outageStartTime as string) ?? null,
    outageEndTime: (tags.outageEndTime as string) ?? null,
    isRecurring: false,
    isArchived: false,
    isDeleted: t.isDeleted ?? false,
    deletedAt: t.deletedAt ?? null,
    deletedBy: t.deletedBy ?? null,
    creatorId: t.reporterId ?? '',
    creatorName: t.reporterName ?? '',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    closedAt: t.closedAt ?? null,
    comments: (t.comments ?? []).map((c: any) => ({
      id: c.id,
      ticketId: c.ticketId,
      authorId: c.authorId ?? '',
      authorName: c.authorName ?? '',
      content: c.content ?? c.message ?? '',
      isPrivate: c.isPrivate ?? false,
      isEdited: false,
      createdAt: c.createdAt,
    })),
    attachments: (t.attachments ?? []).map((a: any) => ({
      id: a.id,
      ticketId: a.ticketId,
      name: a.name ?? a.filename ?? '',
      url: a.url ?? a.path ?? '',
      size: a.size ?? 0,
      mimeType: a.mimeType ?? a.type ?? '',
      uploadedBy: a.uploadedBy ?? '',
      uploadedAt: a.createdAt,
    })),
    history: [],
    subTasks: [],
    timeEntries: [],
    approvals: [],
  };
}
