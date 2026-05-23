import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Flag,
  Mail,
  Network,
  Phone,
  Pin,
  Star,
  Ticket,
  TrendingUp,
  Trophy,
  Truck,
  Wrench,
} from 'lucide-react';

import type { TaskCategory, TaskPriority, TaskStatus } from '@/features/app-shell/types';

export const EXTERNAL_LINKS = [
  { id: '1', name: 'Suivi véhicules', url: 'https://za.mixtelematics.com/#/login', category: 'vehicles', icon: Truck, description: 'MixTelematics' },
  { id: '2', name: 'LibreNMS', url: 'http://192.168.2.25:2021/', category: 'monitoring', icon: Network, description: 'Monitoring réseau' },
  { id: '3', name: 'Zabbix', url: 'http://192.168.2.2:2021/', category: 'monitoring', icon: Activity, description: 'Suivi incidents' },
  { id: '4', name: 'Zoho Desk', url: 'https://desk.zoho.com/', category: 'tickets', icon: Ticket, description: 'Gestion tickets' },
  { id: '5', name: 'Tickets Sheets', url: 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', category: 'tickets', icon: FileSpreadsheet, description: 'Liste tickets' },
  { id: '6', name: 'WhatsApp', url: 'https://web.whatsapp.com/', category: 'communication', icon: Phone, description: 'Messagerie' },
  { id: '7', name: 'Gmail', url: 'https://mail.google.com/', category: 'communication', icon: Mail, description: 'Email' },
];

export const TASK_PRIORITIES: Record<TaskPriority, { label: string; color: string; bgColor: string; icon: typeof Flag }> = {
  low: { label: 'Faible', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800', icon: Flag },
  medium: { label: 'Moyenne', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Flag },
  high: { label: 'Haute', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: Flag },
  critical: { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
};

export const TASK_CATEGORIES: Record<TaskCategory, { label: string; icon: typeof AlertTriangle }> = {
  incident: { label: 'Incident', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', icon: Wrench },
  surveillance: { label: 'Surveillance', icon: Eye },
  administrative: { label: 'Administratif', icon: ClipboardList },
  other: { label: 'Autre', icon: Pin },
};

export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  in_progress: { label: 'En cours', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { label: 'Terminée', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  on_hold: { label: 'Suspendue', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  cancelled: { label: 'Annulée', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  late: { label: 'En retard', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export const BADGE_CONFIG: Record<string, { label: string; icon: typeof Trophy; color: string }> = {
  exemplary: { label: 'Agent Exemplaire', icon: Trophy, color: 'text-yellow-500' },
  reliable: { label: 'Agent Fiable', icon: Star, color: 'text-blue-500' },
  improving: { label: 'En Progression', icon: TrendingUp, color: 'text-green-500' },
  needs_attention: { label: 'À Surveiller', icon: AlertTriangle, color: 'text-orange-500' },
};
