// ============================================
// GESTION TICKETS - Constants & Config
// ============================================

import { 
  Client, Site, Liaison, Technician, TicketType, TicketSeverity, 
  TicketStatus, TicketCanal, TicketClassification, TicketLanguage, 
  ProductName, Locality 
} from './types';

// ============================================
// MODULE INFO
// ============================================
export const MODULE_NAME = 'Gestion Tickets';
export const MODULE_SUBTITLE = 'Suivi et création de Tickets';

// ============================================
// TICKET TYPE CONFIGURATION
// ============================================
export const TICKET_TYPES: Record<TicketType, { label: string; icon: string; color: string }> = {
  maintenance_curative: { label: 'Maintenance Curative', icon: 'Wrench', color: 'text-orange-600' },
  maintenance_preventive: { label: 'Maintenance Préventive', icon: 'Shield', color: 'text-blue-600' },
  survey: { label: 'Survey', icon: 'Search', color: 'text-purple-600' },
  deploiement: { label: 'Déploiement', icon: 'Rocket', color: 'text-green-600' },
  intervention: { label: 'Intervention', icon: 'Zap', color: 'text-yellow-600' },
  incident_critique: { label: 'Incident Critique', icon: 'AlertTriangle', color: 'text-red-600' },
  incident_majeur: { label: 'Incident Majeur', icon: 'AlertCircle', color: 'text-amber-600' }
};

// ============================================
// SEVERITY / PRIORITY CONFIGURATION
// ============================================
export const SEVERITY_CONFIG: Record<TicketSeverity, { label: string; color: string; bgColor: string; slaHours: number }> = {
  High: { 
    label: 'High', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    slaHours: 2 
  },
  Medium: { 
    label: 'Medium', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    slaHours: 8 
  },
  Low: { 
    label: 'Low', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    slaHours: 24 
  }
};

// ============================================
// STATUS CONFIGURATION (en français)
// ============================================
export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  ouvert: { label: 'Ouvert', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: 'Circle' },
  en_attente: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'Pause' },
  escalade: { label: 'Escaladé', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: 'ArrowUpCircle' },
  ferme: { label: 'Fermé', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: 'CheckCircle' }
};

// ============================================
// CANAL / SOURCE CONFIGURATION
// ============================================
export const CANAL_CONFIG: Record<TicketCanal, { label: string; icon: string }> = {
  'En Présentiel': { label: 'En Présentiel', icon: 'User' },
  'Phone': { label: 'Phone', icon: 'Phone' },
  'Twitter': { label: 'Twitter', icon: 'Twitter' },
  'Email': { label: 'Email', icon: 'Mail' },
  'Facebook': { label: 'Facebook', icon: 'Facebook' },
  'Web': { label: 'Web', icon: 'Globe' },
  'Chat': { label: 'Chat', icon: 'MessageSquare' },
  'Forums': { label: 'Forums', icon: 'Users' },
  'Feedback Widget': { label: 'Feedback Widget', icon: 'MessageCircle' },
  'Silicone Connect': { label: 'Silicone Connect', icon: 'Building' },
  'Instagram': { label: 'Instagram', icon: 'Instagram' },
  'Sandbox': { label: 'Sandbox', icon: 'Code' }
};

// ============================================
// CLASSIFICATION CONFIGURATION
// ============================================
export const CLASSIFICATION_CONFIG: Record<TicketClassification, { label: string }> = {
  Question: { label: 'Question' },
  Problème: { label: 'Problème' },
  Feature: { label: 'Feature' },
  Others: { label: 'Others' }
};

// ============================================
// LANGUAGE CONFIGURATION
// ============================================
export const LANGUAGE_CONFIG: Record<TicketLanguage, { label: string }> = {
  Français: { label: 'Français' },
  Anglais: { label: 'Anglais' },
  Italien: { label: 'Italien' }
};

