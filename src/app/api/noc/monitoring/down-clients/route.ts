import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';

type ClientDownRow = {
  id_client: number;
  client_ref: string;
  client_name: string;
  logo_url: string | null;
  preferred_equipment_image_url: string | null;
  service_type: string;
  bandwidth_mbps: number | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  equipment_status: string;
  updated_at: Date;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  ip_client: string | null;
  hostid_zabbix: string | null;
  librenms_device_id: number | string | null;
  librenms_sysname: string | null;
  total_equipments_count: bigint;
  equipment_types_csv: string | null;
  down_equipments_count: bigint;
  down_equipments_detail: string | null; // JSON stringified array
};

type EquipmentDownRow = {
  id: number;
  code: string;
  status: string;
  type: string;
  model: string;
  serialNumber: string;
  imageUrl?: string | null;
  updated: Date;
};

type ZabbixProblemRow = {
  eventid: string;
  objectid: string;
  clock: string;
  name: string;
  severity: string;
  acknowledged: string;
  hosts?: Array<{
    hostid: string;
    host?: string;
  }>;
};

type ZabbixTriggerRow = {
  triggerid: string;
  hosts?: Array<{ hostid: string }>;
};


type ZabbixHostRow = {
  hostid: string;
  available?: string;
};

type LibreNmsDeviceRow = {
  device_id: string | number;
  hostname?: string;
  sysname?: string;
  ip?: string;
  status?: string | number;
  disabled?: string | number;
  ignore?: string | number;
};

type LibreNmsDevicesResponse = {
  status: string;
  devices?: LibreNmsDeviceRow[];
};

