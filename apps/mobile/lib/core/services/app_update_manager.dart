import 'dart:async';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../models/app_update_models.dart';
import '../utils/connectivity_helper.dart';
import 'app_update_service.dart';
// import 'notification_service.dart';
import '../di/dependency_injection.dart';
import '../network/dio_client.dart'; // Minimal REST client for app updates
import '../../shared/widgets/app_update_widgets.dart';

/// Central App Update Manager for Agrinova Flutter Mobile
///
/// Orchestrates the entire app update workflow including:
/// - Automatic version checking
/// - User consent management
/// - Update progress monitoring
/// - Rollback handling
/// - Offline queue management
///
/// Designed for field operations with limited connectivity
class AppUpdateManager {
  static const String _tag = 'AppUpdateManager';
  static final AppUpdateManager _instance = AppUpdateManager._internal();
  factory AppUpdateManager() => _instance;
  AppUpdateManager._internal();

  final AppUpdateService _updateService = AppUpdateService(
    dioClient: locate<DioClient>(),
  );
  // final NotificationService _notificationService = NotificationService();
  final ConnectivityHelper _connectivityHelper = ConnectivityHelper();
  final Logger _logger = Logger();

  bool _isInitialized = false;
  bool _isCheckingForUpdates = false;
  StreamSubscription? _progressSubscription;
  StreamSubscription? _connectivitySubscription;

  AppUpdateInfo? _currentUpdateInfo;
  BuildContext? _currentContext;

