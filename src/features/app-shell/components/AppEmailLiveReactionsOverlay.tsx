import { AnimatePresence, motion } from 'framer-motion';

import type { LiveReaction } from '@/features/app-shell/types';

type AppEmailLiveReactionsOverlayProps = {
  conversationId: string;
  liveReactions: LiveReaction[];
};

export function AppEmailLiveReactionsOverlay({ conversationId, liveReactions }: AppEmailLiveReactionsOverlayProps) {
  return (
    <div className="pointer-events-none absolute right-4 bottom-4 z-20 flex flex-col items-end gap-2">
      <AnimatePresence>
        {liveReactions
          .filter((item) => item.conversationId === conversationId && !item.callId)
          .slice(-6)
          .map((item, index) => {
            const drift = ((index % 3) - 1) * 12;
            return (
              <motion.div
                key={`${item.id}-${new Date(item.createdAt).getTime()}-${index}`}
                initial={{ opacity: 0, y: 14, x: 0, scale: 0.7 }}
                animate={{ opacity: 1, y: -6, x: drift, scale: 1 }}
                exit={{ opacity: 0, y: -36, x: drift * 1.5, scale: 0.65 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="rounded-full bg-black/70 px-3 py-1.5 text-white shadow-lg"
              >
                <span className="text-lg leading-none">{item.emoji}</span>
                <span className="ml-2 text-xs">{item.userName}</span>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
