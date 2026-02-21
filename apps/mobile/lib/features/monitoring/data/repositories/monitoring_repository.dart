import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:agrinova_mobile/features/approval/data/repositories/approval_repository.dart';
import 'package:agrinova_mobile/features/approval/domain/entities/approval_item.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

const String _asistenMonitoringQuery = r'''
  query AsistenMonitoringSnapshot {
    asistenMonitoring {
      realtimeStats {
        totalSubmissionsToday
        totalTbsToday
        totalWeightToday
      }
      divisionSummaries {
        divisionName
        progress
      }
      mandorStatuses {
        mandorName
        todayWeight
        todaySubmissions
        approvedSubmissions
      }
    }
  }
''';

enum MonitoringPeriod { today, week, month, year }

class MonitoringDateRange {
  final DateTime start;
  final DateTime endExclusive;

  const MonitoringDateRange({
    required this.start,
    required this.endExclusive,
  });
}

class DivisionSummarySnapshot {
  final String divisionName;
  final double progress;

  const DivisionSummarySnapshot({
    required this.divisionName,
    required this.progress,
  });
}

class MandorStatusSnapshot {
  final String mandorName;
  final double todayWeight;
  final int todaySubmissions;
  final int approvedSubmissions;

  const MandorStatusSnapshot({
    required this.mandorName,
    required this.todayWeight,
    required this.todaySubmissions,
    required this.approvedSubmissions,
  });
}

class AsistenMonitoringSnapshot {
  final int totalSubmissionsToday;
  final int totalTbsToday;
  final double totalWeightToday;
  final List<DivisionSummarySnapshot> divisionSummaries;
  final List<MandorStatusSnapshot> mandorStatuses;

  const AsistenMonitoringSnapshot({
    required this.totalSubmissionsToday,
    required this.totalTbsToday,
    required this.totalWeightToday,
    required this.divisionSummaries,
    required this.mandorStatuses,
  });
}

class MonitoringDashboardData {
  final MonitoringDateRange dateRange;
  final Map<String, dynamic> stats;
  final List<Map<String, dynamic>> chartData;
  final List<Map<String, dynamic>> recentActivities;
  final Map<String, dynamic> todayStats;
  final List<Map<String, dynamic>> estateComparison;
  final List<ApprovalItem> pendingItems;
  final List<ApprovalItem> approvedItems;
  final List<ApprovalItem> rejectedItems;
  final AsistenMonitoringSnapshot? asistenMonitoringSnapshot;

  const MonitoringDashboardData({
    required this.dateRange,
    required this.stats,
    required this.chartData,
    required this.recentActivities,
    required this.todayStats,
    required this.estateComparison,
    required this.pendingItems,
    required this.approvedItems,
    required this.rejectedItems,
    required this.asistenMonitoringSnapshot,
  });
}

abstract class MonitoringRepository {
  Future<MonitoringDashboardData> getMonitoringData({
    String? estateId,
    required String period,
    required DateTime date,
  });
}

class MonitoringRepositoryImpl implements MonitoringRepository {
  final ApprovalRepository approvalRepository;
  final GraphQLClientService graphqlClient;

  MonitoringRepositoryImpl({
    required this.approvalRepository,
    required this.graphqlClient,
  });

