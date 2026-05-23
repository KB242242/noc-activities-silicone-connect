import type { Conversation } from '@/features/app-shell/types';

type ApiConversation = any;

function mapParticipant(participant: any) {
  return {
    ...participant,
    joinedAt: new Date(participant.joinedAt),
    lastReadAt: participant.lastReadAt ? new Date(participant.lastReadAt) : undefined,
  };
}

function mapFetchLastMessage(message: any) {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
    updatedAt: new Date(message.updatedAt),
    readAt: message.readAt ? new Date(message.readAt) : undefined,
    mediaData: message.mediaUrl || undefined,
  };
}

function mapCreateLastMessage(message: any) {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
    updatedAt: new Date(message.updatedAt),
    readAt: message.readAt ? new Date(message.readAt) : undefined,
    mediaData: message.mediaUrl || undefined,
    reactions: message.reactions || [],
    readBy: message.readBy || [],
    isEdited: message.isEdited || false,
    isDeleted: message.isDeleted || false,
    deletedForEveryone: message.deletedForEveryone || false,
    isPinned: message.isPinned || false,
    isImportant: message.isImportant || false,
    isArchived: message.isArchived || false,
  };
}

export function mapFetchedConversation(conversation: ApiConversation): Conversation {
  return {
    ...conversation,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
    participants: conversation.participants?.map((participant: any) => mapParticipant(participant)) || [],
    lastMessage: conversation.messages?.[0]
      ? mapFetchLastMessage(conversation.messages[0])
      : undefined,
  } as Conversation;
}

export function mapCreatedConversation(conversation: ApiConversation): Conversation {
  return {
    ...conversation,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
    participants: conversation.participants?.map((participant: any) => mapParticipant(participant)) || [],
    lastMessage: conversation.lastMessage
      ? mapCreateLastMessage(conversation.lastMessage)
      : undefined,
  } as Conversation;
}
