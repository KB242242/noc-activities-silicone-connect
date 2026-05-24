import type { ReactNode } from 'react';

import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { AppTicketsActionToolbar } from '@/features/app-shell/components/tickets/AppTicketsActionToolbar';

type TicketViewMode = 'list' | 'card';

type TicketOption = {
  id: string;
  name: string;
};

type AppTicketsHeaderActionsProps = {
  ticketViewMode: TicketViewMode;
  localityDialogSlot: ReactNode;
  siteOptions: TicketOption[];
  localityOptions: string[];
  technicianOptions: TicketOption[];
  currentUser: { id: string; name: string } | null;
  onShowActiveTickets: () => void;
  onShowArchivedTickets: () => void;
  onShowDeletedTickets: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onToggleViewMode: () => void;
  onLocalityCreated: (name: string) => void;
  onTicketCreated: (rawTicket: any) => void;
  onRefreshTickets: () => Promise<void>;
};

export function AppTicketsHeaderActions({
  ticketViewMode,
  localityDialogSlot,
  siteOptions,
  localityOptions,
  technicianOptions,
  currentUser,
  onShowActiveTickets,
  onShowArchivedTickets,
  onShowDeletedTickets,
  onResetFilters,
  onRefresh,
  onToggleViewMode,
  onLocalityCreated,
  onTicketCreated,
  onRefreshTickets,
}: AppTicketsHeaderActionsProps) {
  return (
    <>
      <AppTicketsActionToolbar
        ticketViewMode={ticketViewMode}
        onShowActiveTickets={onShowActiveTickets}
        onShowArchivedTickets={onShowArchivedTickets}
        onShowDeletedTickets={onShowDeletedTickets}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
        onToggleViewMode={onToggleViewMode}
      />

      {localityDialogSlot}

      <CreateTicketDialog
        siteOptions={siteOptions}
        localityOptions={localityOptions}
        technicianOptions={technicianOptions}
        user={currentUser}
        onLocalityCreated={onLocalityCreated}
        onTicketCreated={onTicketCreated}
        onRefreshTickets={onRefreshTickets}
      />
    </>
  );
}
