'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bug,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { loadFromStorage } from '@/lib/utils';

type ClientDownStatus = 'DOWN' | 'SUSPENDED' | 'RESTARTED' | 'INTERFACES_DOWN' | 'UP';
type TimeRange = 'today' | 'yesterday' | '7days' | '30days' | 'custom';
type MonitoringScope = 'down' | 'up' | 'all';

type MonitoringDrilldown = 'network' | 'clients' | 'alerts' | 'sla' | null;

type ClientIncident = {
  eventid: string;
  name: string;
  severity: number;
  severity_label: string;
  clock: number;
  acknowledged: boolean;
};

type DownEquipment = {
  id: number;
  code: string;
  status: string;
  type: string;
  model: string;
  serialNumber: string;
  imageUrl?: string | null;
  updated: Date;
};

interface NocMonitoringDashboardProps {
  initialScope?: MonitoringScope;
  drilldownKey?: MonitoringDrilldown;
}

interface DownClient {
  id_client: number;
  client_ref: string;
  client_name: string;
  logo_url: string | null;
  preferred_equipment_image_url?: string | null;
  service_type: string;
  status: string;
  monitor_status: ClientDownStatus;
  equipment_status: string;
  address: string | null;
  ip_client: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  total_equipments_count: number;
  equipment_types: string[];
  down_equipments_count: number;
  down_equipments: DownEquipment[];
  zabbix_hostid: string | null;
  zabbix_host_available: string | null;
  librenms_device_id: string | null;
  librenms_device_status: string | null;
  zabbix_incidents: ClientIncident[];
  incident_count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  downtime_seconds?: number;
  downtime_minutes: number;
  last_event_at: Date | null;
}

type ClientAssetOverride = {
  logoUrl?: string;
};

interface EventLog {
  id: string;
  timestamp: Date;
  client_name: string;
  event_type: ClientDownStatus;
  severity: number;
  message: string;
  resolution?: string;
  resolved_at?: Date;
}

interface StabilityMetric {
  client_name: string;
  uptime_percent: number;
  incidents_30days: number;
  mttr_minutes: number;
  status: 'stable' | 'unstable' | 'critical';
}

