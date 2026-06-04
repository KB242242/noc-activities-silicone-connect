import { promises as fs } from 'fs';
import path from 'path';

export type UserEmailDomainPolicyMode = 'default' | 'custom' | 'allow_any';

export type UserEmailDomainPolicy = {
  userId: string;
  mode: UserEmailDomainPolicyMode;
  customDomains: string[];
  updatedAt: string;
  updatedBy?: string;
};

type UserEmailDomainPolicyStore = {
  policies: UserEmailDomainPolicy[];
};

const POLICIES_FILE = path.join(process.cwd(), 'data', 'user_email_domain_policies.json');

function normalizeDomain(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\/+$/, '');
}

function sanitizeDomains(input: unknown): string[] {
  const source = Array.isArray(input) ? input : [];
  const unique = new Set<string>();
  for (const item of source) {
    const value = normalizeDomain(String(item ?? ''));
    if (!value) continue;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) continue;
    unique.add(value);
  }
  return Array.from(unique.values());
}

function sanitizeStore(raw: Partial<UserEmailDomainPolicyStore> | null | undefined): UserEmailDomainPolicyStore {
  const source = Array.isArray(raw?.policies) ? raw?.policies : [];
  const seen = new Set<string>();
  const policies: UserEmailDomainPolicy[] = [];

  for (const entry of source as any[]) {
    const userId = String(entry?.userId ?? '').trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);

    const mode = entry?.mode === 'allow_any' || entry?.mode === 'custom' ? entry.mode : 'default';
    policies.push({
      userId,
      mode,
      customDomains: sanitizeDomains(entry?.customDomains),
      updatedAt: String(entry?.updatedAt ?? new Date().toISOString()),
      updatedBy: typeof entry?.updatedBy === 'string' ? entry.updatedBy : undefined,
    });
  }

  return { policies };
}

export async function loadUserEmailDomainPolicies(): Promise<UserEmailDomainPolicyStore> {
  try {
    const raw = await fs.readFile(POLICIES_FILE, 'utf8');
    return sanitizeStore(JSON.parse(raw) as Partial<UserEmailDomainPolicyStore>);
  } catch {
    const empty: UserEmailDomainPolicyStore = { policies: [] };
    await saveUserEmailDomainPolicies(empty);
    return empty;
  }
}

export async function saveUserEmailDomainPolicies(store: UserEmailDomainPolicyStore) {
  const safe = sanitizeStore(store);
  await fs.mkdir(path.dirname(POLICIES_FILE), { recursive: true });
  await fs.writeFile(POLICIES_FILE, JSON.stringify(safe, null, 2), 'utf8');
}

export function getUserEmailDomainPolicy(
  userId: string,
  store: UserEmailDomainPolicyStore
): UserEmailDomainPolicy {
  const found = store.policies.find((entry) => entry.userId === userId);
  if (found) {
    return {
      ...found,
      customDomains: sanitizeDomains(found.customDomains),
    };
  }
  return {
    userId,
    mode: 'default',
    customDomains: [],
    updatedAt: new Date().toISOString(),
  };
}

export function resolveUserAllowedDomains(
  policy: UserEmailDomainPolicy,
  activeGlobalDomains: string[]
): string[] | null {
  if (policy.mode === 'allow_any') {
    return null;
  }
  if (policy.mode === 'custom') {
    const custom = sanitizeDomains(policy.customDomains);
    if (custom.length > 0) {
      return custom;
    }
  }
  return sanitizeDomains(activeGlobalDomains);
}
