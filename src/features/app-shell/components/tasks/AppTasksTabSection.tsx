import { motion } from 'framer-motion';
import type { Dispatch, SetStateAction } from 'react';

import { AppTasksTabContent } from '@/features/app-shell/components/tasks/AppTasksTabContent';
import { AppTaskCreateDialog } from '@/features/app-shell/components/tasks/dialogs/AppTaskCreateDialog';

type AppTasksTabSectionProps = {
  taskDialogOpen: boolean;
  setTaskDialogOpen: Dispatch<SetStateAction<boolean>>;
  newTask: any;
  setNewTask: any;
  taskPriorities: any;
  taskCategories: any;
  onCreateTask: () => void;
  stats: any;
  searchQuery: string;
  taskFilter: any;
  onSearchQueryChange: (value: string) => void;
  onTaskFilterChange: (value: any) => void;
  taskCount: number;
  displayedTasks: any[];
  taskStatuses: any;
  formatDuration: (value: number) => string;
  onToggleCompletion: any;
  onStart: any;
  onPause: any;
  onResume: any;
  onOpenDetails: any;
  onDelete: any;
  isPerformanceVisible: boolean;
  productivityRate: number;
  onTimeRate: number;
  tasksCompleted: number;
  tasksCreated: number;
  BadgeIcon: any;
  badgeLabel: string;
};

export function AppTasksTabSection({
  taskDialogOpen,
  setTaskDialogOpen,
  newTask,
  setNewTask,
  taskPriorities,
  taskCategories,
  onCreateTask,
  stats,
  searchQuery,
  taskFilter,
  onSearchQueryChange,
  onTaskFilterChange,
  taskCount,
  displayedTasks,
  taskStatuses,
  formatDuration,
  onToggleCompletion,
  onStart,
  onPause,
  onResume,
  onOpenDetails,
  onDelete,
  isPerformanceVisible,
  productivityRate,
  onTimeRate,
  tasksCompleted,
  tasksCreated,
  BadgeIcon,
  badgeLabel,
}: AppTasksTabSectionProps) {
  return (
    <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <AppTasksTabContent<any>
        headerActions={
          <AppTaskCreateDialog<any, any>
            taskDialogOpen={taskDialogOpen}
            setTaskDialogOpen={setTaskDialogOpen}
            newTask={newTask as any}
            setNewTask={setNewTask as any}
            taskPriorities={taskPriorities as any}
            taskCategories={taskCategories as any}
            onCreateTask={onCreateTask}
          />
        }
        stats={stats as any}
        searchQuery={searchQuery}
        taskFilter={taskFilter}
        onSearchQueryChange={onSearchQueryChange}
        onTaskFilterChange={onTaskFilterChange}
        taskCount={taskCount}
        displayedTasks={displayedTasks as any}
        taskPriorities={taskPriorities as any}
        taskStatuses={taskStatuses as any}
        taskCategories={taskCategories as any}
        formatDuration={formatDuration}
        onToggleCompletion={onToggleCompletion}
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
        onOpenDetails={onOpenDetails}
        onDelete={onDelete}
        onOpenCreateTask={() => setTaskDialogOpen(true)}
        isPerformanceVisible={isPerformanceVisible}
        productivityRate={productivityRate}
        onTimeRate={onTimeRate}
        tasksCompleted={tasksCompleted}
        tasksCreated={tasksCreated}
        BadgeIcon={BadgeIcon as any}
        badgeLabel={badgeLabel}
      />
    </motion.div>
  );
}
