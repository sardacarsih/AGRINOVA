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

interface SuperAdminDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function SuperAdminDashboardLayout({
  children,
  title = 'Dashboard Super Admin',
  description = 'Kontrol dan pemantauan sistem lengkap',
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: SuperAdminDashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-super-admin');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'SUPER_ADMIN';

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

  // Default breadcrumbs for Super Admin
  const defaultBreadcrumbs = [
    { label: 'Dasbor', href: '/' },
    { label: 'Super Admin' }
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
        {/* Top navigation */}
        <Topbar
          title={title}
          description={description}
          breadcrumbItems={showBreadcrumb ? [...defaultBreadcrumbs, ...breadcrumbItems] : []}
          actions={actions}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
        <RoleLayoutContent
          statusLabel="Status Sistem: Beroperasi Normal"
          statusVariant="success"
          orbPrimaryClass="bg-blue-500/10"
          orbSecondaryClass="bg-indigo-500/10"
          dotClass="bg-status-success"
        >
          {children}
        </RoleLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}
