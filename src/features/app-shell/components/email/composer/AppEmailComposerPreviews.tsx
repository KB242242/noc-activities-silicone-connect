import type { Dispatch, SetStateAction } from 'react';
import { File, Reply, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/features/app-shell/core/shared/types';

type AttachmentPreview = {
  file: File | null;
  preview: string | null;
  type: 'image' | 'video' | 'document' | 'audio' | null;
  fileType?: string;
};

type AppEmailComposerPreviewsProps = {
  replyingTo: ChatMessage | null;
  setReplyingTo: Dispatch<SetStateAction<ChatMessage | null>>;
  attachmentPreview: AttachmentPreview;
  setAttachmentPreview: Dispatch<SetStateAction<AttachmentPreview>>;
};

export function AppEmailComposerPreviews({
  replyingTo,
  setReplyingTo,
  attachmentPreview,
  setAttachmentPreview,
}: AppEmailComposerPreviewsProps) {
  return (
    <>
      {replyingTo && (
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2">
          <Reply className="w-4 h-4 text-cyan-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-600 font-medium">Répondre à {replyingTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {attachmentPreview.file && (
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2">
          {attachmentPreview.type === 'image' && attachmentPreview.preview && (
            <img src={attachmentPreview.preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
          )}
          {attachmentPreview.type === 'video' && attachmentPreview.preview && (
            <video src={attachmentPreview.preview} className="w-16 h-16 object-cover rounded" />
          )}
          {attachmentPreview.type === 'document' && <File className="w-8 h-8 text-cyan-500" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-600 font-medium truncate">{attachmentPreview.file?.name}</p>
            <p className="text-xs text-muted-foreground">
              {attachmentPreview.file?.size ? `${(attachmentPreview.file.size / 1024).toFixed(1)} KB` : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setAttachmentPreview({ file: null, preview: null, type: null })}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  );
}
