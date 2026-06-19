import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';
import { loadNocReportingSettings } from '@/lib/noc/reportingSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReportType = 'daily' | 'night';
type ReportPhase = 'waiting' | 'in_progress' | 'ready';

type ClientRow = {
  client_ref: string;
  client_name: string;
  service_type: string | null;
  locality: string | null;
  ip_client: string | null;
  librenms_device_id: number | string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | string | null;
  id_mapping: number | null;
};

type SnapshotRow = {
  id_mapping: number;
  rx_dbm: number | null;
  captured_at: Date;
};

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

type LibreNmsSensorRow = {
  sensor_class?: string;
  sensor_descr?: string;
  sensor_type?: string;
  sensor_current?: string | number;
};

type LibreNmsSensorsResponse = {
  sensors?: LibreNmsSensorRow[];
};

type LibreNmsDeviceRow = {
  device_id?: number | string;
  ip?: string;
  hostname?: string;
  status?: number | string;
};

type LibreNmsDevicesResponse = {
  devices?: LibreNmsDeviceRow[];
};

type LibreNmsHealthGraphRow = {
  sensor_id?: number | string;
  desc?: string;
  sensor_descr?: string;
  sensor_current?: number | string;
};

type LibreNmsHealthResponse = {
  graphs?: LibreNmsHealthGraphRow[];
};

type LibreNmsDeviceDetailsResponse = {
  devices?: LibreNmsDeviceRow[];
};

type LibreNmsOutageRow = {
  going_down?: number | string | null;
  up_again?: number | string | null;
};

type LibreNmsOutagesResponse = {
  outages?: LibreNmsOutageRow[];
};

const SUPERVISOR = {
  name: 'Théresia BABINDAMANA',
  phone: '069862475',
};

const OPERATOR_PHONES = ['069434804', '069535136', '066909906'];

