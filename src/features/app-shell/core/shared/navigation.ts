import {
  Activity,
  FileSpreadsheet,
  Globe,
  MapPin,
  Phone,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NocSectionKey =
  | 'noc_monitoring'
  | 'noc_callcenter'
  | 'noc_reporting'
  | 'noc_equipement'
  | 'noc_clients'
  | 'noc_sites'
  | 'noc_partenaire'
  | 'noc_fai';

export type AppSectionKey =
  | 'dashboard'
  | 'planning'
  | 'tasks'
  | 'activities'
  | 'tickets'
  | 'overtime'
  | 'links'
  | 'email'
  | 'messagerie'
  | 'ged'
  | 'supervision'
  | 'admin'
  | 'admin_users'
  | NocSectionKey;

export interface NocSidebarItem {
  id: NocSectionKey;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NOC_SIDEBAR_ITEMS: NocSidebarItem[] = [
  { id: 'noc_monitoring', label: 'Monitoring', icon: Activity, description: 'Vue consolidee Zabbix + LibreNMS' },
  { id: 'noc_callcenter', label: 'Call Center', icon: Phone, description: 'Gestion des appels entrants et sortants NOC' },
  { id: 'noc_reporting', label: 'Reporting', icon: FileSpreadsheet, description: 'Rapports de consommation et disponibilite' },
  { id: 'noc_equipement', label: 'Equipement', icon: Wrench, description: 'Etat des equipements et actions de reprise' },
  { id: 'noc_clients', label: 'Clients', icon: Users, description: 'Correlation client, hote, SLA et incidents' },
  { id: 'noc_sites', label: 'Sites', icon: MapPin, description: 'Gestion des sites et infrastructures' },
  { id: 'noc_partenaire', label: 'Partenaire', icon: Truck, description: 'Interconnexions et dependances partenaires' },
  { id: 'noc_fai', label: 'FAI', icon: Globe, description: 'Transit et peering multi-operateurs' },
];

export const DEFAULT_SECTION_ACCESS: Record<AppSectionKey, boolean> = {
  dashboard: true,
  planning: true,
  tasks: true,
  activities: true,
  tickets: true,
  overtime: true,
  links: true,
  email: true,
  messagerie: true,
  ged: true,
  supervision: true,
  admin: true,
  admin_users: true,
  noc_monitoring: true,
  noc_callcenter: true,
  noc_reporting: true,
  noc_equipement: true,
  noc_clients: true,
  noc_sites: true,
  noc_partenaire: true,
  noc_fai: true,
};

export const SECTION_LABELS: Record<AppSectionKey, string> = {
  dashboard: 'Tableau de bord',
  planning: 'Planning',
  tasks: 'Mes Tâches',
  activities: 'Activités',
  tickets: 'Gestion Tickets',
  overtime: 'Heures Sup.',
  links: 'Liens Externes',
  email: 'Chats',
  messagerie: 'Messagerie',
  ged: 'GED Documents',
  supervision: 'Supervision',
  admin: 'Administration',
  admin_users: 'Configuration',
  noc_monitoring: 'NOC Monitoring',
  noc_callcenter: 'NOC Call Center',
  noc_reporting: 'NOC Reporting',
  noc_equipement: 'NOC Equipement',
  noc_clients: 'NOC Clients',
  noc_sites: 'NOC Sites',
  noc_partenaire: 'NOC Partenaire',
  noc_fai: 'NOC FAI',
};

export function isNocSection(tab: string): tab is NocSectionKey {
  return NOC_SIDEBAR_ITEMS.some((item) => item.id === tab);
}

export function isAppSectionKey(tab: string): tab is AppSectionKey {
  return Object.prototype.hasOwnProperty.call(DEFAULT_SECTION_ACCESS, tab);
}

export function getCurrentTabStorageKey(userId: string) {
  return `noc_current_tab_${userId}`;
}
