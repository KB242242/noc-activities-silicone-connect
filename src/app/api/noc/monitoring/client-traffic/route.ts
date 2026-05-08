import { NextRequest, NextResponse } from 'next/server';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';
import { format } from 'date-fns';

type PeriodKey = '6h' | '1d' | '1w' | '1m' | '1y';

const PERIOD_SECONDS: Record<PeriodKey, number> = {
  '6h': 6 * 3600,
  '1d': 24 * 3600,
  '1w': 7 * 24 * 3600,
  '1m': 30 * 24 * 3600,
  '1y': 365 * 24 * 3600,
};

const BUCKET_SECONDS: Record<PeriodKey, number> = {
  '6h': 5 * 60,
  '1d': 15 * 60,
  '1w': 60 * 60,
  '1m': 4 * 3600,
  '1y': 24 * 3600,
};

const LABEL_FORMAT: Record<PeriodKey, string> = {
  '6h': 'HH:mm',
  '1d': 'HH:mm',
  '1w': 'dd/MM HH:mm',
  '1m': 'dd/MM',
  '1y': 'dd/MM',
};

const MAX_POINTS = 720;

function normalizePeriod(raw: string | null): PeriodKey {
  if (raw === '6h' || raw === '1d' || raw === '1w' || raw === '1m' || raw === '1y') return raw;
  return '1d';
}

function parseEpochSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    const seconds = numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    return seconds > 0 ? seconds : null;
  }

  const parsed = new Date(trimmed).getTime();
  if (Number.isNaN(parsed)) return null;
  return Math.floor(parsed / 1000);
}

function computeBucketSeconds(durationSec: number, fallback: number): number {
  if (durationSec <= 0) return fallback;

  const raw = Math.ceil(durationSec / MAX_POINTS);
  if (raw <= 300) return 5 * 60;
  if (raw <= 900) return 15 * 60;
  if (raw <= 3600) return 60 * 60;
  if (raw <= 4 * 3600) return 4 * 3600;
  if (raw <= 12 * 3600) return 12 * 3600;
  if (raw <= 24 * 3600) return 24 * 3600;
  return 2 * 24 * 3600;
}

function resolveLabelFormat(durationSec: number): string {
  if (durationSec <= 2 * 24 * 3600) return 'dd/MM HH:mm';
  if (durationSec <= 45 * 24 * 3600) return 'dd/MM HH:mm';
  if (durationSec <= 400 * 24 * 3600) return 'dd/MM';
  return 'MM/yyyy';
}

type ZabbixItem = {
  itemid: string;
  name: string;
  key_: string;
  units: string;
  lastvalue: string;
  lastclock: string;
  value_type: string;
};

const WAN_KEYWORDS = ['wan', 'internet', 'uplink', 'up-link', 'transit', 'provider', 'isp', 'fai', 'outside', 'edge'];
const NON_WAN_KEYWORDS = ['lan', 'loopback', 'lo', 'vlan', 'bridge', 'mgmt', 'management'];

function normalizeInterfaceText(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase().trim();
}

function extractInterfaceToken(item: ZabbixItem): string {
  const key = normalizeInterfaceText(item.key_);
  const match = key.match(/net\.if\.(?:in|out)\[([^,\]]+)/);
  if (match?.[1]) return match[1].trim();
  return normalizeInterfaceText(item.name);
}

function isWanLikeItem(item: ZabbixItem): boolean {
  const candidate = `${extractInterfaceToken(item)} ${normalizeInterfaceText(item.name)} ${normalizeInterfaceText(item.key_)}`;
  const hasWanKeyword = WAN_KEYWORDS.some((word) => candidate.includes(word));
  const hasNonWanKeyword = NON_WAN_KEYWORDS.some((word) => candidate.includes(word));
  return hasWanKeyword && !hasNonWanKeyword;
}

function preferWanItems(items: ZabbixItem[]): ZabbixItem[] {
  const wanItems = items.filter(isWanLikeItem);
  return wanItems.length > 0 ? wanItems : items;
}

