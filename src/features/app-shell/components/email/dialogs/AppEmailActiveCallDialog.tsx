import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import EmojiPicker, { EmojiClickData, Theme as EmojiPickerTheme } from 'emoji-picker-react';
import { Mic, MicOff, PhoneOff, Smile, UserPlus, Users, Video, Volume2, VolumeX } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CallHistory, LiveReaction } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type CallParticipant = {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
};

type CurrentUser = {
  avatar?: string | null;
  name?: string | null;
} | null;

type AppEmailActiveCallDialogProps = {
  callDialogOpen: boolean;
  setCallDialogOpen: Dispatch<SetStateAction<boolean>>;
  activeCall: CallHistory | null;
  setActiveCall: Dispatch<SetStateAction<CallHistory | null>>;
  callState: 'calling' | 'ringing' | 'connected' | 'ended';
  setCallState: Dispatch<SetStateAction<'calling' | 'ringing' | 'connected' | 'ended'>>;
  callTimer: number;
  setCallTimer: Dispatch<SetStateAction<number>>;
  liveReactions: LiveReaction[];
  setLiveReactions: Dispatch<SetStateAction<LiveReaction[]>>;
  callParticipants: CallParticipant[];
  setCallParticipants: Dispatch<SetStateAction<CallParticipant[]>>;
  user: CurrentUser;
  setAddParticipantsOpen: Dispatch<SetStateAction<boolean>>;
  isCallMuted: boolean;
  setIsCallMuted: Dispatch<SetStateAction<boolean>>;
  isCallSpeakerOn: boolean;
  setIsCallSpeakerOn: Dispatch<SetStateAction<boolean>>;
  showCallReactionPicker: boolean;
  setShowCallReactionPicker: Dispatch<SetStateAction<boolean>>;
  theme?: string;
  isCompactEmojiLayout: boolean;
  broadcastLiveReaction: (emoji: string, scope: 'chat' | 'call') => void;
  callTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
};

