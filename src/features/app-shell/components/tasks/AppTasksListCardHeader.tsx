import { ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle } from '@/components/ui/card';

type AppTasksListCardHeaderProps = {
  taskCount: number;
};

export function AppTasksListCardHeader({ taskCount }: AppTasksListCardHeaderProps) {
  return (
    <CardHeader className="pb-2 pt-4">
      <CardTitle className="text-base flex items-center gap-2">
        <ClipboardList className="w-5 h-5" />
        Liste des taches
        {taskCount > 0 ? (
          <Badge variant="outline" className="ml-2">
            {taskCount}
          </Badge>
        ) : null}
      </CardTitle>
    </CardHeader>
  );
}
