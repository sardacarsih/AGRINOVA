'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import CompanyAdminBlockEditorPage from '@/features/master-data/components/CompanyAdminBlockEditorPage';

interface EditBlockPageProps {
  params: Promise<{ id: string }>;
}

export default function EditBlockPage({ params }: EditBlockPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute
      allowedRoles={['COMPANY_ADMIN']}
      requireCleanURLAccess={false}
      show403Page={true}
    >
      <CompanyAdminBlockEditorPage mode="edit" blockId={id} />
    </ProtectedRoute>
  );
}
