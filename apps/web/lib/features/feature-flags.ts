import { UserRole } from '@/types/auth';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  roles?: UserRole[];
  permissions?: string[];
  environment?: 'development' | 'staging' | 'production';
}

// Feature flag definitions
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Dashboard Features
  UNIFIED_DASHBOARD: {
    id: 'unified_dashboard',
    name: 'Unified Dashboard',
    description: 'Single entry point dashboard with role-based routing',
    enabled: true,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM'],
  },
  
  ROLE_BASED_NAVIGATION: {
    id: 'role_based_navigation',
    name: 'Role-Based Navigation',
    description: 'Dynamic navigation based on user role and permissions',
    enabled: true,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM'],
  },

  // Super Admin Features
  SUPER_ADMIN_ANALYTICS: {
    id: 'super_admin_analytics',
    name: 'Super Admin Analytics',
    description: 'Advanced analytics and system monitoring',
    enabled: true,
    roles: ['SUPER_ADMIN'],
    permissions: ['super_admin:all'],
  },

  COMPANY_MANAGEMENT: {
    id: 'company_management',
    name: 'Company Management',
    description: 'Create, edit, and manage companies',
    enabled: true,
    roles: ['SUPER_ADMIN'],
    permissions: ['company:create', 'company:update', 'company:delete'],
  },

  // Company Admin Features
  MASTER_DATA_MANAGEMENT: {
    id: 'master_data_management',
    name: 'Master Data Management',
    description: 'Manage estates, divisions, blocks, and employees',
    enabled: true,
    roles: ['COMPANY_ADMIN'],
    permissions: ['company_admin:all'],
  },

  USER_MANAGEMENT: {
    id: 'user_management',
    name: 'User Management',
    description: 'Create and manage users within company scope',
    enabled: true,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER'],
    permissions: ['user:manage'],
  },

  // Area Manager Features
  MULTI_COMPANY_VIEW: {
    id: 'multi_company_view',
    name: 'Multi-Company View',
    description: 'View and compare data across multiple companies',
    enabled: true,
    roles: ['AREA_MANAGER'],
    permissions: ['area_manager:all'],
  },

  EXECUTIVE_REPORTS: {
    id: 'executive_reports',
    name: 'Executive Reports',
    description: 'High-level reports and analytics',
    enabled: true,
    roles: ['SUPER_ADMIN', 'AREA_MANAGER'],
    permissions: ['report:executive'],
  },

  // Manager Features
  ESTATE_OVERVIEW: {
    id: 'estate_overview',
    name: 'Estate Overview',
    description: 'Comprehensive estate monitoring and reporting',
    enabled: true,
    roles: ['MANAGER'],
    permissions: ['manager:all'],
  },

  HARVEST_ANALYTICS: {
    id: 'harvest_analytics',
    name: 'Harvest Analytics',
    description: 'Detailed harvest performance analytics',
    enabled: true,
    roles: ['MANAGER', 'AREA_MANAGER'],
    permissions: ['harvest:analytics'],
  },

  // Asisten Features
  HARVEST_APPROVAL: {
    id: 'harvest_approval',
    name: 'Harvest Approval',
    description: 'Approve or reject harvest data submissions',
    enabled: true,
    roles: ['ASISTEN'],
    permissions: ['approval:approve', 'approval:reject'],
  },

  BULK_APPROVAL: {
    id: 'bulk_approval',
    name: 'Bulk Approval',
    description: 'Approve multiple harvest records at once',
    enabled: false, // Disabled for now
    roles: ['ASISTEN'],
    permissions: ['approval:bulk'],
  },

  // Mandor Features
  HARVEST_INPUT: {
    id: 'harvest_input',
    name: 'Harvest Data Input',
    description: 'Input harvest data for workers and blocks',
    enabled: true,
    roles: ['MANDOR'],
    permissions: ['harvest:create'],
  },

  WORKER_MANAGEMENT: {
    id: 'worker_management',
    name: 'Worker Management',
    description: 'Manage field workers and their assignments',
    enabled: true,
    roles: ['MANDOR'],
    permissions: ['worker:manage'],
  },

  OFFLINE_SYNC: {
    id: 'offline_sync',
    name: 'Offline Synchronization',
    description: 'Offline data entry with automatic sync',
    enabled: false, // Will be enabled later
    roles: ['MANDOR'],
  },

  // Satpam Features
  GATE_CHECK: {
    id: 'gate_check',
    name: 'Gate Check System',
    description: 'Vehicle entry/exit monitoring',
    enabled: true,
    roles: ['SATPAM'],
    permissions: ['gate_check:create'],
  },

  QR_SCANNING: {
    id: 'qr_scanning',
    name: 'QR Code Scanning',
    description: 'QR-based vehicle and visitor management',
    enabled: true,
    roles: ['SATPAM'],
    permissions: ['gate_check:qr_scan'],
  },

  // General Features
  REAL_TIME_NOTIFICATIONS: {
    id: 'real_time_notifications',
    name: 'Real-Time Notifications',
    description: 'WebSocket-based real-time updates',
    enabled: true,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR'],
  },

  MOBILE_RESPONSIVE: {
    id: 'mobile_responsive',
    name: 'Mobile Responsive Design',
    description: 'Optimized mobile experience',
    enabled: true,
  },

  DARK_MODE: {
    id: 'dark_mode',
    name: 'Dark Mode Theme',
    description: 'Dark theme support',
    enabled: true,
  },
};

// Feature flag manager
export class FeatureFlagManager {
  static isFeatureEnabled(
    flagId: string, 
    userRole?: UserRole, 
    userPermissions?: string[]
  ): boolean {
    const flag = FEATURE_FLAGS[flagId];
    
    if (!flag) {
      console.warn(`Feature flag not found: ${flagId}`);
      return false;
    }

    // Check if feature is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check environment (if specified)
    if (flag.environment) {
      const currentEnv = process.env.NODE_ENV as 'development' | 'staging' | 'production';
      if (flag.environment !== currentEnv) {
        return false;
      }
    }

    // Check role requirement
    if (flag.roles && userRole) {
      if (!flag.roles.includes(userRole)) {
        return false;
      }
    }

    // Check permission requirement
    if (flag.permissions && userPermissions) {
      const hasPermission = flag.permissions.some(permission => 
        userPermissions.includes(permission)
      );
      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  static getAvailableFeatures(
    userRole?: UserRole, 
    userPermissions?: string[]
  ): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(flag => 
      this.isFeatureEnabled(flag.id, userRole, userPermissions)
    );
  }

  static getFeaturesForRole(role: UserRole): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(flag => {
      if (!flag.roles) return true;
      return flag.roles.includes(role);
    });
  }

  // Development utilities
  static getAllFlags(): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS);
  }

  static toggleFeature(flagId: string, enabled: boolean): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Feature flag toggling is only available in development');
      return;
    }

    const flag = FEATURE_FLAGS[flagId];
    if (flag) {
      flag.enabled = enabled;
      console.log(`Feature flag ${flagId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}