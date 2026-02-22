import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';

part 'gate_check_models.g.dart';

/// Gate Check Direction Enum
enum GateCheckDirection {
  entry('ENTRY'),
  exit('EXIT');

  const GateCheckDirection(this.value);
  final String value;

  @override
  String toString() => value;

  static GateCheckDirection fromString(String value) {
    switch (value.toUpperCase()) {
      case 'ENTRY':
        return GateCheckDirection.entry;
      case 'EXIT':
        return GateCheckDirection.exit;
      default:
        throw ArgumentError('Invalid GateCheckDirection: $value');
    }
  }
}

/// Enhanced Guest Log Model for Gate Check System
@JsonSerializable()
class GuestLog {
  final int? logId;
  final String guestId;
  final String name;
  final String vehiclePlate;
  final String cargoType;
  final int? cargoQty;
  final String? unit;
  final String gateId;
  final String action; // 'entry', 'exit'
  final DateTime timestamp;
  final String? qrToken;
  final String status; // 'valid', 'invalid'
  final String? vehicleType;
  final String? vehicleCharacteristics;
  final String? destination;
  final String? cargoOwner;
  final String? notes;
  final double? estimatedWeight;
  final double? actualWeight;
  final String? doNumber;
  final String? coordinates;
  final String? deviceId;
  final int? clientTimestamp;
  final String? createdBy;
  final String syncStatus; // 'PENDING', 'SYNCED', 'FAILED'
  final int version;
  
  // New server fields
  final String? secondCargo;
  final String? idCardNumber;
  final double? latitude;
  final double? longitude;
  final String? cargoVolume;
  final String? serverRecordId;
  final String? registrationSource; // 'MANUAL' or 'QR_SCAN'

  // Backward compatibility fields used by legacy UI.
  String? get photoIn => null;
  String? get photoOut => null;

  const GuestLog({
    this.logId,
    required this.guestId,
    required this.name,
    required this.vehiclePlate,
    required this.cargoType,
    this.cargoQty,
    this.unit,
    required this.gateId,
    required this.action,
    required this.timestamp,
    this.qrToken,
    required this.status,
    this.vehicleType,
    this.vehicleCharacteristics,
    this.destination,
    this.cargoOwner,
    this.notes,
    this.estimatedWeight,
    this.actualWeight,
    this.doNumber,
    this.coordinates,
    this.deviceId,
    this.clientTimestamp,
    this.createdBy,
    this.syncStatus = 'PENDING',
    this.version = 1,
    this.secondCargo,
    this.idCardNumber,
    this.latitude,
    this.longitude,
    this.cargoVolume,
    this.serverRecordId,
    this.registrationSource,
  });

  factory GuestLog.fromJson(Map<String, dynamic> json) => _$GuestLogFromJson(json);
  Map<String, dynamic> toJson() => _$GuestLogToJson(this);

