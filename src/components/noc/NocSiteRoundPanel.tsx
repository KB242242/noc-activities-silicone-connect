'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCcw, Rows3, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

type SiteApiRow = {
  id: string;
  site_name: string;
  localite: string | null;
  departement: string;
  responsible_name: string | null;
  responsible_phone: string | null;
  contact_phone?: string | null;
  service_phone?: string | null;
};

type SiteDetailApiResponse = {
  id: string;
  vigiles?: Array<{
    first_name: string;
    last_name: string;
    personal_phone: string | null;
    is_active: boolean;
  }>;
};

type SiteVigileInfo = {
  name: string;
  phone: string;
};

type RoundStatus = 'RAS' | 'A_SURVEILLER' | 'CRITIQUE';
type BinaryStatus = 'OUI' | 'NON';
type ExpressValue = '1' | '2' | '1 et 2';
type EquipmentStatus = 'EN MARCHE ET EN BON ETAT' | 'EN ARRET ET EN BON ETAT' | 'AUCUNE COMMUNICATION';
type GeStatus = 'EN ARRET' | 'EN MARCHE';

type SiteRoundRow = {
  rowId: string;
  isValidated: boolean;
  siteId: string;
  date: string;
  horaire: string;
  site: string;
  express: ExpressValue;
  climatisation: EquipmentStatus;
  batteries: EquipmentStatus;
  ge: GeStatus;
  fuiteGazoil: BinaryStatus;
  courantE2c: BinaryStatus;
  commentaire: string;
  nomVigile: string;
  contactVigile: string;
  statut: RoundStatus;
};

type SavedRoundDraft = {
  rows: SiteRoundRow[];
  conclusionHtml: string;
  conclusionValidated: boolean;
};

const SITE_ROUND_STORAGE_KEY = 'noc-site-round-draft-v1';

const backboneSudDepartments = new Set([
  'BRAZZAVILLE',
  'POOL',
  'BOUENZA',
  'LEKOUMOU',
  'NIARI',
  'KOUILOU',
  'POINTE-NOIRE',
]);

const priorityBackboneSites = [
  'NKAYI',
  'BOUANSA',
  'MINDOULI',
  'BONDI',
  'DOLISIE',
  'LOUDIMA',
] as const;

// Order in which sites are added one-by-one via the "Ajouter une ligne" button
const additionOrder = [
  'BONDI',
  'DOLISIE',
  'LOUDIMA',
  'NKAYI',
  'BOUANSA',
  'MINDOULI',
] as const;

const siteContactOverrides: Array<{ prefix: string; phone: string }> = [
  { prefix: 'BONDI', phone: '242 06 737 14 91' },
  { prefix: 'DOLISIE', phone: '242 06 737 14 90' },
  { prefix: 'LOUDIMA', phone: '242 06 737 14 89' },
  { prefix: 'NKAYI', phone: '242 06 737 14 86' },
  { prefix: 'BOUANSA', phone: '242 06 737 14 87' },
  { prefix: 'MINDOULI', phone: '242 06 737 14 88' },
];

function getCurrentDateLabel() {
  return new Date().toLocaleDateString('fr-FR');
}

function getCurrentHourLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}H${String(now.getMinutes()).padStart(2, '0')}`;
}

function resolveSiteContact(site: SiteApiRow): string {
  const siteName = String(site.site_name ?? '').trim().toUpperCase();
  const forced = siteContactOverrides.find((entry) => siteName.startsWith(entry.prefix));
  if (forced) return forced.phone;

  return site.contact_phone || site.service_phone || site.responsible_phone || '';
}

function getDefaultExpressForSite(siteName: string): ExpressValue {
  const normalized = String(siteName ?? '').trim().toUpperCase();

  if (normalized.startsWith('MINDOULI') || normalized.startsWith('BONDI') || normalized.startsWith('DOLISIE') || normalized.startsWith('LOUDIMA')) {
    return '1 et 2';
  }

  if (normalized.startsWith('NKAYI') || normalized.startsWith('BOUANSA')) {
    return '2';
  }

  return '2';
}

function createDefaultRow(site: SiteApiRow, vigiles: SiteVigileInfo[] = [], offset = 0): SiteRoundRow {
  const now = new Date();
  now.setMinutes(now.getMinutes() + offset);
  const defaultVigile = vigiles[0] ?? null;

  return {
    rowId: `${site.id}-${Date.now()}-${Math.random()}`,
    isValidated: false,
    siteId: site.id,
    date: now.toLocaleDateString('fr-FR'),
    horaire: `${String(now.getHours()).padStart(2, '0')}H${String(now.getMinutes()).padStart(2, '0')}`,
    site: site.site_name,
    express: getDefaultExpressForSite(site.site_name),
    climatisation: 'EN MARCHE ET EN BON ETAT',
    batteries: 'EN MARCHE ET EN BON ETAT',
    ge: 'EN ARRET',
    fuiteGazoil: 'NON',
    courantE2c: 'OUI',
    commentaire: 'RAS',
    nomVigile: defaultVigile?.name || site.responsible_name || '',
    contactVigile: resolveSiteContact(site),
    statut: 'RAS',
  };
}

function resolveSiteVigiles(detail: SiteDetailApiResponse | null): SiteVigileInfo[] {
  if (!detail?.vigiles || detail.vigiles.length === 0) return [];

  const mapped = detail.vigiles
    .map((vigile) => ({
      name: `${vigile.first_name} ${vigile.last_name}`.trim(),
      phone: vigile.personal_phone ?? '',
      isActive: vigile.is_active,
    }))
    .filter((vigile) => vigile.name.length > 0);

  mapped.sort((a, b) => {
    if (a.isActive === b.isActive) {
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    }
    return a.isActive ? -1 : 1;
  });

  return mapped.map(({ name, phone }) => ({ name, phone }));
}

function getRoundStatusLabel(status: RoundStatus) {
  if (status === 'A_SURVEILLER') return 'A surveiller';
  if (status === 'CRITIQUE') return 'Critique';
  return 'RAS - aucun incident';
}

function commentToPlainText(value: string): string {
  if (!value) return '';
  if (!value.includes('<')) return value;

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type InlineCommentEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function InlineCommentEditor({ value, onChange }: InlineCommentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (document.activeElement !== editor) {
      editor.innerHTML = value || '';
    }
  }, [value]);

  const emitValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const updateToolbarState = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbarVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const common = range.commonAncestorContainer;
    const rootNode = common.nodeType === Node.TEXT_NODE ? common.parentNode : common;
    if (!rootNode || !editor.contains(rootNode)) {
      setToolbarVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    setToolbarPos({
      x: rect.left - editorRect.left + rect.width / 2,
      y: Math.max(0, rect.top - editorRect.top - 6),
    });
    setToolbarVisible(true);
  };

  const runCommand = (command: string) => {
    document.execCommand(command, false);
    emitValue();
    updateToolbarState();
  };

  return (
    <div className="relative">
      {toolbarVisible && (
        <div
          className="absolute z-50 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-white shadow-xl"
          style={{ left: toolbarPos.x, top: toolbarPos.y, transform: 'translate(-50%, -100%)' }}
        >
          <button type="button" className="rounded px-2 py-0.5 text-xs font-bold hover:bg-slate-700" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}>B</button>
          <button type="button" className="rounded px-2 py-0.5 text-xs italic hover:bg-slate-700" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}>I</button>
          <button type="button" className="rounded px-2 py-0.5 text-xs line-through hover:bg-slate-700" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('strikeThrough')}>S</button>
          <button type="button" className="rounded px-2 py-0.5 text-xs hover:bg-slate-700" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}>•</button>
          <button type="button" className="rounded px-2 py-0.5 text-xs hover:bg-slate-700" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')}>1.</button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-10 w-56 max-h-28 overflow-y-auto rounded border border-slate-300 bg-white px-2 py-1 text-xs leading-4 dark:border-slate-700 dark:bg-slate-900"
        style={{ whiteSpace: 'pre-wrap' }}
        onInput={emitValue}
        onMouseUp={updateToolbarState}
        onKeyUp={updateToolbarState}
        onBlur={() => setTimeout(() => setToolbarVisible(false), 120)}
      />
    </div>
  );
}

export function NocSiteRoundPanel() {
  const MAX_UNDO_STEPS = 150;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SiteRoundRow[]>([]);
  const [allSites, setAllSites] = useState<SiteApiRow[]>([]);
  const [siteVigiles, setSiteVigiles] = useState<Record<string, SiteVigileInfo[]>>({});
  const [showConclusionEditor, setShowConclusionEditor] = useState(false);
  const [conclusionHtml, setConclusionHtml] = useState('');
  const [conclusionValidated, setConclusionValidated] = useState(false);
  const rowsHistoryRef = useRef<SiteRoundRow[][]>([]);
  const isUndoingRef = useRef(false);

  const cloneRows = (source: SiteRoundRow[]): SiteRoundRow[] => source.map((row) => ({ ...row }));

  const pushRowsHistory = (previousRows: SiteRoundRow[]) => {
    if (isUndoingRef.current) return;
    rowsHistoryRef.current.push(cloneRows(previousRows));
    if (rowsHistoryRef.current.length > MAX_UNDO_STEPS) {
      rowsHistoryRef.current.shift();
    }
  };

  const applyRowsChangeWithHistory = (updater: (previousRows: SiteRoundRow[]) => SiteRoundRow[]) => {
    setRows((previousRows) => {
      pushRowsHistory(previousRows);
      return updater(previousRows);
    });
  };

  const loadSites = useCallback(async (resetSaved = false) => {
    try {
      setLoading(true);

      if (resetSaved && typeof window !== 'undefined') {
        window.localStorage.removeItem(SITE_ROUND_STORAGE_KEY);
        setConclusionHtml('');
        setConclusionValidated(false);
        setShowConclusionEditor(false);
      }

      const response = await fetch('/api/noc/sites?limit=300', { cache: 'no-store' });
      if (!response.ok) throw new Error();

      const payload = await response.json() as { data?: SiteApiRow[] };
      const sites = payload.data ?? [];
      setAllSites(sites);

      const backboneSudSites = sites
        .filter((site) => backboneSudDepartments.has(String(site.departement ?? '').toUpperCase()));

      // Match by prefix: "BONDI" matches "BONDI - BBS", "BONDI SUD", etc.
      const findByPrefix = (name: string): SiteApiRow | undefined =>
        backboneSudSites.find(
          (site) => String(site.site_name ?? '').trim().toUpperCase().startsWith(name)
        );

      const prioritized = priorityBackboneSites
        .map((name) => findByPrefix(name))
        .filter((site): site is SiteApiRow => Boolean(site));

      const orderedBackboneSites = prioritized;

      const missingPrioritySites = priorityBackboneSites.filter((name) => !findByPrefix(name));
      if (missingPrioritySites.length > 0) {
        toast.warning(`Sites introuvables en base: ${missingPrioritySites.join(', ')}`);
      }

      if (orderedBackboneSites.length === 0) {
        setRows([]);
        setSiteVigiles({});
        toast.warning('Aucun site Backbone Sud trouvé dans la base.');
        return;
      }

      const detailResults = await Promise.all(
        orderedBackboneSites.map(async (site) => {
          try {
            const res = await fetch(`/api/noc/sites?id=${site.id}`, { cache: 'no-store' });
            if (!res.ok) return [site.id, []] as const;
            const detail = await res.json() as SiteDetailApiResponse;
            return [site.id, resolveSiteVigiles(detail)] as const;
          } catch {
            return [site.id, []] as const;
          }
        })
      );

      const vigileMap: Record<string, SiteVigileInfo[]> = {};
      for (const [siteId, vigiles] of detailResults) {
        if (vigiles.length > 0) {
          vigileMap[siteId] = vigiles;
        }
      }

      setSiteVigiles(vigileMap);

      const baseRows = orderedBackboneSites.map((site, index) => createDefaultRow(site, vigileMap[site.id] ?? [], index));

      if (!resetSaved && typeof window !== 'undefined') {
        const savedRaw = window.localStorage.getItem(SITE_ROUND_STORAGE_KEY);
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw) as SavedRoundDraft;
            if (Array.isArray(saved.rows) && saved.rows.length > 0) {
              const siteById = new Map(sites.map((site) => [site.id, site]));
              const hydrateContact = (row: SiteRoundRow): string => {
                if (String(row.contactVigile ?? '').trim()) return row.contactVigile;

                const siteFromId = siteById.get(row.siteId);
                if (siteFromId) return resolveSiteContact(siteFromId);

                const rowSiteName = String(row.site ?? '').trim().toUpperCase();
                const matchByName = sites.find((site) => {
                  const siteName = String(site.site_name ?? '').trim().toUpperCase();
                  return siteName === rowSiteName || siteName.startsWith(rowSiteName) || rowSiteName.startsWith(siteName);
                });
                return matchByName ? resolveSiteContact(matchByName) : '';
              };

              setRows(saved.rows.map((row) => ({
                ...row,
                contactVigile: hydrateContact(row),
                isValidated: Boolean(row.isValidated),
              })));
              setConclusionHtml(saved.conclusionHtml ?? '');
              setConclusionValidated(Boolean(saved.conclusionValidated));
              setShowConclusionEditor(Boolean(saved.conclusionHtml));
              return;
            }
          } catch {
            window.localStorage.removeItem(SITE_ROUND_STORAGE_KEY);
          }
        }
      }

      setRows(baseRows);
    } catch {
      toast.error('Impossible de charger les sites pour la ronde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      const isUndoKey = event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey) && !event.shiftKey;
      if (!isUndoKey) return;
      if (rowsHistoryRef.current.length === 0) return;

      event.preventDefault();
      const previous = rowsHistoryRef.current.pop();
      if (!previous) return;

      isUndoingRef.current = true;
      setRows(cloneRows(previous));
      isUndoingRef.current = false;
    };

    window.addEventListener('keydown', handleUndoShortcut);
    return () => {
      window.removeEventListener('keydown', handleUndoShortcut);
    };
  }, []);

  const siteOptions = useMemo(() => {
    return allSites
      .map((site) => ({ id: site.id, label: site.site_name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [allSites]);

  const allRowsValidated = useMemo(() => rows.length > 0 && rows.every((row) => row.isValidated), [rows]);

  const updateRow = <K extends keyof SiteRoundRow>(rowId: string, key: K, value: SiteRoundRow[K]) => {
    applyRowsChangeWithHistory((prev) => prev.map((row) => {
      if (row.rowId !== rowId) return row;
      return {
        ...row,
        [key]: value,
        isValidated: key === 'isValidated' ? Boolean(value) : false,
      };
    }));
  };

  const fetchSiteVigiles = async (siteId: string): Promise<SiteVigileInfo[]> => {
    try {
      const res = await fetch(`/api/noc/sites?id=${siteId}`, { cache: 'no-store' });
      if (!res.ok) return [];
      const detail = await res.json() as SiteDetailApiResponse;
      const vigiles = resolveSiteVigiles(detail);
      setSiteVigiles((prev) => ({ ...prev, [siteId]: vigiles }));
      return vigiles;
    } catch {
      return [];
    }
  };

  const handleChangeSite = async (rowId: string, siteId: string) => {
    const selected = allSites.find((site) => site.id === siteId);
    if (!selected) return;

    let vigiles = siteVigiles[siteId] ?? [];
    if (vigiles.length === 0) {
      vigiles = await fetchSiteVigiles(siteId);
    }
    const defaultVigile = vigiles[0] ?? null;

    applyRowsChangeWithHistory((prev) => prev.map((row) => {
      if (row.rowId !== rowId) return row;
      return {
        ...row,
        siteId: selected.id,
        site: selected.site_name,
        nomVigile: defaultVigile?.name || selected.responsible_name || '',
        contactVigile: resolveSiteContact(selected),
        isValidated: false,
      };
    }));
  };

  const handleChangeVigile = (rowId: string, vigileName: string) => {
    applyRowsChangeWithHistory((prev) => prev.map((row) => {
      if (row.rowId !== rowId) return row;
      const siteGuardList = siteVigiles[row.siteId] ?? [];
      const selectedVigile = siteGuardList.find((vigile) => vigile.name === vigileName);
      return {
        ...row,
        nomVigile: vigileName,
        contactVigile: row.contactVigile,
        isValidated: false,
      };
    }));
  };

  const removeRow = (rowId: string) => {
    applyRowsChangeWithHistory((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const addManualRow = async () => {
    const currentSiteNames = new Set(
      rows.map((row) => String(row.site ?? '').trim().toUpperCase())
    );

    // Find next site in additionOrder not yet present in the table
    // Uses prefix match to handle names like "BONDI - BBS"
    const nextName = additionOrder.find((name) =>
      !Array.from(currentSiteNames).some((existing) => existing.startsWith(name))
    );

    let siteRecord = nextName
      ? allSites.find(
        (site) => String(site.site_name ?? '').trim().toUpperCase().startsWith(nextName)
      )
      : undefined;

    // After the 6 ordered sites, continue with remaining sites from DB.
    if (!siteRecord) {
      siteRecord = allSites
        .filter((site) => !currentSiteNames.has(String(site.site_name ?? '').trim().toUpperCase()))
        .sort((a, b) => a.site_name.localeCompare(b.site_name, 'fr', { sensitivity: 'base' }))[0];
    }

    if (!siteRecord) {
      toast.info('Vous avez déjà renseigné tous les sites existants.');
      return;
    }

    let vigiles = siteVigiles[siteRecord.id] ?? [];
    if (vigiles.length === 0) {
      vigiles = await fetchSiteVigiles(siteRecord.id);
    }

    applyRowsChangeWithHistory((prev) => [
      ...prev,
      createDefaultRow(siteRecord, vigiles),
    ]);
  };

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    if (!allRowsValidated) {
      toast.error('Validez toutes les lignes avant d\'enregistrer.');
      return;
    }

    window.localStorage.setItem(
      SITE_ROUND_STORAGE_KEY,
      JSON.stringify({
        rows,
        conclusionHtml,
        conclusionValidated,
      } satisfies SavedRoundDraft)
    );
    toast.success('Tableau de ronde enregistré.');
  };

  const handleValidateConclusion = () => {
    setConclusionValidated(true);
    toast.success('Conclusion validée.');
  };

  return (
    <Card className="border-slate-200/70 bg-white/75 dark:border-slate-700/60 dark:bg-slate-900/45">
      <CardHeader className="space-y-3">
        <div className="rounded-md border border-amber-500/90 bg-amber-500 px-3 py-3 text-center text-base font-extrabold tracking-wider text-black sm:text-lg">
          RAPPORT DES SITES DES BACKBONES
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => void loadSites(true)}>
            <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Actualiser depuis la base
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => void addManualRow()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une ligne
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowConclusionEditor((prev) => !prev)}
          >
            Insérer une conclusion
          </Button>
          {allRowsValidated && (
            <Button size="sm" className="h-8 bg-teal-700 text-white hover:bg-teal-600" onClick={handleSave}>
              Enregistrer
            </Button>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            <Rows3 className="h-3.5 w-3.5" /> {rows.length} ligne(s)
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des sites Backbone Sud...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-teal-800 hover:bg-teal-800">
                  <TableHead className="min-w-16 text-center text-[11px] font-bold text-white">Validation</TableHead>
                  <TableHead className="min-w-30 text-center text-[11px] font-bold text-white">STATUT</TableHead>
                  <TableHead className="min-w-25 text-center text-[11px] font-bold text-white">DATE</TableHead>
                  <TableHead className="min-w-24 text-center text-[11px] font-bold text-white">HORAIRE</TableHead>
                  <TableHead className="min-w-35 text-center text-[11px] font-bold text-white">SITES</TableHead>
                  <TableHead className="min-w-24 text-center text-[11px] font-bold text-white">EXPRESS</TableHead>
                  <TableHead className="min-w-55 text-center text-[11px] font-bold text-white">CLIMATISATION</TableHead>
                  <TableHead className="min-w-55 text-center text-[11px] font-bold text-white">BATTERIES</TableHead>
                  <TableHead className="min-w-35 text-center text-[11px] font-bold text-white">GE</TableHead>
                  <TableHead className="min-w-38 text-center text-[11px] font-bold text-white">FUITE DE GAZOIL</TableHead>
                  <TableHead className="min-w-33 text-center text-[11px] font-bold text-white">COURANT E²C</TableHead>
                  <TableHead className="min-w-56 text-center text-[11px] font-bold text-white">COMMENTAIRE</TableHead>
                  <TableHead className="min-w-45 text-center text-[11px] font-bold text-white">NOM DU VIGILE</TableHead>
                  <TableHead className="min-w-43 text-center text-[11px] font-bold text-white">CONTACT DU SITE</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucun site à afficher.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.rowId} className="group">
                      <TableCell className="text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            checked={row.isValidated}
                            onChange={(event) => updateRow(row.rowId, 'isValidated', event.target.checked)}
                            className="h-4 w-4 accent-teal-700"
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(row.rowId)}
                            className="pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-slate-500 opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-700 dark:hover:text-red-400"
                            aria-label="Supprimer la ligne"
                            title="Supprimer la ligne"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.statut}
                          onChange={(event) => updateRow(row.rowId, 'statut', event.target.value as RoundStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="RAS">{getRoundStatusLabel('RAS')}</option>
                          <option value="A_SURVEILLER">{getRoundStatusLabel('A_SURVEILLER')}</option>
                          <option value="CRITIQUE">{getRoundStatusLabel('CRITIQUE')}</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <Input
                          value={row.date}
                          onChange={(event) => updateRow(row.rowId, 'date', event.target.value)}
                          className="h-8 text-center text-xs"
                          placeholder={getCurrentDateLabel()}
                        />
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <Input
                          value={row.horaire}
                          onChange={(event) => updateRow(row.rowId, 'horaire', event.target.value)}
                          className="h-8 text-center text-xs"
                          placeholder={getCurrentHourLabel()}
                        />
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.siteId}
                          onChange={(event) => handleChangeSite(row.rowId, event.target.value)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          {siteOptions.map((siteOption) => (
                            <option key={siteOption.id} value={siteOption.id}>{siteOption.label}</option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.express}
                          onChange={(event) => updateRow(row.rowId, 'express', event.target.value as ExpressValue)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="1 et 2">1 et 2</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.climatisation}
                          onChange={(event) => updateRow(row.rowId, 'climatisation', event.target.value as EquipmentStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="EN MARCHE ET EN BON ETAT">EN MARCHE ET EN BON ETAT</option>
                          <option value="EN ARRET ET EN BON ETAT">EN ARRET ET EN BON ETAT</option>
                          <option value="AUCUNE COMMUNICATION">AUCUNE COMMUNICATION</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.batteries}
                          onChange={(event) => updateRow(row.rowId, 'batteries', event.target.value as EquipmentStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="EN MARCHE ET EN BON ETAT">EN MARCHE ET EN BON ETAT</option>
                          <option value="EN ARRET ET EN BON ETAT">EN ARRET ET EN BON ETAT</option>
                          <option value="AUCUNE COMMUNICATION">AUCUNE COMMUNICATION</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.ge}
                          onChange={(event) => updateRow(row.rowId, 'ge', event.target.value as GeStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="EN ARRET">EN ARRET</option>
                          <option value="EN MARCHE">EN MARCHE</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.fuiteGazoil}
                          onChange={(event) => updateRow(row.rowId, 'fuiteGazoil', event.target.value as BinaryStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="NON">NON</option>
                          <option value="OUI">OUI</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.courantE2c}
                          onChange={(event) => updateRow(row.rowId, 'courantE2c', event.target.value as BinaryStatus)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="OUI">OUI</option>
                          <option value="NON">NON</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <InlineCommentEditor
                          value={row.commentaire}
                          onChange={(nextValue) => updateRow(row.rowId, 'commentaire', nextValue)}
                        />
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <select
                          value={row.nomVigile}
                          onChange={(event) => handleChangeVigile(row.rowId, event.target.value)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          {(siteVigiles[row.siteId] ?? []).length > 0 ? (
                            (siteVigiles[row.siteId] ?? []).map((vigile) => (
                              <option key={`${row.siteId}-${vigile.name}`} value={vigile.name}>{vigile.name}</option>
                            ))
                          ) : (
                            <option value={row.nomVigile || ''}>{row.nomVigile || 'Aucun vigile'}</option>
                          )}
                        </select>
                      </TableCell>

                      <TableCell className="text-center align-middle">
                        <Input
                          value={row.contactVigile}
                          onChange={(event) => updateRow(row.rowId, 'contactVigile', event.target.value)}
                          className="h-8 text-center text-xs"
                          placeholder="242 xx xxx xx xx"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {showConclusionEditor && (
          <div className="mt-4 rounded-md border border-teal-300/70 bg-teal-50/55 p-3 dark:border-teal-800/60 dark:bg-teal-950/20">
            <div className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Conclusion / description
            </div>
            <RichTextEditor
              value={conclusionHtml}
              onChange={(value) => {
                setConclusionHtml(value);
                setConclusionValidated(false);
              }}
              minHeight="160px"
              placeholder="Saisir ici la conclusion de la ronde des sites..."
            />
            <div className="mt-3 flex items-center justify-end gap-3">
              {conclusionValidated && (
                <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Conclusion validée</span>
              )}
              <Button type="button" className="bg-teal-700/90 text-white hover:bg-teal-600" onClick={handleValidateConclusion}>
                Valider
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
