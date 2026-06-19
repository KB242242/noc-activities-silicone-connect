import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { Edit, ExternalLink, PanelRightOpen, RotateCcw, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

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
  reporterId?: string;
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
  isQuickPreviewOpen: boolean;
  isTicketUnread: (ticket: T) => boolean;
  onOpenTicketQuickPreview: (ticketId: string) => void;
  onOpenTicketDetails: (ticketId: string) => void;
  onOpenTrashContextMenu: (event: ReactMouseEvent<HTMLTableRowElement>, ticket: T) => void;
  onRestoreTicket: (ticket: T) => void;
  onRequestDeleteTicket: (ticket: T, permanent: boolean) => void;
  onEditTicket: (ticket: T) => void;
  formatDateTime: (date: Date) => string;
};

type ColumnKey = 'select' | 'ticketId' | 'subject' | 'dueDate' | 'status' | 'owner' | 'channel';

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  select: 48,
  ticketId: 180,
  subject: 360,
  dueDate: 190,
  status: 160,
  owner: 240,
  channel: 150,
};

const COLUMN_MIN_WIDTHS: Record<ColumnKey, number> = {
  select: 40,
  ticketId: 130,
  subject: 220,
  dueDate: 150,
  status: 120,
  owner: 160,
  channel: 110,
};

