import 'package:agrinova_mobile/core/graphql/graphql_client.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../domain/entities/approval_item.dart';

abstract class ApprovalRepository {
  Future<List<ApprovalItem>> getPendingApprovals({
    String? status,
    String? divisionId,
    String? blockId,
    String? mandorId,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? priority,
    String? search,
    String? sortBy,
    String? sortDirection,
    int? page,
    int? pageSize,
  });

  Future<ApprovalStats> getApprovalStats();

  Future<void> approveHarvest(String id, {String? notes});

  Future<void> rejectHarvest(String id, String reason);
}

class ApprovalRepositoryImpl implements ApprovalRepository {
  final AgroGraphQLClient _graphQLClient;

  ApprovalRepositoryImpl({required AgroGraphQLClient graphQLClient})
      : _graphQLClient = graphQLClient;

  static const String _pendingApprovalsQuery = r'''
      query PendingApprovals($filter: ApprovalFilterInput) {
        pendingApprovals(filter: $filter) {
          items {
            id
            mandor {
              id
              name
            }
            block {
              id
              name
            }
            division {
              id
              name
            }
            harvestDate
            employeeCount
            employees
            tbsCount
            weight
            submittedAt
            elapsedTime
            status
            hasPhoto
            photoUrls
            priority
            notes
          }
        }
      }
    ''';

  static const String _approvalHistoryQuery = r'''
      query ApprovalHistory($filter: ApprovalFilterInput) {
        approvalHistory(filter: $filter) {
          items {
            id
            mandor {
              id
              name
            }
            block {
              id
              name
            }
            division {
              id
              name
            }
            harvestDate
            employeeCount
            employees
            tbsCount
            weight
            submittedAt
            elapsedTime
            status
            hasPhoto
            photoUrls
            priority
            notes
          }
        }
      }
    ''';

  @override
  Future<List<ApprovalItem>> getPendingApprovals({
    String? status,
    String? divisionId,
    String? blockId,
    String? mandorId,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? priority,
    String? search,
    String? sortBy,
    String? sortDirection,
    int? page,
    int? pageSize,
  }) async {
    final baseFilter = _buildFilter(
      divisionId: divisionId,
      blockId: blockId,
      mandorId: mandorId,
      dateFrom: dateFrom,
      dateTo: dateTo,
      priority: priority,
      search: search,
      sortBy: sortBy,
      sortDirection: sortDirection,
      page: page,
      pageSize: pageSize,
    );

    // "Semua" should include pending + historical (approved/rejected) records.
    if (status == null) {
      final pendingFilter = Map<String, dynamic>.from(baseFilter)
        ..['status'] = 'PENDING';
      final historyFilter = Map<String, dynamic>.from(baseFilter)
        ..remove('status');

      final results = await Future.wait([
        _fetchApprovalItems(
          query: _pendingApprovalsQuery,
          rootField: 'pendingApprovals',
          filter: pendingFilter,
        ),
        _fetchApprovalItems(
          query: _approvalHistoryQuery,
          rootField: 'approvalHistory',
          filter: historyFilter,
        ),
      ]);

      final combined = <ApprovalItem>[
        ...results[0],
        ...results[1],
      ]..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
      return combined;
    }

    final filter = Map<String, dynamic>.from(baseFilter)..['status'] = status;
    final useHistoryQuery = status == 'APPROVED' || status == 'REJECTED';

    return _fetchApprovalItems(
      query: useHistoryQuery ? _approvalHistoryQuery : _pendingApprovalsQuery,
      rootField: useHistoryQuery ? 'approvalHistory' : 'pendingApprovals',
      filter: filter,
    );
  }

  Map<String, dynamic> _buildFilter({
    String? divisionId,
    String? blockId,
    String? mandorId,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? priority,
    String? search,
    String? sortBy,
    String? sortDirection,
    int? page,
    int? pageSize,
  }) {
    return {
      'divisionId': ?divisionId,
      'blockId': ?blockId,
      'mandorId': ?mandorId,
      if (dateFrom != null) 'dateFrom': dateFrom.toUtc().toIso8601String(),
      if (dateTo != null) 'dateTo': dateTo.toUtc().toIso8601String(),
      'priority': ?priority,
      'search': ?search,
      'sortBy': ?sortBy,
      'sortDirection': ?sortDirection,
      'page': ?page,
      'pageSize': ?pageSize,
    };
  }

