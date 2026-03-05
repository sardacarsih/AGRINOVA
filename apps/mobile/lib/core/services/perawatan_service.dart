import 'package:graphql_flutter/graphql_flutter.dart';

import '../graphql/perawatan_queries.dart';
import '../network/graphql_client_service.dart';

class PerawatanRecordSummary {
  final String id;
  final String blockId;
  final String blockName;
  final String blockCode;
  final String jenisPerawatan;
  final DateTime? tanggalPerawatan;
  final String pekerjaId;
  final String pekerjaName;
  final double luasArea;
  final String? catatan;
  final String? pupukDigunakan;
  final String? herbisidaDigunakan;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PerawatanRecordSummary({
    required this.id,
    required this.blockId,
    required this.blockName,
    required this.blockCode,
    required this.jenisPerawatan,
    required this.tanggalPerawatan,
    required this.pekerjaId,
    required this.pekerjaName,
    required this.luasArea,
    required this.catatan,
    required this.pupukDigunakan,
    required this.herbisidaDigunakan,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PerawatanRecordSummary.fromJson(Map<String, dynamic> json) {
    final block = json['block'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final pekerja = json['pekerja'] as Map<String, dynamic>? ?? const <String, dynamic>{};

    return PerawatanRecordSummary(
      id: json['id']?.toString() ?? '',
      blockId: json['blockId']?.toString() ?? '',
      blockName: block['name']?.toString() ?? '-',
      blockCode: block['blockCode']?.toString() ?? '-',
      jenisPerawatan: json['jenisPerawatan']?.toString() ?? '-',
      tanggalPerawatan: _parseDateTime(json['tanggalPerawatan']),
      pekerjaId: json['pekerjaId']?.toString() ?? '',
      pekerjaName: pekerja['name']?.toString() ?? '-',
      luasArea: _toDouble(json['luasArea']),
      catatan: json['catatan']?.toString(),
      pupukDigunakan: json['pupukDigunakan']?.toString(),
      herbisidaDigunakan: json['herbisidaDigunakan']?.toString(),
      status: json['status']?.toString() ?? '-',
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
    );
  }
}

class PerawatanMaterialUsageSummary {
  final String id;
  final String perawatanRecordId;
  final String materialCategory;
  final String materialName;
  final double quantity;
  final String unit;
  final double unitPrice;
  final double totalCost;
  final DateTime? createdAt;

  const PerawatanMaterialUsageSummary({
    required this.id,
    required this.perawatanRecordId,
    required this.materialCategory,
    required this.materialName,
    required this.quantity,
    required this.unit,
    required this.unitPrice,
    required this.totalCost,
    required this.createdAt,
  });

  factory PerawatanMaterialUsageSummary.fromJson(Map<String, dynamic> json) {
    return PerawatanMaterialUsageSummary(
      id: json['id']?.toString() ?? '',
      perawatanRecordId: json['perawatanRecordId']?.toString() ?? '',
      materialCategory: json['materialCategory']?.toString() ?? '-',
      materialName: json['materialName']?.toString() ?? '-',
      quantity: _toDouble(json['quantity']),
      unit: json['unit']?.toString() ?? '-',
      unitPrice: _toDouble(json['unitPrice']),
      totalCost: _toDouble(json['totalCost']),
      createdAt: _parseDateTime(json['createdAt']),
    );
  }
}

class PerawatanMaterialUsageDraft {
  final String perawatanRecordId;
  final String materialCategory;
  final String materialName;
  final double quantity;
  final String unit;
  final double unitPrice;

  const PerawatanMaterialUsageDraft({
    required this.perawatanRecordId,
    required this.materialCategory,
    required this.materialName,
    required this.quantity,
    required this.unit,
    required this.unitPrice,
  });

  Map<String, dynamic> toCreateInput() {
    return <String, dynamic>{
      'perawatanRecordId': perawatanRecordId,
      'materialCategory': materialCategory,
      'materialName': materialName,
      'quantity': quantity,
      'unit': unit,
      'unitPrice': unitPrice,
    };
  }

  Map<String, dynamic> toUpdateInput(String id) {
    return <String, dynamic>{
      'id': id,
      ...toCreateInput(),
    };
  }
}

class PerawatanRecordDraft {
  final String blockId;
  final String jenisPerawatan;
  final DateTime tanggalPerawatan;
  final String pekerjaId;
  final double luasArea;
  final String? pupukDigunakan;
  final String? herbisidaDigunakan;
  final String? catatan;

  const PerawatanRecordDraft({
    required this.blockId,
    required this.jenisPerawatan,
    required this.tanggalPerawatan,
    required this.pekerjaId,
    required this.luasArea,
    this.pupukDigunakan,
    this.herbisidaDigunakan,
    this.catatan,
  });

  Map<String, dynamic> toCreateInput() {
    return <String, dynamic>{
      'blockId': blockId.trim(),
      'jenisPerawatan': jenisPerawatan.trim(),
      'tanggalPerawatan': tanggalPerawatan.toUtc().toIso8601String(),
      'pekerjaId': pekerjaId.trim(),
      'luasArea': luasArea,
      'pupukDigunakan': _trimOrNull(pupukDigunakan),
      'herbisidaDigunakan': _trimOrNull(herbisidaDigunakan),
      'catatan': _trimOrNull(catatan),
    };
  }
}

class PerawatanRecordUpdateDraft {
  final String jenisPerawatan;
  final DateTime tanggalPerawatan;
  final double luasArea;
  final String? pupukDigunakan;
  final String? herbisidaDigunakan;
  final String? catatan;
  final String? status;

  const PerawatanRecordUpdateDraft({
    required this.jenisPerawatan,
    required this.tanggalPerawatan,
    required this.luasArea,
    this.pupukDigunakan,
    this.herbisidaDigunakan,
    this.catatan,
    this.status,
  });

  Map<String, dynamic> toUpdateInput(String id) {
    return <String, dynamic>{
      'id': id.trim(),
      'jenisPerawatan': jenisPerawatan.trim(),
      'tanggalPerawatan': tanggalPerawatan.toUtc().toIso8601String(),
      'luasArea': luasArea,
      'pupukDigunakan': _trimOrNull(pupukDigunakan),
      'herbisidaDigunakan': _trimOrNull(herbisidaDigunakan),
      'catatan': _trimOrNull(catatan),
      'status': _trimOrNull(status),
    };
  }
}

class PerawatanDashboardSnapshot {
  final List<PerawatanRecordSummary> records;
  final List<PerawatanMaterialUsageSummary> materialUsages;

  const PerawatanDashboardSnapshot({
    required this.records,
    required this.materialUsages,
  });

  int get totalRecords => records.length;

  int get activeRecords => records
      .where(
        (record) =>
            record.status != 'COMPLETED' && record.status != 'CANCELLED',
      )
      .length;

  double get totalArea => records.fold<double>(
        0,
        (sum, record) => sum + record.luasArea,
      );

  double get totalMaterialCost => materialUsages.fold<double>(
        0,
        (sum, usage) => sum + usage.totalCost,
      );
}

class PerawatanService {
  final GraphQLClientService _graphqlClient;

  PerawatanService({required GraphQLClientService graphqlClient})
      : _graphqlClient = graphqlClient;

  Future<PerawatanDashboardSnapshot> getDashboardSnapshot() async {
    final recordsFuture = _graphqlClient.query(
      PerawatanQueries.queryOptions(
        document: PerawatanQueries.getPerawatanRecordsQuery,
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    final usageFuture = _graphqlClient.query(
      PerawatanQueries.queryOptions(
        document: PerawatanQueries.getPerawatanMaterialUsageRecordsQuery,
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    final recordsResult = await recordsFuture;

    if (recordsResult.hasException) {
      throw Exception(_exceptionMessage(recordsResult.exception));
    }

    final usageResult = await usageFuture;

    if (usageResult.hasException) {
      throw Exception(_exceptionMessage(usageResult.exception));
    }

    final records = _parseRecordList(recordsResult.data?['perawatanRecords']);
    final materialUsages = _parseMaterialUsageList(
      usageResult.data?['perawatanMaterialUsageRecords'],
    );

    return PerawatanDashboardSnapshot(
      records: records,
      materialUsages: materialUsages,
    );
  }

  Future<List<PerawatanMaterialUsageSummary>> getMaterialUsageByRecord(
    String perawatanRecordId,
  ) async {
    final result = await _graphqlClient.query(
      PerawatanQueries.queryOptions(
        document: PerawatanQueries.getPerawatanMaterialUsageByRecordQuery,
        variables: <String, dynamic>{'perawatanRecordId': perawatanRecordId},
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    return _parseMaterialUsageList(
      result.data?['perawatanMaterialUsageRecordsByRecord'],
    );
  }

  Future<PerawatanRecordSummary> createPerawatanRecord(
    PerawatanRecordDraft draft,
  ) async {
    final blockId = draft.blockId.trim();
    final pekerjaId = draft.pekerjaId.trim();
    if (blockId.isEmpty) {
      throw Exception('blockId wajib diisi');
    }
    if (pekerjaId.isEmpty) {
      throw Exception('pekerjaId wajib diisi');
    }
    if (draft.luasArea <= 0) {
      throw Exception('luasArea harus lebih dari 0');
    }

    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.createPerawatanRecordMutation,
        variables: <String, dynamic>{'input': draft.toCreateInput()},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    return _parseRecord(result.data?['createPerawatanRecord']);
  }

  Future<PerawatanMaterialUsageSummary> createMaterialUsage(
    PerawatanMaterialUsageDraft draft,
  ) async {
    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.createPerawatanMaterialUsageMutation,
        variables: <String, dynamic>{'input': draft.toCreateInput()},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    return _parseMaterialUsage(
      result.data?['createPerawatanMaterialUsage'],
    );
  }

  Future<PerawatanRecordSummary> updatePerawatanRecord(
    String id,
    PerawatanRecordUpdateDraft draft,
  ) async {
    final normalizedId = id.trim();
    if (normalizedId.isEmpty) {
      throw Exception('id record wajib diisi');
    }
    if (draft.luasArea <= 0) {
      throw Exception('luasArea harus lebih dari 0');
    }

    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.updatePerawatanRecordMutation,
        variables: <String, dynamic>{'input': draft.toUpdateInput(normalizedId)},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    return _parseRecord(result.data?['updatePerawatanRecord']);
  }

  Future<void> deletePerawatanRecord(String id) async {
    final normalizedId = id.trim();
    if (normalizedId.isEmpty) {
      throw Exception('id record wajib diisi');
    }

    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.deletePerawatanRecordMutation,
        variables: <String, dynamic>{'id': normalizedId},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }
  }

  Future<PerawatanMaterialUsageSummary> updateMaterialUsage(
    String id,
    PerawatanMaterialUsageDraft draft,
  ) async {
    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.updatePerawatanMaterialUsageMutation,
        variables: <String, dynamic>{'input': draft.toUpdateInput(id)},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    return _parseMaterialUsage(
      result.data?['updatePerawatanMaterialUsage'],
    );
  }

  Future<void> deleteMaterialUsage(String id) async {
    final result = await _graphqlClient.mutate(
      PerawatanQueries.mutationOptions(
        document: PerawatanQueries.deletePerawatanMaterialUsageMutation,
        variables: <String, dynamic>{'id': id},
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }
  }

  List<PerawatanRecordSummary> _parseRecordList(dynamic rawList) {
    if (rawList is! List) {
      return const <PerawatanRecordSummary>[];
    }

    return rawList
        .whereType<Map>()
        .map((item) => PerawatanRecordSummary.fromJson(
              Map<String, dynamic>.from(item),
            ))
        .toList(growable: false);
  }

  List<PerawatanMaterialUsageSummary> _parseMaterialUsageList(dynamic rawList) {
    if (rawList is! List) {
      return const <PerawatanMaterialUsageSummary>[];
    }

    return rawList
        .whereType<Map>()
        .map(
          (item) => PerawatanMaterialUsageSummary.fromJson(
            Map<String, dynamic>.from(item),
          ),
        )
        .toList(growable: false);
  }

  PerawatanMaterialUsageSummary _parseMaterialUsage(dynamic rawItem) {
    if (rawItem is! Map) {
      throw Exception('Unexpected material usage payload');
    }

    return PerawatanMaterialUsageSummary.fromJson(
      Map<String, dynamic>.from(rawItem),
    );
  }

  PerawatanRecordSummary _parseRecord(dynamic rawItem) {
    if (rawItem is! Map) {
      throw Exception('Unexpected perawatan record payload');
    }

    return PerawatanRecordSummary.fromJson(
      Map<String, dynamic>.from(rawItem),
    );
  }

  String _exceptionMessage(OperationException? exception) {
    if (exception == null) {
      return 'Unknown GraphQL error';
    }

    final graphqlMessage = exception.graphqlErrors
        .map((error) => error.message)
        .join(', ');
    final fallbackMessage = exception.toString();
    final combined = '$graphqlMessage $fallbackMessage'.toLowerCase();

    final missingPerawatanTable =
        combined.contains('42p01') &&
        (combined.contains('perawatan_records') ||
            combined.contains('perawatan_material_usages'));
    if (missingPerawatanTable) {
      return 'Schema perawatan belum tersedia di server database. '
          'Jalankan migrasi backend di apps/golang dengan: '
          '`go run ./cmd/migrate/main.go`, lalu restart server.';
    }

    if (exception.graphqlErrors.isNotEmpty) {
      return graphqlMessage;
    }

    return fallbackMessage;
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) {
    return null;
  }
  if (value is DateTime) {
    return value;
  }
  return DateTime.tryParse(value.toString());
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

String? _trimOrNull(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) {
    return null;
  }
  return trimmed;
}
