class SuperAdminDashboardModel {
  final String userName;
  final String userRole;
  final SuperAdminSystemOverview systemOverview;
  final SuperAdminTenantOverview tenantOverview;
  final SuperAdminPlatformStats platformStats;
  final List<SuperAdminSystemAlert> systemAlerts;
  final List<SuperAdminActivity> recentActivities;

  const SuperAdminDashboardModel({
    required this.userName,
    required this.userRole,
    required this.systemOverview,
    required this.tenantOverview,
    required this.platformStats,
    required this.systemAlerts,
    required this.recentActivities,
  });

  factory SuperAdminDashboardModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? const {};
    final systemOverview =
        json['systemOverview'] as Map<String, dynamic>? ?? const {};
    final tenantOverview =
        json['tenantOverview'] as Map<String, dynamic>? ?? const {};
    final platformStats =
        json['platformStats'] as Map<String, dynamic>? ?? const {};
    final systemAlertsRaw = json['systemAlerts'] as List<dynamic>? ?? const [];
    final activitiesRaw =
        json['recentActivities'] as List<dynamic>? ?? const [];

    return SuperAdminDashboardModel(
      userName: _asString(user['name']),
      userRole: _asString(user['role']),
      systemOverview: SuperAdminSystemOverview.fromJson(systemOverview),
      tenantOverview: SuperAdminTenantOverview.fromJson(tenantOverview),
      platformStats: SuperAdminPlatformStats.fromJson(platformStats),
      systemAlerts: systemAlertsRaw
          .map((item) =>
              SuperAdminSystemAlert.fromJson(item as Map<String, dynamic>))
          .toList(),
      recentActivities: activitiesRaw
          .map((item) =>
              SuperAdminActivity.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class SuperAdminSystemOverview {
  final String status;
  final double apiUptime;
  final String databaseStatus;
  final String redisStatus;
  final String queueStatus;
  final String storageStatus;
  final int activeWebsockets;
  final int pendingJobs;
  final double errorRate;

  const SuperAdminSystemOverview({
    required this.status,
    required this.apiUptime,
    required this.databaseStatus,
    required this.redisStatus,
    required this.queueStatus,
    required this.storageStatus,
    required this.activeWebsockets,
    required this.pendingJobs,
    required this.errorRate,
  });

  factory SuperAdminSystemOverview.fromJson(Map<String, dynamic> json) {
    return SuperAdminSystemOverview(
      status: _asString(json['status']),
      apiUptime: _asDouble(json['apiUptime']),
      databaseStatus: _asString(json['databaseStatus']),
      redisStatus: _asString(json['redisStatus']),
      queueStatus: _asString(json['queueStatus']),
      storageStatus: _asString(json['storageStatus']),
      activeWebsockets: _asInt(json['activeWebsockets']),
      pendingJobs: _asInt(json['pendingJobs']),
      errorRate: _asDouble(json['errorRate']),
    );
  }
}

class SuperAdminTenantOverview {
  final int totalCompanies;
  final int activeCompanies;
  final int suspendedCompanies;
  final int trialCompanies;
  final int totalUsers;
  final int activeUsersToday;
  final int newUsersThisMonth;
  final List<SuperAdminCompanyStatusCount> companiesByStatus;

  const SuperAdminTenantOverview({
    required this.totalCompanies,
    required this.activeCompanies,
    required this.suspendedCompanies,
    required this.trialCompanies,
    required this.totalUsers,
    required this.activeUsersToday,
    required this.newUsersThisMonth,
    required this.companiesByStatus,
  });

  factory SuperAdminTenantOverview.fromJson(Map<String, dynamic> json) {
    final byStatusRaw = json['companiesByStatus'] as List<dynamic>? ?? const [];
    return SuperAdminTenantOverview(
      totalCompanies: _asInt(json['totalCompanies']),
      activeCompanies: _asInt(json['activeCompanies']),
      suspendedCompanies: _asInt(json['suspendedCompanies']),
      trialCompanies: _asInt(json['trialCompanies']),
      totalUsers: _asInt(json['totalUsers']),
      activeUsersToday: _asInt(json['activeUsersToday']),
      newUsersThisMonth: _asInt(json['newUsersThisMonth']),
      companiesByStatus: byStatusRaw
          .map((item) => SuperAdminCompanyStatusCount.fromJson(
              item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class SuperAdminCompanyStatusCount {
  final String status;
  final int count;

  const SuperAdminCompanyStatusCount({
    required this.status,
    required this.count,
  });

  factory SuperAdminCompanyStatusCount.fromJson(Map<String, dynamic> json) {
    return SuperAdminCompanyStatusCount(
      status: _asString(json['status']),
      count: _asInt(json['count']),
    );
  }
}

class SuperAdminPlatformStats {
  final int totalEstates;
  final int totalDivisions;
  final int totalBlocks;
  final int totalHarvestsThisMonth;
  final double totalProductionThisMonth;
  final int totalGateChecksThisMonth;
  final int apiCallsToday;
  final double storageUsedGb;
  final double storageLimitGb;

  const SuperAdminPlatformStats({
    required this.totalEstates,
    required this.totalDivisions,
    required this.totalBlocks,
    required this.totalHarvestsThisMonth,
    required this.totalProductionThisMonth,
    required this.totalGateChecksThisMonth,
    required this.apiCallsToday,
    required this.storageUsedGb,
    required this.storageLimitGb,
  });

  factory SuperAdminPlatformStats.fromJson(Map<String, dynamic> json) {
    return SuperAdminPlatformStats(
      totalEstates: _asInt(json['totalEstates']),
      totalDivisions: _asInt(json['totalDivisions']),
      totalBlocks: _asInt(json['totalBlocks']),
      totalHarvestsThisMonth: _asInt(json['totalHarvestsThisMonth']),
      totalProductionThisMonth: _asDouble(json['totalProductionThisMonth']),
      totalGateChecksThisMonth: _asInt(json['totalGateChecksThisMonth']),
      apiCallsToday: _asInt(json['apiCallsToday']),
      storageUsedGb: _asDouble(json['storageUsedGb']),
      storageLimitGb: _asDouble(json['storageLimitGb']),
    );
  }
}

class SuperAdminSystemAlert {
  final String id;
  final String type;
  final String severity;
  final String title;
  final String message;
  final String component;
  final DateTime createdAt;

  const SuperAdminSystemAlert({
    required this.id,
    required this.type,
    required this.severity,
    required this.title,
    required this.message,
    required this.component,
    required this.createdAt,
  });

  factory SuperAdminSystemAlert.fromJson(Map<String, dynamic> json) {
    return SuperAdminSystemAlert(
      id: _asString(json['id']),
      type: _asString(json['type']),
      severity: _asString(json['severity']),
      title: _asString(json['title']),
      message: _asString(json['message']),
      component: _asString(json['component']),
      createdAt: _asDateTime(json['createdAt']),
    );
  }
}

class SuperAdminActivity {
  final String id;
  final String type;
  final String actor;
  final String description;
  final String companyName;
  final DateTime timestamp;

  const SuperAdminActivity({
    required this.id,
    required this.type,
    required this.actor,
    required this.description,
    required this.companyName,
    required this.timestamp,
  });

  factory SuperAdminActivity.fromJson(Map<String, dynamic> json) {
    return SuperAdminActivity(
      id: _asString(json['id']),
      type: _asString(json['type']),
      actor: _asString(json['actor']),
      description: _asString(json['description']),
      companyName: _asString(json['companyName']),
      timestamp: _asDateTime(json['timestamp']),
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

DateTime _asDateTime(dynamic value) {
  if (value is String) {
    return DateTime.tryParse(value)?.toLocal() ?? DateTime.now();
  }
  return DateTime.now();
}
