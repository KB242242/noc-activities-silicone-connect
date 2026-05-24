'use client';

import { AnimatePresence } from 'framer-motion';
import { addMonths, subMonths } from 'date-fns';

import { toast } from '@/lib/toast';
import { AppActivitiesTabSection } from '@/features/app-shell/components/activities/AppActivitiesTabSection';
import { AppAdminManagementTabSection } from '@/features/app-shell/components/admin/AppAdminManagementTabSection';
import { AppAdminUsersTabSection } from '@/features/app-shell/components/admin/AppAdminUsersTabSection';
import { AppDashboardPanel } from '@/features/app-shell/components/AppDashboardPanel';
import { AppEditTicketDialogSection } from '@/features/app-shell/components/tickets/AppEditTicketDialogSection';
import { AppEmailTabSection } from '@/features/app-shell/components/email/AppEmailTabSection';
import { AppLinksPanel } from '@/features/app-shell/components/AppLinksPanel';
import { AppMessagerieTabSection } from '@/features/app-shell/components/email/AppMessagerieTabSection';
import { AppNocTabContent } from '@/features/app-shell/components/noc/AppNocTabContent';
import { AppOvertimePanel } from '@/features/app-shell/components/AppOvertimePanel';
import { AppPlanningPanel } from '@/features/app-shell/components/AppPlanningPanel';
import { AppSupervisionTabContent } from '@/features/app-shell/components/supervision/AppSupervisionTabContent';
import { AppTasksTabSection } from '@/features/app-shell/components/tasks/AppTasksTabSection';
import { AppTicketsTabSection } from '@/features/app-shell/components/tickets/AppTicketsTabSection';

type AppMainContentSectionProps = any;

