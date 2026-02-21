import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
import 'package:logger/logger.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';

import '../constants/api_constants.dart';
import '../models/jwt_models.dart';

/// Unified Secure Storage Service
///
/// This service consolidates all secure storage operations in the mobile app,
/// eliminating dual storage patterns and providing a single source of truth
/// for authentication tokens, user data, and configuration settings.
///
/// Architecture:
/// - Secure Storage: FlutterSecureStorage (hardware-backed)
/// - Configuration: SharedPreferences (app settings)
/// - Database: SQLite (business data only - no auth tokens)
///
/// Eliminates:
/// - JWT token storage duplication across 3 services
/// - User data storage fragmentation
/// - Scattered configuration management
class UnifiedSecureStorageService {
  static final Logger _logger = Logger();
  static UnifiedSecureStorageService? _instance;
  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricOwnerUserIdKey = 'biometric_owner_user_id';
  static const String _biometricOwnerUsernameKey = 'biometric_owner_username';
  static const String _rememberDeviceEnabledKey = 'remember_device_enabled';
  static const String _offlineCredentialVerifierKey =
      'offline_credential_verifier';
  static const String _offlineCredentialSaltKey = 'offline_credential_salt';
  static const String _offlineCredentialUsernameKey =
      'offline_credential_username';
  static const int _offlineCredentialIterations = 60000;

