// ============================================
// GESTION TICKETS - Custom Hook
// ============================================

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Ticket,
  TicketFilter,
  TicketDashboardStats,
  RecurrenceAlert,
  TicketStatus,
  TicketSeverity,
  TicketType,
  CommentVisibility,
  TicketActivity,
  TimeEntry,
  TicketApproval,
  ClosedTicketGroup,
  TechnicianReport,
  TrashItem,
  FlashMessage,
  TicketAttachment,
  TicketHistoryEntry
} from '@/lib/tickets/types';
import {
  DEFAULT_TICKET_FILTER,
  TECHNICIANS,
  ALL_CLIENTS,
  SITES,
  SEVERITY_CONFIG,
  TRASH_AUTO_DELETE_DAYS,
  FLASH_MESSAGE_DURATION
} from '@/lib/tickets/constants';
import {
  generateTicketId,
  generateId,
  calculateSLA,
  calculateDashboardStats,
  detectRecurrence,
  generateOpeningEmail,
  generateAssignationEmail,
  generateIncidentEmail,
  generateRFO,
  generateRFOEmailBody,
  createHistoryEntry,
  exportTicketsToCSV,
  groupClosedTickets,
  generateTechnicianReport,
  canManageTickets,
  formatTicketTitle
} from '@/lib/tickets/utils';

interface UseTicketsReturn {
  // State
  tickets: Ticket[];
  filteredTickets: Ticket[];
  closedTicketGroups: ClosedTicketGroup[];
  selectedTicket: Ticket | null;
  filter: TicketFilter;
  stats: TicketDashboardStats;
  recurrenceAlerts: RecurrenceAlert[];
  viewMode: 'list' | 'card' | 'timeline';
  trash: TrashItem[];
  flashMessages: FlashMessage[];
  
  // Actions
  createTicket: (data: Partial<Ticket>) => Ticket;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  selectTicket: (ticket: Ticket | null) => void;
  setFilter: (filter: Partial<TicketFilter>) => void;
  clearFilter: () => void;
  setViewMode: (mode: 'list' | 'card' | 'timeline') => void;
  
  // Status Actions
  updateStatus: (id: string, status: TicketStatus) => void;
  escalateTicket: (id: string) => void;
  closeTicket: (id: string, rootCause: string, resolution: string) => void;
  reopenTicket: (id: string) => void;
  
  // ETA/ETR Actions
  updateETA: (id: string, eta: Date) => void;
  updateETR: (id: string, etr: Date) => void;
  
  // Comments
  addComment: (ticketId: string, content: string, visibility: CommentVisibility) => void;
  
  // Activities
  addActivity: (ticketId: string, activity: Partial<TicketActivity>) => void;
  updateActivity: (ticketId: string, activityId: string, updates: Partial<TicketActivity>) => void;
  
  // Time Entries
  addTimeEntry: (ticketId: string, entry: Partial<TimeEntry>) => void;
  
  // Approvals
  requestApproval: (ticketId: string) => void;
  approveTicket: (ticketId: string, comment?: string) => void;
  rejectTicket: (ticketId: string, comment?: string) => void;
  
  // Attachments
  addAttachment: (ticketId: string, file: File) => Promise<void>;
  removeAttachment: (ticketId: string, attachmentId: string) => void;
  
  // Trash Actions
  moveToTrash: (ticketId: string) => void;
  restoreFromTrash: (trashId: string) => void;
  permanentDelete: (trashId: string) => void;
  emptyTrash: () => void;
  
  // Flash Messages
  addFlashMessage: (type: FlashMessage['type'], title: string, message: string) => void;
  removeFlashMessage: (id: string) => void;
  
  // Export
  exportToCSV: () => void;
  generateTechnicianReportPDF: (technicianId: string, startDate: Date, endDate: Date) => TechnicianReport;
  generateActivityPDF: (technicianId: string, startDate: Date, endDate: Date) => Promise<Blob>;
  
  // Helpers
  getTechnician: (id: string) => typeof TECHNICIANS[0] | undefined;
  getClient: (name: string) => typeof ALL_CLIENTS[0] | undefined;
  getSite: (id: string) => typeof SITES[0] | undefined;
  
  // Permissions
  canManage: boolean;
}

