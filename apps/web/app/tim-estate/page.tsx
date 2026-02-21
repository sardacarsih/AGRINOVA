'use client';

import React from 'react';
import { Filter, Search } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { ManagerEstateTeamMonitor } from '@/features/harvest/components/ManagerEstateTeamMonitor';
import { Button } from '@/components/ui/button';

export default function TimEstatePage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANAGER']}
      fallbackPath="/login"
    >
      <ManagerDashboardLayout
        title="Tim Estate"
        description="Pantau performa anggota tim estate secara real-time"
        showBreadcrumb={false}
        actions={(
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Cari tim">
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Filter tim">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        )}
      >
        <ManagerEstateTeamMonitor />
      </ManagerDashboardLayout>
    </ProtectedRoute>
  );
}
