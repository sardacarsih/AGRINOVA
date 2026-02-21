import 'package:equatable/equatable.dart';

/// Base class for all application errors
abstract class AppError extends Equatable implements Exception {
  final String message;
  final String code;
  final dynamic details;

  const AppError({
    required this.message,
    required this.code,
    this.details,
  });

  @override
  List<Object?> get props => [message, code, details];

  @override
  String toString() => 'AppError(code: $code, message: $message)';
}

/// Network-related errors
class NetworkError extends AppError {
  const NetworkError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory NetworkError.noConnection() {
    return const NetworkError(
      message: 'Tidak ada koneksi internet. Periksa koneksi Anda.',
      code: 'NETWORK_NO_CONNECTION',
    );
  }

  factory NetworkError.timeout() {
    return const NetworkError(
      message: 'Koneksi timeout. Coba lagi dalam beberapa saat.',
      code: 'NETWORK_TIMEOUT',
    );
  }

  factory NetworkError.serverError(int statusCode, String? serverMessage) {
    return NetworkError(
      message: serverMessage ?? 'Terjadi kesalahan pada server ($statusCode)',
      code: 'NETWORK_SERVER_ERROR',
      details: {'statusCode': statusCode, 'serverMessage': serverMessage},
    );
  }

  factory NetworkError.requestError(String message) {
    return NetworkError(
      message: 'Permintaan tidak valid: $message',
      code: 'NETWORK_REQUEST_ERROR',
      details: message,
    );
  }
}

/// Authentication-related errors
class AuthError extends AppError {
  const AuthError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory AuthError.invalidCredentials() {
    return const AuthError(
      message: 'Username atau password salah',
      code: 'AUTH_INVALID_CREDENTIALS',
    );
  }

  factory AuthError.tokenExpired() {
    return const AuthError(
      message: 'Sesi telah berakhir. Silakan login kembali.',
      code: 'AUTH_TOKEN_EXPIRED',
    );
  }

  factory AuthError.unauthorized() {
    return const AuthError(
      message: 'Anda tidak memiliki akses untuk melakukan operasi ini',
      code: 'AUTH_UNAUTHORIZED',
    );
  }

  factory AuthError.accountLocked() {
    return const AuthError(
      message: 'Akun terkunci karena terlalu banyak percobaan login yang gagal',
      code: 'AUTH_ACCOUNT_LOCKED',
    );
  }

  factory AuthError.biometricNotAvailable() {
    return const AuthError(
      message: 'Autentikasi biometrik tidak tersedia pada perangkat ini',
      code: 'AUTH_BIOMETRIC_NOT_AVAILABLE',
    );
  }

  factory AuthError.biometricNotEnrolled() {
    return const AuthError(
      message: 'Belum ada data biometrik yang terdaftar. Silakan daftarkan terlebih dahulu.',
      code: 'AUTH_BIOMETRIC_NOT_ENROLLED',
    );
  }

  factory AuthError.deviceNotTrusted() {
    return const AuthError(
      message: 'Perangkat belum terpercaya. Hubungi administrator.',
      code: 'AUTH_DEVICE_NOT_TRUSTED',
    );
  }
}

/// Database-related errors
class DatabaseError extends AppError {
  const DatabaseError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory DatabaseError.connectionFailed() {
    return const DatabaseError(
      message: 'Gagal terhubung ke database lokal',
      code: 'DB_CONNECTION_FAILED',
    );
  }

  factory DatabaseError.migrationFailed(String migrationVersion) {
    return DatabaseError(
      message: 'Gagal melakukan migrasi database ke versi $migrationVersion',
      code: 'DB_MIGRATION_FAILED',
      details: migrationVersion,
    );
  }

  factory DatabaseError.queryFailed(String query, String error) {
    return DatabaseError(
      message: 'Gagal menjalankan query database: $error',
      code: 'DB_QUERY_FAILED',
      details: {'query': query, 'error': error},
    );
  }

  factory DatabaseError.corruptedData() {
    return const DatabaseError(
      message: 'Data database rusak atau tidak valid',
      code: 'DB_CORRUPTED_DATA',
    );
  }

  factory DatabaseError.storageSpace() {
    return const DatabaseError(
      message: 'Ruang penyimpanan tidak mencukupi untuk menyimpan data',
      code: 'DB_STORAGE_SPACE',
    );
  }
}

/// Validation-related errors
class ValidationError extends AppError {
  const ValidationError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory ValidationError.required(String fieldName) {
    return ValidationError(
      message: '$fieldName harus diisi',
      code: 'VALIDATION_REQUIRED',
      details: fieldName,
    );
  }

  factory ValidationError.invalidFormat(String fieldName, String expectedFormat) {
    return ValidationError(
      message: 'Format $fieldName tidak valid. Format yang diharapkan: $expectedFormat',
      code: 'VALIDATION_INVALID_FORMAT',
      details: {'field': fieldName, 'expectedFormat': expectedFormat},
    );
  }

  factory ValidationError.outOfRange(String fieldName, num min, num max) {
    return ValidationError(
      message: '$fieldName harus antara $min dan $max',
      code: 'VALIDATION_OUT_OF_RANGE',
      details: {'field': fieldName, 'min': min, 'max': max},
    );
  }

  factory ValidationError.duplicate(String fieldName, String value) {
    return ValidationError(
      message: '$fieldName "$value" sudah ada',
      code: 'VALIDATION_DUPLICATE',
      details: {'field': fieldName, 'value': value},
    );
  }

  factory ValidationError.custom(String message) {
    return ValidationError(
      message: message,
      code: 'VALIDATION_CUSTOM',
    );
  }
}

