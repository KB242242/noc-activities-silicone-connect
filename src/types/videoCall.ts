/* Types pour système d'appel vidéo professionnel */

export type CallStatus = 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
export type CallType = 'audio' | 'video' | 'screen-share';
export type ParticipantRole = 'initiator' | 'participant';
export type HandState = 'down' | 'raised';
export type ScreenShareState = 'inactive' | 'active';

/* ========== Participant et Appel ========== */
export interface CallParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: ParticipantRole;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  handRaised: HandState;
  isMuted: boolean; // Muted by initiator
  isSpeaking: boolean;
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  joinedAt: number;
  videoTrackId?: string;
  audioTrackId?: string;
  screenShareTrackId?: string;
}

export interface VideoCall {
  id: string;
  conversationId: string;
  initiatorId: string;
  callType: CallType;
  status: CallStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  participants: CallParticipant[];
  isRecording?: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  conversationId: string;
  organizerId: string;
  participantIds: string[];
  scheduledStartTime: number;
  scheduledEndTime: number;
  callType: CallType;
  meetingLink?: string;
  maxParticipants?: number;
  allowScreenShare: boolean;
  allowRecording: boolean;
  reminderSentAt?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/* ========== Real-time Events ========== */
export type VideoCallEventType =
  | 'call-initiated'
  | 'call-ringing'
  | 'call-accepted'
  | 'call-declined'
  | 'call-ended'
  | 'participant-joined'
  | 'participant-left'
  | 'participant-removed'
  | 'audio-toggle'
  | 'video-toggle'
  | 'hand-raised'
  | 'hand-lowered'
  | 'screen-share-started'
  | 'screen-share-stopped'
  | 'reaction-added'
  | 'mute-participant'
  | 'unmute-participant'
  | 'speaker-detected'
  | 'note-added'
  | 'webrtc-signal';

export interface VideoCallEvent {
  type: VideoCallEventType;
  callId: string;
  conversationId: string;
  participantId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/* ========== WebRTC Signal ========== */
export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  callId: string;
  signal: Record<string, unknown>;
  timestamp: number;
}

/* ========== Réactions ========== */
export interface Reaction {
  id: string;
  type: 'thumbs-up' | 'thumbs-down' | 'clapping' | 'laughing' | 'surprised' | 'thinking' | 'heart';
  userId: string;
  callId: string;
  createdAt: number;
  expiresAt: number; // TTL - réaction temporaire
}

/* ========== Commentaire en direct ========== */
export interface LiveComment {
  id: string;
  callId: string;
  userId: string;
  content: string;
  createdAt: number;
  isVisible: boolean; // Only visible during call
}

/* ========== Notes d'appel ========== */
export interface CallNote {
  id: string;
  callId: string;
  userId: string;
  content: string;
  timestamp: number;
  createdAt: number;
  updatedAt: number;
}

/* ========== Historique d'appel ========== */
export interface CallHistory {
  id: string;
  callId: string;
  conversationId: string;
  participantIds: string[];
  callType: CallType;
  startTime: number;
  endTime: number;
  duration: number;
  recordingUrl?: string;
  notes?: string;
  createdAt: number;
}

/* ========== Configuration de l'appel ========== */
export interface CallSettings {
  maxParticipants: number;
  allowScreenShare: boolean;
  allowRecording: boolean;
  allowHandRaise: boolean;
  allowReactions: boolean;
  enableSpeakerDetection: boolean;
  enableNoise?: boolean;
  iceServers?: RTCIceServer[];
}

/* ========== Statistiques d'appel ========== */
export interface CallStats {
  callId: string;
  videoBitrate: number;
  audioBitrate: number;
  videoFrameRate: number;
  audioLevel: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  timestamp: number;
}

/* ========== État local de l'appel ========== */
export interface CallLocalState {
  callId: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  selectedCamera?: string;
  selectedMicrophone?: string;
  selectedSpeaker?: string;
  volume: number;
  micLevel: number;
}
