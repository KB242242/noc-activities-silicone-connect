import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfWeek, endOfWeek } from 'date-fns';

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

    const customTechs = await db.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      pseudo: string;
      department: string;
      unitName: string;
      isActive: number;
    }>>`
      SELECT id,
             first_name AS firstName,
             last_name AS lastName,
             pseudo,
             department,
             unit_name AS unitName,
             is_active AS isActive
      FROM noc_ticket_technicians
      WHERE is_active = 1
      ORDER BY last_name ASC, first_name ASC
    `;

    if (customTechs.length > 0) {
      const normalized = await Promise.all(
        customTechs.map(async (tech) => {
          const name = `${tech.lastName} ${tech.firstName}`.trim();
          const weeklyOpen = await getWeeklyOpenCount(name, tech.pseudo);
          return {
            id: tech.id,
            name,
            firstName: tech.firstName,
            lastName: tech.lastName,
            pseudo: tech.pseudo,
            department: tech.department,
            unit: tech.unitName,
            weeklyOpen,
          };
        })
      );

      return NextResponse.json(normalized);
    }

    let users = await (db as any).user.findMany({
      where: {
        isActive: true,
        role: { in: ['TECHNICIEN', 'TECHNICIEN_NO'] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }).catch(() => []);

    if (users.length === 0) {
      users = await (db as any).user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      });
    }

    const result = await Promise.all(
      users.map(async (u: any) => {
        const weeklyOpen = await getWeeklyOpenCount(u.name, u.email?.split('@')[0] ?? u.id);

        return {
          id: u.id,
          name: u.name,
          pseudo: u.email?.split('@')[0],
          department: 'Technique',
          unit: 'NOC',
          weeklyOpen,
        };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[tickets/technicians GET]', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTicketTechniciansTable();
    const body = await req.json();

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
