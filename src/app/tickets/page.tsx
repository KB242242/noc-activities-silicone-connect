'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import TicketsPage from '@/components/tickets/TicketsPage';

export default function TicketsRoute() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  const initialSearch = searchParams.get('search') ?? '';
  const initialTab = (searchParams.get('tab') as 'list' | 'new' | 'dashboard' | 'trash') ?? 'list';

  return <TicketsPage user={user} initialSearch={initialSearch} initialTab={initialTab} />;
}
