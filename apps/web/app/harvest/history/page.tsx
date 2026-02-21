'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { HarvestDashboard } from '@/features/harvest/components/HarvestDashboard';

export default function HarvestHistoryPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANDOR', 'ASISTEN', 'MANAGER']}
      fallbackPath="/login"
    >
      <HarvestDashboard historyMode />
    </ProtectedRoute>
  );
}
