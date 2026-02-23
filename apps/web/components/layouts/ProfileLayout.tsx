'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { Topbar } from '@/components/layout/topbar';
import {
  SidebarProvider,
  SidebarInset
} from '@/components/ui/layout-shell';

// Import unified sidebar
import { UnifiedSidebar } from '@/components/dashboard/unified-sidebar';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarCollapse('profile-layout');
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

  if (!user) return null;

  const normalizedUserRole = user?.role?.toString().trim().toUpperCase().replace(/[\s-]+/g, '_') || 'SUPER_ADMIN';

  // Get role-specific breadcrumbs
  const getBreadcrumbs = () => {
    const baseBreadcrumbs = [
      { label: 'Dashboard', href: '/dashboard' }
    ];

    switch (user.role) {
      case 'SUPER_ADMIN':
        return [...baseBreadcrumbs, { label: 'Super Admin' }, { label: 'Profile' }];
      case 'COMPANY_ADMIN':
        return [...baseBreadcrumbs, { label: 'Company Admin' }, { label: 'Profile' }];
      case 'AREA_MANAGER':
        return [...baseBreadcrumbs, { label: 'Area Manager' }, { label: 'Profile' }];
      case 'MANAGER':
        return [...baseBreadcrumbs, { label: 'Manager' }, { label: 'Profile' }];
      case 'ASISTEN':
        return [...baseBreadcrumbs, { label: 'Asisten' }, { label: 'Profile' }];
      case 'MANDOR':
        return [...baseBreadcrumbs, { label: 'Mandor' }, { label: 'Profile' }];
      case 'SATPAM':
        return [...baseBreadcrumbs, { label: 'Satpam' }, { label: 'Profile' }];
      case 'TIMBANGAN':
        return [...baseBreadcrumbs, { label: 'Timbangan' }, { label: 'Profile' }];
      case 'GRADING':
        return [...baseBreadcrumbs, { label: 'Grading' }, { label: 'Profile' }];
      default:
        return [...baseBreadcrumbs, { label: 'Profile' }];
    }
  };

  // Get role-specific background gradient
  const getRoleBackground = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30';
      case 'COMPANY_ADMIN':
        return 'bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/30';
      case 'AREA_MANAGER':
        return 'bg-gradient-to-br from-green-50/30 via-emerald-50/20 to-teal-50/30 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30';
      case 'MANAGER':
        return 'bg-gradient-to-br from-purple-50/30 via-violet-50/20 to-indigo-50/30 dark:from-purple-950/30 dark:via-violet-950/20 dark:to-indigo-950/30';
      case 'ASISTEN':
        return 'bg-gradient-to-br from-cyan-50/30 via-sky-50/20 to-blue-50/30 dark:from-cyan-950/30 dark:via-sky-950/20 dark:to-blue-950/30';
      case 'MANDOR':
        return 'bg-gradient-to-br from-green-50/30 via-lime-50/20 to-emerald-50/30 dark:from-green-950/30 dark:via-lime-950/20 dark:to-emerald-950/30';
      case 'SATPAM':
        return 'bg-gradient-to-br from-red-50/30 via-rose-50/20 to-pink-50/30 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/30';
      case 'TIMBANGAN':
        return 'bg-gradient-to-br from-cyan-50/30 via-teal-50/20 to-sky-50/30 dark:from-cyan-950/30 dark:via-teal-950/20 dark:to-sky-950/30';
      case 'GRADING':
        return 'bg-gradient-to-br from-fuchsia-50/30 via-rose-50/20 to-pink-50/30 dark:from-fuchsia-950/30 dark:via-rose-950/20 dark:to-pink-950/30';
      default:
        return 'bg-gradient-to-br from-slate-50/30 via-gray-50/20 to-zinc-50/30 dark:from-slate-950/30 dark:via-gray-950/20 dark:to-zinc-950/30';
    }
  };

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
          title="Profil Saya"
          description="Kelola informasi profil dan preferensi akun Anda"
          breadcrumbItems={getBreadcrumbs()}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Main content area with role-specific styling */}
        <motion.main
          className={`flex-1 overflow-auto ${getRoleBackground()} min-h-screen`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  );
}
