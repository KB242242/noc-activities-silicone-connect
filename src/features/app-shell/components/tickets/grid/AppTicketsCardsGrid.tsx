import type { ComponentType, MouseEvent } from 'react';

import { Edit, Eye, MapPin, RotateCcw, ShieldCheck, ShieldX, Trash2, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TicketActionType = 'delete' | 'permanent' | 'restore';

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

type TicketCardItem = {
  id: string;
  numero: string;
  objet: string;
  approvalStatus?: string;
  status: string;
  priority: string;
  category: string;
  site?: string;
  technicien?: string;
  createdAt: Date;
};

type AppTicketsCardsGridProps<T extends TicketCardItem> = {
  tickets: T[];
  canManageTickets: boolean;
  showDeletedTickets: boolean;
  statusStyles: Record<string, TicketStatusStyle>;
  priorityStyles: Record<string, TicketPriorityStyle>;
  categoryStyles: Record<string, TicketCategoryStyle>;
  isTicketActionBusy: (action: TicketActionType, ticketId: string) => boolean;
  onPrefetchTicket: (ticketId: string) => void;
  onOpenTicketDetails: (ticketId: string) => void;
  onOpenTrashContextMenu: (event: MouseEvent<HTMLDivElement>, ticket: T) => void;
  onRestoreTicket: (ticket: T) => void;
  onRequestDeleteTicket: (ticket: T, permanent: boolean) => void;
  onEditTicket: (ticket: T) => void;
  formatDateTime: (date: Date) => string;
};

export function AppTicketsCardsGrid<T extends TicketCardItem>({
  tickets,
  canManageTickets,
  showDeletedTickets,
  statusStyles,
  priorityStyles,
  categoryStyles,
  isTicketActionBusy,
  onPrefetchTicket,
  onOpenTicketDetails,
  onOpenTrashContextMenu,
  onRestoreTicket,
  onRequestDeleteTicket,
  onEditTicket,
  formatDateTime,
}: AppTicketsCardsGridProps<T>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tickets.map((ticket) => {
        const isDeletingToTrash = isTicketActionBusy('delete', ticket.id);
        const isDeletingPermanent = isTicketActionBusy('permanent', ticket.id);
        const isRestoring = isTicketActionBusy('restore', ticket.id);
        const CatIcon = categoryStyles[ticket.category].icon;
        const approvalStatus = String(ticket.approvalStatus ?? '').toUpperCase();

        return (
          <Card
            key={ticket.id}
            className={`border-2 ${statusStyles[ticket.status].borderColor} bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200 cursor-pointer ${isDeletingToTrash || isDeletingPermanent || isRestoring ? 'opacity-60' : ''}`}
            onMouseEnter={() => onPrefetchTicket(ticket.id)}
            onClick={() => onOpenTicketDetails(ticket.id)}
            onContextMenu={(event) => {
              if (!showDeletedTickets) return;
              onOpenTrashContextMenu(event, ticket);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</span>
                <Badge className={`${statusStyles[ticket.status].bgColor} ${statusStyles[ticket.status].color} font-semibold`}>
                  {statusStyles[ticket.status].label}
                </Badge>
              </div>
              <CardTitle className="text-base text-foreground line-clamp-2 inline-flex items-center gap-1.5">
                {approvalStatus === 'APPROVED' ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : null}
                {approvalStatus === 'DISAPPROVED' ? <ShieldX className="h-3.5 w-3.5 text-red-600" /> : null}
                <span>{ticket.objet}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className={`${priorityStyles[ticket.priority].bgColor} ${priorityStyles[ticket.priority].color} text-xs`}>
                    {priorityStyles[ticket.priority].label}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CatIcon className="w-4 h-4" />
                    {categoryStyles[ticket.category].label}
                  </span>
                </div>
                {ticket.site ? (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {ticket.site}
                  </p>
                ) : null}
                {ticket.technicien ? (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <User className="w-4 h-4" /> {ticket.technicien}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">{formatDateTime(ticket.createdAt)}</p>
              </div>

              <div
                className="flex items-center gap-1 mt-3 pt-3 border-t dark:border-slate-700"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  onClick={() => onOpenTicketDetails(ticket.id)}
                >
                  <Eye className="w-4 h-4 mr-1" /> Voir
                </Button>
                {showDeletedTickets ? (
                  <>
                    {canManageTickets ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                          onClick={() => onRestoreTicket(ticket)}
                          disabled={isRestoring || isDeletingPermanent}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> {isRestoring ? 'Restauration...' : 'Restaurer'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
                          onClick={() => onRequestDeleteTicket(ticket, true)}
                          disabled={isDeletingPermanent || isRestoring}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> {isDeletingPermanent ? 'Suppression...' : 'Définitif'}
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : (
                  canManageTickets ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400"
                      onClick={() => onEditTicket(ticket)}
                      disabled={isDeletingToTrash}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Modifier
                    </Button>
                  ) : null
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}