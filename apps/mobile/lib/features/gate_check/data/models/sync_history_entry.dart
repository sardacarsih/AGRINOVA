import 'package:equatable/equatable.dart';

/// Sync History Entry Model
/// 
/// Represents a single sync operation in history
class SyncHistoryEntry extends Equatable {
  final String id;
  final String recordId;
  final String tableName;
  final String operation; // 'CREATE', 'UPDATE', 'DELETE'
  final DateTime timestamp;
  final bool success;
  final String? errorMessage;
  final int retryCount;
  final int bytesTransferred;
  final int durationMs;
  final DateTime createdAt;

  const SyncHistoryEntry({
    required this.id,
    required this.recordId,
    required this.tableName,
    required this.operation,
    required this.timestamp,
    required this.success,
    this.errorMessage,
    required this.retryCount,
    required this.bytesTransferred,
    required this.durationMs,
    required this.createdAt,
  });

  /// Get formatted duration
  String get formattedDuration {
    if (durationMs < 1000) {
      return '${durationMs}ms';
    } else if (durationMs < 60000) {
      return '${(durationMs / 1000).toStringAsFixed(1)}s';
    } else {
      return '${(durationMs / 60000).toStringAsFixed(1)}m';
    }
  }

  /// Get formatted bytes
  String get formattedBytes {
    if (bytesTransferred < 1024) {
      return '$bytesTransferred B';
    } else if (bytesTransferred < 1024 * 1024) {
      return '${(bytesTransferred / 1024).toStringAsFixed(1)} KB';
    } else {
      return '${(bytesTransferred / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
  }

  /// Get status color
  String get statusColor {
    return success ? 'green' : 'red';
  }

  /// Get status text
  String get statusText {
    return success ? 'Berhasil' : 'Gagal';
  }

  /// Create from database map
  factory SyncHistoryEntry.fromDatabase(Map<String, dynamic> map) {
    return SyncHistoryEntry(
      id: map['id'] as String,
      recordId: map['record_id'] as String,
      tableName: map['table_name'] as String,
      operation: map['operation'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int),
      success: (map['success'] as int) == 1,
      errorMessage: map['error_message'] as String?,
      retryCount: map['retry_count'] as int,
      bytesTransferred: map['bytes_transferred'] as int,
      durationMs: map['duration_ms'] as int,
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
    );
  }

  /// Convert to database map
  Map<String, dynamic> toDatabase() {
    return {
      'id': id,
      'record_id': recordId,
      'table_name': tableName,
      'operation': operation,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'success': success ? 1 : 0,
      'error_message': errorMessage,
      'retry_count': retryCount,
      'bytes_transferred': bytesTransferred,
      'duration_ms': durationMs,
      'created_at': createdAt.millisecondsSinceEpoch,
    };
  }

  @override
  List<Object?> get props => [
        id,
        recordId,
        tableName,
        operation,
        timestamp,
        success,
        errorMessage,
        retryCount,
        bytesTransferred,
        durationMs,
        createdAt,
      ];
}
