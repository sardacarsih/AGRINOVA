/// GraphQL queries for Area Manager role
class AreaManagerQueries {
  /// Dashboard query — fetches overview stats, company performance, and alerts
  static const String dashboardQuery = r'''
    query AreaManagerDashboard {
      areaManagerDashboard {
        user {
          id
          name
          username
          role
        }
        stats {
          totalCompanies
          totalEstates
          totalDivisions
          totalEmployees
          todayProduction
          monthlyProduction
          monthlyTarget
          targetAchievement
          avgEfficiency
          topPerformingCompany
        }
        companyPerformance {
          companyId
          companyName
          estatesCount
          todayProduction
          monthlyProduction
          targetAchievement
          efficiencyScore
          qualityScore
          trend
          status
          pendingIssues
        }
        alerts {
          id
          type
          severity
          title
          message
          companyId
          companyName
          createdAt
          isRead
        }
      }
    }
  ''';

  /// Query to list manager users assigned under the area manager's scope
  static const String managersUnderAreaQuery = r'''
    query ManagersUnderArea($companyId: ID) {
      managersUnderArea(companyId: $companyId) {
        id
        name
        username
        email
        isActive
      }
    }
  ''';

  /// Query to fetch regional alerts with optional filters
  static const String regionalAlertsQuery = r'''
    query RegionalAlerts($severity: AlertSeverity, $unreadOnly: Boolean) {
      regionalAlerts(severity: $severity, unreadOnly: $unreadOnly) {
        id
        type
        severity
        title
        message
        companyId
        companyName
        createdAt
        isRead
      }
    }
  ''';
}
