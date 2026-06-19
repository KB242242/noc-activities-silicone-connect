'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter, useSearchParams } from 'next/navigation';

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
import { toast } from '@/lib/toast';
import {
  DEFAULT_SECTION_ACCESS,
  getCurrentTabStorageKey,
  getPlanningFilterStorageKey,
  isAppSectionKey,
  isNocSection,
  NOC_SIDEBAR_ITEMS,
  SECTION_LABELS,
  type AppSectionKey,
  type NocSectionKey,
} from '@/features/app-shell/core/shared/navigation';
import {
  ALERT_TYPE_CONFIG,
  canManageAnnouncements,
  canManageTickets,
  RESPONSIBILITY_CONFIG,
  ROLE_CONFIG,
  SESSION_TIMEOUT_MS,
} from '@/features/app-shell/core/shared/constants';
import {
  cleanEmptyDivs,
  generateId,
  hashPassword,
  hasPermission,
  isSuperAdmin,
  validatePassword,
  verifyPassword,
} from '@/features/app-shell/core/shared/utils';
import {
  mapCombinedApiTickets,
  mapApiTicketPriorityToLegacy,
  mapApiTicketStatusToLegacy,
  mapApiTicketToLegacy,
  mapApiTicketTypeToLegacyCategory,
  mapLegacyTicketCategoryToApiType,
  mapLegacyTicketPriorityToApi,
  mapLegacyTicketStatusToApi,
} from '@/features/app-shell/core/tickets/ticket-mappers';
import {
  getShiftColor,
  getShiftLightBg,
  SHIFT_CYCLE_START,
  SHIFTS_DATA,
} from '@/features/app-shell/core/planning/shifts';
import {
  CONGO_DEPARTMENTS,
  DEFAULT_TICKET_ADMIN_SETTINGS,
  DEFAULT_TICKET_LOCALITY_DRAFT,
  LOCALITES_LIST,
  SITES_LIST,
  TICKET_ADMIN_CATEGORY_KEYS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@/features/app-shell/core/config/ticket-constants';
import { ACTIVITY_TYPES, ALERT_THRESHOLDS } from '@/features/app-shell/core/config/activity-constants';
import {
  BADGE_CONFIG,
  EXTERNAL_LINKS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@/features/app-shell/core/noc/noc-config';
import {
  filterAuditLogs,
  filterUsers,
  getUniqueAuditActionTypes,
} from '@/features/app-shell/core/admins/admin-selectors';
import {
  calculateActualDuration,
  calculateAgentPerformance,
  checkInactivity,
  formatDuration,
  getGanttTaskColor,
  isTaskOverdue,
  sortTasksByPriority,
} from '@/features/app-shell/core/tasks/task-utils';
import {
  buildMonthlyPlanning,
  getAgentRestInfo,
  getIndividualRestAgent,
  getShiftScheduleForDate,
} from '@/features/app-shell/core/planning/planning-utils';
import { downloadOvertimePdf, downloadPlanningPdf } from '@/features/app-shell/core/planning/planning-pdf';
import {
  defaultNocPlanningSettings,
  type NocPlanningSettings,
} from '@/lib/noc/planningSettings';
import { DEMO_USERS } from '@/features/app-shell/core/demo/demo-users';
import {
  filterManagedLocalities,
  filterVisibleTickets,
  getArchivedTickets,
  getArchiveReport,
  getTicketActionKey,
  getArchiveYearBuckets,
  getArchiveYears,
  getSelectedArchiveTickets,
  getTicketTechnicianOptions,
  isTicketActionBusy as isTicketActionBusyKey,
  matchesTicketStorageView,
  updateTicketActionBusyKeys,
} from '@/features/app-shell/core/tickets/ticket-selectors';
import {
  attachReplyMessages,
  mapFetchedChatMessage,
  mapIncomingChatMessage,
} from '@/features/app-shell/core/chat/chat-mappers';
import {
  mapCreatedConversation,
  mapFetchedConversation,
} from '@/features/app-shell/core/chat/chat-conversation-mappers';
import {
  applyProfileUpdateToChatMessages,
  applyProfileUpdateToConversations,
  applyProfileUpdateToUsers,
  getProfileUpdateFromPayload,
} from '@/features/app-shell/core/chat/chat-realtime';
import {
  markNotificationsReadForConversation,
  mergeIncomingMessage,
  mergePinnedMessages,
  updateConversationsWithIncomingMessage,
} from '@/features/app-shell/core/chat/chat-stream-updates';
import {
  applyIncomingTypingSignal,
  cleanupStaleTypingIndicators,
  getIncomingTypingSignal,
} from '@/features/app-shell/core/chat/chat-typing';
import {
  cleanupStaleLiveReactions,
  getIncomingReactionSignal,
} from '@/features/app-shell/core/chat/chat-reactions';
import {
  buildIncomingCallFromRequest,
  getIncomingCallRequest,
  getIncomingCallResponse,
} from '@/features/app-shell/core/chat/chat-call-signals';
import {
  createConversationRequest,
  fetchConversationMessagesRequest,
  fetchConversationsRequest,
  patchConversationMessageRequest,
  sendConversationMessageRequest,
} from '@/features/app-shell/core/chat/chat-api';
import { resetConversationUnreadCount } from '@/features/app-shell/core/chat/chat-conversations';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  parseStoredNotifications,
  prependNotification,
  prependNotificationIfMissingMessage,
} from '@/features/app-shell/core/chat/chat-notifications';
import { parseStoredUser } from '@/features/app-shell/core/users/user-storage';
import { getStoredRecentEmojis, mergeRecentEmojis } from '@/features/app-shell/core/chat/chat-emojis';
import {
  buildDefaultNotifications,
  buildInitialActivities,
  buildInitialTasks,
} from '@/features/app-shell/core/demo/demo-seed';
import {
  fetchNocMonthlyConsumptionRequest,
  fetchNocOverviewRequest,
} from '@/features/app-shell/core/noc/noc-api';
import { readBootstrapLocalData } from '@/features/app-shell/core/shared/storage-bootstrap';
import {
  normalizeTicketAdminSettings,
  parseNotificationEmailsInput,
} from '@/features/app-shell/core/config/ticket-admin-settings';
import {
  applyManagedLocalityUpdate,
  buildManagedLocalityDraftFromSelection,
  normalizeTicketLocalityKey,
  normalizeTicketLocality,
  parseManagedLocalitiesPayload,
  parseTicketSitePayload,
  prepareCreateLocality,
  removeLocalityOptionByName,
  removeManagedLocalityById,
  resolveCreatedLocalityName,
  splitTicketValues,
} from '@/features/app-shell/core/tickets/ticket-locality-utils';
import {
  createTicketLocalityRequest,
  deleteTicketLocalityRequest,
  updateTicketLocalityRequest,
} from '@/features/app-shell/core/tickets/ticket-locality-api';
import {
  deleteTicketRequest,
  fetchTicketAdminSettingsRequest,
  fetchTicketsModuleDataRequest,
  restoreTicketRequest,
  saveTicketAdminSettingsRequest,
  TicketApiRequestError,
  unarchiveTicketRequest,
  updateTicketDetailsRequest,
  updateTicketStatusRequest,
} from '@/features/app-shell/core/tickets/ticket-api';
import {
  attemptLoginRequest,
} from '@/features/app-shell/core/auth/auth-api';
import {
  changeOwnPasswordRequest,
  createUserRequest,
  deleteUserRequest,
  fetchUsersListRequest,
  resetUserPasswordRequest,
  toggleUserBlockRequest,
  updateOwnProfileRequest,
  updateUserRequest,
  updateUserRoleRequest,
} from '@/features/app-shell/core/users/user-admin-api';
import { sanitizeRosterUsers } from '@/features/app-shell/core/users/user-roster-policy';
import {
  fetchAuditLogRequest,
} from '@/features/app-shell/core/shared/system-api';
import {
  applyOptimisticDelete,
  applyOptimisticRestore,
  resolveTicketRetentionDays,
} from '@/features/app-shell/core/tickets/ticket-actions';
import {
  CreateTicketDialog,
} from '@/features/app-shell/core/shared/lazy-components';
import type {
  ActivityLog,
  AgentPerformance,
  AuditLogEntry,
  CallHistory,
  ChatMessage,
  ChatMessageType,
  Conversation,
  InactivityEvent,
  InternalMessage,
  LiveReaction,
  MessagingStats,
  NotificationItem,
  PresenceStatus,
  ResponsibilityType,
  ShiftStatistics,
  Task,
  TaskCategory,
  TaskComment,
  TaskHistoryEntry,
  TaskPriority,
  TaskStatus,
  TicketAdminSettings,
  TicketAttachment,
  TicketCategory,
  TicketComment,
  TicketCountryOption,
  TicketHistory,
  TicketItem,
  TicketLocalityDraft,
  TicketManagedLocality,
  TicketOptionItem,
  TicketPriority,
  TicketStatus,
  TypingIndicator,
  UserProfile,
  UserRole,
} from '@/features/app-shell/core/shared/types';
import { NocMonitoringPanel } from '@/components/noc/NocMonitoringPanel';
import { NocMonitoringDashboard } from '@/components/noc/NocMonitoringDashboard';
import { NocClientsPanel } from '@/components/noc/NocClientsPanel';
import { NocReportingPanel } from '@/components/noc/NocReportingPanel';
import { NocGenericSectionPanel } from '@/components/noc/NocGenericSectionPanel';
import { NocSitesPanel } from '@/components/noc/NocSitesPanel';
import { NocCallCenterPanel } from '@/components/noc/NocCallCenterPanel';
import { AppLoginScreen } from '@/features/app-shell/components/auth/AppLoginScreen';
import { buildTicketArchiveOptions, buildTicketFilterOptions } from '@/features/app-shell/components/tickets/utils/ticketOptionBuilders';
import { computeTaskStats, getDisplayedTasks } from '@/features/app-shell/components/tasks/utils/taskSelectors';
import { setTaskVisibilityTag } from '@/features/app-shell/components/tasks/utils/taskVisibility';
import { deleteTaskRequest, fetchTasksRequest, createTaskRequest, updateTaskRequest } from '@/features/app-shell/core/tasks/task-api';
import { AppEmailComposeDialog } from '@/features/app-shell/components/email/dialogs/AppEmailComposeDialog';
import { AppEmailCreateGroupDialog } from '@/features/app-shell/components/email/dialogs/AppEmailCreateGroupDialog';
import { AppEmailAddCallParticipantsDialog } from '@/features/app-shell/components/email/dialogs/AppEmailAddCallParticipantsDialog';
import { AppEmailActiveCallDialog } from '@/features/app-shell/components/email/dialogs/AppEmailActiveCallDialog';
import { AppEmailChatSettingsDialog } from '@/features/app-shell/components/email/dialogs/AppEmailChatSettingsDialog';
import { AppEmailCreateStatusDialog } from '@/features/app-shell/components/email/dialogs/AppEmailCreateStatusDialog';
import { AppEmailEditMessageDialog } from '@/features/app-shell/components/email/dialogs/AppEmailEditMessageDialog';
import { AppEmailImagePreviewDialog } from '@/features/app-shell/components/email/dialogs/AppEmailImagePreviewDialog';
import { AppEmailIncomingCallDialog } from '@/features/app-shell/components/email/dialogs/AppEmailIncomingCallDialog';
import { AppEmailMyStatusesDialog } from '@/features/app-shell/components/email/dialogs/AppEmailMyStatusesDialog';
import { AppEmailNewConversationDialog } from '@/features/app-shell/components/email/dialogs/AppEmailNewConversationDialog';
import { AppEmailProfilePhotoCropDialog } from '@/features/app-shell/components/email/dialogs/AppEmailProfilePhotoCropDialog';
import { AppEmailViewStatusDialog } from '@/features/app-shell/components/email/dialogs/AppEmailViewStatusDialog';
import { PasswordSecurityGuard } from '@/features/app-shell/components/security/PasswordSecurityGuard';
import { AppTopHeader } from '@/features/app-shell/components/layout/AppTopHeader';
import { AppSidebar } from '@/features/app-shell/components/layout/AppSidebar';
import { AppMainContentSection } from '@/features/app-shell/components/layout/AppMainContentSection';
import { AppShellDialogsSection } from '@/features/app-shell/components/dialogs/AppShellDialogsSection';

// Icons
import {
  Moon, Sun, LogOut, LayoutDashboard, Calendar, Activity, Clock, Users, Settings, Bell,
  ChevronLeft, ChevronRight, ChevronDown, Phone, Monitor, FileText, AlertTriangle, CheckCircle2,
  TrendingUp, UserCheck, Plus, Download, Eye, EyeOff, RefreshCw, Menu, X, Mail, FileSpreadsheet,
  Edit, Trash2, AlertCircle, Info,
  Clock3, CalendarDays, User, Briefcase, ClipboardList, FileDown,
  ExternalLink, Truck, Network, Ticket, Globe, Coffee, Moon as MoonIcon, Search,
  Upload, Camera, XCircle, Lock, Shield, Sparkles, LogIn, Star, Inbox, Send,
  Paperclip, CornerDownLeft, CornerUpRight, Video, Mic, MicOff,
  Volume2, VolumeX, Smile, Image as ImageIcon, Film, File, MoreVertical, PhoneOff, UserPlus,
  Hash, AtSign, Pin, Archive, BellOff, Check, RotateCcw, Forward, Megaphone, Heart,
  CheckSquare, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Type, AlignLeft, AlignCenter, AlignRight, Paperclip as AttachIcon, Square, UserX,
  Minus, Maximize2, Minimize2, Highlighter, Tag, Wrench, Trophy, Flag, MapPin
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiPickerTheme, EmojiClickData } from 'emoji-picker-react';
import type { Area as CropArea } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

// Charts
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

type PlanningFilterMode = 'NOC_AGENT' | 'ALL' | 'MY_SHIFT' | 'MY_RESTS';

export default function NOCActivityApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resolvedInitialTab = (() => {
    const queryTab = searchParams.get('tab');
    return queryTab && isAppSectionKey(queryTab) ? queryTab : 'dashboard';
  })();
  // États principaux
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState<AppSectionKey>(resolvedInitialTab);
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [overtimeMonth, setOvertimeMonth] = useState(new Date());
  const [restDialogOpen, setRestDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsHydrated, setNotificationsHydrated] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: '', category: 'Monitoring', description: '' });
  
  // États pour la gestion des utilisateurs et sécurité
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email ou Pseudo
  const [showPassword, setShowPassword] = useState(false); // Toggle visibilité mot de passe
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<UserProfile | null>(null);
  const { theme, setTheme } = useTheme();
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showForgotMessage, setShowForgotMessage] = useState(false);
  const [pseudoFocused, setPseudoFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [usersManagementOpen, setUsersManagementOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editShift, setEditShift] = useState<string>('');
  const [editResponsibility, setEditResponsibility] = useState<ResponsibilityType | ''>('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [usersActionInProgress, setUsersActionInProgress] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserIsBlocked, setEditUserIsBlocked] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isUsersSyncing, setIsUsersSyncing] = useState(false);
  const [auditLogRefreshing, setAuditLogRefreshing] = useState(false);
  const [sectionAccess, setSectionAccess] = useState<Record<string, boolean>>(DEFAULT_SECTION_ACCESS);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [sidebarGroupOpen, setSidebarGroupOpen] = useState<Record<string, boolean>>({});
  const [lastActivity, setLastActivity] = useState(new Date());
  const [announcementAvatar, setAnnouncementAvatar] = useState<string | null>(null);
  const canManageUsers = Boolean(user) && (hasPermission(user, 'SUPER_ADMIN') || hasPermission(user, 'ADMIN'));
  const canManageTicketEntities = canManageTickets(user);
  const canAccessPlanning = Boolean(
    user
    && (
      user.role === 'TECHNICIEN_NO'
      || user.role === 'RESPONSABLE'
      || user.role === 'ADMIN'
      || user.role === 'SUPER_ADMIN'
    )
  );
  const canAccessNocSections = Boolean(
    user
    && (
      user.role === 'TECHNICIEN_NO'
      || user.role === 'RESPONSABLE'
      || user.role === 'ADMIN'
      || user.role === 'SUPER_ADMIN'
    )
  );
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false);
  const [ticketActionBusyKeys, setTicketActionBusyKeys] = useState<string[]>([]);
  const [ticketSiteOptions, setTicketSiteOptions] = useState<TicketOptionItem[]>([]);
  const [ticketLocalityOptions, setTicketLocalityOptions] = useState<string[]>([]);
  const [ticketTechnicianOptions, setTicketTechnicianOptions] = useState<TicketOptionItem[]>([]);
  const [ticketCongoDepartments, setTicketCongoDepartments] = useState<string[]>(CONGO_DEPARTMENTS);
  const [quickLocalityDialogOpen, setQuickLocalityDialogOpen] = useState(false);
  const [quickLocalityDraft, setQuickLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_TICKET_LOCALITY_DRAFT);
  const [quickLocalityTab, setQuickLocalityTab] = useState<'create' | 'manage'>('create');
  const [managedLocalities, setManagedLocalities] = useState<TicketManagedLocality[]>([]);
  const [managedLocalitySearch, setManagedLocalitySearch] = useState('');
  const [selectedManagedLocalityId, setSelectedManagedLocalityId] = useState<string | null>(null);
  const [managedLocalityName, setManagedLocalityName] = useState('');
  const [managedLocalityDraft, setManagedLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_TICKET_LOCALITY_DRAFT);
  const [isCreatingLocality, setIsCreatingLocality] = useState(false);
  const [isDeletingLocality, setIsDeletingLocality] = useState(false);
  const [isUpdatingLocality, setIsUpdatingLocality] = useState(false);
  const [ticketAdminSettings, setTicketAdminSettings] = useState<TicketAdminSettings>(DEFAULT_TICKET_ADMIN_SETTINGS);
  const [ticketAdminEmailsInput, setTicketAdminEmailsInput] = useState('');
  const [ticketAdminSettingsLoading, setTicketAdminSettingsLoading] = useState(false);
  const [ticketAdminSettingsSaving, setTicketAdminSettingsSaving] = useState(false);
  const [planningSettings, setPlanningSettings] = useState<NocPlanningSettings>(defaultNocPlanningSettings());
  const [planningSettingsLoading, setPlanningSettingsLoading] = useState(false);
  const [planningSettingsSaving, setPlanningSettingsSaving] = useState(false);
  const [planningFilterMode, setPlanningFilterMode] = useState<PlanningFilterMode>('NOC_AGENT');
  const [shiftAssignmentBusyUserId, setShiftAssignmentBusyUserId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
  const [editTicketLocalityDraft, setEditTicketLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_TICKET_LOCALITY_DRAFT);
  const [isEditLocalityCreationEnabled, setIsEditLocalityCreationEnabled] = useState(false);
  const [showTrashContextMenu, setShowTrashContextMenu] = useState(false);
  const [trashContextTicket, setTrashContextTicket] = useState<TicketItem | null>(null);
  const [trashContextMenuPosition, setTrashContextMenuPosition] = useState({ x: 0, y: 0 });
  const [deleteTicketDialogOpen, setDeleteTicketDialogOpen] = useState(false);
  const [deleteTicketPermanent, setDeleteTicketPermanent] = useState(false);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<TicketItem | null>(null);
  const [chatAvatarUploadTarget, setChatAvatarUploadTarget] = useState<{ mode: 'group' | 'announcement'; conversationId?: string } | null>(null);
  const [editTicketOpen, setEditTicketOpen] = useState(false);
  const [showArchivedTickets, setShowArchivedTickets] = useState(false);
  const [showDeletedTickets, setShowDeletedTickets] = useState(false);
  const [ticketViewMode, setTicketViewMode] = useState<'list' | 'card'>('list');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [ticketSiteFilter, setTicketSiteFilter] = useState('all');
  const [ticketLocaliteFilter, setTicketLocaliteFilter] = useState('all');
  const [ticketTechnicienFilter, setTicketTechnicienFilter] = useState('all');
  const [archiveYearFilter, setArchiveYearFilter] = useState<'all' | string>('all');
  const [auditLogDateFrom, setAuditLogDateFrom] = useState('');
  const [auditLogDateTo, setAuditLogDateTo] = useState('');
  const [auditLogActionType, setAuditLogActionType] = useState('all');
  const [auditLogStatusFilter, setAuditLogStatusFilter] = useState('all');
  const [auditLogUserFilter, setAuditLogUserFilter] = useState('');
  const [lastReplyTo, setLastReplyTo] = useState<ChatMessage | null>(null);
  const [simulatedTyping, setSimulatedTyping] = useState<{ userId: string; userName: string; isRecording?: boolean } | null>(null);
  const [gedDocuments, setGedDocuments] = useState<any[]>([]);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoDialogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tempAvatarObjectUrlRef = useRef<string | null>(null);
  const sidebarResizeFrameRef = useRef<number | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  const normalizePlanningRole = useCallback((value: unknown) => {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[-\s]+/g, '_');
  }, []);

  const currentUserRole = useMemo(() => normalizePlanningRole(user?.role), [normalizePlanningRole, user?.role]);
  const availablePlanningRoles = useMemo(() => {
    return Array.from(new Set(allUsers.map((entry) => normalizePlanningRole(entry.role)).filter(Boolean))).sort();
  }, [allUsers, normalizePlanningRole]);

  const canGeneratePlanningPdf = useMemo(() => {
    if (!planningSettings.permissions.enablePdfGeneration) return false;
    if (!currentUserRole) return false;
    return planningSettings.permissions.pdfAllowedRoles
      .map((role) => normalizePlanningRole(role))
      .includes(currentUserRole);
  }, [currentUserRole, normalizePlanningRole, planningSettings.permissions.enablePdfGeneration, planningSettings.permissions.pdfAllowedRoles]);

  const canViewPlanningIndividualRest = useMemo(() => {
    if (!currentUserRole) return false;
    return planningSettings.visibility.individualRestVisibleRoles
      .map((role) => normalizePlanningRole(role))
      .includes(currentUserRole);
  }, [currentUserRole, normalizePlanningRole, planningSettings.visibility.individualRestVisibleRoles]);

  const planningPdfDisabledReason = useMemo(() => {
    if (canGeneratePlanningPdf) return '';
    if (!planningSettings.permissions.enablePdfGeneration) {
      return 'La génération PDF planning est désactivée par l\'administration.';
    }
    return 'Votre rôle n\'est pas autorisé à générer le PDF planning.';
  }, [canGeneratePlanningPdf, planningSettings.permissions.enablePdfGeneration]);
  const seenIncomingMessageIdsByConversationRef = useRef<Record<string, Set<string>>>({});
  const isTicketActionBusy = useCallback((action: 'delete' | 'permanent' | 'restore', ticketId: string) => {
    return isTicketActionBusyKey(ticketActionBusyKeys, action, ticketId);
  }, [ticketActionBusyKeys]);
  const setTicketActionBusy = useCallback((actionKey: string, busy: boolean) => {
    setTicketActionBusyKeys((prev) => updateTicketActionBusyKeys(prev, actionKey, busy));
  }, []);
  const setCurrentTabSafely = useCallback((tab: AppSectionKey) => {
    if (tab === 'planning' && !canAccessPlanning) {
      setCurrentTab('dashboard');
      return;
    }

    if (isNocSection(tab) && !canAccessNocSections) {
      setCurrentTab('dashboard');
      return;
    }

    setCurrentTab(tab);
  }, [canAccessNocSections, canAccessPlanning]);
  const usersDirectory = allUsers;
  const isAdminPasswordResetMode = Boolean(selectedUser && selectedUser.id !== user?.id);

  useEffect(() => {
    const fromDirectory = getTicketTechnicianOptions(usersDirectory);
    const fallbackNames = Array.from(
      new Set(
        tickets
          .flatMap((ticket) => splitTicketValues(ticket.technicien))
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && name !== '-')
      )
    ).sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }));

    const fallbackOptions = fallbackNames.map((name) => ({
      id: `fallback-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
    }));

    const mergedByName = new Map<string, { id: string; name: string }>();
    [...fromDirectory, ...fallbackOptions].forEach((entry) => {
      const key = entry.name.trim().toLowerCase();
      if (!key) return;
      if (!mergedByName.has(key)) {
        mergedByName.set(key, { id: entry.id, name: entry.name });
      }
    });

    setTicketTechnicianOptions(Array.from(mergedByName.values()));
  }, [tickets, usersDirectory]);

  // États pour le module Tâches NOC
  const [nocTasks, setNocTasks] = useState<Task[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'my' | 'pending' | 'late' | 'critical'>('my');
  const [taskDateFilter, setTaskDateFilter] = useState<Date>(new Date());
  const [ganttView, setGanttView] = useState<'day' | 'week'>('day');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    linkedTicketId: '',
    linkedTicketNumero: '',
    linkedTicketObjet: '',
    visibility: 'public' as 'public' | 'private',
    priority: 'medium' as TaskPriority,
    category: 'other' as TaskCategory,
    startTime: new Date(),
    estimatedDuration: 60,
    tags: '',
  });
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [taskAlerts, setTaskAlerts] = useState<any[]>([]);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [inactivityEvents, setInactivityEvents] = useState<InactivityEvent[]>([]);
  const [lastUserActivity, setLastUserActivity] = useState<Date>(new Date());
  const [isUserInactive, setIsUserInactive] = useState(false);
  const [agentPerformances, setAgentPerformances] = useState<AgentPerformance[]>([]);
  const [performancePeriod, setPerformancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAgentForStats, setSelectedAgentForStats] = useState<string | null>(null);
  const [shiftStats, setShiftStats] = useState<ShiftStatistics | null>(null);
  const [supervisionView, setSupervisionView] = useState<'tasks' | 'gantt' | 'performance' | 'alerts'>('tasks');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [nocOverviewData, setNocOverviewData] = useState<any | null>(null);
  const [nocOverviewLoading, setNocOverviewLoading] = useState(false);
  const [monitoringScope, setMonitoringScope] = useState<'down' | 'up' | 'all'>('all');
  const [monitoringDrilldown, setMonitoringDrilldown] = useState<'network' | 'clients' | 'alerts' | 'sla' | null>(null);
  const [nocReportData, setNocReportData] = useState<any | null>(null);

  useEffect(() => {
    const queryTab = searchParams.get('tab');
    if (!queryTab || !isAppSectionKey(queryTab)) {
      return;
    }

    if (queryTab === 'planning' && !canAccessPlanning) {
      setCurrentTab((previousTab) => (previousTab === 'dashboard' ? previousTab : 'dashboard'));
      return;
    }

    if (isNocSection(queryTab) && !canAccessNocSections) {
      setCurrentTab((previousTab) => (previousTab === 'dashboard' ? previousTab : 'dashboard'));
      return;
    }

    setCurrentTab((previousTab) => (previousTab === queryTab ? previousTab : queryTab));
  }, [canAccessNocSections, canAccessPlanning, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user) return;
    if (restoredCurrentTabRef.current) return;

    restoredCurrentTabRef.current = true;

    const queryTab = searchParams.get('tab');
    if (queryTab && isAppSectionKey(queryTab)) {
      return;
    }

    const storedTab = localStorage.getItem(getCurrentTabStorageKey(user.id));
    if (!storedTab || !isAppSectionKey(storedTab)) {
      return;
    }

    if (storedTab === 'planning' && !canAccessPlanning) {
      setCurrentTab('dashboard');
      return;
    }

    if (isNocSection(storedTab) && !canAccessNocSections) {
      setCurrentTab('dashboard');
      return;
    }

    setCurrentTab((previousTab) => (previousTab === storedTab ? previousTab : storedTab));
  }, [canAccessNocSections, canAccessPlanning, isAuthenticated, searchParams, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user) return;
    localStorage.setItem(getCurrentTabStorageKey(user.id), currentTab);
  }, [currentTab, isAuthenticated, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user?.id) return;
    if (restoredPlanningFilterUserIdRef.current === user.id) return;

    restoredPlanningFilterUserIdRef.current = user.id;
    const stored = localStorage.getItem(getPlanningFilterStorageKey(user.id));
    if (stored === 'NOC_AGENT' || stored === 'ALL' || stored === 'MY_SHIFT' || stored === 'MY_RESTS') {
      setPlanningFilterMode(stored);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user?.id) return;
    localStorage.setItem(getPlanningFilterStorageKey(user.id), planningFilterMode);
  }, [isAuthenticated, planningFilterMode, user?.id]);

  const refreshNocOverview = useCallback(async () => {
    setNocOverviewLoading(true);
    try {
      const data = await fetchNocOverviewRequest();
      setNocOverviewData(data);
    } catch (error) {
      console.error('Erreur synchronisation NOC overview', error);
      toast.error('Erreur', { description: 'Impossible de synchroniser les indicateurs NOC.' });
    } finally {
      setNocOverviewLoading(false);
    }
  }, []);

  const handleMonitoringKpiClick = useCallback((kpiKey: 'network' | 'clients' | 'alerts' | 'sla') => {
    setMonitoringDrilldown(kpiKey);
    setMonitoringScope(kpiKey === 'network' ? 'down' : 'all');
  }, []);

  const generateConsumptionReport = useCallback(async () => {
    try {
      const report = await fetchNocMonthlyConsumptionRequest();
      setNocReportData(report);
      toast.success('Rapport genere avec succes');
    } catch (error) {
      console.error('Erreur generation rapport NOC', error);
      toast.error('Erreur', { description: 'Impossible de generer le rapport de consommation.' });
    }
  }, []);

  // États pour la Messagerie Interne (Gmail-like)
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts' | 'spam' | 'trash'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<InternalMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<InternalMessage | null>(null);
  const [newEmail, setNewEmail] = useState({
    to: [] as Array<{ id: string; name: string; email: string }>,
    cc: [] as Array<{ id: string; name: string; email: string }>,
    bcc: [] as Array<{ id: string; name: string; email: string }>,
    subject: '',
    body: '',
    attachments: [] as any[],
    priority: 'normal' as any,
    scheduledAt: null as Date | null,
  });
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<'to' | 'cc' | 'bcc' | null>(null);
  const [emailLabels, setEmailLabels] = useState<any[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [emailSignature, setEmailSignature] = useState<any | null>(null);
  const [emailViewMode, setEmailViewMode] = useState<'list' | 'conversation'>('list');
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [snoozedEmails, setSnoozedEmails] = useState<Map<string, Date>>(new Map());
  const [importantEmails, setImportantEmails] = useState<Set<string>>(new Set());
  const [gmailSettingsOpen, setGmailSettingsOpen] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [vacationResponder, setVacationResponder] = useState({
    enabled: false,
    subject: '',
    body: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [emailSettings, setEmailSettings] = useState({
    signature: '',
    requestReadReceipt: false,
    confidentialMode: false,
    priority: 'normal' as 'low' | 'normal' | 'high',
  });
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({
    from: '',
    to: '',
    subject: '',
    hasAttachment: false,
    beforeDate: null as Date | null,
    afterDate: null as Date | null,
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
    align: 'left' as 'left' | 'center' | 'right',
  });
  const [emailNotifications, setEmailNotifications] = useState({
    soundEnabled: true,
    browserNotifications: false,
    newEmailSound: true,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectMode, setSelectMode] = useState<'none' | 'some' | 'all'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 25;

  // États pour la Messagerie Instantanée (WhatsApp-style)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, PresenceStatus>>(() => {
    const initial: Record<string, PresenceStatus> = {};
    Object.values(DEMO_USERS).forEach((u) => {
      initial[u.id] = u.isActive ? 'online' : 'offline';
    });
    return initial;
  });
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [activeCall, setActiveCall] = useState<CallHistory | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallHistory | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState<ChatMessage | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // États pour le suivi des tentatives de connexion et verrouillage progressif
  type AttachmentPreview = {
    file: File | null;
    preview: string | null;
    type: 'image' | 'video' | 'document' | null;
    fileType?: string;
  };
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview>({ file: null, preview: null, type: null, fileType: undefined });
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [chatImagePreview, setChatImagePreview] = useState<{ url: string; fileName?: string; message: ChatMessage } | null>(null);
  const [chatImageZoom, setChatImageZoom] = useState(1);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const skipNextSmoothScrollRef = useRef(false);
  
  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLiveReactionPicker, setShowLiveReactionPicker] = useState(false);
  const [showCallReactionPicker, setShowCallReactionPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => getStoredRecentEmojis());
  const [isCompactEmojiLayout, setIsCompactEmojiLayout] = useState(false);
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([]);
  
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
  const [profileCrop, setProfileCrop] = useState({ x: 0, y: 0 });
  const [profileZoom, setProfileZoom] = useState(1.2);
  const [profileCroppedAreaPixels, setProfileCroppedAreaPixels] = useState<CropArea | null>(null);
  const [hideSecurityBanner, setHideSecurityBanner] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [avatarViewerData, setAvatarViewerData] = useState<{ src: string; name: string } | null>(null);
  
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
  const callRingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [heldCall, setHeldCall] = useState<CallHistory | null>(null);
  const [conferenceEnabled, setConferenceEnabled] = useState(false);
  const [busyUsers, setBusyUsers] = useState<Record<string, boolean>>({});
  const callChannelRef = useRef<BroadcastChannel | null>(null);
  const typingChannelRef = useRef<BroadcastChannel | null>(null);
  const reactionChannelRef = useRef<BroadcastChannel | null>(null);
  const typingStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    color: '#000000',
  });
  const [mounted, setMounted] = useState(false);
  const initializedRef = useRef(false);
  const restoredCurrentTabRef = useRef(false);
  const restoredPlanningFilterUserIdRef = useRef<string | null>(null);

  const playCallTone = useCallback(
    (tone: 'ring' | 'connected' | 'missed' | 'busy' | 'ended' | 'incoming') => {
      if (!soundEnabled) return;
      if (typeof window === 'undefined') return;

      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const playBeep = (frequency: number, durationMs: number, delayMs = 0) => {
        window.setTimeout(() => {
          const context = new AudioContextCtor();
          const oscillator = context.createOscillator();
          const gain = context.createGain();

          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.value = 0.05;

          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();

          window.setTimeout(() => {
            oscillator.stop();
            void context.close();
          }, durationMs);
        }, delayMs);
      };

      if (tone === 'ring' || tone === 'incoming') {
        playBeep(650, 120, 0);
        playBeep(520, 160, 180);
        return;
      }
      if (tone === 'connected') {
        playBeep(880, 120, 0);
        playBeep(1100, 140, 140);
        return;
      }
      if (tone === 'missed') {
        playBeep(340, 220, 0);
        playBeep(280, 220, 260);
        return;
      }
      if (tone === 'busy') {
        playBeep(420, 150, 0);
        playBeep(420, 150, 220);
        playBeep(420, 150, 440);
        return;
      }

      playBeep(500, 120, 0);
    },
    [soundEnabled]
  );

  const clearCallTimeouts = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (callRingIntervalRef.current) {
      clearInterval(callRingIntervalRef.current);
      callRingIntervalRef.current = null;
    }
  }, []);

  const markUsersBusy = useCallback((call: CallHistory, isBusy: boolean) => {
    const calleeIds = call.calleeId.split(',').map((id) => id.trim()).filter(Boolean);
    setBusyUsers((prev) => {
      const next = { ...prev };
      next[call.callerId] = isBusy;
      calleeIds.forEach((id) => {
        next[id] = isBusy;
      });
      return next;
    });
  }, []);

  const pushCallNotification = useCallback(
    (message: string, type: NotificationItem['type'], conversationId?: string) => {
      const notif: NotificationItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        type,
        read: false,
        createdAt: new Date(),
        conversationId,
      };
      setNotifications((prev) => prependNotification(prev, notif));
    },
    []
  );

  const addNotification = useCallback(
    (
      message: string,
      type: NotificationItem['type'],
      options?: { conversationId?: string; messageId?: string }
    ) => {
      const notif: NotificationItem = {
        id: Date.now().toString(),
        message,
        type,
        read: false,
        createdAt: new Date(),
        conversationId: options?.conversationId,
        messageId: options?.messageId,
      };

      setNotifications((prev) => {
        return prependNotificationIfMissingMessage(prev, notif, options);
      });
    },
    []
  );

  const closeCallSession = useCallback(
    (
      reason: 'ended' | 'missed' | 'declined',
      message?: string,
      callOverride?: CallHistory
    ) => {
      const callToClose = callOverride || activeCall;
      if (!callToClose) return;

      clearCallTimeouts();
      markUsersBusy(callToClose, false);

      const computedStatus: CallHistory['status'] =
        reason === 'missed'
          ? 'missed'
          : reason === 'declined'
          ? 'declined'
          : callState === 'connected'
          ? 'answered'
          : 'declined';

      const durationSec =
        callState === 'connected' && callStartTime
          ? Math.max(0, Math.floor((Date.now() - callStartTime.getTime()) / 1000))
          : 0;

      setCallHistory((prev) => [
        {
          ...callToClose,
          status: computedStatus,
          duration: durationSec,
          endedAt: new Date(),
        },
        ...prev,
      ]);

      if (message) {
        pushCallNotification(
          message,
          reason === 'missed' ? 'warning' : 'info',
          callToClose.conversationId
        );
      }

      if (reason === 'missed') {
        playCallTone('missed');
      } else {
        playCallTone('ended');
      }

      setCallDialogOpen(false);
      setActiveCall(null);
      setIncomingCall(null);
      setHeldCall(null);
      setConferenceEnabled(false);
      setShowCallReactionPicker(false);
      setCallParticipants([]);
      setLiveReactions((prev) => prev.filter((item) => item.callId !== callToClose.id));
      setCallTimer(0);
      setCallState('ended');
      setCallStartTime(null);
    },
    [
      activeCall,
      callStartTime,
      callState,
      clearCallTimeouts,
      markUsersBusy,
      playCallTone,
      pushCallNotification,
    ]
  );

  const emitCallSignal = useCallback((payload: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const envelope = {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sentAt: Date.now(),
    };
    localStorage.setItem('noc_call_signal', JSON.stringify(envelope));
    callChannelRef.current?.postMessage(envelope);
    window.dispatchEvent(new CustomEvent('noc-call-signal', { detail: envelope }));
  }, []);

  const emitTypingSignal = useCallback(
    (payload: {
      conversationId: string;
      fromUserId: string;
      fromUserName: string;
      toUserIds: string[];
      isTyping: boolean;
      isRecording?: boolean;
    }) => {
      if (typeof window === 'undefined') return;
      const envelope = {
        signalType: 'typing',
        ...payload,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sentAt: Date.now(),
      };
      localStorage.setItem('noc_typing_signal', JSON.stringify(envelope));
      typingChannelRef.current?.postMessage(envelope);
      window.dispatchEvent(new CustomEvent('noc-typing-signal', { detail: envelope }));
    },
    []
  );

  const broadcastTypingStatus = useCallback(
    (options: { isTyping: boolean; isRecording?: boolean }) => {
      if (!selectedConversation || !user?.id || !user?.name) return;
      const targetUserIds = selectedConversation.participants
        .map((participant) => participant.id)
        .filter((id) => id && id !== user.id);
      if (targetUserIds.length === 0) return;

      emitTypingSignal({
        conversationId: selectedConversation.id,
        fromUserId: user.id,
        fromUserName: user.name,
        toUserIds: targetUserIds,
        isTyping: options.isTyping,
        isRecording: Boolean(options.isRecording),
      });
    },
    [emitTypingSignal, selectedConversation, user?.id, user?.name]
  );

  const registerRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const next = mergeRecentEmojis(prev, emoji);
      if (typeof window !== 'undefined') {
        localStorage.setItem('noc_recent_emojis', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const emitReactionSignal = useCallback((payload: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const envelope = {
      signalType: 'live_reaction',
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sentAt: Date.now(),
    };
    localStorage.setItem('noc_reaction_signal', JSON.stringify(envelope));
    reactionChannelRef.current?.postMessage(envelope);
    window.dispatchEvent(new CustomEvent('noc-reaction-signal', { detail: envelope }));
  }, []);

  const pushLiveReaction = useCallback(
    (reaction: {
      emoji: string;
      conversationId: string;
      callId?: string;
      userId: string;
      userName: string;
    }) => {
      setLiveReactions((prev) => {
        const next: LiveReaction[] = [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            emoji: reaction.emoji,
            userId: reaction.userId,
            userName: reaction.userName,
            conversationId: reaction.conversationId,
            callId: reaction.callId,
            createdAt: new Date(),
          },
        ];
        return next.slice(-40);
      });
    },
    []
  );

  const broadcastLiveReaction = useCallback(
    (emoji: string, scope: 'chat' | 'call') => {
      if (!emoji || !user?.id || !user?.name) return;

      if (scope === 'call' && activeCall) {
        const targetUserIds = Array.from(
          new Set(
            [
              activeCall.callerId,
              ...activeCall.calleeId.split(',').map((id) => id.trim()).filter(Boolean),
            ].filter((id) => id && id !== user.id)
          )
        );

        pushLiveReaction({
          emoji,
          conversationId: activeCall.conversationId,
          callId: activeCall.id,
          userId: user.id,
          userName: user.name,
        });
        emitReactionSignal({
          fromUserId: user.id,
          fromUserName: user.name,
          toUserIds: targetUserIds,
          conversationId: activeCall.conversationId,
          callId: activeCall.id,
          emoji,
        });
        registerRecentEmoji(emoji);
        return;
      }

      if (!selectedConversation) return;

      const targetUserIds = selectedConversation.participants
        .map((participant) => participant.id)
        .filter((id) => id && id !== user.id);

      pushLiveReaction({
        emoji,
        conversationId: selectedConversation.id,
        userId: user.id,
        userName: user.name,
      });
      emitReactionSignal({
        fromUserId: user.id,
        fromUserName: user.name,
        toUserIds: targetUserIds,
        conversationId: selectedConversation.id,
        emoji,
      });
      registerRecentEmoji(emoji);
    },
    [activeCall, emitReactionSignal, pushLiveReaction, registerRecentEmoji, selectedConversation, user?.id, user?.name]
  );

  const startOutgoingCall = useCallback(
    (target: {
      conversationId: string;
      calleeId: string;
      calleeName: string;
      type: 'audio' | 'video';
    }) => {
      if (!user?.id || !user?.name) return;

      if (activeCall && callDialogOpen) {
        toast.error('Vous avez déjà un appel en cours');
        return;
      }

      const calleeIds = target.calleeId.split(',').map((id) => id.trim()).filter(Boolean);
      const busyTargetId = calleeIds.find((id) => busyUsers[id]);
      if (busyTargetId) {
        const busyName =
          Object.values(DEMO_USERS).find((u) => u.id === busyTargetId)?.name || target.calleeName;
        const message = `Désolé, ${busyName} est déjà occupé`;
        toast.error(message);
        addNotification(message, 'warning', { conversationId: target.conversationId });
        playCallTone('busy');
        return;
      }

      const newCall: CallHistory = {
        id: generateId(),
        conversationId: target.conversationId,
        callerId: user.id,
        callerName: user.name,
        calleeId: target.calleeId,
        calleeName: target.calleeName,
        type: target.type,
        status: 'ongoing',
        startedAt: new Date(),
      };

      markUsersBusy(newCall, true);
      setActiveCall(newCall);
      setIncomingCall(null);
      setHeldCall(null);
      setConferenceEnabled(false);
      setCallDialogOpen(true);
      setCallState('calling');
      setCallTimer(0);
      setCallStartTime(null);

      addNotification(
        `Appel ${target.type === 'video' ? 'vidéo' : 'audio'} vers ${target.calleeName}`,
        'info',
        { conversationId: target.conversationId }
      );

      emitCallSignal({
        signalType: 'call_request',
        callId: newCall.id,
        fromUserId: user.id,
        fromUserName: user.name,
        toUserIds: calleeIds,
        conversationId: target.conversationId,
        callMediaType: target.type,
      });

      playCallTone('ring');
    },
    [activeCall, addNotification, busyUsers, callDialogOpen, emitCallSignal, markUsersBusy, playCallTone, user]
  );

  const handleIncomingCallAction = useCallback(
    (action: 'accept' | 'reject' | 'ignore') => {
      if (!incomingCall) return;

      clearCallTimeouts();

      if (action === 'accept') {
        if (activeCall && callDialogOpen && callState === 'connected') {
          setHeldCall(activeCall);
          setConferenceEnabled(false);
        }

        markUsersBusy(incomingCall, true);
        setActiveCall(incomingCall);
        setIncomingCall(null);
        setCallDialogOpen(true);
        setCallState('connected');
        setCallStartTime(new Date());
        setCallTimer(0);
        playCallTone('connected');

        const acceptedMsg = `Appel accepté avec ${incomingCall.callerName}`;
        pushCallNotification(acceptedMsg, 'success', incomingCall.conversationId);
        addNotification(acceptedMsg, 'success', { conversationId: incomingCall.conversationId });
        emitCallSignal({
          signalType: 'call_response',
          callId: incomingCall.id,
          fromUserId: user?.id,
          fromUserName: user?.name,
          toUserId: incomingCall.callerId,
          conversationId: incomingCall.conversationId,
          response: 'accepted',
        });
        return;
      }

      markUsersBusy(incomingCall, false);
      setIncomingCall(null);

      if (action === 'reject') {
        const rejectedMsg = 'Appel rejeté';
        playCallTone('ended');
        pushCallNotification(rejectedMsg, 'warning', incomingCall.conversationId);
        addNotification(rejectedMsg, 'warning', { conversationId: incomingCall.conversationId });
        emitCallSignal({
          signalType: 'call_response',
          callId: incomingCall.id,
          fromUserId: user?.id,
          fromUserName: user?.name,
          toUserId: incomingCall.callerId,
          conversationId: incomingCall.conversationId,
          response: 'rejected',
        });
        return;
      }

      const ignoredMsg = "La personne n'est pas apte pour répondre pour l'instant";
      playCallTone('missed');
      pushCallNotification(ignoredMsg, 'warning', incomingCall.conversationId);
      addNotification(ignoredMsg, 'warning', { conversationId: incomingCall.conversationId });
      emitCallSignal({
        signalType: 'call_response',
        callId: incomingCall.id,
        fromUserId: user?.id,
        fromUserName: user?.name,
        toUserId: incomingCall.callerId,
        conversationId: incomingCall.conversationId,
        response: 'ignored',
      });
    },
    [
      activeCall,
      addNotification,
      callDialogOpen,
      callState,
      clearCallTimeouts,
      incomingCall,
      markUsersBusy,
      playCallTone,
      pushCallNotification,
      emitCallSignal,
      user?.id,
      user?.name,
    ]
  );

  // Effects
  useEffect(() => {
    if (!chatImagePreview) {
      setChatImageZoom(1);
    }
  }, [chatImagePreview]);

  useEffect(() => {
    if (!selectedConversation) return;

    setShowEmojiPicker(false);
    setShowLiveReactionPicker(false);
    skipNextSmoothScrollRef.current = true;

    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      setShowScrollToBottom(false);
    });
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation || showScrollToBottom) return;
    if (skipNextSmoothScrollRef.current) {
      skipNextSmoothScrollRef.current = false;
      return;
    }

    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [chatMessages.length, selectedConversation?.id, showScrollToBottom]);

  useEffect(() => {
    if (!incomingCall) return;

    playCallTone('incoming');
    toast.info(`Appel entrant de ${incomingCall.callerName}`);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Appel entrant', {
          body: `${incomingCall.callerName} (${incomingCall.type === 'video' ? 'vidéo' : 'audio'})`,
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
    pushCallNotification(
      `Appel entrant ${incomingCall.type === 'video' ? 'vidéo' : 'audio'} de ${incomingCall.callerName}`,
      'info',
      incomingCall.conversationId
    );

    if (callRingIntervalRef.current) {
      clearInterval(callRingIntervalRef.current);
      callRingIntervalRef.current = null;
    }
    callRingIntervalRef.current = setInterval(() => {
      playCallTone('incoming');
    }, 2200);

    callTimeoutRef.current = setTimeout(() => {
      handleIncomingCallAction('ignore');
    }, 60000);

    return () => {
      if (callRingIntervalRef.current) {
        clearInterval(callRingIntervalRef.current);
        callRingIntervalRef.current = null;
      }
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    };
  }, [incomingCall, handleIncomingCallAction, playCallTone, pushCallNotification]);

  useEffect(() => {
    if (!user?.id) return;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!callChannelRef.current) {
        callChannelRef.current = new BroadcastChannel('noc-call-events');
      }
    }

    const handleSignalEnvelope = (signal: any) => {
      const incomingRequest = getIncomingCallRequest(signal, user.id);
      if (incomingRequest) {
        if (activeCall || callDialogOpen || busyUsers[user.id]) {
          emitCallSignal({
            signalType: 'call_response',
            callId: incomingRequest.callId,
            fromUserId: user.id,
            fromUserName: user.name,
            toUserId: incomingRequest.fromUserId,
            conversationId: incomingRequest.conversationId,
            response: 'busy',
          });
          return;
        }

        const incoming = buildIncomingCallFromRequest(
          incomingRequest,
          user.id,
          user.name || 'Vous',
          selectedConversation?.id || '',
          generateId()
        );

        setIncomingCall(incoming);
        addNotification(
          `Appel entrant ${incoming.type === 'video' ? 'vidéo' : 'audio'} de ${incoming.callerName}`,
          'info',
          { conversationId: incoming.conversationId }
        );
        return;
      }

      if (activeCall) {
        const incomingResponse = getIncomingCallResponse(signal, user.id, activeCall.id);
        if (!incomingResponse) return;

        const response = incomingResponse.response;
        const fromName = incomingResponse.fromName || activeCall.calleeName || 'Correspondant';

        if (response === 'accepted') {
          setCallState('connected');
          setCallStartTime(new Date());
          setCallTimer(0);
          playCallTone('connected');
          addNotification('Appel accepté', 'success', { conversationId: activeCall.conversationId });
          return;
        }

        if (response === 'rejected') {
          closeCallSession('declined', 'Appel réjeté', activeCall);
          return;
        }

        if (response === 'busy') {
          closeCallSession('declined', `Désolé ${fromName} est déjà occupé`, activeCall);
          playCallTone('busy');
          return;
        }

        closeCallSession('missed', "La personne n'est pas apte pour répondre pour l'instant", activeCall);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'noc_call_signal' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        handleSignalEnvelope(parsed);
      } catch {
        // ignore malformed payload
      }
    };

    const onCustom = (event: Event) => {
      const custom = event as CustomEvent;
      handleSignalEnvelope(custom.detail);
    };

    const channel = callChannelRef.current;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        handleSignalEnvelope(event.data);
      };
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('noc-call-signal', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('noc-call-signal', onCustom as EventListener);
      if (channel) {
        channel.onmessage = null;
      }
    };
  }, [
    user?.id,
    user?.name,
    activeCall,
    callDialogOpen,
    busyUsers,
    emitCallSignal,
    selectedConversation?.id,
    addNotification,
    closeCallSession,
    playCallTone,
  ]);

  useEffect(() => {
    if (!user?.id) return;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!typingChannelRef.current) {
        typingChannelRef.current = new BroadcastChannel('noc-typing-events');
      }
    }

    const applyTypingSignal = (signal: any) => {
      const incomingSignal = getIncomingTypingSignal(signal, user.id);
      if (!incomingSignal) return;

      setTypingIndicators((prev) => applyIncomingTypingSignal(prev, incomingSignal));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'noc_typing_signal' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        applyTypingSignal(parsed);
      } catch {
        // ignore malformed payload
      }
    };

    const onCustom = (event: Event) => {
      const custom = event as CustomEvent;
      applyTypingSignal(custom.detail);
    };

    const channel = typingChannelRef.current;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        applyTypingSignal(event.data);
      };
    }

    const staleCleanup = setInterval(() => {
      const now = Date.now();
      setTypingIndicators((prev) => cleanupStaleTypingIndicators(prev, now));
    }, 1500);

    window.addEventListener('storage', onStorage);
    window.addEventListener('noc-typing-signal', onCustom as EventListener);

    return () => {
      clearInterval(staleCleanup);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('noc-typing-signal', onCustom as EventListener);
      if (channel) {
        channel.onmessage = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!reactionChannelRef.current) {
        reactionChannelRef.current = new BroadcastChannel('noc-reaction-events');
      }
    }

    const applyReactionSignal = (signal: any) => {
      const incomingSignal = getIncomingReactionSignal(signal, user.id);
      if (!incomingSignal) return;

      pushLiveReaction(incomingSignal);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'noc_reaction_signal' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        applyReactionSignal(parsed);
      } catch {
        // ignore malformed payload
      }
    };

    const onCustom = (event: Event) => {
      const custom = event as CustomEvent;
      applyReactionSignal(custom.detail);
    };

    const channel = reactionChannelRef.current;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        applyReactionSignal(event.data);
      };
    }

    const staleCleanup = setInterval(() => {
      const now = Date.now();
      setLiveReactions((prev) => cleanupStaleLiveReactions(prev, now));
    }, 1000);

    window.addEventListener('storage', onStorage);
    window.addEventListener('noc-reaction-signal', onCustom as EventListener);

    return () => {
      clearInterval(staleCleanup);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('noc-reaction-signal', onCustom as EventListener);
      if (channel) {
        channel.onmessage = null;
      }
    };
  }, [pushLiveReaction, user?.id]);

  useEffect(() => {
    return () => {
      if (callChannelRef.current) {
        callChannelRef.current.close();
        callChannelRef.current = null;
      }
      if (typingChannelRef.current) {
        typingChannelRef.current.close();
        typingChannelRef.current = null;
      }
      if (reactionChannelRef.current) {
        reactionChannelRef.current.close();
        reactionChannelRef.current = null;
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCompactEmojiLayout = () => {
      setIsCompactEmojiLayout(window.innerWidth < 640);
    };

    updateCompactEmojiLayout();
    window.addEventListener('resize', updateCompactEmojiLayout);

    return () => {
      window.removeEventListener('resize', updateCompactEmojiLayout);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem('noc_notifications');
    if (!raw) {
      setNotificationsHydrated(true);
      return;
    }

    try {
      setNotifications(parseStoredNotifications(raw));
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const storedUser = localStorage.getItem('noc_user');
      if (storedUser) {
        const parsedUser = parseStoredUser(storedUser);
        if (parsedUser) {
          void Promise.resolve().then(() => {
            setUser(parsedUser);
            setIsAuthenticated(true);
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !notificationsHydrated) return;

    let cancelled = false;

    const loadTasks = async () => {
      try {
        const tasksFromApi = await fetchTasksRequest();
        if (cancelled) return;
        const nextTasks = tasksFromApi.length > 0 ? tasksFromApi : buildInitialTasks();
        setNocTasks(nextTasks);
        setTaskAlerts(nextTasks.flatMap((task) => task.alerts ?? []));
      } catch {
        if (cancelled) return;
        setNocTasks(buildInitialTasks());
      }
    };

    void loadTasks();

    if (notifications.length === 0) {
      setNotifications(buildDefaultNotifications());
    }

    const timer = setTimeout(() => {
      if (!cancelled) {
        setActivities((currentActivities) => (currentActivities.length > 0 ? currentActivities : buildInitialActivities()));
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthenticated, notifications.length, notificationsHydrated, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !notificationsHydrated) return;
    localStorage.setItem('noc_notifications', JSON.stringify(notifications));
  }, [notifications, notificationsHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('noc_section_access', JSON.stringify(sectionAccess));
  }, [sectionAccess]);

  // Charger les utilisateurs, logs et tickets depuis localStorage
  useEffect(() => {
    const loadData = () => {
      const bootstrapData = readBootstrapLocalData({
        storage: localStorage,
        defaultSectionAccess: DEFAULT_SECTION_ACCESS,
        demoUsers: Object.values(DEMO_USERS),
      });

      if (bootstrapData.allUsers) {
        setAllUsers(sanitizeRosterUsers(bootstrapData.allUsers));
      }

      if (bootstrapData.usersToPersist) {
        localStorage.setItem('noc_all_users', JSON.stringify(sanitizeRosterUsers(bootstrapData.usersToPersist)));
      }

      if (bootstrapData.auditLogs) {
        setAuditLogs(bootstrapData.auditLogs);
      }

      if (bootstrapData.sectionAccess) {
        setSectionAccess(bootstrapData.sectionAccess);
      }

      if (bootstrapData.announcementAvatar) {
        setAnnouncementAvatar(bootstrapData.announcementAvatar);
      }

    };
    
    // Utiliser un timeout pour éviter le setState synchrone
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, []);

  const syncUsersFromApi = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    setIsUsersSyncing(true);
    try {
      const usersFromApi = await fetchUsersListRequest();
      if (!usersFromApi) return;

      const safeUsers = sanitizeRosterUsers(usersFromApi);
      setAllUsers(safeUsers);
      localStorage.setItem('noc_all_users', JSON.stringify(safeUsers));
    } catch {
      // fallback to current local cache
    } finally {
      setIsUsersSyncing(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void syncUsersFromApi();
  }, [syncUsersFromApi]);

  const loadTicketAdminSettings = useCallback(async () => {
    if (!canManageUsers) return;
    setTicketAdminSettingsLoading(true);
    try {
      const payload = await fetchTicketAdminSettingsRequest();
      const nextSettings: TicketAdminSettings = normalizeTicketAdminSettings(payload);
      setTicketAdminSettings(nextSettings);
      setTicketAdminEmailsInput(nextSettings.notificationEmails.join(', '));
    } catch {
      toast.error('Paramètres Tickets indisponibles', {
        description: 'Impossible de charger la configuration des tickets.',
      });
    } finally {
      setTicketAdminSettingsLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (currentTab !== 'admin' || !canManageUsers) return;
    void loadTicketAdminSettings();
  }, [currentTab, canManageUsers, loadTicketAdminSettings]);

  const loadPlanningSettings = useCallback(async () => {
    setPlanningSettingsLoading(true);
    try {
      const response = await fetch('/api/noc/planning-settings', { cache: 'no-store' });
      if (!response.ok) throw new Error('planning_settings_load_failed');
      const payload = await response.json().catch(() => ({}));
      if (payload?.settings) {
        setPlanningSettings((prev) => ({
          ...prev,
          ...payload.settings,
          permissions: {
            ...prev.permissions,
            ...(payload.settings?.permissions ?? {}),
          },
          visibility: {
            ...prev.visibility,
            ...(payload.settings?.visibility ?? {}),
          },
        }));
      }
    } catch {
      toast.error('Paramètres Planning indisponibles', {
        description: 'Impossible de charger la configuration du planning.',
      });
    } finally {
      setPlanningSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadPlanningSettings();
  }, [isAuthenticated, loadPlanningSettings]);

  useEffect(() => {
    if ((currentTab !== 'admin' && currentTab !== 'admin_users') || !canManageUsers) return;
    void loadPlanningSettings();
  }, [currentTab, canManageUsers, loadPlanningSettings]);

  const savePlanningSettings = useCallback(async () => {
    if (!canManageUsers || !user?.id) return;
    setPlanningSettingsSaving(true);
    try {
      const response = await fetch('/api/noc/planning-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user.id, settings: planningSettings }),
      });

      if (!response.ok) throw new Error('planning_settings_save_failed');

      const payload = await response.json().catch(() => ({}));
      if (payload?.settings) {
        setPlanningSettings((prev) => ({
          ...prev,
          ...payload.settings,
          permissions: {
            ...prev.permissions,
            ...(payload.settings?.permissions ?? {}),
          },
          visibility: {
            ...prev.visibility,
            ...(payload.settings?.visibility ?? {}),
          },
        }));
      }
      toast.success('Paramètres Planning enregistrés');
    } catch {
      toast.error('Enregistrement impossible', {
        description: 'Les paramètres planning n\'ont pas pu être sauvegardés.',
      });
    } finally {
      setPlanningSettingsSaving(false);
    }
  }, [canManageUsers, planningSettings, user?.id]);

  const assignUserToShift = useCallback(async (targetUserId: string, shiftName: 'A' | 'B' | 'C') => {
    if (!canManageUsers || !user?.id) return;

    const targetUser = allUsers.find((entry) => entry.id === targetUserId);
    if (!targetUser) {
      toast.error('Agent introuvable');
      return;
    }

    const nextShiftId = `shift-${shiftName.toLowerCase()}`;
    const currentShift = String(targetUser.shift?.name ?? targetUser.shiftId ?? '').replace(/^shift-/i, '').toUpperCase();
    if (currentShift === shiftName) return;

    setShiftAssignmentBusyUserId(targetUserId);
    try {
      const result = await updateUserRequest({
        adminId: user.id,
        userId: targetUser.id,
        name: targetUser.name,
        firstName: targetUser.firstName ?? '',
        lastName: targetUser.lastName ?? '',
        email: targetUser.email,
        username: targetUser.username ?? null,
        role: targetUser.role,
        shiftId: nextShiftId,
        responsibility: targetUser.responsibility ?? null,
        isActive: Boolean(targetUser.isActive),
        isBlocked: Boolean(targetUser.isBlocked),
      });

      const updatedUser = { ...targetUser, ...result.user, updatedAt: new Date() };

      setAllUsers((prev) => {
        const updated = prev.map((entry) => (entry.id === targetUser.id ? updatedUser : entry));
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      if (user.id === targetUser.id) {
        setUser(updatedUser);
        localStorage.setItem('noc_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('noc-user-updated'));
      }

      addAuditLog('SHIFT_UPDATE', `Shift modifié pour ${targetUser.name}: ${currentShift || 'AUCUN'} -> ${shiftName}`);
      toast.success('Shift mis à jour', { description: `${targetUser.name} est maintenant dans le Shift ${shiftName}` });
    } catch (error) {
      toast.error('Mise à jour impossible', {
        description: error instanceof Error ? error.message : 'Le changement de shift a échoué.',
      });
    } finally {
      setShiftAssignmentBusyUserId(null);
    }
  }, [allUsers, canManageUsers, user?.id]);

  const saveTicketAdminSettings = useCallback(async () => {
    if (!canManageUsers || !user) return;

    const parsedEmails = parseNotificationEmailsInput(ticketAdminEmailsInput);

    if (parsedEmails.length === 0) {
      toast.error('Emails requis', {
        description: 'Ajoutez au moins une adresse email de notification.',
      });
      return;
    }

    setTicketAdminSettingsSaving(true);
    try {
      const payload = await saveTicketAdminSettingsRequest({
        requesterId: user.id,
        role: user.role,
        numberFormat: ticketAdminSettings.numberFormat,
        numberSeed: ticketAdminSettings.numberSeed,
        notificationEmails: parsedEmails,
        supportCopyEmail: ticketAdminSettings.supportCopyEmail,
        technicianFallbackEmail: ticketAdminSettings.technicianFallbackEmail,
        lifecycleEmailEvents: ticketAdminSettings.lifecycleEmailEvents,
        sendClientCopyForIncidentMaintenance: ticketAdminSettings.sendClientCopyForIncidentMaintenance,
        defaultSlaHours: ticketAdminSettings.defaultSlaHours,
        trashRetentionDays: ticketAdminSettings.trashRetentionDays,
        slaByCategory: ticketAdminSettings.slaByCategory,
      });
      const nextSettings: TicketAdminSettings = payload?.settings ?? ticketAdminSettings;
      setTicketAdminSettings(nextSettings);
      setTicketAdminEmailsInput((nextSettings.notificationEmails ?? parsedEmails).join(', '));
      toast.success('Paramètres Tickets enregistrés');
    } catch {
      toast.error('Enregistrement impossible', {
        description: 'Les paramètres tickets n\'ont pas pu être sauvegardés.',
      });
    } finally {
      setTicketAdminSettingsSaving(false);
    }
  }, [canManageUsers, ticketAdminEmailsInput, ticketAdminSettings, user]);

  const openTicketDetailPage = useCallback((ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  }, [router]);

  const applyLocalityToTicket = useCallback((name: string) => {
    setEditingTicket((prev) => prev ? { ...prev, localite: name } : prev);
  }, []);

  const upsertLocalityOption = useCallback((name: string) => {
    const normalized = normalizeTicketLocality(name);
    if (!normalized) return;
    const normalizedKey = normalizeTicketLocalityKey(normalized);

    setTicketLocalityOptions((prev) => {
      if (prev.some((item) => normalizeTicketLocalityKey(item) === normalizedKey)) {
        return prev;
      }
      return [...prev, normalized].sort((left, right) => left.localeCompare(right, 'fr'));
    });
  }, []);

  const createTicketLocality = useCallback(async (payload: Partial<TicketLocalityDraft>, target: 'edit' | 'none' = 'none') => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return null;
    }
    const prepared = prepareCreateLocality(payload);

    if (!prepared.canCreate) {
      toast.error('Veuillez renseigner une localité');
      return;
    }

    setIsCreatingLocality(true);
    try {
      const created = await createTicketLocalityRequest({
        ...prepared.requestBody,
        requesterId: user.id,
      });
      const localityName = resolveCreatedLocalityName(created, prepared.fallbackName);
      if (!localityName) {
        throw new Error('locality_name_empty');
      }

      upsertLocalityOption(localityName);
      if (target === 'edit') {
        applyLocalityToTicket(localityName);
        setEditTicketLocalityDraft(DEFAULT_TICKET_LOCALITY_DRAFT);
      }
      if (target === 'none') {
        setQuickLocalityDraft(DEFAULT_TICKET_LOCALITY_DRAFT);
      }

      toast.success('Localité enregistrée', { description: localityName });
      return localityName;
    } catch (error) {
      console.error('[tickets page] create locality', error);
      const message = error instanceof Error && error.message && error.message !== 'locality_create_failed'
        ? error.message
        : 'Impossible d\'enregistrer la localité';
      toast.error(message);
      return null;
    } finally {
      setIsCreatingLocality(false);
    }
  }, [applyLocalityToTicket, canManageTicketEntities, upsertLocalityOption, user?.id]);

  const handleQuickCreateLocality = useCallback(async () => {
    const hasStructuredData = Boolean(
      quickLocalityDraft.city.trim()
      || quickLocalityDraft.departement.trim()
      || quickLocalityDraft.arrondissement.trim()
      || quickLocalityDraft.quartier.trim()
      || quickLocalityDraft.address.trim()
      || quickLocalityDraft.reference.trim()
    );

    const normalized = normalizeTicketLocality(quickLocalityDraft.freeText);
    if (!normalized && !hasStructuredData) {
      toast.error('Veuillez renseigner au moins un champ de localisation');
      return;
    }

    const created = await createTicketLocality({ ...quickLocalityDraft, freeText: normalized }, 'none');
    if (!created) return;

    setQuickLocalityDialogOpen(false);
  }, [createTicketLocality, quickLocalityDraft]);

  const handleSelectManagedLocality = useCallback((id: string) => {
    setSelectedManagedLocalityId(id);
    const locality = managedLocalities.find((item) => item.id === id);
    const selection = buildManagedLocalityDraftFromSelection(locality, DEFAULT_TICKET_LOCALITY_DRAFT);
    setManagedLocalityName(selection.managedLocalityName);
    setManagedLocalityDraft(selection.managedLocalityDraft);
  }, [managedLocalities]);

  const handleUpdateManagedLocality = useCallback(async () => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    if (!selectedManagedLocalityId) {
      toast.error('Sélectionnez une localité à modifier');
      return;
    }

    const normalizedName = normalizeTicketLocality(managedLocalityName);
    if (!normalizedName) {
      toast.error('Le nom du site est requis');
      return;
    }

    setIsUpdatingLocality(true);
    try {
      const updated = await updateTicketLocalityRequest({
        id: selectedManagedLocalityId,
        name: normalizedName,
        countryCode: managedLocalityDraft.countryCode,
        countryName: managedLocalityDraft.countryName,
        departement: managedLocalityDraft.departement,
        city: managedLocalityDraft.city,
        arrondissement: managedLocalityDraft.arrondissement,
        quartier: managedLocalityDraft.quartier,
        address: managedLocalityDraft.address,
        reference: managedLocalityDraft.reference,
        requesterId: user.id,
      });
      const managedUpdate = applyManagedLocalityUpdate(
        managedLocalities,
        selectedManagedLocalityId,
        updated,
        managedLocalityDraft,
        managedLocalityName
      );

      setManagedLocalities(managedUpdate.nextManagedLocalities);

      upsertLocalityOption(managedUpdate.updatedName);
      setManagedLocalityName(managedUpdate.updatedName);

      toast.success('Localité mise à jour');
    } catch (error) {
      console.error('[tickets page] update locality', error);
      toast.error('Impossible de modifier la localité');
    } finally {
      setIsUpdatingLocality(false);
    }
  }, [canManageTicketEntities, managedLocalities, managedLocalityDraft, managedLocalityName, selectedManagedLocalityId, upsertLocalityOption, user?.id]);

  const handleDeleteManagedLocality = useCallback(async () => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    if (!selectedManagedLocalityId) {
      toast.error('Sélectionnez une localité à supprimer');
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Supprimer cette localité ?');
      if (!confirmed) return;
    }

    setIsDeletingLocality(true);
    try {
      await deleteTicketLocalityRequest(selectedManagedLocalityId, user.id);

      setSelectedManagedLocalityId('');
      setManagedLocalityName('');
      setManagedLocalityDraft(DEFAULT_TICKET_LOCALITY_DRAFT);
      setManagedLocalities((prev) => removeManagedLocalityById(prev, selectedManagedLocalityId));
      setTicketLocalityOptions((prev) => removeLocalityOptionByName(prev, managedLocalityName));
      toast.success('Localité supprimée');
    } catch (error) {
      console.error('[tickets page] delete locality', error);
      toast.error('Impossible de supprimer la localité');
    } finally {
      setIsDeletingLocality(false);
    }
  }, [canManageTicketEntities, managedLocalityName, selectedManagedLocalityId, user?.id]);

  const resolveTicketSiteSelection = useCallback((value?: string) => {
    const names = splitTicketValues(value);
    return ticketSiteOptions.filter((site) => names.includes(site.name));
  }, [ticketSiteOptions]);

  const resolveTicketTechnicians = useCallback((value?: string) => {
    const names = splitTicketValues(value);
    return ticketTechnicianOptions.filter((technician) => names.includes(technician.name));
  }, [ticketTechnicianOptions]);

  const loadTicketsModuleData = useCallback(async () => {
    try {
      const moduleData = await fetchTicketsModuleDataRequest();

      if (!moduleData.activeOk) {
        console.error('[tickets page] active tickets request failed', moduleData.activeStatus);
      }
      if (!moduleData.trashOk && moduleData.trashStatus !== 0) {
        console.error('[tickets page] trash tickets request failed', moduleData.trashStatus);
      }

      if (moduleData.activeOk || moduleData.trashOk) {
        setTickets(mapCombinedApiTickets(moduleData.activeData, moduleData.trashData));
      }

      const mergedLocalities = new Set<string>();

      if (moduleData.sitesOk) {
        const normalizedSites = parseTicketSitePayload(moduleData.sitesData, CONGO_DEPARTMENTS);
        if (normalizedSites.siteOptions.length > 0) {
          setTicketSiteOptions(normalizedSites.siteOptions);
          setTicketCongoDepartments(normalizedSites.departments);
          normalizedSites.localities.forEach((locality) => mergedLocalities.add(locality));
        }
      }

      if (moduleData.localitiesOk) {
        const managedPayload = parseManagedLocalitiesPayload(moduleData.localitiesData);
        setManagedLocalities(managedPayload.managedEntries);
        managedPayload.localities.forEach((locality) => mergedLocalities.add(locality));
      }

      if (mergedLocalities.size > 0) {
        setTicketLocalityOptions(
          Array.from(mergedLocalities).sort((left, right) => left.localeCompare(right, 'fr'))
        );
      }
    } catch (error) {
      console.error('[tickets page] loadTicketsModuleData', error);
    }
  }, []);

  useEffect(() => {
    void loadTicketsModuleData();
  }, [loadTicketsModuleData]);

  useEffect(() => {
    const onFocus = () => {
      void loadTicketsModuleData();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadTicketsModuleData();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadTicketsModuleData]);

  useEffect(() => {
    if (!editTicketOpen) return;
    setEditTicketLocalityDraft({
      ...DEFAULT_TICKET_LOCALITY_DRAFT,
      freeText: editingTicket?.localite ?? '',
    });
  }, [editTicketOpen, editingTicket?.localite]);

  useEffect(() => {
    if (!quickLocalityDialogOpen) return;
    setQuickLocalityTab('create');
    setManagedLocalitySearch('');
    setSelectedManagedLocalityId('');
    setManagedLocalityName('');
    setManagedLocalityDraft(DEFAULT_TICKET_LOCALITY_DRAFT);
    void loadTicketsModuleData();
  }, [quickLocalityDialogOpen, loadTicketsModuleData]);

  const handleDeleteTicket = useCallback(async (ticket: TicketItem, permanent = false) => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    const action: 'delete' | 'permanent' = permanent ? 'permanent' : 'delete';
    const actionKey = getTicketActionKey(action, ticket.id);
    if (isTicketActionBusy(action, ticket.id)) {
      return;
    }

    const previousTickets = tickets;
    setTicketActionBusy(actionKey, true);
    setShowTrashContextMenu(false);
    setTrashContextTicket(null);
    setTickets((prev) => applyOptimisticDelete(prev, ticket, permanent, user?.id));

    try {
      const payload = await deleteTicketRequest({
        ticketId: ticket.id,
        permanent,
        deletedBy: user?.id,
        deletedByName: user?.name,
      });
      const retentionDays = resolveTicketRetentionDays(
        payload,
        ticketAdminSettings.trashRetentionDays ?? 30
      );

      void loadTicketsModuleData();
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(null);
        setTicketDetailOpen(false);
      }

      if (permanent) {
        toast.success('Ticket supprimé définitivement');
      } else {
        toast.success(`Ticket déplacé en corbeille (suppression auto dans ${retentionDays} jour${retentionDays > 1 ? 's' : ''})`);
      }
    } catch (error) {
      setTickets(previousTickets);
      console.error('[tickets page] handleDeleteTicket', error);
      toast.error('Impossible de supprimer le ticket');
    } finally {
      setTicketActionBusy(actionKey, false);
    }
  }, [canManageTicketEntities, getTicketActionKey, isTicketActionBusy, loadTicketsModuleData, selectedTicket?.id, setTicketActionBusy, ticketAdminSettings.trashRetentionDays, tickets, user?.id, user?.name]);

  const requestDeleteTicket = useCallback((ticket: TicketItem, permanent = false) => {
    if (!canManageTicketEntities) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    setDeleteTicketTarget(ticket);
    setDeleteTicketPermanent(permanent);
    setDeleteTicketDialogOpen(true);
  }, [canManageTicketEntities]);

  const handleRestoreTicket = useCallback(async (ticket: TicketItem) => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    const actionKey = getTicketActionKey('restore', ticket.id);
    if (isTicketActionBusy('restore', ticket.id)) {
      return;
    }

    const previousTickets = tickets;
    setTicketActionBusy(actionKey, true);
    setShowTrashContextMenu(false);
    setTrashContextTicket(null);
    setTickets((prev) => applyOptimisticRestore(prev, ticket));

    try {
      await restoreTicketRequest({
        ticketId: ticket.id,
        restoredBy: user?.id,
        restoredByName: user?.name,
      });

      void loadTicketsModuleData();
      toast.success('Ticket restauré depuis la corbeille');
    } catch (error) {
      setTickets(previousTickets);
      console.error('[tickets page] handleRestoreTicket', error);
      toast.error('Impossible de restaurer le ticket');
    } finally {
      setTicketActionBusy(actionKey, false);
    }
  }, [canManageTicketEntities, getTicketActionKey, isTicketActionBusy, loadTicketsModuleData, setTicketActionBusy, tickets, user?.id, user?.name]);

  const openTrashTicketContextMenu = useCallback((event: React.MouseEvent, ticket: TicketItem) => {
    event.preventDefault();
    event.stopPropagation();
    setTrashContextTicket(ticket);
    setTrashContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowTrashContextMenu(true);
  }, []);

  const handleUnarchiveTicket = useCallback(async (ticket: TicketItem) => {
    if (!canManageTicketEntities || !user?.id) {
      toast.error('Action reservee aux agents NOC autorises');
      return;
    }
    try {
      await unarchiveTicketRequest({
        ticketId: ticket.id,
        updatedBy: user?.name,
        updatedById: user?.id,
      });

      await loadTicketsModuleData();
      toast.success('Ticket désarchivé');
    } catch (error) {
      console.error('[tickets page] handleUnarchiveTicket', error);
      toast.error('Impossible de désarchiver le ticket');
    }
  }, [canManageTicketEntities, loadTicketsModuleData, user?.id, user?.name]);

  const handleUpdateTicketStatus = useCallback(async (ticket: TicketItem, status: TicketStatus) => {
    try {
      const updatedPayload = await updateTicketStatusRequest({
        ticketId: ticket.id,
        status: mapLegacyTicketStatusToApi(status),
        updatedBy: user?.name,
        updatedById: user?.id,
      });

      const updatedTicket = mapApiTicketToLegacy(updatedPayload);
      setTickets((prev) => prev.map((entry) => entry.id === updatedTicket.id ? updatedTicket : entry));
      setSelectedTicket(updatedTicket);
      toast.success(status === 'resolved' ? 'Ticket marqué comme résolu' : 'Ticket fermé');
    } catch (error) {
      if (error instanceof TicketApiRequestError) {
        const err = error.payload;
        if (error.status === 409 || err?.error === 'technician_capacity_exceeded') {
          toast.error(err?.message ?? 'Un technicien a deja 3 tickets actifs cette semaine.');
          return;
        }
      }
      console.error('[tickets page] handleUpdateTicketStatus', error);
      toast.error('Impossible de mettre à jour le ticket');
    }
  }, [user?.id, user?.name]);

  // L'effet de récupération des conversations est déjà déclenché plus haut. Cette section reste vide pour éviter les appels doubles.

  const isAnnouncementsConversation = useCallback((conversation?: Conversation | null) => {
    if (!conversation || conversation.type !== 'individual') return false;
    const otherParticipant = conversation.participants.find((participant) => participant.id !== user?.id);
    return otherParticipant?.id === 'system-annonces';
  }, [user?.id]);

  const updateConversationAvatar = useCallback((conversationId: string, avatarData: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              avatar: avatarData,
              updatedAt: new Date(),
            }
          : conversation
      )
    );

    setSelectedConversation((prev) =>
      prev && prev.id === conversationId
        ? {
            ...prev,
            avatar: avatarData,
            updatedAt: new Date(),
          }
        : prev
    );
  }, []);

  const openConversationAvatarUploader = useCallback((target: { mode: 'announcement' | 'group'; conversationId?: string }) => {
    setChatAvatarUploadTarget(target);
    chatAvatarInputRef.current?.click();
  }, []);

  const handleConversationAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !chatAvatarUploadTarget) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Fichier invalide', { description: 'Veuillez choisir une image.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = typeof reader.result === 'string' ? reader.result : '';
      if (!imageData) {
        toast.error('Image invalide');
        return;
      }

      if (chatAvatarUploadTarget.mode === 'announcement') {
        setAnnouncementAvatar(imageData);
        localStorage.setItem('noc_announcements_avatar', imageData);
        toast.success('Photo des annonces mise à jour');
      } else if (chatAvatarUploadTarget.mode === 'group' && chatAvatarUploadTarget.conversationId) {
        updateConversationAvatar(chatAvatarUploadTarget.conversationId, imageData);
        toast.success('Photo du groupe mise à jour');
      }
    };

    reader.onerror = () => {
      toast.error('Erreur', { description: 'Impossible de lire l\'image sélectionnée.' });
    };

    reader.readAsDataURL(file);
    setChatAvatarUploadTarget(null);
  }, [chatAvatarUploadTarget, updateConversationAvatar]);

  type ChatMessageInput = {
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
    fileType?: string;
    duration?: number;
    status?: string;
    replyTo?: ChatMessage;
    isEdited?: boolean;
    isDeleted?: boolean;
    deletedForEveryone?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
    reactions?: Array<{ userId: string; userName: string; emoji: string }>;
    readBy?: Array<{ userId: string; userName: string; readAt: Date }>;
  };

  const createConversationInDb = useCallback(async (payload: {
    type: 'individual' | 'group';
    participantIds: string[];
    name?: string;
    description?: string;
  }) => {
    if (!user?.id) return null;
    const response = await createConversationRequest({
      type: payload.type,
      participantIds: payload.participantIds,
      name: payload.name,
      description: payload.description,
      createdBy: user.id,
    });
    if (!response.ok || !response.data?.conversation) return null;
    return mapCreatedConversation(response.data.conversation);
  }, [user?.id]);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    const response = await fetchConversationsRequest(user.id);
    if (!response.ok || !response.data?.conversations) return;
    const mapped = response.data.conversations.map((conversation: any) => mapFetchedConversation(conversation));
    setConversations(mapped);
  }, [user?.id]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    const response = await fetchConversationMessagesRequest(conversationId, user.id);
    if (!response.ok || !response.data?.messages) return;
    const mapped = response.data.messages.map((message: any) => mapFetchedChatMessage(message));
    setChatMessages(attachReplyMessages(mapped));
  }, [user?.id]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const sendChatMessage = useCallback(async (messagePayload: ChatMessageInput) => {
    let conversationId = messagePayload.conversationId || selectedConversation?.id;
    if (!conversationId) {
      toast.error('Aucune conversation sélectionnée (conversationId manquant)');
      return;
    }

    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    const targetConversation = conversations.find((conversation) => conversation.id === conversationId) || selectedConversation;
    if (isAnnouncementsConversation(targetConversation) && !canManageAnnouncements(user)) {
      toast.error('Action non autorisée', {
        description: 'Seuls les Admins, Responsables et Super Admins peuvent publier des annonces.',
      });
      return;
    }

    try {
      // Always send base64 data as mediaUrl for images/files
      const buildBody = (targetConversationId: string) => ({
        conversationId: targetConversationId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        type: messagePayload.type,
        content: messagePayload.content,
        mediaUrl: messagePayload.mediaData || messagePayload.mediaUrl || undefined,
        fileName: messagePayload.fileName,
        fileSize: messagePayload.fileSize,
        fileType: messagePayload.fileType,
        duration: messagePayload.duration,
        status: messagePayload.status || 'sent',
        replyToId: messagePayload.replyTo?.id,
      });

      let response = await sendConversationMessageRequest(conversationId, buildBody(conversationId));

      if (!response.ok && response.status === 404 && selectedConversation) {
        const participantIds = selectedConversation.participants
          .map((participant) => participant.id)
          .filter((id) => id && id !== user.id);

        if (participantIds.length > 0) {
          const recreatedConversation = await createConversationInDb({
            type: selectedConversation.type,
            name: selectedConversation.name,
            description: selectedConversation.description,
            participantIds,
          });

          if (recreatedConversation) {
            const previousConversationId = selectedConversation.id;
            conversationId = recreatedConversation.id;
            setConversations((prev) => [
              recreatedConversation,
              ...prev.filter((conversation) => conversation.id !== previousConversationId && conversation.id !== recreatedConversation.id),
            ]);
            setSelectedConversation(recreatedConversation);

            response = await sendConversationMessageRequest(conversationId, buildBody(conversationId));
          }
        }
      }

      if (!response.ok) {
        let errMsg = `Erreur envoi du message (${response.status})`;
        const errJson = response.data;
        if (errJson?.error) {
          errMsg = `Erreur envoi du message (${response.status}) : ${errJson.error}`;
        }
        console.error('Erreur API send message', response.status, errMsg);
        toast.error(errMsg);
        return;
      }

      const result = response.data;
      if (result.success && result.message) {
        // On s'assure que le mapping est bien à plat pour l'affichage
        const createdMessage: ChatMessage = {
          ...result.message,
          createdAt: new Date(result.message.createdAt),
          updatedAt: new Date(result.message.updatedAt),
          readAt: result.message.readAt ? new Date(result.message.readAt) : undefined,
          mediaData: result.message.mediaUrl || result.message.mediaData || undefined,
          fileName: result.message.fileName,
          fileSize: result.message.fileSize,
          fileType: result.message.fileType,
          type: result.message.type,
          reactions: result.message.reactions || [],
          readBy: result.message.readBy || [],
          isEdited: result.message.isEdited || false,
          isDeleted: result.message.isDeleted || false,
          deletedForEveryone: result.message.deletedForEveryone || false,
          isPinned: result.message.isPinned || false,
          isImportant: result.message.isImportant || false,
          isArchived: result.message.isArchived || false,
          replyTo: messagePayload.replyTo,
        };

        setChatMessages(prev => {
          if (prev.some(m => m.id === createdMessage.id)) return prev;
          return [...prev, createdMessage];
        });
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, lastMessage: createdMessage, updatedAt: new Date() } : c));

        return createdMessage;
      }

      toast.error('Erreur envoi du message');
    } catch (error) {
      console.error('Erreur sendChatMessage', error);
      toast.error('Erreur envoi du message');
    }
  }, [selectedConversation, conversations, user, createConversationInDb, isAnnouncementsConversation]);
  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      const isSameConversation = selectedConversationRef.current?.id === conversation.id;

      setConversations((prev) =>
        resetConversationUnreadCount(prev, conversation.id)
      );
      setNotifications((prev) =>
        markNotificationsReadForConversation(prev, conversation.id)
      );

      if (isSameConversation) return;

      setShowEmojiPicker(false);
      setShowLiveReactionPicker(false);
      setShowScrollToBottom(false);
      setSelectedConversation(conversation);
      void fetchMessages(conversation.id);
    },
    [fetchMessages]
  );

  const updateChatMessage = useCallback(
    async (
      conversationId: string,
      messageId: string,
      action: 'deleteForMe' | 'deleteForEveryone' | 'togglePin' | 'toggleImportant' | 'editContent',
      payload?: { content?: string; isPinned?: boolean; isImportant?: boolean }
    ) => {
      if (!user?.id) return null;

      try {
        const response = await patchConversationMessageRequest(conversationId, messageId, {
          action,
          userId: user.id,
          ...(payload || {}),
        });

        if (!response.ok) {
          const err = response.data;
          toast.error(err?.error || 'Erreur mise à jour du message');
          return null;
        }

        const data = response.data;
        if (!data?.success || !data?.message) {
          toast.error('Erreur mise à jour du message');
          return null;
        }

        const mappedMessage: ChatMessage = {
          ...data.message,
          createdAt: new Date(data.message.createdAt),
          updatedAt: new Date(data.message.updatedAt),
          readAt: data.message.readAt ? new Date(data.message.readAt) : undefined,
          mediaData: data.message.mediaUrl || undefined,
          reactions: data.message.reactions || [],
          readBy: data.message.readBy || [],
          isEdited: data.message.isEdited || false,
          isDeleted: data.message.isDeleted || false,
          deletedForEveryone: data.message.deletedForEveryone || false,
          isPinned: data.message.isPinned || false,
          isImportant: data.message.isImportant || false,
          isArchived: data.message.isArchived || false,
        };

        setChatMessages((prev) =>
          prev.map((message) => (message.id === messageId ? { ...message, ...mappedMessage } : message))
        );

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            if (conversation.lastMessage?.id !== messageId) return conversation;
            return { ...conversation, lastMessage: { ...conversation.lastMessage, ...mappedMessage } };
          })
        );

        return mappedMessage;
      } catch (error) {
        console.error('Erreur updateChatMessage', error);
        toast.error('Erreur mise à jour du message');
        return null;
      }
    },
    [user]
  );

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

    // Fonction pour gérer l'échec de connexion
    const handleFailedLogin = (explicitMessage?: string) => {
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
      }

      addAuditLog(
        lockoutTime > 0 ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE',
        lockoutTime > 0
          ? `Compte verrouillé après ${newAttempts} tentative(s)`
          : (explicitMessage || 'Échec de connexion'),
        'FAILURE'
      );

      setLoginError(explicitMessage || 'Pseudo/Email ou mot de passe incorrect');
      setIsLoading(false);
      toast.error(lockoutTime > 0 ? 'Trop de tentatives' : 'Erreur de connexion', {
        id: lockoutTime > 0 ? 'auth-lockout-error' : 'auth-login-error',
        description: lockoutTime > 0
          ? `Veuillez attendre ${lockoutTime} secondes avant de réessayer`
          : explicitMessage || 'Identifiants invalides'
      });
    };

    try {
      const loginResponse = await attemptLoginRequest({
        login: loginIdentifier,
        password,
      });
      const result = loginResponse.result;

      if (!loginResponse.ok || !result?.success || !result?.user) {
        const apiError = typeof result?.error === 'string' ? result.error : undefined;
        handleFailedLogin(apiError);
        return;
      }

      const loggedUser = {
        ...result.user,
        lastActivity: new Date(),
      };

      setFailedAttempts(0);
      setShowForgotMessage(false);
      restoredCurrentTabRef.current = true;
      setCurrentTab('dashboard');
      setUser(loggedUser);
      setIsAuthenticated(true);
      setLastActivity(new Date());
      localStorage.setItem('noc_user', JSON.stringify(loggedUser));
      localStorage.setItem(getCurrentTabStorageKey(loggedUser.id), 'dashboard');
      window.dispatchEvent(new Event('noc-user-updated'));
      if (result.token) {
        localStorage.setItem('noc_auth_token', String(result.token));
      }

      setAllUsers((prev) => {
        const updated = [...prev.filter((u) => u.id !== loggedUser.id), loggedUser];
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      addAuditLog('LOGIN_SUCCESS', `Connexion réussie: ${loggedUser.name}`);

      toast.success(`Bienvenue, ${loggedUser.name} !`, {
        id: 'auth-login-success',
        description: loggedUser.mustChangePassword
          ? 'Connexion réussie. Changement de mot de passe obligatoire avant toute action.'
          : 'Connexion réussie',
      });

      if (loggedUser.mustChangePassword) {
        setTimeout(() => {
          openSecurityDialog();
        }, 150);
      }
    } catch {
      handleFailedLogin('Impossible de joindre le serveur d\'authentification');
      return;
    } finally {
      setIsLoading(false);
    }
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
    setCurrentTab('dashboard');
    restoredCurrentTabRef.current = false;
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

  // Session timeout - déconnexion automatique après 10 minutes d'inactivité RÉELLE
  // Le timer se réinitialise dès que l'utilisateur interagit avec l'application
  useEffect(() => {
    if (!isAuthenticated) return;

    // Utiliser un ref pour éviter les re-renders sur chaque mouvement de souris
    const lastInteractionRef = { current: Date.now() };

    const resetTimer = () => {
      lastInteractionRef.current = Date.now();
    };

    // Écouter tous les types d'interactions utilisateur
    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'focus'] as const;
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= SESSION_TIMEOUT_MS) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('noc_user');
        toast.warning('Session expirée', { description: 'Vous avez été déconnecté après 10 minutes d\'inactivité' });
      }
    }, 30000); // Vérifier toutes les 30 secondes

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

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

  // Call state management - calling -> ringing, then explicit response or auto-timeout after 1min
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
      addNotification('Sonnerie en cours...', 'info', { conversationId: activeCall.conversationId });
    }, 2000);

    // Auto-hangup after 60 seconds if no answer
    const autoHangupTimeout = setTimeout(() => {
      closeCallSession(
        'missed',
        "La personne n'est pas apte pour répondre pour l'instant",
        activeCall
      );
      toast.info('Pas de réponse', { description: 'L\'appel n\'a pas été répondu après 1 minute' });
    }, 60000);

    callTimeoutRef.current = autoHangupTimeout;

    return () => {
      clearTimeout(ringingTimeout);
      clearTimeout(autoHangupTimeout);
    };
  }, [activeCall, addNotification, callDialogOpen, closeCallSession]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  useEffect(() => {
    const handleClick = () => setShowTrashContextMenu(false);
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTrashContextMenu(false);
    };

    if (showTrashContextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [showTrashContextMenu]);

  const persistUserProfile = useCallback(
    async (payload: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      username?: string;
      avatar?: string | null;
    }) => {
      if (!user?.id) return null;

      const result = await updateOwnProfileRequest({
        userId: user.id,
        actorId: user.id,
        ...payload,
      });

      const updatedUser = { ...user, ...result.user };
      setUser(updatedUser);
      localStorage.setItem('noc_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('noc-user-updated'));

      setAllUsers((prev) => {
        const exists = prev.some((entry) => entry.id === updatedUser.id);
        const updated = exists
          ? prev.map((entry) => (entry.id === updatedUser.id ? { ...entry, ...updatedUser } : entry))
          : [...prev, updatedUser];
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      setConversations((prev) =>
        prev.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map((participant) =>
            participant.id === updatedUser.id ? { ...participant, avatar: updatedUser.avatar } : participant
          ),
        }))
      );

      setChatMessages((prev) =>
        prev.map((message) =>
          message.senderId === updatedUser.id
            ? { ...message, senderAvatar: updatedUser.avatar, senderName: updatedUser.name }
            : message
        )
      );

      return updatedUser;
    },
    [user]
  );

  const openProfileCropDialog = useCallback(() => {
    if (profilePhotoDialogTimerRef.current) {
      clearTimeout(profilePhotoDialogTimerRef.current);
      profilePhotoDialogTimerRef.current = null;
    }

    setProfilePhotoDialogOpen(false);
    profilePhotoDialogTimerRef.current = setTimeout(() => {
      setProfilePhotoDialogOpen(true);

      // Retry once to avoid occasional dialog race conditions on desktop browsers.
      profilePhotoDialogTimerRef.current = setTimeout(() => {
        setProfilePhotoDialogOpen((current) => (current ? current : true));
      }, 180);
    }, 80);
  }, []);

  const handleAvatarFileSelection = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;

      const fileName = (file.name || '').toLowerCase();
      const hasImageExt = /\.(jpg|jpeg|png|webp|gif|heic|heif|bmp)$/i.test(fileName);
      if (file.type && !file.type.startsWith('image/') && !hasImageExt) {
        toast.error('Fichier invalide', { description: 'Veuillez choisir une image.' });
        return;
      }

      if (tempAvatarObjectUrlRef.current) {
        URL.revokeObjectURL(tempAvatarObjectUrlRef.current);
        tempAvatarObjectUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(file);
      tempAvatarObjectUrlRef.current = objectUrl;
      setTempProfilePhoto(objectUrl);
      setProfileCrop({ x: 0, y: 0 });
      setProfileZoom(1.2);
      setProfileCroppedAreaPixels(null);
      setProfileDialogOpen(false);
      openProfileCropDialog();
    },
    [openProfileCropDialog]
  );

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleAvatarFileSelection(event.target.files?.[0]);
    event.target.value = '';
  };

  const clearTempAvatarObjectUrl = useCallback(() => {
    if (tempAvatarObjectUrlRef.current) {
      URL.revokeObjectURL(tempAvatarObjectUrlRef.current);
      tempAvatarObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (profilePhotoDialogTimerRef.current) {
        clearTimeout(profilePhotoDialogTimerRef.current);
        profilePhotoDialogTimerRef.current = null;
      }
      clearTempAvatarObjectUrl();
    };
  }, [clearTempAvatarObjectUrl]);

  // Save cropped profile photo
  const handleSaveCroppedPhoto = async () => {
    if (!tempProfilePhoto || !user) return;

    try {
      if (!profileCroppedAreaPixels) {
        toast.error('Rognage incomplet', { description: 'Veuillez sélectionner une zone de rognage.' });
        return;
      }

      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image invalide'));
        img.src = tempProfilePhoto;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Erreur rognage', { description: 'Canvas indisponible' });
        return;
      }

      const outputSize = 320;
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        profileCroppedAreaPixels.x,
        profileCroppedAreaPixels.y,
        profileCroppedAreaPixels.width,
        profileCroppedAreaPixels.height,
        0,
        0,
        outputSize,
        outputSize
      );

      const croppedData = canvas.toDataURL('image/jpeg', 0.92);
      await persistUserProfile({ avatar: croppedData });
      await fetchConversations();

      setProfilePhotoDialogOpen(false);
      setTempProfilePhoto(null);
      clearTempAvatarObjectUrl();
      toast.success('Photo mise à jour', {
        description: 'Votre photo est enregistrée dans la base de données.',
      });
    } catch (error) {
      console.error('Erreur sauvegarde photo profil', error);
      toast.error('Erreur mise à jour photo', {
        description: 'Impossible d\'enregistrer la photo de profil.',
      });
    }
  };

  const handlePublishStatus = useCallback(
    (payload: {
      mediaUrl: string;
      mediaType: 'image' | 'video';
      caption: string;
      blockedUsers: string[];
    }) => {
      if (!user) return;

      const newStatus = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
        caption: payload.caption,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        views: [],
        likes: [],
        blockedUsers: payload.blockedUsers,
      };

      setStatusList((prev) => [newStatus, ...prev]);
      toast.success('Status publié', { description: 'Il sera visible pendant 24 heures' });
    },
    [user]
  );

  const handleSaveEditedMessage = useCallback(async () => {
    if (!editingMessage || !editMessageContent.trim()) return;

    setChatMessages((prev) =>
      prev.map((message) =>
        message.id === editingMessage.id
          ? { ...message, content: editMessageContent, isEdited: true, updatedAt: new Date() }
          : message
      )
    );

    await updateChatMessage(editingMessage.conversationId, editingMessage.id, 'editContent', {
      content: editMessageContent,
    });

    setEditingMessage(null);
    setEditMessageContent('');
    setEditMessageDialogOpen(false);
    toast.success('Message modifié');
  }, [editMessageContent, editingMessage, updateChatMessage]);

  const handleCreateTask = useCallback(async () => {
    if (!newTask.title.trim()) {
      toast.error('Erreur', { description: 'Le titre est obligatoire' });
      return;
    }

    if (!user || !user.id) {
      toast.error('Erreur', { description: 'Vous devez être authentifié pour créer une tâche' });
      return;
    }

    if (!newTask.startTime) {
      toast.error('Erreur', { description: 'La date de début est obligatoire' });
      return;
    }

    try {
      const parsedTags = newTask.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const tagsWithVisibility = setTaskVisibilityTag(parsedTags, newTask.visibility);

      const taskData = {
        userId: user.id,
        ticketId: newTask.linkedTicketId || undefined,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        category: newTask.category,
        estimatedDuration: newTask.estimatedDuration,
        startTime: newTask.startTime,
        shiftName: user.shift?.name,
        tags: tagsWithVisibility,
      };

      console.log('[TaskCreate] Sending data:', taskData);
      const task = await createTaskRequest(taskData);

      setNocTasks((prev) => [task, ...prev.filter((currentTask) => currentTask.id !== task.id)]);
      setTaskAlerts((prev) => [...task.alerts, ...prev.filter((alert) => alert.taskId !== task.id)]);
      setNewTask({
        title: '',
        description: '',
        linkedTicketId: '',
        linkedTicketNumero: '',
        linkedTicketObjet: '',
        visibility: 'public',
        priority: 'medium',
        category: 'other',
        startTime: new Date(),
        estimatedDuration: 60,
        tags: '',
      });
      setTaskDialogOpen(false);
      toast.success('Tâche créée', { description: 'La tâche a été ajoutée à votre liste' });
    } catch {
      toast.error('Création impossible', { description: 'La tâche n’a pas pu être enregistrée.' });
    }
  }, [newTask, user]);

  const handleToggleTaskCompletion = useCallback(async (task: (typeof nocTasks)[number], checked: boolean) => {
    try {
      const updatedTask = await updateTaskRequest({
        taskId: task.id,
        userId: user?.id,
        status: checked ? 'COMPLETED' : 'PENDING',
        actualDuration: checked ? calculateActualDuration(task) : undefined,
        actualEndTime: checked ? new Date() : undefined,
      });

      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.success(checked ? 'Tâche terminée ✓' : 'Tâche réactivée');
    } catch {
      toast.error('Mise à jour impossible');
    }
  }, [calculateActualDuration, user?.id]);

  const handleStartTask = useCallback(async (taskId: string) => {
    try {
      const updatedTask = await updateTaskRequest({ taskId, userId: user?.id, status: 'IN_PROGRESS' });
      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.info('Tâche démarrée');
    } catch {
      toast.error('Démarrage impossible');
    }
  }, [user?.id]);

  const handlePauseTask = useCallback(async (taskId: string) => {
    try {
      const updatedTask = await updateTaskRequest({ taskId, userId: user?.id, status: 'ON_HOLD' });
      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.warning('Tâche suspendue');
    } catch {
      toast.error('Suspension impossible');
    }
  }, [user?.id]);

  const handleResumeTask = useCallback(async (taskId: string) => {
    try {
      const updatedTask = await updateTaskRequest({ taskId, userId: user?.id, status: 'IN_PROGRESS' });
      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.info('Tâche reprise');
    } catch {
      toast.error('Reprise impossible');
    }
  }, [user?.id]);

  const handleTransferTask = useCallback(async (taskId: string, targetUserId: string) => {
    try {
      const updatedTask = await updateTaskRequest({
        taskId,
        userId: user?.id,
        transferToUserId: targetUserId,
      });

      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.success('Tâche transférée');
    } catch {
      toast.error('Transfert impossible');
    }
  }, [user?.id]);

  const handleUpdateTaskSchedule = useCallback(async (taskId: string, startTime: Date, estimatedEndTime: Date) => {
    try {
      const duration = Math.max(5, Math.round((estimatedEndTime.getTime() - startTime.getTime()) / 60000));
      const updatedTask = await updateTaskRequest({
        taskId,
        userId: user?.id,
        startTime,
        estimatedEndTime,
        estimatedDuration: duration,
      });

      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.success('Planning tâche mis à jour');
    } catch {
      toast.error('Replanification impossible');
    }
  }, [user?.id]);

  const handleLinkTaskToTicket = useCallback(async (
    task: (typeof nocTasks)[number],
    ticket: { id: string; numero: string; objet: string }
  ) => {
    try {
      const updatedTask = await updateTaskRequest({
        taskId: task.id,
        userId: user?.id,
        ticketId: ticket.id,
      });

      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      toast.success(`Tâche liée au ticket ${ticket.numero}`);
    } catch {
      toast.error('Liaison ticket impossible');
    }
  }, [user?.id]);

  const handleQuickUpdateTask = useCallback(async (
    taskId: string,
    updates: { title?: string; description?: string; priority?: string; status?: string; tags?: string[] },
    successMessage?: string
  ) => {
    try {
      const updatedTask = await updateTaskRequest({
        taskId,
        userId: user?.id,
        ...updates,
      });

      setNocTasks((prev) => prev.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask)));
      setTaskAlerts((prev) => [...updatedTask.alerts, ...prev.filter((alert) => alert.taskId !== updatedTask.id)]);
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch {
      toast.error('Mise à jour rapide impossible');
    }
  }, [user?.id]);

  const handleOpenTaskDetails = useCallback((task: (typeof nocTasks)[number]) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;

    try {
      await deleteTaskRequest({ taskId, userId: user?.id });
      setNocTasks((prev) => prev.filter((currentTask) => currentTask.id !== taskId));
      setTaskAlerts((prev) => prev.filter((alert) => alert.taskId !== taskId));
      toast.success('Tâche supprimée');
    } catch {
      toast.error('Suppression impossible');
    }
  }, [user?.id]);

  const tasksStats = useMemo(() => computeTaskStats(nocTasks, user?.id), [nocTasks, user?.id]);

  const displayedTasks = useMemo(
    () => getDisplayedTasks({ tasks: nocTasks, taskFilter, userId: user?.id, searchQuery }),
    [nocTasks, searchQuery, taskFilter, user?.id]
  );

  const dailyTaskPerformance = user
    ? calculateAgentPerformance(nocTasks, user.id, user.name, 'daily', 0, user.shift?.name)
    : null;
  const dailyTaskBadgeConfig = BADGE_CONFIG[dailyTaskPerformance?.badge || 'needs_attention'];

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

  useEffect(() => {
    if (!selectedConversation || !user) return;

    const conversationId = selectedConversation.id;
    const incomingIds = chatMessages
      .filter((message) => message.conversationId === conversationId && message.senderId !== user.id)
      .map((message) => message.id);

    const seenMap = seenIncomingMessageIdsByConversationRef.current;
    const seenIds = seenMap[conversationId];

    if (!seenIds) {
      seenMap[conversationId] = new Set(incomingIds);
      return;
    }

    const newIncomingIds = incomingIds.filter((id) => !seenIds.has(id));
    const newIncomingCount = newIncomingIds.length;
    if (newIncomingCount > 0) {
      playMessageReceiveSound();
      playNotificationSound();

      const latestIncoming = chatMessages
        .filter((message) => newIncomingIds.includes(message.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestIncoming) {
        addNotification(`${latestIncoming.senderName}: ${latestIncoming.type === 'text' ? latestIncoming.content || 'Nouveau message' : `a envoyé ${latestIncoming.type}`}`, 'info', {
          conversationId,
          messageId: latestIncoming.id,
        });
      }

      incomingIds.forEach((id) => seenIds.add(id));
    }
  }, [chatMessages, selectedConversation, user, playMessageReceiveSound, playNotificationSound]);

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

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => markNotificationAsRead(prev, id));
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    markNotificationRead(notification.id);

    if (notification.conversationId) {
      const conversationId = notification.conversationId;
      setCurrentTabSafely('messagerie');

      const targetConversation = conversations.find((conversation) => conversation.id === conversationId);
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        setConversations((prev) =>
          resetConversationUnreadCount(prev, conversationId)
        );
      }

      await fetchMessages(conversationId);
      await fetchConversations();

      if (notification.messageId) {
        setTimeout(() => {
          const target = document.getElementById(`message-${notification.messageId}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-2', 'ring-cyan-400');
            setTimeout(() => target.classList.remove('ring-2', 'ring-cyan-400'), 1500);
          }
        }, 250);
      }
    }
  };

  useEffect(() => {
    if (!notificationsOpen) return;
    setNotifications((prev) => markAllNotificationsAsRead(prev));
  }, [notificationsOpen]);

  // ============================================
  // HANDLERS GESTION UTILISATEURS
  // ============================================

  // Ouvrir le dialog de modification du profil
  const openEditProfileDialog = () => {
    if (user) {
      addAuditLog('PROFILE_VIEWED', `Profil consulté: ${user.name}`);
      setEditFirstName(user.firstName || user.name.split(' ')[0] || '');
      setEditLastName(user.lastName || user.name.split(' ')[1] || '');
      setEditEmail(user.email);
      setEditUsername(user.username || '');
      setEditProfileDialogOpen(true);
    }
  };

  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const nextName = `${editFirstName} ${editLastName}`.trim() || user.name;
      const updatedUser = await persistUserProfile({
        firstName: editFirstName,
        lastName: editLastName,
        name: nextName,
        email: editEmail,
        username: editUsername || user.username,
      });

      if (updatedUser) {
        addAuditLog('PROFILE_UPDATE', `Profil modifié: ${updatedUser.name}`);
      }

      setEditProfileDialogOpen(false);
      toast.success('Profil mis à jour', {
        description: 'Vos informations ont été enregistrées dans la base de données.',
      });
    } catch (error) {
      console.error('Erreur save profile', error);
      const description = error instanceof Error ? error.message : 'Impossible de mettre à jour le profil';
      toast.error('Erreur', { description });
    }
  };

  const handleCreateEmailLabel = useCallback(() => {
    if (!user) return;

    const trimmedName = newLabelName.trim();
    if (!trimmedName) {
      toast.error('Nom de libelle requis');
      return;
    }

    const alreadyExists = emailLabels.some(
      (label) => String(label?.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      toast.warning('Ce libelle existe deja');
      return;
    }

    setEmailLabels((prev) => [
      ...prev,
      {
        id: `label-${Date.now()}`,
        name: trimmedName,
        color: newLabelColor,
        userId: user.id,
        createdAt: new Date(),
      },
    ]);
    setNewLabelName('');
    setNewLabelColor('#3B82F6');
    setLabelDialogOpen(false);
    toast.success('Libelle cree');
  }, [emailLabels, newLabelColor, newLabelName, user]);

  const openAvatarViewer = useCallback((src?: string | null, name?: string | null) => {
    if (!src) return;
    setAvatarViewerData({ src, name: name || 'Photo de profil' });
    setAvatarViewerOpen(true);
  }, []);

  const clampSidebarWidth = useCallback((width: number) => {
    return Math.max(220, Math.min(420, width));
  }, []);

  const startSidebarResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (sidebarCollapsed) return;

      event.preventDefault();
      setIsSidebarResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const targetWidth =
          sidebarPosition === 'left'
            ? moveEvent.clientX
            : window.innerWidth - moveEvent.clientX;

        if (sidebarResizeFrameRef.current) {
          cancelAnimationFrame(sidebarResizeFrameRef.current);
        }

        sidebarResizeFrameRef.current = requestAnimationFrame(() => {
          setSidebarWidth(clampSidebarWidth(targetWidth));
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (sidebarResizeFrameRef.current) {
          cancelAnimationFrame(sidebarResizeFrameRef.current);
          sidebarResizeFrameRef.current = null;
        }
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setIsSidebarResizing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [clampSidebarWidth, sidebarCollapsed, sidebarPosition]
  );

  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('noc_sidebar_position');
      const savedWidth = localStorage.getItem('noc_sidebar_width');

      if (savedPosition === 'left' || savedPosition === 'right') {
        setSidebarPosition(savedPosition);
      }

      if (savedWidth) {
        const parsedWidth = Number(savedWidth);
        if (!Number.isNaN(parsedWidth)) {
          setSidebarWidth(clampSidebarWidth(parsedWidth));
        }
      }
    } catch (error) {
      console.error('Impossible de charger les préférences de sidebar', error);
    }
  }, [clampSidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('noc_sidebar_position', sidebarPosition);
      localStorage.setItem('noc_sidebar_width', String(sidebarWidth));
    } catch (error) {
      console.error('Impossible de sauvegarder les préférences de sidebar', error);
    }
  }, [sidebarPosition, sidebarWidth]);

  useEffect(() => {
    return () => {
      if (sidebarResizeFrameRef.current) {
        cancelAnimationFrame(sidebarResizeFrameRef.current);
        sidebarResizeFrameRef.current = null;
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const storageKey = `noc_security_banner_dismissed_${user.id}`;
    const dismissed = localStorage.getItem(storageKey) === '1';
    setHideSecurityBanner(dismissed);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || user.mustChangePassword) return;
    const storageKey = `noc_security_banner_dismissed_${user.id}`;
    localStorage.removeItem(storageKey);
    setHideSecurityBanner(false);
  }, [user?.id, user?.mustChangePassword]);

  // Ouvrir le dialog de sécurité
  const openSecurityDialog = () => {
    setSelectedUser(null);
    setEditPassword('');
    setConfirmPassword('');
    setSecurityDialogOpen(true);
  };

  const openCreateUserDialog = () => {
    setUserToEdit(null);
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditUsername('');
    setEditPassword('');
    setConfirmPassword('');
    setEditRole('USER');
    setEditShift('');
    setEditResponsibility('');
    setEditUserIsActive(true);
    setEditUserIsBlocked(false);
    setCreateUserDialogOpen(true);
  };

  const openEditUserDialog = (targetUser: UserProfile) => {
    setUserToEdit(targetUser);
    setEditFirstName(targetUser.firstName || '');
    setEditLastName(targetUser.lastName || '');
    setEditEmail(targetUser.email || '');
    setEditUsername(targetUser.username || '');
    setEditPassword('');
    setConfirmPassword('');
    setEditRole(targetUser.role);
    setEditShift(targetUser.shift?.name || (targetUser.shiftId?.replace('shift-', '').toUpperCase() || ''));
    setEditResponsibility(targetUser.responsibility || '');
    setEditUserIsActive(Boolean(targetUser.isActive));
    setEditUserIsBlocked(Boolean(targetUser.isBlocked));
    setEditUserDialogOpen(true);
  };

  // Sauvegarder les paramètres de sécurité
  const handleSaveSecurity = async () => {
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

    if (isAdminPasswordResetMode && selectedUser) {
      await handleResetUserPassword(selectedUser, editPassword);
      setSecurityDialogOpen(false);
      setSelectedUser(null);
      setEditPassword('');
      setConfirmPassword('');
      return;
    }

    try {
      const result = await changeOwnPasswordRequest({
        userId: user.id,
        actorId: user.id,
        newPassword: editPassword,
      });

      const updatedUser = {
        ...user,
        ...result.user,
        mustChangePassword: false,
        isFirstLogin: false,
        updatedAt: new Date(),
      };

      setUser(updatedUser);
      localStorage.setItem('noc_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('noc-user-updated'));

      setAllUsers(prev => {
        const updated = prev.map(u => u.id === user.id ? updatedUser : u);
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Impossible de sauvegarder le mot de passe en base' });
      return;
    }

    addAuditLog('PASSWORD_CHANGE', 'Mot de passe modifié');
    setSecurityDialogOpen(false);
    setSelectedUser(null);
    toast.success('Sécurité mise à jour', { description: 'Votre mot de passe a été changé en base de données avec succès' });
  };

  const handleChangeUserRole = async (targetUser: UserProfile, nextRole: UserRole) => {
    if (!canManageUsers || !user?.id) return;
    if (targetUser.role === nextRole) return;
    if (targetUser.role === 'SUPER_ADMIN' && user?.id !== targetUser.id) {
      toast.error('Action interdite', { description: 'Impossible de modifier le rôle d\'un Super Admin' });
      return;
    }

    setUsersActionInProgress(`role:${targetUser.id}`);
    try {
      const result = await updateUserRoleRequest({
        adminId: user.id,
        userId: targetUser.id,
        role: nextRole,
      });

      const updatedUser = { ...targetUser, ...result.user, updatedAt: new Date() };

      setAllUsers((prev) => {
        const updated = prev.map((entry) => (entry.id === targetUser.id ? updatedUser : entry));
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      if (user?.id === targetUser.id) {
        setUser(updatedUser);
        localStorage.setItem('noc_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('noc-user-updated'));
      }
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Mise à jour du rôle impossible' });
      return;
    } finally {
      setUsersActionInProgress(null);
    }

    addAuditLog('USER_ROLE_CHANGED', `Rôle modifié pour ${targetUser.name}: ${targetUser.role} -> ${nextRole}`);
    toast.success('Rôle mis à jour', { description: `${targetUser.name} est maintenant ${ROLE_CONFIG[nextRole].label}` });
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
    window.dispatchEvent(new Event('noc-user-updated'));
    
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
  const handleCreateUser = async () => {
    if (!canManageUsers || !user?.id) return;

    const normalizedEmail = editEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Email invalide', { description: 'Veuillez saisir une adresse email valide' });
      return;
    }
    
    const validation = validatePassword(editPassword);
    if (!validation.isValid) {
      toast.error('Mot de passe invalide', { description: 'Le mot de passe doit respecter les critères de sécurité' });
      return;
    }
    
    const nextShiftId = editShift ? `shift-${editShift.toLowerCase()}` : undefined;

    setUsersActionInProgress('create');
    try {
      const result = await createUserRequest({
        adminId: user.id,
        email: normalizedEmail,
        name: `${editFirstName} ${editLastName}`.trim(),
        firstName: editFirstName,
        lastName: editLastName,
        username: editUsername || editEmail.split('@')[0],
        password: editPassword,
        role: editRole,
        shiftId: nextShiftId,
        responsibility: editResponsibility || undefined,
      });

      const createdUser = { ...result.user, updatedAt: new Date(), createdAt: new Date() } as UserProfile;

      setAllUsers(prev => {
        const updated = [...prev.filter((u) => u.id !== createdUser.id), createdUser];
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Création impossible' });
      return;
    } finally {
      setUsersActionInProgress(null);
    }
    
    addAuditLog('USER_CREATED', `Utilisateur créé: ${editFirstName} ${editLastName} (${editRole})`);
    setCreateUserDialogOpen(false);
    toast.success('Utilisateur créé', { description: `${editFirstName} ${editLastName}`.trim() + ' a été ajouté avec succès' });
    
    // Réinitialiser le formulaire
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditUsername('');
    setEditPassword('');
    setConfirmPassword('');
    setEditRole('USER');
    setEditShift('');
    setEditResponsibility('');
  };

  const handleUpdateUserDetails = async () => {
    if (!canManageUsers || !user?.id || !userToEdit) return;

    const normalizedEmail = editEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Email invalide', { description: 'Veuillez saisir une adresse email valide' });
      return;
    }

    const fullName = `${editFirstName} ${editLastName}`.trim();
    if (!fullName) {
      toast.error('Nom requis', { description: 'Le prénom et/ou le nom doivent être renseignés' });
      return;
    }

    const nextShiftId = editShift ? `shift-${editShift.toLowerCase()}` : null;

    setUsersActionInProgress(`edit:${userToEdit.id}`);
    try {
      const result = await updateUserRequest({
        adminId: user.id,
        userId: userToEdit.id,
        name: fullName,
        firstName: editFirstName,
        lastName: editLastName,
        email: normalizedEmail,
        username: editUsername || null,
        role: editRole,
        shiftId: nextShiftId,
        responsibility: editResponsibility || null,
        isActive: editUserIsActive,
        isBlocked: editUserIsBlocked,
      });

      const updatedUser = { ...userToEdit, ...result.user, updatedAt: new Date() } as UserProfile;
      setAllUsers((prev) => {
        const updated = prev.map((entry) => (entry.id === userToEdit.id ? updatedUser : entry));
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      if (user.id === userToEdit.id) {
        setUser(updatedUser);
        localStorage.setItem('noc_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('noc-user-updated'));
      }

      addAuditLog('USER_UPDATED', `Utilisateur modifié: ${updatedUser.name} (${updatedUser.role})`);
      toast.success('Utilisateur modifié', { description: 'Toutes les informations ont été enregistrées en base' });
      setEditUserDialogOpen(false);
      setUserToEdit(null);
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Mise à jour impossible' });
    } finally {
      setUsersActionInProgress(null);
    }
  };

  // Bloquer/Débloquer un utilisateur
  const handleToggleBlockUser = async (targetUser: UserProfile) => {
    if (!canManageUsers || !user?.id) return;

    const currentUser = allUsers.find((entry) => entry.id === targetUser.id) ?? targetUser;
    const nextIsBlocked = !Boolean(currentUser.isBlocked);
    
    const updatedUser = {
      ...currentUser,
      isBlocked: nextIsBlocked,
      isActive: nextIsBlocked ? Boolean(currentUser.isActive) : true,
      updatedAt: new Date()
    };
    
    setUsersActionInProgress(`block:${targetUser.id}`);
    try {
      const result = await toggleUserBlockRequest({
        adminId: user.id,
        userId: targetUser.id,
        isBlocked: nextIsBlocked,
        isActive: nextIsBlocked ? Boolean(currentUser.isActive) : true,
      });

      const syncedUser = { ...updatedUser, ...result.user };
      setAllUsers(prev => {
        const updated = prev.map(u => u.id === targetUser.id ? syncedUser : u);
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });

      void syncUsersFromApi();
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Blocage/déblocage impossible' });
      return;
    } finally {
      setUsersActionInProgress(null);
    }
    
    addAuditLog('USER_BLOCK_TOGGLE', `Utilisateur ${updatedUser.isBlocked ? 'bloqué' : 'débloqué'}: ${targetUser.name}`);
    toast.success(updatedUser.isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué');
  };

  // Réinitialiser le mot de passe d'un utilisateur
  const handleResetUserPassword = async (targetUser: UserProfile, newPassword: string) => {
    if (!canManageUsers || !user?.id) return;
    
    const updatedUser = {
      ...targetUser,
      passwordHash: hashPassword(newPassword),
      mustChangePassword: true,
      updatedAt: new Date()
    };
    
    setUsersActionInProgress(`reset:${targetUser.id}`);
    try {
      const result = await resetUserPasswordRequest({
        adminId: user.id,
        targetUserId: targetUser.id,
        newPassword,
      });

      const syncedUser = { ...updatedUser, ...result.user };
      setAllUsers(prev => {
        const updated = prev.map(u => u.id === targetUser.id ? syncedUser : u);
        localStorage.setItem('noc_all_users', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Réinitialisation impossible' });
      return;
    } finally {
      setUsersActionInProgress(null);
    }
    
    addAuditLog('PASSWORD_RESET', `Mot de passe réinitialisé pour: ${targetUser.name}`);
    toast.success('Mot de passe réinitialisé', { description: `Le mot de passe de ${targetUser.name} a été réinitialisé` });
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (!isSuperAdmin(user) || !user?.id) return;
    if (targetUser.role === 'SUPER_ADMIN') {
      toast.error('Action interdite', { description: 'Impossible de supprimer un Super Admin' });
      return;
    }
    
    // Ouvrir le dialog de confirmation au lieu de supprimer directement
    setUserToDelete(targetUser);
    setDeleteConfirmationInput('');
    setDeleteConfirmationOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !user?.id) return;
    if (!isSuperAdmin(user)) return;

    // Récupérer le pseudo ou le nom pour la confirmation
    const requiredText = userToDelete.username || userToDelete.name;
    
    // Vérifier que l'utilisateur a bien recopié le pseudo/nom
    if (deleteConfirmationInput.trim() !== requiredText) {
      toast.error('Erreur', { description: 'Le pseudo/nom saisi ne correspond pas' });
      return;
    }

    setUsersActionInProgress(`delete:${userToDelete.id}`);
    setDeleteConfirmationOpen(false);
    
    try {
      await deleteUserRequest({
        adminId: user.id,
        userId: userToDelete.id,
        permanent: true,
      });
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Suppression impossible' });
      return;
    } finally {
      setUsersActionInProgress(null);
    }

    setAllUsers(prev => {
      const updated = prev.filter(u => u.id !== userToDelete.id);
      localStorage.setItem('noc_all_users', JSON.stringify(updated));
      return updated;
    });
    
    addAuditLog('USER_DELETED', `Utilisateur supprimé: ${userToDelete.name}`);
    toast.success('Utilisateur supprimé');
    setUserToDelete(null);
    setDeleteConfirmationInput('');
  };

  // Rafraîchir le journal d'activité
  const refreshAuditLog = async () => {
    setAuditLogRefreshing(true);
    try {
      const logs = await fetchAuditLogRequest();
      setAuditLogs(logs);
      toast.success('Journal d\'activité rafraîchi');
    } catch (error) {
      toast.error('Erreur lors du rafraîchissement', {
        description: 'Impossible de récupérer le journal d\'activité'
      });
    } finally {
      setAuditLogRefreshing(false);
    }
  };

  const filteredAuditLogs = filterAuditLogs({
    auditLogs,
    dateFrom: auditLogDateFrom,
    dateTo: auditLogDateTo,
    actionType: auditLogActionType,
    statusFilter: auditLogStatusFilter,
    userFilter: auditLogUserFilter,
  });

  const uniqueActionTypes = getUniqueAuditActionTypes(auditLogs);

  const filteredUsers = filterUsers({
    users: allUsers,
    searchQuery: userSearchQuery,
    roleFilter,
  });

  const filteredManagedLocalities = filterManagedLocalities(managedLocalities, managedLocalitySearch);
  const ticketStatusFilterOptions = buildTicketFilterOptions(TICKET_STATUSES);
  const ticketPriorityFilterOptions = buildTicketFilterOptions(TICKET_PRIORITIES);
  const ticketStatusArchiveOptions = buildTicketArchiveOptions(TICKET_STATUSES);
  const ticketPriorityArchiveOptions = buildTicketArchiveOptions(TICKET_PRIORITIES);
  const currentStorageTickets = tickets.filter((ticket) => matchesTicketStorageView(ticket, showDeletedTickets, showArchivedTickets));
  const visibleTickets = filterVisibleTickets(currentStorageTickets, {
    ticketSearchQuery,
    ticketStatusFilter,
    ticketPriorityFilter,
    ticketSiteFilter,
    ticketLocaliteFilter,
    ticketTechnicienFilter,
  });
  const archivedTickets = getArchivedTickets(tickets);
  const archiveYears = getArchiveYears(archivedTickets);
  const selectedArchiveTickets = getSelectedArchiveTickets(archivedTickets, archiveYearFilter);
  const archiveYearBuckets = getArchiveYearBuckets(selectedArchiveTickets);
  const archiveReport = getArchiveReport(selectedArchiveTickets, tickets, archiveYearFilter);

  // PDF Generation
  const generateOvertimePDF = useCallback(async () => {
    if (!user?.shift) {
      toast.error('Erreur', { description: 'Aucun shift assigné' });
      return;
    }

    if (!user.firstName || !user.lastName) {
      toast.error('Information manquante', {
        description: 'Veuillez d\'abord renseigner votre nom et prénom complet dans "Modifier mes informations"',
      });
      return;
    }

    try {
      await downloadOvertimePdf({ user, overtimeMonth });
      toast.success('PDF généré', { description: 'Le fichier a été téléchargé' });
    } catch (error) {
      console.error('[planning] generateOvertimePDF', error);
      toast.error('Erreur', { description: 'Impossible de générer le PDF des heures supplémentaires' });
    }
  }, [user, overtimeMonth]);

  const generatePlanningPDF = useCallback(async () => {
    if (!canGeneratePlanningPdf) {
      toast.error('Action non autorisée', {
        description: planningPdfDisabledReason || 'Vous ne pouvez pas générer le PDF planning.',
      });
      return;
    }

    try {
      await downloadPlanningPdf({ currentMonth, allUsers });
      toast.success('PDF généré', { description: 'Le planning a été téléchargé' });
    } catch (error) {
      console.error('[planning] generatePlanningPDF', error);
      toast.error('Erreur', { description: 'Impossible de générer le planning PDF' });
    }
  }, [allUsers, canGeneratePlanningPdf, currentMonth, planningPdfDisabledReason]);

  // Planning generation
  const planning = useMemo(() => buildMonthlyPlanning(currentMonth), [currentMonth]);

  const normalizeIdentity = useCallback((value: unknown) => {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }, []);

  const userShiftKey = useMemo(() => {
    const raw = String(user?.shift?.name ?? user?.shiftId ?? '').trim().toUpperCase();
    if (!raw) return '';
    if (raw === 'A' || raw === 'B' || raw === 'C') return raw;
    const shifted = raw.replace(/^SHIFT[-_\s]*/i, '');
    return shifted === 'A' || shifted === 'B' || shifted === 'C' ? shifted : '';
  }, [user?.shift?.name, user?.shiftId]);

  const isRestAgentCurrentUser = useCallback((agentName: string) => {
    if (!user?.id) return false;

    const normAgent = normalizeIdentity(agentName);
    if (!normAgent) return false;

    const matchingDirectoryUser = allUsers.find((entry) => {
      const candidates = [entry.name, entry.firstName, entry.lastName, entry.username]
        .map((value) => normalizeIdentity(value))
        .filter(Boolean);
      return candidates.some((candidate) => candidate === normAgent || candidate.startsWith(normAgent) || normAgent.startsWith(candidate));
    });

    if (matchingDirectoryUser?.id && matchingDirectoryUser.id === user.id) {
      return true;
    }

    const ownCandidates = [user.name, user.firstName, user.lastName, user.username]
      .map((value) => normalizeIdentity(value))
      .filter(Boolean);
    return ownCandidates.some((candidate) => candidate === normAgent || candidate.startsWith(normAgent) || normAgent.startsWith(candidate));
  }, [allUsers, normalizeIdentity, user?.firstName, user?.id, user?.lastName, user?.name, user?.username]);

  const resolvePlanningRiDisplayName = useCallback((agentName: string) => {
    const overrides = planningSettings.visibility.individualRestNameOverrides ?? {};
    const explicit = String(overrides[agentName] ?? '').trim();
    if (explicit) return explicit;

    const mode = planningSettings.visibility.individualRestLabelMode === 'PSEUDO' ? 'PSEUDO' : 'FULL_NAME';
    if (mode !== 'PSEUDO') return agentName;

    const normAgent = normalizeIdentity(agentName);
    if (!normAgent) return agentName;

    const match = allUsers.find((entry) => {
      const candidates = [entry.name, entry.firstName, entry.lastName, entry.username]
        .map((value) => normalizeIdentity(value))
        .filter(Boolean);
      return candidates.some((candidate) => candidate === normAgent || candidate.startsWith(normAgent) || normAgent.startsWith(candidate));
    });

    const pseudo = String(match?.username ?? '').trim();
    return pseudo || agentName;
  }, [allUsers, normalizeIdentity, planningSettings.visibility.individualRestLabelMode, planningSettings.visibility.individualRestNameOverrides]);

  const effectivePlanningFilterMode: PlanningFilterMode =
    planningFilterMode === 'MY_RESTS' && !canViewPlanningIndividualRest
      ? 'ALL'
      : planningFilterMode;

  const planningForDisplay = useMemo(() => {
    return planning.map((day) => {
      if (effectivePlanningFilterMode === 'ALL' || effectivePlanningFilterMode === 'NOC_AGENT') return day;

      const filteredShifts = day.shifts.filter((shift: any) => {
        const shiftKey = String(shift?.shiftName ?? shift?.name ?? '').trim().toUpperCase().replace(/^SHIFT[-_\s]*/i, '');

        if (effectivePlanningFilterMode === 'MY_SHIFT') {
          if (!userShiftKey) return true;
          return shiftKey === userShiftKey;
        }

        const restAgentName = String(shift?.restInfo?.agentName ?? '').trim();
        if (!restAgentName) return false;
        return isRestAgentCurrentUser(restAgentName);
      });

      return {
        ...day,
        shifts: filteredShifts,
      };
    });
  }, [effectivePlanningFilterMode, isRestAgentCurrentUser, planning, userShiftKey]);

  // Search filter
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <AppLoginScreen
        handleLogin={handleLogin}
        loginIdentifier={loginIdentifier}
        setLoginIdentifier={setLoginIdentifier}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loginError={loginError}
        isLocked={isLocked}
        lockoutSeconds={lockoutSeconds}
        isLoading={isLoading}
        showForgotMessage={showForgotMessage}
        pseudoFocused={pseudoFocused}
        setPseudoFocused={setPseudoFocused}
        passwordFocused={passwordFocused}
        setPasswordFocused={setPasswordFocused}
      />
    );
  }

  const userRestInfo = user?.shift ? getAgentRestInfo(user.name, user.shift.name, new Date()) : null;

  return (
    <>
      <div className="min-h-screen bg-background">
        <PasswordSecurityGuard
          mustChangePassword={Boolean(user?.mustChangePassword)}
          securityDialogOpen={securityDialogOpen}
          onOpenSecurityDialog={openSecurityDialog}
          onLogout={handleLogout}
        />

        <AppTopHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          notificationsOpen={notificationsOpen}
          onNotificationsOpenChange={setNotificationsOpen}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          mounted={mounted}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          user={user}
          onOpenProfileDialog={() => setProfileDialogOpen(true)}
          onOpenAvatarViewer={openAvatarViewer}
          onOpenEditProfileDialog={openEditProfileDialog}
          onOpenShiftDialog={openShiftDialog}
          onOpenRestDialog={() => setRestDialogOpen(true)}
          onOpenSecurityDialog={openSecurityDialog}
          onOpenSettingsDialog={() => setSettingsDialogOpen(true)}
          onOpenAdminUsers={() => setCurrentTabSafely('admin_users')}
          onLogout={handleLogout}
        />

        <div className={`flex ${sidebarPosition === 'right' ? 'lg:flex-row-reverse' : ''}`}>
          <AppSidebar
            sidebarOpen={sidebarOpen}
            sidebarPosition={sidebarPosition}
            sidebarCollapsed={sidebarCollapsed}
            sidebarWidth={sidebarWidth}
            isSidebarResizing={isSidebarResizing}
            onToggleSidebarPosition={() => setSidebarPosition((current: 'left' | 'right') => (current === 'left' ? 'right' : 'left'))}
            onToggleSidebarCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
            onStartSidebarResize={startSidebarResize}
            onCloseMobileSidebar={() => setSidebarOpen(false)}
            currentTab={currentTab}
            onSelectTab={setCurrentTabSafely}
            canAccessPlanning={canAccessPlanning}
            canAccessNocSections={canAccessNocSections}
            isNocGroupOpen={sidebarGroupOpen.noc}
            onToggleNocGroup={() =>
              setSidebarGroupOpen((prev) => ({
                ...prev,
                noc: !prev.noc,
              }))
            }
            conversations={conversations}
            messages={messages}
            gedDocuments={gedDocuments}
            user={user}
            onOpenRestDialog={() => setRestDialogOpen(true)}
          />
          
          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-3.5rem)] overflow-auto">
            <AppMainContentSection
                            canManageTicketEntities={canManageTicketEntities}
              currentTab={currentTab}
              user={user}
              userRestInfo={userRestInfo}
              tasks={tasks}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              planning={planningForDisplay}
              planningFilterMode={planningFilterMode}
              setPlanningFilterMode={setPlanningFilterMode}
              canUseMyShiftPlanningFilter={Boolean(userShiftKey)}
              canUseMyRestsPlanningFilter={canViewPlanningIndividualRest}
              resolvePlanningRiDisplayName={resolvePlanningRiDisplayName}
              generatePlanningPDF={generatePlanningPDF}
              canGeneratePlanningPdf={canGeneratePlanningPdf}
              planningPdfDisabledReason={planningPdfDisabledReason}
              canViewPlanningIndividualRest={canViewPlanningIndividualRest}
              overtimeMonth={overtimeMonth}
              setOvertimeMonth={setOvertimeMonth}
              generateOvertimePDF={generateOvertimePDF}
              openAvatarViewer={openAvatarViewer}
              setNewConversationOpen={setNewConversationOpen}
              setCreateGroupOpen={setCreateGroupOpen}
              chatSearchQuery={chatSearchQuery}
              setChatSearchQuery={setChatSearchQuery}
              statusList={statusList}
              usersDirectory={usersDirectory}
              setMyStatusesOpen={setMyStatusesOpen}
              setCreateStatusOpen={setCreateStatusOpen}
              setViewingUserStatuses={setViewingUserStatuses}
              setViewingStatusIndex={setViewingStatusIndex}
              setViewingStatus={setViewingStatus}
              setStatusViewOpen={setStatusViewOpen}
              setStatusList={setStatusList}
              conversationFilter={conversationFilter}
              setConversationFilter={setConversationFilter}
              conversations={conversations}
              selectedConversation={selectedConversation}
              userPresence={userPresence}
              announcementAvatar={announcementAvatar}
              handleConversationSelect={handleConversationSelect}
              customBackgroundImage={customBackgroundImage}
              typingIndicators={typingIndicators}
              messageSearchOpen={messageSearchOpen}
              setMessageSearchOpen={setMessageSearchOpen}
              setBackgroundSettingsOpen={setBackgroundSettingsOpen}
              setConversations={setConversations}
              setSelectedConversation={setSelectedConversation}
              startOutgoingCall={startOutgoingCall}
              openConversationAvatarUploader={openConversationAvatarUploader}
              chatMessages={chatMessages}
              chatSearchMessageQuery={chatSearchMessageQuery}
              setChatSearchMessageQuery={setChatSearchMessageQuery}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              currentSearchIndex={currentSearchIndex}
              setCurrentSearchIndex={setCurrentSearchIndex}
              messageContainerRef={messageContainerRef}
              setShowScrollToBottom={setShowScrollToBottom}
              pinnedMessages={pinnedMessages}
              playingMessageId={playingMessageId}
              audioProgress={audioProgress}
              audioRef={audioRef}
              setPlayingMessageId={setPlayingMessageId}
              setAudioProgress={setAudioProgress}
              setChatImagePreview={setChatImagePreview}
              setChatImageZoom={setChatImageZoom}
              selectedChatMessages={selectedChatMessages}
              isSelectionMode={isSelectionMode}
              setSelectedChatMessages={setSelectedChatMessages}
              setContextMenuMessage={setContextMenuMessage}
              setContextMenuPosition={setContextMenuPosition}
              setShowContextMenu={setShowContextMenu}
              setReplyingTo={setReplyingTo}
              liveReactions={liveReactions}
              messageEndRef={messageEndRef}
              showScrollToBottom={showScrollToBottom}
              showContextMenu={showContextMenu}
              contextMenuMessage={contextMenuMessage}
              contextMenuPosition={contextMenuPosition}
              setChatMessages={setChatMessages}
              setEditingMessage={setEditingMessage}
              setEditMessageContent={setEditMessageContent}
              setEditMessageDialogOpen={setEditMessageDialogOpen}
              updateChatMessage={updateChatMessage}
              setPinnedMessages={setPinnedMessages}
              showFormattingToolbar={showFormattingToolbar}
              currentFormatting={currentFormatting}
              setCurrentFormatting={setCurrentFormatting}
              replyingTo={replyingTo}
              attachmentPreview={attachmentPreview}
              setAttachmentPreview={setAttachmentPreview}
              recentEmojis={recentEmojis}
              setNewMessage={setNewMessage}
              registerRecentEmoji={registerRecentEmoji}
              broadcastLiveReaction={broadcastLiveReaction}
              theme={theme}
              isCompactEmojiLayout={isCompactEmojiLayout}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              showLiveReactionPicker={showLiveReactionPicker}
              setShowLiveReactionPicker={setShowLiveReactionPicker}
              newMessage={newMessage}
              showMentionSuggestions={showMentionSuggestions}
              setShowMentionSuggestions={setShowMentionSuggestions}
              mentionQuery={mentionQuery}
              setMentionQuery={setMentionQuery}
              setMentionedUsers={setMentionedUsers}
              broadcastTypingStatus={broadcastTypingStatus}
              typingStopTimeoutRef={typingStopTimeoutRef}
              sendChatMessage={sendChatMessage}
              recordingTime={recordingTime}
              setLastReplyTo={setLastReplyTo}
              playMessageSendSound={playMessageSendSound}
              setSimulatedTyping={setSimulatedTyping}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              setRecordingTime={setRecordingTime}
              mediaRecorderRef={mediaRecorderRef}
              audioChunksRef={audioChunksRef}
              isAnnouncementsConversation={isAnnouncementsConversation}
              editMessageDialogOpen={editMessageDialogOpen}
              editMessageContent={editMessageContent}
              handleSaveEditedMessage={handleSaveEditedMessage}
              chatImagePreview={chatImagePreview}
              chatImageZoom={chatImageZoom}
              createGroupOpen={createGroupOpen}
              newGroupName={newGroupName}
              setNewGroupName={setNewGroupName}
              newGroupDescription={newGroupDescription}
              setNewGroupDescription={setNewGroupDescription}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              createConversationInDb={createConversationInDb}
              incomingCall={incomingCall}
              activeCall={activeCall}
              callState={callState}
              handleIncomingCallAction={handleIncomingCallAction}
              setConferenceEnabled={setConferenceEnabled}
              setHeldCall={setHeldCall}
              callParticipants={callParticipants}
              setCallParticipants={setCallParticipants}
              addNotification={addNotification}
              callDialogOpen={callDialogOpen}
              setCallDialogOpen={setCallDialogOpen}
              setActiveCall={setActiveCall}
              setCallState={setCallState}
              callTimer={callTimer}
              setCallTimer={setCallTimer}
              setLiveReactions={setLiveReactions}
              setAddParticipantsOpen={setAddParticipantsOpen}
              isCallMuted={isCallMuted}
              setIsCallMuted={setIsCallMuted}
              isCallSpeakerOn={isCallSpeakerOn}
              setIsCallSpeakerOn={setIsCallSpeakerOn}
              showCallReactionPicker={showCallReactionPicker}
              setShowCallReactionPicker={setShowCallReactionPicker}
              callTimeoutRef={callTimeoutRef}
              addParticipantsOpen={addParticipantsOpen}
              newConversationOpen={newConversationOpen}
              newConversationSearch={newConversationSearch}
              setNewConversationSearch={setNewConversationSearch}
              getShiftColor={getShiftColor}
              resetConversationUnreadCount={resetConversationUnreadCount}
              backgroundSettingsOpen={backgroundSettingsOpen}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              soundOnSend={soundOnSend}
              setSoundOnSend={setSoundOnSend}
              soundOnReceive={soundOnReceive}
              setSoundOnReceive={setSoundOnReceive}
              soundOnNotification={soundOnNotification}
              setSoundOnNotification={setSoundOnNotification}
              handleSetBackground={handleSetBackground}
              profilePhotoDialogOpen={profilePhotoDialogOpen}
              setProfilePhotoDialogOpen={setProfilePhotoDialogOpen}
              tempProfilePhoto={tempProfilePhoto}
              setTempProfilePhoto={setTempProfilePhoto}
              clearTempAvatarObjectUrl={clearTempAvatarObjectUrl}
              profileCrop={profileCrop}
              setProfileCrop={setProfileCrop}
              profileZoom={profileZoom}
              setProfileZoom={setProfileZoom}
              setProfileCroppedAreaPixels={setProfileCroppedAreaPixels}
              handleAvatarFileSelection={handleAvatarFileSelection}
              handleSaveCroppedPhoto={handleSaveCroppedPhoto}
              createStatusOpen={createStatusOpen}
              statusMediaPreview={statusMediaPreview}
              setStatusMediaPreview={setStatusMediaPreview}
              statusMediaType={statusMediaType}
              setStatusMediaType={setStatusMediaType}
              statusCaption={statusCaption}
              setStatusCaption={setStatusCaption}
              statusBlockedContacts={statusBlockedContacts}
              setStatusBlockedContacts={setStatusBlockedContacts}
              handlePublishStatus={handlePublishStatus}
              myStatusesOpen={myStatusesOpen}
              statusViewOpen={statusViewOpen}
              viewingStatus={viewingStatus}
              viewingStatusIndex={viewingStatusIndex}
              viewingUserStatuses={viewingUserStatuses}
              showStatusDetails={showStatusDetails}
              setShowStatusDetails={setShowStatusDetails}
              taskDialogOpen={taskDialogOpen}
              setTaskDialogOpen={setTaskDialogOpen}
              newTask={newTask}
              setNewTask={setNewTask}
              TASK_PRIORITIES={TASK_PRIORITIES}
              TASK_CATEGORIES={TASK_CATEGORIES}
              handleCreateTask={handleCreateTask}
              tasksStats={tasksStats}
              searchQuery={searchQuery}
              taskFilter={taskFilter}
              setSearchQuery={setSearchQuery}
              setTaskFilter={setTaskFilter}
              nocTasks={nocTasks}
              displayedTasks={displayedTasks}
              TASK_STATUSES={TASK_STATUSES}
              formatDuration={formatDuration}
              handleToggleTaskCompletion={handleToggleTaskCompletion}
              handleStartTask={handleStartTask}
              handlePauseTask={handlePauseTask}
              handleResumeTask={handleResumeTask}
              handleUpdateTaskSchedule={handleUpdateTaskSchedule}
              handleLinkTaskToTicket={handleLinkTaskToTicket}
              handleQuickUpdateTask={handleQuickUpdateTask}
              handleOpenTaskDetails={handleOpenTaskDetails}
              handleDeleteTask={handleDeleteTask}
              dailyTaskPerformance={dailyTaskPerformance}
              dailyTaskBadgeConfig={dailyTaskBadgeConfig}
              activityDialogOpen={activityDialogOpen}
              setActivityDialogOpen={setActivityDialogOpen}
              newActivity={newActivity}
              setNewActivity={setNewActivity}
              ACTIVITY_TYPES={ACTIVITY_TYPES}
              activities={activities}
              setActivities={setActivities}
              showArchivedTickets={showArchivedTickets}
              quickLocalityDialogOpen={quickLocalityDialogOpen}
              setQuickLocalityDialogOpen={setQuickLocalityDialogOpen}
              setQuickLocalityDraft={setQuickLocalityDraft as any}
              DEFAULT_TICKET_LOCALITY_DRAFT={DEFAULT_TICKET_LOCALITY_DRAFT}
              quickLocalityDraft={quickLocalityDraft}
              quickLocalityTab={quickLocalityTab}
              setQuickLocalityTab={setQuickLocalityTab}
              managedLocalitySearch={managedLocalitySearch}
              setManagedLocalitySearch={setManagedLocalitySearch}
              selectedManagedLocalityId={selectedManagedLocalityId}
              handleSelectManagedLocality={handleSelectManagedLocality as any}
              filteredManagedLocalities={filteredManagedLocalities as any[]}
              managedLocalityName={managedLocalityName}
              setManagedLocalityName={setManagedLocalityName}
              managedLocalityDraft={managedLocalityDraft}
              setManagedLocalityDraft={setManagedLocalityDraft as any}
              ticketCongoDepartments={ticketCongoDepartments as any[]}
              isCreatingLocality={isCreatingLocality}
              isDeletingLocality={isDeletingLocality}
              isUpdatingLocality={isUpdatingLocality}
              handleQuickCreateLocality={handleQuickCreateLocality as any}
              handleDeleteManagedLocality={handleDeleteManagedLocality as any}
              handleUpdateManagedLocality={handleUpdateManagedLocality as any}
              ticketViewMode={ticketViewMode}
              ticketSiteOptions={ticketSiteOptions}
              ticketLocalityOptions={ticketLocalityOptions}
              ticketTechnicianOptions={ticketTechnicianOptions}
              setShowArchivedTickets={setShowArchivedTickets}
              setShowDeletedTickets={setShowDeletedTickets}
              setTicketSearchQuery={setTicketSearchQuery}
              setTicketStatusFilter={setTicketStatusFilter as any}
              setTicketPriorityFilter={setTicketPriorityFilter as any}
              setTicketSiteFilter={setTicketSiteFilter as any}
              setTicketLocaliteFilter={setTicketLocaliteFilter as any}
              setTicketTechnicienFilter={setTicketTechnicienFilter as any}
              loadTicketsModuleData={loadTicketsModuleData}
              setTicketViewMode={setTicketViewMode as any}
              upsertLocalityOption={upsertLocalityOption as any}
              mapApiTicketToLegacy={mapApiTicketToLegacy as any}
              setTickets={setTickets as any}
              ticketSearchQuery={ticketSearchQuery}
              ticketStatusFilter={ticketStatusFilter}
              ticketPriorityFilter={ticketPriorityFilter}
              ticketSiteFilter={ticketSiteFilter}
              ticketLocaliteFilter={ticketLocaliteFilter}
              ticketTechnicienFilter={ticketTechnicienFilter}
              visibleTickets={visibleTickets as any[]}
              currentStorageTickets={currentStorageTickets as any[]}
              showDeletedTickets={showDeletedTickets}
              ticketStatusFilterOptions={ticketStatusFilterOptions}
              ticketPriorityFilterOptions={ticketPriorityFilterOptions}
              TICKET_STATUSES={TICKET_STATUSES}
              TICKET_PRIORITIES={TICKET_PRIORITIES}
              TICKET_CATEGORIES={TICKET_CATEGORIES}
              showTrashContextMenu={showTrashContextMenu}
              trashContextTicket={trashContextTicket}
              trashContextMenuPosition={trashContextMenuPosition}
              deleteTicketDialogOpen={deleteTicketDialogOpen}
              deleteTicketPermanent={deleteTicketPermanent}
              deleteTicketTarget={deleteTicketTarget}
              isTicketActionBusy={isTicketActionBusy}
              router={router}
              openTicketDetailPage={openTicketDetailPage}
              openTrashTicketContextMenu={openTrashTicketContextMenu as any}
              handleRestoreTicket={handleRestoreTicket as any}
              requestDeleteTicket={requestDeleteTicket as any}
              setEditingTicket={setEditingTicket as any}
              setEditTicketOpen={setEditTicketOpen}
              setDeleteTicketDialogOpen={setDeleteTicketDialogOpen}
              setDeleteTicketTarget={setDeleteTicketTarget as any}
              setDeleteTicketPermanent={setDeleteTicketPermanent}
              handleDeleteTicket={handleDeleteTicket as any}
              archiveYears={archiveYears}
              archiveYearFilter={archiveYearFilter}
              archiveYearBuckets={archiveYearBuckets}
              archiveReport={archiveReport}
              setArchiveYearFilter={setArchiveYearFilter as any}
              tickets={tickets as any[]}
              handleUnarchiveTicket={handleUnarchiveTicket as any}
              ticketStatusArchiveOptions={ticketStatusArchiveOptions}
              ticketPriorityArchiveOptions={ticketPriorityArchiveOptions}
              editTicketOpen={editTicketOpen}
              editingTicket={editingTicket}
              editTicketLocalityDraft={editTicketLocalityDraft}
              setEditTicketLocalityDraft={setEditTicketLocalityDraft as any}
              isEditLocalityCreationEnabled={isEditLocalityCreationEnabled}
              setIsEditLocalityCreationEnabled={setIsEditLocalityCreationEnabled}
              createTicketLocality={createTicketLocality as any}
              resolveTicketSiteSelection={resolveTicketSiteSelection as any}
              resolveTicketTechnicians={resolveTicketTechnicians as any}
              updateTicketDetailsRequest={updateTicketDetailsRequest as any}
              mapLegacyTicketStatusToApi={mapLegacyTicketStatusToApi as any}
              mapLegacyTicketPriorityToApi={mapLegacyTicketPriorityToApi as any}
              splitTicketValues={splitTicketValues as any}
              setSelectedTicket={setSelectedTicket as any}
              mobileSidebarOpen={mobileSidebarOpen}
              setMobileSidebarOpen={setMobileSidebarOpen}
              sidebarCollapsed={sidebarCollapsed}
              currentFolder={currentFolder}
              setCurrentFolder={setCurrentFolder}
              messages={messages}
              snoozedEmails={snoozedEmails}
              setComposeOpen={setComposeOpen}
              setReplyToMessage={setReplyToMessage as any}
              setForwardMessage={setForwardMessage as any}
              setNewEmail={setNewEmail as any}
              setComposeMinimized={setComposeMinimized}
              setComposeMaximized={setComposeMaximized}
              emailLabels={emailLabels}
              labelDialogOpen={labelDialogOpen}
              setLabelDialogOpen={setLabelDialogOpen}
              newLabelName={newLabelName}
              setNewLabelName={setNewLabelName}
              newLabelColor={newLabelColor}
              setNewLabelColor={setNewLabelColor}
              handleCreateEmailLabel={handleCreateEmailLabel}
              selectedMessage={selectedMessage}
              setSelectedMessage={setSelectedMessage as any}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages as any}
              getFilteredMessages={getFilteredMessages}
              displayDensity={displayDensity}
              setDisplayDensity={setDisplayDensity as any}
              setSnoozedEmails={setSnoozedEmails as any}
              importantEmails={importantEmails}
              setImportantEmails={setImportantEmails as any}
              composeOpen={composeOpen}
              composeMinimized={composeMinimized}
              composeMaximized={composeMaximized}
              replyToMessage={replyToMessage}
              forwardMessage={forwardMessage}
              newEmail={newEmail}
              toInput={toInput}
              setToInput={setToInput}
              ccInput={ccInput}
              setCcInput={setCcInput}
              bccInput={bccInput}
              setBccInput={setBccInput}
              showCc={showCc}
              setShowCc={setShowCc}
              showBcc={showBcc}
              setShowBcc={setShowBcc}
              richTextStyle={richTextStyle}
              setRichTextStyle={setRichTextStyle as any}
              emailSettings={emailSettings}
              setEmailSettings={setEmailSettings as any}
              generateId={generateId}
              setMessages={setMessages as any}
              gmailSettingsOpen={gmailSettingsOpen}
              setGmailSettingsOpen={setGmailSettingsOpen}
              setTheme={setTheme as any}
              vacationResponder={vacationResponder}
              setVacationResponder={setVacationResponder}
              emailNotifications={emailNotifications}
              setEmailNotifications={setEmailNotifications}
              setProfileDialogOpen={setProfileDialogOpen}
              handleLogout={handleLogout}
              isNocSection={isNocSection}
              NOC_SIDEBAR_ITEMS={NOC_SIDEBAR_ITEMS}
              nocOverviewData={nocOverviewData}
              nocOverviewLoading={nocOverviewLoading}
              refreshNocOverview={refreshNocOverview}
              handleMonitoringKpiClick={handleMonitoringKpiClick}
              monitoringScope={monitoringScope}
              monitoringDrilldown={monitoringDrilldown}
              nocReportData={nocReportData}
              generateConsumptionReport={generateConsumptionReport}
              SHIFTS_DATA={SHIFTS_DATA}
              getShiftScheduleForDate={getShiftScheduleForDate}
              getIndividualRestAgent={getIndividualRestAgent}
              canManageUsers={canManageUsers}
              isUsersSyncing={isUsersSyncing}
              syncUsersFromApi={syncUsersFromApi}
              setCurrentTabSafely={setCurrentTabSafely}
              openCreateUserDialog={openCreateUserDialog}
              userSearchQuery={userSearchQuery}
              setUserSearchQuery={setUserSearchQuery}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter as any}
              filteredUsers={filteredUsers}
              usersActionInProgress={usersActionInProgress}
              ROLE_CONFIG={ROLE_CONFIG}
              openEditUserDialog={openEditUserDialog}
              handleChangeUserRole={handleChangeUserRole as any}
              handleToggleBlockUser={handleToggleBlockUser as any}
              setSelectedUser={setSelectedUser as any}
              setEditPassword={setEditPassword}
              setConfirmPassword={setConfirmPassword}
              setSecurityDialogOpen={setSecurityDialogOpen}
              handleDeleteUser={handleDeleteUser as any}
              isSuperAdmin={isSuperAdmin}
              auditLogs={auditLogs}
              ticketAdminSettings={ticketAdminSettings}
              setTicketAdminSettings={setTicketAdminSettings}
              ticketAdminSettingsLoading={ticketAdminSettingsLoading}
              ticketAdminSettingsSaving={ticketAdminSettingsSaving}
              ticketAdminEmailsInput={ticketAdminEmailsInput}
              setTicketAdminEmailsInput={setTicketAdminEmailsInput}
              loadTicketAdminSettings={loadTicketAdminSettings}
              saveTicketAdminSettings={saveTicketAdminSettings}
              TICKET_ADMIN_CATEGORY_KEYS={TICKET_ADMIN_CATEGORY_KEYS}
              SECTION_LABELS={SECTION_LABELS}
              sectionAccess={sectionAccess}
              setSectionAccess={setSectionAccess}
              ALERT_TYPE_CONFIG={ALERT_TYPE_CONFIG}
              SHIFT_CYCLE_START={SHIFT_CYCLE_START}
              allUsers={allUsers}
              assignUserToShift={assignUserToShift}
              shiftAssignmentBusyUserId={shiftAssignmentBusyUserId}
              planningSettings={planningSettings}
              setPlanningSettings={setPlanningSettings}
              planningSettingsLoading={planningSettingsLoading}
              planningSettingsSaving={planningSettingsSaving}
              loadPlanningSettings={loadPlanningSettings}
              savePlanningSettings={savePlanningSettings}
              availablePlanningRoles={availablePlanningRoles}
            />
          </main>
        </div>

        <AppShellDialogsSection
          chatAvatarInputRef={chatAvatarInputRef}
          handleConversationAvatarUpload={handleConversationAvatarUpload}
          restDialogOpen={restDialogOpen}
          setRestDialogOpen={setRestDialogOpen}
          user={user}
          userRestInfo={userRestInfo}
          profileDialogOpen={profileDialogOpen}
          setProfileDialogOpen={setProfileDialogOpen}
          openAvatarViewer={openAvatarViewer}
          avatarFileInputRef={avatarFileInputRef}
          handleAvatarUpload={handleAvatarUpload}
          persistUserProfile={persistUserProfile}
          fetchConversations={fetchConversations}
          editProfileDialogOpen={editProfileDialogOpen}
          setEditProfileDialogOpen={setEditProfileDialogOpen}
          editFirstName={editFirstName}
          setEditFirstName={setEditFirstName}
          editLastName={editLastName}
          setEditLastName={setEditLastName}
          editEmail={editEmail}
          setEditEmail={setEditEmail}
          editUsername={editUsername}
          setEditUsername={setEditUsername}
          handleSaveProfile={handleSaveProfile}
          securityDialogOpen={securityDialogOpen}
          setSecurityDialogOpen={setSecurityDialogOpen}
          setSelectedUser={setSelectedUser as any}
          setEditPassword={setEditPassword}
          setConfirmPassword={setConfirmPassword}
          isAdminPasswordResetMode={isAdminPasswordResetMode}
          selectedUser={selectedUser}
          editPassword={editPassword}
          confirmPassword={confirmPassword}
          validatePassword={validatePassword}
          handleSaveSecurity={handleSaveSecurity}
          shiftDialogOpen={shiftDialogOpen}
          setShiftDialogOpen={setShiftDialogOpen}
          editShift={editShift}
          setEditShift={setEditShift}
          editResponsibility={editResponsibility}
          setEditResponsibility={setEditResponsibility as any}
          handleSaveShift={handleSaveShift}
          settingsDialogOpen={settingsDialogOpen}
          setSettingsDialogOpen={setSettingsDialogOpen}
          theme={theme || 'light'}
          setTheme={setTheme as any}
          isSuperAdmin={isSuperAdmin}
          usersManagementOpen={usersManagementOpen}
          setUsersManagementOpen={setUsersManagementOpen}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter as any}
          setCreateUserDialogOpen={setCreateUserDialogOpen}
          filteredUsers={filteredUsers as any[]}
          ROLE_CONFIG={ROLE_CONFIG}
          handleChangeUserRole={handleChangeUserRole as any}
          handleToggleBlockUser={handleToggleBlockUser as any}
          handleDeleteUser={handleDeleteUser as any}
          canManageUsers={canManageUsers}
          createUserDialogOpen={createUserDialogOpen}
          editRole={editRole as any}
          setEditRole={setEditRole as any}
          handleCreateUser={handleCreateUser as any}
          usersActionInProgress={usersActionInProgress}
          editUserDialogOpen={editUserDialogOpen}
          setEditUserDialogOpen={setEditUserDialogOpen}
          editUserIsActive={editUserIsActive}
          setEditUserIsActive={setEditUserIsActive}
          editUserIsBlocked={editUserIsBlocked}
          setEditUserIsBlocked={setEditUserIsBlocked}
          handleUpdateUserDetails={handleUpdateUserDetails as any}
          userToEdit={userToEdit}
          deleteConfirmationOpen={deleteConfirmationOpen}
          setDeleteConfirmationOpen={setDeleteConfirmationOpen}
          setUserToDelete={setUserToDelete as any}
          setDeleteConfirmationInput={setDeleteConfirmationInput}
          userToDelete={userToDelete}
          deleteConfirmationInput={deleteConfirmationInput}
          confirmDeleteUser={confirmDeleteUser}
          auditLogDialogOpen={auditLogDialogOpen}
          setAuditLogDialogOpen={setAuditLogDialogOpen}
          refreshAuditLog={refreshAuditLog}
          auditLogRefreshing={auditLogRefreshing}
          auditLogDateFrom={auditLogDateFrom}
          setAuditLogDateFrom={setAuditLogDateFrom}
          auditLogDateTo={auditLogDateTo}
          setAuditLogDateTo={setAuditLogDateTo}
          auditLogActionType={auditLogActionType}
          setAuditLogActionType={setAuditLogActionType}
          uniqueActionTypes={uniqueActionTypes}
          auditLogStatusFilter={auditLogStatusFilter}
          setAuditLogStatusFilter={setAuditLogStatusFilter}
          auditLogUserFilter={auditLogUserFilter}
          setAuditLogUserFilter={setAuditLogUserFilter}
          filteredAuditLogs={filteredAuditLogs as any[]}
          auditLogs={auditLogs as any[]}
          avatarViewerOpen={avatarViewerOpen}
          setAvatarViewerOpen={setAvatarViewerOpen}
          avatarViewerData={avatarViewerData}
        />
      </div>
    </>
  );
}
