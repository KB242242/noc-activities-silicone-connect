'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type OverviewData = {
  generatedAt?: string;
  networkHealth?: { upPercent?: number; upHosts?: number; downHosts?: number };
  clients?: { activeClients?: number; downClients?: number; saturatedClients?: number };
  alerts?: { critical?: number; warning?: number; info?: number };
  sla?: { monthlyPercent?: number; downtimeMinutes?: number };
  recentEvents?: Array<{ eventid?: string; title?: string; severity?: string; timestamp?: number }>;
  sources?: {
    zabbix?: { configured?: boolean; error?: string | null };
    librenms?: { configured?: boolean; error?: string | null };
  };
};

type Props = {
  data: OverviewData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onKpiClick?: (kpiKey: 'network' | 'clients' | 'alerts' | 'sla') => void;
};

export function NocMonitoringPanel({ data, loading, onRefresh, onKpiClick }: Props) {
  const zabbixOk = Boolean(data?.sources?.zabbix?.configured) && !data?.sources?.zabbix?.error;
  const libreNmsOk = Boolean(data?.sources?.librenms?.configured) && !data?.sources?.librenms?.error;

  const kpis = useMemo(
    () => [
      { key: 'network' as const, label: 'Etat reseau', value: `${data?.networkHealth?.upPercent ?? 0}%`, helper: `${data?.networkHealth?.upHosts ?? 0} UP / ${data?.networkHealth?.downHosts ?? 0} DOWN` },
      { key: 'clients' as const, label: 'Clients impactes', value: `${data?.clients?.downClients ?? 0}`, helper: `${data?.clients?.activeClients ?? 0} actifs` },
      { key: 'alerts' as const, label: 'Alertes critiques', value: `${data?.alerts?.critical ?? 0}`, helper: `${data?.alerts?.warning ?? 0} warning` },
      { key: 'sla' as const, label: 'SLA mensuel', value: `${data?.sla?.monthlyPercent ?? 0}%`, helper: `${data?.sla?.downtimeMinutes ?? 0} min interruption` },
    ],
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${zabbixOk ? 'bg-emerald-700/20 text-emerald-400' : 'bg-red-700/20 text-red-400'}`}>
            Zabbix {zabbixOk ? 'UP' : 'DOWN'}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${libreNmsOk ? 'bg-cyan-700/20 text-cyan-400' : 'bg-red-700/20 text-red-400'}`}>
            LibreNMS {libreNmsOk ? 'UP' : 'DOWN'}
          </span>
        </div>
        <Button variant="outline" onClick={() => void onRefresh()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Synchroniser
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            role="button"
            tabIndex={0}
            onClick={() => onKpiClick?.(kpi.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onKpiClick?.(kpi.key);
              }
            }}
            className="cursor-pointer transition-colors hover:bg-muted/40"
          >
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">{kpi.helper}</CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
