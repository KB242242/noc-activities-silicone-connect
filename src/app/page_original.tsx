'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { toast, Toaster } from 'sonner';

// Icons
import {
  Moon, Sun, LogOut, LayoutDashboard, Calendar, Activity, Clock, Users, Settings, Bell,
  ChevronLeft, ChevronRight, ChevronDown, Phone, Monitor, FileText, AlertTriangle, CheckCircle2,
  TrendingUp, UserCheck, Plus, Download, Eye, EyeOff, RefreshCw, Menu, X, Mail, FileSpreadsheet,
  Edit, Trash2, Pause, Play, AlertCircle, Info, CheckCheck,
  Clock3, CalendarDays, User, Briefcase, ClipboardList, FileDown,
  ExternalLink, Truck, Network, Ticket, Globe, Coffee, Moon as MoonIcon, Search,
  Upload, Camera, XCircle, Lock, Shield, Sparkles, LogIn, Star, Inbox, Send,
  Paperclip, CornerDownLeft, CornerUpRight, MessageCircle, Video, Mic, MicOff,
  Volume2, VolumeX, Smile, Image as ImageIcon, Film, File, MoreVertical, PhoneOff, UserPlus,
  Hash, AtSign, Pin, Archive, BellOff, Check, RotateCcw, Reply, Forward, Megaphone, Heart, Eye as EyeIcon,
  CheckSquare, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Type, AlignLeft, AlignCenter, AlignRight, Paperclip as AttachIcon, Square, UserX,
  Minus, Maximize2, Minimize2, Highlighter, Tag
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiPickerTheme, EmojiClickData } from 'emoji-picker-react';

// Charts
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

// Types
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'TECHNICIEN_NO' | 'USER';
type DayType = 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | 'late';
type ResponsibilityType = 'CALL_CENTER' | 'MONITORING' | 'REPORTING_1' | 'REPORTING_2';

// Types pour le gestionnaire de tâches NOC
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskCategory = 'incident' | 'maintenance' | 'surveillance' | 'administrative' | 'other';
type AlertType = 'warning' | 'critical' | 'info' | 'success';

// Password validation result
interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  strength: 'weak' | 'medium' | 'strong';
}

// Audit Log for tracking actions
interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
}

// Commentaire de tâche
interface TaskComment {
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

// Alerte intelligente
interface TaskAlert {
  id: string;
  taskId: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  triggeredBy: 'time_limit' | 'overdue' | 'critical_not_started' | 'suspended_too_long' | 'no_task_created' | 'too_many_pending';
}

// Historique des modifications de tâche
interface TaskHistoryEntry {
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

// Performance d'un agent
interface AgentPerformance {
  userId: string;
  userName: string;
  shiftName?: string;
  period: 'daily' | 'weekly' | 'monthly';
  tasksCreated: number;
  tasksCompleted: number;
  tasksLate: number;
  tasksCancelled: number;
  avgCompletionTime: number; // en minutes
  inactivityMinutes: number;
  productivityRate: number; // pourcentage
  onTimeRate: number; // pourcentage de tâches à l'heure
  reliabilityScore: number; // 0-100
  badge?: 'exemplary' | 'reliable' | 'improving' | 'needs_attention';
}

// Détection d'inactivité
interface InactivityEvent {
  id: string;
  userId: string;
  userName: string;
  shiftName?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // en minutes
  isActiveShift: boolean;
  isAlerted: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Statistiques de shift
interface ShiftStatistics {
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

interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string; // Pseudo for login
  passwordHash?: string; // Hashed password
  role: UserRole;
  shiftId?: string | null;
  shift?: { id: string; name: string; color: string; colorCode: string; } | null;
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
  // Extension performance
  monthlyScore?: number;
  reliabilityIndex?: number;
  performanceBadge?: 'exemplary' | 'reliable' | 'improving' | 'needs_attention';
}

interface Task {
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
  estimatedDuration: number; // en minutes
  actualDuration?: number; // en minutes
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

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: string;
  category: string;
  description: string;
  createdAt: Date;
}

interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  createdAt: Date;
}

// ============================================
// TYPES MESSAGERIE INTERNE (GMAIL-LIKE)
// ============================================

type MessageFolder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'starred';
type MessageStatus = 'unread' | 'read' | 'important' | 'archived';
type MessagePriority = 'normal' | 'important' | 'urgent';

// Pièce jointe
interface EmailAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number; // en bytes
  fileType: string;
  fileData: string; // base64
  uploadedAt: Date;
}

// Message interne
interface InternalMessage {
  id: string;
  threadId?: string; // Pour regrouper les conversations
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
  scheduledAt?: Date; // Envoi planifié
  isDraft: boolean;
  replyTo?: string; // ID du message auquel on répond
  forwardedFrom?: string; // ID du message transféré
  selected?: boolean; // Pour la sélection multiple
}

// Libellé personnalisé
interface EmailLabel {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
}

// Signature email
interface EmailSignature {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: Date;
}

// Modèle de message
interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
}

// Accusé de lecture
interface ReadReceipt {
  id: string;
  messageId: string;
  readerId: string;
  readerName: string;
  readAt: Date;
}

// Statut de message pour suivi
interface MessageTracking {
  id: string;
  messageId: string;
  recipientId: string;
  recipientEmail: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}

// ============================================
// TYPES MESSAGERIE INSTANTANÉE (WHATSAPP-STYLE)
// ============================================

// Statut de message WhatsApp
type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
type ChatMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location' | 'contact';

// Statut de présence
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

// Message de chat
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: ChatMessageType;
  content: string;
  mediaUrl?: string;
  mediaData?: string; // base64
  fileName?: string;
  fileSize?: number;
  duration?: number; // pour audio/vidéo en secondes
  status: ChatMessageStatus;
  replyTo?: ChatMessage;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedForEveryone: boolean;
  isPinned: boolean;
  isArchived: boolean; // for archiving individual messages
  isSelected?: boolean; // For multi-select
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

