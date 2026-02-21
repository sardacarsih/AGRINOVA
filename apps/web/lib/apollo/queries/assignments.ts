import { gql } from 'graphql-tag';

// Get assignments query
export const GET_ASSIGNMENTS = gql`
  query GetAssignments($filters: AssignmentFilters) {
    assignments(filters: $filters) {
      data {
        id
        userId
        companyId
        estateIds
        divisionIds
        assignedCompanyIds
        createdAt
        updatedAt
        user {
          id
          username
          name
          email
          role
        }
        company {
          id
          name
          status
        }
        estates {
          id
          name
          lokasi
          luasHa
        }
        divisions {
          id
          name
          code
          estate {
            id
            name
          }
        }
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

// Get assignment by user ID query
export const GET_USER_ASSIGNMENT = gql`
  query GetUserAssignment($userId: ID!) {
    userAssignment(userId: $userId) {
      id
      userId
      companyId
      estateIds
      divisionIds
      assignedCompanyIds
      user {
        id
        username
        name
        email
        role
      }
      company {
        id
        name
        status
      }
      estates {
        id
        name
        lokasi
        luasHa
      }
      divisions {
        id
        name
        code
        estate {
          id
          name
        }
      }
    }
  }
`;

// Update assignment mutation
export const UPDATE_ASSIGNMENT = gql`
  mutation UpdateAssignment($userId: ID!, $assignment: AssignmentInput!) {
    updateAssignment(userId: $userId, assignment: $assignment) {
      id
      userId
      companyId
      estateIds
      divisionIds
      assignedCompanyIds
      user {
        id
        username
        name
        email
        role
      }
      company {
        id
        name
        status
      }
      estates {
        id
        name
        lokasi
        luasHa
      }
      divisions {
        id
        name
        code
        estate {
          id
          name
        }
      }
    }
  }
`;

// Bulk update assignments mutation
export const BULK_UPDATE_ASSIGNMENTS = gql`
  mutation BulkUpdateAssignments($request: BulkAssignmentUpdateRequest!) {
    bulkUpdateAssignments(request: $request) {
      successful {
        userId
        message
      }
      failed {
        userId
        error
        message
      }
      summary {
        totalRequests
        successful
        failed
      }
    }
  }
`;

// Get assignment conflicts query
export const GET_ASSIGNMENT_CONFLICTS = gql`
  query GetAssignmentConflicts {
    assignmentConflicts {
      id
      type
      description
      severity
      affectedUsers {
        id
        username
        name
        role
      }
      conflictDetails
      suggestions
      createdAt
    }
  }
`;

// Get assignment analytics query
export const GET_ASSIGNMENT_ANALYTICS = gql`
  query GetAssignmentAnalytics($filters: AnalyticsFilters) {
    assignmentAnalytics(filters: $filters) {
      summary {
        totalAssignments
        activeAssignments
        inactiveAssignments
        multiAssignmentUsers
        averageAssignmentsPerUser
        conflictCount
      }
      byRole {
        role
        count
        percentage
      }
      byCompany {
        companyId
        companyName
        count
        percentage
      }
      byEstate {
        estateId
        estateName
        count
        percentage
      }
      trends {
        date
        assignments
        conflicts
        efficiency
      }
      multiAssignmentDistribution {
        assignmentCount
        userCount
        percentage
      }
      conflictAnalysis {
        type
        count
        severity
        resolutionTime
      }
    }
  }
`;

// Export assignment data mutation
export const EXPORT_ASSIGNMENTS = gql`
  mutation ExportAssignments($filters: ExportFilters!) {
    exportAssignments(filters: $filters) {
      success
      message
      downloadUrl
      expiresAt
    }
  }
`;

// Import assignments mutation
export const IMPORT_ASSIGNMENTS = gql`
  mutation ImportAssignments($file: Upload!, $options: ImportOptions) {
    importAssignments(file: $file, options: $options) {
      success
      message
      summary {
        totalRecords
        imported
        skipped
        errors
      }
      errors {
        row
        error
        data
      }
    }
  }
`;

// Validate assignments mutation
export const VALIDATE_ASSIGNMENTS = gql`
  mutation ValidateAssignments($assignments: [AssignmentValidationInput!]!) {
    validateAssignments(assignments: $assignments) {
      valid {
        userId
        message
      }
      invalid {
        userId
        errors
        suggestions
      }
      summary {
        totalAssignments
        valid
        invalid
      }
    }
  }
`;

// Get assignment history query
export const GET_ASSIGNMENT_HISTORY = gql`
  query GetAssignmentHistory($userId: ID!) {
    assignmentHistory(userId: $userId) {
      id
      userId
      action
      previousAssignments {
        companyId
        estateIds
        divisionIds
        assignedCompanyIds
      }
      newAssignments {
        companyId
        estateIds
        divisionIds
        assignedCompanyIds
      }
      changedBy {
        id
        username
        name
      }
      reason
      createdAt
    }
  }
`;

// Type definitions
export interface AssignmentFilters {
  search?: string;
  role?: string;
  companyId?: string;
  estateId?: string;
  divisionId?: string;
  isActive?: boolean;
  hasMultipleAssignments?: boolean;
  hasConflicts?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssignmentInput {
  companyId: string;
  estateIds?: string[];
  divisionIds?: string[];
  assignedCompanyIds?: string[];
}

export interface BulkAssignmentUpdateRequest {
  updates: {
    userId: string;
    assignment: AssignmentInput;
  }[];
  reason?: string;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  estateId?: string;
  role?: string;
}

export interface ExportFilters {
  format: 'csv' | 'xlsx' | 'json';
  includeHistory?: boolean;
  filters?: AssignmentFilters;
}

export interface ImportOptions {
  validateOnly?: boolean;
  overwriteExisting?: boolean;
  skipInvalid?: boolean;
}

export interface AssignmentValidationInput {
  userId: string;
  companyId: string;
  estateIds?: string[];
  divisionIds?: string[];
  assignedCompanyIds?: string[];
}

export interface Assignment {
  id: string;
  userId: string;
  companyId: string;
  estateIds: string[];
  divisionIds: string[];
  assignedCompanyIds: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
  };
  company: {
    id: string;
    name: string;
    status: string;
  };
  estates: Array<{
    id: string;
    name: string;
    lokasi: string;
    luasHa: number;
  }>;
  divisions: Array<{
    id: string;
    name: string;
    code: string;
    estate: {
      id: string;
      name: string;
    };
  }>;
}

export interface AssignmentConflict {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: Array<{
    id: string;
    username: string;
    name: string;
    role: string;
  }>;
  conflictDetails: Record<string, any>;
  suggestions: string[];
  createdAt: string;
}

export interface AssignmentAnalytics {
  summary: {
    totalAssignments: number;
    activeAssignments: number;
    inactiveAssignments: number;
    multiAssignmentUsers: number;
    averageAssignmentsPerUser: number;
    conflictCount: number;
  };
  byRole: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    count: number;
    percentage: number;
  }>;
  byEstate: Array<{
    estateId: string;
    estateName: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    assignments: number;
    conflicts: number;
    efficiency: number;
  }>;
  multiAssignmentDistribution: Array<{
    assignmentCount: number;
    userCount: number;
    percentage: number;
  }>;
  conflictAnalysis: Array<{
    type: string;
    count: number;
    severity: string;
    resolutionTime: number;
  }>;
}