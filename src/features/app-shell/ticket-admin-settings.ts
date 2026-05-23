import { DEFAULT_TICKET_ADMIN_SETTINGS } from '@/features/app-shell/ticket-constants';
import type { TicketAdminSettings } from '@/features/app-shell/types';

export function normalizeTicketAdminSettings(payload: any): TicketAdminSettings {
  return {
    numberFormat: String(payload?.numberFormat ?? DEFAULT_TICKET_ADMIN_SETTINGS.numberFormat),
    numberSeed: Number(payload?.numberSeed ?? DEFAULT_TICKET_ADMIN_SETTINGS.numberSeed),
    notificationEmails: Array.isArray(payload?.notificationEmails)
      ? payload.notificationEmails.map((item: unknown) => String(item).trim()).filter(Boolean)
      : DEFAULT_TICKET_ADMIN_SETTINGS.notificationEmails,
    defaultSlaHours: Number(payload?.defaultSlaHours ?? DEFAULT_TICKET_ADMIN_SETTINGS.defaultSlaHours),
    trashRetentionDays: Number(payload?.trashRetentionDays ?? DEFAULT_TICKET_ADMIN_SETTINGS.trashRetentionDays),
    slaByCategory: {
      ...DEFAULT_TICKET_ADMIN_SETTINGS.slaByCategory,
      ...(payload?.slaByCategory && typeof payload.slaByCategory === 'object'
        ? payload.slaByCategory
        : {}),
    },
  };
}

export function parseNotificationEmailsInput(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