type MonitorStatus = 'DOWN' | 'SUSPENDED' | 'RESTARTED' | 'INTERFACES_DOWN' | 'UP';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 300), 1000);
    const includeResolved = searchParams.get('includeResolved') === '1';
    const requestedScope = (searchParams.get('scope') ?? 'down').toLowerCase();
    const scope: 'down' | 'up' | 'all' =
      requestedScope === 'up' || requestedScope === 'all' ? requestedScope : 'down';

    // Step 1: Query clients monitored by NOC
    let downClientsRows: ClientDownRow[] = [];
    try {
      downClientsRows = await db.$queryRaw<ClientDownRow[]>`
        SELECT
          c.id_client,
          c.client_ref,
          c.client_name,
          c.logo_url,
          (
            SELECT e.image_url
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
              AND e.image_url IS NOT NULL
              AND e.image_url <> ''
            ORDER BY (CASE WHEN e.status = 'UP' THEN 0 ELSE 1 END), e.updated_at DESC
            LIMIT 1
          ) AS preferred_equipment_image_url,
          c.service_type,
          c.bandwidth_mbps,
          c.status,
          c.updated_at,
          c.contact_email,
          c.contact_phone,
          c.address,
          c.ip_client,
          c.hostid_zabbix,
          c.librenms_device_id,
          c.librenms_sysname,
          (
            SELECT COUNT(*)
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
          ) AS total_equipments_count,
          (
            SELECT GROUP_CONCAT(DISTINCT e.equipement_type ORDER BY e.equipement_type SEPARATOR ', ')
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
              AND e.equipement_type IS NOT NULL
              AND e.equipement_type <> ''
          ) AS equipment_types_csv,
          (
            SELECT COALESCE(MIN(e.status), 'UP')
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
          ) AS equipment_status,
          (
            SELECT COUNT(*)
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
              AND e.status != 'UP'
              AND e.status IS NOT NULL
          ) AS down_equipments_count,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', e.id_equipement,
                'code', e.equipement_code,
                'status', e.status,
                'type', e.equipement_type,
                'model', COALESCE(e.model, 'N/A'),
                'imageUrl', e.image_url,
                'serialNumber', COALESCE(e.serial_number, 'N/A'),
                'updated', e.updated_at
              )
            )
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
              AND e.status != 'UP'
              AND e.status IS NOT NULL
            ORDER BY e.updated_at DESC
          ) AS down_equipments_detail
        FROM noc_clients c
        ORDER BY c.updated_at DESC
        LIMIT ${limit}
      `;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '');
      const isSchemaCompatibilityError =
        /unknown column/i.test(message) ||
        /inconnu/i.test(message) ||
        /1054/i.test(message) ||
        /doesn't exist/i.test(message) ||
        /n'existe pas/i.test(message);
      if (!isSchemaCompatibilityError) {
        throw error;
      }
      try {
        // Compatibility level 1: keep client/equipment logos, drop only LibreNMS columns.
        downClientsRows = await db.$queryRaw<ClientDownRow[]>`
          SELECT
            c.id_client,
            c.client_ref,
            c.client_name,
            c.logo_url,
            (
              SELECT e.image_url
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.image_url IS NOT NULL
                AND e.image_url <> ''
              ORDER BY (CASE WHEN e.status = 'UP' THEN 0 ELSE 1 END), e.updated_at DESC
              LIMIT 1
            ) AS preferred_equipment_image_url,
            c.service_type,
            c.bandwidth_mbps,
            c.status,
            c.updated_at,
            c.contact_email,
            c.contact_phone,
            c.address,
            c.ip_client,
            c.hostid_zabbix,
            NULL AS librenms_device_id,
            NULL AS librenms_sysname,
            (
              SELECT COUNT(*)
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
            ) AS total_equipments_count,
            (
              SELECT GROUP_CONCAT(DISTINCT e.equipement_type ORDER BY e.equipement_type SEPARATOR ', ')
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.equipement_type IS NOT NULL
                AND e.equipement_type <> ''
            ) AS equipment_types_csv,
            (
              SELECT COALESCE(MIN(e.status), 'UP')
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
            ) AS equipment_status,
            (
              SELECT COUNT(*)
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.status != 'UP'
                AND e.status IS NOT NULL
            ) AS down_equipments_count,
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', e.id_equipement,
                  'code', e.equipement_code,
                  'status', e.status,
                  'type', e.equipement_type,
                  'model', COALESCE(e.model, 'N/A'),
                  'imageUrl', e.image_url,
                  'serialNumber', COALESCE(e.serial_number, 'N/A'),
                  'updated', e.updated_at
                )
              )
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.status != 'UP'
                AND e.status IS NOT NULL
              ORDER BY e.updated_at DESC
            ) AS down_equipments_detail
          FROM noc_clients c
          ORDER BY c.updated_at DESC
          LIMIT ${limit}
        `;
      } catch {
        downClientsRows = await db.$queryRaw<ClientDownRow[]>`
          SELECT
            c.id_client,
            c.client_ref,
            c.client_name,
            NULL AS logo_url,
            NULL AS preferred_equipment_image_url,
            c.service_type,
            c.bandwidth_mbps,
            c.status,
            c.updated_at,
            c.contact_email,
            c.contact_phone,
            c.address,
            c.ip_client,
            c.hostid_zabbix,
            NULL AS librenms_device_id,
            NULL AS librenms_sysname,
            (
              SELECT COUNT(*)
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
            ) AS total_equipments_count,
            (
              SELECT GROUP_CONCAT(DISTINCT e.equipement_type ORDER BY e.equipement_type SEPARATOR ', ')
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.equipement_type IS NOT NULL
                AND e.equipement_type <> ''
            ) AS equipment_types_csv,
            (
              SELECT COALESCE(MIN(e.status), 'UP')
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
            ) AS equipment_status,
            (
              SELECT COUNT(*)
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.status != 'UP'
                AND e.status IS NOT NULL
            ) AS down_equipments_count,
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', e.id_equipement,
                  'code', e.equipement_code,
                  'status', e.status,
                  'type', e.equipement_type,
                  'model', COALESCE(e.model, 'N/A'),
                  'imageUrl', NULL,
                  'serialNumber', COALESCE(e.serial_number, 'N/A'),
                  'updated', e.updated_at
                )
              )
              FROM noc_equipements e
              WHERE e.client_id = c.id_client
                AND e.status != 'UP'
                AND e.status IS NOT NULL
              ORDER BY e.updated_at DESC
            ) AS down_equipments_detail
          FROM noc_clients c
          ORDER BY c.updated_at DESC
          LIMIT ${limit}
        `;
      }
    }

    // Step 2: Extract Zabbix host IDs from clients
    const mappingMap = new Map<number, string>();
    const mappedHostIds: string[] = [];

    downClientsRows.forEach((client) => {
      if (client.hostid_zabbix) {
        mappingMap.set(client.id_client, client.hostid_zabbix);
        mappedHostIds.push(client.hostid_zabbix);
      }
    });

    // Step 3: Fetch Zabbix incidents and host availability
    const zabbixConfigured = isZabbixConfigured();
    let zabbixProblems: ZabbixProblemRow[] = [];
    let zabbixHosts: ZabbixHostRow[] = [];
    let zabbixLive = false;
    let zabbixError: string | null = null;
    if (zabbixConfigured && mappedHostIds.length > 0) {
      try {
        const [triggers, hosts] = await Promise.all([
          zabbixRequest<ZabbixTriggerRow[]>('trigger.get', {
            output: ['triggerid'],
            selectHosts: ['hostid'],
            hostids: mappedHostIds,
            monitored: true,
          }),
          zabbixRequest<ZabbixHostRow[]>('host.get', {
            output: ['hostid', 'available'],
            hostids: mappedHostIds,
          }),
        ]);

        const triggerToHost = new Map<string, string>();
        triggers.forEach((trigger) => {
          const hostId = trigger.hosts?.[0]?.hostid;
          if (hostId) triggerToHost.set(trigger.triggerid, hostId);
        });

        const triggerIds = triggers.map((trigger) => trigger.triggerid);
        let fetchedProblems: ZabbixProblemRow[] = [];
        if (triggerIds.length > 0) {
          fetchedProblems = await zabbixRequest<ZabbixProblemRow[]>('problem.get', {
            output: ['eventid', 'objectid', 'clock', 'name', 'severity', 'acknowledged'],
            objectids: triggerIds,
            sortfield: 'eventid',
            sortorder: 'DESC',
            limit: 1000,
          });
        }

        fetchedProblems.forEach((problem) => {
          const hostId = triggerToHost.get(problem.objectid);
          if (hostId) problem.hosts = [{ hostid: hostId }];
        });

        zabbixProblems = fetchedProblems;
        zabbixHosts = hosts;
        zabbixLive = true;
      } catch (error) {
        console.error('Zabbix problems query failed:', error);
        zabbixError = error instanceof Error ? error.message : 'Erreur Zabbix inconnue';
      }
    }

    const libreNmsConfigured = isLibreNmsConfigured();
    let libreNmsDevices: LibreNmsDeviceRow[] = [];
    let libreNmsLive = false;
    let libreNmsError: string | null = null;
    if (libreNmsConfigured) {
      try {
        const devicesData = await libreNmsRequest<LibreNmsDevicesResponse>('api/v0/devices');
        libreNmsDevices = Array.isArray(devicesData.devices) ? devicesData.devices : [];
        libreNmsLive = true;
      } catch (error) {
        console.error('LibreNMS devices query failed:', error);
        libreNmsError = error instanceof Error ? error.message : 'Erreur LibreNMS inconnue';
      }
    }

    const mappedHostIdsSet = new Set(mappedHostIds);
    const zabbixHostAvailability = new Map<string, string>(
      zabbixHosts.map((host) => [host.hostid, host.available ?? '0'])
    );

    const normalizeIdentifier = (value: string | null | undefined): string | null => {
      if (!value) return null;
      return value.trim().toLowerCase();
    };

    const libreNmsByIp = new Map<string, LibreNmsDeviceRow>();
    const libreNmsByHostname = new Map<string, LibreNmsDeviceRow>();
    const libreNmsByDeviceId = new Map<string, LibreNmsDeviceRow>();
    const libreNmsBySysname = new Map<string, LibreNmsDeviceRow>();
    libreNmsDevices.forEach((device) => {
      if (String(device.disabled ?? '0') === '1' || String(device.ignore ?? '0') === '1') {
        return;
      }

      const normalizedIp = normalizeIdentifier(device.ip);
      const normalizedHostname = normalizeIdentifier(device.hostname);
      const normalizedSysname = normalizeIdentifier(device.sysname);
      const deviceIdStr = device.device_id !== undefined && device.device_id !== null ? String(device.device_id) : null;
      if (deviceIdStr) {
        libreNmsByDeviceId.set(deviceIdStr, device);
      }
      if (normalizedSysname) {
        libreNmsBySysname.set(normalizedSysname, device);
      }
      if (normalizedIp) {
        libreNmsByIp.set(normalizedIp, device);
      }
      if (normalizedHostname) {
        libreNmsByHostname.set(normalizedHostname, device);
      }
    });

    // Step 4: Build response with clients + incidents
    const monitoredClients = downClientsRows.map((client) => {
      const hostId = mappingMap.get(client.id_client);
      const clientProblems = hostId
        ? zabbixProblems.filter((p) =>
            Array.isArray(p.hosts)
              ? p.hosts.some((h) => h.hostid === hostId)
              : false
          )
        : [];

      const hostAvailability = hostId ? zabbixHostAvailability.get(hostId) ?? null : null;

      const normalizedClientIp = normalizeIdentifier(client.ip_client);
      const normalizedClientRef = normalizeIdentifier(client.client_ref);
      const normalizedClientName = normalizeIdentifier(client.client_name);
      const clientLibreDeviceId = client.librenms_device_id ? String(client.librenms_device_id) : null;
      const normalizedClientSysname = normalizeIdentifier(client.librenms_sysname);
      // LibreNMS may store IPs in hostname field (empty ip field) – match on hostname too
      const libreDevice =
        (clientLibreDeviceId ? libreNmsByDeviceId.get(clientLibreDeviceId) : undefined) ||
        (normalizedClientSysname ? libreNmsBySysname.get(normalizedClientSysname) : undefined) ||
        (normalizedClientIp ? libreNmsByIp.get(normalizedClientIp) : undefined) ||
        (normalizedClientIp ? libreNmsByHostname.get(normalizedClientIp) : undefined) ||
        (normalizedClientRef ? libreNmsByHostname.get(normalizedClientRef) : undefined) ||
        (normalizedClientName ? libreNmsByHostname.get(normalizedClientName) : undefined) ||
        null;
      const libreDeviceStatus = libreDevice ? String(libreDevice.status ?? '0') : null;
      const libreDeviceDown = libreDeviceStatus !== null && libreDeviceStatus !== '1';

      let downEquipments: EquipmentDownRow[] = [];

      if (client.down_equipments_detail) {
        try {
          downEquipments = JSON.parse(client.down_equipments_detail);
        } catch {
          // Parse error, skip
        }
      }

      const monitorStatus = deriveMonitorStatus(
        client.status,
        client.equipment_status,
        clientProblems,
        hostAvailability,
        libreDeviceDown
      );

      const incidentClocksMs = clientProblems
        .map((problem) => Number(problem.clock) * 1000)
        .filter((value) => Number.isFinite(value) && value > 0);
      const nowMs = Date.now();
      // Use the most recent active incident as downtime start to avoid inflated durations
      // when several old active problems coexist for the same host.
      const incidentDownSinceMs = incidentClocksMs.length > 0 ? Math.max(...incidentClocksMs) : null;
      const fallbackDownSinceMs = client.updated_at ? new Date(client.updated_at).getTime() : null;
      const downSinceMs = incidentDownSinceMs ?? fallbackDownSinceMs;
      const isCurrentlyDown = monitorStatus !== 'UP';
      const downtimeSeconds =
        isCurrentlyDown && downSinceMs != null && Number.isFinite(downSinceMs)
          ? Math.max(0, Math.floor((nowMs - downSinceMs) / 1000))
          : 0;
      const downtimeMinutes =
        downtimeSeconds > 0 ? Math.floor(downtimeSeconds / 60) : 0;
      const lastEventAt = incidentClocksMs.length > 0 ? Math.max(...incidentClocksMs) : null;

      return {
        id_client: Number(client.id_client),
        client_ref: client.client_ref,
        client_name: client.client_name,
        logo_url: client.logo_url,
        preferred_equipment_image_url: client.preferred_equipment_image_url,
        service_type: client.service_type,
        bandwidth_mbps:
          client.bandwidth_mbps === null || client.bandwidth_mbps === undefined
            ? null
            : Number(client.bandwidth_mbps),
        client_status: client.status,
        equipment_status: client.equipment_status,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone,
        address: client.address,
        ip_client: client.ip_client,
        updated_at: client.updated_at,
        total_equipments_count: Number(client.total_equipments_count),
        equipment_types: client.equipment_types_csv
          ? client.equipment_types_csv.split(',').map((type) => type.trim()).filter(Boolean)
          : [],
        down_equipments_count: Number(client.down_equipments_count),
        down_equipments: downEquipments,
        zabbix_hostid: hostId ?? null,
        zabbix_host_available: hostAvailability,
        librenms_device_id: libreDevice?.device_id ? String(libreDevice.device_id) : null,
        librenms_device_status: libreDeviceStatus,
        monitor_status: monitorStatus,
        zabbix_incidents: clientProblems.map((p) => ({
          eventid: p.eventid,
          name: p.name,
          severity: Number(p.severity),
          severity_label: getSeverityLabel(Number(p.severity)),
          clock: Number(p.clock) * 1000, // Convert to milliseconds
          acknowledged: p.acknowledged === '1',
        })),
        incident_count: clientProblems.length,
        downtime_seconds: downtimeSeconds,
        downtime_minutes: downtimeMinutes,
        last_event_at: lastEventAt,
      };
    });

    const downClientsData = monitoredClients.filter((client) => {
      const hasLocalIssue = client.equipment_status !== 'UP' || client.client_status === 'SUSPENDED';
      const hasZabbixIssue = client.zabbix_hostid
        ? mappedHostIdsSet.has(client.zabbix_hostid) && client.incident_count > 0
        : false;
      const hasLibreNmsIssue = client.librenms_device_status !== null && client.librenms_device_status !== '1';
      const isDownLike = hasLocalIssue || hasZabbixIssue || hasLibreNmsIssue || client.monitor_status !== 'UP';

      if (scope === 'up') return client.monitor_status === 'UP';
      if (scope === 'all') return true;
      return isDownLike;
    });

    // Step 5: Calculate summary
    const totalDownClients = downClientsData.filter((client) => client.monitor_status !== 'UP').length;
    const totalUpClients = downClientsData.filter((client) => client.monitor_status === 'UP').length;
    const totalAffectedEquipments = downClientsData.reduce((sum, c) => sum + c.down_equipments_count, 0);
    const totalAlerts = downClientsData.reduce((sum, c) => sum + c.incident_count, 0);

    const criticalAlerts = downClientsData.reduce(
      (sum, c) => sum + c.zabbix_incidents.filter((i) => i.severity >= 4).length,
      0
    );

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary: {
        totalDownClients,
        totalUpClients,
        totalAffectedEquipments,
        totalAlerts,
        criticalAlerts,
      },
      source: {
        zabbix: {
          configured: zabbixConfigured,
          live: zabbixLive,
          mappedHostIds: mappedHostIds.length,
          fetchedProblems: zabbixProblems.length,
          fetchedHosts: zabbixHosts.length,
          error: zabbixError,
        },
        librenms: {
          configured: libreNmsConfigured,
          live: libreNmsLive,
          fetchedDevices: libreNmsDevices.length,
          error: libreNmsError,
        },
      },
      scope,
      downClients: downClientsData,
    });
  } catch (error) {
    console.error('NOC down clients error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des clients down',
      },
      { status: 500 }
    );
  }
}

