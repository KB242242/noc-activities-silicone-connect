import type { Dispatch, SetStateAction } from 'react';

import { AlertTriangle, Clock, Inbox, Mail, Plus, Send, Star, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

type MessageFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'spam' | 'trash';

type EmailLabel = {
  id: string;
  name: string;
  color: string;
};

type MailMessage = {
  id: string;
  folder: MessageFolder | string;
  isRead?: boolean;
  isStarred?: boolean;
};

type AppEmailMailboxSidebarProps = {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: Dispatch<SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  currentFolder: MessageFolder;
  setCurrentFolder: Dispatch<SetStateAction<MessageFolder>>;
  messages: MailMessage[];
  snoozedEmails: Map<string, Date>;
  setComposeOpen: Dispatch<SetStateAction<boolean>>;
  setReplyToMessage: Dispatch<SetStateAction<unknown>>;
  setForwardMessage: Dispatch<SetStateAction<unknown>>;
  setNewEmail: Dispatch<SetStateAction<any>>;
  setComposeMinimized: Dispatch<SetStateAction<boolean>>;
  setComposeMaximized: Dispatch<SetStateAction<boolean>>;
  emailLabels: EmailLabel[];
  labelDialogOpen: boolean;
  setLabelDialogOpen: Dispatch<SetStateAction<boolean>>;
  newLabelName: string;
  setNewLabelName: Dispatch<SetStateAction<string>>;
  newLabelColor: string;
  setNewLabelColor: Dispatch<SetStateAction<string>>;
  onCreateLabel: () => void;
};

export function AppEmailMailboxSidebar({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarCollapsed,
  currentFolder,
  setCurrentFolder,
  messages,
  snoozedEmails,
  setComposeOpen,
  setReplyToMessage,
  setForwardMessage,
  setNewEmail,
  setComposeMinimized,
  setComposeMaximized,
  emailLabels,
  labelDialogOpen,
  setLabelDialogOpen,
  newLabelName,
  setNewLabelName,
  newLabelColor,
  setNewLabelColor,
  onCreateLabel,
}: AppEmailMailboxSidebarProps) {
  const primaryFolders: Array<{ folder: MessageFolder; icon: typeof Inbox; label: string; count: number }> = [
    { folder: 'inbox', icon: Inbox, label: 'Boîte de réception', count: messages.filter((message) => message.folder === 'inbox' && !message.isRead).length },
    { folder: 'starred', icon: Star, label: 'Suivis', count: messages.filter((message) => message.isStarred).length },
  ];

  const otherFolders: Array<{ folder: MessageFolder; icon: typeof Send; label: string; count: number }> = [
    { folder: 'sent', icon: Send, label: 'Envoyés', count: messages.filter((message) => message.folder === 'sent').length },
    { folder: 'drafts', icon: Mail, label: 'Brouillons', count: messages.filter((message) => message.folder === 'drafts').length },
    { folder: 'spam', icon: AlertTriangle, label: 'Spam', count: messages.filter((message) => message.folder === 'spam').length },
    { folder: 'trash', icon: Trash2, label: 'Corbeille', count: messages.filter((message) => message.folder === 'trash').length },
  ];

  return (
    <>
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-64 border-r bg-white dark:bg-slate-900 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        <div className="p-3">
          <Button
            className={`w-full justify-start gap-2 bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-md ${sidebarCollapsed ? 'lg:px-2' : ''}`}
            onClick={() => {
              setComposeOpen(true);
              setReplyToMessage(null);
              setForwardMessage(null);
              setNewEmail({
                to: [],
                cc: [],
                bcc: [],
                subject: '',
                body: '',
                attachments: [],
                priority: 'normal',
                scheduledAt: null,
              });
              setComposeMinimized(false);
              setComposeMaximized(false);
            }}
          >
            <Plus className="w-5 h-5" />
            {!sidebarCollapsed && <span>Nouveau message</span>}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <nav className="px-2 py-1 space-y-0.5">
            {primaryFolders.map((item) => (
              <button
                key={item.folder}
                onClick={() => {
                  setCurrentFolder(item.folder);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors ${
                  currentFolder === item.folder
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count > 0 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                        {item.count}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            ))}

            <button
              onClick={() => {
                setCurrentFolder('inbox');
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <Clock className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">En attente</span>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                    {snoozedEmails.size}
                  </Badge>
                </>
              )}
            </button>

            {otherFolders.map((item) => (
              <button
                key={item.folder}
                onClick={() => {
                  setCurrentFolder(item.folder);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-colors ${
                  currentFolder === item.folder
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count > 0 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                        {item.count}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="px-3 py-2 border-t mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Libellés</p>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setLabelDialogOpen(true)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {emailLabels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="truncate">{label.name}</span>
                </button>
              ))}
              {emailLabels.length === 0 && <p className="text-xs text-muted-foreground px-2">Aucun libellé</p>}
            </div>
          )}
        </ScrollArea>

        {!sidebarCollapsed && (
          <div className="p-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{messages.filter((message) => message.folder === 'inbox').length} messages</span>
              <span>•</span>
              <span>{messages.filter((message) => message.folder === 'inbox' && !message.isRead).length} non lus</span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau libellé</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Nom du libellé</Label>
              <Input value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} placeholder="Ex: Important" />
            </div>
            <div className="grid gap-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-cyan-500' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewLabelColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                onCreateLabel();
              }}
              disabled={!newLabelName.trim()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
