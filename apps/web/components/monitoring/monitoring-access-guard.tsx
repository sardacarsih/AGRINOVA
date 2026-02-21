'use client';

import React from 'react';
import { User } from '@/types/auth';
import { MonitoringPermissions } from '@/lib/monitoring/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Lock, BarChart3 } from 'lucide-react';

interface MonitoringAccessGuardProps {
  children: React.ReactNode;
  user: User | null;
  feature?: string;
  fallback?: React.ReactNode;
  requiredPermission?: string;
  showMessage?: boolean;
  title?: string;
  description?: string;
  onAccessDenied?: () => void;
  className?: string;
}

export function MonitoringAccessGuard({
  children,
  user,
  feature = 'monitoring',
  fallback,
  requiredPermission,
  showMessage = true,
  title,
  description,
  onAccessDenied,
  className = ''
}: MonitoringAccessGuardProps) {
  // Check if user has monitoring access
  const hasAccess = MonitoringPermissions.hasAnyMonitoringAccess(user);
  const accessLevel = MonitoringPermissions.getMonitoringAccessLevel(user);

  // If specific permission is required, check it
  if (requiredPermission) {
    // Try to call the method if it exists on MonitoringPermissions
    const permissionMethod = MonitoringPermissions[requiredPermission as keyof typeof MonitoringPermissions];
    const hasPermission = typeof permissionMethod === 'function'
      ? (permissionMethod as (user: User | null) => boolean)(user)
      : false;

    if (!hasPermission) {
      return fallback || <AccessDeniedMessage user={user} feature={feature} showMessage={showMessage} />;
    }
  }

  // If no access, show denied message
  if (!hasAccess) {
    return fallback || <AccessDeniedMessage user={user} feature={feature} showMessage={showMessage} />;
  }

  // Check feature-specific access
  const debugInfo = MonitoringPermissions.debugMonitoringAccess(user, feature);
  if (!debugInfo.granted) {
    return fallback || (
      <AccessDeniedMessage
        user={user}
        feature={feature}
        showMessage={showMessage}
        title={title}
        description={description}
        debugInfo={debugInfo}
      />
    );
  }

  // If access denied callback is provided and access would be denied, call it
  if (!debugInfo.granted && onAccessDenied) {
    onAccessDenied();
  }

  return (
    <div className={`monitoring-access-guard ${className}`}>
      {children}
    </div>
  );
}

interface AccessDeniedMessageProps {
  user: User | null;
  feature: string;
  showMessage: boolean;
  title?: string;
  description?: string;
  debugInfo?: {
    granted: boolean;
    reason: string;
    accessLevel: string;
    requiredPermissions: string[];
    userPermissions: string[];
  };
}

function AccessDeniedMessage({
  user,
  feature,
  showMessage,
  title,
  description,
  debugInfo
}: AccessDeniedMessageProps) {
  if (!showMessage) {
    return null;
  }

  const getFeatureDisplayName = (featureName: string): string => {
    const featureMap: Record<string, string> = {
      'monitoring': 'System Monitoring',
      'performance-dashboard': 'Performance Dashboard',
      'real-time-metrics': 'Real-time Metrics',
      'performance-alerts': 'Performance Alerts',
      'system-health': 'System Health',
      'historical-data': 'Historical Data',
      'performance-analysis': 'Performance Analysis',
      'bottleneck-detection': 'Bottleneck Detection',
      'database-monitoring': 'Database Monitoring',
      'api-monitoring': 'API Monitoring',
      'security-monitoring': 'Security Monitoring',
      'dashboard-customization': 'Dashboard Customization',
      'export-metrics': 'Export Metrics',
    };

    return featureMap[featureName] || featureName;
  };

  const featureDisplayName = getFeatureDisplayName(feature);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">
            {title || 'Access Denied'}
          </CardTitle>
          <CardDescription>
            {description || `You don't have permission to access ${featureDisplayName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800">
                  Super Admin Access Required
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  This feature requires Super Administrator privileges for security and performance reasons.
                </p>
              </div>
            </div>
          </div>

          {user && (
            <div className="text-sm text-gray-600">
              <p>
                <strong>Current Role:</strong> {user.role}
              </p>
              {debugInfo && (
                <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                  <p><strong>Access Level:</strong> {debugInfo.accessLevel}</p>
                  <p><strong>Reason:</strong> {debugInfo.reason}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Required:</strong> Super Administrator role or explicit monitoring permissions
            </p>
            <p>
              <strong>Contact:</strong> System Administrator to request access
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4" />
                <span>Secure Access</span>
              </div>
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Monitoring</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for protecting monitoring routes
export function withMonitoringAccess<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    feature?: string;
    requiredPermission?: string;
    fallback?: React.ReactNode;
    showMessage?: boolean;
  } = {}
) {
  return function MonitoringProtectedComponent(props: P & { user?: User | null }) {
    const { user, ...rest } = props;

    return (
      <MonitoringAccessGuard
        user={user || null}
        feature={options.feature}
        requiredPermission={options.requiredPermission}
        fallback={options.fallback}
        showMessage={options.showMessage}
      >
        <Component {...(rest as P)} />
      </MonitoringAccessGuard>
    );
  };
}

// Hook-based access guard for inline checks
export function useMonitoringAccessGuard(feature: string) {
  const checkAccess = (user: User | null, requiredPermission?: string) => {
    const debugInfo = MonitoringPermissions.debugMonitoringAccess(user, feature);

    return {
      hasAccess: debugInfo.granted,
      debugInfo,
      requiredPermission,
      canProceed: () => {
        if (!debugInfo.granted) {
          console.warn(`[MonitoringAccessGuard] Access denied for feature "${feature}":`, debugInfo.reason);
          return false;
        }
        return true;
      }
    };
  };

  return {
    checkAccess,
    hasAccess: (user: User | null) => MonitoringPermissions.hasAnyMonitoringAccess(user),
    getAccessLevel: (user: User | null) => MonitoringPermissions.getMonitoringAccessLevel(user),
    debugAccess: (user: User | null) => MonitoringPermissions.debugMonitoringAccess(user, feature)
  };
}

// Pre-built access guards for common monitoring features
export const PerformanceDashboardGuard = ({ children, user, ...props }: any) => (
  <MonitoringAccessGuard
    user={user}
    feature="performance-dashboard"
    requiredPermission="canViewPerformanceMetrics"
    {...props}
  >
    {children}
  </MonitoringAccessGuard>
);

export const RealTimeMetricsGuard = ({ children, user, ...props }: any) => (
  <MonitoringAccessGuard
    user={user}
    feature="real-time-metrics"
    requiredPermission="canAccessRealTimeMetrics"
    {...props}
  >
    {children}
  </MonitoringAccessGuard>
);

export const PerformanceAlertsGuard = ({ children, user, ...props }: any) => (
  <MonitoringAccessGuard
    user={user}
    feature="performance-alerts"
    requiredPermission="canManageAlerts"
    {...props}
  >
    {children}
  </MonitoringAccessGuard>
);

export const SystemHealthGuard = ({ children, user, ...props }: any) => (
  <MonitoringAccessGuard
    user={user}
    feature="system-health"
    requiredPermission="canViewSystemHealth"
    {...props}
  >
    {children}
  </MonitoringAccessGuard>
);

export default MonitoringAccessGuard;