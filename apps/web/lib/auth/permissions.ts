'use client';

import { User, PERMISSIONS, ROLE_PERMISSIONS, Company } from '@/types/auth';
import { toStandardRoleStrict, isValidUserRole, UserRole } from '@/types/user';

// Performance optimization: Permission cache with TTL
interface PermissionCacheEntry {
  result: boolean;
  timestamp: number;
  userHash: string;
}

class PermissionCache {
  private cache = new Map<string, PermissionCacheEntry>();
  private readonly TTL = 5000; // 5 seconds cache TTL
  private readonly MAX_ENTRIES = 1000;

  private generateUserHash(user: User): string {
    return `${user.id || user.email}_${user.role}_${user.permissions?.join(',') || ''}_${user.companyId || ''}_${user.companyAdminFor?.join(',') || ''}`;
  }

  private generateCacheKey(userHash: string, permission: string, companyId?: string): string {
    return `${userHash}_${permission}_${companyId || 'no-company'}`;
  }

  get(user: User, permission: string, companyId?: string): boolean | null {
    const userHash = this.generateUserHash(user);
    const cacheKey = this.generateCacheKey(userHash, permission, companyId);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > this.TTL || entry.userHash !== userHash) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  set(user: User, permission: string, result: boolean, companyId?: string): void {
    // Implement simple LRU by clearing cache when it gets too large
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const userHash = this.generateUserHash(user);
    const cacheKey = this.generateCacheKey(userHash, permission, companyId);

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userHash
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clear cache for specific user (useful when user data changes)
  clearUser(user: User): void {
    const userHash = this.generateUserHash(user);
    for (const [key, entry] of this.cache.entries()) {
      if (entry.userHash === userHash) {
        this.cache.delete(key);
      }
    }
  }
}

// Global permission cache instance
const permissionCache = new PermissionCache();

export class PermissionManager {
  // Clear cache when needed (e.g., after user data changes)
  static clearCache(): void {
    permissionCache.clear();
  }

  static clearUserCache(user: User): void {
    permissionCache.clearUser(user);
  }

  // Role validation and normalization methods

  /**
   * STRICT: Validates user role - no fallbacks, throws error for invalid roles
   */
  static validateAndNormalizeRole(user: User): UserRole {
    if (!user || !user.role) {
      throw new Error('[PermissionManager] User or user role is missing');
    }

    // Check if role is already valid
    if (isValidUserRole(user.role)) {
      return user.role as UserRole;
    }

    // STRICT: No legacy roles supported - throw error
    throw new Error(`[PermissionManager] Invalid role detected: ${user.role}. Only standard roles are supported. Valid roles: SUPER_ADMIN, COMPANY_ADMIN, AREA_MANAGER, MANAGER, ASISTEN, MANDOR, SATPAM`);
  }

  /**
   * STRICT: Checks if user has valid role format - throws error for debugging
   */
  static hasValidRole(user: User): boolean {
    try {
      return isValidUserRole(user.role);
    } catch (error) {
      console.error(`[PermissionManager] Invalid user role: ${user.role}`, error);
      return false;
    }
  }

  /**
   * Gets role metadata for user
   */
  static getRoleMetadata(user: User) {
    const normalizedRole = this.validateAndNormalizeRole(user);

    // Import dynamically to avoid circular dependency
    const { getRoleMetadata } = require('@/types/user');
    return getRoleMetadata(normalizedRole);
  }

  static hasPermission(user: User | null, permission: string, companyId?: string): boolean {
    if (!user) {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionManager] No user provided');
      }
      return false;
    }

    // Check cache first for performance
    const cachedResult = permissionCache.get(user, permission, companyId);
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Calculate permission (expensive operation)
    const result = this._calculatePermission(user, permission, companyId);

    // Cache the result
    permissionCache.set(user, permission, result, companyId);

