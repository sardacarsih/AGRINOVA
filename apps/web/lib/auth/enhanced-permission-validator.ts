import { User } from '@/types/auth';
import { DynamicFeatureManager } from './dynamic-permission-service';

export interface ValidationResult {
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
  cached: boolean; // Indicates if result came from cache
}

export interface ValidationContext {
  targetUser?: User;
  targetRole?: string;
  targetScope?: {
    companyId?: string;
    estateId?: string;
    divisionId?: string;
    blockId?: string;
  };
  action: 'create' | 'update' | 'delete' | 'view' | 'manage';
  resourceType?: string;
  resourceId?: string;
}

export interface PermissionOverride {
  permission: string;
  isGranted: boolean;
  scope?: {
    type: 'company' | 'estate' | 'division' | 'block';
    id: string;
  };
  expiresAt?: Date;
}

export interface EnhancedValidationOptions {
  allowCache?: boolean;
  includeWarnings?: boolean;
  validateScope?: boolean;
  checkOverrides?: boolean;
}

export class EnhancedPermissionValidator {
  private permissionManager: DynamicFeatureManager;

  constructor(permissionManager: DynamicFeatureManager) {
    this.permissionManager = permissionManager;
  }

  /**
   * Validate if current user has permission to perform action
   */
  async validatePermission(
    currentUser: User,
    permission: string,
    context?: ValidationContext,
    options: EnhancedValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      allowCache = true,
      includeWarnings = false,
      validateScope = true,
      checkOverrides = true,
    } = options;

    const result: ValidationResult = {
      isValid: false,
      hasPermission: false,
      errors: [],
      warnings: [],
      cached: false,
    };

    if (!currentUser || !currentUser.id) {
      result.errors.push('Invalid user provided');
      return result;
    }

