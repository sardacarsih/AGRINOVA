class ManagerDashboardStats {
  final int totalEstates;
  final int totalDivisions;
  final int totalBlocks;
  final int totalEmployees;
  final double todayProduction;
  final double weeklyProduction;
  final double monthlyProduction;
  final double monthlyTarget;
  final double targetAchievement;
  final int pendingApprovals;
  final int activeHarvests;

  const ManagerDashboardStats({
    required this.totalEstates,
    required this.totalDivisions,
    required this.totalBlocks,
    required this.totalEmployees,
    required this.todayProduction,
    required this.weeklyProduction,
    required this.monthlyProduction,
    required this.monthlyTarget,
    required this.targetAchievement,
    required this.pendingApprovals,
    required this.activeHarvests,
  });

  factory ManagerDashboardStats.fromJson(Map<String, dynamic> json) {
    return ManagerDashboardStats(
      totalEstates: _asInt(json['totalEstates']),
      totalDivisions: _asInt(json['totalDivisions']),
      totalBlocks: _asInt(json['totalBlocks']),
      totalEmployees: _asInt(json['totalEmployees']),
      todayProduction: _asDouble(json['todayProduction']),
      weeklyProduction: _asDouble(json['weeklyProduction']),
      monthlyProduction: _asDouble(json['monthlyProduction']),
      monthlyTarget: _asDouble(json['monthlyTarget']),
      targetAchievement: _asDouble(json['targetAchievement']),
      pendingApprovals: _asInt(json['pendingApprovals']),
      activeHarvests: _asInt(json['activeHarvests']),
    );
  }
}

class TeamMemberPerformanceModel {
  final String userId;
  final String name;
  final String role;
  final String assignment;
  final double performanceScore;
  final int recordsToday;
  final double weeklyTrend;

  const TeamMemberPerformanceModel({
    required this.userId,
    required this.name,
    required this.role,
    required this.assignment,
    required this.performanceScore,
    required this.recordsToday,
    required this.weeklyTrend,
  });

  factory TeamMemberPerformanceModel.fromJson(Map<String, dynamic> json) {
    return TeamMemberPerformanceModel(
      userId: _asString(json['userId']),
      name: _asString(json['name']),
      role: _asString(json['role']),
      assignment: _asString(json['assignment']),
      performanceScore: _asDouble(json['performanceScore']),
      recordsToday: _asInt(json['recordsToday']),
      weeklyTrend: _asDouble(json['weeklyTrend']),
    );
  }
}

class ManagerTeamSummaryModel {
  final int totalMandors;
  final int activeMandorsToday;
  final int totalAsistens;
  final List<TeamMemberPerformanceModel> topPerformers;
  final List<TeamMemberPerformanceModel> needsAttention;

  const ManagerTeamSummaryModel({
    required this.totalMandors,
    required this.activeMandorsToday,
    required this.totalAsistens,
    required this.topPerformers,
    required this.needsAttention,
  });

