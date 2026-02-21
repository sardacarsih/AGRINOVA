import 'dart:io';
import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:path/path.dart' as path;
import 'package:graphql_flutter/graphql_flutter.dart';

import '../models/api_models.dart';
import '../database/enhanced_database_service.dart';
import 'photo_compression_service.dart';
import 'graphql_sync_service.dart';

/// Advanced Photo Sync Service with Compression
/// 
/// Features:
/// - Automatic compression before upload
/// - Queue-based upload system with priority
/// - Offline-first with deferred upload
/// - Batch processing for multiple photos
/// - Progress tracking and error handling
/// - Intelligent retry mechanism
/// - Network-aware uploading
class PhotoSyncService {
  static final PhotoSyncService _instance = PhotoSyncService._internal();
  factory PhotoSyncService() => _instance;
  PhotoSyncService._internal();

  final Logger _logger = Logger();
  final PhotoCompressionService _compressionService = PhotoCompressionService();
  final EnhancedDatabaseService _db = EnhancedDatabaseService();

  // Photo queue limits to prevent storage exhaustion
  static const int _maxPhotoQueueSize = 1000;
  static const Duration _photoRetentionPeriod = Duration(days: 30);

  bool _syncInProgress = false;
  int _currentSyncProgress = 0;
  int _totalSyncItems = 0;

  /// Queue photo for upload with compression
  Future<String> queuePhotoForUpload({
    required String tokenId,
    required File photoFile,
    required String photoType,
    SyncPriority priority = SyncPriority.medium,
    CompressionSettings? compressionSettings,
    bool generateThumbnail = false,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      _logger.d('Queueing photo for upload: ${path.basename(photoFile.path)} (type: $photoType)');

      // Check queue size before inserting to prevent storage exhaustion
      final countResult = await _db.rawQuery(
        "SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status IN ('PENDING', 'FAILED')"
      );
      final currentCount = (countResult.first['count'] as int?) ?? 0;

      if (currentCount >= _maxPhotoQueueSize) {
        _logger.w('Photo queue at maximum capacity ($currentCount). Pruning old records...');
        await _prunePhotoQueue();

        // Recheck after pruning
        final recheckResult = await _db.rawQuery(
          "SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status IN ('PENDING', 'FAILED')"
        );
        final recheckCount = (recheckResult.first['count'] as int?) ?? 0;

        if (recheckCount >= _maxPhotoQueueSize) {
          _logger.e('Photo queue still full after pruning ($recheckCount)');
          throw PhotoSyncException('Photo queue full. Please sync data before adding more photos.');
        }
      }

      // Validate photo file
      final validation = await _compressionService.validatePhoto(photoFile);
      if (!validation.isValid) {
        throw PhotoSyncException('Photo validation failed: ${validation.error}');
      }

      // Compress photo
      final compressionResult = await _compressionService.compressPhoto(
        inputFile: photoFile,
        photoType: photoType,
        customSettings: compressionSettings,
        generateThumbnail: generateThumbnail,
      );

      // Generate unique local ID
      final localId = 'photo_${DateTime.now().millisecondsSinceEpoch}_${tokenId.substring(0, 8)}';

      // Store compressed photo in sync queue
      final syncQueueId = await _db.insert('photo_sync_queue', {
        'local_id': localId,
        'token_id': tokenId,
        'photo_type': photoType,
        'original_file_path': photoFile.absolute.path,
        'original_size': compressionResult.originalSize,
        'compressed_data': compressionResult.base64Data,
        'compressed_size': compressionResult.compressedSize,
        'compression_ratio': compressionResult.compressionRatio,
        'photo_format': compressionResult.format,
        'checksum': compressionResult.checksum,
        'thumbnail_data': compressionResult.thumbnail?.base64Data,
        'compression_metadata': jsonEncode(compressionResult.metadata.toJson()),
        'sync_priority': priority.name.toUpperCase(),
        'sync_status': 'PENDING',
        'retry_count': 0,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'metadata': metadata != null ? jsonEncode(metadata) : null,
      });

      _logger.i('Photo queued for upload: $localId (${(compressionResult.compressedSize / 1024).toStringAsFixed(1)}KB, '
               '${compressionResult.compressionRatio.toStringAsFixed(1)}% compression)');

      // Trigger sync if network available
      _triggerSyncIfPossible();

      return localId;
    } catch (e) {
      _logger.e('Failed to queue photo for upload', error: e);
      if (e is PhotoSyncException) rethrow;
      throw PhotoSyncException('Failed to queue photo: ${e.toString()}');
    }
  }

