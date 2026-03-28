'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  LayoutDashboard, Calendar, Activity, Clock, Users, Settings, Bell,
  FileText, AlertTriangle, CheckCircle2, TrendingUp, UserCheck, Plus,
  Ticket, Mail, MessageCircle, FolderOpen, Shield, UserPlus,
  Building2, Wrench, User, ChevronDown as ChevronDownIcon,
  Monitor, Phone, FileSpreadsheet, Network, Truck, Globe, Coffee,
  Moon, Sun, LogOut, Eye, EyeOff, RefreshCw, Menu, X
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    shift?: { name: string; color: string; colorCode: string } | null;
  } | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  pendingTasksCount: number;
  pendingTicketsCount: number;
  unreadMessagesCount: number;
  pendingDocumentsCount: number;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  badgeColor?: string;
  children?: { id: string; label: string; icon: typeof Users }[];
}

export default function Sidebar({
  user,
  currentTab,
  setCurrentTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  theme,
  setTheme,
  pendingTasksCount,
  pendingTicketsCount,
  unreadMessagesCount,
  pendingDocumentsCount,
  onLogout
}: SidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Check scroll position
  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition);
      return () => scrollElement.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  // Scroll handlers
  const scrollUp = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  // Toggle menu expansion
  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'tickets',
      label: 'Gestion Tickets',
      icon: Ticket,
      badge: pendingTicketsCount,
      badgeColor: 'bg-red-500'
    },
    {
      id: 'tasks',
      label: 'Tâches NOC',
      icon: CheckCircle2,
      badge: pendingTasksCount,
      badgeColor: 'bg-orange-500'
    },
    {
      id: 'users',
      label: 'Gestion Utilisateurs',
      icon: Users,
      children: [
        { id: 'clients', label: 'Clients SC', icon: Building2 },
        { id: 'technicians', label: 'Techniciens', icon: Wrench },
        { id: 'agents', label: 'Agents', icon: User }
      ]
    },
    {
      id: 'planning',
      label: 'Planning',
      icon: Calendar
    },
    {
      id: 'activities',
      label: 'Activités',
      icon: Activity
    },
    {
      id: 'overtime',
      label: 'Heures Supp.',
      icon: Clock
    },
    {
      id: 'inbox',
      label: 'Messagerie',
      icon: Mail,
      badge: unreadMessagesCount,
      badgeColor: 'bg-blue-500'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageCircle
    },
    {
      id: 'ged',
      label: 'GED Documents',
      icon: FileText,
      badge: pendingDocumentsCount,
      badgeColor: 'bg-orange-500'
    },
    {
      id: 'links',
      label: 'Liens Externes',
      icon: Globe
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: TrendingUp
    }
  ];

  // Check if user has permission for a tab
  const hasPermission = (tabId: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;

    const restrictedTabs = ['users', 'reports'];
    if (restrictedTabs.includes(tabId) && user.role !== 'ADMIN' && user.role !== 'RESPONSABLE') {
      return false;
    }

    return true;
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: sidebarCollapsed ? 80 : 280 }}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen relative"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">NOC Activities</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Silicone Connect</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Scroll Up Button */}
      <AnimatePresence>
        {canScrollUp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-0 right-0 z-10 flex justify-center py-1 bg-gradient-to-b from-white dark:from-gray-900 to-transparent"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollUp}
              className="h-6 w-full rounded-none text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Menu */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <nav className="space-y-1">
          {menuItems.map((item) => {
            if (!hasPermission(item.id)) return null;

            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isExpanded = expandedMenus.includes(item.id);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10 relative`}
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.id);
                    } else {
                      setCurrentTab(item.id);
                    }
                  }}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge className={`ml-auto ${item.badgeColor} text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center`}>
                          {item.badge}
                        </Badge>
                      )}
                      {hasChildren && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.badge && item.badge > 0 && (
                    <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${item.badgeColor}`} />
                  )}
                </Button>

                {/* Sub-menu */}
                <AnimatePresence>
                  {hasChildren && isExpanded && !sidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-4 mt-1 space-y-1"
                    >
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const childIsActive = currentTab === child.id;

                        return (
                          <Button
                            key={child.id}
                            variant={childIsActive ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`w-full justify-start gap-2 h-9 pl-6 ${childIsActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}`}
                            onClick={() => setCurrentTab(child.id)}
                          >
                            <ChildIcon className="w-4 h-4" />
                            {child.label}
                          </Button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Scroll Down Button */}
      <AnimatePresence>
        {canScrollDown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-0 right-0 z-10 flex justify-center py-1 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollDown}
              className="h-6 w-full rounded-none text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Info & Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {user && !sidebarCollapsed && (
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
              style={{ backgroundColor: user.shift?.colorCode || '#6B7280' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Changer le thème"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </Button>

          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="hidden lg:flex"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Réduire
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
