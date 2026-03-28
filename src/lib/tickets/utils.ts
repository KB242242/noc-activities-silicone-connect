// ============================================
// GESTION TICKETS - Utility Functions
// ============================================

import { format, differenceInMinutes, addHours, addMinutes, isAfter, isBefore, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Ticket, 
  TicketSeverity, 
  TicketStatus, 
  SLAMetrics, 
  TicketHistoryEntry,
  RFOReport,
  TicketDashboardStats,
  RecurrenceAlert,
  TicketType,
  ClosedTicketGroup,
  TechnicianReport,
  TimeEntry,
  TicketActivity
} from './types';
import { SEVERITY_CONFIG, SLA_CONFIG, RECURRENCE_CONFIG, EMAIL_RECIPIENTS, TICKET_TYPES, LOCALITIES } from './constants';

// ============================================
// TICKET ID GENERATION
// ============================================

// Simulated increment storage (in real app, this would be in database)
let ticketIncrement = 100002697; // Starting increment

/**
 * Generates a unique ticket ID in format: #SC[JJMMAAAA]-[INCREMENT]
 * Example: #SC27032026-100002698
 */
export function generateTicketId(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const datePart = `${day}${month}${year}`;
  
  // Increment counter (thread-safe in real database)
  ticketIncrement += 1;
  const increment = String(ticketIncrement).padStart(9, '0');
  
  return `#SC${datePart}-${increment}`;
}

/**
 * Validates ticket ID format
 */
export function isValidTicketId(ticketId: string): boolean {
  const pattern = /^#SC\d{8}-\d{9}$/;
  return pattern.test(ticketId);
}

/**
 * Parse ticket ID to extract date and increment
 */
export function parseTicketId(ticketId: string): { date: Date; increment: number } | null {
  if (!isValidTicketId(ticketId)) return null;
  
  const dateStr = ticketId.substring(3, 11);
  const incrementStr = ticketId.substring(12);
  
  const day = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1;
  const year = parseInt(dateStr.substring(4, 8));
  
  return {
    date: new Date(year, month, day),
    increment: parseInt(incrementStr)
  };
}

// ============================================
// TICKET TITLE FORMATTING
// ============================================

/**
 * Format ticket title as: TYPE DE TICKET - LIEU
 * Example: DEPLOIEMENT CAMPAGNE PRESIDENTIELLE - PALAIS DES CONGRES
 */
export function formatTicketTitle(type: TicketType, lieu: string): string {
  const typeLabel = TICKET_TYPES[type]?.label.toUpperCase() || type.toUpperCase();
  return `${typeLabel} - ${lieu.toUpperCase()}`;
}

/**
 * Parse ticket title to extract type and location
 */
export function parseTicketTitle(title: string): { type: string; lieu: string } | null {
  const parts = title.split(' - ');
  if (parts.length !== 2) return null;
  return { type: parts[0], lieu: parts[1] };
}

// ============================================
// SLA CALCULATIONS
// ============================================

/**
 * Calculate SLA metrics for a ticket
 */
export function calculateSLA(
  severity: TicketSeverity,
  createdAt: Date,
  acknowledgedAt?: Date,
  resolvedAt?: Date
): SLAMetrics {
  const targetResponseMinutes = SLA_CONFIG.responseTime[severity];
  const targetResolutionMinutes = SLA_CONFIG.resolutionTime[severity];
  
  const now = new Date();
  
  // Calculate ETA (Estimated Time of Arrival) - for field technicians
  const eta = addMinutes(createdAt, targetResponseMinutes);
  
  // Calculate ETR (Estimated Time of Restoration)
  const etr = addMinutes(createdAt, targetResolutionMinutes);
  
  // Calculate actual times
  let actualResponseTime: number | undefined;
  let actualResolutionTime: number | undefined;
  
  if (acknowledgedAt) {
    actualResponseTime = differenceInMinutes(acknowledgedAt, createdAt);
  }
  
  if (resolvedAt) {
    actualResolutionTime = differenceInMinutes(resolvedAt, createdAt);
  }
  
  // Check if SLA is breached
  let isBreached = false;
  let breachDuration: number | undefined;
  
  if (!resolvedAt) {
    // Ticket not resolved yet - check if we're past ETR
    const elapsedMinutes = differenceInMinutes(now, createdAt);
    if (elapsedMinutes > targetResolutionMinutes) {
      isBreached = true;
      breachDuration = elapsedMinutes - targetResolutionMinutes;
    }
  } else if (actualResolutionTime && actualResolutionTime > targetResolutionMinutes) {
    // Ticket resolved but was late
    isBreached = true;
    breachDuration = actualResolutionTime - targetResolutionMinutes;
  }
  
  // Calculate availability impact (simplified)
  const availabilityImpact = isBreached ? Math.min(100, (breachDuration || 0) * 0.5) : 0;
  
  return {
    targetResponseTime: targetResponseMinutes,
    targetResolutionTime: targetResolutionMinutes,
    actualResponseTime,
    actualResolutionTime,
    eta,
    etr,
    isBreached,
    breachDuration,
    availabilityImpact
  };
}

