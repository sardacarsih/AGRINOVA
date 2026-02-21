import 'dart:async';
import '../../../../core/models/jwt_models.dart';

abstract class AuthRepository {
  Stream<bool> get authStatusStream;

  // Core Auth
  Future<JWTLoginResponse> login(JWTLoginRequest request);
  Future<void> logout();
  Future<JWTRefreshResponse> refreshToken(JWTRefreshRequest request);

  // Biometrics
  Future<bool> isBiometricSupported();
  Future<bool> isBiometricEnabled();
  Future<bool> isBiometricAvailable();
  Future<bool> setupBiometric(bool enable, String reason);
  Future<bool> authenticateWithBiometric();

  // Device & Security
  Future<void> registerDevice(DeviceRegistrationRequest request);
  Future<bool> requestDeviceTrust();
  Future<bool> changePassword(
    String currentPassword,
    String newPassword, {
    bool logoutOtherDevices = false,
  });

  // Offline
  Future<JWTLoginResponse> authenticateOffline(
      String username, String password);
  Future<void> emergencyLogout();
}
