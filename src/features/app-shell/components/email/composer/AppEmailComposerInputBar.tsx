import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import EmojiPicker, { EmojiClickData, Theme as EmojiPickerTheme } from 'emoji-picker-react';
import { CheckSquare, Film, File, Heart, Image as ImageIcon, Mic, Paperclip, Send, Type } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ChatMessageType } from '@/features/app-shell/core/shared/types';
import { toast } from '@/lib/toast';

type AttachmentPreview = {
  file: File | null;
  preview: string | null;
  type: 'image' | 'video' | 'document' | 'audio' | null;
  fileType?: string;
};

type DirectoryUser = {
  id: string;
  name: string;
};

type SelectedConversation = {
  id: string;
  type?: string;
  participants: Array<{ id: string; name: string }>;
} | null;

type CurrentUser = {
  id?: string;
  name?: string;
  avatar?: string;
} | null;

type AppEmailComposerInputBarProps = {
  theme?: string;
  isCompactEmojiLayout: boolean;
  showEmojiPicker: boolean;
  setShowEmojiPicker: Dispatch<SetStateAction<boolean>>;
  showLiveReactionPicker: boolean;
  setShowLiveReactionPicker: Dispatch<SetStateAction<boolean>>;
  registerRecentEmoji: (emoji: string, scope?: 'chat' | 'call') => void;
  broadcastLiveReaction: (emoji: string, targetType: 'chat' | 'call') => void;
  isSelectionMode: boolean;
  setIsSelectionMode: Dispatch<SetStateAction<boolean>>;
  setSelectedChatMessages: Dispatch<SetStateAction<Set<string>>>;
  showFormattingToolbar: boolean;
  setShowFormattingToolbar: Dispatch<SetStateAction<boolean>>;
  composerDisabled: boolean;
  newMessage: string;
  setNewMessage: Dispatch<SetStateAction<string>>;
  attachmentPreview: AttachmentPreview;
  setAttachmentPreview: Dispatch<SetStateAction<AttachmentPreview>>;
  showMentionSuggestions: boolean;
  setShowMentionSuggestions: Dispatch<SetStateAction<boolean>>;
  mentionQuery: string;
  setMentionQuery: Dispatch<SetStateAction<string>>;
  usersDirectory: DirectoryUser[];
  user: CurrentUser;
  setMentionedUsers: Dispatch<SetStateAction<string[]>>;
  selectedConversation: SelectedConversation;
  broadcastTypingStatus: (payload: { isTyping: boolean; isRecording: boolean }) => void;
  typingStopTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  sendChatMessage: (payload: any) => Promise<unknown>;
  recordingTime: number;
  replyingTo: any;
  setLastReplyTo: Dispatch<SetStateAction<any>>;
  setReplyingTo: Dispatch<SetStateAction<any>>;
  playMessageSendSound: () => void;
  setSimulatedTyping: Dispatch<SetStateAction<any>>;
  isRecording: boolean;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setRecordingTime: Dispatch<SetStateAction<number>>;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  audioChunksRef: MutableRefObject<Blob[]>;
};