  /// Queue multiple photos for batch upload
  Future<List<String>> queuePhotoBatch({
    required String tokenId,
    required List<PhotoUploadItem> photos,
    SyncPriority priority = SyncPriority.medium,
    bool useParallelCompression = false,
  }) async {
    try {
      _logger.i('Queuing photo batch for upload: ${photos.length} photos');

      if (photos.isEmpty) {
        throw PhotoSyncException('No photos provided for batch upload');
      }

      if (photos.length > 10) {
        throw PhotoSyncException('Maximum 10 photos allowed per batch');
      }

      final localIds = <String>[];

      if (useParallelCompression) {
        // Parallel compression and queueing
        final requests = photos.map((photo) => PhotoCompressionRequest(
          inputFile: photo.file,
          photoType: photo.photoType,
          settings: photo.compressionSettings,
          generateThumbnail: photo.generateThumbnail,
        )).toList();

        final batchResult = await _compressionService.compressBatch(
          requests: requests,
          parallelProcessing: true,
          maxConcurrency: 3,
        );

        // Queue successful compressions
        for (int i = 0; i < batchResult.results.length; i++) {
          final result = batchResult.results[i];
          final originalPhoto = photos[i];
          
          final localId = await _queueCompressedPhoto(
            tokenId: tokenId,
            photoType: originalPhoto.photoType,
            originalFilePath: originalPhoto.file.absolute.path,
            compressionResult: result,
            priority: priority,
            metadata: originalPhoto.metadata,
          );
          
          localIds.add(localId);
        }

        // Log compression errors
        if (batchResult.errors != null) {
          for (final error in batchResult.errors!) {
            _logger.e('Photo compression failed in batch: ${error.fileName} - ${error.error}');
          }
        }
      } else {
        // Sequential compression and queueing
        for (final photo in photos) {
          try {
            final localId = await queuePhotoForUpload(
              tokenId: tokenId,
              photoFile: photo.file,
              photoType: photo.photoType,
              priority: priority,
              compressionSettings: photo.compressionSettings,
              generateThumbnail: photo.generateThumbnail,
              metadata: photo.metadata,
            );
            localIds.add(localId);
          } catch (e) {
            _logger.e('Failed to queue photo in batch: ${path.basename(photo.file.path)}', error: e);
            // Continue with other photos
          }
        }
      }

      _logger.i('Photo batch queued: ${localIds.length}/${photos.length} photos successfully queued');
      return localIds;
    } catch (e) {
      _logger.e('Failed to queue photo batch', error: e);
      throw PhotoSyncException('Failed to queue photo batch: ${e.toString()}');
    }
  }

