import { redirect } from 'next/navigation';

export default function TicketDetailNotFound() {
  redirect('/?tab=tickets');
}
