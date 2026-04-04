/* Service WebRTC pour gérer les connexions peer-to-peer */

import { WebRTCSignal } from '@/types/videoCall';

export interface PeerConnection {
  pc: RTCPeerConnection;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  screenShareTrack?: MediaStreamTrack;
  remoteStream?: MediaStream;
  userId: string;
}

export class WebRTCService {
  private peerConnections = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;
  private iceCandidateCallback?: (signal: WebRTCSignal) => void;
  private onRemoteStreamCallback?: (userId: string, stream: MediaStream) => void;
  private onConnectionStateChangeCallback?: (userId: string, state: RTCPeerConnectionState) => void;

  private iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    {
      urls: ['turn:turnserver.example.com:3478'],
      username: 'user',
      credential: 'pass'
    }
  ];

  constructor(iceServers?: RTCIceServer[]) {
    if (iceServers) {
      this.iceServers = iceServers;
    }
  }

  /* ========== Gestion du flux local ========== */

  async getLocalStream(
    audio: boolean = true,
    video: boolean = true
  ): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      });

      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Erreur accès caméra/micro:', error);
      throw error;
    }
  }

  async getScreenShareStream(): Promise<MediaStream> {
    if (this.screenShareStream) {
      return this.screenShareStream;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        } as MediaTrackConstraints,
        audio: false
      });

      this.screenShareStream = stream;
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.screenShareStream = null;
      });

      return stream;
    } catch (error) {
      console.error('Erreur partage écran:', error);
      throw error;
    }
  }

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  stopScreenShare(): void {
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop());
      this.screenShareStream = null;
    }
  }

  /* ========== Gestion des connexions peer ========== */

  async createPeerConnection(
    userId: string,
    initiator: boolean = false
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // Añadir pistes locales
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Événements ICE
    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate && this.iceCandidateCallback) {
        this.iceCandidateCallback({
          type: 'ice-candidate',
          from: userId,
          to: userId,
          callId: '', // Will be set by caller
          signal: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          },
          timestamp: Date.now()
        });
      }
    });

    // Événements de flux distant
    pc.addEventListener('track', (event) => {
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(userId, event.streams[0]);
      }
    });

    // Événements de changement de connexion
    pc.addEventListener('connectionstatechange', () => {
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(userId, pc.connectionState);
      }
    });

    // Événements de changement d'état ICE
    pc.addEventListener('iceconnectionstatechange', () => {
      console.log(`ICE connection state for ${userId}:`, pc.iceConnectionState);
    });

    const peerConnection: PeerConnection = { pc, userId };
    this.peerConnections.set(userId, peerConnection);

    return pc;
  }

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(userId)?.pc;
    if (!pc) throw new Error('Peer connection not found');

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });

    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(userId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(userId)?.pc;
    if (!pc) throw new Error('Peer connection not found');

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });

    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(
    userId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.peerConnections.get(userId)?.pc;
    if (!pc) throw new Error('Peer connection not found');

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
  }

  async handleAnswer(
    userId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.peerConnections.get(userId)?.pc;
    if (!pc) throw new Error('Peer connection not found');

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(
    userId: string,
    signal: Record<string, unknown>
  ): Promise<void> {
    const pc = this.peerConnections.get(userId)?.pc;
    if (!pc) return;

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: signal.candidate as string,
        sdpMLineIndex: signal.sdpMLineIndex as number,
        sdpMid: signal.sdpMid as string
      });
      await pc.addIceCandidate(iceCandidate);
    } catch (error) {
      console.error('Erreur ajout ICE candidate:', error);
    }
  }

  /* ========== Gestion des pistes média ========== */

  async toggleAudio(userId: string, enabled: boolean): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection?.pc) return;

    peerConnection.pc.getSenders()
      .filter(sender => sender.track?.kind === 'audio')
      .forEach(sender => {
        if (sender.track) {
          sender.track.enabled = enabled;
        }
      });
  }

  async toggleVideo(userId: string, enabled: boolean): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection?.pc) return;

    peerConnection.pc.getSenders()
      .filter(sender => sender.track?.kind === 'video')
      .forEach(sender => {
        if (sender.track) {
          sender.track.enabled = enabled;
        }
      });
  }

  async addScreenShare(userId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection?.pc) return;

    try {
      const screenStream = await this.getScreenShareStream();
      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        throw new Error('No screen share track');
      }

      const sender = peerConnection.pc.getSenders()
        .find(sender => sender.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
        peerConnection.screenShareTrack = screenTrack;
      } else {
        peerConnection.pc.addTrack(screenTrack);
      }
    } catch (error) {
      console.error('Erreur partage écran:', error);
      throw error;
    }
  }

  async removeScreenShare(userId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection?.pc || !this.localStream) return;

    const localVideoTrack = this.localStream.getVideoTracks()[0];
    const sender = peerConnection.pc.getSenders()
      .find(sender => sender.track?.kind === 'video');

    if (sender && localVideoTrack) {
      await sender.replaceTrack(localVideoTrack);
    }

    this.stopScreenShare();
  }

  /* ========== Gestion des statistiques ========== */

  async getConnectionStats(userId: string): Promise<any> {
    const peerConnection = this.peerConnections.get(userId)?.pc;
    if (!peerConnection) return null;

    const stats = await peerConnection.getStats();
    const result: any = {
      videoBitrate: 0,
      audioBitrate: 0,
      videoFrameRate: 0,
      audioLevel: 0,
      roundTripTime: 0
    };

    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        if (report.mediaType === 'video') {
          const videoBitrate = report.bytesReceived;
          result.videoBitrate = videoBitrate;
          result.videoFrameRate = report.framesDecoded;
        } else if (report.mediaType === 'audio') {
          const audioBitrate = report.bytesReceived;
          result.audioBitrate = audioBitrate;
          result.audioLevel = report.audioLevel || 0;
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.roundTripTime = report.currentRoundTripTime || 0;
        result.packetsLost = report.packetsLost || 0;
        result.jitter = report.jitter || 0;
      }
    });

    return result;
  }

  /* ========== Fermeture des connexions ========== */

  closePeerConnection(userId: string): void {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) return;

    peerConnection.pc.close();
    this.peerConnections.delete(userId);
  }

  closeAllConnections(): void {
    this.peerConnections.forEach((pc) => {
      pc.pc.close();
    });
    this.peerConnections.clear();
    this.stopLocalStream();
    this.stopScreenShare();
  }

  /* ========== Callbacks ========== */

  onIceCandidate(callback: (signal: WebRTCSignal) => void): void {
    this.iceCandidateCallback = callback;
  }

  onRemoteStream(callback: (userId: string, stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onConnectionStateChange(
    callback: (userId: string, state: RTCPeerConnectionState) => void
  ): void {
    this.onConnectionStateChangeCallback = callback;
  }

  /* ========== Getters ========== */

  getPeerConnection(userId: string): RTCPeerConnection | null {
    return this.peerConnections.get(userId)?.pc || null;
  }

  getAllPeerConnections(): Map<string, RTCPeerConnection> {
    const result = new Map<string, RTCPeerConnection>();
    this.peerConnections.forEach((pc, userId) => {
      result.set(userId, pc.pc);
    });
    return result;
  }

  getCurrentLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getLocalAudioEnabled(): boolean {
    return this.localStream?.getAudioTracks()[0]?.enabled ?? false;
  }

  getLocalVideoEnabled(): boolean {
    return this.localStream?.getVideoTracks()[0]?.enabled ?? false;
  }

  setLocalAudioEnabled(enabled: boolean): void {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
    }
  }

  setLocalVideoEnabled(enabled: boolean): void {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  }
}

export const createWebRTCService = (iceServers?: RTCIceServer[]): WebRTCService => {
  return new WebRTCService(iceServers);
};
