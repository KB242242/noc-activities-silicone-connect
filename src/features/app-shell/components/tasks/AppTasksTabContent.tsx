import type { ComponentType, ReactNode } from 'react';

import { AppTaskListItems } from '@/features/app-shell/components/tasks/AppTaskListItems';
import { AppTasksEmptyState } from '@/features/app-shell/components/tasks/AppTasksEmptyState';
import { AppTasksFiltersCard } from '@/features/app-shell/components/tasks/AppTasksFiltersCard';
import { AppTasksHeader } from '@/features/app-shell/components/tasks/AppTasksHeader';
import { AppTasksListCard } from '@/features/app-shell/components/tasks/AppTasksListCard';
import { AppTasksPerformanceSummaryCard } from '@/features/app-shell/components/tasks/AppTasksPerformanceSummaryCard';
import { AppTasksStatsCards } from '@/features/app-shell/components/tasks/AppTasksStatsCards';

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
  status: string;
  isOverdue?: boolean;
  title: string;
  priority: string;
  category: string;
  description?: string;
  tags: string[];
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
  onOpenDetails: (task: T) => void;
  onDelete: (taskId: string) => void;
  onOpenCreateTask: () => void;
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
  onOpenDetails,
  onDelete,
  onOpenCreateTask,
  isPerformanceVisible,
  productivityRate,
  onTimeRate,
  tasksCompleted,
  tasksCreated,
  badgeLabel,
  BadgeIcon,
}: AppTasksTabContentProps<T>) {
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

      <AppTasksFiltersCard
        searchQuery={searchQuery}
        taskFilter={taskFilter}
        onSearchQueryChange={onSearchQueryChange}
        onTaskFilterChange={onTaskFilterChange}
      />

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
            onOpenDetails={onOpenDetails}
            onDelete={onDelete}
          />
        )}
      </AppTasksListCard>

      <AppTasksPerformanceSummaryCard
        isVisible={isPerformanceVisible}
        productivityRate={productivityRate}
        onTimeRate={onTimeRate}
        tasksCompleted={tasksCompleted}
        tasksCreated={tasksCreated}
        BadgeIcon={BadgeIcon}
        badgeLabel={badgeLabel}
      />
    </>
  );
}
