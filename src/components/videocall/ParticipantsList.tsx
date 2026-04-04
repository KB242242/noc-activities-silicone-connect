/* Composant pour la gestion des participants */
'use client';

import React, { useState } from 'react';
import { CallParticipant } from '@/types/videoCall';
import { useAuthStore } from '@/store/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  VideoOff,
  Share2,
  MoreVertical,
  Hand,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParticipantsListProps {
  participants: CallParticipant[];
  callId: string;
  conversationId: string;
  isInitiator: boolean;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  callId,
  conversationId,
  isInitiator,
  onMuteParticipant,
  onRemoveParticipant,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(
    null
  );

  const handleMute = async (participantId: string) => {
    onMuteParticipant?.(participantId);

    try {
      await fetch('/api/chat/calls/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          conversationId,
          initiatorId: authUser?.id,
          action: 'mute',
          targetParticipantId: participantId,
        }),
      });
    } catch (error) {
      console.error('Erreur mute participant:', error);
    }
  };

  const handleRemove = async (participantId: string) => {
    onRemoveParticipant?.(participantId);

    try {
      await fetch('/api/chat/calls/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          conversationId,
          initiatorId: authUser?.id,
          action: 'remove',
          targetParticipantId: participantId,
        }),
      });
    } catch (error) {
      console.error('Erreur remove participant:', error);
    }
  };

  return (
    <div className="space-y-2">
      {participants.map((participant) => {
        const isMe = participant.userId === authUser?.id;

        return (
          <div
            key={participant.userId}
            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {/* Infos participant */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {participant.avatar ? (
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {participant.name}
                  {isMe && <span className="text-xs text-slate-500 ml-1">(Vous)</span>}
                  {participant.role === 'initiator' && (
                    <span className="text-xs bg-blue-100 text-blue-700 ml-1 px-2 py-0.5 rounded">
                      Initiateur
                    </span>
                  )}
                </p>

                {/* Statut de connexion */}
                <p
                  className={cn(
                    'text-xs',
                    participant.connectionState === 'connected'
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {participant.connectionState === 'connected'
                    ? 'Connecté'
                    : 'Déconnecté'}
                </p>
              </div>
            </div>

            {/* Indicateurs d'état */}
            <div className="flex items-center gap-2 ml-2">
              {!participant.isAudioEnabled && (
                <MicOff size={16} className="text-red-500" />
              )}
              {!participant.isVideoEnabled && (
                <VideoOff size={16} className="text-red-500" />
              )}
              {participant.isScreenSharing && (
                <Share2 size={16} className="text-blue-500" />
              )}
              {participant.handRaised === 'raised' && (
                <Hand size={16} className="text-yellow-500" />
              )}

              {/* Menu d'actions (seulement pour l'initiateur) */}
              {isInitiator && !isMe && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {participant.isAudioEnabled && (
                      <DropdownMenuItem
                        onClick={() => handleMute(participant.userId)}
                        className="cursor-pointer gap-2"
                      >
                        <MicOff size={14} />
                        Mettre en sourdine
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleRemove(participant.userId)}
                      className="cursor-pointer gap-2 text-red-600"
                    >
                      <LogOut size={14} />
                      Expulser
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParticipantsList;