// ============================================
// PRODUCT NAME CONFIGURATION
// ============================================
export const PRODUCT_CONFIG: Record<ProductName, { label: string }> = {
  'Fibre Optique': { label: 'Fibre Optique' },
  'Interconnexion': { label: 'Interconnexion' },
  'Internet': { label: 'Internet' },
  'Internet et Interconnexion': { label: 'Internet et Interconnexion' },
  'Autres': { label: 'Autres' }
};

// ============================================
// LOCALITIES
// ============================================
export const LOCALITIES: Record<Locality, { label: string }> = {
  brazzaville: { label: 'Brazzaville' },
  pointe_noire: { label: 'Pointe-Noire' },
  dolisie: { label: 'Dolisie' },
  nkayi: { label: 'Nkayi' },
  loudima: { label: 'Loudima' },
  oyo: { label: 'Oyo' },
  mindouli: { label: 'Mindouli' },
  bouansa: { label: 'Bouansa' },
  talangai: { label: 'Talangaï' },
  bacongo: { label: 'Bacongo' }
};

// ============================================
// CLIENTS - BRAZZAVILLE
// ============================================
export const CLIENTS_BRAZZAVILLE: Client[] = [
  { id: 'cli-bzv-001', name: "BEN'TSI", locality: 'brazzaville' },
  { id: 'cli-bzv-002', name: 'QG-CAMPAGNE', locality: 'brazzaville' },
  { id: 'cli-bzv-003', name: 'E²C', locality: 'brazzaville' },
  { id: 'cli-bzv-004', name: 'OMS', locality: 'brazzaville' },
  { id: 'cli-bzv-005', name: 'CHAIRMAN', locality: 'brazzaville' },
  { id: 'cli-bzv-006', name: 'ELBO-SUITES', locality: 'brazzaville' },
  { id: 'cli-bzv-007', name: 'MFB BRAZZAVILLE', locality: 'brazzaville' },
  { id: 'cli-bzv-008', name: 'ECOBANK DG', locality: 'brazzaville' },
  { id: 'cli-bzv-009', name: 'SNPC BRAZZAVILLE', locality: 'brazzaville' },
  { id: 'cli-bzv-010', name: 'STADE MASSAMBA D.', locality: 'brazzaville' },
  { id: 'cli-bzv-011', name: 'PNUD', locality: 'brazzaville' },
  { id: 'cli-bzv-012', name: 'UNICEF BZV', locality: 'brazzaville' },
  { id: 'cli-bzv-013', name: 'UNFPA OFFICE', locality: 'brazzaville' },
  { id: 'cli-bzv-014', name: 'PAM', locality: 'brazzaville' },
  { id: 'cli-bzv-015', name: 'CNS', locality: 'brazzaville' },
  { id: 'cli-bzv-016', name: '3C-TECHNOLOGIE', locality: 'brazzaville' },
  { id: 'cli-bzv-017', name: 'TOUR JUMELLES', locality: 'brazzaville' },
  { id: 'cli-bzv-018', name: 'ECAIR SIEGE', locality: 'brazzaville' },
  { id: 'cli-bzv-019', name: 'AGC-KOMBO', locality: 'brazzaville' },
  { id: 'cli-bzv-020', name: 'ICAP', locality: 'brazzaville' },
  { id: 'cli-bzv-021', name: 'UNESCO', locality: 'brazzaville' },
  { id: 'cli-bzv-022', name: 'PRESIDENCE', locality: 'brazzaville' },
  { id: 'cli-bzv-023', name: 'PRIMATURE', locality: 'brazzaville' },
  { id: 'cli-bzv-024', name: 'MINISTERE FINANCES', locality: 'brazzaville' },
  { id: 'cli-bzv-025', name: 'MINISTERE PETROLE', locality: 'brazzaville' },
  { id: 'cli-bzv-026', name: 'HOTEL OLYMPIA', locality: 'brazzaville' },
  { id: 'cli-bzv-027', name: 'HOTEL LEDGER', locality: 'brazzaville' },
  { id: 'cli-bzv-028', name: 'ORABANK SIEGE', locality: 'brazzaville' },
  { id: 'cli-bzv-029', name: 'BANQUE COMMERCIALE', locality: 'brazzaville' },
  { id: 'cli-bzv-030', name: 'TOTAL BRAZZAVILLE', locality: 'brazzaville' },
  { id: 'cli-bzv-031', name: 'MISTRAL BET', locality: 'brazzaville' },
  { id: 'cli-bzv-032', name: 'PALAIS DES CONGRES', locality: 'brazzaville' }
];

