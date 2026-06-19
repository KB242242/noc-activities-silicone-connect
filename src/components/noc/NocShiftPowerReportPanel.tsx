'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertCircle, CheckCircle2, Loader2, Route, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NocSiteRoundPanel } from '@/components/noc/NocSiteRoundPanel';

type ReportType = 'daily' | 'night';
type ReportPhase = 'waiting' | 'in_progress' | 'ready';

type ReportClient = {
  clientRef: string;
  clientName: string;
  serviceType: string;
  locality: string;
  ipClient: string;
  morningRxDbm: number | null;
  eveningRxDbm: number | null;
  status: string;
  equipmentStatus: string;
  remark: string;
  remarkSeverity: 'GOOD' | 'WARN' | 'CRITICAL' | 'PARTIAL' | 'UNKNOWN';
};

type ReportSection = {
  key: string;
  title: string;
  clients: ReportClient[];
};

type ReportResponse = {
  success: boolean;
  reportType: ReportType;
  reportPhase?: ReportPhase;
  canGenerate?: boolean;
  ready?: boolean;
  windowLabel?: string;
  documentTitle?: string;
  fileBaseName?: string;
  statusReadyMessage?: string;
  cutoffMessage?: string;
  pendingMessage?: string;
  expectedReadinessLabel?: string;
  entryLabel?: string;
  exitLabel?: string;
  reportTypeLabel?: string;
  statusLabel: string;
  date: {
    iso: string;
    label: string;
  };
  schedule: {
    morningHour: number;
    eveningHour: number;
    morningLabel: string;
    eveningLabel: string;
  };
  meta: {
    supervisor: {
      name: string;
      phone: string;
    };
    operatorPhones: string[];
    operators: string[];
    entryTime: string;
    exitTime: string;
  };
  sections: ReportSection[];
  settings?: {
    timeZone: string;
    daily: {
      readyHour: number;
      cutoffHour: number;
    };
    night: {
      readyHour: number;
      cutoffHour: number;
    };
  };
  error?: string;
};

type PlanningApiResponse = {
  success: boolean;
  planning?: Array<{
    date: string;
    shifts: Array<{
      dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
      agents: Array<{
        name: string;
        isResting?: boolean;
      }>;
    }>;
  }>;
};

type Props = {
  reportType: ReportType;
  connectedUserRole?: string | null;
  connectedUserId?: string | null;
};

const LIVE_REFRESH_INTERVAL_MS = 10_000;
const REPORT_NOTICE_DISMISSALS_KEY = 'noc_reporting_notice_dismissals_v1';
const REPORT_READY_NOTIFICATIONS_KEY = 'noc_reporting_ready_notifications_v1';

type ExportRow = {
  clientRef: string;
  clientName: string;
  serviceType: string;
  locality: string;
  ipClient: string;
  morningRxDbm: number | null;
  eveningRxDbm: number | null;
  status: string;
  equipmentStatus: string;
  remark: string;
  remarkSeverity: ReportClient['remarkSeverity'];
};

