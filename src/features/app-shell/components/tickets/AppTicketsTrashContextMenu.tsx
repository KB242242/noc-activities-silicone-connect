import { RotateCcw, Trash2 } from 'lucide-react';

type TicketActionType = 'delete' | 'permanent' | 'restore';

type TrashContextTicket = {
  id: string;
};

type TrashContextMenuPosition = {
  x: number;
  y: number;
};

type AppTicketsTrashContextMenuProps<T extends TrashContextTicket> = {
  isVisible: boolean;
  ticket: T | null;
  position: TrashContextMenuPosition;
  isTicketActionBusy: (action: TicketActionType, ticketId: string) => boolean;
  onRestoreTicket: (ticket: T) => void;
  onRequestPermanentDelete: (ticket: T) => void;
};

export function AppTicketsTrashContextMenu<T extends TrashContextTicket>({
  isVisible,
  ticket,
  position,
  isTicketActionBusy,
  onRestoreTicket,
  onRequestPermanentDelete,
}: AppTicketsTrashContextMenuProps<T>) {
  if (!isVisible || !ticket) return null;

  return (
    <div
      className="fixed z-50 min-w-48 rounded-lg border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        onClick={() => onRestoreTicket(ticket)}
        disabled={isTicketActionBusy('restore', ticket.id) || isTicketActionBusy('permanent', ticket.id)}
      >
        <RotateCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />{' '}
        {isTicketActionBusy('restore', ticket.id) ? 'Restauration...' : 'Restaurer'}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        onClick={() => onRequestPermanentDelete(ticket)}
        disabled={isTicketActionBusy('permanent', ticket.id) || isTicketActionBusy('restore', ticket.id)}
      >
        <Trash2 className="h-4 w-4" />{' '}
        {isTicketActionBusy('permanent', ticket.id) ? 'Suppression...' : 'Supprimer définitivement'}
      </button>
    </div>
  );
}
