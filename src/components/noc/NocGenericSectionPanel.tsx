'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, GripHorizontal, ListFilter, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ItemStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'CLOSED';
type ItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ViewMode = 'cards' | 'table' | 'compact';
type SectionKind = 'equipement' | 'partenaire' | 'fai' | 'generic';

type EquipmentType = 'SWITCH' | 'ROUTER' | 'OLT' | 'ONU' | 'ONT' | 'RADIO' | 'FIREWALL' | 'SERVER' | 'PC' | 'OTHER';
type LinkType = 'FILAIRE' | 'FAISCEAU_HERTZIEN' | 'MIXTE';
type ConnectivityType = 'DIRECT' | 'DEDIE' | 'POINT_TO_POINT' | 'AUTRE';

type GenericItem = {
  id: string;
  name: string;
  owner: string;
  zone: string;
  code: string;

  // Equipement
  equipmentType: EquipmentType;
  vendor: string;
  model: string;
  ipManagement: string;

  // Partenaire
  contractDate: string;
  expiryDate: string;
  contactEmail: string;
  contactPhone: string;

  // FAI
  address: string;
  allocatedMbps: string;
  bandwidthMbps: string;
  internationalExit: string;
  linkType: LinkType;
  connectivityType: ConnectivityType;

  status: ItemStatus;
  priority: ItemPriority;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  sectionKey: string;
  title: string;
  subtitle: string;
};

const defaultItem = {
  name: '',
  owner: '',
  zone: '',
  code: '',
  equipmentType: 'OTHER' as EquipmentType,
  vendor: '',
  model: '',
  ipManagement: '',
  contractDate: '',
  expiryDate: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  allocatedMbps: '',
  bandwidthMbps: '',
  internationalExit: '',
  linkType: 'FILAIRE' as LinkType,
  connectivityType: 'DIRECT' as ConnectivityType,
  status: 'OPEN' as ItemStatus,
  priority: 'MEDIUM' as ItemPriority,
  notes: '',
};

