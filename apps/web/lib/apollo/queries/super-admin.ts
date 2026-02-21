import { gql } from 'graphql-tag';

// System statistics query
export const GET_SYSTEM_STATISTICS = gql`
  query GetSystemStatistics($filters: SystemStatisticsFilters) {
    systemStatistics(filters: $filters) {
      overview {
        totalCompanies
        totalUsers
        totalEstates
        totalHarvestRecords
        activeUsers24h
        systemUptime
        systemHealth
      }
      users {
        total
        active
        inactive
        byRole {
          role
          count
          percentage
        }
        newThisMonth
        loginActivity {
          date
          logins
          uniqueUsers
        }
      }
      companies {
        total
        active
        inactive
        byStatus {
          status
          count
          percentage
        }
        averageUsersPerCompany
        topCompanies {
          id
          name
          userCount
          harvestVolume
        }
      }
      harvest {
        totalRecords
        totalVolume
        averagePerDay
        byMonth {
          month
          records
          volume
          efficiency
        }
        topEstates {
          id
          name
          volume
          efficiency
        }
      }
      system {
        version
        environment
        lastMaintenance
        scheduledMaintenance
        healthStatus
        performanceMetrics {
          cpuUsage
          memoryUsage
          diskUsage
          responseTime
        }
      }
    }
  }
`;

// Multi-assignment analytics query
export const GET_MULTI_ASSIGNMENT_ANALYTICS = gql`
  query GetMultiAssignmentAnalytics($filters: MultiAssignmentFilters) {
    multiAssignmentAnalytics(filters: $filters) {
      overview {
        totalMultiAssignedUsers
        averageAssignmentsPerUser
        complexityScore
        conflictCount
        efficiencyRating
      }
      byRole {
        role
        multiAssignedCount
        averageAssignments
        complexityScore
        conflictRate
      }
      patterns {
        assignmentPattern
        userCount
        effectiveness
        commonIssues
      }
      conflicts {
        total
        byType {
          type
          count
          severity
        }
        resolutionTime
        impact
      }
      recommendations {
        type
        priority
        description
        estimatedImpact
        implementationEffort
      }
      trends {
        date
        multiAssignments
        conflicts
        efficiency
      }
    }
  }
`;

// System activity logs query (matches actual backend schema)
export const GET_SYSTEM_ACTIVITY_LOGS = gql`
  query GetSystemActivityLogs($activityType: SystemActivityType, $companyId: ID, $dateFrom: Time, $dateTo: Time, $limit: Int) {
    systemActivityLogs(activityType: $activityType, companyId: $companyId, dateFrom: $dateFrom, dateTo: $dateTo, limit: $limit) {
      id
      type
      actor
      actorType
      description
      companyId
      companyName
      entityType
      entityId
      ipAddress
      metadata
      timestamp
    }
  }
`;

// System activities query (legacy - uses non-existent schema)
export const GET_SYSTEM_ACTIVITIES = gql`
  query GetSystemActivities($filters: SystemActivityFilters) {
    systemActivities(filters: $filters) {
      data {
        id
        type
        category
        description
        severity
        actor {
          id
          username
          name
          role
        }
        target {
          type
          id
          name
        }
        metadata
        ipAddress
        userAgent
        location
        timestamp
        company {
          id
          name
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

// Global search query
export const GLOBAL_SEARCH = gql`
  query GlobalSearch($query: String!, $filters: GlobalSearchFilters) {
    globalSearch(query: $query, filters: $filters) {
      users {
        id
        username
        name
        email
        role
        company {
          id
          name
        }
        relevanceScore
      }
      companies {
        id
        name
        status
        totalUsers
        totalEstates
        relevanceScore
      }
      estates {
        id
        name
        lokasi
        luasHa
        company {
          id
          name
        }
        relevanceScore
      }
      divisions {
        id
        name
        code
        estate {
          id
          name
          company {
            id
            name
          }
        }
        relevanceScore
      }
      harvestRecords {
        id
        tanggalPanen
        jumlahTBS
        totalBerat
        blok
        mandor {
          id
          name
        }
        estate {
          id
          name
        }
        relevanceScore
      }
      total
      searchTime
    }
  }
`;

// System health query
export const GET_SYSTEM_HEALTH = gql`
  query GetSystemHealth {
    systemHealth {
      status
      version
      uptime
      environment
      lastCheck
      services {
        name
        status
        responseTime
        lastCheck
        issues
      }
      database {
        status
        connectionPool
        slowQueries
        diskUsage
        backupStatus
      }
      cache {
        status
        hitRate
        memoryUsage
        evictionRate
      }
      integrations {
        name
        status
        lastSync
        errorRate
        responseTime
      }
      alerts {
        id
        severity
        message
        timestamp
        resolved
      }
    }
  }
`;

// Optimize assignments mutation
export const OPTIMIZE_ASSIGNMENTS = gql`
  mutation OptimizeAssignments($options: AssignmentOptimizationOptions) {
    optimizeAssignments(options: $options) {
      recommendations {
        type
        priority
        description
        currentAssignments
        suggestedAssignments
        estimatedImpact
        implementationSteps
      }
      summary {
        totalRecommendations
        estimatedEfficiencyGain
        conflictsResolved
        usersAffected
      }
      previewResults {
        beforeOptimization {
          totalAssignments
          conflicts
          efficiency
        }
        afterOptimization {
          totalAssignments
          conflicts
          efficiency
        }
      }
    }
  }
