'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  AlignLeft,
  AlignRight,
  Archive,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Eye,
  Folder,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  LayoutGrid,
  Link as LinkIcon,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Moon,
  Network,
  Paperclip,
  Pause,
  Pin,
  Phone,
  RefreshCcw,
  Search,
  List,
  Settings,
  Shield,
  Sun,
  Ticket,
  Truck,
  Trash2,
  User,
  Undo2,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-55 rounded-md border bg-muted/20" />,
  }
);

const Zarko = RichTextEditor;

// ── Ticket form constants ─────────────────────────────────────────────────────
const EDIT_CATEGORIES = [
  { value: 'incident', label: 'Incident' },
  { value: 'deployment', label: 'Déploiement' },
  { value: 'supervision', label: 'Supervision' },
  { value: 'ravitaillement', label: 'Ravitaillement' },
  { value: 'routine_visit', label: 'Visite de Routine' },
  { value: 'security', label: 'Sécurité' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'survey', label: 'Survey' },
];

const EDIT_PRIORITIES = [
  { value: 'LOW', label: 'Faible' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'CRITICAL', label: 'Critique' },
];

const EDIT_SITES = [
  'HQSC PNR', 'MGK2', 'BONDI', 'DOLISIE', 'LOUDIMA', 'NKAYI', 'BOUANSA',
  'MINDOULI', 'TLP', 'ELBO', 'BACONGO', 'DJIRI', 'PNR', 'BZV',
];

const EDIT_LOCALITIES = [
  'Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Loudima', 'Mindouli', 'Bouansa',
];

const EDIT_SLA_OPTIONS = ['1h', '4h', '8h', '24h', '48h', '72h'];

const FALLBACK_USER = {
  id: 'super-admin-1',
  name: 'Admin',
  pseudo: 'admin',
  email: 'secureadmin@siliconeconnect.com',
  role: 'USER' as const,
  avatar: '/profile-avatars/super-admin-1/avatar.png',
  shift: null,
};

const TECH_UNITS = ['Datacom', 'System', 'NOC', 'Technicien de terain', 'Electricite'] as const;

const ESCALATION_TARGET_OPTIONS = ['Superviseur', 'Manager', 'Fournisseur', 'Directeur Technique', 'Partenaire'] as const;
const DEFAULT_DUE_DAYS = 3;
const PENDING_REASON_OPTIONS = ['Fiche', 'Materiel', 'Prespitation', 'Mauvais temps', 'Prestataires', 'Reporte', 'Ajourne'] as const;
const PENDING_REASON_LABELS: Record<(typeof PENDING_REASON_OPTIONS)[number], string> = {
  Fiche: 'Fiche',
  Materiel: 'Materiel',
  Prespitation: 'Prespitation',
  'Mauvais temps': 'Mauvais temps',
  Prestataires: 'Prestataires',
  Reporte: 'Reporté',
  Ajourne: 'Ajourné',
};
const AJOURNED_PENDING_CATEGORIES = [
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Intervention', label: 'Intervention' },
  { value: 'Securite', label: 'Sécurité' },
  { value: 'Supervision', label: 'Supervision' },
] as const;
const dueHourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const dueMinuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

// Propriétaires autorisés du ticket (maximum 2)
const AUTHORIZED_TICKET_OWNERS: string[] = ['technician-1', 'technician-2']; // À remplacer par les vrais IDs si nécessaire

type DetailTab =
  | 'conversations'
  | 'resolution'
  | 'time'
  | 'attachments'
  | 'activity'
  | 'approval'
  | 'history';

type HistoryFilter = 'all' | 'time_entry' | 'subtask' | 'status' | 'comment' | 'other';
type AttachmentKindFilter = 'all' | 'images' | 'documents' | 'autres';
type AttachmentViewMode = 'folders' | 'grid' | 'list';
type ActivityPanelMode = 'create' | 'merge';
type ActivityKind = 'call' | 'task' | 'event';
type MergeBehavior = 'group' | 'merge';
type ActivityContextForm = {
  callContactName: string;
  callContactPhone: string;
  callWhen: string;
  taskDeadline: string;
  taskRequester: string;
  eventStartAt: string;
  eventEndAt: string;
  eventLocation: string;
};
type PendingReasonOption = typeof PENDING_REASON_OPTIONS[number];
type DeleteConfirmTarget =
  | { kind: 'comment'; id: string }
  | { kind: 'time_entry'; id: string }
  | { kind: 'activity'; id: string }
  | null;

const RESOLUTION_COMMENT_PREFIX = '[RESOLUTION:';
const ATTACHMENT_COMMENT_PREFIX = '[ATTACHMENT_COMMENT:';

function encodeResolutionComment(category: string, html: string) {
  return `${RESOLUTION_COMMENT_PREFIX}${String(category || '').trim()}]\n${String(html ?? '')}`;
}

function parseResolutionComment(content: unknown): { category: string; html: string } | null {
  const raw = String(content ?? '');
  if (!raw.startsWith(RESOLUTION_COMMENT_PREFIX)) return null;

  const closingIndex = raw.indexOf(']');
  if (closingIndex < 0) return null;

  const category = raw.slice(RESOLUTION_COMMENT_PREFIX.length, closingIndex).trim();
  const html = raw.slice(closingIndex + 1).replace(/^\s*\n?/, '');

  return {
    category: category || 'probleme_energetique',
    html,
  };
}

function toPlainTextFromHtml(input: string) {
  return String(input ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodeAttachmentComment(attachmentId: string, message: string) {
  return `${ATTACHMENT_COMMENT_PREFIX}${String(attachmentId || '').trim()}]\n${String(message ?? '').trim()}`;
}

function parseAttachmentComment(content: unknown): { attachmentId: string; message: string } | null {
  const raw = String(content ?? '');
  if (!raw.startsWith(ATTACHMENT_COMMENT_PREFIX)) return null;
  const closingIndex = raw.indexOf(']');
  if (closingIndex < 0) return null;
  const attachmentId = raw.slice(ATTACHMENT_COMMENT_PREFIX.length, closingIndex).trim();
  const message = raw.slice(closingIndex + 1).replace(/^\s*\n?/, '').trim();
  if (!attachmentId) return null;
  return { attachmentId, message };
}

function formatFileSize(bytes: number) {
  const size = Number(bytes ?? 0);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function classifyAttachmentKind(file: { mimeType?: string; name?: string }) {
  const mimeType = String(file.mimeType ?? '').toLowerCase();
  const name = String(file.name ?? '').toLowerCase();

  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name)) return 'images';
  if (
    mimeType.includes('pdf')
    || mimeType.includes('word')
    || mimeType.includes('excel')
    || mimeType.includes('sheet')
    || mimeType.includes('powerpoint')
    || mimeType.includes('presentation')
    || mimeType.includes('text')
    || /\.(pdf|docx?|xlsx?|csv|pptx?|txt|rtf|odt|ods|odp)$/i.test(name)
  ) {
    return 'documents';
  }
  return 'autres';
}

function resolveCategoryLabel(value?: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'ticket';
  if (normalized === 'inc') return 'Incident';
  if (normalized === 'mnt' || normalized === 'maint') return 'Maintenance';
  if (normalized === 'sur' || normalized === 'srv') return 'Survey';
  if (normalized === 'dep') return 'Déploiement';
  if (normalized === 'sup') return 'Supervision';
  const match = EDIT_CATEGORIES.find((entry) => entry.value === normalized);
  return match?.label ?? (normalized ? normalized.replace(/_/g, ' ') : 'ticket');
}

function resolveCategoryContinuation(value?: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'incident' || normalized === 'inc') return "la resolution de l'incident";
  if (normalized === 'maintenance' || normalized === 'mnt' || normalized === 'maint') return 'la maintenance';
  if (normalized === 'survey' || normalized === 'sur' || normalized === 'srv') return 'le survey';
  if (normalized === 'deployment' || normalized === 'dep') return 'le déploiement';
  if (normalized === 'supervision' || normalized === 'sup') return 'la supervision';
  if (normalized === 'ravitaillement') return 'le ravitaillement';
  if (normalized === 'routine_visit') return 'la visite de routine';
  if (normalized === 'security') return 'la sécurité';
  return 'le traitement du ticket';
}

function startsWithFrenchVowelSound(value?: string | null) {
  const first = String(value ?? '').trim().charAt(0).toLowerCase();
  return /[aeiouyhàâäéèêëîïôöùûü]/.test(first);
}

function formatFrenchDeCategory(value?: string | null) {
  const categoryLabel = String(value ?? '').trim() || 'ticket';
  return startsWithFrenchVowelSound(categoryLabel)
    ? `d'${categoryLabel}`
    : `de ${categoryLabel}`;
}

function formatDeferredDateLabel(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return format(parsed, 'dd MMM yyyy, HH:mm', { locale: fr });
}

function buildPendingReasonMessage(input: {
  reasonPreset?: string | null;
  reasonCustom?: string | null;
  categoryLabel?: string | null;
  technicianLabel?: string | null;
  postponedUntil?: string | null;
  adjournedCategory?: string | null;
}) {
  const categoryLabel = String(input.categoryLabel ?? '').trim() || 'ticket';
  const categoryContinuation = resolveCategoryContinuation(categoryLabel);
  const technicianLabel = String(input.technicianLabel ?? '').trim() || 'du technicien';
  const reasonPreset = String(input.reasonPreset ?? '').trim();
  const normalizedCustomReason = normalizeSentenceInput(String(input.reasonCustom ?? ''));
  const postponedUntil = String(input.postponedUntil ?? '').trim();
  const postponedUntilLabel = formatDeferredDateLabel(postponedUntil);
  const adjournedCategory = String(input.adjournedCategory ?? '').trim();

  let sentence = '';
  if (reasonPreset === 'Fiche') {
    sentence = `Ticket mis en attente de la fiche ${formatFrenchDeCategory(categoryLabel)} auprès ${technicianLabel}.`;
  } else if (reasonPreset === 'Materiel') {
    sentence = `Ce ticket a été mis en attente de matériel afin de poursuivre ${categoryContinuation}.`;
  } else if (reasonPreset === 'Prespitation') {
    sentence = `Ce ticket a été mis en attente en raison des précipitations, ne permettant pas de poursuivre ${categoryContinuation} sur site.`;
  } else if (reasonPreset === 'Mauvais temps') {
    sentence = `Ce ticket a été mis en attente à cause des mauvaises conditions météorologiques qui empêchent de poursuivre ${categoryContinuation}.`;
  } else if (reasonPreset === 'Prestataires') {
    sentence = `Ce ticket a été mis en attente du retour des prestataires afin de poursuivre ${categoryContinuation}.`;
  } else if (reasonPreset === 'Reporte' && postponedUntilLabel) {
    sentence = `Ce ticket a été reporté au ${postponedUntilLabel} avant reprise du traitement.`;
  } else if (reasonPreset === 'Ajourne' && adjournedCategory) {
    sentence = `Ce ticket a été ajourné pour la catégorie ${adjournedCategory}.`;
  }

  if (reasonPreset === 'Reporte' && !postponedUntilLabel) return '';
  if (reasonPreset === 'Ajourne' && !adjournedCategory) return '';

  if (!sentence && normalizedCustomReason) {
    const startsWithPreposition = /^(de|du|des|pour|par|suite a|suite à|en attente de|en raison de|a cause de|à cause de)\b/i.test(normalizedCustomReason);
    sentence = startsWithPreposition
      ? `Ce ticket a été mis en attente ${normalizedCustomReason} afin de poursuivre ${categoryContinuation}.`
      : `Ce ticket a été mis en attente pour ${normalizedCustomReason} afin de poursuivre ${categoryContinuation}.`;
  }

  if (sentence && normalizedCustomReason && reasonPreset) {
    sentence = `${sentence.replace(/[.]+$/g, '')}. Détail: ${normalizedCustomReason}.`;
  }

  return sentence;
}

function synchronizePendingReasonWithCategory(input: {
  reasonMessage?: string | null;
  reasonPreset?: string | null;
  reasonCustom?: string | null;
  categoryLabel?: string | null;
  technicianLabel?: string | null;
  postponedUntil?: string | null;
  adjournedCategory?: string | null;
}) {
  const rebuilt = buildPendingReasonMessage(input);
  if (rebuilt) return rebuilt;

  const raw = String(input.reasonMessage ?? '').trim();
  if (!raw) return '';

  if (/ticket\s+mis\s+en\s+attente\s+de\s+la\s+fiche/i.test(raw)) {
    const fallbackTechnician = String(input.technicianLabel ?? '').trim() || 'du technicien';
    const technicianFromReason = raw.match(/auprès\s+(.+?)(?:\.|$)/i)?.[1]?.trim() || fallbackTechnician;
    const categoryLabel = String(input.categoryLabel ?? '').trim() || 'ticket';
    return `Ticket mis en attente de la fiche ${formatFrenchDeCategory(categoryLabel)} auprès ${technicianFromReason}.`;
  }

  return raw;
}

function normalizeSentenceInput(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/[.]+$/g, '');
}

function resolveActorDisplayName(input: { pseudo?: unknown; name?: unknown; email?: unknown }) {
  const pseudo = String(input.pseudo ?? '').trim();
  if (pseudo) return pseudo;
  const name = String(input.name ?? '').trim();
  if (name) return name;
  const email = String(input.email ?? '').trim();
  if (email.includes('@')) return email.split('@')[0].trim();
  return email || 'Utilisateur';
}

