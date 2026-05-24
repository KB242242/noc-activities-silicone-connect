import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock3, Pause, Play } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type AppTasksStatsCardsProps = {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  lateCount: number;
  onHoldCount: number;
};

export function AppTasksStatsCards({
  pendingCount,
  inProgressCount,
  completedCount,
  lateCount,
  onHoldCount,
}: AppTasksStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-3 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">En attente</span>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {pendingCount}
            </Badge>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">En cours</span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {inProgressCount}
            </Badge>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-3 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Terminees</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {completedCount}
            </Badge>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">En retard</span>
            </div>
            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {lateCount}
            </Badge>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-3 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Suspendues</span>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {onHoldCount}
            </Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
