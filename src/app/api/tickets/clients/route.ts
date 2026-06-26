import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

// ── GET /api/tickets/clients ──────────────────────────────────
// Returns clients for the ticket form dropdown

async function ensureTicketClientsTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_ticket_clients (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(191) NULL,
      phone VARCHAR(64) NULL,
      address TEXT NULL,
      city VARCHAR(191) NULL,
      district VARCHAR(191) NULL,
      account_number VARCHAR(128) NULL,
      client_type VARCHAR(64) NULL,
      service_type VARCHAR(64) NULL,
      contract_start_date DATETIME NULL,
      consumption_date DATETIME NULL,
      principal_responsable VARCHAR(191) NULL,
      contact_persons_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_noc_ticket_clients_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Keep a single deterministic test fixture for client-email behavior.
  await db.$executeRawUnsafe(`
    DELETE FROM noc_ticket_clients
    WHERE id IN ('test-client-mail-ok', 'test-client-mail-no')
       OR name IN ('test_client_mail_ok', 'test_client_mail_no')
  `);

  await db.$executeRawUnsafe(`
    INSERT INTO noc_ticket_clients (
      id,
      name,
      email,
      phone,
      address,
      city,
      district,
      account_number,
      client_type,
      service_type,
      principal_responsable
    ) VALUES (
      'saris-congo-test',
      'SARIS_CONGO',
      'kevinebauer7@gmail.com',
      '+242066000001',
      'Zone industrielle SARIS',
      'Nkayi',
      'Bouenza',
      'SARIS-TEST-001',
      'Entreprise',
      'Fibre',
      'Responsable IT SARIS'
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      phone = VALUES(phone),
      address = VALUES(address),
      city = VALUES(city),
      district = VALUES(district),
      account_number = VALUES(account_number),
      client_type = VALUES(client_type),
      service_type = VALUES(service_type),
      principal_responsable = VALUES(principal_responsable)
  `);
}

function normalizeContactPersons(value: unknown): Array<{ name: string; email?: string; phone?: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      const name = String(row?.name ?? '').trim();
      const email = String(row?.email ?? '').trim();
      const phone = String(row?.phone ?? '').trim();
      if (!name) return null;
      return {
        name,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      };
    })
    .filter((entry): entry is { name: string; email?: string; phone?: string } => Boolean(entry));
}

