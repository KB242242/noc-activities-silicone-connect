import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type AppAvatarViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: { src: string; name: string } | null;
};

export function AppAvatarViewerDialog({ open, onOpenChange, data }: AppAvatarViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{data?.name || 'Photo de profil'}</DialogTitle>
        </DialogHeader>
        {data?.src ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <img
              src={data.src}
              alt={data.name || 'Photo de profil'}
              className="max-h-[70vh] w-auto rounded-lg object-contain"
            />
            <Button
              onClick={() => {
                if (!data?.src) return;
                const link = document.createElement('a');
                link.href = data.src;
                link.download = `${data.name || 'photo'}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4" />
              Telecharger
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
