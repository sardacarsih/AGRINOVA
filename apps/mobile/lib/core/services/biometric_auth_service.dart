// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';
// import 'package:local_auth_ios/local_auth_ios.dart'; // Removed for now
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'device_service.dart';
import 'unified_secure_storage_service.dart';

// Re-export BiometricType from local_auth to avoid conflicts
export 'package:local_auth/local_auth.dart' show BiometricType;

enum BiometricAuthResult {
  success,
  failed,
  cancelled,
  notAvailable,
  notEnrolled,
  temporarilyLocked,
  permanentlyLocked,
  deviceNotSupported,
  biometricDisabled,
}

class BiometricCapabilities {
  final bool isDeviceSupported;
  final bool canCheckBiometrics;
  final List<BiometricType> availableBiometrics;
  final bool isEnrolled;
  final BiometricType strongestBiometric;

  const BiometricCapabilities({
    required this.isDeviceSupported,
    required this.canCheckBiometrics,
    required this.availableBiometrics,
    required this.isEnrolled,
    required this.strongestBiometric,
  });

  bool get hasFingerprint =>
      availableBiometrics.contains(BiometricType.fingerprint);
  bool get hasFaceID => availableBiometrics.contains(BiometricType.face);
  bool get hasIris => availableBiometrics.contains(BiometricType.iris);
  bool get hasStrongBiometric =>
      availableBiometrics.contains(BiometricType.strong);
  bool get isFullySupported =>
      isDeviceSupported && canCheckBiometrics && isEnrolled;
}

class BiometricAuthService {
  static final Logger _logger = Logger();

  final LocalAuthentication _localAuth;

  static const String _biometricFailureCountKey = 'biometric_failure_count';
  static const String _lastBiometricAuthKey = 'last_biometric_auth';
  static const String _biometricTypePreferenceKey = 'biometric_type_preference';

  static const int _maxFailureAttempts = 5;
  static const Duration _lockoutDuration = Duration(minutes: 15);

  BiometricAuthService({required LocalAuthentication localAuth})
    : _localAuth = localAuth;

  /// Check comprehensive biometric capabilities of the device
  Future<BiometricCapabilities> getBiometricCapabilities() async {
    try {
      _logger.d('Checking biometric capabilities...');

      final isSupported = await _localAuth.isDeviceSupported();
      final canCheck = await _localAuth.canCheckBiometrics;
      final availableBiometrics = await _localAuth.getAvailableBiometrics();

      final capabilities = BiometricCapabilities(
        isDeviceSupported: isSupported,
        canCheckBiometrics: canCheck,
        availableBiometrics: _mapBiometricTypes(availableBiometrics),
        isEnrolled: availableBiometrics.isNotEmpty,
        strongestBiometric: _getStrongestBiometric(availableBiometrics),
      );

      _logger.i(
        'Biometric capabilities: '
        'Supported: ${capabilities.isDeviceSupported}, '
        'CanCheck: ${capabilities.canCheckBiometrics}, '
        'Enrolled: ${capabilities.isEnrolled}, '
        'Types: ${capabilities.availableBiometrics}',
      );

      return capabilities;
    } catch (e) {
      _logger.e('Error checking biometric capabilities: $e');
      return const BiometricCapabilities(
        isDeviceSupported: false,
        canCheckBiometrics: false,
        availableBiometrics: [],
        isEnrolled: false,
        strongestBiometric: BiometricType.weak,
      );
    }
  }

