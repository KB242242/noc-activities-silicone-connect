import { useEffect, useState } from 'react';

import { ArrowRightLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserProfile } from '@/features/app-shell/core/shared/types';

type TransferTask = {
  id: string;
  title: string;
  userId: string;
  userName?: string;
} | null;

type AppTaskTransferDialogProps = {
  open: boolean;
  task: TransferTask;
  users: UserProfile[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetUserId: string) => Promise<void> | void;
};

export function AppTaskTransferDialog({ open, task, users, onOpenChange, onConfirm }: AppTaskTransferDialogProps) {
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    if (!open) {
      setTargetUserId('');
    }
  }, [open, task?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            Transférer la tâche
          </DialogTitle>
          <DialogDescription>
            Réattribuer {task ? `« ${task.title} »` : 'la tâche sélectionnée'} à un autre membre.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Assignée actuellement à</Label>
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              {task?.userName || 'Utilisateur inconnu'}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Nouveau membre</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((user) => user.id !== task?.userId)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={async () => {
              if (!task || !targetUserId) return;
              await onConfirm(targetUserId);
            }}
            disabled={!task || !targetUserId}
          >
            Transférer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}