function parseReportType(value: string | null): ReportType {
  return value === 'night' ? 'night' : 'daily';
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const mapped = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function createZonedDate(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function shiftLocalDate(parts: { year: number; month: number; day: number }, deltaDays: number) {
  const cursor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  cursor.setUTCDate(cursor.getUTCDate() + deltaDays);
  return {
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
    day: cursor.getUTCDate(),
  };
}

function parseReportDate(value: string | null, timeZone: string, now = new Date()): Date {
  const text = String(value ?? '').trim();
  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (directMatch) {
    return createZonedDate(
      timeZone,
      Number(directMatch[1]),
      Number(directMatch[2]),
      Number(directMatch[3]),
      0,
      0,
      0
    );
  }

  if (text) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const nowParts = getTimeZoneParts(now, timeZone);
  return createZonedDate(timeZone, nowParts.year, nowParts.month, nowParts.day, 0, 0, 0);
}

function formatDateLabel(date: Date, timeZone: string): string {
  const parts = getTimeZoneParts(date, timeZone);
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}

function formatCompactDateLabel(date: Date, timeZone: string): string {
  const parts = getTimeZoneParts(date, timeZone);
  return `${String(parts.day).padStart(2, '0')}_${String(parts.month).padStart(2, '0')}_${parts.year}`;
}

function formatDayOnly(date: Date, timeZone: string): string {
  const parts = getTimeZoneParts(date, timeZone);
  return String(parts.day).padStart(2, '0');
}

function normalizeClientStatus(status: string | null | undefined): string {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalized) return 'ACTIVE';
  if (normalized === 'ACTIVE') return 'ACTIVE';
  if (normalized === 'STAND BY' || normalized === 'STANDBY' || normalized === 'STAND-BY') return 'STAND BY';
  if (normalized === 'RESILIE' || normalized === 'RESILIÉ' || normalized === 'INACTIVE' || normalized === 'SUSPENDED') return 'RESILIE';
  return normalized;
}

function classifyPowerRemark(morningRxDbm: number | null, eveningRxDbm: number | null): {
  remark: string;
  severity: ReportClient['remarkSeverity'];
} {
  const values = [morningRxDbm, eveningRxDbm].filter((value): value is number => Number.isFinite(value as number));

  if (values.length === 0) {
    return { remark: 'Données indisponibles', severity: 'UNKNOWN' };
  }

  if (values.length < 2) {
    return { remark: 'Mesure partielle', severity: 'PARTIAL' };
  }

  const worst = Math.min(...values);
  if (worst >= -19.99) {
    return { remark: 'Bonne puissance de réception', severity: 'GOOD' };
  }

  if (worst >= -29.99) {
    return { remark: 'Mauvaise puissance de réception', severity: 'WARN' };
  }

  return { remark: 'Très mauvaise puissance de réception', severity: 'CRITICAL' };
}

function getReportContext(
  reportType: ReportType,
  settings: Awaited<ReturnType<typeof loadNocReportingSettings>>,
  now = new Date()
) {
  const localNow = getTimeZoneParts(now, settings.timeZone);
  const today = { year: localNow.year, month: localNow.month, day: localNow.day };
  const hour = localNow.hour;

  const isHourInWindow = (targetHour: number, startHour: number, endHour: number) => {
    const normalizedTarget = ((targetHour % 24) + 24) % 24;
    const normalizedStart = ((startHour % 24) + 24) % 24;
    const normalizedEnd = ((endHour % 24) + 24) % 24;

    if (normalizedStart === normalizedEnd) return true;
    if (normalizedStart < normalizedEnd) {
      return normalizedTarget >= normalizedStart && normalizedTarget < normalizedEnd;
    }
    return normalizedTarget >= normalizedStart || normalizedTarget < normalizedEnd;
  };

  const dayShiftStartHour = 6;
  const nightShiftStartHour = 21;
  const dayShiftEndHour = 18;

  if (reportType === 'night') {
    // Between 21h and 23h59, the active night shift ends on the next local day.
    const reportDayParts = hour >= nightShiftStartHour ? shiftLocalDate(today, 1) : today;
    const reportDay = createZonedDate(settings.timeZone, reportDayParts.year, reportDayParts.month, reportDayParts.day, 0, 0, 0);
    const startDayParts = shiftLocalDate(reportDayParts, -1);
    const startDay = createZonedDate(settings.timeZone, startDayParts.year, startDayParts.month, startDayParts.day, 0, 0, 0);

    const entryTime = createZonedDate(settings.timeZone, startDayParts.year, startDayParts.month, startDayParts.day, 21, 0, 0);
    const exitTime = createZonedDate(settings.timeZone, reportDayParts.year, reportDayParts.month, reportDayParts.day, 6, 0, 0);

    const readyHour = settings.night.readyHour;
    const cutoffHour = settings.night.cutoffHour;
    const inProgress = isHourInWindow(hour, nightShiftStartHour, readyHour);
    const ready = isHourInWindow(hour, readyHour, cutoffHour);
    const canGenerate = inProgress || ready;
    const reportPhase: ReportPhase = ready
      ? 'ready'
      : (inProgress ? 'in_progress' : 'waiting');

    return {
      reportDay,
      startDay,
      entryTime,
      exitTime,
      readyHour,
      cutoffHour,
      canGenerate,
      ready,
      reportPhase,
      windowLabel: `rapport de la nuit du ${formatDayOnly(startDay, settings.timeZone)} au ${formatDateLabel(reportDay, settings.timeZone)}`,
      documentTitle: `Rapport de la nuit du ${formatDayOnly(startDay, settings.timeZone)} au ${formatDateLabel(reportDay, settings.timeZone)}`,
      fileBaseName: `rapport_de_la_nuit_du_${formatDayOnly(startDay, settings.timeZone)}_au_${formatCompactDateLabel(reportDay, settings.timeZone)}`,
      statusReadyMessage: 'Le rapport de nuit est prêt généré maintenant.',
      cutoffMessage: `Vous pouvez générer le rapport de nuit jusqu'à ${String(cutoffHour).padStart(2, '0')}h00. Après cette heure, la génération est bloquée.`,
      pendingMessage: `Le rapport de nuit n'est pas encore prêt car les puissances de fin de shift qui sera prélevé à ${String(readyHour).padStart(2, '0')}h00 n'a pas encore été prélevé. Voulez-vous générer quand même ce rapport ?`,
      expectedReadinessLabel: `${String(readyHour).padStart(2, '0')}h00`,
      exitLabel: `${String(readyHour).padStart(2, '0')}h00`,
      entryLabel: '21h00',
      reportTypeLabel: 'Rapport de nuit',
    };
  }

  const reportDay = createZonedDate(settings.timeZone, today.year, today.month, today.day, 0, 0, 0);

  const entryTime = createZonedDate(settings.timeZone, today.year, today.month, today.day, 6, 0, 0);
  const exitTime = createZonedDate(settings.timeZone, today.year, today.month, today.day, 18, 0, 0);

  const readyHour = settings.daily.readyHour;
  const cutoffHour = settings.daily.cutoffHour;
  const inProgress = isHourInWindow(hour, dayShiftStartHour, dayShiftEndHour);
  const ready = isHourInWindow(hour, readyHour, cutoffHour);
  const canGenerate = inProgress || ready;
  const reportPhase: ReportPhase = ready
    ? 'ready'
    : (inProgress ? 'in_progress' : 'waiting');

  return {
    reportDay,
    startDay: reportDay,
    entryTime,
    exitTime,
    readyHour,
    cutoffHour,
    canGenerate,
    ready,
    reportPhase,
    windowLabel: `rapport journalier du ${formatDateLabel(reportDay, settings.timeZone)}`,
    documentTitle: `Rapport journalier du ${formatDateLabel(reportDay, settings.timeZone)}`,
    fileBaseName: `rapport_journalier_du_${formatCompactDateLabel(reportDay, settings.timeZone)}`,
    statusReadyMessage: 'Le rapport journalier est prêt généré maintenant.',
    cutoffMessage: `Vous pouvez générer le rapport journalier jusqu'à ${String(cutoffHour).padStart(2, '0')}h00. Après cette heure, la génération est bloquée.`,
    pendingMessage: `Le rapport journalier n'est pas encore prêt car les puissances de fin de shift qui sera prélevé à ${String(readyHour).padStart(2, '0')}h00 n'a pas encore été prélevé. Voulez-vous générer quand même ce rapport ?`,
    expectedReadinessLabel: `${String(readyHour).padStart(2, '0')}h00`,
    exitLabel: `${String(readyHour).padStart(2, '0')}h00`,
    entryLabel: '6h00',
    reportTypeLabel: 'Rapport journalier',
  };
}

function normalizeCity(locality: string): 'BRAZZAVILLE' | 'POINTE-NOIRE' | 'AUTRES' {
  const text = locality.toLowerCase();
  if (text.includes('brazza')) return 'BRAZZAVILLE';
  if (text.includes('pointe') || text.includes('noire') || text.includes('noir')) return 'POINTE-NOIRE';
  return 'AUTRES';
}

function pickNearestRx(
  snapshots: SnapshotRow[],
  targetTime: Date,
  maxDistanceMinutes = 120
): number | null {
  let best: SnapshotRow | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of snapshots) {
    if (snapshot.rx_dbm === null || snapshot.rx_dbm === undefined) continue;
    const distance = Math.abs(snapshot.captured_at.getTime() - targetTime.getTime());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = snapshot;
    }
  }

  if (!best) return null;

  const maxDistanceMs = maxDistanceMinutes * 60 * 1000;
  if (bestDistance > maxDistanceMs) return null;

  return Number(best.rx_dbm);
}

