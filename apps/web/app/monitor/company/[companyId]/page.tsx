'use client';

import React from 'react';
import { use } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { AlertTriangle } from 'lucide-react';
import { AreaManagerCompanyMonitorDetail } from '@/features/area-manager-dashboard/components/AreaManagerCompanyMonitorDetail';

type CompanyMonitorDetailPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default function CompanyMonitorDetailPage({ params }: CompanyMonitorDetailPageProps) {
  const { companyId: rawCompanyId } = use(params);
  const companyId = React.useMemo(() => {
    const value = rawCompanyId || '';
    try {
      return decodeURIComponent(value).trim();
    } catch {
      return value.trim();
    }
  }, [rawCompanyId]);

  return (
    <ProtectedRoute
      allowedRoles={['AREA_MANAGER']}
      requireCleanURLAccess={false}
      fallbackPath="/login"
    >
      {!companyId ? (
        <AreaManagerDashboardLayout
          title="Detail Monitor Perusahaan"
          description="ID perusahaan tidak valid"
          showBreadcrumb={false}
        >
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Parameter companyId tidak valid.</AlertDescription>
          </Alert>
        </AreaManagerDashboardLayout>
      ) : (
        <AreaManagerCompanyMonitorDetail companyId={companyId} />
      )}
    </ProtectedRoute>
  );
}