export function AppEmailActiveCallDialog({
  callDialogOpen,
  setCallDialogOpen,
  activeCall,
  setActiveCall,
  callState,
  setCallState,
  callTimer,
  setCallTimer,
  liveReactions,
  setLiveReactions,
  callParticipants,
  setCallParticipants,
  user,
  setAddParticipantsOpen,
  isCallMuted,
  setIsCallMuted,
  isCallSpeakerOn,
  setIsCallSpeakerOn,
  showCallReactionPicker,
  setShowCallReactionPicker,
  theme,
  isCompactEmojiLayout,
  broadcastLiveReaction,
  callTimeoutRef,
}: AppEmailActiveCallDialogProps) {
  return (
    <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
      <DialogContent className="max-w-md p-0 bg-linear-to-b from-slate-900 to-slate-800 border-0 text-white">
        <div className="text-center py-8 px-6">
          <div className="flex justify-center mb-4">
            <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              {activeCall?.type === 'video' ? 'Appel Vidéo' : 'Appel Audio'}
            </Badge>
          </div>

          <Avatar className="w-28 h-28 mx-auto mb-4 ring-4 ring-cyan-500/30 ring-offset-4 ring-offset-slate-900">
            {activeCall?.calleeName?.includes('Groupe') ? (
              <AvatarFallback className="bg-linear-to-br from-cyan-500 to-cyan-600 text-white text-3xl">
                <Users className="w-14 h-14" />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-linear-to-br from-cyan-500 to-cyan-600 text-white text-3xl">
                {activeCall?.calleeName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <h3 className="text-2xl font-semibold mb-1">{activeCall?.calleeName}</h3>

          <p className="text-slate-400 mb-4">
            {callState === 'calling' && (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                Appel en cours...
              </span>
            )}
            {callState === 'ringing' && (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sonnerie... <span className="text-cyan-400 font-mono">{callTimer}s</span>
              </span>
            )}
            {callState === 'connected' && (
              <span className="text-green-400 font-mono text-lg">
                {Math.floor(callTimer / 60)}:{String(callTimer % 60).padStart(2, '0')}
              </span>
            )}
            {callState === 'ended' && 'Appel terminé'}
          </p>

          <div className="min-h-14 mb-3 flex justify-center">
            <div className="pointer-events-none flex flex-col items-center gap-2">
              <AnimatePresence>
                {liveReactions
                  .filter((item) => item.callId === activeCall?.id)
                  .slice(-4)
                  .map((item, index) => {
                    const drift = ((index % 3) - 1) * 10;
                    return (
                      <motion.div
                        key={`${item.id}-${new Date(item.createdAt).getTime()}-${index}`}
                        initial={{ opacity: 0, y: 16, x: 0, scale: 0.8 }}
                        animate={{ opacity: 1, y: -4, x: drift, scale: 1 }}
                        exit={{ opacity: 0, y: -30, x: drift * 1.4, scale: 0.72 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="rounded-full bg-slate-700/80 px-3 py-1 text-sm"
                      >
                        <span className="text-lg align-middle">{item.emoji}</span>
                        <span className="ml-2 text-xs text-slate-200 align-middle">{item.userName}</span>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>

          {(callState === 'calling' || callState === 'ringing') && (
            <div className="flex justify-center gap-1 mb-6">
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className="w-1.5 h-8 rounded-full bg-cyan-500 animate-pulse"
                  style={{ animationDelay: `${index * 100}ms`, animationDuration: '0.5s' }}
                />
              ))}
            </div>
          )}

          {activeCall?.calleeName?.includes('Groupe') && (
            <div className="mb-6">
              <p className="text-sm text-slate-400 mb-2">Participants ({callParticipants.length + 1}/12)</p>
              <div className="flex flex-wrap justify-center gap-2">
                <div className="flex flex-col items-center">
                  <Avatar className="w-12 h-12 ring-2 ring-green-500">
                    {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                    <AvatarFallback className="bg-green-500 text-white">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs mt-1 text-slate-300">Vous</span>
                </div>

                {callParticipants.slice(0, 11).map((participant) => (
                  <div key={participant.id} className="flex flex-col items-center relative">
                    <Avatar className={`w-12 h-12 ${participant.isSpeaking ? 'ring-2 ring-cyan-500' : ''}`}>
                      {participant.avatar ? (
                        <AvatarImage src={participant.avatar} />
                      ) : (
                        <AvatarFallback className="bg-slate-600 text-white">{participant.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs mt-1 text-slate-300 truncate max-w-12.5">{participant.name}</span>
                    {participant.isMuted && <MicOff className="absolute -top-1 -right-1 w-4 h-4 text-red-400 bg-red-500/20 rounded-full p-0.5" />}
                  </div>
                ))}

                {callParticipants.length < 11 && (
                  <button
                    className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
                    onClick={() => setAddParticipantsOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-xs mt-1 text-slate-400">Ajouter</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCallMuted(!isCallMuted)}
              className={`rounded-full h-14 w-14 transition-all ${isCallMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
              {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {activeCall?.type === 'video' && (
              <Button variant="ghost" size="icon" className="rounded-full h-14 w-14 bg-slate-700 text-white hover:bg-slate-600">
                <Video className="w-6 h-6" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCallSpeakerOn(!isCallSpeakerOn)}
              className={`rounded-full h-14 w-14 transition-all ${isCallSpeakerOn ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
              {isCallSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>

            {callState === 'connected' && (
              <Popover open={showCallReactionPicker} onOpenChange={setShowCallReactionPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-14 w-14 bg-slate-700 text-white hover:bg-slate-600"
                    title="Réagir pendant l'appel"
                  >
                    <Smile className="w-6 h-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 shadow-xl sm:w-96" align="center" sideOffset={8}>
                  <EmojiPicker
                    theme={theme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
                    lazyLoadEmojis
                    searchPlaceholder="Réagir en direct..."
                    previewConfig={{ showPreview: false }}
                    width="100%"
                    height={isCompactEmojiLayout ? 290 : 340}
                    onEmojiClick={(emojiData: EmojiClickData) => {
                      broadcastLiveReaction(emojiData.emoji, 'call');
                      setShowCallReactionPicker(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}

            <Button
              className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
              onClick={() => {
                setCallDialogOpen(false);
                setActiveCall(null);
                setCallTimer(0);
                setCallState('ended');
                setCallParticipants([]);
                setShowCallReactionPicker(false);
                setLiveReactions((prev) => prev.filter((item) => item.callId !== activeCall?.id));
                if (callTimeoutRef.current) {
                  clearTimeout(callTimeoutRef.current);
                }
                toast.info('Appel terminé');
              }}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