function toEpochNumber(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function zabbixTrafficRawToMbps(rawValue: number, item: ZabbixItem): number {
  const key = String(item.key_ ?? '').toLowerCase();
  const units = String(item.units ?? '').toLowerCase().trim();

  // net.if.* keys are usually bytes/s unless explicitly requested as bits.
  if (key.includes(',bits]')) {
    return rawValue / 1_000_000;
  }

  if (units === 'bps' || units === 'bit/s' || units === 'bits/s') {
    return rawValue / 1_000_000;
  }

  return (rawValue * 8) / 1_000_000;
}

function zabbixTrafficValueToMbps(item: ZabbixItem): number | null {
  const rawValue = Number(item.lastvalue);
  if (!Number.isFinite(rawValue)) return null;

  return zabbixTrafficRawToMbps(rawValue, item);
}

function pickBestCurrentMetric(items: ZabbixItem[]): number | null {
  const candidates = items
    .map((item) => ({
      clock: toEpochNumber(item.lastclock),
      mbps: zabbixTrafficValueToMbps(item),
    }))
    .filter((entry): entry is { clock: number; mbps: number } => entry.mbps != null && Number.isFinite(entry.mbps));

  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    if (right.clock !== left.clock) return right.clock - left.clock;
    return right.mbps - left.mbps;
  });

  return Number(candidates[0].mbps.toFixed(3));
}

type ZabbixHistoryPoint = {
  itemid: string;
  clock: string;
  value: string;
};

type ZabbixEventRaw = {
  eventid: string;
  clock: string;
  name: string;
  value: string;
  severity: string;
  acknowledged: string;
  r_eventid?: string;
  r_clock?: string;
};

type LibreNmsPortRow = {
  ifName?: string;
  ifDescr?: string;
  ifAlias?: string;
  ifOperStatus?: string;
  ifSpeed?: string | number;
  ifHighSpeed?: string | number;
  ifInOctets_rate?: string | number;
  ifOutOctets_rate?: string | number;
  ifInBits_rate?: string | number;
  ifOutBits_rate?: string | number;
  ifInOctets_delta?: string | number;
  ifOutOctets_delta?: string | number;
  poll_period?: string | number;
  port_id?: string | number;
};

type LibreNmsPortsResponse = {
  ports?: LibreNmsPortRow[];
  port?: LibreNmsPortRow[] | LibreNmsPortRow;
};

type LibreNmsDeviceRow = {
  device_id?: string | number;
  hostname?: string;
  ip?: string;
};

type LibreNmsDevicesResponse = {
  devices?: LibreNmsDeviceRow[];
};

type ResolvedLibreNmsDevice = {
  ref: string;
  deviceId: string | null;
};

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLibrenmsBitsToMbps(value: unknown): number | null {
  const numeric = numberOrNull(value);
  if (numeric == null) return null;
  return numeric / 1_000_000;
}

function derivePortRateMbps(
  rateBitsValue: unknown,
  rateOctetsValue: unknown,
  octetsDeltaValue: unknown,
  pollPeriodValue: unknown
): number | null {
  const bitsRateMbps = normalizeLibrenmsBitsToMbps(rateBitsValue);
  if (bitsRateMbps != null) return bitsRateMbps;

  const octetsRateMbps = normalizeLibrenmsBitsToMbps(rateOctetsValue);
  if (octetsRateMbps != null) return octetsRateMbps;

  const octetsDelta = numberOrNull(octetsDeltaValue);
  const pollPeriod = numberOrNull(pollPeriodValue);
  if (octetsDelta == null || pollPeriod == null || pollPeriod <= 0) return null;

  const bitsPerSecond = (octetsDelta * 8) / pollPeriod;
  return bitsPerSecond / 1_000_000;
}

function isWanLikePort(port: LibreNmsPortRow): boolean {
  const candidate = `${normalizeInterfaceText(port.ifName)} ${normalizeInterfaceText(port.ifDescr)} ${normalizeInterfaceText(port.ifAlias)}`;
  const hasWanKeyword = WAN_KEYWORDS.some((word) => candidate.includes(word));
  const hasNonWanKeyword = NON_WAN_KEYWORDS.some((word) => candidate.includes(word));
  return hasWanKeyword && !hasNonWanKeyword;
}

