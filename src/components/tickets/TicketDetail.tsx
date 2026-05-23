'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Edit2, Trash2, MessageSquare, Clock, Paperclip, Activity,
  History, CheckSquare, ThumbsUp, Send, Lock, Globe, Plus, Save,
  Loader2, Download, Eye, AlertCircle, RefreshCw, Upload, Copy,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInSeconds, intervalToDuration } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
const Zarko = dynamic(
  () => import('@/components/ui/rich-text-editor').then((module) => module.RichTextEditor),
  { ssr: false, loading: () => <div className="h-55 rounded-md border bg-muted/20" /> }
);
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  NocTicket, NocTicketComment, NocTicketAttachment, NocTicketHistory,
  NocTicketSubTask, NocTimeEntry, NocApproval,
  TICKET_TYPE_CONFIG, TICKET_STATUS_CONFIG, TICKET_PRIORITY_CONFIG,
  RESOLUTION_CAUSE_CONFIG, NocResolutionCause, NocTicketStatus,
} from './types';

// ── Types ─────────────────────────────────────────────────────

type DetailTab = 'comments' | 'resolution' | 'time' | 'attachments' | 'subtasks' | 'approval' | 'history' | 'quick_actions' | 'quick_menu';

interface Props {
  ticket: NocTicket;
  user: { id: string; name: string; email: string; role: string };
  isEditor: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onEdit: (ticket: NocTicket) => void;
  onRefresh: () => void;
}

// ── Elapsed Timer ──────────────────────────────────────────────

function ElapsedTimer({ startDate, closedAt }: { startDate: Date; closedAt?: Date }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const end = closedAt ? new Date(closedAt) : new Date();
      const start = new Date(startDate);
      const secs = Math.max(0, differenceInSeconds(end, start));
      const dur = intervalToDuration({ start: 0, end: secs * 1000 });
      const d = dur.days ? `${dur.days}j ` : '';
      const h = String(dur.hours ?? 0).padStart(2, '0');
      const m = String(dur.minutes ?? 0).padStart(2, '0');
      const s = String(dur.seconds ?? 0).padStart(2, '0');
      setElapsed(`${d}${h}:${m}:${s}`);
    };
    update();
    if (!closedAt) {
      const t = setInterval(update, 1000);
      return () => clearInterval(t);
    }
  }, [startDate, closedAt]);

  return <span className="font-mono text-sm text-indigo-400">{elapsed}</span>;
}

// ── Comment ────────────────────────────────────────────────────

