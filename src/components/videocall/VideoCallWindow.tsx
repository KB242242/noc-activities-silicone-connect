/* Composant principal d'appel vidéo */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VideoCall, CallParticipant } from '@/types/videoCall';
import useVideoCallStore from '@/store/videoCallStore';
import { useAuthStore } from '@/store/authStore';
import { WebRTCService } from '@/lib/webrtc';
import {
  subscribeVideoCallEvents,
  videoCallEventPublishers
} from '@/lib/videoCallRealtime';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Share2,
  Hand,
  MoreVertical,
  MessageSquare,
  Clock,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoCallWindowProps {
  call: VideoCall;
  onEndCall: () => void;
}

export const VideoCallWindow: React.FC<VideoCallWindowProps> = ({
  call,
  onEndCall
}) => {
  const authUser = useAuthStore((state) => state.user);
  const videoCallState = useVideoCallStore();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Initialiser WebRTC
  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        webrtcServiceRef.current = new WebRTCService();
        
        // Obtenir le flux local
        const localStream = await webrtcServiceRef.current.getLocalStream(
          isAudioEnabled,
          isVideoEnabled
        );

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Mettre à jour l'état local
        videoCallState.updateLocalState({
          isAudioEnabled,
          isVideoEnabled,
          callId: call.id
        });

        // S'abonner aux événements de flux distant
        webrtcServiceRef.current.onRemoteStream((userId, stream) => {
          const videoElement = remoteVideosRef.current.get(userId);
          if (videoElement) {
            videoElement.srcObject = stream;
          }
        });

        // S'abonner aux changements de connexion
        webrtcServiceRef.current.onConnectionStateChange((userId, state) => {
          console.log(`Connexion ${userId}:`, state);
        });
      } catch (error) {
        console.error('Erreur initialisation WebRTC:', error);
      }
    };

    initializeWebRTC();

    // S'abonner aux événements en temps réel
    if (authUser) {
      unsubscribeRef.current = subscribeVideoCallEvents(call.id, (event) => {
        console.log('Événement appel reçu:', event);
        // Traiter les événements reçus
      });
    }

    // Démarrer le compteur de durée
    callDurationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
      videoCallState.incrementDuration();
    }, 1000);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
      }
    };
  }, [call.id, authUser, isAudioEnabled, isVideoEnabled]);

  const handleToggleAudio = async () => {
    if (!webrtcServiceRef.current || !authUser) return;

    setIsAudioEnabled(!isAudioEnabled);
    videoCallState.toggleLocalAudio();

    // Publier l'événement
    videoCallEventPublishers.audioToggled(
      call.id,
      call.conversationId,
      authUser.id,
      !isAudioEnabled
    );
  };

  const handleToggleVideo = async () => {
    if (!webrtcServiceRef.current || !authUser) return;

    setIsVideoEnabled(!isVideoEnabled);
    videoCallState.toggleLocalVideo();

    // Publier l'événement
    videoCallEventPublishers.videoToggled(
      call.id,
      call.conversationId,
      authUser.id,
      !isVideoEnabled
    );
  };

  const handleToggleScreenShare = async () => {
    if (!webrtcServiceRef.current || !authUser) return;

    try {
      if (!isScreenSharing) {
        await webrtcServiceRef.current.addScreenShare(authUser.id);
        setIsScreenSharing(true);
        videoCallEventPublishers.screenShareStarted(
          call.id,
          call.conversationId,
          authUser.id
        );
      } else {
        await webrtcServiceRef.current.removeScreenShare(authUser.id);
        setIsScreenSharing(false);
        videoCallEventPublishers.screenShareStopped(
          call.id,
          call.conversationId,
          authUser.id
        );
      }
    } catch (error) {
      console.error('Erreur partage écran:', error);
    }
  };

  const handleRaiseHand = () => {
    if (!authUser) return;
    
    setIsHandRaised(!isHandRaised);
    videoCallState.toggleHandRaised();

    if (!isHandRaised) {
      videoCallEventPublishers.handRaised(
        call.id,
        call.conversationId,
        authUser.id
      );
    } else {
      videoCallEventPublishers.handLowered(
        call.id,
        call.conversationId,
        authUser.id
      );
    }
  };

  const handleEndCall = async () => {
    if (!authUser) return;

    // Arrêter WebRTC
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.closeAllConnections();
    }

    // Publier événement de fin d'appel
    videoCallEventPublishers.callEnded(
      call.id,
      call.conversationId,
      authUser.id,
      callDuration
    );

    videoCallState.endCall();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-semibold">
            {call.participants.length} participant{call.participants.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span className="font-mono text-sm">{formatDuration(callDuration)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <MoreVertical size={18} />
          </Button>
        </div>
      </div>

      {/* Zone vidéo principale */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 overflow-auto">
        {/* Vidéo locale */}
        <div className="relative bg-slate-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-xs bg-slate-900 bg-opacity-70 px-2 py-1 rounded">
            {authUser?.name || 'Vous'} (local)
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <VideoOff size={48} className="text-slate-500" />
            </div>
          )}
        </div>

        {/* Vidéos distantes */}
        {call.participants.map((participant) => (
          <div
            key={participant.userId}
            className="relative bg-slate-800 rounded-lg overflow-hidden"
          >
            <video
              ref={(el) => {
                if (el) remoteVideosRef.current.set(participant.userId, el);
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs bg-slate-900 bg-opacity-70 px-2 py-1 rounded flex items-center gap-1">
              <span>{participant.name}</span>
              {!participant.isAudioEnabled && <MicOff size={12} />}
              {!participant.isVideoEnabled && <VideoOff size={12} />}
            </div>
            {participant.isScreenSharing && (
              <div className="absolute top-2 right-2 bg-blue-600 text-xs px-2 py-1 rounded">
                Partage écran
              </div>
            )}
            {participant.handRaised === 'raised' && (
              <div className="absolute top-2 left-2 bg-yellow-500 text-slate-900 text-xs px-2 py-1 rounded font-semibold">
                Main levée
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-700 bg-slate-800">
        <Button
          onClick={handleToggleAudio}
          size="lg"
          className={cn(
            'rounded-full w-14 h-14',
            isAudioEnabled
              ? 'bg-slate-700 hover:bg-slate-600'
              : 'bg-red-600 hover:bg-red-700'
          )}
          variant="ghost"
        >
          {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </Button>

        <Button
          onClick={handleToggleVideo}
          size="lg"
          className={cn(
            'rounded-full w-14 h-14',
            isVideoEnabled
              ? 'bg-slate-700 hover:bg-slate-600'
              : 'bg-red-600 hover:bg-red-700'
          )}
          variant="ghost"
        >
          {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
        </Button>

        <Button
          onClick={handleToggleScreenShare}
          size="lg"
          className={cn(
            'rounded-full w-14 h-14',
            isScreenSharing
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
          )}
          variant="ghost"
        >
          <Share2 size={24} />
        </Button>

        <Button
          onClick={handleRaiseHand}
          size="lg"
          className={cn(
            'rounded-full w-14 h-14',
            isHandRaised
              ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-900'
              : 'bg-slate-700 hover:bg-slate-600'
          )}
          variant="ghost"
        >
          <Hand size={24} />
        </Button>

        <div className="w-1 h-10 bg-slate-600 rounded-full"></div>

        <Button
          onClick={handleEndCall}
          size="lg"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          variant="ghost"
        >
          <PhoneOff size={24} />
        </Button>
      </div>
    </div>
  );
};

export default VideoCallWindow;
