'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { RoleLayoutContent } from './RoleLayoutContent';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import {
  SidebarProvider,
  SidebarInset
} from '@/components/ui/layout-shell';

interface AreaManagerDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  contentMaxWidthClass?: string;
  contentPaddingClass?: string;
}

export function AreaManagerDashboardLayout({
  children,
  title = 'Area Manager Dashboard',
  description = 'Multi-company oversight and regional management',
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
  contentMaxWidthClass,
  contentPaddingClass,
}: AreaManagerDashboardLayoutProps) {
  const { user } = useAuth();
  const {
    isAreaManager: isAreaManagerScope,
    isMultiCompany,
    availableCompanies,
    selectedCompanyId,
    selectedCompanyLabel,
  } = useCompanyScope();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-area-manager');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'AREA_MANAGER';
  const companyName = React.useMemo(() => {
    if (!isAreaManagerScope) return undefined;
    if (selectedCompanyId === ALL_COMPANIES_SCOPE && isMultiCompany) {
      return `${availableCompanies.length} Perusahaan`;
    }
    return selectedCompanyLabel;
  }, [availableCompanies.length, isAreaManagerScope, isMultiCompany, selectedCompanyId, selectedCompanyLabel]);

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

  // Default breadcrumbs for Area Manager
  const defaultBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Area Manager' }
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
          statusLabel="Regional System: Active"
          statusVariant="pending"
          orbPrimaryClass="bg-violet-500/12"
          orbSecondaryClass="bg-blue-500/10"
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
