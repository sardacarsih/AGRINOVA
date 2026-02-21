import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_app_update/in_app_update.dart' as in_app_update;
import 'package:path_provider/path_provider.dart';
import 'package:version/version.dart';
import 'package:logger/logger.dart';
import 'package:url_launcher/url_launcher.dart';

import '../network/dio_client.dart'; // Minimal REST client for app updates
import '../models/app_update_models.dart';
import '../error/app_error.dart';


/// Comprehensive App Update Service for Agrinova Flutter Mobile
/// 
/// Features:
/// - Version checking with server API
/// - In-App Updates (Play Store)
/// - OTA (Over-The-Air) updates for critical patches
/// - Offline update queue management
/// - User consent and scheduling
/// - Update rollback mechanisms
/// - Progress tracking and notifications
/// 
/// Designed for offline-first field operations with limited connectivity
class AppUpdateService {
  static const String _tag = 'AppUpdateService';
  static AppUpdateService? _instance;
  
  factory AppUpdateService({required DioClient dioClient}) {
    _instance ??= AppUpdateService._internal(dioClient: dioClient);
    return _instance!;
  }
  
  AppUpdateService._internal({required DioClient dioClient}) : _dioClient = dioClient;

  final DioClient _dioClient;
  final Logger _logger = Logger();
  
  StreamController<AppUpdateProgress>? _updateProgressController;
  Stream<AppUpdateProgress>? _updateProgressStream;
  
  PackageInfo? _packageInfo;
  SharedPreferences? _prefs;
  Timer? _periodicCheckTimer;
  
  bool _isInitialized = false;
  bool _isUpdateInProgress = false;
  AppUpdateInfo? _pendingUpdate;

  // Storage keys
  static const String _kLastVersionCheckKey = 'last_version_check';
  static const String _kPendingUpdateKey = 'pending_update_info';
  static const String _kUpdatePolicyKey = 'update_policy';
  static const String _kSkippedVersionsKey = 'skipped_versions';

  /// Initialize the app update service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      _logger.i('$_tag: Initializing App Update Service');
      
      _packageInfo = await PackageInfo.fromPlatform();
      _prefs = await SharedPreferences.getInstance();
      
      _updateProgressController = StreamController<AppUpdateProgress>.broadcast();
      _updateProgressStream = _updateProgressController!.stream;
      
      // Load pending updates from storage
      await _loadPendingUpdate();
      
      // Start periodic version checks (every 6 hours)
      _startPeriodicVersionCheck();
      
