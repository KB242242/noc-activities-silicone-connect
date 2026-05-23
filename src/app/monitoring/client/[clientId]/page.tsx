'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMinutes,
  subMonths,
  subYears,
} from 'date-fns';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import * as QRCode from 'qrcode';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  FileSpreadsheet,
  FileUp,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Network,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Ticket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { buildIncidentModel } from '@/lib/noc/incidentModel';

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
};

type ClientData = {
  id_client: number;
  client_ref: string;
  client_name: string;
  service_type: string;
  client_status: string;
  monitor_status: 'DOWN' | 'SUSPENDED' | 'RESTARTED' | 'INTERFACES_DOWN' | 'UP';
  equipment_status: string;
  address: string | null;
  ip_client: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  updated_at: string;
  total_equipments_count: number;
  equipment_types: string[];
  down_equipments_count: number;
  down_equipments: DownEquipment[];
  bandwidth_mbps?: number | null;
  zabbix_hostid: string | null;
  zabbix_incidents: ClientIncident[];
  incident_count: number;
};

type FocusedGraph = 'realtime' | 'availability' | 'consumption';
type GraphVisualMode = 'curve' | 'columns';

type ZabbixSourceMeta = {
  configured: boolean;
  live: boolean;
  mappedHostIds: number;
  fetchedProblems: number;
  fetchedHosts: number;
  error: string | null;
};

type PeriodKey =
  | 'last_5m'
  | 'last_15m'
  | 'last_30m'
  | 'last_1h'
  | 'last_3h'
  | 'last_6h'
  | 'last_12h'
  | 'last_1d'
  | 'last_2d'
  | 'last_7d'
  | 'last_30d'
  | 'last_3mo'
  | 'last_6mo'
  | 'last_1y'
  | 'last_2y'
  | 'today'
  | 'today_until_now'
  | 'yesterday'
  | 'day_before_yesterday'
  | 'same_day_last_week'
  | 'this_week'
  | 'this_week_until_now'
  | 'previous_week'
  | 'this_month'
  | 'this_month_until_now'
  | 'previous_month'
  | 'this_year'
  | 'this_year_until_now'
  | 'previous_year';

type HistoryPeriodKey = '6h' | '1d' | '1w' | '1m' | '1y';

type HistorySnapshot = {
  clientId: number;
  clientName: string;
  serviceType: string;
  timestamp: number;
  availability: number;
  consumption: number;
  incidentCount: number;
  downEquipments: number;
  monitorStatus: string;
  subscribedBandwidthMbps: number;
};

type HistoryAlert = {
  timestamp: number;
  level: 'warning' | 'critical';
  type: 'overconsumption' | 'anomaly';
  message: string;
};

type RealtimeTrafficPoint = {
  label: string;
  usage: number;
};

type RealTrafficPoint = {
  ts: number;
  label: string;
  inMbps: number | null;
  outMbps: number | null;
};

type RealEvent = {
  eventid: string;
  ts: number;
  label: string;
  type: 'DOWN' | 'UP';
  name: string;
  severity: number;
  durationSec: number | null;
  acknowledged: boolean;
};

type TrafficMeta = {
  source: 'zabbix' | 'none';
  currentInMbps: number | null;
  currentOutMbps: number | null;
  realDowntimeSec: number | null;
  itemCount: number;
};

type ConnectivityCheckResult = {
  target: string;
  checkedAt: string;
  ping: {
    reachable: boolean;
    sent: number;
    received: number;
    lost: number;
    lossPercent: number;
    avgMs: number | null;
  };
  equipmentHttp2021: {
    reachable: boolean;
    httpStatus: number | null;
  };
  diagnosis: {
    liaisonReachable: boolean;
    equipmentReachable: boolean;
    status: 'ok' | 'liaison_down' | 'equipment_down' | 'unknown';
    message: string;
  };
};

type QuickConclusionProbe = {
  id: string;
  label: string;
  target: string;
  kind: 'internet' | 'core' | 'equipment';
  reachable: boolean;
  inconclusive?: boolean;
  failureType?: 'none' | 'timeout' | 'local_route' | 'name_resolution' | 'unknown';
  sent: number;
  received: number;
  lost: number;
  lossPercent: number;
  avgMs: number | null;
  note: string;
};

type TemperatureSensor = { name: string; value: number; unit: string };

type TemperatureProbe = {
  source: 'zabbix' | 'librenms' | 'none';
  available: boolean;
  sensors: TemperatureSensor[];
  maxTemp: number | null;
  overheating: boolean;
};

type QuickConclusionResult = {
  checkedAt: string;
  browserOnline: boolean | null;
  overallStatus: 'ok' | 'degraded' | 'critical';
  probes: QuickConclusionProbe[];
  probeExecution?: {
    source: 'noc-server';
    inconclusive: boolean;
  };
  equipmentHttp2021: {
    reachable: boolean;
    httpStatus: number | null;
  };
  temperatureProbe?: TemperatureProbe;
};

type ClientIntervention = {
  title: string;
  intervention_type: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  technician_name: string | null;
  ticket_ref: string | null;
  notes: string | null;
};

type ClientWorkingHour = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
};

type ClientHoliday = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  notes: string | null;
};

const WORKING_DAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

function sortWorkingHours(entries: ClientWorkingHour[]): ClientWorkingHour[] {
  return [...entries].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }
    return left.startTime.localeCompare(right.startTime);
  });
}

function isDateWithinHoliday(date: Date, holiday: ClientHoliday): boolean {
  const current = format(date, 'yyyy-MM-dd');
  return current >= holiday.startDate && current <= holiday.endDate;
}

function isNowWithinWorkingHours(date: Date, entries: ClientWorkingHour[]): boolean {
  const weekday = date.getDay();
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return entries.some((entry) => {
    if (entry.dayOfWeek !== weekday) return false;
    const [startHour, startMinute] = entry.startTime.split(':').map(Number);
    const [endHour, endMinute] = entry.endTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  });
}

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'last_2d', label: '2 derniers jours' },
  { key: 'last_7d', label: '7 derniers jours' },
  { key: 'last_30d', label: '30 derniers jours' },
  { key: 'last_3mo', label: '3 derniers mois' },
  { key: 'last_6mo', label: '6 derniers mois' },
  { key: 'last_1y', label: 'Derniere 1 annee' },
  { key: 'last_2y', label: '2 dernieres annees' },
  { key: 'yesterday', label: 'Hier' },
  { key: 'day_before_yesterday', label: 'Avant-hier' },
  { key: 'same_day_last_week', label: 'Ce jour la semaine derniere' },
  { key: 'previous_week', label: 'Semaine precedente' },
  { key: 'previous_month', label: 'Mois precedent' },
  { key: 'previous_year', label: 'Annee precedente' },
  { key: 'today', label: 'Aujourd hui' },
  { key: 'today_until_now', label: 'Aujourd hui jusqu a present' },
  { key: 'this_week', label: 'Cette semaine' },
  { key: 'this_week_until_now', label: 'Cette semaine jusqu a present' },
  { key: 'this_month', label: 'Ce mois-ci' },
  { key: 'this_month_until_now', label: 'Ce mois-ci jusqu a present' },
  { key: 'this_year', label: 'Cette annee' },
  { key: 'this_year_until_now', label: 'Cette annee jusqu a present' },
  { key: 'last_5m', label: 'Dernieres 5 minutes' },
  { key: 'last_15m', label: 'Dernieres 15 minutes' },
  { key: 'last_30m', label: 'Dernieres 30 minutes' },
  { key: 'last_1h', label: 'Derniere 1 heure' },
  { key: 'last_3h', label: '3 dernieres heures' },
  { key: 'last_6h', label: '6 dernieres heures' },
  { key: 'last_12h', label: '12 dernieres heures' },
  { key: 'last_1d', label: 'Dernier 1 jour' },
];

function getPresetRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case 'last_5m':
      return { start: subMinutes(now, 5), end: now };
    case 'last_15m':
      return { start: subMinutes(now, 15), end: now };
    case 'last_30m':
      return { start: subMinutes(now, 30), end: now };
    case 'last_1h':
      return { start: subHours(now, 1), end: now };
    case 'last_3h':
      return { start: subHours(now, 3), end: now };
    case 'last_6h':
      return { start: subHours(now, 6), end: now };
    case 'last_12h':
      return { start: subHours(now, 12), end: now };
    case 'last_1d':
      return { start: subDays(now, 1), end: now };
    case 'last_2d':
      return { start: subDays(now, 2), end: now };
    case 'last_7d':
      return { start: subDays(now, 7), end: now };
    case 'last_30d':
      return { start: subDays(now, 30), end: now };
    case 'last_3mo':
      return { start: subMonths(now, 3), end: now };
    case 'last_6mo':
      return { start: subMonths(now, 6), end: now };
    case 'last_1y':
      return { start: subYears(now, 1), end: now };
    case 'last_2y':
      return { start: subYears(now, 2), end: now };
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'today_until_now':
      return { start: startOfDay(now), end: now };
    case 'yesterday': {
      const d = subDays(now, 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case 'day_before_yesterday': {
      const d = subDays(now, 2);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case 'same_day_last_week': {
      const d = subDays(now, 7);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_week_until_now':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case 'previous_week': {
      const prev = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return {
        start: startOfWeek(prev, { weekStartsOn: 1 }),
        end: endOfWeek(prev, { weekStartsOn: 1 }),
      };
    }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_month_until_now':
      return { start: startOfMonth(now), end: now };
    case 'previous_month': {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'this_year_until_now':
      return { start: startOfYear(now), end: now };
    case 'previous_year': {
      const prev = subYears(now, 1);
      return { start: startOfYear(prev), end: endOfYear(prev) };
    }
    default:
      return { start: subDays(now, 1), end: now };
  }
}

function toHistoryPeriodKey(period: PeriodKey): HistoryPeriodKey {
  if (period === 'last_5m' || period === 'last_15m' || period === 'last_30m' || period === 'last_1h' || period === 'last_3h' || period === 'last_6h') {
    return '6h';
  }
  if (period === 'last_12h' || period === 'last_1d' || period === 'today' || period === 'today_until_now' || period === 'yesterday' || period === 'day_before_yesterday' || period === 'same_day_last_week') {
    return '1d';
  }
  if (period === 'last_2d' || period === 'last_7d' || period === 'this_week' || period === 'this_week_until_now' || period === 'previous_week') {
    return '1w';
  }
  if (period === 'last_30d' || period === 'last_3mo' || period === 'last_6mo' || period === 'this_month' || period === 'this_month_until_now' || period === 'previous_month') {
    return '1m';
  }
  return '1y';
}

function formatDowntime(lastUpdate: string): string {
  const now = Date.now();
  const lastTime = new Date(lastUpdate).getTime();
  const minutes = Math.max(0, Math.floor((now - lastTime) / (1000 * 60)));
  if (minutes <= 0) return '0 min';

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}min`);
  return parts.join(' ');
}

function formatReportDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'dd/MM/yyyy HH:mm:ss');
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '< 1 min';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}min`);
  return parts.join(' ');
}

function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    0: 'Non classifié', 1: 'Info', 2: 'Attention', 3: 'Moyen', 4: 'Élevé', 5: 'Désastre',
  };
  return labels[severity] ?? 'Inconnu';
}

