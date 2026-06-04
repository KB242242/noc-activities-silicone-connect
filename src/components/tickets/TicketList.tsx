'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Filter, RefreshCw, Eye, Edit2, Trash2, RotateCcw,
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  AlertCircle, Clock, CheckCircle2, ArrowUpRight, ListFilter, X,
} from 'lucide-react';
import { format, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  NocTicket, NocTicketType, NocTicketStatus, NocTicketPriority,
  TICKET_TYPE_CONFIG, TICKET_STATUS_CONFIG, TICKET_PRIORITY_CONFIG,
} from './types';

// ── Types ─────────────────────────────────────────────────────

type SortField = 'numero' | 'objet' | 'type' | 'status' | 'priority' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

interface Filters {
  search: string;
  status: string;
  priority: string;
  type: string;
  tech: string;
  site: string;
  locality: string;
  dateFrom: string;
  dateTo: string;
}

interface OptionItem {
  id: string;
  name: string;
}

interface Props {
  user: { id: string; name: string; email: string; role: string };
  isEditor: boolean;
  isSuperAdmin: boolean;
  initialSearch?: string;
  refreshKey: number;
  isTrash: boolean;
  onView: (ticket: NocTicket) => void;
  onEdit: (ticket: NocTicket) => void;
  onNew: () => void;
  onRefresh: () => void;
}

const PAGE_SIZES = [10, 25, 50];

