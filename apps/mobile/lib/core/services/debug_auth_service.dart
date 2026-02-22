import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../constants/api_constants.dart';
import '../network/graphql_client_service.dart';
import '../graphql/auth_queries.dart';
import '../services/device_service.dart';
import '../services/connectivity_service.dart';
import '../services/jwt_storage_service.dart';
import '../services/database_service.dart';
import '../di/service_locator.dart';

/// Test results model for debug authentication tests
class DebugTestResult {
  final String testName;
  final bool success;
  final String message;
  final Map<String, dynamic>? details;
  final DateTime timestamp;

  DebugTestResult({
    required this.testName,
    required this.success,
    required this.message,
    this.details,
  }) : timestamp = DateTime.now();

  String get icon => success ? '✅' : '❌';
  String get statusText => success ? 'PASS' : 'FAIL';
}

/// Comprehensive debug authentication service for diagnosing auth issues
/// Specifically designed for testing with satpam/demo123 credentials
class DebugAuthService {
  final GraphQLClientService _graphqlClient;
  final ConnectivityService _connectivityService;
  final JWTStorageService _jwtStorage;
  final DatabaseService _databaseService;

  DebugAuthService({
    required GraphQLClientService graphqlClient,
    required ConnectivityService connectivityService,
    required JWTStorageService jwtStorage,
    required DatabaseService databaseService,
  })  : _graphqlClient = graphqlClient,
        _connectivityService = connectivityService,
        _jwtStorage = jwtStorage,
        _databaseService = databaseService;


  /// Run comprehensive authentication diagnostics
  Future<List<DebugTestResult>> runComprehensiveDiagnostics({
    String username = 'satpam',
    String password = 'demo123',
  }) async {
    final results = <DebugTestResult>[];

    // 1. System Information Test
    results.add(await _testSystemInformation());

    // 2. Network Connectivity Test
    results.add(await _testNetworkConnectivity());

    // 3. GraphQL Server Health Test
    results.add(await _testGraphQLServerHealth());

    // 4. Device Information Test
    results.add(await _testDeviceInformation());

    // 5. Database Functionality Test
    results.add(await _testDatabaseFunctionality());

    // 6. GraphQL Authentication Test
    results.add(await _testGraphQLAuthentication(username, password));

    // 7. JWT Token Storage Test
    results.add(await _testJWTTokenStorage());

    // 8. Offline Token Validation Test
    results.add(await _testOfflineTokenValidation());

    return results;
  }

  /// Test system information and environment
  Future<DebugTestResult> _testSystemInformation() async {
    try {
      final details = {
        'platform': defaultTargetPlatform.name,
        'debugMode': kDebugMode,
        'baseUrl': ApiConstants.baseUrl,
        'graphqlEndpoint': '${ApiConstants.baseUrl}/graphql',
        'appVersion': ApiConstants.appVersion,
        'buildMode': kDebugMode ? 'Debug' : 'Release',
        'timestamp': DateTime.now().toIso8601String(),
      };

      return DebugTestResult(
        testName: 'System Information',
        success: true,
        message: 'System environment detected successfully',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'System Information',
        success: false,
        message: 'Failed to gather system information: $e',
      );
    }
  }

  /// Test network connectivity to GraphQL server
  Future<DebugTestResult> _testNetworkConnectivity() async {
    try {
      await _connectivityService.initialize();
      final isOnline = _connectivityService.isOnline;

      if (!isOnline) {
        return DebugTestResult(
          testName: 'Network Connectivity',
          success: false,
          message: 'Device is offline or no network connection detected',
        );
      }

      // Test basic HTTP connectivity to server
      final dio = Dio();
      dio.options.baseUrl = ApiConstants.baseUrl;
      dio.options.connectTimeout = const Duration(seconds: 10);
      dio.options.receiveTimeout = const Duration(seconds: 10);

      try {
        final response = await dio.get('/health');
        
        final details = {
          'isOnline': isOnline,
          'serverUrl': ApiConstants.baseUrl,
          'healthStatus': response.statusCode,
          'healthResponse': response.data,
          'responseTime': '${response.extra['response_time'] ?? 'N/A'}ms',
        };

        return DebugTestResult(
          testName: 'Network Connectivity',
          success: response.statusCode == 200,
          message: response.statusCode == 200 
              ? 'Successfully connected to GraphQL server'
              : 'Server responded with status ${response.statusCode}',
          details: details,
        );
      } catch (e) {
        return DebugTestResult(
          testName: 'Network Connectivity',
          success: false,
          message: 'Failed to connect to server: $e',
          details: {
            'isOnline': isOnline,
            'serverUrl': ApiConstants.baseUrl,
            'error': e.toString(),
          },
        );
      }
    } catch (e) {
      return DebugTestResult(
        testName: 'Network Connectivity',
        success: false,
        message: 'Network connectivity test failed: $e',
      );
    }
  }

