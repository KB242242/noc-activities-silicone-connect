import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/tickets/clients ──────────────────────────────────
// Returns clients for the ticket form dropdown

export async function GET(_req: NextRequest) {
  try {
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

    const nocClients = await db.$queryRaw<Array<{ id: bigint; name: string; serviceType: string | null }>>`
      SELECT id_client AS id,
             client_name AS name,
             service_type AS serviceType
      FROM noc_clients
      ORDER BY client_name ASC
    `.catch(() => []);

    if (nocClients.length > 0) {
      return NextResponse.json(
        nocClients.map((c) => ({
          id: String(c.id),
          name: c.name,
          serviceType: c.serviceType ?? undefined,
        }))
      );
    }

    const ticketClients = await db.$queryRaw<Array<{ name: string }>>`
      SELECT DISTINCT TRIM(reporter_name) AS name
      FROM tickets
      WHERE reporter_name IS NOT NULL AND TRIM(reporter_name) <> ''
      ORDER BY name ASC
      LIMIT 200
    `.catch(() => []);

    return NextResponse.json(
      ticketClients.map((c, idx) => ({
        id: `ticket-client-${idx + 1}`,
        name: c.name,
      }))
    );
  } catch (err) {
    console.error('[tickets/clients GET]', err);
    return NextResponse.json([]);
  }
}
