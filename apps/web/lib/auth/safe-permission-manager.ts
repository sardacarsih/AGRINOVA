'use client';

import type { User } from '@/types/auth';
import type {
  IPermissionManager,
  PermissionScope,
  PermissionManagerOptions
} from './unified-permission-interface';
import type { UserFeatures } from './dynamic-permission-service';

export class SafePermissionManager implements IPermissionManager {
  private manager: any = null;
  private initializationPromise: Promise<void> | null = null;
  private apolloClient: any;
  private options: PermissionManagerOptions;
  private isInitialized = false;
  private initializationError: Error | null = null;

  constructor(apolloClient: any, options: PermissionManagerOptions = {}) {
    this.apolloClient = apolloClient;
    this.options = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      fallbackOnError: true,
      retryAttempts: 3,
      ...options,
    };
    // DO NOT call initialize() here - it must be called explicitly via init()
  }

  /**
   * Explicitly initialize the permission manager
   * MUST be called after construction and MUST be awaited
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('[PermissionManager] Already initialized, skipping');
      return;
    }

    if (this.initializationPromise) {
      console.log('[PermissionManager] Initialization in progress, waiting...');
      return this.initializationPromise;
    }

    console.log('[PermissionManager] Starting initialization...');
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    console.log('[PermissionManager] Initialization complete');
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[PermissionManager] Apollo Client:', this.apolloClient ? '✅ Present' : '❌ Missing');

      // Validate Apollo Client
      if (!this.apolloClient) {
        throw new Error('Apollo Client is required for permission manager initialization');
      }

      // Test Apollo Client connectivity with health check
      console.log('[PermissionManager] Running Apollo health check...');
      try {
        const { checkApolloHealth } = await import('../apollo/health-check');
        const healthStatus = await checkApolloHealth(this.apolloClient);

        console.log('[PermissionManager] Apollo health:', {
          healthy: healthStatus.healthy,
          endpoint: healthStatus.endpoint,
          latency: healthStatus.latency ? `${healthStatus.latency}ms` : 'N/A',
          error: healthStatus.error
        });

        if (!healthStatus.healthy) {
          throw new Error(`Apollo Client health check failed: ${healthStatus.error}`);
        }
      } catch (healthError) {
        console.error('[PermissionManager] Apollo health check failed:', healthError);
        throw new Error(`Apollo Client cannot connect to GraphQL endpoint: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
      }

      // Import the DynamicFeatureManager
      console.log('[PermissionManager] Loading DynamicFeatureManager...');
      const { DynamicFeatureManager } = await import('./dynamic-permission-service');

      // Create the manager instance
      this.manager = new DynamicFeatureManager(this.apolloClient);
      this.isInitialized = true;
      this.initializationError = null;

      console.log('[PermissionManager] ✅ Initialization complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PermissionManager] ❌ Initialization failed:', {
        error: errorMessage,
        fallbackEnabled: this.options.fallbackOnError
      });

      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.isInitialized = false;

      // If fallback is enabled, try to use static permission manager
      if (this.options.fallbackOnError) {
        console.warn('[PermissionManager] Attempting fallback to static permission manager');
        try {
          const { PermissionManager } = await import('./permissions');
          this.manager = PermissionManager;
          console.log('[PermissionManager] ✅ Fallback to static permission manager successful');
        } catch (fallbackError) {
          console.error('[PermissionManager] ❌ Fallback also failed:', fallbackError);
        }
      }
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }

    await this.initializationPromise;
    return this.isInitialized;
  }

  private async safeExecute<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    errorMessage: string
  ): Promise<T> {
    try {
      const isReady = await this.ensureInitialized();

      if (!isReady) {
        console.error(`SafePermissionManager: ${errorMessage} - Manager initialization failed`);
        if (this.initializationError) {
          console.error('SafePermissionManager: Initialization error details:', this.initializationError);
        }
        return fallbackValue;
      }

      if (!this.manager) {
        console.error(`SafePermissionManager: ${errorMessage} - Manager is null after initialization`);
        return fallbackValue;
      }

      // Add operation validation before execution
      if (typeof operation !== 'function') {
        console.error(`SafePermissionManager: ${errorMessage} - Operation is not a function`);
        return fallbackValue;
      }

      // Add manager health check
      if (typeof this.manager !== 'object') {
        console.error(`SafePermissionManager: ${errorMessage} - Manager is not an object`);
        return fallbackValue;
      }

      return await operation();
    } catch (error) {
      console.error(`SafePermissionManager: ${errorMessage}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        managerType: this.manager?.constructor?.name,
        isInitialized: this.isInitialized
      });

      if (this.options.fallbackOnError) {
        return fallbackValue;
      }
      throw error;
    }
  }

  async hasPermission(user: User, permission: string, scope?: PermissionScope): Promise<boolean> {
    // SUPER_ADMIN bypass for critical system permissions
    if (user?.role === 'SUPER_ADMIN' && this._isSystemPermission(permission)) {
      console.log(`[SafePermissionManager] SUPER_ADMIN bypass for system permission: ${permission}`);
      return true;
    }

    return this.safeExecute(
      async () => {
        if (typeof this.manager.hasPermission === 'function') {
          return await this.manager.hasPermission(user, permission, scope);
        }
        // Fallback to hasFeature if hasPermission is not available
        return await this.hasFeature(user, permission, scope);
      },
      false,
      `Error checking permission: ${permission}`
    );
  }

  private _isSystemPermission(permission: string): boolean {
    const systemPermissions = [
      'rbac.read',
      'rbac.manage',
      'rbac.write',
      'system.config',
      'system.logs',
      'user.manage',
      'company.manage',
      'super_admin.all'
    ];

    return systemPermissions.some(sysPerm =>
      permission === sysPerm ||
      permission.startsWith('rbac.') ||
      permission.startsWith('system.')
    );
  }

  async hasAnyPermission(user: User, permissions: string[], scope?: PermissionScope): Promise<boolean> {
    if (!permissions || permissions.length === 0) return true;

    return this.safeExecute(
      async () => {
        if (typeof this.manager.hasAnyPermission === 'function') {
          return await this.manager.hasAnyPermission(user, permissions, scope);
        }
        // Fallback to individual checks
        for (const permission of permissions) {
          if (await this.hasPermission(user, permission, scope)) {
            return true;
          }
        }
        return false;
      },
      false,
      `Error checking any permissions: [${permissions.join(', ')}]`
    );
  }

  async hasAllPermissions(user: User, permissions: string[], scope?: PermissionScope): Promise<boolean> {
    if (!user || !permissions || permissions.length === 0) {
      return permissions.length === 0; // Empty permissions = true
    }

    // SUPER_ADMIN bypass for system permissions
    if (user.role === 'SUPER_ADMIN' && this._isSystemPermissionArray(permissions)) {
      console.log(`[SafePermissionManager] SUPER_ADMIN bypass for system permissions: [${permissions.join(', ')}]`);
      return true;
    }

    return this.safeExecute(
      async () => {
        if (typeof this.manager.hasAllPermissions === 'function') {
          return await this.manager.hasAllPermissions(user, permissions, scope);
        }
        // Fallback to individual checks
        for (const permission of permissions) {
          if (!(await this.hasPermission(user, permission, scope))) {
            return false;
          }
        }
        return true;
      },
      false,
      `Error checking all permissions: [${permissions.join(', ')}]`
    );
  }

  private _isSystemPermissionArray(permissions: string[]): boolean {
    const systemPermissions = [
      'rbac.read',
      'rbac.manage',
      'rbac.write',
      'system.config',
      'system.logs',
      'user.manage',
      'company.manage',
      'super_admin.all'
    ];

    return permissions.every(perm =>
      systemPermissions.some(sysPerm =>
        perm === sysPerm ||
        perm.startsWith('rbac.') ||
        perm.startsWith('system.')
      )
    );
  }

  async hasFeature(user: User, feature: string, scope?: PermissionScope): Promise<boolean> {
    if (!user || !feature) return false;

    return this.safeExecute(
      async () => {
        if (typeof this.manager.hasFeature === 'function') {
          return await this.manager.hasFeature(user, feature, scope);
        }
        // Fallback to hasPermission
        return await this.hasPermission(user, feature, scope);
      },
      false,
      `Error checking feature: ${feature}`
    );
  }

  async checkUserFeature(userId: string, feature: string, scope?: PermissionScope): Promise<boolean> {
    if (!userId || !feature) return false;

    return this.safeExecute(
      async () => {
        if (typeof this.manager.checkUserFeature === 'function') {
          return await this.manager.checkUserFeature(userId, feature, scope);
        }
        // Create a mock user object and use hasFeature
        const mockUser = { id: userId } as User;
        return await this.hasFeature(mockUser, feature, scope);
      },
      false,
      `Error checking user feature: ${feature} for user: ${userId}`
    );
  }

  async getUserFeatures(userId: string, forceRefresh: boolean = false): Promise<UserFeatures> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return this.safeExecute(
      async () => {
        if (typeof this.manager.getUserFeatures === 'function') {
          return await this.manager.getUserFeatures(userId, forceRefresh);
        }
        if (typeof this.manager.getUserPermissions === 'function') {
          return await this.manager.getUserPermissions(userId, forceRefresh);
        }
        // Return minimal user features as fallback
        return {
          userId,
          role: 'unknown',
          features: [],
          scopedFeatures: [],
        };
      },
      {
        userId,
        role: 'unknown',
        features: [],
        scopedFeatures: [],
      },
      `Error getting user features for: ${userId}`
    );
  }

  async getUserPermissions(userId: string, forceRefresh: boolean = false): Promise<UserFeatures> {
    return this.getUserFeatures(userId, forceRefresh);
  }

  async canManageRole(user: User, targetRoleName: string): Promise<boolean> {
    if (!user || !targetRoleName) return false;

    return this.safeExecute(
      async () => {
        if (typeof this.manager.canManageRole === 'function') {
          return await this.manager.canManageRole(user, targetRoleName);
        }
        // Basic fallback: check if user has admin permissions
        return await this.hasPermission(user, 'rbac.manage');
      },
      false,
      `Error checking role management for: ${targetRoleName}`
    );
  }

  async getRoleHierarchy(): Promise<any[]> {
    return this.safeExecute(
      async () => {
        if (typeof this.manager.getRoleHierarchy === 'function') {
          return await this.manager.getRoleHierarchy();
        }
        return [];
      },
      [],
      'Error getting role hierarchy'
    );
  }

  clearCache(userId?: string): void {
    try {
      if (this.manager && typeof this.manager.clearCache === 'function') {
        this.manager.clearCache(userId);
      }
    } catch (error) {
      console.error('SafePermissionManager: Error clearing cache:', error);
    }
  }

  validateUIPermissions(user: User, requiredPermissions: {
    read?: string[];
    write?: string[];
    admin?: string[];
  }, scope?: PermissionScope): {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
  } {
    // For immediate UI updates, this method should be synchronous
    // Since our permission checks are async, we'll provide a basic implementation
    // In a real implementation, this should use cached permissions
    const checkPermission = (permissions?: string[]): boolean => {
      if (!permissions || permissions.length === 0) return true;
      // This is a simplified check - in production, this should use cached results
      return user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN';
    };

    return {
      canRead: checkPermission(requiredPermissions.read),
      canWrite: checkPermission(requiredPermissions.write),
      canAdmin: checkPermission(requiredPermissions.admin),
    };
  }

  // Utility methods for debugging and monitoring
  getInitializationStatus(): {
    isInitialized: boolean;
    hasError: boolean;
    error?: string;
    managerType: string;
  } {
    return {
      isInitialized: this.isInitialized,
      hasError: !!this.initializationError,
      error: this.initializationError?.message,
      managerType: this.manager?.constructor?.name || 'None',
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      initialized: boolean;
      managerAvailable: boolean;
      lastError?: string;
    };
  }> {
    try {
      const initialized = await this.ensureInitialized();
      const managerAvailable = !!this.manager;

      if (initialized && managerAvailable) {
        return {
          status: 'healthy',
          details: {
            initialized,
            managerAvailable,
          },
        };
      } else if (this.options.fallbackOnError) {
        return {
          status: 'degraded',
          details: {
            initialized,
            managerAvailable,
            lastError: this.initializationError?.message,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          details: {
            initialized,
            managerAvailable,
            lastError: this.initializationError?.message,
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          initialized: false,
          managerAvailable: false,
          lastError: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

// Factory function for creating permission managers
// IMPORTANT: This is now an async function and MUST be awaited
export async function createPermissionManager(
  apolloClient: any,
  options?: PermissionManagerOptions
): Promise<SafePermissionManager> {
  console.log('[PermissionManager Factory] Creating new permission manager...');
  const manager = new SafePermissionManager(apolloClient, options);
  await manager.init(); // CRITICAL: Await initialization
  console.log('[PermissionManager Factory] ✅ Permission manager ready');
  return manager;
}

export default SafePermissionManager;