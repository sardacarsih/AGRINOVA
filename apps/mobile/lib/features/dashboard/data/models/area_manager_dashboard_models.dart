/// Data models for Area Manager dashboard API responses.
///
/// These are plain Dart classes that parse GraphQL JSON responses.
/// They do not extend any framework class to keep them lightweight.

class AreaManagerStats {
  final int totalCompanies;
  final int totalEstates;
  final int totalDivisions;
  final int totalEmployees;
  final double todayProduction;
  final double monthlyProduction;
  final double monthlyTarget;
  final double targetAchievement;
  final double avgEfficiency;
  final String? topPerformingCompany;

  const AreaManagerStats({
    required this.totalCompanies,
    required this.totalEstates,
    required this.totalDivisions,
    required this.totalEmployees,
    required this.todayProduction,
    required this.monthlyProduction,
    required this.monthlyTarget,
    required this.targetAchievement,
    required this.avgEfficiency,
    this.topPerformingCompany,
  });

  factory AreaManagerStats.fromJson(Map<String, dynamic> json) {
    return AreaManagerStats(
      totalCompanies: (json['totalCompanies'] as num?)?.toInt() ?? 0,
      totalEstates: (json['totalEstates'] as num?)?.toInt() ?? 0,
      totalDivisions: (json['totalDivisions'] as num?)?.toInt() ?? 0,
      totalEmployees: (json['totalEmployees'] as num?)?.toInt() ?? 0,
      todayProduction: (json['todayProduction'] as num?)?.toDouble() ?? 0.0,
      monthlyProduction: (json['monthlyProduction'] as num?)?.toDouble() ?? 0.0,
      monthlyTarget: (json['monthlyTarget'] as num?)?.toDouble() ?? 0.0,
      targetAchievement: (json['targetAchievement'] as num?)?.toDouble() ?? 0.0,
      avgEfficiency: (json['avgEfficiency'] as num?)?.toDouble() ?? 0.0,
      topPerformingCompany: json['topPerformingCompany'] as String?,
    );
  }

  static const empty = AreaManagerStats(
    totalCompanies: 0,
    totalEstates: 0,
    totalDivisions: 0,
    totalEmployees: 0,
    todayProduction: 0,
    monthlyProduction: 0,
    monthlyTarget: 0,
    targetAchievement: 0,
    avgEfficiency: 0,
  );
}

class CompanyPerformanceModel {
  final String companyId;
  final String companyName;
  final int estatesCount;
  final double todayProduction;
  final double monthlyProduction;
  final double targetAchievement;
  final double efficiencyScore;
  final double qualityScore;
  final String trend; // UP | DOWN | STABLE
  final String status; // EXCELLENT | GOOD | WARNING | CRITICAL
  final int pendingIssues;

  const CompanyPerformanceModel({
    required this.companyId,
    required this.companyName,
    required this.estatesCount,
    required this.todayProduction,
    required this.monthlyProduction,
    required this.targetAchievement,
    required this.efficiencyScore,
    required this.qualityScore,
    required this.trend,
    required this.status,
    required this.pendingIssues,
  });

  factory CompanyPerformanceModel.fromJson(Map<String, dynamic> json) {
    return CompanyPerformanceModel(
      companyId: json['companyId'] as String? ?? '',
      companyName: json['companyName'] as String? ?? '',
      estatesCount: (json['estatesCount'] as num?)?.toInt() ?? 0,
      todayProduction: (json['todayProduction'] as num?)?.toDouble() ?? 0.0,
      monthlyProduction: (json['monthlyProduction'] as num?)?.toDouble() ?? 0.0,
      targetAchievement: (json['targetAchievement'] as num?)?.toDouble() ?? 0.0,
      efficiencyScore: (json['efficiencyScore'] as num?)?.toDouble() ?? 0.0,
      qualityScore: (json['qualityScore'] as num?)?.toDouble() ?? 0.0,
      trend: json['trend'] as String? ?? 'STABLE',
      status: json['status'] as String? ?? 'GOOD',
      pendingIssues: (json['pendingIssues'] as num?)?.toInt() ?? 0,
    );
  }

  bool get isActive => status != 'CRITICAL';
  bool get isTrendUp => trend == 'UP';
}

class RegionalAlertModel {
  final String id;
  final String type;
  final String severity; // INFO | WARNING | CRITICAL
  final String title;
  final String message;
  final String? companyId;
  final String? companyName;
  final DateTime createdAt;
  final bool isRead;

  const RegionalAlertModel({
    required this.id,
    required this.type,
    required this.severity,
    required this.title,
    required this.message,
    this.companyId,
    this.companyName,
    required this.createdAt,
    required this.isRead,
  });

  factory RegionalAlertModel.fromJson(Map<String, dynamic> json) {
    return RegionalAlertModel(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      severity: json['severity'] as String? ?? 'INFO',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      companyId: json['companyId'] as String?,
      companyName: json['companyName'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
    );
  }
}

class ManagerUserModel {
  final String id;
  final String name;
  final String username;
  final String? email;
  final bool isActive;

  const ManagerUserModel({
    required this.id,
    required this.name,
    required this.username,
    this.email,
    required this.isActive,
  });

  factory ManagerUserModel.fromJson(Map<String, dynamic> json) {
    return ManagerUserModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  /// Returns up to 2 initials from the user's name.
  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
}

class AreaManagerDashboardModel {
  final AreaManagerStats stats;
  final List<CompanyPerformanceModel> companyPerformance;
  final List<RegionalAlertModel> alerts;

  const AreaManagerDashboardModel({
    required this.stats,
    required this.companyPerformance,
    required this.alerts,
  });

  factory AreaManagerDashboardModel.fromJson(Map<String, dynamic> json) {
    final statsJson = json['stats'] as Map<String, dynamic>?;
    final perfList = json['companyPerformance'] as List? ?? [];
    final alertList = json['alerts'] as List? ?? [];

    return AreaManagerDashboardModel(
      stats: statsJson != null
          ? AreaManagerStats.fromJson(statsJson)
          : AreaManagerStats.empty,
      companyPerformance: perfList
          .map((e) => CompanyPerformanceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      alerts: alertList
          .map((e) => RegionalAlertModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