function storageKey(sectionKey: string): string {
  return `noc.section.${sectionKey}.items`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function resolveSectionKind(sectionKey: string): SectionKind {
  if (sectionKey === 'equipement') return 'equipement';
  if (sectionKey === 'partenaire') return 'partenaire';
  if (sectionKey === 'fai') return 'fai';
  return 'generic';
}

/** Normalize a raw localStorage item — fills every missing field with its default value. */
function sanitizeItem(raw: Partial<GenericItem>, idx: number): GenericItem {
  const now = new Date().toISOString();
  return {
    id: (raw.id && raw.id.trim()) ? raw.id : `ITEM-migrated-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    name: raw.name ?? '',
    owner: raw.owner ?? '',
    zone: raw.zone ?? '',
    code: raw.code ?? '',
    equipmentType: (raw.equipmentType as EquipmentType) || 'OTHER',
    vendor: raw.vendor ?? '',
    model: raw.model ?? '',
    ipManagement: raw.ipManagement ?? '',
    contractDate: raw.contractDate ?? '',
    expiryDate: raw.expiryDate ?? '',
    contactEmail: raw.contactEmail ?? '',
    contactPhone: raw.contactPhone ?? '',
    address: raw.address ?? '',
    allocatedMbps: raw.allocatedMbps ?? '',
    bandwidthMbps: raw.bandwidthMbps ?? '',
    internationalExit: raw.internationalExit ?? '',
    linkType: (raw.linkType as LinkType) || 'FILAIRE',
    connectivityType: (raw.connectivityType as ConnectivityType) || 'DIRECT',
    status: (raw.status as ItemStatus) || 'OPEN',
    priority: (raw.priority as ItemPriority) || 'MEDIUM',
    notes: raw.notes ?? '',
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

function readStoredItems(sectionKey: string): GenericItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(storageKey(sectionKey));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<GenericItem>[];
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed.map((item, idx) => sanitizeItem(item, idx));
    const seen = new Set<string>();

    return [...sanitized].reverse().filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).reverse();
  } catch {
    return [];
  }
}

function getDefaultDialogLayout() {
  if (typeof window === 'undefined') {
    return {
      pos: { x: 12, y: 12 },
      size: { width: 960, height: 700 },
    };
  }

  const width = Math.min(window.innerWidth - 24, 960);
  const height = Math.min(window.innerHeight - 24, 700);

  return {
    size: { width, height },
    pos: {
      x: Math.max(12, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - height) / 2)),
    },
  };
}

/** Returns a professional subtitle for the dialog form based on section type. */
function formSubtitle(kind: SectionKind, editingId: string | null): string {
  const action = editingId ? 'Modification' : 'Enregistrement';
  if (kind === 'equipement')
    return `${action} d'un équipement réseau — code, type, marque, modèle et adresse IP de management.`;
  if (kind === 'partenaire')
    return `${action} d'un partenaire opérateur — coordonnées contractuelles, dates et contact référent.`;
  if (kind === 'fai')
    return `${action} d'un fournisseur d'accès Internet — liaisons, débits, sorties internationales et priorité d'utilisation.`;
  return `${action} d'un élément de suivi — statut, priorité et responsable.`;
}

/** Hook providing drag state and style for a Dialog. */
function useDraggableDialog() {
  const [layout, setLayout] = useState(() => getDefaultDialogLayout());
  const drag = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const { pos, size } = layout;

  const resetDialog = () => {
    setLayout(getDefaultDialogLayout());
  };

  const onHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!drag.current.active) return;
      const maxX = Math.max(12, window.innerWidth - 80);
      const maxY = Math.max(12, window.innerHeight - 80);
      const nextX = drag.current.originX + ev.clientX - drag.current.startX;
      const nextY = drag.current.originY + ev.clientY - drag.current.startY;
      setLayout((currentLayout) => ({
        ...currentLayout,
        pos: {
          x: Math.min(maxX, Math.max(12, nextX)),
          y: Math.min(maxY, Math.max(12, nextY)),
        },
      }));
    };
    const onUp = () => {
      drag.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const style: React.CSSProperties = {
    top: `${pos.y}px`,
    left: `${pos.x}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: `calc(100vw - 24px)`,
    maxHeight: `calc(100vh - 24px)`,
    transform: 'none',
    resize: 'both',
    overflow: 'auto',
  };

  return { style, onHandleMouseDown, resetDialog };
}

export function NocGenericSectionPanel({ sectionKey, title, subtitle }: Props) {
  const sectionKind = resolveSectionKind(sectionKey);

  const [items, setItems] = useState<GenericItem[]>(() => readStoredItems(sectionKey));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ItemStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ItemPriority>('ALL');
  const [form, setForm] = useState({ ...defaultItem });

  const { style: dialogStyle, onHandleMouseDown, resetDialog } = useDraggableDialog();

  useEffect(() => {
    localStorage.setItem(storageKey(sectionKey), JSON.stringify(items));
  }, [items, sectionKey]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
        if (!q) return true;
        const hay = `${item.name} ${item.owner} ${item.zone} ${item.code} ${item.vendor} ${item.model} ${item.contactEmail} ${item.contactPhone} ${item.address} ${item.linkType} ${item.connectivityType} ${item.notes}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, priorityFilter, query, statusFilter]);

  const beginCreate = () => {
    setEditingId(null);
    setForm({ ...defaultItem });
    resetDialog();
    setShowForm(true);
  };

  const beginEdit = (item: GenericItem) => {
    const safe = sanitizeItem(item, 0);
    setEditingId(safe.id);
    setForm({
      name: safe.name,
      owner: safe.owner,
      zone: safe.zone,
      code: safe.code,
      equipmentType: safe.equipmentType,
      vendor: safe.vendor,
      model: safe.model,
      ipManagement: safe.ipManagement,
      contractDate: safe.contractDate,
      expiryDate: safe.expiryDate,
      contactEmail: safe.contactEmail,
      contactPhone: safe.contactPhone,
      address: safe.address,
      allocatedMbps: safe.allocatedMbps,
      bandwidthMbps: safe.bandwidthMbps,
      internationalExit: safe.internationalExit,
      linkType: safe.linkType,
      connectivityType: safe.connectivityType,
      status: safe.status,
      priority: safe.priority,
      notes: safe.notes,
    });
    resetDialog();
    setShowForm(true);
  };

  const saveItem = () => {
    if (!form.name.trim()) {
      toast.error('Le nom est obligatoire.');
      return;
    }

    if (sectionKind === 'equipement' && !form.equipmentType) {
      toast.error('Le type d\'equipement est obligatoire.');
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim(),
                owner: form.owner.trim(),
                zone: form.zone.trim(),
                code: form.code.trim(),
                equipmentType: form.equipmentType,
                vendor: form.vendor.trim(),
                model: form.model.trim(),
                ipManagement: form.ipManagement.trim(),
                contractDate: form.contractDate,
                expiryDate: form.expiryDate,
                contactEmail: form.contactEmail.trim(),
                contactPhone: form.contactPhone.trim(),
                address: form.address.trim(),
                allocatedMbps: form.allocatedMbps.trim(),
                bandwidthMbps: form.bandwidthMbps.trim(),
                internationalExit: form.internationalExit.trim(),
                linkType: form.linkType,
                connectivityType: form.connectivityType,
                status: form.status,
                priority: form.priority,
                notes: form.notes.trim(),
                updatedAt: now,
              }
            : item
        )
      );
      toast.success('Element modifie.');
    } else {
      const newItem: GenericItem = {
        id: `ITEM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: form.name.trim(),
        owner: form.owner.trim(),
        zone: form.zone.trim(),
        code: form.code.trim(),
        equipmentType: form.equipmentType,
        vendor: form.vendor.trim(),
        model: form.model.trim(),
        ipManagement: form.ipManagement.trim(),
        contractDate: form.contractDate,
        expiryDate: form.expiryDate,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim(),
        allocatedMbps: form.allocatedMbps.trim(),
        bandwidthMbps: form.bandwidthMbps.trim(),
        internationalExit: form.internationalExit.trim(),
        linkType: form.linkType,
        connectivityType: form.connectivityType,
        status: form.status,
        priority: form.priority,
        notes: form.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => [newItem, ...prev]);
      toast.success('Element cree.');
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ ...defaultItem });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Element supprime.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <Button onClick={beginCreate}>
            <Plus className="w-4 h-4 mr-2" /> Creer
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par nom, code, zone, contact..."
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | ItemStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous statuts</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as 'ALL' | ItemPriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Priorite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes priorites</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Affichage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cards">Mode cartes</SelectItem>
                <SelectItem value="table">Mode tableau</SelectItem>
                <SelectItem value="compact">Mode compact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border p-3 text-sm flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <ListFilter className="w-4 h-4" />
              {filteredItems.length} element(s) dans la liste
            </span>
            <span className="text-xs text-muted-foreground">Cle: {sectionKey}</span>
          </div>

          {viewMode === 'cards' && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{item.name}</p>
                    <Badge variant="outline">{item.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sectionKind === 'equipement' && `${item.equipmentType} • ${item.vendor || '-'} • ${item.model || '-'}`}
                    {sectionKind === 'partenaire' && `${item.contractDate || '-'} → ${item.expiryDate || '-'} • ${item.zone || '-'}`}
                    {sectionKind === 'fai' && `${item.linkType} • ${item.connectivityType} • ${item.allocatedMbps || '-'} Mbps`}
                    {sectionKind === 'generic' && `${item.owner || 'Sans owner'} • ${item.zone || 'Sans zone'}`}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{item.status}</Badge>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => beginEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'compact' && (
            <div className="rounded-md border divide-y">
              {filteredItems.map((item) => (
                <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sectionKind === 'equipement' && `${item.code || '-'} • ${item.equipmentType} • ${item.zone || '-'}`}
                      {sectionKind === 'partenaire' && `${item.contractDate || '-'} • ${item.zone || '-'}`}
                      {sectionKind === 'fai' && `${item.linkType} • ${item.connectivityType}`}
                      {sectionKind === 'generic' && `${item.zone || 'Sans zone'} • ${item.owner || 'Sans owner'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                    <Button variant="outline" size="sm" onClick={() => beginEdit(item)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Nom</th>
                    {sectionKind === 'equipement' && <th className="text-left px-3 py-2">Code</th>}
                    {sectionKind === 'equipement' && <th className="text-left px-3 py-2">Type</th>}
                    {sectionKind === 'equipement' && <th className="text-left px-3 py-2">Marque/Modele</th>}
                    {sectionKind === 'equipement' && <th className="text-left px-3 py-2">IP Mgmt</th>}

                    {sectionKind === 'partenaire' && <th className="text-left px-3 py-2">Contrat</th>}
                    {sectionKind === 'partenaire' && <th className="text-left px-3 py-2">Expiration</th>}
                    {sectionKind === 'partenaire' && <th className="text-left px-3 py-2">Contact</th>}

                    {sectionKind === 'fai' && <th className="text-left px-3 py-2">Liaison</th>}
                    {sectionKind === 'fai' && <th className="text-left px-3 py-2">Connectivite</th>}
                    {sectionKind === 'fai' && <th className="text-left px-3 py-2">Debits</th>}
                    {sectionKind === 'fai' && <th className="text-left px-3 py-2">Sortie Internationale</th>}
                    {sectionKind === 'fai' && <th className="text-left px-3 py-2">Contact</th>}

                    {sectionKind === 'generic' && <th className="text-left px-3 py-2">Owner</th>}
                    <th className="text-left px-3 py-2">Zone</th>
                    <th className="text-left px-3 py-2">Statut</th>
                    <th className="text-left px-3 py-2">Priorite</th>
                    <th className="text-left px-3 py-2">Maj</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      {sectionKind === 'equipement' && <td className="px-3 py-2">{item.code || '-'}</td>}
                      {sectionKind === 'equipement' && <td className="px-3 py-2">{item.equipmentType}</td>}
                      {sectionKind === 'equipement' && <td className="px-3 py-2">{item.vendor || '-'} / {item.model || '-'}</td>}
                      {sectionKind === 'equipement' && <td className="px-3 py-2">{item.ipManagement || '-'}</td>}

                      {sectionKind === 'partenaire' && <td className="px-3 py-2">{item.contractDate || '-'}</td>}
                      {sectionKind === 'partenaire' && <td className="px-3 py-2">{item.expiryDate || '-'}</td>}
                      {sectionKind === 'partenaire' && <td className="px-3 py-2">{item.contactEmail || item.contactPhone || '-'}</td>}

                      {sectionKind === 'fai' && <td className="px-3 py-2">{item.linkType}</td>}
                      {sectionKind === 'fai' && <td className="px-3 py-2">{item.connectivityType}</td>}
                      {sectionKind === 'fai' && <td className="px-3 py-2">{item.allocatedMbps || '-'} / {item.bandwidthMbps || '-'} Mbps</td>}
                      {sectionKind === 'fai' && <td className="px-3 py-2">{item.internationalExit || '-'}</td>}
                      {sectionKind === 'fai' && <td className="px-3 py-2">{item.contactEmail || item.contactPhone || '-'}</td>}

                      {sectionKind === 'generic' && <td className="px-3 py-2">{item.owner || '-'}</td>}
                      <td className="px-3 py-2">{item.zone || '-'}</td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2">{item.priority}</td>
                      <td className="px-3 py-2">{formatDate(item.updatedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => beginEdit(item)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeItem(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredItems.length === 0 && <p className="text-sm text-muted-foreground">Aucun element trouve.</p>}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingId(null); setForm({ ...defaultItem }); } }}>
        <DialogContent
          className="max-w-none max-h-none translate-x-0 translate-y-0 overflow-auto"
          style={dialogStyle}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Draggable handle — click and drag this bar to move the modal anywhere on screen */}
          <div
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none -mx-1 px-1 py-1 rounded hover:bg-muted/40 transition-colors"
            onMouseDown={onHandleMouseDown}
          >
            <GripHorizontal className="w-5 h-5 text-muted-foreground shrink-0" />
            <DialogHeader className="flex-1 pointer-events-none">
              <DialogTitle className="text-base font-semibold leading-tight">
                {editingId ? `Modifier — ${title}` : `Nouveau — ${title}`}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {formSubtitle(sectionKind, editingId)}
              </p>
            </DialogHeader>
          </div>
          <div className="border-t" />

          <div className="space-y-4 pt-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>

              {sectionKind === 'equipement' && (
                <div>
                  <Label>Code equipement</Label>
                  <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'equipement' && (
                <div>
                  <Label>Type equipement</Label>
                  <Select value={form.equipmentType} onValueChange={(value) => setForm((prev) => ({ ...prev, equipmentType: value as EquipmentType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                </div>
              )}

              {sectionKind === 'equipement' && (
                <div>
                  <Label>Marque</Label>
                  <Input value={form.vendor} onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'equipement' && (
                <div>
                  <Label>Modele</Label>
                  <Input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'equipement' && (
                <div>
                  <Label>IP Management</Label>
                  <Input value={form.ipManagement} onChange={(e) => setForm((prev) => ({ ...prev, ipManagement: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'partenaire' && (
                <div>
                  <Label>Date contrat</Label>
                  <Input type="date" value={form.contractDate} onChange={(e) => setForm((prev) => ({ ...prev, contractDate: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'partenaire' && (
                <div>
                  <Label>Date expiration</Label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'partenaire' && (
                <div>
                  <Label>Email contact</Label>
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'partenaire' && (
                <div>
                  <Label>Telephone contact</Label>
                  <Input value={form.contactPhone} onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Sortie internationale</Label>
                  <Input value={form.internationalExit} onChange={(e) => setForm((prev) => ({ ...prev, internationalExit: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Debit alloue (Mbps)</Label>
                  <Input type="number" min="0" value={form.allocatedMbps} onChange={(e) => setForm((prev) => ({ ...prev, allocatedMbps: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Bande passante (Mbps)</Label>
                  <Input type="number" min="0" value={form.bandwidthMbps} onChange={(e) => setForm((prev) => ({ ...prev, bandwidthMbps: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Type de liaison</Label>
                  <Select value={form.linkType} onValueChange={(value) => setForm((prev) => ({ ...prev, linkType: value as LinkType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FILAIRE">Filaire</SelectItem>
                      <SelectItem value="FAISCEAU_HERTZIEN">Faisceaux Hertziens</SelectItem>
                      <SelectItem value="MIXTE">Mixte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Type de connectivite</Label>
                  <Select value={form.connectivityType} onValueChange={(value) => setForm((prev) => ({ ...prev, connectivityType: value as ConnectivityType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="DEDIE">Dedie</SelectItem>
                      <SelectItem value="POINT_TO_POINT">Point to Point</SelectItem>
                      <SelectItem value="AUTRE">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Email contact FAI</Label>
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} />
                </div>
              )}

              {sectionKind === 'fai' && (
                <div>
                  <Label>Telephone contact FAI</Label>
                  <Input value={form.contactPhone} onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))} />
                </div>
              )}

              <div>
                <Label>Zone</Label>
                <Input value={form.zone} onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))} />
              </div>

              {sectionKind === 'generic' && (
                <div>
                  <Label>Owner</Label>
                  <Input value={form.owner} onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))} />
                </div>
              )}

              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ItemStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                    <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorite</Label>
                <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as ItemPriority }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...defaultItem }); }}>Annuler</Button>
            <Button onClick={saveItem}>
              <Save className="w-4 h-4 mr-2" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
