'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { PerawatanDashboard } from '@/features/perawatan/components/PerawatanDashboard';

export default function PerawatanPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANDOR']}
      allowedMandorTypes={['PERAWATAN']}
      fallbackPath="/login"
    >
      <PerawatanDashboard />
    </ProtectedRoute>
  );
}
