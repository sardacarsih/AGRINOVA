// RBAC (Role-Based Access Control) Types for Agrinova Dashboard

// Basic Role Types
export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Basic Permission Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

// Role Permission Association
export interface RolePermission {
  roleId: string;
  permissionId: string;
  isDirect: boolean; // true if directly assigned, false if inherited
  inheritedFrom?: string; // role name if inherited
}

// Permission Scope for user overrides
export interface PermissionScope {
  type: 'company' | 'estate' | 'division' | 'global';
  id: string;
  name?: string;
}

// User Permission Override
export interface UserPermissionOverride {
  id: string;
  userId: string;
  permissionName: string;
  isGranted: boolean;
  scope?: PermissionScope;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

// User Permission Set
export interface UserPermissionSet {
  userId: string;
  role: string;
  permissions: string[];
  overrides: UserPermissionOverride[];
}

// Matrix Cell State
export interface MatrixCell {
  roleId: string;
  permissionId: string;
  hasPermission: boolean;
  isDirect: boolean;
  inheritedFrom?: string;
  userOverrides?: UserPermissionOverride[];
}

// Matrix Data Structure
export interface RolePermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  cells: MatrixCell[];
  hierarchy: RoleHierarchy[];
}

// Role Hierarchy for inheritance visualization
export interface RoleHierarchy {
  role: Role;
  inheritsFrom?: Role[];
  inheritsTo?: Role[];
  level: number;
}

// Role hierarchy node for tree display
export interface RoleHierarchyNode {
  role: Role;
  children: RoleHierarchyNode[];
  level: number;
  isExpanded?: boolean;
  permissions?: Permission[];
}

// Filter and Search Options
export interface MatrixFilterOptions {
  roleSearch?: string;
  permissionSearch?: string;
  resourceFilter?: string;
  actionFilter?: string;
  showInactiveRoles?: boolean;
  showInactivePermissions?: boolean;
  showInheritedOnly?: boolean;
  showDirectOnly?: boolean;
}

// Editing State
export interface MatrixEditingState {
  isEditing: boolean;
  selectedRole?: Role;
  selectedPermissions: string[];
  pendingChanges: PermissionChange[];
  isSaving: boolean;
}

// Permission Change for batch updates
export interface PermissionChange {
  roleId: string;
  permissionId: string;
  action: 'grant' | 'revoke';
  isDirect?: boolean;
}

// Statistics for RBAC Overview
export interface RBACStatistics {
  totalRoles: number;
  activeRoles: number;
  totalPermissions: number;
  activePermissions: number;
  totalRolePermissions: number;
  totalUserOverrides: number;
  cacheStats?: {
    hitRate: number;
    size: number;
    lastCleanup: string;
  };
}

// API Response Types
export interface RolePermissionResponse {
  rolePermissions: {
    roleName: string;
    permissions: Array<{
      permissionName: string;
      isDirect: boolean;
      inheritedFrom?: string;
    }>;
  };
}

export interface PermissionMatrixResponse {
  matrix: RolePermissionMatrix;
  statistics: RBACStatistics;
}

// Component Props
export interface RolePermissionMatrixProps {
  user: any; // User type from auth system
  canManage: boolean;
  className?: string;
  onPermissionChange?: (changes: PermissionChange[]) => void;
  onRoleSelect?: (role: Role) => void;
}

// Cell Click Handler
export interface CellClickHandler {
  (cell: MatrixCell): void;
}

// Bulk Action Types
export type BulkAction = 'grant' | 'revoke' | 'toggle';

export interface BulkActionPayload {
  action: BulkAction;
  roleIds: string[];
  permissionIds: string[];
  isDirect?: boolean;
}

// Export Types for Permission Categories
export type PermissionResource =
  | 'user'
  | 'role'
  | 'permission'
  | 'company'
  | 'estate'
  | 'division'
  | 'harvest'
  | 'gate_check'
  | 'weighing'
  | 'grading'
  | 'report'
  | 'analytics'
  | 'system'
  | 'dashboard'
  | 'assignment'
  | 'approval';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'manage'
  | 'assign'
  | 'revoke'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'sync'
  | 'monitor';

// Enhanced types for modern RBAC redesign

// Permission Template for role creation
export interface PermissionTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role Form Data
export interface RoleFormData {
  name: string;
  displayName: string;
  level: number;
  description: string;
  isActive: boolean;
  templateId?: string;
  customPermissions?: string[];
}

// Permission Search Filters
export interface PermissionSearchFilters {
  resource?: PermissionResource;
  action?: PermissionAction;
  searchText?: string;
  isActive?: boolean;
  category?: string;
}

// Matrix Display Options
export interface MatrixDisplayOptions {
  showInactive: boolean;
  showInherited: boolean;
  groupByResource: boolean;
  compactMode: boolean;
  virtualScrolling: boolean;
}

// Tree Node State for Role Hierarchy
export interface TreeNodeState {
  id: string;
  isExpanded: boolean;
  isSelected: boolean;
  children: TreeNodeState[];
  level: number;
}

// Analytics Data Types
export interface RoleUsageAnalytics {
  roleName: string;
  userCount: number;
  permissionCount: number;
  lastAssigned?: string;
  activityScore: number;
}

export interface PermissionUsageAnalytics {
  permissionName: string;
  roleCount: number;
  userOverrideCount: number;
  usageFrequency: number;
  resourceType: PermissionResource;
}

export interface SystemAnalytics {
  totalUsers: number;
  activeSessions: number;
  permissionChangesLast30Days: number;
  roleAssignmentsLast30Days: number;
  systemHealthScore: number;
  cacheHitRate: number;
}

