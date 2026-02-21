import { User, PERMISSIONS } from '@/types/auth';

/**
 * Area Manager Permission Validator
 * 
 * This module contains functions to validate Area Manager permissions
 * and ensure super-admin exclusive control over Area Manager assignments.
 */

export class AreaManagerPermissionValidator {
  /**
   * Check if user can manage Area Manager assignments
   * Only super-admin can assign/modify Area Manager company assignments
   */
  static canManageAreaManagerAssignments(user: User): boolean {
    return user.role === 'SUPER_ADMIN' && user.permissions.includes(PERMISSIONS.ASSIGN_AREA_MANAGER_COMPANIES);
  }

  /**
   * Check if user can view Area Manager assignments
   * Only super-admin can view Area Manager company assignment details
   */
  static canViewAreaManagerAssignments(user: User): boolean {
    return user.role === 'SUPER_ADMIN' && user.permissions.includes(PERMISSIONS.VIEW_AREA_MANAGER_ASSIGNMENTS);
  }

  /**
   * Validate Area Manager assignment permissions
   * Throws error if user doesn't have required permissions
   */
  static validateAreaManagerAssignmentPermissions(user: User): void {
    if (!this.canManageAreaManagerAssignments(user)) {
      throw new Error('Hanya super-admin yang dapat mengelola assignment Area Manager ke multiple perusahaan');
    }
  }

  /**
   * Validate Area Manager viewing permissions
   * Throws error if user doesn't have required permissions
   */
  static validateAreaManagerViewPermissions(user: User): void {
    if (!this.canViewAreaManagerAssignments(user)) {
      throw new Error('Hanya super-admin yang dapat melihat detail assignment Area Manager');
    }
  }

  /**
   * Check if Area Manager user is valid for multi-company assignments
   */
  static isValidAreaManagerUser(targetUser: User): boolean {
    return targetUser.role === 'AREA_MANAGER' && (targetUser as any).status === 'active';
  }

  /**
   * Validate Area Manager user for assignments
   * Throws error if user is not valid for multi-company assignments
   */
  static validateAreaManagerUser(targetUser: User): void {
    if (!this.isValidAreaManagerUser(targetUser)) {
      throw new Error('User harus memiliki role Area Manager dan status aktif untuk multi-company assignment');
    }
  }

  /**
   * Create audit trail entry for Area Manager assignment changes
   */
  static createAssignmentAuditEntry(
    currentUser: User,
    targetUser: User,
    operation: 'ASSIGN' | 'UNASSIGN' | 'UPDATE',
    companyIds: string[],
    additionalData?: any
  ) {
    return {
      timestamp: new Date(),
      performedBy: {
        userId: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        email: currentUser.email
      },
      targetUser: {
        userId: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
        email: targetUser.email
      },
      operation,
      companyIds,
      additionalData,
      securityLevel: 'HIGH', // Area Manager assignments are high-security operations
      requiresApproval: false, // Super-admin operations don't need additional approval
      ipAddress: null, // Would be populated by middleware in real implementation
      userAgent: null // Would be populated by middleware in real implementation
    };
  }

