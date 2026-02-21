import { User, UserRole, Company, Estate, Divisi, PERMISSIONS } from '@/types/auth';
import { mockAuthService } from './mock-auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';
import { AreaManagerPermissionValidator } from './area-manager-permissions';

// Role hierarchy levels
export const ROLE_HIERARCHY_LEVELS: Record<UserRole, number> = {
  'SUPER_ADMIN': 0,      // Top level
  'COMPANY_ADMIN': 1,    // Company level
  'AREA_MANAGER': 2,     // Multi-estate level
  'MANAGER': 3,          // Estate level
  'ASISTEN': 4,          // Division level
  'MANDOR': 4,           // Division level
  'SATPAM': 4,           // Division level (with estate scope)
  'TIMBANGAN': 4,        // Estate level (weighing)
  'GRADING': 4,          // Estate level (grading)
};

// Role management capabilities
export const ROLE_MANAGEMENT_RULES: Record<UserRole, {
  canManage: UserRole[];
  scopeLevel: 'system' | 'company' | 'estate' | 'division';
  mustAssignScope: boolean;
}> = {
  'SUPER_ADMIN': {
    canManage: ['COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
    scopeLevel: 'system',
    mustAssignScope: false
  },
  'COMPANY_ADMIN': {
    canManage: ['AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
    scopeLevel: 'company',
    mustAssignScope: true
  },
  'AREA_MANAGER': {
    canManage: ['MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
    scopeLevel: 'company', // Can manage across multiple estates
    mustAssignScope: true
  },
  'MANAGER': {
    canManage: ['ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
    scopeLevel: 'estate',
    mustAssignScope: true
  },
  'ASISTEN': {
    canManage: [],
    scopeLevel: 'division',
    mustAssignScope: true
  },
  'MANDOR': {
    canManage: [],
    scopeLevel: 'division',
    mustAssignScope: true
  },
  'SATPAM': {
    canManage: [],
    scopeLevel: 'estate',
    mustAssignScope: true
  },
  'TIMBANGAN': {
    canManage: [],
    scopeLevel: 'estate',
    mustAssignScope: true
  },
  'GRADING': {
    canManage: [],
    scopeLevel: 'estate',
    mustAssignScope: true
  },
};

// Assignment requirements for each role
export const ROLE_ASSIGNMENT_REQUIREMENTS: Record<UserRole, {
  requiresCompany: boolean;
  requiresEstate: boolean;
  requiresDivision: boolean;
  allowsMultipleEstates: boolean;
  allowsMultipleCompanies: boolean;
  description: string;
}> = {
  'SUPER_ADMIN': {
    requiresCompany: false,
    requiresEstate: false,
    requiresDivision: false,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Akses sistem penuh - tidak terikat lokasi'
  },
  'COMPANY_ADMIN': {
    requiresCompany: true,
    requiresEstate: false,
    requiresDivision: false,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Mengelola semua estate dan divisi dalam perusahaan'
  },
  'AREA_MANAGER': {
    requiresCompany: true,
    requiresEstate: false,
    requiresDivision: false,
    allowsMultipleEstates: true,
    allowsMultipleCompanies: true,
    description: 'Mengelola multiple estate lintas perusahaan (hanya super-admin yang bisa assign)'
  },
  'MANAGER': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: false,
    allowsMultipleEstates: true,
    allowsMultipleCompanies: false,
    description: 'Mengelola multiple estate dalam perusahaan'
  },
  'ASISTEN': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: true,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Bertanggung jawab atas multiple divisi'
  },
  'MANDOR': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: true,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Mengawasi operasional divisi tertentu'
  },
  'SATPAM': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: false,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Mengelola gate check estate tertentu'
  },
  'TIMBANGAN': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: false,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Mengelola penimbangan estate tertentu'
  },
  'GRADING': {
    requiresCompany: true,
    requiresEstate: true,
    requiresDivision: false,
    allowsMultipleEstates: false,
    allowsMultipleCompanies: false,
    description: 'Mengelola grading estate tertentu'
  },
};

interface UserAssignmentScope {
  companyIds?: string[];
  estateIds?: string[];
  divisionIds?: string[];
}

interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface HierarchicalUserData extends Partial<User> {
  companyIds?: string[];
  estateIds?: string[];
  divisionIds?: string[];
  
  // Area Manager specific multi-company assignment data
  assignedCompanies?: string[];
  assignedCompanyNames?: string[];
  areaManagerPermissions?: {
    companyId: string;
    canViewReports: boolean;
    canManageUsers: boolean;
    canAccessSystemLogs: boolean;
    canExportData: boolean;
  }[];
}

