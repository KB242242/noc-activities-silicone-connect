// ============================================
// GESTION TICKETS - Types & Interfaces
// ============================================

// Ticket Types
export type TicketType = 
  | 'maintenance_curative'
  | 'maintenance_preventive'
  | 'survey'
  | 'deploiement'
  | 'intervention'
  | 'incident_critique'
  | 'incident_majeur';

// Ticket Severity (Priority)
export type TicketSeverity = 'High' | 'Medium' | 'Low';

// Ticket Status (en français)
export type TicketStatus = 
  | 'ouvert'
  | 'en_attente'
  | 'escalade'
  | 'ferme';

// Ticket Source / Canal
export type TicketCanal = 
  | 'En Présentiel'
  | 'Phone'
  | 'Twitter'
  | 'Email'
  | 'Facebook'
  | 'Web'
  | 'Chat'
  | 'Forums'
  | 'Feedback Widget'
  | 'Silicone Connect'
  | 'Instagram'
  | 'Sandbox';

// Ticket Classification
export type TicketClassification = 
  | 'Question'
  | 'Problème'
  | 'Feature'
  | 'Others';

// Ticket Language
export type TicketLanguage = 'Français' | 'Anglais' | 'Italien';

// Product Names
export type ProductName = 
  | 'Fibre Optique'
  | 'Interconnexion'
  | 'Internet'
  | 'Internet et Interconnexion'
  | 'Autres';

// Comment Visibility
export type CommentVisibility = 'prive' | 'public';

// Localities
export type Locality = 
  | 'brazzaville'
  | 'pointe_noire'
  | 'dolisie'
  | 'nkayi'
  | 'loudima'
  | 'oyo'
  | 'mindouli'
  | 'bouansa'
  | 'talangai'
  | 'bacongo';

// User Role
export type UserRole = 'technicien_noc' | 'agent' | 'superviseur' | 'admin';

// Client
export interface Client {
  id: string;
  name: string;
  locality: 'brazzaville' | 'pointe_noire';
  category?: string;
}

// Site/Target
export interface Site {
  id: string;
  name: string;
  code: string;
  locality: Locality;
  type: 'datacenter' | 'site_client' | 'pop' | 'relay';
}

// Liaison (Network Link)
export interface Liaison {
  id: string;
  name: string;
  siteA: string;
  siteB: string;
  type: 'fibre' | 'radio' | 'satellite' | 'mixed';
}

// Technician
export interface Technician {
  id: string;
  name: string;
  role: 'technicien' | 'superviseur' | 'prestataire';
  shift?: string;
  specialites: string[];
  disponibility: 'disponible' | 'occupe' | 'conge' | 'formation';
  ticketsActive: number;
}

// Ticket Sub-Task / Activity
export interface TicketActivity {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: Date;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  completedAt?: Date;
  completedBy?: string;
}

// Time Entry
export interface TimeEntry {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  description: string;
  billable: boolean;
  createdAt: Date;
}

// Approval
export interface TicketApproval {
  id: string;
  ticketId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
}

// Ticket Comment
export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  visibility: CommentVisibility;
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
  attachments: TicketAttachment[];
  formattedContent?: string; // Rich text HTML
}

// Ticket History Entry
export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  action: 'created' | 'status_changed' | 'assigned' | 'commented' | 'sla_breach' | 'closed' | 'reopened' | 'eta_updated' | 'etr_updated' | 'field_updated';
  userId: string;
  userName: string;
  oldValue?: string;
  newValue?: string;
  field?: string;
  timestamp: Date;
  details: string;
}

// SLA Metrics
export interface SLAMetrics {
  targetResponseTime: number; // minutes
  targetResolutionTime: number; // minutes
  actualResponseTime?: number;
  actualResolutionTime?: number;
  eta?: Date; // Estimated Time of Arrival - Modifiable
  etr?: Date; // Estimated Time of Restoration - Modifiable
  isBreached: boolean;
  breachDuration?: number; // minutes overdue
  availabilityImpact: number; // percentage
}

// RFO (Reason For Outage)
export interface RFOReport {
  id: string;
  ticketId: string;
  entityName: string;
  link: string;
  ticketNumber: string;
  incidentStartTime: Date;
  incidentEndTime: Date;
  incidentOwner: string;
  priorityLevel: string;
  rootCause: string;
  caseStatus: string;
  serviceId?: string;
  capacity?: string;
  aEnd?: string;
  bEnd?: string;
  impact?: string;
  detailedClosingRemarks: string;
  generatedAt: Date;
  generatedBy: string;
  sentTo: string[];
}

// Resolution Details
export interface ResolutionDetails {
  description: string;
  cause: string;
  correctiveAction: string;
  endTime: Date;
  resolvedBy: string;
  resolvedByName: string;
  preventiveMeasures?: string;
}

// Email Notification
export interface EmailNotification {
  id: string;
  ticketId: string;
  type: 'assignation' | 'incident' | 'cloture' | 'rfo' | 'escalade' | 'commentaire';
  recipient: string;
  recipientName?: string;
  subject: string;
  body: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
}

