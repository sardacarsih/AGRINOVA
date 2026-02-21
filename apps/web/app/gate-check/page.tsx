'use client';

import { Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

// Gate Check page that renders completely different UI based on user role
// Each role gets a unique gate check page interface and functionality
export default function GateCheckPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  // Show loading state while auth is loading
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    router.push('/login');
    return <PageLoading />;
  }

  // Get the appropriate gate check page component for this role
  const GateCheckPageComponent = getPageComponent('gate-check', user.role);

  if (!GateCheckPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied
          role={user.role}
          path="/gate-check"
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
        <GateCheckPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}