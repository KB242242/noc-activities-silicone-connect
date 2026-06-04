import type { ChatMessage, Conversation, UserProfile } from '@/features/app-shell/core/shared/types';

export type ProfileUpdate = {
  userId: string;
  avatar?: string;
  name?: string;
};

export function getProfileUpdateFromPayload(payload: any): ProfileUpdate | null {
  if (payload?.type !== 'profile-updated' || !payload.user?.id) {
    return null;
  }

  const avatar =
    typeof payload.user.avatar === 'string' && payload.user.avatar.trim().length > 0
      ? payload.user.avatar
      : undefined;
  const name =
    typeof payload.user.name === 'string' && payload.user.name.trim().length > 0
      ? payload.user.name
      : undefined;

  return {
    userId: String(payload.user.id),
    avatar,
    name,
  };
}

export function applyProfileUpdateToUsers(
  users: UserProfile[],
  profileUpdate: ProfileUpdate
): { nextUsers: UserProfile[]; changed: boolean } {
  const exists = users.some((entry) => entry.id === profileUpdate.userId);
  if (!exists) {
    return { nextUsers: users, changed: false };
  }

  const nextUsers = users.map((entry) =>
    entry.id === profileUpdate.userId
      ? {
          ...entry,
          ...(profileUpdate.avatar !== undefined ? { avatar: profileUpdate.avatar } : {}),
          ...(profileUpdate.name ? { name: profileUpdate.name } : {}),
        }
      : entry
  );

  return { nextUsers, changed: true };
}

export function applyProfileUpdateToConversations(
  conversations: Conversation[],
  profileUpdate: ProfileUpdate
): Conversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    participants: conversation.participants.map((participant) =>
      participant.id === profileUpdate.userId
        ? {
            ...participant,
            ...(profileUpdate.avatar !== undefined ? { avatar: profileUpdate.avatar } : {}),
            ...(profileUpdate.name ? { name: profileUpdate.name } : {}),
          }
        : participant
    ),
  }));
}

export function applyProfileUpdateToChatMessages(
  messages: ChatMessage[],
  profileUpdate: ProfileUpdate
): ChatMessage[] {
  return messages.map((message) =>
    message.senderId === profileUpdate.userId
      ? {
          ...message,
          ...(profileUpdate.avatar !== undefined ? { senderAvatar: profileUpdate.avatar } : {}),
          ...(profileUpdate.name ? { senderName: profileUpdate.name } : {}),
        }
      : message
  );
}