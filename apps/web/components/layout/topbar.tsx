'use client';

import * as React from 'react';
import { useRouter } from '@/src/i18n/navigation';
import { useRouter as useAppRouter } from 'next/navigation';
import { useLanguageChange } from '@/hooks/useLanguageChange';
import { motion } from 'framer-motion';
import {
  Bell,
  Settings,
  LogOut,
  User,
  Building2,
  Lock,
  ChevronDown,
  RefreshCw,
  HelpCircle,
  Moon,
  Sun,
  Monitor,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/components/auth/protected-route';
import { PermissionManager } from '@/lib/auth/permissions';
import { useThemeMode, useColorScheme } from '@/hooks/use-theme';
import { getThemeList } from '@/lib/theme/theme-config';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications/notification-provider';
import { NotificationCenter } from '../notifications/notification-center';
import { TopbarLanguageSwitcher } from '@/components/language/header-language-switcher';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';

interface TopbarProps {
  title?: string;
  description?: string;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function Topbar({
  title: _title,
  description: _description,
  breadcrumbItems: _breadcrumbItems = [],
  actions,
  isFullscreen = false,
  onToggleFullscreen,
}: TopbarProps) {
  const { t } = useLanguageChange('common');
  const { user, logout } = useAuth();
  const {
    isAreaManager,
    isLockedSingleCompanyRole,
    isMultiCompany,
    availableCompanies,
    selectedCompanyId,
    selectedCompanyLabel,
    setSelectedCompanyId
  } = useCompanyScope();
  const { unreadCount } = useNotifications();
  const { canPerformAction } = usePermissions();
  const { mode, setTheme } = useThemeMode();
  const { colorScheme, setColorScheme } = useColorScheme();
  const router = useRouter();
  const appRouter = useAppRouter();

  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const readOnlyCompanyLabel = React.useMemo(() => {
    if (selectedCompanyId !== ALL_COMPANIES_SCOPE && selectedCompanyLabel) {
      return selectedCompanyLabel;
    }

    if (availableCompanies.length === 1) {
      return availableCompanies[0].name;
    }

    if (availableCompanies.length > 1) {
      return `${availableCompanies.length} Perusahaan`;
    }

    const userCompanyInfo = user as { company?: { name?: string } | string } | null;
    const companyFromUser = typeof userCompanyInfo?.company === 'string'
      ? userCompanyInfo.company
      : userCompanyInfo?.company?.name;

    if (companyFromUser && String(companyFromUser).trim()) {
      return String(companyFromUser).trim();
    }

    return null;
  }, [availableCompanies, selectedCompanyId, selectedCompanyLabel, user]);

  // Memoize expensive calculations
  const roleInfo = React.useMemo(() =>
    user ? PermissionManager.getRoleDisplayInfo(user.role) : null,
    [user]
  );

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-click

    const toastId = 'logout-toast';
    let redirectPath = '/login';
    let shouldRedirect = true;

    try {
      setIsLoggingOut(true);

      // Show loading state
      toast.loading(t('messages.logoutLoading'), { id: toastId });

      // Perform logout using the unified auth service
      await logout();

      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success(t('messages.logoutSuccess') || 'Logout berhasil');

    } catch (error) {
      console.error('Logout error:', error);
      toast.dismiss(toastId);
      toast.error(t('messages.logoutError'));

      // Fallback: manual logout in case of error
      try {
        const { logoutRedirectService } = await import('@/lib/auth/logout-redirect-service');
        await logoutRedirectService.emergencyLogout();
        shouldRedirect = false; // emergencyLogout performs its own redirect
      } catch (redirectError) {
        console.error('Emergency logout error:', redirectError);
        redirectPath = '/login?reason=user_initiated';
      }
    } finally {
      setIsLoggingOut(false);
      // Use Next.js app router (non-i18n) to avoid locale prefix without full page reload.
      if (shouldRedirect) {
        appRouter.replace(redirectPath);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(t('messages.refreshSuccess'));
      window.location.reload();
    } catch {
      toast.error(t('messages.refreshError'));
    } finally {
      setIsRefreshing(false);
    }
  };


  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const [currentTime, setCurrentTime] = React.useState(getCurrentTime());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  return (
    <>
      <motion.header
        className="sticky top-0 z-30 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-md dark:bg-background/90"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex min-h-16 items-center justify-end gap-3 px-4 py-2 sm:px-6 lg:px-8">
          {/* Right side */}
          <div className="flex min-w-0 items-center gap-2">
            {/* Global company scope (Area Manager multi-company) */}
            {isAreaManager && isMultiCompany && (
              <div className="hidden xl:flex min-w-0 items-center gap-2 rounded-full border border-border/80 bg-background px-2 py-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-7 w-[170px] xl:w-[210px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                    <SelectValue placeholder="Pilih perusahaan aktif" />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[240px]">
                    <SelectItem value={ALL_COMPANIES_SCOPE}>Semua Perusahaan</SelectItem>
                    {availableCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Read-only company context for Manager / Company Admin */}
            {isLockedSingleCompanyRole && readOnlyCompanyLabel && (
              <div className="hidden xl:flex min-w-0 items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                  {readOnlyCompanyLabel}
                </span>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            )}

            {/* Connection status */}
            <motion.div
              className={cn(
                "hidden sm:flex shrink-0 items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border",
                isOnline
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{isOnline ? t('status.online') : t('status.offline')}</span>
            </motion.div>

            {/* Time */}
            <div className="hidden shrink-0 items-center rounded-full border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground lg:flex">
              {currentTime}
            </div>

            {/* Language Switcher */}
            <TopbarLanguageSwitcher />

            {/* Fullscreen toggle */}
            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleFullscreen}
                className="hidden shrink-0 lg:flex"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shrink-0"
              title={t('buttons.refresh')}
            >
              <RefreshCw className={cn(
                "h-4 w-4 transition-transform duration-200",
                isRefreshing && "animate-spin"
              )} />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative shrink-0",
                showNotifications && "bg-accent text-accent-foreground"
              )}
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-[20px] rounded-full px-1 flex items-center justify-center text-xs font-semibold"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                </motion.div>
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-10 shrink-0 items-center space-x-3 rounded-xl px-3 transition-colors duration-200"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-foreground truncate max-w-32">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {roleInfo?.label}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-80 p-4 bg-background/95 backdrop-blur-md border shadow-xl rounded-xl"
              >
                {/* User info header */}
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border mb-3">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <Badge variant="secondary" className="mt-1 text-xs font-medium">
                      {roleInfo?.label}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/profile')}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('labels.myProfile')}</p>
                      <p className="text-xs text-muted-foreground">Kelola informasi profil</p>
                    </div>
                  </DropdownMenuItem>

                  {canPerformAction('manage_users') && (
                    <DropdownMenuItem
                      onClick={() => router.push('/settings')}
                      className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t('labels.settings')}</p>
                        <p className="text-xs text-muted-foreground">Konfigurasi sistem</p>
                      </div>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('labels.help')}</p>
                      <p className="text-xs text-muted-foreground">Panduan penggunaan</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-3" />

                {/* Theme selector */}
                <DropdownMenuGroup>
                  {/* Mode selector (Light/Dark/System) */}
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                    Mode
                  </DropdownMenuLabel>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg mb-3">
                    {[
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'dark', icon: Moon, label: 'Dark' },
                      { value: 'system', icon: Monitor, label: 'System' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                        className={cn(
                          "flex flex-col items-center space-y-1 px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200",
                          mode === option.value
                            ? "bg-background text-foreground shadow-sm border"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Color scheme picker */}
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mt-2">
                    Tema Warna
                  </DropdownMenuLabel>
                  <div className="space-y-1 px-1 pb-1">
                    {getThemeList().map((theme) => {
                      const isSelected = colorScheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setColorScheme(theme.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            isSelected
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted border border-transparent"
                          )}
                        >
                          {/* Color preview swatches */}
                          <div className="flex gap-1 shrink-0">
                            <div
                              className="w-4 h-4 rounded-full border border-border shadow-sm"
                              style={{ backgroundColor: theme.preview.primary }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border shadow-sm"
                              style={{ backgroundColor: theme.preview.accent }}
                            />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{theme.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                    isLoggingOut && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isLoggingOut ? 'Keluar...' : t('buttons.logout')}
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-400">
                      {isLoggingOut ? 'Mohon tunggu...' : 'Keluar dari sistem'}
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Custom actions */}
            {actions}
          </div>
        </div>
      </motion.header>

      {/* Notification center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
