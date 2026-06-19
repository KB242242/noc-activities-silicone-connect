import type { Task, TaskAlert, TaskCategory, TaskComment, TaskHistoryEntry, TaskPriority, TaskStatus } from '@/features/app-shell/core/shared/types';

type ApiUser = {
  id: string;
  name: string;
};

type ApiTaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  isEdited?: boolean | null;
  user?: ApiUser;
};

type ApiTaskAlert = {
  id: string;
  taskId: string;
  type: string;
  message: string;
  isRead?: boolean | null;
  isDismissed?: boolean | null;
  triggeredBy: string;
  createdAt?: string | null;
};

type ApiTaskHistory = {
  id: string;
  taskId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp?: string | null;
};

type ApiTask = {
  id: string;
  userId: string;
  ticketId?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
  responsibility?: string | null;
  shiftName?: string | null;
  startTime?: string | null;
  estimatedEndTime?: string | null;
  actualEndTime?: string | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  tags?: string | null;
  isOverdue?: boolean | null;
  isNotified?: boolean | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: ApiUser | null;
  ticket?: {
    id: string;
    numero?: string | null;
    objet?: string | null;
  } | null;
  comments?: ApiTaskComment[];
  alerts?: ApiTaskAlert[];
  history?: ApiTaskHistory[];
};

function parseLinkedTicketFromTags(tags: string[]): { id?: string; numero?: string } {
  const linkedId = tags.find((tag) => tag.toLowerCase().startsWith('ticket_id:'));
  const linkedNumero = tags.find((tag) => tag.toLowerCase().startsWith('ticket_no:'));
  return {
    id: linkedId ? linkedId.split(':').slice(1).join(':').trim() : undefined,
    numero: linkedNumero ? linkedNumero.split(':').slice(1).join(':').trim() : undefined,
  };
}

function normalizeTaskStatus(value: string | null | undefined): TaskStatus {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'on_hold') return 'on_hold';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'late') return 'late';
  return 'pending';
}

function normalizeTaskCategory(value: string | null | undefined): TaskCategory {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'incident') return 'incident';
  if (normalized === 'maintenance') return 'maintenance';
  if (normalized === 'surveillance') return 'surveillance';
  if (normalized === 'administrative') return 'administrative';
  return 'other';
}

