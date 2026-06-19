import { addDays, differenceInCalendarDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, CircleDot, Layers3, Link2, PenLine, Ticket, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type GanttTaskItem = {
  id: string;
  title: string;
  linkedTicketId?: string;
  linkedTicketNumero?: string;
  linkedTicketObjet?: string;
  status: string;
  priority: string;
  category: string;
  userName?: string;
  description?: string;
  tags: string[];
  startTime: Date;
  estimatedEndTime: Date;
  estimatedDuration: number;
};

type TicketLite = {
  id: string;
  numero: string;
  objet: string;
  status?: string;
};

type AppTasksGanttViewProps<T extends GanttTaskItem> = {
  tasks: T[];
  onOpenDetails: (task: T) => void;
  onUpdateSchedule: (taskId: string, startTime: Date, estimatedEndTime: Date) => Promise<void> | void;
  onLinkTicket: (task: T, ticket: TicketLite) => Promise<void> | void;
  onQuickUpdateTask: (
    taskId: string,
    updates: { title?: string; description?: string; priority?: string; status?: string; tags?: string[] },
    successMessage?: string
  ) => Promise<void> | void;
  onCreateTaskAt: (startTime: Date) => void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
};

type DragMode = 'move' | 'resize_start' | 'resize_end';

type DragState = {
  taskId: string;
  mode: DragMode;
  startX: number;
  originStartIndex: number;
  originSpan: number;
};

type PhaseConfig = {
  label: string;
  short: string;
  laneClassName: string;
  badgeClassName: string;
  barClassName: string;
  accentClassName: string;
};

type TimelineWeek = {
  start: Date;
  label: string;
  monthKey: string;
  monthLabel: string;
};

type PhaseRow<T extends GanttTaskItem> = {
  key: string;
  config: PhaseConfig;
  tasks: Array<{
    task: T;
    startIndex: number;
    span: number;
    isMilestone: boolean;
    progress: number;
  }>;
};

type ContextMenuState<T extends GanttTaskItem> = {
  x: number;
  y: number;
  task: T | null;
};

const PHASE_CONFIGS: Record<string, PhaseConfig> = {
  incident: {
    label: 'Cadrage & Architecture',
    short: '1',
    laneClassName: 'bg-[linear-gradient(180deg,#1570a6_0%,#1d87c8_100%)] text-white',
    badgeClassName: 'border-[#9ad6ff] bg-[#e8f6ff] text-[#0f5d8d]',
    barClassName: 'border-[#1f7fb6] bg-[linear-gradient(180deg,#2c98d4_0%,#1778b2_100%)] text-white',
    accentClassName: 'bg-[#1f7fb6]',
  },
  maintenance: {
    label: 'Infrastructure & Materiel',
    short: '2',
    laneClassName: 'bg-[linear-gradient(180deg,#159957_0%,#1eae65_100%)] text-white',
    badgeClassName: 'border-[#8ee2ba] bg-[#eafbf2] text-[#157346]',
    barClassName: 'border-[#218c58] bg-[linear-gradient(180deg,#39bf77_0%,#23955c_100%)] text-white',
    accentClassName: 'bg-[#23955c]',
  },
  surveillance: {
    label: 'Outils De Supervision',
    short: '3',
    laneClassName: 'bg-[linear-gradient(180deg,#d97706_0%,#ea8c14_100%)] text-white',
    badgeClassName: 'border-[#ffd29a] bg-[#fff4e6] text-[#b45309]',
    barClassName: 'border-[#d97706] bg-[linear-gradient(180deg,#f39b22_0%,#df7d0a_100%)] text-white',
    accentClassName: 'bg-[#df7d0a]',
  },
  administrative: {
    label: 'Processus & Gouvernance',
    short: '4',
    laneClassName: 'bg-[linear-gradient(180deg,#d0a500_0%,#e0b400_100%)] text-white',
    badgeClassName: 'border-[#f7db6d] bg-[#fff9db] text-[#997300]',
    barClassName: 'border-[#c89f00] bg-[linear-gradient(180deg,#efc31a_0%,#d6aa00_100%)] text-white',
    accentClassName: 'bg-[#d6aa00]',
  },
  other: {
    label: 'Pilotage & Livraison',
    short: '5',
    laneClassName: 'bg-[linear-gradient(180deg,#7a2ea8_0%,#9447c1_100%)] text-white',
    badgeClassName: 'border-[#d9b8f1] bg-[#f7edff] text-[#6b21a8]',
    barClassName: 'border-[#7e22ce] bg-[linear-gradient(180deg,#9b4dcb_0%,#7e22ce_100%)] text-white',
    accentClassName: 'bg-[#7e22ce]',
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPhaseConfig(category: string): PhaseConfig {
  return PHASE_CONFIGS[String(category || '').toLowerCase()] ?? PHASE_CONFIGS.other;
}

function getStatusLabel(status: string): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'Complete';
  if (normalized === 'in_progress') return 'En cours';
  if (normalized === 'on_hold') return 'Suspendue';
  if (normalized === 'late') return 'En retard';
  if (normalized === 'cancelled') return 'Annulee';
  return 'Planifiee';
}

function getPriorityLabel(priority: string): string {
  const normalized = String(priority || '').toLowerCase();
  if (normalized === 'critical') return 'Critique';
  if (normalized === 'high') return 'Haute';
  if (normalized === 'medium') return 'Moyenne';
  if (normalized === 'low') return 'Faible';
  return 'Standard';
}

function parseLinkedTicket(task: Pick<GanttTaskItem, 'tags' | 'linkedTicketId' | 'linkedTicketNumero'>): { id?: string; numero?: string } {
  if (task.linkedTicketId || task.linkedTicketNumero) {
    return {
      id: task.linkedTicketId,
      numero: task.linkedTicketNumero,
    };
  }

  const linkedId = task.tags.find((tag) => tag.toLowerCase().startsWith('ticket_id:'));
  const linkedNumero = task.tags.find((tag) => tag.toLowerCase().startsWith('ticket_no:'));

  return {
    id: linkedId ? linkedId.split(':').slice(1).join(':').trim() : undefined,
    numero: linkedNumero ? linkedNumero.split(':').slice(1).join(':').trim() : undefined,
  };
}

function getTimelineBounds<T extends GanttTaskItem>(tasks: T[]) {
  const now = new Date();
  if (tasks.length === 0) {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(addDays(start, 35), { weekStartsOn: 1 });
    return { start, end };
  }

  const starts = tasks.map((task) => task.startTime.getTime());
  const ends = tasks.map((task) => task.estimatedEndTime.getTime());
  const minDate = new Date(Math.min(...starts));
  const maxDate = new Date(Math.max(...ends));
  const start = startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 });
  const end = endOfWeek(addDays(maxDate, 7), { weekStartsOn: 1 });
  return { start, end };
}

