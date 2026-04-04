/* Exemple complet d'intégration du système d'appel vidéo */
'use client';

import React, { useState, useEffect } from 'react';
import { VideoCall } from '@/types/videoCall';
import useVideoCallStore from '@/store/videoCallStore';
import { useAuthStore } from '@/store/authStore';
import {
  VideoCallWindow,
  ScheduleMeetingDialog,
  LiveInteractionsPanel,
  ParticipantsList,
} from '@/components/videocall';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Calendar, Clock, Users } from 'lucide-react';

interface ConversationWithCallsProps {
  conversationId: string;
}

/**
 * Exemple complet d'utilisation du système d'appel vidéo
 * Ce composant montre comment:
 * - Initier un appel
 * - Planifier une réunion
 * - Afficher l'interface d'appel
 * - Gérer les participants
 */
export default function ConversationWithCalls({
  conversationId,
}: ConversationWithCallsProps) {
  const authUser = useAuthStore((state) => state.user);
  const {
    activeCall,
    participants,
    reactions,
    liveComments,
    callNotes,
    startCall,
    endCall,
    addParticipant,
    removeParticipant,
  } = useVideoCallStore();

  const [isCallActive, setIsCallActive] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les réunions plannees
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch(
          `/api/chat/meetings?conversationId=${conversationId}`
        );
        const { meetings } = await response.json();
        setScheduledMeetings(meetings);
      } catch (err) {
        console.error('Erreur chargement réunions:', err);
      }
    };

    fetchMeetings();
  }, [conversationId]);

  /**
   * Initier un appel vidéo
   */
  const handleInitiateCall = async () => {
    if (!authUser) {
      setError('Utilisateur non authentifié');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          callType: 'video',
          initiatorId: authUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur initiation appel');
      }

      const { call } = await response.json();

      // Initialiser le store avec l'appel
      startCall(call);
      setIsCallActive(true);

      // Ajouter l'utilisateur actuel comme participant
      addParticipant({
        userId: authUser.id,
        name: authUser.name,
        avatar: authUser.avatar || undefined,
        role: 'initiator',
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        handRaised: 'down',
        isMuted: false,
        isSpeaking: false,
        connectionState: 'connecting',
        joinedAt: Date.now(),
      });
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de l\'initiation de l\'appel');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Terminer l'appel
   */
  const handleEndCall = async () => {
    if (!activeCall || !authUser) return;

    try {
      // Enregistrer dans l'historique
      await fetch('/api/chat/calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          callType: 'video',
          startTime: activeCall.startTime,
          endTime: Date.now(),
          participantIds: activeCall.participants.map((p) => p.userId),
          notes: callNotes.map((n) => n.content).join('\n'),
        }),
      });

      endCall();
      setIsCallActive(false);
    } catch (err) {
      console.error('Erreur fin d\'appel:', err);
    }
  };

  /**
   * Planifier une réunion
   */
  const handleScheduleMeeting = async (meetingData: any) => {
    if (!authUser) {
      setError('Utilisateur non authentifié');
      return;
    }

    try {
      const response = await fetch('/api/chat/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...meetingData,
          conversationId,
          organizerId: authUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur planification');
      }

      const { meeting } = await response.json();
      setScheduledMeetings([...scheduledMeetings, meeting]);
      setIsScheduleOpen(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la planification');
    }
  };

  /**
   * Rejoindre une réunion
   */
  const handleJoinMeeting = async (meetingId: string) => {
    // Similaire à initier un appel mais liée à une réunion
    if (!authUser) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          callType: 'video',
          initiatorId: authUser.id,
          meetingId,
        }),
      });

      const { call } = await response.json();
      startCall(call);
      setIsCallActive(true);
    } catch (err) {
      console.error('Erreur rejoindre réunion:', err);
      setError('Erreur lors de la connexion à la réunion');
    } finally {
      setIsLoading(false);
    }
  };

  // Si l'appel est actif, afficher l'interface d'appel
  if (isCallActive && activeCall) {
    return (
      <div className="h-full flex bg-slate-900">
        {/* Fenêtre d'appel principale */}
        <div className="flex-1">
          <VideoCallWindow
            call={activeCall}
            onEndCall={handleEndCall}
          />
        </div>

        {/* Panneau d'interactions */}
        {showInteractions && (
          <div className="border-l border-slate-700">
            <LiveInteractionsPanel
              callId={activeCall.id}
              conversationId={conversationId}
            />
          </div>
        )}

        {/* Liste des participants */}
        {showParticipants && (
          <div className="w-72 border-l border-slate-700 bg-slate-800 p-4 overflow-y-auto">
            <h3 className="text-white font-semibold mb-4">Participants</h3>
            <ParticipantsList
              participants={activeCall.participants}
              callId={activeCall.id}
              conversationId={conversationId}
              isInitiator={activeCall.initiatorId === authUser?.id}
            />
          </div>
        )}
      </div>
    );
  }

  // Interface sans appel actif
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Onglets */}
      <Tabs defaultValue="call" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="call">Appel vidéo</TabsTrigger>
          <TabsTrigger value="meetings">Réunions planifiées</TabsTrigger>
        </TabsList>

        {/* Onglet Appel */}
        <TabsContent value="call" className="flex-1 flex flex-col p-4">
          <h2 className="text-2xl font-bold mb-6">Appel vidéo</h2>

          <div className="space-y-4">
            {/* Bouton démarrer appel */}
            <Button
              onClick={handleInitiateCall}
              disabled={isLoading}
              size="lg"
              className="w-full gap-2"
            >
              <Video size={20} />
              {isLoading ? 'Démarrage...' : 'Démarrer un appel vidéo'}
            </Button>

            {/* Bouton planifier */}
            <Button
              onClick={() => setIsScheduleOpen(true)}
              variant="outline"
              size="lg"
              className="w-full gap-2"
            >
              <Calendar size={20} />
              Planifier une réunion
            </Button>

            {/* Infos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Fonctionnalités incluses:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Vidéo et audio en temps réel</li>
                <li>✅ Contrôle des participants</li>
                <li>✅ Partage d'écran</li>
                <li>✅ Réactions et commentaires en direct</li>
                <li>✅ Prise de notes intégrée</li>
                <li>✅ Lever la main</li>
                <li>✅ Détection automatique du locuteur</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Onglet Réunions */}
        <TabsContent value="meetings" className="flex-1 flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Réunions planifiées</h2>
            <Button
              onClick={() => setIsScheduleOpen(true)}
              size="sm"
            >
              <Calendar size={16} className="mr-1" />
              Nouvelle réunion
            </Button>
          </div>

          {scheduledMeetings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune réunion planifiée
            </p>
          ) : (
            <div className="space-y-3">
              {scheduledMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{meeting.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {meeting.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(meeting.scheduledStartTime).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          {meeting.participants.length} participants
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinMeeting(meeting.id)}
                      disabled={isLoading}
                    >
                      Rejoindre
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog planification */}
      <ScheduleMeetingDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        conversationId={conversationId}
        onSchedule={handleScheduleMeeting}
      />
    </div>
  );
}
