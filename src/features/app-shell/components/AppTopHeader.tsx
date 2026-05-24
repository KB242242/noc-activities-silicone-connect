import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  Coffee,
  Info,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Users,
  X,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { isSuperAdmin } from '@/features/app-shell/utils';
import type { NotificationItem, UserProfile } from '@/features/app-shell/types';

type AppTopHeaderProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  notificationsOpen: boolean;
  onNotificationsOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  onNotificationClick: (notification: NotificationItem) => void;
  mounted: boolean;
  theme: string | undefined;
  onToggleTheme: () => void;
  user: UserProfile | null;
  onOpenProfileDialog: () => void;
  onOpenAvatarViewer: (avatar?: string | null, name?: string | null) => void;
  onOpenEditProfileDialog: () => void;
  onOpenShiftDialog: () => void;
  onOpenRestDialog: () => void;
  onOpenSecurityDialog: () => void;
  onOpenSettingsDialog: () => void;
  onOpenAdminUsers: () => void;
  onLogout: () => void;
};

export function AppTopHeader({
  sidebarOpen,
  onToggleSidebar,
  searchQuery,
  onSearchQueryChange,
  notificationsOpen,
  onNotificationsOpenChange,
  notifications,
  onNotificationClick,
  mounted,
  theme,
  onToggleTheme,
  user,
  onOpenProfileDialog,
  onOpenAvatarViewer,
  onOpenEditProfileDialog,
  onOpenShiftDialog,
  onOpenRestDialog,
  onOpenSecurityDialog,
  onOpenSettingsDialog,
  onOpenAdminUsers,
  onLogout,
}: AppTopHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleSidebar}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <img src="/logo.png" alt="Silicone Connect" className="h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <span className="font-bold text-lg hidden sm:block">NOC ACTIVITIES</span>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">NOC Actif</span>
        </div>

        <Popover open={notificationsOpen} onOpenChange={onNotificationsOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b font-semibold">Notifications</div>
            <ScrollArea className="h-50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    void onNotificationClick(n);
                  }}
                  className={`p-3 border-b hover:bg-muted/50 cursor-pointer flex items-start gap-2 ${n.read ? 'opacity-60' : ''}`}
                >
                  {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />}
                  {n.type === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                  {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                  {n.type === 'info' && <Info className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <span className="text-sm">{n.message}</span>
                </div>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {mounted && (
          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9">
              <div
                className="relative h-8 w-8 cursor-pointer group"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.detail === 2) {
                    onOpenProfileDialog();
                  } else {
                    onOpenAvatarViewer(user?.avatar, user?.name);
                  }
                }}
                title="Clic simple: voir la photo | Double-clic: changer la photo"
              >
                <Avatar className="h-8 w-8">
                  {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-cyan-500 text-white text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-linear-to-r from-blue-500 to-cyan-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenEditProfileDialog} className="gap-2">
              <User className="w-4 h-4" />
              Modifier mes informations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenProfileDialog} className="gap-2">
              <Camera className="w-4 h-4" />
              Ma photo de profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenShiftDialog} className="gap-2">
              <Calendar className="w-4 h-4" />
              Définir mon shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenRestDialog} className="gap-2">
              <Coffee className="w-4 h-4" />
              Mes repos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSecurityDialog} className="gap-2">
              <Settings className="w-4 h-4" />
              Sécuriser mon compte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettingsDialog} className="gap-2">
              <Settings className="w-4 h-4" />
              Paramètres
            </DropdownMenuItem>
            {isSuperAdmin(user) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Administration</DropdownMenuLabel>
                <DropdownMenuItem onClick={onOpenAdminUsers} className="gap-2">
                  <Users className="w-4 h-4" />
                  Gérer les utilisateurs
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive">
              <LogOut className="w-4 h-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
