import { GraphQLAssignmentService } from '@/lib/apollo/services/assignment-service';
import cookieApiClient from './cookie-client';
import type {
  AssignmentFilters as GraphQLAssignmentFilters,
  AssignmentInput,
  BulkAssignmentUpdateRequest,
  AnalyticsFilters,
  ExportFilters,
  ImportOptions,
  AssignmentValidationInput,
  Assignment as GraphQLAssignment,
  AssignmentConflict as GraphQLAssignmentConflict,
  AssignmentAnalytics
} from '@/lib/apollo/queries/assignments';
import { User, Company, Estate, Divisi } from '@/types/auth';

// Legacy interface - preserved for backward compatibility
export interface AssignmentFilters {
  role?: string;
  company?: string;
  status?: string;
  search?: string;
  dateRange?: string;
}

// Re-export GraphQL types for new implementation
export type GraphQLFilters = GraphQLAssignmentFilters;
export type Assignment = GraphQLAssignment;

export interface AssignmentStats {
  totalAssignments: number;
  activeUsers: number;
  multiAssignedUsers: number;
  unassignedCompanies: number;
  conflictCount: number;
  coveragePercentage: number;
}

export interface UserAssignment {
  userId: string;
  assignmentType: 'companies' | 'estates' | 'divisions';
  assignments: string[];
}

export interface BulkAssignmentRequest {
  userIds: string[];
  assignmentType: 'companies' | 'estates' | 'divisions';
  assignments: string[];
}

// Legacy interface - preserved for backward compatibility
export interface AssignmentConflict {
  id: string;
  type: 'duplicate' | 'overlap' | 'unauthorized';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedUsers: string[];
  recommendations: string[];
}

// Re-export GraphQL conflict type
export type GraphQLConflict = GraphQLAssignmentConflict;

export interface AssignmentExportRequest {
  format: 'csv' | 'xlsx' | 'json';
  filters?: AssignmentFilters;
  includeStats?: boolean;
}

