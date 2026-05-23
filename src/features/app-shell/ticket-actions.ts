import type { TicketItem } from '@/features/app-shell/types';

export function applyOptimisticDelete(
  tickets: TicketItem[],
  ticket: TicketItem,
  permanent: boolean,
  userId?: string
): TicketItem[] {
  if (permanent) {
    return tickets.filter((entry) => entry.id !== ticket.id);
  }

  return tickets.map((entry) =>
    entry.id === ticket.id
      ? {
          ...entry,
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId ?? entry.deletedBy,
        }
      : entry
  );
}

export function applyOptimisticRestore(
  tickets: TicketItem[],
  ticket: TicketItem
): TicketItem[] {
  return tickets.map((entry) =>
    entry.id === ticket.id
      ? {
          ...entry,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
        }
      : entry
  );
}

export function resolveTicketRetentionDays(payload: any, fallbackDays: number): number {
  return Number(payload?.retentionDays ?? fallbackDays ?? 30);
}
