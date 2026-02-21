import { useQuery } from '@apollo/client/react';
import type { QueryResult } from '@apollo/client/react/types/types';
import {
  GET_ROLES_ABOVE,
  GET_ROLES_BELOW,
  GET_SUBORDINATE_ROLES,
  GET_SUPERIOR_ROLES,
  GET_ROLES_AT_LEVEL,
  GET_ROLES_BY_LEVEL_RANGE,
  CAN_ROLE_MANAGE,
  GET_ROLE_RELATIONSHIP,
  GET_EFFECTIVE_PERMISSIONS,
  GET_ROLE_HIERARCHY_TREE,
  GET_ROLE_COMPLETE_CONTEXT,
  type Role,
  type RoleHierarchyNode,
  type RoleRelationship,
  type GetRolesAboveVariables,
  type GetRolesAboveResult,
  type GetRolesBelowVariables,
  type GetRolesBelowResult,
  type GetSubordinateRolesVariables,
  type GetSubordinateRolesResult,
  type GetSuperiorRolesVariables,
  type GetSuperiorRolesResult,
  type GetRolesAtLevelVariables,
  type GetRolesAtLevelResult,
  type GetRolesByLevelRangeVariables,
  type GetRolesByLevelRangeResult,
  type CanRoleManageVariables,
  type CanRoleManageResult,
  type GetRoleRelationshipVariables,
  type GetRoleRelationshipResult,
  type GetEffectivePermissionsVariables,
  type GetEffectivePermissionsResult,
  type GetRoleHierarchyTreeResult,
  type GetRoleCompleteContextVariables,
  type GetRoleCompleteContextResult,
} from '@/lib/apollo/queries/rbac-hierarchy';

// ============================================================================
// HOOK: useRolesAbove
// ============================================================================

/**
 * Get all roles with higher authority than the specified role
 *
 * @param roleName - The role name to query (e.g., "MANDOR")
 * @param options - Apollo query options
 * @returns Query result with roles above the specified role
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRolesAbove("MANDOR");
 * // Returns: [SUPER_ADMIN, COMPANY_ADMIN, AREA_MANAGER, MANAGER, ASISTEN]
 * ```
 */
