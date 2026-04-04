import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class ManagerHarvestApprovalItem {
  final String id;
  final String mandorName;
  final String blockName;
  final String divisionName;
  final String workerLabel;
  final int bunchCount;
  final double weightKg;
  final DateTime harvestDate;
  final DateTime submittedAt;
  final String status;
  final int jjgMatang;
  final int jjgMentah;
  final int jjgLewatMatang;
  final int jjgBusukAbnormal;
  final int jjgTangkaiPanjang;

  const ManagerHarvestApprovalItem({
    required this.id,
    required this.mandorName,
    required this.blockName,
    required this.divisionName,
    required this.workerLabel,
    required this.bunchCount,
    required this.weightKg,
    required this.harvestDate,
    required this.submittedAt,
    required this.status,
    required this.jjgMatang,
    required this.jjgMentah,
    required this.jjgLewatMatang,
    required this.jjgBusukAbnormal,
    required this.jjgTangkaiPanjang,
  });

  factory ManagerHarvestApprovalItem.fromJson(Map<String, dynamic> json) {
    return ManagerHarvestApprovalItem(
      id: (json['id'] ?? '').toString(),
      mandorName: (json['mandorName'] ?? '').toString(),
      blockName: (json['blockName'] ?? '').toString(),
      divisionName: (json['divisionName'] ?? '').toString(),
      workerLabel: (json['workerLabel'] ?? '').toString(),
      bunchCount: (json['bunchCount'] as num?)?.toInt() ?? 0,
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? 0,
      harvestDate:
          DateTime.tryParse((json['harvestDate'] ?? '').toString()) ??
          DateTime.now(),
      submittedAt:
          DateTime.tryParse((json['submittedAt'] ?? '').toString()) ??
          DateTime.now(),
      status: (json['status'] ?? 'PENDING').toString(),
      jjgMatang: (json['jjgMatang'] as num?)?.toInt() ?? 0,
      jjgMentah: (json['jjgMentah'] as num?)?.toInt() ?? 0,
      jjgLewatMatang: (json['jjgLewatMatang'] as num?)?.toInt() ?? 0,
      jjgBusukAbnormal: (json['jjgBusukAbnormal'] as num?)?.toInt() ?? 0,
      jjgTangkaiPanjang: (json['jjgTangkaiPanjang'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mandorName': mandorName,
      'blockName': blockName,
      'divisionName': divisionName,
      'workerLabel': workerLabel,
      'bunchCount': bunchCount,
      'weightKg': weightKg,
      'harvestDate': harvestDate.toIso8601String(),
      'submittedAt': submittedAt.toIso8601String(),
      'status': status,
      'jjgMatang': jjgMatang,
      'jjgMentah': jjgMentah,
      'jjgLewatMatang': jjgLewatMatang,
      'jjgBusukAbnormal': jjgBusukAbnormal,
      'jjgTangkaiPanjang': jjgTangkaiPanjang,
    };
  }

  int get qualityTotal =>
      jjgMatang +
      jjgMentah +
      jjgLewatMatang +
      jjgBusukAbnormal +
      jjgTangkaiPanjang;

  bool get hasQualityData => qualityTotal > 0;
}

class ManagerHarvestApprovalRepository {
  final GraphQLClientService _graphqlClient;

  ManagerHarvestApprovalRepository({
    required GraphQLClientService graphqlClient,
  }) : _graphqlClient = graphqlClient;

  static const String _pendingQuery = r'''
    query ManagerPendingHarvestApprovals {
      harvestRecordsByStatus(status: PENDING) {
        id
        tanggal
        createdAt
        status
        karyawan
        jumlahJanjang
        beratTbs
        jjgMatang
        jjgMentah
        jjgLewatMatang
        jjgBusukAbnormal
        jjgTangkaiPanjang
        mandor {
          id
          name
        }
        block {
          id
          name
          division {
            id
            name
          }
        }
      }
    }
  ''';

  static const String _batchApprovalMutation = r'''
    mutation BatchApproval($input: BatchApprovalInput!) {
      batchApproval(input: $input) {
        success
        totalProcessed
        successCount
        failedCount
        results {
          id
          success
          error
        }
        message
      }
    }
  ''';

  static const String _approveMutation = r'''
    mutation ManagerApproveHarvestRecord($input: ApproveHarvestInput!) {
      approveHarvestRecord(input: $input) {
        id
        status
      }
    }
  ''';

  static const String _rejectMutation = r'''
    mutation ManagerRejectHarvestRecord($input: RejectHarvestInput!) {
      rejectHarvestRecord(input: $input) {
        id
        status
        rejectedReason
      }
    }
  ''';

  Future<List<ManagerHarvestApprovalItem>> fetchPendingApprovals() async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(_pendingQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(
        'Gagal mengambil daftar approval panen: ${result.exception.toString()}',
      );
    }

    final rows =
        result.data?['harvestRecordsByStatus'] as List<dynamic>? ?? const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(_mapItem)
        .toList(growable: false);
  }

  Future<void> approveHarvestRecord(String id) async {
    final result = await _graphqlClient.mutate(
      MutationOptions(
        document: gql(_approveMutation),
        variables: {
          'input': {
            'id': id,
            // Value is ignored by backend and replaced by authenticated user.
            'approvedBy': '__AUTO_FROM_AUTH__',
          },
        },
      ),
    );

    if (result.hasException) {
      throw Exception(
        'Gagal menyetujui data panen: ${result.exception.toString()}',
      );
    }
  }

  Future<ManagerBatchApprovalResult> batchApproval({
    required List<String> ids,
    required String action,
    String? rejectionReason,
  }) async {
    final result = await _graphqlClient.mutate(
      MutationOptions(
        document: gql(_batchApprovalMutation),
        variables: {
          'input': {
            'ids': ids,
            'action': action,
            if (rejectionReason != null) 'rejectionReason': rejectionReason,
          },
        },
      ),
    );

    if (result.hasException) {
      throw Exception(
        'Gagal batch approval: ${result.exception.toString()}',
      );
    }

    final data = result.data?['batchApproval'];
    if (data == null) {
      throw Exception('Tidak ada respons dari batch approval');
    }

    return ManagerBatchApprovalResult.fromJson(data);
  }

  Future<void> rejectHarvestRecord(String id, String reason) async {
    final result = await _graphqlClient.mutate(
      MutationOptions(
        document: gql(_rejectMutation),
        variables: {
          'input': {'id': id, 'rejectedReason': reason},
        },
      ),
    );

    if (result.hasException) {
      throw Exception(
        'Gagal menolak data panen: ${result.exception.toString()}',
      );
    }
  }

  ManagerHarvestApprovalItem _mapItem(Map<String, dynamic> json) {
    final mandor = json['mandor'] as Map<String, dynamic>? ?? const {};
    final block = json['block'] as Map<String, dynamic>? ?? const {};
    final division = block['division'] as Map<String, dynamic>? ?? const {};

    final harvestDate = _parseDateTime(json['tanggal']);
    final submittedAt = _parseDateTime(json['createdAt']);

    return ManagerHarvestApprovalItem(
      id: (json['id'] ?? '').toString(),
      mandorName: _stringOrFallback(mandor['name'], 'Mandor'),
      blockName: _stringOrFallback(block['name'], 'Blok'),
      divisionName: _stringOrFallback(division['name'], '-'),
      workerLabel: _stringOrFallback(json['karyawan'], '-'),
      bunchCount: (json['jumlahJanjang'] as num?)?.toInt() ?? 0,
      weightKg: (json['beratTbs'] as num?)?.toDouble() ?? 0,
      harvestDate: harvestDate,
      submittedAt: submittedAt,
      status: _stringOrFallback(json['status'], 'PENDING'),
      jjgMatang: (json['jjgMatang'] as num?)?.toInt() ?? 0,
      jjgMentah: (json['jjgMentah'] as num?)?.toInt() ?? 0,
      jjgLewatMatang: (json['jjgLewatMatang'] as num?)?.toInt() ?? 0,
      jjgBusukAbnormal: (json['jjgBusukAbnormal'] as num?)?.toInt() ?? 0,
      jjgTangkaiPanjang: (json['jjgTangkaiPanjang'] as num?)?.toInt() ?? 0,
    );
  }

  DateTime _parseDateTime(dynamic value) {
    if (value is String) {
      final parsed = DateTime.tryParse(value);
      if (parsed != null) {
        return parsed.toLocal();
      }
    }
    return DateTime.now();
  }

  String _stringOrFallback(dynamic value, String fallback) {
    final parsed = value?.toString().trim() ?? '';
    if (parsed.isEmpty) {
      return fallback;
    }
    return parsed;
  }
}

class ManagerBatchApprovalResult {
  final bool success;
  final int totalProcessed;
  final int successCount;
  final int failedCount;
  final List<ManagerBatchItemResult> results;
  final String message;

  const ManagerBatchApprovalResult({
    required this.success,
    required this.totalProcessed,
    required this.successCount,
    required this.failedCount,
    required this.results,
    required this.message,
  });

  factory ManagerBatchApprovalResult.fromJson(Map<String, dynamic> json) {
    return ManagerBatchApprovalResult(
      success: json['success'] ?? false,
      totalProcessed: json['totalProcessed'] ?? 0,
      successCount: json['successCount'] ?? 0,
      failedCount: json['failedCount'] ?? 0,
      results: (json['results'] as List?)
              ?.map((e) =>
                  ManagerBatchItemResult.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      message: json['message'] ?? '',
    );
  }
}

class ManagerBatchItemResult {
  final String id;
  final bool success;
  final String? error;

  const ManagerBatchItemResult({
    required this.id,
    required this.success,
    this.error,
  });

  factory ManagerBatchItemResult.fromJson(Map<String, dynamic> json) {
    return ManagerBatchItemResult(
      id: json['id'] ?? '',
      success: json['success'] ?? false,
      error: json['error'],
    );
  }
}
