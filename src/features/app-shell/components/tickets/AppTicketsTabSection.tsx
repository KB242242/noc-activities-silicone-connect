import { motion } from 'framer-motion';

import { AppTicketsTabContent } from '@/features/app-shell/components/tickets/AppTicketsTabContent';

type AppTicketsTabSectionProps = {
  showArchivedTickets: boolean;
  quickLocalityDialogOpen: boolean;
  setQuickLocalityDialogOpen: (open: boolean) => void;
  setQuickLocalityDraft: (value: any) => void;
  DEFAULT_TICKET_LOCALITY_DRAFT: any;
  quickLocalityDraft: any;
  quickLocalityTab: any;
  setQuickLocalityTab: (value: any) => void;
  managedLocalitySearch: string;
  setManagedLocalitySearch: (value: string) => void;
  selectedManagedLocalityId: string | null;
  handleSelectManagedLocality: (id: string) => void;
  filteredManagedLocalities: any[];
  managedLocalityName: string;
  setManagedLocalityName: (value: string) => void;
  managedLocalityDraft: any;
  setManagedLocalityDraft: (value: any) => void;
  ticketCongoDepartments: any[];
  isCreatingLocality: boolean;
  isDeletingLocality: boolean;
  isUpdatingLocality: boolean;
  handleQuickCreateLocality: () => void;
  handleDeleteManagedLocality: (id: string) => void;
  handleUpdateManagedLocality: () => void;
  ticketViewMode: any;
  ticketSiteOptions: any;
  ticketLocalityOptions: any;
  ticketTechnicianOptions: any;
  user: any;
  setShowArchivedTickets: (value: boolean) => void;
  setShowDeletedTickets: (value: boolean) => void;
  setTicketSearchQuery: (value: string) => void;
  setTicketStatusFilter: (value: any) => void;
  setTicketPriorityFilter: (value: any) => void;
  setTicketSiteFilter: (value: any) => void;
  setTicketLocaliteFilter: (value: any) => void;
  setTicketTechnicienFilter: (value: any) => void;
  loadTicketsModuleData: () => Promise<void> | void;
  setTicketViewMode: (value: any) => void;
  upsertLocalityOption: any;
  mapApiTicketToLegacy: (raw: any) => any;
  setTickets: (updater: (prev: any[]) => any[]) => void;
  ticketSearchQuery: string;
  ticketStatusFilter: any;
  ticketPriorityFilter: any;
  ticketSiteFilter: any;
  ticketLocaliteFilter: any;
  ticketTechnicienFilter: any;
  visibleTickets: any[];
  currentStorageTickets: any[];
  showDeletedTickets: boolean;
  ticketStatusFilterOptions: any;
  ticketPriorityFilterOptions: any;
  TICKET_STATUSES: any;
  TICKET_PRIORITIES: any;
  TICKET_CATEGORIES: any;
  showTrashContextMenu: boolean;
  trashContextTicket: any;
  trashContextMenuPosition: any;
  deleteTicketDialogOpen: boolean;
  deleteTicketPermanent: boolean;
  deleteTicketTarget: any;
  isTicketActionBusy: (action: 'delete' | 'permanent' | 'restore', ticketId: string) => boolean;
  router: any;
  openTicketDetailPage: (id: string) => void;
  openTrashTicketContextMenu: any;
  handleRestoreTicket: any;
  requestDeleteTicket: any;
  setEditingTicket: (value: any) => void;
  setEditTicketOpen: (open: boolean) => void;
  setDeleteTicketDialogOpen: (open: boolean) => void;
  setDeleteTicketTarget: (value: any) => void;
  setDeleteTicketPermanent: (value: boolean) => void;
  handleDeleteTicket: any;
  archiveYears: any;
  archiveYearFilter: any;
  archiveYearBuckets: any;
  archiveReport: any;
  setArchiveYearFilter: (value: any) => void;
  tickets: any[];
  handleUnarchiveTicket: any;
  ticketStatusArchiveOptions: any;
  ticketPriorityArchiveOptions: any;
};

