import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface MappingRow {
  id_mapping: number;
  id_client: string;
  hostid_zabbix: string;
  ip_client: string;
  nom_host: string;
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idClient = searchParams.get('idClient');
    const ipClient = searchParams.get('ipClient');
    const hostidZabbix = searchParams.get('hostidZabbix');

    const rows = await db.$queryRaw<MappingRow[]>`
      SELECT id_mapping, id_client, hostid_zabbix, ip_client, nom_host, created_at, updated_at
      FROM mapping_zabbix
      WHERE (${idClient} IS NULL OR id_client = ${idClient})
        AND (${ipClient} IS NULL OR ip_client = ${ipClient})
        AND (${hostidZabbix} IS NULL OR hostid_zabbix = ${hostidZabbix})
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error('NOC mapping GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Lecture mapping_zabbix impossible' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      idClient?: string;
      hostidZabbix?: string;
      ipClient?: string;
      nomHost?: string;
    };

    if (!body.idClient || !body.hostidZabbix || !body.ipClient || !body.nomHost) {
      return NextResponse.json(
        { success: false, error: 'idClient, hostidZabbix, ipClient et nomHost sont obligatoires' },
        { status: 400 }
      );
    }

    await db.$executeRaw`
      INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host)
      VALUES (${body.idClient}, ${body.hostidZabbix}, ${body.ipClient}, ${body.nomHost})
      ON DUPLICATE KEY UPDATE
        hostid_zabbix = VALUES(hostid_zabbix),
        ip_client = VALUES(ip_client),
        nom_host = VALUES(nom_host),
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('NOC mapping POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Ecriture mapping_zabbix impossible' },
      { status: 500 }
    );
  }
}
