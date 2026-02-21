'use client';

import { gql } from 'graphql-tag';
import { User } from '@/types/auth';

// Types for dynamic feature system
export interface Feature {
  id: string;
  name: string;
  displayName: string;
  module: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  metadata: {
    resourceType?: string;
    actions?: string[];
    requiredScope?: string;
  };
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFeatureOverride {
  feature: string;
  isGranted: boolean;
  scope?: {
    type: string;
    id: string;
  };
  expiresAt?: string;
}

export interface UserFeatures {
  userId: string;
  role: string;
  features: string[];
  scopedFeatures?: Array<{
    feature: string;
    isGranted: boolean;
    scope: {
      type: string;
      id: string;
    };
    expiresAt?: string;
  }>;
}

export interface FeatureCheckResult {
  userId: string;
  feature: string;
  hasAccess: boolean;
  accessReason?: string;
  denialReason?: string;
}

export interface BatchFeatureCheckResult {
  userId: string;
  features: string[];
  hasAccess: boolean;
  grantedFeatures?: string[];
  deniedFeatures?: string[];
}

// Cache entry for feature checks
interface FeatureCacheEntry {
  result: boolean;
  timestamp: number;
  userHash: string;
  scopeHash?: string;
}

// GraphQL Queries and Mutations
const GET_USER_FEATURES = gql`
  query GetUserFeatures($userId: ID!, $scope: FeatureScopeInput) {
    getUserFeatures(userId: $userId, scope: $scope) {
      userId
      role
      features
      scopedFeatures {
        feature
        isGranted
        scope {
          type
          id
        }
        expiresAt
      }
      computedAt
      expiresAt
    }
  }
`;

const CHECK_USER_FEATURE = gql`
  query CheckUserFeature($input: FeatureCheckInput!) {
    checkUserFeature(input: $input) {
      userId
      feature
      hasAccess
      accessReason
      denialReason
      checkedAt
    }
  }
`;

const CHECK_USER_FEATURES = gql`
  query CheckUserFeatures($input: BatchFeatureCheckInput!) {
    checkUserFeatures(input: $input) {
      userId
      features
      hasAccess
      grantedFeatures
      deniedFeatures
    }
  }
`;

const GET_ROLES = gql`
  query GetRoles($activeOnly: Boolean) {
    roles(activeOnly: $activeOnly) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

const GRANT_USER_FEATURE = gql`
  mutation GrantUserFeature($input: GrantUserFeatureInput!) {
    grantUserFeature(input: $input) {
      id
      userId
      featureId
      feature {
        name
        displayName
        module
      }
      isGranted
      scopeType
      scopeId
      effectiveFrom
      expiresAt
      grantedBy
      reason
      createdAt
    }
  }
`;

const REVOKE_USER_FEATURE = gql`
  mutation RevokeUserFeature($input: RevokeUserFeatureInput!) {
    revokeUserFeature(input: $input)
  }
`;

class DynamicFeatureCache {
  private cache = new Map<string, FeatureCacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache TTL (longer than static system)
  private readonly MAX_ENTRIES = 2000;

  private generateUserHash(user: User): string {
    const userAny = user as any;
    return `${user.id}_${user.role}_${userAny.companyId || ''}_${userAny.updatedAt || ''}`;
  }

  private generateScopeHash(scope?: { type: string; id: string }): string {
    if (!scope) return 'no-scope';
    return `${scope.type}_${scope.id}`;
  }

  private generateCacheKey(userHash: string, permission: string, scopeHash: string): string {
    return `${userHash}_${permission}_${scopeHash}`;
  }

  get(user: User, permission: string, scope?: { type: string; id: string }): boolean | null {
    const userHash = this.generateUserHash(user);
    const scopeHash = this.generateScopeHash(scope);
    const cacheKey = this.generateCacheKey(userHash, permission, scopeHash);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > this.TTL || entry.userHash !== userHash) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  set(user: User, permission: string, result: boolean, scope?: { type: string; id: string }): void {
    // Implement simple LRU by clearing cache when it gets too large
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const userHash = this.generateUserHash(user);
    const scopeHash = this.generateScopeHash(scope);
    const cacheKey = this.generateCacheKey(userHash, permission, scopeHash);

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userHash,
      scopeHash,
    });
  }

  clearUserPermissions(userId: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith(`${userId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.TTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}

export class DynamicFeatureManager {
  private cache = new DynamicFeatureCache();
  private userFeatureCache = new Map<string, UserFeatures>();
  private roleHierarchyCache: Role[] | null = null;
  private apolloClient: any; // Apollo Client instance

  constructor(apolloClient: any) {
    this.apolloClient = apolloClient;

    // Cleanup expired cache entries every 10 minutes
    setInterval(() => {
      this.cache.cleanup();
    }, 10 * 60 * 1000);
  }

  // Core feature checking methods

