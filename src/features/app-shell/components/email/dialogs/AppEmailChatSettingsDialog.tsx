import type { Dispatch, SetStateAction } from 'react';

import { Image as ImageIcon, RotateCcw, Settings, Upload, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type AppEmailChatSettingsDialogProps = {
  backgroundSettingsOpen: boolean;
  setBackgroundSettingsOpen: Dispatch<SetStateAction<boolean>>;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  soundOnSend: boolean;
  setSoundOnSend: Dispatch<SetStateAction<boolean>>;
  soundOnReceive: boolean;
  setSoundOnReceive: Dispatch<SetStateAction<boolean>>;
  soundOnNotification: boolean;
  setSoundOnNotification: Dispatch<SetStateAction<boolean>>;
  handleSetBackground: (imageUrl: string | null) => void;
};

export function AppEmailChatSettingsDialog({
  backgroundSettingsOpen,
  setBackgroundSettingsOpen,
  soundEnabled,
  setSoundEnabled,
  soundOnSend,
  setSoundOnSend,
  soundOnReceive,
  setSoundOnReceive,
  soundOnNotification,
  setSoundOnNotification,
  handleSetBackground,
}: AppEmailChatSettingsDialogProps) {
  return (
    <Dialog open={backgroundSettingsOpen} onOpenChange={setBackgroundSettingsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-500" />
            Paramètres du Chat
          </DialogTitle>
          <DialogDescription>Personnalisez votre expérience de messagerie</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-500" />
              Sons
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Activer les sons</Label>
                <Checkbox checked={soundEnabled} onCheckedChange={(checked) => setSoundEnabled(checked as boolean)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground ml-4">Son envoi message</Label>
                <Checkbox
                  checked={soundOnSend}
                  onCheckedChange={(checked) => setSoundOnSend(checked as boolean)}
                  disabled={!soundEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground ml-4">Son reception message</Label>
                <Checkbox
                  checked={soundOnReceive}
                  onCheckedChange={(checked) => setSoundOnReceive(checked as boolean)}
                  disabled={!soundEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground ml-4">Son notifications</Label>
                <Checkbox
                  checked={soundOnNotification}
                  onCheckedChange={(checked) => setSoundOnNotification(checked as boolean)}
                  disabled={!soundEnabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-500" />
              Fond d'ecran
            </h4>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (event) => {
                    const file = (event.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (readerEvent) => {
                        handleSetBackground(readerEvent.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4" />
                Choisir une image de fond
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-cyan-600"
                onClick={() => handleSetBackground(null)}
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser (logo par défaut)
              </Button>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <button
                  onClick={() => handleSetBackground('pattern-dots')}
                  className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                  style={{ backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                />
                <button
                  onClick={() => handleSetBackground('pattern-lines')}
                  className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00BCD4 0, #00BCD4 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}
                />
                <button
                  onClick={() => handleSetBackground('pattern-grid')}
                  className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800"
                  style={{ backgroundImage: 'linear-gradient(#00BCD4 1px, transparent 1px), linear-gradient(90deg, #00BCD4 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />
                <button
                  onClick={() => handleSetBackground('pattern-circuit')}
                  className="aspect-square rounded-lg border-2 hover:border-cyan-500 p-1 bg-slate-100 dark:bg-slate-800 overflow-hidden"
                >
                  <img src="/logo_noc_activities_sans_fond.png" alt="Circuit" className="w-full h-full object-contain opacity-50" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Choisissez un motif de fond</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setBackgroundSettingsOpen(false)} className="bg-cyan-500 hover:bg-cyan-600">
            Terminé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