  Future<List<ApprovalItem>> _fetchApprovalItems({
    required String query,
    required String rootField,
    required Map<String, dynamic> filter,
  }) async {
    final result = await _graphQLClient.query(
      QueryOptions(
        document: gql(query),
        variables: {'filter': filter},
        fetchPolicy: FetchPolicy.networkOnly, // Always fresh data for approvals
      ),
    );

    if (result.hasException) {
      throw result.exception!;
    }

    final data = result.data?[rootField]?['items'] as List?;
    if (data == null) return [];

    return data.map((json) => _mapApprovalItem(json)).toList();
  }

  ApprovalItem _mapApprovalItem(dynamic json) {
    final mandor = json['mandor'] ?? {};
    final block = json['block'] ?? {};
    final division = json['division'] ?? {};

    return ApprovalItem(
      id: json['id'],
      mandorName: mandor['name'] ?? 'Unknown',
      mandorId: mandor['id'] ?? '',
      blockName: block['name'] ?? 'Unknown',
      blockId: block['id'] ?? '',
      divisionName: division['name'] ?? 'Unknown',
      divisionId: division['id'] ?? '',
      harvestDate: DateTime.tryParse(json['harvestDate']) ?? DateTime.now(),
      employeeCount: json['employeeCount'] ?? 0,
      employees: json['employees'] ?? '',
      tbsCount: json['tbsCount'] ?? 0,
      weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      submittedAt: DateTime.tryParse(json['submittedAt']) ?? DateTime.now(),
      elapsedTime: json['elapsedTime'] ?? '',
      status: json['status'] ?? 'PENDING',
      hasPhoto: json['hasPhoto'] ?? false,
      photoUrls:
          (json['photoUrls'] as List?)?.map((e) => e.toString()).toList(),
      priority: json['priority'] ?? 'NORMAL',
      notes: json['notes'],
    );
  }

  @override
  Future<ApprovalStats> getApprovalStats() async {
    // This query might need adjustment based on actual schema capability
    // Using `asistenDashboardStats` as per schema inspection
    const query = r'''
      query AsistenDashboardStats {
        asistenDashboardStats {
          pendingApprovals
          approvedToday
          rejectedToday
        }
      }
    ''';

    final result = await _graphQLClient.query(
      QueryOptions(
        document: gql(query),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw result.exception!;
    }

    final data = result.data?['asistenDashboardStats'];
    if (data == null) {
      return const ApprovalStats(
          pendingCount: 0, approvedCount: 0, rejectedCount: 0);
    }

    return ApprovalStats(
      pendingCount: data['pendingApprovals'] ?? 0,
      approvedCount: data['approvedToday'] ?? 0,
      rejectedCount: data['rejectedToday'] ?? 0,
    );
  }

  @override
  Future<void> approveHarvest(String id, {String? notes}) async {
    const mutation = r'''
      mutation ApproveHarvest($id: ID!, $notes: String) {
        approveHarvest(id: $id, notes: $notes) {
          success
          message
        }
      }
    ''';

    final result = await _graphQLClient.mutate(
      MutationOptions(
        document: gql(mutation),
        variables: {'id': id, 'notes': notes},
      ),
    );

    if (result.hasException) {
      throw result.exception!;
    }

    final success = result.data?['approveHarvest']?['success'] ?? false;
    if (!success) {
      final message =
          result.data?['approveHarvest']?['message'] ?? 'Failed to approve';
      throw Exception(message);
    }
  }

  @override
  Future<void> rejectHarvest(String id, String reason) async {
    const mutation = r'''
      mutation RejectHarvest($id: ID!, $reason: String!) {
        rejectHarvest(id: $id, reason: $reason) {
          success
          message
        }
      }
    ''';

    final result = await _graphQLClient.mutate(
      MutationOptions(
        document: gql(mutation),
        variables: {'id': id, 'reason': reason},
      ),
    );

    if (result.hasException) {
      throw result.exception!;
    }

    final success = result.data?['rejectHarvest']?['success'] ?? false;
    if (!success) {
      final message =
          result.data?['rejectHarvest']?['message'] ?? 'Failed to reject';
      throw Exception(message);
    }
  }
}
