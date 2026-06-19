import type { ComponentType } from 'react';

import { format } from 'date-fns';

import { AppTaskItemActions } from '@/features/app-shell/components/tasks/AppTaskItemActions';
import { AppTaskItemContent } from '@/features/app-shell/components/tasks/AppTaskItemContent';
import { AppTaskItemMeta } from '@/features/app-shell/components/tasks/AppTaskItemMeta';
import { AppTaskItemToggle } from '@/features/app-shell/components/tasks/AppTaskItemToggle';
import { AppTaskListItemRow } from '@/features/app-shell/components/tasks/AppTaskListItemRow';
import { getTaskItemClassName } from '@/features/app-shell/components/tasks/utils/getTaskItemClassName';

type TaskPriorityConfig = {
  label: string;
  bgColor: string;
  color: string;
};

type TaskStatusConfig = {
  label: string;
  bgColor: string;
  color: string;
};

type TaskCategoryConfig = {
  icon: ComponentType<{ className?: string }>;
};

type TaskListItem = {
  id: string;
  userId: string;
  linkedTicketId?: string;
  linkedTicketNumero?: string;
  linkedTicketObjet?: string;
  status: string;
  isOverdue?: boolean;
  title: string;
  priority: string;
  category: string;
  description?: string;
  tags: string[];
  alerts?: Array<{ isRead?: boolean; isDismissed?: boolean }>;
  startTime: Date;
  estimatedEndTime: Date;
  estimatedDuration: number;
};

function parseLinkedTicket(task: Pick<TaskListItem, 'tags' | 'linkedTicketNumero'>): { numero?: string; filteredTags: string[] } {
  if (task.linkedTicketNumero) {
    return {
      numero: task.linkedTicketNumero,
      filteredTags: task.tags.filter(
        (tag) => !tag.toLowerCase().startsWith('ticket_id:') && !tag.toLowerCase().startsWith('ticket_no:')
      ),
    };
  }

  const tags = task.tags;
  const ticketNumeroTag = tags.find((tag) => tag.toLowerCase().startsWith('ticket_no:'));
  return {
    numero: ticketNumeroTag ? ticketNumeroTag.split(':').slice(1).join(':').trim() : undefined,
    filteredTags: tags.filter(
      (tag) => !tag.toLowerCase().startsWith('ticket_id:') && !tag.toLowerCase().startsWith('ticket_no:')
    ),
  };
}

type AppTaskListItemsProps = {
  tasks: TaskListItem[];
  taskPriorities: Record<string, TaskPriorityConfig>;
  taskStatuses: Record<string, TaskStatusConfig>;
  taskCategories: Record<string, TaskCategoryConfig>;
  formatDuration: (minutes: number) => string;
  onToggleCompletion: (task: TaskListItem, checked: boolean) => void;
  onStart: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onTransfer: (task: TaskListItem) => void;
  onOpenDetails: (task: TaskListItem) => void;
  onDelete: (taskId: string) => void;
};

type GenericAppTaskListItemsProps<T extends TaskListItem> = Omit<
  AppTaskListItemsProps,
  'tasks' | 'onToggleCompletion' | 'onOpenDetails'
> & {
  tasks: T[];
  onToggleCompletion: (task: T, checked: boolean) => void;
  onOpenDetails: (task: T) => void;
};

export function AppTaskListItems<T extends TaskListItem>({
  tasks,
  taskPriorities,
  taskStatuses,
  taskCategories,
  formatDuration,
  onToggleCompletion,
  onStart,
  onPause,
  onResume,
  onTransfer,
  onOpenDetails,
  onDelete,
}: GenericAppTaskListItemsProps<T>) {
  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const priority = taskPriorities[task.priority];
        const status = taskStatuses[task.status];
        const category = taskCategories[task.category];
        const CategoryIcon = category?.icon;
        const linkedTicket = parseLinkedTicket(task);

        return (
          <AppTaskListItemRow
            key={task.id}
            id={task.id}
            index={index}
            className={getTaskItemClassName({ status: task.status, isOverdue: task.isOverdue })}
          >
            <AppTaskItemToggle
              checked={task.status === 'completed'}
              onToggle={(checked) => onToggleCompletion(task, checked)}
            />
            <AppTaskItemContent
              title={task.title}
              isCompleted={task.status === 'completed'}
              priorityLabel={priority?.label || task.priority}
              priorityClassName={`${priority?.bgColor || ''} ${priority?.color || ''}`.trim()}
              categoryIcon={CategoryIcon ? <CategoryIcon className="w-4 h-4" /> : null}
              description={task.description}
              meta={
                <AppTaskItemMeta
                  statusLabel={status?.label || task.status}
                  statusClassName={`${status?.bgColor || ''} ${status?.color || ''}`.trim()}
                  timeRangeLabel={`${format(task.startTime, 'HH:mm')} - ${format(task.estimatedEndTime, 'HH:mm')}`}
                  durationLabel={`⏱ ${formatDuration(task.estimatedDuration)}`}
                  tags={linkedTicket.filteredTags}
                  alertCount={task.alerts?.filter((alert) => !alert.isDismissed && !alert.isRead).length ?? task.alerts?.length ?? 0}
                  linkedTicketLabel={linkedTicket.numero}
                />
              }
            />
            <AppTaskItemActions
              status={task.status}
              onStart={() => onStart(task.id)}
              onPause={() => onPause(task.id)}
              onResume={() => onResume(task.id)}
              onTransfer={() => onTransfer(task)}
              onOpenDetails={() => onOpenDetails(task)}
              onDelete={() => onDelete(task.id)}
            />
          </AppTaskListItemRow>
        );
      })}
    </div>
  );
}
