'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  UserCog,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { loadFromStorage, saveToStorage } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ServiceType = 'INTERNET' | 'INTERCO' | 'INTERNET_INTERCO' | 'LIAISON';
type EquipmentType = 'SWITCH' | 'ROUTER' | 'PC' | 'FIREWALL' | 'SERVER' | 'OTHER' | 'ONT' | 'ONU' | 'OLT' | 'RADIO';
type LinkType = 'FILAIRE' | 'FAISCEAU_HERTZIEN' | 'MIXTE';
type FaiPriority = 'PRINCIPALE' | 'BACKUP' | 'SECONDAIRE' | 'TERTIAIRE';
type ConnectivityType = 'DIRECT' | 'DEDIE' | 'POINT_TO_POINT' | 'AUTRE';
type ClientViewMode = 'cards' | 'table' | 'compact';
type ReportExportFormat = 'csv' | 'xlsx' | 'docx' | 'pptx' | 'pdf';

type FaiInput = {
  faiName: string;
  address: string;
  allocatedMbps: string;
  bandwidthMbps: string;
  internationalExit: string;
  linkType: LinkType;
  priority: FaiPriority;
  connectivityType: ConnectivityType;
  contactEmail: string;
  contactPhone: string;
};

type PartnerInput = {
  partnerName: string;
  contractDate: string;
  expiryDate: string;
  description: string;
  operationZones: string;
  contactEmail: string;
  contactPhone: string;
  documents: DocumentInput[];
};

type ClientListItem = {
  id_client: number;
  client_ref: string;
  client_name: string;
  client_type: string | null;
  country: string | null;
  locality: string | null;
  logo_url: string | null;
  address: string | null;
  ip_client: string | null;
  service_type: ServiceType;
  bandwidth_mbps: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  archived_at?: string | null;
  satisfaction_score?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  responsable_name?: string | null;
  updated_at: string;
  equipementsCount: number;
  liaisonsCount: number;
  interventionsCount?: number;
  ticketsCount?: number;
  equipmentStatus?: string | null;
};

type EquipmentInput = {
  equipementCode: string;
  equipementType: EquipmentType;
  vendor: string;
  model: string;
  imageUrl: string;
  serialNumber: string;
  ipManagement: string;
  zabbixHostid: string;
  latitude: string;
  longitude: string;
  installDate: string;
  replaceDueDate: string;
  estimatedServiceLifeMonths: string;
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'MAINTENANCE';
};

type PoteauInput = {
  poteauCode: string;
  label: string;
  address: string;
  latitude: string;
  longitude: string;
  status: 'UP' | 'DOWN' | 'MAINTENANCE';
};

type ContactInput = {
  fullName: string;
  roleLabel: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

type LiaisonInput = {
  liaisonLabel: string;
  fromPort: string;
  toPort: string;
  fromSiteName: string;
  fromSiteAddress: string;
  fromSiteIp: string;
  toSiteName: string;
  toSiteAddress: string;
  toSiteIp: string;
  bandwidthMbps: string;
  serviceType: ServiceType;
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'MAINTENANCE';
  notes: string;
};

type InterventionInput = {
  title: string;
  interventionType: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  startAt: string;
  endAt: string;
  technicianName: string;
  ticketRef: string;
  notes: string;
};

type ClientHistoryItem = {
  actionType: string;
  actionLabel: string;
  actorName: string;
  createdAt: string;
};

type DocumentInput = {
  docType: 'ACCEPTANCE' | 'CONTRACT' | 'OTHER';
  fileName: string;
  fileUrl: string;
  mimeType: string;
};

type ClientAssetOverride = {
  logoUrl?: string;
  documents?: DocumentInput[];
  equipmentImages?: Record<string, string>;
};

type ClientModuleSettings = {
  idStyle: {
    prefix: string;
    fixedYear: number;
    padding: number;
    nextSequence: number;
    allowManualRef: boolean;
  };
  permissions: {
    allowCreate: boolean;
    allowUpdate: boolean;
    allowDelete: boolean;
    allowArchive: boolean;
    deleteRoles: string[];
  };
  api: {
    enableRead: boolean;
    enableWrite: boolean;
    enableZabbixSync: boolean;
    enableLibreNmsFields: boolean;
  };
  ui: {
    defaultViewMode: ClientViewMode;
    showLocality: boolean;
    showCountry: boolean;
    showClientType: boolean;
    showSatisfaction: boolean;
  };
};

type NocClientsPanelProps = {
  connectedUserRole?: string | null;
  connectedUserId?: string | null;
  connectedUserName?: string | null;
};

type TableColumnKey = 'ref' | 'logo' | 'name' | 'type' | 'locality' | 'country' | 'status' | 'action';

const TABLE_COLUMN_MIN_WIDTHS: Record<TableColumnKey, number> = {
  ref: 170,
  logo: 78,
  name: 220,
  type: 150,
  locality: 150,
  country: 190,
  status: 120,
  action: 130,
};

const DEFAULT_TABLE_COLUMN_WIDTHS: Record<TableColumnKey, number> = {
  ref: 210,
  logo: 90,
  name: 280,
  type: 170,
  locality: 180,
  country: 220,
  status: 130,
  action: 150,
};

const CLIENT_TABLE_WIDTHS_STORAGE_KEY = 'noc_clients_table_column_widths_v1';

const DEFAULT_CLIENT_SETTINGS: ClientModuleSettings = {
  idStyle: {
    prefix: 'CLI',
    fixedYear: new Date().getFullYear(),
    padding: 5,
    nextSequence: 66,
    allowManualRef: false,
  },
  permissions: {
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,
    allowArchive: true,
    deleteRoles: ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR'],
  },
  api: {
    enableRead: true,
    enableWrite: true,
    enableZabbixSync: true,
    enableLibreNmsFields: true,
  },
  ui: {
    defaultViewMode: 'table',
    showLocality: true,
    showCountry: true,
    showClientType: true,
    showSatisfaction: true,
  },
};

const defaultClient = {
  idClient: undefined as number | undefined,
  clientRef: '',
  clientName: '',
  logoUrl: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  country: '',
  locality: '',
  clientType: 'Standard',
  ipClient: '',
  hostidZabbix: '',
  zabbixElement: '',
  librenmsDeviceId: '',
  libreNmsSysname: '',
  slaTargetPercent: '',
  serviceType: 'INTERNET' as ServiceType,
  bandwidthMbps: '',
  notes: '',
  satisfactionScore: '',
  satisfactionComment: '',
  status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
};

const defaultEquipment: EquipmentInput = {
  equipementCode: '',
  equipementType: 'SWITCH',
  vendor: '',
  model: '',
  imageUrl: '',
  serialNumber: '',
  ipManagement: '',
  zabbixHostid: '',
  latitude: '',
  longitude: '',
  installDate: '',
  replaceDueDate: '',
  estimatedServiceLifeMonths: '',
  status: 'UP',
};

const CLIENT_TYPE_OPTIONS = ['Gold', 'Silver', 'Bronze', 'Cuivre', 'Standard'];
const INTERVENTION_TYPE_OPTIONS = ['INTERVENTION', 'INCIDENT', 'MAINTENANCE', 'INSTALLATION', 'MIGRATION', 'AUDIT'];
const INTERVENTION_STATUS_OPTIONS: InterventionInput['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const defaultPoteau: PoteauInput = {
  poteauCode: '',
  label: '',
  address: '',
  latitude: '',
  longitude: '',
  status: 'UP',
};

const defaultContact: ContactInput = {
  fullName: '',
  roleLabel: '',
  phone: '',
  email: '',
  isPrimary: false,
};

const defaultLiaison: LiaisonInput = {
  liaisonLabel: '',
  fromPort: '',
  toPort: '',
  fromSiteName: '',
  fromSiteAddress: '',
  fromSiteIp: '',
  toSiteName: '',
  toSiteAddress: '',
  toSiteIp: '',
  bandwidthMbps: '',
  serviceType: 'LIAISON',
  status: 'UP',
  notes: '',
};

const defaultIntervention: InterventionInput = {
  title: '',
  interventionType: 'INTERVENTION',
  status: 'OPEN',
  startAt: '',
  endAt: '',
  technicianName: '',
  ticketRef: '',
  notes: '',
};

const defaultFai: FaiInput = {
  faiName: '',
  address: '',
  allocatedMbps: '',
  bandwidthMbps: '',
  internationalExit: '',
  linkType: 'FILAIRE',
  priority: 'PRINCIPALE',
  connectivityType: 'DIRECT',
  contactEmail: '',
  contactPhone: '',
};

const defaultPartner: PartnerInput = {
  partnerName: '',
  contractDate: '',
  expiryDate: '',
  description: '',
  operationZones: '',
  contactEmail: '',
  contactPhone: '',
  documents: [],
};

const DEFAULT_EQUIPMENT_IMAGES: Record<string, string> = {
  MIKROTIK: '/images/equipements/image_equipement_client_microtik.png',
  JUNIPER: '/images/equipements/image_equipement_client_juniper.png',
  CISCO: '/images/equipements/image_equipement_client_cisco.png',
  HUAWEI: '/images/equipements/image_equipement_client_huawei.png',
  NOKIA: '/images/equipements/image_equipement_client_nokia.png',
  DEFAULT: '/images/equipements/image_equipement_client_default.png',
};

function isValidIp(ip: string): boolean {
  if (!ip) return true;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

function toNum(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getCityFromAddress(address?: string | null): string {
  const text = (address ?? '').trim();
  if (!text) return 'Non renseignee';
  const parts = text.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return 'Non renseignee';
  return parts[parts.length - 1];
}

function resolveClientLocality(item: ClientListItem): string {
  const direct = toStringSafe(item.locality).trim();
  if (direct) return direct;

  return getCityFromAddress(item.address);
}

function resolveClientCountry(item: ClientListItem): string {
  const direct = toStringSafe(item.country).trim();
  if (direct) return direct;

  return '-';
}

function parseLiaisonNotes(rawNotes: string) {
  const fallback = {
    notes: rawNotes,
    fromSiteName: '',
    fromSiteAddress: '',
    fromSiteIp: '',
    toSiteName: '',
    toSiteAddress: '',
    toSiteIp: '',
  };

  if (!rawNotes.trim().startsWith('{')) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawNotes) as any;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      notes: toStringSafe(parsed.notes),
      fromSiteName: toStringSafe(parsed.fromSiteName),
      fromSiteAddress: toStringSafe(parsed.fromSiteAddress),
      fromSiteIp: toStringSafe(parsed.fromSiteIp),
      toSiteName: toStringSafe(parsed.toSiteName),
      toSiteAddress: toStringSafe(parsed.toSiteAddress),
      toSiteIp: toStringSafe(parsed.toSiteIp),
    };
  } catch {
    return fallback;
  }
}

