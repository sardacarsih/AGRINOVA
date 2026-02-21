'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { HarvestDashboard } from '@/features/harvest/components/HarvestDashboard';

export default function HarvestPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANDOR', 'ASISTEN', 'MANAGER']}
      fallbackPath="/login"
    >
      <HarvestDashboard />
    </ProtectedRoute>
  );
}
