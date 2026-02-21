'use client';

/**
 * Enhanced Monitoring Permissions for Super Admin Users
 * Extends the existing permission system with performance monitoring specific permissions
 */

import { useState } from 'react';
import { PermissionManager } from '@/lib/auth/permissions';
import { User } from '@/types/auth';

// Monitoring-specific permissions
export const MONITORING_PERMISSIONS = {
  // Core monitoring access
  VIEW_PERFORMANCE_METRICS: 'monitoring:view_performance_metrics',
  MANAGE_ALERTS: 'monitoring:manage_alerts',
  ACCESS_HISTORICAL_DATA: 'monitoring:access_historical_data',
  CONFIGURE_MONITORING: 'monitoring:configure_monitoring',

  // System health monitoring
  SYSTEM_HEALTH_VIEW: 'monitoring:system_health_view',
  SYSTEM_HEALTH_EXPORT: 'monitoring:system_health_export',

  // Real-time monitoring
  REAL_TIME_METRICS: 'monitoring:real_time_metrics',
  LIVE_SUBSCRIPTIONS: 'monitoring:live_subscriptions',

  // Performance analysis
  PERFORMANCE_ANALYSIS: 'monitoring:performance_analysis',
  BOTTLENECK_DETECTION: 'monitoring:bottleneck_detection',
  TREND_ANALYSIS: 'monitoring:trend_analysis',

  // Database monitoring
  DATABASE_PERFORMANCE: 'monitoring:database_performance',
  DATABASE_HEALTH: 'monitoring:database_health',

  // API monitoring
  API_PERFORMANCE: 'monitoring:api_performance',
  ENDPOINT_ANALYSIS: 'monitoring:endpoint_analysis',

  // Security monitoring
  SECURITY_MONITORING: 'monitoring:security_monitoring',
  THREAT_ANALYSIS: 'monitoring:threat_analysis',

  // Advanced features
  DASHBOARD_CUSTOMIZATION: 'monitoring:dashboard_customization',
  EXPORT_METRICS: 'monitoring:export_metrics',
  INTEGRATION_ACCESS: 'monitoring:integration_access',
} as const;

