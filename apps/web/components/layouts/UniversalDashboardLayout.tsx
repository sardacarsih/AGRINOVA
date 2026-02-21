'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from '@/components/layout/topbar';
import {
  SidebarProvider,
  SidebarInset
} from '@/components/ui/layout-shell';
import { getRoleNavigationConfig } from '@/lib/navigation/role-navigation-config';
import { cn } from '@/lib/utils';

interface UniversalDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

// Role-specific background gradients
const ROLE_BACKGROUNDS = {
  SUPER_ADMIN: 'bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-blue-50/30 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/30',
  COMPANY_ADMIN: 'bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/30',
  AREA_MANAGER: 'bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30',
  MANAGER: 'bg-gradient-to-br from-indigo-50/30 via-blue-50/20 to-cyan-50/30 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-cyan-950/30',
  ASISTEN: 'bg-gradient-to-br from-yellow-50/30 via-amber-50/20 to-orange-50/30 dark:from-yellow-950/30 dark:via-amber-950/20 dark:to-orange-950/30',
  MANDOR: 'bg-gradient-to-br from-green-50/30 via-emerald-50/20 to-teal-50/30 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30',
  SATPAM: 'bg-gradient-to-br from-gray-50/30 via-slate-50/20 to-zinc-50/30 dark:from-gray-950/30 dark:via-slate-950/20 dark:to-zinc-950/30',
};

// Role-specific status indicators
const ROLE_STATUS_INDICATORS = {
  SUPER_ADMIN: {
    color: 'purple',
    metrics: [
      { label: 'System Status', value: 'Active', color: 'green' },
      { label: 'Total Companies', value: '12', color: 'blue' },
      { label: 'Active Users', value: '245', color: 'indigo' },
    ]
  },
  COMPANY_ADMIN: {
    color: 'orange',
    metrics: [
      { label: 'Company Status', value: 'Active', color: 'green' },
      { label: 'Estates', value: '8', color: 'blue' },
      { label: 'Employees', value: '156', color: 'indigo' },
    ]
  },
  AREA_MANAGER: {
    color: 'blue',
    metrics: [
      { label: 'Regional Status', value: 'Active', color: 'green' },
      { label: 'Companies', value: '5', color: 'blue' },
      { label: 'Performance', value: '92%', color: 'emerald' },
    ]
  },
  MANAGER: {
    color: 'indigo',
    metrics: [
      { label: 'Estate Status', value: 'Active', color: 'green' },
      { label: 'Divisions', value: '6', color: 'blue' },
      { label: 'Efficiency', value: '89%', color: 'emerald' },
    ]
  },
  ASISTEN: {
    color: 'yellow',
    metrics: [
      { label: 'Division Status', value: 'Active', color: 'green' },
      { label: 'Pending Approvals', value: '15', color: 'red' },
      { label: 'Today\'s Progress', value: '92%', color: 'emerald' },
    ]
  },
  MANDOR: {
    color: 'green',
    metrics: [
      { label: 'Weather', value: 'Sunny', color: 'green' },
      { label: 'Team Present', value: '15/17', color: 'blue' },
      { label: 'Target Progress', value: '99%', color: 'emerald' },
    ]
  },
  SATPAM: {
    color: 'gray',
    metrics: [
      { label: 'Security Status', value: 'Active', color: 'green' },
      { label: 'Vehicles Today', value: '42', color: 'blue' },
      { label: 'Incidents', value: '0', color: 'green' },
    ]
  },
};

export function UniversalDashboardLayout({
  children,
  title,
  description,
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: UniversalDashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  if (!user) return null;

  const navigationConfig = getRoleNavigationConfig(user.role);
  const roleStatusConfig = ROLE_STATUS_INDICATORS[user.role];
  const backgroundClass = ROLE_BACKGROUNDS[user.role];

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Default breadcrumbs based on role
  const getDefaultBreadcrumbs = () => {
    const defaultBreadcrumbs = [
      { label: 'Dashboard', href: '/' },
      { label: navigationConfig.role }
    ];
    return defaultBreadcrumbs;
  };

  // Dynamic title and description based on role if not provided
  const dynamicTitle = title || `Dashboard ${navigationConfig.role}`;
  const dynamicDescription = description || navigationConfig.statusText;

  return (
    <SidebarProvider defaultOpen>
      <UnifiedSidebar
        userRole={user.role}
        userName={user.name || user.username || user.email || 'User'}
      />
      <SidebarInset>
        {/* Top navigation */}
        <Topbar
          title={dynamicTitle}
          description={dynamicDescription}
          breadcrumbItems={showBreadcrumb ? [...getDefaultBreadcrumbs(), ...breadcrumbItems] : []}
          actions={actions}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Main content area with role-specific styling */}
        <motion.main
          className={cn(
            "flex-1 overflow-auto min-h-screen",
            backgroundClass
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Role-specific styling wrapper */}
            <div className="space-y-6">
              {/* Role-specific status indicators */}
              <div className="hidden lg:flex items-center justify-end">
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  {roleStatusConfig.metrics.map((metric, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          metric.color === 'green' && "bg-green-500",
                          metric.color === 'blue' && "bg-blue-500",
                          metric.color === 'red' && "bg-red-500",
                          metric.color === 'emerald' && "bg-emerald-500",
                          metric.color === 'indigo' && "bg-indigo-500",
                          metric.color === 'yellow' && "bg-yellow-500",
                          metric.color === 'orange' && "bg-orange-500",
                          metric.color === 'purple' && "bg-purple-500",
                          metric.color === 'gray' && "bg-gray-500"
                        )}
                      />
                      <span>{metric.label}: {metric.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full" />
                    <span>{new Date().toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>

              {children}
            </div>
          </div>
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  );
}
