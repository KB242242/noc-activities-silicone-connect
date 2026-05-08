'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { toast as sonnerToast } from 'sonner';
import { Plus, AlertTriangle, AlertCircle, RefreshCw, Inbox, Pin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FloatingDialogContent,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory = 'incident' | 'request' | 'problem' | 'change' | 'other';
type TicketDialogResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface TicketOptionItem {
  id: string;
  name: string;
  localite?: string | null;
}

interface TicketLocalityDraft {
  countryCode: string;
  countryName: string;
  city: string;
  arrondissement: string;
  quartier: string;
  address: string;
  latitude: string;
  longitude: string;
  freeText: string;
}

interface TicketCountryOption {
  code: string;
  name: string;
  flag: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_PRIORITIES: Record<TicketPriority, { label: string }> = {
  low: { label: 'Faible' },
  medium: { label: 'Moyenne' },
  high: { label: 'Haute' },
  critical: { label: 'Critique' },
};

const TICKET_CATEGORIES: Record<TicketCategory, { label: string; icon: typeof AlertTriangle }> = {
  incident: { label: 'Incident', icon: AlertTriangle },
  request: { label: 'Demande', icon: Inbox },
  problem: { label: 'Problème', icon: AlertCircle },
  change: { label: 'Changement', icon: RefreshCw },
  other: { label: 'Autre', icon: Pin },
};

const TICKET_COUNTRIES: TicketCountryOption[] = [
  { code: 'CD', name: 'RDC', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
];

const DEFAULT_LOCALITY_DRAFT: TicketLocalityDraft = {
  countryCode: 'CD',
  countryName: 'RDC',
  city: '',
  arrondissement: '',
  quartier: '',
  address: '',
  latitude: '',
  longitude: '',
  freeText: '',
};

const DEFAULT_TICKET_FORM = {
  objet: '',
  description: '',
  priority: 'medium' as TicketPriority,
  category: 'incident' as TicketCategory,
  site: '',
  localite: '',
  technicien: '',
  dueDate: null as Date | null,
  etr: null as Date | null,
  sla: '',
  slr: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createToastId = (type: 'success' | 'error') =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toast = {
  success: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.success(message, { id: createToastId('success'), ...(options ?? {}) }),
  error: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.error(message, { id: createToastId('error'), ...(options ?? {}) }),
};

function mapLegacyPriorityToApi(priority?: TicketPriority): string {
  const map: Record<string, string> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' };
  return map[priority ?? 'medium'] ?? 'MEDIUM';
}

function mapLegacyCategoryToApiType(category?: TicketCategory): string {
  const map: Record<string, string> = {
    incident: 'INCIDENT', request: 'REQUEST', problem: 'PROBLEM', change: 'CHANGE', other: 'OTHER',
  };
  return map[category ?? 'incident'] ?? 'INCIDENT';
}

function splitValues(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTicketDialogProps {
  siteOptions: TicketOptionItem[];
  localityOptions: string[];
  technicianOptions: TicketOptionItem[];
  user: { id: string; name: string } | null | undefined;
  onLocalityCreated: (name: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTicketCreated: (ticket: any) => void;
  onRefreshTickets: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTicketDialog({
  siteOptions,
  localityOptions,
  technicianOptions,
  user,
  onLocalityCreated,
  onTicketCreated,
  onRefreshTickets,
}: CreateTicketDialogProps) {
  // Dialog open state
  const [open, setOpen] = useState(false);

  // Form state – isolated, won't cause page.tsx to re-render
  const [form, setForm] = useState(DEFAULT_TICKET_FORM);
  const [localityDraft, setLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_LOCALITY_DRAFT);
  const [localityCreationEnabled, setLocalityCreationEnabled] = useState(false);
  const [isCreatingLocality, setIsCreatingLocality] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag/resize state – fully isolated
  const [position, setPosition] = useState({ x: 48, y: 72 });
  const [size, setSize] = useState({ width: 1100, height: 820 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<TicketDialogResizeDirection | null>(null);
  const pointerRef = useRef({
    dragOffsetX: 0, dragOffsetY: 0,
    startX: 0, startY: 0,
    startLeft: 0, startTop: 0,
    startWidth: 0, startHeight: 0,
  });

  // Center dialog on open
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const vp = 16;
    const maxW = Math.max(460, window.innerWidth - vp * 2);
    const maxH = Math.max(360, window.innerHeight - vp * 2);
    const w = clamp(size.width, 460, maxW);
    const h = clamp(size.height, 360, maxH);
    setSize({ width: w, height: h });
    setPosition({
      x: Math.max(vp, Math.round((window.innerWidth - w) / 2)),
      y: Math.max(vp, Math.round((window.innerHeight - h) / 2)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Drag/resize event listeners
  useEffect(() => {
    if (!isDragging && !resizeDir) return;
    const vp = 16;
    const minW = 460;
    const minH = 360;

    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        const maxX = Math.max(vp, window.innerWidth - vp - size.width);
        const maxY = Math.max(vp, window.innerHeight - vp - size.height);
        setPosition({
          x: clamp(e.clientX - pointerRef.current.dragOffsetX, vp, maxX),
          y: clamp(e.clientY - pointerRef.current.dragOffsetY, vp, maxY),
        });
        return;
      }
      if (!resizeDir) return;

      const maxW = Math.max(minW, window.innerWidth - vp * 2);
      const maxH = Math.max(minH, window.innerHeight - vp * 2);
      const dx = e.clientX - pointerRef.current.startX;
      const dy = e.clientY - pointerRef.current.startY;
      let { startWidth: nw, startHeight: nh, startLeft: nl, startTop: nt } = pointerRef.current;

      if (resizeDir.includes('e')) nw = clamp(pointerRef.current.startWidth + dx, minW, maxW);
      if (resizeDir.includes('s')) nh = clamp(pointerRef.current.startHeight + dy, minH, maxH);
      if (resizeDir.includes('w')) {
        nw = clamp(pointerRef.current.startWidth - dx, minW, maxW);
        nl = pointerRef.current.startLeft + (pointerRef.current.startWidth - nw);
      }
      if (resizeDir.includes('n')) {
        nh = clamp(pointerRef.current.startHeight - dy, minH, maxH);
        nt = pointerRef.current.startTop + (pointerRef.current.startHeight - nh);
      }

      nl = clamp(nl, vp, Math.max(vp, window.innerWidth - vp - nw));
      nt = clamp(nt, vp, Math.max(vp, window.innerHeight - vp - nh));
      setSize({ width: nw, height: nh });
      setPosition({ x: nl, y: nt });
    };

    const onUp = () => { setIsDragging(false); setResizeDir(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, resizeDir, size.width, size.height]);

  const startDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    pointerRef.current.dragOffsetX = e.clientX - position.x;
    pointerRef.current.dragOffsetY = e.clientY - position.y;
    setIsDragging(true);
  }, [position.x, position.y]);

  const startResize = useCallback((dir: TicketDialogResizeDirection, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
    pointerRef.current.startLeft = position.x;
    pointerRef.current.startTop = position.y;
    pointerRef.current.startWidth = size.width;
    pointerRef.current.startHeight = size.height;
    setResizeDir(dir);
  }, [position.x, position.y, size.width, size.height]);

  // ─── Locality creation ──────────────────────────────────────────────────────

  const handleCreateLocality = useCallback(async () => {
    const freeText = localityDraft.freeText.trim().replace(/\s+/g, ' ');
    const hasData = freeText || localityDraft.city.trim() || localityDraft.arrondissement.trim()
      || localityDraft.quartier.trim() || localityDraft.address.trim()
      || localityDraft.latitude.trim() || localityDraft.longitude.trim();

    if (!hasData) {
      toast.error('Veuillez renseigner une localité');
      return;
    }

    setIsCreatingLocality(true);
    try {
      const res = await fetch('/api/tickets/localities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: freeText,
          countryCode: localityDraft.countryCode,
          countryName: localityDraft.countryName,
          city: localityDraft.city,
          arrondissement: localityDraft.arrondissement,
          quartier: localityDraft.quartier,
          address: localityDraft.address,
          latitude: localityDraft.latitude,
          longitude: localityDraft.longitude,
        }),
      });
      if (!res.ok) throw new Error('locality_create_failed');

      const created = await res.json();
      const name = (created?.name ?? created?.label ?? created?.value ?? freeText).trim().replace(/\s+/g, ' ');
      if (!name) throw new Error('locality_name_empty');

      onLocalityCreated(name);
      setForm((prev) => ({ ...prev, localite: name }));
      setLocalityDraft((prev) => ({ ...DEFAULT_LOCALITY_DRAFT, countryCode: prev.countryCode, countryName: prev.countryName }));
      toast.success('Localité enregistrée', { description: name });
    } catch {
      toast.error("Impossible d'enregistrer la localité");
    } finally {
      setIsCreatingLocality(false);
    }
  }, [localityDraft, onLocalityCreated]);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!form.objet.trim()) {
      toast.error('Erreur', { description: "L'objet du ticket est requis" });
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedSites = splitValues(form.site)
        .map((name) => siteOptions.find((s) => s.name === name))
        .filter(Boolean) as TicketOptionItem[];

      const selectedTechs = splitValues(form.technicien)
        .map((name) => technicianOptions.find((t) => t.name === name))
        .filter(Boolean) as TicketOptionItem[];

      const res = await fetch('/api/tickets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mapLegacyCategoryToApiType(form.category),
          objet: form.objet,
          description: form.description,
          priority: mapLegacyPriorityToApi(form.priority),
          status: 'OPEN',
          siteIds: selectedSites.map((s) => s.id),
          localities: splitValues(form.localite),
          technicianIds: selectedTechs.map((t) => t.id),
          creatorId: user?.id,
          creatorName: user?.name,
          dueDate: form.dueDate?.toISOString() ?? null,
          etr: form.etr?.toISOString() ?? null,
          sla: form.sla,
          slr: form.slr,
        }),
      });

      if (!res.ok) throw new Error('ticket_create_failed');

      const ticket = await res.json();
      onTicketCreated(ticket);
      setForm(DEFAULT_TICKET_FORM);
      setLocalityDraft(DEFAULT_LOCALITY_DRAFT);
      setLocalityCreationEnabled(false);
      setOpen(false);
      await onRefreshTickets();
      toast.success('Ticket créé', { description: `Le ticket ${ticket.numero ?? ''} a été créé` });
    } catch {
      toast.error('Impossible de créer le ticket');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, siteOptions, technicianOptions, user, onTicketCreated, onRefreshTickets]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLocalityCreationEnabled(false);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="ticket-create-button group h-9 rounded-lg px-3 text-sm font-semibold sm:h-10 sm:px-4"
          aria-label="Créer un ticket"
        >
          <span className="text-lg leading-none transition-transform duration-200 group-hover:scale-110 sm:hidden">+</span>
          <Plus className="hidden h-4 w-4 transition-transform duration-200 group-hover:scale-110 sm:mr-2 sm:inline-block" />
          <span className="hidden sm:inline">Créer un ticket</span>
        </Button>
      </DialogTrigger>

      <FloatingDialogContent
        showCloseButton={false}
        className="z-[80] overflow-hidden rounded-xl border-2 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Header / drag zone */}
        <div
          className="sticky top-0 z-20 border-b bg-slate-50/90 px-6 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90"
          onMouseDown={startDrag}
        >
          <DialogHeader className="cursor-move select-none">
            <DialogTitle className="text-xl text-foreground">Créer un nouveau ticket</DialogTitle>
            <DialogDescription>Remplissez les informations du ticket</DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 px-6 py-4">

            {/* Objet + Catégorie */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Objet *</Label>
                <Input
                  value={form.objet}
                  onChange={(e) => setForm((p) => ({ ...p, objet: e.target.value }))}
                  placeholder="Objet du ticket"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Catégorie</Label>
                <Select value={form.category} onValueChange={(v: TicketCategory) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {Object.entries(TICKET_CATEGORIES).map(([key, val]) => {
                      const Icon = val.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <Icon className="inline w-4 h-4 mr-2" />{val.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label className="text-foreground font-medium">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez le problème ou la demande..."
                rows={3}
                className="border-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            {/* Priorité + Site + Localité */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Priorité</Label>
                <Select value={form.priority} onValueChange={(v: TicketPriority) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {Object.entries(TICKET_PRIORITIES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Site</Label>
                <Select value={form.site} onValueChange={(v) => setForm((p) => ({ ...p, site: v }))}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {siteOptions.map((site) => (
                      <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Localité</Label>
                <Select value={form.localite} onValueChange={(v) => {
                  setForm((p) => ({ ...p, localite: v }));
                  setLocalityDraft((p) => ({ ...p, freeText: v }));
                }}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner ou saisir" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {localityOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={localityDraft.freeText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalityDraft((p) => ({ ...p, freeText: v }));
                    setForm((p) => ({ ...p, localite: v }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !localityCreationEnabled) return;
                    e.preventDefault();
                    void handleCreateLocality();
                  }}
                  placeholder={
                    localityCreationEnabled
                      ? 'Ou tapez directement la localité puis Entrée'
                      : 'Saisie libre (activez le switch pour enregistrer en base)'
                  }
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Switch localité */}
            <div className="flex items-center justify-between rounded-lg border border-slate-300/70 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div>
                <p className="text-sm font-medium text-foreground">Créer une localité dans la base</p>
                <p className="text-xs text-muted-foreground">Activez pour afficher le formulaire structuré</p>
              </div>
              <Switch checked={localityCreationEnabled} onCheckedChange={setLocalityCreationEnabled} />
            </div>

            {/* Formulaire localité structuré */}
            {localityCreationEnabled && (
              <Card className="border border-dashed border-cyan-300/70 bg-cyan-50/40 dark:border-cyan-700/70 dark:bg-slate-800/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-foreground">Créer une nouvelle localité</CardTitle>
                  <CardDescription>Pays, ville, arrondissement, quartier, adresse et coordonnées GPS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Pays</Label>
                      <Select
                        value={localityDraft.countryCode}
                        onValueChange={(code) => {
                          const c = TICKET_COUNTRIES.find((x) => x.code === code);
                          setLocalityDraft((p) => ({ ...p, countryCode: code, countryName: c?.name ?? p.countryName }));
                        }}
                      >
                        <SelectTrigger className="border dark:border-slate-600 dark:bg-slate-800">
                          {(() => {
                            const c = TICKET_COUNTRIES.find((x) => x.code === localityDraft.countryCode);
                            return c ? <span>{c.flag} {c.name}</span> : <span className="text-muted-foreground">Choisir un pays</span>;
                          })()}
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800">
                          {TICKET_COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Ville</Label>
                      <Input value={localityDraft.city} onChange={(e) => setLocalityDraft((p) => ({ ...p, city: e.target.value }))} placeholder="Ex: Kinshasa" className="border dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Arrondissement</Label>
                      <Input value={localityDraft.arrondissement} onChange={(e) => setLocalityDraft((p) => ({ ...p, arrondissement: e.target.value }))} placeholder="Ex: Gombe" className="border dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Quartier</Label>
                      <Input value={localityDraft.quartier} onChange={(e) => setLocalityDraft((p) => ({ ...p, quartier: e.target.value }))} placeholder="Ex: Basoko" className="border dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-foreground text-xs">Adresse</Label>
                    <Input value={localityDraft.address} onChange={(e) => setLocalityDraft((p) => ({ ...p, address: e.target.value }))} placeholder="Ex: Avenue Colonel Mondjiba, n°12" className="border dark:border-slate-600 dark:bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Latitude</Label>
                      <Input value={localityDraft.latitude} onChange={(e) => setLocalityDraft((p) => ({ ...p, latitude: e.target.value }))} placeholder="Ex: -4.325" className="border dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground text-xs">Longitude</Label>
                      <Input value={localityDraft.longitude} onChange={(e) => setLocalityDraft((p) => ({ ...p, longitude: e.target.value }))} placeholder="Ex: 15.322" className="border dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCreatingLocality}
                      onClick={() => void handleCreateLocality()}
                      className="border-cyan-300 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
                    >
                      {isCreatingLocality ? 'Enregistrement...' : 'Ajouter cette localité'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technicien */}
            <div className="grid gap-2">
              <Label className="text-foreground font-medium">Technicien assigné</Label>
              <Select value={form.technicien} onValueChange={(v) => setForm((p) => ({ ...p, technicien: v }))}>
                <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {technicianOptions.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date + ETR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Date d'échéance (Due Date)</Label>
                <Input
                  type="datetime-local"
                  value={form.dueDate ? format(form.dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">ETR (Est. Time Resolution)</Label>
                <Input
                  type="datetime-local"
                  value={form.etr ? format(form.etr, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setForm((p) => ({ ...p, etr: e.target.value ? new Date(e.target.value) : null }))}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* SLA + SLR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">SLA (Service Level Agreement)</Label>
                <Select value={form.sla} onValueChange={(v) => setForm((p) => ({ ...p, sla: v }))}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="1h">1 heure</SelectItem>
                    <SelectItem value="4h">4 heures</SelectItem>
                    <SelectItem value="8h">8 heures</SelectItem>
                    <SelectItem value="24h">24 heures</SelectItem>
                    <SelectItem value="48h">48 heures</SelectItem>
                    <SelectItem value="72h">72 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">SLR (Service Level Resolution)</Label>
                <Input
                  value={form.slr}
                  onChange={(e) => setForm((p) => ({ ...p, slr: e.target.value }))}
                  placeholder="Ex: 95%, 99%"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-5 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="border-2">Annuler</Button>
          </DialogClose>
          <Button
            disabled={isSubmitting}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
            onClick={() => void handleSubmit()}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Création...' : 'Créer le ticket'}
          </Button>
        </DialogFooter>

        {/* Resize handles */}
        <div className="absolute inset-y-0 right-0 w-2 cursor-e-resize" onMouseDown={(e) => startResize('e', e)} />
        <div className="absolute inset-y-0 left-0 w-2 cursor-w-resize" onMouseDown={(e) => startResize('w', e)} />
        <div className="absolute inset-x-0 top-0 h-2 cursor-n-resize" onMouseDown={(e) => startResize('n', e)} />
        <div className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize" onMouseDown={(e) => startResize('s', e)} />
        <div className="absolute right-0 top-0 h-3 w-3 cursor-ne-resize" onMouseDown={(e) => startResize('ne', e)} />
        <div className="absolute left-0 top-0 h-3 w-3 cursor-nw-resize" onMouseDown={(e) => startResize('nw', e)} />
        <div className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize" onMouseDown={(e) => startResize('se', e)} />
        <div className="absolute left-0 bottom-0 h-3 w-3 cursor-sw-resize" onMouseDown={(e) => startResize('sw', e)} />
      </FloatingDialogContent>
    </Dialog>
  );
}
