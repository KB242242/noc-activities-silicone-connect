import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';

export const runtime = 'nodejs';

type PingStats = {
  sent: number;
  received: number;
  lost: number;
  lossPercent: number;
  avgMs: number | null;
};

type ProbeFailureType = 'none' | 'timeout' | 'local_route' | 'name_resolution' | 'unknown';

type ProbeDefinition = {
  id: string;
  label: string;
  target: string;
  kind: 'internet' | 'core' | 'equipment';
};

function isValidHost(value: string): boolean {
  const host = value.trim();
  if (!host) return false;

  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const hostname = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)*[a-zA-Z0-9-]{1,63}$/;
  return ipv4.test(host) || hostname.test(host);
}

function runPing(host: string, count: number, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const args = process.platform === 'win32'
      ? ['-n', String(count), '-w', String(timeoutMs), host]
      : ['-c', String(count), '-W', String(Math.max(1, Math.floor(timeoutMs / 1000))), host];

    const child = spawn('ping', args, { windowsHide: true });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });

    child.on('error', () => {
      resolve({ ok: false, output });
    });

    child.on('close', (code) => {
      resolve({ ok: code === 0, output });
    });
  });
}

function parsePingStats(output: string, fallbackCount: number): PingStats {
  const normalized = output.replace(/\r/g, '');

  const sentReceivedLostMatch =
    normalized.match(/Packets: Sent = (\d+), Received = (\d+), Lost = (\d+) \((\d+)% loss\)/i) ??
    normalized.match(/Paquets\s*:\s*envoy[ée]s\s*=\s*(\d+)\s*,\s*re[çc]us\s*=\s*(\d+)\s*,\s*perdus\s*=\s*(\d+)\s*\((\d+)%\s*perte\)/i) ??
    normalized.match(/(\d+) packets transmitted, (\d+) (?:packets )?received,.*?(\d+)% packet loss/i);

  let sent = fallbackCount;
  let received = 0;
  let lost = fallbackCount;
  let lossPercent = 100;

  if (sentReceivedLostMatch) {
    if (sentReceivedLostMatch.length >= 5 && (/Packets:/i.test(sentReceivedLostMatch[0]) || /Paquets\s*:/i.test(sentReceivedLostMatch[0]))) {
      sent = Number(sentReceivedLostMatch[1]);
      received = Number(sentReceivedLostMatch[2]);
      lost = Number(sentReceivedLostMatch[3]);
      lossPercent = Number(sentReceivedLostMatch[4]);
    } else {
      sent = Number(sentReceivedLostMatch[1]);
      received = Number(sentReceivedLostMatch[2]);
      lost = Math.max(0, sent - received);
      lossPercent = Number(sentReceivedLostMatch[3]);
    }
  }

  const avgMatch =
    normalized.match(/Average = (\d+)ms/i) ??
    normalized.match(/Moyenne\s*=\s*(\d+)ms/i) ??
    normalized.match(/= [\d.]+\/(\d+(?:\.\d+)?)\/[\d.]+\/[\d.]+ ms/i);

  // Fallback: count reply lines directly when packet summary isn't parseable (localized OS outputs).
  if (!sentReceivedLostMatch) {
    const replyMatches = normalized.match(/ttl\s*[=:]/gi) ?? [];
    const inferredReceived = replyMatches.length;
    received = Math.max(received, inferredReceived);
    sent = fallbackCount;
    lost = Math.max(0, sent - received);
    lossPercent = sent > 0 ? Math.round((lost / sent) * 100) : 100;
  }

  const avgMs = avgMatch ? Number(avgMatch[1]) : null;

  return {
    sent: Number.isFinite(sent) ? sent : fallbackCount,
    received: Number.isFinite(received) ? received : 0,
    lost: Number.isFinite(lost) ? lost : fallbackCount,
    lossPercent: Number.isFinite(lossPercent) ? lossPercent : 100,
    avgMs: Number.isFinite(avgMs ?? NaN) ? avgMs : null,
  };
}

async function probeEquipmentHttp(host: string, timeoutMs: number): Promise<{ reachable: boolean; status: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`http://${host}:2021`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    return { reachable: true, status: response.status };
  } catch {
    clearTimeout(timer);
    return { reachable: false, status: null };
  }
}

async function runProbe(probe: ProbeDefinition, count: number, timeoutMs: number) {
  const pingResult = await runPing(probe.target, count, timeoutMs);
  const stats = parsePingStats(pingResult.output, count);
  // Only consider reachable if we actually received at least one reply AND loss < 100%.
  // On Windows, ping exits with code 0 even on 100% loss in some edge cases.
  const reachable = stats.received > 0 && stats.lossPercent < 100;
  const failureType = detectProbeFailureType(pingResult.output, reachable);

  return {
    ...probe,
    reachable,
    inconclusive: false,
    failureType,
    ...stats,
    note: buildProbeNote(probe, reachable, failureType),
  };
}

