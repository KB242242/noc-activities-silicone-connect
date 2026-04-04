/* Service Real-time pour événements d'appel vidéo */

import { VideoCallEvent } from '@/types/videoCall';

type VideoCallListener = (event: VideoCallEvent) => void;

interface VideoCallListeners {
  [callId: string]: Set<VideoCallListener>;
}

const listenersByCallId: VideoCallListeners = {};

/**
 * s'abonner aux événements d'un appel vidéo
 */
export function subscribeVideoCallEvents(
  callId: string,
  listener: VideoCallListener
): () => void {
  if (!listenersByCallId[callId]) {
    listenersByCallId[callId] = new Set();
  }

  listenersByCallId[callId].add(listener);

  // Return unsubscribe function
  return () => {
    const listeners = listenersByCallId[callId];
    if (!listeners) return;

    listeners.delete(listener);
    if (listeners.size === 0) {
      delete listenersByCallId[callId];
    }
  };
}

/**
 * Publier un événement d'appel vidéo
 */
export function publishVideoCallEvent(event: VideoCallEvent): void {
  const listeners = listenersByCallId[event.callId];
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('Erreur listener événement appel vidéo:', error);
    }
  });
}

/**
 * Publier un événement à des utilisateurs spécifiques
 */
export function publishVideoCallEventToUsers(
  callId: string,
  userIds: string[],
  event: VideoCallEvent
): void {
  // For now, publish to all listeners on that call
  // In a real implementation, you'd filter by user
  publishVideoCallEvent(event);
}

/**
 * Obtenir les listeners actifs pour un appel
 */
export function getActiveListenersCount(callId: string): number {
  return listenersByCallId[callId]?.size || 0;
}

/**
 * Nettoyer tous les listeners pour un appel
 */
export function clearCallListeners(callId: string): void {
  delete listenersByCallId[callId];
}

/**
 * Nettoyer tous les listeners
 */
export function clearAllCallListeners(): void {
  Object.keys(listenersByCallId).forEach((key) => {
    delete listenersByCallId[key];
  });
}

/**
 * Helper pour publier les événements courants
 */
export const videoCallEventPublishers = {
  callInitiated: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'call-initiated',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  callRinging: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'call-ringing',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  callAccepted: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'call-accepted',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  callDeclined: (callId: string, conversationId: string, participantId: string, reason?: string) => {
    publishVideoCallEvent({
      type: 'call-declined',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { reason }
    });
  },

  callEnded: (callId: string, conversationId: string, participantId: string, duration?: number) => {
    publishVideoCallEvent({
      type: 'call-ended',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { duration }
    });
  },

  participantJoined: (callId: string, conversationId: string, participantId: string, participantName?: string) => {
    publishVideoCallEvent({
      type: 'participant-joined',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { participantName }
    });
  },

  participantLeft: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'participant-left',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  participantRemoved: (callId: string, conversationId: string, participantId: string, removedBy?: string) => {
    publishVideoCallEvent({
      type: 'participant-removed',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { removedBy }
    });
  },

  audioToggled: (callId: string, conversationId: string, participantId: string, enabled: boolean) => {
    publishVideoCallEvent({
      type: 'audio-toggle',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { enabled }
    });
  },

  videoToggled: (callId: string, conversationId: string, participantId: string, enabled: boolean) => {
    publishVideoCallEvent({
      type: 'video-toggle',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { enabled }
    });
  },

  handRaised: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'hand-raised',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  handLowered: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'hand-lowered',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  screenShareStarted: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'screen-share-started',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  screenShareStopped: (callId: string, conversationId: string, participantId: string) => {
    publishVideoCallEvent({
      type: 'screen-share-stopped',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now()
    });
  },

  reactionAdded: (callId: string, conversationId: string, participantId: string, reactionType: string) => {
    publishVideoCallEvent({
      type: 'reaction-added',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { reactionType }
    });
  },

  participantMuted: (callId: string, conversationId: string, participantId: string, mutedBy: string) => {
    publishVideoCallEvent({
      type: 'mute-participant',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { mutedBy }
    });
  },

  participantUnmuted: (callId: string, conversationId: string, participantId: string, unmutedBy: string) => {
    publishVideoCallEvent({
      type: 'unmute-participant',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { unmutedBy }
    });
  },

  speakerDetected: (callId: string, conversationId: string, participantId: string, speakerUserId: string) => {
    publishVideoCallEvent({
      type: 'speaker-detected',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { speakerUserId }
    });
  },

  noteAdded: (callId: string, conversationId: string, participantId: string, noteContent: string) => {
    publishVideoCallEvent({
      type: 'note-added',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { noteContent }
    });
  },

  webrtcSignal: (callId: string, conversationId: string, participantId: string, signal: Record<string, unknown>) => {
    publishVideoCallEvent({
      type: 'webrtc-signal',
      callId,
      conversationId,
      participantId,
      timestamp: Date.now(),
      data: { signal }
    });
  }
};
