'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Save, X, Plus, Minus, Upload, Loader2, AlertCircle,
  Calendar, Clock, User, MapPin, Link2, Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import {
  NocTicket, NocTicketType, NocTicketStatus, NocTicketPriority,
  NocTicketChannel, NocTicketLanguage, NocTicketClassification,
  NocResolutionCause,
  TICKET_TYPE_CONFIG, TICKET_STATUS_CONFIG, TICKET_PRIORITY_CONFIG,
  TICKET_CHANNEL_CONFIG, RESOLUTION_CAUSE_CONFIG,
  MAX_TICKETS_PER_TECHNICIAN_PER_WEEK,
} from './types';

// ── Types ─────────────────────────────────────────────────────

interface TechnicianOption {
  id: string;
  name: string;
  pseudo?: string;
  weeklyOpen: number;
}

interface ClientOption {
  id: string;
  name: string;
  serviceType?: string;
}

interface SiteOption {
  id: string;
  name: string;
  locality?: string;
  reference?: string;
}

interface LocalityOption {
  value: string;
  label: string;
}

interface FormData {
  type: NocTicketType;
  objet: string;
  description: string;
  priority: NocTicketPriority;
  status: NocTicketStatus;
  channel: NocTicketChannel | '';
  language: NocTicketLanguage | '';
  classification: NocTicketClassification | '';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  clientIds: string[];
  technicianIds: string[];
  siteIds: string[];
  localities: string[];
  link: string;
  ticketZoho: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dueDate: string;
  eta: string;
  etr: string;
  resolutionDescription: string;
  resolutionCause: NocResolutionCause | '';
  outageStartDate: string;
  outageStartTime: string;
  outageEndDate: string;
  outageEndTime: string;
}

interface Props {
  user: { id: string; name: string; email: string; role: string };
  editingTicket?: NocTicket | null;
  onClose: () => void;
}

const defaultForm = (): FormData => ({
  type: 'INC',
  objet: '',
  description: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  channel: '',
  language: 'FR',
  classification: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  clientIds: [],
  technicianIds: [],
  siteIds: [],
  localities: [],
  link: '',
  ticketZoho: '',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  startTime: format(new Date(), 'HH:mm'),
  endDate: '',
  endTime: '',
  dueDate: '',
  eta: '',
  etr: '',
  resolutionDescription: '',
  resolutionCause: '',
  outageStartDate: '',
  outageStartTime: '',
  outageEndDate: '',
  outageEndTime: '',
});

