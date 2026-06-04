import type { Dispatch, SetStateAction } from 'react';

import { MessageCircle, Search } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation, PresenceStatus, UserProfile } from '@/features/app-shell/core/shared/types';

type AppEmailNewConversationDialogProps = {
  newConversationOpen: boolean;
  setNewConversationOpen: Dispatch<SetStateAction<boolean>>;
  newConversationSearch: string;
  setNewConversationSearch: Dispatch<SetStateAction<string>>;
  usersDirectory: UserProfile[];
  user: UserProfile | null;
  conversations: Conversation[];
  userPresence: Record<string, PresenceStatus>;
  getShiftColor: (shiftName: string) => string;
  setSelectedConversation: Dispatch<SetStateAction<Conversation | null>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  resetConversationUnreadCount: (conversations: Conversation[], conversationId: string) => Conversation[];
  createConversationInDb: (params: { type: 'individual'; participantIds: string[] }) => Promise<Conversation | null>;
};

export function AppEmailNewConversationDialog({
  newConversationOpen,
  setNewConversationOpen,
  newConversationSearch,
  setNewConversationSearch,
  usersDirectory,
  user,
  conversations,
  userPresence,
  getShiftColor,
  setSelectedConversation,
  setConversations,
  resetConversationUnreadCount,
  createConversationInDb,
}: AppEmailNewConversationDialogProps) {
  return (
    <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-500" />
            Nouvelle discussion
          </DialogTitle>
          <DialogDescription>Sélectionnez un collègue pour démarrer une conversation</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact..."
              className="pl-9"
              value={newConversationSearch}
              onChange={(event) => setNewConversationSearch(event.target.value)}
            />
          </div>
          <ScrollArea className="h-75">
            <div className="space-y-1">
              {usersDirectory
                .filter((directoryUser) => directoryUser.id !== user?.id)
                .filter(
                  (directoryUser) =>
                    directoryUser.name.toLowerCase().includes(newConversationSearch.toLowerCase()) ||
                    (directoryUser.username && directoryUser.username.toLowerCase().includes(newConversationSearch.toLowerCase())) ||
                    directoryUser.email.toLowerCase().includes(newConversationSearch.toLowerCase())
                )
                .map((contact) => {
                  const existingConv = conversations.find(
                    (conversation) =>
                      conversation.type === 'individual' &&
                      conversation.participants.some((participant) => participant.id === contact.id)
                  );
                  const isOnline = userPresence[contact.id] === 'online';

                  return (
                    <div
                      key={contact.id}
                      onClick={async () => {
                        if (existingConv) {
                          setSelectedConversation(existingConv);
                          setConversations((prev) => resetConversationUnreadCount(prev, existingConv.id));
                        } else {
                          const createdConversation = await createConversationInDb({
                            type: 'individual',
                            participantIds: [contact.id],
                          });

                          if (!createdConversation) {
                            return;
                          }

                          setConversations((prev) => [
                            createdConversation,
                            ...prev.filter((conversation) => conversation.id !== createdConversation.id),
                          ]);
                          setSelectedConversation(createdConversation);
                        }
                        setNewConversationOpen(false);
                        setNewConversationSearch('');
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          {contact.avatar ? <AvatarImage src={contact.avatar} /> : null}
                          <AvatarFallback className="bg-linear-to-br from-cyan-500 to-cyan-600 text-white">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{contact.name}</p>
                          {contact.shift && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: getShiftColor(contact.shift.name),
                                color: getShiftColor(contact.shift.name),
                              }}
                            >
                              Shift {contact.shift.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{contact.role.replace('_', ' ')}</p>
                          {isOnline && <span className="text-xs text-green-600">• En ligne</span>}
                        </div>
                      </div>
                      {existingConv && (
                        <Badge variant="secondary" className="text-xs">
                          Existant
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
