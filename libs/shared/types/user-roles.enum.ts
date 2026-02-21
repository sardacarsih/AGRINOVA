export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin', 
  AREA_MANAGER = 'area_manager',
  MANAGER = 'manager',
  ASISTEN = 'asisten',
  MANDOR = 'mandor',
  SATPAM = 'satpam',
  ADMIN = 'admin'
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  scopes: AccessScope[];
}

export enum Permission {
  // User Management
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  VIEW_USER = 'VIEW_USER',

  // Company Management
  CREATE_COMPANY = 'CREATE_COMPANY',
  UPDATE_COMPANY = 'UPDATE_COMPANY',
  DELETE_COMPANY = 'DELETE_COMPANY',
  VIEW_COMPANY = 'VIEW_COMPANY',

  // Harvest Management
  CREATE_HARVEST = 'CREATE_HARVEST',
  UPDATE_HARVEST = 'UPDATE_HARVEST',
  DELETE_HARVEST = 'DELETE_HARVEST',
  VIEW_HARVEST = 'VIEW_HARVEST',
  APPROVE_HARVEST = 'APPROVE_HARVEST',
  REJECT_HARVEST = 'REJECT_HARVEST',

  // Gate Check
  CREATE_GATE_CHECK = 'CREATE_GATE_CHECK',
  UPDATE_GATE_CHECK = 'UPDATE_GATE_CHECK',
  VIEW_GATE_CHECK = 'VIEW_GATE_CHECK',

  // Reporting
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',

  // System
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  VIEW_SYSTEM_HEALTH = 'VIEW_SYSTEM_HEALTH',
}

export enum AccessScope {
  SYSTEM = 'SYSTEM',        // Super Admin - all companies
  COMPANY = 'COMPANY',      // Company Admin - single company
  MULTI_COMPANY = 'MULTI_COMPANY', // Area Manager - multiple companies
  ESTATE = 'ESTATE',        // Manager - single estate
  MULTI_ESTATE = 'MULTI_ESTATE',   // Manager - multiple estates
  DIVISI = 'DIVISI',        // Asisten - single divisi
  MULTI_DIVISI = 'MULTI_DIVISI',   // Asisten - multiple divisi
  BLOCK = 'BLOCK',          // Mandor - specific blocks
  LOCATION = 'LOCATION'     // Satpam - specific gates/locations
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    role: UserRole.SUPER_ADMIN,
    permissions: Object.values(Permission),
    scopes: [AccessScope.SYSTEM]
  },
  [UserRole.COMPANY_ADMIN]: {
    role: UserRole.COMPANY_ADMIN,
    permissions: [
      Permission.CREATE_USER,
      Permission.UPDATE_USER,
      Permission.DELETE_USER,
      Permission.VIEW_USER,
      Permission.UPDATE_COMPANY,
      Permission.VIEW_COMPANY,
      Permission.VIEW_HARVEST,
      Permission.VIEW_GATE_CHECK,
      Permission.VIEW_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.VIEW_AUDIT_LOGS
    ],
    scopes: [AccessScope.COMPANY]
  },
  [UserRole.AREA_MANAGER]: {
    role: UserRole.AREA_MANAGER,
    permissions: [
      Permission.VIEW_USER,
      Permission.VIEW_COMPANY,
      Permission.VIEW_HARVEST,
      Permission.VIEW_GATE_CHECK,
      Permission.VIEW_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    scopes: [AccessScope.MULTI_COMPANY]
  },
  [UserRole.MANAGER]: {
    role: UserRole.MANAGER,
    permissions: [
      Permission.VIEW_USER,
      Permission.VIEW_HARVEST,
      Permission.VIEW_GATE_CHECK,
      Permission.VIEW_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    scopes: [AccessScope.ESTATE, AccessScope.MULTI_ESTATE]
  },
  [UserRole.ASISTEN]: {
    role: UserRole.ASISTEN,
    permissions: [
      Permission.VIEW_HARVEST,
      Permission.APPROVE_HARVEST,
      Permission.REJECT_HARVEST,
      Permission.VIEW_GATE_CHECK,
      Permission.VIEW_REPORTS
    ],
    scopes: [AccessScope.DIVISI, AccessScope.MULTI_DIVISI]
  },
  [UserRole.MANDOR]: {
    role: UserRole.MANDOR,
    permissions: [
      Permission.CREATE_HARVEST,
      Permission.UPDATE_HARVEST,
      Permission.VIEW_HARVEST
    ],
    scopes: [AccessScope.BLOCK]
  },
  [UserRole.SATPAM]: {
    role: UserRole.SATPAM,
    permissions: [
      Permission.CREATE_GATE_CHECK,
      Permission.UPDATE_GATE_CHECK,
      Permission.VIEW_GATE_CHECK
    ],
    scopes: [AccessScope.LOCATION]
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    permissions: [
      Permission.VIEW_USER,
      Permission.VIEW_HARVEST,
      Permission.VIEW_GATE_CHECK,
      Permission.VIEW_REPORTS,
      Permission.VIEW_SYSTEM_HEALTH
    ],
    scopes: [AccessScope.COMPANY]
  }
};