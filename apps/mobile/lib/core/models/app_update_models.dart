import 'package:json_annotation/json_annotation.dart';
import 'package:equatable/equatable.dart';

part 'app_update_models.g.dart';

/// App version information model
@JsonSerializable()
class AppVersionInfo extends Equatable {
  final String version;
  final int buildNumber;
  final String packageName;
  final String appName;

  const AppVersionInfo({
    required this.version,
    required this.buildNumber,
    required this.packageName,
    required this.appName,
  });

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) =>
      _$AppVersionInfoFromJson(json);

  Map<String, dynamic> toJson() => _$AppVersionInfoToJson(this);

  @override
  List<Object?> get props => [version, buildNumber, packageName, appName];
}

/// Update type enumeration
enum UpdateType {
  @JsonValue('critical')
  critical,
  @JsonValue('recommended')
  recommended,
  @JsonValue('optional')
  optional,
}

/// Update delivery method enumeration
enum UpdateDeliveryMethod {
  @JsonValue('play_store')
  playStore,
  @JsonValue('ota')
  ota,
  @JsonValue('apk_download')
  apkDownload,
}

/// Update install mode enumeration
enum UpdateInstallMode {
  flexible,
  immediate,
}

/// App update information model
@JsonSerializable()
class AppUpdateInfo extends Equatable {
  final String latestVersion;
  final int latestBuildNumber;
  final UpdateType updateType;
  final UpdateDeliveryMethod deliveryMethod;
  final String? releaseNotes;
  final String? downloadUrl;
  final String? apkDownloadUrl;
  final String? otaPatchUrl;
  final int? fileSizeBytes;
  final DateTime? releaseDate;
  final List<String>? supportedPlatforms;
  final Map<String, dynamic>? metadata;