export class HierarchicalRoleManager {
  /**
   * Validate if current user can manage the target role
   */
  static canManageRole(currentUser: User, targetRole: UserRole): boolean {
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];
    return rules.canManage.includes(targetRole);
  }

  /**
   * Get roles that current user can assign
   */
  static getManageableRoles(currentUser: User): UserRole[] {
    return ROLE_MANAGEMENT_RULES[currentUser.role].canManage;
  }

  /**
   * Validate user assignment within hierarchical scope
   */
  static async validateUserAssignment(
    currentUser: User,
    targetUserData: HierarchicalUserData
  ): Promise<AssignmentValidationResult> {
    const result: AssignmentValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!targetUserData.role) {
      result.errors.push('Role wajib dipilih');
      result.isValid = false;
      return result;
    }

    // Check if current user can manage target role
    if (!this.canManageRole(currentUser, targetUserData.role)) {
      result.errors.push(`Anda tidak memiliki izin untuk menugaskan role ${targetUserData.role}`);
      result.isValid = false;
    }

    // Validate role requirements
    const requirements = ROLE_ASSIGNMENT_REQUIREMENTS[targetUserData.role];
    
    if (requirements.requiresCompany && !targetUserData.companyId && !targetUserData.companyIds?.length) {
      result.errors.push('Perusahaan wajib dipilih untuk role ini');
      result.isValid = false;
    }

    if (requirements.requiresEstate && !targetUserData.estate && !targetUserData.estateIds?.length) {
      result.errors.push('Estate wajib dipilih untuk role ini');
      result.isValid = false;
    }

    if (requirements.requiresDivision && !targetUserData.divisi && !targetUserData.divisionIds?.length) {
      result.errors.push('Divisi wajib dipilih untuk role ini');
      result.isValid = false;
    }

    // Special validation for Area Manager multi-company assignments
    if (targetUserData.role === 'AREA_MANAGER') {
      // Only super-admin can assign Area Managers to multiple companies
      if (currentUser.role !== 'SUPER_ADMIN') {
        result.errors.push('Hanya super-admin yang dapat mengelola assignment Area Manager');
        result.isValid = false;
      }
      
      // Area Manager must be assigned to at least one company
      if (!targetUserData.assignedCompanies?.length && !targetUserData.companyId && !targetUserData.companyIds?.length) {
        result.errors.push('Area Manager harus di-assign ke minimal satu perusahaan');
        result.isValid = false;
      }
    }

    // Validate scope restrictions based on current user
    const scopeValidation = await this.validateAssignmentScope(currentUser, targetUserData);
    if (!scopeValidation.isValid) {
      result.errors.push(...scopeValidation.errors);
      result.warnings.push(...scopeValidation.warnings);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate assignment scope based on current user's permissions
   */
  static async validateAssignmentScope(
    currentUser: User,
    targetUserData: HierarchicalUserData
  ): Promise<AssignmentValidationResult> {
    const result: AssignmentValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const currentUserRules = ROLE_MANAGEMENT_RULES[currentUser.role];

    switch (currentUserRules.scopeLevel) {
      case 'system':
        // Super admin can assign anywhere
        break;

      case 'company':
        // Company admin or area manager - restrict to their company
        if (targetUserData.companyId && currentUser.companyId !== targetUserData.companyId) {
          result.errors.push('Anda hanya dapat menugaskan user dalam perusahaan Anda');
          result.isValid = false;
        }
        break;

      case 'estate':
        // Manager - restrict to their estate
        if (targetUserData.companyId && currentUser.companyId !== targetUserData.companyId) {
          result.errors.push('Anda hanya dapat menugaskan user dalam perusahaan Anda');
          result.isValid = false;
        }
        if (targetUserData.estate && currentUser.estate !== targetUserData.estate) {
          result.errors.push('Anda hanya dapat menugaskan user dalam estate Anda');
          result.isValid = false;
        }
        break;

      case 'division':
        // Division level users cannot manage others
        result.errors.push('Anda tidak memiliki izin untuk menugaskan user lain');
        result.isValid = false;
        break;
    }

    return result;
  }

  /**
   * Get available companies for user assignment based on current user scope
   */
  static async getAvailableCompanies(currentUser: User): Promise<Company[]> {
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];
    
    switch (rules.scopeLevel) {
      case 'system':
        // Super admin can access all companies
        return await mockCompanyDataService.getCompanies();
      
      case 'company':
      case 'estate':
      case 'division':
        // Restricted to current user's company
        if (currentUser.companyId) {
          const company = await mockCompanyDataService.getCompanyById(currentUser.companyId);
          return company ? [company] : [];
        }
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Get available estates for user assignment based on current user scope
   */
  static async getAvailableEstates(currentUser: User, companyId?: string): Promise<Estate[]> {
    if (!companyId) return [];
    
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];
    
    switch (rules.scopeLevel) {
      case 'system':
      case 'company':
        // Can access all estates in the company
        return await mockCompanyDataService.getEstatesByCompany(companyId);
      
      case 'estate':
        // Restricted to current user's estate
        const allEstates = await mockCompanyDataService.getEstatesByCompany(companyId);
        return allEstates.filter(estate => estate.name === currentUser.estate);
      
      case 'division':
        // Same as estate level
        const estates = await mockCompanyDataService.getEstatesByCompany(companyId);
        return estates.filter(estate => estate.name === currentUser.estate);
      
      default:
        return [];
    }
  }

  /**
   * Get available divisions for user assignment based on current user scope
   */
  static async getAvailableDivisions(currentUser: User, estateId?: string): Promise<Divisi[]> {
    if (!estateId) return [];
    
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];
    
    switch (rules.scopeLevel) {
      case 'system':
      case 'company':
      case 'estate':
        // Can access all divisions in the estate
        return await mockCompanyDataService.getDivisionsByEstate(estateId);
      
      case 'division':
        // Restricted to current user's division
        const allDivisions = await mockCompanyDataService.getDivisionsByEstate(estateId);
        return allDivisions.filter(division => division.name === currentUser.divisi);
      
      default:
        return [];
    }
  }

  /**
   * Create user with proper hierarchical validation
   */
  static async createUser(
    currentUser: User,
    userData: HierarchicalUserData
  ): Promise<User> {
    // Validate assignment
    const validation = await this.validateUserAssignment(currentUser, userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Create user using existing service
    const newUser = await mockAuthService.createUser(userData);
    
    // TODO: Add audit logging
    console.log(`User created by ${currentUser.name}:`, {
      newUserId: newUser.id,
      newUserRole: newUser.role,
      assignedTo: {
        company: newUser.company,
        estate: newUser.estate,
        divisi: newUser.divisi
      }
    });

    return newUser;
  }

  /**
   * Update user with proper hierarchical validation
   */
  static async updateUser(
    currentUser: User,
    userId: string,
    userData: HierarchicalUserData
  ): Promise<User> {
    // Get existing user
    const existingUser = await mockAuthService.getUserById(userId);
    if (!existingUser) {
      throw new Error('User tidak ditemukan');
    }

    // Validate assignment
    const validation = await this.validateUserAssignment(currentUser, userData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Update user using existing service
    const updatedUser = await mockAuthService.updateUser(userId, userData);
    
    // TODO: Add audit logging
    console.log(`User updated by ${currentUser.name}:`, {
      userId: updatedUser.id,
      oldRole: existingUser.role,
      newRole: updatedUser.role,
      assignedTo: {
        company: updatedUser.company,
        estate: updatedUser.estate,
        divisi: updatedUser.divisi
      }
    });

    return updatedUser;
  }

  /**
   * Get users that current user can manage
   */
  static async getManagedUsers(currentUser: User): Promise<User[]> {
    const allUsers = await mockAuthService.getAllUsers();
    const manageableRoles = this.getManageableRoles(currentUser);
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];

    // Filter by manageable roles
    let managedUsers = allUsers.filter(user => 
      manageableRoles.includes(user.role) && user.id !== currentUser.id
    );

    // Apply scope restrictions
    switch (rules.scopeLevel) {
      case 'system':
        // Super admin can see all users
        break;
      
      case 'company':
        // Company admin can see users in their company
        managedUsers = managedUsers.filter(user => 
          user.companyId === currentUser.companyId
        );
        break;
      
      case 'estate':
        // Manager can see users in their assigned estates
        managedUsers = managedUsers.filter(user => {
          if (user.companyId !== currentUser.companyId) return false;
          
          // Check if Manager has multi-estate assignment
          if (currentUser.assignedEstateNames && currentUser.assignedEstateNames.length > 0) {
            // Multi-estate Manager: check if user is in any assigned estate
            return currentUser.assignedEstateNames.includes(user.estate || '') ||
                   user.assignedEstateNames?.some(estate => currentUser.assignedEstateNames!.includes(estate));
          } else {
            // Single-estate Manager: check single estate
            return user.estate === currentUser.estate;
          }
        });
        break;
      
      case 'division':
        // Division level users can't manage others
        managedUsers = [];
        break;
    }

    return managedUsers;
  }

  /**
   * Check if user can be deleted by current user
   */
  static canDeleteUser(currentUser: User, targetUser: User): boolean {
    if (currentUser.id === targetUser.id) return false; // Can't delete self
    
    const rules = ROLE_MANAGEMENT_RULES[currentUser.role];
    
    // Check role hierarchy
    if (!rules.canManage.includes(targetUser.role)) return false;
    
    // Check scope restrictions
    switch (rules.scopeLevel) {
      case 'system':
        return true;
      
      case 'company':
        return targetUser.companyId === currentUser.companyId;
      
      case 'estate':
        return targetUser.companyId === currentUser.companyId && 
               targetUser.estate === currentUser.estate;
      
      case 'division':
        return false; // Division level users can't delete others
      
      default:
        return false;
    }
  }

  /**
   * Get role assignment statistics for current user scope
   */
  static async getRoleStatistics(currentUser: User) {
    const managedUsers = await this.getManagedUsers(currentUser);
    
    const stats = {
      total: managedUsers.length,
      byRole: {} as Record<UserRole, number>,
      byCompany: {} as Record<string, number>,
      byEstate: {} as Record<string, number>,
      byDivision: {} as Record<string, number>,
      active: managedUsers.filter(u => u.status === 'active').length,
      inactive: managedUsers.filter(u => u.status === 'inactive').length,
      suspended: managedUsers.filter(u => u.status === 'suspended').length,
    };

    // Count by role
    managedUsers.forEach(user => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      
      if (user.company) {
        stats.byCompany[user.company] = (stats.byCompany[user.company] || 0) + 1;
      }
      
      if (user.estate) {
        stats.byEstate[user.estate] = (stats.byEstate[user.estate] || 0) + 1;
      }
      
      if (user.divisi) {
        stats.byDivision[user.divisi] = (stats.byDivision[user.divisi] || 0) + 1;
      }
    });

    return stats;
  }

  // ================================
  // AREA MANAGER MULTI-COMPANY MANAGEMENT
  // ================================

  /**
   * Check if user can manage Area Manager assignments (super-admin only)
   */
  static canManageAreaManagerAssignments(currentUser: User): boolean {
    return AreaManagerPermissionValidator.canManageAreaManagerAssignments(currentUser);
  }

  /**
   * Get all companies available for Area Manager assignment
   */
  static async getAvailableCompaniesForAreaManager(currentUser: User): Promise<Company[]> {
    if (!this.canManageAreaManagerAssignments(currentUser)) {
      throw new Error('Only super-admin can manage Area Manager assignments');
    }
    
    // Super admin can assign to any company
    return await mockCompanyDataService.getCompanies();
  }

  /**
   * Assign Area Manager to multiple companies
   */
  static async assignAreaManagerToCompanies(
    currentUser: User,
    areaManagerUserId: string,
    companyAssignments: {
      companyId: string;
      canViewReports: boolean;
      canManageUsers: boolean;
      canAccessSystemLogs: boolean;
      canExportData: boolean;
    }[]
  ): Promise<void> {
    // Use the enhanced permission validator
    AreaManagerPermissionValidator.validateAreaManagerAssignmentPermissions(currentUser);

    // Validate Area Manager user exists and has correct role
    const areaManager = await mockAuthService.getUserById(areaManagerUserId);
    if (!areaManager) {
      throw new Error('Area Manager user not found');
    }
    
    AreaManagerPermissionValidator.validateAreaManagerUser(areaManager);

    // Validate company assignments
    const companyIds = companyAssignments.map(a => a.companyId);
    const companyValidation = await AreaManagerPermissionValidator.validateCompanyAssignmentPermissions(
      currentUser,
      companyIds
    );
    
    if (!companyValidation.valid) {
      throw new Error(companyValidation.errors.join(', '));
    }

    // Validate business rules
    const businessValidation = AreaManagerPermissionValidator.validateBusinessRules({
      areaManagerId: areaManagerUserId,
      companyIds,
      permissions: companyAssignments
    });
    
    if (!businessValidation.valid) {
      throw new Error(businessValidation.errors.join(', '));
    }

    // Create audit trail
    const auditEntry = AreaManagerPermissionValidator.createAssignmentAuditEntry(
      currentUser,
      areaManager,
      'ASSIGN',
      companyIds,
      { assignmentDetails: companyAssignments }
    );

    // TODO: In real implementation, this would save to database
    // For now, we'll simulate the assignment
    console.log('Area Manager assignment audit entry:', auditEntry);
    console.log(`Area Manager ${areaManager.name} assigned to companies:`, companyAssignments);
  }

  /**
   * Get Area Manager company assignments
   */
  static async getAreaManagerCompanyAssignments(
    currentUser: User,
    areaManagerUserId: string
  ): Promise<{
    companyId: string;
    companyName: string;
    canViewReports: boolean;
    canManageUsers: boolean;
    canAccessSystemLogs: boolean;
    canExportData: boolean;
    assignedAt: Date;
  }[]> {
    if (!this.canManageAreaManagerAssignments(currentUser)) {
      throw new Error('Only super-admin can view Area Manager assignments');
    }

    // TODO: In real implementation, this would query from database
    // For now, return mock data based on user's assignedCompanies
    const areaManager = await mockAuthService.getUserById(areaManagerUserId);
    if (!areaManager || areaManager.role !== 'AREA_MANAGER') {
      return [];
    }

    const allCompanies = await mockCompanyDataService.getCompanies();
    const assignedCompanyIds = areaManager.assignedCompanies || [];
    
    return assignedCompanyIds.map(companyId => {
      const company = allCompanies.find(c => c.id === companyId);
      return {
        companyId,
        companyName: company?.name || 'Unknown Company',
        canViewReports: true,
        canManageUsers: true,
        canAccessSystemLogs: false,
        canExportData: true,
        assignedAt: new Date()
      };
    });
  }

  /**
   * Remove Area Manager company assignment
   */
  static async removeAreaManagerCompanyAssignment(
    currentUser: User,
    areaManagerUserId: string,
    companyId: string
  ): Promise<void> {
    if (!this.canManageAreaManagerAssignments(currentUser)) {
      throw new Error('Only super-admin can manage Area Manager assignments');
    }

    // TODO: In real implementation, this would remove from database
    console.log(`Removing Area Manager ${areaManagerUserId} assignment from company ${companyId}`);
  }

  /**
   * Check if Area Manager has access to specific company
   */
  static async checkAreaManagerCompanyAccess(
    areaManagerUser: User,
    companyId: string,
    permissionType?: 'view' | 'reports' | 'users' | 'logs' | 'export'
  ): Promise<boolean> {
    if (areaManagerUser.role !== 'AREA_MANAGER') {
      return false;
    }

    // Check if assigned to the company
    const assignedCompanies = areaManagerUser.assignedCompanies || [];
    if (!assignedCompanies.includes(companyId)) {
      return false;
    }

    // TODO: In real implementation, check specific permissions from database
    // For now, return basic permissions
    switch (permissionType) {
      case 'view':
      case 'reports':
      case 'users':
      case 'export':
        return true;
      case 'logs':
        return false; // Restrict system logs access by default
      default:
        return true;
    }
  }

  /**
   * Get Area Manager assignment statistics
   */
  static async getAreaManagerAssignmentStatistics(currentUser: User) {
    if (!this.canManageAreaManagerAssignments(currentUser)) {
      throw new Error('Only super-admin can view Area Manager statistics');
    }

    const allUsers = await mockAuthService.getAllUsers();
    const areaManagers = allUsers.filter(u => u.role === 'AREA_MANAGER');
    const allCompanies = await mockCompanyDataService.getCompanies();

    const stats = {
      totalAreaManagers: areaManagers.length,
      totalCompanies: allCompanies.length,
      totalAssignments: 0,
      averageAssignmentsPerManager: 0,
      companiesWithAreaManagers: 0,
      unassignedCompanies: 0,
      multiCompanyManagers: 0
    };

    let totalAssignments = 0;
    const companiesWithManagers = new Set<string>();

    areaManagers.forEach(manager => {
      const assignmentCount = manager.assignedCompanies?.length || 0;
      totalAssignments += assignmentCount;
      
      if (assignmentCount > 1) {
        stats.multiCompanyManagers++;
      }
      
      manager.assignedCompanies?.forEach(companyId => {
        companiesWithManagers.add(companyId);
      });
    });

    stats.totalAssignments = totalAssignments;
    stats.averageAssignmentsPerManager = areaManagers.length > 0 ? totalAssignments / areaManagers.length : 0;
    stats.companiesWithAreaManagers = companiesWithManagers.size;
    stats.unassignedCompanies = allCompanies.length - companiesWithManagers.size;

    return stats;
  }
}