import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { AppTasksListCardHeader } from '@/features/app-shell/components/tasks/AppTasksListCardHeader';

type AppTasksListCardProps = {
  taskCount: number;
  children: ReactNode;
};

export function AppTasksListCard({ taskCount, children }: AppTasksListCardProps) {
  return (
    <Card>
      <AppTasksListCardHeader taskCount={taskCount} />
      <CardContent className="pb-4">
        <ScrollArea className="h-100">{children}</ScrollArea>
      </CardContent>
    </Card>
  );
}
