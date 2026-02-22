import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../config/env_config.dart';

class ApiConstants {
  // Dynamic Base URL for Go GraphQL API - will be set by ConfigService
  static String _baseUrl = EnvConfig.baseUrl;

  /// Get current base URL (dynamic)
  static String get baseUrl => _baseUrl;

  /// Set base URL dynamically (used by ConfigService)
  static void setBaseUrl(String url) {
    _baseUrl = url;
  }

  /// Reset base URL to compile-time default
  static void resetBaseUrl() {
    _baseUrl = EnvConfig.baseUrl;
  }

  // Fallback URLs for different environments (Go GraphQL API)
  static const String defaultDevUrl = EnvConfig.developmentUrl;
  static const String defaultDevUrlLocalhost = 'http://localhost:8080';
  static const String defaultDevUrlManual = 'http://192.168.1.100:8080';
  static const String defaultStagingUrl = EnvConfig.stagingUrl;
  static const String defaultProductionUrl = EnvConfig.productionUrl;

  // Computed URLs
  static String get graphqlUrl => '$_baseUrl$graphqlPath';
  static String get websocketUrl => '${_baseUrl.replaceFirst('http', 'ws')}$graphqlWsPath';

  // GraphQL Endpoints
  static const String graphqlPath = '/graphql';
  static const String graphqlWsPath = '/ws'; // WebSocket for subscriptions
  
  // Authentication Endpoints (Go API paths)
  static const String authPath = '/api/v1/auth';
  static const String unifiedLoginPath = '$authPath/login'; // Go unified endpoint
  static const String jwtMobileRefreshPath = '$authPath/refresh';
  static const String jwtMobileDeviceRegisterPath = '$authPath/device/register';
  static const String jwtMobileOfflineValidatePath = '$authPath/offline/validate';
  static const String jwtMobileDeviceRevokePath = '$authPath/device';
  static const String jwtMobileDeviceTrustPath = '$authPath/device';

  // Headers
  static const String authorizationHeader = 'Authorization';
  static const String bearerPrefix = 'Bearer ';
  static const String platformHeader = 'x-platform';
  static const String deviceIdHeader = 'x-device-id';
  static const String deviceFingerprintHeader = 'x-device-fingerprint';
  static const String clientVersionHeader = 'x-client-version';

  // Platform Values
  static const String androidPlatform = 'ANDROID';
  static const String iosPlatform = 'IOS';
  static const String flutterPlatform = 'flutter';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // JWT Token Configuration
  static const Duration tokenRefreshThreshold = Duration(minutes: 2);
  static const Duration offlineTokenValidityDays = Duration(days: 30);

  // Storage Keys
  static const String accessTokenKey = 'jwt_access_token';
  static const String refreshTokenKey = 'jwt_refresh_token';
  static const String offlineTokenKey = 'jwt_offline_token';
  static const String deviceBindingKey = 'device_binding';
  static const String userInfoKey = 'user_info';
  static const String deviceInfoKey = 'device_info';

  // Debug mode
  static bool get isDebugMode => kDebugMode;

  // Application Info
  static const String appName = 'Agrinova Mobile';
  static String _appVersion = const String.fromEnvironment(
    'APP_VERSION',
    defaultValue: 'unknown',
  );
  static String _appBuildNumber = const String.fromEnvironment(
    'APP_BUILD_NUMBER',
    defaultValue: '0',
  );
  static bool _isAppInfoInitialized = false;

  static String get appVersion => _appVersion;
  static String get appBuildNumber => _appBuildNumber;
  static String get appVersionDisplay =>
      _appVersion == 'unknown' ? '-' : _appVersion;

  static Future<void> initializeAppInfo() async {
    if (_isAppInfoInitialized) return;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final version = packageInfo.version.trim();
      final buildNumber = packageInfo.buildNumber.trim();

      if (version.isNotEmpty) {
        _appVersion = version;
      }
      if (buildNumber.isNotEmpty) {
        _appBuildNumber = buildNumber;
      }
    } catch (_) {
      // Keep compile-time defaults when package metadata is unavailable.
    } finally {
      _isAppInfoInitialized = true;
    }
  }
}

class DatabaseConstants {
  static const String databaseName = 'agrinova.db';
  static const int databaseVersion = 1;

  // Tables
  static const String usersTable = 'users';
  static const String harvesDataTable = 'harvest_data';
  static const String syncQueueTable = 'sync_queue';
  static const String deviceInfoTable = 'device_info';
}

class SecurityConstants {
  // Secure Storage Configuration
  static const String secureStorageKeyPrefix = 'agrinova_';
  static const String androidSharedPrefsName = 'agrinova_jwt_prefs';
  static const String iosKeychainAccountName = 'agrinova_keychain';
  static const String iosKeychainGroupId = 'group.com.agrinova.app';

  // Biometric Configuration
  static const String biometricPrompt = 'Autentikasi untuk mengakses aplikasi Agrinova';
  static const String biometricCancelButton = 'Batal';
  static const String biometricFallbackButton = 'Gunakan PIN';

  // Device Fingerprint
  static const String deviceFingerprintPrefix = 'flutter-fp-';
  static const String deviceIdPrefix = 'flutter-';
  static const String biometricHashPrefix = 'flutter-bio-';
}
