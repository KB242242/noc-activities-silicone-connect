import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';

type ZabbixHostRow = {
  hostid: string;
  host?: string;
  name?: string;
};

type ZabbixSyncResult = {
  status: 'SYNCED' | 'PENDING' | 'ERROR' | 'UNLINKED';
  mappingId: number | null;
  linkRef: string | null;
  message: string;
};

async function syncClientZabbixLink(params: {
  clientRef: string;
  clientName: string;
  hostidZabbix?: string | null;
  ipClient?: string | null;
  zabbixElement?: string | null;
}): Promise<ZabbixSyncResult> {
  const hostid = String(params.hostidZabbix ?? '').trim();
  const ipClient = String(params.ipClient ?? '').trim();
  const zabbixElement = String(params.zabbixElement ?? '').trim();

  if (!hostid) {
    try {
      await db.$executeRaw`DELETE FROM mapping_zabbix WHERE id_client = ${params.clientRef}`;
    } catch {
      // keep save operation resilient if mapping table is unavailable
    }
    return {
      status: 'UNLINKED',
      mappingId: null,
      linkRef: null,
      message: 'Aucun host Zabbix fourni, liaison supprimée si existante.',
    };
  }

  if (!ipClient) {
    try {
      await db.$executeRaw`
        INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
        VALUES (${params.clientRef}, ${hostid}, ${null}, ${zabbixElement || params.clientName}, ${'PENDING'})
        ON DUPLICATE KEY UPDATE
          hostid_zabbix = VALUES(hostid_zabbix),
          ip_client = VALUES(ip_client),
          nom_host = VALUES(nom_host),
          sync_status = VALUES(sync_status),
          updated_at = CURRENT_TIMESTAMP
      `;

      return {
        status: 'PENDING',
        mappingId: null,
        linkRef: `${params.clientRef}::${hostid}`,
        message: 'Hostid renseigné mais IP client absente: liaison enregistrée, synchronisation en attente.',
      };
    } catch {
      return {
        status: 'ERROR',
        mappingId: null,
        linkRef: `${params.clientRef}::${hostid}`,
        message: 'Hostid fourni mais la liaison mapping_zabbix n\'a pas pu être enregistrée.',
      };
    }
  }

  let hostLabel = zabbixElement || params.clientName;
  let hostCheckError = false;

  if (isZabbixConfigured()) {
    try {
      const hostRows = await zabbixRequest<ZabbixHostRow[]>('host.get', {
        output: ['hostid', 'host', 'name'],
        hostids: [hostid],
        limit: 1,
      });
      const first = hostRows?.[0];
      if (first) {
        if (!zabbixElement) {
          hostLabel = first.name || first.host || params.clientName;
        }
      } else {
        return {
          status: 'ERROR',
          mappingId: null,
          linkRef: `${params.clientRef}::${hostid}`,
          message: `Host Zabbix introuvable pour hostid=${hostid}.`,
        };
      }
    } catch {
      hostCheckError = true;
    }
  }

  try {
    await db.$executeRaw`
      INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
      VALUES (${params.clientRef}, ${hostid}, ${ipClient}, ${hostLabel}, ${hostCheckError ? 'PENDING' : 'SYNCED'})
      ON DUPLICATE KEY UPDATE
        hostid_zabbix = VALUES(hostid_zabbix),
        ip_client = VALUES(ip_client),
        nom_host = VALUES(nom_host),
        sync_status = VALUES(sync_status),
        updated_at = CURRENT_TIMESTAMP
    `;

    const rows = await db.$queryRaw<Array<{ id_mapping: number; sync_status: 'SYNCED' | 'PENDING' | 'ERROR' }>>`
      SELECT id_mapping, sync_status
      FROM mapping_zabbix
      WHERE id_client = ${params.clientRef}
      LIMIT 1
    `;

    const mapping = rows[0];
    return {
      status: mapping?.sync_status ?? (hostCheckError ? 'PENDING' : 'SYNCED'),
      mappingId: mapping?.id_mapping ?? null,
      linkRef: `${params.clientRef}::${hostid}`,
      message: hostCheckError
        ? 'Liaison créée localement. Vérification Zabbix indisponible pour le moment.'
        : 'Liaison client/Zabbix synchronisée.',
    };
  } catch {
    return {
      status: 'ERROR',
      mappingId: null,
      linkRef: `${params.clientRef}::${hostid}`,
      message: 'Impossible de persister la liaison mapping_zabbix.',
    };
  }
}

function bigintToNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  return null;
}

function serialize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return obj;
}

function isUnknownColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /unknown column|champ\s+.*inconnu/i.test(message);
}

function isSchemaCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /unknown column|champ\s+.*inconnu|doesn't exist|n'existe pas|no such table|unknown table/i.test(message);
}

async function ensureCalendarTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_client_working_hours (
      id_working_hour INT NOT NULL AUTO_INCREMENT,
      client_id BIGINT UNSIGNED NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      label VARCHAR(120) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_working_hour),
      KEY idx_noc_client_working_hours_client (client_id),
      CONSTRAINT fk_noc_client_working_hours_client FOREIGN KEY (client_id)
        REFERENCES noc_clients(id_client) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_client_holidays (
      id_holiday INT NOT NULL AUTO_INCREMENT,
      client_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(160) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_holiday),
      KEY idx_noc_client_holidays_client (client_id),
      CONSTRAINT fk_noc_client_holidays_client FOREIGN KEY (client_id)
        REFERENCES noc_clients(id_client) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

// ─── GET /api/noc/client-profile?clientRef=CSC-2025-00001 ────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientRef = searchParams.get('clientRef') ?? '';

  if (!clientRef) {
    return NextResponse.json({ success: false, error: 'clientRef requis' }, { status: 400 });
  }

  try {
    await ensureCalendarTables();
    // 1. Client principal
    let clientRows: any[] = [];
    try {
      clientRows = await db.$queryRaw<any[]>`
        SELECT
          c.id_client, c.client_ref, c.client_name, c.logo_url, c.contact_phone, c.contact_email,
          c.address, c.country, c.locality, c.client_type, c.ip_client, c.hostid_zabbix,
          c.librenms_device_id, c.librenms_sysname,
          c.sla_target_percent, c.service_type, c.bandwidth_mbps, c.notes,
          c.satisfaction_score, c.satisfaction_comment, c.status,
          mz.nom_host AS zabbix_element,
          CASE
            WHEN c.hostid_zabbix IS NULL OR TRIM(c.hostid_zabbix) = '' THEN NULL
            ELSE CONCAT(c.client_ref, '::', c.hostid_zabbix)
          END AS zabbix_link_ref
        FROM noc_clients c
        LEFT JOIN mapping_zabbix mz ON mz.id_client = c.client_ref
        WHERE c.client_ref = ${clientRef}
        LIMIT 1
      `;
    } catch (error) {
      if (!isSchemaCompatibilityError(error)) {
        throw error;
      }
      try {
        clientRows = await db.$queryRaw<any[]>`
          SELECT
            c.id_client, c.client_ref, c.client_name, c.logo_url, c.contact_phone, c.contact_email,
            c.address, c.country, c.locality, c.client_type, c.ip_client, c.hostid_zabbix,
            NULL AS librenms_device_id, NULL AS librenms_sysname,
            c.sla_target_percent, c.service_type, c.bandwidth_mbps, c.notes,
            c.satisfaction_score, c.satisfaction_comment, c.status,
            NULL AS zabbix_element,
            CASE
              WHEN c.hostid_zabbix IS NULL OR TRIM(c.hostid_zabbix) = '' THEN NULL
              ELSE CONCAT(c.client_ref, '::', c.hostid_zabbix)
            END AS zabbix_link_ref
          FROM noc_clients c
          WHERE c.client_ref = ${clientRef}
          LIMIT 1
        `;
      } catch (fallbackError) {
        if (!isSchemaCompatibilityError(fallbackError)) {
          throw fallbackError;
        }
        clientRows = await db.$queryRaw<any[]>`
          SELECT
            c.id_client, c.client_ref, c.client_name,
            NULL AS logo_url,
            c.contact_phone,
            c.contact_email,
            c.address,
            NULL AS country,
            NULL AS locality,
            NULL AS client_type,
            c.ip_client,
            c.hostid_zabbix,
            NULL AS librenms_device_id,
            NULL AS librenms_sysname,
            c.sla_target_percent,
            c.service_type,
            c.bandwidth_mbps,
            c.notes,
            NULL AS satisfaction_score,
            NULL AS satisfaction_comment,
            c.status,
            NULL AS zabbix_element,
            CASE
              WHEN c.hostid_zabbix IS NULL OR TRIM(c.hostid_zabbix) = '' THEN NULL
              ELSE CONCAT(c.client_ref, '::', c.hostid_zabbix)
            END AS zabbix_link_ref
          FROM noc_clients c
          WHERE c.client_ref = ${clientRef}
          LIMIT 1
        `;
      }
    }
    if (!clientRows.length) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
    }
    const clientId = Number(clientRows[0].id_client);

    // 2. Contacts
    const contacts = await db.$queryRaw<any[]>`
      SELECT full_name, role_label, phone, email, is_primary
      FROM noc_client_contacts
      WHERE client_id = ${clientId}
      ORDER BY is_primary DESC, id_contact ASC
    `.catch(() => []);

    // 3. Liaisons
    const liaisons = await db.$queryRaw<any[]>`
      SELECT liaison_label, from_port, to_port, bandwidth_mbps, service_type, status, notes
      FROM noc_client_liaisons
      WHERE client_id = ${clientId}
      ORDER BY id_liaison ASC
    `.catch(() => []);

    // 4. Documents client
    const documents = await db.$queryRaw<any[]>`
      SELECT doc_type, file_name, file_url, mime_type
      FROM noc_client_documents
      WHERE client_id = ${clientId}
      ORDER BY id_document ASC
    `.catch(() => []);

    // 5. Équipements
    const equipements = await db.$queryRaw<any[]>`
      SELECT
        equipement_code, equipement_type, vendor, model, image_url, serial_number,
        ip_management, zabbix_hostid, latitude, longitude,
        install_date, replace_due_date, estimated_service_life_months, status
      FROM noc_equipements
      WHERE client_id = ${clientId}
      ORDER BY id_equipement ASC
    `.catch(() => []);

    // 6. Poteaux
    const poteaux = await db.$queryRaw<any[]>`
      SELECT poteau_code, label, address, latitude, longitude, status
      FROM noc_poteaux
      WHERE client_id = ${clientId}
      ORDER BY id_poteau ASC
    `.catch(() => []);

    // 7. Interventions
    const interventions = await db.$queryRaw<any[]>`
      SELECT title, intervention_type, status, start_at, end_at, technician_name, ticket_ref, notes
      FROM noc_client_interventions
      WHERE client_id = ${clientId}
      ORDER BY id_intervention ASC
    `.catch(() => []);

    const workingHours = await db.$queryRaw<any[]>`
      SELECT id_working_hour AS id, day_of_week AS dayOfWeek, TIME_FORMAT(start_time, '%H:%i') AS startTime, TIME_FORMAT(end_time, '%H:%i') AS endTime, label
      FROM noc_client_working_hours
      WHERE client_id = ${clientId}
      ORDER BY day_of_week ASC, start_time ASC
    `.catch(() => []);

    const holidays = await db.$queryRaw<any[]>`
      SELECT id_holiday AS id, title, DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate, DATE_FORMAT(end_date, '%Y-%m-%d') AS endDate, notes
      FROM noc_client_holidays
      WHERE client_id = ${clientId}
      ORDER BY start_date ASC, end_date ASC
    `.catch(() => []);

    // 8. Historique
    const history = await db.$queryRaw<any[]>`
      SELECT action_type, action_label, actor_name, created_at
      FROM noc_client_history
      WHERE client_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT 50
    `.catch(() => []);

    // 9. Partenaires avec leurs documents
    const partners = await db.$queryRaw<any[]>`
      SELECT
        p.id_partner, p.partner_code, p.partner_name, p.contract_date, p.expiry_date,
        p.description, p.operation_zones, p.contact_email, p.contact_phone, p.status
      FROM noc_partners p
      JOIN noc_client_partner cp ON cp.partner_id = p.id_partner
      WHERE cp.client_id = ${clientId}
      ORDER BY p.partner_name ASC
    `.catch(() => []);

    // 9b. Documents partenaires
    const partnerDocs: Record<number, any[]> = {};
    for (const p of partners) {
      const pId = Number(p.id_partner);
      const docs = await db.$queryRaw<any[]>`
        SELECT doc_type, file_name, file_url, mime_type
        FROM noc_partner_documents
        WHERE partner_id = ${pId}
        ORDER BY id_doc ASC
      `.catch(() => []);
      partnerDocs[pId] = docs;
    }

    const partnersWithDocs = partners.map((p: any) => ({
      ...p,
      id_partner: Number(p.id_partner),
      documents: partnerDocs[Number(p.id_partner)] ?? [],
    }));

    // 10. FAI avec tous les champs
    const fais = await db.$queryRaw<any[]>`
      SELECT
        f.id_fai, f.fai_code, f.fai_name, f.address, f.allocated_mbps, f.bandwidth_mbps,
        f.international_exit, f.link_type, f.priority, f.connectivity_type,
        f.contact_email, f.contact_phone, f.status
      FROM noc_fai f
      JOIN noc_client_fai cf ON cf.fai_id = f.id_fai
      WHERE cf.client_id = ${clientId}
      ORDER BY f.fai_name ASC
    `.catch(() => []);

    return NextResponse.json({
      success: true,
      profile: serialize({
        client: clientRows[0],
        contacts,
        liaisons,
        documents,
        equipements,
        poteaux,
        interventions,
        workingHours,
        holidays,
        history,
        partners: partnersWithDocs,
        fais,
      }),
    });
  } catch (error) {
    console.error('[NOC] GET /api/noc/client-profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
        detail: error instanceof Error ? error.message : String(error ?? ''),
      },
      { status: 500 }
    );
  }
}

