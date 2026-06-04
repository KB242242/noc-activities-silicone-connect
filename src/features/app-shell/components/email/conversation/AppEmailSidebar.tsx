import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { Bell, BellOff, MessageCircle, Pin, Plus, Search, UserPlus, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Conversation, UserProfile } from '@/features/app-shell/core/shared/types';

type AppEmailSidebarProps = {
  user: UserProfile | null;
  openAvatarViewer: (avatar?: string | null, name?: string | null) => void;
  setNewConversationOpen: Dispatch<SetStateAction<boolean>>;
  setCreateGroupOpen: Dispatch<SetStateAction<boolean>>;
  chatSearchQuery: string;
  setChatSearchQuery: Dispatch<SetStateAction<string>>;
  statusList: any[];
  usersDirectory: UserProfile[];
  setMyStatusesOpen: Dispatch<SetStateAction<boolean>>;
  setCreateStatusOpen: Dispatch<SetStateAction<boolean>>;
  setViewingUserStatuses: Dispatch<SetStateAction<any[]>>;
  setViewingStatusIndex: Dispatch<SetStateAction<number>>;
  setViewingStatus: Dispatch<SetStateAction<any>>;
  setStatusViewOpen: Dispatch<SetStateAction<boolean>>;
  setStatusList: Dispatch<SetStateAction<any[]>>;
  conversationFilter: 'all' | 'unread' | 'groups';
  setConversationFilter: Dispatch<SetStateAction<'all' | 'unread' | 'groups'>>;
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  userPresence: Record<string, string>;
  announcementAvatar: string;
  handleConversationSelect: (conversation: Conversation) => void;
};

