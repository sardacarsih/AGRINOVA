'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import CompanyAdminBlockEditorPage from '@/features/master-data/components/CompanyAdminBlockEditorPage';

export default function NewBlockPage() {
  return (
    <ProtectedRoute
      allowedRoles={['COMPANY_ADMIN']}
      requireCleanURLAccess={false}
      show403Page={true}
    >
      <CompanyAdminBlockEditorPage mode="create" />
    </ProtectedRoute>
  );
}
