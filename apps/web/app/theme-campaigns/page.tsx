'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { ThemeCampaignDashboard } from '@/features/theme-campaigns/components/theme-campaign-dashboard';

export default function ThemeCampaignsPage() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallbackPath="/dashboard">
      <SuperAdminDashboardLayout
        title="Manajemen Theme Campaign"
        description="Kontrol tema kampanye musiman untuk operasi runtime SUPER_ADMIN"
        breadcrumbItems={[
          { label: 'Operasi Sistem', href: '/rbac-management' },
          { label: 'Manajemen Theme Campaign', href: '/theme-campaigns' },
        ]}
      >
        <ThemeCampaignDashboard />
      </SuperAdminDashboardLayout>
    </ProtectedRoute>
  );
}
