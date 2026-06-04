import { motion } from 'framer-motion';

import { NocCallCenterPanel } from '@/components/noc/NocCallCenterPanel';
import { NocClientsPanel } from '@/components/noc/NocClientsPanel';
import { NocGenericSectionPanel } from '@/components/noc/NocGenericSectionPanel';
import { NocMonitoringDashboard } from '@/components/noc/NocMonitoringDashboard';
import { NocMonitoringPanel } from '@/components/noc/NocMonitoringPanel';
import { NocReportingPanel } from '@/components/noc/NocReportingPanel';
import { NocSitesPanel } from '@/components/noc/NocSitesPanel';

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
  return (
    <motion.div key={currentTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

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
        <div className="space-y-4">
          <NocReportingPanel report={nocReportData} onGenerate={generateConsumptionReport} />
          <NocGenericSectionPanel
            sectionKey="reporting"
            title="Registre Reporting"
            subtitle="Creation et suivi des demandes de rapport et analyses post-generation."
          />
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
