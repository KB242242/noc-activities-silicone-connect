import type { Dispatch, SetStateAction } from 'react';

import { MapPin } from 'lucide-react';

import { TICKET_COUNTRIES } from '@/features/app-shell/ticket-constants';
import type { TicketCountryOption, TicketLocalityDraft, TicketManagedLocality } from '@/features/app-shell/types';
import { renderTicketCountryLabel } from '@/features/app-shell/ticket-ui';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type AppTicketsLocalityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quickLocalityDraft: TicketLocalityDraft;
  setQuickLocalityDraft: Dispatch<SetStateAction<TicketLocalityDraft>>;
  quickLocalityTab: 'create' | 'manage';
  onQuickLocalityTabChange: (tab: 'create' | 'manage') => void;
  managedLocalitySearch: string;
  onManagedLocalitySearchChange: (value: string) => void;
  selectedManagedLocalityId: string;
  onSelectManagedLocality: (id: string) => void;
  filteredManagedLocalities: TicketManagedLocality[];
  managedLocalityName: string;
  onManagedLocalityNameChange: (value: string) => void;
  managedLocalityDraft: TicketLocalityDraft;
  setManagedLocalityDraft: Dispatch<SetStateAction<TicketLocalityDraft>>;
  ticketCongoDepartments: string[];
  isCreatingLocality: boolean;
  isDeletingLocality: boolean;
  isUpdatingLocality: boolean;
  onCreateQuickLocality: () => void | Promise<void>;
  onDeleteManagedLocality: () => void | Promise<void>;
  onUpdateManagedLocality: () => void | Promise<void>;
};

