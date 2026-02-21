'use client';

import React from 'react';
import { PermissionManager } from '@/lib/auth/permissions';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@/types/auth';

interface PermissionWrapperProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string;
  roles?: string[];
  companyId?: string;
  fallback?: React.ReactNode;
}

/**
 * Performance-optimized permission wrapper component
 * Uses React.memo and memoized permission checks to prevent unnecessary re-renders
 */
export const PermissionWrapper = React.memo<PermissionWrapperProps>(({
  children,
  permission,
  permissions = [],
  requireAll = false,
  role,
  roles = [],
  companyId,
  fallback = null,
}) => {
  const { user } = useAuth();

  // Memoize permission check results
  const hasAccess = React.useMemo(() => {
    if (!user) return false;

    // Check role-based access
    if (role && user.role !== role) return false;
    if (roles.length > 0 && !roles.includes(user.role)) return false;

    // Check permission-based access
    const permissionsToCheck = permission ? [permission] : permissions;
    if (permissionsToCheck.length === 0) return true; // No specific permissions required

    if (requireAll) {
      return PermissionManager.hasAllPermissions(user, permissionsToCheck, companyId);
    } else {
      return PermissionManager.hasAnyPermission(user, permissionsToCheck, companyId);
    }
  }, [user, permission, permissions, requireAll, role, roles, companyId]);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
});

PermissionWrapper.displayName = 'PermissionWrapper';

/**
 * Hook for conditional rendering based on permissions
 * Returns memoized permission check functions
 */
export function usePermissionCheck() {
  const { user } = useAuth();

  return React.useMemo(() => ({
    hasPermission: (permission: string, companyId?: string) => 
      PermissionManager.hasPermission(user, permission, companyId),
    hasAnyPermission: (permissions: string[], companyId?: string) => 
      PermissionManager.hasAnyPermission(user, permissions, companyId),
    hasAllPermissions: (permissions: string[], companyId?: string) => 
      PermissionManager.hasAllPermissions(user, permissions, companyId),
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => user ? roles.includes(user.role) : false,
    user,
  }), [user]);
}

/**
 * High-order component for permission-based conditional rendering
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<PermissionWrapperProps, 'children'>
) {
  const PermissionedComponent = React.memo((props: P) => (
    <PermissionWrapper {...options}>
      <Component {...props} />
    </PermissionWrapper>
  ));

  PermissionedComponent.displayName = `withPermissions(${Component.displayName || Component.name})`;
  
  return PermissionedComponent;
}

/**
 * Performance-optimized component that only re-renders when user permissions change
 */
export const PermissionSensitiveComponent = React.memo<{
  children: (user: User | null) => React.ReactNode;
}>(({ children }) => {
  const { user } = useAuth();
  
  // Only re-render when user ID, role, or permissions change
  const memoizedUser = React.useMemo(() => user, [
    user?.id,
    user?.email, 
    user?.role,
    user?.permissions?.join(','),
    user?.companyId,
    user?.companyAdminFor?.join(',')
  ]);

  return <>{children(memoizedUser)}</>;
});

PermissionSensitiveComponent.displayName = 'PermissionSensitiveComponent';