    try {
      // Determine scope for permission check
      const permissionScope = this.determinePermissionScope(context);

      // Check permission using dynamic permission manager
      const hasPermission = await this.permissionManager.hasAnyPermission(
        currentUser,
        [permission],
        permissionScope
      );

      result.hasPermission = hasPermission;
      result.cached = true; // Would need to be set by the permission manager

      if (!hasPermission) {
        result.errors.push(`Permission '${permission}' required but not granted`);

        // Check if there are relevant overrides that might explain the denial
        if (checkOverrides) {
          const overrideExplanation = await this.explainPermissionDenial(
            currentUser,
            permission,
            permissionScope
          );
          if (overrideExplanation) {
            result.warnings.push(overrideExplanation);
          }
        }
      }

      // Validate hierarchical constraints if context provided
      if (hasPermission && context && validateScope) {
        const hierarchicalValidation = await this.validateHierarchicalConstraints(
          currentUser,
          context
        );

        if (!hierarchicalValidation.isValid) {
          result.isValid = false;
          result.errors.push(...hierarchicalValidation.errors);
          if (includeWarnings) {
            result.warnings.push(...hierarchicalValidation.warnings);
          }
        } else {
          result.isValid = true;
          if (includeWarnings && hierarchicalValidation.warnings.length > 0) {
            result.warnings.push(...hierarchicalValidation.warnings);
          }
        }
      } else {
        result.isValid = hasPermission;
      }

      // Set scope information if available
      if (context?.targetScope) {
        result.scope = {
          companyIds: context.targetScope.companyId ? [context.targetScope.companyId] : undefined,
          estateIds: context.targetScope.estateId ? [context.targetScope.estateId] : undefined,
          divisionIds: context.targetScope.divisionId ? [context.targetScope.divisionId] : undefined,
          blockIds: context.targetScope.blockId ? [context.targetScope.blockId] : undefined,
        };
      }

      return result;
    } catch (error) {
      console.error('Permission validation error:', error);
      result.errors.push('Failed to validate permission due to system error');
      return result;
    }
  }

  /**
   * Validate multiple permissions at once
   */
  async validatePermissions(
    currentUser: User,
    requiredPermissions: string[],
    context?: ValidationContext,
    options: { requireAll?: boolean } & EnhancedValidationOptions = {}
  ): Promise<ValidationResult> {
    const { requireAll = false, ...validationOptions } = options;

    const result: ValidationResult = {
      isValid: false,
      hasPermission: false,
      errors: [],
      warnings: [],
      cached: false,
    };

    if (requiredPermissions.length === 0) {
      result.isValid = true;
      result.hasPermission = true;
      return result;
    }

    try {
      const permissionScope = this.determinePermissionScope(context);

      let hasPermission: boolean;
      let failedPermissions: string[] = [];

      if (requireAll) {
        hasPermission = await this.permissionManager.hasAllPermissions(
          currentUser,
          requiredPermissions,
          permissionScope
        );

        if (!hasPermission) {
          // Find which permissions failed
          for (const permission of requiredPermissions) {
            const hasSinglePermission = await this.permissionManager.hasAnyPermission(
              currentUser,
              [permission],
              permissionScope
            );
            if (!hasSinglePermission) {
              failedPermissions.push(permission);
            }
          }
        }
      } else {
        hasPermission = await this.permissionManager.hasAnyPermission(
          currentUser,
          requiredPermissions,
          permissionScope
        );
      }

      result.hasPermission = hasPermission;

      if (!hasPermission) {
        if (requireAll) {
          result.errors.push(`All required permissions missing: ${failedPermissions.join(', ')}`);
        } else {
          result.errors.push(`None of the required permissions granted: ${requiredPermissions.join(', ')}`);
        }
      }

      // Additional validation if context provided
      if (hasPermission && context && validationOptions.validateScope) {
        const hierarchicalValidation = await this.validateHierarchicalConstraints(
          currentUser,
          context
        );

        if (!hierarchicalValidation.isValid) {
          result.isValid = false;
          result.errors.push(...hierarchicalValidation.errors);
        } else {
          result.isValid = true;
        }
      } else {
        result.isValid = hasPermission;
      }

      return result;
    } catch (error) {
      console.error('Multiple permission validation error:', error);
      result.errors.push('Failed to validate permissions due to system error');
      return result;
    }
  }

  /**
   * Validate role management permissions
   */
  async validateRoleManagement(
    currentUser: User,
    targetRole: string,
    targetUserId?: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      hasPermission: false,
      errors: [],
      warnings: [],
      cached: false,
    };

    try {
      // Check if user can manage the target role
      const canManageRole = await this.permissionManager.canManageRole(currentUser, targetRole);

      result.hasPermission = canManageRole;

      if (!canManageRole) {
        result.errors.push(`Insufficient authority to manage users with role '${targetRole}'`);

        // Get role hierarchy for better error message
        try {
          const roleHierarchy = await this.permissionManager.getRoleHierarchy();
          const userRole = roleHierarchy.find(r => r.name === currentUser.role);
          const targetRoleInfo = roleHierarchy.find(r => r.name === targetRole);

          if (userRole && targetRoleInfo) {
            result.errors.push(
              `Your role '${userRole.displayName}' (level ${userRole.level}) cannot manage '${targetRoleInfo.displayName}' (level ${targetRoleInfo.level})`
            );
          }
        } catch (hierarchyError) {
          console.warn('Failed to get role hierarchy for detailed error:', hierarchyError);
        }
      }

      // Additional validation if managing specific user
      if (canManageRole && targetUserId && currentUser.id === targetUserId) {
        result.warnings.push('You are attempting to modify your own role assignment');
      }

      result.isValid = canManageRole;
      return result;
    } catch (error) {
      console.error('Role management validation error:', error);
      result.errors.push('Failed to validate role management permissions');
      return result;
    }
  }

  /**
   * Validate resource-specific permissions with scope
   */
  async validateResourcePermission(
    currentUser: User,
    resourceType: string,
    action: string,
    resourceId?: string,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const permission = `${resourceType}:${action}`;

    // Create scope if resource ID is provided
    let permissionScope: { type: string; id: string } | undefined;
    if (resourceId) {
      permissionScope = {
        type: resourceType,
        id: resourceId,
      };
    }

    const validationContext: ValidationContext = {
      ...context,
      resourceType,
      resourceId,
    };

    return this.validatePermission(currentUser, permission, validationContext, {
      validateScope: true,
    });
  }

  /**
   * Get user's current permissions with override information
   */
  async getUserPermissionSummary(userId: string): Promise<{
    role: string;
    permissions: string[];
    overrides: PermissionOverride[];
    effectivePermissions: string[];
  }> {
    try {
      const userFeatures = await this.permissionManager.getUserPermissions(userId);

      // Calculate effective permissions (role features + overrides)
      const effectivePermissions = new Set(userFeatures.features);

      // Apply overrides
      const overrides: PermissionOverride[] = (userFeatures.scopedFeatures || [])
        .filter(sf => sf.scope)
        .map(override => ({
          permission: override.feature,
          isGranted: override.isGranted,
          scope: override.scope ? {
            type: override.scope.type as 'company' | 'estate' | 'division' | 'block',
            id: override.scope.id
          } : undefined,
          expiresAt: override.expiresAt ? new Date(override.expiresAt) : undefined,
        }));

      overrides.forEach(override => {
        if (override.isGranted) {
          effectivePermissions.add(override.permission);
        } else {
          effectivePermissions.delete(override.permission);
        }
      });

      return {
        role: userFeatures.role,
        permissions: userFeatures.features,
        overrides,
        effectivePermissions: Array.from(effectivePermissions),
      };
    } catch (error) {
      console.error('Failed to get user permission summary:', error);
      throw error;
    }
  }

  // Private helper methods

  private determinePermissionScope(context?: ValidationContext): { type: string; id: string } | undefined {
    if (!context?.targetScope) return undefined;

    // Prioritize more specific scopes
    if (context.targetScope.blockId) {
      return { type: 'block', id: context.targetScope.blockId };
    }
    if (context.targetScope.divisionId) {
      return { type: 'division', id: context.targetScope.divisionId };
    }
    if (context.targetScope.estateId) {
      return { type: 'estate', id: context.targetScope.estateId };
    }
    if (context.targetScope.companyId) {
      return { type: 'company', id: context.targetScope.companyId };
    }

    return undefined;
  }

  private async validateHierarchicalConstraints(
    currentUser: User,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      hasPermission: true,
      errors: [],
      warnings: [],
      cached: false,
    };

    try {
      // Validate role management constraints
      if (context.targetRole && context.action === 'manage') {
        const roleValidation = await this.validateRoleManagement(
          currentUser,
          context.targetRole,
          context.targetUser?.id
        );

        if (!roleValidation.isValid) {
          result.isValid = false;
          result.errors.push(...roleValidation.errors);
        }
        result.warnings.push(...roleValidation.warnings);
      }

      // Validate scope constraints
      if (context.targetScope) {
        const scopeValidation = await this.validateScopeConstraints(currentUser, context);
        if (!scopeValidation.isValid) {
          result.isValid = false;
          result.errors.push(...scopeValidation.errors);
        }
        result.warnings.push(...scopeValidation.warnings);
      }

      return result;
    } catch (error) {
      console.error('Hierarchical validation error:', error);
      result.isValid = false;
      result.errors.push('Failed to validate hierarchical constraints');
      return result;
    }
  }

  private async validateScopeConstraints(
    currentUser: User,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      hasPermission: true,
      errors: [],
      warnings: [],
      cached: false,
    };

    // This would implement scope-specific validation logic
    // For now, return valid result

    return result;
  }

  private async explainPermissionDenial(
    currentUser: User,
    permission: string,
    scope?: { type: string; id: string }
  ): Promise<string | null> {
    try {
      const userFeatures = await this.permissionManager.getUserPermissions(currentUser.id);

      // Check for explicit denial overrides in scopedFeatures
      const denialOverride = userFeatures.scopedFeatures?.find(
        override => !override.isGranted && override.feature === permission
      );

      if (denialOverride) {
        let explanation = `Permission '${permission}' is explicitly denied for this user`;
        if (denialOverride.scope) {
          explanation += ` for ${denialOverride.scope.type} ${denialOverride.scope.id}`;
        }
        if (denialOverride.expiresAt) {
          explanation += ` (expires ${new Date(denialOverride.expiresAt).toLocaleString()})`;
        }
        return explanation;
      }

      return null;
    } catch (error) {
      console.error('Failed to explain permission denial:', error);
      return null;
    }
  }
}

// React Hook for enhanced permission validation
export function useEnhancedPermissionValidator(permissionManager: DynamicFeatureManager) {
  const validator = new EnhancedPermissionValidator(permissionManager);

  return {
    validatePermission: (currentUser: User, permission: string, context?: ValidationContext, options?: EnhancedValidationOptions) =>
      validator.validatePermission(currentUser, permission, context, options),

    validatePermissions: (currentUser: User, permissions: string[], context?: ValidationContext, options?: { requireAll?: boolean } & EnhancedValidationOptions) =>
      validator.validatePermissions(currentUser, permissions, context, options),

    validateRoleManagement: (currentUser: User, targetRole: string, targetUserId?: string) =>
      validator.validateRoleManagement(currentUser, targetRole, targetUserId),

    validateResourcePermission: (currentUser: User, resourceType: string, action: string, resourceId?: string, context?: ValidationContext) =>
      validator.validateResourcePermission(currentUser, resourceType, action, resourceId, context),

    getUserPermissionSummary: (userId: string) =>
      validator.getUserPermissionSummary(userId),
  };
}

export default EnhancedPermissionValidator;