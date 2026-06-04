import type { ReactNode, RefObject } from 'react';

type AppEmailMessagesViewportProps = {
  messageContainerRef: RefObject<HTMLDivElement | null>;
  setShowScrollToBottom: (value: boolean) => void;
  children: ReactNode;
};

export function AppEmailMessagesViewport({
  messageContainerRef,
  setShowScrollToBottom,
  children,
}: AppEmailMessagesViewportProps) {
  return (
    <div
      ref={messageContainerRef}
      className="flex-1 min-h-0 overflow-y-auto p-4 relative z-10 chat-scrollbar"
      onScroll={(event) => {
        const target = event.currentTarget;
        const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        setShowScrollToBottom(distanceFromBottom > 120);
      }}
    >
      {children}
    </div>
  );
}