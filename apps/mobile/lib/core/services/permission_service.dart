import 'package:permission_handler/permission_handler.dart';
import 'package:logger/logger.dart';

class PermissionService {
  static final Logger _logger = Logger();
  
  // Camera permissions
  Future<bool> requestCameraPermission() async {
    try {
      final status = await Permission.camera.request();
      _logger.d('Camera permission status: $status');
      return status.isGranted;
    } catch (e) {
      _logger.e('Error requesting camera permission: $e');
      return false;
    }
  }

  Future<bool> hasCameraPermission() async {
    try {
      final status = await Permission.camera.status;
      return status.isGranted;
    } catch (e) {
      _logger.e('Error checking camera permission: $e');
      return false;
    }
  }

  // Location permissions
  Future<bool> requestLocationPermission() async {
    try {
      final status = await Permission.location.request();
      _logger.d('Location permission status: $status');
      return status.isGranted;
    } catch (e) {
      _logger.e('Error requesting location permission: $e');
      return false;
    }
  }

  Future<bool> hasLocationPermission() async {
    try {
      final status = await Permission.location.status;
      return status.isGranted;
    } catch (e) {
      _logger.e('Error checking location permission: $e');
      return false;
    }
  }

  // Storage permissions
  Future<bool> requestStoragePermission() async {
    try {
      final status = await Permission.storage.request();
      _logger.d('Storage permission status: $status');
      return status.isGranted;
    } catch (e) {
      _logger.e('Error requesting storage permission: $e');
      return false;
    }
  }

  Future<bool> hasStoragePermission() async {
    try {
      final status = await Permission.storage.status;
      return status.isGranted;
    } catch (e) {
      _logger.e('Error checking storage permission: $e');
      return false;
    }
  }

  // Notification permissions
  Future<bool> requestNotificationPermission() async {
    try {
      final status = await Permission.notification.request();
      _logger.d('Notification permission status: $status');
      return status.isGranted;
    } catch (e) {
      _logger.e('Error requesting notification permission: $e');
      return false;
    }
  }

  Future<bool> hasNotificationPermission() async {
    try {
      final status = await Permission.notification.status;
      return status.isGranted;
    } catch (e) {
      _logger.e('Error checking notification permission: $e');
      return false;
    }
  }

  // Microphone permissions (for QR scanner)
  Future<bool> requestMicrophonePermission() async {
    try {
      final status = await Permission.microphone.request();
      _logger.d('Microphone permission status: $status');
      return status.isGranted;
    } catch (e) {
      _logger.e('Error requesting microphone permission: $e');
      return false;
    }
  }

  Future<bool> hasMicrophonePermission() async {
    try {
      final status = await Permission.microphone.status;
      return status.isGranted;
    } catch (e) {
      _logger.e('Error checking microphone permission: $e');
      return false;
    }
  }

  // Batch permission requests
  Future<Map<Permission, PermissionStatus>> requestMultiplePermissions(
    List<Permission> permissions,
  ) async {
    try {
      final statuses = await permissions.request();
      _logger.d('Multiple permissions status: $statuses');
      return statuses;
    } catch (e) {
      _logger.e('Error requesting multiple permissions: $e');
      return {};
    }
  }

  // Check if all essential permissions are granted
  Future<bool> hasEssentialPermissions() async {
    try {
      final cameraStatus = await Permission.camera.status;
      final locationStatus = await Permission.location.status;
      final storageStatus = await Permission.storage.status;
      final notificationStatus = await Permission.notification.status;

      return cameraStatus.isGranted &&
          locationStatus.isGranted &&
          storageStatus.isGranted &&
          notificationStatus.isGranted;
    } catch (e) {
      _logger.e('Error checking essential permissions: $e');
      return false;
    }
  }

  // Request all essential permissions
  Future<bool> requestEssentialPermissions() async {
    try {
      final permissions = [
        Permission.camera,
        Permission.location,
        Permission.storage,
        Permission.notification,
      ];

      final statuses = await permissions.request();
      
      final allGranted = statuses.values.every((status) => status.isGranted);
      _logger.d('All essential permissions granted: $allGranted');
      
      return allGranted;
    } catch (e) {
      _logger.e('Error requesting essential permissions: $e');
      return false;
    }
  }

  // Open app settings
  Future<bool> openAppSettings() async {
    try {
      return await openAppSettings();
    } catch (e) {
      _logger.e('Error opening app settings: $e');
      return false;
    }
  }

  // Check if permission is permanently denied
  bool isPermanentlyDenied(PermissionStatus status) {
    return status.isPermanentlyDenied;
  }

  // Get permission status message for UI
  String getPermissionMessage(Permission permission, PermissionStatus status) {
    if (status.isGranted) {
      return 'Permission granted';
    } else if (status.isDenied) {
      return 'Permission denied. Please grant ${_getPermissionName(permission)} access.';
    } else if (status.isPermanentlyDenied) {
      return 'Permission permanently denied. Please enable ${_getPermissionName(permission)} in settings.';
    } else if (status.isRestricted) {
      return '${_getPermissionName(permission)} access is restricted.';
    } else {
      return 'Unknown permission status for ${_getPermissionName(permission)}.';
    }
  }

  String _getPermissionName(Permission permission) {
    switch (permission) {
      case Permission.camera:
        return 'camera';
      case Permission.location:
        return 'location';
      case Permission.storage:
        return 'storage';
      case Permission.notification:
        return 'notification';
      case Permission.microphone:
        return 'microphone';
      default:
        return 'unknown';
    }
  }
}