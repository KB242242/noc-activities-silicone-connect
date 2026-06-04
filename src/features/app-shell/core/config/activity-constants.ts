export const ALERT_THRESHOLDS = {
  inactivityMinutes: 120,
  taskApproachingMinutes: 30,
  suspendedTooLongMinutes: 60,
  noTaskCreatedAfterShiftStart: 60,
  tooManyPendingEndShift: 60,
};

export const ACTIVITY_TYPES: Record<string, Array<{ value: string; label: string }>> = {
  Monitoring: [
    { value: 'CLIENT_DOWN', label: 'Client Down' },
    { value: 'INTERFACE_UNSTABLE', label: 'Interface instable' },
    { value: 'RECURRENT_PROBLEM', label: 'Probleme recurrent' },
    { value: 'EQUIPMENT_ALERT', label: 'Alerte equipement' },
  ],
  'Call Center': [
    { value: 'TICKET_CREATED', label: 'Ticket créé' },
    { value: 'CLIENT_CALL', label: 'Appel client' },
    { value: 'ESCALATION', label: 'Escalade' },
    { value: 'INCIDENT_FOLLOWUP', label: 'Suivi incident' },
  ],
  'Reporting 1': [
    { value: 'GRAPH_SENT', label: 'Graphe envoye' },
    { value: 'ALERT_PUBLISHED', label: 'Alerte publiee' },
    { value: 'HANDOVER_WRITTEN', label: 'Handover redige' },
  ],
  'Reporting 2': [
    { value: 'REPORT_GENERATED', label: 'Rapport genere' },
    { value: 'TICKET_UPDATED', label: 'Ticket mis a jour' },
    { value: 'TICKET_CLOSED', label: 'Ticket cloture' },
    { value: 'RFO_CREATED', label: 'RFO créé' },
  ],
};