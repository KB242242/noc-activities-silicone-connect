const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function fetchNocOverviewRequest(): Promise<any> {
  const response = await fetch('/api/noc/overview', {
    cache: 'no-store',
    headers: NO_CACHE_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Echec de synchronisation NOC');
  }

  return response.json().catch(() => ({}));
}

export async function fetchNocMonthlyConsumptionRequest(): Promise<any> {
  const response = await fetch('/api/noc/reporting/consumption?scope=monthly', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Generation du rapport impossible');
  }

  return response.json().catch(() => ({}));
}