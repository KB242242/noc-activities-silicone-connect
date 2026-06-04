import type { TicketLocalityDraft } from '@/features/app-shell/core/shared/types';

export type UpdateLocalityRequestBody = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  departement: string;
  city: string;
  arrondissement: string;
  quartier: string;
  address: string;
  reference: string;
  requesterId?: string;
};

function parseApiError(errorPayload: any, fallback: string): Error {
  return new Error(String(errorPayload?.error ?? fallback));
}

export async function createTicketLocalityRequest(body: Partial<TicketLocalityDraft> & { requesterId?: string }): Promise<any> {
  const response = await fetch('/api/tickets/localities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw parseApiError(errorPayload, 'locality_create_failed');
  }

  return response.json();
}

export async function updateTicketLocalityRequest(body: UpdateLocalityRequestBody): Promise<any> {
  const response = await fetch('/api/tickets/localities', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw parseApiError(payload, 'update_locality_failed');
  }

  return response.json().catch(() => ({}));
}

export async function deleteTicketLocalityRequest(id: string, requesterId?: string): Promise<void> {
  const response = await fetch('/api/tickets/localities', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, requesterId }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw parseApiError(payload, 'delete_locality_failed');
  }
}