export default function MonitoringClientDetailPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();

  const clientId = Number(params.clientId);
  const graphQuery = searchParams.get('graph');
  const initialGraph: FocusedGraph =
    graphQuery === 'consumption'
      ? 'consumption'
      : graphQuery === 'availability'
      ? 'availability'
      : 'realtime';

  const [focusedGraph, setFocusedGraph] = useState<FocusedGraph>(initialGraph);
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [clientCatalog, setClientCatalog] = useState<Array<Pick<ClientData, 'id_client' | 'client_name' | 'client_ref'>>>([]);
  const [zabbixSource, setZabbixSource] = useState<ZabbixSourceMeta | null>(null);
  const [analysisPeriod, setAnalysisPeriod] = useState<PeriodKey>('today_until_now');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [comparePeriod, setComparePeriod] = useState<PeriodKey>('previous_week');
  const [excludePressureMetric, setExcludePressureMetric] = useState(false);
  const [historySeries, setHistorySeries] = useState<HistorySnapshot[]>([]);
  const [compareSeries, setCompareSeries] = useState<HistorySnapshot[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<HistoryAlert[]>([]);
  const [showIncidentChart, setShowIncidentChart] = useState(false);
  const [graphVisualMode, setGraphVisualMode] = useState<GraphVisualMode>('curve');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('global');
  const [realtimeTraffic, setRealtimeTraffic] = useState<RealtimeTrafficPoint[]>([]);
  const [realTrafficPoints, setRealTrafficPoints] = useState<RealTrafficPoint[]>([]);
  const [zabbixEvents, setZabbixEvents] = useState<RealEvent[]>([]);
  const [trafficMeta, setTrafficMeta] = useState<TrafficMeta | null>(null);
  const [isTrafficLoading, setIsTrafficLoading] = useState(false);
  const [showEventsPanel, setShowEventsPanel] = useState(true);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [compareRangeStart, setCompareRangeStart] = useState('');
  const [compareRangeEnd, setCompareRangeEnd] = useState('');
  const [connectivityResult, setConnectivityResult] = useState<ConnectivityCheckResult | null>(null);
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false);
  const [quickConclusionResult, setQuickConclusionResult] = useState<QuickConclusionResult | null>(null);
  const [isRunningQuickConclusion, setIsRunningQuickConclusion] = useState(false);
  const [continuousPingEnabled, setContinuousPingEnabled] = useState(false);
  const [interventions, setInterventions] = useState<ClientIntervention[]>([]);
  const [isInterventionsLoading, setIsInterventionsLoading] = useState(false);
  const [workingHours, setWorkingHours] = useState<ClientWorkingHour[]>([]);
  const [holidays, setHolidays] = useState<ClientHoliday[]>([]);
  const [isLoadingClientCalendar, setIsLoadingClientCalendar] = useState(false);
  const [isSavingClientCalendar, setIsSavingClientCalendar] = useState(false);
  const [showClientCalendarPanel, setShowClientCalendarPanel] = useState(false);
  const [workingHourForm, setWorkingHourForm] = useState({ dayOfWeek: '1', startTime: '08:00', endTime: '17:00', label: '' });
  const [holidayForm, setHolidayForm] = useState({ title: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const equipmentIp = client?.ip_client?.trim() ?? '';
  const [viewStartIndex, setViewStartIndex] = useState(0);
  const [viewSpan, setViewSpan] = useState(48);
  const [reportFormat, setReportFormat] = useState<'pdf' | 'pptx'>('pdf');
  const [reportScope, setReportScope] = useState<'consumption' | 'availability' | 'both' | 'incidents'>('both');
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [equipmentAccessState, setEquipmentAccessState] = useState<'idle' | 'checking' | 'ready' | 'offline' | 'unreachable' | 'error'>('idle');
  const [equipmentAccessMessage, setEquipmentAccessMessage] = useState('');
  const [equipmentAccessCheckedAt, setEquipmentAccessCheckedAt] = useState<string | null>(null);
  const [detailsSections, setDetailsSections] = useState({ incidents: false, downEquipments: false, interventions: false });
  const [showInvestigationServices, setShowInvestigationServices] = useState(false);
  const [graphContextMenu, setGraphContextMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const [isDraggingChart, setIsDraggingChart] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const incidentChartRef = useRef<HTMLDivElement | null>(null);
  const availabilityReportChartRef = useRef<HTMLDivElement | null>(null);
  const consumptionReportChartRef = useRef<HTMLDivElement | null>(null);
  const incidentsReportChartRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ dragging: boolean; startX: number; startY: number; baseStart: number; baseSpan: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    baseStart: 0,
    baseSpan: 48,
  });
  const touchStateRef = useRef<{ mode: 'pan' | 'pinch' | null; startX: number; startY: number; startDistance: number; baseStart: number; baseSpan: number }>({
    mode: null,
    startX: 0,
    startY: 0,
    startDistance: 0,
    baseStart: 0,
    baseSpan: 48,
  });

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarGroupOpen, setSidebarGroupOpen] = useState<Record<string, boolean>>({ noc: true });
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [sidebarWidth] = useState(240);

  const isDarkTheme = (resolvedTheme ?? theme ?? 'light') === 'dark';

  const graphPalette = useMemo(() => {
    const accent = focusedGraph === 'availability'
      ? isDarkTheme
        ? '#22c55e'
        : '#059669'
      : focusedGraph === 'consumption'
      ? isDarkTheme
        ? '#f59e0b'
        : '#d97706'
      : isDarkTheme
      ? '#22d3ee'
      : '#0891b2';

    return {
      accent,
      compare: isDarkTheme ? '#f59e0b' : '#d97706',
      realtimeInStart: isDarkTheme ? '#22d3ee' : '#0891b2',
      realtimeInEnd: isDarkTheme ? '#0ea5e9' : '#0369a1',
      realtimeOutStart: isDarkTheme ? '#c084fc' : '#7c3aed',
      realtimeOutEnd: isDarkTheme ? '#8b5cf6' : '#6d28d9',
      availability: isDarkTheme ? '#34d399' : '#059669',
      consumption: isDarkTheme ? '#22d3ee' : '#0284c7',
      cardClass: isDarkTheme
        ? 'rounded-2xl border border-slate-700/70 bg-[linear-gradient(140deg,rgba(15,23,42,0.97),rgba(15,23,42,0.9))] p-5 space-y-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.9)]'
        : 'rounded-2xl border border-slate-200 bg-[linear-gradient(150deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 space-y-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.35)]',
      chartShellClass: isDarkTheme
        ? 'relative h-104 w-full overflow-hidden rounded-[1.35rem] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.94))] p-4 shadow-[0_26px_80px_-44px_rgba(2,132,199,0.55)] cursor-grab select-none touch-none'
        : 'relative h-104 w-full overflow-hidden rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(241,245,249,0.98))] p-4 shadow-[0_26px_80px_-46px_rgba(2,132,199,0.28)] cursor-grab select-none touch-none',
      secondaryChartClass: isDarkTheme
        ? 'h-72 w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.86))] p-2 shadow-[0_18px_52px_-38px_rgba(2,132,199,0.45)] cursor-grab select-none touch-none'
        : 'h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(241,245,249,0.9))] p-2 shadow-[0_18px_52px_-38px_rgba(15,23,42,0.28)] cursor-grab select-none touch-none',
      chipSurfaceClass: isDarkTheme
        ? 'inline-flex w-full rounded-xl border border-white/10 bg-slate-950/55 p-1 text-xs backdrop-blur'
        : 'inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 text-xs backdrop-blur',
      buttonIdleClass: isDarkTheme ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950',
      buttonSelectedTextClass: isDarkTheme ? 'text-slate-950' : 'text-white',
      outlineButtonClass: isDarkTheme
        ? 'border-white/15 bg-slate-900/55 text-slate-100 hover:bg-slate-800/75'
        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100',
      axisTick: isDarkTheme ? '#cbd5e1' : '#334155',
      grid: isDarkTheme ? '#1e293b' : '#cbd5e1',
      legendTextClass: isDarkTheme ? 'text-slate-300' : 'text-slate-600',
      menuClass: isDarkTheme
        ? 'fixed z-50 min-w-50 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-[0_24px_80px_-42px_rgba(2,132,199,0.55)] backdrop-blur'
        : 'fixed z-50 min-w-50 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur',
      menuButtonClass: isDarkTheme
        ? 'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800'
        : 'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100',
    };
  }, [focusedGraph, isDarkTheme]);

  const loadClient = async () => {
    if (!clientId || Number.isNaN(clientId)) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/noc/monitoring/down-clients?limit=1000&scope=all');
      const data = await response.json();
      if (!data.success || !Array.isArray(data.downClients)) {
        throw new Error('Réponse monitoring invalide');
      }

      setClientCatalog(
        data.downClients.map((item: ClientData) => ({
          id_client: Number(item.id_client),
          client_name: item.client_name,
          client_ref: item.client_ref,
        }))
      );

      setZabbixSource((data.source?.zabbix as ZabbixSourceMeta | undefined) ?? null);

      const found = data.downClients.find((item: ClientData) => Number(item.id_client) === clientId) ?? null;
      setClient(found);
      if (!found) {
        toast.warning('Client introuvable dans le monitoring', {
          description: 'Le client demandé n\'existe plus ou n\'est pas visible avec la source courante.',
        });
      }
    } catch (error) {
      console.error('Monitoring client detail error:', error);
      toast.error('Erreur de chargement du détail client');
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFocusedGraph(initialGraph);
  }, [initialGraph]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  useEffect(() => {
    const preset = getPresetRange(analysisPeriod);
    setRangeStart(format(preset.start, "yyyy-MM-dd'T'HH:mm"));
    setRangeEnd(format(preset.end, "yyyy-MM-dd'T'HH:mm"));
  }, [analysisPeriod]);

  useEffect(() => {
    if (!compareEnabled) return;
    const preset = getPresetRange(comparePeriod);
    setCompareRangeStart(format(preset.start, "yyyy-MM-dd'T'HH:mm"));
    setCompareRangeEnd(format(preset.end, "yyyy-MM-dd'T'HH:mm"));
  }, [compareEnabled, comparePeriod]);

  useEffect(() => {
    if (excludePressureMetric && focusedGraph === 'consumption') {
      setFocusedGraph('availability');
    }
  }, [excludePressureMetric, focusedGraph]);

  const model = useMemo(() => {
    if (!client) return null;
    return buildIncidentModel({
      service_type: client.service_type,
      monitor_status: client.monitor_status,
      equipment_status: client.equipment_status,
      total_equipments_count: client.total_equipments_count,
      down_equipments_count: client.down_equipments_count,
      incidents: client.zabbix_incidents.map((incident) => ({
        clock: Number(incident.clock),
        severity: Number(incident.severity),
      })),
    });
  }, [client, zabbixSource]);

  useEffect(() => {
    if (!client || !model) return;

    const persistSnapshot = async () => {
      try {
        await fetch('/api/noc/monitoring/client-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id_client,
            clientName: client.client_name,
            serviceType: client.service_type,
            availability: Number(model.averageAvailability.toFixed(2)),
            consumption: Number(model.peakPressure.toFixed(2)),
            incidentCount: client.incident_count,
            downEquipments: client.down_equipments_count,
            monitorStatus: client.monitor_status,
            subscribedBandwidthMbps:
              typeof client.bandwidth_mbps === 'number' && client.bandwidth_mbps > 0
                ? client.bandwidth_mbps
                : undefined,
          }),
        });
      } catch (error) {
        console.error('Persist history snapshot failed:', error);
      }
    };

    persistSnapshot();
  }, [
    client?.id_client,
    client?.client_name,
    client?.service_type,
    client?.incident_count,
    client?.down_equipments_count,
    client?.monitor_status,
    model?.averageAvailability,
    model?.peakPressure,
  ]);

  useEffect(() => {
    if (!client) return;

    const loadHistory = async () => {
      try {
        const query = new URLSearchParams({
          clientId: String(client.id_client),
          period: toHistoryPeriodKey(analysisPeriod),
          comparePeriod: toHistoryPeriodKey(comparePeriod),
          compareEnabled: compareEnabled ? '1' : '0',
        });

        if (rangeStart) query.set('startDate', new Date(rangeStart).toISOString());
        if (rangeEnd) query.set('endDate', new Date(rangeEnd).toISOString());
        if (compareEnabled && compareRangeStart) {
          query.set('compareStartDate', new Date(compareRangeStart).toISOString());
        }
        if (compareEnabled && compareRangeEnd) {
          query.set('compareEndDate', new Date(compareRangeEnd).toISOString());
        }

        const response = await fetch(`/api/noc/monitoring/client-history?${query.toString()}`);
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Erreur chargement historique');
        }

        setHistorySeries(Array.isArray(data.current) ? data.current : []);
        setCompareSeries(Array.isArray(data.compare) ? data.compare : []);
        setHistoryAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      } catch (error) {
        console.error('Load history failed:', error);
      }
    };

    loadHistory();
  }, [client?.id_client, analysisPeriod, compareEnabled, comparePeriod, rangeStart, rangeEnd, compareRangeStart, compareRangeEnd]);

  const loadTrafficData = async () => {
    const hostid = client?.zabbix_hostid;
    if (!hostid) return;
    setIsTrafficLoading(true);
    try {
      const query = new URLSearchParams({
        hostid,
        period: toHistoryPeriodKey(analysisPeriod),
      });

      if (rangeStart) query.set('from', new Date(rangeStart).toISOString());
      if (rangeEnd) query.set('to', new Date(rangeEnd).toISOString());

      const response = await fetch(
        `/api/noc/monitoring/client-traffic?${query.toString()}`
      );
      const data = await response.json() as {
        success: boolean;
        source?: string;
        traffic?: RealTrafficPoint[];
        events?: RealEvent[];
        currentInMbps?: number | null;
        currentOutMbps?: number | null;
        realDowntimeSec?: number | null;
        itemCount?: number;
      };
      if (data.success) {
        const traffic = Array.isArray(data.traffic) ? data.traffic : [];
        setRealTrafficPoints(traffic);
        if (traffic.length > 0) setRealtimeTraffic([]);
        setZabbixEvents(Array.isArray(data.events) ? data.events : []);
        setTrafficMeta({
          source: data.source === 'zabbix' ? 'zabbix' : 'none',
          currentInMbps: data.currentInMbps ?? null,
          currentOutMbps: data.currentOutMbps ?? null,
          realDowntimeSec: data.realDowntimeSec ?? null,
          itemCount: data.itemCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Load traffic error:', error);
    } finally {
      setIsTrafficLoading(false);
    }
  };

  const loadConnectivity = async () => {
    const ip = client?.ip_client?.trim();
    if (!ip) {
      toast.error('Adresse IP client indisponible pour le test de connectivite.');
      return;
    }

    setIsCheckingConnectivity(true);
    try {
      const response = await fetch(`/api/noc/monitoring/connectivity-check?ip=${encodeURIComponent(ip)}&count=3`);
      const data = await response.json() as { success: boolean; error?: string } & ConnectivityCheckResult;
      if (!data.success) {
        throw new Error(data.error ?? 'Verification de connectivite echouee');
      }
      setConnectivityResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de verification de connectivite');
    } finally {
      setIsCheckingConnectivity(false);
    }
  };

  const runQuickConclusion = async () => {
    if (!equipmentIp || !client) {
      toast.error('Client ou adresse IP indisponible pour la conclusion rapide.');
      return;
    }

    setIsRunningQuickConclusion(true);
    try {
      const response = await fetch('/api/noc/monitoring/quick-conclusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: equipmentIp,
          browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : null,
          hostid: client.zabbix_hostid ?? null,
        }),
      });

      const data = await response.json() as { success: boolean; error?: string } & QuickConclusionResult;
      if (!data.success) {
        throw new Error(data.error ?? 'Conclusion rapide indisponible');
      }

      setQuickConclusionResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la conclusion rapide');
    } finally {
      setIsRunningQuickConclusion(false);
    }
  };

  const checkEquipmentAccess = async (ip: string) => {
    setEquipmentAccessState('checking');
    setEquipmentAccessMessage('Verification de la connectivite en cours...');
    try {
      const response = await fetch(`/api/noc/monitoring/connectivity-check?ip=${encodeURIComponent(ip)}&count=2`);
      const data = await response.json() as { success: boolean; error?: string } & ConnectivityCheckResult;

      if (!data.success) {
        throw new Error(data.error ?? 'Verification de connectivite echouee');
      }

      setConnectivityResult(data);
      setEquipmentAccessCheckedAt(data.checkedAt);

      if (!data.ping.reachable) {
        setEquipmentAccessState('offline');
        setEquipmentAccessMessage('Liaison internet indisponible ou route vers le site distante coupee.');
        return;
      }

      if (!data.equipmentHttp2021.reachable) {
        setEquipmentAccessState('unreachable');
        setEquipmentAccessMessage('Equipement distant injoignable sur le port 2021 (service WebFig indisponible).');
        return;
      }

      setEquipmentAccessState('ready');
      setEquipmentAccessMessage('Connexion etablie avec succes.');
    } catch (error) {
      setEquipmentAccessState('error');
      setEquipmentAccessMessage(error instanceof Error ? error.message : 'Erreur reseau lors de la connexion a l equipement.');
    }
  };

  const loadClientInterventions = async () => {
    if (!client?.client_ref) return;

    setIsInterventionsLoading(true);
    setIsLoadingClientCalendar(true);
    try {
      const response = await fetch(`/api/noc/client-profile?clientRef=${encodeURIComponent(client.client_ref)}`);
      const data = await response.json() as {
        success: boolean;
        profile?: {
          interventions?: ClientIntervention[];
          workingHours?: ClientWorkingHour[];
          holidays?: ClientHoliday[];
        };
      };

      if (data.success) {
        setInterventions(Array.isArray(data.profile?.interventions) ? data.profile?.interventions ?? [] : []);
        setWorkingHours(sortWorkingHours(Array.isArray(data.profile?.workingHours) ? data.profile?.workingHours ?? [] : []));
        setHolidays(Array.isArray(data.profile?.holidays) ? data.profile?.holidays ?? [] : []);
      }
    } catch (error) {
      console.error('Load interventions failed:', error);
    } finally {
      setIsInterventionsLoading(false);
      setIsLoadingClientCalendar(false);
    }
  };

  const saveWorkingHour = async () => {
    if (!client?.client_ref) return;
    if (!workingHourForm.startTime || !workingHourForm.endTime) {
      toast.error('Heure de début et heure de fin requises.');
      return;
    }

    setIsSavingClientCalendar(true);
    try {
      const response = await fetch('/api/noc/client-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRef: client.client_ref,
          action: 'working-hour',
          payload: {
            dayOfWeek: Number(workingHourForm.dayOfWeek),
            startTime: workingHourForm.startTime,
            endTime: workingHourForm.endTime,
            label: workingHourForm.label || null,
          },
        }),
      });
      const data = await response.json() as { success: boolean; error?: string; workingHours?: ClientWorkingHour[] };
      if (!data.success) {
        throw new Error(data.error ?? 'Enregistrement des horaires impossible');
      }

      setWorkingHours(sortWorkingHours(data.workingHours ?? []));
      setWorkingHourForm((previous) => ({ ...previous, label: '' }));
      toast.success('Plage de travail enregistrée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de sauvegarde des horaires');
    } finally {
      setIsSavingClientCalendar(false);
    }
  };

  const saveHoliday = async () => {
    if (!client?.client_ref) return;
    if (!holidayForm.title.trim()) {
      toast.error('Le libellé du congé est requis.');
      return;
    }

    setIsSavingClientCalendar(true);
    try {
      const response = await fetch('/api/noc/client-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRef: client.client_ref,
          action: 'holiday',
          payload: {
            title: holidayForm.title,
            startDate: holidayForm.startDate,
            endDate: holidayForm.endDate,
            notes: holidayForm.notes || null,
          },
        }),
      });
      const data = await response.json() as { success: boolean; error?: string; holidays?: ClientHoliday[] };
      if (!data.success) {
        throw new Error(data.error ?? 'Enregistrement du congé impossible');
      }

      setHolidays(data.holidays ?? []);
      setHolidayForm({ title: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      toast.success('Période de congé enregistrée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de sauvegarde du congé');
    } finally {
      setIsSavingClientCalendar(false);
    }
  };

  const deleteClientCalendarEntry = async (kind: 'working-hour' | 'holiday', id: number) => {
    if (!client?.client_ref) return;

    setIsSavingClientCalendar(true);
    try {
      const response = await fetch('/api/noc/client-calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientRef: client.client_ref, kind, id }),
      });
      const data = await response.json() as {
        success: boolean;
        error?: string;
        workingHours?: ClientWorkingHour[];
        holidays?: ClientHoliday[];
      };
      if (!data.success) {
        throw new Error(data.error ?? 'Suppression impossible');
      }

      if (kind === 'working-hour') {
        setWorkingHours(sortWorkingHours(data.workingHours ?? []));
      } else {
        setHolidays(data.holidays ?? []);
      }
      toast.success('Entrée supprimée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de suppression');
    } finally {
      setIsSavingClientCalendar(false);
    }
  };

  useEffect(() => {
    if (!client?.zabbix_hostid) return;
    void loadTrafficData();
    const interval = setInterval(() => void loadTrafficData(), 30_000);
    return () => clearInterval(interval);
  }, [client?.zabbix_hostid, analysisPeriod, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!client?.client_ref) return;
    void loadClientInterventions();
  }, [client?.client_ref]);

  useEffect(() => {
    setQuickConclusionResult(null);
  }, [client?.id_client, selectedEquipmentId]);

  useEffect(() => {
    if (!continuousPingEnabled || !client?.ip_client) return;
    void loadConnectivity();
    const interval = setInterval(() => void loadConnectivity(), 8_000);
    return () => clearInterval(interval);
  }, [continuousPingEnabled, client?.ip_client]);

  const chartSeries = useMemo(() => {
    const fallback =
      model?.timeline.map((point, index) => ({
        clientId: client?.id_client ?? 0,
        clientName: client?.client_name ?? '',
        serviceType: client?.service_type ?? '',
        timestamp: Date.now() - ((model?.timeline.length ?? 0) - index) * 60 * 60 * 1000,
        availability: point.availability,
        consumption: point.pressure,
        incidentCount: point.incidents,
        downEquipments: client?.down_equipments_count ?? 0,
        monitorStatus: client?.monitor_status ?? 'UP',
        subscribedBandwidthMbps: 20,
      })) ?? [];

    const current = historySeries.length > 0 ? historySeries : fallback;
    const previous = compareEnabled ? compareSeries : [];
    const maxLen = Math.max(current.length, previous.length, 1);

    return Array.from({ length: maxLen }, (_, index) => {
      const currentPoint = current[current.length - maxLen + index] ?? null;
      const comparePoint = previous[previous.length - maxLen + index] ?? null;
      const displayTs = currentPoint?.timestamp ?? comparePoint?.timestamp ?? Date.now();

      return {
        timestamp: displayTs,
        label: format(new Date(displayTs), maxLen <= 24 ? 'dd/MM HH:mm' : 'dd/MM'),
        availability: currentPoint?.availability ?? null,
        compareAvailability: comparePoint?.availability ?? null,
        consumption: currentPoint?.consumption ?? null,
        compareConsumption: comparePoint?.consumption ?? null,
      };
    });
  }, [client, compareEnabled, compareSeries, historySeries, model]);

  const activeGraphPointCount = useMemo(() => {
    if (focusedGraph === 'realtime') return realTrafficPoints.length;
    return chartSeries.length;
  }, [chartSeries.length, focusedGraph, realTrafficPoints.length]);

  useEffect(() => {
    const length = activeGraphPointCount;
    if (length <= 0) return;
    const defaultSpan = focusedGraph === 'realtime'
      ? Math.max(18, Math.min(length, Math.floor(length * 0.5)))
      : Math.max(8, Math.min(length, Math.floor(length * 0.6)));
    setViewSpan(defaultSpan);
    setViewStartIndex(Math.max(0, length - defaultSpan));
  }, [activeGraphPointCount, analysisPeriod, compareEnabled, focusedGraph]);

  const visibleChartSeries = useMemo(() => {
    const total = chartSeries.length;
    if (total <= 0) return [];
    const span = Math.max(8, Math.min(viewSpan, total));
    const maxStart = Math.max(0, total - span);
    const start = Math.max(0, Math.min(viewStartIndex, maxStart));
    return chartSeries.slice(start, start + span);
  }, [chartSeries, viewSpan, viewStartIndex]);

  const periodStats = useMemo(() => {
    const validCurrent = chartSeries.filter((point) => typeof point.availability === 'number');
    const validCompare = chartSeries.filter((point) => typeof point.compareAvailability === 'number');

    const average = (values: number[]) =>
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

    const currentAvailabilityAvg = average(validCurrent.map((point) => Number(point.availability)));
    const currentConsumptionAvg = average(
      chartSeries
        .filter((point) => typeof point.consumption === 'number')
        .map((point) => Number(point.consumption))
    );

    const compareAvailabilityAvg = average(validCompare.map((point) => Number(point.compareAvailability)));
    const compareConsumptionAvg = average(
      chartSeries
        .filter((point) => typeof point.compareConsumption === 'number')
        .map((point) => Number(point.compareConsumption))
    );

    return {
      currentAvailabilityAvg,
      currentConsumptionAvg,
      compareAvailabilityAvg,
      compareConsumptionAvg,
      overconsumptionCount: chartSeries.filter((point) => Number(point.consumption ?? 0) >= 85).length,
    };
  }, [chartSeries]);

  const selectedPeriodLabel = useMemo(
    () => PERIOD_OPTIONS.find((entry) => entry.key === analysisPeriod)?.label ?? analysisPeriod,
    [analysisPeriod]
  );

  const selectedCompareLabel = useMemo(
    () => PERIOD_OPTIONS.find((entry) => entry.key === comparePeriod)?.label ?? comparePeriod,
    [comparePeriod]
  );

  const availabilityDomain = useMemo(() => {
    const values = visibleChartSeries
      .flatMap((point) => [point.availability, point.compareAvailability])
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) return [60, 100] as [number, number];
    const min = Math.max(0, Math.floor(Math.min(...values) - 4));
    const max = Math.min(100, Math.ceil(Math.max(...values) + 4));
    return [min, Math.max(min + 5, max)] as [number, number];
  }, [visibleChartSeries]);

  const consumptionDomain = useMemo(() => {
    const values = visibleChartSeries
      .flatMap((point) => [point.consumption, point.compareConsumption])
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) return [0, 100] as [number, number];
    const max = Math.min(100, Math.ceil(Math.max(...values) + 8));
    return [0, Math.max(20, max)] as [number, number];
  }, [visibleChartSeries]);

  const equipmentOptions = useMemo(() => {
    const options = [{ id: 'global', label: client?.client_name || 'Client sélectionné' }];
    if (!client) return options;
    for (const equipment of client.down_equipments) {
      options.push({ id: String(equipment.id), label: `${equipment.code} (${equipment.type})` });
    }
    return options;
  }, [client]);

  const selectedEquipmentDown = useMemo(() => {
    if (!client) return false;
    if (selectedEquipmentId === 'global') {
      return client.down_equipments_count > 0;
    }
    return client.down_equipments.some((equipment) => String(equipment.id) === selectedEquipmentId);
  }, [client, selectedEquipmentId]);

  const realtimeAnimationEnabled = !selectedEquipmentDown;

  useEffect(() => {
    if (!client) return;
    if (realTrafficPoints.length > 0) return; // Données Zabbix réelles disponibles
    if (selectedEquipmentDown) return;

    const bandwidth = Number(client.bandwidth_mbps ?? 0) > 0 ? Number(client.bandwidth_mbps) : 20;
    const incidentPressure = Math.min(18, client.incident_count * 2.2);
    const infraPressure = client.total_equipments_count > 0
      ? (client.down_equipments_count / client.total_equipments_count) * 24
      : 0;
    const base = Math.max(8, Math.min(85, periodStats.currentConsumptionAvg * 0.75 + incidentPressure + infraPressure));

    let tick = 0;
    const interval = setInterval(() => {
      tick += 1;
      const equipmentIndex = Math.max(0, equipmentOptions.findIndex((entry) => entry.id === selectedEquipmentId));
      const equipmentBias = selectedEquipmentId === 'global' ? 0 : (equipmentIndex % 6) * 1.5;
      const waveA = Math.sin(tick / 3.4) * 10;
      const waveB = Math.sin(tick / 1.6) * 3.8;
      const noise = (Math.random() - 0.5) * 3;
      const cutPenalty = selectedEquipmentDown ? 14 : 0;
      const value = Math.max(1, Math.min(100, base + equipmentBias + waveA + waveB + noise - cutPenalty));

      setRealtimeTraffic((previous) => {
        const next = [
          ...previous,
          {
            label: format(new Date(), 'HH:mm:ss'),
            usage: Number(value.toFixed(2)),
          },
        ];
        return next.slice(-90);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [client, equipmentOptions, periodStats.currentConsumptionAvg, selectedEquipmentDown, selectedEquipmentId, realTrafficPoints.length]);

  const currentOperatingContext = useMemo(() => {
    const now = new Date();
    const activeHoliday = holidays.find((holiday) => isDateWithinHoliday(now, holiday)) ?? null;
    const inWorkingHours = isNowWithinWorkingHours(now, workingHours);

    return {
      activeHoliday,
      inWorkingHours,
      hasConfiguredWorkingHours: workingHours.length > 0,
    };
  }, [holidays, workingHours]);

  const quickConclusionNarrative = useMemo(() => {
    if (!quickConclusionResult || !client) return null;

    const internetProbe = quickConclusionResult.probes.find((probe) => probe.id === 'internet');
    const equipmentProbe = quickConclusionResult.probes.find((probe) => probe.id === 'equipment');
    const coreProbes = quickConclusionResult.probes.filter((probe) => probe.kind === 'core');
    const reachableCores = coreProbes.filter((probe) => probe.reachable);
    const downCores = coreProbes.filter((probe) => !probe.reachable && !probe.inconclusive);
    const inconclusiveProbes = quickConclusionResult.probeExecution?.inconclusive === true;
    // Use only the client-level status for the narrative, not selectedEquipmentDown
    // (selectedEquipmentDown reflects a single equipment selection, not the client overall).
    const metricDown = client.monitor_status !== 'UP';
    const saturated = periodStats.currentConsumptionAvg >= 85;
    const equipmentPoweredOn = quickConclusionResult.equipmentHttp2021.reachable;
    const activePathHealthy =
      quickConclusionResult.browserOnline !== false &&
      !inconclusiveProbes &&
      Boolean(internetProbe?.reachable) &&
      reachableCores.length > 0 &&
      Boolean(equipmentProbe?.reachable) &&
      quickConclusionResult.equipmentHttp2021.reachable;
    const monitoringStatusMismatch = metricDown && activePathHealthy;

    let title = 'Connectivité de bout en bout cohérente';
    let summary = `L'équipement du client ${client.client_name} est ${metricDown ? 'signalé DOWN ou dégradé par les métriques NOC' : 'signalé UP par les métriques NOC'}.`;

    if (quickConclusionResult.browserOnline === false) {
      title = 'Le poste opérateur semble hors ligne';
      summary = `La session navigateur utilisée pour l'application ne signale pas d'accès réseau actif. ${summary}`;
    } else if (inconclusiveProbes) {
      title = 'Résultats ICMP indéterminés depuis la sonde NOC';
      summary = `Les tests ICMP exécutés depuis la plateforme NOC ne permettent pas de conclure de manière fiable sur l'état réel des liens core/site. ${summary}`;
    } else if (monitoringStatusMismatch) {
      title = 'Aucun défaut actif détecté sur le chemin de service';
      summary = `L'équipement du client ne présente actuellement aucun problème détecté. Les équipements de transmission/distribution répondent correctement, et votre poste local est bien connecté à Internet. Consultez les éléments de conclusion ci-dessous pour identifier l'origine probable du signalement.`;
    } else if (!internetProbe?.reachable || reachableCores.length === 0) {
      title = 'Suspicion de rupture amont ou de transport';
      summary = `La sortie Internet de référence ou les routeurs core ne répondent pas correctement depuis la plateforme NOC. ${summary}`;
    } else if (!equipmentProbe?.reachable) {
      title = `L'incident est concentré sur le site du client ${client.client_name}`;
      summary = `Les sorties Internet et core sont joignables, mais l'équipement client ne répond pas en ICMP. ${summary}`;
    } else if (!quickConclusionResult.equipmentHttp2021.reachable) {
      title = `L'équipement ${client.client_name} répond, mais l'administration n'est pas disponible`;
      summary = `L'équipement répond en ICMP, mais le port de gestion 2021 reste indisponible. ${summary}`;
    }

    if (currentOperatingContext.activeHoliday) {
      summary += ` La date courante correspond à une période de congé enregistrée (${currentOperatingContext.activeHoliday.title}).`;
    } else if (currentOperatingContext.hasConfiguredWorkingHours) {
      summary += currentOperatingContext.inWorkingHours
        ? ' L incident se produit dans la plage de travail habituelle du client.'
        : ' L incident se produit hors de la plage de travail habituelle du client.';
    }

    const findings: string[] = [];
    const describeFailure = (probe: QuickConclusionProbe): string => {
      if (probe.inconclusive) {
        return `${probe.label} : le résultat est indéterminé depuis la sonde NOC — vérifiez la route ICMP locale avant de conclure.`;
      }
      if (probe.failureType === 'local_route') {
        return `${probe.label} : le chemin réseau depuis la sonde NOC est en échec — vérifiez la table de routage, la passerelle et les ACL.`;
      }
      if (probe.failureType === 'name_resolution') {
        return `${probe.label} : la cible est injoignable ou son nom n'a pas pu être résolu — vérifiez l'adresse IP ou le nom de domaine saisi.`;
      }
      if (probe.failureType === 'timeout') {
        return `${probe.label} : aucune réponse reçue dans le délai imparti — possible filtrage ICMP, congestion réseau ou équipement indisponible.`;
      }
      return `${probe.label} : aucune réponse ICMP reçue, cause non déterminée à ce stade.`;
    };

    findings.push(
      quickConclusionResult.browserOnline === false
        ? "Votre poste de travail ne dispose pas d'une connexion Internet active au moment du test."
        : quickConclusionResult.browserOnline === true
        ? "Votre poste de travail est bien connecté à Internet."
        : "L'état de la connexion de votre poste de travail n'a pas pu être vérifié automatiquement."
    );

    if (internetProbe) {
      findings.push(
        internetProbe.reachable
          ? `La sortie Internet de référence (8.8.8.8) répond correctement — ${internetProbe.lossPercent}% de perte, RTT moyen ${internetProbe.avgMs ?? '-'} ms.`
          : describeFailure(internetProbe)
      );
    }

    for (const probe of coreProbes) {
      findings.push(
        probe.reachable
          ? `${probe.label} est joignable et répond normalement — ${probe.lossPercent}% de perte${probe.avgMs != null ? `, RTT ${probe.avgMs} ms` : ''}.`
          : describeFailure(probe)
      );
    }

    findings.push(
      equipmentProbe?.reachable
        ? `L'équipement du client ${client.client_name} est joignable et répond au ping.`
        : equipmentProbe
        ? `${describeFailure(equipmentProbe)} L'équipement du client ${client.client_name} ne répond pas au ping.`
        : `L'équipement du client ${client.client_name} ne répond pas au ping.`
    );
    findings.push(
      quickConclusionResult.equipmentHttp2021.reachable
        ? `Le port d'administration ${equipmentIp}:2021 est accessible — l'équipement est allumé et opérationnel.`
        : `Le port d'administration ${equipmentIp}:2021 n'est pas accessible depuis la plateforme NOC.`
    );

    if (monitoringStatusMismatch) {
      findings.push(
        `Le statut de monitoring affiche encore ${client.monitor_status} alors que tous les tests actifs sont concluants. Il s'agit probablement d'un délai de mise à jour de la collecte ou d'un décalage de configuration.`
      );
    }

    // Temperature findings
    const tempProbe = quickConclusionResult.temperatureProbe;
    if (tempProbe?.available && tempProbe.maxTemp !== null) {
      const sourceLabel = tempProbe.source === 'zabbix' ? 'Zabbix' : 'LibreNMS';
      if (tempProbe.overheating) {
        findings.push(
          `⚠️ Surchauffe détectée (source : ${sourceLabel}) — température maximale à ${tempProbe.maxTemp.toFixed(1)} °C, au-delà du seuil critique de 50 °C. Une intervention est à envisager.`
        );
        for (const sensor of tempProbe.sensors) {
          findings.push(`  • ${sensor.name} : ${sensor.value.toFixed(1)} ${sensor.unit}`);
        }
      } else {
        findings.push(
          `Température normale (source : ${sourceLabel}) — ${tempProbe.maxTemp.toFixed(1)} °C relevés, en dessous du seuil de 50 °C.`
        );
      }
    } else if (tempProbe && !tempProbe.available) {
      findings.push('Aucune donnée de température disponible depuis Zabbix ou LibreNMS pour cet équipement.');
    }

    if (currentOperatingContext.activeHoliday) {
      findings.push(`Le client est en période de congé déclarée : ${currentOperatingContext.activeHoliday.title} (du ${currentOperatingContext.activeHoliday.startDate} au ${currentOperatingContext.activeHoliday.endDate}).`);
    } else if (currentOperatingContext.hasConfiguredWorkingHours) {
      findings.push(
        currentOperatingContext.inWorkingHours
          ? "L'incident se produit pendant les horaires de travail habituels du client."
          : "L'incident se produit en dehors des horaires de travail habituels du client."
      );
    }

    const advice: string[] = [];
    if (!internetProbe?.reachable || downCores.length > 0) {
      advice.push("Commencez par rétablir la sortie Internet et la connectivité des routeurs core avant d'investiguer du côté du site client.");
    }
    if (inconclusiveProbes) {
      advice.push("Les résultats sont indéterminés côté sonde NOC : vérifiez d'abord que la sonde NOC elle-même dispose d'un accès correct vers les cibles de test avant de conclure à une panne client.");
    }
    const failedProbes = quickConclusionResult.probes.filter((probe) => !probe.reachable && !probe.inconclusive);
    const hasNameResolutionIssue = failedProbes.some((probe) => probe.failureType === 'name_resolution');
    const hasLocalRouteIssue = failedProbes.some((probe) => probe.failureType === 'local_route');
    const hasTimeoutIssue = failedProbes.some((probe) => probe.failureType === 'timeout');

    if (hasNameResolutionIssue) {
      advice.push("Une ou plusieurs cibles sont invalides ou non résolues — corrigez les adresses IP ou noms de domaine concernés avant d'escalader.");
    }
    if (hasLocalRouteIssue) {
      advice.push('La sonde NOC ne dispose pas du bon chemin vers certaines cibles — contrôlez la table de routage, la passerelle par défaut, le VLAN et les ACL de sortie ICMP sur le serveur NOC.');
    }
    if (hasTimeoutIssue) {
      advice.push('Des timeouts sont constatés sur certaines cibles — vérifiez les règles de filtrage ICMP en place, la charge des liens concernés et comparez avec un test depuis un autre point du réseau.');
    }
    if (equipmentProbe?.reachable && !quickConclusionResult.equipmentHttp2021.reachable) {
      advice.push("L'équipement répond au ping mais le port d'administration 2021 est fermé — vérifiez la configuration du service d'accès distant (WebFig, WinBox, etc.) directement sur le routeur.");
    }
    if (monitoringStatusMismatch) {
      advice.push("Le statut de monitoring n'est pas encore à jour — relancez la collecte Zabbix/LibreNMS et vérifiez que l'équipement est bien mappé au bon hôte avant toute escalade terrain.");
      advice.push("Si le statut ne se met pas à jour après rafraîchissement, contrôlez le trigger ou l'item lié à monitor_status (délai de polling, hôte désynchronisé, trigger obsolète).");
    }
    if (internetProbe?.reachable && reachableCores.length > 0 && !equipmentProbe?.reachable) {
      advice.push("La connectivité amont est saine mais l'équipement client est injoignable — lancez un ping 8.8.8.8 depuis le terminal du routeur client pour confirmer la sortie Internet côté site.");
    }
    if (client.bandwidth_mbps && trafficMeta) {
      const inMbps = trafficMeta.currentInMbps ?? 0;
      const outMbps = trafficMeta.currentOutMbps ?? 0;
      const totalMbps = inMbps + outMbps;
      const usagePct = (totalMbps / client.bandwidth_mbps) * 100;
      const inStr = inMbps.toFixed(2);
      const outStr = outMbps.toFixed(2);
      const totalStr = totalMbps.toFixed(2);
      const bwStr = client.bandwidth_mbps;
      const pctStr = usagePct.toFixed(1);

      if (usagePct >= 90) {
        findings.push(
          `⚠️ Saturation critique détectée: trafic actuel ${inStr} Mbps IN + ${outStr} Mbps OUT = ${totalStr} Mbps sur capacité souscrite ${bwStr} Mbps (${pctStr}% utilisés). Le lien est en surconsommation sévère.`
        );
        if (!title.includes('saturation') && !title.includes('surcharge')) {
          title = `Saturation détectée sur la liaison du client ${client.client_name}`;
          summary += ` Le trafic actuel atteint ${pctStr}% de la bande passante souscrite (${bwStr} Mbps).`;
        }
        advice.push(
          `Le client consomme ${pctStr}% de sa capacité souscrite (${bwStr} Mbps). Cette saturation peut causer des pertes de paquets, une latence accrue et une dégradation de la QoS. Appliquez une politique de priorité de trafic (QoS), identifiez les flux dominants et évaluez une extension de la bande passante.`
        );
      } else if (usagePct >= 75) {
        findings.push(
          `Utilisation élevée: trafic actuel ${inStr} Mbps IN + ${outStr} Mbps OUT = ${totalStr} Mbps sur capacité souscrite ${bwStr} Mbps (${pctStr}% utilisés). Le lien approche de sa limite.`
        );
        advice.push(
          `La consommation atteint ${pctStr}% de la bande passante souscrite (${bwStr} Mbps). Surveillez les pics de trafic, activez les alertes de seuil et préparez une extension si la tendance persiste.`
        );
      } else if (totalMbps > 0) {
        findings.push(
          `Utilisation normale: trafic actuel ${inStr} Mbps IN + ${outStr} Mbps OUT = ${totalStr} Mbps sur capacité souscrite ${bwStr} Mbps (${pctStr}% utilisés). Bien qu’aucun signe de saturation n’a été constaté, le suivi reste recommandé.`
        );
      } else {
        findings.push(
          `Bande passante souscrite: ${bwStr} Mbps. Le trafic en temps réel n’est pas disponible pour calculer le taux d’utilisation actuel.`
        );
      }
    } else if (client.bandwidth_mbps && !trafficMeta) {
      advice.push(`Vérifiez que l usage réel reste cohérent avec la bande passante souscrite du client (${client.bandwidth_mbps} Mbps).`);
    }
    if (saturated) {
      advice.push('La consommation observée est élevée. Contrôlez la QoS, les pics de trafic et un éventuel dépassement applicatif.');
    }
    if ((metricDown && !monitoringStatusMismatch) || !equipmentProbe?.reachable || !quickConclusionResult.equipmentHttp2021.reachable) {
      advice.push('Si le défaut persiste après les tests à distance, créez un ticket et dépêchez un technicien pour des investigations terrain plus approfondies.');
    }
    if (!currentOperatingContext.activeHoliday && currentOperatingContext.hasConfiguredWorkingHours && !currentOperatingContext.inWorkingHours) {
      advice.push('Avant escalation, confirmez auprès du client qu une activité hors plage de travail était bien attendue sur ce créneau.');
    }
    if (currentOperatingContext.activeHoliday) {
      advice.push('Prenez en compte la période de congé déclarée avant de conclure à une indisponibilité métier, sauf si le service devait rester exploitable en permanence.');
    }
    if (equipmentPoweredOn && internetProbe?.reachable && reachableCores.length > 0 && equipmentProbe?.reachable) {
      advice.push('Puisque l équipement est allumé et joignable, exécutez maintenant un ping 8.8.8.8 depuis le terminal du routeur client pour confirmer la sortie Internet côté site.');
    }
    if (tempProbe?.available && tempProbe.overheating) {
      advice.push(`L'équipement est en surchauffe (${tempProbe.maxTemp?.toFixed(1)} °C). Vérifiez la ventilation, nettoyez les filtres, et si la surchauffe persiste, planifiez une intervention terrain pour éviter une panne matérielle.`);
    }
    if (advice.length === 0) {
      advice.push('Les tests de premier niveau sont cohérents. Maintenez la surveillance active et poursuivez les vérifications applicatives si le client signale encore une gêne.');
    }

    return { title, summary, findings, advice };
  }, [client, currentOperatingContext.activeHoliday, currentOperatingContext.hasConfiguredWorkingHours, currentOperatingContext.inWorkingHours, equipmentIp, periodStats.currentConsumptionAvg, quickConclusionResult, trafficMeta]);

  const downtimeWindows = useMemo(() => {
    const sorted = [...zabbixEvents].sort((a, b) => a.ts - b.ts);
    const windows: Array<{ start: number; end: number }> = [];

    for (let index = 0; index < sorted.length; index += 1) {
      const event = sorted[index];
      if (event.type !== 'DOWN') continue;
      const upEvent = sorted.slice(index + 1).find((entry) => entry.type === 'UP' && entry.ts > event.ts);
      windows.push({ start: event.ts, end: upEvent?.ts ?? Date.now() });
    }

    return windows;
  }, [zabbixEvents]);

  const investigatedTrafficPoints = useMemo(() => {
    if (realTrafficPoints.length === 0) return [];

    return realTrafficPoints.map((point, index) => {
      const isDown = downtimeWindows.some((window) => point.ts >= window.start && point.ts <= window.end);
      const downEvent = zabbixEvents.find((event) => event.type === 'DOWN' && Math.abs(event.ts - point.ts) < 120_000);
      const upEvent = zabbixEvents.find((event) => event.type === 'UP' && Math.abs(event.ts - point.ts) < 120_000);
      const previousUpPoint = [...realTrafficPoints].slice(0, index).reverse().find((entry) => entry.inMbps != null || entry.outMbps != null);
      const markerLevel = Math.max(point.inMbps ?? 0, point.outMbps ?? 0, previousUpPoint?.inMbps ?? 0, previousUpPoint?.outMbps ?? 0, 0.25);

      return {
        ...point,
        inMbps: isDown ? null : point.inMbps,
        outMbps: isDown ? null : point.outMbps,
        downMarker: downEvent ? markerLevel : null,
        upMarker: upEvent ? markerLevel : null,
        isDown,
      };
    });
  }, [realTrafficPoints, downtimeWindows, zabbixEvents]);

  const visibleRealtimePoints = useMemo(() => {
    const total = investigatedTrafficPoints.length;
    if (total === 0) return [];
    const span = Math.max(8, Math.min(viewSpan, total));
    const maxStart = Math.max(0, total - span);
    const start = Math.max(0, Math.min(viewStartIndex, maxStart));
    return investigatedTrafficPoints.slice(start, start + span);
  }, [investigatedTrafficPoints, viewSpan, viewStartIndex]);

  const realtimeDomain = useMemo(() => {
    const values = (visibleRealtimePoints.length > 0 ? visibleRealtimePoints : investigatedTrafficPoints)
      .flatMap((point) => [point.inMbps, point.outMbps])
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return [0, 100] as [number, number];
    const min = Math.max(0, Math.floor(Math.min(...values) - 2));
    const max = Math.ceil(Math.max(...values) + 3);
    return [min, Math.max(min + 5, max)] as [number, number];
  }, [investigatedTrafficPoints, visibleRealtimePoints]);

  const visibleDowntimeBands = useMemo(() => {
    const bands: Array<{ start: string; end: string }> = [];
    let currentStart: string | null = null;

    for (const point of visibleRealtimePoints) {
      if (point.isDown && !currentStart) currentStart = point.label;
      if (!point.isDown && currentStart) {
        bands.push({ start: currentStart, end: point.label });
        currentStart = null;
      }
    }

    if (currentStart && visibleRealtimePoints.length > 0) {
      bands.push({ start: currentStart, end: visibleRealtimePoints[visibleRealtimePoints.length - 1].label });
    }

    return bands;
  }, [visibleRealtimePoints]);

  const formatTimeAxisLabel = (timestamp: number, totalPoints: number) => {
    if (totalPoints <= 24) return format(new Date(timestamp), 'HH:mm');
    if (totalPoints <= 96) return format(new Date(timestamp), 'dd/MM HH:mm');
    if (totalPoints <= 370) return format(new Date(timestamp), 'dd/MM');
    return format(new Date(timestamp), 'MM/yyyy');
  };

  const resetCurrentGraphView = () => {
    const total = activeGraphPointCount;
    const defaultSpan = focusedGraph === 'realtime'
      ? Math.max(18, Math.min(total, Math.floor(total * 0.5)))
      : Math.max(8, Math.min(total, Math.floor(total * 0.6)));
    setViewSpan(defaultSpan);
    setViewStartIndex(Math.max(0, total - defaultSpan));
  };

  const toggleDetailsSection = (section: 'incidents' | 'downEquipments' | 'interventions') => {
    setDetailsSections((previous) => ({ ...previous, [section]: !previous[section] }));
  };

  const activeDownSinceTs = useMemo(() => {
    if (downtimeWindows.length === 0) return null;
    const active = downtimeWindows.find((window) => window.end >= Date.now() - 60_000);
    return active?.start ?? null;
  }, [downtimeWindows]);

  const latestRealtimePoint = useMemo(() => {
    if (visibleRealtimePoints.length > 0) {
      return visibleRealtimePoints[visibleRealtimePoints.length - 1];
    }
    if (investigatedTrafficPoints.length > 0) {
      return investigatedTrafficPoints[investigatedTrafficPoints.length - 1];
    }
    return null;
  }, [investigatedTrafficPoints, visibleRealtimePoints]);

  const latestAvailabilityPoint = useMemo(
    () => visibleChartSeries.filter((entry) => typeof entry.availability === 'number').at(-1) ?? null,
    [visibleChartSeries]
  );

  const latestConsumptionPoint = useMemo(
    () => visibleChartSeries.filter((entry) => typeof entry.consumption === 'number').at(-1) ?? null,
    [visibleChartSeries]
  );

  const focusLatestIncidentWindow = () => {
    if (investigatedTrafficPoints.length === 0) return;
    const latestDown = [...investigatedTrafficPoints].reverse().find((point) => point.isDown);
    if (!latestDown) return;

    const total = investigatedTrafficPoints.length;
    const idx = investigatedTrafficPoints.findIndex((point) => point.ts === latestDown.ts);
    const span = Math.max(18, Math.min(total, 28));
    const start = Math.max(0, Math.min(total - span, idx - Math.floor(span / 2)));
    setFocusedGraph('realtime');
    setViewSpan(span);
    setViewStartIndex(start);
  };

  const investigationServices = useMemo(() => {
    const services = [
      {
        id: 'service-quick-conclusion',
        label: 'Conclusion rapide guidée',
        description: quickConclusionResult?.overallStatus === 'critical'
          ? 'Incident critique détecté. Relancez pour confirmer la racine.'
          : 'Corrèle Internet/core/site et propose une action terrain.',
        status: quickConclusionResult?.overallStatus === 'critical' ? 'critical' : quickConclusionResult?.overallStatus === 'degraded' ? 'degraded' : 'ok',
        action: () => void runQuickConclusion(),
      },
      {
        id: 'service-connectivity',
        label: 'Test de connectivité terrain',
        description: connectivityResult?.diagnosis.message ?? 'Vérifie ICMP + accès :2021 depuis la plateforme NOC.',
        status: connectivityResult?.diagnosis.status === 'liaison_down'
          ? 'critical'
          : connectivityResult?.diagnosis.status === 'equipment_down'
          ? 'degraded'
          : 'ok',
        action: () => void loadConnectivity(),
      },
      {
        id: 'service-focus-downtime',
        label: 'Focus dernière panne',
        description: latestRealtimePoint?.isDown
          ? 'La fenêtre visible contient une coupure active.'
          : 'Centre automatiquement la vue sur la dernière coupure détectée.',
        status: latestRealtimePoint?.isDown ? 'critical' : zabbixEvents.some((event) => event.type === 'DOWN') ? 'degraded' : 'ok',
        action: focusLatestIncidentWindow,
      },
      {
        id: 'service-equipment-access',
        label: 'Accès équipement',
        description: equipmentAccessMessage || 'Teste et ouvre l’accès d’administration du routeur client.',
        status: selectedEquipmentDown ? 'critical' : equipmentAccessState === 'ready' ? 'ok' : equipmentAccessState === 'checking' ? 'degraded' : 'degraded',
        action: () => {
          if (!equipmentIp) return;
          setShowEquipmentPanel(true);
          void checkEquipmentAccess(equipmentIp);
        },
      },
    ] as const;

    return services;
  }, [
    checkEquipmentAccess,
    connectivityResult?.diagnosis.message,
    connectivityResult?.diagnosis.status,
    equipmentAccessMessage,
    equipmentAccessState,
    equipmentIp,
    latestRealtimePoint?.isDown,
    quickConclusionResult?.overallStatus,
    selectedEquipmentDown,
    zabbixEvents,
  ]);

  const toDataUrl = async (path: string): Promise<string | null> => {
    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const captureChartDataUrl = async (container: HTMLDivElement | null): Promise<string | null> => {
    const svg = container?.querySelector('svg');
    if (!svg) return null;

    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1400, img.width * 2);
        canvas.height = Math.max(800, img.height * 2);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  };

  const exportCsv = () => {
    const lines = [
      [
        'label',
        'availability',
        'compareAvailability',
        'consumption',
        'compareConsumption',
      ].join(','),
      ...chartSeries.map((point) =>
        [
          `"${point.label}"`,
          point.availability ?? '',
          point.compareAvailability ?? '',
          point.consumption ?? '',
          point.compareConsumption ?? '',
        ].join(',')
      ),
    ];

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_${client?.id_client}_compare_${analysisPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChartPng = async () => {
    const chartDataUrl = await captureChartDataUrl(chartContainerRef.current);
    if (!chartDataUrl) {
      toast.error('Graphique introuvable pour export PNG');
      return;
    }

    const a = document.createElement('a');
    a.href = chartDataUrl;
    a.download = `client_${client?.id_client}_graph_${focusedGraph}.png`;
    a.click();
  };

  const buildConclusion = () => {
    const hasCritical = historyAlerts.some((alert) => alert.level === 'critical');
    if (hasCritical) {
      return 'La période analysée montre des anomalies critiques. Une action immédiate de stabilisation du trafic et des équipements est recommandée.';
    }
    if (periodStats.overconsumptionCount > 0) {
      return 'Le client présente des épisodes de surconsommation. Une optimisation de la capacité souscrite ou une investigation applicative est recommandée.';
    }
    return 'Les indicateurs restent globalement stables sur la période. Le niveau de service est conforme avec un comportement maîtrisé.';
  };

  const buildRecommendations = () => {
    const recommendations: string[] = [];

    if (periodStats.currentAvailabilityAvg < (model?.slaTarget ?? 99.5)) {
      recommendations.push('Renforcer la supervision proactive sur les équipements critiques et planifier un contrôle de capacité dans les 24 heures.');
    }
    if (periodStats.overconsumptionCount > 0 || periodStats.currentConsumptionAvg > 80) {
      recommendations.push('Analyser les pics de trafic et ajuster la bande passante souscrite ou les politiques QoS pour limiter les dépassements.');
    }
    if (client?.down_equipments_count && client.down_equipments_count > 0) {
      recommendations.push('Traiter en priorité les équipements DOWN identifiés et valider le retour en service par un test bout-en-bout.');
    }
    if (historyAlerts.some((alert) => alert.level === 'critical')) {
      recommendations.push('Mettre en place une astreinte renforcée et des seuils d\'alerte anticipés pour réduire le temps de réaction.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintenir le plan de surveillance actuel et poursuivre le suivi hebdomadaire des indicateurs clés.');
    }

    return recommendations;
  };

  const getTrafficLightStatus = () => {
    const slaGap = model?.slaGap ?? 0;
    const overconsumption = periodStats.overconsumptionCount;
    const hasCritical = historyAlerts.some((alert) => alert.level === 'critical');

    if (hasCritical || overconsumption > 7 || slaGap < -5) {
      return { color: '#ef4444', label: '❌ Action requise', rgb: '239, 68, 68' };
    }
    if (slaGap < 0 || (overconsumption >= 3 && overconsumption <= 7)) {
      return { color: '#f97316', label: '⚠️ Attention', rgb: '249, 115, 22' };
    }
    return { color: '#22c55e', label: '✅ Conforme', rgb: '34, 197, 94' };
  };

  const generateQRCodeDataUrl = async (clientId: number, scope: string, periodKey: string): Promise<string | null> => {
    try {
      const qrData = `client_${clientId}|scope_${scope}|period_${periodKey}|date_${Date.now()}`;
      return await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch {
      return null;
    }
  };

  const resolveReportPeriodText = () => {
    const currentStart = rangeStart
      ? new Date(rangeStart)
      : chartSeries.length > 0
      ? new Date((historySeries.length > 0 ? historySeries[0].timestamp : Date.now()))
      : null;
    const currentEnd = rangeEnd
      ? new Date(rangeEnd)
      : chartSeries.length > 0
      ? new Date(
          historySeries.length > 0
            ? historySeries[historySeries.length - 1]?.timestamp ?? Date.now()
            : Date.now()
        )
      : null;

    const currentLabel = `${selectedPeriodLabel} du ${formatReportDateTime(currentStart)} au ${formatReportDateTime(currentEnd)}`;
    if (!compareEnabled) return currentLabel;

    const comparedStart = compareRangeStart
      ? new Date(compareRangeStart)
      : compareSeries.length > 0
      ? new Date(compareSeries[0].timestamp)
      : null;
    const comparedEnd = compareRangeEnd
      ? new Date(compareRangeEnd)
      : compareSeries.length > 0
      ? new Date(compareSeries[compareSeries.length - 1].timestamp)
      : null;

    return `${currentLabel} | comparaison ${selectedCompareLabel} du ${formatReportDateTime(comparedStart)} au ${formatReportDateTime(comparedEnd)}`;
  };

  const generateReport = async () => {
    if (!client) return;

    const logoDataUrl = await toDataUrl('/logo.png');
    const availabilityChartDataUrl = await captureChartDataUrl(availabilityReportChartRef.current);
    const consumptionChartDataUrl = await captureChartDataUrl(consumptionReportChartRef.current);
    const incidentChartDataUrl = await captureChartDataUrl(incidentsReportChartRef.current);
    const watermarkDataUrl = logoDataUrl; // Use logo as watermark
    const qrCodeDataUrl = await generateQRCodeDataUrl(client.id_client, reportScope, analysisPeriod);
    const title = `Rapport client ${client.client_name}`;
    const subtitle = 'La confiance, très haut débit';
    const conclusion = buildConclusion();
    const recommendations = buildRecommendations();
    const periodText = resolveReportPeriodText();

    const reportCharts: Array<{ title: string; data: string | null }> = [];
    if (reportScope === 'availability') {
      reportCharts.push({ title: 'Graphique disponibilité', data: availabilityChartDataUrl });
    } else if (reportScope === 'consumption') {
      reportCharts.push({ title: 'Graphique consommation', data: consumptionChartDataUrl });
    } else if (reportScope === 'incidents') {
      // Skip incident chart display
    } else {
      reportCharts.push({ title: 'Graphique disponibilité', data: availabilityChartDataUrl });
      reportCharts.push({ title: 'Graphique consommation', data: consumptionChartDataUrl });
    }

    if (reportFormat === 'pdf') {
      // Determine orientation: portrait for single graphs, landscape for 'both'
      const isMultiGraph = reportScope === 'both';
      const orientation = isMultiGraph ? 'landscape' : 'portrait';
      
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - (margin * 2);

      // ===== PAGE 1 - HEADER & SUMMARY =====
      if (watermarkDataUrl) {
        pdf.setGState(pdf.GState({ opacity: 0.08 })); // Très visible
        pdf.addImage(watermarkDataUrl, 'PNG', pageWidth / 2 - 140, pageHeight / 2 - 140, 280, 280);
        pdf.setGState(pdf.GState({ opacity: 1 })); // Reset opacity
      }

      // Header background
      pdf.setFillColor(8, 47, 73);
      pdf.rect(0, 0, pageWidth, 80, 'F');
      
      if (logoDataUrl) {
        const logoX = pageWidth / 2 - (orientation === 'landscape' ? 130 : 90);
        const logoWidth = orientation === 'landscape' ? 260 : 180;
        pdf.addImage(logoDataUrl, 'PNG', logoX, 12, logoWidth, 56);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Silicone Connect', pageWidth / 2, 65, { align: 'center' });

      // Title
      pdf.setTextColor(16, 24, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(title, margin, 110);

      // ===== TRAFFIC LIGHT & RESUME EXECUTIF =====
      const qrY = 128;
      if (qrCodeDataUrl) {
        pdf.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 120, qrY, 110, 110);
      }
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Traçabilité rapport', pageWidth - margin - 110, qrY + 115, { align: 'center' });

      // Client Identity Box
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, qrY, contentWidth - 130, 108, 5, 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(16, 24, 40);
      pdf.text('Identification client', margin + 12, qrY + 18);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const idLines = [
        `Réf: ${client.client_ref || '-'} | ${client.client_name || '-'}`,
        `Service: ${client.service_type || '-'} | Statut: ${client.monitor_status || '-'}`,
        `Bande passante: ${client.bandwidth_mbps ? `${client.bandwidth_mbps} Mbps` : 'N/A'} | IP: ${client.ip_client || '-'}`,
        `Mise à jour: ${formatReportDateTime(client.updated_at)}`,
      ];
      let idY = qrY + 32;
      for (const line of idLines) {
        pdf.text(line, margin + 12, idY);
        idY += 12;
      }

      // Synthese Section
      const syntheseY = qrY + 120;
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, syntheseY, contentWidth, 90, 5, 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(16, 24, 40);
      pdf.text('Synthèse analytique', margin + 12, syntheseY + 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const synthLines = [
        `Période: ${periodText}`,
        `Disponibilité: ${periodStats.currentAvailabilityAvg.toFixed(2)}% (SLA cible: ${model?.slaTarget.toFixed(2) ?? 'N/A'}%)`,
        `Consommation: ${periodStats.currentConsumptionAvg.toFixed(2)}% | Surconsommation: ${periodStats.overconsumptionCount}`,
        `Incidents: ${client.incident_count} | Équipements DOWN: ${client.down_equipments_count}/${client.total_equipments_count}`,
      ];
      let synY = syntheseY + 32;
      for (const line of synthLines) {
        pdf.text(line, margin + 12, synY);
        synY += 14;
      }

      let currentY = syntheseY + 110;

      // ===== CHARTS SECTION =====
      const chartY = currentY;
      let chartH = 180;
      if (isMultiGraph && reportCharts.length > 1) {
        // Two charts side by side
        const chartW = (contentWidth - 16) / 2;
        reportCharts.forEach((chart, index) => {
          if (!chart.data) return;
          const x = margin + index * (chartW + 16);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(16, 24, 40);
          pdf.text(chart.title, x + 8, chartY - 8);
          pdf.addImage(chart.data, 'PNG', x, chartY, chartW, chartH);
        });
      } else {
        // Single chart, centered
        const chartW = contentWidth * 0.75;
        const chartX = margin + (contentWidth - chartW) / 2;
        reportCharts.forEach((chart) => {
          if (!chart.data) return;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(16, 24, 40);
          pdf.text(chart.title, chartX + 8, chartY - 8);
          pdf.addImage(chart.data, 'PNG', chartX, chartY, chartW, chartH);
        });
      }

      currentY = chartY + chartH + 20;

      // Add second page if content is dense
      const isDense = (reportScope === 'both' && Boolean(incidentChartDataUrl)) || recommendations.length > 3 || currentY > pageHeight - 140;
      
      if (isDense) {
        pdf.addPage(orientation);
        if (watermarkDataUrl) {
          pdf.setGState(pdf.GState({ opacity: 0.15 }));
          pdf.addImage(watermarkDataUrl, 'PNG', pageWidth / 2 - 140, pageHeight / 2 - 140, 280, 280);
          pdf.setGState(pdf.GState({ opacity: 1 }));
        }
        currentY = margin;
      }

      // Conclusion
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, currentY, contentWidth, 68, 5, 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(16, 24, 40);
      pdf.text('Conclusion', margin + 12, currentY + 18);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(conclusion, margin + 12, currentY + 32, { maxWidth: contentWidth - 24, lineHeightFactor: 1.3 });

      currentY += 82;

      // Recommendations
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(margin, currentY, contentWidth, 100, 5, 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(16, 24, 40);
      pdf.text('Recommandations opérationnelles', margin + 12, currentY + 18);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const recText = recommendations.map((entry) => `• ${entry}`).join('\n');
      pdf.text(recText, margin + 12, currentY + 32, { maxWidth: contentWidth - 24, lineHeightFactor: 1.35 });

      // Footer with colored bars
      pdf.setFillColor(249, 115, 22);
      pdf.rect(0, pageHeight - 8, pageWidth / 2, 4, 'F');
      pdf.setFillColor(6, 182, 212);
      pdf.rect(pageWidth / 2, pageHeight - 8, pageWidth / 2, 4, 'F');

      pdf.save(`rapport_client_${client.id_client}_${reportScope}.pdf`);
      return;
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const primaryChartData =
      reportScope === 'availability'
        ? availabilityChartDataUrl
        : reportScope === 'consumption'
        ? consumptionChartDataUrl
        : reportScope === 'incidents'
        ? incidentChartDataUrl
        : availabilityChartDataUrl || consumptionChartDataUrl;
    const secondaryChartData = reportScope === 'both' ? consumptionChartDataUrl : null;

    const slide = pptx.addSlide();
    slide.background = { color: '0B1F32' };
    if (logoDataUrl) {
      slide.addImage({ data: logoDataUrl, x: 0.4, y: 0.25, w: 2.4, h: 1.0 });
    }
    slide.addText('Silicone Connect', {
      x: 3.0,
      y: 0.45,
      w: 5.0,
      h: 0.4,
      color: 'FFFFFF',
      fontSize: 24,
      bold: true,
    });
    slide.addText('La confiance, très haut débit', {
      x: 3.0,
      y: 0.95,
      w: 6.5,
      h: 0.3,
      color: '9EC9F5',
      fontSize: 13,
    });
    
    slide.addText(title, {
      x: 0.6,
      y: 1.8,
      w: 12.0,
      h: 0.5,
      color: 'FFFFFF',
      fontSize: 20,
      bold: true,
    });
    slide.addText(`Période: ${periodText}`, {
      x: 0.6,
      y: 2.2,
      w: 12.0,
      h: 0.3,
      color: 'A7D3FF',
      fontSize: 11,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 2.5,
      w: 5.8,
      h: 2.7,
      fill: { color: '12324D', transparency: 15 },
      line: { color: '2A5A86', pt: 1 },
      rectRadius: 0.15,
    });

    slide.addText(`Disponibilité moyenne: ${periodStats.currentAvailabilityAvg.toFixed(2)}%`, {
      x: 0.85,
      y: 2.9,
      w: 5.2,
      h: 0.3,
      color: 'D8ECFF',
      fontSize: 14,
      bold: true,
    });
    slide.addText(`Consommation moyenne: ${periodStats.currentConsumptionAvg.toFixed(2)}%`, {
      x: 0.85,
      y: 3.3,
      w: 5.2,
      h: 0.3,
      color: 'D8ECFF',
      fontSize: 14,
      bold: true,
    });
    slide.addText(`Surconsommation: ${periodStats.overconsumptionCount} occurrences`, {
      x: 0.85,
      y: 3.7,
      w: 5.2,
      h: 0.3,
      color: 'D8ECFF',
      fontSize: 14,
      bold: true,
    });
    slide.addText(`Client: ${client.client_ref} | ${client.client_name}`, {
      x: 0.85,
      y: 4.05,
      w: 5.2,
      h: 0.3,
      color: 'D8ECFF',
      fontSize: 11,
    });
    slide.addText(`Service: ${client.service_type} | Bande passante: ${client.bandwidth_mbps ? `${client.bandwidth_mbps} Mbps` : 'N/A'}`, {
      x: 0.85,
      y: 4.28,
      w: 5.2,
      h: 0.3,
      color: 'D8ECFF',
      fontSize: 11,
    });

    slide.addText(`Conclusion: ${conclusion}`, {
      x: 0.85,
      y: 4.55,
      w: 5.2,
      h: 0.55,
      color: 'FFFFFF',
      fontSize: 11,
    });

    if (primaryChartData) {
      slide.addImage({ data: primaryChartData, x: 6.7, y: 2.5, w: 6.0, h: 2.7 });
    }

    const needsSecondSlide = Boolean(secondaryChartData) || recommendations.length > 3;
    if (needsSecondSlide) {
      const slide2 = pptx.addSlide();
      slide2.background = { color: '102A43' };
      slide2.addText('Details complementaires', {
        x: 0.6,
        y: 0.4,
        w: 6,
        h: 0.5,
        color: 'FFFFFF',
        fontSize: 22,
        bold: true,
      });

      if (secondaryChartData) {
        slide2.addText('Graphique secondaire', {
          x: 0.6,
          y: 1.0,
          w: 5,
          h: 0.3,
          color: 'D8ECFF',
          fontSize: 12,
          bold: true,
        });
        slide2.addImage({ data: secondaryChartData, x: 0.6, y: 1.3, w: 7.4, h: 3.0 });
      }

      slide2.addShape(pptx.ShapeType.roundRect, {
        x: 8.3,
        y: 1.3,
        w: 4.6,
        h: 3.0,
        fill: { color: '173D5C', transparency: 10 },
        line: { color: '2A5A86', pt: 1 },
        rectRadius: 0.1,
      });
      slide2.addText('Recommandations', {
        x: 8.5,
        y: 1.55,
        w: 4.2,
        h: 0.3,
        color: 'FFFFFF',
        fontSize: 14,
        bold: true,
      });
      slide2.addText(
        recommendations.map((entry) => `• ${entry}`).join('\n'),
        {
          x: 8.5,
          y: 1.95,
          w: 4.2,
          h: 2.2,
          color: 'E6F3FF',
          fontSize: 10,
          breakLine: true,
        }
      );
    }

    await pptx.writeFile({ fileName: `rapport_client_${client.id_client}_${reportScope}.pptx` });
  };

  const onChartDoubleClick = () => {
    resetCurrentGraphView();
  };

  const onChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      baseStart: viewStartIndex,
      baseSpan: viewSpan,
    };
    setIsDraggingChart(true);
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const onChartPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onChartMouseMove({
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
    } as React.MouseEvent<HTMLDivElement>);
  };

  const onChartPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopChartDrag();
  };

  const onChartMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const total = activeGraphPointCount;
    if (total <= 0) return;

    const dx = event.clientX - dragStateRef.current.startX;
    const dy = event.clientY - dragStateRef.current.startY;

    // Shift held: vertical drag = zoom, no pan
    // No modifier: pure horizontal pan
    if (event.shiftKey) {
      const zoomDelta = Math.round(dy / 14);
      const minSpan = Math.max(focusedGraph === 'realtime' ? 8 : 6, Math.min(focusedGraph === 'realtime' ? 36 : 18, total));
      const nextSpan = Math.max(minSpan, Math.min(total, dragStateRef.current.baseSpan + zoomDelta));
      const center = dragStateRef.current.baseStart + dragStateRef.current.baseSpan / 2;
      const maxStart = Math.max(0, total - nextSpan);
      setViewSpan(nextSpan);
      setViewStartIndex(Math.max(0, Math.min(maxStart, Math.round(center - nextSpan / 2))));
    } else {
      // Pure horizontal pan
      const sensitivity = Math.max(8, Math.round(chartContainerRef.current?.offsetWidth ?? 800) / total);
      const panPoints = Math.round(-dx / sensitivity);
      const span = Math.max(6, Math.min(viewSpan, total));
      const maxStart = Math.max(0, total - span);
      setViewStartIndex(Math.max(0, Math.min(maxStart, dragStateRef.current.baseStart + panPoints)));
    }
  };

  const stopChartDrag = () => {
    dragStateRef.current.dragging = false;
    setIsDraggingChart(false);
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = 'grab';
    }
  };

  const onChartWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const total = activeGraphPointCount;
    if (total <= 0) return;

    // Ctrl+wheel or Alt+wheel = zoom centré sur la position curseur
    if (event.ctrlKey || event.altKey) {
      const zoomDirection = event.deltaY > 0 ? 1 : -1;
      // Zoom min adaptatif: seconds/minutes/hours selon data
      const minSpanRealtime = Math.max(6, Math.min(total, 8));
      const minSpanHistory = Math.max(4, Math.min(total, 6));
      const minSpan = focusedGraph === 'realtime' ? minSpanRealtime : minSpanHistory;
      const factor = Math.max(1, Math.round(viewSpan * 0.1));
      const nextSpan = Math.max(minSpan, Math.min(total, viewSpan + zoomDirection * factor));
      // Centre sur position curseur dans le graphe
      const rect = chartContainerRef.current?.getBoundingClientRect();
      const relX = rect ? (event.clientX - rect.left) / rect.width : 0.5;
      const cursorIdx = viewStartIndex + relX * viewSpan;
      const maxStart = Math.max(0, total - nextSpan);
      setViewSpan(nextSpan);
      setViewStartIndex(Math.max(0, Math.min(maxStart, Math.round(cursorIdx - relX * nextSpan))));
      return;
    }

    // Molette seule = défilement horizontal (pan)
    const delta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
    const span = Math.max(6, Math.min(viewSpan, total));
    const maxStart = Math.max(0, total - span);
    const step = Math.round(delta / Math.max(8, (chartContainerRef.current?.offsetWidth ?? 800) / span));
    setViewStartIndex((previous) => Math.max(0, Math.min(maxStart, previous + step)));
  };

  const onChartTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const [first, second] = Array.from(event.touches);
      touchStateRef.current = {
        mode: 'pinch',
        startX: (first.clientX + second.clientX) / 2,
        startY: (first.clientY + second.clientY) / 2,
        startDistance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
        baseStart: viewStartIndex,
        baseSpan: viewSpan,
      };
      return;
    }

    if (event.touches.length === 1) {
      event.preventDefault();
      const [touch] = Array.from(event.touches);
      touchStateRef.current = {
        mode: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        startDistance: 0,
        baseStart: viewStartIndex,
        baseSpan: viewSpan,
      };
    }
  };

  const onChartTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const total = activeGraphPointCount;
    if (total <= 0) return;

    if (touchStateRef.current.mode === 'pinch' && event.touches.length === 2) {
      event.preventDefault();
      const [first, second] = Array.from(event.touches);
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const delta = touchStateRef.current.startDistance - distance;
      const minSpan = Math.max(focusedGraph === 'realtime' ? 12 : 8, Math.min(focusedGraph === 'realtime' ? 48 : 24, total));
      const nextSpan = Math.max(minSpan, Math.min(total, Math.round(touchStateRef.current.baseSpan + delta / 12)));
      const center = touchStateRef.current.baseStart + touchStateRef.current.baseSpan / 2;
      const maxStart = Math.max(0, total - nextSpan);
      setViewSpan(nextSpan);
      setViewStartIndex(Math.max(0, Math.min(maxStart, Math.round(center - nextSpan / 2))));
      return;
    }

    if (touchStateRef.current.mode === 'pan' && event.touches.length === 1) {
      event.preventDefault();
      const [touch] = Array.from(event.touches);
      const dx = touch.clientX - touchStateRef.current.startX;
      const span = Math.max(8, Math.min(viewSpan, total));
      const maxStart = Math.max(0, total - span);
      const panPoints = Math.round(-dx / 14);
      setViewStartIndex(Math.max(0, Math.min(maxStart, touchStateRef.current.baseStart + panPoints)));
    }
  };

  const onChartTouchEnd = () => {
    touchStateRef.current.mode = null;
  };

  const onChartContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent the same event from propagating to the window close-listener
    setGraphContextMenu({ open: true, x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    if (!isDraggingChart) return;

    const handleMove = (event: MouseEvent) => {
      onChartMouseMove({
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
      } as React.MouseEvent<HTMLDivElement>);
    };
    const handleUp = () => {
      stopChartDrag();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [activeGraphPointCount, focusedGraph, isDraggingChart, viewSpan, viewStartIndex]);

  useEffect(() => {
    if (!graphContextMenu.open) return;
    const closeMenu = () => setGraphContextMenu((previous) => ({ ...previous, open: false }));
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, [graphContextMenu.open]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const preventNativeZoom = (event: Event) => {
      event.preventDefault();
    };

    const preventNativeTouch = (event: TouchEvent) => {
      // Keep touch interactions dedicated to chart pan/zoom.
      if (event.touches.length >= 1) {
        event.preventDefault();
      }
    };

    container.addEventListener('gesturestart', preventNativeZoom, { passive: false });
    container.addEventListener('gesturechange', preventNativeZoom, { passive: false });
    container.addEventListener('gestureend', preventNativeZoom, { passive: false });
    container.addEventListener('touchstart', preventNativeTouch, { passive: false });
    container.addEventListener('touchmove', preventNativeTouch, { passive: false });

    return () => {
      container.removeEventListener('gesturestart', preventNativeZoom);
      container.removeEventListener('gesturechange', preventNativeZoom);
      container.removeEventListener('gestureend', preventNativeZoom);
      container.removeEventListener('touchstart', preventNativeTouch);
      container.removeEventListener('touchmove', preventNativeTouch);
    };
  }, [focusedGraph]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <img src="/logo.png" alt="Silicone Connect" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <span className="font-bold text-lg hidden sm:block">NOC ACTIVITIES</span>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">NOC Actif</span>
          </div>

          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </header>

      <div className={`flex ${sidebarPosition === 'right' ? 'lg:flex-row-reverse' : ''}`}>
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:sticky top-14 left-0 z-40 w-60 lg:w-auto h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300 lg:translate-x-0`}
          style={{ width: sidebarCollapsed ? 64 : sidebarWidth }}
        >
          <div className="hidden lg:flex items-center justify-between gap-2 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarPosition((current) => (current === 'left' ? 'right' : 'left'))}
              aria-label={sidebarPosition === 'left' ? 'Placer la sidebar à droite' : 'Placer la sidebar à gauche'}
              title={sidebarPosition === 'left' ? 'Placer la sidebar à droite' : 'Placer la sidebar à gauche'}
            >
              {sidebarPosition === 'left' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
              title={sidebarCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          <ScrollArea className="h-full">
            <nav className="p-3 space-y-1">
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <LayoutDashboard className="w-5 h-5" /> {!sidebarCollapsed && 'Tableau de bord'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Calendar className="w-5 h-5" /> {!sidebarCollapsed && 'Planning'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <ClipboardList className="w-5 h-5" /> {!sidebarCollapsed && 'Mes Tâches'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Activity className="w-5 h-5" /> {!sidebarCollapsed && 'Activités'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/tickets')}>
                <Ticket className="w-5 h-5" /> {!sidebarCollapsed && 'Gestion Tickets'}
              </Button>
              <Separator className="my-2" />

              <Button
                variant="secondary"
                className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                onClick={() => {
                  if (sidebarCollapsed) {
                    return;
                  }
                  setSidebarGroupOpen((prev) => ({ ...prev, noc: !prev.noc }));
                }}
              >
                <Network className="w-5 h-5" /> {!sidebarCollapsed && 'NOC'}
                {!sidebarCollapsed && (
                  <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${sidebarGroupOpen.noc ? 'rotate-180' : ''}`} />
                )}
              </Button>

              {!sidebarCollapsed && sidebarGroupOpen.noc && (
                <div className="ml-4 mt-1 space-y-1">
                  <Button variant="secondary" size="sm" className="w-full justify-start gap-2 h-9 pl-4 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300">
                    <Activity className="w-4 h-4" /> Monitoring
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4" onClick={() => router.push('/')}>
                    <Users className="w-4 h-4" /> Clients
                  </Button>
                </div>
              )}

              <Separator className="my-2" />
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Clock className="w-5 h-5" /> {!sidebarCollapsed && 'Heures Sup.'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <ExternalLink className="w-5 h-5" /> {!sidebarCollapsed && 'Liens Externes'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <MessageCircle className="w-5 h-5" /> {!sidebarCollapsed && 'Chats'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Mail className="w-5 h-5" /> {!sidebarCollapsed && 'Messagerie'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <FileText className="w-5 h-5" /> {!sidebarCollapsed && 'GED Documents'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Eye className="w-5 h-5" /> {!sidebarCollapsed && 'Supervision'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => router.push('/')}>
                <Settings className="w-5 h-5" /> {!sidebarCollapsed && 'Administration'}
              </Button>
            </nav>
          </ScrollArea>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-3.5rem)] overflow-auto">
          <div className="space-y-4">
          {!client && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Client non trouvé</CardTitle>
                <CardDescription>Impossible de charger le détail demandé.</CardDescription>
              </CardHeader>
            </Card>
          )}

          {client && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{client.client_name}</CardTitle>
                  <CardDescription>
                    Réf {client.client_ref} | Service {client.service_type} | Statut {client.monitor_status}
                  </CardDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/?tab=noc_monitoring')}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Retour Monitoring
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void loadConnectivity()} disabled={isCheckingConnectivity || !client.ip_client}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${isCheckingConnectivity ? 'animate-spin' : ''}`} />
                      Vérifier la connectivité
                    </Button>
                    <Button
                      variant={continuousPingEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContinuousPingEnabled((prev) => !prev)}
                      disabled={!client.ip_client}
                    >
                      {continuousPingEnabled ? 'Ping continu actif' : 'Activer ping continu'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!equipmentIp) return;
                        if (showEquipmentPanel) {
                          setShowEquipmentPanel(false);
                          return;
                        }
                        setShowEquipmentPanel(true);
                        void checkEquipmentAccess(equipmentIp);
                      }}
                      disabled={!equipmentIp}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" /> Se connecter à l'équipement
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => void runQuickConclusion()}
                      disabled={isRunningQuickConclusion || !equipmentIp}
                    >
                      <Network className={`w-4 h-4 mr-1 ${isRunningQuickConclusion ? 'animate-pulse' : ''}`} /> Conclusion rapide
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClientCalendarPanel((previous) => !previous)}
                    >
                      <Clock className="w-4 h-4 mr-1" /> Habitudes de travail
                    </Button>
                  </div>

                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">IP</p>
                    <p className="font-medium">{client.ip_client || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Downtime</p>
                    <p className={`font-medium ${trafficMeta?.realDowntimeSec != null && trafficMeta.realDowntimeSec > 0 ? 'text-rose-400' : ''}`}>
                      {trafficMeta?.realDowntimeSec != null
                        ? formatDuration(trafficMeta.realDowntimeSec)
                        : formatDowntime(client.updated_at)}
                    </p>
                    {trafficMeta?.realDowntimeSec != null && (
                      <p className="text-xs text-cyan-400 mt-0.5">Source Zabbix réel</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Incidents</p>
                    <p className="font-medium">{client.incident_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Équipements DOWN</p>
                    <p className="font-medium">{client.down_equipments_count}/{client.total_equipments_count}</p>
                  </div>
                </CardContent>
              </Card>

              {showClientCalendarPanel && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4 text-cyan-400" /> Habitudes de travail du client
                    </CardTitle>
                    <CardDescription>
                      Enregistrez les vraies plages de travail et les périodes de congé du client pour affiner automatiquement les analyses rapides.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-xl border p-4 space-y-3">
                        <p className="text-sm font-medium">Ajouter une plage de travail</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Jour</span>
                            <select
                              className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                              value={workingHourForm.dayOfWeek}
                              onChange={(event) => setWorkingHourForm((previous) => ({ ...previous, dayOfWeek: event.target.value }))}
                            >
                              {WORKING_DAY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Libellé</span>
                            <Input
                              value={workingHourForm.label}
                              onChange={(event) => setWorkingHourForm((previous) => ({ ...previous, label: event.target.value }))}
                              placeholder="Support, exploitation, caisse..."
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Début</span>
                            <Input
                              type="time"
                              value={workingHourForm.startTime}
                              onChange={(event) => setWorkingHourForm((previous) => ({ ...previous, startTime: event.target.value }))}
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Fin</span>
                            <Input
                              type="time"
                              value={workingHourForm.endTime}
                              onChange={(event) => setWorkingHourForm((previous) => ({ ...previous, endTime: event.target.value }))}
                            />
                          </label>
                        </div>
                        <Button size="sm" onClick={() => void saveWorkingHour()} disabled={isSavingClientCalendar}>
                          <Clock className="w-4 h-4 mr-1" /> Enregistrer la plage
                        </Button>
                        <div className="space-y-2">
                          {isLoadingClientCalendar ? (
                            <p className="text-sm text-muted-foreground">Chargement des habitudes...</p>
                          ) : workingHours.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune plage de travail enregistrée.</p>
                          ) : (
                            workingHours.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    {WORKING_DAY_OPTIONS.find((option) => option.value === entry.dayOfWeek)?.label ?? `Jour ${entry.dayOfWeek}`} · {entry.startTime} - {entry.endTime}
                                  </p>
                                  {entry.label && <p className="text-xs text-muted-foreground mt-1">{entry.label}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => void deleteClientCalendarEntry('working-hour', entry.id)} disabled={isSavingClientCalendar}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border p-4 space-y-3">
                        <p className="text-sm font-medium">Ajouter une période de congé</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="space-y-1 text-sm sm:col-span-2">
                            <span className="text-xs text-muted-foreground">Libellé</span>
                            <Input
                              value={holidayForm.title}
                              onChange={(event) => setHolidayForm((previous) => ({ ...previous, title: event.target.value }))}
                              placeholder="Fermeture annuelle, congé administratif..."
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Début</span>
                            <Input
                              type="date"
                              value={holidayForm.startDate}
                              onChange={(event) => setHolidayForm((previous) => ({ ...previous, startDate: event.target.value }))}
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Fin</span>
                            <Input
                              type="date"
                              value={holidayForm.endDate}
                              onChange={(event) => setHolidayForm((previous) => ({ ...previous, endDate: event.target.value }))}
                            />
                          </label>
                          <label className="space-y-1 text-sm sm:col-span-2">
                            <span className="text-xs text-muted-foreground">Notes</span>
                            <Input
                              value={holidayForm.notes}
                              onChange={(event) => setHolidayForm((previous) => ({ ...previous, notes: event.target.value }))}
                              placeholder="Informations complémentaires"
                            />
                          </label>
                        </div>
                        <Button size="sm" onClick={() => void saveHoliday()} disabled={isSavingClientCalendar}>
                          <Calendar className="w-4 h-4 mr-1" /> Enregistrer le congé
                        </Button>
                        <div className="space-y-2">
                          {isLoadingClientCalendar ? (
                            <p className="text-sm text-muted-foreground">Chargement des congés...</p>
                          ) : holidays.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune période de congé enregistrée.</p>
                          ) : (
                            holidays.map((holiday) => (
                              <div key={holiday.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                <div>
                                  <p className="text-sm font-medium">{holiday.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{holiday.startDate} → {holiday.endDate}</p>
                                  {holiday.notes && <p className="text-xs text-muted-foreground mt-1">{holiday.notes}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => void deleteClientCalendarEntry('holiday', holiday.id)} disabled={isSavingClientCalendar}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showEquipmentPanel && equipmentIp && (
                <Card className="border-cyan-700/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ExternalLink className="h-4 w-4 text-cyan-400" />
                        Équipement — {equipmentIp}:2021
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`http://${equipmentIp}:2021`, '_blank', 'noopener,noreferrer')}
                          title="Ouvrir dans un nouvel onglet"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowEquipmentPanel(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Interface de l'équipement chargée dans l'application. Si le navigateur bloque le contenu mixte, utilisez le bouton d'ouverture externe.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {equipmentAccessState === 'checking' && (
                      <div className="h-135 min-h-100 border-t flex items-center justify-center text-sm text-muted-foreground">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Verification de la liaison et de l'equipement...
                      </div>
                    )}

                    {(equipmentAccessState === 'offline' || equipmentAccessState === 'unreachable' || equipmentAccessState === 'error') && (
                      <div className="h-135 min-h-100 border-t p-4 flex flex-col items-center justify-center gap-3 text-center">
                        <AlertTriangle className="h-7 w-7 text-amber-400" />
                        <p className="text-sm font-medium">Connexion impossible</p>
                        <p className="text-xs text-muted-foreground max-w-xl">{equipmentAccessMessage}</p>
                        {equipmentAccessCheckedAt && (
                          <p className="text-[11px] text-muted-foreground">
                            Dernier test: {format(new Date(equipmentAccessCheckedAt), 'dd/MM/yyyy HH:mm:ss')}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => void checkEquipmentAccess(equipmentIp)}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Reessayer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`http://${equipmentIp}:2021`, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir externe
                          </Button>
                        </div>
                      </div>
                    )}

                    {equipmentAccessState === 'ready' && (
                      <iframe
                        src={`/api/noc/equipment-proxy?ip=${encodeURIComponent(equipmentIp)}&path=${encodeURIComponent('/webfig/')}`}
                        className="w-full rounded-b-lg border-t"
                        style={{ height: 540, minHeight: 400 }}
                        title={`Équipement ${equipmentIp}`}
                        onLoad={() => {
                          setEquipmentAccessState('ready');
                          setEquipmentAccessMessage('Connexion etablie avec succes.');
                        }}
                        onError={() => {
                          setEquipmentAccessState('error');
                          setEquipmentAccessMessage('Erreur de chargement de l interface equipement.');
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {(isCheckingConnectivity || connectivityResult) && (
              <Card className="border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-cyan-400" /> Diagnostic connectivité terrain
                  </CardTitle>
                  <CardDescription>
                    Vérification liaison (ICMP) et équipement client (HTTP:2021) pour distinguer la cause d indisponibilité.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!connectivityResult ? (
                    <p className="text-sm text-muted-foreground">
                      Lancez un test avec "Vérifier la connectivité" pour diagnostiquer liaison vs équipement.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className={`rounded-md border p-3 ${connectivityResult.ping.reachable ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-rose-700/40 bg-rose-950/20'}`}>
                          <p className="text-xs text-muted-foreground">Liaison (ping)</p>
                          <p className={`font-semibold ${connectivityResult.ping.reachable ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {connectivityResult.ping.reachable ? 'Joignable' : 'Injoignable'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Perte {connectivityResult.ping.lossPercent}% | RTT moy {connectivityResult.ping.avgMs ?? '-'} ms
                          </p>
                        </div>
                        <div className={`rounded-md border p-3 ${connectivityResult.equipmentHttp2021.reachable ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-amber-700/40 bg-amber-950/20'}`}>
                          <p className="text-xs text-muted-foreground">Équipement :2021</p>
                          <p className={`font-semibold ${connectivityResult.equipmentHttp2021.reachable ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {connectivityResult.equipmentHttp2021.reachable ? 'Accessible' : 'Non accessible'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            HTTP {connectivityResult.equipmentHttp2021.httpStatus ?? '-'}
                          </p>
                        </div>
                        <div className="rounded-md border border-cyan-700/40 bg-cyan-950/20 p-3">
                          <p className="text-xs text-muted-foreground">Diagnostic</p>
                          <p className="font-semibold text-cyan-200">{connectivityResult.diagnosis.status}</p>
                          <p className="text-xs text-cyan-100/80 mt-1">{connectivityResult.diagnosis.message}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dernier test: {format(new Date(connectivityResult.checkedAt), 'dd/MM/yyyy HH:mm:ss')} | Cible {connectivityResult.target}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              )}

              {(isRunningQuickConclusion || quickConclusionResult) && quickConclusionNarrative && (
                <Card className={`border ${quickConclusionResult?.overallStatus === 'critical' ? 'border-rose-500/50 bg-rose-950/10' : quickConclusionResult?.overallStatus === 'degraded' ? 'border-amber-500/50 bg-amber-950/10' : 'border-emerald-500/40 bg-emerald-950/10'}`}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Network className="h-4 w-4 text-cyan-400" /> Conclusion rapide
                        </CardTitle>
                        <CardDescription>
                          Analyse automatique des accès Internet, des routeurs core et de l'équipement actuellement sélectionné.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => void runQuickConclusion()} disabled={isRunningQuickConclusion}>
                          <RefreshCw className={`w-4 h-4 mr-1 ${isRunningQuickConclusion ? 'animate-spin' : ''}`} /> Relancer
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/?tab=tickets')}>
                          <Ticket className="w-4 h-4 mr-1" /> Créer un ticket
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <p className="text-sm font-semibold text-foreground">{quickConclusionNarrative.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{quickConclusionNarrative.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {quickConclusionResult?.probes.map((probe) => (
                        <div
                          key={probe.id}
                          className={`rounded-xl border p-3 ${probe.reachable ? 'border-emerald-500/30 bg-emerald-500/5' : probe.inconclusive ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{probe.label}</p>
                            <Badge variant={probe.reachable ? 'secondary' : probe.inconclusive ? 'outline' : 'destructive'}>
                              {probe.reachable ? 'Joignable' : probe.inconclusive ? 'Indéterminé' : 'Injoignable'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{probe.target}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Perte {probe.lossPercent}% | RTT moyen {probe.avgMs ?? '-'} ms
                          </p>
                          {probe.note && (
                            <p className="mt-2 text-xs text-muted-foreground">{probe.note}</p>
                          )}
                        </div>
                      ))}
                      <div
                        className={`rounded-xl border p-3 ${quickConclusionResult?.equipmentHttp2021.reachable ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">Accès équipement :2021</p>
                          <Badge variant={quickConclusionResult?.equipmentHttp2021.reachable ? 'secondary' : 'outline'}>
                            {quickConclusionResult?.equipmentHttp2021.reachable ? 'Accessible' : 'Non accessible'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{equipmentIp}:2021</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          HTTP {quickConclusionResult?.equipmentHttp2021.httpStatus ?? '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Constats</p>
                        <div className="mt-2 space-y-2">
                          {quickConclusionNarrative.findings.map((finding, index) => (
                            <div key={`finding-${index}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                              {finding}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Conseils</p>
                        <div className="mt-2 space-y-2">
                          {quickConclusionNarrative.advice.map((entry, index) => (
                            <div key={`advice-${index}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                              {entry}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Dernier test: {quickConclusionResult?.checkedAt ? format(new Date(quickConclusionResult.checkedAt), 'dd/MM/yyyy HH:mm:ss') : '-'}.
                      Le statut du poste opérateur est basé sur l'état réseau du navigateur; les tests ICMP sont exécutés depuis la plateforme NOC.
                    </p>
                  </CardContent>
                </Card>
              )}

              {model ? (
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Graphes NOC modélisés depuis Zabbix
                </CardTitle>
                <CardDescription>
                  Historique persistant, comparaison de périodes, alertes de surconsommation et interactions dynamiques.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  <div className={`xl:col-span-2 ${graphPalette.cardClass}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={`text-xs uppercase tracking-[0.24em] ${isDarkTheme ? 'text-cyan-200/75' : 'text-sky-700/80'}`}>Investigation graphique</p>
                        <p className={`text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>Tout se pilote depuis le graphe: glisser pour défiler, molette pour zoom/dézoom, clic droit pour actions.</p>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${isDarkTheme ? 'text-cyan-100/80' : 'text-sky-800/80'}`}>
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${selectedEquipmentDown ? 'bg-rose-500' : isDarkTheme ? 'bg-cyan-400' : 'bg-sky-500'} ${realtimeAnimationEnabled ? 'animate-pulse' : ''}`} />
                        {selectedEquipmentDown ? 'Flux suspendu' : 'Flux en direct'}
                      </div>
                    </div>
                    <div className={graphPalette.chipSurfaceClass}>
                      <button
                        className={`flex-1 rounded px-3 py-1 ${
                          focusedGraph === 'realtime'
                            ? `${isDarkTheme ? 'bg-cyan-500' : 'bg-sky-600'} ${graphPalette.buttonSelectedTextClass} shadow-sm`
                            : graphPalette.buttonIdleClass
                        }`}
                        onClick={() => setFocusedGraph('realtime')}
                      >
                        Trafic temps réel
                      </button>
                      <button
                        className={`flex-1 rounded px-3 py-1 ${
                          focusedGraph === 'availability'
                            ? `${isDarkTheme ? 'bg-emerald-500' : 'bg-emerald-600'} ${graphPalette.buttonSelectedTextClass} shadow-sm`
                            : graphPalette.buttonIdleClass
                        }`}
                        onClick={() => setFocusedGraph('availability')}
                      >
                        Disponibilité
                      </button>
                      <button
                        className={`flex-1 rounded px-3 py-1 ${
                          focusedGraph === 'consumption'
                            ? `${isDarkTheme ? 'bg-orange-400' : 'bg-amber-600'} ${graphPalette.buttonSelectedTextClass} shadow-sm`
                            : graphPalette.buttonIdleClass
                        } ${excludePressureMetric ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (!excludePressureMetric) {
                            setFocusedGraph('consumption');
                          }
                        }}
                        disabled={excludePressureMetric}
                      >
                        Consommation
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`${graphPalette.chipSurfaceClass} min-w-55`}>
                        <button
                          className={`flex-1 rounded px-3 py-1 ${graphVisualMode === 'curve' ? `${isDarkTheme ? 'bg-white/90 text-slate-950' : 'bg-slate-900 text-white'}` : graphPalette.buttonIdleClass}`}
                          onClick={() => setGraphVisualMode('curve')}
                        >
                          Courbe
                        </button>
                        <button
                          className={`flex-1 rounded px-3 py-1 ${graphVisualMode === 'columns' ? `${isDarkTheme ? 'bg-white/90 text-slate-950' : 'bg-slate-900 text-white'}` : graphPalette.buttonIdleClass}`}
                          onClick={() => setGraphVisualMode('columns')}
                        >
                          Colonnes
                        </button>
                      </div>
                      <Button variant="outline" size="sm" onClick={resetCurrentGraphView} className={graphPalette.outlineButtonClass}>
                        Réinitialiser vue
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportChartPng} className={graphPalette.outlineButtonClass}>
                        <FileUp className="w-4 h-4 mr-2" /> Capturer la vue
                      </Button>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3 space-y-2 ${isDarkTheme ? 'border-slate-700/70 bg-slate-900/45' : 'border-slate-200 bg-slate-50/80'}`}>
                    <p className="text-xs font-medium text-muted-foreground">Nettoyage métriques</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={excludePressureMetric}
                        onChange={(event) => setExcludePressureMetric(event.target.checked)}
                      />
                      Exclure Pression
                    </label>
                  </div>
                </div>

                <div className={`rounded-xl border p-3 ${selectedEquipmentDown ? 'border-rose-500/40 bg-rose-950/15' : isDarkTheme ? 'border-cyan-500/35 bg-cyan-950/10' : 'border-sky-300/70 bg-sky-50/80'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${selectedEquipmentDown ? 'bg-rose-500' : 'bg-emerald-500'} ${realtimeAnimationEnabled ? 'animate-pulse' : ''}`} />
                      <span className="font-medium">
                        {selectedEquipmentDown ? 'Liaison coupée / dégradée détectée' : 'Liaison active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedEquipmentDown ? 'bg-rose-400' : 'bg-cyan-400'} ${realtimeAnimationEnabled ? 'animate-ping' : ''}`} />
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedEquipmentDown ? 'bg-rose-400' : 'bg-cyan-400'} ${realtimeAnimationEnabled ? 'animate-ping [animation-delay:150ms]' : ''}`} />
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedEquipmentDown ? 'bg-rose-400' : 'bg-cyan-400'} ${realtimeAnimationEnabled ? 'animate-ping [animation-delay:300ms]' : ''}`} />
                      {selectedEquipmentDown ? 'Animation stoppée car l équipement est DOWN' : 'Flux télémétrie en circulation'}
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${isDarkTheme ? 'border-slate-700/70 bg-slate-900/45' : 'border-slate-200 bg-slate-50/90'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Services d'investigation</p>
                      <p className="text-xs text-muted-foreground">Affichage à la demande pour garder l'écran lisible.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowInvestigationServices((prev) => !prev)}>
                      {showInvestigationServices ? 'Masquer les services' : 'Afficher les services'}
                    </Button>
                  </div>
                  {showInvestigationServices && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      {investigationServices.map((service) => (
                        <button
                          key={service.id}
                          className={`rounded-md border p-3 text-left transition-colors ${{
                            critical: 'border-rose-500/50 bg-rose-950/20 hover:bg-rose-950/30',
                            degraded: 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/30',
                            ok: 'border-emerald-500/40 bg-emerald-950/15 hover:bg-emerald-950/25',
                          }[service.status]}`}
                          onClick={service.action}
                        >
                          <p className="text-sm font-medium">{service.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 space-y-3 ${isDarkTheme ? 'border-slate-700/70 bg-slate-900/45' : 'border-slate-200 bg-white/95'}`}>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-end">
                    <label className="space-y-1 text-sm xl:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">Période:</span>
                      <select
                        className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                        value={analysisPeriod}
                        onChange={(event) => setAnalysisPeriod(event.target.value as PeriodKey)}
                      >
                        {PERIOD_OPTIONS.map((period) => (
                          <option key={period.key} value={period.key}>
                            {period.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const preset = getPresetRange(analysisPeriod);
                        setRangeStart(format(preset.start, "yyyy-MM-dd'T'HH:mm"));
                        setRangeEnd(format(preset.end, "yyyy-MM-dd'T'HH:mm"));
                      }}
                    >
                      Réappliquer le preset sélectionné
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">De</span>
                      <Input type="datetime-local" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">À</span>
                      <Input type="datetime-local" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={compareEnabled}
                        onChange={(event) => setCompareEnabled(event.target.checked)}
                      />
                      Comparer avec une période précédente
                    </label>

                    {compareEnabled && (
                      <div className="w-full space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Période comparée:</span>
                          <select
                            className="rounded-md border bg-background px-2 py-1 text-sm"
                            value={comparePeriod}
                            onChange={(event) => setComparePeriod(event.target.value as PeriodKey)}
                          >
                            {PERIOD_OPTIONS.map((period) => (
                              <option key={period.key} value={period.key}>
                                {period.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Date début (comparée)</span>
                            <Input
                              type="datetime-local"
                              value={compareRangeStart}
                              onChange={(event) => setCompareRangeStart(event.target.value)}
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Date fin (comparée)</span>
                            <Input
                              type="datetime-local"
                              value={compareRangeEnd}
                              onChange={(event) => setCompareRangeEnd(event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                  <div className={`rounded-xl border p-3 ${isDarkTheme ? 'border-emerald-700/40 bg-emerald-950/22' : 'border-emerald-200 bg-emerald-50/90'}`}>
                    <p className="text-xs text-emerald-300">Disponibilité moyenne ({selectedPeriodLabel})</p>
                    <p className="text-xl font-semibold text-emerald-200">{periodStats.currentAvailabilityAvg.toFixed(1)}%</p>
                    {compareEnabled && (
                      <p className={`text-xs mt-1 ${(periodStats.currentAvailabilityAvg - periodStats.compareAvailabilityAvg) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Δ {(periodStats.currentAvailabilityAvg - periodStats.compareAvailabilityAvg).toFixed(1)} pts
                      </p>
                    )}
                  </div>
                  <div className={`rounded-xl border p-3 ${isDarkTheme ? 'border-orange-700/40 bg-orange-950/22' : 'border-amber-200 bg-amber-50/90'}`}>
                    <p className="text-xs text-orange-300">Consommation moyenne</p>
                    <p className="text-xl font-semibold text-orange-200">{periodStats.currentConsumptionAvg.toFixed(1)}%</p>
                    {compareEnabled && (
                      <p className={`text-xs mt-1 ${(periodStats.currentConsumptionAvg - periodStats.compareConsumptionAvg) <= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Δ {(periodStats.currentConsumptionAvg - periodStats.compareConsumptionAvg).toFixed(1)} pts
                      </p>
                    )}
                  </div>
                  <div className={`rounded-xl border p-3 ${isDarkTheme ? 'border-indigo-700/40 bg-indigo-950/22' : 'border-indigo-200 bg-indigo-50/90'}`}>
                    <p className="text-xs text-indigo-300">SLA cible / écart</p>
                    <p className="text-xl font-semibold text-indigo-200">{model?.slaTarget.toFixed(1)}%</p>
                    <p className={`text-xs mt-1 ${(model?.slaGap ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {(model?.slaGap ?? 0) >= 0 ? '+' : ''}
                      {model?.slaGap.toFixed(1)} pts
                    </p>
                  </div>
                  <div className={`rounded-xl border p-3 ${isDarkTheme ? 'border-slate-700/60 bg-slate-900/70' : 'border-slate-200 bg-slate-100/90'}`}>
                    <p className="text-xs text-slate-300">Alertes surconsommation</p>
                    <p className="text-xl font-semibold text-slate-100">{periodStats.overconsumptionCount}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Impact infra: {model?.infraImpactPercent}% | {model?.totalIncidents} incidents
                    </p>
                  </div>
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${isDarkTheme ? 'border-slate-700/70 bg-slate-900/45' : 'border-slate-200 bg-white/95'}`}>
                  <p className="text-xs font-medium text-muted-foreground">Exports et rapport</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportCsv}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV (comparaison)
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportChartPng}>
                      <FileUp className="w-4 h-4 mr-2" /> Export PNG (graphe)
                    </Button>
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={reportScope}
                      onChange={(event) => setReportScope(event.target.value as 'consumption' | 'availability' | 'both' | 'incidents')}
                    >
                      <option value="consumption">Rapport consommation</option>
                      <option value="availability">Rapport disponibilité</option>
                      <option value="both">Rapport disponibilité + consommation</option>
                      <option value="incidents">Rapport incidents</option>
                    </select>
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={reportFormat}
                      onChange={(event) => setReportFormat(event.target.value as 'pdf' | 'pptx')}
                    >
                      <option value="pdf">PDF</option>
                      <option value="pptx">PPTX</option>
                    </select>
                    <Button size="sm" onClick={generateReport}>
                      <FileText className="w-4 h-4 mr-2" /> Générer rapport
                    </Button>
                  </div>
                </div>

                {focusedGraph === 'realtime' ? (
                  <div className="space-y-3">
                    {/* Live stats row */}
                    {trafficMeta && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-md border border-cyan-700/40 bg-cyan-950/30 p-3">
                          <p className="text-xs text-cyan-300 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> Trafic IN actuel
                          </p>
                          <p className="text-xl font-semibold text-cyan-200">
                            {trafficMeta.currentInMbps != null
                              ? `${trafficMeta.currentInMbps.toFixed(3)} Mbps`
                              : <span className="text-sm text-muted-foreground">Aucun item</span>}
                          </p>
                        </div>
                        <div className="rounded-md border border-violet-700/40 bg-violet-950/30 p-3">
                          <p className="text-xs text-violet-300 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Trafic OUT actuel
                          </p>
                          <p className="text-xl font-semibold text-violet-200">
                            {trafficMeta.currentOutMbps != null
                              ? `${trafficMeta.currentOutMbps.toFixed(3)} Mbps`
                              : <span className="text-sm text-muted-foreground">Aucun item</span>}
                          </p>
                        </div>
                        <div className="rounded-md border border-rose-700/40 bg-rose-950/30 p-3">
                          <p className="text-xs text-rose-300 flex items-center gap-1">
                            <ZapOff className="w-3 h-3" /> Downtime Zabbix ({selectedPeriodLabel})
                          </p>
                          <p className="text-xl font-semibold text-rose-200">
                            {trafficMeta.realDowntimeSec != null && trafficMeta.realDowntimeSec > 0
                              ? formatDuration(trafficMeta.realDowntimeSec)
                              : <span className="text-sm text-emerald-300">0 downtime</span>}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Traffic chart */}
                    <div
                      ref={chartContainerRef}
                      className={graphPalette.chartShellClass}
                      style={{ cursor: isDraggingChart ? 'grabbing' : 'grab' }}
                      onPointerDownCapture={onChartPointerDown}
                      onPointerMoveCapture={onChartPointerMove}
                      onPointerUpCapture={onChartPointerUp}
                      onPointerCancelCapture={stopChartDrag}
                      onMouseLeave={stopChartDrag}
                      onDoubleClick={onChartDoubleClick}
                      onWheelCapture={onChartWheel}
                      onWheel={onChartWheel}
                      onTouchStartCapture={onChartTouchStart}
                      onTouchMoveCapture={onChartTouchMove}
                      onTouchEndCapture={onChartTouchEnd}
                      onTouchStart={onChartTouchStart}
                      onTouchMove={onChartTouchMove}
                      onTouchEnd={onChartTouchEnd}
                      onContextMenu={onChartContextMenu}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Équipement:</span>
                          <select
                            className="rounded-md border bg-background px-2 py-1.5 text-sm"
                            value={selectedEquipmentId}
                            onChange={(event) => setSelectedEquipmentId(event.target.value)}
                          >
                            {equipmentOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          {realTrafficPoints.length > 0 ? (
                            <Badge className="text-xs bg-emerald-500/85 text-slate-950 border-0">
                              <Zap className="w-3 h-3 mr-1" />
                              Source réelle — {trafficMeta?.source === 'zabbix' ? 'Zabbix' : 'LibreNMS'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-300 border-amber-500/60">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Source temps réel indisponible
                            </Badge>
                          )}
                          <button
                            className="p-1 rounded hover:bg-muted disabled:opacity-50"
                            onClick={() => void loadTrafficData()}
                            disabled={isTrafficLoading}
                            title="Rafraîchir les données"
                          >
                            <RefreshCw className={`w-4 h-4 ${isTrafficLoading ? 'animate-spin text-cyan-400' : 'text-muted-foreground'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/8 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/75">Fenêtre visible</p>
                          <p className="text-sm font-medium text-cyan-50">
                            {visibleRealtimePoints.length > 0
                              ? `${formatTimeAxisLabel(visibleRealtimePoints[0].ts, visibleRealtimePoints.length)} → ${formatTimeAxisLabel(visibleRealtimePoints[visibleRealtimePoints.length - 1].ts, visibleRealtimePoints.length)}`
                              : 'Temps réel'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-rose-200/75">État liaison</p>
                          <p className={`text-sm font-medium ${selectedEquipmentDown ? 'text-rose-200' : 'text-emerald-200'}`}>
                            {selectedEquipmentDown ? 'DOWN ou dégradé' : 'UP / stable'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-violet-200/75">Granularité</p>
                          <p className="text-sm font-medium text-violet-50">
                            {visibleRealtimePoints.length <= 24 ? 'minutes' : visibleRealtimePoints.length <= 96 ? 'heures' : visibleRealtimePoints.length <= 370 ? 'jours' : 'mois / années'}
                          </p>
                        </div>
                      </div>
                      <div className="h-[calc(100%-7rem)] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {investigatedTrafficPoints.length > 0 ? (
                            <LineChart data={visibleRealtimePoints} margin={{ top: 12, right: 24, left: 0, bottom: 12 }}>
                              <defs>
                                <linearGradient id="realtimeInStroke" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={graphPalette.realtimeInStart} />
                                  <stop offset="100%" stopColor={graphPalette.realtimeInEnd} />
                                </linearGradient>
                                <linearGradient id="realtimeOutStroke" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={graphPalette.realtimeOutStart} />
                                  <stop offset="100%" stopColor={graphPalette.realtimeOutEnd} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} />
                              {visibleDowntimeBands.map((band, index) => (
                                <ReferenceArea key={`${band.start}-${band.end}-${index}`} x1={band.start} x2={band.end} fill="#ef4444" fillOpacity={0.12} ifOverflow="extendDomain" />
                              ))}
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: graphPalette.axisTick }}
                                minTickGap={26}
                                interval="preserveStartEnd"
                                tickFormatter={(_label, index) => {
                                  const point = visibleRealtimePoints[index];
                                  return point ? formatTimeAxisLabel(point.ts, visibleRealtimePoints.length) : '';
                                }}
                              />
                              <YAxis domain={realtimeDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} unit=" Mb/s" width={74} />
                              <ReferenceLine y={0} stroke={graphPalette.grid} strokeOpacity={0.5} />
                              <RechartsTooltip
                                formatter={(value: number, name: string) => [
                                  `${Number(value).toFixed(3)} Mbps`,
                                  name === 'inMbps' ? '⬇ IN' : name === 'outMbps' ? '⬆ OUT' : name === 'downMarker' ? 'DOWN detecte' : 'UP detecte',
                                ]}
                                labelFormatter={(_label, payload) => {
                                  const point = payload?.[0]?.payload as { ts?: number } | undefined;
                                  return point?.ts ? `Horodatage: ${format(new Date(point.ts), 'dd/MM/yyyy HH:mm:ss')}` : 'Horodatage';
                                }}
                                contentStyle={{
                                  backgroundColor: isDarkTheme ? '#020617' : '#ffffff',
                                  borderColor: isDarkTheme ? '#334155' : '#cbd5e1',
                                  borderRadius: 12,
                                }}
                              />
                              <Line type="monotone" dataKey="inMbps" stroke="url(#realtimeInStroke)" strokeWidth={3} dot={false} name="inMbps" connectNulls={false} isAnimationActive={realtimeAnimationEnabled} animationDuration={700} animationEasing="ease-out" />
                              <Line type="monotone" dataKey="outMbps" stroke="url(#realtimeOutStroke)" strokeWidth={2.8} dot={false} name="outMbps" connectNulls={false} isAnimationActive={realtimeAnimationEnabled} animationDuration={850} animationEasing="ease-out" />
                              <Line type="linear" dataKey="downMarker" stroke="transparent" name="downMarker" dot={{ r: 5, fill: '#ef4444', stroke: '#fecaca', strokeWidth: 1.5 }} activeDot={{ r: 7 }} isAnimationActive={false} />
                              <Line type="linear" dataKey="upMarker" stroke="transparent" name="upMarker" dot={{ r: 5, fill: '#22c55e', stroke: '#bbf7d0', strokeWidth: 1.5 }} activeDot={{ r: 7 }} isAnimationActive={false} />
                            </LineChart>
                          ) : (
                            <LineChart data={realtimeTraffic} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} vertical horizontal />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: graphPalette.axisTick }} minTickGap={26} interval="preserveStartEnd" />
                              <YAxis domain={realtimeDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} unit="%" />
                              <RechartsTooltip formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Charge trafic (sim.)']} />
                              <Line type="monotone" dataKey="usage" stroke={graphPalette.consumption} strokeWidth={2.6} dot={false} isAnimationActive={realtimeAnimationEnabled} animationDuration={500} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                        </div>
                      {investigatedTrafficPoints.length > 0 && (
                          <div className={`flex items-center gap-4 text-xs mt-2 ${graphPalette.legendTextClass}`}>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-cyan-400" /> ⬇ Trafic IN (Mbps)</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-purple-400" /> ⬆ Trafic OUT (Mbps)</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-rose-400" /> DOWN</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> UP</span>
                            <span className="text-rose-300">La courbe se coupe sur les fenêtres d indisponibilité confirmées.</span>
                          <span className="ml-auto">Rafraîchi toutes les 30s</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : focusedGraph === 'availability' ? (
                  <div
                    ref={chartContainerRef}
                    className={graphPalette.secondaryChartClass}
                    style={{ cursor: isDraggingChart ? 'grabbing' : 'grab' }}
                    onPointerDownCapture={onChartPointerDown}
                    onPointerMoveCapture={onChartPointerMove}
                    onPointerUpCapture={onChartPointerUp}
                    onPointerCancelCapture={stopChartDrag}
                    onMouseLeave={stopChartDrag}
                    onDoubleClick={onChartDoubleClick}
                    onWheelCapture={onChartWheel}
                    onWheel={onChartWheel}
                    onTouchStartCapture={onChartTouchStart}
                    onTouchMoveCapture={onChartTouchMove}
                    onTouchEndCapture={onChartTouchEnd}
                    onTouchStart={onChartTouchStart}
                    onTouchMove={onChartTouchMove}
                    onTouchEnd={onChartTouchEnd}
                    onContextMenu={onChartContextMenu}
                  >
                      <ResponsiveContainer width="100%" height="100%">
                        {graphVisualMode === 'columns' ? (
                          <BarChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} vertical horizontal />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: graphPalette.axisTick }} minTickGap={20} interval="preserveStartEnd" tickFormatter={(_label, index) => {
                              const point = visibleChartSeries[index];
                              return point?.timestamp ? formatTimeAxisLabel(point.timestamp, visibleChartSeries.length) : '';
                            }} />
                            <YAxis domain={availabilityDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} />
                            <ReferenceLine y={model?.slaTarget} stroke="#22c55e" strokeDasharray="4 3" ifOverflow="extendDomain" />
                            <RechartsTooltip
                              formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Disponibilité']}
                              labelFormatter={(_label, payload) => {
                                const ts = (payload as {payload?: {timestamp?: number}}[])?.[0]?.payload?.timestamp;
                                return ts ? `${format(new Date(ts), 'dd/MM/yyyy HH:mm')}` : `Période: ${_label}`;
                              }}
                            />
                            <Bar dataKey="availability" fill={graphPalette.availability} radius={[4, 4, 0, 0]} />
                            {compareEnabled && <Bar dataKey="compareAvailability" fill={graphPalette.compare} radius={[4, 4, 0, 0]} />}
                          </BarChart>
                        ) : (
                          <AreaChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                        <defs>
                          <linearGradient id="availabilityFillPage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={graphPalette.availability} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={graphPalette.availability} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} vertical horizontal />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: graphPalette.axisTick }} minTickGap={20} interval="preserveStartEnd" tickFormatter={(_label, index) => {
                          const point = visibleChartSeries[index];
                          return point?.timestamp ? formatTimeAxisLabel(point.timestamp, visibleChartSeries.length) : '';
                        }} />
                        <YAxis domain={availabilityDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} />
                        <ReferenceLine y={model?.slaTarget} stroke="#22c55e" strokeDasharray="4 3" ifOverflow="extendDomain" />
                        <RechartsTooltip
                          formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Disponibilité']}
                          labelFormatter={(_label, payload) => {
                            const ts = (payload as {payload?: {timestamp?: number}}[])?.[0]?.payload?.timestamp;
                            return ts ? `${format(new Date(ts), 'dd/MM/yyyy HH:mm')}` : `Période: ${_label}`;
                          }}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="availability"
                          stroke={graphPalette.availability}
                          strokeWidth={2}
                          fill="url(#availabilityFillPage)"
                          connectNulls={false}
                        />
                        {compareEnabled && (
                          <Area
                            type="stepAfter"
                            dataKey="compareAvailability"
                            stroke={graphPalette.compare}
                            strokeWidth={2}
                            fillOpacity={0}
                            connectNulls={false}
                          />
                        )}
                      </AreaChart>
                        )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div
                    ref={chartContainerRef}
                    className={graphPalette.secondaryChartClass}
                    style={{ cursor: isDraggingChart ? 'grabbing' : 'grab' }}
                    onPointerDownCapture={onChartPointerDown}
                    onPointerMoveCapture={onChartPointerMove}
                    onPointerUpCapture={onChartPointerUp}
                    onPointerCancelCapture={stopChartDrag}
                    onMouseLeave={stopChartDrag}
                    onDoubleClick={onChartDoubleClick}
                    onWheelCapture={onChartWheel}
                    onWheel={onChartWheel}
                    onTouchStartCapture={onChartTouchStart}
                    onTouchMoveCapture={onChartTouchMove}
                    onTouchEndCapture={onChartTouchEnd}
                    onTouchStart={onChartTouchStart}
                    onTouchMove={onChartTouchMove}
                    onTouchEnd={onChartTouchEnd}
                    onContextMenu={onChartContextMenu}
                  >
                      <ResponsiveContainer width="100%" height="100%">
                        {graphVisualMode === 'columns' ? (
                          <BarChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} vertical horizontal />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: graphPalette.axisTick }} minTickGap={20} interval="preserveStartEnd" tickFormatter={(_label, index) => {
                          const point = visibleChartSeries[index];
                          return point?.timestamp ? formatTimeAxisLabel(point.timestamp, visibleChartSeries.length) : '';
                        }} />
                        <YAxis domain={consumptionDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} />
                        <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 3" ifOverflow="extendDomain" />
                        <RechartsTooltip
                          formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Consommation']}
                          labelFormatter={(_label, payload) => {
                            const ts = (payload as {payload?: {timestamp?: number}}[])?.[0]?.payload?.timestamp;
                            return ts ? `${format(new Date(ts), 'dd/MM/yyyy HH:mm')}` : `Période: ${_label}`;
                          }}
                        />
                        {!excludePressureMetric && <Bar dataKey="consumption" fill={graphPalette.consumption} radius={[4, 4, 0, 0]} />}
                        {compareEnabled && !excludePressureMetric && (
                          <Bar dataKey="compareConsumption" fill={graphPalette.compare} radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                        ) : (
                          <LineChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={graphPalette.grid} vertical horizontal />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: graphPalette.axisTick }} minTickGap={20} interval="preserveStartEnd" tickFormatter={(_label, index) => {
                              const point = visibleChartSeries[index];
                              return point?.timestamp ? formatTimeAxisLabel(point.timestamp, visibleChartSeries.length) : '';
                            }} />
                            <YAxis domain={consumptionDomain} tick={{ fontSize: 11, fill: graphPalette.axisTick }} />
                            <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 3" ifOverflow="extendDomain" />
                            <RechartsTooltip
                              formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Consommation']}
                              labelFormatter={(_label, payload) => {
                                const ts = (payload as {payload?: {timestamp?: number}}[])?.[0]?.payload?.timestamp;
                                return ts ? `${format(new Date(ts), 'dd/MM/yyyy HH:mm')}` : `Période: ${_label}`;
                              }}
                            />
                            {!excludePressureMetric && <Line type="stepAfter" dataKey="consumption" stroke={graphPalette.consumption} strokeWidth={2.4} dot={false} isAnimationActive={realtimeAnimationEnabled} />}
                            {compareEnabled && !excludePressureMetric && <Line type="stepAfter" dataKey="compareConsumption" stroke={graphPalette.compare} strokeWidth={2.2} dot={false} isAnimationActive={realtimeAnimationEnabled} />}
                          </LineChart>
                        )}
                    </ResponsiveContainer>
                  </div>
                )}

                {excludePressureMetric && focusedGraph === 'consumption' && (
                  <p className="text-sm text-muted-foreground">La métrique Pression/Consommation est exclue par le filtre actif.</p>
                )}

                {graphContextMenu.open && (
                  <div
                    className={graphPalette.menuClass}
                    style={{ left: graphContextMenu.x, top: graphContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        void exportChartPng();
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <FileUp className="mr-2 h-4 w-4" /> Télécharger la vue PNG
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        resetCurrentGraphView();
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser zoom et déplacement
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        focusLatestIncidentWindow();
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <Activity className="mr-2 h-4 w-4" /> Focus dernière panne
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        void runQuickConclusion();
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <Network className="mr-2 h-4 w-4" /> Lancer conclusion rapide
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        void loadConnectivity();
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <Zap className="mr-2 h-4 w-4" /> Tester la connectivité
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        setFocusedGraph('availability');
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" /> Basculer sur disponibilité
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        setFocusedGraph('consumption');
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <TrendingDown className="mr-2 h-4 w-4" /> Basculer sur consommation
                    </button>
                    <button
                      className={graphPalette.menuButtonClass}
                      onClick={() => {
                        setFocusedGraph('realtime');
                        setGraphContextMenu((p) => ({ ...p, open: false }));
                      }}
                    >
                      <Activity className="mr-2 h-4 w-4" /> Basculer sur temps réel
                    </button>
                    <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      Statut équipement: {selectedEquipmentDown ? 'DOWN/dégradé' : 'UP'}
                      {latestAvailabilityPoint?.availability != null && ` • Disponibilité actuelle: ${Number(latestAvailabilityPoint.availability).toFixed(1)}%`}
                      {latestConsumptionPoint?.consumption != null && ` • Consommation actuelle: ${Number(latestConsumptionPoint.consumption).toFixed(1)}%`}
                    </div>
                  </div>
                )}

                {historyAlerts.length > 0 && (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Alertes (dépassement et anomalies)</p>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {historyAlerts.map((alert, index) => (
                        <div
                          key={`${alert.timestamp}-${index}`}
                          className={`rounded-md border p-2 text-sm ${alert.level === 'critical' ? 'border-rose-500/50 bg-rose-950/20' : 'border-amber-500/50 bg-amber-950/20'}`}
                        >
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm:ss')} | {alert.type}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Graphique des incidents</p>
                    <Button variant="outline" size="sm" onClick={() => setShowIncidentChart((prev) => !prev)}>
                      {showIncidentChart ? 'Masquer incidents' : 'Afficher incidents'}
                    </Button>
                  </div>
                  {showIncidentChart && (
                    <div ref={incidentChartRef} className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={model?.severityDistribution} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical horizontal />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <RechartsTooltip formatter={(value: number) => [value, 'Incidents']} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {model?.severityDistribution.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
              ) : (
                <Card className="border-rose-400/40 bg-rose-950/20">
                  <CardHeader>
                    <CardTitle>Graphes indisponibles</CardTitle>
                    <CardDescription>
                      Aucun jeu de données client n'est disponible pour la modélisation.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              <div className="absolute top-0 h-0 w-0 overflow-hidden pointer-events-none" style={{ left: '-9999px' }} aria-hidden="true">
                <div ref={availabilityReportChartRef} className="h-80 bg-white p-4" style={{ width: '900px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="availabilityFillReport" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical horizontal />
                      <XAxis dataKey="label" />
                      <YAxis domain={availabilityDomain} />
                      <Area type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2.5} fill="url(#availabilityFillReport)" connectNulls />
                      {compareEnabled && <Area type="monotone" dataKey="compareAvailability" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} connectNulls />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div ref={consumptionReportChartRef} className="h-80 bg-white p-4" style={{ width: '900px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleChartSeries} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical horizontal />
                      <XAxis dataKey="label" />
                      <YAxis domain={consumptionDomain} />
                      {!excludePressureMetric && <Line type="monotone" dataKey="consumption" stroke="#06b6d4" strokeWidth={2.5} dot={false} />}
                      {compareEnabled && !excludePressureMetric && <Line type="monotone" dataKey="compareConsumption" stroke="#f59e0b" strokeWidth={2} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div ref={incidentsReportChartRef} className="h-56 bg-white p-4" style={{ width: '700px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={model?.severityDistribution} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical horizontal />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {model?.severityDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleDetailsSection('incidents')}>
                    {detailsSections.incidents ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                    Incidents ({client.zabbix_incidents.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleDetailsSection('downEquipments')}>
                    {detailsSections.downEquipments ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                    Équipements DOWN ({client.down_equipments_count})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleDetailsSection('interventions')}>
                    {detailsSections.interventions ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                    Interventions ({interventions.length})
                  </Button>
                </div>

                {detailsSections.incidents && (
                  <Card>
                    <CardContent className="space-y-2 max-h-105 overflow-y-auto p-4 pr-1">
                      {client.zabbix_incidents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun incident actif.</p>
                      ) : (
                        client.zabbix_incidents.map((incident) => (
                          <div key={incident.eventid} className="rounded-md border p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{incident.name}</p>
                              <Badge variant={incident.severity >= 4 ? 'destructive' : 'secondary'}>{incident.severity_label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(incident.clock), 'dd/MM/yyyy HH:mm:ss')}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}

                {detailsSections.downEquipments && (
                  <Card>
                    <CardContent className="space-y-2 max-h-105 overflow-y-auto p-4">
                      {client.down_equipments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun équipement DOWN.</p>
                      ) : (
                        client.down_equipments.map((equipment) => (
                          <div key={equipment.id} className="rounded-md border p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{equipment.code}</p>
                              <Badge variant="destructive">{equipment.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {equipment.type} | {equipment.model} | SN: {equipment.serialNumber}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}

                {detailsSections.interventions && (
                  <Card>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto p-4 pr-1">
                      {isInterventionsLoading ? (
                        <p className="text-sm text-muted-foreground">Chargement des interventions...</p>
                      ) : interventions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
                      ) : (
                        interventions.map((intervention, index) => (
                          <div key={`${intervention.title}-${index}`} className="rounded-md border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">{intervention.title || 'Intervention'}</p>
                              <Badge variant="outline">{intervention.status || 'N/A'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {intervention.intervention_type || '-'} | Technicien: {intervention.technician_name || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Début: {formatReportDateTime(intervention.start_at)} | Fin: {formatReportDateTime(intervention.end_at)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Ticket: {intervention.ticket_ref || '-'}</span>
                              {intervention.ticket_ref && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => router.push(`/tickets?search=${encodeURIComponent(intervention.ticket_ref ?? '')}`)}
                                >
                                  Ouvrir ticket
                                </Button>
                              )}
                            </div>
                            {intervention.notes && (
                              <p className="text-xs mt-2 text-slate-300">{intervention.notes}</p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ── Zabbix UP/DOWN Events Investigation Panel ── */}
              {(zabbixEvents.length > 0 || trafficMeta !== null) && (
                <Card className="border-slate-700/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        Événements UP/DOWN — Investigation terrain
                        {zabbixEvents.length > 0 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {zabbixEvents.length} événement(s)
                          </Badge>
                        )}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowEventsPanel((p) => !p)}>
                        {showEventsPanel ? 'Réduire' : 'Développer'}
                      </Button>
                    </div>
                    <CardDescription>
                      Historique réel des coupures et rétablissements — Source Zabbix ({selectedPeriodLabel})
                    </CardDescription>
                    {activeDownSinceTs && (
                      <p className="text-xs text-rose-300">
                        Client DOWN depuis: {format(new Date(activeDownSinceTs), 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                    )}
                  </CardHeader>
                  {showEventsPanel && (
                    <CardContent className="space-y-4">
                      {zabbixEvents.length === 0 ? (
                        <div className="rounded-md border border-emerald-700/30 bg-emerald-950/20 p-4 text-sm text-emerald-300 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Aucune coupure détectée sur cette période — service stable
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {zabbixEvents.map((event) => (
                            <div
                              key={event.eventid}
                              className={`rounded-md border p-3 flex items-start justify-between gap-3 ${
                                event.type === 'DOWN'
                                  ? 'border-rose-500/50 bg-rose-950/20'
                                  : 'border-emerald-500/40 bg-emerald-950/10'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`mt-0.5 shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                                  event.type === 'DOWN' ? 'bg-rose-500/20' : 'bg-emerald-500/20'
                                }`}>
                                  {event.type === 'DOWN'
                                    ? <ZapOff className="h-3.5 w-3.5 text-rose-400" />
                                    : <Zap className="h-3.5 w-3.5 text-emerald-400" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{event.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{event.label}</p>
                                  {event.type === 'DOWN' && event.durationSec != null && (
                                    <p className={`text-xs mt-1 font-medium ${
                                      event.durationSec > 3600 ? 'text-rose-400' : event.durationSec > 300 ? 'text-amber-400' : 'text-yellow-300'
                                    }`}>
                                      Durée: {formatDuration(event.durationSec)}
                                      {event.durationSec > 3600 ? ' ⚠️ Impact majeur' : event.durationSec > 300 ? ' ⚠️' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={event.type === 'DOWN' ? 'destructive' : 'secondary'} className="text-xs">
                                  {event.type === 'DOWN' ? '🔴 DOWN' : '🟢 UP'}
                                </Badge>
                                {event.severity > 0 && (
                                  <span className="text-xs text-muted-foreground">{getSeverityLabel(event.severity)}</span>
                                )}
                                {event.acknowledged && (
                                  <span className="text-xs text-emerald-400">✓ Acquitté</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
                        <div className="rounded-md bg-rose-950/20 border border-rose-700/40 p-3 text-center">
                          <p className="text-2xl font-bold text-rose-300">{zabbixEvents.filter((e) => e.type === 'DOWN').length}</p>
                          <p className="text-xs text-rose-400 mt-1">Coupures</p>
                        </div>
                        <div className="rounded-md bg-emerald-950/20 border border-emerald-700/40 p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-300">{zabbixEvents.filter((e) => e.type === 'UP').length}</p>
                          <p className="text-xs text-emerald-400 mt-1">Rétablissements</p>
                        </div>
                        <div className="rounded-md bg-slate-900/40 border border-slate-700/40 p-3 text-center">
                          <p className="text-2xl font-bold text-slate-200">
                            {trafficMeta?.realDowntimeSec != null && trafficMeta.realDowntimeSec > 0
                              ? formatDuration(trafficMeta.realDowntimeSec)
                              : '0'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Downtime total</p>
                        </div>
                        <div className="rounded-md bg-indigo-950/20 border border-indigo-700/40 p-3 text-center">
                          <p className="text-2xl font-bold text-indigo-200">
                            {zabbixEvents.some((e) => e.type === 'DOWN' && !e.acknowledged)
                              ? <span className="text-rose-400">Oui</span>
                              : <span className="text-emerald-400">Non</span>}
                          </p>
                          <p className="text-xs text-indigo-400 mt-1">Non acquittés</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
