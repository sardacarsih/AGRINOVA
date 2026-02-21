'use client';

import { Suspense, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

// Reports page that renders completely different UI based on user role
// Each role gets a unique reports page interface and functionality
export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, user]);

  // Show loading state while auth is loading
  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated || !user) {
    return <PageLoading />;
  }

  // Get the appropriate reports page component for this role
  const ReportsPageComponent = getPageComponent('reports', user.role);

  if (!ReportsPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied
          role={user.role}
          path="/reports"
        />
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
        <ReportsPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}
