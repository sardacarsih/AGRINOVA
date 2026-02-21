import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/env_config.dart';
import '../config/environment.dart';
import '../constants/api_constants.dart';
import 'config_service.dart';

/// Environment Management Service
/// 
/// Provides centralized management of environment configurations
/// with automatic URL switching and validation
class EnvironmentService {
  static final Logger _logger = Logger();
  static EnvironmentService? _instance;
  static final _environmentController = StreamController<EnvironmentInfo>.broadcast();
  
  static const String _lastKnownEnvironmentKey = 'last_known_environment';
  static const String _environmentOverrideKey = 'environment_override';
  
  EnvironmentService._internal();
  
  static EnvironmentService get instance {
    _instance ??= EnvironmentService._internal();
    return _instance!;
  }
  
  /// Stream of environment changes
  static Stream<EnvironmentInfo> get environmentStream => _environmentController.stream;
  
  /// Initialize environment service
  static Future<EnvironmentInfo> initialize() async {
    try {
      _logger.i('🌍 Initializing EnvironmentService...');
      
      final currentEnv = await getCurrentEnvironment();
      final info = await getEnvironmentInfo();
      
      _environmentController.add(info);
      
      _logger.i('✅ EnvironmentService initialized');
      _logger.i('   Current Environment: ${currentEnv.name}');
      _logger.i('   Base URL: ${info.baseUrl}');
      _logger.i('   GraphQL URL: ${info.graphqlUrl}');
      
      return info;
    } catch (e) {
      _logger.e('❌ EnvironmentService initialization failed: $e');
      rethrow;
    }
  }
  
  /// Get current environment
  static Future<Environment> getCurrentEnvironment() async {
    try {
      final config = await ConfigService.getConfig();
      return config.environment;
    } catch (e) {
      _logger.e('Failed to get current environment: $e');
      return EnvConfig.autoDetectedEnvironment;
    }
  }
  
  /// Switch to development environment
  static Future<void> switchToDevelopment() async {
    await _switchEnvironment(Environment.development);
  }
  
  /// Switch to staging environment
  static Future<void> switchToStaging() async {
    await _switchEnvironment(Environment.staging);
  }
  
  /// Switch to production environment
  static Future<void> switchToProduction() async {
    await _switchEnvironment(Environment.production);
  }
  
