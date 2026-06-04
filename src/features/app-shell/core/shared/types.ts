export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'TECHNICIEN_NO' | 'USER';
export type DayType = 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | 'late';
export type ResponsibilityType = 'CALL_CENTER' | 'MONITORING' | 'REPORTING_1' | 'REPORTING_2';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskCategory = 'incident' | 'maintenance' | 'surveillance' | 'administrative' | 'other';
export type AlertType = 'warning' | 'critical' | 'info' | 'success' | 'normal' | 'passive' | 'external' | 'lucrative';

export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  strength: 'weak' | 'medium' | 'strong';
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
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
  type: AlertType;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  triggeredBy: 'time_limit' | 'overdue' | 'critical_not_started' | 'suspended_too_long' | 'no_task_created' | 'too_many_pending';
}

export interface TaskHistoryEntry {
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

export interface InactivityEvent {
  id: string;
  userId: string;
  userName: string;
  shiftName?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isActiveShift: boolean;
  isAlerted: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface ShiftStatistics {
  shiftName: string;
  date: Date;
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  lateTasks: number;
  avgProductivity: number;
  totalInactivityMinutes: number;
}

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
  shift?: { id: string; name: string; color: string; colorCode: string } | null;
  responsibility?: ResponsibilityType;
  shiftPeriodStart?: Date;
  shiftPeriodEnd?: Date;
  isActive: boolean;
  isBlocked: boolean;
  isFirstLogin: boolean;
  mustChangePassword: boolean;
  avatar?: string;
  lastActivity?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  monthlyScore?: number;
  reliabilityIndex?: number;
  performanceBadge?: 'exemplary' | 'reliable' | 'improving' | 'needs_attention';
}

export interface Task {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  responsibility?: ResponsibilityType;
  shiftName?: string;
  startTime: Date;
  estimatedEndTime: Date;
  actualEndTime?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  comments: TaskComment[];
  alerts: TaskAlert[];
  history: TaskHistoryEntry[];
  tags: string[];
  isOverdue: boolean;
  isNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: string;
  category: string;
  description: string;
  createdAt: Date;
}

export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  createdAt: Date;
  conversationId?: string;
  messageId?: string;
}

export type MessageFolder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'starred' | 'archived';
export type MessageStatus = 'unread' | 'read' | 'important' | 'archived';
export type MessagePriority = 'normal' | 'important' | 'urgent';

export interface EmailAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
  uploadedAt: Date;
}

export interface InternalMessage {
  id: string;
  threadId?: string;
  from: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  to: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  cc: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  bcc: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  folder: MessageFolder;
  status: MessageStatus;
  priority: MessagePriority;
  isStarred: boolean;
  isRead: boolean;
  labels: string[];
  sentAt?: Date;
  receivedAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  scheduledAt?: Date;
  isDraft: boolean;
  replyTo?: string;
  forwardedFrom?: string;
  selected?: boolean;
}

export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
}

export interface EmailSignature {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  readerId: string;
  readerName: string;
  readAt: Date;
}

export interface MessageTracking {
  id: string;
  messageId: string;
  recipientId: string;
  recipientEmail: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ChatMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location' | 'contact';
export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: ChatMessageType;
  content: string;
  mediaUrl?: string;
  mediaData?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  status: ChatMessageStatus;
  readAt?: Date;
  replyTo?: ChatMessage;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  isPinned: boolean;
  isImportant?: boolean;
  isArchived: boolean;
  isSelected?: boolean;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: 'small' | 'normal' | 'large';
    color?: string;
  };
  reactions: Array<{ userId: string; userName: string; emoji: string }>;
  readBy: Array<{ userId: string; userName: string; readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  type: 'individual' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'member';
    joinedAt: Date;
    lastReadAt?: Date;
  }>;
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

export interface CallHistory {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: 'audio' | 'video';
  status: 'missed' | 'answered' | 'declined' | 'ongoing';
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  isRecording?: boolean;
  timestamp: Date;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  conversationId: string;
  callId?: string;
  createdAt: Date;
}

export interface MessagingStats {
  totalMessages: number;
  totalConversations: number;
  totalGroups: number;
  totalCalls: number;
  averageResponseTime: number;
  mostActiveUsers: Array<{ userId: string; userName: string; messageCount: number }>;
  messagesByDay: Array<{ date: string; count: number }>;
}

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'escalated' | 'suspended' | 'waiting_fiche' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'incident' | 'request' | 'problem' | 'change' | 'other';

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

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

export interface TicketItem {
  id: string;
  numero: string;
  objet: string;
  contactName: string;
  accountName: string;
  recentThread: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  channel: string;
  site: string;
  localite: string;
  technicien: string;
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  history: TicketHistory[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  dueDate?: Date;
  etr?: Date;
  sla?: string;
  slr?: string;
  isArchived?: boolean;
  archivedAt?: Date;
  archivedYear?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface TicketOptionItem {
  id: string;
  name: string;
  localite?: string | null;
  departement?: string | null;
}

export interface TicketCountryOption {
  code: string;
  name: string;
  flagImage: string;
}

export interface TicketLocalityDraft {
  countryCode: string;
  countryName: string;
  departement: string;
  city: string;
  arrondissement: string;
  quartier: string;
  address: string;
  reference: string;
  freeText: string;
}

export interface TicketManagedLocality {
  id: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  departement?: string;
  city?: string;
  arrondissement?: string;
  quartier?: string;
  address?: string;
  reference?: string;
}

export interface TicketAdminSettings {
  numberFormat: string;
  numberSeed: number;
  notificationEmails: string[];
  supportCopyEmail: string;
  technicianFallbackEmail: string;
  lifecycleEmailEvents: {
    creation: boolean;
    pending: boolean;
    escalated: boolean;
    closed: boolean;
  };
  sendClientCopyForIncidentMaintenance: boolean;
  defaultSlaHours: number;
  trashRetentionDays: number;
  slaByCategory: Record<string, number>;
}