// Audit Trail Entry
export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'REVOKE';
  entityType: 'ROLE' | 'PERMISSION' | 'USER_OVERRIDE';
  entityId: string;
  entityName: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
}

// Bulk Operation Status
export interface BulkOperationStatus {
  id: string;
  type: 'ROLE_PERMISSION' | 'USER_OVERRIDE' | 'ROLE_CREATE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalItems: number;
  processedItems: number;
  errors: string[];
  createdAt: string;
  completedAt?: string;
}

// RBAC Store State
export interface RBACStoreState {
  // Data
  roles: Role[];
  permissions: Permission[];
  roleHierarchy: RoleHierarchyNode[];
  userOverrides: UserPermissionOverride[];
  permissionTemplates: PermissionTemplate[];
  analytics: SystemAnalytics;
  auditTrail: AuditTrailEntry[];

  // UI State
  selectedRole: string | null;
  selectedPermissions: string[];
  expandedNodes: Set<string>;
  filters: PermissionSearchFilters;
  displayOptions: MatrixDisplayOptions;
  treeState: TreeNodeState[];

  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;

  // Bulk Operations
  activeBulkOperations: BulkOperationStatus[];
}

// RBAC Store Actions
export interface RBACStoreActions {
  // Data Actions
  setRoles: (roles: Role[]) => void;
  setPermissions: (permissions: Permission[]) => void;
  setRoleHierarchy: (hierarchy: RoleHierarchyNode[]) => void;
  setUserOverrides: (overrides: UserPermissionOverride[]) => void;
  setPermissionTemplates: (templates: PermissionTemplate[]) => void;
  setAnalytics: (analytics: SystemAnalytics) => void;
  setAuditTrail: (trail: AuditTrailEntry[]) => void;

  // Role Actions
  createRole: (roleData: RoleFormData) => Promise<void>;
  updateRole: (roleId: string, updates: Partial<RoleFormData>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  duplicateRole: (roleId: string, newName: string) => Promise<void>;

  // Permission Actions
  grantRolePermission: (roleId: string, permissionId: string) => Promise<void>;
  revokeRolePermission: (roleId: string, permissionId: string) => Promise<void>;
  bulkUpdateRolePermissions: (changes: PermissionChange[]) => Promise<void>;

  // User Override Actions
  assignUserOverride: (override: Omit<UserPermissionOverride, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  removeUserOverride: (overrideId: string) => Promise<void>;
  clearUserOverrides: (userId: string) => Promise<void>;

  // UI Actions
  setSelectedRole: (roleId: string | null) => void;
  setSelectedPermissions: (permissionIds: string[]) => void;
  toggleNodeExpansion: (nodeId: string) => void;
  setFilters: (filters: Partial<PermissionSearchFilters>) => void;
  setDisplayOptions: (options: Partial<MatrixDisplayOptions>) => void;
  updateTreeState: (treeState: TreeNodeState[]) => void;

  // Bulk Operations
  startBulkOperation: (operation: Omit<BulkOperationStatus, 'id' | 'createdAt' | 'processedItems'>) => void;
  updateBulkOperation: (operationId: string, updates: Partial<BulkOperationStatus>) => void;
  cancelBulkOperation: (operationId: string) => void;

  // Utility Actions
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
  refreshData: () => Promise<void>;
  resetStore: () => void;
}

// Component Props for New Components

export interface RoleHierarchyTreeProps {
  roles: Role[];
  hierarchy: RoleHierarchyNode[];
  selectedRoleId?: string;
  expandedNodes: Set<string>;
  onNodeSelect: (roleId: string) => void;
  onNodeToggle: (roleId: string) => void;
  onRoleEdit: (roleId: string) => void;
  onRoleDelete: (roleId: string) => void;
  canManage: boolean;
  className?: string;
}

export interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  rolePermissions: MatrixCell[];
  selectedRole?: string;
  selectedPermissions: string[];
  displayOptions: MatrixDisplayOptions;
  onRoleSelect: (roleId: string) => void;
  onPermissionToggle: (roleId: string, permissionId: string) => void;
  onBulkSelection: (permissionIds: string[]) => void;
  canManage: boolean;
  className?: string;
}

export interface RBACAnalyticsProps {
  analytics: SystemAnalytics;
  roleUsage: RoleUsageAnalytics[];
  permissionUsage: PermissionUsageAnalytics[];
  onRefresh: () => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  className?: string;
}

export interface PermissionSearchProps {
  filters: PermissionSearchFilters;
  onFiltersChange: (filters: PermissionSearchFilters) => void;
  recentPermissions: string[];
  onPermissionSelect: (permissionId: string) => void;
  canManage: boolean;
  className?: string;
}

export interface BulkOperationPanelProps {
  selectedRoles: string[];
  selectedPermissions: string[];
  operations: BulkOperationStatus[];
  onOperationStart: (type: BulkActionPayload) => void;
  onOperationCancel: (operationId: string) => void;
  onClearSelection: () => void;
  canManage: boolean;
  className?: string;
}

// Enhanced RBAC Page Layout Props
export interface RBACPageLayoutProps {
  user: any;
  children: React.ReactNode;
  canManage: boolean;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

// RBAC Dashboard Tab Data
export interface RBACDashboardData {
  quickStats: {
    totalRoles: number;
    activeUsers: number;
    pendingChanges: number;
    systemAlerts: number;
  };
  recentActivity: AuditTrailEntry[];
  topRoles: RoleUsageAnalytics[];
  systemHealth: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}