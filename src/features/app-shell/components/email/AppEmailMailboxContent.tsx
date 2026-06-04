import type { Dispatch, SetStateAction } from 'react';

import {
  AlertCircle,
  Archive,
  Bell,
  ChevronLeft,
  Clock,
  File,
  Forward,
  Inbox,
  LogOut,
  Mail,
  MoreVertical,
  Paperclip,
  Plus,
  Reply,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import type { InternalMessage, UserProfile } from '@/features/app-shell/core/shared/types';

import { AppEmailComposeDialog } from '@/features/app-shell/components/email/dialogs/AppEmailComposeDialog';
import { AppEmailMailboxSettingsDialog } from '@/features/app-shell/components/email/dialogs/AppEmailMailboxSettingsDialog';

type DisplayDensity = 'compact' | 'default' | 'comfortable';

type AppEmailMailboxContentProps = {
  currentFolder: string;
  messages: InternalMessage[];
  selectedMessage: InternalMessage | null;
  setSelectedMessage: Dispatch<SetStateAction<InternalMessage | null>>;
  selectedMessages: Set<string>;
  setSelectedMessages: Dispatch<SetStateAction<Set<string>>>;
  getFilteredMessages: () => InternalMessage[];
  displayDensity: DisplayDensity;
  setDisplayDensity: Dispatch<SetStateAction<DisplayDensity>>;
  snoozedEmails: Map<string, Date>;
  setSnoozedEmails: Dispatch<SetStateAction<Map<string, Date>>>;
  importantEmails: Set<string>;
  setImportantEmails: Dispatch<SetStateAction<Set<string>>>;
  emailLabels: Array<{ id: string; name: string; color: string }>;
  setComposeOpen: Dispatch<SetStateAction<boolean>>;
  setReplyToMessage: Dispatch<SetStateAction<InternalMessage | null>>;
  setForwardMessage: Dispatch<SetStateAction<InternalMessage | null>>;
  composeOpen: boolean;
  setComposeMinimized: Dispatch<SetStateAction<boolean>>;
  composeMinimized: boolean;
  setComposeMaximized: Dispatch<SetStateAction<boolean>>;
  composeMaximized: boolean;
  replyToMessage: InternalMessage | null;
  forwardMessage: InternalMessage | null;
  newEmail: any;
  setNewEmail: Dispatch<SetStateAction<any>>;
  toInput: string;
  setToInput: Dispatch<SetStateAction<string>>;
  ccInput: string;
  setCcInput: Dispatch<SetStateAction<string>>;
  bccInput: string;
  setBccInput: Dispatch<SetStateAction<string>>;
  showCc: boolean;
  setShowCc: Dispatch<SetStateAction<boolean>>;
  showBcc: boolean;
  setShowBcc: Dispatch<SetStateAction<boolean>>;
  richTextStyle: any;
  setRichTextStyle: Dispatch<SetStateAction<any>>;
  emailSettings: any;
  setEmailSettings: Dispatch<SetStateAction<any>>;
  user: UserProfile | null;
  generateId: () => string;
  setMessages: Dispatch<SetStateAction<InternalMessage[]>>;
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  vacationResponder: any;
  setVacationResponder: Dispatch<SetStateAction<any>>;
  emailNotifications: any;
  setEmailNotifications: Dispatch<SetStateAction<any>>;
  setProfileDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleLogout: () => void;
  gmailSettingsOpen: boolean;
  setGmailSettingsOpen: Dispatch<SetStateAction<boolean>>;
  labelDialogOpen: boolean;
  setLabelDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export function AppEmailMailboxContent({
  currentFolder,
  messages,
  selectedMessage,
  setSelectedMessage,
  selectedMessages,
  setSelectedMessages,
  getFilteredMessages,
  displayDensity,
  setDisplayDensity,
  snoozedEmails,
  setSnoozedEmails,
  importantEmails,
  setImportantEmails,
  emailLabels,
  setComposeOpen,
  setReplyToMessage,
  setForwardMessage,
  composeOpen,
  setComposeMinimized,
  composeMinimized,
  setComposeMaximized,
  composeMaximized,
  replyToMessage,
  forwardMessage,
  newEmail,
  setNewEmail,
  toInput,
  setToInput,
  ccInput,
  setCcInput,
  bccInput,
  setBccInput,
  showCc,
  setShowCc,
  showBcc,
  setShowBcc,
  richTextStyle,
  setRichTextStyle,
  emailSettings,
  setEmailSettings,
  user,
  generateId,
  setMessages,
  theme,
  setTheme,
  vacationResponder,
  setVacationResponder,
  emailNotifications,
  setEmailNotifications,
  setProfileDialogOpen,
  handleLogout,
  gmailSettingsOpen,
  setGmailSettingsOpen,
  labelDialogOpen,
  setLabelDialogOpen,
}: AppEmailMailboxContentProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-14 border-b bg-white dark:bg-slate-900 flex items-center gap-2 px-2 lg:px-4">
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Settings className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-1 cursor-pointer">
              <Checkbox
                checked={selectedMessages.size === getFilteredMessages().length && getFilteredMessages().length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedMessages(new Set(getFilteredMessages().map((message) => message.id)));
                  } else {
                    setSelectedMessages(new Set());
                  }
                }}
              />
              <ChevronLeft className="w-3 h-3 text-muted-foreground rotate-90" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().map((message) => message.id)))}>Tout sélectionner</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set())}>Tout désélectionner</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter((message) => !message.isRead).map((message) => message.id)))}>Non lus</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter((message) => message.isRead).map((message) => message.id)))}>Lus</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter((message) => message.isStarred).map((message) => message.id)))}>Suivis</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedMessages(new Set(getFilteredMessages().filter((message) => !message.isStarred).map((message) => message.id)))}>Non suivis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={() => toast.success('Messages actualisés')}>
          <Search className="w-4 h-4" />
        </Button>

        {selectedMessages.size > 0 && (
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages((prev) => prev.map((message) => (selectedMessages.has(message.id) ? { ...message, folder: 'trash' } : message)));
                setSelectedMessages(new Set());
                toast.success(`${selectedMessages.size} message(s) supprimé(s)`);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages((prev) => prev.map((message) => (selectedMessages.has(message.id) ? { ...message, isRead: true } : message)));
                setSelectedMessages(new Set());
                toast.success('Messages marqués comme lus');
              }}
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 max-w-2xl relative">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input placeholder="Rechercher dans les messages..." className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-6 px-0" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Affichage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDisplayDensity('compact')}>Compact</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDisplayDensity('default')}>Par défaut</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDisplayDensity('comfortable')}>Confortable</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGmailSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-60">
                {messages.filter((message) => message.folder === 'inbox' && !message.isRead).slice(0, 5).map((msg) => (
                  <DropdownMenuItem key={msg.id} className="flex flex-col items-start gap-1 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{msg.from.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate">{msg.from.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate pl-8">{msg.subject || '(Sans objet)'}</p>
                  </DropdownMenuItem>
                ))}
                {messages.filter((message) => message.folder === 'inbox' && !message.isRead).length === 0 && (
                  <div className="p-4 text-center text-muted-foreground text-sm">Aucune nouvelle notification</div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <Avatar className="h-7 w-7">
                  {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                  <AvatarFallback className="text-xs bg-linear-to-br from-cyan-500 to-blue-500 text-white">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGmailSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" /> Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <User className="w-4 h-4 mr-2" /> Mon profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {selectedMessage ? (
          <div className="p-4 lg:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                <Archive className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage({ ...selectedMessage, isStarred: !selectedMessage.isStarred })}>
                <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast.success('Marqué comme important')}>
                <AlertCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setComposeOpen(true)}>
                <Reply className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setComposeOpen(true)}>
                <Forward className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setComposeOpen(true)}>
                    <Reply className="w-4 h-4 mr-2" /> Répondre
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setComposeOpen(true)}>
                    <Forward className="w-4 h-4 mr-2" /> Transférer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLabelDialogOpen(true)}>
                    <Tag className="w-4 h-4 mr-2" /> Ajouter un libellé
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{selectedMessage.subject || '(Sans objet)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap mt-4">{selectedMessage.body}</div>
                {selectedMessage.attachments?.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      <Paperclip className="w-4 h-4 inline mr-2" /> Pièces jointes ({selectedMessage.attachments.length})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="divide-y">
            {getFilteredMessages()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((msg) => {
                const isSnoozed = snoozedEmails.has(msg.id);
                const isImportant = importantEmails.has(msg.id);
                const rowHeight = displayDensity === 'compact' ? 'py-2' : displayDensity === 'comfortable' ? 'py-4' : 'py-3';

                return (
                  <div key={msg.id} className={`flex items-center gap-2 lg:gap-4 ${rowHeight} px-2 lg:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group ${!msg.isRead ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}>
                    <div className="flex items-center gap-1 shrink-0">
                      <Checkbox
                        checked={selectedMessages.has(msg.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedMessages);
                          if (checked) {
                            next.add(msg.id);
                          } else {
                            next.delete(msg.id);
                          }
                          setSelectedMessages(next);
                        }}
                      />
                    </div>
                    <button onClick={() => setSelectedMessage(msg)} className="shrink-0">
                      <Star className={`w-4 h-4 ${msg.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                    </button>
                    <button onClick={() => setImportantEmails((prev) => {
                      const next = new Set(prev);
                      if (next.has(msg.id)) {
                        next.delete(msg.id);
                      } else {
                        next.add(msg.id);
                      }
                      return next;
                    })} className="shrink-0 hidden lg:block">
                      <AlertCircle className={`w-4 h-4 ${isImportant ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
                    </button>
                    <div className="flex-1 min-w-0 flex items-center gap-4" onClick={() => setSelectedMessage(msg)}>
                      <Avatar className="w-8 h-8 shrink-0 hidden lg:flex">
                        <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-500 text-white text-xs">{msg.from.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className={`w-40 truncate ${!msg.isRead ? 'font-bold' : ''} shrink-0`}>{msg.from.name}</span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`truncate ${!msg.isRead ? 'font-semibold' : ''}`}>{msg.subject || '(Sans objet)'}</span>
                        <span className="text-sm text-muted-foreground truncate hidden lg:inline">- {msg.body.substring(0, 80)}...</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        {msg.attachments.length > 0 && <Paperclip className="w-4 h-4 text-muted-foreground" />}
                        {isSnoozed && <Clock className="w-4 h-4 text-orange-500" />}
                        <span className="text-xs text-muted-foreground w-16 truncate">{format(msg.createdAt, 'd MMM', { locale: fr })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            {getFilteredMessages().length === 0 && (
              <div className="p-12 text-center">
                <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-medium text-lg mb-2">Aucun message</h3>
                <p className="text-muted-foreground text-sm mb-4">Ce dossier est vide</p>
                <Button onClick={() => setComposeOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Nouveau message
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <AppEmailComposeDialog
        open={composeOpen}
        setOpen={setComposeOpen}
        minimized={composeMinimized}
        setMinimized={setComposeMinimized}
        maximized={composeMaximized}
        setMaximized={setComposeMaximized}
        replyToMessage={replyToMessage}
        forwardMessage={forwardMessage}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        toInput={toInput}
        setToInput={setToInput}
        ccInput={ccInput}
        setCcInput={setCcInput}
        bccInput={bccInput}
        setBccInput={setBccInput}
        showCc={showCc}
        setShowCc={setShowCc}
        showBcc={showBcc}
        setShowBcc={setShowBcc}
        richTextStyle={richTextStyle}
        setRichTextStyle={setRichTextStyle}
        emailSettings={emailSettings}
        setEmailSettings={setEmailSettings}
        user={user}
        generateId={generateId}
        setMessages={setMessages}
        setReplyToMessage={setReplyToMessage}
        setForwardMessage={setForwardMessage}
      />

      <AppEmailMailboxSettingsDialog
        open={gmailSettingsOpen}
        setOpen={setGmailSettingsOpen}
        theme={theme}
        setTheme={setTheme}
        displayDensity={displayDensity}
        setDisplayDensity={setDisplayDensity}
        emailSettings={emailSettings}
        setEmailSettings={setEmailSettings}
        vacationResponder={vacationResponder}
        setVacationResponder={setVacationResponder}
        emailNotifications={emailNotifications}
        setEmailNotifications={setEmailNotifications}
      />
    </div>
  );
}
