// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'employee_qr_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EmployeeQRData _$EmployeeQRDataFromJson(Map<String, dynamic> json) =>
    EmployeeQRData(
      type: json['type'] as String,
      version: json['version'] as String,
      iddata: json['IDDATA'] as String? ?? '',
      nik: json['nik'] as String,
      nama: json['nama'] as String,
      departement: json['departement'] as String,
      issuer: json['issuer'] as String,
      timestamp: EmployeeQRData._timestampFromJson(json['timestamp']),
    );

Map<String, dynamic> _$EmployeeQRDataToJson(EmployeeQRData instance) =>
    <String, dynamic>{
      'type': instance.type,
      'version': instance.version,
      'IDDATA': instance.iddata,
      'nik': instance.nik,
      'nama': instance.nama,
      'departement': instance.departement,
      'issuer': instance.issuer,
      'timestamp': EmployeeQRData._timestampToJson(instance.timestamp),
    };

GateEmployee _$GateEmployeeFromJson(Map<String, dynamic> json) => GateEmployee(
      id: (json['id'] as num?)?.toInt(),
      employeeId: json['employeeId'] as String,
      iddata: json['iddata'] as String,
      nik: json['nik'] as String,
      name: json['name'] as String,
      department: json['department'] as String?,
      position: json['position'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      photoPath: json['photoPath'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      syncedAt: json['syncedAt'] == null
          ? null
          : DateTime.parse(json['syncedAt'] as String),
      syncStatus: json['syncStatus'] as String? ?? 'PENDING',
    );

Map<String, dynamic> _$GateEmployeeToJson(GateEmployee instance) =>
    <String, dynamic>{
      'id': instance.id,
      'employeeId': instance.employeeId,
      'iddata': instance.iddata,
      'nik': instance.nik,
      'name': instance.name,
      'department': instance.department,
      'position': instance.position,
      'isActive': instance.isActive,
      'photoPath': instance.photoPath,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'syncedAt': instance.syncedAt?.toIso8601String(),
      'syncStatus': instance.syncStatus,
    };