export function useRolesAbove(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetRolesAboveResult, GetRolesAboveVariables> {
  return useQuery<GetRolesAboveResult, GetRolesAboveVariables>(
    GET_ROLES_ABOVE,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// HOOK: useRolesBelow
// ============================================================================

/**
 * Get all roles with lower authority than the specified role
 *
 * @param roleName - The role name to query (e.g., "MANAGER")
 * @param options - Apollo query options
 * @returns Query result with roles below the specified role
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRolesBelow("MANAGER");
 * // Returns: [ASISTEN, MANDOR, SATPAM]
 * ```
 */
export function useRolesBelow(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetRolesBelowResult, GetRolesBelowVariables> {
  return useQuery<GetRolesBelowResult, GetRolesBelowVariables>(
    GET_ROLES_BELOW,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// HOOK: useSubordinateRoles
// ============================================================================

/**
 * Get direct subordinate roles (one level below)
 *
 * @param roleName - The role name to query (e.g., "MANAGER")
 * @param options - Apollo query options
 * @returns Query result with direct subordinate roles
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useSubordinateRoles("MANAGER");
 * // Returns: [ASISTEN] (only one level below)
 * ```
 */
export function useSubordinateRoles(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetSubordinateRolesResult, GetSubordinateRolesVariables> {
  return useQuery<GetSubordinateRolesResult, GetSubordinateRolesVariables>(
    GET_SUBORDINATE_ROLES,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// HOOK: useSuperiorRoles
// ============================================================================

/**
 * Get direct superior roles (one level above)
 *
 * @param roleName - The role name to query (e.g., "MANDOR")
 * @param options - Apollo query options
 * @returns Query result with direct superior roles
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useSuperiorRoles("MANDOR");
 * // Returns: [ASISTEN] (only one level above)
 * ```
 */
export function useSuperiorRoles(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetSuperiorRolesResult, GetSuperiorRolesVariables> {
  return useQuery<GetSuperiorRolesResult, GetSuperiorRolesVariables>(
    GET_SUPERIOR_ROLES,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// HOOK: useRolesAtLevel
// ============================================================================

/**
 * Get all roles at a specific hierarchy level
 *
 * @param level - The hierarchy level (1-7)
 * @param options - Apollo query options
 * @returns Query result with roles at the specified level
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRolesAtLevel(4);
 * // Returns: [MANAGER]
 * ```
 */
export function useRolesAtLevel(
  level: number,
  options?: { skip?: boolean }
): QueryResult<GetRolesAtLevelResult, GetRolesAtLevelVariables> {
  return useQuery<GetRolesAtLevelResult, GetRolesAtLevelVariables>(
    GET_ROLES_AT_LEVEL,
    {
      variables: { level },
      skip: options?.skip || level === undefined,
    }
  );
}

// ============================================================================
// HOOK: useRolesByLevelRange
// ============================================================================

/**
 * Get all roles within a level range (inclusive)
 *
 * @param minLevel - Minimum level (inclusive)
 * @param maxLevel - Maximum level (inclusive)
 * @param options - Apollo query options
 * @returns Query result with roles in the specified range
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRolesByLevelRange(1, 3);
 * // Returns: [SUPER_ADMIN, COMPANY_ADMIN, AREA_MANAGER]
 * ```
 */
export function useRolesByLevelRange(
  minLevel: number,
  maxLevel: number,
  options?: { skip?: boolean }
): QueryResult<GetRolesByLevelRangeResult, GetRolesByLevelRangeVariables> {
  return useQuery<GetRolesByLevelRangeResult, GetRolesByLevelRangeVariables>(
    GET_ROLES_BY_LEVEL_RANGE,
    {
      variables: { minLevel, maxLevel },
      skip: options?.skip || minLevel === undefined || maxLevel === undefined,
    }
  );
}

// ============================================================================
// HOOK: useCanRoleManage
// ============================================================================

/**
 * Check if source role can manage target role
 *
 * @param sourceRole - The managing role name (e.g., "MANAGER")
 * @param targetRole - The target role name (e.g., "MANDOR")
 * @param options - Apollo query options
 * @returns Query result with boolean indicating management capability
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useCanRoleManage("MANAGER", "MANDOR");
 * // Returns: true (MANAGER can manage MANDOR)
 * ```
 */
export function useCanRoleManage(
  sourceRole: string,
  targetRole: string,
  options?: { skip?: boolean }
): QueryResult<CanRoleManageResult, CanRoleManageVariables> {
  return useQuery<CanRoleManageResult, CanRoleManageVariables>(
    CAN_ROLE_MANAGE,
    {
      variables: { sourceRole, targetRole },
      skip: options?.skip || !sourceRole || !targetRole,
    }
  );
}

// ============================================================================
// HOOK: useRoleRelationship
// ============================================================================

/**
 * Get detailed relationship between two roles
 *
 * @param sourceRole - The source role name (e.g., "MANAGER")
 * @param targetRole - The target role name (e.g., "MANDOR")
 * @param options - Apollo query options
 * @returns Query result with relationship metadata
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRoleRelationship("MANAGER", "MANDOR");
 * // Returns: { canManage: true, levelDifference: -2, relationship: "superior" }
 * ```
 */
export function useRoleRelationship(
  sourceRole: string,
  targetRole: string,
  options?: { skip?: boolean }
): QueryResult<GetRoleRelationshipResult, GetRoleRelationshipVariables> {
  return useQuery<GetRoleRelationshipResult, GetRoleRelationshipVariables>(
    GET_ROLE_RELATIONSHIP,
    {
      variables: { sourceRole, targetRole },
      skip: options?.skip || !sourceRole || !targetRole,
    }
  );
}

// ============================================================================
// HOOK: useEffectivePermissions
// ============================================================================

/**
 * Get role permissions including inherited permissions
 *
 * @param roleName - The role name to query (e.g., "MANDOR")
 * @param options - Apollo query options
 * @returns Query result with effective permissions list
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useEffectivePermissions("MANDOR");
 * // Returns: ["harvest.create", "harvest.approve", "user.manage", ...]
 * ```
 */
export function useEffectivePermissions(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetEffectivePermissionsResult, GetEffectivePermissionsVariables> {
  return useQuery<GetEffectivePermissionsResult, GetEffectivePermissionsVariables>(
    GET_EFFECTIVE_PERMISSIONS,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// HOOK: useRoleHierarchyTree
// ============================================================================

/**
 * Get complete RBAC role hierarchy as a tree structure
 *
 * @param options - Apollo query options
 * @returns Query result with complete role hierarchy tree
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRoleHierarchyTree();
 * // Returns tree structure with SUPER_ADMIN at root, children nested below
 * ```
 */
export function useRoleHierarchyTree(
  options?: { skip?: boolean }
): QueryResult<GetRoleHierarchyTreeResult, {}> {
  return useQuery<GetRoleHierarchyTreeResult, {}>(
    GET_ROLE_HIERARCHY_TREE,
    {
      skip: options?.skip,
    }
  );
}

// ============================================================================
// HOOK: useRoleCompleteContext
// ============================================================================

/**
 * Get complete role context including hierarchy and permissions
 *
 * @param roleName - The role name to query (e.g., "MANAGER")
 * @param options - Apollo query options
 * @returns Query result with complete role context
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useRoleCompleteContext("MANAGER");
 * // Returns: { rolesAbove, rolesBelow, subordinates, superiors, effectivePermissions }
 * ```
 */
export function useRoleCompleteContext(
  roleName: string,
  options?: { skip?: boolean }
): QueryResult<GetRoleCompleteContextResult, GetRoleCompleteContextVariables> {
  return useQuery<GetRoleCompleteContextResult, GetRoleCompleteContextVariables>(
    GET_ROLE_COMPLETE_CONTEXT,
    {
      variables: { roleName },
      skip: options?.skip || !roleName,
    }
  );
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get manageable roles for a specific user role
 *
 * @param userRole - The current user's role
 * @returns Roles that can be managed by this user
 *
 * @example
 * ```tsx
 * const { manageableRoles, loading } = useManageableRoles("MANAGER");
 * // Returns: [ASISTEN, MANDOR, SATPAM]
 * ```
 */
export function useManageableRoles(userRole: string) {
  const { data, loading, error } = useRolesBelow(userRole);

  return {
    manageableRoles: data?.rbacRolesBelow || [],
    loading,
    error,
  };
}

/**
 * Check if current user can manage a specific role
 *
 * @param userRole - The current user's role
 * @param targetRole - The role to check management capability
 * @returns Boolean indicating if user can manage target role
 *
 * @example
 * ```tsx
 * const { canManage, loading } = useUserCanManageRole("MANAGER", "MANDOR");
 * // Returns: { canManage: true, loading: false }
 * ```
 */
export function useUserCanManageRole(userRole: string, targetRole: string) {
  const { data, loading, error } = useCanRoleManage(userRole, targetRole);

  return {
    canManage: data?.rbacCanRoleManage || false,
    loading,
    error,
  };
}

/**
 * Get role hierarchy breadcrumbs for UI navigation
 *
 * @param roleName - The role to get breadcrumbs for
 * @returns Array of roles from top to current role
 *
 * @example
 * ```tsx
 * const { breadcrumbs, loading } = useRoleHierarchyBreadcrumbs("MANDOR");
 * // Returns: [SUPER_ADMIN, COMPANY_ADMIN, AREA_MANAGER, MANAGER, ASISTEN, MANDOR]
 * ```
 */
export function useRoleHierarchyBreadcrumbs(roleName: string) {
  const { data: rolesAboveData, loading: loadingAbove } = useRolesAbove(roleName);
  const { data: currentRoleData, loading: loadingCurrent } = useRolesAtLevel(0, { skip: true });

  return {
    breadcrumbs: rolesAboveData?.rbacRolesAbove || [],
    loading: loadingAbove || loadingCurrent,
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  Role,
  RoleHierarchyNode,
  RoleRelationship,
};
