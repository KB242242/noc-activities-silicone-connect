import { motion } from 'framer-motion';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type AppSupervisionTabContentProps = {
  SHIFTS_DATA: Record<string, { members: string[] }>;
  getShiftScheduleForDate: (shiftName: string, date: Date) => { isWorking: boolean };
  getIndividualRestAgent: (shiftName: string, date: Date) => { agentName?: string } | null;
  getShiftColor: (shiftName: string) => string;
};

export function AppSupervisionTabContent({
  SHIFTS_DATA,
  getShiftScheduleForDate,
  getIndividualRestAgent,
  getShiftColor,
}: AppSupervisionTabContentProps) {
  return (
    <motion.div key="supervision" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Supervision Temps Réel</h1>
        <p className="text-muted-foreground">Vue en direct de l'activité du NOC</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.keys(SHIFTS_DATA).flatMap((shiftName) => {
          const shiftData = SHIFTS_DATA[shiftName];
          const schedule = getShiftScheduleForDate(shiftName, new Date());

          return shiftData.members.map((member, idx) => {
            const restInfo = getIndividualRestAgent(shiftName, new Date());
            const isResting = restInfo?.agentName === member;
            const isOnDuty = schedule.isWorking && !isResting;

            return (
              <Card key={`${shiftName}-${idx}`} className={`${!schedule.isWorking || isResting ? 'opacity-60' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: `${getShiftColor(shiftName)}20`, color: getShiftColor(shiftName) }}>
                          {member.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isOnDuty ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{member}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getShiftColor(shiftName) }} />
                        <span className="text-xs text-muted-foreground">S{shiftName}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs mt-2">
                    {!schedule.isWorking ? 'Repos' : isResting ? 'Repos indiv.' : 'Actif'}
                  </Badge>
                </CardContent>
              </Card>
            );
          });
        })}
      </div>
    </motion.div>
  );
}
