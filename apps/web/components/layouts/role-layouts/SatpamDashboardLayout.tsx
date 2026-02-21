'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { RoleLayoutContent } from './RoleLayoutContent';
import {
  SidebarProvider,
  SidebarInset
} from '@/components/ui/layout-shell';

interface SatpamDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function SatpamDashboardLayout({
  children,
  title = 'Dashboard Satpam',
  description = 'Pemeriksaan gerbang dan pemantauan keamanan',
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: SatpamDashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-satpam');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'SATPAM';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const defaultBreadcrumbs = [
    { label: 'Dasbor', href: '/dashboard' },
    { label: 'Satpam' }
  ];

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen>
      <UnifiedSidebar
        userRole={normalizedUserRole}
        userName={user.name || user.username}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />
      <SidebarInset>
        <Topbar
          title={title}
          description={description}
          breadcrumbItems={showBreadcrumb ? [...defaultBreadcrumbs, ...breadcrumbItems] : []}
          actions={actions}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
        <RoleLayoutContent
          statusLabel="Sistem Keamanan: Aktif"
          statusVariant="error"
          orbPrimaryClass="bg-rose-500/12"
          orbSecondaryClass="bg-red-500/10"
          dotClass="bg-status-error"
        >
          {children}
        </RoleLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}