  /// Authenticate user with biometrics
  Future<BiometricAuthResult> authenticate({
    String? reason,
    BiometricType? preferredType,
    bool allowFallback = true,
    bool checkEnabled = true,
  }) async {
    try {
      _logger.d('Starting biometric authentication...');

      // Check if biometric is temporarily locked
      if (await _isTemporarilyLocked()) {
        _logger.w('Biometric authentication is temporarily locked');
        return BiometricAuthResult.temporarilyLocked;
      }

      // Check if biometric is enabled
      if (checkEnabled && !await isBiometricEnabled()) {
        _logger.w('Biometric authentication is disabled');
        return BiometricAuthResult.biometricDisabled;
      }

      // Check capabilities
      final capabilities = await getBiometricCapabilities();
      if (!capabilities.isFullySupported) {
        _logger.w('Biometric authentication not fully supported');
        if (!capabilities.isDeviceSupported) {
          return BiometricAuthResult.deviceNotSupported;
        } else if (!capabilities.isEnrolled) {
          return BiometricAuthResult.notEnrolled;
        } else {
          return BiometricAuthResult.notAvailable;
        }
      }

      // Validate preferred type if requested by caller.
      if (preferredType != null &&
          !_isPreferredTypeAvailable(preferredType, capabilities)) {
        _logger.w('Preferred biometric type is not available: $preferredType');
        return BiometricAuthResult.notAvailable;
      }

      // Determine authentication options
      final authReason = reason ?? _getDefaultAuthReason();
      final biometricOnly = !allowFallback;

      // Perform authentication
      final result = await _localAuth.authenticate(
        localizedReason: authReason,
        authMessages: _getAuthMessages(),
        biometricOnly: biometricOnly,
        sensitiveTransaction: true,
        persistAcrossBackgrounding: true,
      );

      if (result) {
        await _handleSuccessfulAuth();
        _logger.i('Biometric authentication successful');
        return BiometricAuthResult.success;
      } else {
        await _handleFailedAuth();
        _logger.w('Biometric authentication failed');
        return BiometricAuthResult.failed;
      }
    } on LocalAuthException catch (e) {
      _logger.e(
        'Biometric authentication local auth error: ${e.code.name} - ${e.description}',
      );
      return _handleLocalAuthException(e);
    } on PlatformException catch (e) {
      _logger.e(
        'Biometric authentication platform error: ${e.code} - ${e.message}',
      );
      return _handleLegacyPlatformException(e);
    } catch (e) {
      _logger.e('Biometric authentication error: $e');
      await _handleFailedAuth();
      return BiometricAuthResult.failed;
    }
  }

  /// Enable biometric authentication for the user
  Future<bool> enableBiometricAuth({String? reason}) async {
    try {
      _logger.d('Enabling biometric authentication...');

      // First, verify user can authenticate with biometrics
      final result = await authenticate(
        reason: reason ?? 'Aktifkan autentikasi biometrik',
        allowFallback: false,
        checkEnabled: false,
      );

      if (result == BiometricAuthResult.success) {
        // Use UnifiedSecureStorageService for consistent storage
        await UnifiedSecureStorageService.setBiometricEnabled(true);

        // Store device binding for security
        final deviceInfo = await DeviceService.getDeviceInfo();
        await UnifiedSecureStorageService.storeDeviceInfo(deviceInfo.toJson());

        _logger.i('Biometric authentication enabled successfully');
        return true;
      } else {
        _logger.w('Failed to enable biometric authentication: $result');
        return false;
      }
    } catch (e) {
      _logger.e('Error enabling biometric authentication: $e');
      return false;
    }
  }

  /// Disable biometric authentication
  Future<void> disableBiometricAuth() async {
    try {
      _logger.d('Disabling biometric authentication...');

      // Use UnifiedSecureStorageService for consistent storage
      await UnifiedSecureStorageService.setBiometricEnabled(false);

      // Clear failure tracking from SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_biometricFailureCountKey);
      await prefs.remove(_lastBiometricAuthKey);
      await prefs.remove(_biometricTypePreferenceKey);

      // Clear biometric data from preferences (device info remains in secure storage)

      _logger.i('Biometric authentication disabled');
    } catch (e) {
      _logger.e('Error disabling biometric authentication: $e');
    }
  }

  /// Check if biometric authentication is enabled
  Future<bool> isBiometricEnabled() async {
    try {
      // Use UnifiedSecureStorageService for consistent storage
      return await UnifiedSecureStorageService.isBiometricEnabled();
    } catch (e) {
      _logger.e('Error checking biometric enabled status: $e');
      return false;
    }
  }

