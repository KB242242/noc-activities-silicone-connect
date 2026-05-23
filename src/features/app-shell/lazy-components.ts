import dynamic from 'next/dynamic';

export const CreateTicketDialog = dynamic(
  () => import('@/components/tickets/CreateTicketDialog').then((module) => module.CreateTicketDialog),
  { ssr: false }
);

export const TicketArchiveDashboard = dynamic(
  () => import('@/components/tickets/TicketArchiveDashboard'),
  { ssr: false }
);