function CommentItem({
  comment, canDelete, onDelete,
}: { comment: NocTicketComment; canDelete: boolean; onDelete: (id: string) => void }) {
  return (
    <div className={`flex gap-3 ${comment.isPrivate ? 'opacity-80' : ''}`}>
      <div className="h-8 w-8 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {comment.authorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{comment.authorName}</span>
          {comment.isPrivate && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
              <Lock className="w-2.5 h-2.5" /> Privé
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fr })}
          </span>
          {canDelete && (
            <button
              className="text-muted-foreground hover:text-red-400 transition-colors"
              onClick={() => onDelete(comment.id)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap bg-muted/20 rounded-lg px-3 py-2">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function TicketDetail({
  ticket: initialTicket, user, isEditor, isSuperAdmin, onClose, onEdit, onRefresh,
}: Props) {
  const router = useRouter();
  const [ticket, setTicket] = useState<NocTicket>(initialTicket);
  const [activeTab, setActiveTab] = useState<DetailTab>('comments');
  const [comments, setComments] = useState<NocTicketComment[]>(initialTicket.comments ?? []);
  const [attachments, setAttachments] = useState<NocTicketAttachment[]>(initialTicket.attachments ?? []);
  const [history, setHistory] = useState<NocTicketHistory[]>(initialTicket.history ?? []);
  const [subTasks, setSubTasks] = useState<NocTicketSubTask[]>(initialTicket.subTasks ?? []);
  const [timeEntries, setTimeEntries] = useState<NocTimeEntry[]>(initialTicket.timeEntries ?? []);
  const [approvals, setApprovals] = useState<NocApproval[]>(initialTicket.approvals ?? []);
  const [loading, setLoading] = useState(false);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Status change
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Time entry form
  const [timeForm, setTimeForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), startTime: '', endTime: '', note: '' });

  // Sub-task form
  const [newSubTask, setNewSubTask] = useState('');
  const [addingSubTask, setAddingSubTask] = useState(false);

  // Resolution form
  const [resolutionForm, setResolutionForm] = useState({
    resolutionDescription: ticket.resolutionDescription ?? '',
    resolutionCause: ticket.resolutionCause ?? '' as NocResolutionCause | '',
  });

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error(`Impossible de copier ${label.toLowerCase()}`);
    }
  };

  const typeCfg = TICKET_TYPE_CONFIG[ticket.type];
  const statusCfg = TICKET_STATUS_CONFIG[ticket.status];
  const priorityCfg = TICKET_PRIORITY_CONFIG[ticket.priority];

  // ── Fetch detail ───────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTicket(data);
      setComments(data.comments ?? []);
      setAttachments(data.attachments ?? []);
      setHistory(data.history ?? []);
      setSubTasks(data.subTasks ?? []);
      setTimeEntries(data.timeEntries ?? []);
      setApprovals(data.approvals ?? []);
    } catch {
      toast.error('Impossible de recharger le ticket');
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => { fetchDetail(); }, []);

  // ── Comment actions ────────────────────────────────────────

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText,
          isPrivate,
          authorId: user.id,
          authorName: user.name,
        }),
      });
      if (!res.ok) throw new Error();
      const newComment = await res.json();
      setComments((p) => [...p, newComment]);
      setCommentText('');
      toast.success('Commentaire ajouté');
    } catch {
      toast.error('Erreur lors de l\'envoi du commentaire');
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, requesterRole: user.role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 || err?.error === 'Non autorise') {
          toast.error('Suppression non autorisee (auteur ou super admin uniquement)');
          return;
        }
        throw new Error();
      }
      setComments((p) => p.filter((c) => c.id !== commentId));
      toast.success('Commentaire supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ── Status change ──────────────────────────────────────────

  const updateStatus = async (newStatus: NocTicketStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedBy: user.name }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTicket(updated);
      toast.success(`Statut mis à jour: ${TICKET_STATUS_CONFIG[newStatus].label}`);
      onRefresh();
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Resolution save ────────────────────────────────────────

  const saveResolution = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionDescription: resolutionForm.resolutionDescription,
          resolutionCause: resolutionForm.resolutionCause || undefined,
          updatedBy: user.name,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Résolution enregistrée');
      onRefresh();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  // ── Sub-task ───────────────────────────────────────────────

  const addSubTask = async () => {
    if (!newSubTask.trim()) return;
    setAddingSubTask(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newSubTask, creatorId: user.id }),
      });
      if (!res.ok) throw new Error();
      const st = await res.json();
      setSubTasks((p) => [...p, st]);
      setNewSubTask('');
      toast.success('Sous-tâche ajoutée');
    } catch {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setAddingSubTask(false);
    }
  };

  // ── Time entry ─────────────────────────────────────────────

  const addTimeEntry = async () => {
    if (!timeForm.startTime || !timeForm.endTime) {
      toast.error('Veuillez renseigner les heures de début et de fin');
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...timeForm,
          technicianId: user.id,
          technicianName: user.name,
        }),
      });
      if (!res.ok) throw new Error();
      const entry = await res.json();
      setTimeEntries((p) => [...p, entry]);
      setTimeForm({ date: format(new Date(), 'yyyy-MM-dd'), startTime: '', endTime: '', note: '' });
      toast.success('Entrée de temps ajoutée');
    } catch {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  // ── RFO email ──────────────────────────────────────────────

  const generateRfo = () => {
    const subject = `[RFO] ${ticket.numero} — ${ticket.objet}`;
    const startStr = ticket.outageStartTime
      ? format(new Date(ticket.outageStartTime), 'dd/MM/yyyy HH:mm', { locale: fr })
      : 'N/A';
    const endStr = ticket.outageEndTime
      ? format(new Date(ticket.outageEndTime), 'dd/MM/yyyy HH:mm', { locale: fr })
      : 'N/A';
    const body = [
      `Ticket: ${ticket.numero}`,
      `Objet: ${ticket.objet}`,
      ``,
      `Début de l'incident: ${startStr}`,
      `Fin de l'incident: ${endStr}`,
      ``,
      `Description:`,
      ticket.description ?? 'N/A',
      ``,
      `Résolution:`,
      ticket.resolutionDescription ?? 'N/A',
      ``,
      `Cause: ${ticket.resolutionCause ? RESOLUTION_CAUSE_CONFIG[ticket.resolutionCause] : 'N/A'}`,
    ].join('\n');
    const mailto = `mailto:kevine.test242@gmail.com,kevinebauer7@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  // ── Tabs ───────────────────────────────────────────────────

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'comments', label: 'Conversations', icon: <MessageSquare className="w-4 h-4" />, count: comments.length },
    { id: 'resolution', label: 'Résolution', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'time', label: 'Temps', icon: <Clock className="w-4 h-4" />, count: timeEntries.length },
    { id: 'attachments', label: 'Pièces jointes', icon: <Paperclip className="w-4 h-4" />, count: attachments.length },
    { id: 'subtasks', label: 'Activité', icon: <Activity className="w-4 h-4" />, count: subTasks.length },
    { id: 'approval', label: 'Approbation', icon: <ThumbsUp className="w-4 h-4" /> },
    { id: 'history', label: 'Historique', icon: <History className="w-4 h-4" /> },
    { id: 'quick_actions', label: 'Actions rapides', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'quick_menu', label: 'Menu contextuel', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  // ── Render ─────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 lg:px-6 py-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${typeCfg.bg} ${typeCfg.border} border`}
                  style={{ color: typeCfg.color }}
                >
                  {ticket.type}
                </span>
                <span className="font-mono text-sm text-muted-foreground">{ticket.numero}</span>
                {ticket.ticketZoho && (
                  <span className="text-xs text-muted-foreground">Zoho: {ticket.ticketZoho}</span>
                )}
              </div>
              <h1 className="text-lg font-semibold leading-tight">{ticket.objet}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                <span>Créé par {ticket.creatorName}</span>
                <span>·</span>
                <span>{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <ElapsedTimer startDate={ticket.startDate} closedAt={ticket.closedAt} />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={activeTab === 'quick_actions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('quick_actions')}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Actions rapides
              </Button>
              <Button
                variant={activeTab === 'quick_menu' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('quick_menu')}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" /> Menu contextuel
              </Button>
              {isEditor && (
                <Button variant="outline" size="sm" onClick={() => onEdit(ticket)}>
                  <Edit2 className="w-4 h-4 mr-1.5" /> Modifier
                </Button>
              )}
              {ticket.status === 'CLOSED' && (
                <Button variant="outline" size="sm" onClick={generateRfo} className="text-indigo-400 border-indigo-500/40">
                  RFO Email
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Status + Priority row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Select value={ticket.status} onValueChange={(v) => updateStatus(v as NocTicketStatus)} disabled={!isEditor || updatingStatus}>
              <SelectTrigger className="h-8 w-40 text-sm" style={{ borderColor: statusCfg.color + '50', color: statusCfg.color }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TICKET_STATUS_CONFIG) as NocTicketStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span style={{ color: TICKET_STATUS_CONFIG[s].color }}>{TICKET_STATUS_CONFIG[s].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span
              className={`px-2 py-1 rounded text-xs font-medium ${priorityCfg.bg}`}
              style={{ color: priorityCfg.color }}
            >
              {priorityCfg.label}
            </span>

            {ticket.clients && ticket.clients.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {ticket.clients.map((c) => (
                  <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                ))}
              </div>
            )}

            {ticket.localities && ticket.localities.length > 0 && (
              <div className="flex gap-1 flex-wrap text-muted-foreground text-xs">
                {ticket.localities.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 border-b bg-muted/10 px-4 overflow-x-auto">
          <div className="flex gap-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="bg-muted rounded-full px-1.5 text-[10px]">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

            {/* COMMENTS */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucun commentaire pour le moment</p>
                )}
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    canDelete={c.authorId === user.id || isSuperAdmin}
                    onDelete={deleteComment}
                  />
                ))}

                <Separator />

                {/* New comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Écrire un commentaire…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Commentaire privé</span>
                    </label>
                    <Button
                      size="sm"
                      onClick={postComment}
                      disabled={!commentText.trim() || postingComment}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {postingComment
                        ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        : <Send className="w-4 h-4 mr-1.5" />}
                      Envoyer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* RESOLUTION */}
            {activeTab === 'resolution' && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 mb-2">
                  <h2 className="text-lg font-semibold mb-1">Rubrique Resolution</h2>
                  <p className="text-sm text-muted-foreground mb-2">Decrire la resolution technique du ticket</p>
                  {/* Un seul message de résolution par utilisateur */}
                  {ticket.resolutionAuthorId && ticket.resolutionAuthorId !== user.id ? (
                    <div className="space-y-1.5">
                      <Label>Description resolution</Label>
                      <div className="prose prose-sm max-w-none bg-muted/10 rounded p-3 min-h-30" dangerouslySetInnerHTML={{ __html: ticket.resolutionDescription || '<em>Aucune résolution saisie</em>' }} />
                      <div className="text-xs text-muted-foreground mt-1">Seul l&apos;auteur peut modifier la résolution.</div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label>Categorie resolution</Label>
                        <Select
                          value={resolutionForm.resolutionCause}
                          onValueChange={(v) => setResolutionForm((p) => ({ ...p, resolutionCause: v as NocResolutionCause | '' }))}
                          disabled={!isEditor}
                        >
                          <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">—</SelectItem>
                            {(Object.keys(RESOLUTION_CAUSE_CONFIG) as NocResolutionCause[]).map((c) => (
                              <SelectItem key={c} value={c}>{RESOLUTION_CAUSE_CONFIG[c]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Description resolution</Label>
                        <Zarko
                          value={resolutionForm.resolutionDescription}
                          onChange={(html) => setResolutionForm((p) => ({ ...p, resolutionDescription: html }))}
                          placeholder="Saisir la resolution..."
                          minHeight="180px"
                          enableTicketReferences
                          className="bg-white/70 dark:bg-slate-900/45 backdrop-blur-sm"
                          disabled={!isEditor}
                        />
                      </div>
                      {isEditor && (
                        <Button onClick={saveResolution} className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
                          <Save className="w-4 h-4 mr-1.5" /> Enregistrer Resolution
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {ticket.status !== 'CLOSED' && isEditor && (
                  <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Fermez le ticket pour déclencher l&apos;envoi du RFO par email.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { updateStatus('CLOSED'); generateRfo(); }}
                    >
                      Fermer le ticket &amp; Envoyer RFO
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* TIME ENTRIES */}
            {activeTab === 'time' && (
              <div className="space-y-4">
                {isEditor && (
                  <Card className="p-4 space-y-3">
                    <p className="text-sm font-medium">Ajouter une entrée de temps</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input type="date" value={timeForm.date} onChange={(e) => setTimeForm((p) => ({ ...p, date: e.target.value }))} />
                      <Input type="time" placeholder="Début" value={timeForm.startTime} onChange={(e) => setTimeForm((p) => ({ ...p, startTime: e.target.value }))} />
                      <Input type="time" placeholder="Fin" value={timeForm.endTime} onChange={(e) => setTimeForm((p) => ({ ...p, endTime: e.target.value }))} />
                      <Input placeholder="Note" value={timeForm.note} onChange={(e) => setTimeForm((p) => ({ ...p, note: e.target.value }))} />
                    </div>
                    <Button size="sm" onClick={addTimeEntry} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="w-4 h-4 mr-1.5" /> Ajouter
                    </Button>
                  </Card>
                )}

                {timeEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucune entrée de temps</p>
                ) : (
                  <div className="space-y-2">
                    {timeEntries.map((e) => (
                      <Card key={e.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{e.technicianName}</p>
                          {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                        </div>
                        <div className="text-right text-sm">
                          <p>{format(new Date(e.date), 'dd/MM/yyyy')}</p>
                          <p className="text-muted-foreground">{e.startTime} – {e.endTime}</p>
                        </div>
                        <Badge variant="secondary">{e.durationMinutes}min</Badge>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                {isEditor && (
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-1.5" /> Ajouter un fichier
                  </Button>
                )}
                {attachments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucune pièce jointe</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((a) => (
                      <Card key={a.id} className="p-3 flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(a.size / 1024).toFixed(1)} KB · {format(new Date(a.uploadedAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TASKS */}
            {activeTab === 'subtasks' && (
              <div className="space-y-4">
                {isEditor && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nouvelle sous-tâche…"
                      value={newSubTask}
                      onChange={(e) => setNewSubTask(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addSubTask(); }}
                    />
                    <Button size="sm" onClick={addSubTask} disabled={addingSubTask}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {subTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucune sous-tâche</p>
                ) : (
                  <div className="space-y-2">
                    {subTasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/20">
                        <CheckSquare className={`w-4 h-4 ${st.status === 'DONE' ? 'text-green-400' : 'text-muted-foreground'}`} />
                        <span className={`text-sm flex-1 ${st.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                          {st.description}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">{st.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* APPROVAL */}
            {activeTab === 'approval' && (
              <div className="space-y-4">
                {approvals.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-muted-foreground text-sm">Aucune demande d&apos;approbation</p>
                    {isEditor && (
                      <Button variant="outline" size="sm">
                        <ThumbsUp className="w-4 h-4 mr-1.5" /> Demander une approbation
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvals.map((a) => (
                      <Card key={a.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Demandé à: {a.requestedTo}</span>
                          <Badge variant={a.status === 'APPROVED' ? 'default' : a.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {a.status}
                          </Badge>
                        </div>
                        {a.comment && <p className="text-xs text-muted-foreground">{a.comment}</p>}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucun historique</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 py-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {h.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{h.userName}</span>
                          {' '}{h.action}
                          {h.field && (
                            <> · <span className="text-muted-foreground">{h.field}</span>
                              {h.oldValue && <> : <span className="line-through text-red-400/70">{h.oldValue}</span></>}
                              {h.newValue && <> → <span className="text-green-400/70">{h.newValue}</span></>}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(h.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'quick_actions' && (
              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium">Navigation directe vers les ecrans existants</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onClose()}>
                    <X className="w-4 h-4 mr-1.5" /> Retour liste tickets
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                    <Eye className="w-4 h-4 mr-1.5" /> Tableau de bord
                  </Button>
                  <Button size="sm" onClick={fetchDetail}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Actualiser les donnees
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void copyText(ticket.numero ?? '', 'ID ticket')}>
                    <Copy className="w-4 h-4 mr-1.5" /> Copier ID
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void copyText(`${window.location.origin}/tickets/${ticket.id}`, 'URL ticket')}>
                    <Globe className="w-4 h-4 mr-1.5" /> Copier URL
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'quick_menu' && (
              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium">Operations rapides (reponse, transfert, impression)</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.info('Reponse')}>
                    <Send className="w-4 h-4 mr-1.5" /> Reponse
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.info('Repondre a tous')}>
                    <Globe className="w-4 h-4 mr-1.5" /> Repondre a tous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.info('Transferer')}>
                    <Upload className="w-4 h-4 mr-1.5" /> Transferer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-1.5" /> Imprimer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Message epingle')}>
                    <CheckSquare className="w-4 h-4 mr-1.5" /> Epingler
                  </Button>
                </div>
              </Card>
            )}

          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