// Conversation (chat individuel ou groupe)
interface Conversation {
  id: string;
  type: 'individual' | 'group';
  name?: string; // pour les groupes
  description?: string; // pour les groupes
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

// Appel audio/vidéo
interface CallHistory {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: 'audio' | 'video';
  status: 'missed' | 'answered' | 'declined' | 'ongoing';
  duration?: number; // en secondes
  startedAt: Date;
  endedAt?: Date;
}

// Indicateur de frappe
interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

// Statistiques de messagerie (pour Super Admin)
interface MessagingStats {
  totalMessages: number;
  totalConversations: number;
  totalGroups: number;
  totalCalls: number;
  averageResponseTime: number; // en minutes
  mostActiveUsers: Array<{ userId: string; userName: string; messageCount: number }>;
  messagesByDay: Array<{ date: string; count: number }>;
}

// ============================================
// CONFIGURATION
// ============================================

const SHIFT_CYCLE_START: Record<string, Date> = {
  'A': new Date('2026-02-24T00:00:00'),
  'B': new Date('2026-02-21T00:00:00'),
  'C': new Date('2026-02-18T00:00:00'),
};

const SHIFTS_DATA: Record<string, { name: string; color: string; colorCode: string; members: string[] }> = {
  'A': { name: 'Shift A', color: 'blue', colorCode: '#3B82F6', members: ['Alaine', 'Casimir', 'Luca', 'José'] },
  'B': { name: 'Shift B', color: 'yellow', colorCode: '#EAB308', members: ['Sahra', 'Severin', 'Marly', 'Furys'] },
  'C': { name: 'Shift C', color: 'green', colorCode: '#22C55E', members: ['Audrey', 'Lapreuve', 'Lotti', 'Kevine'] }
};

const CYCLE_TOTAL_DAYS = 9;

const SHIFT_HEX: Record<string, string> = {
  'A': '#3B82F6',
  'B': '#EAB308',
  'C': '#22C55E'
};

// Safe color getter
const getShiftColor = (shiftName: string): string => {
  return SHIFT_HEX[shiftName] || '#6B7280';
};

const getShiftLightBg = (shiftName: string): string => {
  const colors: Record<string, string> = {
    'A': 'bg-blue-100 dark:bg-blue-900/30',
    'B': 'bg-yellow-100 dark:bg-yellow-900/30',
    'C': 'bg-green-100 dark:bg-green-900/30'
  };
  return colors[shiftName] || 'bg-gray-100 dark:bg-gray-900/30';
};

const EXTERNAL_LINKS = [
  { id: '1', name: 'Suivi véhicules', url: 'https://za.mixtelematics.com/#/login', category: 'vehicles', icon: Truck, description: 'MixTelematics' },
  { id: '2', name: 'LibreNMS', url: 'http://192.168.2.25:6672/', category: 'monitoring', icon: Network, description: 'Monitoring réseau' },
  { id: '3', name: 'Zabbix', url: 'http://192.168.2.2:6672/', category: 'monitoring', icon: Activity, description: 'Suivi incidents' },
  { id: '4', name: 'Zoho Desk', url: 'https://desk.zoho.com/', category: 'tickets', icon: Ticket, description: 'Gestion tickets' },
  { id: '5', name: 'Tickets Sheets', url: 'https://docs.google.com/spreadsheets/d/1Z21eIjNuJVRvqTmj7DhQI4emVlqKBpia-eR--DviSj8/edit', category: 'tickets', icon: FileSpreadsheet, description: 'Liste tickets' },
  { id: '6', name: 'WhatsApp', url: 'https://web.whatsapp.com/', category: 'communication', icon: Phone, description: 'Messagerie' },
  { id: '7', name: 'Gmail', url: 'https://mail.google.com/', category: 'communication', icon: Mail, description: 'Email' }
];

// ============================================
// CONFIGURATION TÂCHES NOC
// ============================================

const TASK_PRIORITIES: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  medium: { label: 'Moyenne', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  high: { label: 'Haute', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

const TASK_CATEGORIES: Record<TaskCategory, { label: string; icon: string }> = {
  incident: { label: 'Incident', icon: '🚨' },
  maintenance: { label: 'Maintenance', icon: '🔧' },
  surveillance: { label: 'Surveillance', icon: '👁️' },
  administrative: { label: 'Administratif', icon: '📋' },
  other: { label: 'Autre', icon: '📌' }
};

const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  in_progress: { label: 'En cours', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { label: 'Terminée', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  on_hold: { label: 'Suspendue', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  cancelled: { label: 'Annulée', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  late: { label: 'En retard', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

const BADGE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  exemplary: { label: 'Agent Exemplaire', icon: '🏆', color: 'text-yellow-500' },
  reliable: { label: 'Agent Fiable', icon: '⭐', color: 'text-blue-500' },
  improving: { label: 'En Progression', icon: '📈', color: 'text-green-500' },
  needs_attention: { label: 'À Surveiller', icon: '⚠️', color: 'text-orange-500' }
};

// Seuils d'alerte
const ALERT_THRESHOLDS = {
  inactivityMinutes: 120, // 2 heures
  taskApproachingMinutes: 30, // 30 min avant la fin estimée
  suspendedTooLongMinutes: 60, // 1 heure suspendue
  noTaskCreatedAfterShiftStart: 60, // 1 heure après début shift
  tooManyPendingEndShift: 60 // 1 heure avant fin shift
};

const ACTIVITY_TYPES: Record<string, Array<{ value: string; label: string }>> = {
  'Monitoring': [
    { value: 'CLIENT_DOWN', label: 'Client Down' },
    { value: 'INTERFACE_UNSTABLE', label: 'Interface instable' },
    { value: 'RECURRENT_PROBLEM', label: 'Problème récurrent' },
    { value: 'EQUIPMENT_ALERT', label: 'Alerte équipement' }
  ],
  'Call Center': [
    { value: 'TICKET_CREATED', label: 'Ticket créé' },
    { value: 'CLIENT_CALL', label: 'Appel client' },
    { value: 'ESCALATION', label: 'Escalade' },
    { value: 'INCIDENT_FOLLOWUP', label: 'Suivi incident' }
  ],
  'Reporting 1': [
    { value: 'GRAPH_SENT', label: 'Graphe envoyé' },
    { value: 'ALERT_PUBLISHED', label: 'Alerte publiée' },
    { value: 'HANDOVER_WRITTEN', label: 'Handover rédigé' }
  ],
  'Reporting 2': [
    { value: 'REPORT_GENERATED', label: 'Rapport généré' },
    { value: 'TICKET_UPDATED', label: 'Ticket mis à jour' },
    { value: 'TICKET_CLOSED', label: 'Ticket clôturé' },
    { value: 'RFO_CREATED', label: 'RFO créé' }
  ]
};

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', text: 'En attente' },
  in_progress: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', text: 'En cours' },
  completed: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Terminé' },
  on_hold: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', text: 'Suspendu' }
};

const DEMO_USERS: Record<string, UserProfile> = {
  'secureadmin@siliconeconnect.com': { 
    id: 'super-admin-1', 
    email: 'secureadmin@siliconeconnect.com', 
    name: 'Admin', 
    firstName: 'Admin',
    lastName: 'SC',
    username: 'Admin',
    passwordHash: '@adminsc2026',
    role: 'SUPER_ADMIN', 
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'theresia@siliconeconnect.com': { 
    id: 'sup-1', 
    email: 'theresia@siliconeconnect.com', 
    name: 'Theresia', 
    firstName: 'Theresia',
    lastName: '',
    username: 'Theresia',
    passwordHash: '#Esia2026RepSC',
    role: 'RESPONSABLE', 
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'kevine@siliconeconnect.com': { 
    id: 'agent-c4', 
    email: 'kevine@siliconeconnect.com', 
    name: 'Kevine', 
    firstName: 'Kevine',
    lastName: '',
    username: 'Kevine',
    passwordHash: '@Admin2026SC',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-c', 
    shift: { id: 'shift-c', name: 'C', color: 'green', colorCode: '#22C55E' }, 
    responsibility: 'MONITORING',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'audrey@siliconeconnect.com': { 
    id: 'agent-c1', 
    email: 'audrey@siliconeconnect.com', 
    name: 'Audrey', 
    firstName: 'Audrey',
    lastName: '',
    username: 'Audrey',
    passwordHash: '@Tech2026NOCSC',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-c', 
    shift: { id: 'shift-c', name: 'C', color: 'green', colorCode: '#22C55E' }, 
    responsibility: 'CALL_CENTER',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'lotti@siliconeconnect.com': { 
    id: 'agent-c3', 
    email: 'lotti@siliconeconnect.com', 
    name: 'Lotti', 
    firstName: 'Lotti',
    lastName: '',
    username: 'Lotti',
    passwordHash: '@Lotty*SC2026',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-c', 
    shift: { id: 'shift-c', name: 'C', color: 'green', colorCode: '#22C55E' }, 
    responsibility: 'REPORTING_1',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'lapreuve@siliconeconnect.com': { 
    id: 'agent-c2', 
    email: 'lapreuve@siliconeconnect.com', 
    name: 'Lapreuve', 
    firstName: 'Lapreuve',
    lastName: '',
    username: 'Lapreuve',
    passwordHash: 'SC2026@LapNOC!',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-c', 
    shift: { id: 'shift-c', name: 'C', color: 'green', colorCode: '#22C55E' }, 
    responsibility: 'REPORTING_2',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'luca@siliconeconnect.com': { 
    id: 'agent-a3', 
    email: 'luca@siliconeconnect.com', 
    name: 'Luca', 
    firstName: 'Luca',
    lastName: '',
    username: 'Luca',
    passwordHash: 'Lulu_SC#2026',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-a', 
    shift: { id: 'shift-a', name: 'A', color: 'blue', colorCode: '#3B82F6' }, 
    responsibility: 'REPORTING_1',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'jose@siliconeconnect.com': { 
    id: 'agent-a4', 
    email: 'jose@siliconeconnect.com', 
    name: 'José', 
    firstName: 'José',
    lastName: '',
    username: 'José',
    passwordHash: 'J0se!2026_SC',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-a', 
    shift: { id: 'shift-a', name: 'A', color: 'blue', colorCode: '#3B82F6' }, 
    responsibility: 'REPORTING_2',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'casimir@siliconeconnect.com': { 
    id: 'agent-a2', 
    email: 'casimir@siliconeconnect.com', 
    name: 'Casimir', 
    firstName: 'Casimir',
    lastName: '',
    username: 'Casimir',
    passwordHash: 'Cas_SC2026$mir',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-a', 
    shift: { id: 'shift-a', name: 'A', color: 'blue', colorCode: '#3B82F6' }, 
    responsibility: 'MONITORING',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'alaine@siliconeconnect.com': { 
    id: 'agent-a1', 
    email: 'alaine@siliconeconnect.com', 
    name: 'Alaine', 
    firstName: 'Alaine',
    lastName: '',
    username: 'Alaine',
    passwordHash: 'Ala!2026_NOC',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-a', 
    shift: { id: 'shift-a', name: 'A', color: 'blue', colorCode: '#3B82F6' }, 
    responsibility: 'CALL_CENTER',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'furys@siliconeconnect.com': { 
    id: 'agent-b4', 
    email: 'furys@siliconeconnect.com', 
    name: 'Furys', 
    firstName: 'Furys',
    lastName: '',
    username: 'Furys',
    passwordHash: 'Fury2026@SC#',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-b', 
    shift: { id: 'shift-b', name: 'B', color: 'yellow', colorCode: '#EAB308' }, 
    responsibility: 'REPORTING_2',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'marly@siliconeconnect.com': { 
    id: 'agent-b3', 
    email: 'marly@siliconeconnect.com', 
    name: 'Marly', 
    firstName: 'Marly',
    lastName: '',
    username: 'Marly',
    passwordHash: 'Marly_SC2026!',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-b', 
    shift: { id: 'shift-b', name: 'B', color: 'yellow', colorCode: '#EAB308' }, 
    responsibility: 'REPORTING_1',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'sahra@siliconeconnect.com': { 
    id: 'agent-b1', 
    email: 'sahra@siliconeconnect.com', 
    name: 'Sahra', 
    firstName: 'Sahra',
    lastName: '',
    username: 'Sahra',
    passwordHash: 'Sahra2026*SC',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-b', 
    shift: { id: 'shift-b', name: 'B', color: 'yellow', colorCode: '#EAB308' }, 
    responsibility: 'CALL_CENTER',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'severin@siliconeconnect.com': { 
    id: 'agent-b2', 
    email: 'severin@siliconeconnect.com', 
    name: 'Severin', 
    firstName: 'Severin',
    lastName: '',
    username: 'Severin',
    passwordHash: 'Sev2026_SC@rin',
    role: 'TECHNICIEN_NO', 
    shiftId: 'shift-b', 
    shift: { id: 'shift-b', name: 'B', color: 'yellow', colorCode: '#EAB308' }, 
    responsibility: 'MONITORING',
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  'lyse@siliconeconnect.com': { 
    id: 'agent-lyse', 
    email: 'lyse@siliconeconnect.com', 
    name: 'Lyse', 
    firstName: 'Lyse',
    lastName: '',
    username: 'Lyse',
    passwordHash: 'Lyse_SC!2026',
    role: 'TECHNICIEN_NO', 
    isActive: true, 
    isBlocked: false,
    isFirstLogin: true,
    mustChangePassword: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// ============================================
// FONCTIONS DE SÉCURITÉ
// ============================================

// Validation du mot de passe
function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
  
  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strength: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  
  return {
    isValid: hasMinLength && hasUppercase && hasNumber && hasSpecial,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    strength
  };
}

// Hashage simple (pour localStorage - en production utiliser bcrypt côté serveur)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash)}_${password.length}_${btoa(password.slice(0, 3))}`;
}

// Vérification du mot de passe
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash || password === hash; // Support anciens mots de passe en clair
}

// Génération d'ID unique
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Vérification si l'utilisateur est Super Admin
function isSuperAdmin(user: UserProfile | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

// Vérification des permissions
function hasPermission(user: UserProfile | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  const permissions: Record<UserRole, string[]> = {
    'SUPER_ADMIN': ['all'],
    'ADMIN': ['view_users', 'edit_users', 'view_logs', 'create_user', 'reset_password'],
    'RESPONSABLE': ['view_users', 'view_logs', 'create_task', 'edit_task'],
    'TECHNICIEN': ['view_tasks', 'edit_own_tasks', 'create_activity'],
    'TECHNICIEN_NO': ['view_tasks', 'edit_own_tasks', 'create_activity', 'generate_pdf'],
    'USER': ['view_own_profile', 'edit_own_profile']
  };
  
  return permissions[user.role]?.includes(permission) || false;
}

// Configuration des rôles
const ROLE_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-red-100 text-red-800', description: 'Accès complet à toutes les fonctionnalités' },
  'ADMIN': { label: 'Administrateur', color: 'bg-orange-100 text-orange-800', description: 'Gestion des utilisateurs et paramètres' },
  'RESPONSABLE': { label: 'Responsable', color: 'bg-purple-100 text-purple-800', description: 'Supervision et rapports' },
  'TECHNICIEN': { label: 'Technicien', color: 'bg-blue-100 text-blue-800', description: 'Opérations techniques' },
  'TECHNICIEN_NO': { label: 'Technicien NOC', color: 'bg-green-100 text-green-800', description: 'Agent NOC - Shifts et monitoring' },
  'USER': { label: 'Utilisateur', color: 'bg-gray-100 text-gray-800', description: 'Accès standard' }
};

// Configuration des responsabilités NOC
const RESPONSIBILITY_CONFIG: Record<ResponsibilityType, { label: string; icon: typeof Phone; color: string }> = {
  'CALL_CENTER': { label: 'Call Center', icon: Phone, color: 'text-blue-600' },
  'MONITORING': { label: 'Monitoring', icon: Activity, color: 'text-green-600' },
  'REPORTING_1': { label: 'Reporting 1', icon: FileText, color: 'text-purple-600' },
  'REPORTING_2': { label: 'Reporting 2', icon: FileSpreadsheet, color: 'text-orange-600' }
};

// ============================================
// FONCTIONS UTILITAIRES TÂCHES NOC
// ============================================

// Créer une nouvelle tâche
function createNewTask(
  userId: string,
  userName: string,
  taskData: Partial<Task>,
  shiftName?: string
): Task {
  const now = new Date();
  const startTime = taskData.startTime || now;
  const estimatedDuration = taskData.estimatedDuration || 60;
  const estimatedEndTime = new Date(startTime.getTime() + estimatedDuration * 60000);
  
  return {
    id: generateId(),
    userId,
    userName,
    title: taskData.title || 'Nouvelle tâche',
    description: taskData.description || '',
    status: 'pending',
    category: taskData.category || 'other',
    priority: taskData.priority || 'medium',
    shiftName,
    startTime,
    estimatedEndTime,
    estimatedDuration,
    comments: [],
    alerts: [],
    history: [{
      id: generateId(),
      taskId: '',
      userId,
      userName,
      action: 'created',
      timestamp: now
    }],
    tags: taskData.tags || [],
    isOverdue: false,
    isNotified: false,
    createdAt: now,
    updatedAt: now
  };
}

// Calculer si une tâche est en retard
function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  return new Date() > task.estimatedEndTime;
}

// Calculer la durée réelle d'une tâche
function calculateActualDuration(task: Task): number | undefined {
  if (!task.completedAt || !task.startTime) return undefined;
  return Math.round((task.completedAt.getTime() - task.startTime.getTime()) / 60000);
}

// Générer une alerte pour une tâche
function generateTaskAlert(
  task: Task,
  triggerType: TaskAlert['triggeredBy']
): TaskAlert {
  const messages: Record<TaskAlert['triggeredBy'], string> = {
    time_limit: `La tâche "${task.title}" approche de sa limite de temps`,
    overdue: `La tâche "${task.title}" a dépassé son temps estimé`,
    critical_not_started: `La tâche critique "${task.title}" n'a pas encore commencé`,
    suspended_too_long: `La tâche "${task.title}" est suspendue depuis trop longtemps`,
    no_task_created: `Aucune tâche créée depuis le début du shift`,
    too_many_pending: `Trop de tâches en attente avant la fin du shift`
  };
  
  const types: Record<TaskAlert['triggeredBy'], AlertType> = {
    time_limit: 'warning',
    overdue: 'critical',
    critical_not_started: 'critical',
    suspended_too_long: 'warning',
    no_task_created: 'warning',
    too_many_pending: 'info'
  };
  
  return {
    id: generateId(),
    taskId: task.id,
    type: types[triggerType],
    message: messages[triggerType],
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
    triggeredBy: triggerType
  };
}

// Calculer les statistiques de performance d'un agent
function calculateAgentPerformance(
  tasks: Task[],
  userId: string,
  userName: string,
  period: 'daily' | 'weekly' | 'monthly',
  inactivityMinutes: number = 0,
  shiftName?: string
): AgentPerformance {
  const userTasks = tasks.filter(t => t.userId === userId);
  const completed = userTasks.filter(t => t.status === 'completed');
  const late = userTasks.filter(t => t.status === 'late' || t.isOverdue);
  const cancelled = userTasks.filter(t => t.status === 'cancelled');
  
  const avgCompletionTime = completed.length > 0
    ? completed.reduce((sum, t) => sum + (t.actualDuration || t.estimatedDuration), 0) / completed.length
    : 0;
  
  const productivityRate = userTasks.length > 0
    ? Math.round((completed.length / userTasks.length) * 100)
    : 0;
  
  const onTimeRate = completed.length > 0
    ? Math.round(((completed.length - late.length) / completed.length) * 100)
    : 0;
  
  // Score de fiabilité basé sur plusieurs facteurs
  const reliabilityScore = Math.max(0, Math.min(100,
    productivityRate * 0.4 +
    onTimeRate * 0.3 +
    Math.max(0, 100 - inactivityMinutes / 2) * 0.3
  ));
  
  // Attribution du badge
  let badge: AgentPerformance['badge'] = 'needs_attention';
  if (reliabilityScore >= 90) badge = 'exemplary';
  else if (reliabilityScore >= 75) badge = 'reliable';
  else if (reliabilityScore >= 50) badge = 'improving';
  
  return {
    userId,
    userName,
    shiftName,
    period,
    tasksCreated: userTasks.length,
    tasksCompleted: completed.length,
    tasksLate: late.length,
    tasksCancelled: cancelled.length,
    avgCompletionTime,
    inactivityMinutes,
    productivityRate,
    onTimeRate,
    reliabilityScore,
    badge
  };
}

// Vérifier si le temps d'inactivité dépasse le seuil
function checkInactivity(
  lastActivityTime: Date,
  thresholdMinutes: number = ALERT_THRESHOLDS.inactivityMinutes
): { isInactive: boolean; inactiveMinutes: number } {
  const now = new Date();
  const inactiveMs = now.getTime() - lastActivityTime.getTime();
  const inactiveMinutes = Math.floor(inactiveMs / 60000);
  
  return {
    isInactive: inactiveMinutes >= thresholdMinutes,
    inactiveMinutes
  };
}

// Trier les tâches par priorité
function sortTasksByPriority(taskList: Task[]): Task[] {
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  
  return [...taskList].sort((a, b) => {
    // D'abord par statut (en cours > en attente > autres)
    const statusOrder: Record<TaskStatus, number> = {
      in_progress: 0,
      pending: 1,
      on_hold: 2,
      late: 3,
      completed: 4,
      cancelled: 5
    };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Ensuite par priorité
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Formater la durée en heures et minutes
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

// Obtenir la couleur de statut pour le Gantt
function getGanttTaskColor(task: Task): string {
  if (task.isOverdue || task.status === 'late') return '#EF4444'; // red
  if (task.status === 'completed') return '#22C55E'; // green
  if (task.status === 'in_progress') return '#3B82F6'; // blue
  if (task.status === 'on_hold') return '#F97316'; // orange
  if (task.status === 'pending') return '#EAB308'; // yellow
  return '#6B7280'; // gray
}

// ============================================
// FONCTIONS UTILITAIRES PLANNING
// ============================================

function getShiftScheduleForDate(shiftName: string, targetDate: Date): { 
  dayType: DayType; 
  dayNumber: number;
  cycleNumber: number;
  isWorking: boolean;
  isCollectiveRest: boolean;
} {
  const startDate = SHIFT_CYCLE_START[shiftName];
  if (!startDate) {
    return { dayType: 'REST_DAY', dayNumber: 0, cycleNumber: 0, isWorking: false, isCollectiveRest: true };
  }
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / msPerDay);
  
  if (daysDiff < 0) {
    const cyclesBack = Math.ceil(Math.abs(daysDiff) / CYCLE_TOTAL_DAYS);
    const adjustedDaysDiff = daysDiff + (cyclesBack * CYCLE_TOTAL_DAYS);
    const cyclePosition = ((adjustedDaysDiff % CYCLE_TOTAL_DAYS) + CYCLE_TOTAL_DAYS) % CYCLE_TOTAL_DAYS;
    return getScheduleFromPosition(cyclePosition, 0);
  }
  
  const cycleNumber = Math.floor(daysDiff / CYCLE_TOTAL_DAYS) + 1;
  const cyclePosition = daysDiff % CYCLE_TOTAL_DAYS;
  
  return getScheduleFromPosition(cyclePosition, cycleNumber);
}

function getScheduleFromPosition(cyclePosition: number, cycleNumber: number): { 
  dayType: DayType; 
  dayNumber: number;
  cycleNumber: number;
  isWorking: boolean;
  isCollectiveRest: boolean;
} {
  if (cyclePosition < 3) {
    return { dayType: 'DAY_SHIFT', dayNumber: cyclePosition + 1, cycleNumber, isWorking: true, isCollectiveRest: false };
  } else if (cyclePosition < 6) {
    return { dayType: 'NIGHT_SHIFT', dayNumber: cyclePosition + 1, cycleNumber, isWorking: true, isCollectiveRest: false };
  } else {
    return { dayType: 'REST_DAY', dayNumber: 0, cycleNumber, isWorking: false, isCollectiveRest: true };
  }
}

function getIndividualRestAgent(shiftName: string, targetDate: Date): { agentIndex: number; agentName: string } | null {
  const schedule = getShiftScheduleForDate(shiftName, targetDate);
  const shiftData = SHIFTS_DATA[shiftName];
  
  if (!shiftData || schedule.isCollectiveRest || schedule.dayNumber < 3) {
    return null;
  }
  
  const members = shiftData.members;
  const msPerDay = 1000 * 60 * 60 * 24;
  const startDate = SHIFT_CYCLE_START[shiftName];
  
  if (!startDate) return null;
  
  const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / msPerDay);
  const cycleNumber = Math.floor(daysDiff / CYCLE_TOTAL_DAYS) + 1;
  const restPosition = schedule.dayNumber - 3;
  
  const rotationMatrix: Record<number, number[]> = {
    1: [-1, 0, 2, 1],
    2: [1, 3, 0, 2],
    3: [2, 1, 3, 0],
    4: [0, 2, 1, 3],
    5: [3, 0, 2, 1],
  };
  
  if (cycleNumber === 1 && restPosition === 0) return null;
  
  const effectiveCycle = ((cycleNumber - 1) % 5) + 1;
  const agentIndex = rotationMatrix[effectiveCycle]?.[restPosition] ?? -1;
  
  if (agentIndex === -1 || agentIndex >= members.length) return null;
  
  return { agentIndex, agentName: members[agentIndex] };
}

function getAgentRestInfo(agentName: string, shiftName: string, targetDate: Date) {
  const schedule = getShiftScheduleForDate(shiftName, targetDate);
  const shiftData = SHIFTS_DATA[shiftName];
  
  if (!shiftData) {
    return { isOnIndividualRest: false, isOnCollectiveRest: true, nextIndividualRest: null, nextCollectiveRestStart: null };
  }
  
  let isOnIndividualRest = false;
  
  if (schedule.isWorking && schedule.dayNumber >= 3) {
    const restInfo = getIndividualRestAgent(shiftName, targetDate);
    if (restInfo && restInfo.agentName === agentName) {
      isOnIndividualRest = true;
    }
  }
  
  let nextIndividualRest: Date | null = null;
  let searchDate = addDays(targetDate, 1);
  
  for (let i = 0; i < 30; i++) {
    const restInfo = getIndividualRestAgent(shiftName, searchDate);
    if (restInfo && restInfo.agentName === agentName) {
      nextIndividualRest = searchDate;
      break;
    }
    searchDate = addDays(searchDate, 1);
  }
  
  let nextCollectiveRestStart: Date | null = null;
  searchDate = targetDate;
  
  for (let i = 0; i < CYCLE_TOTAL_DAYS; i++) {
    const searchSchedule = getShiftScheduleForDate(shiftName, searchDate);
    if (searchSchedule.isCollectiveRest) {
      nextCollectiveRestStart = searchDate;
      break;
    }
    searchDate = addDays(searchDate, 1);
  }
  
  return { isOnIndividualRest, isOnCollectiveRest: schedule.isCollectiveRest, nextIndividualRest, nextCollectiveRestStart };
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NOCActivityApp() {
  // États principaux
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [overtimeMonth, setOvertimeMonth] = useState(new Date(2026, 1, 1));
  const [restDialogOpen, setRestDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: '', category: 'Monitoring', description: '' });
  
  // États pour la gestion des utilisateurs et sécurité
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email ou Pseudo
  const [showPassword, setShowPassword] = useState(false); // Toggle visibilité mot de passe
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<UserProfile | null>(null);

  // États pour le suivi des tentatives de connexion et verrouillage progressif
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showForgotMessage, setShowForgotMessage] = useState(false);

  // États pour les champs focus (labels flottants)
  const [pseudoFocused, setPseudoFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Dialogs de gestion de compte
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [usersManagementOpen, setUsersManagementOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  
  // États pour l'édition
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editShift, setEditShift] = useState<string>('');
  const [editResponsibility, setEditResponsibility] = useState<ResponsibilityType | ''>('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  
  // États pour la gestion des utilisateurs (Super Admin)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // ============================================
  // États pour le module Tâches NOC
  // ============================================
  
  // État des tâches avancées
  const [nocTasks, setNocTasks] = useState<Task[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'my' | 'pending' | 'late' | 'critical'>('my');
  const [taskDateFilter, setTaskDateFilter] = useState<Date>(new Date());
  const [ganttView, setGanttView] = useState<'day' | 'week'>('day');
  
  // Nouvelle tâche
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    category: 'other' as TaskCategory,
    startTime: new Date(),
    estimatedDuration: 60, // minutes
    tags: ''
  });
  
  // Commentaires
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  
  // Alertes
  const [taskAlerts, setTaskAlerts] = useState<TaskAlert[]>([]);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  // Inactivité
  const [inactivityEvents, setInactivityEvents] = useState<InactivityEvent[]>([]);
  const [lastUserActivity, setLastUserActivity] = useState<Date>(new Date());
  const [isUserInactive, setIsUserInactive] = useState(false);
  
  // Performance
  const [agentPerformances, setAgentPerformances] = useState<AgentPerformance[]>([]);
  const [performancePeriod, setPerformancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAgentForStats, setSelectedAgentForStats] = useState<string | null>(null);
  
  // Statistiques de shift
  const [shiftStats, setShiftStats] = useState<ShiftStatistics | null>(null);
  
  // Vue supervision
  const [supervisionView, setSupervisionView] = useState<'tasks' | 'gantt' | 'performance' | 'alerts'>('tasks');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  
  // ============================================
  // États pour la Messagerie Interne (Gmail-like)
  // ============================================
  
  // Messages
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [currentFolder, setCurrentFolder] = useState<MessageFolder>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  
  // Composition
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<InternalMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<InternalMessage | null>(null);
  const [newEmail, setNewEmail] = useState({
    to: [] as Array<{ id: string; name: string; email: string }>,
    cc: [] as Array<{ id: string; name: string; email: string }>,
    bcc: [] as Array<{ id: string; name: string; email: string }>,
    subject: '',
    body: '',
    attachments: [] as EmailAttachment[],
    priority: 'normal' as MessagePriority,
    scheduledAt: null as Date | null
  });
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<'to' | 'cc' | 'bcc' | null>(null);
  
  // Libellés
  const [emailLabels, setEmailLabels] = useState<EmailLabel[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  
  // Signature
  const [emailSignature, setEmailSignature] = useState<EmailSignature | null>(null);
  
  // Vue
  const [emailViewMode, setEmailViewMode] = useState<'list' | 'conversation'>('list');
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  
  // Gmail Clone - Enhanced States
  const [snoozedEmails, setSnoozedEmails] = useState<Map<string, Date>>(new Map());
  const [importantEmails, setImportantEmails] = useState<Set<string>>(new Set());
  const [gmailSettingsOpen, setGmailSettingsOpen] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [vacationResponder, setVacationResponder] = useState({
    enabled: false,
    subject: '',
    body: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [emailSettings, setEmailSettings] = useState({
    signature: '',
    requestReadReceipt: false,
    confidentialMode: false,
    priority: 'normal' as 'low' | 'normal' | 'high'
  });
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({
    from: '',
    to: '',
    subject: '',
    hasAttachment: false,
    beforeDate: null as Date | null,
    afterDate: null as Date | null
  });
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeMaximized, setComposeMaximized] = useState(false);
  const [richTextStyle, setRichTextStyle] = useState({
    bold: false,
    italic: false,
    underline: false,
    fontFamily: 'Arial',
    fontSize: '14px',
    textColor: '#000000',
    highlightColor: '#ffffff',
    align: 'left' as 'left' | 'center' | 'right'
  });
  
  // Rich Text Editor States
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorFontFamily, setEditorFontFamily] = useState('Arial');
  const [editorFontSize, setEditorFontSize] = useState('3');
  const [editorTextColor, setEditorTextColor] = useState('#000000');
  const [editorHighlightColor, setEditorHighlightColor] = useState('#ffffff');
  const [editorFormats, setEditorFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const [linkUrl, setLinkUrl] = useState('');
  
  // Format text function
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // Update format states
    setEditorFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  };
  
  const [emailNotifications, setEmailNotifications] = useState({
    soundEnabled: true,
    browserNotifications: false,
    newEmailSound: true
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectMode, setSelectMode] = useState<'none' | 'some' | 'all'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 25;

  // ============================================
  // États pour la Messagerie Instantanée (WhatsApp-Style)
  // ============================================
  
  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  
  // Typing & Presence
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, PresenceStatus>>(() => {
    const initial: Record<string, PresenceStatus> = {};
    Object.values(DEMO_USERS).forEach(u => {
      initial[u.id] = u.isActive ? 'online' : 'offline';
    });
    return initial;
  });
  
  // Appels
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [activeCall, setActiveCall] = useState<CallHistory | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallHistory | null>(null);
  
  // Groupe
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Nouvelle conversation individuelle
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState('');
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Message reply/edit
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState<ChatMessage | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  
  // Conversation filter
  const [conversationFilter, setConversationFilter] = useState<'all' | 'unread' | 'groups'>('all');
  
  // Audio playback
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Attachments
  const [attachmentPreview, setAttachmentPreview] = useState<{
    file: File | null;
    preview: string | null;
    type: 'image' | 'video' | 'document' | 'audio' | null;
  }>({ file: null, preview: null, type: null });
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  
  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Mention suggestions
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  
  // Call states
  const [callTimer, setCallTimer] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallSpeakerOn, setIsCallSpeakerOn] = useState(false);
  
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundOnSend, setSoundOnSend] = useState(true);
  const [soundOnReceive, setSoundOnReceive] = useState(true);
  const [soundOnNotification, setSoundOnNotification] = useState(true);
  
  // Profile photo cropping
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [tempProfilePhoto, setTempProfilePhoto] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, size: 100 });
  
  // Custom background image
  const [customBackgroundImage, setCustomBackgroundImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('noc_chat_background');
    }
    return null;
  });
  const [backgroundSettingsOpen, setBackgroundSettingsOpen] = useState(false);

  // Status system (WhatsApp-style)
  const [statusList, setStatusList] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
    createdAt: Date;
    expiresAt: Date;
    views: Array<{ userId: string; viewedAt: Date }>;
    likes: Array<{ userId: string; userName: string }>;
    blockedUsers: string[];
  }>>([]);
  const [viewingStatus, setViewingStatus] = useState<typeof statusList[0] | null>(null);
  const [viewingStatusIndex, setViewingStatusIndex] = useState(0);
  const [viewingUserStatuses, setViewingUserStatuses] = useState<typeof statusList>([]);
  const [statusViewOpen, setStatusViewOpen] = useState(false);
  const [createStatusOpen, setCreateStatusOpen] = useState(false);
  const [statusMediaPreview, setStatusMediaPreview] = useState<string | null>(null);
  const [statusMediaType, setStatusMediaType] = useState<'image' | 'video' | null>(null);
  const [statusCaption, setStatusCaption] = useState('');
  const [statusBlockedContacts, setStatusBlockedContacts] = useState<string[]>([]);
  const [myStatusesOpen, setMyStatusesOpen] = useState(false);
  const [showStatusDetails, setShowStatusDetails] = useState(false);

  // Message search (chat)
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [chatSearchMessageQuery, setChatSearchMessageQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  // Call improvements
  const [callState, setCallState] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callParticipants, setCallParticipants] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isSpeaking: boolean;
  }>>([]);
  const [addParticipantsOpen, setAddParticipantsOpen] = useState(false);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);

  // Multi-message selection
  const [selectedChatMessages, setSelectedChatMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Text formatting toolbar
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [currentFormatting, setCurrentFormatting] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: 'small' | 'normal' | 'large';
    color: string;
  }>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 'normal',
    color: '#000000'
  });

  // Reply to message - keep reference after sending
  const [lastReplyTo, setLastReplyTo] = useState<ChatMessage | null>(null);

  // Typing indicator simulation
  const [simulatedTyping, setSimulatedTyping] = useState<{ userId: string; userName: string; isRecording: boolean } | null>(null);

  // Son d'alerte
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageSoundRef = useRef<HTMLAudioElement | null>(null);
  const sendSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Session timeout
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  
  // Theme
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const initializedRef = useRef(false);

  // Effects
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const storedUser = localStorage.getItem('noc_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          void Promise.resolve().then(() => {
            setUser(parsed);
            setIsAuthenticated(true);
            toast.success(`Bienvenue, ${parsed.name} !`, { description: 'Connexion réussie' });
          });
        } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && tasks.length === 0) {
      const timer = setTimeout(() => {
        setTasks([
          { id: 't1', userId: 'agent-a1', userName: 'Alaine', title: 'Vérifier alarmes Zabbix', description: 'Monitoring alerts', status: 'in_progress', category: 'Monitoring', createdAt: new Date(), updatedAt: new Date(), scheduledTime: '08:00' },
          { id: 't2', userId: 'agent-a1', userName: 'Alaine', title: 'Envoyer graphes 09h', description: 'Graphes trafic', status: 'completed', category: 'Reporting 1', createdAt: new Date(), updatedAt: new Date(), scheduledTime: '09:00', completedAt: new Date() },
          { id: 't3', userId: 'agent-c2', userName: 'Lapreuve', title: 'Appel client ACME', description: 'Suivi incident', status: 'pending', category: 'Call Center', createdAt: new Date(), updatedAt: new Date(), scheduledTime: '10:30' },
        ]);
        setActivities([
          { id: 'a1', userId: 'agent-c2', userName: 'Lapreuve', type: 'CLIENT_DOWN', category: 'Monitoring', description: 'Client ACME - Connexion perdue', createdAt: new Date(Date.now() - 3600000) },
          { id: 'a2', userId: 'agent-b1', userName: 'Sahra', type: 'TICKET_CREATED', category: 'Call Center', description: 'Ticket #1234 créé', createdAt: new Date(Date.now() - 7200000) },
          { id: 'a3', userId: 'agent-c1', userName: 'Audrey', type: 'GRAPH_SENT', category: 'Reporting 1', description: 'Graphes 09h envoyés', createdAt: new Date(Date.now() - 10800000) },
        ]);
        setNotifications([
          { id: '1', message: 'Incident critique détecté', type: 'warning', read: false, createdAt: new Date() },
          { id: '2', message: 'Nouveau ticket assigné', type: 'info', read: false, createdAt: new Date() },
          { id: '3', message: 'Handover validé', type: 'success', read: true, createdAt: new Date() },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, tasks.length]);

  // Charger les utilisateurs et logs depuis localStorage
  useEffect(() => {
    const loadData = () => {
      const storedUsers = localStorage.getItem('noc_all_users');
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          if (parsed.length > 0) {
            setAllUsers(parsed);
          }
        } catch { /* ignore */ }
      } else {
        // Initialiser avec les utilisateurs de démo
        const initialUsers = Object.values(DEMO_USERS);
        setAllUsers(initialUsers);
        localStorage.setItem('noc_all_users', JSON.stringify(initialUsers));
      }
      
      const storedLogs = localStorage.getItem('noc_audit_logs');
      if (storedLogs) {
        try {
          const parsed = JSON.parse(storedLogs);
          if (parsed.length > 0) {
            setAuditLogs(parsed);
          }
        } catch { /* ignore */ }
      }
    };
    
    // Utiliser un timeout pour éviter le setState synchrone
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, []);

  // Initialiser les conversations de démo pour la messagerie WhatsApp
  useEffect(() => {
    if (isAuthenticated && user && conversations.length === 0) {
      const initDemoConversations = () => {
        // Créer des conversations de démo avec les autres utilisateurs
        const otherUsers = Object.values(DEMO_USERS).filter(u => u.id !== user.id);
        const demoConversations: Conversation[] = otherUsers.slice(0, 5).map((u, index) => ({
          id: `conv-${index}`,
          type: 'individual' as const,
          participants: [
            { id: user.id, name: user.name, role: 'member' as const, joinedAt: new Date() },
            { id: u.id, name: u.name, avatar: u.avatar, role: 'member' as const, joinedAt: new Date() }
          ],
          unreadCount: index === 0 ? 2 : 0,
          isPinned: index < 2,
          isMuted: false,
          isArchived: false,
          createdBy: user.id,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
          updatedAt: new Date()
        }));

        // Ajouter un groupe de démo
        const shiftGroup: Conversation = {
          id: 'group-shift',
          type: 'group',
          name: user.shift ? `Shift ${user.shift.name} - Équipe` : 'Équipe NOC',
          description: 'Groupe de discussion de l\'équipe',
          participants: [
            { id: user.id, name: user.name, role: 'admin' as const, joinedAt: new Date() },
            ...otherUsers.slice(0, 3).map(u => ({ id: u.id, name: u.name, role: 'member' as const, joinedAt: new Date() }))
          ],
          unreadCount: 5,
          isPinned: true,
          isMuted: false,
          isArchived: false,
          createdBy: user.id,
          createdAt: new Date(Date.now() - 86400000 * 30),
          updatedAt: new Date()
        };

        // Contact spécial "Annonces" - géré par superviseur/admin
        const annoncesConversation: Conversation = {
          id: 'conv-annonces',
          type: 'individual' as const,
          participants: [
            { id: user.id, name: user.name, role: 'member' as const, joinedAt: new Date() },
            { id: 'system-annonces', name: 'Annonces', avatar: '/logo_sc_icon.png', role: 'admin' as const, joinedAt: new Date() }
          ],
          unreadCount: 1,
          isPinned: true,
          isMuted: false,
          isArchived: false,
          createdBy: 'system',
          createdAt: new Date(Date.now() - 86400000 * 60),
          updatedAt: new Date()
        };

        setConversations([annoncesConversation, shiftGroup, ...demoConversations]);

        // Ajouter quelques messages de démo
        const demoMessages: ChatMessage[] = [
          {
            id: 'msg-annonce-1',
            conversationId: 'conv-annonces',
            senderId: 'system-annonces',
            senderName: 'Annonces',
            senderAvatar: '/logo_sc_icon.png',
            type: 'text',
            content: 'Bienvenue dans le canal des annonces officielles de Silicone Connect ! Les superviseurs et administrateurs publieront ici les informations importantes.',
            status: 'read',
            isEdited: false,
            isDeleted: false,
            deletedForEveryone: false,
            isPinned: true,
            isArchived: false,
            reactions: [],
            readBy: [],
            createdAt: new Date(Date.now() - 86400000),
            updatedAt: new Date(Date.now() - 86400000)
          },
          {
            id: 'msg-1',
            conversationId: 'group-shift',
            senderId: otherUsers[0]?.id || '',
            senderName: otherUsers[0]?.name || 'User',
            type: 'text',
            content: 'Bonjour à tous ! Prêts pour le shift ?',
            status: 'read',
            isEdited: false,
            isDeleted: false,
            deletedForEveryone: false,
            isPinned: false,
            isArchived: false,
            reactions: [],
            readBy: [],
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 3600000)
          },
          {
            id: 'msg-2',
            conversationId: 'group-shift',
            senderId: user.id,
            senderName: user.name,
            type: 'text',
            content: 'Oui, je suis prêt. On commence par le monitoring.',
            status: 'read',
            isEdited: false,
            isDeleted: false,
            deletedForEveryone: false,
            isPinned: false,
            isArchived: false,
            reactions: [{ userId: otherUsers[1]?.id || '', userName: otherUsers[1]?.name || '', emoji: '👍' }],
            readBy: [],
            createdAt: new Date(Date.now() - 3000000),
            updatedAt: new Date(Date.now() - 3000000)
          }
        ];
        setChatMessages(demoMessages);

        // Initialiser la présence des utilisateurs
        const presence: Record<string, PresenceStatus> = {};
        otherUsers.forEach((u, i) => {
          presence[u.id] = i < 3 ? 'online' : 'offline';
        });
        setUserPresence(presence);
      };
      
      // Use setTimeout to avoid synchronous setState
      const timer = setTimeout(initDemoConversations, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, conversations.length]);

  // Mettre à jour l'activité sur les actions utilisateur
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // Ajouter une entrée dans le journal d'audit
  const addAuditLog = useCallback((action: string, details: string, status: 'SUCCESS' | 'FAILURE' = 'SUCCESS') => {
    const log: AuditLogEntry = {
      id: generateId(),
      userId: user?.id || 'unknown',
      userName: user?.name || 'Unknown',
      action,
      details,
      ipAddress: 'local',
      status,
      createdAt: new Date()
    };
    setAuditLogs(prev => {
      const updated = [log, ...prev].slice(0, 500); // Garder les 500 dernières entrées
      localStorage.setItem('noc_audit_logs', JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  // Fonction pour calculer le temps de verrouillage progressif
  const calculateLockoutTime = (attempts: number): number => {
    if (attempts < 3) return 0;
    if (attempts === 3) return 30; // 30 secondes après 3 tentatives
    if (attempts === 4) return 30; // Encore 30 secondes
    if (attempts >= 5) return 60; // 1 minute après 5 tentatives
    return Math.min(60 + (attempts - 5) * 30, 300); // +30s par tentative supplémentaire, max 5 min
  };

  // Handler pour la connexion avec suivi des tentatives
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier si le compte est verrouillé
    if (isLocked) {
      toast.error('Compte verrouillé', { description: `Veuillez attendre ${lockoutSeconds} secondes` });
      return;
    }

    setIsLoading(true);
    setLoginError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Chercher l'utilisateur par pseudo (insensible à la casse)
    const foundUser = Object.values(DEMO_USERS).find(
      u => u.username?.toLowerCase() === loginIdentifier.toLowerCase()
    );

    // Fonction pour gérer l'échec de connexion
    const handleFailedLogin = () => {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      // Afficher le message d'oubli après 3 tentatives
      if (newAttempts >= 3) {
        setShowForgotMessage(true);
      }

      // Calculer et appliquer le verrouillage progressif
      const lockoutTime = calculateLockoutTime(newAttempts);
      if (lockoutTime > 0) {
        setIsLocked(true);
        setLockoutSeconds(lockoutTime);
        toast.error('Trop de tentatives', {
          description: `Veuillez attendre ${lockoutTime} secondes avant de réessayer`
        });
      }

      setLoginError('Pseudo ou mot de passe incorrect');
      setIsLoading(false);
      toast.error('Erreur de connexion', { description: 'Identifiants invalides' });
    };

    if (!foundUser) {
      handleFailedLogin();
      return;
    }

    // Vérifier si le compte est bloqué
    if (foundUser.isBlocked) {
      setLoginError('Votre compte a été bloqué. Contactez l\'administrateur.');
      setIsLoading(false);
      toast.error('Compte bloqué', { description: 'Contactez la direction' });
      return;
    }

    // Vérifier le mot de passe
    if (foundUser.passwordHash !== password) {
      handleFailedLogin();
      return;
    }

    // Connexion réussie - réinitialiser les tentatives
    setFailedAttempts(0);
    setShowForgotMessage(false);

    const updatedUser = {
      ...foundUser,
      lastActivity: new Date()
    };

    setUser(updatedUser);
    setIsAuthenticated(true);
    setLastActivity(new Date());
    localStorage.setItem('noc_user', JSON.stringify(updatedUser));
    setIsLoading(false);

    // Alerte si mot de passe doit être changé
    if (foundUser.mustChangePassword) {
      toast.warning('Sécurité requise', {
        description: 'Veuillez modifier votre mot de passe dans Mon profil → Sécuriser mon compte'
      });
    }

    toast.success(`Bienvenue, ${foundUser.name} !`, { description: 'Connexion réussie' });
  };

  // Effect pour le compte à rebours du verrouillage
  useEffect(() => {
    if (!isLocked || lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutSeconds]);

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('noc_user');
    toast.info('Déconnexion', { description: 'À bientôt !' });
  };

  // Gmail Clone - Helper function to filter messages
  const getFilteredMessages = () => {
    let filtered = messages;
    
    // Filter by folder
    if (currentFolder === 'starred') {
      filtered = filtered.filter(m => m.isStarred);
    } else {
      filtered = filtered.filter(m => m.folder === currentFolder);
    }
    
    // Apply search query
    if (messageSearchQuery) {
      const query = messageSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(query) ||
        m.body.toLowerCase().includes(query) ||
        m.from.name.toLowerCase().includes(query) ||
        m.from.email.toLowerCase().includes(query)
      );
    }
    
    // Apply advanced filters
    if (advancedSearchFilters.from) {
      filtered = filtered.filter(m => 
        m.from.name.toLowerCase().includes(advancedSearchFilters.from.toLowerCase()) ||
        m.from.email.toLowerCase().includes(advancedSearchFilters.from.toLowerCase())
      );
    }
    if (advancedSearchFilters.to) {
      filtered = filtered.filter(m => 
        m.to.some(t => t.name.toLowerCase().includes(advancedSearchFilters.to.toLowerCase()))
      );
    }
    if (advancedSearchFilters.subject) {
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(advancedSearchFilters.subject.toLowerCase())
      );
    }
    if (advancedSearchFilters.hasAttachment) {
      filtered = filtered.filter(m => m.attachments.length > 0);
    }
    
    return filtered;
  };

  // Initialize demo emails for Gmail clone
  useEffect(() => {
    if (isAuthenticated && user && messages.length === 0) {
      const demoEmails: InternalMessage[] = [
        {
          id: 'email-1',
          from: { id: 'system', name: 'Admin SC', email: 'admin@siliconeconnect.com' },
          to: [{ id: user.id, name: user.name, email: user.email }],
          cc: [],
          bcc: [],
          subject: 'Bienvenue dans la messagerie interne',
          body: `Bonjour ${user.name},\n\nBienvenue dans la nouvelle messagerie interne de Silicone Connect ! Cette plateforme vous permet de communiquer efficacement avec vos collègues.\n\nFonctionnalités principales:\n- Envoi et réception de messages\n- Pièces jointes\n- Libellés personnalisés\n- Recherche avancée\n- Mode confidentiel\n\nCordialement,\nL'équipe IT`,
          attachments: [],
          folder: 'inbox',
          status: 'unread',
          priority: 'normal',
          isStarred: false,
          isRead: false,
          labels: ['Important'],
          receivedAt: new Date(Date.now() - 3600000),
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
          isDraft: false
        },
        {
          id: 'email-2',
          from: { id: 'theresia', name: 'Theresia', email: 'theresia@siliconeconnect.com' },
          to: [{ id: user.id, name: user.name, email: user.email }],
          cc: [],
          bcc: [],
          subject: 'Rappel : Réunion d\'équipe demain à 9h',
          body: `Bonjour,\n\nJe vous rappelle que nous avons une réunion d'équipe demain matin à 9h00 dans la salle de conférence.\n\nOrdre du jour :\n1. Revue des incidents de la semaine\n2. Planning des vacations\n3. Points divers\n\nMerci de confirmer votre présence.\n\nCordialement,\nTheresia`,
          attachments: [],
          folder: 'inbox',
          status: 'unread',
          priority: 'important',
          isStarred: true,
          isRead: false,
          labels: ['Réunion'],
          receivedAt: new Date(Date.now() - 7200000),
          createdAt: new Date(Date.now() - 7200000),
          updatedAt: new Date(Date.now() - 7200000),
          isDraft: false
        },
        {
          id: 'email-3',
          from: { id: 'monitoring', name: 'Système Monitoring', email: 'monitoring@siliconeconnect.com' },
          to: [{ id: user.id, name: user.name, email: user.email }],
          cc: [],
          bcc: [],
          subject: 'Alerte : Client ACME - Interface instable',
          body: `ALERTE MONITORING\n\nClient: ACME Corporation\nType: Interface Unstable\nSévérité: Moyenne\n\nDescription:\nL'interface vers le client ACME présente des fluctuations de connectivité depuis 2 heures.\n\nStatut: En cours d'investigation\n\nCette alerte a été générée automatiquement par le système de monitoring.`,
          attachments: [],
          folder: 'inbox',
          status: 'read',
          priority: 'urgent',
          isStarred: false,
          isRead: true,
          labels: ['Alerte'],
          readAt: new Date(Date.now() - 1800000),
          receivedAt: new Date(Date.now() - 10800000),
          createdAt: new Date(Date.now() - 10800000),
          updatedAt: new Date(Date.now() - 1800000),
          isDraft: false
        },
        {
          id: 'email-4',
          from: { id: user.id, name: user.name, email: user.email },
          to: [{ id: 'all', name: 'Équipe NOC', email: 'noc@siliconeconnect.com' }],
          cc: [],
          bcc: [],
          subject: 'Handover - Fin de shift',
          body: `Bonjour à tous,\n\nVoici le résumé du shift :\n\nIncidents traités: 3\nTickets créés: 5\nAppels clients: 12\n\nPoints d'attention:\n- Client ACME toujours en surveillance\n- Mise à jour Zabbix prévue ce soir\n\nBonne continuation à la prochaine équipe !`,
          attachments: [],
          folder: 'sent',
          status: 'read',
          priority: 'normal',
          isStarred: false,
          isRead: true,
          labels: [],
          sentAt: new Date(Date.now() - 14400000),
          createdAt: new Date(Date.now() - 14400000),
          updatedAt: new Date(Date.now() - 14400000),
          isDraft: false
        },
        {
          id: 'email-5',
          from: { id: 'kevine', name: 'Kevine', email: 'kevine@siliconeconnect.com' },
          to: [{ id: user.id, name: user.name, email: user.email }],
          cc: [{ id: 'audrey', name: 'Audrey', email: 'audrey@siliconeconnect.com' }],
          bcc: [],
          subject: 'Documentation procédure escalation',
          body: `Bonjour,\n\nVeuillez trouver ci-joint la documentation mise à jour concernant les procédures d'escalation.\n\nN'hésitez pas à me faire part de vos commentaires.\n\nMerci,\nKevine`,
          attachments: [
            {
              id: 'att-1',
              messageId: 'email-5',
              fileName: 'Procedure_Escalation_v2.pdf',
              fileSize: 245678,
              fileType: 'application/pdf',
              fileData: '',
              uploadedAt: new Date(Date.now() - 86400000)
            }
          ],
          folder: 'inbox',
          status: 'read',
          priority: 'normal',
          isStarred: false,
          isRead: true,
          labels: ['Documentation'],
          readAt: new Date(Date.now() - 43200000),
          receivedAt: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 43200000),
          isDraft: false
        },
        {
          id: 'email-6',
          from: { id: 'luca', name: 'Luca', email: 'luca@siliconeconnect.com' },
          to: [{ id: user.id, name: user.name, email: user.email }],
          cc: [],
          bcc: [],
          subject: 'Demande de congés',
          body: `Bonjour,\n\nJe souhaite poser des congés du 15 au 20 mars.\n\nMerci de me confirmer si cela est possible.\n\nCordialement,\nLuca`,
          attachments: [],
          folder: 'inbox',
          status: 'unread',
          priority: 'normal',
          isStarred: false,
          isRead: false,
          labels: [],
          receivedAt: new Date(Date.now() - 172800000),
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 172800000),
          isDraft: false
        }
      ];
      
      setMessages(demoEmails);
      
      // Initialize demo labels
      setEmailLabels([
        { id: 'label-1', name: 'Important', color: '#EF4444', userId: user.id, createdAt: new Date() },
        { id: 'label-2', name: 'Réunion', color: '#3B82F6', userId: user.id, createdAt: new Date() },
        { id: 'label-3', name: 'Alerte', color: '#F59E0B', userId: user.id, createdAt: new Date() },
        { id: 'label-4', name: 'Documentation', color: '#22C55E', userId: user.id, createdAt: new Date() }
      ]);
    }
  }, [isAuthenticated, user, messages.length]);

  // Session timeout - déconnexion automatique après 10 minutes d'inactivité
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkTimeout = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        handleLogout();
        toast.warning('Session expirée', { description: 'Vous avez été déconnecté pour inactivité' });
      }
    };
    
    const interval = setInterval(checkTimeout, 60000); // Vérifier chaque minute
    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  // Recording timer - incrémenter le temps d'enregistrement vocal
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Call timer - incrémenter le temps d'appel (ringing shows countdown, connected shows duration)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callDialogOpen && activeCall) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callDialogOpen, activeCall]);

  // Call state management - calling -> ringing -> connected, auto-hangup after 1min
  useEffect(() => {
    if (!callDialogOpen || !activeCall) {
      setCallState('calling');
      setCallTimer(0);
      return;
    }

    // Reset timer and start in calling state
    setCallTimer(0);
    setCallState('calling');

    // After 2 seconds, switch to ringing
    const ringingTimeout = setTimeout(() => {
      setCallState('ringing');
    }, 2000);

    // After 8-15 seconds (simulated answer), switch to connected
    const answerDelay = 8000 + Math.random() * 7000;
    const answerTimeout = setTimeout(() => {
      setCallState('connected');
      setCallTimer(0); // Reset timer when connected
      setCallStartTime(new Date());
      toast.success('Appel connecté');
    }, answerDelay);

    // Auto-hangup after 60 seconds if no answer
    const autoHangupTimeout = setTimeout(() => {
      setCallDialogOpen(false);
      setActiveCall(null);
      setCallTimer(0);
      setCallState('ended');
      setCallParticipants([]);
      toast.info('Pas de réponse', { description: 'L\'appel n\'a pas été répondu après 1 minute' });
    }, 60000);

    callTimeoutRef.current = autoHangupTimeout;

    return () => {
      clearTimeout(ringingTimeout);
      clearTimeout(answerTimeout);
      clearTimeout(autoHangupTimeout);
    };
  }, [callDialogOpen, activeCall]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setTempProfilePhoto(base64);
        setProfilePhotoDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save cropped profile photo
  const handleSaveCroppedPhoto = () => {
    if (tempProfilePhoto && user) {
      // Create canvas for cropping
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const outputSize = 200;
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        const scale = Math.min(img.width, img.height) / cropArea.size;
        ctx.drawImage(
          img,
          cropArea.x * scale,
          cropArea.y * scale,
          cropArea.size * scale,
          cropArea.size * scale,
          0, 0,
          outputSize, outputSize
        );
        
        const croppedData = canvas.toDataURL('image/jpeg', 0.9);
        const updatedUser = { ...user, avatar: croppedData };
        setUser(updatedUser);
        localStorage.setItem('noc_user', JSON.stringify(updatedUser));
        setProfilePhotoDialogOpen(false);
        setTempProfilePhoto(null);
        toast.success('Photo mise à jour', { description: 'Votre photo de profil a été modifiée' });
      };
      img.src = tempProfilePhoto;
    }
  };

  // Play sound functions
  const playMessageSendSound = useCallback(() => {
    if (soundEnabled && soundOnSend) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRSQx9allkY4YL/cvJdKNhtEv+K5i0YWBEG86b2MRAs8fqafmEIxHV8htYieSBsncx20fFkSN2oStI5XLg8ntoJWTjYQWBmug1U0DkuYuHgUNU88ZnJUBClMfGJrSwQhTGppZEoFIEpWXFhLBg5GU1tYTAQKQk5cWkwDB0NKXVpNAQZCSF1aSwIDQURdWUoCAkBBXlhJAQFAPl5XSAEBQD1dVkYBBUA7XVVGAARAOFxURAEEQDRbVEMABUAzWlNCAAFAMVlPQAABQC5YTj8AAUAtV008AAFALVZMOwABQClVSzgBAEAmVEs2AQBAJVNKNgEAQCNSSTQBAEAhUEkzAQBAIL9HMAEAQCC+RjABAEAgvUUwAQBAH75DLwEAQB2+QitBAEAcvT8qQQBAHKw+KUEAQByrPiVAAEAcqjwlPwBAHKjXJS8AQByo1iQsAEMbqNUjLg==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }, [soundEnabled, soundOnSend]);

  const playMessageReceiveSound = useCallback(() => {
    if (soundEnabled && soundOnReceive) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRSQx9allkY4YL/cvJdKNhtEv+K5i0YWBEG86b2MRAs8fqafmEIxHV8htYieSBsncx20fFkSN2oStI5XLg8ntoJWTjYQWBmug1U0DkuYuHgUNU88ZnJUBClMfGJrSwQhTGppZEoFIEpWXFhLBg5GU1tYTAQKQk5cWkwDB0NKXVpNAQZCSF1aSwIDQURdWUoCAkBBXlhJAQFAPl5XSAEBQD1dVkYBBUA7XVVGAARAOFxURAEEQDRbVEMABUAzWlNCAAFAMVlPQAABQC5YTj8AAUAtV008AAFALVZMOwABQClVSzgBAEAmVEs2AQBAJVNKNgEAQCNSSTQBAEAhUEkzAQBAIL9HMAEAQCC+RjABAEAgvUUwAQBAH75DLwEAQB2+QitBAEAcvT8qQQBAHKw+KUEAQByrPiVAAEAcqjwlPwBAHKjXJS8AQByo1iQsAEMbqNUjLg==');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [soundEnabled, soundOnReceive]);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && soundOnNotification) {
      const audio = new Audio('data:audio/wav;base64,UklGRl9vT19teleRSQx9allkY4YL/cvJdKNhtEv+K5i0YWBEG86b2MRAs8fqafmEIxHV8htYieSBsncx20fFkSN2oStI5XLg8ntoJWTjYQWBmug1U0DkuYuHgUNU88ZnJUBClMfGJrSwQhTGppZEoFIEpWXFhLBg5GU1tYTAQKQk5cWkwDB0NKXVpNAQZCSF1aSwIDQURdWUoCAkBBXlhJAQFAPl5XSAEBQD1dVkYBBUA7XVVGAQ==');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    }
  }, [soundEnabled, soundOnNotification]);

  // Set custom background
  const handleSetBackground = (imageUrl: string | null) => {
    setCustomBackgroundImage(imageUrl);
    if (imageUrl) {
      localStorage.setItem('noc_chat_background', imageUrl);
    } else {
      localStorage.removeItem('noc_chat_background');
    }
    toast.success('Fond d\'écran mis à jour');
  };

  const addNotification = (message: string, type: NotificationItem['type']) => {
    const notif: NotificationItem = {
      id: Date.now().toString(),
      message,
      type,
      read: false,
      createdAt: new Date()
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // ============================================
  // HANDLERS GESTION UTILISATEURS
  // ============================================

  // Ouvrir le dialog de modification du profil
  const openEditProfileDialog = () => {
    if (user) {
      setEditFirstName(user.firstName || user.name.split(' ')[0] || '');
      setEditLastName(user.lastName || user.name.split(' ')[1] || '');
      setEditEmail(user.email);
      setEditUsername(user.username || '');
      setEditProfileDialogOpen(true);
    }
  };

  // Sauvegarder les modifications du profil
  const handleSaveProfile = () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      firstName: editFirstName,
      lastName: editLastName,
      name: `${editFirstName} ${editLastName}`.trim(),
      email: editEmail,
      username: editUsername || user.username,
      updatedAt: new Date()
    };
    
    setUser(updatedUser);
    localStorage.setItem('noc_user', JSON.stringify(updatedUser));
    
    // Mettre à jour dans allUsers
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('PROFILE_UPDATE', `Profil modifié: ${updatedUser.name}`);
    setEditProfileDialogOpen(false);
    toast.success('Profil mis à jour', { description: 'Vos informations ont été enregistrées' });
  };

  // Ouvrir le dialog de sécurité
  const openSecurityDialog = () => {
    setEditPassword('');
    setConfirmPassword('');
    setSecurityDialogOpen(true);
  };

  // Sauvegarder les paramètres de sécurité
  const handleSaveSecurity = () => {
    if (!user) return;
    
    // Validation du mot de passe
    const validation = validatePassword(editPassword);
    if (!validation.isValid) {
      toast.error('Mot de passe invalide', { description: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial' });
      return;
    }
    
    if (editPassword !== confirmPassword) {
      toast.error('Erreur', { description: 'Les mots de passe ne correspondent pas' });
      return;
    }
    
    const updatedUser = {
      ...user,
      passwordHash: hashPassword(editPassword),
      mustChangePassword: false,
      isFirstLogin: false,
      updatedAt: new Date()
    };
    
    setUser(updatedUser);
    localStorage.setItem('noc_user', JSON.stringify(updatedUser));
    
    // Mettre à jour dans allUsers
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('PASSWORD_CHANGE', 'Mot de passe modifié');
    setSecurityDialogOpen(false);
    toast.success('Sécurité mise à jour', { description: 'Votre mot de passe a été changé avec succès' });
  };

  // Ouvrir le dialog de définition du shift
  const openShiftDialog = () => {
    if (user) {
      setEditShift(user.shift?.name || '');
      setEditResponsibility(user.responsibility || '');
      setShiftDialogOpen(true);
    }
  };

  // Sauvegarder le shift
  const handleSaveShift = () => {
    if (!user) return;
    
    const shiftData = editShift ? SHIFTS_DATA[editShift] : null;
    const updatedUser = {
      ...user,
      shiftId: editShift ? `shift-${editShift.toLowerCase()}` : null,
      shift: shiftData ? {
        id: `shift-${editShift.toLowerCase()}`,
        name: editShift,
        color: shiftData.color,
        colorCode: shiftData.colorCode
      } : null,
      responsibility: editResponsibility || undefined,
      updatedAt: new Date()
    };
    
    setUser(updatedUser);
    localStorage.setItem('noc_user', JSON.stringify(updatedUser));
    
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('SHIFT_UPDATE', `Shift modifié: ${editShift || 'Aucun'}, Fonction: ${editResponsibility || 'Aucune'}`);
    setShiftDialogOpen(false);
    toast.success('Shift mis à jour', { description: 'Votre shift et fonction ont été enregistrés' });
  };

  // Créer un nouvel utilisateur (Super Admin uniquement)
  const handleCreateUser = () => {
    if (!isSuperAdmin(user)) return;
    
    if (!editEmail.endsWith('@siliconeconnect.com')) {
      toast.error('Email invalide', { description: 'L\'email doit être @siliconeconnect.com' });
      return;
    }
    
    const validation = validatePassword(editPassword);
    if (!validation.isValid) {
      toast.error('Mot de passe invalide', { description: 'Le mot de passe doit respecter les critères de sécurité' });
      return;
    }
    
    const newUser: UserProfile = {
      id: generateId(),
      email: editEmail,
      name: `${editFirstName} ${editLastName}`.trim(),
      firstName: editFirstName,
      lastName: editLastName,
      username: editUsername || editEmail.split('@')[0],
      passwordHash: hashPassword(editPassword),
      role: editRole,
      isActive: true,
      isBlocked: false,
      isFirstLogin: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setAllUsers(prev => {
      const updated = [...prev, newUser];
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('USER_CREATED', `Utilisateur créé: ${newUser.name} (${newUser.role})`);
    setCreateUserDialogOpen(false);
    toast.success('Utilisateur créé', { description: `${newUser.name} a été ajouté avec succès` });
    
    // Réinitialiser le formulaire
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditUsername('');
    setEditPassword('');
    setConfirmPassword('');
    setEditRole('USER');
  };

  // Bloquer/Débloquer un utilisateur
  const handleToggleBlockUser = (targetUser: UserProfile) => {
    if (!isSuperAdmin(user)) return;
    
    const updatedUser = {
      ...targetUser,
      isBlocked: !targetUser.isBlocked,
      updatedAt: new Date()
    };
    
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === targetUser.id ? updatedUser : u);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('USER_BLOCK_TOGGLE', `Utilisateur ${updatedUser.isBlocked ? 'bloqué' : 'débloqué'}: ${targetUser.name}`);
    toast.success(updatedUser.isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué');
  };

  // Réinitialiser le mot de passe d'un utilisateur
  const handleResetUserPassword = (targetUser: UserProfile, newPassword: string) => {
    if (!isSuperAdmin(user)) return;
    
    const updatedUser = {
      ...targetUser,
      passwordHash: hashPassword(newPassword),
      mustChangePassword: true,
      updatedAt: new Date()
    };
    
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === targetUser.id ? updatedUser : u);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('PASSWORD_RESET', `Mot de passe réinitialisé pour: ${targetUser.name}`);
    toast.success('Mot de passe réinitialisé', { description: `Le mot de passe de ${targetUser.name} a été réinitialisé` });
  };

  // Supprimer un utilisateur
  const handleDeleteUser = (targetUser: UserProfile) => {
    if (!isSuperAdmin(user)) return;
    if (targetUser.role === 'SUPER_ADMIN') {
      toast.error('Action interdite', { description: 'Impossible de supprimer un Super Admin' });
      return;
    }
    
    setAllUsers(prev => {
      const updated = prev.filter(u => u.id !== targetUser.id);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('USER_DELETED', `Utilisateur supprimé: ${targetUser.name}`);
    toast.success('Utilisateur supprimé');
  };

  // Filtrer les utilisateurs
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          (u.username && u.username.toLowerCase().includes(userSearchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // PDF Generation
  const generateOvertimePDF = useCallback(async () => {
    if (!user?.shift) {
      toast.error('Erreur', { description: 'Aucun shift assigné' });
      return;
    }

    // Vérification du nom et prénom complets
    const fullName = `${user.lastName || ''} ${user.firstName || ''}`.trim();
    if (!user.firstName || !user.lastName) {
      toast.error('Information manquante', {
        description: 'Veuillez d\'abord renseigner votre nom et prénom complet dans "Modifier mes informations"'
      });
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const pageWidth = 210;
    const margin = 10;

    // ============================================
    // 1. EN-TÊTE - Logo + Titre CENTRÉS
    // ============================================
    
    // Calculer la position centrée pour le logo + titre
    const logoWidth = 18;
    const titleText = 'SILICONE CONNECT';
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(titleText);
    const totalHeaderWidth = logoWidth + 3 + titleWidth; // 3mm d'espace entre logo et titre
    const headerStartX = (pageWidth - totalHeaderWidth) / 2;
    
    // Logo faicone_sc.png centré
    try {
      const logoImg = new Image();
      logoImg.src = '/faicone_sc.png';
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });
      
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // Logo centré (18mm x 18mm)
        doc.addImage(logoImg, 'PNG', headerStartX, 10, logoWidth, 18);
      }
    } catch (e) {
      // Fallback simple
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(headerStartX, 10, logoWidth, 18, 2, 2, 'F');
    }

    // Titre SILICONE CONNECT (noir, plus petit, à côté du logo)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(titleText, headerStartX + logoWidth + 3, 21);

    // ============================================
    // 2. BARRE DE TITRE - Image_titre_barre_heure_sup.png
    // ============================================
    
    try {
      const barreImg = new Image();
      barreImg.src = '/Image_titre_barre_heure_sup.png';
      await new Promise((resolve) => {
        barreImg.onload = resolve;
        barreImg.onerror = resolve;
      });
      
      if (barreImg.complete && barreImg.naturalWidth > 0) {
        doc.addImage(barreImg, 'PNG', margin, 35, pageWidth - (margin * 2), 10);
      } else {
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(margin, 35, pageWidth - (margin * 2), 10, 2, 2, 'F');
      }
    } catch (e) {
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(margin, 35, pageWidth - (margin * 2), 10, 2, 2, 'F');
    }

    // ============================================
    // 3. MOIS CENTRÉ
    // ============================================
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`MOIS : ${monthNames[overtimeMonth.getMonth()].toUpperCase()} ${overtimeMonth.getFullYear()}`, pageWidth / 2, 52, { align: 'center' });

    // ============================================
    // 4. PRÉPARER LES DONNÉES
    // ============================================
    
    const monthStart = startOfMonth(overtimeMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const records: Array<[string, string, string, string, string, string, string, string]> = [];

    days.forEach(d => {
      const schedule = getShiftScheduleForDate(user.shift!.name, d);
      if (schedule.isWorking) {
        const restInfo = getIndividualRestAgent(user.shift!.name, d);
        if (!restInfo || restInfo.agentName !== user.name) {
          const dayName = dayNames[d.getDay()];
          const dateStr = format(d, 'd/M/yyyy');
          let heureDebut: string, heureFin: string, comment: string;
          if (schedule.dayType === 'DAY_SHIFT') {
            heureDebut = '17:00';
            heureFin = '19:00';
            comment = 'SHIFT JOUR';
          } else {
            heureDebut = '05:00';
            heureFin = '07:00';
            comment = 'SHIFT NUIT';
          }
          records.push([dayName, dateStr, heureDebut, heureFin, '2:00', 'Supervision au NOC', 'DADDY AZUMY', comment]);
        }
      }
    });

    const totalHours = records.length * 2;

    // ============================================
    // 5. TABLEAU PRINCIPAL - STRUCTURE PROPRE
    // ============================================
    
    const colWidths = [20, 16, 16, 22, 20, 16, 28, 28, 24];
    const tableStartY = 60;
    const rowHeight = 7;
    const headerHeight = 9;
    const headers = ['NOM et PRENOM', 'JOURS', 'Date', 'HEURE DU DEBUT', 'HEURE DE FIN', 'DUREE(H)', 'RAISONS', 'APPROBATION', 'COMMENTAIRES'];
    const totalRowsHeight = records.length * rowHeight;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // --- EN-TÊTE DU TABLEAU ---
    doc.setFillColor(168, 198, 238);
    doc.rect(margin, tableStartY, pageWidth - (margin * 2), headerHeight, 'F');
    
    // Bordure de l'en-tête
    doc.rect(margin, tableStartY, pageWidth - (margin * 2), headerHeight);
    
    // Texte de l'en-tête
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    
    let x = margin;
    for (let i = 0; i < headers.length; i++) {
      // Ligne verticale de séparation dans l'en-tête
      if (i > 0) {
        doc.line(x, tableStartY, x, tableStartY + headerHeight);
      }
      doc.text(headers[i], x + colWidths[i] / 2, tableStartY + 5.5, { align: 'center' });
      x += colWidths[i];
    }

    // --- CORPS DU TABLEAU ---
    const bodyStartY = tableStartY + headerHeight;
    
    // Fond alterné pour TOUTES les lignes SAUF la colonne NOM (colonne 0)
    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        // Fond pour les colonnes 1 à 8 (pas la colonne NOM)
        doc.rect(margin + colWidths[0], bodyStartY + (rowIndex * rowHeight), pageWidth - (margin * 2) - colWidths[0], rowHeight, 'F');
      }
    }
    
    // ============================================
    // FUSION PHYSIQUE COLONNE NOM et PRENOM
    // Une SEULE grande cellule rectangulaire vide
    // ============================================
    
    // Fond de la colonne fusionnée
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, bodyStartY, colWidths[0], totalRowsHeight, 'F');
    
    // Bordure de la grande cellule fusionnée
    doc.rect(margin, bodyStartY, colWidths[0], totalRowsHeight);
    
    // ============================================
    // DESSINER LES BORDURES DES AUTRES COLONNES
    // IMPORTANT: Lignes horizontales SEULEMENT pour colonnes 1 à 8
    // PAS de lignes dans la colonne NOM (colonne 0 fusionnée)
    // ============================================
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    
    const col0EndX = margin + colWidths[0]; // Fin de la colonne NOM
    
    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      const currentY = bodyStartY + (rowIndex * rowHeight);
      
      // Ligne horizontale SEULEMENT pour colonnes 1 à 8 (PAS dans colonne NOM)
      // La ligne commence APRÈS la colonne NOM
      doc.line(col0EndX, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
      
      // Lignes verticales et texte pour colonnes 1 à 8
      x = col0EndX;
      for (let colIndex = 1; colIndex < 9; colIndex++) {
        doc.line(x, currentY, x, currentY + rowHeight);
        doc.text(row[colIndex - 1], x + colWidths[colIndex] / 2, currentY + 4.5, { align: 'center' });
        x += colWidths[colIndex];
      }
    }
    
    // Bordure extérieure du corps (sans la colonne NOM qui a déjà sa bordure)
    doc.line(col0EndX, bodyStartY, col0EndX, bodyStartY + totalRowsHeight); // Ligne verticale après NOM
    doc.line(pageWidth - margin, bodyStartY, pageWidth - margin, bodyStartY + totalRowsHeight); // Bordure droite

    // ============================================
    // 6. NOM EN VERTICAL - ROTATION 90° DANS LA CELLULE FUSIONNÉE
    // Positionnement précis
    // ============================================
    
    const nomEmploye = fullName.toUpperCase();
    
    // Dimensions de la zone fusionnée
    const cellX = margin;
    const cellY = bodyStartY;
    const cellWidth = colWidths[0];
    const cellHeight = totalRowsHeight;
    
    // Configuration du texte
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Déplacer de gauche vers la droite dans la cellule
    const textX = cellX + (cellWidth / 2) + 13;
    
    // Position Y centrée verticalement
    const textY = cellY + (cellHeight / 2);
    
    doc.text(nomEmploye, textX, textY, { 
      align: 'center',
      angle: 90
    });

    // ============================================
    // 7. TOTAL DES HEURES
    // ============================================
    
    const tableEndY = bodyStartY + totalRowsHeight;
    const totalY = tableEndY + 5;
    
    doc.setFillColor(168, 198, 238);
    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
    doc.rect(margin, totalY, pageWidth - (margin * 2), 10, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, totalY, pageWidth - (margin * 2), 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL DES HEURES', margin + 45, totalY + 6.5, { align: 'center' });
    doc.text(`${totalHours}:00:00`, pageWidth - margin - 45, totalY + 6.5, { align: 'center' });

    // ============================================
    // 8. SIGNATURES - PLUS D'ESPACE (50mm après total)
    // ============================================
    
    const signatureY = totalY + 50; // Augmenté de 25 à 50 pour plus d'espace
    const sigWidth = (pageWidth - (margin * 2)) / 4;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    const sigLabels = [
      "Signature de l'agent",
      'Signature de Superviseur',
      'Signature de Directeur Technique',
      'Signature du Ressources Humaines'
    ];
    
    sigLabels.forEach((sig, i) => {
      const sigX = margin + (i * sigWidth) + sigWidth / 2;
      doc.line(sigX - 20, signatureY - 5, sigX + 20, signatureY - 5);
      doc.text(sig, sigX, signatureY, { align: 'center' });
    });

    // Sauvegarder
    doc.save(`heures_sup_${fullName.replace(/\s+/g, '_')}_${format(overtimeMonth, 'MM_yyyy')}.pdf`);
    toast.success('PDF généré', { description: 'Le fichier a été téléchargé' });
  }, [user, overtimeMonth]);

  // Planning generation
  const planning = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(d => {
      const shifts = Object.keys(SHIFTS_DATA).map(shiftName => {
        const shiftData = SHIFTS_DATA[shiftName];
        const schedule = getShiftScheduleForDate(shiftName, d);
        const restInfo = getIndividualRestAgent(shiftName, d);
        
        const agents = shiftData.members.map(memberName => {
          const isResting = restInfo?.agentName === memberName;
          let responsibility: ResponsibilityType | undefined;
          
          if (schedule.isWorking && !isResting) {
            const activeAgents = shiftData.members.filter(m => m !== restInfo?.agentName);
            const activeIdx = activeAgents.indexOf(memberName);
            const responsibilities: ResponsibilityType[] = ['CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'];
            responsibility = responsibilities[activeIdx] || undefined;
          }
          
          return { name: memberName, isResting, responsibility };
        });
        
        return { shiftName, ...shiftData, schedule, agents, restInfo };
      });
      
      return { date: d, shifts };
    });
  }, [currentMonth])();

  // Search filter
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        {/* Animated background elements - subtil et élégant */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-200/30 dark:bg-cyan-500/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-300/20 dark:bg-slate-600/5 rounded-full blur-3xl"
          />
          {/* Particules subtiles */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <Toaster position="top-right" richColors />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md mx-4 relative z-10"
        >
          <Card className="border border-slate-200/80 dark:border-slate-700/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden">
            {/* Header avec nouvelle image animée */}
            <div className="relative pt-10 pb-6 text-center bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-800/30 dark:to-transparent">
              {/* Glow effect derrière le logo */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-0 top-8 h-20 bg-blue-400/10 dark:bg-blue-500/5 blur-2xl"
              />
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center justify-center px-8"
              >
                <motion.img
                  src="/logo_noc_activities_sans_fond.png"
                  alt="NOC ACTIVITIES"
                  className="w-[90%] max-w-[320px] h-auto relative z-10"
                  style={{ aspectRatio: '464/165' }}
                  animate={{
                    y: [0, -3, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/logo_sc.png';
                  }}
                />
              </motion.div>
              
              {/* Séparateur élégant */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 mx-8 h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"
              />
            </div>

            <CardContent className="pt-4 pb-8 px-8">
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {/* Champ Pseudo avec icône et label flottant */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="relative group"
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 group-focus-within:scale-110">
                    <motion.div
                      animate={pseudoFocused ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <User className={`h-5 w-5 transition-colors duration-300 ${pseudoFocused ? 'text-blue-600' : 'text-slate-400'}`} />
                    </motion.div>
                  </div>
                  <Input
                    id="username"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    onFocus={() => setPseudoFocused(true)}
                    onBlur={() => setPseudoFocused(false)}
                    className="h-14 pt-5 pb-2 pl-12 pr-4 text-base transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800"
                    required
                  />
                  <label
                    htmlFor="username"
                    className={`absolute left-12 transition-all duration-300 pointer-events-none ${
                      pseudoFocused || loginIdentifier
                        ? 'top-2.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide'
                        : 'top-1/2 -translate-y-1/2 text-base text-slate-400'
                    }`}
                  >
                    Pseudo
                  </label>
                </motion.div>

                {/* Champ Mot de passe avec icône et label flottant */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="relative group"
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 group-focus-within:scale-110">
                    <motion.div
                      animate={passwordFocused ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Lock className={`h-5 w-5 transition-colors duration-300 ${passwordFocused ? 'text-blue-600' : 'text-slate-400'}`} />
                    </motion.div>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="h-14 pt-5 pb-2 pl-12 pr-12 text-base transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800"
                    required
                  />
                  <label
                    htmlFor="password"
                    className={`absolute left-12 transition-all duration-300 pointer-events-none ${
                      passwordFocused || password
                        ? 'top-2.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide'
                        : 'top-1/2 -translate-y-1/2 text-base text-slate-400'
                    }`}
                  >
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-blue-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-400 hover:text-blue-600 transition-colors" />
                      )}
                    </motion.div>
                  </button>
                </motion.div>

                {/* Message d'erreur */}
                <AnimatePresence mode="wait">
                  {loginError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Compte à rebours si verrouillé */}
                <AnimatePresence mode="wait">
                  {isLocked && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: 'auto' }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 text-center overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="w-5 h-5 text-red-500" />
                        </motion.div>
                        <p className="text-red-600 dark:text-red-400 font-medium">
                          Veuillez patienter <span className="text-xl font-bold">{lockoutSeconds}</span> secondes
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bouton de connexion AVEC ICÔNE */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="pt-2"
                >
                  <motion.button
                    type="submit"
                    disabled={isLoading || isLocked}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-14 relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    {/* Effet de brillance au survol */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                    />
                    
                    <span className="relative flex items-center justify-center gap-2.5">
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Connexion en cours...</span>
                        </>
                      ) : (
                        <>
                          <motion.span
                            initial={{ x: -5, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.3 }}
                          >
                            <LogIn className="w-5 h-5" />
                          </motion.span>
                          <motion.span
                            initial={{ x: 5, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.75, duration: 0.3 }}
                          >
                            Se connecter
                          </motion.span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.div>
              </motion.form>

              {/* Message d'oubli - AFFICHÉ SEULEMENT APRÈS 3 TENTATIVES */}
              <AnimatePresence mode="wait">
                {showForgotMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 border-t border-slate-200 dark:border-slate-700">
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-4 text-center border border-amber-200/50 dark:border-amber-800/30"
                      >
                        <Info className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          Si vous avez oublié votre mot de passe ou votre pseudo,
                          <br />
                          merci de vous rapprocher de la <span className="font-semibold text-blue-600 dark:text-blue-400">Direction</span> ou
                          contacter le <span className="font-semibold text-blue-600 dark:text-blue-400">Responsable Système</span>.
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Footer élégant */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6 flex items-center justify-center gap-2"
          >
            <span className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700" />
            <span>© {new Date().getFullYear()} Silicone Connect</span>
            <span className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700" />
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const userRestInfo = user?.shift ? getAgentRestInfo(user.name, user.shift.name, new Date()) : null;

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center px-4 gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <img src="/logo.png" alt="Silicone Connect" className="h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <span className="font-bold text-lg hidden sm:block">NOC ACTIVITIES</span>
            
            {/* Search */}
            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            
            <div className="flex-1 md:hidden" />
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">NOC Actif</span>
            </div>
            
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b font-semibold">Notifications</div>
                <ScrollArea className="h-[200px]">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 border-b hover:bg-muted/50 cursor-pointer flex items-start gap-2 ${n.read ? 'opacity-60' : ''}`}
                    >
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />}
                      {n.type === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                      {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                      {n.type === 'info' && <Info className="w-4 h-4 text-blue-500 mt-0.5" />}
                      <span className="text-sm">{n.message}</span>
                    </div>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            
            {mounted && (
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9">
                  <Avatar className="h-8 w-8">
                    {user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openEditProfileDialog} className="gap-2">
                  <User className="w-4 h-4" />
                  Modifier mes informations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="gap-2">
                  <Camera className="w-4 h-4" />
                  Ma photo de profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openShiftDialog} className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Définir mon shift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRestDialogOpen(true)} className="gap-2">
                  <Coffee className="w-4 h-4" />
                  Mes repos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openSecurityDialog} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Sécuriser mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Paramètres
                </DropdownMenuItem>
                {isSuperAdmin(user) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Administration</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setUsersManagementOpen(true)} className="gap-2">
                      <Users className="w-4 h-4" />
                      Gérer les utilisateurs
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:sticky top-14 left-0 z-40 w-60 h-[calc(100vh-3.5rem)] border-r bg-background transition-transform duration-300 lg:translate-x-0`}>
            <ScrollArea className="h-full">
              <nav className="p-3 space-y-1">
                <Button variant={currentTab === 'dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('dashboard')}>
                  <LayoutDashboard className="w-5 h-5" /> Tableau de bord
                </Button>
                <Button variant={currentTab === 'planning' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('planning')}>
                  <Calendar className="w-5 h-5" /> Planning
                </Button>
                <Button variant={currentTab === 'tasks' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('tasks')}>
                  <ClipboardList className="w-5 h-5" /> Mes Tâches
                </Button>
                <Button variant={currentTab === 'activities' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('activities')}>
                  <Activity className="w-5 h-5" /> Activités
                </Button>
                <Button variant={currentTab === 'overtime' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('overtime')}>
                  <Clock className="w-5 h-5" /> Heures Sup.
                </Button>
                <Button variant={currentTab === 'links' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('links')}>
                  <ExternalLink className="w-5 h-5" /> Liens Externes
                </Button>
                <Button variant={currentTab === 'email' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('email')}>
                  <MessageCircle className="w-5 h-5" /> Chats
                  {conversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 && (
                    <Badge className="ml-auto bg-green-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                      {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
                    </Badge>
                  )}
                </Button>
                <Button variant={currentTab === 'messagerie' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('messagerie')}>
                  <Mail className="w-5 h-5" /> Messagerie
                  {messages.filter(m => m.folder === 'inbox' && !m.isRead).length > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                      {messages.filter(m => m.folder === 'inbox' && !m.isRead).length}
                    </Badge>
                  )}
                </Button>
                
                {(user?.role === 'RESPONSABLE' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <>
                    <Separator className="my-2" />
                    <Button variant={currentTab === 'supervision' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('supervision')}>
                      <Eye className="w-5 h-5" /> Supervision
                    </Button>
                  </>
                )}
                
                {user?.role === 'ADMIN' && (
                  <Button variant={currentTab === 'admin' ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-10" onClick={() => setCurrentTab('admin')}>
                    <Settings className="w-5 h-5" /> Administration
                  </Button>
                )}
              </nav>
            </ScrollArea>
            
            {user?.shift && (
              <div className="absolute bottom-3 left-3 right-3">
                <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(user.shift.name) }} />
                      <span className="font-medium">Shift {user.shift.name}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={() => setRestDialogOpen(true)}>
                      <Coffee className="w-3 h-3 mr-1" /> Voir mes repos
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </aside>
          
          {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
          
          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-3.5rem)] overflow-auto">
            <AnimatePresence mode="wait">
              {/* Dashboard */}
              {currentTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold">Tableau de bord</h1>
                      <p className="text-muted-foreground">Bienvenue, {user?.name} • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
                    </div>
                    <Button variant="outline" onClick={() => toast.success('Données actualisées')}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                    </Button>
                  </div>
                  
                  {/* Rest Info Cards */}
                  {user?.shift && userRestInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Coffee className="w-5 h-5" /> Mon Repos Individuel
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          {userRestInfo.isOnIndividualRest ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Vous êtes en repos aujourd'hui</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground">Prochain repos individuel :</p>
                              <p className="text-lg font-bold mt-1">
                                {userRestInfo.nextIndividualRest ? format(userRestInfo.nextIndividualRest, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <MoonIcon className="w-5 h-5" /> Repos Collectif
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          {userRestInfo.isOnCollectiveRest ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Repos collectif en cours</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground">Prochain repos collectif :</p>
                              <p className="text-lg font-bold mt-1">
                                {userRestInfo.nextCollectiveRestStart ? format(userRestInfo.nextCollectiveRestStart, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Taux présence</span>
                        <UserCheck className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold mt-1">98.5%</p>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tâches en cours</span>
                        <Briefcase className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-2xl font-bold mt-1">{tasks.filter(t => t.status === 'in_progress').length}</p>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Incidents</span>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      </div>
                      <p className="text-2xl font-bold mt-1">3</p>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">SLA</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold mt-1">99.2%</p>
                    </Card>
                  </div>
                  
                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-base">Activité hebdomadaire</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={[
                            { day: 'Lun', monitoring: 12, calls: 8, reports: 5 },
                            { day: 'Mar', monitoring: 15, calls: 10, reports: 7 },
                            { day: 'Mer', monitoring: 18, calls: 12, reports: 6 },
                            { day: 'Jeu', monitoring: 14, calls: 9, reports: 8 },
                            { day: 'Ven', monitoring: 16, calls: 11, reports: 4 },
                            { day: 'Sam', monitoring: 10, calls: 6, reports: 3 },
                            { day: 'Dim', monitoring: 8, calls: 5, reports: 2 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="day" className="text-xs" />
                            <YAxis className="text-xs" />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="monitoring" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Monitoring" />
                            <Area type="monotone" dataKey="calls" stackId="1" stroke="#EAB308" fill="#EAB308" fillOpacity={0.6} name="Appels" />
                            <Area type="monotone" dataKey="reports" stackId="1" stroke="#22C55E" fill="#22C55E" fillOpacity={0.6} name="Rapports" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-base">Répartition par shift</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Shift A', value: 35, color: '#3B82F6' },
                                { name: 'Shift B', value: 33, color: '#EAB308' },
                                { name: 'Shift C', value: 32, color: '#22C55E' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {[
                                { name: 'Shift A', value: 35, color: '#3B82F6' },
                                { name: 'Shift B', value: 33, color: '#EAB308' },
                                { name: 'Shift C', value: 32, color: '#22C55E' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Active Shifts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {Object.keys(SHIFTS_DATA).map(shiftName => {
                      const shiftData = SHIFTS_DATA[shiftName];
                      const now = new Date();
                      const schedule = getShiftScheduleForDate(shiftName, now);
                      const isActive = schedule.isWorking;
                      
                      return (
                        <Card key={shiftName} className={`card-hover border-2 ${!isActive ? 'opacity-60' : ''}`} style={{ borderColor: isActive ? getShiftColor(shiftName) : undefined }}>
                          <CardHeader className="pb-2 pt-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(shiftName) }} />
                                Shift {shiftName}
                              </CardTitle>
                              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                                {isActive ? (schedule.dayType === 'DAY_SHIFT' ? 'Jour' : 'Nuit') : 'Repos'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <div className="flex -space-x-2 mb-2">
                              {shiftData.members.map((member, idx) => {
                                const restInfo = getIndividualRestAgent(shiftName, now);
                                const isResting = restInfo?.agentName === member;
                                
                                return (
                                  <Avatar key={idx} className={`border-2 border-background h-7 w-7 ${isResting ? 'opacity-50' : ''}`}>
                                    <AvatarFallback className="text-xs" style={{ backgroundColor: `${getShiftColor(shiftName)}20`, color: getShiftColor(shiftName) }}>
                                      {member.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">{shiftData.members.join(', ')}</p>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Cycle {schedule.cycleNumber} • Jour {schedule.dayNumber || '-'}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Quick Links */}
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" /> Accès Rapide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {EXTERNAL_LINKS.map(link => {
                          const IconComponent = link.icon;
                          return (
                            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                                <IconComponent className="w-4 h-4" />
                                <span className="text-xs text-center">{link.name}</span>
                              </Button>
                            </a>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              {/* Planning */}
              {currentTab === 'planning' && (
                <motion.div key="planning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold">Planning des shifts</h1>
                      <p className="text-muted-foreground">Cycles : 6 jours travail (3 jour + 3 nuit) + 3 jours repos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium min-w-[140px] text-center text-sm">
                        {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                      </span>
                      <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Calendar */}
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <div className="min-w-[700px]">
                        <div className="grid grid-cols-7 border-b">
                          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                            <div key={day} className="p-2 text-center font-medium border-r last:border-r-0 bg-muted/50 text-sm">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {planning.map((day, idx) => {
                            const isCurrentDay = isToday(day.date);
                            
                            return (
                              <div key={idx} className={`min-h-[100px] border-r border-b p-1.5 ${isCurrentDay ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
                                    {format(day.date, 'd')}
                                  </span>
                                  {isCurrentDay && <Badge variant="default" className="text-[10px] h-4 px-1">Auj</Badge>}
                                </div>
                                <div className="space-y-0.5">
                                  {day.shifts.map(shift => (
                                    <Popover key={shift.name}>
                                      <PopoverTrigger asChild>
                                        <div className={`text-[10px] p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                          shift.schedule.isCollectiveRest 
                                            ? 'bg-muted text-muted-foreground'
                                            : shift.schedule.dayType === 'DAY_SHIFT'
                                              ? getShiftLightBg(shift.name)
                                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">S{shift.name}</span>
                                            <span className="opacity-70">
                                              {shift.schedule.isCollectiveRest ? 'R' : `${shift.schedule.dayType === 'DAY_SHIFT' ? 'J' : 'N'}${shift.schedule.dayNumber}`}
                                            </span>
                                          </div>
                                          {shift.restInfo && (
                                            <div className="text-orange-500 font-medium">RI: {shift.restInfo.agentName.substring(0, 3)}</div>
                                          )}
                                        </div>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-72 p-3" align="start">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(shift.name) }} />
                                            <span className="font-medium">Shift {shift.name}</span>
                                          </div>
                                          <div className="text-xs space-y-1">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Type:</span>
                                              <Badge variant="outline" className="text-[10px]">
                                                {shift.schedule.isCollectiveRest ? 'Repos collectif' : shift.schedule.dayType === 'DAY_SHIFT' ? 'Jour (07h-19h)' : 'Nuit (19h-07h)'}
                                              </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Cycle:</span>
                                              <span>#{shift.schedule.cycleNumber}</span>
                                            </div>
                                            {shift.restInfo && (
                                              <div className="flex justify-between text-orange-500">
                                                <span>Repos individuel:</span>
                                                <span className="font-medium">{shift.restInfo.agentName}</span>
                                              </div>
                                            )}
                                          </div>
                                          <Separator />
                                          <div className="text-xs">
                                            <p className="font-medium mb-1">Agents:</p>
                                            {shift.agents.map((agent, i) => (
                                              <div key={i} className="flex items-center justify-between py-0.5">
                                                <span className={agent.isResting ? 'line-through text-muted-foreground' : ''}>{agent.name}</span>
                                                {agent.isResting && <Badge variant="secondary" className="text-[9px]">Repos</Badge>}
                                                {agent.responsibility && <Badge variant="outline" className="text-[9px]">{agent.responsibility.replace('_', ' ')}</Badge>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              {/* Overtime */}
              {currentTab === 'overtime' && (
                <motion.div key="overtime" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold">Heures supplémentaires</h1>
                      <p className="text-muted-foreground">2h automatiques par jour travaillé</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setOvertimeMonth(subMonths(overtimeMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium min-w-[140px] text-center text-sm">
                        {format(overtimeMonth, 'MMMM yyyy', { locale: fr })}
                      </span>
                      <Button variant="outline" size="icon" onClick={() => setOvertimeMonth(addMonths(overtimeMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {user?.shift && (() => {
                    const monthStart = startOfMonth(overtimeMonth);
                    const monthEnd = endOfMonth(monthStart);
                    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                    
                    const workDays = days.filter(d => {
                      const schedule = getShiftScheduleForDate(user.shift!.name, d);
                      if (!schedule.isWorking) return false;
                      const restInfo = getIndividualRestAgent(user.shift!.name, d);
                      return !restInfo || restInfo.agentName !== user.name;
                    });
                    
                    const totalHours = workDays.length * 2;
                    
                    return (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <Card className="p-3">
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /><span className="text-sm text-muted-foreground">Total heures</span></div>
                            <p className="text-2xl font-bold mt-1">{totalHours}h</p>
                          </Card>
                          <Card className="p-3">
                            <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-green-500" /><span className="text-sm text-muted-foreground">Jours travaillés</span></div>
                            <p className="text-2xl font-bold mt-1">{workDays.length}</p>
                          </Card>
                          <Card className="p-3">
                            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" /><span className="text-sm text-muted-foreground">Taux horaire</span></div>
                            <p className="text-2xl font-bold mt-1">2h/jour</p>
                          </Card>
                          <Card className="p-3">
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm text-muted-foreground">Approuvé par</span></div>
                            <p className="text-sm font-bold mt-1">Daddy AZUMY</p>
                          </Card>
                        </div>
                        
                        <Card>
                          <CardHeader className="pb-2 pt-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Détail mensuel</CardTitle>
                              <Button onClick={generateOvertimePDF} className="gap-2">
                                <FileDown className="w-4 h-4" /> Générer PDF
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <ScrollArea className="h-[350px]">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-background">
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-medium">Jour</th>
                                    <th className="text-left p-2 font-medium">Date</th>
                                    <th className="text-left p-2 font-medium">Type</th>
                                    <th className="text-left p-2 font-medium">Horaires</th>
                                    <th className="text-left p-2 font-medium">Durée</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workDays.map((d, idx) => {
                                    const schedule = getShiftScheduleForDate(user.shift!.name, d);
                                    return (
                                      <tr key={idx} className="border-b hover:bg-muted/50">
                                        <td className="p-2">{dayNames[d.getDay()]}</td>
                                        <td className="p-2">{format(d, 'dd/MM/yyyy')}</td>
                                        <td className="p-2">
                                          <Badge variant={schedule.dayType === 'DAY_SHIFT' ? 'default' : 'secondary'}>
                                            {schedule.dayType === 'DAY_SHIFT' ? 'Jour' : 'Nuit'}
                                          </Badge>
                                        </td>
                                        <td className="p-2 text-xs">
                                          {schedule.dayType === 'DAY_SHIFT' ? '07:00-08:00, 18:00-19:00' : '18:00-19:00, 06:00-07:00'}
                                        </td>
                                        <td className="p-2 font-medium">2h</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </motion.div>
              )}
              
              {/* Links */}
              {currentTab === 'links' && (
                <motion.div key="links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">Liens Externes</h1>
                    <p className="text-muted-foreground">Accès rapide aux outils NOC</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {EXTERNAL_LINKS.map(link => {
                      const IconComponent = link.icon;
                      return (
                        <Card key={link.id} className="card-hover">
                          <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-base flex items-center gap-2">
                              <IconComponent className="w-5 h-5" />
                              {link.name}
                            </CardTitle>
                            <CardDescription>{link.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full gap-2" onClick={() => toast.success(`Ouverture de ${link.name}`)}>
                                <ExternalLink className="w-4 h-4" /> Accéder
                              </Button>
                            </a>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              
              {/* Messagerie Instantanée - Style WhatsApp */}
              {currentTab === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-[calc(100vh-7rem)]">
                  <div className="flex h-full border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg">
                    {/* Sidebar WhatsApp */}
                    <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col">
                      <div className="p-3 border-b bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-10 h-10 border-2 border-white/30">
                              {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                              <AvatarFallback className="bg-white/20 text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setNewConversationOpen(true)} title="Nouvelle discussion"><MessageCircle className="w-5 h-5" /></Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setCreateGroupOpen(true)} title="Créer un groupe"><UserPlus className="w-5 h-5" /></Button>
                          </div>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input placeholder="Rechercher une discussion..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="pl-9 h-9 bg-white/10 border-0 text-white placeholder:text-white/50 rounded-lg" />
                        </div>
                      </div>
                      {/* Status Section */}
                      <div className="p-2 border-b bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Status</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-cyan-600" onClick={() => {
                            const myStatuses = statusList.filter(s => s.userId === user?.id);
                            if (myStatuses.length > 0) {
                              setMyStatusesOpen(true);
                            } else {
                              setCreateStatusOpen(true);
                            }
                          }}>
                            <Plus className="w-3 h-3 mr-1" /> Mon status
                          </Button>
                        </div>
                        <div className="overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                          <div className="flex gap-3 px-1" style={{ minWidth: 'max-content' }}>
                            {/* My status */}
                            <div 
                              className="flex flex-col items-center cursor-pointer flex-shrink-0"
                              onClick={() => {
                                const myStatuses = statusList.filter(s => s.userId === user?.id);
                                if (myStatuses.length > 0) {
                                  setMyStatusesOpen(true);
                                } else {
                                  setCreateStatusOpen(true);
                                }
                              }}
                            >
                              <div className="relative">
                                <Avatar className="w-14 h-14 ring-2 ring-cyan-500 ring-offset-2">
                                  {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                                  <AvatarFallback className="bg-cyan-500 text-white">{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                                  <Plus className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              <span className="text-xs mt-1 text-muted-foreground">Mon status</span>
                              {statusList.filter(s => s.userId === user?.id).length > 0 && (
                                <span className="text-[10px] text-cyan-600">{statusList.filter(s => s.userId === user?.id).length}</span>
                              )}
                            </div>
                            {/* Other users' status */}
                            {Object.values(DEMO_USERS)
                              .filter(u => u.id !== user?.id && statusList.some(s => s.userId === u.id && !s.blockedUsers.includes(user?.id || '')))
                              .map((statusUser) => {
                                const userStatuses = statusList.filter(s => s.userId === statusUser.id && !s.blockedUsers.includes(user?.id || ''));
                                const latestStatus = userStatuses[0];
                                const hasNewStatus = !latestStatus?.views.some(v => v.userId === user?.id);
                                return (
                                  <div 
                                    key={statusUser.id}
                                    className="flex flex-col items-center cursor-pointer flex-shrink-0"
                                    onClick={() => {
                                      if (userStatuses.length > 0) {
                                        setViewingUserStatuses(userStatuses);
                                        setViewingStatusIndex(0);
                                        setViewingStatus(userStatuses[0]);
                                        setStatusViewOpen(true);
                                        // Mark as viewed
                                        setStatusList(prev => prev.map(s => 
                                          s.id === userStatuses[0].id 
                                            ? {...s, views: [...s.views.filter(v => v.userId !== user?.id), { userId: user?.id || '', viewedAt: new Date() }]}
                                            : s
                                        ));
                                      }
                                    }}
                                  >
                                    <Avatar className={`w-14 h-14 ${hasNewStatus ? 'ring-2 ring-cyan-500 ring-offset-2' : 'ring-1 ring-slate-300 dark:ring-slate-600'}`}>
                                      {statusUser.avatar ? <AvatarImage src={statusUser.avatar} /> : null}
                                      <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{statusUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs mt-1 text-muted-foreground truncate w-14 text-center">{statusUser.name}</span>
                                    {userStatuses.length > 1 && (
                                      <span className="text-[10px] text-cyan-600">{userStatuses.length} statuts</span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 p-2 border-b bg-slate-50 dark:bg-slate-800">
                        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('all')} className={`text-xs rounded-full ${conversationFilter === 'all' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>Toutes</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('unread')} className={`text-xs rounded-full ${conversationFilter === 'unread' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>Non lues</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConversationFilter('groups')} className={`text-xs rounded-full ${conversationFilter === 'groups' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : ''}`}>Groupes</Button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto contact-list-scrollbar">
                        {conversations.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="font-medium text-lg mb-2">Aucune discussion</h3>
                            <p className="text-muted-foreground text-sm mb-4">Commencez une nouvelle conversation</p>
                            <div className="flex gap-2">
                              <Button onClick={() => setNewConversationOpen(true)} className="bg-cyan-500 hover:bg-cyan-600"><MessageCircle className="w-4 h-4 mr-2" />Nouvelle discussion</Button>
                              <Button onClick={() => setCreateGroupOpen(true)} variant="outline"><Users className="w-4 h-4 mr-2" />Créer un groupe</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {conversations
                              .filter(c => {
                                if (conversationFilter === 'unread') return c.unreadCount > 0;
                                if (conversationFilter === 'groups') return c.type === 'group';
                                return true;
                              })
                              .filter(c => chatSearchQuery === '' || (c.type === 'group' ? c.name?.toLowerCase().includes(chatSearchQuery.toLowerCase()) : c.participants.find(p => p.id !== user?.id)?.name.toLowerCase().includes(chatSearchQuery.toLowerCase())))
                              .sort((a, b) => { if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1; return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); })
                              .map((conversation) => {
                              const otherParticipant = conversation.type === 'individual' ? conversation.participants.find(p => p.id !== user?.id) : null;
                              const displayName = conversation.type === 'group' ? conversation.name : otherParticipant?.name || 'Inconnu';
                              const isOnline = conversation.type === 'individual' && userPresence[otherParticipant?.id || ''] === 'online';
                              const isAnnonces = otherParticipant?.id === 'system-annonces';
                              return (
                                <div key={conversation.id} onClick={() => { setSelectedConversation(conversation); setConversations(prev => prev.map(c => c.id === conversation.id ? {...c, unreadCount: 0} : c)); }} className={`flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedConversation?.id === conversation.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                  <div className="relative">
                                    <Avatar className="w-12 h-12">
                                      {isAnnonces ? (
                                        <AvatarImage src="/logo_sc_icon.png" alt="Annonces" />
                                      ) : conversation.type === 'group' ? (
                                        <AvatarFallback className="bg-cyan-500 text-white"><Users className="w-6 h-6" /></AvatarFallback>
                                      ) : (
                                        <AvatarFallback className="bg-cyan-500 text-white">{displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                      )}
                                    </Avatar>
                                    {isOnline && !isAnnonces && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>}
                                    {conversation.isMuted && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center"><BellOff className="w-2.5 h-2.5 text-white" /></span>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm truncate flex items-center gap-1">
                                        {isAnnonces && <Bell className="w-4 h-4 text-yellow-500" />}
                                        {displayName}
                                        {conversation.isPinned && <Pin className="w-3 h-3 text-cyan-500" />}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{conversation.lastMessage ? format(conversation.lastMessage.createdAt, 'HH:mm') : ''}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{conversation.lastMessage?.deletedForEveryone ? 'Ce message a été supprimé' : conversation.lastMessage?.type === 'voice' ? '🎤 Message vocal' : conversation.lastMessage?.type === 'image' ? '📷 Image' : conversation.lastMessage?.type === 'video' ? '🎬 Vidéo' : conversation.lastMessage?.type === 'document' ? '📄 Document' : conversation.lastMessage?.content || 'Aucun message'}</p>
                                      {conversation.unreadCount > 0 && <Badge className={`${isAnnonces ? 'bg-yellow-500' : 'bg-cyan-500'} text-white text-xs rounded-full px-2`}>{conversation.unreadCount}</Badge>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedConversation ? (
                      <div className="flex-1 flex flex-col bg-cyan-50 dark:bg-slate-800 relative overflow-hidden">
                        {/* Enhanced watermark with pattern - HIGHER OPACITY - CUSTOM BACKGROUND SUPPORT */}
                        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                          {/* Custom background image or pattern */}
                          {customBackgroundImage ? (
                            customBackgroundImage.startsWith('data:') ? (
                              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: `url(${customBackgroundImage})` }} />
                            ) : customBackgroundImage === 'pattern-dots' ? (
                              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.15 }} />
                            ) : customBackgroundImage === 'pattern-lines' ? (
                              <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00BCD4 0, #00BCD4 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px', opacity: 0.1 }} />
                            ) : customBackgroundImage === 'pattern-grid' ? (
                              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#00BCD4 1px, transparent 1px), linear-gradient(90deg, #00BCD4 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }} />
                            ) : customBackgroundImage === 'pattern-circuit' ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.25] dark:opacity-[0.15]" />
                              </div>
                            ) : null
                          ) : (
                            <>
                              {/* Main centered logo watermark - PLUS VISIBLE */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.20] dark:opacity-[0.12]" />
                              </div>
                              {/* Decorative pattern */}
                              <div className="absolute inset-0" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300BCD4' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                backgroundSize: '60px 60px'
                              }}></div>
                              {/* Corner logos */}
                              <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute top-4 left-4 w-20 h-20 object-contain opacity-[0.12] dark:opacity-[0.08]" />
                              <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute bottom-4 right-4 w-20 h-20 object-contain opacity-[0.12] dark:opacity-[0.08]" />
                              {/* Additional corner logos */}
                              <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute top-4 right-4 w-12 h-12 object-contain opacity-[0.08] dark:opacity-[0.05]" />
                              <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute bottom-4 left-4 w-12 h-12 object-contain opacity-[0.08] dark:opacity-[0.05]" />
                            </>
                          )}
                        </div>
                        <div className="relative bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-3 flex items-center justify-between z-10">
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="text-white lg:hidden" onClick={() => setSelectedConversation(null)}><ChevronLeft className="w-5 h-5" /></Button>
                            <Avatar className="w-10 h-10">
                              {selectedConversation.type === 'group' ? (
                                <AvatarFallback className="bg-cyan-500 text-white"><Users className="w-5 h-5" /></AvatarFallback>
                              ) : selectedConversation.participants.find(p => p.id !== user?.id)?.id === 'system-annonces' ? (
                                <AvatarImage src="/logo_sc_icon.png" alt="Annonces" />
                              ) : (
                                <AvatarFallback className="bg-cyan-500 text-white">{selectedConversation.participants.find(p => p.id !== user?.id)?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-1">
                                {selectedConversation.participants.find(p => p.id !== user?.id)?.id === 'system-annonces' && <Bell className="w-4 h-4 text-yellow-400" />}
                                {selectedConversation.type === 'group' ? selectedConversation.name : selectedConversation.participants.find(p => p.id !== user?.id)?.name}
                              </p>
                              <p className="text-xs text-white/70">
                                {selectedConversation.participants.find(p => p.id !== user?.id)?.id === 'system-annonces' ? 'Canal d\'annonces officiel' :
                                typingIndicators.find(t => t.conversationId === selectedConversation.id)?.isTyping ? "En train d'écrire..." : 
                                selectedConversation.type === 'group' ? `${selectedConversation.participants.length} membres` : 
                                userPresence[selectedConversation.participants.find(p => p.id !== user?.id)?.id || ''] === 'online' ? 'En ligne' : 'Hors ligne'}
                              </p>
                            </div>
                          </div>
                          {/* Hide call buttons for Annonces */}
                          {selectedConversation.participants.find(p => p.id !== user?.id)?.id !== 'system-annonces' && (
                          <div className="flex items-center gap-1">
                            {/* Search messages button */}
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setMessageSearchOpen(!messageSearchOpen)} title="Rechercher dans les messages">
                              <Search className="w-5 h-5" />
                            </Button>
                            {/* Settings button */}
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setBackgroundSettingsOpen(true)} title="Paramètres">
                              <Settings className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => { 
                              if (selectedConversation.type === 'group') {
                                setActiveCall({ 
                                  id: generateId(), 
                                  conversationId: selectedConversation.id, 
                                  callerId: user?.id || '', 
                                  callerName: user?.name || '', 
                                  calleeId: selectedConversation.participants.map(p => p.id).join(','), 
                                  calleeName: `Groupe: ${selectedConversation.name}`, 
                                  type: 'video', 
                                  status: 'ongoing', 
                                  startedAt: new Date() 
                                });
                                setCallDialogOpen(true);
                                setCallTimer(0);
                              } else {
                                const otherUser = selectedConversation.participants.find(p => p.id !== user?.id); 
                                if (otherUser) { 
                                  setActiveCall({ id: generateId(), conversationId: selectedConversation.id, callerId: user?.id || '', callerName: user?.name || '', calleeId: otherUser.id, calleeName: otherUser.name, type: 'video', status: 'ongoing', startedAt: new Date() }); 
                                  setCallDialogOpen(true);
                                  setCallTimer(0);
                                }
                              }
                            }}><Video className="w-5 h-5" /></Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => { 
                              if (selectedConversation.type === 'group') {
                                setActiveCall({ 
                                  id: generateId(), 
                                  conversationId: selectedConversation.id, 
                                  callerId: user?.id || '', 
                                  callerName: user?.name || '', 
                                  calleeId: selectedConversation.participants.map(p => p.id).join(','), 
                                  calleeName: `Groupe: ${selectedConversation.name}`, 
                                  type: 'audio', 
                                  status: 'ongoing', 
                                  startedAt: new Date() 
                                });
                                setCallDialogOpen(true);
                                setCallTimer(0);
                              } else {
                                const otherUser = selectedConversation.participants.find(p => p.id !== user?.id); 
                                if (otherUser) { 
                                  setActiveCall({ id: generateId(), conversationId: selectedConversation.id, callerId: user?.id || '', callerName: user?.name || '', calleeId: otherUser.id, calleeName: otherUser.name, type: 'audio', status: 'ongoing', startedAt: new Date() }); 
                                  setCallDialogOpen(true);
                                  setCallTimer(0);
                                }
                              }
                            }}><Phone className="w-5 h-5" /></Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, isPinned: !c.isPinned} : c)); toast.success(selectedConversation.isPinned ? 'Discussion désépinglée' : 'Discussion épinglée'); }}><Pin className="w-4 h-4 mr-2" />{selectedConversation.isPinned ? 'Désépingler' : 'Épingler'}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, isMuted: !c.isMuted} : c)); toast.success(selectedConversation.isMuted ? 'Notifications réactivées' : 'Notifications désactivées'); }}><BellOff className="w-4 h-4 mr-2" />{selectedConversation.isMuted ? 'Réactiver' : 'Désactiver'}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, isArchived: true} : c)); setSelectedConversation(null); toast.success('Discussion archivée'); }}><Archive className="w-4 h-4 mr-2" />Archiver</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          )}
                        </div>
                        {/* Message Search Bar */}
                        {messageSearchOpen && (
                          <div className="bg-white dark:bg-slate-800 border-b p-2 z-20 relative">
                            <div className="flex items-center gap-2 max-w-3xl mx-auto">
                              <Search className="w-4 h-4 text-muted-foreground" />
                              <Input 
                                placeholder="Rechercher dans la conversation..." 
                                value={chatSearchMessageQuery}
                                onChange={(e) => {
                                  setChatSearchMessageQuery(e.target.value);
                                  // Search in messages
                                  const results = chatMessages.filter(m => 
                                    m.conversationId === selectedConversation.id && 
                                    !m.deletedForEveryone && 
                                    !m.isDeleted &&
                                    m.content.toLowerCase().includes(e.target.value.toLowerCase())
                                  );
                                  setSearchResults(results);
                                  setCurrentSearchIndex(0);
                                }}
                                className="flex-1 h-8"
                              />
                              {searchResults.length > 0 && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {currentSearchIndex + 1} / {searchResults.length}
                                </span>
                              )}
                              {searchResults.length > 1 && (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => setCurrentSearchIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1)}
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => setCurrentSearchIndex(prev => prev < searchResults.length - 1 ? prev + 1 : 0)}
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setMessageSearchOpen(false); setChatSearchMessageQuery(''); setSearchResults([]); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 relative z-10 chat-scrollbar">
                          <div className="space-y-2 max-w-3xl mx-auto">
                            {/* Pinned messages */}
                            {pinnedMessages.filter(m => m.conversationId === selectedConversation.id).length > 0 && (
                              <div className="bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-500 p-2 rounded mb-4">
                                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1 flex items-center gap-1">
                                  <Pin className="w-3 h-3" /> Messages épinglés
                                </p>
                                {pinnedMessages.filter(m => m.conversationId === selectedConversation.id).map((msg) => (
                                  <div key={msg.id} className="text-sm text-muted-foreground truncate">
                                    <span className="font-medium">{msg.senderName}:</span> {msg.content}
                                  </div>
                                ))}
                              </div>
                            )}
                            {chatMessages.filter(m => m.conversationId === selectedConversation.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((message, index, messages) => {
                              const isOwn = message.senderId === user?.id;
                              const showDate = index === 0 || format(message.createdAt, 'yyyy-MM-dd') !== format(messages[index - 1].createdAt, 'yyyy-MM-dd');
                              const isSearchResult = searchResults.find(r => r.id === message.id);
                              const isCurrentResult = searchResults[currentSearchIndex]?.id === message.id;
                              const renderMessageContent = () => {
                                if (message.deletedForEveryone) {
                                  return <p className="text-sm text-muted-foreground italic">Ce message a été supprimé</p>;
                                }
                                if (message.isDeleted) {
                                  return <p className="text-sm text-muted-foreground italic">Message supprimé</p>;
                                }
                                if (message.type === 'voice' && message.mediaData) {
                                  const isPlaying = playingMessageId === message.id;
                                  const progress = audioProgress[message.id] || 0;
                                  return (
                                    <div className="flex items-center gap-2 min-w-[200px]">
                                      <button 
                                        onClick={() => {
                                          if (isPlaying) {
                                            if (audioRef.current) {
                                              audioRef.current.pause();
                                              audioRef.current = null;
                                            }
                                            setPlayingMessageId(null);
                                          } else {
                                            // Stop any currently playing audio
                                            if (audioRef.current) {
                                              audioRef.current.pause();
                                            }
                                            // Create and play new audio
                                            const audio = new Audio(message.mediaData);
                                            audioRef.current = audio;
                                            audio.onended = () => {
                                              setPlayingMessageId(null);
                                              setAudioProgress(prev => ({...prev, [message.id]: 100}));
                                            };
                                            audio.ontimeupdate = () => {
                                              const percent = (audio.currentTime / audio.duration) * 100;
                                              setAudioProgress(prev => ({...prev, [message.id]: percent}));
                                            };
                                            audio.play();
                                            setPlayingMessageId(message.id);
                                          }
                                        }} 
                                        className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-md"
                                      >
                                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                      </button>
                                      <div 
                                        className="flex-1 h-8 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden cursor-pointer relative" 
                                        onClick={(e) => {
                                          if (audioRef.current && message.mediaData) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = ((e.clientX - rect.left) / rect.width);
                                            const audio = new Audio(message.mediaData);
                                            audio.duration = message.duration || 0;
                                            if (audioRef.current.duration) {
                                              audioRef.current.currentTime = percent * audioRef.current.duration;
                                              setAudioProgress(prev => ({...prev, [message.id]: percent * 100}));
                                            }
                                          }
                                        }}
                                      >
                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all relative" style={{ width: `${progress}%` }}>
                                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                                        </div>
                                      </div>
                                      <span className="text-xs text-muted-foreground font-mono min-w-[40px]">{Math.floor((message.duration || 0) / 60)}:{String((message.duration || 0) % 60).padStart(2, '0')}</span>
                                    </div>
                                  );
                                }
                                if (message.type === 'voice') {
                                  const isPlaying = playingMessageId === message.id;
                                  const progress = audioProgress[message.id] || 0;
                                  return (
                                    <div className="flex items-center gap-2 min-w-[200px]">
                                      <button onClick={() => {
                                        if (isPlaying) {
                                          setPlayingMessageId(null);
                                        } else {
                                          setPlayingMessageId(message.id);
                                          // Simulate playback for demo voice messages
                                          let currentProgress = 0;
                                          const interval = setInterval(() => {
                                            currentProgress += 100 / ((message.duration || 10) * 10);
                                            if (currentProgress >= 100) {
                                              clearInterval(interval);
                                              setPlayingMessageId(null);
                                              setAudioProgress(prev => ({...prev, [message.id]: 100}));
                                            } else {
                                              setAudioProgress(prev => ({...prev, [message.id]: currentProgress}));
                                            }
                                          }, 100);
                                        }
                                      }} className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-md">
                                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                      </button>
                                      <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = ((e.clientX - rect.left) / rect.width) * 100;
                                        setAudioProgress(prev => ({...prev, [message.id]: percent}));
                                      }}>
                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all relative" style={{ width: `${isPlaying ? progress : 0}%` }}>
                                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                                        </div>
                                      </div>
                                      <span className="text-xs text-muted-foreground font-mono min-w-[40px]">{Math.floor((message.duration || 0) / 60)}:{String((message.duration || 0) % 60).padStart(2, '0')}</span>
                                    </div>
                                  );
                                }
                                if (message.type === 'image' && message.mediaData) {
                                  return (
                                    <div className="max-w-[250px]">
                                      <img src={message.mediaData} alt="Image" className="rounded-lg max-h-[200px] object-cover" />
                                      {message.content && <p className="text-sm mt-1">{message.content}</p>}
                                    </div>
                                  );
                                }
                                if (message.type === 'video' && message.mediaData) {
                                  return (
                                    <div className="max-w-[250px]">
                                      <video src={message.mediaData} controls className="rounded-lg max-h-[200px]" />
                                      {message.content && <p className="text-sm mt-1">{message.content}</p>}
                                    </div>
                                  );
                                }
                                if (message.type === 'document') {
                                  return (
                                    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-600 rounded-lg">
                                      <File className="w-8 h-8 text-cyan-500" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{message.fileName || 'Document'}</p>
                                        <p className="text-xs text-muted-foreground">{message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}</p>
                                      </div>
                                    </div>
                                  );
                                }
                                // Render text with mention highlighting, search highlighting, and link detection
                                let content = message.content;
                                
                                // URL detection and linking
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const parts = content.split(urlRegex);
                                const contentWithLinks = parts.map((part, i) => {
                                  if (part.match(urlRegex)) {
                                    return (
                                      <a 
                                        key={i} 
                                        href={part} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-cyan-600 dark:text-cyan-400 underline hover:text-cyan-700 dark:hover:text-cyan-300"
                                      >
                                        {part.length > 40 ? part.substring(0, 40) + '...' : part}
                                      </a>
                                    );
                                  }
                                  return part;
                                });
                                
                                // Apply mention highlighting
                                const contentWithMentions = contentWithLinks.flat().map((part, i) => {
                                  if (typeof part === 'string') {
                                    const mentionParts = part.split(/(@\w+)/g);
                                    return mentionParts.map((mentionPart, j) => {
                                      if (mentionPart.startsWith('@')) {
                                        return <span key={`${i}-${j}`} className="text-cyan-600 dark:text-cyan-400 font-medium bg-cyan-50 dark:bg-cyan-900/30 px-1 rounded">{mentionPart}</span>;
                                      }
                                      // Apply search highlighting
                                      if (chatSearchMessageQuery && mentionPart.toLowerCase().includes(chatSearchMessageQuery.toLowerCase())) {
                                        const regex = new RegExp(`(${chatSearchMessageQuery})`, 'gi');
                                        const searchParts = mentionPart.split(regex);
                                        return searchParts.map((searchPart, k) => {
                                          if (searchPart.toLowerCase() === chatSearchMessageQuery.toLowerCase()) {
                                            return <span key={`${i}-${j}-${k}`} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">{searchPart}</span>;
                                          }
                                          return searchPart;
                                        });
                                      }
                                      return mentionPart;
                                    });
                                  }
                                  return part;
                                });
                                
                                return <p className="text-sm whitespace-pre-wrap break-words">{contentWithMentions}</p>;
                              };
                              
                              // Helper function to apply formatting styles
                              const getFormattingStyles = (fmt?: ChatMessage['formatting']): React.CSSProperties => {
                                if (!fmt) return {};
                                return {
                                  fontWeight: fmt.bold ? 'bold' : undefined,
                                  fontStyle: fmt.italic ? 'italic' : undefined,
                                  textDecoration: fmt.underline ? 'underline' : undefined,
                                  fontSize: fmt.fontSize === 'small' ? '0.75rem' : fmt.fontSize === 'large' ? '1.125rem' : undefined,
                                  color: fmt.color || undefined,
                                };
                              };
                              
                              return (
                                <div key={message.id} id={`message-${message.id}`} className={`${isCurrentResult ? 'ring-2 ring-yellow-400 rounded-lg' : ''} ${selectedChatMessages.has(message.id) ? 'bg-cyan-100/50 dark:bg-cyan-900/20 rounded-lg' : ''}`}>
                                  {showDate && <div className="flex justify-center my-4"><span className="bg-white/80 dark:bg-slate-700/80 text-xs text-muted-foreground px-3 py-1 rounded-lg shadow">{format(message.createdAt, 'EEEE d MMMM yyyy', { locale: fr })}</span></div>}
                                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                                    {/* Multi-select checkbox */}
                                    {isSelectionMode && (
                                      <Checkbox
                                        checked={selectedChatMessages.has(message.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedChatMessages(prev => new Set([...prev, message.id]));
                                          } else {
                                            setSelectedChatMessages(prev => {
                                              const newSet = new Set(prev);
                                              newSet.delete(message.id);
                                              return newSet;
                                            });
                                          }
                                        }}
                                        className="mt-2"
                                      />
                                    )}
                                    <div 
                                      className={`max-w-[70%] ${isOwn ? 'bg-cyan-100 dark:bg-cyan-900/30 rounded-l-2xl rounded-br-sm' : 'bg-white dark:bg-slate-700 rounded-r-2xl rounded-bl-sm shadow-sm'} px-3 py-2 relative group`}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (!message.deletedForEveryone && !message.isDeleted) {
                                          setContextMenuMessage(message);
                                          setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                          setShowContextMenu(true);
                                        }
                                      }}
                                    >
                                      {/* Reply reference display */}
                                      {message.replyTo && !message.deletedForEveryone && !message.isDeleted && (
                                        <button
                                          onClick={() => {
                                            const replyElement = document.getElementById(`message-${message.replyTo?.id}`);
                                            if (replyElement) {
                                              replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              replyElement.classList.add('ring-2', 'ring-cyan-400');
                                              setTimeout(() => {
                                                replyElement.classList.remove('ring-2', 'ring-cyan-400');
                                              }, 2000);
                                            }
                                          }}
                                          className="mb-1 text-left w-full border-l-2 border-cyan-400 pl-2 py-1 bg-slate-50 dark:bg-slate-600/50 rounded-r text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        >
                                          <span className="font-medium text-cyan-600 dark:text-cyan-400">{message.replyTo.senderName}</span>
                                          <p className="truncate">{message.replyTo.content || 'Media'}</p>
                                        </button>
                                      )}
                                      {selectedConversation.type === 'group' && !isOwn && <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-0.5">{message.senderName}</p>}
                                      
                                      {/* Message content with formatting */}
                                      {message.formatting ? (
                                        <span style={getFormattingStyles(message.formatting)}>
                                          {renderMessageContent()}
                                        </span>
                                      ) : (
                                        renderMessageContent()
                                      )}
                                      
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                        {message.isEdited && <span className="text-[10px] text-muted-foreground italic mr-1">modifié</span>}
                                        {message.isArchived && <Archive className="w-3 h-3 text-slate-400 mr-1" />}
                                        <span className="text-[10px] text-muted-foreground">{format(message.createdAt, 'HH:mm')}</span>
                                        {isOwn && !message.deletedForEveryone && !message.isDeleted && <span className="flex">{message.status === 'read' ? <CheckCheck className="w-3 h-3 text-cyan-500" /> : <CheckCheck className="w-3 h-3 text-slate-400" />}</span>}
                                      </div>
                                      
                                      {/* WhatsApp-style reply button on hover */}
                                      {!message.deletedForEveryone && !message.isDeleted && (
                                        <button
                                          onClick={() => setReplyingTo(message)}
                                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                          <Reply className="w-4 h-4 text-slate-500" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {typingIndicators.find(t => t.conversationId === selectedConversation.id)?.isTyping && (
                              <div className="flex justify-start"><div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-sm"><div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span><span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span><span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span></div></div></div>
                            )}
                          </div>
                        </div>
                        
                        {/* Context Menu for messages */}
                        {showContextMenu && contextMenuMessage && (
                          <div 
                            className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border py-1 min-w-[180px]"
                            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
                            onClick={() => setShowContextMenu(false)}
                          >
                            {/* Pin message option */}
                            <button 
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              onClick={() => {
                                if (contextMenuMessage.isPinned) {
                                  setPinnedMessages(prev => prev.filter(m => m.id !== contextMenuMessage.id));
                                  setChatMessages(prev => prev.map(m => m.id === contextMenuMessage.id ? {...m, isPinned: false} : m));
                                  toast.success('Message désépinglé');
                                } else {
                                  setPinnedMessages(prev => [...prev, contextMenuMessage]);
                                  setChatMessages(prev => prev.map(m => m.id === contextMenuMessage.id ? {...m, isPinned: true} : m));
                                  toast.success('Message épinglé');
                                }
                                setShowContextMenu(false);
                              }}
                            >
                              <Pin className="w-4 h-4" /> {contextMenuMessage.isPinned ? 'Désépingler' : 'Épingler'}
                            </button>
                            {contextMenuMessage.senderId === user?.id && (
                              <button 
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  setEditingMessage(contextMenuMessage);
                                  setEditMessageContent(contextMenuMessage.content);
                                  setEditMessageDialogOpen(true);
                                  setShowContextMenu(false);
                                }}
                              >
                                <Edit className="w-4 h-4" /> Modifier
                              </button>
                            )}
                            <button 
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              onClick={() => {
                                setChatMessages(prev => prev.map(m => m.id === contextMenuMessage.id ? {...m, isDeleted: true} : m));
                                toast.success('Message supprimé pour vous');
                                setShowContextMenu(false);
                              }}
                            >
                              <Trash2 className="w-4 h-4" /> Supprimer pour moi
                            </button>
                            {contextMenuMessage.senderId === user?.id && (() => {
                              // Check if 10 minutes have passed
                              const messageTime = new Date(contextMenuMessage.createdAt).getTime();
                              const currentTime = Date.now();
                              const minutesPassed = (currentTime - messageTime) / 60000;
                              const canDeleteForEveryone = minutesPassed <= 10;
                              
                              return canDeleteForEveryone ? (
                                <button 
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
                                  onClick={() => {
                                    setChatMessages(prev => prev.map(m => m.id === contextMenuMessage.id ? {...m, deletedForEveryone: true} : m));
                                    setConversations(prev => prev.map(c => {
                                      if (c.lastMessage?.id === contextMenuMessage.id) {
                                        return {...c, lastMessage: {...c.lastMessage, deletedForEveryone: true}};
                                      }
                                      return c;
                                    }));
                                    toast.success('Message supprimé pour tous');
                                    setShowContextMenu(false);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" /> Supprimer pour tous
                                </button>
                              ) : (
                                <button 
                                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed"
                                  disabled
                                  title="Disponible uniquement dans les 10 minutes après l'envoi"
                                >
                                  <Trash2 className="w-4 h-4" /> Supprimer pour tous (expiré)
                                </button>
                              );
                            })()}
                            <button 
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              onClick={() => {
                                setReplyingTo(contextMenuMessage);
                                setShowContextMenu(false);
                              }}
                            >
                              <Reply className="w-4 h-4" /> Répondre
                            </button>
                          </div>
                        )}
                        <div className="relative bg-slate-50 dark:bg-slate-800 p-2 z-10">
                          {/* Multi-select action bar */}
                          {isSelectionMode && (
                            <div className="flex items-center justify-between p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mb-2">
                              <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-cyan-500" />
                                <span className="text-sm font-medium">{selectedChatMessages.size} message(s) sélectionné(s)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const messageIds = Array.from(selectedChatMessages);
                                    setChatMessages(prev => prev.map(m => 
                                      selectedChatMessages.has(m.id) ? {...m, isArchived: true} : m
                                    ));
                                    toast.success(`${messageIds.length} message(s) archivé(s)`);
                                    setSelectedChatMessages(new Set());
                                    setIsSelectionMode(false);
                                  }}
                                  disabled={selectedChatMessages.size === 0}
                                >
                                  <Archive className="w-4 h-4 mr-1" />
                                  Archiver
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    const messageIds = Array.from(selectedChatMessages);
                                    setChatMessages(prev => prev.map(m => 
                                      selectedChatMessages.has(m.id) ? {...m, isDeleted: true} : m
                                    ));
                                    toast.success(`${messageIds.length} message(s) supprimé(s)`);
                                    setSelectedChatMessages(new Set());
                                    setIsSelectionMode(false);
                                  }}
                                  disabled={selectedChatMessages.size === 0}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Supprimer
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedChatMessages(new Set());
                                    setIsSelectionMode(false);
                                  }}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Formatting toolbar */}
                          {showFormattingToolbar && (
                            <div className="flex items-center gap-1 p-2 bg-white dark:bg-slate-700 rounded-lg mb-2 border">
                              <Button
                                variant={currentFormatting.bold ? "default" : "ghost"}
                                size="icon"
                                className={`h-8 w-8 ${currentFormatting.bold ? 'bg-cyan-500 text-white' : ''}`}
                                onClick={() => setCurrentFormatting(prev => ({...prev, bold: !prev.bold}))}
                              >
                                <Bold className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={currentFormatting.italic ? "default" : "ghost"}
                                size="icon"
                                className={`h-8 w-8 ${currentFormatting.italic ? 'bg-cyan-500 text-white' : ''}`}
                                onClick={() => setCurrentFormatting(prev => ({...prev, italic: !prev.italic}))}
                              >
                                <Italic className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={currentFormatting.underline ? "default" : "ghost"}
                                size="icon"
                                className={`h-8 w-8 ${currentFormatting.underline ? 'bg-cyan-500 text-white' : ''}`}
                                onClick={() => setCurrentFormatting(prev => ({...prev, underline: !prev.underline}))}
                              >
                                <Underline className="w-4 h-4" />
                              </Button>
                              <Separator orientation="vertical" className="h-6 mx-1" />
                              <div className="flex items-center gap-1">
                                {(['small', 'normal', 'large'] as const).map((size) => (
                                  <Button
                                    key={size}
                                    variant={currentFormatting.fontSize === size ? "default" : "ghost"}
                                    size="icon"
                                    className={`h-8 w-8 ${currentFormatting.fontSize === size ? 'bg-cyan-500 text-white' : ''}`}
                                    onClick={() => setCurrentFormatting(prev => ({...prev, fontSize: size}))}
                                  >
                                    <span className="text-xs">{size === 'small' ? 'S' : size === 'normal' ? 'M' : 'L'}</span>
                                  </Button>
                                ))}
                              </div>
                              <Separator orientation="vertical" className="h-6 mx-1" />
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Couleur:</span>
                                <input
                                  type="color"
                                  value={currentFormatting.color}
                                  onChange={(e) => setCurrentFormatting(prev => ({...prev, color: e.target.value}))}
                                  className="w-6 h-6 rounded cursor-pointer border-0"
                                />
                              </div>
                              <Separator orientation="vertical" className="h-6 mx-1" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentFormatting({
                                    bold: false,
                                    italic: false,
                                    underline: false,
                                    fontSize: 'normal',
                                    color: '#000000'
                                  });
                                }}
                              >
                                Réinitialiser
                              </Button>
                            </div>
                          )}
                          
                          {/* Reply preview */}
                          {replyingTo && (
                            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2">
                              <Reply className="w-4 h-4 text-cyan-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-cyan-600 font-medium">Répondre à {replyingTo.senderName}</p>
                                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                          
                          {/* Attachment preview */}
                          {attachmentPreview.file && (
                            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2">
                              {attachmentPreview.type === 'image' && attachmentPreview.preview && (
                                <img src={attachmentPreview.preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                              )}
                              {attachmentPreview.type === 'video' && attachmentPreview.preview && (
                                <video src={attachmentPreview.preview} className="w-16 h-16 object-cover rounded" />
                              )}
                              {attachmentPreview.type === 'document' && (
                                <File className="w-8 h-8 text-cyan-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-cyan-600 font-medium truncate">{attachmentPreview.file?.name}</p>
                                <p className="text-xs text-muted-foreground">{attachmentPreview.file?.size ? `${(attachmentPreview.file.size / 1024).toFixed(1)} KB` : ''}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachmentPreview({ file: null, preview: null, type: null })}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                          
                          <div className="flex items-end gap-2 max-w-3xl mx-auto">
                            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-cyan-500"><Smile className="w-6 h-6" /></Button></PopoverTrigger>
                              <PopoverContent className="w-72 p-2" align="start">
                                <div className="grid grid-cols-8 gap-1">
                                  {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '✅', '⏰', '📞', '📧', '💻', '🔧', '📊', '📈', '✨', '🌟', '💪', '🙏', '👋'].map((emoji) => (
                                    <button key={emoji} onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1">{emoji}</button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            {/* Selection mode toggle button */}
                            <Button
                              variant={isSelectionMode ? "default" : "ghost"}
                              size="icon"
                              className={`rounded-full ${isSelectionMode ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-cyan-500'}`}
                              onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) {
                                  setSelectedChatMessages(new Set());
                                }
                              }}
                              title="Mode sélection"
                            >
                              <CheckSquare className="w-5 h-5" />
                            </Button>
                            {/* Formatting toolbar toggle button */}
                            <Button
                              variant={showFormattingToolbar ? "default" : "ghost"}
                              size="icon"
                              className={`rounded-full ${showFormattingToolbar ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-cyan-500'}`}
                              onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                              title="Formatage du texte"
                            >
                              <Type className="w-5 h-5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-cyan-500"><Paperclip className="w-5 h-5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { setAttachmentPreview({ file, preview: e.target?.result as string, type: 'image' }); }; reader.readAsDataURL(file); } }; input.click(); }}><ImageIcon className="w-4 h-4 mr-2 text-purple-500" />Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'video/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { setAttachmentPreview({ file, preview: e.target?.result as string, type: 'video' }); }; reader.readAsDataURL(file); } }; input.click(); }}><Film className="w-4 h-4 mr-2 text-red-500" />Vidéo</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { setAttachmentPreview({ file, preview: null, type: 'document' }); }; reader.readAsDataURL(file); } }; input.click(); }}><File className="w-4 h-4 mr-2 text-blue-500" />Document</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'audio/*'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { setAttachmentPreview({ file, preview: e.target?.result as string, type: 'audio' }); }; reader.readAsDataURL(file); } }; input.click(); }}><Mic className="w-4 h-4 mr-2 text-green-500" />Audio</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex-1 relative">
                              {/* Mention suggestions */}
                              {showMentionSuggestions && (
                                <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-slate-800 border rounded-t-lg shadow-lg max-h-40 overflow-y-auto z-10">
                                  {Object.values(DEMO_USERS)
                                    .filter(u => u.id !== user?.id && u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                                    .slice(0, 5)
                                    .map((u) => (
                                      <button
                                        key={u.id}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        onClick={() => {
                                          setNewMessage(prev => prev.slice(0, -mentionQuery.length - 1) + `@${u.name} `);
                                          setShowMentionSuggestions(false);
                                          setMentionedUsers(prev => [...prev, u.id]);
                                        }}
                                      >
                                        <Avatar className="w-6 h-6"><AvatarFallback className="bg-cyan-500 text-white text-xs">{u.name.charAt(0)}</AvatarFallback></Avatar>
                                        <span className="text-sm">{u.name}</span>
                                      </button>
                                    ))}
                                </div>
                              )}
                              <Input 
                                placeholder="Écrire un message..." 
                                value={newMessage} 
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setNewMessage(value);
                                  // Check for @ mentions
                                  const lastAtIndex = value.lastIndexOf('@');
                                  if (lastAtIndex !== -1) {
                                    const textAfterAt = value.slice(lastAtIndex + 1);
                                    if (!textAfterAt.includes(' ')) {
                                      setMentionQuery(textAfterAt);
                                      setShowMentionSuggestions(true);
                                    } else {
                                      setShowMentionSuggestions(false);
                                    }
                                  } else {
                                    setShowMentionSuggestions(false);
                                  }
                                }} 
                                onKeyDown={(e) => { 
                                  if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) { 
                                    e.preventDefault();
                                    const messageType = attachmentPreview.type || 'text';
                                    const message: ChatMessage = { 
                                      id: generateId(), 
                                      conversationId: selectedConversation.id, 
                                      senderId: user?.id || '', 
                                      senderName: user?.name || '', 
                                      senderAvatar: user?.avatar,
                                      type: messageType as ChatMessageType, 
                                      content: newMessage.trim(), 
                                      mediaData: attachmentPreview.preview || undefined,
                                      fileName: attachmentPreview.file?.name,
                                      fileSize: attachmentPreview.file?.size,
                                      status: 'sent', 
                                      replyTo: replyingTo || undefined,
                                      isEdited: false, 
                                      isDeleted: false, 
                                      deletedForEveryone: false, 
                                      isPinned: false,
                                      isArchived: false,
                                      formatting: (currentFormatting.bold || currentFormatting.italic || currentFormatting.underline || currentFormatting.fontSize !== 'normal' || currentFormatting.color !== '#000000') ? {
                                        bold: currentFormatting.bold,
                                        italic: currentFormatting.italic,
                                        underline: currentFormatting.underline,
                                        fontSize: currentFormatting.fontSize,
                                        color: currentFormatting.color,
                                      } : undefined,
                                      reactions: [], 
                                      readBy: [], 
                                      createdAt: new Date(), 
                                      updatedAt: new Date() 
                                    }; 
                                    setChatMessages(prev => [...prev, message]); 
                                    setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, lastMessage: message, updatedAt: new Date()} : c)); 
                                    setNewMessage(''); 
                                    setAttachmentPreview({ file: null, preview: null, type: null });
                                    setLastReplyTo(replyingTo);
                                    setReplyingTo(null);
                                    setMentionedUsers([]);
                                    playMessageSendSound();
                                    // Simulate typing indicator for other user after a short delay
                                    setTimeout(() => {
                                      if (selectedConversation.type === 'individual') {
                                        const otherUser = selectedConversation.participants.find(p => p.id !== user?.id);
                                        if (otherUser) {
                                          setSimulatedTyping({ userId: otherUser.id, userName: otherUser.name, isRecording: false });
                                          setTimeout(() => setSimulatedTyping(null), 3000);
                                        }
                                      }
                                    }, 2000);
                                  }
                                }} 
                                className="w-full rounded-full border-0 bg-white dark:bg-slate-700 px-4 py-2" 
                              />
                            </div>
                            {newMessage.trim() || attachmentPreview.file ? (
                              <Button 
                                className="rounded-full bg-cyan-500 hover:bg-cyan-600 text-white h-10 w-10 p-0" 
                                onClick={() => { 
                                  const messageType = attachmentPreview.type || 'text';
                                  const message: ChatMessage = { 
                                    id: generateId(), 
                                    conversationId: selectedConversation.id, 
                                    senderId: user?.id || '', 
                                    senderName: user?.name || '', 
                                    senderAvatar: user?.avatar,
                                    type: messageType as ChatMessageType, 
                                    content: newMessage.trim(), 
                                    mediaData: attachmentPreview.preview || undefined,
                                    fileName: attachmentPreview.file?.name,
                                    fileSize: attachmentPreview.file?.size,
                                    status: 'sent', 
                                    replyTo: replyingTo || undefined,
                                    isEdited: false, 
                                    isDeleted: false, 
                                    deletedForEveryone: false, 
                                    isPinned: false,
                                    isArchived: false,
                                    formatting: (currentFormatting.bold || currentFormatting.italic || currentFormatting.underline || currentFormatting.fontSize !== 'normal' || currentFormatting.color !== '#000000') ? {
                                      bold: currentFormatting.bold,
                                      italic: currentFormatting.italic,
                                      underline: currentFormatting.underline,
                                      fontSize: currentFormatting.fontSize,
                                      color: currentFormatting.color,
                                    } : undefined,
                                    reactions: [], 
                                    readBy: [], 
                                    createdAt: new Date(), 
                                    updatedAt: new Date() 
                                  }; 
                                  setChatMessages(prev => [...prev, message]); 
                                  setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, lastMessage: message, updatedAt: new Date()} : c)); 
                                  setNewMessage(''); 
                                  setAttachmentPreview({ file: null, preview: null, type: null });
                                  setLastReplyTo(replyingTo);
                                  setReplyingTo(null);
                                  setMentionedUsers([]);
                                  playMessageSendSound();
                                  // Simulate typing indicator
                                  setTimeout(() => {
                                    if (selectedConversation.type === 'individual') {
                                      const otherUser = selectedConversation.participants.find(p => p.id !== user?.id);
                                      if (otherUser) {
                                        setSimulatedTyping({ userId: otherUser.id, userName: otherUser.name, isRecording: false });
                                        setTimeout(() => setSimulatedTyping(null), 3000);
                                      }
                                    }
                                  }, 2000);
                                }}
                              >
                                <Send className="w-5 h-5" />
                              </Button>
                            ) : (
                              <Button 
                                className={`rounded-full h-10 w-10 p-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-cyan-500 hover:bg-cyan-600'} text-white`} 
                                onMouseDown={async () => { 
                                  try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                    const mediaRecorder = new MediaRecorder(stream);
                                    mediaRecorderRef.current = mediaRecorder;
                                    audioChunksRef.current = [];
                                    
                                    mediaRecorder.ondataavailable = (e) => {
                                      if (e.data.size > 0) {
                                        audioChunksRef.current.push(e.data);
                                      }
                                    };
                                    
                                    mediaRecorder.start();
                                    setIsRecording(true); 
                                    setRecordingTime(0);
                                    
                                    // Play start recording sound
                                    if (soundEnabled && soundOnSend) {
                                      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleckA');
                                      audio.volume = 0.3;
                                      audio.play().catch(() => {});
                                    }
                                  } catch (err) {
                                    toast.error('Erreur microphone', { description: 'Impossible d\'accéder au microphone' });
                                  }
                                }} 
                                onMouseUp={() => { 
                                  if (mediaRecorderRef.current && isRecording) {
                                    mediaRecorderRef.current.onstop = () => {
                                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        const audioData = reader.result as string;
                                        if (recordingTime > 0) {
                                          const message: ChatMessage = { 
                                            id: generateId(), 
                                            conversationId: selectedConversation.id, 
                                            senderId: user?.id || '', 
                                            senderName: user?.name || '', 
                                            type: 'voice', 
                                            content: '', 
                                            mediaData: audioData,
                                            duration: recordingTime, 
                                            status: 'sent', 
                                            isEdited: false, 
                                            isDeleted: false, 
                                            deletedForEveryone: false, 
                                            isPinned: false,
                                            isArchived: false,
                                            reactions: [], 
                                            readBy: [], 
                                            createdAt: new Date(), 
                                            updatedAt: new Date() 
                                          }; 
                                          setChatMessages(prev => [...prev, message]); 
                                          setConversations(prev => prev.map(c => c.id === selectedConversation.id ? {...c, lastMessage: message, updatedAt: new Date()} : c));
                                          playMessageSendSound();
                                        }
                                      };
                                      reader.readAsDataURL(audioBlob);
                                    };
                                    mediaRecorderRef.current.stop();
                                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                                  }
                                  setIsRecording(false); 
                                  setRecordingTime(0); 
                                }}
                                onMouseLeave={() => {
                                  if (isRecording && mediaRecorderRef.current) {
                                    mediaRecorderRef.current.stop();
                                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                                  }
                                  setIsRecording(false);
                                  setRecordingTime(0);
                                }}
                              >
                                {isRecording ? <span className="text-xs font-medium">{recordingTime}s</span> : <Mic className="w-5 h-5" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-cyan-50 dark:bg-slate-800 relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.03] dark:opacity-[0.02]" />
                        </div>
                        <div className="text-center relative z-10">
                          <div className="w-64 h-64 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center"><MessageCircle className="w-32 h-32 text-cyan-500" /></div>
                          <h2 className="text-2xl font-medium text-slate-700 dark:text-slate-200 mb-2">Silicone Connect Chat</h2>
                          <p className="text-slate-500 dark:text-slate-400 max-w-md">Envoyez et recevez des messages avec vos collègues en temps réel.<br />Communication sécurisée et instantanée.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Edit Message Dialog */}
                  <Dialog open={editMessageDialogOpen} onOpenChange={setEditMessageDialogOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Edit className="w-5 h-5 text-cyan-500" />
                          Modifier le message
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea 
                          value={editMessageContent} 
                          onChange={(e) => setEditMessageContent(e.target.value)}
                          placeholder="Votre message..."
                          className="min-h-[100px]"
                        />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                        <Button 
                          className="bg-cyan-500 hover:bg-cyan-600"
                          onClick={() => {
                            if (editingMessage && editMessageContent.trim()) {
                              setChatMessages(prev => prev.map(m => 
                                m.id === editingMessage.id 
                                  ? {...m, content: editMessageContent, isEdited: true, updatedAt: new Date()} 
                                  : m
                              ));
                              setEditingMessage(null);
                              setEditMessageContent('');
                              setEditMessageDialogOpen(false);
                              toast.success('Message modifié');
                            }
                          }}
                        >
                          Enregistrer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-cyan-500" />Créer un groupe</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>Nom du groupe *</Label><Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ex: Shift A Discussion" /></div>
                        <div className="grid gap-2"><Label>Description</Label><Textarea value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Description du groupe..." /></div>
                        <div className="grid gap-2"><Label>Membres</Label><ScrollArea className="h-48 border rounded-lg p-2">{Object.values(DEMO_USERS).filter(u => u.id !== user?.id).map((u) => (<div key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer" onClick={() => { setSelectedMembers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]); }}><Checkbox checked={selectedMembers.includes(u.id)} /><Avatar className="w-8 h-8"><AvatarFallback className="bg-cyan-500 text-white text-xs">{u.name.charAt(0)}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.name}</p><p className="text-xs text-muted-foreground truncate">{u.role}</p></div></div>))}</ScrollArea></div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                        <Button className="bg-cyan-500 hover:bg-cyan-600" disabled={!newGroupName.trim() || selectedMembers.length === 0} onClick={() => { const conversation: Conversation = { id: generateId(), type: 'group', name: newGroupName, description: newGroupDescription, participants: [{ id: user?.id || '', name: user?.name || '', role: 'admin', joinedAt: new Date() }, ...selectedMembers.map(id => { const u = Object.values(DEMO_USERS).find(u => u.id === id); return { id, name: u?.name || '', role: 'member' as const, joinedAt: new Date() }; })], unreadCount: 0, isPinned: false, isMuted: false, isArchived: false, createdBy: user?.id || '', createdAt: new Date(), updatedAt: new Date() }; setConversations(prev => [conversation, ...prev]); setSelectedConversation(conversation); setNewGroupName(''); setNewGroupDescription(''); setSelectedMembers([]); setCreateGroupOpen(false); toast.success('Groupe créé'); }}>Créer le groupe</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Call Dialog - PROFESSIONNEL */}
                  <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
                    <DialogContent className="max-w-md p-0 bg-gradient-to-b from-slate-900 to-slate-800 border-0 text-white">
                      <div className="text-center py-8 px-6">
                        {/* Call type badge */}
                        <div className="flex justify-center mb-4">
                          <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            {activeCall?.type === 'video' ? 'Appel Vidéo' : 'Appel Audio'}
                          </Badge>
                        </div>
                        
                        {/* Main avatar */}
                        <Avatar className="w-28 h-28 mx-auto mb-4 ring-4 ring-cyan-500/30 ring-offset-4 ring-offset-slate-900">
                          {activeCall?.calleeName?.includes('Groupe') ? (
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-3xl"><Users className="w-14 h-14" /></AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-3xl">{activeCall?.calleeName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        
                        <h3 className="text-2xl font-semibold mb-1">{activeCall?.calleeName}</h3>
                        
                        {/* Call status */}
                        <p className="text-slate-400 mb-4">
                          {callState === 'calling' && (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                              Appel en cours...
                            </span>
                          )}
                          {callState === 'ringing' && (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Sonnerie... <span className="text-cyan-400 font-mono">{callTimer}s</span>
                            </span>
                          )}
                          {callState === 'connected' && (
                            <span className="text-green-400 font-mono text-lg">
                              {Math.floor(callTimer / 60)}:{String(callTimer % 60).padStart(2, '0')}
                            </span>
                          )}
                          {callState === 'ended' && 'Appel terminé'}
                        </p>
                        
                        {/* Ringing animation */}
                        {(callState === 'calling' || callState === 'ringing') && (
                          <div className="flex justify-center gap-1 mb-6">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <span 
                                key={i} 
                                className="w-1.5 h-8 rounded-full bg-cyan-500 animate-pulse" 
                                style={{ animationDelay: `${i * 100}ms`, animationDuration: '0.5s' }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Participants for group call */}
                        {activeCall?.calleeName?.includes('Groupe') && (
                          <div className="mb-6">
                            <p className="text-sm text-slate-400 mb-2">
                              Participants ({callParticipants.length + 1}/12)
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {/* Current user */}
                              <div className="flex flex-col items-center">
                                <Avatar className="w-12 h-12 ring-2 ring-green-500">
                                  {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                                  <AvatarFallback className="bg-green-500 text-white">{user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs mt-1 text-slate-300">Vous</span>
                              </div>
                              {/* Other participants */}
                              {callParticipants.slice(0, 11).map((participant) => (
                                <div key={participant.id} className="flex flex-col items-center relative">
                                  <Avatar className={`w-12 h-12 ${participant.isSpeaking ? 'ring-2 ring-cyan-500' : ''}`}>
                                    {participant.avatar ? (
                                      <AvatarImage src={participant.avatar} />
                                    ) : (
                                      <AvatarFallback className="bg-slate-600 text-white">{participant.name.charAt(0)}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <span className="text-xs mt-1 text-slate-300 truncate max-w-[50px]">{participant.name}</span>
                                  {participant.isMuted && <MicOff className="absolute -top-1 -right-1 w-4 h-4 text-red-400 bg-red-500/20 rounded-full p-0.5" />}
                                </div>
                              ))}
                              {/* Add participant button */}
                              {callParticipants.length < 11 && (
                                <button 
                                  className="flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
                                  onClick={() => setAddParticipantsOpen(true)}
                                >
                                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <span className="text-xs mt-1 text-slate-400">Ajouter</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Call controls */}
                        <div className="flex justify-center gap-4 mt-4">
                          {/* Mute button */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsCallMuted(!isCallMuted)}
                            className={`rounded-full h-14 w-14 transition-all ${isCallMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                          >
                            {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                          </Button>
                          
                          {/* Video toggle (for video calls) */}
                          {activeCall?.type === 'video' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-full h-14 w-14 bg-slate-700 text-white hover:bg-slate-600"
                            >
                              <Video className="w-6 h-6" />
                            </Button>
                          )}
                          
                          {/* Speaker button */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsCallSpeakerOn(!isCallSpeakerOn)}
                            className={`rounded-full h-14 w-14 transition-all ${isCallSpeakerOn ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                          >
                            {isCallSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                          </Button>
                          
                          {/* End call button */}
                          <Button 
                            className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30" 
                            onClick={() => { 
                              setCallDialogOpen(false); 
                              setActiveCall(null); 
                              setCallTimer(0);
                              setCallState('ended');
                              setCallParticipants([]);
                              if (callTimeoutRef.current) {
                                clearTimeout(callTimeoutRef.current);
                              }
                              toast.info('Appel terminé'); 
                            }}
                          >
                            <PhoneOff className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Add Participants Dialog for Group Calls */}
                  <Dialog open={addParticipantsOpen} onOpenChange={setAddParticipantsOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-cyan-500" />
                          Ajouter des participants
                        </DialogTitle>
                        <DialogDescription>
                          Ajoutez jusqu'à 12 participants à l'appel
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[300px] py-4">
                        <div className="space-y-2">
                          {Object.values(DEMO_USERS)
                            .filter(u => u.id !== user?.id && !callParticipants.find(p => p.id === u.id))
                            .map((u) => (
                              <div 
                                key={u.id} 
                                className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                onClick={() => {
                                  if (callParticipants.length < 11) {
                                    setCallParticipants(prev => [...prev, {
                                      id: u.id,
                                      name: u.name,
                                      avatar: u.avatar,
                                      isMuted: false,
                                      isVideoOn: true,
                                      isSpeaking: false
                                    }]);
                                    toast.success(`${u.name} ajouté à l'appel`);
                                  } else {
                                    toast.error('Maximum 12 participants atteint');
                                  }
                                }}
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-cyan-100 text-cyan-700">{u.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{u.name}</p>
                                  <p className="text-xs text-muted-foreground">{u.role}</p>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddParticipantsOpen(false)}>Fermer</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Dialog Nouvelle Conversation Individuelle */}
                  <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-cyan-500" />
                          Nouvelle discussion
                        </DialogTitle>
                        <DialogDescription>
                          Sélectionnez un collègue pour démarrer une conversation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Rechercher un contact..." 
                            className="pl-9"
                            value={newConversationSearch}
                            onChange={(e) => setNewConversationSearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {Object.values(DEMO_USERS)
                              .filter(u => u.id !== user?.id)
                              .filter(u => 
                                u.name.toLowerCase().includes(newConversationSearch.toLowerCase()) ||
                                (u.username && u.username.toLowerCase().includes(newConversationSearch.toLowerCase())) ||
                                u.email.toLowerCase().includes(newConversationSearch.toLowerCase())
                              )
                              .map((contact) => {
                                const existingConv = conversations.find(c => 
                                  c.type === 'individual' && 
                                  c.participants.some(p => p.id === contact.id)
                                );
                                const isOnline = userPresence[contact.id] === 'online';
                                
                                return (
                                  <div
                                    key={contact.id}
                                    onClick={() => {
                                      if (existingConv) {
                                        setSelectedConversation(existingConv);
                                        setConversations(prev => prev.map(c => 
                                          c.id === existingConv.id ? {...c, unreadCount: 0} : c
                                        ));
                                      } else {
                                        const newConv: Conversation = {
                                          id: generateId(),
                                          type: 'individual',
                                          participants: [
                                            { id: user?.id || '', name: user?.name || '', role: 'admin', joinedAt: new Date() },
                                            { id: contact.id, name: contact.name, avatar: contact.avatar, role: 'member', joinedAt: new Date() }
                                          ],
                                          unreadCount: 0,
                                          isPinned: false,
                                          isMuted: false,
                                          isArchived: false,
                                          createdBy: user?.id || '',
                                          createdAt: new Date(),
                                          updatedAt: new Date()
                                        };
                                        setConversations(prev => [newConv, ...prev]);
                                        setSelectedConversation(newConv);
                                      }
                                      setNewConversationOpen(false);
                                      setNewConversationSearch('');
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                  >
                                    <div className="relative">
                                      <Avatar className="w-12 h-12">
                                        {contact.avatar ? <AvatarImage src={contact.avatar} /> : null}
                                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                                          {contact.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm truncate">{contact.name}</p>
                                        {contact.shift && (
                                          <Badge variant="outline" className="text-xs" style={{ borderColor: getShiftColor(contact.shift.name), color: getShiftColor(contact.shift.name) }}>
                                            Shift {contact.shift.name}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">{contact.role.replace('_', ' ')}</p>
                                        {isOnline && <span className="text-xs text-green-600">• En ligne</span>}
                                      </div>
                                    </div>
                                    {existingConv && (
                                      <Badge variant="secondary" className="text-xs">Existant</Badge>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Dialog Paramètres Son et Fond */}
                  <Dialog open={backgroundSettingsOpen} onOpenChange={setBackgroundSettingsOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5 text-cyan-500" />
                          Paramètres du Chat
                        </DialogTitle>
                        <DialogDescription>
                          Personnalisez votre expérience de messagerie
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {/* Sound Settings */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-cyan-500" />
                            Sons
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Activer les sons</Label>
                              <Checkbox 
                                checked={soundEnabled} 
                                onCheckedChange={(checked) => setSoundEnabled(checked as boolean)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm text-muted-foreground ml-4">Son envoi message</Label>
                              <Checkbox 
                                checked={soundOnSend} 
                                onCheckedChange={(checked) => setSoundOnSend(checked as boolean)}
                                disabled={!soundEnabled}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm text-muted-foreground ml-4">Son réception message</Label>
                              <Checkbox 
                                checked={soundOnReceive} 
                                onCheckedChange={(checked) => setSoundOnReceive(checked as boolean)}
                                disabled={!soundEnabled}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm text-muted-foreground ml-4">Son notifications</Label>
                              <Checkbox 
                                checked={soundOnNotification} 
                                onCheckedChange={(checked) => setSoundOnNotification(checked as boolean)}
                                disabled={!soundEnabled}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        {/* Background Settings */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-cyan-500" />
                            Fond d'écran
                          </h4>
                          <div className="space-y-3">
                            <Button 
                              variant="outline" 
                              className="w-full justify-start gap-2"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      handleSetBackground(ev.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="w-4 h-4" />
                              Choisir une image de fond
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start gap-2 text-cyan-600"
                              onClick={() => handleSetBackground(null)}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Réinitialiser (logo par défaut)
                            </Button>
                            {/* Pattern options */}
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              <button 
                                onClick={() => handleSetBackground('pattern-dots')}
                                className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                                style={{ backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                              />
                              <button 
                                onClick={() => handleSetBackground('pattern-lines')}
                                className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00BCD4 0, #00BCD4 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}
                              />
                              <button 
                                onClick={() => handleSetBackground('pattern-grid')}
                                className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                                style={{ backgroundImage: 'linear-gradient(#00BCD4 1px, transparent 1px), linear-gradient(90deg, #00BCD4 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                              />
                              <button 
                                onClick={() => handleSetBackground('pattern-circuit')}
                                className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800 overflow-hidden"
                              >
                                <img src="/logo_noc_activities_sans_fond.png" alt="Circuit" className="w-full h-full object-contain opacity-50" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">Choisissez un motif de fond</p>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setBackgroundSettingsOpen(false)} className="bg-cyan-500 hover:bg-cyan-600">
                          Terminé
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Dialog Recadrage Photo de Profil - AMÉLIORÉ */}
                  <Dialog open={profilePhotoDialogOpen} onOpenChange={setProfilePhotoDialogOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-cyan-500" />
                          Ajuster votre photo de profil
                        </DialogTitle>
                        <DialogDescription>
                          Déplacez l'image et ajustez le zoom. La zone circulaire représente votre photo de profil finale.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {tempProfilePhoto && (
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Zone de recadrage */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Zone de recadrage</Label>
                              <div 
                                className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-move"
                                onMouseDown={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const startX = e.clientX;
                                  const startY = e.clientY;
                                  const startXPos = cropArea.x;
                                  const startYPos = cropArea.y;
                                  
                                  const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
                                    const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
                                    setCropArea(prev => ({
                                      ...prev,
                                      x: Math.max(0, Math.min(100, startXPos - deltaX)),
                                      y: Math.max(0, Math.min(100, startYPos - deltaY))
                                    }));
                                  };
                                  
                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMouseMove);
                                  document.addEventListener('mouseup', handleMouseUp);
                                }}
                              >
                                <img 
                                  src={tempProfilePhoto} 
                                  alt="Source" 
                                  className="w-full h-full object-cover"
                                  style={{
                                    transform: `scale(${cropArea.size / 50})`,
                                    transformOrigin: `${cropArea.x}% ${cropArea.y}%`
                                  }}
                                  draggable={false}
                                />
                                {/* Cercle de sélection */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-[80%] aspect-square border-4 border-white rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                                </div>
                                {/* Grille d'aide */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-[80%] aspect-square relative">
                                    <div className="absolute top-1/3 left-0 right-0 border-t border-white/30" />
                                    <div className="absolute top-2/3 left-0 right-0 border-t border-white/30" />
                                    <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/30" />
                                    <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/30" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Aperçu final */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Aperçu final</Label>
                              <div className="flex flex-col items-center gap-4">
                                <Avatar className="w-32 h-32 ring-4 ring-cyan-500 ring-offset-4">
                                  <AvatarImage 
                                    src={tempProfilePhoto} 
                                    className="object-cover"
                                    style={{
                                      transform: `scale(${cropArea.size / 50})`,
                                      transformOrigin: `${cropArea.x}% ${cropArea.y}%`
                                    }}
                                  />
                                </Avatar>
                                <Avatar className="w-20 h-20 ring-2 ring-cyan-500 ring-offset-2">
                                  <AvatarImage 
                                    src={tempProfilePhoto} 
                                    className="object-cover"
                                    style={{
                                      transform: `scale(${cropArea.size / 50})`,
                                      transformOrigin: `${cropArea.x}% ${cropArea.y}%`
                                    }}
                                  />
                                </Avatar>
                                <Avatar className="w-10 h-10 ring-1 ring-cyan-500">
                                  <AvatarImage 
                                    src={tempProfilePhoto} 
                                    className="object-cover"
                                    style={{
                                      transform: `scale(${cropArea.size / 50})`,
                                      transformOrigin: `${cropArea.x}% ${cropArea.y}%`
                                    }}
                                  />
                                </Avatar>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-6 space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label className="text-sm">Zoom</Label>
                              <span className="text-sm text-muted-foreground">{Math.round(cropArea.size * 2)}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="50" 
                              max="200" 
                              value={cropArea.size}
                              onChange={(e) => setCropArea(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                              className="w-full accent-cyan-500 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
                            />
                          </div>
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setCropArea({ x: 50, y: 50, size: 100 })}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" /> Réinitialiser
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      setTempProfilePhoto(ev.target?.result as string);
                                      setCropArea({ x: 50, y: 50, size: 100 });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="w-4 h-4 mr-1" /> Changer d'image
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setProfilePhotoDialogOpen(false); setTempProfilePhoto(null); }}>
                          Annuler
                        </Button>
                        <Button onClick={handleSaveCroppedPhoto} className="bg-cyan-500 hover:bg-cyan-600">
                          Enregistrer la photo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Create Status Dialog - AMÉLIORÉ */}
                  <Dialog open={createStatusOpen} onOpenChange={setCreateStatusOpen}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-cyan-500" />
                          Créer un status
                        </DialogTitle>
                        <DialogDescription>
                          Partagez un moment avec vos collègues (disparaît après 24h)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Media upload buttons */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 gap-2"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setStatusMediaPreview(ev.target?.result as string);
                                    setStatusMediaType('image');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                          >
                            <ImageIcon className="w-4 h-4 text-purple-500" /> Image
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 gap-2"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'video/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setStatusMediaPreview(ev.target?.result as string);
                                    setStatusMediaType('video');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                          >
                            <Film className="w-4 h-4 text-red-500" /> Vidéo
                          </Button>
                        </div>
                        
                        {/* Media preview */}
                        {statusMediaPreview && (
                          <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                            {statusMediaType === 'image' ? (
                              <img src={statusMediaPreview} alt="Preview" className="w-full max-h-[200px] object-contain" />
                            ) : (
                              <video src={statusMediaPreview} controls className="w-full max-h-[200px]" />
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                              onClick={() => {
                                setStatusMediaPreview(null);
                                setStatusMediaType(null);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Caption */}
                        <div className="space-y-2">
                          <Label>Légende (optionnel)</Label>
                          <Textarea 
                            value={statusCaption}
                            onChange={(e) => setStatusCaption(e.target.value)}
                            placeholder="Ajouter une légende..."
                            className="resize-none"
                            rows={2}
                          />
                        </div>
                        
                        {/* Privacy settings - Who can see */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Visibilité</Label>
                            <span className="text-xs text-muted-foreground">
                              {statusBlockedContacts.length === 0 
                                ? 'Tous les contacts' 
                                : `${Object.values(DEMO_USERS).filter(u => u.id !== user?.id).length - statusBlockedContacts.length} contact(s)`
                              }
                            </span>
                          </div>
                          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                            <p className="text-xs text-muted-foreground mb-2">Exclure des contacts:</p>
                            {Object.values(DEMO_USERS)
                              .filter(u => u.id !== user?.id)
                              .map((contact) => (
                                <label 
                                  key={contact.id}
                                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                                >
                                  <Checkbox 
                                    checked={statusBlockedContacts.includes(contact.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setStatusBlockedContacts(prev => [...prev, contact.id]);
                                      } else {
                                        setStatusBlockedContacts(prev => prev.filter(id => id !== contact.id));
                                      }
                                    }}
                                  />
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">
                                      {contact.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{contact.name}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Annuler</Button>
                        </DialogClose>
                        <Button 
                          className="bg-cyan-500 hover:bg-cyan-600"
                          disabled={!statusMediaPreview}
                          onClick={() => {
                            if (statusMediaPreview && user) {
                              const newStatus = {
                                id: generateId(),
                                userId: user.id,
                                userName: user.name,
                                userAvatar: user.avatar,
                                mediaUrl: statusMediaPreview,
                                mediaType: statusMediaType as 'image' | 'video',
                                caption: statusCaption,
                                createdAt: new Date(),
                                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                                views: [],
                                likes: [],
                                blockedUsers: statusBlockedContacts
                              };
                              setStatusList(prev => [newStatus, ...prev]);
                              setStatusMediaPreview(null);
                              setStatusMediaType(null);
                              setStatusCaption('');
                              setStatusBlockedContacts([]);
                              setCreateStatusOpen(false);
                              toast.success('Status publié', { description: 'Il sera visible pendant 24 heures' });
                            }
                          }}
                        >
                          Publier
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* My Statuses Dialog - VOIR ET SUPPRIMER MES STATUTS */}
                  <Dialog open={myStatusesOpen} onOpenChange={setMyStatusesOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <EyeIcon className="w-5 h-5 text-cyan-500" />
                          Mes statuts
                        </DialogTitle>
                        <DialogDescription>
                          Gérez vos statuts publiés (disparaissent après 24h)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {statusList.filter(s => s.userId === user?.id).length === 0 ? (
                          <div className="text-center py-8">
                            <Camera className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-muted-foreground">Aucun statut publié</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => {
                                setMyStatusesOpen(false);
                                setCreateStatusOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Créer un statut
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {statusList
                              .filter(s => s.userId === user?.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((status) => {
                                const timeLeft = Math.max(0, 24 - Math.floor((Date.now() - new Date(status.createdAt).getTime()) / (1000 * 60 * 60)));
                                return (
                                  <div key={status.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                      {status.mediaType === 'image' ? (
                                        <img src={status.mediaUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <video src={status.mediaUrl} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(status.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                                      </p>
                                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                                        Expire dans {timeLeft}h
                                      </p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <EyeIcon className="w-3 h-3" /> {status.views.length}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Heart className="w-3 h-3" /> {status.likes.length}
                                        </span>
                                      </div>
                                      {status.caption && (
                                        <p className="text-sm mt-1 truncate">{status.caption}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setViewingUserStatuses([status]);
                                          setViewingStatusIndex(0);
                                          setViewingStatus(status);
                                          setMyStatusesOpen(false);
                                          setStatusViewOpen(true);
                                        }}
                                      >
                                        <EyeIcon className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => {
                                          setStatusList(prev => prev.filter(s => s.id !== status.id));
                                          toast.success('Statut supprimé');
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setMyStatusesOpen(false)}>
                          Fermer
                        </Button>
                        <Button 
                          className="bg-cyan-500 hover:bg-cyan-600"
                          onClick={() => {
                            setMyStatusesOpen(false);
                            setCreateStatusOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Nouveau statut
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* View Status Dialog - AMÉLIORÉ */}
                  <Dialog open={statusViewOpen} onOpenChange={setStatusViewOpen}>
                    <DialogContent className="max-w-lg p-0 bg-black border-0 h-[85vh] max-h-[85vh]">
                      {viewingStatus && (
                        <div className="relative h-full flex flex-col">
                          {/* Progress bar for multiple statuses */}
                          {viewingUserStatuses.length > 1 && (
                            <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
                              {viewingUserStatuses.map((_, idx) => (
                                <div 
                                  key={idx} 
                                  className={`h-1 flex-1 rounded-full ${idx <= viewingStatusIndex ? 'bg-white' : 'bg-white/30'}`}
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Header */}
                          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
                              <Avatar className="w-8 h-8">
                                {viewingStatus.userAvatar ? (
                                  <AvatarImage src={viewingStatus.userAvatar} />
                                ) : null}
                                <AvatarFallback className="bg-cyan-500 text-white">
                                  {viewingStatus.userName?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-white">
                                <p className="text-sm font-medium">{viewingStatus.userName}</p>
                                <p className="text-xs text-white/70">
                                  {format(viewingStatus.createdAt, 'HH:mm')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* View details button */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-white hover:bg-black/50"
                                onClick={() => setShowStatusDetails(!showStatusDetails)}
                                title="Voir les détails"
                              >
                                <Users className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-white hover:bg-black/50"
                                onClick={() => setStatusViewOpen(false)}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Media */}
                          <div className="flex-1 flex items-center justify-center bg-black">
                            {viewingStatus.mediaType === 'image' ? (
                              <img 
                                src={viewingStatus.mediaUrl} 
                                alt="Status" 
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <video 
                                src={viewingStatus.mediaUrl} 
                                controls 
                                autoPlay
                                className="max-w-full max-h-full"
                              />
                            )}
                          </div>
                          
                          {/* Caption */}
                          {viewingStatus.caption && (
                            <div className="absolute bottom-20 left-4 right-4 z-10">
                              <p className="text-white text-center text-lg bg-black/50 rounded-lg px-4 py-2">
                                {viewingStatus.caption}
                              </p>
                            </div>
                          )}
                          
                          {/* Footer with views, likes and action */}
                          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-black/30 rounded-full px-4 py-2">
                            <div className="flex items-center gap-4">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="flex items-center gap-1 text-white/70 hover:text-white">
                                    <EyeIcon className="w-4 h-4" />
                                    <span className="text-sm">{viewingStatus.views.length}</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0 bg-slate-900 border-slate-700">
                                  <div className="p-3 border-b border-slate-700">
                                    <p className="font-medium text-white text-sm">Vues ({viewingStatus.views.length})</p>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {viewingStatus.views.length === 0 ? (
                                      <p className="text-slate-400 text-sm p-3 text-center">Aucune vue</p>
                                    ) : (
                                      viewingStatus.views.map((view, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 hover:bg-slate-800">
                                          <Avatar className="w-6 h-6">
                                            <AvatarFallback className="bg-cyan-600 text-white text-xs">
                                              {view.userId?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm text-white">{view.userId}</span>
                                          <span className="text-xs text-slate-400 ml-auto">
                                            {format(new Date(view.viewedAt), 'HH:mm')}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="flex items-center gap-1 text-white/70 hover:text-white">
                                    <Heart className="w-4 h-4" />
                                    <span className="text-sm">{viewingStatus.likes.length}</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0 bg-slate-900 border-slate-700">
                                  <div className="p-3 border-b border-slate-700">
                                    <p className="font-medium text-white text-sm">J'aime ({viewingStatus.likes.length})</p>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {viewingStatus.likes.length === 0 ? (
                                      <p className="text-slate-400 text-sm p-3 text-center">Aucun like</p>
                                    ) : (
                                      viewingStatus.likes.map((like, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 hover:bg-slate-800">
                                          <Avatar className="w-6 h-6">
                                            <AvatarFallback className="bg-pink-600 text-white text-xs">
                                              {like.userName?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm text-white">{like.userName}</span>
                                          {like.userId === user?.id && (
                                            <Badge variant="secondary" className="text-xs">Vous</Badge>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-white hover:bg-white/20 rounded-full"
                              onClick={() => {
                                // Toggle like - NOW ALLOWS LIKING OWN STATUS
                                const isLiked = viewingStatus.likes.some(l => l.userId === user?.id);
                                setStatusList(prev => prev.map(s => 
                                  s.id === viewingStatus.id 
                                    ? {
                                        ...s, 
                                        likes: isLiked 
                                          ? s.likes.filter(l => l.userId !== user?.id)
                                          : [...s.likes, { userId: user?.id || '', userName: user?.name || '' }]
                                      }
                                    : s
                                ));
                                setViewingStatus(prev => prev ? {
                                  ...prev,
                                  likes: isLiked 
                                    ? prev.likes.filter(l => l.userId !== user?.id)
                                    : [...prev.likes, { userId: user?.id || '', userName: user?.name || '' }]
                                } : null);
                                if (!isLiked) {
                                  toast.success('Vous aimez ce statut');
                                }
                              }}
                            >
                              <Heart className={`w-5 h-5 mr-1 ${viewingStatus.likes.some(l => l.userId === user?.id) ? 'fill-red-500 text-red-500' : ''}`} />
                              J'aime
                            </Button>
                          </div>
                          
                          {/* Navigation arrows for multiple statuses */}
                          {viewingUserStatuses.length > 1 && (
                            <>
                              {viewingStatusIndex > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 z-20"
                                  onClick={() => {
                                    const newIndex = viewingStatusIndex - 1;
                                    setViewingStatusIndex(newIndex);
                                    setViewingStatus(viewingUserStatuses[newIndex]);
                                  }}
                                >
                                  <ChevronLeft className="w-6 h-6" />
                                </Button>
                              )}
                              {viewingStatusIndex < viewingUserStatuses.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 z-20"
                                  onClick={() => {
                                    const newIndex = viewingStatusIndex + 1;
                                    setViewingStatusIndex(newIndex);
                                    setViewingStatus(viewingUserStatuses[newIndex]);
                                  }}
                                >
                                  <ChevronRight className="w-6 h-6" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}
              
              {/* Tasks - Module Professionnel */}
              {currentTab === 'tasks' && (
                <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-blue-600" />
                        Mes Tâches Journalières
                      </h1>
                      <p className="text-muted-foreground">Gestion intelligente et supervisée des tâches NOC</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                            <Plus className="w-4 h-4" /> Nouvelle tâche
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <ClipboardList className="w-5 h-5 text-blue-600" />
                              Créer une nouvelle tâche
                            </DialogTitle>
                            <DialogDescription>
                              Remplissez les détails de votre tâche
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="task-title">Titre *</Label>
                              <Input 
                                id="task-title" 
                                placeholder="Titre de la tâche"
                                value={newTask.title}
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="task-desc">Description</Label>
                              <Textarea 
                                id="task-desc" 
                                placeholder="Description détaillée..."
                                value={newTask.description}
                                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Priorité</Label>
                                <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v as TaskPriority})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">🟢 Faible</SelectItem>
                                    <SelectItem value="medium">🔵 Moyenne</SelectItem>
                                    <SelectItem value="high">🟠 Haute</SelectItem>
                                    <SelectItem value="critical">🔴 Critique</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Catégorie</Label>
                                <Select value={newTask.category} onValueChange={(v) => setNewTask({...newTask, category: v as TaskCategory})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="incident">🚨 Incident</SelectItem>
                                    <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                                    <SelectItem value="surveillance">👁️ Surveillance</SelectItem>
                                    <SelectItem value="administrative">📋 Administratif</SelectItem>
                                    <SelectItem value="other">📌 Autre</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Durée estimée (minutes)</Label>
                                <Select value={newTask.estimatedDuration.toString()} onValueChange={(v) => setNewTask({...newTask, estimatedDuration: parseInt(v)})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="15">15 min</SelectItem>
                                    <SelectItem value="30">30 min</SelectItem>
                                    <SelectItem value="45">45 min</SelectItem>
                                    <SelectItem value="60">1 heure</SelectItem>
                                    <SelectItem value="90">1h30</SelectItem>
                                    <SelectItem value="120">2 heures</SelectItem>
                                    <SelectItem value="180">3 heures</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Heure de début</Label>
                                <Input 
                                  type="time"
                                  value={format(newTask.startTime, 'HH:mm')}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':');
                                    const newStartTime = new Date();
                                    newStartTime.setHours(parseInt(hours), parseInt(minutes));
                                    setNewTask({...newTask, startTime: newStartTime});
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>Tags (séparés par des virgules)</Label>
                              <Input 
                                placeholder="urgent, client, réseau..."
                                value={newTask.tags}
                                onChange={(e) => setNewTask({...newTask, tags: e.target.value})}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                            <Button onClick={() => {
                              if (!newTask.title.trim()) {
                                toast.error('Erreur', { description: 'Le titre est obligatoire' });
                                return;
                              }
                              const task = createNewTask(
                                user?.id || '',
                                user?.name || '',
                                {
                                  title: newTask.title,
                                  description: newTask.description,
                                  priority: newTask.priority,
                                  category: newTask.category,
                                  estimatedDuration: newTask.estimatedDuration,
                                  startTime: newTask.startTime,
                                  tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean)
                                },
                                user?.shift?.name
                              );
                              setNocTasks(prev => [task, ...prev]);
                              setNewTask({
                                title: '',
                                description: '',
                                priority: 'medium',
                                category: 'other',
                                startTime: new Date(),
                                estimatedDuration: 60,
                                tags: ''
                              });
                              setTaskDialogOpen(false);
                              toast.success('Tâche créée', { description: 'La tâche a été ajoutée à votre liste' });
                            }}>
                              Créer la tâche
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <Card className="p-3 border-l-4 border-l-yellow-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">En attente</span>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {nocTasks.filter(t => t.status === 'pending' && t.userId === user?.id).length}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                      <Card className="p-3 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">En cours</span>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {nocTasks.filter(t => t.status === 'in_progress' && t.userId === user?.id).length}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <Card className="p-3 border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Terminées</span>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {nocTasks.filter(t => t.status === 'completed' && t.userId === user?.id).length}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <Card className="p-3 border-l-4 border-l-red-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">En retard</span>
                          </div>
                          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {nocTasks.filter(t => (t.status === 'late' || t.isOverdue) && t.userId === user?.id).length}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <Card className="p-3 border-l-4 border-l-orange-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Pause className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-muted-foreground">Suspendues</span>
                          </div>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            {nocTasks.filter(t => t.status === 'on_hold' && t.userId === user?.id).length}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Filters */}
                  <Card className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Rechercher une tâche..." 
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select value={taskFilter} onValueChange={(v) => setTaskFilter(v as typeof taskFilter)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filtrer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="my">📋 Mes tâches</SelectItem>
                            <SelectItem value="all">👥 Toutes</SelectItem>
                            <SelectItem value="pending">⏳ En attente</SelectItem>
                            <SelectItem value="late">🔴 En retard</SelectItem>
                            <SelectItem value="critical">⚡ Critiques</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  {/* Tasks List */}
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Liste des tâches
                        {nocTasks.length > 0 && (
                          <Badge variant="outline" className="ml-2">{nocTasks.length}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <ScrollArea className="h-[400px]">
                        {nocTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="font-medium text-lg mb-2">Aucune tâche</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                              Commencez par créer votre première tâche
                            </p>
                            <Button onClick={() => setTaskDialogOpen(true)}>
                              <Plus className="w-4 h-4 mr-2" /> Créer une tâche
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sortTasksByPriority(
                              nocTasks.filter(t => {
                                if (taskFilter === 'my') return t.userId === user?.id;
                                if (taskFilter === 'pending') return t.status === 'pending';
                                if (taskFilter === 'late') return t.status === 'late' || t.isOverdue;
                                if (taskFilter === 'critical') return t.priority === 'critical';
                                return true;
                              }).filter(t => 
                                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.description.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                            ).map((task, index) => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                                  task.isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10' :
                                  task.status === 'completed' ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' :
                                  'border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <Checkbox 
                                  checked={task.status === 'completed'} 
                                  onCheckedChange={(checked) => {
                                    setNocTasks(prev => prev.map(t => t.id === task.id ? { 
                                      ...t, 
                                      status: checked ? 'completed' : 'pending', 
                                      completedAt: checked ? new Date() : undefined,
                                      actualDuration: checked ? calculateActualDuration(t) : undefined
                                    } : t));
                                    toast.success(checked ? 'Tâche terminée ✓' : 'Tâche réactivée');
                                  }} 
                                  className="mt-1" 
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                      {task.title}
                                    </span>
                                    <Badge className={`${TASK_PRIORITIES[task.priority].bgColor} ${TASK_PRIORITIES[task.priority].color} text-xs`}>
                                      {TASK_PRIORITIES[task.priority].label}
                                    </Badge>
                                    <span className="text-lg">{TASK_CATEGORIES[task.category].icon}</span>
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <Badge className={`${TASK_STATUSES[task.status].bgColor} ${TASK_STATUSES[task.status].color}`}>
                                      {TASK_STATUSES[task.status].label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock3 className="w-3 h-3" />
                                      {format(task.startTime, 'HH:mm')} - {format(task.estimatedEndTime, 'HH:mm')}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      ⏱ {formatDuration(task.estimatedDuration)}
                                    </span>
                                    {task.tags.length > 0 && (
                                      <div className="flex gap-1">
                                        {task.tags.slice(0, 3).map((tag, i) => (
                                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                                    <>
                                      {task.status === 'pending' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => {
                                            setNocTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'in_progress'} : t));
                                            toast.info('Tâche démarrée');
                                          }}
                                        >
                                          <Play className="w-4 h-4 text-blue-600" />
                                        </Button>
                                      )}
                                      {task.status === 'in_progress' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => {
                                            setNocTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'on_hold'} : t));
                                            toast.warning('Tâche suspendue');
                                          }}
                                        >
                                          <Pause className="w-4 h-4 text-orange-600" />
                                        </Button>
                                      )}
                                      {task.status === 'on_hold' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => {
                                            setNocTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'in_progress'} : t));
                                            toast.info('Tâche reprise');
                                          }}
                                        >
                                          <Play className="w-4 h-4 text-green-600" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setTaskDetailOpen(true);
                                    }}
                                  >
                                    <Info className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Supprimer cette tâche ?')) {
                                        setNocTasks(prev => prev.filter(t => t.id !== task.id));
                                        toast.success('Tâche supprimée');
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Performance Summary */}
                  {nocTasks.length > 0 && user && (
                    <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          Ma performance du jour
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        {(() => {
                          const perf = calculateAgentPerformance(nocTasks, user.id, user.name, 'daily', 0, user.shift?.name);
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{perf.productivityRate}%</p>
                                <p className="text-sm text-muted-foreground">Productivité</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{perf.onTimeRate}%</p>
                                <p className="text-sm text-muted-foreground">À l'heure</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-cyan-600">{perf.tasksCompleted}/{perf.tasksCreated}</p>
                                <p className="text-sm text-muted-foreground">Tâches</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-2xl">{BADGE_CONFIG[perf.badge || 'needs_attention']?.icon}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{BADGE_CONFIG[perf.badge || 'needs_attention']?.label}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
              
              {/* Activities */}
              {currentTab === 'activities' && (
                <motion.div key="activities" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold">Suivi des Activités</h1>
                      <p className="text-muted-foreground">Enregistrez vos actions NOC</p>
                    </div>
                    <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" /> Nouvelle activité
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enregistrer une activité</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Catégorie</Label>
                            <Select value={newActivity.category} onValueChange={(v) => setNewActivity({ ...newActivity, category: v, type: '' })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Monitoring">Monitoring</SelectItem>
                                <SelectItem value="Call Center">Call Center</SelectItem>
                                <SelectItem value="Reporting 1">Reporting 1</SelectItem>
                                <SelectItem value="Reporting 2">Reporting 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={newActivity.type} onValueChange={(v) => setNewActivity({ ...newActivity, type: v })}>
                              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                              <SelectContent>
                                {ACTIVITY_TYPES[newActivity.category]?.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                          <Button onClick={() => {
                            if (newActivity.type && user) {
                              const activity: ActivityLog = {
                                id: `act-${Date.now()}`,
                                userId: user.id,
                                userName: user.name,
                                type: newActivity.type,
                                category: newActivity.category,
                                description: newActivity.description,
                                createdAt: new Date()
                              };
                              setActivities(prev => [activity, ...prev]);
                              setNewActivity({ type: '', category: 'Monitoring', description: '' });
                              setActivityDialogOpen(false);
                              toast.success('Activité enregistrée');
                            }
                          }}>Enregistrer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">Historique</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <ScrollArea className="h-[400px]">
                        <div className="relative">
                          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                          <div className="space-y-4">
                            {activities.map(activity => (
                              <div key={activity.id} className="relative pl-8">
                                <div className="absolute left-1.5 top-2 w-4 h-4 rounded-full bg-background border-2" style={{ borderColor: user?.shift?.colorCode || '#3B82F6' }} />
                                <Card className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{activity.userName}</span>
                                        <Badge variant="outline" className="text-xs">{activity.category}</Badge>
                                      </div>
                                      <p className="text-sm mt-1">{activity.description}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0">{format(activity.createdAt, 'HH:mm')}</span>
                                  </div>
                                </Card>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              {/* Gmail Clone - Messagerie Interne */}
              {currentTab === 'messagerie' && (
                <motion.div key="messagerie" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-[calc(100vh-7rem)]">
                  <div className="flex h-full rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg relative">
                    {/* Mobile Sidebar Overlay */}
                    {mobileSidebarOpen && (
                      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
                    )}
                    
                    {/* Sidebar Gmail */}
                    <div className={`
                      fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
                      w-64 border-r bg-white dark:bg-slate-900 flex flex-col
                      transform transition-transform duration-300 ease-in-out
                      ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                      ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
                    `}>
                      {/* Compose Button */}
                      <div className="p-3">
                        <Button 
                          className={`w-full justify-start gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-md ${sidebarCollapsed ? 'lg:px-2' : ''}`}
                          onClick={() => {
                            setComposeOpen(true);
                            setReplyToMessage(null);
                            setForwardMessage(null);
                            setNewEmail({
                              to: [],
                              cc: [],
                              bcc: [],
                              subject: '',
                              body: '',
                              attachments: [],
                              priority: 'normal',
                              scheduledAt: null
                            });
                            setComposeMinimized(false);
                            setComposeMaximized(false);
                          }}
                        >
                          <Plus className="w-5 h-5" />
                          {!sidebarCollapsed && <span>Nouveau message</span>}
                        </Button>
                      </div>
                      
                      <ScrollArea className="flex-1">
                        <nav className="px-2 py-1 space-y-0.5">
                          {/* Primary Folders */}
                          {[
                            { folder: 'inbox' as MessageFolder, icon: Inbox, label: 'Boîte de réception', count: messages.filter(m => m.folder === 'inbox' && !m.isRead).length },
                            { folder: 'starred' as MessageFolder, icon: Star, label: 'Suivis', count: messages.filter(m => m.isStarred).length },
                          ].map((item) => (
                            <button
                              key={item.folder}
                              onClick={() => {
                                setCurrentFolder(item.folder);
                                setSelectedMessage(null);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors ${
                                currentFolder === item.folder 
                                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {item.count > 0 && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{item.count}</Badge>
                                  )}
                                </>
                              )}
                            </button>
                          ))}
                          
                          {/* Snoozed */}
                          <button
                            onClick={() => {
                              setCurrentFolder('inbox');
                              setSelectedMessage(null);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors ${
                              false ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 font-medium' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Clock className="w-5 h-5 flex-shrink-0" />
                            {!sidebarCollapsed && (
                              <>
                                <span className="flex-1 text-left">En attente</span>
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{snoozedEmails.size}</Badge>
                              </>
                            )}
                          </button>
                          
                          {/* Other Folders */}
                          {[
                            { folder: 'sent' as MessageFolder, icon: Send, label: 'Envoyés', count: messages.filter(m => m.folder === 'sent').length },
                            { folder: 'drafts' as MessageFolder, icon: FileText, label: 'Brouillons', count: messages.filter(m => m.folder === 'drafts').length },
                            { folder: 'spam' as MessageFolder, icon: AlertTriangle, label: 'Spam', count: messages.filter(m => m.folder === 'spam').length },
                            { folder: 'trash' as MessageFolder, icon: Trash2, label: 'Corbeille', count: messages.filter(m => m.folder === 'trash').length },
                          ].map((item) => (
                            <button
                              key={item.folder}
                              onClick={() => {
                                setCurrentFolder(item.folder);
                                setSelectedMessage(null);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors ${
                                currentFolder === item.folder 
                                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {item.count > 0 && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{item.count}</Badge>
                                  )}
                                </>
                              )}
                            </button>
                          ))}
                        </nav>
                        
                        {/* Labels Section */}
                        {!sidebarCollapsed && (
                          <div className="px-3 py-2 border-t mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground">Libellés</p>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setLabelDialogOpen(true)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            {emailLabels.map((label) => (
                              <button
                                key={label.id}
                                onClick={() => {
                                  // Filter by label - simplified
                                  setMobileSidebarOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                                <span className="truncate">{label.name}</span>
                              </button>
                            ))}
                            {emailLabels.length === 0 && (
                              <p className="text-xs text-muted-foreground px-2">Aucun libellé</p>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                      
                      {/* Sidebar Footer */}
                      {!sidebarCollapsed && (
                        <div className="p-3 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{messages.filter(m => m.folder === 'inbox').length} messages</span>
                            <span>•</span>
                            <span>{messages.filter(m => m.folder === 'inbox' && !m.isRead).length} non lus</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Top Bar */}
                      <div className="h-14 border-b bg-white dark:bg-slate-900 flex items-center gap-2 px-2 lg:px-4">
                        {/* Mobile Menu & Checkbox */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="lg:hidden"
                          onClick={() => setMobileSidebarOpen(true)}
                        >
                          <Menu className="w-5 h-5" />
                        </Button>
                        
                        {/* Select All Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-1 cursor-pointer">
                              <Checkbox 
                                checked={selectedMessages.size === getFilteredMessages().length && getFilteredMessages().length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMessages(new Set(getFilteredMessages().map(m => m.id)));
                                  } else {
                                    setSelectedMessages(new Set());
                                  }
                                }}
                              />
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().map(m => m.id)))}>
                              Tout sélectionner
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set())}>
                              Tout désélectionner
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter(m => !m.isRead).map(m => m.id)))}>
                              Non lus
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter(m => m.isRead).map(m => m.id)))}>
                              Lus
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter(m => m.isStarred).map(m => m.id)))}>
                              Suivis
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter(m => !m.isStarred).map(m => m.id)))}>
                              Non suivis
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Refresh */}
                        <Button variant="ghost" size="sm" onClick={() => toast.success('Messages actualisés')}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        
                        {/* Bulk Actions */}
                        {selectedMessages.size > 0 && (
                          <div className="flex items-center gap-1 border-l pl-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setMessages(prev => prev.map(m => selectedMessages.has(m.id) ? {...m, folder: 'trash'} : m));
                              setSelectedMessages(new Set());
                              toast.success(`${selectedMessages.size} message(s) supprimé(s)`);
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setMessages(prev => prev.map(m => selectedMessages.has(m.id) ? {...m, isRead: true} : m));
                              setSelectedMessages(new Set());
                              toast.success('Messages marqués comme lus');
                            }}>
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setMessages(prev => prev.map(m => selectedMessages.has(m.id) ? {...m, folder: 'spam'} : m));
                              setSelectedMessages(new Set());
                              toast.success('Messages signalés comme spam');
                            }}>
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setMessages(prev => prev.map(m => selectedMessages.has(m.id) ? {...m, isStarred: true} : m));
                              setSelectedMessages(new Set());
                              toast.success('Messages suivis');
                            }}>
                              <Star className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Search Bar */}
                        <div className="flex-1 max-w-2xl relative">
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 gap-2">
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder="Rechercher dans les messages..."
                              value={messageSearchQuery}
                              onChange={(e) => setMessageSearchQuery(e.target.value)}
                              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-6 px-0"
                            />
                            <DropdownMenu open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-80 p-4">
                                <div className="space-y-3">
                                  <div className="grid gap-2">
                                    <Label className="text-xs">De</Label>
                                    <Input 
                                      placeholder="Expéditeur..." 
                                      value={advancedSearchFilters.from}
                                      onChange={(e) => setAdvancedSearchFilters(prev => ({...prev, from: e.target.value}))}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label className="text-xs">À</Label>
                                    <Input 
                                      placeholder="Destinataire..." 
                                      value={advancedSearchFilters.to}
                                      onChange={(e) => setAdvancedSearchFilters(prev => ({...prev, to: e.target.value}))}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label className="text-xs">Objet</Label>
                                    <Input 
                                      placeholder="Objet..." 
                                      value={advancedSearchFilters.subject}
                                      onChange={(e) => setAdvancedSearchFilters(prev => ({...prev, subject: e.target.value}))}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      checked={advancedSearchFilters.hasAttachment}
                                      onCheckedChange={(checked) => setAdvancedSearchFilters(prev => ({...prev, hasAttachment: !!checked}))}
                                    />
                                    <Label className="text-xs">Avec pièce jointe</Label>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => setAdvancedSearchOpen(false)} className="flex-1">
                                      Rechercher
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => {
                                      setAdvancedSearchFilters({ from: '', to: '', subject: '', hasAttachment: false, beforeDate: null, afterDate: null });
                                    }}>
                                      Effacer
                                    </Button>
                                  </div>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {/* Right Actions */}
                        <div className="flex items-center gap-1">
                          {/* Density Toggle */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Affichage</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDisplayDensity('compact')}>
                                <div className="flex items-center gap-2">
                                  {displayDensity === 'compact' && <Check className="w-4 h-4" />}
                                  <span className={displayDensity === 'compact' ? '' : 'ml-6'}>Compact</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDisplayDensity('default')}>
                                <div className="flex items-center gap-2">
                                  {displayDensity === 'default' && <Check className="w-4 h-4" />}
                                  <span className={displayDensity === 'default' ? '' : 'ml-6'}>Par défaut</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDisplayDensity('comfortable')}>
                                <div className="flex items-center gap-2">
                                  {displayDensity === 'comfortable' && <Check className="w-4 h-4" />}
                                  <span className={displayDensity === 'comfortable' ? '' : 'ml-6'}>Confortable</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setGmailSettingsOpen(true)}>
                                <Settings className="w-4 h-4 mr-2" />
                                Paramètres
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* Notifications */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="relative">
                                <Bell className="w-4 h-4" />
                                {messages.filter(m => m.folder === 'inbox' && !m.isRead).length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                    {messages.filter(m => m.folder === 'inbox' && !m.isRead).length}
                                  </span>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <ScrollArea className="h-60">
                                {messages.filter(m => m.folder === 'inbox' && !m.isRead).slice(0, 5).map(msg => (
                                  <DropdownMenuItem key={msg.id} className="flex flex-col items-start gap-1 py-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">{msg.from.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm truncate">{msg.from.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate pl-8">{msg.subject || '(Sans objet)'}</p>
                                  </DropdownMenuItem>
                                ))}
                                {messages.filter(m => m.folder === 'inbox' && !m.isRead).length === 0 && (
                                  <div className="p-4 text-center text-muted-foreground text-sm">
                                    Aucune nouvelle notification
                                  </div>
                                )}
                              </ScrollArea>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* User Avatar */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="rounded-full">
                                <Avatar className="h-7 w-7">
                                  {user?.avatar ? (
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                                    {user?.name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                <div className="flex flex-col">
                                  <span>{user?.name}</span>
                                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                                </div>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setGmailSettingsOpen(true)}>
                                <Settings className="w-4 h-4 mr-2" />
                                Paramètres
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                                <User className="w-4 h-4 mr-2" />
                                Mon profil
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Déconnexion
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Email List or Detail View */}
                      <ScrollArea className="flex-1">
                        {selectedMessage ? (
                          /* Email Detail View */
                          <div className="p-4 lg:p-6 max-w-4xl mx-auto">
                            {/* Header Actions */}
                            <div className="flex items-center gap-2 mb-4">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                              </Button>
                              <div className="flex-1" />
                              <Button variant="ghost" size="sm" onClick={() => {
                                const isArchived = selectedMessage.folder === 'archived';
                                setMessages(prev => prev.map(m => m.id === selectedMessage.id ? {...m, folder: isArchived ? 'inbox' : 'archived'} : m));
                                toast.success(isArchived ? 'Message désarchivé' : 'Message archivé');
                              }}>
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setMessages(prev => prev.map(m => m.id === selectedMessage.id ? {...m, isStarred: !m.isStarred} : m));
                                setSelectedMessage({...selectedMessage, isStarred: !selectedMessage.isStarred});
                              }}>
                                <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                const isImportant = importantEmails.has(selectedMessage.id);
                                const newImportant = new Set(importantEmails);
                                if (isImportant) {
                                  newImportant.delete(selectedMessage.id);
                                } else {
                                  newImportant.add(selectedMessage.id);
                                }
                                setImportantEmails(newImportant);
                                toast.success(isImportant ? 'Marqué comme non important' : 'Marqué comme important');
                              }}>
                                <AlertCircle className={`w-4 h-4 ${importantEmails.has(selectedMessage.id) ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setReplyToMessage(selectedMessage);
                                setComposeOpen(true);
                              }}>
                                <Reply className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setForwardMessage(selectedMessage);
                                setComposeOpen(true);
                              }}>
                                <Forward className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setReplyToMessage(selectedMessage);
                                    setComposeOpen(true);
                                  }}>
                                    <Reply className="w-4 h-4 mr-2" /> Répondre
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setForwardMessage(selectedMessage);
                                    setComposeOpen(true);
                                  }}>
                                    <Forward className="w-4 h-4 mr-2" /> Transférer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    const snoozeDate = new Date(Date.now() + 3600000);
                                    setSnoozedEmails(prev => new Map(prev).set(selectedMessage.id, snoozeDate));
                                    toast.success('Message reporté à ' + format(snoozeDate, 'HH:mm'));
                                  }}>
                                    <Clock className="w-4 h-4 mr-2" /> Reporter
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setLabelDialogOpen(true)}>
                                    <Tag className="w-4 h-4 mr-2" /> Ajouter un libellé
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setMessages(prev => prev.map(m => m.id === selectedMessage.id ? {...m, folder: 'trash'} : m));
                                    setSelectedMessage(null);
                                    toast.success('Message supprimé');
                                  }} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {/* Email Card */}
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-xl">{selectedMessage.subject || '(Sans objet)'}</CardTitle>
                                <div className="flex items-start gap-3 mt-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                                      {selectedMessage.from.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{selectedMessage.from.name}</span>
                                      <span className="text-sm text-muted-foreground">&lt;{selectedMessage.from.email}&gt;</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                      <span>À: {selectedMessage.to.map(t => t.name).join(', ')}</span>
                                      {selectedMessage.cc.length > 0 && (
                                        <span>Cc: {selectedMessage.cc.map(c => c.name).join(', ')}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground text-right">
                                    <p>{selectedMessage.sentAt ? format(selectedMessage.sentAt, 'd MMMM yyyy', { locale: fr }) : format(selectedMessage.createdAt, 'd MMMM yyyy', { locale: fr })}</p>
                                    <p>{selectedMessage.sentAt ? format(selectedMessage.sentAt, 'HH:mm') : format(selectedMessage.createdAt, 'HH:mm')}</p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap mt-4">
                                  {selectedMessage.body}
                                </div>
                                {selectedMessage.attachments.length > 0 && (
                                  <div className="mt-6 pt-4 border-t">
                                    <p className="text-sm font-medium text-muted-foreground mb-3">
                                      <Paperclip className="w-4 h-4 inline mr-2" />
                                      Pièces jointes ({selectedMessage.attachments.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {selectedMessage.attachments.map((att) => (
                                        <div key={att.id} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                                          <File className="w-8 h-8 text-cyan-500" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{att.fileName}</p>
                                            <p className="text-xs text-muted-foreground">{(att.fileSize / 1024).toFixed(1)} KB</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                            
                            {/* Reply Section */}
                            <div className="mt-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  className="flex-1 justify-start gap-2"
                                  onClick={() => {
                                    setReplyToMessage(selectedMessage);
                                    setComposeOpen(true);
                                  }}
                                >
                                  <Reply className="w-4 h-4" /> Répondre
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex-1 justify-start gap-2"
                                  onClick={() => {
                                    setReplyToMessage(selectedMessage);
                                    setComposeOpen(true);
                                  }}
                                >
                                  <Users className="w-4 h-4" /> Répondre à tous
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex-1 justify-start gap-2"
                                  onClick={() => {
                                    setForwardMessage(selectedMessage);
                                    setComposeOpen(true);
                                  }}
                                >
                                  <Forward className="w-4 h-4" /> Transférer
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Email List */
                          <div className="divide-y">
                            {getFilteredMessages()
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((msg) => {
                                const isSnoozed = snoozedEmails.has(msg.id);
                                const isImportant = importantEmails.has(msg.id);
                                const rowHeight = displayDensity === 'compact' ? 'py-2' : displayDensity === 'comfortable' ? 'py-4' : 'py-3';
                                
                                return (
                                  <div 
                                    key={msg.id}
                                    className={`flex items-center gap-2 lg:gap-4 ${rowHeight} px-2 lg:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group ${
                                      !msg.isRead ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                                    }`}
                                  >
                                    {/* Checkbox */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Checkbox 
                                        checked={selectedMessages.has(msg.id)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedMessages);
                                          if (checked) {
                                            newSelected.add(msg.id);
                                          } else {
                                            newSelected.delete(msg.id);
                                          }
                                          setSelectedMessages(newSelected);
                                        }}
                                        className="opacity-0 group-hover:opacity-100"
                                      />
                                      <Checkbox
                                        checked={selectedMessages.has(msg.id)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedMessages);
                                          if (checked) {
                                            newSelected.add(msg.id);
                                          } else {
                                            newSelected.delete(msg.id);
                                          }
                                          setSelectedMessages(newSelected);
                                        }}
                                        className={`${selectedMessages.has(msg.id) ? 'opacity-100' : 'hidden'}`}
                                      />
                                    </div>
                                    
                                    {/* Star */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMessages(prev => prev.map(m => m.id === msg.id ? {...m, isStarred: !m.isStarred} : m));
                                      }}
                                      className="flex-shrink-0"
                                    >
                                      <Star className={`w-4 h-4 ${msg.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
                                    </button>
                                    
                                    {/* Important */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newImportant = new Set(importantEmails);
                                        if (newImportant.has(msg.id)) {
                                          newImportant.delete(msg.id);
                                        } else {
                                          newImportant.add(msg.id);
                                        }
                                        setImportantEmails(newImportant);
                                      }}
                                      className="flex-shrink-0 hidden lg:block"
                                    >
                                      <AlertCircle className={`w-4 h-4 ${isImportant ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`} />
                                    </button>
                                    
                                    {/* Email Content */}
                                    <div 
                                      className="flex-1 min-w-0 flex items-center gap-4"
                                      onClick={() => {
                                        setSelectedMessage(msg);
                                        if (!msg.isRead) {
                                          setMessages(prev => prev.map(m => m.id === msg.id ? {...m, isRead: true, readAt: new Date()} : m));
                                        }
                                      }}
                                    >
                                      {/* Avatar */}
                                      <Avatar className="w-8 h-8 flex-shrink-0 hidden lg:flex">
                                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs">
                                          {msg.from.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      
                                      {/* Sender */}
                                      <span className={`w-40 truncate ${!msg.isRead ? 'font-bold' : ''} flex-shrink-0`}>
                                        {msg.from.name}
                                      </span>
                                      
                                      {/* Subject & Preview */}
                                      <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <span className={`truncate ${!msg.isRead ? 'font-semibold' : ''}`}>
                                          {msg.subject || '(Sans objet)'}
                                        </span>
                                        <span className="text-sm text-muted-foreground truncate hidden lg:inline">
                                          - {msg.body.substring(0, 80)}...
                                        </span>
                                      </div>
                                      
                                      {/* Labels */}
                                      {msg.labels.length > 0 && (
                                        <div className="hidden lg:flex gap-1 flex-shrink-0">
                                          {msg.labels.slice(0, 2).map((label, i) => {
                                            const labelData = emailLabels.find(l => l.name === label);
                                            return (
                                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: labelData?.color, color: labelData?.color }}>
                                                {label}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      {/* Actions on hover */}
                                      <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); /* Archive */ }}>
                                          <Archive className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); /* Delete */ }}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); /* Snooze */ }}>
                                          <Clock className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      
                                      {/* Date & Attachment */}
                                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                                        {msg.attachments.length > 0 && (
                                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        {isSnoozed && (
                                          <Clock className="w-4 h-4 text-orange-500" />
                                        )}
                                        <span className="text-xs text-muted-foreground w-16 truncate">
                                          {format(msg.createdAt, 'd MMM')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            
                            {getFilteredMessages().length === 0 && (
                              <div className="p-12 text-center">
                                <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                                <h3 className="font-medium text-lg mb-2">Aucun message</h3>
                                <p className="text-muted-foreground text-sm mb-4">
                                  Ce dossier est vide
                                </p>
                                <Button onClick={() => {
                                  setComposeOpen(true);
                                  setReplyToMessage(null);
                                  setForwardMessage(null);
                                }}>
                                  <Plus className="w-4 h-4 mr-2" /> Nouveau message
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                  
                  {/* Compose Dialog */}
                  <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                    <DialogContent className={`${composeMaximized ? 'max-w-full w-full h-screen' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}>
                      <DialogHeader className="flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-cyan-500" />
                            {replyToMessage ? 'Répondre' : forwardMessage ? 'Transférer' : 'Nouveau message'}
                          </DialogTitle>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setComposeMinimized(!composeMinimized)}>
                              {composeMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setComposeMaximized(!composeMaximized)}>
                              {composeMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </DialogHeader>
                      
                      {!composeMinimized && (
                        <>
                          <div className="flex-1 overflow-y-auto space-y-2 py-2">
                            {/* To field with autocomplete */}
                            <div className="flex items-center gap-2 border-b pb-2">
                              <div className="w-16 text-sm text-muted-foreground flex-shrink-0">À</div>
                              <div className="flex-1 flex flex-wrap gap-1 items-center">
                                {newEmail.to.map((recipient, i) => (
                                  <Badge key={i} variant="secondary" className="gap-1">
                                    {recipient.name}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => {
                                      setNewEmail(prev => ({...prev, to: prev.to.filter((_, idx) => idx !== i)}));
                                    }} />
                                  </Badge>
                                ))}
                                <Input
                                  value={toInput}
                                  onChange={(e) => setToInput(e.target.value)}
                                  placeholder={newEmail.to.length === 0 ? "Destinataires..." : ""}
                                  className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                                />
                              </div>
                            </div>
                            
                            {/* CC/BCC toggle */}
                            <div className="flex items-center gap-2 text-xs px-16">
                              <button 
                                className="text-cyan-600 hover:underline"
                                onClick={() => setShowCc(!showCc)}
                              >
                                Cc
                              </button>
                              <button 
                                className="text-cyan-600 hover:underline"
                                onClick={() => setShowBcc(!showBcc)}
                              >
                                Cci
                              </button>
                            </div>
                            
                            {/* CC field */}
                            {showCc && (
                              <div className="flex items-center gap-2 border-b pb-2">
                                <div className="w-16 text-sm text-muted-foreground flex-shrink-0">Cc</div>
                                <div className="flex-1 flex flex-wrap gap-1 items-center">
                                  {newEmail.cc.map((recipient, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1">
                                      {recipient.name}
                                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                                        setNewEmail(prev => ({...prev, cc: prev.cc.filter((_, idx) => idx !== i)}));
                                      }} />
                                    </Badge>
                                  ))}
                                  <Input
                                    value={ccInput}
                                    onChange={(e) => setCcInput(e.target.value)}
                                    placeholder="Cc..."
                                    className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* BCC field */}
                            {showBcc && (
                              <div className="flex items-center gap-2 border-b pb-2">
                                <div className="w-16 text-sm text-muted-foreground flex-shrink-0">Cci</div>
                                <div className="flex-1 flex flex-wrap gap-1 items-center">
                                  {newEmail.bcc.map((recipient, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1">
                                      {recipient.name}
                                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                                        setNewEmail(prev => ({...prev, bcc: prev.bcc.filter((_, idx) => idx !== i)}));
                                      }} />
                                    </Badge>
                                  ))}
                                  <Input
                                    value={bccInput}
                                    onChange={(e) => setBccInput(e.target.value)}
                                    placeholder="Cci..."
                                    className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Subject */}
                            <div className="flex items-center gap-2 border-b pb-2">
                              <div className="w-16 text-sm text-muted-foreground flex-shrink-0">Objet</div>
                              <Input
                                value={newEmail.subject}
                                onChange={(e) => setNewEmail(prev => ({...prev, subject: e.target.value}))}
                                placeholder="Objet du message"
                                className="flex-1 border-0 h-7 px-0 focus-visible:ring-0"
                              />
                            </div>
                            
                            {/* Rich Text Toolbar */}
                            <div className="flex items-center gap-1 py-2 border-b flex-wrap">
                              <Select value={richTextStyle.fontFamily} onValueChange={(v) => setRichTextStyle(prev => ({...prev, fontFamily: v}))}>
                                <SelectTrigger className="w-24 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Arial">Arial</SelectItem>
                                  <SelectItem value="Georgia">Georgia</SelectItem>
                                  <SelectItem value="Times New Roman">Times</SelectItem>
                                  <SelectItem value="Courier New">Courier</SelectItem>
                                  <SelectItem value="Verdana">Verdana</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Select value={richTextStyle.fontSize} onValueChange={(v) => setRichTextStyle(prev => ({...prev, fontSize: v}))}>
                                <SelectTrigger className="w-16 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10px">10</SelectItem>
                                  <SelectItem value="12px">12</SelectItem>
                                  <SelectItem value="14px">14</SelectItem>
                                  <SelectItem value="16px">16</SelectItem>
                                  <SelectItem value="18px">18</SelectItem>
                                  <SelectItem value="24px">24</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Separator orientation="vertical" className="h-5" />
                              
                              <Toggle pressed={richTextStyle.bold} onPressedChange={(v) => setRichTextStyle(prev => ({...prev, bold: v}))} size="sm">
                                <Bold className="w-4 h-4" />
                              </Toggle>
                              <Toggle pressed={richTextStyle.italic} onPressedChange={(v) => setRichTextStyle(prev => ({...prev, italic: v}))} size="sm">
                                <Italic className="w-4 h-4" />
                              </Toggle>
                              <Toggle pressed={richTextStyle.underline} onPressedChange={(v) => setRichTextStyle(prev => ({...prev, underline: v}))} size="sm">
                                <Underline className="w-4 h-4" />
                              </Toggle>
                              
                              <Separator orientation="vertical" className="h-5" />
                              
                              <Toggle pressed={richTextStyle.align === 'left'} onPressedChange={() => setRichTextStyle(prev => ({...prev, align: 'left'}))} size="sm">
                                <AlignLeft className="w-4 h-4" />
                              </Toggle>
                              <Toggle pressed={richTextStyle.align === 'center'} onPressedChange={() => setRichTextStyle(prev => ({...prev, align: 'center'}))} size="sm">
                                <AlignCenter className="w-4 h-4" />
                              </Toggle>
                              <Toggle pressed={richTextStyle.align === 'right'} onPressedChange={() => setRichTextStyle(prev => ({...prev, align: 'right'}))} size="sm">
                                <AlignRight className="w-4 h-4" />
                              </Toggle>
                              
                              <Separator orientation="vertical" className="h-5" />
                              
                              <Toggle size="sm">
                                <List className="w-4 h-4" />
                              </Toggle>
                              <Toggle size="sm">
                                <ListOrdered className="w-4 h-4" />
                              </Toggle>
                              
                              <Separator orientation="vertical" className="h-5" />
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <div className="w-4 h-4 border rounded" style={{ backgroundColor: richTextStyle.textColor }} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48">
                                  <div className="grid grid-cols-6 gap-1">
                                    {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'].map(color => (
                                      <button key={color} className="w-6 h-6 rounded" style={{ backgroundColor: color }} onClick={() => setRichTextStyle(prev => ({...prev, textColor: color}))} />
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Highlighter className="w-4 h-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48">
                                  <div className="grid grid-cols-6 gap-1">
                                    {['#FFFFFF', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FCE7F3', '#FEE2E2', '#E5E7EB'].map(color => (
                                      <button key={color} className="w-6 h-6 rounded border" style={{ backgroundColor: color }} onClick={() => setRichTextStyle(prev => ({...prev, highlightColor: color}))} />
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              
                              <Separator orientation="vertical" className="h-5" />
                              
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <LinkIcon className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.multiple = true;
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) {
                                      Array.from(files).forEach(file => {
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                          const attachment: EmailAttachment = {
                                            id: generateId(),
                                            messageId: '',
                                            fileName: file.name,
                                            fileSize: file.size,
                                            fileType: file.type,
                                            fileData: e.target?.result as string,
                                            uploadedAt: new Date()
                                          };
                                          setNewEmail(prev => ({...prev, attachments: [...prev.attachments, attachment]}));
                                        };
                                        reader.readAsDataURL(file);
                                      });
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Paperclip className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {/* Body */}
                            <Textarea
                              value={newEmail.body}
                              onChange={(e) => setNewEmail(prev => ({...prev, body: e.target.value}))}
                              placeholder="Écrivez votre message..."
                              className={`min-h-[200px] flex-1 border-0 focus-visible:ring-0 resize-none ${richTextStyle.bold ? 'font-bold' : ''} ${richTextStyle.italic ? 'italic' : ''} ${richTextStyle.underline ? 'underline' : ''}`}
                              style={{ 
                                fontFamily: richTextStyle.fontFamily, 
                                fontSize: richTextStyle.fontSize,
                                textAlign: richTextStyle.align,
                                color: richTextStyle.textColor
                              }}
                            />
                            
                            {/* Attachments */}
                            {newEmail.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 py-2 border-t">
                                {newEmail.attachments.map((att, i) => (
                                  <Badge key={i} variant="outline" className="gap-1 py-1">
                                    <File className="w-3 h-3" />
                                    <span className="max-w-24 truncate">{att.fileName}</span>
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => {
                                      setNewEmail(prev => ({...prev, attachments: prev.attachments.filter((_, idx) => idx !== i)}));
                                    }} />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter className="border-t pt-3 flex-shrink-0">
                            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
                              <div className="flex items-center gap-2">
                                {/* Priority */}
                                <Select value={newEmail.priority} onValueChange={(v) => setNewEmail(prev => ({...prev, priority: v as MessagePriority}))}>
                                  <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="important">Important</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/* Schedule Send */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Clock className="w-4 h-4 mr-1" /> Planifier
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">Planifier l'envoi</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" className="justify-start" onClick={() => {
                                          const tomorrow = new Date();
                                          tomorrow.setDate(tomorrow.getDate() + 1);
                                          tomorrow.setHours(8, 0, 0, 0);
                                          setNewEmail(prev => ({...prev, scheduledAt: tomorrow}));
                                          toast.success('Envoi planifié pour demain 8h');
                                        }}>
                                          Demain 8h
                                        </Button>
                                        <Button variant="outline" size="sm" className="justify-start" onClick={() => {
                                          const monday = new Date();
                                          monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7);
                                          monday.setHours(9, 0, 0, 0);
                                          setNewEmail(prev => ({...prev, scheduledAt: monday}));
                                          toast.success('Envoi planifié pour lundi 9h');
                                        }}>
                                          Lundi 9h
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                
                                {/* Confidential Mode */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className={emailSettings.confidentialMode ? 'text-cyan-500' : ''}>
                                      <Lock className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Mode confidentiel</TooltipContent>
                                </Tooltip>
                                
                                {/* Read Receipt */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className={emailSettings.requestReadReceipt ? 'text-cyan-500' : ''} onClick={() => setEmailSettings(prev => ({...prev, requestReadReceipt: !prev.requestReadReceipt}))}>
                                      <CheckCheck className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Accusé de réception</TooltipContent>
                                </Tooltip>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  // Save draft
                                  const draft: InternalMessage = {
                                    id: generateId(),
                                    from: { id: user?.id || '', name: user?.name || '', email: user?.email || '' },
                                    to: newEmail.to,
                                    cc: newEmail.cc,
                                    bcc: newEmail.bcc,
                                    subject: newEmail.subject,
                                    body: newEmail.body,
                                    attachments: newEmail.attachments,
                                    folder: 'drafts',
                                    status: 'unread',
                                    priority: newEmail.priority,
                                    isStarred: false,
                                    isRead: true,
                                    labels: [],
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                    isDraft: true
                                  };
                                  setMessages(prev => [draft, ...prev]);
                                  setComposeOpen(false);
                                  toast.success('Brouillon enregistré');
                                }}>
                                  Enregistrer
                                </Button>
                                <Button 
                                  className="bg-cyan-500 hover:bg-cyan-600"
                                  onClick={() => {
                                    if (newEmail.to.length === 0) {
                                      toast.error('Veuillez ajouter au moins un destinataire');
                                      return;
                                    }
                                    
                                    const message: InternalMessage = {
                                      id: generateId(),
                                      from: {
                                        id: user?.id || '',
                                        name: user?.name || '',
                                        email: user?.email || ''
                                      },
                                      to: newEmail.to,
                                      cc: newEmail.cc,
                                      bcc: newEmail.bcc,
                                      subject: newEmail.subject,
                                      body: newEmail.body,
                                      attachments: newEmail.attachments,
                                      folder: 'sent',
                                      status: 'read',
                                      priority: newEmail.priority,
                                      isStarred: false,
                                      isRead: true,
                                      labels: [],
                                      sentAt: new Date(),
                                      createdAt: new Date(),
                                      updatedAt: new Date(),
                                      isDraft: false
                                    };
                                    
                                    setMessages(prev => [message, ...prev]);
                                    
                                    // Also add to recipients' inbox (demo)
                                    newEmail.to.forEach(recipient => {
                                      const inboxMessage: InternalMessage = {
                                        ...message,
                                        id: generateId(),
                                        folder: 'inbox',
                                        status: 'unread',
                                        isRead: false,
                                        from: message.from,
                                        to: [recipient],
                                        receivedAt: new Date()
                                      };
                                      setMessages(prev => [inboxMessage, ...prev]);
                                    });
                                    
                                    setComposeOpen(false);
                                    setNewEmail({
                                      to: [],
                                      cc: [],
                                      bcc: [],
                                      subject: '',
                                      body: '',
                                      attachments: [],
                                      priority: 'normal',
                                      scheduledAt: null
                                    });
                                    setReplyToMessage(null);
                                    setForwardMessage(null);
                                    toast.success('Message envoyé');
                                  }}
                                >
                                  <Send className="w-4 h-4 mr-2" /> Envoyer
                                </Button>
                              </div>
                            </div>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {/* Create Label Dialog */}
                  <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Nouveau libellé</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="grid gap-2">
                          <Label>Nom du libellé</Label>
                          <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Ex: Important" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Couleur</Label>
                          <div className="flex gap-2 flex-wrap">
                            {['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E'].map((color) => (
                              <button
                                key={color}
                                className={`w-7 h-7 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-cyan-500' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewLabelColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>Annuler</Button>
                        <Button 
                          className="bg-cyan-500 hover:bg-cyan-600"
                          disabled={!newLabelName.trim()}
                          onClick={() => {
                            const label: EmailLabel = {
                              id: generateId(),
                              name: newLabelName,
                              color: newLabelColor,
                              userId: user?.id || '',
                              createdAt: new Date()
                            };
                            setEmailLabels(prev => [...prev, label]);
                            setNewLabelName('');
                            setNewLabelColor('#3B82F6');
                            setLabelDialogOpen(false);
                            toast.success('Libellé créé');
                          }}
                        >
                          Créer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Gmail Settings Dialog */}
                  <Dialog open={gmailSettingsOpen} onOpenChange={setGmailSettingsOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Paramètres de messagerie</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="flex-1">
                        <div className="space-y-6 py-4">
                          {/* Theme */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Apparence</h4>
                            <div className="flex gap-2">
                              <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>
                                <Sun className="w-4 h-4 mr-2" /> Clair
                              </Button>
                              <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>
                                <Moon className="w-4 h-4 mr-2" /> Sombre
                              </Button>
                              <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>
                                <Monitor className="w-4 h-4 mr-2" /> Système
                              </Button>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Display Density */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Densité d'affichage</h4>
                            <Select value={displayDensity} onValueChange={(v) => setDisplayDensity(v as 'compact' | 'default' | 'comfortable')}>
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="default">Par défaut</SelectItem>
                                <SelectItem value="comfortable">Confortable</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Separator />
                          
                          {/* Signature */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Signature</h4>
                            <Textarea
                              placeholder="Votre signature..."
                              value={emailSettings.signature}
                              onChange={(e) => setEmailSettings(prev => ({...prev, signature: e.target.value}))}
                              className="min-h-[100px]"
                            />
                          </div>
                          
                          <Separator />
                          
                          {/* Vacation Responder */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Répondeur d'absence</h4>
                              <Switch 
                                checked={vacationResponder.enabled}
                                onCheckedChange={(checked) => setVacationResponder(prev => ({...prev, enabled: checked}))}
                              />
                            </div>
                            {vacationResponder.enabled && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Objet..."
                                  value={vacationResponder.subject}
                                  onChange={(e) => setVacationResponder(prev => ({...prev, subject: e.target.value}))}
                                />
                                <Textarea
                                  placeholder="Message d'absence..."
                                  value={vacationResponder.body}
                                  onChange={(e) => setVacationResponder(prev => ({...prev, body: e.target.value}))}
                                />
                              </div>
                            )}
                          </div>
                          
                          <Separator />
                          
                          {/* Notifications */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Notifications</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Sons</Label>
                                <Switch 
                                  checked={emailNotifications.soundEnabled}
                                  onCheckedChange={(checked) => setEmailNotifications(prev => ({...prev, soundEnabled: checked}))}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Notifications navigateur</Label>
                                <Switch 
                                  checked={emailNotifications.browserNotifications}
                                  onCheckedChange={(checked) => setEmailNotifications(prev => ({...prev, browserNotifications: checked}))}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Keyboard Shortcuts */}
                          <div className="space-y-2">
                            <h4 className="font-medium">Raccourcis clavier</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between"><span>Nouveau message</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">C</kbd></div>
                              <div className="flex justify-between"><span>Répondre</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">R</kbd></div>
                              <div className="flex justify-between"><span>Transférer</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">F</kbd></div>
                              <div className="flex justify-between"><span>Supprimer</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">#</kbd></div>
                              <div className="flex justify-between"><span>Archiver</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">E</kbd></div>
                              <div className="flex justify-between"><span>Marquer comme lu</span><kbd className="bg-muted px-2 py-0.5 rounded text-xs">Shift+I</kbd></div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGmailSettingsOpen(false)}>Annuler</Button>
                        <Button onClick={() => {
                          setGmailSettingsOpen(false);
                          toast.success('Paramètres enregistrés');
                        }}>
                          Enregistrer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}
              
              {/* Supervision */}
              {currentTab === 'supervision' && (user?.role === 'RESPONSABLE' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <motion.div key="supervision" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">Supervision Temps Réel</h1>
                    <p className="text-muted-foreground">Vue en direct de l'activité du NOC</p>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.keys(SHIFTS_DATA).flatMap(shiftName => {
                      const shiftData = SHIFTS_DATA[shiftName];
                      const schedule = getShiftScheduleForDate(shiftName, new Date());
                      
                      return shiftData.members.map((member, idx) => {
                        const restInfo = getIndividualRestAgent(shiftName, new Date());
                        const isResting = restInfo?.agentName === member;
                        const isOnDuty = schedule.isWorking && !isResting;
                        
                        return (
                          <Card key={`${shiftName}-${idx}`} className={`${!schedule.isWorking || isResting ? 'opacity-60' : ''}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback style={{ backgroundColor: `${getShiftColor(shiftName)}20`, color: getShiftColor(shiftName) }}>
                                      {member.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isOnDuty ? 'bg-green-500' : 'bg-gray-400'}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{member}</p>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getShiftColor(shiftName) }} />
                                    <span className="text-xs text-muted-foreground">S{shiftName}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs mt-2">
                                {!schedule.isWorking ? 'Repos' : isResting ? 'Repos indiv.' : 'Actif'}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      });
                    })}
                  </div>
                </motion.div>
              )}
              
              {/* Admin */}
              {currentTab === 'admin' && user?.role === 'ADMIN' && (
                <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">Administration</h1>
                    <p className="text-muted-foreground">Gestion des utilisateurs et paramètres</p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">Configuration des Shifts</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {Object.keys(SHIFTS_DATA).map(shiftName => {
                          const shiftData = SHIFTS_DATA[shiftName];
                          return (
                            <Card key={shiftName} className="border-2" style={{ borderColor: getShiftColor(shiftName) }}>
                              <CardHeader className="pb-2 pt-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: getShiftColor(shiftName) }} />
                                  Shift {shiftName}
                                </CardTitle>
                                <CardDescription className="text-xs">Début: {format(SHIFT_CYCLE_START[shiftName], 'dd/MM/yyyy')}</CardDescription>
                              </CardHeader>
                              <CardContent className="pb-4">
                                <div className="space-y-1.5">
                                  {shiftData.members.map((member, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-muted text-sm">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">{member.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {member}
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
        
        {/* Rest Dialog */}
        <Dialog open={restDialogOpen} onOpenChange={setRestDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Mes jours de repos</DialogTitle>
              <DialogDescription>Calendrier de vos repos individuels et collectifs</DialogDescription>
            </DialogHeader>
            {user?.shift && userRestInfo && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2"><Coffee className="w-4 h-4" /> Repos Individuel</h4>
                  <div className="p-3 rounded-lg bg-muted">
                    {userRestInfo.isOnIndividualRest ? (
                      <p className="text-green-600 font-medium">Vous êtes en repos aujourd'hui</p>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">Prochain repos :</p>
                        <p className="font-bold">{userRestInfo.nextIndividualRest ? format(userRestInfo.nextIndividualRest, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2"><MoonIcon className="w-4 h-4" /> Repos Collectif</h4>
                  <div className="p-3 rounded-lg bg-muted">
                    {userRestInfo.isOnCollectiveRest ? (
                      <p className="text-green-600 font-medium">Repos collectif en cours</p>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground">Prochain repos collectif :</p>
                        <p className="font-bold">{userRestInfo.nextCollectiveRestStart ? format(userRestInfo.nextCollectiveRestStart, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non planifié'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild><Button>Fermer</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Photo de profil</DialogTitle>
              <DialogDescription>Téléchargez votre photo de profil</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-24 w-24">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="w-4 h-4" />
                  Choisir une image
                </div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </Label>
              
              {user?.avatar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (user) {
                      const updatedUser = { ...user, avatar: undefined };
                      setUser(updatedUser);
                      localStorage.setItem('noc_user', JSON.stringify(updatedUser));
                      toast.success('Photo supprimée');
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                </Button>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button>Fermer</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Modifier le Profil */}
        <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Modifier mes informations
              </DialogTitle>
              <DialogDescription>Mettez à jour vos informations professionnelles</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Votre prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email professionnel</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="votre.email@siliconeconnect.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editUsername">Pseudo (optionnel)</Label>
                <Input
                  id="editUsername"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Votre pseudo pour la connexion"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleSaveProfile}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Sécuriser le compte */}
        <Dialog open={securityDialogOpen} onOpenChange={setSecurityDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Sécuriser mon compte
              </DialogTitle>
              <DialogDescription>Définissez votre mot de passe sécurisé</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editPassword">Nouveau mot de passe</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {editPassword && (
                  <div className="text-xs space-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      {validatePassword(editPassword).hasMinLength ? 
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                        <XCircle className="w-3 h-3 text-red-500" />}
                      <span className={validatePassword(editPassword).hasMinLength ? 'text-green-600' : 'text-red-600'}>
                        Minimum 8 caractères
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validatePassword(editPassword).hasUppercase ? 
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                        <XCircle className="w-3 h-3 text-red-500" />}
                      <span className={validatePassword(editPassword).hasUppercase ? 'text-green-600' : 'text-red-600'}>
                        1 majuscule minimum
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validatePassword(editPassword).hasNumber ? 
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                        <XCircle className="w-3 h-3 text-red-500" />}
                      <span className={validatePassword(editPassword).hasNumber ? 'text-green-600' : 'text-red-600'}>
                        1 chiffre minimum
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validatePassword(editPassword).hasSpecial ? 
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                        <XCircle className="w-3 h-3 text-red-500" />}
                      <span className={validatePassword(editPassword).hasSpecial ? 'text-green-600' : 'text-red-600'}>
                        1 caractère spécial (!@#$%^&*)
                      </span>
                    </div>
                    {editPassword.length >= 6 && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Force: </span>
                        <span className={`text-xs font-medium ${
                          validatePassword(editPassword).strength === 'weak' ? 'text-red-500' :
                          validatePassword(editPassword).strength === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {validatePassword(editPassword).strength === 'weak' ? 'Faible' :
                           validatePassword(editPassword).strength === 'medium' ? 'Moyen' : 'Fort'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {confirmPassword && editPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleSaveSecurity} disabled={!validatePassword(editPassword).isValid || editPassword !== confirmPassword}>
                Sécuriser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Définir mon Shift */}
        <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Définir mon shift
              </DialogTitle>
              <DialogDescription>Configurez votre shift et votre fonction</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={editShift} onValueChange={setEditShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        Shift A (Bleu)
                      </div>
                    </SelectItem>
                    <SelectItem value="B">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        Shift B (Jaune)
                      </div>
                    </SelectItem>
                    <SelectItem value="C">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Shift C (Vert)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fonction</Label>
                <Select value={editResponsibility} onValueChange={(v) => setEditResponsibility(v as ResponsibilityType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL_CENTER">📞 Call Center</SelectItem>
                    <SelectItem value="MONITORING">📊 Monitoring</SelectItem>
                    <SelectItem value="REPORTING_1">📈 Reporting 1</SelectItem>
                    <SelectItem value="REPORTING_2">📋 Reporting 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleSaveShift}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Paramètres */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Paramètres
              </DialogTitle>
              <DialogDescription>Personnalisez votre expérience</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Apparence</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm">Thème sombre</p>
                    <p className="text-xs text-muted-foreground">Activer le mode sombre</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Session</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm">Déconnexion automatique</p>
                    <p className="text-xs text-muted-foreground">Après 10 minutes d'inactivité</p>
                  </div>
                  <Badge variant="outline">Activé</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notifications</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm">Notifications push</p>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes importantes</p>
                  </div>
                  <Badge variant="outline">Activé</Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button>Fermer</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Gestion des Utilisateurs (Super Admin) */}
        {isSuperAdmin(user) && (
          <Dialog open={usersManagementOpen} onOpenChange={setUsersManagementOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gérer les utilisateurs
                </DialogTitle>
                <DialogDescription>Gérez tous les comptes utilisateurs</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                      <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                      <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setCreateUserDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Créer
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <Badge className={ROLE_CONFIG[u.role].color}>
                            {ROLE_CONFIG[u.role].label}
                          </Badge>
                          {u.isBlocked && (
                            <Badge variant="destructive">Bloqué</Badge>
                          )}
                          {u.mustChangePassword && (
                            <Badge variant="outline" className="text-yellow-600">Mot de passe à changer</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBlockUser(u)}
                            disabled={u.role === 'SUPER_ADMIN'}
                          >
                            {u.isBlocked ? 'Débloquer' : 'Bloquer'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditPassword('');
                              setSecurityDialogOpen(true);
                            }}
                            disabled={u.role === 'SUPER_ADMIN' && user?.id !== u.id}
                          >
                            Réinitialiser MDP
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.role === 'SUPER_ADMIN'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAuditLogDialogOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" /> Journal d'activité
                </Button>
                <DialogClose asChild><Button>Fermer</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Créer un utilisateur */}
        {isSuperAdmin(user) && (
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                <DialogDescription>Remplissez les informations du nouveau compte</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="@siliconeconnect.com" />
                </div>
                <div className="space-y-2">
                  <Label>Pseudo (optionnel)</Label>
                  <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                      <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                      <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe par défaut</Label>
                  <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">L'utilisateur devra changer ce mot de passe à sa première connexion</p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button onClick={handleCreateUser}>Créer l'utilisateur</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Journal d'activité */}
        {isSuperAdmin(user) && (
          <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Journal d'activité (Audit Log)
                </DialogTitle>
                <DialogDescription>Historique de toutes les actions</DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {auditLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucune activité enregistrée</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.details}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{log.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <DialogFooter>
                <DialogClose asChild><Button>Fermer</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Composition Email - Style Gmail Exact */}
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
            {/* Header - Style Gmail */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#404040] text-white">
              <h3 className="font-medium text-sm">Nouveau message</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10">
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10">
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setComposeOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Form Container with scroll */}
            <div className="max-h-[400px] overflow-y-auto">
              {/* To field */}
              <div className="flex items-center px-4 py-2 border-b min-h-[40px]">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>De:</span>
                  <span className="text-gray-700 dark:text-gray-300">{user?.email || 'moi@siliconeconnect.com'}</span>
                </div>
              </div>
              
              {/* To field */}
              <div className="flex items-center px-4 py-2 border-b min-h-[40px]">
                <span className="text-sm text-gray-500 w-8">À:</span>
                <div className="flex-1 flex flex-wrap items-center gap-1">
                  {newEmail.to.map((recipient, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                      {recipient.name}
                      <button onClick={() => setNewEmail(prev => ({...prev, to: prev.to.filter((_, i) => i !== index)}))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onFocus={() => setShowSuggestions('to')}
                    className="flex-1 outline-none text-sm bg-transparent min-w-[150px]"
                    placeholder=""
                  />
                </div>
                <button 
                  onClick={() => setShowCc(!showCc)}
                  className={`text-sm px-2 py-1 rounded ${showCc ? 'text-blue-700 bg-blue-50' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  Cc
                </button>
                <button 
                  onClick={() => setShowBcc(!showBcc)}
                  className={`text-sm px-2 py-1 rounded ${showBcc ? 'text-blue-700 bg-blue-50' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  Cci
                </button>
              </div>
              
              {/* Cc field */}
              {showCc && (
                <div className="flex items-center px-4 py-2 border-b min-h-[40px]">
                  <span className="text-sm text-gray-500 w-8">Cc:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {newEmail.cc.map((recipient, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                        {recipient.name}
                        <button onClick={() => setNewEmail(prev => ({...prev, cc: prev.cc.filter((_, i) => i !== index)}))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent min-w-[150px]"
                      placeholder=""
                    />
                  </div>
                </div>
              )}
              
              {/* Bcc (Cci) field */}
              {showBcc && (
                <div className="flex items-center px-4 py-2 border-b min-h-[40px]">
                  <span className="text-sm text-gray-500 w-8">Cci:</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {newEmail.bcc.map((recipient, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                        {recipient.name}
                        <button onClick={() => setNewEmail(prev => ({...prev, bcc: prev.bcc.filter((_, i) => i !== index)}))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={bccInput}
                      onChange={(e) => setBccInput(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent min-w-[150px]"
                      placeholder=""
                    />
                  </div>
                </div>
              )}
              
              {/* Subject */}
              <div className="flex items-center px-4 py-2 border-b min-h-[40px]">
                <span className="text-sm text-gray-500 w-16">Objet:</span>
                <input
                  type="text"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail(prev => ({...prev, subject: e.target.value}))}
                  className="flex-1 outline-none text-sm bg-transparent"
                  placeholder="(sans objet)"
                />
              </div>
              
              {/* Rich Text Editor Toolbar */}
              <div className="flex items-center gap-0.5 px-4 py-1 border-b bg-gray-50 dark:bg-gray-900 flex-wrap">
                {/* Font Family */}
                <Select value={editorFontFamily} onValueChange={setEditorFontFamily}>
                  <SelectTrigger className="h-7 w-24 text-xs border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times New Roman">Times</SelectItem>
                    <SelectItem value="Courier New">Courier</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Font Size */}
                <Select value={editorFontSize} onValueChange={setEditorFontSize}>
                  <SelectTrigger className="h-7 w-16 text-xs border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Petit</SelectItem>
                    <SelectItem value="3">Normal</SelectItem>
                    <SelectItem value="5">Grand</SelectItem>
                    <SelectItem value="7">Très grand</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                {/* Bold */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 w-7 p-0 ${editorFormats.bold ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  onClick={() => formatText('bold')}
                >
                  <Bold className="w-4 h-4" />
                </Button>
                
                {/* Italic */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 w-7 p-0 ${editorFormats.italic ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  onClick={() => formatText('italic')}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                
                {/* Underline */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 w-7 p-0 ${editorFormats.underline ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  onClick={() => formatText('underline')}
                >
                  <Underline className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                {/* Text Color */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold">A</span>
                        <div className="w-4 h-1 rounded" style={{ backgroundColor: editorTextColor }} />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef',
                        '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
                        '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
                        '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599'].map((color) => (
                        <button
                          key={color}
                          className="w-4 h-4 rounded border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setEditorTextColor(color);
                            formatText('foreColor', color);
                          }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Highlight Color */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Highlighter className="w-4 h-4" style={{ color: editorHighlightColor }} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {['#ffffff', '#c9daf8', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#e6b8af', '#ead1dc',
                        '#cfe2f3', '#d9d2e9', '#f4cccc', '#ffe599', '#d9ead3', '#b6d7a8', '#a2c4c9', '#b4a7d6'].map((color) => (
                        <button
                          key={color}
                          className="w-4 h-4 rounded border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setEditorHighlightColor(color);
                            formatText('hiliteColor', color);
                          }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                {/* Alignment */}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('justifyLeft')}>
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('justifyCenter')}>
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('justifyRight')}>
                  <AlignRight className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                {/* Lists */}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('insertUnorderedList')}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('insertOrderedList')}>
                  <ListOrdered className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                {/* Link */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-2">
                      <Input
                        placeholder="URL du lien"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" className="w-full" onClick={() => {
                        if (linkUrl) {
                          formatText('createLink', linkUrl);
                          setLinkUrl('');
                        }
                      }}>
                        Insérer
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Remove formatting */}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => formatText('removeFormat')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Body - ContentEditable */}
              <div 
                ref={editorRef}
                contentEditable
                className="min-h-[150px] p-4 outline-none text-sm leading-relaxed overflow-y-auto"
                style={{ maxHeight: '200px', fontFamily: editorFontFamily }}
                onInput={(e) => {
                  setNewEmail(prev => ({...prev, body: e.currentTarget.innerHTML}));
                }}
                data-placeholder="Écrivez votre message..."
                dangerouslySetInnerHTML={{ __html: newEmail.body || '' }}
              />
              
              {/* Attachments Preview */}
              {newEmail.attachments.length > 0 && (
                <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900">
                  <div className="flex flex-wrap gap-2">
                    {newEmail.attachments.map((att, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border text-sm">
                        <File className="w-4 h-4 text-blue-500" />
                        <span className="truncate max-w-[150px]">{att.fileName}</span>
                        <span className="text-xs text-gray-400">{(att.fileSize / 1024).toFixed(1)}KB</span>
                        <button 
                          onClick={() => setNewEmail(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== index)}))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Toolbar - Style Gmail */}
            <div className="flex items-center gap-1 px-4 py-2 border-t bg-white dark:bg-gray-900">
              {/* Send Button */}
              <Button 
                onClick={() => {
                  if (newEmail.to.length === 0) {
                    toast.error('Erreur', { description: 'Veuillez ajouter au moins un destinataire' });
                    return;
                  }
                  
                  const message: InternalMessage = {
                    id: generateId(),
                    from: {
                      id: user?.id || '',
                      name: user?.name || '',
                      email: user?.email || ''
                    },
                    to: newEmail.to,
                    cc: newEmail.cc,
                    bcc: newEmail.bcc,
                    subject: newEmail.subject,
                    body: newEmail.body,
                    attachments: newEmail.attachments,
                    folder: 'sent',
                    status: 'read',
                    priority: newEmail.priority,
                    isStarred: false,
                    isRead: true,
                    labels: [],
                    sentAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isDraft: false
                  };
                  
                  setMessages(prev => [message, ...prev]);
                  
                  // Reset
                  setNewEmail({
                    to: [],
                    cc: [],
                    bcc: [],
                    subject: '',
                    body: '',
                    attachments: [],
                    priority: 'normal',
                    scheduledAt: null
                  });
                  setToInput('');
                  setCcInput('');
                  setBccInput('');
                  if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                  }
                  setComposeOpen(false);
                  
                  toast.success('Message envoyé');
                }}
                className="gap-1 bg-[#0b57d0] hover:bg-[#0842a0] text-white px-4"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              
              {/* Formatting toggle */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                    <span className="font-bold underline">A</span>
                  </Button>
                </PopoverTrigger>
              </Popover>
              
              {/* Attachment */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const attachment: EmailAttachment = {
                            id: generateId(),
                            messageId: '',
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type,
                            fileData: reader.result as string,
                            uploadedAt: new Date()
                          };
                          setNewEmail(prev => ({
                            ...prev,
                            attachments: [...prev.attachments, attachment]
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100" type="button">
                  <Paperclip className="w-5 h-5" />
                </Button>
              </label>
              
              {/* Link */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                <LinkIcon className="w-5 h-5" />
              </Button>
              
              {/* Emoji */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                    <Smile className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '✅', '⏰', '📞', '📧', '💻', '🔧', '📊', '📈', '✨', '🌟', '💪', '🙏', '👋'].map((emoji) => (
                      <button
                        key={emoji}
                        className="text-xl hover:bg-gray-100 rounded p-1"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.focus();
                            document.execCommand('insertText', false, emoji);
                          }
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Google Drive */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574h-3.758zm-5.735 1.04l-6.27 10.89 1.88 3.298 1.88 3.297h3.77l-1.893-3.297-1.893-3.298 4.38-7.59 2.19-3.8h-.005c-1.15 0-2.59.02-4.04.05z"/>
                </svg>
              </Button>
              
              {/* Photo */}
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const attachment: EmailAttachment = {
                          id: generateId(),
                          messageId: '',
                          fileName: file.name,
                          fileSize: file.size,
                          fileType: file.type,
                          fileData: reader.result as string,
                          uploadedAt: new Date()
                        };
                        setNewEmail(prev => ({
                          ...prev,
                          attachments: [...prev.attachments, attachment]
                        }));
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                }} />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100" type="button">
                  <ImageIcon className="w-5 h-5" />
                </Button>
              </label>
              
              {/* Confidential mode */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                <Lock className="w-5 h-5" />
              </Button>
              
              {/* More options */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded" onClick={() => setNewEmail(prev => ({...prev, priority: 'important'}))}>
                    Marquer comme important
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                    Demander un accusé de réception
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                    Planifier l'envoi
                  </button>
                </PopoverContent>
              </Popover>
              
              {/* Spacer */}
              <div className="flex-1" />
              
              {/* Trash / Delete draft */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                onClick={() => {
                  setNewEmail({
                    to: [],
                    cc: [],
                    bcc: [],
                    subject: '',
                    body: '',
                    attachments: [],
                    priority: 'normal',
                    scheduledAt: null
                  });
                  if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                  }
                  setComposeOpen(false);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