  factory ManagerTeamSummaryModel.fromJson(Map<String, dynamic> json) {
    final topPerformersRaw =
        json['topPerformers'] as List<dynamic>? ?? const [];
    final needsAttentionRaw =
        json['needsAttention'] as List<dynamic>? ?? const [];

    return ManagerTeamSummaryModel(
      totalMandors: _asInt(json['totalMandors']),
      activeMandorsToday: _asInt(json['activeMandorsToday']),
      totalAsistens: _asInt(json['totalAsistens']),
      topPerformers: topPerformersRaw
          .map((item) =>
              TeamMemberPerformanceModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      needsAttention: needsAttentionRaw
          .map((item) =>
              TeamMemberPerformanceModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ManagerTodayHighlightsModel {
  final int totalHarvestsToday;
  final int pendingApprovals;
  final int approvedToday;
  final int rejectedToday;
  final double productionVsYesterday;

  const ManagerTodayHighlightsModel({
    required this.totalHarvestsToday,
    required this.pendingApprovals,
    required this.approvedToday,
    required this.rejectedToday,
    required this.productionVsYesterday,
  });

  factory ManagerTodayHighlightsModel.fromJson(Map<String, dynamic> json) {
    return ManagerTodayHighlightsModel(
      totalHarvestsToday: _asInt(json['totalHarvestsToday']),
      pendingApprovals: _asInt(json['pendingApprovals']),
      approvedToday: _asInt(json['approvedToday']),
      rejectedToday: _asInt(json['rejectedToday']),
      productionVsYesterday: _asDouble(json['productionVsYesterday']),
    );
  }
}

class ManagerDashboardModel {
  final String userName;
  final String userRole;
  final List<String> estateNames;
  final ManagerDashboardStats stats;
  final ManagerTeamSummaryModel teamSummary;
  final ManagerTodayHighlightsModel todayHighlights;

  const ManagerDashboardModel({
    required this.userName,
    required this.userRole,
    required this.estateNames,
    required this.stats,
    required this.teamSummary,
    required this.todayHighlights,
  });

  factory ManagerDashboardModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? const {};
    final estatesRaw = json['estates'] as List<dynamic>? ?? const [];
    final statsJson = json['stats'] as Map<String, dynamic>? ?? const {};
    final teamJson = json['teamSummary'] as Map<String, dynamic>? ?? const {};
    final highlightsJson =
        json['todayHighlights'] as Map<String, dynamic>? ?? const {};

    return ManagerDashboardModel(
      userName: _asString(user['name']),
      userRole: _asString(user['role']),
      estateNames: estatesRaw
          .map((item) => _asString((item as Map<String, dynamic>)['name']))
          .where((name) => name.isNotEmpty)
          .toList(),
      stats: ManagerDashboardStats.fromJson(statsJson),
      teamSummary: ManagerTeamSummaryModel.fromJson(teamJson),
      todayHighlights: ManagerTodayHighlightsModel.fromJson(highlightsJson),
    );
  }
}

class TrendDataPointModel {
  final String label;
  final double value;
  final double? target;

  const TrendDataPointModel({
    required this.label,
    required this.value,
    this.target,
  });

  factory TrendDataPointModel.fromJson(Map<String, dynamic> json) {
    final targetValue = json['target'];
    return TrendDataPointModel(
      label: _asString(json['label']),
      value: _asDouble(json['value']),
      target: targetValue == null ? null : _asDouble(targetValue),
    );
  }
}

class ProductionTrendModel {
  final List<TrendDataPointModel> dataPoints;
  final double average;
  final double maximum;
  final double minimum;
  final String trendDirection;
  final double trendPercentage;

  const ProductionTrendModel({
    required this.dataPoints,
    required this.average,
    required this.maximum,
    required this.minimum,
    required this.trendDirection,
    required this.trendPercentage,
  });

  factory ProductionTrendModel.fromJson(Map<String, dynamic> json) {
    final pointsRaw = json['dataPoints'] as List<dynamic>? ?? const [];
    return ProductionTrendModel(
      dataPoints: pointsRaw
          .map((item) =>
              TrendDataPointModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      average: _asDouble(json['average']),
      maximum: _asDouble(json['maximum']),
      minimum: _asDouble(json['minimum']),
      trendDirection: _asString(json['trendDirection']),
      trendPercentage: _asDouble(json['trendPercentage']),
    );
  }
}

class ManagerComparisonModel {
  final double currentValue;
  final double previousValue;
  final double changePercentage;
  final double targetValue;
  final double targetAchievement;
  final double? vsLastYear;

  const ManagerComparisonModel({
    required this.currentValue,
    required this.previousValue,
    required this.changePercentage,
    required this.targetValue,
    required this.targetAchievement,
    this.vsLastYear,
  });

  factory ManagerComparisonModel.fromJson(Map<String, dynamic> json) {
    final vsLastYear = json['vsLastYear'];
    return ManagerComparisonModel(
      currentValue: _asDouble(json['currentValue']),
      previousValue: _asDouble(json['previousValue']),
      changePercentage: _asDouble(json['changePercentage']),
      targetValue: _asDouble(json['targetValue']),
      targetAchievement: _asDouble(json['targetAchievement']),
      vsLastYear: vsLastYear == null ? null : _asDouble(vsLastYear),
    );
  }
}

class DivisionPerformanceModel {
  final String divisionId;
  final String divisionName;
  final double production;
  final double target;
  final double achievement;
  final int rank;

  const DivisionPerformanceModel({
    required this.divisionId,
    required this.divisionName,
    required this.production,
    required this.target,
    required this.achievement,
    required this.rank,
  });

  factory DivisionPerformanceModel.fromJson(Map<String, dynamic> json) {
    return DivisionPerformanceModel(
      divisionId: _asString(json['divisionId']),
      divisionName: _asString(json['divisionName']),
      production: _asDouble(json['production']),
      target: _asDouble(json['target']),
      achievement: _asDouble(json['achievement']),
      rank: _asInt(json['rank']),
    );
  }
}

class QualityDistributionModel {
  final String grade;
  final int count;
  final double percentage;
  final String colorCode;

  const QualityDistributionModel({
    required this.grade,
    required this.count,
    required this.percentage,
    required this.colorCode,
  });

  factory QualityDistributionModel.fromJson(Map<String, dynamic> json) {
    return QualityDistributionModel(
      grade: _asString(json['grade']),
      count: _asInt(json['count']),
      percentage: _asDouble(json['percentage']),
      colorCode: _asString(json['colorCode']),
    );
  }
}

class QualityAnalysisModel {
  final List<QualityDistributionModel> distribution;
  final double averageScore;
  final String trend;

  const QualityAnalysisModel({
    required this.distribution,
    required this.averageScore,
    required this.trend,
  });

  factory QualityAnalysisModel.fromJson(Map<String, dynamic> json) {
    final distributionRaw = json['distribution'] as List<dynamic>? ?? const [];
    return QualityAnalysisModel(
      distribution: distributionRaw
          .map((item) =>
              QualityDistributionModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      averageScore: _asDouble(json['averageScore']),
      trend: _asString(json['trend']),
    );
  }
}

class EfficiencyMetricsModel {
  final double overallScore;
  final double laborEfficiency;
  final double timeEfficiency;
  final double resourceUtilization;
  final double productivityPerWorker;

  const EfficiencyMetricsModel({
    required this.overallScore,
    required this.laborEfficiency,
    required this.timeEfficiency,
    required this.resourceUtilization,
    required this.productivityPerWorker,
  });

  factory EfficiencyMetricsModel.fromJson(Map<String, dynamic> json) {
    return EfficiencyMetricsModel(
      overallScore: _asDouble(json['overallScore']),
      laborEfficiency: _asDouble(json['laborEfficiency']),
      timeEfficiency: _asDouble(json['timeEfficiency']),
      resourceUtilization: _asDouble(json['resourceUtilization']),
      productivityPerWorker: _asDouble(json['productivityPerWorker']),
    );
  }
}

class ManagerAnalyticsModel {
  final String period;
  final ProductionTrendModel productionTrend;
  final ManagerComparisonModel comparison;
  final List<DivisionPerformanceModel> divisionPerformance;
  final QualityAnalysisModel qualityAnalysis;
  final EfficiencyMetricsModel efficiencyMetrics;

  const ManagerAnalyticsModel({
    required this.period,
    required this.productionTrend,
    required this.comparison,
    required this.divisionPerformance,
    required this.qualityAnalysis,
    required this.efficiencyMetrics,
  });

  factory ManagerAnalyticsModel.fromJson(Map<String, dynamic> json) {
    final trendJson =
        json['productionTrend'] as Map<String, dynamic>? ?? const {};
    final comparisonJson =
        json['comparison'] as Map<String, dynamic>? ?? const {};
    final divisionRaw =
        json['divisionPerformance'] as List<dynamic>? ?? const [];
    final qualityJson =
        json['qualityAnalysis'] as Map<String, dynamic>? ?? const {};
    final efficiencyJson =
        json['efficiencyMetrics'] as Map<String, dynamic>? ?? const {};

    return ManagerAnalyticsModel(
      period: _asString(json['period']),
      productionTrend: ProductionTrendModel.fromJson(trendJson),
      comparison: ManagerComparisonModel.fromJson(comparisonJson),
      divisionPerformance: divisionRaw
          .map((item) =>
              DivisionPerformanceModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      qualityAnalysis: QualityAnalysisModel.fromJson(qualityJson),
      efficiencyMetrics: EfficiencyMetricsModel.fromJson(efficiencyJson),
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

double _asDouble(dynamic value) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

String _asString(dynamic value) {
  if (value == null) return '';
  return value.toString();
}
