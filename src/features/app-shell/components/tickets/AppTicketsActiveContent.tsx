import type { ComponentType, MouseEvent } from 'react';

import { format } from 'date-fns';

import { AppTicketsCardsGrid } from '@/features/app-shell/components/tickets/AppTicketsCardsGrid';
import { AppTicketsDeleteConfirmDialog } from '@/features/app-shell/components/tickets/AppTicketsDeleteConfirmDialog';
import { AppTicketsFiltersCard } from '@/features/app-shell/components/tickets/AppTicketsFiltersCard';
import { AppTicketsListTable } from '@/features/app-shell/components/tickets/AppTicketsListTable';
import { AppTicketsTrashContextMenu } from '@/features/app-shell/components/tickets/AppTicketsTrashContextMenu';

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
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteDialogCancel: () => void;
  onDeleteDialogConfirm: (ticket: T, permanent: boolean) => void;
};

export function AppTicketsActiveContent<T extends TicketItem>({
  ticketViewMode,
  visibleTickets,
  currentStorageCount,
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
  onDeleteDialogOpenChange,
  onDeleteDialogCancel,
  onDeleteDialogConfirm,
}: AppTicketsActiveContentProps<T>) {
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
        <AppTicketsListTable<T>
          tickets={visibleTickets}
          showDeletedTickets={showDeletedTickets}
          currentStorageCount={currentStorageCount}
          statusStyles={statusStyles}
          isTicketActionBusy={isTicketActionBusy}
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

      <AppTicketsTrashContextMenu<T>
        isVisible={showDeletedTickets && showTrashContextMenu}
        ticket={trashContextTicket}
        position={trashContextMenuPosition}
        isTicketActionBusy={isTicketActionBusy}
        onRestoreTicket={onRestoreTicket}
        onRequestPermanentDelete={(ticket) => onRequestDeleteTicket(ticket, true)}
      />

      <AppTicketsDeleteConfirmDialog<T>
        open={deleteTicketDialogOpen}
        deletePermanent={deleteTicketPermanent}
        deleteTarget={deleteTicketTarget}
        isTicketActionBusy={isTicketActionBusy}
        onOpenChange={onDeleteDialogOpenChange}
        onCancel={onDeleteDialogCancel}
        onConfirm={onDeleteDialogConfirm}
      />
    </>
  );
}