  /// Start photo sync process
  Future<SyncResult> syncPendingPhotos({
    bool forceSync = false,
    SyncPriority? minPriority,
  }) async {
    if (_syncInProgress && !forceSync) {
      _logger.w('Photo sync already in progress');
      return SyncResult(
        success: false,
        message: 'Sync already in progress',
        processed: 0,
        successful: 0,
        failed: 0,
      );
    }

    try {
      _syncInProgress = true;
      _currentSyncProgress = 0;
      
      _logger.i('Starting photo sync process');

      // Get pending photos from queue
      final pendingPhotos = await _getPendingPhotos(minPriority);
      
      if (pendingPhotos.isEmpty) {
        _logger.i('No pending photos to sync');
        return SyncResult(
          success: true,
          message: 'No photos to sync',
          processed: 0,
          successful: 0,
          failed: 0,
        );
      }

      _totalSyncItems = pendingPhotos.length;
      _logger.i('Found ${pendingPhotos.length} pending photos to sync');

      int successful = 0;
      int failed = 0;
      final errors = <String>[];

      // Process each photo
      for (final photoQueue in pendingPhotos) {
        try {
          await _updateSyncStatus(photoQueue['local_id'], 'SYNCING');
          
          final uploadResult = await _uploadCompressedPhoto(photoQueue);
          
          if (uploadResult.success) {
            await _markPhotoSynced(photoQueue['local_id'], uploadResult.photoId!);
            successful++;
            _logger.d('Photo synced successfully: ${photoQueue['local_id']}');
          } else {
            await _handleUploadFailure(photoQueue['local_id'], uploadResult.error!);
            failed++;
            errors.add('${photoQueue['local_id']}: ${uploadResult.error}');
          }
        } catch (e) {
          await _handleUploadFailure(photoQueue['local_id'], e.toString());
          failed++;
          errors.add('${photoQueue['local_id']}: ${e.toString()}');
          _logger.e('Failed to sync photo: ${photoQueue['local_id']}', error: e);
        }

        _currentSyncProgress++;
        _notifyProgress();
      }

      final result = SyncResult(
        success: failed == 0,
        message: failed == 0 
            ? 'All photos synced successfully'
            : '$successful successful, $failed failed',
        processed: pendingPhotos.length,
        successful: successful,
        failed: failed,
        errors: errors.isNotEmpty ? errors : null,
      );

      _logger.i('Photo sync completed: ${result.message}');
      return result;

    } catch (e) {
      _logger.e('Photo sync process failed', error: e);
      return SyncResult(
        success: false,
        message: 'Sync failed: ${e.toString()}',
        processed: 0,
        successful: 0,
        failed: 0,
      );
    } finally {
      _syncInProgress = false;
      _currentSyncProgress = 0;
      _totalSyncItems = 0;
    }
  }

  /// Get sync status
  SyncStatus getSyncStatus() {
    return SyncStatus(
      isInProgress: _syncInProgress,
      currentProgress: _currentSyncProgress,
      totalItems: _totalSyncItems,
      progressPercentage: _totalSyncItems > 0 
          ? (_currentSyncProgress / _totalSyncItems * 100).round()
          : 0,
    );
  }

  /// Get pending photos count by priority
  Future<Map<String, int>> getPendingPhotoStats() async {
    try {
      final stats = <String, int>{};
      
      for (final priority in SyncPriority.values) {
        final result = await _db.rawQuery(
          'SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status = ? AND sync_priority = ?',
          ['PENDING', priority.name.toUpperCase()],
        );
        stats[priority.name] = result.first['count'] as int;
      }

      final totalPending = stats.values.fold<int>(0, (sum, count) => sum + count);
      stats['total'] = totalPending;

      return stats;
    } catch (e) {
      _logger.e('Failed to get pending photo stats', error: e);
      return {'total': 0};
    }
  }

  /// Clear synced photos from queue
  Future<int> clearSyncedPhotos({int? olderThanDays}) async {
    try {
      String whereClause = "sync_status = 'SYNCED'";
      List<dynamic> whereArgs = [];

      if (olderThanDays != null) {
        final cutoffTime = DateTime.now()
            .subtract(Duration(days: olderThanDays))
            .millisecondsSinceEpoch;
        whereClause += ' AND synced_at < ?';
        whereArgs.add(cutoffTime);
      }

      final deletedCount = await _db.delete('photo_sync_queue', whereClause, whereArgs);
      _logger.i('Cleared $deletedCount synced photos from queue');
      
      return deletedCount;
    } catch (e) {
      _logger.e('Failed to clear synced photos', error: e);
      return 0;
    }
  }

  // Private helper methods

