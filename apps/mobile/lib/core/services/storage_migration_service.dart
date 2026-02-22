import 'package:logger/logger.dart';

import 'config_service.dart';
import 'jwt_storage_service.dart';
import 'unified_secure_storage_service.dart';

/// Migrates legacy storage data into [UnifiedSecureStorageService].
class StorageMigrationService {
  static final Logger _logger = Logger();
  static bool _migrationComplete = false;
  static DateTime? _migrationDate;

  static Future<MigrationResult> migrateToUnifiedStorage() async {
    try {
      final needed = await _isMigrationNeeded();
      if (!needed) {
        return const MigrationResult(
          success: true,
          message: 'Migration not needed',
        );
      }

      final authMigration = await _migrateAuthenticationData();
      final configMigration = await _migrateConfigurationData();
      final userMigration = await _migrateUserData();
      final verification = await _verifyMigration();

      final result = MigrationResult(
        success: true,
        message: 'Migration executed',
        authMigration: authMigration,
        configMigration: configMigration,
        userMigration: userMigration,
        verification: verification,
      );

      if (result.overallSuccess) {
        await _markMigrationComplete();
      }

      return result.copyWith(
        success: result.overallSuccess,
        message: result.overallSuccess
            ? 'Storage migration completed'
            : 'Storage migration completed with issues',
      );
    } catch (e) {
      _logger.e('Storage migration failed: $e');
      return MigrationResult(
        success: false,
        message: 'Storage migration failed: $e',
        error: e.toString(),
      );
    }
  }

  static Future<void> cleanupOldStorage() async {
    _logger.i('Legacy storage cleanup is skipped by default');
  }

  static Future<MigrationResult> forceRemigration() async {
    _migrationComplete = false;
    _migrationDate = null;
    return migrateToUnifiedStorage();
  }

  static Future<MigrationStatus> getMigrationStatus() async {
    return MigrationStatus(
      complete: _migrationComplete,
      migrationDate: _migrationDate,
    );
  }

  static Future<bool> _isMigrationNeeded() async {
    final unifiedAuth = await UnifiedSecureStorageService.isAuthenticated();
    final legacyAuth = await _hasOldAuthenticationData();
    final legacyConfig = await _hasOldConfigurationData();

    if (!legacyAuth && !legacyConfig) {
      return false;
    }

    return !unifiedAuth;
  }

  static Future<MigrationStep> _migrateAuthenticationData() async {
    try {
      final jwt = JWTStorageService();
      final accessToken = await jwt.getAccessToken();
      final refreshToken = await jwt.getRefreshToken();

      int migrated = 0;
      if (accessToken != null && accessToken.isNotEmpty) {
        await UnifiedSecureStorageService.updateAccessToken(accessToken);
        migrated++;
      }
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await UnifiedSecureStorageService.updateRefreshToken(refreshToken);
        migrated++;
      }

      if (migrated == 0) {
        return const MigrationStep(
          name: 'Authentication Data',
          success: true,
          message: 'No auth token to migrate',
        );
      }

      return MigrationStep(
        name: 'Authentication Data',
        success: true,
        itemsMigrated: migrated,
        message: 'Authentication tokens migrated',
      );
    } catch (e) {
      return MigrationStep(
        name: 'Authentication Data',
        success: false,
        message: 'Failed to migrate auth data: $e',
        error: e.toString(),
      );
    }
  }

  static Future<MigrationStep> _migrateConfigurationData() async {
    try {
      final config = await ConfigService.getConfig();
      final unifiedConfig = await UnifiedSecureStorageService.getUnifiedConfig();
      await UnifiedSecureStorageService.updateUnifiedConfig(
        unifiedConfig.copyWith(environment: config.environment.name),
      );

      return const MigrationStep(
        name: 'Configuration Data',
        success: true,
        itemsMigrated: 1,
        message: 'Configuration migrated',
      );
    } catch (e) {
      return MigrationStep(
        name: 'Configuration Data',
        success: false,
        message: 'Failed to migrate config data: $e',
        error: e.toString(),
      );
    }
  }

  static Future<MigrationStep> _migrateUserData() async {
    return const MigrationStep(
      name: 'User Data',
      success: true,
      message: 'User data migration is not required',
    );
  }

  static Future<MigrationStep> _verifyMigration() async {
    try {
      final accessToken = await UnifiedSecureStorageService.getAccessToken();
      final config = await UnifiedSecureStorageService.getUnifiedConfig();

      final hasToken = accessToken != null && accessToken.isNotEmpty;
      final hasConfig = config.error == null;
      final ok = hasToken || hasConfig;

      return MigrationStep(
        name: 'Migration Verification',
        success: ok,
        message: ok ? 'Verification successful' : 'Verification failed',
      );
    } catch (e) {
      return MigrationStep(
        name: 'Migration Verification',
        success: false,
        message: 'Verification failed: $e',
        error: e.toString(),
      );
    }
  }

  static Future<void> _markMigrationComplete() async {
    _migrationComplete = true;
    _migrationDate = DateTime.now();
  }

  static Future<bool> _hasOldAuthenticationData() async {
    try {
      final jwt = JWTStorageService();
      final token = await jwt.getAccessToken();
      final user = await jwt.getUserInfo();
      return token != null || user != null;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _hasOldConfigurationData() async {
    try {
      final config = await ConfigService.getConfig();
      return config.baseUrl.isNotEmpty;
    } catch (_) {
      return false;
    }
  }
}

class MigrationResult {
  final bool success;
  final String message;
  final String? error;
  final MigrationStep? authMigration;
  final MigrationStep? configMigration;
  final MigrationStep? userMigration;
  final MigrationStep? verification;

  const MigrationResult({
    this.success = true,
    this.message = '',
    this.error,
    this.authMigration,
    this.configMigration,
    this.userMigration,
    this.verification,
  });

  bool get overallSuccess {
    return success &&
        (authMigration?.success ?? true) &&
        (configMigration?.success ?? true) &&
        (userMigration?.success ?? true) &&
        (verification?.success ?? true);
  }

  int get totalItemsMigrated {
    return (authMigration?.itemsMigrated ?? 0) +
        (configMigration?.itemsMigrated ?? 0) +
        (userMigration?.itemsMigrated ?? 0);
  }

  MigrationResult copyWith({
    bool? success,
    String? message,
    String? error,
    MigrationStep? authMigration,
    MigrationStep? configMigration,
    MigrationStep? userMigration,
    MigrationStep? verification,
  }) {
    return MigrationResult(
      success: success ?? this.success,
      message: message ?? this.message,
      error: error ?? this.error,
      authMigration: authMigration ?? this.authMigration,
      configMigration: configMigration ?? this.configMigration,
      userMigration: userMigration ?? this.userMigration,
      verification: verification ?? this.verification,
    );
  }
}

class MigrationStep {
  final String name;
  final bool success;
  final String message;
  final String? error;
  final int itemsMigrated;

  const MigrationStep({
    required this.name,
    this.success = true,
    this.message = '',
    this.error,
    this.itemsMigrated = 0,
  });
}

class MigrationStatus {
  final bool complete;
  final DateTime? migrationDate;
  final String? error;

  const MigrationStatus({
    required this.complete,
    this.migrationDate,
    this.error,
  });
}


