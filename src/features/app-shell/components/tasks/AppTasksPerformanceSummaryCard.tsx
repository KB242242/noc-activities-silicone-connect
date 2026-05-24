import type { ComponentType } from 'react';

import { TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AppTasksPerformanceSummaryCardProps = {
  isVisible: boolean;
  productivityRate: number;
  onTimeRate: number;
  tasksCompleted: number;
  tasksCreated: number;
  badgeLabel?: string;
  BadgeIcon?: ComponentType<{ className?: string }>;
};

export function AppTasksPerformanceSummaryCard({
  isVisible,
  productivityRate,
  onTimeRate,
  tasksCompleted,
  tasksCreated,
  badgeLabel,
  BadgeIcon,
}: AppTasksPerformanceSummaryCardProps) {
  if (!isVisible) return null;

  return (
    <Card className="bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Ma performance du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{productivityRate}%</p>
            <p className="text-sm text-muted-foreground">Productivite</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{onTimeRate}%</p>
            <p className="text-sm text-muted-foreground">A l'heure</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-600">
              {tasksCompleted}/{tasksCreated}
            </p>
            <p className="text-sm text-muted-foreground">Taches</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {BadgeIcon ? <BadgeIcon className="w-6 h-6" /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{badgeLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