// ============================================
// CLIENTS - POINTE-NOIRE
// ============================================
export const CLIENTS_POINTE_NOIRE: Client[] = [
  { id: 'cli-pnr-001', name: 'MFB POINTE NOIRE', locality: 'pointe_noire' },
  { id: 'cli-pnr-002', name: 'X-OIL POINTE NOIRE', locality: 'pointe_noire' },
  { id: 'cli-pnr-003', name: 'SNPC COMILOG', locality: 'pointe_noire' },
  { id: 'cli-pnr-004', name: 'NILDUTCH POINTE NOIRE', locality: 'pointe_noire' },
  { id: 'cli-pnr-005', name: 'AERCO VIP POINTE NOIRE', locality: 'pointe_noire' },
  { id: 'cli-pnr-006', name: 'AIRTEL L1', locality: 'pointe_noire' },
  { id: 'cli-pnr-007', name: 'AIRTEL L2', locality: 'pointe_noire' },
  { id: 'cli-pnr-008', name: 'CORAF', locality: 'pointe_noire' },
  { id: 'cli-pnr-009', name: 'TRIDENT', locality: 'pointe_noire' },
  { id: 'cli-pnr-010', name: 'PIC A RISE', locality: 'pointe_noire' },
  { id: 'cli-pnr-011', name: 'ENI CONGO', locality: 'pointe_noire' },
  { id: 'cli-pnr-012', name: 'PERENCO', locality: 'pointe_noire' },
  { id: 'cli-pnr-013', name: 'MPA', locality: 'pointe_noire' },
  { id: 'cli-pnr-014', name: 'HOTEL ATLANTIQUE', locality: 'pointe_noire' },
  { id: 'cli-pnr-015', name: 'COTEL', locality: 'pointe_noire' },
  { id: 'cli-pnr-016', name: 'MTN LIEN DOLISIE', locality: 'pointe_noire' },
  { id: 'cli-pnr-017', name: 'MTN GRAND MARCHE', locality: 'pointe_noire' }
];

// All clients combined
export const ALL_CLIENTS: Client[] = [...CLIENTS_BRAZZAVILLE, ...CLIENTS_POINTE_NOIRE];

// ============================================
// SITES / TARGETS
// ============================================
export const SITES: Site[] = [
  // Datacenters
  { id: 'site-dc-001', name: 'MGK1', code: 'MGK1', locality: 'pointe_noire', type: 'datacenter' },
  { id: 'site-dc-002', name: 'MGK2', code: 'MGK2', locality: 'pointe_noire', type: 'datacenter' },
  { id: 'site-dc-003', name: 'BONDI', code: 'BONDI', locality: 'pointe_noire', type: 'datacenter' },
  { id: 'site-dc-004', name: 'HQ_E²C', code: 'HQ-E2C', locality: 'brazzaville', type: 'datacenter' },
  
  // POP Sites
  { id: 'site-pop-001', name: 'Dolisie', code: 'DOL', locality: 'dolisie', type: 'pop' },
  { id: 'site-pop-002', name: 'Loudima', code: 'LOU', locality: 'loudima', type: 'pop' },
  { id: 'site-pop-003', name: 'Nkayi', code: 'NKY', locality: 'nkayi', type: 'pop' },
  { id: 'site-pop-004', name: 'Mindouli', code: 'MIN', locality: 'mindouli', type: 'pop' },
  { id: 'site-pop-005', name: 'Bouansa', code: 'BOU', locality: 'bouansa', type: 'pop' },
  { id: 'site-pop-006', name: 'TLP', code: 'TLP', locality: 'pointe_noire', type: 'pop' },
  { id: 'site-pop-007', name: 'ELBO', code: 'ELBO', locality: 'brazzaville', type: 'pop' },
  
  // Client Sites
  { id: 'site-client-001', name: 'Talangai', code: 'TLG', locality: 'brazzaville', type: 'site_client' },
  { id: 'site-client-002', name: 'Bacongo', code: 'BAC', locality: 'brazzaville', type: 'site_client' },
  { id: 'site-client-003', name: 'Siège Silicone Connect', code: 'SSC', locality: 'brazzaville', type: 'site_client' },
  
  // Relay Sites
  { id: 'site-relay-001', name: 'Oyo', code: 'OYO', locality: 'oyo', type: 'relay' }
];