  factory GuestLog.fromDatabase(Map<String, dynamic> map) {
    return GuestLog(
      logId: map['id'] as int?,
      guestId: map['guest_id'] as String,
      name: map['driver_name'] as String,
      vehiclePlate: map['vehicle_plate'] as String,
      cargoType: map['load_type'] as String? ?? 'GUEST',
      cargoQty: map['cargo_volume'] != null ? int.tryParse(map['cargo_volume'].toString()) : null,
      unit: null,
      gateId: map['gate_position'] as String,
      action: map['generation_intent']?.toString().toLowerCase() ?? 'entry',
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int? ?? DateTime.now().millisecondsSinceEpoch),
      qrToken: map['qr_code_data'] as String?,
      status: 'valid',
      vehicleType: map['vehicle_type'] as String?,
      vehicleCharacteristics: null,
      destination: map['destination'] as String?,
      cargoOwner: map['cargo_owner'] as String? ?? map['guest_company'] as String?,
      notes: map['notes'] as String?,
      estimatedWeight: map['estimated_weight'] != null ? (map['estimated_weight'] as num).toDouble() : null,
      actualWeight: map['actual_weight'] != null ? (map['actual_weight'] as num).toDouble() : null,
      doNumber: map['delivery_order_number'] as String?,
      coordinates: null,
      deviceId: map['device_id'] as String?,
      clientTimestamp: map['created_at'] as int?,
      createdBy: map['created_by'] as String?,
      syncStatus: map['sync_status'] as String? ?? 'PENDING',
      version: 1,
      secondCargo: map['second_cargo'] as String?,
      idCardNumber: map['id_card_number'] as String?,
      latitude: map['latitude'] != null ? (map['latitude'] as num).toDouble() : null,
      longitude: map['longitude'] != null ? (map['longitude'] as num).toDouble() : null,
      cargoVolume: map['cargo_volume'] as String?,
      serverRecordId: map['server_record_id'] as String?,
      registrationSource: map['registration_source'] as String?,
    );
  }

  Map<String, dynamic> toDatabase() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return {
      'guest_id': guestId,
      'driver_name': name,
      'contact_person': null,
      'destination': destination,
      'gate_position': gateId,
      'created_by': createdBy,
      'generation_intent': action.toUpperCase() == 'EXIT' ? 'EXIT' : 'ENTRY',
      'entry_time': action.toUpperCase() != 'EXIT' ? (clientTimestamp ?? now) : null,
      'exit_time': action.toUpperCase() == 'EXIT' ? (clientTimestamp ?? now) : null,
      'notes': notes,
      'qr_code_data': qrToken,
      'created_at': clientTimestamp ?? now,
      'updated_at': now,
      'synced_at': null,
      'sync_status': syncStatus,
      'cargo_volume': cargoVolume ?? cargoQty?.toString(),
      'cargo_owner': cargoOwner,
      'estimated_weight': estimatedWeight,
      'delivery_order_number': doNumber,
      'load_type': cargoType,
      'second_cargo': secondCargo,
      'id_card_number': idCardNumber,
      'latitude': latitude,
      'longitude': longitude,
      'server_record_id': serverRecordId,
      'device_id': deviceId,
      'registration_source': registrationSource,
    };
  }

  GuestLog copyWith({
    int? logId,
    String? guestId,
    String? name,
    String? vehiclePlate,
    String? cargoType,
    int? cargoQty,
    String? unit,
    String? gateId,
    String? action,
    DateTime? timestamp,
    String? qrToken,
    String? status,
    String? vehicleType,
    String? vehicleCharacteristics,
    String? destination,
    String? cargoOwner,
    String? notes,
    double? estimatedWeight,
    double? actualWeight,
    String? doNumber,
    String? coordinates,
    String? deviceId,
    int? clientTimestamp,
    String? createdBy,
    String? syncStatus,
    int? version,
    String? secondCargo,
    String? idCardNumber,
    double? latitude,
    double? longitude,
    String? cargoVolume,
    String? serverRecordId,
    String? registrationSource,
  }) {
    return GuestLog(
      logId: logId ?? this.logId,
      guestId: guestId ?? this.guestId,
      name: name ?? this.name,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      cargoType: cargoType ?? this.cargoType,
      cargoQty: cargoQty ?? this.cargoQty,
      unit: unit ?? this.unit,
      gateId: gateId ?? this.gateId,
      action: action ?? this.action,
      timestamp: timestamp ?? this.timestamp,
      qrToken: qrToken ?? this.qrToken,
      status: status ?? this.status,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleCharacteristics: vehicleCharacteristics ?? this.vehicleCharacteristics,
      destination: destination ?? this.destination,
      cargoOwner: cargoOwner ?? this.cargoOwner,
      notes: notes ?? this.notes,
      estimatedWeight: estimatedWeight ?? this.estimatedWeight,
      actualWeight: actualWeight ?? this.actualWeight,
      doNumber: doNumber ?? this.doNumber,
      coordinates: coordinates ?? this.coordinates,
      deviceId: deviceId ?? this.deviceId,
      clientTimestamp: clientTimestamp ?? this.clientTimestamp,
      createdBy: createdBy ?? this.createdBy,
      syncStatus: syncStatus ?? this.syncStatus,
      version: version ?? this.version,
      secondCargo: secondCargo ?? this.secondCargo,
      idCardNumber: idCardNumber ?? this.idCardNumber,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      cargoVolume: cargoVolume ?? this.cargoVolume,
      serverRecordId: serverRecordId ?? this.serverRecordId,
      registrationSource: registrationSource ?? this.registrationSource,
    );
  }
}

/// Registered User Model
@JsonSerializable()
class RegisteredUser {
  final String userId;
  final String name;
  final String? department;
  final String? vehiclePlate;
  final String status; // 'active', 'inactive'
  final String? position;
  final String? phone;
  final String? email;
  final DateTime? lastSeen;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String syncStatus;
  final int version;

  const RegisteredUser({
    required this.userId,
    required this.name,
    this.department,
    this.vehiclePlate,
    required this.status,
    this.position,
    this.phone,
    this.email,
    this.lastSeen,
    required this.createdAt,
    required this.updatedAt,
    this.syncStatus = 'PENDING',
    this.version = 1,
  });

