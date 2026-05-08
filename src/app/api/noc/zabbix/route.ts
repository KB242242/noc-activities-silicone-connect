import { NextRequest, NextResponse } from 'next/server';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';

const ALLOWED_METHODS = new Set([
  'apiinfo.version',
  'item.get',
  'host.get',
  'trigger.get',
  'problem.get',
  'event.get',
]);

export async function GET() {
  const configured = isZabbixConfigured();
  if (!configured) {
    return NextResponse.json({
      success: false,
      configured,
      connectivity: 'DOWN',
      error: 'ZABBIX_API_URL ou ZABBIX_API_TOKEN manquant',
      allowedMethods: Array.from(ALLOWED_METHODS),
    });
  }

  try {
    const version = await zabbixRequest<string>('apiinfo.version', {});
    return NextResponse.json({
      success: true,
      configured,
      connectivity: 'UP',
      version,
      allowedMethods: Array.from(ALLOWED_METHODS),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured,
      connectivity: 'DOWN',
      error: error instanceof Error ? error.message : 'Erreur de test Zabbix',
      allowedMethods: Array.from(ALLOWED_METHODS),
    }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      method?: string;
      params?: Record<string, unknown> | unknown[];
    };

    if (!body.method) {
      return NextResponse.json(
        { success: false, error: 'Le champ method est obligatoire' },
        { status: 400 }
      );
    }

    if (!ALLOWED_METHODS.has(body.method)) {
      return NextResponse.json(
        { success: false, error: 'Methode non autorisee pour securite API' },
        { status: 403 }
      );
    }

    const result = await zabbixRequest<unknown>(body.method, body.params ?? {});

    return NextResponse.json({
      success: true,
      method: body.method,
      result,
    });
  } catch (error) {
    console.error('NOC Zabbix proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur de communication Zabbix' },
      { status: 500 }
    );
  }
}
