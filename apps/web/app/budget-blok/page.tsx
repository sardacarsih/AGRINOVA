'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import ManagerBlockProductionBudgetPage from '@/features/manager-dashboard/components/ManagerBlockProductionBudgetPage';

export default function BudgetBlokPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANAGER', 'ASISTEN', 'MANDOR']}
      fallbackPath="/login"
    >
      <ManagerBlockProductionBudgetPage />
    </ProtectedRoute>
  );
}
