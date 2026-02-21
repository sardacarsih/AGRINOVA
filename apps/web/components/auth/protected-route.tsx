'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PermissionManager } from '@/lib/auth/permissions';
import { ROLE_SPECIFIC_NAVIGATION, canRoleAccessPath } from '@/lib/constants/navigation';
import { UserRole } from '@/types/auth';
import { Loader2, AlertTriangle, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LOGOUT_IN_PROGRESS_KEY = 'agrinova_logout_in_progress';
const LOGOUT_MARKER_KEY = 'agrinova_logged_out';

const normalizeRuntimeRole = (role: unknown): UserRole | null => {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_') as UserRole;
  return normalized in ROLE_SPECIFIC_NAVIGATION ? normalized : null;
};

const isLogoutTransitionActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === 'true' ||
    sessionStorage.getItem(LOGOUT_MARKER_KEY) === 'true'
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  allowedRoles?: UserRole[];
  fallbackPath?: string;
  loadingComponent?: React.ComponentType;
  unauthorizedComponent?: React.ComponentType<{
    onRetry: () => void;
    message?: string;
    reason?: string;
    userRole?: UserRole;
  }>;
  // Enhanced props for clean URL architecture
  requireCleanURLAccess?: boolean; // Check if role can access this path via navigation
  show403Page?: boolean; // Show proper 403 page instead of redirect
  bypassRoleCheck?: boolean; // Skip role-based path access check
}

function DefaultLoadingComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-600">Memuat...</p>
      </div>
    </div>
  );
}