`;

// Get performance metrics query
export const GET_PERFORMANCE_METRICS = gql`
  query GetPerformanceMetrics($timeRange: String!) {
    performanceMetrics(timeRange: $timeRange) {
      system {
        averageResponseTime
        errorRate
        throughput
        uptime
        resourceUtilization {
          cpu
          memory
          disk
          network
        }
      }
      database {
        queryPerformance
        connectionPool
        slowQueries
        indexUsage
      }
      user {
        activeUsers
        sessionDuration
        pageViews
        bounceRate
        userSatisfaction
      }
      business {
        harvestVolume
        approvalTimes
        systemEfficiency
        userProductivity
      }
      trends {
        date
        responseTime
        errorRate
        activeUsers
        businessMetrics
      }
    }
  }
`;

// Export data mutation
export const EXPORT_DATA = gql`
  mutation ExportData($type: ExportType!, $filters: ExportFilters!) {
    exportData(type: $type, filters: $filters) {
      success
      message
      downloadUrl
      expiresAt
      fileSize
      recordCount
    }
  }
`;

// System maintenance mutation
export const PERFORM_SYSTEM_MAINTENANCE = gql`
  mutation PerformSystemMaintenance($tasks: [MaintenanceTask!]!) {
    performSystemMaintenance(tasks: $tasks) {
      results {
        task
        success
        message
        duration
        details
      }
      summary {
        totalTasks
        successful
        failed
        totalDuration
      }
      systemStatus
    }
  }
`;

// Audit log query
export const GET_AUDIT_LOG = gql`
  query GetAuditLog($filters: AuditLogFilters) {
    auditLog(filters: $filters) {
      data {
        id
        action
        entityType
        entityId
        oldValues
        newValues
        performedBy {
          id
          username
          name
          role
        }
        ipAddress
        userAgent
        location
        timestamp
        company {
          id
          name
        }
        estate {
          id
          name
        }
        severity
        category
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

// Manage user roles mutation
export const MANAGE_USER_ROLES = gql`
  mutation ManageUserRoles($userId: ID!, $newRole: String!, $reason: String) {
    manageUserRoles(userId: $userId, newRole: $newRole, reason: $reason) {
      success
      message
      user {
        id
        username
        name
        role
        permissions
      }
      oldRole
      newRole
      changedBy {
        id
        username
        name
      }
      timestamp
    }
  }
`;

// System configuration query
export const GET_SYSTEM_CONFIGURATION = gql`
  query GetSystemConfiguration {
    systemConfiguration {
      authentication {
        sessionTimeout
        passwordPolicy
        twoFactorEnabled
        ssoEnabled
      }
      security {
        rateLimiting
        encryptionEnabled
        auditingEnabled
        backupFrequency
      }
      features {
        multiAssignmentEnabled
        realTimeNotifications
        advancedAnalytics
        autoBackup
      }
      integrations {
        name
        enabled
        configuration
        lastSync
      }
      maintenance {
        scheduledDowntime
        autoUpdates
        backupRetention
        logRetention
      }
    }
  }
`;

// Update system configuration mutation
export const UPDATE_SYSTEM_CONFIGURATION = gql`
  mutation UpdateSystemConfiguration($config: SystemConfigurationInput!) {
    updateSystemConfiguration(config: $config) {
      success
      message
      updatedFields
      requiresRestart
      validationErrors
    }
  }
`;

// Type definitions
export interface SystemStatisticsFilters {
  timeRange?: string;
  companyId?: string;
  estateId?: string;
  includeInactive?: boolean;
}

export interface MultiAssignmentFilters {
  role?: string;
  companyId?: string;
  complexityThreshold?: number;
  includeResolved?: boolean;
}

export interface SystemActivityFilters {
  type?: string;
  category?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GlobalSearchFilters {
  type?: 'users' | 'companies' | 'estates' | 'divisions' | 'harvest';
  companyId?: string;
  limit?: number;
}

export interface AssignmentOptimizationOptions {
  includeRoleSpecific?: boolean;
  optimizeFor?: 'efficiency' | 'balance' | 'conflict_reduction';
  previewOnly?: boolean;
  applyRecommendations?: boolean;
}

export interface ExportFilters {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
  includeArchived?: boolean;
  companyId?: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export interface SystemConfigurationInput {
  authentication?: {
    sessionTimeout?: number;
    passwordPolicy?: Record<string, any>;
    twoFactorEnabled?: boolean;
    ssoEnabled?: boolean;
  };
  security?: {
    rateLimiting?: Record<string, any>;
    encryptionEnabled?: boolean;
    auditingEnabled?: boolean;
    backupFrequency?: string;
  };
  features?: {
    multiAssignmentEnabled?: boolean;
    realTimeNotifications?: boolean;
    advancedAnalytics?: boolean;
    autoBackup?: boolean;
  };
  maintenance?: {
    scheduledDowntime?: string;
    autoUpdates?: boolean;
    backupRetention?: number;
    logRetention?: number;
  };
}

export type ExportType = 'users' | 'companies' | 'estates' | 'assignments' | 'audit_log' | 'system_stats';
export type MaintenanceTask = 'cleanup_logs' | 'optimize_database' | 'clear_cache' | 'backup_data' | 'update_indexes';