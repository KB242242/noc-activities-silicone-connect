import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadNocClientSettings } from '@/lib/noc/clientSettings';

type ListRow = {
  id_client: number;
  client_ref: string;
  client_name: string;
  client_type: string | null;
  country: string | null;
  locality: string | null;
  logo_url: string | null;
  address: string | null;
  ip_client: string | null;
  service_type: 'INTERNET' | 'INTERCO' | 'INTERNET_INTERCO' | 'LIAISON';
  bandwidth_mbps: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  archived_at: Date | null;
  satisfaction_score: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  responsable_name: string | null;
  interventions_count: bigint;
  tickets_count: bigint;
  updated_at: Date;
  equipements_count: bigint;
  liaisons_count: bigint;
  equipment_status: string | null;
};

type FallbackRow = {
  id_client: number;
  client_ref: string;
  client_name: string;
  address: string | null;
  service_type: 'INTERNET' | 'INTERCO' | 'INTERNET_INTERCO' | 'LIAISON';
  bandwidth_mbps: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  contact_email: string | null;
  contact_phone: string | null;
  updated_at: Date;
  equipements_count: bigint;
  liaisons_count: bigint;
};

async function canDeleteClient(
  actorId: string | null,
  actorRoleHint: string | null | undefined,
  allowedDeleteRoles: string[]
): Promise<boolean> {
  const normalizeRole = (value: string | null | undefined) =>
    String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[-\s]+/g, '_');

  const isAllowedDeleteRole = (value: string | null | undefined) => {
    const role = normalizeRole(value);
    return allowedDeleteRoles.includes(role);
  };

  const hintedRole = normalizeRole(actorRoleHint);
  if (isAllowedDeleteRole(hintedRole)) {
    return true;
  }

  if (!actorId) return false;
  const actor = await db.user.findUnique({ where: { id: actorId } });
  return Boolean(actor && isAllowedDeleteRole(actor.role));
}

async function getActorName(actorId: string | null): Promise<string | null> {
  if (!actorId) return null;
  const actor = await db.user.findUnique({ where: { id: actorId } });
  if (!actor) return null;
  return actor.name ?? actor.username ?? actor.email ?? null;
}

