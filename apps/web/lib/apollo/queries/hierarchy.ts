import { gql } from 'graphql-tag';

// Get hierarchy tree query
export const GET_HIERARCHY_TREE = gql`
  query GetHierarchyTree($filters: HierarchyFilters) {
    hierarchyTree(filters: $filters) {
      nodes {
        id
        type
        name
        code
        status
        level
        parentId
        children {
          id
          type
          name
          code
          status
          level
        }
        metadata
        stats {
          totalUsers
          activeUsers
          subNodes
          harvestVolume
        }
        permissions {
          canView
          canEdit
          canDelete
          canAddChildren
        }
        createdAt
        updatedAt
      }
      totalNodes
      maxDepth
      lastUpdated
    }
  }
`;

// Get hierarchy node details query
export const GET_HIERARCHY_NODE = gql`
  query GetHierarchyNode($nodeId: ID!, $includeChildren: Boolean = true) {
    hierarchyNode(nodeId: $nodeId) {
      id
      type
      name
      code
      description
      status
      level
      parentId
      parent {
        id
        type
        name
        code
      }
      children @include(if: $includeChildren) {
        id
        type
        name
        code
        status
        level
        stats {
          totalUsers
          activeUsers
          subNodes
        }
      }
      metadata
      assignments {
        userId
        role
        permissions
        assignedAt
        assignedBy {
          id
          username
          name
        }
        user {
          id
          username
          name
          email
          role
        }
      }
      stats {
        totalUsers
        activeUsers
        subNodes
        harvestVolume
        lastActivity
      }
      permissions {
        canView
        canEdit
        canDelete
        canAddChildren
        canManageUsers
      }
      auditTrail {
        id
        action
        performedBy {
          id
          username
          name
        }
        performedAt
        changes
        reason
      }
      createdAt
      createdBy {
        id
        username
        name
      }
      updatedAt
      updatedBy {
        id
        username
        name
      }
    }
  }
`;

// Create hierarchy node mutation
export const CREATE_HIERARCHY_NODE = gql`
  mutation CreateHierarchyNode($node: CreateHierarchyNodeInput!) {
    createHierarchyNode(node: $node) {
      id
      type
      name
      code
      description
      status
      level
      parentId
      parent {
        id
        name
        code
      }
      metadata
      permissions {
        canView
        canEdit
        canDelete
        canAddChildren
      }
      createdAt
      createdBy {
        id
        username
        name
      }
    }
  }
`;

// Update hierarchy node mutation
export const UPDATE_HIERARCHY_NODE = gql`
  mutation UpdateHierarchyNode($nodeId: ID!, $updates: UpdateHierarchyNodeInput!) {
    updateHierarchyNode(nodeId: $nodeId, updates: $updates) {
      id
      type
      name
      code
      description
      status
      metadata
      updatedAt
      updatedBy {
        id
        username
        name
      }
      auditTrail {
        id
        action
        performedBy {
          id
          username
          name
        }
        performedAt
        changes
        reason
      }
    }
  }
`;

// Move hierarchy node mutation
export const MOVE_HIERARCHY_NODE = gql`
  mutation MoveHierarchyNode($nodeId: ID!, $newParentId: ID!, $position: Int) {
    moveHierarchyNode(nodeId: $nodeId, newParentId: $newParentId, position: $position) {
      id
      parentId
      level
      parent {
        id
        name
        code
      }
      affectedNodes {
        id
        name
        newLevel
        newParentId
      }
      movedAt
      movedBy {
        id
        username
        name
      }
    }
  }
`;

// Delete hierarchy node mutation
export const DELETE_HIERARCHY_NODE = gql`
  mutation DeleteHierarchyNode($nodeId: ID!, $options: DeleteNodeOptions) {
    deleteHierarchyNode(nodeId: $nodeId, options: $options) {
      success
      message
      deletedNodeId
      affectedUsers {
        id
        username
        name
        reassignedTo {
          id
          name
        }
      }
      affectedChildren {
        id
        name
        action
        newParentId
      }
      deletedAt
      deletedBy {
        id
        username
        name
      }
    }
  }
`;

// Bulk hierarchy operation mutation
export const BULK_HIERARCHY_OPERATION = gql`
  mutation BulkHierarchyOperation($operation: BulkHierarchyOperation!) {
    bulkHierarchyOperation(operation: $operation) {
      successful {
        nodeId
        nodeName
        action
        message
      }
      failed {
        nodeId
        nodeName
        error
        message
      }
      summary {
        totalNodes
        successful
        failed
        affectedUsers
      }
      operationId
      completedAt
    }
  }
`;

// Validate hierarchy query
export const VALIDATE_HIERARCHY = gql`
  query ValidateHierarchy($nodeId: ID, $operation: String) {
    validateHierarchy(nodeId: $nodeId, operation: $operation) {
      isValid
      errors {
        type
        message
        nodeId
        nodeName
        severity
      }
      warnings {
        type
        message
        nodeId
        nodeName
        recommendations
      }
      statistics {
        totalNodes
        orphanedNodes
        circularReferences
        depthViolations
        duplicateNames
      }
    }
  }
`;

// Get hierarchy conflicts query
export const GET_HIERARCHY_CONFLICTS = gql`
  query GetHierarchyConflicts {
    hierarchyConflicts {
      id
      type
      severity
      description
      affectedNodes {
        id
        name
        type
        level
      }
      conflictDetails
      resolutionOptions {
        id
        description
        impact
        recommendation
      }
      detectedAt
      resolvedAt
      resolvedBy {
        id
        username
        name
      }
      status
    }
  }
`;

