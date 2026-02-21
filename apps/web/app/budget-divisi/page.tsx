'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import ManagerDivisionProductionBudgetPage from '@/features/manager-dashboard/components/ManagerDivisionProductionBudgetPage';

export default function BudgetDivisiPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANAGER']}
      fallbackPath="/login"
    >
      <ManagerDivisionProductionBudgetPage />
    </ProtectedRoute>
  );
}