  /// Test GraphQL server health and endpoint availability
  Future<DebugTestResult> _testGraphQLServerHealth() async {
    try {
      // Test GraphQL endpoint accessibility
      final testQuery = r'''
        query TestConnection {
          __schema {
            types {
              name
            }
          }
        }
      ''';

      final result = await _graphqlClient.query(
        QueryOptions(
          document: gql(testQuery),
          fetchPolicy: FetchPolicy.networkOnly,
          errorPolicy: ErrorPolicy.all,
        ),
      );

      if (result.hasException) {
        return DebugTestResult(
          testName: 'GraphQL Server Health',
          success: false,
          message: 'GraphQL endpoint error: ${result.exception}',
          details: {
            'endpoint': '${ApiConstants.baseUrl}/graphql',
            'exception': result.exception.toString(),
          },
        );
      }

      // Check if mobile login mutation is available
      final introspectionQuery = r'''
        query IntrospectionQuery {
          __schema {
            mutationType {
              fields {
                name
                type {
                  name
                }
              }
            }
          }
        }
      ''';

      final introspectionResult = await _graphqlClient.query(
        QueryOptions(
          document: gql(introspectionQuery),
          fetchPolicy: FetchPolicy.networkOnly,
          errorPolicy: ErrorPolicy.all,
        ),
      );

      final mutations = introspectionResult.data?['__schema']?['mutationType']?['fields'] as List<dynamic>? ?? [];
      final hasMobileLogin = mutations.any((mutation) => mutation['name'] == 'mobileLogin');

      final details = {
        'endpoint': '${ApiConstants.baseUrl}/graphql',
        'schemaAccessible': !result.hasException,
        'mobileLoginAvailable': hasMobileLogin,
        'totalMutations': mutations.length,
        'availableMutations': mutations.map((m) => m['name']).take(10).toList(),
      };

      return DebugTestResult(
        testName: 'GraphQL Server Health',
        success: !result.hasException && hasMobileLogin,
        message: hasMobileLogin 
            ? 'GraphQL server healthy, mobileLogin mutation available'
            : 'GraphQL server accessible but mobileLogin mutation not found',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'GraphQL Server Health',
        success: false,
        message: 'GraphQL server health check failed: $e',
      );
    }
  }

