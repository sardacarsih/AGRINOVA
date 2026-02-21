'use client';

import { Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

export default function EstatesPage() {
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

  const EstatesPageComponent = getPageComponent('estates', user.role);

  if (!EstatesPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied role={user.role} path="/estates" />
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
        <EstatesPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}

