import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCheck,
  Clock,
  File,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  Mail,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Plus,
  Send,
  Underline,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import type { EmailAttachment, InternalMessage, MessagePriority, UserProfile } from '@/features/app-shell/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Recipient = {
  id: string;
  name: string;
  email: string;
};

type ComposeEmail = {
  to: Recipient[];
  cc: Recipient[];
  bcc: Recipient[];
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  priority: MessagePriority;
  scheduledAt: Date | null;
};

type RichTextStyle = {
  fontFamily: string;
  fontSize: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  textColor: string;
  highlightColor: string;
};

type AppEmailComposeDialogProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  minimized: boolean;
  setMinimized: Dispatch<SetStateAction<boolean>>;
  maximized: boolean;
  setMaximized: Dispatch<SetStateAction<boolean>>;
  replyToMessage: InternalMessage | null;
  forwardMessage: InternalMessage | null;
  newEmail: ComposeEmail;
  setNewEmail: Dispatch<SetStateAction<ComposeEmail>>;
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
  richTextStyle: RichTextStyle;
  setRichTextStyle: Dispatch<SetStateAction<RichTextStyle>>;
  emailSettings: any;
  setEmailSettings: Dispatch<SetStateAction<any>>;
  user: UserProfile | null;
  generateId: () => string;
  setMessages: Dispatch<SetStateAction<InternalMessage[]>>;
  setReplyToMessage: Dispatch<SetStateAction<InternalMessage | null>>;
  setForwardMessage: Dispatch<SetStateAction<InternalMessage | null>>;
};