function buildWeeks(start: Date, end: Date): TimelineWeek[] {
  const weeks: TimelineWeek[] = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    weeks.push({
      start: new Date(cursor),
      label: format(cursor, "'S'II", { locale: fr }),
      monthKey: format(cursor, 'yyyy-MM'),
      monthLabel: format(cursor, 'MMMM yyyy', { locale: fr }),
    });
    cursor = addDays(endOfWeek(cursor, { weekStartsOn: 1 }), 1);
  }

  return weeks;
}

function computeTaskProgress(start: Date, end: Date, status: string): number {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 100;
  if (normalized === 'cancelled') return 0;
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Date.now() - start.getTime();
  return clamp(Math.round((elapsed / total) * 100), 4, 96);
}

function getProgressFromTags(tags: string[], fallbackValue: number): number {
  const progressTag = tags.find((tag) => tag.toLowerCase().startsWith('progress:'));
  if (!progressTag) return fallbackValue;
  const raw = Number(progressTag.split(':').slice(1).join(':').trim());
  if (Number.isNaN(raw)) return fallbackValue;
  return clamp(Math.round(raw), 0, 100);
}

function setProgressInTags(tags: string[], progress: number): string[] {
  const filtered = tags.filter((tag) => !tag.toLowerCase().startsWith('progress:'));
  return [...filtered, `progress:${clamp(Math.round(progress), 0, 100)}`];
}

