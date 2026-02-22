import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../services/connectivity_service.dart';
import '../services/device_service.dart';

void _debugLog(Object? message) {
  developer.log(message?.toString() ?? 'null');
}


/// Debug helper class for troubleshooting authentication issues
class AuthDebugHelper {
  static void printSystemInfo() {
    _debugLog('═══════════════════════════════════════');
    _debugLog('🔍 AGRINOVA FLUTTER AUTHENTICATION DEBUG');
    _debugLog('═══════════════════════════════════════');
    _debugLog('📱 Platform: ${defaultTargetPlatform.name}');
    _debugLog('🐛 Debug Mode: $kDebugMode');
    _debugLog('🌐 Base URL: ${ApiConstants.baseUrl}');
    _debugLog('🔗 Full API URL: ${ApiConstants.baseUrl}');
    _debugLog('📅 Current Time: ${DateTime.now().toIso8601String()}');
    _debugLog('═══════════════════════════════════════');
  }

  static Future<void> testConnectivity() async {
    _debugLog('\n🌐 CONNECTIVITY TEST');
    _debugLog('───────────────────');
    
    try {
      final dio = Dio();
      dio.options.baseUrl = ApiConstants.baseUrl;
      dio.options.connectTimeout = const Duration(seconds: 10);
      
      // Test basic connectivity
      _debugLog('Testing connection to: ${ApiConstants.baseUrl}');
      
      final healthResponse = await dio.get('/health');
      _debugLog('✅ Health Check: ${healthResponse.statusCode}');
      
      // Test Unified Auth endpoint accessibility
      try {
        final authResponse = await dio.post(
          '/auth/login',
          data: {'test': 'connectivity'},
          options: Options(
            validateStatus: (status) => status != null && status < 500,
          ),
        );
        
        if (authResponse.statusCode == 400 || authResponse.statusCode == 401) {
          _debugLog('✅ Unified Auth Endpoint Reachable: ${authResponse.statusCode} (Expected error for test data)');
        } else {
          _debugLog('⚠️ Unified Auth Endpoint Response: ${authResponse.statusCode}');
        }
      } catch (e) {
        _debugLog('❌ Unified Auth Endpoint Error: $e');
      }
      
    } catch (e) {
      _debugLog('❌ Connectivity Error: $e');
      _debugLog('💡 Check if API server is running on ${ApiConstants.baseUrl}');
    }
  }

  static Future<void> testDeviceInfo() async {
    _debugLog('\n📱 DEVICE INFO TEST');
    _debugLog('──────────────────');
    
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();
      _debugLog('✅ Device ID: ${deviceInfo.deviceId}');
      _debugLog('✅ Device Fingerprint: ${deviceInfo.fingerprint}');
      _debugLog('✅ Platform: ${deviceInfo.platform}');
      _debugLog('✅ Model: ${deviceInfo.model}');
      _debugLog('✅ Brand: ${deviceInfo.brand}');
    } catch (e) {
      _debugLog('❌ Device Info Error: $e');
    }
  }

  static Future<void> testAuthRequest({
    required String username,
    required String password,
  }) async {
    _debugLog('\n🔐 AUTHENTICATION REQUEST TEST');
    _debugLog('─────────────────────────────');
    
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();
      final dio = Dio();
      
      dio.options.baseUrl = ApiConstants.baseUrl;
      dio.options.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ApiConstants.platformHeader: ApiConstants.androidPlatform,
        ApiConstants.clientVersionHeader: ApiConstants.appVersion,
      };
      
      final requestData = {
        'username': username,
        'password': password,
        'deviceId': deviceInfo.deviceId,
        'deviceFingerprint': deviceInfo.fingerprint,
        'rememberDevice': true,
      };
      
      _debugLog('📤 Request URL: ${dio.options.baseUrl}/auth/login');
      _debugLog('📤 Request Headers: ${dio.options.headers}');
      _debugLog('📤 Request Data: $requestData');
      
      final response = await dio.post(
        '/auth/login',
        data: requestData,
        options: Options(
          validateStatus: (status) => status != null,
        ),
      );
      
      _debugLog('📥 Response Status: ${response.statusCode}');
      _debugLog('📥 Response Headers: ${response.headers}');
      _debugLog('📥 Response Data: ${response.data}');
      
      if (response.statusCode == 200) {
        _debugLog('✅ Authentication Successful!');
      } else if (response.statusCode == 401) {
        _debugLog('❌ Authentication Failed: Invalid credentials');
        _debugLog('💡 Check username/password or ensure user exists in database');
      } else {
        _debugLog('⚠️ Unexpected Response: ${response.statusCode}');
      }
      
    } catch (e) {
      _debugLog('❌ Authentication Request Error: $e');
      
      if (e is DioException) {
        _debugLog('🔍 DioException Details:');
        _debugLog('   Type: ${e.type}');
        _debugLog('   Message: ${e.message}');
        _debugLog('   Response: ${e.response?.data}');
        _debugLog('   Status Code: ${e.response?.statusCode}');
      }
    }
  }

  static Future<void> runFullDiagnostic({
    String username = 'mandor1',
    String password = 'password123',
  }) async {
    _debugLog('🚀 Running Full Authentication Diagnostic...\n');
    
    printSystemInfo();
    await testConnectivity();
    await testDeviceInfo();
    await testAuthRequest(username: username, password: password);
    
    _debugLog('\n💡 TROUBLESHOOTING TIPS:');
    _debugLog('──────────────────────');
    _debugLog('1. Ensure API server is running on ${ApiConstants.baseUrl}');
    _debugLog('2. Check if user credentials exist in database');
    _debugLog('3. Verify network connectivity on device/emulator');
    _debugLog('4. Check server logs for detailed error messages');
    _debugLog('5. Ensure Flutter app has internet permissions');
    _debugLog('═══════════════════════════════════════\n');
  }

  static void printNetworkStatus(NetworkStatus status) {
    final statusIcon = switch (status) {
      NetworkStatus.online => '🟢',
      NetworkStatus.offline => '🔴', 
      NetworkStatus.checking => '🟡',
    };
    
    _debugLog('$statusIcon Network Status: ${status.name.toUpperCase()}');
  }

  static void printAuthError(dynamic error) {
    _debugLog('\n❌ AUTHENTICATION ERROR');
    _debugLog('─────────────────────');
    _debugLog('Error Type: ${error.runtimeType}');
    _debugLog('Error Message: $error');
    
    if (error is DioException) {
      _debugLog('DioException Type: ${error.type}');
      _debugLog('HTTP Status: ${error.response?.statusCode}');
      _debugLog('Response Data: ${error.response?.data}');
      
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
          _debugLog('💡 Solution: Check internet connection and increase timeout');
          break;
        case DioExceptionType.badResponse:
          if (error.response?.statusCode == 401) {
            _debugLog('💡 Solution: Verify username/password credentials');
          } else if (error.response?.statusCode == 500) {
            _debugLog('💡 Solution: Check server logs for internal errors');
          }
          break;
        case DioExceptionType.connectionError:
          _debugLog('💡 Solution: Ensure API server is running and accessible');
          break;
        default:
          _debugLog('💡 Solution: Check network connectivity and server status');
      }
    }
  }
}

