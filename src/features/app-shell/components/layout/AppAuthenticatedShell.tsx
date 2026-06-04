'use client';

import { PasswordSecurityGuard } from '@/features/app-shell/components/security/PasswordSecurityGuard';
import { AppMainContentSection } from '@/features/app-shell/components/layout/AppMainContentSection';
import { AppSidebar } from '@/features/app-shell/components/layout/AppSidebar';
import { AppTopHeader } from '@/features/app-shell/components/layout/AppTopHeader';
import { AppShellDialogsSection } from '@/features/app-shell/components/dialogs/AppShellDialogsSection';

type AppAuthenticatedShellProps = any;

export function AppAuthenticatedShell(props: AppAuthenticatedShellProps) {
  const {
    user,
    securityDialogOpen,
    openSecurityDialog,
    handleLogout,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    handleNotificationClick,
    mounted,
    theme,
    setTheme,
    setProfileDialogOpen,
    openAvatarViewer,
    openEditProfileDialog,
    openShiftDialog,
    setRestDialogOpen,
    setSettingsDialogOpen,
    setCurrentTabSafely,
    sidebarPosition,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarWidth,
    isSidebarResizing,
    setSidebarPosition,
    startSidebarResize,
    currentTab,
    sidebarGroupOpen,
    setSidebarGroupOpen,
    conversations,
    messages,
    gedDocuments,
  } = props;

  return (
    <>
      <div className="min-h-screen bg-background">
        <PasswordSecurityGuard
          mustChangePassword={Boolean(user?.mustChangePassword)}
          securityDialogOpen={securityDialogOpen}
          onOpenSecurityDialog={openSecurityDialog}
          onLogout={handleLogout}
        />

        <AppTopHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          notificationsOpen={notificationsOpen}
          onNotificationsOpenChange={setNotificationsOpen}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          mounted={mounted}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          user={user}
          onOpenProfileDialog={() => setProfileDialogOpen(true)}
          onOpenAvatarViewer={openAvatarViewer}
          onOpenEditProfileDialog={openEditProfileDialog}
          onOpenShiftDialog={openShiftDialog}
          onOpenRestDialog={() => setRestDialogOpen(true)}
          onOpenSecurityDialog={openSecurityDialog}
          onOpenSettingsDialog={() => setSettingsDialogOpen(true)}
          onOpenAdminUsers={() => setCurrentTabSafely('admin_users')}
          onLogout={handleLogout}
        />

        <div className={`flex ${sidebarPosition === 'right' ? 'lg:flex-row-reverse' : ''}`}>
          <AppSidebar
            sidebarOpen={sidebarOpen}
            sidebarPosition={sidebarPosition}
            sidebarCollapsed={sidebarCollapsed}
            sidebarWidth={sidebarWidth}
            isSidebarResizing={isSidebarResizing}
            onToggleSidebarPosition={() => setSidebarPosition((current: string) => (current === 'left' ? 'right' : 'left'))}
            onToggleSidebarCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
            onStartSidebarResize={startSidebarResize}
            onCloseMobileSidebar={() => setSidebarOpen(false)}
            currentTab={currentTab}
            onSelectTab={setCurrentTabSafely}
            isNocGroupOpen={sidebarGroupOpen.noc}
            onToggleNocGroup={() =>
              setSidebarGroupOpen((prev: any) => ({
                ...prev,
                noc: !prev.noc,
              }))
            }
            conversations={conversations}
            messages={messages}
            gedDocuments={gedDocuments}
            user={user}
            onOpenRestDialog={() => setRestDialogOpen(true)}
          />

          <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-3.5rem)] overflow-auto">
            <AppMainContentSection {...props} />
          </main>
        </div>

        <AppShellDialogsSection {...props} />
      </div>
    </>
  );
}