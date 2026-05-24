import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TicketActionType = 'delete' | 'permanent' | 'restore';

type DeleteTargetTicket = {
  id: string;
  numero: string;
  objet: string;
};

type AppTicketsDeleteConfirmDialogProps<T extends DeleteTargetTicket> = {
  open: boolean;
  deletePermanent: boolean;
  deleteTarget: T | null;
  isTicketActionBusy: (action: TicketActionType, ticketId: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: (ticket: T, permanent: boolean) => void;
};

export function AppTicketsDeleteConfirmDialog<T extends DeleteTargetTicket>({
  open,
  deletePermanent,
  deleteTarget,
  isTicketActionBusy,
  onOpenChange,
  onCancel,
  onConfirm,
}: AppTicketsDeleteConfirmDialogProps<T>) {
  const actionType: TicketActionType = deletePermanent ? 'permanent' : 'delete';
  const isBusy = deleteTarget ? isTicketActionBusy(actionType, deleteTarget.id) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-2 bg-white dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>
            {deletePermanent ? 'Supprimer définitivement ce ticket ?' : 'Déplacer ce ticket dans la corbeille ?'}
          </DialogTitle>
          <DialogDescription>
            {deletePermanent
              ? 'Cette action est irréversible.'
              : 'Le ticket sera déplacé dans la corbeille et restera restaurable pendant la durée de rétention.'}
          </DialogDescription>
        </DialogHeader>

        {deleteTarget ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Ticket concerné: <span className="font-semibold">{deleteTarget.numero}</span> - {deleteTarget.objet}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isBusy}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!deleteTarget) return;
              onConfirm(deleteTarget, deletePermanent);
            }}
            disabled={!deleteTarget || isBusy}
          >
            {isBusy ? 'Suppression...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