  /**
   * Validate company assignment permissions
   * Ensures all companies in assignment are valid and accessible
   */
  static async validateCompanyAssignmentPermissions(
    currentUser: User,
    companyIds: string[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Super-admin validation
    if (!this.canManageAreaManagerAssignments(currentUser)) {
      errors.push('Tidak memiliki permission untuk mengubah assignment Area Manager');
    }

    // Basic validation
    if (!companyIds || companyIds.length === 0) {
      errors.push('Minimal satu perusahaan harus dipilih untuk assignment');
    }

    // Check for duplicate company IDs
    const uniqueCompanyIds = [...new Set(companyIds)];
    if (uniqueCompanyIds.length !== companyIds.length) {
      errors.push('Ditemukan duplikat perusahaan dalam assignment');
    }

    // TODO: In real implementation, validate that companies exist and are active
    // This would involve database queries to verify company status

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get permission summary for Area Manager assignment operations
   */
  static getPermissionSummary(user: User): {
    canManageAssignments: boolean;
    canViewAssignments: boolean;
    canCreateAreaManager: boolean;
    canModifyAreaManager: boolean;
    canDeleteAreaManager: boolean;
    effectiveRole: string;
    restrictionLevel: 'NONE' | 'COMPANY' | 'ESTATE' | 'DIVISION';
  } {
    return {
      canManageAssignments: this.canManageAreaManagerAssignments(user),
      canViewAssignments: this.canViewAreaManagerAssignments(user),
      canCreateAreaManager: user.permissions.includes(PERMISSIONS.MANAGE_AREA_MANAGER),
      canModifyAreaManager: user.permissions.includes(PERMISSIONS.USER_UPDATE),
      canDeleteAreaManager: user.permissions.includes(PERMISSIONS.USER_DELETE),
      effectiveRole: user.role,
      restrictionLevel: user.role === 'SUPER_ADMIN' ? 'NONE' :
                       user.role === 'COMPANY_ADMIN' ? 'COMPANY' :
                       user.role === 'AREA_MANAGER' ? 'COMPANY' :
                       user.role === 'MANAGER' ? 'ESTATE' : 'DIVISION'
    };
  }

  /**
   * Business rule validation for Area Manager assignments
   */
  static validateBusinessRules(
    assignmentData: {
      areaManagerId: string;
      companyIds: string[];
      permissions: {
        companyId: string;
        canViewReports: boolean;
        canManageUsers: boolean;
        canAccessSystemLogs: boolean;
        canExportData: boolean;
      }[];
    }
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Business rule: Area Manager must have at least one company assignment
    if (!assignmentData.companyIds || assignmentData.companyIds.length === 0) {
      errors.push('Area Manager harus di-assign ke minimal satu perusahaan');
    }

    // Business rule: Maximum companies per Area Manager (configurable limit)
    const MAX_COMPANIES_PER_AREA_MANAGER = 10; // Configurable business rule
    if (assignmentData.companyIds.length > MAX_COMPANIES_PER_AREA_MANAGER) {
      errors.push(`Area Manager tidak boleh di-assign ke lebih dari ${MAX_COMPANIES_PER_AREA_MANAGER} perusahaan`);
    }

    // Business rule: Warn about excessive permissions
    const companiesWithSystemLogAccess = assignmentData.permissions.filter(p => p.canAccessSystemLogs);
    if (companiesWithSystemLogAccess.length > 5) {
      warnings.push('Area Manager memiliki akses system logs di lebih dari 5 perusahaan - pertimbangkan security implications');
    }

    // Business rule: Ensure consistent permissions structure
    assignmentData.permissions.forEach(perm => {
      if (!assignmentData.companyIds.includes(perm.companyId)) {
        errors.push(`Permission definition ditemukan untuk perusahaan yang tidak di-assign: ${perm.companyId}`);
      }
    });

    // Business rule: Every assigned company should have permission definition
    assignmentData.companyIds.forEach(companyId => {
      if (!assignmentData.permissions.find(p => p.companyId === companyId)) {
        warnings.push(`Perusahaan ${companyId} tidak memiliki permission definition - akan menggunakan default permissions`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Area Manager Assignment Context
 * Provides context for Area Manager assignment operations
 */
export interface AreaManagerAssignmentContext {
  currentUser: User;
  targetUser: User;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  companyIds?: string[];
  permissions?: {
    companyId: string;
    canViewReports: boolean;
    canManageUsers: boolean;
    canAccessSystemLogs: boolean;
    canExportData: boolean;
  }[];
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Area Manager Assignment Result
 * Standardized result format for assignment operations
 */
export interface AreaManagerAssignmentResult {
  success: boolean;
  message: string;
  errors: string[];
  warnings: string[];
  assignmentId?: string;
  affectedCompanies?: string[];
  auditTrailId?: string;
  timestamp: Date;
}

/**
 * Comprehensive Area Manager assignment validator
 * Main entry point for all Area Manager assignment validations
 */
export async function validateAreaManagerAssignment(
  context: AreaManagerAssignmentContext
): Promise<AreaManagerAssignmentResult> {
  const result: AreaManagerAssignmentResult = {
    success: false,
    message: '',
    errors: [],
    warnings: [],
    timestamp: new Date()
  };

  try {
    // 1. Validate current user permissions
    AreaManagerPermissionValidator.validateAreaManagerAssignmentPermissions(context.currentUser);

    // 2. Validate target user
    AreaManagerPermissionValidator.validateAreaManagerUser(context.targetUser);

    // 3. Validate company assignments if provided
    if (context.companyIds && context.companyIds.length > 0) {
      const companyValidation = await AreaManagerPermissionValidator.validateCompanyAssignmentPermissions(
        context.currentUser,
        context.companyIds
      );
      
      if (!companyValidation.valid) {
        result.errors.push(...companyValidation.errors);
      }
    }

    // 4. Validate business rules if this is assignment creation/update
    if (context.operationType !== 'VIEW' && context.companyIds && context.permissions) {
      const businessValidation = AreaManagerPermissionValidator.validateBusinessRules({
        areaManagerId: context.targetUser.id,
        companyIds: context.companyIds,
        permissions: context.permissions
      });

      if (!businessValidation.valid) {
        result.errors.push(...businessValidation.errors);
      }
      result.warnings.push(...businessValidation.warnings);
    }

    // 5. Set success based on validation results
    result.success = result.errors.length === 0;
    result.message = result.success 
      ? 'Area Manager assignment validation berhasil'
      : 'Area Manager assignment validation gagal';

    result.affectedCompanies = context.companyIds || [];

  } catch (error) {
    result.success = false;
    result.message = 'Validation error occurred';
    result.errors.push(error instanceof Error ? error.message : 'Unknown validation error');
  }

  return result;
}