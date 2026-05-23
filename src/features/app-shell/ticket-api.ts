export class TicketApiRequestError extends Error {
  status: number;

  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.name = 'TicketApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

async function updateTicketRequest(params: {
  ticketId: string;
  payload: Record<string, unknown>;
  errorMessage: string;
}): Promise<any> {
  const response = await fetch(`/api/tickets/${params.ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.payload),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new TicketApiRequestError(params.errorMessage, response.status, payload);
  }

  return payload;
}

export async function deleteTicketRequest(params: {
  ticketId: string;
  permanent: boolean;
  deletedBy?: string;
  deletedByName?: string;
}): Promise<any> {
  const response = await fetch(`/api/tickets/${params.ticketId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      permanent: params.permanent,
      deletedBy: params.deletedBy,
      deletedByName: params.deletedByName,
    }),
  });

  if (!response.ok) {
    throw new Error('delete_failed');
  }

  return response.json().catch(() => ({}));
}

export async function restoreTicketRequest(params: {
  ticketId: string;
  restoredBy?: string;
  restoredByName?: string;
}): Promise<void> {
  const response = await fetch(`/api/tickets/${params.ticketId}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restoredBy: params.restoredBy,
      restoredByName: params.restoredByName,
    }),
  });

  if (!response.ok) {
    throw new Error('restore_failed');
  }
}

export async function unarchiveTicketRequest(params: {
  ticketId: string;
  updatedBy?: string;
  updatedById?: string;
}): Promise<void> {
  await updateTicketRequest({
    ticketId: params.ticketId,
    payload: {
      isArchived: false,
      archivedAt: null,
      archivedYear: null,
      updatedBy: params.updatedBy,
      updatedById: params.updatedById,
    },
    errorMessage: 'unarchive_failed',
  });
}

export async function updateTicketStatusRequest(params: {
  ticketId: string;
  status: string;
  updatedBy?: string;
  updatedById?: string;
}): Promise<any> {
  return updateTicketRequest({
    ticketId: params.ticketId,
    payload: {
      status: params.status,
      updatedBy: params.updatedBy,
      updatedById: params.updatedById,
    },
    errorMessage: 'status_update_failed',
  });
}

export async function updateTicketDetailsRequest(params: {
  ticketId: string;
  objet: string;
  description: string;
  status: string;
  priority: string;
  siteIds: string[];
  siteNames: string[];
  localities: string[];
  technicianIds: string[];
  technicianNames: Array<{ id: string; name: string }>;
  updatedBy?: string;
  updatedById?: string;
}): Promise<any> {
  return updateTicketRequest({
    ticketId: params.ticketId,
    payload: {
      objet: params.objet,
      description: params.description,
      status: params.status,
      priority: params.priority,
      siteIds: params.siteIds,
      siteNames: params.siteNames,
      localities: params.localities,
      technicianIds: params.technicianIds,
      technicianNames: params.technicianNames,
      updatedBy: params.updatedBy,
      updatedById: params.updatedById,
    },
    errorMessage: 'ticket_update_failed',
  });
}
