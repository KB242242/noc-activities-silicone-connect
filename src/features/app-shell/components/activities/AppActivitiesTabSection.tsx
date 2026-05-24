import { motion } from 'framer-motion';

import { AppActivitiesHeaderCreateDialog } from '@/features/app-shell/components/activities/AppActivitiesHeaderCreateDialog';
import { AppActivitiesHistoryCard } from '@/features/app-shell/components/activities/AppActivitiesHistoryCard';

type AppActivitiesTabSectionProps = {
  activityDialogOpen: boolean;
  onActivityDialogOpenChange: (open: boolean) => void;
  newActivity: any;
  typeOptions: any;
  onCategoryChange: (category: any) => void;
  onTypeChange: (type: any) => void;
  onDescriptionChange: (description: any) => void;
  onSave: () => void;
  activities: any[];
  accentColor: string;
};

export function AppActivitiesTabSection({
  activityDialogOpen,
  onActivityDialogOpenChange,
  newActivity,
  typeOptions,
  onCategoryChange,
  onTypeChange,
  onDescriptionChange,
  onSave,
  activities,
  accentColor,
}: AppActivitiesTabSectionProps) {
  return (
    <motion.div key="activities" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <AppActivitiesHeaderCreateDialog
        activityDialogOpen={activityDialogOpen}
        onActivityDialogOpenChange={onActivityDialogOpenChange}
        newActivity={newActivity as any}
        typeOptions={typeOptions}
        onCategoryChange={onCategoryChange}
        onTypeChange={onTypeChange}
        onDescriptionChange={onDescriptionChange}
        onSave={onSave}
      />

      <AppActivitiesHistoryCard<any>
        activities={activities as any}
        accentColor={accentColor}
      />
    </motion.div>
  );
}
