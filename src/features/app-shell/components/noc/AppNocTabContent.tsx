import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { NocCallCenterPanel } from '@/components/noc/NocCallCenterPanel';
import { NocClientsPanel } from '@/components/noc/NocClientsPanel';
import { NocGenericSectionPanel } from '@/components/noc/NocGenericSectionPanel';
import { NocMonitoringDashboard } from '@/components/noc/NocMonitoringDashboard';
import { NocMonitoringPanel } from '@/components/noc/NocMonitoringPanel';
import { NocSitesPanel } from '@/components/noc/NocSitesPanel';
import { NocShiftPowerReportPanel } from '@/components/noc/NocShiftPowerReportPanel';

import type { UserProfile } from '@/features/app-shell/core/shared/types';

type AppNocTabContentProps = {
  currentTab: string;
  title: string;
  description: string;
  nocOverviewData: any;
  nocOverviewLoading: boolean;
  refreshNocOverview: () => Promise<void>;
  handleMonitoringKpiClick: (kpiKey: 'network' | 'clients' | 'alerts' | 'sla') => void;
  monitoringScope: 'down' | 'up' | 'all';
  monitoringDrilldown: 'network' | 'clients' | 'alerts' | 'sla' | null;
  user: UserProfile | null;
  nocReportData: any;
  generateConsumptionReport: () => Promise<void>;
};

type ReportingSection = {
  id: string;
  title: string;
  subtitle: string;
  details: string[];
};

function getDefaultShiftReportType(now = new Date()): 'daily' | 'night' {
  const hour = now.getHours();
  return hour >= 18 || hour < 6 ? 'night' : 'daily';
}

const REPORTING_SECTIONS: ReportingSection[] = [
  {
    id: 'shift',
    title: 'Rapport du Shift',
    subtitle: 'Journalier et nuit',
    details: ['Rapport journalier', 'Rapport de nuit'],
  },
  {
    id: 'consumption',
    title: 'Consommation & Disponibilité',
    subtitle: 'Usage et stabilité des services',
    details: ['Suivi consommation', 'Disponibilité des services', 'Disponibilité des infrastructures'],
  },
  {
    id: 'rfo',
    title: 'RFO',
    subtitle: 'Analyse post-incident',
    details: ['Rapports de fin d’incident', 'Root Cause Analysis', 'Actions correctives'],
  },
  {
    id: 'tickets',
    title: 'Suivi Ticket',
    subtitle: 'Activité et performance opérationnelle',
    details: ['Tickets ouverts / fermés', 'Temps moyen de résolution', 'Répartition par technicien ou site'],
  },
  {
    id: 'performance',
    title: 'Performance',
    subtitle: 'KPI du NOC',
    details: ['Indicateurs clés', 'Taux de disponibilité global', 'Comparaison hebdo, mensuel, trimestriel'],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure & Capacité',
    subtitle: 'Santé et charge des ressources',
    details: ['Disponibilité serveurs et liens', 'Charge CPU, mémoire, stockage', 'Bande passante'],
  },
  {
    id: 'security',
    title: 'Sécurité & SLA',
    subtitle: 'Conformité et incidents',
    details: ['Incidents sécurité', 'Respect des SLA', 'Indicateurs de conformité'],
  },
  {
    id: 'alerts',
    title: 'Alertes & Historique',
    subtitle: 'Traçabilité et escalades',
    details: ['Statistiques sur alertes', 'Temps de réaction', 'Audit des interventions opérateurs'],
  },
];

