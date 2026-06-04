import {
  Eye,
  KeyRound,
  Pencil,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { AppAdminTabContent } from '@/features/app-shell/components/admin/AppAdminTabContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AppAdminUsersTabContentProps = {
  isUsersSyncing: boolean;
  syncUsersFromApi: () => Promise<void>;
  setCurrentTabSafely: (tab: any) => void;
  openCreateUserDialog: () => void;
  userSearchQuery: string;
  setUserSearchQuery: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  filteredUsers: any[];
  usersActionInProgress: string | null;
  ROLE_CONFIG: Record<string, { label: string; color: string }>;
  openEditUserDialog: (user: any) => void;
  handleChangeUserRole: (user: any, role: any) => Promise<void>;
  user: any;
  handleToggleBlockUser: (user: any) => Promise<void>;
  setSelectedUser: (user: any) => void;
  setEditPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setSecurityDialogOpen: (open: boolean) => void;
  handleDeleteUser: (user: any) => Promise<void>;
  isSuperAdmin: (user: any) => boolean;
  auditLogs: Array<{
    id: string;
    action: string;
    details: string;
    userName: string;
    createdAt: Date | string;
    status?: string;
  }>;
  ticketAdminSettings: any;
  setTicketAdminSettings: (updater: any) => void;
  ticketAdminSettingsLoading: boolean;
  ticketAdminSettingsSaving: boolean;
  ticketAdminEmailsInput: string;
  setTicketAdminEmailsInput: (value: string) => void;
  loadTicketAdminSettings: () => Promise<void>;
  saveTicketAdminSettings: () => Promise<void>;
  TICKET_ADMIN_CATEGORY_KEYS: readonly string[];
  SECTION_LABELS: Record<string, string>;
  sectionAccess: Record<string, boolean>;
  setSectionAccess: (updater: any) => void;
  ALERT_TYPE_CONFIG: Record<string, { label: string; colorClass: string }>;
  SHIFTS_DATA: Record<string, { members: string[] }>;
  SHIFT_CYCLE_START: Record<string, Date>;
  getShiftColor: (shiftName: string) => string;
};

type UserDomainPolicyMode = 'default' | 'custom' | 'allow_any';
type UsersDisplayMode = 'table' | 'cards';
type AdminUsersTab = 'users' | 'history' | 'dashboard' | 'administration' | 'configuration';
type HistoryEventGroup = 'all' | 'security' | 'password' | 'user-management' | 'profile' | 'access';
type AdminConfigurationSubTab = 'domains' | 'interface';

type UserDomainPolicy = {
  userId: string;
  mode: UserDomainPolicyMode;
  customDomains: string[];
  updatedAt: string;
  updatedBy?: string;
};

type GlobalDomain = {
  id: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
};

type DashboardConfig = {
  showSlaWidget: boolean;
  showIncidentsWidget: boolean;
  showShiftWidget: boolean;
  showRecentActivityWidget: boolean;
};

const USERS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const DASHBOARD_CONFIG_STORAGE_KEY = 'noc_admin_users_dashboard_config';
const USERS_DEFAULT_VIEW_STORAGE_KEY = 'noc_admin_users_default_view';
const USERS_PAGE_SIZE_STORAGE_KEY = 'noc_admin_users_page_size';

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  showSlaWidget: true,
  showIncidentsWidget: true,
  showShiftWidget: true,
  showRecentActivityWidget: true,
};