export async function GET(_req: NextRequest) {
  try {
    await ensureTicketClientsTable();

    const ticketClients = await db.$queryRaw<Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      district: string | null;
      accountNumber: string | null;
      clientType: string | null;
      serviceType: string | null;
      contractStartDate: Date | null;
      consumptionDate: Date | null;
      principalResponsable: string | null;
      contactPersonsJson: string | null;
    }>>`
      SELECT id,
             name,
             email,
             phone,
             address,
             city,
             district,
             account_number AS accountNumber,
             client_type AS clientType,
             service_type AS serviceType,
             contract_start_date AS contractStartDate,
             consumption_date AS consumptionDate,
             principal_responsable AS principalResponsable,
             contact_persons_json AS contactPersonsJson
      FROM noc_ticket_clients
      ORDER BY name ASC
    `;

    const ticketClientItems = ticketClients.map((client) => {
      let contacts: Array<{ name: string; email?: string; phone?: string }> = [];
      try {
        contacts = normalizeContactPersons(JSON.parse(client.contactPersonsJson ?? '[]'));
      } catch {
        contacts = [];
      }
      return {
        id: client.id,
        name: client.name,
        email: client.email ?? undefined,
        hasEmail: Boolean(String(client.email ?? '').trim()),
        phone: client.phone ?? undefined,
        address: client.address ?? undefined,
        city: client.city ?? undefined,
        district: client.district ?? undefined,
        accountNumber: client.accountNumber ?? undefined,
        clientType: client.clientType ?? undefined,
        serviceType: client.serviceType ?? undefined,
        contractStartDate: client.contractStartDate?.toISOString() ?? null,
        consumptionDate: client.consumptionDate?.toISOString() ?? null,
        principalResponsable: client.principalResponsable ?? undefined,
        contactPersons: contacts,
      };
    });

    // Try to find a Client model in prisma; fallback to empty
    const client = (db as any).client ?? (db as any).clientSC ?? null;
    if (client) {
      const clients = await client.findMany({
        select: { id: true, name: true, serviceType: true },
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }).catch(() => []);

      if (clients.length > 0) {
        return NextResponse.json(clients);
      }
    }

    const nocClients = await db.$queryRaw<Array<{ id: bigint; name: string; serviceType: string | null; email: string | null }>>`
      SELECT id_client AS id,
             client_name AS name,
             service_type AS serviceType,
             contact_email AS email
      FROM noc_clients
      ORDER BY client_name ASC
    `.catch(() => []);

    const nocClientItems = nocClients.map((c) => ({
      id: String(c.id),
      name: c.name,
      serviceType: c.serviceType ?? undefined,
      email: c.email ?? undefined,
      hasEmail: Boolean(String(c.email ?? '').trim()),
    }));

    const mergedByName = new Map<string, any>();
    for (const item of [...ticketClientItems, ...nocClientItems]) {
      const key = String(item?.name ?? '').trim().toLowerCase();
      if (!key) continue;
      const existing = mergedByName.get(key);
      if (!existing) {
        mergedByName.set(key, item);
        continue;
      }
      mergedByName.set(key, {
        ...existing,
        ...item,
        email: existing.email || item.email,
        hasEmail: Boolean(existing.hasEmail || item.hasEmail),
      });
    }

    if (mergedByName.size > 0) {
      return NextResponse.json(
        Array.from(mergedByName.values()).sort((a, b) =>
          String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fr', { sensitivity: 'base' })
        )
      );
    }

    const reporterNames = await db.$queryRaw<Array<{ name: string }>>`
      SELECT DISTINCT TRIM(reporter_name) AS name
      FROM tickets
      WHERE reporter_name IS NOT NULL AND TRIM(reporter_name) <> ''
      ORDER BY name ASC
      LIMIT 200
    `.catch(() => []);

    return NextResponse.json(
      reporterNames.map((c, idx) => ({
        id: `ticket-client-${idx + 1}`,
        name: c.name,
      }))
    );
  } catch (err) {
    console.error('[tickets/clients GET]', err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTicketClientsTable();
    const body = await req.json();

    const requesterId = String(body?.requesterId ?? '').trim();
    if (!requesterId) {
      return NextResponse.json({ error: 'user_required' }, { status: 400 });
    }
    const actorAccess = await resolveTicketManagerFromActorId(db, requesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'access_denied' }, { status: 403 });
    }

    const name = String(body?.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const contactPersons = normalizeContactPersons(body?.contactPersons);

    const toDateOrNull = (value: unknown) => {
      if (!value) return null;
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const payload = {
      id,
      name,
      email: String(body?.email ?? '').trim() || null,
      phone: String(body?.phone ?? '').trim() || null,
      address: String(body?.address ?? '').trim() || null,
      city: String(body?.city ?? '').trim() || null,
      district: String(body?.district ?? '').trim() || null,
      accountNumber: String(body?.accountNumber ?? '').trim() || null,
      clientType: String(body?.clientType ?? '').trim() || null,
      serviceType: String(body?.serviceType ?? '').trim() || null,
      contractStartDate: toDateOrNull(body?.contractStartDate),
      consumptionDate: toDateOrNull(body?.consumptionDate),
      principalResponsable: String(body?.principalResponsable ?? '').trim() || null,
      contactPersonsJson: JSON.stringify(contactPersons),
    };

    await db.$executeRaw`
      INSERT INTO noc_ticket_clients (
        id,
        name,
        email,
        phone,
        address,
        city,
        district,
        account_number,
        client_type,
        service_type,
        contract_start_date,
        consumption_date,
        principal_responsable,
        contact_persons_json
      ) VALUES (
        ${payload.id},
        ${payload.name},
        ${payload.email},
        ${payload.phone},
        ${payload.address},
        ${payload.city},
        ${payload.district},
        ${payload.accountNumber},
        ${payload.clientType},
        ${payload.serviceType},
        ${payload.contractStartDate},
        ${payload.consumptionDate},
        ${payload.principalResponsable},
        ${payload.contactPersonsJson}
      )
    `;

    return NextResponse.json({
      id: payload.id,
      name: payload.name,
      email: payload.email ?? undefined,
      phone: payload.phone ?? undefined,
      address: payload.address ?? undefined,
      city: payload.city ?? undefined,
      district: payload.district ?? undefined,
      accountNumber: payload.accountNumber ?? undefined,
      clientType: payload.clientType ?? undefined,
      serviceType: payload.serviceType ?? undefined,
      contractStartDate: payload.contractStartDate?.toISOString() ?? null,
      consumptionDate: payload.consumptionDate?.toISOString() ?? null,
      principalResponsable: payload.principalResponsable ?? undefined,
      contactPersons,
    });
  } catch (err) {
    console.error('[tickets/clients POST]', err);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
