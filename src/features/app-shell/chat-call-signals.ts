import type { CallHistory } from '@/features/app-shell/types';

export type IncomingCallRequest = {
  callId: string;
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  callMediaType: 'audio' | 'video';
};

export type IncomingCallResponse = {
  response: 'accepted' | 'rejected' | 'busy' | 'ignored';
  fromName: string;
};

export function getIncomingCallRequest(
  signal: any,
  currentUserId: string
): IncomingCallRequest | null {
  if (!signal || typeof signal !== 'object') return null;
  if (signal.signalType !== 'call_request') return null;
  if (signal.fromUserId === currentUserId) return null;

  const targets = Array.isArray(signal.toUserIds)
    ? signal.toUserIds.filter((id: unknown) => typeof id === 'string')
    : [];
  if (!targets.includes(currentUserId)) return null;

  return {
    callId: String(signal.callId || ''),
    conversationId: String(signal.conversationId || ''),
    fromUserId: String(signal.fromUserId || ''),
    fromUserName: String(signal.fromUserName || 'Inconnu'),
    callMediaType: signal.callMediaType === 'video' ? 'video' : 'audio',
  };
}

export function buildIncomingCallFromRequest(
  request: IncomingCallRequest,
  currentUserId: string,
  currentUserName: string,
  fallbackConversationId: string,
  fallbackCallId: string
): CallHistory {
  return {
    id: request.callId || fallbackCallId,
    conversationId: request.conversationId || fallbackConversationId,
    callerId: request.fromUserId,
    callerName: request.fromUserName,
    calleeId: currentUserId,
    calleeName: currentUserName || 'Vous',
    type: request.callMediaType,
    status: 'ongoing',
    startedAt: new Date(),
  };
}

export function getIncomingCallResponse(
  signal: any,
  currentUserId: string,
  activeCallId: string
): IncomingCallResponse | null {
  if (!signal || typeof signal !== 'object') return null;
  if (signal.signalType !== 'call_response') return null;
  if (signal.toUserId !== currentUserId) return null;
  if (String(signal.callId || '') !== activeCallId) return null;

  const raw = String(signal.response || 'ignored');
  const response: IncomingCallResponse['response'] =
    raw === 'accepted' || raw === 'rejected' || raw === 'busy' ? raw : 'ignored';

  return {
    response,
    fromName: String(signal.fromUserName || 'Correspondant'),
  };
}
