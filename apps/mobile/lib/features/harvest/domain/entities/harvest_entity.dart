import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'harvest_entity.g.dart';

@JsonSerializable()
class Harvest extends Equatable {
  final String id;
  final String employeeId;
  final String employeeName;
  final String? employeeNik;
  final String? employeeDivisionId;
  final String? employeeDivisionName;
  final String blockId;
  final String blockName;
  final String? blockCode;
  final String divisionId;
  final String divisionName;
  final String? divisionCode;
  final String estateId;
  final String estateName;
  final double tbsQuantity;
  final int jumlahJanjang;
  final int jjgMatang;
  final int jjgMentah;
  final int jjgLewatMatang;
  final int jjgBusukAbnormal;
  final int jjgTangkaiPanjang;
  final double tbsQuality;
  final String qualityGrade;
  final DateTime harvestDate;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String status; // PENDING, APPROVED, REJECTED
  final String? approvedBy;
  final String? approvedAt;
  final String? rejectionReason;
  final String? notes;
  final double? latitude;
  final double? longitude;
  final String? imageUrl;
  final String mandorId;
  final String mandorName;
  final bool isSynced;
  final String? syncErrorMessage;
  final String? companyId;
  final String? managerId;
  final String? asistenId;
  final String? mandorScope;

  const Harvest({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    this.employeeNik,
    this.employeeDivisionId,
    this.employeeDivisionName,
    required this.blockId,
    required this.blockName,
    this.blockCode,
    required this.divisionId,
    required this.divisionName,
    this.divisionCode,
    required this.estateId,
    required this.estateName,
    required this.tbsQuantity,
    this.jumlahJanjang = 0,
    this.jjgMatang = 0,
    this.jjgMentah = 0,
    this.jjgLewatMatang = 0,
    this.jjgBusukAbnormal = 0,
    this.jjgTangkaiPanjang = 0,
    required this.tbsQuality,
    required this.qualityGrade,
    required this.harvestDate,
    required this.createdAt,
    this.updatedAt,
    required this.status,
    this.approvedBy,
    this.approvedAt,
    this.rejectionReason,
    this.notes,
    this.latitude,
    this.longitude,
    this.imageUrl,
    required this.mandorId,
    required this.mandorName,
    this.isSynced = false,
    this.syncErrorMessage,
    this.companyId,
    this.managerId,
    this.asistenId,
    this.mandorScope,
  });

  factory Harvest.fromJson(Map<String, dynamic> json) =>
      _$HarvestFromJson(json);

  Map<String, dynamic> toJson() => _$HarvestToJson(this);