function resolveBadge(status?: string) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'CLOSED') return { label: 'Ferme', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (normalized === 'OPEN') return { label: 'Ouvert', className: 'bg-sky-100 text-sky-700 border-sky-200' };
  if (normalized === 'IN_PROGRESS') return { label: 'En cours', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (normalized === 'ESCALATED') return { label: 'Escalade', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (normalized === 'PENDING') return { label: 'En attente', className: 'bg-violet-100 text-violet-700 border-violet-200' };
  return { label: normalized || 'Inconnu', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function formatMaybeDate(value?: string | Date | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return format(parsed, 'dd MMM yyyy, HH:mm', { locale: fr });
}

function toDateTimeLocalInput(value?: string | Date | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return format(parsed, "yyyy-MM-dd'T'HH:mm");
}

function normalizeAvatarPath(value?: string | null, userId?: string) {
  const src = String(value ?? '').trim().replace(/\\/g, '/');
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  if (src.startsWith('/public/')) return src.slice('/public'.length);
  if (src.startsWith('public/')) return `/${src.slice('public/'.length)}`;
  if (src.startsWith('/')) return src;
  if (src.startsWith('profile-avatars/') || src.startsWith('upload/')) return `/${src}`;
  if (userId && !src.includes('/') && /\.(png|jpe?g|webp|gif|svg)$/i.test(src)) {
    return `/profile-avatars/${userId}/${src}`;
  }
  return `/${src}`;
}

function isImageAttachment(url: string, mimeType?: string) {
  if (mimeType?.startsWith('image/')) return true;
  return /^data:image\//.test(url);
}

function isPdfAttachment(file: { url?: string; mimeType?: string; name?: string }) {
  const mimeType = String(file.mimeType ?? '').toLowerCase();
  if (mimeType === 'application/pdf') return true;
  const name = String(file.name ?? '').toLowerCase();
  return name.endsWith('.pdf');
}

function canPreviewAttachment(file: { url?: string; mimeType?: string; name?: string }) {
  const url = String(file.url ?? '').trim();
  if (!url) return false;
  return isImageAttachment(url, file.mimeType) || isPdfAttachment(file);
}

function getAttachmentPreviewRestrictionMessage(file: { mimeType?: string; name?: string }) {
  const name = String(file.name ?? '').toLowerCase();
  const mimeType = String(file.mimeType ?? '').toLowerCase();
  if (/(\.docx?|\.xlsx?|\.pptx?)$/i.test(name) || /application\/(msword|vnd\.)/.test(mimeType)) {
    return 'Le document Word/Excel/PowerPoint ne peut pas etre lu directement dans l\'application.';
  }
  return 'Ce type de fichier ne peut pas etre previsualise directement dans l\'application.';
}

function sanitizeDescriptionSelectionArtifacts(html: string) {
  if (!html || typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('[data-rte-image-wrapper="true"]').forEach((node) => {
    const wrapper = node as HTMLElement;
    wrapper.style.outline = 'none';
    wrapper.style.outlineOffset = '0';
    wrapper.style.border = '1px solid transparent';
  });

  doc.querySelectorAll('[data-rte-image-handle="true"]').forEach((node) => {
    const handle = node as HTMLElement;
    handle.style.display = 'none';
  });

  return doc.body.innerHTML;
}

function adaptRichContentToTheme(html: string) {
  const sanitized = sanitizeDescriptionSelectionArtifacts(html);
  if (!sanitized || typeof window === 'undefined') return sanitized;

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  doc.querySelectorAll('*').forEach((node) => {
    const element = node as HTMLElement;
    if (!element) return;

    // Remove fixed text color so light/dark theme can control readability.
    element.style.removeProperty('color');

    if (element.tagName.toLowerCase() === 'font') {
      element.removeAttribute('color');
    }

    const styleAttr = element.getAttribute('style');
    if (styleAttr !== null && element.style.length === 0) {
      element.removeAttribute('style');
    }
  });

  return doc.body.innerHTML;
}

function getTicketUrl(id: string) {
  if (typeof window === 'undefined') return `/tickets/${id}`;
  return `${window.location.origin}/tickets/${id}`;
}

function getMainTabHref(tab: string) {
  return tab === 'dashboard' ? '/' : `/?tab=${encodeURIComponent(tab)}`;
}

function normalizeTicketReference(value: string) {
  return String(value ?? '').trim().replace(/^#/, '');
}

function parseTicketReferenceInput(value: string) {
  const tokens = String(value ?? '')
    .split(/[\s,;\n]+/)
    .map((token) => normalizeTicketReference(token))
    .filter(Boolean);

  return Array.from(new Set(tokens));
}

function getActivityKindLabel(kind: ActivityKind) {
  if (kind === 'call') return 'Appeler';
  if (kind === 'event') return 'Evenement';
  return 'Nouvelle tache';
}

function formatActivityContextDate(value: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return format(parsed, 'dd MMM yyyy, HH:mm', { locale: fr });
}

const EMPTY_ACTIVITY_CONTEXT_FORM: ActivityContextForm = {
  callContactName: '',
  callContactPhone: '',
  callWhen: '',
  taskDeadline: '',
  taskRequester: '',
  eventStartAt: '',
  eventEndAt: '',
  eventLocation: '',
};

function MainSidebarLink({
  tab,
  variant = 'ghost',
  size,
  className,
  children,
}: {
  tab: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={getMainTabHref(tab)} prefetch scroll={false}>
        {children}
      </Link>
    </Button>
  );
}

async function copyText(value: string, label: string) {
  const text = String(value ?? '').trim();
  if (!text) {
    toast.warning(`Aucune valeur a copier pour ${label.toLowerCase()}`);
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) throw new Error('execCommand copy failed');
    }
    toast.success(`${label} copie`);
  } catch {
    toast.error(`Impossible de copier ${label.toLowerCase()}. Verifiez les permissions du navigateur.`);
  }
}

export default function TicketDetailShell({ ticket }: { ticket: any }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const goToTicketsList = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace('/?tab=tickets');
  };

  const goToTicketsView = (view: 'active' | 'archive' | 'trash') => {
    router.push(`/?tab=tickets&ticketsView=${view}`);
  };

  const [user, setUser] = useState(FALLBACK_USER);
  const [mounted, setMounted] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [sidebarGroupOpen, setSidebarGroupOpen] = useState({ noc: true });

  const [ticketState, setTicketState] = useState<any>(ticket);
  const [historyEntries, setHistoryEntries] = useState<any[]>(Array.isArray(ticket.history) ? ticket.history : []);
  const [timeEntries, setTimeEntries] = useState<any[]>(Array.isArray(ticket.timeEntries) ? ticket.timeEntries : []);
  const [subTasks, setSubTasks] = useState<any[]>(Array.isArray(ticket.subTasks) ? ticket.subTasks : []);
  const [dueDateDraft, setDueDateDraft] = useState<string>(
    ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [dueDatePickerDate, setDueDatePickerDate] = useState<Date | undefined>(
    ticket.dueDate ? new Date(ticket.dueDate) : undefined
  );
  const [dueDatePickerHour, setDueDatePickerHour] = useState<string>(
    ticket.dueDate ? format(new Date(ticket.dueDate), 'HH') : '00'
  );
  const [dueDatePickerMinute, setDueDatePickerMinute] = useState<string>(
    ticket.dueDate ? format(new Date(ticket.dueDate), 'mm') : '00'
  );
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<DetailTab>('conversations');
  const [ticketIdMenuOpen, setTicketIdMenuOpen] = useState(false);
  const ticketIdMenuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createTechnicianOpen, setCreateTechnicianOpen] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [submittingTech, setSubmittingTech] = useState(false);

  const [resolutionCategory, setResolutionCategory] = useState('probleme_energetique');
  const [resolutionText, setResolutionText] = useState('');
  const [timeEntryText, setTimeEntryText] = useState('');
  const [timeDate, setTimeDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [activityFlashDismissed, setActivityFlashDismissed] = useState(false);
  const [activityPanelMode, setActivityPanelMode] = useState<ActivityPanelMode>('create');
  const [activityKind, setActivityKind] = useState<ActivityKind>('task');
  const [activityForm, setActivityForm] = useState({
    objet: '',
    description: '',
    priority: 'MEDIUM',
    category: 'incident',
    referenceTicketInput: '',
  });
  const [activityContextForm, setActivityContextForm] = useState<ActivityContextForm>(EMPTY_ACTIVITY_CONTEXT_FORM);
  const [activitySelectedReferenceIds, setActivitySelectedReferenceIds] = useState<string[]>([]);
  const [activitySelectedTechnicianIds, setActivitySelectedTechnicianIds] = useState<string[]>([]);
  const [activityManualTechnicians, setActivityManualTechnicians] = useState<string[]>([]);
  const [activityManualTechnicianDraft, setActivityManualTechnicianDraft] = useState('');
  const [activityManualTechnicianInputOpen, setActivityManualTechnicianInputOpen] = useState(false);
  const [activitySelectedLocalities, setActivitySelectedLocalities] = useState<string[]>([]);
  const [activityLocalityOptions, setActivityLocalityOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [activityTicketSuggestions, setActivityTicketSuggestions] = useState<Array<{
    id: string;
    numero: string;
    objet: string;
    status: string;
  }>>([]);
  const [activitySuggestionsOpen, setActivitySuggestionsOpen] = useState(false);
  const [mergeTicketQuery, setMergeTicketQuery] = useState('');
  const [mergeTicketSuggestions, setMergeTicketSuggestions] = useState<Array<{
    id: string;
    numero: string;
    objet: string;
    status: string;
  }>>([]);
  const [mergeSuggestionsOpen, setMergeSuggestionsOpen] = useState(false);
  const [mergeSelectedTicketRefs, setMergeSelectedTicketRefs] = useState<string[]>([]);
  const [mergeBehavior, setMergeBehavior] = useState<MergeBehavior>('group');
  const [mergeBusy, setMergeBusy] = useState(false);
  const [conversationCommentText, setConversationCommentText] = useState('');
  const [conversationCommentVisibility, setConversationCommentVisibility] = useState<'public' | 'private'>('public');
  const [conversationComposerOpen, setConversationComposerOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingReasonPreset, setPendingReasonPreset] = useState<PendingReasonOption | ''>('');
  const [pendingReasonCustom, setPendingReasonCustom] = useState('');
  const [pendingReportedUntil, setPendingReportedUntil] = useState('');
  const [pendingAdjournedCategory, setPendingAdjournedCategory] = useState('');
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalationDialogTab, setEscalationDialogTab] = useState<'matrix' | 'custom'>('custom');
  // Escalation state
  const [escalationTargets, setEscalationTargets] = useState<string[]>([]);
  const [escalationCustomTarget, setEscalationCustomTarget] = useState('');
  const [escalationLevel, setEscalationLevel] = useState<string>('');
  const [escalationMatrixDomain, setEscalationMatrixDomain] = useState<string>('NOC');

  // Escalation matrix (static for now, could be moved to a config or API)
  const ESCALATION_MATRIX = [
    { domain: 'NOC', levels: [
      { level: 'Level 1', name: 'NOC', contact: 'noc@siliconeconnect.com' },
      { level: 'Level 2', name: 'Dady AZUMY', contact: 'Manager technique' },
      { level: 'Level 2', name: 'Dady AZUMY', contact: 'Responsable Transmission' },
      { level: 'Level 3', name: 'Venance Ngoma', contact: 'Directeur Technique' },
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
    { domain: 'Commercial', levels: [
      { level: 'Level 1', name: 'Service Commercial', contact: 'Service Commercial' },
      { level: 'Level 2', name: 'Responsable Commercial  & Marketing', contact: 'Clive AKOUALA' },
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
    { domain: 'Provisionning', levels: [
      { level: 'Level 1', name: 'Responsable Commercial  & Marketing', contact: 'Clive AKOUALA' },
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
    { domain: 'Gestion des incidents', levels: [
      { level: 'Level 1', name: 'Dady AZUMY', contact: 'Responsable NOC' },
      { level: 'Level 2', name: 'Dady AZUMY', contact: 'Responsable Transmission' },
      { level: 'Level 3', name: 'Venance Ngoma', contact: 'Directeur Technique' },
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
    { domain: 'Facturation', levels: [
      { level: 'Level 1', name: 'Clive AKOUALA', contact: 'Responsable Commercial  & Marketing' },
      { level: 'Level 2', name: 'Marcellina ELENGA', contact: 'Finance & Comptabilité' },
      { level: 'Level 3', name: 'Karl Leth BOUKA', contact: 'Directeur Administratif et Financier' },
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
    { domain: 'Direction Generale', levels: [
      { level: 'Level 4', name: 'Directeur Général', contact: 'Directeur Général' },
    ] },
  ];
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [pinnedCommentIds, setPinnedCommentIds] = useState<string[]>([]);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [lifecycleActionLoading, setLifecycleActionLoading] = useState(false);
  const [trashDeleteLoading, setTrashDeleteLoading] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [trashDeleteDialogOpen, setTrashDeleteDialogOpen] = useState(false);
  const [exactDatesDialogOpen, setExactDatesDialogOpen] = useState(false);
  const [exactStartAtDraft, setExactStartAtDraft] = useState('');
  const [exactClosedAtDraft, setExactClosedAtDraft] = useState('');
  const [closeTicketWithExactDate, setCloseTicketWithExactDate] = useState(false);
  const [exactDatesSaving, setExactDatesSaving] = useState(false);
  const [deletingExactDates, setDeletingExactDates] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DeleteConfirmTarget>(null);
  const [deleteBusyKey, setDeleteBusyKey] = useState<string | null>(null);
  const [archiveReasonType, setArchiveReasonType] = useState<'open' | 'escalated' | 'pending'>('open');
  const [archiveReasonText, setArchiveReasonText] = useState('');
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [editingTimeDraft, setEditingTimeDraft] = useState({ date: '', startTime: '', endTime: '', note: '' });
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityText, setEditingActivityText] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [expandedDescriptionImageSrc, setExpandedDescriptionImageSrc] = useState<string | null>(null);
  const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentCommentDrafts, setAttachmentCommentDrafts] = useState<Record<string, string>>({});
  const [attachmentPreview, setAttachmentPreview] = useState<any | null>(null);
  const [attachmentViewMode, setAttachmentViewMode] = useState<AttachmentViewMode>('folders');
  const [attachmentSearch, setAttachmentSearch] = useState('');
  const [attachmentTypeFilter, setAttachmentTypeFilter] = useState<AttachmentKindFilter>('all');
  const [attachmentUploaderFilter, setAttachmentUploaderFilter] = useState('all');
  const [attachmentFolderFilter, setAttachmentFolderFilter] = useState<AttachmentKindFilter>('all');
  const [editingResolutionCommentId, setEditingResolutionCommentId] = useState<string | null>(null);
  const [resolutionComposerOpen, setResolutionComposerOpen] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogPosition, setEditDialogPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingEditDialog, setIsDraggingEditDialog] = useState(false);
  const editDialogDragOffsetRef = useRef({ x: 0, y: 0 });
  const editDialogContentElRef = useRef<HTMLElement | null>(null);
  const conversationComposerRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [ticketTechnicianOptions, setTicketTechnicianOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [ticketClientOptions, setTicketClientOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [clientForm, setClientForm] = useState({
    name: '',
    accountNumber: '',
    address: '',
    phone: '',
    city: '',
    district: '',
    email: '',
    principalResponsable: '',
    clientType: 'Entreprise',
    serviceType: 'Internet',
    contractStartDate: '',
    consumptionDate: '',
    contactPersons: [{ name: '', email: '', phone: '' }],
  });
  const [editTicketForm, setEditTicketForm] = useState({
    objet: String(ticket.objet ?? ''),
    description: String(ticket.description ?? ''),
    category: String(ticket.category ?? ticket.type ?? 'incident').toLowerCase(),
    priority: String(ticket.priority ?? 'MEDIUM').toUpperCase(),
    site: String((ticket.sites ?? [])[0] ?? ''),
    localite: String((ticket.localities ?? [])[0] ?? ''),
    technicienIds: Array.isArray(ticket.technicians)
      ? ticket.technicians.map((tech: any) => String(tech?.id ?? '')).filter(Boolean)
      : [],
    technicienNames: Array.isArray(ticket.technicians)
      ? ticket.technicians.map((tech: any) => String(tech?.name ?? '').trim()).filter(Boolean)
      : String(ticket.ownerTechnicianName ?? ticket.assigneeName ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
    dueDate: ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
    etr: ticket.etr ? format(new Date(ticket.etr), "yyyy-MM-dd'T'HH:mm") : '',
    sla: String(ticket.sla ?? ticket.slaDuration ?? ''),
    slr: String(ticket.slr ?? ''),
    classification: String(ticket.classification ?? ''),
    channel: String(ticket.channel ?? ''),
    channelRequestTime: String(ticket.channelRequestTime ?? ''),
    channelEmailLink: String(ticket.channelEmailLink ?? ''),
    maintenanceMode: String(ticket.maintenanceMode ?? ''),
    incidentLevel: String(ticket.incidentLevel ?? ''),
    clientIds: Array.isArray(ticket.clients)
      ? ticket.clients.map((c: any) => String(c?.id ?? '')).filter(Boolean)
      : [],
    ownerTechnicianId: String(ticket.ownerTechnicianId ?? ''),
  });

  const [techForm, setTechForm] = useState({
    firstName: '',
    lastName: '',
    pseudo: '',
    department: 'Technique',
    unit: 'NOC',
  });

  const handleDescriptionImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const image = target.closest('img') as HTMLImageElement | null;
    if (!image) return;

    const src = image.getAttribute('src')?.trim() || image.src;
    if (!src) return;

    event.preventDefault();
    event.stopPropagation();
    setExpandedDescriptionImageSrc(src);
  };

  useEffect(() => {
    if (!expandedDescriptionImageSrc) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedDescriptionImageSrc(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [expandedDescriptionImageSrc]);

  useEffect(() => {
    setMounted(true);

    const syncUserFromStorage = () => {
      try {
        const stored = localStorage.getItem('noc_user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.name && parsed?.email && parsed?.role) {
          setUser((prev) => {
            const nextUser = {
              id: String(parsed.id),
              name: String(parsed.name),
              pseudo: String(parsed.pseudo ?? parsed.username ?? '').trim(),
              email: String(parsed.email),
              role: parsed.role,
              avatar: parsed.avatar || undefined,
              shift: parsed.shift || null,
            };

            if (
              String(prev.id) === String(nextUser.id)
              && String(prev.name) === String(nextUser.name)
              && String((prev as any).pseudo ?? '') === String(nextUser.pseudo ?? '')
              && String(prev.email) === String(nextUser.email)
              && String(prev.role) === String(nextUser.role)
              && String(prev.avatar ?? '') === String(nextUser.avatar ?? '')
            ) {
              return prev;
            }

            return nextUser;
          });
        }
      } catch {
        // keep fallback user
      }
    };

    syncUserFromStorage();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'noc_user') {
        syncUserFromStorage();
      }
    };
    const onUserUpdated = () => syncUserFromStorage();
    const onFocus = () => syncUserFromStorage();

    window.addEventListener('storage', onStorage);
    window.addEventListener('noc-user-updated', onUserUpdated as EventListener);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('noc-user-updated', onUserUpdated as EventListener);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const hydrateResolutionComposer = (source: any) => {
    const sourceComments = Array.isArray(source?.comments) ? source.comments : [];
    const currentUserId = String(user.id ?? '').trim();

    const myResolutionEntry = sourceComments.find((entry: any) => {
      const parsed = parseResolutionComment(entry?.content);
      if (!parsed) return false;
      const authorId = String(entry?.authorId ?? entry?.userId ?? '').trim();
      return currentUserId && authorId === currentUserId;
    });

    if (myResolutionEntry) {
      const parsed = parseResolutionComment(myResolutionEntry.content);
      setResolutionText(String(parsed?.html ?? ''));
      setResolutionCategory(String(parsed?.category ?? 'probleme_energetique'));
      setEditingResolutionCommentId(null);
      setResolutionComposerOpen(false);
      return;
    }

    setResolutionText(String(source?.resolutionDescription ?? ''));
    setResolutionCategory(String(source?.resolutionCause ?? 'probleme_energetique'));
    setEditingResolutionCommentId(null);
    setResolutionComposerOpen(true);
  };

  useEffect(() => {
    setTicketState(ticket);
    setHistoryEntries(Array.isArray(ticket.history) ? ticket.history : []);
    setTimeEntries(Array.isArray(ticket.timeEntries) ? ticket.timeEntries : []);
    setSubTasks(Array.isArray(ticket.subTasks) ? ticket.subTasks : []);
    hydrateResolutionComposer(ticket);
    setEditTicketForm({
      objet: String(ticket.objet ?? ''),
      description: String(ticket.description ?? ''),
      category: String(ticket.category ?? ticket.type ?? 'incident').toLowerCase(),
      priority: String(ticket.priority ?? 'MEDIUM').toUpperCase(),
      site: String((ticket.sites ?? [])[0] ?? ''),
      localite: String((ticket.localities ?? [])[0] ?? ''),
      technicienIds: Array.isArray(ticket.technicians)
        ? ticket.technicians.map((tech: any) => String(tech?.id ?? '')).filter(Boolean)
        : [],
      technicienNames: Array.isArray(ticket.technicians)
        ? ticket.technicians.map((tech: any) => String(tech?.name ?? '').trim()).filter(Boolean)
        : String(ticket.ownerTechnicianName ?? ticket.assigneeName ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
      dueDate: ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
      etr: ticket.etr ? format(new Date(ticket.etr), "yyyy-MM-dd'T'HH:mm") : '',
      sla: String(ticket.sla ?? ticket.slaDuration ?? ''),
      slr: String(ticket.slr ?? ''),
      classification: String(ticket.classification ?? ''),
      channel: String(ticket.channel ?? ''),
      channelRequestTime: String(ticket.channelRequestTime ?? ''),
      channelEmailLink: String(ticket.channelEmailLink ?? ''),
      maintenanceMode: String(ticket.maintenanceMode ?? ''),
      incidentLevel: String(ticket.incidentLevel ?? ''),
      clientIds: Array.isArray(ticket.clients)
        ? ticket.clients.map((c: any) => String(c?.id ?? '')).filter(Boolean)
        : [],
      ownerTechnicianId: String(ticket.ownerTechnicianId ?? ''),
    });
    const nextDueDateDraft = ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd'T'HH:mm") : '';
    setDueDateDraft(nextDueDateDraft);

    if (!ticket.dueDate) {
      setDueDatePickerDate(undefined);
      setDueDatePickerHour('00');
      setDueDatePickerMinute('00');
    } else {
      const parsedDueDate = new Date(ticket.dueDate);
      if (!Number.isNaN(parsedDueDate.getTime())) {
        setDueDatePickerDate(parsedDueDate);
        setDueDatePickerHour(format(parsedDueDate, 'HH'));
        setDueDatePickerMinute(format(parsedDueDate, 'mm'));
      }
    }
  }, [ticket, user.id]);

  useEffect(() => {
    const routesToPrefetch = [
      '/',
      '/?tab=tickets',
      '/?tab=planning',
      '/?tab=tasks',
      '/?tab=activities',
      '/?tab=supervision',
      '/?tab=noc_monitoring',
      '/?tab=noc_callcenter',
      '/?tab=noc_reporting',
      '/?tab=noc_equipement',
      '/?tab=noc_clients',
      '/?tab=noc_sites',
      '/?tab=noc_partenaire',
      '/?tab=noc_fai',
      '/?tab=admin',
      '/?tab=admin_users',
      '/?tab=reports',
      '/?tab=overtime',
      '/?tab=links',
      '/?tab=email',
      '/?tab=messagerie',
      '/?tab=ged',
    ];

    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  useEffect(() => {
    if (!editDialogOpen) return;
    const loadTechnicians = async () => {
      try {
        const res = await fetch('/api/tickets/technicians', { cache: 'no-store' });
        if (!res.ok) {
          setTicketTechnicianOptions([]);
          return;
        }
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
              .filter((item) => item.id && item.name)
          : [];
        setTicketTechnicianOptions(mapped);
      } catch {
        setTicketTechnicianOptions([]);
      }
    };
    void loadTechnicians();
  }, [editDialogOpen]);

  useEffect(() => {
    if (!editDialogOpen) return;
    const loadClients = async () => {
      try {
        const res = await fetch('/api/tickets/clients', { cache: 'no-store' });
        if (!res.ok) { setTicketClientOptions([]); return; }
        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
              .filter((item) => item.id && item.name)
          : [];
        setTicketClientOptions(mapped);
      } catch {
        setTicketClientOptions([]);
      }
    };
    void loadClients();
  }, [editDialogOpen]);

  useEffect(() => {
    if (!editDialogOpen) return;
    // Synchronize form with ticket data when dialog opens
    setEditTicketForm({
      objet: String(ticket.objet ?? ''),
      description: String(ticket.description ?? ''),
      category: String(ticket.category ?? ticket.type ?? 'incident').toLowerCase(),
      priority: String(ticket.priority ?? 'MEDIUM').toUpperCase(),
      site: String((ticket.sites ?? [])[0] ?? ''),
      localite: String((ticket.localities ?? [])[0] ?? ''),
      technicienIds: Array.isArray(ticket.technicians)
        ? ticket.technicians.map((tech: any) => String(tech?.id ?? '')).filter(Boolean)
        : [],
      technicienNames: Array.isArray(ticket.technicians)
        ? ticket.technicians.map((tech: any) => String(tech?.name ?? '').trim()).filter(Boolean)
        : String(ticket.ownerTechnicianName ?? ticket.assigneeName ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
      dueDate: ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
      etr: ticket.etr ? format(new Date(ticket.etr), "yyyy-MM-dd'T'HH:mm") : '',
      sla: String(ticket.sla ?? ticket.slaDuration ?? ''),
      slr: String(ticket.slr ?? ''),
      classification: String(ticket.classification ?? ''),
      channel: String(ticket.channel ?? ''),
      channelRequestTime: String(ticket.channelRequestTime ?? ''),
      channelEmailLink: String(ticket.channelEmailLink ?? ''),
      maintenanceMode: String(ticket.maintenanceMode ?? ''),
      incidentLevel: String(ticket.incidentLevel ?? ''),
      clientIds: Array.isArray(ticket.clients)
        ? ticket.clients.map((c: any) => String(c?.id ?? '')).filter(Boolean)
        : [],
      ownerTechnicianId: String(ticket.ownerTechnicianId ?? ''),
    });
  }, [editDialogOpen, ticket]);

  useEffect(() => {
    if (activeTab !== 'activity') return;

    const loadActivityFormOptions = async () => {
      if (ticketTechnicianOptions.length === 0) {
        try {
          const res = await fetch('/api/tickets/technicians', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const mapped = Array.isArray(data)
              ? data
                  .map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim() }))
                  .filter((item) => item.id && item.name)
              : [];
            setTicketTechnicianOptions(mapped);
          }
        } catch {
          // keep previous options
        }
      }

      try {
        const localityRes = await fetch('/api/tickets/localities', { cache: 'no-store' });
        if (!localityRes.ok) {
          setActivityLocalityOptions([]);
          return;
        }
        const localityData = await localityRes.json();
        const mappedLocalities = Array.isArray(localityData)
          ? localityData
              .map((item) => ({
                value: String(item?.value ?? item?.name ?? '').trim(),
                label: String(item?.label ?? item?.name ?? '').trim(),
              }))
              .filter((item) => item.value && item.label)
          : [];
        setActivityLocalityOptions(mappedLocalities);
      } catch {
        setActivityLocalityOptions([]);
      }
    };

    void loadActivityFormOptions();
  }, [activeTab, ticketTechnicianOptions.length]);

  useEffect(() => {
    if (activeTab !== 'activity') return;

    const query = normalizeTicketReference(activityForm.referenceTicketInput);
    if (query.length < 2) {
      setActivityTicketSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/tickets/list?search=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!res.ok) {
          setActivityTicketSuggestions([]);
          return;
        }

        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item: any) => ({
                id: String(item?.id ?? '').trim(),
                numero: String(item?.numero ?? '').trim(),
                objet: String(item?.objet ?? '').trim(),
                status: String(item?.status ?? '').trim(),
              }))
              .filter((item) => item.id && item.numero)
              .slice(0, 8)
          : [];

        const excluded = new Set([
          normalizeTicketReference(String(ticket.id ?? '')),
          normalizeTicketReference(String(ticket.numero ?? '')),
        ]);

        setActivityTicketSuggestions(
          mapped.filter((item) => !excluded.has(normalizeTicketReference(item.id)) && !excluded.has(normalizeTicketReference(item.numero)))
        );
      } catch {
        setActivityTicketSuggestions([]);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, activityForm.referenceTicketInput, ticket.id, ticket.numero]);

  useEffect(() => {
    if (activeTab !== 'activity') {
      setActivitySuggestionsOpen(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isDraggingEditDialog) return;

    const handleMouseMove = (event: MouseEvent) => {
      const dialogEl = editDialogContentElRef.current;
      const dialogWidth = dialogEl?.offsetWidth ?? 900;
      const dialogHeight = dialogEl?.offsetHeight ?? 700;
      const nextX = event.clientX - editDialogDragOffsetRef.current.x;
      const nextY = event.clientY - editDialogDragOffsetRef.current.y;

      const maxX = Math.max(0, window.innerWidth - dialogWidth - 8);
      const maxY = Math.max(0, window.innerHeight - dialogHeight - 8);

      setEditDialogPosition({
        x: Math.min(Math.max(8, nextX), maxX),
        y: Math.min(Math.max(8, nextY), maxY),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingEditDialog(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingEditDialog]);

  useEffect(() => {
    return () => {
      if (ticketIdMenuCloseTimeoutRef.current) {
        clearTimeout(ticketIdMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  const openTicketIdMenu = () => {
    if (ticketIdMenuCloseTimeoutRef.current) {
      clearTimeout(ticketIdMenuCloseTimeoutRef.current);
      ticketIdMenuCloseTimeoutRef.current = null;
    }
    setTicketIdMenuOpen(true);
  };

  const closeTicketIdMenuWithDelay = () => {
    if (ticketIdMenuCloseTimeoutRef.current) {
      clearTimeout(ticketIdMenuCloseTimeoutRef.current);
    }
    ticketIdMenuCloseTimeoutRef.current = setTimeout(() => {
      setTicketIdMenuOpen(false);
    }, 180);
  };

  const startEditDialogDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined' || window.innerWidth < 640) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, [role="combobox"], [contenteditable="true"]')) return;

    const dialogEl = event.currentTarget.closest('[data-slot="dialog-content"]') as HTMLElement | null;
    if (!dialogEl) return;

    editDialogContentElRef.current = dialogEl;
    const rect = dialogEl.getBoundingClientRect();
    editDialogDragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setEditDialogPosition({ x: rect.left, y: rect.top });
    setIsDraggingEditDialog(true);
    event.preventDefault();
  };

  const refreshTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      setTicketState(data);
      setHistoryEntries(Array.isArray(data.history) ? data.history : []);
      setTimeEntries(Array.isArray(data.timeEntries) ? data.timeEntries : []);
      setSubTasks(Array.isArray(data.subTasks) ? data.subTasks : []);
      hydrateResolutionComposer(data);
    } catch {
      // keep current view state if refresh fails
    }
  };

  const notificationItems: Array<{ id: string; message: string; read: boolean }> = [];
  const heroBadge = resolveBadge(ticketState.status);
  const attachments = Array.isArray(ticketState.attachments) ? ticketState.attachments : [];
  const comments = Array.isArray(ticketState.comments) ? ticketState.comments : [];
  const conversationEntries = useMemo(
    () => comments
      .filter((entry: any) => !parseResolutionComment(entry?.content))
      .filter((entry: any) => !parseAttachmentComment(entry?.content))
      .filter((entry: any) => !entry?.isPrivate || String(entry?.authorId ?? entry?.userId ?? '') === String(user.id))
      .sort((left: any, right: any) => {
        const leftPinned = pinnedCommentIds.includes(String(left?.id ?? '')) ? 1 : 0;
        const rightPinned = pinnedCommentIds.includes(String(right?.id ?? '')) ? 1 : 0;
        if (leftPinned !== rightPinned) return rightPinned - leftPinned;
        return new Date(right?.createdAt ?? 0).getTime() - new Date(left?.createdAt ?? 0).getTime();
      }),
    [comments, pinnedCommentIds, user.id]
  );
  const resolutionEntries = useMemo(
    () => comments
      .map((entry: any) => {
        const parsed = parseResolutionComment(entry?.content);
        if (!parsed) return null;
        return {
          ...entry,
          resolutionCategory: parsed.category,
          resolutionHtml: parsed.html,
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => new Date(right?.createdAt ?? 0).getTime() - new Date(left?.createdAt ?? 0).getTime()),
    [comments]
  );
  const attachmentCommentsById = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; authorName: string; createdAt: string; message: string }>> = {};
    comments.forEach((entry: any) => {
      const parsed = parseAttachmentComment(entry?.content);
      if (!parsed) return;
      if (!grouped[parsed.attachmentId]) grouped[parsed.attachmentId] = [];
      grouped[parsed.attachmentId].push({
        id: String(entry?.id ?? ''),
        authorName: String(entry?.authorName ?? 'Utilisateur'),
        createdAt: String(entry?.createdAt ?? ''),
        message: parsed.message,
      });
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return grouped;
  }, [comments]);
  const sortedAttachments = useMemo(() => {
    return [...attachments].sort((left: any, right: any) => {
      const kindOrder: Record<string, number> = { images: 0, documents: 1, autres: 2 };
      const leftKind = classifyAttachmentKind(left);
      const rightKind = classifyAttachmentKind(right);
      if (kindOrder[leftKind] !== kindOrder[rightKind]) return kindOrder[leftKind] - kindOrder[rightKind];

      const rightTime = new Date(right?.uploadedAt ?? 0).getTime();
      const leftTime = new Date(left?.uploadedAt ?? 0).getTime();
      if (rightTime !== leftTime) return rightTime - leftTime;

      return String(left?.name ?? '').localeCompare(String(right?.name ?? ''), 'fr', { sensitivity: 'base' });
    });
  }, [attachments]);
  const attachmentUploaderOptions = useMemo(() => {
    const byId = new Map<string, string>();
    sortedAttachments.forEach((entry: any) => {
      const id = String(entry?.uploadedBy ?? '').trim();
      if (!id) return;
      const label = String(entry?.uploadedByName ?? entry?.uploadedBy ?? 'Utilisateur').trim() || 'Utilisateur';
      if (!byId.has(id)) byId.set(id, label);
    });

    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [sortedAttachments]);
  const attachmentBaseFiltered = useMemo(() => {
    const query = attachmentSearch.trim().toLowerCase();

    return sortedAttachments.filter((entry: any) => {
      const kind = classifyAttachmentKind(entry);
      if (attachmentTypeFilter !== 'all' && kind !== attachmentTypeFilter) return false;

      if (attachmentUploaderFilter !== 'all') {
        const ownerId = String(entry?.uploadedBy ?? '');
        if (ownerId !== attachmentUploaderFilter) return false;
      }

      if (!query) return true;

      const searchable = [
        String(entry?.name ?? ''),
        String(entry?.mimeType ?? ''),
        String(entry?.uploadedByName ?? ''),
        String(entry?.uploadedBy ?? ''),
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [sortedAttachments, attachmentSearch, attachmentTypeFilter, attachmentUploaderFilter]);
  const filteredAttachments = useMemo(() => {
    if (attachmentViewMode !== 'folders' || attachmentFolderFilter === 'all') {
      return attachmentBaseFiltered;
    }

    return attachmentBaseFiltered.filter((entry: any) => classifyAttachmentKind(entry) === attachmentFolderFilter);
  }, [attachmentBaseFiltered, attachmentFolderFilter, attachmentViewMode]);
  const attachmentFolderCounters = useMemo(() => {
    const counters: Record<AttachmentKindFilter, number> = {
      all: attachmentBaseFiltered.length,
      images: 0,
      documents: 0,
      autres: 0,
    };

    attachmentBaseFiltered.forEach((entry: any) => {
      const kind = classifyAttachmentKind(entry);
      counters[kind] += 1;
    });

    return counters;
  }, [attachmentBaseFiltered]);
  const activityLinkedTicketRefs = useMemo(() => {
    const refs = new Set<string>();

    subTasks.forEach((task: any) => {
      const linkedId = normalizeTicketReference(String(task?.linkedTicketId ?? ''));
      const linkedNumero = normalizeTicketReference(String(task?.linkedTicketNumero ?? ''));
      if (linkedId) refs.add(linkedId);
      if (linkedNumero) refs.add(linkedNumero);

      const references = Array.isArray(task?.referenceTicketIds)
        ? task.referenceTicketIds.map((value: unknown) => normalizeTicketReference(String(value ?? '')))
        : [];
      references.filter(Boolean).forEach((value: string) => refs.add(value));
    });

    refs.delete(normalizeTicketReference(String(ticket.id ?? '')));
    refs.delete(normalizeTicketReference(String(ticket.numero ?? '')));

    return Array.from(refs).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [subTasks, ticket.id, ticket.numero]);
  const hasExistingActivities = useMemo(
    () => subTasks.some((task: any) => Boolean(String(task?.linkedTicketId ?? '').trim() || String(task?.linkedTicketNumero ?? '').trim())),
    [subTasks]
  );
  const mergedTicketRefs = useMemo(() => {
    const refs = new Set<string>();
    const numeros = Array.isArray((ticketState as any)?.mergedTicketNumeros) ? (ticketState as any).mergedTicketNumeros : [];
    const ids = Array.isArray((ticketState as any)?.mergedTicketIds) ? (ticketState as any).mergedTicketIds : [];

    numeros.forEach((value: unknown) => {
      const normalized = normalizeTicketReference(String(value ?? ''));
      if (normalized) refs.add(normalized);
    });
    ids.forEach((value: unknown) => {
      const normalized = normalizeTicketReference(String(value ?? ''));
      if (normalized) refs.add(normalized);
    });

    refs.delete(normalizeTicketReference(String(ticket.id ?? '')));
    refs.delete(normalizeTicketReference(String(ticket.numero ?? '')));
    return Array.from(refs).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [ticketState, ticket.id, ticket.numero]);
  const activityOverviewTicketRefs = useMemo(
    () => Array.from(new Set([...activityLinkedTicketRefs, ...mergedTicketRefs])).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
    [activityLinkedTicketRefs, mergedTicketRefs]
  );
  const activityTicketTargetByRef = useMemo(() => {
    const mapping: Record<string, string> = {};

    subTasks.forEach((task: any) => {
      const linkedId = String(task?.linkedTicketId ?? '').trim();
      const linkedNumero = normalizeTicketReference(String(task?.linkedTicketNumero ?? ''));
      if (!linkedId) return;
      mapping[normalizeTicketReference(linkedId)] = linkedId;
      if (linkedNumero) mapping[linkedNumero] = linkedId;
    });

    return mapping;
  }, [subTasks]);
  const resolveActivityTicketTarget = useCallback((reference: string) => {
    const normalizedRef = normalizeTicketReference(reference);
    return activityTicketTargetByRef[normalizedRef] ?? normalizedRef;
  }, [activityTicketTargetByRef]);
  const goToActivityTicket = useCallback((reference: string, openInNewTab = false) => {
    const resolved = resolveActivityTicketTarget(reference);
    if (!resolved) {
      toast.error('Ticket introuvable');
      return;
    }

    const url = `/tickets/${encodeURIComponent(resolved)}`;
    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(url);
  }, [resolveActivityTicketTarget, router]);
  useEffect(() => {
    if (!hasExistingActivities && activityLinkedTicketRefs.length === 0 && mergedTicketRefs.length === 0) return;
    setActivityFlashDismissed(false);
  }, [hasExistingActivities, activityLinkedTicketRefs.length, mergedTicketRefs.length, subTasks.length]);

  useEffect(() => {
    if (activeTab !== 'activity' || activityPanelMode !== 'merge') return;

    const query = normalizeTicketReference(mergeTicketQuery);
    if (query.length < 2) {
      setMergeTicketSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/tickets/list?search=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!res.ok) {
          setMergeTicketSuggestions([]);
          return;
        }

        const data = await res.json();
        const mapped = Array.isArray(data)
          ? data
              .map((item: any) => ({
                id: String(item?.id ?? '').trim(),
                numero: String(item?.numero ?? '').trim(),
                objet: String(item?.objet ?? '').trim(),
                status: String(item?.status ?? '').trim(),
              }))
              .filter((item) => item.id && item.numero)
              .slice(0, 8)
          : [];

        const excluded = new Set([
          normalizeTicketReference(String(ticket.id ?? '')),
          normalizeTicketReference(String(ticket.numero ?? '')),
          ...mergeSelectedTicketRefs.map((ref) => normalizeTicketReference(ref)),
        ]);

        setMergeTicketSuggestions(
          mapped.filter((item) => !excluded.has(normalizeTicketReference(item.id)) && !excluded.has(normalizeTicketReference(item.numero)))
        );
      } catch {
        setMergeTicketSuggestions([]);
      }
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, activityPanelMode, mergeTicketQuery, mergeSelectedTicketRefs, ticket.id, ticket.numero]);
  const myResolutionEntry = useMemo(
    () => resolutionEntries.find((entry: any) => String(entry?.authorId ?? entry?.userId ?? '') === String(user.id)) ?? null,
    [resolutionEntries, user.id]
  );
  const sanitizedDescriptionHtml = useMemo(
    () => adaptRichContentToTheme(String(ticketState.description ?? '')),
    [ticketState.description]
  );
  const editSelectedTechnicianLabels = useMemo(() => {
    const nameById = new Map(ticketTechnicianOptions.map((tech) => [tech.id, tech.name]));
    const resolvedByIds = editTicketForm.technicienIds
      .map((id) => nameById.get(id) ?? id)
      .filter(Boolean);
    const merged = [...resolvedByIds, ...editTicketForm.technicienNames];
    return Array.from(new Set(merged.map((value) => value.trim()).filter(Boolean)));
  }, [editTicketForm.technicienIds, editTicketForm.technicienNames, ticketTechnicianOptions]);
  const activitySelectedTechnicianLabels = useMemo(() => {
    const nameById = new Map(ticketTechnicianOptions.map((tech) => [tech.id, tech.name]));
    const selectedFromIds = activitySelectedTechnicianIds
      .map((id) => nameById.get(id) ?? id)
      .filter(Boolean);
    return Array.from(new Set([...selectedFromIds, ...activityManualTechnicians]));
  }, [activitySelectedTechnicianIds, activityManualTechnicians, ticketTechnicianOptions]);
  const activityAllReferenceIds = useMemo(() => {
    const fromInput = parseTicketReferenceInput(activityForm.referenceTicketInput);
    const combined = [...activitySelectedReferenceIds, ...fromInput]
      .map((value) => normalizeTicketReference(value))
      .filter(Boolean)
      .filter((value) => value !== normalizeTicketReference(String(ticket.id ?? '')))
      .filter((value) => value !== normalizeTicketReference(String(ticket.numero ?? '')));
    return Array.from(new Set(combined));
  }, [activityForm.referenceTicketInput, activitySelectedReferenceIds, ticket.id, ticket.numero]);
  const mergedTickets = useMemo(() => {
    const ids = Array.isArray((ticketState as any)?.mergedTicketIds) ? (ticketState as any).mergedTicketIds : [];
    const numeros = Array.isArray((ticketState as any)?.mergedTicketNumeros) ? (ticketState as any).mergedTicketNumeros : [];
    const maxLen = Math.max(ids.length, numeros.length);

    const result: Array<{ idRef: string; numeroRef: string }> = [];
    for (let i = 0; i < maxLen; i += 1) {
      const idRef = normalizeTicketReference(String(ids[i] ?? ''));
      const numeroRef = normalizeTicketReference(String(numeros[i] ?? ''));
      if (!idRef && !numeroRef) continue;
      result.push({ idRef, numeroRef });
    }

    return result;
  }, [ticketState]);
  const mergedTicketRefSet = useMemo(() => {
    const refs = new Set<string>();
    mergedTickets.forEach((item) => {
      if (item.idRef) refs.add(item.idRef);
      if (item.numeroRef) refs.add(item.numeroRef);
    });
    return refs;
  }, [mergedTickets]);
  const userRole = String(user.role ?? '').toUpperCase();
  const isResponsibleUser = userRole === 'RESPONSABLE';
  const isAdminUser = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
  const isNocAgentUser = userRole === 'TECHNICIEN_NO' || userRole === 'TECHNICIEN_NOC' || userRole === 'AGENT_NOC';
  const canRunLifecycleActions = isAdminUser || isResponsibleUser || isNocAgentUser;
  const canManageEscalation = true;
  const canSeeSupervision = isResponsibleUser || isAdminUser;

  const canCurrentUserManage = (authorId?: string | null) => {
    if (String(user.role ?? '').toUpperCase() === 'SUPER_ADMIN') return true;
    return Boolean(authorId) && String(authorId) === String(user.id);
  };

  const getDeleteKey = (target: Exclude<DeleteConfirmTarget, null>) => `${target.kind}:${target.id}`;
  const isDeleteTargetBusy = (target: Exclude<DeleteConfirmTarget, null>) => deleteBusyKey === getDeleteKey(target);

  const goToMainTab = (tab: string) => {
    router.push(`/?tab=${encodeURIComponent(tab)}`);
  };

  const focusConversationComposer = () => {
    setActiveTab('conversations');
    setConversationComposerOpen(true);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        conversationComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
  };

  const classifyHistoryEntry = (entry: any): Exclude<HistoryFilter, 'all'> => {
    const action = String(entry?.action ?? '').toLowerCase();
    const field = String(entry?.field ?? '').toLowerCase();
    if (field === 'comment' || action.includes('comment')) return 'comment';
    if (field === 'time_entry' || action.includes('time_entry')) return 'time_entry';
    if (field === 'subtask' || action.includes('subtask')) return 'subtask';
    if (field === 'status' || action.includes('status')) return 'status';
    return 'other';
  };

  const combinedHistoryEntries = useMemo(() => {
    const commentEvents = comments.map((comment: any) => ({
      id: `comment-${comment.id}`,
      ticketId: ticket.id,
      userId: comment.authorId ?? '',
      userName: comment.authorName ?? 'NOC SILICONE',
      action: 'comment_created',
      field: 'comment',
      oldValue: null,
      newValue: comment.content ?? '',
      createdAt: comment.createdAt,
    }));
    return [...historyEntries, ...commentEvents]
      .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [comments, historyEntries, ticket.id]);

  const filteredHistoryEntries = useMemo(() => {
    if (historyFilter === 'all') return combinedHistoryEntries;
    return combinedHistoryEntries.filter((entry: any) => classifyHistoryEntry(entry) === historyFilter);
  }, [combinedHistoryEntries, historyFilter]);

  const ticketMetadata = useMemo(
    () => ({
      id: ticket.id,
      numero: ticketState.numero,
      objet: ticketState.objet,
      status: ticketState.status,
      priority: ticketState.priority,
      ownerTechnicianName: ticketState.ownerTechnicianName,
      localities: ticketState.localities,
      sites: ticketState.sites,
      createdAt: ticketState.createdAt,
      dueDate: ticketState.dueDate,
    }),
    [ticket.id, ticketState]
  );

  const normalizeTarget = (value: string) => value.trim();

  const formatEscalationMatrixTarget = (entry: { name: string; contact: string }) => {
    const name = String(entry.name ?? '').trim();
    const contact = String(entry.contact ?? '').trim();
    if (!name) return contact;
    if (!contact || contact.toLowerCase() === name.toLowerCase()) return name;
    return `${name} - ${contact}`;
  };

  const escalationMatrixDomainEntry = useMemo(
    () => ESCALATION_MATRIX.find((entry) => entry.domain === escalationMatrixDomain) ?? ESCALATION_MATRIX[0],
    [ESCALATION_MATRIX, escalationMatrixDomain]
  );

  const escalationMatrixLevels = useMemo(
    () => Array.from(new Set((escalationMatrixDomainEntry?.levels ?? []).map((entry) => entry.level))),
    [escalationMatrixDomainEntry]
  );

  const escalationMatrixCandidates = useMemo(
    () => {
      if (escalationDialogTab === 'custom') {
        return (escalationMatrixDomainEntry?.levels ?? []).map((entry) => ({ ...entry, level: '' }));
      }
      // Si un niveau est sélectionné, n'afficher que ce niveau (sauf si Level 4)
      if (escalationLevel) {
        return (escalationMatrixDomainEntry?.levels ?? []).filter((entry) => entry.level === escalationLevel);
      }
      // Par défaut, rien ou tout ?
      return [];
    },
    [escalationDialogTab, escalationLevel, escalationMatrixDomainEntry]
  );

  const appendEscalationCustomTarget = () => {
    const next = normalizeTarget(escalationCustomTarget);
    if (!next) return;
    setEscalationTargets((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === next.toLowerCase())) return prev;
      return [...prev, next];
    });
    setEscalationCustomTarget('');
  };

  const toggleEscalationTarget = (target: string) => {
    setEscalationTargets((prev) => {
      const exists = prev.some((entry) => entry.toLowerCase() === target.toLowerCase());
      if (exists) {
        return prev.filter((entry) => entry.toLowerCase() !== target.toLowerCase());
      }
      return [...prev, target];
    });
  };

  const removeEscalationTarget = (target: string) => {
    setEscalationTargets((prev) => prev.filter((entry) => entry.toLowerCase() !== target.toLowerCase()));
  };

  const currentActorLabel = resolveActorDisplayName({ pseudo: (user as any)?.pseudo, name: user.name, email: user.email });

  const writeLifecycleHistory = async (input: {
    action: string;
    status?: string;
    label: string;
    details?: Record<string, unknown>;
  }) => {
    const payload = {
      status: input.status ?? ticketState.status,
      label: input.label,
      userPseudo: currentActorLabel,
      ...input.details,
    };

    await fetch(`/api/tickets/${ticket.id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: input.action,
        field: 'status',
        oldValue: String(ticketState.status ?? ''),
        newValue: JSON.stringify(payload),
        userId: user.id,
        userName: user.name,
      }),
    }).catch(() => null);
  };

  const latestLifecycleSummary = useMemo(() => {
    const sorted = [...historyEntries]
      .sort((left: any, right: any) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());

    const latest = sorted.find((entry: any) => {
      const action = String(entry?.action ?? '').toLowerCase();
      const field = String(entry?.field ?? '').toLowerCase();
      return (
        action === 'ticket_escalated'
        || action === 'ticket_escalation_cancelled'
        || action === 'ticket_pending'
        || action === 'ticket_pending_cancelled'
        || action === 'ticket_reopened'
        || action === 'ticket_archived'
        || action === 'ticket_trashed'
        || field === 'status'
      );
    });

    if (!latest) return '';

    let parsedValue: Record<string, unknown> | null = null;
    try {
      parsedValue = latest?.newValue ? JSON.parse(String(latest.newValue)) : null;
    } catch {
      parsedValue = null;
    }

    const actorId = String(latest?.userId ?? '').trim();
    const actorName = resolveActorDisplayName({ pseudo: parsedValue?.userPseudo, name: latest?.userName, email: '' });
    const isSelf = actorId && actorId === String(user.id);
    const timestampLabel = formatMaybeDate(latest?.createdAt);

    const action = String(latest?.action ?? '').toLowerCase();
    const statusValue = String(parsedValue?.status ?? parsedValue?.label ?? latest?.newValue ?? '').toUpperCase();

    if (action === 'ticket_escalated') {
      const targets = Array.isArray(parsedValue?.targets)
        ? (parsedValue?.targets as string[]).map((item) => String(item).trim()).filter(Boolean)
        : [];
      const targetLabel = targets.length > 0 ? `aupres de ${targets.join(', ')}` : '';
      return isSelf
        ? `Vous avez escalade ce ticket ${targetLabel} le ${timestampLabel}`.trim()
        : `Ticket escalade par ${actorName} ${targetLabel} le ${timestampLabel}`.trim();
    }

    if (action === 'ticket_pending' || statusValue === 'PENDING') {
      const categoryKey = String(ticketState.category ?? ticketState.type ?? 'ticket');
      const currentCategoryLabel = String(ticketState.categoryLabel ?? '').trim() || resolveCategoryLabel(categoryKey);
      const reasonMessage = synchronizePendingReasonWithCategory({
        reasonMessage: String(parsedValue?.reasonMessage ?? '').trim(),
        reasonPreset: String(parsedValue?.reasonPreset ?? '').trim(),
        reasonCustom: String(parsedValue?.reasonCustom ?? '').trim(),
        postponedUntil: String(parsedValue?.postponedUntil ?? '').trim(),
        adjournedCategory: String(parsedValue?.adjournedCategory ?? '').trim(),
        categoryLabel: currentCategoryLabel,
        technicianLabel: 'du technicien',
      });
      return isSelf
        ? `Vous avez mis ce ticket en attente le ${timestampLabel}${reasonMessage ? ` : ${reasonMessage}` : ''}`
        : `Ticket mis en attente par ${actorName} le ${timestampLabel}${reasonMessage ? ` : ${reasonMessage}` : ''}`;
    }

    if (action === 'ticket_pending_cancelled') {
      const restoredStatusRaw = String(parsedValue?.restoredStatus ?? parsedValue?.status ?? 'OPEN').toUpperCase();
      const restoredStatusLabel = resolveBadge(restoredStatusRaw).label.toLowerCase();
      return isSelf
        ? `Vous avez annulé la mise en attente de ce ticket le ${timestampLabel} (retour à ${restoredStatusLabel})`
        : `Mise en attente annulée par ${actorName} le ${timestampLabel} (retour à ${restoredStatusLabel})`;
    }

    if (action === 'ticket_escalation_cancelled') {
      return isSelf
        ? `Vous avez annule l'escalade de ce ticket le ${timestampLabel}`
        : `Escalade annulee par ${actorName} le ${timestampLabel}`;
    }

    if (action === 'ticket_archived' || statusValue === 'CLOSED') {
      return isSelf
        ? `Vous avez archive ce ticket le ${timestampLabel}`
        : `Ticket archive par ${actorName} le ${timestampLabel}`;
    }

    if (action === 'ticket_trashed') {
      return isSelf
        ? `Vous avez deplace ce ticket en corbeille le ${timestampLabel}`
        : `Ticket deplace en corbeille par ${actorName} le ${timestampLabel}`;
    }

    return '';
  }, [historyEntries, ticketState.category, ticketState.categoryLabel, ticketState.status, ticketState.type, user.id]);

  const statusBeforePending = useMemo(() => {
    const sorted = [...historyEntries]
      .sort((left: any, right: any) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());

    const latestPending = sorted.find((entry: any) => String(entry?.action ?? '').toLowerCase() === 'ticket_pending');
    if (!latestPending) return 'OPEN';

    let parsedValue: Record<string, unknown> | null = null;
    try {
      parsedValue = latestPending?.newValue ? JSON.parse(String(latestPending.newValue)) : null;
    } catch {
      parsedValue = null;
    }

    const candidates = [
      String(parsedValue?.previousStatus ?? '').toUpperCase(),
      String(latestPending?.oldValue ?? '').toUpperCase(),
    ];

    const allowedStatuses = new Set(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'CLOSED', 'RESOLVED']);
    const restored = candidates.find((value) => allowedStatuses.has(value));
    return restored || 'OPEN';
  }, [historyEntries]);

  const assignedTechnicianNames = useMemo(() => {
    const fromTechnicians = Array.isArray(ticketState.technicians)
      ? ticketState.technicians
          .map((tech: any) => String(tech?.pseudo ?? tech?.name ?? '').trim())
          .filter(Boolean)
      : [];

    const fallback = String(ticketState.ownerTechnicianName ?? ticketState.assigneeName ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    return Array.from(new Set([...(fromTechnicians.length > 0 ? fromTechnicians : fallback)]));
  }, [ticketState.assigneeName, ticketState.ownerTechnicianName, ticketState.technicians]);

  const assignedTechnicianContactMessage = useMemo(() => {
    const topThree = assignedTechnicianNames.slice(0, 3);
    if (topThree.length === 0) {
      return "Veuillez contacter le technicien assigne a ce ticket pour avoir la mise a jour de ce ticket, afin de vous permettre, si possible, de le fermer ou de repousser la date d'echeance.";
    }

    const quotedNames = topThree.map((name) => `\"${name}\"`);
    const namesLabel =
      quotedNames.length === 1
        ? quotedNames[0]
        : quotedNames.length === 2
          ? `${quotedNames[0]} et ${quotedNames[1]}`
          : `${quotedNames[0]}, ${quotedNames[1]} et ${quotedNames[2]}`;
    const verb = quotedNames.length === 1 ? 'est' : 'sont';
    const adjective = quotedNames.length === 1 ? 'assigne' : 'assignes';

    return `Veuillez contacter ${namesLabel} qui ${verb} ${adjective} a ce ticket pour avoir la mise a jour de ce ticket, afin de vous permettre, si possible, de le fermer ou de repousser la date d'echeance.`;
  }, [assignedTechnicianNames]);

  const primaryTechnicianLabel = useMemo(() => {
    if (assignedTechnicianNames.length === 0) return 'du technicien';
    if (assignedTechnicianNames.length === 1) return `du technicien ${assignedTechnicianNames[0]}`;
    if (assignedTechnicianNames.length === 2) return `des techniciens ${assignedTechnicianNames[0]} et ${assignedTechnicianNames[1]}`;
    return `des techniciens ${assignedTechnicianNames.slice(0, 3).join(', ')}`;
  }, [assignedTechnicianNames]);

  const pendingReasonPreview = useMemo(() => {
    const categoryKey = String(ticketState.category ?? ticketState.type ?? 'ticket');
    const categoryLabel = String(ticketState.categoryLabel ?? '').trim() || resolveCategoryLabel(categoryKey);
    return buildPendingReasonMessage({
      reasonPreset: pendingReasonPreset,
      reasonCustom: pendingReasonCustom,
      postponedUntil: pendingReportedUntil,
      adjournedCategory: pendingAdjournedCategory,
      categoryLabel,
      technicianLabel: primaryTechnicianLabel,
    });
  }, [pendingAdjournedCategory, pendingReasonCustom, pendingReasonPreset, pendingReportedUntil, primaryTechnicianLabel, ticketState.category, ticketState.categoryLabel, ticketState.type]);

  const formatHistoryMessage = (entry: any) => {
    let parsedValue: Record<string, unknown> | null = null;
    try {
      parsedValue = entry?.newValue ? JSON.parse(String(entry.newValue)) : null;
    } catch {
      parsedValue = null;
    }

    const action = String(entry?.action ?? '').toLowerCase();
    const actorName = resolveActorDisplayName({ pseudo: parsedValue?.userPseudo, name: entry?.userName, email: '' });
    const timestampLabel = formatMaybeDate(entry?.createdAt);

    if (action === 'ticket_pending') {
      const categoryKey = String(ticketState.category ?? ticketState.type ?? 'ticket');
      const currentCategoryLabel = String(ticketState.categoryLabel ?? '').trim() || resolveCategoryLabel(categoryKey);
      const reasonMessage = synchronizePendingReasonWithCategory({
        reasonMessage: String(parsedValue?.reasonMessage ?? '').trim(),
        reasonPreset: String(parsedValue?.reasonPreset ?? '').trim(),
        reasonCustom: String(parsedValue?.reasonCustom ?? '').trim(),
        postponedUntil: String(parsedValue?.postponedUntil ?? '').trim(),
        adjournedCategory: String(parsedValue?.adjournedCategory ?? '').trim(),
        categoryLabel: currentCategoryLabel,
        technicianLabel: 'du technicien',
      });
      if (reasonMessage) {
        return `Ticket mis en attente par ${actorName} à ${timestampLabel}. Motif: ${reasonMessage}`;
      }
      return `Ticket mis en attente par ${actorName} à ${timestampLabel}`;
    }

    if (action === 'ticket_pending_cancelled') {
      const restoredStatusRaw = String(parsedValue?.restoredStatus ?? parsedValue?.status ?? 'OPEN').toUpperCase();
      const restoredStatusLabel = resolveBadge(restoredStatusRaw).label.toLowerCase();
      return `Mise en attente annulée par ${actorName} à ${timestampLabel}. Ticket remis à l'état ${restoredStatusLabel}.`;
    }

    return entry?.message
      ? String(entry.message)
      : `${actorName} a modifié ${entry.field === 'dueDate' ? "la date d'échéance" : entry.field === 'description' ? 'la description' : entry.field || 'le ticket'} du ticket le ${timestampLabel}`;
  };

  const formatHistoryNewValue = (entry: any) => {
    let parsedValue: Record<string, unknown> | null = null;
    try {
      parsedValue = entry?.newValue ? JSON.parse(String(entry.newValue)) : null;
    } catch {
      return String(entry?.newValue ?? '');
    }

    const action = String(entry?.action ?? '').toLowerCase();
    if (action === 'ticket_pending') {
      const categoryKey = String(ticketState.category ?? ticketState.type ?? 'ticket');
      const currentCategoryLabel = String(ticketState.categoryLabel ?? '').trim() || resolveCategoryLabel(categoryKey);
      return synchronizePendingReasonWithCategory({
        reasonMessage: String(parsedValue?.reasonMessage ?? parsedValue?.label ?? parsedValue?.status ?? 'PENDING'),
        reasonPreset: String(parsedValue?.reasonPreset ?? '').trim(),
        reasonCustom: String(parsedValue?.reasonCustom ?? '').trim(),
        postponedUntil: String(parsedValue?.postponedUntil ?? '').trim(),
        adjournedCategory: String(parsedValue?.adjournedCategory ?? '').trim(),
        categoryLabel: currentCategoryLabel,
        technicianLabel: 'du technicien',
      });
    }
    if (action === 'ticket_pending_cancelled') {
      const restoredStatusRaw = String(parsedValue?.restoredStatus ?? parsedValue?.status ?? 'OPEN').toUpperCase();
      return `Statut restauré: ${resolveBadge(restoredStatusRaw).label}`;
    }
    if (action === 'ticket_escalated') {
      const level = String(parsedValue?.level ?? '').trim();
      const targets = Array.isArray(parsedValue?.targets) ? (parsedValue.targets as unknown[]).map((item) => String(item)).join(', ') : '';
      return [level, targets].filter(Boolean).join(' • ');
    }

    return String(entry?.newValue ?? '');
  };

  const dueDateAlertMessage = useMemo(() => {
    const status = String(ticketState.status ?? '').toUpperCase();
    if (status === 'CLOSED' || status === 'RESOLVED' || status === 'TRASHED') return '';

    const fallbackDueDate = ticketState.createdAt
      ? new Date(new Date(ticketState.createdAt).getTime() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const dueDate = ticketState.dueDate ? new Date(ticketState.dueDate) : fallbackDueDate;
    if (!dueDate) return '';
    if (Number.isNaN(dueDate.getTime())) return '';

    const delayMs = Date.now() - dueDate.getTime();
    if (delayMs <= 0) return '';

    const totalMinutes = Math.max(1, Math.ceil(delayMs / (60 * 1000)));
    const delayDays = Math.floor(totalMinutes / (24 * 60));
    const delayHours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const delayMinutes = totalMinutes % 60;
    const delayParts: string[] = [];

    if (delayDays > 0) delayParts.push(`${delayDays} jour${delayDays > 1 ? 's' : ''}`);
    if (delayHours > 0) delayParts.push(`${delayHours} h`);
    if (delayMinutes > 0 || delayParts.length === 0) delayParts.push(`${delayMinutes} min`);

    const delayLabel = delayParts.join(' ');
    const overdueSinceLabel = format(dueDate, 'dd MMM yyyy, HH:mm', { locale: fr });
    const contactMessage = assignedTechnicianContactMessage;

    if (!ticketState.dueDate) {
      return `Ce ticket est en retard de ${delayLabel} (depuis le ${overdueSinceLabel}). ${contactMessage}`;
    }

    return `Ce ticket est en retard de ${delayLabel} (date d'echeance depassee depuis le ${overdueSinceLabel}). ${contactMessage}`;
  }, [assignedTechnicianContactMessage, ticketState.createdAt, ticketState.dueDate, ticketState.status]);

  const noCommentSinceThreeDaysMessage = useMemo(() => {
    const status = String(ticketState.status ?? '').toUpperCase();
    if (status !== 'OPEN') return '';

    const latestCommentDate = comments
      .map((comment: any) => new Date(comment?.createdAt ?? 0).getTime())
      .filter((ts: number) => Number.isFinite(ts) && ts > 0)
      .sort((a: number, b: number) => b - a)[0];

    const baseline = latestCommentDate ?? new Date(ticketState.createdAt ?? Date.now()).getTime();
    const silenceDays = Math.floor((Date.now() - baseline) / (24 * 60 * 60 * 1000));
    if (silenceDays < 3) return '';

    return `Ce ticket n'a recu aucun commentaire depuis ${silenceDays} jours.`;
  }, [comments, ticketState.createdAt, ticketState.status]);

  const saveResolution = async () => {
    if (!resolutionCategory?.trim()) {
      toast.error('Veuillez selectionner une categorie de resolution');
      return;
    }
    if (!toPlainTextFromHtml(resolutionText)) {
      toast.error('Veuillez saisir la description de resolution');
      return;
    }

    setUpdatingTicket(true);
    try {
      const content = encodeResolutionComment(resolutionCategory, resolutionText);
      const myEntry = (editingResolutionCommentId
        ? resolutionEntries.find((entry: any) => String(entry?.id ?? '') === String(editingResolutionCommentId))
        : myResolutionEntry) as any;

      if (myEntry?.id) {
        const updateCommentRes = await fetch(`/api/tickets/${ticket.id}/comments/${myEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            requesterId: user.id,
            requesterRole: user.role,
          }),
        });
        if (!updateCommentRes.ok) throw new Error('resolution_comment_update_failed');
        const updatedComment = await updateCommentRes.json().catch(() => null);
        if (updatedComment?.id) {
          setTicketState((prev: any) => ({
            ...prev,
            comments: Array.isArray(prev?.comments)
              ? prev.comments.map((entry: any) => (String(entry?.id ?? '') === String(updatedComment.id) ? { ...entry, ...updatedComment } : entry))
              : [updatedComment],
            updatedAt: new Date().toISOString(),
          }));
        }
      } else {
        const createCommentRes = await fetch(`/api/tickets/${ticket.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            userId: user.id,
            userName: user.name,
            isPrivate: false,
          }),
        });
        if (!createCommentRes.ok) throw new Error('resolution_comment_create_failed');
        const createdComment = await createCommentRes.json().catch(() => null);
        if (createdComment?.id) {
          setTicketState((prev: any) => ({
            ...prev,
            comments: Array.isArray(prev?.comments) ? [...prev.comments, createdComment] : [createdComment],
            updatedAt: new Date().toISOString(),
          }));
        }
      }

      setEditingResolutionCommentId(null);
      setResolutionComposerOpen(false);
      void refreshTicket();
      toast.success('Resolution enregistree');
    } catch {
      toast.error('Enregistrement de la resolution impossible');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const deleteResolution = async (commentId: string) => {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user.id,
          requesterRole: user.role,
        }),
      });

      if (!res.ok) throw new Error('resolution_delete_failed');

      setTicketState((prev: any) => ({
        ...prev,
        comments: Array.isArray(prev?.comments)
          ? prev.comments.filter((entry: any) => String(entry?.id ?? '') !== String(commentId))
          : [],
        updatedAt: new Date().toISOString(),
      }));

      setResolutionText('');
      setResolutionCategory('probleme_energetique');
      setEditingResolutionCommentId(null);
      setResolutionComposerOpen(true);
      void refreshTicket();
      toast.success('Resolution supprimee');
    } catch {
      toast.error('Suppression de la resolution impossible');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const updateTicketCore = async (
    payload: Record<string, unknown>,
    successMessage: string,
    options?: { skipSuccessToast?: boolean }
  ) => {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          updatedBy: user.name,
          updatedById: user.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err?.error ?? 'ticket_update_failed'));
      }
      await refreshTicket();
      if (!options?.skipSuccessToast && successMessage) {
        toast.success(successMessage);
      }
      return true;
    } catch {
      toast.error('Action impossible pour ce ticket');
      return false;
    } finally {
      setUpdatingTicket(false);
    }
  };

  const saveTicketEdition = async () => {
    if (!canRunLifecycleActions) {
      toast.error('Vous etes en lecture seule sur ce ticket');
      return;
    }

    if (!editTicketForm.objet.trim()) {
      toast.error("L'objet du ticket est requis");
      return;
    }

    if (editTicketForm.dueDate) {
      const createdAt = new Date(ticketState.createdAt ?? ticket.createdAt ?? Date.now());
      const dueAt = new Date(editTicketForm.dueDate);
      if (!Number.isNaN(createdAt.getTime()) && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < createdAt.getTime()) {
        toast.error("La date d'echeance ne peut pas etre inferieure a la date de creation du ticket.");
        return;
      }
    }

    let normalizedDescription = sanitizeDescriptionSelectionArtifacts(editTicketForm.description);
    if (typeof window !== 'undefined' && normalizedDescription.includes('data:image/')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalizedDescription, 'text/html');
      const images = Array.from(doc.querySelectorAll('img[src^="data:image/"]'));

      const compressDataUrl = async (src: string) => {
        const image = new Image();
        const loaded = await new Promise<boolean>((resolve) => {
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = src;
        });
        if (!loaded) return src;

        const maxWidth = 1000;
        const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
        let nextWidth = Math.max(1, Math.round(image.width * ratio));
        let nextHeight = Math.max(1, Math.round(image.height * ratio));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return src;

        let best = src;
        const targetLength = 30000;

        for (let pass = 0; pass < 6; pass += 1) {
          canvas.width = nextWidth;
          canvas.height = nextHeight;
          ctx.clearRect(0, 0, nextWidth, nextHeight);
          ctx.drawImage(image, 0, 0, nextWidth, nextHeight);

          const qualities = [0.8, 0.7, 0.6, 0.5, 0.42];
          for (const q of qualities) {
            const candidate = canvas.toDataURL('image/jpeg', q);
            if (candidate.length < best.length) best = candidate;
            if (candidate.length <= targetLength) return candidate;
          }

          if (nextWidth <= 240 || nextHeight <= 240) break;
          nextWidth = Math.max(240, Math.round(nextWidth * 0.82));
          nextHeight = Math.max(240, Math.round(nextHeight * 0.82));
        }

        return best;
      };

      for (const img of images) {
        const src = img.getAttribute('src') || '';
        if (!src) continue;
        const compressed = await compressDataUrl(src);
        img.setAttribute('src', compressed);
      }

      normalizedDescription = sanitizeDescriptionSelectionArtifacts(doc.body.innerHTML);
    }

    // The tickets.description column is TEXT in MySQL (~65KB limit); apply emergency compression only if really exceeded.
    let descriptionBytes = new TextEncoder().encode(normalizedDescription).length;
    if (descriptionBytes > 65000 && typeof window !== 'undefined' && normalizedDescription.includes('data:image/')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalizedDescription, 'text/html');
      const images = Array.from(doc.querySelectorAll('img[src^="data:image/"]'));

      const ultraCompressDataUrl = async (src: string) => {
        const image = new Image();
        const loaded = await new Promise<boolean>((resolve) => {
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = src;
        });
        if (!loaded) return src;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return src;

        const maxWidth = 600;
        const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
        let w = Math.max(1, Math.round(image.width * ratio));
        let h = Math.max(1, Math.round(image.height * ratio));
        let best = src;

        for (let i = 0; i < 6; i += 1) {
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(image, 0, 0, w, h);

          for (const q of [0.35, 0.25, 0.15]) {
            const candidate = canvas.toDataURL('image/jpeg', q);
            if (candidate.length < best.length) best = candidate;
          }

          if (w <= 150 || h <= 150) break;
          w = Math.max(150, Math.round(w * 0.75));
          h = Math.max(150, Math.round(h * 0.75));
        }

        return best;
      };

      for (const img of images) {
        const src = img.getAttribute('src') || '';
        if (!src) continue;
        const compressed = await ultraCompressDataUrl(src);
        img.setAttribute('src', compressed);
      }

      normalizedDescription = sanitizeDescriptionSelectionArtifacts(doc.body.innerHTML);
      descriptionBytes = new TextEncoder().encode(normalizedDescription).length;
    }

    normalizedDescription = sanitizeDescriptionSelectionArtifacts(normalizedDescription);

    if (descriptionBytes > 65500) {
      toast.error("Description trop volumineuse. Supprimez des images ou réduisez leur nombre.");
      return;
    }
    
    const technicianEntries = editSelectedTechnicianLabels.map((name) => {
      const match = ticketTechnicianOptions.find((tech) => tech.name === name);
      return { id: match?.id ?? name, name };
    });

    const historyUserName = String(user.name ?? 'Utilisateur').trim() || 'Utilisateur';
    const historyDateText = format(new Date(), 'dd/MM/yyyy à HH:mm');

    const historyActions: Array<{ field: string; label: string; oldValue: string; newValue: string }> = [];
    if (String(ticketState.description ?? '') !== String(normalizedDescription ?? '')) {
      historyActions.push({
        field: 'description',
        label: 'description',
        oldValue: String(ticketState.description ?? ''),
        newValue: String(normalizedDescription ?? ''),
      });
    }
    if (String(ticketState.dueDate ? format(new Date(ticketState.dueDate), "yyyy-MM-dd'T'HH:mm") : '') !== String(editTicketForm.dueDate ?? '')) {
      historyActions.push({
        field: 'dueDate',
        label: "date d'échéance",
        oldValue: ticketState.dueDate ? format(new Date(ticketState.dueDate), 'dd/MM/yyyy à HH:mm') : '',
        newValue: editTicketForm.dueDate ? format(new Date(editTicketForm.dueDate), 'dd/MM/yyyy à HH:mm') : '',
      });
    }

    const ok = await updateTicketCore(
      {
        objet: editTicketForm.objet.trim(),
        description: normalizedDescription,
        category: editTicketForm.category,
        priority: editTicketForm.priority,
        site: editTicketForm.site || null,
        localite: editTicketForm.localite || null,
        technicien: editSelectedTechnicianLabels.join(', ') || null,
        technicianIds: technicianEntries.map((tech) => tech.id),
        technicianNames: technicianEntries,
        dueDate: editTicketForm.dueDate ? editTicketForm.dueDate : null,
        etr: editTicketForm.etr ? editTicketForm.etr : null,
        sla: editTicketForm.sla || null,
        slr: editTicketForm.slr || null,
        classification: editTicketForm.classification || null,
        channel: editTicketForm.channel || null,
        channelRequestTime: editTicketForm.channelRequestTime || null,
        channelEmailLink: editTicketForm.channelEmailLink || null,
        maintenanceMode: editTicketForm.maintenanceMode || null,
        incidentLevel: editTicketForm.incidentLevel || null,
        clientIds: editTicketForm.clientIds,
        ownerTechnicianId: editTicketForm.ownerTechnicianId || null,
      },
      'Ticket mis à jour avec succès'
    );
    if (ok) {
      if (historyActions.length > 0) {
        try {
          await Promise.all(historyActions.map((entry) => fetch(`/api/tickets/${ticket.id}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ticket_modified',
              field: entry.field,
              oldValue: entry.oldValue || null,
              newValue: entry.newValue || null,
              userId: user.id,
              userName: historyUserName,
            }),
          })));
          await refreshTicket();
        } catch {
          // history is best-effort; the ticket save already succeeded
        }
      }
      setEditDialogOpen(false);
    }
  };

  const escalateTicket = async (targets: string[], level: string) => {
    if (lifecycleActionLoading) return false;
    const normalizedTargets = targets.map((target) => normalizeTarget(target)).filter(Boolean);
    if (normalizedTargets.length === 0) {
      toast.error('Ajoutez au moins un destinataire pour l\'escalade');
      return false;
    }
    if (!level) {
      toast.error('Sélectionnez un niveau d\'escalade');
      return false;
    }
    setLifecycleActionLoading(true);
    try {
      const ok = await updateTicketCore(
        { status: 'ESCALATED', escalationTargets: normalizedTargets, escalationLevel: level },
        `Ticket escaladé (${level}) auprès de ${normalizedTargets.join(', ')}`
      );
      if (!ok) return false;
      await writeLifecycleHistory({
        action: 'ticket_escalated',
        status: 'ESCALATED',
        label: 'Ticket escaladé',
        details: { targets: normalizedTargets, level },
      });
      await refreshTicket();
      return true;
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const pendingTicket = async (reasonMessage: string) => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return;
    }
    const normalizedReasonMessage = normalizeSentenceInput(reasonMessage);
    if (!normalizedReasonMessage) {
      toast.error('Sélectionnez ou saisissez un motif de mise en attente');
      return;
    }
    if (lifecycleActionLoading) return;
    setLifecycleActionLoading(true);
    try {
      const ok = await updateTicketCore({ status: 'PENDING' }, normalizedReasonMessage);
      if (!ok) return;
      const previousStatus = String(ticketState.status ?? '').toUpperCase();
      await writeLifecycleHistory({
        action: 'ticket_pending',
        status: 'PENDING',
        label: 'Ticket mis en attente',
        details: {
          reasonMessage: normalizedReasonMessage,
          reasonPreset: pendingReasonPreset || null,
          reasonCustom: normalizeSentenceInput(pendingReasonCustom) || null,
          postponedUntil: pendingReportedUntil || null,
          adjournedCategory: pendingAdjournedCategory || null,
          previousStatus,
        },
      });
      await refreshTicket();
      setPendingDialogOpen(false);
      setPendingReasonPreset('');
      setPendingReasonCustom('');
      setPendingReportedUntil('');
      setPendingAdjournedCategory('');
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const cancelPendingTicket = async () => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return;
    }
    if (lifecycleActionLoading) return;

    const restoredStatus = statusBeforePending;
    const restoredStatusLabel = resolveBadge(restoredStatus).label.toLowerCase();

    setLifecycleActionLoading(true);
    try {
      const ok = await updateTicketCore(
        { status: restoredStatus },
        `Mise en attente annulée, ticket remis à l'état ${restoredStatusLabel}`
      );
      if (!ok) return;
      await writeLifecycleHistory({
        action: 'ticket_pending_cancelled',
        status: restoredStatus,
        label: 'Mise en attente annulée',
        details: {
          restoredStatus,
          sourceStatus: 'PENDING',
        },
      });
      await refreshTicket();
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const reopenTicket = async () => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return;
    }
    if (lifecycleActionLoading) return;
    setLifecycleActionLoading(true);
    try {
      const reopenedAtLabel = formatMaybeDate(new Date());
      const ok = await updateTicketCore({ status: 'OPEN' }, `Vous avez rouvert ce ticket le ${reopenedAtLabel}`);
      if (!ok) return;
      await writeLifecycleHistory({
        action: 'ticket_reopened',
        status: 'OPEN',
        label: 'Ticket rouvert',
      });
      await refreshTicket();
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const cancelEscalation = async () => {
    if (lifecycleActionLoading) return;
    setLifecycleActionLoading(true);
    try {
      const ok = await updateTicketCore({ status: 'OPEN', escalationLevel: '', escalationTargets: [] }, 'Escalade annulée, ticket récupéré');
      if (!ok) return;
      await writeLifecycleHistory({
        action: 'ticket_escalation_cancelled',
        status: 'OPEN',
        label: 'Escalade annulée',
      });
      await refreshTicket();
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const archiveTicket = async () => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return;
    }
    if (lifecycleActionLoading) return;

    const currentStatus = String(ticketState.status ?? ticket.status ?? '').toUpperCase();
    const requiresReason = currentStatus === 'OPEN' || currentStatus === 'ESCALATED' || currentStatus === 'PENDING';
    const normalizedReasonText = archiveReasonText.trim();

    if (requiresReason && !normalizedReasonText) {
      toast.error('Veuillez creer le motif puisque ce ticket est ouvert ou escalade.');
      return;
    }

    setLifecycleActionLoading(true);
    try {
      const archivedAt = new Date();
      const ok = await updateTicketCore({
        status: 'CLOSED',
        isArchived: true,
        archivedAt: archivedAt.toISOString(),
        archivedYear: archivedAt.getFullYear(),
        archiveReasonType: requiresReason ? archiveReasonType : null,
        archiveReasonText: requiresReason ? normalizedReasonText : null,
        archiveSourceStatus: currentStatus || null,
      }, 'Ticket archive avec succes');
      if (!ok) return;
      await writeLifecycleHistory({
        action: 'ticket_archived',
        status: 'CLOSED',
        label: 'Ticket archive',
        details: {
          archiveReasonType: requiresReason ? archiveReasonType : null,
          archiveReasonText: requiresReason ? normalizedReasonText : null,
          archiveSourceStatus: currentStatus || null,
        },
      });
      await refreshTicket();
      setArchiveDialogOpen(false);
      setArchiveReasonText('');
      goToTicketsList();
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const updateTicketDueDate = async (nextDueDate?: string) => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return false;
    }
    const dueDateValue = nextDueDate ?? dueDateDraft;
    const currentDueValue = ticketState.dueDate ? format(new Date(ticketState.dueDate), "yyyy-MM-dd'T'HH:mm") : '';
    if (dueDateValue === currentDueValue) return true;

    if (dueDateValue) {
      const createdAt = new Date(ticketState.createdAt ?? ticket.createdAt ?? Date.now());
      const dueAt = new Date(dueDateValue);
      if (!Number.isNaN(createdAt.getTime()) && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < createdAt.getTime()) {
        toast.error("La date d'echeance ne peut pas etre inferieure a la date de creation du ticket.");
        return false;
      }
    }

    if (lifecycleActionLoading) return false;
    setLifecycleActionLoading(true);
    try {
      const ok = await updateTicketCore(
        { dueDate: dueDateValue || null },
        '',
        { skipSuccessToast: true }
      );
      if (!ok) return false;

      const actorLabel = String((user as any)?.pseudo ?? user.name ?? 'Utilisateur').trim() || 'Utilisateur';
      const whenLabel = format(new Date(), 'dd MMM yyyy, HH:mm', { locale: fr });
      toast.success(`La date d'echeance de ce ticket a ete mise a jour par ${actorLabel} le ${whenLabel}.`, {
        duration: 12000,
        action: {
          label: 'Fermer',
          onClick: () => {},
        },
      });
      return true;
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const syncDueDatePickerFromDraft = () => {
    if (!dueDateDraft) {
      setDueDatePickerDate(undefined);
      setDueDatePickerHour('00');
      setDueDatePickerMinute('00');
      return;
    }

    const parsed = new Date(dueDateDraft);
    if (Number.isNaN(parsed.getTime())) return;
    setDueDatePickerDate(parsed);
    setDueDatePickerHour(format(parsed, 'HH'));
    setDueDatePickerMinute(format(parsed, 'mm'));
  };

  const applyDueDateFromPicker = async () => {
    if (!dueDatePickerDate) {
      setDueDateDraft('');
      const ok = await updateTicketDueDate('');
      if (ok) setDueDatePickerOpen(false);
      return;
    }

    const next = new Date(dueDatePickerDate);
    next.setHours(Number(dueDatePickerHour), Number(dueDatePickerMinute), 0, 0);
    const nextValue = format(next, "yyyy-MM-dd'T'HH:mm");
    setDueDateDraft(nextValue);
    const ok = await updateTicketDueDate(nextValue);
    if (ok) setDueDatePickerOpen(false);
  };

  const clearDueDateFromPicker = async () => {
    setDueDatePickerDate(undefined);
    setDueDatePickerHour('00');
    setDueDatePickerMinute('00');
    setDueDateDraft('');
    const ok = await updateTicketDueDate('');
    if (ok) setDueDatePickerOpen(false);
  };

  const openExactDatesDialog = () => {
    setExactStartAtDraft(toDateTimeLocalInput(ticketState.exactStartAt));
    setExactClosedAtDraft(toDateTimeLocalInput(ticketState.exactClosedAt));
    setCloseTicketWithExactDate(false);
    setExactDatesDialogOpen(true);
  };

  const saveExactDates = async () => {
    if (exactDatesSaving || deletingExactDates) return;

    const hasStartInput = Boolean(exactStartAtDraft.trim());
    const hasCloseInput = Boolean(exactClosedAtDraft.trim());
    if (!hasStartInput && !hasCloseInput && !closeTicketWithExactDate) {
      toast.error('Renseignez au moins une date exacte ou cochez la fermeture du ticket.');
      return;
    }

    if (String(ticketState.status ?? '').toUpperCase() !== 'CLOSED' && (hasCloseInput || closeTicketWithExactDate)) {
      toast.error('Impossible de renseigner une fermeture exacte sur un ticket en attente ou escaladé.');
      return;
    }

    setExactDatesSaving(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/exact-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exactStartAt: hasStartInput ? exactStartAtDraft : null,
          exactClosedAt: hasCloseInput ? exactClosedAtDraft : null,
          closeTicket: closeTicketWithExactDate,
          updatedById: user.id,
          updatedByName: user.name,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Impossible de mettre à jour les dates exactes.'));
        return;
      }

      const updated = await response.json();
      setTicketState(updated);
      setHistoryEntries(Array.isArray(updated?.history) ? updated.history : []);
      setTimeEntries(Array.isArray(updated?.timeEntries) ? updated.timeEntries : []);
      setSubTasks(Array.isArray(updated?.subTasks) ? updated.subTasks : []);
      setExactDatesDialogOpen(false);
      setCloseTicketWithExactDate(false);
      toast.success('Dates exactes du ticket enregistrées.');
    } catch {
      toast.error('Impossible de mettre à jour les dates exactes.');
    } finally {
      setExactDatesSaving(false);
    }
  };

  const deleteExactDates = async () => {
    if (deletingExactDates || exactDatesSaving) return;
    setDeletingExactDates(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/exact-dates`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedById: user.id,
          deletedByName: user.name,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Impossible de supprimer les dates exactes.'));
        return;
      }
      const updated = await response.json();
      setTicketState(updated);
      setHistoryEntries(Array.isArray(updated?.history) ? updated.history : []);
      setTimeEntries(Array.isArray(updated?.timeEntries) ? updated.timeEntries : []);
      setSubTasks(Array.isArray(updated?.subTasks) ? updated.subTasks : []);
      setExactDatesDialogOpen(false);
      toast.success('Dates exactes supprimées.');
    } catch {
      toast.error('Impossible de supprimer les dates exactes.');
    } finally {
      setDeletingExactDates(false);
    }
  };

  const moveTicketToTrash = async () => {
    if (!canRunLifecycleActions) {
      toast.error('Action indisponible pour cet utilisateur');
      return;
    }
    if (trashDeleteLoading) return;
    setTrashDeleteLoading(true);
    setTrashDeleteDialogOpen(false);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedBy: user.id, deletedByName: resolveActorDisplayName(user) }),
      });
      if (!res.ok) throw new Error('ticket_delete_failed');
      const data = await res.json().catch(() => ({}));
      const days = Number(data?.retentionDays ?? 30);

      await writeLifecycleHistory({
        action: 'ticket_trashed',
        status: 'TRASHED',
        label: 'Ticket deplace en corbeille',
        details: { retentionDays: days },
      });

      toast.success(`Ticket supprime — suppression definitive dans ${days} jour${days > 1 ? 's' : ''}`);
      setTrashDeleteDialogOpen(false);
      goToTicketsList();
    } catch {
      toast.error('Suppression du ticket impossible');
    } finally {
      setTrashDeleteLoading(false);
    }
  };

  const addTimeEntry = async () => {
    if (!timeStart || !timeEnd) {
      toast.error('Renseignez les heures de debut et de fin');
      return;
    }
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: timeDate,
          startTime: timeStart,
          endTime: timeEnd,
          note: timeEntryText,
          technicianId: user.id,
          technicianName: user.name,
        }),
      });
      if (!res.ok) throw new Error('time_entry_failed');
      setTimeEntryText('');
      setTimeStart('');
      setTimeEnd('');
      await refreshTicket();
      toast.success('Entree de temps ajoutee');
    } catch {
      toast.error("Impossible d'ajouter l'entree de temps");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const addConversationComment = async () => {
    const normalizedContent = sanitizeDescriptionSelectionArtifacts(String(conversationCommentText ?? '')).trim();
    const plainText = normalizedContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    const hasRichMedia = /<img|<video|<audio|<iframe/i.test(normalizedContent);

    if ((!plainText && !hasRichMedia) || normalizedContent === '<p><br></p>') {
      toast.error('Commentaire requis');
      return;
    }

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: normalizedContent,
          isPrivate: conversationCommentVisibility === 'private',
          userId: user.id,
          userName: user.name,
          authorId: user.id,
          authorName: user.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Impossible de publier le commentaire'));
        return;
      }

      setConversationCommentText('');
      setConversationCommentVisibility('public');
      setConversationComposerOpen(false);
      await refreshTicket();
      toast.success('Commentaire ajoute');
    } catch {
      toast.error('Impossible de publier le commentaire');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });

  const uploadAttachmentFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploadingAttachments(true);
    try {
      const uploaded: any[] = [];

      for (const file of files) {
        const base64DataUrl = await readFileAsDataUrl(file);
        const res = await fetch(`/api/tickets/${ticket.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            fileData: base64DataUrl,
            uploadedBy: user.id,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(String(err?.error ?? 'attachment_upload_failed'));
        }

        const created = await res.json();
        uploaded.push(created);
      }

      if (uploaded.length > 0) {
        setTicketState((prev: any) => ({
          ...prev,
          attachments: Array.isArray(prev?.attachments) ? [...uploaded, ...prev.attachments] : uploaded,
          updatedAt: new Date().toISOString(),
        }));
      }

      void refreshTicket();
      toast.success(`${files.length} piece(s) jointe(s) ajoutee(s)`);
    } catch {
      toast.error('Upload des pieces jointes impossible');
    } finally {
      setUploadingAttachments(false);
      setIsAttachmentDragOver(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (attachment: any) => {
    const ownerId = String(attachment?.uploadedBy ?? '');
    if (!canCurrentUserManage(ownerId)) {
      toast.error('Suppression non autorisee');
      return;
    }

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/attachments/${attachment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, requesterRole: user.role }),
      });

      if (!res.ok) throw new Error('attachment_delete_failed');

      setTicketState((prev: any) => ({
        ...prev,
        attachments: Array.isArray(prev?.attachments)
          ? prev.attachments.filter((entry: any) => String(entry?.id ?? '') !== String(attachment.id))
          : [],
      }));

      if (String(attachmentPreview?.id ?? '') === String(attachment.id)) {
        setAttachmentPreview(null);
      }

      void refreshTicket();
      toast.success('Piece jointe supprimee');
    } catch {
      toast.error('Suppression de la piece jointe impossible');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const addAttachmentComment = async (attachmentId: string) => {
    const draft = String(attachmentCommentDrafts[attachmentId] ?? '').trim();
    if (!draft) {
      toast.error('Commentaire requis');
      return;
    }

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: encodeAttachmentComment(attachmentId, draft),
          isPrivate: false,
          userId: user.id,
          userName: user.name,
        }),
      });
      if (!res.ok) throw new Error('attachment_comment_failed');

      const created = await res.json().catch(() => null);
      if (created?.id) {
        setTicketState((prev: any) => ({
          ...prev,
          comments: Array.isArray(prev?.comments) ? [...prev.comments, created] : [created],
        }));
      }

      setAttachmentCommentDrafts((prev) => ({ ...prev, [attachmentId]: '' }));
      void refreshTicket();
      toast.success('Commentaire du document ajoute');
    } catch {
      toast.error('Ajout du commentaire impossible');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const triggerAttachmentDownload = (file: any) => {
    const fileUrlRaw = String(file?.url ?? '').trim();
    const fileUrl = fileUrlRaw.includes('/api/tickets/')
      ? `${fileUrlRaw}${fileUrlRaw.includes('?') ? '&' : '?'}download=1`
      : fileUrlRaw;
    if (!fileUrl) {
      toast.error('Fichier indisponible');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = String(file?.name ?? 'document');
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const startEditComment = (entry: any) => {
    setEditingCommentId(String(entry?.id ?? ''));
    setEditingCommentContent(String(entry?.content ?? ''));
  };

  const saveEditedComment = async (commentId: string) => {
    const normalizedContent = sanitizeDescriptionSelectionArtifacts(String(editingCommentContent ?? '')).trim();
    const plainText = normalizedContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    const hasRichMedia = /<img|<video|<audio|<iframe/i.test(normalizedContent);

    if ((!plainText && !hasRichMedia) || normalizedContent === '<p><br></p>') {
      toast.error('Commentaire requis');
      return;
    }

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: normalizedContent,
          requesterId: user.id,
          requesterRole: user.role,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Impossible de modifier le commentaire'));
        return;
      }

      setEditingCommentId(null);
      setEditingCommentContent('');
      await refreshTicket();
      toast.success('Commentaire modifie');
    } catch {
      toast.error('Impossible de modifier le commentaire');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const executeDeleteComment = async (commentId: string) => {
    const target = { kind: 'comment' as const, id: String(commentId) };
    const targetKey = getDeleteKey(target);
    if (deleteBusyKey === targetKey) return;

    const previousComments = Array.isArray((ticketState as any)?.comments) ? (ticketState as any).comments : [];
    setDeleteBusyKey(targetKey);
    setTicketState((prev: any) => ({
      ...prev,
      comments: Array.isArray(prev?.comments) ? prev.comments.filter((entry: any) => String(entry?.id ?? '') !== target.id) : prev?.comments,
    }));
    setPinnedCommentIds((prev) => prev.filter((id) => id !== String(commentId)));
    if (editingCommentId === String(commentId)) {
      setEditingCommentId(null);
      setEditingCommentContent('');
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user.id,
          requesterRole: user.role,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTicketState((prev: any) => ({ ...prev, comments: previousComments }));
        toast.error(String(err?.error ?? 'Impossible de supprimer le commentaire'));
        return;
      }

      void refreshTicket();
      toast.success('Commentaire supprime');
    } catch {
      setTicketState((prev: any) => ({ ...prev, comments: previousComments }));
      toast.error('Impossible de supprimer le commentaire');
    } finally {
      setDeleteBusyKey((prev) => (prev === targetKey ? null : prev));
    }
  };

  const requestDeleteComment = (commentId: string) => {
    setDeleteConfirmTarget({ kind: 'comment', id: String(commentId) });
    setDeleteConfirmDialogOpen(true);
  };

  const togglePinComment = (commentId: string) => {
    const normalizedId = String(commentId);
    setPinnedCommentIds((prev) => (
      prev.includes(normalizedId)
        ? prev.filter((id) => id !== normalizedId)
        : [normalizedId, ...prev]
    ));
  };

  const beginEditTimeEntry = (entry: any) => {
    const dateValue = entry?.date ? new Date(entry.date) : null;
    const normalizedDate = dateValue && !Number.isNaN(dateValue.getTime()) ? format(dateValue, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setEditingTimeEntryId(String(entry.id));
    setEditingTimeDraft({
      date: normalizedDate,
      startTime: String(entry.startTime ?? ''),
      endTime: String(entry.endTime ?? ''),
      note: String(entry.note ?? ''),
    });
  };

  const saveEditTimeEntry = async (entryId: string) => {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/time/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingTimeDraft.date,
          startTime: editingTimeDraft.startTime,
          endTime: editingTimeDraft.endTime,
          note: editingTimeDraft.note,
          requesterId: user.id,
          requesterRole: user.role,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? "Impossible de modifier l'entree de temps"));
        return;
      }
      await refreshTicket();
      setEditingTimeEntryId(null);
      toast.success('Entree de temps modifiee');
    } catch {
      toast.error("Impossible de modifier l'entree de temps");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const executeDeleteTimeEntry = async (entryId: string) => {
    const target = { kind: 'time_entry' as const, id: String(entryId) };
    const targetKey = getDeleteKey(target);
    if (deleteBusyKey === targetKey) return;

    const previousEntries = timeEntries;
    setDeleteBusyKey(targetKey);
    setTimeEntries((prev) => prev.filter((entry: any) => String(entry?.id ?? '') !== target.id));
    if (editingTimeEntryId === target.id) {
      setEditingTimeEntryId(null);
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/time/${entryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, requesterRole: user.role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTimeEntries(previousEntries);
        toast.error(String(err?.error ?? "Impossible de supprimer l'entree de temps"));
        return;
      }
      void refreshTicket();
      toast.success('Entree de temps supprimee');
    } catch {
      setTimeEntries(previousEntries);
      toast.error("Impossible de supprimer l'entree de temps");
    } finally {
      setDeleteBusyKey((prev) => (prev === targetKey ? null : prev));
    }
  };

  const requestDeleteTimeEntry = (entryId: string) => {
    setDeleteConfirmTarget({ kind: 'time_entry', id: String(entryId) });
    setDeleteConfirmDialogOpen(true);
  };

  const submitMergeTickets = async () => {
    const typedRefs = parseTicketReferenceInput(mergeTicketQuery);
    const ticketRefs = Array.from(new Set([...mergeSelectedTicketRefs, ...typedRefs]));

    if (ticketRefs.length === 0) {
      toast.error('Selectionnez au moins un ticket a fusionner');
      return;
    }

    setMergeBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketRefs,
          mode: mergeBehavior,
          userId: user.id,
          userName: user.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Fusion impossible'));
        return;
      }

      setMergeTicketQuery('');
      setMergeSelectedTicketRefs([]);
      setMergeSuggestionsOpen(false);
      setMergeTicketSuggestions([]);
      await refreshTicket();
      toast.success(mergeBehavior === 'merge' ? 'Tickets fusionnes avec melange des contenus' : 'Tickets regroupes avec succes');
    } catch {
      toast.error('Fusion impossible');
    } finally {
      setMergeBusy(false);
    }
  };

  const dissociateMergedTicket = async (ref: string) => {
    setMergeBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/merge`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketRef: ref,
          userId: user.id,
          userName: user.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Dissociation impossible'));
        return;
      }

      await refreshTicket();
      toast.success(`Ticket ${ref} dissocie`);
    } catch {
      toast.error('Dissociation impossible');
    } finally {
      setMergeBusy(false);
    }
  };

  const addActivity = async () => {
    const objet = String(activityForm.objet ?? '').trim();
    if (!objet) {
      toast.error('Objet de l\'activite requis');
      return;
    }

    const normalizedContent = sanitizeDescriptionSelectionArtifacts(String(activityForm.description ?? '')).trim();
    const plainDescription = toPlainTextFromHtml(normalizedContent);
    const referenceTicketIds = activityAllReferenceIds;
    const selectedTechnicianIds = Array.from(new Set(activitySelectedTechnicianIds));
    const ownerTechnicianId = selectedTechnicianIds[0] ?? null;
    const ownerTechnicianName = ticketTechnicianOptions.find((item) => item.id === ownerTechnicianId)?.name
      ?? activityManualTechnicians[0]
      ?? null;
    const activityContextSummary: string[] = [];
    const activityContextPayload: Record<string, string> = {};

    if (activityKind === 'call') {
      if (activityContextForm.callContactName.trim()) {
        activityContextSummary.push(`Contact: ${activityContextForm.callContactName.trim()}`);
        activityContextPayload.callContactName = activityContextForm.callContactName.trim();
      }
      if (activityContextForm.callContactPhone.trim()) {
        activityContextSummary.push(`Telephone: ${activityContextForm.callContactPhone.trim()}`);
        activityContextPayload.callContactPhone = activityContextForm.callContactPhone.trim();
      }
      if (activityContextForm.callWhen.trim()) {
        const formatted = formatActivityContextDate(activityContextForm.callWhen);
        activityContextSummary.push(`Date d'appel: ${formatted}`);
        activityContextPayload.callWhen = activityContextForm.callWhen.trim();
      }
    } else if (activityKind === 'task') {
      if (activityContextForm.taskRequester.trim()) {
        activityContextSummary.push(`Demandeur: ${activityContextForm.taskRequester.trim()}`);
        activityContextPayload.taskRequester = activityContextForm.taskRequester.trim();
      }
      if (activityContextForm.taskDeadline.trim()) {
        const formatted = formatActivityContextDate(activityContextForm.taskDeadline);
        activityContextSummary.push(`Echeance: ${formatted}`);
        activityContextPayload.taskDeadline = activityContextForm.taskDeadline.trim();
      }
    } else if (activityKind === 'event') {
      if (activityContextForm.eventLocation.trim()) {
        activityContextSummary.push(`Lieu: ${activityContextForm.eventLocation.trim()}`);
        activityContextPayload.eventLocation = activityContextForm.eventLocation.trim();
      }
      if (activityContextForm.eventStartAt.trim()) {
        const formatted = formatActivityContextDate(activityContextForm.eventStartAt);
        activityContextSummary.push(`Debut: ${formatted}`);
        activityContextPayload.eventStartAt = activityContextForm.eventStartAt.trim();
      }
      if (activityContextForm.eventEndAt.trim()) {
        const formatted = formatActivityContextDate(activityContextForm.eventEndAt);
        activityContextSummary.push(`Fin: ${formatted}`);
        activityContextPayload.eventEndAt = activityContextForm.eventEndAt.trim();
      }
    }

    const fallbackDescription = [objet, ...activityContextSummary].join('\n').trim();

    setUpdatingTicket(true);
    try {
      const createTicketRes = await fetch('/api/tickets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          creatorName: user.name,
          type: 'INC',
          objet,
          description: plainDescription || fallbackDescription || objet,
          descriptionHtml: normalizedContent || undefined,
          priority: String(activityForm.priority ?? 'MEDIUM').toUpperCase(),
          categoryLabel: String(activityForm.category ?? 'incident'),
          categoryKey: String(activityForm.category ?? 'incident').toLowerCase(),
          status: 'OPEN',
          technicianIds: selectedTechnicianIds,
          ownerTechnicianId: ownerTechnicianId ?? undefined,
          ownerTechnicianName: ownerTechnicianName ?? undefined,
          localities: activitySelectedLocalities,
          link: `/tickets/${encodeURIComponent(String(ticket.id ?? ''))}`,
          dueDate: new Date(Date.now() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          tags: {
            source: 'activity_link',
            activityKind,
            activityContext: activityContextPayload,
            parentTicketId: String(ticket.id ?? ''),
            parentTicketNumero: String(ticket.numero ?? ''),
            referenceTicketIds,
          },
        }),
      });
      if (!createTicketRes.ok) {
        const err = await createTicketRes.json().catch(() => ({}));
        toast.error(String(err?.error ?? 'Creation du ticket activite impossible'));
        return;
      }

      const createdTicket = await createTicketRes.json().catch(() => ({}));
      if (!createdTicket?.id) {
        toast.error('Le ticket activite n\'a pas pu etre cree.');
        return;
      }

      const res = await fetch(`/api/tickets/${ticket.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: objet,
          creatorId: user.id,
          creatorName: user.name,
          linkedTicketId: String(createdTicket.id),
          linkedTicketNumero: String(createdTicket.numero ?? ''),
          linkedTicketObjet: String(createdTicket.objet ?? objet),
          linkedTicketStatus: String(createdTicket.status ?? 'OPEN'),
          linkedTicketPriority: String(createdTicket.priority ?? activityForm.priority ?? 'MEDIUM'),
          referenceTicketIds,
          manualTechnicianNames: activityManualTechnicians,
          selectedLocalities: activitySelectedLocalities,
          activityKind,
        }),
      });
      if (!res.ok) throw new Error('subtask_create_failed');

      const activityCommentParts = [
        `🤖 Système — Activite (${activityKind}) creee: ${String(createdTicket.numero ?? createdTicket.id)}`,
        `Ticket parent: ${String(ticket.numero ?? ticket.id)}`,
      ];
      if (activitySelectedTechnicianLabels.length > 0) {
        activityCommentParts.push(`Techniciens assignes: ${activitySelectedTechnicianLabels.join(', ')}`);
      }
      if (activitySelectedLocalities.length > 0) {
        activityCommentParts.push(`Localites: ${activitySelectedLocalities.join(', ')}`);
      }
      if (referenceTicketIds.length > 0) {
        activityCommentParts.push(`References: ${referenceTicketIds.join(', ')}`);
      }
      if (activityContextSummary.length > 0) {
        activityCommentParts.push(...activityContextSummary);
      }

      await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: activityCommentParts.join('\n'),
          isPrivate: false,
          userId: user.id,
          userName: `🤖 Système — ${user.name}`,
        }),
      }).catch(() => null);

      setActivityForm({
        objet: '',
        description: '',
        priority: 'MEDIUM',
        category: 'incident',
        referenceTicketInput: '',
      });
      setActivitySelectedReferenceIds([]);
      setActivitySelectedTechnicianIds([]);
      setActivityManualTechnicians([]);
      setActivityManualTechnicianDraft('');
      setActivityManualTechnicianInputOpen(false);
      setActivitySelectedLocalities([]);
      setActivityTicketSuggestions([]);
      setActivitySuggestionsOpen(false);
      setActivityContextForm(EMPTY_ACTIVITY_CONTEXT_FORM);

      await refreshTicket();
      toast.success(`Activite creee avec ticket ${String(createdTicket.numero ?? createdTicket.id)}`);
    } catch {
      toast.error("Impossible d'enregistrer l'activite");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const beginEditActivity = (task: any) => {
    setEditingActivityId(String(task.id));
    setEditingActivityText(String(task.description ?? ''));
  };

  const saveEditActivity = async (taskId: string) => {
    if (!editingActivityText.trim()) {
      toast.error('Description requise');
      return;
    }

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/subtasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editingActivityText,
          requesterId: user.id,
          requesterRole: user.role,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(String(err?.error ?? "Impossible de modifier l'activite"));
        return;
      }
      await refreshTicket();
      setEditingActivityId(null);
      setEditingActivityText('');
      toast.success('Activite modifiee');
    } catch {
      toast.error("Impossible de modifier l'activite");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const executeDeleteActivity = async (taskId: string) => {
    const target = { kind: 'activity' as const, id: String(taskId) };
    const targetKey = getDeleteKey(target);
    if (deleteBusyKey === targetKey) return;

    const previousSubTasks = subTasks;
    setDeleteBusyKey(targetKey);
    setSubTasks((prev) => prev.filter((task: any) => String(task?.id ?? '') !== target.id));
    if (editingActivityId === target.id) {
      setEditingActivityId(null);
      setEditingActivityText('');
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/subtasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, requesterRole: user.role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubTasks(previousSubTasks);
        toast.error(String(err?.error ?? "Impossible de supprimer l'activite"));
        return;
      }
      void refreshTicket();
      toast.success('Activite supprimee');
    } catch {
      setSubTasks(previousSubTasks);
      toast.error("Impossible de supprimer l'activite");
    } finally {
      setDeleteBusyKey((prev) => (prev === targetKey ? null : prev));
    }
  };

  const requestDeleteActivity = (taskId: string) => {
    setDeleteConfirmTarget({ kind: 'activity', id: String(taskId) });
    setDeleteConfirmDialogOpen(true);
  };

  const confirmDeleteTarget = async () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;

    setDeleteConfirmDialogOpen(false);
    setDeleteConfirmTarget(null);

    if (target.kind === 'comment') {
      await executeDeleteComment(target.id);
    } else if (target.kind === 'time_entry') {
      await executeDeleteTimeEntry(target.id);
    } else {
      await executeDeleteActivity(target.id);
    }

  };

  const deleteConfirmText = useMemo(() => {
    if (!deleteConfirmTarget) {
      return {
        title: 'Confirmer la suppression',
        description: 'Voulez-vous continuer ?',
      };
    }

    if (deleteConfirmTarget.kind === 'comment') {
      return {
        title: 'Supprimer ce commentaire ?',
        description: 'Le commentaire sera supprimé du ticket.',
      };
    }

    if (deleteConfirmTarget.kind === 'time_entry') {
      return {
        title: 'Supprimer cette entrée de temps ?',
        description: 'L\'entrée de temps sera supprimée du ticket.',
      };
    }

    return {
      title: 'Supprimer cette activité ?',
      description: 'L\'activité sera supprimée du ticket.',
    };
  }, [deleteConfirmTarget]);

  const submitClient = async () => {
    if (!clientForm.name.trim()) {
      toast.error('Nom client requis');
      return;
    }
    setSubmittingClient(true);
    try {
      const payload = {
        name: clientForm.name,
        accountNumber: clientForm.accountNumber,
        address: clientForm.address,
        phone: clientForm.phone,
        city: clientForm.city,
        district: clientForm.district,
        email: clientForm.email,
        principalResponsable: clientForm.principalResponsable,
        clientType: clientForm.clientType,
        serviceType: clientForm.serviceType,
        contractStartDate: clientForm.contractStartDate || null,
        consumptionDate: clientForm.consumptionDate || null,
        contactPersons: clientForm.contactPersons.filter((contact) => contact.name.trim()),
      };
      const res = await fetch('/api/tickets/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('create_client_failed');
      toast.success('Client cree avec succes');
      setCreateClientOpen(false);
      setClientForm({
        name: '',
        accountNumber: '',
        address: '',
        phone: '',
        city: '',
        district: '',
        email: '',
        principalResponsable: '',
        clientType: 'Standard',
        serviceType: 'Internet',
        contractStartDate: '',
        consumptionDate: '',
        contactPersons: [{ name: '', email: '', phone: '' }],
      });
    } catch {
      toast.error('Creation client impossible');
    } finally {
      setSubmittingClient(false);
    }
  };

  const submitTechnician = async () => {
    if (!techForm.firstName.trim() || !techForm.lastName.trim() || !techForm.pseudo.trim()) {
      toast.error('Nom, Prenom et Pseudo sont requis');
      return;
    }
    setSubmittingTech(true);
    try {
      const res = await fetch('/api/tickets/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(techForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === 'pseudo_exists') {
          toast.error('Pseudo technicien deja utilise');
        } else {
          toast.error('Creation technicien impossible');
        }
        return;
      }
      toast.success('Technicien cree avec succes');
      setCreateTechnicianOpen(false);
      setTechForm({
        firstName: '',
        lastName: '',
        pseudo: '',
        department: 'Technique',
        unit: 'NOC',
      });
    } catch {
      toast.error('Creation technicien impossible');
    } finally {
      setSubmittingTech(false);
    }
  };

  const SYSTEM_COMMENT_PREFIX = '🤖 Système';
  const SYSTEM_COMMENT_PREFIX_PATTERN = /^🤖\s*Syst[eè]me\s*—\s*/i;

  const renderCommentBubble = (entry: any) => {
    const privateComment = Boolean(entry?.isPrivate);
    const commentAuthorId = String(entry?.authorId ?? entry?.userId ?? '').trim();
    const commentAuthorName = String(entry?.authorName ?? entry?.userName ?? '').trim() || 'Utilisateur';
    const isSystemComment = commentAuthorName.startsWith(SYSTEM_COMMENT_PREFIX)
      || /^🤖\s*Syst[eè]me/i.test(commentAuthorName);
    const displayAuthorName = isSystemComment
      ? String(commentAuthorName.replace(SYSTEM_COMMENT_PREFIX_PATTERN, '').trim() || 'Utilisateur')
      : commentAuthorName;
    const canManage = !isSystemComment && Boolean(commentAuthorId) && commentAuthorId === String(user.id);
    const entryId = String(entry?.id ?? '');
    const isPinned = pinnedCommentIds.includes(entryId);
    const isEditing = editingCommentId === entryId;
    const isDeleting = isDeleteTargetBusy({ kind: 'comment', id: entryId });
    const createdLabel = formatMaybeDate(entry.createdAt);
    const updatedLabel = formatMaybeDate(entry.updatedAt);
    const isEdited = Boolean(entry?.updatedAt) && createdLabel !== updatedLabel;

    const isOwnComment = commentAuthorId === String(user.id);
    // Prefer comment author's DB avatar, then own live avatar, then shared default
    const authorAvatarFromComment = normalizeAvatarPath(entry?.authorAvatar, commentAuthorId);
    const ownLiveAvatar = normalizeAvatarPath(user.avatar, user.id);
    const avatarSrc = authorAvatarFromComment || (isOwnComment ? ownLiveAvatar : '') || '/profile-avatars/default.svg';

    return (
      <Card
        key={entry.id}
        className={privateComment
          ? 'border-amber-300/70 bg-amber-50 dark:border-amber-700/80 dark:bg-amber-950/55'
          : 'border-slate-300/90 bg-white dark:border-slate-700/90 dark:bg-slate-900/95'}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 ring-1 ring-border/80">
              {avatarSrc ? (
                <AvatarImage 
                  src={avatarSrc} 
                  alt={displayAuthorName || 'Utilisateur'}
                  onError={(e) => {
                    console.error(`[Avatar Error] Failed to load: ${avatarSrc}`, e);
                  }}
                />
              ) : null}
              <AvatarFallback>{String(displayAuthorName || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <p className="text-base font-semibold truncate text-foreground mr-1">
                    {isSystemComment ? `Créé par ${displayAuthorName}` : isOwnComment ? 'Créé par vous' : `Créé par ${displayAuthorName}`}
                  </p>
                  {isSystemComment ? (
                    <Badge variant="outline" className="border-purple-400/70 text-purple-700 dark:text-purple-300 font-medium">
                      Commentaire système
                    </Badge>
                  ) : null}
                  {isPinned ? <Badge variant="secondary" className="font-medium">Epingle</Badge> : null}
                  {!isSystemComment ? (
                    <Badge variant="outline" className={privateComment ? 'border-amber-400/70 text-amber-700 dark:text-amber-300' : 'border-sky-400/60 text-sky-700 dark:text-sky-300'}>
                      {privateComment ? 'Prive' : 'Public'}
                    </Badge>
                  ) : null}
                  <span>• {createdLabel}</span>
                  {isEdited ? <span>• Modifie</span> : null}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 border border-border/70 bg-background/70 text-muted-foreground hover:bg-accent/60" title="Actions commentaire">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!isSystemComment && (
                  <DropdownMenuItem className="gap-2 focus:bg-accent focus:text-accent-foreground" disabled={!canManage || updatingTicket} onSelect={() => startEditComment(entry)}>
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {!isSystemComment && (
                  <DropdownMenuItem className="gap-2 focus:bg-accent focus:text-accent-foreground" disabled={!canManage || updatingTicket || isDeleting} onSelect={() => requestDeleteComment(entryId)}>
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="gap-2 focus:bg-accent focus:text-accent-foreground" disabled={updatingTicket} onSelect={() => togglePinComment(entryId)}>
                  <Pin className="h-4 w-4" />
                  {isPinned ? 'Desepingler' : 'Epingler'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-2">
              <Zarko
                value={editingCommentContent}
                onChange={setEditingCommentContent}
                placeholder="Modifiez votre commentaire..."
                minHeight="150px"
                enableTicketReferences
                className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentContent('');
                  }}
                  disabled={updatingTicket}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveEditedComment(entryId)}
                  disabled={updatingTicket}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : entry.content ? (
            <div
              className="mt-3 prose prose-sm dark:prose-invert max-w-none text-sm [&_img]:inline-block [&_img]:align-top [&_img]:w-full sm:[&_img]:w-[calc(50%-0.5rem)] [&_img]:mr-0 sm:[&_img]:mr-2 [&_img]:mb-2 [&_img:nth-of-type(2n)]:mr-0 [&_img]:rounded-md [&_img]:cursor-zoom-in"
              onClick={handleDescriptionImageClick}
              dangerouslySetInnerHTML={{ __html: adaptRichContentToTheme(String(entry.content)) }}
            />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm">-</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <img src="/logo.png" alt="Silicone Connect" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <span className="font-bold text-lg hidden sm:block">NOC ACTIVITIES</span>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu Gestion Tickets" title="Menu Gestion Tickets">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2" onSelect={() => goToTicketsView('active')}>
                <Ticket className="h-4 w-4" />
                Voir les tickets actifs
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => goToTicketsView('archive')}>
                <Archive className="h-4 w-4" />
                Voir les archives
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => goToTicketsView('trash')}>
                <Trash2 className="h-4 w-4" />
                Voir la corbeille
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">NOC Actif</span>
          </div>

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationItems.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                    {notificationItems.filter((n) => !n.read).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 sm:w-80 p-0">
              <div className="p-3 border-b font-semibold">Notifications</div>
              <ScrollArea className="h-50">
                {notificationItems.length > 0 ? notificationItems.map((n) => (
                  <div key={n.id} className={`p-3 border-b text-sm ${n.read ? 'opacity-60' : ''}`}>{n.message}</div>
                )) : (
                  <div className="p-4 text-sm text-muted-foreground">Aucune notification.</div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          <Button asChild variant="ghost" className="gap-2 h-9">
            <Link href="/" prefetch scroll={false}>
            <Avatar className="h-8 w-8">
              {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-cyan-500 text-white text-sm">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            </Link>
          </Button>
        </div>
      </header>

      <div className={`flex ${sidebarPosition === 'right' ? 'lg:flex-row-reverse' : ''}`}>
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:sticky top-14 left-0 z-40 w-60 lg:w-auto h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300 lg:translate-x-0`}
          style={{ width: sidebarCollapsed ? 64 : 250 }}
        >
          <div className="hidden lg:flex items-center justify-between gap-2 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarPosition((current) => (current === 'left' ? 'right' : 'left'))}
              aria-label={sidebarPosition === 'left' ? 'Placer la sidebar a droite' : 'Placer la sidebar a gauche'}
              title={sidebarPosition === 'left' ? 'Placer la sidebar a droite' : 'Placer la sidebar a gauche'}
            >
              {sidebarPosition === 'left' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Etendre la sidebar' : 'Reduire la sidebar'}
              title={sidebarCollapsed ? 'Etendre la sidebar' : 'Reduire la sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          <ScrollArea className="h-full">
            <nav className="p-3 space-y-1">
              <MainSidebarLink tab="dashboard" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <LayoutDashboard className="w-5 h-5" /> {!sidebarCollapsed && 'Tableau de bord'}
              </MainSidebarLink>
              <MainSidebarLink tab="tickets" variant="secondary" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <Ticket className="w-5 h-5" /> {!sidebarCollapsed && 'Gestion Tickets'}
              </MainSidebarLink>
              <MainSidebarLink tab="planning" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <Calendar className="w-5 h-5" /> {!sidebarCollapsed && 'Planning'}
              </MainSidebarLink>
              <MainSidebarLink tab="tasks" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <ClipboardList className="w-5 h-5" /> {!sidebarCollapsed && 'Mes Tâches'}
              </MainSidebarLink>
              <MainSidebarLink tab="activities" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <Activity className="w-5 h-5" /> {!sidebarCollapsed && 'Activités'}
              </MainSidebarLink>

              <Separator className="my-2" />

              {canSeeSupervision && (
                <MainSidebarLink
                  tab="supervision"
                  variant="ghost"
                  className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                >
                  <Eye className="w-5 h-5" /> {!sidebarCollapsed && 'Supervision'}
                </MainSidebarLink>
              )}

              <Button
                variant="ghost"
                className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    setSidebarGroupOpen((prev) => ({ ...prev, noc: !prev.noc }));
                  }
                }}
              >
                <Network className="w-5 h-5" /> {!sidebarCollapsed && 'NOC'}
                {!sidebarCollapsed && (
                  <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${sidebarGroupOpen.noc ? 'rotate-180' : ''}`} />
                )}
              </Button>
              {!sidebarCollapsed && sidebarGroupOpen.noc && (
                <div className="ml-4 mt-1 space-y-1">
                  <MainSidebarLink tab="noc_monitoring" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <Activity className="w-4 h-4" /> Monitoring
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_callcenter" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <Phone className="w-4 h-4" /> Call Center
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_reporting" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <FileText className="w-4 h-4" /> Reporting
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_clients" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <Users className="w-4 h-4" /> Clients
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_sites" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <MapPin className="w-4 h-4" /> Sites
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_partenaire" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <Truck className="w-4 h-4" /> Partenaire
                  </MainSidebarLink>
                  <MainSidebarLink tab="noc_fai" variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
                    <Globe className="w-4 h-4" /> FAI
                  </MainSidebarLink>
                </div>
              )}

              {isAdminUser && (
                <>
                  <Separator className="my-2" />
                  <MainSidebarLink
                    tab="admin"
                    variant="ghost"
                    className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                  >
                    <Settings className="w-5 h-5" /> {!sidebarCollapsed && 'Administration'}
                  </MainSidebarLink>
                  <MainSidebarLink
                    tab="admin_users"
                    variant="ghost"
                    className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                  >
                    <Users className="w-5 h-5" /> {!sidebarCollapsed && 'Utilisateurs'}
                  </MainSidebarLink>
                  <MainSidebarLink
                    tab="reports"
                    variant="ghost"
                    className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                  >
                    <FileText className="w-5 h-5" /> {!sidebarCollapsed && 'Rapports'}
                  </MainSidebarLink>
                </>
              )}

              <Separator className="my-2" />
              <MainSidebarLink tab="overtime" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <Clock className="w-5 h-5" /> {!sidebarCollapsed && 'Heures Sup.'}
              </MainSidebarLink>
              <MainSidebarLink tab="links" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <ExternalLink className="w-5 h-5" /> {!sidebarCollapsed && 'Liens Externes'}
              </MainSidebarLink>
              <MainSidebarLink tab="email" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <MessageCircle className="w-5 h-5" /> {!sidebarCollapsed && 'Chats'}
              </MainSidebarLink>
              <MainSidebarLink tab="messagerie" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <Mail className="w-5 h-5" /> {!sidebarCollapsed && 'Messagerie'}
              </MainSidebarLink>
              <MainSidebarLink tab="ged" variant="ghost" className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}>
                <FileText className="w-5 h-5" /> {!sidebarCollapsed && 'GED Documents'}
              </MainSidebarLink>
            </nav>
          </ScrollArea>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 p-2 sm:p-4 lg:p-6 min-h-[calc(100vh-3.5rem)] overflow-auto">
          <div className="space-y-2 sm:space-y-4">
            <Card>
              <CardHeader
                onMouseEnter={() => setHeaderHovered(true)}
                onMouseLeave={() => setHeaderHovered(false)}
              >
                <div className={`overflow-hidden transition-all duration-500 ${
                  headerHovered 
                    ? 'max-h-12 opacity-100 translate-y-0 pb-2' 
                    : 'max-h-0 opacity-0 -translate-y-3'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToTicketsList}
                      aria-label="Retour liste tickets"
                      title="Retour liste tickets"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Options ticket"
                          title="Options ticket"
                          className="ml-auto"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onSelect={() => openExactDatesDialog()}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) ? 'Modifier la date exacte du ticket' : 'Créer une date exacte'}
                        </DropdownMenuItem>
                        {Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => void deleteExactDates()}
                            disabled={deletingExactDates}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingExactDates ? 'Suppression...' : 'Supprimer les dates exactes'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Badge className={heroBadge.className}>{heroBadge.label}</Badge>

                  <div
                    className="relative"
                    onMouseEnter={openTicketIdMenu}
                    onMouseLeave={closeTicketIdMenuWithDelay}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs sm:text-sm"
                      onClick={() => void copyText(ticketState.numero ?? '', 'ID ticket')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openTicketIdMenu();
                      }}
                    >
                      {ticketState.numero}
                    </Button>

                    {ticketIdMenuOpen && (
                      <div
                        className="absolute z-20 mt-1 left-0 right-0 w-auto sm:w-56 rounded-md border bg-background shadow-lg p-1 mx-auto sm:mx-0 max-w-xs sm:max-w-none"
                        onMouseEnter={openTicketIdMenu}
                        onMouseLeave={closeTicketIdMenuWithDelay}
                      >
                        <button
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                          onClick={() => {
                            void copyText(ticketState.numero ?? '', 'ID ticket');
                            setTicketIdMenuOpen(false);
                          }}
                        >
                          Copier l'ID Ticket
                        </button>
                        <button
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                          onClick={() => {
                            void copyText(getTicketUrl(ticketState.id), 'URL ticket');
                            setTicketIdMenuOpen(false);
                          }}
                        >
                          Copier l'URL Ticket
                        </button>
                        <button
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                          onClick={() => {
                            void copyText(ticketState.objet ?? '', 'Objet ticket');
                            setTicketIdMenuOpen(false);
                          }}
                        >
                          Copier l'objet Ticket
                        </button>
                        <button
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                          onClick={() => {
                            let metadataText = '';
                            try {
                              metadataText = JSON.stringify(ticketMetadata, null, 2);
                            } catch {
                              metadataText = String(ticketMetadata ?? '');
                            }
                            void copyText(metadataText, 'Metadonnees ticket');
                            setTicketIdMenuOpen(false);
                          }}
                        >
                          Copier metadonnees Ticket
                        </button>
                      </div>
                    )}
                  </div>

                  <Badge variant="outline" className="text-xs sm:text-sm">{String(ticketState.priority ?? '-')}</Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl line-clamp-2 mt-2">{ticketState.objet || 'Detail ticket'}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Cree le {formatMaybeDate(ticketState.createdAt)} • Createur: {ticketState.creatorName || '-'}
                </CardDescription>
                {latestLifecycleSummary && (
                  <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-cyan-200/70 bg-cyan-50/70 px-2.5 py-1.5 text-xs text-cyan-800 shadow-sm dark:border-cyan-800/60 dark:bg-cyan-900/20 dark:text-cyan-200">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{latestLifecycleSummary}</span>
                  </div>
                )}
                {Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50/70 px-2.5 py-1.5 text-xs text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                    onClick={openExactDatesDialog}
                  >
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Ce ticket possède une date exacte</span>
                  </button>
                )}
                {dueDateAlertMessage && (
                  <div className="mt-2 rounded-lg border border-red-300/80 bg-red-50 px-3 py-2 text-xs text-red-800 shadow-sm dark:border-red-800/70 dark:bg-red-950/25 dark:text-red-200">
                    {dueDateAlertMessage}
                  </div>
                )}
                {noCommentSinceThreeDaysMessage && (
                  <div className="mt-2 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-200">
                    {noCommentSinceThreeDaysMessage}
                  </div>
                )}

                <Dialog open={exactDatesDialogOpen} onOpenChange={setExactDatesDialogOpen}>
                  <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto border-2 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="pr-8 text-base sm:text-xl">
                        {Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) ? 'Modifier les dates exactes du ticket' : 'Créer les dates exactes du ticket'}
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                        Ces dates exactes sont utilisées pour affiner les calculs SLA sans modifier la date système de création du ticket.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-cyan-200/70 bg-cyan-50/70 p-3 text-xs leading-relaxed text-cyan-900 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-200">
                        <p><span className="font-semibold">Création système:</span> {formatMaybeDate(ticketState.createdAt)}</p>
                        <p><span className="font-semibold">Début exact:</span> {ticketState.exactStartAt ? formatMaybeDate(ticketState.exactStartAt) : 'Non renseigné'}</p>
                        <p><span className="font-semibold">Fermeture exacte:</span> {ticketState.exactClosedAt ? formatMaybeDate(ticketState.exactClosedAt) : 'Non renseignée'}</p>
                        <p className="mt-1 text-[11px] opacity-90">
                          Dernière mise à jour: {ticketState.exactDatesUpdatedByName ? `${ticketState.exactDatesUpdatedByName} le ${formatMaybeDate(ticketState.exactDatesUpdatedAt)}` : 'Aucune'}
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="exact-start-at">Date exacte de début</Label>
                        <Input
                          id="exact-start-at"
                          type="datetime-local"
                          value={exactStartAtDraft}
                          onChange={(event) => setExactStartAtDraft(event.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="exact-closed-at">Date exacte de fermeture</Label>
                        <Input
                          id="exact-closed-at"
                          type="datetime-local"
                          value={exactClosedAtDraft}
                          onChange={(event) => setExactClosedAtDraft(event.target.value)}
                          disabled={String(ticketState.status ?? '').toUpperCase() !== 'CLOSED'}
                        />
                        {String(ticketState.status ?? '').toUpperCase() !== 'CLOSED' && (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Les tickets en attente ou escaladés ne peuvent pas recevoir une date exacte de fermeture.
                          </p>
                        )}
                      </div>

                      <label className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm dark:border-slate-700/70 dark:bg-slate-800/35">
                        <input
                          type="checkbox"
                          checked={closeTicketWithExactDate}
                          onChange={(event) => setCloseTicketWithExactDate(event.target.checked)}
                          disabled={String(ticketState.status ?? '').toUpperCase() !== 'CLOSED'}
                          className="mt-0.5"
                        />
                        <span className="leading-relaxed">Fermer le ticket après enregistrement (si aucune fermeture exacte n'est saisie, la date courante sera utilisée)</span>
                      </label>
                    </div>

                    <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                      {Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) && (
                        <Button
                          variant="destructive"
                          onClick={() => void deleteExactDates()}
                          disabled={exactDatesSaving || deletingExactDates}
                          className="w-full sm:mr-auto sm:w-auto"
                        >
                          {deletingExactDates ? 'Suppression...' : 'Supprimer les dates exactes'}
                        </Button>
                      )}
                      <Button className="w-full sm:w-auto" variant="outline" onClick={() => setExactDatesDialogOpen(false)} disabled={exactDatesSaving || deletingExactDates}>
                        Annuler
                      </Button>
                      <Button className="w-full sm:w-auto" onClick={() => void saveExactDates()} disabled={exactDatesSaving || deletingExactDates}>
                        {exactDatesSaving ? 'Enregistrement...' : Boolean(ticketState.exactStartAt || ticketState.exactClosedAt) ? 'Enregistrer la modification' : 'Enregistrer'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="mt-4 rounded-2xl border border-white/25 bg-white/55 p-3 shadow-lg backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/40">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-white/40 bg-white/70 backdrop-blur dark:border-slate-700 dark:bg-slate-900/50"
                      onClick={focusConversationComposer}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Commenter
                    </Button>

                    {canRunLifecycleActions && (
                      <Dialog
                        open={editDialogOpen}
                        onOpenChange={(open) => {
                          setEditDialogOpen(open);
                          if (!open) {
                            setIsDraggingEditDialog(false);
                            setEditDialogPosition(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-white/40 bg-white/70 backdrop-blur dark:border-slate-700 dark:bg-slate-900/50"
                          >
                            <Edit3 className="h-4 w-4" />
                            Modifier le ticket
                          </Button>
                        </DialogTrigger>
                        {editDialogOpen && (
                          <DialogContent
                            className="w-[96vw] max-w-none sm:max-w-none sm:w-[min(94vw,1200px)] h-[90vh] min-h-140 sm:min-w-190 max-h-[92vh] overflow-auto resize-none sm:resize rounded-2xl border border-border bg-background shadow-2xl dark:border-slate-700/70 dark:bg-slate-950/55 dark:backdrop-blur-2xl dark:supports-backdrop-filter:bg-slate-950/45 data-[state=open]:duration-300 data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0"
                            style={editDialogPosition ? { left: `${editDialogPosition.x}px`, top: `${editDialogPosition.y}px`, transform: 'translate(0, 0)' } : undefined}
                          >
                        <DialogHeader
                          className="sticky top-0 z-10 -mx-2 px-2 pb-2 pt-1 bg-background/95 dark:bg-slate-950/40 dark:backdrop-blur-md cursor-grab active:cursor-grabbing select-none"
                          onMouseDown={startEditDialogDrag}
                        >
                          <DialogTitle>Modifier le ticket</DialogTitle>
                          <DialogDescription>
                            Toute modification est tracée automatiquement dans l'historique du ticket. Vous pouvez déplacer et redimensionner cette fenêtre.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-1">
                          {/* Due Date Alert */}
                          {editTicketForm.dueDate && (
                            (() => {
                              const dueDate = new Date(editTicketForm.dueDate);
                              const now = new Date();
                              const isPassed = dueDate < now;
                              const isClosed = ticketState.status === 'CLOSED';
                              if (isPassed && !isClosed) {
                                return (
                                  <div className="rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 space-y-2">
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Date d'échéance dépassée</p>
                                    <p className="text-xs text-red-600 dark:text-red-300">
                                      La date d'échéance ({format(dueDate, 'dd/MM/yyyy HH:mm')}) est passée. 
                                      {isClosed ? ' Le ticket est fermé.' : ' Veuillez revoir ou modifier.'}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}

                          {/* Section Identification */}
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identification</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="edit-objet">Objet <span className="text-destructive">*</span></Label>
                                <Input
                                  id="edit-objet"
                                  placeholder="Objet du ticket"
                                  value={editTicketForm.objet}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, objet: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-category">Catégorie</Label>
                                <Select
                                  value={editTicketForm.category}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({
                                    ...prev,
                                    category: v,
                                    maintenanceMode: v !== 'maintenance' ? '' : prev.maintenanceMode,
                                    incidentLevel: v !== 'incident' ? '' : prev.incidentLevel,
                                  }))}
                                >
                                  <SelectTrigger id="edit-category"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    {EDIT_CATEGORIES.map((c) => (
                                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-priority">Priorité</Label>
                                <Select
                                  value={editTicketForm.priority}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, priority: v }))}
                                >
                                  <SelectTrigger id="edit-priority"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {EDIT_PRIORITIES.map((p) => (
                                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-classification">Classification</Label>
                                <Select
                                  value={editTicketForm.classification || '__none__'}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, classification: v === '__none__' ? '' : v }))}
                                >
                                  <SelectTrigger id="edit-classification"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Aucune —</SelectItem>
                                    <SelectItem value="SECURITY">Sécurité</SelectItem>
                                    <SelectItem value="PROBLEM">Problème</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-channel">Canal utilisé</Label>
                                <Select
                                  value={editTicketForm.channel || '__none__'}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, channel: v === '__none__' ? '' : v }))}
                                >
                                  <SelectTrigger id="edit-channel"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Aucun —</SelectItem>
                                    <SelectItem value="PHONE">Par Appel</SelectItem>
                                    <SelectItem value="EMAIL">Par Mail</SelectItem>
                                    <SelectItem value="NOC_DECISION">Décidé par le NOC</SelectItem>
                                    <SelectItem value="PRESENTIEL">En présentiel</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {(editTicketForm.category === 'maintenance' || editTicketForm.category === 'incident') && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {editTicketForm.category === 'maintenance' && (
                                  <div className="space-y-1.5">
                                    <Label htmlFor="edit-maintenanceMode">Type de maintenance</Label>
                                    <Select
                                      value={editTicketForm.maintenanceMode || '__none__'}
                                      onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, maintenanceMode: v === '__none__' ? '' : v }))}
                                    >
                                      <SelectTrigger id="edit-maintenanceMode"><SelectValue placeholder="Préventive ou Curative" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">— Non défini —</SelectItem>
                                        <SelectItem value="preventive">Préventive</SelectItem>
                                        <SelectItem value="curative">Curative</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                {editTicketForm.category === 'incident' && (
                                  <div className="space-y-1.5">
                                    <Label htmlFor="edit-incidentLevel">Niveau incident</Label>
                                    <Select
                                      value={editTicketForm.incidentLevel || '__none__'}
                                      onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, incidentLevel: v === '__none__' ? '' : v }))}
                                    >
                                      <SelectTrigger id="edit-incidentLevel"><SelectValue placeholder="Critique ou Majeur" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">— Non défini —</SelectItem>
                                        <SelectItem value="critical">Critique</SelectItem>
                                        <SelectItem value="major">Majeur</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            )}
                            {(editTicketForm.channel === 'PHONE' || editTicketForm.channel === 'PRESENTIEL') && (
                              <div className="space-y-1.5 pt-1">
                                <Label htmlFor="edit-channelRequestTime">Heure de la demande</Label>
                                <Input
                                  id="edit-channelRequestTime"
                                  type="datetime-local"
                                  value={editTicketForm.channelRequestTime}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, channelRequestTime: e.target.value }))}
                                />
                              </div>
                            )}
                            {editTicketForm.channel === 'EMAIL' && (
                              <div className="space-y-1.5 pt-1">
                                <Label htmlFor="edit-channelEmailLink">Lien de la demande mail</Label>
                                <Input
                                  id="edit-channelEmailLink"
                                  placeholder="https://..."
                                  value={editTicketForm.channelEmailLink}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, channelEmailLink: e.target.value }))}
                                />
                              </div>
                            )}

                          </div>

                          {/* Section Description */}
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
                            <div className="space-y-1.5">
                              <Label htmlFor="edit-description">Description détaillée</Label>
                              <Zarko
                                value={editTicketForm.description}
                                onChange={(html) => setEditTicketForm((prev) => ({ ...prev, description: html }))}
                                placeholder="Décrivez le problème ou la demande..."
                                minHeight="220px"
                                enableTicketReferences
                                className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
                              />
                            </div>
                          </div>

                          {/* Section Localisation */}
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Localisation</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-site">Site</Label>
                                <Select
                                  value={editTicketForm.site || '__none__'}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, site: v === '__none__' ? '' : v }))}
                                >
                                  <SelectTrigger id="edit-site"><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Aucun —</SelectItem>
                                    {EDIT_SITES.map((s) => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-localite">Localité</Label>
                                <Select
                                  value={editTicketForm.localite || '__none__'}
                                  onValueChange={(v) => setEditTicketForm((prev) => ({ ...prev, localite: v === '__none__' ? '' : v }))}
                                >
                                  <SelectTrigger id="edit-localite"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Aucune —</SelectItem>
                                    {EDIT_LOCALITIES.map((l) => (
                                      <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Section Assignation */}
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignation</p>
                            <div className="space-y-2">
                              <Label>Techniciens assignés</Label>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" className="w-full justify-between">
                                    <span className="truncate text-left">
                                      {editSelectedTechnicianLabels.length > 0
                                        ? `${editSelectedTechnicianLabels.length} technicien(s) sélectionné(s)`
                                        : 'Sélectionner un ou plusieurs techniciens'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-60" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-90 max-h-75 overflow-auto">
                                  {ticketTechnicianOptions.map((tech) => (
                                    <DropdownMenuCheckboxItem
                                      key={tech.id}
                                      checked={editTicketForm.technicienIds.includes(tech.id)}
                                      onCheckedChange={(checked) => {
                                        setEditTicketForm((prev) => {
                                          if (checked) {
                                            return {
                                              ...prev,
                                              technicienIds: Array.from(new Set([...prev.technicienIds, tech.id])),
                                              technicienNames: Array.from(new Set([...prev.technicienNames, tech.name])),
                                            };
                                          }
                                          return {
                                            ...prev,
                                            technicienIds: prev.technicienIds.filter((id) => id !== tech.id),
                                            technicienNames: prev.technicienNames.filter((name) => name !== tech.name),
                                          };
                                        });
                                      }}
                                    >
                                      {tech.name}
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {editSelectedTechnicianLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {editSelectedTechnicianLabels.map((name) => (
                                    <Badge key={name} variant="secondary" className="max-w-55 truncate">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Propriétaire + Clients */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-owner">Propriétaire du ticket</Label>
                                <Select
                                  value={editTicketForm.ownerTechnicianId || '__none__'}
                                  onValueChange={(v) => {
                                    if (v === '__none__') {
                                      setEditTicketForm((prev) => ({ ...prev, ownerTechnicianId: '' }));
                                    } else {
                                      setEditTicketForm((prev) => ({ ...prev, ownerTechnicianId: v }));
                                    }
                                  }}
                                  disabled={editTicketForm.technicienIds.length === 0}
                                >
                                  <SelectTrigger id="edit-owner"><SelectValue placeholder="Parmi les techniciens assignés" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Aucun —</SelectItem>
                                    {ticketTechnicianOptions
                                      .filter((t) => editTicketForm.technicienIds.includes(t.id))
                                      .map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {editTicketForm.ownerTechnicianId && (
                                  <p className="text-xs text-muted-foreground">
                                    Propriétaire: {ticketTechnicianOptions.find((t) => t.id === editTicketForm.ownerTechnicianId)?.name ?? editTicketForm.ownerTechnicianId}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <Label>Clients</Label>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" className="w-full justify-between">
                                      <span className="truncate text-left">
                                        {editTicketForm.clientIds.length > 0
                                          ? `${editTicketForm.clientIds.length} client(s) sélectionné(s)`
                                          : 'Sélectionner client(s)'}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-90 max-h-75 overflow-auto">
                                    {ticketClientOptions.map((client) => (
                                      <DropdownMenuCheckboxItem
                                        key={client.id}
                                        checked={editTicketForm.clientIds.includes(client.id)}
                                        onCheckedChange={(checked) => {
                                          setEditTicketForm((prev) => ({
                                            ...prev,
                                            clientIds: checked
                                              ? Array.from(new Set([...prev.clientIds, client.id]))
                                              : prev.clientIds.filter((id) => id !== client.id),
                                          }));
                                        }}
                                      >
                                        {client.name}
                                      </DropdownMenuCheckboxItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {editTicketForm.clientIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {editTicketForm.clientIds.map((id) => {
                                      const name = ticketClientOptions.find((c) => c.id === id)?.name ?? id;
                                      return (
                                        <Badge key={id} variant="secondary" className="max-w-50 truncate">
                                          {name}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Section Planification */}
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planification & SLA</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-duedate">Date d'échéance</Label>
                                <Input
                                  id="edit-duedate"
                                  type="datetime-local"
                                  value={editTicketForm.dueDate}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-etr">ETR (Estimated Time to Repair)</Label>
                                <Input
                                  id="edit-etr"
                                  type="datetime-local"
                                  value={editTicketForm.etr}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, etr: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-sla">SLA (ou entrez une valeur)</Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={EDIT_SLA_OPTIONS.includes(editTicketForm.sla) ? editTicketForm.sla : '__custom__'}
                                    onValueChange={(v) => {
                                      if (v !== '__custom__' && v !== '__none__') {
                                        setEditTicketForm((prev) => ({ ...prev, sla: v }));
                                      } else if (v === '__none__') {
                                        setEditTicketForm((prev) => ({ ...prev, sla: '' }));
                                      }
                                    }}
                                  >
                                    <SelectTrigger id="edit-sla" className="flex-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">— Non défini —</SelectItem>
                                      {EDIT_SLA_OPTIONS.map((v) => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                      ))}
                                      <SelectItem value="__custom__">Personnalisé...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {!EDIT_SLA_OPTIONS.includes(editTicketForm.sla) && editTicketForm.sla && (
                                    <Input
                                      placeholder="Ex: 12h, 2 jours"
                                      value={editTicketForm.sla}
                                      onChange={(e) => setEditTicketForm((prev) => ({ ...prev, sla: e.target.value }))}
                                      className="flex-1"
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-slr">SLR</Label>
                                <Input
                                  id="edit-slr"
                                  placeholder="Ex : 95 %, 99.5 %"
                                  value={editTicketForm.slr}
                                  onChange={(e) => setEditTicketForm((prev) => ({ ...prev, slr: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="sticky bottom-0 z-10 -mx-2 mt-2 px-2 py-2 bg-background/95 dark:bg-slate-950/45 dark:backdrop-blur-md">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updatingTicket}>Annuler</Button>
                          <Button onClick={() => void saveTicketEdition()} disabled={updatingTicket}>
                            {updatingTicket ? 'Enregistrement…' : 'Enregistrer les modifications'}
                          </Button>
                        </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    )}

                    {canManageEscalation && (
                      <>
                        <div className="hidden sm:block h-6 w-px bg-border/60" />

                        <Dialog
                          open={escalateDialogOpen}
                          onOpenChange={(open) => {
                            setEscalateDialogOpen(open);
                            if (!open) {
                              setEscalationCustomTarget('');
                              setEscalationDialogTab('custom');
                              setEscalationLevel('');
                            } else if (!escalationLevel) {
                              const firstLevel = ESCALATION_MATRIX[0]?.levels?.[0]?.level ?? '';
                              setEscalationLevel(firstLevel);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-amber-200/60 bg-amber-50/70 text-amber-800 hover:bg-amber-100 backdrop-blur dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300"
                              disabled={lifecycleActionLoading}
                              title="Changer le statut en Escaladé"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Escalader
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Escalader le ticket #{ticketState.numero}</DialogTitle>
                              <DialogDescription>
                                Choisissez soit l&apos;escalade via la matrice, soit l&apos;ancien mode libre. L&apos;annulation de l&apos;escalade reste disponible pour tous.
                              </DialogDescription>
                            </DialogHeader>

                            <Tabs
                              value={escalationDialogTab}
                              onValueChange={(value) => setEscalationDialogTab(value as 'matrix' | 'custom')}
                              className="mt-2 space-y-4"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="custom">Mode libre</TabsTrigger>
                                <TabsTrigger value="matrix">Via la matrice</TabsTrigger>
                              </TabsList>

                              <TabsContent value="matrix" className="m-0 space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <Label>Domaine</Label>
                                      <Select
                                        value={escalationMatrixDomainEntry?.domain ?? 'NOC'}
                                        onValueChange={(value) => {
                                          setEscalationMatrixDomain(value);
                                          const nextDomain = ESCALATION_MATRIX.find((entry) => entry.domain === value);
                                          setEscalationLevel(nextDomain?.levels?.[0]?.level ?? '');
                                        }}
                                      >
                                        <SelectTrigger><SelectValue placeholder="Sélectionner un domaine" /></SelectTrigger>
                                        <SelectContent>
                                          {ESCALATION_MATRIX.map((entry) => (
                                            <SelectItem key={entry.domain} value={entry.domain}>{entry.domain}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label>Niveau d&apos;escalade</Label>
                                      <Select value={escalationLevel} onValueChange={setEscalationLevel}>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                                        <SelectContent>
                                          {escalationMatrixLevels.map((level) => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-background dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-amber-900/20">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-slate-100 dark:bg-slate-800">
                                        <tr>
                                          <th className="border-b px-2 py-2 text-left">Domaine</th>
                                          <th className="border-b px-2 py-2 text-left">Niveau</th>
                                          <th className="border-b px-2 py-2 text-left">Nom</th>
                                          <th className="border-b px-2 py-2 text-left">Contact / Fonction</th>
                                          <th className="border-b px-2 py-2 text-left">Choix</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {escalationMatrixCandidates.length > 0 ? escalationMatrixCandidates.map((entry, index) => {
                                          const targetLabel = formatEscalationMatrixTarget(entry);
                                          const checked = escalationTargets.some((entry) => entry.toLowerCase() === targetLabel.toLowerCase());
                                          return (
                                            <tr key={`${escalationMatrixDomainEntry?.domain ?? 'domain'}-${entry.level}-${entry.name}-${index}`}>
                                              <td className="border-b px-2 py-2">{escalationMatrixDomainEntry?.domain ?? '-'}</td>
                                              <td className="border-b px-2 py-2">{entry.level}</td>
                                              <td className="border-b px-2 py-2 font-medium">{entry.name}</td>
                                              <td className="border-b px-2 py-2">{entry.contact}</td>
                                              <td className="border-b px-2 py-2">
                                                <input
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={() => toggleEscalationTarget(targetLabel)}
                                                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                />
                                              </td>
                                            </tr>
                                          );
                                        }) : (
                                          <tr>
                                            <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                                              Aucun contact disponible pour ce niveau.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </TabsContent>


                              <TabsContent value="custom" className="m-0 space-y-4">

                                <div>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Destinataires prédéfinis</p>
                                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {ESCALATION_TARGET_OPTIONS.map((target) => {
                                      const checked = escalationTargets.some((entry) => entry.toLowerCase() === target.toLowerCase());
                                      return (
                                        <label
                                          key={target}
                                          className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleEscalationTarget(target)}
                                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                          />
                                          <span>{target}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ajouter un destinataire libre</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Input
                                      value={escalationCustomTarget}
                                      onChange={(event) => setEscalationCustomTarget(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          appendEscalationCustomTarget();
                                        }
                                      }}
                                      placeholder="Ex: Responsable N2, client VIP, etc."
                                    />
                                    <Button type="button" variant="secondary" onClick={appendEscalationCustomTarget}>
                                      Ajouter
                                    </Button>
                                  </div>
                                </div>
                              </TabsContent>

                              {escalationTargets.length > 0 && (
                                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Destinataires sélectionnés</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {escalationTargets.map((target) => (
                                      <Badge key={target} variant="secondary" className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200">
                                        {target}
                                        <button
                                          type="button"
                                          className="inline-flex items-center"
                                          onClick={() => removeEscalationTarget(target)}
                                          aria-label={`Retirer ${target}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Tabs>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEscalateDialogOpen(false);
                                  setEscalationCustomTarget('');
                                  setEscalationDialogTab('custom');
                                  setEscalationLevel('');
                                }}
                              >
                                Annuler
                              </Button>
                              {String(ticketState.status ?? '').toUpperCase() === 'ESCALATED' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-emerald-200/60 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 backdrop-blur dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                                  onClick={async () => {
                                    await cancelEscalation();
                                    setEscalateDialogOpen(false);
                                    setEscalationCustomTarget('');
                                    setEscalationDialogTab('custom');
                                    setEscalationLevel('');
                                  }}
                                  disabled={lifecycleActionLoading}
                                >
                                  Annuler escalade
                                </Button>
                              )}
                              <Button
                                className="bg-amber-600 text-white hover:bg-amber-700"
                                disabled={lifecycleActionLoading || escalationTargets.length === 0 || !escalationLevel}
                                onClick={async () => {
                                  const ok = await escalateTicket(escalationTargets, escalationLevel);
                                  if (!ok) return;
                                  setEscalateDialogOpen(false);
                                  setEscalationCustomTarget('');
                                  setEscalationDialogTab('custom');
                                  setEscalationLevel('');
                                }}
                              >
                                Confirmer l&apos;escalade
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}

                    {canRunLifecycleActions && (
                      <>
                        <div className="hidden sm:block h-6 w-px bg-border/60" />

                        <Dialog
                          open={pendingDialogOpen}
                          onOpenChange={(nextOpen) => {
                            setPendingDialogOpen(nextOpen);
                            if (!nextOpen) {
                              setPendingReasonPreset('');
                              setPendingReasonCustom('');
                              setPendingReportedUntil('');
                              setPendingAdjournedCategory('');
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-violet-200/60 bg-violet-50/70 text-violet-800 hover:bg-violet-100 backdrop-blur dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300"
                              disabled={lifecycleActionLoading}
                              title="Mettre le ticket en attente"
                            >
                              <Pause className="h-4 w-4" />
                              Mettre en attente
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Mettre le ticket en attente</DialogTitle>
                              <DialogDescription>
                                Sélectionnez un motif rapide ou rédigez un motif personnalisé. Le message généré sera utilisé pour le retour utilisateur et l&apos;historique.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Motifs rapides</Label>
                                <div className="flex flex-wrap gap-2">
                                  {PENDING_REASON_OPTIONS.map((reason) => {
                                    const active = pendingReasonPreset === reason;
                                    return (
                                      <Button
                                        key={reason}
                                        type="button"
                                        variant={active ? 'default' : 'outline'}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => {
                                          setPendingReasonPreset((current) => current === reason ? '' : reason);
                                          if (reason !== 'Reporte') setPendingReportedUntil('');
                                          if (reason !== 'Ajourne') setPendingAdjournedCategory('');
                                        }}
                                      >
                                        {PENDING_REASON_LABELS[reason]}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="pending-reason-custom">Motif personnalisé</Label>
                                <Textarea
                                  id="pending-reason-custom"
                                  rows={3}
                                  value={pendingReasonCustom}
                                  onChange={(event) => setPendingReasonCustom(event.target.value)}
                                  placeholder="Ex: en attente de validation du client, en attente du retour du fournisseur, accès site indisponible..."
                                />
                              </div>

                              {pendingReasonPreset === 'Reporte' && (
                                <div className="space-y-2">
                                  <Label htmlFor="pending-reported-until">Date reportée</Label>
                                  <Input
                                    id="pending-reported-until"
                                    type="datetime-local"
                                    value={pendingReportedUntil}
                                    onChange={(event) => setPendingReportedUntil(event.target.value)}
                                  />
                                </div>
                              )}

                              {pendingReasonPreset === 'Ajourne' && (
                                <div className="space-y-2">
                                  <Label>Catégorie pour l&apos;ajournement</Label>
                                  <Select value={pendingAdjournedCategory} onValueChange={setPendingAdjournedCategory}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {AJOURNED_PENDING_CATEGORIES.map((category) => (
                                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="rounded-xl border border-violet-200/70 bg-violet-50/70 p-3 text-sm dark:border-violet-800/50 dark:bg-violet-900/20">
                                <p className="font-semibold text-violet-900 dark:text-violet-200">Aperçu du message</p>
                                <p className="mt-1 text-violet-800 dark:text-violet-100">
                                  {pendingReasonPreview || 'Sélectionnez un motif ou saisissez une raison personnalisée pour générer le message de mise en attente.'}
                                </p>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setPendingDialogOpen(false);
                                  setPendingReasonPreset('');
                                  setPendingReasonCustom('');
                                  setPendingReportedUntil('');
                                  setPendingAdjournedCategory('');
                                }}
                              >
                                Annuler
                              </Button>
                              <Button
                                type="button"
                                className="bg-violet-600 text-white hover:bg-violet-700"
                                disabled={lifecycleActionLoading || !pendingReasonPreview || String(ticketState.status ?? '').toUpperCase() === 'PENDING'}
                                onClick={() => void pendingTicket(pendingReasonPreview)}
                              >
                                Confirmer la mise en attente
                              </Button>
                              {String(ticketState.status ?? '').toUpperCase() === 'PENDING' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-emerald-200/60 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 backdrop-blur dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                                  onClick={async () => {
                                    await cancelPendingTicket();
                                    setPendingDialogOpen(false);
                                    setPendingReasonPreset('');
                                    setPendingReasonCustom('');
                                    setPendingReportedUntil('');
                                    setPendingAdjournedCategory('');
                                  }}
                                  disabled={lifecycleActionLoading}
                                >
                                  Annuler la mise en attente
                                </Button>
                              )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-sky-200/60 bg-sky-50/70 text-sky-800 hover:bg-sky-100 backdrop-blur dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-300"
                          onClick={() => void reopenTicket()}
                          disabled={lifecycleActionLoading}
                          title="Remettre le ticket à l'état Ouvert"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Rouvrir
                        </Button>

                    <div className="hidden sm:block h-6 w-px bg-border/60" />

                        {/* Date d'échéance rapide */}
                        <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/60 px-2 py-1 dark:border-slate-700/60 dark:bg-slate-900/35">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <Popover
                            open={dueDatePickerOpen}
                            onOpenChange={(open) => {
                              setDueDatePickerOpen(open);
                              if (open) syncDueDatePickerFromDraft();
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-7 w-52 justify-start px-1.5 text-left text-sm font-normal"
                                title="Date d'échéance"
                              >
                                {dueDateDraft ? formatMaybeDate(dueDateDraft) : 'Definir date et heure'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[320px] p-0">
                              <div className="border-b px-3 py-2">
                                <p className="text-xs text-muted-foreground">Date d'échéance</p>
                                <p className="text-sm font-semibold">{dueDateDraft ? formatMaybeDate(dueDateDraft) : 'Non définie'}</p>
                              </div>

                              <div className="p-2">
                                <UiCalendar
                                  mode="single"
                                  selected={dueDatePickerDate}
                                  onSelect={(date) => {
                                    if (date) setDueDatePickerDate(date);
                                  }}
                                  className="mx-auto"
                                />

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <Select value={dueDatePickerHour} onValueChange={setDueDatePickerHour}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Heure" /></SelectTrigger>
                                    <SelectContent>
                                      {dueHourOptions.map((hour) => (
                                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={dueDatePickerMinute} onValueChange={setDueDatePickerMinute}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Minute" /></SelectTrigger>
                                    <SelectContent>
                                      {dueMinuteOptions.map((minute) => (
                                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void clearDueDateFromPicker()}
                                    disabled={lifecycleActionLoading}
                                  >
                                    Effacer
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void applyDueDateFromPicker()}
                                    disabled={lifecycleActionLoading || !dueDatePickerDate}
                                  >
                                    Appliquer
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2.5 text-xs gap-1.5"
                          onClick={() => {
                            const currentStatus = String(ticketState.status ?? ticket.status ?? '').toUpperCase();
                            setArchiveReasonType(currentStatus === 'ESCALATED' ? 'escalated' : currentStatus === 'PENDING' ? 'pending' : 'open');
                            setArchiveReasonText('');
                            setArchiveDialogOpen(true);
                          }}
                          disabled={lifecycleActionLoading}
                          title="Archiver le ticket"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archiver
                        </Button>

                        <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                          <DialogContent className="max-w-2xl border-2 bg-white dark:border-slate-700 dark:bg-slate-900">
                            <DialogHeader>
                              <DialogTitle>Archivage du ticket</DialogTitle>
                              <DialogDescription>
                                {String(ticketState.status ?? ticket.status ?? '').toUpperCase() !== 'CLOSED' && String(ticketState.status ?? ticket.status ?? '').toUpperCase() !== 'RESOLVED'
                                  ? 'Renseigner un motif pour archiver ce ticket non fermé.'
                                  : 'Êtes-vous sûr de vouloir archiver ce ticket ?'}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                              {String(ticketState.status ?? ticket.status ?? '').toUpperCase() !== 'CLOSED' && String(ticketState.status ?? ticket.status ?? '').toUpperCase() !== 'RESOLVED' ? (
                                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div className="flex-1 space-y-2">
                                      <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                        Ce ticket est encore {(() => {
                                          const status = String(ticketState.status ?? ticket.status ?? '').toUpperCase();
                                          if (status === 'OPEN') return 'ouvert';
                                          if (status === 'ESCALATED') return 'escaladé';
                                          if (status === 'PENDING') return 'en attente';
                                          return status.toLowerCase();
                                        })()}
                                      </div>
                                      <div className="text-sm text-amber-800 dark:text-amber-300">Veuillez renseigner un motif avant l'archivage.</div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="archive-reason" className="text-sm font-medium text-foreground">Motif d'archivage</Label>
                                    <Textarea
                                      id="archive-reason"
                                      value={archiveReasonText}
                                      onChange={(event) => setArchiveReasonText(event.target.value)}
                                      placeholder="Veuillez renseigner le motif de l'archivage..."
                                      rows={4}
                                      className="border-2 dark:border-slate-600 dark:bg-slate-800"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={lifecycleActionLoading}>
                                Annuler
                              </Button>
                              <Button onClick={() => void archiveTicket()} disabled={lifecycleActionLoading}>
                                Archiver quand meme
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <div className="hidden sm:block h-6 w-px bg-border/60" />

                        {/* Suppression */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-red-200/60 bg-red-50/70 text-red-700 hover:bg-red-100 backdrop-blur dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400"
                          onClick={() => setTrashDeleteDialogOpen(true)}
                          disabled={lifecycleActionLoading || trashDeleteLoading}
                          title="Déplacer vers la corbeille"
                        >
                          <Trash2 className="h-4 w-4" />
                          {trashDeleteLoading ? 'Suppression...' : 'Supprime'}
                        </Button>

                        <Dialog open={trashDeleteDialogOpen} onOpenChange={setTrashDeleteDialogOpen}>
                          <DialogContent className="max-w-xl border-2 bg-white dark:border-slate-700 dark:bg-slate-900">
                            <DialogHeader>
                              <DialogTitle>Supprimer ce ticket ?</DialogTitle>
                              <DialogDescription>
                                Le ticket sera envoyé dans la corbeille.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                              Ticket concerné: <span className="font-semibold">{ticketState.numero || ticket.numero}</span> — {ticketState.objet || ticket.objet}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setTrashDeleteDialogOpen(false)} disabled={trashDeleteLoading}>
                                Annuler
                              </Button>
                              <Button variant="destructive" onClick={() => void moveTicketToTrash()} disabled={trashDeleteLoading}>
                                {trashDeleteLoading ? 'Suppression...' : 'Confirmer la suppression'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={deleteConfirmDialogOpen}
                          onOpenChange={(open) => {
                            setDeleteConfirmDialogOpen(open);
                            if (!open) setDeleteConfirmTarget(null);
                          }}
                        >
                          <DialogContent className="max-w-lg border-2 bg-white dark:border-slate-700 dark:bg-slate-900">
                            <DialogHeader>
                              <DialogTitle>{deleteConfirmText.title}</DialogTitle>
                              <DialogDescription>{deleteConfirmText.description}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDeleteConfirmDialogOpen(false);
                                  setDeleteConfirmTarget(null);
                                }}
                                disabled={updatingTicket}
                              >
                                Annuler
                              </Button>
                              <Button variant="destructive" onClick={() => void confirmDeleteTarget()} disabled={updatingTicket}>
                                {updatingTicket ? 'Suppression...' : 'Confirmer'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)} className="space-y-4">
                  <TabsList className="w-full flex-wrap justify-start gap-1 sm:gap-2 h-auto">
                    <TabsTrigger value="conversations" className="gap-1 sm:gap-2 text-xs sm:text-sm"><MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Conversations</span><span className="sm:hidden">Conv.</span></TabsTrigger>
                    <TabsTrigger value="resolution" className="gap-1 sm:gap-2 text-xs sm:text-sm"><FileText className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Resolution</span><span className="sm:hidden">Res.</span></TabsTrigger>
                    <TabsTrigger value="attachments" className="gap-1 sm:gap-2 text-xs sm:text-sm"><Paperclip className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Piece jointe</span><span className="sm:hidden">Fichiers</span></TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1 sm:gap-2 text-xs sm:text-sm"><Activity className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Activite</span><span className="sm:hidden">Act.</span></TabsTrigger>
                    <TabsTrigger value="approval" className="gap-1 sm:gap-2 text-xs sm:text-sm"><Shield className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Approbation</span><span className="sm:hidden">App.</span></TabsTrigger>
                    <TabsTrigger value="history" className="gap-1 sm:gap-2 text-xs sm:text-sm"><History className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Historique</span><span className="sm:hidden">Hist.</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="conversations" className="m-0 space-y-4">
                    {conversationComposerOpen && (
                    <Card ref={conversationComposerRef}>
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base">Ajouter un commentaire</CardTitle>
                        <CardDescription>Choisissez la visibilite du commentaire avant publication.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Zarko
                          value={conversationCommentText}
                          onChange={setConversationCommentText}
                          placeholder="Ecrivez votre commentaire ici..."
                          minHeight="180px"
                          enableTicketReferences
                          className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
                        />

                        <div className="rounded-xl border bg-card/80 p-3 shadow-sm">
                          <div className="flex flex-wrap justify-end gap-2">
                            <div className="inline-flex items-stretch overflow-hidden rounded-md border border-primary/40">
                              <Button
                                type="button"
                                className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => void addConversationComment()}
                                disabled={updatingTicket}
                              >
                                Commentaire {conversationCommentVisibility === 'public' ? 'Public' : 'Privé'}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-auto rounded-none border-l border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuCheckboxItem
                                    checked={conversationCommentVisibility === 'public'}
                                    onCheckedChange={() => setConversationCommentVisibility('public')}
                                  >
                                    Commentaire public
                                  </DropdownMenuCheckboxItem>
                                  <DropdownMenuCheckboxItem
                                    checked={conversationCommentVisibility === 'private'}
                                    onCheckedChange={() => setConversationCommentVisibility('private')}
                                  >
                                    Commentaire privé
                                  </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setConversationComposerOpen(false);
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {conversationEntries.length > 0 ? conversationEntries.map((entry: any) => renderCommentBubble(entry)) : (
                      <Card>
                        <CardContent className="p-6 text-sm text-muted-foreground">Aucune conversation pour ce ticket.</CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base">Description du ticket</CardTitle>
                        <CardDescription>
                          {ticketState.creatorName || 'NOC SILICONE'} • {formatMaybeDate(ticketState.createdAt)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {ticketState.description ? (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-sm [&_img]:inline-block [&_img]:align-top [&_img]:w-full sm:[&_img]:w-[calc(50%-0.5rem)] [&_img]:mr-0 sm:[&_img]:mr-2 [&_img]:mb-2 [&_img:nth-of-type(2n)]:mr-0 [&_img]:rounded-lg [&_img]:cursor-zoom-in"
                            onClick={handleDescriptionImageClick}
                            dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
                          />
                        ) : (
                          <p className="text-muted-foreground">-</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {activeTab === 'resolution' && (
                  <TabsContent value="resolution" className="m-0">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base">Rubrique Resolution</CardTitle>
                        <CardDescription>Decrire la resolution technique du ticket</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(!myResolutionEntry || resolutionComposerOpen) ? (
                          <>
                            <div className="grid gap-2">
                              <Label>Categorie resolution</Label>
                              <Select value={resolutionCategory} onValueChange={setResolutionCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="probleme_energetique">Probleme energetique</SelectItem>
                                  <SelectItem value="system">System</SelectItem>
                                  <SelectItem value="telecom">Telecom</SelectItem>
                                  <SelectItem value="transmission">Transmission</SelectItem>
                                  <SelectItem value="datacom">Datacom</SelectItem>
                                  <SelectItem value="sabotage">Sabotage</SelectItem>
                                  <SelectItem value="affaiblissement">Affaiblissement</SelectItem>
                                  <SelectItem value="erreur_technicien">Erreur technicien</SelectItem>
                                  <SelectItem value="boucle_interne">Boucle interne</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Description resolution</Label>
                              <Zarko
                                value={resolutionText}
                                onChange={setResolutionText}
                                placeholder="Saisir la resolution..."
                                minHeight="220px"
                                enableTicketReferences
                                className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button onClick={() => void saveResolution()} disabled={updatingTicket}>Enregistrer Resolution</Button>
                              {myResolutionEntry ? (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setResolutionComposerOpen(false);
                                    setEditingResolutionCommentId(null);
                                  }}
                                  disabled={updatingTicket}
                                >
                                  Annuler
                                </Button>
                              ) : null}
                            </div>
                          </>
                        ) : null}

                        <div className="space-y-2 pt-2">
                          {resolutionEntries.length > 0 ? resolutionEntries.map((entry: any) => (
                            <Card key={entry.id} className="p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="text-xs text-muted-foreground">
                                  {String(entry.authorName ?? 'Utilisateur')} • {formatMaybeDate(entry.createdAt)}
                                </div>
                                <Badge variant="outline">{String(entry.resolutionCategory ?? 'non defini')}</Badge>
                              </div>
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none [&_img]:inline-block [&_img]:align-top [&_img]:w-full sm:[&_img]:w-[calc(50%-0.5rem)] [&_img]:mr-0 sm:[&_img]:mr-2 [&_img]:mb-2 [&_img:nth-of-type(2n)]:mr-0 [&_img]:rounded-lg"
                                dangerouslySetInnerHTML={{ __html: adaptRichContentToTheme(String(entry.resolutionHtml ?? '')) }}
                              />
                              {String(entry.authorId ?? entry.userId ?? '') === String(user.id) ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingResolutionCommentId(String(entry.id));
                                      setResolutionCategory(String(entry.resolutionCategory ?? 'probleme_energetique'));
                                      setResolutionText(String(entry.resolutionHtml ?? ''));
                                      setResolutionComposerOpen(true);
                                    }}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void deleteResolution(String(entry.id))}
                                    disabled={updatingTicket}
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              ) : null}
                            </Card>
                          )) : (
                            <p className="text-sm text-muted-foreground">Aucun message de resolution enregistre.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  )}

                  {activeTab === 'attachments' && (
                  <TabsContent value="attachments" className="m-0">
                    <div className="space-y-4">
                      <Card
                        className={`transition-all duration-200 ${isAttachmentDragOver ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 scale-[1.01]' : ''}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsAttachmentDragOver(true);
                        }}
                        onDragLeave={() => setIsAttachmentDragOver(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
                          void uploadAttachmentFiles(droppedFiles);
                        }}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <input
                            ref={attachmentInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const selectedFiles = Array.from(event.target.files ?? []);
                              void uploadAttachmentFiles(selectedFiles);
                            }}
                          />
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-medium">Glissez vos documents et images ici</p>
                              <p className="text-xs text-muted-foreground">Tous types autorises. Classement automatique: Images, Documents, Autres.</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => attachmentInputRef.current?.click()}
                              disabled={uploadingAttachments}
                              className="transition-transform duration-150 hover:scale-[1.02]"
                            >
                              <Paperclip className="h-4 w-4 mr-2" />
                              {uploadingAttachments ? 'Ajout en cours...' : 'Ajouter des fichiers'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {sortedAttachments.length === 0 ? (
                        <Card>
                          <CardContent className="p-6 text-center text-sm text-muted-foreground">Aucune piece jointe.</CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          <Card className="border-dashed">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">Explorateur de pieces jointes</CardTitle>
                              <CardDescription>Mode dossiers style Windows, recherche par nom, filtres par type et utilisateur.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={attachmentViewMode === 'folders' ? 'default' : 'outline'}
                                  onClick={() => setAttachmentViewMode('folders')}
                                >
                                  <Folder className="h-4 w-4 mr-1" /> Dossiers
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={attachmentViewMode === 'grid' ? 'default' : 'outline'}
                                  onClick={() => setAttachmentViewMode('grid')}
                                >
                                  <LayoutGrid className="h-4 w-4 mr-1" /> Grille
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={attachmentViewMode === 'list' ? 'default' : 'outline'}
                                  onClick={() => setAttachmentViewMode('list')}
                                >
                                  <List className="h-4 w-4 mr-1" /> Liste
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                                <div className="relative lg:col-span-2">
                                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    className="pl-8"
                                    placeholder="Rechercher par nom de fichier, type, utilisateur..."
                                    value={attachmentSearch}
                                    onChange={(event) => setAttachmentSearch(event.target.value)}
                                  />
                                </div>
                                <Select value={attachmentTypeFilter} onValueChange={(value) => setAttachmentTypeFilter(value as AttachmentKindFilter)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filtrer par type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    <SelectItem value="images">Images</SelectItem>
                                    <SelectItem value="documents">Documents</SelectItem>
                                    <SelectItem value="autres">Autres</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={attachmentUploaderFilter} onValueChange={(value) => setAttachmentUploaderFilter(value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filtrer par utilisateur" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                                    {attachmentUploaderOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {attachmentViewMode === 'folders' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {([
                                    { key: 'all' as const, label: 'Tous' },
                                    { key: 'images' as const, label: 'Images' },
                                    { key: 'documents' as const, label: 'Documents' },
                                    { key: 'autres' as const, label: 'Autres' },
                                  ]).map((folder) => (
                                    <button
                                      key={folder.key}
                                      type="button"
                                      onClick={() => setAttachmentFolderFilter(folder.key)}
                                      className={`rounded-lg border p-3 text-left transition-colors ${attachmentFolderFilter === folder.key ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'hover:bg-muted/30'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Folder className="h-5 w-5 text-amber-500" />
                                        <span className="text-sm font-medium">{folder.label}</span>
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">{attachmentFolderCounters[folder.key]} fichier(s)</p>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>

                          {filteredAttachments.length === 0 ? (
                            <Card>
                              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                Aucun fichier ne correspond aux filtres actuels.
                              </CardContent>
                            </Card>
                          ) : null}

                          {(['images', 'documents', 'autres'] as const).map((groupKey) => {
                            const groupItems = filteredAttachments.filter((entry: any) => classifyAttachmentKind(entry) === groupKey);
                            if (!groupItems.length) return null;

                            return (
                              <Card key={groupKey} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">
                                    {groupKey === 'images' ? 'Images' : groupKey === 'documents' ? 'Documents' : 'Autres fichiers'}
                                  </CardTitle>
                                  <CardDescription>{groupItems.length} fichier(s)</CardDescription>
                                </CardHeader>
                                <CardContent className={attachmentViewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3' : 'space-y-3'}>
                                  {groupItems.map((file: any) => {
                                    const image = isImageAttachment(file.url, file.mimeType);
                                    const attachmentComments = attachmentCommentsById[String(file.id)] ?? [];
                                    const canManageAttachment = canCurrentUserManage(String(file.uploadedBy ?? ''));
                                    const canPreview = canPreviewAttachment(file);

                                    return (
                                      <ContextMenu key={file.id}>
                                      <ContextMenuTrigger>
                                      <div className={`rounded-xl border p-3 transition-colors duration-200 hover:bg-muted/20 ${attachmentViewMode === 'grid' ? 'h-full' : ''}`}>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                          <div className="w-full sm:w-40 shrink-0 rounded-md border bg-slate-100/80 dark:bg-slate-900/60 overflow-hidden">
                                            {image ? (
                                              <img src={file.url} alt={file.name} className="h-24 w-full object-cover" loading="lazy" />
                                            ) : (
                                              <div className="h-24 w-full flex items-center justify-center text-muted-foreground">
                                                <FileText className="h-7 w-7" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-2">
                                            <p className="font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {file.mimeType ?? 'Type inconnu'} • {formatFileSize(Number(file.size ?? 0))}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Ajoute par {String(file.uploadedByName ?? file.uploadedBy ?? 'Utilisateur')} • {formatMaybeDate(file.uploadedAt)}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                              {canPreview ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setAttachmentPreview(file)}
                                                >
                                                  <Eye className="h-4 w-4 mr-1" /> Previsualiser
                                                </Button>
                                              ) : null}
                                              {file.url ? (
                                                <Button asChild size="sm" variant="outline">
                                                  <a href={file.url} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir
                                                  </a>
                                                </Button>
                                              ) : null}
                                              {canManageAttachment ? (
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => void deleteAttachment(file)}
                                                  disabled={updatingTicket}
                                                >
                                                  <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                                                </Button>
                                              ) : null}
                                            </div>

                                            {!canPreview ? (
                                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                                {getAttachmentPreviewRestrictionMessage(file)}
                                              </p>
                                            ) : null}

                                            <div className="space-y-2 pt-1">
                                              <Label className="text-xs">Commentaire du document</Label>
                                              <div className="flex gap-2">
                                                <Input
                                                  value={attachmentCommentDrafts[String(file.id)] ?? ''}
                                                  onChange={(event) => setAttachmentCommentDrafts((prev) => ({ ...prev, [String(file.id)]: event.target.value }))}
                                                  placeholder="Ajouter un commentaire pour ce document..."
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="secondary"
                                                  onClick={() => void addAttachmentComment(String(file.id))}
                                                  disabled={updatingTicket}
                                                >
                                                  <MessageCircle className="h-4 w-4 mr-1" /> Ajouter
                                                </Button>
                                              </div>

                                              {attachmentComments.length > 0 ? (
                                                <div className="space-y-1.5">
                                                  {attachmentComments.map((comment) => (
                                                    <div key={comment.id} className="rounded-md bg-muted/30 px-2.5 py-2 text-xs">
                                                      <p className="font-medium">{comment.authorName} • {formatMaybeDate(comment.createdAt)}</p>
                                                      <p className="text-muted-foreground mt-0.5">{comment.message}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent className="w-56">
                                        <ContextMenuLabel>Actions fichier</ContextMenuLabel>
                                        {canPreview ? (
                                          <ContextMenuItem onClick={() => setAttachmentPreview(file)}>
                                            <Eye className="h-4 w-4" /> Previsualiser
                                          </ContextMenuItem>
                                        ) : null}
                                        {file.url ? (
                                          <ContextMenuItem onClick={() => window.open(String(file.url), '_blank', 'noopener,noreferrer')}>
                                            <ExternalLink className="h-4 w-4" /> Ouvrir
                                          </ContextMenuItem>
                                        ) : null}
                                        <ContextMenuItem onClick={() => triggerAttachmentDownload(file)}>
                                          <Download className="h-4 w-4" /> Telecharger
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => setAttachmentCommentDrafts((prev) => ({ ...prev, [String(file.id)]: prev[String(file.id)] ?? '' }))}>
                                          <MessageCircle className="h-4 w-4" /> Ajouter un commentaire
                                        </ContextMenuItem>
                                        {canManageAttachment ? (
                                          <>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem variant="destructive" onClick={() => void deleteAttachment(file)} disabled={updatingTicket}>
                                              <Trash2 className="h-4 w-4" /> Supprimer
                                            </ContextMenuItem>
                                          </>
                                        ) : null}
                                      </ContextMenuContent>
                                      </ContextMenu>
                                    );
                                  })}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      <Dialog open={Boolean(attachmentPreview)} onOpenChange={(open) => { if (!open) setAttachmentPreview(null); }}>
                        <DialogContent className="w-[calc(100vw-1rem)] max-w-[98vw] sm:max-w-[96vw] xl:max-w-[92vw] 2xl:max-w-[88vw] h-[92vh] p-4 sm:p-6">
                          <DialogHeader>
                            <DialogTitle className="truncate">{String(attachmentPreview?.name ?? 'Previsualisation')}</DialogTitle>
                            <DialogDescription>
                              {String(attachmentPreview?.uploadedByName ?? attachmentPreview?.uploadedBy ?? 'Utilisateur')} • {formatMaybeDate(attachmentPreview?.uploadedAt)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="rounded-md border bg-muted/20 p-2 sm:p-3 h-[calc(92vh-11.5rem)] overflow-auto">
                            {attachmentPreview && canPreviewAttachment(attachmentPreview) ? (
                              isImageAttachment(String(attachmentPreview.url ?? ''), String(attachmentPreview.mimeType ?? '')) ? (
                                <img src={attachmentPreview.url} alt={attachmentPreview.name} className="mx-auto max-h-[calc(92vh-14rem)] w-auto rounded" />
                              ) : (
                                <iframe
                                  title="preview"
                                  src={String(attachmentPreview.url ?? '')}
                                  className="w-full h-[calc(92vh-15.5rem)] rounded bg-background"
                                />
                              )
                            ) : attachmentPreview ? (
                              <p className="text-sm text-muted-foreground">{getAttachmentPreviewRestrictionMessage(attachmentPreview)}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Apercu indisponible pour ce type de fichier.</p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAttachmentPreview(null)}>Fermer</Button>
                            {attachmentPreview?.url ? (
                              <Button asChild>
                                <a href={attachmentPreview.url} target="_blank" rel="noreferrer">Ouvrir dans un nouvel onglet</a>
                              </Button>
                            ) : null}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                  )}

                  {activeTab === 'activity' && (
                  <TabsContent value="activity" className="m-0">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base">Activites / Tickets lies</CardTitle>
                        <CardDescription>Creation et suivi des tickets lies a ce dossier.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(hasExistingActivities || activityOverviewTicketRefs.length > 0) && !activityFlashDismissed ? (
                          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-relaxed dark:border-sky-800 dark:bg-sky-950/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-2">
                                {hasExistingActivities ? (
                                  <p className="font-medium text-sky-900 dark:text-sky-100">Une activite existe pour ce ticket.</p>
                                ) : null}
                                {activityOverviewTicketRefs.length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-sky-900 dark:text-sky-100">Ce ticket fait reference a d'autres tickets, voir les tickets:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {activityOverviewTicketRefs.map((ref) => (
                                        <div key={ref} className="inline-flex items-center gap-1">
                                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToActivityTicket(ref)}>
                                            {ref}
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goToActivityTicket(ref, true)} aria-label={`Ouvrir ${ref} dans un nouvel onglet`}>
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setActivityFlashDismissed(true)}
                                aria-label="Fermer la notification"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-1.5 shadow-sm">
                          <Button
                            type="button"
                            size="sm"
                            variant={activityPanelMode === 'create' ? 'default' : 'ghost'}
                            onClick={() => setActivityPanelMode('create')}
                            className="h-8"
                          >
                            Creer une activite
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={activityPanelMode === 'merge' ? 'default' : 'ghost'}
                            onClick={() => setActivityPanelMode('merge')}
                            className="h-8"
                          >
                            Fusionner ce ticket
                          </Button>
                          <div className="min-w-52.5 px-1">
                            <Select
                              value={activityKind}
                              onValueChange={(value) => setActivityKind(value as ActivityKind)}
                              disabled={activityPanelMode !== 'create'}
                            >
                              <SelectTrigger className="h-8 bg-background">
                                <SelectValue placeholder="Type d'activite" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="call">Appeler</SelectItem>
                                <SelectItem value="task">Nouvelle tache</SelectItem>
                                <SelectItem value="event">Evenement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {activityPanelMode === 'create' ? (
                        <div className="rounded-2xl border bg-card/70 p-3 sm:p-5 space-y-5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="activity-parent-id">ID ticket parent</Label>
                              <Input
                                id="activity-parent-id"
                                value={String(ticket.numero ?? ticket.id ?? '')}
                                readOnly
                                disabled
                                className="h-9"
                              />
                            </div>
                            <div className="flex items-end">
                              <div className="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
                                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Type d'activite</span>
                                <Badge variant="outline">{getActivityKindLabel(activityKind)}</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
                            <div className="rounded-xl border bg-muted/10 p-3.5 space-y-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">Informations {getActivityKindLabel(activityKind)}</p>
                                <Badge variant="outline">{getActivityKindLabel(activityKind)}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Renseignez les informations de contexte de l'activite.</p>
                              <div className="space-y-1.5">
                                <Label htmlFor="activity-objet">Objet de l'activite</Label>
                                <Input
                                  id="activity-objet"
                                  value={activityForm.objet}
                                  onChange={(event) => setActivityForm((prev) => ({ ...prev, objet: event.target.value }))}
                                  placeholder="Ex: Intervention de stabilisation uplink"
                                  className="h-9"
                                />
                              </div>

                              {activityKind === 'call' ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="activity-call-contact">Contact a appeler</Label>
                                    <Input
                                      id="activity-call-contact"
                                      value={activityContextForm.callContactName}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, callContactName: event.target.value }))}
                                      placeholder="Nom du contact"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-call-phone">Telephone</Label>
                                    <Input
                                      id="activity-call-phone"
                                      value={activityContextForm.callContactPhone}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, callContactPhone: event.target.value }))}
                                      placeholder="+242..."
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-call-when">Date d'appel</Label>
                                    <Input
                                      id="activity-call-when"
                                      type="datetime-local"
                                      value={activityContextForm.callWhen}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, callWhen: event.target.value }))}
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {activityKind === 'task' ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-task-requester">Demandeur</Label>
                                    <Input
                                      id="activity-task-requester"
                                      value={activityContextForm.taskRequester}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, taskRequester: event.target.value }))}
                                      placeholder="Service ou personne demandeuse"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-task-deadline">Echeance de la tache</Label>
                                    <Input
                                      id="activity-task-deadline"
                                      type="datetime-local"
                                      value={activityContextForm.taskDeadline}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, taskDeadline: event.target.value }))}
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {activityKind === 'event' ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="activity-event-location">Lieu de l'evenement</Label>
                                    <Input
                                      id="activity-event-location"
                                      value={activityContextForm.eventLocation}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, eventLocation: event.target.value }))}
                                      placeholder="Site / Localite"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-event-start">Debut</Label>
                                    <Input
                                      id="activity-event-start"
                                      type="datetime-local"
                                      value={activityContextForm.eventStartAt}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, eventStartAt: event.target.value }))}
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="activity-event-end">Fin</Label>
                                    <Input
                                      id="activity-event-end"
                                      type="datetime-local"
                                      value={activityContextForm.eventEndAt}
                                      onChange={(event) => setActivityContextForm((prev) => ({ ...prev, eventEndAt: event.target.value }))}
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="rounded-xl border bg-muted/10 p-3.5 space-y-3.5">
                              <p className="text-sm font-semibold">Affectation et liens</p>
                              <p className="text-xs text-muted-foreground">Priorite, categorie et references de tickets associes.</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label>Priorite</Label>
                                  <Select value={activityForm.priority} onValueChange={(value) => setActivityForm((prev) => ({ ...prev, priority: value }))}>
                                    <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {EDIT_PRIORITIES.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Categorie</Label>
                                  <Select value={activityForm.category} onValueChange={(value) => setActivityForm((prev) => ({ ...prev, category: value }))}>
                                    <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {EDIT_CATEGORIES.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="activity-reference">Autres tickets references (optionnel)</Label>
                                <div className="space-y-1.5">
                                  <Input
                                    id="activity-reference"
                                    value={activityForm.referenceTicketInput}
                                    onChange={(event) => {
                                      setActivityForm((prev) => ({ ...prev, referenceTicketInput: event.target.value }));
                                      setActivitySuggestionsOpen(true);
                                    }}
                                    onFocus={() => setActivitySuggestionsOpen(true)}
                                    placeholder="#SC11052026-100000001"
                                    className="h-9"
                                  />
                                  {activitySuggestionsOpen && activityTicketSuggestions.length > 0 ? (
                                    <div className="rounded-md border bg-background p-1.5 shadow-sm space-y-1 max-h-44 overflow-auto">
                                      {activityTicketSuggestions.map((suggestion) => (
                                        <button
                                          key={suggestion.id}
                                          type="button"
                                          className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                                          onClick={() => {
                                            const ticketRef = normalizeTicketReference(String(suggestion.numero || suggestion.id));
                                            setActivitySelectedReferenceIds((prev) => Array.from(new Set([...prev, ticketRef])));
                                            setActivityForm((prev) => ({ ...prev, referenceTicketInput: '' }));
                                            setActivitySuggestionsOpen(false);
                                          }}
                                        >
                                          <p className="font-medium">{suggestion.numero}</p>
                                          <p className="text-muted-foreground truncate">{suggestion.objet || 'Sans objet'} • {suggestion.status || '-'}</p>
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          {activityAllReferenceIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/10 p-2">
                              {activityAllReferenceIds.map((ref) => (
                                <Badge key={ref} variant="secondary" className="gap-1">
                                  <button type="button" className="underline-offset-2 hover:underline" onClick={() => goToActivityTicket(ref)}>{ref}</button>
                                  <button
                                    type="button"
                                    className="inline-flex"
                                    onClick={() => {
                                      setActivitySelectedReferenceIds((prev) => prev.filter((item) => item !== ref));
                                      setActivityForm((prev) => ({
                                        ...prev,
                                        referenceTicketInput: parseTicketReferenceInput(prev.referenceTicketInput)
                                          .filter((item) => normalizeTicketReference(item) !== ref)
                                          .join(', '),
                                      }));
                                    }}
                                    aria-label={`Retirer ${ref}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          <div className="rounded-xl border bg-muted/10 p-3.5 space-y-3">
                            <p className="text-sm font-semibold">Techniciens assignes</p>
                            <p className="text-xs text-muted-foreground">Selection multiple et ajout manuel.</p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" className="w-full h-9 justify-between bg-background">
                                  <span className="truncate text-left">
                                    {activitySelectedTechnicianLabels.length > 0
                                      ? `${activitySelectedTechnicianLabels.length} technicien(s) selectionne(s)`
                                      : 'Selectionner technicien(s)'}
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-90 max-h-75 overflow-auto">
                                {ticketTechnicianOptions.map((tech) => (
                                  <DropdownMenuCheckboxItem
                                    key={tech.id}
                                    checked={activitySelectedTechnicianIds.includes(tech.id)}
                                    onCheckedChange={(checked) => {
                                      setActivitySelectedTechnicianIds((prev) => (
                                        checked
                                          ? Array.from(new Set([...prev, tech.id]))
                                          : prev.filter((id) => id !== tech.id)
                                      ));
                                    }}
                                  >
                                    {tech.name}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 bg-background"
                                onClick={() => setActivityManualTechnicianInputOpen((prev) => !prev)}
                              >
                                Ajouter
                              </Button>
                              {activityManualTechnicianInputOpen ? (
                                <div className="flex flex-1 items-center gap-2 min-w-0">
                                  <Input
                                    value={activityManualTechnicianDraft}
                                    onChange={(event) => setActivityManualTechnicianDraft(event.target.value)}
                                    placeholder="Ajouter manuellement (ex: Tech A)"
                                    className="h-9 bg-background"
                                  />
                                  <Button
                                    type="button"
                                    className="h-9"
                                    onClick={() => {
                                      const normalized = String(activityManualTechnicianDraft ?? '').trim();
                                      if (!normalized) return;
                                      setActivityManualTechnicians((prev) => Array.from(new Set([...prev, normalized])));
                                      setActivityManualTechnicianDraft('');
                                    }}
                                  >
                                    Ajouter
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {activityManualTechnicians.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {activityManualTechnicians.map((name) => (
                                  <Badge key={`manual-tech-${name}`} variant="outline" className="gap-1">
                                    {name}
                                    <button
                                      type="button"
                                      className="inline-flex"
                                      onClick={() => setActivityManualTechnicians((prev) => prev.filter((item) => item !== name))}
                                      aria-label={`Retirer ${name}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-xl border bg-muted/10 p-3.5 space-y-3">
                            <p className="text-sm font-semibold">Localites</p>
                            <p className="text-xs text-muted-foreground">Associez une ou plusieurs localites impactees.</p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" className="w-full h-9 justify-between bg-background">
                                  <span className="truncate text-left">
                                    {activitySelectedLocalities.length > 0
                                      ? `${activitySelectedLocalities.length} localite(s) selectionnee(s)`
                                      : 'Selectionner localite(s)'}
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-90 max-h-75 overflow-auto">
                                {activityLocalityOptions.map((locality) => (
                                  <DropdownMenuCheckboxItem
                                    key={locality.value}
                                    checked={activitySelectedLocalities.includes(locality.value)}
                                    onCheckedChange={(checked) => {
                                      setActivitySelectedLocalities((prev) => (
                                        checked
                                          ? Array.from(new Set([...prev, locality.value]))
                                          : prev.filter((value) => value !== locality.value)
                                      ));
                                    }}
                                  >
                                    {locality.label}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="rounded-xl border bg-muted/10 p-3.5 space-y-1.5">
                            <Label htmlFor="activity-description">Description</Label>
                            <Zarko
                              value={activityForm.description}
                              onChange={(html) => setActivityForm((prev) => ({ ...prev, description: html }))}
                              placeholder="Contextualisez l'activite: contraintes, plan d'action, resultat attendu..."
                              minHeight="220px"
                              enableTicketReferences
                              className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
                            />
                          </div>

                          <Button onClick={() => void addActivity()} disabled={updatingTicket} className="h-9 w-full sm:w-auto">
                            {updatingTicket ? 'Creation en cours...' : `Creer ${getActivityKindLabel(activityKind).toLowerCase()} lie(e)`}
                          </Button>
                        </div>
                        ) : (
                        <div className="rounded-2xl border bg-card/70 p-3 sm:p-5 space-y-5">
                          <div className="space-y-1.5">
                            <Label htmlFor="merge-parent-id">Ticket parent</Label>
                            <Input id="merge-parent-id" value={String(ticket.numero ?? ticket.id ?? '')} disabled readOnly className="h-9" />
                          </div>

                          <div className="rounded-xl border bg-muted/10 p-3.5 space-y-2">
                            <Label htmlFor="merge-ticket-search">Tickets a fusionner</Label>
                            <Input
                              id="merge-ticket-search"
                              value={mergeTicketQuery}
                              onChange={(event) => {
                                setMergeTicketQuery(event.target.value);
                                setMergeSuggestionsOpen(true);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                const refs = parseTicketReferenceInput(mergeTicketQuery);
                                if (refs.length === 0) return;
                                setMergeSelectedTicketRefs((prev) => Array.from(new Set([...prev, ...refs])));
                                setMergeTicketQuery('');
                                setMergeSuggestionsOpen(false);
                              }}
                              onFocus={() => setMergeSuggestionsOpen(true)}
                              placeholder="#SC11052026-100000001"
                              className="h-9 bg-background"
                            />
                            {mergeSuggestionsOpen && mergeTicketSuggestions.length > 0 ? (
                              <div className="rounded-md border bg-background p-1.5 shadow-sm space-y-1 max-h-44 overflow-auto">
                                {mergeTicketSuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                                    onClick={() => {
                                      const ticketRef = normalizeTicketReference(String(suggestion.numero || suggestion.id));
                                      setMergeSelectedTicketRefs((prev) => Array.from(new Set([...prev, ticketRef])));
                                      setMergeTicketQuery('');
                                      setMergeSuggestionsOpen(false);
                                    }}
                                  >
                                    <p className="font-medium">{suggestion.numero}</p>
                                    <p className="text-muted-foreground truncate">{suggestion.objet || 'Sans objet'} • {suggestion.status || '-'}</p>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {mergeSelectedTicketRefs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {mergeSelectedTicketRefs.map((ref) => (
                                <Badge key={`merge-ref-${ref}`} variant="secondary" className="gap-1">
                                  <button type="button" className="hover:underline" onClick={() => goToActivityTicket(ref)}>{ref}</button>
                                  <button
                                    type="button"
                                    className="inline-flex"
                                    onClick={() => setMergeSelectedTicketRefs((prev) => prev.filter((item) => item !== ref))}
                                    aria-label={`Retirer ${ref}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          <div className="inline-flex items-center rounded-lg border p-1 bg-muted/20">
                            <Button
                              type="button"
                              size="sm"
                              variant={mergeBehavior === 'group' ? 'default' : 'ghost'}
                              className="h-8"
                              onClick={() => setMergeBehavior('group')}
                            >
                              Regrouper
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={mergeBehavior === 'merge' ? 'default' : 'ghost'}
                              className="h-8"
                              onClick={() => setMergeBehavior('merge')}
                            >
                              Melanger les contenus
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => void submitMergeTickets()} disabled={mergeBusy || mergeSelectedTicketRefs.length === 0} className="h-9">
                              {mergeBusy ? 'Fusion en cours...' : 'Fusionner les tickets selectionnes'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setMergeSelectedTicketRefs([]);
                                setMergeTicketQuery('');
                                setMergeTicketSuggestions([]);
                                setMergeSuggestionsOpen(false);
                              }}
                              disabled={mergeBusy}
                              className="h-9"
                            >
                              Reinitialiser
                            </Button>
                          </div>

                          {mergedTicketRefs.length > 0 ? (
                            <div className="space-y-2 rounded-lg border p-2.5">
                              <p className="text-xs font-medium text-muted-foreground">Tickets deja fusionnes/regroupes</p>
                              <div className="flex flex-wrap gap-1.5">
                                {mergedTicketRefs.map((ref) => (
                                  <Badge key={`merged-${ref}`} variant="outline" className="gap-1">
                                    <button type="button" className="hover:underline" onClick={() => goToActivityTicket(ref)}>{ref}</button>
                                    <button
                                      type="button"
                                      className="inline-flex"
                                      onClick={() => void dissociateMergedTicket(ref)}
                                      aria-label={`Dissocier ${ref}`}
                                      disabled={mergeBusy}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        )}

                          <div className="space-y-2">
                          {subTasks.length > 0 ? subTasks.map((task: any) => (
                            <div key={task.id} className="rounded-xl border bg-card/60 p-3 text-sm shadow-sm">
                              {editingActivityId === task.id ? (
                                <Textarea rows={2} value={editingActivityText} onChange={(e) => setEditingActivityText(e.target.value)} />
                              ) : (
                                <p className="font-medium leading-relaxed">{task.description || '-'}</p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <p className="text-muted-foreground">{task.status || 'TODO'} • {formatMaybeDate(task.createdAt)}</p>
                                <Badge variant="outline">
                                  {String(task.activityKind ?? 'task') === 'call'
                                    ? 'Appeler'
                                    : String(task.activityKind ?? 'task') === 'event'
                                      ? 'Evenement'
                                      : 'Nouvelle tache'}
                                </Badge>
                              </div>

                              {editingActivityId !== task.id ? (
                                <div className="mt-3 space-y-2">
                                  {(task.linkedTicketNumero || task.linkedTicketId) ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Ticket lie:</span>
                                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToActivityTicket(String(task.linkedTicketId || task.linkedTicketNumero))}>
                                        {String(task.linkedTicketNumero || task.linkedTicketId)}
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goToActivityTicket(String(task.linkedTicketId || task.linkedTicketNumero), true)} aria-label="Ouvrir le ticket lie dans un nouvel onglet">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                      {task.linkedTicketPriority ? <Badge variant="outline">Priorite {String(task.linkedTicketPriority)}</Badge> : null}
                                      {task.linkedTicketStatus ? <Badge variant="secondary">{String(task.linkedTicketStatus)}</Badge> : null}
                                    </div>
                                  ) : null}

                                  {Array.isArray(task.referenceTicketIds) && task.referenceTicketIds.length > 0 ? (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">References tickets:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {task.referenceTicketIds.map((ref: string) => (
                                          <div key={`${task.id}-${ref}`} className="inline-flex items-center gap-1">
                                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => goToActivityTicket(String(ref))}>
                                              {String(ref)}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goToActivityTicket(String(ref), true)} aria-label={`Ouvrir ${String(ref)} dans un nouvel onglet`}>
                                              <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {Array.isArray(task.manualTechnicianNames) && task.manualTechnicianNames.length > 0 ? (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">Techniciens manuels:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {task.manualTechnicianNames.map((name: string) => (
                                          <Badge key={`${task.id}-tech-${name}`} variant="outline">{name}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {Array.isArray(task.selectedLocalities) && task.selectedLocalities.length > 0 ? (
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">Localites:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {task.selectedLocalities.map((locality: string) => (
                                          <Badge key={`${task.id}-loc-${locality}`} variant="outline">{locality}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                {editingActivityId === task.id ? (
                                  <>
                                    <Button size="sm" onClick={() => void saveEditActivity(task.id)} disabled={updatingTicket}>Enregistrer</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingActivityId(null)} disabled={updatingTicket}>Annuler</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => beginEditActivity(task)} disabled={updatingTicket || !canCurrentUserManage(task.authorId)}>Modifier</Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => requestDeleteActivity(task.id)}
                                      disabled={updatingTicket || !canCurrentUserManage(task.authorId) || isDeleteTargetBusy({ kind: 'activity', id: String(task.id) })}
                                    >
                                      {isDeleteTargetBusy({ kind: 'activity', id: String(task.id) }) ? 'Suppression...' : 'Supprimer'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">Aucune activite enregistree.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  )}

                  {activeTab === 'approval' && (
                  <TabsContent value="approval" className="m-0">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base">Approbation</CardTitle>
                        <CardDescription>Workflow d'approbation du ticket</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="rounded-xl border p-3 flex items-center justify-between">
                          <span>Statut actuel</span>
                          <Badge>{heroBadge.label}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => void reopenTicket()}
                          disabled={lifecycleActionLoading || !canRunLifecycleActions}
                        >
                          Reouvrir le ticket
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  )}

                  {activeTab === 'history' && (
                  <TabsContent value="history" className="m-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Filtrer</Label>
                        <Select value={historyFilter} onValueChange={(value) => setHistoryFilter(value as HistoryFilter)}>
                          <SelectTrigger className="w-full sm:w-55"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les evenements</SelectItem>
                            <SelectItem value="time_entry">Entrees de temps</SelectItem>
                            <SelectItem value="subtask">Activites</SelectItem>
                            <SelectItem value="status">Changements statut</SelectItem>
                            <SelectItem value="comment">Commentaires</SelectItem>
                            <SelectItem value="other">Autres</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {filteredHistoryEntries.length > 0 ? filteredHistoryEntries.map((entry: any) => (
                        <Card key={entry.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{entry.action}</Badge>
                                  {entry.field && <Badge variant="secondary">{entry.field}</Badge>}
                                  <Badge variant="outline" className="text-xs">{classifyHistoryEntry(entry)}</Badge>
                                </div>
                                <p className="font-medium">{formatHistoryMessage(entry)}</p>
                                {entry.oldValue && <p className="text-sm text-muted-foreground">Avant: {entry.oldValue}</p>}
                                {entry.newValue && <p className="text-sm text-muted-foreground wrap-break-word">Après: {formatHistoryNewValue(entry)}</p>}
                              </div>
                              <div className="text-xs text-muted-foreground">{formatMaybeDate(entry.createdAt)}</div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <Card>
                          <CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun evenement pour ce filtre.</CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                  )}

                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {expandedDescriptionImageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedDescriptionImageSrc(null)}
          role="dialog"
          aria-label="Apercu de l'image"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-md bg-black/60 p-2 text-white transition hover:bg-black/80"
            onClick={(event) => {
              event.stopPropagation();
              setExpandedDescriptionImageSrc(null);
            }}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <img
            src={expandedDescriptionImageSrc ?? undefined}
            alt="Image agrandie"
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
