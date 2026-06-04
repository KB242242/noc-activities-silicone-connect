import type { MouseEvent } from 'react';

import { Edit, Eye, RotateCcw, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type TicketActionType = 'delete' | 'permanent' | 'restore';

type TicketStatusStyle = {
  label: string;
  bgColor: string;
  color: string;
  borderColor: string;
};

type TicketListItem = {
  id: string;
  numero: string;
  objet: string;
  approvalStatus?: string;
  contactName?: string;
  accountName?: string;
  recentThread?: string;
  dueDate?: Date;
  status: string;
  technicien?: string;
  channel?: string;
};

type AppTicketsListTableProps<T extends TicketListItem> = {
  tickets: T[];
  canManageTickets: boolean;
  showDeletedTickets: boolean;
  currentStorageCount: number;
  selectedTicketIds: Set<string>;
  allDisplayedSelected: boolean;
  statusStyles: Record<string, TicketStatusStyle>;
  isTicketActionBusy: (action: TicketActionType, ticketId: string) => boolean;
  onToggleSelectAllDisplayed: (checked: boolean) => void;
  onToggleTicketSelection: (ticket: T, additive: boolean) => void;
  onPrefetchTicket: (ticketId: string) => void;
  onOpenTicketDetails: (ticketId: string) => void;
  onOpenTrashContextMenu: (event: MouseEvent<HTMLTableRowElement>, ticket: T) => void;
  onRestoreTicket: (ticket: T) => void;
  onRequestDeleteTicket: (ticket: T, permanent: boolean) => void;
  onEditTicket: (ticket: T) => void;
  formatDateTime: (date: Date) => string;
};

export function AppTicketsListTable<T extends TicketListItem>({
  tickets,
  canManageTickets,
  showDeletedTickets,
  currentStorageCount,
  selectedTicketIds,
  allDisplayedSelected,
  statusStyles,
  isTicketActionBusy,
  onToggleSelectAllDisplayed,
  onToggleTicketSelection,
  onPrefetchTicket,
  onOpenTicketDetails,
  onOpenTrashContextMenu,
  onRestoreTicket,
  onRequestDeleteTicket,
  onEditTicket,
  formatDateTime,
}: AppTicketsListTableProps<T>) {
  return (
    <Card className="border-2 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="group/select-all text-left p-3 font-semibold text-foreground w-12">
                  {canManageTickets ? (
                    <input
                      type="checkbox"
                      aria-label="Sélectionner tous les tickets affichés"
                      checked={allDisplayedSelected && tickets.length > 0}
                      onChange={(event) => onToggleSelectAllDisplayed(event.target.checked)}
                      className={`h-4 w-4 rounded border-slate-300 transition-opacity ${selectedTicketIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover/select-all:opacity-100'}`}
                    />
                  ) : null}
                </th>
                <th className="text-left p-3 font-semibold text-foreground">ID du Ticket</th>
                <th className="text-left p-3 font-semibold text-foreground">Objet</th>
                <th className="text-left p-3 font-semibold text-foreground">Date d'échéance</th>
                <th className="text-left p-3 font-semibold text-foreground">État</th>
                <th className="text-left p-3 font-semibold text-foreground">Propriétaire du Ticket</th>
                <th className="text-left p-3 font-semibold text-foreground">Canal</th>
                <th className="text-left p-3 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const isDeletingToTrash = isTicketActionBusy('delete', ticket.id);
                const isDeletingPermanent = isTicketActionBusy('permanent', ticket.id);
                const isRestoring = isTicketActionBusy('restore', ticket.id);
                const isSelected = selectedTicketIds.has(ticket.id);
                const isOverdue = Boolean(ticket.dueDate) && ticket.dueDate!.getTime() < Date.now();
                const approvalStatus = String(ticket.approvalStatus ?? '').toUpperCase();

                return (
                  <tr
                    key={ticket.id}
                    className="group/row border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onMouseEnter={() => onPrefetchTicket(ticket.id)}
                    onClick={(event) => {
                      if (event.ctrlKey) {
                        onToggleTicketSelection(ticket, true);
                        return;
                      }

                      onOpenTicketDetails(ticket.id);
                    }}
                    onContextMenu={(event) => {
                      if (!showDeletedTickets) return;
                      onOpenTrashContextMenu(event, ticket);
                    }}
                  >
                    <td className="p-3" onClick={(event) => event.stopPropagation()}>
                      {canManageTickets ? (
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner le ticket ${ticket.numero}`}
                          checked={isSelected}
                          onChange={() => onToggleTicketSelection(ticket, true)}
                          className={`h-4 w-4 rounded border-slate-300 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}
                        />
                      ) : null}
                    </td>
                    <td className="p-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</td>
                    <td className="p-3 max-w-50 truncate text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {approvalStatus === 'APPROVED' ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : null}
                        {approvalStatus === 'DISAPPROVED' ? <ShieldX className="h-3.5 w-3.5 text-red-600" /> : null}
                        <span className="truncate">{ticket.objet}</span>
                      </span>
                    </td>
                    <td className={`p-3 text-sm ${isOverdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{ticket.dueDate ? formatDateTime(ticket.dueDate) : '-'}</td>
                    <td className="p-3">
                      <Badge className={`${statusStyles[ticket.status].bgColor} ${statusStyles[ticket.status].color} border ${statusStyles[ticket.status].borderColor} font-semibold`}>
                        {statusStyles[ticket.status].label}
                      </Badge>
                    </td>
                    <td className="p-3 text-foreground">{ticket.technicien || '-'}</td>
                    <td className="p-3 text-foreground">{ticket.channel || '-'}</td>
                    <td className="p-3">
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          onClick={() => onOpenTicketDetails(ticket.id)}
                        >
                          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        {showDeletedTickets ? (
                          <>
                            {canManageTickets ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                  onClick={() => onRestoreTicket(ticket)}
                                  disabled={isRestoring || isDeletingPermanent}
                                  title={isRestoring ? 'Restauration en cours' : 'Restaurer'}
                                >
                                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/40"
                                  onClick={() => onRequestDeleteTicket(ticket, true)}
                                  disabled={isDeletingPermanent || isRestoring}
                                  title={isDeletingPermanent ? 'Suppression en cours' : 'Supprimer définitivement'}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {canManageTickets ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                                  onClick={() => onEditTicket(ticket)}
                                  disabled={isDeletingToTrash}
                                >
                                  <Edit className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/40"
                                  onClick={() => onRequestDeleteTicket(ticket, false)}
                                  disabled={isDeletingToTrash}
                                  title={isDeletingToTrash ? 'Suppression en cours' : 'Supprimer'}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {currentStorageCount === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    {showDeletedTickets
                      ? 'La corbeille est vide'
                      : 'Aucun ticket. Cliquez sur "Créer un ticket" pour commencer.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}