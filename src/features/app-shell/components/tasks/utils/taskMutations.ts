type MutableTask = {
  id: string;
  status: string;
  completedAt?: Date;
  actualDuration?: number;
};

export function updateTaskStatus<T extends MutableTask>(tasks: T[], taskId: string, status: string): T[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
}

export function removeTaskById<T extends MutableTask>(tasks: T[], taskId: string): T[] {
  return tasks.filter((task) => task.id !== taskId);
}

export function applyTaskCompletionToggle<T extends MutableTask>(
  tasks: T[],
  taskId: string,
  checked: boolean,
  getActualDuration: (task: T) => number | undefined
): T[] {
  return tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: checked ? 'completed' : 'pending',
          completedAt: checked ? new Date() : undefined,
          actualDuration: checked ? getActualDuration(task) : undefined,
        }
      : task
  );
}