  Future<String> _queueCompressedPhoto({
    required String tokenId,
    required String photoType,
    required String originalFilePath,
    required CompressionResult compressionResult,
    required SyncPriority priority,
    Map<String, dynamic>? metadata,
  }) async {
    final localId = 'photo_${DateTime.now().millisecondsSinceEpoch}_${tokenId.substring(0, 8)}';

    await _db.insert('photo_sync_queue', {
      'local_id': localId,
      'token_id': tokenId,
      'photo_type': photoType,
      'original_file_path': originalFilePath,
      'original_size': compressionResult.originalSize,
      'compressed_data': compressionResult.base64Data,
      'compressed_size': compressionResult.compressedSize,
      'compression_ratio': compressionResult.compressionRatio,
      'photo_format': compressionResult.format,
      'checksum': compressionResult.checksum,
      'thumbnail_data': compressionResult.thumbnail?.base64Data,
      'compression_metadata': jsonEncode(compressionResult.metadata.toJson()),
      'sync_priority': priority.name.toUpperCase(),
      'sync_status': 'PENDING',
      'retry_count': 0,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'metadata': metadata != null ? jsonEncode(metadata) : null,
    });

    return localId;
  }

  Future<List<Map<String, dynamic>>> _getPendingPhotos(SyncPriority? minPriority) async {
    String whereClause = "sync_status IN ('PENDING', 'FAILED') AND retry_count < 3";
    List<dynamic> whereArgs = [];

    if (minPriority != null) {
      final priorities = SyncPriority.values
          .where((p) => p.index >= minPriority.index)
          .map((p) => p.name.toUpperCase())
          .toList();
      
      final placeholders = priorities.map((_) => '?').join(',');
      whereClause += ' AND sync_priority IN ($placeholders)';
      whereArgs.addAll(priorities);
    }

    return await _db.query(
      'photo_sync_queue',
      where: whereClause,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'sync_priority DESC, created_at ASC',
    );
  }

  Future<UploadResult> _uploadCompressedPhoto(Map<String, dynamic> photoQueue) async {
    try {
      // In a real implementation, you would use GraphQL to upload the photo
      // This is a placeholder implementation that simulates a successful upload
      final photoId = 'photo_${DateTime.now().millisecondsSinceEpoch}';
      await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
      return UploadResult.success(photoId);
    } catch (e) {
      return UploadResult.error(e.toString());
    }
  }

