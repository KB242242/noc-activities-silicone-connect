type ChatRealtimeEventType =
  | 'new-message'
  | 'message-updated'
  | 'call-signal'
  | 'profile-updated';

export type ChatRealtimeEvent = {
  type: ChatRealtimeEventType;
  conversationId: string;
  message?: any;
  signal?: Record<string, unknown>;
  user?: {
    id: string;
    name?: string;
    avatar?: string | null;
  };
};

type Listener = (event: ChatRealtimeEvent) => void;

const listenersByUserId = new Map<string, Set<Listener>>();

export function subscribeChatEvents(userId: string, listener: Listener): () => void {
  const listeners = listenersByUserId.get(userId) || new Set<Listener>();
  listeners.add(listener);
  listenersByUserId.set(userId, listeners);

  return () => {
    const current = listenersByUserId.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listenersByUserId.delete(userId);
    }
  };
}

export function publishChatEvent(targetUserIds: string[], event: ChatRealtimeEvent) {
  const uniqueTargets = Array.from(new Set(targetUserIds.filter(Boolean)));
  uniqueTargets.forEach((userId) => {
    const listeners = listenersByUserId.get(userId);
    if (!listeners || listeners.size === 0) return;
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('chat realtime listener error:', error);
      }
    });
  });
}
