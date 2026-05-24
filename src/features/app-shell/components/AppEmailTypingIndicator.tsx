import type { TypingIndicator } from '@/features/app-shell/types';

type AppEmailTypingIndicatorProps = {
  conversationId: string;
  typingIndicators: TypingIndicator[];
};

export function AppEmailTypingIndicator({ conversationId, typingIndicators }: AppEmailTypingIndicatorProps) {
  const isTyping = typingIndicators.find((indicator) => indicator.conversationId === conversationId)?.isTyping;

  if (!isTyping) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
}