// Resolve hierarchy conflict mutation
export const RESOLVE_HIERARCHY_CONFLICT = gql`
  mutation ResolveHierarchyConflict($conflictId: ID!, $resolution: ConflictResolution!) {
    resolveHierarchyConflict(conflictId: $conflictId, resolution: $resolution) {
      id
      status
      resolvedAt
      resolvedBy {
        id
        username
        name
      }
      resolutionDetails
      affectedNodes {
        id
        name
        changes
      }
      followUpActions
    }
  }
`;

// Search hierarchy query
export const SEARCH_HIERARCHY = gql`
  query SearchHierarchy($query: String!, $filters: HierarchySearchFilters) {
    searchHierarchy(query: $query, filters: $filters) {
      nodes {
        id
        type
        name
        code
        description
        level
        parentId
        parent {
          id
          name
          code
        }
        breadcrumb {
          id
          name
          type
        }
        relevanceScore
        matchedFields
        stats {
          totalUsers
          activeUsers
        }
      }
      total
      searchTime
      suggestions
    }
  }
`;

// Export hierarchy mutation
export const EXPORT_HIERARCHY = gql`
  mutation ExportHierarchy($options: ExportHierarchyOptions!) {
    exportHierarchy(options: $options) {
      success
      message
      downloadUrl
      expiresAt
      format
      nodeCount
      fileSize
    }
  }
`;

// Import hierarchy mutation
export const IMPORT_HIERARCHY = gql`
  mutation ImportHierarchy($file: Upload!, $options: ImportHierarchyOptions!) {
    importHierarchy(file: $file, options: $options) {
      success
      message
      summary {
        totalRecords
        imported
        updated
        skipped
        errors
      }
      errors {
        row
        field
        error
        data
      }
      warnings {
        row
        message
        data
      }
      preview {
        nodes {
          id
          name
          type
          action
          parent
        }
      }
    }
  }
`;

// Get hierarchy analytics query
export const GET_HIERARCHY_ANALYTICS = gql`
  query GetHierarchyAnalytics($filters: HierarchyAnalyticsFilters) {
    hierarchyAnalytics(filters: $filters) {
      overview {
        totalNodes
        totalLevels
        averageBranchingFactor
        deepestPath
        mostConnectedNode
        lastUpdate
      }
      distribution {
        byType {
          type
          count
          percentage
        }
        byLevel {
          level
          count
          averageChildren
        }
        byStatus {
          status
          count
          percentage
        }
      }
      utilization {
        nodesWithUsers
        orphanedNodes
        underutilizedNodes
        overloadedNodes
        averageUsersPerNode
      }
      performance {
        queryPerformance
        updateFrequency
        conflictRate
        maintenanceNeeded
      }
      trends {
        date
        nodeCount
        userAssignments
        conflicts
        utilization
      }
      recommendations {
        type
        priority
        description
        impact
        effort
        affectedNodes
      }
    }
  }
`;

// Subscribe to hierarchy changes
export const HIERARCHY_CHANGES_SUBSCRIPTION = gql`
  subscription HierarchyChanges($nodeId: ID, $includeChildren: Boolean = false) {
    hierarchyChanges(nodeId: $nodeId, includeChildren: $includeChildren) {
      id
      type
      action
      nodeId
      nodeName
      nodeType
      parentId
      changes
      performedBy {
        id
        username
        name
      }
      performedAt
      reason
    }
  }
`;

// Type definitions
export interface HierarchyFilters {
  type?: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'BLOCK';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  parentId?: string;
  level?: number;
  includeStats?: boolean;
  includePermissions?: boolean;
}

export interface CreateHierarchyNodeInput {
  type: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'BLOCK';
  name: string;
  code?: string;
  description?: string;
  parentId?: string;
  metadata?: Record<string, any>;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateHierarchyNodeInput {
  name?: string;
  code?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  metadata?: Record<string, any>;
  reason?: string;
}

export interface DeleteNodeOptions {
  reassignUsersTo?: string;
  reassignChildrenTo?: string;
  archiveOnly?: boolean;
  reason?: string;
}

export interface BulkHierarchyOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  nodes: Array<{
    nodeId?: string;
    data: any;
  }>;
  options?: Record<string, any>;
  reason?: string;
}

export interface ConflictResolution {
  resolutionType: string;
  parameters?: Record<string, any>;
  reason: string;
}

export interface HierarchySearchFilters {
  type?: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'BLOCK';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  level?: number;
  hasUsers?: boolean;
  limit?: number;
}

export interface ExportHierarchyOptions {
  format: 'csv' | 'xlsx' | 'json' | 'xml';
  includeStats?: boolean;
  includeUsers?: boolean;
  includePermissions?: boolean;
  nodeIds?: string[];
  filters?: HierarchyFilters;
}

export interface ImportHierarchyOptions {
  validateOnly?: boolean;
  updateExisting?: boolean;
  skipInvalid?: boolean;
  createMissingParents?: boolean;
  defaultStatus?: 'ACTIVE' | 'INACTIVE';
}

export interface HierarchyAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  nodeType?: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'BLOCK';
  includeInactive?: boolean;
}

export interface HierarchyNode {
  id: string;
  type: 'COMPANY' | 'ESTATE' | 'DIVISION' | 'BLOCK';
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  level: number;
  parentId?: string;
  parent?: {
    id: string;
    type: string;
    name: string;
    code?: string;
  };
  children?: HierarchyNode[];
  metadata?: Record<string, any>;
  stats?: {
    totalUsers: number;
    activeUsers: number;
    subNodes: number;
    harvestVolume?: number;
    lastActivity?: string;
  };
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAddChildren: boolean;
    canManageUsers?: boolean;
  };
  createdAt: string;
  createdBy?: {
    id: string;
    username: string;
    name: string;
  };
  updatedAt: string;
  updatedBy?: {
    id: string;
    username: string;
    name: string;
  };
}