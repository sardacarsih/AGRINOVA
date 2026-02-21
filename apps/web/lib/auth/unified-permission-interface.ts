'use client';

import { User } from '@/types/auth';
import type { UserFeatures } from './dynamic-permission-service';

export interface PermissionScope {
  type: 'company' | 'estate' | 'division' | 'block';
  id: string;
}

export interface IPermissionManager {
  // Core permission checking methods
  hasPermission(user: User, permission: string, scope?: PermissionScope): Promise<boolean>;
  hasAnyPermission(user: User, permissions: string[], scope?: PermissionScope): Promise<boolean>;
  hasAllPermissions(user: User, permissions: string[], scope?: PermissionScope): Promise<boolean>;

  // Feature checking methods (for backward compatibility)
  hasFeature?(user: User, feature: string, scope?: PermissionScope): Promise<boolean>;
  checkUserFeature?(userId: string, feature: string, scope?: PermissionScope): Promise<boolean>;

  // User feature management
  getUserFeatures?(userId: string, forceRefresh?: boolean): Promise<UserFeatures>;
  getUserPermissions?(userId: string, forceRefresh?: boolean): Promise<UserFeatures>;

  // Role management
  canManageRole?(user: User, targetRoleName: string): Promise<boolean>;
  getRoleHierarchy?(): Promise<any[]>;

  // Cache management
  clearCache?(userId?: string): void;

  // Utility methods
  validateUIPermissions?(user: User, requiredPermissions: {
    read?: string[];
    write?: string[];
    admin?: string[];
  }, scope?: PermissionScope): {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
  };
}

export interface PermissionManagerOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  fallbackOnError?: boolean;
  retryAttempts?: number;
}

export interface PermissionValidationResult {
  isValid: boolean;
  hasPermission: boolean;
  errors: string[];
  warnings: string[];
  scope?: {
    companyIds?: string[];
    estateIds?: string[];
    divisionIds?: string[];
    blockIds?: string[];
  };
  cached: boolean;
}

export default IPermissionManager;