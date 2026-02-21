import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../services/connectivity_service.dart';
import '../services/device_service.dart';

/// Debug helper class for troubleshooting authentication issues
class AuthDebugHelper {
  static void printSystemInfo() {
    print('═══════════════════════════════════════');
    print('🔍 AGRINOVA FLUTTER AUTHENTICATION DEBUG');
    print('═══════════════════════════════════════');
    print('📱 Platform: ${defaultTargetPlatform.name}');
    print('🐛 Debug Mode: ${kDebugMode}');
    print('🌐 Base URL: ${ApiConstants.baseUrl}');
    print('🔗 Full API URL: ${ApiConstants.baseUrl}');
    print('📅 Current Time: ${DateTime.now().toIso8601String()}');
    print('═══════════════════════════════════════');
  }

  static Future<void> testConnectivity() async {
    print('\n🌐 CONNECTIVITY TEST');
    print('───────────────────');
    
    try {
      final dio = Dio();
      dio.options.baseUrl = ApiConstants.baseUrl;
      dio.options.connectTimeout = const Duration(seconds: 10);
      
      // Test basic connectivity
      print('Testing connection to: ${ApiConstants.baseUrl}');
      
      final healthResponse = await dio.get('/health');
      print('✅ Health Check: ${healthResponse.statusCode}');
      
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
          print('✅ Unified Auth Endpoint Reachable: ${authResponse.statusCode} (Expected error for test data)');
        } else {
          print('⚠️ Unified Auth Endpoint Response: ${authResponse.statusCode}');
        }
      } catch (e) {
        print('❌ Unified Auth Endpoint Error: $e');
      }
      
    } catch (e) {
      print('❌ Connectivity Error: $e');
      print('💡 Check if API server is running on ${ApiConstants.baseUrl}');
    }
  }

  static Future<void> testDeviceInfo() async {
    print('\n📱 DEVICE INFO TEST');
    print('──────────────────');
    
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();
      print('✅ Device ID: ${deviceInfo.deviceId}');
      print('✅ Device Fingerprint: ${deviceInfo.fingerprint}');
      print('✅ Platform: ${deviceInfo.platform}');
      print('✅ Model: ${deviceInfo.model}');
      print('✅ Brand: ${deviceInfo.brand}');
    } catch (e) {
      print('❌ Device Info Error: $e');
    }
  }

  static Future<void> testAuthRequest({
    required String username,
    required String password,
  }) async {
    print('\n🔐 AUTHENTICATION REQUEST TEST');
    print('─────────────────────────────');
    
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
      
      print('📤 Request URL: ${dio.options.baseUrl}/auth/login');
      print('📤 Request Headers: ${dio.options.headers}');
      print('📤 Request Data: $requestData');
      
      final response = await dio.post(
        '/auth/login',
        data: requestData,
        options: Options(
          validateStatus: (status) => status != null,
        ),
      );
      
      print('📥 Response Status: ${response.statusCode}');
      print('📥 Response Headers: ${response.headers}');
      print('📥 Response Data: ${response.data}');
      
      if (response.statusCode == 200) {
        print('✅ Authentication Successful!');
      } else if (response.statusCode == 401) {
        print('❌ Authentication Failed: Invalid credentials');
        print('💡 Check username/password or ensure user exists in database');
      } else {
        print('⚠️ Unexpected Response: ${response.statusCode}');
      }
      
    } catch (e) {
      print('❌ Authentication Request Error: $e');
      
      if (e is DioException) {
        print('🔍 DioException Details:');
        print('   Type: ${e.type}');
        print('   Message: ${e.message}');
        print('   Response: ${e.response?.data}');
        print('   Status Code: ${e.response?.statusCode}');
      }
    }
  }

  static Future<void> runFullDiagnostic({
    String username = 'mandor1',
    String password = 'password123',
  }) async {
    print('🚀 Running Full Authentication Diagnostic...\n');
    
    printSystemInfo();
    await testConnectivity();
    await testDeviceInfo();
    await testAuthRequest(username: username, password: password);
    
    print('\n💡 TROUBLESHOOTING TIPS:');
    print('──────────────────────');
    print('1. Ensure API server is running on ${ApiConstants.baseUrl}');
    print('2. Check if user credentials exist in database');
    print('3. Verify network connectivity on device/emulator');
    print('4. Check server logs for detailed error messages');
    print('5. Ensure Flutter app has internet permissions');
    print('═══════════════════════════════════════\n');
  }

  static void printNetworkStatus(NetworkStatus status) {
    final statusIcon = switch (status) {
      NetworkStatus.online => '🟢',
      NetworkStatus.offline => '🔴', 
      NetworkStatus.checking => '🟡',
    };
    
    print('$statusIcon Network Status: ${status.name.toUpperCase()}');
  }

  static void printAuthError(dynamic error) {
    print('\n❌ AUTHENTICATION ERROR');
    print('─────────────────────');
    print('Error Type: ${error.runtimeType}');
    print('Error Message: $error');
    
    if (error is DioException) {
      print('DioException Type: ${error.type}');
      print('HTTP Status: ${error.response?.statusCode}');
      print('Response Data: ${error.response?.data}');
      
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
          print('💡 Solution: Check internet connection and increase timeout');
          break;
        case DioExceptionType.badResponse:
          if (error.response?.statusCode == 401) {
            print('💡 Solution: Verify username/password credentials');
          } else if (error.response?.statusCode == 500) {
            print('💡 Solution: Check server logs for internal errors');
          }
          break;
        case DioExceptionType.connectionError:
          print('💡 Solution: Ensure API server is running and accessible');
          break;
        default:
          print('💡 Solution: Check network connectivity and server status');
      }
    }
  }
}