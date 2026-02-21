import { User, UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '@/types/auth';
import { HierarchicalRoleManager } from './hierarchical-roles';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  scope?: {
    companyIds?: string[];
    estateIds?: string[];
    divisionIds?: string[];
  };
}

interface ValidationContext {
  targetUser?: User;
  targetRole?: UserRole;
  targetScope?: {
    companyId?: string;
    estateId?: string;
    divisionId?: string;
  };
  action: 'create' | 'update' | 'delete' | 'view';
}

export class PermissionValidator {
  /**
   * Validate if current user has permission to perform action
   */
  static validatePermission(
    currentUser: User,
    permission: string,
    context?: ValidationContext
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    // Check if user has the required permission
    if (!currentUser.permissions.includes(permission)) {
      result.errors.push(`Permission '${permission}' required but not granted`);
      return result;
    }

    // Validate hierarchical constraints if context provided
    if (context) {
      const hierarchicalValidation = this.validateHierarchicalConstraints(
        currentUser,
        context
      );
      
      result.errors.push(...hierarchicalValidation.errors);
      result.warnings.push(...hierarchicalValidation.warnings);
      
      if (hierarchicalValidation.errors.length === 0) {
        result.isValid = true;
        result.scope = hierarchicalValidation.scope;
      }
    } else {
      result.isValid = true;
    }

    return result;
  }

  /**
   * Validate hierarchical constraints based on user scope and target
   */
  static validateHierarchicalConstraints(
    currentUser: User,
    context: ValidationContext
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      scope: {}
    };

    const currentUserLevel = this.getUserHierarchyLevel(currentUser.role);
    const targetLevel = context.targetRole 
      ? this.getUserHierarchyLevel(context.targetRole) 
      : undefined;

    // Check role hierarchy - can only manage lower or equal level roles
    if (targetLevel !== undefined && targetLevel < currentUserLevel) {
      result.errors.push(
        `Cannot manage ${context.targetRole} role - insufficient hierarchy level`
      );
      result.isValid = false;
    }

    // Validate scope constraints based on current user's role
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        // Super admin can manage anywhere
        result.scope = {
          companyIds: ['*'], // All companies
          estateIds: ['*'],  // All estates
          divisionIds: ['*'] // All divisions
        };
        break;

      case 'COMPANY_ADMIN':
        // Company admin restricted to their company
        if (context.targetScope?.companyId && 
            context.targetScope.companyId !== currentUser.companyId) {
          result.errors.push(
            'Cannot manage users outside your assigned company'
          );
          result.isValid = false;
        }
        result.scope = {
          companyIds: currentUser.companyId ? [currentUser.companyId] : [],
          estateIds: ['*'], // All estates within company
          divisionIds: ['*'] // All divisions within company
        };
        break;

      case 'AREA_MANAGER':
        // Area manager restricted to their company
        if (context.targetScope?.companyId && 
            context.targetScope.companyId !== currentUser.companyId) {
          result.errors.push(
            'Cannot manage users outside your assigned company'
          );
          result.isValid = false;
        }
        result.scope = {
          companyIds: currentUser.companyId ? [currentUser.companyId] : [],
          estateIds: ['*'], // Can manage multiple estates
          divisionIds: ['*'] // Can manage multiple divisions
        };
        break;

      case 'MANAGER':
        // Manager restricted to their company and estate
        if (context.targetScope?.companyId && 
            context.targetScope.companyId !== currentUser.companyId) {
          result.errors.push(
            'Cannot manage users outside your assigned company'
          );
          result.isValid = false;
        }
        if (context.targetScope?.estateId && 
            context.targetScope.estateId !== currentUser.estate) {
          result.errors.push(
            'Cannot manage users outside your assigned estate'
          );
          result.isValid = false;
        }
        result.scope = {
          companyIds: currentUser.companyId ? [currentUser.companyId] : [],
          estateIds: currentUser.estate ? [currentUser.estate] : [],
          divisionIds: ['*'] // Can manage all divisions in estate
        };
        break;