// ── Helpers ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NocTicketStatus }) {
  const cfg = TICKET_STATUS_CONFIG[status] ?? TICKET_STATUS_CONFIG.OPEN;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.border} border`}
      style={{ color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: NocTicketPriority }) {
  const cfg = TICKET_PRIORITY_CONFIG[priority] ?? TICKET_PRIORITY_CONFIG.MEDIUM;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cfg.bg}`}
      style={{ color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: NocTicketType }) {
  const cfg = TICKET_TYPE_CONFIG[type] ?? TICKET_TYPE_CONFIG.INC;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cfg.bg} ${cfg.border} border`}
      style={{ color: cfg.color }}
    >
      {type}
    </span>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="inline w-3 h-3 ml-1 text-indigo-400" />
    : <ChevronDown className="inline w-3 h-3 ml-1 text-indigo-400" />;
}

// ── Main Component ─────────────────────────────────────────────

export default function TicketList({
  user, isEditor, isSuperAdmin, initialSearch = '', refreshKey,
  isTrash, onView, onEdit, onNew, onRefresh,
}: Props) {
  const [tickets, setTickets] = useState<NocTicket[]>([]);
  const [sites, setSites] = useState<OptionItem[]>([]);
  const [localities, setLocalities] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: initialSearch, status: '', priority: '', type: '', tech: '', site: '', locality: '', dateFrom: '', dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteConfirm, setDeleteConfirm] = useState<NocTicket | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<NocTicket | null>(null);

  // ── Fetch ──────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('trash', String(isTrash));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.type) params.set('type', filters.type);
      if (filters.tech) params.set('tech', filters.tech);
      if (filters.site) params.set('site', filters.site);
      if (filters.locality) params.set('locality', filters.locality);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await fetch(`/api/tickets/list?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur lors du chargement des tickets');
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : data.tickets ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  }, [isTrash, filters]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [siteRes, localityRes] = await Promise.all([
        fetch('/api/tickets/sites'),
        fetch('/api/tickets/localities'),
      ]);

      if (siteRes.ok) {
        const siteData = await siteRes.json();
        setSites(
          Array.isArray(siteData)
            ? siteData.map((item: { id?: string; name?: string }) => ({
                id: String(item.id ?? item.name ?? ''),
                name: String(item.name ?? '').trim(),
              })).filter((item: OptionItem) => item.id && item.name)
            : []
        );
      }

      if (localityRes.ok) {
        const localityData = await localityRes.json();
        setLocalities(
          Array.isArray(localityData)
            ? localityData.map((item: { id?: string; name?: string }) => ({
                id: String(item.id ?? item.name ?? ''),
                name: String(item.name ?? '').trim(),
              })).filter((item: OptionItem) => item.id && item.name)
            : []
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch on filter change, isTrash change, or when refreshKey is bumped (after mutations)
  useEffect(() => { fetchTickets(); }, [fetchTickets, refreshKey, isTrash]);
  // Fetch filter options once on mount
  useEffect(() => { fetchFilterOptions(); }, []);
  useEffect(() => { setPage(1); }, [filters, sort]);

  // ── Sort + paginate ────────────────────────────────────────

  const sorted = useMemo(() => {
    return [...tickets].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sort.field) {
        case 'numero':    va = a.numero;    vb = b.numero;    break;
        case 'objet':     va = a.objet;     vb = b.objet;     break;
        case 'type':      va = a.type;      vb = b.type;      break;
        case 'status':    va = a.status;    vb = b.status;    break;
        case 'priority':  va = a.priority;  vb = b.priority;  break;
        case 'createdAt': va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); break;
        case 'updatedAt': va = new Date(a.updatedAt).getTime(); vb = new Date(b.updatedAt).getTime(); break;
      }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: SortField) => {
    setSort((prev) => prev.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    );
  };

  // ── Actions ────────────────────────────────────────────────

  const handleDelete = async (ticket: NocTicket, permanent = false) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permanent, deletedBy: user.name }),
      });
      if (!res.ok) throw new Error();
      toast.success(permanent ? 'Ticket supprimé définitivement' : 'Ticket déplacé dans la corbeille');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
    setDeleteConfirm(null);
  };

  const handleRestore = async (ticket: NocTicket) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Ticket restauré');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la restauration');
    }
    setRestoreConfirm(null);
  };

  const clearFilters = () => setFilters({
    search: '', status: '', priority: '', type: '', tech: '', site: '', locality: '', dateFrom: '', dateTo: '',
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // ── Render ─────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-6 space-y-4 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {isTrash ? 'Corbeille' : 'Gestion des Tickets'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Chargement…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowFilters((s) => !s); }}>
              <ListFilter className="w-4 h-4 mr-1.5" />
              Filtres
              {hasActiveFilters && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-indigo-500 inline-block" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {!isTrash && isEditor && (
              <Button size="sm" onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Nouveau Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher numéro, objet, client, technicien…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />
          {filters.search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setFilters((p) => ({ ...p, search: '' }))}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-3">
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((p) => ({ ...p, status: v === 'all' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="OPEN">Ouvert</SelectItem>
                  <SelectItem value="PENDING">En Attente</SelectItem>
                  <SelectItem value="ESCALATED">Escaladé</SelectItem>
                  <SelectItem value="CLOSED">Fermé</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.priority}
                onValueChange={(v) => setFilters((p) => ({ ...p, priority: v === 'all' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Priorité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  <SelectItem value="CRITICAL">Critique</SelectItem>
                  <SelectItem value="HIGH">Élevé</SelectItem>
                  <SelectItem value="MEDIUM">Moyen</SelectItem>
                  <SelectItem value="LOW">Faible</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type}
                onValueChange={(v) => setFilters((p) => ({ ...p, type: v === 'all' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {(Object.keys(TICKET_TYPE_CONFIG) as NocTicketType[]).map((t) => (
                    <SelectItem key={t} value={t}>{t} — {TICKET_TYPE_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.site || 'all'}
                onValueChange={(v) => setFilters((p) => ({ ...p, site: v === 'all' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.locality || 'all'}
                onValueChange={(v) => setFilters((p) => ({ ...p, locality: v === 'all' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Localité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les localités</SelectItem>
                  {localities.map((locality) => (
                    <SelectItem key={locality.id} value={locality.name}>{locality.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Date début"
                value={filters.dateFrom}
                onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              />
              <Input
                type="date"
                placeholder="Date fin"
                value={filters.dateTo}
                onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              />

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" /> Effacer
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {([
                    ['numero', 'Numéro'],
                    ['type', 'Type'],
                    ['objet', 'Objet'],
                    ['status', 'Statut'],
                    ['priority', 'Priorité'],
                    ['createdAt', 'Créé le'],
                    ['updatedAt', 'Mis à jour'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                      onClick={() => toggleSort(field)}
                    >
                      {label}
                      <SortIcon field={field} sort={sort} />
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Chargement des tickets…
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      {isTrash ? 'La corbeille est vide' : 'Aucun ticket trouvé'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-3 py-3 font-mono text-xs text-indigo-400 whitespace-nowrap">
                        {ticket.numero}
                      </td>
                      <td className="px-3 py-3">
                        <TypeBadge type={ticket.type} />
                      </td>
                      <td className="px-3 py-3 max-w-56">
                        <button
                          className="text-left font-medium hover:text-indigo-400 transition-colors line-clamp-2 leading-tight"
                          onClick={() => onView(ticket)}
                        >
                          {ticket.objet}
                        </button>
                        {ticket.clients && ticket.clients.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {ticket.clients.map((c) => c.name).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isTrash ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300"
                                    onClick={() => setRestoreConfirm(ticket)}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restaurer</TooltipContent>
                              </Tooltip>
                              {isSuperAdmin && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                                      onClick={() => setDeleteConfirm(ticket)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Supprimer définitivement</TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => onView(ticket)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(ticket)}>
                                    <ArrowUpRight className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir detail</TooltipContent>
                              </Tooltip>
                              {isEditor && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => onEdit(ticket)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Modifier</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                                    onClick={() => setDeleteConfirm(ticket)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mettre à la corbeille</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && sorted.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lignes par page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="h-7 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground mr-2">
                  {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} / {sorted.length}
                </span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Delete confirm dialog */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isTrash ? 'Supprimer définitivement ?' : 'Mettre à la corbeille ?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isTrash
                  ? `Le ticket ${deleteConfirm?.numero} sera supprimé définitivement et ne pourra pas être récupéré.`
                  : `Le ticket ${deleteConfirm?.numero} sera déplacé dans la corbeille. Il sera automatiquement supprimé après 30 jours.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm, isTrash)}
              >
                {isTrash ? 'Supprimer définitivement' : 'Mettre à la corbeille'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore confirm dialog */}
        <AlertDialog open={!!restoreConfirm} onOpenChange={(o) => { if (!o) setRestoreConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurer le ticket ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le ticket {restoreConfirm?.numero} sera restauré dans la liste principale.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => restoreConfirm && handleRestore(restoreConfirm)}>
                Restaurer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
