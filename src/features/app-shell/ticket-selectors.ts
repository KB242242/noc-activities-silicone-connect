import type {
  TicketItem,
  TicketManagedLocality,
  TicketOptionItem,
  TicketPriority,
  TicketStatus,
  UserProfile,
} from '@/features/app-shell/types';

export type TicketVisibilityFilters = {
  ticketSearchQuery: string;
  ticketStatusFilter: TicketStatus | 'all';
  ticketPriorityFilter: TicketPriority | 'all';
  ticketSiteFilter: string;
  ticketLocaliteFilter: string;
  ticketTechnicienFilter: string;
};

export type TicketActionType = 'delete' | 'restore' | 'permanent';

export function getTicketActionKey(action: TicketActionType, ticketId: string): string {
  return `${action}:${ticketId}`;
}

export function isTicketActionBusy(
  ticketActionBusyKeys: string[],
  action: TicketActionType,
  ticketId: string
): boolean {
  return ticketActionBusyKeys.includes(getTicketActionKey(action, ticketId));
}

export function updateTicketActionBusyKeys(prev: string[], actionKey: string, busy: boolean): string[] {
  if (busy) {
    return prev.includes(actionKey) ? prev : [...prev, actionKey];
  }
  return prev.filter((key) => key !== actionKey);
}

export function matchesTicketStorageView(
  ticket: TicketItem,
  showDeletedTickets: boolean,
  showArchivedTickets: boolean
): boolean {
  if (showDeletedTickets) return ticket.isDeleted;
  if (showArchivedTickets) return !ticket.isDeleted && Boolean(ticket.isArchived);
  return !ticket.isDeleted && !Boolean(ticket.isArchived);
}

export function filterVisibleTickets(
  currentStorageTickets: TicketItem[],
  filters: TicketVisibilityFilters
): TicketItem[] {
  const {
    ticketSearchQuery,
    ticketStatusFilter,
    ticketPriorityFilter,
    ticketSiteFilter,
    ticketLocaliteFilter,
    ticketTechnicienFilter,
  } = filters;

  return currentStorageTickets.filter((ticket) => {
    if (ticketSearchQuery) {
      const query = ticketSearchQuery.toLowerCase();
      const haystack = [
        ticket.numero,
        ticket.objet,
        ticket.contactName,
        ticket.accountName,
        ticket.recentThread,
        ticket.technicien,
        ticket.site,
        ticket.localite,
        ticket.channel,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (ticketStatusFilter !== 'all' && ticket.status !== ticketStatusFilter) return false;
    if (ticketPriorityFilter !== 'all' && ticket.priority !== ticketPriorityFilter) return false;
    if (ticketSiteFilter !== 'all' && !ticket.site.toLowerCase().includes(ticketSiteFilter.toLowerCase())) return false;
    if (ticketLocaliteFilter !== 'all' && !ticket.localite.toLowerCase().includes(ticketLocaliteFilter.toLowerCase())) return false;
    if (ticketTechnicienFilter !== 'all' && !ticket.technicien.toLowerCase().includes(ticketTechnicienFilter.toLowerCase())) return false;
    return true;
  });
}

export function getArchivedTickets(tickets: TicketItem[]): TicketItem[] {
  return tickets.filter((ticket) => !ticket.isDeleted && Boolean(ticket.isArchived));
}

export function getArchiveYears(archivedTickets: TicketItem[]): number[] {
  const years = Array.from(
    new Set(
      archivedTickets
        .map((ticket) => ticket.archivedYear ?? ticket.archivedAt?.getFullYear() ?? ticket.closedAt?.getFullYear() ?? ticket.createdAt.getFullYear())
        .filter((year) => Number.isFinite(year))
    )
  );
  return years.sort((left, right) => Number(right) - Number(left));
}

export function getSelectedArchiveTickets(
  archivedTickets: TicketItem[],
  archiveYearFilter: 'all' | string
): TicketItem[] {
  if (archiveYearFilter === 'all') return archivedTickets;
  const selectedYear = Number(archiveYearFilter);
  return archivedTickets.filter((ticket) => {
    const year = ticket.archivedYear ?? ticket.archivedAt?.getFullYear() ?? ticket.closedAt?.getFullYear() ?? ticket.createdAt.getFullYear();
    return year === selectedYear;
  });
}

export function getArchiveReport(
  selectedArchiveTickets: TicketItem[],
  tickets: TicketItem[],
  archiveYearFilter: 'all' | string
): { totalArchived: number; slaSatisfied: number; slaRate: number; openInSelectedYear: number } {
  const totalArchived = selectedArchiveTickets.length;
  const slaSatisfied = selectedArchiveTickets.filter((ticket) => {
    if (!ticket.dueDate) return false;
    const archivedMoment = ticket.archivedAt ?? ticket.closedAt ?? ticket.updatedAt;
    return archivedMoment.getTime() <= ticket.dueDate.getTime();
  }).length;

  const openInSelectedYear = tickets.filter((ticket) => {
    const ticketYear = ticket.createdAt.getFullYear();
    const selectedYear = archiveYearFilter === 'all' ? null : Number(archiveYearFilter);
    const matchesYear = selectedYear ? ticketYear === selectedYear : true;
    const ticketStatus = String(ticket.status ?? '').toUpperCase();
    return matchesYear && !ticket.isDeleted && !ticket.isArchived && ticketStatus !== 'CLOSED' && ticketStatus !== 'RESOLVED';
  }).length;

  const slaRate = totalArchived > 0 ? Math.round((slaSatisfied / totalArchived) * 100) : 0;
  return { totalArchived, slaSatisfied, slaRate, openInSelectedYear };
}

export function getArchiveYearBuckets(
  selectedArchiveTickets: TicketItem[]
): Array<{ year: number; items: TicketItem[] }> {
  const groups = new Map<number, TicketItem[]>();
  selectedArchiveTickets.forEach((ticket) => {
    const year = ticket.archivedYear ?? ticket.archivedAt?.getFullYear() ?? ticket.closedAt?.getFullYear() ?? ticket.createdAt.getFullYear();
    const current = groups.get(year) ?? [];
    current.push(ticket);
    groups.set(year, current);
  });

  return Array.from(groups.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([year, items]) => ({
      year,
      items: items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    }));
}

export function getTicketTechnicianOptions(usersDirectory: UserProfile[]): TicketOptionItem[] {
  return usersDirectory
    .filter((profile) => profile.isActive && (profile.role === 'TECHNICIEN' || profile.role === 'TECHNICIEN_NO'))
    .map((profile) => ({ id: profile.id, name: profile.name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }));
}

export function filterManagedLocalities(
  managedLocalities: TicketManagedLocality[],
  managedLocalitySearch: string
): TicketManagedLocality[] {
  const query = managedLocalitySearch.trim().toLowerCase();
  if (!query) return managedLocalities;
  return managedLocalities.filter((locality) => {
    const haystack = [
      locality.name,
      locality.countryName,
      locality.departement,
      locality.city,
      locality.arrondissement,
      locality.quartier,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}
