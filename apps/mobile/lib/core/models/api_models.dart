/// API Models for Agrinova Mobile Gate Check System
/// 
/// This file contains all the data models used for API communication
/// between the Flutter mobile app and the NestJS backend.
library;

// Export commonly used models
export 'jwt_models.dart';

/// Base API Response wrapper
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final String? error;
  final int? statusCode;
  final Map<String, dynamic>? metadata;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.error,
    this.statusCode,
    this.metadata,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>)? fromJson) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      data: json['data'] != null && fromJson != null ? fromJson(json['data']) : json['data'],
      message: json['message'],
      error: json['error'],
      statusCode: json['statusCode'],
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data,
      'message': message,
      'error': error,
      'statusCode': statusCode,
      'metadata': metadata,
    };
  }
}

/// Paginated API Response
class PaginatedApiResponse<T> extends ApiResponse<List<T>> {
  final int? totalItems;
  final int? currentPage;
  final int? totalPages;
  final int? itemsPerPage;

  PaginatedApiResponse({
    required super.success,
    super.data,
    super.message,
    super.error,
    super.statusCode,
    super.metadata,
    this.totalItems,
    this.currentPage,
    this.totalPages,
    this.itemsPerPage,
  });

  factory PaginatedApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemFromJson,
  ) {
    final List<dynamic>? items = json['data'];
    final List<T>? typedItems = items?.map((item) => itemFromJson(item as Map<String, dynamic>)).toList();

    return PaginatedApiResponse<T>(
      success: json['success'] ?? false,
      data: typedItems,
      message: json['message'],
      error: json['error'],
      statusCode: json['statusCode'],
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
      totalItems: json['totalItems'],
      currentPage: json['currentPage'],
      totalPages: json['totalPages'],
      itemsPerPage: json['itemsPerPage'],
    );
  }
}

/// Error response model
class ApiError {
  final String message;
  final String? code;
  final int? statusCode;
  final Map<String, dynamic>? details;
  final List<String>? validationErrors;

  ApiError({
    required this.message,
    this.code,
    this.statusCode,
    this.details,
    this.validationErrors,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      message: json['message'] ?? 'Unknown error',
      code: json['code'],
      statusCode: json['statusCode'],
      details: json['details'] != null ? Map<String, dynamic>.from(json['details']) : null,
      validationErrors: json['validationErrors'] != null 
          ? List<String>.from(json['validationErrors'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'message': message,
      'code': code,
      'statusCode': statusCode,
      'details': details,
      'validationErrors': validationErrors,
    };
  }

  @override
  String toString() {
    return 'ApiError(message: $message, code: $code, statusCode: $statusCode)';
  }
}

/// Authentication request models
class LoginRequest {
  final String username;
  final String password;
  final String? deviceId;
  final String? deviceFingerprint;
  final String? platform;

  LoginRequest({
    required this.username,
    required this.password,
    this.deviceId,
    this.deviceFingerprint,
    this.platform = 'ANDROID',
  });

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'password': password,
      'deviceId': deviceId,
      'deviceFingerprint': deviceFingerprint,
      'platform': platform,
    };
  }
}

class LoginResponse {
  final String accessToken;
  final String refreshToken;
  final String? offlineToken;
  final UserInfo user;
  final DeviceInfo? device;
  final SessionInfo session;

  LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    this.offlineToken,
    required this.user,
    this.device,
    required this.session,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      offlineToken: json['offlineToken'],
      user: UserInfo.fromJson(json['user'] ?? {}),
      device: json['device'] != null ? DeviceInfo.fromJson(json['device']) : null,
      session: SessionInfo.fromJson(json['session'] ?? {}),
    );
  }
}

class UserInfo {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String role;
  final String companyId;
  final String? companyName;
  final List<String> permissions;
  final Map<String, dynamic>? profile;

  UserInfo({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    required this.companyId,
    this.companyName,
    required this.permissions,
    this.profile,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? '',
      role: json['role'] ?? '',
      companyId: json['companyId'] ?? '',
      companyName: json['companyName'],
      permissions: List<String>.from(json['permissions'] ?? []),
      profile: json['profile'] != null ? Map<String, dynamic>.from(json['profile']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'fullName': fullName,
      'role': role,
      'companyId': companyId,
      'companyName': companyName,
      'permissions': permissions,
      'profile': profile,
    };
  }
}

class DeviceInfo {
  final String deviceId;
  final String fingerprint;
  final String platform;
  final String? osVersion;
  final String? appVersion;
  final bool trusted;
  final DateTime registeredAt;

