'use client';

import type { CSSProperties } from 'react';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Archive,
  CheckCheck,
  Download,
  Eye as EyeIcon,
  File,
  MessageCircle,
  Pause,
  Play,
  Reply,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { canManageAnnouncements } from '@/features/app-shell/constants';
import { AppEmailConversationBackground } from '@/features/app-shell/components/AppEmailConversationBackground';
import { AppEmailConversationHeader } from '@/features/app-shell/components/AppEmailConversationHeader';
import { AppEmailMessageSearchBar } from '@/features/app-shell/components/AppEmailMessageSearchBar';
import { AppEmailMessagesViewport } from '@/features/app-shell/components/AppEmailMessagesViewport';
import { AppEmailPinnedMessages } from '@/features/app-shell/components/AppEmailPinnedMessages';
import { AppEmailScrollToBottomButton } from '@/features/app-shell/components/AppEmailScrollToBottomButton';
import { AppEmailSidebar } from '@/features/app-shell/components/AppEmailSidebar';
import { AppEmailTypingIndicator } from '@/features/app-shell/components/AppEmailTypingIndicator';
import { AppEmailLiveReactionsOverlay } from '@/features/app-shell/components/AppEmailLiveReactionsOverlay';
import { AppEmailComposerInputBar } from '@/features/app-shell/components/email/composer/AppEmailComposerInputBar';
import { AppEmailComposerPreviews } from '@/features/app-shell/components/email/composer/AppEmailComposerPreviews';
import { AppEmailFormattingToolbar } from '@/features/app-shell/components/email/composer/AppEmailFormattingToolbar';
import { AppEmailRecentEmojisBar } from '@/features/app-shell/components/email/composer/AppEmailRecentEmojisBar';
import { AppEmailSelectionActionBar } from '@/features/app-shell/components/email/composer/AppEmailSelectionActionBar';
import { AppEmailDialogsSection } from '@/features/app-shell/components/email/dialogs/AppEmailDialogsSection';
import { AppEmailMessageContextMenu } from '@/features/app-shell/components/email/dialogs/AppEmailMessageContextMenu';
import { toast } from '@/lib/toast';

type AppEmailTabSectionProps = any;

