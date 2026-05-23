import type { NotificationItem } from '@/features/app-shell/types';

type StoredNotification = NotificationItem & { createdAt: string };

export function mapStoredNotification(notification: StoredNotification): NotificationItem {
  const rawRead = (notification as { read?: unknown }).read;

  return {
    id: String(notification.id),
    message: notification.message || 'Notification',
    type: ['success', 'error', 'warning', 'info'].includes(notification.type)
      ? notification.type
      : 'info',
    read: rawRead === true || rawRead === 'true' || rawRead === 1,
    createdAt: new Date(notification.createdAt),
    conversationId: notification.conversationId,
    messageId: notification.messageId,
  };
}

export function parseStoredNotifications(raw: string): NotificationItem[] {
  const parsed = JSON.parse(raw) as StoredNotification[];
  return parsed.map(mapStoredNotification);
}
