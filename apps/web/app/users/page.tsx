'use client';

import { Suspense, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

// Users page that renders completely different UI based on user role
// Each role gets a unique users page interface and functionality
export default function UsersPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const isUnauthorized = !isAuthenticated || !user;

  useEffect(() => {
    if (!isLoading && isUnauthorized) {
      router.replace('/login');
    }
  }, [isLoading, isUnauthorized, router]);

  // Show loading state while auth is loading
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect to login if not authenticated
  if (isUnauthorized) {
    return <PageLoading />;
  }

  // Manager and Area Manager are no longer allowed to access /users directly
  if (user.role === 'MANAGER' || user.role === 'AREA_MANAGER') {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied
          role={user.role}
          path="/users"
        />
      </ProtectedRoute>
    );
  }

  // Get the appropriate users page component for this role
  const UsersPageComponent = getPageComponent('users', user.role);

  if (!UsersPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied
          role={user.role}
          path="/users"
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
        <UsersPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}
