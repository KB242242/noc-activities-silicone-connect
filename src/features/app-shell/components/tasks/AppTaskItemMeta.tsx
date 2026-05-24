import { Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type AppTaskItemMetaProps = {
  statusLabel: string;
  statusClassName: string;
  timeRangeLabel: string;
  durationLabel: string;
  tags: string[];
};

export function AppTaskItemMeta({
  statusLabel,
  statusClassName,
  timeRangeLabel,
  durationLabel,
  tags,
}: AppTaskItemMetaProps) {
  return (
    <div className="flex items-center gap-3 mt-2 flex-wrap">
      <Badge className={statusClassName}>{statusLabel}</Badge>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock3 className="w-3 h-3" />
        {timeRangeLabel}
      </span>
      <span className="text-xs text-muted-foreground flex items-center gap-1">{durationLabel}</span>
      {tags.length > 0 ? (
        <div className="flex gap-1">
          {tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
