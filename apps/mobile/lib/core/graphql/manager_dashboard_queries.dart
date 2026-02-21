/// GraphQL queries for Manager dashboard and analytics.
class ManagerDashboardQueries {
  static const String dashboardQuery = r'''
    query ManagerDashboard {
      managerDashboard {
        user { id name username role }
        estates { id name }
        stats {
          totalEstates totalDivisions totalBlocks totalEmployees
          todayProduction weeklyProduction monthlyProduction monthlyTarget
          targetAchievement pendingApprovals activeHarvests
        }
        teamSummary {
          totalMandors activeMandorsToday totalAsistens
          topPerformers { userId name role assignment performanceScore recordsToday weeklyTrend }
          needsAttention { userId name role assignment performanceScore recordsToday weeklyTrend }
        }
        todayHighlights {
          totalHarvestsToday pendingApprovals approvedToday rejectedToday productionVsYesterday
        }
      }
    }
  ''';

  static const String analyticsQuery = r'''
    query ManagerAnalytics($period: AnalyticsPeriod!) {
      managerAnalytics(period: $period) {
        period
        productionTrend {
          dataPoints { label value target }
          average maximum minimum trendDirection trendPercentage
        }
        comparison {
          currentValue previousValue changePercentage targetValue targetAchievement vsLastYear
        }
        divisionPerformance {
          divisionId divisionName production target achievement rank
        }
        qualityAnalysis {
          distribution { grade count percentage colorCode }
          averageScore trend
        }
        efficiencyMetrics {
          overallScore laborEfficiency timeEfficiency resourceUtilization productivityPerWorker
        }
      }
    }
  ''';
}
