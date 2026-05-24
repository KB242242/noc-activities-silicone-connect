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
      />
    </motion.div>
  );
}