  async hasFeature(user: User, feature: string, scope?: { type: string; id: string }): Promise<boolean> {
    if (!user || !user.id) {
      console.warn('[DynamicFeatureManager] Invalid user provided to hasFeature', { user, feature });
      return false;
    }

    if (!feature || typeof feature !== 'string') {
      console.warn('[DynamicFeatureManager] Invalid feature provided to hasFeature', { user, feature });
      return false;
    }

    // Check cache first
    const cached = this.cache.get(user, feature, scope);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await this.checkFeatureWithBackend(user.id, feature, scope);

      // Cache the result
      this.cache.set(user, feature, result, scope);

      return result;
    } catch (error) {
      console.error('[DynamicFeatureManager] Failed to check feature:', {
        userId: user.id,
        feature,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async hasAnyPermission(user: User, permissions: string[], scope?: { type: string; id: string }): Promise<boolean> {
    if (!permissions || permissions.length === 0) return false;

    try {
      const result = await this.checkFeaturesWithBackend(user.id, permissions, false);
      return result.hasAccess;
    } catch (error) {
      console.error('Failed to check any permissions:', error);

      // Fallback to individual checks if batch check fails
      for (const permission of permissions) {
        if (await this.hasFeature(user, permission, scope)) {
          return true;
        }
      }
      return false;
    }
  }

  async hasAllPermissions(user: User, permissions: string[], scope?: { type: string; id: string }): Promise<boolean> {
    if (!permissions || permissions.length === 0) return true;

    try {
      const result = await this.checkFeaturesWithBackend(user.id, permissions, true);
      return result.hasAccess;
    } catch (error) {
      console.error('Failed to check all permissions:', error);

      // Fallback to individual checks if batch check fails
      for (const permission of permissions) {
        if (!(await this.hasFeature(user, permission, scope))) {
          return false;
        }
      }
      return true;
    }
  }

  // User feature management

  async getUserFeatures(userId: string, forceRefresh: boolean = false): Promise<UserFeatures> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.userFeatureCache.has(userId)) {
      const cached = this.userFeatureCache.get(userId)!;

      // Check if cache is still valid (5 minutes)
      const cacheAge = Date.now() - new Date(cached.userId).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        return cached;
      }
    }

    try {
      const { data } = await this.apolloClient.query({
        query: GET_USER_FEATURES,
        variables: { userId },
        fetchPolicy: 'network-only',
      });

      const userFeatures = data.getUserFeatures;
      this.userFeatureCache.set(userId, userFeatures);

      return userFeatures;
    } catch (error) {
      console.error('Failed to get user features:', error);
      throw error;
    }
  }

  async refreshUserFeatures(userId: string): Promise<UserFeatures> {
    // Clear cache for this user
    this.cache.clearUserPermissions(userId);
    this.userFeatureCache.delete(userId);

    // Fetch fresh features
    return this.getUserFeatures(userId, true);
  }

  // Alias for backward compatibility
  async getUserPermissions(userId: string, forceRefresh: boolean = false): Promise<UserFeatures> {
    return this.getUserFeatures(userId, forceRefresh);
  }

  // Role management

  async getRoleHierarchy(): Promise<Role[]> {
    if (this.roleHierarchyCache) {
      return this.roleHierarchyCache;
    }

    try {
      const { data } = await this.apolloClient.query({
        query: GET_ROLES,
        variables: { activeOnly: true },
        fetchPolicy: 'cache-first',
      });

      this.roleHierarchyCache = data.roles;
      return data.roles;
    } catch (error) {
      console.error('Failed to get role hierarchy:', error);
      throw error;
    }
  }

  async canManageRole(user: User, targetRoleName: string): Promise<boolean> {
    if (!user || !targetRoleName) return false;

    try {
      const roleHierarchy = await this.getRoleHierarchy();
      const userRole = roleHierarchy.find(r => r.name === user.role);
      const targetRole = roleHierarchy.find(r => r.name === targetRoleName);

      if (!userRole || !targetRole) {
        return false;
      }

      // User can manage target if their level is lower (higher authority)
      return userRole.level < targetRole.level;
    } catch (error) {
      console.error('Failed to check role management permission:', error);
      return false;
    }
  }

  // Feature override management

  async grantUserFeature(
    userId: string,
    featureId: string,
    isGranted: boolean,
    scope?: { type: string; id: string },
    expiresAt?: Date,
    reason?: string
  ): Promise<void> {
    try {
      await this.apolloClient.mutate({
        mutation: GRANT_USER_FEATURE,
        variables: {
          input: {
            userId,
            featureId,
            isGranted,
            scopeType: scope?.type,
            scopeId: scope?.id,
            expiresAt,
            reason,
          },
        },
      });

      // Clear cache for this user to reflect changes
      this.cache.clearUserPermissions(userId);
      this.userFeatureCache.delete(userId);
    } catch (error) {
      console.error('Failed to grant user feature:', error);
      throw error;
    }
  }

  async revokeUserFeature(
    userId: string,
    featureId: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.apolloClient.mutate({
        mutation: REVOKE_USER_FEATURE,
        variables: {
          input: {
            userId,
            featureId,
            reason,
          },
        },
      });

      // Clear cache for this user
      this.cache.clearUserPermissions(userId);
      this.userFeatureCache.delete(userId);
    } catch (error) {
      console.error('Failed to revoke user feature:', error);
      throw error;
    }
  }

  // Utility methods