function getSeverityLabel(severity: number): string {
  const severityMap: Record<number, string> = {
    0: 'Not classified',
    1: 'Information',
    2: 'Warning',
    3: 'Average',
    4: 'High',
    5: 'Disaster',
  };
  return severityMap[severity] ?? `Unknown (${severity})`;
}

function deriveMonitorStatus(
  clientStatus: string,
  equipmentStatus: string,
  incidents: ZabbixProblemRow[] = [],
  hostAvailability: string | null,
  libreDeviceDown = false
): MonitorStatus {
  if (clientStatus === 'SUSPENDED') {
    return 'SUSPENDED';
  }

  const hasCriticalIncident = incidents.some((incident) => Number(incident.severity ?? 0) >= 4);
  const hasDownSignal = equipmentStatus !== 'UP' || hasCriticalIncident || hostAvailability === '2' || libreDeviceDown;

  const hasInterfaceIssue = incidents.some((incident) => {
    const name = (incident.name ?? '').toLowerCase();
    const severity = Number(incident.severity ?? 0);
    const acknowledged = incident.acknowledged === '1';
    const interfaceLike =
      name.includes('interface') ||
      name.includes('port') ||
      name.includes('link down');
    return interfaceLike && severity >= 3 && !acknowledged;
  });
  if (hasInterfaceIssue && hasDownSignal) {
    return 'INTERFACES_DOWN';
  }

  if (hasDownSignal) {
    return 'DOWN';
  }

  const hasRestartSignal = incidents.some((incident) => {
    const name = (incident.name ?? '').toLowerCase();
    return name.includes('restart') || name.includes('reboot') || incident.acknowledged === '1';
  });
  if (hasRestartSignal) {
    return 'RESTARTED';
  }

  return 'UP';
}
