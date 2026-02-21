import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../models/jwt_models.dart';
import '../constants/api_constants.dart';

class DeviceService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  
  // Cache device info to avoid repeated computation
  static DeviceInfo? _cachedDeviceInfo;

  /// Generate unique device ID for this device
  static Future<String> getDeviceId() async {
    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        // androidInfo.id is the ANDROID_ID on modern Android
        return androidInfo.id;
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        // identifierForVendor is the standard persisted ID for iOS apps from same vendor
        return iosInfo.identifierForVendor ?? 'ios-unknown-id';
      }
      
      return 'unknown-platform-id';
    } catch (e) {
      // Fallback to timestamp if hardware ID fails
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      return 'fallback-$timestamp';
    }
  }

  /// Generate device fingerprint for security validation
  /// Format: platform:brand:model:hash (colon-separated, 3+ parts, 32+ chars)
  static Future<String> getDeviceFingerprint() async {
    try {
      String platform = '';
      String brand = '';
      String model = '';
      String hashInput = '';
      
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        platform = 'android';
        brand = androidInfo.brand;
        model = androidInfo.model;
        hashInput = '${androidInfo.device}:${androidInfo.hardware}:${androidInfo.version.sdkInt}:${androidInfo.manufacturer}';
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        platform = 'ios';
        brand = 'apple';
        model = iosInfo.model;
        hashInput = '${iosInfo.utsname.machine}:${iosInfo.systemVersion}:${iosInfo.identifierForVendor ?? 'unknown'}';
      }

      // Create hash component (16 chars from SHA256)
      final bytes = utf8.encode('agrinova:$hashInput');
      final digest = sha256.convert(bytes);
      final hashPart = digest.toString().substring(0, 16);
      
      // Format: platform:brand:model:hash (colon-separated, 4 parts, 32+ chars)
      return '$platform:$brand:$model:$hashPart';
    } catch (e) {
      // Fallback fingerprint with valid format
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      return 'flutter:fallback:device:${timestamp.toString().substring(0, 13)}';
    }
  }

  /// Get complete device information for registration
  static Future<DeviceInfo> getDeviceInfo() async {
    // Return cached version if available
    if (_cachedDeviceInfo != null) {
      return _cachedDeviceInfo!;
    }

    try {
      final deviceId = await getDeviceId();
      final fingerprint = await getDeviceFingerprint();
      final packageInfo = await PackageInfo.fromPlatform();
      
      DeviceInfo deviceInfo;

      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        deviceInfo = DeviceInfo(
          deviceId: deviceId,
          fingerprint: fingerprint,
          platform: ApiConstants.androidPlatform,
          osVersion: androidInfo.version.release,
          appVersion: packageInfo.version,
          buildNumber: packageInfo.buildNumber,
          model: androidInfo.model,
          brand: androidInfo.brand,
          deviceName: '${androidInfo.brand} ${androidInfo.model}',
        );
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceInfo = DeviceInfo(
          deviceId: deviceId,
          fingerprint: fingerprint,
          platform: ApiConstants.iosPlatform,
          osVersion: iosInfo.systemVersion,
          appVersion: packageInfo.version,
          buildNumber: packageInfo.buildNumber,
          model: iosInfo.model,
          brand: 'Apple',
          deviceName: '${iosInfo.name} (${iosInfo.model})',
        );
      } else {
        throw UnsupportedError('Unsupported platform: ${Platform.operatingSystem}');
      }

      // Cache the device info
      _cachedDeviceInfo = deviceInfo;
      return deviceInfo;
    } catch (e) {
      throw Exception('Failed to get device information: $e');
    }
  }

  /// Get device registration data for API calls
  static Future<Map<String, dynamic>> getDeviceRegistrationData() async {
    final deviceInfo = await getDeviceInfo();
    return deviceInfo.toJson();
  }

  /// Create device registration request
  static Future<DeviceRegistrationRequest> createDeviceRegistrationRequest() async {
    final deviceInfo = await getDeviceInfo();
    
    return DeviceRegistrationRequest(
      deviceId: deviceInfo.deviceId,
      fingerprint: deviceInfo.fingerprint,
      platform: deviceInfo.platform,
      osVersion: deviceInfo.osVersion,
      appVersion: deviceInfo.appVersion,
      buildNumber: deviceInfo.buildNumber,
      model: deviceInfo.model,
      brand: deviceInfo.brand,
      deviceName: deviceInfo.deviceName,
    );
  }

  /// Validate device fingerprint against stored one
  static Future<bool> validateDeviceFingerprint(String storedFingerprint) async {
    try {
      final currentFingerprint = await getDeviceFingerprint();
      return currentFingerprint == storedFingerprint;
    } catch (e) {
      return false;
    }
  }

  /// Clear cached device info (useful for testing or when device info changes)
  static void clearCache() {
    _cachedDeviceInfo = null;
  }

  /// Get platform-specific headers for API requests
  static Future<Map<String, String>> getPlatformHeaders() async {
    final deviceInfo = await getDeviceInfo();
    
    return {
      ApiConstants.platformHeader: deviceInfo.platform,
      ApiConstants.deviceIdHeader: deviceInfo.deviceId,
      ApiConstants.deviceFingerprintHeader: deviceInfo.fingerprint,
    };
  }

  /// Check if current device is trusted (this would be determined by server response)
  static bool isDeviceTrusted(bool deviceTrustedFlag) {
    return deviceTrustedFlag;
  }

  /// Generate device summary for logging/debugging
  static Future<String> getDeviceSummary() async {
    try {
      final deviceInfo = await getDeviceInfo();
      return 'Device: ${deviceInfo.deviceName}, '
             'Platform: ${deviceInfo.platform}, '
             'OS: ${deviceInfo.osVersion}, '
             'App: ${deviceInfo.appVersion}';
    } catch (e) {
      return 'Device info unavailable: $e';
    }
  }
}