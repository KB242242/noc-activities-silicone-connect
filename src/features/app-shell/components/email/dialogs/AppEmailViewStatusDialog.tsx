import type { Dispatch, SetStateAction } from 'react';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye as EyeIcon, Heart, Users, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type StatusViewBase = {
  id: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Date;
  views: Array<{ userId: string; viewedAt: Date }>;
  likes: Array<{ userId: string; userName: string }>;
};

type CurrentUser = {
  id?: string;
  name?: string;
} | null;

type AppEmailViewStatusDialogProps<TStatus extends StatusViewBase> = {
  statusViewOpen: boolean;
  setStatusViewOpen: Dispatch<SetStateAction<boolean>>;
  viewingStatus: TStatus | null;
  setViewingStatus: Dispatch<SetStateAction<TStatus | null>>;
  viewingStatusIndex: number;
  setViewingStatusIndex: Dispatch<SetStateAction<number>>;
  viewingUserStatuses: TStatus[];
  setStatusList: Dispatch<SetStateAction<TStatus[]>>;
  currentUser: CurrentUser;
  showStatusDetails: boolean;
  setShowStatusDetails: Dispatch<SetStateAction<boolean>>;
  onLikeSuccess?: () => void;
};

export function AppEmailViewStatusDialog<TStatus extends StatusViewBase>({
  statusViewOpen,
  setStatusViewOpen,
  viewingStatus,
  setViewingStatus,
  viewingStatusIndex,
  setViewingStatusIndex,
  viewingUserStatuses,
  setStatusList,
  currentUser,
  showStatusDetails,
  setShowStatusDetails,
  onLikeSuccess,
}: AppEmailViewStatusDialogProps<TStatus>) {
  return (
    <Dialog open={statusViewOpen} onOpenChange={setStatusViewOpen}>
      <DialogContent className="max-w-lg p-0 bg-black border-0 h-[85vh] max-h-[85vh]">
        {viewingStatus && (
          <div className="relative h-full flex flex-col">
            {viewingUserStatuses.length > 1 && (
              <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
                {viewingUserStatuses.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full ${idx <= viewingStatusIndex ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            )}

            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
                <Avatar className="w-8 h-8">
                  {viewingStatus.userAvatar ? <AvatarImage src={viewingStatus.userAvatar} /> : null}
                  <AvatarFallback className="bg-cyan-500 text-white">
                    {viewingStatus.userName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-white">
                  <p className="text-sm font-medium">{viewingStatus.userName}</p>
                  <p className="text-xs text-white/70">{format(viewingStatus.createdAt, 'HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-black/50"
                  onClick={() => setShowStatusDetails(!showStatusDetails)}
                  title="Voir les détails"
                >
                  <Users className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-black/50"
                  onClick={() => setStatusViewOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black">
              {viewingStatus.mediaType === 'image' ? (
                <img src={viewingStatus.mediaUrl} alt="Status" className="max-w-full max-h-full object-contain" />
              ) : (
                <video src={viewingStatus.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
              )}
            </div>

            {viewingStatus.caption && (
              <div className="absolute bottom-20 left-4 right-4 z-10">
                <p className="text-white text-center text-lg bg-black/50 rounded-lg px-4 py-2">
                  {viewingStatus.caption}
                </p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-black/30 rounded-full px-4 py-2">
              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 text-white/70 hover:text-white">
                      <EyeIcon className="w-4 h-4" />
                      <span className="text-sm">{viewingStatus.views.length}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 bg-slate-900 border-slate-700">
                    <div className="p-3 border-b border-slate-700">
                      <p className="font-medium text-white text-sm">Vues ({viewingStatus.views.length})</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {viewingStatus.views.length === 0 ? (
                        <p className="text-slate-400 text-sm p-3 text-center">Aucune vue</p>
                      ) : (
                        viewingStatus.views.map((view, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 hover:bg-slate-800">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-cyan-600 text-white text-xs">
                                {view.userId?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white">{view.userId}</span>
                            <span className="text-xs text-slate-400 ml-auto">
                              {format(new Date(view.viewedAt), 'HH:mm')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 text-white/70 hover:text-white">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{viewingStatus.likes.length}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 bg-slate-900 border-slate-700">
                    <div className="p-3 border-b border-slate-700">
                      <p className="font-medium text-white text-sm">J'aime ({viewingStatus.likes.length})</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {viewingStatus.likes.length === 0 ? (
                        <p className="text-slate-400 text-sm p-3 text-center">Aucun like</p>
                      ) : (
                        viewingStatus.likes.map((like, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 hover:bg-slate-800">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-pink-600 text-white text-xs">
                                {like.userName?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white">{like.userName}</span>
                            {like.userId === currentUser?.id && (
                              <Badge variant="secondary" className="text-xs">
                                Vous
                              </Badge>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={() => {
                  const isLiked = viewingStatus.likes.some((like) => like.userId === currentUser?.id);
                  setStatusList((prev) =>
                    prev.map((status) =>
                      status.id === viewingStatus.id
                        ? {
                            ...status,
                            likes: isLiked
                              ? status.likes.filter((like) => like.userId !== currentUser?.id)
                              : [
                                  ...status.likes,
                                  { userId: currentUser?.id || '', userName: currentUser?.name || '' },
                                ],
                          }
                        : status
                    )
                  );
                  setViewingStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          likes: isLiked
                            ? prev.likes.filter((like) => like.userId !== currentUser?.id)
                            : [...prev.likes, { userId: currentUser?.id || '', userName: currentUser?.name || '' }],
                        }
                      : null
                  );
                  if (!isLiked) {
                    onLikeSuccess?.();
                  }
                }}
              >
                <Heart
                  className={`w-5 h-5 mr-1 ${
                    viewingStatus.likes.some((like) => like.userId === currentUser?.id)
                      ? 'fill-red-500 text-red-500'
                      : ''
                  }`}
                />
                J'aime
              </Button>
            </div>

            {viewingUserStatuses.length > 1 && (
              <>
                {viewingStatusIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 z-20"
                    onClick={() => {
                      const newIndex = viewingStatusIndex - 1;
                      setViewingStatusIndex(newIndex);
                      setViewingStatus(viewingUserStatuses[newIndex]);
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                )}
                {viewingStatusIndex < viewingUserStatuses.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-black/50 z-20"
                    onClick={() => {
                      const newIndex = viewingStatusIndex + 1;
                      setViewingStatusIndex(newIndex);
                      setViewingStatus(viewingUserStatuses[newIndex]);
                    }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
