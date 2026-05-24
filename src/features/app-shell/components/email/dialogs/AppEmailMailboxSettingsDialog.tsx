import { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';

type DisplayDensity = 'compact' | 'default' | 'comfortable';

type AppEmailMailboxSettingsDialogProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  displayDensity: DisplayDensity;
  setDisplayDensity: Dispatch<SetStateAction<DisplayDensity>>;
  emailSettings: any;
  setEmailSettings: Dispatch<SetStateAction<any>>;
  vacationResponder: any;
  setVacationResponder: Dispatch<SetStateAction<any>>;
  emailNotifications: any;
  setEmailNotifications: Dispatch<SetStateAction<any>>;
};

export function AppEmailMailboxSettingsDialog({
  open,
  setOpen,
  theme,
  setTheme,
  displayDensity,
  setDisplayDensity,
  emailSettings,
  setEmailSettings,
  vacationResponder,
  setVacationResponder,
  emailNotifications,
  setEmailNotifications,
}: AppEmailMailboxSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Paramètres de messagerie</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Apparence</h4>
              <div className="flex gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>Clair</Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>Sombre</Button>
                <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>Système</Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Densité d'affichage</h4>
              <Select value={displayDensity} onValueChange={(value) => setDisplayDensity(value as DisplayDensity)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="default">Par défaut</SelectItem>
                  <SelectItem value="comfortable">Confortable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Signature</h4>
              <Textarea value={emailSettings.signature} onChange={(event) => setEmailSettings((prev: any) => ({ ...prev, signature: event.target.value }))} className="min-h-25" />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Répondeur d'absence</h4>
                <Switch checked={vacationResponder.enabled} onCheckedChange={(checked) => setVacationResponder((prev: any) => ({ ...prev, enabled: checked }))} />
              </div>
              {vacationResponder.enabled && (
                <div className="space-y-2">
                  <Input value={vacationResponder.subject} onChange={(event) => setVacationResponder((prev: any) => ({ ...prev, subject: event.target.value }))} placeholder="Objet..." />
                  <Textarea value={vacationResponder.body} onChange={(event) => setVacationResponder((prev: any) => ({ ...prev, body: event.target.value }))} placeholder="Message d'absence..." />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Notifications</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sons</Label>
                  <Switch checked={emailNotifications.soundEnabled} onCheckedChange={(checked) => setEmailNotifications((prev: any) => ({ ...prev, soundEnabled: checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Notifications navigateur</Label>
                  <Switch checked={emailNotifications.browserNotifications} onCheckedChange={(checked) => setEmailNotifications((prev: any) => ({ ...prev, browserNotifications: checked }))} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast.success('Paramètres enregistrés');
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