function buildProbeNote(
  probe: ProbeDefinition,
  reachable: boolean,
  failureType: ProbeFailureType
): string {
  if (reachable) {
    return `Réponse reçue depuis ${probe.label.toLowerCase()}.`;
  }

  if (failureType === 'local_route') {
    return `Aucune réponse depuis ${probe.label.toLowerCase()}: échec de routage local depuis la sonde NOC (route/ACL/interface à vérifier).`;
  }

  if (failureType === 'name_resolution') {
    return `Aucune réponse depuis ${probe.label.toLowerCase()}: résolution de nom invalide ou cible mal saisie (vérifier l'adresse/IP).`;
  }

  if (failureType === 'timeout') {
    return `Aucune réponse depuis ${probe.label.toLowerCase()}: délai d'attente dépassé (filtrage ICMP, lien saturé ou indisponibilité distante).`;
  }

  return `Aucune réponse reçue depuis ${probe.label.toLowerCase()} (cause non déterminée).`;
}

function detectProbeFailureType(output: string, reachable: boolean): ProbeFailureType {
  if (reachable) return 'none';

  const normalized = output.toLowerCase();
  if (
    normalized.includes('general failure') ||
    normalized.includes('transmit failed') ||
    normalized.includes('destination host unreachable') ||
    normalized.includes('network is unreachable') ||
    normalized.includes('destination d hote inaccessible') ||
    normalized.includes('destination d hôte inaccessible')
  ) {
    return 'local_route';
  }

  if (
    normalized.includes('could not find host') ||
    normalized.includes('name or service not known') ||
    normalized.includes('temporary failure in name resolution') ||
    normalized.includes('impossible de trouver l hote') ||
    normalized.includes('impossible de trouver l hôte')
  ) {
    return 'name_resolution';
  }

  if (
    normalized.includes('request timed out') ||
    normalized.includes('100% packet loss') ||
    normalized.includes('delai d attente de la demande depasse') ||
    normalized.includes('délai d attente de la demande dépassé') ||
    normalized.includes('délai d\'attente de la demande dépassé')
  ) {
    return 'timeout';
  }

  return 'unknown';
}

// ── Temperature probe ──────────────────────────────────────────────────────────

type TemperatureSensor = { name: string; value: number; unit: string };

type TemperatureProbe = {
  source: 'zabbix' | 'librenms' | 'none';
  available: boolean;
  sensors: TemperatureSensor[];
  maxTemp: number | null;
  overheating: boolean;
};

type ZabbixItem = { itemid: string; key_: string; name: string; lastvalue: string; units: string };
type LibreNmsSensor = { sensor_class: string; sensor_descr: string; sensor_current: number };
type LibreNmsSensorsResponse = { sensors?: LibreNmsSensor[] };

async function fetchTemperatureData(hostid: string | null, equipmentIp: string): Promise<TemperatureProbe> {
  // 1. Try Zabbix (temperature items)
  if (hostid && isZabbixConfigured()) {
    try {
      const items = await zabbixRequest<ZabbixItem[]>('item.get', {
        hostids: [hostid],
        search: { key_: 'temp' },
        searchWildcardsEnabled: true,
        output: ['itemid', 'key_', 'name', 'lastvalue', 'units'],
        limit: 20,
      });

      const sensors: TemperatureSensor[] = items
        .filter((item) => item.lastvalue !== undefined && item.lastvalue !== '')
        .map((item) => ({ name: item.name, value: parseFloat(item.lastvalue), unit: item.units || '°C' }))
        .filter((s) => Number.isFinite(s.value));

      if (sensors.length > 0) {
        const maxTemp = Math.max(...sensors.map((s) => s.value));
        return { source: 'zabbix', available: true, sensors, maxTemp, overheating: maxTemp > 50 };
      }
    } catch {
      // Zabbix unavailable or no items found; fall through to LibreNMS
    }
  }

  // 2. Try LibreNMS (by IP)
  if (isLibreNmsConfigured()) {
    try {
      const deviceId = encodeURIComponent(`ip:${equipmentIp}`);
      const data = await libreNmsRequest<LibreNmsSensorsResponse>(`/api/v0/devices/${deviceId}/sensors`);
      const tempSensors = (data.sensors ?? []).filter((s) => s.sensor_class === 'temperature');

      if (tempSensors.length > 0) {
        const sensors: TemperatureSensor[] = tempSensors.map((s) => ({
          name: s.sensor_descr,
          value: s.sensor_current,
          unit: '°C',
        }));
        const maxTemp = Math.max(...sensors.map((s) => s.value));
        return { source: 'librenms', available: true, sensors, maxTemp, overheating: maxTemp > 50 };
      }
    } catch {
      // LibreNMS unavailable or device not found
    }
  }

  return { source: 'none', available: false, sensors: [], maxTemp: null, overheating: false };
}