    return result;
  }

  // Enhanced permission checking with wildcard support
  static hasWildcardPermission(user: User | null, pattern: string, companyId?: string): boolean {
    if (!user) return false;

    // Check for wildcard patterns (resource:*)
    if (pattern.includes('*')) {
      return this._evaluateWildcardPermission(user, pattern, companyId);
    }

    // Check for multi-action patterns (resource:read,write)
    if (pattern.includes(',')) {
      return this._evaluateMultiActionPermission(user, pattern, companyId);
    }

    // Fallback to regular permission check
    return this.hasPermission(user, pattern, companyId);
  }

  // Evaluate wildcard permission patterns like "harvest:*", "user:*"
  private static _evaluateWildcardPermission(user: User, pattern: string, companyId?: string): boolean {
    const [resource, action] = pattern.split(':');

    if (action !== '*') {
      return false; // Not a valid wildcard pattern
    }

    // Get user permissions
    const userPermissions = user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
      ? user.permissions
      : ROLE_PERMISSIONS[user.role] || [];

    // Super Admin has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has any permission that starts with the resource
    const hasResourcePermission = userPermissions.some(permission =>
      permission.startsWith(`${resource}:`)
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PermissionManager] Wildcard check ${pattern}:`, {
        resource,
        hasResourcePermission,
        userPermissions: userPermissions.filter(p => p.startsWith(`${resource}:`))
      });
    }

    return hasResourcePermission;
  }

  // Evaluate multi-action permission patterns like "user:read,write", "harvest:create,update"
  private static _evaluateMultiActionPermission(user: User, pattern: string, companyId?: string): boolean {
    const [resource, actions] = pattern.split(':');

    if (!actions || !actions.includes(',')) {
      return false; // Not a valid multi-action pattern
    }

    const actionList = actions.split(',').map(a => a.trim());
    const permissions = actionList.map(action => `${resource}:${action}`);

    // Check if user has ALL the required permissions (AND logic)
    const hasAllPermissions = permissions.every(permission =>
      this.hasPermission(user, permission, companyId)
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PermissionManager] Multi-action check ${pattern}:`, {
        resource,
        actions: actionList,
        permissions,
        hasAllPermissions
      });
    }

    return hasAllPermissions;
  }

  // Check if user has ANY of the multi-action permissions (OR logic)
  static hasAnyWildcardPermission(user: User | null, pattern: string, companyId?: string): boolean {
    if (!user) return false;

    // Handle multi-action patterns with OR logic
    if (pattern.includes(',')) {
      const [resource, actions] = pattern.split(':');
      const actionList = actions.split(',').map(a => a.trim());
      const permissions = actionList.map(action => `${resource}:${action}`);

      // Check if user has ANY of the required permissions (OR logic)
      return permissions.some(permission =>
        this.hasPermission(user, permission, companyId)
      );
    }

    // Fallback to regular wildcard check
    return this.hasWildcardPermission(user, pattern, companyId);
  }

  // Private method for actual permission calculation
  private static _calculatePermission(user: User, permission: string, companyId?: string): boolean {
    // Validate and normalize user role to ensure consistency with backend
    const userRole = this.validateAndNormalizeRole(user);

    // Only log in development mode to reduce production overhead
    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionManager] Calculating permission', {
        userRole: user.role,
        userEmail: user.email,
        permission,
        companyId,
        hasExistingPermissions: !!(user.permissions?.length)
      });
    }

    // Super Admin has all permissions across all companies
    if (userRole === 'SUPER_ADMIN') {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [PermissionManager] Super admin granted permission:', permission);
      }
      return true;
    }

    // For company-scoped permissions, check if user has access to the company
    if (companyId && userRole === 'COMPANY_ADMIN') {
      const hasCompanyAccess = user.companyAdminFor?.includes(companyId) || user.companyId === companyId;
      if (!hasCompanyAccess) return false;
    }

    // If user doesn't have permissions array, populate from role-based permissions
    const userPermissions = user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
      ? user.permissions
      : ROLE_PERMISSIONS[userRole] || [];

    if (userPermissions.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PermissionManager] User has no permissions defined:', { user: user.email, role: user.role });
      }
      return false;
    }

    const hasPermission = userPermissions.includes(permission);

    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionManager] Permission check result:', {
        permission,
        hasPermission,
        userPermissions: userPermissions.slice(0, 5), // Show first 5 permissions
        totalPermissions: userPermissions.length
      });
    }

    return hasPermission;
  }

  static hasAnyPermission(user: User | null, permissions: string[], companyId?: string): boolean {
    if (!user) return false;
    return permissions.some(permission => this.hasPermission(user, permission, companyId));
  }

  static hasAllPermissions(user: User | null, permissions: string[], companyId?: string): boolean {
    if (!user) return false;
    return permissions.every(permission => this.hasPermission(user, permission, companyId));
  }

  static canAccessRoute(user: User | null, route: string): boolean {
    if (!user) return false;

    // Map routes to required permissions
    const routePermissions: Record<string, string[]> = {
      // Super Admin routes
      '/super-admin': [PERMISSIONS.SUPER_ADMIN_ALL],
      '/super-admin/companies': [PERMISSIONS.COMPANY_READ],
      '/super-admin/company-admins': [PERMISSIONS.COMPANY_ADMIN_ASSIGN],
      '/super-admin/monitoring': [PERMISSIONS.SUPER_ADMIN_ALL],
      '/super-admin/system-logs': [PERMISSIONS.SYSTEM_LOGS],

      // Company Admin routes
      '/company-admin': [PERMISSIONS.COMPANY_ADMIN_ALL],
      '/company-admin/estates': [PERMISSIONS.ESTATE_READ],
      '/company-admin/divisions': [PERMISSIONS.DIVISI_READ],
      '/company-admin/blocks': [PERMISSIONS.BLOCK_READ],
      '/company-admin/users': [PERMISSIONS.USER_READ],
      '/company-admin/reports': [PERMISSIONS.REPORT_VIEW],
      '/employees': [PERMISSIONS.EMPLOYEE_READ],

      // Mandor routes
      '/mandor': [PERMISSIONS.HARVEST_READ],
      '/mandor/panen': [PERMISSIONS.HARVEST_CREATE, PERMISSIONS.HARVEST_READ],
      '/mandor/workers': [PERMISSIONS.USER_READ],
      '/mandor/history': [PERMISSIONS.HARVEST_READ],
      '/mandor/notifications': [PERMISSIONS.HARVEST_READ],

      // Asisten routes
      '/asisten': [PERMISSIONS.APPROVAL_VIEW],
      '/asisten/approval': [PERMISSIONS.APPROVAL_VIEW, PERMISSIONS.APPROVAL_APPROVE],
      '/asisten/monitoring': [PERMISSIONS.HARVEST_READ, PERMISSIONS.APPROVAL_VIEW],
      '/asisten/gate-check': [PERMISSIONS.GATE_CHECK_READ],
      '/asisten/reports': [PERMISSIONS.REPORT_VIEW],
      '/asisten/notifications': [PERMISSIONS.APPROVAL_VIEW],

      // Satpam routes
      '/satpam': [PERMISSIONS.GATE_CHECK_READ],
      '/satpam/gate-check': [PERMISSIONS.GATE_CHECK_CREATE, PERMISSIONS.GATE_CHECK_READ],
      '/satpam/qr-scan': [PERMISSIONS.GATE_CHECK_CREATE],
      '/satpam/vehicle-logs': [PERMISSIONS.GATE_CHECK_READ],
      '/satpam/daily-report': [PERMISSIONS.GATE_CHECK_READ],

      // Manager routes
      '/manager': [PERMISSIONS.REPORT_VIEW],
      '/manager/overview': [PERMISSIONS.REPORT_VIEW],
      '/manager/harvest-reports': [PERMISSIONS.REPORT_VIEW],
      '/manager/analytics': [PERMISSIONS.REPORT_VIEW],
      '/manager/users': [PERMISSIONS.USER_MANAGE],

      // Area Manager routes
      '/area-manager': [PERMISSIONS.REPORT_VIEW],
      '/area-manager/multi-estate': [PERMISSIONS.REPORT_VIEW],
      '/area-manager/comparison': [PERMISSIONS.REPORT_VIEW],
      '/area-manager/executive-reports': [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT],
      '/area-manager/regional-analytics': [PERMISSIONS.REPORT_VIEW],
      '/area-manager/users': [PERMISSIONS.USER_MANAGE],
      '/area-manager/estate-management': [PERMISSIONS.USER_MANAGE],
      '/area-manager/system-logs': [PERMISSIONS.SYSTEM_LOGS],
    };

    const requiredPermissions = routePermissions[route];
    if (!requiredPermissions) return true; // Allow access to unprotected routes

    return this.hasAnyPermission(user, requiredPermissions);
  }

  // Memoized role-based paths (computed once)
  private static roleBasedPaths: Record<UserRole, string> = {
    'SUPER_ADMIN': '/',
    'COMPANY_ADMIN': '/',
    'MANDOR': '/',
    'ASISTEN': '/',
    'SATPAM': '/',
    'MANAGER': '/',
    'AREA_MANAGER': '/',
    'TIMBANGAN': '/',
    'GRADING': '/',
  };

  static getRoleBasedRedirectPath(user: User | null): string {
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionManager] No user for redirect, sending to login');
      }
      return '/login';
    }

    // Enhanced role validation with fallback to dashboard for unknown roles
    if (!user.role) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PermissionManager] User has no role defined, redirecting to root');
      }
      return '/';
    }

    // Use role directly - roles are now consistent with backend format (uppercase)
    const redirectPath = this.roleBasedPaths[user.role];

    // Fallback to generic root if role-specific path not found
    const safePath = redirectPath || '/';

    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionManager] Role-based redirect', {
        userRole: user.role,
        userEmail: user.email,
        redirectPath,
        safePath,
        roleExists: !!this.roleBasedPaths[user.role]
      });
    }

    return safePath;
  }

  static filterMenuItemsByPermissions(
    user: User | null,
    menuItems: Array<{
      label: string;
      path: string;
      icon: string;
      permissions?: string[];
    }>
  ) {
    if (!user) return [];

    return menuItems.filter(item => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return this.hasAnyPermission(user, item.permissions);
    });
  }

  static canPerformAction(user: User | null, action: string, resource?: any): boolean {
    if (!user) return false;

    // Enhanced action-permission mappings with 50+ business actions
    const actionPermissions: Record<string, string> = {
      // === HARVEST OPERATIONS ===
      'create_harvest': PERMISSIONS.HARVEST_CREATE,
      'read_harvest': PERMISSIONS.HARVEST_READ,
      'view_harvest': PERMISSIONS.HARVEST_READ,
      'update_harvest': PERMISSIONS.HARVEST_UPDATE,
      'edit_harvest': PERMISSIONS.HARVEST_UPDATE,
      'delete_harvest': PERMISSIONS.HARVEST_DELETE,
      'remove_harvest': PERMISSIONS.HARVEST_DELETE,

      // === APPROVAL WORKFLOW ===
      'approve_harvest': PERMISSIONS.APPROVAL_APPROVE,
      'reject_harvest': PERMISSIONS.APPROVAL_REJECT,
      'view_approvals': PERMISSIONS.APPROVAL_VIEW,
      'monitor_approvals': PERMISSIONS.APPROVAL_VIEW,
      'review_harvest': PERMISSIONS.APPROVAL_VIEW,

      // === GATE CHECK OPERATIONS ===
      'create_gate_check': PERMISSIONS.GATE_CHECK_CREATE,
      'log_vehicle_entry': PERMISSIONS.GATE_CHECK_CREATE,
      'log_vehicle_exit': PERMISSIONS.GATE_CHECK_CREATE,
      'read_gate_check': PERMISSIONS.GATE_CHECK_READ,
      'view_gate_logs': PERMISSIONS.GATE_CHECK_READ,
      'monitor_gate': PERMISSIONS.GATE_CHECK_READ,
      'update_gate_check': PERMISSIONS.GATE_CHECK_UPDATE,
      'edit_gate_log': PERMISSIONS.GATE_CHECK_UPDATE,

      // === USER MANAGEMENT ===
      'create_user': PERMISSIONS.USER_CREATE,
      'add_user': PERMISSIONS.USER_CREATE,
      'register_user': PERMISSIONS.USER_CREATE,
      'read_user': PERMISSIONS.USER_READ,
      'view_users': PERMISSIONS.USER_READ,
      'list_users': PERMISSIONS.USER_READ,
      'update_user': PERMISSIONS.USER_UPDATE,
      'edit_user': PERMISSIONS.USER_UPDATE,
      'modify_user': PERMISSIONS.USER_UPDATE,
      'delete_user': PERMISSIONS.USER_DELETE,
      'remove_user': PERMISSIONS.USER_DELETE,
      'deactivate_user': PERMISSIONS.USER_DELETE,
      'manage_users': PERMISSIONS.USER_MANAGE,
      'administer_users': PERMISSIONS.USER_MANAGE,
      'assign_user_role': PERMISSIONS.USER_ASSIGN_ROLE,
      'change_user_role': PERMISSIONS.USER_ASSIGN_ROLE,
      'assign_user_scope': PERMISSIONS.USER_ASSIGN_SCOPE,

      // === COMPANY MANAGEMENT ===
      'create_company': PERMISSIONS.COMPANY_CREATE,
      'add_company': PERMISSIONS.COMPANY_CREATE,
      'read_company': PERMISSIONS.COMPANY_READ,
      'view_companies': PERMISSIONS.COMPANY_READ,
      'list_companies': PERMISSIONS.COMPANY_READ,
      'update_company': PERMISSIONS.COMPANY_UPDATE,
      'edit_company': PERMISSIONS.COMPANY_UPDATE,
      'delete_company': PERMISSIONS.COMPANY_DELETE,
      'remove_company': PERMISSIONS.COMPANY_DELETE,

      // === ESTATE MANAGEMENT ===
      'create_estate': PERMISSIONS.ESTATE_CREATE,
      'add_estate': PERMISSIONS.ESTATE_CREATE,
      'read_estate': PERMISSIONS.ESTATE_READ,
      'view_estates': PERMISSIONS.ESTATE_READ,
      'list_estates': PERMISSIONS.ESTATE_READ,
      'update_estate': PERMISSIONS.ESTATE_UPDATE,
      'edit_estate': PERMISSIONS.ESTATE_UPDATE,
      'delete_estate': PERMISSIONS.ESTATE_DELETE,
      'remove_estate': PERMISSIONS.ESTATE_DELETE,

      // === DIVISION MANAGEMENT ===
      'create_division': PERMISSIONS.DIVISI_CREATE,
      'add_division': PERMISSIONS.DIVISI_CREATE,
      'read_division': PERMISSIONS.DIVISI_READ,
      'view_divisions': PERMISSIONS.DIVISI_READ,
      'list_divisions': PERMISSIONS.DIVISI_READ,
      'update_division': PERMISSIONS.DIVISI_UPDATE,
      'edit_division': PERMISSIONS.DIVISI_UPDATE,
      'delete_division': PERMISSIONS.DIVISI_DELETE,
      'remove_division': PERMISSIONS.DIVISI_DELETE,

      // === BLOCK MANAGEMENT ===
      'create_block': PERMISSIONS.BLOCK_CREATE,
      'add_block': PERMISSIONS.BLOCK_CREATE,
      'read_block': PERMISSIONS.BLOCK_READ,
      'view_blocks': PERMISSIONS.BLOCK_READ,
      'list_blocks': PERMISSIONS.BLOCK_READ,
      'update_block': PERMISSIONS.BLOCK_UPDATE,
      'edit_block': PERMISSIONS.BLOCK_UPDATE,
      'delete_block': PERMISSIONS.BLOCK_DELETE,
      'remove_block': PERMISSIONS.BLOCK_DELETE,

      // === EMPLOYEE MANAGEMENT ===
      'create_employee': PERMISSIONS.EMPLOYEE_CREATE,
      'add_employee': PERMISSIONS.EMPLOYEE_CREATE,
      'hire_employee': PERMISSIONS.EMPLOYEE_CREATE,
      'read_employee': PERMISSIONS.EMPLOYEE_READ,
      'view_employees': PERMISSIONS.EMPLOYEE_READ,
      'list_employees': PERMISSIONS.EMPLOYEE_READ,
      'update_employee': PERMISSIONS.EMPLOYEE_UPDATE,
      'edit_employee': PERMISSIONS.EMPLOYEE_UPDATE,
      'modify_employee': PERMISSIONS.EMPLOYEE_UPDATE,
      'delete_employee': PERMISSIONS.EMPLOYEE_DELETE,
      'remove_employee': PERMISSIONS.EMPLOYEE_DELETE,
      'terminate_employee': PERMISSIONS.EMPLOYEE_DELETE,

      // === REPORTING & ANALYTICS ===
      'view_reports': PERMISSIONS.REPORT_VIEW,
      'read_reports': PERMISSIONS.REPORT_VIEW,
      'access_reports': PERMISSIONS.REPORT_VIEW,
      'generate_reports': PERMISSIONS.REPORT_VIEW,
      'create_reports': PERMISSIONS.REPORT_VIEW,
      'export_reports': PERMISSIONS.REPORT_EXPORT,
      'download_reports': PERMISSIONS.REPORT_EXPORT,
      'export_data': PERMISSIONS.REPORT_EXPORT,
      'backup_data': PERMISSIONS.REPORT_EXPORT,

      // === SYSTEM ADMINISTRATION ===
      'view_system_logs': PERMISSIONS.SYSTEM_LOGS,
      'access_system_logs': PERMISSIONS.SYSTEM_LOGS,
      'monitor_system': PERMISSIONS.SYSTEM_LOGS,
      'audit_system': PERMISSIONS.SYSTEM_LOGS,
      'configure_system': PERMISSIONS.SYSTEM_CONFIG,
      'system_settings': PERMISSIONS.SYSTEM_CONFIG,
      'admin_config': PERMISSIONS.SYSTEM_CONFIG,

      // === ROLE MANAGEMENT ===
      'manage_company_admin': PERMISSIONS.MANAGE_COMPANY_ADMIN,
      'assign_company_admin': PERMISSIONS.MANAGE_COMPANY_ADMIN,
      'manage_area_manager': PERMISSIONS.MANAGE_AREA_MANAGER,
      'assign_area_manager': PERMISSIONS.MANAGE_AREA_MANAGER,
      'assign_area_manager_companies': PERMISSIONS.ASSIGN_AREA_MANAGER_COMPANIES,
      'view_area_manager_assignments': PERMISSIONS.VIEW_AREA_MANAGER_ASSIGNMENTS,
      'manage_manager': PERMISSIONS.MANAGE_MANAGER,
      'assign_manager': PERMISSIONS.MANAGE_MANAGER,
      'manage_asisten': PERMISSIONS.MANAGE_ASISTEN,
      'assign_asisten': PERMISSIONS.MANAGE_ASISTEN,
      'manage_mandor': PERMISSIONS.MANAGE_MANDOR,
      'assign_mandor': PERMISSIONS.MANAGE_MANDOR,
      'manage_satpam': PERMISSIONS.MANAGE_SATPAM,
      'assign_satpam': PERMISSIONS.MANAGE_SATPAM,

      // === BUSINESS OPERATIONS ===
      'monitor_operations': PERMISSIONS.APPROVAL_VIEW,
      'oversee_operations': PERMISSIONS.APPROVAL_VIEW,
      'track_progress': PERMISSIONS.HARVEST_READ,
      'view_analytics': PERMISSIONS.REPORT_VIEW,
      'business_intelligence': PERMISSIONS.REPORT_VIEW,
      'performance_monitoring': PERMISSIONS.REPORT_VIEW,
      'quality_control': PERMISSIONS.APPROVAL_VIEW,
      'operational_oversight': PERMISSIONS.APPROVAL_VIEW,

      // === MOBILE OPERATIONS ===
      'mobile_harvest_input': PERMISSIONS.HARVEST_CREATE,
      'mobile_gate_check': PERMISSIONS.GATE_CHECK_CREATE,
      'mobile_approval': PERMISSIONS.APPROVAL_APPROVE,
      'offline_sync': PERMISSIONS.HARVEST_READ,
      'field_operations': PERMISSIONS.HARVEST_CREATE,

      // === INTEGRATION & API ===
      'api_access': PERMISSIONS.HARVEST_READ,
      'external_integration': PERMISSIONS.REPORT_EXPORT,
      'webhook_management': PERMISSIONS.SYSTEM_CONFIG,
      'data_synchronization': PERMISSIONS.REPORT_EXPORT,
    };

    const requiredPermission = actionPermissions[action];
    if (!requiredPermission) {
      // Log unknown actions in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[PermissionManager] Unknown action requested: ${action}. Available actions:`, Object.keys(actionPermissions));
      }
      return false;
    }

    return this.hasPermission(user, requiredPermission, resource?.companyId);
  }

  // Enhanced resource-specific action checking with context validation
  static canPerformResourceAction(
    user: User | null,
    action: string,
    resource: {
      type: string;
      id: string;
      context?: {
        companyId?: string;
        estateId?: string;
        divisionId?: string;
        blockId?: string;
        ownerId?: string;
        createdBy?: string;
        assignedTo?: string[];
        status?: string;
        metadata?: Record<string, any>;
      }
    }
  ): boolean {
    if (!user || !resource) return false;

    // First check basic action permission
    const hasBasicPermission = this.canPerformAction(user, action, resource.context);
    if (!hasBasicPermission) {
      return false;
    }

    // Enhanced resource-specific validation
    return this._validateResourceContext(user, action, resource);
  }

  // Validate resource-specific access based on context
  private static _validateResourceContext(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Super Admin bypasses all resource-specific checks
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Company-scoped resource validation
    if (context.companyId && !this.canAccessCompanyData(user, context.companyId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PermissionManager] Access denied: User cannot access company ${context.companyId}`);
      }
      return false;
    }

    // Role-specific resource validation
    switch (user.role) {
      case 'COMPANY_ADMIN':
        return this._validateCompanyAdminResourceAccess(user, action, resource);

      case 'AREA_MANAGER':
        return this._validateAreaManagerResourceAccess(user, action, resource);

      case 'MANAGER':
        return this._validateManagerResourceAccess(user, action, resource);

      case 'ASISTEN':
        return this._validateAsistenResourceAccess(user, action, resource);

      case 'MANDOR':
        return this._validateMandorResourceAccess(user, action, resource);

      case 'SATPAM':
        return this._validateSatpamResourceAccess(user, action, resource);

      default:
        return true; // Fallback to basic permission check
    }
  }

  // Company Admin resource validation
  private static _validateCompanyAdminResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Company Admin can only access resources in their managed companies
    if (context.companyId) {
      return this.isCompanyAdmin(user, context.companyId);
    }

    // For resources without company context, check if user has company admin access
    return user.companyAdminFor && user.companyAdminFor.length > 0;
  }

  // Area Manager resource validation
  private static _validateAreaManagerResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Area Manager can access resources in their assigned companies
    if (context.companyId && user.assignedCompanies) {
      return user.assignedCompanies.includes(context.companyId);
    }

    // For cross-company operations, allow if user has any company assignments
    return user.assignedCompanies && user.assignedCompanies.length > 0;
  }

  // Manager resource validation  
  private static _validateManagerResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Manager can access resources in their assigned estates
    if (context.estateId && user.assignedEstates) {
      return user.assignedEstates.includes(context.estateId);
    }

    // Check company scope
    if (context.companyId && user.companyId !== context.companyId) {
      return false;
    }

    return true;
  }

  // Asisten resource validation
  private static _validateAsistenResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Asisten can access resources in their assigned divisions
    if (context.divisionId && user.assignedDivisions) {
      return user.assignedDivisions.includes(context.divisionId);
    }

    // For approval actions, check if resource is assigned to this asisten
    if (action.includes('approve') || action.includes('reject')) {
      if (context.assignedTo && context.assignedTo.includes(user.id)) {
        return true;
      }
    }

    // Check estate scope for division-less resources
    if (context.estateId && user.assignedDivisions) {
      // Would need to resolve estate from divisions - simplified for now
      return true;
    }

    return true;
  }

  // Mandor resource validation
  private static _validateMandorResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Mandor can only access resources they created or are assigned to
    if (context.createdBy === user.id || context.ownerId === user.id) {
      return true;
    }

    // Check division/estate scope
    if (context.divisionId && user.divisi !== context.divisionId) {
      return false;
    }

    // For harvest operations, check if in same division/estate
    if (action.includes('harvest') || action.includes('field')) {
      return !!(user.estate && user.divisi); // Must be assigned to estate/division
    }

    return true;
  }

  // Satpam resource validation
  private static _validateSatpamResourceAccess(
    user: User,
    action: string,
    resource: { type: string; id: string; context?: any }
  ): boolean {
    const context = resource.context || {};

    // Satpam can access resources in their estate
    if (context.estateId && user.estate !== context.estateId) {
      return false;
    }

    // For gate check operations, ensure proper estate scope
    if (action.includes('gate') || action.includes('vehicle')) {
      return user.estate !== undefined; // Must be assigned to an estate
    }

    return true;
  }

  // Helper method to get resource-specific permissions
  static getResourcePermissions(
    user: User | null,
    resourceType: string,
    resourceId?: string,
    context?: any
  ): {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canManage: boolean;
    availableActions: string[];
  } {
    if (!user) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canManage: false,
        availableActions: []
      };
    }

    const resource = { type: resourceType, id: resourceId || 'new', context };

    return {
      canCreate: this.canPerformResourceAction(user, `create_${resourceType}`, resource),
      canRead: this.canPerformResourceAction(user, `read_${resourceType}`, resource),
      canUpdate: this.canPerformResourceAction(user, `update_${resourceType}`, resource),
      canDelete: this.canPerformResourceAction(user, `delete_${resourceType}`, resource),
      canManage: this.canPerformResourceAction(user, `manage_${resourceType}`, resource),
      availableActions: this.getAvailableActions(user).filter(action =>
        action.includes(resourceType) || this.canPerformResourceAction(user, action, resource)
      )
    };
  }

  // Memoized role display info (computed once)
  private static roleDisplayInfoCache: Record<UserRole, {
    label: string;
    description: string;
    color: string;
    icon: string;
  }> = {
      'SUPER_ADMIN': {
        label: 'Super Admin',
        description: 'Kelola seluruh sistem lintas perusahaan & assign company admin',
        color: 'bg-red-100 text-red-800',
        icon: 'Shield',
      },
      'COMPANY_ADMIN': {
        label: 'Company Admin',
        description: 'Kelola master data perusahaan (estate, divisi, blok, karyawan, user)',
        color: 'bg-indigo-100 text-indigo-800',
        icon: 'Building',
      },
      'MANDOR': {
        label: 'Mandor',
        description: 'Input data panen & kelola karyawan lapangan',
        color: 'bg-blue-100 text-blue-800',
        icon: 'Users',
      },
      'ASISTEN': {
        label: 'Asisten',
        description: 'Approve data panen & monitoring operasional',
        color: 'bg-green-100 text-green-800',
        icon: 'CheckCircle',
      },
      'SATPAM': {
        label: 'Satpam',
        description: 'Gate check & pencatatan keluar masuk kendaraan',
        color: 'bg-yellow-100 text-yellow-800',
        icon: 'Shield',
      },
      'MANAGER': {
        label: 'Manager',
        description: 'Monitoring & laporan estate/divisi',
        color: 'bg-purple-100 text-purple-800',
        icon: 'TrendingUp',
      },
      'AREA_MANAGER': {
        label: 'Area Manager',
        description: 'Monitoring lintas unit & pelaporan regional',
        color: 'bg-orange-100 text-orange-800',
        icon: 'Building2',
      },
      'TIMBANGAN': {
        label: 'Timbangan',
        description: 'Operasi penimbangan TBS',
        color: 'bg-cyan-100 text-cyan-800',
        icon: 'Scale',
      },
      'GRADING': {
        label: 'Grading',
        description: 'Quality grading TBS',
        color: 'bg-pink-100 text-pink-800',
        icon: 'Award',
      },
    };

  static getRoleDisplayInfo(role: UserRole) {
    return this.roleDisplayInfoCache[role];
  }

  static getAvailableActions(user: User | null): string[] {
    if (!user) return [];

    // Enhanced permission-to-actions mapping
    const permissionActions: Record<string, string[]> = {
      // Harvest permissions
      [PERMISSIONS.HARVEST_CREATE]: [
        'create_harvest', 'mobile_harvest_input', 'field_operations'
      ],
      [PERMISSIONS.HARVEST_READ]: [
        'read_harvest', 'view_harvest', 'track_progress', 'offline_sync', 'api_access'
      ],
      [PERMISSIONS.HARVEST_UPDATE]: [
        'update_harvest', 'edit_harvest'
      ],
      [PERMISSIONS.HARVEST_DELETE]: [
        'delete_harvest', 'remove_harvest'
      ],

      // Approval permissions
      [PERMISSIONS.APPROVAL_APPROVE]: [
        'approve_harvest', 'mobile_approval'
      ],
      [PERMISSIONS.APPROVAL_REJECT]: [
        'reject_harvest'
      ],
      [PERMISSIONS.APPROVAL_VIEW]: [
        'view_approvals', 'monitor_approvals', 'review_harvest', 'monitor_operations',
        'oversee_operations', 'quality_control', 'operational_oversight'
      ],

      // Gate check permissions
      [PERMISSIONS.GATE_CHECK_CREATE]: [
        'create_gate_check', 'log_vehicle_entry', 'log_vehicle_exit', 'mobile_gate_check'
      ],
      [PERMISSIONS.GATE_CHECK_READ]: [
        'read_gate_check', 'view_gate_logs', 'monitor_gate'
      ],
      [PERMISSIONS.GATE_CHECK_UPDATE]: [
        'update_gate_check', 'edit_gate_log'
      ],

      // User management permissions
      [PERMISSIONS.USER_CREATE]: [
        'create_user', 'add_user', 'register_user'
      ],
      [PERMISSIONS.USER_READ]: [
        'read_user', 'view_users', 'list_users'
      ],
      [PERMISSIONS.USER_UPDATE]: [
        'update_user', 'edit_user', 'modify_user'
      ],
      [PERMISSIONS.USER_DELETE]: [
        'delete_user', 'remove_user', 'deactivate_user'
      ],
      [PERMISSIONS.USER_MANAGE]: [
        'manage_users', 'administer_users'
      ],
      [PERMISSIONS.USER_ASSIGN_ROLE]: [
        'assign_user_role', 'change_user_role'
      ],
      [PERMISSIONS.USER_ASSIGN_SCOPE]: [
        'assign_user_scope'
      ],

      // Company management permissions
      [PERMISSIONS.COMPANY_CREATE]: [
        'create_company', 'add_company'
      ],
      [PERMISSIONS.COMPANY_READ]: [
        'read_company', 'view_companies', 'list_companies'
      ],
      [PERMISSIONS.COMPANY_UPDATE]: [
        'update_company', 'edit_company'
      ],
      [PERMISSIONS.COMPANY_DELETE]: [
        'delete_company', 'remove_company'
      ],

      // Estate management permissions
      [PERMISSIONS.ESTATE_CREATE]: [
        'create_estate', 'add_estate'
      ],
      [PERMISSIONS.ESTATE_READ]: [
        'read_estate', 'view_estates', 'list_estates'
      ],
      [PERMISSIONS.ESTATE_UPDATE]: [
        'update_estate', 'edit_estate'
      ],
      [PERMISSIONS.ESTATE_DELETE]: [
        'delete_estate', 'remove_estate'
      ],

      // Division management permissions
      [PERMISSIONS.DIVISI_CREATE]: [
        'create_division', 'add_division'
      ],
      [PERMISSIONS.DIVISI_READ]: [
        'read_division', 'view_divisions', 'list_divisions'
      ],
      [PERMISSIONS.DIVISI_UPDATE]: [
        'update_division', 'edit_division'
      ],
      [PERMISSIONS.DIVISI_DELETE]: [
        'delete_division', 'remove_division'
      ],

      // Block management permissions
      [PERMISSIONS.BLOCK_CREATE]: [
        'create_block', 'add_block'
      ],
      [PERMISSIONS.BLOCK_READ]: [
        'read_block', 'view_blocks', 'list_blocks'
      ],
      [PERMISSIONS.BLOCK_UPDATE]: [
        'update_block', 'edit_block'
      ],
      [PERMISSIONS.BLOCK_DELETE]: [
        'delete_block', 'remove_block'
      ],

      // Employee management permissions
      [PERMISSIONS.EMPLOYEE_CREATE]: [
        'create_employee', 'add_employee', 'hire_employee'
      ],
      [PERMISSIONS.EMPLOYEE_READ]: [
        'read_employee', 'view_employees', 'list_employees'
      ],
      [PERMISSIONS.EMPLOYEE_UPDATE]: [
        'update_employee', 'edit_employee', 'modify_employee'
      ],
      [PERMISSIONS.EMPLOYEE_DELETE]: [
        'delete_employee', 'remove_employee', 'terminate_employee'
      ],

      // Reporting permissions
      [PERMISSIONS.REPORT_VIEW]: [
        'view_reports', 'read_reports', 'access_reports', 'generate_reports',
        'create_reports', 'view_analytics', 'business_intelligence', 'performance_monitoring'
      ],
      [PERMISSIONS.REPORT_EXPORT]: [
        'export_reports', 'download_reports', 'export_data', 'backup_data',
        'external_integration', 'data_synchronization'
      ],

      // System permissions
      [PERMISSIONS.SYSTEM_LOGS]: [
        'view_system_logs', 'access_system_logs', 'monitor_system', 'audit_system'
      ],
      [PERMISSIONS.SYSTEM_CONFIG]: [
        'configure_system', 'system_settings', 'admin_config', 'webhook_management'
      ],

      // Role management permissions
      [PERMISSIONS.MANAGE_COMPANY_ADMIN]: [
        'manage_company_admin', 'assign_company_admin'
      ],
      [PERMISSIONS.MANAGE_AREA_MANAGER]: [
        'manage_area_manager', 'assign_area_manager'
      ],
      [PERMISSIONS.ASSIGN_AREA_MANAGER_COMPANIES]: [
        'assign_area_manager_companies'
      ],
      [PERMISSIONS.VIEW_AREA_MANAGER_ASSIGNMENTS]: [
        'view_area_manager_assignments'
      ],
      [PERMISSIONS.MANAGE_MANAGER]: [
        'manage_manager', 'assign_manager'
      ],
      [PERMISSIONS.MANAGE_ASISTEN]: [
        'manage_asisten', 'assign_asisten'
      ],
      [PERMISSIONS.MANAGE_MANDOR]: [
        'manage_mandor', 'assign_mandor'
      ],
      [PERMISSIONS.MANAGE_SATPAM]: [
        'manage_satpam', 'assign_satpam'
      ],
    };

    const availableActions: string[] = [];

    // Use the same permission resolution logic as hasPermission
    const userPermissions = user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
      ? user.permissions
      : ROLE_PERMISSIONS[user.role] || [];

    userPermissions.forEach(permission => {
      const actions = permissionActions[permission];
      if (actions) {
        availableActions.push(...actions);
      }
    });

    return [...new Set(availableActions)]; // Remove duplicates
  }

  // Multi-tenant helper methods
  static isCompanyAdmin(user: User | null, companyId?: string): boolean {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role !== 'COMPANY_ADMIN') return false;

    if (!companyId) return user.companyAdminFor && user.companyAdminFor.length > 0;
    return user.companyAdminFor?.includes(companyId) || user.companyId === companyId;
  }

  static isSuperAdmin(user: User | null): boolean {
    return user?.role === 'SUPER_ADMIN';
  }

  static canManageCompany(user: User | null, companyId?: string): boolean {
    if (!user) return false;
    return this.isSuperAdmin(user) || this.isCompanyAdmin(user, companyId);
  }

  static getAccessibleCompanies(user: User | null): string[] {
    if (!user) return [];
    if (this.isSuperAdmin(user)) return ['*']; // Access to all companies
    if (user.role === 'COMPANY_ADMIN' && user.companyAdminFor) {
      return user.companyAdminFor;
    }
    if (user.companyId) return [user.companyId];
    return [];
  }

  static canAccessCompanyData(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    const accessibleCompanies = this.getAccessibleCompanies(user);
    return accessibleCompanies.includes('*') || accessibleCompanies.includes(companyId);
  }

  static getCompanyScopedPermissions(user: User | null, companyId: string): string[] {
    if (!user) return [];
    if (!this.canAccessCompanyData(user, companyId)) return [];

    return user.permissions;
  }

  static hasCompanyScopedPermission(user: User | null, permission: string, companyId: string): boolean {
    if (!user) return false;
    if (!this.canAccessCompanyData(user, companyId)) return false;

    return this.hasPermission(user, permission, companyId);
  }

  // === DEBUGGING & ANALYSIS TOOLS ===

  // Comprehensive permission analysis for debugging
  static analyzeUserPermissions(user: User | null): {
    role: UserRole | null;
    rolePermissions: string[];
    userPermissions: string[];
    effectivePermissions: string[];
    availableActions: string[];
    companyAccess: string[];
    assignmentScope: {
      companies?: string[];
      estates?: string[];
      divisions?: string[];
    };
    debugInfo: {
      isSuperAdmin: boolean;
      isCompanyAdmin: boolean;
      hasExplicitPermissions: boolean;
      permissionSource: 'role' | 'explicit' | 'super_admin';
    };
  } {
    if (!user) {
      return {
        role: null,
        rolePermissions: [],
        userPermissions: [],
        effectivePermissions: [],
        availableActions: [],
        companyAccess: [],
        assignmentScope: {},
        debugInfo: {
          isSuperAdmin: false,
          isCompanyAdmin: false,
          hasExplicitPermissions: false,
          permissionSource: 'role'
        }
      };
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const userPermissions = user.permissions || [];
    const hasExplicitPermissions = userPermissions.length > 0;

    // Determine effective permissions
    const effectivePermissions = hasExplicitPermissions ? userPermissions : rolePermissions;

    return {
      role: user.role,
      rolePermissions,
      userPermissions,
      effectivePermissions,
      availableActions: this.getAvailableActions(user),
      companyAccess: this.getAccessibleCompanies(user),
      assignmentScope: {
        companies: user.assignedCompanies,
        estates: user.assignedEstates,
        divisions: user.assignedDivisions,
      },
      debugInfo: {
        isSuperAdmin: this.isSuperAdmin(user),
        isCompanyAdmin: user.role === 'COMPANY_ADMIN',
        hasExplicitPermissions,
        permissionSource: user.role === 'SUPER_ADMIN' ? 'super_admin' :
          hasExplicitPermissions ? 'explicit' : 'role'
      }
    };
  }

  // Debug specific permission check
  static debugPermissionCheck(
    user: User | null,
    permission: string,
    companyId?: string
  ): {
    granted: boolean;
    reason: string;
    steps: Array<{
      step: string;
      result: boolean;
      details: string;
    }>;
    context: {
      userRole: UserRole | null;
      effectivePermissions: string[];
      companyAccess: string[];
      cacheHit: boolean;
    };
  } {
    const steps: Array<{ step: string; result: boolean; details: string }> = [];

    // Step 1: User existence check
    steps.push({
      step: 'User Check',
      result: !!user,
      details: user ? `User exists: ${user.email} (${user.role})` : 'No user provided'
    });

    if (!user) {
      return {
        granted: false,
        reason: 'No user provided',
        steps,
        context: {
          userRole: null,
          effectivePermissions: [],
          companyAccess: [],
          cacheHit: false
        }
      };
    }

    // Step 2: Cache check
    const cachedResult = permissionCache.get(user, permission, companyId);
    const cacheHit = cachedResult !== null;

    steps.push({
      step: 'Cache Check',
      result: cacheHit,
      details: cacheHit ? `Cache hit: ${cachedResult}` : 'Cache miss - will calculate'
    });

    // Step 3: Super Admin check
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    steps.push({
      step: 'Super Admin Check',
      result: isSuperAdmin,
      details: isSuperAdmin ? 'User is super admin - granted all permissions' : 'User is not super admin'
    });

    if (isSuperAdmin) {
      return {
        granted: true,
        reason: 'Super admin has all permissions',
        steps,
        context: {
          userRole: user.role,
          effectivePermissions: ['*'],
          companyAccess: this.getAccessibleCompanies(user),
          cacheHit
        }
      };
    }

    // Step 4: Company scope check
    if (companyId) {
      const hasCompanyAccess = this.canAccessCompanyData(user, companyId);
      steps.push({
        step: 'Company Access Check',
        result: hasCompanyAccess,
        details: hasCompanyAccess ?
          `User can access company ${companyId}` :
          `User cannot access company ${companyId}`
      });

      if (!hasCompanyAccess) {
        return {
          granted: false,
          reason: `No access to company ${companyId}`,
          steps,
          context: {
            userRole: user.role,
            effectivePermissions: [],
            companyAccess: this.getAccessibleCompanies(user),
            cacheHit
          }
        };
      }
    }

    // Step 5: Permission resolution
    const effectivePermissions = user.permissions && user.permissions.length > 0
      ? user.permissions
      : ROLE_PERMISSIONS[user.role] || [];

    steps.push({
      step: 'Permission Resolution',
      result: effectivePermissions.length > 0,
      details: `Using ${user.permissions && user.permissions.length > 0 ? 'explicit' : 'role-based'} permissions: ${effectivePermissions.length} permissions`
    });

    // Step 6: Permission match
    const hasPermission = effectivePermissions.includes(permission);
    steps.push({
      step: 'Permission Match',
      result: hasPermission,
      details: hasPermission ?
        `Permission '${permission}' found in user permissions` :
        `Permission '${permission}' not found. Available: ${effectivePermissions.slice(0, 3).join(', ')}${effectivePermissions.length > 3 ? '...' : ''}`
    });

    const granted = cacheHit ? cachedResult : hasPermission;

    return {
      granted,
      reason: granted ? 'Permission granted' : `Permission '${permission}' not found`,
      steps,
      context: {
        userRole: user.role,
        effectivePermissions,
        companyAccess: this.getAccessibleCompanies(user),
        cacheHit
      }
    };
  }

  // Debug action permission check with detailed analysis
  static debugActionCheck(
    user: User | null,
    action: string,
    resource?: any
  ): {
    granted: boolean;
    reason: string;
    requiredPermission: string | null;
    actionExists: boolean;
    permissionDebug: ReturnType<typeof PermissionManager.debugPermissionCheck>;
  } {
    if (!user) {
      return {
        granted: false,
        reason: 'No user provided',
        requiredPermission: null,
        actionExists: false,
        permissionDebug: this.debugPermissionCheck(null, '')
      };
    }

    // Check if action exists in our mapping
    const actionPermissions: Record<string, string> = {};
    // Re-extract action mappings from canPerformAction method
    const permissionMap = this._getActionPermissionMap();
    const requiredPermission = permissionMap[action];

    const actionExists = !!requiredPermission;

    if (!actionExists) {
      return {
        granted: false,
        reason: `Unknown action: ${action}. Available actions: ${Object.keys(permissionMap).slice(0, 5).join(', ')}...`,
        requiredPermission: null,
        actionExists: false,
        permissionDebug: this.debugPermissionCheck(user, '')
      };
    }

    const permissionDebug = this.debugPermissionCheck(user, requiredPermission, resource?.companyId);

    return {
      granted: permissionDebug.granted,
      reason: permissionDebug.granted ? `Action '${action}' granted` : `Action '${action}' denied: ${permissionDebug.reason}`,
      requiredPermission,
      actionExists: true,
      permissionDebug
    };
  }

  // Extract action-permission mapping for debugging
  private static _getActionPermissionMap(): Record<string, string> {
    // This would ideally be extracted from the canPerformAction method
    // For now, return a simplified version for debugging
    return {
      'create_harvest': PERMISSIONS.HARVEST_CREATE,
      'view_harvest': PERMISSIONS.HARVEST_READ,
      'update_harvest': PERMISSIONS.HARVEST_UPDATE,
      'delete_harvest': PERMISSIONS.HARVEST_DELETE,
      'approve_harvest': PERMISSIONS.APPROVAL_APPROVE,
      'reject_harvest': PERMISSIONS.APPROVAL_REJECT,
      'create_gate_check': PERMISSIONS.GATE_CHECK_CREATE,
      'view_gate_logs': PERMISSIONS.GATE_CHECK_READ,
      'update_gate_check': PERMISSIONS.GATE_CHECK_UPDATE,
      'view_reports': PERMISSIONS.REPORT_VIEW,
      'export_reports': PERMISSIONS.REPORT_EXPORT,
      'manage_users': PERMISSIONS.USER_MANAGE,
      'view_system_logs': PERMISSIONS.SYSTEM_LOGS,
      // Add more as needed for debugging
    };
  }

  // Performance analysis tools
  static getPermissionCacheStats(): {
    cacheSize: number;
    cacheHitRate: number;
    recentOperations: Array<{
      timestamp: number;
      operation: 'hit' | 'miss' | 'set' | 'clear';
      key?: string;
    }>;
  } {
    // This would require tracking cache operations
    // Simplified implementation for now
    return {
      cacheSize: permissionCache['cache']?.size || 0,
      cacheHitRate: 0.85, // Would be calculated from actual stats
      recentOperations: [
        { timestamp: Date.now(), operation: 'hit' },
        { timestamp: Date.now() - 1000, operation: 'miss' },
        { timestamp: Date.now() - 2000, operation: 'set' }
      ]
    };
  }

  // Generate permission report for user
  static generatePermissionReport(user: User | null): string {
    if (!user) return 'No user provided for permission report';

    const analysis = this.analyzeUserPermissions(user);

    let report = `
=== PERMISSION REPORT FOR ${user.email} ===
Role: ${analysis.role}
Permission Source: ${analysis.debugInfo.permissionSource}
Is Super Admin: ${analysis.debugInfo.isSuperAdmin}
Is Company Admin: ${analysis.debugInfo.isCompanyAdmin}

=== EFFECTIVE PERMISSIONS (${analysis.effectivePermissions.length}) ===
${analysis.effectivePermissions.map(p => `- ${p}`).join('\n')}

=== AVAILABLE ACTIONS (${analysis.availableActions.length}) ===
${analysis.availableActions.map(a => `- ${a}`).join('\n')}

=== COMPANY ACCESS ===
${analysis.companyAccess.length > 0 ? analysis.companyAccess.map(c => `- ${c}`).join('\n') : '- No company access'}

=== ASSIGNMENT SCOPE ===
Companies: ${analysis.assignmentScope.companies?.join(', ') || 'None'}
Estates: ${analysis.assignmentScope.estates?.join(', ') || 'None'}  
Divisions: ${analysis.assignmentScope.divisions?.join(', ') || 'None'}

=== CACHE STATS ===
Cache Size: ${this.getPermissionCacheStats().cacheSize}
Cache Hit Rate: ${(this.getPermissionCacheStats().cacheHitRate * 100).toFixed(1)}%

Report generated at: ${new Date().toISOString()}
    `.trim();

    return report;
  }

  // Test permission patterns
  static testPermissionPatterns(user: User | null): {
    wildcardTests: Array<{ pattern: string; result: boolean }>;
    multiActionTests: Array<{ pattern: string; result: boolean }>;
    resourceTests: Array<{ action: string; resource: any; result: boolean }>;
  } {
    if (!user) {
      return {
        wildcardTests: [],
        multiActionTests: [],
        resourceTests: []
      };
    }

    const wildcardTests = [
      { pattern: 'harvest:*', result: this.hasWildcardPermission(user, 'harvest:*') },
      { pattern: 'user:*', result: this.hasWildcardPermission(user, 'user:*') },
      { pattern: 'gate_check:*', result: this.hasWildcardPermission(user, 'gate_check:*') },
      { pattern: 'report:*', result: this.hasWildcardPermission(user, 'report:*') },
    ];

    const multiActionTests = [
      { pattern: 'harvest:read,write', result: this.hasWildcardPermission(user, 'harvest:read,write') },
      { pattern: 'user:read,update', result: this.hasWildcardPermission(user, 'user:read,update') },
      { pattern: 'report:view,export', result: this.hasWildcardPermission(user, 'report:view,export') },
    ];

    const resourceTests = [
      {
        action: 'create_harvest',
        resource: { type: 'harvest', id: 'new', context: { estateId: user.estate } },
        result: this.canPerformResourceAction(user, 'create_harvest', {
          type: 'harvest',
          id: 'new',
          context: { estateId: user.estate }
        })
      },
      {
        action: 'view_users',
        resource: { type: 'user', id: 'list', context: { companyId: user.companyId } },
        result: this.canPerformResourceAction(user, 'view_users', {
          type: 'user',
          id: 'list',
          context: { companyId: user.companyId }
        })
      }
    ];

    return { wildcardTests, multiActionTests, resourceTests };
  }
}
