import type { ReactNode } from 'react';

type AppTicketsHeaderProps = {
  actions: ReactNode;
};

export function AppTicketsHeader({ actions }: AppTicketsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-foreground wrap-break-word">Gestion des Tickets</h1>
        <p className="text-sm sm:text-base text-muted-foreground wrap-break-word">Suivi et création de tickets</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>
    </div>
  );
}