import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

type WorkingHourRow = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
};

type HolidayRow = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  notes: string | null;
};

async function ensureCalendarTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_client_working_hours (
      id_working_hour INT NOT NULL AUTO_INCREMENT,
      client_id BIGINT UNSIGNED NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      label VARCHAR(120) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_working_hour),
      KEY idx_noc_client_working_hours_client (client_id),
      CONSTRAINT fk_noc_client_working_hours_client FOREIGN KEY (client_id)
        REFERENCES noc_clients(id_client) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS noc_client_holidays (
      id_holiday INT NOT NULL AUTO_INCREMENT,
      client_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(160) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_holiday),
      KEY idx_noc_client_holidays_client (client_id),
      CONSTRAINT fk_noc_client_holidays_client FOREIGN KEY (client_id)
        REFERENCES noc_clients(id_client) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE noc_client_working_hours
    MODIFY COLUMN client_id BIGINT UNSIGNED NOT NULL
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE noc_client_holidays
    MODIFY COLUMN client_id BIGINT UNSIGNED NOT NULL
  `);
}

async function resolveClientId(clientRef: string): Promise<number | null> {
  const rows = await db.$queryRaw<Array<{ id_client: number }>>`
    SELECT id_client
    FROM noc_clients
    WHERE client_ref = ${clientRef}
    LIMIT 1
  `;

  return rows[0]?.id_client ? Number(rows[0].id_client) : null;
}

async function readWorkingHours(clientId: number): Promise<WorkingHourRow[]> {
  return db.$queryRaw<WorkingHourRow[]>`
    SELECT
      id_working_hour AS id,
      day_of_week AS dayOfWeek,
      TIME_FORMAT(start_time, '%H:%i') AS startTime,
      TIME_FORMAT(end_time, '%H:%i') AS endTime,
      label
    FROM noc_client_working_hours
    WHERE client_id = ${clientId}
    ORDER BY day_of_week ASC, start_time ASC
  `;
}

async function readHolidays(clientId: number): Promise<HolidayRow[]> {
  return db.$queryRaw<HolidayRow[]>`
    SELECT
      id_holiday AS id,
      title,
      DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate,
      DATE_FORMAT(end_date, '%Y-%m-%d') AS endDate,
      notes
    FROM noc_client_holidays
    WHERE client_id = ${clientId}
    ORDER BY start_date ASC, end_date ASC
  `;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientRef = String(searchParams.get('clientRef') ?? '').trim();

  if (!clientRef) {
    return NextResponse.json({ success: false, error: 'clientRef requis' }, { status: 400 });
  }

  try {
    await ensureCalendarTables();
    const clientId = await resolveClientId(clientRef);
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
    }

    const [workingHours, holidays] = await Promise.all([
      readWorkingHours(clientId),
      readHolidays(clientId),
    ]);

    return NextResponse.json({ success: true, workingHours, holidays });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCalendarTables();
    const body = await request.json() as {
      clientRef?: string;
      action?: 'working-hour' | 'holiday';
      payload?: Record<string, unknown>;
    };

    const clientRef = String(body.clientRef ?? '').trim();
    if (!clientRef) {
      return NextResponse.json({ success: false, error: 'clientRef requis' }, { status: 400 });
    }

    const clientId = await resolveClientId(clientRef);
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
    }

    if (body.action === 'working-hour') {
      const dayOfWeeksRaw = Array.isArray(body.payload?.dayOfWeeks)
        ? body.payload?.dayOfWeeks
        : [body.payload?.dayOfWeek];
      const dayOfWeeks = Array.from(
        new Set(
          dayOfWeeksRaw
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        )
      );
      const startTime = String(body.payload?.startTime ?? '').trim();
      const endTime = String(body.payload?.endTime ?? '').trim();
      const label = body.payload?.label ? String(body.payload.label).trim() : null;

      if (dayOfWeeks.length === 0 || !startTime || !endTime) {
        return NextResponse.json({ success: false, error: 'Plage horaire invalide' }, { status: 400 });
      }

      await Promise.all(
        dayOfWeeks.map((dayOfWeek) =>
          db.$executeRaw`
            INSERT INTO noc_client_working_hours (client_id, day_of_week, start_time, end_time, label)
            VALUES (${clientId}, ${dayOfWeek}, ${startTime}, ${endTime}, ${label})
          `
        )
      );

      return NextResponse.json({ success: true, workingHours: await readWorkingHours(clientId) });
    }

    if (body.action === 'holiday') {
      const title = String(body.payload?.title ?? '').trim();
      const startDate = String(body.payload?.startDate ?? '').trim();
      const endDate = String(body.payload?.endDate ?? '').trim();
      const notes = body.payload?.notes ? String(body.payload.notes).trim() : null;

      if (!title || !startDate || !endDate) {
        return NextResponse.json({ success: false, error: 'Période de congé invalide' }, { status: 400 });
      }

      await db.$executeRaw`
        INSERT INTO noc_client_holidays (client_id, title, start_date, end_date, notes)
        VALUES (${clientId}, ${title}, ${startDate}, ${endDate}, ${notes})
      `;

      return NextResponse.json({ success: true, holidays: await readHolidays(clientId) });
    }

    return NextResponse.json({ success: false, error: 'Action non supportée' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureCalendarTables();
    const body = await request.json() as {
      clientRef?: string;
      kind?: 'working-hour' | 'holiday';
      id?: number;
    };

    const clientRef = String(body.clientRef ?? '').trim();
    const entryId = Number(body.id ?? 0);
    if (!clientRef || !entryId) {
      return NextResponse.json({ success: false, error: 'Paramètres de suppression invalides' }, { status: 400 });
    }

    const clientId = await resolveClientId(clientRef);
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
    }

    if (body.kind === 'working-hour') {
      await db.$executeRaw`
        DELETE FROM noc_client_working_hours
        WHERE id_working_hour = ${entryId} AND client_id = ${clientId}
      `;

      return NextResponse.json({ success: true, workingHours: await readWorkingHours(clientId) });
    }

    if (body.kind === 'holiday') {
      await db.$executeRaw`
        DELETE FROM noc_client_holidays
        WHERE id_holiday = ${entryId} AND client_id = ${clientId}
      `;

      return NextResponse.json({ success: true, holidays: await readHolidays(clientId) });
    }

    return NextResponse.json({ success: false, error: 'Type de suppression non supporté' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureCalendarTables();
    const body = await request.json() as {
      clientRef?: string;
      action?: 'working-hour' | 'holiday';
      id?: number;
      payload?: Record<string, unknown>;
    };

    const clientRef = String(body.clientRef ?? '').trim();
    const entryId = Number(body.id ?? 0);
    if (!clientRef || !entryId) {
      return NextResponse.json({ success: false, error: 'Paramètres de mise à jour invalides' }, { status: 400 });
    }

    const clientId = await resolveClientId(clientRef);
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
    }

    if (body.action === 'working-hour') {
      const dayOfWeek = Number(body.payload?.dayOfWeek ?? -1);
      const startTime = String(body.payload?.startTime ?? '').trim();
      const endTime = String(body.payload?.endTime ?? '').trim();
      const label = body.payload?.label ? String(body.payload.label).trim() : null;

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) {
        return NextResponse.json({ success: false, error: 'Plage horaire invalide' }, { status: 400 });
      }

      await db.$executeRaw`
        UPDATE noc_client_working_hours
        SET day_of_week = ${dayOfWeek}, start_time = ${startTime}, end_time = ${endTime}, label = ${label}
        WHERE id_working_hour = ${entryId} AND client_id = ${clientId}
      `;

      return NextResponse.json({ success: true, workingHours: await readWorkingHours(clientId) });
    }

    if (body.action === 'holiday') {
      const title = String(body.payload?.title ?? '').trim();
      const startDate = String(body.payload?.startDate ?? '').trim();
      const endDate = String(body.payload?.endDate ?? '').trim();
      const notes = body.payload?.notes ? String(body.payload.notes).trim() : null;

      if (!title || !startDate || !endDate) {
        return NextResponse.json({ success: false, error: 'Période de congé invalide' }, { status: 400 });
      }

      await db.$executeRaw`
        UPDATE noc_client_holidays
        SET title = ${title}, start_date = ${startDate}, end_date = ${endDate}, notes = ${notes}
        WHERE id_holiday = ${entryId} AND client_id = ${clientId}
      `;

      return NextResponse.json({ success: true, holidays: await readHolidays(clientId) });
    }

    return NextResponse.json({ success: false, error: 'Action non supportée' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
