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
  const normalizeAvatarPath = (value: string, userId?: string) => {
    const src = String(value ?? '').trim().replace(/\\/g, '/');
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
    if (src.startsWith('/public/')) return src.slice('/public'.length);
    if (src.startsWith('public/')) return `/${src.slice('public/'.length)}`;
    if (src.startsWith('/')) return src;
    if (src.startsWith('profile-avatars/') || src.startsWith('upload/')) return `/${src}`;
    if (userId && !src.includes('/') && /\.(png|jpe?g|webp|gif|svg)$/i.test(src)) {
      return `/profile-avatars/${userId}/${src}`;
    }
    return `/${src}`;
  };

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

  const historyItems = (t.history ?? []).map((h: any) => ({
    id: h.id,
    ticketId: h.ticketId,
    userId: h.userId ?? 'system',
    userName: h.userName ?? 'Systeme',
    action: h.action ?? 'updated',
    field: h.field ?? undefined,
    oldValue: h.oldValue ?? undefined,
    newValue: h.newValue ?? undefined,
    createdAt: h.timestamp ?? h.createdAt ?? new Date(),
  }));

  const parseJson = (value?: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const manualArchived = tags.isArchived === true || String(tags.isArchived ?? '').toLowerCase() === 'true';
  const archivedAtFromTags = typeof tags.archivedAt === 'string' && tags.archivedAt.trim()
    ? tags.archivedAt.trim()
    : '';
  const archivedYearFromTags = Number(tags.archivedYear);
  const closedDate = t.closedAt ? new Date(t.closedAt) : null;
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const autoArchived = Boolean(
    t.status === 'CLOSED'
    && closedDate
    && !Number.isNaN(closedDate.getTime())
    && (closedDate <= oneYearAgo || closedDate.getFullYear() < now.getFullYear())
  );
  const resolvedArchivedAt = archivedAtFromTags || (autoArchived && closedDate ? closedDate.toISOString() : null);
  const resolvedArchiveYear = Number.isFinite(archivedYearFromTags) && archivedYearFromTags > 0
    ? archivedYearFromTags
    : (resolvedArchivedAt ? new Date(resolvedArchivedAt).getFullYear() : (closedDate ? closedDate.getFullYear() : null));

  const timeEntries = historyItems
    .filter((entry: any) => entry.action === 'time_entry_added' || entry.field === 'time_entry')
    .map((entry: any) => {
      const payload = parseJson(entry.newValue) as Record<string, unknown> | null;
      return {
        id: entry.id,
        ticketId: entry.ticketId,
        technicianId: String(payload?.technicianId ?? entry.userId ?? ''),
        technicianName: String(payload?.technicianName ?? entry.userName ?? 'Systeme'),
        date: payload?.date ?? entry.createdAt,
        startTime: String(payload?.startTime ?? ''),
        endTime: String(payload?.endTime ?? ''),
        durationMinutes: Number(payload?.durationMinutes ?? 0),
        note: String(payload?.note ?? ''),
      };
    });

  const subTasks = historyItems
    .filter((entry: any) => entry.action === 'subtask_created' || entry.field === 'subtask')
    .map((entry: any) => {
      const payload = parseJson(entry.newValue) as Record<string, unknown> | null;
      const referenceTicketIds = Array.isArray(payload?.referenceTicketIds)
        ? (payload?.referenceTicketIds as unknown[]).map((value) => String(value ?? '').trim()).filter(Boolean)
        : [];
      const manualTechnicianNames = Array.isArray(payload?.manualTechnicianNames)
        ? (payload?.manualTechnicianNames as unknown[]).map((value) => String(value ?? '').trim()).filter(Boolean)
        : [];
      const selectedLocalities = Array.isArray(payload?.selectedLocalities)
        ? (payload?.selectedLocalities as unknown[]).map((value) => String(value ?? '').trim()).filter(Boolean)
        : [];
      return {
        id: entry.id,
        ticketId: entry.ticketId,
        authorId: entry.userId,
        authorName: entry.userName,
        description: String(payload?.description ?? entry.action ?? ''),
        status: String(payload?.status ?? 'TODO'),
        linkedTicketId: String(payload?.linkedTicketId ?? '').trim(),
        linkedTicketNumero: String(payload?.linkedTicketNumero ?? '').trim(),
        linkedTicketObjet: String(payload?.linkedTicketObjet ?? '').trim(),
        linkedTicketStatus: String(payload?.linkedTicketStatus ?? '').trim(),
        linkedTicketPriority: String(payload?.linkedTicketPriority ?? '').trim(),
        referenceTicketIds,
        manualTechnicianNames,
        selectedLocalities,
        activityKind: String(payload?.activityKind ?? 'task').trim() || 'task',
        createdAt: entry.createdAt,
      };
    });

  const exactStartAt = typeof tags.exactStartAt === 'string' && tags.exactStartAt.trim()
    ? tags.exactStartAt.trim()
    : null;
  const exactClosedAt = typeof tags.exactClosedAt === 'string' && tags.exactClosedAt.trim()
    ? tags.exactClosedAt.trim()
    : null;
  const mergedTicketIds = Array.isArray(tags.mergedTicketIds)
    ? tags.mergedTicketIds.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
  const mergedTicketNumeros = Array.isArray(tags.mergedTicketNumeros)
    ? tags.mergedTicketNumeros.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];

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
    ownerTechnicianId: (tags.ownerTechnicianId as string) ?? '',
    ownerTechnicianName: (tags.ownerTechnicianName as string) ?? '',
    priority: t.priority ?? 'MEDIUM',
    status: t.status ?? 'OPEN',
    channel: (tags.channel as string) ?? '',
    language: (tags.language as string) ?? 'FR',
    classification: (tags.classification as string) ?? '',
    categoryLabel: (tags.categoryLabel as string) ?? '',
    maintenanceMode: (tags.maintenanceMode as string) ?? '',
    incidentLevel: (tags.incidentLevel as string) ?? '',
    channelRequestTime: (tags.channelRequestTime as string) ?? '',
    channelEmailLink: (tags.channelEmailLink as string) ?? '',
    slaDuration: (tags.slaDuration as string) ?? '',
    slr: (tags.slr as string) ?? '',
    descriptionHtml: (tags.descriptionHtml as string) ?? '',
    startDate: (tags.startDate as string) ?? t.createdAt,
    endDate: (tags.endDate as string) ?? t.resolvedAt ?? null,
    dueDate: t.dueDate ?? null,
    eta: (tags.eta as string) ?? '',
    etr: (tags.etr as string) ?? '',
    resolutionDescription: (tags.resolutionDescription as string) ?? '',
    resolutionCause: (tags.resolutionCause as string) ?? '',
    outageStartTime: (tags.outageStartTime as string) ?? null,
    outageEndTime: (tags.outageEndTime as string) ?? null,
    exactStartAt,
    exactClosedAt,
    exactDatesCreatedAt: (tags.exactDatesCreatedAt as string) ?? null,
    exactDatesCreatedById: (tags.exactDatesCreatedById as string) ?? '',
    exactDatesCreatedByName: (tags.exactDatesCreatedByName as string) ?? '',
    exactDatesUpdatedAt: (tags.exactDatesUpdatedAt as string) ?? null,
    exactDatesUpdatedById: (tags.exactDatesUpdatedById as string) ?? '',
    exactDatesUpdatedByName: (tags.exactDatesUpdatedByName as string) ?? '',
    mergedTicketIds,
    mergedTicketNumeros,
    mergedMode: (tags.mergedMode as string) ?? '',
    mergedParentTicketId: (tags.mergedParentTicketId as string) ?? '',
    mergedParentTicketNumero: (tags.mergedParentTicketNumero as string) ?? '',
    slaStartAt: exactStartAt ?? t.createdAt,
    slaClosedAt: exactClosedAt ?? t.closedAt ?? null,
    isRecurring: false,
    isArchived: manualArchived || autoArchived,
    archivedAt: resolvedArchivedAt,
    archivedYear: resolvedArchiveYear,
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
      authorId: c.authorId ?? c.userId ?? c.user?.id ?? '',
      // c.userName is the stored field (contains "🤖 Système — name" for system comments).
      // c.user?.username is the joined User's real username — must NOT override c.userName.
      authorName: c.userName ?? c.user?.username ?? c.authorName ?? 'Utilisateur',
      authorAvatar: (() => {
        const rawAvatar = c.user?.avatar ?? c.authorAvatar ?? '';
        const userId = c.authorId ?? c.userId ?? c.user?.id ?? '';
        const normalized = normalizeAvatarPath(rawAvatar, userId);
        return normalized || '/profile-avatars/default.svg';
      })(),
      content: c.content ?? c.message ?? '',
      isPrivate: c.isPrivate ?? false,
      isEdited: false,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt ?? null,
    })),
    attachments: (t.attachments ?? []).map((a: any) => ({
      id: a.id,
      ticketId: a.ticketId,
      name: a.fileName ?? a.name ?? a.filename ?? '',
      url: a.fileData
        ? `data:${a.fileType ?? 'application/octet-stream'};base64,${a.fileData}`
        : (a.url ?? a.path ?? `/api/tickets/${encodeURIComponent(String(a.ticketId ?? t.id ?? ''))}/attachments/${encodeURIComponent(String(a.id ?? ''))}`),
      size: a.fileSize ?? a.size ?? 0,
      mimeType: a.fileType ?? a.mimeType ?? a.type ?? '',
      uploadedBy: a.uploadedBy ?? '',
      uploadedByName: a.user?.name ?? a.user?.username ?? a.user?.firstName ?? a.uploadedBy ?? 'Utilisateur',
      uploadedAt: a.uploadedAt ?? a.createdAt,
    })),
    history: historyItems,
    subTasks,
    timeEntries,
    approvals: [],
  };
}
