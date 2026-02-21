'use client';

import React from 'react';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { SuperAdminDashboard as RealSuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';

function SuperAdminDashboard(_props: RoleDashboardProps) {
  return (
    <SuperAdminDashboardLayout>
      <RealSuperAdminDashboard />
    </SuperAdminDashboardLayout>
  );
}

export default SuperAdminDashboard;
