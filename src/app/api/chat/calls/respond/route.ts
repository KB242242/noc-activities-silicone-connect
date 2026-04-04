/* API pour répondre à un appel vidéo */
import { NextRequest, NextResponse } from 'next/server';
import { videoCallEventPublishers } from '@/lib/videoCallRealtime';

export async function POST(request: NextRequest) {
  try {
    const { callId, conversationId, userId, accept = true } = await request.json();

    if (!callId || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'callId, conversationId et userId requis' },
        { status: 400 }
      );
    }

    if (accept) {
      // Publier l'événement d'acceptation
      videoCallEventPublishers.callAccepted(
        callId,
        conversationId,
        userId
      );

      return NextResponse.json({
        success: true,
        status: 'accepted',
      });
    } else {
      // Publier l'événement de refus
      videoCallEventPublishers.callDeclined(
        callId,
        conversationId,
        userId,
        'Appel refusé'
      );

      return NextResponse.json({
        success: true,
        status: 'declined',
      });
    }
  } catch (error) {
    console.error('Erreur réponse appel:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