// ============================================
// LIAISONS (Network Links)
// ============================================
export const LIAISONS: Liaison[] = [
  { id: 'liaison-001', name: 'Kombo-Talangai', siteA: 'MGK1', siteB: 'Talangai', type: 'fibre' },
  { id: 'liaison-002', name: 'BBS', siteA: 'MGK1', siteB: 'Brazzaville', type: 'radio' },
  { id: 'liaison-003', name: 'BBN', siteA: 'MGK2', siteB: 'Brazzaville', type: 'radio' },
  { id: 'liaison-004', name: 'MTN-Grd Marché', siteA: 'MGK1', siteB: 'Grand Marché', type: 'fibre' },
  { id: 'liaison-005', name: 'Dolisie-Link', siteA: 'MGK1', siteB: 'Dolisie', type: 'radio' },
  { id: 'liaison-006', name: 'Loudima-Link', siteA: 'Dolisie', siteB: 'Loudima', type: 'radio' },
  { id: 'liaison-007', name: 'Nkayi-Link', siteA: 'Loudima', siteB: 'Nkayi', type: 'radio' },
  { id: 'liaison-008', name: 'Mindouli-Link', siteA: 'Brazzaville', siteB: 'Mindouli', type: 'radio' },
  { id: 'liaison-009', name: 'Bondi-MGK1', siteA: 'BONDI', siteB: 'MGK1', type: 'fibre' },
  { id: 'liaison-010', name: 'Bondi-MGK2', siteA: 'BONDI', siteB: 'MGK2', type: 'fibre' },
  { id: 'liaison-011', name: 'E2C-Talangai', siteA: 'HQ_E²C', siteB: 'Talangai', type: 'fibre' },
  { id: 'liaison-012', name: 'ELBO-Talangai', siteA: 'ELBO', siteB: 'Talangai', type: 'fibre' }
];

