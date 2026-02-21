import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  RBACStoreState,
  RBACStoreActions,
  Role,
  Permission,
  RoleHierarchyNode,
  UserPermissionOverride,
  PermissionTemplate,
  SystemAnalytics,
  AuditTrailEntry,
  BulkOperationStatus,
  PermissionSearchFilters,
  MatrixDisplayOptions,
  TreeNodeState,
  RoleFormData,
  PermissionChange,
  BulkActionPayload
} from '@/types/rbac';

// Initial state
const initialState: Omit<RBACStoreState, 'actions'> = {
  // Data
  roles: [],
  permissions: [],
  roleHierarchy: [],
  userOverrides: [],
  permissionTemplates: [],
  analytics: {
    totalUsers: 0,
    activeSessions: 0,
    permissionChangesLast30Days: 0,
    roleAssignmentsLast30Days: 0,
    systemHealthScore: 100,
    cacheHitRate: 0,
  },
  auditTrail: [],

  // UI State
  selectedRole: null,
  selectedPermissions: [],
  expandedNodes: new Set(),
  filters: {
    searchText: '',
    isActive: true,
  },
  displayOptions: {
    showInactive: false,
    showInherited: true,
    groupByResource: true,
    compactMode: false,
    virtualScrolling: true,
  },
  treeState: [],

  // Loading States
  isLoading: false,
  isSaving: false,
  error: null,

  // Pagination
  currentPage: 1,
  totalPages: 1,
  pageSize: 50,

  // Bulk Operations
  activeBulkOperations: [],
};