  factory RegisteredUser.fromJson(Map<String, dynamic> json) => _$RegisteredUserFromJson(json);
  Map<String, dynamic> toJson() => _$RegisteredUserToJson(this);

  factory RegisteredUser.fromDatabase(Map<String, dynamic> map) {
    return RegisteredUser(
      userId: map['user_id'] as String,
      name: map['name'] as String,
      department: map['department'] as String?,
      vehiclePlate: map['vehicle_plate'] as String?,
      status: map['status'] as String,
      position: map['position'] as String?,
      phone: map['phone'] as String?,
      email: map['email'] as String?,
      lastSeen: map['last_seen'] != null ? DateTime.fromMillisecondsSinceEpoch(map['last_seen']) : null,
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at'] as int),
      syncStatus: map['sync_status'] as String? ?? 'PENDING',
      version: map['version'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toDatabase() {
    return {
      'user_id': userId,
      'name': name,
      'department': department,
      'vehicle_plate': vehiclePlate,
      'status': status,
      'position': position,
      'phone': phone,
      'email': email,
      'last_seen': lastSeen?.millisecondsSinceEpoch,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'sync_status': syncStatus,
      'version': version,
    };
  }
}

/// Access Log Model
@JsonSerializable()
class AccessLog {
  final int? logId;
  final String userType; // 'registered', 'guest'
  final String? userId;
  final String name;
  final String? vehiclePlate;
  final String gateId;
  final String action; // 'entry', 'exit'
  final DateTime timestamp;
  final String status; // 'valid', 'invalid'
  final String? validationNotes;
  final String? coordinates;
  final String? deviceId;
  final String? createdBy;
  final String? username; // Username of logged-in user for audit trails
  final DateTime createdAt;
  final String syncStatus;
  final int version;

  const AccessLog({
    this.logId,
    required this.userType,
    this.userId,
    required this.name,
    this.vehiclePlate,
    required this.gateId,
    required this.action,
    required this.timestamp,
    required this.status,
    this.validationNotes,
    this.coordinates,
    this.deviceId,
    this.createdBy,
    this.username,
    required this.createdAt,
    this.syncStatus = 'PENDING',
    this.version = 1,
  });

  factory AccessLog.fromJson(Map<String, dynamic> json) => _$AccessLogFromJson(json);
  Map<String, dynamic> toJson() => _$AccessLogToJson(this);

  factory AccessLog.fromDatabase(Map<String, dynamic> map) {
    return AccessLog(
      logId: map['log_id'] as int?,
      userType: map['user_type'] as String,
      userId: map['user_id'] as String?,
      name: map['name'] as String,
      vehiclePlate: map['vehicle_plate'] as String?,
      gateId: map['gate_id'] as String,
      action: map['action'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int),
      status: map['status'] as String,
      validationNotes: map['validation_notes'] as String?,
      coordinates: map['coordinates'] as String?,
      deviceId: map['device_id'] as String?,
      createdBy: map['created_by'] as String?,
      username: map['username'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
      syncStatus: map['sync_status'] as String? ?? 'PENDING',
      version: map['version'] as int? ?? 1,
    );
  }

  Map<String, dynamic> toDatabase() {
    return {
      'log_id': logId,
      'user_type': userType,
      'user_id': userId,
      'name': name,
      'vehicle_plate': vehiclePlate,
      'gate_id': gateId,
      'action': action,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'status': status,
      'validation_notes': validationNotes,
      'coordinates': coordinates,
      'device_id': deviceId,
      'created_by': createdBy,
      'username': username,
      'created_at': createdAt.millisecondsSinceEpoch,
      'sync_status': syncStatus,
      'version': version,
    };
  }
}

/// Gate Check Stats Model
@JsonSerializable()
class GateCheckStats {
  final String gateId;
  final DateTime date;
  final int vehiclesInside;
  final int todayEntries;
  final int todayExits;
  final int pendingExit;
  final double averageLoadTime;
  final double complianceRate;
  final double totalWeightIn;
  final double totalWeightOut;
  final int violationCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String syncStatus;

  const GateCheckStats({
    required this.gateId,
    required this.date,
    required this.vehiclesInside,
    required this.todayEntries,
    required this.todayExits,
    required this.pendingExit,
    required this.averageLoadTime,
    required this.complianceRate,
    required this.totalWeightIn,
    required this.totalWeightOut,
    required this.violationCount,
    required this.createdAt,
    required this.updatedAt,
    this.syncStatus = 'PENDING',
  });

  factory GateCheckStats.fromJson(Map<String, dynamic> json) => _$GateCheckStatsFromJson(json);
  Map<String, dynamic> toJson() => _$GateCheckStatsToJson(this);

  factory GateCheckStats.fromDatabase(Map<String, dynamic> map) {
    return GateCheckStats(
      gateId: map['gate_id'] as String,
      date: DateTime.fromMillisecondsSinceEpoch(map['date'] as int),
      vehiclesInside: map['vehicles_inside'] as int,
      todayEntries: map['today_entries'] as int,
      todayExits: map['today_exits'] as int,
      pendingExit: map['pending_exit'] as int,
      averageLoadTime: map['average_load_time'] as double,
      complianceRate: map['compliance_rate'] as double,
      totalWeightIn: map['total_weight_in'] as double,
      totalWeightOut: map['total_weight_out'] as double,
      violationCount: map['violation_count'] as int,
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at'] as int),
      syncStatus: map['sync_status'] as String? ?? 'PENDING',
    );
  }

  Map<String, dynamic> toDatabase() {
    return {
      'gate_id': gateId,
      'date': date.millisecondsSinceEpoch,
      'vehicles_inside': vehiclesInside,
      'today_entries': todayEntries,
      'today_exits': todayExits,
      'pending_exit': pendingExit,
      'average_load_time': averageLoadTime,
      'compliance_rate': complianceRate,
      'total_weight_in': totalWeightIn,
      'total_weight_out': totalWeightOut,
      'violation_count': violationCount,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'sync_status': syncStatus,
    };
  }
}

/// QR Scan Data Model (for JWT-based QR codes)
@JsonSerializable()
class QRScanData {
  final String guestId;
  final String name;
  final String vehiclePlate;
  final String cargoType;
  final int? cargoQty;
  final String? unit;
  final String? vehicleType;
  final String? destination;
  final String? cargoOwner;
  final double? estimatedWeight;
  final String? doNumber;
  final DateTime issuedAt;
  final DateTime expiresAt;
  final String issuer;
  final String? notes;

  const QRScanData({
    required this.guestId,
    required this.name,
    required this.vehiclePlate,
    required this.cargoType,
    this.cargoQty,
    this.unit,
    this.vehicleType,
    this.destination,
    this.cargoOwner,
    this.estimatedWeight,
    this.doNumber,
    required this.issuedAt,
    required this.expiresAt,
    required this.issuer,
    this.notes,
  });

  factory QRScanData.fromJson(Map<String, dynamic> json) => _$QRScanDataFromJson(json);
  Map<String, dynamic> toJson() => _$QRScanDataToJson(this);

  factory QRScanData.fromJWTPayload(Map<String, dynamic> payload) {
    return QRScanData(
      guestId: payload['guest_id'] as String,
      name: payload['name'] as String,
      vehiclePlate: payload['vehicle_plate'] as String,
      cargoType: payload['cargo_type'] as String,
      cargoQty: payload['cargo_qty'] as int?,
      unit: payload['unit'] as String?,
      vehicleType: payload['vehicle_type'] as String?,
      destination: payload['destination'] as String?,
      cargoOwner: payload['cargo_owner'] as String?,
      estimatedWeight: payload['estimated_weight'] as double?,
      doNumber: payload['do_number'] as String?,
      issuedAt: DateTime.fromMillisecondsSinceEpoch(payload['iat'] * 1000),
      expiresAt: DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000),
      issuer: payload['iss'] as String,
      notes: payload['notes'] as String?,
    );
  }

  Map<String, dynamic> toJWTPayload() {
    final now = DateTime.now();
    return {
      'guest_id': guestId,
      'name': name,
      'vehicle_plate': vehiclePlate,
      'cargo_type': cargoType,
      'cargo_qty': cargoQty,
      'unit': unit,
      'vehicle_type': vehicleType,
      'destination': destination,
      'cargo_owner': cargoOwner,
      'estimated_weight': estimatedWeight,
      'do_number': doNumber,
      'iat': now.millisecondsSinceEpoch ~/ 1000,
      'exp': expiresAt.millisecondsSinceEpoch ~/ 1000,
      'iss': issuer,
      'notes': notes,
    };
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isValid => DateTime.now().isBefore(expiresAt) && DateTime.now().isAfter(issuedAt);
}

/// Gate Check Form Data (for UI binding)
class GateCheckFormData {
  String posNumber;
  String driverName;
  String vehiclePlate;
  String vehicleType;
  String? vehicleCharacteristics;
  String destination;
  String loadType;
  String loadVolume; // "Seperempat", "Setengah", "Penuh"
  String loadOwner;
  double? estimatedWeight;
  double? actualWeight;
  String? doNumber;
  String? notes;
  List<String> photos;

  // Tracking untuk regenerate QR (cetak ulang tanpa duplikasi data)
  String? registeredGuestLogId;  // ID dari database setelah generate pertama
  DateTime? registeredAt;        // Waktu registrasi pertama

  GateCheckFormData({
    this.posNumber = '',
    this.driverName = '',
    this.vehiclePlate = '',
    this.vehicleType = '',
    this.vehicleCharacteristics,
    this.destination = '',
    this.loadType = '',
    this.loadVolume = '',
    this.loadOwner = '',
    this.estimatedWeight,
    this.actualWeight,
    this.doNumber,
    this.notes,
    this.photos = const [],
    this.registeredGuestLogId,
    this.registeredAt,
  });

  // Getters for compatibility with dialog usage
  String? get guestName => driverName.isNotEmpty ? driverName : null;
  String? get guestCompany => loadOwner.isNotEmpty ? loadOwner : null;
  String? get purposeOfVisit => destination.isNotEmpty ? destination : null;

  /// Cek apakah data ini sudah pernah di-register (untuk regenerate QR)
  bool get isRegistered => registeredGuestLogId != null && registeredGuestLogId!.isNotEmpty;

  bool get isValid {
    final baseFieldsValid = posNumber.isNotEmpty &&
        driverName.isNotEmpty &&
        vehiclePlate.isNotEmpty &&
        vehicleType.isNotEmpty &&
        destination.isNotEmpty &&
        loadType.isNotEmpty &&
        loadOwner.isNotEmpty;

    // Special validation for "Kosong" load type - volume is not required
    final isEmptyLoad = loadType == 'Kosong';
    final volumeValid = isEmptyLoad || loadVolume.isNotEmpty;

    return baseFieldsValid && volumeValid;
  }

  Map<String, dynamic> toMap() {
    return {
      'pos_number': posNumber,
      'driver_name': driverName,
      'vehicle_plate': vehiclePlate,
      'vehicle_type': vehicleType,
      'vehicle_characteristics': vehicleCharacteristics,
      'destination': destination,
      'load_type': loadType,
      'load_volume': loadVolume,
      'load_owner': loadOwner,
      'estimated_weight': estimatedWeight,
      'actual_weight': actualWeight,
      'do_number': doNumber,
      'notes': notes,
      'photos': jsonEncode(photos),
    };
  }

  void clear() {
    // Keep posNumber intact when clearing form - it should come from POS settings
    driverName = '';
    vehiclePlate = '';
    vehicleType = '';
    vehicleCharacteristics = null;
    destination = '';
    loadType = '';
    loadVolume = '';
    loadOwner = '';
    estimatedWeight = null;
    actualWeight = null;
    doNumber = null;
    notes = null;
    photos = [];
    // Reset registration tracking untuk regenerate QR
    registeredGuestLogId = null;
    registeredAt = null;
  }

  /// Set posNumber from POS settings
  void setPosNumber(String pos) {
    posNumber = pos;
  }
}

/// Constants for Gate Check System
class GateCheckConstants {
  // Actions
  static const String actionEntry = 'entry';
  static const String actionExit = 'exit';

  // Status
  static const String statusValid = 'valid';
  static const String statusInvalid = 'invalid';
  static const String statusPending = 'pending';
  static const String statusApproved = 'approved';
  static const String statusRejected = 'rejected';

  // User Types
  static const String userTypeRegistered = 'registered';
  static const String userTypeGuest = 'guest';

  // Sync Status
  static const String syncPending = 'PENDING';
  static const String syncSynced = 'SYNCED';
  static const String syncFailed = 'FAILED';
  static const String syncConflict = 'CONFLICT';

  // Vehicle Types (Indonesian)
  static const List<String> vehicleTypes = [
    'Truk',
    'Mobil',
    'PickUp',
    'Van',
    'Motor',
    'Bus',
    'Lainnya',
  ];

  // Load Types (Indonesian)
  static const List<String> loadTypes = [
    'Kelapa Sawit',
    'Kosong',
    'Muatan Umum',
  ];
  
  // Volume Options (Indonesian)
  static const List<String> volumeOptions = [
    'Seperempat',
    'Setengah',
    'Penuh',
  ];
}
