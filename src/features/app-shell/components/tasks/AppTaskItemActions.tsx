import { ArrowRightLeft, Info, Pause, Play, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AppTaskItemActionsProps = {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onTransfer: () => void;
  onOpenDetails: () => void;
  onDelete: () => void;
};

export function AppTaskItemActions({
  status,
  onStart,
  onPause,
  onResume,
  onTransfer,
  onOpenDetails,
  onDelete,
}: AppTaskItemActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {status !== 'completed' && status !== 'cancelled' ? (
        <>
          {status === 'pending' ? (
            <Button variant="ghost" size="sm" onClick={onStart}>
              <Play className="w-4 h-4 text-blue-600" />
            </Button>
          ) : null}
          {status === 'in_progress' ? (
            <Button variant="ghost" size="sm" onClick={onPause}>
              <Pause className="w-4 h-4 text-orange-600" />
            </Button>
          ) : null}
          {status === 'on_hold' ? (
            <Button variant="ghost" size="sm" onClick={onResume}>
              <Play className="w-4 h-4 text-green-600" />
            </Button>
          ) : null}
        </>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onOpenDetails}>
        <Info className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onTransfer}>
        <ArrowRightLeft className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