export function AppTicketsTabSection({
  showArchivedTickets,
  quickLocalityDialogOpen,
  setQuickLocalityDialogOpen,
  setQuickLocalityDraft,
  DEFAULT_TICKET_LOCALITY_DRAFT,
  quickLocalityDraft,
  quickLocalityTab,
  setQuickLocalityTab,
  managedLocalitySearch,
  setManagedLocalitySearch,
  selectedManagedLocalityId,
  handleSelectManagedLocality,
  filteredManagedLocalities,
  managedLocalityName,
  setManagedLocalityName,
  managedLocalityDraft,
  setManagedLocalityDraft,
  ticketCongoDepartments,
  isCreatingLocality,
  isDeletingLocality,
  isUpdatingLocality,
  handleQuickCreateLocality,
  handleDeleteManagedLocality,
  handleUpdateManagedLocality,
  ticketViewMode,
  ticketSiteOptions,
  ticketLocalityOptions,
  ticketTechnicianOptions,
  user,
  setShowArchivedTickets,
  setShowDeletedTickets,
  setTicketSearchQuery,
  setTicketStatusFilter,
  setTicketPriorityFilter,
  setTicketSiteFilter,
  setTicketLocaliteFilter,
  setTicketTechnicienFilter,
  loadTicketsModuleData,
  setTicketViewMode,
  upsertLocalityOption,
  mapApiTicketToLegacy,
  setTickets,
  ticketSearchQuery,
  ticketStatusFilter,
  ticketPriorityFilter,
  ticketSiteFilter,
  ticketLocaliteFilter,
  ticketTechnicienFilter,
  visibleTickets,
  currentStorageTickets,
  showDeletedTickets,
  ticketStatusFilterOptions,
  ticketPriorityFilterOptions,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  showTrashContextMenu,
  trashContextTicket,
  trashContextMenuPosition,
  deleteTicketDialogOpen,
  deleteTicketPermanent,
  deleteTicketTarget,
  isTicketActionBusy,
  router,
  openTicketDetailPage,
  openTrashTicketContextMenu,
  handleRestoreTicket,
  requestDeleteTicket,
  setEditingTicket,
  setEditTicketOpen,
  setDeleteTicketDialogOpen,
  setDeleteTicketTarget,
  setDeleteTicketPermanent,
  handleDeleteTicket,
  archiveYears,
  archiveYearFilter,
  archiveYearBuckets,
  archiveReport,
  setArchiveYearFilter,
  tickets,
  handleUnarchiveTicket,
  ticketStatusArchiveOptions,
  ticketPriorityArchiveOptions,
}: AppTicketsTabSectionProps) {
  return (
    <motion.div key="tickets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <AppTicketsTabContent
        showArchivedTickets={showArchivedTickets}
        localityDialogProps={{
          open: quickLocalityDialogOpen,
          onOpenChange: (open: boolean) => {
            setQuickLocalityDialogOpen(open);
            if (!open) {
              setQuickLocalityDraft(DEFAULT_TICKET_LOCALITY_DRAFT);
            }
          },
          quickLocalityDraft,
          setQuickLocalityDraft,
          quickLocalityTab,
          onQuickLocalityTabChange: setQuickLocalityTab,
          managedLocalitySearch,
          onManagedLocalitySearchChange: setManagedLocalitySearch,
          selectedManagedLocalityId: selectedManagedLocalityId ?? '',
          onSelectManagedLocality: handleSelectManagedLocality,
          filteredManagedLocalities,
          managedLocalityName,
          onManagedLocalityNameChange: setManagedLocalityName,
          managedLocalityDraft,
          setManagedLocalityDraft,
          ticketCongoDepartments,
          isCreatingLocality,
          isDeletingLocality,
          isUpdatingLocality,
          onCreateQuickLocality: handleQuickCreateLocality,
          onDeleteManagedLocality: () => {
            if (selectedManagedLocalityId) {
              handleDeleteManagedLocality(selectedManagedLocalityId);
            }
          },
          onUpdateManagedLocality: handleUpdateManagedLocality,
        }}
        headerActionsProps={{
          ticketViewMode,
          siteOptions: ticketSiteOptions,
          localityOptions: ticketLocalityOptions,
          technicianOptions: ticketTechnicianOptions,
          currentUser: user ? { id: user.id, name: user.name } : null,
          onShowActiveTickets: () => {
            setShowArchivedTickets(false);
            setShowDeletedTickets(false);
          },
          onShowArchivedTickets: () => {
            setShowArchivedTickets(true);
            setShowDeletedTickets(false);
          },
          onShowDeletedTickets: () => {
            setShowDeletedTickets(true);
            setShowArchivedTickets(false);
          },
          onResetFilters: () => {
            setTicketSearchQuery('');
            setTicketStatusFilter('all');
            setTicketPriorityFilter('all');
            setTicketSiteFilter('all');
            setTicketLocaliteFilter('all');
            setTicketTechnicienFilter('all');
          },
          onRefresh: () => void loadTicketsModuleData(),
          onToggleViewMode: () => setTicketViewMode(ticketViewMode === 'list' ? 'card' : 'list'),
          onLocalityCreated: upsertLocalityOption,
          onTicketCreated: (rawTicket: any) => {
            const createdTicket = mapApiTicketToLegacy(rawTicket);
            setTickets((prev) => [createdTicket, ...prev.filter((entry) => entry.id !== createdTicket.id)]);
          },
          onRefreshTickets: async () => {
            await loadTicketsModuleData();
          },
        }}
        activeContentProps={{
          ticketViewMode,
          visibleTickets,
          currentStorageCount: currentStorageTickets.length,
          showDeletedTickets,
          searchQuery: ticketSearchQuery,
          statusFilter: ticketStatusFilter,
          priorityFilter: ticketPriorityFilter,
          siteFilter: ticketSiteFilter,
          localityFilter: ticketLocaliteFilter,
          technicianFilter: ticketTechnicienFilter,
          statusOptions: ticketStatusFilterOptions,
          priorityOptions: ticketPriorityFilterOptions,
          siteOptions: ticketSiteOptions,
          localityOptions: ticketLocalityOptions,
          technicianOptions: ticketTechnicianOptions,
          statusStyles: TICKET_STATUSES,
          priorityStyles: TICKET_PRIORITIES,
          categoryStyles: TICKET_CATEGORIES,
          showTrashContextMenu,
          trashContextTicket,
          trashContextMenuPosition,
          deleteTicketDialogOpen,
          deleteTicketPermanent,
          deleteTicketTarget,
          isTicketActionBusy,
          onSearchQueryChange: setTicketSearchQuery,
          onStatusFilterChange: (value: any) => setTicketStatusFilter(value),
          onPriorityFilterChange: (value: any) => setTicketPriorityFilter(value),
          onSiteFilterChange: setTicketSiteFilter,
          onLocalityFilterChange: setTicketLocaliteFilter,
          onTechnicianFilterChange: setTicketTechnicienFilter,
          onPrefetchTicket: (ticketId: string) => {
            void router.prefetch(`/tickets/${ticketId}`);
          },
          onOpenTicketDetails: openTicketDetailPage,
          onOpenTrashContextMenu: openTrashTicketContextMenu,
          onRestoreTicket: (ticket: any) => {
            void handleRestoreTicket(ticket);
          },
          onRequestDeleteTicket: requestDeleteTicket,
          onEditTicket: (ticket: any) => {
            setEditingTicket(ticket);
            setEditTicketOpen(true);
          },
          onDeleteDialogOpenChange: (open: boolean) => {
            setDeleteTicketDialogOpen(open);
            if (!open) {
              setDeleteTicketTarget(null);
              setDeleteTicketPermanent(false);
            }
          },
          onDeleteDialogCancel: () => {
            setDeleteTicketDialogOpen(false);
            setDeleteTicketTarget(null);
            setDeleteTicketPermanent(false);
          },
          onDeleteDialogConfirm: (ticket: any, permanent: boolean) => {
            void handleDeleteTicket(ticket, permanent);
            setDeleteTicketDialogOpen(false);
            setDeleteTicketTarget(null);
            setDeleteTicketPermanent(false);
          },
        }}
        archiveContentProps={{
          archiveYears,
          archiveYearFilter,
          archiveYearBuckets,
          archiveReport,
          onArchiveYearChange: setArchiveYearFilter,
          onBackToActive: () => {
            setShowArchivedTickets(false);
            setShowDeletedTickets(false);
          },
          onViewTicket: openTicketDetailPage,
          onUnarchiveTicket: (ticketId: string) => {
            const ticket = tickets.find((entry) => entry.id === ticketId);
            if (ticket) void handleUnarchiveTicket(ticket);
          },
          statusBadge: (status: any) => TICKET_STATUSES[status],
          statusOptions: ticketStatusArchiveOptions,
          priorityOptions: ticketPriorityArchiveOptions,
        }}
      />
    </motion.div>
  );
}
