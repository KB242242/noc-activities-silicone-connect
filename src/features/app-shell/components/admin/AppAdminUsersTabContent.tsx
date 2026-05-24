import { Edit, Plus, RefreshCw, Settings, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  auditLogs: Array<{ id: string; action: string; details: string; userName: string; createdAt: Date | string }>;
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
}: AppAdminUsersTabContentProps) {
  return (
    <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Administration complète des comptes, rôles, accès et sécurité</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void syncUsersFromApi()} disabled={isUsersSyncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isUsersSyncing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={() => setCurrentTabSafely('admin')}>
            <Settings className="w-4 h-4 mr-2" />
            Aller à Administration
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Créer un utilisateur</CardTitle>
          <CardDescription>Utilisez le formulaire popup standard pour créer un nouveau compte.</CardDescription>
        </CardHeader>
        <CardContent className="pb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">La création s'enregistre directement en base de données.</p>
          <Button onClick={openCreateUserDialog}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau compte
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Répertoire utilisateurs</CardTitle>
          <CardDescription>Gérez les rôles, blocages, réinitialisations et suppressions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Rechercher un utilisateur..."
              value={userSearchQuery}
              onChange={(event) => setUserSearchQuery(event.target.value)}
              className="md:flex-1"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="md:w-[220px]">
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
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <div key={u.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge className={ROLE_CONFIG[u.role].color}>{ROLE_CONFIG[u.role].label}</Badge>
                  {u.isBlocked && <Badge variant="destructive">Bloqué</Badge>}
                  {u.mustChangePassword && <Badge variant="outline" className="text-yellow-600">Mot de passe à changer</Badge>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 lg:w-[860px]">
                  <Button variant="outline" size="sm" onClick={() => openEditUserDialog(u)} disabled={Boolean(usersActionInProgress)}>
                    <Edit className="w-4 h-4 mr-1" /> Modifier
                  </Button>
                  <Select
                    value={u.role}
                    onValueChange={(value) => void handleChangeUserRole(u, value)}
                    disabled={Boolean(usersActionInProgress) || (u.role === 'SUPER_ADMIN' && user?.id !== u.id)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Changer le rôle" />
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
                    onClick={() => void handleToggleBlockUser(u)}
                    disabled={Boolean(usersActionInProgress) || u.role === 'SUPER_ADMIN'}
                  >
                    {u.isBlocked ? 'Débloquer' : 'Bloquer'}
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
                    disabled={Boolean(usersActionInProgress) || (u.role === 'SUPER_ADMIN' && user?.id !== u.id)}
                  >
                    Réinitialiser MDP
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDeleteUser(u)}
                    disabled={Boolean(usersActionInProgress) || u.role === 'SUPER_ADMIN' || !isSuperAdmin(user)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Journal d'activité</CardTitle>
          <CardDescription>Traçabilité des actions sensibles réalisées sur les comptes.</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{log.userName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
