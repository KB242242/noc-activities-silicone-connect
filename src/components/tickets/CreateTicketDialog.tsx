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
  Check,
  ChevronsUpDown,
  Users,
  UserCheck,
  Building2,
  MapPin,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextEditor as Zarko } from '@/components/ui/rich-text-editor';
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
  | 'client_complaint'
  | 'routine_visit'
  | 'security'
  | 'maintenance'
  | 'incident'
  | 'survey';
type MaintenanceMode = 'preventive' | 'curative' | '';
type IncidentLevel = 'critical' | 'major' | '';
type TicketChannel = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'NOC_DECISION' | 'PRESENTIEL' | '';
type TicketClassification = 'NONE' | 'QUESTION' | 'PROBLEM' | 'FEATURE' | 'OTHER' | '';

interface TicketOptionItem {
  id: string;
  name: string;
  localite?: string | null;
  email?: string | null;
  hasEmail?: boolean;
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
  title: string;
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
  eta: Date | null;
  dueDate: Date | null;
  etr: Date | null;
  slaDuration: string;
  slr: string;
}

type AutoPrefillMode = 'enabled' | 'disabled_once' | 'disabled_always';

const AUTO_PREFILL_STORAGE_KEY = 'ticket_create_auto_prefill_mode';

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
  client_complaint: { label: 'Plainte Client', icon: AlertCircle },
  routine_visit: { label: 'Visite de Routine', icon: ClipboardList },
  security: { label: 'Securite', icon: Shield },
  maintenance: { label: 'Maintenance', icon: Wrench },
  incident: { label: 'Incident', icon: AlertTriangle },
  survey: { label: 'Survey', icon: Pin },
};

const CATEGORY_DEFAULT_SUBJECTS: Record<TicketCategory, string> = {
  deployment: 'TIRAGE ET RACCORDEMENT LIAISON INTERNET DU NOUVEAU BATIMENT',
  supervision: 'Supervision des travaux du Partenaire',
  ravitaillement: 'Ravitaillement de Carburant au niveau du site de Nkayi et Bouansa',
  client_complaint: 'INSTABILITE DE LA CONNEXION INTERNET',
  routine_visit: "Controle des equipements au niveau de l'entrepot Silicone - BZV",
  security: 'Detection d Intrusion sur le serveur AK1 - BZV',
  maintenance: 'Remplacement de climatiseur - Mindouli',
  incident: 'INCIDENT CRITIQUE - INTERRUPTION DES SERVICES INTERNET ET INTERCO...',
  survey: "Etude de faisabilite en vue d'un raccordement client a la Fibre Optique",
};

const SURVEY_DEFAULT_SUBJECT = 'Etude de faisabilite en vue d\'un raccordement client a la Fibre Optique';
const INCIDENT_DEFAULT_SUBJECT = 'INCIDENT CRITIQUE - INTERRUPTION DES SERVICES INTERNET ET INTERCO...';

