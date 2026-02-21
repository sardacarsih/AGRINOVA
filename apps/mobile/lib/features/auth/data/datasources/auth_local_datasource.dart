import '../../../../core/services/unified_secure_storage_service.dart';
import '../../../../core/models/jwt_models.dart';
import '../../../../core/services/biometric_auth_service.dart';
import 'package:local_auth/local_auth.dart';

abstract class AuthLocalDataSource {
  // Token Management
  Future<void> saveAuthData(
    JWTLoginResponse response, {
    required bool rememberDevice,
  });
  Future<void> saveRefreshData(JWTRefreshResponse response);
  Future<void> clearAuthData();
  Future<void> emergencyClearAuthData(); // Fire-and-forget

  // Retrieval
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<User?> getUser();
  Future<bool> hasValidAuth();
  Future<bool> hasValidOfflineAuth();

  // Biometrics
  Future<bool> isBiometricSupported();
  Future<bool> authenticateBiometric({
    String reason,
    bool allowFallback,
    bool checkEnabled,
  });
  Future<void> setBiometricEnabled(bool enabled);
  Future<bool> isBiometricEnabled();
  Future<void> saveOfflineCredentials(String username, String password);
  Future<bool> verifyOfflineCredentials(String username, String password);
  Future<void> clearOfflineCredentials();

  // Device Trust
  Future<void> setDeviceTrusted(bool trusted);
  Future<bool> isDeviceTrusted();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final LocalAuthentication _localAuth;
  final BiometricAuthService _biometricAuthService;

  AuthLocalDataSourceImpl({
    required LocalAuthentication localAuth,
    required BiometricAuthService biometricAuthService,
    // Storage service is static singleton in this codebase, but we can wrap it
  })  : _localAuth = localAuth,
        _biometricAuthService = biometricAuthService;

  @override
  Future<void> saveAuthData(
    JWTLoginResponse response, {
    required bool rememberDevice,
  }) async {
    // Bridge to UnifiedSecureStorageService
    // Only saving one set of tokens now
    await UnifiedSecureStorageService.storeLoginTokens(response);
    await UnifiedSecureStorageService.setRememberDeviceEnabled(rememberDevice);
    if (!rememberDevice) {
      await UnifiedSecureStorageService.clearDeviceRememberingData();
    }
  }

  @override
  Future<void> saveRefreshData(JWTRefreshResponse response) async {
    await UnifiedSecureStorageService.storeRefreshTokens(response);
  }

  @override
  Future<void> clearAuthData() async {
    await UnifiedSecureStorageService.clearAuthData();
  }

  @override
  Future<void> emergencyClearAuthData() async {
    UnifiedSecureStorageService.emergencyClearAll();
  }

  @override
  Future<String?> getAccessToken() =>
      UnifiedSecureStorageService.getAccessToken();

  @override
  Future<String?> getRefreshToken() =>
      UnifiedSecureStorageService.getRefreshToken();

  @override
  Future<User?> getUser() => UnifiedSecureStorageService.getUserInfo();

  @override
  Future<bool> hasValidAuth() => UnifiedSecureStorageService.isAuthenticated();

  @override
  Future<bool> hasValidOfflineAuth() =>
      UnifiedSecureStorageService.hasValidOfflineAuth();

  // --- Biometrics ---

  @override
  Future<bool> isBiometricSupported() async {
    try {
      final capabilities =
          await _biometricAuthService.getBiometricCapabilities();
      return capabilities.isFullySupported;
    } catch (_) {
      final isAvailable = await _localAuth.canCheckBiometrics;
      if (!isAvailable) return false;
      final bios = await _localAuth.getAvailableBiometrics();
      return bios.isNotEmpty;
    }
  }

  @override
  Future<bool> authenticateBiometric({
    String reason = 'Authenticate',
    bool allowFallback = false,
    bool checkEnabled = true,
  }) async {
    try {
      final result = await _biometricAuthService.authenticate(
        reason: reason,
        allowFallback: allowFallback,
        checkEnabled: checkEnabled,
      );
      return result == BiometricAuthResult.success;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<void> setBiometricEnabled(bool enabled) async {
    await UnifiedSecureStorageService.setBiometricEnabled(enabled);
  }

  @override
  Future<bool> isBiometricEnabled() async {
    return await UnifiedSecureStorageService.isBiometricEnabled();
  }

  @override
  Future<void> saveOfflineCredentials(String username, String password) async {
    await UnifiedSecureStorageService.storeOfflineCredentials(
      username: username,
      password: password,
    );
  }

  @override
  Future<bool> verifyOfflineCredentials(String username, String password) {
    return UnifiedSecureStorageService.verifyOfflineCredentials(
      username: username,
      password: password,
    );
  }

  @override
  Future<void> clearOfflineCredentials() async {
    await UnifiedSecureStorageService.clearOfflineCredentials();
  }

  @override
  Future<void> setDeviceTrusted(bool trusted) async {
    await UnifiedSecureStorageService.setDeviceTrusted(trusted);
  }

  @override
  Future<bool> isDeviceTrusted() async {
    return await UnifiedSecureStorageService.isDeviceTrusted();
  }
}