export function useTickets(userId: string, userName: string, userRole: string = 'technicien_noc'): UseTicketsReturn {
  // Initialize with sample data
  const [tickets, setTickets] = useState<Ticket[]>(() => generateSampleTickets(userId, userName));
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilterState] = useState<TicketFilter>(DEFAULT_TICKET_FILTER);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'timeline'>('list');
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [flashMessages, setFlashMessages] = useState<FlashMessage[]>([]);
  
  // Permissions
  const canManage = canManageTickets(userRole);
  
  // Auto-cleanup trash (tickets older than 30 days) - runs once on mount
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setTrash(prev => {
        const expiredItems = prev.filter(item => new Date(item.autoDeleteAt) <= now);
        if (expiredItems.length > 0) {
          expiredItems.forEach(item => {
            console.log(`🗑️ Auto-deleted: ${item.ticketData.ticketNumber}`);
          });
        }
        return prev.filter(item => new Date(item.autoDeleteAt) > now);
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // Detect recurrence whenever tickets change
  const recurrenceAlerts = useMemo(() => detectRecurrence(tickets), [tickets]);
  
  // Group closed tickets
  const closedTicketGroups = useMemo(() => groupClosedTickets(tickets), [tickets]);
  
  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (filter.status !== 'all' && ticket.status !== filter.status) return false;
      if (filter.type !== 'all' && ticket.type !== filter.type) return false;
      if (filter.severity !== 'all' && ticket.severity !== filter.severity) return false;
      if (filter.localite !== 'all' && ticket.localite !== filter.localite) return false;
      if (filter.technicien !== 'all' && !ticket.techniciens.includes(filter.technicien)) return false;
      if (filter.client !== 'all' && !ticket.clientsImpactes.includes(filter.client)) return false;
      if (filter.dateFrom && new Date(ticket.createdAt) < filter.dateFrom) return false;
      if (filter.dateTo && new Date(ticket.createdAt) > filter.dateTo) return false;
      if (filter.isOverdue && !ticket.sla.isBreached) return false;
      if (filter.isRecurring && !ticket.isRecurring) return false;
      
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matches = [
          ticket.ticketNumber,
          ticket.objet,
          ticket.contactName,
          ticket.accountName,
          ...ticket.clientsImpactes,
          ...ticket.techniciens
        ].some(field => field?.toLowerCase().includes(query));
        if (!matches) return false;
      }
      
      return true;
    });
  }, [tickets, filter]);
  
  // Dashboard stats
  const stats = useMemo(() => calculateDashboardStats(tickets), [tickets]);
  
  // Add flash message
  const addFlashMessage = useCallback((type: FlashMessage['type'], title: string, message: string) => {
    const flash: FlashMessage = {
      id: generateId(),
      type,
      title,
      message,
      createdAt: new Date(),
      duration: FLASH_MESSAGE_DURATION
    };
    
    setFlashMessages(prev => [...prev, flash]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setFlashMessages(prev => prev.filter(f => f.id !== flash.id));
    }, FLASH_MESSAGE_DURATION);
  }, []);
  
  // Remove flash message
  const removeFlashMessage = useCallback((id: string) => {
    setFlashMessages(prev => prev.filter(f => f.id !== id));
  }, []);
  
  // Create ticket
  const createTicket = useCallback((data: Partial<Ticket>): Ticket => {
    const ticketNumber = generateTicketId();
    const now = new Date();
    
    const lieu = data.lieu || data.accountName || data.clientsImpactes?.[0] || '';
    const title = formatTicketTitle(data.type || 'intervention', lieu);
    
    const newTicket: Ticket = {
      id: generateId(),
      ticketNumber,
      objet: data.objet || title,
      type: data.type || 'intervention',
      severity: data.severity || 'Medium',
      status: 'ouvert',
      source: data.source || 'Email',
      contactName: data.contactName || '',
      accountName: data.accountName || lieu,
      email: data.email,
      phone: data.phone,
      localite: data.localite || 'brazzaville',
      lieu,
      cibles: data.cibles || [],
      liaisonImpactee: data.liaisonImpactee,
      productName: data.productName,
      classification: data.classification || 'Problème',
      language: data.language || 'Français',
      dueDate: data.dueDate,
      clientsImpactes: data.clientsImpactes || [],
      techniciens: data.techniciens || [],
      technicienPrincipal: data.technicienPrincipal || data.techniciens?.[0],
      createdAt: now,
      updatedAt: now,
      openedAt: now,
      sla: calculateSLA(data.severity || 'Medium', now),
      description: data.description || '',
      descriptionHtml: data.descriptionHtml,
      comments: [],
      activities: [],
      timeEntries: [],
      approvals: [],
      history: [
        createHistoryEntry(generateId(), 'created', userId, userName, `Ticket créé par ${userName}`)
      ],
      emails: [],
      attachments: [],
      parentTicketId: data.parentTicketId,
      childTickets: [],
      isRecurring: false,
      recurrenceCount: 0,
      downtimeMinutes: 0,
      customerImpact: data.clientsImpactes?.length || 0,
      createdBy: userId,
      createdByName: userName,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      tags: data.tags || [],
      customFields: {},
      conversationCount: 0
    };
    
    setTickets(prev => [newTicket, ...prev]);
    
    // Generate emails
    const email = generateOpeningEmail(newTicket);
    console.log('📧 Opening Email:', email);
    
    if (newTicket.techniciens.length > 0) {
      newTicket.techniciens.forEach(techName => {
        const assignEmail = generateAssignationEmail(newTicket, techName, userName);
        console.log(`📧 Assignation Email to ${techName}:`, assignEmail);
      });
    }
    
    // Flash message
    addFlashMessage(
      'success',
      'Ticket créé avec succès',
      `${ticketNumber} - ${newTicket.objet}. Une copie a été envoyée par email.`
    );
    
    return newTicket;
  }, [userId, userName, addFlashMessage]);
  
  // Update ticket
  const updateTicket = useCallback((id: string, updates: Partial<Ticket>): void => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== id) return ticket;
      
      const updatedTicket = {
        ...ticket,
        ...updates,
        updatedAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedByName: userName
      };
      
      if (updates.severity && updates.severity !== ticket.severity) {
        updatedTicket.sla = calculateSLA(updates.severity, ticket.createdAt, ticket.acknowledgedAt, ticket.resolvedAt);
      }
      
      return updatedTicket;
    }));
    
    toast.success('Ticket mis à jour');
  }, [userId, userName]);
  
  // Move to trash
  const moveToTrash = useCallback((ticketId: string): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const trashItem: TrashItem = {
      id: generateId(),
      ticketId,
      ticketData: ticket,
      deletedBy: userId,
      deletedByName: userName,
      deletedAt: new Date(),
      autoDeleteAt: new Date(Date.now() + TRASH_AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000)
    };
    
    setTrash(prev => [...prev, trashItem]);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setSelectedTicket(null);
    
    addFlashMessage('warning', 'Ticket déplacé vers la corbeille', 
      `${ticket.ticketNumber} sera supprimé définitivement dans ${TRASH_AUTO_DELETE_DAYS} jours.`);
  }, [tickets, userId, userName, addFlashMessage]);
  
  // Restore from trash
  const restoreFromTrash = useCallback((trashId: string): void => {
    const trashItem = trash.find(t => t.id === trashId);
    if (!trashItem) return;
    
    setTickets(prev => [trashItem.ticketData, ...prev]);
    setTrash(prev => prev.filter(t => t.id !== trashId));
    
    addFlashMessage('success', 'Ticket restauré', `${trashItem.ticketData.ticketNumber} a été restauré.`);
  }, [trash, addFlashMessage]);
  
  // Permanent delete
  const permanentDelete = useCallback((trashId: string): void => {
    const trashItem = trash.find(t => t.id === trashId);
    if (trashItem) {
      setTrash(prev => prev.filter(t => t.id !== trashId));
      addFlashMessage('error', 'Ticket supprimé définitivement', `${trashItem.ticketData.ticketNumber}`);
    }
  }, [trash, addFlashMessage]);
  
  // Empty trash
  const emptyTrash = useCallback((): void => {
    setTrash([]);
    addFlashMessage('error', 'Corbeille vidée', 'Tous les tickets ont été supprimés définitivement.');
  }, [addFlashMessage]);
  
  // Delete ticket (move to trash)
  const deleteTicket = useCallback((id: string): void => {
    moveToTrash(id);
  }, [moveToTrash]);
  
  // Set filter
  const setFilter = useCallback((newFilter: Partial<TicketFilter>): void => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);
  
  // Clear filter
  const clearFilter = useCallback((): void => {
    setFilterState(DEFAULT_TICKET_FILTER);
    toast.info('Filtres effacés');
  }, []);
  
  // Update status
  const updateStatus = useCallback((id: string, status: TicketStatus): void => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const historyEntry = createHistoryEntry(id, 'status_changed', userId, userName,
      `Statut modifié de "${STATUS_CONFIG[ticket.status]?.label}" vers "${STATUS_CONFIG[status]?.label}" par ${userName}`,
      ticket.status, status, 'status'
    );
    
    updateTicket(id, { status, history: [...ticket.history, historyEntry] });
    toast.success(`Statut mis à jour: ${STATUS_CONFIG[status]?.label}`);
  }, [tickets, updateTicket, userId, userName]);
  
  // Escalate ticket
  const escalateTicket = useCallback((id: string): void => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const historyEntry = createHistoryEntry(id, 'status_changed', userId, userName,
      `Ticket escaladé par ${userName}`, ticket.status, 'escalade', 'status'
    );
    
    updateTicket(id, { status: 'escalade', severity: 'High', history: [...ticket.history, historyEntry] });
    addFlashMessage('warning', 'Ticket escaladé', `${ticket.ticketNumber} a été escaladé.`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Close ticket
  const closeTicket = useCallback((id: string, rootCause: string, resolution: string): void => {
    const now = new Date();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const rfo = generateRFO({ 
      ...ticket, 
      rootCause, 
      closedAt: now, 
      resolution: { 
        description: resolution, 
        cause: rootCause, 
        correctiveAction: resolution, 
        endTime: now, 
        resolvedBy: userId, 
        resolvedByName: userName 
      } 
    });
    
    const rfoEmail = generateRFOEmailBody(rfo);
    console.log('📧 RFO Email:', rfoEmail);
    
    if (ticket.type.includes('incident')) {
      const incidentEmail = generateIncidentEmail(ticket);
      console.log('📧 Incident Email:', incidentEmail);
    }
    
    const historyEntry = createHistoryEntry(id, 'closed', userId, userName,
      `Ticket clôturé par ${userName}: ${rootCause}`
    );
    
    updateTicket(id, {
      status: 'ferme',
      closedAt: now,
      resolvedAt: now,
      rootCause,
      resolution: {
        description: resolution,
        cause: rootCause,
        correctiveAction: resolution,
        endTime: now,
        resolvedBy: userId,
        resolvedByName: userName
      },
      rfo,
      history: [...ticket.history, historyEntry]
    });
    
    addFlashMessage('success', 'Ticket clôturé', `${ticket.ticketNumber} - RFO généré et envoyé par email.`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Reopen ticket
  const reopenTicket = useCallback((id: string): void => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const historyEntry = createHistoryEntry(id, 'reopened', userId, userName,
      `Ticket réouvert par ${userName}`
    );
    
    updateTicket(id, {
      status: 'ouvert',
      closedAt: undefined,
      resolvedAt: undefined,
      resolution: undefined,
      rootCause: undefined,
      history: [...ticket.history, historyEntry]
    });
    
    addFlashMessage('info', 'Ticket réouvert', `${ticket.ticketNumber} a été réouvert.`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Update ETA
  const updateETA = useCallback((id: string, eta: Date): void => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const historyEntry = createHistoryEntry(id, 'eta_updated', userId, userName,
      `ETA mis à jour par ${userName}: ${eta.toLocaleString('fr-FR')}`,
      ticket.sla.eta?.toISOString(), eta.toISOString(), 'eta'
    );
    
    updateTicket(id, { sla: { ...ticket.sla, eta }, history: [...ticket.history, historyEntry] });
    toast.success('ETA mis à jour');
  }, [tickets, updateTicket, userId, userName]);
  
  // Update ETR
  const updateETR = useCallback((id: string, etr: Date): void => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    
    const historyEntry = createHistoryEntry(id, 'etr_updated', userId, userName,
      `ETR mis à jour par ${userName}: ${etr.toLocaleString('fr-FR')}`,
      ticket.sla.etr?.toISOString(), etr.toISOString(), 'etr'
    );
    
    updateTicket(id, { sla: { ...ticket.sla, etr }, history: [...ticket.history, historyEntry] });
    toast.success('ETR mis à jour');
  }, [tickets, updateTicket, userId, userName]);
  
  // Add comment
  const addComment = useCallback((ticketId: string, content: string, visibility: CommentVisibility): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const comment = {
      id: generateId(),
      ticketId,
      authorId: userId,
      authorName: userName,
      authorRole: userRole,
      content,
      visibility,
      createdAt: new Date(),
      isEdited: false,
      attachments: []
    };
    
    const historyEntry = createHistoryEntry(ticketId, 'commented', userId, userName,
      `Commentaire ${visibility} ajouté par ${userName}`
    );
    
    updateTicket(ticketId, {
      comments: [...ticket.comments, comment],
      conversationCount: ticket.conversationCount + 1,
      history: [...ticket.history, historyEntry]
    });
    
    toast.success('Commentaire ajouté');
  }, [tickets, updateTicket, userId, userName, userRole]);
  
  // Add activity
  const addActivity = useCallback((ticketId: string, activity: Partial<TicketActivity>): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const newActivity: TicketActivity = {
      id: generateId(),
      ticketId,
      title: activity.title || '',
      description: activity.description || '',
      assignedTo: activity.assignedTo || [],
      status: 'pending',
      priority: activity.priority || 'Medium',
      dueDate: activity.dueDate,
      createdAt: new Date(),
      createdBy: userId,
      createdByName: userName
    };
    
    updateTicket(ticketId, { activities: [...ticket.activities, newActivity] });
    toast.success('Activité ajoutée');
  }, [tickets, updateTicket, userId, userName]);
  
  // Update activity
  const updateActivity = useCallback((ticketId: string, activityId: string, updates: Partial<TicketActivity>): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const updatedActivities = ticket.activities.map(a =>
      a.id === activityId ? { ...a, ...updates, completedAt: updates.status === 'completed' ? new Date() : a.completedAt } : a
    );
    
    updateTicket(ticketId, { activities: updatedActivities });
  }, [tickets, updateTicket]);
  
  // Add time entry
  const addTimeEntry = useCallback((ticketId: string, entry: Partial<TimeEntry>): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const newEntry: TimeEntry = {
      id: generateId(),
      ticketId,
      userId,
      userName,
      startTime: entry.startTime || new Date(),
      endTime: entry.endTime,
      duration: entry.duration || 0,
      description: entry.description || '',
      billable: entry.billable ?? true,
      createdAt: new Date()
    };
    
    updateTicket(ticketId, { timeEntries: [...ticket.timeEntries, newEntry] });
    toast.success('Entrée de temps ajoutée');
  }, [tickets, updateTicket, userId, userName]);
  
  // Request approval
  const requestApproval = useCallback((ticketId: string): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const approval: TicketApproval = {
      id: generateId(),
      ticketId,
      requestedBy: userId,
      requestedByName: userName,
      requestedAt: new Date(),
      status: 'pending'
    };
    
    updateTicket(ticketId, { approvals: [...ticket.approvals, approval] });
    addFlashMessage('info', 'Approbation demandée', `Pour ${ticket.ticketNumber}`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Approve ticket
  const approveTicket = useCallback((ticketId: string, comment?: string): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const updatedApprovals = ticket.approvals.map(a =>
      a.status === 'pending' ? {
        ...a,
        approvedBy: userId,
        approvedByName: userName,
        approvedAt: new Date(),
        status: 'approved' as const,
        comment
      } : a
    );
    
    updateTicket(ticketId, { approvals: updatedApprovals });
    addFlashMessage('success', 'Ticket approuvé', `${ticket.ticketNumber}`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Reject ticket
  const rejectTicket = useCallback((ticketId: string, comment?: string): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const updatedApprovals = ticket.approvals.map(a =>
      a.status === 'pending' ? {
        ...a,
        approvedBy: userId,
        approvedByName: userName,
        approvedAt: new Date(),
        status: 'rejected' as const,
        comment
      } : a
    );
    
    updateTicket(ticketId, { approvals: updatedApprovals });
    addFlashMessage('error', 'Ticket rejeté', `${ticket.ticketNumber}`);
  }, [tickets, updateTicket, userId, userName, addFlashMessage]);
  
  // Add attachment
  const addAttachment = useCallback(async (ticketId: string, file: File): Promise<void> => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Convert to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    
    const attachment: TicketAttachment = {
      id: generateId(),
      ticketId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: base64,
      uploadedBy: userId,
      uploadedByName: userName,
      uploadedAt: new Date()
    };
    
    updateTicket(ticketId, { attachments: [...ticket.attachments, attachment] });
    toast.success('Fichier ajouté');
  }, [tickets, updateTicket, userId, userName]);
  
  // Remove attachment
  const removeAttachment = useCallback((ticketId: string, attachmentId: string): void => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    updateTicket(ticketId, {
      attachments: ticket.attachments.filter(a => a.id !== attachmentId)
    });
    toast.success('Fichier supprimé');
  }, [tickets, updateTicket]);
  
  // Export to CSV
  const exportToCSV = useCallback((): void => {
    const csv = exportTicketsToCSV(filteredTickets);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addFlashMessage('success', 'Export CSV', `${filteredTickets.length} tickets exportés`);
  }, [filteredTickets, addFlashMessage]);
  
  // Generate technician report
  const generateTechnicianReportPDF = useCallback((
    technicianId: string,
    startDate: Date,
    endDate: Date
  ): TechnicianReport => {
    const tech = TECHNICIANS.find(t => t.id === technicianId || t.name === technicianId);
    return generateTechnicianReport(technicianId, tech?.name || technicianId, tickets, startDate, endDate);
  }, [tickets]);
  
  // Generate activity PDF
  const generateActivityPDF = useCallback(async (
    technicianId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Blob> => {
    const report = generateTechnicianReportPDF(technicianId, startDate, endDate);
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport d'Activité - SILICONE CONNECT</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #00bcd4; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #00bcd4; margin-bottom: 10px; }
          .subtitle { font-size: 14px; color: #666; }
          .title { font-size: 22px; font-weight: bold; margin: 30px 0; color: #333; }
          .section { margin: 20px 0; }
          .stat-box { display: inline-block; width: 45%; padding: 15px; margin: 5px; background: #f5f5f5; border-radius: 8px; }
          .stat-label { font-size: 12px; color: #666; }
          .stat-value { font-size: 24px; font-weight: bold; color: #00bcd4; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #00bcd4; color: white; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SILICONE CONNECT</div>
          <div class="subtitle">Network Operations Center</div>
        </div>
        
        <div class="title">Rapport d'Activité Technicien</div>
        
        <div class="section">
          <p><strong>Technicien:</strong> ${report.technicianName}</p>
          <p><strong>Période:</strong> ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}</p>
          <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <div class="section">
          <h3>Statistiques</h3>
          <div class="stat-box">
            <div class="stat-label">Tickets Traités</div>
            <div class="stat-value">${report.ticketsProcessed}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Temps Moyen (min)</div>
            <div class="stat-value">${report.avgInterventionTime}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">SLA Respecté</div>
            <div class="stat-value">${report.slaCompliance}%</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Performance</div>
            <div class="stat-value">${report.performance}%</div>
          </div>
        </div>
        
        <div class="section">
          <h3>Motivation / Implication</h3>
          <p>${report.motivation}</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} SILICONE CONNECT - Tous droits réservés</p>
        </div>
      </body>
      </html>
    `;
    
    return new Blob([htmlContent], { type: 'text/html' });
  }, [generateTechnicianReportPDF]);
  
  // Helpers
  const getTechnician = useCallback((id: string) => {
    return TECHNICIANS.find(t => t.id === id || t.name === id);
  }, []);
  
  const getClient = useCallback((name: string) => {
    return ALL_CLIENTS.find(c => c.name === name);
  }, []);
  
  const getSite = useCallback((id: string) => {
    return SITES.find(s => s.id === id || s.code === id || s.name === id);
  }, []);
  
  return {
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
    selectTicket: setSelectedTicket,
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
    getSite,
    canManage
  };
}

// Import STATUS_CONFIG
import { STATUS_CONFIG } from '@/lib/tickets/constants';

// Helper function to generate history entries
function generateSampleHistory(ticketId: string, userId: string, userName: string, createdAt: Date): TicketHistoryEntry[] {
  const history: TicketHistoryEntry[] = [];
  
  // Creation entry
  history.push({
    id: generateId(),
    ticketId,
    action: 'created',
    userId,
    userName,
    timestamp: createdAt,
    details: `Ticket créé par ${userName}`
  });
  
  // Random additional history entries
  const actions = [
    { action: 'assigned' as const, details: 'Ticket assigné à Franchise', delay: 5 },
    { action: 'status_changed' as const, details: 'Statut changé de "Ouvert" à "En attente"', delay: 30, oldValue: 'ouvert', newValue: 'en_attente' },
    { action: 'status_changed' as const, details: 'Statut changé de "En attente" à "Ouvert"', delay: 60, oldValue: 'en_attente', newValue: 'ouvert' },
    { action: 'commented' as const, details: 'Commentaire ajouté par le technicien', delay: 90 },
  ];
  
  actions.forEach(action => {
    history.push({
      id: generateId(),
      ticketId,
      action: action.action,
      userId,
      userName,
      timestamp: new Date(createdAt.getTime() + action.delay * 60 * 1000),
      details: action.details,
      oldValue: action.oldValue,
      newValue: action.newValue
    });
  });
  
  return history;
}

// Sample data generator
function generateSampleTickets(userId: string, userName: string): Ticket[] {
  const now = new Date();
  const sampleTickets: Ticket[] = [
    {
      id: generateId(),
      ticketNumber: '#SC28022026-100002699',
      objet: 'DEPLOIEMENT CAMPAGNE PRESIDENTIELLE - PALAIS DES CONGRES',
      type: 'deploiement',
      severity: 'High',
      status: 'ouvert',
      source: 'Phone',
      contactName: 'NOC SILICONE',
      accountName: 'PALAIS DES CONGRES',
      localite: 'brazzaville',
      lieu: 'PALAIS DES CONGRES',
      cibles: ['Talangai'],
      clientsImpactes: ['PALAIS DES CONGRES'],
      techniciens: ['Franchise'],
      technicienPrincipal: 'Franchise',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updatedAt: now,
      openedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      description: 'Déploiement d\'une couverture WIFI pour la campagne présidentielle',
      comments: [
        {
          id: generateId(),
          ticketId: '',
          authorId: userId,
          authorName: userName,
          authorRole: 'technicien_noc',
          content: 'Début de l\'intervention sur site. Le matériel est en cours d\'installation.',
          visibility: 'public',
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          isEdited: false,
          attachments: []
        },
        {
          id: generateId(),
          ticketId: '',
          authorId: userId,
          authorName: 'Franchise',
          authorRole: 'technicien_noc',
          content: 'Configuration en cours. Point d\'accès installé.',
          visibility: 'prive',
          createdAt: new Date(now.getTime() - 30 * 60 * 1000),
          isEdited: false,
          attachments: []
        }
      ],
      activities: [
        {
          id: generateId(),
          ticketId: '',
          title: 'Installation du point d\'accès principal',
          description: 'Installer et configurer le point d\'accès WIFI',
          assignedTo: ['Franchise'],
          status: 'completed',
          priority: 'High',
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          createdBy: userId,
          createdByName: userName,
          completedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000)
        },
        {
          id: generateId(),
          ticketId: '',
          title: 'Configuration du réseau',
          description: 'Configurer les paramètres réseau et sécurité',
          assignedTo: ['Franchise'],
          status: 'in_progress',
          priority: 'High',
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          createdBy: userId,
          createdByName: userName
        }
      ],
      timeEntries: [
        {
          id: generateId(),
          ticketId: '',
          userId,
          userName,
          startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          duration: 60,
          description: 'Installation matériel',
          billable: true,
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000)
        }
      ],
      approvals: [],
      history: generateSampleHistory('', userId, userName, new Date(now.getTime() - 2 * 60 * 60 * 1000)),
      emails: [],
      attachments: [],
      childTickets: [],
      isRecurring: false,
      recurrenceCount: 0,
      downtimeMinutes: 0,
      customerImpact: 1,
      createdBy: userId,
      createdByName: userName,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      tags: ['deploiement', 'wifi'],
      customFields: {},
      classification: 'Feature',
      language: 'Français',
      sla: calculateSLA('High', new Date(now.getTime() - 2 * 60 * 60 * 1000)),
      conversationCount: 2
    },
    {
      id: generateId(),
      ticketNumber: '#SC27022026-100002698',
      objet: 'INTERVENTION - MTN LIEN DOLISIE GRAND MARCHE-PNR',
      type: 'intervention',
      severity: 'High',
      status: 'ouvert',
      source: 'Email',
      contactName: 'MTN Support',
      accountName: 'MTN LIEN DOLISIE',
      localite: 'pointe_noire',
      lieu: 'MTN LIEN DOLISIE GRAND MARCHE-PNR',
      cibles: ['MGK1', 'Dolisie'],
      liaisonImpactee: 'Dolisie-Link',
      clientsImpactes: ['MTN LIEN DOLISIE', 'MTN GRAND MARCHE'],
      techniciens: ['Franchise', 'Uriel'],
      technicienPrincipal: 'Franchise',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      openedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      description: 'Intervention urgente sur la liaison MTN Dolisie',
      comments: [],
      activities: [],
      timeEntries: [],
      approvals: [],
      history: generateSampleHistory('', userId, userName, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      emails: [],
      attachments: [],
      childTickets: [],
      isRecurring: false,
      recurrenceCount: 0,
      downtimeMinutes: 120,
      customerImpact: 2,
      createdBy: userId,
      createdByName: userName,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      tags: ['intervention', 'mtn'],
      customFields: {},
      classification: 'Problème',
      language: 'Français',
      sla: calculateSLA('High', new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      conversationCount: 0
    },
    {
      id: generateId(),
      ticketNumber: '#SC25022026-100002697',
      objet: 'MAINTENANCE PREVENTIVE - MISTRAL BET',
      type: 'maintenance_preventive',
      severity: 'Medium',
      status: 'ferme',
      source: 'Silicone Connect',
      contactName: 'Mistral Admin',
      accountName: 'MISTRAL BET',
      localite: 'brazzaville',
      lieu: 'MISTRAL BET',
      cibles: ['Talangai'],
      clientsImpactes: ['MISTRAL BET'],
      techniciens: ['Uriel'],
      technicienPrincipal: 'Uriel',
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      openedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      description: 'Normalisation de câble sur un poteau',
      resolution: {
        description: 'Maintenance effectuée avec succès',
        cause: 'Maintenance planifiée',
        correctiveAction: 'Remplacement du câble normalisé',
        endTime: new Date(now.getTime() - 50 * 60 * 60 * 1000),
        resolvedBy: userId,
        resolvedByName: 'Uriel'
      },
      rootCause: 'Maintenance planifiée',
      comments: [],
      activities: [],
      timeEntries: [],
      approvals: [],
      history: generateSampleHistory('', userId, userName, new Date(now.getTime() - 72 * 60 * 60 * 1000)),
      emails: [],
      attachments: [],
      childTickets: [],
      isRecurring: false,
      recurrenceCount: 0,
      downtimeMinutes: 0,
      customerImpact: 1,
      createdBy: userId,
      createdByName: userName,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      tags: ['maintenance', 'preventive'],
      customFields: {},
      classification: 'Problème',
      language: 'Français',
      sla: calculateSLA('Medium', new Date(now.getTime() - 72 * 60 * 60 * 1000), undefined, new Date(now.getTime() - 50 * 60 * 60 * 1000)),
      conversationCount: 0
    },
    {
      id: generateId(),
      ticketNumber: '#SC24022026-100002696',
      objet: 'INCIDENT CRITIQUE - E²C DATA CENTER',
      type: 'incident_critique',
      severity: 'High',
      status: 'en_attente',
      source: 'Phone',
      contactName: 'E²C Admin',
      accountName: 'E²C',
      localite: 'brazzaville',
      lieu: 'E²C DATA CENTER',
      cibles: ['HQ_E²C'],
      clientsImpactes: ['E²C'],
      techniciens: ['Jean Michel', 'Andreas'],
      technicienPrincipal: 'Jean Michel',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      updatedAt: now,
      openedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      description: 'Incident critique sur le datacenter E²C',
      comments: [],
      activities: [],
      timeEntries: [],
      approvals: [],
      history: generateSampleHistory('', userId, userName, new Date(now.getTime() - 4 * 60 * 60 * 1000)),
      emails: [],
      attachments: [],
      childTickets: [],
      isRecurring: false,
      recurrenceCount: 0,
      downtimeMinutes: 240,
      customerImpact: 1,
      createdBy: userId,
      createdByName: userName,
      lastModifiedBy: userId,
      lastModifiedByName: userName,
      tags: ['incident', 'critique', 'datacenter'],
      customFields: {},
      classification: 'Problème',
      language: 'Français',
      sla: calculateSLA('High', new Date(now.getTime() - 4 * 60 * 60 * 1000)),
      conversationCount: 0
    }
  ];
  
  return sampleTickets;
}
