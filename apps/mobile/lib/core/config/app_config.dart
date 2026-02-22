import 'env_config.dart';

class AppConfig {
  static const String appName = EnvConfig.appName;
  static const String appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: 'unknown',
  );
  static const int appBuildNumber = int.fromEnvironment(
    'APP_BUILD_NUMBER',
    defaultValue: 0,
  );

  // API Configuration - injected via --dart-define-from-file
  static const String baseUrl = EnvConfig.baseUrl;
  static const String webBaseUrl = EnvConfig.baseUrl;
  static const String graphqlEndpoint = EnvConfig.graphqlPath;
  static const String wsEndpoint = EnvConfig.wsPath;

  // GraphQL URLs
  static String get graphqlUrl => '${EnvConfig.baseUrl}${EnvConfig.graphqlPath}';
  static String get graphqlWsUrl => '${EnvConfig.wsUrl}${EnvConfig.wsPath}';

  // JWT Configuration
  static const Duration jwtAccessTokenExpiry = Duration(minutes: 15);
  static const Duration jwtRefreshTokenExpiry = Duration(days: 7);
  static const Duration jwtOfflineTokenExpiry = Duration(days: 30);

  // Storage Configuration
  static const String secureStorageKey = 'agrinova_secure_storage';
  static const String jwtAccessTokenKey = 'jwt_access_token';
  static const String jwtRefreshTokenKey = 'jwt_refresh_token';
  static const String jwtOfflineTokenKey = 'jwt_offline_token';
  static const String userDataKey = 'user_data';
  static const String deviceIdKey = 'device_id';
  static const String deviceFingerprintKey = 'device_fingerprint';

  // Database Configuration
  static const String databaseName = 'agrinova.db';
  static const int databaseVersion = 6;

  // Biometric Configuration
  static const String biometricReasonText = 'Authenticate to access Agrinova';
  static const String biometricFallbackTitle = 'Use PIN/Pattern';

  // Network Configuration
  static const Duration networkTimeout = Duration(seconds: 30);
  static const int maxRetryAttempts = 3;

  // Sync Configuration
  static const Duration syncInterval = Duration(minutes: 15);
  static const int maxSyncBatchSize = 100;

  // Environment flags - injected via --dart-define-from-file
  static const bool isDebug = EnvConfig.enableDebug;
  static const bool enableLogging = EnvConfig.enableLogs;
  static const bool enableBiometrics = EnvConfig.enableBiometrics;
  static const bool enableOfflineMode = EnvConfig.enableOfflineMode;

  // Role-based configurations
  static const Map<String, String> roleDisplayNames = {
    'mandor': 'Mandor',
    'asisten': 'Asisten',
    'satpam': 'Satpam',
    'manager': 'Manager',
    'area_manager': 'Area Manager',
    'company_admin': 'Company Admin',
    'super_admin': 'Super Admin',
  };

  // Role-based permissions and capabilities
  static const Map<String, List<String>> rolePermissions = {
    'mandor': [
      'harvest_input',
      'offline_mode',
      'view_assigned_blocks',
      'realtime_notifications',
    ],
    'asisten': [
      'harvest_approval',
      'view_division_stats',
      'monitoring_division',
      'realtime_notifications',
    ],
    'satpam': [
      'gate_check_input',
      'view_gate_logs',
      'qr_scanner',
      'offline_mode',
    ],
    'manager': [
      'harvest_approval_final',
      'view_estate_stats',
      'monitoring_estate',
      'reporting_estate',
      'realtime_notifications',
    ],
    'area_manager': [
      'view_company_stats',
      'monitoring_company',
      'reporting_company',
      'realtime_notifications',
    ],
    'company_admin': [
      'user_management',
      'view_company_stats',
      'monitoring_company',
      'reporting_company',
      'system_configuration',
      'realtime_notifications',
    ],
    'super_admin': [
      'multi_company_access',
      'user_management_global',
      'system_administration',
      'harvest_view_all',
      'monitoring_global',
      'reporting_global',
      'security_management',
      'audit_logs',
      'realtime_notifications',
    ],
  };

  // Role hierarchy for reporting structure
  static const Map<String, List<String>> roleHierarchy = {
    'mandor': ['asisten'],
    'asisten': ['manager'],
    'satpam': ['manager'],
    'manager': ['area_manager'],
    'area_manager': ['company_admin'],
    'company_admin': ['super_admin'],
    'super_admin': [],
  };

  // Feature flags
  static const Map<String, bool> featureFlags = {
    'offline_first': true,
    'biometric_auth': true,
    'jwt_authentication': true,
    'realtime_notifications': true,
    'qr_scanner': true,
    'gate_check': true,
    'harvest_input': true,
    'approval_workflow': true,
  };
}
