'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { toast as sonnerToast } from 'sonner';
import {
  Plus,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Inbox,
  Pin,
  X,
  Shield,
  Wrench,
  ClipboardList,
  Boxes,
  Search,
  Paperclip,
  Link as LinkIcon,
  Phone,
  Mail,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

// Types

type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory =
  | 'deployment'
  | 'supervision'
  | 'ravitaillement'
  | 'routine_visit'
  | 'security'
  | 'maintenance'
  | 'incident'
  | 'survey';
type MaintenanceMode = 'preventive' | 'curative' | '';
type IncidentLevel = 'critical' | 'major' | '';
type TicketChannel = 'PHONE' | 'EMAIL' | 'NOC_DECISION' | 'PRESENTIEL' | '';
type TicketClassification = 'SECURITY' | 'PROBLEM' | '';

interface TicketOptionItem {
  id: string;
  name: string;
  localite?: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface LocalAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface FormState {
  objet: string;
  descriptionHtml: string;
  priority: TicketPriority;
  category: TicketCategory;
  maintenanceMode: MaintenanceMode;
  incidentLevel: IncidentLevel;
  siteIds: string[];
  localities: string[];
  technicianIds: string[];
  ownerTechnicianId: string;
  clientIds: string[];
  channel: TicketChannel;
  channelRequestTime: string;
  channelEmailLink: string;
  classification: TicketClassification;
  dueDate: Date | null;
  etr: Date | null;
  slaDuration: string;
  slr: string;
}

const TICKET_PRIORITIES: Record<TicketPriority, { label: string }> = {
  low: { label: 'Faible' },
  medium: { label: 'Moyenne' },
  high: { label: 'Haute' },
  critical: { label: 'Critique' },
};

const TICKET_CATEGORIES: Record<TicketCategory, { label: string; icon: typeof AlertTriangle }> = {
  deployment: { label: 'Deploiement', icon: Boxes },
  supervision: { label: 'Supervision', icon: Search },
  ravitaillement: { label: 'Ravitaillement', icon: Inbox },
  routine_visit: { label: 'Visite de Routine', icon: ClipboardList },
  security: { label: 'Securite', icon: Shield },
  maintenance: { label: 'Maintenance', icon: Wrench },
  incident: { label: 'Incident', icon: AlertTriangle },
  survey: { label: 'Survey', icon: Pin },
};

const SURVEY_DEFAULT_SUBJECT = 'Etude de faisabilite en vue d\'un raccordement client a la Fibre Optique';

const DEFAULT_TICKET_FORM: FormState = {
  objet: '',
  descriptionHtml: '',
  priority: 'medium',
  category: 'incident',
  maintenanceMode: '',
  incidentLevel: '',
  siteIds: [],
  localities: [],
  technicianIds: [],
  ownerTechnicianId: '',
  clientIds: [],
  channel: '',
  channelRequestTime: '',
  channelEmailLink: '',
  classification: '',
  dueDate: null,
  etr: null,
  slaDuration: '',
  slr: '',
};

const createToastId = (type: 'success' | 'error') => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toast = {
  success: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.success(message, { id: createToastId('success'), ...(options ?? {}) }),
  error: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.error(message, { id: createToastId('error'), ...(options ?? {}) }),
};

function splitValues(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
}

function formatLocalityLabel(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(/(\s+|-|')/)
    .map((chunk) => {
      if (!chunk || /^(\s+|-|')$/.test(chunk)) return chunk;
      const [first, ...rest] = chunk;
      return `${first.toUpperCase()}${rest.join('').toLowerCase()}`;
    })
    .join('');
}

function localityKey(value: string): string {
  return formatLocalityLabel(value)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mapLegacyPriorityToApi(priority?: TicketPriority): string {
  const map: Record<string, string> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'CRITICAL',
  };
  return map[priority ?? 'medium'] ?? 'MEDIUM';
}

function mapCategoryToApiType(category: TicketCategory, maintenanceMode: MaintenanceMode): string {
  switch (category) {
    case 'deployment':
      return 'FD';
    case 'supervision':
      return 'SU';
    case 'ravitaillement':
      return 'FI';
    case 'routine_visit':
      return 'VS';
    case 'security':
      return 'PC';
    case 'maintenance':
      return maintenanceMode === 'curative' ? 'MC' : 'MP';
    case 'incident':
      return 'INC';
    case 'survey':
      return 'SU';
    default:
      return 'INC';
  }
}

interface MultiSelectMenuProps {
  label: string;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function MultiSelectMenu({ label, placeholder, options, selectedIds, onChange }: MultiSelectMenuProps) {
  const selectedLabels = options.filter((opt) => selectedIds.includes(opt.id)).map((opt) => opt.name);

  return (
    <div className="grid gap-2">
      <Label className="text-foreground font-medium">{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between border-2 dark:border-slate-600 dark:bg-slate-800">
            <span className="truncate text-left">
              {selectedLabels.length > 0 ? `${selectedLabels.length} selection(s)` : placeholder}
            </span>
            <Plus className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[360px] max-h-[300px] overflow-auto bg-white dark:bg-slate-800">
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.id}
              checked={selectedIds.includes(opt.id)}
              onCheckedChange={(checked) => {
                if (checked) onChange([...selectedIds, opt.id]);
                else onChange(selectedIds.filter((id) => id !== opt.id));
              }}
            >
              {opt.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLabels.map((labelValue) => (
            <Badge key={labelValue} variant="secondary" className="max-w-[260px] truncate">
              {labelValue}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateTicketDialogProps {
  siteOptions: TicketOptionItem[];
  localityOptions: string[];
  technicianOptions: TicketOptionItem[];
  user: { id: string; name: string } | null | undefined;
  onLocalityCreated: (name: string) => void;
  onTicketCreated: (ticket: any) => void;
  onRefreshTickets: () => Promise<void>;
}

export function CreateTicketDialog({
  siteOptions,
  localityOptions,
  technicianOptions,
  user,
  onLocalityCreated,
  onTicketCreated,
  onRefreshTickets,
}: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragState = useRef({
    mode: null as null | 'drag' | 'resize',
    dir: '',
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startW: 0,
    startH: 0,
  });

  const [form, setForm] = useState<FormState>(DEFAULT_TICKET_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [ticketTechnicians, setTicketTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [localityInput, setLocalityInput] = useState('');

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (!el) return;
      const w = Math.min(1400, window.innerWidth * 0.96);
      const h = Math.min(900, window.innerHeight * 0.93);
      el.style.left = `${Math.max(0, (window.innerWidth - w) / 2)}px`;
      el.style.top = `${Math.max(0, (window.innerHeight - h) / 2)}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      const d = dragState.current;
      if (!d.mode) return;
      const el = dialogRef.current;
      if (!el) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.mode === 'drag') {
        el.style.left = `${Math.max(0, Math.min(d.startLeft + dx, window.innerWidth - d.startW))}px`;
        el.style.top = `${Math.max(0, Math.min(d.startTop + dy, window.innerHeight - 60))}px`;
      } else {
        const MIN_W = 680;
        const MIN_H = 480;
        let l = d.startLeft;
        let t = d.startTop;
        let w = d.startW;
        let h = d.startH;
        if (d.dir.includes('e')) w = Math.max(MIN_W, d.startW + dx);
        if (d.dir.includes('s')) h = Math.max(MIN_H, d.startH + dy);
        if (d.dir.includes('w')) {
          w = Math.max(MIN_W, d.startW - dx);
          l = d.startLeft + d.startW - w;
        }
        if (d.dir.includes('n')) {
          h = Math.max(MIN_H, d.startH - dy);
          t = d.startTop + d.startH - h;
        }
        el.style.left = `${l}px`;
        el.style.top = `${t}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
    };

    const onUp = () => {
      if (dragState.current.mode) {
        dragState.current.mode = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const loadClients = async () => {
      try {
        const res = await fetch('/api/tickets/clients');
        if (!res.ok) return;
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
              .filter((item) => item.id && item.name)
          : [];
        setClients(mapped);
      } catch {
        setClients([]);
      }
    };
    loadClients();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const loadTechnicians = async () => {
      try {
        const res = await fetch('/api/tickets/technicians', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
              .filter((item) => item.id && item.name)
          : [];
        setTicketTechnicians(mapped);
      } catch {
        setTicketTechnicians([]);
      }
    };

    loadTechnicians();
  }, [open]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select, [role="combobox"]')) return;
    const el = dialogRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      mode: 'drag',
      dir: '',
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startW: rect.width,
      startH: rect.height,
    };
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  const startResize = useCallback((dir: string) => (e: React.MouseEvent) => {
    const el = dialogRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      mode: 'resize',
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startW: rect.width,
      startH: rect.height,
    };
    document.body.style.userSelect = 'none';
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const localityLookup = useMemo(() => {
    const map = new Map<string, string>();
    localityOptions.forEach((name) => {
      const formatted = formatLocalityLabel(name);
      if (!formatted) return;
      const key = localityKey(formatted);
      if (!map.has(key)) map.set(key, formatted);
    });
    return map;
  }, [localityOptions]);

  const normalizeLocalityInput = useCallback(
    (raw: string): string[] => {
      const unique = new Map<string, string>();
      splitValues(raw).forEach((entry) => {
        const formatted = formatLocalityLabel(entry);
        if (!formatted) return;
        const key = localityKey(formatted);
        unique.set(key, localityLookup.get(key) ?? formatted);
      });
      return Array.from(unique.values());
    },
    [localityLookup]
  );

  const selectedTechnicianNames = useMemo(
    () => {
      const merged = new Map<string, { id: string; name: string }>();
      technicianOptions.forEach((item) => merged.set(item.id, { id: item.id, name: item.name }));
      ticketTechnicians.forEach((item) => merged.set(item.id, item));
      return Array.from(merged.values()).filter((t) => form.technicianIds.includes(t.id)).map((t) => t.name);
    },
    [technicianOptions, ticketTechnicians, form.technicianIds]
  );

  const mergedTechnicianOptions = useMemo(() => {
    const merged = new Map<string, { id: string; name: string }>();
    technicianOptions.forEach((item) => merged.set(item.id, { id: item.id, name: item.name }));
    ticketTechnicians.forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
    );
  }, [technicianOptions, ticketTechnicians]);

  const selectedOwnerName = useMemo(
    () => mergedTechnicianOptions.find((t) => t.id === form.ownerTechnicianId)?.name ?? '',
    [mergedTechnicianOptions, form.ownerTechnicianId]
  );

  const applyEditorCommand = useCallback((command: string, value?: string) => {
    descriptionRef.current?.focus();
    document.execCommand(command, false, value);
    updateForm({ descriptionHtml: descriptionRef.current?.innerHTML ?? '' });
  }, [updateForm]);

  const onCategoryChange = useCallback((value: TicketCategory) => {
    const nextUpdates: Partial<FormState> = { category: value };
    if (value !== 'maintenance') nextUpdates.maintenanceMode = '';
    if (value !== 'incident') nextUpdates.incidentLevel = '';
    if (value === 'survey') nextUpdates.objet = SURVEY_DEFAULT_SUBJECT;
    updateForm(nextUpdates);
  }, [updateForm]);

  const onFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxSize = 15 * 1024 * 1024;
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const parsed: LocalAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast.error(`Le fichier ${file.name} depasse 15MB`);
        continue;
      }
      try {
        const dataUrl = await toDataUrl(file);
        parsed.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
        });
      } catch {
        toast.error(`Impossible de lire ${file.name}`);
      }
    }

    if (parsed.length > 0) {
      setAttachments((prev) => [...prev, ...parsed]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !user?.name) {
      toast.error('Utilisateur non identifie');
      return;
    }
    if (!form.objet.trim()) {
      toast.error('L\'objet du ticket est requis');
      return;
    }
    if (form.category === 'maintenance' && !form.maintenanceMode) {
      toast.error('Selectionnez Preventive ou Curative');
      return;
    }
    if (form.category === 'incident' && !form.incidentLevel) {
      toast.error('Selectionnez Critique ou Majeur');
      return;
    }
    if (form.ownerTechnicianId && !form.technicianIds.includes(form.ownerTechnicianId)) {
      toast.error('Le proprietaire doit faire partie des techniciens assignes');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedLocalities = [
        ...new Set([
          ...form.localities,
          ...normalizeLocalityInput(localityInput),
        ]),
      ];

      const knownLocalityKeys = new Set(Array.from(localityLookup.keys()));
      const missingLocalities = normalizedLocalities.filter((name) => !knownLocalityKeys.has(localityKey(name)));

      for (const locality of missingLocalities) {
        try {
          const response = await fetch('/api/tickets/localities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: locality }),
          });
          if (response.ok) {
            const created = await response.json();
            const createdName = formatLocalityLabel(created?.name ?? locality);
            if (createdName) onLocalityCreated(createdName);
          }
        } catch {
          // Keep ticket flow resilient.
        }
      }

      const descriptionHtml = descriptionRef.current?.innerHTML ?? form.descriptionHtml;
      const descriptionText = stripHtml(descriptionHtml);
      const owner = mergedTechnicianOptions.find((t) => t.id === form.ownerTechnicianId);

      const payload = {
        type: mapCategoryToApiType(form.category, form.maintenanceMode),
        objet: form.objet,
        description: descriptionText,
        priority: mapLegacyPriorityToApi(form.priority),
        status: 'OPEN',
        siteIds: form.siteIds,
        localities: normalizedLocalities,
        technicianIds: form.technicianIds,
        ownerTechnicianId: form.ownerTechnicianId || null,
        ownerTechnicianName: owner?.name ?? null,
        clientIds: form.clientIds,
        creatorId: user.id,
        creatorName: user.name,
        dueDate: form.dueDate?.toISOString() ?? null,
        etr: form.etr?.toISOString() ?? null,
        slaDuration: form.slaDuration,
        slr: form.slr,
        classification: form.classification || null,
        channel: form.channel || null,
        channelRequestTime: form.channelRequestTime || null,
        channelEmailLink: form.channelEmailLink || null,
        descriptionHtml,
        categoryLabel: TICKET_CATEGORIES[form.category].label,
        categoryKey: form.category,
        maintenanceMode: form.maintenanceMode || null,
        incidentLevel: form.incidentLevel || null,
        attachments: attachments.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: file.dataUrl,
        })),
      };

      const res = await fetch('/api/tickets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 || err?.error === 'technician_capacity_exceeded') {
          toast.error(err?.message ?? 'Un technicien a deja 3 tickets actifs cette semaine.');
          return;
        }
        throw new Error('ticket_create_failed');
      }

      const ticket = await res.json();
      onTicketCreated(ticket);
      setForm(DEFAULT_TICKET_FORM);
      setAttachments([]);
      setLocalityInput('');
      if (descriptionRef.current) descriptionRef.current.innerHTML = '';
      setOpen(false);
      await onRefreshTickets();
      toast.success('Ticket cree', { description: `Le ticket ${ticket.numero ?? ''} a ete cree` });
    } catch {
      toast.error('Impossible de creer le ticket');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    form,
    normalizeLocalityInput,
    localityInput,
    localityLookup,
    onLocalityCreated,
    mergedTechnicianOptions,
    attachments,
    onTicketCreated,
    onRefreshTickets,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="ticket-create-button h-9 rounded-lg px-3 text-sm font-semibold sm:h-10 sm:px-4"
          aria-label="Creer un ticket"
        >
          <span className="text-lg leading-none sm:hidden">+</span>
          <Plus className="hidden h-4 w-4 sm:mr-2 sm:inline-block" />
          <span className="hidden sm:inline">Creer le ticket</span>
        </Button>
      </DialogTrigger>

      <FloatingDialogContent
        ref={dialogRef}
        showCloseButton={false}
        className="z-[80] overflow-hidden rounded-xl border-2 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-900 grid grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        <div className="absolute top-0 left-3 right-3 h-[5px] cursor-ns-resize z-30 select-none" onMouseDown={startResize('n')} />
        <div className="absolute bottom-0 left-3 right-3 h-[5px] cursor-ns-resize z-30 select-none" onMouseDown={startResize('s')} />
        <div className="absolute top-3 bottom-3 right-0 w-[5px] cursor-ew-resize z-30 select-none" onMouseDown={startResize('e')} />
        <div className="absolute top-3 bottom-3 left-0 w-[5px] cursor-ew-resize z-30 select-none" onMouseDown={startResize('w')} />
        <div className="absolute top-0 right-0 h-4 w-4 cursor-nesw-resize z-30 select-none" onMouseDown={startResize('ne')} />
        <div className="absolute top-0 left-0 h-4 w-4 cursor-nwse-resize z-30 select-none" onMouseDown={startResize('nw')} />
        <div className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize z-30 select-none" onMouseDown={startResize('se')} />
        <div className="absolute bottom-0 left-0 h-4 w-4 cursor-nesw-resize z-30 select-none" onMouseDown={startResize('sw')} />

        <div
          className="sticky top-0 z-20 border-b bg-slate-50/90 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 dark:border-slate-700 dark:bg-slate-900/90 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={startDrag}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl text-foreground">Creer un nouveau ticket</DialogTitle>
              <DialogDescription>Categories metier, multiselects, canal, client, SLA, proprietaire et pieces jointes.</DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-60 transition-all hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-5 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-2 lg:col-span-2">
                <Label className="text-foreground font-medium">Objet *</Label>
                <Input
                  value={form.objet}
                  onChange={(e) => updateForm({ objet: e.target.value })}
                  placeholder="Objet du ticket"
                  disabled={form.category === 'survey'}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Categorie</Label>
                <Select value={form.category} onValueChange={(v: TicketCategory) => onCategoryChange(v)}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {Object.entries(TICKET_CATEGORIES).map(([key, val]) => {
                      const Icon = val.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <Icon className="inline w-4 h-4 mr-2" />
                          {val.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.category === 'maintenance' || form.category === 'incident') && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {form.category === 'maintenance' && (
                  <div className="grid gap-2">
                    <Label className="text-foreground font-medium">Type de maintenance</Label>
                    <Select value={form.maintenanceMode} onValueChange={(v: MaintenanceMode) => updateForm({ maintenanceMode: v })}>
                      <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                        <SelectValue placeholder="Preventive ou Curative" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800">
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="curative">Curative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.category === 'incident' && (
                  <div className="grid gap-2">
                    <Label className="text-foreground font-medium">Niveau incident</Label>
                    <Select value={form.incidentLevel} onValueChange={(v: IncidentLevel) => updateForm({ incidentLevel: v })}>
                      <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                        <SelectValue placeholder="Critique ou Majeur" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800">
                        <SelectItem value="critical">Critique</SelectItem>
                        <SelectItem value="major">Majeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Priorite</Label>
                <Select value={form.priority} onValueChange={(v: TicketPriority) => updateForm({ priority: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {Object.entries(TICKET_PRIORITIES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Classification</Label>
                <Select value={form.classification} onValueChange={(v: TicketClassification) => updateForm({ classification: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="SECURITY">Securite</SelectItem>
                    <SelectItem value="PROBLEM">Probleme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Canal utilise</Label>
                <Select value={form.channel} onValueChange={(v: TicketChannel) => updateForm({ channel: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="PHONE">Par Appel</SelectItem>
                    <SelectItem value="EMAIL">Par Mail</SelectItem>
                    <SelectItem value="NOC_DECISION">Decide par le NOC</SelectItem>
                    <SelectItem value="PRESENTIEL">En presentiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.channel === 'PHONE' || form.channel === 'PRESENTIEL') && (
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Heure de la demande</Label>
                <Input
                  type="datetime-local"
                  value={form.channelRequestTime}
                  onChange={(e) => updateForm({ channelRequestTime: e.target.value })}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            )}

            {form.channel === 'EMAIL' && (
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Lien de la demande mail</Label>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.channelEmailLink}
                    onChange={(e) => updateForm({ channelEmailLink: e.target.value })}
                    placeholder="https://..."
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <MultiSelectMenu
                label="Client"
                placeholder="Selectionner client(s)"
                options={clients}
                selectedIds={form.clientIds}
                onChange={(clientIds) => updateForm({ clientIds })}
              />

              <MultiSelectMenu
                label="Technicien assigne"
                placeholder="Selectionner technicien(s)"
                options={mergedTechnicianOptions}
                selectedIds={form.technicianIds}
                onChange={(technicianIds) => {
                  const ownerStillValid = technicianIds.includes(form.ownerTechnicianId);
                  updateForm({
                    technicianIds,
                    ownerTechnicianId: ownerStillValid ? form.ownerTechnicianId : '',
                  });
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <MultiSelectMenu
                label="Site"
                placeholder="Selectionner site(s)"
                options={siteOptions.map((s) => ({ id: s.id, name: s.name }))}
                selectedIds={form.siteIds}
                onChange={(siteIds) => updateForm({ siteIds })}
              />

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Localite (multiselect + saisie libre)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between border-2 dark:border-slate-600 dark:bg-slate-800">
                      <span className="truncate text-left">
                        {form.localities.length > 0 ? `${form.localities.length} selection(s)` : 'Selectionner localite(s)'}
                      </span>
                      <Plus className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[360px] max-h-[300px] overflow-auto bg-white dark:bg-slate-800">
                    {localityOptions.map((loc) => {
                      const key = localityKey(loc);
                      const selected = form.localities.some((item) => localityKey(item) === key);
                      return (
                        <DropdownMenuCheckboxItem
                          key={loc}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateForm({ localities: [...form.localities, loc] });
                            } else {
                              updateForm({ localities: form.localities.filter((item) => localityKey(item) !== key) });
                            }
                          }}
                        >
                          {loc}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex gap-2">
                  <Input
                    value={localityInput}
                    onChange={(e) => setLocalityInput(e.target.value)}
                    placeholder="Ajouter localite(s) manuelles: Pointe-Noire, Brazzaville"
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const parsed = normalizeLocalityInput(localityInput);
                      if (parsed.length === 0) return;
                      updateForm({ localities: [...new Set([...form.localities, ...parsed])] });
                      setLocalityInput('');
                    }}
                  >
                    Ajouter
                  </Button>
                </div>

                {form.localities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.localities.map((loc) => (
                      <Badge key={loc} variant="secondary" className="gap-1">
                        {loc}
                        <button
                          type="button"
                          onClick={() => updateForm({ localities: form.localities.filter((item) => item !== loc) })}
                          className="opacity-70 hover:opacity-100"
                          aria-label={`Supprimer ${loc}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Proprietaire du ticket</Label>
                <Select
                  value={form.ownerTechnicianId}
                  onValueChange={(ownerTechnicianId) => updateForm({ ownerTechnicianId })}
                  disabled={selectedTechnicianNames.length === 0}
                >
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Choisir parmi techniciens assignes" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {mergedTechnicianOptions
                      .filter((t) => form.technicianIds.includes(t.id))
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedOwnerName && (
                  <p className="text-xs text-muted-foreground">Proprietaire choisi: {selectedOwnerName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Date d'echeance</Label>
                <Input
                  type="datetime-local"
                  value={form.dueDate ? format(form.dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => updateForm({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">ETR</Label>
                <Input
                  type="datetime-local"
                  value={form.etr ? format(form.etr, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => updateForm({ etr: e.target.value ? new Date(e.target.value) : null })}
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Duree SLA</Label>
                <Input
                  value={form.slaDuration}
                  onChange={(e) => updateForm({ slaDuration: e.target.value })}
                  placeholder="Ex: 4h, 8h, 24h, 2 jours"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">SLR</Label>
                <Input
                  value={form.slr}
                  onChange={(e) => updateForm({ slr: e.target.value })}
                  placeholder="Ex: 95%, 99%"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-foreground font-medium">Pieces jointes (documents, images, etc.)</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void onFilesSelected(e.target.files);
                  }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.7z"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Ajouter des fichiers
                </Button>
                <span className="text-xs text-muted-foreground">Max 15MB par fichier</span>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
                      <span className="truncate mr-2">{file.name} ({Math.ceil(file.size / 1024)} KB)</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(file.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="text-foreground font-medium">Description (editeur riche)</Label>
              <div className="rounded-md border-2 dark:border-slate-600 dark:bg-slate-800 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b p-2 bg-slate-50 dark:bg-slate-900">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('bold')}>
                    B
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('italic')}>
                    I
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('underline')}>
                    U
                  </Button>
                  <Select onValueChange={(v) => applyEditorCommand('fontSize', v)}>
                    <SelectTrigger className="h-8 w-[90px]">
                      <SelectValue placeholder="Taille" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">10</SelectItem>
                      <SelectItem value="3">12</SelectItem>
                      <SelectItem value="4">14</SelectItem>
                      <SelectItem value="5">18</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="color"
                    className="h-8 w-10 p-1"
                    onChange={(e) => applyEditorCommand('foreColor', e.target.value)}
                    aria-label="Couleur texte"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('justifyLeft')}>
                    G
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('justifyCenter')}>
                    C
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('justifyRight')}>
                    D
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyEditorCommand('insertUnorderedList')}>
                    Liste
                  </Button>
                </div>
                <div
                  ref={descriptionRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[220px] p-3 outline-none"
                  onInput={() => updateForm({ descriptionHtml: descriptionRef.current?.innerHTML ?? '' })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-3 dark:border-slate-700">
          <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            Cree par: {user?.name ?? 'Inconnu'}
            {form.channel === 'PHONE' && <Phone className="h-3.5 w-3.5 ml-2" />}
            {form.channel === 'EMAIL' && <Mail className="h-3.5 w-3.5 ml-2" />}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="border-2">Annuler</Button>
          </DialogClose>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            className="font-semibold text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-900/30"
            onClick={() => void handleSubmit()}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Creation...' : 'Creer le ticket'}
          </Button>
        </DialogFooter>
      </FloatingDialogContent>
    </Dialog>
  );
}