function DefaultUnauthorizedComponent({
  onRetry,
  message = 'Anda tidak memiliki akses untuk melihat halaman ini.',
  reason = 'access_denied',
  userRole
}: {
  onRetry: () => void;
  message?: string;
  reason?: string;
  userRole?: UserRole;
}) {
  const getUnauthorizedIcon = () => {
    switch (reason) {
      case 'role_not_allowed':
        return <Shield className="h-8 w-8 text-orange-600" />;
      case 'permission_missing':
        return <Lock className="h-8 w-8 text-red-600" />;
      case 'path_not_accessible':
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      case 'unauthenticated':
        return <Lock className="h-8 w-8 text-blue-600" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
    }
  };

  const getUnauthorizedTitle = () => {
    switch (reason) {
      case 'role_not_allowed':
        return 'Akses Role Ditolak';
      case 'permission_missing':
        return 'Izin Tidak Cukup';
      case 'path_not_accessible':
        return 'Halaman Tidak Tersedia';
      case 'unauthenticated':
        return 'Sesi Berakhir';
      default:
        return 'Akses Ditolak';
    }
  };

  const getUnauthorizedMessage = () => {
    if (message) return message;

    switch (reason) {
      case 'role_not_allowed':
        return `Role ${userRole} tidak diizinkan mengakses halaman ini.`;
      case 'permission_missing':
        return 'Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini.';
      case 'path_not_accessible':
        return 'Halaman ini tidak tersedia untuk role Anda.';
      case 'unauthenticated':
        return 'Sesi Anda telah berakhir. Silakan login kembali.';
      default:
        return 'Anda tidak memiliki akses untuk melihat halaman ini.';
    }
  };

  const getButtonLabel = () => {
    switch (reason) {
      case 'unauthenticated':
        return 'Login Kembali';
      default:
        return 'Kembali ke Dashboard';
    }
  };

  const getButtonAction = () => {
    switch (reason) {
      case 'unauthenticated':
        return () => window.location.href = '/login';
      default:
        return onRetry;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              {getUnauthorizedIcon()}
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            {getUnauthorizedTitle()}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {getUnauthorizedMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={getButtonAction()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {getButtonLabel()}
          </Button>

          {userRole && (
            <div className="text-center text-sm text-gray-500 bg-gray-50 rounded p-2">
              Role saat ini: <span className="font-medium text-gray-700">{userRole}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  allowedRoles = [],
  fallbackPath,
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  unauthorizedComponent: UnauthorizedComponent = DefaultUnauthorizedComponent,
  requireCleanURLAccess = true,
  show403Page = false,
  bypassRoleCheck = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  // All hooks must be called in the same order every time
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL FIX: Enhanced authentication check with proper session restoration timing
  React.useEffect(() => {
    console.log('ProtectedRoute: checking authentication state', { mounted, isLoading, isAuthenticated, userRole: user?.role });

    if (mounted && !isLoading && !isAuthenticated) {
      const logoutTransition = isLogoutTransitionActive();
      const redirectDelayMs = logoutTransition ? 0 : 2000;

      console.log('ProtectedRoute: Session validation complete - no valid session found');
      const redirectTimer = setTimeout(() => {
        console.log('ProtectedRoute: Executing redirect to login', {
          logoutTransition,
          redirectDelayMs
        });
        router.replace('/login');
      }, redirectDelayMs);

      return () => clearTimeout(redirectTimer);
    }
  }, [mounted, isLoading, isAuthenticated, router, user?.role]);

  const handleRetry = React.useCallback(() => {
    if (user) {
      const redirectPath = PermissionManager.getRoleBasedRedirectPath(user);
      router.push(redirectPath);
    } else {
      router.push('/login');
    }
  }, [user, router]);

  const hasAccess = React.useMemo(() => {
    // CRITICAL FIX: Properly handle loading states without granting premature access
    if (isLoading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProtectedRoute] Still loading, deferring access decision');
      }
      return null; // Return null to indicate undetermined state
    }

    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProtectedRoute] No user found, access denied');
      }
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ProtectedRoute] Checking access for user:', {
        userRole: user.role,
        userEmail: user.email,
        allowedRoles,
        requiredPermissions,
        userPermissions: user.permissions,
        pathname,
        requireCleanURLAccess
      });
    }

    const normalizedUserRole = normalizeRuntimeRole(user.role);
    if (!normalizedUserRole) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ProtectedRoute] Access denied - Invalid user role format:', user.role);
      }
      return { hasAccess: false, reason: 'role_not_allowed' };
    }

    // Enhanced: Check clean URL path access for role-based navigation
    if (requireCleanURLAccess && !bypassRoleCheck) {
      // Extract clean path without locale - be more specific about locale patterns
      let cleanPath = pathname;

      // Only remove locale if pattern matches: /en/dashboard, /id/dashboard, etc.
      if (/^\/[a-z]{2}\//.test(pathname)) {
        cleanPath = pathname.substring(2); // Remove /xx locale prefix
      } else if (/^\/[a-z]{2}$/.test(pathname) && pathname.length === 3) {
        cleanPath = '/'; // If only locale like /en, /id, redirect to root
      }

      if (!canRoleAccessPath(normalizedUserRole, cleanPath)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ProtectedRoute] Access denied - Path not accessible for role:', {
            userRole: normalizedUserRole,
            cleanPath,
            originalPath: pathname
          });
        }
        return { hasAccess: false, reason: 'path_not_accessible' };
      }
    }

    // Check role-based access with direct comparison
    if (allowedRoles.length > 0) {
      if (!allowedRoles.includes(normalizedUserRole)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ProtectedRoute] Access denied - Role mismatch:', {
            userRole: normalizedUserRole,
            allowedRoles
          });
        }
        return { hasAccess: false, reason: 'role_not_allowed' };
      }
    }

    // Check permission-based access
    if (requiredPermissions.length > 0 && !PermissionManager.hasAnyPermission(user, requiredPermissions)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ProtectedRoute] Access denied - Permission mismatch:', {
          userRole: user.role,
          requiredPermissions,
          userPermissions: user.permissions,
          hasPermissions: PermissionManager.hasAnyPermission(user, requiredPermissions)
        });
      }
      return { hasAccess: false, reason: 'permission_missing' };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [ProtectedRoute] User has access', {
        userRole: normalizedUserRole,
        allowedRoles,
        requiredPermissions,
        pathname,
        accessGranted: true
      });
    }
    return { hasAccess: true, reason: 'access_granted' };
  }, [user, allowedRoles, requiredPermissions, isLoading, pathname, requireCleanURLAccess, bypassRoleCheck]);

  // Extract access state and reason for easier handling
  const accessState = React.useMemo(() => {
    if (typeof hasAccess === 'boolean') {
      return { hasAccess, reason: hasAccess ? 'access_granted' : 'access_denied' };
    }
    return hasAccess || { hasAccess: false, reason: 'access_denied' };
  }, [hasAccess]);

  // Auto-redirect if user doesn't have access to this route (only if not showing 403 page)
  React.useEffect(() => {
    if (mounted && user && !isLoading && !accessState.hasAccess && !show403Page) {
      console.log('ProtectedRoute: auto-redirecting user to their role-based dashboard:', user.role);
      const redirectPath = PermissionManager.getRoleBasedRedirectPath(user);
      router.push(redirectPath);
    }
  }, [mounted, user, isLoading, accessState.hasAccess, show403Page, router]);

  // Don't render anything on server-side
  if (!mounted) {
    return <LoadingComponent />;
  }

  // Show loading while checking authentication or determining access
  if (isLoading || accessState.hasAccess === null) {
    return <LoadingComponent />;
  }

  // Show loading if redirecting
  if (!isAuthenticated) {
    return <LoadingComponent />;
  }

  // Show unauthorized component if user doesn't have access
  if (!accessState.hasAccess) {
    const message = allowedRoles.length > 0
      ? `Halaman ini hanya dapat diakses oleh: ${allowedRoles.join(', ')}`
      : requiredPermissions.length > 0
        ? `Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini.`
        : 'Anda tidak memiliki akses untuk melihat halaman ini.';

    return (
      <UnauthorizedComponent
        onRetry={handleRetry}
        message={message}
        reason={accessState.reason}
        userRole={normalizeRuntimeRole(user?.role) || undefined}
      />
    );
  }

  // Render children if user has access
  return <>{children}</>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Optimized hook for checking permissions in components
export function usePermissions() {
  const { user } = useAuth();

  // Memoize permission functions to prevent unnecessary re-renders
  const hasPermission = React.useCallback(
    (permission: string, companyId?: string) => PermissionManager.hasPermission(user, permission, companyId),
    [user]
  );

  const hasAnyPermission = React.useCallback(
    (permissions: string[], companyId?: string) => PermissionManager.hasAnyPermission(user, permissions, companyId),
    [user]
  );

  const hasAllPermissions = React.useCallback(
    (permissions: string[], companyId?: string) => PermissionManager.hasAllPermissions(user, permissions, companyId),
    [user]
  );

  const canAccessRoute = React.useCallback(
    (route: string) => PermissionManager.canAccessRoute(user, route),
    [user]
  );

  const canPerformAction = React.useCallback(
    (action: string, resource?: any) => PermissionManager.canPerformAction(user, action, resource),
    [user]
  );

  // Memoize expensive computations
  const availableActions = React.useMemo(
    () => PermissionManager.getAvailableActions(user),
    [user]
  );

  const roleInfo = React.useMemo(
    () => user ? PermissionManager.getRoleDisplayInfo(user.role) : null,
    [user?.role]
  );

  return React.useMemo(() => ({
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    canPerformAction,
    availableActions,
    roleInfo,
    user,
  }), [
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    canPerformAction,
    availableActions,
    roleInfo,
    user
  ]);
}
