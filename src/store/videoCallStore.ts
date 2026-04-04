/* Store Zustand pour la gestion complète des appels vidéo */

import { create } from 'zustand';
import {
  VideoCall,
  CallParticipant,
  CallLocalState,
  Reaction,
  LiveComment,
  CallNote,
  CallStatus,
  CallType,
  HandState
} from '@/types/videoCall';

interface VideoCallStoreState {
  // État actuel de l'appel
  activeCall: VideoCall | null;
  localState: CallLocalState | null;
  participants: Map<string, CallParticipant>;
  callDuration: number;

  // Réactions et commentaires (temporaire)
  reactions: Reaction[];
  liveComments: LiveComment[];
  callNotes: CallNote[];

  // Statistiques
  activeSpeakerId: string | null;
  isSpeakingEnable: boolean;

  // Actions pour l'appel
  startCall: (call: VideoCall) => void;
  endCall: () => void;
  updateCallStatus: (status: CallStatus) => void;

  // Gestion des participants
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => void;
  getParticipant: (userId: string) => CallParticipant | undefined;
  getAllParticipants: () => CallParticipant[];

  // État local
  updateLocalState: (updates: Partial<CallLocalState>) => void;
  toggleLocalAudio: () => void;
  toggleLocalVideo: () => void;
  toggleLocalScreenShare: () => void;
  toggleHandRaised: () => void;

  // Durée d'appel
  incrementDuration: () => void;
  resetDuration: () => void;

  // Réactions
  addReaction: (reaction: Reaction) => void;
  removeReaction: (reactionId: string) => void;
  clearExpiredReactions: () => void;

  // Commentaires
  addLiveComment: (comment: LiveComment) => void;
  removeLiveComment: (commentId: string) => void;
  toggleCommentVisibility: (commentId: string) => void;

  // Notes
  addCallNote: (note: CallNote) => void;
  updateCallNote: (noteId: string, content: string) => void;
  deleteCallNote: (noteId: string) => void;

  // Détection du locuteur
  setActiveSpeaker: (userId: string | null) => void;
  setSpeakingEnabled: (enabled: boolean) => void;

  // Nettoyage
  cleanup: () => void;
}

export const useVideoCallStore = create<VideoCallStoreState>((set) => ({
  activeCall: null,
  localState: null,
  participants: new Map(),
  callDuration: 0,
  reactions: [],
  liveComments: [],
  callNotes: [],
  activeSpeakerId: null,
  isSpeakingEnable: false,

  /* ========== Appel ========== */
  startCall: (call) => {
    set({
      activeCall: call,
      callDuration: 0,
      reactions: [],
      liveComments: [],
      callNotes: [],
      participants: new Map()
    });
  },

  endCall: () => {
    set({
      activeCall: null,
      localState: null,
      participants: new Map(),
      reactions: [],
      liveComments: [],
      callNotes: [],
      callDuration: 0
    });
  },

  updateCallStatus: (status) => {
    set((state) => {
      if (!state.activeCall) return state;
      return {
        activeCall: {
          ...state.activeCall,
          status,
          updatedAt: Date.now()
        }
      };
    });
  },

  /* ========== Participants ========== */
  addParticipant: (participant) => {
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.userId, participant);
      return { participants: newParticipants };
    });
  },

  removeParticipant: (userId) => {
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(userId);
      return { participants: newParticipants };
    });
  },

  updateParticipant: (userId, updates) => {
    set((state) => {
      const participant = state.participants.get(userId);
      if (!participant) return state;

      const newParticipants = new Map(state.participants);
      newParticipants.set(userId, { ...participant, ...updates });
      return { participants: newParticipants };
    });
  },

  getParticipant: (userId) => {
    const state = useVideoCallStore.getState();
    return state.participants.get(userId);
  },

  getAllParticipants: () => {
    const state = useVideoCallStore.getState();
    return Array.from(state.participants.values());
  },

  /* ========== État Local ========== */
  updateLocalState: (updates) => {
    set((state) => {
      if (!state.localState) return state;
      return {
        localState: { ...state.localState, ...updates }
      };
    });
  },

  toggleLocalAudio: () => {
    set((state) => {
      if (!state.localState) return state;
      return {
        localState: {
          ...state.localState,
          isAudioEnabled: !state.localState.isAudioEnabled
        }
      };
    });
  },

  toggleLocalVideo: () => {
    set((state) => {
      if (!state.localState) return state;
      return {
        localState: {
          ...state.localState,
          isVideoEnabled: !state.localState.isVideoEnabled
        }
      };
    });
  },

  toggleLocalScreenShare: () => {
    set((state) => {
      if (!state.localState) return state;
      return {
        localState: {
          ...state.localState,
          isScreenSharing: !state.localState.isScreenSharing
        }
      };
    });
  },

  toggleHandRaised: () => {
    set((state) => {
      if (!state.localState) return state;
      return {
        localState: {
          ...state.localState,
          handRaised: !state.localState.handRaised
        }
      };
    });
  },

  /* ========== Durée ========== */
  incrementDuration: () => {
    set((state) => ({
      callDuration: state.callDuration + 1
    }));
  },

  resetDuration: () => {
    set({ callDuration: 0 });
  },

  /* ========== Réactions ========== */
  addReaction: (reaction) => {
    set((state) => {
      const newReactions = [...state.reactions, reaction];
      // Auto-cleanup après expiration
      setTimeout(() => {
        useVideoCallStore.getState().removeReaction(reaction.id);
      }, reaction.expiresAt - Date.now());
      return { reactions: newReactions };
    });
  },

  removeReaction: (reactionId) => {
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== reactionId)
    }));
  },

  clearExpiredReactions: () => {
    set((state) => ({
      reactions: state.reactions.filter((r) => r.expiresAt > Date.now())
    }));
  },

  /* ========== Commentaires ========== */
  addLiveComment: (comment) => {
    set((state) => ({
      liveComments: [...state.liveComments, comment]
    }));
  },

  removeLiveComment: (commentId) => {
    set((state) => ({
      liveComments: state.liveComments.filter((c) => c.id !== commentId)
    }));
  },

  toggleCommentVisibility: (commentId) => {
    set((state) => ({
      liveComments: state.liveComments.map((c) =>
        c.id === commentId ? { ...c, isVisible: !c.isVisible } : c
      )
    }));
  },

  /* ========== Notes ========== */
  addCallNote: (note) => {
    set((state) => ({
      callNotes: [...state.callNotes, note]
    }));
  },

  updateCallNote: (noteId, content) => {
    set((state) => ({
      callNotes: state.callNotes.map((n) =>
        n.id === noteId
          ? { ...n, content, updatedAt: Date.now() }
          : n
      )
    }));
  },

  deleteCallNote: (noteId) => {
    set((state) => ({
      callNotes: state.callNotes.filter((n) => n.id !== noteId)
    }));
  },

  /* ========== Détection du locuteur ========== */
  setActiveSpeaker: (userId) => {
    set({ activeSpeakerId: userId });
  },

  setSpeakingEnabled: (enabled) => {
    set({ isSpeakingEnable: enabled });
  },

  /* ========== Nettoyage ========== */
  cleanup: () => {
    set({
      activeCall: null,
      localState: null,
      participants: new Map(),
      callDuration: 0,
      reactions: [],
      liveComments: [],
      callNotes: [],
      activeSpeakerId: null,
      isSpeakingEnable: false
    });
  }
}));

export default useVideoCallStore;
