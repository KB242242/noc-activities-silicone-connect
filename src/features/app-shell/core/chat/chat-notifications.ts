import type { NotificationItem } from '@/features/app-shell/core/shared/types';

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

export function prependNotification(
  notifications: NotificationItem[],
  notification: NotificationItem
): NotificationItem[] {
  return [notification, ...notifications];
}

export function prependNotificationIfMissingMessage(
  notifications: NotificationItem[],
  notification: NotificationItem,
  options?: { conversationId?: string; messageId?: string }
): NotificationItem[] {
  if (!options?.messageId) {
    return [notification, ...notifications];
  }

  const alreadyExists = notifications.some(
    (entry) =>
      entry.messageId === options.messageId && entry.conversationId === options.conversationId
  );

  if (alreadyExists) {
    return notifications;
  }

  return [notification, ...notifications];
}

export function markNotificationAsRead(
  notifications: NotificationItem[],
  id: string
): NotificationItem[] {
  return notifications.map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification
  );
}

export function markAllNotificationsAsRead(
  notifications: NotificationItem[]
): NotificationItem[] {
  return notifications.map((notification) => ({ ...notification, read: true }));
}