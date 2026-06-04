import { Activity, FileSpreadsheet, FileText, Phone } from 'lucide-react';
import type { AlertType, ResponsibilityType, UserProfile, UserRole } from '@/features/app-shell/core/shared/types';
import { canManageTicketEntities } from '@/lib/tickets/permissions';

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-100 text-red-800', description: 'Accès complet à toutes les fonctionnalités' },
  ADMIN: { label: 'Administrateur', color: 'bg-orange-100 text-orange-800', description: 'Gestion des utilisateurs et paramEtres' },
  RESPONSABLE: { label: 'Responsable', color: 'bg-purple-100 text-purple-800', description: 'Supervision et rapports' },
  TECHNICIEN: { label: 'Technicien', color: 'bg-blue-100 text-blue-800', description: 'Operations techniques' },
  TECHNICIEN_NO: { label: 'Technicien NOC', color: 'bg-green-100 text-green-800', description: 'Agent NOC - Shifts et monitoring' },
  USER: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-800', description: 'Accès standard' },
};

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; colorClass: string }> = {
  critical: { label: 'Critique', colorClass: 'text-red-600' },
  warning: { label: 'Avertissement', colorClass: 'text-amber-600' },
  info: { label: 'Information', colorClass: 'text-blue-600' },
  normal: { label: 'Normale', colorClass: 'text-slate-600' },
  passive: { label: 'Passive', colorClass: 'text-zinc-600' },
  external: { label: 'Externe', colorClass: 'text-cyan-700' },
  lucrative: { label: 'Lucrative', colorClass: 'text-emerald-700' },
  success: { label: 'Succes', colorClass: 'text-green-600' },
};

export const RESPONSIBILITY_CONFIG: Record<ResponsibilityType, { label: string; icon: typeof Phone; color: string }> = {
  CALL_CENTER: { label: 'Call Center', icon: Phone, color: 'text-blue-600' },
  MONITORING: { label: 'Monitoring', icon: Activity, color: 'text-green-600' },
  REPORTING_1: { label: 'Reporting 1', icon: FileText, color: 'text-purple-600' },
  REPORTING_2: { label: 'Reporting 2', icon: FileSpreadsheet, color: 'text-orange-600' },
};

export const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

export function canManageAnnouncements(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'RESPONSABLE';
}

export function canManageTickets(user: UserProfile | null): boolean {
  if (!user) return false;
  return canManageTicketEntities(user.role);
}