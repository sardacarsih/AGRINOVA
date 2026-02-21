import type { UserRole } from '@/types/user';

// Hierarchical navigation interface
export interface NavigationCategory {
  id: string;
  title: string; // i18n key
  icon: string;
  path?: string;
  permissions?: string[];
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';
  children?: NavigationItem[];
}

export interface NavigationItem {
  id: string;
  title: string; // i18n key
  icon: string;
  path: string;
  permissions?: string[];
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';
  children?: NavigationItem[];
}

// Hierarchical Navigation Configuration
// Generic paths with role-based content filtering
export const HIERARCHICAL_NAVIGATION: NavigationCategory[] = [
  {
    id: 'dashboard',
    title: 'navigation.dashboard',
    icon: 'layout-dashboard',
    path: '/',
    permissions: ['dashboard:read']
  },
  {
    id: 'operations',
    title: 'navigation.operations',
    icon: 'activity',
    permissions: ['harvest:read', 'gate:read'],
    children: [
      {
        id: 'harvest',
        title: 'navigation.harvest',
        icon: 'sprout',
        path: '/harvest',
        permissions: ['harvest:read'],
        children: [
          {
            id: 'harvest-input',
            title: 'navigation.harvestInput',
            icon: 'plus-circle',
            path: '/harvest/input',
            permissions: ['harvest:create']
          },
          {
            id: 'harvest-approval',
            title: 'navigation.harvestApproval',
            icon: 'check-circle',
            path: '/harvest/approval',
            permissions: ['harvest:approve'],
            badge: 'pending'
          },
          {
            id: 'harvest-history',
            title: 'navigation.harvestHistory',
            icon: 'clock',
            path: '/harvest/history',
            permissions: ['history:read']
          }
        ]
      },
      {
        id: 'gate-check',
        title: 'navigation.gateCheck',
        icon: 'shield',
        path: '/gate-check',
        permissions: ['gate:read'],
        children: [
          {
            id: 'qr-scanner',
            title: 'navigation.qrScanner',
            icon: 'qr-code',
            path: '/gate-check/qr-scanner',
            permissions: ['qr:scan']
          },
          {
            id: 'vehicle-log',
            title: 'navigation.vehicleLog',
            icon: 'truck',
            path: '/gate-check/vehicles',
            permissions: ['vehicles:log']
          }
        ]
      },
      {
        id: 'field-operations',
        title: 'navigation.fieldOperations',
        icon: 'leaf',
        path: '/field-operations',
        permissions: ['field:read'],
        children: [
          {
            id: 'weighing',
            title: 'navigation.weighing',
            icon: 'scale',
            path: '/weighing',
            permissions: ['weighing:read'],
            children: [
              {
                id: 'weighing-input',
                title: 'navigation.weighingInput',
                icon: 'plus-circle',
                path: '/weighing/input',
                permissions: ['weighing:create']
              },
              {
                id: 'weighing-history',
                title: 'navigation.weighingHistory',
                icon: 'clock',
                path: '/weighing/history',
                permissions: ['history:read']
              },
              {
                id: 'weighing-reports',
                title: 'navigation.weighingReports',
                icon: 'file-text',
                path: '/weighing/reports',
                permissions: ['reports:read']
              }
            ]
          },
          {
            id: 'grading',
            title: 'navigation.grading',
            icon: 'clipboard-check',
            path: '/grading',
            permissions: ['grading:read'],
            children: [
              {
                id: 'grading-input',
                title: 'navigation.gradingInput',
                icon: 'plus-circle',
                path: '/grading/input',
                permissions: ['grading:create']
              },
              {
                id: 'grading-history',
                title: 'navigation.gradingHistory',
                icon: 'clock',
                path: '/grading/history',
                permissions: ['history:read']
              },
              {
                id: 'grading-reports',
                title: 'navigation.gradingReports',
                icon: 'file-text',
                path: '/grading/reports',
                permissions: ['reports:read']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'master-data',
    title: 'navigation.masterData',
    icon: 'database',
    permissions: ['master:read'],
    children: [
      {
        id: 'companies',
        title: 'navigation.companies',
        icon: 'building',
        path: '/companies',
        permissions: ['company:read']
      },
      {
        id: 'estates',
        title: 'navigation.estates',
        icon: 'map-pin',
        path: '/estates',
        permissions: ['estates:manage']
      },
      {
        id: 'divisions',
        title: 'navigation.divisions',
        icon: 'grid-3x3',
        path: '/divisions',
        permissions: ['divisions:manage']
      },
      {
        id: 'blocks',
        title: 'navigation.blocks',
        icon: 'square',
        path: '/blocks',
        permissions: ['blocks:manage']
      }
    ]
  },
  {
    id: 'user-management',
    title: 'navigation.userManagement',
    icon: 'users',
    permissions: ['users:read'],
    children: [
      {
        id: 'all-users',
        title: 'navigation.allUsers',
        icon: 'users',
        path: '/users',
        permissions: ['users:manage']
      },
      {
        id: 'role-assignment',
        title: 'navigation.roleAssignment',
        icon: 'shield',
        path: '/users/roles',
        permissions: ['roles:manage']
      },
      {
        id: 'pending-approvals',
        title: 'navigation.pendingApprovals',
        icon: 'clock',
        path: '/users/approvals',
        permissions: ['approvals:read'],
        badge: 'pending'
      },
      {
        id: 'workers',
        title: 'navigation.workers',
        icon: 'user-check',
        path: '/workers',
        permissions: ['workers:read']
      }
    ]
  },
  {
    id: 'assignments',
    title: 'navigation.assignments',
    icon: 'map',
    path: '/assignments',
    permissions: ['assignments:read'],
    children: [
      {
        id: 'my-assignments',
        title: 'navigation.myAssignments',
        icon: 'user',
        path: '/assignments/my',
        permissions: ['assignments:read']
      },
      {
        id: 'team-assignments',
        title: 'navigation.teamAssignments',
        icon: 'users',
        path: '/assignments/team',
        permissions: ['team:read']
      },
      {
        id: 'multi-assignments',
        title: 'navigation.multiAssignments',
        icon: 'git-branch',
        path: '/assignments/multi',
        permissions: ['multi:manage']
      }
    ]
  },
  {
    id: 'reports-analytics',
    title: 'navigation.reportsAnalytics',
    icon: 'chart-bar',
    permissions: ['reports:read'],
    children: [
      {
        id: 'harvest-reports',
        title: 'navigation.harvestReports',
        icon: 'sprout',
        path: '/reports/harvest',
        permissions: ['reports:harvest']
      },
      {
        id: 'operational-analytics',
        title: 'navigation.operationalAnalytics',
        icon: 'pie-chart',
        path: '/reports/operational',
        permissions: ['analytics:read']
      },
      {
        id: 'executive-reports',
        title: 'navigation.executiveReports',
        icon: 'file-text',
        path: '/reports/executive',
        permissions: ['reports:executive']
      },
      {
        id: 'company-comparison',
        title: 'navigation.companyComparison',
        icon: 'git-compare',
        path: '/reports/comparison',
        permissions: ['reports:compare']
      },
      {
        id: 'regional-analytics',
        title: 'navigation.regionalAnalytics',
        icon: 'globe',
        path: '/reports/regional',
        permissions: ['analytics:regional']
      }
    ]
  },
  {
    id: 'system-administration',
    title: 'navigation.systemAdministration',
    icon: 'settings',
    permissions: ['system:manage'],
    children: [
      {
        id: 'api-management',
        title: 'navigation.apiManagement',
        icon: 'key',
        path: '/api-management',
        permissions: ['api:manage']
      },
      {
        id: 'system-monitoring',
        title: 'navigation.systemMonitoring',
        icon: 'activity',
        path: '/monitoring',
        permissions: ['system:monitor'],
        badge: 'system',
        children: [
          {
            id: 'system-health',
            title: 'navigation.systemHealth',
            icon: 'check-circle',
            path: '/monitoring/health',
            permissions: ['monitoring:health']
          },
          {
            id: 'performance',
            title: 'navigation.performance',
            icon: 'trending-up',
            path: '/monitoring/performance',
            permissions: ['monitoring:performance']
          },
          {
            id: 'api-logs',
            title: 'navigation.apiLogs',
            icon: 'terminal',
            path: '/monitoring/logs',
            permissions: ['logs:read']
          }
        ]
      },
      {
        id: 'system-settings',
        title: 'navigation.systemSettings',
        icon: 'settings',
        path: '/settings',
        permissions: ['settings:manage']
      },
      {
        id: 'system-logs',
        title: 'navigation.systemLogs',
        icon: 'terminal',
        path: '/system-logs',
        permissions: ['logs:read']
      },
      {
        id: 'rbac-management',
        title: 'navigation.rbacManagement',
        icon: 'shield',
        path: '/rbac-management',
        permissions: ['system:config']
      }
    ]
  },
  {
    id: 'personal',
    title: 'navigation.personal',
    icon: 'user',
    children: [
      {
        id: 'notifications',
        title: 'navigation.notifications',
        icon: 'bell',
        path: '/notifications',
        badge: 'new'
      },
      {
        id: 'profile',
        title: 'navigation.profile',
        icon: 'user',
        path: '/profile',
        permissions: ['profile:read']
      }
    ]
  }
];

// Legacy role-specific navigation for backward compatibility
export const ROLE_SPECIFIC_NAVIGATION: Record<UserRole, Array<{
  label: string; // i18n key
  path: string;  // clean URL without role prefixes
  icon: string;
  permissions?: string[];
  badge?: string;
}>> = {
  'SUPER_ADMIN': [
    {
      label: 'items.dashboard',
      path: '/',
      icon: 'layout-dashboard',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'shield',
      permissions: ['gate:read']
    },
    {
      label: 'items.apiKeys',
      path: '/api-management',
      icon: 'key',
      permissions: ['api:manage']
    },
    {
      label: 'items.systemManagement',
      path: '/settings',
      icon: 'settings',
      permissions: ['system:manage']
    },
    {
      label: 'items.companies',
      path: '/companies',
      icon: 'building',
      permissions: ['company:read']
    },
    {
      label: 'items.bkmCompanyBridge',
      path: '/bkm-company-bridge',
      icon: 'link',
      permissions: ['company:read']
    },
    {
      label: 'items.allUsers',
      path: '/users',
      icon: 'users',
      permissions: ['users:manage']
    },
    {
      label: 'items.globalReports',
      path: '/reports',
      icon: 'chart-bar',
      permissions: ['reports:global']
    },
    {
      label: 'items.systemLogs',
      path: '/settings/logs',
      icon: 'terminal',
      permissions: ['logs:read']
    },
    {
      label: 'items.rbacManagement',
      path: '/rbac-management',
      icon: 'shield',
      permissions: ['system:config']
    },
    {
      label: 'items.managementSessions',
      path: '/management-sessions',
      icon: 'clock',
      permissions: ['system:config']
    },
    {
      label: 'items.managementToken',
      path: '/management-token',
      icon: 'key',
      permissions: ['system:config']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'COMPANY_ADMIN': [
    {
      label: 'items.companyDashboard',
      path: '/',
      icon: 'bar-chart-3',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'shield',
      permissions: ['gate:read']
    },
    {
      label: 'items.estates',
      path: '/estates',
      icon: 'map-pin',
      permissions: ['estates:manage']
    },
    {
      label: 'items.divisions',
      path: '/divisions',
      icon: 'grid-3x3',
      permissions: ['divisions:manage']
    },
    {
      label: 'items.blocks',
      path: '/blocks',
      icon: 'square',
      permissions: ['blocks:manage']
    },
    {
      label: 'items.employees',
      path: '/employees',
      icon: 'users',
      permissions: ['employees:manage']
    },
    {
      label: 'items.vehicles',
      path: '/vehicles',
      icon: 'truck',
      permissions: ['vehicles:log']
    },
    {
      label: 'items.companyUsers',
      path: '/users',
      icon: 'user-cog',
      permissions: ['users:manage']
    },
    {
      label: 'items.reports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'AREA_MANAGER': [
    {
      label: 'items.multiCompanyDashboard',
      path: '/',
      icon: 'bar-chart-3',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'shield',
      permissions: ['gate:read']
    },
    {
      label: 'items.companyComparison',
      path: '/reports',
      icon: 'git-compare',
      permissions: ['reports:compare']
    },
    {
      label: 'items.executiveReports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:executive']
    },
    {
      label: 'items.regionalAnalytics',
      path: '/reports',
      icon: 'pie-chart',
      permissions: ['analytics:regional']
    },
    {
      label: 'items.analytics',
      path: '/analytics',
      icon: 'pie-chart',
      permissions: ['analytics:regional']
    },
    {
      label: 'items.systemMonitoring',
      path: '/settings',
      icon: 'terminal',
      permissions: ['system:monitor']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'MANAGER': [
    {
      label: 'items.managerDashboard',
      path: '/',
      icon: 'bar-chart-3',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.harvestInput',
      path: '/harvest',
      icon: 'plus-circle',
      permissions: ['harvest:read']
    },
    {
      label: 'items.teamUsers',
      path: '/tim-estate',
      icon: 'users',
      permissions: ['users:read']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'shield',
      permissions: ['gate:read']
    },
    {
      label: 'items.estateOverview',
      path: '/',
      icon: 'trending-up',
      permissions: ['estates:read']
    },
    {
      label: 'items.harvestReports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:harvest']
    },
    {
      label: 'items.analytics',
      path: '/analytics',
      icon: 'pie-chart',
      permissions: ['analytics:read']
    },
    {
      label: 'items.harvestHistory',
      path: '/harvest/history',
      icon: 'clock',
      permissions: ['harvest:read']
    },
    {
      label: 'items.teamUsers',
      path: '/budget-divisi',
      icon: 'users',
      permissions: ['users:read']
    },
    {
      label: 'items.settings',
      path: '/settings',
      icon: 'settings',
      permissions: ['settings:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'ASISTEN': [
    {
      label: 'items.asistenDashboard',
      path: '/',
      icon: 'bar-chart-3',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.approval',
      path: '/harvest',
      icon: 'check-circle',
      permissions: ['harvest:approve'],
      badge: 'pending'
    },
    {
      label: 'items.monitoring',
      path: '/',
      icon: 'eye',
      permissions: ['harvest:monitor']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'truck',
      permissions: ['gate:read']
    },
    {
      label: 'items.reports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:read']
    },
    {
      label: 'items.harvestHistory',
      path: '/harvest/history',
      icon: 'clock',
      permissions: ['harvest:read']
    },
    {
      label: 'items.notifications',
      path: '/notifications',
      icon: 'bell',
      badge: 'new'
    },
    {
      label: 'items.team',
      path: '/users',
      icon: 'users',
      permissions: ['team:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'MANDOR': [
    {
      label: 'items.dashboard',
      path: '/',
      icon: 'Home',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.mobileSyncRecords',
      path: '/harvest',
      icon: 'Clock',
      permissions: ['harvest:read']
    },
    {
      label: 'items.harvestHistory',
      path: '/harvest/history',
      icon: 'Clock',
      permissions: ['harvest:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'SATPAM': [
    {
      label: 'items.gateDashboard',
      path: '/',
      icon: 'shield',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.gateCheck',
      path: '/gate-check',
      icon: 'qr-code',
      permissions: ['gate:manage']
    },
    {
      label: 'items.qrScanner',
      path: '/gate-check',
      icon: 'scan',
      permissions: ['qr:scan']
    },
    {
      label: 'items.vehicleLog',
      path: '/vehicles',
      icon: 'truck',
      permissions: ['vehicles:log']
    },
    {
      label: 'items.accessHistory',
      path: '/history',
      icon: 'history',
      permissions: ['history:read']
    },
    {
      label: 'items.dailyReports',
      path: '/reports',
      icon: 'calendar',
      permissions: ['reports:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'TIMBANGAN': [
    {
      label: 'items.weighingDashboard',
      path: '/',
      icon: 'scale',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.weighingInput',
      path: '/harvest',
      icon: 'plus-circle',
      permissions: ['weighing:create']
    },
    {
      label: 'items.weighingHistory',
      path: '/history',
      icon: 'clock',
      permissions: ['history:read']
    },
    {
      label: 'items.weighingReports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
  'GRADING': [
    {
      label: 'items.gradingDashboard',
      path: '/',
      icon: 'clipboard-check',
      permissions: ['dashboard:read']
    },
    {
      label: 'items.gradingInput',
      path: '/harvest',
      icon: 'plus-circle',
      permissions: ['grading:create']
    },
    {
      label: 'items.gradingHistory',
      path: '/history',
      icon: 'clock',
      permissions: ['history:read']
    },
    {
      label: 'items.gradingReports',
      path: '/reports',
      icon: 'file-text',
      permissions: ['reports:read']
    },
    {
      label: 'items.profile',
      path: '/profile',
      icon: 'user',
      permissions: ['profile:read']
    },
  ],
};

// Legacy export for backward compatibility - will be deprecated
export const ROLE_NAVIGATION = ROLE_SPECIFIC_NAVIGATION;

// Helper function to get navigation items for a role with permission filtering
export function getNavigationForRole(role: UserRole, userPermissions: string[] = []): NavigationCategory[] {
  // For now, return filtered navigation based on permissions
  // Role-specific filtering can be added here if needed
  return getFilteredNavigation(userPermissions);
}

// Legacy function for backward compatibility - returns legacy format
export function getLegacyNavigationForRole(role: UserRole, userPermissions: string[] = []): Array<{
  label: string;
  path: string;
  icon: string;
  permissions?: string[];
  badge?: string;
}> {
  const navigation = ROLE_SPECIFIC_NAVIGATION[role] || [];

  return navigation.filter(item => {
    if (!item.permissions || item.permissions.length === 0) {
      return true; // No permissions required
    }

    return item.permissions.some(permission => userPermissions.includes(permission));
  });
}

// Helper function to check nested navigation paths
function checkNestedPaths(children: any[], path: string): boolean {
  return children.some(child => {
    if (child.path === path) return true;
    if (child.children) {
      return checkNestedPaths(child.children, path);
    }
    return false;
  });
}

// Helper function to check if a role can access a specific path
export function canRoleAccessPath(role: UserRole, path: string): boolean {
  // Direct uppercase role lookup - roles are now consistent with backend format
  const navigation = ROLE_SPECIFIC_NAVIGATION[role] || [];

  // Check if the navigation array has any item with matching path
  const hasAccess = navigation.some(item => {
    if (item.path === path) return true;
    if ((item as any).children) {
      return checkNestedPaths((item as any).children, path);
    }
    return false;
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[canRoleAccessPath] Access check:', {
      role,
      path,
      navigationFound: navigation.length > 0,
      hasAccess,
      availablePaths: navigation.map(item => item.path)
    });
  }

  return hasAccess;
}

// Clean URL mappings for public routes
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// Helper function to check if user has any of the required permissions
function hasAnyPermission(userPermissions: string[], requiredPermissions: string[] = []): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

// Helper function to filter navigation based on user permissions
export function getFilteredNavigation(userPermissions: string[] = []): NavigationCategory[] {
  return HIERARCHICAL_NAVIGATION
    .filter(category => hasAnyPermission(userPermissions, category.permissions))
    .map(category => ({
      ...category,
      children: category.children
        ?.filter(child => hasAnyPermission(userPermissions, child.permissions))
        .map(child => ({
          ...child,
          children: child.children?.filter(subChild =>
            hasAnyPermission(userPermissions, subChild.permissions)
          )
        }))
        .filter(child => child.children && child.children.length > 0 || !child.children)
    }));
}


// Helper function to find a navigation item by path
export function findNavigationByPath(path: string, userPermissions: string[] = []): NavigationItem | null {
  const filteredNav = getFilteredNavigation(userPermissions);

  for (const category of filteredNav) {
    if (category.path === path) {
      return {
        id: category.id,
        title: category.title,
        icon: category.icon,
        path: category.path!,
        permissions: category.permissions,
        badge: category.badge
      };
    }

    if (category.children) {
      for (const child of category.children) {
        if (child.path === path) {
          return child;
        }

        if (child.children) {
          for (const subChild of child.children) {
            if (subChild.path === path) {
              return subChild;
            }
          }
        }
      }
    }
  }

  return null;
}

// Helper function to get parent navigation chain for breadcrumbs
export function getNavigationChain(path: string, userPermissions: string[] = []): NavigationItem[] {
  const filteredNav = getFilteredNavigation(userPermissions);
  const chain: NavigationItem[] = [];

  for (const category of filteredNav) {
    if (category.path === path) {
      chain.push({
        id: category.id,
        title: category.title,
        icon: category.icon,
        path: category.path!,
        permissions: category.permissions,
        badge: category.badge
      });
      return chain;
    }

    if (category.children) {
      for (const child of category.children) {
        if (child.path === path) {
          chain.push({
            id: category.id,
            title: category.title,
            icon: category.icon,
            path: category.path!,
            permissions: category.permissions,
            badge: category.badge
          });
          chain.push(child);
          return chain;
        }

        if (child.children) {
          for (const subChild of child.children) {
            if (subChild.path === path) {
              chain.push({
                id: category.id,
                title: category.title,
                icon: category.icon,
                path: category.path!,
                permissions: category.permissions,
                badge: category.badge
              });
              chain.push(child);
              chain.push(subChild);
              return chain;
            }
          }
        }
      }
    }
  }

  return chain;
}
