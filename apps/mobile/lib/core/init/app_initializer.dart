import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/env_config.dart';
import '../constants/api_constants.dart';
import '../di/service_locator.dart';
import '../services/config_service.dart';
import '../services/fcm_service.dart';

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
      print('🚀 AppInitializer: Starting initialization...');
      
      // Register background message handler BEFORE Firebase.initializeApp
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      
      // Initialize Firebase
      await Firebase.initializeApp();
      print('✅ AppInitializer: Firebase initialized');
      
      // Initialize Hive for local storage
      await Hive.initFlutter();
      print('✅ AppInitializer: Hive initialized');
      
      // Initialize configuration service
      await _initializeConfiguration();
      
      // Initialize dependency injection
      await ServiceLocator.initialize();
      print('✅ AppInitializer: ServiceLocator initialized');
      
      // Set preferred orientations
      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
      
      _initialized = true;
      print('🚀 AppInitializer: Initialization completed successfully');
    } catch (e, stackTrace) {
      print('❌ AppInitializer: Initialization failed: $e');
      print(stackTrace);
      // Re-throw to let the caller handle it (e.g., show error screen)
      rethrow;
    }
  }

  /// Initialize configuration service
  static Future<void> _initializeConfiguration() async {
    try {
      print('🔧 AppInitializer: Starting configuration initialization...');
      print('📋 Compile-time env: ${EnvConfig.toMap()}');

      // Initialize ConfigService
      final config = await ConfigService.initialize();
      
      // Update ApiConstants with configuration
      print('📡 Setting ApiConstants base URL from: ${ApiConstants.baseUrl}');
      ApiConstants.setBaseUrl(config.baseUrl);
      print('📡 ApiConstants base URL updated to: ${ApiConstants.baseUrl}');
      
      print('✅ Configuration initialization completed');
      print('   Environment: ${config.environment.name}');
      print('   Base URL: ${config.baseUrl}');
      
      // Add a small delay to ensure config is fully propagated
      await Future.delayed(const Duration(milliseconds: 100));
      
    } catch (e) {
      print('❌ Configuration initialization failed: $e');
      print('🔄 Using fallback configuration...');
      
      // Fallback to default configuration
      ApiConstants.resetBaseUrl();
      print('📡 ApiConstants reset to fallback: ${ApiConstants.baseUrl}');
    }
  }
}
