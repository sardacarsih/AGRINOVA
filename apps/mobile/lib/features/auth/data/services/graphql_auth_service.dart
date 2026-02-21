import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';

import '../../../../core/network/graphql_client_service.dart';
import '../../../../core/graphql/auth_queries.dart';
import '../../../../core/models/jwt_models.dart';
import '../../../../core/services/device_service.dart';

/// GraphQL-based authentication service for Go GraphQL API
///
/// Features:
/// - JWT authentication with GraphQL mutations
/// - Device binding and trust management
/// - Offline token validation
/// - Automatic token refresh
/// - Device registration and management
class GraphQLAuthService {
  final GraphQLClientService _graphqlClient;
  final Logger _logger = Logger();

  GraphQLAuthService({
    required GraphQLClientService graphqlClient,
  }) : _graphqlClient = graphqlClient;

  /// Login with username and password using mobileLogin mutation
  Future<JWTLoginResponse> login(JWTLoginRequest request) async {
    try {
      _logger.i('🔐 Attempting GraphQL login for user: ${request.username}');

      // Get device information for login
      final deviceInfo = await DeviceService.getDeviceInfo();

      // Execute login mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.loginOptions(
          identifier: request.username,
          password: request.password,
          deviceId: request.deviceId,
          deviceFingerprint: request.fingerprint ?? deviceInfo.fingerprint,
          platform: request.platform ?? deviceInfo.platform,
        ),
      );

      if (result.hasException) {
        if (result.exception!.graphqlErrors.isNotEmpty) {
          for (final error in result.exception!.graphqlErrors) {
            _logger.e('  GraphQL Error: ${error.message}');
            _logger.e('  Locations: ${error.locations}');
            _logger.e('  Path: ${error.path}');
          }
        }
        if (result.exception!.linkException != null) {
          _logger.e('  Link Exception: ${result.exception!.linkException}');
        }
        throw Exception('Login failed: ${result.exception.toString()}');
      }

      final data = result.data?['mobileLogin'];
      if (data == null) {
        throw Exception('Invalid response from server (data is null)');
      }

      _logger.d('Raw Login Data: $data');