export function AppTicketsLocalityDialog({
  open,
  onOpenChange,
  quickLocalityDraft,
  setQuickLocalityDraft,
  quickLocalityTab,
  onQuickLocalityTabChange,
  managedLocalitySearch,
  onManagedLocalitySearchChange,
  selectedManagedLocalityId,
  onSelectManagedLocality,
  filteredManagedLocalities,
  managedLocalityName,
  onManagedLocalityNameChange,
  managedLocalityDraft,
  setManagedLocalityDraft,
  ticketCongoDepartments,
  isCreatingLocality,
  isDeletingLocality,
  isUpdatingLocality,
  onCreateQuickLocality,
  onDeleteManagedLocality,
  onUpdateManagedLocality,
}: AppTicketsLocalityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md border-2 border-cyan-500 dark:border-cyan-400"
          aria-label="Créer une localité"
          title="Créer une localité"
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto border-2 bg-white dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Créer une localité</DialogTitle>
          <DialogDescription>
            Renseignez les informations de localisation. Pour la République du Congo, les départements proviennent des sites enregistrés.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={quickLocalityTab} onValueChange={(value) => onQuickLocalityTabChange(value as 'create' | 'manage')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Créer</TabsTrigger>
            <TabsTrigger value="manage">Modifier</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-3 py-2 mt-3">
            <div className="grid gap-2">
              <Label className="text-foreground">Nom du site</Label>
              <Input
                value={quickLocalityDraft.freeText}
                onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, freeText: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void onCreateQuickLocality();
                  }
                }}
                placeholder="Ex: Site NOC Pointe-Noire"
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Pays</Label>
                <Select
                  value={quickLocalityDraft.countryCode}
                  onValueChange={(code) => {
                    const country = TICKET_COUNTRIES.find((item) => item.code === code);
                    setQuickLocalityDraft((prev) => ({
                      ...prev,
                      countryCode: code,
                      countryName: country?.name ?? prev.countryName,
                      departement: code === 'CG' ? prev.departement : '',
                    }));
                  }}
                >
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    {(() => {
                      const selectedCountry = TICKET_COUNTRIES.find((item) => item.code === quickLocalityDraft.countryCode);
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
                <Label className="text-foreground">Ville</Label>
                <Input
                  value={quickLocalityDraft.city}
                  onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Ex: Brazzaville"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Département</Label>
                {quickLocalityDraft.countryCode === 'CG' ? (
                  <Select
                    value={quickLocalityDraft.departement}
                    onValueChange={(value) => setQuickLocalityDraft((prev) => ({ ...prev, departement: value }))}
                  >
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
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
                    value={quickLocalityDraft.departement}
                    onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, departement: e.target.value }))}
                    placeholder="Département / Région"
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Arrondissement</Label>
                <Input
                  value={quickLocalityDraft.arrondissement}
                  onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, arrondissement: e.target.value }))}
                  placeholder="Ex: Makélékélé"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Quartier</Label>
                <Input
                  value={quickLocalityDraft.quartier}
                  onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, quartier: e.target.value }))}
                  placeholder="Ex: Centre-ville"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Adresse</Label>
                <Input
                  value={quickLocalityDraft.address}
                  onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: Avenue de la Paix, 12"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-foreground">Référence (description)</Label>
              <Textarea
                value={quickLocalityDraft.reference}
                onChange={(e) => setQuickLocalityDraft((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Point de repère, description du lieu..."
                rows={2}
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-3 py-2 mt-3">
            <div className="grid gap-2">
              <Label className="text-foreground">Recherche localité</Label>
              <Input
                value={managedLocalitySearch}
                onChange={(e) => onManagedLocalitySearchChange(e.target.value)}
                placeholder="Rechercher par nom, ville, département..."
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Localités existantes</Label>
                <Select value={selectedManagedLocalityId} onValueChange={onSelectManagedLocality}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Choisir une localité à modifier" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {filteredManagedLocalities.map((locality) => (
                      <SelectItem key={locality.id} value={locality.id}>{locality.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Nom du site</Label>
                <Input
                  value={managedLocalityName}
                  onChange={(e) => onManagedLocalityNameChange(e.target.value)}
                  placeholder="Nom du site"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Pays</Label>
                <Select
                  value={managedLocalityDraft.countryCode}
                  onValueChange={(code) => {
                    const country = TICKET_COUNTRIES.find((item) => item.code === code);
                    setManagedLocalityDraft((prev) => ({
                      ...prev,
                      countryCode: code,
                      countryName: country?.name ?? prev.countryName,
                    }));
                  }}
                >
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    {(() => {
                      const selectedCountry = TICKET_COUNTRIES.find((item) => item.code === managedLocalityDraft.countryCode);
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
                <Label className="text-foreground">Ville</Label>
                <Input
                  value={managedLocalityDraft.city}
                  onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Ex: Brazzaville"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Département</Label>
                {managedLocalityDraft.countryCode === 'CG' ? (
                  <Select
                    value={managedLocalityDraft.departement}
                    onValueChange={(value) => setManagedLocalityDraft((prev) => ({ ...prev, departement: value }))}
                  >
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
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
                    value={managedLocalityDraft.departement}
                    onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, departement: e.target.value }))}
                    placeholder="Département / Région"
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Arrondissement</Label>
                <Input
                  value={managedLocalityDraft.arrondissement}
                  onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, arrondissement: e.target.value }))}
                  placeholder="Ex: Makélékélé"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-foreground">Quartier</Label>
                <Input
                  value={managedLocalityDraft.quartier}
                  onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, quartier: e.target.value }))}
                  placeholder="Ex: Centre-ville"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Adresse</Label>
                <Input
                  value={managedLocalityDraft.address}
                  onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: Avenue de la Paix, 12"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-foreground">Référence (description)</Label>
              <Textarea
                value={managedLocalityDraft.reference}
                onChange={(e) => setManagedLocalityDraft((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Point de repère, description du lieu..."
                rows={2}
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-2">Fermer</Button>
          </DialogClose>
          {quickLocalityTab === 'create' ? (
            <Button
              type="button"
              onClick={() => void onCreateQuickLocality()}
              disabled={isCreatingLocality}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isCreatingLocality ? 'Création...' : 'Créer'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onDeleteManagedLocality()}
                disabled={isDeletingLocality || !selectedManagedLocalityId}
              >
                {isDeletingLocality ? 'Suppression...' : 'Supprimer'}
              </Button>
              <Button
                type="button"
                onClick={() => void onUpdateManagedLocality()}
                disabled={isUpdatingLocality || !selectedManagedLocalityId}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isUpdatingLocality ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
