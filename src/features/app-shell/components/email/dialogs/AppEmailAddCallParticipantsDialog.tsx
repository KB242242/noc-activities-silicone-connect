import type { Dispatch, SetStateAction } from 'react';

import { UserPlus } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/lib/toast';

type DirectoryUser = {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
};

type CallParticipant = {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
};

type CurrentUser = {
  id?: string;
} | null;

type AppEmailAddCallParticipantsDialogProps = {
  addParticipantsOpen: boolean;
  setAddParticipantsOpen: Dispatch<SetStateAction<boolean>>;
  usersDirectory: DirectoryUser[];
  user: CurrentUser;
  callParticipants: CallParticipant[];
  setCallParticipants: Dispatch<SetStateAction<CallParticipant[]>>;
};

export function AppEmailAddCallParticipantsDialog({
  addParticipantsOpen,
  setAddParticipantsOpen,
  usersDirectory,
  user,
  callParticipants,
  setCallParticipants,
}: AppEmailAddCallParticipantsDialogProps) {
  return (
    <Dialog open={addParticipantsOpen} onOpenChange={setAddParticipantsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-500" />
            Ajouter des participants
          </DialogTitle>
          <DialogDescription>Ajoutez jusqu'a 12 participants a l'appel</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-75 py-4">
          <div className="space-y-2">
            {usersDirectory
              .filter((directoryUser) => directoryUser.id !== user?.id && !callParticipants.find((participant) => participant.id === directoryUser.id))
              .map((directoryUser) => (
                <div
                  key={directoryUser.id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  onClick={() => {
                    if (callParticipants.length < 11) {
                      setCallParticipants((prev) => [
                        ...prev,
                        {
                          id: directoryUser.id,
                          name: directoryUser.name,
                          avatar: directoryUser.avatar || undefined,
                          isMuted: false,
                          isVideoOn: true,
                          isSpeaking: false,
                        },
                      ]);
                      toast.success(`${directoryUser.name} ajouté a l'appel`);
                    } else {
                      toast.error('Maximum 12 participants atteint');
                    }
                  }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-cyan-100 text-cyan-700">{directoryUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{directoryUser.name}</p>
                    <p className="text-xs text-muted-foreground">{directoryUser.role}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAddParticipantsOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