const DEFAULT_TICKET_FORM: FormState = {
  title: INCIDENT_DEFAULT_SUBJECT,
  objet: INCIDENT_DEFAULT_SUBJECT,
  descriptionHtml: '',
  priority: 'medium',
  category: 'incident',
  maintenanceMode: '',
  incidentLevel: 'critical',
  siteIds: [],
  localities: [],
  technicianIds: [],
  ownerTechnicianId: '',
  clientIds: [],
  channel: '',
  channelRequestTime: '',
  channelEmailLink: '',
  classification: 'NONE',
  eta: null,
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
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(li|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    case 'client_complaint':
      return 'INC';
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

interface SelectMProps {
  label: string;
  labelIcon?: React.ReactNode;
  placeholder: string;
  options: Array<{ id: string; name: string; email?: string | null; hasEmail?: boolean }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
}

function SelectM({
  label,
  labelIcon,
  placeholder,
  options,
  selectedIds,
  onChange,
  searchPlaceholder = 'Rechercher...',
}: SelectMProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Reset search when closed
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(query));
  }, [options, search]);

  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedIds.includes(opt.id)),
    [options, selectedIds]
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((entry) => entry !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {labelIcon}
          {label}
        </span>
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 text-left text-sm transition-colors hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-500"
          >
            {selectedOptions.length === 0 ? (
              <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-1 rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white"
                >
                  <span className="max-w-28 truncate">{opt.name}</span>
                  <span
                    role="button"
                    aria-label={`Retirer ${opt.name}`}
                    className="cursor-pointer rounded-sm hover:bg-indigo-800"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(opt.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="p-0"
          style={{ zIndex: 9999, width: 'var(--radix-popover-trigger-width)', minWidth: '14rem' }}
        >
          <div className="border-b px-2 py-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const selected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-indigo-600/15 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggle(opt.id)}
                  >
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        selected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opt.name}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-3 text-center text-sm text-muted-foreground">Aucun résultat</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
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
  const [ticketTechnicians, setTicketTechnicians] = useState<Array<{ id: string; name: string; email?: string | null; hasEmail?: boolean }>>([]);
  const [apiSiteOptions, setApiSiteOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [apiLocalityOptions, setApiLocalityOptions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [localityInput, setLocalityInput] = useState('');
  const [autoPrefillMode, setAutoPrefillMode] = useState<AutoPrefillMode>('enabled');
  const [prefillChoiceOpen, setPrefillChoiceOpen] = useState(false);
  const etaAlertedRef = useRef<string>('');
  const clearedPrefillSnapshotRef = useRef<{ title: string; objet: string; descriptionHtml: string } | null>(null);

  const isAutoPrefillEnabled = autoPrefillMode === 'enabled';

  const readPersistedAutoPrefillMode = useCallback((): AutoPrefillMode => {
    if (typeof window === 'undefined') return 'enabled';
    return localStorage.getItem(AUTO_PREFILL_STORAGE_KEY) === 'disabled_always'
      ? 'disabled_always'
      : 'enabled';
  }, []);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setAutoPrefillMode(readPersistedAutoPrefillMode());
      clearedPrefillSnapshotRef.current = null;
      return;
    }
    if (autoPrefillMode === 'disabled_once') {
      setAutoPrefillMode(readPersistedAutoPrefillMode());
    }
  }, [autoPrefillMode, readPersistedAutoPrefillMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (autoPrefillMode === 'disabled_always') {
      localStorage.setItem(AUTO_PREFILL_STORAGE_KEY, 'disabled_always');
      return;
    }
    if (autoPrefillMode === 'enabled') {
      localStorage.removeItem(AUTO_PREFILL_STORAGE_KEY);
    }
  }, [autoPrefillMode]);

  const disablePrefillOnce = useCallback(() => {
    setForm((prev) => {
      clearedPrefillSnapshotRef.current = {
        title: String(prev.title ?? ''),
        objet: String(prev.objet ?? ''),
        descriptionHtml: String(prev.descriptionHtml ?? ''),
      };
      return {
        ...prev,
        title: '',
        objet: '',
        descriptionHtml: '',
      };
    });
    setAutoPrefillMode('disabled_once');
    setPrefillChoiceOpen(false);
    toast.success('Préremplissage désactivé pour cette fois (description libre).');
  }, []);

  const disablePrefillAlways = useCallback(() => {
    setForm((prev) => {
      clearedPrefillSnapshotRef.current = {
        title: String(prev.title ?? ''),
        objet: String(prev.objet ?? ''),
        descriptionHtml: String(prev.descriptionHtml ?? ''),
      };
      return {
        ...prev,
        title: '',
        objet: '',
        descriptionHtml: '',
      };
    });
    setAutoPrefillMode('disabled_always');
    setPrefillChoiceOpen(false);
    toast.success('Préremplissage désactivé pour toujours (description libre).');
  }, []);

  const togglePrefillFromHeader = useCallback(() => {
    if (isAutoPrefillEnabled) {
      setPrefillChoiceOpen(true);
      return;
    }
    setAutoPrefillMode('enabled');
    const snapshot = clearedPrefillSnapshotRef.current;
    if (snapshot) {
      setForm((prev) => ({
        ...prev,
        title: snapshot.title,
        objet: snapshot.objet,
        descriptionHtml: snapshot.descriptionHtml,
      }));
      clearedPrefillSnapshotRef.current = null;
    }
    setPrefillChoiceOpen(false);
    toast.success('Préremplissage activé');
  }, [isAutoPrefillEnabled]);

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
    const loadSites = async () => {
      try {
        const res = await fetch('/api/tickets/sites');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setApiSiteOptions(data.map((item: any) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() })).filter((s: any) => s.id && s.name));
        }
      } catch { /* keep resilient */ }
    };
    const loadLocalities = async () => {
      try {
        const res = await fetch('/api/tickets/localities');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setApiLocalityOptions(data.map((item: any) => String(item.label ?? item.name ?? '')).filter(Boolean));
        }
      } catch { /* keep resilient */ }
    };
    void loadSites();
    void loadLocalities();
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
              .map((item) => {
                const email = String(item.email ?? '').trim();
                const hasEmail = typeof item.hasEmail === 'boolean' ? item.hasEmail : Boolean(email);
                return {
                  id: String(item.id ?? ''),
                  name: String(item.name ?? '').trim(),
                  email: email || null,
                  hasEmail,
                };
              })
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
    // Merge prop localities with API localities
    [...localityOptions, ...apiLocalityOptions].forEach((name) => {
      const formatted = formatLocalityLabel(name);
      if (!formatted) return;
      const key = localityKey(formatted);
      if (!map.has(key)) map.set(key, formatted);
    });
    return map;
  }, [localityOptions, apiLocalityOptions]);

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

  const localitySelectOptions = useMemo(
    () => Array.from(localityLookup.entries()).map(([id, name]) => ({ id, name })),
    [localityLookup]
  );

  const mergedTechnicianOptions = useMemo(() => {
    const merged = new Map<string, { id: string; name: string; email?: string | null; hasEmail?: boolean }>();
    technicianOptions.forEach((item) => {
      const email = String(item.email ?? '').trim();
      merged.set(item.id, {
        id: item.id,
        name: item.name,
        email: email || null,
        hasEmail: typeof item.hasEmail === 'boolean' ? item.hasEmail : Boolean(email),
      });
    });
    ticketTechnicians.forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
    );
  }, [technicianOptions, ticketTechnicians]);

  const mergedSiteOptions = useMemo(() => {
    const merged = new Map<string, { id: string; name: string }>();
    siteOptions.forEach((item) => merged.set(item.id, { id: item.id, name: item.name }));
    apiSiteOptions.forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [siteOptions, apiSiteOptions]);

  const selectedOwnerName = useMemo(
    () => mergedTechnicianOptions.find((t) => t.id === form.ownerTechnicianId)?.name ?? '',
    [mergedTechnicianOptions, form.ownerTechnicianId]
  );

  const selectedClientNames = useMemo(
    () => form.clientIds.map((id) => clients.find((client) => client.id === id)?.name ?? id).filter(Boolean),
    [form.clientIds, clients]
  );

  const selectedSiteNames = useMemo(
    () => form.siteIds.map((id) => mergedSiteOptions.find((site) => site.id === id)?.name ?? id).filter(Boolean),
    [form.siteIds, mergedSiteOptions]
  );

  const selectedTechnicianNames = useMemo(
    () => form.technicianIds.map((id) => mergedTechnicianOptions.find((tech) => tech.id === id)?.name ?? id).filter(Boolean),
    [form.technicianIds, mergedTechnicianOptions]
  );

  const buildShortObject = useCallback((category: TicketCategory, clientsNames: string[], localities: string[]) => {
    const categoryLabel = (TICKET_CATEGORIES[category]?.label ?? 'Ticket').toUpperCase();
    const clientsPart = clientsNames.join(', ').trim();
    const localityPart = (() => {
      if (localities.length === 0) return '';
      if (localities.length === 1) return localities[0];
      if (localities.length === 2) return `${localities[0]} et ${localities[1]}`;
      return `${localities.slice(0, -1).join(', ')} et ${localities[localities.length - 1]}`;
    })();

    const right = [clientsPart, localityPart].filter(Boolean).join(' ');
    return right ? `${categoryLabel} - ${right}` : categoryLabel;
  }, []);

  const autoObjectText = useMemo(
    () => buildShortObject(form.category, selectedClientNames, form.localities),
    [buildShortObject, form.category, selectedClientNames, form.localities]
  );

  useEffect(() => {
    if (!open) return;
    if (!isAutoPrefillEnabled) return;
    setForm((prev) => {
      if (prev.objet === autoObjectText) return prev;
      return { ...prev, objet: autoObjectText };
    });
  }, [open, autoObjectText, isAutoPrefillEnabled]);

  const autoDescriptionText = useMemo(() => {
    const lines: string[] = [];
    const subject = form.title.trim() || form.objet.trim();
    if (subject) lines.push(subject);
    if (selectedClientNames.length > 0) lines.push(`clients: ${selectedClientNames.join(', ')}`);
    if (selectedSiteNames.length > 0) lines.push(`Site: ${selectedSiteNames.join(', ')}`);
    if (selectedTechnicianNames.length > 0) {
      lines.push(`${selectedTechnicianNames.length > 1 ? 'Techniciens assignés' : 'Technicien assigné'} : ${selectedTechnicianNames.join(', ')}`);
    }
    if (form.localities.length > 0) lines.push(`Localité: ${form.localities.join(', ')}`);
    lines.push('Statut: Ouvert');
    return lines.join('\n');
  }, [form.title, form.objet, form.localities, selectedClientNames, selectedSiteNames, selectedTechnicianNames]);

  useEffect(() => {
    if (!open) return;
    if (!isAutoPrefillEnabled) return;
    const nextHtml = autoDescriptionText
      .split('\n')
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');

    setForm((prev) => {
      if (prev.descriptionHtml === nextHtml) return prev;
      return { ...prev, descriptionHtml: nextHtml };
    });
  }, [open, autoDescriptionText, isAutoPrefillEnabled]);

  const onCategoryChange = useCallback((value: TicketCategory) => {
    const nextUpdates: Partial<FormState> = { category: value };
    if (value !== 'maintenance') nextUpdates.maintenanceMode = '';
    if (value !== 'incident') nextUpdates.incidentLevel = '';
    if (isAutoPrefillEnabled) {
      nextUpdates.title = CATEGORY_DEFAULT_SUBJECTS[value];
      nextUpdates.objet = buildShortObject(value, selectedClientNames, form.localities);
    }
    nextUpdates.classification = form.classification || 'NONE';
    updateForm(nextUpdates);
  }, [buildShortObject, form.classification, form.localities, isAutoPrefillEnabled, selectedClientNames, updateForm]);

  useEffect(() => {
    if (!open || form.category !== 'incident' || !form.eta) return;
    const etaKey = form.eta.toISOString();
    const emitEtaWarning = () => {
      if (etaAlertedRef.current === etaKey) return;
      etaAlertedRef.current = etaKey;
      toast.error('Veuillez prendre une mise a jour car l ETA est depasse');
    };

    const delay = form.eta.getTime() - Date.now();
    if (delay <= 0) {
      emitEtaWarning();
      return;
    }

    const timeoutId = window.setTimeout(emitEtaWarning, delay);
    return () => window.clearTimeout(timeoutId);
  }, [open, form.category, form.eta]);

  const isEtaExpired = useMemo(() => {
    if (form.category !== 'incident' || !form.eta) return false;
    return form.eta.getTime() <= Date.now();
  }, [form.category, form.eta]);

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
    const resolvedObjet = form.objet.trim();
    if (!resolvedObjet) {
      toast.error("L'objet du ticket est requis");
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
    if (form.category === 'incident' && !form.eta) {
      toast.error('Veuillez renseigner ETA pour un incident');
      return;
    }
    if (form.category === 'incident' && form.eta && form.eta.getTime() <= Date.now()) {
      toast.error('Veuillez prendre une mise a jour car l ETA est depasse');
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

      const descriptionHtml = form.descriptionHtml;
      const descriptionText = stripHtml(descriptionHtml);
      const owner = mergedTechnicianOptions.find((t) => t.id === form.ownerTechnicianId);

      const payload = {
        type: mapCategoryToApiType(form.category, form.maintenanceMode),
        objet: resolvedObjet,
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
        eta: form.eta?.toISOString() ?? null,
        dueDate: form.dueDate?.toISOString() ?? null,
        etr: form.etr?.toISOString() ?? null,
        classification: form.classification === 'NONE' ? null : (form.classification || null),
        channel: form.channel || null,
        channelRequestTime: form.channelRequestTime || null,
        channelEmailLink: form.channelEmailLink || null,
        descriptionHtml,
        title: form.title,
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
        const serverMessage = String(err?.message ?? err?.error ?? '').trim();
        toast.error(serverMessage || `Creation impossible (code ${res.status})`);
        return;
      }

      const ticket = await res.json();
      onTicketCreated(ticket);
      setForm(DEFAULT_TICKET_FORM);
      setAttachments([]);
      setLocalityInput('');
      setOpen(false);
      await onRefreshTickets();
      toast.success('Ticket cree', { description: `Le ticket ${ticket.numero ?? ''} a ete cree` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || 'Impossible de creer le ticket');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    form,
    buildShortObject,
    selectedClientNames,
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
        className="z-80 overflow-hidden rounded-xl border-2 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-900 grid grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        <div className="absolute top-0 left-3 right-3 h-1.25 cursor-ns-resize z-30 select-none" onMouseDown={startResize('n')} />
        <div className="absolute bottom-0 left-3 right-3 h-1.25 cursor-ns-resize z-30 select-none" onMouseDown={startResize('s')} />
        <div className="absolute top-3 bottom-3 right-0 w-1.25 cursor-ew-resize z-30 select-none" onMouseDown={startResize('e')} />
        <div className="absolute top-3 bottom-3 left-0 w-1.25 cursor-ew-resize z-30 select-none" onMouseDown={startResize('w')} />
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
            <div className="ml-2 flex items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
              <Popover open={prefillChoiceOpen} onOpenChange={setPrefillChoiceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={togglePrefillFromHeader}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${isAutoPrefillEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {isAutoPrefillEnabled ? 'Préremplissage activé' : 'Préremplissage désactivé'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="z-10000 w-64 p-2">
                  <p className="px-2 py-1 text-xs text-muted-foreground">Choisir le mode de désactivation</p>
                  <div className="grid gap-1">
                    <Button type="button" variant="ghost" className="justify-start" onClick={disablePrefillOnce}>
                      Désactivé pour cette fois
                    </Button>
                    <Button type="button" variant="ghost" className="justify-start" onClick={disablePrefillAlways}>
                      Désactivé pour toujours
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <DialogClose asChild>
                <button
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-60 transition-all hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-5 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-2 lg:col-span-2">
                <Label className="text-foreground font-medium">Objet <span className="text-destructive">*</span></Label>
                <Input
                  value={form.objet}
                  onChange={(e) => updateForm({ objet: e.target.value })}
                  placeholder="Objet du ticket"
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-2 lg:col-span-2">
                <Label className="text-foreground font-medium">Titre</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder="Titre du ticket"
                  className="border-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Classification</Label>
                <Select value={form.classification} onValueChange={(v: TicketClassification) => updateForm({ classification: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="NONE">Aucun</SelectItem>
                    <SelectItem value="QUESTION">Question</SelectItem>
                    <SelectItem value="PROBLEM">Problem</SelectItem>
                    <SelectItem value="FEATURE">Feature</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-foreground font-medium">Canal utilisé</Label>
                <Select value={form.channel} onValueChange={(v: TicketChannel) => updateForm({ channel: v })}>
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="PHONE">Par Appel</SelectItem>
                    <SelectItem value="WHATSAPP">Par WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Par Mail</SelectItem>
                    <SelectItem value="NOC_DECISION">Décidé par le NOC</SelectItem>
                    <SelectItem value="PRESENTIEL">En présentiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SelectM
                label="Client"
                labelIcon={<Users className="h-3.5 w-3.5" />}
                placeholder="Selectionner client(s)"
                options={clients}
                selectedIds={form.clientIds}
                onChange={(clientIds) => updateForm({ clientIds })}
              />

              <SelectM
                label="Technicien assigne"
                labelIcon={<UserCheck className="h-3.5 w-3.5" />}
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
              <SelectM
                label="Site"
                labelIcon={<Building2 className="h-3.5 w-3.5" />}
                placeholder="Selectionner site(s)"
                options={mergedSiteOptions}
                selectedIds={form.siteIds}
                onChange={(siteIds) => updateForm({ siteIds })}
              />

              <div className="grid gap-2">
                <SelectM
                  label="Localité"
                  labelIcon={<MapPin className="h-3.5 w-3.5" />}
                  placeholder="Selectionner localite(s)"
                  options={localitySelectOptions}
                  selectedIds={form.localities.map((loc) => localityKey(loc))}
                  onChange={(selectedLocalityIds) => {
                    const selectedLocalities = selectedLocalityIds
                      .map((id) => localitySelectOptions.find((opt) => opt.id === id)?.name)
                      .filter((value): value is string => Boolean(value));
                    updateForm({ localities: selectedLocalities });
                  }}
                />

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

            <div className={`grid grid-cols-1 gap-4 ${form.category === 'incident' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="grid gap-2">
                <Label className="text-foreground font-medium inline-flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  Proprietaire du ticket
                </Label>
                <Select
                  value={form.ownerTechnicianId}
                  onValueChange={(ownerTechnicianId) => updateForm({
                    ownerTechnicianId,
                    technicianIds: form.technicianIds.includes(ownerTechnicianId)
                      ? form.technicianIds
                      : [...form.technicianIds, ownerTechnicianId],
                  })}
                >
                  <SelectTrigger className="border-2 dark:border-slate-600 dark:bg-slate-800">
                    <SelectValue placeholder="Choisir parmi techniciens assignes" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    {(form.technicianIds.length > 0 ? mergedTechnicianOptions.filter((t) => form.technicianIds.includes(t.id)) : mergedTechnicianOptions)
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
                <p className="text-xs text-muted-foreground">Le proprietaire est ajoute automatiquement aux techniciens assignes.</p>
              </div>

              {form.category === 'incident' && (
                <div className="grid gap-2">
                  <Label className="text-foreground font-medium">ETA</Label>
                  <Input
                    type="datetime-local"
                    value={form.eta ? format(form.eta, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => updateForm({ eta: e.target.value ? new Date(e.target.value) : null })}
                    className="border-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <p className="text-xs text-muted-foreground">Temps estime d arrivee des techniciens sur le lieu d impact.</p>
                  {isEtaExpired && (
                    <p className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                      ETA depasse: veuillez prendre une mise a jour.
                    </p>
                  )}
                </div>
              )}

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
                <p className="text-xs text-muted-foreground">Temps estimé pour la resolution de l'Incident.</p>
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
              <Label className="text-foreground font-medium">Description</Label>
              <Zarko
                value={form.descriptionHtml}
                onChange={(html) => updateForm({ descriptionHtml: html })}
                placeholder="Saisir la description..."
                minHeight="220px"
                enableTicketReferences
                className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
              />
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
