/* API pour initier un appel vidéo */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { videoCallEventPublishers } from '@/lib/videoCallRealtime';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, callType = 'video', initiatorId } = await request.json();

    if (!conversationId || !initiatorId) {
      return NextResponse.json(
        { error: 'conversationId et initiatorId requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'initiateur est participant de la conversation
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: initiatorId,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Utilisateur non participant de la conversation' },
        { status: 403 }
      );
    }

    // Obtenir les participants de la conversation
    const participants = await db.conversationParticipant.findMany({
      where: { conversationId },
      include: { user: true },
    });

    // Créer l'appel
    const callId = uuidv4();

    const callData = {
      id: callId,
      conversationId,
      initiatorId,
      callType,
      status: 'pending' as const,
      startTime: Date.now(),
      participants: participants
        .map((p) => ({
          userId: p.userId,
          name: p.user.name,
          avatar: p.user.avatar,
          role: p.userId === initiatorId ? ('initiator' as const) : ('participant' as const),
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
          handRaised: 'down' as const,
          isMuted: false,
          isSpeaking: false,
          connectionState: 'new' as const,
          joinedAt: Date.now(),
        }))
        .map((p: any) => ({
          userId: p.userId,
          name: p.name,
          avatar: p.avatar || undefined,
          role: p.role,
          isAudioEnabled: p.isAudioEnabled,
          isVideoEnabled: p.isVideoEnabled,
          isScreenSharing: p.isScreenSharing,
          handRaised: p.handRaised,
          isMuted: p.isMuted,
          isSpeaking: p.isSpeaking,
          connectionState: p.connectionState,
          joinedAt: p.joinedAt,
        })) as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Publier l'événement d'appel initié
    videoCallEventPublishers.callInitiated(
      callId,
      conversationId,
      initiatorId
    );

    return NextResponse.json({
      success: true,
      call: callData,
    });
  } catch (error) {
    console.error('Erreur initiation appel:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
