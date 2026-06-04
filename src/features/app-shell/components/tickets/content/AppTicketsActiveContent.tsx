import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, MouseEvent } from 'react';

import { format } from 'date-fns';
import { Archive, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AppTicketsCardsGrid } from '@/features/app-shell/components/tickets/grid/AppTicketsCardsGrid';
import { AppTicketsDeleteConfirmDialog } from '@/features/app-shell/components/tickets/dialogs/AppTicketsDeleteConfirmDialog';
import { AppTicketsFiltersCard } from '@/features/app-shell/components/tickets/filters/AppTicketsFiltersCard';
import { AppTicketsListTable } from '@/features/app-shell/components/tickets/table/AppTicketsListTable';
import { AppTicketsTrashContextMenu } from '@/features/app-shell/components/tickets/dialogs/AppTicketsTrashContextMenu';

type TicketViewMode = 'list' | 'card';
type TicketActionType = 'delete' | 'permanent' | 'restore';

type FilterOption = {
  value: string;
  label: string;
};

type SiteOption = {
  id: string;
  name: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type TicketStatusStyle = {
  label: string;
  bgColor: string;
  color: string;
  borderColor: string;
};

type TicketPriorityStyle = {
  label: string;
  bgColor: string;
  color: string;
};

type TicketCategoryStyle = {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type TicketItem = {
  id: string;
  numero: string;
  objet: string;
  contactName?: string;
  accountName?: string;
  recentThread?: string;
  dueDate?: Date;
  status: string;
  technicien?: string;
  channel?: string;
  priority: string;
  category: string;
  site?: string;
  createdAt: Date;
};

type Position = {
  x: number;
  y: number;
};

type AppTicketsActiveContentProps<T extends TicketItem> = {
  ticketViewMode: TicketViewMode;
  canManageTickets: boolean;
  visibleTickets: T[];
  currentStorageCount: number;
  showDeletedTickets: boolean;
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  siteFilter: string;
  localityFilter: string;
  technicianFilter: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  siteOptions: SiteOption[];
  localityOptions: string[];
  technicianOptions: TechnicianOption[];
  statusStyles: Record<string, TicketStatusStyle>;
  priorityStyles: Record<string, TicketPriorityStyle>;
  categoryStyles: Record<string, TicketCategoryStyle>;
  showTrashContextMenu: boolean;
  trashContextTicket: T | null;
  trashContextMenuPosition: Position;
  deleteTicketDialogOpen: boolean;
  deleteTicketPermanent: boolean;
  deleteTicketTarget: T | null;
  isTicketActionBusy: (action: TicketActionType, ticketId: string) => boolean;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onSiteFilterChange: (value: string) => void;
  onLocalityFilterChange: (value: string) => void;
  onTechnicianFilterChange: (value: string) => void;
  onPrefetchTicket: (ticketId: string) => void;
  onOpenTicketDetails: (ticketId: string) => void;
  onOpenTrashContextMenu: (event: MouseEvent<any>, ticket: T) => void;
  onRestoreTicket: (ticket: T) => void;
  onRequestDeleteTicket: (ticket: T, permanent: boolean) => void;
  onEditTicket: (ticket: T) => void;
  onBulkArchiveTickets: (tickets: T[]) => Promise<void>;
  onBulkDeleteTickets: (tickets: T[]) => Promise<void>;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteDialogCancel: () => void;
  onDeleteDialogConfirm: (ticket: T, permanent: boolean) => void;
};

export function AppTicketsActiveContent<T extends TicketItem>({
  ticketViewMode,
  canManageTickets,
  visibleTickets,
  currentStorageCount: _currentStorageCount,
  showDeletedTickets,
  searchQuery,
  statusFilter,
  priorityFilter,
  siteFilter,
  localityFilter,
  technicianFilter,
  statusOptions,
  priorityOptions,
  siteOptions,
  localityOptions,
  technicianOptions,
  statusStyles,
  priorityStyles,
  categoryStyles,
  showTrashContextMenu,
  trashContextTicket,
  trashContextMenuPosition,
  deleteTicketDialogOpen,
  deleteTicketPermanent,
  deleteTicketTarget,
  isTicketActionBusy,
  onSearchQueryChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSiteFilterChange,
  onLocalityFilterChange,
  onTechnicianFilterChange,
  onPrefetchTicket,
  onOpenTicketDetails,
  onOpenTrashContextMenu,
  onRestoreTicket,
  onRequestDeleteTicket,
  onEditTicket,
  onBulkArchiveTickets,
  onBulkDeleteTickets,
  onDeleteDialogOpenChange,
  onDeleteDialogCancel,
  onDeleteDialogConfirm,
}: AppTicketsActiveContentProps<T>) {
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const maxPage = Math.max(1, Math.ceil(visibleTickets.length / rowsPerPage));

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return visibleTickets.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, visibleTickets]);

  const allDisplayedSelected = paginatedTickets.length > 0 && paginatedTickets.every((ticket) => selectedTicketIds.has(ticket.id));
  const allFilteredSelected = visibleTickets.length > 0 && visibleTickets.every((ticket) => selectedTicketIds.has(ticket.id));

  const selectedTickets = useMemo(
    () => visibleTickets.filter((ticket) => selectedTicketIds.has(ticket.id)),
    [selectedTicketIds, visibleTickets]
  );

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [maxPage, page]);

  useEffect(() => {
    setSelectedTicketIds((prev) => {
      const allowedIds = new Set(visibleTickets.map((ticket) => ticket.id));
      const next = new Set<string>();

      prev.forEach((ticketId) => {
        if (allowedIds.has(ticketId)) {
          next.add(ticketId);
        }
      });

      return next;
    });
  }, [visibleTickets]);

  const handleToggleTicketSelection = (ticket: T, additive: boolean) => {
    setSelectedTicketIds((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();

      if (next.has(ticket.id)) {
        next.delete(ticket.id);
      } else {
        next.add(ticket.id);
      }

      return next;
    });
  };

  const handleToggleSelectAllDisplayed = (checked: boolean) => {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);

      paginatedTickets.forEach((ticket) => {
        if (checked) {
          next.add(ticket.id);
        } else {
          next.delete(ticket.id);
        }
      });

      return next;
    });
  };

  const handleBulkArchive = async () => {
    if (selectedTickets.length === 0) return;
    await onBulkArchiveTickets(selectedTickets);
    setSelectedTicketIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    await onBulkDeleteTickets(selectedTickets);
    setSelectedTicketIds(new Set());
  };

  const handleToggleSelectAllFiltered = () => {
    setSelectedTicketIds((prev) => {
      if (allFilteredSelected) {
        return new Set<string>();
      }

      return new Set(visibleTickets.map((ticket) => ticket.id));
    });
  };

  return (
    <>
      <AppTicketsFiltersCard
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        siteFilter={siteFilter}
        localityFilter={localityFilter}
        technicianFilter={technicianFilter}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        siteOptions={siteOptions}
        localityOptions={localityOptions}
        technicianOptions={technicianOptions}
        onSearchQueryChange={onSearchQueryChange}
        onStatusFilterChange={onStatusFilterChange}
        onPriorityFilterChange={onPriorityFilterChange}
        onSiteFilterChange={onSiteFilterChange}
        onLocalityFilterChange={onLocalityFilterChange}
        onTechnicianFilterChange={onTechnicianFilterChange}
      />

      {ticketViewMode === 'list' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Affichage</span>
            <select
              value={rowsPerPage}
              onChange={(event) => {
                const nextRowsPerPage = Number(event.target.value);
                setRowsPerPage(nextRowsPerPage);
                setPage(1);
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              aria-label="Nombre de tickets par page"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {canManageTickets && selectedTickets.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedTickets.length} sélectionné(s)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAllFiltered}
                disabled={visibleTickets.length === 0}
              >
                {allFilteredSelected ? 'Désélectionner tout (filtrés)' : 'Sélectionner tout (filtrés)'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTicketIds(new Set())}
              >
                Effacer la sélection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                disabled={showDeletedTickets}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archiver
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {ticketViewMode === 'list' ? (
        <AppTicketsListTable<T>
          tickets={paginatedTickets}
          canManageTickets={canManageTickets}
          showDeletedTickets={showDeletedTickets}
          currentStorageCount={visibleTickets.length}
          selectedTicketIds={selectedTicketIds}
          allDisplayedSelected={allDisplayedSelected}
          statusStyles={statusStyles}
          isTicketActionBusy={isTicketActionBusy}
          onToggleSelectAllDisplayed={handleToggleSelectAllDisplayed}
          onToggleTicketSelection={handleToggleTicketSelection}
          onPrefetchTicket={onPrefetchTicket}
          onOpenTicketDetails={onOpenTicketDetails}
          onOpenTrashContextMenu={onOpenTrashContextMenu}
          onRestoreTicket={onRestoreTicket}
          onRequestDeleteTicket={onRequestDeleteTicket}
          onEditTicket={onEditTicket}
          formatDateTime={(date) => format(date, 'dd/MM/yyyy HH:mm')}
        />
      ) : (
        <AppTicketsCardsGrid<T>
          tickets={visibleTickets}
          canManageTickets={canManageTickets}
          showDeletedTickets={showDeletedTickets}
          statusStyles={statusStyles}
          priorityStyles={priorityStyles}
          categoryStyles={categoryStyles}
          isTicketActionBusy={isTicketActionBusy}
          onPrefetchTicket={onPrefetchTicket}
          onOpenTicketDetails={onOpenTicketDetails}
          onOpenTrashContextMenu={onOpenTrashContextMenu}
          onRestoreTicket={onRestoreTicket}
          onRequestDeleteTicket={onRequestDeleteTicket}
          onEditTicket={onEditTicket}
          formatDateTime={(date) => format(date, 'dd/MM/yyyy HH:mm')}
        />
      )}

      {ticketViewMode === 'list' ? (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Page {page} / {maxPage} - {visibleTickets.length} ticket(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(maxPage, prev + 1))}
              disabled={page >= maxPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <AppTicketsTrashContextMenu<T>
        isVisible={canManageTickets && showDeletedTickets && showTrashContextMenu}
        ticket={trashContextTicket}
        position={trashContextMenuPosition}
        isTicketActionBusy={isTicketActionBusy}
        onRestoreTicket={onRestoreTicket}
        onRequestPermanentDelete={(ticket) => onRequestDeleteTicket(ticket, true)}
      />

      {canManageTickets ? (
        <AppTicketsDeleteConfirmDialog<T>
          open={deleteTicketDialogOpen}
          deletePermanent={deleteTicketPermanent}
          deleteTarget={deleteTicketTarget}
          isTicketActionBusy={isTicketActionBusy}
          onOpenChange={onDeleteDialogOpenChange}
          onCancel={onDeleteDialogCancel}
          onConfirm={onDeleteDialogConfirm}
        />
      ) : null}
    </>
  );
}