function buildRemark(morningRxDbm: number | null, eveningRxDbm: number | null): string {
  return classifyPowerRemark(morningRxDbm, eveningRxDbm).remark;
}

function parseTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  const text = String(value).trim();
  if (!text) return null;

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 1e12 ? numeric : numeric * 1000;
  }

  const parsed = new Date(text).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDowntime(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isDeviceUpStatus(status: unknown): boolean {
  if (typeof status === 'number') return status === 1;
  if (typeof status === 'boolean') return status;

  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return false;

  return normalized === '1' || normalized === 'true' || normalized === 'up' || normalized === 'online';
}

function resolveSchedule(reportType: ReportType, date: Date, timeZone: string) {
  const localDate = getTimeZoneParts(date, timeZone);

  const morningHour = reportType === 'daily' ? 6 : 21;
  const eveningHour = reportType === 'daily' ? 18 : 6;

  const morningDate = reportType === 'night'
    ? shiftLocalDate(localDate, -1)
    : { year: localDate.year, month: localDate.month, day: localDate.day };
  const eveningDate = { year: localDate.year, month: localDate.month, day: localDate.day };

  const morningTime = createZonedDate(timeZone, morningDate.year, morningDate.month, morningDate.day, morningHour, 0, 0);
  const eveningTime = createZonedDate(timeZone, eveningDate.year, eveningDate.month, eveningDate.day, eveningHour, 0, 0);

  if (reportType === 'night') {
    // Already shifted to previous local day above.
  }

  const startWindow = new Date(Math.min(morningTime.getTime(), eveningTime.getTime()));
  startWindow.setHours(startWindow.getHours() - 8);

  const endWindow = new Date(Math.max(morningTime.getTime(), eveningTime.getTime()));
  endWindow.setHours(endWindow.getHours() + 8);

  return {
    morningHour,
    eveningHour,
    morningLabel: `${String(morningHour).padStart(2, '0')}h00`,
    eveningLabel: `${String(eveningHour).padStart(2, '0')}h00`,
    morningTime,
    eveningTime,
    startWindow,
    endWindow,
  };
}

function scoreRxSensor(sensor: LibreNmsSensorRow): number {
  const descr = String(sensor.sensor_descr ?? '').toLowerCase();
  const sensorType = String(sensor.sensor_type ?? '').toLowerCase();
  const compact = descr.replace(/[^a-z0-9]/g, '');

  let score = 0;
  if (compact.includes('sfp1rx')) score += 300;
  if (compact.includes('sfp1')) score += 150;
  if (compact.includes('rxpower') || compact.includes('receiverpower')) score += 120;
  if (descr.includes('sfp1')) score += 100;
  if (descr.includes('rx')) score += 80;
  if (descr.includes('receive') || descr.includes('reception')) score += 50;
  if (descr.includes('sfp')) score += 20;
  if (sensorType.includes('dbm') || descr.includes('dbm')) score += 10;
  return score;
}

function pickSfp1RxDbm(sensors: LibreNmsSensorRow[]): number | null {
  const candidates = sensors
    .filter((sensor) => {
      const value = Number(sensor.sensor_current);
      if (!Number.isFinite(value)) return false;
      const descr = String(sensor.sensor_descr ?? '').toLowerCase();
      const compact = descr.replace(/[^a-z0-9]/g, '');
      const sensorClass = String(sensor.sensor_class ?? '').toLowerCase();
      const sensorType = String(sensor.sensor_type ?? '').toLowerCase();

      const mentionsOptic =
        descr.includes('sfp') || descr.includes('optic') || sensorType.includes('dbm') || compact.includes('sfp1');
      const mentionsRx = descr.includes('rx') || descr.includes('receive') || descr.includes('reception');
      return (sensorClass === 'dbm' || mentionsOptic) && mentionsRx;
    })
    .sort((left, right) => scoreRxSensor(right) - scoreRxSensor(left));

  if (candidates.length === 0) return null;

  const best = Number(candidates[0].sensor_current);
  return Number.isFinite(best) ? best : null;
}

function scoreHealthDesc(text: string): number {
  const descr = text.toLowerCase();
  const compact = descr.replace(/[^a-z0-9]/g, '');

  let score = 0;
  if (compact.includes('sfp1rx')) score += 300;
  if (compact.includes('sfp1')) score += 160;
  if (compact.includes('rxpower') || compact.includes('receiverpower')) score += 120;
  if (descr.includes('sfp1')) score += 100;
  if (descr.includes('rx')) score += 80;
  if (descr.includes('receive') || descr.includes('reception')) score += 50;
  if (descr.includes('dbm')) score += 10;
  return score;
}

function pickSfp1SensorIdFromHealth(graphs: LibreNmsHealthGraphRow[]): string | null {
  const candidates = graphs
    .map((graph) => {
      const sensorId = graph.sensor_id != null ? String(graph.sensor_id) : '';
      const label = String(graph.desc ?? graph.sensor_descr ?? '');
      return { sensorId, score: scoreHealthDesc(label) };
    })
    .filter((entry) => entry.sensorId && entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) return null;
  return candidates[0].sensorId;
}

async function resolveLibreNmsDeviceRef(deviceRef: string): Promise<string> {
  if (!deviceRef.startsWith('ip:')) return deviceRef;

  const ip = deviceRef.slice(3).trim();
  if (!ip) return deviceRef;

  try {
    const devicesData = await libreNmsRequest<LibreNmsDevicesResponse>(`/api/v0/devices?type=ipv4&query=${encodeURIComponent(ip)}`);
    const matched = Array.isArray(devicesData.devices)
      ? devicesData.devices.find((device) => String(device.ip ?? '').trim() === ip)
      : null;

    if (matched?.device_id != null) {
      return String(matched.device_id);
    }
  } catch {
    // Keep fallback with raw IP reference.
  }

  return ip;
}

async function fetchLibreNmsCurrentRxDbm(ref: string): Promise<number | null> {
  const resolvedRef = await resolveLibreNmsDeviceRef(ref);
  const refsToTry = Array.from(new Set([resolvedRef, ref]));

  for (const currentRef of refsToTry) {
    // Primary path: health/device_dbm (confirmed working on all tested instances)
    try {
      const health = await libreNmsRequest<LibreNmsHealthResponse>(
        `/api/v0/devices/${encodeURIComponent(currentRef)}/health/device_dbm`
      );
      const graphs = Array.isArray(health.graphs) ? health.graphs : [];
      const sensorId = pickSfp1SensorIdFromHealth(graphs);
      if (sensorId) {
        const sensorPayload = await libreNmsRequest<LibreNmsHealthResponse>(
          `/api/v0/devices/${encodeURIComponent(currentRef)}/health/device_dbm/${encodeURIComponent(sensorId)}`
        );
        const sensorRows = Array.isArray(sensorPayload.graphs) ? sensorPayload.graphs : [];
        const sensorValue = Number(sensorRows[0]?.sensor_current);
        if (Number.isFinite(sensorValue)) {
          return sensorValue;
        }
      }
    } catch {
      // Fallback to sensors endpoint.
    }

    // Secondary path: /sensors (available on some LibreNMS instances)
    try {
      const payload = await libreNmsRequest<LibreNmsSensorsResponse>(`/api/v0/devices/${encodeURIComponent(currentRef)}/sensors`);
      const sensors = Array.isArray(payload.sensors) ? payload.sensors : [];
      const value = pickSfp1RxDbm(sensors);
      if (value !== null) {
        return value;
      }
    } catch {
      // Continue with next reference.
    }
  }

  return null;
}

async function fetchLibreNmsEquipmentStatus(ref: string): Promise<string> {
  const resolvedRef = await resolveLibreNmsDeviceRef(ref);
  const refsToTry = Array.from(new Set([resolvedRef, ref]));

  for (const currentRef of refsToTry) {
    try {
      const details = await libreNmsRequest<LibreNmsDeviceDetailsResponse>(
        `/api/v0/devices/${encodeURIComponent(currentRef)}`
      );
      const device = Array.isArray(details.devices) ? details.devices[0] : null;
      if (!device) continue;

      const isUp = isDeviceUpStatus(device.status);
      if (isUp) return 'UP';

      try {
        const outages = await libreNmsRequest<LibreNmsOutagesResponse>(
          `/api/v0/devices/${encodeURIComponent(currentRef)}/outages`
        );
        const rows = Array.isArray(outages.outages) ? outages.outages : [];
        const latest = rows
          .map((row) => ({
            goingDownMs: parseTimestampMs(row.going_down),
            upAgainMs: parseTimestampMs(row.up_again),
          }))
          .filter((row) => row.goingDownMs !== null)
          .sort((a, b) => Number(b.goingDownMs) - Number(a.goingDownMs))[0];

        if (latest?.goingDownMs) {
          const endMs = latest.upAgainMs ?? Date.now();
          const durationMs = Math.max(0, endMs - latest.goingDownMs);
          return `DOWN (${formatDowntime(durationMs)})`;
        }
      } catch {
        // Keep plain DOWN if outages cannot be read.
      }

      return 'DOWN';
    } catch {
      // Continue with next reference.
    }
  }

  return 'N/A';
}

function resolveStatusLabel(reportType: ReportType, reportPhase: ReportPhase) {
  if (reportPhase === 'ready') {
    return reportType === 'daily' ? 'Rapport journalier est pret' : 'Rapport de nuit est pret';
  }

  if (reportPhase === 'in_progress') {
    return reportType === 'daily' ? 'Rapport journalier en cours' : 'Rapport de nuit en cours';
  }

  return reportType === 'daily' ? 'Rapport journalier en attente' : 'Rapport de nuit en attente';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportType = parseReportType(searchParams.get('type'));
  const settings = await loadNocReportingSettings();
  const reportDate = parseReportDate(searchParams.get('date'), settings.timeZone);
  const context = getReportContext(reportType, settings);
  const schedule = resolveSchedule(reportType, reportDate, settings.timeZone);

  try {
    let clients: ClientRow[] = [];

    try {
      clients = await db.$queryRaw<ClientRow[]>`
        SELECT
          nc.client_ref,
          nc.client_name,
          nc.service_type,
          nc.locality,
          nc.ip_client,
          nc.librenms_device_id,
          nc.status,
          MAX(mz.id_mapping) AS id_mapping
        FROM noc_clients nc
        LEFT JOIN mapping_zabbix mz
          ON mz.hostid_zabbix = nc.hostid_zabbix
          OR mz.id_client = nc.client_ref
          OR (nc.ip_client IS NOT NULL AND nc.ip_client <> '' AND mz.ip_client = nc.ip_client)
        GROUP BY
          nc.client_ref,
          nc.client_name,
          nc.service_type,
          nc.locality,
          nc.ip_client,
          nc.librenms_device_id,
          nc.status
        ORDER BY nc.client_name ASC
      `;
    } catch {
      try {
        clients = await db.$queryRaw<ClientRow[]>`
          SELECT
            nc.client_ref,
            nc.client_name,
            nc.service_type,
            NULL AS locality,
            nc.ip_client,
            nc.librenms_device_id,
            nc.status,
            MAX(mz.id_mapping) AS id_mapping
          FROM noc_clients nc
          LEFT JOIN mapping_zabbix mz
            ON mz.hostid_zabbix = nc.hostid_zabbix
            OR mz.id_client = nc.client_ref
            OR (nc.ip_client IS NOT NULL AND nc.ip_client <> '' AND mz.ip_client = nc.ip_client)
          GROUP BY
            nc.client_ref,
            nc.client_name,
            nc.service_type,
            nc.ip_client,
            nc.librenms_device_id,
            nc.status
          ORDER BY nc.client_name ASC
        `;
      } catch {
        // Legacy fallback when librenms_device_id/locality columns are not present.
        clients = await db.$queryRaw<ClientRow[]>`
          SELECT
            nc.client_ref,
            nc.client_name,
            nc.service_type,
            NULL AS locality,
            nc.ip_client,
            NULL AS librenms_device_id,
            nc.status,
            MAX(mz.id_mapping) AS id_mapping
          FROM noc_clients nc
          LEFT JOIN mapping_zabbix mz
            ON mz.hostid_zabbix = nc.hostid_zabbix
            OR mz.id_client = nc.client_ref
            OR (nc.ip_client IS NOT NULL AND nc.ip_client <> '' AND mz.ip_client = nc.ip_client)
          GROUP BY
            nc.client_ref,
            nc.client_name,
            nc.service_type,
            nc.ip_client,
            nc.status
          ORDER BY nc.client_name ASC
        `;
      }
    }

    let snapshots: SnapshotRow[] = [];
    try {
      snapshots = await db.$queryRaw<SnapshotRow[]>`
        SELECT id_mapping, rx_dbm, captured_at
        FROM noc_metric_snapshot
        WHERE captured_at >= ${schedule.startWindow}
          AND captured_at <= ${schedule.endWindow}
        ORDER BY captured_at DESC
      `;
    } catch {
      // Snapshot table may be absent in some environments; continue with LibreNMS fallback only.
      snapshots = [];
    }

    const snapshotsByMapping = new Map<number, SnapshotRow[]>();
    for (const snapshot of snapshots) {
      const list = snapshotsByMapping.get(snapshot.id_mapping) ?? [];
      list.push(snapshot);
      snapshotsByMapping.set(snapshot.id_mapping, list);
    }

    const libreNmsRxByClient = new Map<string, number | null>();
    const libreNmsEquipmentStatusByClient = new Map<string, string>();
    if (isLibreNmsConfigured()) {
      const refs = new Map<string, string>();

      for (const client of clients) {
        const clientRef = client.client_ref;
        const deviceRef = client.librenms_device_id != null
          ? String(client.librenms_device_id)
          : (client.ip_client && client.ip_client !== 'N/A' ? `ip:${client.ip_client}` : '');

        if (!deviceRef) continue;
        refs.set(clientRef, deviceRef);
      }

      await Promise.all(
        Array.from(refs.entries()).map(async ([clientRef, deviceRef]) => {
          const [rx, equipmentStatus] = await Promise.all([
            fetchLibreNmsCurrentRxDbm(deviceRef),
            fetchLibreNmsEquipmentStatus(deviceRef),
          ]);
          libreNmsRxByClient.set(clientRef, rx);
          libreNmsEquipmentStatusByClient.set(clientRef, equipmentStatus);
        })
      );
    }

    const rows: ReportClient[] = clients.map((client) => {
      const mappingId = client.id_mapping ?? 0;
      const clientSnapshots = mappingId ? snapshotsByMapping.get(mappingId) ?? [] : [];
      const libreNmsRx = libreNmsRxByClient.get(client.client_ref) ?? null;

      const morningRxFromDb = pickNearestRx(clientSnapshots, schedule.morningTime);
      const eveningRxFromDb = pickNearestRx(clientSnapshots, schedule.eveningTime);

      const shouldHideReceptionPowers = context.reportPhase === 'waiting';
      const isShiftInProgress = context.reportPhase === 'in_progress';

      // During in-progress windows, end-of-shift power is not yet sampled and must stay empty.
      // We keep a live fallback only for the start-of-shift column when snapshot is missing.
      const morningRxDbm = shouldHideReceptionPowers ? null : (morningRxFromDb ?? libreNmsRx);
      const eveningRxDbm = shouldHideReceptionPowers
        ? null
        : (isShiftInProgress ? null : (eveningRxFromDb ?? libreNmsRx));
      const remark = classifyPowerRemark(morningRxDbm, eveningRxDbm);

      return {
        clientRef: client.client_ref,
        clientName: client.client_name,
        serviceType: String(client.service_type ?? 'INTERNET').toUpperCase(),
        locality: String(client.locality ?? 'N/A'),
        ipClient: String(client.ip_client ?? 'N/A'),
        morningRxDbm,
        eveningRxDbm,
        status: normalizeClientStatus(client.status),
        equipmentStatus: libreNmsEquipmentStatusByClient.get(client.client_ref) ?? 'N/A',
        remark: remark.remark,
        remarkSeverity: remark.severity,
      };
    });

    const brazzaville = rows.filter((row) => normalizeCity(row.locality) === 'BRAZZAVILLE');
    const pointeNoire = rows.filter((row) => normalizeCity(row.locality) === 'POINTE-NOIRE');
    const autres = rows.filter((row) => normalizeCity(row.locality) === 'AUTRES');

    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      canGenerate: context.canGenerate,
      ready: context.ready,
      reportPhase: context.reportPhase,
      windowLabel: context.windowLabel,
      documentTitle: context.documentTitle,
      fileBaseName: context.fileBaseName,
      statusReadyMessage: context.statusReadyMessage,
      cutoffMessage: context.cutoffMessage,
      pendingMessage: context.pendingMessage,
      expectedReadinessLabel: context.expectedReadinessLabel,
      entryLabel: context.entryLabel,
      exitLabel: context.exitLabel,
      reportTypeLabel: context.reportTypeLabel,
      statusLabel: resolveStatusLabel(reportType, context.reportPhase),
      date: {
        iso: reportDate.toISOString(),
        label: formatDateLabel(reportDate, settings.timeZone),
      },
      schedule: {
        morningHour: schedule.morningHour,
        eveningHour: schedule.eveningHour,
        morningLabel: schedule.morningLabel,
        eveningLabel: schedule.eveningLabel,
      },
      meta: {
        supervisor: SUPERVISOR,
        operatorPhones: OPERATOR_PHONES,
        operators: [] as string[],
        entryTime: reportType === 'daily' ? '06:00' : '21:00',
        exitTime: reportType === 'daily' ? '18:00' : '06:00',
      },
      settings: {
        timeZone: settings.timeZone,
        daily: settings.daily,
        night: settings.night,
      },
      sections: [
        { key: 'brazzaville', title: 'Client Brazzaville', clients: brazzaville },
        { key: 'pointe-noire', title: 'Client Pointe-Noire', clients: pointeNoire },
        { key: 'autres', title: 'Autres localités', clients: autres },
      ],
    });
  } catch (error) {
    console.error('NOC shift power reporting error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Impossible de générer le rapport de puissance pour ce shift.',
      },
      { status: 500 }
    );
  }
}