function pickBestPortRates(ports: LibreNmsPortRow[]): { inMbps: number | null; outMbps: number | null } {
  const activePorts = ports.filter((port) => String(port.ifOperStatus ?? '').toLowerCase() === 'up');

  const baseCandidates = activePorts.length > 0 ? activePorts : ports;
  const prioritizedCandidates = baseCandidates.filter(isWanLikePort);
  const candidates = prioritizedCandidates.length > 0 ? prioritizedCandidates : baseCandidates;

  let bestIn: number | null = null;
  let bestOut: number | null = null;

  for (const port of candidates) {
    const inMbps = derivePortRateMbps(
      port.ifInBits_rate,
      port.ifInOctets_rate,
      port.ifInOctets_delta,
      port.poll_period
    );
    const outMbps = derivePortRateMbps(
      port.ifOutBits_rate,
      port.ifOutOctets_rate,
      port.ifOutOctets_delta,
      port.poll_period
    );
    if (inMbps != null) {
      bestIn = bestIn == null ? inMbps : Math.max(bestIn, inMbps);
    }
    if (outMbps != null) {
      bestOut = bestOut == null ? outMbps : Math.max(bestOut, outMbps);
    }
  }

  return { inMbps: bestIn, outMbps: bestOut };
}

function hasPortUsableRates(port: LibreNmsPortRow): boolean {
  return (
    numberOrNull(port.ifInBits_rate) != null ||
    numberOrNull(port.ifOutBits_rate) != null ||
    numberOrNull(port.ifInOctets_rate) != null ||
    numberOrNull(port.ifOutOctets_rate) != null ||
    ((numberOrNull(port.ifInOctets_delta) != null || numberOrNull(port.ifOutOctets_delta) != null) && numberOrNull(port.poll_period) != null)
  );
}

