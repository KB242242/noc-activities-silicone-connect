'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes, isAfter, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Icons
import {
  Ticket, Plus, Search, Filter, LayoutGrid, List, Clock, AlertTriangle, CheckCircle2, 
  XCircle, Pause, Play, MessageCircle, History, Download, Send, Phone, Mail, 
  Activity, FileText, Calendar as CalendarIcon, User, MapPin, Link2,
  AlertCircle, ChevronDown, ChevronRight, Eye, Edit, Trash2, RefreshCw, 
  TrendingUp, TrendingDown, Minus, Zap, Users, Globe, Lock, Star, X, Check,
  Paperclip, ThumbsUp, ThumbsDown, ArrowUpCircle, Folder, FolderOpen, File,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, List as ListIcon, Palette, Type,
  Archive, Bookmark, MoreHorizontal, Printer, Share2, Copy, RotateCcw, Trash,
  Bell, BellOff, Pin, PinOff, ExternalLink, Settings, ChevronUp, Info, Warning,
  Upload
} from 'lucide-react';

// Types & Hooks
import { Ticket as TicketType, TicketStatus, TicketSeverity, TicketType as TicketTypeEnum, CommentVisibility, TicketActivity, TimeEntry, ClosedTicketGroup, TrashItem, FlashMessage } from '@/lib/tickets/types';
import { useTickets } from '@/hooks/useTickets';
import { 
  TICKET_TYPES, SEVERITY_CONFIG, STATUS_CONFIG, CANAL_CONFIG, CLASSIFICATION_CONFIG,
  LANGUAGE_CONFIG, PRODUCT_CONFIG, LOCALITIES, ALL_CLIENTS, CLIENTS_BRAZZAVILLE, 
  CLIENTS_POINTE_NOIRE, SITES, LIAISONS, TECHNICIANS, KANBAN_COLUMNS, MODULE_NAME, 
  MODULE_SUBTITLE, TICKET_DETAIL_TABS, MAX_ATTACHMENT_SIZE, TRASH_AUTO_DELETE_DAYS 
} from '@/lib/tickets/constants';
import { getSLAStatus, formatDuration, formatBreachDuration, formatElapsedTime, formatTimeAgo } from '@/lib/tickets/utils';

// Props
interface TicketManagerProps {
  userId: string;
  userName: string;
  userRole: string;
}