  /// Initialize the update manager
  Future<void> initialize(BuildContext context) async {
    if (_isInitialized) return;

    try {
      _logger.i('$_tag: Initializing App Update Manager');
      _currentContext = context;

      // Initialize dependencies
      await _updateService.initialize();

      // Monitor connectivity changes
      _connectivitySubscription = _connectivityHelper.onConnectivityChanged
          .listen(_onConnectivityChanged);

      // Monitor update progress
      _progressSubscription = _updateService.updateProgressStream?.listen(
        _onUpdateProgress,
      );

      // Perform initial update check if online
      if (await _connectivityHelper.isOnline()) {
        await _performInitialUpdateCheck();
      }

      _isInitialized = true;
      _logger.i('$_tag: App Update Manager initialized successfully');
    } catch (e, stackTrace) {
      _logger.e(
        '$_tag: Failed to initialize',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Perform initial update check on app start
  Future<void> _performInitialUpdateCheck() async {
    try {
      _logger.i('$_tag: Performing initial update check');

      final updateInfo = await _updateService.checkForUpdates();

      if (updateInfo != null) {
        _currentUpdateInfo = updateInfo;

        // Handle critical updates immediately
        if (updateInfo.isCritical) {
          await _handleCriticalUpdate(updateInfo);
        } else {
          // Show update banner for non-critical updates
          await _showUpdateBanner(updateInfo);
        }
      }
    } catch (e) {
      _logger.w('$_tag: Initial update check failed', error: e);
    }
  }

  /// Handle critical update that must be installed
  Future<void> _handleCriticalUpdate(AppUpdateInfo updateInfo) async {
    if (_currentContext == null) return;

    _logger.i('$_tag: Handling critical update: ${updateInfo.latestVersion}');

    // Show critical update notification
    // await _notificationService.showCriticalUpdateNotification(
    //   version: updateInfo.latestVersion,
    //   securityMessage: updateInfo.releaseNotes,
    // );

    // Show blocking dialog
    if (_currentContext!.mounted) {
      await showDialog(
        context: _currentContext!,
        barrierDismissible: false,
        builder: (context) => AppUpdateDialog(
          updateInfo: updateInfo,
          onUpdateTap: () {
            unawaited(_startUpdate(updateInfo));
          },
          onLaterTap: () {
            Navigator.of(context).pop();
            _showCriticalUpdateDeferredMessage();
          },
        ),
      );
    }
  }

  /// Show update banner for non-critical updates
  Future<void> _showUpdateBanner(AppUpdateInfo updateInfo) async {
    if (_currentContext == null) return;

    _logger.i(
      '$_tag: Showing update banner for version: ${updateInfo.latestVersion}',
    );

    // Show notification
    // await _notificationService.showUpdateAvailableNotification(
    //   title: 'Update Available',
    //   body: 'Agrinova ${updateInfo.latestVersion} is ready to download',
    //   version: updateInfo.latestVersion,
    //   isCritical: false,
    // );

    if (_currentContext!.mounted) {
      final messenger = ScaffoldMessenger.of(_currentContext!);
      messenger.hideCurrentMaterialBanner();

      messenger.showMaterialBanner(
        MaterialBanner(
          content: Text(
            'Agrinova ${updateInfo.latestVersion} tersedia. '
            'Perbarui sekarang untuk mendapatkan perbaikan terbaru.',
          ),
          leading: const Icon(Icons.system_update),
          backgroundColor: Colors.blue.shade50,
          actions: [
            TextButton(
              onPressed: () {
                messenger.hideCurrentMaterialBanner();
              },
              child: const Text('Nanti'),
            ),
            FilledButton(
              onPressed: () {
                messenger.hideCurrentMaterialBanner();
                unawaited(_startUpdate(updateInfo));
              },
              child: const Text('Perbarui'),
            ),
          ],
        ),
      );
    }
  }

  /// Start update process with user consent
  Future<void> startUpdate(
    AppUpdateInfo updateInfo, {
    UpdateInstallMode installMode = UpdateInstallMode.flexible,
  }) async {
    try {
      _logger.i('$_tag: Starting update: ${updateInfo.latestVersion}');

      // Check connectivity requirements
      if (!await _validateConnectivityForUpdate(updateInfo)) {
        _showConnectivityError(updateInfo);
        return;
      }

      // Check user policy preferences
      final policy = _updateService.getUpdatePolicy();
      if (!await _validateUpdatePolicy(updateInfo, policy)) {
        _showPolicyError(policy);
        return;
      }

      // Start the update
      await _updateService.startUpdate(updateInfo, installMode: installMode);
    } catch (e, stackTrace) {
      _logger.e(
        '$_tag: Failed to start update',
        error: e,
        stackTrace: stackTrace,
      );
      _showUpdateError(e.toString());
    }
  }

  /// Check for updates manually (user-triggered)
  Future<AppUpdateInfo?> checkForUpdatesManually() async {
    if (_isCheckingForUpdates) {
      _logger.w('$_tag: Update check already in progress');
      return null;
    }

    try {
      _isCheckingForUpdates = true;
      _logger.i('$_tag: Manual update check requested');

      // Check if online
      if (!await _connectivityHelper.isOnline()) {
        _showNoInternetError();
        return null;
      }

      // Force update check
      final updateInfo = await _updateService.checkForUpdates(forceCheck: true);

      if (updateInfo != null) {
        _currentUpdateInfo = updateInfo;

        // Show update dialog
        if (_currentContext != null && _currentContext!.mounted) {
          await _showUpdateDialog(updateInfo);
        }

        return updateInfo;
      } else {
        _showNoUpdatesAvailable();
        return null;
      }
    } catch (e, stackTrace) {
      _logger.e(
        '$_tag: Manual update check failed',
        error: e,
        stackTrace: stackTrace,
      );
      _showUpdateCheckError(e.toString());
      return null;
    } finally {
      _isCheckingForUpdates = false;
    }
  }

  /// Show update dialog with options
  Future<void> _showUpdateDialog(AppUpdateInfo updateInfo) async {
    if (_currentContext == null || !_currentContext!.mounted) return;

    await showDialog(
      context: _currentContext!,
      builder: (context) => AppUpdateDialog(
        updateInfo: updateInfo,
        onUpdateTap: () {
          Navigator.of(context).pop();
          _startUpdate(updateInfo);
        },
        onLaterTap: updateInfo.isCritical
            ? null
            : () {
                Navigator.of(context).pop();
              },
        onSkipTap: updateInfo.isCritical
            ? null
            : () {
                Navigator.of(context).pop();
                _skipVersion(updateInfo.latestVersion);
              },
      ),
    );
  }

  /// Skip a specific version
  Future<void> _skipVersion(String version) async {
    await _updateService.skipVersion(version);
    _logger.i('$_tag: Version $version skipped');

    _currentUpdateInfo = null;
    _showVersionSkipped(version);
  }

  /// Start update helper method
  Future<void> _startUpdate(AppUpdateInfo updateInfo) async {
    await startUpdate(updateInfo);
  }

  /// Handle connectivity changes
  void _onConnectivityChanged(ConnectivityStatus status) {
    _logger.d('$_tag: Connectivity changed: $status');

    if (status.hasInternet && _currentUpdateInfo == null) {
      // Check for updates when coming online
      Future.delayed(const Duration(seconds: 5), () async {
        final updateInfo = await _updateService.checkForUpdates();
        if (updateInfo != null && !updateInfo.isCritical) {
          _currentUpdateInfo = updateInfo;
          await _showUpdateBanner(updateInfo);
        }
      });
    }
  }

  /// Handle update progress changes
  void _onUpdateProgress(AppUpdateProgress progress) {
    _logger.d('$_tag: Update progress: ${progress.status}');

    switch (progress.status) {
      case UpdateProgressStatus.completed:
        _onUpdateCompleted(progress);
        break;
      case UpdateProgressStatus.failed:
        _onUpdateFailed(progress);
        break;
      case UpdateProgressStatus.readyToInstall:
        _onUpdateReadyToInstall(progress);
        break;
      default:
        break;
    }
  }

  /// Handle successful update completion
  void _onUpdateCompleted(AppUpdateProgress progress) {
    _logger.i(
      '$_tag: Update completed successfully: ${progress.updateInfo.latestVersion}',
    );

    _currentUpdateInfo = null;
    _showUpdateCompleted(progress.updateInfo);
  }

  /// Handle update failure
  void _onUpdateFailed(AppUpdateProgress progress) {
    _logger.e('$_tag: Update failed: ${progress.error}');

    _showUpdateError(progress.error ?? 'Unknown error');
  }

  /// Handle update ready to install
  void _onUpdateReadyToInstall(AppUpdateProgress progress) {
    _logger.i(
      '$_tag: Update ready to install: ${progress.updateInfo.latestVersion}',
    );

    // _notificationService.showUpdateReadyNotification(
    //   version: progress.updateInfo.latestVersion,
    // );
  }

  /// Validate connectivity requirements for update
  Future<bool> _validateConnectivityForUpdate(AppUpdateInfo updateInfo) async {
    final status = await _connectivityHelper.getCurrentConnectivityStatus();

    // User requested direct update flow without network policy restrictions.
    return status.hasInternet;
  }

  /// Validate update policy requirements
  Future<bool> _validateUpdatePolicy(
    AppUpdateInfo updateInfo,
    AppUpdatePolicy policy,
  ) async {
    // Keep policy persisted for future use, but do not block manual update.
    final _ = (updateInfo, policy);
    return true;
  }

  /// Get current update information
  AppUpdateInfo? get currentUpdateInfo => _currentUpdateInfo;

  /// Check if update is available
  bool get hasUpdateAvailable => _currentUpdateInfo != null;

  /// Check if critical update is available
  bool get hasCriticalUpdate => _currentUpdateInfo?.isCritical ?? false;

  /// UI Helper Methods
  void _showConnectivityError(AppUpdateInfo updateInfo) {
    if (_currentContext == null) return;

    final _ = updateInfo;
    const message =
        'Koneksi internet diperlukan untuk memulai pembaruan aplikasi';

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      SnackBar(
        content: Text(message),
        action: SnackBarAction(
          label: 'Pengaturan',
          onPressed: () {
            // Open update settings
          },
        ),
      ),
    );
  }

  void _showPolicyError(AppUpdatePolicy policy) {
    if (_currentContext == null) return;

    String message = 'Pembaruan tidak diizinkan oleh kebijakan saat ini';
    if (policy.quietHours != null && !policy.isDownloadAllowedNow) {
      message = 'Pembaruan tidak diizinkan saat jam tenang';
    }

    ScaffoldMessenger.of(
      _currentContext!,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _showCriticalUpdateDeferredMessage() {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      const SnackBar(
        content: Text(
          'Pembaruan kritis masih tertunda. Mohon lakukan pembaruan segera.',
        ),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _showUpdateError(String error) {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      SnackBar(
        content: Text('Pembaruan gagal: $error'),
        backgroundColor: Colors.red,
        action: SnackBarAction(
          label: 'Coba lagi',
          onPressed: () {
            if (_currentUpdateInfo != null) {
              _startUpdate(_currentUpdateInfo!);
            }
          },
        ),
      ),
    );
  }

  void _showNoInternetError() {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      const SnackBar(
        content: Text('Koneksi internet diperlukan untuk memeriksa pembaruan'),
      ),
    );
  }

  void _showNoUpdatesAvailable() {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      const SnackBar(
        content: Text('Aplikasi Agrinova Anda sudah versi terbaru'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showUpdateCheckError(String error) {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      SnackBar(
        content: Text('Gagal memeriksa pembaruan: $error'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _showVersionSkipped(String version) {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(
      _currentContext!,
    ).showSnackBar(
      SnackBar(content: Text('Versi $version akan dilewati')),
    );
  }

  void _showUpdateCompleted(AppUpdateInfo updateInfo) {
    if (_currentContext == null) return;

    ScaffoldMessenger.of(_currentContext!).showSnackBar(
      SnackBar(
        content: Text(
          'Pembaruan berhasil ke versi ${updateInfo.latestVersion}',
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  /// Update the current context (call from main widget)
  void updateContext(BuildContext context) {
    _currentContext = context;
  }

  /// Dispose resources
  void dispose() {
    _progressSubscription?.cancel();
    _connectivitySubscription?.cancel();
    _connectivityHelper.dispose();
    _updateService.dispose();
    _isInitialized = false;
    _logger.i('$_tag: App Update Manager disposed');
  }
}
