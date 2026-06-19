import { promises as fs } from 'fs';
import path from 'path';

export type NocClientSettings = {
  idStyle: {
    prefix: string;
    fixedYear: number;
    padding: number;
    nextSequence: number;
    allowManualRef: boolean;
  };
  permissions: {
    allowCreate: boolean;
    allowUpdate: boolean;
    allowDelete: boolean;
    allowArchive: boolean;
    deleteRoles: string[];
  };
  api: {
    enableRead: boolean;
    enableWrite: boolean;
    enableZabbixSync: boolean;
    enableLibreNmsFields: boolean;
  };
  ui: {
    defaultViewMode: 'cards' | 'table' | 'compact';
    showLocality: boolean;
    showCountry: boolean;
    showClientType: boolean;
    showSatisfaction: boolean;
  };
  updatedAt: string;
  updatedBy: string | null;
};

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'noc_client_settings.json');

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRole(value: string): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
}

export function defaultNocClientSettings(): NocClientSettings {
  const now = nowIso();
  return {
    idStyle: {
      prefix: 'CLI',
      fixedYear: new Date().getFullYear(),
      padding: 5,
      nextSequence: 66,
      allowManualRef: false,
    },
    permissions: {
      allowCreate: true,
      allowUpdate: true,
      allowDelete: true,
      allowArchive: true,
      deleteRoles: ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR'],
    },
    api: {
      enableRead: true,
      enableWrite: true,
      enableZabbixSync: true,
      enableLibreNmsFields: true,
    },
    ui: {
      defaultViewMode: 'table',
      showLocality: true,
      showCountry: true,
      showClientType: true,
      showSatisfaction: true,
    },
    updatedAt: now,
    updatedBy: null,
  };
}

function sanitize(raw: Partial<NocClientSettings> | null | undefined): NocClientSettings {
  const defaults = defaultNocClientSettings();

  const prefix = String(raw?.idStyle?.prefix ?? defaults.idStyle.prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || defaults.idStyle.prefix;

  const fixedYear = Number(raw?.idStyle?.fixedYear ?? defaults.idStyle.fixedYear);
  const padding = Number(raw?.idStyle?.padding ?? defaults.idStyle.padding);
  const nextSequence = Number(raw?.idStyle?.nextSequence ?? defaults.idStyle.nextSequence);

  const deleteRolesSource = Array.isArray(raw?.permissions?.deleteRoles)
    ? raw?.permissions?.deleteRoles
    : defaults.permissions.deleteRoles;

  const deleteRoles = Array.from(
    new Set(
      deleteRolesSource
        .map((entry) => normalizeRole(String(entry ?? '')))
        .filter(Boolean)
    )
  );

  return {
    idStyle: {
      prefix,
      fixedYear: Number.isFinite(fixedYear) && fixedYear >= 2000 && fixedYear <= 2999 ? Math.trunc(fixedYear) : defaults.idStyle.fixedYear,
      padding: Number.isFinite(padding) && padding >= 3 && padding <= 8 ? Math.trunc(padding) : defaults.idStyle.padding,
      nextSequence: Number.isFinite(nextSequence) && nextSequence >= 1 ? Math.trunc(nextSequence) : defaults.idStyle.nextSequence,
      allowManualRef: Boolean(raw?.idStyle?.allowManualRef ?? defaults.idStyle.allowManualRef),
    },
    permissions: {
      allowCreate: Boolean(raw?.permissions?.allowCreate ?? defaults.permissions.allowCreate),
      allowUpdate: Boolean(raw?.permissions?.allowUpdate ?? defaults.permissions.allowUpdate),
      allowDelete: Boolean(raw?.permissions?.allowDelete ?? defaults.permissions.allowDelete),
      allowArchive: Boolean(raw?.permissions?.allowArchive ?? defaults.permissions.allowArchive),
      deleteRoles: deleteRoles.length > 0 ? deleteRoles : defaults.permissions.deleteRoles,
    },
    api: {
      enableRead: Boolean(raw?.api?.enableRead ?? defaults.api.enableRead),
      enableWrite: Boolean(raw?.api?.enableWrite ?? defaults.api.enableWrite),
      enableZabbixSync: Boolean(raw?.api?.enableZabbixSync ?? defaults.api.enableZabbixSync),
      enableLibreNmsFields: Boolean(raw?.api?.enableLibreNmsFields ?? defaults.api.enableLibreNmsFields),
    },
    ui: {
      defaultViewMode:
        raw?.ui?.defaultViewMode === 'cards' || raw?.ui?.defaultViewMode === 'compact' || raw?.ui?.defaultViewMode === 'table'
          ? raw.ui.defaultViewMode
          : defaults.ui.defaultViewMode,
      showLocality: Boolean(raw?.ui?.showLocality ?? defaults.ui.showLocality),
      showCountry: Boolean(raw?.ui?.showCountry ?? defaults.ui.showCountry),
      showClientType: Boolean(raw?.ui?.showClientType ?? defaults.ui.showClientType),
      showSatisfaction: Boolean(raw?.ui?.showSatisfaction ?? defaults.ui.showSatisfaction),
    },
    updatedAt: String(raw?.updatedAt ?? defaults.updatedAt),
    updatedBy: raw?.updatedBy ? String(raw.updatedBy) : null,
  };
}

export async function loadNocClientSettings(): Promise<NocClientSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    return sanitize(JSON.parse(raw) as Partial<NocClientSettings>);
  } catch {
    const defaults = defaultNocClientSettings();
    await saveNocClientSettings(defaults);
    return defaults;
  }
}

export async function saveNocClientSettings(store: NocClientSettings): Promise<NocClientSettings> {
  const safe = sanitize(store);
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}
