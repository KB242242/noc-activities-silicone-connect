import { AlertCircle, AlertTriangle, Inbox, Pin, RefreshCw } from 'lucide-react';

import type {
  TicketAdminSettings,
  TicketCategory,
  TicketCountryOption,
  TicketLocalityDraft,
  TicketPriority,
  TicketStatus,
} from '@/features/app-shell/core/shared/types';

export const TICKET_STATUSES: Record<TicketStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  open: { label: 'Ouvert', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40', borderColor: 'border-red-300 dark:border-red-700' },
  in_progress: { label: 'En cours', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40', borderColor: 'border-blue-300 dark:border-blue-700' },
  pending: { label: 'En attente', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', borderColor: 'border-yellow-300 dark:border-yellow-700' },
  escalated: { label: 'Escalade', color: 'text-fuchsia-700 dark:text-fuchsia-300', bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', borderColor: 'border-fuchsia-300 dark:border-fuchsia-700' },
  suspended: { label: 'En suspens', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40', borderColor: 'border-amber-300 dark:border-amber-700' },
  waiting_fiche: { label: 'En attente de la fiche', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40', borderColor: 'border-indigo-300 dark:border-indigo-700' },
  resolved: { label: 'Resolu', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40', borderColor: 'border-green-300 dark:border-green-700' },
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
  problem: { label: 'Probleme', icon: AlertCircle },
  change: { label: 'Changement', icon: RefreshCw },
  other: { label: 'Autre', icon: Pin },
};

export const SITES_LIST = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E', 'Bureau Central'];
export const LOCALITES_LIST = ['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Mayi', 'Kananga', 'Kisangani'];

export const TICKET_COUNTRIES: TicketCountryOption[] = [
  { code: 'DZ', name: 'Algerie', flagImage: 'https://flagcdn.com/w40/dz.png' },
  { code: 'AO', name: 'Angola', flagImage: 'https://flagcdn.com/w40/ao.png' },
  { code: 'BJ', name: 'BEnin', flagImage: 'https://flagcdn.com/w40/bj.png' },
  { code: 'BW', name: 'Botswana', flagImage: 'https://flagcdn.com/w40/bw.png' },
  { code: 'BF', name: 'Burkina Faso', flagImage: 'https://flagcdn.com/w40/bf.png' },
  { code: 'BI', name: 'Burundi', flagImage: 'https://flagcdn.com/w40/bi.png' },
  { code: 'CV', name: 'Cap-Vert', flagImage: 'https://flagcdn.com/w40/cv.png' },
  { code: 'CM', name: 'Cameroun', flagImage: 'https://flagcdn.com/w40/cm.png' },
  { code: 'CF', name: 'Republique centrafricaine', flagImage: 'https://flagcdn.com/w40/cf.png' },
  { code: 'TD', name: 'Tchad', flagImage: 'https://flagcdn.com/w40/td.png' },
  { code: 'KM', name: 'Comores', flagImage: 'https://flagcdn.com/w40/km.png' },
  { code: 'CG', name: 'Republique du Congo', flagImage: 'https://flagcdn.com/w40/cg.png' },
  { code: 'CD', name: 'RDC', flagImage: 'https://flagcdn.com/w40/cd.png' },
  { code: 'CI', name: "Cete d'Ivoire", flagImage: 'https://flagcdn.com/w40/ci.png' },
  { code: 'DJ', name: 'Djibouti', flagImage: 'https://flagcdn.com/w40/dj.png' },
  { code: 'EG', name: 'Egypte', flagImage: 'https://flagcdn.com/w40/eg.png' },
  { code: 'GQ', name: 'Guinee Equatoriale', flagImage: 'https://flagcdn.com/w40/gq.png' },
  { code: 'ER', name: 'Erythree', flagImage: 'https://flagcdn.com/w40/er.png' },
  { code: 'SZ', name: 'Eswatini', flagImage: 'https://flagcdn.com/w40/sz.png' },
  { code: 'ET', name: 'Ethiopie', flagImage: 'https://flagcdn.com/w40/et.png' },
  { code: 'GA', name: 'Gabon', flagImage: 'https://flagcdn.com/w40/ga.png' },
  { code: 'GM', name: 'Gambie', flagImage: 'https://flagcdn.com/w40/gm.png' },
  { code: 'GH', name: 'Ghana', flagImage: 'https://flagcdn.com/w40/gh.png' },
  { code: 'GN', name: 'Guinee', flagImage: 'https://flagcdn.com/w40/gn.png' },
  { code: 'GW', name: 'Guinee-Bissau', flagImage: 'https://flagcdn.com/w40/gw.png' },
  { code: 'KE', name: 'Kenya', flagImage: 'https://flagcdn.com/w40/ke.png' },
  { code: 'LS', name: 'Lesotho', flagImage: 'https://flagcdn.com/w40/ls.png' },
  { code: 'LR', name: 'LibEria', flagImage: 'https://flagcdn.com/w40/lr.png' },
  { code: 'LY', name: 'Libye', flagImage: 'https://flagcdn.com/w40/ly.png' },
  { code: 'MG', name: 'Madagascar', flagImage: 'https://flagcdn.com/w40/mg.png' },
  { code: 'MW', name: 'Malawi', flagImage: 'https://flagcdn.com/w40/mw.png' },
  { code: 'ML', name: 'Mali', flagImage: 'https://flagcdn.com/w40/ml.png' },
  { code: 'MR', name: 'Mauritanie', flagImage: 'https://flagcdn.com/w40/mr.png' },
  { code: 'MU', name: 'Maurice', flagImage: 'https://flagcdn.com/w40/mu.png' },
  { code: 'MA', name: 'Maroc', flagImage: 'https://flagcdn.com/w40/ma.png' },
  { code: 'MZ', name: 'Mozambique', flagImage: 'https://flagcdn.com/w40/mz.png' },
  { code: 'NA', name: 'Namibie', flagImage: 'https://flagcdn.com/w40/na.png' },
  { code: 'NE', name: 'Niger', flagImage: 'https://flagcdn.com/w40/ne.png' },
  { code: 'NG', name: 'Nigeria', flagImage: 'https://flagcdn.com/w40/ng.png' },
  { code: 'RW', name: 'Rwanda', flagImage: 'https://flagcdn.com/w40/rw.png' },
  { code: 'ST', name: 'Sao TomE-et-Principe', flagImage: 'https://flagcdn.com/w40/st.png' },
  { code: 'SN', name: 'Senegal', flagImage: 'https://flagcdn.com/w40/sn.png' },
  { code: 'SC', name: 'Seychelles', flagImage: 'https://flagcdn.com/w40/sc.png' },
  { code: 'SL', name: 'Sierra Leone', flagImage: 'https://flagcdn.com/w40/sl.png' },
  { code: 'SO', name: 'Somalie', flagImage: 'https://flagcdn.com/w40/so.png' },
  { code: 'ZA', name: 'Afrique du Sud', flagImage: 'https://flagcdn.com/w40/za.png' },
  { code: 'SS', name: 'Soudan du Sud', flagImage: 'https://flagcdn.com/w40/ss.png' },
  { code: 'SD', name: 'Soudan', flagImage: 'https://flagcdn.com/w40/sd.png' },
  { code: 'TZ', name: 'Tanzanie', flagImage: 'https://flagcdn.com/w40/tz.png' },
  { code: 'TG', name: 'Togo', flagImage: 'https://flagcdn.com/w40/tg.png' },
  { code: 'TN', name: 'Tunisie', flagImage: 'https://flagcdn.com/w40/tn.png' },
  { code: 'UG', name: 'Ouganda', flagImage: 'https://flagcdn.com/w40/ug.png' },
  { code: 'ZM', name: 'Zambie', flagImage: 'https://flagcdn.com/w40/zm.png' },
  { code: 'ZW', name: 'Zimbabwe', flagImage: 'https://flagcdn.com/w40/zw.png' },
].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }));

export const CONGO_DEPARTMENTS: string[] = [
  'Bouenza',
  'Brazzaville',
  'Cuvette',
  'Cuvette-Ouest',
  'Kouilou',
  'Lekoumou',
  'Likouala',
  'Niari',
  'Plateaux',
  'Pointe-Noire',
  'Pool',
  'Sangha',
];

export const DEFAULT_TICKET_LOCALITY_DRAFT: TicketLocalityDraft = {
  countryCode: 'CG',
  countryName: 'Republique du Congo',
  departement: '',
  city: '',
  arrondissement: '',
  quartier: '',
  address: '',
  reference: '',
  freeText: '',
};

export const TICKET_ADMIN_CATEGORY_KEYS = [
  'deployment',
  'supervision',
  'ravitaillement',
  'routine_visit',
  'security',
  'maintenance',
  'incident',
  'survey',
] as const;

export const DEFAULT_TICKET_ADMIN_SETTINGS: TicketAdminSettings = {
  numberFormat: '#SC{date}-{seq}',
  numberSeed: 100000000,
  notificationEmails: ['kevinebauer7@gmail.com'],
  supportCopyEmail: 'support@siliconeconnect.com',
  technicianFallbackEmail: 'kevinebauer7@gmail.com',
  lifecycleEmailEvents: {
    creation: true,
    pending: true,
    escalated: true,
    closed: true,
  },
  sendClientCopyForIncidentMaintenance: false,
  defaultSlaHours: 24,
  trashRetentionDays: 30,
  slaByCategory: {
    deployment: 24,
    supervision: 8,
    ravitaillement: 24,
    routine_visit: 48,
    security: 4,
    maintenance: 12,
    incident: 4,
    survey: 72,
  },
};