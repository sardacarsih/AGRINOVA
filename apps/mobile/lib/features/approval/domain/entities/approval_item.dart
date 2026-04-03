import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'approval_item.g.dart';

@JsonSerializable()
class ApprovalItem extends Equatable {
  final String id;
  final String
  mandorName; // Flattened for easier UI usage or derived from nested object
  final String mandorId;
  final String blockName;
  final String blockId;
  final String divisionName;
  final String divisionId;
  final DateTime harvestDate;
  final int employeeCount;
  final String employees; // Raw employee label from backend record
  final int tbsCount; // "3.2 ton" in UI might be weight, but checking schema
  final double weight;
  final DateTime submittedAt;
  final String elapsedTime; // "2 jam lalu"
  final String status; // PENDING, APPROVED, REJECTED
  final bool hasPhoto;
  final List<String>? photoUrls;
  final double? latitude;
  final double? longitude;
  final String? notes;
  final String priority; // NORMAL, HIGH, URGENT
  final int jjgMatang;
  final int jjgMentah;
  final int jjgLewatMatang;
  final int jjgBusukAbnormal;
  final int jjgTangkaiPanjang;

  const ApprovalItem({
    required this.id,
    required this.mandorName,
    required this.mandorId,
    required this.blockName,
    required this.blockId,
    required this.divisionName,
    required this.divisionId,
    required this.harvestDate,
    required this.employeeCount,
    this.employees = '',
    required this.tbsCount,
    required this.weight,
    required this.submittedAt,
    required this.elapsedTime,
    required this.status,
    this.hasPhoto = false,
    this.photoUrls,
    this.latitude,
    this.longitude,
    this.notes,
    this.priority = 'NORMAL',
    this.jjgMatang = 0,
    this.jjgMentah = 0,
    this.jjgLewatMatang = 0,
    this.jjgBusukAbnormal = 0,
    this.jjgTangkaiPanjang = 0,
  });

  factory ApprovalItem.fromJson(Map<String, dynamic> json) =>
      _$ApprovalItemFromJson(json);

  Map<String, dynamic> toJson() => _$ApprovalItemToJson(this);

  int get qualityTotal =>
      jjgMatang +
      jjgMentah +
      jjgLewatMatang +
      jjgBusukAbnormal +
      jjgTangkaiPanjang;

  bool get hasQualityData => qualityTotal > 0;

  ApprovalItem copyWith({
    int? jjgMatang,
    int? jjgMentah,
    int? jjgLewatMatang,
    int? jjgBusukAbnormal,
    int? jjgTangkaiPanjang,
  }) {
    return ApprovalItem(
      id: id,
      mandorName: mandorName,
      mandorId: mandorId,
      blockName: blockName,
      blockId: blockId,
      divisionName: divisionName,
      divisionId: divisionId,
      harvestDate: harvestDate,
      employeeCount: employeeCount,
      employees: employees,
      tbsCount: tbsCount,
      weight: weight,
      submittedAt: submittedAt,
      elapsedTime: elapsedTime,
      status: status,
      hasPhoto: hasPhoto,
      photoUrls: photoUrls,
      latitude: latitude,
      longitude: longitude,
      notes: notes,
      priority: priority,
      jjgMatang: jjgMatang ?? this.jjgMatang,
      jjgMentah: jjgMentah ?? this.jjgMentah,
      jjgLewatMatang: jjgLewatMatang ?? this.jjgLewatMatang,
      jjgBusukAbnormal: jjgBusukAbnormal ?? this.jjgBusukAbnormal,
      jjgTangkaiPanjang: jjgTangkaiPanjang ?? this.jjgTangkaiPanjang,
    );
  }

  @override
  List<Object?> get props => [
    id,
    mandorName,
    blockName,
    divisionName,
    harvestDate,
    employees,
    status,
    submittedAt,
    jjgMatang,
    jjgMentah,
    jjgLewatMatang,
    jjgBusukAbnormal,
    jjgTangkaiPanjang,
  ];
}

@JsonSerializable()
class ApprovalStats extends Equatable {
  final int pendingCount;
  final int approvedCount;
  final int rejectedCount;

  const ApprovalStats({
    required this.pendingCount,
    required this.approvedCount,
    required this.rejectedCount,
  });

  factory ApprovalStats.fromJson(Map<String, dynamic> json) =>
      _$ApprovalStatsFromJson(json);

  Map<String, dynamic> toJson() => _$ApprovalStatsToJson(this);

  @override
  List<Object?> get props => [pendingCount, approvedCount, rejectedCount];
}

class BatchApprovalResult {
  final bool success;
  final int totalProcessed;
  final int successCount;
  final int failedCount;
  final List<BatchItemResult> results;
  final String message;

  const BatchApprovalResult({
    required this.success,
    required this.totalProcessed,
    required this.successCount,
    required this.failedCount,
    required this.results,
    required this.message,
  });

  factory BatchApprovalResult.fromJson(Map<String, dynamic> json) {
    return BatchApprovalResult(
      success: json['success'] ?? false,
      totalProcessed: json['totalProcessed'] ?? 0,
      successCount: json['successCount'] ?? 0,
      failedCount: json['failedCount'] ?? 0,
      results: (json['results'] as List?)
              ?.map((e) => BatchItemResult.fromJson(e))
              .toList() ??
          [],
      message: json['message'] ?? '',
    );
  }
}

class BatchItemResult {
  final String id;
  final bool success;
  final String? error;

  const BatchItemResult({
    required this.id,
    required this.success,
    this.error,
  });

  factory BatchItemResult.fromJson(Map<String, dynamic> json) {
    return BatchItemResult(
      id: json['id'] ?? '',
      success: json['success'] ?? false,
      error: json['error'],
    );
  }
}
