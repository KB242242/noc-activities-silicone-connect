import type { Dispatch, SetStateAction } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CallHistory } from '@/features/app-shell/core/shared/types';

type CallParticipant = {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
};

type AppEmailIncomingCallDialogProps = {
  incomingCall: CallHistory | null;
  activeCall: CallHistory | null;
  callState: 'calling' | 'ringing' | 'connected' | 'ended';
  handleIncomingCallAction: (action: 'accept' | 'reject' | 'ignore') => void;
  setConferenceEnabled: Dispatch<SetStateAction<boolean>>;
  setHeldCall: Dispatch<SetStateAction<CallHistory | null>>;
  setCallParticipants: Dispatch<SetStateAction<CallParticipant[]>>;
  addNotification: (...args: any[]) => void;
};

export function AppEmailIncomingCallDialog({
  incomingCall,
  activeCall,
  callState,
  handleIncomingCallAction,
  setConferenceEnabled,
  setHeldCall,
  setCallParticipants,
  addNotification,
}: AppEmailIncomingCallDialogProps) {
  return (
    <Dialog
      open={Boolean(incomingCall)}
      onOpenChange={(open) => {
        if (!open && incomingCall) {
          handleIncomingCallAction('ignore');
        }
      }}
    >
      <DialogContent className="max-w-md p-0 bg-linear-to-b from-slate-900 to-slate-800 border-0 text-white">
        <div className="text-center py-8 px-6">
          <div className="flex justify-center mb-4">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Appel entrant {incomingCall?.type === 'video' ? 'vidéo' : 'audio'}
            </Badge>
          </div>

          <Avatar className="w-28 h-28 mx-auto mb-4 ring-4 ring-emerald-500/30 ring-offset-4 ring-offset-slate-900">
            <AvatarFallback className="bg-linear-to-br from-emerald-500 to-cyan-600 text-white text-3xl">
              {incomingCall?.callerName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-2xl font-semibold mb-1">{incomingCall?.callerName}</h3>
          <p className="text-slate-300 mb-6">
            {activeCall && callState === 'connected' ? 'Vous avez un deuxième appel' : 'Souhaitez-vous répondre ?'}
          </p>

          {activeCall && callState === 'connected' && (
            <div className="mb-5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Appel actuel: {activeCall.calleeName}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button type="button" variant="destructive" onClick={() => handleIncomingCallAction('reject')}>
              Rejeter
            </Button>
            <Button
              type="button"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => handleIncomingCallAction('accept')}
            >
              {activeCall && callState === 'connected' ? 'Mettre en attente et répondre' : 'Accepter'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-500 text-slate-100 hover:bg-slate-700"
              onClick={() => handleIncomingCallAction('ignore')}
            >
              Ignorer
            </Button>
          </div>

          {activeCall && callState === 'connected' && (
            <Button
              type="button"
              className="mt-3 w-full bg-cyan-500 hover:bg-cyan-600"
              onClick={() => {
                if (!incomingCall || !activeCall) return;
                setConferenceEnabled(true);
                setHeldCall(null);
                setCallParticipants((prev) => {
                  const base = [...prev];
                  const incomingParticipant: CallParticipant = {
                    id: incomingCall.callerId,
                    name: incomingCall.callerName,
                    avatar: undefined,
                    isMuted: false,
                    isVideoOn: incomingCall.type === 'video',
                    isSpeaking: false,
                  };
                  if (!base.some((participant) => participant.id === incomingParticipant.id)) {
                    base.push(incomingParticipant);
                  }
                  return base;
                });
                handleIncomingCallAction('accept');
                addNotification('Conférence fusionnée', 'success', {
                  conversationId: incomingCall.conversationId,
                });
              }}
            >
              Mettre en conférence (fusionner)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
