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

interface MandorDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  maxWidthClass?: string;
  contentPaddingClass?: string;
}

export function MandorDashboardLayout({
  children,
  title = 'Dashboard Mandor',
  description = 'Pantau tim dan record hasil sinkronisasi mobile',
  actions,
  showBreadcrumb = true,
  breadcrumbItems = [],
  maxWidthClass = 'max-w-6xl',
  contentPaddingClass,
}: MandorDashboardLayoutProps) {
  // CRITICAL FIX: All hooks must be called unconditionally at the top level
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('role-mandor');
  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'MANDOR';
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

    if (firstCompany && typeof firstCompany === 'object' && typeof firstCompany.name === 'string' && firstCompany.name.trim()) {
      return firstCompany.name.trim();
    }

    const firstAssignedCompanyName = userCandidate.assignedCompanyNames?.[0];
    if (typeof firstAssignedCompanyName === 'string' && firstAssignedCompanyName.trim()) {
      return firstAssignedCompanyName.trim();
    }

    return undefined;
  }, [user]);

  // Handle fullscreen toggle
  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Default breadcrumbs for Mandor
  const defaultBreadcrumbs = React.useMemo(() => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Mandor' }
  ], []);

  // CRITICAL FIX: Use conditional rendering instead of early return
  // This ensures all hooks are always called in the same order
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

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
          statusLabel="Operasional Lapangan: Aktif"
          statusVariant="success"
          orbPrimaryClass="bg-emerald-500/12"
          orbSecondaryClass="bg-lime-500/10"
          dotClass="bg-status-success"
          maxWidthClass={maxWidthClass}
          contentPaddingClass={contentPaddingClass}
          showDate
        >
          {children}
        </RoleLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}
