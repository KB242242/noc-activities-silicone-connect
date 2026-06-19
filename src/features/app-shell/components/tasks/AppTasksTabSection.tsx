import { motion } from 'framer-motion';
import { useState, type Dispatch, type SetStateAction } from 'react';

import { AppTasksTabContent } from '@/features/app-shell/components/tasks/AppTasksTabContent';
import { AppTaskCreateDialog } from '@/features/app-shell/components/tasks/dialogs/AppTaskCreateDialog';
import { AppTaskTransferDialog } from '@/features/app-shell/components/tasks/dialogs/AppTaskTransferDialog';

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
  onTransfer: any;
  onUpdateSchedule: any;
  onLinkTaskToTicket: any;
  onQuickUpdateTask: any;
  onOpenDetails: any;
  onDelete: any;
  allUsers: any[];
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
  onTransfer,
  onUpdateSchedule,
  onLinkTaskToTicket,
  onQuickUpdateTask,
  onOpenDetails,
  onDelete,
  allUsers,
  isPerformanceVisible,
  productivityRate,
  onTimeRate,
  tasksCompleted,
  tasksCreated,
  BadgeIcon,
  badgeLabel,
}: AppTasksTabSectionProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [taskToTransfer, setTaskToTransfer] = useState<any | null>(null);

  const handleOpenTransferDialog = (task: any) => {
    setTaskToTransfer(task);
    setTransferDialogOpen(true);
  };

  const handleConfirmTransfer = async (targetUserId: string) => {
    if (!taskToTransfer) return;
    await onTransfer(taskToTransfer.id, targetUserId);
    setTransferDialogOpen(false);
    setTaskToTransfer(null);
  };

  const handleOpenCreateTaskAt = (startTime: Date) => {
    setNewTask((current: any) => ({
      ...current,
      startTime,
    }));
    setTaskDialogOpen(true);
  };

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
        onTransfer={handleOpenTransferDialog}
        onUpdateSchedule={onUpdateSchedule}
        onLinkTaskToTicket={onLinkTaskToTicket}
        onQuickUpdateTask={onQuickUpdateTask}
        onOpenDetails={onOpenDetails}
        onDelete={onDelete}
        onOpenCreateTask={() => setTaskDialogOpen(true)}
        onOpenCreateTaskAt={handleOpenCreateTaskAt}
        isPerformanceVisible={isPerformanceVisible}
        productivityRate={productivityRate}
        onTimeRate={onTimeRate}
        tasksCompleted={tasksCompleted}
        tasksCreated={tasksCreated}
        BadgeIcon={BadgeIcon as any}
        badgeLabel={badgeLabel}
      />
      <AppTaskTransferDialog
        open={transferDialogOpen}
        task={taskToTransfer}
        users={allUsers as any[]}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleConfirmTransfer}
      />
    </motion.div>
  );
}
