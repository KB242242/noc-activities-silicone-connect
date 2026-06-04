import { sortTasksByPriority } from '@/features/app-shell/core/tasks/task-utils';
import { filterTasksForList, type TaskFilterValue } from '@/features/app-shell/components/tasks/utils/filterTasksForList';

type SelectableTask = {
  userId?: string;
  status: string;
  isOverdue?: boolean;
  priority: string;
  title: string;
  description?: string;
};

export function computeTaskStats<T extends SelectableTask>(tasks: T[], userId?: string) {
  return {
    pendingCount: tasks.filter((task) => task.status === 'pending' && task.userId === userId).length,
    inProgressCount: tasks.filter((task) => task.status === 'in_progress' && task.userId === userId).length,
    completedCount: tasks.filter((task) => task.status === 'completed' && task.userId === userId).length,
    lateCount: tasks.filter((task) => (task.status === 'late' || task.isOverdue) && task.userId === userId).length,
    onHoldCount: tasks.filter((task) => task.status === 'on_hold' && task.userId === userId).length,
  };
}

export function getDisplayedTasks<T extends SelectableTask>(params: {
  tasks: T[];
  taskFilter: TaskFilterValue;
  userId?: string;
  searchQuery: string;
}) {
  return sortTasksByPriority(
    filterTasksForList({
      tasks: params.tasks,
      taskFilter: params.taskFilter,
      userId: params.userId,
      searchQuery: params.searchQuery,
    }) as any
  ) as unknown as T[];
}
