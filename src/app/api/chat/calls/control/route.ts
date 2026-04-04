/* API pour les contrôles d'appel par l'initiateur */
import { NextRequest, NextResponse } from 'next/server';
import { videoCallEventPublishers } from '@/lib/videoCallRealtime';

export async function POST(request: NextRequest) {
  try {
    const {
      callId,
      conversationId,
      initiatorId,
      action,
      targetParticipantId,
    } = await request.json();

    if (!callId || !conversationId || !initiatorId || !action) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mute': {
        if (!targetParticipantId) {
          return NextResponse.json(
            { error: 'targetParticipantId requis' },
            { status: 400 }
          );
        }

        videoCallEventPublishers.participantMuted(
          callId,
          conversationId,
          targetParticipantId,
          initiatorId
        );

        return NextResponse.json({
          success: true,
          action: 'muted',
          participant: targetParticipantId,
        });
      }

      case 'unmute': {
        if (!targetParticipantId) {
          return NextResponse.json(
            { error: 'targetParticipantId requis' },
            { status: 400 }
          );
        }

        videoCallEventPublishers.participantUnmuted(
          callId,
          conversationId,
          targetParticipantId,
          initiatorId
        );

        return NextResponse.json({
          success: true,
          action: 'unmuted',
          participant: targetParticipantId,
        });
      }

      case 'remove': {
        if (!targetParticipantId) {
          return NextResponse.json(
            { error: 'targetParticipantId requis' },
            { status: 400 }
          );
        }

        videoCallEventPublishers.participantRemoved(
          callId,
          conversationId,
          targetParticipantId,
          initiatorId
        );

        return NextResponse.json({
          success: true,
          action: 'removed',
          participant: targetParticipantId,
        });
      }

      case 'end-call': {
        videoCallEventPublishers.callEnded(
          callId,
          conversationId,
          initiatorId
        );

        return NextResponse.json({
          success: true,
          action: 'call-ended',
        });
      }

      default: {
        return NextResponse.json(
          { error: `Action inconnue: ${action}` },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Erreur contrôle appel:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
