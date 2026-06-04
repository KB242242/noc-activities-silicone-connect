import type { TypingIndicator } from '@/features/app-shell/core/shared/types';

export type IncomingTypingSignal = {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  isRecording: boolean;
};

export function getIncomingTypingSignal(
  signal: any,
  currentUserId: string
): IncomingTypingSignal | null {
  if (!signal || signal.signalType !== 'typing') return null;
  if (signal.fromUserId === currentUserId) return null;

  const targets = Array.isArray(signal.toUserIds)
    ? signal.toUserIds.filter((id: unknown) => typeof id === 'string')
    : [];
  if (!targets.includes(currentUserId)) return null;

  return {
    conversationId: String(signal.conversationId || ''),
    userId: String(signal.fromUserId || ''),
    userName: String(signal.fromUserName || 'Utilisateur'),
    isTyping: Boolean(signal.isTyping),
    isRecording: Boolean(signal.isRecording),
  };
}

export function applyIncomingTypingSignal(
  typingIndicators: TypingIndicator[],
  signal: IncomingTypingSignal
): TypingIndicator[] {
  const filtered = typingIndicators.filter(
    (item) => !(item.conversationId === signal.conversationId && item.userId === signal.userId)
  );

  if (!signal.isTyping) {
    return filtered;
  }

  return [
    ...filtered,
    {
      conversationId: signal.conversationId,
      userId: signal.userId,
      userName: signal.userName,
      isTyping: true,
      isRecording: signal.isRecording,
      timestamp: new Date(),
    },
  ];
}

export function cleanupStaleTypingIndicators(
  typingIndicators: TypingIndicator[],
  nowMs: number,
  staleAfterMs = 4500
): TypingIndicator[] {
  return typingIndicators.filter(
    (item) => nowMs - new Date(item.timestamp).getTime() < staleAfterMs
  );
}