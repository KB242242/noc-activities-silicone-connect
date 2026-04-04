/* Service de gestion des appels vidéo */

import { VideoCall, CallParticipant, CallStatus } from '@/types/videoCall';
import { videoCallEventPublishers } from '@/lib/videoCallRealtime';

export class CallManagementService {
  /**
   * Ajouter un participant à un appel actif
   */
  static addParticipantToCall(
    call: VideoCall,
    participant: CallParticipant
  ): VideoCall {
    return {
      ...call,
      participants: [...call.participants, participant],
      updatedAt: Date.now(),
    };
  }

  /**
   * Retirer un participant d'un appel
   */
  static removeParticipantFromCall(
    call: VideoCall,
    userId: string
  ): VideoCall {
    return {
      ...call,
      participants: call.participants.filter((p) => p.userId !== userId),
      updatedAt: Date.now(),
    };
  }

  /**
   * Expulser un participant (par l'initiateur)
   */
  static removeParticipant(
    call: VideoCall,
    participantId: string,
    initiatorId: string
  ): VideoCall {
    // Vérifier que l'initiateur est bien le créateur de l'appel
    if (call.initiatorId !== initiatorId) {
      throw new Error('Seul l\'initiateur peut expulser des participants');
    }

    videoCallEventPublishers.participantRemoved(
      call.id,
      call.conversationId,
      participantId,
      initiatorId
    );

    return this.removeParticipantFromCall(call, participantId);
  }

  /**
   * Mettre en sourdine un participant (par l'initiateur)
   */
  static muteParticipant(
    call: VideoCall,
    participantId: string,
    initiatorId: string
  ): VideoCall {
    // Vérifier que l'initiateur est bien le créateur de l'appel
    if (call.initiatorId !== initiatorId) {
      throw new Error('Seul l\'initiateur peut mettre en sourdine');
    }

    videoCallEventPublishers.participantMuted(
      call.id,
      call.conversationId,
      participantId,
      initiatorId
    );

    return {
      ...call,
      participants: call.participants.map((p) =>
        p.userId === participantId ? { ...p, isMuted: true } : p
      ),
      updatedAt: Date.now(),
    };
  }

  /**
   * Désactiver la sourdine d'un participant
   */
  static unmuteParticipant(
    call: VideoCall,
    participantId: string,
    initiatorId: string
  ): VideoCall {
    // Vérifier que l'initiateur est bien le créateur de l'appel
    if (call.initiatorId !== initiatorId) {
      throw new Error('Seul l\'initiateur peut désactiver la sourdine');
    }

    videoCallEventPublishers.participantUnmuted(
      call.id,
      call.conversationId,
      participantId,
      initiatorId
    );

    return {
      ...call,
      participants: call.participants.map((p) =>
        p.userId === participantId ? { ...p, isMuted: false } : p
      ),
      updatedAt: Date.now(),
    };
  }

  /**
   * Mettre à jour le statut de connexion d'un participant
   */
  static updateParticipantConnectionState(
    call: VideoCall,
    participantId: string,
    connectionState: RTCPeerConnectionState
  ): VideoCall {
    const normalizedState: CallParticipant['connectionState'] =
      connectionState === 'closed' ? 'disconnected' : connectionState;

    return {
      ...call,
      participants: call.participants.map((p) =>
        p.userId === participantId
          ? { ...p, connectionState: normalizedState }
          : p
      ),
      updatedAt: Date.now(),
    };
  }

  /**
   * Définir le participant qui parle actuellement
   */
  static setActiveSpeaker(
    call: VideoCall,
    speakerId: string
  ): VideoCall {
    return {
      ...call,
      participants: call.participants.map((p) => ({
        ...p,
        isSpeaking: p.userId === speakerId,
      })),
      updatedAt: Date.now(),
    };
  }

  /**
   * Détecter automatiquement qui parle basé sur le niveau audio
   */
  static detectActiveSpeakerByAudioLevel(
    call: VideoCall,
    audioLevels: Map<string, number>
  ): string | null {
    let highestSpeaker: string | null = null;
    let highestLevel = 0;

    audioLevels.forEach((level, userId) => {
      if (level > highestLevel) {
        highestLevel = level;
        highestSpeaker = userId;
      }
    });

    return highestSpeaker;
  }

  /**
   * Mettre à jour le statut de l'appel
   */
  static updateCallStatus(
    call: VideoCall,
    status: CallStatus
  ): VideoCall {
    return {
      ...call,
      status,
      updatedAt: Date.now(),
    };
  }

  /**
   * Calculer la durée de l'appel
   */
  static getCallDuration(call: VideoCall): number {
    if (call.endTime) {
      return Math.floor((call.endTime - call.startTime) / 1000);
    }
    return Math.floor((Date.now() - call.startTime) / 1000);
  }

  /**
   * Formater la durée de l'appel
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Obtenir les statistiques de l'appel
   */
  static getCallStats(call: VideoCall) {
    return {
      totalParticipants: call.participants.length,
      connectedParticipants: call.participants.filter(
        (p) => p.connectionState === 'connected'
      ).length,
      duration: this.getCallDuration(call),
      durationFormatted: this.formatDuration(this.getCallDuration(call)),
      activeSpeakers: call.participants.filter((p) => p.isSpeaking).length,
      screenSharing: call.participants.filter((p) => p.isScreenSharing).length,
      handsRaised: call.participants.filter((p) => p.handRaised === 'raised').length,
    };
  }

  /**
   * Valider si un participant peut effectuer une action
   */
  static validateParticipantPermission(
    call: VideoCall,
    participantId: string,
    action: 'mute' | 'remove' | 'screen-share'
  ): boolean {
    const participant = call.participants.find((p) => p.userId === participantId);
    if (!participant) return false;

    switch (action) {
      case 'mute':
      case 'remove':
        // Seulement l'initiateur peut faire ça
        return false;
      case 'screen-share':
        // Les participants peuvent partager l'écran
        return true;
      default:
        return false;
    }
  }

  /**
   * Exporter les données d'appel pour l'historique
   */
  static exportCallData(call: VideoCall) {
    return {
      id: call.id,
      conversationId: call.conversationId,
      initiatorId: call.initiatorId,
      callType: call.callType,
      status: call.status,
      startTime: new Date(call.startTime).toISOString(),
      endTime: call.endTime ? new Date(call.endTime).toISOString() : null,
      duration: this.getCallDuration(call),
      participantCount: call.participants.length,
      participants: call.participants.map((p) => ({
        userId: p.userId,
        name: p.name,
        role: p.role,
        connectionState: p.connectionState,
        wasScreenSharing: p.isScreenSharing,
      })),
    };
  }
}

export default CallManagementService;