// ── Helpers ────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function TicketForm({ user, editingTicket, onClose }: Props) {
  const isEditing = !!editingTicket;
  const [form, setForm] = useState<FormData>(defaultForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [localityOptions, setLocalityOptions] = useState<LocalityOption[]>([]);
  const [localityInput, setLocalityInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // ── Init ───────────────────────────────────────────────────

  useEffect(() => {
    if (editingTicket) {
      const t = editingTicket;
      setForm({
        type: t.type,
        objet: t.objet,
        description: t.description ?? '',
        priority: t.priority,
        status: t.status,
        channel: t.channel ?? '',
        language: t.language ?? 'FR',
        classification: t.classification ?? '',
        contactName: t.contactName ?? '',
        contactEmail: t.contactEmail ?? '',
        contactPhone: t.contactPhone ?? '',
        clientIds: t.clients?.map((c) => c.id) ?? [],
        technicianIds: t.technicians?.map((tech) => tech.id) ?? [],
        siteIds: t.siteIds ?? [],
        localities: t.localities ?? [],
        link: t.link ?? '',
        ticketZoho: t.ticketZoho ?? '',
        startDate: t.startDate ? format(new Date(t.startDate), 'yyyy-MM-dd') : '',
        startTime: t.startDate ? format(new Date(t.startDate), 'HH:mm') : '',
        endDate: t.endDate ? format(new Date(t.endDate), 'yyyy-MM-dd') : '',
        endTime: t.endDate ? format(new Date(t.endDate), 'HH:mm') : '',
        dueDate: t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
        eta: t.eta ?? '',
        etr: t.etr ?? '',
        resolutionDescription: t.resolutionDescription ?? '',
        resolutionCause: t.resolutionCause ?? '',
        outageStartDate: t.outageStartTime ? format(new Date(t.outageStartTime), 'yyyy-MM-dd') : '',
        outageStartTime: t.outageStartTime ? format(new Date(t.outageStartTime), 'HH:mm') : '',
        outageEndDate: t.outageEndTime ? format(new Date(t.outageEndTime), 'yyyy-MM-dd') : '',
        outageEndTime: t.outageEndTime ? format(new Date(t.outageEndTime), 'HH:mm') : '',
      });
    }
  }, [editingTicket]);

  // Fetch technicians, clients, sites and localities
  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const [techRes, clientRes, siteRes, localityRes] = await Promise.all([
          fetch('/api/tickets/technicians'),
          fetch('/api/tickets/clients'),
          fetch('/api/tickets/sites'),
          fetch('/api/tickets/localities'),
        ]);
        if (techRes.ok) setTechnicians(await techRes.json());
        if (clientRes.ok) setClients(await clientRes.json());
        if (siteRes.ok) {
          const siteData: SiteOption[] = await siteRes.json();
          setSites(siteData);
        }
        if (localityRes.ok) {
          const localityData: LocalityOption[] = await localityRes.json();
          setLocalityOptions(localityData);
        }
      } catch {
        console.error('Failed to load options');
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  // ── Validation ─────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.objet.trim()) errs.objet = "L'objet est requis";
    if (!form.type) errs.type = 'Le type est requis';
    if (!form.startDate) errs.startDate = 'La date de début est requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Check technician weekly limit
  const techLimitWarnings = form.technicianIds.map((tid) => {
    const tech = technicians.find((t) => t.id === tid);
    if (!tech) return null;
    if (tech.weeklyOpen >= MAX_TICKETS_PER_TECHNICIAN_PER_WEEK && !isEditing) {
      return `${tech.name} a atteint la limite de ${MAX_TICKETS_PER_TECHNICIAN_PER_WEEK} tickets ouverts cette semaine`;
    }
    return null;
  }).filter(Boolean) as string[];

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        creatorId: user.id,
        creatorName: user.name,
        startDate: form.startDate && form.startTime
          ? new Date(`${form.startDate}T${form.startTime}`).toISOString()
          : form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate && form.endTime
          ? new Date(`${form.endDate}T${form.endTime}`).toISOString()
          : form.endDate ? new Date(form.endDate).toISOString() : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        outageStartTime: form.outageStartDate && form.outageStartTime
          ? new Date(`${form.outageStartDate}T${form.outageStartTime}`).toISOString()
          : undefined,
        outageEndTime: form.outageEndDate && form.outageEndTime
          ? new Date(`${form.outageEndDate}T${form.outageEndTime}`).toISOString()
          : undefined,
        channel: form.channel || undefined,
        language: form.language || undefined,
        classification: form.classification || undefined,
        resolutionCause: form.resolutionCause || undefined,
        siteNames: form.siteIds
          .map((sid) => sites.find((s) => s.id === sid)?.name)
          .filter(Boolean),
      };

      const url = isEditing ? `/api/tickets/${editingTicket!.id}` : '/api/tickets/list';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erreur lors de la sauvegarde');
      }

      toast.success(isEditing ? 'Ticket mis à jour' : 'Ticket créé avec succès');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Field helpers ──────────────────────────────────────────

  const set = (field: keyof FormData, value: FormData[keyof FormData]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleArrayItem = (field: 'clientIds' | 'technicianIds' | 'siteIds', id: string) => {
    setForm((p) => {
      const arr = p[field] as string[];
      return { ...p, [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    });
  };

  const addLocality = () => {
    const v = localityInput.trim();
    if (v && !form.localities.includes(v)) {
      setForm((p) => ({ ...p, localities: [...p.localities, v] }));
      setLocalityInput('');
    }
  };

  const removeLocality = (l: string) =>
    setForm((p) => ({ ...p, localities: p.localities.filter((x) => x !== l) }));

  const addLocalityFromOption = (value: string) => {
    const normalized = value.trim();
    if (!normalized || form.localities.includes(normalized)) return;
    setForm((p) => ({ ...p, localities: [...p.localities, normalized] }));
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {isEditing ? `Modifier le ticket ${editingTicket!.numero}` : 'Nouveau Ticket'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing ? 'Modifiez les informations du ticket' : 'Créez un nouveau ticket NOC'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1.5" /> Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              {isEditing ? 'Enregistrer' : 'Créer le ticket'}
            </Button>
          </div>
        </div>

        {/* Limit warnings */}
        {techLimitWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
            {techLimitWarnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main fields */}
          <div className="lg:col-span-2 space-y-6">

            <Card className="p-5 space-y-5">
              <Section title="Informations générales" icon={<Tag className="w-4 h-4" />}>
                {/* Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Type de ticket <span className="text-red-400">*</span></Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(Object.keys(TICKET_TYPE_CONFIG) as NocTicketType[]).map((t) => {
                        const cfg = TICKET_TYPE_CONFIG[t];
                        const active = form.type === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`px-2 py-1.5 rounded text-xs font-bold border transition-all ${active ? `${cfg.bg} ${cfg.border}` : 'border-border hover:border-border/80 hover:bg-muted/20'}`}
                            style={{ color: active ? cfg.color : undefined }}
                            onClick={() => set('type', t)}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {errors.type && <p className="text-xs text-red-400">{errors.type}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Priorité</Label>
                    <Select value={form.priority} onValueChange={(v) => set('priority', v as NocTicketPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TICKET_PRIORITY_CONFIG) as NocTicketPriority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            <span style={{ color: TICKET_PRIORITY_CONFIG[p].color }}>
                              {TICKET_PRIORITY_CONFIG[p].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Objet */}
                <div className="space-y-1.5">
                  <Label>Objet <span className="text-red-400">*</span></Label>
                  <Input
                    placeholder="Objet du ticket"
                    value={form.objet}
                    onChange={(e) => set('objet', e.target.value)}
                    className={errors.objet ? 'border-red-500' : ''}
                  />
                  {errors.objet && <p className="text-xs text-red-400">{errors.objet}</p>}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description détaillée du ticket…"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Channel + Language + Classification */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Canal</Label>
                    <Select value={form.channel} onValueChange={(v) => set('channel', v as NocTicketChannel | '')}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        {(Object.keys(TICKET_CHANNEL_CONFIG) as NocTicketChannel[]).map((c) => (
                          <SelectItem key={c} value={c}>{TICKET_CHANNEL_CONFIG[c].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Langue</Label>
                    <Select value={form.language} onValueChange={(v) => set('language', v as NocTicketLanguage | '')}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="FR">Français</SelectItem>
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="IT">Italiano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Classification</Label>
                    <Select value={form.classification} onValueChange={(v) => set('classification', v as NocTicketClassification | '')}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="QUESTION">Question</SelectItem>
                        <SelectItem value="PROBLEM">Problème</SelectItem>
                        <SelectItem value="FEATURE">Fonctionnalité</SelectItem>
                        <SelectItem value="OTHER">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ticket Zoho + Link */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>N° Ticket Zoho</Label>
                    <Input
                      placeholder="ZOHO-XXXXX"
                      value={form.ticketZoho}
                      onChange={(e) => set('ticketZoho', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Lien externe</Label>
                    <Input
                      type="url"
                      placeholder="https://…"
                      value={form.link}
                      onChange={(e) => set('link', e.target.value)}
                    />
                  </div>
                </div>
              </Section>
            </Card>

            <Card className="p-5 space-y-5">
              <Section title="Dates & Temps" icon={<Calendar className="w-4 h-4" />}>
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Date de début <span className="text-red-400">*</span></Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => set('startDate', e.target.value)}
                        className={`flex-1 ${errors.startDate ? 'border-red-500' : ''}`}
                      />
                      <Input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => set('startTime', e.target.value)}
                        className="w-28"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de fin</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => set('endDate', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => set('endTime', e.target.value)}
                        className="w-28"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Date d&apos;échéance</Label>
                    <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ETA</Label>
                    <Input placeholder="ex: 2h, 30min" value={form.eta} onChange={(e) => set('eta', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ETR</Label>
                    <Input placeholder="ex: 4h" value={form.etr} onChange={(e) => set('etr', e.target.value)} />
                  </div>
                </div>

                <Separator />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Interruption de service</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Début de coupure</Label>
                    <div className="flex gap-2">
                      <Input type="date" value={form.outageStartDate} onChange={(e) => set('outageStartDate', e.target.value)} className="flex-1" />
                      <Input type="time" value={form.outageStartTime} onChange={(e) => set('outageStartTime', e.target.value)} className="w-28" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fin de coupure</Label>
                    <div className="flex gap-2">
                      <Input type="date" value={form.outageEndDate} onChange={(e) => set('outageEndDate', e.target.value)} className="flex-1" />
                      <Input type="time" value={form.outageEndTime} onChange={(e) => set('outageEndTime', e.target.value)} className="w-28" />
                    </div>
                  </div>
                </div>
              </Section>
            </Card>

            <Card className="p-5 space-y-5">
              <Section title="Résolution" icon={<Clock className="w-4 h-4" />}>
                <div className="space-y-1.5">
                  <Label>Description de la résolution</Label>
                  <Textarea
                    placeholder="Décrire la solution apportée…"
                    value={form.resolutionDescription}
                    onChange={(e) => set('resolutionDescription', e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cause de la panne</Label>
                  <Select value={form.resolutionCause} onValueChange={(v) => set('resolutionCause', v as NocResolutionCause | '')}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {(Object.keys(RESOLUTION_CAUSE_CONFIG) as NocResolutionCause[]).map((c) => (
                        <SelectItem key={c} value={c}>{RESOLUTION_CAUSE_CONFIG[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Section>
            </Card>
          </div>

          {/* Right column — meta */}
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</p>
              <Select value={form.status} onValueChange={(v) => set('status', v as NocTicketStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_STATUS_CONFIG) as NocTicketStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span style={{ color: TICKET_STATUS_CONFIG[s].color }}>{TICKET_STATUS_CONFIG[s].label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Contact
              </p>
              <div className="space-y-2">
                <Input placeholder="Nom du contact" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
                <Input type="email" placeholder="Email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                <Input placeholder="Téléphone" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clients SC</p>
              {loading ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {clients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        className="rounded accent-indigo-500"
                        checked={form.clientIds.includes(c.id)}
                        onChange={() => toggleArrayItem('clientIds', c.id)}
                      />
                      <span className="text-sm truncate">{c.name}</span>
                      {c.serviceType && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{c.serviceType}</span>
                      )}
                    </label>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun client disponible</p>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Techniciens</p>
              {loading ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {technicians.map((t) => {
                    const atLimit = t.weeklyOpen >= MAX_TICKETS_PER_TECHNICIAN_PER_WEEK && !isEditing;
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-muted/20 px-2 py-1 rounded ${atLimit ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="rounded accent-indigo-500"
                          checked={form.technicianIds.includes(t.id)}
                          onChange={() => toggleArrayItem('technicianIds', t.id)}
                        />
                        <span className="text-sm truncate flex-1">{t.name}</span>
                        {atLimit && (
                          <span className="text-[10px] text-amber-400">Limite</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{t.weeklyOpen}/{MAX_TICKETS_PER_TECHNICIAN_PER_WEEK}</span>
                      </label>
                    );
                  })}
                  {technicians.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun technicien disponible</p>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Sites
              </p>
              {loading ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sites.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        className="rounded accent-indigo-500"
                        checked={form.siteIds.includes(s.id)}
                        onChange={() => toggleArrayItem('siteIds', s.id)}
                      />
                      <span className="text-sm truncate flex-1">{s.name}</span>
                      {s.locality && (
                        <span className="text-[10px] text-muted-foreground">{s.locality}</span>
                      )}
                    </label>
                  ))}
                  {sites.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun site disponible</p>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Localités
              </p>
              <div className="flex gap-2 items-center">
                <Select value="" onValueChange={addLocalityFromOption}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Sélectionner une localité" />
                  </SelectTrigger>
                  <SelectContent>
                    {localityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une localité manuellement"
                  value={localityInput}
                  onChange={(e) => setLocalityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocality(); } }}
                  className="text-sm"
                />
                <Button type="button" size="icon" variant="outline" onClick={addLocality}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.localities.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1 pr-1">
                    {l}
                    <button type="button" onClick={() => removeLocality(l)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
