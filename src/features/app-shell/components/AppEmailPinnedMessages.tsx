import { Pin } from 'lucide-react';

import type { ChatMessage } from '@/features/app-shell/types';

type AppEmailPinnedMessagesProps = {
  conversationId: string;
  pinnedMessages: ChatMessage[];
};

export function AppEmailPinnedMessages({ conversationId, pinnedMessages }: AppEmailPinnedMessagesProps) {
  const scopedPinnedMessages = pinnedMessages.filter((message) => message.conversationId === conversationId);

  if (scopedPinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className="bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-500 p-2 rounded mb-4">
      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1 flex items-center gap-1">
        <Pin className="w-3 h-3" /> Messages épinglés
      </p>
      {scopedPinnedMessages.map((message) => (
        <div key={message.id} className="text-sm text-muted-foreground truncate">
          <span className="font-medium">{message.senderName}:</span> {message.content}
        </div>
      ))}
    </div>
  );
}