  Harvest copyWith({
    String? id,
    String? employeeId,
    String? employeeName,
    String? employeeNik,
    String? employeeDivisionId,
    String? employeeDivisionName,
    String? blockId,
    String? blockName,
    String? blockCode,
    String? divisionId,
    String? divisionName,
    String? divisionCode,
    String? estateId,
    String? estateName,
    double? tbsQuantity,
    int? jumlahJanjang,
    int? jjgMatang,
    int? jjgMentah,
    int? jjgLewatMatang,
    int? jjgBusukAbnormal,
    int? jjgTangkaiPanjang,
    double? tbsQuality,
    String? qualityGrade,
    DateTime? harvestDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? status,
    String? approvedBy,
    String? approvedAt,
    String? rejectionReason,
    String? notes,
    double? latitude,
    double? longitude,
    String? imageUrl,
    String? mandorId,
    String? mandorName,
    bool? isSynced,
    String? syncErrorMessage,
    String? companyId,
    String? managerId,
    String? asistenId,
    String? mandorScope,
  }) {
    return Harvest(
      id: id ?? this.id,
      employeeId: employeeId ?? this.employeeId,
      employeeName: employeeName ?? this.employeeName,
      employeeNik: employeeNik ?? this.employeeNik,
      employeeDivisionId: employeeDivisionId ?? this.employeeDivisionId,
      employeeDivisionName: employeeDivisionName ?? this.employeeDivisionName,
      blockId: blockId ?? this.blockId,
      blockName: blockName ?? this.blockName,
      blockCode: blockCode ?? this.blockCode,
      divisionId: divisionId ?? this.divisionId,
      divisionName: divisionName ?? this.divisionName,
      divisionCode: divisionCode ?? this.divisionCode,
      estateId: estateId ?? this.estateId,
      estateName: estateName ?? this.estateName,
      tbsQuantity: tbsQuantity ?? this.tbsQuantity,
      jumlahJanjang: jumlahJanjang ?? this.jumlahJanjang,
      jjgMatang: jjgMatang ?? this.jjgMatang,
      jjgMentah: jjgMentah ?? this.jjgMentah,
      jjgLewatMatang: jjgLewatMatang ?? this.jjgLewatMatang,
      jjgBusukAbnormal: jjgBusukAbnormal ?? this.jjgBusukAbnormal,
      jjgTangkaiPanjang: jjgTangkaiPanjang ?? this.jjgTangkaiPanjang,
      tbsQuality: tbsQuality ?? this.tbsQuality,
      qualityGrade: qualityGrade ?? this.qualityGrade,
      harvestDate: harvestDate ?? this.harvestDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      status: status ?? this.status,
      approvedBy: approvedBy ?? this.approvedBy,
      approvedAt: approvedAt ?? this.approvedAt,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      notes: notes ?? this.notes,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      imageUrl: imageUrl ?? this.imageUrl,
      mandorId: mandorId ?? this.mandorId,
      mandorName: mandorName ?? this.mandorName,
      isSynced: isSynced ?? this.isSynced,
      syncErrorMessage: syncErrorMessage ?? this.syncErrorMessage,
      companyId: companyId ?? this.companyId,
      managerId: managerId ?? this.managerId,
      asistenId: asistenId ?? this.asistenId,
      mandorScope: mandorScope ?? this.mandorScope,
    );
  }

  @override
  List<Object?> get props => [
        id,
        employeeId,
        employeeName,
        employeeNik,
        employeeDivisionId,
        employeeDivisionName,
        blockId,
        blockName,
        blockCode,
        divisionId,
        divisionName,
        divisionCode,
        estateId,
        estateName,
        tbsQuantity,
        jumlahJanjang,
        jjgMatang,
        jjgMentah,
        jjgLewatMatang,
        jjgBusukAbnormal,
        jjgTangkaiPanjang,
        tbsQuality,
        qualityGrade,
        harvestDate,
        createdAt,
        updatedAt,
        status,
        approvedBy,
        approvedAt,
        rejectionReason,
        notes,
        latitude,
        longitude,
        imageUrl,
        mandorId,
        mandorName,
        isSynced,
        syncErrorMessage,
        companyId,
        managerId,
        asistenId,
        mandorScope,
      ];
}

@JsonSerializable()
class Employee extends Equatable {
  final String id;
  final String name;
  final String code;
  final String divisionId;
  final String divisionName;
  final String role;
  final bool isActive;
  final DateTime createdAt;

  const Employee({
    required this.id,
    required this.name,
    required this.code,
    required this.divisionId,
    required this.divisionName,
    required this.role,
    this.isActive = true,
    required this.createdAt,
  });

  factory Employee.fromJson(Map<String, dynamic> json) =>
      _$EmployeeFromJson(json);

  Map<String, dynamic> toJson() => _$EmployeeToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        code,
        divisionId,
        divisionName,
        role,
        isActive,
        createdAt,
      ];
}

@JsonSerializable()
class Block extends Equatable {
  final String id;
  final String name;
  final String code;
  final String divisionId;
  final String divisionName;
  final String? divisionCode;
  final String estateId;
  final String estateName;
  final double area;
  final int plantYear;
  final String varietyType;
  final bool isActive;

  const Block({
    required this.id,
    required this.name,
    required this.code,
    required this.divisionId,
    required this.divisionName,
    this.divisionCode,
    required this.estateId,
    required this.estateName,
    required this.area,
    required this.plantYear,
    required this.varietyType,
    this.isActive = true,
  });

  factory Block.fromJson(Map<String, dynamic> json) => _$BlockFromJson(json);

  Map<String, dynamic> toJson() => _$BlockToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        code,
        divisionId,
        divisionName,
        divisionCode,
        estateId,
        estateName,
        area,
        plantYear,
        varietyType,
        isActive,
      ];
}