function extractPortsFromPayload(payload: LibreNmsPortsResponse): LibreNmsPortRow[] {
  const portsFromList = Array.isArray(payload.ports) ? payload.ports : [];
  if (portsFromList.length > 0) return portsFromList;

  if (Array.isArray(payload.port)) {
    return payload.port;
  }
  if (payload.port && typeof payload.port === 'object') {
    return [payload.port];
  }
  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostid = searchParams.get('hostid')?.trim();
  const libreNmsDeviceId = searchParams.get('libreNmsDeviceId')?.trim();
  const ip = searchParams.get('ip')?.trim();
  const period = normalizePeriod(searchParams.get('period'));
  const requestedFrom = parseEpochSeconds(searchParams.get('from') ?? searchParams.get('startDate'));
  const requestedTo = parseEpochSeconds(searchParams.get('to') ?? searchParams.get('endDate'));

  if (!hostid && !libreNmsDeviceId && !ip) {
    return NextResponse.json({ success: false, error: 'hostid, libreNmsDeviceId ou ip requis' }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const defaultTimeFrom = now - PERIOD_SECONDS[period];
  const hasCustomRange = requestedFrom != null && requestedTo != null && requestedTo > requestedFrom;
  const timeFrom = hasCustomRange ? requestedFrom : defaultTimeFrom;
  const timeTill = hasCustomRange ? requestedTo : now;
  const durationSec = Math.max(60, timeTill - timeFrom);
  const bucketSec = hasCustomRange
    ? computeBucketSeconds(durationSec, BUCKET_SECONDS[period])
    : BUCKET_SECONDS[period];

  const resolveLibreNmsDeviceRef = async (): Promise<ResolvedLibreNmsDevice | null> => {
    if (libreNmsDeviceId) {
      return { ref: libreNmsDeviceId, deviceId: libreNmsDeviceId };
    }
    if (!ip) return null;

    try {
      const devicesData = await libreNmsRequest<LibreNmsDevicesResponse>(`/api/v0/devices?type=ipv4&query=${encodeURIComponent(ip)}`);
      const matchedDevice = Array.isArray(devicesData.devices)
        ? devicesData.devices.find((device) => String(device.ip ?? '').trim() === ip)
        : null;
      if (matchedDevice?.device_id != null) {
        return { ref: String(matchedDevice.device_id), deviceId: String(matchedDevice.device_id) };
      }
    } catch {
      // Ignore lookup errors and fallback to direct IP reference below.
    }

    return { ref: ip, deviceId: null };
  };

  if (hostid && isZabbixConfigured()) {
    try {
    // ── 1. Fetch traffic items for this host ──────────────────────────────────
    const items = await zabbixRequest<ZabbixItem[]>('item.get', {
      hostids: [hostid],
      search: { key_: 'net.if' },
      searchByAny: true,
      output: ['itemid', 'name', 'key_', 'units', 'lastvalue', 'lastclock', 'value_type'],
      sortfield: 'name',
      limit: 50,
    });

    const inItems = items.filter(
      (i) => i.key_.includes('.in[') || i.key_.toLowerCase().includes('ifinoctets')
    );
    const outItems = items.filter(
      (i) => i.key_.includes('.out[') || i.key_.toLowerCase().includes('ifoutoctets')
    );
    const effectiveInItems = preferWanItems(inItems);
    const effectiveOutItems = preferWanItems(outItems);
    const allTrafficItems =
      effectiveInItems.length > 0 || effectiveOutItems.length > 0
        ? [...new Map([...effectiveInItems, ...effectiveOutItems].map((i) => [i.itemid, i])).values()]
        : items.slice(0, 10);

    const inItemIds = new Set(effectiveInItems.map((i) => i.itemid));
    const outItemIds = new Set(effectiveOutItems.map((i) => i.itemid));
    const itemsById = new Map(allTrafficItems.map((item) => [item.itemid, item]));

    // ── 2. Fetch history grouped by value_type ────────────────────────────────
    const itemsByHistType = new Map<number, string[]>();
    for (const item of allTrafficItems) {
      const vt = Number(item.value_type ?? 0);
      const histType = vt === 3 ? 3 : 0;
      const existing = itemsByHistType.get(histType) ?? [];
      itemsByHistType.set(histType, [...existing, item.itemid]);
    }

    let historyPoints: ZabbixHistoryPoint[] = [];
    for (const [histType, ids] of itemsByHistType) {
      try {
        const points = await zabbixRequest<ZabbixHistoryPoint[]>('history.get', {
          itemids: ids,
          history: histType,
          time_from: timeFrom,
          time_till: timeTill,
          output: ['itemid', 'clock', 'value'],
          sortfield: 'clock',
          sortorder: 'ASC',
          limit: 5000,
        });
        historyPoints = historyPoints.concat(points);
      } catch {
        // Ignore per-type errors — try fallback
      }
    }

    // ── 3. Aggregate into time buckets ────────────────────────────────────────
    const bucketCount = Math.max(1, Math.ceil(durationSec / bucketSec));
    const inBuckets: number[][] = Array.from({ length: bucketCount }, () => []);
    const outBuckets: number[][] = Array.from({ length: bucketCount }, () => []);

    for (const point of historyPoints) {
      const clock = Number(point.clock);
      const idx = Math.floor((clock - timeFrom) / bucketSec);
      if (idx < 0 || idx >= bucketCount) continue;
      const raw = Number(point.value);
      if (!Number.isFinite(raw)) continue;
      const sourceItem = itemsById.get(point.itemid);
      if (!sourceItem) continue;
      const mbps = zabbixTrafficRawToMbps(raw, sourceItem);
      if (inItemIds.has(point.itemid)) {
        inBuckets[idx].push(mbps);
      } else if (outItemIds.has(point.itemid)) {
        outBuckets[idx].push(mbps);
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

    const lf = hasCustomRange ? resolveLabelFormat(durationSec) : LABEL_FORMAT[period];
    const traffic = Array.from({ length: bucketCount }, (_, i) => {
      const bucketTs = timeFrom + i * bucketSec;
      return {
        ts: bucketTs * 1000,
        label: format(new Date(bucketTs * 1000), lf),
        inMbps: avg(inBuckets[i]),
        outMbps: avg(outBuckets[i]),
      };
    }).filter((p) => p.inMbps !== null || p.outMbps !== null);

    // ── 4. Fetch UP/DOWN events ───────────────────────────────────────────────
    const rawEvents = await zabbixRequest<ZabbixEventRaw[]>('event.get', {
      hostids: [hostid],
      source: 0,
      object: 0,
      value: 1, // Problem events (DOWN)
      time_from: timeFrom,
      time_till: timeTill,
      output: ['eventid', 'clock', 'name', 'value', 'severity', 'acknowledged', 'r_eventid', 'r_clock'],
      sortfield: 'clock',
      sortorder: 'DESC',
      limit: 200,
    });

    type RealEventOut = {
      eventid: string;
      ts: number;
      label: string;
      type: 'DOWN' | 'UP';
      name: string;
      severity: number;
      durationSec: number | null;
      acknowledged: boolean;
    };

    const events: RealEventOut[] = [];
    let totalDowntimeSec = 0;

    for (const e of rawEvents) {
      const clock = Number(e.clock);
      const rClock = e.r_clock ? Number(e.r_clock) : 0;
      const durationSec = rClock > 0 ? rClock - clock : now - clock;
      totalDowntimeSec += durationSec;

      events.push({
        eventid: e.eventid,
        ts: clock * 1000,
        label: format(new Date(clock * 1000), 'dd/MM/yyyy HH:mm:ss'),
        type: 'DOWN',
        name: e.name,
        severity: Number(e.severity),
        durationSec,
        acknowledged: e.acknowledged === '1',
      });

      if (rClock > 0) {
        events.push({
          eventid: `r_${e.eventid}`,
          ts: rClock * 1000,
          label: format(new Date(rClock * 1000), 'dd/MM/yyyy HH:mm:ss'),
          type: 'UP',
          name: `Rétabli: ${e.name}`,
          severity: Number(e.severity),
          durationSec: null,
          acknowledged: e.acknowledged === '1',
        });
      }
    }

    events.sort((a, b) => b.ts - a.ts);

    // ── 5. Current live values from lastvalue ─────────────────────────────────
    const currentInMbps = pickBestCurrentMetric(effectiveInItems);
    const currentOutMbps = pickBestCurrentMetric(effectiveOutItems);
    const hasUsableTrafficData =
      traffic.length > 0 ||
      currentInMbps != null ||
      currentOutMbps != null;

    if (!hasUsableTrafficData && isLibreNmsConfigured() && (libreNmsDeviceId || ip)) {
      console.warn('Client traffic API zabbix returned no usable traffic data, trying LibreNMS fallback', {
        hostid,
        libreNmsDeviceId,
        ip,
      });
    } else {

      return NextResponse.json({
        success: true,
        source: 'zabbix',
        period,
        hostid,
        timeFrom: timeFrom * 1000,
        timeTill: timeTill * 1000,
        bucketSec,
        traffic,
        events: events.slice(0, 150),
        realDowntimeSec: totalDowntimeSec,
        currentInMbps,
        currentOutMbps,
        itemCount: allTrafficItems.length,
        items: allTrafficItems.slice(0, 5).map((i) => ({
          itemid: i.itemid,
          name: i.name,
          key: i.key_,
          lastvalue: i.lastvalue,
          units: i.units,
        })),
      });
    }
    } catch (error) {
      console.error('Client traffic API zabbix error:', error);
    }
  }

  if (!isLibreNmsConfigured()) {
    return NextResponse.json(
      {
        success: false,
        source: 'none',
        error: 'Aucune source trafic disponible (Zabbix/LibreNMS)',
        traffic: [],
        events: [],
        realDowntimeSec: null,
        currentInMbps: null,
        currentOutMbps: null,
        itemCount: 0,
      },
      { status: 502 }
    );
  }

  try {
    const resolvedDevice = await resolveLibreNmsDeviceRef();
    if (!resolvedDevice) {
      return NextResponse.json(
        {
          success: false,
          source: 'none',
          error: 'Référence device LibreNMS manquante',
          traffic: [],
          events: [],
          realDowntimeSec: null,
          currentInMbps: null,
          currentOutMbps: null,
          itemCount: 0,
        },
        { status: 400 }
      );
    }

    const encodedDeviceRef = encodeURIComponent(resolvedDevice.ref);
    const devicePortsData = await libreNmsRequest<LibreNmsPortsResponse>(`/api/v0/devices/${encodedDeviceRef}/ports`);
    let ports = extractPortsFromPayload(devicePortsData);

    let hasUsableRates = ports.some(hasPortUsableRates);
    if (!hasUsableRates && resolvedDevice.deviceId) {
      const searchedPortsData = await libreNmsRequest<LibreNmsPortsResponse>(`/api/v0/ports/search/device_id/${encodeURIComponent(resolvedDevice.deviceId)}`);
      const searchedPorts = extractPortsFromPayload(searchedPortsData);
      if (searchedPorts.length > 0) {
        ports = searchedPorts;
        hasUsableRates = ports.some(hasPortUsableRates);
      }
    }

    if (!hasUsableRates && ports.length > 0) {
      const prioritized = [...ports].sort((left, right) => {
        const leftScore = (String(left.ifOperStatus ?? '').toLowerCase() === 'up' ? 2 : 0) + (isWanLikePort(left) ? 1 : 0);
        const rightScore = (String(right.ifOperStatus ?? '').toLowerCase() === 'up' ? 2 : 0) + (isWanLikePort(right) ? 1 : 0);
        return rightScore - leftScore;
      });
      const candidates = prioritized.slice(0, 8);
      const detailedPorts: LibreNmsPortRow[] = [];

      for (const candidate of candidates) {
        const ifName = String(candidate.ifName ?? '').trim();
        if (!ifName) continue;
        try {
          const detailPayload = await libreNmsRequest<LibreNmsPortsResponse>(`/api/v0/devices/${encodedDeviceRef}/ports/${encodeURIComponent(ifName)}`);
          const detailedRows = extractPortsFromPayload(detailPayload);
          if (detailedRows.length > 0) {
            detailedPorts.push(...detailedRows);
          }
        } catch {
          // Continue with other candidates.
        }
      }

      if (detailedPorts.length > 0) {
        ports = detailedPorts;
        hasUsableRates = ports.some(hasPortUsableRates);
      }
    }

    const { inMbps, outMbps } = pickBestPortRates(ports);
    const nowMs = Date.now();
    const lf = hasCustomRange ? resolveLabelFormat(durationSec) : LABEL_FORMAT[period];

    return NextResponse.json({
      success: true,
      source: 'librenms',
      period,
      hostid: hostid ?? null,
      timeFrom: timeFrom * 1000,
      timeTill: timeTill * 1000,
      bucketSec,
      traffic:
        inMbps != null || outMbps != null
          ? [{ ts: nowMs, label: format(new Date(nowMs), lf), inMbps, outMbps }]
          : [],
      events: [],
      realDowntimeSec: null,
      currentInMbps: inMbps,
      currentOutMbps: outMbps,
      itemCount: ports.length,
      items: ports.slice(0, 5).map((port) => ({
        itemid: String(port.port_id ?? ''),
        name: String(port.ifAlias ?? port.ifName ?? 'port'),
        key: String(port.ifName ?? ''),
        lastvalue: String(port.ifInOctets_rate ?? ''),
        units: 'bps',
      })),
    });
  } catch (error) {
    console.error('Client traffic API librenms error:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'librenms',
        error: error instanceof Error ? error.message : 'Erreur interne',
        traffic: [],
        events: [],
        realDowntimeSec: null,
        currentInMbps: null,
        currentOutMbps: null,
        itemCount: 0,
      },
      { status: 502 }
    );
  }
}
