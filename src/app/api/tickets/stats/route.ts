import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/tickets/stats ─────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const [all, open, pending, escalated, closed] = await Promise.all([
      (db as any).ticket.count({ where: { isDeleted: false } }),
      (db as any).ticket.count({ where: { isDeleted: false, status: 'OPEN' } }),
      (db as any).ticket.count({ where: { isDeleted: false, status: 'PENDING' } }),
      (db as any).ticket.count({ where: { isDeleted: false, status: 'ESCALATED' } }),
      (db as any).ticket.count({ where: { isDeleted: false, status: 'CLOSED' } }),
    ]);

    // All non-deleted tickets for detailed stats
    const tickets = await (db as any).ticket.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        tags: true,
        status: true,
        category: true,
        createdAt: true,
        closedAt: true,
        reporterName: true,
        assigneeName: true,
        localite: true,
      },
    });

    // By type (stored in tags.type)
    const byType: Record<string, number> = {};
    const byTechMap: Record<string, { count: number; open: number }> = {};
    const byLocalityMap: Record<string, number> = {};
    const byMonth: Record<string, { count: number; closed: number }> = {};
    let totalResolutionHours = 0;
    let resolvedCount = 0;

    // Recurrence: site appearing > 3 times in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recurrenceMap: Record<string, number> = {};

    for (const t of tickets) {
      let tags: Record<string, unknown> = {};
      try { tags = JSON.parse(t.tags ?? '{}'); } catch { /* noop */ }

      const ticketType = (tags.type as string) ?? t.category ?? 'OTHER';
      byType[ticketType] = (byType[ticketType] ?? 0) + 1;

      // Technicians
      const techIds = (tags.technicianIds as string[]) ?? [];
      if (techIds.length === 0 && t.assigneeName) techIds.push(t.assigneeName);
      for (const techId of techIds) {
        if (!byTechMap[techId]) byTechMap[techId] = { count: 0, open: 0 };
        byTechMap[techId].count++;
        if (t.status === 'OPEN' || t.status === 'PENDING') byTechMap[techId].open++;
      }

      // Localities
      const locs = (tags.localities as string[]) ?? (t.localite ? [t.localite] : []);
      for (const loc of locs) {
        byLocalityMap[loc] = (byLocalityMap[loc] ?? 0) + 1;
      }

      // Month
      const monthKey = new Date(t.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, closed: 0 };
      byMonth[monthKey].count++;
      if (t.status === 'CLOSED') byMonth[monthKey].closed++;

      // Avg resolution
      if (t.status === 'CLOSED' && t.closedAt) {
        const hours = (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
        totalResolutionHours += hours;
        resolvedCount++;
      }

      // Recurrence
      if (new Date(t.createdAt) >= thirtyDaysAgo) {
        for (const loc of locs) {
          recurrenceMap[loc] = (recurrenceMap[loc] ?? 0) + 1;
        }
      }
    }

    // Sort and convert
    const byTechnician = Object.entries(byTechMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);

    const byLocality = Object.entries(byLocalityMap)
      .map(([locality, count]) => ({ locality, count }))
      .sort((a, b) => b.count - a.count);

    const recurrentSites = Object.entries(recurrenceMap)
      .filter(([, count]) => count > 3)
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count);

    // Last 6 months
    const monthKeys = Object.keys(byMonth).slice(-12);
    const byMonthArr = monthKeys.map((m) => ({ month: m, ...byMonth[m] }));

    return NextResponse.json({
      total: all,
      open,
      pending,
      escalated,
      closed,
      byType,
      byMonth: byMonthArr,
      byTechnician,
      byLocality,
      avgResolutionHours: resolvedCount > 0 ? totalResolutionHours / resolvedCount : 0,
      recurrentSites,
    });
  } catch (err) {
    console.error('[tickets/stats GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