export function AppAdminUsersTabContent({
  isUsersSyncing,
  syncUsersFromApi,
  setCurrentTabSafely,
  openCreateUserDialog,
  userSearchQuery,
  setUserSearchQuery,
  roleFilter,
  setRoleFilter,
  filteredUsers,
  usersActionInProgress,
  ROLE_CONFIG,
  openEditUserDialog,
  handleChangeUserRole,
  user,
  handleToggleBlockUser,
  setSelectedUser,
  setEditPassword,
  setConfirmPassword,
  setSecurityDialogOpen,
  handleDeleteUser,
  isSuperAdmin,
  auditLogs,
  ticketAdminSettings,
  setTicketAdminSettings,
  ticketAdminSettingsLoading,
  ticketAdminSettingsSaving,
  ticketAdminEmailsInput,
  setTicketAdminEmailsInput,
  loadTicketAdminSettings,
  saveTicketAdminSettings,
  TICKET_ADMIN_CATEGORY_KEYS,
  SECTION_LABELS,
  sectionAccess,
  setSectionAccess,
  ALERT_TYPE_CONFIG,
  SHIFTS_DATA,
  SHIFT_CYCLE_START,
  getShiftColor,
}: AppAdminUsersTabContentProps) {
  const [activeTab, setActiveTab] = useState<AdminUsersTab>('users');
  const [displayMode, setDisplayMode] = useState<UsersDisplayMode>('table');
  const [usersPageSize, setUsersPageSize] = useState<number>(25);
  const [usersPage, setUsersPage] = useState<number>(1);

  const [historyQuery, setHistoryQuery] = useState('');
  const [historyGroupFilter, setHistoryGroupFilter] = useState<HistoryEventGroup>('all');
  const [historyActionFilter, setHistoryActionFilter] = useState('all');
  const [historyActorFilter, setHistoryActorFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [configurationSubTab, setConfigurationSubTab] = useState<AdminConfigurationSubTab>('domains');
  const [configDomains, setConfigDomains] = useState<GlobalDomain[]>([]);
  const [configDomainsBusy, setConfigDomainsBusy] = useState(false);
  const [configDomainError, setConfigDomainError] = useState<string | null>(null);
  const [configNewDomain, setConfigNewDomain] = useState('');
  const [configNewDomainIsDefault, setConfigNewDomainIsDefault] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [policyMode, setPolicyMode] = useState<UserDomainPolicyMode>('default');
  const [policyCustomDomains, setPolicyCustomDomains] = useState<string[]>([]);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [globalDomains, setGlobalDomains] = useState<GlobalDomain[]>([]);

  useEffect(() => {
    try {
      const storedView = localStorage.getItem(USERS_DEFAULT_VIEW_STORAGE_KEY);
      if (storedView === 'table' || storedView === 'cards') {
        setDisplayMode(storedView);
      }

      const storedPageSize = Number(localStorage.getItem(USERS_PAGE_SIZE_STORAGE_KEY));
      if (USERS_PAGE_SIZE_OPTIONS.includes(storedPageSize as any)) {
        setUsersPageSize(storedPageSize);
      }

      const storedDashboardConfig = localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY);
      if (storedDashboardConfig) {
        const parsed = JSON.parse(storedDashboardConfig) as Partial<DashboardConfig>;
        setDashboardConfig({ ...DEFAULT_DASHBOARD_CONFIG, ...parsed });
      }
    } catch {
      // Keep defaults when localStorage is unavailable or invalid.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(USERS_DEFAULT_VIEW_STORAGE_KEY, displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem(USERS_PAGE_SIZE_STORAGE_KEY, String(usersPageSize));
  }, [usersPageSize]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, JSON.stringify(dashboardConfig));
    window.dispatchEvent(new Event('noc-dashboard-config-updated'));
  }, [dashboardConfig]);

  useEffect(() => {
    setUsersPage(1);
  }, [usersPageSize, userSearchQuery, roleFilter, filteredUsers.length]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyQuery, historyGroupFilter, historyActionFilter, historyActorFilter, historyStatusFilter]);

  const activeGlobalDomains = useMemo(
    () => globalDomains.filter((entry) => entry.isActive).map((entry) => entry.domain),
    [globalDomains]
  );

  const configurationActiveDomains = useMemo(
    () => configDomains.filter((entry) => entry.isActive),
    [configDomains]
  );

  const configurationDefaultDomain = useMemo(() => {
    const currentDefault = configurationActiveDomains.find((entry) => entry.isDefault);
    if (currentDefault) return currentDefault.domain;
    return configurationActiveDomains[0]?.domain ?? '';
  }, [configurationActiveDomains]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aName = String(a?.name || '').toLowerCase();
      const bName = String(b?.name || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [filteredUsers]);

  const usersTotalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPageSize));
  const normalizedUsersPage = Math.min(usersPage, usersTotalPages);
  const pagedUsers = useMemo(() => {
    const start = (normalizedUsersPage - 1) * usersPageSize;
    return sortedUsers.slice(start, start + usersPageSize);
  }, [sortedUsers, normalizedUsersPage, usersPageSize]);

  const uniqueHistoryActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => String(log.action || '').trim()).filter(Boolean))).sort();
  }, [auditLogs]);

  const uniqueHistoryActors = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => String(log.userName || '').trim()).filter(Boolean))).sort();
  }, [auditLogs]);

  const getHistoryEventGroup = (action: string): Exclude<HistoryEventGroup, 'all'> => {
    const normalized = String(action || '').trim().toUpperCase();
    if (normalized.includes('PASSWORD')) return 'password';
    if (normalized.includes('PROFILE')) return 'profile';
    if (normalized.includes('LOGIN') || normalized.includes('AUTH')) return 'access';
    if (
      normalized.includes('USER_')
      || normalized.includes('ROLE')
      || normalized.includes('BLOCK')
      || normalized.includes('DELETE')
      || normalized.includes('CREATE')
    ) {
      return 'user-management';
    }
    return 'security';
  };

  const matchesHistoryGroup = (action: string) => {
    if (historyGroupFilter === 'all') return true;
    if (historyGroupFilter === 'security') {
      const group = getHistoryEventGroup(action);
      return group === 'security' || group === 'password' || group === 'access';
    }
    return getHistoryEventGroup(action) === historyGroupFilter;
  };

  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return [...auditLogs]
      .filter((log) => {
        if (!matchesHistoryGroup(log.action)) return false;
        if (historyActionFilter !== 'all' && log.action !== historyActionFilter) return false;
        if (historyActorFilter !== 'all' && log.userName !== historyActorFilter) return false;
        if (historyStatusFilter !== 'all' && String(log.status || 'SUCCESS') !== historyStatusFilter) return false;
        if (!query) return true;

        const haystack = `${log.action} ${log.details} ${log.userName}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [auditLogs, historyActionFilter, historyActorFilter, historyGroupFilter, historyQuery, historyStatusFilter]);

  const historyPageSize = 25;
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const normalizedHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = useMemo(() => {
    const start = (normalizedHistoryPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, normalizedHistoryPage]);

  const toDateTime = (value: unknown) => {
    const parsed = new Date(String(value ?? ''));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatDateTime = (value: unknown) => {
    const parsed = toDateTime(value);
    if (!parsed) return 'Inconnu';
    return parsed.toLocaleString('fr-FR');
  };

  const formatRelativeLastActivity = (value: unknown) => {
    const parsed = toDateTime(value);
    if (!parsed) return 'Jamais';
    const diffMs = Date.now() - parsed.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `Il y a ${diffHour} h`;
    const diffDay = Math.floor(diffHour / 24);
    return `Il y a ${diffDay} j`;
  };

  const getPresenceInfo = (u: any) => {
    const status = String(u?.presenceStatus || '').toUpperCase();
    if (status === 'ONLINE') return { label: 'En ligne', variant: 'default' as const };
    if (status === 'AWAY') return { label: 'Absent', variant: 'secondary' as const };
    return { label: 'Hors ligne', variant: 'outline' as const };
  };

  const rowCountLabel = `${sortedUsers.length} utilisateur(s)`;

  const openUserDetails = async (targetUser: any) => {
    setDetailsUser(targetUser);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await fetch(
        `/api/users/domain-policy?adminId=${encodeURIComponent(user.id)}&userId=${encodeURIComponent(targetUser.id)}`,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Impossible de charger les details du compte');
      }

      const policy = (data.policy || {}) as UserDomainPolicy;
      setPolicyMode((policy.mode as UserDomainPolicyMode) || 'default');
      setPolicyCustomDomains(Array.isArray(policy.customDomains) ? policy.customDomains : []);
      setGlobalDomains(Array.isArray(data.globalDomains) ? data.globalDomains : []);
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Impossible de charger les details du compte');
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadConfigurationDomains = async () => {
    setConfigDomainsBusy(true);
    setConfigDomainError(null);
    try {
      const response = await fetch('/api/users/email-domains', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !Array.isArray(data?.domains)) {
        throw new Error(data?.error || 'Chargement des domaines impossible');
      }
      setConfigDomains(data.domains as GlobalDomain[]);
    } catch (error) {
      setConfigDomainError(error instanceof Error ? error.message : 'Chargement des domaines impossible');
    } finally {
      setConfigDomainsBusy(false);
    }
  };

  const updateConfigurationDomains = async (
    method: 'POST' | 'PUT' | 'DELETE',
    payload: Record<string, unknown>
  ) => {
    if (!user?.id) return;
    setConfigDomainsBusy(true);
    setConfigDomainError(null);
    try {
      const response = await fetch(
        method === 'DELETE'
          ? `/api/users/email-domains?adminId=${encodeURIComponent(user.id)}&domain=${encodeURIComponent(String(payload.domain || ''))}`
          : '/api/users/email-domains',
        method === 'DELETE'
          ? { method }
          : {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, adminId: user.id }),
            }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !Array.isArray(data?.domains)) {
        throw new Error(data?.error || 'Mise a jour impossible');
      }

      setConfigDomains(data.domains as GlobalDomain[]);
      window.dispatchEvent(new Event('noc-email-domains-updated'));
    } catch (error) {
      setConfigDomainError(error instanceof Error ? error.message : 'Mise a jour impossible');
    } finally {
      setConfigDomainsBusy(false);
    }
  };

  const addConfigurationDomain = async () => {
    const domain = configNewDomain.trim().toLowerCase().replace(/^@+/, '');
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      setConfigDomainError('Saisissez un domaine valide');
      return;
    }
    await updateConfigurationDomains('POST', {
      domain,
      isActive: true,
      isDefault: configNewDomainIsDefault,
    });
    setConfigNewDomain('');
    setConfigNewDomainIsDefault(false);
  };

  useEffect(() => {
    if (activeTab !== 'configuration') return;
    void loadConfigurationDomains();
  }, [activeTab]);

  useEffect(() => {
    const onDomainsUpdated = () => {
      if (activeTab !== 'configuration') return;
      void loadConfigurationDomains();
    };

    window.addEventListener('noc-email-domains-updated', onDomainsUpdated);
    return () => window.removeEventListener('noc-email-domains-updated', onDomainsUpdated);
  }, [activeTab]);

  const addCustomDomain = () => {
    const value = customDomainInput.trim().toLowerCase().replace(/^@+/, '');
    if (!value || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
      setDetailsError('Domaine personnalise invalide');
      return;
    }
    if (policyCustomDomains.includes(value)) {
      setCustomDomainInput('');
      return;
    }
    setPolicyCustomDomains((prev) => [...prev, value]);
    setCustomDomainInput('');
    setDetailsError(null);
  };

  const savePolicy = async () => {
    if (!detailsUser?.id) return;
    setDetailsSaving(true);
    setDetailsError(null);
    try {
      const response = await fetch('/api/users/domain-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          userId: detailsUser.id,
          mode: policyMode,
          customDomains: policyCustomDomains,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Sauvegarde impossible');
      }
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Sauvegarde impossible');
      return;
    } finally {
      setDetailsSaving(false);
    }

    await syncUsersFromApi();
    window.dispatchEvent(new Event('noc-email-domains-updated'));
    setDetailsOpen(false);
  };

  const setRowPageSize = (value: string) => {
    const parsed = Number(value);
    if (!USERS_PAGE_SIZE_OPTIONS.includes(parsed as any)) return;
    setUsersPageSize(parsed);
    setUsersPage(1);
  };

  const resetAdminPersonalization = () => {
    setDisplayMode('table');
    setUsersPageSize(25);
    setDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    setUsersPage(1);
    setHistoryPage(1);
    try {
      localStorage.removeItem(USERS_DEFAULT_VIEW_STORAGE_KEY);
      localStorage.removeItem(USERS_PAGE_SIZE_STORAGE_KEY);
      localStorage.removeItem(DASHBOARD_CONFIG_STORAGE_KEY);
    } catch {
      // Keep in-memory defaults if storage is unavailable.
    }
  };

  const userRoleLabel = (role: string) => ROLE_CONFIG[role]?.label || role;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="space-y-4 admin-glass-shell"
    >
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl lg:text-4xl font-bold tracking-wide bg-linear-to-r from-slate-900 via-blue-900 to-cyan-700 bg-clip-text text-transparent dark:from-slate-100 dark:via-blue-300 dark:to-cyan-300">ADMIN CONTROL GENERAL</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminUsersTab)}>
        <TabsList className="sticky top-0 z-10 flex flex-wrap bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/75 admin-glass-tabs">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="admin-glass-card">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Repertoire utilisateurs</CardTitle>
              <CardDescription>Vue tableau professionnelle, pagination et actions rapides.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={userSearchQuery}
                  onChange={(event) => setUserSearchQuery(event.target.value)}
                  className="xl:col-span-2 admin-glass-control"
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="admin-glass-control">
                    <SelectValue placeholder="Filtrer par role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les roles</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                    <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                    <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                    <SelectItem value="USER">Utilisateur</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as UsersDisplayMode)}>
                    <SelectTrigger className="admin-glass-control">
                      <SelectValue placeholder="Mode d'affichage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Tableau (defaut)</SelectItem>
                      <SelectItem value="cards">Cartes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={openCreateUserDialog}
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0 admin-glass-icon-btn"
                    aria-label="Ajouter un personnel"
                    title="Ajouter un personnel"
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">{rowCountLabel}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Par page</span>
                  <Select value={String(usersPageSize)} onValueChange={setRowPageSize}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {displayMode === 'table' ? (
                <div className="rounded-lg border admin-glass-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Presence</TableHead>
                        <TableHead>Derniere activite</TableHead>
                        <TableHead className="w-44">Changer role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                            Aucun utilisateur trouve.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedUsers.map((u) => {
                          const presenceInfo = getPresenceInfo(u);
                          const userIsLockedAction = Boolean(usersActionInProgress);
                          return (
                            <TableRow key={u.id}>
                              <TableCell>
                                <button
                                  type="button"
                                  className="flex items-center gap-3 text-left"
                                  onClick={() => void openUserDetails(u)}
                                  disabled={userIsLockedAction}
                                >
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={u.avatar} />
                                    <AvatarFallback>{String(u.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate max-w-60">{u.name}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-72">{u.email}</p>
                                  </div>
                                </button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge className={ROLE_CONFIG[u.role]?.color}>{userRoleLabel(u.role)}</Badge>
                                  {u.isBlocked && <Badge variant="destructive">Bloque</Badge>}
                                  {u.mustChangePassword && <Badge variant="outline" className="text-yellow-600">MDP a changer</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={presenceInfo.variant}>{presenceInfo.label}</Badge>
                              </TableCell>
                              <TableCell>{formatRelativeLastActivity(u.lastActivity)}</TableCell>
                              <TableCell>
                                <Select
                                  value={u.role}
                                  onValueChange={(value) => void handleChangeUserRole(u, value)}
                                  disabled={userIsLockedAction || (u.role === 'SUPER_ADMIN' && user?.id !== u.id)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USER">Utilisateur</SelectItem>
                                    <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                                    <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                                    <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    {user?.id === u.id && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void openUserDetails(u)}
                                    disabled={userIsLockedAction}
                                    title="Voir details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditUserDialog(u)}
                                    disabled={userIsLockedAction}
                                    title="Modifier"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setEditPassword('');
                                      setConfirmPassword('');
                                      setSecurityDialogOpen(true);
                                    }}
                                    disabled={userIsLockedAction || (u.role === 'SUPER_ADMIN' && user?.id !== u.id)}
                                    title="Reinitialiser mot de passe"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleToggleBlockUser(u)}
                                    disabled={userIsLockedAction || u.role === 'SUPER_ADMIN'}
                                    title={u.isBlocked ? 'Debloquer' : 'Bloquer'}
                                  >
                                    {u.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldBan className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleDeleteUser(u)}
                                    disabled={userIsLockedAction || u.role === 'SUPER_ADMIN' || !isSuperAdmin(user)}
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-2">
                  {pagedUsers.map((u) => {
                    const presenceInfo = getPresenceInfo(u);
                    return (
                      <div key={u.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                        <button type="button" className="flex items-center gap-3 text-left" onClick={() => void openUserDetails(u)}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback>{String(u.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_CONFIG[u.role]?.color}>{userRoleLabel(u.role)}</Badge>
                          <Badge variant={presenceInfo.variant}>{presenceInfo.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Page {normalizedUsersPage} / {usersTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                    disabled={normalizedUsersPage <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
                    disabled={normalizedUsersPage >= usersTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="admin-glass-card">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Journal d'activite</CardTitle>
              <CardDescription>Tracabilite et investigation des actions sensibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                <Input
                  placeholder="Rechercher evenement, detail ou acteur..."
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  className="xl:col-span-2 admin-glass-control"
                />
                <Select value={historyGroupFilter} onValueChange={(value) => setHistoryGroupFilter(value as HistoryEventGroup)}>
                  <SelectTrigger className="admin-glass-control">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les categories</SelectItem>
                    <SelectItem value="security">Securite</SelectItem>
                    <SelectItem value="password">Mots de passe</SelectItem>
                    <SelectItem value="user-management">Gestion comptes</SelectItem>
                    <SelectItem value="profile">Profils</SelectItem>
                    <SelectItem value="access">Acces / Authentification</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={historyActionFilter} onValueChange={setHistoryActionFilter}>
                  <SelectTrigger className="admin-glass-control">
                    <SelectValue placeholder="Type d'evenement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les evenements</SelectItem>
                    {uniqueHistoryActions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                  <SelectTrigger className="admin-glass-control">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="SUCCESS">Succes</SelectItem>
                    <SelectItem value="FAILURE">Echec</SelectItem>
                    <SelectItem value="FAILED">Erreur</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={historyActorFilter} onValueChange={setHistoryActorFilter}>
                  <SelectTrigger className="admin-glass-control">
                    <SelectValue placeholder="Acteur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les acteurs</SelectItem>
                    {uniqueHistoryActors.map((actor) => (
                      <SelectItem key={actor} value={actor}>{actor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border admin-glass-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evenement</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Acteur</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Aucun evenement trouve.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedHistory.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="max-w-lg whitespace-normal">{log.details}</TableCell>
                          <TableCell>{log.userName}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p>{formatDateTime(log.createdAt)}</p>
                                <Badge variant={String(log.status || 'SUCCESS') === 'SUCCESS' ? 'default' : 'destructive'}>
                                  {String(log.status || 'SUCCESS')}
                                </Badge>
                              </div>
                            </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  {filteredHistory.length} evenement(s) - Page {normalizedHistoryPage} / {historyTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                    disabled={normalizedHistoryPage <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))}
                    disabled={normalizedHistoryPage >= historyTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card className="admin-glass-card">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Dashboard</CardTitle>
              <CardDescription>Preparation des widgets a afficher par defaut sur le dashboard admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Widget SLA</p>
                    <p className="text-xs text-muted-foreground">Affiche les KPIs SLA globaux.</p>
                  </div>
                  <Switch
                    checked={dashboardConfig.showSlaWidget}
                    onCheckedChange={(checked) => setDashboardConfig((prev) => ({ ...prev, showSlaWidget: checked }))}
                  />
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Widget Incidents</p>
                    <p className="text-xs text-muted-foreground">Affiche l'etat incidents en temps reel.</p>
                  </div>
                  <Switch
                    checked={dashboardConfig.showIncidentsWidget}
                    onCheckedChange={(checked) => setDashboardConfig((prev) => ({ ...prev, showIncidentsWidget: checked }))}
                  />
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Widget Repartition Shift</p>
                    <p className="text-xs text-muted-foreground">Affiche la couverture par shift.</p>
                  </div>
                  <Switch
                    checked={dashboardConfig.showShiftWidget}
                    onCheckedChange={(checked) => setDashboardConfig((prev) => ({ ...prev, showShiftWidget: checked }))}
                  />
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Widget Activite recente</p>
                    <p className="text-xs text-muted-foreground">Affiche les derniers evenements sensibles.</p>
                  </div>
                  <Switch
                    checked={dashboardConfig.showRecentActivityWidget}
                    onCheckedChange={(checked) => setDashboardConfig((prev) => ({ ...prev, showRecentActivityWidget: checked }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                Parametres sauvegardes localement pour preparer l'evolution du dashboard sans impacter les autres modules.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="administration" className="space-y-4">
          <AppAdminTabContent
            setCurrentTabSafely={setCurrentTabSafely}
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
            SHIFTS_DATA={SHIFTS_DATA}
            SHIFT_CYCLE_START={SHIFT_CYCLE_START}
            getShiftColor={getShiftColor}
          />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card className="admin-glass-card">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>
                Espace de personnalisation globale. Vous pouvez ajouter ici d'autres reglages progressivement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <Tabs value={configurationSubTab} onValueChange={(value) => setConfigurationSubTab(value as AdminConfigurationSubTab)}>
                <TabsList>
                  <TabsTrigger value="domains">Domaines</TabsTrigger>
                  <TabsTrigger value="interface">Interface admin</TabsTrigger>
                </TabsList>

                <TabsContent value="domains" className="space-y-3">
                  <div className="space-y-3 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">Personnalisation des domaines email</p>
                      <p className="text-xs text-muted-foreground">
                        Definissez le domaine par defaut, activez/desactivez les domaines et ajoutez de nouveaux domaines.
                      </p>
                    </div>

                    {configDomainError && (
                      <p className="text-xs text-destructive">{configDomainError}</p>
                    )}

                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <Label>Domaine par défaut actuel</Label>
                      <Select
                        value={configurationDefaultDomain || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') return;
                          void updateConfigurationDomains('PUT', { domain: value, isDefault: true });
                        }}
                        disabled={configDomainsBusy || configurationActiveDomains.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un domaine par defaut" />
                        </SelectTrigger>
                        <SelectContent>
                          {configurationActiveDomains.length === 0 ? (
                            <SelectItem value="none">Aucun domaine actif</SelectItem>
                          ) : (
                            configurationActiveDomains.map((entry) => (
                              <SelectItem key={entry.id} value={entry.domain}>
                                @{entry.domain}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={configNewDomain}
                        onChange={(event) => setConfigNewDomain(event.target.value)}
                        placeholder="ex: outlook.com"
                        disabled={configDomainsBusy}
                      />
                      <Button type="button" variant="outline" onClick={() => void addConfigurationDomain()} disabled={configDomainsBusy}>
                        Ajouter
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Definir le nouveau domaine comme defaut</p>
                        <p className="text-xs text-muted-foreground">Active automatiquement le domaine ajoute et l'utilise comme reference.</p>
                      </div>
                      <Switch
                        checked={configNewDomainIsDefault}
                        onCheckedChange={setConfigNewDomainIsDefault}
                        disabled={configDomainsBusy}
                      />
                    </div>

                    <div className="space-y-2 max-h-52 overflow-auto">
                      {configDomains.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">@{entry.domain}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.isDefault ? 'Domaine par defaut' : 'Domaine secondaire'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={entry.isActive}
                              onCheckedChange={(checked) => {
                                void updateConfigurationDomains('PUT', { domain: entry.domain, isActive: checked });
                              }}
                              disabled={configDomainsBusy}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                void updateConfigurationDomains('PUT', { domain: entry.domain, isDefault: true });
                              }}
                              disabled={configDomainsBusy || !entry.isActive}
                            >
                              Defaut
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                void updateConfigurationDomains('DELETE', { domain: entry.domain });
                              }}
                              disabled={configDomainsBusy}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="interface" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base">Personnalisation de l'interface admin</CardTitle>
                      <CardDescription>
                        Ajustez les preferences globales d'affichage pour gagner du temps sur la gestion quotidienne.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-2 rounded-lg border p-3">
                          <Label>Vue utilisateurs par defaut</Label>
                          <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as UsersDisplayMode)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une vue" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="table">Tableau</SelectItem>
                              <SelectItem value="cards">Cartes</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Applique la vue par défaut de l'onglet Utilisateurs.</p>
                        </div>

                        <div className="space-y-2 rounded-lg border p-3">
                          <Label>Lignes par page (utilisateurs)</Label>
                          <Select value={String(usersPageSize)} onValueChange={setRowPageSize}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir le nombre de lignes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Définit le volume affiché par page dans le tableau utilisateurs.</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                        <div>
                          <p className="text-sm font-medium">Réinitialiser les préférences admin</p>
                          <p className="text-xs text-muted-foreground">
                            Remet les réglages d'affichage et du dashboard à leurs valeurs initiales.
                          </p>
                        </div>
                        <Button type="button" variant="outline" onClick={resetAdminPersonalization}>
                          Réinitialiser
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setDetailsUser(null);
            setDetailsError(null);
            setCustomDomainInput('');
          }
        }}
      >
        <DialogContent className="sm:max-w-160">
          <DialogHeader>
            <DialogTitle>Details utilisateur</DialogTitle>
            <DialogDescription>
              Consultez le compte, ajustez la politique de domaine email et lancez des actions sans ouvrir le formulaire complet.
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des details...</p>
          ) : detailsUser ? (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={detailsUser.avatar} />
                    <AvatarFallback><UserCircle2 className="w-6 h-6" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-base">{detailsUser.name}</p>
                    <p className="text-sm text-muted-foreground">{detailsUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <p className="text-xs text-muted-foreground">Role: <span className="text-foreground">{userRoleLabel(detailsUser.role)}</span></p>
                  <p className="text-xs text-muted-foreground">Presence: <span className="text-foreground">{getPresenceInfo(detailsUser).label}</span></p>
                  <p className="text-xs text-muted-foreground">Derniere activite: <span className="text-foreground">{formatDateTime(detailsUser.lastActivity)}</span></p>
                  <p className="text-xs text-muted-foreground">Etat du compte: <span className="text-foreground">{detailsUser.isBlocked ? 'Bloque' : 'Actif'}</span></p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEditUserDialog(detailsUser)}>
                    <Pencil className="w-4 h-4 mr-1" /> Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(detailsUser);
                      setEditPassword('');
                      setConfirmPassword('');
                      setSecurityDialogOpen(true);
                    }}
                  >
                    <KeyRound className="w-4 h-4 mr-1" /> Reinitialiser MDP
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleToggleBlockUser(detailsUser)}>
                    {detailsUser.isBlocked ? 'Debloquer' : 'Bloquer'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Politique de domaine</Label>
                <Select value={policyMode} onValueChange={(value) => setPolicyMode(value as UserDomainPolicyMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Par defaut (domaines globaux actifs)</SelectItem>
                    <SelectItem value="custom">Domaine personnalise (liste specifique)</SelectItem>
                    <SelectItem value="allow_any">Autoriser toutes les adresses email</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Regle appliquee: {
                    policyMode === 'allow_any'
                      ? 'toutes les adresses email'
                      : (policyMode === 'custom' && policyCustomDomains.length > 0
                          ? policyCustomDomains.map((domain) => `@${domain}`).join(', ')
                          : (activeGlobalDomains.length > 0 ? activeGlobalDomains.map((domain) => `@${domain}`).join(', ') : 'aucun'))
                  }
                </p>
              </div>

              {policyMode === 'custom' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Domaines personnalises autorises</p>
                  <div className="flex flex-wrap gap-2">
                    {policyCustomDomains.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Aucun domaine personnalise. Le fallback sera les domaines globaux actifs.</span>
                    ) : (
                      policyCustomDomains.map((domain) => (
                        <Badge key={domain} variant="outline" className="gap-2">
                          @{domain}
                          <button
                            type="button"
                            className="text-xs"
                            onClick={() => setPolicyCustomDomains((prev) => prev.filter((entry) => entry !== domain))}
                          >
                            x
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Ajouter depuis les domaines globaux actifs:</p>
                    <div className="flex flex-wrap gap-2">
                      {activeGlobalDomains.map((domain) => (
                        <Button
                          key={domain}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!policyCustomDomains.includes(domain)) {
                              setPolicyCustomDomains((prev) => [...prev, domain]);
                            }
                          }}
                        >
                          @{domain}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={customDomainInput}
                      onChange={(event) => setCustomDomainInput(event.target.value)}
                      placeholder="ex: partenaire-client.com"
                    />
                    <Button type="button" variant="outline" onClick={addCustomDomain}>
                      Ajouter
                    </Button>
                  </div>
                </div>
              )}

              {detailsError && <p className="text-sm text-destructive">{detailsError}</p>}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fermer
            </Button>
            <Button onClick={() => void savePolicy()} disabled={detailsLoading || detailsSaving || !detailsUser}>
              {detailsSaving ? 'Enregistrement...' : 'Enregistrer la politique'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
