import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type TicketSettings = {
  numberFormat: string;
  numberSeed: number;
  notificationEmails: string[];
  defaultSlaHours: number;
  trashRetentionDays: number;
  slaByCategory: Record<string, number>;
};

const STORE_FILE = path.join(process.cwd(), 'data', 'ticket_settings.json');

const DEFAULT_SETTINGS: TicketSettings = {
  numberFormat: '#SC{date}-{seq}',
  numberSeed: 100000000,
  notificationEmails: ['ange.bata@siliconeconnect.com'],
  defaultSlaHours: 24,
  trashRetentionDays: 30,
  slaByCategory: {
    deployment: 24,
    supervision: 8,
    ravitaillement: 24,
    routine_visit: 48,
    security: 4,
    maintenance: 12,
    incident: 4,
    survey: 72,
  },
};

async function ensureStore(): Promise<void> {
  const dir = path.dirname(STORE_FILE);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
  }
}

async function readStore(): Promise<TicketSettings> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Partial<TicketSettings>;
    return {
      numberFormat: typeof parsed.numberFormat === 'string' && parsed.numberFormat.trim() ? parsed.numberFormat.trim() : DEFAULT_SETTINGS.numberFormat,
      numberSeed: Number.isFinite(Number(parsed.numberSeed)) ? Number(parsed.numberSeed) : DEFAULT_SETTINGS.numberSeed,
      notificationEmails: Array.isArray(parsed.notificationEmails)
        ? parsed.notificationEmails.map((item) => String(item).trim()).filter(Boolean)
        : DEFAULT_SETTINGS.notificationEmails,
      defaultSlaHours: Number.isFinite(Number(parsed.defaultSlaHours)) ? Number(parsed.defaultSlaHours) : DEFAULT_SETTINGS.defaultSlaHours,
      trashRetentionDays: Number.isFinite(Number(parsed.trashRetentionDays))
        ? Math.min(365, Math.max(1, Math.floor(Number(parsed.trashRetentionDays))))
        : DEFAULT_SETTINGS.trashRetentionDays,
      slaByCategory: {
        ...DEFAULT_SETTINGS.slaByCategory,
        ...(parsed.slaByCategory && typeof parsed.slaByCategory === 'object' ? parsed.slaByCategory : {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeStore(value: TicketSettings): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_FILE, JSON.stringify(value, null, 2), 'utf8');
}

function canManage(body: unknown): boolean {
  const role = String((body as { role?: string })?.role ?? '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET() {
  try {
    const settings = await readStore();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[tickets/settings GET]', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!canManage(body)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const numberFormat = String(body.numberFormat ?? '').trim();
    const numberSeed = Number(body.numberSeed);
    const notificationEmails = Array.isArray(body.notificationEmails)
      ? body.notificationEmails.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const defaultSlaHours = Number(body.defaultSlaHours);
    const trashRetentionDays = Number(body.trashRetentionDays);
    const rawSlaByCategory = body.slaByCategory && typeof body.slaByCategory === 'object' ? body.slaByCategory : {};

    const next: TicketSettings = {
      numberFormat: numberFormat || DEFAULT_SETTINGS.numberFormat,
      numberSeed: Number.isFinite(numberSeed) ? Math.max(1, Math.floor(numberSeed)) : DEFAULT_SETTINGS.numberSeed,
      notificationEmails: notificationEmails.length > 0 ? notificationEmails : DEFAULT_SETTINGS.notificationEmails,
      defaultSlaHours: Number.isFinite(defaultSlaHours) ? Math.max(1, Math.floor(defaultSlaHours)) : DEFAULT_SETTINGS.defaultSlaHours,
      trashRetentionDays: Number.isFinite(trashRetentionDays)
        ? Math.min(365, Math.max(1, Math.floor(trashRetentionDays)))
        : DEFAULT_SETTINGS.trashRetentionDays,
      slaByCategory: {
        ...DEFAULT_SETTINGS.slaByCategory,
        ...Object.fromEntries(
          Object.entries(rawSlaByCategory)
            .map(([key, value]) => [key, Math.max(1, Math.floor(Number(value) || 0))])
            .filter(([, value]) => Number.isFinite(value) && value > 0)
        ),
      },
    };

    await writeStore(next);
    return NextResponse.json({ success: true, settings: next });
  } catch (error) {
    console.error('[tickets/settings PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