  /// Set preferred biometric type
  Future<void> setPreferredBiometricType(BiometricType type) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_biometricTypePreferenceKey, type.name);
      _logger.d('Preferred biometric type set to: $type');
    } catch (e) {
      _logger.e('Error setting preferred biometric type: $e');
    }
  }

  /// Get preferred biometric type
  Future<BiometricType> getPreferredBiometricType() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final typeName = prefs.getString(_biometricTypePreferenceKey);
      if (typeName != null) {
        return BiometricType.values.firstWhere(
          (type) => type.name == typeName,
          orElse: () => BiometricType.weak,
        );
      }

      // Auto-detect best available biometric
      final capabilities = await getBiometricCapabilities();
      return capabilities.strongestBiometric;
    } catch (e) {
      _logger.e('Error getting preferred biometric type: $e');
      return BiometricType.weak;
    }
  }

  /// Check if biometric is temporarily locked due to failures
  Future<bool> _isTemporarilyLocked() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final failureCount = prefs.getInt(_biometricFailureCountKey) ?? 0;
      final lastAuth = prefs.getString(_lastBiometricAuthKey);

      if (failureCount >= _maxFailureAttempts && lastAuth != null) {
        final lastAuthTime = DateTime.parse(lastAuth);
        final lockoutEnd = lastAuthTime.add(_lockoutDuration);
        return DateTime.now().isBefore(lockoutEnd);
      }

      return false;
    } catch (e) {
      _logger.e('Error checking biometric lock status: $e');
      return false;
    }
  }

  /// Handle successful authentication
  Future<void> _handleSuccessfulAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_biometricFailureCountKey);
      await prefs.setString(
        _lastBiometricAuthKey,
        DateTime.now().toIso8601String(),
      );
    } catch (e) {
      _logger.e('Error handling successful auth: $e');
    }
  }

  /// Handle failed authentication
  Future<void> _handleFailedAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentCount = prefs.getInt(_biometricFailureCountKey) ?? 0;
      await prefs.setInt(_biometricFailureCountKey, currentCount + 1);
      await prefs.setString(
        _lastBiometricAuthKey,
        DateTime.now().toIso8601String(),
      );

      if (currentCount + 1 >= _maxFailureAttempts) {
        _logger.w('Biometric authentication locked due to too many failures');
      }
    } catch (e) {
      _logger.e('Error handling failed auth: $e');
    }
  }

  /// Map platform biometric types to our enum
  /// Note: On Android, the API often returns generic types like 'strong' or 'weak'
  /// instead of specific types like 'fingerprint' or 'face'. We keep all types
  /// to ensure the dropdown shows available options.
  List<BiometricType> _mapBiometricTypes(List<BiometricType> types) {
    // If we have specific types (fingerprint, face, iris), prioritize them
    final specificTypes = types
        .where(
          (type) =>
              type == BiometricType.fingerprint ||
              type == BiometricType.face ||
              type == BiometricType.iris,
        )
        .toList();

    // If we have specific types, return them
    if (specificTypes.isNotEmpty) {
      return specificTypes;
    }

    // Otherwise, return all types including 'strong' and 'weak'
    // Android often returns 'strong' biometric when fingerprint/face is enrolled
    // but doesn't specify which type exactly
    return types.toList();
  }

  /// Get strongest available biometric type
  BiometricType _getStrongestBiometric(List<BiometricType> types) {
    if (types.contains(BiometricType.strong)) return BiometricType.strong;
    if (types.contains(BiometricType.face)) return BiometricType.face;
    if (types.contains(BiometricType.iris)) return BiometricType.iris;
    if (types.contains(BiometricType.fingerprint)) {
      return BiometricType.fingerprint;
    }
    if (types.contains(BiometricType.weak)) return BiometricType.weak;
    return BiometricType.weak;
  }

  bool _isPreferredTypeAvailable(
    BiometricType preferredType,
    BiometricCapabilities capabilities,
  ) {
    switch (preferredType) {
      case BiometricType.strong:
        return capabilities.hasStrongBiometric ||
            capabilities.availableBiometrics.contains(
              BiometricType.fingerprint,
            ) ||
            capabilities.availableBiometrics.contains(BiometricType.face) ||
            capabilities.availableBiometrics.contains(BiometricType.iris);
      case BiometricType.weak:
        return capabilities.availableBiometrics.isNotEmpty;
      case BiometricType.fingerprint:
        return capabilities.hasFingerprint || capabilities.hasStrongBiometric;
      case BiometricType.face:
        return capabilities.hasFaceID || capabilities.hasStrongBiometric;
      case BiometricType.iris:
        return capabilities.hasIris || capabilities.hasStrongBiometric;
    }
  }

  /// Get default authentication reason
  String _getDefaultAuthReason() {
    if (Platform.isIOS) {
      return 'Gunakan Touch ID atau Face ID untuk mengakses aplikasi';
    } else {
      return 'Gunakan sidik jari atau pengenalan wajah untuk mengakses aplikasi';
    }
  }

  /// Get platform-specific authentication messages
  List<AuthMessages> _getAuthMessages() {
    return [
      AndroidAuthMessages(
        signInHint: 'Sentuh sensor sidik jari',
        cancelButton: 'Batal',
        signInTitle: 'Masuk menggunakan Biometrik atau PIN',
      ),
      // IOSAuthMessages temporarily removed until local_auth_ios is available
    ];
  }

  /// Handle local_auth 3.x exception codes.
  BiometricAuthResult _handleLocalAuthException(LocalAuthException e) {
    switch (e.code) {
      case LocalAuthExceptionCode.noBiometricHardware:
      case LocalAuthExceptionCode.biometricHardwareTemporarilyUnavailable:
        return BiometricAuthResult.notAvailable;
      case LocalAuthExceptionCode.noBiometricsEnrolled:
      case LocalAuthExceptionCode.noCredentialsSet:
        return BiometricAuthResult.notEnrolled;
      case LocalAuthExceptionCode.temporaryLockout:
        return BiometricAuthResult.temporarilyLocked;
      case LocalAuthExceptionCode.biometricLockout:
        return BiometricAuthResult.permanentlyLocked;
      case LocalAuthExceptionCode.userCanceled:
      case LocalAuthExceptionCode.userRequestedFallback:
      case LocalAuthExceptionCode.systemCanceled:
      case LocalAuthExceptionCode.timeout:
        return BiometricAuthResult.cancelled;
      default:
        return BiometricAuthResult.failed;
    }
  }

  /// Keep legacy PlatformException mapping for backward compatibility.
  BiometricAuthResult _handleLegacyPlatformException(PlatformException e) {
    switch (e.code) {
      case 'NotAvailable':
      case 'not_available':
        return BiometricAuthResult.notAvailable;
      case 'NotEnrolled':
      case 'not_enrolled':
        return BiometricAuthResult.notEnrolled;
      case 'LockedOut':
      case 'locked_out':
        return BiometricAuthResult.temporarilyLocked;
      case 'PermanentlyLockedOut':
      case 'permanently_locked_out':
        return BiometricAuthResult.permanentlyLocked;
      case 'UserCancel':
      case 'user_cancel':
      case 'SystemCancel':
      case 'system_cancel':
        return BiometricAuthResult.cancelled;
      default:
        return BiometricAuthResult.failed;
    }
  }

  /// Get time remaining for lockout
  Future<Duration?> getLockoutTimeRemaining() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastAuth = prefs.getString(_lastBiometricAuthKey);
      final failureCount = prefs.getInt(_biometricFailureCountKey) ?? 0;

      if (failureCount >= _maxFailureAttempts && lastAuth != null) {
        final lastAuthTime = DateTime.parse(lastAuth);
        final lockoutEnd = lastAuthTime.add(_lockoutDuration);
        final now = DateTime.now();

        if (now.isBefore(lockoutEnd)) {
          return lockoutEnd.difference(now);
        }
      }

      return null;
    } catch (e) {
      _logger.e('Error getting lockout time remaining: $e');
      return null;
    }
  }

  /// Get biometric statistics for monitoring
  Future<Map<String, dynamic>> getBiometricStats() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final capabilities = await getBiometricCapabilities();

      return {
        'isEnabled': await isBiometricEnabled(),
        'isSupported': capabilities.isDeviceSupported,
        'isEnrolled': capabilities.isEnrolled,
        'availableTypes': capabilities.availableBiometrics
            .map((e) => e.name)
            .toList(),
        'strongestType': capabilities.strongestBiometric.name,
        'preferredType': (await getPreferredBiometricType()).name,
        'failureCount': prefs.getInt(_biometricFailureCountKey) ?? 0,
        'isLocked': await _isTemporarilyLocked(),
        'lastAuth': prefs.getString(_lastBiometricAuthKey),
        'lockoutTimeRemaining': (await getLockoutTimeRemaining())?.inSeconds,
      };
    } catch (e) {
      _logger.e('Error getting biometric stats: $e');
      return {};
    }
  }

  /// Reset biometric failure count (admin function)
  Future<void> resetBiometricLock() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_biometricFailureCountKey);
      await prefs.remove(_lastBiometricAuthKey);
      _logger.i('Biometric lock reset successfully');
    } catch (e) {
      _logger.e('Error resetting biometric lock: $e');
    }
  }

  /// Clear all biometric data from storage
  Future<void> clearBiometricData() async {
    try {
      _logger.d('Clearing biometric data...');

      final prefs = await SharedPreferences.getInstance();

      // Clear from UnifiedSecureStorageService (main storage)
      await UnifiedSecureStorageService.setBiometricEnabled(false);

      // Clear failure tracking from SharedPreferences
      await prefs.remove(_biometricFailureCountKey);
      await prefs.remove(_lastBiometricAuthKey);
      await prefs.remove(_biometricTypePreferenceKey);

      // Also clear device info from secure storage if needed
      // Note: Device info might be needed for other purposes, so handle carefully

      _logger.i('Biometric data cleared successfully');
    } catch (e) {
      _logger.e('Error clearing biometric data: $e');
    }
  }
}
