class CompanyAdminDashboardModel {
  final String userName;
  final String userRole;
  final String companyName;
  final String companyCode;
  final String companyStatus;
  final CompanyAdminStats stats;
  final CompanyAdminUserOverview userOverview;
  final List<CompanyAdminEstateOverview> estateOverview;
  final CompanyAdminSystemHealth systemHealth;
  final List<CompanyAdminActivity> recentActivities;

  const CompanyAdminDashboardModel({
    required this.userName,
    required this.userRole,
    required this.companyName,
    required this.companyCode,
    required this.companyStatus,
    required this.stats,
    required this.userOverview,
    required this.estateOverview,
    required this.systemHealth,
    required this.recentActivities,
  });

  factory CompanyAdminDashboardModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? const {};
    final company = json['company'] as Map<String, dynamic>? ?? const {};
    final stats = json['stats'] as Map<String, dynamic>? ?? const {};
    final userOverview =
        json['userOverview'] as Map<String, dynamic>? ?? const {};
    final estateOverviewRaw =
        json['estateOverview'] as List<dynamic>? ?? const [];
    final systemHealth =
        json['systemHealth'] as Map<String, dynamic>? ?? const {};
    final activitiesRaw =
        json['recentActivities'] as List<dynamic>? ?? const [];

    return CompanyAdminDashboardModel(
      userName: _asString(user['name']),
      userRole: _asString(user['role']),
      companyName: _asString(company['name']),
      companyCode: _asString(company['code']),
      companyStatus: _asString(company['status']),
      stats: CompanyAdminStats.fromJson(stats),
      userOverview: CompanyAdminUserOverview.fromJson(userOverview),
      estateOverview: estateOverviewRaw
          .map((item) =>
              CompanyAdminEstateOverview.fromJson(item as Map<String, dynamic>))
          .toList(),
      systemHealth: CompanyAdminSystemHealth.fromJson(systemHealth),
      recentActivities: activitiesRaw
          .map((item) =>
              CompanyAdminActivity.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CompanyAdminStats {
  final int totalUsers;
  final int activeUsers;
  final int usersOnlineNow;
  final int totalEstates;
  final int totalDivisions;
  final int totalBlocks;
  final int totalEmployees;
  final double todayProduction;
  final double monthlyProduction;
  final double systemUptime;

  const CompanyAdminStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.usersOnlineNow,
    required this.totalEstates,
    required this.totalDivisions,
    required this.totalBlocks,
    required this.totalEmployees,
    required this.todayProduction,
    required this.monthlyProduction,
    required this.systemUptime,
  });

  factory CompanyAdminStats.fromJson(Map<String, dynamic> json) {
    return CompanyAdminStats(
      totalUsers: _asInt(json['totalUsers']),
      activeUsers: _asInt(json['activeUsers']),
      usersOnlineNow: _asInt(json['usersOnlineNow']),
      totalEstates: _asInt(json['totalEstates']),
      totalDivisions: _asInt(json['totalDivisions']),
      totalBlocks: _asInt(json['totalBlocks']),
      totalEmployees: _asInt(json['totalEmployees']),
      todayProduction: _asDouble(json['todayProduction']),
      monthlyProduction: _asDouble(json['monthlyProduction']),
      systemUptime: _asDouble(json['systemUptime']),
    );
  }
}

class CompanyAdminUserOverview {
  final int total;
  final List<CompanyAdminRoleCount> byRole;
  final int activeToday;
  final int newThisMonth;
  final int pendingApprovals;
  final int lockedAccounts;

  const CompanyAdminUserOverview({
    required this.total,
    required this.byRole,
    required this.activeToday,
    required this.newThisMonth,
    required this.pendingApprovals,
    required this.lockedAccounts,
  });

