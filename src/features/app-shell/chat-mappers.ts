import type { ChatMessage } from '@/features/app-shell/types';

export function mapFetchedChatMessage(message: any): ChatMessage {
  let parsed = { ...message };

  if (typeof message.content === 'string' && message.content.startsWith('{"__chatPayload"')) {
    try {
      const payload = JSON.parse(message.content);
      if (payload.__chatPayload) {
        parsed = {
          ...message,
          ...payload,
          content: payload.content || '',
          mediaData: payload.mediaUrl || payload.mediaData || undefined,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          fileType: payload.fileType,
          type: payload.type || message.type,
        };
      }
    } catch {
      // Keep original payload when parsing fails.
    }
  } else {
    parsed.mediaData = message.mediaUrl || undefined;
  }

  return {
    ...parsed,
    createdAt: new Date(message.createdAt),
    updatedAt: new Date(message.updatedAt),
    readAt: message.readAt ? new Date(message.readAt) : undefined,
    isImportant: Boolean(message.isImportant),
    replyTo: undefined,
  };
}

export function attachReplyMessages(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map(messages.map((msg) => [msg.id, msg]));
  return messages.map((msg) => ({
    ...msg,
    replyTo: msg.replyTo ? byId.get(msg.replyTo as unknown as string) : undefined,
  }));
}

export function mapIncomingChatMessage(incoming: any): ChatMessage {
  return {
    ...incoming,
    createdAt: new Date(incoming.createdAt),
    updatedAt: new Date(incoming.updatedAt),
    readAt: incoming.readAt ? new Date(incoming.readAt) : undefined,
    mediaData: incoming.mediaUrl || undefined,
    reactions: incoming.reactions || [],
    readBy: incoming.readBy || [],
    isEdited: incoming.isEdited || false,
    isDeleted: incoming.isDeleted || false,
    deletedForEveryone: incoming.deletedForEveryone || false,
    isPinned: incoming.isPinned || false,
    isImportant: incoming.isImportant || false,
    isArchived: incoming.isArchived || false,
  };
}
