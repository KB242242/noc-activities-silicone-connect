import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

function mapConversation(conversation: any, unreadCount = 0) {
  const participants = (conversation.participants || []).map((participant: any) => ({
    id: participant.user.id,
    name: participant.user.name,
    avatar: participant.user.avatar || undefined,
    role: participant.role || 'member',
    joinedAt: participant.joinedAt,
    lastReadAt: participant.lastReadAt || undefined,
  }));

  const lastMessage = conversation.messages?.[0] ? mapMessage(conversation.messages[0]) : undefined;
  const createdBy =
    conversation.participants?.find((participant: any) => participant.role === 'admin')?.userId ||
    conversation.participants?.[0]?.userId ||
    '';

  return {
    id: conversation.id,
    type: participants.length > 2 ? 'group' : 'individual',
    name: conversation.title || 'Conversation',
    description: '',
    avatar: undefined,
    createdBy,
    participants,
    messages: lastMessage ? [lastMessage] : [],
    lastMessage,
    unreadCount,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    const conversationList = await db.conversation.findMany({
      where: userId
        ? {
            participants: {
              some: {
                userId,
              },
            },
          }
        : undefined,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const mapped = await Promise.all(
      conversationList.map(async (conversation) => {
        let normalizedConversation = conversation;

        if (userId && conversation.messages?.length > 0) {
          const visibleMessage = conversation.messages.find((message: any) => {
            const payload = parseStoredMessageContent(message.content);
            return !payload.deletedForUserIds.includes(userId);
          });

          normalizedConversation = {
            ...conversation,
            messages: visibleMessage ? [visibleMessage] : [],
          };
        }

        if (!userId) {
          return mapConversation(normalizedConversation, 0);
        }

        const currentParticipant = conversation.participants.find((participant) => participant.userId === userId);
        const unreadCount = await db.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            sentAt: currentParticipant?.lastReadAt
              ? {
                  gt: currentParticipant.lastReadAt,
                }
              : undefined,
          },
        });

        return mapConversation(normalizedConversation, unreadCount);
      })
    );

    return NextResponse.json(
      {
        success: true,
        conversations: mapped,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la récupération des conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, description, avatar, createdBy, participantIds } = body;

    if (!type || !createdBy || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Données de conversation manquantes' }, { status: 400 });
    }

    const uniqueParticipantIds = Array.from(new Set([createdBy, ...participantIds]));

    const existingUsersCount = await db.user.count({
      where: {
        id: {
          in: uniqueParticipantIds,
        },
      },
    });

    if (existingUsersCount !== uniqueParticipantIds.length) {
      return NextResponse.json({ success: false, error: 'Un ou plusieurs participants sont invalides' }, { status: 400 });
    }

    const conversation = await db.conversation.create({
      data: {
        title: name || 'Conversation',
        participants: {
          create: uniqueParticipantIds.map((userId) => ({
            userId,
            role: userId === createdBy ? 'admin' : 'member',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        ...mapConversation(conversation),
        type: type || (uniqueParticipantIds.length > 2 ? 'group' : 'individual'),
        description: description || '',
        avatar,
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la création de la conversation' }, { status: 500 });
  }
}
