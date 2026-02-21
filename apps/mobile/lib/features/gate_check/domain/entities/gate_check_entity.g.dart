// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'gate_check_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

GateCheck _$GateCheckFromJson(Map<String, dynamic> json) => GateCheck(
      id: json['id'] as String,
      truckNumber: json['truckNumber'] as String,
      driverName: json['driverName'] as String,
      driverPhone: json['driverPhone'] as String,
      blockId: json['blockId'] as String,
      blockName: json['blockName'] as String,
      divisionId: json['divisionId'] as String,
      divisionName: json['divisionName'] as String,
      estateId: json['estateId'] as String,
      estateName: json['estateName'] as String,
      doNumber: json['doNumber'] as String,
      estimatedWeight: (json['estimatedWeight'] as num).toDouble(),
      actualWeight: (json['actualWeight'] as num?)?.toDouble(),
      entryTime: DateTime.parse(json['entryTime'] as String),
      exitTime: json['exitTime'] == null
          ? null
          : DateTime.parse(json['exitTime'] as String),
      status: json['status'] as String,
      notes: json['notes'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      qrCode: json['qrCode'] as String?,
      imageUrl: json['imageUrl'] as String?,
      satpamId: json['satpamId'] as String,
      satpamName: json['satpamName'] as String,
      isSynced: json['isSynced'] as bool? ?? false,
      syncErrorMessage: json['syncErrorMessage'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$GateCheckToJson(GateCheck instance) => <String, dynamic>{
      'id': instance.id,
      'truckNumber': instance.truckNumber,
      'driverName': instance.driverName,
      'driverPhone': instance.driverPhone,
      'blockId': instance.blockId,
      'blockName': instance.blockName,
      'divisionId': instance.divisionId,
      'divisionName': instance.divisionName,
      'estateId': instance.estateId,
      'estateName': instance.estateName,
      'doNumber': instance.doNumber,
      'estimatedWeight': instance.estimatedWeight,
      'actualWeight': instance.actualWeight,
      'entryTime': instance.entryTime.toIso8601String(),
      'exitTime': instance.exitTime?.toIso8601String(),
      'status': instance.status,
      'notes': instance.notes,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'qrCode': instance.qrCode,
      'imageUrl': instance.imageUrl,
      'satpamId': instance.satpamId,
      'satpamName': instance.satpamName,
      'isSynced': instance.isSynced,
      'syncErrorMessage': instance.syncErrorMessage,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };

Truck _$TruckFromJson(Map<String, dynamic> json) => Truck(
      id: json['id'] as String,
      number: json['number'] as String,
      type: json['type'] as String,
      capacity: (json['capacity'] as num).toDouble(),
      companyName: json['companyName'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      registeredAt: DateTime.parse(json['registeredAt'] as String),
    );

Map<String, dynamic> _$TruckToJson(Truck instance) => <String, dynamic>{
      'id': instance.id,
      'number': instance.number,
      'type': instance.type,
      'capacity': instance.capacity,
      'companyName': instance.companyName,
      'isActive': instance.isActive,
      'registeredAt': instance.registeredAt.toIso8601String(),
    };

Driver _$DriverFromJson(Map<String, dynamic> json) => Driver(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      licenseNumber: json['licenseNumber'] as String,
      companyName: json['companyName'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      registeredAt: DateTime.parse(json['registeredAt'] as String),
    );

Map<String, dynamic> _$DriverToJson(Driver instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'phone': instance.phone,
      'licenseNumber': instance.licenseNumber,
      'companyName': instance.companyName,
      'isActive': instance.isActive,
      'registeredAt': instance.registeredAt.toIso8601String(),
    };