export function AppEmailComposerInputBar({
  theme,
  isCompactEmojiLayout,
  showEmojiPicker,
  setShowEmojiPicker,
  showLiveReactionPicker,
  setShowLiveReactionPicker,
  registerRecentEmoji,
  broadcastLiveReaction,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedChatMessages,
  showFormattingToolbar,
  setShowFormattingToolbar,
  composerDisabled,
  newMessage,
  setNewMessage,
  attachmentPreview,
  setAttachmentPreview,
  showMentionSuggestions,
  setShowMentionSuggestions,
  mentionQuery,
  setMentionQuery,
  usersDirectory,
  user,
  setMentionedUsers,
  selectedConversation,
  broadcastTypingStatus,
  typingStopTimeoutRef,
  sendChatMessage,
  recordingTime,
  replyingTo,
  setLastReplyTo,
  setReplyingTo,
  playMessageSendSound,
  setSimulatedTyping,
  isRecording,
  setIsRecording,
  setRecordingTime,
  mediaRecorderRef,
  audioChunksRef,
}: AppEmailComposerInputBarProps) {
  return (
    <div className="flex items-end gap-2 max-w-3xl mx-auto">
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-cyan-500 text-xl">
            😀
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 shadow-xl sm:w-96" align="start" sideOffset={8}>
          <EmojiPicker
            theme={theme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
            lazyLoadEmojis
            searchPlaceholder="Rechercher un emoji..."
            previewConfig={{ showPreview: false }}
            width="100%"
            height={isCompactEmojiLayout ? 300 : 380}
            onEmojiClick={(emojiData: EmojiClickData) => {
              setNewMessage((prev) => prev + emojiData.emoji);
              registerRecentEmoji(emojiData.emoji);
              setShowEmojiPicker(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Popover open={showLiveReactionPicker} onOpenChange={setShowLiveReactionPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-slate-500 hover:text-cyan-500"
            title="Réaction live"
          >
            <Heart className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 shadow-xl sm:w-96" align="start" sideOffset={8}>
          <EmojiPicker
            theme={theme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
            lazyLoadEmojis
            searchPlaceholder="Envoyer une réaction..."
            previewConfig={{ showPreview: false }}
            width="100%"
            height={isCompactEmojiLayout ? 300 : 360}
            onEmojiClick={(emojiData: EmojiClickData) => {
              broadcastLiveReaction(emojiData.emoji, 'chat');
              setShowLiveReactionPicker(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant={isSelectionMode ? 'default' : 'ghost'}
        size="icon"
        className={`rounded-full ${isSelectionMode ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-cyan-500'}`}
        onClick={() => {
          setIsSelectionMode(!isSelectionMode);
          if (isSelectionMode) {
            setSelectedChatMessages(new Set());
          }
        }}
        title="Mode sélection"
      >
        <CheckSquare className="w-5 h-5" />
      </Button>

      <Button
        variant={showFormattingToolbar ? 'default' : 'ghost'}
        size="icon"
        className={`rounded-full ${showFormattingToolbar ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:text-cyan-500'}`}
        onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
        title="Formatage du texte"
      >
        <Type className="w-5 h-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-cyan-500" disabled={composerDisabled}>
            <Paperclip className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setAttachmentPreview({ file, preview: event.target?.result as string, type: 'image', fileType: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            <ImageIcon className="w-4 h-4 mr-2 text-purple-500" />Image
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'video/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setAttachmentPreview({ file, preview: event.target?.result as string, type: 'video', fileType: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            <Film className="w-4 h-4 mr-2 text-red-500" />Vidéo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept =
                '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setAttachmentPreview({ file, preview: event.target?.result as string, type: 'document', fileType: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            <File className="w-4 h-4 mr-2 text-blue-500" />Document
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'audio/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setAttachmentPreview({ file, preview: event.target?.result as string, type: 'audio', fileType: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            <Mic className="w-4 h-4 mr-2 text-green-500" />Audio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 relative">
        {showMentionSuggestions && (
          <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-slate-800 border rounded-t-lg shadow-lg max-h-40 overflow-y-auto z-10">
            {usersDirectory
              .filter((directoryUser) => directoryUser.id !== user?.id && directoryUser.name.toLowerCase().includes(mentionQuery.toLowerCase()))
              .slice(0, 5)
              .map((directoryUser) => (
                <button
                  key={directoryUser.id}
                  className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => {
                    setNewMessage((prev) => prev.slice(0, -mentionQuery.length - 1) + `@${directoryUser.name} `);
                    setShowMentionSuggestions(false);
                    setMentionedUsers((prev) => [...prev, directoryUser.id]);
                  }}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-cyan-500 text-white text-xs">{directoryUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{directoryUser.name}</span>
                </button>
              ))}
          </div>
        )}

        <Input
          placeholder={composerDisabled ? 'Seuls les admins/responsables peuvent publier des annonces' : 'Écrire un message...'}
          value={newMessage}
          disabled={composerDisabled}
          onChange={(e) => {
            const value = e.target.value;
            setNewMessage(value);

            if (selectedConversation && user?.id && user?.name) {
              broadcastTypingStatus({
                isTyping: value.trim().length > 0,
                isRecording: false,
              });

              if (typingStopTimeoutRef.current) {
                clearTimeout(typingStopTimeoutRef.current);
              }

              if (value.trim().length > 0) {
                typingStopTimeoutRef.current = setTimeout(() => {
                  broadcastTypingStatus({
                    isTyping: false,
                    isRecording: false,
                  });
                }, 1200);
              }
            }

            const lastAtIndex = value.lastIndexOf('@');
            if (lastAtIndex !== -1) {
              const textAfterAt = value.slice(lastAtIndex + 1);
              if (!textAfterAt.includes(' ')) {
                setMentionQuery(textAfterAt);
                setShowMentionSuggestions(true);
              } else {
                setShowMentionSuggestions(false);
              }
            } else {
              setShowMentionSuggestions(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
              e.preventDefault();
              if (typingStopTimeoutRef.current) {
                clearTimeout(typingStopTimeoutRef.current);
                typingStopTimeoutRef.current = null;
              }
              if (selectedConversation && user?.id && user?.name) {
                broadcastTypingStatus({
                  isTyping: false,
                  isRecording: false,
                });
              }
              const { file, preview, type, fileType } = attachmentPreview;
              const messageType = (type === 'audio' ? 'voice' : (type || 'text')) as ChatMessageType;
              void sendChatMessage({
                conversationId: selectedConversation?.id || '',
                senderId: user?.id || '',
                senderName: user?.name || '',
                senderAvatar: user?.avatar,
                type: messageType,
                content: newMessage.trim(),
                mediaData: preview || undefined,
                fileName: file?.name,
                fileSize: file?.size,
                fileType: fileType || file?.type,
                duration: messageType === 'voice' ? recordingTime : undefined,
                replyTo: replyingTo || undefined,
                isEdited: false,
                isDeleted: false,
                deletedForEveryone: false,
                isPinned: false,
                isArchived: false,
                reactions: [],
                readBy: [],
              });
              setNewMessage('');
              setAttachmentPreview({ file: null, preview: null, type: null, fileType: undefined });
              setLastReplyTo(replyingTo);
              setReplyingTo(null);
              setMentionedUsers([]);
              playMessageSendSound();
              setTimeout(() => {
                if (selectedConversation?.type === 'individual') {
                  const otherUser = selectedConversation.participants.find((participant) => participant.id !== user?.id);
                  if (otherUser) {
                    setSimulatedTyping({ userId: otherUser.id, userName: otherUser.name, isRecording: false });
                    setTimeout(() => setSimulatedTyping(null), 3000);
                  }
                }
              }, 2000);
            }
          }}
          className="w-full rounded-full border-0 bg-white dark:bg-slate-700 px-4 py-2"
        />
      </div>

      {newMessage.trim() || attachmentPreview.file ? (
        <Button
          className="rounded-full bg-cyan-500 hover:bg-cyan-600 text-white h-10 w-10 p-0"
          disabled={composerDisabled}
          onClick={async () => {
            if (typingStopTimeoutRef.current) {
              clearTimeout(typingStopTimeoutRef.current);
              typingStopTimeoutRef.current = null;
            }
            if (selectedConversation && user?.id && user?.name) {
              broadcastTypingStatus({
                isTyping: false,
                isRecording: false,
              });
            }
            const { file, preview, type, fileType } = attachmentPreview;
            const messageType = (type === 'audio' ? 'voice' : (type || 'text')) as ChatMessageType;
            let mediaData = preview;
            if (file && !preview) {
              const reader = new FileReader();
              reader.onload = async (event) => {
                mediaData = event.target?.result as string;
                await sendChatMessage({
                  conversationId: selectedConversation?.id || '',
                  senderId: user?.id || '',
                  senderName: user?.name || '',
                  senderAvatar: user?.avatar,
                  type: messageType,
                  content: newMessage.trim(),
                  mediaData: mediaData || undefined,
                  fileName: file?.name,
                  fileSize: file?.size,
                  fileType: fileType || file?.type,
                  duration: messageType === 'voice' ? recordingTime : undefined,
                  replyTo: replyingTo || undefined,
                  isEdited: false,
                  isDeleted: false,
                  deletedForEveryone: false,
                  isPinned: false,
                  isArchived: false,
                  reactions: [],
                  readBy: [],
                });
                setNewMessage('');
                setAttachmentPreview({ file: null, preview: null, type: null, fileType: undefined });
                setLastReplyTo(replyingTo);
                setReplyingTo(null);
                setMentionedUsers([]);
                playMessageSendSound();
                setTimeout(() => {
                  if (selectedConversation?.type === 'individual') {
                    const otherUser = selectedConversation.participants.find((participant) => participant.id !== user?.id);
                    if (otherUser) {
                      setSimulatedTyping({ userId: otherUser.id, userName: otherUser.name, isRecording: false });
                      setTimeout(() => setSimulatedTyping(null), 3000);
                    }
                  }
                }, 2000);
              };
              reader.readAsDataURL(file);
            } else {
              await sendChatMessage({
                conversationId: selectedConversation?.id || '',
                senderId: user?.id || '',
                senderName: user?.name || '',
                senderAvatar: user?.avatar,
                type: messageType,
                content: newMessage.trim(),
                mediaData: mediaData || undefined,
                fileName: file?.name,
                fileSize: file?.size,
                fileType: fileType || file?.type,
                duration: messageType === 'voice' ? recordingTime : undefined,
                replyTo: replyingTo || undefined,
                isEdited: false,
                isDeleted: false,
                deletedForEveryone: false,
                isPinned: false,
                isArchived: false,
                reactions: [],
                readBy: [],
              });
              setNewMessage('');
              setAttachmentPreview({ file: null, preview: null, type: null, fileType: undefined });
              setLastReplyTo(replyingTo);
              setReplyingTo(null);
              setMentionedUsers([]);
              playMessageSendSound();
              setTimeout(() => {
                if (selectedConversation?.type === 'individual') {
                  const otherUser = selectedConversation.participants.find((participant) => participant.id !== user?.id);
                  if (otherUser) {
                    setSimulatedTyping({ userId: otherUser.id, userName: otherUser.name, isRecording: false });
                    setTimeout(() => setSimulatedTyping(null), 3000);
                  }
                }
              }, 2000);
            }
          }}
        >
          <Send className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          className={`rounded-full h-10 w-10 p-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-cyan-500 hover:bg-cyan-600'} text-white`}
          onMouseDown={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
                }
              };

              mediaRecorder.start();
              setIsRecording(true);
              setRecordingTime(0);
              broadcastTypingStatus({ isTyping: true, isRecording: true });
            } catch {
              toast.error('Erreur microphone', { description: "Impossible d'accéder au microphone" });
            }
          }}
          onMouseUp={() => {
            if (mediaRecorderRef.current && isRecording) {
              mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                  const audioData = reader.result as string;
                  if (recordingTime > 0) {
                    void sendChatMessage({
                      conversationId: selectedConversation?.id || '',
                      senderId: user?.id || '',
                      senderName: user?.name || '',
                      senderAvatar: user?.avatar,
                      type: 'voice',
                      content: '',
                      mediaUrl: audioData,
                      duration: recordingTime,
                      status: 'sent',
                      isEdited: false,
                      isDeleted: false,
                      deletedForEveryone: false,
                      isPinned: false,
                      isArchived: false,
                      reactions: [],
                      readBy: [],
                    });
                    playMessageSendSound();
                  }
                };
                reader.readAsDataURL(audioBlob);
              };
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            }
            broadcastTypingStatus({ isTyping: false, isRecording: false });
            setIsRecording(false);
            setRecordingTime(0);
          }}
          onMouseLeave={() => {
            if (isRecording && mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            }
            broadcastTypingStatus({ isTyping: false, isRecording: false });
            setIsRecording(false);
            setRecordingTime(0);
          }}
        >
          {isRecording ? <span className="text-xs font-medium">{recordingTime}s</span> : <Mic className="w-5 h-5" />}
        </Button>
      )}
    </div>
  );
}
