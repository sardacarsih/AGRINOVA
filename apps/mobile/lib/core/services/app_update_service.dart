import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
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
import 'app_update_channel_policy.dart';

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

  AppUpdateService._internal({required DioClient dioClient})
    : _dioClient = dioClient;

  final DioClient _dioClient;
  final Logger _logger = Logger();
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  StreamController<AppUpdateProgress>? _updateProgressController;
  Stream<AppUpdateProgress>? _updateProgressStream;

  PackageInfo? _packageInfo;
  SharedPreferences? _prefs;
  Timer? _periodicCheckTimer;

  bool _isInitialized = false;
  bool _isUpdateInProgress = false;
  bool _isNotificationInitialized = false;
  AppUpdateInfo? _pendingUpdate;

  // Storage keys
  static const String _kLastVersionCheckKey = 'last_version_check';
  static const String _kPendingUpdateKey = 'pending_update_info';
  static const String _kUpdatePolicyKey = 'update_policy';
  static const String _kSkippedVersionsKey = 'skipped_versions';
  static const AndroidNotificationChannel _updateNotificationChannel =
      AndroidNotificationChannel(
        'app_updates',
        'App Updates',
        description: 'Notifikasi pembaruan aplikasi Agrinova',
        importance: Importance.high,
      );
  static const int _kUpdateNotificationId = 42001;
  static const int _kCriticalUpdateNotificationId = 42002;

  /// Initialize the app update service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      _logger.i('$_tag: Initializing App Update Service');

      _packageInfo = await PackageInfo.fromPlatform();
      _prefs = await SharedPreferences.getInstance();

      _updateProgressController =
          StreamController<AppUpdateProgress>.broadcast();
      _updateProgressStream = _updateProgressController!.stream;
      await _initializeUpdateNotifications();

      // Load pending updates from storage
      await _loadPendingUpdate();
      _reconcilePendingUpdateWithInstalledVersion();

      // Start periodic version checks (every 6 hours)
      _startPeriodicVersionCheck();

      _isInitialized = true;
      _logger.i('$_tag: App Update Service initialized successfully');
    } catch (e, stackTrace) {
      _logger.e(
        '$_tag: Failed to initialize',
        error: e,
        stackTrace: stackTrace,
      );
      throw SystemError.unexpected(
        'Failed to initialize app update service: $e',
      );
    }
  }

  /// Get current app version information
  AppVersionInfo getCurrentVersion() {
    if (_packageInfo == null) {
      throw SystemError.configurationError(
        'App update service not initialized',
      );
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
      _reconcilePendingUpdateWithInstalledVersion();
      final now = DateTime.now();
      final lastCheck = _getLastVersionCheck();

      // Skip check if recently checked (unless forced)
      if (!forceCheck && lastCheck != null) {
        final timeSinceLastCheck = now.difference(lastCheck);
        if (timeSinceLastCheck.inHours < 1) {
          _logger.d(
            '$_tag: Skipping version check, last checked ${timeSinceLastCheck.inMinutes} minutes ago',
          );
          if (_pendingUpdate != null && _isSkippedUpdate(_pendingUpdate!)) {
            _logger.d(
              '$_tag: Cached update ${_pendingUpdate!.latestVersion} is skipped by user policy',
            );
            return null;
          }
          return _pendingUpdate;
        }
      }

      _logger.i('$_tag: Checking for app updates');
      _setLastVersionCheck(now);

      final serverUpdate = await _checkForServerUpdate(currentVersion);

      // Primary source for Android app updates.
      final playStoreUpdate = await _checkForPlayStoreUpdate(currentVersion);
      if (playStoreUpdate != null) {
        final resolvedUpdate = _mergePlayStoreAndServerUpdate(
          playStoreUpdate: playStoreUpdate,
          serverUpdate: serverUpdate,
          currentVersion: currentVersion,
        );

        if (_isSkippedUpdate(resolvedUpdate)) {
          _logger.i(
            '$_tag: Skipping Play Store update ${resolvedUpdate.latestVersion} based on user preference',
          );
          _clearPendingUpdate();
          return null;
        }

        _pendingUpdate = resolvedUpdate;
        await _savePendingUpdate(resolvedUpdate);
        _logger.i(
          '$_tag: Play Store update available: '
          '${resolvedUpdate.latestVersion} (${resolvedUpdate.updateType})',
        );
        return resolvedUpdate;
      }

      if (serverUpdate != null) {
        if (_isSkippedUpdate(serverUpdate)) {
          _logger.i(
            '$_tag: Skipping update ${serverUpdate.latestVersion} based on user preference',
          );
          _clearPendingUpdate();
          return null;
        }

        _pendingUpdate = serverUpdate;
        await _savePendingUpdate(serverUpdate);

        _logger.i(
          '$_tag: Update available: ${serverUpdate.latestVersion} (${serverUpdate.updateType})',
        );

        return serverUpdate;
      }

      _logger.i('$_tag: App is up to date');
      _clearPendingUpdate();
      return null;
    } catch (e, stackTrace) {
      _logger.e(
        '$_tag: Failed to check for updates',
        error: e,
        stackTrace: stackTrace,
      );

      // Return cached update info if available
      return _pendingUpdate;
    }
  }

  Future<AppUpdateInfo?> _checkForServerUpdate(
    AppVersionInfo currentVersion,
  ) async {
    try {
      final response = await _dioClient.dio.get(
        '/app/version-check',
        queryParameters: {
          'platform': Platform.isAndroid ? 'android' : 'ios',
          'current_version': currentVersion.version,
          'build_number': currentVersion.buildNumber,
          'package_name': currentVersion.packageName,
        },
      );

      final updateInfo = _normalizeUpdateInfoVersionLabel(
        AppUpdateInfo.fromJson(response.data),
      );
      if (!_isUpdateAvailable(currentVersion, updateInfo)) {
        return null;
      }

      if (!isUpdateChannelCompatible(
        installedVersion: currentVersion.version,
        updateVersionLabel: updateInfo.latestVersion,
        updateMetadata: updateInfo.metadata,
      )) {
        _logger.i(
          '$_tag: Ignoring server update ${updateInfo.latestVersion} because '
          'channel is not compatible with installed version ${currentVersion.version}',
        );
        return null;
      }

      return updateInfo;
    } catch (e, stackTrace) {
      _logger.w(
        '$_tag: Server version check failed',
        error: e,
        stackTrace: stackTrace,
      );
      return null;
    }
  }

  Future<AppUpdateInfo?> _checkForPlayStoreUpdate(
    AppVersionInfo currentVersion,
  ) async {
    if (!Platform.isAndroid) return null;

    try {
      final playStoreInfo = await in_app_update.InAppUpdate.checkForUpdate();
      final availability = playStoreInfo.updateAvailability;
      final isUpdateAvailable =
          availability == in_app_update.UpdateAvailability.updateAvailable ||
          availability ==
              in_app_update
                  .UpdateAvailability
                  .developerTriggeredUpdateInProgress;

      if (!isUpdateAvailable) {
        return null;
      }

      final availableBuild = playStoreInfo.availableVersionCode;
      if (availableBuild == null) {
        _logger.w(
          '$_tag: Play Store reported update state without availableVersionCode; '
          'skipping update prompt to avoid false positive.',
        );
        return null;
      }

      if (availableBuild <= currentVersion.buildNumber) {
        _logger.i(
          '$_tag: Ignoring Play Store update signal because available build '
          '($availableBuild) <= installed build (${currentVersion.buildNumber})',
        );
        return null;
      }

      final isCritical =
          playStoreInfo.updatePriority >= 4 ||
          (playStoreInfo.clientVersionStalenessDays ?? 0) >= 7;

      return AppUpdateInfo(
        latestVersion: 'build $availableBuild',
        latestBuildNumber: availableBuild,
        updateType: isCritical ? UpdateType.critical : UpdateType.recommended,
        deliveryMethod: UpdateDeliveryMethod.playStore,
        releaseNotes:
            'Pembaruan tersedia di Google Play. Silakan instal versi terbaru.',
        metadata: {
          'source': 'play_store',
          'updatePriority': playStoreInfo.updatePriority,
          'stalenessDays': playStoreInfo.clientVersionStalenessDays,
          'immediateAllowed': playStoreInfo.immediateUpdateAllowed,
          'flexibleAllowed': playStoreInfo.flexibleUpdateAllowed,
          'releaseChannel': resolveReleaseChannelFromVersion(
            currentVersion.version,
          ),
          'trackScope': 'play_store_managed',
        },
      );
    } on PlatformException catch (e, stackTrace) {
      _logger.w(
        '$_tag: Play Store update check unavailable',
        error: e,
        stackTrace: stackTrace,
      );
      return null;
    } catch (e, stackTrace) {
      _logger.w(
        '$_tag: Play Store update check failed',
        error: e,
        stackTrace: stackTrace,
      );
      return null;
    }
  }

  /// Start app update process
  Future<void> startUpdate(
    AppUpdateInfo updateInfo, {
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
      final in_app_update.AppUpdateInfo playStoreInfo =
          await in_app_update.InAppUpdate.checkForUpdate();

      final isUpdateAvailable =
          playStoreInfo.updateAvailability ==
              in_app_update.UpdateAvailability.updateAvailable ||
          playStoreInfo.updateAvailability ==
              in_app_update
                  .UpdateAvailability
                  .developerTriggeredUpdateInProgress;

      if (!isUpdateAvailable) {
        throw BusinessError.resourceNotFound('Play Store update', 'N/A');
      }

      _logger.i('$_tag: Starting Play Store update');

      final shouldUseImmediate =
          (installMode == UpdateInstallMode.immediate ||
              updateInfo.isCritical) &&
          playStoreInfo.immediateUpdateAllowed;

      if (shouldUseImmediate) {
        final result = await in_app_update.InAppUpdate.performImmediateUpdate();
        final shouldContinue = _handlePlayStoreResult(
          result,
          updateInfo,
          flow: 'immediate',
        );
        if (!shouldContinue) {
          return;
        }
        _clearPendingUpdate();
        _setLastVersionCheck(DateTime.now());
        _emitProgress(AppUpdateProgress.completed(updateInfo));
        return;
      }

      if (playStoreInfo.flexibleUpdateAllowed) {
        final result = await in_app_update.InAppUpdate.startFlexibleUpdate();
        final shouldContinue = _handlePlayStoreResult(
          result,
          updateInfo,
          flow: 'flexible',
        );
        if (!shouldContinue) {
          return;
        }
        await in_app_update.InAppUpdate.completeFlexibleUpdate();
        _clearPendingUpdate();
        _setLastVersionCheck(DateTime.now());
        _emitProgress(AppUpdateProgress.completed(updateInfo));
        return;
      }

      if (playStoreInfo.immediateUpdateAllowed) {
        final result = await in_app_update.InAppUpdate.performImmediateUpdate();
        final shouldContinue = _handlePlayStoreResult(
          result,
          updateInfo,
          flow: 'immediate',
        );
        if (!shouldContinue) {
          return;
        }
        _clearPendingUpdate();
        _setLastVersionCheck(DateTime.now());
        _emitProgress(AppUpdateProgress.completed(updateInfo));
        return;
      }

      throw BusinessError.conflictingData(
        'Play Store does not allow immediate or flexible update flow for this release',
      );
    } on PlatformException catch (e, stackTrace) {
      _logger.e(
        '$_tag: Play Store update failed',
        error: e,
        stackTrace: stackTrace,
      );
      throw DeviceError.networkNotAvailable();
    }
  }

  bool _handlePlayStoreResult(
    in_app_update.AppUpdateResult result,
    AppUpdateInfo updateInfo, {
    required String flow,
  }) {
    switch (result) {
      case in_app_update.AppUpdateResult.success:
        return true;
      case in_app_update.AppUpdateResult.userDeniedUpdate:
        _logger.i('$_tag: Play Store $flow update cancelled by user');
        _emitProgress(AppUpdateProgress.cancelled(updateInfo));
        return false;
      case in_app_update.AppUpdateResult.inAppUpdateFailed:
        throw BusinessError.conflictingData(
          '${_capitalize(flow)} Play Store update failed',
        );
    }
  }

  String _capitalize(String value) {
    if (value.isEmpty) {
      return value;
    }
    return '${value[0].toUpperCase()}${value.substring(1)}';
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
      throw FileError.readFailed(
        'OTA patch file',
        'Failed to apply OTA patch: $e',
      );
    }
  }

  /// Check if update is available
  bool _isUpdateAvailable(AppVersionInfo current, AppUpdateInfo available) {
    if (available.latestBuildNumber > current.buildNumber) {
      return true;
    }

    try {
      final currentVersion = _parseSemanticVersion(current.version);
      final availableVersion = _parseSemanticVersion(available.latestVersion);
      if (currentVersion == null || availableVersion == null) {
        return false;
      }

      return availableVersion > currentVersion;
    } catch (e) {
      _logger.w('$_tag: Failed to parse version strings', error: e);
      return false;
    }
  }

  bool _isSkippedUpdate(AppUpdateInfo updateInfo) {
    if (updateInfo.isCritical) {
      return false;
    }

    final skippedVersions = getSkippedVersions();
    final latestVersion = updateInfo.latestVersion.trim();
    if (skippedVersions.contains(latestVersion)) {
      return true;
    }

    final normalizedTag = _formatVersionLabel(latestVersion);
    if (skippedVersions.contains(normalizedTag)) {
      return true;
    }

    final semver = _parseSemanticVersion(latestVersion);
    if (semver == null) {
      return false;
    }

    return skippedVersions.contains(semver.toString());
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
    final rawVersion = version.trim();
    skippedVersions.add(rawVersion);

    final semver = _parseSemanticVersion(rawVersion);
    if (semver != null) {
      skippedVersions.add(semver.toString());
      skippedVersions.add('v$semver');
    }

    await _prefs?.setStringList(_kSkippedVersionsKey, skippedVersions.toList());
    if (_pendingUpdate != null &&
        !(_pendingUpdate?.isCritical ?? false) &&
        _isSkippedUpdate(_pendingUpdate!)) {
      _clearPendingUpdate();
    }
    _logger.i('$_tag: Version $rawVersion added to skip list');
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
    try {
      if (!_isNotificationInitialized) {
        await _initializeUpdateNotifications();
      }

      if (Platform.isAndroid) {
        final android = _localNotifications
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >();
        final enabled = await android?.areNotificationsEnabled() ?? false;
        if (!enabled) {
          final granted = await android?.requestNotificationsPermission();
          if (granted != true) {
            _logger.w(
              '$_tag: Notification permission not granted. '
              'Skipping update notification.',
            );
            return;
          }
        }
      }

      final isCritical = updateInfo.isCritical;
      final notificationId = isCritical
          ? _kCriticalUpdateNotificationId
          : _kUpdateNotificationId;
      final title = isCritical
          ? 'Pembaruan kritis tersedia'
          : 'Pembaruan aplikasi tersedia';
      final body = isCritical
          ? 'Agrinova ${updateInfo.displayVersion} wajib diperbarui segera.'
          : 'Agrinova ${updateInfo.displayVersion} siap diperbarui.';

      const androidDetails = AndroidNotificationDetails(
        'app_updates',
        'App Updates',
        channelDescription: 'Notifikasi pembaruan aplikasi Agrinova',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      await _localNotifications.show(
        id: notificationId,
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: androidDetails,
          iOS: iosDetails,
        ),
        payload: updateInfo.latestVersion,
      );

      _logger.i(
        '$_tag: Update notification shown for ${updateInfo.latestVersion}',
      );
    } catch (e, stackTrace) {
      _logger.w(
        '$_tag: Failed to show update notification',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Start periodic version checking
  void _startPeriodicVersionCheck() {
    const checkInterval = Duration(hours: 6);

    _periodicCheckTimer = Timer.periodic(checkInterval, (_) async {
      if (getUpdatePolicy().autoCheckEnabled) {
        final updateInfo = await checkForUpdates();
        if (updateInfo != null) {
          _emitProgress(AppUpdateProgress.available(updateInfo));
          await _showUpdateNotification(updateInfo);
        }
      }
    });

    _logger.i(
      '$_tag: Periodic version check started (every ${checkInterval.inHours}h)',
    );
  }

  Future<void> _initializeUpdateNotifications() async {
    if (_isNotificationInitialized) {
      return;
    }

    try {
      const androidSettings = AndroidInitializationSettings(
        '@mipmap/ic_launcher',
      );
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );

      await _localNotifications.initialize(
        settings: const InitializationSettings(
          android: androidSettings,
          iOS: iosSettings,
        ),
      );

      if (Platform.isAndroid) {
        final android = _localNotifications
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >();
        await android?.createNotificationChannel(_updateNotificationChannel);
      }

      _isNotificationInitialized = true;
    } catch (e, stackTrace) {
      _logger.w(
        '$_tag: Failed to initialize update notifications',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Storage helper methods
  DateTime? _getLastVersionCheck() {
    final timestamp = _prefs?.getInt(_kLastVersionCheckKey);
    return timestamp != null
        ? DateTime.fromMillisecondsSinceEpoch(timestamp)
        : null;
  }

  void _setLastVersionCheck(DateTime dateTime) {
    _prefs?.setInt(_kLastVersionCheckKey, dateTime.millisecondsSinceEpoch);
  }

  Future<void> _loadPendingUpdate() async {
    final updateJson = _prefs?.getString(_kPendingUpdateKey);
    if (updateJson != null) {
      try {
        _pendingUpdate = AppUpdateInfo.fromJson(jsonDecode(updateJson));
        _logger.d(
          '$_tag: Loaded pending update: ${_pendingUpdate?.latestVersion}',
        );
      } catch (e) {
        _logger.w('$_tag: Failed to load pending update', error: e);
      }
    }
  }

  Future<void> _savePendingUpdate(AppUpdateInfo updateInfo) async {
    await _prefs?.setString(
      _kPendingUpdateKey,
      jsonEncode(updateInfo.toJson()),
    );
  }

  void _reconcilePendingUpdateWithInstalledVersion() {
    if (_pendingUpdate == null || _packageInfo == null) {
      return;
    }

    final currentBuild = int.tryParse(_packageInfo!.buildNumber);
    if (currentBuild != null &&
        currentBuild >= _pendingUpdate!.latestBuildNumber) {
      _logger.i(
        '$_tag: Clearing pending update because installed build '
        '($currentBuild) >= pending build (${_pendingUpdate!.latestBuildNumber})',
      );
      _clearPendingUpdate();
      return;
    }

    final currentSemver = _parseSemanticVersion(_packageInfo!.version);
    final pendingSemver = _parseSemanticVersion(_pendingUpdate!.latestVersion);
    if (currentSemver != null &&
        pendingSemver != null &&
        currentSemver >= pendingSemver) {
      _logger.i(
        '$_tag: Clearing pending update because installed version '
        '(${_packageInfo!.version}) >= pending version (${_pendingUpdate!.latestVersion})',
      );
      _clearPendingUpdate();
    }
  }

  AppUpdateInfo _mergePlayStoreAndServerUpdate({
    required AppUpdateInfo playStoreUpdate,
    required AppUpdateInfo? serverUpdate,
    required AppVersionInfo currentVersion,
  }) {
    final serverLabelAllowed =
        serverUpdate != null &&
        isUpdateChannelCompatible(
          installedVersion: currentVersion.version,
          updateVersionLabel: serverUpdate.latestVersion,
          updateMetadata: serverUpdate.metadata,
        );
    final mergedVersion = serverLabelAllowed
        ? serverUpdate.latestVersion
        : _derivePlayStoreVersionLabel(playStoreUpdate: playStoreUpdate);

    final serverReleaseNotes = serverUpdate?.releaseNotes?.trim();
    final mergedNotes =
        (serverLabelAllowed && (serverReleaseNotes?.isNotEmpty ?? false))
        ? serverReleaseNotes
        : playStoreUpdate.releaseNotes;

    return AppUpdateInfo(
      latestVersion: _formatVersionLabel(mergedVersion),
      latestBuildNumber: playStoreUpdate.latestBuildNumber,
      updateType: playStoreUpdate.updateType,
      deliveryMethod: UpdateDeliveryMethod.playStore,
      releaseNotes: mergedNotes,
      metadata: {
        ...?serverUpdate?.metadata,
        ...?playStoreUpdate.metadata,
        'versionLabelSource': serverLabelAllowed ? 'server' : 'play_store',
        'installedChannel': resolveReleaseChannelFromVersion(
          currentVersion.version,
        ),
      },
    );
  }

  AppUpdateInfo _normalizeUpdateInfoVersionLabel(AppUpdateInfo updateInfo) {
    return AppUpdateInfo(
      latestVersion: _formatVersionLabel(updateInfo.latestVersion),
      latestBuildNumber: updateInfo.latestBuildNumber,
      updateType: updateInfo.updateType,
      deliveryMethod: updateInfo.deliveryMethod,
      releaseNotes: updateInfo.releaseNotes,
      downloadUrl: updateInfo.downloadUrl,
      apkDownloadUrl: updateInfo.apkDownloadUrl,
      otaPatchUrl: updateInfo.otaPatchUrl,
      fileSizeBytes: updateInfo.fileSizeBytes,
      releaseDate: updateInfo.releaseDate,
      supportedPlatforms: updateInfo.supportedPlatforms,
      metadata: updateInfo.metadata,
    );
  }

  String _derivePlayStoreVersionLabel({
    required AppUpdateInfo playStoreUpdate,
  }) {
    return 'build ${playStoreUpdate.latestBuildNumber}';
  }

  Version? _parseSemanticVersion(String rawVersion) {
    final value = rawVersion.trim();
    final match = RegExp(
      r'v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)',
    ).firstMatch(value);
    if (match == null) {
      return null;
    }

    try {
      return Version.parse(match.group(1)!);
    } catch (_) {
      return null;
    }
  }

  String _formatVersionLabel(String rawVersion) {
    final trimmed = rawVersion.trim();
    final parsed = _parseSemanticVersion(trimmed);
    if (parsed == null) {
      return trimmed;
    }
    return 'v$parsed';
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
