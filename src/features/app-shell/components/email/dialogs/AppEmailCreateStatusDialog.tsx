import type { Dispatch, SetStateAction } from 'react';

import { Camera, Film, Image as ImageIcon, X } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Contact = {
  id: string;
  name: string;
};

type CurrentUser = {
  id: string;
} | null;

type AppEmailCreateStatusDialogProps = {
  createStatusOpen: boolean;
  setCreateStatusOpen: Dispatch<SetStateAction<boolean>>;
  statusMediaPreview: string | null;
  setStatusMediaPreview: Dispatch<SetStateAction<string | null>>;
  statusMediaType: 'image' | 'video' | null;
  setStatusMediaType: Dispatch<SetStateAction<'image' | 'video' | null>>;
  statusCaption: string;
  setStatusCaption: Dispatch<SetStateAction<string>>;
  statusBlockedContacts: string[];
  setStatusBlockedContacts: Dispatch<SetStateAction<string[]>>;
  usersDirectory: Contact[];
  currentUser: CurrentUser;
  onPublishStatus: (payload: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption: string;
    blockedUsers: string[];
  }) => void;
};

export function AppEmailCreateStatusDialog({
  createStatusOpen,
  setCreateStatusOpen,
  statusMediaPreview,
  setStatusMediaPreview,
  statusMediaType,
  setStatusMediaType,
  statusCaption,
  setStatusCaption,
  statusBlockedContacts,
  setStatusBlockedContacts,
  usersDirectory,
  currentUser,
  onPublishStatus,
}: AppEmailCreateStatusDialogProps) {
  const selectMedia = (accept: 'image/*' | 'video/*', kind: 'image' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setStatusMediaPreview(loadEvent.target?.result as string);
        setStatusMediaType(kind);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <Dialog open={createStatusOpen} onOpenChange={setCreateStatusOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-500" />
            Créer un status
          </DialogTitle>
          <DialogDescription>
            Partagez un moment avec vos collègues (disparaît après 24h)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => selectMedia('image/*', 'image')}>
              <ImageIcon className="w-4 h-4 text-purple-500" /> Image
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => selectMedia('video/*', 'video')}>
              <Film className="w-4 h-4 text-red-500" /> Vidéo
            </Button>
          </div>

          {statusMediaPreview && (
            <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              {statusMediaType === 'image' ? (
                <img src={statusMediaPreview} alt="Preview" className="w-full max-h-50 object-contain" />
              ) : (
                <video src={statusMediaPreview} controls className="w-full max-h-50" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => {
                  setStatusMediaPreview(null);
                  setStatusMediaType(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Légende (optionnel)</Label>
            <Textarea
              value={statusCaption}
              onChange={(event) => setStatusCaption(event.target.value)}
              placeholder="Ajouter une légende..."
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Visibilité</Label>
              <span className="text-xs text-muted-foreground">
                {statusBlockedContacts.length === 0
                  ? 'Tous les contacts'
                  : `${usersDirectory.filter((u) => u.id !== currentUser?.id).length - statusBlockedContacts.length} contact(s)`}
              </span>
            </div>
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">Exclure des contacts:</p>
              {usersDirectory
                .filter((u) => u.id !== currentUser?.id)
                .map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={statusBlockedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatusBlockedContacts((prev) => [...prev, contact.id]);
                          return;
                        }
                        setStatusBlockedContacts((prev) => prev.filter((id) => id !== contact.id));
                      }}
                    />
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">
                        {contact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{contact.name}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600"
            disabled={!statusMediaPreview}
            onClick={() => {
              if (!statusMediaPreview || !statusMediaType) return;
              onPublishStatus({
                mediaUrl: statusMediaPreview,
                mediaType: statusMediaType,
                caption: statusCaption,
                blockedUsers: statusBlockedContacts,
              });
              setStatusMediaPreview(null);
              setStatusMediaType(null);
              setStatusCaption('');
              setStatusBlockedContacts([]);
              setCreateStatusOpen(false);
            }}
          >
            Publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
