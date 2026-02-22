import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

import '../models/jwt_models.dart';
import '../graphql/graphql_client.dart';
import '../graphql/auth_service.dart';
import 'jwt_storage_service.dart';
import 'device_service.dart';
import 'biometric_auth_service.dart';
import 'connectivity_service.dart';

/// Comprehensive authentication service for Agrinova mobile app
///
/// Features:
/// - GraphQL authentication with Go server on port 8080
/// - JWT token management with device binding
/// - Offline-first authentication with 30-day validity
/// - Biometric authentication integration
/// - Secure token storage with Flutter Secure Storage
/// - Device fingerprinting and trust management
/// - Auto-refresh token pattern
class AuthService extends ChangeNotifier {
  static final Logger _logger = Logger();

  final AgroGraphQLClient _graphqlClient;
  final JWTStorageService _jwtStorage;
  final BiometricAuthService _biometricAuth;
  final ConnectivityService _connectivity;

  // Authentication state
  AuthUser? _currentUser;
  UserAssignments? _userAssignments;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _lastError;

  // Device info cache
  DeviceInfo? _deviceInfo;

  // Auto-refresh timer
  Timer? _refreshTimer;

  AuthService({
    required AgroGraphQLClient graphqlClient,
    required JWTStorageService jwtStorageService,
    required BiometricAuthService biometricAuthService,
    required ConnectivityService connectivityService,
  })  : _graphqlClient = graphqlClient,
        _jwtStorage = jwtStorageService,
        _biometricAuth = biometricAuthService,
        _connectivity = connectivityService {
    _initializeService();
  }

  // Getters
  AuthUser? get currentUser => _currentUser;
  UserAssignments? get userAssignments => _userAssignments;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
  bool get isOnline => _connectivity.isOnline;

  /// Initialize authentication service
  Future<void> _initializeService() async {
    try {
      _logger.i('Initializing AuthService...');

      // Initialize device info
      _deviceInfo = await DeviceService.getDeviceInfo();
      _logger.d('Device info loaded: ${_deviceInfo!.deviceId}');

      // Check existing authentication
      await _checkExistingAuth();

      // Setup auto-refresh if authenticated
      if (_isAuthenticated) {
        _scheduleTokenRefresh();
      }

      _logger.i('AuthService initialized successfully');
    } catch (e) {
      _logger.e('Failed to initialize AuthService', error: e);
      _lastError = 'Initialization failed: $e';
      notifyListeners();
    }
  }

  /// Check for existing authentication
  Future<void> _checkExistingAuth() async {
    try {
      _setLoading(true);

      // Check online authentication first
      if (_connectivity.isOnline) {
        final accessToken = await _jwtStorage.getAccessToken();
        if (accessToken != null && !_jwtStorage.isTokenExpired(accessToken)) {
          await _loadUserFromStorage();
          _setAuthenticated(true);
          return;
        }

        // Try refresh token
        final refreshToken = await _jwtStorage.getRefreshToken();
        if (refreshToken != null) {
          final success = await _refreshTokenSilently();
          if (success) {
            await _loadUserFromStorage();
            _setAuthenticated(true);
            return;
          }
        }
      }

      // Check offline authentication
      final hasValidOfflineAuth = await _jwtStorage.hasValidOfflineAuth();
      if (hasValidOfflineAuth) {
        await _loadUserFromStorage();
        _setAuthenticated(true);
        _logger.i('Offline authentication available');
        return;
      }

      // No valid authentication found
      _setAuthenticated(false);
    } catch (e) {
      _logger.e('Error checking existing auth', error: e);
      _setAuthenticated(false);
    } finally {
      _setLoading(false);
    }
  }

