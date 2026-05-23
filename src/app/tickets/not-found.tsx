import { redirect } from 'next/navigation';

export default function TicketsNotFound() {
  redirect('/?tab=tickets');
}
