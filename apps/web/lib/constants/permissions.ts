import type { UserRole } from '@/types/user';

/**
 * @deprecated This file contains static permission definitions.
 *
 * ⚠️ DEPRECATION NOTICE ⚠️
 *
 * This static permission system is being replaced by a dynamic RBAC system.
 *
 * **New approach:**
 * ```typescript
 * import { getDynamicPermissionManager } from '@/lib/auth/dynamic-permission-service';
 *
 * const manager = getDynamicPermissionManager(apolloClient);
 * const hasPermission = await manager.hasPermission(user, 'company:create');
 * ```
 *
 * **Benefits of the new system:**
 * - Permissions loaded dynamically from database via GraphQL
 * - Role hierarchy with inheritance
 * - User-specific permission overrides
 * - Scoped permissions (company, estate, division, block)
 * - Temporal permissions with expiration dates
 * - Real-time updates without code deployment
 *
 * **Migration Guide:** See docs/RBAC_MIGRATION_ANALYSIS.md
 *
 * **Timeline:**
 * - Deprecated: 2025-12-01
 * - Removal: TBD (after all components migrated)
 */

// Permission definitions
export const PERMISSIONS = {
    // Super Admin permissions
    SUPER_ADMIN_ALL: 'super_admin:all',
    COMPANY_CREATE: 'company:create',
    COMPANY_READ: 'company:read',
    COMPANY_UPDATE: 'company:update',
    COMPANY_DELETE: 'company:delete',
    COMPANY_ADMIN_ASSIGN: 'company_admin:assign',
    COMPANY_ADMIN_REVOKE: 'company_admin:revoke',

    // Company Admin permissions (scoped to company)
    COMPANY_ADMIN_ALL: 'company_admin:all',
    ESTATE_CREATE: 'estate:create',
    ESTATE_READ: 'estate:read',
    ESTATE_UPDATE: 'estate:update',
    ESTATE_DELETE: 'estate:delete',
    DIVISI_CREATE: 'divisi:create',
    DIVISI_READ: 'divisi:read',
    DIVISI_UPDATE: 'divisi:update',
    DIVISI_DELETE: 'divisi:delete',
    BLOCK_CREATE: 'block:create',
    BLOCK_READ: 'block:read',
    BLOCK_UPDATE: 'block:update',
    BLOCK_DELETE: 'block:delete',
    EMPLOYEE_CREATE: 'employee:create',
    EMPLOYEE_READ: 'employee:read',
    EMPLOYEE_UPDATE: 'employee:update',
    EMPLOYEE_DELETE: 'employee:delete',

    // Hierarchical User Management
    USER_READ: 'user:read',
    USER_MANAGE: 'user:manage',
    USER_CREATE: 'user:create',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    USER_ASSIGN_ROLE: 'user:assign_role',
    USER_ASSIGN_SCOPE: 'user:assign_scope',

    // Scoped permissions
    USER_MANAGE_COMPANY: 'user:manage_company',
    USER_MANAGE_ESTATE: 'user:manage_estate',
    USER_MANAGE_DIVISION: 'user:manage_division',

    // Role-specific management
    MANAGE_COMPANY_ADMIN: 'manage:company_admin',
    MANAGE_AREA_MANAGER: 'manage:area_manager',
    ASSIGN_AREA_MANAGER_COMPANIES: 'assign:area_manager_companies', // Super-admin exclusive
    VIEW_AREA_MANAGER_ASSIGNMENTS: 'view:area_manager_assignments', // Super-admin exclusive
    MANAGE_MANAGER: 'manage:manager',
    MANAGE_ASISTEN: 'manage:asisten',
    MANAGE_MANDOR: 'manage:mandor',
    MANAGE_SATPAM: 'manage:satpam',

    // Harvest permissions
    HARVEST_CREATE: 'harvest:create',
    HARVEST_READ: 'harvest:read',
    HARVEST_UPDATE: 'harvest:update',
    HARVEST_DELETE: 'harvest:delete',

    // Approval permissions
    APPROVAL_VIEW: 'approval:view',
    APPROVAL_APPROVE: 'approval:approve',
    APPROVAL_REJECT: 'approval:reject',

    // Gate check permissions
    GATE_CHECK_CREATE: 'gate_check:create',
    GATE_CHECK_READ: 'gate_check:read',
    GATE_CHECK_UPDATE: 'gate_check:update',

    // Timbangan permissions
    WEIGHING_CREATE: 'weighing:create',
    WEIGHING_READ: 'weighing:read',
    WEIGHING_UPDATE: 'weighing:update',

    // Grading permissions
    GRADING_CREATE: 'grading:create',
    GRADING_READ: 'grading:read',
    GRADING_UPDATE: 'grading:update',
    QUALITY_APPROVE: 'quality:approve',
    QUALITY_REJECT: 'quality:reject',

    // Reporting
    REPORT_VIEW: 'reports:read',
    REPORT_EXPORT: 'report:export',

    // System admin
    SYSTEM_CONFIG: 'system:config',
    SYSTEM_LOGS: 'system:logs',
} as const;

/**
 * @deprecated Use GraphQL query GET_ROLE_PERMISSIONS instead
 *
 * **New approach:**
 * ```typescript
 * import { GET_ROLE_PERMISSIONS } from '@/lib/apollo/queries/rbac';
 *
 * const { data } = useQuery(GET_ROLE_PERMISSIONS, {
 *   variables: { roleName: 'super_admin' }
 * });
 * const permissions = data?.rolePermissions || [];
 * ```
 */
// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    'SUPER_ADMIN': [
        PERMISSIONS.SUPER_ADMIN_ALL,
        PERMISSIONS.COMPANY_CREATE,
        PERMISSIONS.COMPANY_READ,
        PERMISSIONS.COMPANY_UPDATE,
        PERMISSIONS.COMPANY_DELETE,
        PERMISSIONS.COMPANY_ADMIN_ASSIGN,
        PERMISSIONS.COMPANY_ADMIN_REVOKE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_ASSIGN_ROLE,
        PERMISSIONS.USER_ASSIGN_SCOPE,
        PERMISSIONS.USER_MANAGE_COMPANY,
        PERMISSIONS.MANAGE_COMPANY_ADMIN,
        PERMISSIONS.MANAGE_AREA_MANAGER,
        PERMISSIONS.ASSIGN_AREA_MANAGER_COMPANIES,
        PERMISSIONS.VIEW_AREA_MANAGER_ASSIGNMENTS,
        PERMISSIONS.MANAGE_MANAGER,
        PERMISSIONS.MANAGE_ASISTEN,
        PERMISSIONS.MANAGE_MANDOR,
        PERMISSIONS.MANAGE_SATPAM,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.SYSTEM_CONFIG,
        PERMISSIONS.SYSTEM_LOGS,
    ],
    'COMPANY_ADMIN': [
        PERMISSIONS.COMPANY_ADMIN_ALL,
        PERMISSIONS.ESTATE_CREATE,
        PERMISSIONS.ESTATE_READ,
        PERMISSIONS.ESTATE_UPDATE,
        PERMISSIONS.ESTATE_DELETE,
        PERMISSIONS.DIVISI_CREATE,
        PERMISSIONS.DIVISI_READ,
        PERMISSIONS.DIVISI_UPDATE,
        PERMISSIONS.DIVISI_DELETE,
        PERMISSIONS.BLOCK_CREATE,
        PERMISSIONS.BLOCK_READ,
        PERMISSIONS.BLOCK_UPDATE,
        PERMISSIONS.BLOCK_DELETE,
        PERMISSIONS.EMPLOYEE_CREATE,
        PERMISSIONS.EMPLOYEE_READ,
        PERMISSIONS.EMPLOYEE_UPDATE,
        PERMISSIONS.EMPLOYEE_DELETE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_ASSIGN_ROLE,
        PERMISSIONS.USER_ASSIGN_SCOPE,
        PERMISSIONS.USER_MANAGE_COMPANY,
        PERMISSIONS.USER_MANAGE_ESTATE,
        PERMISSIONS.USER_MANAGE_DIVISION,
        PERMISSIONS.MANAGE_AREA_MANAGER,
        PERMISSIONS.MANAGE_MANAGER,
        PERMISSIONS.MANAGE_ASISTEN,
        PERMISSIONS.MANAGE_MANDOR,
        PERMISSIONS.MANAGE_SATPAM,
        PERMISSIONS.HARVEST_READ,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
    ],
    'AREA_MANAGER': [
        PERMISSIONS.HARVEST_READ,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE_ESTATE,
        PERMISSIONS.USER_MANAGE_DIVISION,
        PERMISSIONS.MANAGE_MANAGER,
        PERMISSIONS.MANAGE_ASISTEN,
        PERMISSIONS.MANAGE_MANDOR,
        PERMISSIONS.MANAGE_SATPAM,
        PERMISSIONS.SYSTEM_LOGS,
    ],
    'MANAGER': [
        PERMISSIONS.HARVEST_READ,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE_ESTATE,
        PERMISSIONS.USER_MANAGE_DIVISION,
        PERMISSIONS.MANAGE_ASISTEN,
        PERMISSIONS.MANAGE_MANDOR,
        PERMISSIONS.MANAGE_SATPAM,
    ],
    'ASISTEN': [
        PERMISSIONS.HARVEST_READ,
        PERMISSIONS.APPROVAL_VIEW,
        PERMISSIONS.APPROVAL_APPROVE,
        PERMISSIONS.APPROVAL_REJECT,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.USER_READ,
    ],
    'MANDOR': [
        PERMISSIONS.HARVEST_CREATE,
        PERMISSIONS.HARVEST_READ,
        PERMISSIONS.HARVEST_UPDATE,
        PERMISSIONS.USER_READ,
    ],
    'SATPAM': [
        PERMISSIONS.GATE_CHECK_CREATE,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.GATE_CHECK_UPDATE,
        PERMISSIONS.HARVEST_READ,
    ],
    'TIMBANGAN': [
        PERMISSIONS.WEIGHING_CREATE,
        PERMISSIONS.WEIGHING_READ,
        PERMISSIONS.WEIGHING_UPDATE,
        PERMISSIONS.GATE_CHECK_READ,
        PERMISSIONS.REPORT_VIEW,
    ],
    'GRADING': [
        PERMISSIONS.GRADING_CREATE,
        PERMISSIONS.GRADING_READ,
        PERMISSIONS.GRADING_UPDATE,
        PERMISSIONS.QUALITY_APPROVE,
        PERMISSIONS.QUALITY_REJECT,
        PERMISSIONS.REPORT_VIEW,
    ],
};
