// ============================================
// TYPES - NOC Activities Application
// ============================================

// User Roles
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'TECHNICIEN_NO' | 'USER';

// Client Types
export type ClientType = 'Gold' | 'Premium' | 'Standard' | 'Bronze';
export type ServiceType = 'Internet' | 'Interco' | 'Internet et Interco';

// Ticket Types
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'escalated' | 'suspended' | 'waiting_fiche' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'incident_minor' | 'incident_major' | 'incident_critical' | 'maintenance' | 'survey' | 'intervention' | 'visit' | 'supply' | 'supervision' | 'flapping_incident';
export type TicketCategory = 'incident' | 'request' | 'problem' | 'change' | 'other';
export type TicketChannel = 'in_person' | 'phone' | 'whatsapp' | 'email';
export type ResolutionType = 'energetic_problem' | 'system' | 'telecom' | 'transmission' | 'datacom' | 'sabotage' | 'attenuation' | 'technician_error' | 'internal_loop' | 'other';

// Technician Units
export type TechnicianUnit = 'Datacom' | 'System' | 'NOC' | 'Field_Technician' | 'Electricity';

// Task Status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | 'late';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskCategory = 'incident' | 'maintenance' | 'surveillance' | 'administrative' | 'other';

// Shift Types
export type DayType = 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
export type ResponsibilityType = 'CALL_CENTER' | 'MONITORING' | 'REPORTING_1' | 'REPORTING_2';

// ============================================
// INTERFACES
// ============================================

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  passwordHash?: string;
  role: UserRole;
  shiftId?: string | null;
  shift?: Shift | null;
  responsibility?: ResponsibilityType;
  unit?: TechnicianUnit;
  avatar?: string;
  isActive: boolean;
  isBlocked: boolean;
  isFirstLogin: boolean;
  mustChangePassword: boolean;
  lastActivity?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  monthlyScore?: number;
  reliabilityIndex?: number;
}

// Client SC
export interface ClientSC {
  id: string;
  name: string;
  department: string;
  district: string;
  address?: string;
  phone?: string;
  email?: string;
  clientType: ClientType;
  serviceType: ServiceType;
  ipAddress?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  responsiblePersons: ResponsiblePerson[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ResponsiblePerson {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

// Technician
export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  pseudo: string;
  department: string;
  unit: TechnicianUnit;
  email?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  assignedTicketsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Shift
export interface Shift {
  id: string;
  name: string;
  color: string;
  colorCode: string;
  description?: string;
}

// Ticket
export interface Ticket {
  id: string;
  ticketNumber: string;
  object: string;
  type: TicketType;
  target?: string;
  clients: TicketClient[];
  locality: string;
  site: string;
  link?: string;
  technicians: TicketTechnician[];
  source: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  serviceType?: ServiceType;
  creatorEmail: string;
  creatorName: string;
  dueDate: Date;
  description: string;
  resolution?: string;
  resolutionType?: ResolutionType;
  closedAt?: Date;
  resolvedAt?: Date;
  isRecurring: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  outageStartTime?: Date;
  outageEndTime?: Date;
  outageDuration?: number;
}

export interface TicketClient {
  id: string;
  name: string;
  serviceType: ServiceType;
  ipAddress?: string;
}

export interface TicketTechnician {
  id: string;
  name: string;
  pseudo: string;
}

// Ticket Comment
export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  isPrivate: boolean;
  isEdited: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Ticket Activity (Sub-task)
export interface TicketActivity {
  id: string;
  ticketId: string;
  task: string;
  assignedTo: TicketTechnician;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// Ticket History
export interface TicketHistory {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

// Ticket Attachment
export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Time Entry
export interface TimeEntry {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  description?: string;
  createdAt: Date;
}

// Task
export interface Task {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  shiftName?: string;
  startTime: Date;
  estimatedEndTime: Date;
  estimatedDuration: number;
  completedAt?: Date;
  actualDuration?: number;
  isOverdue: boolean;
  isNotified: boolean;
  tags: string[];
  comments: TaskComment[];
  alerts: TaskAlert[];
  history: TaskHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

export interface TaskAlert {
  id: string;
  taskId: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  triggeredBy: 'time_limit' | 'overdue' | 'critical_not_started' | 'suspended_too_long' | 'no_task_created' | 'too_many_pending';
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'status_changed' | 'comment_added' | 'deleted';
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message?: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

// Message
export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  priority: 'low' | 'normal' | 'high';
  parentId?: string;
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecipient {
  id: string;
  userId: string;
  userName: string;
  email: string;
  type: 'to' | 'cc' | 'bcc';
  isRead: boolean;
  readAt?: Date;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
}

// Conversation (Chat)
export interface Conversation {
  id: string;
  type: 'individual' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyTo?: ChatMessage;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: Array<{ userId: string; userName: string; readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

// Password Validation
export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  strength: 'weak' | 'medium' | 'strong';
}

// Agent Performance
export interface AgentPerformance {
  userId: string;
  userName: string;
  shiftName?: string;
  period: 'daily' | 'weekly' | 'monthly';
  tasksCreated: number;
  tasksCompleted: number;
  tasksLate: number;
  tasksCancelled: number;
  avgCompletionTime: number;
  inactivityMinutes: number;
  productivityRate: number;
  onTimeRate: number;
  reliabilityScore: number;
  badge?: 'exemplary' | 'reliable' | 'improving' | 'needs_attention';
}
