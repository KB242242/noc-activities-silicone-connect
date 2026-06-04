import type { ReactNode } from 'react';

type AppTicketsHeaderProps = {
  actions: ReactNode;
};

export function AppTicketsHeader({ actions }: AppTicketsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gestion des Tickets</h1>
        <p className="text-muted-foreground">Suivi et création de tickets</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}