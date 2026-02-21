import { apolloClient } from '@/lib/apollo/client';
import {
  GET_ASSIGNMENTS,
  GET_USER_ASSIGNMENT,
  UPDATE_ASSIGNMENT,
  BULK_UPDATE_ASSIGNMENTS,
  GET_ASSIGNMENT_CONFLICTS,
  GET_ASSIGNMENT_ANALYTICS,
  EXPORT_ASSIGNMENTS,
  IMPORT_ASSIGNMENTS,
  VALIDATE_ASSIGNMENTS,
  GET_ASSIGNMENT_HISTORY,
  type AssignmentFilters,
  type AssignmentInput,
  type BulkAssignmentUpdateRequest,
  type AnalyticsFilters,
  type ExportFilters,
  type ImportOptions,
  type AssignmentValidationInput,
} from '@/lib/apollo/queries/assignments';

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};

export class GraphQLAssignmentService {
  /**
   * Get assignments with filtering and pagination
   */
  static async getAssignments(filters: AssignmentFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_ASSIGNMENTS,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.assignments,
        message: 'Assignments loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Get assignment for specific user
   */
  static async getUserAssignment(userId: string) {
    try {
      const result = await apolloClient.query({
        query: GET_USER_ASSIGNMENT,
        variables: { userId },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.userAssignment,
        message: 'User assignment loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching user assignment:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Update user assignment
   */
  static async updateUserAssignment(userId: string, assignment: AssignmentInput) {
    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_ASSIGNMENT,
        variables: { userId, assignment },
        refetchQueries: [{ query: GET_ASSIGNMENTS }]
      });
      
      return {
        success: true,
        data: result.data.updateAssignment,
        message: 'Assignment updated successfully'
      };
    } catch (error: unknown) {
      console.error('Error updating assignment:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Bulk update assignments
   */
  static async bulkUpdateAssignments(request: BulkAssignmentUpdateRequest) {
    try {
      const result = await apolloClient.mutate({
        mutation: BULK_UPDATE_ASSIGNMENTS,
        variables: { request },
        refetchQueries: [{ query: GET_ASSIGNMENTS }]
      });
      
      return {
        success: true,
        data: result.data.bulkUpdateAssignments,
        message: 'Bulk assignment update completed'
      };
    } catch (error: unknown) {
      console.error('Error bulk updating assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Get assignment conflicts
   */
  static async getAssignmentConflicts() {
    try {
      const result = await apolloClient.query({
        query: GET_ASSIGNMENT_CONFLICTS,
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.assignmentConflicts,
        message: 'Assignment conflicts loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching assignment conflicts:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Get assignment analytics
   */
  static async getAssignmentAnalytics(filters: AnalyticsFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_ASSIGNMENT_ANALYTICS,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.assignmentAnalytics,
        message: 'Assignment analytics loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching assignment analytics:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Export assignments data
   */
  static async exportAssignments(filters: ExportFilters) {
    try {
      const result = await apolloClient.mutate({
        mutation: EXPORT_ASSIGNMENTS,
        variables: { filters }
      });
      
      return {
        success: true,
        data: result.data.exportAssignments,
        message: 'Export initiated successfully'
      };
    } catch (error: unknown) {
      console.error('Error exporting assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Import assignments data
   */
  static async importAssignments(file: File, options: ImportOptions = {}) {
    try {
      const result = await apolloClient.mutate({
        mutation: IMPORT_ASSIGNMENTS,
        variables: { file, options },
        context: {
          headers: {
            'apollo-require-preflight': true,
          },
        }
      });
      
      return {
        success: true,
        data: result.data.importAssignments,
        message: 'Import completed successfully'
      };
    } catch (error: unknown) {
      console.error('Error importing assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Validate assignments
   */
  static async validateAssignments(assignments: AssignmentValidationInput[]) {
    try {
      const result = await apolloClient.mutate({
        mutation: VALIDATE_ASSIGNMENTS,
        variables: { assignments }
      });
      
      return {
        success: true,
        data: result.data.validateAssignments,
        message: 'Assignment validation completed'
      };
    } catch (error: unknown) {
      console.error('Error validating assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Get assignment history for user
   */
  static async getAssignmentHistory(userId: string) {
    try {
      const result = await apolloClient.query({
        query: GET_ASSIGNMENT_HISTORY,
        variables: { userId },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.assignmentHistory,
        message: 'Assignment history loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching assignment history:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process assignment request'),
        error
      };
    }
  }

  /**
   * Get available companies for assignments
   */
  static async getAvailableCompanies() {
    try {
      // Import companies query dynamically to avoid circular dependencies
      const { GET_COMPANIES } = await import('@/lib/apollo/queries/company');
      
      const result = await apolloClient.query({
        query: GET_COMPANIES,
        fetchPolicy: 'cache-first'
      });
      
      return {
        success: true,
        data: result.data.companies || [],
        message: 'Companies loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching companies:', error);
      return {
        success: false,
        data: [],
        message: toErrorMessage(error, 'Failed to process assignment request')
      };
    }
  }

  /**
   * Get available estates for assignments
   */
  static async getAvailableEstates() {
    try {
      // Import estates query dynamically to avoid circular dependencies
      const { GET_ESTATES } = await import('@/lib/apollo/queries/estate');
      
      const result = await apolloClient.query({
        query: GET_ESTATES,
        fetchPolicy: 'cache-first'
      });
      
      return {
        success: true,
        data: result.data.estates || [],
        message: 'Estates loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching estates:', error);
      return {
        success: false,
        data: [],
        message: toErrorMessage(error, 'Failed to process assignment request')
      };
    }
  }

  /**
   * Get available divisions for assignments
   */
  static async getEstateDivisions(_estateId: string) {
    try {
      // This would be a separate query for divisions by estate
      // For now, return mock data structure
      return {
        success: true,
        data: [],
        message: 'Estate divisions loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching estate divisions:', error);
      return {
        success: false,
        data: [],
        message: toErrorMessage(error, 'Failed to process assignment request')
      };
    }
  }
}

export default GraphQLAssignmentService;

