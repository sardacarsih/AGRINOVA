import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';

class ManagerMonitorSnapshot {
  final int totalTeam;
  final int totalMandor;
  final int totalAsisten;
  final int totalPemanen;
  final double efficiency;
  final List<ManagerMonitorMember> members;
  final String? warningMessage;

  // New structured data from backend
  final String overallStatus;
  final List<EstateMonitorSummary> estateMonitors;
  final List<DivisionMonitorSummary> divisionMonitors;
  final List<HarvestActivityItem> activeActivities;
  final RealtimeStatsData? realtimeStats;

  const ManagerMonitorSnapshot({
    required this.totalTeam,
    required this.totalMandor,
    required this.totalAsisten,
    required this.totalPemanen,
    required this.efficiency,
    required this.members,
    this.warningMessage,
    this.overallStatus = 'NORMAL',
    this.estateMonitors = const [],
    this.divisionMonitors = const [],
    this.activeActivities = const [],
    this.realtimeStats,
  });

  factory ManagerMonitorSnapshot.empty() {
    return const ManagerMonitorSnapshot(
      totalTeam: 0,
      totalMandor: 0,
      totalAsisten: 0,
      totalPemanen: 0,
      efficiency: 0,
      members: [],
    );
  }

  factory ManagerMonitorSnapshot.fromJson(Map<String, dynamic> json) {
    final membersRaw = json['members'] as List<dynamic>? ?? const [];
    final estateRaw = json['estateMonitors'] as List<dynamic>? ?? const [];
    final divisionRaw = json['divisionMonitors'] as List<dynamic>? ?? const [];
    final activitiesRaw =
        json['activeActivities'] as List<dynamic>? ?? const [];

    return ManagerMonitorSnapshot(
      totalTeam: (json['totalTeam'] as num?)?.toInt() ?? 0,
      totalMandor: (json['totalMandor'] as num?)?.toInt() ?? 0,
      totalAsisten: (json['totalAsisten'] as num?)?.toInt() ?? 0,
      totalPemanen: (json['totalPemanen'] as num?)?.toInt() ?? 0,
      efficiency: (json['efficiency'] as num?)?.toDouble() ?? 0,
      members: membersRaw
          .whereType<Map<String, dynamic>>()
          .map(ManagerMonitorMember.fromJson)
          .toList(growable: false),
      warningMessage: json['warningMessage'] as String?,
      overallStatus: (json['overallStatus'] as String?) ?? 'NORMAL',
      estateMonitors: estateRaw
          .whereType<Map<String, dynamic>>()
          .map(EstateMonitorSummary.fromJson)
          .toList(growable: false),
      divisionMonitors: divisionRaw
          .whereType<Map<String, dynamic>>()
          .map(DivisionMonitorSummary.fromJson)
          .toList(growable: false),
      activeActivities: activitiesRaw
          .whereType<Map<String, dynamic>>()
          .map(HarvestActivityItem.fromJson)
          .toList(growable: false),
      realtimeStats: json['realtimeStats'] is Map<String, dynamic>
          ? RealtimeStatsData.fromJson(
              json['realtimeStats'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalTeam': totalTeam,
      'totalMandor': totalMandor,
      'totalAsisten': totalAsisten,
      'totalPemanen': totalPemanen,
      'efficiency': efficiency,
      'members': members.map((member) => member.toJson()).toList(),
      'warningMessage': warningMessage,
      'overallStatus': overallStatus,
      'estateMonitors':
          estateMonitors.map((estate) => estate.toJson()).toList(),
      'divisionMonitors':
          divisionMonitors.map((div) => div.toJson()).toList(),
      'activeActivities':
          activeActivities.map((act) => act.toJson()).toList(),
      'realtimeStats': realtimeStats?.toJson(),
    };
  }
}

class ManagerMonitorMember {
  final String id;
  final String name;
  final String role;
  final String division;
  final double performance;
  final double productionTon;
  final bool isActive;
  final int totalRecords;
  final int approvedRecords;

  const ManagerMonitorMember({
    required this.id,
    required this.name,
    required this.role,
    required this.division,
    required this.performance,
    required this.productionTon,
    required this.isActive,
    this.totalRecords = 0,
    this.approvedRecords = 0,
  });

  factory ManagerMonitorMember.fromJson(Map<String, dynamic> json) {
    return ManagerMonitorMember(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      division: (json['division'] ?? '-').toString(),
      performance: (json['performance'] as num?)?.toDouble() ?? 0,
      productionTon: (json['productionTon'] as num?)?.toDouble() ?? 0,
      isActive: json['isActive'] == true,
      totalRecords: (json['totalRecords'] as num?)?.toInt() ?? 0,
      approvedRecords: (json['approvedRecords'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role,
      'division': division,
      'performance': performance,
      'productionTon': productionTon,
      'isActive': isActive,
      'totalRecords': totalRecords,
      'approvedRecords': approvedRecords,
    };
  }
}

class EstateMonitorSummary {
  final String estateId;
  final String estateName;
  final String status;
  final int activeDivisions;
  final int totalDivisions;
  final double todayProduction;
  final double dailyTarget;
  final double achievement;
  final int activeWorkers;

  const EstateMonitorSummary({
    required this.estateId,
    required this.estateName,
    required this.status,
    required this.activeDivisions,
    required this.totalDivisions,
    required this.todayProduction,
    required this.dailyTarget,
    required this.achievement,
    required this.activeWorkers,
  });

  factory EstateMonitorSummary.fromJson(Map<String, dynamic> json) {
    return EstateMonitorSummary(
      estateId: (json['estateId'] ?? '').toString(),
      estateName: (json['estateName'] ?? '').toString(),
      status: (json['status'] ?? 'NORMAL').toString(),
      activeDivisions: (json['activeDivisions'] as num?)?.toInt() ?? 0,
      totalDivisions: (json['totalDivisions'] as num?)?.toInt() ?? 0,
      todayProduction: (json['todayProduction'] as num?)?.toDouble() ?? 0,
      dailyTarget: (json['dailyTarget'] as num?)?.toDouble() ?? 0,
      achievement: (json['achievement'] as num?)?.toDouble() ?? 0,
      activeWorkers: (json['activeWorkers'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'estateId': estateId,
        'estateName': estateName,
        'status': status,
        'activeDivisions': activeDivisions,
        'totalDivisions': totalDivisions,
        'todayProduction': todayProduction,
        'dailyTarget': dailyTarget,
        'achievement': achievement,
        'activeWorkers': activeWorkers,
      };
}

class DivisionMonitorSummary {
  final String divisionId;
  final String divisionName;
  final String estateId;
  final String status;
  final String? mandorName;
  final int activeBlocks;
  final int totalBlocks;
  final double todayProduction;
  final double progress;
  final DateTime? lastActivity;

  const DivisionMonitorSummary({
    required this.divisionId,
    required this.divisionName,
    required this.estateId,
    required this.status,
    this.mandorName,
    required this.activeBlocks,
    required this.totalBlocks,
    required this.todayProduction,
    required this.progress,
    this.lastActivity,
  });

  factory DivisionMonitorSummary.fromJson(Map<String, dynamic> json) {
    return DivisionMonitorSummary(
      divisionId: (json['divisionId'] ?? '').toString(),
      divisionName: (json['divisionName'] ?? '').toString(),
      estateId: (json['estateId'] ?? '').toString(),
      status: (json['status'] ?? 'NORMAL').toString(),
      mandorName: json['mandorName'] as String?,
      activeBlocks: (json['activeBlocks'] as num?)?.toInt() ?? 0,
      totalBlocks: (json['totalBlocks'] as num?)?.toInt() ?? 0,
      todayProduction: (json['todayProduction'] as num?)?.toDouble() ?? 0,
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      lastActivity: json['lastActivity'] != null
          ? DateTime.tryParse(json['lastActivity'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'divisionId': divisionId,
        'divisionName': divisionName,
        'estateId': estateId,
        'status': status,
        'mandorName': mandorName,
        'activeBlocks': activeBlocks,
        'totalBlocks': totalBlocks,
        'todayProduction': todayProduction,
        'progress': progress,
        'lastActivity': lastActivity?.toIso8601String(),
      };
}

class HarvestActivityItem {
  final String id;
  final String blockName;
  final String divisionName;
  final String mandorName;
  final DateTime startTime;
  final int currentTbs;
  final double currentWeight;
  final int workersCount;
  final String status;

  const HarvestActivityItem({
    required this.id,
    required this.blockName,
    required this.divisionName,
    required this.mandorName,
    required this.startTime,
    required this.currentTbs,
    required this.currentWeight,
    required this.workersCount,
    required this.status,
  });

  factory HarvestActivityItem.fromJson(Map<String, dynamic> json) {
    return HarvestActivityItem(
      id: (json['id'] ?? '').toString(),
      blockName: (json['blockName'] ?? '').toString(),
      divisionName: (json['divisionName'] ?? '').toString(),
      mandorName: (json['mandorName'] ?? '').toString(),
      startTime: DateTime.tryParse((json['startTime'] ?? '').toString()) ??
          DateTime.now(),
      currentTbs: (json['currentTbs'] as num?)?.toInt() ?? 0,
      currentWeight: (json['currentWeight'] as num?)?.toDouble() ?? 0,
      workersCount: (json['workersCount'] as num?)?.toInt() ?? 0,
      status: (json['status'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'blockName': blockName,
        'divisionName': divisionName,
        'mandorName': mandorName,
        'startTime': startTime.toIso8601String(),
        'currentTbs': currentTbs,
        'currentWeight': currentWeight,
        'workersCount': workersCount,
        'status': status,
      };
}

class RealtimeStatsData {
  final int totalTbsToday;
  final double totalWeightToday;
  final int activeWorkers;
  final int activeBlocks;
  final double productivityRate;

  const RealtimeStatsData({
    required this.totalTbsToday,
    required this.totalWeightToday,
    required this.activeWorkers,
    required this.activeBlocks,
    required this.productivityRate,
  });

  factory RealtimeStatsData.fromJson(Map<String, dynamic> json) {
    return RealtimeStatsData(
      totalTbsToday: (json['totalTbsToday'] as num?)?.toInt() ?? 0,
      totalWeightToday: (json['totalWeightToday'] as num?)?.toDouble() ?? 0,
      activeWorkers: (json['activeWorkers'] as num?)?.toInt() ?? 0,
      activeBlocks: (json['activeBlocks'] as num?)?.toInt() ?? 0,
      productivityRate: (json['productivityRate'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'totalTbsToday': totalTbsToday,
        'totalWeightToday': totalWeightToday,
        'activeWorkers': activeWorkers,
        'activeBlocks': activeBlocks,
        'productivityRate': productivityRate,
      };
}

class ManagerMonitorRepository {
  final GraphQLClientService _graphqlClient;

  ManagerMonitorRepository({
    required GraphQLClientService graphqlClient,
    Logger? logger,
  }) : _graphqlClient = graphqlClient;

  static const String _managerMonitorQuery = r'''
    query ManagerMonitor {
      managerMonitor {
        overallStatus
        estateMonitors {
          estateId
          estateName
          status
          activeDivisions
          totalDivisions
          todayProduction
          dailyTarget
          achievement
          activeWorkers
        }
        divisionMonitors {
          divisionId
          divisionName
          estateId
          status
          mandorName
          activeBlocks
          totalBlocks
          todayProduction
          progress
          lastActivity
        }
        activeActivities {
          id
          blockName
          divisionName
          mandorName
          startTime
          currentTbs
          currentWeight
          workersCount
          status
        }
        realtimeStats {
          totalTbsToday
          totalWeightToday
          activeWorkers
          activeBlocks
          productivityRate
        }
        lastUpdated
      }
    }
  ''';

  Future<ManagerMonitorSnapshot> fetchSnapshot({
    DateTime? dateFrom,
    DateTime? dateTo,
  }) async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(_managerMonitorQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(
        'Gagal mengambil data monitor: ${result.exception.toString()}',
      );
    }

    final data = result.data?['managerMonitor'] as Map<String, dynamic>?;
    if (data == null) {
      return ManagerMonitorSnapshot.empty();
    }

    return _mapMonitorData(data);
  }

  ManagerMonitorSnapshot _mapMonitorData(Map<String, dynamic> data) {
    final overallStatus = (data['overallStatus'] ?? 'NORMAL').toString();

    final estateMonitors =
        (data['estateMonitors'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(EstateMonitorSummary.fromJson)
            .toList(growable: false);

    final divisionMonitors =
        (data['divisionMonitors'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(DivisionMonitorSummary.fromJson)
            .toList(growable: false);

    final activeActivities =
        (data['activeActivities'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(HarvestActivityItem.fromJson)
            .toList(growable: false);

    final realtimeRaw = data['realtimeStats'] as Map<String, dynamic>?;
    final realtimeStats =
        realtimeRaw != null ? RealtimeStatsData.fromJson(realtimeRaw) : null;

    // Build members from division monitors (mandors active today)
    // and active activities for richer member data
    final members = _buildMembersFromActivities(
      divisionMonitors,
      activeActivities,
    );

    // Compute summary stats from the structured data
    final totalMandor = realtimeStats?.activeWorkers ?? 0;
    final totalAsisten = _countUniqueAsistens(divisionMonitors);
    final totalPemanen = _countUniquePemanen(activeActivities);
    final totalTeam = totalMandor + totalAsisten + totalPemanen;

    final totalWeight = realtimeStats?.totalWeightToday ?? 0;
    final totalTarget = estateMonitors.fold<double>(
      0,
      (sum, e) => sum + e.dailyTarget,
    );
    final efficiency = totalTarget > 0 ? (totalWeight / totalTarget * 100) : 0;

    String? warningMessage;
    if (estateMonitors.isEmpty) {
      warningMessage = 'Belum ada estate yang diassign ke akun manager ini.';
    } else if (activeActivities.isEmpty) {
      warningMessage = 'Belum ada aktivitas panen hari ini.';
    }

    return ManagerMonitorSnapshot(
      totalTeam: totalTeam,
      totalMandor: totalMandor,
      totalAsisten: totalAsisten,
      totalPemanen: totalPemanen,
      efficiency: efficiency.clamp(0, 100).toDouble(),
      members: members,
      warningMessage: warningMessage,
      overallStatus: overallStatus,
      estateMonitors: estateMonitors,
      divisionMonitors: divisionMonitors,
      activeActivities: activeActivities,
      realtimeStats: realtimeStats,
    );
  }

  List<ManagerMonitorMember> _buildMembersFromActivities(
    List<DivisionMonitorSummary> divisions,
    List<HarvestActivityItem> activities,
  ) {
    // Group activities by mandor to create member entries
    final mandorMap = <String, _MandorAggregation>{};

    for (final activity in activities) {
      final key = activity.mandorName;
      if (key.isEmpty) continue;

      final existing = mandorMap[key];
      if (existing != null) {
        existing.totalRecords++;
        existing.productionKg += activity.currentWeight;
        if (activity.status == 'APPROVED') {
          existing.approvedRecords++;
        }
        if (existing.division.isEmpty) {
          existing.division = activity.divisionName;
        }
      } else {
        mandorMap[key] = _MandorAggregation(
          name: activity.mandorName,
          division: activity.divisionName,
          totalRecords: 1,
          approvedRecords: activity.status == 'APPROVED' ? 1 : 0,
          productionKg: activity.currentWeight,
        );
      }
    }

    // Also add mandors from division summaries that might not have activities
    for (final div in divisions) {
      if (div.mandorName != null &&
          div.mandorName!.isNotEmpty &&
          !mandorMap.containsKey(div.mandorName)) {
        mandorMap[div.mandorName!] = _MandorAggregation(
          name: div.mandorName!,
          division: div.divisionName,
          totalRecords: 0,
          approvedRecords: 0,
          productionKg: 0,
        );
      }
    }

    final members = mandorMap.values.map((agg) {
      final performance = agg.totalRecords > 0
          ? (agg.approvedRecords / agg.totalRecords) * 100
          : 0.0;
      return ManagerMonitorMember(
        id: agg.name, // mandor name as ID since we don't have user IDs here
        name: agg.name,
        role: 'Mandor',
        division: agg.division,
        performance: performance.clamp(0, 100),
        productionTon: agg.productionKg / 1000,
        isActive: agg.totalRecords > 0,
        totalRecords: agg.totalRecords,
        approvedRecords: agg.approvedRecords,
      );
    }).toList()
      ..sort((a, b) {
        final byPerformance = b.performance.compareTo(a.performance);
        if (byPerformance != 0) return byPerformance;
        final byProduction = b.productionTon.compareTo(a.productionTon);
        if (byProduction != 0) return byProduction;
        return a.name.toLowerCase().compareTo(b.name.toLowerCase());
      });

    return members;
  }

  int _countUniqueAsistens(List<DivisionMonitorSummary> divisions) {
    // Each division with activity likely has an asisten overseeing it
    return divisions.where((d) => d.activeBlocks > 0).length;
  }

  int _countUniquePemanen(List<HarvestActivityItem> activities) {
    return activities.fold<int>(0, (sum, a) => sum + a.workersCount);
  }
}

class _MandorAggregation {
  final String name;
  String division;
  int totalRecords;
  int approvedRecords;
  double productionKg;

  _MandorAggregation({
    required this.name,
    required this.division,
    required this.totalRecords,
    required this.approvedRecords,
    required this.productionKg,
  });
}
