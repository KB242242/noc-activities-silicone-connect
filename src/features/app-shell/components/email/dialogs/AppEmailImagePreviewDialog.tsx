import type { Dispatch, SetStateAction } from 'react';

import { Download, Forward, Maximize2, Minimize2, Pin, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChatMessage } from '@/features/app-shell/types';
import { toast } from '@/lib/toast';

type ChatImagePreview = {
  url: string;
  fileName?: string;
  message: ChatMessage;
} | null;

type AppEmailImagePreviewDialogProps = {
  chatImagePreview: ChatImagePreview;
  setChatImagePreview: Dispatch<SetStateAction<ChatImagePreview>>;
  chatImageZoom: number;
  setChatImageZoom: Dispatch<SetStateAction<number>>;
  userId?: string;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPinnedMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  updateChatMessage: (
    conversationId: string,
    messageId: string,
    action: 'togglePin' | 'deleteForEveryone' | 'deleteForMe',
    payload?: Record<string, unknown>
  ) => Promise<unknown>;
};

export function AppEmailImagePreviewDialog({
  chatImagePreview,
  setChatImagePreview,
  chatImageZoom,
  setChatImageZoom,
  userId,
  setChatMessages,
  setPinnedMessages,
  updateChatMessage,
}: AppEmailImagePreviewDialogProps) {
  return (
    <Dialog
      open={Boolean(chatImagePreview)}
      onOpenChange={(open) => {
        if (!open) {
          setChatImagePreview(null);
          setChatImageZoom(1);
        }
      }}
    >
      <DialogContent className="max-w-6xl w-[96vw] p-2 sm:p-4 bg-black/95 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-sm sm:text-base truncate pr-8">
            {chatImagePreview?.fileName || 'Aperçu image'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-700/70">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-slate-100 border-slate-600 hover:bg-slate-800"
            onClick={async () => {
              if (!chatImagePreview?.url) return;
              try {
                const absoluteUrl = chatImagePreview.url.startsWith('http')
                  ? chatImagePreview.url
                  : `${window.location.origin}${chatImagePreview.url}`;

                if (navigator.share) {
                  await navigator.share({
                    title: chatImagePreview.fileName || 'Image',
                    url: absoluteUrl,
                  });
                } else if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(absoluteUrl);
                  toast.success('Lien copié pour transfert');
                } else {
                  window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
                }
              } catch {
                toast.error('Transfert annulé ou indisponible');
              }
            }}
          >
            <Forward className="w-4 h-4 mr-1" /> Transférer
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-slate-100 border-slate-600 hover:bg-slate-800"
            onClick={() => {
              if (!chatImagePreview?.url) return;
              const link = document.createElement('a');
              link.href = chatImagePreview.url;
              link.download = chatImagePreview.fileName || `image-${chatImagePreview.message.id}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success('Téléchargement lancé');
            }}
          >
            <Download className="w-4 h-4 mr-1" /> Télécharger
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-slate-100 border-slate-600 hover:bg-slate-800"
            onClick={() => setChatImageZoom((prev) => (prev > 1 ? 1 : 1.8))}
          >
            {chatImageZoom > 1 ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />} Zoomer
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-slate-100 border-slate-600 hover:bg-slate-800"
            onClick={async () => {
              if (!chatImagePreview?.message) return;
              const message = chatImagePreview.message;
              const nextPinned = !message.isPinned;

              setChatMessages((prev) =>
                prev.map((m) => (m.id === message.id ? { ...m, isPinned: nextPinned } : m))
              );

              setPinnedMessages((prev) => {
                if (!nextPinned) {
                  return prev.filter((m) => m.id !== message.id);
                }
                const updated = { ...message, isPinned: true };
                if (prev.some((m) => m.id === message.id)) {
                  return prev.map((m) => (m.id === message.id ? updated : m));
                }
                return [...prev, updated];
              });

              await updateChatMessage(message.conversationId, message.id, 'togglePin', { isPinned: nextPinned });

              setChatImagePreview((prev) =>
                prev ? { ...prev, message: { ...prev.message, isPinned: nextPinned } } : prev
              );

              toast.success(nextPinned ? 'Image épinglée' : 'Image désépinglée');
            }}
          >
            <Pin className="w-4 h-4 mr-1" />
            {chatImagePreview?.message?.isPinned ? 'Désépingler' : 'Épingler'}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={async () => {
              if (!chatImagePreview?.message || !userId) return;
              const message = chatImagePreview.message;

              if (message.senderId === userId) {
                const minutesPassed = (Date.now() - new Date(message.createdAt).getTime()) / 60000;

                if (minutesPassed <= 10) {
                  setChatMessages((prev) =>
                    prev.map((m) => (m.id === message.id ? { ...m, deletedForEveryone: true } : m))
                  );
                  await updateChatMessage(message.conversationId, message.id, 'deleteForEveryone');
                  toast.success('Image supprimée pour tous');
                } else {
                  setChatMessages((prev) =>
                    prev.map((m) => (m.id === message.id ? { ...m, isDeleted: true } : m))
                  );
                  await updateChatMessage(message.conversationId, message.id, 'deleteForMe');
                  toast.success('Image supprimée pour vous');
                }
              } else {
                setChatMessages((prev) =>
                  prev.map((m) => (m.id === message.id ? { ...m, isDeleted: true } : m))
                );
                await updateChatMessage(message.conversationId, message.id, 'deleteForMe');
                toast.success('Image supprimée pour vous');
              }

              setChatImagePreview(null);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Supprimer
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-slate-100 hover:bg-slate-800"
            onClick={() => {
              setChatImagePreview(null);
              setChatImageZoom(1);
            }}
          >
            <X className="w-4 h-4 mr-1" /> Fermer
          </Button>
        </div>

        <div className="flex items-center justify-center max-h-[80vh] overflow-auto py-2">
          {chatImagePreview?.url ? (
            <img
              src={chatImagePreview.url}
              alt={chatImagePreview.fileName || 'Aperçu image'}
              className="max-w-full max-h-[75vh] object-contain rounded transition-transform duration-200"
              style={{ transform: `scale(${chatImageZoom})` }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
