import { promises as fs } from 'fs';
import path from 'path';

export type AllowedEmailDomain = {
  id: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type AllowedEmailDomainStore = {
  domains: AllowedEmailDomain[];
};

const DOMAINS_FILE = path.join(process.cwd(), 'data', 'user_email_domains.json');

function nowIso() {
  return new Date().toISOString();
}

function normalizeDomain(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\/+$/, '');
}

function buildDefaultDomains(): AllowedEmailDomainStore {
  const now = nowIso();
  return {
    domains: [
      {
        id: 'siliconeconnect.com',
        domain: 'siliconeconnect.com',
        isActive: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'gmail.com',
        domain: 'gmail.com',
        isActive: false,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

function sanitizeStore(raw: Partial<AllowedEmailDomainStore> | null | undefined): AllowedEmailDomainStore {
  const defaults = buildDefaultDomains();
  const source = Array.isArray(raw?.domains) ? raw?.domains : defaults.domains;

  const mapped = source
    .map((entry: any) => {
      const domain = normalizeDomain(entry?.domain ?? entry?.id ?? '');
      if (!domain) return null;
      const timestamp = nowIso();
      return {
        id: String(entry?.id ?? domain),
        domain,
        isActive: Boolean(entry?.isActive ?? true),
        isDefault: Boolean(entry?.isDefault ?? false),
        createdAt: String(entry?.createdAt ?? timestamp),
        updatedAt: String(entry?.updatedAt ?? timestamp),
      } as AllowedEmailDomain;
    })
    .filter((entry): entry is AllowedEmailDomain => Boolean(entry));

  const dedup = new Map<string, AllowedEmailDomain>();
  for (const entry of mapped) {
    dedup.set(entry.domain, {
      ...entry,
      id: entry.domain,
    });
  }

  const domains = Array.from(dedup.values());
  if (!domains.some((entry) => entry.domain === 'siliconeconnect.com')) {
    const now = nowIso();
    domains.unshift({
      id: 'siliconeconnect.com',
      domain: 'siliconeconnect.com',
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!domains.some((entry) => entry.isDefault && entry.isActive)) {
    const preferred = domains.find((entry) => entry.domain === 'siliconeconnect.com')
      ?? domains.find((entry) => entry.isActive)
      ?? domains[0];
    if (preferred) {
      for (const entry of domains) {
        entry.isDefault = entry.domain === preferred.domain;
      }
    }
  }

  return { domains };
}

export async function loadAllowedEmailDomains(): Promise<AllowedEmailDomainStore> {
  try {
    const raw = await fs.readFile(DOMAINS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AllowedEmailDomainStore>;
    return sanitizeStore(parsed);
  } catch {
    const defaults = buildDefaultDomains();
    await saveAllowedEmailDomains(defaults);
    return defaults;
  }
}

export async function saveAllowedEmailDomains(store: AllowedEmailDomainStore) {
  const safe = sanitizeStore(store);
  await fs.mkdir(path.dirname(DOMAINS_FILE), { recursive: true });
  await fs.writeFile(DOMAINS_FILE, JSON.stringify(safe, null, 2), 'utf8');
}

export function extractEmailDomain(email: string) {
  const value = String(email ?? '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 0 || at === value.length - 1) return '';
  return normalizeDomain(value.slice(at + 1));
}

export function isEmailDomainAllowed(email: string, domains: AllowedEmailDomain[]) {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return domains.some((entry) => entry.isActive && entry.domain === domain);
}

export function defaultEmailDomain(domains: AllowedEmailDomain[]) {
  return domains.find((entry) => entry.isDefault && entry.isActive)
    ?? domains.find((entry) => entry.isActive)
    ?? null;
}
