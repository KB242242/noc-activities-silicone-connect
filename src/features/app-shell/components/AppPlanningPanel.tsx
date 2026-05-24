import { motion } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { getShiftColor, getShiftLightBg } from '@/features/app-shell/shifts';

type PlanningAgent = {
  name: string;
  isResting?: boolean;
  responsibility?: string;
};

type PlanningShift = {
  name: string;
  schedule: {
    isCollectiveRest?: boolean;
    dayType?: 'DAY_SHIFT' | 'NIGHT_SHIFT' | string;
    dayNumber?: number | null;
    cycleNumber?: number;
  };
  restInfo?: {
    agentName: string;
  } | null;
  agents: PlanningAgent[];
};

type PlanningDay = {
  date: Date;
  shifts: PlanningShift[];
};

type AppPlanningPanelProps = {
  currentMonth: Date;
  planning: PlanningDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGeneratePdf: () => void;
};

export function AppPlanningPanel({
  currentMonth,
  planning,
  onPreviousMonth,
  onNextMonth,
  onGeneratePdf,
}: AppPlanningPanelProps) {
  return (
    <motion.div key="planning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Planning des shifts</h1>
          <p className="text-muted-foreground">Cycles : 6 jours travail (3 jour + 3 nuit) + 3 jours repos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-35 text-center text-sm">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</span>
          <Button variant="outline" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={onGeneratePdf} className="gap-2 ml-2">
            <FileDown className="w-4 h-4" /> Générer PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-175">
            <div className="grid grid-cols-7 border-b">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div key={day} className="p-2 text-center font-medium border-r last:border-r-0 bg-muted/50 text-sm">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {planning.map((day, idx) => {
                const isCurrentDay = isToday(day.date);

                return (
                  <div key={idx} className={`min-h-25 border-r border-b p-1.5 ${isCurrentDay ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>{format(day.date, 'd')}</span>
                      {isCurrentDay && (
                        <Badge variant="default" className="text-[10px] h-4 px-1">
                          Auj
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {day.shifts.map((shift) => (
                        <Popover key={shift.name}>
                          <PopoverTrigger asChild>
                            <div
                              className={`text-[10px] p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                shift.schedule.isCollectiveRest
                                  ? 'bg-muted text-muted-foreground'
                                  : shift.schedule.dayType === 'DAY_SHIFT'
                                    ? getShiftLightBg(shift.name)
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">S{shift.name}</span>
                                <span className="opacity-70">
                                  {shift.schedule.isCollectiveRest
                                    ? 'R'
                                    : `${shift.schedule.dayType === 'DAY_SHIFT' ? 'J' : 'N'}${shift.schedule.dayNumber}`}
                                </span>
                              </div>
                              {shift.restInfo && <div className="text-orange-500 font-medium">RI: {shift.restInfo.agentName.substring(0, 3)}</div>}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(shift.name) }} />
                                <span className="font-medium">Shift {shift.name}</span>
                              </div>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {shift.schedule.isCollectiveRest
                                      ? 'Repos collectif'
                                      : shift.schedule.dayType === 'DAY_SHIFT'
                                        ? 'Jour (07h-19h)'
                                        : 'Nuit (19h-07h)'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Cycle:</span>
                                  <span>#{shift.schedule.cycleNumber}</span>
                                </div>
                                {shift.restInfo && (
                                  <div className="flex justify-between text-orange-500">
                                    <span>Repos individuel:</span>
                                    <span className="font-medium">{shift.restInfo.agentName}</span>
                                  </div>
                                )}
                              </div>
                              <Separator />
                              <div className="text-xs">
                                <p className="font-medium mb-1">Agents:</p>
                                {shift.agents.map((agent, i) => (
                                  <div key={i} className="flex items-center justify-between py-0.5">
                                    <span className={agent.isResting ? 'line-through text-muted-foreground' : ''}>{agent.name}</span>
                                    {agent.isResting && (
                                      <Badge variant="secondary" className="text-[9px]">
                                        Repos
                                      </Badge>
                                    )}
                                    {agent.responsibility && (
                                      <Badge variant="outline" className="text-[9px]">
                                        {agent.responsibility.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}