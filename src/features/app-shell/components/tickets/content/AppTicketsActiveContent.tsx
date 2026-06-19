import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, MouseEvent } from 'react';
import Link from 'next/link';

import { format } from 'date-fns';
import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';

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
  description?: string;
  reporterId?: string;
  reporterName?: string;
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
  currentUserId?: string;
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
  currentUserId,
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
  const viewedStorageKey = useMemo(
    () => (currentUserId ? `noc:tickets:viewed:${currentUserId}` : null),
    [currentUserId]
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [quickPreviewOpen, setQuickPreviewOpen] = useState(false);
  const [quickPreviewTicketId, setQuickPreviewTicketId] = useState<string | null>(null);
  const [quickPreviewMounted, setQuickPreviewMounted] = useState(false);
  const [viewedTicketIds, setViewedTicketIds] = useState<Set<string>>(new Set());
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

  const quickPreviewTicket = useMemo(
    () => visibleTickets.find((ticket) => ticket.id === quickPreviewTicketId) ?? null,
    [quickPreviewTicketId, visibleTickets]
  );

  const quickPreviewDescription = useMemo(() => {
    const raw = String(quickPreviewTicket?.description ?? '').trim();
    if (!raw) return '-';
    if (!/[<>]/.test(raw)) return raw;

    const normalized = raw
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n')
      .replace(/<\s*p[^>]*>/gi, '')
      .replace(/<\s*\/li\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return normalized || '-';
  }, [quickPreviewTicket?.description]);

  useEffect(() => {
    if (!viewedStorageKey || typeof window === 'undefined') {
      setViewedTicketIds(new Set());
      return;
    }

    try {
      const raw = window.localStorage.getItem(viewedStorageKey);
      if (!raw) {
        setViewedTicketIds(new Set());
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setViewedTicketIds(new Set());
        return;
      }

      const restored = parsed
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
      setViewedTicketIds(new Set(restored));
    } catch {
      setViewedTicketIds(new Set());
    }
  }, [viewedStorageKey]);

  const persistViewedTicketIds = useCallback((nextViewedIds: Set<string>) => {
    if (!viewedStorageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(viewedStorageKey, JSON.stringify(Array.from(nextViewedIds)));
  }, [viewedStorageKey]);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const syncViewedTicketsFromServer = async () => {
      try {
        const response = await fetch(`/api/tickets/views?userId=${encodeURIComponent(currentUserId)}`);
        if (!response.ok) return;

        const payload = await response.json() as { ticketIds?: unknown };
        const ticketIds = Array.isArray(payload.ticketIds)
          ? payload.ticketIds.map((value) => String(value ?? '').trim()).filter(Boolean)
          : [];

        if (cancelled || ticketIds.length === 0) return;

        setViewedTicketIds((prev) => {
          const next = new Set(prev);
          let changed = false;

          ticketIds.forEach((ticketId) => {
            if (!next.has(ticketId)) {
              next.add(ticketId);
              changed = true;
            }
          });

          if (changed) {
            persistViewedTicketIds(next);
            return next;
          }

          return prev;
        });
      } catch {
        // Keep local behavior if sync fails.
      }
    };

    void syncViewedTicketsFromServer();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, persistViewedTicketIds]);

  const markTicketAsViewed = useCallback((ticketId: string) => {
    if (!ticketId || !viewedStorageKey) return;
    setViewedTicketIds((prev) => {
      if (prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.add(ticketId);
      persistViewedTicketIds(next);
      return next;
    });

    if (!currentUserId) return;
    void fetch('/api/tickets/views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: currentUserId,
        ticketId,
      }),
    }).catch(() => {
      // UI stays optimistic and fast even if network write fails.
    });
  }, [currentUserId, persistViewedTicketIds, viewedStorageKey]);

  const isTicketUnread = useCallback((ticket: T) => {
    if (!currentUserId) return false;
    const creatorId = String(ticket.reporterId ?? '').trim();
    if (creatorId && creatorId === currentUserId) return false;
    return !viewedTicketIds.has(ticket.id);
  }, [currentUserId, viewedTicketIds]);

  const handleOpenTicketQuickPreview = useCallback((ticketId: string) => {
    setQuickPreviewOpen(true);
    setQuickPreviewTicketId(ticketId);
    markTicketAsViewed(ticketId);
  }, [markTicketAsViewed]);

  const handleOpenTicketDetailsFromList = useCallback((ticketId: string) => {
    markTicketAsViewed(ticketId);
    onOpenTicketDetails(ticketId);
  }, [markTicketAsViewed, onOpenTicketDetails]);

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [maxPage, page]);

  useEffect(() => {
    if (!quickPreviewOpen) {
      setQuickPreviewMounted(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setQuickPreviewMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [quickPreviewOpen, quickPreviewTicketId]);

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
        <div className="relative">
          {quickPreviewOpen ? (
            <div className="pointer-events-none absolute inset-0 z-15 hidden bg-linear-to-r from-transparent via-slate-900/5 to-slate-900/10 xl:block dark:via-slate-100/5 dark:to-slate-100/10" />
          ) : null}

          <div className="relative z-10">
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
              isQuickPreviewOpen={quickPreviewOpen}
              isTicketUnread={isTicketUnread}
              onOpenTicketQuickPreview={handleOpenTicketQuickPreview}
              onOpenTicketDetails={handleOpenTicketDetailsFromList}
              onOpenTrashContextMenu={onOpenTrashContextMenu}
              onRestoreTicket={onRestoreTicket}
              onRequestDeleteTicket={onRequestDeleteTicket}
              onEditTicket={onEditTicket}
              formatDateTime={(date) => format(date, 'dd/MM/yyyy HH:mm')}
            />
          </div>

          {quickPreviewOpen ? (
            <section className={`relative z-20 mt-3 overflow-visible rounded-3xl border border-white/50 bg-linear-to-br from-white/80 via-sky-50/70 to-indigo-50/70 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-300 ease-out dark:border-slate-700/60 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-800/80 xl:absolute xl:right-3 xl:top-20 xl:bottom-16 xl:mt-0 xl:max-h-none xl:w-108 xl:shadow-[0_26px_80px_-30px_rgba(15,23,42,0.7)] ${quickPreviewMounted ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-5 scale-[0.985]'}`}>
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/20" />
                <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/20" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="group absolute -left-1 top-4 z-30 h-10 w-11 -translate-x-7 rounded-l-2xl rounded-r-lg border border-white/50 bg-linear-to-br from-white/80 via-sky-50/70 to-indigo-50/70 p-0 text-slate-600 shadow-[0_18px_42px_-22px_rgba(15,23,42,0.58)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-[1.02] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/90 dark:text-slate-200 dark:shadow-[0_18px_42px_-22px_rgba(2,6,23,0.95)] xl:-left-2 xl:top-8 xl:-translate-x-8"
                onClick={() => setQuickPreviewOpen(false)}
                aria-label="Fermer l'aperçu"
              >
                <span className="pointer-events-none absolute -right-3 top-1/2 h-8 w-4 -translate-y-1/2 rounded-r-md border-y border-r border-white/50 bg-linear-to-br from-white/80 via-sky-50/70 to-indigo-50/70 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/90" />
                <X className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90 dark:group-hover:text-white" />
              </Button>

              <div className="relative z-10 xl:h-full xl:overflow-y-auto xl:pr-1">
                <div className="mb-4 flex items-start justify-between gap-3 pl-9 xl:pl-3">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 shadow-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-sky-300">
                      <Ticket className="h-3.5 w-3.5" />
                      Apercu express
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                      {quickPreviewTicket?.numero ?? 'Ticket'}
                    </p>
                  </div>
                </div>

                {quickPreviewTicket ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/60 bg-white/80 p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/65">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {quickPreviewTicket.objet}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <CircleGauge className="h-3.5 w-3.5" />
                          {statusStyles[quickPreviewTicket.status]?.label ?? quickPreviewTicket.status}
                        </span>
                        {quickPreviewTicket.priority ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {priorityStyles[quickPreviewTicket.priority]?.label ?? quickPreviewTicket.priority}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/80 p-3 text-[13px] text-indigo-900 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                        Fil recent
                      </p>
                      <p className="line-clamp-3 font-medium">{quickPreviewTicket.recentThread || '-'}</p>
                    </div>

                    <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/75 p-3 text-[13px] text-cyan-950 shadow-sm dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Description du ticket
                      </p>
                      <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed">
                        {quickPreviewDescription}
                      </p>
                    </div>

                    <div className="pt-1">
                      <Button
                        asChild
                        size="sm"
                        className="group relative h-10 w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-linear-to-r from-cyan-600 via-cyan-500 to-cyan-600 px-4 text-sm font-semibold text-white shadow-[0_14px_32px_-12px_rgba(8,145,178,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(8,145,178,0.9)] dark:border-cyan-300/30 dark:from-cyan-500 dark:via-cyan-400 dark:to-cyan-500 dark:text-slate-950"
                      >
                        <Link
                          href={`/tickets/${quickPreviewTicket.id}`}
                          onClick={() => markTicketAsViewed(quickPreviewTicket.id)}
                        >
                          <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-white/0 via-white/25 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <span className="relative inline-flex items-center gap-2">
                            Ouvrir le detail complet
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/70 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                    Selectionnez un ticket pour afficher son apercu premium.
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
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