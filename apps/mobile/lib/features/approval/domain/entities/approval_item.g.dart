// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'approval_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ApprovalItem _$ApprovalItemFromJson(Map<String, dynamic> json) => ApprovalItem(
  id: json['id'] as String,
  mandorName: json['mandorName'] as String,
  mandorId: json['mandorId'] as String,
  blockName: json['blockName'] as String,
  blockId: json['blockId'] as String,
  divisionName: json['divisionName'] as String,
  divisionId: json['divisionId'] as String,
  harvestDate: DateTime.parse(json['harvestDate'] as String),
  employeeCount: (json['employeeCount'] as num).toInt(),
  employees: json['employees'] as String? ?? '',
  tbsCount: (json['tbsCount'] as num).toInt(),
  weight: (json['weight'] as num).toDouble(),
  submittedAt: DateTime.parse(json['submittedAt'] as String),
  elapsedTime: json['elapsedTime'] as String,
  status: json['status'] as String,
  hasPhoto: json['hasPhoto'] as bool? ?? false,
  photoUrls: (json['photoUrls'] as List<dynamic>?)
      ?.map((e) => e as String)
      .toList(),
  latitude: (json['latitude'] as num?)?.toDouble(),
  longitude: (json['longitude'] as num?)?.toDouble(),
  notes: json['notes'] as String?,
  priority: json['priority'] as String? ?? 'NORMAL',
  jjgMatang: (json['jjgMatang'] as num?)?.toInt() ?? 0,
  jjgMentah: (json['jjgMentah'] as num?)?.toInt() ?? 0,
  jjgLewatMatang: (json['jjgLewatMatang'] as num?)?.toInt() ?? 0,
  jjgBusukAbnormal: (json['jjgBusukAbnormal'] as num?)?.toInt() ?? 0,
  jjgTangkaiPanjang: (json['jjgTangkaiPanjang'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ApprovalItemToJson(ApprovalItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'mandorName': instance.mandorName,
      'mandorId': instance.mandorId,
      'blockName': instance.blockName,
      'blockId': instance.blockId,
      'divisionName': instance.divisionName,
      'divisionId': instance.divisionId,
      'harvestDate': instance.harvestDate.toIso8601String(),
      'employeeCount': instance.employeeCount,
      'employees': instance.employees,
      'tbsCount': instance.tbsCount,
      'weight': instance.weight,
      'submittedAt': instance.submittedAt.toIso8601String(),
      'elapsedTime': instance.elapsedTime,
      'status': instance.status,
      'hasPhoto': instance.hasPhoto,
      'photoUrls': instance.photoUrls,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'notes': instance.notes,
      'priority': instance.priority,
      'jjgMatang': instance.jjgMatang,
      'jjgMentah': instance.jjgMentah,
      'jjgLewatMatang': instance.jjgLewatMatang,
      'jjgBusukAbnormal': instance.jjgBusukAbnormal,
      'jjgTangkaiPanjang': instance.jjgTangkaiPanjang,
    };

ApprovalStats _$ApprovalStatsFromJson(Map<String, dynamic> json) =>
    ApprovalStats(
      pendingCount: (json['pendingCount'] as num).toInt(),
      approvedCount: (json['approvedCount'] as num).toInt(),
      rejectedCount: (json['rejectedCount'] as num).toInt(),
    );

Map<String, dynamic> _$ApprovalStatsToJson(ApprovalStats instance) =>
    <String, dynamic>{
      'pendingCount': instance.pendingCount,
      'approvedCount': instance.approvedCount,
      'rejectedCount': instance.rejectedCount,
    };