function getDependencyIds(tags: string[]): string[] {
  return tags
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      return normalized.startsWith('dep:') || normalized.startsWith('depends_on:');
    })
    .map((tag) => tag.split(':').slice(1).join(':').trim())
    .filter(Boolean);
}

function setDependenciesInTags(tags: string[], dependencyIds: string[]): string[] {
  const filtered = tags.filter((tag) => {
    const normalized = tag.toLowerCase();
    return !normalized.startsWith('dep:') && !normalized.startsWith('depends_on:');
  });

  return [...filtered, ...dependencyIds.map((id) => `dep:${id}`)];
}

function groupTasksByPhase<T extends GanttTaskItem>(tasks: T[], timelineStart: Date): PhaseRow<T>[] {
  const groups = new Map<string, T[]>();

  tasks.forEach((task) => {
    const key = String(task.category || 'other').toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  });

  return Array.from(groups.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, phaseTasks]) => ({
      key,
      config: getPhaseConfig(key),
      tasks: phaseTasks
        .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
        .map((task) => {
          const startIndex = Math.max(0, differenceInCalendarDays(startOfWeek(task.startTime, { weekStartsOn: 1 }), timelineStart) / 7);
          const endIndex = Math.max(startIndex, differenceInCalendarDays(endOfWeek(task.estimatedEndTime, { weekStartsOn: 1 }), timelineStart) / 7);
          const span = Math.max(1, endIndex - startIndex + 1);
          const isMilestone = span === 1 && task.estimatedDuration <= 60 * 24;
          return {
            task,
            startIndex,
            span,
            isMilestone,
            progress: getProgressFromTags(task.tags, computeTaskProgress(task.startTime, task.estimatedEndTime, task.status)),
          };
        }),
    }));
}

function getSummary(tasks: GanttTaskItem[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => String(task.status).toLowerCase() === 'completed').length;
  const active = tasks.filter((task) => String(task.status).toLowerCase() === 'in_progress').length;
  return { total, completed, active };
}