// ============================================
// TECHNICIANS
// ============================================
export const TECHNICIANS: Technician[] = [
  { id: 'tech-001', name: 'Franchise', role: 'technicien', specialites: ['fibre', 'radio'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-002', name: 'Uriel', role: 'technicien', specialites: ['maintenance', 'fibre'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-003', name: 'Jourdelan', role: 'technicien', specialites: ['radio', 'antenne'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-004', name: 'Isidore', role: 'technicien', specialites: ['fibre', 'deploiement'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-005', name: 'Jean Michel', role: 'technicien', specialites: ['maintenance', 'curative'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-006', name: 'Bonheur', role: 'technicien', specialites: ['radio', 'maintenance'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-007', name: 'Freddy', role: 'technicien', specialites: ['fibre', 'survey'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-008', name: 'Benie', role: 'technicien', specialites: ['intervention', 'client'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-009', name: 'Daniel', role: 'technicien', specialites: ['fibre', 'soudure'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-010', name: 'Prince', role: 'technicien', specialites: ['radio', 'deploiement'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-011', name: 'Andreas', role: 'technicien', specialites: ['maintenance', 'preventive'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-012', name: 'Brice', role: 'technicien', specialites: ['fibre', 'radio'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-013', name: 'Paul', role: 'technicien', specialites: ['intervention', 'critique'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-014', name: 'Dadju', role: 'technicien', specialites: ['survey', 'client'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-015', name: 'Lyse', role: 'technicien', specialites: ['fibre', 'maintenance'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-016', name: 'Sephora', role: 'technicien', specialites: ['radio', 'antenne'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-017', name: 'Mavhu', role: 'technicien', specialites: ['fibre', 'deploiement'], disponibility: 'disponible', ticketsActive: 0 },
  { id: 'tech-018', name: 'Prestataire', role: 'prestataire', specialites: ['general'], disponibility: 'disponible', ticketsActive: 0 }
];

// ============================================
// EMAIL RECIPIENTS
// ============================================
export const EMAIL_RECIPIENTS = {
  notification: 'kevine.test242@gmail.com',
  support: 'support@siliconeconnect.com',
  noc: 'noc@siliconeconnect.com'
};

// ============================================
// SLA CONFIGURATION
// ============================================
export const SLA_CONFIG = {
  // Response time targets (minutes)
  responseTime: {
    High: 15,
    Medium: 60,
    Low: 240
  },
  // Resolution time targets (minutes)
  resolutionTime: {
    High: 120, // 2 hours
    Medium: 480,  // 8 hours
    Low: 1440  // 24 hours
  },
  // Warning threshold (percentage of SLA time)
  warningThreshold: 0.8,
  // Critical threshold (percentage of SLA time)
  criticalThreshold: 0.95
};

// ============================================
// RECURRENCE THRESHOLDS
// ============================================
export const RECURRENCE_CONFIG = {
  // Number of incidents to trigger recurrence alert
  threshold: 3,
  // Period in days
  periodDays: 30,
  // Cooldown before new recurrence group
  cooldownDays: 7
};

// ============================================
// KANBAN COLUMNS
// ============================================
export const KANBAN_COLUMNS: TicketStatus[] = ['ouvert', 'en_attente', 'escalade', 'ferme'];

// ============================================
// MAX ATTACHMENT SIZE (40MB)
// ============================================
export const MAX_ATTACHMENT_SIZE = 40 * 1024 * 1024; // 40MB in bytes

// ============================================
// TRASH AUTO-DELETE DAYS
// ============================================
export const TRASH_AUTO_DELETE_DAYS = 30; // Days before permanent deletion

// ============================================
// FLASH MESSAGE DURATION
// ============================================
export const FLASH_MESSAGE_DURATION = 5000; // 5 seconds

// ============================================
// SUPPORTED FILE TYPES
// ============================================
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

// ============================================
// DEFAULT TICKET FILTER
// ============================================
export const DEFAULT_TICKET_FILTER = {
  status: 'all' as const,
  type: 'all' as const,
  severity: 'all' as const,
  localite: 'all' as const,
  technicien: 'all' as const,
  client: 'all' as const,
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
  isOverdue: false,
  isRecurring: false
};

// ============================================
// TICKET DETAIL TABS
// ============================================
export const TICKET_DETAIL_TABS = [
  { id: 'conversations', label: 'Conversations', icon: 'MessageCircle' },
  { id: 'resolution', label: 'Résolution', icon: 'CheckCircle' },
  { id: 'temps', label: 'Entrée de temps', icon: 'Clock' },
  { id: 'pieces', label: 'Pièce jointe', icon: 'Paperclip' },
  { id: 'activite', label: 'Activité', icon: 'Activity' },
  { id: 'approbation', label: 'Approbation', icon: 'ThumbsUp' },
  { id: 'historique', label: 'Historique', icon: 'History' }
] as const;
