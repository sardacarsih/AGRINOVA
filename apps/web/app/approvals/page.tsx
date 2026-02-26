'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApprovalsDashboard } from '@/features/approvals/components/ApprovalsDashboard';

export default function ApprovalsPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANDOR', 'ASISTEN', 'MANAGER']}
      requireCleanURLAccess={false}
      fallbackPath="/login"
    >
      <ApprovalsDashboard />
    </ProtectedRoute>
  );
}
