import {
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type AppAdminUserDialogsSectionProps = {
  isSuperAdmin: (user: any) => boolean;
  user: any;
  usersManagementOpen: boolean;
  setUsersManagementOpen: (open: boolean) => void;
  userSearchQuery: string;
  setUserSearchQuery: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: any) => void;
  setCreateUserDialogOpen: (open: boolean) => void;
  filteredUsers: any[];
  ROLE_CONFIG: any;
  handleChangeUserRole: (u: any, role: any) => void;
  handleToggleBlockUser: (u: any) => void;
  setSelectedUser: (value: any) => void;
  setEditPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setSecurityDialogOpen: (open: boolean) => void;
  handleDeleteUser: (u: any) => void;
  canManageUsers: boolean;
  createUserDialogOpen: boolean;
  editFirstName: string;
  setEditFirstName: (value: string) => void;
  editLastName: string;
  setEditLastName: (value: string) => void;
  editEmail: string;
  setEditEmail: (value: string) => void;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editRole: any;
  setEditRole: (value: any) => void;
  editShift: string;
  setEditShift: (value: string) => void;
  editResponsibility: string;
  setEditResponsibility: (value: any) => void;
  editPassword: string;
  handleCreateUser: () => Promise<void>;
  usersActionInProgress: string | null;
  editUserDialogOpen: boolean;
  setEditUserDialogOpen: (open: boolean) => void;
  editUserIsActive: boolean;
  setEditUserIsActive: (value: boolean) => void;
  editUserIsBlocked: boolean;
  setEditUserIsBlocked: (value: boolean) => void;
  handleUpdateUserDetails: () => Promise<void>;
  userToEdit: any;
  deleteConfirmationOpen: boolean;
  setDeleteConfirmationOpen: (open: boolean) => void;
  setUserToDelete: (value: any) => void;
  setDeleteConfirmationInput: (value: string) => void;
  userToDelete: any;
  deleteConfirmationInput: string;
  confirmDeleteUser: () => void;
  auditLogDialogOpen: boolean;
  setAuditLogDialogOpen: (open: boolean) => void;
  refreshAuditLog: () => void;
  auditLogRefreshing: boolean;
  auditLogDateFrom: string;
  setAuditLogDateFrom: (value: string) => void;
  auditLogDateTo: string;
  setAuditLogDateTo: (value: string) => void;
  auditLogActionType: string;
  setAuditLogActionType: (value: string) => void;
  uniqueActionTypes: string[];
  auditLogStatusFilter: string;
  setAuditLogStatusFilter: (value: string) => void;
  auditLogUserFilter: string;
  setAuditLogUserFilter: (value: string) => void;
  filteredAuditLogs: any[];
  auditLogs: any[];
};

type EmailDomainConfig = {
  id: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
};

