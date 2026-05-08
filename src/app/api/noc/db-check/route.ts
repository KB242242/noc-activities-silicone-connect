import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type CountRow = { cnt: bigint };
type DuplicateRow = { value: string; cnt: bigint };
type OrphanRow = { id: bigint; ref: string };

interface CheckResult {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  count: number;
  details?: string[];
}

async function checkForeignKey(params: {
  name: string;
  childTable: string;
  childCol: string;
  parentTable: string;
  parentCol: string;
}): Promise<CheckResult> {
  const { name, childTable, childCol, parentTable, parentCol } = params;

  // Use raw string template — table/column names come from our own constants, never from user input
  const rows = await db.$queryRawUnsafe<OrphanRow[]>(
    `SELECT c.${childCol} AS id, c.${childCol} AS ref
     FROM \`${childTable}\` c
     LEFT JOIN \`${parentTable}\` p ON p.${parentCol} = c.${childCol}
     WHERE c.${childCol} IS NOT NULL AND p.${parentCol} IS NULL
     LIMIT 50`
  );

  if (rows.length === 0) {
    return { name, status: 'OK', count: 0 };
  }

  return {
    name,
    status: 'ERROR',
    count: rows.length,
    details: rows.map((r) => String(r.ref)),
  };
}

async function checkDuplicates(params: {
  name: string;
  table: string;
  col: string;
}): Promise<CheckResult> {
  const { name, table, col } = params;

  const rows = await db.$queryRawUnsafe<DuplicateRow[]>(
    `SELECT \`${col}\` AS value, COUNT(*) AS cnt
     FROM \`${table}\`
     GROUP BY \`${col}\`
     HAVING COUNT(*) > 1
     LIMIT 50`
  );

  if (rows.length === 0) {
    return { name, status: 'OK', count: 0 };
  }

  return {
    name,
    status: 'ERROR',
    count: rows.length,
    details: rows.map((r) => `"${r.value}" (${Number(r.cnt)}x)`),
  };
}