export function NocMonitoringDashboard({
  initialScope = 'down',
  drilldownKey = null,
}: NocMonitoringDashboardProps) {
  const router = useRouter();
  // ============================================
  // ÉTAT PRINCIPAL
  // ============================================
  const [downClients, setDownClients] = useState<DownClient[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [stabilityMetrics, setStabilityMetrics] = useState<StabilityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<MonitoringScope>(initialScope);

  // ============================================
  // FILTRES TABLEAU
  // ============================================
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'DOWN' | 'UP'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'downtime' | 'incidents' | 'name'>('downtime');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<25 | 50 | 100>(25);

  // ============================================
  // FILTRES JOURNAL
  // ============================================
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<ClientDownStatus | 'all'>('all');
  const [journalSearchQuery, setJournalSearchQuery] = useState('');

  // ============================================
  // DIALOGS
  // ============================================
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [stabilityDialogOpen, setStabilityDialogOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  const fetchDownClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/noc/monitoring/down-clients?limit=150&scope=${scope}&_=${Date.now()}`);
      const data = await response.json();
      const clientAssetOverrides = loadFromStorage<Record<string, ClientAssetOverride>>(
        'noc_client_asset_overrides',
        {}
      );

      if (data.success && data.downClients) {
        setDownClients(
          data.downClients.map((client: any) => ({
            id_client: client.id_client,
            client_ref: client.client_ref,
            client_name: client.client_name,
            logo_url: clientAssetOverrides[client.client_ref]?.logoUrl ?? client.logo_url ?? null,
            preferred_equipment_image_url: client.preferred_equipment_image_url ?? null,
            service_type: client.service_type,
            status: client.client_status,
            monitor_status: client.monitor_status,
            equipment_status: client.equipment_status,
            address: client.address,
            ip_client: client.ip_client,
            contact_email: client.contact_email,
            contact_phone: client.contact_phone,
            total_equipments_count: client.total_equipments_count ?? 0,
            equipment_types: client.equipment_types ?? [],
            down_equipments_count: client.down_equipments_count,
            down_equipments: client.down_equipments ?? [],
            zabbix_hostid: client.zabbix_hostid,
            zabbix_host_available: client.zabbix_host_available ?? null,
            librenms_device_id: client.librenms_device_id ?? null,
            librenms_device_status: client.librenms_device_status ?? null,
            zabbix_incidents: client.zabbix_incidents ?? [],
            incident_count: client.incident_count,
            severity: getSeverityFromIncidents(client.zabbix_incidents),
            downtime_seconds:
              typeof client.downtime_seconds === 'number'
                ? client.downtime_seconds
                : undefined,
            downtime_minutes:
              typeof client.downtime_minutes === 'number'
                ? client.downtime_minutes
                : calculateDowntime(client.updated_at),
            last_event_at: client.last_event_at ? new Date(client.last_event_at) : null,
          }))
        );

        // Génération des logs d'événements (dédupliqués par eventid)
        const logsByEventId = new Map<string, EventLog>();
        data.downClients.forEach((client: any) => {
          if (client.zabbix_incidents && client.zabbix_incidents.length > 0) {
            client.zabbix_incidents.forEach((incident: any, idx: number) => {
              const eventId = String(incident.eventid ?? `${client.id_client}-${idx}`);
              if (logsByEventId.has(eventId)) return;
              logsByEventId.set(eventId, {
                id: eventId,
                timestamp: new Date(incident.clock),
                client_name: client.client_name,
                event_type: getEventType(incident.severity),
                severity: incident.severity,
                message: incident.name,
                resolution: incident.acknowledged ? 'Acquitté' : undefined,
              });
            });
          }
        });
        setEventLogs(
          Array.from(logsByEventId.values()).sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
          )
        );
      }
    } catch (error) {
      console.error('Erreur chargement clients DOWN:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, [scope]);

  useEffect(() => {
    fetchDownClients();
  }, [fetchDownClients]);

  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);

  useEffect(() => {
    setStatusFilter((previous) => {
      if (scope === 'up') return 'UP';
      if (scope === 'down' && previous === 'UP') return 'all';
      return previous;
    });
  }, [scope]);

  useEffect(() => {
    if (!drilldownKey) return;

    if (drilldownKey === 'clients') {
      setScope('down');
    }

    if (drilldownKey === 'network' || drilldownKey === 'sla') {
      setScope('all');
      setStatusFilter('all');
    }

    if (drilldownKey === 'alerts') {
      setJournalDialogOpen(true);
      setTimeRange('today');
    }
  }, [drilldownKey]);

  // ============================================
  // FILTRAGE ET TRI
  // ============================================
  const filteredClients = useMemo(() => {
    return downClients.filter((client) => {
      const matchesScope =
        scope === 'all'
          ? true
          : scope === 'down'
          ? client.monitor_status !== 'UP'
          : client.monitor_status === 'UP';

      const matchesSearch =
        client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.client_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.ip_client ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.address ?? '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'UP'
          ? client.monitor_status === 'UP'
          : client.monitor_status !== 'UP';

      const matchesSeverity =
        severityFilter === 'all' || client.severity === severityFilter;

      return matchesScope && matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [downClients, scope, searchQuery, statusFilter, severityFilter]);

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients];
    if (sortBy === 'downtime') {
      sorted.sort((a, b) => b.downtime_minutes - a.downtime_minutes);
    } else if (sortBy === 'incidents') {
      sorted.sort((a, b) => b.incident_count - a.incident_count);
    } else {
      sorted.sort((a, b) => a.client_name.localeCompare(b.client_name));
    }
    return sorted;
  }, [filteredClients, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClients = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return sortedClients.slice(start, start + rowsPerPage);
  }, [safeCurrentPage, sortedClients, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [scope, searchQuery, statusFilter, severityFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  // ============================================
  // FILTRAGE JOURNAL
  // ============================================
  const getDateRange = useCallback(() => {
    const today = new Date();
    switch (timeRange) {
      case 'today':
        return { from: startOfDay(today), to: endOfDay(today) };
      case 'yesterday':
        return {
          from: startOfDay(subDays(today, 1)),
          to: endOfDay(subDays(today, 1)),
        };
      case '7days':
        return { from: startOfDay(subDays(today, 7)), to: endOfDay(today) };
      case '30days':
        return { from: startOfDay(subDays(today, 30)), to: endOfDay(today) };
      case 'custom':
        return {
          from: customDateFrom ? new Date(customDateFrom) : startOfDay(today),
          to: customDateTo ? new Date(customDateTo) : endOfDay(today),
        };
      default:
        return { from: startOfDay(today), to: endOfDay(today) };
    }
  }, [timeRange, customDateFrom, customDateTo]);

  const filteredLogs = useMemo(() => {
    const { from, to } = getDateRange();
    return eventLogs.filter((log) => {
      const matchesTime = log.timestamp >= from && log.timestamp <= to;
      const matchesType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;
      const matchesSearch =
        log.client_name.toLowerCase().includes(journalSearchQuery.toLowerCase()) ||
        log.message.toLowerCase().includes(journalSearchQuery.toLowerCase());

      return matchesTime && matchesType && matchesSearch;
    });
  }, [eventLogs, timeRange, customDateFrom, customDateTo, eventTypeFilter, journalSearchQuery, getDateRange]);

  // ============================================
  // CALCUL STABILITÉ
  // ============================================
  const calculateStability = useCallback(() => {
    const metrics: StabilityMetric[] = downClients.map((client) => {
      const incidents = eventLogs.filter((log) => log.client_name === client.client_name);
      const recentIncidents = incidents.filter((log) =>
        log.timestamp >= subDays(new Date(), 30)
      ).length;

      const avgMTTR =
        incidents.length > 0
          ? Math.round(
              incidents.reduce((sum, inc) => sum + (inc.resolved_at ? 15 : 0), 0) /
              incidents.length
            )
          : 0;

      let status: 'stable' | 'unstable' | 'critical' = 'stable';
      if (recentIncidents > 5) status = 'critical';
      else if (recentIncidents > 2) status = 'unstable';

      return {
        client_name: client.service_type === 'LIAISON' ? `[LIAISON] ${client.client_name}` : client.client_name,
        uptime_percent: 100 - (client.downtime_minutes / (30 * 24 * 60)) * 100,
        incidents_30days: recentIncidents,
        mttr_minutes: avgMTTR,
        status,
      };
    });
    setStabilityMetrics(metrics);
  }, [downClients, eventLogs]);

  useEffect(() => {
    if (downClients.length > 0) {
      calculateStability();
    }
  }, [downClients, calculateStability]);

  // ============================================
  // COMPOSANTS HELPERS
  // ============================================
  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      critical: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: <AlertTriangle className="w-4 h-4" />,
      },
      high: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      medium: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: <Zap className="w-4 h-4" />,
      },
      low: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: <AlertCircle className="w-4 h-4" />,
      },
    };
    return config[severity] || config.low;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'UP') return { label: 'UP', variant: 'default' };
    return { label: 'DOWN', variant: 'destructive' };
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'UP': return 'bg-emerald-600 text-white';
      case 'DOWN': return 'bg-red-600 text-white';
      case 'SUSPENDED': return 'bg-amber-600 text-white';
      case 'RESTARTED': return 'bg-blue-600 text-white';
      case 'INTERFACES_DOWN': return 'bg-orange-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const getPriorityLabel = (severity: DownClient['severity']) => {
    if (severity === 'critical') return { label: 'P1', color: 'bg-red-600 text-white' };
    if (severity === 'high') return { label: 'P2', color: 'bg-orange-500 text-white' };
    if (severity === 'medium') return { label: 'P3', color: 'bg-yellow-500 text-black' };
    return { label: 'P4', color: 'bg-slate-600 text-white' };
  };

  const getSeverityLabel = (severity: DownClient['severity']) => {
    const labels: Record<DownClient['severity'], string> = {
      critical: 'Critique',
      high: 'Haute',
      medium: 'Moyenne',
      low: 'Basse',
    };
    return labels[severity];
  };

  const formatDowntime = (minutes: number) => {
    if (minutes <= 0) return '0 min';
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    const chunks: string[] = [];
    if (days > 0) chunks.push(`${days}j`);
    if (hours > 0) chunks.push(`${hours}h`);
    if (mins > 0) chunks.push(`${mins}min`);
    return chunks.join(' ');
  };

  const openClientDetailPage = (client: DownClient, defaultGraph?: 'availability' | 'consumption') => {
    const query = new URLSearchParams();
    if (defaultGraph) query.set('graph', defaultGraph);
    const search = query.toString();
    router.push(`/monitoring/client/${client.id_client}${search ? `?${search}` : ''}`);
  };

  const getMonitoringLinks = (client: DownClient) => {
    const zabbixBase = process.env.NEXT_PUBLIC_ZABBIX_WEB_URL;
    const zabbixWebBase = (zabbixBase || '').trim() || '';
    const zabbixHostPath = `/zabbix.php?action=latest.view&hostids%5B0%5D=${client.zabbix_hostid ?? ''}`;

    const zabbixHost =
      client.zabbix_hostid
        ? zabbixWebBase
          ? `${zabbixWebBase.replace(/\/$/, '')}${zabbixHostPath}`
          : zabbixHostPath
        : null;

    return {
      zabbixHost,
    };
  };

  const openClientGraph = (client: DownClient, kind: 'availability' | 'consumption') => {
    openClientDetailPage(client, kind);
  };

  const openClientZabbixDetails = (client: DownClient) => {
    const links = getMonitoringLinks(client);
    if (!links.zabbixHost) {
      toast.info('Fiche Zabbix non mappée', {
        description: 'Redirection vers la page détail pour analyse locale.',
      });
      openClientDetailPage(client, 'availability');
      return;
    }
    window.open(links.zabbixHost, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      {/* ============================================
          HEADER + STATISTIQUES
          ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer border-red-300 bg-linear-to-br from-red-50 to-red-100/70 hover:from-red-100 hover:to-red-100 dark:border-red-800/70 dark:from-red-950/40 dark:to-red-900/30"
          onClick={() => {
            setScope('down');
            setStatusFilter('all');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Clients DOWN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-700 dark:text-red-100">
              {downClients.filter((client) => client.monitor_status !== 'UP').length}
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-300/80 mt-2">actuellement en panne</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer border-emerald-300 bg-linear-to-br from-emerald-50 to-emerald-100/70 hover:from-emerald-100 hover:to-emerald-100 dark:border-emerald-800/70 dark:from-emerald-950/40 dark:to-emerald-900/30"
          onClick={() => {
            setScope('up');
            setStatusFilter('UP');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Clients UP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-100">
              {downClients.filter((client) => client.monitor_status === 'UP').length}
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-2">supervision normale</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer border-orange-300 bg-linear-to-br from-orange-50 to-orange-100/70 hover:from-orange-100 hover:to-orange-100 dark:border-orange-800/70 dark:from-orange-950/40 dark:to-orange-900/30"
          onClick={() => {
            setScope('all');
            setStatusFilter('all');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Équipements DOWN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-700 dark:text-orange-100">
              {downClients.reduce((sum, c) => sum + c.down_equipments_count, 0)}
            </div>
            <p className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-2">en total</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer border-amber-300 bg-linear-to-br from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-100 dark:border-amber-800/70 dark:from-amber-950/40 dark:to-amber-900/30"
          onClick={() => {
            setJournalDialogOpen(true);
            setTimeRange('today');
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Incidents (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-700 dark:text-amber-100">
              {eventLogs.filter(
                (log) => log.timestamp >= subDays(new Date(), 1)
              ).length}
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-2">enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================
          TABLEAU CLIENTS DOWN
          ============================================ */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Clients/Équipements supervisés
              </CardTitle>
              <CardDescription>
                Vue NOC structurée: identité, statut, incidents, équipements en défaut et actions d'investigation.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lastRefreshed && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  màj {format(lastRefreshed, 'HH:mm:ss')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setJournalDialogOpen(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" /> Evenements
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStabilityDialogOpen(true);
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" /> Stabilité
              </Button>
              <Button
                variant={compactMode ? 'default' : 'outline'}
                size="sm"
                title="Mode compact"
                onClick={() => setCompactMode((v) => !v)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchDownClients();
                  toast.success('Données actualisées');
                }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="inline-flex rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/50 p-0.5 gap-0.5">
            <button
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${
                scope === 'down'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-red-500'
              }`}
              onClick={() => {
                setScope('down');
                if (statusFilter === 'UP') setStatusFilter('all');
              }}
            >
              ● DOWN
            </button>
            <button
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${
                scope === 'up'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
              }`}
              onClick={() => {
                setScope('up');
                setStatusFilter('UP');
              }}
            >
              ● UP
            </button>
            <button
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${
                scope === 'all'
                  ? 'bg-slate-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              onClick={() => setScope('all')}
            >
              Tous
            </button>
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Recherche</Label>
              <Input
                placeholder="Nom/IP/Ref client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="DOWN">DOWN</SelectItem>
                  <SelectItem value="UP">UP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Sévérité</Label>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sévérités</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tri</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="downtime">Par downtime</SelectItem>
                  <SelectItem value="incidents">Par incidents</SelectItem>
                  <SelectItem value="name">Par nom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 bg-background text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Page {safeCurrentPage}/{totalPages}</span>
              <span>•</span>
              <span>{sortedClients.length} résultat(s)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground">Lignes</label>
              <select
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number(event.target.value) as 25 | 50 | 100)}
                className="h-7 rounded-md border bg-background px-2 text-xs"
                aria-label="Nombre de lignes par page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="h-7 px-2"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                .map((page, idx, arr) => {
                  const previous = arr[idx - 1];
                  return (
                    <span key={`page-wrap-${page}`} className="flex items-center gap-1">
                      {previous != null && page - previous > 1 && <span className="px-0.5 text-muted-foreground">...</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 min-w-7 px-2 ${page === safeCurrentPage ? 'font-semibold' : ''}`}
                      >
                        {page}
                      </Button>
                    </span>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="h-7 px-2"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="border-b bg-linear-to-r from-slate-900 to-slate-800 text-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Client/Equip</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">IP</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Service</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Statut</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Priorité</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Équip.</th>
                  <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide">Downtime</th>
                  <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide sticky right-0 bg-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      {scope === 'down' ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-400">
                          <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <p className="font-semibold text-sm">Aucun incident actif</p>
                          <p className="text-xs text-muted-foreground">Tous les clients supervisés sont opérationnels</p>
                        </div>
                      ) : scope === 'up' ? (
                        <p className="text-muted-foreground text-sm">Aucun client UP détecté</p>
                      ) : (
                        <p className="text-muted-foreground text-sm">Aucun client trouvé</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client, index) => {
                    const rowBorderColor =
                      client.severity === 'critical'
                        ? 'border-l-red-600'
                        : client.severity === 'high'
                        ? 'border-l-orange-500'
                        : client.severity === 'medium'
                        ? 'border-l-yellow-400'
                        : client.monitor_status === 'UP'
                        ? 'border-l-emerald-500'
                        : 'border-l-slate-500';
                    const prio = getPriorityLabel(client.severity);
                    const statusCls = getStatusColorClass(client.monitor_status);
                    const cellPad = compactMode ? 'px-2 py-1' : 'px-3 py-2';
                    const equipmentLogo =
                      normalizeAssetPath(client.preferred_equipment_image_url) ??
                      normalizeAssetPath(client.down_equipments.find((equipment) => equipment.imageUrl)?.imageUrl ?? null);
                    const logoSrc = normalizeAssetPath(client.logo_url) ?? equipmentLogo ?? '/logo_sc_icon.png';
                    const initials = client.client_name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('') || 'CL';
                    return (
                    <tr
                      key={client.id_client}
                      className={`group border-b border-l-4 ${rowBorderColor} ${index % 2 === 0 ? 'bg-background' : 'bg-slate-50/35 dark:bg-slate-900/20'} hover:bg-slate-100/70 dark:hover:bg-slate-800/40 ${compactMode ? 'text-xs' : 'text-sm'}`}
                    >
                      <td className={cellPad}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border/70">
                            <AvatarImage
                              src={logoSrc}
                              alt={client.client_name}
                              onError={(event) => {
                                const img = event.currentTarget;
                                if (!img.src.endsWith('/logo_sc_icon.png')) {
                                  img.src = '/logo_sc_icon.png';
                                }
                              }}
                            />
                            <AvatarFallback className="text-[11px] font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium leading-tight">{client.client_name}</p>
                            {!compactMode && (
                              <p className="text-xs text-muted-foreground">Ref: {client.client_ref}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={cellPad}>
                        <p className={`font-semibold ${client.monitor_status === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {client.ip_client || '-'}
                        </p>
                        {!compactMode && (
                          <p className="text-xs text-muted-foreground truncate max-w-40">{client.address || '-'}</p>
                        )}
                      </td>
                      <td className={cellPad}>{client.service_type}</td>
                      <td className={cellPad}>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusCls}`}>
                          {getStatusBadge(client.monitor_status).label}
                        </span>
                      </td>
                      <td className={cellPad}>
                        <div className="inline-flex items-center gap-1">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${prio.color}`}>
                            {prio.label}
                          </span>
                          {!compactMode && (
                            <span className="text-xs text-muted-foreground">{getSeverityLabel(client.severity)}</span>
                          )}
                        </div>
                      </td>
                      <td className={cellPad}>
                        <p className="font-medium">
                          {client.down_equipments_count > 0
                            ? `${client.down_equipments_count}/${client.total_equipments_count}`
                            : '-'}
                        </p>
                        {!compactMode && (
                          <p className="text-xs text-muted-foreground truncate max-w-44">
                            {client.down_equipments_count > 0
                              ? client.equipment_types.length > 0
                                ? client.equipment_types.join(', ')
                                : 'Types inconnus'
                              : 'Aucun équipement down'}
                          </p>
                        )}
                      </td>
                      <td className={`${cellPad} font-medium tabular-nums`}>
                        {client.monitor_status === 'UP' ? '-' : formatDowntime(client.downtime_minutes)}
                      </td>
                      <td className={`${cellPad} text-right sticky right-0 bg-background/95 backdrop-blur-sm`}>
                        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/85 px-1 py-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Détails"
                            onClick={() => openClientDetailPage(client, 'availability')}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Investiguer"
                            onClick={() => openClientDetailPage(client, 'consumption')}
                            className="h-7 w-7 p-0"
                          >
                            <Bug className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Graphes disponibilité"
                            onClick={() => openClientGraph(client, 'availability')}
                            className="h-7 w-7 p-0"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Détails Zabbix"
                            onClick={() => openClientZabbixDetails(client)}
                            className="h-7 w-7 p-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>

      {/* ============================================
          JOURNAL DIALOG
          ============================================ */}
      <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Evenements
            </DialogTitle>
            <DialogDescription>
              Filtrez par plage temporelle, type d'événement et client
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="logs" className="w-full">
            <TabsList>
              <TabsTrigger value="logs">Événements</TabsTrigger>
              <TabsTrigger value="filters">Filtres</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              {/* Plage temporelle */}
              <div>
                <Label className="text-sm font-medium">Plage temporelle</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={timeRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('today')}
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant={timeRange === 'yesterday' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('yesterday')}
                  >
                    Hier
                  </Button>
                  <Button
                    variant={timeRange === '7days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('7days')}
                  >
                    7 derniers jours
                  </Button>
                  <Button
                    variant={timeRange === '30days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('30days')}
                  >
                    30 derniers jours
                  </Button>
                </div>
              </div>

              {/* Plage personnalisée */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">De</Label>
                  <Input
                    type="datetime-local"
                    value={customDateFrom}
                    onChange={(e) => {
                      setCustomDateFrom(e.target.value);
                      setTimeRange('custom');
                    }}
                  />
                </div>
                <div>
                  <Label className="text-sm">À</Label>
                  <Input
                    type="datetime-local"
                    value={customDateTo}
                    onChange={(e) => {
                      setCustomDateTo(e.target.value);
                      setTimeRange('custom');
                    }}
                  />
                </div>
              </div>

              {/* Filtres additionnels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Type d'événement</Label>
                  <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="DOWN">DOWN</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      <SelectItem value="RESTARTED">RESTARTED</SelectItem>
                      <SelectItem value="INTERFACES_DOWN">INTERFACES DOWN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Recherche</Label>
                  <Input
                    placeholder="Client, message..."
                    value={journalSearchQuery}
                    onChange={(e) => setJournalSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-2">
              <ScrollArea className="h-100 pr-4">
                {filteredLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Aucun événement pour cette plage
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`border-l-4 rounded-lg p-3 space-y-1 hover:bg-slate-800/40 ${
                          log.severity >= 4
                            ? 'border-l-red-600 bg-red-950/30'
                            : log.severity >= 3
                            ? 'border-l-orange-500 bg-orange-950/20'
                            : log.severity >= 2
                            ? 'border-l-yellow-400 bg-yellow-950/20'
                            : 'border-l-slate-500 bg-slate-900/30'
                        } ${log.resolution ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">
                              {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${
                              log.severity >= 4
                                ? 'bg-red-600 text-white'
                                : log.severity >= 3
                                ? 'bg-orange-500 text-white'
                                : log.severity >= 2
                                ? 'bg-yellow-500 text-black'
                                : 'bg-slate-600 text-white'
                            }`}>
                              {log.severity >= 4 ? 'P1' : log.severity >= 3 ? 'P2' : log.severity >= 2 ? 'P3' : 'P4'}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              log.event_type === 'DOWN'
                                ? 'bg-red-600 text-white'
                                : log.event_type === 'SUSPENDED'
                                ? 'bg-amber-600 text-white'
                                : log.event_type === 'RESTARTED'
                                ? 'bg-blue-600 text-white'
                                : 'bg-orange-600 text-white'
                            }`}>
                              {log.event_type}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{log.client_name}</p>
                          <p className="text-sm text-muted-foreground">{log.message}</p>
                        </div>
                        {log.resolution && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1">
                            ✓ {log.resolution}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ============================================
          STABILITÉ DIALOG
          ============================================ */}
      <Dialog open={stabilityDialogOpen} onOpenChange={setStabilityDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analyse de Stabilité
            </DialogTitle>
            <DialogDescription>
              Liaisons et clients les plus stables/instables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stables */}
            <div>
              <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Plus Stables
              </h3>
              <div className="space-y-2">
                {stabilityMetrics
                  .filter((m) => m.status === 'stable')
                  .slice(0, 5)
                  .map((metric) => (
                    <div
                      key={metric.client_name}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{metric.client_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {metric.incidents_30days} incidents en 30 jours
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {metric.uptime_percent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">uptime</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Instables */}
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Plus Instables
              </h3>
              <div className="space-y-2">
                {stabilityMetrics
                  .filter((m) => m.status === 'critical' || m.status === 'unstable')
                  .slice(0, 5)
                  .map((metric) => (
                    <div
                      key={metric.client_name}
                      className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{metric.client_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {metric.incidents_30days} incidents | MTTR: {metric.mttr_minutes}m
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {metric.uptime_percent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">uptime</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Liaisons */}
            <div>
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Liaisons les plus instables (service LIAISON)
              </h3>
              <div className="space-y-2">
                {stabilityMetrics
                  .filter((m) => m.status !== 'stable' && m.client_name.includes('[LIAISON]'))
                  .slice(0, 5)
                  .map((metric) => (
                    <div
                      key={metric.client_name}
                      className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{metric.client_name.replace('[LIAISON] ', '')}</p>
                        <p className="text-xs text-muted-foreground">
                          {metric.incidents_30days} incidents | MTTR: {metric.mttr_minutes}m
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{metric.uptime_percent.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground">uptime</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// FONCTIONS HELPER
// ============================================

function getSeverityFromIncidents(incidents: any[]): 'critical' | 'high' | 'medium' | 'low' {
  if (!incidents || incidents.length === 0) return 'low';
  const maxSeverity = Math.max(...incidents.map((i) => Number(i.severity)));
  if (maxSeverity >= 4) return 'critical';
  if (maxSeverity >= 3) return 'high';
  if (maxSeverity >= 2) return 'medium';
  return 'low';
}

function getEventType(severity: number): ClientDownStatus {
  if (severity >= 4) return 'DOWN';
  if (severity === 3) return 'INTERFACES_DOWN';
  if (severity === 2) return 'SUSPENDED';
  return 'RESTARTED';
}

function calculateDowntime(lastUpdate: string): number {
  const now = new Date().getTime();
  const lastTime = new Date(lastUpdate).getTime();
  return Math.floor((now - lastTime) / (1000 * 60));
}

function normalizeAssetPath(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }

  let normalized = raw.replace(/\\/g, '/');

  // Convert absolute filesystem paths ending in /public/... to web-served paths.
  const publicIndex = normalized.toLowerCase().lastIndexOf('/public/');
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + '/public'.length);
  }
  if (normalized.startsWith('/public/')) {
    normalized = normalized.replace(/^\/public\//, '/');
  } else if (normalized.startsWith('public/')) {
    normalized = `/${normalized.slice('public/'.length)}`;
  } else if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
}

function getLibreNmsBadge(status: string | null): { label: string; className: string } {
  if (status === null) {
    return { label: 'N/A', className: 'bg-slate-600 text-white' };
  }
  if (status === '1') {
    return { label: 'UP', className: 'bg-emerald-600 text-white' };
  }
  return { label: 'DOWN', className: 'bg-red-600 text-white' };
}