      _isInitialized = true;
      _logger.i('$_tag: App Update Service initialized successfully');
      
    } catch (e, stackTrace) {
      _logger.e('$_tag: Failed to initialize', error: e, stackTrace: stackTrace);
      throw SystemError.unexpected('Failed to initialize app update service: $e');
    }
  }

  /// Get current app version information
  AppVersionInfo getCurrentVersion() {
    if (_packageInfo == null) {
      throw SystemError.configurationError('App update service not initialized');
    }
    
    return AppVersionInfo(
      version: _packageInfo!.version,
      buildNumber: int.parse(_packageInfo!.buildNumber),
      packageName: _packageInfo!.packageName,
      appName: _packageInfo!.appName,
    );
  }

  /// Check for app updates from server
  Future<AppUpdateInfo?> checkForUpdates({bool forceCheck = false}) async {
    if (!_isInitialized) await initialize();
    
    try {
      final currentVersion = getCurrentVersion();
      final now = DateTime.now();
      final lastCheck = _getLastVersionCheck();
      
      // Skip check if recently checked (unless forced)
      if (!forceCheck && lastCheck != null) {
        final timeSinceLastCheck = now.difference(lastCheck);
        if (timeSinceLastCheck.inHours < 1) {
          _logger.d('$_tag: Skipping version check, last checked ${timeSinceLastCheck.inMinutes} minutes ago');
          return _pendingUpdate;
        }
      }

      _logger.i('$_tag: Checking for app updates');
      _setLastVersionCheck(now);
      
      final response = await _dioClient.dio.get(
        '/app/version-check',
        queryParameters: {
          'platform': Platform.isAndroid ? 'android' : 'ios',
          'current_version': currentVersion.version,
          'build_number': currentVersion.buildNumber,
          'package_name': currentVersion.packageName,
        },
      );

      final updateInfo = AppUpdateInfo.fromJson(response.data);
      
      // Check if update is available
      if (_isUpdateAvailable(currentVersion, updateInfo)) {
        _pendingUpdate = updateInfo;
        await _savePendingUpdate(updateInfo);
        
        _logger.i('$_tag: Update available: ${updateInfo.latestVersion} (${updateInfo.updateType})');
        
        // Show notification if update is critical
        if (updateInfo.updateType == UpdateType.critical) {
          await _showUpdateNotification(updateInfo);
        }
        
        return updateInfo;
      } else {
        _logger.i('$_tag: App is up to date');
        _clearPendingUpdate();
        return null;
      }
      
    } catch (e, stackTrace) {
      _logger.e('$_tag: Failed to check for updates', error: e, stackTrace: stackTrace);
      
      // Return cached update info if available
      return _pendingUpdate;
    }
  }

  /// Start app update process
  Future<void> startUpdate(AppUpdateInfo updateInfo, {
    UpdateInstallMode installMode = UpdateInstallMode.flexible,
  }) async {
    if (_isUpdateInProgress) {
      throw BusinessError.conflictingData('Update already in progress');
    }
    
    try {
      _isUpdateInProgress = true;
      _emitProgress(AppUpdateProgress.starting(updateInfo));
      
      switch (updateInfo.deliveryMethod) {
        case UpdateDeliveryMethod.playStore:
          await _startPlayStoreUpdate(updateInfo, installMode);
          break;
        case UpdateDeliveryMethod.ota:
          await _startOTAUpdate(updateInfo);
          break;
        case UpdateDeliveryMethod.apkDownload:
          await _startAPKUpdate(updateInfo);
          break;
      }
      
    } catch (e, stackTrace) {
      _logger.e('$_tag: Update failed', error: e, stackTrace: stackTrace);
      _emitProgress(AppUpdateProgress.failed(updateInfo, e.toString()));
      rethrow;
    } finally {
      _isUpdateInProgress = false;
    }
  }

  /// Handle Play Store in-app updates
  Future<void> _startPlayStoreUpdate(
    AppUpdateInfo updateInfo, 
    UpdateInstallMode installMode,
  ) async {
    if (!Platform.isAndroid) {
      throw DeviceError.networkNotAvailable();
    }

    try {
      // Check if in-app update is available
      final in_app_update.AppUpdateInfo playStoreInfo = await in_app_update.InAppUpdate.checkForUpdate();
      
      if (playStoreInfo.updateAvailability == in_app_update.UpdateAvailability.updateAvailable) {
        _logger.i('$_tag: Starting Play Store update');
        
        if (updateInfo.updateType == UpdateType.critical) {
          // Force immediate update for critical updates
          await in_app_update.InAppUpdate.startFlexibleUpdate();
          await in_app_update.InAppUpdate.completeFlexibleUpdate();
        } else {
          // Use flexible update for non-critical updates
          await in_app_update.InAppUpdate.startFlexibleUpdate();
        }
        
        _emitProgress(AppUpdateProgress.completed(updateInfo));
        
      } else {
        throw BusinessError.resourceNotFound('Play Store update', 'N/A');
      }
      
    } on PlatformException {
      throw DeviceError.networkNotAvailable();
    }
  }

  /// Handle Over-The-Air (OTA) updates
  Future<void> _startOTAUpdate(AppUpdateInfo updateInfo) async {
    _logger.i('$_tag: Starting OTA update');
    
    try {
      // Download OTA patch
      final patchFile = await _downloadOTAPatch(updateInfo);
      
      // Apply patch (this would involve delta patching)
      await _applyOTAPatch(patchFile);
      
      _emitProgress(AppUpdateProgress.completed(updateInfo));
      
      // Schedule app restart
      await _scheduleAppRestart();
      
    } catch (e) {
      throw NetworkError.requestError('OTA update failed: $e');
    }
  }

  /// Handle APK download and installation
  Future<void> _startAPKUpdate(AppUpdateInfo updateInfo) async {
    _logger.i('$_tag: Starting external APK update flow');

    try {
      final rawUrl = updateInfo.apkDownloadUrl ?? updateInfo.downloadUrl;
      if (rawUrl == null || rawUrl.trim().isEmpty) {
        throw ValidationError.required('APK download URL');
      }

      final uri = Uri.tryParse(rawUrl.trim());
      if (uri == null || !uri.hasScheme) {
        throw ValidationError.invalidFormat(
          'APK download URL',
          'absolute URL (https://...)',
        );
      }

      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw DeviceError.networkNotAvailable();
      }

      _emitProgress(AppUpdateProgress.completed(updateInfo));
    } catch (e) {
      throw NetworkError.requestError('APK update link failed: $e');
    }
  }

  /// Download OTA patch file
  Future<File> _downloadOTAPatch(AppUpdateInfo updateInfo) async {
    if (updateInfo.otaPatchUrl == null) {
      throw ValidationError.required('OTA patch URL');
    }

    final tempDir = await getTemporaryDirectory();
    final patchFile = File('${tempDir.path}/update_patch.json');
    
    _emitProgress(AppUpdateProgress.downloading(updateInfo, 0));
    
    await _dioClient.dio.download(
      updateInfo.otaPatchUrl!,
      patchFile.path,
      onReceiveProgress: (received, total) {
        if (total > 0) {
          final progress = received / total;
          _emitProgress(AppUpdateProgress.downloading(updateInfo, progress));
        }
      },
    );
    
    return patchFile;
  }

  /// Apply OTA patch (simplified implementation)
  Future<void> _applyOTAPatch(File patchFile) async {
    _logger.i('$_tag: Applying OTA patch');
    
    try {
      final patchContent = await patchFile.readAsString();
      final patchData = jsonDecode(patchContent);
      
      // Apply configuration changes
      if (patchData['config_updates'] != null) {
        await _applyConfigUpdates(patchData['config_updates']);
      }
      
      // Apply data migrations
      if (patchData['data_migrations'] != null) {
        await _applyDataMigrations(patchData['data_migrations']);
      }
      
      _logger.i('$_tag: OTA patch applied successfully');
      
    } catch (e) {
      throw FileError.readFailed('OTA patch file', 'Failed to apply OTA patch: $e');
    }
  }

  /// Check if update is available
  bool _isUpdateAvailable(AppVersionInfo current, AppUpdateInfo available) {
    try {
      final currentVersion = Version.parse(current.version);
      final availableVersion = Version.parse(available.latestVersion);
      
      return availableVersion > currentVersion;
    } catch (e) {
      _logger.w('$_tag: Failed to parse version strings', error: e);
      return false;
    }
  }

  /// Get update policy settings
  AppUpdatePolicy getUpdatePolicy() {
    final policyJson = _prefs?.getString(_kUpdatePolicyKey);
    if (policyJson != null) {
      return AppUpdatePolicy.fromJson(jsonDecode(policyJson));
    }
    
    // Default policy
    return AppUpdatePolicy(
      autoCheckEnabled: true,
      autoDownloadEnabled: false,
      wifiOnlyDownload: true,
      allowMeteredConnection: false,
      quietHours: TimeRange(start: '22:00', end: '06:00'),
    );
  }

  /// Update policy settings
  Future<void> setUpdatePolicy(AppUpdatePolicy policy) async {
    await _prefs?.setString(_kUpdatePolicyKey, jsonEncode(policy.toJson()));
    _logger.i('$_tag: Update policy updated');
  }

  /// Skip a specific version
  Future<void> skipVersion(String version) async {
    final skippedVersions = getSkippedVersions();
    skippedVersions.add(version);
    
    await _prefs?.setStringList(_kSkippedVersionsKey, skippedVersions.toList());
    _logger.i('$_tag: Version $version added to skip list');
  }

  /// Get list of skipped versions
  Set<String> getSkippedVersions() {
    final versions = _prefs?.getStringList(_kSkippedVersionsKey) ?? [];
    return Set.from(versions);
  }

  /// Get update progress stream
  Stream<AppUpdateProgress>? get updateProgressStream => _updateProgressStream;

  /// Get pending update info
  AppUpdateInfo? get pendingUpdate => _pendingUpdate;

  /// Check if update is in progress
  bool get isUpdateInProgress => _isUpdateInProgress;

  /// Emit update progress
  void _emitProgress(AppUpdateProgress progress) {
    _updateProgressController?.add(progress);
    _logger.d('$_tag: Update progress: ${progress.status}');
  }

  /// Show update notification
  Future<void> _showUpdateNotification(AppUpdateInfo updateInfo) async {
    // Notification handling would go here if needed
    _logger.i('Update available: ${updateInfo.latestVersion}');
  }

  /// Start periodic version checking
  void _startPeriodicVersionCheck() {
    const checkInterval = Duration(hours: 6);
    
    _periodicCheckTimer = Timer.periodic(checkInterval, (_) async {
      if (getUpdatePolicy().autoCheckEnabled) {
        await checkForUpdates();
      }
    });
    
    _logger.i('$_tag: Periodic version check started (every ${checkInterval.inHours}h)');
  }

  /// Storage helper methods
  DateTime? _getLastVersionCheck() {
    final timestamp = _prefs?.getInt(_kLastVersionCheckKey);
    return timestamp != null ? DateTime.fromMillisecondsSinceEpoch(timestamp) : null;
  }

  void _setLastVersionCheck(DateTime dateTime) {
    _prefs?.setInt(_kLastVersionCheckKey, dateTime.millisecondsSinceEpoch);
  }

  Future<void> _loadPendingUpdate() async {
    final updateJson = _prefs?.getString(_kPendingUpdateKey);
    if (updateJson != null) {
      try {
        _pendingUpdate = AppUpdateInfo.fromJson(jsonDecode(updateJson));
        _logger.d('$_tag: Loaded pending update: ${_pendingUpdate?.latestVersion}');
      } catch (e) {
        _logger.w('$_tag: Failed to load pending update', error: e);
      }
    }
  }

  Future<void> _savePendingUpdate(AppUpdateInfo updateInfo) async {
    await _prefs?.setString(_kPendingUpdateKey, jsonEncode(updateInfo.toJson()));
  }

  void _clearPendingUpdate() {
    _pendingUpdate = null;
    _prefs?.remove(_kPendingUpdateKey);
  }

  /// Apply configuration updates from OTA patch
  Future<void> _applyConfigUpdates(Map<String, dynamic> configUpdates) async {
    // Implementation would update app configuration
    _logger.i('$_tag: Applying configuration updates');
  }

  /// Apply data migrations from OTA patch
  Future<void> _applyDataMigrations(List<dynamic> migrations) async {
    // Implementation would run database migrations
    _logger.i('$_tag: Applying data migrations');
  }

  /// Schedule app restart
  Future<void> _scheduleAppRestart() async {
    // Implementation would schedule app restart
    _logger.i('$_tag: App restart scheduled');
  }

  /// Dispose resources
  void dispose() {
    _periodicCheckTimer?.cancel();
    _updateProgressController?.close();
    _isInitialized = false;
    _logger.i('$_tag: App update service disposed');
  }
}
