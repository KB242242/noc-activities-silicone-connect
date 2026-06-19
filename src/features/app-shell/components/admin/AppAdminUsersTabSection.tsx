import { motion } from 'framer-motion';

import { AppAdminUsersTabContent } from '@/features/app-shell/components/admin/AppAdminUsersTabContent';

type AppAdminUsersTabSectionProps = any;

export function AppAdminUsersTabSection(props: AppAdminUsersTabSectionProps) {
  return (
    <motion.div key="admin_users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
      <AppAdminUsersTabContent
        isUsersSyncing={props.isUsersSyncing}
        syncUsersFromApi={props.syncUsersFromApi}
        setCurrentTabSafely={props.setCurrentTabSafely}
        openCreateUserDialog={props.openCreateUserDialog}
        userSearchQuery={props.userSearchQuery}
        setUserSearchQuery={props.setUserSearchQuery}
        roleFilter={props.roleFilter}
        setRoleFilter={props.setRoleFilter}
        filteredUsers={props.filteredUsers}
        usersActionInProgress={props.usersActionInProgress}
        ROLE_CONFIG={props.ROLE_CONFIG}
        openEditUserDialog={props.openEditUserDialog}
        handleChangeUserRole={props.handleChangeUserRole}
        user={props.user}
        handleToggleBlockUser={props.handleToggleBlockUser}
        setSelectedUser={props.setSelectedUser}
        setEditPassword={props.setEditPassword}
        setConfirmPassword={props.setConfirmPassword}
        setSecurityDialogOpen={props.setSecurityDialogOpen}
        handleDeleteUser={props.handleDeleteUser}
        isSuperAdmin={props.isSuperAdmin}
        auditLogs={props.auditLogs}
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
