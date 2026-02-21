/// GraphQL queries for Super Admin dashboard.
class SuperAdminQueries {
  static const String dashboardQuery = r'''
    query SuperAdminDashboard {
      superAdminDashboard {
        user {
          id
          name
          username
          role
        }
        systemOverview {
          status
          apiUptime
          databaseStatus
          redisStatus
          queueStatus
          storageStatus
          activeWebsockets
          pendingJobs
          errorRate
        }
        tenantOverview {
          totalCompanies
          activeCompanies
          suspendedCompanies
          trialCompanies
          totalUsers
          activeUsersToday
          newUsersThisMonth
          companiesByStatus {
            status
            count
          }
        }
        platformStats {
          totalEstates
          totalDivisions
          totalBlocks
          totalHarvestsThisMonth
          totalProductionThisMonth
          totalGateChecksThisMonth
          apiCallsToday
          storageUsedGb
          storageLimitGb
        }
        systemAlerts {
          id
          type
          severity
          title
          message
          component
          createdAt
        }
        recentActivities {
          id
          type
          actor
          description
          companyName
          timestamp
        }
      }
    }
  ''';
}