  const AppUpdateInfo({
    required this.latestVersion,
    required this.latestBuildNumber,
    required this.updateType,
    required this.deliveryMethod,
    this.releaseNotes,
    this.downloadUrl,
    this.apkDownloadUrl,
    this.otaPatchUrl,
    this.fileSizeBytes,
    this.releaseDate,
    this.supportedPlatforms,
    this.metadata,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) =>
      _$AppUpdateInfoFromJson(json);

  Map<String, dynamic> toJson() => _$AppUpdateInfoToJson(this);

  /// Check if this is a critical update that must be installed
  bool get isCritical => updateType == UpdateType.critical;

  /// Check if update requires user consent
  bool get requiresUserConsent => 
      updateType != UpdateType.critical || 
      deliveryMethod == UpdateDeliveryMethod.apkDownload;

  /// Get formatted file size
  String get formattedFileSize {
    if (fileSizeBytes == null) return 'Unknown size';
    
    final bytes = fileSizeBytes!;
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  @override
  List<Object?> get props => [
        latestVersion,
        latestBuildNumber,
        updateType,
        deliveryMethod,
        releaseNotes,
        downloadUrl,
        apkDownloadUrl,
        otaPatchUrl,
        fileSizeBytes,
        releaseDate,
        supportedPlatforms,
        metadata,
      ];
}

/// Update progress status enumeration
enum UpdateProgressStatus {
  checking,
  available,
  downloading,
  installing,
  readyToInstall,
  completed,
  failed,
  cancelled,
}

/// App update progress model
@JsonSerializable()
class AppUpdateProgress extends Equatable {
  final UpdateProgressStatus status;
  final AppUpdateInfo updateInfo;
  final double? progress; // 0.0 to 1.0
  final String? message;
  final String? error;
  final DateTime timestamp;

  const AppUpdateProgress({
    required this.status,
    required this.updateInfo,
    this.progress,
    this.message,
    this.error,
    required this.timestamp,
  });

  factory AppUpdateProgress.fromJson(Map<String, dynamic> json) =>
      _$AppUpdateProgressFromJson(json);

  Map<String, dynamic> toJson() => _$AppUpdateProgressToJson(this);

  /// Factory constructors for different states
  factory AppUpdateProgress.checking(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.checking,
        updateInfo: updateInfo,
        message: 'Checking for updates...',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.available(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.available,
        updateInfo: updateInfo,
        message: 'Update available',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.starting(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.downloading,
        updateInfo: updateInfo,
        progress: 0.0,
        message: 'Starting update...',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.downloading(AppUpdateInfo updateInfo, double progress) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.downloading,
        updateInfo: updateInfo,
        progress: progress,
        message: 'Downloading update... ${(progress * 100).toInt()}%',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.installing(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.installing,
        updateInfo: updateInfo,
        message: 'Installing update...',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.readyToInstall(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.readyToInstall,
        updateInfo: updateInfo,
        message: 'Update ready to install',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.completed(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.completed,
        updateInfo: updateInfo,
        message: 'Update completed successfully',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.failed(AppUpdateInfo updateInfo, String error) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.failed,
        updateInfo: updateInfo,
        error: error,
        message: 'Update failed: $error',
        timestamp: DateTime.now(),
      );

  factory AppUpdateProgress.cancelled(AppUpdateInfo updateInfo) =>
      AppUpdateProgress(
        status: UpdateProgressStatus.cancelled,
        updateInfo: updateInfo,
        message: 'Update cancelled',
        timestamp: DateTime.now(),
      );

  /// Get formatted progress percentage
  String get formattedProgress {
    if (progress == null) return '';
    return '${(progress! * 100).toInt()}%';
  }

  /// Check if update is in progress
  bool get isInProgress => [
        UpdateProgressStatus.checking,
        UpdateProgressStatus.downloading,
        UpdateProgressStatus.installing,
      ].contains(status);

  /// Check if update has finished (success or failure)
  bool get isFinished => [
        UpdateProgressStatus.completed,
        UpdateProgressStatus.failed,
        UpdateProgressStatus.cancelled,
      ].contains(status);

  @override
  List<Object?> get props => [
        status,
        updateInfo,
        progress,
        message,
        error,
        timestamp,
      ];
}

/// Time range model for quiet hours
@JsonSerializable()
class TimeRange extends Equatable {
  final String start; // HH:mm format
  final String end;   // HH:mm format

  const TimeRange({
    required this.start,
    required this.end,
  });

  factory TimeRange.fromJson(Map<String, dynamic> json) =>
      _$TimeRangeFromJson(json);

  Map<String, dynamic> toJson() => _$TimeRangeToJson(this);

  /// Check if current time is within this range
  bool get isCurrentTimeInRange {
    final now = DateTime.now();
    final currentTime = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    
    final startTime = _parseTime(start);
    final endTime = _parseTime(end);
    final current = _parseTime(currentTime);
    
    if (startTime <= endTime) {
      // Same day range (e.g., 09:00 - 17:00)
      return current >= startTime && current <= endTime;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      return current >= startTime || current <= endTime;
    }
  }

  int _parseTime(String time) {
    final parts = time.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  @override
  List<Object?> get props => [start, end];
}

/// App update policy model
@JsonSerializable()
class AppUpdatePolicy extends Equatable {
  final bool autoCheckEnabled;
  final bool autoDownloadEnabled;
  final bool wifiOnlyDownload;
  final bool allowMeteredConnection;
  final TimeRange? quietHours;
  final List<String>? allowedNetworkTypes;
  final int? maxDownloadSizeMB;

  const AppUpdatePolicy({
    required this.autoCheckEnabled,
    required this.autoDownloadEnabled,
    required this.wifiOnlyDownload,
    required this.allowMeteredConnection,
    this.quietHours,
    this.allowedNetworkTypes,
    this.maxDownloadSizeMB,
  });

  factory AppUpdatePolicy.fromJson(Map<String, dynamic> json) =>
      _$AppUpdatePolicyFromJson(json);

  Map<String, dynamic> toJson() => _$AppUpdatePolicyToJson(this);

  /// Check if downloads are allowed at current time
  bool get isDownloadAllowedNow {
    if (quietHours != null && quietHours!.isCurrentTimeInRange) {
      return false; // Quiet hours active
    }
    return true;
  }

  /// Create default policy
  factory AppUpdatePolicy.defaults() => const AppUpdatePolicy(
        autoCheckEnabled: true,
        autoDownloadEnabled: false,
        wifiOnlyDownload: true,
        allowMeteredConnection: false,
      );

  @override
  List<Object?> get props => [
        autoCheckEnabled,
        autoDownloadEnabled,
        wifiOnlyDownload,
        allowMeteredConnection,
        quietHours,
        allowedNetworkTypes,
        maxDownloadSizeMB,
      ];
}

/// Update history entry model
@JsonSerializable()
class UpdateHistoryEntry extends Equatable {
  final String version;
  final int buildNumber;
  final UpdateType updateType;
  final UpdateDeliveryMethod deliveryMethod;
  final DateTime installDate;
  final bool successful;
  final String? errorMessage;
  final Duration? installDuration;

  const UpdateHistoryEntry({
    required this.version,
    required this.buildNumber,
    required this.updateType,
    required this.deliveryMethod,
    required this.installDate,
    required this.successful,
    this.errorMessage,
    this.installDuration,
  });

  factory UpdateHistoryEntry.fromJson(Map<String, dynamic> json) =>
      _$UpdateHistoryEntryFromJson(json);

  Map<String, dynamic> toJson() => _$UpdateHistoryEntryToJson(this);

  @override
  List<Object?> get props => [
        version,
        buildNumber,
        updateType,
        deliveryMethod,
        installDate,
        successful,
        errorMessage,
        installDuration,
      ];
}