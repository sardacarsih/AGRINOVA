import { gql } from 'graphql-tag';

/**
 * Role Hierarchy GraphQL Queries
 *
 * These queries provide role hierarchy management capabilities for the RBAC system.
 * All queries use the 'rbac' prefix to avoid naming conflicts.
 */

// ============================================================================
// ROLE FRAGMENTS
// ============================================================================

export const ROLE_BASIC_FRAGMENT = gql`
  fragment RoleBasicFields on Role {
    id
    name
    displayName
    level
    description
    isActive
    isSystem
  }
`;

export const ROLE_HIERARCHY_NODE_FRAGMENT = gql`
  fragment RoleHierarchyNodeFields on RoleHierarchyNode {
    role {
      ...RoleBasicFields
    }
    level
    permissions
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Roles Above
// ============================================================================

export const GET_ROLES_ABOVE = gql`
  query GetRolesAbove($roleName: String!) {
    rbacRolesAbove(roleName: $roleName) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Roles Below
// ============================================================================

export const GET_ROLES_BELOW = gql`
  query GetRolesBelow($roleName: String!) {
    rbacRolesBelow(roleName: $roleName) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Subordinate Roles
// ============================================================================

export const GET_SUBORDINATE_ROLES = gql`
  query GetSubordinateRoles($roleName: String!) {
    rbacSubordinateRoles(roleName: $roleName) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Superior Roles
// ============================================================================

export const GET_SUPERIOR_ROLES = gql`
  query GetSuperiorRoles($roleName: String!) {
    rbacSuperiorRoles(roleName: $roleName) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Roles At Level
// ============================================================================

export const GET_ROLES_AT_LEVEL = gql`
  query GetRolesAtLevel($level: Int!) {
    rbacRolesAtLevel(level: $level) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Get Roles By Level Range
// ============================================================================

export const GET_ROLES_BY_LEVEL_RANGE = gql`
  query GetRolesByLevelRange($minLevel: Int!, $maxLevel: Int!) {
    rbacRolesByLevelRange(minLevel: $minLevel, maxLevel: $maxLevel) {
      ...RoleBasicFields
    }
  }
  ${ROLE_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERY: Can Role Manage
// ============================================================================

export const CAN_ROLE_MANAGE = gql`
  query CanRoleManage($sourceRole: String!, $targetRole: String!) {
    rbacCanRoleManage(sourceRole: $sourceRole, targetRole: $targetRole)
  }
`;

// ============================================================================
// QUERY: Get Role Relationship
// ============================================================================

export const GET_ROLE_RELATIONSHIP = gql`
  query GetRoleRelationship($sourceRole: String!, $targetRole: String!) {
    rbacRoleRelationship(sourceRole: $sourceRole, targetRole: $targetRole) {
      sourceRole
      targetRole
      canManage
      levelDifference
      relationship
    }
  }
`;

// ============================================================================
// QUERY: Get Effective Permissions
// ============================================================================

export const GET_EFFECTIVE_PERMISSIONS = gql`
  query GetEffectivePermissions($roleName: String!) {
    rbacEffectivePermissions(roleName: $roleName)
  }
`;

// ============================================================================
// QUERY: Get Role Hierarchy Tree
// ============================================================================

export const GET_ROLE_HIERARCHY_TREE = gql`
  query GetRoleHierarchyTree {
    rbacHierarchyTree {
      ...RoleHierarchyNodeFields
      children {
        ...RoleHierarchyNodeFields
        children {
          ...RoleHierarchyNodeFields
          children {
            ...RoleHierarchyNodeFields
            children {
              ...RoleHierarchyNodeFields
              children {
                ...RoleHierarchyNodeFields
                children {
                  ...RoleHierarchyNodeFields
                }
              }
            }
          }
        }
      }
    }
  }
  ${ROLE_HIERARCHY_NODE_FRAGMENT}
`;

// ============================================================================
// COMPOSITE QUERIES
// ============================================================================

/**
 * Get complete role context - includes role details, subordinates, and permissions
 */
export const GET_ROLE_COMPLETE_CONTEXT = gql`
  query GetRoleCompleteContext($roleName: String!) {
    role: rbacRolesAtLevel(level: 0) {
      ...RoleBasicFields
    }
    rolesAbove: rbacRolesAbove(roleName: $roleName) {
      ...RoleBasicFields
    }
    rolesBelow: rbacRolesBelow(roleName: $roleName) {
      ...RoleBasicFields
    }
    subordinates: rbacSubordinateRoles(roleName: $roleName) {
      ...RoleBasicFields
    }
    superiors: rbacSuperiorRoles(roleName: $roleName) {
      ...RoleBasicFields
    }
    effectivePermissions: rbacEffectivePermissions(roleName: $roleName)
  }
  ${ROLE_BASIC_FRAGMENT}
`;

/**
 * Get management capability matrix for UI
 */
export const GET_MANAGEMENT_MATRIX = gql`
  query GetManagementMatrix($sourceRole: String!, $targetRoles: [String!]!) {
    matrix: rbacRoleRelationship(sourceRole: $sourceRole, targetRole: "") {
      sourceRole
      targetRole
      canManage
      levelDifference
      relationship
    }
  }
`;

// ============================================================================
// TYPE DEFINITIONS (for TypeScript)
// ============================================================================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface RoleHierarchyNode {
  role: Role;
  level: number;
  permissions: string[];
  children?: RoleHierarchyNode[];
}

export interface RoleRelationship {
  sourceRole: string;
  targetRole: string;
  canManage: boolean;
  levelDifference: number;
  relationship: 'superior' | 'subordinate' | 'equal' | 'unrelated';
}

// ============================================================================
// QUERY VARIABLES TYPES
// ============================================================================

export interface GetRolesAboveVariables {
  roleName: string;
}

export interface GetRolesBelowVariables {
  roleName: string;
}

export interface GetSubordinateRolesVariables {
  roleName: string;
}

export interface GetSuperiorRolesVariables {
  roleName: string;
}

export interface GetRolesAtLevelVariables {
  level: number;
}

export interface GetRolesByLevelRangeVariables {
  minLevel: number;
  maxLevel: number;
}

export interface CanRoleManageVariables {
  sourceRole: string;
  targetRole: string;
}

export interface GetRoleRelationshipVariables {
  sourceRole: string;
  targetRole: string;
}

export interface GetEffectivePermissionsVariables {
  roleName: string;
}

export interface GetRoleCompleteContextVariables {
  roleName: string;
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

export interface GetRolesAboveResult {
  rbacRolesAbove: Role[];
}

export interface GetRolesBelowResult {
  rbacRolesBelow: Role[];
}

export interface GetSubordinateRolesResult {
  rbacSubordinateRoles: Role[];
}

export interface GetSuperiorRolesResult {
  rbacSuperiorRoles: Role[];
}

export interface GetRolesAtLevelResult {
  rbacRolesAtLevel: Role[];
}

export interface GetRolesByLevelRangeResult {
  rbacRolesByLevelRange: Role[];
}

export interface CanRoleManageResult {
  rbacCanRoleManage: boolean;
}

export interface GetRoleRelationshipResult {
  rbacRoleRelationship: RoleRelationship;
}

export interface GetEffectivePermissionsResult {
  rbacEffectivePermissions: string[];
}

export interface GetRoleHierarchyTreeResult {
  rbacHierarchyTree: RoleHierarchyNode[];
}

export interface GetRoleCompleteContextResult {
  role: Role[];
  rolesAbove: Role[];
  rolesBelow: Role[];
  subordinates: Role[];
  superiors: Role[];
  effectivePermissions: string[];
}
