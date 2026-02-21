'use client';

import { Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

export default function DivisionsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return <PageLoading />;
  }

  const DivisionsPageComponent = getPageComponent('divisions', user.role);

  if (!DivisionsPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied role={user.role} path="/divisions" />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute
      allowedRoles={[user.role]}
      requireCleanURLAccess={true}
      show403Page={true}
    >
      <Suspense fallback={<PageLoading />}>
        <DivisionsPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}

