import type { UserProfile } from '@/features/app-shell/core/shared/types';

const DISALLOWED_IDS = new Set([
  'agent-a4',
  'agent-b1',
  'agent-b3',
  'agent-c3',
]);

const DISALLOWED_EMAILS = new Set([
  'jose@siliconeconnect.com',
  'sahra@siliconeconnect.com',
  'marly@siliconeconnect.com',
  'lotti@siliconeconnect.com',
  'severin@siliconeconnect.com',
]);

const DISALLOWED_NAMES = new Set([
  'jose',
  'jose ngonkoli',
  'sahra',
  'marly',
  'lotti',
  'severin',
  'severin ndandou',
]);

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function isDisallowedRosterUser(
  user:
    | {
        id?: unknown;
        email?: unknown;
        name?: unknown;
        firstName?: unknown;
        lastName?: unknown;
      }
    | null
    | undefined
): boolean {
  if (!user) return false;

  const id = normalizeText(user.id);
  const email = normalizeText(user.email);
  const name = normalizeText(user.name);
  const firstName = normalizeText(user.firstName);
  const lastName = normalizeText(user.lastName);
  const fullName = normalizeText(`${firstName} ${lastName}`);

  if (DISALLOWED_IDS.has(id)) return true;
  if (DISALLOWED_EMAILS.has(email)) return true;
  if (DISALLOWED_NAMES.has(name)) return true;
  if (DISALLOWED_NAMES.has(firstName)) return true;
  if (DISALLOWED_NAMES.has(fullName)) return true;

  return false;
}

export function sanitizeRosterUsers(users: UserProfile[]): UserProfile[] {
  const filtered = users.filter((user) => !isDisallowedRosterUser(user));

  const uniqueById = new Map<string, UserProfile>();
  filtered.forEach((user) => {
    const key = String(user.id ?? '').trim();
    if (!key) return;
    if (!uniqueById.has(key)) {
      uniqueById.set(key, user);
    }
  });

  return Array.from(uniqueById.values());
}