  clearCache(userId?: string): void {
    if (userId) {
      this.cache.clearUserPermissions(userId);
      this.userFeatureCache.delete(userId);
    } else {
      this.cache.clear();
      this.userFeatureCache.clear();
      this.roleHierarchyCache = null;
    }
  }

  getCacheStats(): { featureCache: any; userCache: number; roleCache: boolean } {
    return {
      featureCache: this.cache.getStats(),
      userCache: this.userFeatureCache.size,
      roleCache: this.roleHierarchyCache !== null,
    };
  }

  // Feature pattern matching (wildcard support)
  async hasWildcardFeature(user: User, pattern: string, scope?: { type: string; id: string }): Promise<boolean> {
    // This would require backend support for wildcard features
    // For now, check if user has features that match the pattern

    try {
      const userFeatures = await this.getUserFeatures(user.id);
      const featureRegex = new RegExp(pattern.replace('*', '.*'));

      return userFeatures.features.some(feature =>
        featureRegex.test(feature)
      );
    } catch (error) {
      console.error('Failed to check wildcard feature:', error);
      return false;
    }
  }

  // Helper method to validate permissions for UI components
  validateUIPermissions(user: User, requiredPermissions: {
    read?: string[];
    write?: string[];
    admin?: string[];
  }, scope?: { type: string; id: string }): {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
  } {
    // For immediate UI updates, use cached permissions synchronously
    // This assumes permissions have been pre-fetched
    const checkPermission = (perms?: string[]) => {
      if (!perms || perms.length === 0) return true;

      // Use cached results for immediate response
      return perms.some(permission => this.cache.get(user, permission, scope) === true);
    };

    return {
      canRead: checkPermission(requiredPermissions.read),
      canWrite: checkPermission(requiredPermissions.write),
      canAdmin: checkPermission(requiredPermissions.admin),
    };
  }

  // Private helper methods

  private async checkFeatureWithBackend(
    userId: string,
    feature: string,
    scope?: { type: string; id: string }
  ): Promise<boolean> {
    try {
      const { data } = await this.apolloClient.query({
        query: CHECK_USER_FEATURE,
        variables: {
          input: {
            userId,
            feature,
            scope,
          },
        },
        fetchPolicy: 'network-only',
      });

      // Add comprehensive null check for data and data.checkUserFeature
      if (!data || !data.checkUserFeature) {
        console.warn('[DynamicFeatureManager] Null response from checkUserFeature query', {
          userId,
          feature,
          data
        });
        return false;
      }

      return data.checkUserFeature.hasAccess;
    } catch (error) {
      console.error('[DynamicFeatureManager] checkFeatureWithBackend failed:', {
        userId,
        feature,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private async checkFeaturesWithBackend(
    userId: string,
    features: string[],
    requireAll: boolean
  ): Promise<BatchFeatureCheckResult> {
    try {
      const { data } = await this.apolloClient.query({
        query: CHECK_USER_FEATURES,
        variables: {
          input: {
            userId,
            features,
            requireAll,
          },
        },
        fetchPolicy: 'network-only',
      });

      // Add comprehensive null checks
      if (!data || !data.checkUserFeatures) {
        console.warn('[DynamicFeatureManager] Null response from checkUserFeatures query', {
          userId,
          features,
          data
        });

        // Return safe default structure
        return {
          userId,
          features,
          hasAccess: false,
          grantedFeatures: [],
          deniedFeatures: [...features],
        };
      }

      return data.checkUserFeatures;
    } catch (error) {
      console.error('[DynamicFeatureManager] checkFeaturesWithBackend failed:', {
        userId,
        features,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return safe default structure
      return {
        userId,
        features,
        hasAccess: false,
        grantedFeatures: [],
        deniedFeatures: [...features],
      };
    }
  }
}

// Singleton instance
let dynamicPermissionManager: DynamicFeatureManager | null = null;

export function getDynamicPermissionManager(apolloClient?: any): DynamicFeatureManager {
  if (!dynamicPermissionManager && apolloClient) {
    dynamicPermissionManager = new DynamicFeatureManager(apolloClient);
  }

  if (!dynamicPermissionManager) {
    throw new Error('DynamicFeatureManager not initialized. Please provide Apollo Client.');
  }

  return dynamicPermissionManager;
}

// React Hook for features
export function useDynamicFeatures(user: User | null) {
  // This would be implemented in a separate hooks file
  // For now, returning placeholder
  return {
    hasFeature: async (feature: string, scope?: { type: string; id: string }) => {
      if (!user) return false;
      const manager = getDynamicPermissionManager();
      return manager.hasFeature(user, feature, scope);
    },
    hasAnyPermission: async (permissions: string[], scope?: { type: string; id: string }) => {
      if (!user) return false;
      const manager = getDynamicPermissionManager();
      return manager.hasAnyPermission(user, permissions, scope);
    },
    hasAllPermissions: async (permissions: string[], scope?: { type: string; id: string }) => {
      if (!user) return false;
      const manager = getDynamicPermissionManager();
      return manager.hasAllPermissions(user, permissions, scope);
    },
  };
}

export default DynamicFeatureManager;