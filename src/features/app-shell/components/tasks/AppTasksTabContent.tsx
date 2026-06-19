import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';

import { AppTaskListItems } from '@/features/app-shell/components/tasks/AppTaskListItems';
import { AppTasksEmptyState } from '@/features/app-shell/components/tasks/AppTasksEmptyState';
import { AppTasksFiltersCard } from '@/features/app-shell/components/tasks/AppTasksFiltersCard';
import { AppTasksGanttView } from '@/features/app-shell/components/tasks/AppTasksGanttView';
import { AppTasksHeader } from '@/features/app-shell/components/tasks/AppTasksHeader';
import { AppTasksListCard } from '@/features/app-shell/components/tasks/AppTasksListCard';
import { AppTasksPerformanceSummaryCard } from '@/features/app-shell/components/tasks/AppTasksPerformanceSummaryCard';
import { AppTasksStatsCards } from '@/features/app-shell/components/tasks/AppTasksStatsCards';
import { Button } from '@/components/ui/button';

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

type TaskTabItem = {
  id: string;
  userId: string;
  userName?: string;
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

type AppTasksTabStats = {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  lateCount: number;
  onHoldCount: number;
};

type AppTasksTabContentProps<T extends TaskTabItem> = {
  headerActions: ReactNode;
  stats: AppTasksTabStats;
  searchQuery: string;
  taskFilter: string;
  onSearchQueryChange: (value: string) => void;
  onTaskFilterChange: (value: string) => void;
  taskCount: number;
  displayedTasks: T[];
  taskPriorities: Record<string, TaskPriorityConfig>;
  taskStatuses: Record<string, TaskStatusConfig>;
  taskCategories: Record<string, TaskCategoryConfig>;
  formatDuration: (minutes: number) => string;
  onToggleCompletion: (task: T, checked: boolean) => void;
  onStart: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onTransfer: (task: T) => void;
  onUpdateSchedule: (taskId: string, startTime: Date, estimatedEndTime: Date) => Promise<void> | void;
  onLinkTaskToTicket: (task: T, ticket: { id: string; numero: string; objet: string }) => Promise<void> | void;
  onQuickUpdateTask: (
    taskId: string,
    updates: { title?: string; description?: string; priority?: string; status?: string; tags?: string[] },
    successMessage?: string
  ) => Promise<void> | void;
  onOpenDetails: (task: T) => void;
  onDelete: (taskId: string) => void;
  onOpenCreateTask: () => void;
  onOpenCreateTaskAt: (startTime: Date) => void;
  isPerformanceVisible: boolean;
  productivityRate: number;
  onTimeRate: number;
  tasksCompleted: number;
  tasksCreated: number;
  badgeLabel?: string;
  BadgeIcon?: ComponentType<{ className?: string }>;
};

export function AppTasksTabContent<T extends TaskTabItem>({
  headerActions,
  stats,
  searchQuery,
  taskFilter,
  onSearchQueryChange,
  onTaskFilterChange,
  taskCount,
  displayedTasks,
  taskPriorities,
  taskStatuses,
  taskCategories,
  formatDuration,
  onToggleCompletion,
  onStart,
  onPause,
  onResume,
  onTransfer,
  onUpdateSchedule,
  onLinkTaskToTicket,
  onQuickUpdateTask,
  onOpenDetails,
  onDelete,
  onOpenCreateTask,
  onOpenCreateTaskAt,
  isPerformanceVisible,
  productivityRate,
  onTimeRate,
  tasksCompleted,
  tasksCreated,
  badgeLabel,
  BadgeIcon,
}: AppTasksTabContentProps<T>) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('gantt');

  return (
    <>
      <AppTasksHeader actions={headerActions} />

      <AppTasksStatsCards
        pendingCount={stats.pendingCount}
        inProgressCount={stats.inProgressCount}
        completedCount={stats.completedCount}
        lateCount={stats.lateCount}
        onHoldCount={stats.onHoldCount}
      />

      <AppTasksPerformanceSummaryCard
        isVisible={isPerformanceVisible}
        productivityRate={productivityRate}
        onTimeRate={onTimeRate}
        tasksCompleted={tasksCompleted}
        tasksCreated={tasksCreated}
        BadgeIcon={BadgeIcon}
        badgeLabel={badgeLabel}
      />

      <AppTasksFiltersCard
        searchQuery={searchQuery}
        taskFilter={taskFilter}
        onSearchQueryChange={onSearchQueryChange}
        onTaskFilterChange={onTaskFilterChange}
        compactSearch
        extraControls={
          <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              Liste
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'gantt' ? 'default' : 'ghost'}
              className="rounded-l-none border-l border-slate-200 dark:border-slate-700"
              onClick={() => setViewMode('gantt')}
            >
              Gantt
            </Button>
          </div>
        }
      />

      {viewMode === 'list' ? (
        <AppTasksListCard taskCount={taskCount}>
          {taskCount === 0 ? (
            <AppTasksEmptyState onCreateTask={onOpenCreateTask} />
          ) : (
            <AppTaskListItems<T>
              tasks={displayedTasks}
              taskPriorities={taskPriorities}
              taskStatuses={taskStatuses}
              taskCategories={taskCategories}
              formatDuration={formatDuration}
              onToggleCompletion={onToggleCompletion}
              onStart={onStart}
              onPause={onPause}
              onResume={onResume}
              onTransfer={onTransfer}
              onOpenDetails={onOpenDetails}
              onDelete={onDelete}
            />
          )}
        </AppTasksListCard>
      ) : (
        <AppTasksGanttView<T>
          tasks={displayedTasks}
          onOpenDetails={onOpenDetails}
          onUpdateSchedule={onUpdateSchedule}
          onLinkTicket={onLinkTaskToTicket}
          onQuickUpdateTask={onQuickUpdateTask}
          onCreateTaskAt={onOpenCreateTaskAt}
          onDeleteTask={onDelete}
        />
      )}
    </>
  );
}
