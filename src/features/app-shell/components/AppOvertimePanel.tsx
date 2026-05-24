import { motion } from 'framer-motion';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getIndividualRestAgent, getShiftScheduleForDate } from '@/features/app-shell/planning-utils';
import type { UserProfile } from '@/features/app-shell/types';

type AppOvertimePanelProps = {
  overtimeMonth: Date;
  onChangeOvertimeMonth: (nextMonth: Date) => void;
  onGenerateOvertimePdf: () => void;
  user: UserProfile | null;
};

export function AppOvertimePanel({
  overtimeMonth,
  onChangeOvertimeMonth,
  onGenerateOvertimePdf,
  user,
}: AppOvertimePanelProps) {
  return (
    <motion.div key="overtime" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Heures supplémentaires</h1>
          <p className="text-muted-foreground">2h automatiques par jour travaillé</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onChangeOvertimeMonth(subMonths(overtimeMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-35 text-center text-sm">{format(overtimeMonth, 'MMMM yyyy', { locale: fr })}</span>
          <Button variant="outline" size="icon" onClick={() => onChangeOvertimeMonth(addMonths(overtimeMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {user?.shift && (() => {
        const monthStart = startOfMonth(overtimeMonth);
        const monthEnd = endOfMonth(monthStart);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        const workDays = days.filter((day) => {
          const schedule = getShiftScheduleForDate(user.shift!.name, day);
          if (!schedule.isWorking) return false;
          const restInfo = getIndividualRestAgent(user.shift!.name, day);
          return !restInfo || restInfo.agentName !== user.name;
        });

        const totalHours = workDays.length * 2;

        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Total heures</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totalHours}h</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Jours travaillés</span>
                </div>
                <p className="text-2xl font-bold mt-1">{workDays.length}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Taux horaire</span>
                </div>
                <p className="text-2xl font-bold mt-1">2h/jour</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Approuvé par</span>
                </div>
                <p className="text-sm font-bold mt-1">Daddy AZUMY</p>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Détail mensuel</CardTitle>
                  <Button onClick={onGenerateOvertimePdf} className="gap-2">
                    <FileDown className="w-4 h-4" /> Générer PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <ScrollArea className="h-87.5">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Jour</th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-left p-2 font-medium">Horaires</th>
                        <th className="text-left p-2 font-medium">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workDays.map((day, idx) => {
                        const schedule = getShiftScheduleForDate(user.shift!.name, day);
                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2">{dayNames[day.getDay()]}</td>
                            <td className="p-2">{format(day, 'dd/MM/yyyy')}</td>
                            <td className="p-2">
                              <Badge variant={schedule.dayType === 'DAY_SHIFT' ? 'default' : 'secondary'}>
                                {schedule.dayType === 'DAY_SHIFT' ? 'Jour' : 'Nuit'}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs">
                              {schedule.dayType === 'DAY_SHIFT' ? '07:00-08:00, 18:00-19:00' : '18:00-19:00, 06:00-07:00'}
                            </td>
                            <td className="p-2 font-medium">2h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        );
      })()}
    </motion.div>
  );
}