// Helper functions
const generateBulkOperationId = () => {
  return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const buildTreeState = (hierarchy: RoleHierarchyNode[]): TreeNodeState[] => {
  return hierarchy.map(node => ({
    id: node.role.id,
    isExpanded: node.level <= 2, // Expand first 2 levels by default
    isSelected: false,
    level: node.level,
    children: buildTreeState(node.children),
  }));
};

// Create the store
export const useRBACStore = create<RBACStoreState & RBACStoreActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Data Actions
      setRoles: (roles: Role[]) => set({ roles }, false, 'setRoles'),

      setPermissions: (permissions: Permission[]) => set({ permissions }, false, 'setPermissions'),

      setRoleHierarchy: (hierarchy: RoleHierarchyNode[]) =>
        set({
          roleHierarchy: hierarchy,
          treeState: buildTreeState(hierarchy)
        }, false, 'setRoleHierarchy'),

      setUserOverrides: (overrides: UserPermissionOverride[]) =>
        set({ userOverrides: overrides }, false, 'setUserOverrides'),

      setPermissionTemplates: (templates: PermissionTemplate[]) =>
        set({ permissionTemplates: templates }, false, 'setPermissionTemplates'),

      setAnalytics: (analytics: SystemAnalytics) => set({ analytics }, false, 'setAnalytics'),

      setAuditTrail: (trail: AuditTrailEntry[]) => set({ auditTrail: trail }, false, 'setAuditTrail'),

      // Role Actions
      createRole: async (roleData: RoleFormData) => {
        set({ isSaving: true, error: null }, false, 'createRole:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Creating role:', roleData);

          // Mock implementation for now
          const newRole: Role = {
            id: `role_${Date.now()}`,
            name: roleData.name,
            displayName: roleData.displayName,
            level: roleData.level,
            description: roleData.description,
            isActive: roleData.isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            roles: [...state.roles, newRole],
            isSaving: false
          }), false, 'createRole:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to create role'
          }, false, 'createRole:error');
        }
      },

      updateRole: async (roleId: string, updates: Partial<RoleFormData>) => {
        set({ isSaving: true, error: null }, false, 'updateRole:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Updating role:', roleId, updates);

          set(state => ({
            roles: state.roles.map(role =>
              role.id === roleId
                ? { ...role, ...updates, updatedAt: new Date().toISOString() }
                : role
            ),
            isSaving: false
          }), false, 'updateRole:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to update role'
          }, false, 'updateRole:error');
        }
      },

      deleteRole: async (roleId: string) => {
        set({ isSaving: true, error: null }, false, 'deleteRole:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Deleting role:', roleId);

          set(state => ({
            roles: state.roles.filter(role => role.id !== roleId),
            isSaving: false
          }), false, 'deleteRole:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to delete role'
          }, false, 'deleteRole:error');
        }
      },

      duplicateRole: async (roleId: string, newName: string) => {
        set({ isSaving: true, error: null }, false, 'duplicateRole:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Duplicating role:', roleId, newName);

          const state = get();
          const sourceRole = state.roles.find(r => r.id === roleId);
          if (!sourceRole) throw new Error('Source role not found');

          const duplicatedRole: Role = {
            ...sourceRole,
            id: `role_${Date.now()}`,
            name: newName,
            displayName: `${sourceRole.displayName} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            roles: [...state.roles, duplicatedRole],
            isSaving: false
          }), false, 'duplicateRole:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to duplicate role'
          }, false, 'duplicateRole:error');
        }
      },

      // Permission Actions
      grantRolePermission: async (roleId: string, permissionId: string) => {
        set({ isSaving: true, error: null }, false, 'grantRolePermission:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Granting permission to role:', roleId, permissionId);

          set({ isSaving: false }, false, 'grantRolePermission:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to grant permission'
          }, false, 'grantRolePermission:error');
        }
      },

      revokeRolePermission: async (roleId: string, permissionId: string) => {
        set({ isSaving: true, error: null }, false, 'revokeRolePermission:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Revoking permission from role:', roleId, permissionId);

          set({ isSaving: false }, false, 'revokeRolePermission:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to revoke permission'
          }, false, 'revokeRolePermission:error');
        }
      },

      bulkUpdateRolePermissions: async (changes: PermissionChange[]) => {
        set({ isSaving: true, error: null }, false, 'bulkUpdateRolePermissions:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Bulk updating role permissions:', changes);

          set({ isSaving: false }, false, 'bulkUpdateRolePermissions:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to bulk update permissions'
          }, false, 'bulkUpdateRolePermissions:error');
        }
      },

      // User Override Actions
      assignUserOverride: async (override: Omit<UserPermissionOverride, 'id' | 'createdAt' | 'createdBy'>) => {
        set({ isSaving: true, error: null }, false, 'assignUserOverride:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Assigning user override:', override);

          const newOverride: UserPermissionOverride = {
            ...override,
            id: `override_${Date.now()}`,
            createdAt: new Date().toISOString(),
            createdBy: 'current_user', // TODO: Get actual user ID
          };

          set(state => ({
            userOverrides: [...state.userOverrides, newOverride],
            isSaving: false
          }), false, 'assignUserOverride:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to assign user override'
          }, false, 'assignUserOverride:error');
        }
      },

      removeUserOverride: async (overrideId: string) => {
        set({ isSaving: true, error: null }, false, 'removeUserOverride:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Removing user override:', overrideId);

          set(state => ({
            userOverrides: state.userOverrides.filter(override => override.id !== overrideId),
            isSaving: false
          }), false, 'removeUserOverride:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to remove user override'
          }, false, 'removeUserOverride:error');
        }
      },

      clearUserOverrides: async (userId: string) => {
        set({ isSaving: true, error: null }, false, 'clearUserOverrides:start');

        try {
          // TODO: Implement GraphQL mutation
          console.log('Clearing user overrides for:', userId);

          set(state => ({
            userOverrides: state.userOverrides.filter(override => override.userId !== userId),
            isSaving: false
          }), false, 'clearUserOverrides:success');

        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to clear user overrides'
          }, false, 'clearUserOverrides:error');
        }
      },

      // UI Actions
      setSelectedRole: (roleId: string | null) => set({ selectedRole: roleId }, false, 'setSelectedRole'),

      setSelectedPermissions: (permissionIds: string[]) =>
        set({ selectedPermissions: permissionIds }, false, 'setSelectedPermissions'),

      toggleNodeExpansion: (nodeId: string) =>
        set(state => ({
          expandedNodes: new Set(
            state.expandedNodes.has(nodeId)
              ? [...state.expandedNodes].filter(id => id !== nodeId)
              : [...state.expandedNodes, nodeId]
          )
        }), false, 'toggleNodeExpansion'),

      setFilters: (filters: Partial<PermissionSearchFilters>) =>
        set(state => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1 // Reset to first page when filters change
        }), false, 'setFilters'),

      setDisplayOptions: (options: Partial<MatrixDisplayOptions>) =>
        set(state => ({
          displayOptions: { ...state.displayOptions, ...options }
        }), false, 'setDisplayOptions'),

      updateTreeState: (treeState: TreeNodeState[]) => set({ treeState }, false, 'updateTreeState'),

      // Bulk Operations
      startBulkOperation: (operation: Omit<BulkOperationStatus, 'id' | 'createdAt' | 'processedItems'>) => {
        const newOperation: BulkOperationStatus = {
          ...operation,
          id: generateBulkOperationId(),
          createdAt: new Date().toISOString(),
          processedItems: 0,
        };

        set(state => ({
          activeBulkOperations: [...state.activeBulkOperations, newOperation]
        }), false, 'startBulkOperation');
      },

      updateBulkOperation: (operationId: string, updates: Partial<BulkOperationStatus>) =>
        set(state => ({
          activeBulkOperations: state.activeBulkOperations.map(op =>
            op.id === operationId ? { ...op, ...updates } : op
          )
        }), false, 'updateBulkOperation'),

      cancelBulkOperation: (operationId: string) =>
        set(state => ({
          activeBulkOperations: state.activeBulkOperations.map(op =>
            op.id === operationId
              ? { ...op, status: 'CANCELLED', completedAt: new Date().toISOString() }
              : op
          )
        }), false, 'cancelBulkOperation'),

      // Utility Actions
      setLoading: (isLoading: boolean) => set({ isLoading }, false, 'setLoading'),

      setSaving: (isSaving: boolean) => set({ isSaving }, false, 'setSaving'),

      setError: (error: string | null) => set({ error }, false, 'setError'),

      refreshData: async () => {
        set({ isLoading: true, error: null }, false, 'refreshData:start');

        try {
          // TODO: Implement data fetching
          console.log('Refreshing RBAC data...');

          // Mock data refresh
          await new Promise(resolve => setTimeout(resolve, 1000));

          set({ isLoading: false }, false, 'refreshData:success');

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh data'
          }, false, 'refreshData:error');
        }
      },

      resetStore: () => set(initialState, false, 'resetStore'),
    }),
    {
      name: 'rbac-store',
    }
  )
);

// Selectors for commonly used combinations
export const useRBACData = () => useRBACStore(state => ({
  roles: state.roles,
  permissions: state.permissions,
  roleHierarchy: state.roleHierarchy,
  userOverrides: state.userOverrides,
  permissionTemplates: state.permissionTemplates,
}));

export const useRBACUI = () => useRBACStore(state => ({
  selectedRole: state.selectedRole,
  selectedPermissions: state.selectedPermissions,
  expandedNodes: state.expandedNodes,
  filters: state.filters,
  displayOptions: state.displayOptions,
  treeState: state.treeState,
}));

export const useRBACLoading = () => useRBACStore(state => ({
  isLoading: state.isLoading,
  isSaving: state.isSaving,
  error: state.error,
}));

export const useRBACActions = () => useRBACStore(state => ({
  setRoles: state.setRoles,
  setPermissions: state.setPermissions,
  setRoleHierarchy: state.setRoleHierarchy,
  createRole: state.createRole,
  updateRole: state.updateRole,
  deleteRole: state.deleteRole,
  grantRolePermission: state.grantRolePermission,
  revokeRolePermission: state.revokeRolePermission,
  setSelectedRole: state.setSelectedRole,
  setSelectedPermissions: state.setSelectedPermissions,
  toggleNodeExpansion: state.toggleNodeExpansion,
  setFilters: state.setFilters,
  setDisplayOptions: state.setDisplayOptions,
  refreshData: state.refreshData,
}));