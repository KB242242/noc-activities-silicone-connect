export async function fetchAuditLogRequest(): Promise<any[]> {
  const response = await fetch('/api/system?action=getAuditLog', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('audit_log_fetch_failed');
  }

  const result = await response.json().catch(() => ({}));
  return Array.isArray(result?.logs) ? result.logs : [];
}