  factory CompanyAdminUserOverview.fromJson(Map<String, dynamic> json) {
    final byRoleRaw = json['byRole'] as List<dynamic>? ?? const [];
    return CompanyAdminUserOverview(
      total: _asInt(json['total']),
      byRole: byRoleRaw
          .map((item) =>
              CompanyAdminRoleCount.fromJson(item as Map<String, dynamic>))
          .toList(),
      activeToday: _asInt(json['activeToday']),
      newThisMonth: _asInt(json['newThisMonth']),
      pendingApprovals: _asInt(json['pendingApprovals']),
      lockedAccounts: _asInt(json['lockedAccounts']),
    );
  }
}

class CompanyAdminRoleCount {
  final String role;
  final int count;
  final int active;

  const CompanyAdminRoleCount({
    required this.role,
    required this.count,
    required this.active,
  });

  factory CompanyAdminRoleCount.fromJson(Map<String, dynamic> json) {
    return CompanyAdminRoleCount(
      role: _asString(json['role']),
      count: _asInt(json['count']),
      active: _asInt(json['active']),
    );
  }
}

class CompanyAdminEstateOverview {
  final String estateId;
  final String estateName;
  final String managerName;
  final int divisionsCount;
  final int usersCount;
  final double todayProduction;
  final String status;

  const CompanyAdminEstateOverview({
    required this.estateId,
    required this.estateName,
    required this.managerName,
    required this.divisionsCount,
    required this.usersCount,
    required this.todayProduction,
    required this.status,
  });

  factory CompanyAdminEstateOverview.fromJson(Map<String, dynamic> json) {
    return CompanyAdminEstateOverview(
      estateId: _asString(json['estateId']),
      estateName: _asString(json['estateName']),
      managerName: _asString(json['managerName']),
      divisionsCount: _asInt(json['divisionsCount']),
      usersCount: _asInt(json['usersCount']),
      todayProduction: _asDouble(json['todayProduction']),
      status: _asString(json['status']),
    );
  }
}

class CompanyAdminSystemHealth {
  final String status;
  final bool apiHealth;
  final bool databaseHealth;
  final bool syncServiceHealth;
  final int activeConnections;
  final int pendingSyncOperations;
  final DateTime? lastBackup;

  const CompanyAdminSystemHealth({
    required this.status,
    required this.apiHealth,
    required this.databaseHealth,
    required this.syncServiceHealth,
    required this.activeConnections,
    required this.pendingSyncOperations,
    required this.lastBackup,
  });

  factory CompanyAdminSystemHealth.fromJson(Map<String, dynamic> json) {
    return CompanyAdminSystemHealth(
      status: _asString(json['status']),
      apiHealth: _asBool(json['apiHealth']),
      databaseHealth: _asBool(json['databaseHealth']),
      syncServiceHealth: _asBool(json['syncServiceHealth']),
      activeConnections: _asInt(json['activeConnections']),
      pendingSyncOperations: _asInt(json['pendingSyncOperations']),
      lastBackup: _asNullableDateTime(json['lastBackup']),
    );
  }
}

class CompanyAdminActivity {
  final String id;
  final String type;
  final String actorId;
  final String actorName;
  final String description;
  final String entityType;
  final String entityId;
  final String ipAddress;
  final DateTime timestamp;

  const CompanyAdminActivity({
    required this.id,
    required this.type,
    required this.actorId,
    required this.actorName,
    required this.description,
    required this.entityType,
    required this.entityId,
    required this.ipAddress,
    required this.timestamp,
  });

  factory CompanyAdminActivity.fromJson(Map<String, dynamic> json) {
    return CompanyAdminActivity(
      id: _asString(json['id']),
      type: _asString(json['type']),
      actorId: _asString(json['actorId']),
      actorName: _asString(json['actorName']),
      description: _asString(json['description']),
      entityType: _asString(json['entityType']),
      entityId: _asString(json['entityId']),
      ipAddress: _asString(json['ipAddress']),
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

bool _asBool(dynamic value) {
  if (value is bool) return value;
  if (value is String) return value.toLowerCase() == 'true';
  return false;
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

DateTime? _asNullableDateTime(dynamic value) {
  if (value is String) {
    return DateTime.tryParse(value)?.toLocal();
  }
  return null;
}
