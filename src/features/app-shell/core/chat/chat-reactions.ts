import type { LiveReaction } from '@/features/app-shell/core/shared/types';

export type IncomingReactionSignal = {
  emoji: string;
  conversationId: string;
  callId?: string;
  userId: string;
  userName: string;
};

export function getIncomingReactionSignal(
  signal: any,
  currentUserId: string
): IncomingReactionSignal | null {
  if (!signal || signal.signalType !== 'live_reaction') return null;
  if (signal.fromUserId === currentUserId) return null;

  const targets = Array.isArray(signal.toUserIds)
    ? signal.toUserIds.filter((id: unknown) => typeof id === 'string')
    : [];
  if (!targets.includes(currentUserId)) return null;

  const emoji = String(signal.emoji || '').trim();
  if (!emoji) return null;

  return {
    emoji,
    conversationId: String(signal.conversationId || ''),
    callId: signal.callId ? String(signal.callId) : undefined,
    userId: String(signal.fromUserId || ''),
    userName: String(signal.fromUserName || 'Utilisateur'),
  };
}

export function cleanupStaleLiveReactions(
  reactions: LiveReaction[],
  nowMs: number,
  staleAfterMs = 8000
): LiveReaction[] {
  return reactions.filter((item) => nowMs - new Date(item.createdAt).getTime() < staleAfterMs);
}