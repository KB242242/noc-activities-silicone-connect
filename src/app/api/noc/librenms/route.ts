import { NextRequest, NextResponse } from 'next/server';
import { isLibreNmsConfigured, libreNmsRequest } from '@/lib/noc/librenms';

const ALLOWED_ENDPOINTS = new Set(['devices', 'devices/up', 'devices/down', 'alerts']);

type LibreNmsDevice = {
  device_id: string | number;
  hostname?: string;
  status?: string | number;
  disabled?: string | number;
  ignore?: string | number;
};

type LibreNmsDevicesResponse = {
  status: string;
  count?: number;
  devices?: LibreNmsDevice[];
};

export async function GET() {
  const configured = isLibreNmsConfigured();
  if (!configured) {
    return NextResponse.json({
      success: false,
      configured,
      connectivity: 'DOWN',
      error: 'LibreNMS_API_URL ou LibreNMS_API_TOKEN manquant',
      allowedEndpoints: Array.from(ALLOWED_ENDPOINTS),
    });
  }

  try {
    const data = await libreNmsRequest<LibreNmsDevicesResponse>('');
    const devices = Array.isArray(data.devices) ? data.devices : [];
    const activeDevices = devices.filter((d) => String(d.disabled ?? '0') !== '1' && String(d.ignore ?? '0') !== '1');
    const up = activeDevices.filter((d) => String(d.status ?? '0') === '1').length;
    const down = Math.max(activeDevices.length - up, 0);

    return NextResponse.json({
      success: true,
      configured,
      connectivity: 'UP',
      totalDevices: activeDevices.length,
      upDevices: up,
      downDevices: down,
      allowedEndpoints: Array.from(ALLOWED_ENDPOINTS),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured,
      connectivity: 'DOWN',
      error: error instanceof Error ? error.message : 'Erreur de test LibreNMS',
      allowedEndpoints: Array.from(ALLOWED_ENDPOINTS),
    }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      endpoint?: string;
      query?: Record<string, string | number | boolean | null | undefined>;
    };

    const endpoint = (body.endpoint ?? '').trim().replace(/^\/+/, '');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Le champ endpoint est obligatoire' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return NextResponse.json(
        { success: false, error: 'Endpoint non autorise pour securite API' },
        { status: 403 }
      );
    }

    const searchParams = new URLSearchParams();
    const query = body.query ?? {};
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      searchParams.set(key, String(value));
    });

    const finalPath = searchParams.toString() ? `${endpoint}?${searchParams.toString()}` : endpoint;
    const result = await libreNmsRequest<unknown>(finalPath);

    return NextResponse.json({
      success: true,
      endpoint,
      result,
    });
  } catch (error) {
    console.error('NOC LibreNMS proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur de communication LibreNMS' },
      { status: 500 }
    );
  }
}