export function AppEmailTabSection(props: AppEmailTabSectionProps) {
  const {
    user,
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
    setPinnedMessages,
    playingMessageId,
    audioProgress,
    audioRef,
    setPlayingMessageId,
    setAudioProgress,
    setChatImagePreview,
    setChatImageZoom,
    selectedChatMessages,
    isSelectionMode,
    setIsSelectionMode,
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
    showFormattingToolbar,
    setShowFormattingToolbar,
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
    myStatusesOpen,
    viewingStatus,
    viewingStatusIndex,
    viewingUserStatuses,
    statusViewOpen,
    showStatusDetails,
    setShowStatusDetails,
  } = props;

  return (
    <motion.div
      key="email"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-[calc(100vh-7rem)]"
    >
      <div className="flex h-full border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg">
        <AppEmailSidebar
          user={user}
          openAvatarViewer={openAvatarViewer}
          setNewConversationOpen={setNewConversationOpen}
          setCreateGroupOpen={setCreateGroupOpen}
          chatSearchQuery={chatSearchQuery}
          setChatSearchQuery={setChatSearchQuery}
          statusList={statusList}
          usersDirectory={usersDirectory}
          setMyStatusesOpen={setMyStatusesOpen}
          setCreateStatusOpen={setCreateStatusOpen}
          setViewingUserStatuses={setViewingUserStatuses}
          setViewingStatusIndex={setViewingStatusIndex}
          setViewingStatus={setViewingStatus}
          setStatusViewOpen={setStatusViewOpen}
          setStatusList={setStatusList}
          conversationFilter={conversationFilter}
          setConversationFilter={setConversationFilter}
          conversations={conversations}
          selectedConversation={selectedConversation}
          userPresence={userPresence}
          announcementAvatar={announcementAvatar}
          handleConversationSelect={handleConversationSelect}
        />
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-cyan-50 dark:bg-slate-800 relative overflow-hidden">
            <AppEmailConversationBackground customBackgroundImage={customBackgroundImage} />
            <AppEmailConversationHeader
              selectedConversation={selectedConversation}
              user={user}
              announcementAvatar={announcementAvatar}
              typingIndicators={typingIndicators}
              userPresence={userPresence}
              messageSearchOpen={messageSearchOpen}
              setMessageSearchOpen={setMessageSearchOpen}
              setBackgroundSettingsOpen={setBackgroundSettingsOpen}
              setConversations={setConversations}
              setSelectedConversation={setSelectedConversation}
              openAvatarViewer={openAvatarViewer}
              startOutgoingCall={startOutgoingCall}
              openConversationAvatarUploader={openConversationAvatarUploader}
            />
            {messageSearchOpen && (
              <AppEmailMessageSearchBar
                selectedConversation={selectedConversation}
                chatMessages={chatMessages}
                chatSearchMessageQuery={chatSearchMessageQuery}
                setChatSearchMessageQuery={setChatSearchMessageQuery}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                currentSearchIndex={currentSearchIndex}
                setCurrentSearchIndex={setCurrentSearchIndex}
                setMessageSearchOpen={setMessageSearchOpen}
              />
            )}
            <AppEmailMessagesViewport
              messageContainerRef={messageContainerRef}
              setShowScrollToBottom={setShowScrollToBottom}
            >
              <div className="space-y-2 max-w-3xl mx-auto">
                <AppEmailPinnedMessages conversationId={selectedConversation.id} pinnedMessages={pinnedMessages} />
                {chatMessages
                  .filter((m: any) => m.conversationId === selectedConversation.id)
                  .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((message: any, index: number, messages: any[]) => {
                    const isOwn = message.senderId === user?.id;
                    const showDate =
                      index === 0 ||
                      format(message.createdAt, 'yyyy-MM-dd') !== format(messages[index - 1].createdAt, 'yyyy-MM-dd');
                    const isCurrentResult = searchResults[currentSearchIndex]?.id === message.id;
                    const renderMessageContent = () => {
                      if (message.deletedForEveryone) {
                        return <p className="text-sm text-muted-foreground italic">Ce message a ete supprime</p>;
                      }
                      if (message.isDeleted) {
                        return <p className="text-sm text-muted-foreground italic">Message supprime</p>;
                      }
                      if (message.type === 'voice' && message.mediaData) {
                        const isPlaying = playingMessageId === message.id;
                        const progress = audioProgress[message.id] || 0;
                        return (
                          <div className="flex items-center gap-2 min-w-50">
                            <button
                              onClick={() => {
                                if (isPlaying) {
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current = null;
                                  }
                                  setPlayingMessageId(null);
                                } else {
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                  }
                                  const audio = new Audio(message.mediaData);
                                  audioRef.current = audio;
                                  audio.onended = () => {
                                    setPlayingMessageId(null);
                                    setAudioProgress((prev: any) => ({ ...prev, [message.id]: 100 }));
                                  };
                                  audio.ontimeupdate = () => {
                                    const percent = (audio.currentTime / audio.duration) * 100;
                                    setAudioProgress((prev: any) => ({ ...prev, [message.id]: percent }));
                                  };
                                  audio.play();
                                  setPlayingMessageId(message.id);
                                }
                              }}
                              className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-md"
                            >
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                            <div
                              className="flex-1 h-8 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden cursor-pointer relative"
                              onClick={(e) => {
                                if (audioRef.current && message.mediaData) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const percent = (e.clientX - rect.left) / rect.width;
                                  if (audioRef.current.duration) {
                                    audioRef.current.currentTime = percent * audioRef.current.duration;
                                    setAudioProgress((prev: any) => ({ ...prev, [message.id]: percent * 100 }));
                                  }
                                }
                              }}
                            >
                              <div
                                className="h-full bg-linear-to-r from-cyan-500 to-cyan-400 rounded-full transition-all relative"
                                style={{ width: `${progress}%` }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono min-w-[40px]">
                              {Math.floor((message.duration || 0) / 60)}:{String((message.duration || 0) % 60).padStart(2, '0')}
                            </span>
                          </div>
                        );
                      }
                      if (message.type === 'voice') {
                        const isPlaying = playingMessageId === message.id;
                        const progress = audioProgress[message.id] || 0;
                        return (
                          <div className="flex items-center gap-2 min-w-50">
                            <button
                              onClick={() => {
                                if (isPlaying) {
                                  setPlayingMessageId(null);
                                } else {
                                  setPlayingMessageId(message.id);
                                  let currentProgress = 0;
                                  const interval = setInterval(() => {
                                    currentProgress += 100 / ((message.duration || 10) * 10);
                                    if (currentProgress >= 100) {
                                      clearInterval(interval);
                                      setPlayingMessageId(null);
                                      setAudioProgress((prev: any) => ({ ...prev, [message.id]: 100 }));
                                    } else {
                                      setAudioProgress((prev: any) => ({ ...prev, [message.id]: currentProgress }));
                                    }
                                  }, 100);
                                }
                              }}
                              className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-md"
                            >
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                            <div
                              className="flex-1 h-8 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden cursor-pointer"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                                setAudioProgress((prev: any) => ({ ...prev, [message.id]: percent }));
                              }}
                            >
                              <div
                                className="h-full bg-linear-to-r from-cyan-500 to-cyan-400 rounded-full transition-all relative"
                                style={{ width: `${isPlaying ? progress : 0}%` }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono min-w-[40px]">
                              {Math.floor((message.duration || 0) / 60)}:{String((message.duration || 0) % 60).padStart(2, '0')}
                            </span>
                          </div>
                        );
                      }
                      if (message.type === 'image' && message.mediaData) {
                        return (
                          <div className="max-w-[250px]">
                            <button
                              type="button"
                              className="block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              onClick={() => {
                                setChatImagePreview({
                                  url: message.mediaData || '',
                                  fileName: message.fileName,
                                  message,
                                });
                                setChatImageZoom(1);
                              }}
                            >
                              <img
                                src={message.mediaData}
                                alt={message.fileName || 'Image'}
                                className="rounded-lg max-h-50 object-cover cursor-zoom-in"
                              />
                            </button>
                            {message.content && <p className="text-sm mt-1">{message.content}</p>}
                          </div>
                        );
                      }
                      if (message.type === 'video' && message.mediaData) {
                        return (
                          <div className="max-w-[250px]">
                            <video src={message.mediaData} controls className="rounded-lg max-h-50" />
                            {message.content && <p className="text-sm mt-1">{message.content}</p>}
                          </div>
                        );
                      }
                      if (message.type === 'document') {
                        return (
                          <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg min-w-[260px]">
                            <div className="flex items-center gap-2">
                              <File className="w-8 h-8 text-cyan-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.fileName || 'Document'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => {
                                  if (message.mediaData) {
                                    window.open(message.mediaData, '_blank', 'noopener,noreferrer');
                                  } else {
                                    toast.error('Apercu indisponible pour ce document');
                                  }
                                }}
                              >
                                <EyeIcon className="w-3 h-3 mr-1" /> Lire
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => {
                                  if (message.mediaData) {
                                    const link = document.createElement('a');
                                    link.href = message.mediaData;
                                    link.download = message.fileName || `document-${message.id}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } else {
                                    toast.error('Telechargement indisponible pour ce document');
                                  }
                                }}
                              >
                                <Download className="w-3 h-3 mr-1" /> Telecharger
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      let content = (message.content || '').toString();
                      if (content.trim() === '') {
                        content = '[Message sans texte]';
                      }

                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = content.split(urlRegex);
                      const contentWithLinks = parts.map((part: string, i: number) => {
                        if (part.match(urlRegex)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 dark:text-cyan-400 underline hover:text-cyan-700 dark:hover:text-cyan-300"
                            >
                              {part.length > 40 ? `${part.substring(0, 40)}...` : part}
                            </a>
                          );
                        }
                        return part;
                      });

                      const contentWithMentions = contentWithLinks.flat().map((part: any, i: number) => {
                        if (typeof part === 'string') {
                          const mentionParts = part.split(/(@\w+)/g);
                          return mentionParts.map((mentionPart: string, j: number) => {
                            if (mentionPart.startsWith('@')) {
                              return (
                                <span
                                  key={`${i}-${j}`}
                                  className="text-cyan-600 dark:text-cyan-400 font-medium bg-cyan-50 dark:bg-cyan-900/30 px-1 rounded"
                                >
                                  {mentionPart}
                                </span>
                              );
                            }
                            if (
                              chatSearchMessageQuery &&
                              mentionPart.toLowerCase().includes(chatSearchMessageQuery.toLowerCase())
                            ) {
                              const regex = new RegExp(`(${chatSearchMessageQuery})`, 'gi');
                              const searchParts = mentionPart.split(regex);
                              return searchParts.map((searchPart: string, k: number) => {
                                if (searchPart.toLowerCase() === chatSearchMessageQuery.toLowerCase()) {
                                  return (
                                    <span key={`${i}-${j}-${k}`} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
                                      {searchPart}
                                    </span>
                                  );
                                }
                                return searchPart;
                              });
                            }
                            return mentionPart;
                          });
                        }
                        return part;
                      });

                      return (
                        <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                          {contentWithMentions}
                        </p>
                      );
                    };

                    const getFormattingStyles = (fmt?: any): CSSProperties => {
                      if (!fmt) {
                        return {};
                      }
                      return {
                        fontWeight: fmt.bold ? 'bold' : undefined,
                        fontStyle: fmt.italic ? 'italic' : undefined,
                        textDecoration: fmt.underline ? 'underline' : undefined,
                        fontSize:
                          fmt.fontSize === 'small'
                            ? '0.75rem'
                            : fmt.fontSize === 'large'
                              ? '1.125rem'
                              : undefined,
                        color: fmt.color || undefined,
                      };
                    };

                    return (
                      <div
                        key={message.id}
                        id={`message-${message.id}`}
                        className={`${isCurrentResult ? 'ring-2 ring-yellow-400 rounded-lg' : ''} ${selectedChatMessages.has(message.id) ? 'bg-cyan-100/50 dark:bg-cyan-900/20 rounded-lg' : ''}`}
                      >
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="bg-white/80 dark:bg-slate-700/80 text-xs text-muted-foreground px-3 py-1 rounded-lg shadow">
                              {format(message.createdAt, 'EEEE d MMMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedChatMessages.has(message.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedChatMessages((prev: Set<string>) => new Set([...prev, message.id]));
                                } else {
                                  setSelectedChatMessages((prev: Set<string>) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(message.id);
                                    return newSet;
                                  });
                                }
                              }}
                              className="mt-2"
                            />
                          )}
                          <div
                            className={`max-w-[70%] ${isOwn ? 'bg-cyan-100 dark:bg-cyan-900/30 rounded-l-2xl rounded-br-sm' : 'bg-white dark:bg-slate-700 rounded-r-2xl rounded-bl-sm shadow-sm'} px-3 py-2 relative group`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (!message.deletedForEveryone && !message.isDeleted) {
                                setContextMenuMessage(message);
                                setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                setShowContextMenu(true);
                              }
                            }}
                          >
                            {message.replyTo && !message.deletedForEveryone && !message.isDeleted && (
                              <button
                                onClick={() => {
                                  const replyElement = document.getElementById(`message-${message.replyTo?.id}`);
                                  if (replyElement) {
                                    replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    replyElement.classList.add('ring-2', 'ring-cyan-400');
                                    setTimeout(() => {
                                      replyElement.classList.remove('ring-2', 'ring-cyan-400');
                                    }, 2000);
                                  }
                                }}
                                className="mb-1 text-left w-full border-l-2 border-cyan-400 pl-2 py-1 bg-slate-50 dark:bg-slate-600/50 rounded-r text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                              >
                                <span className="font-medium text-cyan-600 dark:text-cyan-400">{message.replyTo.senderName}</span>
                                <p className="truncate">{message.replyTo.content || 'Media'}</p>
                              </button>
                            )}
                            {selectedConversation.type === 'group' && !isOwn && (
                              <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-0.5">{message.senderName}</p>
                            )}
                            {message.formatting ? (
                              <span style={getFormattingStyles(message.formatting)}>{renderMessageContent()}</span>
                            ) : (
                              renderMessageContent()
                            )}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {message.isImportant && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                              {message.isEdited && <span className="text-[10px] text-muted-foreground italic mr-1">modifie</span>}
                              {message.isArchived && <Archive className="w-3 h-3 text-slate-400 mr-1" />}
                              <span className="text-[10px] text-muted-foreground">{format(message.createdAt, 'HH:mm')}</span>
                              {isOwn && !message.deletedForEveryone && !message.isDeleted && (
                                <span className="flex">
                                  {message.status === 'read' ? (
                                    <CheckCheck className="w-3 h-3 text-cyan-500" />
                                  ) : (
                                    <CheckCheck className="w-3 h-3 text-slate-400" />
                                  )}
                                </span>
                              )}
                            </div>
                            {!message.deletedForEveryone && !message.isDeleted && (
                              <button
                                onClick={() => setReplyingTo(message)}
                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                <Reply className="w-4 h-4 text-slate-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <AppEmailTypingIndicator conversationId={selectedConversation.id} typingIndicators={typingIndicators} />
                <AppEmailLiveReactionsOverlay conversationId={selectedConversation.id} liveReactions={liveReactions} />
                <div ref={messageEndRef} />
              </div>
            </AppEmailMessagesViewport>
            {showScrollToBottom && (
              <AppEmailScrollToBottomButton
                onClick={() => {
                  messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  setShowScrollToBottom(false);
                }}
              />
            )}

            <AppEmailMessageContextMenu
              showContextMenu={showContextMenu}
              contextMenuMessage={contextMenuMessage}
              contextMenuPosition={contextMenuPosition}
              user={user}
              setShowContextMenu={setShowContextMenu}
              setPinnedMessages={setPinnedMessages}
              setChatMessages={setChatMessages}
              setConversations={setConversations}
              setEditingMessage={setEditingMessage}
              setEditMessageContent={setEditMessageContent}
              setEditMessageDialogOpen={setEditMessageDialogOpen}
              setReplyingTo={setReplyingTo}
              updateChatMessage={updateChatMessage}
            />
            <div className="relative bg-slate-50 dark:bg-slate-800 p-2 z-10">
              <AppEmailSelectionActionBar
                isSelectionMode={isSelectionMode}
                selectedChatMessages={selectedChatMessages}
                setChatMessages={setChatMessages}
                setSelectedChatMessages={setSelectedChatMessages}
                setIsSelectionMode={setIsSelectionMode}
              />

              <AppEmailFormattingToolbar
                showFormattingToolbar={showFormattingToolbar}
                currentFormatting={currentFormatting}
                setCurrentFormatting={setCurrentFormatting}
              />

              <AppEmailComposerPreviews
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                attachmentPreview={attachmentPreview}
                setAttachmentPreview={setAttachmentPreview}
              />

              <AppEmailRecentEmojisBar
                recentEmojis={recentEmojis}
                setNewMessage={setNewMessage}
                registerRecentEmoji={registerRecentEmoji}
                broadcastLiveReaction={broadcastLiveReaction}
              />

              <AppEmailComposerInputBar
                theme={theme}
                isCompactEmojiLayout={isCompactEmojiLayout}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                showLiveReactionPicker={showLiveReactionPicker}
                setShowLiveReactionPicker={setShowLiveReactionPicker}
                registerRecentEmoji={registerRecentEmoji}
                broadcastLiveReaction={broadcastLiveReaction}
                isSelectionMode={isSelectionMode}
                setIsSelectionMode={setIsSelectionMode}
                setSelectedChatMessages={setSelectedChatMessages}
                showFormattingToolbar={showFormattingToolbar}
                setShowFormattingToolbar={setShowFormattingToolbar}
                composerDisabled={Boolean(selectedConversation && isAnnouncementsConversation(selectedConversation) && !canManageAnnouncements(user))}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                attachmentPreview={attachmentPreview}
                setAttachmentPreview={setAttachmentPreview}
                showMentionSuggestions={showMentionSuggestions}
                setShowMentionSuggestions={setShowMentionSuggestions}
                mentionQuery={mentionQuery}
                setMentionQuery={setMentionQuery}
                usersDirectory={usersDirectory}
                user={user}
                setMentionedUsers={setMentionedUsers}
                selectedConversation={selectedConversation}
                broadcastTypingStatus={broadcastTypingStatus}
                typingStopTimeoutRef={typingStopTimeoutRef}
                sendChatMessage={sendChatMessage}
                recordingTime={recordingTime}
                replyingTo={replyingTo}
                setLastReplyTo={setLastReplyTo}
                setReplyingTo={setReplyingTo}
                playMessageSendSound={playMessageSendSound}
                setSimulatedTyping={setSimulatedTyping}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                setRecordingTime={setRecordingTime}
                mediaRecorderRef={mediaRecorderRef}
                audioChunksRef={audioChunksRef}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-cyan-50 dark:bg-slate-800 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.03] dark:opacity-[0.02]" />
            </div>
            <div className="text-center relative z-10">
              <div className="w-64 h-64 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <MessageCircle className="w-32 h-32 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-medium text-slate-700 dark:text-slate-200 mb-2">Silicone Connect Chat</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Envoyez et recevez des messages avec vos collegues en temps reel.
                <br />
                Communication securisee et instantanee.
              </p>
            </div>
          </div>
        )}
      </div>

      <AppEmailDialogsSection
        editMessageDialogOpen={editMessageDialogOpen}
        setEditMessageDialogOpen={setEditMessageDialogOpen}
        editMessageContent={editMessageContent}
        setEditMessageContent={setEditMessageContent}
        onSaveEditedMessage={handleSaveEditedMessage}
        chatImagePreview={chatImagePreview}
        setChatImagePreview={setChatImagePreview}
        chatImageZoom={chatImageZoom}
        setChatImageZoom={setChatImageZoom}
        userId={user?.id}
        setChatMessages={setChatMessages}
        setPinnedMessages={setPinnedMessages}
        updateChatMessage={updateChatMessage}
        createGroupOpen={createGroupOpen}
        setCreateGroupOpen={setCreateGroupOpen}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroupDescription={newGroupDescription}
        setNewGroupDescription={setNewGroupDescription}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        usersDirectory={usersDirectory}
        user={user}
        createConversationInDb={createConversationInDb}
        setConversations={setConversations}
        setSelectedConversation={setSelectedConversation}
        incomingCall={incomingCall}
        activeCall={activeCall}
        callState={callState}
        handleIncomingCallAction={handleIncomingCallAction}
        setConferenceEnabled={setConferenceEnabled}
        setHeldCall={setHeldCall}
        callParticipants={callParticipants}
        setCallParticipants={setCallParticipants}
        addNotification={addNotification}
        callDialogOpen={callDialogOpen}
        setCallDialogOpen={setCallDialogOpen}
        setActiveCall={setActiveCall}
        setCallState={setCallState}
        callTimer={callTimer}
        setCallTimer={setCallTimer}
        liveReactions={liveReactions}
        setLiveReactions={setLiveReactions}
        setAddParticipantsOpen={setAddParticipantsOpen}
        isCallMuted={isCallMuted}
        setIsCallMuted={setIsCallMuted}
        isCallSpeakerOn={isCallSpeakerOn}
        setIsCallSpeakerOn={setIsCallSpeakerOn}
        showCallReactionPicker={showCallReactionPicker}
        setShowCallReactionPicker={setShowCallReactionPicker}
        theme={theme}
        isCompactEmojiLayout={isCompactEmojiLayout}
        broadcastLiveReaction={broadcastLiveReaction}
        callTimeoutRef={callTimeoutRef}
        addParticipantsOpen={addParticipantsOpen}
        newConversationOpen={newConversationOpen}
        setNewConversationOpen={setNewConversationOpen}
        newConversationSearch={newConversationSearch}
        setNewConversationSearch={setNewConversationSearch}
        conversations={conversations}
        userPresence={userPresence}
        getShiftColor={getShiftColor}
        resetConversationUnreadCount={resetConversationUnreadCount}
        backgroundSettingsOpen={backgroundSettingsOpen}
        setBackgroundSettingsOpen={setBackgroundSettingsOpen}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        soundOnSend={soundOnSend}
        setSoundOnSend={setSoundOnSend}
        soundOnReceive={soundOnReceive}
        setSoundOnReceive={setSoundOnReceive}
        soundOnNotification={soundOnNotification}
        setSoundOnNotification={setSoundOnNotification}
        handleSetBackground={handleSetBackground}
        profilePhotoDialogOpen={profilePhotoDialogOpen}
        setProfilePhotoDialogOpen={setProfilePhotoDialogOpen}
        tempProfilePhoto={tempProfilePhoto}
        setTempProfilePhoto={setTempProfilePhoto}
        clearTempAvatarObjectUrl={clearTempAvatarObjectUrl}
        profileCrop={profileCrop}
        setProfileCrop={setProfileCrop}
        profileZoom={profileZoom}
        setProfileZoom={setProfileZoom}
        setProfileCroppedAreaPixels={setProfileCroppedAreaPixels}
        handleAvatarFileSelection={handleAvatarFileSelection}
        handleSaveCroppedPhoto={handleSaveCroppedPhoto}
        createStatusOpen={createStatusOpen}
        setCreateStatusOpen={setCreateStatusOpen}
        statusMediaPreview={statusMediaPreview}
        setStatusMediaPreview={setStatusMediaPreview}
        statusMediaType={statusMediaType}
        setStatusMediaType={setStatusMediaType}
        statusCaption={statusCaption}
        setStatusCaption={setStatusCaption}
        statusBlockedContacts={statusBlockedContacts}
        setStatusBlockedContacts={setStatusBlockedContacts}
        currentUser={user ? { id: user.id } : null}
        onPublishStatus={props.handlePublishStatus}
        myStatusesOpen={myStatusesOpen}
        setMyStatusesOpen={setMyStatusesOpen}
        statusList={statusList}
        currentUserId={user?.id}
        setViewingUserStatuses={setViewingUserStatuses}
        setViewingStatusIndex={setViewingStatusIndex}
        setViewingStatus={setViewingStatus}
        setStatusViewOpen={setStatusViewOpen}
        setStatusList={setStatusList}
        onStatusDeleted={() => toast.success('Statut supprime')}
        statusViewOpen={statusViewOpen}
        viewingStatus={viewingStatus}
        viewingStatusIndex={viewingStatusIndex}
        viewingUserStatuses={viewingUserStatuses}
        showStatusDetails={showStatusDetails}
        setShowStatusDetails={setShowStatusDetails}
        onLikeSuccess={() => toast.success('Vous aimez ce statut')}
      />
    </motion.div>
  );
}