/**
 * Get SLA status (ok, warning, critical, breached)
 */
export function getSLAStatus(sla: SLAMetrics, createdAt: Date): 'ok' | 'warning' | 'critical' | 'breached' {
  if (sla.isBreached) return 'breached';
  
  const elapsed = differenceInMinutes(new Date(), createdAt);
  const threshold = sla.targetResolutionTime;
  const percentage = elapsed / threshold;
  
  if (percentage >= SLA_CONFIG.criticalThreshold) return 'critical';
  if (percentage >= SLA_CONFIG.warningThreshold) return 'warning';
  return 'ok';
}

/**
 * Format breach duration for display
 */
export function formatBreachDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `En retard de ${hours}h${mins.toString().padStart(2, '0')}min`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

/**
 * Format time ago in French
 */
export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

/**
 * Calculate elapsed time as countdown string (00:00:00 format)
 */
export function formatElapsedTime(startDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// RECURRENCE DETECTION
// ============================================

/**
 * Detect recurring incidents
 */
export function detectRecurrence(
  tickets: Ticket[],
  siteId?: string,
  clientId?: string
): RecurrenceAlert[] {
  const alerts: RecurrenceAlert[] = [];
  const now = new Date();
  const periodStart = new Date(now.getTime() - RECURRENCE_CONFIG.periodDays * 24 * 60 * 60 * 1000);
  
  // Group tickets by site and client
  const groupedBySite = new Map<string, Ticket[]>();
  const groupedByClient = new Map<string, Ticket[]>();
  
  tickets.forEach(ticket => {
    // Filter by date
    if (isBefore(ticket.createdAt, periodStart)) return;
    
    // Group by site
    ticket.cibles.forEach(site => {
      if (!groupedBySite.has(site)) {
        groupedBySite.set(site, []);
      }
      groupedBySite.get(site)!.push(ticket);
    });
    
    // Group by client
    ticket.clientsImpactes.forEach(client => {
      if (!groupedByClient.has(client)) {
        groupedByClient.set(client, []);
      }
      groupedByClient.get(client)!.push(ticket);
    });
  });
  
  // Check for site recurrence
  groupedBySite.forEach((siteTickets, site) => {
    if (siteTickets.length >= RECURRENCE_CONFIG.threshold) {
      const sorted = siteTickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      alerts.push({
        id: `rec-site-${site}-${now.getTime()}`,
        siteId: site,
        siteName: site,
        incidentCount: siteTickets.length,
        periodDays: RECURRENCE_CONFIG.periodDays,
        firstIncident: sorted[0].createdAt,
        lastIncident: sorted[sorted.length - 1].createdAt,
        ticketIds: siteTickets.map(t => t.id),
        severity: siteTickets.length >= RECURRENCE_CONFIG.threshold * 2 ? 'critical' : 'warning',
        message: `Site instable - ${siteTickets.length} incidents en ${RECURRENCE_CONFIG.periodDays} jours. Analyse approfondie recommandée.`,
        createdAt: now,
        acknowledged: false
      });
    }
  });
  
  // Check for client recurrence
  groupedByClient.forEach((clientTickets, clientId) => {
    if (clientTickets.length >= RECURRENCE_CONFIG.threshold) {
      const sorted = clientTickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      alerts.push({
        id: `rec-cli-${clientId}-${now.getTime()}`,
        siteId: '',
        siteName: '',
        clientId,
        clientName: clientId,
        incidentCount: clientTickets.length,
        periodDays: RECURRENCE_CONFIG.periodDays,
        firstIncident: sorted[0].createdAt,
        lastIncident: sorted[sorted.length - 1].createdAt,
        ticketIds: clientTickets.map(t => t.id),
        severity: clientTickets.length >= RECURRENCE_CONFIG.threshold * 2 ? 'critical' : 'warning',
        message: `Client impacté ${clientTickets.length} fois en ${RECURRENCE_CONFIG.periodDays} jours. Analyse approfondie recommandée.`,
        createdAt: now,
        acknowledged: false
      });
    }
  });
  
  return alerts;
}

// ============================================
// CLOSED TICKETS GROUPING
// ============================================

/**
 * Group closed tickets by year and month
 */
export function groupClosedTickets(tickets: Ticket[]): ClosedTicketGroup[] {
  const closedTickets = tickets.filter(t => t.status === 'ferme' && t.closedAt);
  const groups = new Map<string, Ticket[]>();
  
  closedTickets.forEach(ticket => {
    const date = ticket.closedAt!;
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(ticket);
  });
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  return Array.from(groups.entries())
    .map(([key, tickets]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        monthName: monthNames[month],
        tickets: tickets.sort((a, b) => b.closedAt!.getTime() - a.closedAt!.getTime())
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

// ============================================
// RFO (REASON FOR OUTAGE) GENERATION
// ============================================

/**
 * Generate RFO report for a closed ticket
 */
export function generateRFO(ticket: Ticket): RFOReport {
  return {
    id: `rfo-${ticket.id}`,
    ticketId: ticket.id,
    entityName: ticket.clientsImpactes.join(', '),
    link: ticket.liaisonImpactee || ticket.cibles.join(', '),
    ticketNumber: ticket.ticketNumber,
    incidentStartTime: ticket.createdAt,
    incidentEndTime: ticket.closedAt || ticket.resolvedAt || new Date(),
    incidentOwner: ticket.technicienPrincipal || ticket.techniciens[0] || 'NOC',
    priorityLevel: ticket.severity,
    rootCause: ticket.rootCause || 'En cours d\'analyse',
    caseStatus: 'Closed',
    serviceId: ticket.liaisonImpactee,
    capacity: 'N/A',
    aEnd: ticket.cibles[0],
    bEnd: ticket.cibles[1],
    impact: `${ticket.customerImpact} clients`,
    detailedClosingRemarks: ticket.resolution?.description || 'Résolu',
    generatedAt: new Date(),
    generatedBy: ticket.lastModifiedByName,
    sentTo: [EMAIL_RECIPIENTS.notification]
  };
}

/**
 * Generate RFO HTML email body (Incident format as specified)
 */
export function generateRFOEmailBody(rfo: RFOReport): string {
  return `
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <p style="margin-bottom: 20px;">Dear Client,</p>
      
      <h3 style="color: #333; background-color: #f0f0f0; padding: 10px; margin-bottom: 15px;">Incident Information</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 40%;">Entity Name</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.entityName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Ticket Number</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.ticketNumber}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Incident Start Date/Time (UTC)</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${format(rfo.incidentStartTime, 'dd MMM yyyy HH:mm:ss')}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Incident End Date/Time</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${format(rfo.incidentEndTime, 'dd MMM yyyy HH:mm:ss')}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Incident Owner</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.incidentOwner}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Priority Level</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.priorityLevel}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Root Cause</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.rootCause}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Case Status</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.caseStatus}</td>
        </tr>
      </table>
      
      <h3 style="color: #333; background-color: #f0f0f0; padding: 10px; margin-bottom: 15px;">Service Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 40%;">Service ID</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.serviceId || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Capacity</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.capacity || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">A-End</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.aEnd || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">B-End</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.bEnd || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Impact</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${rfo.impact || 'N/A'}</td>
        </tr>
      </table>
      
      <p style="margin-top: 25px; color: #666; font-size: 12px;">
        Generated on ${format(rfo.generatedAt, 'dd MMM yyyy HH:mm:ss')} by ${rfo.generatedBy}
      </p>
    </body>
    </html>
  `;
}

// ============================================
// EMAIL NOTIFICATION GENERATION
// ============================================

/**
 * Generate assignation email (Email 1)
 */
export function generateAssignationEmail(ticket: Ticket, recipientName: string, senderName: string): { subject: string; body: string } {
  const typeLabel = TICKET_TYPES[ticket.type]?.label || ticket.type;
  const locality = LOCALITIES[ticket.localite]?.label || ticket.localite;
  
  return {
    subject: `${ticket.ticketNumber} ${typeLabel.toUpperCase()} - ${ticket.lieu || ticket.liaisonImpactee || ''}`,
    body: `
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Bonjour ${recipientName},</p>
        
        <p>You have been assigned a ticket from ${senderName}</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff;">
          <p style="margin: 5px 0;"><strong>Techniciens assignés:</strong> ${ticket.techniciens.join(', ')}</p>
          <p style="margin: 5px 0;"><strong>Localité:</strong> ${locality}</p>
          <p style="margin: 5px 0;"><strong>Statut:</strong> Ouvert</p>
        </div>
        
        <p style="margin-top: 20px;">
          <a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le ticket</a>
        </p>
      </body>
      </html>
    `
  };
}

/**
 * Generate incident email (Email 2 - Table format)
 */
export function generateIncidentEmail(ticket: Ticket): { subject: string; body: string } {
  const rfo = generateRFO(ticket);
  
  return {
    subject: `[INCIDENT] ${ticket.ticketNumber} - ${ticket.objet}`,
    body: generateRFOEmailBody(rfo)
  };
}

/**
 * Generate opening notification email
 */
export function generateOpeningEmail(ticket: Ticket): { subject: string; body: string } {
  const severity = SEVERITY_CONFIG[ticket.severity];
  
  return {
    subject: `[${severity.label.toUpperCase()}] Nouveau Ticket ${ticket.ticketNumber} - ${ticket.objet}`,
    body: `
      <html>
      <body style="font-family: Arial, sans-serif;">
        <h2 style="color: #007bff;">Nouveau Ticket Ouvert</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Ticket N°:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Objet:</strong> ${ticket.objet}</p>
          <p><strong>Type:</strong> ${ticket.type}</p>
          <p><strong>Gravité:</strong> <span style="color: ${severity.color.replace('text-', '')}">${severity.label}</span></p>
          <p><strong>Statut:</strong> Ouvert</p>
          <p><strong>Localité:</strong> ${ticket.localite}</p>
          <p><strong>Technicien(s):</strong> ${ticket.techniciens.join(', ')}</p>
          <p><strong>Clients impactés:</strong> ${ticket.clientsImpactes.join(', ')}</p>
          <p><strong>Date d'ouverture:</strong> ${format(ticket.createdAt, 'dd MMM yyyy HH:mm')}</p>
        </div>
        <p><strong>Description:</strong></p>
        <p>${ticket.description}</p>
      </body>
      </html>
    `
  };
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

/**
 * Calculate dashboard statistics from tickets
 */
export function calculateDashboardStats(tickets: Ticket[]): TicketDashboardStats {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Basic counts
  const total = tickets.length;
  const ouverts = tickets.filter(t => t.status === 'ouvert').length;
  const enCours = tickets.filter(t => t.status === 'en_attente').length;
  const enAttente = tickets.filter(t => t.status === 'en_attente').length;
  const escalades = tickets.filter(t => t.status === 'escalade').length;
  const fermes = tickets.filter(t => t.status === 'ferme').length;
  const enRetard = tickets.filter(t => t.sla.isBreached && t.status !== 'ferme').length;
  const critiques = tickets.filter(t => t.severity === 'High' && t.status !== 'ferme').length;
  
  // Time metrics
  const resolvedTickets = tickets.filter(t => t.sla.actualResolutionTime !== undefined);
  const avgResolutionTime = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((sum, t) => sum + (t.sla.actualResolutionTime || 0), 0) / resolvedTickets.length)
    : 0;
  
  const acknowledgedTickets = tickets.filter(t => t.sla.actualResponseTime !== undefined);
  const avgResponseTime = acknowledgedTickets.length > 0
    ? Math.round(acknowledgedTickets.reduce((sum, t) => sum + (t.sla.actualResponseTime || 0), 0) / acknowledgedTickets.length)
    : 0;
  
  const totalDowntime = tickets.reduce((sum, t) => sum + t.downtimeMinutes, 0);
  
  // SLA compliance
  const slaCompliant = tickets.filter(t => !t.sla.isBreached).length;
  const slaCompliance = total > 0 ? Math.round((slaCompliant / total) * 100) : 100;
  const slaBreached = tickets.filter(t => t.sla.isBreached).length;
  
  // By type
  const byType: Record<string, number> = {};
  Object.keys(TICKET_TYPES).forEach(type => {
    byType[type] = tickets.filter(t => t.type === type).length;
  });
  
  // By severity
  const bySeverity: Record<string, number> = {
    High: tickets.filter(t => t.severity === 'High').length,
    Medium: tickets.filter(t => t.severity === 'Medium').length,
    Low: tickets.filter(t => t.severity === 'Low').length
  };
  
  // By technicien
  const technicienMap = new Map<string, { name: string; tickets: Ticket[] }>();
  tickets.forEach(t => {
    t.techniciens.forEach(techId => {
      if (!technicienMap.has(techId)) {
        technicienMap.set(techId, { name: techId, tickets: [] });
      }
      technicienMap.get(techId)!.tickets.push(t);
    });
  });
  
  const byTechnicien = Array.from(technicienMap.entries()).map(([id, data]) => {
    const resolved = data.tickets.filter(t => t.sla.actualResolutionTime !== undefined);
    const onTime = data.tickets.filter(t => !t.sla.isBreached);
    return {
      technicienId: id,
      technicienName: data.name,
      count: data.tickets.length,
      avgResolutionTime: resolved.length > 0
        ? Math.round(resolved.reduce((sum, t) => sum + (t.sla.actualResolutionTime || 0), 0) / resolved.length)
        : 0,
      slaCompliance: data.tickets.length > 0
        ? Math.round((onTime.length / data.tickets.length) * 100)
        : 100
    };
  }).sort((a, b) => b.count - a.count);
  
  // Trends
  const ticketsLast7Days = tickets.filter(t => isAfter(t.createdAt, last7Days)).length;
  const ticketsLast30Days = tickets.filter(t => isAfter(t.createdAt, last30Days)).length;
  const previous7Days = tickets.filter(t => {
    const date = t.createdAt;
    return isAfter(date, new Date(last7Days.getTime() - 7 * 24 * 60 * 60 * 1000)) && isBefore(date, last7Days);
  }).length;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (ticketsLast7Days > previous7Days * 1.1) trend = 'up';
  else if (ticketsLast7Days < previous7Days * 0.9) trend = 'down';
  
  // Technicien du mois
  const resolvedLast30Days = tickets.filter(t => 
    t.status === 'ferme' && 
    t.resolvedAt && 
    isAfter(t.resolvedAt, last30Days)
  );
  
  const technicienStats = new Map<string, { resolved: number; totalTime: number; onTime: number }>();
  resolvedLast30Days.forEach(t => {
    t.techniciens.forEach(techId => {
      if (!technicienStats.has(techId)) {
        technicienStats.set(techId, { resolved: 0, totalTime: 0, onTime: 0 });
      }
      const stats = technicienStats.get(techId)!;
      stats.resolved += 1;
      stats.totalTime += t.sla.actualResolutionTime || 0;
      if (!t.sla.isBreached) stats.onTime += 1;
    });
  });
  
  let technicienDuMois: TechnicianReport | undefined;
  let bestScore = 0;
  
  technicienStats.forEach((stats, id) => {
    const score = stats.resolved * 10 + (stats.onTime / stats.resolved) * 100 - stats.totalTime / stats.resolved;
    if (score > bestScore) {
      bestScore = score;
      technicienDuMois = {
        technicianId: id,
        technicianName: id,
        period: { start: last30Days, end: now },
        ticketsProcessed: stats.resolved,
        ticketsByStatus: {},
        avgInterventionTime: Math.round(stats.totalTime / stats.resolved),
        slaCompliance: Math.round((stats.onTime / stats.resolved) * 100),
        performance: Math.min(100, Math.round((stats.onTime / stats.resolved) * 100 + stats.resolved)),
        motivation: stats.resolved > 10 ? 'Excellent travail ce mois-ci!' : 'Continuez comme ça!',
        activityData: [],
        categoryBreakdown: []
      };
    }
  });
  
  return {
    total,
    ouverts,
    enCours: enAttente,
    enAttente,
    escalades,
    fermes,
    enRetard,
    critiques,
    avgResolutionTime,
    avgResponseTime,
    totalDowntime,
    slaCompliance,
    slaBreached,
    byType,
    bySeverity,
    byTechnicien,
    ticketsLast7Days,
    ticketsLast30Days,
    trend,
    technicienDuMois
  };
}

// ============================================
// TECHNICIAN REPORT
// ============================================

/**
 * Generate technician performance report
 */
export function generateTechnicianReport(
  technicianId: string,
  technicianName: string,
  tickets: Ticket[],
  startDate: Date,
  endDate: Date
): TechnicianReport {
  const technicianTickets = tickets.filter(t => 
    t.techniciens.includes(technicianId) &&
    isAfter(t.createdAt, startDate) &&
    isBefore(t.createdAt, endDate)
  );
  
  const processed = technicianTickets.length;
  const resolved = technicianTickets.filter(t => t.status === 'ferme');
  
  // By status
  const ticketsByStatus: Record<string, number> = {
    ouvert: technicianTickets.filter(t => t.status === 'ouvert').length,
    en_attente: technicianTickets.filter(t => t.status === 'en_attente').length,
    escalade: technicianTickets.filter(t => t.status === 'escalade').length,
    ferme: technicianTickets.filter(t => t.status === 'ferme').length
  };
  
  // Average intervention time
  const resolvedWithTime = resolved.filter(t => t.sla.actualResolutionTime);
  const avgInterventionTime = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((sum, t) => sum + (t.sla.actualResolutionTime || 0), 0) / resolvedWithTime.length)
    : 0;
  
  // SLA compliance
  const onTime = resolved.filter(t => !t.sla.isBreached);
  const slaCompliance = resolved.length > 0
    ? Math.round((onTime.length / resolved.length) * 100)
    : 100;
  
  // Performance score
  const performance = Math.min(100, Math.round(slaCompliance * 0.5 + (processed > 0 ? (resolved.length / processed) * 50 : 0)));
  
  // Activity data (by day)
  const activityMap = new Map<string, number>();
  technicianTickets.forEach(t => {
    const dateKey = format(t.createdAt, 'dd/MM');
    activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
  });
  const activityData = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));
  
  // Category breakdown
  const categoryMap = new Map<string, number>();
  technicianTickets.forEach(t => {
    categoryMap.set(t.type, (categoryMap.get(t.type) || 0) + 1);
  });
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }));
  
  // Motivation message
  let motivation = '';
  if (slaCompliance >= 95 && performance >= 80) {
    motivation = 'Excellente performance! Technicien très fiable et efficace.';
  } else if (slaCompliance >= 80) {
    motivation = 'Bonne performance générale. Quelques améliorations possibles sur les délais.';
  } else if (slaCompliance >= 60) {
    motivation = 'Performance correcte. Attention aux délais SLA.';
  } else {
    motivation = 'Des axes d\'amélioration ont été identifiés. Un accompagnement est recommandé.';
  }
  
  return {
    technicianId,
    technicianName,
    period: { start: startDate, end: endDate },
    ticketsProcessed: processed,
    ticketsByStatus,
    avgInterventionTime,
    slaCompliance,
    performance,
    motivation,
    activityData,
    categoryBreakdown
  };
}