export function AppNocTabContent({
  currentTab,
  title,
  description,
  nocOverviewData,
  nocOverviewLoading,
  refreshNocOverview,
  handleMonitoringKpiClick,
  monitoringScope,
  monitoringDrilldown,
  user,
  nocReportData,
  generateConsumptionReport,
}: AppNocTabContentProps) {
  const shiftReportTypeStorageKey = useMemo(
    () => `noc_reporting_shift_report_type_${user?.id ?? 'anonymous'}`,
    [user?.id]
  );
  const [selectedReportingSection, setSelectedReportingSection] = useState(REPORTING_SECTIONS[0].id);
  const selectedReportingContent = REPORTING_SECTIONS.find((section) => section.id === selectedReportingSection) ?? REPORTING_SECTIONS[0];
  const [shiftReportType, setShiftReportType] = useState<'daily' | 'night'>(() => getDefaultShiftReportType());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(shiftReportTypeStorageKey);
    if (stored === 'daily' || stored === 'night') {
      setShiftReportType(stored);
      return;
    }
    setShiftReportType(getDefaultShiftReportType());
  }, [shiftReportTypeStorageKey]);

  const handleShiftReportTypeChange = (value: 'daily' | 'night') => {
    setShiftReportType(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(shiftReportTypeStorageKey, value);
    }
  };

  return (
    <motion.div key={currentTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      {currentTab !== 'noc_reporting' && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
      )}

      {currentTab === 'noc_monitoring' && (
        <div className="space-y-4">
          <NocMonitoringPanel data={nocOverviewData} loading={nocOverviewLoading} onRefresh={refreshNocOverview} onKpiClick={handleMonitoringKpiClick} />
          <NocMonitoringDashboard initialScope={monitoringScope} drilldownKey={monitoringDrilldown} />
        </div>
      )}

      {currentTab === 'noc_clients' && (
        <NocClientsPanel connectedUserRole={user?.role ?? null} connectedUserId={user?.id ?? null} connectedUserName={user?.name ?? null} />
      )}

      {currentTab === 'noc_reporting' && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/75 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/45 dark:shadow-[0_16px_50px_rgba(2,8,23,0.45)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-100/40 via-transparent to-blue-100/30 dark:from-cyan-500/10 dark:via-transparent dark:to-blue-500/10" />
            <div className="relative space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">Reporting</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Reporting</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Base de travail du module Reporting. Nous allons développer chaque onglet progressivement, avec une structure simple, claire et facile à compléter.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {REPORTING_SECTIONS.map((section) => {
                  const isActive = selectedReportingSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedReportingSection(section.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                          : 'border-slate-200/80 bg-white/70 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-950/35'
                      }`}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/45 dark:shadow-[0_12px_40px_rgba(2,8,23,0.42)]">
            {selectedReportingSection === 'shift' ? (
              <div className="space-y-5">
                <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Rapport du Shift</p>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Type de rapport</h2>
                <Select value={shiftReportType} onValueChange={handleShiftReportTypeChange}>
                  <SelectTrigger className="w-full max-w-sm border-slate-200/80 bg-white/80 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <SelectValue placeholder="Sélectionner un rapport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Rapport journalier</SelectItem>
                    <SelectItem value="night">Rapport de nuit</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <NocShiftPowerReportPanel
                  reportType={shiftReportType}
                  connectedUserRole={user?.role ?? null}
                  connectedUserId={user?.id ?? null}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Onglet sélectionné</p>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{selectedReportingContent.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedReportingContent.subtitle}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'noc_callcenter' && <NocCallCenterPanel />}

      {currentTab === 'noc_equipement' && (
        <NocGenericSectionPanel
          sectionKey="equipement"
          title="Equipements"
          subtitle="Inventaire des ONT/ONU/OLT/switch/routeur lies aux clients."
        />
      )}

      {currentTab === 'noc_sites' && <NocSitesPanel />}

      {currentTab === 'noc_partenaire' && (
        <NocGenericSectionPanel
          sectionKey="partenaire"
          title="Partenaires"
          subtitle="Dependencies operateurs tiers et supervision interconnexions."
        />
      )}

      {currentTab === 'noc_fai' && (
        <NocGenericSectionPanel
          sectionKey="fai"
          title="FAI"
          subtitle="Suivi transit, peering, latence et pertes par fournisseur."
        />
      )}
    </motion.div>
  );
}
