import type { Dispatch, SetStateAction } from 'react';

import { Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { Conversation } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type DirectoryUser = {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
};

type CurrentUser = {
  id?: string;
} | null;

type CreateConversationInput = {
  type: 'group';
  name: string;
  description: string;
  participantIds: string[];
};

type AppEmailCreateGroupDialogProps = {
  createGroupOpen: boolean;
  setCreateGroupOpen: Dispatch<SetStateAction<boolean>>;
  newGroupName: string;
  setNewGroupName: Dispatch<SetStateAction<string>>;
  newGroupDescription: string;
  setNewGroupDescription: Dispatch<SetStateAction<string>>;
  selectedMembers: string[];
  setSelectedMembers: Dispatch<SetStateAction<string[]>>;
  usersDirectory: DirectoryUser[];
  user: CurrentUser;
  createConversationInDb: (payload: CreateConversationInput) => Promise<Conversation | null>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setSelectedConversation: Dispatch<SetStateAction<Conversation | null>>;
};

export function AppEmailCreateGroupDialog({
  createGroupOpen,
  setCreateGroupOpen,
  newGroupName,
  setNewGroupName,
  newGroupDescription,
  setNewGroupDescription,
  selectedMembers,
  setSelectedMembers,
  usersDirectory,
  user,
  createConversationInDb,
  setConversations,
  setSelectedConversation,
}: AppEmailCreateGroupDialogProps) {
  return (
    <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            Créer un groupe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Nom du groupe *</Label>
            <Input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Ex: Shift A Discussion"
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="Description du groupe..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Membres</Label>
            <ScrollArea className="h-48 border rounded-lg p-2">
              {usersDirectory
                .filter((directoryUser) => directoryUser.id !== user?.id)
                .map((directoryUser) => (
                  <div
                    key={directoryUser.id}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                    onClick={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(directoryUser.id)
                          ? prev.filter((id) => id !== directoryUser.id)
                          : [...prev, directoryUser.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedMembers.includes(directoryUser.id)} />
                    <Avatar className="w-8 h-8">
                      {directoryUser.avatar ? <AvatarImage src={directoryUser.avatar} alt={directoryUser.name} /> : null}
                      <AvatarFallback className="bg-cyan-500 text-white text-xs">
                        {directoryUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{directoryUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{directoryUser.role}</p>
                    </div>
                  </div>
                ))}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600"
            disabled={!newGroupName.trim() || selectedMembers.length === 0}
            onClick={async () => {
              const createdConversation = await createConversationInDb({
                type: 'group',
                name: newGroupName.trim(),
                description: newGroupDescription.trim(),
                participantIds: selectedMembers,
              });

              if (!createdConversation) {
                return;
              }

              setConversations((prev) => [
                createdConversation,
                ...prev.filter((conversation) => conversation.id !== createdConversation.id),
              ]);
              setSelectedConversation(createdConversation);
              setNewGroupName('');
              setNewGroupDescription('');
              setSelectedMembers([]);
              setCreateGroupOpen(false);
              toast.success('Groupe créé');
            }}
          >
            Créer le groupe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
