import 'dart:async';

import '../../../../core/models/jwt_models.dart';
import '../../../../core/services/user_sync_service.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';
import '../../../../core/services/connectivity_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;
  final ConnectivityService _connectivityService;

  final StreamController<bool> _authStatusController =
      StreamController<bool>.broadcast();

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required AuthLocalDataSource localDataSource,
    required ConnectivityService connectivityService,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _connectivityService = connectivityService;

  @override
  Stream<bool> get authStatusStream => _authStatusController.stream;

  @override
  Future<JWTLoginResponse> login(JWTLoginRequest request) async {
    if (!_connectivityService.isOnline) {
      throw Exception(
          'Network offline. Please use offline login if available.');
    }

    final response = await _remoteDataSource.login(request);

    // Save everything locally
    await _localDataSource.saveAuthData(
      response,
      rememberDevice: request.rememberDevice ?? false,
    );

    // Store offline credential verifier only when remember-device is enabled.
    if (request.rememberDevice ?? false) {
      await _localDataSource.saveOfflineCredentials(
        request.username,
        request.password,
      );
    } else {
      await _localDataSource.clearOfflineCredentials();
    }

    // Best-effort sync to SQLite users table for relational lookups
    // (e.g. profile supervisor from manager_id/reporting hierarchy).
    try {
      final companyId = _resolveCompanyId(response.user);
      if (companyId != null) {
        await UserSyncService()
            .syncUserDataToLocal(response.user, response.session, companyId);
      }
    } catch (_) {
      // Never block login if local relational sync fails.
    }

    _authStatusController.add(true);
    return response;
  }

  @override
  Future<JWTLoginResponse> authenticateOffline(
      String username, String password) async {
    try {
      final normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.isEmpty || password.isEmpty) {
        throw Exception(
            'Username and password are required for offline login.');
      }

      // Offline login must rely on offline token validity.
      final hasValidOfflineAuth = await _localDataSource.hasValidOfflineAuth();
      if (!hasValidOfflineAuth) {
        throw Exception(
            'No valid offline session found. Please login online first.');
      }

      // Reconstruct stored user and validate that requested user matches.
      final user = await _localDataSource.getUser();
      if (user == null) {
        throw Exception('Corrupted offline data.');
      }

      if (user.username.trim().toLowerCase() != normalizedUsername) {
        throw Exception('Offline login user mismatch.');
      }

      // Verify password against secure offline credential verifier.
      final passwordValid = await _localDataSource.verifyOfflineCredentials(
        user.username,
        password,
      );
      if (!passwordValid) {
        throw Exception('Invalid username or password for offline login.');
      }

      // If biometric is enabled, require biometric verification for offline entry.
      final biometricEnabled = await _localDataSource.isBiometricEnabled();
      final biometricAvailable = await _localDataSource.isBiometricSupported();
      if (biometricEnabled && biometricAvailable) {
        final biometricOk = await _localDataSource.authenticateBiometric(
          reason: 'Verifikasi biometrik untuk akses offline',
          allowFallback: false,
          checkEnabled: true,
        );
        if (!biometricOk) {
          throw Exception('Biometric verification required for offline login.');
        }
      }

      final token = await _localDataSource.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Corrupted offline data.');
      }

      _authStatusController.add(true);
      return JWTLoginResponse(
        accessToken: token,
        refreshToken: '',
        user: user,
        tokenType: 'Bearer',
        expiresIn: 3600,
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
        deviceTrusted: await _localDataSource.isDeviceTrusted(),
      );
    } catch (_) {
      _authStatusController.add(false);
      rethrow;
    }
  }

  @override
  Future<void> logout() async {
    // 1. Try API logout (best effort)
    try {
      if (_connectivityService.isOnline) {
        // We might need device ID, but let's make it optional in source
        await _remoteDataSource.logout(null);
      }
    } catch (_) {
      // Ignore network errors on logout
    }

    // 2. Clear local data
    await _localDataSource.clearAuthData();
    _authStatusController.add(false);
  }

  @override
  Future<void> emergencyLogout() async {
    _authStatusController.add(false); // UI Update first
    _localDataSource.emergencyClearAuthData(); // Fire and forget
    // API call in background if needed, but emergency implies local cleanup priority
  }

  @override
  Future<JWTRefreshResponse> refreshToken(JWTRefreshRequest request) async {
    final response = await _remoteDataSource.refreshToken(request);
    await _localDataSource.saveRefreshData(response);
    return response;
  }

  // --- Biometrics ---

  @override
  Future<bool> isBiometricSupported() =>
      _localDataSource.isBiometricSupported();

  @override
  Future<bool> isBiometricEnabled() => _localDataSource.isBiometricEnabled();

  @override
  Future<bool> isBiometricAvailable() =>
      _localDataSource.isBiometricSupported(); // Alias

  @override
  Future<bool> setupBiometric(bool enable, String reason) async {
    if (enable) {
      final success = await _localDataSource.authenticateBiometric(
        reason: reason,
        allowFallback: false,
        checkEnabled: false,
      );
      if (success) {
        await _localDataSource.setBiometricEnabled(true);
        return true;
      }
      return false;
    } else {
      await _localDataSource.setBiometricEnabled(false);
      return true;
    }
  }

  @override
  Future<bool> authenticateWithBiometric() async {
    final success = await _localDataSource.authenticateBiometric(
      reason: 'Autentikasi biometrik untuk masuk ke Agrinova',
      allowFallback: false,
      checkEnabled: true,
    );
    if (success) {
      _authStatusController.add(true);
    }
    return success;
  }

  // --- Device ---

  @override
  Future<void> registerDevice(DeviceRegistrationRequest request) {
    return _remoteDataSource.registerDevice(request);
  }

  @override
  Future<bool> requestDeviceTrust() async {
    try {
      // Logic: Call API, then update local status
      // For now, we reuse registerDevice logic or similar
      // Example:
      // await _remoteDataSource.registerDevice(...);
      // await _localDataSource.setDeviceTrusted(true);
      return true;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> changePassword(
    String currentPassword,
    String newPassword, {
    bool logoutOtherDevices = false,
  }) async {
    if (!_connectivityService.isOnline) {
      throw Exception(
        'Ubah password membutuhkan koneksi internet. Silakan coba saat online.',
      );
    }

    final changed = await _remoteDataSource.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
      logoutOtherDevices: logoutOtherDevices,
    );

    if (changed) {
      final user = await _localDataSource.getUser();
      final hasOfflineSession = await _localDataSource.hasValidOfflineAuth();
      if (user != null && hasOfflineSession) {
        await _localDataSource.saveOfflineCredentials(
          user.username,
          newPassword,
        );
      } else {
        await _localDataSource.clearOfflineCredentials();
      }
    }

    return changed;
  }

  String? _resolveCompanyId(User user) {
    final directCompanyId = user.companyId?.trim();
    if (directCompanyId != null && directCompanyId.isNotEmpty) {
      return directCompanyId;
    }

    final effectiveCompanies = user.getEffectiveCompanies();
    if (effectiveCompanies.isEmpty) return null;

    final firstCompany = effectiveCompanies.first.trim();
    return firstCompany.isEmpty ? null : firstCompany;
  }
}
