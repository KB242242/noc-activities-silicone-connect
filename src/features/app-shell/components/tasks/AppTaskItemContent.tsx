import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

type AppTaskItemContentProps = {
  title: string;
  isCompleted: boolean;
  priorityLabel: string;
  priorityClassName: string;
  categoryIcon: ReactNode;
  description?: string;
  meta: ReactNode;
};

export function AppTaskItemContent({
  title,
  isCompleted,
  priorityLabel,
  priorityClassName,
  categoryIcon,
  description,
  meta,
}: AppTaskItemContentProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {title}
        </span>
        <Badge className={`${priorityClassName} text-xs`}>{priorityLabel}</Badge>
        <span className="text-lg flex items-center">{categoryIcon}</span>
      </div>
      {description ? <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p> : null}
      {meta}
    </div>
  );
}
