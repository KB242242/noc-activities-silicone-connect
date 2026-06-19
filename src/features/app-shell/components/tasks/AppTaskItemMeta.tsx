import { Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type AppTaskItemMetaProps = {
  statusLabel: string;
  statusClassName: string;
  timeRangeLabel: string;
  durationLabel: string;
  tags: string[];
  alertCount?: number;
  linkedTicketLabel?: string;
};

export function AppTaskItemMeta({
  statusLabel,
  statusClassName,
  timeRangeLabel,
  durationLabel,
  tags,
  alertCount = 0,
  linkedTicketLabel,
}: AppTaskItemMetaProps) {
  return (
    <div className="flex items-center gap-3 mt-2 flex-wrap">
      <Badge className={statusClassName}>{statusLabel}</Badge>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock3 className="w-3 h-3" />
        {timeRangeLabel}
      </span>
      <span className="text-xs text-muted-foreground flex items-center gap-1">{durationLabel}</span>
      {alertCount > 0 ? (
        <Badge variant="destructive" className="text-xs">
          {alertCount} alerte{alertCount > 1 ? 's' : ''}
        </Badge>
      ) : null}
      {linkedTicketLabel ? (
        <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
          Ticket: {linkedTicketLabel}
        </Badge>
      ) : null}
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