/// Business logic-related errors
class BusinessError extends AppError {
  const BusinessError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory BusinessError.harvestAlreadyApproved(String harvestId) {
    return BusinessError(
      message: 'Panen sudah disetujui dan tidak dapat diubah',
      code: 'BUSINESS_HARVEST_ALREADY_APPROVED',
      details: harvestId,
    );
  }

  factory BusinessError.insufficientPermission(String action) {
    return BusinessError(
      message: 'Anda tidak memiliki hak akses untuk melakukan $action',
      code: 'BUSINESS_INSUFFICIENT_PERMISSION',
      details: action,
    );
  }

  factory BusinessError.operationNotAllowed(String reason) {
    return BusinessError(
      message: 'Operasi tidak diizinkan: $reason',
      code: 'BUSINESS_OPERATION_NOT_ALLOWED',
      details: reason,
    );
  }

  factory BusinessError.resourceNotFound(String resourceType, String id) {
    return BusinessError(
      message: '$resourceType dengan ID $id tidak ditemukan',
      code: 'BUSINESS_RESOURCE_NOT_FOUND',
      details: {'resourceType': resourceType, 'id': id},
    );
  }

  factory BusinessError.conflictingData(String reason) {
    return BusinessError(
      message: 'Data konflik: $reason',
      code: 'BUSINESS_CONFLICTING_DATA',
      details: reason,
    );
  }
}

/// Sync-related errors
class SyncError extends AppError {
  const SyncError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory SyncError.conflictDetected(String resourceType, String id) {
    return SyncError(
      message: 'Konflik data ditemukan untuk $resourceType: $id',
      code: 'SYNC_CONFLICT_DETECTED',
      details: {'resourceType': resourceType, 'id': id},
    );
  }

  factory SyncError.partialSync(int successCount, int failCount) {
    return SyncError(
      message: 'Sync sebagian berhasil. $successCount berhasil, $failCount gagal.',
      code: 'SYNC_PARTIAL_SUCCESS',
      details: {'successCount': successCount, 'failCount': failCount},
    );
  }

  factory SyncError.syncInProgress() {
    return const SyncError(
      message: 'Sync sedang berlangsung. Tunggu hingga selesai.',
      code: 'SYNC_IN_PROGRESS',
    );
  }

  factory SyncError.serverVersionMismatch() {
    return const SyncError(
      message: 'Versi data server berbeda. Diperlukan update aplikasi.',
      code: 'SYNC_VERSION_MISMATCH',
    );
  }
}

/// Hardware/Device-related errors
class DeviceError extends AppError {
  const DeviceError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory DeviceError.cameraNotAvailable() {
    return const DeviceError(
      message: 'Kamera tidak tersedia atau tidak dapat diakses',
      code: 'DEVICE_CAMERA_NOT_AVAILABLE',
    );
  }

  factory DeviceError.locationNotAvailable() {
    return const DeviceError(
      message: 'Layanan lokasi tidak tersedia atau dimatikan',
      code: 'DEVICE_LOCATION_NOT_AVAILABLE',
    );
  }

  factory DeviceError.permissionDenied(String permission) {
    return DeviceError(
      message: 'Akses $permission ditolak. Berikan izin melalui pengaturan.',
      code: 'DEVICE_PERMISSION_DENIED',
      details: permission,
    );
  }

  factory DeviceError.storageNotAvailable() {
    return const DeviceError(
      message: 'Ruang penyimpanan tidak mencukupi',
      code: 'DEVICE_STORAGE_NOT_AVAILABLE',
    );
  }

  factory DeviceError.networkNotAvailable() {
    return const DeviceError(
      message: 'Jaringan tidak tersedia',
      code: 'DEVICE_NETWORK_NOT_AVAILABLE',
    );
  }
}

/// File operation errors
class FileError extends AppError {
  const FileError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory FileError.notFound(String filePath) {
    return FileError(
      message: 'File tidak ditemukan: $filePath',
      code: 'FILE_NOT_FOUND',
      details: filePath,
    );
  }

  factory FileError.readFailed(String filePath, String reason) {
    return FileError(
      message: 'Gagal membaca file $filePath: $reason',
      code: 'FILE_READ_FAILED',
      details: {'filePath': filePath, 'reason': reason},
    );
  }

  factory FileError.writeFailed(String filePath, String reason) {
    return FileError(
      message: 'Gagal menulis file $filePath: $reason',
      code: 'FILE_WRITE_FAILED',
      details: {'filePath': filePath, 'reason': reason},
    );
  }

  factory FileError.invalidFormat(String filePath, String expectedFormat) {
    return FileError(
      message: 'Format file tidak valid. Diharapkan: $expectedFormat',
      code: 'FILE_INVALID_FORMAT',
      details: {'filePath': filePath, 'expectedFormat': expectedFormat},
    );
  }
}

/// Generic system errors
class SystemError extends AppError {
  const SystemError({
    required String message,
    required String code,
    dynamic details,
  }) : super(message: message, code: code, details: details);

  factory SystemError.unexpected(String? details) {
    return SystemError(
      message: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
      code: 'SYSTEM_UNEXPECTED_ERROR',
      details: details,
    );
  }

  factory SystemError.configurationError(String config) {
    return SystemError(
      message: 'Kesalahan konfigurasi: $config',
      code: 'SYSTEM_CONFIGURATION_ERROR',
      details: config,
    );
  }

  factory SystemError.serviceUnavailable(String service) {
    return SystemError(
      message: 'Layanan $service tidak tersedia',
      code: 'SYSTEM_SERVICE_UNAVAILABLE',
      details: service,
    );
  }
}