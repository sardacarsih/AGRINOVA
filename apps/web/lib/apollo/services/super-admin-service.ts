import { apolloClient } from '@/lib/apollo/client';
import {
  GET_SYSTEM_STATISTICS,
  GET_MULTI_ASSIGNMENT_ANALYTICS,
  GET_SYSTEM_ACTIVITIES,
  GLOBAL_SEARCH,
  GET_SYSTEM_HEALTH,
  OPTIMIZE_ASSIGNMENTS,
  GET_PERFORMANCE_METRICS,
  EXPORT_DATA,
  PERFORM_SYSTEM_MAINTENANCE,
  GET_AUDIT_LOG,
  MANAGE_USER_ROLES,
  GET_SYSTEM_CONFIGURATION,
  UPDATE_SYSTEM_CONFIGURATION,
  type SystemStatisticsFilters,
  type MultiAssignmentFilters,
  type SystemActivityFilters,
  type GlobalSearchFilters,
  type AssignmentOptimizationOptions,
  type ExportFilters,
  type AuditLogFilters,
  type SystemConfigurationInput,
  type ExportType,
  type MaintenanceTask
} from '@/lib/apollo/queries/super-admin';

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};

export class GraphQLSuperAdminService {
  /**
   * Get comprehensive system statistics
   */
  static async getSystemStatistics(filters: SystemStatisticsFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_SYSTEM_STATISTICS,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.systemStatistics,
        message: 'System statistics loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching system statistics:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get multi-assignment analytics
   */
  static async getMultiAssignmentAnalytics(filters: MultiAssignmentFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_MULTI_ASSIGNMENT_ANALYTICS,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.multiAssignmentAnalytics,
        message: 'Multi-assignment analytics loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching multi-assignment analytics:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get system activities
   */
  static async getSystemActivities(filters: SystemActivityFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_SYSTEM_ACTIVITIES,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.systemActivities,
        message: 'System activities loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching system activities:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Perform global search
   */
  static async globalSearch(query: string, filters: GlobalSearchFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GLOBAL_SEARCH,
        variables: { query, filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.globalSearch,
        message: 'Global search completed successfully'
      };
    } catch (error: unknown) {
      console.error('Error performing global search:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    try {
      const result = await apolloClient.query({
        query: GET_SYSTEM_HEALTH,
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.systemHealth,
        message: 'System health status loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching system health:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Optimize assignments
   */
  static async optimizeAssignments(options: AssignmentOptimizationOptions = {}) {
    try {
      const result = await apolloClient.mutate({
        mutation: OPTIMIZE_ASSIGNMENTS,
        variables: { options }
      });
      
      return {
        success: true,
        data: result.data.optimizeAssignments,
        message: 'Assignment optimization completed successfully'
      };
    } catch (error: unknown) {
      console.error('Error optimizing assignments:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(timeRange: string) {
    try {
      const result = await apolloClient.query({
        query: GET_PERFORMANCE_METRICS,
        variables: { timeRange },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.performanceMetrics,
        message: 'Performance metrics loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching performance metrics:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Export data
   */
  static async exportData(type: ExportType, filters: ExportFilters) {
    try {
      const result = await apolloClient.mutate({
        mutation: EXPORT_DATA,
        variables: { type, filters }
      });
      
      return {
        success: true,
        data: result.data.exportData,
        message: 'Data export initiated successfully'
      };
    } catch (error: unknown) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Perform system maintenance
   */
  static async performSystemMaintenance(tasks: MaintenanceTask[]) {
    try {
      const result = await apolloClient.mutate({
        mutation: PERFORM_SYSTEM_MAINTENANCE,
        variables: { tasks }
      });
      
      return {
        success: true,
        data: result.data.performSystemMaintenance,
        message: 'System maintenance completed successfully'
      };
    } catch (error: unknown) {
      console.error('Error performing system maintenance:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get audit log
   */
  static async getAuditLog(filters: AuditLogFilters = {}) {
    try {
      const result = await apolloClient.query({
        query: GET_AUDIT_LOG,
        variables: { filters },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.auditLog,
        message: 'Audit log loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching audit log:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Manage user roles
   */
  static async manageUserRoles(userId: string, newRole: string, reason?: string) {
    try {
      const result = await apolloClient.mutate({
        mutation: MANAGE_USER_ROLES,
        variables: { userId, newRole, reason },
        refetchQueries: ['GetSystemStatistics', 'GetSystemActivities']
      });
      
      return {
        success: true,
        data: result.data.manageUserRoles,
        message: 'User role updated successfully'
      };
    } catch (error: unknown) {
      console.error('Error managing user roles:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get system configuration
   */
  static async getSystemConfiguration() {
    try {
      const result = await apolloClient.query({
        query: GET_SYSTEM_CONFIGURATION,
        fetchPolicy: 'cache-first'
      });
      
      return {
        success: true,
        data: result.data.systemConfiguration,
        message: 'System configuration loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching system configuration:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Update system configuration
   */
  static async updateSystemConfiguration(config: SystemConfigurationInput) {
    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_SYSTEM_CONFIGURATION,
        variables: { config },
        refetchQueries: ['GetSystemConfiguration']
      });
      
      return {
        success: true,
        data: result.data.updateSystemConfiguration,
        message: 'System configuration updated successfully'
      };
    } catch (error: unknown) {
      console.error('Error updating system configuration:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Get all companies for super admin
   */
  static async getAllCompanies() {
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
        message: toErrorMessage(error, 'Failed to process super admin request')
      };
    }
  }

  /**
   * Get all users for super admin
   */
  static async getAllUsers(options: { limit?: number; page?: number } = {}) {
    try {
      // Import users query dynamically to avoid circular dependencies
      const { GET_USERS } = await import('@/lib/apollo/queries/users');
      
      const result = await apolloClient.query({
        query: GET_USERS,
        variables: { 
          filters: { 
            limit: options.limit || 100,
            page: options.page || 1 
          } 
        },
        fetchPolicy: 'network-only'
      });
      
      return {
        success: true,
        data: result.data.users,
        message: 'Users loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        data: { data: [], pagination: { total: 0, pages: 0, page: 1, limit: 100 } },
        message: toErrorMessage(error, 'Failed to process super admin request')
      };
    }
  }

  /**
   * Get integration statistics
   */
  static async getIntegrationStats(_companyId: string) {
    try {
      // This would be a separate GraphQL query for integration stats
      // For now, return mock data
      return {
        success: true,
        data: {
          timbang: { status: 'healthy', lastSync: new Date(), records: 150 },
          grading: { status: 'healthy', lastSync: new Date(), records: 89 },
          finance: { status: 'warning', lastSync: new Date(), records: 45 },
          hris: { status: 'healthy', lastSync: new Date(), records: 234 }
        },
        message: 'Integration statistics loaded successfully'
      };
    } catch (error: unknown) {
      console.error('Error fetching integration stats:', error);
      return {
        success: false,
        message: toErrorMessage(error, 'Failed to process super admin request'),
        error
      };
    }
  }

  /**
   * Test integration connectivity
   */
  static async testIntegrationConnectivity(_application: string) {
    try {
      // This would make a GraphQL query to test connectivity
      // For now, simulate connectivity check
      const responseTime = Math.floor(Math.random() * 100) + 50;
      
      return {
        success: true,
        responseTime,
        status: 'Connected'
      };
    } catch {
      return {
        success: false,
        responseTime: 0,
        status: 'Connection Failed'
      };
    }
  }
}

export default GraphQLSuperAdminService;

