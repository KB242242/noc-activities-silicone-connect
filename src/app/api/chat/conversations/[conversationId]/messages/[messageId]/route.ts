import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishChatEvent } from '@/lib/chatRealtime';

type MessageRouteContext = {
  params:
    | Promise<{ conversationId?: string; messageId?: string }>
    | { conversationId?: string; messageId?: string };
};

function extractRouteIdsFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const conversationsIndex = segments.findIndex((segment) => segment === 'conversations');
  const messagesIndex = segments.findIndex((segment) => segment === 'messages');

  return {
    conversationId: conversationsIndex === -1 ? undefined : segments[conversationsIndex + 1],
    messageId: messagesIndex === -1 ? undefined : segments[messagesIndex + 1],
  };
}

async function resolveRouteIds(request: NextRequest, context: MessageRouteContext) {
  const routeParams = await Promise.resolve(context.params);
  const fromPath = extractRouteIdsFromPath(new URL(request.url).pathname);

  return {
    conversationId: routeParams?.conversationId || fromPath.conversationId,
    messageId: routeParams?.messageId || fromPath.messageId,
  };
}

function parseStoredMessageContent(rawContent: unknown) {
  if (typeof rawContent !== 'string') {
    return {
      type: 'text',
      content: '',
      mediaUrl: undefined as string | undefined,
      fileName: undefined as string | undefined,
      fileSize: undefined as number | undefined,
      fileType: undefined as string | undefined,
      duration: undefined as number | undefined,
      replyToId: undefined as string | undefined,
      isEdited: false,
      deletedForEveryone: false,
      isPinned: false,
      isImportant: false,
      deletedForUserIds: [] as string[],
    };
  }

  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && parsed.__chatPayload === 1) {
      return {
        type: typeof parsed.type === 'string' ? parsed.type : 'text',
        content: typeof parsed.content === 'string' ? parsed.content : '',
        mediaUrl: typeof parsed.mediaUrl === 'string' ? parsed.mediaUrl : undefined,
        fileName: typeof parsed.fileName === 'string' ? parsed.fileName : undefined,
        fileSize: typeof parsed.fileSize === 'number' ? parsed.fileSize : undefined,
        fileType: typeof parsed.fileType === 'string' ? parsed.fileType : undefined,
        duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
        replyToId: typeof parsed.replyToId === 'string' ? parsed.replyToId : undefined,
        isEdited: Boolean(parsed.isEdited),
        deletedForEveryone: Boolean(parsed.deletedForEveryone),
        isPinned: Boolean(parsed.isPinned),
        isImportant: Boolean(parsed.isImportant),
        deletedForUserIds: Array.isArray(parsed.deletedForUserIds)
          ? parsed.deletedForUserIds.filter((id: unknown) => typeof id === 'string')
          : [],
      };
    }
  } catch (_error) {
    // Support legacy plain-text messages.
  }

  if (rawContent.startsWith('{"__chatPayload"')) {
    const typeMatch = rawContent.match(/"type":"([^"]+)"/);
    const fileNameMatch = rawContent.match(/"fileName":"([^"]+)"/);
    const fileSizeMatch = rawContent.match(/"fileSize":(\d+)/);

    return {
      type: typeMatch?.[1] || 'text',
      content: '',
      mediaUrl: undefined as string | undefined,
      fileName: fileNameMatch?.[1],
      fileSize: fileSizeMatch?.[1] ? Number(fileSizeMatch[1]) : undefined,
      fileType: undefined as string | undefined,
      duration: undefined as number | undefined,
      replyToId: undefined as string | undefined,
      isEdited: false,
      deletedForEveryone: false,
      isPinned: false,
      isImportant: false,
      deletedForUserIds: [] as string[],
    };
  }

  return {
    type: 'text',
    content: rawContent,
    mediaUrl: undefined as string | undefined,
    fileName: undefined as string | undefined,
    fileSize: undefined as number | undefined,
    fileType: undefined as string | undefined,
    duration: undefined as number | undefined,
    replyToId: undefined as string | undefined,
    isEdited: false,
    deletedForEveryone: false,
    isPinned: false,
    isImportant: false,
    deletedForUserIds: [] as string[],
  };
}

function toStoredMessageContent(payload: ReturnType<typeof parseStoredMessageContent>) {
  return JSON.stringify({
    __chatPayload: 1,
    type: payload.type,
    content: payload.content,
    mediaUrl: payload.mediaUrl,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    fileType: payload.fileType,
    duration: payload.duration,
    replyToId: payload.replyToId,
    isEdited: payload.isEdited,
    deletedForEveryone: payload.deletedForEveryone,
    isPinned: payload.isPinned,
    isImportant: payload.isImportant,
    deletedForUserIds: payload.deletedForUserIds,
  });
}

function mapMessage(message: any) {
  const payload = parseStoredMessageContent(message.content);

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.sender?.name || 'Utilisateur',
    senderAvatar: message.sender?.avatar || undefined,
    type: payload.type,
    messageType: payload.type,
    content: payload.content,
    mediaUrl: payload.mediaUrl,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    fileType: payload.fileType,
    duration: payload.duration,
    status: message.status || 'sent',
    readAt: message.readAt || undefined,
    replyToId: payload.replyToId,
    isEdited: payload.isEdited,
    deletedForEveryone: payload.deletedForEveryone,
    isPinned: payload.isPinned,
    isImportant: payload.isImportant,
    createdAt: message.sentAt,
    updatedAt: message.updatedAt || message.sentAt,
  };
}

export async function PATCH(request: NextRequest, context: MessageRouteContext) {
  try {
    const { conversationId, messageId } = await resolveRouteIds(request, context);
    if (!conversationId || !messageId) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants' }, { status: 400 });
    }

    const body = await request.json();
    const { action, userId, content, isPinned, isImportant } = body;

    if (!action || !userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'action/userId manquant' }, { status: 400 });
    }

    const message = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 });
    }

    const payload = parseStoredMessageContent(message.content);

    if (action === 'deleteForEveryone') {
      if (message.senderId !== userId) {
        return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
      }
      payload.deletedForEveryone = true;
      payload.content = '';
      payload.mediaUrl = undefined;
      payload.fileName = undefined;
      payload.fileSize = undefined;
      payload.fileType = undefined;
      payload.duration = undefined;
    } else if (action === 'deleteForMe') {
      if (!payload.deletedForUserIds.includes(userId)) {
        payload.deletedForUserIds.push(userId);
      }
    } else if (action === 'togglePin') {
      payload.isPinned = typeof isPinned === 'boolean' ? isPinned : !payload.isPinned;
    } else if (action === 'toggleImportant') {
      payload.isImportant = typeof isImportant === 'boolean' ? isImportant : !payload.isImportant;
    } else if (action === 'editContent') {
      if (message.senderId !== userId) {
        return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 });
      }
      if (typeof content !== 'string') {
        return NextResponse.json({ success: false, error: 'content invalide' }, { status: 400 });
      }
      payload.content = content;
      payload.isEdited = true;
    } else {
      return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
    }

    const updatedMessage = await db.chatMessage.update({
      where: { id: messageId },
      data: {
        content: toStoredMessageContent(payload),
        updatedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const participants = await db.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    publishChatEvent(
      participants.map((participant) => participant.userId),
      {
        type: 'message-updated',
        conversationId,
        message: mapMessage(updatedMessage),
      }
    );

    return NextResponse.json({ success: true, message: mapMessage(updatedMessage) });
  } catch (error) {
    console.error('Error patching message:', error);
    return NextResponse.json({ success: false, error: 'Erreur mise à jour message' }, { status: 500 });
  }
}
