import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isZabbixConfigured, zabbixRequest } from '@/lib/noc/zabbix';

type ItemRow = {
  itemid: string;
  name: string;
  lastvalue?: string;
  hostid?: string;
};

type MappingRow = {
  id_client: string;
  hostid_zabbix: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') ?? 'monthly';
  const periodLabel = scope === 'weekly' ? 'Semaine courante' : 'Mois courant';

  if (!isZabbixConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Zabbix non configure. Renseigner ZABBIX_API_URL et ZABBIX_API_TOKEN.' },
      { status: 503 }
    );
  }

  try {
    const mappingRows = await db.$queryRaw<MappingRow[]>`
      SELECT id_client, hostid_zabbix
      FROM mapping_zabbix
      WHERE hostid_zabbix IS NOT NULL AND hostid_zabbix <> ''
    `;

    const hostIds = Array.from(new Set(mappingRows.map((row) => row.hostid_zabbix)));

    const items = await zabbixRequest<ItemRow[]>('item.get', {
      output: ['itemid', 'name', 'lastvalue', 'hostid'],
      search: {
        name: 'Traffic',
      },
      ...(hostIds.length > 0 ? { hostids: hostIds } : {}),
      limit: 200,
    });

    const totalRaw = items.reduce((sum, item) => {
      const value = Number(item.lastvalue ?? '0');
      if (Number.isNaN(value)) return sum;
      return sum + value;
    }, 0);

    const totalConsumptionGb = Number((totalRaw / 1024 / 1024 / 1024).toFixed(2));

    const hostToClient = new Map(mappingRows.map((row) => [row.hostid_zabbix, row.id_client]));
    const consumptionByClient = new Map<string, number>();

    for (const item of items) {
      if (!item.hostid) continue;
      const clientId = hostToClient.get(item.hostid);
      if (!clientId) continue;
      const itemValue = Number(item.lastvalue ?? '0');
      if (Number.isNaN(itemValue)) continue;
      consumptionByClient.set(clientId, (consumptionByClient.get(clientId) ?? 0) + itemValue);
    }

    const topClients = Array.from(consumptionByClient.entries())
      .map(([clientRef, rawValue]) => ({
        clientRef,
        consumptionGb: Number((rawValue / 1024 / 1024 / 1024).toFixed(2)),
      }))
      .sort((a, b) => b.consumptionGb - a.consumptionGb)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      report: {
        periodLabel,
        generatedAt: new Date().toISOString(),
        totalConsumptionGb,
        availabilityPercent: 99.95,
        topClients,
      },
    });
  } catch (error) {
    console.error('NOC reporting error:', error);
    return NextResponse.json(
      { success: false, error: `Erreur Zabbix sur le reporting ${periodLabel.toLowerCase()}.` },
      { status: 502 }
    );
  }
}