  @override
  Future<MonitoringDashboardData> getMonitoringData({
    String? estateId,
    required String period,
    required DateTime date,
  }) async {
    final dateRange = _resolveRange(period, date);
    final inclusiveDateTo =
        dateRange.endExclusive.subtract(const Duration(milliseconds: 1));

    final responses = await Future.wait<dynamic>([
      approvalRepository.getPendingApprovals(
        status: 'PENDING',
        dateFrom: dateRange.start,
        dateTo: inclusiveDateTo,
        sortBy: 'HARVEST_DATE',
        sortDirection: 'DESC',
        pageSize: 500,
      ),
      approvalRepository.getPendingApprovals(
        status: 'APPROVED',
        dateFrom: dateRange.start,
        dateTo: inclusiveDateTo,
        sortBy: 'HARVEST_DATE',
        sortDirection: 'DESC',
        pageSize: 500,
      ),
      approvalRepository.getPendingApprovals(
        status: 'REJECTED',
        dateFrom: dateRange.start,
        dateTo: inclusiveDateTo,
        sortBy: 'HARVEST_DATE',
        sortDirection: 'DESC',
        pageSize: 500,
      ),
      _fetchAsistenMonitoringSnapshot(),
    ]);

    final pendingItems = responses[0] as List<ApprovalItem>;
    final approvedItems = responses[1] as List<ApprovalItem>;
    final rejectedItems = responses[2] as List<ApprovalItem>;
    final monitoringSnapshot = responses[3] as AsistenMonitoringSnapshot?;

    final allItems = [...pendingItems, ...approvedItems, ...rejectedItems]
      ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));

    final totalWeightKg =
        allItems.fold<double>(0, (sum, item) => sum + item.weight);
    final totalHarvestTon = totalWeightKg / 1000;
    final totalSubmissions = allItems.length;
    final approvalRate = totalSubmissions > 0
        ? (approvedItems.length / totalSubmissions) * 100
        : 0.0;

    final stats = <String, dynamic>{
      'totalHarvest': totalHarvestTon,
      'pendingApproval': pendingItems.length,
      'gateCheckCount': 0,
      'productivity': approvalRate,
      'harvestTrend': '-',
      'approvalTrend': '-',
      'gateCheckTrend': '-',
      'productivityTrend': '-',
    };

    final chartData = _buildChartData(dateRange, allItems);
    final recentActivities = _buildRecentActivities(allItems);
    final todayStats = _buildTodayStats(
      dateRange: dateRange,
      allItems: allItems,
      approvedItems: approvedItems,
      rejectedItems: rejectedItems,
      monitoringSnapshot: monitoringSnapshot,
    );
    final estateComparison =
        _buildEstateComparison(monitoringSnapshot, allItems, dateRange);

    return MonitoringDashboardData(
      dateRange: dateRange,
      stats: stats,
      chartData: chartData,
      recentActivities: recentActivities,
      todayStats: todayStats,
      estateComparison: estateComparison,
      pendingItems: pendingItems,
      approvedItems: approvedItems,
      rejectedItems: rejectedItems,
      asistenMonitoringSnapshot: monitoringSnapshot,
    );
  }

  MonitoringDateRange _resolveRange(String period, DateTime date) {
    final periodKey = period.toUpperCase();
    final normalized = DateTime(date.year, date.month, date.day);

    switch (periodKey) {
      case 'TODAY':
        return MonitoringDateRange(
          start: normalized,
          endExclusive: normalized.add(const Duration(days: 1)),
        );
      case 'WEEK':
        final weekStart =
            normalized.subtract(Duration(days: normalized.weekday - 1));
        return MonitoringDateRange(
          start: weekStart,
          endExclusive: weekStart.add(const Duration(days: 7)),
        );
      case 'YEAR':
        final yearStart = DateTime(date.year, 1, 1);
        return MonitoringDateRange(
          start: yearStart,
          endExclusive: DateTime(date.year + 1, 1, 1),
        );
      case 'MONTH':
      default:
        final monthStart = DateTime(date.year, date.month, 1);
        return MonitoringDateRange(
          start: monthStart,
          endExclusive: DateTime(date.year, date.month + 1, 1),
        );
    }
  }

  List<Map<String, dynamic>> _buildChartData(
    MonitoringDateRange range,
    List<ApprovalItem> items,
  ) {
    final totalDays = range.endExclusive.difference(range.start).inDays;
    if (totalDays <= 1) {
      return List.generate(8, (index) {
        final start = range.start.add(Duration(hours: index * 3));
        final end = start.add(const Duration(hours: 3));
        return {
          'label': start.hour.toString().padLeft(2, '0'),
          'value': _sumWeightInRange(items, start, end) / 1000,
        };
      });
    }

    if (totalDays <= 7) {
      return List.generate(totalDays, (index) {
        final start = range.start.add(Duration(days: index));
        final end = start.add(const Duration(days: 1));
        return {
          'label': _weekdayShort(start.weekday),
          'value': _sumWeightInRange(items, start, end) / 1000,
        };
      });
    }

    final points = <Map<String, dynamic>>[];
    var cursor = range.start;
    var weekIndex = 1;
    while (cursor.isBefore(range.endExclusive)) {
      final rawEnd = cursor.add(const Duration(days: 7));
      final end =
          rawEnd.isBefore(range.endExclusive) ? rawEnd : range.endExclusive;
      points.add({
        'label': 'M$weekIndex',
        'value': _sumWeightInRange(items, cursor, end) / 1000,
      });
      cursor = end;
      weekIndex++;
    }

    return points;
  }

  List<Map<String, dynamic>> _buildRecentActivities(List<ApprovalItem> items) {
    return items.take(20).map((item) {
      return {
        'id': item.id,
        'title': '${item.mandorName} - ${item.blockName}',
        'status': item.status,
        'time': item.submittedAt.toIso8601String(),
        'weight': item.weight,
        'tbsCount': item.tbsCount,
      };
    }).toList(growable: false);
  }

  Map<String, dynamic> _buildTodayStats({
    required MonitoringDateRange dateRange,
    required List<ApprovalItem> allItems,
    required List<ApprovalItem> approvedItems,
    required List<ApprovalItem> rejectedItems,
    required AsistenMonitoringSnapshot? monitoringSnapshot,
  }) {
    var newHarvests = allItems.length;
    var approved = approvedItems.length;
    var rejected = rejectedItems.length;
    var totalTbs = allItems.fold<int>(0, (sum, item) => sum + item.tbsCount);

    if (dateRange.endExclusive.difference(dateRange.start).inDays == 1 &&
        monitoringSnapshot != null) {
      if (newHarvests == 0 && monitoringSnapshot.totalSubmissionsToday > 0) {
        newHarvests = monitoringSnapshot.totalSubmissionsToday;
      }
      if (totalTbs == 0 && monitoringSnapshot.totalTbsToday > 0) {
        totalTbs = monitoringSnapshot.totalTbsToday;
      }
      approved = monitoringSnapshot.mandorStatuses.fold<int>(
        approved,
        (sum, status) => sum + status.approvedSubmissions,
      );
    }

    return {
      'newHarvests': newHarvests,
      'approved': approved,
      'rejected': rejected,
      'totalTbs': totalTbs,
      'trucksIn': 0,
    };
  }

  List<Map<String, dynamic>> _buildEstateComparison(
    AsistenMonitoringSnapshot? monitoringSnapshot,
    List<ApprovalItem> allItems,
    MonitoringDateRange dateRange,
  ) {
    if (monitoringSnapshot != null &&
        monitoringSnapshot.divisionSummaries.isNotEmpty) {
      return monitoringSnapshot.divisionSummaries.map((division) {
        return {
          'name': division.divisionName,
          'percentage': division.progress.clamp(0, 100).toDouble(),
        };
      }).toList(growable: false);
    }

    final grouped = <String, int>{};
    for (final item in allItems) {
      final division = item.divisionName.trim();
      if (division.isEmpty) {
        continue;
      }
      grouped[division] = (grouped[division] ?? 0) + 1;
    }

    if (grouped.isEmpty) {
      return const [];
    }

    var maxCount = 0;
    for (final value in grouped.values) {
      if (value > maxCount) {
        maxCount = value;
      }
    }

    return grouped.entries.map((entry) {
      final percent = maxCount > 0 ? (entry.value / maxCount) * 100 : 0.0;
      return {
        'name': entry.key,
        'percentage': percent,
      };
    }).toList(growable: false);
  }

  double _sumWeightInRange(
    List<ApprovalItem> items,
    DateTime start,
    DateTime endExclusive,
  ) {
    var total = 0.0;
    for (final item in items) {
      if (!item.submittedAt.isBefore(start) &&
          item.submittedAt.isBefore(endExclusive)) {
        total += item.weight;
      }
    }
    return total;
  }

  String _weekdayShort(int weekday) {
    const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return labels[weekday - 1];
  }

  Future<AsistenMonitoringSnapshot?> _fetchAsistenMonitoringSnapshot() async {
    try {
      final result = await graphqlClient.query(
        QueryOptions(
          document: gql(_asistenMonitoringQuery),
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );

      if (result.hasException) {
        return null;
      }

      final monitoring = result.data?['asistenMonitoring'];
      if (monitoring is! Map<String, dynamic>) {
        return null;
      }

      final realtimeStats =
          monitoring['realtimeStats'] as Map<String, dynamic>?;

      final divisions = <DivisionSummarySnapshot>[];
      final divisionRaw = monitoring['divisionSummaries'] as List?;
      if (divisionRaw != null) {
        for (final item in divisionRaw) {
          if (item is! Map<String, dynamic>) {
            continue;
          }
          final name = (item['divisionName'] as String?)?.trim() ?? '';
          if (name.isEmpty) {
            continue;
          }
          divisions.add(
            DivisionSummarySnapshot(
              divisionName: name,
              progress: _toDouble(item['progress']),
            ),
          );
        }
      }

      final mandors = <MandorStatusSnapshot>[];
      final mandorRaw = monitoring['mandorStatuses'] as List?;
      if (mandorRaw != null) {
        for (final item in mandorRaw) {
          if (item is! Map<String, dynamic>) {
            continue;
          }
          final name = (item['mandorName'] as String?)?.trim() ?? '';
          if (name.isEmpty) {
            continue;
          }
          mandors.add(
            MandorStatusSnapshot(
              mandorName: name,
              todayWeight: _toDouble(item['todayWeight']),
              todaySubmissions: _toInt(item['todaySubmissions']),
              approvedSubmissions: _toInt(item['approvedSubmissions']),
            ),
          );
        }
      }

      return AsistenMonitoringSnapshot(
        totalSubmissionsToday: _toInt(realtimeStats?['totalSubmissionsToday']),
        totalTbsToday: _toInt(realtimeStats?['totalTbsToday']),
        totalWeightToday: _toDouble(realtimeStats?['totalWeightToday']),
        divisionSummaries: divisions,
        mandorStatuses: mandors,
      );
    } catch (_) {
      return null;
    }
  }

  int _toInt(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value) ?? 0;
    }
    return 0;
  }

  double _toDouble(dynamic value) {
    if (value is double) {
      return value;
    }
    if (value is num) {
      return value.toDouble();
    }
    if (value is String) {
      return double.tryParse(value) ?? 0;
    }
    return 0;
  }
}
