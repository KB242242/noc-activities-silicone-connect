import type { Conversation } from '@/features/app-shell/types';

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
