'use client';

import React, { useState, useCallback } from 'react';
import {
  LayoutDashboard, Plus, Ticket, BarChart3, Users, ChevronDown,
  ChevronRight, Trash2, Menu, X, Moon, Sun, Settings,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import TicketList from './TicketList';
import TicketForm from './TicketForm';
import TicketDetail from './TicketDetail';
import TicketDashboard from './TicketDashboard';
import { NocTicket } from './types';

type Tab = 'list' | 'new' | 'dashboard' | 'trash';

interface Props {
  user: { id: string; name: string; email: string; role: string };
  initialSearch?: string;
  initialTab?: Tab;
}

const SUPER_ADMIN_EMAIL = 'theresia.babindamana@siliconeconnect.com';
const AUTHORIZED_EDITORS = [
  'theresia.babindamana@siliconeconnect.com',
  'noc@siliconeconnect.com',
];

export default function TicketsPage({ user, initialSearch = '', initialTab = 'list' }: Props) {
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<NocTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<NocTicket | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isDark = theme === 'dark';
  const isEditor = AUTHORIZED_EDITORS.includes(user.email) || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || user.role === 'SUPER_ADMIN';

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const changeTab = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    setSidebarOpen(false);
  }, []);

  const handleViewTicket = useCallback((ticket: NocTicket) => {
    setSelectedTicket(ticket);
    changeTab('list');
  }, [changeTab]);

  const handleEditTicket = useCallback((ticket: NocTicket) => {
    setEditingTicket(ticket);
    changeTab('new');
  }, [changeTab]);

  const handleFormClose = useCallback(() => {
    setEditingTicket(null);
    changeTab('list');
    refresh();
  }, [changeTab, refresh]);

  const handleDetailClose = useCallback(() => {
    setSelectedTicket(null);
    refresh();
  }, [refresh]);

  const navBtn = (current: Tab, icon: React.ReactNode, label: string) => (
    <Button
      variant={tab === current ? 'secondary' : 'ghost'}
      className={`w-full justify-start gap-3 h-10 ${tab === current ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25' : ''}`}
      onClick={() => { changeTab(current); setSelectedTicket(null); setEditingTicket(null); }}
    >
      {icon}
      {label}
    </Button>
  );

  const sidebar = (
    <ScrollArea className="h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Ticket className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Silicone Connect</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">NOC · Gestion Tickets</p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {navBtn('dashboard', <LayoutDashboard className="w-5 h-5" />, 'Dashboard')}
        {isEditor && navBtn('new', <Plus className="w-5 h-5" />, 'Nouveau Ticket')}
        {navBtn('list', <Ticket className="w-5 h-5" />, 'Gestion des Tickets')}
        {navBtn('dashboard', <BarChart3 className="w-5 h-5" />, 'Statistiques')}

        <Separator className="my-2" />

        {/* Gestion Utilisateurs dropdown */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10"
          onClick={() => setUsersExpanded((p) => !p)}
        >
          <Users className="w-5 h-5" />
          Gestion Utilisateurs
          {usersExpanded
            ? <ChevronDown className="ml-auto w-4 h-4" />
            : <ChevronRight className="ml-auto w-4 h-4" />}
        </Button>
        {usersExpanded && (
          <div className="ml-4 space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
              <Users className="w-4 h-4" /> Clients SC
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
              <Settings className="w-4 h-4" /> Techniciens
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 pl-4">
              <Users className="w-4 h-4" /> Agents
            </Button>
          </div>
        )}

        <Separator className="my-2" />
        {navBtn('trash', <Trash2 className="w-5 h-5" />, 'Corbeille')}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground">© 2025 Silicone Connect · v2.0</p>
      </div>
    </ScrollArea>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm hidden sm:block">Gestion des Tickets NOC</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 border-r bg-background/50 relative">
          {sidebar}
        </aside>

        {/* Sidebar mobile overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-background border-r lg:hidden flex flex-col">
              <div className="flex items-center justify-end p-2 border-b">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {sidebar}
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Detail overlay */}
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              user={user}
              isEditor={isEditor}
              isSuperAdmin={isSuperAdmin}
              onClose={handleDetailClose}
              onEdit={handleEditTicket}
              onRefresh={refresh}
            />
          ) : tab === 'dashboard' ? (
            <TicketDashboard user={user} refreshKey={refreshKey} />
          ) : tab === 'new' ? (
            <TicketForm
              user={user}
              editingTicket={editingTicket}
              onClose={handleFormClose}
            />
          ) : tab === 'list' ? (
            <TicketList
              user={user}
              isEditor={isEditor}
              isSuperAdmin={isSuperAdmin}
              initialSearch={initialSearch}
              refreshKey={refreshKey}
              onView={handleViewTicket}
              onEdit={handleEditTicket}
              onNew={() => { setEditingTicket(null); changeTab('new'); }}
              onRefresh={refresh}
              isTrash={false}
            />
          ) : tab === 'trash' ? (
            <TicketList
              user={user}
              isEditor={isEditor}
              isSuperAdmin={isSuperAdmin}
              initialSearch=""
              refreshKey={refreshKey}
              onView={handleViewTicket}
              onEdit={handleEditTicket}
              onNew={() => {}}
              onRefresh={refresh}
              isTrash
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
