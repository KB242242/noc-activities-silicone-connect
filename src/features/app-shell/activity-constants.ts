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
    { value: 'RECURRENT_PROBLEM', label: 'Problème récurrent' },
    { value: 'EQUIPMENT_ALERT', label: 'Alerte équipement' },
  ],
  'Call Center': [
    { value: 'TICKET_CREATED', label: 'Ticket créé' },
    { value: 'CLIENT_CALL', label: 'Appel client' },
    { value: 'ESCALATION', label: 'Escalade' },
    { value: 'INCIDENT_FOLLOWUP', label: 'Suivi incident' },
  ],
  'Reporting 1': [
    { value: 'GRAPH_SENT', label: 'Graphe envoyé' },
    { value: 'ALERT_PUBLISHED', label: 'Alerte publiée' },
    { value: 'HANDOVER_WRITTEN', label: 'Handover rédigé' },
  ],
  'Reporting 2': [
    { value: 'REPORT_GENERATED', label: 'Rapport généré' },
    { value: 'TICKET_UPDATED', label: 'Ticket mis à jour' },
    { value: 'TICKET_CLOSED', label: 'Ticket clôturé' },
    { value: 'RFO_CREATED', label: 'RFO créé' },
  ],
};
