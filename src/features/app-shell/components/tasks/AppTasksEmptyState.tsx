import { ClipboardList, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AppTasksEmptyStateProps = {
  onCreateTask: () => void;
};

export function AppTasksEmptyState({ onCreateTask }: AppTasksEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h3 className="font-medium text-lg mb-2">Aucune tache</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Commencez par creer votre premiere tache
      </p>
      <Button onClick={onCreateTask}>
        <Plus className="w-4 h-4 mr-2" /> Creer une tache
      </Button>
    </div>
  );
}
