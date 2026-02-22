import 'package:graphql_flutter/graphql_flutter.dart';

import 'auth_queries.dart';
import '../models/jwt_models.dart';

/// GraphQL service for authentication operations
class GraphQLAuthService {
  final GraphQLClient _client;

  GraphQLAuthService(this._client);

  /// Login with identifier and password - Updated for Go GraphQL API
  Future<AuthPayload> login({
    required String identifier,
    required String password,
    String? deviceId,
    String? deviceFingerprint,
    String platform = 'ANDROID',
    bool rememberDevice = true,
  }) async {
    // rememberDevice kept for API compatibility with callers.
    // Current GraphQL MobileLoginInput does not define this field.
    final _ = rememberDevice;

    final options = MutationOptions(
      document: gql(AuthQueries.loginMutation),
      variables: {
        'input': {
          'identifier': identifier,
          'password': password,
          'deviceId': ?deviceId,
          'deviceFingerprint': ?deviceFingerprint,
          'platform': platform,
        },
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      throw Exception('Login failed: ${result.exception.toString()}');
    }

    final data = result.data?['mobileLogin'];
    if (data == null) {
      throw Exception('Invalid response from server');
    }

    return AuthPayload.fromJson(data);
  }

  /// Refresh JWT token
  Future<AuthPayload> refreshToken({
    required String refreshToken,
    required String deviceId,
    required String deviceFingerprint,
  }) async {
    final options = MutationOptions(
      document: gql(AuthQueries.refreshTokenMutation),
      variables: {
        'input': {
          'refreshToken': refreshToken,
          'deviceId': deviceId,
          'deviceFingerprint': deviceFingerprint,
        },
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      throw Exception('Token refresh failed: ${result.exception.toString()}');
    }

    final data = result.data?['refreshToken'];
    if (data == null) {
      throw Exception('Invalid response from server');
    }

    return AuthPayload.fromJson(data);
  }

  /// Renew access+refresh tokens using offline/session token.
  /// Call this when refreshToken() fails with REFRESH_EXPIRED or REFRESH_REVOKED.
  Future<AuthPayload> deviceRenew({
    required String offlineToken,
    required String deviceId,
    String? deviceFingerprint,
  }) async {
    final options = MutationOptions(
      document: gql(AuthQueries.deviceRenewMutation),
      variables: {
        'input': {
          'offlineToken': offlineToken,
          'deviceId': deviceId,
          'deviceFingerprint': ?deviceFingerprint,
        },
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      // Surface SESSION_EXPIRED / SESSION_REVOKED specifically so callers can
      // distinguish "must re-login" from generic network errors.
      final gqlErrors = result.exception?.graphqlErrors ?? [];
      for (final error in gqlErrors) {
        final code = error.extensions?['code'] as String?;
        if (code == 'SESSION_EXPIRED' || code == 'SESSION_REVOKED') {
          throw Exception('$code: ${error.message}');
        }
      }
      throw Exception('Device renew failed: ${result.exception.toString()}');
    }

    final data = result.data?['deviceRenew'];
    if (data == null) {
      throw Exception('Invalid response from server');
    }

    return AuthPayload.fromJson(data);
  }

  /// Logout current user
  Future<void> logout({String? deviceId}) async {
    final options = MutationOptions(
      document: gql(AuthQueries.logoutMutation),
      variables: {
        'deviceId': deviceId,
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      throw Exception('Logout failed: ${result.exception.toString()}');
    }
  }

  /// Validate offline token
  Future<JWTOfflineValidationResponse> validateOfflineToken({
    required String offlineToken,
    required String deviceId,
    required String deviceFingerprint,
  }) async {
    final options = MutationOptions(
      document: gql(AuthQueries.validateOfflineTokenMutation),
      variables: {
        'input': {
          'offlineToken': offlineToken,
          'deviceId': deviceId,
          'deviceFingerprint': deviceFingerprint,
        },
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      throw Exception(
          'Offline token validation failed: ${result.exception.toString()}');
    }

    final data = result.data?['validateOfflineToken'];
    if (data == null) {
      throw Exception('Invalid response from server');
    }

    return JWTOfflineValidationResponse.fromJson(data);
  }

  /// Register device for authentication
  Future<void> registerDevice({
    required String deviceId,
    required String deviceFingerprint,
    required String platform,
    required String osVersion,
    required String appVersion,
  }) async {
    final options = MutationOptions(
      document: gql(AuthQueries.registerDeviceMutation),
      variables: {
        'input': {
          'deviceId': deviceId,
          'deviceFingerprint': deviceFingerprint,
          'platform': platform,
          'osVersion': osVersion,
          'appVersion': appVersion,
        },
      },
    );

    final result = await _client.mutate(options);

    if (result.hasException) {
      throw Exception(
          'Device registration failed: ${result.exception.toString()}');
    }

    final data = result.data?['registerDevice'];
    if (data == null || !(data['success'] ?? false)) {
      throw Exception('Device registration failed');
    }
  }
}
