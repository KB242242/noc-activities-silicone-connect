'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type ReportData = {
  periodLabel?: string;
  generatedAt?: string;
  totalConsumptionGb?: number;
  availabilityPercent?: number;
  topClients?: Array<{ clientRef: string; consumptionGb: number }>;
};

type Props = {
  report: ReportData | null;
  onGenerate: () => Promise<void>;
};

export function NocReportingPanel({ report, onGenerate }: Props) {
  const exportPdf = () => {
    if (!report) {
      toast.error('Generer un rapport avant export PDF.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Rapport NOC', 14, 16);
    doc.setFontSize(11);
    doc.text(`Periode: ${report.periodLabel ?? '-'}`, 14, 24);
    doc.text(`Generation: ${report.generatedAt ? new Date(report.generatedAt).toLocaleString() : '-'}`, 14, 31);
    doc.text(`Consommation totale (GB): ${report.totalConsumptionGb ?? 0}`, 14, 38);
    doc.text(`Disponibilite (%): ${report.availabilityPercent ?? 0}`, 14, 45);

    autoTable(doc, {
      startY: 54,
      head: [['Client', 'Consommation (GB)']],
      body: (report.topClients ?? []).map((row) => [row.clientRef, row.consumptionGb.toString()]),
    });

    doc.save(`rapport-noc-${Date.now()}.pdf`);
  };

  const exportExcelCsv = () => {
    if (!report) {
      toast.error('Generer un rapport avant export Excel.');
      return;
    }

    const rows = [
      ['Periode', report.periodLabel ?? '-'],
      ['Generation', report.generatedAt ?? '-'],
      ['Consommation totale GB', String(report.totalConsumptionGb ?? 0)],
      ['Disponibilite %', String(report.availabilityPercent ?? 0)],
      [],
      ['Client', 'Consommation GB'],
      ...(report.topClients ?? []).map((row) => [row.clientRef, String(row.consumptionGb)]),
    ];

    const csvContent = rows.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rapport-noc-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reporting NOC</CardTitle>
          <CardDescription>Generation des rapports a partir des donnees Zabbix reelles.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => void onGenerate()}>
            <FileText className="w-4 h-4 mr-2" /> Generer rapport
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" onClick={exportExcelCsv}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel (CSV)
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Resume du rapport</CardTitle>
            <CardDescription>{report.periodLabel ?? '-'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Consommation totale</p>
              <p className="font-semibold">{report.totalConsumptionGb ?? 0} GB</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Disponibilite</p>
              <p className="font-semibold">{report.availabilityPercent ?? 0}%</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Top clients</p>
              <p className="font-semibold">{(report.topClients ?? []).length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
