'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AreaManagerCompanyMonitorDetail } from '@/features/area-manager-dashboard/components/AreaManagerCompanyMonitorDetail';

type CompanyMonitorDetailPageProps = {
  params: {
    companyId: string;
  };
};

export default function CompanyMonitorDetailPage({ params }: CompanyMonitorDetailPageProps) {
  const companyId = decodeURIComponent(params.companyId || '').trim();

  return (
    <ProtectedRoute
      allowedRoles={['AREA_MANAGER']}
      requireCleanURLAccess={false}
      fallbackPath="/login"
    >
      <AreaManagerCompanyMonitorDetail companyId={companyId} />
    </ProtectedRoute>
  );
}
