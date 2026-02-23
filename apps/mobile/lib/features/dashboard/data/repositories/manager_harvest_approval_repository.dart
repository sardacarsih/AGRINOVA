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
