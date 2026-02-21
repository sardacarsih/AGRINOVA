import 'package:equatable/equatable.dart';

/// Sync Progress Model
/// 
/// Represents real-time progress of a sync operation
class SyncProgress extends Equatable {
  final String recordId;
  final String tableName;
  final double progress; // 0.0 to 1.0
  final int bytesUploaded;
  final int totalBytes;
  final String stage; // 'queued', 'uploading', 'validating', 'completed'
  final int estimatedTimeRemaining; // in seconds
  final DateTime startTime;
  final DateTime? completionTime;
  final String? errorMessage;

  const SyncProgress({
    required this.recordId,
    required this.tableName,
    required this.progress,
    required this.bytesUploaded,
    required this.totalBytes,
    required this.stage,
    required this.estimatedTimeRemaining,
    required this.startTime,
    this.completionTime,
    this.errorMessage,
  });

  /// Calculate percentage
  int get percentage => (progress * 100).round();

  /// Check if completed
  bool get isCompleted => progress >= 1.0 || stage == 'completed';

  /// Check if failed
  bool get isFailed => errorMessage != null;

  /// Get formatted bytes
  String get formattedBytesUploaded => _formatBytes(bytesUploaded);
  String get formattedTotalBytes => _formatBytes(totalBytes);

  /// Get formatted time remaining
  String get formattedTimeRemaining {
    if (estimatedTimeRemaining < 60) {
      return '$estimatedTimeRemaining detik';
    } else if (estimatedTimeRemaining < 3600) {
      final minutes = (estimatedTimeRemaining / 60).round();
      return '$minutes menit';
    } else {
      final hours = (estimatedTimeRemaining / 3600).round();
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

  /// Create from map
  factory SyncProgress.fromMap(Map<String, dynamic> map) {
    return SyncProgress(
      recordId: map['record_id'] as String,
      tableName: map['table_name'] as String,
      progress: (map['progress'] as num).toDouble(),
      bytesUploaded: map['bytes_uploaded'] as int,
      totalBytes: map['total_bytes'] as int,
      stage: map['stage'] as String,
      estimatedTimeRemaining: map['estimated_time_remaining'] as int,
      startTime: DateTime.fromMillisecondsSinceEpoch(map['start_time'] as int),
      completionTime: map['completion_time'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['completion_time'] as int)
          : null,
      errorMessage: map['error_message'] as String?,
    );
  }

  /// Convert to map
  Map<String, dynamic> toMap() {
    return {
      'record_id': recordId,
      'table_name': tableName,
      'progress': progress,
      'bytes_uploaded': bytesUploaded,
      'total_bytes': totalBytes,
      'stage': stage,
      'estimated_time_remaining': estimatedTimeRemaining,
      'start_time': startTime.millisecondsSinceEpoch,
      'completion_time': completionTime?.millisecondsSinceEpoch,
      'error_message': errorMessage,
    };
  }

  /// Copy with
  SyncProgress copyWith({
    String? recordId,
    String? tableName,
    double? progress,
    int? bytesUploaded,
    int? totalBytes,
    String? stage,
    int? estimatedTimeRemaining,
    DateTime? startTime,
    DateTime? completionTime,
    String? errorMessage,
  }) {
    return SyncProgress(
      recordId: recordId ?? this.recordId,
      tableName: tableName ?? this.tableName,
      progress: progress ?? this.progress,
      bytesUploaded: bytesUploaded ?? this.bytesUploaded,
      totalBytes: totalBytes ?? this.totalBytes,
      stage: stage ?? this.stage,
      estimatedTimeRemaining: estimatedTimeRemaining ?? this.estimatedTimeRemaining,
      startTime: startTime ?? this.startTime,
      completionTime: completionTime ?? this.completionTime,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        recordId,
        tableName,
        progress,
        bytesUploaded,
        totalBytes,
        stage,
        estimatedTimeRemaining,
        startTime,
        completionTime,
        errorMessage,
      ];
}
