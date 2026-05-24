import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Coffee,
  ExternalLink,
  MoonIcon,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXTERNAL_LINKS } from '@/features/app-shell/noc-config';
import { getShiftColor, SHIFTS_DATA } from '@/features/app-shell/shifts';
import { getIndividualRestAgent, getShiftScheduleForDate } from '@/features/app-shell/planning-utils';
import type { Task, UserProfile } from '@/features/app-shell/types';

type DashboardRestInfo = {
  isOnIndividualRest: boolean;
  isOnCollectiveRest: boolean;
  nextIndividualRest: Date | null;
  nextCollectiveRestStart: Date | null;
};

type AppDashboardPanelProps = {
  user: UserProfile | null;
  userRestInfo: DashboardRestInfo | null;
  tasks: Task[];
  onRefresh: () => void;
};

export function AppDashboardPanel({ user, userRestInfo, tasks, onRefresh }: AppDashboardPanelProps) {
  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name} • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {user?.shift && userRestInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coffee className="w-5 h-5" /> Mon Repos Individuel
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {userRestInfo.isOnIndividualRest ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Vous êtes en repos aujourd'hui</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Prochain repos individuel :</p>
                  <p className="text-lg font-bold mt-1">
                    {userRestInfo.nextIndividualRest ? format(userRestInfo.nextIndividualRest, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <MoonIcon className="w-5 h-5" /> Repos Collectif
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {userRestInfo.isOnCollectiveRest ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Repos collectif en cours</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Prochain repos collectif :</p>
                  <p className="text-lg font-bold mt-1">
                    {userRestInfo.nextCollectiveRestStart ? format(userRestInfo.nextCollectiveRestStart, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Taux présence</span>
            <UserCheck className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-1">98.5%</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tâches en cours</span>
            <Briefcase className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{tasks.filter((t) => t.status === 'in_progress').length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Incidents</span>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-1">3</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">SLA</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-1">99.2%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Activité hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={[
                  { day: 'Lun', monitoring: 12, calls: 8, reports: 5 },
                  { day: 'Mar', monitoring: 15, calls: 10, reports: 7 },
                  { day: 'Mer', monitoring: 18, calls: 12, reports: 6 },
                  { day: 'Jeu', monitoring: 14, calls: 9, reports: 8 },
                  { day: 'Ven', monitoring: 16, calls: 11, reports: 4 },
                  { day: 'Sam', monitoring: 10, calls: 6, reports: 3 },
                  { day: 'Dim', monitoring: 8, calls: 5, reports: 2 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Area type="monotone" dataKey="monitoring" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Monitoring" />
                <Area type="monotone" dataKey="calls" stackId="1" stroke="#EAB308" fill="#EAB308" fillOpacity={0.6} name="Appels" />
                <Area type="monotone" dataKey="reports" stackId="1" stroke="#22C55E" fill="#22C55E" fillOpacity={0.6} name="Rapports" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Répartition par shift</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Shift A', value: 35, color: '#3B82F6' },
                    { name: 'Shift B', value: 33, color: '#EAB308' },
                    { name: 'Shift C', value: 32, color: '#22C55E' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Shift A', value: 35, color: '#3B82F6' },
                    { name: 'Shift B', value: 33, color: '#EAB308' },
                    { name: 'Shift C', value: 32, color: '#22C55E' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.keys(SHIFTS_DATA).map((shiftName) => {
          const shiftData = SHIFTS_DATA[shiftName];
          const now = new Date();
          const schedule = getShiftScheduleForDate(shiftName, now);
          const isActive = schedule.isWorking;

          return (
            <Card key={shiftName} className={`card-hover border-2 ${!isActive ? 'opacity-60' : ''}`} style={{ borderColor: isActive ? getShiftColor(shiftName) : undefined }}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(shiftName) }} />
                    Shift {shiftName}
                  </CardTitle>
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                    {isActive ? (schedule.dayType === 'DAY_SHIFT' ? 'Jour' : 'Nuit') : 'Repos'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex -space-x-2 mb-2">
                  {shiftData.members.map((member, idx) => {
                    const restInfo = getIndividualRestAgent(shiftName, now);
                    const isResting = restInfo?.agentName === member;

                    return (
                      <Avatar key={idx} className={`border-2 border-background h-7 w-7 ${isResting ? 'opacity-50' : ''}`}>
                        <AvatarFallback className="text-xs" style={{ backgroundColor: `${getShiftColor(shiftName)}20`, color: getShiftColor(shiftName) }}>
                          {member.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{shiftData.members.join(', ')}</p>
                <div className="mt-2 text-xs text-muted-foreground">Cycle {schedule.cycleNumber} • Jour {schedule.dayNumber || '-'}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-5 h-5" /> Accès Rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {EXTERNAL_LINKS.map((link) => {
              const IconComponent = link.icon;
              return (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                    <IconComponent className="w-4 h-4" />
                    <span className="text-xs text-center">{link.name}</span>
                  </Button>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}