const BLACK_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M5 1h1.5v14H5zm4.5 0H11v14H9.5zM4.5 8 1 5v2H0v2h1v2zm7 0 3.5-3v2H16v2h-1v2z'/%3E%3C/svg%3E") 8 8, col-resize`;
const WHITE_COL_RESIZE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' d='M5 1h1.5v14H5zm4.5 0H11v14H9.5zM4.5 8 1 5v2H0v2h1v2zm7 0 3.5-3v2H16v2h-1v2z'/%3E%3C/svg%3E") 8 8, col-resize`;
const TICKETS_TABLE_COLUMN_WIDTHS_STORAGE_KEY = 'noc:tickets:list-table:column-widths:v1';

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
  isQuickPreviewOpen,
  isTicketUnread,
  onOpenTicketQuickPreview,
  onOpenTicketDetails,
  onOpenTrashContextMenu,
  onRestoreTicket,
  onRequestDeleteTicket,
  onEditTicket,
  formatDateTime,
}: AppTicketsListTableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [resizeCursor, setResizeCursor] = useState<string>(BLACK_COL_RESIZE_CURSOR);
  const resizeStateRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);
  const hasLoadedColumnWidthsRef = useRef(false);

  const resolveThemeAwareCursor = useCallback(() => {
    if (typeof document === 'undefined') return BLACK_COL_RESIZE_CURSOR;
    return document.documentElement.classList.contains('dark')
      ? WHITE_COL_RESIZE_CURSOR
      : BLACK_COL_RESIZE_CURSOR;
  }, []);

  const clampColumnWidth = useCallback((key: ColumnKey, width: number) => {
    const minWidth = COLUMN_MIN_WIDTHS[key];
    return Math.max(minWidth, Math.round(width));
  }, []);

  const startColumnResize = useCallback((key: ColumnKey, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };

    const activeCursor = resolveThemeAwareCursor();
    setResizeCursor(activeCursor);
    document.body.style.cursor = activeCursor;
    document.body.style.userSelect = 'none';
  }, [columnWidths, resolveThemeAwareCursor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyThemeCursor = () => {
      setResizeCursor(resolveThemeAwareCursor());
    };

    applyThemeCursor();

    const root = document.documentElement;
    const observer = new MutationObserver(applyThemeCursor);
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => applyThemeCursor();
    media.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', handleMediaChange);
    };
  }, [resolveThemeAwareCursor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(TICKETS_TABLE_COLUMN_WIDTHS_STORAGE_KEY);
      if (!raw) {
        hasLoadedColumnWidthsRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>;
      const keys = Object.keys(DEFAULT_COLUMN_WIDTHS) as ColumnKey[];

      const restored = keys.reduce<Record<ColumnKey, number>>((acc, key) => {
        const candidate = Number(parsed[key]);
        acc[key] = Number.isFinite(candidate)
          ? clampColumnWidth(key, candidate)
          : DEFAULT_COLUMN_WIDTHS[key];
        return acc;
      }, { ...DEFAULT_COLUMN_WIDTHS });

      setColumnWidths(restored);
    } catch {
      // Ignore invalid localStorage payload.
    } finally {
      hasLoadedColumnWidthsRef.current = true;
    }
  }, [clampColumnWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoadedColumnWidthsRef.current) return;

    window.localStorage.setItem(
      TICKETS_TABLE_COLUMN_WIDTHS_STORAGE_KEY,
      JSON.stringify(columnWidths)
    );
  }, [columnWidths]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const delta = event.clientX - state.startX;
      const nextWidth = clampColumnWidth(state.key, state.startWidth + delta);

      setColumnWidths((prev) => {
        if (prev[state.key] === nextWidth) return prev;
        return {
          ...prev,
          [state.key]: nextWidth,
        };
      });
    };

    const stopResizing = () => {
      if (!resizeStateRef.current) return;
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [clampColumnWidth]);

  const colStyles = useMemo(() => {
    const styleFor = (key: ColumnKey) => ({
      width: `${columnWidths[key]}px`,
      minWidth: `${COLUMN_MIN_WIDTHS[key]}px`,
    });

    return {
      select: styleFor('select'),
      ticketId: styleFor('ticketId'),
      subject: styleFor('subject'),
      dueDate: styleFor('dueDate'),
      status: styleFor('status'),
      owner: styleFor('owner'),
      channel: styleFor('channel'),
    };
  }, [columnWidths]);

  const renderResizer = (key: ColumnKey) => (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner la colonne"
      onMouseDown={(event) => startColumnResize(key, event)}
      className="absolute right-0 top-0 h-full w-2 select-none touch-none bg-transparent"
      style={{ cursor: resizeCursor }}
    />
  );

  return (
    <Card className="border-2 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th style={colStyles.select} className="relative group/select-all text-left p-3 font-semibold text-foreground">
                  {canManageTickets ? (
                    <input
                      type="checkbox"
                      aria-label="Sélectionner tous les tickets affichés"
                      checked={allDisplayedSelected && tickets.length > 0}
                      onChange={(event) => onToggleSelectAllDisplayed(event.target.checked)}
                      className={`h-4 w-4 rounded border-slate-300 transition-opacity ${selectedTicketIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover/select-all:opacity-100'}`}
                    />
                  ) : null}
                  {renderResizer('select')}
                </th>
                <th style={colStyles.ticketId} className="relative text-left p-3 font-semibold text-foreground">ID du Ticket{renderResizer('ticketId')}</th>
                <th style={colStyles.subject} className="relative text-left p-3 font-semibold text-foreground">Objet{renderResizer('subject')}</th>
                <th style={colStyles.dueDate} className="relative text-left p-3 font-semibold text-foreground">Date d'échéance{renderResizer('dueDate')}</th>
                <th style={colStyles.status} className="relative text-left p-3 font-semibold text-foreground">État{renderResizer('status')}</th>
                <th style={colStyles.owner} className="relative text-left p-3 font-semibold text-foreground">Propriétaire du Ticket{renderResizer('owner')}</th>
                <th style={colStyles.channel} className="relative text-left p-3 font-semibold text-foreground">Canal{renderResizer('channel')}</th>
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
                const isUnread = isTicketUnread(ticket);

                return (
                  <tr
                    key={ticket.id}
                    className="group/row relative border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onMouseEnter={() => onPrefetchTicket(ticket.id)}
                    onClick={(event) => {
                      if (event.ctrlKey) {
                        onToggleTicketSelection(ticket, true);
                        return;
                      }

                      if (isQuickPreviewOpen) {
                        onOpenTicketQuickPreview(ticket.id);
                        return;
                      }

                      onOpenTicketDetails(ticket.id);
                    }}
                    onContextMenu={(event) => {
                      if (!showDeletedTickets) return;
                      onOpenTrashContextMenu(event, ticket);
                    }}
                  >
                    <td style={colStyles.select} className="relative p-3" onClick={(event) => event.stopPropagation()}>
                      {canManageTickets ? (
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner le ticket ${ticket.numero}`}
                          checked={isSelected}
                          onChange={() => onToggleTicketSelection(ticket, true)}
                          className={`h-4 w-4 rounded border-slate-300 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}
                        />
                      ) : null}
                      {renderResizer('select')}
                    </td>
                    <td style={colStyles.ticketId} className={`relative p-3 font-mono text-cyan-600 dark:text-cyan-400 truncate ${isUnread ? 'font-extrabold' : 'font-semibold'}`}>{ticket.numero}{renderResizer('ticketId')}</td>
                    <td style={colStyles.subject} className={`relative p-3 truncate text-foreground ${isUnread ? 'font-bold' : 'font-normal'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {approvalStatus === 'APPROVED' ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : null}
                        {approvalStatus === 'DISAPPROVED' ? <ShieldX className="h-3.5 w-3.5 text-red-600" /> : null}
                        <span className="truncate">{ticket.objet}</span>
                      </span>
                      {renderResizer('subject')}
                    </td>
                    <td style={colStyles.dueDate} className={`relative p-3 text-sm truncate ${isOverdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{ticket.dueDate ? formatDateTime(ticket.dueDate) : '-'}{renderResizer('dueDate')}</td>
                    <td style={colStyles.status} className="relative p-3">
                      <Badge className={`${statusStyles[ticket.status].bgColor} ${statusStyles[ticket.status].color} border ${statusStyles[ticket.status].borderColor} font-semibold`}>
                        {statusStyles[ticket.status].label}
                      </Badge>
                      {renderResizer('status')}
                    </td>
                    <td style={colStyles.owner} className="relative p-3 text-foreground truncate">{ticket.technicien || '-'}{renderResizer('owner')}</td>
                    <td style={colStyles.channel} className="relative overflow-visible p-3 pr-44 text-foreground truncate">
                      {ticket.channel || '-'}
                      {renderResizer('channel')}

                      <div
                        className="pointer-events-auto absolute right-2 top-1/2 z-40 inline-flex -translate-y-1/2 items-center gap-1 opacity-0 transition-all duration-200 ease-out translate-x-2 group-hover/row:translate-x-0 group-hover/row:opacity-100"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-md border border-cyan-200/60 bg-cyan-50/75 p-0 text-cyan-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-cyan-100/90 hover:text-cyan-500 dark:border-cyan-700/50 dark:bg-cyan-900/35 dark:text-cyan-300 dark:hover:bg-cyan-900/55 dark:hover:text-cyan-200"
                          onClick={() => onOpenTicketQuickPreview(ticket.id)}
                          title="Aperçu du ticket"
                        >
                          <PanelRightOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-md border border-blue-200/60 bg-blue-50/75 p-0 text-blue-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-blue-100/90 hover:text-blue-500 dark:border-blue-700/50 dark:bg-blue-900/35 dark:text-blue-300 dark:hover:bg-blue-900/55 dark:hover:text-blue-200"
                          onClick={() => onOpenTicketDetails(ticket.id)}
                          title="Ouvrir le détail complet"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {showDeletedTickets ? (
                          <>
                            {canManageTickets ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 rounded-md border border-emerald-200/60 bg-emerald-50/75 p-0 text-emerald-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-emerald-100/90 hover:text-emerald-500 dark:border-emerald-700/50 dark:bg-emerald-900/35 dark:text-emerald-300 dark:hover:bg-emerald-900/55 dark:hover:text-emerald-200"
                                  onClick={() => onRestoreTicket(ticket)}
                                  disabled={isRestoring || isDeletingPermanent}
                                  title={isRestoring ? 'Restauration en cours' : 'Restaurer'}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 rounded-md border border-red-200/60 bg-red-50/75 p-0 text-red-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-red-100/90 hover:text-red-500 dark:border-red-700/50 dark:bg-red-900/35 dark:text-red-300 dark:hover:bg-red-900/55 dark:hover:text-red-200"
                                  onClick={() => onRequestDeleteTicket(ticket, true)}
                                  disabled={isDeletingPermanent || isRestoring}
                                  title={isDeletingPermanent ? 'Suppression en cours' : 'Supprimer définitivement'}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                                  className="h-7 w-7 rounded-md border border-yellow-200/60 bg-yellow-50/75 p-0 text-yellow-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-yellow-100/90 hover:text-yellow-500 dark:border-yellow-700/50 dark:bg-yellow-900/35 dark:text-yellow-300 dark:hover:bg-yellow-900/55 dark:hover:text-yellow-200"
                                  onClick={() => onEditTicket(ticket)}
                                  disabled={isDeletingToTrash}
                                  title="Modifier le ticket"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 rounded-md border border-red-200/60 bg-red-50/75 p-0 text-red-600 shadow-sm backdrop-blur-[1px] transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-red-100/90 hover:text-red-500 dark:border-red-700/50 dark:bg-red-900/35 dark:text-red-300 dark:hover:bg-red-900/55 dark:hover:text-red-200"
                                  onClick={() => onRequestDeleteTicket(ticket, false)}
                                  disabled={isDeletingToTrash}
                                  title={isDeletingToTrash ? 'Suppression en cours' : 'Supprimer'}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
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