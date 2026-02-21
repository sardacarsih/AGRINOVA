// Standardized UserRole type matching backend string constants
// ONLY standard roles are supported - includes field operational roles
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'AREA_MANAGER' | 'MANAGER' | 'ASISTEN' | 'MANDOR' | 'SATPAM' | 'TIMBANGAN' | 'GRADING';

// Role hierarchy level constants (lower number = higher authority)
export const ROLE_HIERARCHY_LEVELS = {
    'SUPER_ADMIN': 1,
    'COMPANY_ADMIN': 2,
    'AREA_MANAGER': 3,
    'MANAGER': 4,
    'ASISTEN': 5,
    'MANDOR': 6,
    'SATPAM': 7,
    'TIMBANGAN': 8,
    'GRADING': 9,
} as const;

// Role validation and conversion utilities

/**
 * Type guard to check if a string is a valid UserRole
 * STRICT: Only standard roles are accepted
 */
export function isValidUserRole(role: string): role is UserRole {
    return Object.keys(ROLE_HIERARCHY_LEVELS).includes(role);
}

/**
 * Converts any role string to standardized UserRole or throws error
 */
export function toStandardRole(role: string): UserRole {
    if (isValidUserRole(role)) {
        return role as UserRole;
    }
    throw new Error(`Invalid user role: ${role}. Valid roles are: ${Object.keys(ROLE_HIERARCHY_LEVELS).join(', ')}`);
}

/**
 * STRICT role conversion - no fallbacks allowed
 * Throws error for any invalid role - ensures strict compliance
 */
export function toStandardRoleStrict(role: string): UserRole {
    if (isValidUserRole(role)) {
        return role as UserRole;
    }
    throw new Error(`Invalid user role: ${role}. Valid roles are: ${Object.keys(ROLE_HIERARCHY_LEVELS).join(', ')}`);
}

/**
 * Gets all valid UserRole values as array
 */
export function getAllValidRoles(): UserRole[] {
    return Object.keys(ROLE_HIERARCHY_LEVELS) as UserRole[];
}

/**
 * Gets role hierarchy level (lower number = higher authority)
 */
export function getRoleLevel(role: UserRole): number {
    return ROLE_HIERARCHY_LEVELS[role];
}

/**
 * Checks if role1 can access role2 based on hierarchy
 * (role1 can access if its level is <= role2's level)
 */
export function canRoleAccessRole(requesterRole: UserRole, targetRole: UserRole): boolean {
    return getRoleLevel(requesterRole) <= getRoleLevel(targetRole);
}

/**
 * Gets roles that the given role can manage/create
 */
export function getManageableRoles(requesterRole: UserRole): UserRole[] {
    const requesterLevel = getRoleLevel(requesterRole);

    switch (requesterRole) {
        case 'SUPER_ADMIN':
            return getAllValidRoles();
        case 'COMPANY_ADMIN':
            return getAllValidRoles().filter(role => role !== 'SUPER_ADMIN');
        default:
            // Other roles can only manage themselves
            return [requesterRole];
    }
}

/**
 * Role metadata interface
 */
export interface RoleMetadata {
    role: UserRole;
    level: number;
    name: string;
    description: string;
    hasWebAccess: boolean;
    hasMobileAccess: boolean;
}

/**
 * Gets detailed metadata for a role
 */