  /// Login with credentials
  Future<bool> login({
    required String identifier,
    required String password,
    bool useBiometrics = false,
  }) async {
    try {
      _setLoading(true);
      _clearError();

      // Ensure device info is available
      _deviceInfo ??= await DeviceService.getDeviceInfo();

      // Check biometric authentication if requested
      if (useBiometrics) {
        final biometricResult = await _biometricAuth.authenticate();
        if (biometricResult != BiometricAuthResult.success) {
          throw Exception('Biometric authentication failed: $biometricResult');
        }
      }

      // Perform GraphQL login
      final authService = GraphQLAuthService(_graphqlClient.client);
      final authPayload = await authService.login(
        identifier: identifier,
        password: password,
        deviceId: _deviceInfo!.deviceId,
        deviceFingerprint: _deviceInfo!.fingerprint,
        platform: _getPlatformString(),
        rememberDevice: true,
      );

      // Store authentication data
      await _jwtStorage.storeAuthPayload(authPayload);
      await _jwtStorage.storeDeviceInfo(_deviceInfo!);

      // Update GraphQL client token
      await _graphqlClient.updateAuthToken(authPayload.accessToken);

      // Load user data
      _currentUser = authPayload.user;
      _userAssignments = authPayload.assignments;

      _setAuthenticated(true);
      _scheduleTokenRefresh();

      _logger.i('Login successful for user: ${_currentUser!.username}');
      return true;
    } catch (e) {
      _logger.e('Login failed', error: e);
      _setError('Login failed: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Logout user
  Future<void> logout({bool clearBiometrics = false}) async {
    try {
      _setLoading(true);

      // Logout from server if online
      if (_connectivity.isOnline) {
        try {
          final authService = GraphQLAuthService(_graphqlClient.client);
          await authService.logout(deviceId: _deviceInfo?.deviceId);
        } catch (e) {
          _logger.w('Server logout failed (non-critical)', error: e);
        }
      }

      // Clear local storage
      await _jwtStorage.clearTokens();

      // Clear biometric storage if requested
      if (clearBiometrics) {
        await _biometricAuth.clearBiometricData();
      }

      // Update GraphQL client
      await _graphqlClient.updateAuthToken(null);

      // Clear state
      _currentUser = null;
      _userAssignments = null;
      _setAuthenticated(false);
      _cancelTokenRefresh();

      _logger.i('Logout completed');
    } catch (e) {
      _logger.e('Logout error', error: e);
      // Even if logout fails, clear local state
      _currentUser = null;
      _userAssignments = null;
      _setAuthenticated(false);
    } finally {
      _setLoading(false);
    }
  }

  /// Refresh authentication token
  Future<bool> refreshToken() async {
    try {
      if (!_connectivity.isOnline) {
        _logger.w('Cannot refresh token while offline');
        return false;
      }

      final refreshToken = await _jwtStorage.getRefreshToken();
      if (refreshToken == null) {
        _logger.w('No refresh token available');
        return false;
      }

      _deviceInfo ??= await DeviceService.getDeviceInfo();

      final authService = GraphQLAuthService(_graphqlClient.client);
      final authPayload = await authService.refreshToken(
        refreshToken: refreshToken,
        deviceId: _deviceInfo!.deviceId,
        deviceFingerprint: _deviceInfo!.fingerprint,
      );

      // Store new tokens
      await _jwtStorage.storeAuthPayload(authPayload);

      // Update GraphQL client
      await _graphqlClient.updateAuthToken(authPayload.accessToken);

      // AuthPayload.user is non-null by schema contract.
      _currentUser = authPayload.user;

      _setAuthenticated(true);
      _scheduleTokenRefresh();
      _logger.i('Token refresh successful');

      return true;
    } catch (e) {
      _logger.e('Token refresh failed', error: e);
      _setError('Token refresh failed: ${e.toString()}');
      return false;
    }
  }

  /// Silent token refresh (no loading state)
  Future<bool> _refreshTokenSilently() async {
    try {
      return await refreshToken();
    } catch (e) {
      _logger.e('Silent token refresh failed', error: e);
      return false;
    }
  }

  /// Renew access+refresh tokens using the long-lived offline/session token.
  /// Returns true on success, false on failure (including SESSION_EXPIRED).
  Future<bool> deviceRenew() async {
    try {
      if (!_connectivity.isOnline) {
        _logger.w('deviceRenew: cannot renew while offline');
        return false;
      }

      final offlineToken = await _jwtStorage.getOfflineToken();
      if (offlineToken == null) {
        _logger.w('deviceRenew: no offline token available');
        return false;
      }

      _deviceInfo ??= await DeviceService.getDeviceInfo();

      final authService = GraphQLAuthService(_graphqlClient.client);
      final authPayload = await authService.deviceRenew(
        offlineToken: offlineToken,
        deviceId: _deviceInfo!.deviceId,
        deviceFingerprint: _deviceInfo!.fingerprint,
      );

      await _jwtStorage.storeAuthPayload(authPayload);
      await _graphqlClient.updateAuthToken(authPayload.accessToken);

      // AuthPayload.user is non-null by schema contract.
      _currentUser = authPayload.user;

      _setAuthenticated(true);
      _scheduleTokenRefresh();
      _logger.i('deviceRenew successful');
      return true;
    } catch (e) {
      _logger.e('deviceRenew failed', error: e);
      return false;
    }
  }

  /// Ensure a valid access token is available using the 3-tier token strategy:
  ///   Tier 1 — Access token still valid          → proceed immediately
  ///   Tier 2 — Access expired, refresh available → call refreshToken()
  ///   Tier 3 — Refresh expired/revoked           → call deviceRenew()
  ///   All failed                                 → clear session, return false
  ///
  /// Returns true if auth is now valid, false if the user must re-login.
  Future<bool> ensureAuth() async {
    if (!_connectivity.isOnline) {
      _logger.w('ensureAuth: offline, returning current auth state');
      return _isAuthenticated;
    }

    try {
      // Tier 1: access token still valid
      final accessToken = await _jwtStorage.getAccessToken();
      if (accessToken != null && !_jwtStorage.isTokenExpired(accessToken)) {
        _setAuthenticated(true);
        return true;
      }

      // Tier 2: try refresh token
      _logger.i('ensureAuth: access token expired, trying refreshToken...');
      final refreshed = await refreshToken();
      if (refreshed) {
        _logger.i('ensureAuth: refreshToken succeeded');
        _setAuthenticated(true);
        return true;
      }

      // Tier 3: try deviceRenew
      _logger.i('ensureAuth: refreshToken failed, trying deviceRenew...');
      final renewed = await deviceRenew();
      if (renewed) {
        _logger.i('ensureAuth: deviceRenew succeeded');
        _setAuthenticated(true);
        return true;
      }

      // All tiers failed — clear session
      _logger.w('ensureAuth: all auth tiers failed, clearing session');
      _currentUser = null;
      _userAssignments = null;
      _cancelTokenRefresh();
      await _jwtStorage.clearTokens();
      await _graphqlClient.updateAuthToken(null);
      _setAuthenticated(false);
      return false;
    } catch (e) {
      _logger.e('ensureAuth unexpected error', error: e);
      return false;
    }
  }

  /// Load user data from storage
  Future<void> _loadUserFromStorage() async {
    try {
      // Load user info (this would need to be adapted to AuthUser)
      final userJson = await _jwtStorage.getUserInfo();
      if (userJson != null) {
        // Convert legacy User to AuthUser (simplified)
        _currentUser = AuthUser(
          id: userJson.id,
          username: userJson.username,
          name: userJson.fullName,
          email: userJson.email,
          role: userJson.role,
          companyId: userJson.companyId,
          companyName: userJson.companyName,
          permissions: userJson.permissions,
        );
      }

      // Load assignments if available
      // This would need to be implemented in storage service
    } catch (e) {
      _logger.e('Error loading user from storage', error: e);
    }
  }

  /// Schedule automatic token refresh
  void _scheduleTokenRefresh() {
    _cancelTokenRefresh();

    // Schedule refresh 2 minutes before expiration (13 minutes for 15-minute tokens)
    const refreshThreshold = Duration(minutes: 13);

    _refreshTimer = Timer(refreshThreshold, () async {
      if (_isAuthenticated && _connectivity.isOnline) {
        final success = await _refreshTokenSilently();
        if (!success) {
          _logger.w('Scheduled token refresh failed');
          // Don't logout immediately, give user a chance to re-authenticate
        }
      }
    });

    _logger
        .d('Token refresh scheduled in ${refreshThreshold.inMinutes} minutes');
  }

  /// Cancel token refresh timer
  void _cancelTokenRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  /// Check if user has specific permission
  bool hasPermission(String permission) {
    return _currentUser?.permissions?.contains(permission) ?? false;
  }

  /// Check if user has specific role
  bool hasRole(String role) {
    return _currentUser?.role == role;
  }

  /// Get user's companies
  List<AuthCompany> getUserCompanies() {
    return _userAssignments?.companies ?? [];
  }

  /// Get user's estates
  List<AuthEstate> getUserEstates() {
    return _userAssignments?.estates ?? [];
  }

  /// Get user's divisions
  List<AuthDivision> getUserDivisions() {
    return _userAssignments?.divisions ?? [];
  }

  /// Check if offline mode is available
  Future<bool> isOfflineModeAvailable() async {
    return await _jwtStorage.hasValidOfflineAuth();
  }

  /// Get platform string for GraphQL
  String _getPlatformString() {
    if (_deviceInfo?.platform == 'flutter-android') {
      return 'ANDROID';
    } else if (_deviceInfo?.platform == 'flutter-ios') {
      return 'IOS';
    }
    return 'ANDROID'; // Default fallback
  }

  /// Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  /// Set authenticated state
  void _setAuthenticated(bool authenticated) {
    _isAuthenticated = authenticated;
    notifyListeners();
  }

  /// Set error message
  void _setError(String error) {
    _lastError = error;
    notifyListeners();
  }

  /// Clear error message
  void _clearError() {
    _lastError = null;
    notifyListeners();
  }

  /// Force check authentication status
  Future<void> checkAuthStatus() async {
    await _checkExistingAuth();
  }

  /// Get comprehensive auth status for debugging
  Future<Map<String, dynamic>> getAuthStatus() async {
    final storageStatus = await _jwtStorage.getAuthStatus();
    return {
      ...storageStatus,
      'currentUser': _currentUser?.toJson(),
      'userAssignments': _userAssignments?.toJson(),
      'isAuthenticated': _isAuthenticated,
      'isLoading': _isLoading,
      'lastError': _lastError,
      'isOnline': _connectivity.isOnline,
      'deviceInfo': _deviceInfo?.toJson(),
    };
  }

  @override
  void dispose() {
    _cancelTokenRefresh();

    // Null out references to allow garbage collection
    _currentUser = null;
    _userAssignments = null;
    _deviceInfo = null;
    _lastError = null;
    _isAuthenticated = false;
    _isLoading = false;

    _logger.d('AuthService disposed');
    super.dispose();
  }
}


