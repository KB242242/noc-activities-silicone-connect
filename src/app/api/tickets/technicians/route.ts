import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfWeek, endOfWeek } from 'date-fns';

// ── GET /api/tickets/technicians ──────────────────────────────
// Returns users with their weekly open ticket count

export async function GET(_req: NextRequest) {
  try {
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

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const result = await Promise.all(
      users.map(async (u: any) => {
        const weeklyOpen = await (db as any).ticket.count({
          where: {
            isDeleted: false,
            status: { in: ['OPEN', 'PENDING', 'ESCALATED'] },
            createdAt: { gte: weekStart, lte: weekEnd },
            OR: [
              { assigneeId: u.id },
              { assigneeName: u.name },
              { technicien: { contains: u.name } },
              { tags: { contains: u.id } },
            ],
          },
        }).catch(() => 0);

        return {
          id: u.id,
          name: u.name,
          pseudo: u.email?.split('@')[0],
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
