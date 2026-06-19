import type { ReactNode } from 'react';

import { ClipboardList } from 'lucide-react';

type AppTasksHeaderProps = {
  actions?: ReactNode;
};

export function AppTasksHeader({ actions }: AppTasksHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-blue-600" />
          Mes Tâches Journalières
        </h1>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

