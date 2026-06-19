'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart3, CalendarClock, Download, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
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
  const generatedAtLabel = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleString()
    : 'Aucune generation recente';

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
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-linear-to-br from-cyan-100/70 via-white to-blue-100/60 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-700/70 dark:from-slate-900/75 dark:via-slate-900/45 dark:to-cyan-950/45 dark:shadow-[0_14px_45px_rgba(2,8,23,0.45)] sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-cyan-300/35 blur-3xl dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-500/20" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200">
              <Sparkles className="h-3.5 w-3.5" /> Intelligence Reporting
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Reporting NOC Pro</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Generation des rapports de consommation et disponibilite avec export immediat.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/65 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Derniere generation: {generatedAtLabel}</span>
          </div>
        </div>
      </div>

      <Card className="border border-white/60 bg-white/65 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-[0_12px_40px_rgba(2,8,23,0.45)]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Actions de generation</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">Pilotez vos exports a partir des donnees Zabbix reelles.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => void onGenerate()}
            className="bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-800/20 transition-all hover:from-cyan-500 hover:to-blue-500 dark:shadow-cyan-950/50"
          >
            <FileText className="w-4 h-4 mr-2" /> Generer rapport
          </Button>
          <Button
            variant="outline"
            className="border-slate-200/70 bg-white/70 backdrop-blur-md hover:bg-white dark:border-slate-700/70 dark:bg-slate-800/55 dark:hover:bg-slate-800"
            onClick={exportPdf}
          >
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button
            variant="outline"
            className="border-slate-200/70 bg-white/70 backdrop-blur-md hover:bg-white dark:border-slate-700/70 dark:bg-slate-800/55 dark:hover:bg-slate-800"
            onClick={exportExcelCsv}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel (CSV)
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card className="border border-white/60 bg-white/65 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-[0_12px_40px_rgba(2,8,23,0.45)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Resume du rapport
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">{report.periodLabel ?? '-'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Consommation totale</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{report.totalConsumptionGb ?? 0} GB</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Disponibilite</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{report.availabilityPercent ?? 0}%</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-lg dark:border-white/10 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400">Top clients</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{(report.topClients ?? []).length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
