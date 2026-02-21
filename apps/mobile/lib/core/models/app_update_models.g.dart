// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_update_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AppVersionInfo _$AppVersionInfoFromJson(Map<String, dynamic> json) =>
    AppVersionInfo(
      version: json['version'] as String,
      buildNumber: (json['buildNumber'] as num).toInt(),
      packageName: json['packageName'] as String,
      appName: json['appName'] as String,
    );

Map<String, dynamic> _$AppVersionInfoToJson(AppVersionInfo instance) =>
    <String, dynamic>{
      'version': instance.version,
      'buildNumber': instance.buildNumber,
      'packageName': instance.packageName,
      'appName': instance.appName,
    };

AppUpdateInfo _$AppUpdateInfoFromJson(Map<String, dynamic> json) =>
    AppUpdateInfo(
      latestVersion: json['latestVersion'] as String,
      latestBuildNumber: (json['latestBuildNumber'] as num).toInt(),
      updateType: $enumDecode(_$UpdateTypeEnumMap, json['updateType']),
      deliveryMethod:
          $enumDecode(_$UpdateDeliveryMethodEnumMap, json['deliveryMethod']),
      releaseNotes: json['releaseNotes'] as String?,
      downloadUrl: json['downloadUrl'] as String?,
      apkDownloadUrl: json['apkDownloadUrl'] as String?,
      otaPatchUrl: json['otaPatchUrl'] as String?,
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt(),
      releaseDate: json['releaseDate'] == null
          ? null
          : DateTime.parse(json['releaseDate'] as String),
      supportedPlatforms: (json['supportedPlatforms'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$AppUpdateInfoToJson(AppUpdateInfo instance) =>
    <String, dynamic>{
      'latestVersion': instance.latestVersion,
      'latestBuildNumber': instance.latestBuildNumber,
      'updateType': _$UpdateTypeEnumMap[instance.updateType]!,
      'deliveryMethod': _$UpdateDeliveryMethodEnumMap[instance.deliveryMethod]!,
      'releaseNotes': instance.releaseNotes,
      'downloadUrl': instance.downloadUrl,
      'apkDownloadUrl': instance.apkDownloadUrl,
      'otaPatchUrl': instance.otaPatchUrl,
      'fileSizeBytes': instance.fileSizeBytes,
      'releaseDate': instance.releaseDate?.toIso8601String(),
      'supportedPlatforms': instance.supportedPlatforms,
      'metadata': instance.metadata,
    };

const _$UpdateTypeEnumMap = {
  UpdateType.critical: 'critical',
  UpdateType.recommended: 'recommended',
  UpdateType.optional: 'optional',
};

const _$UpdateDeliveryMethodEnumMap = {
  UpdateDeliveryMethod.playStore: 'play_store',
  UpdateDeliveryMethod.ota: 'ota',
  UpdateDeliveryMethod.apkDownload: 'apk_download',
};

AppUpdateProgress _$AppUpdateProgressFromJson(Map<String, dynamic> json) =>
    AppUpdateProgress(
      status: $enumDecode(_$UpdateProgressStatusEnumMap, json['status']),
      updateInfo:
          AppUpdateInfo.fromJson(json['updateInfo'] as Map<String, dynamic>),
      progress: (json['progress'] as num?)?.toDouble(),
      message: json['message'] as String?,
      error: json['error'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );

Map<String, dynamic> _$AppUpdateProgressToJson(AppUpdateProgress instance) =>
    <String, dynamic>{
      'status': _$UpdateProgressStatusEnumMap[instance.status]!,
      'updateInfo': instance.updateInfo,
      'progress': instance.progress,
      'message': instance.message,
      'error': instance.error,
      'timestamp': instance.timestamp.toIso8601String(),
    };

const _$UpdateProgressStatusEnumMap = {
  UpdateProgressStatus.checking: 'checking',
  UpdateProgressStatus.available: 'available',
  UpdateProgressStatus.downloading: 'downloading',
  UpdateProgressStatus.installing: 'installing',
  UpdateProgressStatus.readyToInstall: 'readyToInstall',
  UpdateProgressStatus.completed: 'completed',
  UpdateProgressStatus.failed: 'failed',
  UpdateProgressStatus.cancelled: 'cancelled',
};

TimeRange _$TimeRangeFromJson(Map<String, dynamic> json) => TimeRange(
      start: json['start'] as String,
      end: json['end'] as String,
    );

Map<String, dynamic> _$TimeRangeToJson(TimeRange instance) => <String, dynamic>{
      'start': instance.start,
      'end': instance.end,
    };

AppUpdatePolicy _$AppUpdatePolicyFromJson(Map<String, dynamic> json) =>
    AppUpdatePolicy(
      autoCheckEnabled: json['autoCheckEnabled'] as bool,
      autoDownloadEnabled: json['autoDownloadEnabled'] as bool,
      wifiOnlyDownload: json['wifiOnlyDownload'] as bool,
      allowMeteredConnection: json['allowMeteredConnection'] as bool,
      quietHours: json['quietHours'] == null
          ? null
          : TimeRange.fromJson(json['quietHours'] as Map<String, dynamic>),
      allowedNetworkTypes: (json['allowedNetworkTypes'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      maxDownloadSizeMB: (json['maxDownloadSizeMB'] as num?)?.toInt(),
    );

Map<String, dynamic> _$AppUpdatePolicyToJson(AppUpdatePolicy instance) =>
    <String, dynamic>{
      'autoCheckEnabled': instance.autoCheckEnabled,
      'autoDownloadEnabled': instance.autoDownloadEnabled,
      'wifiOnlyDownload': instance.wifiOnlyDownload,
      'allowMeteredConnection': instance.allowMeteredConnection,
      'quietHours': instance.quietHours,
      'allowedNetworkTypes': instance.allowedNetworkTypes,
      'maxDownloadSizeMB': instance.maxDownloadSizeMB,
    };

UpdateHistoryEntry _$UpdateHistoryEntryFromJson(Map<String, dynamic> json) =>
    UpdateHistoryEntry(
      version: json['version'] as String,
      buildNumber: (json['buildNumber'] as num).toInt(),
      updateType: $enumDecode(_$UpdateTypeEnumMap, json['updateType']),
      deliveryMethod:
          $enumDecode(_$UpdateDeliveryMethodEnumMap, json['deliveryMethod']),
      installDate: DateTime.parse(json['installDate'] as String),
      successful: json['successful'] as bool,
      errorMessage: json['errorMessage'] as String?,
      installDuration: json['installDuration'] == null
          ? null
          : Duration(microseconds: (json['installDuration'] as num).toInt()),
    );

Map<String, dynamic> _$UpdateHistoryEntryToJson(UpdateHistoryEntry instance) =>
    <String, dynamic>{
      'version': instance.version,
      'buildNumber': instance.buildNumber,
      'updateType': _$UpdateTypeEnumMap[instance.updateType]!,
      'deliveryMethod': _$UpdateDeliveryMethodEnumMap[instance.deliveryMethod]!,
      'installDate': instance.installDate.toIso8601String(),
      'successful': instance.successful,
      'errorMessage': instance.errorMessage,
      'installDuration': instance.installDuration?.inMicroseconds,
    };