  DeviceInfo({
    required this.deviceId,
    required this.fingerprint,
    required this.platform,
    this.osVersion,
    this.appVersion,
    required this.trusted,
    required this.registeredAt,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      deviceId: json['deviceId'] ?? '',
      fingerprint: json['fingerprint'] ?? '',
      platform: json['platform'] ?? '',
      osVersion: json['osVersion'],
      appVersion: json['appVersion'],
      trusted: json['trusted'] ?? false,
      registeredAt: DateTime.parse(json['registeredAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'fingerprint': fingerprint,
      'platform': platform,
      'osVersion': osVersion,
      'appVersion': appVersion,
      'trusted': trusted,
      'registeredAt': registeredAt.toIso8601String(),
    };
  }
}

class SessionInfo {
  final String sessionId;
  final DateTime expiresAt;
  final DateTime lastActivity;
  final Map<String, dynamic>? metadata;

  SessionInfo({
    required this.sessionId,
    required this.expiresAt,
    required this.lastActivity,
    this.metadata,
  });

  factory SessionInfo.fromJson(Map<String, dynamic> json) {
    return SessionInfo(
      sessionId: json['sessionId'] ?? '',
      expiresAt: DateTime.parse(json['expiresAt'] ?? DateTime.now().toIso8601String()),
      lastActivity: DateTime.parse(json['lastActivity'] ?? DateTime.now().toIso8601String()),
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'expiresAt': expiresAt.toIso8601String(),
      'lastActivity': lastActivity.toIso8601String(),
      'metadata': metadata,
    };
  }
}

/// Token refresh models
class RefreshTokenRequest {
  final String refreshToken;
  final String? deviceId;
  final String? fingerprint;

  RefreshTokenRequest({
    required this.refreshToken,
    this.deviceId,
    this.fingerprint,
  });

  Map<String, dynamic> toJson() {
    return {
      'refreshToken': refreshToken,
      'deviceId': deviceId,
      'fingerprint': fingerprint,
    };
  }
}

class RefreshTokenResponse {
  final String accessToken;
  final String? refreshToken;
  final DateTime expiresAt;
  final Map<String, dynamic>? metadata;

  RefreshTokenResponse({
    required this.accessToken,
    this.refreshToken,
    required this.expiresAt,
    this.metadata,
  });

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) {
    return RefreshTokenResponse(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'],
      expiresAt: DateTime.parse(json['expiresAt'] ?? DateTime.now().toIso8601String()),
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }
}

/// Gate check specific models
class GateCheckEntry {
  final String id;
  final String guestId;
  final String guestName;
  final String guestCompany;
  final String vehiclePlate;
  final String vehicleType;
  final String destination;
  final String status;
  final DateTime entryAt;
  final DateTime? exitAt;
  final List<PhotoAttachment> photos;
  final Map<String, dynamic>? metadata;
  
  // New server fields
  final String? driverName;
  final String? idCardNumber;
  final double? latitude;
  final double? longitude;
  final String? cargoVolume;
  final String? cargoOwner;
  final double? estimatedWeight;
  final String? deliveryOrderNumber;
  final String? loadType;
  final String? secondCargo;

  GateCheckEntry({
    required this.id,
    required this.guestId,
    required this.guestName,
    required this.guestCompany,
    required this.vehiclePlate,
    required this.vehicleType,
    required this.destination,
    required this.status,
    required this.entryAt,
    this.exitAt,
    required this.photos,
    this.metadata,
    this.driverName,
    this.idCardNumber,
    this.latitude,
    this.longitude,
    this.cargoVolume,
    this.cargoOwner,
    this.estimatedWeight,
    this.deliveryOrderNumber,
    this.loadType,
    this.secondCargo,
  });

  factory GateCheckEntry.fromJson(Map<String, dynamic> json) {
    return GateCheckEntry(
      id: json['id'] ?? '',
      guestId: json['guestId'] ?? '',
      guestName: json['guestName'] ?? '',
      guestCompany: json['guestCompany'] ?? '',
      vehiclePlate: json['vehiclePlate'] ?? '',
      vehicleType: json['vehicleType'] ?? '',
      destination: json['destination'] ?? json['purpose'] ?? '',
      status: json['status'] ?? '',
      entryAt: DateTime.parse(json['entryAt'] ?? DateTime.now().toIso8601String()),
      exitAt: json['exitAt'] != null ? DateTime.parse(json['exitAt']) : null,
      photos: (json['photos'] as List<dynamic>? ?? [])
          .map((item) => PhotoAttachment.fromJson(item))
          .toList(),
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
      driverName: json['driverName'],
      idCardNumber: json['idCardNumber'],
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      cargoVolume: json['cargoVolume'],
      cargoOwner: json['cargoOwner'],
      estimatedWeight: json['estimatedWeight'] != null ? (json['estimatedWeight'] as num).toDouble() : null,
      deliveryOrderNumber: json['deliveryOrderNumber'],
      loadType: json['loadType'],
      secondCargo: json['secondCargo'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'guestId': guestId,
      'guestName': guestName,
      'guestCompany': guestCompany,
      'vehiclePlate': vehiclePlate,
      'vehicleType': vehicleType,
      'destination': destination,
      'status': status,
      'entryAt': entryAt.toIso8601String(),
      'exitAt': exitAt?.toIso8601String(),
      'photos': photos.map((photo) => photo.toJson()).toList(),
      'metadata': metadata,
      'driverName': driverName,
      'idCardNumber': idCardNumber,
      'latitude': latitude,
      'longitude': longitude,
      'cargoVolume': cargoVolume,
      'cargoOwner': cargoOwner,
      'estimatedWeight': estimatedWeight,
      'deliveryOrderNumber': deliveryOrderNumber,
      'loadType': loadType,
      'secondCargo': secondCargo,
    };
  }
}

class PhotoAttachment {
  final String id;
  final String fileName;
  final String photoType;
  final int fileSize;
  final String format;
  final Map<String, int> dimensions;
  final String checksum;
  final DateTime uploadedAt;

  PhotoAttachment({
    required this.id,
    required this.fileName,
    required this.photoType,
    required this.fileSize,
    required this.format,
    required this.dimensions,
    required this.checksum,
    required this.uploadedAt,
  });

  factory PhotoAttachment.fromJson(Map<String, dynamic> json) {
    return PhotoAttachment(
      id: json['id'] ?? '',
      fileName: json['fileName'] ?? '',
      photoType: json['photoType'] ?? '',
      fileSize: json['fileSize'] ?? 0,
      format: json['format'] ?? '',
      dimensions: Map<String, int>.from(json['dimensions'] ?? {}),
      checksum: json['checksum'] ?? '',
      uploadedAt: DateTime.parse(json['uploadedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fileName': fileName,
      'photoType': photoType,
      'fileSize': fileSize,
      'format': format,
      'dimensions': dimensions,
      'checksum': checksum,
      'uploadedAt': uploadedAt.toIso8601String(),
    };
  }
}

/// Sync models
class SyncStatus {
  final String entityType;
  final String entityId;
  final String status; // 'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'
  final DateTime lastAttempt;
  final DateTime? lastSuccess;
  final String? errorMessage;
  final int retryCount;
  final Map<String, dynamic>? metadata;

  SyncStatus({
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.lastAttempt,
    this.lastSuccess,
    this.errorMessage,
    required this.retryCount,
    this.metadata,
  });

  factory SyncStatus.fromJson(Map<String, dynamic> json) {
    return SyncStatus(
      entityType: json['entityType'] ?? '',
      entityId: json['entityId'] ?? '',
      status: json['status'] ?? '',
      lastAttempt: DateTime.parse(json['lastAttempt'] ?? DateTime.now().toIso8601String()),
      lastSuccess: json['lastSuccess'] != null ? DateTime.parse(json['lastSuccess']) : null,
      errorMessage: json['errorMessage'],
      retryCount: json['retryCount'] ?? 0,
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'entityType': entityType,
      'entityId': entityId,
      'status': status,
      'lastAttempt': lastAttempt.toIso8601String(),
      'lastSuccess': lastSuccess?.toIso8601String(),
      'errorMessage': errorMessage,
      'retryCount': retryCount,
      'metadata': metadata,
    };
  }
}

/// Health check models
class HealthStatus {
  final String status;
  final DateTime timestamp;
  final String version;
  final Map<String, dynamic> services;
  final Map<String, dynamic>? metadata;

  HealthStatus({
    required this.status,
    required this.timestamp,
    required this.version,
    required this.services,
    this.metadata,
  });

  factory HealthStatus.fromJson(Map<String, dynamic> json) {
    return HealthStatus(
      status: json['status'] ?? '',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      version: json['version'] ?? '',
      services: Map<String, dynamic>.from(json['services'] ?? {}),
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'timestamp': timestamp.toIso8601String(),
      'version': version,
      'services': services,
      'metadata': metadata,
    };
  }
}

/// Constants for API models
class ApiConstants {
  // Status codes
  static const int statusSuccess = 200;
  static const int statusCreated = 201;
  static const int statusBadRequest = 400;
  static const int statusUnauthorized = 401;
  static const int statusForbidden = 403;
  static const int statusNotFound = 404;
  static const int statusConflict = 409;
  static const int statusInternalServerError = 500;

  // Gate check statuses (raw from mobile: ENTRY/EXIT)
  static const String statusEntry = 'ENTRY';
  static const String statusExit = 'EXIT';

  // QR token statuses
  static const String qrStatusActive = 'ACTIVE';
  static const String qrStatusUsed = 'USED';
  static const String qrStatusExpired = 'EXPIRED';
  static const String qrStatusCancelled = 'CANCELLED';

  // Sync statuses
  static const String syncPending = 'PENDING';
  static const String syncSyncing = 'SYNCING';
  static const String syncSynced = 'SYNCED';
  static const String syncFailed = 'FAILED';
  static const String syncConflict = 'CONFLICT';

  // Photo types
  static const String photoTypeEntry = 'ENTRY_PHOTO';
  static const String photoTypeExit = 'EXIT_PHOTO';
  static const String photoTypeVehicle = 'VEHICLE_PHOTO';
  static const String photoTypeDriver = 'DRIVER_PHOTO';

  // Generation intents
  static const String intentEntry = 'ENTRY';
  static const String intentExit = 'EXIT';

  // Resolution strategies
  static const String resolutionServerWins = 'SERVER_WINS';
  static const String resolutionClientWins = 'CLIENT_WINS';
  static const String resolutionMerge = 'MERGE';

  // Private constructor to prevent instantiation
  ApiConstants._();
}