  // Storage instances with platform-specific configuration
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: SecurityConstants.androidSharedPrefsName,
      preferencesKeyPrefix: SecurityConstants.secureStorageKeyPrefix,
    ),
    iOptions: IOSOptions(
      groupId: SecurityConstants.iosKeychainGroupId,
      accountName: SecurityConstants.iosKeychainAccountName,
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  SharedPreferences? _preferences;

  // Stream controllers for reactive updates
  static final _authController = StreamController<AuthStatus>.broadcast();
  static final _configController = StreamController<UnifiedConfig>.broadcast();

  UnifiedSecureStorageService._internal();

  static UnifiedSecureStorageService get instance {
    _instance ??= UnifiedSecureStorageService._internal();
    return _instance!;
  }

  // Streams for reactive programming
  static Stream<AuthStatus> get authStatusStream => _authController.stream;
  static Stream<UnifiedConfig> get configStream => _configController.stream;

  /// Initialize the unified storage service
  static Future<void> initialize() async {
    try {
      _logger.i('🔐 Initializing UnifiedSecureStorageService...');

      // Initialize SharedPreferences for configuration storage
      instance._preferences = await SharedPreferences.getInstance();

      // Broadcast initial state
      final authStatus = await getAuthStatus();
      final config = await getUnifiedConfig();

      _authController.add(authStatus);
      _configController.add(config);

      _logger.i('✅ UnifiedSecureStorageService initialized');
      _logger.i(
          '   Auth Status: ${authStatus.isAuthenticated ? "Authenticated" : "Not Authenticated"}');
      _logger.i('   User: ${authStatus.username ?? "Not logged in"}');
      _logger.i('   Role: ${authStatus.role ?? "No role"}');
    } catch (e) {
      _logger.e('❌ UnifiedSecureStorageService initialization failed: $e');
      rethrow;
    }
  }

  // ==================== AUTHENTICATION OPERATIONS ====================

  /// Store complete authentication response from GraphQL API
  /// This replaces the scattered storage methods across multiple services
  static Future<void> storeAuthResponse(AuthPayload response) async {
    try {
      _logger.i('🔐 Storing authentication response...');

      final userJson = response.user.toJson();

      // Store all tokens and user data in secure storage
      await Future.wait([
        _secureStorage.write(
            key: ApiConstants.accessTokenKey, value: response.accessToken),
        _secureStorage.write(
            key: ApiConstants.refreshTokenKey, value: response.refreshToken),
        if (response.offlineToken != null)
          _secureStorage.write(
              key: ApiConstants.offlineTokenKey, value: response.offlineToken!),
        _secureStorage.write(
            key: ApiConstants.userInfoKey, value: jsonEncode(userJson)),
        _secureStorage.write(
            key: 'auth_timestamp', value: DateTime.now().toIso8601String()),
        _secureStorage.write(
            key: 'access_token_expires', value: response.expiresAt),
        if (response.refreshExpiresAt != null)
          _secureStorage.write(
              key: 'refresh_token_expires', value: response.refreshExpiresAt!),
        if (response.offlineExpiresAt != null)
          _secureStorage.write(
              key: 'offline_token_expires', value: response.offlineExpiresAt!),
        if (response.assignments != null)
          _secureStorage.write(
              key: 'user_assignments',
              value: jsonEncode(response.assignments!.toJson())),
      ]);

      // Broadcast authentication status change
      final authStatus = await getAuthStatus();
      _authController.add(authStatus);

      _logger.i('✅ Authentication response stored successfully');
      _logger.i('   User: ${response.user.username} (${response.user.role})');
      _logger.i('   Company: ${response.user.companyName}');
      _logger.i('   Access Token: ${response.accessToken.substring(0, 20)}...');
    } catch (e) {
      _logger.e('❌ Failed to store authentication response: $e');
      rethrow;
    }
  }

  /// Store JWT tokens from login response (legacy compatibility)
  static Future<void> storeLoginTokens(JWTLoginResponse response) async {
    try {
      _logger.i('🔐 Storing login tokens...');

      final userJson = response.user.toJson();

      final offlineExpiresAt = response.offlineExpiresAt;

      await Future.wait([
        _secureStorage.write(
            key: ApiConstants.accessTokenKey, value: response.accessToken),
        _secureStorage.write(
            key: ApiConstants.refreshTokenKey, value: response.refreshToken),
        _secureStorage.write(
            key: ApiConstants.offlineTokenKey, value: response.offlineToken),
        _secureStorage.write(
            key: ApiConstants.deviceBindingKey, value: response.deviceBinding),
        _secureStorage.write(
            key: ApiConstants.userInfoKey, value: jsonEncode(userJson)),
        if (response.session != null)
          _secureStorage.write(
              key: 'session_info',
              value: jsonEncode(response.session!.toJson())),
        _secureStorage.write(
            key: 'access_token_expires',
            value: response.expiresAt.toIso8601String()),
        if (offlineExpiresAt != null)
          _secureStorage.write(
              key: 'offline_token_expires',
              value: offlineExpiresAt.toIso8601String()),
        _secureStorage.write(
            key: 'device_trusted', value: response.deviceTrusted.toString()),
        _secureStorage.write(
            key: 'auth_timestamp', value: DateTime.now().toIso8601String()),
      ]);

      // Broadcast authentication status change
      final authStatus = await getAuthStatus();
      _authController.add(authStatus);

      _logger.i('✅ Login tokens stored successfully');
      _logger.i('   User: ${response.user.username} (${response.user.role})');
    } catch (e) {
      _logger.e('❌ Failed to store login tokens: $e');
      rethrow;
    }
  }

  /// Store tokens from refresh response
  static Future<void> storeRefreshTokens(JWTRefreshResponse response) async {
    try {
      _logger.i('🔐 Storing refreshed tokens...');

      final expiresAt = response.expiresAt;

      await Future.wait([
        _secureStorage.write(
            key: ApiConstants.accessTokenKey, value: response.accessToken),
        _secureStorage.write(
            key: ApiConstants.refreshTokenKey, value: response.refreshToken),
        // If refresh response includes full user info or other fields, update them here
        // But usually refresh just gives new tokens.
        // Assuming JWTRefreshResponse has expiresAt
        if (expiresAt != null)
          _secureStorage.write(
              key: 'access_token_expires', value: expiresAt.toIso8601String()),
        _secureStorage.write(
            key: 'auth_timestamp', value: DateTime.now().toIso8601String()),
      ]);

      _logger.i('✅ Refreshed tokens stored successfully');
    } catch (e) {
      _logger.e('❌ Failed to store refreshed tokens: $e');
      rethrow;
    }
  }

  /// Check if device is trusted
  static Future<bool> isDeviceTrusted() async {
    try {
      final value = await _secureStorage.read(key: 'device_trusted');
      return value == 'true';
    } catch (e) {
      _logger.e('❌ Failed to check device trust: $e');
      return false;
    }
  }

  /// Check if biometric is enabled
  static Future<bool> isBiometricEnabled(
      {String? userId, String? username}) async {
    try {
      final value = await _secureStorage.read(key: _biometricEnabledKey);
      if (value != 'true') return false;

      final ownerUserId =
          await _secureStorage.read(key: _biometricOwnerUserIdKey);
      final ownerUsername =
          await _secureStorage.read(key: _biometricOwnerUsernameKey);

      // Backward compatibility: old installs may not have owner metadata yet.
      if ((ownerUserId == null || ownerUserId.isEmpty) &&
          (ownerUsername == null || ownerUsername.isEmpty)) {
        return true;
      }

      if (userId != null &&
          userId.isNotEmpty &&
          ownerUserId != null &&
          ownerUserId.isNotEmpty) {
        return ownerUserId == userId;
      }

      if (username != null &&
          username.isNotEmpty &&
          ownerUsername != null &&
          ownerUsername.isNotEmpty) {
        return ownerUsername.toLowerCase() == username.toLowerCase();
      }

      final currentUser = await getUserInfo();
      if (currentUser != null) {
        if (ownerUserId != null && ownerUserId.isNotEmpty) {
          return ownerUserId == currentUser.id;
        }
        if (ownerUsername != null && ownerUsername.isNotEmpty) {
          return ownerUsername.toLowerCase() ==
              currentUser.username.toLowerCase();
        }
      }

      // If no user context is available (e.g. login screen before username input),
      // keep enabled and let caller apply additional UI-level filtering.
      return true;
    } catch (e) {
      // Default to false if not set
      return false;
    }
  }

  /// Set biometric enabled status
  static Future<void> setBiometricEnabled(
    bool enabled, {
    String? userId,
    String? username,
  }) async {
    try {
      if (enabled) {
        String? resolvedUserId = userId;
        String? resolvedUsername = username;

        if ((resolvedUserId == null || resolvedUserId.isEmpty) ||
            (resolvedUsername == null || resolvedUsername.isEmpty)) {
          final currentUser = await getUserInfo();
          resolvedUserId ??= currentUser?.id;
          resolvedUsername ??= currentUser?.username;
        }

        final futures = <Future<void>>[
          _secureStorage.write(key: _biometricEnabledKey, value: 'true'),
        ];

        if (resolvedUserId != null && resolvedUserId.isNotEmpty) {
          futures.add(_secureStorage.write(
            key: _biometricOwnerUserIdKey,
            value: resolvedUserId,
          ));
        } else {
          futures.add(_secureStorage.delete(key: _biometricOwnerUserIdKey));
        }

        if (resolvedUsername != null && resolvedUsername.isNotEmpty) {
          futures.add(_secureStorage.write(
            key: _biometricOwnerUsernameKey,
            value: resolvedUsername,
          ));
        } else {
          futures.add(_secureStorage.delete(key: _biometricOwnerUsernameKey));
        }

        await Future.wait(futures);
      } else {
        await Future.wait([
          _secureStorage.write(key: _biometricEnabledKey, value: 'false'),
          _secureStorage.delete(key: _biometricOwnerUserIdKey),
          _secureStorage.delete(key: _biometricOwnerUsernameKey),
        ]);
      }
    } catch (e) {
      _logger.e('❌ Failed to set biometric enabled: $e');
    }
  }

  /// Get biometric owner user ID
  static Future<String?> getBiometricOwnerUserId() async {
    try {
      return await _secureStorage.read(key: _biometricOwnerUserIdKey);
    } catch (e) {
      _logger.e('❌ Failed to get biometric owner user ID: $e');
      return null;
    }
  }

  /// Get biometric owner username
  static Future<String?> getBiometricOwnerUsername() async {
    try {
      return await _secureStorage.read(key: _biometricOwnerUsernameKey);
    } catch (e) {
      _logger.e('❌ Failed to get biometric owner username: $e');
      return null;
    }
  }

  /// Store password verifier for offline login (never stores raw password).
  static Future<void> storeOfflineCredentials({
    required String username,
    required String password,
  }) async {
    try {
      final normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.isEmpty || password.isEmpty) {
        throw Exception('Invalid offline credential input');
      }

      final random = math.Random.secure();
      final saltBytes = List<int>.generate(16, (_) => random.nextInt(256));
      final salt = base64UrlEncode(saltBytes);
      final verifier = _deriveOfflineCredentialVerifier(
        username: normalizedUsername,
        password: password,
        salt: salt,
      );

      await Future.wait([
        _secureStorage.write(
          key: _offlineCredentialUsernameKey,
          value: normalizedUsername,
        ),
        _secureStorage.write(
          key: _offlineCredentialSaltKey,
          value: salt,
        ),
        _secureStorage.write(
          key: _offlineCredentialVerifierKey,
          value: verifier,
        ),
      ]);
    } catch (e) {
      _logger.e('❌ Failed to store offline credentials: $e');
      rethrow;
    }
  }

  /// Verify offline credentials against stored verifier.
  static Future<bool> verifyOfflineCredentials({
    required String username,
    required String password,
  }) async {
    try {
      final normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.isEmpty || password.isEmpty) return false;

      final storedUsername =
          await _secureStorage.read(key: _offlineCredentialUsernameKey);
      final storedSalt =
          await _secureStorage.read(key: _offlineCredentialSaltKey);
      final storedVerifier =
          await _secureStorage.read(key: _offlineCredentialVerifierKey);

      if (storedUsername == null ||
          storedSalt == null ||
          storedVerifier == null) {
        return false;
      }

      if (storedUsername != normalizedUsername) return false;

      final computedVerifier = _deriveOfflineCredentialVerifier(
        username: normalizedUsername,
        password: password,
        salt: storedSalt,
      );

      return _constantTimeEquals(storedVerifier, computedVerifier);
    } catch (e) {
      _logger.e('❌ Failed to verify offline credentials: $e');
      return false;
    }
  }

  /// Remove offline credential verifier artifacts.
  static Future<void> clearOfflineCredentials() async {
    try {
      await Future.wait([
        _secureStorage.delete(key: _offlineCredentialUsernameKey),
        _secureStorage.delete(key: _offlineCredentialSaltKey),
        _secureStorage.delete(key: _offlineCredentialVerifierKey),
      ]);
    } catch (e) {
      _logger.e('❌ Failed to clear offline credentials: $e');
    }
  }

  /// Update access token only (helper for re-auth)
  static Future<void> updateAccessToken(String token) async {
    try {
      await _secureStorage.write(
          key: ApiConstants.accessTokenKey, value: token);
    } catch (e) {
      _logger.e('❌ Failed to update access token: $e');
    }
  }

  /// Update refresh token only (helper for token refresh)
  static Future<void> updateRefreshToken(String token) async {
    try {
      await _secureStorage.write(
          key: ApiConstants.refreshTokenKey, value: token);
    } catch (e) {
      _logger.e('❌ Failed to update refresh token: $e');
    }
  }

  /// Store device info
  static Future<void> storeDeviceInfo(Map<String, dynamic> info) async {
    try {
      await _secureStorage.write(
          key: ApiConstants.deviceInfoKey, value: jsonEncode(info));
    } catch (e) {
      _logger.e('❌ Failed to store device info: $e');
    }
  }

  /// Set device trusted status

  /// Set device trusted status
  static Future<void> setDeviceTrusted(bool trusted) async {
    try {
      await _secureStorage.write(
          key: 'device_trusted', value: trusted.toString());
    } catch (e) {
      _logger.e('❌ Failed to set device trusted: $e');
    }
  }

  /// Save remember-device preference from login flow.
  static Future<void> setRememberDeviceEnabled(bool enabled) async {
    try {
      await _secureStorage.write(
        key: _rememberDeviceEnabledKey,
        value: enabled.toString(),
      );
    } catch (e) {
      _logger.e('❌ Failed to set remember device flag: $e');
    }
  }

  /// Get remember-device preference.
  /// Backward compatibility:
  /// - if flag is missing but tokens exist from previous versions, treat as true.
  static Future<bool> isRememberDeviceEnabled() async {
    try {
      final value = await _secureStorage.read(key: _rememberDeviceEnabledKey);
      if (value == 'true') return true;
      if (value == 'false') return false;

      final legacyAccessToken =
          await _secureStorage.read(key: ApiConstants.accessTokenKey);
      return legacyAccessToken != null && legacyAccessToken.isNotEmpty;
    } catch (e) {
      _logger.e('❌ Failed to read remember device flag: $e');
      return false;
    }
  }

  /// Clear persisted artifacts used for remembered/offline device login.
  static Future<void> clearDeviceRememberingData() async {
    try {
      await Future.wait([
        _secureStorage.delete(key: ApiConstants.offlineTokenKey),
        _secureStorage.delete(key: ApiConstants.deviceBindingKey),
        _secureStorage.delete(key: 'device_trusted'),
        _secureStorage.delete(key: 'offline_token_expires'),
        _secureStorage.delete(key: _offlineCredentialUsernameKey),
        _secureStorage.delete(key: _offlineCredentialSaltKey),
        _secureStorage.delete(key: _offlineCredentialVerifierKey),
      ]);
    } catch (e) {
      _logger.e('❌ Failed to clear remembered device artifacts: $e');
    }
  }

  /// Get access token
  static Future<String?> getAccessToken() async {
    try {
      return await _secureStorage.read(key: ApiConstants.accessTokenKey);
    } catch (e) {
      _logger.e('❌ Failed to get access token: $e');
      return null;
    }
  }

  /// Get refresh token
  static Future<String?> getRefreshToken() async {
    try {
      return await _secureStorage.read(key: ApiConstants.refreshTokenKey);
    } catch (e) {
      _logger.e('❌ Failed to get refresh token: $e');
      return null;
    }
  }

  /// Get offline token
  static Future<String?> getOfflineToken() async {
    try {
      return await _secureStorage.read(key: ApiConstants.offlineTokenKey);
    } catch (e) {
      _logger.e('❌ Failed to get offline token: $e');
      return null;
    }
  }

  /// Get device binding token
  static Future<String?> getDeviceBinding() async {
    try {
      return await _secureStorage.read(key: ApiConstants.deviceBindingKey);
    } catch (e) {
      _logger.e('❌ Failed to get device binding: $e');
      return null;
    }
  }

  /// Get user information
  static Future<User?> getUserInfo() async {
    try {
      final userJson = await _secureStorage.read(key: ApiConstants.userInfoKey);
      if (userJson == null) return null;

      final userMap = jsonDecode(userJson) as Map<String, dynamic>;
      return User.fromJson(userMap);
    } catch (e) {
      _logger.e('❌ Failed to get user info: $e');
      return null;
    }
  }

  /// Get raw user info map from secure storage.
  static Future<Map<String, dynamic>?> getRawUserInfo() async {
    try {
      final userJson = await _secureStorage.read(key: ApiConstants.userInfoKey);
      if (userJson == null || userJson.trim().isEmpty) return null;

      final decoded = jsonDecode(userJson);
      if (decoded is Map<String, dynamic>) return decoded;
      return null;
    } catch (e) {
      _logger.e('Failed to get raw user info: $e');
      return null;
    }
  }

  /// Get avatar string (URL/data-uri) from locally stored user info.
  static Future<String?> getStoredUserAvatar() async {
    try {
      final map = await getRawUserInfo();
      final avatar = map?['avatar'] ?? map?['avatarUrl'] ?? map?['avatar_url'];
      if (avatar == null) return null;
      final text = avatar.toString().trim();
      return text.isEmpty ? null : text;
    } catch (e) {
      _logger.e('Failed to get stored avatar: $e');
      return null;
    }
  }

  /// Patch locally stored profile fields and broadcast auth update.
  static Future<void> updateUserProfileFields({
    required String userId,
    String? fullName,
    String? email,
    String? phoneNumber,
    String? avatar,
    String? companyName,
    String? estate,
    String? division,
    String? managerName,
  }) async {
    try {
      final map = await getRawUserInfo() ?? <String, dynamic>{};
      final currentId = map['id']?.toString();
      if (currentId != null &&
          currentId.isNotEmpty &&
          currentId.trim() != userId.trim()) {
        return;
      }

      map['id'] = userId;
      if (fullName != null) {
        map['fullName'] = fullName;
        map['name'] = fullName;
      }
      if (email != null) map['email'] = email;
      if (phoneNumber != null) map['phoneNumber'] = phoneNumber;
      if (avatar != null) map['avatar'] = avatar;
      if (companyName != null) map['companyName'] = companyName;
      if (estate != null) map['estate'] = estate;
      if (division != null) map['division'] = division;
      if (managerName != null) map['managerName'] = managerName;

      await _secureStorage.write(
        key: ApiConstants.userInfoKey,
        value: jsonEncode(map),
      );

      final authStatus = await getAuthStatus();
      _authController.add(authStatus);
    } catch (e) {
      _logger.e('Failed to update local profile fields: $e');
    }
  }

  /// Check if user is authenticated with proper token validation
  static Future<bool> isAuthenticated() async {
    try {
      final accessToken = await getAccessToken();
      if (accessToken == null) return false;

      // Check if access token is expired
      if (_isTokenExpired(accessToken)) {
        _logger.w('🔐 Access token expired');

        // Check if refresh token is still valid for potential refresh
        final refreshToken = await getRefreshToken();
        if (refreshToken != null && !_isTokenExpired(refreshToken)) {
          _logger.i(
              '🔄 Refresh token still valid, authentication can be refreshed');
          return true; // Can still authenticate via refresh
        }

        _logger.w('❌ Refresh token also expired or missing');
        return false;
      }

      return true;
    } catch (e) {
      _logger.e('❌ Failed to check authentication status: $e');
      return false;
    }
  }

  /// Check if JWT token is expired by parsing its expiry claim
  static bool _isTokenExpired(String token, {Duration buffer = Duration.zero}) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;

      // Decode the payload (second part of JWT)
      String normalizedPayload = base64.normalize(parts[1]);
      final payloadBytes = base64.decode(normalizedPayload);
      final payloadString = utf8.decode(payloadBytes);
      final payloadMap = jsonDecode(payloadString) as Map<String, dynamic>;

      final exp = payloadMap['exp'] as int?;
      if (exp == null) return true;

      final expiry = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      final now = DateTime.now();

      return now.add(buffer).isAfter(expiry);
    } catch (e) {
      _logger.e('❌ Failed to parse token expiry: $e');
      return true; // Assume expired if parsing fails
    }
  }

  /// Check if access token needs refresh (expired or will expire soon)
  static Future<bool> needsTokenRefresh() async {
    try {
      final accessToken = await getAccessToken();
      if (accessToken == null) return true;

      return _isTokenExpired(accessToken, buffer: const Duration(minutes: 5));
    } catch (e) {
      _logger.e('❌ Failed to check token refresh need: $e');
      return true;
    }
  }

  /// Check if offline authentication is valid (for Mandor/Satpam)
  static Future<bool> hasValidOfflineAuth() async {
    try {
      final offlineToken = await getOfflineToken();
      if (offlineToken == null) return false;

      return !_isTokenExpired(offlineToken);
    } catch (e) {
      _logger.e('❌ Failed to check offline auth: $e');
      return false;
    }
  }

  /// Get current username for audit trails
  static Future<String?> getCurrentUsername() async {
    try {
      // First try to get from stored user info
      final user = await getUserInfo();
      if (user?.username != null && user!.username.isNotEmpty) {
        return user.username;
      }

      return null;
    } catch (e) {
      _logger.e('❌ Failed to get current username: $e');
      return null;
    }
  }

  /// Get current user ID for database operations
  static Future<String?> getCurrentUserId() async {
    try {
      final user = await getUserInfo();
      return user?.id;
    } catch (e) {
      _logger.e('❌ Failed to get current user ID: $e');
      return null;
    }
  }

  /// Get authentication status with comprehensive information
  static Future<AuthStatus> getAuthStatus() async {
    try {
      final accessToken = await getAccessToken();
      final refreshToken = await getRefreshToken();
      final offlineToken = await getOfflineToken();
      final user = await getUserInfo();
      final deviceBinding = await getDeviceBinding();
      final isAuthenticated =
          await UnifiedSecureStorageService.isAuthenticated();

      return AuthStatus(
        isAuthenticated: isAuthenticated,
        hasAccessToken: accessToken != null,
        hasRefreshToken: refreshToken != null,
        hasOfflineToken: offlineToken != null,
        hasDeviceBinding: deviceBinding != null,
        user: user,
        lastAuthTime: await _getLastAuthTime(),
      );
    } catch (e) {
      _logger.e('❌ Failed to get auth status: $e');
      return AuthStatus(
        isAuthenticated: false,
        error: e.toString(),
      );
    }
  }

  /// Get authentication headers for API requests
  static Future<Map<String, String>> getAuthHeaders() async {
    final headers = <String, String>{};

    try {
      final accessToken = await getAccessToken();
      if (accessToken != null) {
        headers[ApiConstants.authorizationHeader] =
            '${ApiConstants.bearerPrefix}$accessToken';
      }
    } catch (e) {
      _logger.e('❌ Failed to get auth headers: $e');
    }

    return headers;
  }

  /// Clear all authentication data (logout)
  static Future<void> clearAuthData() async {
    try {
      _logger.i('🧹 Clearing authentication data...');

      // Clear all authentication-related keys
      final authKeys = [
        ApiConstants.accessTokenKey,
        ApiConstants.refreshTokenKey,
        ApiConstants.offlineTokenKey,
        ApiConstants.deviceBindingKey,
        ApiConstants.userInfoKey,
        ApiConstants.deviceInfoKey,
        'session_info',
        'access_token_expires',
        'refresh_token_expires',
        'offline_token_expires',
        'device_trusted',
        'auth_timestamp',
        'user_assignments',
        _rememberDeviceEnabledKey,
        _offlineCredentialUsernameKey,
        _offlineCredentialSaltKey,
        _offlineCredentialVerifierKey,
      ];

      await Future.wait(authKeys.map((key) => _secureStorage.delete(key: key)));

      // Broadcast authentication status change
      _authController.add(AuthStatus(isAuthenticated: false));

      _logger.i('✅ Authentication data cleared successfully');
    } catch (e) {
      _logger.e('❌ Failed to clear authentication data: $e');
      rethrow;
    }
  }

  // ==================== CONFIGURATION OPERATIONS ====================

  /// Get unified configuration
  static Future<UnifiedConfig> getUnifiedConfig() async {
    try {
      final prefs = instance._preferences;
      if (prefs == null) throw Exception('SharedPreferences not initialized');

      return UnifiedConfig(
        environment: prefs.getString('environment') ?? 'development',
        posNumber: prefs.getString('pos_number') ?? 'GATE-01',
        posName: prefs.getString('pos_name') ?? 'Gerbang Utama',
        gateId: prefs.getString('gate_id') ?? 'GATE-01',
        posEnabled: prefs.getBool('pos_enabled') ?? true,
        language: prefs.getString('language') ?? 'id',
        themeMode: prefs.getString('theme_mode') ?? 'system',
        debugMode: prefs.getBool('debug_mode') ?? false,
      );
    } catch (e) {
      _logger.e('❌ Failed to get unified config: $e');
      return UnifiedConfig(error: e.toString());
    }
  }

  /// Update unified configuration
  static Future<void> updateUnifiedConfig(UnifiedConfig config) async {
    try {
      _logger.i('🔧 Updating unified configuration...');

      final prefs = instance._preferences;
      if (prefs == null) throw Exception('SharedPreferences not initialized');

      await Future.wait([
        if (config.environment != null)
          prefs.setString('environment', config.environment!),
        prefs.setString('pos_number', config.posNumber),
        prefs.setString('pos_name', config.posName),
        prefs.setString('gate_id', config.gateId),
        prefs.setBool('pos_enabled', config.posEnabled),
        if (config.language != null)
          prefs.setString('language', config.language!),
        if (config.themeMode != null)
          prefs.setString('theme_mode', config.themeMode!),
        prefs.setBool('debug_mode', config.debugMode),
      ]);

      // Broadcast configuration change
      _configController.add(config);

      _logger.i('✅ Unified configuration updated');
    } catch (e) {
      _logger.e('❌ Failed to update unified config: $e');
      rethrow;
    }
  }

  /// Reset configuration to defaults
  static Future<void> resetConfiguration() async {
    try {
      _logger.i('🔄 Resetting configuration to defaults...');

      final prefs = instance._preferences;
      if (prefs == null) throw Exception('SharedPreferences not initialized');

      final configKeys = [
        'environment',
        'manual_ip',
        'manual_ip_enabled',
        'api_port',
        'pos_number',
        'pos_name',
        'gate_id',
        'pos_enabled',
        'language',
        'theme_mode',
        'debug_mode',
      ];

      await Future.wait(configKeys.map((key) => prefs.remove(key)));

      // Broadcast configuration change
      final defaultConfig = await getUnifiedConfig();
      _configController.add(defaultConfig);

      _logger.i('✅ Configuration reset to defaults');
    } catch (e) {
      _logger.e('❌ Failed to reset configuration: $e');
      rethrow;
    }
  }

  // ==================== UTILITY METHODS ====================

  /// Get last authentication time
  static Future<DateTime?> _getLastAuthTime() async {
    try {
      final authTimeString = await _secureStorage.read(key: 'auth_timestamp');
      if (authTimeString != null) {
        return DateTime.parse(authTimeString);
      }
      return null;
    } catch (e) {
      _logger.e('❌ Failed to get last auth time: $e');
      return null;
    }
  }

  static String _deriveOfflineCredentialVerifier({
    required String username,
    required String password,
    required String salt,
  }) {
    final normalizedSalt = base64Url.normalize(salt);
    final saltBytes = base64Url.decode(normalizedSalt);
    final secretBytes = utf8.encode('$username:$password');

    var digest = sha256.convert([...saltBytes, ...secretBytes]).bytes;
    for (var i = 0; i < _offlineCredentialIterations; i++) {
      digest = sha256.convert([...digest, ...saltBytes, ...secretBytes]).bytes;
    }

    return base64UrlEncode(digest);
  }

  static bool _constantTimeEquals(String a, String b) {
    if (a.length != b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return result == 0;
  }

  /// Emergency clear all data (fire-and-forget)
  static void emergencyClearAll() {
    _logger.w('🚨 Emergency clear all data initiated');

    // Fire-and-forget clearing - don't await
    clearAuthData();
    resetConfiguration();
  }

  /// Dispose resources
  static void dispose() {
    _authController.close();
    _configController.close();
  }
}