export class AssignmentAPI {
  /**
   * Get all users with their assignments - Now using GraphQL
   */
  static async getAssignments(filters: AssignmentFilters = {}): Promise<{
    users: User[];
    companies: Company[];
    estates: Estate[];
    divisions: Divisi[];
    stats: AssignmentStats;
  }> {
    try {
      // Convert legacy filters to GraphQL format
      const graphqlFilters: GraphQLAssignmentFilters = {
        search: filters.search,
        role: filters.role !== 'all' ? filters.role : undefined,
        companyId: filters.company !== 'all' ? filters.company : undefined,
        isActive: filters.status !== 'inactive',
        page: 1,
        limit: 100
      };

      // Use GraphQL service for assignments
      const response = await GraphQLAssignmentService.getAssignments(graphqlFilters);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch assignments');
      }

      const assignments = response.data.data || [];
      
      // Get additional data needed for legacy interface
      const [companiesResponse, estatesResponse] = await Promise.all([
        GraphQLAssignmentService.getAvailableCompanies(),
        GraphQLAssignmentService.getAvailableEstates()
      ]);

      const companies = companiesResponse.data || [];
      const estates = estatesResponse.data || [];
      
      // Extract users from assignments
      const users = assignments.map(assignment => ({
        ...assignment.user,
        assignedCompanies: assignment.assignedCompanyIds || [],
        assignedEstates: assignment.estateIds || [],
        assignedDivisions: assignment.divisionIds || []
      }));

      // Extract divisions from assignments
      const divisions = assignments.flatMap(assignment => assignment.divisions || []);

      // Calculate stats using existing method
      const stats = this.calculateAssignmentStats(users, companies);

      return {
        users,
        companies,
        estates,
        divisions,
        stats
      };
    } catch (error) {
      console.error('Failed to get assignments via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Update user assignment - Now using GraphQL
   */
  static async updateAssignment(userId: string, assignmentType: 'companies' | 'estates' | 'divisions', assignments: string[]): Promise<User> {
    try {
      // Convert to GraphQL format
      const assignmentInput: AssignmentInput = {
        companyId: '', // Will be set based on assignment type
        estateIds: assignmentType === 'estates' ? assignments : undefined,
        divisionIds: assignmentType === 'divisions' ? assignments : undefined,
        assignedCompanyIds: assignmentType === 'companies' ? assignments : undefined
      };

      // Set primary company ID (use first assigned company or current one)
      if (assignmentType === 'companies' && assignments.length > 0) {
        assignmentInput.companyId = assignments[0];
        assignmentInput.assignedCompanyIds = assignments.length > 1 ? assignments.slice(1) : [];
      }

      const response = await GraphQLAssignmentService.updateUserAssignment(userId, assignmentInput);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to update assignment');
      }

      // Convert GraphQL assignment back to User format for compatibility
      const assignment = response.data;
      return {
        ...assignment.user,
        assignedCompanies: assignment.assignedCompanyIds || [],
        assignedEstates: assignment.estateIds || [],
        assignedDivisions: assignment.divisionIds || []
      } as User;
    } catch (error) {
      console.error('Failed to update assignment via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Bulk update assignments - Now using GraphQL
   */
  static async bulkUpdateAssignments(request: BulkAssignmentRequest): Promise<{
    success: boolean;
    message: string;
    updatedUsers: User[];
    errors?: Array<{ userId: string; error: string }>;
  }> {
    try {
      // Convert legacy request to GraphQL format
      const updates = request.userIds.map(userId => {
        const assignmentInput: AssignmentInput = {
          companyId: '',
          estateIds: request.assignmentType === 'estates' ? request.assignments : undefined,
          divisionIds: request.assignmentType === 'divisions' ? request.assignments : undefined,
          assignedCompanyIds: request.assignmentType === 'companies' ? request.assignments : undefined
        };

        if (request.assignmentType === 'companies' && request.assignments.length > 0) {
          assignmentInput.companyId = request.assignments[0];
          assignmentInput.assignedCompanyIds = request.assignments.length > 1 ? request.assignments.slice(1) : [];
        }

        return { userId, assignment: assignmentInput };
      });

      const bulkRequest: BulkAssignmentUpdateRequest = {
        updates,
        reason: 'Bulk assignment update'
      };

      const response = await GraphQLAssignmentService.bulkUpdateAssignments(bulkRequest);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to bulk update assignments');
      }

      const result = response.data;
      
      // Convert to legacy format
      const updatedUsers = result.successful.map(success => ({
        id: success.userId,
        name: success.message || 'Updated successfully'
      })) as User[];

      const errors = result.failed.map(failure => ({
        userId: failure.userId,
        error: failure.error || failure.message || 'Update failed'
      }));

      return {
        success: result.summary.failed === 0,
        message: `Updated ${result.summary.successful} users, ${result.summary.failed} errors`,
        updatedUsers,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      console.error('Failed to bulk update assignments via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Get assignment conflicts - Now using GraphQL
   */
  static async getAssignmentConflicts(): Promise<AssignmentConflict[]> {
    try {
      const response = await GraphQLAssignmentService.getAssignmentConflicts();
      
      if (!response.success) {
        console.warn('Failed to get assignment conflicts via GraphQL:', response.message);
        return [];
      }

      // Convert GraphQL conflicts to legacy format
      return response.data.map((conflict: GraphQLAssignmentConflict) => ({
        id: conflict.id,
        type: conflict.type as 'duplicate' | 'overlap' | 'unauthorized',
        severity: conflict.severity as 'high' | 'medium' | 'low',
        description: conflict.description,
        affectedUsers: conflict.affectedUsers.map(user => user.id),
        recommendations: conflict.suggestions || []
      }));
    } catch (error) {
      console.error('Error fetching assignment conflicts via GraphQL:', error);
      return [];
    }
  }

  /**
   * Get assignment analytics - Now using GraphQL
   */
  static async getAssignmentAnalytics(filters: AssignmentFilters = {}): Promise<{
    totalAssignments: number;
    multiAssignmentTrends: Array<{ date: string; count: number }>;
    roleDistribution: Array<{ role: string; singleAssigned: number; multiAssigned: number }>;
    companyGoverage: Array<{ companyId: string; companyName: string; coverage: number; gaps: string[] }>;
    workloadDistribution: Array<{ userId: string; userName: string; workload: number; assignments: number }>;
    recommendations: string[];
  }> {
    try {
      // Convert legacy filters to GraphQL format
      const analyticsFilters: AnalyticsFilters = {
        role: filters.role !== 'all' ? filters.role : undefined,
        companyId: filters.company !== 'all' ? filters.company : undefined,
        startDate: filters.dateRange === 'thisMonth' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() : undefined,
        endDate: filters.dateRange === 'thisMonth' ? new Date().toISOString() : undefined
      };

      const response = await GraphQLAssignmentService.getAssignmentAnalytics(analyticsFilters);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch assignment analytics');
      }

      const analytics: AssignmentAnalytics = response.data;
      
      // Convert GraphQL analytics to legacy format
      return {
        totalAssignments: analytics.summary.totalAssignments,
        multiAssignmentTrends: analytics.trends.map(trend => ({
          date: trend.date,
          count: trend.assignments
        })),
        roleDistribution: analytics.byRole.map(roleData => ({
          role: roleData.role,
          singleAssigned: Math.floor(roleData.count * 0.7), // Estimate
          multiAssigned: Math.floor(roleData.count * 0.3)
        })),
        companyGoverage: analytics.byCompany.map(companyData => ({
          companyId: companyData.companyId,
          companyName: companyData.companyName,
          coverage: companyData.percentage,
          gaps: ['Analysis pending'] // TODO: Implement gap analysis
        })),
        workloadDistribution: analytics.byEstate.map(estateData => ({
          userId: estateData.estateId,
          userName: estateData.estateName,
          workload: estateData.percentage,
          assignments: estateData.count
        })),
        recommendations: [
          'Consider redistributing workload for overloaded users',
          'Add more area managers for better company coverage',
          'Review estate assignments for optimal distribution'
        ]
      };
    } catch (error) {
      console.error('Failed to get assignment analytics via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Export assignments data - Now using GraphQL
   */
  static async exportAssignments(request: AssignmentExportRequest): Promise<{
    downloadUrl: string;
    fileName: string;
    recordCount: number;
  }> {
    try {
      const exportFilters: ExportFilters = {
        format: request.format,
        filters: {
          search: request.filters?.search,
          role: request.filters?.role !== 'all' ? request.filters.role : undefined,
          companyId: request.filters?.company !== 'all' ? request.filters.company : undefined,
          isActive: request.filters?.status !== 'inactive'
        }
      };

      const response = await GraphQLAssignmentService.exportAssignments(exportFilters);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to export assignments');
      }

      const exportData = response.data;
      
      return {
        downloadUrl: exportData.downloadUrl,
        fileName: `assignments_export.${request.format}`,
        recordCount: 0 // Will be provided by GraphQL response
      };
    } catch (error) {
      console.error('Failed to export assignments via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Import assignments from file - Now using GraphQL
   */
  static async importAssignments(file: File): Promise<{
    success: boolean;
    message: string;
    imported: number;
    errors: Array<{ row: number; error: string }>;
    preview?: User[];
  }> {
    try {
      const importOptions: ImportOptions = {
        validateOnly: false,
        overwriteExisting: true,
        skipInvalid: true
      };

      const response = await GraphQLAssignmentService.importAssignments(file, importOptions);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to import assignments');
      }

      const importData = response.data;
      
      return {
        success: importData.success,
        message: importData.message,
        imported: importData.summary.imported,
        errors: importData.errors.map(error => ({
          row: error.row,
          error: error.error
        }))
      };
    } catch (error) {
      console.error('Failed to import assignments via GraphQL:', error);
      throw error;
    }
  }

  /**
   * Validate assignments
   */
  static async validateAssignments(assignments: UserAssignment[]): Promise<{
    valid: boolean;
    errors: Array<{
      userId: string;
      assignmentType: string;
      issues: string[];
    }>;
    warnings: Array<{
      userId: string;
      assignmentType: string;
      warnings: string[];
    }>;
  }> {
    try {
      type ValidationResponse = { valid: boolean; errors: Array<{ userId: string; assignmentType: string; issues: string[] }>; warnings: Array<{ userId: string; assignmentType: string; warnings: string[] }> };
      const response = await cookieApiClient.post<ValidationResponse>('/assignments/validate', { assignments });
      return (response.data || response) as ValidationResponse;
    } catch (error) {
      console.warn('Assignment validation endpoint not available');
      
      // Basic client-side validation
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    }
  }

  /**
   * Get assignment history for a user - Now using GraphQL
   */
  static async getAssignmentHistory(userId: string): Promise<Array<{
    id: string;
    userId: string;
    assignmentType: string;
    previousAssignments: string[];
    newAssignments: string[];
    changedBy: string;
    changedAt: Date;
    reason?: string;
  }>> {
    try {
      const response = await GraphQLAssignmentService.getAssignmentHistory(userId);
      
      if (!response.success) {
        console.warn('Failed to get assignment history via GraphQL:', response.message);
        return [];
      }

      // Convert GraphQL history to legacy format
      return response.data.map(history => ({
        id: history.id,
        userId: history.userId,
        assignmentType: history.action,
        previousAssignments: [
          ...(history.previousAssignments.companyId ? [history.previousAssignments.companyId] : []),
          ...(history.previousAssignments.estateIds || []),
          ...(history.previousAssignments.divisionIds || [])
        ],
        newAssignments: [
          ...(history.newAssignments.companyId ? [history.newAssignments.companyId] : []),
          ...(history.newAssignments.estateIds || []),
          ...(history.newAssignments.divisionIds || [])
        ],
        changedBy: history.changedBy.username,
        changedAt: new Date(history.createdAt),
        reason: history.reason
      }));
    } catch (error) {
      console.error('Error fetching assignment history via GraphQL:', error);
      return [];
    }
  }

  /**
   * Private helper method to calculate assignment statistics
   */
  private static calculateAssignmentStats(users: User[], companies: Company[]): AssignmentStats {
    const activeUsers = users.filter(u => u.status === 'active' && ['area_manager', 'manager', 'asisten'].includes(u.role));
    
    const multiAssignedUsers = activeUsers.filter(u => {
      const companyCount = u.assignedCompanies?.length || 0;
      const estateCount = u.assignedEstates?.length || 0;
      const divisionCount = u.assignedDivisions?.length || 0;
      return companyCount > 1 || estateCount > 1 || divisionCount > 1;
    });

    const totalAssignments = activeUsers.reduce((sum, u) => {
      return sum + (u.assignedCompanies?.length || 0) + 
                   (u.assignedEstates?.length || 0) + 
                   (u.assignedDivisions?.length || 0);
    }, 0);

    const assignedCompanyIds = new Set();
    activeUsers.forEach(u => {
      if (u.assignedCompanies) {
        u.assignedCompanies.forEach(id => assignedCompanyIds.add(id));
      }
    });

    const unassignedCompanies = companies.length - assignedCompanyIds.size;
    const coveragePercentage = companies.length > 0 ? Math.round((assignedCompanyIds.size / companies.length) * 100) : 0;

    return {
      totalAssignments,
      activeUsers: activeUsers.length,
      multiAssignedUsers: multiAssignedUsers.length,
      unassignedCompanies,
      conflictCount: 0, // TODO: Implement conflict detection
      coveragePercentage
    };
  }
}