function formatDbm(value: number | null) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(2)} dBm`;
}

function reportTypeLabel(reportType: ReportType) {
  return reportType === 'daily' ? 'Rapport journalier' : 'Rapport de nuit';
}

function toFrenchMonthLabel(monthIndex: number) {
  const months = [
    'janvier',
    'fevrier',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'aout',
    'septembre',
    'octobre',
    'novembre',
    'decembre',
  ];
  return months[monthIndex] ?? '';
}

function buildDownloadFileName(baseName: string | undefined, extension: 'pdf' | 'xlsx') {
  return `${baseName || 'rapport'}.${extension}`;
}

function getPlanningAnchorDate(reportType: ReportType, now = new Date()) {
  const anchor = new Date(now);

  if (reportType === 'night' && now.getHours() < 6) {
    anchor.setDate(anchor.getDate() - 1);
  }

  return anchor;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRemarkSeverityStyles(severity: ReportClient['remarkSeverity']) {
  if (severity === 'GOOD') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30';
  }

  if (severity === 'WARN') {
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/30';
  }

  if (severity === 'CRITICAL') {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30';
  }

  if (severity === 'PARTIAL') {
    return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600';
}

function getRemarkSeverityFill(severity: ReportClient['remarkSeverity']) {
  if (severity === 'GOOD') return [220, 252, 231] as const;
  if (severity === 'WARN') return [254, 215, 170] as const;
  if (severity === 'CRITICAL') return [254, 202, 202] as const;
  if (severity === 'PARTIAL') return [252, 231, 183] as const;
  return [226, 232, 240] as const;
}

async function fetchPublicImageDataUrl(imagePath: string): Promise<string | null> {
  try {
    const response = await fetch(imagePath, { cache: 'no-store' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Conversion logo impossible'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('Lecture logo impossible'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function NocShiftPowerReportPanel({ reportType, connectedUserRole, connectedUserId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [operatorsFromPlanning, setOperatorsFromPlanning] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<'all' | 'brazzaville' | 'pointe-noire'>('all');
  const [exportAction, setExportAction] = useState<string | undefined>(undefined);
  const [showSiteRoundPanel, setShowSiteRoundPanel] = useState(false);
  const [dismissedNoticeKeys, setDismissedNoticeKeys] = useState<string[]>([]);
  const [readyNotificationKeys, setReadyNotificationKeys] = useState<string[]>([]);
  const [showReportingSettings, setShowReportingSettings] = useState(false);
  const [savingReportingSettings, setSavingReportingSettings] = useState(false);
  const [pendingExportConfirmOpen, setPendingExportConfirmOpen] = useState(false);
  const pendingExportResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [reportingSettings, setReportingSettings] = useState<NonNullable<ReportResponse['settings']>>({
    timeZone: 'Africa/Brazzaville',
    daily: { readyHour: 18, cutoffHour: 21 },
    night: { readyHour: 6, cutoffHour: 10 },
  });
  const lastNoticeRef = useRef<string | null>(null);
  const previousReadyRef = useRef<boolean>(false);
  const hasLoadedRef = useRef(false);

  const normalizedRole = String(connectedUserRole ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
  const isAdminUser = normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN' || normalizedRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(REPORT_NOTICE_DISMISSALS_KEY);
      if (!raw) {
        setDismissedNoticeKeys([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setDismissedNoticeKeys(parsed.map((value) => String(value)));
        return;
      }

      setDismissedNoticeKeys([]);
    } catch {
      setDismissedNoticeKeys([]);
    }
  }, [connectedUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(REPORT_READY_NOTIFICATIONS_KEY);
      if (!raw) {
        setReadyNotificationKeys([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setReadyNotificationKeys(parsed.map((value) => String(value)));
        return;
      }

      setReadyNotificationKeys([]);
    } catch {
      setReadyNotificationKeys([]);
    }
  }, [connectedUserId]);

  useEffect(() => {
    let active = true;
    hasLoadedRef.current = false;

    const run = async () => {
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/noc/reporting/shift-power?type=${reportType}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as ReportResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Erreur de chargement du rapport.');
        }

        if (active) {
          setReport(payload);
          if (payload.settings) {
            setReportingSettings(payload.settings);
          }
          hasLoadedRef.current = true;
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    const interval = setInterval(() => {
      void run();
    }, LIVE_REFRESH_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [reportType]);

  useEffect(() => {
    let active = true;

    const loadPlanningOperators = async () => {
      const anchorDate = getPlanningAnchorDate(reportType);
      const month = anchorDate.getMonth() + 1;
      const year = anchorDate.getFullYear();
      const dateKey = toLocalDateKey(anchorDate);

      try {
        const res = await fetch(`/api/planning?month=${month}&year=${year}`, { cache: 'no-store' });
        const payload = (await res.json()) as PlanningApiResponse;

        if (!res.ok || !payload.success || !payload.planning) return;

        const targetDayType = reportType === 'daily' ? 'DAY_SHIFT' : 'NIGHT_SHIFT';
        const currentDay = payload.planning.find((d) => d.date === dateKey);
        if (!currentDay) return;

        const names = new Set<string>();

        for (const shift of currentDay.shifts) {
          if (shift.dayType !== targetDayType) continue;
          for (const agent of shift.agents) {
            if (!agent.name || agent.isResting) continue;
            names.add(agent.name);
          }
        }

        if (active) {
          setOperatorsFromPlanning(Array.from(names));
        }
      } catch {
        // Keep fallback meta from reporting payload if planning fails.
      }
    };

    void loadPlanningOperators();

    return () => {
      active = false;
    };
  }, [reportType]);

  const operatorsLabel = useMemo(() => {
    const fromPlanning = operatorsFromPlanning.filter(Boolean);
    if (fromPlanning.length > 0) return fromPlanning.join(' / ');
    const fromReport = report?.meta.operators?.filter(Boolean) ?? [];
    if (fromReport.length > 0) return fromReport.join(' / ');
    return 'Aucun opérateur trouvé dans le planning NOC';
  }, [operatorsFromPlanning, report?.meta.operators]);

  const visibleSections = useMemo(() => {
    if (!report) return [];
    if (clientFilter === 'all') return report.sections;
    return report.sections.filter((section) => section.key === clientFilter);
  }, [clientFilter, report]);

  const mergedClients = useMemo(() => {
    if (clientFilter !== 'all') return null;
    return visibleSections.flatMap((section) => section.clients);
  }, [clientFilter, visibleSections]);

  const exportRows = useMemo<ExportRow[]>(() => {
    if (clientFilter === 'all') return mergedClients ?? [];
    return visibleSections.flatMap((section) => section.clients);
  }, [clientFilter, mergedClients, visibleSections]);

  const reportNotice = useMemo(() => {
    if (!report) return null;
    if (report.canGenerate === false) return report.cutoffMessage ?? null;
    if (report.ready) return report.statusReadyMessage ?? null;
    return report.pendingMessage ?? null;
  }, [report]);

  const reportNoticeKey = useMemo(() => {
    if (!reportNotice || !report) return null;
    const userKey = connectedUserId ?? 'anonymous';
    const reportDay = String(report.date.iso).slice(0, 10);
    return `${userKey}::${reportType}::${reportDay}::${reportNotice}`;
  }, [connectedUserId, report, reportNotice, reportType]);

  const reportReadyNotificationKey = useMemo(() => {
    if (!report) return null;
    const userKey = connectedUserId ?? 'anonymous';
    const reportDay = String(report.date.iso).slice(0, 10);
    return `${userKey}::${reportType}::${reportDay}::ready`;
  }, [connectedUserId, report, reportType]);

  const persistDismissedNotice = useCallback((noticeKey: string) => {
    setDismissedNoticeKeys((previous) => {
      if (previous.includes(noticeKey)) return previous;
      const next = [...previous, noticeKey].slice(-300);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REPORT_NOTICE_DISMISSALS_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const persistReadyNotificationKey = useCallback((notificationKey: string) => {
    setReadyNotificationKeys((previous) => {
      if (previous.includes(notificationKey)) return previous;
      const next = [...previous, notificationKey].slice(-300);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REPORT_READY_NOTIFICATIONS_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const isReportNoticeDismissed = Boolean(reportNoticeKey && dismissedNoticeKeys.includes(reportNoticeKey));

  useEffect(() => {
    if (!report) return;

    const isReadyNow = Boolean(report.ready);
    const becameReady = !previousReadyRef.current && isReadyNow;
    previousReadyRef.current = isReadyNow;

    if (!becameReady) return;
    if (!reportReadyNotificationKey) return;
    if (readyNotificationKeys.includes(reportReadyNotificationKey)) return;

    const readyMessage = report.statusReadyMessage
      ?? (reportType === 'daily' ? 'Le rapport journalier est prêt.' : 'Le rapport de nuit est prêt.');

    toast.success(readyMessage);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const showDesktopReadyNotification = () => {
        try {
          const title = reportType === 'daily' ? 'Rapport journalier prêt' : 'Rapport de nuit prêt';
          const body = `${report.date.label} - ${readyMessage}`;
          const notification = new Notification(title, {
            body,
            tag: reportReadyNotificationKey,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch {
          // Ignore desktop notification failures.
        }
      };

      if (Notification.permission === 'granted') {
        showDesktopReadyNotification();
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            showDesktopReadyNotification();
          }
        });
      }
    }

    persistReadyNotificationKey(reportReadyNotificationKey);
  }, [persistReadyNotificationKey, readyNotificationKeys, report, reportReadyNotificationKey, reportType]);

  useEffect(() => {
    if (!reportNotice || isReportNoticeDismissed || lastNoticeRef.current === reportNotice) return;
    lastNoticeRef.current = reportNotice;

    if (report?.canGenerate === false) {
      toast.error(reportNotice);
      return;
    }

    if (report?.ready) {
      toast.success(reportNotice);
      return;
    }

    toast.warning(reportNotice);
  }, [isReportNoticeDismissed, report?.canGenerate, report?.ready, reportNotice]);

  useEffect(() => {
    return () => {
      if (pendingExportResolverRef.current) {
        pendingExportResolverRef.current(false);
        pendingExportResolverRef.current = null;
      }
    };
  }, []);

  const askPendingExportConfirmation = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      pendingExportResolverRef.current = resolve;
      setPendingExportConfirmOpen(true);
    });
  }, []);

  const resolvePendingExportConfirmation = useCallback((confirmed: boolean) => {
    setPendingExportConfirmOpen(false);
    if (pendingExportResolverRef.current) {
      pendingExportResolverRef.current(confirmed);
      pendingExportResolverRef.current = null;
    }
  }, []);

  const ensureExportAllowed = useCallback(async () => {
    if (!report) return false;

    if (report.canGenerate === false) {
      toast.error(report.cutoffMessage ?? 'La génération est bloquée par la fenêtre horaire.');
      return false;
    }

    if (!report.ready) {
      const confirmed = await askPendingExportConfirmation();
      if (!confirmed) return false;
    }

    return true;
  }, [askPendingExportConfirmation, report]);

  const showReportNotice = Boolean(reportNotice && !isReportNoticeDismissed);

  const statusBadge = useMemo(() => {
    if (!report) {
      return {
        label: reportType === 'daily' ? 'Rapport journalier' : 'Rapport de nuit',
        className: 'bg-slate-600 text-white',
      };
    }

    if (report.reportPhase === 'waiting') {
      return {
        label: reportType === 'daily' ? 'Rapport journalier en attente' : 'Rapport de nuit en attente',
        className: 'bg-slate-600 text-white',
      };
    }

    if (report.reportPhase === 'in_progress') {
      return {
        label: reportType === 'daily' ? 'Rapport journalier en cours' : 'Rapport de nuit en cours',
        className: 'bg-amber-600 text-white',
      };
    }

    return {
      label: reportType === 'daily' ? 'Rapport journalier est pret' : 'Rapport de nuit est pret',
      className: 'bg-emerald-600 text-white',
    };
  }, [report, reportType]);

  const saveReportingSettings = useCallback(async () => {
    if (!isAdminUser || !connectedUserId) {
      toast.error('Configuration réservée aux admins.');
      return;
    }

    setSavingReportingSettings(true);
    try {
      const response = await fetch('/api/noc/reporting-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: connectedUserId, settings: reportingSettings }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Impossible de sauvegarder les paramètres reporting.');
      }

      setReportingSettings(payload.settings ?? reportingSettings);
      toast.success('Paramètres reporting sauvegardés.');
      hasLoadedRef.current = false;
      setLoading(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de sauvegarde des paramètres reporting.');
    } finally {
      setSavingReportingSettings(false);
    }
  }, [connectedUserId, isAdminUser, reportingSettings]);

  const handleExportPdf = async () => {
    if (!report || exportRows.length === 0) {
      toast.error('Aucune donnée à exporter.');
      return;
    }

    if (!(await ensureExportAllowed())) return;

    const logoDataUrl = await fetchPublicImageDataUrl('/logo_silicone_connect.png');
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedAtLabel = new Date().toLocaleString('fr-FR');
    const contentOffsetY = 5;

    const drawCenteredWatermark = () => {
      if (!logoDataUrl) return;

      const anyDoc = doc as jsPDF & {
        setGState?: (gState: unknown) => void;
        GState?: new (options: { opacity: number }) => unknown;
      };

      const watermarkWidth = 74;
      const watermarkHeight = 34;
      const x = (pageWidth - watermarkWidth) / 2;
      const y = (pageHeight - watermarkHeight) / 2 + 6;

      if (anyDoc.setGState && anyDoc.GState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.08 }));
        doc.addImage(logoDataUrl, 'PNG', x, y, watermarkWidth, watermarkHeight);
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      } else {
        doc.addImage(logoDataUrl, 'PNG', x, y, watermarkWidth, watermarkHeight);
      }
    };

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 8, 24, 11);
    }

    doc.setTextColor(14, 165, 165);
    doc.setFontSize(12.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SILICONE CONNECT', 42, 12.5);
    doc.setTextColor(234, 88, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('La confiance à très haut débit', 42, 16.5);

    doc.setFillColor(254, 215, 170);
    doc.roundedRect(14, 21 + contentOffsetY, pageWidth - 28, 9, 1.2, 1.2, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(report.documentTitle ?? 'Rapport de puissance des equipements clients', pageWidth / 2, 27 + contentOffsetY, { align: 'center' });

    autoTable(doc, {
      startY: 34 + contentOffsetY,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8.8, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.2, halign: 'center', valign: 'middle' },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [31, 41, 55], cellWidth: 43, halign: 'center' },
        1: { fillColor: [255, 255, 255], textColor: [17, 24, 39], cellWidth: 89, halign: 'center' },
        2: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [31, 41, 55], cellWidth: 43, halign: 'center' },
        3: { fillColor: [255, 255, 255], textColor: [17, 24, 39], cellWidth: 89, halign: 'center' },
      },
      body: [
        ['SUPERVISEUR', report.meta.supervisor.name, 'DATE', report.date.label],
        ['OPERATEURS', operatorsLabel, 'TYPE', report.reportTypeLabel ?? reportTypeLabel(reportType)],
        ['HEURE D\'ENTREE DU SHIFT', report.meta.entryTime, 'HEURE DE SORTIE DU SHIFT', report.meta.exitTime],
        ['PRELEVEMENT ENTREE SHIFT', report.schedule.morningLabel, 'PRELEVEMENT SORTIE SHIFT', report.schedule.eveningLabel],
      ],
    });

    const metaFinalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? (54 + contentOffsetY);

    autoTable(doc, {
      startY: metaFinalY + 4,
      margin: { left: 14, right: 14, bottom: 14 },
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.2, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, halign: 'center', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        drawCenteredWatermark();
      },
      didParseCell: (hookData) => {
        if (hookData.section !== 'body') return;
        const row = exportRows[hookData.row.index];
        if (!row) return;

        if (hookData.column.index === 8) {
          const value = String(hookData.cell.raw ?? '').toUpperCase();
          if (value.startsWith('UP')) {
            hookData.cell.styles.fillColor = [220, 252, 231];
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (value.startsWith('DOWN')) {
            hookData.cell.styles.fillColor = [254, 226, 226];
            hookData.cell.styles.textColor = [153, 27, 27];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }

        if (hookData.column.index === 9) {
          const [red, green, blue] = getRemarkSeverityFill(row.remarkSeverity);
          hookData.cell.styles.fillColor = [red, green, blue];
          hookData.cell.styles.textColor = row.remarkSeverity === 'CRITICAL' ? [127, 29, 29] : [15, 23, 42];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
      head: [[
        'ID DU CLIENT',
        'NOM DU CLIENT',
        'TYPE DE SERVICE',
        'LOCALITE',
        '@IP CLIENT',
        'PUISSANCE RECEPTION A L\'ENTREE DU SHIFT',
        'PUISSANCE RECEPTION A LA SORTIE DU SHIFT',
        'STATUT DU CLIENT',
        'STATUT EQUIP CLIENT',
        'REMARQUE',
      ]],
      body: exportRows.map((row) => [
        row.clientRef,
        row.clientName,
        row.serviceType,
        row.locality,
        row.ipClient,
        formatDbm(row.morningRxDbm),
        formatDbm(row.eveningRxDbm),
        row.status,
        row.equipmentStatus,
        row.remark,
      ]),
    });

    // ── Tableau Backbone (ronde des sites depuis localStorage) ─────────────
    const backboneRaw = typeof window !== 'undefined'
      ? window.localStorage.getItem('noc-site-round-draft-v1')
      : null;

    type BackboneRow = {
      isValidated: boolean;
      date: string;
      horaire: string;
      site: string;
      express: string;
      climatisation: string;
      batteries: string;
      ge: string;
      fuiteGazoil: string;
      courantE2c: string;
      commentaire: string;
      nomVigile: string;
      contactVigile: string;
      statut: string;
    };

    type BackboneDraft = {
      rows?: BackboneRow[];
      conclusionHtml?: string;
      conclusionValidated?: boolean;
    };

    let backboneRows: BackboneRow[] = [];
    let backboneConclusionHtml = '';
    if (backboneRaw) {
      try {
        const draft = JSON.parse(backboneRaw) as BackboneDraft;
        backboneRows = Array.isArray(draft.rows)
          ? draft.rows.filter((row) => Boolean(row?.isValidated))
          : [];
        backboneConclusionHtml = draft.conclusionHtml ?? '';
      } catch { /* ignore */ }
    }

    if (backboneRows.length > 0) {
      doc.addPage();
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 8, 24, 11);
      }
      doc.setTextColor(14, 165, 165);
      doc.setFontSize(12.5);
      doc.setFont('helvetica', 'bold');
      doc.text('SILICONE CONNECT', 42, 12.5);
      doc.setTextColor(234, 88, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('La confiance à très haut débit', 42, 16.5);

      doc.setFillColor(254, 215, 170);
      doc.roundedRect(14, 21 + contentOffsetY, pageWidth - 28, 9, 1.2, 1.2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT DES SITES DES BACKBONES', pageWidth / 2, 27 + contentOffsetY, { align: 'center' });

      // Subtle professional backdrop behind table text area (transparent-like effect).
      const anyDoc = doc as jsPDF & {
        setGState?: (gState: unknown) => void;
        GState?: new (options: { opacity: number }) => unknown;
      };
      if (anyDoc.setGState && anyDoc.GState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.14 }));
        doc.setFillColor(204, 251, 241);
        doc.roundedRect(9, 35 + contentOffsetY, pageWidth - 18, pageHeight - 50, 2, 2, 'F');
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      } else {
        doc.setFillColor(240, 253, 250);
        doc.roundedRect(9, 35 + contentOffsetY, pageWidth - 18, pageHeight - 50, 2, 2, 'F');
      }

      const stripHtml = (html: string) =>
        html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

      autoTable(doc, {
        startY: 34 + contentOffsetY,
        margin: { left: 8, right: 8, bottom: 14 },
        styles: { fontSize: 7, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, halign: 'center', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: () => { drawCenteredWatermark(); },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const val = String(hookData.cell.raw ?? '').toUpperCase();
          if (hookData.column.index === 0) {
            if (val === 'CRITIQUE') {
              hookData.cell.styles.fillColor = [254, 226, 226];
              hookData.cell.styles.textColor = [153, 27, 27];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (val === 'A_SURVEILLER' || val === 'A SURVEILLER') {
              hookData.cell.styles.fillColor = [254, 249, 195];
              hookData.cell.styles.textColor = [133, 77, 14];
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        },
        head: [[
          'STATUT', 'DATE', 'HORAIRE', 'SITES', 'EXPRESS',
          'CLIMATISATION', 'BATTERIES', 'GE',
          'FUITE GAZOIL', 'COURANT E²C', 'COMMENTAIRE',
          'NOM VIGILE', 'CONTACT SITE',
        ]],
        body: backboneRows.map((row) => [
          row.statut,
          row.date,
          row.horaire,
          row.site,
          row.express,
          row.climatisation,
          row.batteries,
          row.ge,
          row.fuiteGazoil,
          row.courantE2c,
          stripHtml(row.commentaire),
          row.nomVigile,
          row.contactVigile,
        ]),
      });

      if (backboneConclusionHtml.trim()) {
        const conclusionText = stripHtml(backboneConclusionHtml);
        const conclusionY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 52) + 8;
        const conclusionLines = doc.splitTextToSize(conclusionText, pageWidth - 28) as string[];
        const blockHeight = 2 + (conclusionLines.length * 4.4);

        let drawY = conclusionY;
        if (drawY + blockHeight > pageHeight - 14) {
          doc.addPage();
          if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', 14, 8, 24, 11);
          }
          drawY = 24;
        }

        const anyDoc = doc as jsPDF & {
          setGState?: (gState: unknown) => void;
          GState?: new (options: { opacity: number }) => unknown;
        };
        if (anyDoc.setGState && anyDoc.GState) {
          anyDoc.setGState(new anyDoc.GState({ opacity: 0.18 }));
          doc.setFillColor(204, 251, 241);
          doc.roundedRect(14, drawY - 3.5, pageWidth - 28, blockHeight + 3, 1.8, 1.8, 'F');
          anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
        } else {
          doc.setFillColor(240, 253, 250);
          doc.roundedRect(14, drawY - 3.5, pageWidth - 28, blockHeight + 3, 1.8, 1.8, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(conclusionLines, 16, drawY + 2);
      }

    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Fait à Brazzaville le ${generatedAtLabel}`, 14, pageHeight - 6);
      doc.text(`Page ${page}/${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }

    const fileName = buildDownloadFileName(report.fileBaseName ?? `rapport_${reportType}`, 'pdf');
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success(`PDF telecharge: ${fileName}`);
  };

  const handleExportExcel = async () => {
    if (!report || exportRows.length === 0) {
      toast.error('Aucune donnée à exporter.');
      return;
    }

    if (!(await ensureExportAllowed())) return;

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NOC Activities - Silicone Connect';
    workbook.created = new Date();

    const reportTabTitle = report.reportTypeLabel ?? (reportType === 'daily' ? 'Rapport journalier' : 'Rapport de nuit');
    const createWorksheet = (worksheetName: string, rows: ExportRow[]) => {
      const headerRowIndex = 11;
      const worksheet = workbook.addWorksheet(worksheetName, {
        views: [{ state: 'frozen', ySplit: headerRowIndex, showGridLines: false }],
        properties: { defaultRowHeight: 20 },
        pageSetup: {
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
        },
      });

      worksheet.columns = [
        { key: 'spacer', width: 3 },
        { key: 'clientRef', width: 20 },
        { key: 'clientName', width: 28 },
        { key: 'serviceType', width: 18 },
        { key: 'locality', width: 18 },
        { key: 'ipClient', width: 18 },
        { key: 'morningRx', width: 28 },
        { key: 'eveningRx', width: 28 },
        { key: 'status', width: 16 },
        { key: 'equipmentStatus', width: 22 },
        { key: 'remark', width: 34 },
      ];

      worksheet.getRow(1).height = 24;
      worksheet.getRow(2).height = 10;

      worksheet.mergeCells('B1:K1');
      const sheetTitleCell = worksheet.getCell('B1');
      sheetTitleCell.value = report.documentTitle?.toUpperCase() ?? `RAPPORT ${reportType === 'daily' ? 'JOURNALIER' : 'DE NUIT'} - ${report.date.label}`;
      sheetTitleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF000000' } };
      sheetTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheetTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };

      const infoRows: Array<[string, string]> = [
        ['SUPERVISEUR', report.meta.supervisor.name],
        ['OPERATEURS', operatorsLabel],
        ['DATE', report.date.label],
        ['TYPE', reportTabTitle],
        ['HEURE D\'ENTREE DU SHIFT', report.meta.entryTime],
        ['HEURE DE SORTIE DU SHIFT', report.meta.exitTime],
      ];

      infoRows.forEach(([label, value], index) => {
        const rowNumber = 3 + index;
        const row = worksheet.getRow(rowNumber);
        row.height = 22;

        worksheet.mergeCells(`B${rowNumber}:D${rowNumber}`);
        const labelCell = worksheet.getCell(`B${rowNumber}`);
        labelCell.value = label;
        labelCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1F2937' } };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        labelCell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };

        worksheet.mergeCells(`E${rowNumber}:K${rowNumber}`);
        const valueCell = worksheet.getCell(`E${rowNumber}`);
        valueCell.value = value;
        valueCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF111827' } };
        valueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        valueCell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      });

      worksheet.getRow(9).height = 8;
      worksheet.getRow(10).height = 8;

      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = [
        '',
        'ID DU CLIENT',
        'NOM DU CLIENT',
        'TYPE DE SERVICE',
        'LOCALITE',
        '@IP CLIENT',
        'PUISSANCE RECEPTION A L\'ENTREE DU SHIFT',
        'PUISSANCE RECEPTION A LA SORTIE DU SHIFT',
        'STATUT DU CLIENT',
        'STATUT EQUIP CLIENT',
        'REMARQUE',
      ];
      headerRow.height = 24;

      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F766E' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0B5E58' } },
          bottom: { style: 'thin', color: { argb: 'FF0B5E58' } },
          left: { style: 'thin', color: { argb: 'FF0B5E58' } },
          right: { style: 'thin', color: { argb: 'FF0B5E58' } },
        };
      });

      rows.forEach((row, index) => {
        const excelRow = worksheet.getRow(headerRowIndex + 1 + index);
        excelRow.values = [
          '',
          row.clientRef,
          row.clientName,
          row.serviceType,
          row.locality,
          row.ipClient,
          formatDbm(row.morningRxDbm),
          formatDbm(row.eveningRxDbm),
          row.status,
          row.equipmentStatus,
          row.remark,
        ];
        excelRow.height = 21;

        excelRow.eachCell((cell, col) => {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF111827' } };
          cell.alignment = {
            horizontal: col === 3 || col === 11 ? 'left' : 'center',
            vertical: 'middle',
            wrapText: col === 11,
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
        });

        if (index % 2 === 0) {
          excelRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          });
        }

        const remarkCell = excelRow.getCell(11);
        const [red, green, blue] = getRemarkSeverityFill(row.remarkSeverity);
        remarkCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: [red, green, blue]
              .map((value) => value.toString(16).padStart(2, '0').toUpperCase())
              .join(''),
          },
        };
        remarkCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: row.remarkSeverity === 'CRITICAL' ? 'FF7F1D1D' : 'FF111827' } };

        const equipmentStatusCell = excelRow.getCell(10);
        if (row.equipmentStatus.startsWith('UP')) {
          equipmentStatusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          };
          equipmentStatusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
        } else if (row.equipmentStatus.startsWith('DOWN')) {
          equipmentStatusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          };
          equipmentStatusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
        } else {
          equipmentStatusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          };
          equipmentStatusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF374151' } };
        }
      });

      const dataStartRow = headerRowIndex + 1;
      const dataEndRow = dataStartRow + rows.length - 1;
      if (rows.length > 0) {
        worksheet.autoFilter = {
          from: { row: headerRowIndex, column: 2 },
          to: { row: dataEndRow, column: 11 },
        };
      }
    };

    const allReportRows = report.sections.flatMap((section) => section.clients) as ExportRow[];
    const localityMissingValues = new Set(['', 'n/a', 'na', 'non renseigne', 'non renseignee', 'inconnu', 'unknown', '-']);
    const hasMissingLocality = allReportRows.some((row) =>
      localityMissingValues.has(String(row.locality ?? '').trim().toLowerCase())
    );

    if (hasMissingLocality) {
      createWorksheet('Tous les clients', allReportRows);
    } else {
      const grouped = new Map<string, ExportRow[]>();
      const usedSheetNames = new Set<string>();
      const localityToSheetName = new Map<string, string>();

      const buildSafeSheetName = (localityValue: string) => {
        const base = `Clients ${localityValue}`
          .replace(/[\\/:*?\[\]]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const maxLen = 31;
        const baseTrimmed = base.slice(0, maxLen) || 'Clients';
        let candidate = baseTrimmed;
        let count = 2;

        while (usedSheetNames.has(candidate)) {
          const suffix = ` (${count})`;
          candidate = `${baseTrimmed.slice(0, maxLen - suffix.length)}${suffix}`;
          count += 1;
        }

        usedSheetNames.add(candidate);
        return candidate;
      };

      for (const row of allReportRows) {
        const locality = String(row.locality ?? '').trim();
        let sheetName = localityToSheetName.get(locality);
        if (!sheetName) {
          sheetName = buildSafeSheetName(locality);
          localityToSheetName.set(locality, sheetName);
        }

        const list = grouped.get(sheetName) ?? [];
        list.push(row);
        grouped.set(sheetName, list);
      }

      const orderedNames = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

      for (const name of orderedNames) {
        const rows = grouped.get(name) ?? [];
        if (rows.length > 0) {
          createWorksheet(name, rows);
        }
      }
    }

    // ── Feuille Rapport BackBone ─────────────────────────────────────────────
    const backboneRaw = typeof window !== 'undefined'
      ? window.localStorage.getItem('noc-site-round-draft-v1')
      : null;

    if (backboneRaw) {
      try {
        type BBRow = {
          isValidated?: boolean;
          date: string; horaire: string; site: string; express: string;
          climatisation: string; batteries: string; ge: string;
          fuiteGazoil: string; courantE2c: string; commentaire: string;
          nomVigile: string; contactVigile: string; statut: string;
        };
        type BBDraft = { rows?: BBRow[]; conclusionHtml?: string; conclusionValidated?: boolean; };
        const draft = JSON.parse(backboneRaw) as BBDraft;
        const bbRows: BBRow[] = Array.isArray(draft.rows)
          ? draft.rows.filter((row) => Boolean(row?.isValidated))
          : [];
        const bbConclusion = draft.conclusionHtml ?? '';

        if (bbRows.length > 0) {
          const stripHtml = (html: string) =>
            html
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/gi, ' ')
              .replace(/&amp;/gi, '&')
              .trim();

          const bbSheet = workbook.addWorksheet('Rapport BackBone', {
            views: [{ showGridLines: false }],
            properties: { defaultRowHeight: 22 },
            pageSetup: {
              orientation: 'landscape',
              fitToPage: true,
              fitToWidth: 1,
              fitToHeight: 0,
              margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
            },
          });

          bbSheet.columns = [
            { key: 'sp', width: 2 },
            { key: 'statut', width: 16 },
            { key: 'date', width: 14 },
            { key: 'horaire', width: 12 },
            { key: 'site', width: 20 },
            { key: 'express', width: 12 },
            { key: 'climatisation', width: 28 },
            { key: 'batteries', width: 28 },
            { key: 'ge', width: 16 },
            { key: 'fuiteGazoil', width: 18 },
            { key: 'courantE2c', width: 16 },
            { key: 'commentaire', width: 38 },
            { key: 'nomVigile', width: 24 },
            { key: 'contactVigile', width: 22 },
          ];

          // Title row
          bbSheet.getRow(1).height = 26;
          bbSheet.mergeCells('B1:N1');
          const titleCell = bbSheet.getCell('B1');
          titleCell.value = `RAPPORT DES SITES DES BACKBONES — ${report.date.label}`;
          titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF000000' } };
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };

          const bbCols = [
            'STATUT', 'DATE', 'HORAIRE', 'SITES', 'EXPRESS',
            'CLIMATISATION', 'BATTERIES', 'GE',
            'FUITE DE GAZOIL', 'COURANT E²C', 'COMMENTAIRE',
            'NOM DU VIGILE', 'CONTACT DU SITE',
          ];

          const headerRow = bbSheet.getRow(3);
          headerRow.values = ['', ...bbCols];
          headerRow.height = 22;
          headerRow.eachCell((cell) => {
            cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF0B5E58' } },
              bottom: { style: 'thin', color: { argb: 'FF0B5E58' } },
              left: { style: 'thin', color: { argb: 'FF0B5E58' } },
              right: { style: 'thin', color: { argb: 'FF0B5E58' } },
            };
          });

          bbRows.forEach((row, i) => {
            const exRow = bbSheet.getRow(4 + i);
            exRow.height = 22;
            exRow.values = [
              '',
              row.statut,
              row.date,
              row.horaire,
              row.site,
              row.express,
              row.climatisation,
              row.batteries,
              row.ge,
              row.fuiteGazoil,
              row.courantE2c,
              stripHtml(row.commentaire),
              row.nomVigile,
              row.contactVigile,
            ];

            const isCritique = String(row.statut ?? '').toUpperCase() === 'CRITIQUE';
            const isSurveiller = String(row.statut ?? '').toUpperCase().includes('SURVEILLER');

            exRow.eachCell((cell, col) => {
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF111827' } };
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: col === 12 };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              };
            });

            if (i % 2 === 0) {
              exRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
              });
            }

            const statutCell = exRow.getCell(2);
            if (isCritique) {
              statutCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              statutCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
            } else if (isSurveiller) {
              statutCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
              statutCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF854D0E' } };
            }
          });

          // Conclusion
          if (bbConclusion.trim()) {
            const conclusionRowIndex = 4 + bbRows.length + 2;
            bbSheet.getRow(conclusionRowIndex - 1).height = 8;
            const conclusionTextRow = bbSheet.getRow(conclusionRowIndex);
            conclusionTextRow.height = 68;
            bbSheet.mergeCells(`B${conclusionRowIndex}:N${conclusionRowIndex}`);
            const conclusionCell = bbSheet.getCell(`B${conclusionRowIndex}`);
            conclusionCell.value = stripHtml(bbConclusion);
            conclusionCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
            conclusionCell.font = { name: 'Calibri', size: 10 };
            conclusionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
            conclusionCell.border = {
              top: { style: 'thin', color: { argb: 'FF99F6E4' } },
              bottom: { style: 'thin', color: { argb: 'FF99F6E4' } },
              left: { style: 'thin', color: { argb: 'FF99F6E4' } },
              right: { style: 'thin', color: { argb: 'FF99F6E4' } },
            };
          }
        }
      } catch { /* silent */ }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildDownloadFileName(report.fileBaseName ?? `rapport_${reportType}`, 'xlsx');
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success('Export Excel pro généré.');
  };

  const handleExportSelect = (value: string) => {
    setExportAction(value);
    if (value === 'pdf') {
      void handleExportPdf();
    }
    if (value === 'excel') {
      void handleExportExcel();
    }
    setExportAction(undefined);
  };

  if (loading) {
    return (
      <Card className="border-slate-200/70 bg-white/75 dark:border-slate-700/60 dark:bg-slate-900/45">
        <CardContent className="flex items-center gap-2 p-6 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du rapport de puissance...
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30">
        <CardContent className="flex items-center gap-2 p-6 text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4" /> {error ?? 'Impossible de charger le rapport.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AlertDialog open={pendingExportConfirmOpen} onOpenChange={(open) => {
        if (!open) {
          resolvePendingExportConfirmation(false);
          return;
        }
        setPendingExportConfirmOpen(true);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de génération</AlertDialogTitle>
            <AlertDialogDescription>
              {report.pendingMessage ?? 'Le rapport n\'est pas encore prêt. Voulez-vous générer quand même ce rapport ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolvePendingExportConfirmation(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolvePendingExportConfirmation(true)}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showReportNotice && reportNotice && (
        <Card className={report?.canGenerate === false ? 'border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30' : report?.ready ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30'}>
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            {report?.canGenerate === false ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : report?.ready ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{reportNotice}</span>
            <button
              type="button"
              className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-current/70 transition hover:bg-current/10 hover:text-current"
              aria-label="Fermer le message"
              onClick={() => {
                if (reportNoticeKey) {
                  persistDismissedNotice(reportNoticeKey);
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200/70 bg-white/75 dark:border-slate-700/60 dark:bg-slate-900/45">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-slate-900 dark:text-slate-100">
              RAPPORT DE PUISSANCE DES EQUIPEMENTS CLIENTS
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAdminUser && (
                <Button variant="outline" size="sm" onClick={() => setShowReportingSettings((prev) => !prev)}>
                  {showReportingSettings ? 'Masquer paramètres' : 'Paramètres reporting'}
                </Button>
              )}
              <Badge className={statusBadge.className}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {statusBadge.label}
              </Badge>
            </div>
          </div>

          {isAdminUser && showReportingSettings && (
            <div className="grid gap-3 rounded-lg border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/35 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Fuseau horaire</p>
                <input
                  value={reportingSettings.timeZone}
                  onChange={(event) => setReportingSettings((prev) => ({ ...prev, timeZone: event.target.value }))}
                  className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Africa/Brazzaville"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Nuit: prêt / cutoff</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={reportingSettings.night.readyHour}
                    onChange={(event) => setReportingSettings((prev) => ({
                      ...prev,
                      night: { ...prev.night, readyHour: Number(event.target.value) || 0 },
                    }))}
                    className="h-9 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Ready"
                  />
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={reportingSettings.night.cutoffHour}
                    onChange={(event) => setReportingSettings((prev) => ({
                      ...prev,
                      night: { ...prev.night, cutoffHour: Number(event.target.value) || 0 },
                    }))}
                    className="h-9 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Cutoff"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Jour: prêt / cutoff</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={reportingSettings.daily.readyHour}
                    onChange={(event) => setReportingSettings((prev) => ({
                      ...prev,
                      daily: { ...prev.daily, readyHour: Number(event.target.value) || 0 },
                    }))}
                    className="h-9 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Ready"
                  />
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={reportingSettings.daily.cutoffHour}
                    onChange={(event) => setReportingSettings((prev) => ({
                      ...prev,
                      daily: { ...prev.daily, cutoffHour: Number(event.target.value) || 0 },
                    }))}
                    className="h-9 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Cutoff"
                  />
                </div>
              </div>
              <div className="flex items-end justify-end">
                <Button size="sm" onClick={() => void saveReportingSettings()} disabled={savingReportingSettings}>
                  {savingReportingSettings ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-2">
            <p>
              <strong>SUPERVISEUR:</strong> {report.meta.supervisor.name} | <strong>Tél:</strong>{' '}
              {report.meta.supervisor.phone}
            </p>
            <p>
              <strong>OPERATEUR:</strong> {operatorsLabel}
            </p>
            <p>
              <strong>DATE:</strong> {report.date.label}
            </p>
            <p>
              <strong>TYPE:</strong> {reportTypeLabel(reportType)}
            </p>
            <p>
              <strong>HEURE D'ENTREE AU POSTE:</strong> {report.meta.entryTime}
            </p>
            <p>
              <strong>HEURE DE SORTIE AU POSTE:</strong> {report.meta.exitTime}
            </p>
            <p>
              <strong>Prélèvement Matinée:</strong> {report.schedule.morningLabel}
            </p>
            <p>
              <strong>Prélèvement Soirée:</strong> {report.schedule.eveningLabel}
            </p>
          </div>

          <div className="pt-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-auto">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Filtre clients</p>
                <Select
                  value={clientFilter}
                  onValueChange={(value: 'all' | 'brazzaville' | 'pointe-noire') => setClientFilter(value)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-55 border-slate-200/80 bg-white/80 text-sm dark:border-slate-700/70 dark:bg-slate-900/45">
                    <SelectValue placeholder="Filtrer les clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    <SelectItem value="brazzaville">Client Brazzaville</SelectItem>
                    <SelectItem value="pointe-noire">Client Pointe-Noire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Exporter</p>
                <Select value={exportAction} onValueChange={handleExportSelect}>
                  <SelectTrigger className="h-9 w-full sm:w-45 border-slate-200/80 bg-white/80 text-sm dark:border-slate-700/70 dark:bg-slate-900/45" disabled={report?.canGenerate === false}>
                    <SelectValue placeholder="Choisir un format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Ronde</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-52 border-slate-200/80 bg-white/80 text-sm dark:border-slate-700/70 dark:bg-slate-900/45"
                  onClick={() => setShowSiteRoundPanel((prev) => !prev)}
                >
                  <Route className="mr-1 h-3.5 w-3.5" />
                  La ronde des Sites
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {showSiteRoundPanel && <NocSiteRoundPanel />}

      {!showSiteRoundPanel && (clientFilter === 'all' ? (
        <Card className="border-slate-200/70 bg-white/75 dark:border-slate-700/60 dark:bg-slate-900/45">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 dark:text-slate-100">Tous les clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID DU CLIENT</TableHead>
                  <TableHead>NOM DU CLIENT</TableHead>
                  <TableHead>TYPE DE SERVICE</TableHead>
                  <TableHead>LOCALITE</TableHead>
                  <TableHead>@IP CLIENT</TableHead>
                  <TableHead>PUISSANCE RECEPTION A L'ENTREE DU SHIFT</TableHead>
                  <TableHead>PUISSANCE RECEPTION A LA SORTIE DU SHIFT</TableHead>
                  <TableHead>STATUT DU CLIENT</TableHead>
                  <TableHead>STATUT EQUIP CLIENT</TableHead>
                  <TableHead>REMARQUE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!mergedClients || mergedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 dark:text-slate-400">
                      Aucun client trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  mergedClients.map((client, index) => (
                    <TableRow key={`${client.clientRef}-${client.locality}-${index}`}>
                      <TableCell>{client.clientRef}</TableCell>
                      <TableCell>{client.clientName}</TableCell>
                      <TableCell>{client.serviceType}</TableCell>
                      <TableCell>{client.locality}</TableCell>
                      <TableCell>{client.ipClient}</TableCell>
                      <TableCell>{formatDbm(client.morningRxDbm)}</TableCell>
                      <TableCell>{formatDbm(client.eveningRxDbm)}</TableCell>
                      <TableCell>{client.status}</TableCell>
                      <TableCell>{client.equipmentStatus}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getRemarkSeverityStyles(client.remarkSeverity)}`}>
                          {client.remark}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        visibleSections.map((section) => (
          <Card key={section.key} className="border-slate-200/70 bg-white/75 dark:border-slate-700/60 dark:bg-slate-900/45">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID DU CLIENT</TableHead>
                    <TableHead>NOM DU CLIENT</TableHead>
                    <TableHead>TYPE DE SERVICE</TableHead>
                    <TableHead>LOCALITE</TableHead>
                    <TableHead>@IP CLIENT</TableHead>
                    <TableHead>PUISSANCE RECEPTION A L'ENTREE DU SHIFT</TableHead>
                    <TableHead>PUISSANCE RECEPTION A LA SORTIE DU SHIFT</TableHead>
                    <TableHead>STATUT DU CLIENT</TableHead>
                    <TableHead>STATUT EQUIP CLIENT</TableHead>
                    <TableHead>REMARQUE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-slate-500 dark:text-slate-400">
                        Aucun client pour cette section.
                      </TableCell>
                    </TableRow>
                  )}
                  {section.clients.map((client, index) => (
                    <TableRow key={`${section.key}-${client.clientRef}-${index}`}>
                      <TableCell>{client.clientRef}</TableCell>
                      <TableCell>{client.clientName}</TableCell>
                      <TableCell>{client.serviceType}</TableCell>
                      <TableCell>{client.locality}</TableCell>
                      <TableCell>{client.ipClient}</TableCell>
                      <TableCell>{formatDbm(client.morningRxDbm)}</TableCell>
                      <TableCell>{formatDbm(client.eveningRxDbm)}</TableCell>
                      <TableCell>{client.status}</TableCell>
                      <TableCell>{client.equipmentStatus}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getRemarkSeverityStyles(client.remarkSeverity)}`}>
                          {client.remark}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ))}
    </div>
  );
}
