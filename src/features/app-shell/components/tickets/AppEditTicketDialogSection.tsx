import { toast } from 'sonner';

import { TicketApiRequestError } from '@/features/app-shell/ticket-api';
import { AppEditTicketDialog } from '@/features/app-shell/components/tickets/dialogs/AppEditTicketDialog';

type AppEditTicketDialogSectionProps = {
  editTicketOpen: boolean;
  setEditTicketOpen: (open: boolean) => void;
  editingTicket: unknown;
  setEditingTicket: (value: unknown) => void;
  ticketSiteOptions: unknown;
  ticketLocalityOptions: unknown;
  ticketTechnicianOptions: unknown;
  editTicketLocalityDraft: unknown;
  setEditTicketLocalityDraft: (value: unknown) => void;
  isEditLocalityCreationEnabled: boolean;
  setIsEditLocalityCreationEnabled: (enabled: boolean) => void;
  ticketCongoDepartments: unknown;
  isCreatingLocality: boolean;
  statusOptions: unknown;
  priorityOptions: unknown;
  createTicketLocality: (draft: unknown, mode: string) => Promise<unknown>;
  resolveTicketSiteSelection: (site: unknown) => Array<{ id: string; name: string }>;
  resolveTicketTechnicians: (value: unknown) => Array<{ id: string; name: string }>;
  updateTicketDetailsRequest: (payload: unknown) => Promise<unknown>;
  mapLegacyTicketStatusToApi: (status: unknown) => unknown;
  mapLegacyTicketPriorityToApi: (priority: unknown) => unknown;
  splitTicketValues: (value: unknown) => unknown;
  user: { id?: string; name?: string } | null;
  mapApiTicketToLegacy: (payload: unknown) => any;
  setTickets: (updater: (prev: any[]) => any[]) => void;
  setSelectedTicket: (updater: (prev: any) => any) => void;
};

export function AppEditTicketDialogSection({
  editTicketOpen,
  setEditTicketOpen,
  editingTicket,
  setEditingTicket,
  ticketSiteOptions,
  ticketLocalityOptions,
  ticketTechnicianOptions,
  editTicketLocalityDraft,
  setEditTicketLocalityDraft,
  isEditLocalityCreationEnabled,
  setIsEditLocalityCreationEnabled,
  ticketCongoDepartments,
  isCreatingLocality,
  statusOptions,
  priorityOptions,
  createTicketLocality,
  resolveTicketSiteSelection,
  resolveTicketTechnicians,
  updateTicketDetailsRequest,
  mapLegacyTicketStatusToApi,
  mapLegacyTicketPriorityToApi,
  splitTicketValues,
  user,
  mapApiTicketToLegacy,
  setTickets,
  setSelectedTicket,
}: AppEditTicketDialogSectionProps) {
  if (!editTicketOpen) {
    return null;
  }

  return (
    <AppEditTicketDialog
      open={editTicketOpen}
      editingTicket={editingTicket as any}
      setEditingTicket={setEditingTicket as any}
      ticketSiteOptions={ticketSiteOptions as any}
      ticketLocalityOptions={ticketLocalityOptions as any}
      ticketTechnicianOptions={ticketTechnicianOptions as any}
      editTicketLocalityDraft={editTicketLocalityDraft as any}
      setEditTicketLocalityDraft={setEditTicketLocalityDraft as any}
      isEditLocalityCreationEnabled={isEditLocalityCreationEnabled}
      onEditLocalityCreationEnabledChange={setIsEditLocalityCreationEnabled}
      ticketCongoDepartments={ticketCongoDepartments as any}
      isCreatingLocality={isCreatingLocality}
      statusOptions={statusOptions as any}
      priorityOptions={priorityOptions as any}
      onOpenChange={(open) => {
        setEditTicketOpen(open);
        if (!open) {
          setIsEditLocalityCreationEnabled(false);
        }
      }}
      onCreateLocality={async () => {
        await createTicketLocality(editTicketLocalityDraft, 'edit');
      }}
      onCancel={() => setEditTicketOpen(false)}
      onSave={async (ticket) => {
        try {
          const selectedSites = resolveTicketSiteSelection(ticket.site);
          const selectedTechnicians = resolveTicketTechnicians(ticket.technicien);
          const updatedPayload = await updateTicketDetailsRequest({
            ticketId: ticket.id,
            objet: ticket.objet,
            description: ticket.description,
            status: mapLegacyTicketStatusToApi(ticket.status),
            priority: mapLegacyTicketPriorityToApi(ticket.priority),
            siteIds: selectedSites.map((site) => site.id),
            siteNames: selectedSites.map((site) => site.name),
            localities: splitTicketValues(ticket.localite),
            technicianIds: selectedTechnicians.map((technician) => technician.id),
            technicianNames: selectedTechnicians.map((technician) => ({ id: technician.id, name: technician.name })),
            updatedBy: user?.name,
            updatedById: user?.id,
          });

          const updatedTicket = mapApiTicketToLegacy(updatedPayload);
          setTickets((prev) => prev.map((entry) => (entry.id === updatedTicket.id ? updatedTicket : entry)));
          setSelectedTicket((prev) => (prev?.id === updatedTicket.id ? updatedTicket : prev));
          setEditTicketOpen(false);
          toast.success('Ticket modifie');
        } catch (error) {
          if (error instanceof TicketApiRequestError) {
            const err = error.payload;
            if (error.status === 409 || err?.error === 'technician_capacity_exceeded') {
              toast.error(err?.message ?? 'Un technicien a deja 3 tickets actifs cette semaine.');
              return;
            }
          }
          console.error('[tickets page] update ticket', error);
          toast.error('Impossible de modifier le ticket');
        }
      }}
    />
  );
}
