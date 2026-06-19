import { AnimatePresence, motion } from 'framer-motion';
import {
  AlignLeft,
  AlignRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Coffee,
  ExternalLink,
  Eye,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Network,
  Settings,
  Ticket,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  isNocSection,
  NOC_SIDEBAR_ITEMS,
  type AppSectionKey,
} from '@/features/app-shell/core/shared/navigation';
import { getShiftColor } from '@/features/app-shell/core/planning/shifts';
import type { Conversation, InternalMessage, UserProfile } from '@/features/app-shell/core/shared/types';

type AppSidebarProps = {
  sidebarOpen: boolean;
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  isSidebarResizing: boolean;
  onToggleSidebarPosition: () => void;
  onToggleSidebarCollapsed: () => void;
  onStartSidebarResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCloseMobileSidebar: () => void;
  currentTab: AppSectionKey;
  onSelectTab: (tab: AppSectionKey) => void;
  canAccessPlanning: boolean;
  canAccessNocSections: boolean;
  isNocGroupOpen: boolean;
  onToggleNocGroup: () => void;
  conversations: Conversation[];
  messages: InternalMessage[];
  gedDocuments: Array<{ status?: string }>;
  user: UserProfile | null;
  onOpenRestDialog: () => void;
};

export function AppSidebar({
  sidebarOpen,
  sidebarPosition,
  sidebarCollapsed,
  sidebarWidth,
  isSidebarResizing,
  onToggleSidebarPosition,
  onToggleSidebarCollapsed,
  onStartSidebarResize,
  onCloseMobileSidebar,
  currentTab,
  onSelectTab,
  canAccessPlanning,
  canAccessNocSections,
  isNocGroupOpen,
  onToggleNocGroup,
  conversations,
  messages,
  gedDocuments,
  user,
  onOpenRestDialog,
}: AppSidebarProps) {
  return (
    <>
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:sticky top-14 left-0 z-40 w-60 lg:w-auto h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300 lg:translate-x-0`}
        style={{ width: sidebarCollapsed ? 64 : sidebarWidth }}
      >
        <div className="hidden lg:flex items-center justify-between gap-2 p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleSidebarPosition}
            aria-label={sidebarPosition === 'left' ? 'Placer la sidebar à droite' : 'Placer la sidebar à gauche'}
            title={sidebarPosition === 'left' ? 'Placer la sidebar à droite' : 'Placer la sidebar à gauche'}
          >
            {sidebarPosition === 'left' ? <AlignRight className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
            title={sidebarCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        {!sidebarCollapsed && (
          <div
            className={`hidden lg:block absolute top-0 bottom-0 w-2 z-50 cursor-col-resize ${sidebarPosition === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'}`}
            onMouseDown={onStartSidebarResize}
            role="separator"
            aria-label="Redimensionner la sidebar"
            aria-orientation="vertical"
            title="Glisser pour redimensionner"
          >
            <div
              className={`absolute inset-y-0 ${sidebarPosition === 'left' ? 'left-1' : 'right-1'} w-0.5 rounded-full ${isSidebarResizing ? 'bg-cyan-500/80' : 'bg-border/40'}`}
            />
          </div>
        )}
        <ScrollArea className="h-full">
          <nav className="p-3 space-y-1">
            <Button variant={currentTab === 'dashboard' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('dashboard')}>
              <LayoutDashboard className="w-5 h-5" /> {!sidebarCollapsed && 'Tableau de bord'}
            </Button>
            {canAccessPlanning && (
              <Button variant={currentTab === 'planning' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('planning')}>
                <Calendar className="w-5 h-5" /> {!sidebarCollapsed && 'Planning'}
              </Button>
            )}
            <Button variant={currentTab === 'tasks' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('tasks')}>
              <ClipboardList className="w-5 h-5" /> {!sidebarCollapsed && 'Mes Tâches'}
            </Button>
            <Button variant={currentTab === 'tickets' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('tickets')}>
              <Ticket className="w-5 h-5" /> {!sidebarCollapsed && 'Gestion Tickets'}
            </Button>
            {canAccessNocSections && (
              <>
                <Separator className="my-2" />
                <Button
                  variant={isNocSection(currentTab) ? 'secondary' : 'ghost'}
                  className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`}
                  onClick={() => {
                    if (sidebarCollapsed) {
                      onSelectTab('noc_monitoring');
                      return;
                    }

                    onToggleNocGroup();
                  }}
                >
                  <Network className="w-5 h-5" /> {!sidebarCollapsed && 'NOC'}
                  {!sidebarCollapsed && (
                    <ChevronDown
                      className={`ml-auto w-4 h-4 transition-transform ${isNocGroupOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </Button>
                <AnimatePresence>
                  {!sidebarCollapsed && isNocGroupOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-4 mt-1 space-y-1"
                    >
                      {NOC_SIDEBAR_ITEMS.map((nocItem) => {
                        const NocIcon = nocItem.icon;
                        return (
                          <Button
                            key={nocItem.id}
                            variant={currentTab === nocItem.id ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`w-full justify-start gap-2 h-9 pl-4 ${currentTab === nocItem.id ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : ''}`}
                            onClick={() => onSelectTab(nocItem.id)}
                          >
                            <NocIcon className="w-4 h-4" />
                            {nocItem.label}
                          </Button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Separator className="my-2" />
              </>
            )}
            <Button variant={currentTab === 'overtime' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('overtime')}>
              <Clock className="w-5 h-5" /> {!sidebarCollapsed && 'Heures Sup.'}
            </Button>
            <Button variant={currentTab === 'links' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('links')}>
              <ExternalLink className="w-5 h-5" /> {!sidebarCollapsed && 'Liens Externes'}
            </Button>
            <Button variant={currentTab === 'email' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('email')}>
              <MessageCircle className="w-5 h-5" /> {!sidebarCollapsed && 'Chats'}
              {!sidebarCollapsed && conversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 && (
                <Badge className="ml-auto bg-green-500 text-white text-xs px-1.5 py-0.5 min-w-5 justify-center">
                  {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
                </Badge>
              )}
            </Button>
            <Button variant={currentTab === 'messagerie' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('messagerie')}>
              <Mail className="w-5 h-5" /> {!sidebarCollapsed && 'Messagerie'}
              {!sidebarCollapsed && messages.filter((m) => m.folder === 'inbox' && !m.isRead).length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-5 justify-center">
                  {messages.filter((m) => m.folder === 'inbox' && !m.isRead).length}
                </Badge>
              )}
            </Button>
            <Button variant={currentTab === 'ged' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('ged')}>
              <FileText className="w-5 h-5" /> {!sidebarCollapsed && 'GED Documents'}
              {!sidebarCollapsed && gedDocuments.filter((d) => d.status === 'en_attente').length > 0 && (
                <Badge className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 min-w-5 justify-center">
                  {gedDocuments.filter((d) => d.status === 'en_attente').length}
                </Badge>
              )}
            </Button>

            {(user?.role === 'RESPONSABLE' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <>
                <Separator className="my-2" />
                <Button variant={currentTab === 'supervision' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('supervision')}>
                  <Eye className="w-5 h-5" /> {!sidebarCollapsed && 'Supervision'}
                </Button>
              </>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <Button variant={currentTab === 'admin_users' ? 'secondary' : 'ghost'} className={`w-full ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'} gap-3 h-10`} onClick={() => onSelectTab('admin_users')}>
                <Users className="w-5 h-5" /> {!sidebarCollapsed && 'Configuration'}
              </Button>
            )}
          </nav>
        </ScrollArea>

        {user?.shift && !sidebarCollapsed && (
          <div className="absolute bottom-3 left-3 right-3">
            <Card className="border-2" style={{ borderColor: getShiftColor(user.shift.name) }}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(user.shift.name) }} />
                  <span className="font-medium">Shift {user.shift.name}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={onOpenRestDialog}>
                  <Coffee className="w-3 h-3 mr-1" /> Voir mes repos
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onCloseMobileSidebar} />}
    </>
  );
}
