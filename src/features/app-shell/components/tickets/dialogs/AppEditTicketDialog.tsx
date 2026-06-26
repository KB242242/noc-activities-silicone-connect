import { useMemo, type Dispatch, type SetStateAction } from 'react';

import { TICKET_COUNTRIES } from '@/features/app-shell/core/config/ticket-constants';
import { renderTicketCountryLabel } from '@/features/app-shell/core/tickets/ticket-ui';
import type { TicketCountryOption, TicketItem, TicketLocalityDraft, TicketPriority, TicketStatus } from '@/features/app-shell/core/shared/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { detectTechnicianSimilarities, mergeTechnicianCandidates } from '@/lib/tickets/technicianIdentity';

type TicketOption = {
  id: string;
  name: string;
  email?: string | null;
  hasEmail?: boolean;
  isActive?: boolean;
  role?: string | null;
};

type OptionItem = {
  key: string;
  label: string;
};

type AppEditTicketDialogProps = {
  open: boolean;
  editingTicket: TicketItem | null;
  setEditingTicket: Dispatch<SetStateAction<TicketItem | null>>;
  ticketSiteOptions: TicketOption[];
  ticketLocalityOptions: string[];
  ticketTechnicianOptions: TicketOption[];
  editTicketLocalityDraft: TicketLocalityDraft;
  setEditTicketLocalityDraft: Dispatch<SetStateAction<TicketLocalityDraft>>;
  isEditLocalityCreationEnabled: boolean;
  onEditLocalityCreationEnabledChange: (checked: boolean) => void;
  ticketCongoDepartments: string[];
  isCreatingLocality: boolean;
  statusOptions: OptionItem[];
  priorityOptions: OptionItem[];
  onOpenChange: (open: boolean) => void;
  onCreateLocality: () => void | Promise<void>;
  onCancel: () => void;
  onSave: (ticket: TicketItem) => void | Promise<void>;
};

