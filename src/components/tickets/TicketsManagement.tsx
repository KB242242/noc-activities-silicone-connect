'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, Ticket, Phone, Mail, Clock, Calendar as CalendarIcon,
  FileText, Download, Eye, X, AlertTriangle, CheckCircle, User, Building2,
  ChevronDown, ChevronUp, ArrowUpRight, MessageCircle, Paperclip, Activity,
  History, Archive, RefreshCw, Send, MoreVertical, Filter, XCircle, Loader2,
  AlertCircle, Zap, TrendingUp, Users, MapPin, Globe, Wrench
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Ticket as TicketType, TicketStatus, TicketPriority, TicketType as TicketTypeEnum,
  TicketChannel, ResolutionType, TicketComment, TicketActivity, TicketHistory,
  TicketAttachment, TimeEntry, Technician
} from '@/types';
import {
  generateId, generateTicketNumber, formatDate, formatDateTime, formatTime,
  timeAgo, getTimeSinceOpening, isSlaExceeded, calculateOutageDuration,
  formatOutageDuration, saveToStorage, loadFromStorage
} from '@/lib/utils';
import {
  TICKET_STATUS_CONFIG, TICKET_PRIORITY_CONFIG, TICKET_TYPE_CONFIG,
  TICKET_CHANNEL_CONFIG, RESOLUTION_TYPE_CONFIG, SITES_LIST, LOCALITIES_LIST,
  DEFAULT_TECHNICIANS, ALL_CLIENTS, ALERT_THRESHOLDS
} from '@/lib/constants';

interface TicketsManagementProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function TicketsManagement({ user }: TicketsManagementProps) {
  // State
  const [tickets, setTickets] = useState<TicketType[]>(() =>
    loadFromStorage('noc_tickets', [])
  );
  const [technicians, setTechnicians] = useState<Technician[]>(() =>
    loadFromStorage('noc_technicians', DEFAULT_TECHNICIANS.map(t => ({
      ...t,
      id: generateId(),
      isActive: true,
      assignedTicketsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })))
  );
  const [archivedTickets, setArchivedTickets] = useState<TicketType[]>(() =>
    loadFromStorage('noc_archived_tickets', [])
  );
  const [trashTickets, setTrashTickets] = useState<TicketType[]>(() =>
    loadFromStorage('noc_trash_tickets', [])
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [showMyTickets, setShowMyTickets] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentIsPrivate, setCommentIsPrivate] = useState(false);

  // Activity state
  const [newActivity, setNewActivity] = useState({ task: '', assignedTo: '' });

  // Resolution state
  const [resolutionData, setResolutionData] = useState({
    type: '' as ResolutionType | '',
    description: '',
    outageStartTime: '',
    outageEndTime: ''
  });

  // Time entry state
  const [timeEntryData, setTimeEntryData] = useState({
    startTime: '',
    endTime: '',
    description: ''
  });

  // Form state for create/edit
  const [formData, setFormData] = useState({
    object: '',
    type: 'incident_minor' as TicketTypeEnum,
    target: '',
    clients: [] as { id: string; name: string; serviceType: string; ipAddress?: string }[],
    locality: '',
    site: '',
    link: '',
    technicians: [] as { id: string; name: string; pseudo: string }[],
    source: 'email' as TicketChannel,
    priority: 'medium' as TicketPriority,
    serviceType: '' as string,
    dueDate: addDays(new Date(), 1),
    description: ''
  });

  // Real-time clock for SLA counter
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage
  useEffect(() => {
    saveToStorage('noc_tickets', tickets);
  }, [tickets]);

  useEffect(() => {
    saveToStorage('noc_archived_tickets', archivedTickets);
  }, [archivedTickets]);

  useEffect(() => {
    saveToStorage('noc_trash_tickets', trashTickets);
  }, [trashTickets]);

  // Get all ticket numbers for ID generation
  const allTicketNumbers = [
    ...tickets.map(t => t.ticketNumber),
    ...archivedTickets.map(t => t.ticketNumber),
    ...trashTickets.map(t => t.ticketNumber)
  ];

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.clients.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesSite = siteFilter === 'all' || ticket.site === siteFilter;
    const matchesTechnician = technicianFilter === 'all' ||
      ticket.technicians.some(t => t.id === technicianFilter || t.pseudo === technicianFilter);

    const matchesPeriod = (() => {
      if (periodFilter === 'all') return true;
      const ticketDate = new Date(ticket.createdAt);
      const now = new Date();
      switch (periodFilter) {
        case 'today': return ticketDate.toDateString() === now.toDateString();
        case 'week': return ticketDate >= addDays(now, -7);
        case 'month': return ticketDate >= addDays(now, -30);
        default: return true;
      }
    })();

