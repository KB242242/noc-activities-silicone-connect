function normalizeZabbixApiUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);

    if (parsed.pathname.endsWith('/api_jsonrpc.php')) {
      return parsed.toString();
    }

    if (parsed.pathname.endsWith('/zabbix.php')) {
      parsed.pathname = '/api_jsonrpc.php';
      parsed.search = '';
      return parsed.toString();
    }

    // Accept base URL and force the proper RPC endpoint.
    parsed.pathname = '/api_jsonrpc.php';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return undefined;
  }
}

const ZABBIX_API_URL = normalizeZabbixApiUrl(process.env.ZABBIX_API_URL);
const ZABBIX_API_TOKEN = process.env.ZABBIX_API_TOKEN;

interface ZabbixApiError {
  code: number;
  message: string;
  data?: string;
}

interface ZabbixApiResponse<T> {
  jsonrpc: '2.0';
  result?: T;
  error?: ZabbixApiError;
  id: number;
}

export function isZabbixConfigured(): boolean {
  return Boolean(ZABBIX_API_URL && ZABBIX_API_TOKEN);
}

export async function zabbixRequest<T>(
  method: string,
  params: Record<string, unknown> | unknown[] = {}
): Promise<T> {
  if (!ZABBIX_API_URL || !ZABBIX_API_TOKEN) {
    throw new Error('Zabbix API non configuree. Definir ZABBIX_API_URL et ZABBIX_API_TOKEN.');
  }

  const call = async (
    payload: Record<string, unknown>,
    useBearerHeader: boolean
  ): Promise<ZabbixApiResponse<T>> => {
    const response = await fetch(ZABBIX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(useBearerHeader ? { Authorization: `Bearer ${ZABBIX_API_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Zabbix HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as ZabbixApiResponse<T>;
  };

  const basePayload: Record<string, unknown> = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  // apiinfo.version must be called without authorization on many instances.
  if (method === 'apiinfo.version') {
    const data = await call(basePayload, false);
    if (data.error) {
      throw new Error(
        `Zabbix RPC error ${data.error.code}: ${data.error.message}${data.error.data ? ` - ${data.error.data}` : ''}`
      );
    }
    if (!('result' in data)) {
      throw new Error('Reponse Zabbix invalide: champ result absent');
    }
    return data.result as T;
  }

  // Preferred mode: bearer token header.
  let data = await call(basePayload, true);

  // Compatibility fallback: some deployments still require legacy auth in JSON body.
  if (data.error && data.error.code === -32602 && data.error.data?.toLowerCase().includes('not authorized')) {
    const legacyPayload = {
      ...basePayload,
      auth: ZABBIX_API_TOKEN,
    };
    data = await call(legacyPayload, false);
  }

  if (data.error) {
    throw new Error(
      `Zabbix RPC error ${data.error.code}: ${data.error.message}${data.error.data ? ` - ${data.error.data}` : ''}`
    );
  }

  if (!('result' in data)) {
    throw new Error('Reponse Zabbix invalide: champ result absent');
  }

  return data.result as T;
}
