'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DEFAULT_DASHBOARD_PATHS } from '@/types/auth';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const dashboardPath = user ? DEFAULT_DASHBOARD_PATHS[user.role] : '/';

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING']}>
      <DashboardLayout
        title="Profil Saya"
        description="Kelola informasi profil dan preferensi akun Anda"
        breadcrumbItems={[
          { label: 'Dashboard', href: dashboardPath },
          { label: 'Profil Saya' }
        ]}
      >
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
