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

interface AsistenDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function AsistenDashboardLayout({
  children,
  title = 'Asisten Dashboard',
  description = 'Harvest approval and monitoring',
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
}: AsistenDashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-asisten');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'ASISTEN';
  const companyName = React.useMemo(() => {
    const userCandidate = user as {
      company?: { name?: string } | string;
      companies?: Array<{ name?: string } | string>;
      assignedCompanyNames?: string[];
    } | null;

    if (!userCandidate) return undefined;

    if (typeof userCandidate.company === 'string' && userCandidate.company.trim()) {
      return userCandidate.company.trim();
    }

    if (
      userCandidate.company &&
      typeof userCandidate.company === 'object' &&
      typeof userCandidate.company.name === 'string' &&
      userCandidate.company.name.trim()
    ) {
      return userCandidate.company.name.trim();
    }

    const firstCompany = userCandidate.companies?.[0];
    if (typeof firstCompany === 'string' && firstCompany.trim()) {
      return firstCompany.trim();
    }

    if (
      firstCompany &&
      typeof firstCompany === 'object' &&
      typeof firstCompany.name === 'string' &&
      firstCompany.name.trim()
    ) {
      return firstCompany.name.trim();
    }

    const firstAssignedCompanyName = userCandidate.assignedCompanyNames?.[0];
    if (typeof firstAssignedCompanyName === 'string' && firstAssignedCompanyName.trim()) {
      return firstAssignedCompanyName.trim();
    }

    return undefined;
  }, [user]);

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
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Asisten' }
  ];

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen>
      <UnifiedSidebar
        userRole={normalizedUserRole}
        userName={user.name || user.username}
        companyName={companyName}
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
          statusLabel="Approval System: Active"
          statusVariant="pending"
          orbPrimaryClass="bg-blue-500/12"
          orbSecondaryClass="bg-cyan-500/10"
          dotClass="bg-status-info"
        >
          {children}
        </RoleLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}
