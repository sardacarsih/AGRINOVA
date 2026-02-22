import 'dart:developer' as developer;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/env_config.dart';
import '../constants/api_constants.dart';
import '../di/service_locator.dart';
import '../services/config_service.dart';
import '../services/fcm_service.dart';

void _debugLog(Object? message) {
  developer.log(message?.toString() ?? 'null');
}


/// Handles the initialization of the application.
class AppInitializer {
  static bool _initialized = false;
  static bool get isInitialized => _initialized;

  /// Runs all necessary initialization tasks.
  /// 
  /// This should be called from the Splash Screen or before the app
  /// needs fully initialized services.
  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      _debugLog('🚀 AppInitializer: Starting initialization...');
      
      // Register background message handler BEFORE Firebase.initializeApp
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      
      // Initialize Firebase
      await Firebase.initializeApp();
      _debugLog('✅ AppInitializer: Firebase initialized');
      
      // Initialize Hive for local storage
      await Hive.initFlutter();
      _debugLog('✅ AppInitializer: Hive initialized');
      
      // Initialize configuration service
      await _initializeConfiguration();
      
      // Initialize dependency injection
      await ServiceLocator.initialize();
      _debugLog('✅ AppInitializer: ServiceLocator initialized');
      
      // Set preferred orientations
      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
      
      _initialized = true;
      _debugLog('🚀 AppInitializer: Initialization completed successfully');
    } catch (e, stackTrace) {
      _debugLog('❌ AppInitializer: Initialization failed: $e');
      _debugLog(stackTrace);
      // Re-throw to let the caller handle it (e.g., show error screen)
      rethrow;
    }
  }

  /// Initialize configuration service
  static Future<void> _initializeConfiguration() async {
    try {
      _debugLog('🔧 AppInitializer: Starting configuration initialization...');
      _debugLog('📋 Compile-time env: ${EnvConfig.toMap()}');

      // Initialize ConfigService
      final config = await ConfigService.initialize();
      
      // Update ApiConstants with configuration
      _debugLog('📡 Setting ApiConstants base URL from: ${ApiConstants.baseUrl}');
      ApiConstants.setBaseUrl(config.baseUrl);
      _debugLog('📡 ApiConstants base URL updated to: ${ApiConstants.baseUrl}');
      
      _debugLog('✅ Configuration initialization completed');
      _debugLog('   Environment: ${config.environment.name}');
      _debugLog('   Base URL: ${config.baseUrl}');
      
      // Add a small delay to ensure config is fully propagated
      await Future.delayed(const Duration(milliseconds: 100));
      
    } catch (e) {
      _debugLog('❌ Configuration initialization failed: $e');
      _debugLog('🔄 Using fallback configuration...');
      
      // Fallback to default configuration
      ApiConstants.resetBaseUrl();
      _debugLog('📡 ApiConstants reset to fallback: ${ApiConstants.baseUrl}');
    }
  }
}


