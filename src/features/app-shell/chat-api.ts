const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function fetchConversationMessagesRequest(
  conversationId: string,
  userId: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`/api/chat/conversations/${conversationId}/messages?userId=${userId}`, {
    cache: 'no-store',
    headers: NO_CACHE_HEADERS,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function fetchConversationsRequest(
  userId: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`/api/chat/conversations?userId=${userId}`, {
    cache: 'no-store',
    headers: NO_CACHE_HEADERS,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function createConversationRequest(payload: {
  type: 'individual' | 'group';
  name?: string;
  description?: string;
  createdBy: string;
  participantIds: string[];
}): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch('/api/chat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function sendConversationMessageRequest(
  conversationId: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function patchConversationMessageRequest(
  conversationId: string,
  messageId: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
