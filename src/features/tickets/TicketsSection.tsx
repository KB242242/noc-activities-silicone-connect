'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle, AlertTriangle, Archive, ArchiveRestore, CheckCircle2, ClipboardList, Edit, Eye, MoreHorizontal,
  File, Inbox, LayoutDashboard, Lock, MapPin, Pin, Plus, RefreshCw,
  Search, Send, Trash2, Upload, User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
  FloatingDialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
  TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, TICKET_COUNTRIES,
  DEFAULT_LOCALITY_DRAFT, SITES_LIST, LOCALITES_LIST,
} from './constants';
import { mapApiTicketToLegacy, mapLegacyTicketStatusToApi, mapLegacyTicketPriorityToApi, mapLegacyTicketCategoryToApiType } from './mappers';
import type {
  TicketItem, TicketStatus, TicketPriority, TicketCategory,
  TicketOptionItem, TicketLocalityDraft, TicketDialogResizeDirection, UserBasic,
} from './types';

// ─── Toast helper ─────────────────────────────────────────────────────────────

const toast = {
  success: (msg: string, opts?: Record<string, unknown>) =>
    sonnerToast.success(msg, { id: `ok-${Date.now()}`, ...opts }),
  error: (msg: string, opts?: Record<string, unknown>) =>
    sonnerToast.error(msg, { id: `err-${Date.now()}`, ...opts }),
};

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
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
  sendCopyToClient: false,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketsSectionProps {
  user: { id: string; name: string } | null | undefined;
  usersDirectory: UserBasic[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TicketsSection({ user, usersDirectory }: TicketsSectionProps) {

  // ── Data state ──────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [siteOptions, setSiteOptions] = useState<TicketOptionItem[]>(
    SITES_LIST.map((name, i) => ({ id: `fallback-site-${i + 1}`, name }))
  );
  const [localityOptions, setLocalityOptions] = useState<string[]>(LOCALITES_LIST);

  const technicianOptions = useMemo(
    () => usersDirectory
      .filter((u) => u.isActive && (u.role === 'TECHNICIEN' || u.role === 'TECHNICIEN_NO'))
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [usersDirectory]
  );

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [showTrash, setShowTrash] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [localiteFilter, setLocaliteFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');

  // ── Selected / detail ────────────────────────────────────────────────────────
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [privateComment, setPrivateComment] = useState(false);

  // ── Edit dialog ──────────────────────────────────────────────────────────────
  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocalityDraft, setEditLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_LOCALITY_DRAFT);
  const [editLocalityEnabled, setEditLocalityEnabled] = useState(false);
  const [isEditCreatingLocality, setIsEditCreatingLocality] = useState(false);

  // ── Create dialog ────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const openTicketDetailPage = useCallback((ticketId: string) => {
    const ticket = tickets.find((entry) => entry.id === ticketId);
    if (!ticket) return;
    setSelectedTicket(ticket);
    setDetailOpen(true);
  }, [tickets]);

  const prefetchTicketDetail = useCallback((ticketId: string) => {
    void ticketId;
  }, []);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [localityDraft, setLocalityDraft] = useState<TicketLocalityDraft>(DEFAULT_LOCALITY_DRAFT);
  const [localityEnabled, setLocalityEnabled] = useState(false);
  const [isCreatingLocality, setIsCreatingLocality] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSiteFilter('all');
    setLocaliteFilter('all');
    setTechFilter('all');
  }, []);

  // ── Create dialog drag/resize ─────────────────────────────────────────────────
  const [dialogPos, setDialogPos] = useState({ x: 48, y: 72 });
  const [dialogSize, setDialogSize] = useState({ width: 900, height: 750 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<TicketDialogResizeDirection | null>(null);
  const ptrRef = useRef({ dragOffX: 0, dragOffY: 0, sx: 0, sy: 0, sl: 0, st: 0, sw: 0, sh: 0 });

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const normalizeLocality = useCallback((v: string) => v.trim().replace(/\s+/g, ' '), []);

  const upsertLocality = useCallback((name: string) => {
    const n = normalizeLocality(name);
    if (!n) return;
    setLocalityOptions((prev) => {
      if (prev.some((p) => p.toLowerCase() === n.toLowerCase())) return prev;
      return [...prev, n].sort((a, b) => a.localeCompare(b, 'fr'));
    });
  }, [normalizeLocality]);

  const splitValues = useCallback((v?: string) => {
    if (!v) return [] as string[];
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }, []);

  const resolveSites = useCallback((v?: string) => {
    const names = splitValues(v);
    return siteOptions.filter((s) => names.includes(s.name));
  }, [splitValues, siteOptions]);

  const resolveTechnicians = useCallback((v?: string) => {
    const names = splitValues(v);
    return technicianOptions.filter((t) => names.includes(t.name));
  }, [splitValues, technicianOptions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [activeRes, trashRes, sitesRes, locRes] = await Promise.all([
        fetch('/api/tickets/list?trash=false', { cache: 'no-store' }),
        fetch('/api/tickets/list?trash=true', { cache: 'no-store' }),
        fetch('/api/tickets/sites', { cache: 'no-store' }),
        fetch('/api/tickets/localities', { cache: 'no-store' }),
      ]);

      if (activeRes.ok && trashRes.ok) {
        const [active, trash] = await Promise.all([activeRes.json(), trashRes.json()]);
        const merged = [
          ...(Array.isArray(active) ? active : []),
          ...(Array.isArray(trash) ? trash : []),
        ]
          .map(mapApiTicketToLegacy)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTickets(merged);
      }

      const allLocalities = new Set<string>();

      if (sitesRes.ok) {
        const sitesData = await sitesRes.json();
        if (Array.isArray(sitesData) && sitesData.length > 0) {
          const normalized = sitesData
            .map((s: { id?: string; name?: string; localite?: string | null }) => ({
              id: String(s.id ?? s.name ?? ''),
              name: String(s.name ?? '').trim(),
              localite: s.localite ?? null,
            }))
            .filter((s: TicketOptionItem) => s.id && s.name);
          setSiteOptions(normalized);
          normalized.forEach((s) => {
            if (s.localite) {
              s.localite.split(',').map((p: string) => normalizeLocality(p)).filter(Boolean).forEach((p: string) => allLocalities.add(p));
            }
          });
        }
      }

      if (locRes.ok) {
        const locData = await locRes.json();
        if (Array.isArray(locData)) {
          locData.forEach((l: string | { name?: string; value?: string; label?: string }) => {
            const n = typeof l === 'string' ? normalizeLocality(l) : normalizeLocality(String(l.name ?? l.value ?? l.label ?? ''));
            if (n) allLocalities.add(n);
          });
        }
      }

      if (allLocalities.size > 0) {
        setLocalityOptions(Array.from(allLocalities).sort((a, b) => a.localeCompare(b, 'fr')));
      }
    } catch (err) {
      console.error('[TicketsSection] loadData', err);
    }
  }, [normalizeLocality]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (!editOpen) return;
    setEditLocalityDraft((prev) => ({ ...prev, freeText: editingTicket?.localite ?? '' }));
  }, [editOpen, editingTicket?.localite]);

  useEffect(() => {
    const requestedView = String(searchParams.get('ticketsView') ?? '').toLowerCase();
    if (requestedView === 'archive') {
      setShowArchive(true);
      setShowTrash(false);
      return;
    }
    if (requestedView === 'trash') {
      setShowTrash(true);
      setShowArchive(false);
      return;
    }
    if (requestedView === 'active') {
      setShowTrash(false);
      setShowArchive(false);
    }
  }, [searchParams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Create dialog positioning
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!createOpen || typeof window === 'undefined') return;
    const vp = 16;
    const maxW = Math.max(460, window.innerWidth - vp * 2);
    const maxH = Math.max(360, window.innerHeight - vp * 2);
    const w = clamp(dialogSize.width, 460, maxW);
    const h = clamp(dialogSize.height, 360, maxH);
    setDialogSize({ width: w, height: h });
    setDialogPos({
      x: clamp(Math.round((window.innerWidth - w) / 2), vp, maxW),
      y: clamp(Math.round((window.innerHeight - h) / 2), vp, maxH),
    });
  }, [createOpen]);

  useEffect(() => {
    if (!isDragging && !resizeDir) return;
    const vp = 16; const minW = 460; const minH = 360;

    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        const maxX = Math.max(vp, window.innerWidth - vp - dialogSize.width);
        const maxY = Math.max(vp, window.innerHeight - vp - dialogSize.height);
        setDialogPos({
          x: clamp(e.clientX - ptrRef.current.dragOffX, vp, maxX),
          y: clamp(e.clientY - ptrRef.current.dragOffY, vp, maxY),
        });
        return;
      }
      if (!resizeDir) return;
      const maxW = Math.max(minW, window.innerWidth - vp * 2);
      const maxH = Math.max(minH, window.innerHeight - vp * 2);
      const dx = e.clientX - ptrRef.current.sx; const dy = e.clientY - ptrRef.current.sy;
      let nw = ptrRef.current.sw; let nh = ptrRef.current.sh;
      let nl = ptrRef.current.sl; let nt = ptrRef.current.st;
      if (resizeDir.includes('e')) nw = clamp(ptrRef.current.sw + dx, minW, maxW);
      if (resizeDir.includes('s')) nh = clamp(ptrRef.current.sh + dy, minH, maxH);
      if (resizeDir.includes('w')) { nw = clamp(ptrRef.current.sw - dx, minW, maxW); nl = ptrRef.current.sl + (ptrRef.current.sw - nw); }
      if (resizeDir.includes('n')) { nh = clamp(ptrRef.current.sh - dy, minH, maxH); nt = ptrRef.current.st + (ptrRef.current.sh - nh); }
      nl = clamp(nl, vp, Math.max(vp, window.innerWidth - vp - nw));
      nt = clamp(nt, vp, Math.max(vp, window.innerHeight - vp - nh));
      setDialogSize({ width: nw, height: nh });
      setDialogPos({ x: nl, y: nt });
    };

    const onUp = () => { setIsDragging(false); setResizeDir(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, resizeDir, dialogSize.width, dialogSize.height]);

  const startDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    ptrRef.current.dragOffX = e.clientX - dialogPos.x;
    ptrRef.current.dragOffY = e.clientY - dialogPos.y;
    setIsDragging(true);
  }, [dialogPos.x, dialogPos.y]);

  const startResize = useCallback((dir: TicketDialogResizeDirection, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    ptrRef.current = { ...ptrRef.current, sx: e.clientX, sy: e.clientY, sl: dialogPos.x, st: dialogPos.y, sw: dialogSize.width, sh: dialogSize.height };
    setResizeDir(dir);
  }, [dialogPos.x, dialogPos.y, dialogSize.width, dialogSize.height]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Locality creation
  // ─────────────────────────────────────────────────────────────────────────────

  const createLocality = useCallback(async (draft: TicketLocalityDraft, target: 'create' | 'edit') => {
    const freeText = normalizeLocality(draft.freeText);
    const hasData = freeText || draft.city || draft.arrondissement || draft.quartier || draft.address || draft.latitude || draft.longitude;
    if (!hasData) { toast.error('Veuillez renseigner une localité'); return; }

    const setter = target === 'create' ? setIsCreatingLocality : setIsEditCreatingLocality;
    setter(true);
    try {
      const res = await fetch('/api/tickets/localities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: freeText, ...draft }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      const name = normalizeLocality(String(created?.name ?? created?.label ?? created?.value ?? freeText));
      if (!name) throw new Error();
      upsertLocality(name);
      if (target === 'create') {
        setForm((p) => ({ ...p, localite: name }));
        setLocalityDraft((p) => ({ ...DEFAULT_LOCALITY_DRAFT, countryCode: p.countryCode, countryName: p.countryName }));
      } else {
        setEditingTicket((p) => p ? { ...p, localite: name } : p);
        setEditLocalityDraft((p) => ({ ...DEFAULT_LOCALITY_DRAFT, countryCode: p.countryCode, countryName: p.countryName }));
      }
      toast.success('Localité enregistrée', { description: name });
    } catch {
      toast.error("Impossible d'enregistrer la localité");
    } finally {
      setter(false);
    }
  }, [normalizeLocality, upsertLocality]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Create ticket
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!form.objet.trim()) { toast.error('L\'objet du ticket est requis'); return; }
    setIsSubmitting(true);
    try {
      const selectedSites = resolveSites(form.site);
      const selectedTechs = resolveTechnicians(form.technicien);
      const res = await fetch('/api/tickets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mapLegacyTicketCategoryToApiType(form.category),
          objet: form.objet,
          description: form.description,
          priority: mapLegacyTicketPriorityToApi(form.priority),
          status: 'OPEN',
          siteIds: selectedSites.map((s) => s.id),
          localities: splitValues(form.localite),
          technicianIds: selectedTechs.map((t) => t.id),
          creatorId: user?.id,
          creatorName: user?.name,
          dueDate: form.dueDate?.toISOString() ?? null,
          etr: form.etr?.toISOString() ?? null,
          sla: form.sla, slr: form.slr,
          sendCopyToClient: form.sendCopyToClient,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 || err?.error === 'technician_capacity_exceeded') {
          toast.error(err?.message ?? 'Un technicien a deja 3 tickets actifs cette semaine.');
          return;
        }
        throw new Error();
      }
      const created = mapApiTicketToLegacy(await res.json());
      setTickets((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      setForm(DEFAULT_FORM);
      setLocalityDraft(DEFAULT_LOCALITY_DRAFT);
      setLocalityEnabled(false);
      setCreateOpen(false);
      await loadData();
      toast.success('Ticket créé', { description: `Ticket ${created.numero} créé` });
    } catch {
      toast.error('Impossible de créer le ticket');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, resolveSites, resolveTechnicians, splitValues, user, loadData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit ticket
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSaveEdit = useCallback(async () => {
    if (!editingTicket) return;
    try {
      const selectedSites = resolveSites(editingTicket.site);
      const selectedTechs = resolveTechnicians(editingTicket.technicien);
      const res = await fetch(`/api/tickets/${editingTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objet: editingTicket.objet,
          description: editingTicket.description,
          status: mapLegacyTicketStatusToApi(editingTicket.status),
          priority: mapLegacyTicketPriorityToApi(editingTicket.priority),
          siteIds: selectedSites.map((s) => s.id),
          siteNames: selectedSites.map((s) => s.name),
          localities: splitValues(editingTicket.localite),
          technicianIds: selectedTechs.map((t) => t.id),
          technicianNames: selectedTechs.map((t) => ({ id: t.id, name: t.name })),
          updatedBy: user?.name,
          updatedById: user?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 || err?.error === 'technician_capacity_exceeded') {
          toast.error(err?.message ?? 'Un technicien a deja 3 tickets actifs cette semaine.');
          return;
        }
        throw new Error();
      }
      const updated = mapApiTicketToLegacy(await res.json());
      setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      setSelectedTicket((prev) => prev?.id === updated.id ? updated : prev);
      setEditOpen(false);
      toast.success('Ticket modifié');
    } catch {
      toast.error('Impossible de modifier le ticket');
    }
  }, [editingTicket, resolveSites, resolveTechnicians, splitValues, user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete ticket
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (ticket: TicketItem, permanent = false) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permanent, deletedBy: user?.name }),
      });
      if (!res.ok) throw new Error();
      await loadData();
      if (selectedTicket?.id === ticket.id) { setSelectedTicket(null); setDetailOpen(false); }
      toast.success(permanent ? 'Ticket supprimé définitivement' : 'Ticket déplacé dans la corbeille');
    } catch {
      toast.error('Impossible de supprimer le ticket');
    }
  }, [loadData, selectedTicket?.id, user?.name]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Update status
  // ─────────────────────────────────────────────────────────────────────────────

  const handleUpdateStatus = useCallback(async (ticket: TicketItem, status: TicketStatus) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: mapLegacyTicketStatusToApi(status), updatedBy: user?.name, updatedById: user?.id }),
      });
      if (!res.ok) throw new Error();
      const updated = mapApiTicketToLegacy(await res.json());
      setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      setSelectedTicket(updated);
      toast.success(status === 'resolved' ? 'Ticket résolu' : 'Ticket fermé');
    } catch {
      toast.error('Impossible de mettre à jour le ticket');
    }
  }, [user?.id, user?.name]);

  const isTicketArchived = useCallback((ticket: TicketItem) => {
    if (ticket.isArchived) return true;
    if (ticket.status !== 'closed' || !ticket.closedAt) return false;
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const closedAt = new Date(ticket.closedAt);
    if (Number.isNaN(closedAt.getTime())) return false;
    // Regle metier: auto-archive apres 1 an OU au passage d'annee (1er janvier).
    return closedAt <= oneYearAgo || closedAt.getFullYear() < now.getFullYear();
  }, []);

  const resolveArchiveYear = useCallback((ticket: TicketItem) => {
    if (ticket.archiveYear && Number.isFinite(ticket.archiveYear)) return ticket.archiveYear;
    if (ticket.archivedAt) return new Date(ticket.archivedAt).getFullYear();
    if (ticket.closedAt) return new Date(ticket.closedAt).getFullYear();
    return ticket.createdAt.getFullYear();
  }, []);

  const handleArchiveTicket = useCallback(async (ticket: TicketItem) => {
    try {
      const archivedAt = new Date();
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          isArchived: true,
          archivedAt: archivedAt.toISOString(),
          archivedYear: archivedAt.getFullYear(),
          updatedBy: user?.name,
          updatedById: user?.id,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = mapApiTicketToLegacy(await res.json());
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success('Ticket archivé');
    } catch {
      toast.error('Impossible d\'archiver le ticket');
    }
  }, [user?.id, user?.name]);

  const handleUnarchiveTicket = useCallback(async (ticket: TicketItem) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isArchived: false,
          archivedAt: null,
          archivedYear: null,
          updatedBy: user?.name,
          updatedById: user?.id,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = mapApiTicketToLegacy(await res.json());
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success('Ticket désarchivé');
    } catch {
      toast.error('Impossible de désarchiver le ticket');
    }
  }, [user?.id, user?.name]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered tickets
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredTickets = useMemo(() => tickets.filter((t) => {
    const archived = isTicketArchived(t);
    if (showTrash) {
      if (!t.isDeleted) return false;
    } else if (showArchive) {
      if (t.isDeleted || !archived) return false;
    } else {
      if (t.isDeleted || archived) return false;
    }
    if (searchQuery && !t.objet.toLowerCase().includes(searchQuery.toLowerCase()) && !t.numero.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (siteFilter !== 'all' && t.site !== siteFilter) return false;
    if (localiteFilter !== 'all' && t.localite !== localiteFilter) return false;
    if (techFilter !== 'all' && t.technicien !== techFilter) return false;
    return true;
  }), [tickets, showTrash, showArchive, isTicketArchived, searchQuery, statusFilter, priorityFilter, siteFilter, localiteFilter, techFilter]);

  const archivedByYear = useMemo(() => {
    if (!showArchive) return [] as Array<{ year: number; items: TicketItem[] }>;
    const grouped = new Map<number, TicketItem[]>();
    filteredTickets.forEach((ticket) => {
      const year = resolveArchiveYear(ticket);
      const current = grouped.get(year) ?? [];
      current.push(ticket);
      grouped.set(year, current);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({
        year,
        items: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      }));
  }, [filteredTickets, resolveArchiveYear, showArchive]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      key="tickets"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gestion des Tickets</h1>
          <p className="text-muted-foreground">Suivi et création de tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Menu tickets" title="Menu tickets">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Gestion Tickets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setShowArchive(false);
                  setShowTrash(false);
                }}
              >
                <Inbox className="mr-2 h-4 w-4" />
                Aller vers les tickets actifs
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setShowArchive(true);
                  setShowTrash(false);
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Aller vers les archives
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setShowTrash(true);
                  setShowArchive(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Aller vers la corbeille
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setViewMode('list')}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Vue liste
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setViewMode('card')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Vue cartes
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un ticket
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={resetFilters}>
                <Search className="mr-2 h-4 w-4" />
                Réinitialiser les filtres
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void loadData()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rafraîchir la liste
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode((v) => v === 'list' ? 'card' : 'list')}
            className="border-2 border-cyan-500 dark:border-cyan-400"
            title={viewMode === 'list' ? 'Vue cartes' : 'Vue liste'}
          >
            {viewMode === 'list' ? <LayoutDashboard className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowTrash((p) => {
                const next = !p;
                if (next) setShowArchive(false);
                return next;
              });
            }}
            aria-label={showTrash ? 'Masquer corbeille' : 'Corbeille'}
            className={`ticket-create-button ticket-trash-button group h-8 rounded-md px-2.5 text-xs font-semibold sm:h-9 sm:px-3.5 sm:text-sm ${showTrash ? 'ticket-trash-button--active' : ''}`}
          >
            <Trash2 className="h-4 w-4 shrink-0 sm:mr-2" />
            <span className="hidden sm:inline">{showTrash ? 'Masquer corbeille' : 'Corbeille'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setShowArchive((p) => {
                const next = !p;
                if (next) setShowTrash(false);
                return next;
              });
            }}
            aria-label={showArchive ? 'Masquer archive' : 'Archive'}
            className={`ticket-create-button group h-8 rounded-md px-2.5 text-xs font-semibold sm:h-9 sm:px-3.5 sm:text-sm ${showArchive ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : ''}`}
          >
            <Archive className="h-4 w-4 shrink-0 sm:mr-2" />
            <span className="hidden sm:inline">{showArchive ? 'Masquer archive' : 'Archive'}</span>
          </Button>

          {/* ── Create Ticket Button + Dialog ── */}
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setLocalityEnabled(false); }}>
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Créer un ticket"
              className="ticket-create-button ticket-create-button--primary group inline-flex items-center justify-center h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-md text-xs sm:text-sm font-semibold"
            >
              <span className="text-lg leading-none transition-transform duration-200 group-hover:scale-110 sm:hidden">+</span>
              <Plus className="hidden h-4 w-4 transition-transform duration-200 group-hover:scale-110 sm:mr-2 sm:inline-block" />
              <span className="hidden sm:inline">Créer un ticket</span>
            </button>

            <FloatingDialogContent
              showCloseButton={false}
              className="z-[120] overflow-hidden rounded-xl border-2 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              style={{ width: `${dialogSize.width}px`, height: `${dialogSize.height}px`, left: `${dialogPos.x}px`, top: `${dialogPos.y}px` }}
            >
              {/* Header/drag zone */}
              <div
                className="sticky top-0 z-20 flex items-center justify-between border-b bg-slate-50/90 px-6 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 cursor-move select-none"
                onMouseDown={startDrag}
              >
                <div>
                  <DialogTitle className="text-xl text-foreground">Créer un nouveau ticket</DialogTitle>
                  <DialogDescription>Remplissez les informations du ticket</DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">✕</Button>
                </DialogClose>
              </div>

              {/* Scrollable form */}
              <div className="overflow-y-auto" style={{ height: `calc(${dialogSize.height}px - 80px - 64px)` }}>
                <div className="grid gap-4 px-6 py-4">

                  {/* Objet + Catégorie */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Objet *</Label>
                      <Input value={form.objet} onChange={(e) => setForm((p) => ({ ...p, objet: e.target.value }))} placeholder="Objet du ticket" className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Catégorie</Label>
                      <Select value={form.category} onValueChange={(v: TicketCategory) => setForm((p) => ({ ...p, category: v }))}>
                        <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                          {Object.entries(TICKET_CATEGORIES).map(([k, v]) => {
                            const Icon = v.icon;
                            return <SelectItem key={k} value={k}><Icon className="inline w-4 h-4 mr-2" />{v.label}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid gap-2">
                    <Label className="text-foreground font-medium">Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Décrivez le problème ou la demande..." rows={3} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                  </div>

                  {/* Priorité + Site + Localité */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Priorité</Label>
                      <Select value={form.priority} onValueChange={(v: TicketPriority) => setForm((p) => ({ ...p, priority: v }))}>
                        <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                          {Object.entries(TICKET_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Site</Label>
                      <Select value={form.site} onValueChange={(v) => setForm((p) => ({ ...p, site: v }))}>
                        <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                          {siteOptions.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Localité</Label>
                      <Select value={form.localite} onValueChange={(v) => { setForm((p) => ({ ...p, localite: v })); setLocalityDraft((p) => ({ ...p, freeText: v })); }}>
                        <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                          {localityOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        value={localityDraft.freeText}
                        onChange={(e) => { const v = e.target.value; setLocalityDraft((p) => ({ ...p, freeText: v })); setForm((p) => ({ ...p, localite: v })); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && localityEnabled) { e.preventDefault(); void createLocality(localityDraft, 'create'); } }}
                        placeholder="Saisie libre"
                        className="border-2 dark:border-slate-600 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  {/* Switch localité */}
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <p className="text-sm font-medium text-foreground">Créer une localité dans la base</p>
                      <p className="text-xs text-muted-foreground">Activez pour afficher le formulaire structuré</p>
                    </div>
                    <Switch checked={localityEnabled} onCheckedChange={setLocalityEnabled} />
                  </div>

                  {/* Formulaire localité */}
                  {localityEnabled && (
                    <LocalityForm
                      draft={localityDraft}
                      onChange={setLocalityDraft}
                      onSubmit={() => void createLocality(localityDraft, 'create')}
                      isLoading={isCreatingLocality}
                    />
                  )}

                  {/* Technicien */}
                  <div className="grid gap-2">
                    <Label className="text-foreground font-medium">Technicien assigné</Label>
                    <Select value={form.technicien} onValueChange={(v) => setForm((p) => ({ ...p, technicien: v }))}>
                      <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner un technicien" /></SelectTrigger>
                      <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                        {technicianOptions.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {(form.category === 'incident' || form.category === 'maintenance') && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                      <div>
                        <p className="text-sm font-medium text-foreground">Envoyer une copie au client</p>
                        <p className="text-xs text-muted-foreground">Désactivé par défaut pour Incident/Maintenance.</p>
                      </div>
                      <Switch
                        checked={form.sendCopyToClient}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, sendCopyToClient: checked }))}
                      />
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">Date d'échéance</Label>
                      <Input type="datetime-local" value={form.dueDate ? format(form.dueDate, "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value ? new Date(e.target.value) : null }))} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">ETR</Label>
                      <Input type="datetime-local" value={form.etr ? format(form.etr, "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setForm((p) => ({ ...p, etr: e.target.value ? new Date(e.target.value) : null }))} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                  </div>

                  {/* SLA + SLR */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">SLA</Label>
                      <Select value={form.sla} onValueChange={(v) => setForm((p) => ({ ...p, sla: v }))}>
                        <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent position="popper" className="z-[200] bg-white dark:bg-slate-800">
                          {['1h','4h','8h','24h','48h','72h'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-foreground font-medium">SLR</Label>
                      <Input value={form.slr} onChange={(e) => setForm((p) => ({ ...p, slr: e.target.value }))} placeholder="Ex: 95%, 99%" className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-2 border-t bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-900">
                <DialogClose asChild>
                  <Button variant="outline" className="border-2">Annuler</Button>
                </DialogClose>
                <Button
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
                  onClick={() => void handleCreate()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Création...' : 'Créer le ticket'}
                </Button>
              </div>

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
        </div>
      </div>

      {/* ── Filtres ── */}
      <Card className="border-2 dark:border-slate-700 bg-white dark:bg-slate-900">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-foreground">Filtres</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Menu filtres tickets" title="Menu filtres tickets">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Menu Filtres</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setShowArchive(false);
                    setShowTrash(false);
                  }}
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  Voir les tickets actifs
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setShowArchive(true);
                    setShowTrash(false);
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Voir les archives
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setShowTrash(true);
                    setShowArchive(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Voir la corbeille
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={resetFilters}>
                  <Search className="mr-2 h-4 w-4" />
                  Réinitialiser les filtres
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void loadData()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rafraîchir la liste
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-2 dark:border-slate-600 dark:bg-slate-800" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}>
              <SelectTrigger className="w-[150px] border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-slate-800">
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(TICKET_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TicketPriority | 'all')}>
              <SelectTrigger className="w-[150px] border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-slate-800">
                <SelectItem value="all">Toutes priorités</SelectItem>
                {Object.entries(TICKET_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[140px] border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Site" /></SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-slate-800">
                <SelectItem value="all">Tous sites</SelectItem>
                {siteOptions.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={localiteFilter} onValueChange={setLocaliteFilter}>
              <SelectTrigger className="w-[140px] border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Localité" /></SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-slate-800">
                <SelectItem value="all">Toutes localités</SelectItem>
                {localityOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[180px] border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Technicien" /></SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-slate-800">
                <SelectItem value="all">Tous techniciens</SelectItem>
                {technicianOptions.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Liste / Cartes ── */}
      {viewMode === 'list' ? (
        <Card className="border-2 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    {['N°', 'Objet', 'Statut', 'Priorité', 'Site', 'Technicien', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="text-left p-3 font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showArchive ? archivedByYear.map((group) => (
                    <>
                      <tr key={`archive-year-${group.year}`} className="bg-amber-50/70 dark:bg-amber-900/20">
                        <td colSpan={8} className="p-3 font-semibold text-amber-700 dark:text-amber-300">
                          Dossier Archive {group.year} ({group.items.length})
                        </td>
                      </tr>
                      {group.items.map((ticket) => (
                        <tr key={ticket.id} className="group border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onMouseEnter={() => prefetchTicketDetail(ticket.id)} onClick={() => openTicketDetailPage(ticket.id)}>
                          <td className="p-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</td>
                          <td className="p-3 max-w-[200px] truncate text-foreground">{ticket.objet}</td>
                          <td className="p-3">
                            <Badge className={`${TICKET_STATUSES[ticket.status]?.bgColor} ${TICKET_STATUSES[ticket.status]?.color} border ${TICKET_STATUSES[ticket.status]?.borderColor} font-semibold`}>
                              {TICKET_STATUSES[ticket.status]?.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`${TICKET_PRIORITIES[ticket.priority]?.bgColor} ${TICKET_PRIORITIES[ticket.priority]?.color} font-semibold`}>
                              {TICKET_PRIORITIES[ticket.priority]?.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-foreground">{ticket.site || '-'}</td>
                          <td className="p-3 text-foreground">{ticket.technicien || '-'}</td>
                          <td className="p-3 text-muted-foreground text-sm">{format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                <Link href={`/tickets/${ticket.id}`} aria-label={`Voir le ticket ${ticket.numero}`}>
                                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/40" onClick={() => { setEditingTicket(ticket); setEditOpen(true); }}>
                                <Edit className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" onClick={() => void handleUnarchiveTicket(ticket)}>
                                <ArchiveRestore className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => void handleDelete(ticket, ticket.isDeleted)}>
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )) : filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="group border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onMouseEnter={() => prefetchTicketDetail(ticket.id)} onClick={() => openTicketDetailPage(ticket.id)}>
                      <td className="p-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</td>
                      <td className="p-3 max-w-[200px] truncate text-foreground">{ticket.objet}</td>
                      <td className="p-3">
                        <Badge className={`${TICKET_STATUSES[ticket.status]?.bgColor} ${TICKET_STATUSES[ticket.status]?.color} border ${TICKET_STATUSES[ticket.status]?.borderColor} font-semibold`}>
                          {TICKET_STATUSES[ticket.status]?.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={`${TICKET_PRIORITIES[ticket.priority]?.bgColor} ${TICKET_PRIORITIES[ticket.priority]?.color} font-semibold`}>
                          {TICKET_PRIORITIES[ticket.priority]?.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-foreground">{ticket.site || '-'}</td>
                      <td className="p-3 text-foreground">{ticket.technicien || '-'}</td>
                      <td className="p-3 text-muted-foreground text-sm">{format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                            <Link href={`/tickets/${ticket.id}`} aria-label={`Voir le ticket ${ticket.numero}`}>
                              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/40" onClick={() => { setEditingTicket(ticket); setEditOpen(true); }}>
                            <Edit className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          </Button>
                          {!showTrash && !showArchive && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => void handleArchiveTicket(ticket)}>
                              <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => void handleDelete(ticket, ticket.isDeleted)}>
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        {showTrash ? 'La corbeille est vide' : showArchive ? 'Aucun ticket archivé' : 'Aucun ticket. Cliquez sur "Créer un ticket" pour commencer.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {showArchive ? archivedByYear.map((group) => (
            <>
              <Card key={`archive-card-year-${group.year}`} className="col-span-full border border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20">
                <CardContent className="py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Dossier Archive {group.year} ({group.items.length})
                </CardContent>
              </Card>
              {group.items.map((ticket) => (
                <Card
                  key={ticket.id}
                  className={`border-2 ${TICKET_STATUSES[ticket.status]?.borderColor} bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow cursor-pointer`}
                  onMouseEnter={() => prefetchTicketDetail(ticket.id)}
                  onClick={() => openTicketDetailPage(ticket.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</span>
                      <Badge className={`${TICKET_STATUSES[ticket.status]?.bgColor} ${TICKET_STATUSES[ticket.status]?.color} font-semibold`}>
                        {TICKET_STATUSES[ticket.status]?.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-foreground line-clamp-2">{ticket.objet}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={`${TICKET_PRIORITIES[ticket.priority]?.bgColor} ${TICKET_PRIORITIES[ticket.priority]?.color} text-xs`}>
                          {TICKET_PRIORITIES[ticket.priority]?.label}
                        </Badge>
                        {(() => { const Cat = TICKET_CATEGORIES[ticket.category]?.icon; return Cat ? <Cat className="w-4 h-4 text-muted-foreground" /> : null; })()}
                        <span className="text-muted-foreground">{TICKET_CATEGORIES[ticket.category]?.label}</span>
                      </div>
                      {ticket.site && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> {ticket.site}</p>}
                      {ticket.technicien && <p className="text-muted-foreground flex items-center gap-1"><User className="w-4 h-4" /> {ticket.technicien}</p>}
                      <p className="text-muted-foreground text-xs">{format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                        <Link href={`/tickets/${ticket.id}`}>
                          <Eye className="w-4 h-4 mr-1" /> Voir
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400" onClick={() => { setEditingTicket(ticket); setEditOpen(true); }}>
                        <Edit className="w-4 h-4 mr-1" /> Modifier
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" onClick={() => void handleUnarchiveTicket(ticket)}>
                        <ArchiveRestore className="w-4 h-4 mr-1" /> Désarchiver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )) : filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`border-2 ${TICKET_STATUSES[ticket.status]?.borderColor} bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow cursor-pointer`}
              onMouseEnter={() => prefetchTicketDetail(ticket.id)}
              onClick={() => openTicketDetailPage(ticket.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{ticket.numero}</span>
                  <Badge className={`${TICKET_STATUSES[ticket.status]?.bgColor} ${TICKET_STATUSES[ticket.status]?.color} font-semibold`}>
                    {TICKET_STATUSES[ticket.status]?.label}
                  </Badge>
                </div>
                <CardTitle className="text-base text-foreground line-clamp-2">{ticket.objet}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={`${TICKET_PRIORITIES[ticket.priority]?.bgColor} ${TICKET_PRIORITIES[ticket.priority]?.color} text-xs`}>
                      {TICKET_PRIORITIES[ticket.priority]?.label}
                    </Badge>
                    {(() => { const Cat = TICKET_CATEGORIES[ticket.category]?.icon; return Cat ? <Cat className="w-4 h-4 text-muted-foreground" /> : null; })()}
                    <span className="text-muted-foreground">{TICKET_CATEGORIES[ticket.category]?.label}</span>
                  </div>
                  {ticket.site && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> {ticket.site}</p>}
                  {ticket.technicien && <p className="text-muted-foreground flex items-center gap-1"><User className="w-4 h-4" /> {ticket.technicien}</p>}
                  <p className="text-muted-foreground text-xs">{format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Link href={`/tickets/${ticket.id}`}>
                      <Eye className="w-4 h-4 mr-1" /> Voir
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400" onClick={() => { setEditingTicket(ticket); setEditOpen(true); }}>
                    <Edit className="w-4 h-4 mr-1" /> Modifier
                  </Button>
                  {!showTrash && !showArchive && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400" onClick={() => void handleArchiveTicket(ticket)}>
                      <Archive className="w-4 h-4 mr-1" /> Archiver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTickets.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {showTrash ? 'La corbeille est vide' : showArchive ? 'Aucun ticket archivé' : 'Aucun ticket'}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 dark:border-slate-700">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">{selectedTicket.numero}</span>
                      <Badge className={`${TICKET_STATUSES[selectedTicket.status]?.bgColor} ${TICKET_STATUSES[selectedTicket.status]?.color} font-semibold`}>
                        {TICKET_STATUSES[selectedTicket.status]?.label}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-base text-foreground mt-1">{selectedTicket.objet}</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-2 dark:border-slate-600" onClick={() => { setEditingTicket(selectedTicket); setEditOpen(true); setDetailOpen(false); }}>
                      <Edit className="w-4 h-4 mr-1" /> Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400" onClick={() => void handleDelete(selectedTicket)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800">
                  {['details', 'comments', 'attachments', 'history', 'resolution'].map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 capitalize">
                      {tab === 'details' && 'Détails'}
                      {tab === 'comments' && `Commentaires (${selectedTicket.comments.length})`}
                      {tab === 'attachments' && `Pièces (${selectedTicket.attachments.length})`}
                      {tab === 'history' && 'Historique'}
                      {tab === 'resolution' && 'Résolution'}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border dark:border-slate-700">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Informations générales</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="font-medium text-muted-foreground">Priorité:</span> <Badge className={`${TICKET_PRIORITIES[selectedTicket.priority]?.bgColor} ${TICKET_PRIORITIES[selectedTicket.priority]?.color}`}>{TICKET_PRIORITIES[selectedTicket.priority]?.label}</Badge></p>
                        <p><span className="font-medium text-muted-foreground">Catégorie:</span> {TICKET_CATEGORIES[selectedTicket.category]?.label}</p>
                        <p><span className="font-medium text-muted-foreground">Site:</span> {selectedTicket.site || '-'}</p>
                        <p><span className="font-medium text-muted-foreground">Localité:</span> {selectedTicket.localite || '-'}</p>
                        <p><span className="font-medium text-muted-foreground">Technicien:</span> {selectedTicket.technicien || '-'}</p>
                      </CardContent>
                    </Card>
                    <Card className="border dark:border-slate-700">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Dates et SLA</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="font-medium text-muted-foreground">Créé le:</span> {format(selectedTicket.createdAt, 'dd/MM/yyyy à HH:mm')}</p>
                        <p><span className="font-medium text-muted-foreground">Par:</span> {selectedTicket.reporterName}</p>
                        <p><span className="font-medium text-muted-foreground">Mis à jour:</span> {format(selectedTicket.updatedAt, 'dd/MM/yyyy à HH:mm')}</p>
                        {selectedTicket.dueDate && <p><span className="font-medium text-muted-foreground">Échéance:</span> {format(selectedTicket.dueDate, 'dd/MM/yyyy à HH:mm')}</p>}
                        {selectedTicket.etr && <p><span className="font-medium text-muted-foreground">ETR:</span> {format(selectedTicket.etr, 'dd/MM/yyyy à HH:mm')}</p>}
                        {selectedTicket.sla && <p><span className="font-medium text-muted-foreground">SLA:</span> <Badge variant="outline">{selectedTicket.sla}</Badge></p>}
                        {selectedTicket.slr && <p><span className="font-medium text-muted-foreground">SLR:</span> {selectedTicket.slr}</p>}
                        {selectedTicket.resolvedAt && <p><span className="font-medium text-muted-foreground">Résolu le:</span> {format(selectedTicket.resolvedAt, 'dd/MM/yyyy à HH:mm')}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="border dark:border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                    <CardContent><p className="whitespace-pre-wrap text-foreground">{selectedTicket.description || 'Aucune description'}</p></CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comments" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Switch checked={privateComment} onCheckedChange={setPrivateComment} />
                    <Label className="text-sm flex items-center gap-1">
                      {privateComment ? <><Lock className="w-4 h-4" /> Commentaire privé</> : <><Eye className="w-4 h-4" /> Commentaire public</>}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-1 border-2 dark:border-slate-600 dark:bg-slate-800" />
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={() => {
                      if (!newComment.trim()) return;
                      const comment = { id: genId(), ticketId: selectedTicket.id, authorId: user?.id || '', authorName: user?.name || '', content: newComment, isPrivate: privateComment, isEdited: false, createdAt: new Date() };
                      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? { ...t, comments: [...t.comments, comment] } : t));
                      setSelectedTicket((prev) => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
                      setNewComment('');
                      toast.success('Commentaire ajouté');
                    }}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {selectedTicket.comments.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun commentaire</p>}
                      {selectedTicket.comments.map((c) => (
                        <div key={c.id} className={`p-3 rounded-lg border ${c.isPrivate ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{c.authorName}</span>
                              {c.isPrivate && <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-600">Privé</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{format(c.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          <p className="text-foreground">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4 mt-4">
                  <div className="border-2 border-dashed dark:border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Glissez-déposez vos fichiers ici ou cliquez pour parcourir</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Images, Documents (max 10MB)</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedTicket.attachments.length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">Aucune pièce jointe</p>}
                    {selectedTicket.attachments.map((a) => (
                      <div key={a.id} className="p-3 border rounded-lg dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-800">
                        <File className="w-5 h-5 text-cyan-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{a.fileName}</p>
                          <p className="text-xs text-muted-foreground">{(a.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {selectedTicket.history.map((entry) => (
                          <div key={entry.id} className="relative pl-8">
                            <div className="absolute left-1.5 top-2 w-4 h-4 rounded-full bg-cyan-500 border-2 border-white dark:border-slate-900" />
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{entry.action}</span>
                                <span className="text-xs text-muted-foreground">{format(entry.timestamp, 'dd/MM/yyyy HH:mm')}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">par {entry.userName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="resolution" className="space-y-4 mt-4">
                  <Card className="border dark:border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Résolution du ticket</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea placeholder="Décrivez la résolution du problème..." rows={4} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                      <div className="flex gap-2">
                        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => void handleUpdateStatus(selectedTicket, 'resolved')}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Marquer résolu
                        </Button>
                        <Button variant="outline" className="border-2" onClick={() => void handleUpdateStatus(selectedTicket, 'closed')}>
                          Fermer le ticket
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditLocalityEnabled(false); }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-2 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier le ticket</DialogTitle>
          </DialogHeader>
          {editingTicket && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Objet</Label>
                  <Input value={editingTicket.objet} onChange={(e) => setEditingTicket({ ...editingTicket, objet: e.target.value })} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Statut</Label>
                  <Select value={editingTicket.status} onValueChange={(v: TicketStatus) => setEditingTicket({ ...editingTicket, status: v })}>
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[200] bg-white dark:bg-slate-800">
                      {Object.entries(TICKET_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Priorité</Label>
                  <Select value={editingTicket.priority} onValueChange={(v: TicketPriority) => setEditingTicket({ ...editingTicket, priority: v })}>
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[200] bg-white dark:bg-slate-800">
                      {Object.entries(TICKET_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Site</Label>
                  <Select value={editingTicket.site} onValueChange={(v) => setEditingTicket({ ...editingTicket, site: v })}>
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="z-[200] bg-white dark:bg-slate-800">
                      {siteOptions.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Localité</Label>
                  <Select value={editingTicket.localite} onValueChange={(v) => { setEditingTicket({ ...editingTicket, localite: v }); setEditLocalityDraft((p) => ({ ...p, freeText: v })); }}>
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="z-[200] bg-white dark:bg-slate-800">
                      {localityOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={editLocalityDraft.freeText}
                    onChange={(e) => { const v = e.target.value; setEditLocalityDraft((p) => ({ ...p, freeText: v })); setEditingTicket((p) => p ? { ...p, localite: v } : p); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && editLocalityEnabled) { e.preventDefault(); void createLocality(editLocalityDraft, 'edit'); } }}
                    placeholder="Saisie libre"
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">Technicien</Label>
                  <Select value={editingTicket.technicien} onValueChange={(v) => setEditingTicket({ ...editingTicket, technicien: v })}>
                    <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="z-[200] bg-white dark:bg-slate-800">
                      {technicianOptions.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Description</Label>
                <Textarea value={editingTicket.description} onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })} rows={3} className="border-2 dark:border-slate-600 dark:bg-slate-800" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <p className="text-sm font-medium text-foreground">Créer une localité dans la base</p>
                  <p className="text-xs text-muted-foreground">Activez pour afficher le formulaire structuré</p>
                </div>
                <Switch checked={editLocalityEnabled} onCheckedChange={setEditLocalityEnabled} />
              </div>
              {editLocalityEnabled && (
                <LocalityForm
                  draft={editLocalityDraft}
                  onChange={setEditLocalityDraft}
                  onSubmit={() => void createLocality(editLocalityDraft, 'edit')}
                  isLoading={isEditCreatingLocality}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-2" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={() => void handleSaveEdit()}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── LocalityForm sub-component ───────────────────────────────────────────────

interface LocalityFormProps {
  draft: TicketLocalityDraft;
  onChange: (d: TicketLocalityDraft) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function LocalityForm({ draft, onChange, onSubmit, isLoading }: LocalityFormProps) {
  return (
    <Card className="border border-dashed border-cyan-300/70 bg-cyan-50/40 dark:border-cyan-700/70 dark:bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-foreground">Créer une nouvelle localité</CardTitle>
        <CardDescription>Pays, ville, arrondissement, quartier, adresse et coordonnées GPS</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Pays</Label>
            <Select value={draft.countryCode} onValueChange={(code) => {
              const c = TICKET_COUNTRIES.find((x) => x.code === code);
              onChange({ ...draft, countryCode: code, countryName: c?.name ?? draft.countryName });
            }}>
              <SelectTrigger className="border dark:border-slate-600 dark:bg-slate-800">
                {(() => { const c = TICKET_COUNTRIES.find((x) => x.code === draft.countryCode); return c ? <span>{c.flag} {c.name}</span> : <span className="text-muted-foreground">Choisir un pays</span>; })()}
              </SelectTrigger>
              <SelectContent className="z-[300] bg-white dark:bg-slate-800">
                {TICKET_COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Ville</Label>
            <Input value={draft.city} onChange={(e) => onChange({ ...draft, city: e.target.value })} placeholder="Ex: Kinshasa" className="border dark:border-slate-600 dark:bg-slate-800" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Arrondissement</Label>
            <Input value={draft.arrondissement} onChange={(e) => onChange({ ...draft, arrondissement: e.target.value })} placeholder="Ex: Gombe" className="border dark:border-slate-600 dark:bg-slate-800" />
          </div>
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Quartier</Label>
            <Input value={draft.quartier} onChange={(e) => onChange({ ...draft, quartier: e.target.value })} placeholder="Ex: Basoko" className="border dark:border-slate-600 dark:bg-slate-800" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label className="text-foreground text-xs">Adresse</Label>
          <Input value={draft.address} onChange={(e) => onChange({ ...draft, address: e.target.value })} placeholder="Ex: Avenue Colonel Mondjiba, n°12" className="border dark:border-slate-600 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Latitude</Label>
            <Input value={draft.latitude} onChange={(e) => onChange({ ...draft, latitude: e.target.value })} placeholder="-4.325" className="border dark:border-slate-600 dark:bg-slate-800" />
          </div>
          <div className="grid gap-2">
            <Label className="text-foreground text-xs">Longitude</Label>
            <Input value={draft.longitude} onChange={(e) => onChange({ ...draft, longitude: e.target.value })} placeholder="15.322" className="border dark:border-slate-600 dark:bg-slate-800" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onSubmit}
            className="border-cyan-300 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700 dark:text-cyan-300"
          >
            {isLoading ? 'Enregistrement...' : 'Ajouter cette localité'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
