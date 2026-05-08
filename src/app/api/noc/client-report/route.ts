import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type ReportFormat = 'csv' | 'xlsx' | 'docx' | 'pptx' | 'pdf';

type ClientRow = {
  id_client: number;
  client_ref: string;
  client_name: string;
  client_type: string | null;
  country: string | null;
  locality: string | null;
  status: string;
  service_type: string;
  bandwidth_mbps: string | null;
  sla_target_percent: string;
  satisfaction_score: string | null;
};

type KpiRow = {
  availability_percent: string | null;
  avg_latency_ms: string | null;
  avg_packet_loss_percent: string | null;
  equipements_count: bigint | null;
};

type LiaisonRow = {
  liaison_label: string;
  from_port: string | null;
  to_port: string | null;
  service_type: string;
  bandwidth_mbps: string | null;
  status: string;
};

type EquipRow = {
  equipement_code: string;
  equipement_type: string;
  vendor: string | null;
  model: string | null;
  status: string;
};

type InterventionRow = {
  title: string;
  intervention_type: string | null;
  status: string;
  technician_name: string | null;
  start_at: Date | null;
  end_at: Date | null;
};

function isSchemaCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /unknown column|champ\s+.*inconnu|doesn't exist|n'existe pas|no such table|unknown table/i.test(message);
}