// ==================== DATA MODELS ====================

/// Authentication status model
class AuthStatus {
  final bool isAuthenticated;
  final bool hasAccessToken;
  final bool hasRefreshToken;
  final bool hasOfflineToken;
  final bool hasDeviceBinding;
  final User? user;
  final DateTime? lastAuthTime;
  final String? error;

  const AuthStatus({
    required this.isAuthenticated,
    this.hasAccessToken = false,
    this.hasRefreshToken = false,
    this.hasOfflineToken = false,
    this.hasDeviceBinding = false,
    this.user,
    this.lastAuthTime,
    this.error,
  });

  String? get username => user?.username;
  String? get role => user?.role;
  String? get userId => user?.id;
  String? get companyId => user?.companyId;

  @override
  String toString() {
    return 'AuthStatus('
        'isAuthenticated: $isAuthenticated, '
        'user: ${user?.username}, '
        'role: ${user?.role}, '
        'lastAuthTime: $lastAuthTime'
        ')';
  }
}

/// Unified configuration model
class UnifiedConfig {
  final String? environment;
  final String posNumber;
  final String posName;
  final String gateId;
  final bool posEnabled;
  final String? language;
  final String? themeMode;
  final bool debugMode;
  final String? error;

  const UnifiedConfig({
    this.environment,
    this.posNumber = 'GATE-01',
    this.posName = 'Gerbang Utama',
    this.gateId = 'GATE-01',
    this.posEnabled = true,
    this.language,
    this.themeMode,
    this.debugMode = false,
    this.error,
  });

  UnifiedConfig copyWith({
    String? environment,
    String? posNumber,
    String? posName,
    String? gateId,
    bool? posEnabled,
    String? language,
    String? themeMode,
    bool? debugMode,
  }) {
    return UnifiedConfig(
      environment: environment ?? this.environment,
      posNumber: posNumber ?? this.posNumber,
      posName: posName ?? this.posName,
      gateId: gateId ?? this.gateId,
      posEnabled: posEnabled ?? this.posEnabled,
      language: language ?? this.language,
      themeMode: themeMode ?? this.themeMode,
      debugMode: debugMode ?? this.debugMode,
    );
  }

  @override
  String toString() {
    return 'UnifiedConfig('
        'environment: $environment, '
        'posNumber: $posNumber, '
        'posEnabled: $posEnabled, '
        'language: $language, '
        'debugMode: $debugMode'
        ')';
  }
}