      case 'ASISTEN':
      case 'MANDOR':
      case 'SATPAM':
        // Field level users cannot manage others
        result.errors.push(
          `Role ${currentUser.role} does not have user management permissions`
        );
        result.isValid = false;
        break;
    }

    return result;
  }

  /**
   * Get hierarchy level for role (lower number = higher level)
   */
  static getUserHierarchyLevel(role: UserRole): number {
    const levels = {
      'SUPER_ADMIN': 0,
      'COMPANY_ADMIN': 1,
      'AREA_MANAGER': 2,
      'MANAGER': 3,
      'ASISTEN': 4,
      'MANDOR': 4,
      'SATPAM': 4,
      'TIMBANGAN': 4,
      'GRADING': 4,
    };
    return levels[role] ?? 99;
  }

  /**
   * Validate user assignment against current user's scope
   */
  static async validateUserAssignment(
    currentUser: User,
    targetUserData: Partial<User>
  ): Promise<ValidationResult> {
    const context: ValidationContext = {
      targetRole: targetUserData.role,
      targetScope: {
        companyId: targetUserData.companyId,
        estateId: targetUserData.estate,
        divisionId: targetUserData.divisi
      },
      action: 'create'
    };

    // Validate role management permission
    const roleManagePermission = this.getRoleManagementPermission(targetUserData.role);
    if (roleManagePermission) {
      const permissionValidation = this.validatePermission(
        currentUser,
        roleManagePermission,
        context
      );
      
      if (!permissionValidation.isValid) {
        return permissionValidation;
      }
    }

    // Additional business logic validations
    const businessValidation = await this.validateBusinessRules(
      currentUser,
      targetUserData,
      context
    );

    return {
      isValid: businessValidation.isValid,
      errors: businessValidation.errors,
      warnings: businessValidation.warnings,
      scope: businessValidation.scope
    };
  }

  /**
   * Get the permission required to manage a specific role
   */
  static getRoleManagementPermission(role?: UserRole): string | null {
    if (!role) return null;
    
    const permissionMap: Record<UserRole, string> = {
      'SUPER_ADMIN': PERMISSIONS.SUPER_ADMIN_ALL,
      'COMPANY_ADMIN': PERMISSIONS.MANAGE_COMPANY_ADMIN,
      'AREA_MANAGER': PERMISSIONS.MANAGE_AREA_MANAGER,
      'MANAGER': PERMISSIONS.MANAGE_MANAGER,
      'ASISTEN': PERMISSIONS.MANAGE_ASISTEN,
      'MANDOR': PERMISSIONS.MANAGE_MANDOR,
      'SATPAM': PERMISSIONS.MANAGE_SATPAM,
      'TIMBANGAN': PERMISSIONS.MANAGE_SATPAM,
      'GRADING': PERMISSIONS.MANAGE_SATPAM,
    };
    
    return permissionMap[role] || null;
  }

  /**
   * Validate business rules and constraints
   */
  static async validateBusinessRules(
    currentUser: User,
    targetUserData: Partial<User>,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Rule 1: Company Admin can only be assigned by Super Admin
    if (targetUserData.role === 'COMPANY_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      result.errors.push('Only Super Admin can assign Company Admin role');
      result.isValid = false;
    }

    // Rule 2: Cannot assign higher level role than current user
    if (context.targetRole) {
      const currentLevel = this.getUserHierarchyLevel(currentUser.role);
      const targetLevel = this.getUserHierarchyLevel(context.targetRole);
      
      if (targetLevel < currentLevel) {
        result.errors.push(
          `Cannot assign role ${context.targetRole} - higher level than your role`
        );
        result.isValid = false;
      }
    }

    // Rule 3: Estate/Division assignments must be within scope
    if (targetUserData.estate && currentUser.role !== 'SUPER_ADMIN') {
      if (currentUser.role === 'COMPANY_ADMIN' || currentUser.role === 'AREA_MANAGER') {
        // Can assign to any estate in their company
        if (targetUserData.companyId !== currentUser.companyId) {
          result.errors.push('Estate must be within your assigned company');
          result.isValid = false;
        }
      } else if (currentUser.role === 'MANAGER') {
        // Can only assign within their estate
        if (targetUserData.estate !== currentUser.estate) {
          result.errors.push('Can only assign users within your estate');
          result.isValid = false;
        }
      }
    }

    // Rule 4: Division assignments must be within estate scope
    if (targetUserData.divisi && targetUserData.estate) {
      // Would validate that division belongs to the estate
      // This would require actual data validation in real implementation
      result.warnings.push('Division assignment should be validated against estate');
    }

    // Rule 5: Role-specific constraints
    if (targetUserData.role === 'AREA_MANAGER' || targetUserData.role === 'MANAGER') {
      if (!targetUserData.companyId) {
        result.errors.push(`${targetUserData.role} must be assigned to a company`);
        result.isValid = false;
      }
    }

    if (targetUserData.role === 'MANAGER') {
      if (!targetUserData.estate) {
        result.errors.push('Manager must be assigned to an estate');
        result.isValid = false;
      }
    }

    if (['ASISTEN', 'MANDOR'].includes(targetUserData.role || '')) {
      if (!targetUserData.companyId || !targetUserData.estate || !targetUserData.divisi) {
        result.errors.push(
          `${targetUserData.role} must be assigned to company, estate, and division`
        );
        result.isValid = false;
      }
    }

    if (targetUserData.role === 'SATPAM') {
      if (!targetUserData.companyId || !targetUserData.estate) {
        result.errors.push('Satpam must be assigned to company and estate');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Get effective scope for user based on their role and assignments
   */
  static getEffectiveScope(user: User): {
    companies: string[];
    estates: string[];
    divisions: string[];
  } {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return {
          companies: ['*'],
          estates: ['*'],
          divisions: ['*']
        };
      
      case 'COMPANY_ADMIN':
      case 'AREA_MANAGER':
        return {
          companies: user.companyId ? [user.companyId] : [],
          estates: ['*'], // All estates in company
          divisions: ['*'] // All divisions in company
        };
      
      case 'MANAGER':
        return {
          companies: user.companyId ? [user.companyId] : [],
          estates: user.estate ? [user.estate] : [],
          divisions: ['*'] // All divisions in estate
        };
      
      case 'ASISTEN':
      case 'MANDOR':
        return {
          companies: user.companyId ? [user.companyId] : [],
          estates: user.estate ? [user.estate] : [],
          divisions: user.divisi ? [user.divisi] : []
        };
      
      case 'SATPAM':
        return {
          companies: user.companyId ? [user.companyId] : [],
          estates: user.estate ? [user.estate] : [],
          divisions: ['*'] // Can work across divisions in estate
        };
      
      default:
        return {
          companies: [],
          estates: [],
          divisions: []
        };
    }
  }

  /**
   * Check if user can access specific resource
   */
  static canAccessResource(
    user: User,
    resource: {
      companyId?: string;
      estateId?: string;
      divisionId?: string;
    }
  ): boolean {
    const scope = this.getEffectiveScope(user);
    
    // Check company access
    if (resource.companyId) {
      if (!scope.companies.includes('*') && !scope.companies.includes(resource.companyId)) {
        return false;
      }
    }
    
    // Check estate access
    if (resource.estateId) {
      if (!scope.estates.includes('*') && !scope.estates.includes(resource.estateId)) {
        return false;
      }
    }
    
    // Check division access
    if (resource.divisionId) {
      if (!scope.divisions.includes('*') && !scope.divisions.includes(resource.divisionId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get list of resources user can manage based on their role
   */
  static async getManageableResources(user: User): Promise<{
    companies: string[];
    estates: string[];
    divisions: string[];
  }> {
    const scope = this.getEffectiveScope(user);
    
    // In real implementation, this would query the database
    // For now, return the scope as-is
    return {
      companies: scope.companies,
      estates: scope.estates,
      divisions: scope.divisions
    };
  }
}