function normalizeTaskPriority(value: string | null | undefined): TaskPriority {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function toDate(value: string | null | undefined): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseTags(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mapTaskComment(comment: ApiTaskComment): TaskComment {
  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    userName: comment.userName || comment.user?.name || 'Utilisateur',
    userRole: 'USER',
    content: comment.content,
    createdAt: toDate(comment.createdAt),
    updatedAt: comment.updatedAt ? toDate(comment.updatedAt) : undefined,
    isEdited: Boolean(comment.isEdited),
  };
}

function mapTaskAlert(alert: ApiTaskAlert): TaskAlert {
  return {
    id: alert.id,
    taskId: alert.taskId,
    type: (String(alert.type).trim().toLowerCase() || 'info') as TaskAlert['type'],
    message: alert.message,
    isRead: Boolean(alert.isRead),
    isDismissed: Boolean(alert.isDismissed),
    createdAt: toDate(alert.createdAt),
    triggeredBy: alert.triggeredBy as TaskAlert['triggeredBy'],
  };
}

function mapTaskHistoryEntry(history: ApiTaskHistory): TaskHistoryEntry {
  return {
    id: history.id,
    taskId: history.taskId,
    userId: history.userId || '',
    userName: history.userName || 'Système',
    action: history.action as TaskHistoryEntry['action'],
    field: history.field || undefined,
    oldValue: history.oldValue || undefined,
    newValue: history.newValue || undefined,
    timestamp: toDate(history.timestamp),
  };
}

export function mapApiTaskToTask(task: ApiTask): Task {
  const startTime = toDate(task.startTime);
  const estimatedDuration = Number(task.estimatedDuration ?? 60);
  const estimatedEndTime = task.estimatedEndTime ? toDate(task.estimatedEndTime) : new Date(startTime.getTime() + estimatedDuration * 60000);
  const tags = parseTags(task.tags);
  const fallbackLinkedTicket = parseLinkedTicketFromTags(tags);

  return {
    id: task.id,
    userId: task.userId,
    userName: task.user?.name || 'Utilisateur',
    linkedTicketId: task.ticket?.id || task.ticketId || fallbackLinkedTicket.id,
    linkedTicketNumero: task.ticket?.numero || fallbackLinkedTicket.numero,
    linkedTicketObjet: task.ticket?.objet || undefined,
    title: task.title,
    description: task.description || '',
    status: normalizeTaskStatus(task.status),
    category: normalizeTaskCategory(task.category),
    priority: normalizeTaskPriority(task.priority),
    responsibility: (task.responsibility as Task['responsibility']) || undefined,
    shiftName: task.shiftName || undefined,
    startTime,
    estimatedEndTime,
    actualEndTime: task.actualEndTime ? toDate(task.actualEndTime) : undefined,
    estimatedDuration,
    actualDuration: task.actualDuration ?? undefined,
    comments: (task.comments ?? []).map(mapTaskComment),
    alerts: (task.alerts ?? []).map(mapTaskAlert),
    history: (task.history ?? []).map(mapTaskHistoryEntry),
    tags,
    isOverdue: Boolean(task.isOverdue),
    isNotified: Boolean(task.isNotified),
    createdAt: toDate(task.createdAt),
    updatedAt: toDate(task.updatedAt),
    completedAt: task.completedAt ? toDate(task.completedAt) : undefined,
  };
}

export function mapApiTasksToTasks(tasks: ApiTask[]): Task[] {
  return tasks.map(mapApiTaskToTask);
}

async function parseTaskResponse(response: Response): Promise<ApiTask> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.task) {
    throw new Error(payload?.error || 'task_request_failed');
  }

  return payload.task as ApiTask;
}

export async function fetchTasksRequest(userId?: string): Promise<Task[]> {
  const url = new URL('/api/tasks', window.location.origin);
  if (userId) {
    url.searchParams.set('userId', userId);
  }

  const response = await fetch(url.toString(), { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'tasks_load_failed');
  }

  return mapApiTasksToTasks((payload.tasks ?? []) as ApiTask[]);
}

export async function createTaskRequest(input: {
  userId: string;
  ticketId?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  shiftName?: string;
  startTime: Date;
  estimatedDuration?: number;
  tags?: string[];
}): Promise<Task> {
  const body = {
    ...input,
    startTime: input.startTime.toISOString(),
  };
  
  console.log('[createTaskRequest] Request body:', body);
  
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('[createTaskRequest] Response status:', response.status);
  
  const result = await parseTaskResponse(response);
  console.log('[createTaskRequest] Parsed result:', result);
  
  return mapApiTaskToTask(result);
}

export async function updateTaskRequest(input: {
  taskId: string;
  userId?: string;
  ticketId?: string | null;
  title?: string;
  description?: string;
  status?: string;
  category?: string;
  priority?: string;
  startTime?: Date | string;
  estimatedEndTime?: Date | string;
  estimatedDuration?: number;
  actualEndTime?: Date | string;
  actualDuration?: number;
  tags?: string[];
  transferToUserId?: string;
}): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      startTime: input.startTime instanceof Date ? input.startTime.toISOString() : input.startTime,
      estimatedEndTime: input.estimatedEndTime instanceof Date ? input.estimatedEndTime.toISOString() : input.estimatedEndTime,
      actualEndTime: input.actualEndTime instanceof Date ? input.actualEndTime.toISOString() : input.actualEndTime,
    }),
  });

  return mapApiTaskToTask(await parseTaskResponse(response));
}

export async function deleteTaskRequest(input: { taskId: string; userId?: string }): Promise<void> {
  const url = new URL('/api/tasks', window.location.origin);
  url.searchParams.set('taskId', input.taskId);
  if (input.userId) {
    url.searchParams.set('userId', input.userId);
  }

  const response = await fetch(url.toString(), { method: 'DELETE' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'task_delete_failed');
  }
}