export function AppAdminUserDialogsSection({
  isSuperAdmin,
  user,
  usersManagementOpen,
  setUsersManagementOpen,
  userSearchQuery,
  setUserSearchQuery,
  roleFilter,
  setRoleFilter,
  setCreateUserDialogOpen,
  filteredUsers,
  ROLE_CONFIG,
  handleChangeUserRole,
  handleToggleBlockUser,
  setSelectedUser,
  setEditPassword,
  setConfirmPassword,
  setSecurityDialogOpen,
  handleDeleteUser,
  canManageUsers,
  createUserDialogOpen,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  editEmail,
  setEditEmail,
  editUsername,
  setEditUsername,
  editRole,
  setEditRole,
  editShift,
  setEditShift,
  editResponsibility,
  setEditResponsibility,
  editPassword,
  handleCreateUser,
  usersActionInProgress,
  editUserDialogOpen,
  setEditUserDialogOpen,
  editUserIsActive,
  setEditUserIsActive,
  editUserIsBlocked,
  setEditUserIsBlocked,
  handleUpdateUserDetails,
  userToEdit,
  deleteConfirmationOpen,
  setDeleteConfirmationOpen,
  setUserToDelete,
  setDeleteConfirmationInput,
  userToDelete,
  deleteConfirmationInput,
  confirmDeleteUser,
  auditLogDialogOpen,
  setAuditLogDialogOpen,
  refreshAuditLog,
  auditLogRefreshing,
  auditLogDateFrom,
  setAuditLogDateFrom,
  auditLogDateTo,
  setAuditLogDateTo,
  auditLogActionType,
  setAuditLogActionType,
  uniqueActionTypes,
  auditLogStatusFilter,
  setAuditLogStatusFilter,
  auditLogUserFilter,
  setAuditLogUserFilter,
  filteredAuditLogs,
  auditLogs,
}: AppAdminUserDialogsSectionProps) {
  const [emailDomains, setEmailDomains] = useState<EmailDomainConfig[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainIsDefault, setNewDomainIsDefault] = useState(false);
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const defaultDomain = useMemo(() => {
    const fromDefault = emailDomains.find((entry) => entry.isDefault && entry.isActive);
    if (fromDefault) return fromDefault.domain;
    const firstActive = emailDomains.find((entry) => entry.isActive);
    return firstActive?.domain ?? emailDomains[0]?.domain ?? 'siliconeconnect.com';
  }, [emailDomains]);

  const activeDomainsLabel = useMemo(() => {
    return emailDomains
      .filter((entry) => entry.isActive)
      .map((entry) => `@${entry.domain}`)
      .join(', ');
  }, [emailDomains]);

  const activeEmailDomains = useMemo(() => {
    return emailDomains.filter((entry) => entry.isActive);
  }, [emailDomains]);

  const editDomainPolicy = userToEdit?.domainPolicy as
    | { mode?: 'default' | 'custom' | 'allow_any'; customDomains?: string[] }
    | undefined;

  const editPlaceholderDomain = useMemo(() => {
    const activeDomains = emailDomains.filter((entry) => entry.isActive).map((entry) => entry.domain);
    if (editDomainPolicy?.mode === 'allow_any') {
      return 'exemple.com';
    }
    if (editDomainPolicy?.mode === 'custom' && Array.isArray(editDomainPolicy.customDomains)) {
      const firstCustom = editDomainPolicy.customDomains.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
      if (firstCustom) {
        const normalized = String(firstCustom).trim().toLowerCase().replace(/^@+/, '');
        return normalized || defaultDomain;
      }
    }
    return activeDomains[0] || defaultDomain;
  }, [emailDomains, defaultDomain, editDomainPolicy]);

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/users/email-domains', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !Array.isArray(data?.domains)) {
        throw new Error(data?.error || 'Chargement des domaines impossible');
      }
      setEmailDomains(data.domains);
      setDomainError(null);
    } catch (error) {
      setDomainError(error instanceof Error ? error.message : 'Chargement des domaines impossible');
    }
  };

  useEffect(() => {
    if (!canManageUsers) return;
    void loadDomains();
  }, [canManageUsers]);

  useEffect(() => {
    if (!canManageUsers) return;
    if (!createUserDialogOpen && !editUserDialogOpen) return;
    void loadDomains();
  }, [canManageUsers, createUserDialogOpen, editUserDialogOpen]);

  useEffect(() => {
    if (!canManageUsers) return;

    const onDomainsChanged = () => {
      void loadDomains();
    };

    window.addEventListener('noc-email-domains-updated', onDomainsChanged);
    return () => window.removeEventListener('noc-email-domains-updated', onDomainsChanged);
  }, [canManageUsers]);

  const callDomainsApi = async (method: 'POST' | 'PUT' | 'DELETE', payload: Record<string, unknown>) => {
    if (!user?.id) return;
    setDomainBusy(true);
    setDomainError(null);
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
        throw new Error(data?.error || 'Opération impossible');
      }
      setEmailDomains(data.domains);
      window.dispatchEvent(new Event('noc-email-domains-updated'));
    } catch (error) {
      setDomainError(error instanceof Error ? error.message : 'Opération impossible');
    } finally {
      setDomainBusy(false);
    }
  };

  const addDomain = async () => {
    const domain = newDomain.trim().toLowerCase().replace(/^@+/, '');
    if (!domain) {
      setDomainError('Saisissez un domaine valide');
      return;
    }
    await callDomainsApi('POST', { domain, isActive: true, isDefault: newDomainIsDefault });
    setNewDomain('');
    setNewDomainIsDefault(false);
  };

  return (
    <>
      {false && isSuperAdmin(user) && (
        <Dialog open={usersManagementOpen} onOpenChange={setUsersManagementOpen}>
          <DialogContent className="sm:max-w-225 max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gérer les utilisateurs
              </DialogTitle>
              <DialogDescription>Gerez tous les comptes utilisateurs</DialogDescription>
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
                  <SelectTrigger className="w-45">
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
                <Button onClick={() => setCreateUserDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Créer
                </Button>
              </div>

              <ScrollArea className="h-100">
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
                          <Badge variant="destructive">Bloque</Badge>
                        )}
                        {u.mustChangePassword && (
                          <Badge variant="outline" className="text-yellow-600">Mot de passe a changer</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleChangeUserRole(u, value)}
                          disabled={u.role === 'SUPER_ADMIN' && user?.id !== u.id}
                        >
                          <SelectTrigger className="w-42.5 h-8 text-xs">
                            <SelectValue placeholder="Changer le role" />
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBlockUser(u)}
                          disabled={u.role === 'SUPER_ADMIN'}
                        >
                          {u.isBlocked ? 'Debloquer' : 'Bloquer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(u);
                            setEditPassword('');
                            setConfirmPassword('');
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
                <FileText className="w-4 h-4 mr-2" /> Journal d'activite
              </Button>
              <DialogClose asChild><Button>Fermer</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canManageUsers && (
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogContent className="sm:max-w-200 max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
              <DialogDescription>Remplissez les informations du nouveau compte</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prenom</Label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder={`ex: utilisateur@${defaultDomain}`}
                />
                <p className="text-xs text-muted-foreground">Domaines actifs: {activeDomainsLabel || 'aucun'}</p>
              </div>
              <div className="space-y-2">
                <Label>Pseudo (optionnel)</Label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Utilisateur</SelectItem>
                    <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                    <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                    <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    {isSuperAdmin(user) && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shift (optionnel)</Label>
                  <Select value={editShift || 'none'} onValueChange={(v) => setEditShift(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="A">Shift A</SelectItem>
                      <SelectItem value="B">Shift B</SelectItem>
                      <SelectItem value="C">Shift C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fonction (optionnel)</Label>
                  <Select value={editResponsibility || 'none'} onValueChange={(v) => setEditResponsibility(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                      <SelectItem value="MONITORING">Monitoring</SelectItem>
                      <SelectItem value="REPORTING_1">Reporting 1</SelectItem>
                      <SelectItem value="REPORTING_2">Reporting 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mot de passe par defaut</Label>
                <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                <p className="text-xs text-muted-foreground">L'utilisateur devra changer ce mot de passe a sa premiere connexion</p>
              </div>

              {canManageUsers && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <Label>Domaines email autorisés</Label>
                    <p className="text-xs text-muted-foreground">Activez/désactivez des domaines, choisissez un domaine par défaut, ou ajoutez-en un nouveau.</p>
                  </div>
                  {domainError && <p className="text-xs text-destructive">{domainError}</p>}
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Label>Domaine par défaut actuel</Label>
                    <Select
                      value={defaultDomain}
                      onValueChange={(value) => {
                        void callDomainsApi('PUT', { domain: value, isDefault: true });
                      }}
                      disabled={domainBusy || activeEmailDomains.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un domaine par défaut" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmailDomains.map((entry) => (
                          <SelectItem key={entry.id} value={entry.domain}>
                            @{entry.domain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Ce domaine est utilisé comme référence pour les nouveaux comptes et les champs d’email.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="ex: gmail.com"
                    />
                    <Button type="button" variant="outline" onClick={() => void addDomain()} disabled={domainBusy}>
                      Ajouter
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Définir comme domaine par défaut</p>
                      <p className="text-xs text-muted-foreground">Le nouveau domaine sera activé et deviendra la référence pour les nouveaux comptes.</p>
                    </div>
                    <Switch checked={newDomainIsDefault} onCheckedChange={setNewDomainIsDefault} disabled={domainBusy} />
                  </div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {emailDomains.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">@{entry.domain}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.isDefault ? 'Domaine par défaut' : 'Domaine secondaire'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entry.isActive}
                            onCheckedChange={(checked) => {
                              void callDomainsApi('PUT', { domain: entry.domain, isActive: checked });
                            }}
                            disabled={domainBusy}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void callDomainsApi('PUT', { domain: entry.domain, isDefault: true });
                            }}
                            disabled={domainBusy || !entry.isActive}
                          >
                            Defaut
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              void callDomainsApi('DELETE', { domain: entry.domain });
                            }}
                            disabled={domainBusy}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={() => void handleCreateUser()} disabled={usersActionInProgress === 'create'}>Créer l'utilisateur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canManageUsers && (
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="sm:max-w-140">
            <DialogHeader>
              <DialogTitle>Modifier un utilisateur</DialogTitle>
              <DialogDescription>Mettez a jour toutes les informations du compte.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prenom</Label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder={`ex: utilisateur@${editPlaceholderDomain}`}
                />
                <p className="text-xs text-muted-foreground">Domaines actifs: {activeDomainsLabel || 'aucun'}</p>
              </div>
              <div className="space-y-2">
                <Label>Pseudo (optionnel)</Label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                      <SelectItem value="TECHNICIEN_NO">Technicien NOC</SelectItem>
                      <SelectItem value="RESPONSABLE">Responsable</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      {isSuperAdmin(user) && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={editShift || 'none'} onValueChange={(v) => setEditShift(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="A">Shift A</SelectItem>
                      <SelectItem value="B">Shift B</SelectItem>
                      <SelectItem value="C">Shift C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fonction</Label>
                <Select value={editResponsibility || 'none'} onValueChange={(v) => setEditResponsibility(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="REPORTING_1">Reporting 1</SelectItem>
                    <SelectItem value="REPORTING_2">Reporting 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Compte actif</Label>
                  <Switch checked={editUserIsActive} onCheckedChange={setEditUserIsActive} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Compte bloque</Label>
                  <Switch checked={editUserIsBlocked} onCheckedChange={setEditUserIsBlocked} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={() => void handleUpdateUserDetails()} disabled={usersActionInProgress === `edit:${userToEdit?.id || ''}`}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={deleteConfirmationOpen} onOpenChange={(open) => {
        setDeleteConfirmationOpen(open);
        if (!open) {
          setUserToDelete(null);
          setDeleteConfirmationInput('');
        }
      }}>
          <DialogContent className="sm:max-w-112.5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Supprimer cet utilisateur?
            </DialogTitle>
            <DialogDescription>
              Cette action est definitive et ne peut pas etre annulee.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4 py-4">
              <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    Vous allez supprimer le compte: <span className="font-semibold">{userToDelete.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Role: <span className="font-medium">{userToDelete.role}</span>
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Confirmez en recopiant le pseudo/nom ci-dessous:
                </Label>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                  <p className="font-mono font-bold text-main text-center">{userToDelete.username || userToDelete.name}</p>
                </div>
                <Input
                  placeholder="Entrez le pseudo/nom pour confirmer"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  La suppression est definitive. Toutes les donnees associees seront perdues.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmationOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={!userToDelete || deleteConfirmationInput.trim() !== (userToDelete.username || userToDelete.name)}
            >
              Supprimer definitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSuperAdmin(user) && (
        <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
          <DialogContent className="sm:max-w-250 max-h-[85vh]">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <div>
                    <DialogTitle>Journal d'activite (Audit Log)</DialogTitle>
                    <DialogDescription>Historique des actions sensibles et tracabilite.</DialogDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshAuditLog}
                  disabled={auditLogRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${auditLogRefreshing ? 'animate-spin' : ''}`} />
                  Rafraichir
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 mb-4 pb-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de debut</label>
                  <input
                    type="date"
                    value={auditLogDateFrom}
                    onChange={(e) => setAuditLogDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de fin</label>
                  <input
                    type="date"
                    value={auditLogDateTo}
                    onChange={(e) => setAuditLogDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type d'action</label>
                  <select
                    value={auditLogActionType}
                    onChange={(e) => setAuditLogActionType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">Tous les types</option>
                    {uniqueActionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut</label>
                  <select
                    value={auditLogStatusFilter}
                    onChange={(e) => setAuditLogStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="SUCCESS">Succes</option>
                    <option value="FAILED">Erreur</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filtre par utilisateur</label>
                <input
                  type="text"
                  placeholder="Rechercher par nom d'utilisateur..."
                  value={auditLogUserFilter}
                  onChange={(e) => setAuditLogUserFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              {(auditLogDateFrom || auditLogDateTo || auditLogActionType !== 'all' || auditLogStatusFilter !== 'all' || auditLogUserFilter) && (
                <div className="text-sm text-muted-foreground">
                  {filteredAuditLogs.length} resultat(s) correspondant aux filtres
                </div>
              )}
            </div>

            <ScrollArea className="h-100">
              <div className="space-y-2 pr-4">
                {filteredAuditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {auditLogs.length === 0 ? 'Aucune activite enregistree' : 'Aucun resultat ne correspond aux filtres'}
                  </p>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent transition">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${log.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground wrap-break-word">{log.details}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-medium">{log.userName}</p>
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
              <DialogClose asChild>
                <Button>Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