export function AppEmailSidebar({
  user,
  openAvatarViewer,
  setNewConversationOpen,
  setCreateGroupOpen,
  chatSearchQuery,
  setChatSearchQuery,
  statusList,
  usersDirectory,
  setMyStatusesOpen,
  setCreateStatusOpen,
  setViewingUserStatuses,
  setViewingStatusIndex,
  setViewingStatus,
  setStatusViewOpen,
  setStatusList,
  conversationFilter,
  setConversationFilter,
  conversations,
  selectedConversation,
  userPresence,
  announcementAvatar,
  handleConversationSelect,
}: AppEmailSidebarProps) {
  return (
    <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-3 border-b bg-linear-to-r from-cyan-600 to-cyan-700 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10 border-2 border-white/30 cursor-zoom-in" onClick={() => openAvatarViewer(user?.avatar, user?.name)}>
              {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
              <AvatarFallback className="bg-white/20 text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setNewConversationOpen(true)} title="Nouvelle discussion">
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setCreateGroupOpen(true)} title="Créer un groupe">
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher une discussion..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white/10 border-0 text-white placeholder:text-white/50 rounded-lg"
          />
        </div>
      </div>
      <div className="p-2 border-b bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-cyan-600"
            onClick={() => {
              const myStatuses = statusList.filter((s) => s.userId === user?.id);
              if (myStatuses.length > 0) {
                setMyStatusesOpen(true);
              } else {
                setCreateStatusOpen(true);
              }
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Mon status
          </Button>
        </div>
        <div className="overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-3 px-1" style={{ minWidth: 'max-content' }}>
            <div
              className="flex flex-col items-center cursor-pointer shrink-0"
              onClick={() => {
                const myStatuses = statusList.filter((s) => s.userId === user?.id);
                if (myStatuses.length > 0) {
                  setMyStatusesOpen(true);
                } else {
                  setCreateStatusOpen(true);
                }
              }}
            >
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-cyan-500 ring-offset-2">
                  {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                  <AvatarFallback className="bg-cyan-500 text-white">{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Mon status</span>
              {statusList.filter((s) => s.userId === user?.id).length > 0 && (
                <span className="text-[10px] text-cyan-600">{statusList.filter((s) => s.userId === user?.id).length}</span>
              )}
            </div>
            {usersDirectory
              .filter((u) => u.id !== user?.id && statusList.some((s) => s.userId === u.id && !s.blockedUsers.includes(user?.id || '')))
              .map((statusUser) => {
                const userStatuses = statusList.filter((s) => s.userId === statusUser.id && !s.blockedUsers.includes(user?.id || ''));
                const latestStatus = userStatuses[0];
                const hasNewStatus = !latestStatus?.views.some((v: any) => v.userId === user?.id);
                return (
                  <div
                    key={statusUser.id}
                    className="flex flex-col items-center cursor-pointer shrink-0"
                    onClick={() => {
                      if (userStatuses.length > 0) {
                        setViewingUserStatuses(userStatuses);
                        setViewingStatusIndex(0);
                        setViewingStatus(userStatuses[0]);
                        setStatusViewOpen(true);
                        setStatusList((prev) =>
                          prev.map((s) =>
                            s.id === userStatuses[0].id
                              ? {
                                  ...s,
                                  views: [...s.views.filter((v: any) => v.userId !== user?.id), { userId: user?.id || '', viewedAt: new Date() }],
                                }
                              : s
                          )
                        );
                      }
                    }}
                  >
                    <Avatar className={`w-14 h-14 ${hasNewStatus ? 'ring-2 ring-cyan-500 ring-offset-2' : 'ring-1 ring-slate-300 dark:ring-slate-600'}`}>
                      {statusUser.avatar ? <AvatarImage src={statusUser.avatar} /> : null}
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{statusUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs mt-1 text-muted-foreground truncate w-14 text-center">{statusUser.name}</span>
                    {userStatuses.length > 1 && <span className="text-[10px] text-cyan-600">{userStatuses.length} statuts</span>}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <div className="flex gap-1 p-2 border-b bg-slate-50 dark:bg-slate-800">
        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('all')} className={`text-xs rounded-full ${conversationFilter === 'all' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>
          Toutes
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('unread')} className={`text-xs rounded-full ${conversationFilter === 'unread' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>
          Non lues
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('groups')} className={`text-xs rounded-full ${conversationFilter === 'groups' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>
          Groupes
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto contact-list-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="font-medium text-lg mb-2">Aucune discussion</h3>
            <p className="text-muted-foreground text-sm mb-4">Commencez une nouvelle conversation</p>
            <div className="flex gap-2">
              <Button onClick={() => setNewConversationOpen(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <MessageCircle className="w-4 h-4 mr-2" />Nouvelle discussion
              </Button>
              <Button onClick={() => setCreateGroupOpen(true)} variant="outline">
                <Users className="w-4 h-4 mr-2" />Créer un groupe
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {conversations
              .filter((c) => {
                if (conversationFilter === 'unread') return c.unreadCount > 0;
                if (conversationFilter === 'groups') return c.type === 'group';
                return true;
              })
              .filter((c) =>
                chatSearchQuery === ''
                  ? true
                  : c.type === 'group'
                    ? c.name?.toLowerCase().includes(chatSearchQuery.toLowerCase())
                    : c.participants.find((p) => p.id !== user?.id)?.name.toLowerCase().includes(chatSearchQuery.toLowerCase())
              )
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              })
              .map((conversation) => {
                const otherParticipant = conversation.type === 'individual' ? conversation.participants.find((p) => p.id !== user?.id) : null;
                const displayName = conversation.type === 'group' ? conversation.name : otherParticipant?.name || 'Inconnu';
                const isOnline = conversation.type === 'individual' && userPresence[otherParticipant?.id || ''] === 'online';
                const isAnnonces = otherParticipant?.id === 'system-annonces';
                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedConversation?.id === conversation.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        {isAnnonces ? (
                          <AvatarImage src={announcementAvatar} alt="Annonces" />
                        ) : conversation.type === 'group' && conversation.avatar ? (
                          <AvatarImage src={conversation.avatar} alt={displayName || 'Groupe'} />
                        ) : conversation.type === 'group' ? (
                          <AvatarFallback className="bg-cyan-500 text-white">
                            <Users className="w-6 h-6" />
                          </AvatarFallback>
                        ) : otherParticipant?.avatar ? (
                          <AvatarImage src={otherParticipant.avatar} alt={displayName || 'Utilisateur'} />
                        ) : (
                          <AvatarFallback className="bg-cyan-500 text-white">{displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      {isOnline && !isAnnonces && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>}
                      {conversation.isMuted && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center">
                          <BellOff className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate flex items-center gap-1">
                          {isAnnonces && <Bell className="w-4 h-4 text-yellow-500" />}
                          {displayName}
                          {conversation.isPinned && <Pin className="w-3 h-3 text-cyan-500" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{conversation.lastMessage ? format(conversation.lastMessage.createdAt, 'HH:mm') : ''}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate max-w-45">
                          {conversation.lastMessage?.deletedForEveryone
                            ? 'Ce message a été supprimé'
                            : conversation.lastMessage?.type === 'voice'
                              ? '[Vocal] Message vocal'
                              : conversation.lastMessage?.type === 'image'
                                ? '[Image] Image'
                                : conversation.lastMessage?.type === 'video'
                                  ? '[Vidéo] Vidéo'
                                  : conversation.lastMessage?.type === 'document'
                                    ? '[Document] Document'
                                    : conversation.lastMessage?.content || 'Aucun message'}
                        </p>
                        {conversation.unreadCount > 0 && <Badge className={`${isAnnonces ? 'bg-yellow-500' : 'bg-cyan-500'} text-white text-xs rounded-full px-2`}>{conversation.unreadCount}</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
