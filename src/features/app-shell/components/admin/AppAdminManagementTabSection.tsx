import { motion } from 'framer-motion';

import { AppAdminTabContent } from '@/features/app-shell/components/admin/AppAdminTabContent';

type AppAdminManagementTabSectionProps = any;

export function AppAdminManagementTabSection(props: AppAdminManagementTabSectionProps) {
  return (
    <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <AppAdminTabContent
        requesterId={props.requesterId}
        isUsersSyncing={props.isUsersSyncing}
        syncUsersFromApi={props.syncUsersFromApi}
        setCurrentTabSafely={props.setCurrentTabSafely}
        ticketAdminSettings={props.ticketAdminSettings}
        setTicketAdminSettings={props.setTicketAdminSettings}
        ticketAdminSettingsLoading={props.ticketAdminSettingsLoading}
        ticketAdminSettingsSaving={props.ticketAdminSettingsSaving}
        ticketAdminEmailsInput={props.ticketAdminEmailsInput}
        setTicketAdminEmailsInput={props.setTicketAdminEmailsInput}
        loadTicketAdminSettings={props.loadTicketAdminSettings}
        saveTicketAdminSettings={props.saveTicketAdminSettings}
        TICKET_ADMIN_CATEGORY_KEYS={props.TICKET_ADMIN_CATEGORY_KEYS}
        SECTION_LABELS={props.SECTION_LABELS}
        sectionAccess={props.sectionAccess}
        setSectionAccess={props.setSectionAccess}
        ALERT_TYPE_CONFIG={props.ALERT_TYPE_CONFIG}
        SHIFTS_DATA={props.SHIFTS_DATA}
        SHIFT_CYCLE_START={props.SHIFT_CYCLE_START}
        getShiftColor={props.getShiftColor}
        allUsers={props.allUsers}
        assignUserToShift={props.assignUserToShift}
        shiftAssignmentBusyUserId={props.shiftAssignmentBusyUserId}
        planningSettings={props.planningSettings}
        setPlanningSettings={props.setPlanningSettings}
        planningSettingsLoading={props.planningSettingsLoading}
        planningSettingsSaving={props.planningSettingsSaving}
        loadPlanningSettings={props.loadPlanningSettings}
        savePlanningSettings={props.savePlanningSettings}
        availablePlanningRoles={props.availablePlanningRoles}
      />
    </motion.div>
  );
}
