import React from 'react';
import { UserRole } from '@/types/auth';
import { DashboardConfig, DashboardFeature } from '@/features/dashboard/types/dashboard';

// Simplified role-based dashboard configurations
// Note: Features array is simplified since we're using direct dashboard components
export const ROLE_DASHBOARD_CONFIGS: Record<UserRole, DashboardConfig> = {
  'SUPER_ADMIN': {
    role: 'SUPER_ADMIN',
    title: 'Super Admin Dashboard',
    description: 'Complete system control and monitoring',
    features: [], // Features managed by main dashboard component
    layout: {
      sidebar: {
        width: '280px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1400px',
        padding: '24px',
      },
    },
    permissions: ['super_admin:all'],
  },
  'COMPANY_ADMIN': {
    role: 'COMPANY_ADMIN',
    title: 'Company Admin Dashboard',
    description: 'Company management and operations',
    features: [],
    layout: {
      sidebar: {
        width: '280px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1200px',
        padding: '24px',
      },
    },
    permissions: ['company_admin:all'],
  },
  'AREA_MANAGER': {
    role: 'AREA_MANAGER',
    title: 'Area Manager Dashboard',
    description: 'Multi-company oversight and reporting',
    features: [],
    layout: {
      sidebar: {
        width: '280px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1200px',
        padding: '24px',
      },
    },
    permissions: ['area_manager:all'],
  },
  'MANAGER': {
    role: 'MANAGER',
    title: 'Manager Dashboard',
    description: 'Estate management and monitoring',
    features: [],
    layout: {
      sidebar: {
        width: '260px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1200px',
        padding: '20px',
      },
    },
    permissions: ['manager:all'],
  },
  'ASISTEN': {
    role: 'ASISTEN',
    title: 'Asisten Dashboard',
    description: 'Harvest approval and monitoring',
    features: [],
    layout: {
      sidebar: {
        width: '260px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1100px',
        padding: '20px',
      },
    },
    permissions: ['asisten:all'],
  },
  'MANDOR': {
    role: 'MANDOR',
    title: 'Mandor Dashboard',
    description: 'Harvest input and worker management',
    features: [],
    layout: {
      sidebar: {
        width: '240px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1000px',
        padding: '20px',
      },
    },
    permissions: ['mandor:all'],
  },
  'SATPAM': {
    role: 'SATPAM',
    title: 'Satpam Dashboard',
    description: 'Gate check and security monitoring',
    features: [],
    layout: {
      sidebar: {
        width: '240px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: false,
        showUserMenu: true,
      },
      content: {
        maxWidth: '900px',
        padding: '20px',
      },
    },
    permissions: ['satpam:all'],
  },
  'TIMBANGAN': {
    role: 'TIMBANGAN',
    title: 'Timbangan Dashboard',
    description: 'Weighing operations and weight recording',
    features: [],
    layout: {
      sidebar: {
        width: '240px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1000px',
        padding: '20px',
      },
    },
    permissions: ['weighing:create', 'weighing:read', 'weighing:update'],
  },
  'GRADING': {
    role: 'GRADING',
    title: 'Grading Dashboard',
    description: 'Quality inspection and grading',
    features: [],
    layout: {
      sidebar: {
        width: '240px',
        collapsible: true,
        defaultCollapsed: false,
      },
      header: {
        showBreadcrumbs: true,
        showNotifications: true,
        showUserMenu: true,
      },
      content: {
        maxWidth: '1000px',
        padding: '20px',
      },
    },
    permissions: ['grading:create', 'grading:read', 'grading:approve'],
  },
};

// Role detection and routing
export class DashboardRouter {
  static getDashboardConfig(role: UserRole): DashboardConfig {
    return ROLE_DASHBOARD_CONFIGS[role];
  }

  static getDefaultRoute(role: UserRole): string {
    // All roles now use unified dashboard
    return '/dashboard';
  }

  static isValidRoute(role: UserRole, path: string): boolean {
    // For unified dashboard, only /dashboard path is valid
    return path === '/dashboard' || path.startsWith('/dashboard?');
  }

  static getAvailableRoutes(role: UserRole, userPermissions: string[]): DashboardFeature[] {
    // Return empty array as features are managed by individual dashboard components
    return [];
  }

  static generateBreadcrumbs(role: UserRole, currentPath: string): Array<{ label: string; href?: string }> {
    const config = this.getDashboardConfig(role);

    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: config.title.replace(' Dashboard', '') }
    ];
  }
}

// Lazy import helper
function lazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(factory);
}