  /// Test device information gathering
  Future<DebugTestResult> _testDeviceInformation() async {
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();

      final details = {
        'deviceId': deviceInfo.deviceId,
        'fingerprint': deviceInfo.fingerprint,
        'platform': deviceInfo.platform,
        'model': deviceInfo.model,
        'brand': deviceInfo.brand,
        'osVersion': deviceInfo.osVersion,
        'appVersion': deviceInfo.appVersion,
      };

      final isValid = deviceInfo.deviceId.isNotEmpty && 
                     deviceInfo.fingerprint.isNotEmpty && 
                     deviceInfo.platform.isNotEmpty;

      return DebugTestResult(
        testName: 'Device Information',
        success: isValid,
        message: isValid 
            ? 'Device information gathered successfully'
            : 'Incomplete device information detected',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'Device Information',
        success: false,
        message: 'Failed to gather device information: $e',
      );
    }
  }

  /// Test SQLite database functionality
  Future<DebugTestResult> _testDatabaseFunctionality() async {
    try {
      // Test database operations
      final testData = {
        'testKey': 'debugTestValue_${DateTime.now().millisecondsSinceEpoch}',
        'timestamp': DateTime.now().toIso8601String(),
      };

      // Try to perform a basic database operation
      final database = await _databaseService.database;
      
      // Test table creation and basic operations
      await database.execute('''
        CREATE TABLE IF NOT EXISTS debug_test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_key TEXT,
          test_value TEXT,
          created_at TEXT
        )
      ''');

      // Insert test data
      await database.insert('debug_test', {
        'test_key': testData['testKey'],
        'test_value': 'test_value',
        'created_at': testData['timestamp'],
      });

      // Query test data
      final result = await database.query(
        'debug_test',
        where: 'test_key = ?',
        whereArgs: [testData['testKey']],
      );

      // Clean up test data
      await database.delete(
        'debug_test',
        where: 'test_key = ?',
        whereArgs: [testData['testKey']],
      );

      final details = {
        'databasePath': database.path,
        'testDataInserted': result.isNotEmpty,
        'testOperation': 'CREATE, INSERT, SELECT, DELETE',
        'testKey': testData['testKey'],
      };

      return DebugTestResult(
        testName: 'Database Functionality',
        success: result.isNotEmpty,
        message: result.isNotEmpty 
            ? 'SQLite database functioning correctly'
            : 'Database operations failed',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'Database Functionality',
        success: false,
        message: 'Database functionality test failed: $e',
      );
    }
  }

  /// Test GraphQL authentication with specific credentials
  Future<DebugTestResult> _testGraphQLAuthentication(String username, String password) async {
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();

      // Execute mobileLogin mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.loginOptions(
          identifier: username,
          password: password,
          deviceId: deviceInfo.deviceId,
          deviceFingerprint: deviceInfo.fingerprint,
          platform: deviceInfo.platform,
        ),
      );

      if (result.hasException) {
        final details = {
          'username': username,
          'deviceId': deviceInfo.deviceId,
          'platform': deviceInfo.platform,
          'exception': result.exception.toString(),
          'graphqlErrors': result.exception?.graphqlErrors.map((e) => e.message).toList(),
          'linkException': result.exception?.linkException?.toString(),
        };

        return DebugTestResult(
          testName: 'GraphQL Authentication',
          success: false,
          message: 'Authentication failed: ${result.exception}',
          details: details,
        );
      }

      final loginData = result.data?['mobileLogin'];
      if (loginData == null) {
        return DebugTestResult(
          testName: 'GraphQL Authentication',
          success: false,
          message: 'Authentication failed: No login data returned',
        );
      }

      final details = {
        'username': username,
        'userId': loginData['user']?['id'],
        'userRole': loginData['user']?['role'],
        'hasAccessToken': loginData['accessToken'] != null,
        'hasRefreshToken': loginData['refreshToken'] != null,
        'hasOfflineToken': loginData['offlineToken'] != null,
        'tokenType': loginData['tokenType'],
        'expiresIn': loginData['expiresIn'],
        'expiresAt': loginData['expiresAt'],
        'companyAssignments': loginData['assignments']?['companies']?.length ?? 0,
        'estateAssignments': loginData['assignments']?['estates']?.length ?? 0,
        'divisionAssignments': loginData['assignments']?['divisions']?.length ?? 0,
      };

      return DebugTestResult(
        testName: 'GraphQL Authentication',
        success: true,
        message: 'Authentication successful for $username with role ${loginData['user']?['role']}',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'GraphQL Authentication',
        success: false,
        message: 'Authentication test failed: $e',
      );
    }
  }

  /// Test JWT token storage functionality
  Future<DebugTestResult> _testJWTTokenStorage() async {
    try {
      // Test token retrieval functionality
      final storedAccessToken = await _jwtStorage.getAccessToken();
      final storedRefreshToken = await _jwtStorage.getRefreshToken();
      final storedOfflineToken = await _jwtStorage.getOfflineToken();
      
      // Test authentication status methods
      final isAuthenticated = await _jwtStorage.isAuthenticated();
      final hasValidOfflineAuth = await _jwtStorage.hasValidOfflineAuth();
      final needsRefresh = await _jwtStorage.needsTokenRefresh();
      final isDeviceTrusted = await _jwtStorage.isDeviceTrusted();

      final details = {
        'hasAccessToken': storedAccessToken != null && storedAccessToken.isNotEmpty,
        'hasRefreshToken': storedRefreshToken != null && storedRefreshToken.isNotEmpty,
        'hasOfflineToken': storedOfflineToken != null && storedOfflineToken.isNotEmpty,
        'isAuthenticated': isAuthenticated,
        'hasValidOfflineAuth': hasValidOfflineAuth,
        'needsTokenRefresh': needsRefresh,
        'isDeviceTrusted': isDeviceTrusted,
        'secureStorageAvailable': true,
      };

      final hasTokens = (storedAccessToken != null && storedAccessToken.isNotEmpty) ||
                       (storedOfflineToken != null && storedOfflineToken.isNotEmpty);

      return DebugTestResult(
        testName: 'JWT Token Storage',
        success: true,
        message: hasTokens 
            ? 'JWT storage working, found existing tokens'
            : 'JWT storage accessible but no tokens present (login first)',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'JWT Token Storage',
        success: false,
        message: 'JWT token storage test failed: $e',
      );
    }
  }

  /// Test offline token validation
  Future<DebugTestResult> _testOfflineTokenValidation() async {
    try {
      // Check if there are existing offline tokens to validate
      final hasOfflineAuth = await _jwtStorage.hasValidOfflineAuth();
      final offlineToken = await _jwtStorage.getOfflineToken();

      if (!hasOfflineAuth || offlineToken == null || offlineToken.isEmpty) {
        return DebugTestResult(
          testName: 'Offline Token Validation',
          success: true,
          message: 'No offline tokens available for validation (not an error)',
          details: {
            'hasOfflineAuth': hasOfflineAuth,
            'offlineTokenExists': offlineToken != null && offlineToken.isNotEmpty,
            'note': 'Login first to generate offline tokens for testing',
          },
        );
      }

      final deviceInfo = await DeviceService.getDeviceInfo();

      // Execute offline token validation
      final result = await _graphqlClient.mutate(
        AuthQueries.validateOfflineTokenOptions(
          offlineToken: offlineToken,
          deviceId: deviceInfo.deviceId,
          fingerprint: deviceInfo.fingerprint,
        ),
      );

      if (result.hasException) {
        return DebugTestResult(
          testName: 'Offline Token Validation',
          success: false,
          message: 'Offline token validation failed: ${result.exception}',
          details: {
            'hasOfflineToken': true,
            'tokenLength': offlineToken.length,
            'exception': result.exception.toString(),
          },
        );
      }

      final validationData = result.data?['validateOfflineToken'];
      final isValid = validationData?['valid'] == true;

      final details = {
        'hasOfflineToken': true,
        'tokenLength': offlineToken.length,
        'validationSuccess': validationData?['success'] == true,
        'tokenValid': isValid,
        'validUntil': validationData?['validUntil'],
        'userInfo': validationData?['user'],
        'deviceTrusted': validationData?['device']?['trusted'],
      };

      return DebugTestResult(
        testName: 'Offline Token Validation',
        success: isValid,
        message: isValid 
            ? 'Offline token is valid and working'
            : 'Offline token validation failed or token is invalid',
        details: details,
      );
    } catch (e) {
      return DebugTestResult(
        testName: 'Offline Token Validation',
        success: false,
        message: 'Offline token validation test failed: $e',
      );
    }
  }

  /// Generate diagnostic report
  String generateDiagnosticReport(List<DebugTestResult> results) {
    final buffer = StringBuffer();
    
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('🔍 AGRINOVA AUTHENTICATION DIAGNOSTICS');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('Generated: ${DateTime.now().toLocal()}');
    buffer.writeln('Target Credentials: satpam/demo123');
    buffer.writeln('GraphQL Endpoint: ${ApiConstants.baseUrl}/graphql');
    buffer.writeln('');

    for (final result in results) {
      buffer.writeln('${result.icon} ${result.testName}: ${result.statusText}');
      buffer.writeln('   Message: ${result.message}');
      
      if (result.details != null && result.details!.isNotEmpty) {
        buffer.writeln('   Details:');
        for (final entry in result.details!.entries) {
          buffer.writeln('     ${entry.key}: ${entry.value}');
        }
      }
      buffer.writeln('   Timestamp: ${result.timestamp.toLocal()}');
      buffer.writeln('');
    }

    // Summary
    final passCount = results.where((r) => r.success).length;
    final totalCount = results.length;
    
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('📊 SUMMARY: $passCount/$totalCount tests passed');
    
    if (passCount == totalCount) {
      buffer.writeln('✅ All tests passed! Authentication system is healthy.');
    } else {
      buffer.writeln('❌ Some tests failed. Review the details above.');
      buffer.writeln('');
      buffer.writeln('💡 TROUBLESHOOTING TIPS:');
      buffer.writeln('1. Ensure GraphQL server is running on ${ApiConstants.baseUrl}');
      buffer.writeln('2. Verify satpam user exists with password demo123');
      buffer.writeln('3. Check network connectivity and ADB reverse tunneling');
      buffer.writeln('4. Review server logs for authentication errors');
      buffer.writeln('5. Ensure app has proper internet permissions');
    }
    
    buffer.writeln('═══════════════════════════════════════');
    
    return buffer.toString();
  }

  /// Factory method to create instance with service locator
  static DebugAuthService create() {
    return DebugAuthService(
      graphqlClient: ServiceLocator.get<GraphQLClientService>(),
      connectivityService: ServiceLocator.get<ConnectivityService>(),
      jwtStorage: ServiceLocator.get<JWTStorageService>(),
      databaseService: ServiceLocator.get<DatabaseService>(),
    );
  }
}

