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

interface CompanyAdminDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  contentMaxWidthClass?: string;
  contentPaddingClass?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function CompanyAdminDashboardLayout({
  children,
  title = 'Company Admin Dashboard',
  description = 'Complete company management and administration',
  actions,
  contentMaxWidthClass = 'max-w-7xl',
  contentPaddingClass = 'p-4 sm:p-6 lg:p-8',
  showBreadcrumb = true,
  breadcrumbItems = [],
}: CompanyAdminDashboardLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-company-admin');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'COMPANY_ADMIN';
  const companyName = React.useMemo(() => {
    const userCandidate = user as {
      company?: { name?: string } | string;
      companies?: Array<{ name?: string } | string>;
    } | null;

    if (!userCandidate) return 'Agrinova';

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

    if (firstCompany && typeof firstCompany === 'object' && typeof firstCompany.name === 'string' && firstCompany.name.trim()) {
      return firstCompany.name.trim();
    }

    return 'Agrinova';
  }, [user]);

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

  // Default breadcrumbs for Company Admin
  const defaultBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Company Admin' }
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
          statusLabel="Company System: Active"
          statusVariant="info"
          orbPrimaryClass="bg-orange-500/12"
          orbSecondaryClass="bg-emerald-500/10"
          dotClass="bg-status-info"
          maxWidthClass={contentMaxWidthClass}
          contentPaddingClass={contentPaddingClass}
        >
          {children}
        </RoleLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}