export function AppEmailComposeDialog({
  open,
  setOpen,
  minimized,
  setMinimized,
  maximized,
  setMaximized,
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
  setReplyToMessage,
  setForwardMessage,
}: AppEmailComposeDialogProps) {
  const isReply = useMemo(() => Boolean(replyToMessage), [replyToMessage]);
  const isForward = useMemo(() => Boolean(forwardMessage), [forwardMessage]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={`${maximized ? 'max-w-full w-full h-screen' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}>
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-500" />
              {isReply ? 'Répondre' : isForward ? 'Transférer' : 'Nouveau message'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setMinimized((value) => !value)}>
                {minimized ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMaximized((value) => !value)}>
                {maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!minimized && (
          <>
            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="w-16 text-sm text-muted-foreground shrink-0">À</div>
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  {newEmail.to.map((recipient, index) => (
                    <Badge key={`${recipient.id}-${index}`} variant="secondary" className="gap-1">
                      {recipient.name}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                        setNewEmail((prev) => ({ ...prev, to: prev.to.filter((_, currentIndex) => currentIndex !== index) }));
                      }} />
                    </Badge>
                  ))}
                  <Input
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    placeholder={newEmail.to.length === 0 ? 'Destinataires...' : ''}
                    className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs px-16">
                <button className="text-cyan-600 hover:underline" onClick={() => setShowCc((value) => !value)}>
                  Cc
                </button>
                <button className="text-cyan-600 hover:underline" onClick={() => setShowBcc((value) => !value)}>
                  Cci
                </button>
              </div>

              {showCc && (
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="w-16 text-sm text-muted-foreground shrink-0">Cc</div>
                  <div className="flex-1 flex flex-wrap gap-1 items-center">
                    {newEmail.cc.map((recipient, index) => (
                      <Badge key={`${recipient.id}-${index}`} variant="secondary" className="gap-1">
                        {recipient.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => {
                          setNewEmail((prev) => ({ ...prev, cc: prev.cc.filter((_, currentIndex) => currentIndex !== index) }));
                        }} />
                      </Badge>
                    ))}
                    <Input
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      placeholder="Cc..."
                      className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                    />
                  </div>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="w-16 text-sm text-muted-foreground shrink-0">Cci</div>
                  <div className="flex-1 flex flex-wrap gap-1 items-center">
                    {newEmail.bcc.map((recipient, index) => (
                      <Badge key={`${recipient.id}-${index}`} variant="secondary" className="gap-1">
                        {recipient.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => {
                          setNewEmail((prev) => ({ ...prev, bcc: prev.bcc.filter((_, currentIndex) => currentIndex !== index) }));
                        }} />
                      </Badge>
                    ))}
                    <Input
                      value={bccInput}
                      onChange={(e) => setBccInput(e.target.value)}
                      placeholder="Cci..."
                      className="flex-1 border-0 h-7 px-0 focus-visible:ring-0 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 border-b pb-2">
                <div className="w-16 text-sm text-muted-foreground shrink-0">Objet</div>
                <Input
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Objet du message"
                  className="flex-1 border-0 h-7 px-0 focus-visible:ring-0"
                />
              </div>

              <div className="flex items-center gap-1 py-2 border-b flex-wrap">
                <Select value={richTextStyle.fontFamily} onValueChange={(value) => setRichTextStyle((prev) => ({ ...prev, fontFamily: value }))}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times New Roman">Times</SelectItem>
                    <SelectItem value="Courier New">Courier</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={richTextStyle.fontSize} onValueChange={(value) => setRichTextStyle((prev) => ({ ...prev, fontSize: value }))}>
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10px">10</SelectItem>
                    <SelectItem value="12px">12</SelectItem>
                    <SelectItem value="14px">14</SelectItem>
                    <SelectItem value="16px">16</SelectItem>
                    <SelectItem value="18px">18</SelectItem>
                    <SelectItem value="24px">24</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-5" />

                <Toggle pressed={richTextStyle.bold} onPressedChange={(value) => setRichTextStyle((prev) => ({ ...prev, bold: value }))} size="sm">
                  <Bold className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={richTextStyle.italic} onPressedChange={(value) => setRichTextStyle((prev) => ({ ...prev, italic: value }))} size="sm">
                  <Italic className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={richTextStyle.underline} onPressedChange={(value) => setRichTextStyle((prev) => ({ ...prev, underline: value }))} size="sm">
                  <Underline className="w-4 h-4" />
                </Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Toggle pressed={richTextStyle.align === 'left'} onPressedChange={() => setRichTextStyle((prev) => ({ ...prev, align: 'left' }))} size="sm">
                  <AlignLeft className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={richTextStyle.align === 'center'} onPressedChange={() => setRichTextStyle((prev) => ({ ...prev, align: 'center' }))} size="sm">
                  <AlignCenter className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={richTextStyle.align === 'right'} onPressedChange={() => setRichTextStyle((prev) => ({ ...prev, align: 'right' }))} size="sm">
                  <AlignRight className="w-4 h-4" />
                </Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Toggle size="sm"><List className="w-4 h-4" /></Toggle>
                <Toggle size="sm"><ListOrdered className="w-4 h-4" /></Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <div className="w-4 h-4 border rounded" style={{ backgroundColor: richTextStyle.textColor }} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="grid grid-cols-6 gap-1">
                      {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'].map((color) => (
                        <button key={color} className="w-6 h-6 rounded" style={{ backgroundColor: color }} onClick={() => setRichTextStyle((prev) => ({ ...prev, textColor: color }))} />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="grid grid-cols-6 gap-1">
                      {['#FFFFFF', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FCE7F3', '#FEE2E2', '#E5E7EB'].map((color) => (
                        <button key={color} className="w-6 h-6 rounded border" style={{ backgroundColor: color }} onClick={() => setRichTextStyle((prev) => ({ ...prev, highlightColor: color }))} />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="h-5" />

                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><LinkIcon className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ImageIcon className="w-4 h-4" /></Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (event) => {
                      const files = (event.target as HTMLInputElement).files;
                      if (!files) return;
                      Array.from(files).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (readerEvent) => {
                          const attachment: EmailAttachment = {
                            id: generateId(),
                            messageId: '',
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type,
                            fileData: readerEvent.target?.result as string,
                            uploadedAt: new Date(),
                          };
                          setNewEmail((prev) => ({ ...prev, attachments: [...prev.attachments, attachment] }));
                        };
                        reader.readAsDataURL(file);
                      });
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>

              <Textarea
                value={newEmail.body}
                onChange={(e) => setNewEmail((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Écrivez votre message..."
                className={`min-h-50 flex-1 border-0 focus-visible:ring-0 resize-none ${richTextStyle.bold ? 'font-bold' : ''} ${richTextStyle.italic ? 'italic' : ''} ${richTextStyle.underline ? 'underline' : ''}`}
                style={{
                  fontFamily: richTextStyle.fontFamily,
                  fontSize: richTextStyle.fontSize,
                  textAlign: richTextStyle.align,
                  color: richTextStyle.textColor,
                }}
              />

              {newEmail.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 py-2 border-t">
                  {newEmail.attachments.map((attachment, index) => (
                    <Badge key={`${attachment.id}-${index}`} variant="outline" className="gap-1 py-1">
                      <File className="w-3 h-3" />
                      <span className="max-w-24 truncate">{attachment.fileName}</span>
                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                        setNewEmail((prev) => ({ ...prev, attachments: prev.attachments.filter((_, currentIndex) => currentIndex !== index) }));
                      }} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap w-full justify-between">
                <div className="flex items-center gap-2">
                  <Select value={newEmail.priority} onValueChange={(value) => setNewEmail((prev) => ({ ...prev, priority: value as MessagePriority }))}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm"><Clock className="w-4 h-4 mr-1" /> Planifier</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Planifier l'envoi</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" className="justify-start" onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(8, 0, 0, 0);
                            setNewEmail((prev) => ({ ...prev, scheduledAt: tomorrow }));
                            toast.success('Envoi planifié pour demain 8h');
                          }}>
                            Demain 8h
                          </Button>
                          <Button variant="outline" size="sm" className="justify-start" onClick={() => {
                            const monday = new Date();
                            monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7);
                            monday.setHours(9, 0, 0, 0);
                            setNewEmail((prev) => ({ ...prev, scheduledAt: monday }));
                            toast.success('Envoi planifié pour lundi 9h');
                          }}>
                            Lundi 9h
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className={emailSettings.confidentialMode ? 'text-cyan-500' : ''}><Lock className="w-4 h-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Mode confidentiel</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={emailSettings.requestReadReceipt ? 'text-cyan-500' : ''}
                        onClick={() => setEmailSettings((prev) => ({ ...prev, requestReadReceipt: !prev.requestReadReceipt }))}
                      >
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Accusé de réception</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const draft: InternalMessage = {
                      id: generateId(),
                      from: { id: user?.id || '', name: user?.name || '', email: user?.email || '' },
                      to: newEmail.to,
                      cc: newEmail.cc,
                      bcc: newEmail.bcc,
                      subject: newEmail.subject,
                      body: newEmail.body,
                      attachments: newEmail.attachments,
                      folder: 'drafts',
                      status: 'unread',
                      priority: newEmail.priority,
                      isStarred: false,
                      isRead: true,
                      labels: [],
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      isDraft: true,
                    };
                    setMessages((prev) => [draft, ...prev]);
                    setOpen(false);
                    toast.success('Brouillon enregistré');
                  }}>
                    Enregistrer
                  </Button>
                  <Button
                    className="bg-cyan-500 hover:bg-cyan-600"
                    onClick={() => {
                      if (newEmail.to.length === 0) {
                        toast.error('Veuillez ajouter au moins un destinataire');
                        return;
                      }

                      const message: InternalMessage = {
                        id: generateId(),
                        from: {
                          id: user?.id || '',
                          name: user?.name || '',
                          email: user?.email || '',
                        },
                        to: newEmail.to,
                        cc: newEmail.cc,
                        bcc: newEmail.bcc,
                        subject: newEmail.subject,
                        body: newEmail.body,
                        attachments: newEmail.attachments,
                        folder: 'sent',
                        status: 'read',
                        priority: newEmail.priority,
                        isStarred: false,
                        isRead: true,
                        labels: [],
                        sentAt: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isDraft: false,
                      };

                      setMessages((prev) => [message, ...prev]);

                      newEmail.to.forEach((recipient) => {
                        const inboxMessage: InternalMessage = {
                          ...message,
                          id: generateId(),
                          folder: 'inbox',
                          status: 'unread',
                          isRead: false,
                          from: message.from,
                          to: [recipient],
                          receivedAt: new Date(),
                        };
                        setMessages((prev) => [inboxMessage, ...prev]);
                      });

                      setOpen(false);
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
                      setReplyToMessage(null);
                      setForwardMessage(null);
                      toast.success('Message envoyé');
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" /> Envoyer
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
