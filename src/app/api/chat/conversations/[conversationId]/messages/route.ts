import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishChatEvent } from '@/lib/chatRealtime';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

type MessagesRouteContext = {
  params: Promise<{ conversationId?: string }> | { conversationId?: string };
};

function extractConversationIdFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const conversationsIndex = segments.findIndex((segment) => segment === 'conversations');
  if (conversationsIndex === -1) return undefined;
  return segments[conversationsIndex + 1];
}

async function resolveConversationId(
  request: NextRequest,
  context: MessagesRouteContext
): Promise<string | undefined> {
  const routeParams = await Promise.resolve(context.params);
  return routeParams?.conversationId || extractConversationIdFromPath(new URL(request.url).pathname);
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
    // Backward compatibility for legacy plain text content.
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

function toStoredMessageContent(payload: {
  type: string;
  content: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  duration?: number;
  replyToId?: string;
  isEdited?: boolean;
  deletedForEveryone?: boolean;
  isPinned?: boolean;
  isImportant?: boolean;
  deletedForUserIds?: string[];
}) {
  // Always store mediaUrl as base64 data for images/files (frontend expects this)
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
    isEdited: Boolean(payload.isEdited),
    deletedForEveryone: Boolean(payload.deletedForEveryone),
    isPinned: Boolean(payload.isPinned),
    isImportant: Boolean(payload.isImportant),
    deletedForUserIds: Array.isArray(payload.deletedForUserIds) ? payload.deletedForUserIds : [],
  });
}

function getFileExtension(fileName?: string, fileType?: string) {
  if (fileName && fileName.includes('.')) {
    return fileName.split('.').pop()?.toLowerCase();
  }

  if (!fileType) {
    return undefined;
  }

  if (fileType.includes('png')) return 'png';
  if (fileType.includes('jpeg') || fileType.includes('jpg')) return 'jpg';
  if (fileType.includes('gif')) return 'gif';
  if (fileType.includes('webp')) return 'webp';
  if (fileType.includes('svg')) return 'svg';
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('mpeg')) return 'mp3';
  if (fileType.includes('ogg')) return 'ogg';
  if (fileType.includes('wav')) return 'wav';
  if (fileType.includes('mp4')) return 'mp4';
  if (fileType.includes('webm')) return 'webm';

  return undefined;
}

function sanitizeFileName(name?: string) {
  if (!name) return 'file';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function persistMediaUrlIfNeeded(
  mediaUrl: string | undefined,
  conversationId: string,
  fileName?: string,
  fileType?: string
) {
  if (!mediaUrl || !mediaUrl.startsWith('data:')) {
    return mediaUrl;
  }

  const dataUrlMatch = mediaUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!dataUrlMatch) {
    return mediaUrl;
  }

  const inferredType = dataUrlMatch[1] || fileType || 'application/octet-stream';
  const base64Payload = dataUrlMatch[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  const extension = getFileExtension(fileName, inferredType);
  const safeName = sanitizeFileName(fileName);
  const baseName = safeName.includes('.') ? safeName.slice(0, safeName.lastIndexOf('.')) : safeName;
  const storedName = `${Date.now()}-${randomUUID()}-${baseName}${extension ? `.${extension}` : ''}`;

  const mediaDir = path.join(process.cwd(), 'public', 'chat-media', conversationId);
  await fs.mkdir(mediaDir, { recursive: true });

  const absolutePath = path.join(mediaDir, storedName);
  await fs.writeFile(absolutePath, buffer);

  return `/chat-media/${conversationId}/${storedName}`;
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
    mediaUrl: payload.mediaUrl, // base64 for images/files, or URL for other media
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

export async function GET(request: NextRequest, context: MessagesRouteContext) {
  try {
    const conversationId = await resolveConversationId(request, context);
    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId manquant' }, { status: 400 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      await db.chatMessage.updateMany({
        where: {
          conversationId,
          senderId: {
            not: userId,
          },
          OR: [{ status: null }, { status: { not: 'read' } }],
        },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });

      await db.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId,
        },
        data: {
          lastReadAt: new Date(),
        },
      });
    }

    const conversationMessages = await db.chatMessage.findMany({
      where: {
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
      orderBy: {
        sentAt: 'asc',
      },
    });

    const visibleMessages = conversationMessages.filter((message) => {
      if (!userId) return true;
      const payload = parseStoredMessageContent(message.content);
      return !payload.deletedForUserIds.includes(userId);
    });

    return NextResponse.json(
      { success: true, messages: visibleMessages.map(mapMessage) },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la récupération des messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: MessagesRouteContext) {
  try {
    const body = await request.json();
    const conversationId = (await resolveConversationId(request, context)) || body.conversationId;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId manquant' }, { status: 400 });
    }

    if (!body.senderId || typeof body.senderId !== 'string' || body.senderId.trim() === '') {
      return NextResponse.json({ success: false, error: 'senderId manquant ou invalide' }, { status: 400 });
    }
    if (!body.senderName || typeof body.senderName !== 'string' || body.senderName.trim() === '') {
      return NextResponse.json({ success: false, error: 'senderName manquant ou invalide' }, { status: 400 });
    }
    const validTypes = ['text', 'image', 'video', 'audio', 'document', 'voice', 'location', 'contact'];
    if (!body.type || !validTypes.includes(body.type)) {
      return NextResponse.json({ success: false, error: `type de message invalide (attendu ${validTypes.join(', ')})` }, { status: 400 });
    }
    if (typeof body.content !== 'string') {
      return NextResponse.json({ success: false, error: 'content doit être une chaîne' }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: {
            userId: body.senderId,
          },
          take: 1,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation introuvable' }, { status: 404 });
    }

    let participantId = conversation.participants[0]?.id;

    if (!participantId) {
      const newParticipant = await db.conversationParticipant.create({
        data: {
          conversationId,
          userId: body.senderId,
          role: 'member',
        },
      });
      participantId = newParticipant.id;
    }

    const incomingMediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl : undefined;
    const persistedMediaUrl = await persistMediaUrlIfNeeded(
      incomingMediaUrl,
      conversationId,
      typeof body.fileName === 'string' ? body.fileName : undefined,
      typeof body.fileType === 'string' ? body.fileType : undefined
    );

    const createdMessage = await db.chatMessage.create({
      data: {
        conversationId,
        senderId: body.senderId,
        participantId,
        content: toStoredMessageContent({
          type: body.type,
          content: body.content,
          mediaUrl: persistedMediaUrl,
          fileName: typeof body.fileName === 'string' ? body.fileName : undefined,
          fileSize: typeof body.fileSize === 'number' ? body.fileSize : undefined,
          fileType: typeof body.fileType === 'string' ? body.fileType : undefined,
          duration: typeof body.duration === 'number' ? body.duration : undefined,
          replyToId: typeof body.replyToId === 'string' ? body.replyToId : undefined,
          isEdited: false,
          deletedForEveryone: false,
          isPinned: false,
          isImportant: false,
          deletedForUserIds: [],
        }),
        status: body.status || 'sent',
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
        type: 'new-message',
        conversationId,
        message: mapMessage(createdMessage),
      }
    );

    return NextResponse.json({ success: true, message: mapMessage(createdMessage) });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la création du message' }, { status: 500 });
  }
}
