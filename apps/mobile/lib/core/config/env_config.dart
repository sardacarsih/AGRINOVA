import 'environment.dart';

/// Compile-time environment configuration.
///
/// Values are injected at build time via:
///   flutter run --dart-define-from-file=env/dev.json
///   flutter build apk --dart-define-from-file=env/prod.json
///
/// If no `--dart-define-from-file` is passed, all values fall back to their
/// defaults which match the dev environment (backward-compatible).
class EnvConfig {
  EnvConfig._();

  // ── Core identifiers ──────────────────────────────────────────────
  static const String env = String.fromEnvironment(
    'ENV',
    defaultValue: 'dev',
  );

  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Agrinova Mobile',
  );

  // ── Network URLs ──────────────────────────────────────────────────
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:8080',
  );

  static const String graphqlPath = String.fromEnvironment(
    'GRAPHQL_PATH',
    defaultValue: '/graphql',
  );

  static const String wsPath = String.fromEnvironment(
    'WS_PATH',
    defaultValue: '/ws',
  );

  static const int apiPort = int.fromEnvironment(
    'API_PORT',
    defaultValue: 8080,
  );

  // ── Feature flags ─────────────────────────────────────────────────
  static const bool enableLogs = bool.fromEnvironment(
    'ENABLE_LOGS',
    defaultValue: true,
  );

  static const bool enableDebug = bool.fromEnvironment(
    'ENABLE_DEBUG',
    defaultValue: true,
  );

  static const bool enableBiometrics = bool.fromEnvironment(
    'ENABLE_BIOMETRICS',
    defaultValue: true,
  );

  static const bool enableOfflineMode = bool.fromEnvironment(
    'ENABLE_OFFLINE_MODE',
    defaultValue: true,
  );

  // ── Derived getters ───────────────────────────────────────────────
  static String get graphqlUrl => '$baseUrl$graphqlPath';
  static String get websocketUrl => '$wsUrl$wsPath';

  static bool get isDev => env == 'dev';
  static bool get isStaging => env == 'staging';
  static bool get isProd => env == 'prod';

  // ── Well-known environment URLs ───────────────────────────────────
  static const String developmentUrl = 'http://localhost:8080';
  static const String stagingUrl = 'https://staging.agrinova.com';
  static const String productionUrl = 'https://api.kskgroup.web.id';

  /// Map compile-time ENV string to the [Environment] enum used by
  /// [ConfigService].
  static Environment get autoDetectedEnvironment {
    switch (env) {
      case 'staging':
        return Environment.staging;
      case 'prod':
        return Environment.production;
      default:
        return Environment.development;
    }
  }

  /// Debug summary for logging during initialization.
  static Map<String, dynamic> toMap() {
    return {
      'ENV': env,
      'APP_NAME': appName,
      'BASE_URL': baseUrl,
      'WS_URL': wsUrl,
      'GRAPHQL_PATH': graphqlPath,
      'WS_PATH': wsPath,
      'API_PORT': apiPort,
      'ENABLE_LOGS': enableLogs,
      'ENABLE_DEBUG': enableDebug,
      'ENABLE_BIOMETRICS': enableBiometrics,
      'ENABLE_OFFLINE_MODE': enableOfflineMode,
    };
  }
}
