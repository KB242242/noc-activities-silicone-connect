function normalizeLibreNmsApiUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

const LIBRENMS_API_URL = normalizeLibreNmsApiUrl(process.env.LibreNMS_API_URL);
const LIBRENMS_API_TOKEN = process.env.LibreNMS_API_TOKEN;
const LIBRENMS_API_USER = process.env.LibreNMS_API_USER;

interface LibreNmsResponse<T> {
  status: 'ok' | 'error' | string;
  message?: string;
  count?: number;
  [key: string]: unknown;
  data?: T;
}

function buildLibreNmsUrl(path?: string): string {
  if (!LIBRENMS_API_URL) {
    throw new Error('LibreNMS API non configuree. Definir LibreNMS_API_URL et LibreNMS_API_TOKEN.');
  }

  const base = new URL(LIBRENMS_API_URL);

  if (!path || path.trim() === '') {
    return base.toString();
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const trimmed = path.trim().replace(/^\/+/, '');

  if (trimmed.startsWith('api/v0/')) {
    base.pathname = `/${trimmed}`;
    return base.toString();
  }

  const apiV0Index = base.pathname.indexOf('/api/v0');
  if (apiV0Index >= 0) {
    const prefix = base.pathname.slice(0, apiV0Index);
    base.pathname = `${prefix}/api/v0/${trimmed}`.replace(/\/+/g, '/');
    return base.toString();
  }

  base.pathname = `${base.pathname.replace(/\/+$/, '')}/${trimmed}`.replace(/\/+/g, '/');
  return base.toString();
}

export function isLibreNmsConfigured(): boolean {
  return Boolean(LIBRENMS_API_URL && LIBRENMS_API_TOKEN);
}

export async function libreNmsRequest<T>(path = ''): Promise<T> {
  if (!LIBRENMS_API_URL || !LIBRENMS_API_TOKEN) {
    throw new Error('LibreNMS API non configuree. Definir LibreNMS_API_URL et LibreNMS_API_TOKEN.');
  }

  const targetUrl = buildLibreNmsUrl(path);
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Auth-Token': LIBRENMS_API_TOKEN,
      ...(LIBRENMS_API_USER ? { 'X-Auth-User': LIBRENMS_API_USER } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`LibreNMS HTTP ${response.status}: ${response.statusText}`);
  }

  const payload = (await response.json()) as LibreNmsResponse<T>;
  if (payload.status && payload.status !== 'ok') {
    throw new Error(payload.message || `LibreNMS error: ${payload.status}`);
  }

  return payload as unknown as T;
}
