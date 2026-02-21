import 'package:equatable/equatable.dart';

/// Photo Queue Statistics Model
/// 
/// Represents statistics for photo upload queue
class PhotoQueueStats extends Equatable {
  final int totalPhotos;
  final int pendingPhotos;
  final int uploadingPhotos;
  final int failedPhotos;
  final int syncedPhotos;
  final int totalSizeBytes;
  final int uploadedBytes;
  final int remainingBytes;
  final double compressionRatio;
  final int estimatedUploadTimeSeconds;
  final DateTime? lastUploadTime;

  const PhotoQueueStats({
    required this.totalPhotos,
    required this.pendingPhotos,
    required this.uploadingPhotos,
    required this.failedPhotos,
    required this.syncedPhotos,
    required this.totalSizeBytes,
    required this.uploadedBytes,
    required this.remainingBytes,
    required this.compressionRatio,
    required this.estimatedUploadTimeSeconds,
    this.lastUploadTime,
  });

  /// Get upload progress percentage
  double get uploadProgress {
    if (totalSizeBytes == 0) return 0.0;
    return uploadedBytes / totalSizeBytes;
  }

  /// Get upload progress percentage as int
  int get uploadProgressPercentage => (uploadProgress * 100).round();

  /// Get formatted total size
  String get formattedTotalSize => _formatBytes(totalSizeBytes);

  /// Get formatted uploaded size
  String get formattedUploadedSize => _formatBytes(uploadedBytes);

  /// Get formatted remaining size
  String get formattedRemainingSize => _formatBytes(remainingBytes);

  /// Get formatted compression ratio
  String get formattedCompressionRatio => '${(compressionRatio * 100).toStringAsFixed(1)}%';

  /// Get formatted estimated time
  String get formattedEstimatedTime {
    if (estimatedUploadTimeSeconds < 60) {
      return '$estimatedUploadTimeSeconds detik';
    } else if (estimatedUploadTimeSeconds < 3600) {
      final minutes = (estimatedUploadTimeSeconds / 60).round();
      return '$minutes menit';
    } else {
      final hours = (estimatedUploadTimeSeconds / 3600).round();
      return '$hours jam';
    }
  }

  /// Format bytes to human readable
  String _formatBytes(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }

  /// Create empty stats
  factory PhotoQueueStats.empty() {
    return const PhotoQueueStats(
      totalPhotos: 0,
      pendingPhotos: 0,
      uploadingPhotos: 0,
      failedPhotos: 0,
      syncedPhotos: 0,
      totalSizeBytes: 0,
      uploadedBytes: 0,
      remainingBytes: 0,
      compressionRatio: 0.0,
      estimatedUploadTimeSeconds: 0,
    );
  }

  /// Create from map
  factory PhotoQueueStats.fromMap(Map<String, dynamic> map) {
    return PhotoQueueStats(
      totalPhotos: map['total_photos'] as int,
      pendingPhotos: map['pending_photos'] as int,
      uploadingPhotos: map['uploading_photos'] as int,
      failedPhotos: map['failed_photos'] as int,
      syncedPhotos: map['synced_photos'] as int,
      totalSizeBytes: map['total_size_bytes'] as int,
      uploadedBytes: map['uploaded_bytes'] as int,
      remainingBytes: map['remaining_bytes'] as int,
      compressionRatio: (map['compression_ratio'] as num).toDouble(),
      estimatedUploadTimeSeconds: map['estimated_upload_time_seconds'] as int,
      lastUploadTime: map['last_upload_time'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['last_upload_time'] as int)
          : null,
    );
  }

  /// Convert to map
  Map<String, dynamic> toMap() {
    return {
      'total_photos': totalPhotos,
      'pending_photos': pendingPhotos,
      'uploading_photos': uploadingPhotos,
      'failed_photos': failedPhotos,
      'synced_photos': syncedPhotos,
      'total_size_bytes': totalSizeBytes,
      'uploaded_bytes': uploadedBytes,
      'remaining_bytes': remainingBytes,
      'compression_ratio': compressionRatio,
      'estimated_upload_time_seconds': estimatedUploadTimeSeconds,
      'last_upload_time': lastUploadTime?.millisecondsSinceEpoch,
    };
  }

  @override
  List<Object?> get props => [
        totalPhotos,
        pendingPhotos,
        uploadingPhotos,
        failedPhotos,
        syncedPhotos,
        totalSizeBytes,
        uploadedBytes,
        remainingBytes,
        compressionRatio,
        estimatedUploadTimeSeconds,
        lastUploadTime,
      ];
}
