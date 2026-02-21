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
  });

  factory ApprovalItem.fromJson(Map<String, dynamic> json) =>
      _$ApprovalItemFromJson(json);

  Map<String, dynamic> toJson() => _$ApprovalItemToJson(this);

  @override
  List<Object?> get props => [
        id,
        mandorName,
        blockName,
        divisionName,
        harvestDate,
        employees,
        status,
        submittedAt
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
