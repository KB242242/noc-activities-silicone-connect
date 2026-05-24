type GetTaskItemClassNameParams = {
  status: string;
  isOverdue?: boolean;
};

export function getTaskItemClassName({ status, isOverdue }: GetTaskItemClassNameParams): string {
  const baseClassName = 'flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md';

  if (isOverdue) return `${baseClassName} border-red-200 bg-red-50/50 dark:bg-red-900/10`;
  if (status === 'completed') return `${baseClassName} border-green-200 bg-green-50/50 dark:bg-green-900/10`;

  return `${baseClassName} border-slate-200 dark:border-slate-700`;
}