export function AppMainContentSection(props: AppMainContentSectionProps) {
  const {
    currentTab,
    user,
    userRestInfo,
    tasks,
    currentMonth,
    setCurrentMonth,
    planning,
    generatePlanningPDF,
    overtimeMonth,
    setOvertimeMonth,
    generateOvertimePDF,
    openAvatarViewer,
    setNewConversationOpen,
    setCreateGroupOpen,
    chatSearchQuery,
    setChatSearchQuery,
    statusList,
    usersDirectory,
    setMyStatusesOpen,
    setCreateStatusOpen,
    setViewingUserStatuses,
    setViewingStatusIndex,
    setViewingStatus,
    setStatusViewOpen,
    setStatusList,
    conversationFilter,
    setConversationFilter,
    conversations,
    selectedConversation,
    userPresence,
    announcementAvatar,
    handleConversationSelect,
    customBackgroundImage,
    typingIndicators,
    messageSearchOpen,
    setMessageSearchOpen,
    setBackgroundSettingsOpen,
    setConversations,
    setSelectedConversation,
    startOutgoingCall,
    openConversationAvatarUploader,
    chatMessages,
    chatSearchMessageQuery,
    setChatSearchMessageQuery,
    searchResults,
    setSearchResults,
    currentSearchIndex,
    setCurrentSearchIndex,
    messageContainerRef,
    setShowScrollToBottom,
    pinnedMessages,
    playingMessageId,
    audioProgress,
    audioRef,
    setPlayingMessageId,
    setAudioProgress,
    setChatImagePreview,
    setChatImageZoom,
    selectedChatMessages,
    isSelectionMode,
    setSelectedChatMessages,
    setContextMenuMessage,
    setContextMenuPosition,
    setShowContextMenu,
    setReplyingTo,
    liveReactions,
    messageEndRef,
    showScrollToBottom,
    showContextMenu,
    contextMenuMessage,
    contextMenuPosition,
    setChatMessages,
    setEditingMessage,
    setEditMessageContent,
    setEditMessageDialogOpen,
    updateChatMessage,
    setPinnedMessages,
    showFormattingToolbar,
    currentFormatting,
    setCurrentFormatting,
    replyingTo,
    attachmentPreview,
    setAttachmentPreview,
    recentEmojis,
    setNewMessage,
    registerRecentEmoji,
    broadcastLiveReaction,
    theme,
    isCompactEmojiLayout,
    showEmojiPicker,
    setShowEmojiPicker,
    showLiveReactionPicker,
    setShowLiveReactionPicker,
    newMessage,
    showMentionSuggestions,
    setShowMentionSuggestions,
    mentionQuery,
    setMentionQuery,
    setMentionedUsers,
    broadcastTypingStatus,
    typingStopTimeoutRef,
    sendChatMessage,
    recordingTime,
    setLastReplyTo,
    playMessageSendSound,
    setSimulatedTyping,
    isRecording,
    setIsRecording,
    setRecordingTime,
    mediaRecorderRef,
    audioChunksRef,
    isAnnouncementsConversation,
    editMessageDialogOpen,
    editMessageContent,
    handleSaveEditedMessage,
    chatImagePreview,
    chatImageZoom,
    createGroupOpen,
    newGroupName,
    setNewGroupName,
    newGroupDescription,
    setNewGroupDescription,
    selectedMembers,
    setSelectedMembers,
    createConversationInDb,
    incomingCall,
    activeCall,
    callState,
    handleIncomingCallAction,
    setConferenceEnabled,
    setHeldCall,
    callParticipants,
    setCallParticipants,
    addNotification,
    callDialogOpen,
    setCallDialogOpen,
    setActiveCall,
    setCallState,
    callTimer,
    setCallTimer,
    setLiveReactions,
    setAddParticipantsOpen,
    isCallMuted,
    setIsCallMuted,
    isCallSpeakerOn,
    setIsCallSpeakerOn,
    showCallReactionPicker,
    setShowCallReactionPicker,
    callTimeoutRef,
    addParticipantsOpen,
    newConversationOpen,
    newConversationSearch,
    setNewConversationSearch,
    getShiftColor,
    resetConversationUnreadCount,
    backgroundSettingsOpen,
    soundEnabled,
    setSoundEnabled,
    soundOnSend,
    setSoundOnSend,
    soundOnReceive,
    setSoundOnReceive,
    soundOnNotification,
    setSoundOnNotification,
    handleSetBackground,
    profilePhotoDialogOpen,
    setProfilePhotoDialogOpen,
    tempProfilePhoto,
    setTempProfilePhoto,
    clearTempAvatarObjectUrl,
    profileCrop,
    setProfileCrop,
    profileZoom,
    setProfileZoom,
    setProfileCroppedAreaPixels,
    handleAvatarFileSelection,
    handleSaveCroppedPhoto,
    createStatusOpen,
    statusMediaPreview,
    setStatusMediaPreview,
    statusMediaType,
    setStatusMediaType,
    statusCaption,
    setStatusCaption,
    statusBlockedContacts,
    setStatusBlockedContacts,
    handlePublishStatus,
    myStatusesOpen,
    statusViewOpen,
    viewingStatus,
    viewingStatusIndex,
    viewingUserStatuses,
    showStatusDetails,
    setShowStatusDetails,
    taskDialogOpen,
    setTaskDialogOpen,
    newTask,
    setNewTask,
    TASK_PRIORITIES,
    TASK_CATEGORIES,
    handleCreateTask,
    tasksStats,
    searchQuery,
    taskFilter,
    setSearchQuery,
    setTaskFilter,
    nocTasks,
    displayedTasks,
    TASK_STATUSES,
    formatDuration,
    handleToggleTaskCompletion,
    handleStartTask,
    handlePauseTask,
    handleResumeTask,
    handleOpenTaskDetails,
    handleDeleteTask,
    dailyTaskPerformance,
    dailyTaskBadgeConfig,
    activityDialogOpen,
    setActivityDialogOpen,
    newActivity,
    setNewActivity,
    ACTIVITY_TYPES,
    activities,
    setActivities,
    showArchivedTickets,
    quickLocalityDialogOpen,
    setQuickLocalityDialogOpen,
    setQuickLocalityDraft,
    DEFAULT_TICKET_LOCALITY_DRAFT,
    quickLocalityDraft,
    quickLocalityTab,
    setQuickLocalityTab,
    managedLocalitySearch,
    setManagedLocalitySearch,
    selectedManagedLocalityId,
    handleSelectManagedLocality,
    filteredManagedLocalities,
    managedLocalityName,
    setManagedLocalityName,
    managedLocalityDraft,
    setManagedLocalityDraft,
    ticketCongoDepartments,
    isCreatingLocality,
    isDeletingLocality,
    isUpdatingLocality,
    handleQuickCreateLocality,
    handleDeleteManagedLocality,
    handleUpdateManagedLocality,
    ticketViewMode,
    ticketSiteOptions,
    ticketLocalityOptions,
    ticketTechnicianOptions,
    setShowArchivedTickets,
    setShowDeletedTickets,
    setTicketSearchQuery,
    setTicketStatusFilter,
    setTicketPriorityFilter,
    setTicketSiteFilter,
    setTicketLocaliteFilter,
    setTicketTechnicienFilter,
    loadTicketsModuleData,
    setTicketViewMode,
    upsertLocalityOption,
    mapApiTicketToLegacy,
    setTickets,
    ticketSearchQuery,
    ticketStatusFilter,
    ticketPriorityFilter,
    ticketSiteFilter,
    ticketLocaliteFilter,
    ticketTechnicienFilter,
    visibleTickets,
    currentStorageTickets,
    showDeletedTickets,
    ticketStatusFilterOptions,
    ticketPriorityFilterOptions,
    TICKET_STATUSES,
    TICKET_PRIORITIES,
    TICKET_CATEGORIES,
    showTrashContextMenu,
    trashContextTicket,
    trashContextMenuPosition,
    deleteTicketDialogOpen,
    deleteTicketPermanent,
    deleteTicketTarget,
    isTicketActionBusy,
    router,
    openTicketDetailPage,
    openTrashTicketContextMenu,
    handleRestoreTicket,
    requestDeleteTicket,
    setEditingTicket,
    setEditTicketOpen,
    setDeleteTicketDialogOpen,
    setDeleteTicketTarget,
    setDeleteTicketPermanent,
    handleDeleteTicket,
    archiveYears,
    archiveYearFilter,
    archiveYearBuckets,
    archiveReport,
    setArchiveYearFilter,
    tickets,
    handleUnarchiveTicket,
    ticketStatusArchiveOptions,
    ticketPriorityArchiveOptions,
    editTicketOpen,
    editingTicket,
    editTicketLocalityDraft,
    setEditTicketLocalityDraft,
    isEditLocalityCreationEnabled,
    setIsEditLocalityCreationEnabled,
    createTicketLocality,
    resolveTicketSiteSelection,
    resolveTicketTechnicians,
    updateTicketDetailsRequest,
    mapLegacyTicketStatusToApi,
    mapLegacyTicketPriorityToApi,
    splitTicketValues,
    setSelectedTicket,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarCollapsed,
    currentFolder,
    setCurrentFolder,
    messages,
    snoozedEmails,
    setComposeOpen,
    setReplyToMessage,
    setForwardMessage,
    setNewEmail,
    setComposeMinimized,
    setComposeMaximized,
    emailLabels,
    labelDialogOpen,
    setLabelDialogOpen,
    newLabelName,
    setNewLabelName,
    newLabelColor,
    setNewLabelColor,
    handleCreateEmailLabel,
    selectedMessage,
    setSelectedMessage,
    selectedMessages,
    setSelectedMessages,
    getFilteredMessages,
    displayDensity,
    setDisplayDensity,
    setSnoozedEmails,
    importantEmails,
    setImportantEmails,
    composeOpen,
    composeMinimized,
    composeMaximized,
    replyToMessage,
    forwardMessage,
    newEmail,
    toInput,
    setToInput,
    ccInput,
    setCcInput,
    bccInput,
    setBccInput,
    showCc,
    setShowCc,
    showBcc,
    setShowBcc,
    richTextStyle,
    setRichTextStyle,
    emailSettings,
    setEmailSettings,
    generateId,
    setMessages,
    gmailSettingsOpen,
    setGmailSettingsOpen,
    setTheme,
    vacationResponder,
    setVacationResponder,
    emailNotifications,
    setEmailNotifications,
    setProfileDialogOpen,
    handleLogout,
    isNocSection,
    NOC_SIDEBAR_ITEMS,
    nocOverviewData,
    nocOverviewLoading,
    refreshNocOverview,
    handleMonitoringKpiClick,
    monitoringScope,
    monitoringDrilldown,
    nocReportData,
    generateConsumptionReport,
    SHIFTS_DATA,
    getShiftScheduleForDate,
    getIndividualRestAgent,
    canManageUsers,
    isUsersSyncing,
    syncUsersFromApi,
    setCurrentTabSafely,
    openCreateUserDialog,
    userSearchQuery,
    setUserSearchQuery,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    usersActionInProgress,
    ROLE_CONFIG,
    openEditUserDialog,
    handleChangeUserRole,
    handleToggleBlockUser,
    setSelectedUser,
    setEditPassword,
    setConfirmPassword,
    setSecurityDialogOpen,
    handleDeleteUser,
    isSuperAdmin,
    auditLogs,
    ticketAdminSettings,
    setTicketAdminSettings,
    ticketAdminSettingsLoading,
    ticketAdminSettingsSaving,
    ticketAdminEmailsInput,
    setTicketAdminEmailsInput,
    loadTicketAdminSettings,
    saveTicketAdminSettings,
    TICKET_ADMIN_CATEGORY_KEYS,
    SECTION_LABELS,
    sectionAccess,
    setSectionAccess,
    ALERT_TYPE_CONFIG,
    SHIFT_CYCLE_START,
  } = props;

  return (
    <AnimatePresence>
      {currentTab === 'dashboard' && (
        <AppDashboardPanel
          user={user}
          userRestInfo={userRestInfo}
          tasks={tasks}
          onRefresh={() => toast.success('Donnees actualisees')}
        />
      )}

      {currentTab === 'planning' && (
        <AppPlanningPanel
          currentMonth={currentMonth}
          planning={planning}
          onPreviousMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
          onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
          onGeneratePdf={generatePlanningPDF}
        />
      )}

      {currentTab === 'overtime' && (
        <AppOvertimePanel
          overtimeMonth={overtimeMonth}
          onChangeOvertimeMonth={setOvertimeMonth}
          onGenerateOvertimePdf={generateOvertimePDF}
          user={user}
        />
      )}

      {currentTab === 'links' && <AppLinksPanel />}

      {currentTab === 'email' && <AppEmailTabSection {...props} />}

      {currentTab === 'tasks' && (
        <AppTasksTabSection
          taskDialogOpen={taskDialogOpen}
          setTaskDialogOpen={setTaskDialogOpen}
          newTask={newTask}
          setNewTask={setNewTask}
          taskPriorities={TASK_PRIORITIES}
          taskCategories={TASK_CATEGORIES}
          onCreateTask={handleCreateTask}
          stats={tasksStats}
          searchQuery={searchQuery}
          taskFilter={taskFilter}
          onSearchQueryChange={setSearchQuery}
          onTaskFilterChange={(value) => setTaskFilter(value as typeof taskFilter)}
          taskCount={nocTasks.length}
          displayedTasks={displayedTasks}
          taskStatuses={TASK_STATUSES}
          formatDuration={formatDuration}
          onToggleCompletion={handleToggleTaskCompletion}
          onStart={handleStartTask}
          onPause={handlePauseTask}
          onResume={handleResumeTask}
          onOpenDetails={handleOpenTaskDetails}
          onDelete={handleDeleteTask}
          isPerformanceVisible={Boolean(nocTasks.length > 0 && user && dailyTaskPerformance)}
          productivityRate={dailyTaskPerformance?.productivityRate || 0}
          onTimeRate={dailyTaskPerformance?.onTimeRate || 0}
          tasksCompleted={dailyTaskPerformance?.tasksCompleted || 0}
          tasksCreated={dailyTaskPerformance?.tasksCreated || 0}
          BadgeIcon={dailyTaskBadgeConfig?.icon}
          badgeLabel={dailyTaskBadgeConfig?.label || ''}
        />
      )}

      {currentTab === 'activities' && (
        <AppActivitiesTabSection
          activityDialogOpen={activityDialogOpen}
          onActivityDialogOpenChange={setActivityDialogOpen}
          newActivity={newActivity}
          typeOptions={ACTIVITY_TYPES[newActivity.category] ?? []}
          onCategoryChange={(category) => setNewActivity({ ...newActivity, category, type: '' })}
          onTypeChange={(type) => setNewActivity({ ...newActivity, type })}
          onDescriptionChange={(description) => setNewActivity({ ...newActivity, description })}
          onSave={() => {
            if (newActivity.type && user) {
              const activity = {
                id: `act-${Date.now()}`,
                userId: user.id,
                userName: user.name,
                type: newActivity.type,
                category: newActivity.category,
                description: newActivity.description,
                createdAt: new Date(),
              };
              setActivities((prev: any[]) => [activity, ...prev]);
              setNewActivity({ type: '', category: 'Monitoring', description: '' });
              setActivityDialogOpen(false);
              toast.success('Activite enregistree');
            }
          }}
          activities={activities}
          accentColor={user?.shift?.colorCode || '#3B82F6'}
        />
      )}

      {currentTab === 'tickets' && (
        <AppTicketsTabSection
          showArchivedTickets={showArchivedTickets}
          quickLocalityDialogOpen={quickLocalityDialogOpen}
          setQuickLocalityDialogOpen={setQuickLocalityDialogOpen}
          setQuickLocalityDraft={setQuickLocalityDraft}
          DEFAULT_TICKET_LOCALITY_DRAFT={DEFAULT_TICKET_LOCALITY_DRAFT}
          quickLocalityDraft={quickLocalityDraft}
          quickLocalityTab={quickLocalityTab}
          setQuickLocalityTab={setQuickLocalityTab}
          managedLocalitySearch={managedLocalitySearch}
          setManagedLocalitySearch={setManagedLocalitySearch}
          selectedManagedLocalityId={selectedManagedLocalityId}
          handleSelectManagedLocality={handleSelectManagedLocality}
          filteredManagedLocalities={filteredManagedLocalities}
          managedLocalityName={managedLocalityName}
          setManagedLocalityName={setManagedLocalityName}
          managedLocalityDraft={managedLocalityDraft}
          setManagedLocalityDraft={setManagedLocalityDraft}
          ticketCongoDepartments={ticketCongoDepartments}
          isCreatingLocality={isCreatingLocality}
          isDeletingLocality={isDeletingLocality}
          isUpdatingLocality={isUpdatingLocality}
          handleQuickCreateLocality={handleQuickCreateLocality}
          handleDeleteManagedLocality={handleDeleteManagedLocality}
          handleUpdateManagedLocality={handleUpdateManagedLocality}
          ticketViewMode={ticketViewMode}
          ticketSiteOptions={ticketSiteOptions}
          ticketLocalityOptions={ticketLocalityOptions}
          ticketTechnicianOptions={ticketTechnicianOptions}
          user={user}
          setShowArchivedTickets={setShowArchivedTickets}
          setShowDeletedTickets={setShowDeletedTickets}
          setTicketSearchQuery={setTicketSearchQuery}
          setTicketStatusFilter={setTicketStatusFilter}
          setTicketPriorityFilter={setTicketPriorityFilter}
          setTicketSiteFilter={setTicketSiteFilter}
          setTicketLocaliteFilter={setTicketLocaliteFilter}
          setTicketTechnicienFilter={setTicketTechnicienFilter}
          loadTicketsModuleData={loadTicketsModuleData}
          setTicketViewMode={setTicketViewMode}
          upsertLocalityOption={upsertLocalityOption}
          mapApiTicketToLegacy={mapApiTicketToLegacy}
          setTickets={setTickets}
          ticketSearchQuery={ticketSearchQuery}
          ticketStatusFilter={ticketStatusFilter}
          ticketPriorityFilter={ticketPriorityFilter}
          ticketSiteFilter={ticketSiteFilter}
          ticketLocaliteFilter={ticketLocaliteFilter}
          ticketTechnicienFilter={ticketTechnicienFilter}
          visibleTickets={visibleTickets}
          currentStorageTickets={currentStorageTickets}
          showDeletedTickets={showDeletedTickets}
          ticketStatusFilterOptions={ticketStatusFilterOptions}
          ticketPriorityFilterOptions={ticketPriorityFilterOptions}
          TICKET_STATUSES={TICKET_STATUSES}
          TICKET_PRIORITIES={TICKET_PRIORITIES}
          TICKET_CATEGORIES={TICKET_CATEGORIES}
          showTrashContextMenu={showTrashContextMenu}
          trashContextTicket={trashContextTicket}
          trashContextMenuPosition={trashContextMenuPosition}
          deleteTicketDialogOpen={deleteTicketDialogOpen}
          deleteTicketPermanent={deleteTicketPermanent}
          deleteTicketTarget={deleteTicketTarget}
          isTicketActionBusy={isTicketActionBusy}
          router={router}
          openTicketDetailPage={openTicketDetailPage}
          openTrashTicketContextMenu={openTrashTicketContextMenu}
          handleRestoreTicket={handleRestoreTicket}
          requestDeleteTicket={requestDeleteTicket}
          setEditingTicket={setEditingTicket}
          setEditTicketOpen={setEditTicketOpen}
          setDeleteTicketDialogOpen={setDeleteTicketDialogOpen}
          setDeleteTicketTarget={setDeleteTicketTarget}
          setDeleteTicketPermanent={setDeleteTicketPermanent}
          handleDeleteTicket={handleDeleteTicket}
          archiveYears={archiveYears}
          archiveYearFilter={archiveYearFilter}
          archiveYearBuckets={archiveYearBuckets}
          archiveReport={archiveReport}
          setArchiveYearFilter={setArchiveYearFilter}
          tickets={tickets}
          handleUnarchiveTicket={handleUnarchiveTicket}
          ticketStatusArchiveOptions={ticketStatusArchiveOptions}
          ticketPriorityArchiveOptions={ticketPriorityArchiveOptions}
        />
      )}

      <AppEditTicketDialogSection
        editTicketOpen={editTicketOpen}
        setEditTicketOpen={setEditTicketOpen}
        editingTicket={editingTicket}
        setEditingTicket={setEditingTicket}
        ticketSiteOptions={ticketSiteOptions}
        ticketLocalityOptions={ticketLocalityOptions}
        ticketTechnicianOptions={ticketTechnicianOptions}
        editTicketLocalityDraft={editTicketLocalityDraft}
        setEditTicketLocalityDraft={setEditTicketLocalityDraft}
        isEditLocalityCreationEnabled={isEditLocalityCreationEnabled}
        setIsEditLocalityCreationEnabled={setIsEditLocalityCreationEnabled}
        ticketCongoDepartments={ticketCongoDepartments}
        isCreatingLocality={isCreatingLocality}
        statusOptions={ticketStatusArchiveOptions}
        priorityOptions={ticketPriorityArchiveOptions}
        createTicketLocality={createTicketLocality}
        resolveTicketSiteSelection={resolveTicketSiteSelection}
        resolveTicketTechnicians={resolveTicketTechnicians}
        updateTicketDetailsRequest={updateTicketDetailsRequest}
        mapLegacyTicketStatusToApi={mapLegacyTicketStatusToApi}
        mapLegacyTicketPriorityToApi={mapLegacyTicketPriorityToApi}
        splitTicketValues={splitTicketValues}
        user={user ? { id: user.id, name: user.name } : null}
        mapApiTicketToLegacy={mapApiTicketToLegacy}
        setTickets={setTickets}
        setSelectedTicket={setSelectedTicket}
      />

      {currentTab === 'messagerie' && (
        <AppMessagerieTabSection
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          currentFolder={currentFolder}
          setCurrentFolder={setCurrentFolder}
          messages={messages}
          snoozedEmails={snoozedEmails}
          setComposeOpen={setComposeOpen}
          setReplyToMessage={setReplyToMessage}
          setForwardMessage={setForwardMessage}
          setNewEmail={setNewEmail}
          setComposeMinimized={setComposeMinimized}
          setComposeMaximized={setComposeMaximized}
          emailLabels={emailLabels}
          labelDialogOpen={labelDialogOpen}
          setLabelDialogOpen={setLabelDialogOpen}
          newLabelName={newLabelName}
          setNewLabelName={setNewLabelName}
          newLabelColor={newLabelColor}
          setNewLabelColor={setNewLabelColor}
          handleCreateEmailLabel={handleCreateEmailLabel}
          selectedMessage={selectedMessage}
          setSelectedMessage={setSelectedMessage}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          getFilteredMessages={getFilteredMessages}
          displayDensity={displayDensity}
          setDisplayDensity={setDisplayDensity}
          setSnoozedEmails={setSnoozedEmails}
          importantEmails={importantEmails}
          setImportantEmails={setImportantEmails}
          composeOpen={composeOpen}
          composeMinimized={composeMinimized}
          composeMaximized={composeMaximized}
          replyToMessage={replyToMessage}
          forwardMessage={forwardMessage}
          newEmail={newEmail}
          toInput={toInput}
          setToInput={setToInput}
          ccInput={ccInput}
          setCcInput={setCcInput}
          bccInput={bccInput}
          setBccInput={setBccInput}
          showCc={showCc}
          setShowCc={setShowCc}
          showBcc={showBcc}
          setShowBcc={setShowBcc}
          richTextStyle={richTextStyle}
          setRichTextStyle={setRichTextStyle}
          emailSettings={emailSettings}
          setEmailSettings={setEmailSettings}
          user={user}
          generateId={generateId}
          setMessages={setMessages}
          gmailSettingsOpen={gmailSettingsOpen}
          setGmailSettingsOpen={setGmailSettingsOpen}
          theme={theme}
          setTheme={setTheme}
          vacationResponder={vacationResponder}
          setVacationResponder={setVacationResponder}
          emailNotifications={emailNotifications}
          setEmailNotifications={setEmailNotifications}
          setProfileDialogOpen={setProfileDialogOpen}
          handleLogout={handleLogout}
        />
      )}

      {isNocSection(currentTab) && (
        <AppNocTabContent
          currentTab={currentTab}
          title={NOC_SIDEBAR_ITEMS.find((item: any) => item.id === currentTab)?.label ?? 'NOC'}
          description={NOC_SIDEBAR_ITEMS.find((item: any) => item.id === currentTab)?.description ?? 'Plateforme de supervision temps reel'}
          nocOverviewData={nocOverviewData}
          nocOverviewLoading={nocOverviewLoading}
          refreshNocOverview={refreshNocOverview}
          handleMonitoringKpiClick={handleMonitoringKpiClick}
          monitoringScope={monitoringScope}
          monitoringDrilldown={monitoringDrilldown}
          user={user}
          nocReportData={nocReportData}
          generateConsumptionReport={generateConsumptionReport}
        />
      )}

      {currentTab === 'supervision' && (user?.role === 'RESPONSABLE' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <AppSupervisionTabContent
          SHIFTS_DATA={SHIFTS_DATA}
          getShiftScheduleForDate={getShiftScheduleForDate}
          getIndividualRestAgent={getIndividualRestAgent}
          getShiftColor={getShiftColor}
        />
      )}

      {currentTab === 'admin_users' && canManageUsers && (
        <AppAdminUsersTabSection
          isUsersSyncing={isUsersSyncing}
          syncUsersFromApi={syncUsersFromApi}
          setCurrentTabSafely={setCurrentTabSafely}
          openCreateUserDialog={openCreateUserDialog}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          filteredUsers={filteredUsers}
          usersActionInProgress={usersActionInProgress}
          ROLE_CONFIG={ROLE_CONFIG}
          openEditUserDialog={openEditUserDialog}
          handleChangeUserRole={handleChangeUserRole}
          user={user}
          handleToggleBlockUser={handleToggleBlockUser}
          setSelectedUser={setSelectedUser}
          setEditPassword={setEditPassword}
          setConfirmPassword={setConfirmPassword}
          setSecurityDialogOpen={setSecurityDialogOpen}
          handleDeleteUser={handleDeleteUser}
          isSuperAdmin={isSuperAdmin}
          auditLogs={auditLogs}
        />
      )}

      {currentTab === 'admin' && canManageUsers && (
        <AppAdminManagementTabSection
          setCurrentTabSafely={setCurrentTabSafely}
          ticketAdminSettings={ticketAdminSettings}
          setTicketAdminSettings={setTicketAdminSettings}
          ticketAdminSettingsLoading={ticketAdminSettingsLoading}
          ticketAdminSettingsSaving={ticketAdminSettingsSaving}
          ticketAdminEmailsInput={ticketAdminEmailsInput}
          setTicketAdminEmailsInput={setTicketAdminEmailsInput}
          loadTicketAdminSettings={loadTicketAdminSettings}
          saveTicketAdminSettings={saveTicketAdminSettings}
          TICKET_ADMIN_CATEGORY_KEYS={TICKET_ADMIN_CATEGORY_KEYS}
          SECTION_LABELS={SECTION_LABELS}
          sectionAccess={sectionAccess}
          setSectionAccess={setSectionAccess}
          ALERT_TYPE_CONFIG={ALERT_TYPE_CONFIG}
          SHIFTS_DATA={SHIFTS_DATA}
          SHIFT_CYCLE_START={SHIFT_CYCLE_START}
          getShiftColor={getShiftColor}
        />
      )}
    </AnimatePresence>
  );
}