export default function TicketManager({ userId, userName, userRole }: TicketManagerProps) {
  // Hooks
  const {
    tickets,
    filteredTickets,
    closedTicketGroups,
    selectedTicket,
    filter,
    stats,
    recurrenceAlerts,
    viewMode,
    trash,
    flashMessages,
    createTicket,
    updateTicket,
    deleteTicket,
    selectTicket,
    setFilter,
    clearFilter,
    setViewMode,
    updateStatus,
    escalateTicket,
    closeTicket,
    reopenTicket,
    updateETA,
    updateETR,
    addComment,
    addActivity,
    updateActivity,
    addTimeEntry,
    requestApproval,
    approveTicket,
    rejectTicket,
    addAttachment,
    removeAttachment,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    emptyTrash,
    addFlashMessage,
    removeFlashMessage,
    exportToCSV,
    generateTechnicianReportPDF,
    generateActivityPDF,
    getTechnician,
    getClient,
    canManage
  } = useTickets(userId, userName, userRole);

  // Local state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  
  // New ticket form
  const [newTicket, setNewTicket] = useState<Partial<TicketType>>({
    objet: '',
    type: 'intervention',
    severity: 'Medium',
    source: 'Phone',
    localite: 'brazzaville',
    cibles: [],
    clientsImpactes: [],
    techniciens: [],
    description: '',
    classification: 'Problème',
    language: 'Français'
  });
  
  // Comments
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<CommentVisibility>('prive');
  
  // Resolution
  const [resolutionText, setResolutionText] = useState('');
  const [rootCauseText, setRootCauseText] = useState('');
  
  // Activity
  const [newActivity, setNewActivity] = useState<Partial<TicketActivity>>({
    title: '',
    description: '',
    assignedTo: [],
    priority: 'Medium'
  });
  
  // Time entry
  const [newTimeEntry, setNewTimeEntry] = useState<Partial<TimeEntry>>({
    description: '',
    duration: 0,
    billable: true
  });
  
  // Technician report
  const [reportTechnician, setReportTechnician] = useState('');
  const [reportStartDate, setReportStartDate] = useState<Date>(addDays(new Date(), -30));
  const [reportEndDate, setReportEndDate] = useState<Date>(new Date());
  
  // Real-time elapsed time update
  useEffect(() => {
    if (selectedTicket && selectedTicket.status !== 'ferme') {
      const interval = setInterval(() => {
        setElapsedTime(formatElapsedTime(selectedTicket.createdAt));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);
  
  // Handle ticket creation
  const handleCreateTicket = () => {
    if (!newTicket.objet?.trim() && !newTicket.accountName) {
      toast.error('Veuillez saisir un objet ou sélectionner un client');
      return;
    }
    
    createTicket(newTicket);
    setCreateDialogOpen(false);
    resetNewTicketForm();
  };
  
  // Reset new ticket form
  const resetNewTicketForm = () => {
    setNewTicket({
      objet: '',
      type: 'intervention',
      severity: 'Medium',
      source: 'Phone',
      localite: 'brazzaville',
      cibles: [],
      clientsImpactes: [],
      techniciens: [],
      description: '',
      classification: 'Problème',
      language: 'Français'
    });
  };
  
  // Handle ticket selection
  const handleSelectTicket = (ticket: TicketType) => {
    selectTicket(ticket);
    setActiveTab('conversations');
    setDetailDialogOpen(true);
  };
  
  // Handle status update
  const handleStatusUpdate = (status: TicketStatus) => {
    if (!selectedTicket) return;
    updateStatus(selectedTicket.id, status);
    selectTicket({ ...selectedTicket, status });
  };
  
  // Handle close ticket
  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    if (!resolutionText || !rootCauseText) {
      toast.error('Veuillez remplir la résolution et la cause racine');
      return;
    }
    closeTicket(selectedTicket.id, rootCauseText, resolutionText);
    setDetailDialogOpen(false);
    setResolutionText('');
    setRootCauseText('');
  };
  
  // Handle add comment
  const handleAddComment = () => {
    if (!selectedTicket || !newComment.trim()) return;
    addComment(selectedTicket.id, newComment, commentVisibility);
    setNewComment('');
  };
  
  // Handle file upload for attachments tab
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedTicket) return;
    
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`Fichier trop volumineux: ${file.name} (max 40MB)`);
        continue;
      }
      await addAttachment(selectedTicket.id, file);
    }
    
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };
  
  // Handle file upload for comments
  const handleCommentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedTicket) return;
    
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`Fichier trop volumineux: ${file.name} (max 40MB)`);
        continue;
      }
      await addAttachment(selectedTicket.id, file);
    }
    
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };
  
  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!selectedTicket) return;
    
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`Fichier trop volumineux: ${file.name} (max 40MB)`);
        continue;
      }
      await addAttachment(selectedTicket.id, file);
    }
  }, [selectedTicket, addAttachment]);
  
  // Handle generate PDF report
  const handleGeneratePDF = async () => {
    if (!reportTechnician) return;
    
    try {
      const blob = await generateActivityPDF(reportTechnician, reportStartDate, reportEndDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_${reportTechnician}_${format(new Date(), 'dd-MM-yyyy')}.html`;
      link.click();
      URL.revokeObjectURL(url);
      
      addFlashMessage('success', 'PDF Généré', 'Le rapport a été téléchargé avec succès');
      setReportDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    }
  };
  
  // Get severity indicator
  const getSeverityIndicator = (severity: TicketSeverity) => {
    switch (severity) {
      case 'High': return <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />;
      case 'Medium': return <div className="w-3 h-3 rounded-full bg-orange-500" />;
      case 'Low': return <div className="w-3 h-3 rounded-full bg-green-500" />;
    }
  };
  
  // Get status badge - HIGH CONTRAST for both modes
  const getStatusBadge = (status: TicketStatus) => {
    const config = STATUS_CONFIG[status];
    const styles: Record<TicketStatus, string> = {
      'ouvert': 'bg-blue-600 text-white border-blue-700',
      'en_attente': 'bg-yellow-500 text-black border-yellow-600',
      'escalade': 'bg-red-600 text-white border-red-700',
      'ferme': 'bg-green-600 text-white border-green-700'
    };
    return (
      <Badge className={`${styles[status]} font-bold px-3 py-1 text-sm border-2`}>
        {config?.label}
      </Badge>
    );
  };
  
  // Get severity badge - HIGH CONTRAST for both modes
  const getSeverityBadge = (severity: TicketSeverity) => {
    const styles: Record<TicketSeverity, string> = {
      'High': 'bg-red-600 text-white border-red-700',
      'Medium': 'bg-orange-500 text-black border-orange-600',
      'Low': 'bg-green-600 text-white border-green-700'
    };
    return (
      <Badge className={`${styles[severity]} font-bold px-3 py-1 text-sm border-2`}>
        {severity}
      </Badge>
    );
  };

  // Render card view for tickets
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 overflow-auto h-full ticket-scroll-container">
      {filteredTickets.map(ticket => (
        <motion.div
          key={ticket.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
            rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer
            ${ticket.sla.isBreached && ticket.status !== 'ferme' ? 'border-l-4 border-l-red-500' : ''}
          `}
          onClick={() => handleSelectTicket(ticket)}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSeverityIndicator(ticket.severity)}
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{ticket.ticketNumber}</span>
              </div>
              {getStatusBadge(ticket.status)}
            </div>
            
            <h3 className="font-medium text-sm mb-2 line-clamp-2 text-gray-900 dark:text-white">{ticket.objet}</h3>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{ticket.accountName || ticket.lieu}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{LOCALITIES[ticket.localite]?.label}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                {ticket.technicienPrincipal ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-cyan-600 text-white">{ticket.technicienPrincipal.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{ticket.technicienPrincipal}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Non assigné</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-3 h-3" />
                <span>{ticket.conversationCount}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {filteredTickets.length === 0 && (
        <div className="col-span-full text-center py-12">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400">Aucun ticket trouvé</p>
          {canManage && (
            <Button 
              className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold" 
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Créer un ticket
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    if (!selectedTicket) return null;
    
    switch (activeTab) {
      case 'conversations':
        return (
          <div className="space-y-4">
            {/* Comments list */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto ticket-scroll-container">
              {selectedTicket.comments.length === 0 ? (
                <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-600 dark:text-gray-400">Aucune conversation</p>
                </div>
              ) : (
                selectedTicket.comments.map(comment => (
                  <div 
                    key={comment.id} 
                    className={`flex gap-3 p-4 rounded-lg border-2 ${
                      comment.visibility === 'prive' 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 border-l-4 border-l-gray-600' 
                        : 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 border-l-4 border-l-blue-600'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-cyan-600 text-white font-bold">{comment.authorName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white">{comment.authorName}</span>
                        <Badge 
                          className={`text-xs font-bold ${
                            comment.visibility === 'prive' 
                              ? 'bg-gray-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {comment.visibility === 'prive' ? (
                            <><Lock className="w-3 h-3 mr-1" /> Privé</>
                          ) : (
                            <><Globe className="w-3 h-3 mr-1" /> Public</>
                          )}
                        </Badge>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {format(comment.createdAt, 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-gray-800 dark:text-gray-200">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Add comment section - ALWAYS VISIBLE */}
            {canManage && (
              <div className="space-y-3 pt-4 border-t-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <Label className="font-bold text-base text-gray-900 dark:text-white">Ajouter un commentaire</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={commentVisibility === 'prive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentVisibility('prive')}
                      className={commentVisibility === 'prive' ? 'bg-gray-700 text-white font-bold' : 'border-gray-600 text-gray-700 dark:text-gray-300'}
                    >
                      <Lock className="w-4 h-4 mr-1" /> Privé
                    </Button>
                    <Button
                      variant={commentVisibility === 'public' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCommentVisibility('public')}
                      className={commentVisibility === 'public' ? 'bg-blue-600 text-white font-bold' : 'border-blue-600 text-blue-600'}
                    >
                      <Globe className="w-4 h-4 mr-1" /> Public
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Votre commentaire..."
                  rows={4}
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => commentFileInputRef.current?.click()}
                      className="border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Joindre un fichier
                    </Button>
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleCommentFileUpload}
                    />
                  </div>
                  <Button 
                    onClick={handleAddComment} 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'resolution':
        return (
          <div className="space-y-4">
            {selectedTicket.resolution ? (
              <Card className="border-2 border-green-500 dark:border-green-600">
                <CardHeader className="bg-green-100 dark:bg-green-900/50">
                  <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-300">
                    <CheckCircle2 className="w-5 h-5" />
                    Résolution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 bg-white dark:bg-gray-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600 dark:text-gray-400 text-sm">Comment résolu</Label>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedTicket.resolution.description}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600 dark:text-gray-400 text-sm">Cause</Label>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedTicket.resolution.cause}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600 dark:text-gray-400 text-sm">Action corrective</Label>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedTicket.resolution.correctiveAction}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600 dark:text-gray-400 text-sm">Heure de fin</Label>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{format(selectedTicket.resolution.endTime, 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-gray-600 dark:text-gray-400 text-sm">Résolu par</Label>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedTicket.resolution.resolvedByName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : canManage && selectedTicket.status !== 'ferme' ? (
              <div className="space-y-4 p-6 border-2 border-dashed rounded-lg bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600">
                <h4 className="font-bold flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                  <Edit className="w-5 h-5" />
                  Enregistrer la résolution
                </h4>
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Description de la résolution *</Label>
                  <Textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Comment le problème a été résolu..."
                    rows={4}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Cause racine *</Label>
                  <Textarea
                    value={rootCauseText}
                    onChange={(e) => setRootCauseText(e.target.value)}
                    placeholder="Cause du problème..."
                    rows={3}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <Button 
                  onClick={handleCloseTicket} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Clôturer le ticket
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400">Aucune résolution enregistrée</p>
              </div>
            )}
          </div>
        );
        
      case 'temps':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-300 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Entrées de temps</h3>
              <Badge className="font-bold bg-cyan-600 text-white">
                Total: {formatDuration(selectedTicket.timeEntries.reduce((acc, e) => acc + e.duration, 0))}
              </Badge>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto ticket-scroll-container">
              {selectedTicket.timeEntries.length === 0 ? (
                <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-600 dark:text-gray-400">Aucune entrée de temps</p>
                </div>
              ) : (
                selectedTicket.timeEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{entry.userName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg text-gray-900 dark:text-white">{formatDuration(entry.duration)}</p>
                      {entry.billable && <Badge className="text-xs font-bold bg-green-600 text-white">Facturable</Badge>}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {canManage && (
              <div className="space-y-3 pt-4 border-t-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 dark:text-white">Ajouter du temps</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Durée (minutes)</Label>
                    <Input
                      type="number"
                      value={newTimeEntry.duration || ''}
                      onChange={(e) => setNewTimeEntry(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                      className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Facturable</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={newTimeEntry.billable}
                        onCheckedChange={(checked) => setNewTimeEntry(prev => ({ ...prev, billable: checked }))}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{newTimeEntry.billable ? 'Oui' : 'Non'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Description</Label>
                  <Input
                    value={newTimeEntry.description || ''}
                    onChange={(e) => setNewTimeEntry(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={() => { addTimeEntry(selectedTicket.id, newTimeEntry); setNewTimeEntry({ description: '', duration: 0, billable: true }); }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}
          </div>
        );
        
      case 'pieces':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-300 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Pièces jointes</h3>
              <Badge className="font-bold bg-cyan-600 text-white">
                {selectedTicket.attachments.length} fichier(s)
              </Badge>
            </div>
            
            {/* Drag and drop zone */}
            {canManage && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging 
                    ? 'border-cyan-500 bg-cyan-100 dark:bg-cyan-900/30' 
                    : 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 hover:border-cyan-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-cyan-600' : 'text-gray-500 dark:text-gray-400'}`} />
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {isDragging ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos fichiers ici'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">ou</p>
                <Button 
                  variant="outline" 
                  onClick={() => attachmentInputRef.current?.click()} 
                  className="bg-white dark:bg-gray-900 border-2 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Parcourir les fichiers
                </Button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Taille max: 40MB • PDF, Images, Documents Office
                </p>
              </div>
            )}
            
            {/* Attachments list */}
            <div className="grid grid-cols-2 gap-3">
              {selectedTicket.attachments.length === 0 ? (
                <div className="col-span-2 text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                  <Paperclip className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-600 dark:text-gray-400">Aucune pièce jointe</p>
                </div>
              ) : (
                selectedTicket.attachments.map(att => (
                  <Card key={att.id} className="p-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-600 rounded">
                        <File className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{att.fileName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(att.fileSize / 1024 / 1024).toFixed(2)} MB • {att.uploadedByName}
                        </p>
                      </div>
                      {canManage && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeAttachment(selectedTicket.id, att.id)} 
                          className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
        
      case 'activite':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-300 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Activités</h3>
              <Badge className="font-bold bg-cyan-600 text-white">
                {selectedTicket.activities.filter(a => a.status === 'completed').length}/{selectedTicket.activities.length} complétées
              </Badge>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto ticket-scroll-container">
              {selectedTicket.activities.length === 0 ? (
                <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-600 dark:text-gray-400">Aucune activité</p>
                </div>
              ) : (
                selectedTicket.activities.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border-2 rounded-lg hover:shadow-sm transition-shadow bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={activity.status === 'completed'}
                        onCheckedChange={(checked) => {
                          updateActivity(selectedTicket.id, activity.id, {
                            status: checked ? 'completed' : 'pending'
                          });
                        }}
                        className="h-5 w-5"
                      />
                      <div>
                        <p className={`font-medium text-gray-900 dark:text-white ${activity.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.assignedTo.map((name, i) => (
                        <Avatar key={i} className="h-6 w-6">
                          <AvatarFallback className="text-[8px] bg-cyan-600 text-white font-bold">{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {canManage && (
              <div className="space-y-3 pt-4 border-t-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 dark:text-white">Ajouter une activité</h4>
                <Input
                  value={newActivity.title || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre de l'activité"
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                />
                <Textarea
                  value={newActivity.description || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description..."
                  rows={2}
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                />
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Assigner à:</Label>
                  <div className="flex flex-wrap gap-2">
                    {TECHNICIANS.slice(0, 8).map(tech => (
                      <label key={tech.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
                        <Checkbox
                          checked={newActivity.assignedTo?.includes(tech.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewActivity(prev => ({ ...prev, assignedTo: [...(prev.assignedTo || []), tech.name] }));
                            } else {
                              setNewActivity(prev => ({ ...prev, assignedTo: prev.assignedTo?.filter(n => n !== tech.name) }));
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{tech.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => { addActivity(selectedTicket.id, newActivity); setNewActivity({ title: '', description: '', assignedTo: [], priority: 'Medium' }); }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}
          </div>
        );
        
      case 'approbation':
        return (
          <div className="space-y-4">
            {selectedTicket.approvals.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                <ThumbsUp className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">Aucune approbation requise</p>
                {canManage && (
                  <Button 
                    variant="outline" 
                    onClick={() => requestApproval(selectedTicket.id)}
                    className="border-2 border-cyan-600 text-cyan-600 font-bold"
                  >
                    Demander une approbation
                  </Button>
                )}
              </div>
            ) : (
              selectedTicket.approvals.map(approval => (
                <Card key={approval.id} className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 dark:text-white">Demandé par {approval.requestedByName}</span>
                      <Badge className={
                        approval.status === 'approved' ? 'bg-green-600 text-white font-bold' :
                        approval.status === 'rejected' ? 'bg-red-600 text-white font-bold' :
                        'bg-yellow-500 text-black font-bold'
                      }>
                        {approval.status === 'approved' ? 'Approuvé' :
                         approval.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(approval.requestedAt, 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                    {approval.status === 'pending' && canManage && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-2 border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 font-bold" 
                          onClick={() => approveTicket(selectedTicket.id)}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" /> Approuver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 border-2 border-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold" 
                          onClick={() => rejectTicket(selectedTicket.id)}
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" /> Rejeter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );
        
      case 'historique':
        return (
          <div className="space-y-2 max-h-[500px] overflow-y-auto ticket-scroll-container">
            {selectedTicket.history.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400">Aucun historique</p>
              </div>
            ) : (
              selectedTicket.history.map(entry => (
                <div key={entry.id} className="flex gap-3 p-4 border-l-4 border-cyan-600 hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-900 rounded-r-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[8px] bg-cyan-600 text-white font-bold">{entry.userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{entry.userName}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {format(entry.timestamp, 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm mt-2 ml-8 text-gray-700 dark:text-gray-300">{entry.details}</p>
                    {entry.oldValue && entry.newValue && (
                      <div className="mt-2 ml-8 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="line-through text-red-600 font-medium">{entry.oldValue}</span>
                          {' → '}
                          <span className="font-bold text-green-600">{entry.newValue}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Flash Messages */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {flashMessages.map(flash => (
              <motion.div
                key={flash.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className={`p-4 rounded-lg shadow-lg flex items-start gap-3 min-w-[300px] max-w-[400px] ${
                  flash.type === 'success' ? 'bg-green-600 text-white' :
                  flash.type === 'error' ? 'bg-red-600 text-white' :
                  flash.type === 'warning' ? 'bg-orange-500 text-white' :
                  'bg-blue-600 text-white'
                }`}
              >
                {flash.type === 'success' && <CheckCircle2 className="w-5 h-5 mt-0.5" />}
                {flash.type === 'error' && <XCircle className="w-5 h-5 mt-0.5" />}
                {flash.type === 'warning' && <AlertTriangle className="w-5 h-5 mt-0.5" />}
                {flash.type === 'info' && <Info className="w-5 h-5 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-bold">{flash.title}</p>
                  <p className="text-sm opacity-90">{flash.message}</p>
                </div>
                <button onClick={() => removeFlashMessage(flash.id)} className="text-white/80 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 pb-4 border-b-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 -mx-4 -mt-4 shadow-md">
          {/* Top row: Title and Create Button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/upload/logo_sc.png" alt="Silicone Connect" className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{MODULE_NAME}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{MODULE_SUBTITLE}</p>
              </div>
            </div>
            
            {/* CREATE TICKET BUTTON - ALWAYS VISIBLE AND PROMINENT */}
            {canManage && (
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-bold shadow-lg border-2 border-cyan-500 dark:border-cyan-400 px-6 py-3 text-base gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer un ticket
              </Button>
            )}
          </div>
          
          {/* Bottom row: Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <Input
                className="pl-9 w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                placeholder="Rechercher ticket..."
                value={filter.searchQuery}
                onChange={(e) => setFilter({ searchQuery: e.target.value })}
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-none' : 'rounded-none text-gray-700 dark:text-gray-300'}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className={viewMode === 'card' ? 'bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-none' : 'rounded-none text-gray-700 dark:text-gray-300'}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Export */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV} 
              className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-900"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            
            {/* Report PDF */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setReportDialogOpen(true)} 
              className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-900"
            >
              <FileText className="w-4 h-4 mr-2" />
              Rapport PDF
            </Button>
            
            {/* Trash */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTrashDialogOpen(true)} 
              className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-900 relative"
            >
              <Trash2 className="w-4 h-4" />
              {trash.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {trash.length}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          <Card className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700">
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </Card>
          <Card className="p-2 bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-400 dark:border-blue-600">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.ouverts}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Ouverts</div>
          </Card>
          <Card className="p-2 bg-yellow-100 dark:bg-yellow-900/50 border-2 border-yellow-400 dark:border-yellow-600">
            <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stats.enAttente}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">En attente</div>
          </Card>
          <Card className="p-2 bg-red-100 dark:bg-red-900/50 border-2 border-red-400 dark:border-red-600">
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{stats.escalades}</div>
            <div className="text-xs text-red-600 dark:text-red-400">Escaladés</div>
          </Card>
          <Card className="p-2 bg-green-100 dark:bg-green-900/50 border-2 border-green-400 dark:border-green-600">
            <div className="text-xl font-bold text-green-700 dark:text-green-300">{stats.fermes}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Fermés</div>
          </Card>
          <Card className="p-2 bg-red-200 dark:bg-red-900/70 border-2 border-red-500 dark:border-red-500">
            <div className="text-xl font-bold text-red-800 dark:text-red-200">{stats.enRetard}</div>
            <div className="text-xs text-red-700 dark:text-red-300">En retard</div>
          </Card>
          <Card className="p-2 bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-400 dark:border-purple-600">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{stats.critiques}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Critiques</div>
          </Card>
          <Card className="p-2 bg-cyan-100 dark:bg-cyan-900/50 border-2 border-cyan-400 dark:border-cyan-600">
            <div className="text-xl font-bold text-cyan-700 dark:text-cyan-300">{stats.slaCompliance}%</div>
            <div className="text-xs text-cyan-600 dark:text-cyan-400">SLA OK</div>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700">
          <Select value={filter.status} onValueChange={(v) => setFilter({ status: v as TicketStatus | 'all' })}>
            <SelectTrigger className="w-36 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filter.severity} onValueChange={(v) => setFilter({ severity: v as TicketSeverity | 'all' })}>
            <SelectTrigger className="w-36 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
              <SelectItem value="all">Toutes priorités</SelectItem>
              {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filter.type} onValueChange={(v) => setFilter({ type: v as TicketTypeEnum | 'all' })}>
            <SelectTrigger className="w-44 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
              <SelectItem value="all">Tous types</SelectItem>
              {Object.entries(TICKET_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filter.localite} onValueChange={(v) => setFilter({ localite: v as any })}>
            <SelectTrigger className="w-40 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
              <SelectValue placeholder="Localité" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
              <SelectItem value="all">Toutes localités</SelectItem>
              {Object.entries(LOCALITIES).map(([key, config]) => (
                <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filter.technicien} onValueChange={(v) => setFilter({ technicien: v })}>
            <SelectTrigger className="w-44 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
              <SelectValue placeholder="Technicien" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
              <SelectItem value="all">Tous techniciens</SelectItem>
              {TECHNICIANS.map(tech => (
                <SelectItem key={tech.id} value={tech.name} className="text-gray-900 dark:text-white">{tech.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setFilter({ isOverdue: !filter.isOverdue })} 
            className={`border-2 font-bold ${filter.isOverdue ? 'bg-red-600 text-white border-red-700' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900'}`}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            En retard
          </Button>
          
          {(filter.status !== 'all' || filter.severity !== 'all' || filter.type !== 'all' || filter.localite !== 'all' || filter.technicien !== 'all' || filter.isOverdue) && (
            <Button variant="ghost" size="sm" onClick={clearFilter} className="text-gray-700 dark:text-gray-300 font-bold">
              <X className="w-4 h-4 mr-2" />
              Effacer les filtres
            </Button>
          )}
        </div>
        
        {/* Ticket List - Card or Table Format */}
        <div className="flex-1 overflow-hidden border-2 rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 relative">
          {viewMode === 'card' ? (
            renderCardView()
          ) : (
            <>
              {/* Scrollbar styles */}
              <style global>{`
                .ticket-scroll-container {
                  scrollbar-width: auto !important;
                  scrollbar-color: #0891b2 #e5e7eb !important;
                }
                .dark .ticket-scroll-container {
                  scrollbar-color: #0891b2 #374151 !important;
                }
                .ticket-scroll-container::-webkit-scrollbar {
                  width: 14px !important;
                  height: 14px !important;
                  display: block !important;
                }
                .ticket-scroll-container::-webkit-scrollbar-track {
                  background: #e5e7eb;
                  border-radius: 8px;
                }
                .dark .ticket-scroll-container::-webkit-scrollbar-track {
                  background: #374151;
                }
                .ticket-scroll-container::-webkit-scrollbar-thumb {
                  background: #0891b2;
                  border-radius: 8px;
                  border: 2px solid #e5e7eb;
                }
                .dark .ticket-scroll-container::-webkit-scrollbar-thumb {
                  border-color: #374151;
                }
                .ticket-scroll-container::-webkit-scrollbar-thumb:hover {
                  background: #0e7490;
                }
                .ticket-scroll-container::-webkit-scrollbar-corner {
                  background: #e5e7eb;
                }
                .dark .ticket-scroll-container::-webkit-scrollbar-corner {
                  background: #374151;
                }
              `}</style>
              {/* Container with scrollbars */}
              <div 
                className="ticket-scroll-container h-full overflow-auto"
                style={{ maxWidth: '100%' }}
              >
                <Table className="min-w-[1400px]">
                  <TableHeader className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10 shadow-sm">
                    <TableRow className="hover:bg-gray-200 dark:hover:bg-gray-700">
                      <TableHead className="w-10 bg-gray-200 dark:bg-gray-700 sticky left-0 z-20">
                        <Checkbox 
                          checked={selectedRows.length === filteredTickets.length && filteredTickets.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRows(filteredTickets.map(t => t.id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[160px]">ID du Ticket</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[300px]">Objet</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[150px]">Contact</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[150px]">Compte</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[130px]">Fil récent</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[140px]">Date échéance</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[120px]">État</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[160px]">Propriétaire</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 min-w-[100px]">Canal</TableHead>
                      <TableHead className="w-40 bg-gray-200 dark:bg-gray-700 sticky right-0 z-20 font-bold text-gray-900 dark:text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredTickets.map(ticket => (
                        <motion.tr
                          key={ticket.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`
                            cursor-pointer border-b border-gray-200 dark:border-gray-700
                            hover:bg-cyan-50 dark:hover:bg-cyan-900/30
                            ${selectedRows.includes(ticket.id) ? 'bg-cyan-100 dark:bg-cyan-900/40' : 'bg-white dark:bg-gray-800'}
                            ${ticket.sla.isBreached && ticket.status !== 'ferme' ? 'bg-red-50 dark:bg-red-900/20' : ''}
                          `}
                          onClick={() => handleSelectTicket(ticket)}
                          onMouseEnter={() => setHoveredRow(ticket.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRows.includes(ticket.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRows(prev => [...prev, ticket.id]);
                                } else {
                                  setSelectedRows(prev => prev.filter(id => id !== ticket.id));
                                }
                              }}
                              className="border-2 border-gray-400 dark:border-gray-500"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {getSeverityIndicator(ticket.severity)}
                              <span className="font-medium">{ticket.ticketNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            <div className="max-w-[200px] truncate font-medium">{ticket.objet}</div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{ticket.contactName || '-'}</TableCell>
                          <TableCell className="font-medium text-gray-900 dark:text-white">{ticket.accountName || ticket.lieu}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {ticket.comments.length > 0 
                              ? format(ticket.comments[ticket.comments.length - 1].createdAt, 'dd MMM HH:mm', { locale: fr })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                            {ticket.dueDate ? format(ticket.dueDate, 'dd MMM HH:mm', { locale: fr }) : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ticket.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {ticket.technicienPrincipal ? (
                                <>
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[8px] bg-cyan-600 text-white font-bold">{ticket.technicienPrincipal.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{ticket.technicienPrincipal}</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">Non assigné</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 dark:text-gray-300">{ticket.source}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {/* ALWAYS VISIBLE action buttons */}
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700" 
                                    onClick={() => handleSelectTicket(ticket)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir</TooltipContent>
                              </Tooltip>
                              {canManage && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white border-blue-700" 
                                        onClick={() => { handleSelectTicket(ticket); }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modifier</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 bg-orange-600 hover:bg-orange-700 text-white border-orange-700" 
                                        onClick={() => moveToTrash(ticket.id)}
                                      >
                                        <Archive className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Archiver</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white border-red-700" 
                                        onClick={() => { moveToTrash(ticket.id); }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Supprimer</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    
                    {filteredTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12">
                          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                          <p className="text-gray-600 dark:text-gray-400">Aucun ticket trouvé</p>
                          {canManage && (
                            <Button 
                              className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold" 
                              onClick={() => setCreateDialogOpen(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" /> Créer un ticket
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
        
        {/* Create Ticket Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-white">
                <Plus className="w-5 h-5 text-cyan-600" />
                Créer un nouveau ticket
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Remplissez les informations pour créer un ticket. Une copie sera envoyée par email.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Contact Information */}
              <div className="space-y-3 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Informations de Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Nom de Contact</Label>
                    <Input 
                      value={newTicket.contactName || ''} 
                      onChange={(e) => setNewTicket(prev => ({ ...prev, contactName: e.target.value }))} 
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Nom de Compte *</Label>
                    <Input 
                      value={newTicket.accountName || ''} 
                      onChange={(e) => setNewTicket(prev => ({ ...prev, accountName: e.target.value, lieu: e.target.value }))} 
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Email</Label>
                    <Input 
                      type="email" 
                      value={newTicket.email || ''} 
                      onChange={(e) => setNewTicket(prev => ({ ...prev, email: e.target.value }))} 
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Téléphone</Label>
                    <Input 
                      value={newTicket.phone || ''} 
                      onChange={(e) => setNewTicket(prev => ({ ...prev, phone: e.target.value }))} 
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                    />
                  </div>
                </div>
              </div>
            
              {/* Ticket Information */}
              <div className="space-y-3 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Information Ticket</h4>
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Objet *</Label>
                  <Input 
                    value={newTicket.objet || ''} 
                    onChange={(e) => setNewTicket(prev => ({ ...prev, objet: e.target.value }))} 
                    placeholder="Ex: DEPLOIEMENT CAMPAGNE PRESIDENTIELLE - PALAIS DES CONGRES" 
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Type</Label>
                    <Select value={newTicket.type} onValueChange={(v) => setNewTicket(prev => ({ ...prev, type: v as TicketTypeEnum }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(TICKET_TYPES).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Priorité</Label>
                    <Select value={newTicket.severity} onValueChange={(v) => setNewTicket(prev => ({ ...prev, severity: v as TicketSeverity }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${key === 'High' ? 'bg-red-500' : key === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Canal</Label>
                    <Select value={newTicket.source} onValueChange={(v) => setNewTicket(prev => ({ ...prev, source: v as any }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(CANAL_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Classification</Label>
                    <Select value={newTicket.classification} onValueChange={(v) => setNewTicket(prev => ({ ...prev, classification: v as any }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(CLASSIFICATION_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Langue</Label>
                    <Select value={newTicket.language} onValueChange={(v) => setNewTicket(prev => ({ ...prev, language: v as any }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800 dark:text-gray-200">Localité</Label>
                    <Select value={newTicket.localite} onValueChange={(v) => setNewTicket(prev => ({ ...prev, localite: v as any }))}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                        {Object.entries(LOCALITIES).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            
              {/* Techniciens */}
              <div className="space-y-2">
                <Label className="font-medium text-gray-800 dark:text-gray-200">Techniciens assignés</Label>
                <div className="flex flex-wrap gap-2 p-3 border-2 rounded-lg bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                  {TECHNICIANS.map(tech => (
                    <label key={tech.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                      <Checkbox
                        checked={newTicket.techniciens?.includes(tech.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewTicket(prev => ({ ...prev, techniciens: [...(prev.techniciens || []), tech.name] }));
                          } else {
                            setNewTicket(prev => ({ ...prev, techniciens: prev.techniciens?.filter(t => t !== tech.name) }));
                          }
                        }}
                        className="border-2 border-gray-400 dark:border-gray-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{tech.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            
              {/* Description */}
              <div className="space-y-2">
                <Label className="font-medium text-gray-800 dark:text-gray-200">Description</Label>
                <Textarea 
                  value={newTicket.description || ''} 
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))} 
                  rows={4} 
                  placeholder="Description détaillée du problème ou de la demande..." 
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" 
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateTicket} 
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              >
                <Send className="w-4 h-4 mr-2" />
                Créer le ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Ticket Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
            {selectedTicket && (
              <>
                <DialogHeader className="pb-4 border-b-2 border-gray-300 dark:border-gray-700">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {getSeverityIndicator(selectedTicket.severity)}
                        <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{selectedTicket.ticketNumber}</span>
                        {getStatusBadge(selectedTicket.status)}
                        {getSeverityBadge(selectedTicket.severity)}
                      </div>
                      <DialogTitle className="text-xl mb-3 text-gray-900 dark:text-white">{selectedTicket.objet}</DialogTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                        <span>{format(selectedTicket.createdAt, 'dd MMM yyyy hh:mm a', { locale: fr })}</span>
                        {selectedTicket.status !== 'ferme' && (
                          <span className="font-mono bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded font-bold">{elapsedTime}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {selectedTicket.conversationCount}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{formatTimeAgo(selectedTicket.createdAt)}</span>
                      </div>
                    </div>
                    {/* Action buttons - ALWAYS VISIBLE */}
                    {canManage && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedTicket.status !== 'ferme' && (
                          <>
                            <Select value={selectedTicket.status} onValueChange={(v) => handleStatusUpdate(v as TicketStatus)}>
                              <SelectTrigger className="w-36 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key} className="text-gray-900 dark:text-white">{config.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => escalateTicket(selectedTicket.id)} 
                              className="border-2 border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold"
                            >
                              <ArrowUpCircle className="w-4 h-4 mr-1" /> Escalader
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { moveToTrash(selectedTicket.id); setDetailDialogOpen(false); }} 
                              className="border-2 border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 font-bold"
                            >
                              <Archive className="w-4 h-4 mr-1" /> Archiver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { moveToTrash(selectedTicket.id); setDetailDialogOpen(false); }} 
                              className="border-2 border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold"
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                            </Button>
                          </>
                        )}
                        {selectedTicket.status === 'ferme' && (
                          <Button 
                            variant="outline" 
                            onClick={() => reopenTicket(selectedTicket.id)}
                            className="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 font-bold"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Rouvrir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </DialogHeader>
                
                {/* Ticket Info Cards */}
                <div className="grid grid-cols-4 gap-3 py-4">
                  <Card className="p-3 bg-gray-100 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Client</span>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedTicket.accountName || selectedTicket.lieu}</p>
                  </Card>
                  <Card className="p-3 bg-gray-100 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Technicien assigné</span>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedTicket.techniciens.join(', ') || 'Non assigné'}</p>
                  </Card>
                  <Card className="p-3 bg-gray-100 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Localité</span>
                    <p className="font-bold text-gray-900 dark:text-white">{LOCALITIES[selectedTicket.localite]?.label}</p>
                  </Card>
                  <Card className="p-3 bg-gray-100 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Statut</span>
                    <div className="flex items-center gap-2">
                      {STATUS_CONFIG[selectedTicket.status]?.icon === 'AlertCircle' && <AlertCircle className="w-4 h-4 text-blue-500" />}
                      {STATUS_CONFIG[selectedTicket.status]?.icon === 'Pause' && <Pause className="w-4 h-4 text-yellow-500" />}
                      {STATUS_CONFIG[selectedTicket.status]?.icon === 'ArrowUpCircle' && <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                      {STATUS_CONFIG[selectedTicket.status]?.icon === 'CheckCircle' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      <span className="font-bold text-gray-900 dark:text-white">{STATUS_CONFIG[selectedTicket.status]?.label}</span>
                    </div>
                  </Card>
                </div>
                
                {/* ETA / ETR */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Card className="p-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">ETA (Arrivée estimée)</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedTicket.sla.eta ? format(selectedTicket.sla.eta, 'dd MMM HH:mm') : '--:--'}</p>
                      </div>
                      {canManage && selectedTicket.status !== 'ferme' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-cyan-600 font-bold"><Edit className="w-4 h-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                            <Input type="datetime-local" onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) updateETA(selectedTicket.id, d); }} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </Card>
                  <Card className="p-3 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">ETR (Restauration estimée)</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedTicket.sla.etr ? format(selectedTicket.sla.etr, 'dd MMM HH:mm') : '--:--'}</p>
                      </div>
                      {canManage && selectedTicket.status !== 'ferme' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-cyan-600 font-bold"><Edit className="w-4 h-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                            <Input type="datetime-local" onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) updateETR(selectedTicket.id, d); }} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600" />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </Card>
                </div>
                
                {/* Creator Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
                  <User className="w-4 h-4" />
                  <span>Créé par <strong className="text-gray-900 dark:text-white">{selectedTicket.createdByName}</strong></span>
                  <span>•</span>
                  <span>Modifié par <strong className="text-gray-900 dark:text-white">{selectedTicket.lastModifiedByName}</strong></span>
                </div>
                
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-7 w-full bg-gray-200 dark:bg-gray-700 h-auto">
                    <TabsTrigger value="conversations" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Conversations
                    </TabsTrigger>
                    <TabsTrigger value="resolution" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Résolution
                    </TabsTrigger>
                    <TabsTrigger value="temps" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <Clock className="w-4 h-4 mr-1" />
                      Temps
                    </TabsTrigger>
                    <TabsTrigger value="pieces" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <Paperclip className="w-4 h-4 mr-1" />
                      Pièces
                    </TabsTrigger>
                    <TabsTrigger value="activite" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <Activity className="w-4 h-4 mr-1" />
                      Activité
                    </TabsTrigger>
                    <TabsTrigger value="approbation" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Approbation
                    </TabsTrigger>
                    <TabsTrigger value="historique" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-bold py-2">
                      <History className="w-4 h-4 mr-1" />
                      Historique
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    {renderTabContent()}
                  </div>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Trash Dialog */}
        <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Trash2 className="w-5 h-5 text-red-600" />
                Corbeille
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Les tickets sont automatiquement supprimés après {TRASH_AUTO_DELETE_DAYS} jours.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto ticket-scroll-container">
              {trash.length === 0 ? (
                <p className="text-center py-8 text-gray-600 dark:text-gray-400">Corbeille vide</p>
              ) : (
                trash.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border-2 rounded-lg bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{item.ticketData.ticketNumber}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[300px]">{item.ticketData.objet}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Supprimé par {item.deletedByName} • {format(item.deletedAt, 'dd MMM HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => restoreFromTrash(item.id)} 
                        className="border-2 border-green-600 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 font-bold"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" /> Restaurer
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => permanentDelete(item.id)}
                        className="font-bold"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Supprimer définitivement
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <DialogFooter>
              {trash.length > 0 && (
                <Button variant="destructive" onClick={emptyTrash} className="font-bold">
                  Vider la corbeille
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => setTrashDialogOpen(false)}
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Générer un rapport PDF</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Sélectionnez un technicien et une période pour le rapport.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium text-gray-800 dark:text-gray-200">Technicien</Label>
                <Select value={reportTechnician} onValueChange={setReportTechnician}>
                  <SelectTrigger className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionner un technicien" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600">
                    {TECHNICIANS.map(tech => (
                      <SelectItem key={tech.id} value={tech.id} className="text-gray-900 dark:text-white">{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Date début</Label>
                  <Input 
                    type="date" 
                    value={format(reportStartDate, 'yyyy-MM-dd')}
                    onChange={(e) => setReportStartDate(new Date(e.target.value))}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-gray-800 dark:text-gray-200">Date fin</Label>
                  <Input 
                    type="date" 
                    value={format(reportEndDate, 'yyyy-MM-dd')}
                    onChange={(e) => setReportEndDate(new Date(e.target.value))}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setReportDialogOpen(false)}
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleGeneratePDF} 
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Générer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
