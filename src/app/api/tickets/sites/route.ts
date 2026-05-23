import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type SiteOption = {
  id: string;
  name: string;
  locality?: string;
  departement?: string;
  reference?: string;
};

export async function GET() {
  try {
    const rows = await db.$queryRaw<Array<{ id: bigint; name: string; localite: string | null; departement: string | null; site_ref: string | null }>>`
      SELECT id,
             site_name AS name,
             localite,
             departement,
             site_ref
      FROM noc_sites
      ORDER BY site_name ASC
    `.catch(() => []);

    if (rows.length > 0) {
      const data: SiteOption[] = rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        locality: row.localite ?? undefined,
        departement: row.departement ?? undefined,
        reference: row.site_ref ?? undefined,
      }));
      return NextResponse.json(data);
    }

    const ticketRows = await db.$queryRaw<Array<{ site: string | null; localite: string | null }>>`
      SELECT site, localite
      FROM tickets
      WHERE (site IS NOT NULL AND TRIM(site) <> '')
         OR (localite IS NOT NULL AND TRIM(localite) <> '')
      ORDER BY site ASC
      LIMIT 500
    `.catch(() => []);

    const seen = new Set<string>();
    const fallback: SiteOption[] = [];
    ticketRows.forEach((row) => {
      const name = (row.site ?? '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      fallback.push({
        id: `ticket-site-${fallback.length + 1}`,
        name,
        locality: row.localite?.trim() || undefined,
      });
    });

    return NextResponse.json(fallback);
  } catch (error) {
    console.error('[tickets/sites GET]', error);
    return NextResponse.json([]);
  }
}
