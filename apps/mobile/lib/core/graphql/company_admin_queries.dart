/// GraphQL queries for Company Admin dashboard.
class CompanyAdminQueries {
  static const String dashboardQuery = r'''
    query CompanyAdminDashboard {
      companyAdminDashboard {
        user {
          id
          name
          username
          role
        }
        company {
          id
          name
          code
          status
        }
        stats {
          totalUsers
          activeUsers
          usersOnlineNow
          totalEstates
          totalDivisions
          totalBlocks
          totalEmployees
          todayProduction
          monthlyProduction
          systemUptime
        }
        userOverview {
          total
          byRole {
            role
            count
            active
          }
          activeToday
          newThisMonth
          pendingApprovals
          lockedAccounts
        }
        estateOverview {
          estateId
          estateName
          managerName
          divisionsCount
          usersCount
          todayProduction
          status
        }
        systemHealth {
          status
          apiHealth
          databaseHealth
          syncServiceHealth
          activeConnections
          pendingSyncOperations
          lastBackup
        }
        recentActivities {
          id
          type
          actorId
          actorName
          description
          entityType
          entityId
          ipAddress
          timestamp
        }
      }
    }
  ''';
}