export function getRoleMetadata(role: UserRole): RoleMetadata {
    const metadata: Record<UserRole, RoleMetadata> = {
        'SUPER_ADMIN': {
            role: 'SUPER_ADMIN',
            level: 1,
            name: 'Super Administrator',
            description: 'System-wide administrative access with full control over all operations',
            hasWebAccess: true,
            hasMobileAccess: false,
        },
        'COMPANY_ADMIN': {
            role: 'COMPANY_ADMIN',
            level: 2,
            name: 'Company Administrator',
            description: 'Company-level administrative access with control over company operations',
            hasWebAccess: true,
            hasMobileAccess: false,
        },
        'AREA_MANAGER': {
            role: 'AREA_MANAGER',
            level: 3,
            name: 'Area Manager',
            description: 'Multi-company monitoring access for area oversight',
            hasWebAccess: true,
            hasMobileAccess: true,
        },
        'MANAGER': {
            role: 'MANAGER',
            level: 4,
            name: 'Manager',
            description: 'Estate-level management with access to multiple estates',
            hasWebAccess: true,
            hasMobileAccess: true,
        },
        'ASISTEN': {
            role: 'ASISTEN',
            level: 5,
            name: 'Assistant',
            description: 'Division-level assistant with approval and rejection capabilities',
            hasWebAccess: true,
            hasMobileAccess: true,
        },
        'MANDOR': {
            role: 'MANDOR',
            level: 6,
            name: 'Supervisor',
            description: 'Field-level supervisor responsible for harvest data input',
            hasWebAccess: false,
            hasMobileAccess: true,
        },
        'SATPAM': {
            role: 'SATPAM',
            level: 7,
            name: 'Security Guard',
            description: 'Security personnel with gate check and vehicle monitoring access',
            hasWebAccess: true,
            hasMobileAccess: true,
        },
        'TIMBANGAN': {
            role: 'TIMBANGAN',
            level: 8,
            name: 'Weighing Operator',
            description: 'Weighing station operator responsible for TBS weighing and recording',
            hasWebAccess: false,
            hasMobileAccess: true,
        },
        'GRADING': {
            role: 'GRADING',
            level: 9,
            name: 'Grading Staff',
            description: 'Quality control staff responsible for TBS grading and classification',
            hasWebAccess: false,
            hasMobileAccess: true,
        },
    };

    return metadata[role];
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface User {
    id: string;
    email: string;
    username?: string;
    password?: string;
    name: string;
    role: UserRole; // STRICT: Only standard roles allowed
    avatar?: string;
    company?: string;
    companyId?: string;
    estate?: string;
    divisi?: string;
    permissions: string[];
    createdAt: Date;
    lastLogin?: Date;
    employeeId?: string;
    phoneNumber?: string;
    position?: string;
    status?: 'active' | 'inactive' | 'suspended';
    notes?: string;
    // Company admin specific fields
    companyAdminFor?: string[]; // Company IDs user is admin for
    isCurrentCompanyAdmin?: boolean; // Is admin for current company context

    // Multi-assignment fields for Manager and Asisten roles
    assignedEstates?: string[]; // Estate IDs for Manager role multi-assignment
    assignedEstateNames?: string[]; // Estate names for display
    assignedDivisions?: string[]; // Division IDs for Asisten role multi-assignment  
    assignedDivisionNames?: string[]; // Division names for display

    // Multi-assignment fields for Area Manager role
    assignedCompanies?: string[]; // Company IDs for Area Manager role multi-assignment
    assignedCompanyNames?: string[]; // Company names for display

    // Hierarchical Reporting - Manager reports to Area Manager
    reportingToAreaManagerId?: string; // Area Manager ID that this Manager reports to
    reportingToAreaManagerName?: string; // Area Manager name for display
    directReportManagerIds?: string[]; // Manager IDs that report to this Area Manager
    directReportManagerNames?: string[]; // Manager names for display

    // Legacy support - these fields maintain backward compatibility
    // estate/divisi remain for single-assignment roles and display purposes
}

export interface UserProfile {
    id: string;
    userId: string;
    displayName?: string;
    phoneNumber?: string;
    position?: string;
    employeeId?: string;
    department?: string;
    supervisor?: string;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserPreferences {
    language: 'id' | 'en';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    dashboard: {
        defaultView: string;
        autoRefresh: boolean;
        refreshInterval: number;
    };
}

export interface AuthSession {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data?: AuthSession;
    errors?: Record<string, string[]>;
}

export interface LoginAttempt {
    email: string;
    success: boolean;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
    lastLoginAttempt: LoginAttempt | null;
}

export interface QRCodeData {
    type: 'login';
    sessionId: string;
    expiresAt: number;
    redirect?: string;
}