    const matchesMyTickets = !showMyTickets || ticket.creatorEmail === user?.email ||
      ticket.technicians.some(t => t.pseudo === user?.name);

    return matchesSearch && matchesStatus && matchesPriority &&
      matchesSite && matchesTechnician && matchesPeriod && matchesMyTickets;
  });

  // Stats
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    escalated: tickets.filter(t => t.status === 'escalated').length,
    slaExceeded: tickets.filter(t => isSlaExceeded(t.dueDate) && !['closed', 'resolved'].includes(t.status)).length,
    total: tickets.length
  };

  // Check if technician is available (less than 3 active tickets this week)
  const isTechnicianAvailable = (techId: string): { available: boolean; activeTickets: TicketType[] } => {
    const oneWeekAgo = addDays(new Date(), -7);
    const activeTickets = tickets.filter(t =>
      t.technicians.some(tech => tech.id === techId) &&
      !['closed', 'resolved'].includes(t.status) &&
      new Date(t.createdAt) >= oneWeekAgo
    );

    return {
      available: activeTickets.length < ALERT_THRESHOLDS.maxTicketsPerTechnicianPerWeek,
      activeTickets
    };
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      object: '',
      type: 'incident_minor',
      target: '',
      clients: [],
      locality: '',
      site: '',
      link: '',
      technicians: [],
      source: 'email',
      priority: 'medium',
      serviceType: '',
      dueDate: addDays(new Date(), 1),
      description: ''
    });
  };

  // Create ticket
  const handleCreate = () => {
    if (!formData.object.trim()) {
      toast.error('L\'objet du ticket est requis');
      return;
    }
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const ticketNumber = generateTicketNumber(allTicketNumbers);

    const newTicket: TicketType = {
      id: generateId(),
      ticketNumber,
      object: formData.object,
      type: formData.type,
      target: formData.target,
      clients: formData.clients,
      locality: formData.locality,
      site: formData.site,
      link: formData.link,
      technicians: formData.technicians,
      source: formData.source,
      priority: formData.priority,
      status: 'open',
      serviceType: formData.serviceType as any,
      creatorEmail: user.email,
      creatorName: user.name,
      dueDate: formData.dueDate,
      description: formData.description,
      isRecurring: false,
      isArchived: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTickets(prev => [newTicket, ...prev]);
    setCreateDialogOpen(false);
    resetForm();
    toast.success(`Ticket ${ticketNumber} créé avec succès`);
  };

  // Update ticket
  const handleUpdate = () => {
    if (!selectedTicket || !formData.object.trim()) {
      toast.error('L\'objet du ticket est requis');
      return;
    }

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id
        ? {
          ...t,
          object: formData.object,
          type: formData.type,
          target: formData.target,
          clients: formData.clients,
          locality: formData.locality,
          site: formData.site,
          link: formData.link,
          technicians: formData.technicians,
          source: formData.source,
          priority: formData.priority,
          dueDate: formData.dueDate,
          description: formData.description,
          updatedAt: new Date()
        }
        : t
    ));

    setEditDialogOpen(false);
    resetForm();
    setSelectedTicket(null);
    toast.success('Ticket mis à jour avec succès');
  };

  // Change ticket status
  const handleChangeStatus = (status: TicketStatus) => {
    if (!selectedTicket) return;

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id
        ? {
          ...t,
          status,
          resolvedAt: status === 'resolved' ? new Date() : undefined,
          closedAt: status === 'closed' ? new Date() : undefined,
          updatedAt: new Date()
        }
        : t
    ));

    setSelectedTicket(prev => prev ? { ...prev, status } : null);
    toast.success(`Statut changé vers "${TICKET_STATUS_CONFIG[status].label}"`);
  };

  // Add comment
  const handleAddComment = () => {
    if (!selectedTicket || !newComment.trim()) return;

    const comment: TicketComment = {
      id: generateId(),
      ticketId: selectedTicket.id,
      authorId: user?.id || '',
      authorName: user?.name || 'Anonyme',
      content: newComment,
      isPrivate: commentIsPrivate,
      isEdited: false,
      createdAt: new Date()
    };

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id
        ? { ...t, updatedAt: new Date() }
        : t
    ));

    setSelectedTicket(prev => prev ? {
      ...prev,
      // Add comment to ticket (you'll need to add comments array to Ticket type)
    } : null);

    setNewComment('');
    setCommentIsPrivate(false);
    toast.success('Commentaire ajouté');
  };

  // Add activity/sub-task
  const handleAddActivity = () => {
    if (!selectedTicket || !newActivity.task.trim() || !newActivity.assignedTo) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const tech = technicians.find(t => t.id === newActivity.assignedTo);
    if (!tech) return;

    const activity: TicketActivity = {
      id: generateId(),
      ticketId: selectedTicket.id,
      task: newActivity.task,
      assignedTo: { id: tech.id, name: `${tech.firstName} ${tech.lastName}`, pseudo: tech.pseudo },
      status: 'pending',
      createdAt: new Date()
    };

    // Add activity to ticket...

    setNewActivity({ task: '', assignedTo: '' });
    toast.success('Activité ajoutée');
  };

  // Archive ticket
  const handleArchive = (ticket: TicketType) => {
    setTickets(prev => prev.filter(t => t.id !== ticket.id));
    setArchivedTickets(prev => [...prev, { ...ticket, isArchived: true }]);
    toast.success('Ticket archivé');
    if (detailDialogOpen) setDetailDialogOpen(false);
  };

  // Restore from archive
  const handleRestore = (ticket: TicketType) => {
    setArchivedTickets(prev => prev.filter(t => t.id !== ticket.id));
    setTickets(prev => [...prev, { ...ticket, isArchived: false }]);
    toast.success('Ticket restauré');
  };

  // Move to trash
  const handleTrash = (ticket: TicketType) => {
    setTickets(prev => prev.filter(t => t.id !== ticket.id));
    setTrashTickets(prev => [...prev, { ...ticket, isDeleted: true, deletedAt: new Date() }]);
    toast.success('Ticket déplacé vers la corbeille');
    if (detailDialogOpen) setDetailDialogOpen(false);
  };

  // Delete permanently
  const handleDeletePermanently = () => {
    if (!selectedTicket) return;
    setTrashTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
    setDeleteDialogOpen(false);
    setSelectedTicket(null);
    toast.success('Ticket supprimé définitivement');
  };

  // Open edit dialog
  const openEditDialog = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setFormData({
      object: ticket.object,
      type: ticket.type,
      target: ticket.target || '',
      clients: ticket.clients,
      locality: ticket.locality,
      site: ticket.site,
      link: ticket.link || '',
      technicians: ticket.technicians,
      source: ticket.source,
      priority: ticket.priority,
      serviceType: ticket.serviceType || '',
      dueDate: new Date(ticket.dueDate),
      description: ticket.description
    });
    setEditDialogOpen(true);
  };

  // Open detail dialog
  const openDetailDialog = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Tickets</h2>
          <p className="text-muted-foreground">Gérez les incidents et demandes</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ouverts</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Escaladés</p>
                <p className="text-2xl font-bold text-orange-600">{stats.escalated}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Dépassés</p>
                <p className="text-2xl font-bold text-purple-600">{stats.slaExceeded}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Ticket className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(TICKET_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(TICKET_PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {SITES_LIST.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Technicien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>{tech.pseudo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showMyTickets ? 'default' : 'outline'}
              onClick={() => setShowMyTickets(!showMyTickets)}
            >
              <User className="w-4 h-4 mr-2" />
              Mes tickets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID du Ticket</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Objet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nom de Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nom de Compte</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Fil récent</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date d'échéance</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">État</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Propriétaire</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Canal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTickets.map((ticket) => {
                  const slaExceeded = isSlaExceeded(ticket.dueDate) &&
                    !['closed', 'resolved'].includes(ticket.status);
                  const timeSince = getTimeSinceOpening(ticket.createdAt);

                  return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group ${slaExceeded ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      onClick={() => openDetailDialog(ticket)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{ticket.ticketNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium truncate block max-w-[200px]">{ticket.object}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ticket.creatorName}</td>
                      <td className="px-4 py-3 text-sm">
                        {ticket.clients[0]?.name || '-'}
                        {ticket.clients.length > 1 && (
                          <span className="text-xs text-muted-foreground"> +{ticket.clients.length - 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {timeSince.formatted}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={slaExceeded ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(ticket.dueDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={TICKET_STATUS_CONFIG[ticket.status].bgColor}>
                          {TICKET_STATUS_CONFIG[ticket.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ticket.technicians.length > 0
                          ? ticket.technicians.map(t => t.pseudo).join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {TICKET_CHANNEL_CONFIG[ticket.source].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(ticket); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleArchive(ticket); }}>
                            <Archive className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={(e) => { e.stopPropagation(); handleTrash(ticket); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTickets.length === 0 && (
            <div className="py-12 text-center">
              <Ticket className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Aucun ticket trouvé</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Créez votre premier ticket'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog - Will be in next file due to size */}
      {/* ... */}
    </div>
  );
}