async function appendHistory(params: {
  clientId: number;
  actorId?: string | null;
  actorName?: string | null;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'UNARCHIVE' | 'PORT_CHANGE' | 'REPORT_EXPORT';
  actionLabel: string;
  details?: unknown;
}) {
  try {
    await db.$executeRaw`
      INSERT INTO noc_client_history (client_id, actor_id, actor_name, action_type, action_label, details_json)
      VALUES (
        ${params.clientId},
        ${params.actorId ?? null},
        ${params.actorName ?? null},
        ${params.actionType},
        ${params.actionLabel},
        ${params.details ? JSON.stringify(params.details) : null}
      )
    `;
  } catch {
    // Keep API operational if history table is not deployed yet.
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await loadNocClientSettings();
    if (!settings.api.enableRead) {
      return NextResponse.json(
        { success: false, error: 'API clients desactivee par l\'administration.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const includeArchived = searchParams.get('includeArchived') === '1';

    try {
      const rows = await db.$queryRaw<ListRow[]>`
        SELECT
          c.id_client,
          c.client_ref,
          c.client_name,
          c.client_type,
          c.country,
          c.locality,
          c.logo_url,
          c.address,
          c.ip_client,
          c.service_type,
          c.bandwidth_mbps,
          c.status,
          c.archived_at,
          c.satisfaction_score,
          c.contact_email,
          c.contact_phone,
          c.updated_at,
          (
            SELECT cc.full_name
            FROM noc_client_contacts cc
            WHERE cc.client_id = c.id_client
            ORDER BY cc.is_primary DESC, cc.id_contact ASC
            LIMIT 1
          ) AS responsable_name,
          (
            SELECT COUNT(*)
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
          ) AS equipements_count,
          (
            SELECT COUNT(*)
            FROM noc_client_liaisons l
            WHERE l.client_id = c.id_client
          ) AS liaisons_count,
          (
            SELECT COUNT(*)
            FROM noc_client_interventions i
            WHERE i.client_id = c.id_client
          ) AS interventions_count,
          (
            SELECT COUNT(*)
            FROM tickets t
            WHERE t.is_deleted = 0
              AND (
                COALESCE(t.site, '') = c.client_ref
                OR COALESCE(t.site, '') = c.client_name
                OR (c.locality IS NOT NULL AND COALESCE(t.localite, '') = c.locality)
              )
          ) AS tickets_count,
          (
            SELECT COALESCE(MIN(e.status), 'UP')
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
          ) AS equipment_status
        FROM noc_clients c
        WHERE (
          ${q} = ''
          OR c.client_ref LIKE ${`%${q}%`}
          OR c.client_name LIKE ${`%${q}%`}
          OR COALESCE(c.contact_phone, '') LIKE ${`%${q}%`}
          OR COALESCE(c.locality, '') LIKE ${`%${q}%`}
          OR COALESCE(c.country, '') LIKE ${`%${q}%`}
          OR COALESCE(c.client_type, '') LIKE ${`%${q}%`}
        )
        AND (${includeArchived ? 1 : 0} = 1 OR c.archived_at IS NULL)
        ORDER BY c.updated_at DESC
        LIMIT 300
      `;

      return NextResponse.json({
        success: true,
        clients: rows.map((row) => ({
          id_client: Number(row.id_client),
          client_ref: row.client_ref,
          client_name: row.client_name,
          client_type: row.client_type,
          country: row.country,
          locality: row.locality,
          logo_url: row.logo_url,
          address: row.address,
          ip_client: row.ip_client,
          service_type: row.service_type,
          bandwidth_mbps: row.bandwidth_mbps,
          status: row.status,
          archived_at: row.archived_at,
          satisfaction_score: row.satisfaction_score,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          responsable_name: row.responsable_name,
          updated_at: row.updated_at,
          equipementsCount: Number(row.equipements_count ?? 0),
          liaisonsCount: Number(row.liaisons_count ?? 0),
          interventionsCount: Number(row.interventions_count ?? 0),
          ticketsCount: Number(row.tickets_count ?? 0),
          equipmentStatus: row.equipment_status,
        })),
      });
    } catch {
      const rows = await db.$queryRaw<FallbackRow[]>`
        SELECT
          c.id_client,
          c.client_ref,
          c.client_name,
          c.address,
          c.service_type,
          c.bandwidth_mbps,
          c.status,
          c.contact_email,
          c.contact_phone,
          c.updated_at,
          (
            SELECT COUNT(*)
            FROM noc_equipements e
            WHERE e.client_id = c.id_client
          ) AS equipements_count,
          (
            SELECT COUNT(*)
            FROM noc_client_liaisons l
            WHERE l.client_id = c.id_client
          ) AS liaisons_count
        FROM noc_clients c
        WHERE (
          ${q} = ''
          OR c.client_ref LIKE ${`%${q}%`}
          OR c.client_name LIKE ${`%${q}%`}
          OR COALESCE(c.contact_phone, '') LIKE ${`%${q}%`}
        )
        ORDER BY c.updated_at DESC
        LIMIT 300
      `;

      return NextResponse.json({
        success: true,
        clients: rows.map((row) => ({
          id_client: Number(row.id_client),
          client_ref: row.client_ref,
          client_name: row.client_name,
          client_type: row.service_type,
          country: null,
          locality: null,
          logo_url: null,
          address: row.address,
          service_type: row.service_type,
          bandwidth_mbps: row.bandwidth_mbps,
          status: row.status,
          archived_at: null,
          satisfaction_score: null,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          responsable_name: null,
          updated_at: row.updated_at,
          equipementsCount: Number(row.equipements_count ?? 0),
          liaisonsCount: Number(row.liaisons_count ?? 0),
          interventionsCount: 0,
          ticketsCount: 0,
        })),
      });
    }
  } catch (error) {
    console.error('NOC clients GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de charger la liste clients NOC.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const settings = await loadNocClientSettings();
    if (!settings.api.enableWrite) {
      return NextResponse.json(
        { success: false, error: 'Modifications clients desactivees par l\'administration.' },
        { status: 403 }
      );
    }
    if (!settings.permissions.allowDelete) {
      return NextResponse.json(
        { success: false, error: 'Suppression clients desactivee par l\'administration.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { clientId?: number; actorId?: string | null; actorRole?: string | null };

    if (!body.clientId) {
      return NextResponse.json({ success: false, error: 'clientId est obligatoire.' }, { status: 400 });
    }

    const normalizedDeleteRoles = settings.permissions.deleteRoles.map((role) =>
      String(role ?? '')
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, '_')
    );
    const authorized = await canDeleteClient(body.actorId ?? null, body.actorRole ?? null, normalizedDeleteRoles);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Suppression interdite. Action reservee aux roles ADMIN, SUPER_ADMIN et SUPERVISEUR.' },
        { status: 403 }
      );
    }

    const actorName = await getActorName(body.actorId ?? null);

    const refRow = await db.$queryRaw<Array<{ client_ref: string }>>`
      SELECT client_ref FROM noc_clients WHERE id_client = ${body.clientId} LIMIT 1
    `;
    const clientRef = refRow[0]?.client_ref ?? null;

    await db.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`
          INSERT INTO noc_client_history (client_id, actor_id, actor_name, action_type, action_label)
          VALUES (${body.clientId}, ${body.actorId ?? null}, ${actorName}, 'DELETE', 'Suppression client')
        `;
      } catch {
        // Ignore history write errors to keep deletion flow available.
      }

      await tx.$executeRaw`DELETE FROM noc_client_contacts WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_liaisons WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_documents WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_partner WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_fai WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_interventions WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_poteaux WHERE client_id = ${body.clientId}`.catch(() => null);
      await tx.$executeRaw`DELETE FROM noc_client_history WHERE client_id = ${body.clientId}`.catch(() => null);
      if (clientRef) {
        await tx.$executeRaw`DELETE FROM mapping_zabbix WHERE id_client = ${clientRef}`.catch(() => null);
      }

      try {
        await tx.$executeRaw`
          UPDATE noc_equipements
          SET client_id = NULL
          WHERE client_id = ${body.clientId}
        `;
      } catch {
        // Some deployments define client_id as NOT NULL; fallback to hard delete.
        await tx.$executeRaw`DELETE FROM noc_equipements WHERE client_id = ${body.clientId}`.catch(() => null);
      }

      try {
        await tx.$executeRaw`DELETE FROM noc_clients WHERE id_client = ${body.clientId}`;
      } catch {
        // Final fallback: archive instead of hard delete if FK constraints still exist.
        await tx.$executeRaw`
          UPDATE noc_clients
          SET archived_at = CURRENT_TIMESTAMP, status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
          WHERE id_client = ${body.clientId}
        `;
      }
    });

    return NextResponse.json({ success: true, message: 'Client supprime avec succes.' });
  } catch (error) {
    console.error('NOC clients DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Echec suppression client.',
        detail: error instanceof Error ? error.message : String(error ?? ''),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const settings = await loadNocClientSettings();
    if (!settings.api.enableWrite) {
      return NextResponse.json(
        { success: false, error: 'Modifications clients desactivees par l\'administration.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      clientId?: number;
      actorId?: string | null;
      action?: 'archive' | 'unarchive';
    };

    if (!body.clientId || !body.action) {
      return NextResponse.json(
        { success: false, error: 'clientId et action sont obligatoires.' },
        { status: 400 }
      );
    }

    const actorName = await getActorName(body.actorId ?? null);
    const action = body.action;

    if (!settings.permissions.allowArchive) {
      return NextResponse.json(
        { success: false, error: 'Archivage clients desactive par l\'administration.' },
        { status: 403 }
      );
    }

    if (action === 'archive') {
      await db.$executeRaw`
        UPDATE noc_clients
        SET archived_at = CURRENT_TIMESTAMP, status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE id_client = ${body.clientId}
      `;

      await appendHistory({
        clientId: body.clientId,
        actorId: body.actorId ?? null,
        actorName,
        actionType: 'ARCHIVE',
        actionLabel: 'Archivage client',
      });

      return NextResponse.json({ success: true, message: 'Client archive.' });
    }

    await db.$executeRaw`
      UPDATE noc_clients
      SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id_client = ${body.clientId}
    `;

    await appendHistory({
      clientId: body.clientId,
      actorId: body.actorId ?? null,
      actorName,
      actionType: 'UNARCHIVE',
      actionLabel: 'Desarchivage client',
    });

    return NextResponse.json({ success: true, message: 'Client desarchive.' });
  } catch (error) {
    console.error('NOC clients PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Echec action d\'archivage.' },
      { status: 500 }
    );
  }
}