// ============================================
// HISTORY HELPERS
// ============================================

/**
 * Create a history entry
 */
export function createHistoryEntry(
  ticketId: string,
  action: TicketHistoryEntry['action'],
  userId: string,
  userName: string,
  details: string,
  oldValue?: string,
  newValue?: string,
  field?: string
): TicketHistoryEntry {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ticketId,
    action,
    userId,
    userName,
    oldValue,
    newValue,
    field,
    timestamp: new Date(),
    details
  };
}

// ============================================
// EXPORT HELPERS
// ============================================

/**
 * Export tickets to CSV format
 */
export function exportTicketsToCSV(tickets: Ticket[]): string {
  const headers = [
    'ID du Ticket', 'Objet', 'Nom de Contact', 'Nom de Compte', 
    'Fil récent', 'Date d\'échéance', 'État', 'Propriétaire du Ticket', 'Canal'
  ];
  
  const rows = tickets.map(t => [
    t.ticketNumber,
    t.objet,
    t.contactName || '',
    t.accountName || '',
    t.comments.length > 0 ? format(t.comments[t.comments.length - 1].createdAt, 'dd/MM HH:mm') : '',
    t.dueDate ? format(t.dueDate, 'dd MMM yyyy HH:mm') : '',
    t.status,
    t.technicienPrincipal || t.techniciens[0] || '',
    t.source
  ]);
  
  return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if user can manage tickets (create, modify, close, delete)
 */
export function canManageTickets(userRole: string): boolean {
  const normalizedRole = userRole?.toLowerCase() || '';
  return normalizedRole === 'technicien_no' || 
         normalizedRole === 'technicien' ||
         normalizedRole === 'responsable' || 
         normalizedRole === 'admin' ||
         normalizedRole === 'super_admin';
}

/**
 * Check if user can only view/follow tickets
 */
export function canOnlyViewTickets(userRole: string): boolean {
  const normalizedRole = userRole?.toLowerCase() || '';
  return normalizedRole === 'user';
}
