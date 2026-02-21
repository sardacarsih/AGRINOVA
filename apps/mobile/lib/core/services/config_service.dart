import 'dart:async';
import 'dart:io';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/env_config.dart';
import '../config/environment.dart';
export '../config/environment.dart';
import '../constants/api_constants.dart';

class ConfigService {
  static final Logger _logger = Logger();
  static ConfigService? _instance;
  static final _configController = StreamController<ConfigData>.broadcast();

  static const String _environmentKey = 'app_environment';

  ConfigService._internal();

  static ConfigService get instance {
    _instance ??= ConfigService._internal();
    return _instance!;
  }

  /// Stream of configuration changes
  static Stream<ConfigData> get configStream => _configController.stream;

  /// Initialize configuration service
  static Future<ConfigData> initialize() async {
    try {
      _logger.i('Initializing ConfigService...');

      final config = await _loadConfiguration();
      _syncApiConstants(config);
      _configController.add(config);

      _logger.i('ConfigService initialized');
      _logger.i('   Environment: ${config.environment.name}');
      _logger.i('   Server URL: ${config.baseUrl}');

      return config;
    } catch (e) {
      _logger.e('ConfigService initialization failed: $e');
      rethrow;
    }
  }

  /// Load configuration from storage
  static Future<ConfigData> _loadConfiguration() async {
    final prefs = await SharedPreferences.getInstance();

    final envString = prefs.getString(_environmentKey);
    final environment = _parseEnvironment(envString);
    final baseUrl = _getUrlForEnvironment(environment);

    return ConfigData(
      environment: environment,
      baseUrl: baseUrl,
    );
  }

  /// Get URL for a given environment using compile-time defaults
  static String _getUrlForEnvironment(Environment environment) {
    switch (environment) {
      case Environment.development:
        return EnvConfig.baseUrl;
      case Environment.staging:
        return EnvConfig.stagingUrl;
      case Environment.production:
        return EnvConfig.productionUrl;
    }
  }

  /// Parse environment from stored string, falling back to the compile-time
  /// environment set via `--dart-define-from-file`.
  static Environment _parseEnvironment(String? envString) {
    // In non-dev builds, lock the environment to compile-time values so
    // persisted settings from previous installs cannot redirect production
    // traffic to development endpoints.
    if (EnvConfig.isProd) {
      return Environment.production;
    }
    if (EnvConfig.isStaging) {
      return Environment.staging;
    }

    if (envString != null) {
      switch (envString) {
        case 'development':
          return Environment.development;
        case 'staging':
          return Environment.staging;
        case 'production':
          return Environment.production;
      }
    }
    return EnvConfig.autoDetectedEnvironment;
  }

  /// Get current configuration
  static Future<ConfigData> getConfig() async {
    return await _loadConfiguration();
  }

  /// Set environment
  static Future<void> setEnvironment(Environment environment) async {
    try {
      if (!EnvConfig.isDev) {
        _logger.w(
          'Ignoring setEnvironment(${environment.name}) in non-dev build '
          '(ENV=${EnvConfig.env})',
        );
        return;
      }

      _logger.i('Setting environment: ${environment.name}');

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_environmentKey, environment.name);

      final config = await _loadConfiguration();
      _syncApiConstants(config);
      _configController.add(config);

      _logger.i('Environment updated to ${environment.name}');
    } catch (e) {
      _logger.e('Failed to set environment: $e');
      rethrow;
    }
  }

  /// Refresh configuration
  static Future<void> refreshConfiguration() async {
    try {
      _logger.i('Refreshing configuration...');

      final config = await _loadConfiguration();
      _syncApiConstants(config);
      _configController.add(config);

      _logger.i('Configuration refreshed');
    } catch (e) {
      _logger.e('Failed to refresh configuration: $e');
      rethrow;
    }
  }

  /// Test connection to configured server
  static Future<bool> testConnection() async {
    try {
      _logger.i('Testing server connection...');

      final config = await getConfig();
      return await _performHealthCheck(config.baseUrl);
    } catch (e) {
      _logger.e('Connection test failed: $e');
      return false;
    }
  }

  /// Perform actual HTTP health check
  static Future<bool> _performHealthCheck(String baseUrl) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 10);

      final uri = Uri.parse('$baseUrl/health');
      final request = await client.getUrl(uri);
      final response = await request.close();

      client.close();

      _logger.d('Health check $baseUrl/health -> ${response.statusCode}');
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      _logger.e('Health check failed: $e');
      return false;
    }
  }

  /// Reset all configuration to defaults
  static Future<void> resetToDefaults() async {
    try {
      _logger.i('Resetting configuration to defaults...');

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_environmentKey);

      final config = await _loadConfiguration();
      _syncApiConstants(config);
      _configController.add(config);

      _logger.i('Configuration reset to defaults');
    } catch (e) {
      _logger.e('Failed to reset configuration: $e');
      rethrow;
    }
  }

  /// Get configuration status for debugging
  static Future<Map<String, dynamic>> getStatus() async {
    try {
      final config = await getConfig();

      return {
        'environment': config.environment.name,
        'baseUrl': config.baseUrl,
        'lastUpdate': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      return {
        'error': e.toString(),
        'lastUpdate': DateTime.now().toIso8601String(),
      };
    }
  }

  /// Keep API constants aligned with persisted config.
  static void _syncApiConstants(ConfigData config) {
    ApiConstants.setBaseUrl(config.baseUrl);
    _logger.d('Synced ApiConstants base URL: ${ApiConstants.baseUrl}');
  }

  /// Dispose resources
  static void dispose() {
    _configController.close();
  }
}

/// Configuration data class
class ConfigData {
  final Environment environment;
  final String baseUrl;

  const ConfigData({
    required this.environment,
    required this.baseUrl,
  });

  @override
  String toString() {
    return 'ConfigData('
        'environment: ${environment.name}, '
        'baseUrl: $baseUrl'
        ')';
  }

  ConfigData copyWith({
    Environment? environment,
    String? baseUrl,
  }) {
    return ConfigData(
      environment: environment ?? this.environment,
      baseUrl: baseUrl ?? this.baseUrl,
    );
  }
}
