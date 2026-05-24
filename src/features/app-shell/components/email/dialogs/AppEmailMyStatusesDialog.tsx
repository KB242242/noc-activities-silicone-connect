import type { Dispatch, SetStateAction } from 'react';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Eye as EyeIcon, Heart, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type StatusBase = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Date;
  views: Array<{ userId: string; viewedAt: Date }>;
  likes: Array<{ userId: string; userName: string }>;
};

type AppEmailMyStatusesDialogProps<TStatus extends StatusBase> = {
  myStatusesOpen: boolean;
  setMyStatusesOpen: Dispatch<SetStateAction<boolean>>;
  statusList: TStatus[];
  currentUserId?: string;
  setCreateStatusOpen: Dispatch<SetStateAction<boolean>>;
  setViewingUserStatuses: Dispatch<SetStateAction<TStatus[]>>;
  setViewingStatusIndex: Dispatch<SetStateAction<number>>;
  setViewingStatus: Dispatch<SetStateAction<TStatus | null>>;
  setStatusViewOpen: Dispatch<SetStateAction<boolean>>;
  setStatusList: Dispatch<SetStateAction<TStatus[]>>;
  onStatusDeleted: () => void;
};

export function AppEmailMyStatusesDialog<TStatus extends StatusBase>({
  myStatusesOpen,
  setMyStatusesOpen,
  statusList,
  currentUserId,
  setCreateStatusOpen,
  setViewingUserStatuses,
  setViewingStatusIndex,
  setViewingStatus,
  setStatusViewOpen,
  setStatusList,
  onStatusDeleted,
}: AppEmailMyStatusesDialogProps<TStatus>) {
  const myStatuses = statusList
    .filter((status) => status.userId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Dialog open={myStatusesOpen} onOpenChange={setMyStatusesOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EyeIcon className="w-5 h-5 text-cyan-500" />
            Mes statuts
          </DialogTitle>
          <DialogDescription>
            Gérez vos statuts publiés (disparaissent après 24h)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {myStatuses.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-muted-foreground">Aucun statut publié</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setMyStatusesOpen(false);
                  setCreateStatusOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Créer un statut
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-100 overflow-y-auto">
              {myStatuses.map((status) => {
                const timeLeft = Math.max(
                  0,
                  24 - Math.floor((Date.now() - new Date(status.createdAt).getTime()) / (1000 * 60 * 60))
                );

                return (
                  <div key={status.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      {status.mediaType === 'image' ? (
                        <img src={status.mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={status.mediaUrl} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(status.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Expire dans {timeLeft}h</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <EyeIcon className="w-3 h-3" /> {status.views.length}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {status.likes.length}
                        </span>
                      </div>
                      {status.caption && <p className="text-sm mt-1 truncate">{status.caption}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setViewingUserStatuses([status]);
                          setViewingStatusIndex(0);
                          setViewingStatus(status);
                          setMyStatusesOpen(false);
                          setStatusViewOpen(true);
                        }}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setStatusList((prev) => prev.filter((item) => item.id !== status.id));
                          onStatusDeleted();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMyStatusesOpen(false)}>
            Fermer
          </Button>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600"
            onClick={() => {
              setMyStatusesOpen(false);
              setCreateStatusOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Nouveau statut
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
