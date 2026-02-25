'use client';

import React from 'react';
import { Filter, Search } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { AsistenDashboardLayout } from '@/components/layouts/role-layouts/AsistenDashboardLayout';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { ManagerEstateTeamMonitor } from '@/features/harvest/components/ManagerEstateTeamMonitor';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

type TimEstateAllowedRole = 'ASISTEN' | 'MANAGER' | 'AREA_MANAGER';

const normalizeRole = (role?: string): TimEstateAllowedRole => {
  const normalized = (role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'ASISTEN' || normalized === 'MANAGER' || normalized === 'AREA_MANAGER') {
    return normalized;
  }
  return 'MANAGER';
};

function TimEstateRoleLayout({ children, actions }: { children: React.ReactNode; actions: React.ReactNode }) {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);

  if (currentRole === 'ASISTEN') {
    return (
      <AsistenDashboardLayout
        title="Tim Estate"
        description="Pantau performa tim mandor dan pemanen sesuai area kerja Anda"
        showBreadcrumb={false}
        actions={actions}
      >
        {children}
      </AsistenDashboardLayout>
    );
  }

  if (currentRole === 'AREA_MANAGER') {
    return (
      <AreaManagerDashboardLayout
        title="Tim Estate"
        description="Pantau performa tim lintas estate berdasarkan scope perusahaan"
        showBreadcrumb={false}
        actions={actions}
      >
        {children}
      </AreaManagerDashboardLayout>
    );
  }

  return (
    <ManagerDashboardLayout
      title="Tim Estate"
      description="Pantau performa anggota tim estate secara real-time"
      showBreadcrumb={false}
      actions={actions}
    >
      {children}
    </ManagerDashboardLayout>
  );
}

export default function TimEstatePage() {
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" aria-label="Cari tim">
        <Search className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="Filter tim">
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <ProtectedRoute
      allowedRoles={['ASISTEN', 'MANAGER', 'AREA_MANAGER']}
      fallbackPath="/login"
    >
      <TimEstateRoleLayout actions={headerActions}>
        <ManagerEstateTeamMonitor />
      </TimEstateRoleLayout>
    </ProtectedRoute>
  );
}
