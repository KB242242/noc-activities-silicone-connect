import type { Dispatch, SetStateAction } from 'react';
import { AlertCircle, Edit, Pin, Reply, Trash2 } from 'lucide-react';

import type { ChatMessage, Conversation, UserProfile } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type AppEmailMessageContextMenuProps = {
  showContextMenu: boolean;
  contextMenuMessage: ChatMessage | null;
  contextMenuPosition: { x: number; y: number };
  user: UserProfile | null;
  setShowContextMenu: Dispatch<SetStateAction<boolean>>;
  setPinnedMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setEditingMessage: Dispatch<SetStateAction<ChatMessage | null>>;
  setEditMessageContent: Dispatch<SetStateAction<string>>;
  setEditMessageDialogOpen: Dispatch<SetStateAction<boolean>>;
  setReplyingTo: Dispatch<SetStateAction<ChatMessage | null>>;
  updateChatMessage: (
    conversationId: string,
    messageId: string,
    action: 'deleteForMe' | 'deleteForEveryone' | 'togglePin' | 'toggleImportant' | 'editContent',
    payload?: { content?: string; isPinned?: boolean; isImportant?: boolean }
  ) => Promise<unknown>;
};

export function AppEmailMessageContextMenu({
  showContextMenu,
  contextMenuMessage,
  contextMenuPosition,
  user,
  setShowContextMenu,
  setPinnedMessages,
  setChatMessages,
  setConversations,
  setEditingMessage,
  setEditMessageContent,
  setEditMessageDialogOpen,
  setReplyingTo,
  updateChatMessage,
}: AppEmailMessageContextMenuProps) {
  if (!showContextMenu || !contextMenuMessage) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border py-1 min-w-45"
      style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
      onClick={() => setShowContextMenu(false)}
    >
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        onClick={async () => {
          if (contextMenuMessage.isPinned) {
            setPinnedMessages((prev) => prev.filter((message) => message.id !== contextMenuMessage.id));
            setChatMessages((prev) => prev.map((message) => (message.id === contextMenuMessage.id ? { ...message, isPinned: false } : message)));
            toast.success('Message désépinglé');
          } else {
            setPinnedMessages((prev) => [...prev, contextMenuMessage]);
            setChatMessages((prev) => prev.map((message) => (message.id === contextMenuMessage.id ? { ...message, isPinned: true } : message)));
            toast.success('Message épinglé');
          }

          await updateChatMessage(contextMenuMessage.conversationId, contextMenuMessage.id, 'togglePin', {
            isPinned: !contextMenuMessage.isPinned,
          });

          setShowContextMenu(false);
        }}
      >
        <Pin className="w-4 h-4" /> {contextMenuMessage.isPinned ? 'Désépingler' : 'Épingler'}
      </button>
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        onClick={async () => {
          const nextImportant = !contextMenuMessage.isImportant;
          setChatMessages((prev) => prev.map((message) => (message.id === contextMenuMessage.id ? { ...message, isImportant: nextImportant } : message)));
          await updateChatMessage(contextMenuMessage.conversationId, contextMenuMessage.id, 'toggleImportant', {
            isImportant: nextImportant,
          });
          toast.success(nextImportant ? 'Message marqué important' : 'Message retiré des importants');
          setShowContextMenu(false);
        }}
      >
        <AlertCircle className="w-4 h-4" /> {contextMenuMessage.isImportant ? 'Retirer important' : 'Marquer important'}
      </button>
      {contextMenuMessage.senderId === user?.id && (
        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
          onClick={() => {
            setEditingMessage(contextMenuMessage);
            setEditMessageContent(contextMenuMessage.content);
            setEditMessageDialogOpen(true);
            setShowContextMenu(false);
          }}
        >
          <Edit className="w-4 h-4" /> Modifier
        </button>
      )}
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        onClick={async () => {
          setChatMessages((prev) => prev.map((message) => (message.id === contextMenuMessage.id ? { ...message, isDeleted: true } : message)));
          await updateChatMessage(contextMenuMessage.conversationId, contextMenuMessage.id, 'deleteForMe');
          toast.success('Message supprimé pour vous');
          setShowContextMenu(false);
        }}
      >
        <Trash2 className="w-4 h-4" /> Supprimer pour moi
      </button>
      {contextMenuMessage.senderId === user?.id && (() => {
        const messageTime = new Date(contextMenuMessage.createdAt).getTime();
        const currentTime = Date.now();
        const minutesPassed = (currentTime - messageTime) / 60000;
        const canDeleteForEveryone = minutesPassed <= 10;

        return canDeleteForEveryone ? (
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
            onClick={async () => {
              setChatMessages((prev) => prev.map((message) => (message.id === contextMenuMessage.id ? { ...message, deletedForEveryone: true } : message)));
              setConversations((prev) =>
                prev.map((conversation) => {
                  if (conversation.lastMessage?.id === contextMenuMessage.id) {
                    return { ...conversation, lastMessage: { ...conversation.lastMessage, deletedForEveryone: true } };
                  }
                  return conversation;
                })
              );
              await updateChatMessage(contextMenuMessage.conversationId, contextMenuMessage.id, 'deleteForEveryone');
              toast.success('Message supprimé pour tous');
              setShowContextMenu(false);
            }}
          >
            <Trash2 className="w-4 h-4" /> Supprimer pour tous
          </button>
        ) : (
          <button
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed"
            disabled
            title="Disponible uniquement dans les 10 minutes après l'envoi"
          >
            <Trash2 className="w-4 h-4" /> Supprimer pour tous (expiré)
          </button>
        );
      })()}
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        onClick={() => {
          setReplyingTo(contextMenuMessage);
          setShowContextMenu(false);
        }}
      >
        <Reply className="w-4 h-4" /> Répondre
      </button>
    </div>
  );
}
