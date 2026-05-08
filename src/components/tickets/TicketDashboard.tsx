'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  Users, MapPin, BarChart3, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { TICKET_TYPE_CONFIG, TICKET_STATUS_CONFIG, NocTicketType } from './types';

// ── Types ─────────────────────────────────────────────────────

interface StatsData {
  total: number;
  open: number;
  pending: number;
  escalated: number;
  closed: number;
  byType: Record<string, number>;
  byMonth: { month: string; count: number; closed: number }[];
  byTechnician: { name: string; count: number; open: number }[];
  byLocality: { locality: string; count: number }[];
  avgResolutionHours: number;
  recurrentSites: { site: string; count: number }[];
}

interface Props {
  user: { id: string; name: string; email: string; role: string };
  refreshKey: number;
}

// ── KPI Card ───────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color, sub,
}: { label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="p-2 rounded-lg" style={{ background: color + '20' }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-xl p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function TicketDashboard({ user, refreshKey }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tickets/stats');
      if (!res.ok) throw new Error('Erreur lors du chargement des statistiques');
      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [refreshKey]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Aucune donnée disponible'}</p>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Réessayer
        </Button>
      </div>
    );
  }

  // Prepare type chart data
  const typeData = (Object.keys(TICKET_TYPE_CONFIG) as NocTicketType[])
    .map((t) => ({
      name: t,
      count: stats.byType[t] ?? 0,
      color: TICKET_TYPE_CONFIG[t].color,
    }))
    .filter((d) => d.count > 0);

  const statusPieData = [
    { name: 'Ouvert', value: stats.open, color: '#3b82f6' },
    { name: 'En Attente', value: stats.pending, color: '#f59e0b' },
    { name: 'Escaladé', value: stats.escalated, color: '#ef4444' },
    { name: 'Fermé', value: stats.closed, color: '#22c55e' },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Tickets</h1>
          <p className="text-sm text-muted-foreground">Vue d&apos;ensemble des activités NOC</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tickets"
          value={stats.total}
          icon={<Ticket className="w-4 h-4" />}
          color="#6366f1"
        />
        <KpiCard
          label="Tickets Ouverts"
          value={stats.open}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="#3b82f6"
          sub={`+ ${stats.pending} en attente`}
        />
        <KpiCard
          label="Escaladés"
          value={stats.escalated}
          icon={<TrendingUp className="w-4 h-4" />}
          color="#ef4444"
        />
        <KpiCard
          label="Résolus"
          value={stats.closed}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="#22c55e"
          sub={stats.avgResolutionHours > 0 ? `Moy. ${stats.avgResolutionHours.toFixed(1)}h` : undefined}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by month */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Évolution mensuelle
          </h2>
          {stats.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byMonth} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="count" name="Créés" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="closed" name="Fermés" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Pas de données</p>
          )}
        </Card>

        {/* Tickets by type (bar) */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-400" />
            Tickets par type
          </h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Tickets" radius={[0, 3, 3, 0]}>
                  {typeData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Pas de données</p>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status pie */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            Répartition par statut
          </h2>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Pas de données</p>
          )}
        </Card>

        {/* Technicians */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Top Techniciens
          </h2>
          {stats.byTechnician.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Pas de données</p>
          ) : (
            <div className="space-y-2">
              {stats.byTechnician.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs w-5 ${i === 0 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                    #{i + 1}
                  </span>
                  <span className="text-sm flex-1 truncate">{t.name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">{t.count}</Badge>
                  {t.open > 0 && (
                    <span className="text-xs text-blue-400">{t.open} ouverts</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recurrent sites */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" />
            Sites Récurrents
            <span className="text-xs text-muted-foreground font-normal">(30 jours)</span>
          </h2>
          {stats.recurrentSites.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun site récurrent détecté</p>
          ) : (
            <div className="space-y-2">
              {stats.recurrentSites.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-sm flex-1 truncate">{s.site}</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{s.count} tickets</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Locality chart */}
      {stats.byLocality.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            Tickets par localité (top 10)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byLocality.slice(0, 10)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="locality" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Tickets" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