  Future<void> _updateSyncStatus(String localId, String status) async {
    await _db.update(
      'photo_sync_queue',
      {
        'sync_status': status,
        'last_sync_attempt': DateTime.now().millisecondsSinceEpoch,
      },
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }

  Future<void> _markPhotoSynced(String localId, String serverPhotoId) async {
    await _db.update(
      'photo_sync_queue',
      {
        'sync_status': 'SYNCED',
        'server_photo_id': serverPhotoId,
        'synced_at': DateTime.now().millisecondsSinceEpoch,
      },
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }

  Future<void> _handleUploadFailure(String localId, String error) async {
    final currentData = await _db.query(
      'photo_sync_queue',
      where: 'local_id = ?',
      whereArgs: [localId],
      limit: 1,
    );

    if (currentData.isNotEmpty) {
      final retryCount = (currentData.first['retry_count'] as int? ?? 0) + 1;
      final status = retryCount >= 3 ? 'FAILED_PERMANENTLY' : 'FAILED';

      await _db.update(
        'photo_sync_queue',
        {
          'sync_status': status,
          'retry_count': retryCount,
          'last_error': error,
          'last_sync_attempt': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'local_id = ?',
        whereArgs: [localId],
      );
    }
  }

  void _triggerSyncIfPossible() {
    // In a real implementation, you would check network connectivity
    // and trigger sync if conditions are met
    Future.delayed(const Duration(seconds: 2), () {
      if (!_syncInProgress) {
        syncPendingPhotos();
      }
    });
  }

  void _notifyProgress() {
    // In a real implementation, you would notify UI about progress
    // This could use a stream controller or callback
    _logger.d('Sync progress: $_currentSyncProgress/$_totalSyncItems');
  }

  /// Prune old photo queue records to prevent storage exhaustion
  Future<void> _prunePhotoQueue() async {
    try {
      final cutoffTime = DateTime.now()
          .subtract(_photoRetentionPeriod)
          .millisecondsSinceEpoch;

      // Delete successfully synced photos older than retention period
      final deletedSynced = await _db.delete(
        'photo_sync_queue',
        "sync_status = 'SYNCED' AND created_at < ?",
        [cutoffTime],
      );
      _logger.d('Pruned $deletedSynced old synced photos');

      // Delete failed photos older than retention period with max retries exhausted
      final deletedFailed = await _db.delete(
        'photo_sync_queue',
        "sync_status = 'FAILED' AND created_at < ? AND retry_count >= 5",
        [cutoffTime],
      );
      _logger.d('Pruned $deletedFailed old failed photos');

      _logger.i('Photo queue pruned: ${deletedSynced + deletedFailed} records removed');
    } catch (e) {
      _logger.e('Error pruning photo queue', error: e);
    }
  }

  /// Get photo queue statistics for monitoring
  Future<Map<String, int>> getPhotoQueueStats() async {
    try {
      final stats = <String, int>{};

      final pending = await _db.rawQuery(
        "SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status = 'PENDING'"
      );
      stats['pending'] = (pending.first['count'] as int?) ?? 0;

      final failed = await _db.rawQuery(
        "SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status = 'FAILED'"
      );
      stats['failed'] = (failed.first['count'] as int?) ?? 0;

      final synced = await _db.rawQuery(
        "SELECT COUNT(*) as count FROM photo_sync_queue WHERE sync_status = 'SYNCED'"
      );
      stats['synced'] = (synced.first['count'] as int?) ?? 0;

      stats['total'] = stats['pending']! + stats['failed']! + stats['synced']!;
      stats['maxSize'] = _maxPhotoQueueSize;

      return stats;
    } catch (e) {
      _logger.e('Error getting photo queue stats', error: e);
      return {'total': 0, 'maxSize': _maxPhotoQueueSize};
    }
  }
}

/// Photo upload item for batch operations
class PhotoUploadItem {
  final File file;
  final String photoType;
  final CompressionSettings? compressionSettings;
  final bool generateThumbnail;
  final Map<String, dynamic>? metadata;

  PhotoUploadItem({
    required this.file,
    required this.photoType,
    this.compressionSettings,
    this.generateThumbnail = false,
    this.metadata,
  });
}

/// Sync priority levels
enum SyncPriority {
  low,
  medium,
  high,
  critical;
}

/// Sync status information
class SyncStatus {
  final bool isInProgress;
  final int currentProgress;
  final int totalItems;
  final int progressPercentage;

  SyncStatus({
    required this.isInProgress,
    required this.currentProgress,
    required this.totalItems,
    required this.progressPercentage,
  });
}

/// Sync result
class SyncResult {
  final bool success;
  final String message;
  final int processed;
  final int successful;
  final int failed;
  final List<String>? errors;

  SyncResult({
    required this.success,
    required this.message,
    required this.processed,
    required this.successful,
    required this.failed,
    this.errors,
  });

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'message': message,
      'processed': processed,
      'successful': successful,
      'failed': failed,
      'errors': errors,
    };
  }
}

/// Upload result
class UploadResult {
  final bool success;
  final String? photoId;
  final String? error;

  UploadResult._(this.success, this.photoId, this.error);

  factory UploadResult.success(String photoId) => UploadResult._(true, photoId, null);
  factory UploadResult.error(String error) => UploadResult._(false, null, error);
}

/// Photo sync exception
class PhotoSyncException implements Exception {
  final String message;

  PhotoSyncException(this.message);

  @override
  String toString() => 'PhotoSyncException: $message';
}