function serializeLiaisonNotes(liaison: LiaisonInput): string | undefined {
  const payload = {
    notes: liaison.notes || '',
    fromSiteName: liaison.fromSiteName || '',
    fromSiteAddress: liaison.fromSiteAddress || '',
    fromSiteIp: liaison.fromSiteIp || '',
    toSiteName: liaison.toSiteName || '',
    toSiteAddress: liaison.toSiteAddress || '',
    toSiteIp: liaison.toSiteIp || '',
  };

  if (!Object.values(payload).some((value) => String(value).trim().length > 0)) {
    return undefined;
  }
  return JSON.stringify(payload);
}

export function NocClientsPanel({ connectedUserRole, connectedUserId, connectedUserName }: NocClientsPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [storedUser, setStoredUser] = useState<{ role?: string; id?: string; name?: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('noc_user');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { role?: string; id?: string; name?: string };
      setStoredUser(parsed);
    } catch {
      setStoredUser(null);
    }
  }, []);

  const effectiveRoleRaw = connectedUserRole ?? user?.role ?? storedUser?.role ?? '';
  const userRole = String(effectiveRoleRaw)
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
  const effectiveUserId = connectedUserId ?? user?.id ?? storedUser?.id ?? null;
  const effectiveUserName = connectedUserName ?? user?.name ?? storedUser?.name ?? null;
  const tableColumnWidthsStorageKey = useMemo(
    () => `${CLIENT_TABLE_WIDTHS_STORAGE_KEY}:${effectiveUserId ?? 'anonymous'}`,
    [effectiveUserId]
  );
  const canDelete =
    userRole === 'ADMIN' ||
    userRole === 'SUPERADMIN' ||
    userRole.startsWith('SUPER_ADMIN') ||
    userRole.startsWith('SUPERVIS');
  const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole.startsWith('SUPER_ADMIN');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientListItem['status']>('ALL');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | ServiceType>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ClientViewMode>('table');
  const [sortBy, setSortBy] = useState<'UPDATED_DESC' | 'UPDATED_ASC' | 'NAME_ASC' | 'NAME_DESC'>('UPDATED_DESC');
  const [activeClientId, setActiveClientId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<ClientListItem | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportFormat, setReportFormat] = useState<ReportExportFormat>('pdf');
  const [documentTypeSelection, setDocumentTypeSelection] = useState<'ACCEPTANCE' | 'CONTRACT' | 'OTHER'>('CONTRACT');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [page, setPage] = useState(1);
  const [tableColumnWidths, setTableColumnWidths] = useState<Record<TableColumnKey, number>>(DEFAULT_TABLE_COLUMN_WIDTHS);
  const [tableColumnWidthsHydrated, setTableColumnWidthsHydrated] = useState(false);
  const [moduleSettings, setModuleSettings] = useState<ClientModuleSettings>(DEFAULT_CLIENT_SETTINGS);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [savingModuleSettings, setSavingModuleSettings] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [interventionEditMode, setInterventionEditMode] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  const [client, setClient] = useState({ ...defaultClient });
  const [equipements, setEquipements] = useState<EquipmentInput[]>([]);
  const [poteaux, setPoteaux] = useState<PoteauInput[]>([]);
  const [responsables, setResponsables] = useState<ContactInput[]>([{ ...defaultContact, isPrimary: true }]);
  const [liaisons, setLiaisons] = useState<LiaisonInput[]>([]);
  const [interventions, setInterventions] = useState<InterventionInput[]>([]);
  const [clientHistory, setClientHistory] = useState<ClientHistoryItem[]>([]);
  const [fais, setFais] = useState<FaiInput[]>([]);
  const [partners, setPartners] = useState<PartnerInput[]>([]);
  const [documents, setDocuments] = useState<DocumentInput[]>([]);
  const [clientAssetOverrides, setClientAssetOverrides] = useState<Record<string, ClientAssetOverride>>(() =>
    loadFromStorage('noc_client_asset_overrides', {})
  );

  const applyClientAssetOverrides = useCallback(
    (items: ClientListItem[]) =>
      items.map((item) => ({
        ...item,
        logo_url: clientAssetOverrides[item.client_ref]?.logoUrl ?? item.logo_url,
        locality: toStringSafe(item.locality).trim() || item.locality,
        country: toStringSafe(item.country).trim() || item.country,
      })),
    [clientAssetOverrides]
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = clients.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (serviceFilter !== 'ALL' && item.service_type !== serviceFilter) return false;
      if (cityFilter !== 'ALL' && resolveClientLocality(item) !== cityFilter) return false;
      if (!q) return true;
      const haystack = `${item.client_ref} ${item.client_name} ${item.contact_phone ?? ''} ${item.contact_email ?? ''} ${item.address ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'NAME_ASC') return a.client_name.localeCompare(b.client_name);
      if (sortBy === 'NAME_DESC') return b.client_name.localeCompare(a.client_name);
      if (sortBy === 'UPDATED_ASC') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [cityFilter, clients, search, serviceFilter, sortBy, statusFilter]);

  const cityOptions = useMemo(() => {
    const values = new Set<string>();
    clients.forEach((item) => values.add(resolveClientLocality(item)));
    return ['ALL', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [clients]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const pagedClients = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page, pageSize, totalPages]);

  const getTableCellText = useCallback((item: ClientListItem, column: TableColumnKey): string => {
    if (column === 'ref') return item.client_ref;
    if (column === 'logo') return 'logo';
    if (column === 'name') return `${item.client_name} ${item.ip_client ?? ''}`;
    if (column === 'type') return item.client_type || item.service_type;
    if (column === 'locality') return resolveClientLocality(item);
    if (column === 'country') return resolveClientCountry(item);
    if (column === 'status') return item.status;
    return 'actions';
  }, []);

  const autoFitTableColumn = useCallback((column: TableColumnKey) => {
    const maxChars = pagedClients.reduce((max, item) => Math.max(max, getTableCellText(item, column).length), 10);
    const minWidth = TABLE_COLUMN_MIN_WIDTHS[column];
    const nextWidth = Math.max(minWidth, Math.min(480, 34 + maxChars * 8));
    setTableColumnWidths((prev) => ({ ...prev, [column]: nextWidth }));
  }, [getTableCellText, pagedClients]);

  const startTableColumnResize = useCallback((column: TableColumnKey, event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = tableColumnWidths[column];
    const minWidth = TABLE_COLUMN_MIN_WIDTHS[column];

    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.max(minWidth, startWidth + moveEvent.clientX - startX);
      setTableColumnWidths((prev) => ({ ...prev, [column]: next }));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [tableColumnWidths]);

  const resetForm = () => {
    setClient({ ...defaultClient });
    setPoteaux([]);
    setEquipements([]);
    setResponsables([{ ...defaultContact, isPrimary: true }]);
    setLiaisons([]);
    setInterventions([]);
    setClientHistory([]);
    setDocuments([]);
    setFais([]);
    setPartners([]);
    setEditingClientId(null);
    setInterventionEditMode(false);
  };

  const checkRequiredFields = () => {
    const missingFields: string[] = [];
    if (!client.clientName.trim()) missingFields.push('Nom client');
    if (client.ipClient.trim() && !isValidIp(client.ipClient)) missingFields.push('IP client (format invalide)');
    if (client.hostidZabbix.trim() && !client.ipClient.trim()) missingFields.push('IP client requis si Hostid Zabbix configur\u00e9');
    
    if (missingFields.length > 0) {
      toast.warning(`Champs obligatoires non remplis: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/noc/clients?includeArchived=${includeArchived ? '1' : '0'}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Erreur API');
      setClients(applyClientAssetOverrides(payload.clients ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les clients.');
    } finally {
      setLoading(false);
    }
  }, [applyClientAssetOverrides, includeArchived]);

  const loadModuleSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/noc/client-settings');
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Configuration clients indisponible');
      setModuleSettings((prev) => ({
        ...prev,
        ...(payload.settings ?? {}),
        idStyle: { ...prev.idStyle, ...(payload.settings?.idStyle ?? {}) },
        permissions: { ...prev.permissions, ...(payload.settings?.permissions ?? {}) },
        api: { ...prev.api, ...(payload.settings?.api ?? {}) },
        ui: { ...prev.ui, ...(payload.settings?.ui ?? {}) },
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger la configuration clients.');
    }
  }, []);

  const saveModuleSettings = useCallback(async () => {
    if (!isAdminUser || !effectiveUserId) {
      toast.error('Configuration reservee aux admins.');
      return;
    }
    setSavingModuleSettings(true);
    try {
      const response = await fetch('/api/noc/client-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: effectiveUserId, settings: moduleSettings }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Echec sauvegarde configuration');
      toast.success('Configuration clients enregistree.');
      setModuleSettings((prev) => ({
        ...prev,
        ...(payload.settings ?? {}),
        idStyle: { ...prev.idStyle, ...(payload.settings?.idStyle ?? {}) },
        permissions: { ...prev.permissions, ...(payload.settings?.permissions ?? {}) },
        api: { ...prev.api, ...(payload.settings?.api ?? {}) },
        ui: { ...prev.ui, ...(payload.settings?.ui ?? {}) },
      }));
      await loadClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Echec sauvegarde configuration.');
    } finally {
      setSavingModuleSettings(false);
    }
  }, [effectiveUserId, isAdminUser, loadClients, moduleSettings]);

  useEffect(() => {
    saveToStorage('noc_client_asset_overrides', clientAssetOverrides);
  }, [clientAssetOverrides]);

  useEffect(() => {
    setTableColumnWidthsHydrated(false);

    const stored = loadFromStorage<Partial<Record<TableColumnKey, number>>>(
      tableColumnWidthsStorageKey,
      {}
    );

    const keys = Object.keys(DEFAULT_TABLE_COLUMN_WIDTHS) as TableColumnKey[];
    const nextWidths = keys.reduce<Record<TableColumnKey, number>>((acc, key) => {
      const rawValue = Number(stored[key]);
      const candidate = Number.isFinite(rawValue) ? rawValue : DEFAULT_TABLE_COLUMN_WIDTHS[key];
      acc[key] = Math.max(TABLE_COLUMN_MIN_WIDTHS[key], Math.min(600, Math.round(candidate)));
      return acc;
    }, { ...DEFAULT_TABLE_COLUMN_WIDTHS });

    setTableColumnWidths(nextWidths);
    setTableColumnWidthsHydrated(true);
  }, [tableColumnWidthsStorageKey]);

  useEffect(() => {
    if (!tableColumnWidthsHydrated) return;
    saveToStorage(tableColumnWidthsStorageKey, tableColumnWidths);
  }, [tableColumnWidths, tableColumnWidthsHydrated, tableColumnWidthsStorageKey]);

  const resolveEquipmentImage = (vendor: string, fallback?: string | null): string => {
    const key = vendor.trim().toUpperCase();
    return fallback || DEFAULT_EQUIPMENT_IMAGES[key] || DEFAULT_EQUIPMENT_IMAGES.DEFAULT;
  };

  const archiveClient = async (clientId: number, action: 'archive' | 'unarchive') => {
    if (!moduleSettings.permissions.allowArchive || !moduleSettings.api.enableWrite) {
      toast.error('Archivage desactive par la configuration admin.');
      return;
    }
    try {
      const response = await fetch('/api/noc/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, actorId: user?.id ?? null, action }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Action impossible');
      toast.success(action === 'archive' ? 'Client archive.' : 'Client desarchive.');
      await loadClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible.');
    }
  };

  const downloadClientReport = async (format: ReportExportFormat) => {
    if (!client.clientRef) {
      toast.error('Selectionner un client avant export.');
      return;
    }

    if (reportDateFrom && reportDateTo && new Date(reportDateFrom).getTime() > new Date(reportDateTo).getTime()) {
      toast.error('Periode invalide: la date de debut est apres la date de fin.');
      return;
    }

    try {
      const query = new URLSearchParams({
        clientRef: client.clientRef,
        format,
        actorId: String(effectiveUserId ?? ''),
        actorName: String(effectiveUserName ?? ''),
      });
      if (reportDateFrom) query.set('dateFrom', reportDateFrom);
      if (reportDateTo) query.set('dateTo', reportDateTo);
      const url = `/api/noc/client-report?${query.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Export impossible');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rapport-${client.clientRef}-${Date.now()}.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export impossible.');
    }
  };

  const uploadClientLogo = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/noc/client-logo', { method: 'POST', body: form });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Upload logo impossible');
    }
    setClient((prev) => ({ ...prev, logoUrl: payload.fileUrl }));
  };

  const uploadEquipmentImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/noc/client-equipment-image', { method: 'POST', body: form });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Upload image equipement impossible');
    }
    return String(payload.fileUrl ?? '');
  };

  const loadClientProfile = async (clientRef: string, clientId: number, mode: 'view' | 'edit' = 'view') => {
    try {
      const response = await fetch(`/api/noc/client-profile?clientRef=${encodeURIComponent(clientRef)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Profil introuvable');

      const profile = payload.profile;
      const assetOverride = clientAssetOverrides[clientRef] ?? {};
      setClient({
        idClient: profile.client.id_client,
        clientRef: profile.client.client_ref,
        clientName: profile.client.client_name,
        logoUrl: assetOverride.logoUrl ?? toStringSafe(profile.client.logo_url),
        contactPhone: toStringSafe(profile.client.contact_phone),
        contactEmail: toStringSafe(profile.client.contact_email),
        address: toStringSafe(profile.client.address),
        country: toStringSafe(profile.client.country),
        locality: toStringSafe(profile.client.locality),
        clientType: toStringSafe(profile.client.client_type),
        ipClient: toStringSafe(profile.client.ip_client),
        hostidZabbix: toStringSafe(profile.client.hostid_zabbix),
        zabbixElement: toStringSafe(profile.client.zabbix_element),
        librenmsDeviceId: toStringSafe(profile.client.librenms_device_id),
        libreNmsSysname: toStringSafe(profile.client.librenms_sysname),
        slaTargetPercent: toStringSafe(profile.client.sla_target_percent),
        serviceType: (profile.client.service_type ?? 'INTERNET') as ServiceType,
        bandwidthMbps: toStringSafe(profile.client.bandwidth_mbps),
        notes: toStringSafe(profile.client.notes),
        satisfactionScore: toStringSafe(profile.client.satisfaction_score),
        satisfactionComment: toStringSafe(profile.client.satisfaction_comment),
        status: (profile.client.status ?? 'ACTIVE') as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
      });

      setPoteaux(
        (profile.poteaux ?? []).map((row: any) => ({
          poteauCode: toStringSafe(row.poteau_code),
          label: toStringSafe(row.label),
          address: toStringSafe(row.address),
          latitude: toStringSafe(row.latitude),
          longitude: toStringSafe(row.longitude),
          status: (row.status ?? 'UP') as 'UP' | 'DOWN' | 'MAINTENANCE',
        }))
      );

      setEquipements(
        (profile.equipements ?? []).length
          ? (profile.equipements ?? []).map((row: any) => ({
              equipementCode: toStringSafe(row.equipement_code),
              equipementType: (row.equipement_type ?? 'OTHER') as EquipmentType,
              vendor: toStringSafe(row.vendor),
              model: toStringSafe(row.model),
              imageUrl:
                assetOverride.equipmentImages?.[toStringSafe(row.equipement_code)] ||
                resolveEquipmentImage(toStringSafe(row.vendor), toStringSafe(row.image_url)),
              serialNumber: toStringSafe(row.serial_number),
              ipManagement: toStringSafe(row.ip_management),
              zabbixHostid: toStringSafe(row.zabbix_hostid),
              latitude: toStringSafe(row.latitude),
              longitude: toStringSafe(row.longitude),
              installDate: toStringSafe(row.install_date),
              replaceDueDate: toStringSafe(row.replace_due_date),
              estimatedServiceLifeMonths: toStringSafe(row.estimated_service_life_months),
              status: (row.status ?? 'UP') as 'UP' | 'DOWN' | 'DEGRADED' | 'MAINTENANCE',
            }))
          : []
      );

      setResponsables(
        (profile.contacts ?? []).length
          ? (profile.contacts ?? []).map((row: any) => ({
              fullName: toStringSafe(row.full_name),
              roleLabel: toStringSafe(row.role_label),
              phone: toStringSafe(row.phone),
              email: toStringSafe(row.email),
              isPrimary: Boolean(row.is_primary),
            }))
          : [{ ...defaultContact, isPrimary: true }]
      );

      setLiaisons(
        (profile.liaisons ?? []).map((row: any) => {
          const parsedNotes = parseLiaisonNotes(toStringSafe(row.notes));
          return {
            liaisonLabel: toStringSafe(row.liaison_label),
            fromPort: toStringSafe(row.from_port),
            toPort: toStringSafe(row.to_port),
            fromSiteName: parsedNotes.fromSiteName,
            fromSiteAddress: parsedNotes.fromSiteAddress,
            fromSiteIp: parsedNotes.fromSiteIp,
            toSiteName: parsedNotes.toSiteName,
            toSiteAddress: parsedNotes.toSiteAddress,
            toSiteIp: parsedNotes.toSiteIp,
            bandwidthMbps: toStringSafe(row.bandwidth_mbps),
            serviceType: (row.service_type ?? 'LIAISON') as ServiceType,
            status: (row.status ?? 'UP') as 'UP' | 'DOWN' | 'DEGRADED' | 'MAINTENANCE',
            notes: parsedNotes.notes,
          };
        })
      );

      setInterventions(
        (profile.interventions ?? []).map((row: any) => ({
          title: toStringSafe(row.title),
          interventionType: toStringSafe(row.intervention_type) || 'INTERVENTION',
          status: (row.status ?? 'OPEN') as InterventionInput['status'],
          startAt: toStringSafe(row.start_at),
          endAt: toStringSafe(row.end_at),
          technicianName: toStringSafe(row.technician_name),
          ticketRef: toStringSafe(row.ticket_ref),
          notes: toStringSafe(row.notes),
        }))
      );
      setClientHistory(
        (profile.history ?? []).map((row: any) => ({
          actionType: toStringSafe(row.action_type),
          actionLabel: toStringSafe(row.action_label),
          actorName: toStringSafe(row.actor_name) || 'Systeme',
          createdAt: toStringSafe(row.created_at),
        }))
      );

      setDocuments(
        assetOverride.documents ??
          (profile.documents ?? []).map((row: any) => ({
            docType: (row.doc_type ?? 'OTHER') as 'ACCEPTANCE' | 'CONTRACT' | 'OTHER',
            fileName: toStringSafe(row.file_name),
            fileUrl: toStringSafe(row.file_url),
            mimeType: toStringSafe(row.mime_type),
          }))
      );

      setPartners(
        (profile.partners ?? []).map((row: any) => ({
          partnerName: toStringSafe(row.partner_name),
          contractDate: toStringSafe(row.contract_date),
          expiryDate: toStringSafe(row.expiry_date),
          description: toStringSafe(row.description),
          operationZones: toStringSafe(row.operation_zones),
          contactEmail: toStringSafe(row.contact_email),
          contactPhone: toStringSafe(row.contact_phone),
          documents: (row.documents ?? []).map((d: any) => ({
            docType: (d.doc_type ?? 'OTHER') as 'ACCEPTANCE' | 'CONTRACT' | 'OTHER',
            fileName: toStringSafe(d.file_name),
            fileUrl: toStringSafe(d.file_url),
            mimeType: toStringSafe(d.mime_type),
          })),
        }))
      );

      setFais(
        (profile.fais ?? []).map((row: any) => ({
          faiName: toStringSafe(row.fai_name),
          address: toStringSafe(row.address),
          allocatedMbps: toStringSafe(row.allocated_mbps),
          bandwidthMbps: toStringSafe(row.bandwidth_mbps),
          internationalExit: toStringSafe(row.international_exit),
          linkType: (row.link_type ?? 'FILAIRE') as LinkType,
          priority: (row.priority ?? 'PRINCIPALE') as FaiPriority,
          connectivityType: (row.connectivity_type ?? 'DIRECT') as ConnectivityType,
          contactEmail: toStringSafe(row.contact_email),
          contactPhone: toStringSafe(row.contact_phone),
        }))
      );

      setEditingClientId(clientId);
      setSelectedClientId(clientId);
      setShowDetails(true);
      setInterventionEditMode(false);
      setShowForm(mode === 'edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger le profil.');
    }
  };

  const deleteClient = async (clientId: number) => {
    if (!moduleSettings.permissions.allowDelete || !moduleSettings.api.enableWrite) {
      toast.error('Suppression desactivee par la configuration admin.');
      return;
    }
    if (!canDelete) {
      toast.error('Suppression reservee aux roles Admin/Super Admin/Supervisor.');
      return;
    }

    try {
      const response = await fetch('/api/noc/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, actorId: effectiveUserId, actorRole: effectiveRoleRaw ?? null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Echec suppression');
      toast.success('Client supprime.');
      if (editingClientId === clientId) {
        resetForm();
        setShowForm(false);
        setInterventionEditMode(false);
      }
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
        setShowDetails(false);
      }
      await loadClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible.');
    }
  };

  const validateForm = (): boolean => {
    if (!client.clientName.trim()) {
      toast.error('Le nom client est obligatoire.');
      return false;
    }

    if (!isValidIp(client.ipClient)) {
      toast.error('IP client invalide.');
      return false;
    }

    const clientIp = client.ipClient.trim();
    const clientHostid = client.hostidZabbix.trim();
    if (!clientIp && clientHostid) {
      toast.error('IP client requis quand Hostid Zabbix est renseigne.');
      return false;
    }

    const hasSla = String(client.slaTargetPercent ?? '').trim().length > 0;
    const sla = Number(client.slaTargetPercent);
    if (hasSla && (!Number.isFinite(sla) || sla < 0 || sla > 100)) {
      toast.error('SLA doit etre entre 0 et 100.');
      return false;
    }

    const nonEmptyInterventions = interventions.filter((item) => {
      return [
        item.title,
        item.interventionType,
        item.technicianName,
        item.ticketRef,
        item.notes,
        item.startAt,
        item.endAt,
      ].some((value) => String(value ?? '').trim().length > 0);
    });

    for (const item of nonEmptyInterventions) {
      if (!item.title.trim()) {
        toast.error('Chaque intervention doit avoir un titre.');
        return false;
      }

      if (!item.startAt) {
        toast.error(`L'intervention ${item.title} doit avoir une date de debut.`);
        return false;
      }

      if (item.endAt && new Date(item.endAt).getTime() < new Date(item.startAt).getTime()) {
        toast.error(`L'intervention ${item.title} a une date de fin anterieure au debut.`);
        return false;
      }
    }

    const nonEmptyEquipments = equipements.filter((item) => {
      return [
        item.equipementCode,
        item.vendor,
        item.model,
        item.serialNumber,
        item.ipManagement,
        item.installDate,
        item.replaceDueDate,
      ].some((value) => String(value ?? '').trim().length > 0);
    });

    for (const item of nonEmptyEquipments) {
      if (!item.equipementCode.trim()) {
        toast.error('Si un equipement est renseigne, son code est obligatoire.');
        return false;
      }
      if (!isValidIp(item.ipManagement)) {
        toast.error(`IP management invalide pour ${item.equipementCode}.`);
        return false;
      }
    }

    const eqCodes = nonEmptyEquipments.map((e) => e.equipementCode.trim()).filter(Boolean);
    const eqDuplicates = eqCodes.filter((value, i) => eqCodes.indexOf(value) !== i);
    if (eqDuplicates.length > 0) {
      toast.error(`Codes equipements dupliques: ${eqDuplicates.join(', ')}`);
      return false;
    }

    for (const liaison of liaisons) {
      if (!liaison.liaisonLabel.trim()) continue;
      const fromPort = liaison.fromPort.trim();
      const toPort = liaison.toPort.trim();
      if ((fromPort && !toPort) || (!fromPort && toPort)) {
        toast.error(`Liaison ${liaison.liaisonLabel || '-'}: renseigner les deux ports (source et destination).`);
        return false;
      }

      if (!liaison.fromSiteName.trim() || !liaison.toSiteName.trim()) {
        toast.error(`Liaison ${liaison.liaisonLabel || '-'}: renseigner les deux sites (A et B).`);
        return false;
      }

      if (!isValidIp(liaison.fromSiteIp) || !isValidIp(liaison.toSiteIp)) {
        toast.error(`Liaison ${liaison.liaisonLabel || '-'}: IP de site invalide.`);
        return false;
      }
    }

    return true;
  };

  const uploadDocument = async (file: File, docType: 'ACCEPTANCE' | 'CONTRACT' | 'OTHER') => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', docType.toLowerCase());

    const response = await fetch('/api/noc/client-documents', {
      method: 'POST',
      body: form,
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Echec upload document');
    }

    setDocuments((prev) => [
      ...prev,
      {
        docType,
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        mimeType: payload.mimeType,
      },
    ]);
  };

  const saveClient = async () => {
    if (!moduleSettings.api.enableWrite) {
      toast.error('Enregistrement desactive par la configuration admin.');
      return;
    }
    const isUpdate = Boolean(client.idClient);
    if (!isUpdate && !moduleSettings.permissions.allowCreate) {
      toast.error('Creation client desactivee par la configuration admin.');
      return;
    }
    if (isUpdate && !moduleSettings.permissions.allowUpdate) {
      toast.error('Edition client desactivee par la configuration admin.');
      return;
    }

    if (!validateForm() || !checkRequiredFields()) return;

    setSaving(true);
    try {
      const payload = {
        actorId: effectiveUserId,
        actorName: effectiveUserName,
        client: {
          idClient: client.idClient,
          clientRef: client.clientRef || undefined,
          clientName: client.clientName,
          logoUrl: client.logoUrl || undefined,
          contactPhone: client.contactPhone || undefined,
          contactEmail: client.contactEmail || undefined,
          address: client.address || undefined,
          country: client.country || undefined,
          locality: client.locality || undefined,
          clientType: client.clientType || undefined,
          ipClient: client.ipClient || undefined,
          hostidZabbix: client.hostidZabbix || undefined,
          zabbixElement: client.zabbixElement || undefined,
          librenmsDeviceId: client.librenmsDeviceId ? Number(client.librenmsDeviceId) || undefined : undefined,
          libreNmsSysname: client.libreNmsSysname || undefined,
          slaTargetPercent: String(client.slaTargetPercent ?? '').trim() ? Number(client.slaTargetPercent) : undefined,
          serviceType: client.serviceType,
          bandwidthMbps: toNum(client.bandwidthMbps),
          notes: client.notes || undefined,
          satisfactionScore: toNum(client.satisfactionScore),
          satisfactionComment: client.satisfactionComment || undefined,
          status: client.status,
        },
        poteaux: poteaux.filter((p) => p.poteauCode && p.label).map((p) => ({
          poteauCode: p.poteauCode,
          label: p.label,
          address: p.address || undefined,
          latitude: toNum(p.latitude),
          longitude: toNum(p.longitude),
          status: p.status,
        })),
        equipements: equipements.map((e) => ({
          equipementCode: e.equipementCode,
          equipementType: e.equipementType,
          vendor: e.vendor || undefined,
          model: e.model || undefined,
          imageUrl: e.imageUrl || undefined,
          serialNumber: e.serialNumber || undefined,
          ipManagement: e.ipManagement || undefined,
          zabbixHostid: e.zabbixHostid || undefined,
          latitude: toNum(e.latitude),
          longitude: toNum(e.longitude),
          installDate: e.installDate || undefined,
          replaceDueDate: e.replaceDueDate || undefined,
          estimatedServiceLifeMonths: toNum(e.estimatedServiceLifeMonths),
          status: e.status,
        })),
        responsables: responsables
          .filter((r) => r.fullName.trim())
          .map((r) => ({
            fullName: r.fullName,
            roleLabel: r.roleLabel || undefined,
            phone: r.phone || undefined,
            email: r.email || undefined,
            isPrimary: r.isPrimary,
          })),
        liaisons: (client.serviceType === 'INTERCO' || client.serviceType === 'INTERNET_INTERCO')
          ? liaisons
              .filter((l) => l.liaisonLabel.trim())
              .map((l) => ({
                liaisonLabel: l.liaisonLabel,
                fromPort: l.fromPort || undefined,
                toPort: l.toPort || undefined,
                bandwidthMbps: toNum(l.bandwidthMbps),
                serviceType: l.serviceType,
                status: l.status,
                notes: serializeLiaisonNotes(l),
              }))
          : [],
        interventions: interventions
          .filter((i) => i.title.trim())
          .map((i) => ({
            title: i.title,
            interventionType: i.interventionType || undefined,
            status: i.status,
            startAt: i.startAt || undefined,
            endAt: i.endAt || undefined,
            technicianName: i.technicianName || undefined,
            ticketRef: i.ticketRef || undefined,
            notes: i.notes || undefined,
          })),
        documents,
        partners: partners
          .filter((p) => p.partnerName.trim())
          .map((p) => ({
            partnerName: p.partnerName,
            contractDate: p.contractDate || undefined,
            expiryDate: p.expiryDate || undefined,
            description: p.description || undefined,
            operationZones: p.operationZones || undefined,
            contactEmail: p.contactEmail || undefined,
            contactPhone: p.contactPhone || undefined,
            documents: p.documents,
          })),
        fais: fais
          .filter((f) => f.faiName.trim())
          .map((f) => ({
            faiName: f.faiName,
            address: f.address || undefined,
            allocatedMbps: toNum(f.allocatedMbps),
            bandwidthMbps: toNum(f.bandwidthMbps),
            internationalExit: f.internationalExit || undefined,
            linkType: f.linkType,
            priority: f.priority,
            connectivityType: f.connectivityType,
            contactEmail: f.contactEmail || undefined,
            contactPhone: f.contactPhone || undefined,
          })),
      };

      const response = await fetch('/api/noc/client-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Erreur enregistrement');

      const savedClientRef = data.clientRef || client.clientRef;
      if (savedClientRef) {
        setClientAssetOverrides((prev) => ({
          ...prev,
          [savedClientRef]: {
            logoUrl: client.logoUrl || undefined,
            documents,
            equipmentImages: Object.fromEntries(
              equipements
                .filter((item) => item.equipementCode.trim() && item.imageUrl)
                .map((item) => [item.equipementCode.trim(), item.imageUrl])
            ),
          },
        }));
      }

      toast.success(`Client enregistre (${data.clientRef}).`);
      if (data.zabbixSync?.message) {
        if (data.zabbixSync.status === 'ERROR') {
          toast.error(data.zabbixSync.message);
        } else if (data.zabbixSync.status === 'PENDING') {
          toast.warning(data.zabbixSync.message);
        } else {
          toast.info(data.zabbixSync.message);
        }
      }
      setClient((prev) => ({ ...prev, idClient: data.clientId, clientRef: data.clientRef }));
      setEditingClientId(data.clientId);
      await loadClients();
      setShowForm(false);
      setInterventionEditMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadModuleSettings();
  }, [loadModuleSettings]);

  useEffect(() => {
    if (moduleSettings.ui.defaultViewMode) {
      setViewMode(moduleSettings.ui.defaultViewMode);
    }
  }, [moduleSettings.ui.defaultViewMode]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, serviceFilter, cityFilter, sortBy, pageSize]);

  useEffect(() => {
    if (!deleteCandidate) {
      setDeleteConfirmInput('');
    }
  }, [deleteCandidate]);

  return (
    <div className="space-y-4">
      {!showDetails && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Clients NOC</CardTitle>
            <CardDescription>
              Liste des clients. Clique sur Ajouter pour afficher le formulaire de creation/edition.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isAdminUser && (
              <Button variant="outline" onClick={() => setShowAdminSettings((prev) => !prev)}>
                <UserCog className="w-4 h-4 mr-2" />
                {showAdminSettings ? 'Masquer config clients' : 'Configurer clients'}
              </Button>
            )}
            <Button variant="outline" onClick={() => void loadClients()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              disabled={!moduleSettings.api.enableWrite || !moduleSettings.permissions.allowCreate}
              onClick={() => {
                resetForm();
                setSelectedClientId(null);
                setShowDetails(false);
                setInterventionEditMode(false);
                setShowForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter un client
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isAdminUser && showAdminSettings && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-semibold">Configuration module clients</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Prefixe ID</Label>
                  <Input
                    value={moduleSettings.idStyle.prefix}
                    onChange={(e) => setModuleSettings((prev) => ({
                      ...prev,
                      idStyle: { ...prev.idStyle, prefix: e.target.value.toUpperCase() },
                    }))}
                    placeholder="CLI"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Annee ID</Label>
                  <Input
                    type="number"
                    min="2000"
                    max="2999"
                    value={moduleSettings.idStyle.fixedYear}
                    onChange={(e) => setModuleSettings((prev) => ({
                      ...prev,
                      idStyle: { ...prev.idStyle, fixedYear: Number(e.target.value) || prev.idStyle.fixedYear },
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Padding sequence</Label>
                  <Input
                    type="number"
                    min="3"
                    max="8"
                    value={moduleSettings.idStyle.padding}
                    onChange={(e) => setModuleSettings((prev) => ({
                      ...prev,
                      idStyle: { ...prev.idStyle, padding: Number(e.target.value) || prev.idStyle.padding },
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prochaine sequence</Label>
                  <Input
                    type="number"
                    min="1"
                    value={moduleSettings.idStyle.nextSequence}
                    onChange={(e) => setModuleSettings((prev) => ({
                      ...prev,
                      idStyle: { ...prev.idStyle, nextSequence: Number(e.target.value) || prev.idStyle.nextSequence },
                    }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.permissions.allowCreate} onChange={(e) => setModuleSettings((prev) => ({ ...prev, permissions: { ...prev.permissions, allowCreate: e.target.checked } }))} />Autoriser creation</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.permissions.allowUpdate} onChange={(e) => setModuleSettings((prev) => ({ ...prev, permissions: { ...prev.permissions, allowUpdate: e.target.checked } }))} />Autoriser edition</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.permissions.allowDelete} onChange={(e) => setModuleSettings((prev) => ({ ...prev, permissions: { ...prev.permissions, allowDelete: e.target.checked } }))} />Autoriser suppression</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.permissions.allowArchive} onChange={(e) => setModuleSettings((prev) => ({ ...prev, permissions: { ...prev.permissions, allowArchive: e.target.checked } }))} />Autoriser archivage</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.api.enableRead} onChange={(e) => setModuleSettings((prev) => ({ ...prev, api: { ...prev.api, enableRead: e.target.checked } }))} />API lecture active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.api.enableWrite} onChange={(e) => setModuleSettings((prev) => ({ ...prev, api: { ...prev.api, enableWrite: e.target.checked } }))} />API ecriture active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.api.enableZabbixSync} onChange={(e) => setModuleSettings((prev) => ({ ...prev, api: { ...prev.api, enableZabbixSync: e.target.checked } }))} />Sync Zabbix active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.api.enableLibreNmsFields} onChange={(e) => setModuleSettings((prev) => ({ ...prev, api: { ...prev.api, enableLibreNmsFields: e.target.checked } }))} />Champs LibreNMS actifs</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.ui.showClientType} onChange={(e) => setModuleSettings((prev) => ({ ...prev, ui: { ...prev.ui, showClientType: e.target.checked } }))} />Afficher type</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.ui.showLocality} onChange={(e) => setModuleSettings((prev) => ({ ...prev, ui: { ...prev.ui, showLocality: e.target.checked } }))} />Afficher localite</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.ui.showCountry} onChange={(e) => setModuleSettings((prev) => ({ ...prev, ui: { ...prev.ui, showCountry: e.target.checked } }))} />Afficher pays</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={moduleSettings.ui.showSatisfaction} onChange={(e) => setModuleSettings((prev) => ({ ...prev, ui: { ...prev.ui, showSatisfaction: e.target.checked } }))} />Afficher satisfaction</label>
              </div>
              <div className="grid gap-3 md:grid-cols-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Vue par defaut</Label>
                  <Select
                    value={moduleSettings.ui.defaultViewMode}
                    onValueChange={(value) => setModuleSettings((prev) => ({ ...prev, ui: { ...prev.ui, defaultViewMode: value as ClientViewMode } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Tableau</SelectItem>
                      <SelectItem value="cards">Cartes</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Roles autorises pour suppression (CSV)</Label>
                  <Input
                    value={moduleSettings.permissions.deleteRoles.join(',')}
                    onChange={(e) => setModuleSettings((prev) => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions,
                        deleteRoles: e.target.value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean),
                      },
                    }))}
                    placeholder="ADMIN,SUPER_ADMIN,SUPERVISOR"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveModuleSettings()} disabled={savingModuleSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  {savingModuleSettings ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-8">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche (ref, nom, contact, ville)"
              className="md:col-span-2"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | ClientListItem['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous statuts</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={(value) => setServiceFilter(value as 'ALL' | ServiceType)}>
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous services</SelectItem>
                <SelectItem value="INTERNET">INTERNET</SelectItem>
                <SelectItem value="INTERCO">INTERCO</SelectItem>
                <SelectItem value="INTERNET_INTERCO">INTERNET_INTERCO</SelectItem>
                <SelectItem value="LIAISON">LIAISON</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city === 'ALL' ? 'Toutes villes' : city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'UPDATED_DESC' | 'UPDATED_ASC' | 'NAME_ASC' | 'NAME_DESC')}>
              <SelectTrigger>
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPDATED_DESC">Maj recentes</SelectItem>
                <SelectItem value="UPDATED_ASC">Maj anciennes</SelectItem>
                <SelectItem value="NAME_ASC">Nom A-Z</SelectItem>
                <SelectItem value="NAME_DESC">Nom Z-A</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ClientViewMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Affichage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cards">Cartes</SelectItem>
                <SelectItem value="table">Tableau</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={includeArchived ? 'default' : 'outline'}
              className="justify-self-end"
              onClick={() => setIncludeArchived((prev) => !prev)}
            >
              {includeArchived ? 'Archives visibles' : 'Masquer archives'}
            </Button>
            <Button variant="outline" className="justify-self-end" onClick={() => void loadClients()}>
              <Search className="w-4 h-4 mr-2" /> Rechercher
            </Button>
          </div>

          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
            <span>{filteredClients.length} resultat(s) • page {Math.min(page, totalPages)}/{totalPages}</span>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value) as 25 | 50 | 100)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {pagedClients.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun client trouve.</p>
          )}

          {viewMode === 'cards' && (
            <div className="grid gap-2">
              {pagedClients.map((item) => (
                <ContextMenu key={item.id_client}>
                  <ContextMenuTrigger>
                    <div
                      className={`group rounded-md border px-3 py-2 flex flex-col md:flex-row md:items-center gap-2 cursor-pointer transition-colors ${selectedClientId === item.id_client ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                      onMouseEnter={() => setActiveClientId(item.id_client)}
                      onTouchStart={() => setActiveClientId((prev) => (prev === item.id_client ? null : item.id_client))}
                      onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}
                    >
                      <div className="h-11 w-11 rounded-md overflow-hidden border">
                        <img
                          src={item.logo_url || '/logo_sc_icon.png'}
                          alt={item.client_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const ipColor = item.equipmentStatus === 'DOWN' || item.status !== 'ACTIVE' ? 'text-red-600' : 'text-blue-600';
                          return (
                            <>
                        <p className="font-medium truncate">{item.client_name}</p>
                        <p className={`text-xs ${ipColor}`}>{item.ip_client || '-'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.client_ref}
                          {moduleSettings.ui.showClientType ? ` • ${item.client_type || item.service_type}` : ''}
                          {moduleSettings.ui.showCountry ? ` • ${item.country || '-'}` : ''}
                          {moduleSettings.ui.showLocality ? ` • ${item.locality || getCityFromAddress(item.address)}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Statut: {item.status} • Tickets: {item.ticketsCount ?? 0} • Interventions: {item.interventionsCount ?? 0}
                        </p>
                            </>
                          );
                        })()}
                      </div>

                      <div
                        className="flex gap-1 transition-opacity opacity-100"
                      >
                        <Button title="Ouvrir" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); void loadClientProfile(item.client_ref, item.id_client, 'view'); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          title="Editer"
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            void loadClientProfile(item.client_ref, item.id_client, 'edit');
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          title={item.archived_at ? 'Desarchiver' : 'Archiver'}
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            void archiveClient(item.id_client, item.archived_at ? 'unarchive' : 'archive');
                          }}
                        >
                          {item.archived_at ? <PackageOpen className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </Button>
                        {canDelete && (
                          <Button title="Supprimer" variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteCandidate(item); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuLabel>Actions Client</ContextMenuLabel>
                    <ContextMenuItem onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>
                      <Eye className="w-4 h-4" /> Ouvrir
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'edit')}>
                      <Pencil className="w-4 h-4" /> Editer
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void archiveClient(item.id_client, item.archived_at ? 'unarchive' : 'archive')}>
                      <Archive className="w-4 h-4" /> {item.archived_at ? 'Desarchiver' : 'Archiver'}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>
                      <FileText className="w-4 h-4" /> Generer rapport
                    </ContextMenuItem>
                    {canDelete && (
                      <ContextMenuItem variant="destructive" onClick={() => setDeleteCandidate(item)}>
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}

          {viewMode === 'compact' && (
            <div className="rounded-md border divide-y">
              {pagedClients.map((item) => (
                <div key={item.id_client} className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/40" onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>
                  <div className="min-w-0">
                    {(() => {
                      const ipColor = item.equipmentStatus === 'DOWN' || item.status !== 'ACTIVE' ? 'text-red-600' : 'text-blue-600';
                      return (
                        <>
                    <p className="font-medium text-sm truncate">{item.client_name}</p>
                    <p className={`text-xs ${ipColor} truncate`}>{item.ip_client || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.client_ref} • {item.status}
                      {moduleSettings.ui.showClientType ? ` • ${item.service_type}` : ''}
                      {moduleSettings.ui.showLocality ? ` • ${getCityFromAddress(item.address)}` : ''}
                    </p>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-1">
                    <Button title="Ouvrir" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); void loadClientProfile(item.client_ref, item.id_client, 'view'); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button title="Editer" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); void loadClientProfile(item.client_ref, item.id_client, 'edit'); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button title={item.archived_at ? 'Desarchiver' : 'Archiver'} variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); void archiveClient(item.id_client, item.archived_at ? 'unarchive' : 'archive'); }}>
                      {item.archived_at ? <PackageOpen className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </Button>
                    {canDelete && (
                      <Button title="Supprimer" variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteCandidate(item); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/60 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/45 dark:shadow-[0_12px_40px_rgba(2,8,23,0.45)]">
              <table className="text-sm table-fixed" style={{ minWidth: '1320px' }}>
                <thead className="bg-white/55 backdrop-blur-sm dark:bg-slate-900/70">
                  <tr>
                    <th
                      className="relative text-left px-3 py-2"
                      style={{ width: `${tableColumnWidths.ref}px` }}
                      onDoubleClick={() => autoFitTableColumn('ref')}
                    >
                      Ref
                      <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('ref', e)} />
                    </th>
                    <th
                      className="relative text-left px-3 py-2"
                      style={{ width: `${tableColumnWidths.logo}px` }}
                      onDoubleClick={() => autoFitTableColumn('logo')}
                    >
                      Logo
                      <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('logo', e)} />
                    </th>
                    <th
                      className="relative text-left px-3 py-2"
                      style={{ width: `${tableColumnWidths.name}px` }}
                      onDoubleClick={() => autoFitTableColumn('name')}
                    >
                      Nom
                      <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('name', e)} />
                    </th>
                    {moduleSettings.ui.showClientType && (
                      <th
                        className="relative text-left px-3 py-2"
                        style={{ width: `${tableColumnWidths.type}px` }}
                        onDoubleClick={() => autoFitTableColumn('type')}
                      >
                        Type
                        <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('type', e)} />
                      </th>
                    )}
                    {moduleSettings.ui.showLocality && (
                      <th
                        className="relative text-left px-3 py-2"
                        style={{ width: `${tableColumnWidths.locality}px` }}
                        onDoubleClick={() => autoFitTableColumn('locality')}
                      >
                        Localite
                        <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('locality', e)} />
                      </th>
                    )}
                    {moduleSettings.ui.showCountry && (
                      <th
                        className="relative text-left px-3 py-2"
                        style={{ width: `${tableColumnWidths.country}px` }}
                        onDoubleClick={() => autoFitTableColumn('country')}
                      >
                        Pays
                        <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('country', e)} />
                      </th>
                    )}
                    <th
                      className="relative text-left px-3 py-2"
                      style={{ width: `${tableColumnWidths.status}px` }}
                      onDoubleClick={() => autoFitTableColumn('status')}
                    >
                      Statut
                      <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('status', e)} />
                    </th>
                    <th
                      className="relative text-center px-3 py-2"
                      style={{ width: `${tableColumnWidths.action}px` }}
                      onDoubleClick={() => autoFitTableColumn('action')}
                    >
                      Action
                      <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/15" onMouseDown={(e) => startTableColumnResize('action', e)} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedClients.map((item) => {
                    const ipColor = item.equipmentStatus === 'DOWN' || item.status !== 'ACTIVE' ? 'text-red-600' : 'text-blue-600';
                    return (
                    <tr key={item.id_client} className="group border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.ref}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>{item.client_ref}</td>
                      <td className="px-3 py-2" style={{ width: `${tableColumnWidths.logo}px` }}>
                        <img
                          src={item.logo_url || '/logo_sc_icon.png'}
                          alt={item.client_name}
                          className="h-9 w-9 rounded-md object-cover border cursor-pointer"
                          onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}
                        />
                      </td>
                      <td className="px-3 py-2 cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.name}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-medium">{item.client_name}</p>
                          <p className={`text-xs ${ipColor}`}>{item.ip_client || '-'}</p>
                        </div>
                      </td>
                      {moduleSettings.ui.showClientType && (
                        <td className="px-3 py-2 cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.type}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>{item.client_type || item.service_type}</td>
                      )}
                      {moduleSettings.ui.showLocality && (
                        <td className="px-3 py-2 cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.locality}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>{resolveClientLocality(item)}</td>
                      )}
                      {moduleSettings.ui.showCountry && (
                        <td className="px-3 py-2 cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.country}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>{resolveClientCountry(item)}</td>
                      )}
                      <td className="px-3 py-2 cursor-pointer hover:underline" style={{ width: `${tableColumnWidths.status}px` }} onClick={() => void loadClientProfile(item.client_ref, item.id_client, 'view')}>{item.status}</td>
                      <td className="px-3 py-2" style={{ width: `${tableColumnWidths.action}px` }}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="Ouvrir"
                            className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                            onClick={(e) => { e.stopPropagation(); void loadClientProfile(item.client_ref, item.id_client, 'view'); }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Editer"
                            className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                            onClick={(e) => { e.stopPropagation(); void loadClientProfile(item.client_ref, item.id_client, 'edit'); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {item.archived_at ? (
                            <button
                              title="Desarchiver"
                              className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => { e.stopPropagation(); void archiveClient(item.id_client, 'unarchive'); }}
                            >
                              <PackageOpen className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              title="Archiver"
                              className="cursor-pointer text-muted-foreground hover:text-amber-600 transition-colors"
                              onClick={(e) => { e.stopPropagation(); void archiveClient(item.id_client, 'archive'); }}
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              title="Supprimer"
                              className="cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                              onClick={(e) => { e.stopPropagation(); setDeleteCandidate(item); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {showDetails && selectedClientId && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <Card>
          <CardHeader className="flex flex-col gap-3 border-b">
            <div className="flex flex-row items-start justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <CardTitle>Details client</CardTitle>
                <CardDescription>{client.clientName} ({client.clientRef})</CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-1">
                <Button variant="outline" size="sm" onClick={() => setShowDetails(false)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Retour liste
                </Button>
                <Button
                  title="Modifier"
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setInterventionEditMode(false);
                    setShowForm(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-1" /> Modifier client
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50/70 p-3 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="text-xs text-muted-foreground px-3 py-1.5 rounded border bg-white">
                  Tickets: <span className="font-semibold">{0}</span>
                </div>
                <div className="text-xs text-muted-foreground px-3 py-1.5 rounded border bg-white">
                  Interventions: <span className="font-semibold">{interventions.length}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setInterventionEditMode(true);
                    setShowForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Ajouter intervention
                </Button>
                <div className="flex-1"></div>
                <Button
                  title={clients.find(c => c.id_client === selectedClientId)?.archived_at ? 'Desarchiver' : 'Archiver'}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const item = clients.find(c => c.id_client === selectedClientId);
                    if (item) void archiveClient(item.id_client, item.archived_at ? 'unarchive' : 'archive');
                  }}
                >
                  {clients.find(c => c.id_client === selectedClientId)?.archived_at ? <PackageOpen className="w-4 h-4 mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                  {clients.find(c => c.id_client === selectedClientId)?.archived_at ? 'Desarchiver' : 'Archiver'}
                </Button>
                {canDelete && (
                  <Button
                    title="Supprimer"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const item = clients.find(c => c.id_client === selectedClientId);
                      if (item) {
                        setDeleteCandidate(item);
                      } else {
                        toast.error('Client non trouve dans la liste courante. Rechargez la liste.');
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/10 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Du</Label>
                  <Input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} className="h-8 w-37.5" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Au</Label>
                  <Input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} className="h-8 w-37.5" />
                </div>
                <div className="space-y-1 min-w-37.5">
                  <Label className="text-xs">Format du rapport</Label>
                  <Select value={reportFormat} onValueChange={(value) => setReportFormat(value as ReportExportFormat)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Choisir format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="pptx">PPTX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => void downloadClientReport(reportFormat)}>
                  <Download className="w-4 h-4 mr-2" /> Exporter
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDetails(false)}>Fermer</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm max-h-[76vh] overflow-y-auto">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="Nom" value={client.clientName} />
              <DetailItem label="Reference" value={client.clientRef} />
              {moduleSettings.ui.showClientType && <DetailItem label="Type" value={client.clientType || client.serviceType} />}
              {moduleSettings.ui.showCountry && <DetailItem label="Pays" value={client.country || '-'} />}
              {moduleSettings.ui.showLocality && <DetailItem label="Localite" value={client.locality || getCityFromAddress(client.address)} />}
              <DetailItem label="Service" value={client.serviceType} />
              <DetailItem label="Statut" value={client.status} />
              {moduleSettings.ui.showSatisfaction && <DetailItem label="Satisfaction" value={client.satisfactionScore ? `${client.satisfactionScore}/5` : '-'} />}
              <DetailItem label="Bande passante" value={client.bandwidthMbps ? `${client.bandwidthMbps} Mbps` : '-'} />
              <DetailItem label="Telephone" value={client.contactPhone || '-'} />
              <DetailItem label="Email" value={client.contactEmail || '-'} />
              <DetailItem label="IP client" value={client.ipClient || '-'} />
              <DetailItem label="Hostid Zabbix" value={client.hostidZabbix || '-'} />
              <DetailItem label="Element Zabbix" value={client.zabbixElement || '-'} />
              <DetailItem label="Device ID LibreNMS" value={client.librenmsDeviceId || '-'} />
              <DetailItem label="Sysname LibreNMS" value={client.libreNmsSysname || '-'} />
              <DetailItem label="SLA" value={client.slaTargetPercent ? `${client.slaTargetPercent}%` : 'Non renseigné'} />
              <DetailItem label="Adresse" value={client.address || '-'} />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailBlock title="Responsables" lines={responsables.map((x) => `${x.fullName || '-'} • ${x.roleLabel || '-'} • ${x.phone || '-'} • ${x.email || '-'}`)} />
              <DetailBlock
                title="Liaisons"
                lines={liaisons.map((x) => `${x.liaisonLabel || '-'} • ${x.fromSiteName || '-'} (${x.fromSiteIp || '-'}) -> ${x.toSiteName || '-'} (${x.toSiteIp || '-'}) • ${x.serviceType} • ${x.bandwidthMbps || '-'} Mbps • ${x.status}`)}
              />
              <DetailBlock title="Equipements" lines={equipements.map((x) => `${x.equipementCode || '-'} • ${x.equipementType} • ${x.vendor || '-'} • ${x.status}`)} />
              <DetailBlock title="Interventions" lines={interventions.map((x) => `${x.title || '-'} • ${x.status} • ${x.technicianName || '-'} • Ticket: ${x.ticketRef || '-'}`)} />
              <DetailBlock title="FAI" lines={fais.map((f) => `${f.faiName || '-'} • ${f.priority} • ${f.connectivityType} • ${f.bandwidthMbps || '-'} Mbps • ${f.contactPhone || '-'}`)} />
              <DetailBlock title="Poteaux" lines={poteaux.map((p) => `${p.poteauCode || '-'} • ${p.label || '-'} • ${p.address || '-'} • ${p.status}`)} />
              <DetailBlock title="Historique modifications" lines={clientHistory.map((x) => `${x.actionLabel} • ${x.actorName} • ${x.createdAt ? new Date(x.createdAt).toLocaleString() : '-'}`)} />
              <DetailBlock title="Partenaires" lines={partners.map((p) => `${p.partnerName} • Contrat: ${p.contractDate || '-'} → ${p.expiryDate || '-'} • Zones: ${p.operationZones || '-'}`)} />
            </div>

            <DetailBlock title="Documents" lines={documents.map((d) => `${d.docType} • ${d.fileName} • ${d.fileUrl}`)} />
            <DetailItem label="Notes" value={client.notes || '-'} />
            <DetailItem label="Commentaire satisfaction" value={client.satisfactionComment || '-'} />
          </CardContent>
        </Card>
        </motion.div>
      )}

      {deleteCandidate && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Confirmer la suppression</CardTitle>
            <CardDescription>
              Cette action est irreversible. Client cible: {deleteCandidate.client_name} ({deleteCandidate.client_ref}).
            </CardDescription>
            <CardDescription>
              Saisir la reference client pour confirmer: <strong>{deleteCandidate.client_ref}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Tapez la reference exacte pour confirmer"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setDeleteCandidate(null); setDeleteConfirmInput(''); }}>Annuler</Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmInput.trim() !== deleteCandidate.client_ref}
                onClick={() => {
                  const id = deleteCandidate.id_client;
                  setDeleteCandidate(null);
                  setDeleteConfirmInput('');
                  void deleteClient(id);
                }}
              >
                Oui, supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 p-3 md:p-6 flex items-center justify-center overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setInterventionEditMode(false);
            }
          }}
        >
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            className="w-full max-w-6xl cursor-grab active:cursor-grabbing my-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="max-h-[92vh] overflow-y-auto shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 sticky top-0 bg-white z-40 border-b">
                <div>
                  <CardTitle>{editingClientId ? 'Edition client' : 'Creation client'}</CardTitle>
                  <CardDescription>Renseignez uniquement les informations utiles pour creer ou mettre a jour le client.</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => { 
                    setShowForm(false); 
                    setInterventionEditMode(false); 
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Fermer
                </Button>
              </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2">
                <Label>Logo client</Label>
                <div className="flex items-center gap-2">
                  <img src={client.logoUrl || '/logo_sc_icon.png'} alt="logo client" className="h-10 w-10 rounded object-cover border" />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted/50 text-sm">
                    <Upload className="w-4 h-4" />
                    Changer
                    <input
                      className="hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadClientLogo(file);
                          toast.success('Logo client televerse.');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Upload logo impossible');
                        } finally {
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2 xl:col-span-3">
                <Label>Nom client <span className="text-red-500 font-bold">*</span></Label>
                <Input 
                  value={client.clientName} 
                  onChange={(e) => {
                    setClient((p) => ({ ...p, clientName: e.target.value }));
                    if (!e.target.value.trim()) {
                      toast.warning('Nom client est obligatoire');
                    }
                  }} 
                  placeholder="Nom du client"
                  className={!client.clientName.trim() ? 'border-red-300 bg-red-50/30' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Type client</Label>
                <Select value={client.clientType || 'Standard'} onValueChange={(value) => setClient((p) => ({ ...p, clientType: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPE_OPTIONS.map((typeOption) => (
                      <SelectItem key={typeOption} value={typeOption}>{typeOption}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={client.serviceType} onValueChange={(value) => setClient((p) => ({ ...p, serviceType: value as ServiceType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNET">Internet</SelectItem>
                    <SelectItem value="INTERCO">Interco</SelectItem>
                    <SelectItem value="INTERNET_INTERCO">Internet + Interco</SelectItem>
                    <SelectItem value="LIAISON">Liaison</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bande passante (Mbps)</Label>
                <Input value={client.bandwidthMbps} onChange={(e) => setClient((p) => ({ ...p, bandwidthMbps: e.target.value }))} type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Statut client</Label>
                <Select value={client.status} onValueChange={(value) => setClient((p) => ({ ...p, status: value as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input value={client.contactPhone} onChange={(e) => setClient((p) => ({ ...p, contactPhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={client.contactEmail} onChange={(e) => setClient((p) => ({ ...p, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>IP client <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input 
                  value={client.ipClient} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setClient((p) => ({ ...p, ipClient: val }));
                    if (val.trim() && !isValidIp(val)) {
                      toast.warning('Format IP invalide (ex: 192.168.1.1)');
                    }
                  }} 
                  placeholder="Ex: 192.168.1.100"
                  className={client.ipClient && !isValidIp(client.ipClient) ? 'border-red-300 bg-red-50/30' : ''}
                />
              </div>
              {moduleSettings.ui.showSatisfaction && (
                <div className="space-y-2">
                  <Label>SLA cible (%) <span className="text-muted-foreground">(optionnel)</span></Label>
                  <Input value={client.slaTargetPercent} type="number" min="0" max="100" step="0.01" placeholder="Optionnel" onChange={(e) => setClient((p) => ({ ...p, slaTargetPercent: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {moduleSettings.ui.showCountry && (
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Input value={client.country} onChange={(e) => setClient((p) => ({ ...p, country: e.target.value }))} />
                </div>
              )}
              {moduleSettings.ui.showLocality && (
                <div className="space-y-2">
                  <Label>Localite</Label>
                  <Input value={client.locality} onChange={(e) => setClient((p) => ({ ...p, locality: e.target.value }))} />
                </div>
              )}
              {moduleSettings.ui.showSatisfaction && (
                <div className="space-y-2">
                  <Label>Satisfaction (/5)</Label>
                  <Input value={client.satisfactionScore} type="number" min="0" max="5" step="0.1" onChange={(e) => setClient((p) => ({ ...p, satisfactionScore: e.target.value }))} />
                </div>
              )}
              {moduleSettings.ui.showSatisfaction && (
                <div className="space-y-2">
                  <Label>Commentaire satisfaction</Label>
                  <Input value={client.satisfactionComment} onChange={(e) => setClient((p) => ({ ...p, satisfactionComment: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hostid Zabbix <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input 
                  value={client.hostidZabbix} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setClient((p) => ({ ...p, hostidZabbix: val }));
                  }}
                  placeholder="ID host Zabbix (ex: 10583)" 
                  disabled={!moduleSettings.api.enableZabbixSync}
                />
                <p className="text-xs text-muted-foreground">
                  Optionnel: utile seulement si vous souhaitez un lien direct avec Zabbix.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Element Zabbix (unique) <span className="text-amber-600 text-xs">(conseillé)</span></Label>
                <Input 
                  value={client.zabbixElement} 
                  onChange={(e) => {
                    setClient((p) => ({ ...p, zabbixElement: e.target.value }));
                  }}
                  placeholder="Ex: SC-CLI-BRAZZAVILLE-CORE-01" 
                  disabled={!moduleSettings.api.enableZabbixSync}
                />
                <p className="text-xs text-muted-foreground">
                  Identifiant metier optionnel pour fiabiliser la liaison dans Zabbix.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Device ID LibreNMS <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input
                  value={client.librenmsDeviceId}
                  onChange={(e) => setClient((p) => ({ ...p, librenmsDeviceId: e.target.value }))}
                  placeholder="Ex: 42 (ID numerique du device dans LibreNMS)"
                  type="number"
                  min="0"
                  disabled={!moduleSettings.api.enableLibreNmsFields}
                />
                <p className="text-xs text-muted-foreground">
                  ID numerique visible dans l&apos;URL LibreNMS : /device/device=<strong>42</strong>/tab=overview
                </p>
              </div>
              <div className="space-y-2">
                <Label>Sysname LibreNMS <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input
                  value={client.libreNmsSysname}
                  onChange={(e) => setClient((p) => ({ ...p, libreNmsSysname: e.target.value }))}
                  placeholder="Ex: bzv_sc_rtr_pam-entrepot"
                  disabled={!moduleSettings.api.enableLibreNmsFields}
                />
                <p className="text-xs text-muted-foreground">
                  System Name SNMP du device (champ &quot;System Name&quot; dans la fiche LibreNMS).
                  Priorite de correlation : Device ID &gt; Sysname &gt; IP &gt; Hostname.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={client.address} onChange={(e) => setClient((p) => ({ ...p, address: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={client.notes} onChange={(e) => setClient((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <SectionArray
              title="Responsables client"
              addLabel="Ajouter responsable"
              onAdd={() => setResponsables((prev) => [...prev, { ...defaultContact }])}
            >
              {responsables.map((contact, index) => (
                <div key={`contact-${index}`} className="grid gap-2 md:grid-cols-5">
                  <Input placeholder="Nom complet" value={contact.fullName} onChange={(e) => setResponsables((prev) => prev.map((row, i) => (i === index ? { ...row, fullName: e.target.value } : row)))} />
                  <Input placeholder="Role" value={contact.roleLabel} onChange={(e) => setResponsables((prev) => prev.map((row, i) => (i === index ? { ...row, roleLabel: e.target.value } : row)))} />
                  <Input placeholder="Telephone" value={contact.phone} onChange={(e) => setResponsables((prev) => prev.map((row, i) => (i === index ? { ...row, phone: e.target.value } : row)))} />
                  <Input placeholder="Email" value={contact.email} onChange={(e) => setResponsables((prev) => prev.map((row, i) => (i === index ? { ...row, email: e.target.value } : row)))} />
                  <Button variant={contact.isPrimary ? 'default' : 'outline'} onClick={() => setResponsables((prev) => prev.map((row, i) => ({ ...row, isPrimary: i === index })))}>
                    Principal
                  </Button>
                </div>
              ))}
            </SectionArray>

            {(client.serviceType === 'INTERCO' || client.serviceType === 'INTERNET_INTERCO') && (
            <SectionArray title="Liaisons client" addLabel="Ajouter liaison" onAdd={() => setLiaisons((prev) => [...prev, { ...defaultLiaison }])}>
              {liaisons.map((row, index) => (
                <div key={`liaison-${index}`} className="space-y-2 rounded border p-3 bg-muted/10">
                  <div className="grid gap-2 md:grid-cols-6">
                    <Input placeholder="Nom liaison" value={row.liaisonLabel} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, liaisonLabel: e.target.value } : x)))} />
                    <Input placeholder="Port source" value={row.fromPort} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, fromPort: e.target.value } : x)))} />
                    <Input placeholder="Port destination" value={row.toPort} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, toPort: e.target.value } : x)))} />
                    <Input placeholder="BP Mbps" value={row.bandwidthMbps} type="number" onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, bandwidthMbps: e.target.value } : x)))} />
                    <Select value={row.serviceType} onValueChange={(value) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, serviceType: value as ServiceType } : x)))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNET">Internet</SelectItem>
                        <SelectItem value="INTERCO">Interco</SelectItem>
                        <SelectItem value="INTERNET_INTERCO">Internet + Interco</SelectItem>
                        <SelectItem value="LIAISON">Liaison</SelectItem>
                      </SelectContent>
                    </Select>
                    <StatusSelect value={row.status} onChange={(value) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, status: value as LiaisonInput['status'] } : x)))} />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-2 rounded border p-2">
                      <p className="text-xs font-medium text-muted-foreground">Site A</p>
                      <Input placeholder="Nom site A" value={row.fromSiteName} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, fromSiteName: e.target.value } : x)))} />
                      <Input placeholder="Adresse site A" value={row.fromSiteAddress} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, fromSiteAddress: e.target.value } : x)))} />
                      <Input placeholder="IP site A" value={row.fromSiteIp} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, fromSiteIp: e.target.value } : x)))} />
                    </div>

                    <div className="space-y-2 rounded border p-2">
                      <p className="text-xs font-medium text-muted-foreground">Site B</p>
                      <Input placeholder="Nom site B" value={row.toSiteName} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, toSiteName: e.target.value } : x)))} />
                      <Input placeholder="Adresse site B" value={row.toSiteAddress} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, toSiteAddress: e.target.value } : x)))} />
                      <Input placeholder="IP site B" value={row.toSiteIp} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, toSiteIp: e.target.value } : x)))} />
                    </div>
                  </div>

                  <Input placeholder="Notes" value={row.notes} onChange={(e) => setLiaisons((prev) => prev.map((x, i) => (i === index ? { ...x, notes: e.target.value } : x)))} />
                </div>
              ))}
            </SectionArray>
            )}

            {interventionEditMode && (
              <SectionArray title="Interventions client" addLabel="Ajouter intervention" onAdd={() => setInterventions((prev) => [...prev, { ...defaultIntervention }])}>
                {interventions.map((row, index) => (
                  <Card key={`intervention-${index}`} className="border-slate-200/80 bg-slate-50/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <CardTitle className="text-base">Intervention {index + 1}</CardTitle>
                          <CardDescription>Journalise une action client exploitable dans l'historique et les rapports.</CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => setInterventions((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Retirer
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2 xl:col-span-2">
                          <Label>Titre</Label>
                          <Input
                            placeholder="Ex: Remplacement ONT site principal"
                            value={row.title}
                            onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type d'intervention</Label>
                          <Select value={row.interventionType} onValueChange={(value) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, interventionType: value } : x)))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {INTERVENTION_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Statut</Label>
                          <Select value={row.status} onValueChange={(value) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, status: value as InterventionInput['status'] } : x)))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {INTERVENTION_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                          <Label>Debut</Label>
                          <Input type="datetime-local" value={row.startAt} onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, startAt: e.target.value } : x)))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fin</Label>
                          <Input type="datetime-local" value={row.endAt} onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, endAt: e.target.value } : x)))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Technicien</Label>
                          <Input placeholder="Nom du technicien" value={row.technicianName} onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, technicianName: e.target.value } : x)))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Ticket lie</Label>
                          <Input placeholder="Ex: TCK-2026-0142" value={row.ticketRef} onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, ticketRef: e.target.value } : x)))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Compte rendu</Label>
                        <Textarea
                          rows={4}
                          placeholder="Decrire le contexte, l'action realisee, l'impact client et le resultat obtenu."
                          value={row.notes}
                          onChange={(e) => setInterventions((prev) => prev.map((x, i) => (i === index ? { ...x, notes: e.target.value } : x)))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </SectionArray>
            )}

            <SectionArray title="Equipements" addLabel="Ajouter equipement" onAdd={() => setEquipements((prev) => [...prev, { ...defaultEquipment }])}>
              {equipements.map((row, index) => (
                <div key={`eq-${index}`} className="grid gap-2 md:grid-cols-6">
                  <Input placeholder="Code equipement" value={row.equipementCode} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, equipementCode: e.target.value } : x)))} />
                  <Select value={row.equipementType} onValueChange={(value) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, equipementType: value as EquipmentType } : x)))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SWITCH">Switch</SelectItem>
                      <SelectItem value="ROUTER">Routeur</SelectItem>
                      <SelectItem value="OLT">OLT</SelectItem>
                      <SelectItem value="ONU">ONU</SelectItem>
                      <SelectItem value="ONT">ONT</SelectItem>
                      <SelectItem value="RADIO">Radio</SelectItem>
                      <SelectItem value="FIREWALL">Firewall</SelectItem>
                      <SelectItem value="SERVER">Serveur</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Marque/Fabricant"
                    value={row.vendor}
                    onChange={(e) =>
                      setEquipements((prev) =>
                        prev.map((x, i) =>
                          i === index
                            ? { ...x, vendor: e.target.value, imageUrl: resolveEquipmentImage(e.target.value, x.imageUrl) }
                            : x
                        )
                      )
                    }
                  />
                  <Input placeholder="Modele" value={row.model} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, model: e.target.value } : x)))} />
                  <Input placeholder="N° Serie" value={row.serialNumber} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, serialNumber: e.target.value } : x)))} />
                  <Input placeholder="IP management" value={row.ipManagement} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, ipManagement: e.target.value } : x)))} />

                  <div className="col-span-full flex items-center gap-3 rounded border p-2 bg-muted/20">
                    <img src={row.imageUrl || resolveEquipmentImage(row.vendor)} alt={row.equipementCode || 'equipement'} className="h-14 w-14 rounded object-cover border" />
                    <div className="text-xs text-muted-foreground flex-1">Image equipement (par defaut selon fabricant). Vous pouvez la remplacer ici.</div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted/50 text-sm">
                      <Upload className="w-4 h-4" />
                      Changer image
                      <input
                        className="hidden"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadEquipmentImage(file);
                            setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, imageUrl: fileUrl } : x)));
                            toast.success('Image equipement televersee.');
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : 'Upload image equipement impossible');
                          } finally {
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>

                  <Input placeholder="Mise en service" type="date" value={row.installDate} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, installDate: e.target.value } : x)))} />
                  <Input placeholder="Date remplacement" type="date" value={row.replaceDueDate} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, replaceDueDate: e.target.value } : x)))} />
                  <Input placeholder="Duree de service (mois)" type="number" min="0" value={row.estimatedServiceLifeMonths} onChange={(e) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, estimatedServiceLifeMonths: e.target.value } : x)))} />
                  <StatusSelect value={row.status} onChange={(value) => setEquipements((prev) => prev.map((x, i) => (i === index ? { ...x, status: value as EquipmentInput['status'] } : x)))} />
                </div>
              ))}
            </SectionArray>

            <SectionArray title="Partenaires" addLabel="Ajouter partenaire" onAdd={() => setPartners((prev) => [...prev, { ...defaultPartner }])}>
              {partners.map((row, index) => (
                <div key={`partner-${index}`} className="space-y-2 rounded border p-3 bg-muted/10">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom partenaire *</Label>
                      <Input placeholder="Ex: SONATEL" value={row.partnerName} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, partnerName: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date du contrat</Label>
                      <Input type="date" value={row.contractDate} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, contractDate: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date d'expiration</Label>
                      <Input type="date" value={row.expiryDate} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, expiryDate: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Description du partenariat</Label>
                      <Input placeholder="Description des services..." value={row.description} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email contact</Label>
                      <Input type="email" placeholder="contact@partenaire.com" value={row.contactEmail} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, contactEmail: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tel contact</Label>
                      <Input placeholder="+221..." value={row.contactPhone} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, contactPhone: e.target.value } : x)))} />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label className="text-xs">Zones d'operation (zones couvertes par ce contrat)</Label>
                      <Input placeholder="Ex: Dakar, Saint-Louis, Thiès — une zone par ligne ou separees par virgule" value={row.operationZones} onChange={(e) => setPartners((prev) => prev.map((x, i) => (i === index ? { ...x, operationZones: e.target.value } : x)))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Documents du partenaire</Label>
                    <div className="flex flex-wrap gap-2">
                      <FileUploadButton label="Ajouter Contrat" docType="CONTRACT" onUpload={async (file, docType) => {
                        const form = new FormData();
                        form.append('file', file);
                        form.append('category', docType.toLowerCase());
                        const res = await fetch('/api/noc/client-documents', { method: 'POST', body: form });
                        const payload = await res.json();
                        if (!res.ok || !payload.success) throw new Error(payload.error || 'Echec upload');
                        setPartners((prev) => prev.map((x, i) => i === index ? {
                          ...x,
                          documents: [...x.documents, { docType: 'CONTRACT', fileName: payload.fileName, fileUrl: payload.fileUrl, mimeType: payload.mimeType }],
                        } : x));
                      }} />
                      <FileUploadButton label="Ajouter Autre" docType="OTHER" onUpload={async (file, docType) => {
                        const form = new FormData();
                        form.append('file', file);
                        form.append('category', docType.toLowerCase());
                        const res = await fetch('/api/noc/client-documents', { method: 'POST', body: form });
                        const payload = await res.json();
                        if (!res.ok || !payload.success) throw new Error(payload.error || 'Echec upload');
                        setPartners((prev) => prev.map((x, i) => i === index ? {
                          ...x,
                          documents: [...x.documents, { docType: 'OTHER', fileName: payload.fileName, fileUrl: payload.fileUrl, mimeType: payload.mimeType }],
                        } : x));
                      }} />
                    </div>
                    {row.documents.map((doc, dIdx) => (
                      <div key={`pdoc-${index}-${dIdx}`} className="text-sm rounded border px-2 py-1 flex items-center justify-between gap-2">
                        <span className="truncate">{doc.docType} • {doc.fileName}</span>
                        <a className="text-primary underline" href={doc.fileUrl} target="_blank" rel="noreferrer">Voir</a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </SectionArray>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Documents (Acceptance, Contrat, autres)</CardTitle>
                <CardDescription>Formats supportes: PDF, JPG, PNG, WEBP.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1 min-w-47.5">
                    <Label className="text-xs">Type de document</Label>
                    <Select value={documentTypeSelection} onValueChange={(value) => setDocumentTypeSelection(value as 'ACCEPTANCE' | 'CONTRACT' | 'OTHER')}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choisir type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCEPTANCE">Acceptance</SelectItem>
                        <SelectItem value="CONTRACT">Contrat</SelectItem>
                        <SelectItem value="OTHER">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FileUploadButton
                    label="Ajouter document"
                    docType={documentTypeSelection}
                    onUpload={uploadDocument}
                  />
                </div>
                {documents.length === 0 && <p className="text-sm text-muted-foreground">Aucun document.</p>}
                {documents.map((doc, idx) => (
                  <div key={`${doc.fileUrl}-${idx}`} className="text-sm rounded border px-2 py-1 flex items-center justify-between gap-2">
                    <span className="truncate">{doc.docType} • {doc.fileName}</span>
                    <a className="text-primary underline" href={doc.fileUrl} target="_blank" rel="noreferrer">Voir</a>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void saveClient()} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              {editingClientId && (
                canDelete ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const candidate = clients.find((c) => c.id_client === editingClientId);
                      if (candidate) setDeleteCandidate(candidate);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </Button>
                ) : null
              )}
              {!canDelete && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Suppression reservee aux roles Admin/Super Admin/Supervisor.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3 bg-muted/20">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium wrap-break-word">{value}</p>
    </div>
  );
}

function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border p-3 bg-muted/20">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      {lines.length === 0 ? (
        <p className="text-sm">-</p>
      ) : (
        <div className="space-y-1">
          {lines.map((line, index) => (
            <p key={`${title}-${index}`} className="text-sm wrap-break-word">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionArray({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> {addLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Etat" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UP">UP</SelectItem>
        <SelectItem value="DOWN">DOWN</SelectItem>
        <SelectItem value="DEGRADED">DEGRADED</SelectItem>
        <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FileUploadButton({
  label,
  docType,
  onUpload,
}: {
  label: string;
  docType: 'ACCEPTANCE' | 'CONTRACT' | 'OTHER';
  onUpload: (file: File, docType: 'ACCEPTANCE' | 'CONTRACT' | 'OTHER') => Promise<void>;
}) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted/50 text-sm">
      <Upload className="w-4 h-4" />
      {label}
      <input
        className="hidden"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await onUpload(file, docType);
            toast.success(`Document ${file.name} televerse.`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Upload impossible');
          } finally {
            e.currentTarget.value = '';
          }
        }}
      />
    </label>
  );
}