function buildOverallStatus(
  browserOnline: boolean | null,
  probes: Array<{ id: string; kind: 'internet' | 'core' | 'equipment'; reachable: boolean; inconclusive: boolean }>,
  equipmentHttpReachable: boolean
): 'ok' | 'degraded' | 'critical' {
  const hasInconclusiveProbe = probes.some((probe) => probe.inconclusive);
  const internetProbe = probes.find((probe) => probe.id === 'internet');
  const coreReachable = probes.some((probe) => probe.kind === 'core' && probe.reachable);
  const equipmentReachable = probes.find((probe) => probe.id === 'equipment')?.reachable ?? false;

  if (browserOnline === false) {
    return 'critical';
  }

  if (hasInconclusiveProbe) {
    return 'degraded';
  }

  if (!internetProbe?.reachable || !coreReachable) {
    return 'critical';
  }

  if (!equipmentReachable || !equipmentHttpReachable) {
    return 'degraded';
  }

  return 'ok';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { ip?: string; browserOnline?: boolean | null; hostid?: string | null };
    const ip = String(body.ip ?? '').trim();
    const browserOnline = typeof body.browserOnline === 'boolean' ? body.browserOnline : null;
    const hostid = body.hostid ? String(body.hostid).trim() : null;

    if (!ip || !isValidHost(ip)) {
      return NextResponse.json({ success: false, error: 'Adresse IP/host invalide.' }, { status: 400 });
    }

    const [rawProbes, equipmentHttp2021, temperatureProbe] = await Promise.all([
      Promise.all([
        runProbe({ id: 'internet', label: 'Internet Google DNS', target: '8.8.8.8', kind: 'internet' }, 4, 2000),
        runProbe({ id: 'core-mx-mgk2', label: 'MX MGK2 Pointe-Noire', target: '102.220.247.254', kind: 'core' }, 4, 2000),
        runProbe({ id: 'core-acx-schq-pnr', label: 'ACX SCHQ PNR', target: '102.220.247.255', kind: 'core' }, 4, 2000),
        runProbe({ id: 'core-mx-tlp', label: 'MX TLP Brazzaville', target: '102.220.245.254', kind: 'core' }, 4, 2000),
        runProbe({ id: 'core-acx-elbo', label: 'ACX ELBO', target: '102.220.247.255', kind: 'core' }, 4, 2000),
        runProbe({ id: 'equipment', label: 'Équipement client', target: ip, kind: 'equipment' }, 4, 2000),
      ]),
      probeEquipmentHttp(ip, 2500),
      fetchTemperatureData(hostid, ip),
    ]);

    const internetProbe = rawProbes.find((probe) => probe.kind === 'internet');
    const coreProbes = rawProbes.filter((probe) => probe.kind === 'core');
    const allCoreDown = coreProbes.length > 0 && coreProbes.every((probe) => !probe.reachable);
    const localRouteFailureDetected = rawProbes.some((probe) => probe.failureType === 'local_route');
    const probeExecutionInconclusive = Boolean(!internetProbe?.reachable && allCoreDown && localRouteFailureDetected);

    const probes = rawProbes.map((probe) => {
      if (!probeExecutionInconclusive || probe.reachable) {
        return probe;
      }

      if (probe.kind === 'internet' || probe.kind === 'core' || probe.kind === 'equipment') {
        return {
          ...probe,
          inconclusive: true,
          note: `Résultat indéterminé: la sonde NOC ne dispose pas d'une route ICMP fiable vers ${probe.target}.`,
        };
      }

      return probe;
    });

    const overallStatus = buildOverallStatus(browserOnline, probes, equipmentHttp2021.reachable);

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      browserOnline,
      overallStatus,
      probes,
      probeExecution: {
        source: 'noc-server',
        inconclusive: probeExecutionInconclusive,
      },
      equipmentHttp2021: {
        reachable: equipmentHttp2021.reachable,
        httpStatus: equipmentHttp2021.status,
      },
      temperatureProbe,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue de diagnostic rapide.',
      },
      { status: 500 }
    );
  }
}