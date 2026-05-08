import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

type PingStats = {
  sent: number;
  received: number;
  lost: number;
  lossPercent: number;
  avgMs: number | null;
};

type ConnectivityDiagnosis = {
  liaisonReachable: boolean;
  equipmentReachable: boolean;
  status: 'ok' | 'liaison_down' | 'equipment_down' | 'unknown';
  message: string;
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

function buildDiagnosis(pingReachable: boolean, equipmentReachable: boolean): ConnectivityDiagnosis {
  if (!pingReachable) {
    return {
      liaisonReachable: false,
      equipmentReachable: false,
      status: 'liaison_down',
      message: 'Liaison injoignable: aucune reponse ICMP depuis la plateforme NOC.',
    };
  }

  if (!equipmentReachable) {
    return {
      liaisonReachable: true,
      equipmentReachable: false,
      status: 'equipment_down',
      message: 'Liaison joignable mais equipement/port 2021 injoignable.',
    };
  }

  return {
    liaisonReachable: true,
    equipmentReachable: true,
    status: 'ok',
    message: 'Liaison et equipement joignables.',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ip = String(searchParams.get('ip') ?? '').trim();
  const count = Math.max(1, Math.min(10, Number(searchParams.get('count') ?? 3)));

  if (!ip || !isValidHost(ip)) {
    return NextResponse.json(
      { success: false, error: 'Adresse IP/host invalide.' },
      { status: 400 }
    );
  }

  try {
    const pingResult = await runPing(ip, count, 1500);
    const pingStats = parsePingStats(pingResult.output, count);
    const pingReachable = pingResult.ok || pingStats.received > 0;

    const equipmentProbe = await probeEquipmentHttp(ip, 2500);
    const diagnosis = buildDiagnosis(pingReachable, equipmentProbe.reachable);

    return NextResponse.json({
      success: true,
      target: ip,
      checkedAt: new Date().toISOString(),
      ping: {
        reachable: pingReachable,
        ...pingStats,
      },
      equipmentHttp2021: {
        reachable: equipmentProbe.reachable,
        httpStatus: equipmentProbe.status,
      },
      diagnosis,
      rawPing: pingResult.output.slice(0, 2500),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue de connectivite.',
      },
      { status: 500 }
    );
  }
}
