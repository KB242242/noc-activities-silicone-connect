import type { Dispatch, SetStateAction } from 'react';
import { Archive, Bell, BellOff, Camera, ChevronLeft, MoreVertical, Phone, Pin, Search, Settings, Users, Video } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { canManageAnnouncements } from '@/features/app-shell/constants';
import type { Conversation, TypingIndicator, UserProfile } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type OutgoingCallPayload = {
  conversationId: string;
  calleeId: string;
  calleeName: string;
  type: 'video' | 'audio';
};

type AppEmailConversationHeaderProps = {
  selectedConversation: Conversation;
  user: UserProfile | null;
  announcementAvatar: string;
  typingIndicators: TypingIndicator[];
  userPresence: Record<string, string>;
  messageSearchOpen: boolean;
  setMessageSearchOpen: Dispatch<SetStateAction<boolean>>;
  setBackgroundSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setSelectedConversation: Dispatch<SetStateAction<Conversation | null>>;
  openAvatarViewer: (avatar?: string | null, name?: string | null) => void;
  startOutgoingCall: (payload: OutgoingCallPayload) => void;
  openConversationAvatarUploader: (options: { mode: 'group' | 'announcement'; conversationId?: string }) => void;
};

export function AppEmailConversationHeader({
  selectedConversation,
  user,
  announcementAvatar,
  typingIndicators,
  userPresence,
  messageSearchOpen,
  setMessageSearchOpen,
  setBackgroundSettingsOpen,
  setConversations,
  setSelectedConversation,
  openAvatarViewer,
  startOutgoingCall,
  openConversationAvatarUploader,
}: AppEmailConversationHeaderProps) {
  return (
    <div className="relative bg-linear-to-r from-cyan-600 to-cyan-700 text-white p-3 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white lg:hidden" onClick={() => setSelectedConversation(null)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Avatar
          className="w-10 h-10 cursor-pointer"
          onClick={() =>
            openAvatarViewer(
              selectedConversation.participants.find((p) => p.id !== user?.id)?.avatar,
              selectedConversation.participants.find((p) => p.id !== user?.id)?.name
            )
          }
        >
          {selectedConversation.type === 'group' && selectedConversation.avatar ? (
            <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name || 'Groupe'} />
          ) : selectedConversation.type === 'group' ? (
            <AvatarFallback className="bg-cyan-500 text-white">
              <Users className="w-5 h-5" />
            </AvatarFallback>
          ) : selectedConversation.participants.find((p) => p.id !== user?.id)?.id === 'system-annonces' ? (
            <AvatarImage src={announcementAvatar} alt="Annonces" />
          ) : selectedConversation.participants.find((p) => p.id !== user?.id)?.avatar ? (
            <AvatarImage
              src={selectedConversation.participants.find((p) => p.id !== user?.id)?.avatar}
              alt={selectedConversation.participants.find((p) => p.id !== user?.id)?.name || 'Utilisateur'}
            />
          ) : (
            <AvatarFallback className="bg-cyan-500 text-white">{selectedConversation.participants.find((p) => p.id !== user?.id)?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="font-medium flex items-center gap-1">
            {selectedConversation.participants.find((p) => p.id !== user?.id)?.id === 'system-annonces' && <Bell className="w-4 h-4 text-yellow-400" />}
            {selectedConversation.type === 'group' ? selectedConversation.name : selectedConversation.participants.find((p) => p.id !== user?.id)?.name}
          </p>
          <p className="text-xs text-white/70">
            {selectedConversation.participants.find((p) => p.id !== user?.id)?.id === 'system-annonces'
              ? "Canal d'annonces officiel"
              : typingIndicators.find((t) => t.conversationId === selectedConversation.id)?.isTyping
                ? `${typingIndicators.find((t) => t.conversationId === selectedConversation.id)?.userName || 'Utilisateur'} ${typingIndicators.find((t) => t.conversationId === selectedConversation.id)?.isRecording ? "est en train d'enregistrer un message" : "est en train d'écrire..."}`
                : selectedConversation.type === 'group'
                  ? `${selectedConversation.participants.length} membres`
                  : userPresence[selectedConversation.participants.find((p) => p.id !== user?.id)?.id || ''] === 'online'
                    ? 'En ligne'
                    : 'Hors ligne'}
          </p>
        </div>
      </div>
      {selectedConversation.participants.find((p) => p.id !== user?.id)?.id !== 'system-annonces' && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setMessageSearchOpen(!messageSearchOpen)} title="Rechercher dans les messages">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setBackgroundSettingsOpen(true)} title="Paramètres">
            <Settings className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => {
              if (selectedConversation.type === 'group') {
                const targetIds = selectedConversation.participants
                  .filter((participant) => participant.id !== user?.id)
                  .map((participant) => participant.id)
                  .join(',');

                if (!targetIds) return;

                startOutgoingCall({
                  conversationId: selectedConversation.id,
                  calleeId: targetIds,
                  calleeName: `Groupe: ${selectedConversation.name}`,
                  type: 'video',
                });
                return;
              }

              const otherUser = selectedConversation.participants.find((participant) => participant.id !== user?.id);
              if (!otherUser) return;

              startOutgoingCall({
                conversationId: selectedConversation.id,
                calleeId: otherUser.id,
                calleeName: otherUser.name,
                type: 'video',
              });
            }}
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => {
              if (selectedConversation.type === 'group') {
                const targetIds = selectedConversation.participants
                  .filter((participant) => participant.id !== user?.id)
                  .map((participant) => participant.id)
                  .join(',');

                if (!targetIds) return;

                startOutgoingCall({
                  conversationId: selectedConversation.id,
                  calleeId: targetIds,
                  calleeName: `Groupe: ${selectedConversation.name}`,
                  type: 'audio',
                });
                return;
              }

              const otherUser = selectedConversation.participants.find((participant) => participant.id !== user?.id);
              if (!otherUser) return;

              startOutgoingCall({
                conversationId: selectedConversation.id,
                calleeId: otherUser.id,
                calleeName: otherUser.name,
                type: 'audio',
              });
            }}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setConversations((prev) => prev.map((c) => (c.id === selectedConversation.id ? { ...c, isPinned: !c.isPinned } : c)));
                  toast.success(selectedConversation.isPinned ? 'Discussion désépinglée' : 'Discussion épinglée');
                }}
              >
                <Pin className="w-4 h-4 mr-2" />
                {selectedConversation.isPinned ? 'Désépingler' : 'Épingler'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setConversations((prev) => prev.map((c) => (c.id === selectedConversation.id ? { ...c, isMuted: !c.isMuted } : c)));
                  toast.success(selectedConversation.isMuted ? 'Notifications réactivées' : 'Notifications désactivées');
                }}
              >
                <BellOff className="w-4 h-4 mr-2" />
                {selectedConversation.isMuted ? 'Réactiver' : 'Désactiver'}
              </DropdownMenuItem>
              {selectedConversation.type === 'group' && (
                <DropdownMenuItem
                  onClick={() => {
                    if (!canManageAnnouncements(user)) {
                      toast.error('Action non autorisée');
                      return;
                    }
                    openConversationAvatarUploader({ mode: 'group', conversationId: selectedConversation.id });
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Changer photo du groupe
                </DropdownMenuItem>
              )}
              {selectedConversation.participants.find((p) => p.id !== user?.id)?.id === 'system-annonces' && (
                <DropdownMenuItem
                  onClick={() => {
                    if (!canManageAnnouncements(user)) {
                      toast.error('Action non autorisée', {
                        description: 'Seuls les Admins, Responsables et Super Admins peuvent changer la photo des annonces.',
                      });
                      return;
                    }
                    openConversationAvatarUploader({ mode: 'announcement' });
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Changer photo des annonces
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setConversations((prev) => prev.map((c) => (c.id === selectedConversation.id ? { ...c, isArchived: true } : c)));
                  setSelectedConversation(null);
                  toast.success('Discussion archivée');
                }}
              >
                <Archive className="w-4 h-4 mr-2" />Archiver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}