// Main Ticket Interface
export interface Ticket {
  id: string;
  ticketNumber: string; // Format: #SC[JJMMAAAA]-[INCREMENT]
  
  // Title Format: TYPE - LIEU
  objet: string;
  type: TicketType;
  severity: TicketSeverity;
  status: TicketStatus;
  source: TicketCanal;
  
  // Contact Information
  contactName: string;
  accountName: string;
  email?: string;
  phone?: string;
  
  // Location
  localite: Locality;
  lieu: string; // Client/Location name
  cibles: string[]; // Sites impacted
  liaisonImpactee?: string;
  
  // Product
  productName?: ProductName;
  
  // Classification
  classification: TicketClassification;
  language: TicketLanguage;
  
  // Due Date
  dueDate?: Date;
  dueDateAlertTriggered?: boolean;
  
  // Clients
  clientsImpactes: string[];
  
  // Assignment
  techniciens: string[];
  technicienPrincipal?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  openedAt: Date;
  acknowledgedAt?: Date;
  inProgressAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // SLA - Modifiable ETA/ETR
  sla: SLAMetrics;
  
  // Content
  description: string;
  descriptionHtml?: string; // Rich text
  
  // Resolution
  resolution?: ResolutionDetails;
  rootCause?: string;
  
  // Relations
  comments: TicketComment[];
  activities: TicketActivity[];
  timeEntries: TimeEntry[];
  approvals: TicketApproval[];
  history: TicketHistoryEntry[];
  rfo?: RFOReport;
  emails: EmailNotification[];
  
  // Attachments
  attachments: TicketAttachment[];
  
  // Child Tickets
  parentTicketId?: string;
  childTickets: string[];
  
  // Recurrence Detection
  recurrenceGroup?: string;
  isRecurring: boolean;
  recurrenceCount: number;
  
  // Metrics
  downtimeMinutes: number;
  customerImpact: number;
  
  // Metadata
  createdBy: string;
  createdByName: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  tags: string[];
  customFields: Record<string, string>;
  
  // Conversation count
  conversationCount: number;
}

// Ticket Attachment
export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileSize: number; // Max 40MB
  fileType: string;
  fileData: string; // base64
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
  preview?: string; // For images
}

// Ticket Filter
export interface TicketFilter {
  status: TicketStatus | 'all';
  type: TicketType | 'all';
  severity: TicketSeverity | 'all';
  localite: Locality | 'all';
  technicien: string | 'all';
  client: string | 'all';
  dateFrom: Date | null;
  dateTo: Date | null;
  searchQuery: string;
  isOverdue: boolean;
  isRecurring: boolean;
}

// Closed Tickets Grouping
export interface ClosedTicketGroup {
  year: number;
  month: number;
  monthName: string;
  tickets: Ticket[];
}

// Dashboard Stats
export interface TicketDashboardStats {
  total: number;
  ouverts: number;
  enCours: number;
  enAttente: number;
  escalades: number;
  fermes: number;
  enRetard: number;
  critiques: number;
  
  // Time metrics
  avgResolutionTime: number;
  avgResponseTime: number;
  totalDowntime: number;
  
  // SLA
  slaCompliance: number;
  slaBreached: number;
  
  // By type
  byType: Record<string, number>;
  
  // By severity
  bySeverity: Record<string, number>;
  
  // By technicien
  byTechnicien: Array<{
    technicienId: string;
    technicienName: string;
    count: number;
    avgResolutionTime: number;
    slaCompliance: number;
  }>;
  
  // Trends
  ticketsLast7Days: number;
  ticketsLast30Days: number;
  trend: 'up' | 'down' | 'stable';
  
  // Technicien du mois
  technicienDuMois?: {
    id: string;
    name: string;
    ticketsResolved: number;
    avgResolutionTime: number;
    slaCompliance: number;
    motivation: string;
  };
}

// Recurrence Alert
export interface RecurrenceAlert {
  id: string;
  siteId: string;
  siteName: string;
  clientId?: string;
  clientName?: string;
  incidentCount: number;
  periodDays: number;
  firstIncident: Date;
  lastIncident: Date;
  ticketIds: string[];
  severity: 'warning' | 'critical';
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// View Mode
export type TicketViewMode = 'list' | 'kanban' | 'timeline';

// Export Format
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// Trash/Bin Item
export interface TrashItem {
  id: string;
  ticketId: string;
  ticketData: Ticket;
  deletedBy: string;
  deletedByName: string;
  deletedAt: Date;
  autoDeleteAt: Date; // 30 days after deletion
  restored?: boolean;
}

// Flash Message
export interface FlashMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: Date;
  duration: number; // ms
}

// Technician Report
export interface TechnicianReport {
  technicianId: string;
  technicianName: string;
  period: {
    start: Date;
    end: Date;
  };
  ticketsProcessed: number;
  ticketsByStatus: Record<string, number>;
  avgInterventionTime: number;
  slaCompliance: number;
  performance: number;
  motivation: string;
  activityData: Array<{
    date: string;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
}
