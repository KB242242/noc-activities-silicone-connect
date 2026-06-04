import type { Conversation } from '@/features/app-shell/core/shared/types';

export function resetConversationUnreadCount(
  conversations: Conversation[],
  conversationId: string
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, unreadCount: 0 }
      : conversation
  );
}