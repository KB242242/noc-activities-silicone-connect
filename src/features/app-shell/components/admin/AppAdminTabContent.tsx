import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AppAdminTabContentProps = {
  isUsersSyncing: boolean;
  syncUsersFromApi: () => Promise<void>;
  setCurrentTabSafely: (tab: any) => void;
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
  allUsers: any[];
  assignUserToShift: (userId: string, shiftName: 'A' | 'B' | 'C') => Promise<void>;
  shiftAssignmentBusyUserId: string | null;
  planningSettings: any;
  setPlanningSettings: (updater: any) => void;
  planningSettingsLoading: boolean;
  planningSettingsSaving: boolean;
  loadPlanningSettings: () => Promise<void>;
  savePlanningSettings: () => Promise<void>;
  availablePlanningRoles: string[];
};

export function AppAdminTabContent({
  isUsersSyncing,
  syncUsersFromApi,
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
  allUsers,
  assignUserToShift,
  shiftAssignmentBusyUserId,
  planningSettings,
  setPlanningSettings,
  planningSettingsLoading,
  planningSettingsSaving,
  loadPlanningSettings,
  savePlanningSettings,
  availablePlanningRoles,
}: AppAdminTabContentProps) {
  const [quickAddQuery, setQuickAddQuery] = useState('');
  const [quickAddUserId, setQuickAddUserId] = useState('');
  const [quickAddShift, setQuickAddShift] = useState<'A' | 'B' | 'C'>('A');
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dropShiftTarget, setDropShiftTarget] = useState<'A' | 'B' | 'C' | null>(null);

  const resolveShiftKey = (value: unknown): 'A' | 'B' | 'C' | null => {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'A' || normalized === 'B' || normalized === 'C') return normalized;

    const shifted = normalized.replace(/^SHIFT[-_\s]*/i, '').replace(/^SHIFT[-_\s]*/i, '');
    if (shifted === 'A' || shifted === 'B' || shifted === 'C') return shifted;

    const match = normalized.match(/([ABC])$/);
    if (!match) return null;
    const key = match[1] as 'A' | 'B' | 'C';
    return key;
  };

  const shiftAgents = useMemo(() => {
    const buckets: Record<'A' | 'B' | 'C', any[]> = { A: [], B: [], C: [] };

    allUsers
      .filter((entry) => !entry?.isBlocked)
      .forEach((entry) => {
        const shiftKey = resolveShiftKey(entry?.shift?.name ?? entry?.shiftId);
        if (shiftKey) {
          buckets[shiftKey].push(entry);
        }
      });

    return {
      A: buckets.A.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''))),
      B: buckets.B.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''))),
      C: buckets.C.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''))),
    };
  }, [allUsers]);

  const planningRestNameOverridesInput = useMemo(() => {
    const overrides = planningSettings?.visibility?.individualRestNameOverrides;
    if (!overrides || typeof overrides !== 'object') return '';
    return Object.entries(overrides)
      .map(([memberName, label]) => `${memberName}:${label}`)
      .join(', ');
  }, [planningSettings?.visibility?.individualRestNameOverrides]);

  const quickAddCandidates = useMemo(() => {
    const query = quickAddQuery.trim().toLowerCase();
    return allUsers
      .filter((entry) => !entry?.isBlocked)
      .filter((entry) => {
        if (!query) return true;
        const name = String(entry?.name ?? '').toLowerCase();
        const email = String(entry?.email ?? '').toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')));
  }, [allUsers, quickAddQuery]);

  const handleQuickAddToShift = async () => {
    if (!quickAddUserId) return;
    await assignUserToShift(quickAddUserId, quickAddShift);
  };

  const handleDropToShift = async (shiftName: 'A' | 'B' | 'C') => {
    setDropShiftTarget(null);
    const userId = draggedUserId;
    setDraggedUserId(null);
    if (!userId) return;
    await assignUserToShift(userId, shiftName);
  };

  return (
    <Tabs defaultValue="tickets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tickets">Tickets</TabsTrigger>
        <TabsTrigger value="rubriques">Rubriques</TabsTrigger>
        <TabsTrigger value="operations">Opérations</TabsTrigger>
      </TabsList>

      <TabsContent value="tickets" className="space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Paramètres Tickets</CardTitle>
            <CardDescription>Personnalisez le format de numéro, les emails de notification et les SLA par catégorie.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ticket-number-format">Format numéro ticket</Label>
              <Input
                id="ticket-number-format"
                value={ticketAdminSettings.numberFormat}
                onChange={(event) =>
                  setTicketAdminSettings((prev: any) => ({
                    ...prev,
                    numberFormat: event.target.value,
                  }))
                }
                placeholder="#SC{date}-{seq}"
                disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
              />
              <p className="text-xs text-muted-foreground">Variables supportées: {'{date}'} (jjmmaaaa), {'{seq}'} (compteur), {'{type}'}.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-number-seed">Valeur initiale du compteur</Label>
              <Input
                id="ticket-number-seed"
                type="number"
                min={1}
                value={ticketAdminSettings.numberSeed}
                onChange={(event) =>
                  setTicketAdminSettings((prev: any) => ({
                    ...prev,
                    numberSeed: Math.max(1, Number(event.target.value || 1)),
                  }))
                }
                disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-notification-emails">Emails de notification création/fermeture</Label>
            <Input
              id="ticket-notification-emails"
              value={ticketAdminEmailsInput}
              onChange={(event) => setTicketAdminEmailsInput(event.target.value)}
              placeholder="ange.bata@siliconeconnect.com, supervision@siliconeconnect.com"
              disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
            />
            <p className="text-xs text-muted-foreground">Séparez plusieurs adresses par une virgule.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ticket-support-copy-email">Email copie support (CC)</Label>
              <Input
                id="ticket-support-copy-email"
                value={ticketAdminSettings.supportCopyEmail}
                onChange={(event) =>
                  setTicketAdminSettings((prev: any) => ({
                    ...prev,
                    supportCopyEmail: event.target.value,
                  }))
                }
                placeholder="support@siliconeconnect.com"
                disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-tech-fallback-email">Email fallback technicien</Label>
              <Input
                id="ticket-tech-fallback-email"
                value={ticketAdminSettings.technicianFallbackEmail}
                onChange={(event) =>
                  setTicketAdminSettings((prev: any) => ({
                    ...prev,
                    technicianFallbackEmail: event.target.value,
                  }))
                }
                placeholder="kevine.test242@gmail.com"
                disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Envoi email par étape du ticket</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Création</span>
                <Switch
                  checked={ticketAdminSettings.lifecycleEmailEvents.creation}
                  onCheckedChange={(checked) =>
                    setTicketAdminSettings((prev: any) => ({
                      ...prev,
                      lifecycleEmailEvents: {
                        ...prev.lifecycleEmailEvents,
                        creation: checked,
                      },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">En attente</span>
                <Switch
                  checked={ticketAdminSettings.lifecycleEmailEvents.pending}
                  onCheckedChange={(checked) =>
                    setTicketAdminSettings((prev: any) => ({
                      ...prev,
                      lifecycleEmailEvents: {
                        ...prev.lifecycleEmailEvents,
                        pending: checked,
                      },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Escaladé</span>
                <Switch
                  checked={ticketAdminSettings.lifecycleEmailEvents.escalated}
                  onCheckedChange={(checked) =>
                    setTicketAdminSettings((prev: any) => ({
                      ...prev,
                      lifecycleEmailEvents: {
                        ...prev.lifecycleEmailEvents,
                        escalated: checked,
                      },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Fermé</span>
                <Switch
                  checked={ticketAdminSettings.lifecycleEmailEvents.closed}
                  onCheckedChange={(checked) =>
                    setTicketAdminSettings((prev: any) => ({
                      ...prev,
                      lifecycleEmailEvents: {
                        ...prev.lifecycleEmailEvents,
                        closed: checked,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Copie client (Incident/Maintenance)</p>
              <p className="text-xs text-muted-foreground">Autorise l'envoi manuel d'une copie client depuis la création ticket.</p>
            </div>
            <Switch
              checked={ticketAdminSettings.sendClientCopyForIncidentMaintenance}
              onCheckedChange={(checked) =>
                setTicketAdminSettings((prev: any) => ({
                  ...prev,
                  sendClientCopyForIncidentMaintenance: checked,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-default-sla">SLA par défaut (heures)</Label>
            <Input
              id="ticket-default-sla"
              type="number"
              min={1}
              value={ticketAdminSettings.defaultSlaHours}
              onChange={(event) =>
                setTicketAdminSettings((prev: any) => ({
                  ...prev,
                  defaultSlaHours: Math.max(1, Number(event.target.value || 1)),
                }))
              }
              disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-trash-retention-days">Durée de garde en corbeille (jours)</Label>
            <Input
              id="ticket-trash-retention-days"
              type="number"
              min={1}
              max={365}
              value={ticketAdminSettings.trashRetentionDays}
              onChange={(event) =>
                setTicketAdminSettings((prev: any) => ({
                  ...prev,
                  trashRetentionDays: Math.min(365, Math.max(1, Number(event.target.value || 1))),
                }))
              }
              disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
            />
            <p className="text-xs text-muted-foreground">Après cette durée, le ticket est supprimé automatiquement par le système.</p>
          </div>

          <div className="space-y-2">
            <Label>SLA par catégorie (heures)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {TICKET_ADMIN_CATEGORY_KEYS.map((categoryKey) => {
                const categoryLabels: Record<string, string> = {
                  deployment: 'Déploiement',
                  supervision: 'Supervision',
                  ravitaillement: 'Ravitaillement',
                  routine_visit: 'Visite de routine',
                  security: 'Sécurité',
                  maintenance: 'Maintenance',
                  incident: 'Incident',
                  survey: 'Survey',
                };
                return (
                  <div key={categoryKey} className="space-y-1">
                    <Label htmlFor={`sla-${categoryKey}`} className="text-xs text-muted-foreground">{categoryLabels[categoryKey]}</Label>
                    <Input
                      id={`sla-${categoryKey}`}
                      type="number"
                      min={1}
                      value={ticketAdminSettings.slaByCategory[categoryKey] ?? ticketAdminSettings.defaultSlaHours}
                      onChange={(event) =>
                        setTicketAdminSettings((prev: any) => ({
                          ...prev,
                          slaByCategory: {
                            ...prev.slaByCategory,
                            [categoryKey]: Math.max(1, Number(event.target.value || 1)),
                          },
                        }))
                      }
                      disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}
                    />
                  </div>
                );
              })}
            </div>
          </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void loadTicketAdminSettings()} disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}>
                <RefreshCw className={`w-4 h-4 mr-2 ${ticketAdminSettingsLoading ? 'animate-spin' : ''}`} />
                Recharger
              </Button>
              <Button onClick={() => void saveTicketAdminSettings()} disabled={ticketAdminSettingsLoading || ticketAdminSettingsSaving}>
                {ticketAdminSettingsSaving ? 'Enregistrement...' : 'Enregistrer les paramètres tickets'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rubriques" className="space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Contrôle des Rubriques</CardTitle>
            <CardDescription>Activez ou désactivez les rubriques visibles pour les utilisateurs.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(SECTION_LABELS)
                .filter(([key]) => key !== 'admin')
                .map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{label}</span>
                    <Switch
                      checked={sectionAccess[key]}
                      onCheckedChange={(checked) =>
                        setSectionAccess((prev: any) => ({
                          ...prev,
                          [key]: checked,
                        }))
                      }
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Types d'Alertes Disponibles</CardTitle>
            <CardDescription>Types utilisables pour qualifier les alertes NOC.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                <Badge key={key} variant="outline" className={`justify-center py-1 ${config.colorClass}`}>
                  {config.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="operations" className="space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Configuration des Shifts</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void syncUsersFromApi()}
                disabled={isUsersSyncing || Boolean(shiftAssignmentBusyUserId)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUsersSyncing ? 'animate-spin' : ''}`} />
                Resync shifts now
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border p-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="quick-add-shift-user">Saisir un agent</Label>
                <Input
                  id="quick-add-shift-user"
                  value={quickAddQuery}
                  onChange={(event) => setQuickAddQuery(event.target.value)}
                  placeholder="Nom ou email..."
                />
              </div>
              <div className="space-y-1">
                <Label>Agent</Label>
                <Select value={quickAddUserId} onValueChange={setQuickAddUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickAddCandidates.map((entry: any) => (
                      <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ajouter au Shift</Label>
                <div className="flex gap-2">
                  <Select value={quickAddShift} onValueChange={(value) => setQuickAddShift(value as 'A' | 'B' | 'C')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Shift A</SelectItem>
                      <SelectItem value="B">Shift B</SelectItem>
                      <SelectItem value="C">Shift C</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => void handleQuickAddToShift()} disabled={!quickAddUserId}>Ajouter</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.keys(SHIFTS_DATA).map((shiftName) => {
                const shiftData = SHIFTS_DATA[shiftName];
                const normalizedShiftName = shiftName as 'A' | 'B' | 'C';
                return (
                  <Card
                    key={shiftName}
                    className={`border-2 ${dropShiftTarget === normalizedShiftName ? 'ring-2 ring-primary' : ''}`}
                    style={{ borderColor: getShiftColor(shiftName) }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropShiftTarget(normalizedShiftName);
                    }}
                    onDragLeave={() => setDropShiftTarget((prev) => (prev === normalizedShiftName ? null : prev))}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropToShift(normalizedShiftName);
                    }}
                  >
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: getShiftColor(shiftName) }} />
                        Shift {shiftName}
                      </CardTitle>
                      <CardDescription className="text-xs">Début: {format(SHIFT_CYCLE_START[shiftName], 'dd/MM/yyyy')}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Glisser-deposer un agent vers un autre shift, ou clic droit pour actions rapides.
                      </p>
                      <div className="space-y-1.5">
                        {shiftAgents[normalizedShiftName].map((member: any) => {
                          const memberCurrentShift = resolveShiftKey(member?.shift?.name ?? member?.shiftId);
                          const memberBusy = shiftAssignmentBusyUserId === member.id;

                          return (
                            <ContextMenu key={member.id}>
                              <ContextMenuTrigger asChild>
                                <div
                                  draggable={!memberBusy}
                                  onDragStart={() => setDraggedUserId(member.id)}
                                  onDragEnd={() => {
                                    setDraggedUserId(null);
                                    setDropShiftTarget(null);
                                  }}
                                  className="flex items-center gap-2 p-1.5 rounded bg-muted text-sm cursor-grab active:cursor-grabbing"
                                  title="Glisser vers un autre shift ou clic droit"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">{String(member.name || '?').charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate">{member.name}</span>
                                  {memberBusy && (
                                    <span className="text-[10px] text-muted-foreground">Mise a jour...</span>
                                  )}
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuLabel>{member.name}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  disabled={memberBusy || memberCurrentShift === 'A'}
                                  onSelect={() => void assignUserToShift(member.id, 'A')}
                                >
                                  Deplacer vers Shift A
                                </ContextMenuItem>
                                <ContextMenuItem
                                  disabled={memberBusy || memberCurrentShift === 'B'}
                                  onSelect={() => void assignUserToShift(member.id, 'B')}
                                >
                                  Deplacer vers Shift B
                                </ContextMenuItem>
                                <ContextMenuItem
                                  disabled={memberBusy || memberCurrentShift === 'C'}
                                  onSelect={() => void assignUserToShift(member.id, 'C')}
                                >
                                  Deplacer vers Shift C
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                        {shiftAgents[normalizedShiftName].length === 0 && (
                          <div className="text-xs text-muted-foreground p-2 rounded bg-muted/40">Aucun agent dans ce shift</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Paramètres Planning</CardTitle>
            <CardDescription>Contrôlez la visibilité du repos individuel et les rôles autorisés à générer le PDF planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Autoriser la génération PDF planning</p>
                <p className="text-xs text-muted-foreground">Si désactivé, personne ne peut générer le PDF.</p>
              </div>
              <Switch
                checked={Boolean(planningSettings?.permissions?.enablePdfGeneration)}
                onCheckedChange={(checked) =>
                  setPlanningSettings((prev: any) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      enablePdfGeneration: checked,
                    },
                  }))
                }
                disabled={planningSettingsLoading || planningSettingsSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planning-pdf-roles">Rôles autorisés à générer le PDF</Label>
              <Input
                id="planning-pdf-roles"
                value={Array.isArray(planningSettings?.permissions?.pdfAllowedRoles) ? planningSettings.permissions.pdfAllowedRoles.join(', ') : ''}
                onChange={(event) =>
                  setPlanningSettings((prev: any) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      pdfAllowedRoles: event.target.value
                        .split(',')
                        .map((entry) => entry.trim().toUpperCase())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="TECHNICIEN_NO, RESPONSABLE, ADMIN, SUPER_ADMIN"
                disabled={planningSettingsLoading || planningSettingsSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planning-rest-roles">Rôles qui voient le repos individuel</Label>
              <Input
                id="planning-rest-roles"
                value={Array.isArray(planningSettings?.visibility?.individualRestVisibleRoles)
                  ? planningSettings.visibility.individualRestVisibleRoles.join(', ')
                  : ''}
                onChange={(event) =>
                  setPlanningSettings((prev: any) => ({
                    ...prev,
                    visibility: {
                      ...prev.visibility,
                      individualRestVisibleRoles: event.target.value
                        .split(',')
                        .map((entry) => entry.trim().toUpperCase())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="TECHNICIEN_NO, RESPONSABLE, ADMIN, SUPER_ADMIN"
                disabled={planningSettingsLoading || planningSettingsSaving}
              />
              <p className="text-xs text-muted-foreground">Rôles détectés: {availablePlanningRoles.join(', ') || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planning-rest-label-mode">Format d'affichage du RI</Label>
              <Select
                value={planningSettings?.visibility?.individualRestLabelMode === 'PSEUDO' ? 'PSEUDO' : 'FULL_NAME'}
                onValueChange={(value) =>
                  setPlanningSettings((prev: any) => ({
                    ...prev,
                    visibility: {
                      ...prev.visibility,
                      individualRestLabelMode: value === 'PSEUDO' ? 'PSEUDO' : 'FULL_NAME',
                    },
                  }))
                }
                disabled={planningSettingsLoading || planningSettingsSaving}
              >
                <SelectTrigger id="planning-rest-label-mode">
                  <SelectValue placeholder="Choisir un mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_NAME">Nom/Prenom complet</SelectItem>
                  <SelectItem value="PSEUDO">Pseudo utilisateur</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Ce mode s'applique aux RI affichés dans le calendrier et le détail.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planning-rest-name-overrides">Libellés RI personnalisés</Label>
              <Input
                id="planning-rest-name-overrides"
                value={planningRestNameOverridesInput}
                onChange={(event) => {
                  const nextOverrides: Record<string, string> = {};
                  event.target.value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean)
                    .forEach((entry) => {
                      const separatorIndex = entry.indexOf(':');
                      if (separatorIndex <= 0) return;
                      const memberName = entry.slice(0, separatorIndex).trim();
                      const label = entry.slice(separatorIndex + 1).trim();
                      if (!memberName || !label) return;
                      nextOverrides[memberName] = label;
                    });

                  setPlanningSettings((prev: any) => ({
                    ...prev,
                    visibility: {
                      ...prev.visibility,
                      individualRestNameOverrides: nextOverrides,
                    },
                  }));
                }}
                placeholder="Lapreuve:Lap, Kevine:Kev, Casimir:Cas"
                disabled={planningSettingsLoading || planningSettingsSaving}
              />
              <p className="text-xs text-muted-foreground">Format: NomPlanning:Libellé, séparés par des virgules. Exemple: Lapreuve:Lap, Alaine:Ala</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void loadPlanningSettings()} disabled={planningSettingsLoading || planningSettingsSaving}>
                <RefreshCw className={`w-4 h-4 mr-2 ${planningSettingsLoading ? 'animate-spin' : ''}`} />
                Recharger
              </Button>
              <Button onClick={() => void savePlanningSettings()} disabled={planningSettingsLoading || planningSettingsSaving}>
                {planningSettingsSaving ? 'Enregistrement...' : 'Enregistrer les paramètres planning'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
