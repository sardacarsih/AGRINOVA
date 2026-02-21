import type { UserRole } from '@/types/user';
import { isValidUserRole, getAllValidRoles } from '@/types/user';

// STRICT: Only standardized role configurations are supported
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'COMPANY_ADMIN': 'Company Admin',
    'AREA_MANAGER': 'Area Manager',
    'MANAGER': 'Manager',
    'ASISTEN': 'Asisten',
    'MANDOR': 'Mandor',
    'SATPAM': 'Satpam',
    'TIMBANGAN': 'Timbangan',
    'GRADING': 'Grading',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'Kelola seluruh sistem lintas perusahaan & assign company admin',
    'COMPANY_ADMIN': 'Kelola master data perusahaan (estate, divisi, blok, karyawan, user)',
    'AREA_MANAGER': 'Monitoring lintas unit & pelaporan regional',
    'MANAGER': 'Monitoring & laporan estate/divisi',
    'ASISTEN': 'Approve data panen & monitoring operasional',
    'MANDOR': 'Input data panen & kelola karyawan lapangan',
    'SATPAM': 'Gate check & pencatatan keluar masuk kendaraan',
    'TIMBANGAN': 'Pencatatan timbangan TBS di PKS',
    'GRADING': 'Kualitas dan grading TBS',
};

export const DEFAULT_DASHBOARD_PATHS: Record<UserRole, string> = {
    'SUPER_ADMIN': '/dashboard/super-admin',
    'COMPANY_ADMIN': '/dashboard/company-admin',
    'AREA_MANAGER': '/dashboard/area-manager',
    'MANAGER': '/dashboard/manager',
    'ASISTEN': '/dashboard/asisten',
    'MANDOR': '/dashboard/mandor',
    'SATPAM': '/dashboard/satpam',
    'TIMBANGAN': '/dashboard/timbangan',
    'GRADING': '/dashboard/grading',
};

// Role validation and utilities

/**
 * STRICT: Gets role label - no fallback for unsupported roles
 */
export function getRoleLabel(role: UserRole): string {
    if (!isValidUserRole(role)) {
        throw new Error(`Invalid role: ${role}. Role must be one of: ${getAllValidRoles().join(', ')}`);
    }
    return USER_ROLE_LABELS[role];
}

/**
 * STRICT: Gets role description - no fallback for unsupported roles
 */
export function getRoleDescription(role: UserRole): string {
    if (!isValidUserRole(role)) {
        throw new Error(`Invalid role: ${role}. Role must be one of: ${getAllValidRoles().join(', ')}`);
    }
    return USER_ROLE_DESCRIPTIONS[role];
}

/**
 * STRICT: Gets dashboard path - no fallback for unsupported roles
 */
export function getDashboardPath(role: UserRole): string {
    if (!isValidUserRole(role)) {
        throw new Error(`Invalid role: ${role}. Role must be one of: ${getAllValidRoles().join(', ')}`);
    }
    return DEFAULT_DASHBOARD_PATHS[role];
}

/**
 * STRICT: Validates role - throws error for invalid roles
 */
export function validateRoleStrict(role: unknown): UserRole {
    if (typeof role !== 'string') {
        throw new Error(`Role must be a string, got ${typeof role}`);
    }

    if (!isValidUserRole(role)) {
        throw new Error(`Invalid role: ${role}. Valid roles are: ${getAllValidRoles().join(', ')}`);
    }

    return role as UserRole;
}

/**
 * Gets all supported roles - only standard roles
 */
export function getSupportedRoles(): UserRole[] {
    return getAllValidRoles();
}

/**
 * STRICT: Checks if role has web dashboard access - throws error for invalid roles
 */
export function hasWebAccess(role: UserRole): boolean {
    validateRoleStrict(role);

    // Mandor, Timbangan, and Grading only have mobile access
    if (role === 'MANDOR' || role === 'TIMBANGAN' || role === 'GRADING') {
        return false;
    }

    // All other roles have web access
    return true;
}

/**
 * STRICT: Checks if role has mobile app access - throws error for invalid roles
 */
export function hasMobileAccess(role: UserRole): boolean {
    validateRoleStrict(role);

    // Super Admin and Company Admin are web-only
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN') {
        return false;
    }

    // All other roles have mobile access
    return true;
}

/**
 * STRICT: Validates role format - no fallbacks, strict enforcement
 */
export function validateRoleFormat(role: unknown): UserRole {
    if (typeof role !== 'string') {
        throw new Error(`Invalid role format: Expected string, got ${typeof role}`);
    }

    const validRoles = getAllValidRoles();
    if (!validRoles.includes(role as UserRole)) {
        throw new Error(`Invalid role: '${role}'. Valid roles are: ${validRoles.join(', ')}. No legacy roles are supported.`);
    }

    return role as UserRole;
}
