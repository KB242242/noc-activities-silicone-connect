import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfWeek, endOfWeek } from 'date-fns';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

// ── GET /api/tickets/technicians ──────────────────────────────
// Returns users with their weekly open ticket count

async function ensureTicketTechniciansTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_ticket_technicians (
      id VARCHAR(36) PRIMARY KEY,
      first_name VARCHAR(191) NOT NULL,
      last_name VARCHAR(191) NOT NULL,
      pseudo VARCHAR(191) NOT NULL,
      department VARCHAR(64) NOT NULL DEFAULT 'Technique',
      unit_name VARCHAR(64) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_noc_ticket_technicians_pseudo (pseudo),
      INDEX idx_noc_ticket_technicians_name (last_name, first_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

const ALLOWED_UNITS = new Set(['Datacom', 'System', 'NOC', 'Technicien de terain', 'Electricite']);

function normalizeIdentity(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getWeeklyOpenCount(displayName: string, pseudo: string) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return (db as any).ticket
    .count({
      where: {
        isDeleted: false,
        status: { in: ['OPEN', 'PENDING', 'ESCALATED'] },
        createdAt: { gte: weekStart, lte: weekEnd },
        OR: [
          { assigneeName: displayName },
          { technicien: { contains: displayName } },
          { technicien: { contains: pseudo } },
          { tags: { contains: pseudo } },
        ],
      },
    })
    .catch(() => 0);
}

export async function GET(_req: NextRequest) {
  try {
    await ensureTicketTechniciansTable();

    const users = await (db as any).user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    }).catch(() => []);

    const resultFromUsers = await Promise.all(
      users.map(async (u: any) => {
        const weeklyOpen = await getWeeklyOpenCount(u.name, u.email?.split('@')[0] ?? u.id);

        return {
          id: u.id,
          name: u.name,
          email: u.email ?? null,
          hasEmail: Boolean(String(u.email ?? '').trim()),
          pseudo: u.email?.split('@')[0],
          isActive: Boolean(u.isActive),
          department: 'Technique',
          unit: 'NOC',
          weeklyOpen,
        };
      })
    );

    const byKey = new Map<string, any>();

    for (const item of resultFromUsers) {
      const emailKey = item.email ? `email:${String(item.email).trim().toLowerCase()}` : null;
      const nameKey = `name:${String(item.name).trim().toLowerCase()}`;
      const existing = byKey.get(`id:${item.id}`) || (emailKey ? byKey.get(emailKey) : null) || byKey.get(nameKey);

      if (!existing) {
        byKey.set(`id:${item.id}`, item);
        if (emailKey) byKey.set(emailKey, item);
        byKey.set(nameKey, item);
        continue;
      }

      const merged = {
        ...existing,
        email: existing.email || item.email,
        hasEmail: Boolean(existing.hasEmail || item.hasEmail),
        weeklyOpen: Math.max(Number(existing.weeklyOpen ?? 0), Number(item.weeklyOpen ?? 0)),
      };
      byKey.set(`id:${existing.id ?? item.id}`, merged);
      if (merged.email) byKey.set(`email:${String(merged.email).trim().toLowerCase()}`, merged);
      byKey.set(`name:${String(merged.name).trim().toLowerCase()}`, merged);
    }

    const dedupByIdentity = new Map<string, any>();
    for (const item of byKey.values()) {
      const normalizedEmail = normalizeIdentity(String(item.email ?? ''));
      const normalizedName = normalizeIdentity(String(item.name ?? ''));
      const normalizedPseudo = normalizeIdentity(String(item.pseudo ?? ''));
      const identityKey = normalizedEmail
        ? `email:${normalizedEmail}`
        : normalizedName
          ? `name:${normalizedName}`
          : normalizedPseudo
            ? `pseudo:${normalizedPseudo}`
            : `id:${String(item.id ?? '').trim()}`;

      if (!identityKey) continue;
      const existing = dedupByIdentity.get(identityKey);
      if (!existing) {
        dedupByIdentity.set(identityKey, item);
        continue;
      }

      dedupByIdentity.set(identityKey, {
        ...existing,
        ...item,
        id: String(existing.id ?? item.id ?? '').trim() || String(item.id ?? existing.id ?? '').trim(),
        name: String(existing.name ?? item.name ?? '').trim() || String(item.name ?? existing.name ?? '').trim(),
        email: String(existing.email ?? '').trim() || String(item.email ?? '').trim() || null,
        hasEmail: Boolean(existing.hasEmail || item.hasEmail),
        weeklyOpen: Math.max(Number(existing.weeklyOpen ?? 0), Number(item.weeklyOpen ?? 0)),
      });
    }

    const mergedResult = Array.from(dedupByIdentity.values()).sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fr', { sensitivity: 'base' })
    );

    return NextResponse.json(mergedResult);
  } catch (err) {
    console.error('[tickets/technicians GET]', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTicketTechniciansTable();
    const body = await req.json();

    const requesterId = String(body?.requesterId ?? '').trim();
    if (!requesterId) {
      return NextResponse.json({ error: 'user_required' }, { status: 400 });
    }
    const actorAccess = await resolveTicketManagerFromActorId(db, requesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'access_denied' }, { status: 403 });
    }

    const firstName = String(body?.firstName ?? '').trim();
    const lastName = String(body?.lastName ?? '').trim();
    const pseudo = String(body?.pseudo ?? '').trim();
    const department = String(body?.department ?? 'Technique').trim() || 'Technique';
    const unit = String(body?.unit ?? '').trim();

    if (!firstName || !lastName || !pseudo || !unit) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    if (!ALLOWED_UNITS.has(unit)) {
      return NextResponse.json({ error: 'invalid_unit' }, { status: 400 });
    }

    const existing = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM noc_ticket_technicians WHERE pseudo = ${pseudo} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'pseudo_exists' }, { status: 409 });
    }

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.$executeRaw`
      INSERT INTO noc_ticket_technicians (id, first_name, last_name, pseudo, department, unit_name)
      VALUES (${id}, ${firstName}, ${lastName}, ${pseudo}, ${department}, ${unit})
    `;

    return NextResponse.json({
      id,
      firstName,
      lastName,
      pseudo,
      department,
      unit,
      name: `${lastName} ${firstName}`.trim(),
      weeklyOpen: 0,
    });
  } catch (err) {
    console.error('[tickets/technicians POST]', err);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
