import { NextRequest, NextResponse } from 'next/server';
import { publishChatEvent } from '@/lib/chatRealtime';
import { sendPushNotification } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const signalType = typeof body?.signalType === 'string' ? body.signalType : '';
    const fromUserId = typeof body?.fromUserId === 'string' ? body.fromUserId : '';
    const fromUserName = typeof body?.fromUserName === 'string' ? body.fromUserName : undefined;
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
    const callId = typeof body?.callId === 'string' ? body.callId : undefined;
    const toUserIds = normalizeStringArray(body?.toUserIds);

    if (!signalType || !fromUserId || toUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'signalType, fromUserId et toUserIds sont requis' },
        { status: 400 }
      );
    }

    const signal: Record<string, unknown> = {
      ...body,
      signalType,
      fromUserId,
      fromUserName,
      conversationId,
      callId,
      toUserIds,
    };

    publishChatEvent(toUserIds, {
      type: 'call-signal',
      conversationId,
      signal,
    });

    if (signalType === 'call_request' || signalType === 'call_invite') {
      const isConferenceInvite = signalType === 'call_invite' || Boolean(body?.isConferenceInvite);
      const mediaLabel = body?.callMediaType === 'video' ? 'vidéo' : 'audio';
      await sendPushNotification(toUserIds, {
        title: isConferenceInvite ? 'Invitation conférence' : 'Appel entrant',
        body: isConferenceInvite
          ? `${fromUserName || 'Un collègue'} vous invite à une conférence ${mediaLabel}`
          : `${fromUserName || 'Un collègue'} vous appelle en ${mediaLabel}`,
        tag: `call-${callId || conversationId || Date.now()}`,
        data: {
          url: '/',
          notificationType: 'call',
          conversationId,
          signalType,
          callId,
          fromUserId,
          fromUserName,
          callMediaType: body?.callMediaType === 'video' ? 'video' : 'audio',
          isConferenceInvite,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error publishing call signal:', error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'envoi du signal d'appel" },
      { status: 500 }
    );
  }
}
