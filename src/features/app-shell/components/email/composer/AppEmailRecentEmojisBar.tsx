import type { Dispatch, SetStateAction } from 'react';

import { Separator } from '@/components/ui/separator';

type AppEmailRecentEmojisBarProps = {
  recentEmojis: string[];
  setNewMessage: Dispatch<SetStateAction<string>>;
  registerRecentEmoji: (emoji: string, scope?: 'chat' | 'call') => void;
  broadcastLiveReaction: (emoji: string, targetType: 'chat' | 'call') => void;
};

export function AppEmailRecentEmojisBar({
  recentEmojis,
  setNewMessage,
  registerRecentEmoji,
  broadcastLiveReaction,
}: AppEmailRecentEmojisBarProps) {
  if (recentEmojis.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-lg border bg-white/70 p-1 dark:bg-slate-700/50">
      {recentEmojis.slice(0, 10).map((emoji) => (
        <button
          key={`recent-insert-${emoji}`}
          type="button"
          className="h-8 w-8 shrink-0 rounded-md text-lg hover:bg-slate-100 dark:hover:bg-slate-600"
          onClick={() => {
            setNewMessage((prev) => prev + emoji);
            registerRecentEmoji(emoji);
          }}
          title="Insérer"
        >
          {emoji}
        </button>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      {recentEmojis.slice(0, 6).map((emoji) => (
        <button
          key={`recent-react-${emoji}`}
          type="button"
          className="h-8 w-8 shrink-0 rounded-md text-lg hover:bg-slate-100 dark:hover:bg-slate-600"
          onClick={() => {
            broadcastLiveReaction(emoji, 'chat');
          }}
          title="Réaction live"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
