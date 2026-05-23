import { ALERT_THRESHOLDS } from '@/features/app-shell/activity-constants';
import type {
  AgentPerformance,
  AlertType,
  Task,
  TaskAlert,
  TaskPriority,
  TaskStatus,
} from '@/features/app-shell/types';
import { generateId } from '@/features/app-shell/utils';

export function createNewTask(
  userId: string,
  userName: string,
  taskData: Partial<Task>,
  shiftName?: string
): Task {
  const now = new Date();
  const startTime = taskData.startTime || now;
  const estimatedDuration = taskData.estimatedDuration || 60;
  const estimatedEndTime = new Date(startTime.getTime() + estimatedDuration * 60000);

  return {
    id: generateId(),
    userId,
    userName,
    title: taskData.title || 'Nouvelle tâche',
    description: taskData.description || '',
    status: 'pending',
    category: taskData.category || 'other',
    priority: taskData.priority || 'medium',
    shiftName,
    startTime,
    estimatedEndTime,
    estimatedDuration,
    comments: [],
    alerts: [],
    history: [
      {
        id: generateId(),
        taskId: '',
        userId,
        userName,
        action: 'created',
        timestamp: now,
      },
    ],
    tags: taskData.tags || [],
    isOverdue: false,
    isNotified: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  return new Date() > task.estimatedEndTime;
}

export function calculateActualDuration(task: Task): number | undefined {
  if (!task.completedAt || !task.startTime) return undefined;
  return Math.round((task.completedAt.getTime() - task.startTime.getTime()) / 60000);
}

export function generateTaskAlert(task: Task, triggerType: TaskAlert['triggeredBy']): TaskAlert {
  const messages: Record<TaskAlert['triggeredBy'], string> = {
    time_limit: `La tâche "${task.title}" approche de sa limite de temps`,
    overdue: `La tâche "${task.title}" a dépassé son temps estimé`,
    critical_not_started: `La tâche critique "${task.title}" n'a pas encore commencé`,
    suspended_too_long: `La tâche "${task.title}" est suspendue depuis trop longtemps`,
    no_task_created: 'Aucune tâche créée depuis le début du shift',
    too_many_pending: 'Trop de tâches en attente avant la fin du shift',
  };

  const types: Record<TaskAlert['triggeredBy'], AlertType> = {
    time_limit: 'warning',
    overdue: 'critical',
    critical_not_started: 'critical',
    suspended_too_long: 'warning',
    no_task_created: 'warning',
    too_many_pending: 'info',
  };

  return {
    id: generateId(),
    taskId: task.id,
    type: types[triggerType],
    message: messages[triggerType],
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
    triggeredBy: triggerType,
  };
}

export function calculateAgentPerformance(
  tasks: Task[],
  userId: string,
  userName: string,
  period: 'daily' | 'weekly' | 'monthly',
  inactivityMinutes: number = 0,
  shiftName?: string
): AgentPerformance {
  const userTasks = tasks.filter((task) => task.userId === userId);
  const completed = userTasks.filter((task) => task.status === 'completed');
  const late = userTasks.filter((task) => task.status === 'late' || task.isOverdue);
  const cancelled = userTasks.filter((task) => task.status === 'cancelled');

  const avgCompletionTime = completed.length > 0
    ? completed.reduce((sum, task) => sum + (task.actualDuration || task.estimatedDuration), 0) / completed.length
    : 0;

  const productivityRate = userTasks.length > 0
    ? Math.round((completed.length / userTasks.length) * 100)
    : 0;

  const onTimeRate = completed.length > 0
    ? Math.round(((completed.length - late.length) / completed.length) * 100)
    : 0;

  const reliabilityScore = Math.max(
    0,
    Math.min(100, productivityRate * 0.4 + onTimeRate * 0.3 + Math.max(0, 100 - inactivityMinutes / 2) * 0.3)
  );

  let badge: AgentPerformance['badge'] = 'needs_attention';
  if (reliabilityScore >= 90) badge = 'exemplary';
  else if (reliabilityScore >= 75) badge = 'reliable';
  else if (reliabilityScore >= 50) badge = 'improving';

  return {
    userId,
    userName,
    shiftName,
    period,
    tasksCreated: userTasks.length,
    tasksCompleted: completed.length,
    tasksLate: late.length,
    tasksCancelled: cancelled.length,
    avgCompletionTime,
    inactivityMinutes,
    productivityRate,
    onTimeRate,
    reliabilityScore,
    badge,
  };
}

export function checkInactivity(
  lastActivityTime: Date,
  thresholdMinutes: number = ALERT_THRESHOLDS.inactivityMinutes
): { isInactive: boolean; inactiveMinutes: number } {
  const now = new Date();
  const inactiveMs = now.getTime() - lastActivityTime.getTime();
  const inactiveMinutes = Math.floor(inactiveMs / 60000);

  return {
    isInactive: inactiveMinutes >= thresholdMinutes,
    inactiveMinutes,
  };
}

export function sortTasksByPriority(taskList: Task[]): Task[] {
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...taskList].sort((left, right) => {
    const statusOrder: Record<TaskStatus, number> = {
      in_progress: 0,
      pending: 1,
      on_hold: 2,
      late: 3,
      completed: 4,
      cancelled: 5,
    };
    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status];
    }
    return priorityOrder[left.priority] - priorityOrder[right.priority];
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

export function getGanttTaskColor(task: Task): string {
  if (task.isOverdue || task.status === 'late') return '#EF4444';
  if (task.status === 'completed') return '#22C55E';
  if (task.status === 'in_progress') return '#3B82F6';
  if (task.status === 'on_hold') return '#F97316';
  if (task.status === 'pending') return '#EAB308';
  return '#6B7280';
}
