// ============================================
// TICKETS FEATURE — Constants
// ============================================

import { AlertTriangle, AlertCircle, RefreshCw, Inbox, Pin } from 'lucide-react';
import type { TicketStatus, TicketPriority, TicketCategory, TicketCountryOption, TicketLocalityDraft } from './types';

export const TICKET_STATUSES: Record<TicketStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  open: { label: 'Ouvert', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40', borderColor: 'border-red-300 dark:border-red-700' },
  in_progress: { label: 'En cours', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40', borderColor: 'border-blue-300 dark:border-blue-700' },
  pending: { label: 'En attente', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', borderColor: 'border-yellow-300 dark:border-yellow-700' },
  escalated: { label: 'Escaladé', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/40', borderColor: 'border-orange-300 dark:border-orange-700' },
  suspended: { label: 'Suspendu', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40', borderColor: 'border-purple-300 dark:border-purple-700' },
  waiting_fiche: { label: 'Att. fiche', color: 'text-slate-700 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-300 dark:border-slate-600' },
  resolved: { label: 'Résolu', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40', borderColor: 'border-green-300 dark:border-green-700' },
  closed: { label: 'Fermé', color: 'text-slate-700 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-300 dark:border-slate-600' },
};

export const TICKET_PRIORITIES: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  medium: { label: 'Moyenne', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  high: { label: 'Haute', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  critical: { label: 'Critique', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/40' },
};

export const TICKET_CATEGORIES: Record<TicketCategory, { label: string; icon: typeof AlertTriangle }> = {
  incident: { label: 'Incident', icon: AlertTriangle },
  request: { label: 'Demande', icon: Inbox },
  problem: { label: 'Problème', icon: AlertCircle },
  change: { label: 'Changement', icon: RefreshCw },
  other: { label: 'Autre', icon: Pin },
};

export const TICKET_COUNTRIES: TicketCountryOption[] = [
  { code: 'CD', name: 'RDC', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
];

export const DEFAULT_LOCALITY_DRAFT: TicketLocalityDraft = {
  countryCode: 'CD',
  countryName: 'RDC',
  city: '',
  arrondissement: '',
  quartier: '',
  address: '',
  latitude: '',
  longitude: '',
  freeText: '',
};

export const SITES_LIST = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E', 'Bureau Central'];
export const LOCALITES_LIST = ['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Mayi', 'Kananga', 'Kisangani'];
