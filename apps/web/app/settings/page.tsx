'use client';

import { Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPageComponent } from '@/components/role-adapters/PageAdapter';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoading } from '@/components/ui/page-loading';
import { AccessDenied } from '@/components/auth/access-denied';

// Settings page that renders completely different UI based on user role
// Each role gets a unique settings page interface and functionality
export default function SettingsPage() {
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

  // Get the appropriate settings page component for this role
  const SettingsPageComponent = getPageComponent('settings', user.role);

  if (!SettingsPageComponent) {
    return (
      <ProtectedRoute show403Page={true}>
        <AccessDenied
          role={user.role}
          path="/settings"
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
        <SettingsPageComponent user={user} locale={locale} />
      </Suspense>
    </ProtectedRoute>
  );
}
