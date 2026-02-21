// Main auth exports
export { useAuth, AuthProvider } from './auth-provider';
export type { User, AuthSession } from '@/types/auth';

// Auth services
export { GraphQLOnlyAuthService } from './graphql-only-auth-service';
export { CookieAuthService } from './cookie-auth-service';

// Permission and validation - Unified Permission System
export { SafePermissionManager, createPermissionManager } from './safe-permission-manager';
export { EnhancedPermissionValidator } from './enhanced-permission-validator';
export { PermissionValidator } from './permission-validator';
export { DynamicFeatureManager, getDynamicPermissionManager } from './dynamic-permission-service';

// Types and interfaces
export type {
  IPermissionManager,
  PermissionScope,
  PermissionManagerOptions,
  PermissionValidationResult
} from './unified-permission-interface';

// Legacy exports (deprecated - use SafePermissionManager instead)
// Note: dynamic-feature-service.ts has been removed - use getDynamicPermissionManager from dynamic-permission-service
export { getDynamicPermissionManager as getDynamicFeatureManager } from './dynamic-permission-service';
export * from './permissions';
export * from './hierarchical-roles';

// Export for backward compatibility
export { PermissionManager } from './permissions';
