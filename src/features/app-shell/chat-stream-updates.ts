import type { ChatMessage, Conversation, NotificationItem } from '@/features/app-shell/types';

export function mergeIncomingMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const exists = messages.some((existing) => existing.id === message.id);
  if (exists) {
    return messages.map((existing) => (existing.id === message.id ? { ...existing, ...message } : existing));
  }
  return [...messages, message];
}

export function mergePinnedMessages(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (!message.isPinned) {
    return messages.filter((existing) => existing.id !== message.id);
  }
  const exists = messages.some((existing) => existing.id === message.id);
  return exists
    ? messages.map((existing) => (existing.id === message.id ? { ...existing, ...message } : existing))
    : [...messages, message];
}

export function updateConversationsWithIncomingMessage(
  conversations: Conversation[],
  message: ChatMessage,
  isIncoming: boolean,
  isOpenConversation: boolean
): Conversation[] {
  return conversations.map((conversation) => {
    if (conversation.id !== message.conversationId) return conversation;

    return {
      ...conversation,
      lastMessage: message,
      updatedAt: new Date(),
      unreadCount: isIncoming && !isOpenConversation ? (conversation.unreadCount || 0) + 1 : 0,
    };
  });
}

export function markNotificationsReadForConversation(
  notifications: NotificationItem[],
  conversationId: string
): NotificationItem[] {
  return notifications.map((notification) =>
    notification.conversationId === conversationId
      ? { ...notification, read: true }
      : notification
  );
}