export function AppTasksGanttView<T extends GanttTaskItem>({
  tasks,
  onOpenDetails,
  onCreateTaskAt,
  onUpdateSchedule,
  onQuickUpdateTask,
  onDeleteTask,
}: AppTasksGanttViewProps<T>) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenuState<T> | null>(null);
  const [zoomDrag, setZoomDrag] = useState<null | { startX: number; startZoom: number }>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ taskId: string; startIndex: number; span: number } | null>(null);
  const [progressDraft, setProgressDraft] = useState(0);
  const [statusDraft, setStatusDraft] = useState('pending');
  const [dependencyDraft, setDependencyDraft] = useState('');
  const zoomDragRef = useRef<null | { startX: number; startZoom: number }>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const timelineBounds = useMemo(() => getTimelineBounds(tasks), [tasks]);
  const weeks = useMemo(() => buildWeeks(timelineBounds.start, timelineBounds.end), [timelineBounds.end, timelineBounds.start]);
  const phaseRows = useMemo(() => groupTasksByPhase(tasks, timelineBounds.start), [tasks, timelineBounds.start]);
  const summary = useMemo(() => getSummary(tasks), [tasks]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [selectedTaskId, tasks]);
  const monthGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; span: number }> = [];
    weeks.forEach((week) => {
      const current = groups[groups.length - 1];
      if (current && current.key === week.monthKey) {
        current.span += 1;
        return;
      }
      groups.push({ key: week.monthKey, label: week.monthLabel, span: 1 });
    });
    return groups;
  }, [weeks]);
  const cellWidth = Math.round(clamp(88 * zoom, 72, 160));
  const hasSelection = Boolean(selectedTask);
  const selectedTaskProgress = selectedTask
    ? getProgressFromTags(selectedTask.tags, computeTaskProgress(selectedTask.startTime, selectedTask.estimatedEndTime, selectedTask.status))
    : 0;
  const selectedTaskDependencies = selectedTask ? getDependencyIds(selectedTask.tags) : [];

  const rowLayouts = useMemo(() => {
    const map = new Map<string, { rowIndex: number; startIndex: number; span: number }>();
    let rowIndex = 0;
    for (const phase of phaseRows) {
      for (const entry of phase.tasks) {
        map.set(entry.task.id, { rowIndex, startIndex: entry.startIndex, span: entry.span });
        rowIndex += 1;
      }
    }
    return map;
  }, [phaseRows]);

  const dependencyLines = useMemo(() => {
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];
    tasks.forEach((task) => {
      const target = rowLayouts.get(task.id);
      if (!target) return;
      const sourceIds = getDependencyIds(task.tags);
      sourceIds.forEach((sourceId) => {
        const source = rowLayouts.get(sourceId);
        if (!source) return;
        lines.push({
          id: `${sourceId}-${task.id}`,
          x1: (source.startIndex + source.span) * cellWidth,
          y1: source.rowIndex * 88 + 44,
          x2: target.startIndex * cellWidth,
          y2: target.rowIndex * 88 + 44,
        });
      });
    });
    return lines;
  }, [cellWidth, rowLayouts, tasks]);

  const upsertTaskProgress = useCallback(async () => {
    if (!selectedTask) return;
    const nextTags = setProgressInTags(selectedTask.tags, progressDraft);
    await onQuickUpdateTask(selectedTask.id, { tags: nextTags }, 'Progression mise a jour');
  }, [onQuickUpdateTask, progressDraft, selectedTask]);

  const upsertTaskStatus = useCallback(async () => {
    if (!selectedTask) return;
    await onQuickUpdateTask(selectedTask.id, { status: statusDraft }, 'Statut mis a jour');
  }, [onQuickUpdateTask, selectedTask, statusDraft]);

  const addTaskDependency = useCallback(async () => {
    if (!selectedTask || !dependencyDraft) return;
    const dependencyIds = Array.from(new Set([...selectedTaskDependencies, dependencyDraft]));
    const nextTags = setDependenciesInTags(selectedTask.tags, dependencyIds);
    await onQuickUpdateTask(selectedTask.id, { tags: nextTags }, 'Dependance ajoutee');
    setDependencyDraft('');
  }, [dependencyDraft, onQuickUpdateTask, selectedTask, selectedTaskDependencies]);

  const removeTaskDependency = useCallback(async (dependencyId: string) => {
    if (!selectedTask) return;
    const dependencyIds = selectedTaskDependencies.filter((id) => id !== dependencyId);
    const nextTags = setDependenciesInTags(selectedTask.tags, dependencyIds);
    await onQuickUpdateTask(selectedTask.id, { tags: nextTags }, 'Dependance retiree');
  }, [onQuickUpdateTask, selectedTask, selectedTaskDependencies]);

  const startScheduleDrag = useCallback((taskId: string, mode: DragMode, eventClientX: number, startIndex: number, span: number) => {
    setDragState({
      taskId,
      mode,
      startX: eventClientX,
      originStartIndex: startIndex,
      originSpan: span,
    });
    setDragPreview({ taskId, startIndex, span });
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;
    if (tasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(null);
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    if (!selectedTask) return;
    setProgressDraft(selectedTaskProgress);
    setStatusDraft(selectedTask.status);
  }, [selectedTask, selectedTaskProgress]);

  useEffect(() => {
    zoomDragRef.current = zoomDrag;
  }, [zoomDrag]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    if (!zoomDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      const state = zoomDragRef.current;
      if (!state) return;
      const delta = event.clientX - state.startX;
      setZoom(clamp(Number((state.startZoom + delta / 320).toFixed(2)), 0.75, 1.8));
    };

    const handlePointerUp = () => {
      zoomDragRef.current = null;
      setZoomDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [zoomDrag]);

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu, { once: true });
    window.addEventListener('contextmenu', closeMenu, { once: true });

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const deltaWeeks = Math.round((event.clientX - state.startX) / cellWidth);

      if (state.mode === 'move') {
        const nextStartIndex = clamp(state.originStartIndex + deltaWeeks, 0, weeks.length - state.originSpan);
        setDragPreview({ taskId: state.taskId, startIndex: nextStartIndex, span: state.originSpan });
        return;
      }

      if (state.mode === 'resize_start') {
        const nextStartIndex = clamp(state.originStartIndex + deltaWeeks, 0, state.originStartIndex + state.originSpan - 1);
        const nextSpan = state.originSpan + (state.originStartIndex - nextStartIndex);
        setDragPreview({ taskId: state.taskId, startIndex: nextStartIndex, span: nextSpan });
        return;
      }

      const nextSpan = clamp(state.originSpan + deltaWeeks, 1, weeks.length - state.originStartIndex);
      setDragPreview({ taskId: state.taskId, startIndex: state.originStartIndex, span: nextSpan });
    };

    const handlePointerUp = async () => {
      const state = dragStateRef.current;
      const preview = dragPreview;
      if (state && preview && preview.taskId === state.taskId) {
        const startDate = addDays(timelineBounds.start, preview.startIndex * 7);
        const endDate = endOfWeek(addDays(startDate, (preview.span - 1) * 7), { weekStartsOn: 1 });

        if (preview.startIndex !== state.originStartIndex || preview.span !== state.originSpan) {
          await onUpdateSchedule(state.taskId, startDate, endDate);
        }
      }

      dragStateRef.current = null;
      setDragState(null);
      setDragPreview(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [cellWidth, dragPreview, dragState, onUpdateSchedule, timelineBounds.start, weeks.length]);

  return (
    <Card className="overflow-hidden border-slate-300/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(239,244,249,0.94)_52%,_rgba(226,235,245,0.98)_100%)] shadow-[0_18px_50px_-28px_rgba(15,23,42,0.38)] dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.98),_rgba(17,24,39,0.96)_52%,_rgba(2,6,23,0.98)_100%)]">
      <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(37,52,70,0.98)_0%,rgba(52,69,89,0.98)_100%)] text-white dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98)_0%,rgba(15,23,42,0.98)_100%)]">
        <div className="space-y-4">
          {/* Titre et description */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100/90">
                <Layers3 className="h-3.5 w-3.5" />
                Programme NOC
              </div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-white">
                <CalendarClock className="h-5 w-5 text-sky-300" />
                Diagramme de Gantt executif
              </CardTitle>
              <p className="max-w-3xl text-sm text-slate-200/80">
                Clique sur une tache pour afficher sa fiche. Maintiens le clic gauche sur le graphe pour zoomer ou dezoomer horizontalement. Clic droit pour ouvrir le menu contextuel.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Taches</p>
                <p className="mt-1 text-2xl font-bold text-white">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Actives</p>
                <p className="mt-1 text-2xl font-bold text-amber-300">{summary.active}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Zoom</p>
                <p className="mt-1 text-2xl font-bold text-sky-300">{Math.round(zoom * 100)}%</p>
              </div>
            </div>
          </div>

          {/* Contrôles des filtres */}
          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">Zoom</label>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setZoom(clamp(zoom - 0.2, 0.75, 1.8))} className="bg-white/10 hover:bg-white/20">−</Button>
                <span className="w-12 text-center text-sm font-bold text-white">{Math.round(zoom * 100)}%</span>
                <Button size="sm" variant="outline" onClick={() => setZoom(clamp(zoom + 0.2, 0.75, 1.8))} className="bg-white/10 hover:bg-white/20">+</Button>
              </div>
            </div>
            <div className="ml-auto">
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <span>📊</span>
                EXPORTER VERS EXCEL (XLSX)
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={cn('grid', hasSelection ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1')}>
          {/* SECTION TABLE + GANTT */}
          <div className={cn('overflow-hidden bg-white/80 dark:bg-slate-950/55', hasSelection ? 'border-r border-slate-200/80 dark:border-slate-800' : '')}>
            <ScrollArea className="h-[720px] w-full">
              <div className="min-w-max">
                {/* En-têtes table + timeline */}
                <div
                  className="sticky top-0 z-20 grid border-b border-slate-300/80 bg-[linear-gradient(180deg,rgba(249,251,253,0.98)_0%,rgba(238,243,248,0.98)_100%)] backdrop-blur-md dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.98)_100%)]"
                  style={{
                    gridTemplateColumns: `140px 80px 80px 80px 100px auto 80px 80px repeat(${weeks.length}, ${cellWidth}px)`,
                  }}
                >
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    TÂCHE
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    DÉBUT
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    FIN
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    DURÉE
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    ASSIGNÉ
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    LIBELLÉS
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    STATUT
                  </div>
                  <div className="flex items-center border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                    PRIORITÉ
                  </div>

                  {/* Month headers */}
                  {monthGroups.map((month) => (
                    <div
                      key={month.key}
                      className="flex items-center justify-center border-r border-slate-300/70 px-2 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      style={{ gridColumn: `span ${month.span}` }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>

                {/* Lignes de tâches */}
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {phaseRows.map((phase) =>
                    phase.tasks.map((entry) => {
                      const linked = parseLinkedTicket(entry.task);
                      const isSelected = selectedTaskId === entry.task.id;
                      const preview = dragPreview?.taskId === entry.task.id ? dragPreview : null;
                      const renderStartIndex = preview?.startIndex ?? entry.startIndex;
                      const renderSpan = preview?.span ?? entry.span;

                      return (
                        <div
                          key={entry.task.id}
                          className="grid"
                          style={{
                            gridTemplateColumns: `140px 80px 80px 80px 100px auto 80px 80px repeat(${weeks.length}, ${cellWidth}px)`,
                          }}
                        >
                          {/* COLONNE: TÂCHE */}
                          <button
                            type="button"
                            className={cn(
                              'border-r border-slate-200 px-3 py-3 text-left text-xs font-semibold transition dark:border-slate-800',
                              isSelected ? 'bg-slate-100/90 dark:bg-slate-800/80' : 'bg-white hover:bg-slate-50 dark:bg-slate-950/55 dark:hover:bg-slate-900/70'
                            )}
                            onClick={() => setSelectedTaskId(entry.task.id)}
                          >
                            <p className="truncate text-slate-900 dark:text-slate-100">{entry.task.title}</p>
                          </button>

                          {/* COLONNE: DÉBUT */}
                          <div className="border-r border-slate-200 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                            {format(entry.task.startTime, 'dd/MM', { locale: fr })}
                          </div>

                          {/* COLONNE: FIN */}
                          <div className="border-r border-slate-200 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                            {format(entry.task.estimatedEndTime, 'dd/MM', { locale: fr })}
                          </div>

                          {/* COLONNE: DURÉE */}
                          <div className="border-r border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
                            {Math.round(entry.task.estimatedDuration / 60)}h
                          </div>

                          {/* COLONNE: ASSIGNÉ */}
                          <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-800">
                            <div className="flex -space-x-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-[10px] font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                                {entry.task.userName?.[0] ?? '?'}
                              </div>
                            </div>
                          </div>

                          {/* COLONNE: LIBELLÉS */}
                          <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-800">
                            <div className="flex flex-wrap gap-1">
                              {entry.task.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                                  {tag.split(':')[0]}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* COLONNE: STATUT */}
                          <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-800">
                            <Badge className={cn('text-[10px] font-bold', phase.config.badgeClassName)}>
                              {getStatusLabel(entry.task.status)}
                            </Badge>
                          </div>

                          {/* COLONNE: PRIORITÉ */}
                          <div className="border-r border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
                            {getPriorityLabel(entry.task.priority)}
                          </div>

                          {/* COLONNES TIMELINE GANTT */}
                          <div
                            className="relative grid cursor-ew-resize"
                            style={{ gridColumn: `span ${weeks.length}` }}
                            onDoubleClick={(event) => {
                              if (event.target !== event.currentTarget) return;
                              const rect = event.currentTarget.getBoundingClientRect();
                              const relativeX = clamp(event.clientX - rect.left, 0, rect.width);
                              const weekIndex = Math.min(weeks.length - 1, Math.max(0, Math.floor(relativeX / cellWidth)));
                              onCreateTaskAt(weeks[weekIndex]?.start ?? new Date());
                            }}
                            onPointerDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              setContextMenu(null);
                              setZoomDrag({ startX: event.clientX, startZoom: zoom });
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              setContextMenu({ x: event.clientX, y: event.clientY, task: null });
                            }}
                          >
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, ${cellWidth}px)` }}>
                              {weeks.map((week, weekIndex) => (
                                <div
                                  key={`${entry.task.id}-${week.monthKey}-${weekIndex}`}
                                  className={cn(
                                    'border-r border-slate-200/80 dark:border-slate-800/90',
                                    weekIndex % 2 === 0 ? 'bg-white dark:bg-slate-950/45' : 'bg-slate-50/70 dark:bg-slate-900/45'
                                  )}
                                />
                              ))}
                            </div>

                            <button
                              type="button"
                              className="relative z-10 flex items-center px-2 py-3 text-left"
                              onClick={() => setSelectedTaskId(entry.task.id)}
                              onDoubleClick={() => onOpenDetails(entry.task)}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                setSelectedTaskId(entry.task.id);
                                setContextMenu({ x: event.clientX, y: event.clientY, task: entry.task });
                              }}
                            >
                              <div
                                className={cn(
                                  'group relative flex h-10 items-center overflow-visible rounded-lg border shadow-[0_8px_16px_-12px_rgba(15,23,42,0.6)] transition-transform hover:-translate-y-0.5',
                                  entry.isMilestone ? 'justify-center rounded-full px-0' : 'px-3',
                                  phase.config.barClassName,
                                  isSelected ? 'ring-2 ring-slate-900/20' : ''
                                )}
                                style={{
                                  marginLeft: `calc(${renderStartIndex} * 100% / ${weeks.length})`,
                                  width: entry.isMilestone ? '40px' : `calc(${renderSpan} * 100% / ${weeks.length} - 8px)`,
                                }}
                                onPointerDown={(event) => {
                                  if (entry.isMilestone) return;
                                  event.preventDefault();
                                  startScheduleDrag(entry.task.id, 'move', event.clientX, renderStartIndex, renderSpan);
                                }}
                              >
                                {entry.isMilestone ? (
                                  <div className="flex h-full w-full items-center justify-center rounded-full border border-white/45 bg-white/15 backdrop-blur-sm">
                                    <CircleDot className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize rounded-l-lg bg-white/40"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        startScheduleDrag(entry.task.id, 'resize_start', event.clientX, renderStartIndex, renderSpan);
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[11px] font-bold text-white">{entry.task.title}</p>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                                      <div className="h-full rounded-b-lg bg-white/40" style={{ width: `${entry.progress}%` }} />
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize rounded-r-lg bg-white/40"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        startScheduleDrag(entry.task.id, 'resize_end', event.clientX, renderStartIndex, renderSpan);
                                      }}
                                    />
                                  </>
                                )}
                                {!entry.isMilestone ? <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-lg', phase.config.accentClassName)} /> : null}
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          {hasSelection ? (
            <div className="bg-[linear-gradient(180deg,#f7f9fb_0%,#eef3f7_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)]">
              <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Fiche activite</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{selectedTask.title}</p>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', getPhaseConfig(selectedTask.category).badgeClassName)}>
                        {getPhaseConfig(selectedTask.category).label}
                      </Badge>
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">{selectedTask.description || 'Cette activite ne contient pas encore de description detaillee.'}</p>
                    </div>
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Statut</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{getStatusLabel(selectedTask.status)}</p>
                  </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Priorite</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{getPriorityLabel(selectedTask.priority)}</p>
                  </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Responsable</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      {selectedTask.userName || 'Equipe NOC'}
                    </p>
                  </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Ticket lie</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <Ticket className="h-4 w-4 text-slate-400" />
                      {parseLinkedTicket(selectedTask).numero || 'Non rattache'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Calendrier</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-900 dark:text-slate-100">Debut :</span> {format(selectedTask.startTime, 'EEEE dd MMMM yyyy', { locale: fr })}</p>
                    <p><span className="font-semibold text-slate-900 dark:text-slate-100">Fin :</span> {format(selectedTask.estimatedEndTime, 'EEEE dd MMMM yyyy', { locale: fr })}</p>
                    <p><span className="font-semibold text-slate-900">Duree :</span> {selectedTask.estimatedDuration} min</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Progression</p>
                  <div className="mt-3 space-y-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progressDraft}
                      onChange={(event) => setProgressDraft(Number(event.target.value))}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{progressDraft}%</p>
                      <Button size="sm" variant="outline" onClick={upsertTaskProgress} className="gap-2">
                        <PenLine className="h-4 w-4" />
                        Enregistrer
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Valeur actuelle: {selectedTaskProgress}%</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Statut rapide</p>
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value)}
                      className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="pending">Planifiee</option>
                      <option value="in_progress">En cours</option>
                      <option value="on_hold">Suspendue</option>
                      <option value="completed">Completee</option>
                      <option value="cancelled">Annulee</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={upsertTaskStatus}>Appliquer</Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Dependances</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={dependencyDraft}
                        onChange={(event) => setDependencyDraft(event.target.value)}
                        className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="">Selectionner une tache precedente</option>
                        {tasks
                          .filter((task) => task.id !== selectedTask.id)
                          .map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.title}
                            </option>
                          ))}
                      </select>
                      <Button size="sm" variant="outline" onClick={addTaskDependency} className="gap-1">
                        <Link2 className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>

                    {selectedTaskDependencies.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedTaskDependencies.map((dependencyId) => {
                          const dependencyTask = tasks.find((task) => task.id === dependencyId);
                          return (
                            <div key={dependencyId} className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-xs dark:border-slate-700">
                              <span className="truncate pr-3 text-slate-700 dark:text-slate-200">{dependencyTask?.title || dependencyId}</span>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => removeTaskDependency(dependencyId)}>
                                Retirer
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Aucune dependance declaree.</p>
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={() => onOpenDetails(selectedTask)}>
                  Ouvrir le detail
                </Button>
                <Button variant="destructive" className="w-full gap-2" onClick={() => onDeleteTask(selectedTask.id)}>
                  <Trash2 className="h-4 w-4" />
                  Supprimer la tache
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setSelectedTaskId(null)}>
                  Fermer la fiche
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {contextMenu ? (
          <div
            className="fixed z-50 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {contextMenu.task ? 'Action sur la tache' : 'Zoom du graphe'}
            </div>
            <div className="p-1.5">
              {contextMenu.task ? (
                <>
                  <button
                    type="button"
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setSelectedTaskId(contextMenu.task?.id ?? null);
                      setContextMenu(null);
                    }}
                  >
                    Afficher la fiche
                  </button>
                  <button
                    type="button"
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      if (contextMenu.task) onOpenDetails(contextMenu.task);
                      setContextMenu(null);
                    }}
                  >
                    Ouvrir le detail
                  </button>
                  <button
                    type="button"
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    onClick={() => {
                      if (contextMenu.task) {
                        onDeleteTask(contextMenu.task.id);
                        setSelectedTaskId(null);
                      }
                      setContextMenu(null);
                    }}
                  >
                    Supprimer
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setZoom((current) => clamp(Number((current + 0.15).toFixed(2)), 0.75, 1.8));
                  setContextMenu(null);
                }}
              >
                Zoom avant
              </button>
              <button
                type="button"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setZoom((current) => clamp(Number((current - 0.15).toFixed(2)), 0.75, 1.8));
                  setContextMenu(null);
                }}
              >
                Zoom arriere
              </button>
              <button
                type="button"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setZoom(1);
                  setContextMenu(null);
                }}
              >
                Zoom normal
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
