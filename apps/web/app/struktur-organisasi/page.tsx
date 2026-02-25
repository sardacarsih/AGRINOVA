'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { useAuth } from '@/hooks/use-auth';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { AsistenDashboardLayout } from '@/components/layouts/role-layouts/AsistenDashboardLayout';
import { ManagerIdOrgStructure } from '@/components/dashboard/manager-id-org-structure';

type SupportedRole = 'AREA_MANAGER' | 'MANAGER' | 'ASISTEN';

const normalizeRole = (role: unknown): SupportedRole | null => {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'AREA_MANAGER') return 'AREA_MANAGER';
  if (normalized === 'MANAGER') return 'MANAGER';
  if (normalized === 'ASISTEN') return 'ASISTEN';
  return null;
};

function StrukturOrganisasiContent() {
  const { user, isLoading } = useAuth();
  const role = React.useMemo(() => normalizeRole(user?.role), [user?.role]);

  if (isLoading || !user) {
    return <PageLoading />;
  }

  if (!role) {
    return <PageLoading />;
  }

  const content = (
    <ManagerIdOrgStructure currentUserId={user.id} currentRole={role} />
  );

  if (role === 'AREA_MANAGER') {
    return (
      <AreaManagerDashboardLayout
        title="Struktur Organisasi"
        description="Relasi pelaporan berdasarkan manager_id"
        showBreadcrumb={false}
      >
        {content}
      </AreaManagerDashboardLayout>
    );
  }

  if (role === 'MANAGER') {
    return (
      <ManagerDashboardLayout
        title="Struktur Organisasi"
        description="Relasi pelaporan berdasarkan manager_id"
        showBreadcrumb={false}
      >
        {content}
      </ManagerDashboardLayout>
    );
  }

  return (
    <AsistenDashboardLayout
      title="Struktur Organisasi"
      description="Relasi pelaporan berdasarkan manager_id"
      showBreadcrumb={false}
    >
      {content}
    </AsistenDashboardLayout>
  );
}

export default function StrukturOrganisasiPage() {
  return (
    <ProtectedRoute
      allowedRoles={['AREA_MANAGER', 'MANAGER', 'ASISTEN']}
      fallbackPath="/login"
    >
      <StrukturOrganisasiContent />
    </ProtectedRoute>
  );
}
