import { motion } from 'framer-motion';

import { AppEmailMailboxContent } from '@/features/app-shell/components/email/AppEmailMailboxContent';
import { AppEmailMailboxSidebar } from '@/features/app-shell/components/email/AppEmailMailboxSidebar';

type AppMessagerieTabSectionProps = any;

export function AppMessagerieTabSection(props: AppMessagerieTabSectionProps) {
  const {
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
    user,
    generateId,
    setMessages,
    gmailSettingsOpen,
    setGmailSettingsOpen,
    theme,
    setTheme,
    vacationResponder,
    setVacationResponder,
    emailNotifications,
    setEmailNotifications,
    setProfileDialogOpen,
    handleLogout,
  } = props;

  return (
    <motion.div
      key="messagerie"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-[calc(100vh-7rem)]"
    >
      <div className="flex h-full rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg relative">
        {mobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <AppEmailMailboxSidebar
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
          onCreateLabel={handleCreateEmailLabel}
        />

        <AppEmailMailboxContent
          currentFolder={currentFolder}
          messages={messages}
          selectedMessage={selectedMessage}
          setSelectedMessage={setSelectedMessage}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          getFilteredMessages={getFilteredMessages}
          displayDensity={displayDensity}
          setDisplayDensity={setDisplayDensity}
          snoozedEmails={snoozedEmails}
          setSnoozedEmails={setSnoozedEmails}
          importantEmails={importantEmails}
          setImportantEmails={setImportantEmails}
          emailLabels={emailLabels}
          setComposeOpen={setComposeOpen}
          setReplyToMessage={setReplyToMessage}
          setForwardMessage={setForwardMessage}
          composeOpen={composeOpen}
          setComposeMinimized={setComposeMinimized}
          composeMinimized={composeMinimized}
          setComposeMaximized={setComposeMaximized}
          composeMaximized={composeMaximized}
          replyToMessage={replyToMessage}
          forwardMessage={forwardMessage}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
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
          labelDialogOpen={labelDialogOpen}
          setLabelDialogOpen={setLabelDialogOpen}
        />
      </div>
    </motion.div>
  );
}
