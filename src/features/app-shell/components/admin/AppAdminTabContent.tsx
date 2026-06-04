import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AppAdminTabContentProps = {
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
};

export function AppAdminTabContent({
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
}: AppAdminTabContentProps) {
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
            <CardTitle className="text-base">Configuration des Shifts</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.keys(SHIFTS_DATA).map((shiftName) => {
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
                        {shiftData.members.map((member: string, idx: number) => (
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
      </TabsContent>
    </Tabs>
  );
}