  /// Switch to specific environment
  static Future<void> _switchEnvironment(Environment environment) async {
    try {
      _logger.i('🔄 Switching to ${environment.name} environment...');
      
      final oldEnv = await getCurrentEnvironment();
      
      // Update ConfigService
      await ConfigService.setEnvironment(environment);
      
      // Store last known environment
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_lastKnownEnvironmentKey, environment.name);
      
      // Get updated environment info
      final info = await getEnvironmentInfo();
      _environmentController.add(info);
      
      _logger.i('✅ Environment switched: ${oldEnv.name} → ${environment.name}');
      _logger.i('   New Base URL: ${info.baseUrl}');
      
    } catch (e) {
      _logger.e('❌ Failed to switch environment: $e');
      rethrow;
    }
  }
  
  /// Auto-detect and configure optimal environment
  static Future<Environment> autoConfigureEnvironment() async {
    try {
      _logger.i('🧠 Auto-configuring environment...');
      
      // Check if we have a stored environment preference
      final prefs = await SharedPreferences.getInstance();
      final storedEnv = prefs.getString(_lastKnownEnvironmentKey);
      
      Environment targetEnv;
      
      if (storedEnv != null) {
        // Use stored preference if available
        switch (storedEnv.toLowerCase()) {
          case 'development':
            targetEnv = Environment.development;
            break;
          case 'staging':
            targetEnv = Environment.staging;
            break;
          case 'production':
            targetEnv = Environment.production;
            break;
          default:
            targetEnv = EnvConfig.autoDetectedEnvironment;
        }
        _logger.d('📦 Using stored environment preference: ${targetEnv.name}');
      } else {
        // Auto-detect based on build mode
        targetEnv = EnvConfig.autoDetectedEnvironment;
        _logger.d('🔍 Auto-detected environment: ${targetEnv.name}');
      }
      
      // Apply the environment configuration
      await ConfigService.setEnvironment(targetEnv);
      
      _logger.i('✅ Environment auto-configured to: ${targetEnv.name}');
      return targetEnv;
      
    } catch (e) {
      _logger.e('❌ Environment auto-configuration failed: $e');
      return EnvConfig.autoDetectedEnvironment;
    }
  }
  
  /// Get comprehensive environment information
  static Future<EnvironmentInfo> getEnvironmentInfo() async {
    try {
      final config = await ConfigService.getConfig();

      return EnvironmentInfo(
        environment: config.environment,
        baseUrl: config.baseUrl,
        graphqlUrl: ApiConstants.graphqlUrl,
        websocketUrl: ApiConstants.websocketUrl,
        isDevelopment: config.environment == Environment.development,
        isStaging: config.environment == Environment.staging,
        isProduction: config.environment == Environment.production,
        isDebugMode: kDebugMode,
        lastUpdate: DateTime.now(),
      );
    } catch (e) {
      _logger.e('Failed to get environment info: $e');
      rethrow;
    }
  }
  
  /// Validate current environment configuration
  static Future<EnvironmentValidationResult> validateEnvironment() async {
    try {
      _logger.d('🔍 Validating environment configuration...');
      
      final info = await getEnvironmentInfo();
      final issues = <String>[];
      final warnings = <String>[];
      
      // Basic URL validation
      if (info.baseUrl.isEmpty) {
        issues.add('Base URL is empty');
      }
      
      if (!info.baseUrl.startsWith('http')) {
        issues.add('Base URL must start with http:// or https://');
      }
      
      // Environment-specific validation
      switch (info.environment) {
        case Environment.development:
          if (!info.baseUrl.contains('localhost') && !info.baseUrl.contains('127.0.0.1')) {
            warnings.add('Development environment should typically use localhost');
          }
          break;
          
        case Environment.production:
          if (info.baseUrl.contains('localhost') || info.baseUrl.contains('127.0.0.1')) {
            issues.add('Production environment should not use localhost');
          }
          if (!info.baseUrl.startsWith('https://')) {
            issues.add('Production environment should use HTTPS');
          }
          break;
          
        case Environment.staging:
          if (!info.baseUrl.startsWith('https://')) {
            warnings.add('Staging environment should typically use HTTPS');
          }
          break;
      }
      
      // Debug mode vs environment consistency check
      if (kDebugMode && info.isProduction) {
        warnings.add('Debug mode is enabled but environment is set to production');
      }
      
      if (!kDebugMode && info.isDevelopment) {
        warnings.add('Release mode but environment is set to development');
      }
      
      final isValid = issues.isEmpty;
      final result = EnvironmentValidationResult(
        isValid: isValid,
        issues: issues,
        warnings: warnings,
        environmentInfo: info,
      );
      
      if (isValid) {
        _logger.i('✅ Environment validation passed');
        if (warnings.isNotEmpty) {
          _logger.w('⚠️ Environment warnings: ${warnings.join(', ')}');
        }
      } else {
        _logger.e('❌ Environment validation failed: ${issues.join(', ')}');
      }
      
      return result;
      
    } catch (e) {
      _logger.e('Environment validation error: $e');
      return EnvironmentValidationResult(
        isValid: false,
        issues: ['Validation error: $e'],
        warnings: [],
        environmentInfo: await getEnvironmentInfo(),
      );
    }
  }
  
  /// Test connection for current environment
  static Future<bool> testEnvironmentConnection() async {
    try {
      _logger.d('🧪 Testing environment connection...');
      return await ConfigService.testConnection();
    } catch (e) {
      _logger.e('Environment connection test failed: $e');
      return false;
    }
  }
  
  /// Get all available environments with their URLs
  static Map<Environment, String> getAllEnvironmentUrls() {
    return {
      Environment.development: EnvConfig.developmentUrl,
      Environment.staging: EnvConfig.stagingUrl,
      Environment.production: EnvConfig.productionUrl,
    };
  }
  
  /// Reset environment to auto-detected default
  static Future<void> resetToAutoDetected() async {
    try {
      _logger.i('🔄 Resetting environment to auto-detected...');
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_lastKnownEnvironmentKey);
      await prefs.remove(_environmentOverrideKey);
      
      final autoEnv = EnvConfig.autoDetectedEnvironment;
      await ConfigService.setEnvironment(autoEnv);
      
      final info = await getEnvironmentInfo();
      _environmentController.add(info);
      
      _logger.i('✅ Environment reset to: ${autoEnv.name}');
    } catch (e) {
      _logger.e('❌ Failed to reset environment: $e');
      rethrow;
    }
  }
  
  /// Dispose resources
  static void dispose() {
    _environmentController.close();
  }
}

/// Environment information data class
class EnvironmentInfo {
  final Environment environment;
  final String baseUrl;
  final String graphqlUrl;
  final String websocketUrl;
  final bool isDevelopment;
  final bool isStaging;
  final bool isProduction;
  final bool isDebugMode;
  final DateTime lastUpdate;

  const EnvironmentInfo({
    required this.environment,
    required this.baseUrl,
    required this.graphqlUrl,
    required this.websocketUrl,
    required this.isDevelopment,
    required this.isStaging,
    required this.isProduction,
    required this.isDebugMode,
    required this.lastUpdate,
  });

  @override
  String toString() {
    return 'EnvironmentInfo('
        'environment: ${environment.name}, '
        'baseUrl: $baseUrl, '
        'isDebugMode: $isDebugMode'
        ')';
  }

  Map<String, dynamic> toMap() {
    return {
      'environment': environment.name,
      'baseUrl': baseUrl,
      'graphqlUrl': graphqlUrl,
      'websocketUrl': websocketUrl,
      'isDevelopment': isDevelopment,
      'isStaging': isStaging,
      'isProduction': isProduction,
      'isDebugMode': isDebugMode,
      'lastUpdate': lastUpdate.toIso8601String(),
    };
  }
}

/// Environment validation result
class EnvironmentValidationResult {
  final bool isValid;
  final List<String> issues;
  final List<String> warnings;
  final EnvironmentInfo environmentInfo;

  const EnvironmentValidationResult({
    required this.isValid,
    required this.issues,
    required this.warnings,
    required this.environmentInfo,
  });

  bool get hasIssues => issues.isNotEmpty;
  bool get hasWarnings => warnings.isNotEmpty;
  bool get hasAnyProblems => hasIssues || hasWarnings;

  @override
  String toString() {
    return 'EnvironmentValidationResult('
        'isValid: $isValid, '
        'issues: ${issues.length}, '
        'warnings: ${warnings.length}'
        ')';
  }
}