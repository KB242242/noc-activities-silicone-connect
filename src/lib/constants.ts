// ============================================
// CONSTANTS - NOC Activities Application
// ============================================

import {
  UserRole, ClientType, ServiceType, TicketStatus, TicketPriority,
  TicketType, TicketChannel, TechnicianUnit, ResolutionType, TaskStatus, TaskPriority
} from '@/types';
import { Truck, Network, Activity, Ticket, FileSpreadsheet, Phone, Mail } from 'lucide-react';

// ============================================
// ROLE CONFIGURATION
// ============================================

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; description: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', description: 'Accès complet à toutes les fonctionnalités' },
  ADMIN: { label: 'Administrateur', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', description: 'Gestion des utilisateurs et paramètres' },
  RESPONSABLE: { label: 'Responsable', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', description: 'Supervision et rapports' },
  TECHNICIEN: { label: 'Technicien', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', description: 'Opérations techniques' },
  TECHNICIEN_NO: { label: 'Technicien NOC', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', description: 'Agent NOC - Shifts et monitoring' },
  USER: { label: 'Utilisateur', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30', description: 'Accès standard' }
};

// ============================================
// CLIENT TYPE CONFIGURATION
// ============================================

export const CLIENT_TYPE_CONFIG: Record<ClientType, { label: string; color: string; bgColor: string; icon: string }> = {
  Gold: { label: 'Gold', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: '👑' },
  Premium: { label: 'Premium', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: '💎' },
  Standard: { label: 'Standard', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: '⭐' },
  Bronze: { label: 'Bronze', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: '🥉' }
};

export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; color: string }> = {
  Internet: { label: 'Internet', color: 'text-blue-600' },
  Interco: { label: 'Interconnexion', color: 'text-green-600' },
  'Internet et Interco': { label: 'Internet & Interco', color: 'text-purple-600' }
};

// ============================================
// TECHNICIAN UNITS
// ============================================

export const TECHNICIAN_UNITS: Record<TechnicianUnit, { label: string; color: string }> = {
  Datacom: { label: 'Datacom', color: 'text-blue-600' },
  System: { label: 'Système', color: 'text-green-600' },
  NOC: { label: 'NOC', color: 'text-purple-600' },
  Field_Technician: { label: 'Technicien Terrain', color: 'text-orange-600' },
  Electricity: { label: 'Électricité', color: 'text-yellow-600' }
};

// ============================================
// TICKET CONFIGURATION
// ============================================

export const TICKET_STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  open: { label: 'Ouvert', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40', borderColor: 'border-red-300 dark:border-red-700' },
  in_progress: { label: 'En cours', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40', borderColor: 'border-blue-300 dark:border-blue-700' },
  pending: { label: 'En attente', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', borderColor: 'border-yellow-300 dark:border-yellow-700' },
  escalated: { label: 'Escaladé', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/40', borderColor: 'border-orange-300 dark:border-orange-700' },
  suspended: { label: 'En suspens', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40', borderColor: 'border-purple-300 dark:border-purple-700' },
  waiting_fiche: { label: 'En attente de fiche', color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40', borderColor: 'border-indigo-300 dark:border-indigo-700' },
  resolved: { label: 'Résolu', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40', borderColor: 'border-green-300 dark:border-green-700' },
  closed: { label: 'Fermé', color: 'text-slate-700 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-300 dark:border-slate-600' }
};

export const TICKET_PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  medium: { label: 'Moyenne', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  high: { label: 'Haute', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  critical: { label: 'Critique', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/40' }
};

export const TICKET_TYPE_CONFIG: Record<TicketType, { label: string; color: string; icon: string }> = {
  incident_minor: { label: 'Incident Mineur', color: 'text-yellow-600', icon: '⚠️' },
  incident_major: { label: 'Incident Majeur', color: 'text-orange-600', icon: '🔶' },
  incident_critical: { label: 'Incident Critique', color: 'text-red-600', icon: '🔴' },
  maintenance: { label: 'Maintenance', color: 'text-blue-600', icon: '🔧' },
  survey: { label: 'Survey', color: 'text-green-600', icon: '🔍' },
  intervention: { label: 'Intervention', color: 'text-purple-600', icon: '🛠️' },
  visit: { label: 'Visite', color: 'text-indigo-600', icon: '👁️' },
  supply: { label: 'Approvisionnement', color: 'text-cyan-600', icon: '📦' },
  supervision: { label: 'Supervision', color: 'text-teal-600', icon: '📡' },
  flapping_incident: { label: 'Flapping Incident', color: 'text-pink-600', icon: '⚡' }
};

export const TICKET_CHANNEL_CONFIG: Record<TicketChannel, { label: string; icon: string }> = {
  in_person: { label: 'En présentiel', icon: '👤' },
  phone: { label: 'Par téléphone', icon: '📞' },
  whatsapp: { label: 'Par WhatsApp', icon: '💬' },
  email: { label: 'Par email', icon: '📧' }
};

export const RESOLUTION_TYPE_CONFIG: Record<ResolutionType, { label: string; color: string }> = {
  energetic_problem: { label: 'Problème énergétique', color: 'text-yellow-600' },
  system: { label: 'Système', color: 'text-blue-600' },
  telecom: { label: 'Télécom', color: 'text-green-600' },
  transmission: { label: 'Transmission', color: 'text-purple-600' },
  datacom: { label: 'Datacom', color: 'text-cyan-600' },
  sabotage: { label: 'Sabotage', color: 'text-red-600' },
  attenuation: { label: 'Affaiblissement', color: 'text-orange-600' },
  technician_error: { label: 'Erreur du technicien', color: 'text-pink-600' },
  internal_loop: { label: 'Boucle interne', color: 'text-indigo-600' },
  other: { label: 'Autre', color: 'text-gray-600' }
};

// ============================================
// TASK CONFIGURATION
// ============================================

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  in_progress: { label: 'En cours', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { label: 'Terminée', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  on_hold: { label: 'Suspendue', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  cancelled: { label: 'Annulée', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  late: { label: 'En retard', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  medium: { label: 'Moyenne', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  high: { label: 'Haute', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

// ============================================
// SITES
// ============================================

export const SITES_LIST = [
  'HQSC PNR',
  'MGK2',
  'BONDI',
  'DOLISIE',
  'LOUDIMA',
  'NKAYI',
  'BOUANSA',
  'MINDOULI',
  'TLP',
  'ELBO',
  'BACONGO',
  'DJIRI',
  'PNR',
  'BZV'
];

// ============================================
// LOCALITIES
// ============================================

export const LOCALITIES_LIST = [
  'Brazzaville',
  'Pointe-Noire',
  'Dolisie',
  'Nkayi',
  'Loudima',
  'Mindouli',
  'Bouansa'
];

// ============================================
// TECHNICIANS
// ============================================

export const DEFAULT_TECHNICIANS = [
  { id: 'tech-1', pseudo: 'Franchise', firstName: 'Franchise', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-2', pseudo: 'Beni', firstName: 'Beni', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-3', pseudo: 'Uriel', firstName: 'Uriel', lastName: '', unit: 'Datacom' as TechnicianUnit },
  { id: 'tech-4', pseudo: 'Jourdelan', firstName: 'Jourdelan', lastName: '', unit: 'System' as TechnicianUnit },
  { id: 'tech-5', pseudo: 'Prince', firstName: 'Prince', lastName: '', unit: 'Field_Technician' as TechnicianUnit },
  { id: 'tech-6', pseudo: 'Divin', firstName: 'Divin', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-7', pseudo: 'Andreas', firstName: 'Andreas', lastName: '', unit: 'Datacom' as TechnicianUnit },
  { id: 'tech-8', pseudo: 'Bonheur', firstName: 'Bonheur', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-9', pseudo: 'Jerry', firstName: 'Jerry', lastName: '', unit: 'Field_Technician' as TechnicianUnit },
  { id: 'tech-10', pseudo: 'Paul', firstName: 'Paul', lastName: '', unit: 'Electricity' as TechnicianUnit },
  { id: 'tech-11', pseudo: 'Aristide', firstName: 'Aristide', lastName: '', unit: 'System' as TechnicianUnit },
  { id: 'tech-12', pseudo: 'Isidore', firstName: 'Isidore', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-13', pseudo: 'Jean Michel', firstName: 'Jean', lastName: 'Michel', unit: 'Datacom' as TechnicianUnit },
  { id: 'tech-14', pseudo: 'Sephora', firstName: 'Sephora', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-15', pseudo: 'Lyse', firstName: 'Lyse', lastName: '', unit: 'NOC' as TechnicianUnit },
  { id: 'tech-16', pseudo: 'Brice', firstName: 'Brice', lastName: '', unit: 'Field_Technician' as TechnicianUnit }
];

// ============================================
// CLIENTS DATA
// ============================================

export const CLIENTS_BRAZZAVILLE = [
  { department: 'Brazzaville', district: 'Poto-Poto', name: "BEN'TSI", serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.150/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'E²C', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.50/30' },
  { department: 'Brazzaville', district: 'Madibou', name: 'OMS', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.12' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'CHAIRMAN', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.58/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'ELBO-SUITES', serviceType: 'Internet' as ServiceType, ipAddress: 'N/A' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'MFB BRAZZAVILLE', serviceType: 'Internet et Interco' as ServiceType, ipAddress: '192.168.99.21' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'CI-GUSTA', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.122/30' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'NEW-PARLEMENT', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.118/30' },
  { department: 'Brazzaville', district: 'Moungali', name: 'MINISTERE H&C (Cabinet)', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.18' },
  { department: 'Brazzaville', district: 'Moungali', name: 'MINISTERE H&C (Ministre)', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.62/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'CONGOBET BRAZZAVILLE', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.174/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'SNPC BRAZZAVILLE', serviceType: 'Internet et Interco' as ServiceType, ipAddress: '192.168.99.13' },
  { department: 'Brazzaville', district: 'Moungali', name: 'AERCO DEM BZV', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.11' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'ACSI BRAZZAVILLE', serviceType: 'Internet et Interco' as ServiceType, ipAddress: '192.168.99.22' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'SKYTIC', serviceType: 'Interco' as ServiceType, ipAddress: 'N/A' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'MTN CG', serviceType: 'Interco' as ServiceType, ipAddress: 'N/A' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'Appo BZV', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.170/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'UBA DG', serviceType: 'Interco' as ServiceType, ipAddress: '192.168.99.36' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'PNUD', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.23' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'COORDINATION PNUD', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.226/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'GUOT', serviceType: 'Interco' as ServiceType, ipAddress: '192.168.99.53' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'UNICEF BZV', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.26' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'AISB', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.77' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'SERFIN', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.242/30' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'REP OMS', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.29' },
  { department: 'Brazzaville', district: 'Bacongo', name: 'UNFPA OFFICE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'PAM', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.35' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'PAM-ENTREPOT', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.28' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'REP-UNICEF', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.31' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'PODI', serviceType: 'Internet' as ServiceType, ipAddress: 'N/A' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'FSIE', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.244.54/30' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: '3C-TECH siege-bpc', serviceType: 'Interco' as ServiceType, ipAddress: '192.168.99.78' },
  { department: 'Brazzaville', district: "Talangaï", name: 'Résidence VIP', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.245.38/30' },
  { department: 'Brazzaville', district: 'Moungali', name: 'SECURIPORT', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.38' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'BSCA POTO POTO', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.245.17/30' },
  { department: 'Brazzaville', district: 'Moungali', name: 'ECAIR SIEGE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.42' },
  { department: 'Brazzaville', district: "Talangaï", name: 'AGC-KOMBO', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.245.46' },
  { department: 'Brazzaville', district: 'Moungali', name: 'UNESCO', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.106' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'AIR-COTE-DIVOIRE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.107' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'MISTRAL', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.109' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'QG CAMPAGNE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.110' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'SCLOG', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.108' },
  { department: 'Brazzaville', district: 'Poto-Poto', name: 'KEMPINSKI', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.24' },
];

export const CLIENTS_POINTE_NOIRE = [
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'MFB POINTE NOIRE', serviceType: 'Internet et Interco' as ServiceType, ipAddress: '192.168.99.136' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'CONGOBET POINTE NOIRE', serviceType: 'Internet' as ServiceType, ipAddress: '102.220.246.106' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'SNPC COMILOG', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.143' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'AERCO OFFICE POINTE NOIRE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.133' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'ACSI POINTE NOIRE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.132' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'UNICEF PNR', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.142' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'GUOT', serviceType: 'Interco' as ServiceType, ipAddress: '192.168.99.141' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'SECURIPORT', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.146' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'AGL', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.150' },
  { department: 'Pointe-Noire', district: 'Mongo-poukou', name: 'CORAF', serviceType: 'Interco' as ServiceType, ipAddress: '192.168.99.157' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'CCC', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.155' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'TRIDENT', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.241' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'AIR COTE D\'IVOIRE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.239' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'PIC A RISE', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.238' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'PERENCO', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.237' },
  { department: 'Pointe-Noire', district: 'Lumumba', name: 'ZES', serviceType: 'Internet' as ServiceType, ipAddress: '192.168.99.235' },
];

export const ALL_CLIENTS = [...CLIENTS_BRAZZAVILLE, ...CLIENTS_POINTE_NOIRE];

// ============================================
// EXTERNAL LINKS
// ============================================

export const EXTERNAL_LINKS = [
  { id: '1', name: 'Suivi véhicules', url: 'https://za.mixtelematics.com/#/login', category: 'vehicles', icon: Truck, description: 'MixTelematics' },
  { id: '2', name: 'LibreNMS', url: 'http://192.168.2.25:6672/', category: 'monitoring', icon: Network, description: 'Monitoring réseau' },
  { id: '3', name: 'Zabbix', url: 'http://192.168.2.2:6672/', category: 'monitoring', icon: Activity, description: 'Suivi incidents' },
  { id: '4', name: 'Zoho Desk', url: 'https://desk.zoho.com/', category: 'tickets', icon: Ticket, description: 'Gestion tickets' },
  { id: '5', name: 'Tickets Sheets', url: 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', category: 'tickets', icon: FileSpreadsheet, description: 'Liste tickets' },
  { id: '6', name: 'WhatsApp', url: 'https://web.whatsapp.com/', category: 'communication', icon: Phone, description: 'Messagerie' },
  { id: '7', name: 'Gmail', url: 'https://mail.google.com/', category: 'communication', icon: Mail, description: 'Email' }
];

// ============================================
// SHIFT CONFIGURATION
// ============================================

export const SHIFT_HEX: Record<string, string> = {
  'A': '#3B82F6',
  'B': '#EAB308',
  'C': '#22C55E'
};

export const SHIFTS_DATA: Record<string, { name: string; color: string; colorCode: string; members: string[] }> = {
  'A': { name: 'Shift A', color: 'blue', colorCode: '#3B82F6', members: ['Alaine', 'Casimir', 'Luca', 'José'] },
  'B': { name: 'Shift B', color: 'yellow', colorCode: '#EAB308', members: ['Sahra', 'Severin', 'Marly', 'Furys'] },
  'C': { name: 'Shift C', color: 'green', colorCode: '#22C55E', members: ['Audrey', 'Lapreuve', 'Lotti', 'Kevine'] }
};

export const SHIFT_CYCLE_START: Record<string, Date> = {
  'A': new Date('2026-02-24T00:00:00'),
  'B': new Date('2026-02-21T00:00:00'),
  'C': new Date('2026-02-18T00:00:00'),
};

// ============================================
// ALERT THRESHOLDS
// ============================================

export const ALERT_THRESHOLDS = {
  inactivityMinutes: 120,
  taskApproachingMinutes: 30,
  suspendedTooLongMinutes: 60,
  noTaskCreatedAfterShiftStart: 60,
  tooManyPendingEndShift: 60,
  maxTicketsPerTechnicianPerWeek: 3
};

// ============================================
// SESSION CONFIGURATION
// ============================================

export const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// ============================================
// NOTIFICATION EMAILS
// ============================================

export const NOTIFICATION_EMAILS = [
  'kevinebauer7@gmail.com',
  'kevine.test242@gmail.com'
];