export function AppEditTicketDialog({
  open,
  editingTicket,
  setEditingTicket,
  ticketSiteOptions,
  ticketLocalityOptions,
  ticketTechnicianOptions,
  editTicketLocalityDraft,
  setEditTicketLocalityDraft,
  isEditLocalityCreationEnabled,
  onEditLocalityCreationEnabledChange,
  ticketCongoDepartments,
  isCreatingLocality,
  statusOptions,
  priorityOptions,
  onOpenChange,
  onCreateLocality,
  onCancel,
  onSave,
}: AppEditTicketDialogProps) {
  const normalizedTechnicianBundle = useMemo(
    () => mergeTechnicianCandidates(ticketTechnicianOptions),
    [ticketTechnicianOptions]
  );

  const normalizedTechnicianOptions = useMemo(
    () => normalizedTechnicianBundle.options.map((entry) => ({
      id: String(entry.id ?? '').trim(),
      name: String(entry.name ?? '').trim(),
      email: String(entry.email ?? '').trim() || null,
      hasEmail: Boolean(entry.hasEmail),
      isActive: Boolean(entry.isActive),
      role: String(entry.role ?? '').trim() || null,
    })),
    [normalizedTechnicianBundle]
  );

  const technicianSimilarityMessage = useMemo(() => {
    const pairs = [
      ...normalizedTechnicianBundle.similarityPairs,
      ...detectTechnicianSimilarities(normalizedTechnicianOptions),
    ]
      .filter((pair) => pair.canonicalName && pair.similarName)
      .slice(0, 3);
    if (pairs.length === 0) return '';
    const examples = pairs.map((pair) => `${pair.canonicalName} / ${pair.similarName}`).join(' ; ');
    return `Nous avons detecte que ces noms ${examples} ont une forte ressemblance. Confirmez s'il s'agit de la meme personne ou supprimez les comptes dupliques. L'identification prioritaire se fait par adresse mail.`;
  }, [normalizedTechnicianBundle, normalizedTechnicianOptions]);

  return (
    <Dialog key="edit-ticket-dialog" open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-2 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-foreground">Modifier le ticket</DialogTitle>
        </DialogHeader>
        {editingTicket ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Objet</Label>
                <Input
                  value={editingTicket.objet}
                  onChange={(e) => setEditingTicket({ ...editingTicket, objet: e.target.value })}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Statut</Label>
                <Select value={editingTicket.status} onValueChange={(v: TicketStatus) => setEditingTicket({ ...editingTicket, status: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {statusOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Priorité</Label>
                <Select value={editingTicket.priority} onValueChange={(v: TicketPriority) => setEditingTicket({ ...editingTicket, priority: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Site</Label>
                <Select value={editingTicket.site} onValueChange={(v) => setEditingTicket({ ...editingTicket, site: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {ticketSiteOptions.map((site) => (
                      <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Localité</Label>
                <Select value={editingTicket.localite} onValueChange={(v) => {
                  setEditingTicket({ ...editingTicket, localite: v });
                  setEditTicketLocalityDraft((prev) => ({ ...prev, freeText: v }));
                }}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner ou saisir" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {ticketLocalityOptions.map((locality) => (
                      <SelectItem key={locality} value={locality}>{locality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={editTicketLocalityDraft.freeText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditTicketLocalityDraft((prev) => ({ ...prev, freeText: value }));
                    setEditingTicket((prev) => prev ? { ...prev, localite: value } : prev);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (!isEditLocalityCreationEnabled) return;
                    e.preventDefault();
                    void onCreateLocality();
                  }}
                  placeholder={isEditLocalityCreationEnabled ? 'Ou tapez directement la localité puis Entrée' : 'Saisie libre (activez le switch pour enregistrer en base)'}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Technicien</Label>
                <Select value={editingTicket.technicien} onValueChange={(v) => setEditingTicket({ ...editingTicket, technicien: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner un technicien" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {normalizedTechnicianOptions.map((technician) => (
                      <SelectItem key={technician.id} value={technician.name}>{technician.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {technicianSimilarityMessage ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                    {technicianSimilarityMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-foreground font-medium">Description</Label>
              <Textarea
                value={editingTicket.description}
                onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                rows={3}
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-300/70 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div>
                <p className="text-sm font-medium text-foreground">Créer une localité dans la base</p>
                <p className="text-xs text-muted-foreground">Activez pour afficher le formulaire structuré</p>
              </div>
              <Switch checked={isEditLocalityCreationEnabled} onCheckedChange={onEditLocalityCreationEnabledChange} />
            </div>
            {isEditLocalityCreationEnabled && (
              <Card className="border border-dashed border-cyan-300/70 bg-cyan-50/40 dark:border-cyan-700/70 dark:bg-slate-800/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-foreground">Créer une nouvelle localité</CardTitle>
                  <CardDescription>Ajout rapide avec nom du site, pays et détails d'adresse</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Label className="text-foreground text-xs">Nom du site</Label>
                    <Input
                      value={editTicketLocalityDraft.freeText}
                      onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, freeText: e.target.value }))}
                      placeholder="Ex: Site NOC Ouenzé"
                      className="border dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Pays</Label>
                      <Select
                        value={editTicketLocalityDraft.countryCode}
                        onValueChange={(code) => {
                          const country = TICKET_COUNTRIES.find((item) => item.code === code);
                          setEditTicketLocalityDraft((prev) => ({
                            ...prev,
                            countryCode: code,
                            countryName: country?.name ?? prev.countryName,
                            departement: code === 'CG' ? prev.departement : '',
                          }));
                        }}
                      >
                        <SelectTrigger className="border dark:border-slate-600 dark:bg-slate-800">
                          {(() => {
                            const selectedCountry = TICKET_COUNTRIES.find((item) => item.code === editTicketLocalityDraft.countryCode);
                            if (!selectedCountry) {
                              return <span className="text-muted-foreground">Choisir un pays</span>;
                            }
                            return renderTicketCountryLabel(selectedCountry as TicketCountryOption);
                          })()}
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800">
                          {TICKET_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>{renderTicketCountryLabel(country)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Département</Label>
                      {editTicketLocalityDraft.countryCode === 'CG' ? (
                        <Select
                          value={editTicketLocalityDraft.departement}
                          onValueChange={(value) => setEditTicketLocalityDraft((prev) => ({ ...prev, departement: value }))}
                        >
                          <SelectTrigger className="border dark:border-slate-600 dark:bg-slate-800">
                            <SelectValue placeholder="Choisir un département" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800">
                            {ticketCongoDepartments.map((department) => (
                              <SelectItem key={department} value={department}>{department}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={editTicketLocalityDraft.departement}
                          onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, departement: e.target.value }))}
                          placeholder="Département / Région"
                          className="border dark:border-slate-600 dark:bg-slate-800"
                        />
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Ville</Label>
                      <Input
                        value={editTicketLocalityDraft.city}
                        onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Ex: Brazzaville"
                        className="border dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Arrondissement</Label>
                      <Input
                        value={editTicketLocalityDraft.arrondissement}
                        onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, arrondissement: e.target.value }))}
                        placeholder="Ex: Gombe"
                        className="border dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Quartier</Label>
                      <Input
                        value={editTicketLocalityDraft.quartier}
                        onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, quartier: e.target.value }))}
                        placeholder="Ex: Basoko"
                        className="border dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-foreground text-xs">Adresse</Label>
                    <Input
                      value={editTicketLocalityDraft.address}
                      onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Ex: Avenue Colonel Mondjiba, n°12"
                      className="border dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-foreground text-xs">Référence (description)</Label>
                    <Textarea
                      value={editTicketLocalityDraft.reference}
                      onChange={(e) => setEditTicketLocalityDraft((prev) => ({ ...prev, reference: e.target.value }))}
                      placeholder="Point de repère ou description détaillée"
                      rows={2}
                      className="border dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCreatingLocality}
                      onClick={() => void onCreateLocality()}
                      className="border-cyan-300 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
                    >
                      {isCreatingLocality ? 'Enregistrement...' : 'Ajouter cette localité'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" className="border-2" onClick={onCancel}>Annuler</Button>
          <Button
            className="bg-linear-to-r from-cyan-500 to-blue-600 text-white"
            onClick={() => {
              if (editingTicket) {
                void onSave(editingTicket);
              }
            }}
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