// Enhanced monitoring permission checks
export class MonitoringPermissions {
  /**
   * Check if user can access performance metrics
   * Only Super Admin users should have access to detailed system performance data
   */
  static canViewPerformanceMetrics(user: User | null): boolean {
    if (!user) return false;

    // Super Admin has all monitoring permissions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check explicit monitoring permission
    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.VIEW_PERFORMANCE_METRICS);
  }

  /**
   * Check if user can manage performance alerts
   * Includes creating, acknowledging, and resolving alerts
   */
  static canManageAlerts(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.MANAGE_ALERTS);
  }

  /**
   * Check if user can access historical performance data
   */
  static canAccessHistoricalData(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.ACCESS_HISTORICAL_DATA);
  }

  /**
   * Check if user can configure monitoring settings
   */
  static canConfigureMonitoring(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.CONFIGURE_MONITORING);
  }

  /**
   * Check if user can view system health metrics
   */
  static canViewSystemHealth(user: User | null): boolean {
    if (!user) return false;

    // Super Admin and Company Admin can view basic system health
    if (user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.SYSTEM_HEALTH_VIEW);
  }

  /**
   * Check if user can access real-time metrics
   */
  static canAccessRealTimeMetrics(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.REAL_TIME_METRICS);
  }

  /**
   * Check if user can subscribe to live WebSocket streams
   */
  static canSubscribeToLiveData(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.LIVE_SUBSCRIPTIONS);
  }

  /**
   * Check if user can perform performance analysis
   */
  static canPerformPerformanceAnalysis(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.PERFORMANCE_ANALYSIS);
  }

  /**
   * Check if user can detect and analyze bottlenecks
   */
  static canDetectBottlenecks(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.BOTTLENECK_DETECTION);
  }

  /**
   * Check if user can monitor database performance
   */
  static canMonitorDatabase(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.DATABASE_PERFORMANCE);
  }

  /**
   * Check if user can monitor API performance
   */
  static canMonitorAPI(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.API_PERFORMANCE);
  }

  /**
   * Check if user can access security monitoring
   */
  static canAccessSecurityMonitoring(user: User | null): boolean {
    if (!user) return false;

    // Super Admin and Company Admin can access security monitoring
    if (user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.SECURITY_MONITORING);
  }

  /**
   * Check if user can customize monitoring dashboards
   */
  static canCustomizeDashboards(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.DASHBOARD_CUSTOMIZATION);
  }

  /**
   * Check if user can export monitoring metrics
   */
  static canExportMetrics(user: User | null): boolean {
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return PermissionManager.hasPermission(user, MONITORING_PERMISSIONS.EXPORT_METRICS);
  }

  /**
   * Get all available monitoring permissions for a user
   */
  static getAvailableMonitoringPermissions(user: User | null): string[] {
    if (!user) return [];

    if (user.role === 'SUPER_ADMIN') {
      return Object.values(MONITORING_PERMISSIONS);
    }

    // Check which monitoring permissions the user has
    const availablePermissions: string[] = [];

    Object.values(MONITORING_PERMISSIONS).forEach(permission => {
      if (PermissionManager.hasPermission(user, permission)) {
        availablePermissions.push(permission);
      }
    });

    return availablePermissions;
  }

  /**
   * Check if user has any monitoring access
   * Used for route protection and feature visibility
   */
  static hasAnyMonitoringAccess(user: User | null): boolean {
    return (
      this.canViewPerformanceMetrics(user) ||
      this.canViewSystemHealth(user) ||
      this.canAccessSecurityMonitoring(user) ||
      this.getAvailableMonitoringPermissions(user).length > 0
    );
  }

  /**
   * Get monitoring access level for UI rendering
   */
  static getMonitoringAccessLevel(user: User | null): {
    level: 'none' | 'basic' | 'advanced' | 'full';
    permissions: string[];
  } {
    if (!user) {
      return { level: 'none', permissions: [] };
    }

    if (user.role === 'SUPER_ADMIN') {
      return {
        level: 'full',
        permissions: Object.values(MONITORING_PERMISSIONS)
      };
    }

    const permissions = this.getAvailableMonitoringPermissions(user);

    if (permissions.length === 0) {
      return { level: 'none', permissions: [] };
    }

    // Determine access level based on permission count and type
    const criticalPermissions = [
      MONITORING_PERMISSIONS.VIEW_PERFORMANCE_METRICS,
      MONITORING_PERMISSIONS.REAL_TIME_METRICS,
      MONITORING_PERMISSIONS.PERFORMANCE_ANALYSIS
    ];

    const hasCriticalPermissions = criticalPermissions.some(p => permissions.includes(p));

    if (hasCriticalPermissions && permissions.length >= 5) {
      return { level: 'advanced', permissions };
    } else if (permissions.length >= 2) {
      return { level: 'basic', permissions };
    } else {
      return { level: 'basic', permissions };
    }
  }

  /**
   * Validate monitoring access with detailed logging for debugging
   */
  static debugMonitoringAccess(user: User | null, feature: string): {
    granted: boolean;
    reason: string;
    accessLevel: string;
    requiredPermissions: string[];
    userPermissions: string[];
  } {
    if (!user) {
      return {
        granted: false,
        reason: 'No user provided',
        accessLevel: 'none',
        requiredPermissions: [],
        userPermissions: []
      };
    }

    const accessLevel = this.getMonitoringAccessLevel(user);
    const userPermissions = this.getAvailableMonitoringPermissions(user);

    // Map feature to required permissions
    const featurePermissionMap: Record<string, string[]> = {
      'performance-dashboard': [MONITORING_PERMISSIONS.VIEW_PERFORMANCE_METRICS],
      'real-time-metrics': [MONITORING_PERMISSIONS.REAL_TIME_METRICS, MONITORING_PERMISSIONS.LIVE_SUBSCRIPTIONS],
      'performance-alerts': [MONITORING_PERMISSIONS.MANAGE_ALERTS],
      'system-health': [MONITORING_PERMISSIONS.SYSTEM_HEALTH_VIEW],
      'historical-data': [MONITORING_PERMISSIONS.ACCESS_HISTORICAL_DATA],
      'performance-analysis': [MONITORING_PERMISSIONS.PERFORMANCE_ANALYSIS],
      'bottleneck-detection': [MONITORING_PERMISSIONS.BOTTLENECK_DETECTION],
      'database-monitoring': [MONITORING_PERMISSIONS.DATABASE_PERFORMANCE],
      'api-monitoring': [MONITORING_PERMISSIONS.API_PERFORMANCE],
      'security-monitoring': [MONITORING_PERMISSIONS.SECURITY_MONITORING],
      'dashboard-customization': [MONITORING_PERMISSIONS.DASHBOARD_CUSTOMIZATION],
      'export-metrics': [MONITORING_PERMISSIONS.EXPORT_METRICS],
    };

    const requiredPermissions = featurePermissionMap[feature] || [];
    const hasRequiredPermission = requiredPermissions.length === 0 ||
      requiredPermissions.some(p => userPermissions.includes(p));

    return {
      granted: hasRequiredPermission || user.role === 'SUPER_ADMIN',
      reason: hasRequiredPermission ? 'Permission granted' :
        user.role === 'SUPER_ADMIN' ? 'Super admin access granted' :
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      accessLevel: accessLevel.level,
      requiredPermissions,
      userPermissions
    };
  }
}

// React Hook for monitoring permissions
export const useMonitoringPermissions = () => {
  const [user, setUser] = useState<User | null>(null);

  // This would integrate with your auth context
  // const { user } = useAuth();

  const canViewMetrics = MonitoringPermissions.canViewPerformanceMetrics(user);
  const canManageAlerts = MonitoringPermissions.canManageAlerts(user);
  const canAccessRealTime = MonitoringPermissions.canAccessRealTimeMetrics(user);
  const accessLevel = MonitoringPermissions.getMonitoringAccessLevel(user);

  return {
    user,
    canViewMetrics,
    canManageAlerts,
    canAccessRealTime,
    accessLevel,
    hasAccess: MonitoringPermissions.hasAnyMonitoringAccess(user),
    debugAccess: (feature: string) => MonitoringPermissions.debugMonitoringAccess(user, feature)
  };
};

export default MonitoringPermissions;