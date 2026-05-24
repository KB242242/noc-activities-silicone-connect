export type TaskFilterValue = 'all' | 'my' | 'pending' | 'late' | 'critical';

type FilterableTask = {
  userId?: string;
  status: string;
  isOverdue?: boolean;
  priority?: string;
  title: string;
  description?: string;
};

type FilterTasksForListParams = {
  tasks: FilterableTask[];
  taskFilter: TaskFilterValue;
  userId?: string;
  searchQuery: string;
};

export function filterTasksForList({
  tasks,
  taskFilter,
  userId,
  searchQuery,
}: FilterTasksForListParams): FilterableTask[] {
  const query = searchQuery.toLowerCase();

  return tasks
    .filter((task) => {
      if (taskFilter === 'my') return task.userId === userId;
      if (taskFilter === 'pending') return task.status === 'pending';
      if (taskFilter === 'late') return task.status === 'late' || Boolean(task.isOverdue);
      if (taskFilter === 'critical') return task.priority === 'critical';

      return true;
    })
    .filter((task) => {
      const title = task.title.toLowerCase();
      const description = (task.description || '').toLowerCase();

      return title.includes(query) || description.includes(query);
    });
}
