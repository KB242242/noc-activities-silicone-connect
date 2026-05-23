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
