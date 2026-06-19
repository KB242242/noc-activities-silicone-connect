import { promises as fs } from 'fs';
import path from 'path';

export type NocReportingSettings = {
  timeZone: string;
  daily: {
    readyHour: number;
    cutoffHour: number;
  };
  night: {
    readyHour: number;
    cutoffHour: number;
  };
  updatedAt: string;
  updatedBy: string | null;
};

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'noc_reporting_settings.json');

function nowIso() {
  return new Date().toISOString();
}

export function defaultNocReportingSettings(): NocReportingSettings {
  return {
    timeZone: 'Africa/Brazzaville',
    daily: {
      readyHour: 18,
      cutoffHour: 21,
    },
    night: {
      readyHour: 6,
      cutoffHour: 10,
    },
    updatedAt: nowIso(),
    updatedBy: null,
  };
}

function sanitizeHour(value: unknown, fallback: number): number {
  const hour = Number(value);
  if (!Number.isFinite(hour)) return fallback;
  const rounded = Math.trunc(hour);
  if (rounded < 0 || rounded > 23) return fallback;
  return rounded;
}

function sanitizeTimeZone(value: unknown, fallback: string): string {
  const tz = String(value ?? '').trim();
  if (!tz) return fallback;

  try {
    Intl.DateTimeFormat('fr-FR', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return fallback;
  }
}

function sanitize(raw: Partial<NocReportingSettings> | null | undefined): NocReportingSettings {
  const defaults = defaultNocReportingSettings();

  return {
    timeZone: sanitizeTimeZone(raw?.timeZone, defaults.timeZone),
    daily: {
      readyHour: sanitizeHour(raw?.daily?.readyHour, defaults.daily.readyHour),
      cutoffHour: sanitizeHour(raw?.daily?.cutoffHour, defaults.daily.cutoffHour),
    },
    night: {
      readyHour: sanitizeHour(raw?.night?.readyHour, defaults.night.readyHour),
      cutoffHour: sanitizeHour(raw?.night?.cutoffHour, defaults.night.cutoffHour),
    },
    updatedAt: String(raw?.updatedAt ?? defaults.updatedAt),
    updatedBy: raw?.updatedBy ? String(raw.updatedBy) : null,
  };
}

export async function loadNocReportingSettings(): Promise<NocReportingSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    return sanitize(JSON.parse(raw) as Partial<NocReportingSettings>);
  } catch {
    const defaults = defaultNocReportingSettings();
    await saveNocReportingSettings(defaults);
    return defaults;
  }
}

export async function saveNocReportingSettings(settings: NocReportingSettings): Promise<NocReportingSettings> {
  const safe = sanitize(settings);
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}