async function checkTableExists(table: string): Promise<boolean> {
  const rows = await db.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS cnt
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${table}
  `;
  return Number(rows[0]?.cnt ?? 0) > 0;
}

export async function GET() {
  const results: CheckResult[] = [];
  const missingTables: string[] = [];

  const requiredTables = [
    'mapping_zabbix',
    'noc_clients',
    'noc_equipements',
    'noc_cables',
    'noc_client_liaisons',
    'noc_client_documents',
    'noc_client_interventions',
    'noc_client_history',
  ];

  // ── Step 1: verify all tables exist ──────────────────────────────────────
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (!exists) {
      missingTables.push(table);
      results.push({
        name: `Table manquante: ${table}`,
        status: 'ERROR',
        count: 1,
        details: [`Executer database/noc_intelligence_schema.sql pour creer la table "${table}"`],
      });
    }
  }

  // If core tables are missing, return early — other checks will fail
  const criticalMissing = ['noc_clients', 'noc_equipements', 'noc_cables'].some((t) =>
    missingTables.includes(t)
  );

  if (criticalMissing) {
    return NextResponse.json({
      success: false,
      checkedAt: new Date().toISOString(),
      summary: { ok: 0, warning: 0, error: results.length },
      results,
    });
  }

  // ── Step 2: FK integrity checks ───────────────────────────────────────────
  const fkChecks = [
    {
      name: 'noc_equipements.client_id → noc_clients.id_client',
      childTable: 'noc_equipements',
      childCol: 'client_id',
      parentTable: 'noc_clients',
      parentCol: 'id_client',
    },

    {
      name: 'noc_cables.from_equipement_id → noc_equipements.id_equipement',
      childTable: 'noc_cables',
      childCol: 'from_equipement_id',
      parentTable: 'noc_equipements',
      parentCol: 'id_equipement',
    },
    {
      name: 'noc_cables.to_equipement_id → noc_equipements.id_equipement',
      childTable: 'noc_cables',
      childCol: 'to_equipement_id',
      parentTable: 'noc_equipements',
      parentCol: 'id_equipement',
    },

  ];

  for (const check of fkChecks) {
    try {
      const result = await checkForeignKey(check);
      results.push(result);
    } catch {
      results.push({ name: check.name, status: 'WARNING', count: 0, details: ['Verification ignoree (table ou colonne absente)'] });
    }
  }

  // ── Step 3: duplicate / uniqueness checks ─────────────────────────────────
  const uniqueChecks = [
    { name: 'Doublons client_ref dans noc_clients', table: 'noc_clients', col: 'client_ref' },
    { name: 'Doublons equipement_code dans noc_equipements', table: 'noc_equipements', col: 'equipement_code' },
    {
      name: 'Doublons cable_code dans noc_cables',
      table: 'noc_cables',
      col: 'cable_code',
    },
  ];

  for (const check of uniqueChecks) {
    try {
      const result = await checkDuplicates(check);
      results.push(result);
    } catch {
      results.push({ name: check.name, status: 'WARNING', count: 0, details: ['Colonne absente ou table vide'] });
    }
  }

  // ── Step 4: cable self-loop check (from_id = to_id) ──────────────────────
  try {
    const selfLoops = await db.$queryRaw<OrphanRow[]>`
      SELECT id_cable AS id, cable_code AS ref
      FROM noc_cables
      WHERE from_equipement_id = to_equipement_id
      LIMIT 50
    `;

    results.push({
      name: 'Cables en boucle (source = destination)',
      status: selfLoops.length === 0 ? 'OK' : 'ERROR',
      count: selfLoops.length,
      details: selfLoops.length > 0 ? selfLoops.map((r) => String(r.ref)) : undefined,
    });
  } catch {
    results.push({ name: 'Cables en boucle', status: 'WARNING', count: 0, details: ['Table noc_cables absente'] });
  }

  // ── Step 5: noc_equipements orphans (no client, no chambre, no pbo) ──────
  try {
    const fullyOrphan = await db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS cnt
      FROM noc_equipements
      WHERE client_id IS NULL AND chambre_id IS NULL AND pbo_id IS NULL
    `;
    const orphanCount = Number(fullyOrphan[0]?.cnt ?? 0);
    results.push({
      name: 'Equipements sans client/chambre/PBO',
      status: orphanCount === 0 ? 'OK' : 'WARNING',
      count: orphanCount,
      details: orphanCount > 0 ? [`${orphanCount} equipement(s) completement orphelins`] : undefined,
    });
  } catch {
    results.push({ name: 'Equipements orphelins', status: 'WARNING', count: 0, details: ['Verification ignoree'] });
  }

  // ── Step 6: mapping_zabbix hostid not found in Zabbix-linked noc_clients ──
  try {
    const mappingExists = await checkTableExists('mapping_zabbix');
    if (mappingExists) {
      const invalidHostid = await db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS cnt
        FROM mapping_zabbix
        WHERE hostid_zabbix IS NULL OR TRIM(hostid_zabbix) = ''
      `;
      const cnt = Number(invalidHostid[0]?.cnt ?? 0);
      results.push({
        name: 'mapping_zabbix avec hostid_zabbix vide',
        status: cnt === 0 ? 'OK' : 'WARNING',
        count: cnt,
        details: cnt > 0 ? [`${cnt} ligne(s) sans hostid Zabbix`] : undefined,
      });
    }
  } catch {
    results.push({ name: 'mapping_zabbix hostid vide', status: 'WARNING', count: 0, details: ['Verification ignoree'] });
  }

  // ── Step 7: liaison ports coherence (from_port/to_port both provided or both empty) ──
  try {
    const partialPorts = await db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS cnt
      FROM noc_client_liaisons
      WHERE (COALESCE(TRIM(from_port), '') = '' AND COALESCE(TRIM(to_port), '') <> '')
         OR (COALESCE(TRIM(from_port), '') <> '' AND COALESCE(TRIM(to_port), '') = '')
    `;
    const cnt = Number(partialPorts[0]?.cnt ?? 0);
    results.push({
      name: 'Liaisons avec un seul port renseigne',
      status: cnt === 0 ? 'OK' : 'WARNING',
      count: cnt,
      details: cnt > 0 ? [`${cnt} liaison(s) a completer (port source/destination)`] : undefined,
    });
  } catch {
    results.push({ name: 'Coherence ports liaisons', status: 'WARNING', count: 0, details: ['Verification ignoree'] });
  }

  // ── Step 8: interventions without ticket reference (informational) ─────────
  try {
    const noTicketRef = await db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS cnt
      FROM noc_client_interventions
      WHERE COALESCE(TRIM(ticket_ref), '') = ''
    `;
    const cnt = Number(noTicketRef[0]?.cnt ?? 0);
    results.push({
      name: 'Interventions sans ticket associe',
      status: cnt === 0 ? 'OK' : 'WARNING',
      count: cnt,
      details: cnt > 0 ? [`${cnt} intervention(s) sans ticket_ref`] : undefined,
    });
  } catch {
    results.push({ name: 'Interventions sans ticket', status: 'WARNING', count: 0, details: ['Verification ignoree'] });
  }

  const summary = {
    ok: results.filter((r) => r.status === 'OK').length,
    warning: results.filter((r) => r.status === 'WARNING').length,
    error: results.filter((r) => r.status === 'ERROR').length,
  };

  return NextResponse.json({
    success: summary.error === 0,
    checkedAt: new Date().toISOString(),
    summary,
    results,
  });
}
