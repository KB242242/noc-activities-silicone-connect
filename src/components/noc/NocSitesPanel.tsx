'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Search, MapPin, Mail, Phone,
  Server, ChevronDown, ChevronUp, Check, Network, Info,
  CalendarDays, FileDown, ShieldCheck, Clock3, UserRound, Building2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Site,
  SiteEquipement,
  SiteSecurityPlanningEntry,
  SiteSecurityShiftStatus,
  SiteStatus,
  SiteTypeInfra,
  SiteVigile,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTEMENTS_BACKBONE_NORD = ['Cuvette', 'Cuvette-Ouest', 'Likouala', 'Sangha', 'Plateaux'] as const;
const DEPARTEMENTS_BACKBONE_SUD = ['Brazzaville', 'Pool', 'Bouenza', 'Lékoumou', 'Niari', 'Kouilou', 'Pointe-Noire'] as const;

const STATUS_LABELS: Record<SiteStatus, string> = {
  ACTIVE: 'Actif', INACTIVE: 'Inactif', MAINTENANCE: 'Maintenance',
};
const SITE_TYPE_LABELS: Record<SiteTypeInfra, string> = {
  ACTIF: 'Actif', PASSIF: 'Passif', PASSIF_ET_ACTIF: 'Passif & Actif',
};
const STATUS_COLORS: Record<SiteStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MAINTENANCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};
const EQUIP_STATUS_COLORS: Record<string, string> = {
  UP: 'bg-emerald-100 text-emerald-700',
  DOWN: 'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};
const SHIFT_STATUS_LABELS: Record<SiteSecurityShiftStatus, string> = {
  PLANNED: 'Planifié',
  ACTIVE: 'En poste',
  COMPLETED: 'Terminé',
  ABSENT: 'Absent',
  REPLACED: 'Remplacé',
  CANCELLED: 'Annulé',
};
const SHIFT_STATUS_COLORS: Record<SiteSecurityShiftStatus, string> = {
  PLANNED: 'bg-sky-100 text-sky-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-slate-100 text-slate-700',
  ABSENT: 'bg-rose-100 text-rose-800',
  REPLACED: 'bg-violet-100 text-violet-800',
  CANCELLED: 'bg-orange-100 text-orange-800',
};

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMonthLabel(month: string) {
  const [year, value] = month.split('-');
  const index = Number(value) - 1;
  const names = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  return `${names[index] ?? month} ${year}`;
}

// ─── Form type ────────────────────────────────────────────────────────────────

type FormData = {
  site_ref: string; site_name: string;
  site_type_infra: SiteTypeInfra; departement: string;
  arrondissement: string; quartier: string; localite: string;
  latitude: string; longitude: string; lieu_exact: string;
  responsible_name: string; responsible_phone: string;
  contact_email: string; contact_phone: string; service_phone: string;
  vigiles: Array<{ _key: string; first_name: string; last_name: string; personal_phone: string; is_active: boolean }>;
  status: SiteStatus; description: string; infrastructure_notes: string;
};

type PlanningFormData = {
  id?: string;
  site_id: string;
  vigile_id: string;
  shift_start: string;
  shift_end: string;
  status: SiteSecurityShiftStatus;
  notes: string;
};

const EMPTY_FORM: FormData = {
  site_ref: '', site_name: '', site_type_infra: 'ACTIF', departement: '',
  arrondissement: '', quartier: '', localite: '', latitude: '', longitude: '',
  lieu_exact: '', responsible_name: '', responsible_phone: '',
  contact_email: '', contact_phone: '', service_phone: '',
  vigiles: [], status: 'ACTIVE',
  description: '', infrastructure_notes: '',
};

const EMPTY_PLANNING_FORM: PlanningFormData = {
  site_id: '',
  vigile_id: '',
  shift_start: '',
  shift_end: '',
  status: 'PLANNED',
  notes: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function NocSitesPanel() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // Equipment selection
  const [allEquipements, setAllEquipements] = useState<SiteEquipement[]>([]);
  const [selectedEquipIds, setSelectedEquipIds] = useState<Set<string>>(new Set());
  const [equipSearch, setEquipSearch] = useState('');
  const [loadingEquip, setLoadingEquip] = useState(false);

  // Expanded site cards
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [siteDetails, setSiteDetails] = useState<Record<string, Site>>({});

  // Security planning
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false);
  const [planningFormOpen, setPlanningFormOpen] = useState(false);
  const [planningMonth, setPlanningMonth] = useState(getCurrentMonthValue());
  const [planningSiteFilter, setPlanningSiteFilter] = useState<string>('all');
  const [planningEntries, setPlanningEntries] = useState<SiteSecurityPlanningEntry[]>([]);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningSaving, setPlanningSaving] = useState(false);
  const [planningForm, setPlanningForm] = useState<PlanningFormData>(EMPTY_PLANNING_FORM);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/noc/sites?limit=200');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSites(data.data ?? []);
    } catch {
      toast.error('Impossible de charger les sites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const fetchEquipementList = useCallback(async (siteId?: string) => {
    try {
      setLoadingEquip(true);
      const url = siteId ? `/api/noc/sites/equipment-list?site_id=${siteId}` : '/api/noc/sites/equipment-list';
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: SiteEquipement[] = data.data ?? [];
      setAllEquipements(list);
      if (siteId) setSelectedEquipIds(new Set(list.filter((e) => e.linked).map((e) => e.id)));
    } catch {
      toast.error('Impossible de charger la liste des équipements');
    } finally {
      setLoadingEquip(false);
    }
  }, []);

  const fetchSiteDetail = useCallback(async (siteId: string) => {
    if (siteDetails[siteId]) return siteDetails[siteId];
    try {
      const res = await fetch(`/api/noc/sites?id=${siteId}`);
      if (!res.ok) return null;
      const data = await res.json();
      setSiteDetails((prev) => ({ ...prev, [siteId]: data }));
      return data as Site;
    } catch { /* silent */ }
    return null;
  }, [siteDetails]);

  const fetchPlanning = useCallback(async (siteFilter = planningSiteFilter, month = planningMonth) => {
    try {
      setPlanningLoading(true);
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (siteFilter !== 'all') params.set('site_id', siteFilter);
      const res = await fetch(`/api/noc/sites/security-planning?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlanningEntries(data.data ?? []);
    } catch {
      toast.error('Impossible de charger le planning de securite');
    } finally {
      setPlanningLoading(false);
    }
  }, [planningMonth, planningSiteFilter]);

  useEffect(() => {
    if (!planningDialogOpen) return;
    void fetchPlanning();
  }, [planningDialogOpen, planningMonth, planningSiteFilter, fetchPlanning]);

  useEffect(() => {
    if (!planningFormOpen || !planningForm.site_id) return;
    void fetchSiteDetail(planningForm.site_id);
  }, [planningFormOpen, planningForm.site_id, fetchSiteDetail]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addVigile = () => {
    setForm((prev) => ({
      ...prev,
      vigiles: [...prev.vigiles, { _key: `v-${Date.now()}-${Math.random()}`, first_name: '', last_name: '', personal_phone: '', is_active: true }],
    }));
  };

  const updateVigile = (index: number, field: 'first_name' | 'last_name' | 'personal_phone', value: string) => {
    setForm((prev) => ({
      ...prev,
      vigiles: prev.vigiles.map((vigile, currentIndex) => (
        currentIndex === index ? { ...vigile, [field]: value } : vigile
      )),
    }));
  };

  const removeVigile = (index: number) => {
    setForm((prev) => ({
      ...prev,
      vigiles: prev.vigiles.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSelectedEquipIds(new Set());
    setEquipSearch('');
    setFormStep(1);
    void fetchEquipementList();
    setDialogOpen(true);
  };

  const openEdit = async (site: Site) => {
    const detailedSite = (await fetchSiteDetail(site.id)) ?? site;
    setForm({
      site_ref: detailedSite.site_ref, site_name: detailedSite.site_name,
      site_type_infra: detailedSite.site_type_infra, departement: detailedSite.departement,
      arrondissement: detailedSite.arrondissement ?? '', quartier: detailedSite.quartier ?? '',
      localite: detailedSite.localite ?? '',
      latitude: detailedSite.latitude != null ? String(detailedSite.latitude) : '',
      longitude: detailedSite.longitude != null ? String(detailedSite.longitude) : '',
      lieu_exact: detailedSite.lieu_exact ?? '',
      responsible_name: detailedSite.responsible_name ?? '',
      responsible_phone: detailedSite.responsible_phone ?? '',
      contact_email: detailedSite.contact_email ?? '',
      contact_phone: detailedSite.contact_phone ?? '', service_phone: detailedSite.service_phone ?? '',
      vigiles: (detailedSite.vigiles ?? []).map((vigile, i) => ({
        _key: vigile.id ?? `v-${i}-${Date.now()}`,
        first_name: vigile.first_name,
        last_name: vigile.last_name,
        personal_phone: vigile.personal_phone ?? '',
        is_active: vigile.is_active ?? true,
      })),
      status: detailedSite.status as SiteStatus,
      description: detailedSite.description ?? '', infrastructure_notes: detailedSite.infrastructure_notes ?? '',
    });
    setEditingId(site.id);
    setEquipSearch('');
    setFormStep(1);
    void fetchEquipementList(site.id);
    setDialogOpen(true);
  };

  const openPlanningDialog = async (siteId: string | 'all' = 'all') => {
    if (siteId !== 'all') {
      await fetchSiteDetail(siteId);
    }
    setPlanningSiteFilter(siteId);
    setPlanningDialogOpen(true);
  };

  const openPlanningForm = async (siteId: string | null, entry?: SiteSecurityPlanningEntry) => {
    const initialSiteId = entry?.site_id ?? siteId ?? (planningSiteFilter !== 'all' ? planningSiteFilter : '');
    if (initialSiteId) {
      await fetchSiteDetail(initialSiteId);
    }
    const defaultVigileId = initialSiteId ? (siteDetails[initialSiteId]?.vigiles?.[0]?.id ?? '') : '';
    setPlanningForm(
      entry
        ? {
            id: entry.id,
            site_id: entry.site_id,
            vigile_id: entry.vigile_id,
            shift_start: toDatetimeLocalValue(entry.shift_start),
            shift_end: toDatetimeLocalValue(entry.shift_end),
            status: entry.status,
            notes: entry.notes ?? '',
          }
        : {
            ...EMPTY_PLANNING_FORM,
            site_id: initialSiteId,
            vigile_id: defaultVigileId,
            shift_start: '',
            shift_end: '',
          }
    );
    setPlanningFormOpen(true);
  };

  const updatePlanningForm = (field: keyof PlanningFormData, value: string) => {
    setPlanningForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'site_id' ? { vigile_id: '' } : {}),
    }));
  };

  const handleSavePlanning = async () => {
    if (!planningForm.site_id || !planningForm.vigile_id || !planningForm.shift_start || !planningForm.shift_end) {
      toast.error('Site, agent, debut et fin de service sont obligatoires');
      return;
    }
    try {
      setPlanningSaving(true);
      const payload = {
        ...planningForm,
        shift_start: new Date(planningForm.shift_start).toISOString(),
        shift_end: new Date(planningForm.shift_end).toISOString(),
      };
      const res = await fetch('/api/noc/sites/security-planning', {
        method: planningForm.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erreur enregistrement planning');
      }
      toast.success(planningForm.id ? 'Planning mis a jour' : 'Planning cree avec succes');
      setPlanningFormOpen(false);
      setPlanningForm(EMPTY_PLANNING_FORM);
      await fetchPlanning();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur enregistrement planning');
    } finally {
      setPlanningSaving(false);
    }
  };

  const handleDeletePlanning = async (entry: SiteSecurityPlanningEntry) => {
    if (!confirm(`Supprimer le service de ${entry.vigile_name} ?`)) return;
    try {
      const res = await fetch(`/api/noc/sites/security-planning?id=${entry.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Service supprime');
      await fetchPlanning();
    } catch {
      toast.error('Erreur lors de la suppression du planning');
    }
  };

  const generatePlanningPdf = useCallback(async () => {
    const entries = [...planningEntries].sort((left, right) => (
      new Date(left.shift_start).getTime() - new Date(right.shift_start).getTime()
    ));
    if (entries.length === 0) {
      toast.error('Aucun planning a exporter pour cette periode');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const headerCenterX = pageWidth / 2;
    const companyTitle = 'SILICONE CONNECT';
    const logoSize = 14;
    const logoGap = 4;
    const companyFontSize = 16;
    const companyY = 16;
    const taglineY = 22;
    const reportTitleY = 32;
    const periodY = 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(companyFontSize);
    const companyTitleWidth = doc.getTextWidth(companyTitle);
    const companyTitleLeft = headerCenterX - companyTitleWidth / 2;
    const logoX = Math.max(12, companyTitleLeft - logoGap - logoSize);
    const logoY = companyY - logoSize + 4;
    const activeSite = planningSiteFilter !== 'all' ? sites.find((site) => site.id === planningSiteFilter) ?? null : null;

    try {
      const logoImg = new Image();
      logoImg.src = '/faicone_sc.png';
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        doc.addImage(logoImg, 'PNG', logoX, logoY, logoSize, logoSize);
      }
    } catch {
      // no-op
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(companyFontSize);
    doc.text(companyTitle, headerCenterX, companyY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('La confiance a tres haut debit', headerCenterX, taglineY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(
      activeSite ? `Planning securite - ${activeSite.site_name}` : 'Planning mensuel des agents de securite',
      headerCenterX,
      reportTitleY,
      { align: 'center' },
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Periode: ${formatMonthLabel(planningMonth)}`, headerCenterX, periodY, { align: 'center' });

    autoTable(doc, {
      startY: 46,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      head: [[
        'Site', 'Agent', 'Contact agent', 'Responsable site', 'Debut', 'Fin', 'Statut', 'Telephone service', 'Notes',
      ]],
      body: entries.map((entry) => ([
        `${entry.site_name} (${entry.site_ref})`,
        entry.vigile_name,
        entry.vigile_phone ?? '-',
        entry.responsible_name ? `${entry.responsible_name}${entry.responsible_phone ? ` / ${entry.responsible_phone}` : ''}` : '-',
        formatDateTimeLabel(entry.shift_start),
        formatDateTimeLabel(entry.shift_end),
        SHIFT_STATUS_LABELS[entry.status],
        entry.service_phone ?? '-',
        entry.notes ?? '-',
      ])),
    });

    doc.save(`planning_securite_${planningSiteFilter === 'all' ? 'global' : planningSiteFilter}_${planningMonth}.pdf`);
    toast.success('PDF genere', { description: 'Le planning securite a ete telecharge' });
  }, [planningEntries, planningMonth, planningSiteFilter, sites]);

  const toggleEquip = (id: string) => {
    setSelectedEquipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.site_ref.trim() || !form.site_name.trim() || !form.departement) {
      toast.error('Nom, référence et département sont obligatoires');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        latitude: form.latitude !== '' ? parseFloat(form.latitude) : null,
        longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
        vigiles: form.vigiles
          .map((vigile) => ({
            first_name: vigile.first_name.trim(),
            last_name: vigile.last_name.trim(),
            personal_phone: vigile.personal_phone.trim() || null,
            is_active: vigile.is_active,
          }))
          .filter((vigile) => vigile.first_name !== '' && vigile.last_name !== ''),
        equipement_ids: Array.from(selectedEquipIds),
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch('/api/noc/sites', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur enregistrement');
      }
      const saved: Site = await res.json();
      setSiteDetails((prev) => { const next = { ...prev }; delete next[saved.id]; return next; });
      toast.success(editingId ? 'Site mis à jour' : 'Site créé avec succès');
      setDialogOpen(false);
      await fetchSites();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le site "${name}" ?`)) return;
    try {
      const res = await fetch(`/api/noc/sites?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Site supprimé');
      await fetchSites();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredSites = sites.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.site_name.toLowerCase().includes(q) ||
      s.site_ref.toLowerCase().includes(q) ||
      s.departement.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredEquipements = allEquipements.filter((e) =>
    e.equipement_code.toLowerCase().includes(equipSearch.toLowerCase()) ||
    (e.vendor ?? '').toLowerCase().includes(equipSearch.toLowerCase()) ||
    (e.model ?? '').toLowerCase().includes(equipSearch.toLowerCase()) ||
    (e.client_name ?? '').toLowerCase().includes(equipSearch.toLowerCase())
  );

  const availablePlanningVigiles = planningForm.site_id
    ? siteDetails[planningForm.site_id]?.vigiles ?? []
    : [];

  const currentAssignments = planningEntries.filter((entry) => entry.is_active_now);
  const planningGroups = planningEntries.reduce<Record<string, { site: Site | undefined; entries: SiteSecurityPlanningEntry[] }>>((acc, entry) => {
    if (!acc[entry.site_id]) {
      acc[entry.site_id] = {
        site: sites.find((site) => site.id === entry.site_id) ?? siteDetails[entry.site_id],
        entries: [],
      };
    }
    acc[entry.site_id].entries.push(entry);
    return acc;
  }, {});
  const selectedPlanningSite = planningSiteFilter !== 'all'
    ? siteDetails[planningSiteFilter] ?? sites.find((site) => site.id === planningSiteFilter)
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestion des Sites</h2>
          <p className="text-sm text-muted-foreground">
            {sites.length} site{sites.length !== 1 ? 's' : ''} enregistré{sites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openPlanningDialog('all')} size="sm" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Planning securite
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau site
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, référence, département…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="INACTIVE">Inactif</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement…</div>
      ) : filteredSites.length === 0 ? (
        <Card className="py-12 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Aucun site trouvé</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredSites.map((site) => (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  {(() => {
                    const siteDetail = siteDetails[site.id];
                    const siteVigiles = siteDetail?.vigiles ?? [];
                    const siteEquipements = siteDetail?.equipements ?? [];

                    return (
                  <>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-base">{site.site_name}</CardTitle>
                          <Badge className={STATUS_COLORS[site.status as SiteStatus]}>
                            {STATUS_LABELS[site.status as SiteStatus]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {SITE_TYPE_LABELS[site.site_type_infra as SiteTypeInfra]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{site.site_ref}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {site.departement}
                            {site.arrondissement && ` · ${site.arrondissement}`}
                            {site.quartier && ` · ${site.quartier}`}
                            {site.localite && ` · ${site.localite}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Server className="w-3 h-3" />
                            {site.equipment_count ?? 0} équipement{(site.equipment_count ?? 0) !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {site.vigiles_count ?? 0} vigile{(site.vigiles_count ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {(site.contact_email || site.contact_phone || site.service_phone) && (
                          <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-muted-foreground">
                            {site.contact_email && (
                              <a href={`mailto:${site.contact_email}`} className="flex items-center gap-1 hover:underline text-blue-600">
                                <Mail className="w-3 h-3" />{site.contact_email}
                              </a>
                            )}
                            {site.contact_phone && (
                              <a href={`tel:${site.contact_phone}`} className="flex items-center gap-1 hover:underline text-blue-600">
                                <Phone className="w-3 h-3" />{site.contact_phone}
                              </a>
                            )}
                            {site.service_phone && (
                              <a href={`tel:${site.service_phone}`} className="flex items-center gap-1 hover:underline text-blue-600">
                                <Phone className="w-3 h-3" />Service: {site.service_phone}
                              </a>
                            )}
                          </div>
                        )}
                        {(site.responsible_name || site.responsible_phone) && (
                          <div className="mt-2 rounded-md border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <p className="font-medium flex items-center gap-2">
                              <UserRound className="w-4 h-4" />
                              Responsable site: {site.responsible_name ?? 'Non renseigne'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {site.responsible_phone ? `Telephone: ${site.responsible_phone}` : 'Telephone non renseigne'}
                            </p>
                          </div>
                        )}
                        {(site.latitude != null && site.longitude != null) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Network className="w-3 h-3" />
                            {site.latitude}, {site.longitude}
                            {site.lieu_exact && ` — ${site.lieu_exact}`}
                          </p>
                        )}
                        {site.description && (
                          <p className="text-sm text-muted-foreground mt-1">{site.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir les équipements"
                          onClick={() => {
                            if (expandedSite === site.id) { setExpandedSite(null); }
                            else { setExpandedSite(site.id); void fetchSiteDetail(site.id); }
                          }}>
                          {expandedSite === site.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(site)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPlanningDialog(site.id)}>
                          <CalendarDays className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(site.id, site.site_name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded equipment list */}
                  <AnimatePresence>
                    {expandedSite === site.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 border-t space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                              Équipements liés ({siteEquipements.length})
                            </p>
                            {!siteDetail ? (
                              <p className="text-xs text-muted-foreground">Chargement…</p>
                            ) : siteEquipements.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun équipement lié à ce site</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {siteEquipements.map((eq) => (
                                  <div key={eq.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                                    <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-mono text-xs font-medium truncate">{eq.equipement_code}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {eq.equipement_type}{eq.vendor ? ` · ${eq.vendor}` : ''}{eq.model ? ` ${eq.model}` : ''}
                                      </p>
                                    </div>
                                    <Badge className={`text-xs ${EQUIP_STATUS_COLORS[eq.status] ?? ''}`}>{eq.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                              Vigiles du site ({siteVigiles.length})
                            </p>
                            {!siteDetail ? (
                              <p className="text-xs text-muted-foreground">Chargement…</p>
                            ) : siteVigiles.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun vigile renseigné pour ce site</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {siteVigiles.map((vigile) => (
                                  <div key={vigile.id ?? vigile.full_name} className="rounded-md bg-muted/50 p-2 text-sm">
                                    <p className="font-medium truncate">{vigile.full_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {vigile.personal_phone ? `Perso: ${vigile.personal_phone}` : 'Numéro personnel non renseigné'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </>
                    );
                  })()}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════ Dialog Create / Edit ═══════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="w-[92vw] max-w-5xl max-h-[94vh] min-w-[56vw] min-h-[60vh] resize overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le site' : 'Nouveau site'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Mettez à jour les informations du site' : 'Renseignez les informations du nouveau site'}
            </DialogDescription>
            <div className="flex gap-1 mt-3">
              {([1, 2, 3] as const).map((s) => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    formStep === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setFormStep(s)}>
                  {s === 1
                    ? '1. Informations'
                    : s === 2
                      ? `2. Équipements (${selectedEquipIds.size})`
                      : `3. Responsable / Vigiles (${form.vigiles.length})`}
                </button>
              ))}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-1">
            {/* ── STEP 1 : Informations ── */}
            {formStep === 1 && (
              <div className="space-y-4 py-2 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="site_name">Nom du site <span className="text-red-500">*</span></Label>
                    <Input id="site_name" placeholder="Ex : Site Backbone Pointe-Noire"
                      value={form.site_name} onChange={(e) => set('site_name', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="site_ref">Référence <span className="text-red-500">*</span></Label>
                    <Input id="site_ref" placeholder="Ex : SITE-PN-001"
                      value={form.site_ref} onChange={(e) => set('site_ref', e.target.value.toUpperCase())} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type de site</Label>
                    <Select value={form.site_type_infra} onValueChange={(v) => set('site_type_infra', v as SiteTypeInfra)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIF">Actif</SelectItem>
                        <SelectItem value="PASSIF">Passif</SelectItem>
                        <SelectItem value="PASSIF_ET_ACTIF">Passif et Actif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => set('status', v as SiteStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Actif</SelectItem>
                        <SelectItem value="INACTIVE">Inactif</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Département <span className="text-red-500">*</span></Label>
                  <Select value={form.departement} onValueChange={(v) => set('departement', v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un département…" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>— Backbone Nord —</SelectLabel>
                        {DEPARTEMENTS_BACKBONE_NORD.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>— Backbone Sud —</SelectLabel>
                        {DEPARTEMENTS_BACKBONE_SUD.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="arrondissement">Arrondissement</Label>
                    <Input id="arrondissement" placeholder="Ex : 6e arrondissement"
                      value={form.arrondissement} onChange={(e) => set('arrondissement', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quartier">Quartier</Label>
                    <Input id="quartier" placeholder="Ex : Bacongo"
                      value={form.quartier} onChange={(e) => set('quartier', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="localite">Localité</Label>
                  <Input id="localite" placeholder="Ex : Brazzaville"
                    value={form.localite} onChange={(e) => set('localite', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Network className="w-3.5 h-3.5" /> Coordonnées géographiques
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude  Ex : -4.2634" value={form.latitude}
                      onChange={(e) => set('latitude', e.target.value)} />
                    <Input placeholder="Longitude  Ex : 15.2429" value={form.longitude}
                      onChange={(e) => set('longitude', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lieu_exact">Lieu exact (description d'accès)</Label>
                  <Textarea id="lieu_exact" placeholder="Bâtiment, étage, route d'accès, point de repère…"
                    value={form.lieu_exact} onChange={(e) => set('lieu_exact', e.target.value)}
                    rows={2} className="resize-none" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Description générale du site…"
                    value={form.description} onChange={(e) => set('description', e.target.value)}
                    rows={3} className="resize-none" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="infrastructure_notes">Notes d'infrastructure</Label>
                  <Textarea id="infrastructure_notes" placeholder="Capacité, alimentation, redondance, accès technique…"
                    value={form.infrastructure_notes} onChange={(e) => set('infrastructure_notes', e.target.value)}
                    rows={3} className="resize-none" />
                </div>
              </div>
            )}

            {/* ── STEP 2 : Équipements ── */}
            {formStep === 2 && (
              <div className="space-y-3 py-2 px-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez les équipements présents sur ce site.
                  </p>
                  <Badge variant="secondary">
                    {selectedEquipIds.size} sélectionné{selectedEquipIds.size !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Filtrer par code, modèle, client…" value={equipSearch}
                    onChange={(e) => setEquipSearch(e.target.value)} className="pl-9" />
                </div>

                {loadingEquip ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Chargement des équipements…</p>
                ) : filteredEquipements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Aucun équipement disponible</p>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {filteredEquipements.map((eq) => (
                      <label key={eq.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedEquipIds.has(eq.id)}
                          onCheckedChange={() => toggleEquip(eq.id)} />
                        <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-medium truncate">{eq.equipement_code}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {eq.equipement_type}{eq.vendor ? ` · ${eq.vendor}` : ''}{eq.model ? ` ${eq.model}` : ''}
                            {eq.client_name ? ` — Client : ${eq.client_name}` : ''}
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 ${EQUIP_STATUS_COLORS[eq.status] ?? ''}`}>
                          {eq.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Les équipements sélectionnés seront liés à ce site en base de données.
                </p>
              </div>
            )}

            {/* ── STEP 3 : Responsable / Vigiles ── */}
            {formStep === 3 && (
              <div className="space-y-4 py-2 px-1">
                <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sky-100 p-2 text-sky-700">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Responsable du site et sécurité</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Référencez d'abord le contact du site, puis ajoutez les agents de sécurité qui pourront être planifiés mensuellement.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="responsible_name">Responsable du site</Label>
                    <Input
                      id="responsible_name"
                      placeholder="Ex : M. Mavoungou"
                      value={form.responsible_name}
                      onChange={(e) => set('responsible_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="responsible_phone">Téléphone du responsable</Label>
                    <Input
                      id="responsible_phone"
                      type="tel"
                      placeholder="+242…"
                      value={form.responsible_phone}
                      onChange={(e) => set('responsible_phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contact_email">Email de contact</Label>
                    <Input id="contact_email" type="email" placeholder="contact@example.com"
                      value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contact_phone">Téléphone du contact site</Label>
                    <Input id="contact_phone" type="tel" placeholder="+242…"
                      value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="service_phone">Téléphone de service du site</Label>
                  <Input id="service_phone" type="tel" placeholder="+242…"
                    value={form.service_phone} onChange={(e) => set('service_phone', e.target.value)} />
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Agents de sécurité du site</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Plusieurs agents peuvent être affectés à un même site. Le planning mensuel s'appuiera sur cette liste.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addVigile}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {form.vigiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun agent de sécurité renseigné.</p>
                  ) : (
                    <div className="space-y-3">
                      {form.vigiles.map((vigile, index) => (
                        <div key={vigile._key} className="rounded-lg border bg-slate-50/80 p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                            <div className="space-y-1">
                              <Label htmlFor={`vigile-first-name-${index}`}>Prénom</Label>
                              <Input
                                id={`vigile-first-name-${index}`}
                                placeholder="Ex : Christian"
                                value={vigile.first_name}
                                onChange={(e) => updateVigile(index, 'first_name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`vigile-last-name-${index}`}>Nom</Label>
                              <Input
                                id={`vigile-last-name-${index}`}
                                placeholder="Ex : Ndziou"
                                value={vigile.last_name}
                                onChange={(e) => updateVigile(index, 'last_name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`vigile-phone-${index}`}>Contact personnel</Label>
                              <Input
                                id={`vigile-phone-${index}`}
                                placeholder="+242…"
                                value={vigile.personal_phone}
                                onChange={(e) => updateVigile(index, 'personal_phone', e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-600 hover:text-red-700"
                              onClick={() => removeVigile(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="shrink-0 gap-2 mt-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            {formStep === 1 ? (
              <Button onClick={() => setFormStep(2)} className="gap-2">
                Suivant — Équipements <ChevronDown className="w-4 h-4 -rotate-90" />
              </Button>
            ) : formStep === 2 ? (
              <>
                <Button variant="outline" onClick={() => setFormStep(1)}>Retour</Button>
                <Button onClick={() => setFormStep(3)} className="gap-2">
                  Suivant — Responsable / Vigiles <ChevronDown className="w-4 h-4 -rotate-90" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setFormStep(2)}>Retour</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? 'Enregistrement…' : (
                    <><Check className="w-4 h-4" />{editingId ? 'Mettre à jour' : 'Créer le site'}</>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planningDialogOpen} onOpenChange={setPlanningDialogOpen}>
        <DialogContent className="w-[98vw] h-[96vh] max-w-[99vw] max-h-[97vh] min-w-[72vw] min-h-[70vh] resize overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Planning mensuel des agents de sécurité
            </DialogTitle>
            <DialogDescription>
              Gérez les prises de poste, les relais entre agents et exportez le planning Silicone Connect en PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 via-white to-sky-50 p-4 md:grid-cols-[1.2fr_0.8fr_auto_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="planning-site-filter">Site</Label>
              <Select value={planningSiteFilter} onValueChange={setPlanningSiteFilter}>
                <SelectTrigger id="planning-site-filter">
                  <SelectValue placeholder="Tous les sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.site_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="planning-month">Mois</Label>
              <Input id="planning-month" type="month" value={planningMonth} onChange={(e) => setPlanningMonth(e.target.value)} />
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={() => openPlanningForm(selectedPlanningSite?.id ?? null)}>
              <Plus className="w-4 h-4" /> Nouveau service
            </Button>
            <Button type="button" className="gap-2" onClick={generatePlanningPdf}>
              <FileDown className="w-4 h-4" /> Générer PDF
            </Button>
          </div>

          <Tabs defaultValue="overview" className="flex-1 min-h-0 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Vue premium</TabsTrigger>
              <TabsTrigger value="timeline">Chronologie</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="border-sky-200 bg-sky-50/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Agents en poste maintenant</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currentAssignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucun agent actuellement planifié sur cette sélection.</p>
                        ) : (
                          <div className="space-y-2">
                            {currentAssignments.map((entry) => (
                              <div key={entry.id} className="rounded-lg bg-white p-3 shadow-sm">
                                <p className="font-medium">{entry.vigile_name}</p>
                                <p className="text-xs text-muted-foreground">{entry.site_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDateTimeLabel(entry.shift_start)} → {formatDateTimeLabel(entry.shift_end)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white/90 lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Résumé opérationnel</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mois suivi</p>
                          <p className="mt-2 font-semibold">{formatMonthLabel(planningMonth)}</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Services planifiés</p>
                          <p className="mt-2 font-semibold">{planningEntries.length}</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Périmètre</p>
                          <p className="mt-2 font-semibold">{selectedPlanningSite?.site_name ?? 'Tous les sites'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {planningLoading ? (
                    <div className="py-10 text-center text-muted-foreground">Chargement du planning…</div>
                  ) : Object.keys(planningGroups).length === 0 ? (
                    <Card className="py-12 text-center">
                      <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
                      <p className="text-muted-foreground">Aucun planning enregistré pour cette période.</p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(planningGroups).map(([siteId, group]) => (
                        <Card key={siteId} className="overflow-hidden">
                          <CardHeader className="border-b bg-slate-50/80 pb-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <CardTitle className="text-base">{group.site?.site_name ?? group.entries[0]?.site_name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {group.site?.responsible_name ? `Responsable: ${group.site.responsible_name}` : 'Responsable non renseigné'}
                                  {group.site?.service_phone ? ` · Service: ${group.site.service_phone}` : ''}
                                </p>
                              </div>
                              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openPlanningForm(siteId)}>
                                <Plus className="w-4 h-4" /> Ajouter un service
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {group.entries.map((entry, index) => {
                                const previous = group.entries[index - 1];
                                const next = group.entries[index + 1];
                                return (
                                  <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl border bg-white p-4 shadow-sm"
                                  >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-semibold">{entry.vigile_name}</p>
                                          <Badge className={SHIFT_STATUS_COLORS[entry.status]}>{SHIFT_STATUS_LABELS[entry.status]}</Badge>
                                          {entry.is_active_now && <Badge className="bg-emerald-600 text-white">En cours</Badge>}
                                        </div>
                                        <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                                          <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {formatDateTimeLabel(entry.shift_start)} → {formatDateTimeLabel(entry.shift_end)}</p>
                                          <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {entry.vigile_phone ?? 'Contact agent non renseigné'}</p>
                                          <p>Avant: {previous ? previous.vigile_name : 'Début de séquence'}</p>
                                          <p>Après: {next ? next.vigile_name : 'Fin de séquence'}</p>
                                        </div>
                                        {entry.notes && <p className="text-sm text-slate-600">{entry.notes}</p>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => openPlanningForm(siteId, entry)}>
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeletePlanning(entry)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-3">
                  {planningLoading ? (
                    <div className="py-10 text-center text-muted-foreground">Chargement…</div>
                  ) : planningEntries.length === 0 ? (
                    <Card className="py-12 text-center">
                      <p className="text-muted-foreground">Aucune ligne de planning.</p>
                    </Card>
                  ) : (
                    planningEntries.map((entry) => (
                      <div key={entry.id} className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-[220px_1fr_auto] md:items-center">
                        <div>
                          <p className="text-sm font-semibold">{entry.site_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.site_ref}</p>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{entry.vigile_name}</p>
                            <Badge className={SHIFT_STATUS_COLORS[entry.status]}>{SHIFT_STATUS_LABELS[entry.status]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDateTimeLabel(entry.shift_start)} → {formatDateTimeLabel(entry.shift_end)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => openPlanningForm(entry.site_id, entry)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeletePlanning(entry)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={planningFormOpen} onOpenChange={(open) => { if (!planningSaving) setPlanningFormOpen(open); }}>
        <DialogContent className="w-[92vw] max-w-5xl max-h-[92vh] min-w-[56vw] min-h-[58vh] resize overflow-hidden">
          <DialogHeader>
            <DialogTitle>{planningForm.id ? 'Modifier un service' : 'Nouveau service de sécurité'}</DialogTitle>
            <DialogDescription>
              Définissez qui travaille, quand le service commence, quand il se termine et les informations de relève.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="planning-site">Site</Label>
                <Select value={planningForm.site_id} onValueChange={(value) => updatePlanningForm('site_id', value)}>
                  <SelectTrigger id="planning-site">
                    <SelectValue placeholder="Sélectionner un site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.site_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="planning-vigile">Agent de sécurité</Label>
                <Select value={planningForm.vigile_id} onValueChange={(value) => updatePlanningForm('vigile_id', value)}>
                  <SelectTrigger id="planning-vigile">
                    <SelectValue placeholder="Sélectionner un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlanningVigiles.map((vigile) => (
                      <SelectItem key={vigile.id} value={vigile.id ?? ''}>{vigile.full_name ?? `${vigile.first_name} ${vigile.last_name}`.trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="planning-start">Début de service</Label>
                <Input id="planning-start" type="datetime-local" value={planningForm.shift_start} onChange={(e) => updatePlanningForm('shift_start', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="planning-end">Fin de service</Label>
                <Input id="planning-end" type="datetime-local" value={planningForm.shift_end} onChange={(e) => updatePlanningForm('shift_end', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="planning-status">Statut</Label>
                <Select value={planningForm.status} onValueChange={(value) => updatePlanningForm('status', value)}>
                  <SelectTrigger id="planning-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Informations de site</Label>
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
                  {planningForm.site_id && siteDetails[planningForm.site_id]
                    ? `${siteDetails[planningForm.site_id]?.responsible_name ?? 'Responsable non renseigné'}${siteDetails[planningForm.site_id]?.service_phone ? ` · Service ${siteDetails[planningForm.site_id]?.service_phone}` : ''}`
                    : 'Sélectionnez un site pour charger ses contacts'}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="planning-notes">Notes / consignes</Label>
              <Textarea id="planning-notes" rows={4} className="resize-none" placeholder="Passation, consignes, remplacement, anomalies à surveiller…" value={planningForm.notes} onChange={(e) => updatePlanningForm('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPlanningFormOpen(false)} disabled={planningSaving}>Annuler</Button>
            <Button onClick={handleSavePlanning} disabled={planningSaving} className="gap-2">
              {planningSaving ? 'Enregistrement…' : <><Check className="w-4 h-4" />{planningForm.id ? 'Mettre à jour' : 'Créer le service'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}