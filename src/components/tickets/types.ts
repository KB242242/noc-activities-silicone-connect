// ============================================================
// TICKET TYPES — NOC Silicone Connect
// ============================================================

export type NocTicketType = 'FI' | 'MP' | 'FD' | 'PC' | 'SU' | 'INC' | 'VS' | 'MC';
export type NocTicketStatus = 'OPEN' | 'PENDING' | 'ESCALATED' | 'CLOSED';
export type NocTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NocTicketChannel = 'PRESENTIEL' | 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'FACEBOOK';
export type NocTicketLanguage = 'FR' | 'EN' | 'IT';
export type NocTicketClassification = 'QUESTION' | 'PROBLEM' | 'FEATURE' | 'OTHER';
export type NocResolutionCause =
  | 'ENERGETIC'
  | 'SYSTEM'
  | 'TELECOM'
  | 'TRANSMISSION'
  | 'DATACOM'
  | 'SABOTAGE'
  | 'ATTENUATION'
  | 'TECHNICIAN_ERROR'
  | 'INTERNAL_LOOP'
  | 'OTHER';
export type NocSubTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type NocApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface NocTicketTechnician {
  id: string;
  name: string;
  pseudo?: string;
  unit?: string;
}

export interface NocTicketClient {
  id: string;
  name: string;
  serviceType?: string;
}

export interface NocTicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  isPrivate: boolean;
  isEdited: boolean;
  attachments?: NocTicketAttachment[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface NocTicketAttachment {
  id: string;
  ticketId: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface NocTicketHistory {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

export interface NocTicketSubTask {
  id: string;
  ticketId: string;
  description: string;
  assignedTo?: NocTicketTechnician;
  status: NocSubTaskStatus;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface NocTimeEntry {
  id: string;
  ticketId: string;
  technicianId: string;
  technicianName: string;
  date: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
}

export interface NocApproval {
  id: string;
  ticketId: string;
  requestedBy: string;
  requestedTo: string;
  status: NocApprovalStatus;
  comment?: string;
  decidedAt?: Date;
  createdAt: Date;
}

export interface NocTicket {
  id: string;
  numero: string;
  ticketZoho?: string;
  type: NocTicketType;
  objet: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  clients: NocTicketClient[];
  technicians: NocTicketTechnician[];
  localities: string[];
  siteIds?: string[];
  sites?: string[];
  link?: string;
  priority: NocTicketPriority;
  status: NocTicketStatus;
  channel?: NocTicketChannel;
  language?: NocTicketLanguage;
  classification?: NocTicketClassification;
  startDate: Date;
  endDate?: Date;
  dueDate?: Date;
  eta?: string;
  etr?: string;
  duration?: string;
  durationDetailed?: string;
  resolutionDescription?: string;
  resolutionCause?: NocResolutionCause;
  outageStartTime?: Date;
  outageEndTime?: Date;
  isRecurring: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deletedReason?: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  comments?: NocTicketComment[];
  attachments?: NocTicketAttachment[];
  history?: NocTicketHistory[];
  subTasks?: NocTicketSubTask[];
  timeEntries?: NocTimeEntry[];
  approvals?: NocApproval[];
}

// ── Config Maps ────────────────────────────────────────────────

export const TICKET_TYPE_CONFIG: Record<NocTicketType, { label: string; color: string; bg: string; border: string }> = {
  FI:  { label: 'Fiche d\'Intervention',    color: '#3b82f6', bg: 'bg-blue-500/10',   border: 'border-blue-500/40' },
  MP:  { label: 'Maintenance Préventive',   color: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/40' },
  FD:  { label: 'Fiche de Déploiement',     color: '#f59e0b', bg: 'bg-amber-500/10',  border: 'border-amber-500/40' },
  PC:  { label: 'Plainte Client',           color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/40' },
  SU:  { label: 'Survey',                   color: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/40' },
  INC: { label: 'Incident',                 color: '#ec4899', bg: 'bg-pink-500/10',   border: 'border-pink-500/40' },
  VS:  { label: 'Visite des Sites',         color: '#06b6d4', bg: 'bg-cyan-500/10',   border: 'border-cyan-500/40' },
  MC:  { label: 'Maintenance Curative',     color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/40' },
};

export const TICKET_STATUS_CONFIG: Record<NocTicketStatus, { label: string; color: string; bg: string; border: string }> = {
  OPEN:      { label: 'Ouvert',     color: '#3b82f6', bg: 'bg-blue-500/15',   border: 'border-blue-500/40' },
  PENDING:   { label: 'En Attente', color: '#f59e0b', bg: 'bg-amber-500/15',  border: 'border-amber-500/40' },
  ESCALATED: { label: 'Escaladé',   color: '#ef4444', bg: 'bg-red-500/15',    border: 'border-red-500/40' },
  CLOSED:    { label: 'Fermé',      color: '#22c55e', bg: 'bg-green-500/15',  border: 'border-green-500/40' },
};

export const TICKET_PRIORITY_CONFIG: Record<NocTicketPriority, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Faible',    color: '#64748b', bg: 'bg-slate-500/15' },
  MEDIUM:   { label: 'Moyen',     color: '#3b82f6', bg: 'bg-blue-500/15' },
  HIGH:     { label: 'Élevé',     color: '#f59e0b', bg: 'bg-amber-500/15' },
  CRITICAL: { label: 'Critique',  color: '#ef4444', bg: 'bg-red-500/15' },
};

export const TICKET_CHANNEL_CONFIG: Record<NocTicketChannel, { label: string; icon: string }> = {
  PRESENTIEL: { label: 'Présentiel', icon: 'users' },
  PHONE:      { label: 'Téléphone',  icon: 'phone' },
  WHATSAPP:   { label: 'WhatsApp',   icon: 'message-circle' },
  EMAIL:      { label: 'Email',      icon: 'mail' },
  FACEBOOK:   { label: 'Facebook',   icon: 'globe' },
};

export const RESOLUTION_CAUSE_CONFIG: Record<NocResolutionCause, string> = {
  ENERGETIC:       'Problème énergétique',
  SYSTEM:          'Système',
  TELECOM:         'Télécom',
  TRANSMISSION:    'Transmission',
  DATACOM:         'Datacom',
  SABOTAGE:        'Sabotage',
  ATTENUATION:     'Affaiblissement',
  TECHNICIAN_ERROR:'Erreur du technicien',
  INTERNAL_LOOP:   'Boucle interne',
  OTHER:           'Autre',
};

// ── Limit: max 3 open tickets per technician per week ─────────
export const MAX_TICKETS_PER_TECHNICIAN_PER_WEEK = 3;

// ── Numero format: SC-{TYPE}-{dd-MM-yyyy}-{seq:3} ─────────────
export function generateTicketNumero(type: NocTicketType, date: Date, seq: number): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const s = String(seq).padStart(3, '0');
  return `SC-${type}-${dd}-${mm}-${yyyy}-${s}`;
}
