import type { PasswordValidation, UserProfile, UserRole } from '@/features/app-shell/core/shared/types';

export function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strength: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';

  return {
    isValid: hasMinLength && hasUppercase && hasNumber && hasSpecial,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    strength,
  };
}

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash)}_${password.length}_${btoa(password.slice(0, 3))}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash || password === hash;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function cleanEmptyDivs(html: string): string {
  if (!html) return '';

  let cleaned = html
    .replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, '')
    .replace(/<div[^>]*>\s*&nbsp;\s*<\/div>/gi, '')
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    .replace(/(<br\s*\/?>\s*)+$/gi, '')
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
    .trim();

  return cleaned;
}

export function isSuperAdmin(user: UserProfile | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function hasPermission(user: UserProfile | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const permissions: Record<UserRole, string[]> = {
    SUPER_ADMIN: ['all'],
    ADMIN: ['view_users', 'edit_users', 'view_logs', 'create_user', 'reset_password'],
    RESPONSABLE: ['view_users', 'view_logs', 'create_task', 'edit_task'],
    TECHNICIEN: ['view_tasks', 'edit_own_tasks', 'create_activity'],
    TECHNICIEN_NO: ['view_tasks', 'edit_own_tasks', 'create_activity', 'generate_pdf'],
    USER: ['view_own_profile', 'edit_own_profile'],
  };

  return permissions[user.role]?.includes(permission) || false;
}