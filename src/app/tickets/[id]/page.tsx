import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';

const TicketDetailShell = dynamic(() => import('@/components/tickets/TicketDetailShell'));

export const revalidate = 30;

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(String(id ?? ''));
  const normalizedRef = decodedId.replace(/^#/, '').trim();
  const hashRef = normalizedRef ? `#${normalizedRef}` : '';

  if (!decodedId || decodedId === 'undefined' || decodedId === 'null') {
    redirect('/?tab=tickets');
  }

  const ticket = await (db as any).ticket.findFirst({
    where: {
      OR: [
        { id: decodedId },
        { id: normalizedRef },
        { numero: decodedId },
        { numero: normalizedRef },
        { numero: hashRef },
      ],
    },
    include: {
      attachments: {
        select: {
          id: true,
          ticketId: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          uploadedBy: true,
          uploadedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              firstName: true,
            },
          },
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
      history: { orderBy: { timestamp: 'desc' }, take: 50 },
    },
  });

  if (!ticket) {
    redirect('/?tab=tickets');
  }

  return <TicketDetailShell ticket={mapTicket(ticket)} />;
}