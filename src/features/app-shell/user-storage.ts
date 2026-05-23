import type { UserProfile } from '@/features/app-shell/types';

export function parseStoredUser(raw: string): UserProfile | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed as UserProfile;
  } catch {
    return null;
  }
}
