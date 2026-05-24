import type { Dispatch, SetStateAction } from 'react';

import { Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type AppEmailEditMessageDialogProps = {
  editMessageDialogOpen: boolean;
  setEditMessageDialogOpen: Dispatch<SetStateAction<boolean>>;
  editMessageContent: string;
  setEditMessageContent: Dispatch<SetStateAction<string>>;
  onSave: () => void | Promise<void>;
};

export function AppEmailEditMessageDialog({
  editMessageDialogOpen,
  setEditMessageDialogOpen,
  editMessageContent,
  setEditMessageContent,
  onSave,
}: AppEmailEditMessageDialogProps) {
  return (
    <Dialog open={editMessageDialogOpen} onOpenChange={setEditMessageDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-cyan-500" />
            Modifier le message
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={editMessageContent}
            onChange={(event) => setEditMessageContent(event.target.value)}
            placeholder="Votre message..."
            className="min-h-25"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={onSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