      try {
        final loginResponse = JWTLoginResponse.fromJson(data);

        _logger.i('✅ GraphQL login successful');
        _logger.i('   User: ${loginResponse.user.username}');
        _logger.i('   Role: ${loginResponse.user.role}');
        _logger.i('   Device trusted: ${loginResponse.deviceTrusted}');

        return loginResponse;
      } catch (parseError) {
        _logger.e('JSON Parsing Error: $parseError');
        rethrow;
      }
    } catch (e) {
      _logger.e('❌ GraphQL login error: $e');
      rethrow;
    }
  }

  /// Refresh JWT access token
  Future<JWTRefreshResponse> refreshToken(JWTRefreshRequest request) async {
    try {
      _logger.d('🔄 Refreshing JWT token via GraphQL');

      // Get device information if not provided
      final deviceInfo = await DeviceService.getDeviceInfo();

      // Execute refresh token mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.refreshTokenOptions(
          refreshToken: request.refreshToken,
          deviceId: request.deviceId ?? deviceInfo.deviceId,
          fingerprint: request.fingerprint ?? deviceInfo.fingerprint,
        ),
      );

      if (result.hasException) {
        _logger.e('❌ GraphQL token refresh failed: ${result.exception}');
        throw Exception(
            'Token refresh failed: ${result.exception?.toString()}');
      }

      final refreshData = result.data?['refreshToken'];
      if (refreshData == null) {
        throw Exception('Token refresh failed: Invalid response from server');
      }

      // Parse refresh response
      final refreshResponse = JWTRefreshResponse.fromJson(refreshData);

      _logger.d('✅ GraphQL token refresh successful');
      return refreshResponse;
    } catch (e) {
      _logger.e('❌ GraphQL token refresh error: $e');
      rethrow;
    }
  }

  /// Logout and invalidate tokens
  Future<void> logout({String? deviceId}) async {
    try {
      _logger.i('🚪 Logging out via GraphQL');

      // Execute logout mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.logoutOptions(deviceId: deviceId),
      );

      if (result.hasException) {
        _logger.w(
            '⚠️ GraphQL logout completed with exceptions: ${result.exception}');
        // Don't throw exception for logout, just log the warning
      } else {
        _logger.i('✅ GraphQL logout successful');
      }
    } catch (e) {
      _logger.e('❌ GraphQL logout error: $e');
      // Don't rethrow for logout errors
    }
  }

  /// Change password for the current authenticated user
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
    bool logoutOtherDevices = false,
  }) async {
    try {
      _logger.i('Updating password via GraphQL');

      final result = await _graphqlClient.mutate(
        AuthQueries.changePasswordOptions(
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: newPassword,
          logoutOtherDevices: logoutOtherDevices,
        ),
      );

      if (result.hasException) {
        final gqlErrors = result.exception?.graphqlErrors;
        final firstMessage = (gqlErrors != null && gqlErrors.isNotEmpty)
            ? gqlErrors.first.message
            : null;
        throw Exception(firstMessage ?? 'Failed to change password');
      }

      final success = result.data?['changePassword'] as bool?;
      if (success != true) {
        throw Exception('Failed to change password');
      }

      _logger.i('Password updated successfully');
      return true;
    } catch (e) {
      _logger.e('Password update error: $e');
      rethrow;
    }
  }

  /// Validate offline token
  Future<JWTOfflineValidationResponse> validateOfflineToken(
    JWTOfflineValidationRequest request,
  ) async {
    try {
      _logger.d('📴 Validating offline token via GraphQL');

      // Execute offline validation mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.validateOfflineTokenOptions(
          offlineToken: request.offlineToken,
          deviceId: request.deviceId,
          fingerprint: request.fingerprint,
        ),
      );

      if (result.hasException) {
        _logger.e(
            '❌ GraphQL offline token validation failed: ${result.exception}');
        throw Exception(
            'Offline validation failed: ${result.exception.toString()}');
      }

      final validationData = result.data?['validateOfflineToken'];
      if (validationData == null) {
        throw Exception(
            'Offline validation failed: Invalid response from server');
      }

      // Parse validation response
      final validationResponse =
          JWTOfflineValidationResponse.fromJson(validationData);

      _logger.d('✅ GraphQL offline token validation completed');
      return validationResponse;
    } catch (e) {
      _logger.e('❌ GraphQL offline token validation error: $e');
      rethrow;
    }
  }

  /// Register device for JWT authentication
  Future<void> registerDevice(DeviceRegistrationRequest request) async {
    try {
      _logger.i('📱 Registering device via GraphQL');

      // Execute device registration mutation
      final result = await _graphqlClient.mutate(
        AuthQueries.registerDeviceOptions(
          deviceId: request.deviceId,
          fingerprint: request.fingerprint,
          platform: request.platform,
          osVersion: request.osVersion,
          appVersion: request.appVersion,
        ),
      );

      if (result.hasException) {
        _logger.e('❌ GraphQL device registration failed: ${result.exception}');
        throw Exception(
            'Device registration failed: ${result.exception?.toString()}');
      }

      final registrationData = result.data?['registerDevice'];
      if (registrationData == null || !(registrationData['success'] ?? false)) {
        throw Exception(
            'Device registration failed: Invalid response from server');
      }

      _logger.i('✅ GraphQL device registration successful');
      _logger.i('   Device ID: ${request.deviceId}');
      _logger.i('   Trusted: ${registrationData['trusted'] ?? false}');
    } catch (e) {
      _logger.e('❌ GraphQL device registration error: $e');
      rethrow;
    }
  }

  /// Revoke device access
  Future<void> revokeDevice(String deviceId) async {
    try {
      _logger.i('🚫 Revoking device access via GraphQL: $deviceId');

      // Execute device revocation mutation
      final result = await _graphqlClient.mutate(
        MutationOptions(
          document: gql(AuthQueries.revokeDeviceMutation),
          variables: {'deviceId': deviceId},
          errorPolicy: ErrorPolicy.all,
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );

      if (result.hasException) {
        _logger.e('❌ GraphQL device revocation failed: ${result.exception}');
        throw Exception(
            'Device revocation failed: ${result.exception?.toString()}');
      }

      final revocationData = result.data?['revokeDevice'];
      if (revocationData == null || !(revocationData['success'] ?? false)) {
        throw Exception(
            'Device revocation failed: Invalid response from server');
      }

      _logger.i('✅ GraphQL device revocation successful');
    } catch (e) {
      _logger.e('❌ GraphQL device revocation error: $e');
      rethrow;
    }
  }

  /// Trust device for enhanced security
  Future<void> trustDevice(String deviceId) async {
    try {
      _logger.i('✅ Trusting device via GraphQL: $deviceId');

      // Execute device trust mutation
      final result = await _graphqlClient.mutate(
        MutationOptions(
          document: gql(AuthQueries.trustDeviceMutation),
          variables: {'deviceId': deviceId},
          errorPolicy: ErrorPolicy.all,
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );

      if (result.hasException) {
        _logger.e('❌ GraphQL device trust failed: ${result.exception}');
        throw Exception('Device trust failed: ${result.exception?.toString()}');
      }

      final trustData = result.data?['trustDevice'];
      if (trustData == null || !(trustData['success'] ?? false)) {
        throw Exception('Device trust failed: Invalid response from server');
      }

      _logger.i('✅ GraphQL device trust successful');
    } catch (e) {
      _logger.e('❌ GraphQL device trust error: $e');
      rethrow;
    }
  }

  /// Get current user information
  Future<User?> getCurrentUser() async {
    try {
      _logger.d('👤 Getting current user via GraphQL');

      // Execute get current user query
      final result =
          await _graphqlClient.query(AuthQueries.getCurrentUserOptions());

      if (result.hasException) {
        _logger.e('❌ GraphQL get current user failed: ${result.exception}');
        return null;
      }

      final userData = result.data?['me'];
      if (userData == null) {
        return null;
      }

      // Parse user information
      final userInfo = User.fromJson(userData);

      _logger.d('✅ GraphQL get current user successful');
      return userInfo;
    } catch (e) {
      _logger.e('❌ GraphQL get current user error: $e');
      return null;
    }
  }

  /// Get user devices
  Future<List<DeviceInfo>> getUserDevices() async {
    try {
      _logger.d('📱 Getting user devices via GraphQL');

      // Execute get user devices query
      final result =
          await _graphqlClient.query(AuthQueries.getUserDevicesOptions());

      if (result.hasException) {
        _logger.e('❌ GraphQL get user devices failed: ${result.exception}');
        return [];
      }

      final devicesData = result.data?['userDevices'] as List<dynamic>?;
      if (devicesData == null) {
        return [];
      }

      // Parse devices information
      final devices = devicesData
          .map((deviceData) =>
              DeviceInfo.fromJson(deviceData as Map<String, dynamic>))
          .toList();

      _logger.d(
          '✅ GraphQL get user devices successful: ${devices.length} devices');
      return devices;
    } catch (e) {
      _logger.e('❌ GraphQL get user devices error: $e');
      return [];
    }
  }

  /// Test authentication connection
  Future<bool> testConnection() async {
    try {
      return await _graphqlClient.testConnection();
    } catch (e) {
      _logger.e('❌ GraphQL auth connection test error: $e');
      return false;
    }
  }
}
