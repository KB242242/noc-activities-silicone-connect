'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, Ticket, Eye, Folder, List, LayoutGrid, ArrowLeft, FolderOpen } from 'lucide-react';
import { format, getDate, getMonth } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface ArchiveDashboardTicket {
  id: string;
  numero: string;
  objet: string;
  status: string;
  site: string;
  localite: string;
  priority?: string;
  technicien?: string;
  sla?: string;
  archivedAt?: Date;
  archivedYear?: number;
  closedAt?: Date;
  createdAt: Date;
}

export interface ArchiveDashboardReport {
  totalArchived: number;
  slaSatisfied: number;
  slaRate: number;
  openInSelectedYear: number;
}

export interface ArchiveDashboardYearBucket {
  year: number;
  items: ArchiveDashboardTicket[];
}

type ViewMode = 'folders' | 'list' | 'grid';

interface Props {
  archiveYears: number[];
  archiveYearFilter: 'all' | string;
  archiveYearBuckets: ArchiveDashboardYearBucket[];
  archiveReport: ArchiveDashboardReport;
  onArchiveYearChange: (value: 'all' | string) => void;
  onBackToActive: () => void;
  onViewTicket: (ticketId: string) => void;
  onUnarchiveTicket: (ticketId: string) => void;
  statusBadge: (status: string) => { bgColor: string; color: string; label: string };
  statusOptions?: Array<{ key: string; label: string }>;
  ticketSiteOptions?: Array<{ id: string; name: string }>;
  ticketLocalityOptions?: string[];
  ticketTechnicianOptions?: Array<{ id: string; name: string }>;
  priorityOptions?: Array<{ key: string; label: string }>;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const ARCHIVE_QUICK_STATUS_FILTERS = [
  { key: 'closed', label: 'Archivé fermé' },
  { key: 'escalated', label: 'Archivé escaladé' },
  { key: 'pending', label: 'Archivé en attente' },
] as const;

export default function TicketArchiveDashboard({
  archiveYears,
  archiveYearFilter,
  archiveYearBuckets,
  archiveReport,
  onArchiveYearChange,
  onBackToActive,
  onViewTicket,
  onUnarchiveTicket,
  statusBadge,
  statusOptions = [],
  ticketSiteOptions = [],
  ticketLocalityOptions = [],
  ticketTechnicianOptions = [],
  priorityOptions = [],
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [navigationPath, setNavigationPath] = useState<string[]>([]);

  // Filtrer les tickets
  const filteredBuckets = useMemo(() => {
    return archiveYearBuckets.map((bucket) => ({
      ...bucket,
      items: bucket.items.filter((ticket) => {
        if (searchQuery && !ticket.numero.toLowerCase().includes(searchQuery.toLowerCase()) && !ticket.objet.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (siteFilter !== 'all' && ticket.site !== siteFilter) return false;
        if (localityFilter !== 'all' && ticket.localite !== localityFilter) return false;
        if (technicianFilter !== 'all' && ticket.technicien !== technicianFilter) return false;
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
        return true;
      }),
    }));
  }, [archiveYearBuckets, searchQuery, siteFilter, localityFilter, technicianFilter, statusFilter, priorityFilter]);

  const visibleYearBuckets = useMemo(() => filteredBuckets.filter((bucket) => bucket.items.length > 0), [filteredBuckets]);

  useEffect(() => {
    setNavigationPath([]);
  }, [archiveYearFilter, searchQuery, siteFilter, localityFilter, technicianFilter, statusFilter, priorityFilter]);

  // Obtenir les données du niveau actuel (années, mois, jours, tickets)
  const getCurrentLevelData = useMemo(() => {
    if (navigationPath.length === 0) {
      // Niveau Années
      return {
        level: 'years',
        items: visibleYearBuckets.map((bucket) => ({
          id: String(bucket.year),
          name: String(bucket.year),
          type: 'folder',
          count: bucket.items.length,
        })),
      };
    } else if (navigationPath.length === 1) {
      // Niveau Mois
      const year = parseInt(navigationPath[0]);
      const yearBucket = visibleYearBuckets.find((b) => b.year === year);
      const monthsData = new Map<number, { tickets: ArchiveDashboardTicket[] }>();

      (yearBucket?.items || []).forEach((ticket) => {
        const ticketDate = ticket.archivedAt || ticket.closedAt || ticket.createdAt;
        const month = getMonth(ticketDate);
        if (!monthsData.has(month)) {
          monthsData.set(month, { tickets: [] });
        }
        monthsData.get(month)!.tickets.push(ticket);
      });

      return {
        level: 'months',
        items: Array.from(monthsData.entries())
          .map(([month, data]) => ({
            id: `${month}`,
            name: MONTH_NAMES[month],
            type: 'folder',
            count: data.tickets.length,
          }))
          .sort((a, b) => parseInt(a.id) - parseInt(b.id)),
      };
    } else if (navigationPath.length === 2) {
      // Niveau Jours
      const year = parseInt(navigationPath[0]);
      const month = parseInt(navigationPath[1]);
      const yearBucket = visibleYearBuckets.find((b) => b.year === year);
      const daysData = new Map<number, { tickets: ArchiveDashboardTicket[] }>();

      (yearBucket?.items || []).forEach((ticket) => {
        const ticketDate = ticket.archivedAt || ticket.closedAt || ticket.createdAt;
        if (getMonth(ticketDate) === month) {
          const day = getDate(ticketDate);
          if (!daysData.has(day)) {
            daysData.set(day, { tickets: [] });
          }
          daysData.get(day)!.tickets.push(ticket);
        }
      });

      return {
        level: 'days',
        items: Array.from(daysData.entries())
          .map(([day, data]) => ({
            id: `${day}`,
            name: `${day} ${MONTH_NAMES[month]}`,
            type: 'folder',
            count: data.tickets.length,
          }))
          .sort((a, b) => parseInt(a.id) - parseInt(b.id)),
      };
    } else {
      // Niveau Tickets
      const year = parseInt(navigationPath[0]);
      const month = parseInt(navigationPath[1]);
      const day = parseInt(navigationPath[2]);
      const yearBucket = visibleYearBuckets.find((b) => b.year === year);

      const tickets = (yearBucket?.items || []).filter((ticket) => {
        const ticketDate = ticket.archivedAt || ticket.closedAt || ticket.createdAt;
        return getMonth(ticketDate) === month && getDate(ticketDate) === day;
      });

      return {
        level: 'tickets',
        items: tickets.map((ticket) => ({
          ...ticket,
          type: 'ticket',
        })),
      };
    }
  }, [navigationPath, visibleYearBuckets]);

  const openFolder = (folderId: string) => {
    setNavigationPath([...navigationPath, folderId]);
  };

  const goBack = () => {
    setNavigationPath(navigationPath.slice(0, -1));
  };

  const renderTicketRow = (ticket: ArchiveDashboardTicket) => {
    const badge = statusBadge(ticket.status);
    return (
      <div key={ticket.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</span>
            <Badge className={`${badge.bgColor} ${badge.color}`}>{badge.label}</Badge>
            <Badge variant="outline">SLA {ticket.sla || 'N/A'}</Badge>
          </div>
          <p className="mt-1 truncate font-medium text-foreground">{ticket.objet}</p>
          <p className="text-sm text-muted-foreground">
            {ticket.site || '-'} · {ticket.localite || '-'} {ticket.technicien ? `· ${ticket.technicien}` : ''} · Archivé le{' '}
            {ticket.archivedAt
              ? format(ticket.archivedAt, 'dd/MM/yyyy HH:mm')
              : ticket.closedAt
                ? format(ticket.closedAt, 'dd/MM/yyyy HH:mm')
                : format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewTicket(ticket.id)}>
            <Eye className="w-4 h-4 mr-2" /> Voir
          </Button>
          <Button variant="outline" size="sm" onClick={() => onUnarchiveTicket(ticket.id)}>
            <Archive className="w-4 h-4 mr-2" /> Désarchiver
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2 border-amber-300/70 bg-linear-to-br from-amber-50 via-white to-cyan-50 dark:border-amber-800/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-950">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Archive className="w-5 h-5 text-amber-600" /> Gestion des archives
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Filtre par année, rapport de traitement et désarchivage.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={archiveYearFilter} onValueChange={(value) => onArchiveYearChange(value)}>
              <SelectTrigger className="w-45 border-2 dark:border-slate-600 dark:bg-slate-800">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800">
                <SelectItem value="all">Toutes les années</SelectItem>
                {archiveYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onBackToActive}>
              <Ticket className="w-4 h-4 mr-2" /> Actifs
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="border bg-white/90 dark:bg-slate-900/80">
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Tickets archivés</div>
              <div className="text-2xl font-bold">{archiveReport.totalArchived}</div>
            </CardContent>
          </Card>
          <Card className="border bg-white/90 dark:bg-slate-900/80">
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">SLA respecté</div>
              <div className="text-2xl font-bold">{archiveReport.slaSatisfied}</div>
            </CardContent>
          </Card>
          <Card className="border bg-white/90 dark:bg-slate-900/80">
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Taux SLA</div>
              <div className="text-2xl font-bold">{archiveReport.slaRate}%</div>
            </CardContent>
          </Card>
          <Card className="border bg-white/90 dark:bg-slate-900/80">
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Tickets toujours ouverts</div>
              <div className="text-2xl font-bold">{archiveReport.openInSelectedYear}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="border dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filtres rapides archives</span>
              {ARCHIVE_QUICK_STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.key}
                  type="button"
                  variant={statusFilter === filter.key ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter((prev) => (prev === filter.key ? 'all' : filter.key))}
                >
                  {filter.label}
                </Button>
              ))}
              {statusFilter !== 'all' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                  Réinitialiser
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-6">
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="all">Tous statuts</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.key} value={status.key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.key} value={priority.key}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="all">Tous sites</SelectItem>
                  {ticketSiteOptions.map((site) => (
                    <SelectItem key={site.id} value={site.name}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={localityFilter} onValueChange={setLocalityFilter}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Localité" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="all">Toutes localités</SelectItem>
                  {ticketLocalityOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Technicien" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="all">Tous techniciens</SelectItem>
                  {ticketTechnicianOptions.map((tech) => (
                    <SelectItem key={tech.id} value={tech.name}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mode d'affichage */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mode d'affichage :</span>
          <Button
            variant={viewMode === 'folders' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('folders')}
            title="Affichage en dossiers"
          >
            <Folder className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            title="Affichage en liste"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            title="Affichage en grille"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        {/* Contenu */}
        {filteredBuckets.every((b) => b.items.length === 0) ? (
          <Card className="border-dashed bg-white/80 dark:bg-slate-900/70">
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune archive disponible pour cette période.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {viewMode === 'folders' ? (
              // Vue en dossiers Windows (par défaut)
              <div className="space-y-4">
                {/* Breadcrumb/Navigation Path */}
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNavigationPath([])}
                      className={navigationPath.length === 0 ? 'font-bold' : ''}
                    >
                      <Folder className="w-4 h-4 mr-2 text-amber-500" />
                      Archives
                    </Button>
                    {navigationPath.map((path, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-muted-foreground">/</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNavigationPath(navigationPath.slice(0, index + 1))}
                          className="text-foreground"
                        >
                          {index === 0
                            ? path
                            : index === 1
                              ? MONTH_NAMES[parseInt(path)]
                              : `${path} ${MONTH_NAMES[parseInt(navigationPath[1])]}`}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {navigationPath.length > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={goBack}
                      title="Retour au dossier parent"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Contenu (Dossiers ou Tickets) */}
                {getCurrentLevelData.items.length === 0 ? (
                  <Card className="border-dashed bg-white/80 dark:bg-slate-900/70">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Aucune archive disponible à ce niveau.
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {getCurrentLevelData.level === 'tickets' ? (
                      // Affichage des tickets
                      <div className="space-y-3">
                        {getCurrentLevelData.items.map((ticket: any) => renderTicketRow(ticket))}
                      </div>
                    ) : (
                      // Affichage des dossiers (années, mois, ou jours)
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border dark:border-slate-700">
                        {getCurrentLevelData.items.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => (item.type === 'folder' ? openFolder(item.id) : onViewTicket(item.id))}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors group cursor-pointer"
                            title={`${item.name}${item.count ? ` (${item.count} ticket${item.count > 1 ? 's' : ''})` : ''}`}
                          >
                            {item.type === 'folder' ? (
                              <>
                                <FolderOpen className="w-12 h-12 text-amber-400 group-hover:text-amber-500 drop-shadow-sm" />
                                <span className="text-xs text-center text-foreground line-clamp-2 max-w-18">{item.name}</span>
                                {item.count > 0 && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {item.count}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <>
                                <Ticket className="w-12 h-12 text-cyan-500 group-hover:text-cyan-600 drop-shadow-sm" />
                                <span className="text-xs text-center text-foreground line-clamp-2 max-w-18">{item.numero}</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : viewMode === 'list' ? (
              // Vue en liste
              <div className="space-y-4">
                {filteredBuckets.map((bucket) =>
                  bucket.items.length > 0 ? (
                    <div key={bucket.year}>
                      <h3 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        Archive {bucket.year}
                      </h3>
                      <div className="space-y-3 ml-6">{bucket.items.map((ticket) => renderTicketRow(ticket))}</div>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              // Vue en grille
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuckets.flatMap((bucket) =>
                  bucket.items.map((ticket) => {
                    const badge = statusBadge(ticket.status);
                    return (
                      <Card key={ticket.id} className="border dark:border-slate-700 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400 text-sm">
                              {ticket.numero}
                            </span>
                            <Badge className={`${badge.bgColor} ${badge.color} text-xs`}>{badge.label}</Badge>
                          </div>
                          <p className="font-medium text-foreground line-clamp-2">{ticket.objet}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.site || '-'} · {ticket.localite || '-'}
                          </p>
                          {ticket.technicien && (
                            <p className="text-xs text-muted-foreground">Technicien : {ticket.technicien}</p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => onViewTicket(ticket.id)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => onUnarchiveTicket(ticket.id)}
                            >
                              <Archive className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
