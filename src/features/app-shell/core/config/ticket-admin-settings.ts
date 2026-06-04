import { DEFAULT_TICKET_ADMIN_SETTINGS } from '@/features/app-shell/core/config/ticket-constants';
import type { TicketAdminSettings } from '@/features/app-shell/core/shared/types';

export function normalizeTicketAdminSettings(payload: any): TicketAdminSettings {
  return {
    numberFormat: String(payload?.numberFormat ?? DEFAULT_TICKET_ADMIN_SETTINGS.numberFormat),
    numberSeed: Number(payload?.numberSeed ?? DEFAULT_TICKET_ADMIN_SETTINGS.numberSeed),
    notificationEmails: Array.isArray(payload?.notificationEmails)
      ? payload.notificationEmails.map((item: unknown) => String(item).trim()).filter(Boolean)
      : DEFAULT_TICKET_ADMIN_SETTINGS.notificationEmails,
    supportCopyEmail: String(payload?.supportCopyEmail ?? DEFAULT_TICKET_ADMIN_SETTINGS.supportCopyEmail).trim(),
    technicianFallbackEmail: String(payload?.technicianFallbackEmail ?? DEFAULT_TICKET_ADMIN_SETTINGS.technicianFallbackEmail).trim(),
    lifecycleEmailEvents: {
      creation: Boolean(payload?.lifecycleEmailEvents?.creation ?? DEFAULT_TICKET_ADMIN_SETTINGS.lifecycleEmailEvents.creation),
      pending: Boolean(payload?.lifecycleEmailEvents?.pending ?? DEFAULT_TICKET_ADMIN_SETTINGS.lifecycleEmailEvents.pending),
      escalated: Boolean(payload?.lifecycleEmailEvents?.escalated ?? DEFAULT_TICKET_ADMIN_SETTINGS.lifecycleEmailEvents.escalated),
      closed: Boolean(payload?.lifecycleEmailEvents?.closed ?? DEFAULT_TICKET_ADMIN_SETTINGS.lifecycleEmailEvents.closed),
    },
    sendClientCopyForIncidentMaintenance: Boolean(
      payload?.sendClientCopyForIncidentMaintenance ?? DEFAULT_TICKET_ADMIN_SETTINGS.sendClientCopyForIncidentMaintenance
    ),
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