'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PermissionManager } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, CircleAlert, User, Shield, Settings } from 'lucide-react';

export function SuperAdminAccessDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Super Admin Access Debug
          </CardTitle>
          <CardDescription>Debugging authentication and authorization...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const debugInfo = {
    isAuthenticated,
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || []
    } : null,
    accessChecks: {
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
      hasPermission: user ? PermissionManager.hasPermission(user, PERMISSIONS.SUPER_ADMIN_ALL) : false,
      canAccessRoute: user ? PermissionManager.canAccessRoute(user, '/dashboard/super-admin') : false,
      redirectPath: user ? PermissionManager.getRoleBasedRedirectPath(user) : '/login'
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => 
    status ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Super Admin Access Debug
          </CardTitle>
          <CardDescription>
            Real-time authentication and authorization debugging for super-admin dashboard access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authentication Status */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Authentication Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={isAuthenticated} />
                <span>Is Authenticated: </span>
                <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={!isLoading} />
                <span>Loading Complete: </span>
                <Badge variant={!isLoading ? 'default' : 'secondary'}>
                  {!isLoading ? 'Yes' : 'Loading...'}
                </Badge>
              </div>
            </div>
          </div>

          {/* User Information */}
          {user && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                User Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Name:</strong> {user.name}</div>
                <div className="flex items-center gap-2">
                  <strong>Role:</strong> 
                  <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <div><strong>User ID:</strong> {user.id}</div>
                <div><strong>Permissions:</strong> {user.permissions?.length || 0} total</div>
              </div>
            </div>
          )}

          {/* Access Control Checks */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access Control Checks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={debugInfo.accessChecks.isSuperAdmin} />
                <span>Is Super Admin Role: </span>
                <Badge variant={debugInfo.accessChecks.isSuperAdmin ? 'default' : 'destructive'}>
                  {debugInfo.accessChecks.isSuperAdmin ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={debugInfo.accessChecks.hasPermission} />
                <span>Has Super Admin Permission: </span>
                <Badge variant={debugInfo.accessChecks.hasPermission ? 'default' : 'destructive'}>
                  {debugInfo.accessChecks.hasPermission ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={debugInfo.accessChecks.canAccessRoute} />
                <span>Can Access Route: </span>
                <Badge variant={debugInfo.accessChecks.canAccessRoute ? 'default' : 'destructive'}>
                  {debugInfo.accessChecks.canAccessRoute ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <CircleAlert className="h-4 w-4 text-blue-600" />
                <span>Redirect Path: </span>
                <Badge variant="outline">
                  {debugInfo.accessChecks.redirectPath}
                </Badge>
              </div>
            </div>
          </div>

          {/* Permissions List */}
          {user?.permissions && user.permissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">User Permissions</h3>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((permission, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          <div className="space-y-3">
            <h3 className="font-semibold">Troubleshooting</h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
              {!isAuthenticated && (
                <div className="text-red-600">
                  ❌ User is not authenticated. Please log in first.
                </div>
              )}
              {isAuthenticated && user?.role !== 'SUPER_ADMIN' && (
                <div className="text-orange-600">
                  ⚠️ User role is "{user?.role}" but should be "super_admin" for dashboard access.
                </div>
              )}
              {isAuthenticated && user?.role === 'SUPER_ADMIN' && !debugInfo.accessChecks.hasPermission && (
                <div className="text-orange-600">
                  ⚠️ User has super_admin role but missing SUPER_ADMIN_ALL permission.
                </div>
              )}
              {isAuthenticated && debugInfo.accessChecks.isSuperAdmin && debugInfo.accessChecks.hasPermission && (
                <div className="text-green-600">
                  ✅ All access checks passed! Super admin should have dashboard access.
                </div>
              )}
            </div>
          </div>

          {/* Raw Debug Data */}
          <details className="space-y-2">
            <summary className="font-semibold cursor-pointer">Raw Debug Data</summary>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}