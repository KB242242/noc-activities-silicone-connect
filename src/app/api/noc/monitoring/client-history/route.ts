import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type PeriodKey = '6h' | '1d' | '1w' | '1m' | '1y';

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

type HistoryStore = {
  snapshots: HistorySnapshot[];
};

const STORE_FILE = path.join(process.cwd(), 'data', 'zabbix_client_history.json');

const PERIOD_MS: Record<PeriodKey, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

function normalizePeriod(raw: string | null): PeriodKey {
  if (raw === '6h' || raw === '1d' || raw === '1w' || raw === '1m' || raw === '1y') {
    return raw;
  }
  return '1d';
}

function parseDateMs(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = new Date(raw).getTime();
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

async function ensureStore(): Promise<void> {
  const dir = path.dirname(STORE_FILE);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    const initial: HistoryStore = { snapshots: [] };
    await fs.writeFile(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readStore(): Promise<HistoryStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as HistoryStore;
    if (!parsed || !Array.isArray(parsed.snapshots)) {
      return { snapshots: [] };
    }
    return parsed;
  } catch {
    return { snapshots: [] };
  }
}

async function writeStore(store: HistoryStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function estimateSubscribedBandwidth(serviceType: string): number {
  const normalized = (serviceType || '').toUpperCase();
  if (normalized.includes('LIAISON')) return 100;
  if (normalized.includes('MPLS')) return 50;
  if (normalized.includes('VPN')) return 30;
  return 20;
}

function clip(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeAlerts(series: HistorySnapshot[]) {
  const alerts: Array<{
    timestamp: number;
    level: 'warning' | 'critical';
    type: 'overconsumption' | 'anomaly';
    message: string;
  }> = [];

  let previous: HistorySnapshot | null = null;

  for (const point of series) {
    const overconsumptionThreshold = 85;

    if (point.consumption >= overconsumptionThreshold) {
      alerts.push({
        timestamp: point.timestamp,
        level: point.consumption >= 95 ? 'critical' : 'warning',
        type: 'overconsumption',
        message: `Consommation élevée: ${point.consumption.toFixed(1)}% de la bande passante souscrite`,
      });
    }

    if (previous) {
      const deltaAvailability = Math.abs(point.availability - previous.availability);
      const deltaConsumption = Math.abs(point.consumption - previous.consumption);

      if (deltaAvailability >= 10 || deltaConsumption >= 25) {
        alerts.push({
          timestamp: point.timestamp,
          level: deltaAvailability >= 20 || deltaConsumption >= 35 ? 'critical' : 'warning',
          type: 'anomaly',
          message: `Anomalie détectée: variation brusque (disp ${deltaAvailability.toFixed(1)} pts, conso ${deltaConsumption.toFixed(1)} pts)`,
        });
      }
    }

    previous = point;
  }

  return alerts.slice(-30).reverse();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<HistorySnapshot>;

    if (!body || typeof body.clientId !== 'number' || Number.isNaN(body.clientId)) {
      return NextResponse.json({ success: false, error: 'clientId invalide' }, { status: 400 });
    }

    const now = Date.now();
    const timestamp =
      typeof body.timestamp === 'number' && Number.isFinite(body.timestamp) ? body.timestamp : now;

    const subscribed =
      typeof body.subscribedBandwidthMbps === 'number' && Number.isFinite(body.subscribedBandwidthMbps)
        ? body.subscribedBandwidthMbps
        : estimateSubscribedBandwidth(String(body.serviceType || ''));

    const snapshot: HistorySnapshot = {
      clientId: body.clientId,
      clientName: String(body.clientName || ''),
      serviceType: String(body.serviceType || ''),
      timestamp,
      availability: clip(Number(body.availability ?? 100), 0, 100),
      consumption: clip(Number(body.consumption ?? 0), 0, 100),
      incidentCount: Math.max(0, Math.round(Number(body.incidentCount ?? 0))),
      downEquipments: Math.max(0, Math.round(Number(body.downEquipments ?? 0))),
      monitorStatus: String(body.monitorStatus || 'UP'),
      subscribedBandwidthMbps: Math.max(1, Math.round(subscribed)),
    };

    const store = await readStore();

    const recentDuplicate = store.snapshots.find(
      (item) => item.clientId === snapshot.clientId && Math.abs(item.timestamp - snapshot.timestamp) < 60 * 1000
    );

    if (!recentDuplicate) {
      store.snapshots.push(snapshot);
      const oneYearAgo = Date.now() - PERIOD_MS['1y'];
      store.snapshots = store.snapshots.filter((item) => item.timestamp >= oneYearAgo);
      await writeStore(store);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('client-history POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible d\'enregistrer l\'historique' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = Number(searchParams.get('clientId'));

    if (!clientId || Number.isNaN(clientId)) {
      return NextResponse.json({ success: false, error: 'clientId requis' }, { status: 400 });
    }

    const period = normalizePeriod(searchParams.get('period'));
    const comparePeriod = normalizePeriod(searchParams.get('comparePeriod'));
    const compareEnabled = searchParams.get('compareEnabled') === '1';
    const startDateMs = parseDateMs(searchParams.get('startDate'));
    const endDateMs = parseDateMs(searchParams.get('endDate'));
    const compareStartDateMs = parseDateMs(searchParams.get('compareStartDate'));
    const compareEndDateMs = parseDateMs(searchParams.get('compareEndDate'));

    const store = await readStore();
    const now = Date.now();

    const clientSeries = store.snapshots
      .filter((item) => item.clientId === clientId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const currentStart = startDateMs ?? now - PERIOD_MS[period];
    const currentEnd = endDateMs ?? now;
    const current = clientSeries.filter(
      (item) => item.timestamp >= currentStart && item.timestamp <= currentEnd
    );

    let compare: HistorySnapshot[] = [];
    if (compareEnabled) {
      const compareMs = PERIOD_MS[comparePeriod];
      const fallbackCompareEnd = currentStart;
      const compareEnd = compareEndDateMs ?? fallbackCompareEnd;
      const compareStart = compareStartDateMs ?? compareEnd - compareMs;
      compare = clientSeries.filter((item) => item.timestamp >= compareStart && item.timestamp < compareEnd);
    }

    return NextResponse.json({
      success: true,
      period,
      comparePeriod,
      current,
      compare,
      alerts: computeAlerts(current),
    });
  } catch (error) {
    console.error('client-history GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de lire l\'historique' },
      { status: 500 }
    );
  }
}
