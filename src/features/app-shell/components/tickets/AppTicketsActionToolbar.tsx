import { Archive, ClipboardList, LayoutDashboard, MoreVertical, RefreshCw, RotateCcw, Ticket, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TicketViewMode = 'list' | 'card';

type AppTicketsActionToolbarProps = {
  ticketViewMode: TicketViewMode;
  onShowActiveTickets: () => void;
  onShowArchivedTickets: () => void;
  onShowDeletedTickets: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onToggleViewMode: () => void;
};

export function AppTicketsActionToolbar({
  ticketViewMode,
  onShowActiveTickets,
  onShowArchivedTickets,
  onShowDeletedTickets,
  onResetFilters,
  onRefresh,
  onToggleViewMode,
}: AppTicketsActionToolbarProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md border-2 border-cyan-500 dark:border-cyan-400"
            aria-label="Menu tickets"
            title="Menu tickets"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Gestion Tickets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onShowActiveTickets}>
            <Ticket className="w-4 h-4 mr-2" />
            Voir les tickets actifs
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShowArchivedTickets}>
            <Archive className="w-4 h-4 mr-2" />
            Voir les archives
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShowDeletedTickets}>
            <Trash2 className="w-4 h-4 mr-2" />
            Voir la corbeille
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onResetFilters}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser les filtres
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir la liste
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleViewMode}
        className="border-2 border-cyan-500 dark:border-cyan-400"
        title={ticketViewMode === 'list' ? 'Vue cartes' : 'Vue liste'}
      >
        {ticketViewMode === 'list' ? (
          <LayoutDashboard className="w-4 h-4" />
        ) : (
          <ClipboardList className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}
