import type { Dispatch, SetStateAction } from 'react';

import Cropper, { Area as CropArea } from 'react-easy-crop';
import { Camera, RotateCcw, Upload } from 'lucide-react';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type CropPosition = {
  x: number;
  y: number;
};

type AppEmailProfilePhotoCropDialogProps = {
  profilePhotoDialogOpen: boolean;
  setProfilePhotoDialogOpen: Dispatch<SetStateAction<boolean>>;
  tempProfilePhoto: string | null;
  setTempProfilePhoto: Dispatch<SetStateAction<string | null>>;
  clearTempAvatarObjectUrl: () => void;
  profileCrop: CropPosition;
  setProfileCrop: Dispatch<SetStateAction<CropPosition>>;
  profileZoom: number;
  setProfileZoom: Dispatch<SetStateAction<number>>;
  setProfileCroppedAreaPixels: Dispatch<SetStateAction<CropArea | null>>;
  handleAvatarFileSelection: (file?: File | null) => void;
  handleSaveCroppedPhoto: () => void | Promise<void>;
};

export function AppEmailProfilePhotoCropDialog({
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
}: AppEmailProfilePhotoCropDialogProps) {
  return (
    <Dialog
      open={profilePhotoDialogOpen}
      onOpenChange={(open) => {
        setProfilePhotoDialogOpen(open);
        if (!open) {
          setTempProfilePhoto(null);
          clearTempAvatarObjectUrl();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-500" />
            Ajuster votre photo de profil
          </DialogTitle>
          <DialogDescription>
            Déplacez l'image et ajustez le zoom. La zone circulaire représente votre photo de profil finale.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {tempProfilePhoto && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Zone de recadrage</Label>
                <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <Cropper
                    image={tempProfilePhoto}
                    crop={profileCrop}
                    zoom={profileZoom}
                    aspect={1}
                    cropShape="round"
                    showGrid
                    onCropChange={setProfileCrop}
                    onZoomChange={setProfileZoom}
                    onCropComplete={(_, croppedAreaPixels) => setProfileCroppedAreaPixels(croppedAreaPixels)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Aperçu final</Label>
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-32 h-32 ring-4 ring-cyan-500 ring-offset-4">
                    <AvatarImage src={tempProfilePhoto} className="object-cover" />
                  </Avatar>
                  <Avatar className="w-20 h-20 ring-2 ring-cyan-500 ring-offset-2">
                    <AvatarImage src={tempProfilePhoto} className="object-cover" />
                  </Avatar>
                  <Avatar className="w-10 h-10 ring-1 ring-cyan-500">
                    <AvatarImage src={tempProfilePhoto} className="object-cover" />
                  </Avatar>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Zoom</Label>
                <span className="text-sm text-muted-foreground">{Math.round(profileZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={profileZoom}
                onChange={(event) => setProfileZoom(parseFloat(event.target.value))}
                className="w-full accent-cyan-500 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProfileCrop({ x: 0, y: 0 });
                  setProfileZoom(1.2);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Réinitialiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (event) => {
                    handleAvatarFileSelection((event.target as HTMLInputElement).files?.[0]);
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4 mr-1" /> Changer d'image
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setProfilePhotoDialogOpen(false);
              setTempProfilePhoto(null);
              clearTempAvatarObjectUrl();
            }}
          >
            Annuler
          </Button>
          <Button onClick={handleSaveCroppedPhoto} className="bg-cyan-500 hover:bg-cyan-600">
            Enregistrer la photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
