import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';

type HostRow = {
  hostid: string;
  host: string;
  available?: string;
};

// problem.get is the recommended API for active problems (Zabbix docs §20.API)
type ProblemRow = {
  eventid: string;
  objectid: string;
  clock: string;
  name: string;
  severity: string; // 0=Not classified, 1=Info, 2=Warning, 3=Average, 4=High, 5=Disaster
  acknowledged: string;
};

type MappingRef = {
  id_client: string;
  hostid_zabbix: string;
};

type LibreNmsDeviceRow = {
  device_id: string | number;
  hostname?: string;
  status?: string | number;
  disabled?: string | number;
  ignore?: string | number;
};

type LibreNmsDevicesResponse = {
  status: string;
  devices?: LibreNmsDeviceRow[];
};

type LibreNmsAlertRow = {
  id?: string | number;
  device_id?: string | number;
  hostname?: string;
  severity?: string | number;
  state?: string | number;
  timestamp?: string;
  alerted?: string;
  note?: string;
  msg?: string;
};

type LibreNmsAlertsResponse = {
  status: string;
  alerts?: LibreNmsAlertRow[];
};

export async function GET() {
  const zabbixConfigured = isZabbixConfigured();
  const libreNmsConfigured = isLibreNmsConfigured();

  if (!zabbixConfigured && !libreNmsConfigured) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Aucune source de monitoring configuree. Renseigner ZABBIX_API_URL/ZABBIX_API_TOKEN ou LibreNMS_API_URL/LibreNMS_API_TOKEN.',
      },
      { status: 503 }
    );
  }

  try {
    const mappingRows = zabbixConfigured
      ? await db.$queryRaw<MappingRef[]>`
          SELECT id_client, hostid_zabbix
          FROM mapping_zabbix
          WHERE hostid_zabbix IS NOT NULL AND hostid_zabbix <> ''
        `
      : [];

    const mappedHostIds = Array.from(new Set(mappingRows.map((row) => row.hostid_zabbix)));

    let hosts: HostRow[] = [];
    let problems: ProblemRow[] = [];
    let zabbixError: string | null = null;
    if (zabbixConfigured) {
      try {
        [hosts, problems] = await Promise.all([
          zabbixRequest<HostRow[]>('host.get', {
            output: ['hostid', 'host', 'available'],
            monitored_hosts: true,
            ...(mappedHostIds.length > 0 ? { hostids: mappedHostIds } : {}),
            limit: 500,
          }),
          // problem.get returns active (unresolved) problems only — preferred over trigger.get
          zabbixRequest<ProblemRow[]>('problem.get', {
            output: ['eventid', 'objectid', 'clock', 'name', 'severity', 'acknowledged'],
            sortfield: ['eventid'],
            sortorder: 'DESC',
            limit: 100,
          }),
        ]);
      } catch (error) {
        zabbixError = error instanceof Error ? error.message : 'Erreur Zabbix inconnue';
      }
    }

    let libreNmsDevices: LibreNmsDeviceRow[] = [];
    let libreNmsAlerts: LibreNmsAlertRow[] = [];
    let libreNmsError: string | null = null;
    if (libreNmsConfigured) {
      try {
        const devicesData = await libreNmsRequest<LibreNmsDevicesResponse>('api/v0/devices');
        libreNmsDevices = Array.isArray(devicesData.devices) ? devicesData.devices : [];

        // Alerts endpoint varies by LibreNMS version/configuration.
        const alertPaths = ['api/v0/alerts?state=1', 'api/v0/alerts'];
        for (const path of alertPaths) {
          try {
            const alertsData = await libreNmsRequest<LibreNmsAlertsResponse>(path);
            libreNmsAlerts = Array.isArray(alertsData.alerts) ? alertsData.alerts : [];
            break;
          } catch {
            // Keep trying known variants; alerts stay optional for overview stability.
          }
        }
      } catch (error) {
        libreNmsError = error instanceof Error ? error.message : 'Erreur LibreNMS inconnue';
      }
    }

    const zabbixUpHosts = hosts.filter((h) => h.available === '1').length;
    const zabbixDownHosts = hosts.filter((h) => h.available === '2').length;

    const activeLibreNmsDevices = libreNmsDevices.filter(
      (device) => String(device.disabled ?? '0') !== '1' && String(device.ignore ?? '0') !== '1'
    );
    const libreNmsUpHosts = activeLibreNmsDevices.filter((device) => String(device.status ?? '0') === '1').length;
    const libreNmsDownHosts = Math.max(activeLibreNmsDevices.length - libreNmsUpHosts, 0);

    const upHosts = zabbixUpHosts + libreNmsUpHosts;
    const downHosts = zabbixDownHosts + libreNmsDownHosts;
    const totalHosts = Math.max(upHosts + downHosts, 1);

    const downHostIds = new Set(hosts.filter((host) => host.available === '2').map((host) => host.hostid));
    const downClients = mappingRows.filter((row) => downHostIds.has(row.hostid_zabbix)).length;
    const activeClients = Math.max(mappingRows.length - downClients, 0);

    const zabbixCritical = problems.filter((p) => Number(p.severity) >= 4).length;
    const zabbixWarning = problems.filter((p) => Number(p.severity) === 2 || Number(p.severity) === 3).length;
    const zabbixInfo = Math.max(problems.length - zabbixCritical - zabbixWarning, 0);

    const libreNmsCritical = libreNmsAlerts.filter((a) => Number(a.severity ?? 0) >= 4).length;
    const libreNmsWarning = libreNmsAlerts.filter((a) => Number(a.severity ?? 0) >= 2 && Number(a.severity ?? 0) < 4).length;
    const libreNmsInfo = Math.max(libreNmsAlerts.length - libreNmsCritical - libreNmsWarning, 0);

    const critical = zabbixCritical + libreNmsCritical;
    const warning = zabbixWarning + libreNmsWarning;
    const info = zabbixInfo + libreNmsInfo;

    const payload = {
      success: true,
      generatedAt: new Date().toISOString(),
      networkHealth: {
        upPercent: Number(((upHosts / totalHosts) * 100).toFixed(2)),
        upHosts,
        downHosts,
      },
      clients: {
        activeClients,
        downClients,
        saturatedClients: Math.max(warning, 0),
      },
      alerts: {
        critical,
        warning,
        info,
      },
      sla: {
        monthlyPercent: Number((100 - (downHosts / totalHosts) * 0.5).toFixed(2)),
        downtimeMinutes: downHosts * 10,
      },
      recentEvents: [
        ...problems.map((p) => ({
          eventid: p.eventid,
          title: p.name,
          timestamp: Number(p.clock) * 1000,
          severity: p.severity,
        })),
        ...libreNmsAlerts.map((a, idx) => ({
          eventid: String(a.id ?? `${a.device_id ?? 'librenms'}-${idx}`),
          title: String(a.msg ?? a.note ?? a.alerted ?? `Alerte LibreNMS ${a.device_id ?? ''}`),
          timestamp: a.timestamp ? new Date(a.timestamp).getTime() : Date.now(),
          severity: String(a.severity ?? '2'),
        })),
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20),
      sources: {
        zabbix: {
          configured: zabbixConfigured,
          hosts: hosts.length,
          problems: problems.length,
          error: zabbixError,
        },
        librenms: {
          configured: libreNmsConfigured,
          devices: activeLibreNmsDevices.length,
          alerts: libreNmsAlerts.length,
          error: libreNmsError,
        },
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('NOC overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur Zabbix: impossible de charger la vue NOC.' },
      { status: 502 }
    );
  }
}