function asFormat(input: string | null): ReportFormat {
  if (input === 'xlsx' || input === 'docx' || input === 'pptx' || input === 'pdf') return input;
  return 'csv';
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes(';') || text.includes('\n') || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function buildCsvBuffer(params: {
  client: ClientRow;
  kpi: KpiRow | null;
  liaisons: LiaisonRow[];
  equipements: EquipRow[];
  interventions: InterventionRow[];
}) {
  const { client, kpi, liaisons, equipements, interventions } = params;
  const rows: string[][] = [];

  rows.push(['Client', client.client_name]);
  rows.push(['Reference', client.client_ref]);
  rows.push(['Type', client.client_type ?? '-']);
  rows.push(['Pays', client.country ?? '-']);
  rows.push(['Localite', client.locality ?? '-']);
  rows.push(['Service', client.service_type]);
  rows.push(['Statut', client.status]);
  rows.push(['SLA cible %', client.sla_target_percent]);
  rows.push(['Disponibilite %', kpi?.availability_percent ?? '-']);
  rows.push(['Latence moyenne ms', kpi?.avg_latency_ms ?? '-']);
  rows.push(['Packet loss %', kpi?.avg_packet_loss_percent ?? '-']);
  rows.push([]);

  rows.push(['Liaisons']);
  rows.push(['Label', 'Port source', 'Port destination', 'Service', 'BP Mbps', 'Statut']);
  for (const row of liaisons) {
    rows.push([
      row.liaison_label,
      row.from_port ?? '-',
      row.to_port ?? '-',
      row.service_type,
      row.bandwidth_mbps ?? '-',
      row.status,
    ]);
  }

  rows.push([]);
  rows.push(['Equipements']);
  rows.push(['Code', 'Type', 'Fabricant', 'Modele', 'Statut']);
  for (const row of equipements) {
    rows.push([row.equipement_code, row.equipement_type, row.vendor ?? '-', row.model ?? '-', row.status]);
  }

  rows.push([]);
  rows.push(['Interventions']);
  rows.push(['Titre', 'Type', 'Statut', 'Technicien', 'Debut', 'Fin']);
  for (const row of interventions) {
    rows.push([
      row.title,
      row.intervention_type ?? '-',
      row.status,
      row.technician_name ?? '-',
      row.start_at ? new Date(row.start_at).toLocaleString() : '-',
      row.end_at ? new Date(row.end_at).toLocaleString() : '-',
    ]);
  }

  const content = rows.map((line) => line.map(csvEscape).join(';')).join('\n');
  return Buffer.from(content, 'utf-8');
}

function buildXlsxBuffer(params: {
  client: ClientRow;
  kpi: KpiRow | null;
  liaisons: LiaisonRow[];
  equipements: EquipRow[];
  interventions: InterventionRow[];
}) {
  const { client, kpi, liaisons, equipements, interventions } = params;
  const workbook = XLSX.utils.book_new();

  const summary = [
    { cle: 'Client', valeur: client.client_name },
    { cle: 'Reference', valeur: client.client_ref },
    { cle: 'Type', valeur: client.client_type ?? '-' },
    { cle: 'Pays', valeur: client.country ?? '-' },
    { cle: 'Localite', valeur: client.locality ?? '-' },
    { cle: 'Service', valeur: client.service_type },
    { cle: 'Statut', valeur: client.status },
    { cle: 'SLA cible %', valeur: client.sla_target_percent },
    { cle: 'Disponibilite %', valeur: kpi?.availability_percent ?? '-' },
    { cle: 'Latence moyenne ms', valeur: kpi?.avg_latency_ms ?? '-' },
    { cle: 'Packet loss %', valeur: kpi?.avg_packet_loss_percent ?? '-' },
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Resume');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(liaisons), 'Liaisons');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(equipements), 'Equipements');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(interventions), 'Interventions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function buildDocxBuffer(params: {
  client: ClientRow;
  kpi: KpiRow | null;
  liaisons: LiaisonRow[];
  equipements: EquipRow[];
  interventions: InterventionRow[];
}) {
  const { client, kpi, liaisons, equipements, interventions } = params;

  const makeHeader = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 28 })],
      spacing: { before: 320, after: 120 },
    });

  const tableFromRows = (headers: string[], rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: headers.map((header) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            })
          ),
        }),
        ...rows.map((row) =>
          new TableRow({
            children: row.map((cell) => new TableCell({ children: [new Paragraph(String(cell))] })),
          })
        ),
      ],
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Rapport Client ${client.client_ref}`, bold: true, size: 34 })],
            spacing: { after: 220 },
          }),
          tableFromRows(
            ['Champ', 'Valeur'],
            [
              ['Client', client.client_name],
              ['Reference', client.client_ref],
              ['Type', client.client_type ?? '-'],
              ['Pays', client.country ?? '-'],
              ['Localite', client.locality ?? '-'],
              ['Service', client.service_type],
              ['Statut', client.status],
              ['SLA cible %', client.sla_target_percent],
              ['Disponibilite %', kpi?.availability_percent ?? '-'],
              ['Latence moyenne ms', kpi?.avg_latency_ms ?? '-'],
              ['Packet loss %', kpi?.avg_packet_loss_percent ?? '-'],
            ]
          ),
          makeHeader('Liaisons'),
          tableFromRows(
            ['Label', 'Port source', 'Port destination', 'Service', 'BP Mbps', 'Statut'],
            liaisons.map((row) => [
              row.liaison_label,
              row.from_port ?? '-',
              row.to_port ?? '-',
              row.service_type,
              row.bandwidth_mbps ?? '-',
              row.status,
            ])
          ),
          makeHeader('Equipements'),
          tableFromRows(
            ['Code', 'Type', 'Fabricant', 'Modele', 'Statut'],
            equipements.map((row) => [row.equipement_code, row.equipement_type, row.vendor ?? '-', row.model ?? '-', row.status])
          ),
          makeHeader('Interventions'),
          tableFromRows(
            ['Titre', 'Type', 'Statut', 'Technicien', 'Debut', 'Fin'],
            interventions.map((row) => [
              row.title,
              row.intervention_type ?? '-',
              row.status,
              row.technician_name ?? '-',
              row.start_at ? new Date(row.start_at).toLocaleString() : '-',
              row.end_at ? new Date(row.end_at).toLocaleString() : '-',
            ])
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

async function buildPptxBuffer(params: {
  client: ClientRow;
  kpi: KpiRow | null;
  liaisons: LiaisonRow[];
  equipements: EquipRow[];
  interventions: InterventionRow[];
}) {
  const { client, kpi, liaisons, equipements, interventions } = params;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'NOC Activities';
  pptx.subject = `Rapport client ${client.client_ref}`;
  pptx.title = `Rapport client ${client.client_ref}`;

  const slide1 = pptx.addSlide();
  slide1.addText(`Rapport Client - ${client.client_name}`, { x: 0.5, y: 0.3, w: 12, h: 0.5, bold: true, fontSize: 24 });
  slide1.addText(
    [
      `Reference: ${client.client_ref}`,
      `Type: ${client.client_type ?? '-'}`,
      `Pays: ${client.country ?? '-'}`,
      `Localite: ${client.locality ?? '-'}`,
      `Service: ${client.service_type}`,
      `SLA cible: ${client.sla_target_percent}%`,
      `Disponibilite: ${kpi?.availability_percent ?? '-'}%`,
      `Latence moyenne: ${kpi?.avg_latency_ms ?? '-'} ms`,
      `Packet loss: ${kpi?.avg_packet_loss_percent ?? '-'}%`,
    ].join('\n'),
    { x: 0.6, y: 1.0, w: 8.2, h: 3.8, fontSize: 14 }
  );

  const slide2 = pptx.addSlide();
  slide2.addText('Liaisons', { x: 0.5, y: 0.3, w: 6, h: 0.5, bold: true, fontSize: 22 });
  slide2.addTable(
    [
      [{ text: 'Label' }, { text: 'Port source' }, { text: 'Port destination' }, { text: 'Service' }, { text: 'BP Mbps' }, { text: 'Statut' }],
      ...liaisons.slice(0, 18).map((row) => [
        { text: row.liaison_label },
        { text: row.from_port ?? '-' },
        { text: row.to_port ?? '-' },
        { text: row.service_type },
        { text: row.bandwidth_mbps ?? '-' },
        { text: row.status },
      ]),
    ],
    { x: 0.4, y: 0.9, w: 12.4, h: 5.8, fontSize: 10 }
  );

  const slide3 = pptx.addSlide();
  slide3.addText('Equipements & Interventions', { x: 0.5, y: 0.3, w: 8, h: 0.5, bold: true, fontSize: 22 });
  slide3.addTable(
    [
      [{ text: 'Code' }, { text: 'Type' }, { text: 'Fabricant' }, { text: 'Statut' }],
      ...equipements.slice(0, 12).map((row) => [
        { text: row.equipement_code },
        { text: row.equipement_type },
        { text: row.vendor ?? '-' },
        { text: row.status },
      ]),
    ],
    { x: 0.4, y: 0.9, w: 6.2, h: 5.7, fontSize: 10 }
  );
  slide3.addTable(
    [
      [{ text: 'Intervention' }, { text: 'Statut' }, { text: 'Technicien' }],
      ...interventions.slice(0, 12).map((row) => [
        { text: row.title },
        { text: row.status },
        { text: row.technician_name ?? '-' },
      ]),
    ],
    { x: 6.8, y: 0.9, w: 6.0, h: 5.7, fontSize: 10 }
  );

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}

function buildPdfBuffer(params: {
  client: ClientRow;
  kpi: KpiRow | null;
  liaisons: LiaisonRow[];
  equipements: EquipRow[];
  interventions: InterventionRow[];
  periodLabel?: string;
}) {
  const { client, kpi, liaisons, equipements, interventions, periodLabel } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logoPath = path.join(process.cwd(), 'public', 'logo_sc.png');
  if (existsSync(logoPath)) {
    try {
      const logoBase64 = readFileSync(logoPath).toString('base64');
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', (pageWidth - 36) / 2, 8, 36, 16);
    } catch {
      // Keep PDF generation available even if logo parsing fails.
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text("Rapport d'historique d'action", pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Client : ${client.client_name}`, pageWidth / 2, 38, { align: 'center' });

  const interventionDates = interventions
    .flatMap((item) => [item.start_at, item.end_at])
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));
  const autoPeriodText =
    interventionDates.length > 0
      ? `du ${new Date(Math.min(...interventionDates.map((d) => d.getTime()))).toLocaleDateString()} au ${new Date(Math.max(...interventionDates.map((d) => d.getTime()))).toLocaleDateString()}`
      : new Date().toLocaleDateString();
  const periodText = periodLabel || autoPeriodText;

  doc.setTextColor(15, 23, 42);
  autoTable(doc, {
    startY: 46,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.2 },
    body: [
      ['Client', client.client_name],
      ['Reference', client.client_ref],
      ['Type', client.client_type ?? '-'],
      ['Pays', client.country ?? '-'],
      ['Localite', client.locality ?? '-'],
      ['Service', client.service_type],
      ['Statut', client.status],
      ['SLA cible %', client.sla_target_percent],
      ['Disponibilite %', kpi?.availability_percent ?? '-'],
      ['Latence moyenne ms', kpi?.avg_latency_ms ?? '-'],
      ['Packet loss %', kpi?.avg_packet_loss_percent ?? '-'],
    ],
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 8) : 92,
    head: [['Liaison', 'Port source', 'Port destination', 'Service', 'BP Mbps', 'Statut']],
    body: liaisons.length
      ? liaisons.map((row) => [row.liaison_label, row.from_port ?? '-', row.to_port ?? '-', row.service_type, row.bandwidth_mbps ?? '-', row.status])
      : [['-', '-', '-', '-', '-', 'Aucune liaison']],
    headStyles: { fillColor: [14, 116, 144], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2 },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 8) : 150,
    head: [['Code', 'Type', 'Fabricant', 'Modele', 'Statut']],
    body: equipements.length
      ? equipements.map((row) => [row.equipement_code, row.equipement_type, row.vendor ?? '-', row.model ?? '-', row.status])
      : [['-', '-', '-', '-', 'Aucun equipement']],
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2 },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 8) : 208,
    head: [['Titre', 'Type', 'Statut', 'Technicien', 'Debut', 'Fin']],
    body: interventions.length
      ? interventions.map((row) => [
          row.title,
          row.intervention_type ?? '-',
          row.status,
          row.technician_name ?? '-',
          row.start_at ? new Date(row.start_at).toLocaleString() : '-',
          row.end_at ? new Date(row.end_at).toLocaleString() : '-',
        ])
      : [['-', '-', '-', '-', '-', 'Aucune intervention']],
    headStyles: { fillColor: [2, 132, 199], textColor: 255 },
    styles: { fontSize: 8.2, cellPadding: 2 },
  });

  doc.setDrawColor(203, 213, 225);
  doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date/Periode: ${periodText}`, 14, pageHeight - 10);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientRef = (searchParams.get('clientRef') ?? '').trim();
    const format = asFormat(searchParams.get('format'));
    const actorId = (searchParams.get('actorId') ?? '').trim() || null;
    const actorName = (searchParams.get('actorName') ?? '').trim() || null;
    const dateFromInput = (searchParams.get('dateFrom') ?? '').trim();
    const dateToInput = (searchParams.get('dateTo') ?? '').trim();

    const dateFrom = dateFromInput ? new Date(`${dateFromInput}T00:00:00`) : null;
    const dateTo = dateToInput ? new Date(`${dateToInput}T23:59:59`) : null;

    if ((dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()))) {
      return NextResponse.json({ success: false, error: 'Periode invalide: date incorrecte.' }, { status: 400 });
    }
    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      return NextResponse.json({ success: false, error: 'Periode invalide: date de debut apres la date de fin.' }, { status: 400 });
    }

    const periodLabel =
      dateFrom && dateTo
        ? `du ${dateFrom.toLocaleDateString()} au ${dateTo.toLocaleDateString()}`
        : dateFrom
          ? `a partir du ${dateFrom.toLocaleDateString()}`
          : dateTo
            ? `jusqu'au ${dateTo.toLocaleDateString()}`
            : undefined;

    if (!clientRef) {
      return NextResponse.json({ success: false, error: 'clientRef est obligatoire.' }, { status: 400 });
    }

    let clients: ClientRow[] = [];
    try {
      clients = await db.$queryRaw<ClientRow[]>`
        SELECT id_client, client_ref, client_name, client_type, country, locality, status, service_type, bandwidth_mbps, sla_target_percent, satisfaction_score
        FROM noc_clients
        WHERE client_ref = ${clientRef}
        LIMIT 1
      `;
    } catch (error) {
      if (!isSchemaCompatibilityError(error)) {
        throw error;
      }
      clients = await db.$queryRaw<ClientRow[]>`
        SELECT
          id_client,
          client_ref,
          client_name,
          NULL AS client_type,
          NULL AS country,
          NULL AS locality,
          status,
          service_type,
          bandwidth_mbps,
          sla_target_percent,
          NULL AS satisfaction_score
        FROM noc_clients
        WHERE client_ref = ${clientRef}
        LIMIT 1
      `;
    }

    if (clients.length === 0) {
      return NextResponse.json({ success: false, error: 'Client introuvable.' }, { status: 404 });
    }

    const client = clients[0];

    const interventionsPromise = dateFrom && dateTo
      ? db.$queryRaw<InterventionRow[]>`
          SELECT title, intervention_type, status, technician_name, start_at, end_at
          FROM noc_client_interventions
          WHERE client_id = ${client.id_client}
            AND COALESCE(start_at, end_at, created_at) BETWEEN ${dateFrom} AND ${dateTo}
          ORDER BY created_at DESC
        `.catch(() => [])
      : dateFrom
        ? db.$queryRaw<InterventionRow[]>`
            SELECT title, intervention_type, status, technician_name, start_at, end_at
            FROM noc_client_interventions
            WHERE client_id = ${client.id_client}
              AND COALESCE(start_at, end_at, created_at) >= ${dateFrom}
            ORDER BY created_at DESC
          `.catch(() => [])
        : dateTo
          ? db.$queryRaw<InterventionRow[]>`
              SELECT title, intervention_type, status, technician_name, start_at, end_at
              FROM noc_client_interventions
              WHERE client_id = ${client.id_client}
                AND COALESCE(start_at, end_at, created_at) <= ${dateTo}
              ORDER BY created_at DESC
            `.catch(() => [])
          : db.$queryRaw<InterventionRow[]>`
              SELECT title, intervention_type, status, technician_name, start_at, end_at
              FROM noc_client_interventions
              WHERE client_id = ${client.id_client}
              ORDER BY created_at DESC
            `.catch(() => []);

    const [kpiRows, liaisons, equipements, interventions] = await Promise.all([
      db.$queryRaw<KpiRow[]>`
        SELECT availability_percent, avg_latency_ms, avg_packet_loss_percent, equipements_count
        FROM noc_client_kpi
        WHERE id_client = ${client.id_client}
        LIMIT 1
      `.catch(() => []),
      db.$queryRaw<LiaisonRow[]>`
        SELECT liaison_label, from_port, to_port, service_type, bandwidth_mbps, status
        FROM noc_client_liaisons
        WHERE client_id = ${client.id_client}
        ORDER BY liaison_label ASC
      `.catch(() => []),
      db.$queryRaw<EquipRow[]>`
        SELECT equipement_code, equipement_type, vendor, model, status
        FROM noc_equipements
        WHERE client_id = ${client.id_client}
        ORDER BY equipement_code ASC
      `.catch(() => []),
      interventionsPromise,
    ]);

    const kpi = kpiRows[0] ?? null;

    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'xlsx') {
      buffer = buildXlsxBuffer({ client, kpi, liaisons, equipements, interventions });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else if (format === 'pdf') {
      buffer = buildPdfBuffer({ client, kpi, liaisons, equipements, interventions, periodLabel });
      mimeType = 'application/pdf';
      extension = 'pdf';
    } else if (format === 'docx') {
      buffer = await buildDocxBuffer({ client, kpi, liaisons, equipements, interventions });
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extension = 'docx';
    } else if (format === 'pptx') {
      buffer = await buildPptxBuffer({ client, kpi, liaisons, equipements, interventions });
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      extension = 'pptx';
    } else {
      buffer = buildCsvBuffer({ client, kpi, liaisons, equipements, interventions });
      mimeType = 'text/csv; charset=utf-8';
      extension = 'csv';
    }

    try {
      await db.$executeRaw`
        INSERT INTO noc_client_history (client_id, actor_id, actor_name, action_type, action_label, details_json)
        VALUES (
          ${client.id_client},
          ${actorId},
          ${actorName},
          'REPORT_EXPORT',
          ${`Export rapport ${format.toUpperCase()}`},
          ${JSON.stringify({ format, clientRef: client.client_ref })}
        )
      `;
    } catch {
      // Keep export route available even if history table is absent.
    }

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="rapport-${client.client_ref}-${Date.now()}.${extension}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('NOC client report export error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de generer le rapport client.' },
      { status: 500 }
    );
  }
}
