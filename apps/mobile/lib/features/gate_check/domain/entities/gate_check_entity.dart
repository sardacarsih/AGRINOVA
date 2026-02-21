import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'gate_check_entity.g.dart';

@JsonSerializable()
class GateCheck extends Equatable {
  final String id;
  final String truckNumber;
  final String driverName;
  final String driverPhone;
  final String blockId;
  final String blockName;
  final String divisionId;
  final String divisionName;
  final String estateId;
  final String estateName;
  final String doNumber; // Delivery Order Number
  final double estimatedWeight;
  final double? actualWeight;
  final DateTime entryTime;
  final DateTime? exitTime;
  final String status; // IN, OUT, PENDING_WEIGHING
  final String? notes;
  final double? latitude;
  final double? longitude;
  final String? qrCode;
  final String? imageUrl;
  final String satpamId;
  final String satpamName;
  final bool isSynced;
  final String? syncErrorMessage;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const GateCheck({
    required this.id,
    required this.truckNumber,
    required this.driverName,
    required this.driverPhone,
    required this.blockId,
    required this.blockName,
    required this.divisionId,
    required this.divisionName,
    required this.estateId,
    required this.estateName,
    required this.doNumber,
    required this.estimatedWeight,
    this.actualWeight,
    required this.entryTime,
    this.exitTime,
    required this.status,
    this.notes,
    this.latitude,
    this.longitude,
    this.qrCode,
    this.imageUrl,
    required this.satpamId,
    required this.satpamName,
    this.isSynced = false,
    this.syncErrorMessage,
    required this.createdAt,
    this.updatedAt,
  });

  factory GateCheck.fromJson(Map<String, dynamic> json) =>
      _$GateCheckFromJson(json);

  Map<String, dynamic> toJson() => _$GateCheckToJson(this);

  GateCheck copyWith({
    String? id,
    String? truckNumber,
    String? driverName,
    String? driverPhone,
    String? blockId,
    String? blockName,
    String? divisionId,
    String? divisionName,
    String? estateId,
    String? estateName,
    String? doNumber,
    double? estimatedWeight,
    double? actualWeight,
    DateTime? entryTime,
    DateTime? exitTime,
    String? status,
    String? notes,
    double? latitude,
    double? longitude,
    String? qrCode,
    String? imageUrl,
    String? satpamId,
    String? satpamName,
    bool? isSynced,
    String? syncErrorMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GateCheck(
      id: id ?? this.id,
      truckNumber: truckNumber ?? this.truckNumber,
      driverName: driverName ?? this.driverName,
      driverPhone: driverPhone ?? this.driverPhone,
      blockId: blockId ?? this.blockId,
      blockName: blockName ?? this.blockName,
      divisionId: divisionId ?? this.divisionId,
      divisionName: divisionName ?? this.divisionName,
      estateId: estateId ?? this.estateId,
      estateName: estateName ?? this.estateName,
      doNumber: doNumber ?? this.doNumber,
      estimatedWeight: estimatedWeight ?? this.estimatedWeight,
      actualWeight: actualWeight ?? this.actualWeight,
      entryTime: entryTime ?? this.entryTime,
      exitTime: exitTime ?? this.exitTime,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      qrCode: qrCode ?? this.qrCode,
      imageUrl: imageUrl ?? this.imageUrl,
      satpamId: satpamId ?? this.satpamId,
      satpamName: satpamName ?? this.satpamName,
      isSynced: isSynced ?? this.isSynced,
      syncErrorMessage: syncErrorMessage ?? this.syncErrorMessage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        truckNumber,
        driverName,
        driverPhone,
        blockId,
        blockName,
        divisionId,
        divisionName,
        estateId,
        estateName,
        doNumber,
        estimatedWeight,
        actualWeight,
        entryTime,
        exitTime,
        status,
        notes,
        latitude,
        longitude,
        qrCode,
        imageUrl,
        satpamId,
        satpamName,
        isSynced,
        syncErrorMessage,
        createdAt,
        updatedAt,
      ];
}

@JsonSerializable()
class Truck extends Equatable {
  final String id;
  final String number;
  final String type;
  final double capacity;
  final String? companyName;
  final bool isActive;
  final DateTime registeredAt;

  const Truck({
    required this.id,
    required this.number,
    required this.type,
    required this.capacity,
    this.companyName,
    this.isActive = true,
    required this.registeredAt,
  });

  factory Truck.fromJson(Map<String, dynamic> json) => _$TruckFromJson(json);

  Map<String, dynamic> toJson() => _$TruckToJson(this);

  @override
  List<Object?> get props => [
        id,
        number,
        type,
        capacity,
        companyName,
        isActive,
        registeredAt,
      ];
}

@JsonSerializable()
class Driver extends Equatable {
  final String id;
  final String name;
  final String phone;
  final String licenseNumber;
  final String? companyName;
  final bool isActive;
  final DateTime registeredAt;

  const Driver({
    required this.id,
    required this.name,
    required this.phone,
    required this.licenseNumber,
    this.companyName,
    this.isActive = true,
    required this.registeredAt,
  });

  factory Driver.fromJson(Map<String, dynamic> json) => _$DriverFromJson(json);

  Map<String, dynamic> toJson() => _$DriverToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        phone,
        licenseNumber,
        companyName,
        isActive,
        registeredAt,
      ];
}