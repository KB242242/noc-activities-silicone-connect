import type { Dispatch, SetStateAction } from 'react';
import { Archive, CheckSquare, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type AppEmailSelectionActionBarProps = {
  isSelectionMode: boolean;
  selectedChatMessages: Set<string>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSelectedChatMessages: Dispatch<SetStateAction<Set<string>>>;
  setIsSelectionMode: Dispatch<SetStateAction<boolean>>;
};

export function AppEmailSelectionActionBar({
  isSelectionMode,
  selectedChatMessages,
  setChatMessages,
  setSelectedChatMessages,
  setIsSelectionMode,
}: AppEmailSelectionActionBarProps) {
  if (!isSelectionMode) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mb-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-cyan-500" />
        <span className="text-sm font-medium">{selectedChatMessages.size} message(s) sélectionné(s)</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const messageIds = Array.from(selectedChatMessages);
            setChatMessages((prev) => prev.map((message) => (selectedChatMessages.has(message.id) ? { ...message, isArchived: true } : message)));
            toast.success(`${messageIds.length} message(s) archivé(s)`);
            setSelectedChatMessages(new Set());
            setIsSelectionMode(false);
          }}
          disabled={selectedChatMessages.size === 0}
        >
          <Archive className="w-4 h-4 mr-1" />
          Archiver
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600"
          onClick={() => {
            const messageIds = Array.from(selectedChatMessages);
            setChatMessages((prev) => prev.map((message) => (selectedChatMessages.has(message.id) ? { ...message, isDeleted: true } : message)));
            toast.success(`${messageIds.length} message(s) supprimé(s)`);
            setSelectedChatMessages(new Set());
            setIsSelectionMode(false);
          }}
          disabled={selectedChatMessages.size === 0}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Supprimer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedChatMessages(new Set());
            setIsSelectionMode(false);
          }}
        >
          <X className="w-4 h-4 mr-1" />
          Annuler
        </Button>
      </div>
    </div>
  );
}