// ─── POST /api/noc/client-profile ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { actorId, actorName, client, poteaux, equipements, responsables, liaisons, interventions, documents, partners, fais } = body;

  if (!client?.clientName?.trim()) {
    return NextResponse.json({ success: false, error: 'Nom client obligatoire' }, { status: 400 });
  }

  try {
    // Upsert client
    let clientId: number;
    let clientRef: string;

    if (client.idClient) {
      // UPDATE
      try {
        await db.$executeRaw`
          UPDATE noc_clients SET
            client_name    = ${client.clientName},
            logo_url       = ${client.logoUrl ?? null},
            contact_phone  = ${client.contactPhone ?? null},
            contact_email  = ${client.contactEmail ?? null},
            address        = ${client.address ?? null},
            country        = ${client.country ?? null},
            locality       = ${client.locality ?? null},
            client_type    = ${client.clientType ?? null},
            ip_client      = ${client.ipClient ?? null},
            hostid_zabbix  = ${client.hostidZabbix ?? null},
            librenms_device_id = ${client.librenmsDeviceId ?? null},
            librenms_sysname   = ${client.libreNmsSysname ?? null},
            sla_target_percent = ${client.slaTargetPercent ?? 99.90},
            service_type   = ${client.serviceType ?? 'INTERNET'},
            bandwidth_mbps = ${client.bandwidthMbps ?? null},
            notes          = ${client.notes ?? null},
            satisfaction_score   = ${client.satisfactionScore ?? null},
            satisfaction_comment = ${client.satisfactionComment ?? null},
            status         = ${client.status ?? 'ACTIVE'},
            updated_at     = NOW()
          WHERE id_client = ${client.idClient}
        `;
      } catch (error) {
        if (!isUnknownColumnError(error)) {
          throw error;
        }
        try {
          await db.$executeRaw`
            UPDATE noc_clients SET
              client_name    = ${client.clientName},
              logo_url       = ${client.logoUrl ?? null},
              contact_phone  = ${client.contactPhone ?? null},
              contact_email  = ${client.contactEmail ?? null},
              address        = ${client.address ?? null},
              country        = ${client.country ?? null},
              locality       = ${client.locality ?? null},
              client_type    = ${client.clientType ?? null},
              ip_client      = ${client.ipClient ?? null},
              hostid_zabbix  = ${client.hostidZabbix ?? null},
              sla_target_percent = ${client.slaTargetPercent ?? 99.90},
              service_type   = ${client.serviceType ?? 'INTERNET'},
              bandwidth_mbps = ${client.bandwidthMbps ?? null},
              notes          = ${client.notes ?? null},
              satisfaction_score   = ${client.satisfactionScore ?? null},
              satisfaction_comment = ${client.satisfactionComment ?? null},
              status         = ${client.status ?? 'ACTIVE'},
              updated_at     = NOW()
            WHERE id_client = ${client.idClient}
          `;
        } catch (legacyError) {
          if (!isUnknownColumnError(legacyError)) {
            throw legacyError;
          }
          await db.$executeRaw`
            UPDATE noc_clients SET
              client_name    = ${client.clientName},
              contact_phone  = ${client.contactPhone ?? null},
              contact_email  = ${client.contactEmail ?? null},
              address        = ${client.address ?? null},
              ip_client      = ${client.ipClient ?? null},
              hostid_zabbix  = ${client.hostidZabbix ?? null},
              sla_target_percent = ${client.slaTargetPercent ?? 99.90},
              service_type   = ${client.serviceType ?? 'INTERNET'},
              bandwidth_mbps = ${client.bandwidthMbps ?? null},
              notes          = ${client.notes ?? null},
              status         = ${client.status ?? 'ACTIVE'},
              updated_at     = NOW()
            WHERE id_client = ${client.idClient}
          `;
        }
      }
      clientId = client.idClient;

      const refRow = await db.$queryRaw<any[]>`SELECT client_ref FROM noc_clients WHERE id_client = ${clientId} LIMIT 1`;
      clientRef = refRow[0]?.client_ref ?? '';
    } else {
      // INSERT – generate ref CLISC_ddmmyyyy_NNNN
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = String(now.getFullYear());
      const dateKey = `${dd}${mm}${yyyy}`;
      const countRow = await db.$queryRaw<any[]>`
        SELECT COUNT(*) AS cnt
        FROM noc_clients
        WHERE client_ref LIKE ${`CLISC_${dateKey}_%`}
      `;
      const seq = String(Number(countRow[0]?.cnt ?? 0) + 1).padStart(4, '0');
      clientRef = `CLISC_${dateKey}_${seq}`;

      try {
        await db.$executeRaw`
          INSERT INTO noc_clients
            (client_ref, client_name, logo_url, contact_phone, contact_email, address, country,
             locality, client_type, ip_client, hostid_zabbix, librenms_device_id, librenms_sysname,
             sla_target_percent, service_type,
             bandwidth_mbps, notes, satisfaction_score, satisfaction_comment, status)
          VALUES
            (${clientRef}, ${client.clientName}, ${client.logoUrl ?? null}, ${client.contactPhone ?? null},
             ${client.contactEmail ?? null}, ${client.address ?? null}, ${client.country ?? null},
             ${client.locality ?? null}, ${client.clientType ?? null}, ${client.ipClient ?? null},
             ${client.hostidZabbix ?? null}, ${client.librenmsDeviceId ?? null}, ${client.libreNmsSysname ?? null},
             ${client.slaTargetPercent ?? 99.90}, ${client.serviceType ?? 'INTERNET'},
             ${client.bandwidthMbps ?? null}, ${client.notes ?? null}, ${client.satisfactionScore ?? null},
             ${client.satisfactionComment ?? null}, ${client.status ?? 'ACTIVE'})
        `;
      } catch (error) {
        if (!isUnknownColumnError(error)) {
          throw error;
        }
        try {
          await db.$executeRaw`
            INSERT INTO noc_clients
              (client_ref, client_name, logo_url, contact_phone, contact_email, address, country,
               locality, client_type, ip_client, hostid_zabbix,
               sla_target_percent, service_type,
               bandwidth_mbps, notes, satisfaction_score, satisfaction_comment, status)
            VALUES
              (${clientRef}, ${client.clientName}, ${client.logoUrl ?? null}, ${client.contactPhone ?? null},
               ${client.contactEmail ?? null}, ${client.address ?? null}, ${client.country ?? null},
               ${client.locality ?? null}, ${client.clientType ?? null}, ${client.ipClient ?? null},
               ${client.hostidZabbix ?? null},
               ${client.slaTargetPercent ?? 99.90}, ${client.serviceType ?? 'INTERNET'},
               ${client.bandwidthMbps ?? null}, ${client.notes ?? null}, ${client.satisfactionScore ?? null},
               ${client.satisfactionComment ?? null}, ${client.status ?? 'ACTIVE'})
          `;
        } catch (legacyError) {
          if (!isUnknownColumnError(legacyError)) {
            throw legacyError;
          }
          await db.$executeRaw`
            INSERT INTO noc_clients
              (client_ref, client_name, contact_phone, contact_email, address, ip_client, hostid_zabbix,
               sla_target_percent, service_type, bandwidth_mbps, notes, status)
            VALUES
              (${clientRef}, ${client.clientName}, ${client.contactPhone ?? null}, ${client.contactEmail ?? null},
               ${client.address ?? null}, ${client.ipClient ?? null}, ${client.hostidZabbix ?? null},
               ${client.slaTargetPercent ?? 99.90}, ${client.serviceType ?? 'INTERNET'}, ${client.bandwidthMbps ?? null},
               ${client.notes ?? null}, ${client.status ?? 'ACTIVE'})
          `;
        }
      }

      const idRow = await db.$queryRaw<any[]>`SELECT id_client FROM noc_clients WHERE client_ref = ${clientRef} LIMIT 1`;
      clientId = Number(idRow[0]?.id_client);
    }

    // ── Contacts ─────────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_contacts WHERE client_id = ${clientId}`;
    for (const r of (responsables ?? [])) {
      if (!r.fullName?.trim()) continue;
      await db.$executeRaw`
        INSERT INTO noc_client_contacts (client_id, full_name, role_label, phone, email, is_primary)
        VALUES (${clientId}, ${r.fullName}, ${r.roleLabel ?? null}, ${r.phone ?? null}, ${r.email ?? null}, ${r.isPrimary ? 1 : 0})
      `;
    }

    // ── Liaisons ─────────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_liaisons WHERE client_id = ${clientId}`;
    for (const l of (liaisons ?? [])) {
      if (!l.liaisonLabel?.trim()) continue;
      await db.$executeRaw`
        INSERT INTO noc_client_liaisons (client_id, liaison_label, from_port, to_port, bandwidth_mbps, service_type, status, notes)
        VALUES (${clientId}, ${l.liaisonLabel}, ${l.fromPort ?? null}, ${l.toPort ?? null},
                ${l.bandwidthMbps ?? null}, ${l.serviceType ?? 'LIAISON'}, ${l.status ?? 'UP'}, ${l.notes ?? null})
      `;
    }

    // ── Documents client ──────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_documents WHERE client_id = ${clientId}`;
    for (const d of (documents ?? [])) {
      if (!d.fileUrl) continue;
      await db.$executeRaw`
        INSERT INTO noc_client_documents (client_id, doc_type, file_name, file_url, mime_type)
        VALUES (${clientId}, ${d.docType ?? 'OTHER'}, ${d.fileName}, ${d.fileUrl}, ${d.mimeType ?? null})
      `;
    }

    // ── Poteaux ────────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_poteaux WHERE client_id = ${clientId}`.catch(() => null);
    for (const p of (poteaux ?? [])) {
      if (!p.poteauCode?.trim()) continue;
      await db.$executeRaw`
        INSERT INTO noc_poteaux (client_id, poteau_code, label, address, latitude, longitude, status)
        VALUES (${clientId}, ${p.poteauCode}, ${p.label ?? ''}, ${p.address ?? null},
                ${p.latitude ?? null}, ${p.longitude ?? null}, ${p.status ?? 'UP'})
        ON DUPLICATE KEY UPDATE
          label = VALUES(label), address = VALUES(address),
          latitude = VALUES(latitude), longitude = VALUES(longitude), status = VALUES(status)
      `.catch(() => null);
    }

    // ── Équipements ────────────────────────────────────────────────────────
    const incomingCodes = (equipements ?? []).map((e: any) => e.equipementCode).filter(Boolean);
    if (incomingCodes.length > 0) {
      // Remove equipment no longer in the list
      const existing = await db.$queryRaw<any[]>`SELECT equipement_code FROM noc_equipements WHERE client_id = ${clientId}`;
      for (const row of existing) {
        if (!incomingCodes.includes(row.equipement_code)) {
          await db.$executeRaw`DELETE FROM noc_equipements WHERE client_id = ${clientId} AND equipement_code = ${row.equipement_code}`;
        }
      }
    }
    for (const e of (equipements ?? [])) {
      if (!e.equipementCode?.trim()) continue;
      await db.$executeRaw`
        INSERT INTO noc_equipements
          (client_id, equipement_code, equipement_type, vendor, model, image_url, serial_number,
           ip_management, zabbix_hostid, latitude, longitude, install_date, replace_due_date,
           estimated_service_life_months, status)
        VALUES
          (${clientId}, ${e.equipementCode}, ${e.equipementType ?? 'OTHER'}, ${e.vendor ?? null},
           ${e.model ?? null}, ${e.imageUrl ?? null}, ${e.serialNumber ?? null},
           ${e.ipManagement ?? null}, ${e.zabbixHostid ?? null}, ${e.latitude ?? null},
           ${e.longitude ?? null}, ${e.installDate ?? null}, ${e.replaceDueDate ?? null},
           ${e.estimatedServiceLifeMonths ?? null}, ${e.status ?? 'UP'})
        ON DUPLICATE KEY UPDATE
          client_id = ${clientId},
          equipement_type = VALUES(equipement_type), vendor = VALUES(vendor),
          model = VALUES(model), image_url = VALUES(image_url), serial_number = VALUES(serial_number),
          ip_management = VALUES(ip_management), zabbix_hostid = VALUES(zabbix_hostid),
          latitude = VALUES(latitude), longitude = VALUES(longitude),
          install_date = VALUES(install_date), replace_due_date = VALUES(replace_due_date),
          estimated_service_life_months = VALUES(estimated_service_life_months),
          status = VALUES(status)
      `;
    }

    // ── Interventions ─────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_interventions WHERE client_id = ${clientId}`.catch(() => null);
    for (const i of (interventions ?? [])) {
      if (!i.title?.trim()) continue;
      await db.$executeRaw`
        INSERT INTO noc_client_interventions
          (client_id, title, intervention_type, status, start_at, end_at, technician_name, ticket_ref, notes)
        VALUES
          (${clientId}, ${i.title}, ${i.interventionType ?? null}, ${i.status ?? 'OPEN'},
           ${i.startAt ?? null}, ${i.endAt ?? null}, ${i.technicianName ?? null},
           ${i.ticketRef ?? null}, ${i.notes ?? null})
      `.catch(() => null);
    }

    // ── Partenaires ──────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_partner WHERE client_id = ${clientId}`;
    for (const p of (partners ?? [])) {
      if (!p.partnerName?.trim()) continue;
      const code = `PART-${p.partnerName.trim().toUpperCase().replace(/\s+/g, '-').substring(0, 30)}`;

      await db.$executeRaw`
        INSERT INTO noc_partners (partner_code, partner_name, contract_date, expiry_date, description, operation_zones, contact_email, contact_phone)
        VALUES (${code}, ${p.partnerName}, ${p.contractDate ?? null}, ${p.expiryDate ?? null},
                ${p.description ?? null}, ${p.operationZones ?? null}, ${p.contactEmail ?? null}, ${p.contactPhone ?? null})
        ON DUPLICATE KEY UPDATE
          partner_name   = VALUES(partner_name),
          contract_date  = VALUES(contract_date),
          expiry_date    = VALUES(expiry_date),
          description    = VALUES(description),
          operation_zones = VALUES(operation_zones),
          contact_email  = VALUES(contact_email),
          contact_phone  = VALUES(contact_phone),
          updated_at     = NOW()
      `;

      const pRow = await db.$queryRaw<any[]>`SELECT id_partner FROM noc_partners WHERE partner_code = ${code} LIMIT 1`;
      const partnerId = Number(pRow[0]?.id_partner);
      if (!partnerId) continue;

      await db.$executeRaw`
        INSERT IGNORE INTO noc_client_partner (client_id, partner_id) VALUES (${clientId}, ${partnerId})
      `;

      // Documents du partenaire
      if (Array.isArray(p.documents) && p.documents.length > 0) {
        await db.$executeRaw`DELETE FROM noc_partner_documents WHERE partner_id = ${partnerId}`.catch(() => null);
        for (const d of p.documents) {
          if (!d.fileUrl) continue;
          await db.$executeRaw`
            INSERT INTO noc_partner_documents (partner_id, doc_type, file_name, file_url, mime_type)
            VALUES (${partnerId}, ${d.docType ?? 'OTHER'}, ${d.fileName ?? ''}, ${d.fileUrl}, ${d.mimeType ?? null})
          `.catch(() => null);
        }
      }
    }

    // ── FAI ──────────────────────────────────────────────────────────────────
    await db.$executeRaw`DELETE FROM noc_client_fai WHERE client_id = ${clientId}`;
    for (const f of (fais ?? [])) {
      if (!f.faiName?.trim()) continue;
      const code = `FAI-${f.faiName.trim().toUpperCase().replace(/\s+/g, '-').substring(0, 30)}`;

      await db.$executeRaw`
        INSERT INTO noc_fai
          (fai_code, fai_name, address, allocated_mbps, bandwidth_mbps, international_exit,
           link_type, priority, connectivity_type, contact_email, contact_phone)
        VALUES
          (${code}, ${f.faiName}, ${f.address ?? null}, ${f.allocatedMbps ?? null},
           ${f.bandwidthMbps ?? null}, ${f.internationalExit ?? null},
           ${f.linkType ?? null}, ${f.priority ?? 'PRINCIPALE'}, ${f.connectivityType ?? 'DIRECT'},
           ${f.contactEmail ?? null}, ${f.contactPhone ?? null})
        ON DUPLICATE KEY UPDATE
          fai_name           = VALUES(fai_name),
          address            = VALUES(address),
          allocated_mbps     = VALUES(allocated_mbps),
          bandwidth_mbps     = VALUES(bandwidth_mbps),
          international_exit = VALUES(international_exit),
          link_type          = VALUES(link_type),
          priority           = VALUES(priority),
          connectivity_type  = VALUES(connectivity_type),
          contact_email      = VALUES(contact_email),
          contact_phone      = VALUES(contact_phone),
          updated_at         = NOW()
      `;

      const fRow = await db.$queryRaw<any[]>`SELECT id_fai FROM noc_fai WHERE fai_code = ${code} LIMIT 1`;
      const faiId = Number(fRow[0]?.id_fai);
      if (!faiId) continue;

      await db.$executeRaw`
        INSERT IGNORE INTO noc_client_fai (client_id, fai_id) VALUES (${clientId}, ${faiId})
      `;
    }

    // ── Liaison client ↔ Zabbix (mapping applicatif) ─────────────────────
    const zabbixSync = await syncClientZabbixLink({
      clientRef,
      clientName: client.clientName,
      hostidZabbix: client.hostidZabbix ?? null,
      ipClient: client.ipClient ?? null,
      zabbixElement: client.zabbixElement ?? null,
    });

    // ── Historique ─────────────────────────────────────────────────────────
    const action = client.idClient ? 'UPDATE' : 'CREATE';
    const label = client.idClient ? `Mise a jour client ${clientRef}` : `Creation client ${clientRef}`;
    await db.$executeRaw`
      INSERT INTO noc_client_history (client_id, actor_id, actor_name, action_type, action_label)
      VALUES (${clientId}, ${actorId ?? null}, ${actorName ?? null}, ${action}, ${label})
    `.catch(() => null);

    return NextResponse.json({
      success: true,
      clientId,
      clientRef,
      zabbixSync,
    });
  } catch (error) {
    console.error('[NOC] POST /api/noc/client-profile error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
