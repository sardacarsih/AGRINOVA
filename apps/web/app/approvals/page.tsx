'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApprovalsDashboard } from '@/features/approvals/components/ApprovalsDashboard';

export default function ApprovalsPage() {
  return (
    <ProtectedRoute
      allowedRoles={['MANDOR', 'ASISTEN', 'MANAGER']}
      fallbackPath="/login"
    >
      <ApprovalsDashboard />
    </ProtectedRoute>
  );
}