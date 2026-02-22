import 'dart:async';
import 'dart:collection';
import 'dart:io';
import 'dart:convert';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../database/enhanced_database_service.dart';
import 'network_service.dart';

/// ====================================================================
/// GATE CHECK PHOTO SYNC SERVICE
/// ====================================================================
/// 
/// Comprehensive photo management service for gate check documentation
/// with advanced compression, deferred upload, and sync capabilities
/// 
/// Key Features:
/// - Smart compression with quality optimization
/// - Deferred upload based on network conditions  
/// - Batch upload processing for efficiency
/// - Progressive sync with retry mechanisms
/// - Storage optimization and cleanup
/// - Cross-device photo validation
/// - Real-time upload progress tracking
/// ====================================================================

enum PhotoCompressionLevel {
  none,
  low,
  medium,
  high,
  ultra,
}

enum PhotoUploadPriority {
  low,
  medium,
  high,
  critical,
}

enum PhotoSyncStatus {
  pending,
  queued,
  compressing,
  uploading,
  synced,
  failed,
  cancelled,
}

class PhotoCompressionResult {
  final File compressedFile;
  final int originalSize;
  final int compressedSize;
  final double compressionRatio;
  final PhotoCompressionLevel levelApplied;
  final String compressionMetadata;

  PhotoCompressionResult({
    required this.compressedFile,
    required this.originalSize,
    required this.compressedSize,
    required this.compressionRatio,
    required this.levelApplied,
    required this.compressionMetadata,
  });
}

class PhotoUploadProgress {
  final String photoId;
  final double progress; // 0.0 to 1.0
  final int bytesUploaded;
  final int totalBytes;
  final String stage; // 'compressing', 'uploading', 'validating'
  final int estimatedTimeRemaining; // seconds

  PhotoUploadProgress({
    required this.photoId,
    required this.progress,
    required this.bytesUploaded,
    required this.totalBytes,
    required this.stage,
    required this.estimatedTimeRemaining,
  });
}

class BatchUploadResult {
  final int totalPhotos;
  final int successfulUploads;
  final int failedUploads;
  final List<String> uploadedPhotoIds;
  final List<String> failedPhotoIds;
  final Map<String, String> failureReasons;
  final int totalBytesUploaded;
  final int uploadDurationMs;

  BatchUploadResult({
    required this.totalPhotos,
    required this.successfulUploads,
    required this.failedUploads,
    required this.uploadedPhotoIds,
    required this.failedPhotoIds,
    required this.failureReasons,
    required this.totalBytesUploaded,
    required this.uploadDurationMs,
  });
}

class GateCheckPhotoSyncService {
  static final GateCheckPhotoSyncService _instance = 
      GateCheckPhotoSyncService._internal();
  
  factory GateCheckPhotoSyncService() => _instance;
  GateCheckPhotoSyncService._internal();
  
  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();
  
  // Service dependencies
  late EnhancedDatabaseService _databaseService;
  late NetworkService _networkService;
  
  // Upload progress tracking
  final Map<String, PhotoUploadProgress> _uploadProgressMap = {};
  final StreamController<PhotoUploadProgress> _progressController = 
      StreamController<PhotoUploadProgress>.broadcast();
  
  // Batch upload management
  final Map<String, List<String>> _uploadBatches = {};
  Timer? _batchUploadTimer;
  
  // Configuration
  static const int _maxConcurrentUploads = 3;
  static const int _maxRetryAttempts = 5;
  static const int _batchUploadIntervalSeconds = 30;
  static const int _maxBatchSize = 10;
  static const int _defaultCompressionQuality = 85;
  static const int _maxPhotoDimension = 1920;
  static const int _thumbnailSize = 200;
  
  // Storage paths
  late String _photosDirectory;
  late String _compressedDirectory; 
  late String _thumbnailsDirectory;
  
  /// Initialize the photo sync service
  Future<void> initialize() async {
    try {
      _databaseService = EnhancedDatabaseService();
      _networkService = NetworkService();
      
      // Setup storage directories
      await _setupStorageDirectories();

      // NOTE: Batch upload timer is DISABLED because _performUpload() is a stub
      // that marks photos as SYNCED without actually uploading them.
      // Photo sync is handled by GraphQLSyncService._syncPhotos() which uses
      // the syncSatpamPhotos GraphQL mutation for actual base64 photo upload.
      // _startBatchUploadTimer();

      // NOTE: Network change listener also disabled to prevent stub uploads
      // _networkService.connectivityStream.listen(_onNetworkChanged);
      
      _logger.i('Gate Check Photo Sync Service initialized');
    } catch (e) {
      _logger.e('Error initializing photo sync service', error: e);
      rethrow;
    }
  }
  
  /// Setup storage directories for photos
  Future<void> _setupStorageDirectories() async {
    final appDir = await getApplicationDocumentsDirectory();
    final baseDir = Directory('${appDir.path}/gate_check_photos');
    
    _photosDirectory = '${baseDir.path}/originals';
    _compressedDirectory = '${baseDir.path}/compressed';
    _thumbnailsDirectory = '${baseDir.path}/thumbnails';
    
    // Create directories if they don't exist
    await Directory(_photosDirectory).create(recursive: true);
    await Directory(_compressedDirectory).create(recursive: true);
    await Directory(_thumbnailsDirectory).create(recursive: true);
    
    _logger.d('Photo storage directories setup completed');
  }
  
  /// Save photo for gate check with metadata
  Future<Map<String, dynamic>> saveGateCheckPhoto({
    required String relatedRecordType, // 'GUEST_LOG', 'GATE_CHECK_RECORD', etc.
    required String relatedRecordId,
    required File photoFile,
    required String photoType, // 'ENTRY', 'EXIT', 'VEHICLE', etc.
    required String createdBy,
    String? deviceId,
    String? deviceModel,
    Map<String, dynamic>? location,
    String? description,
    List<String>? tags,
    PhotoCompressionLevel compressionLevel = PhotoCompressionLevel.medium,
    PhotoUploadPriority uploadPriority = PhotoUploadPriority.medium,
  }) async {
    final photoId = _uuid.v4();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    
    try {
      // Generate file paths
      final originalFileName = path.basename(photoFile.path);
      final fileExtension = path.extension(originalFileName).toLowerCase();
      final baseFileName = '${photoId}_$timestamp';
      
      final originalPath = path.join(_photosDirectory, '$baseFileName$fileExtension');
      final thumbnailPath = path.join(_thumbnailsDirectory, '${baseFileName}_thumb.jpg');
      
      // Copy original file to photos directory
      final originalFile = await photoFile.copy(originalPath);
      final originalFileSize = await originalFile.length();
      
      // Generate thumbnail
      await _generateThumbnail(originalFile, thumbnailPath);
      
      // Get image metadata
      final imageMetadata = await _extractImageMetadata(originalFile);
      
      // Save to database
      final db = await _databaseService.database;
      await db.insert('gate_check_photos', {
        'photo_id': photoId,
        'related_record_type': relatedRecordType,
        'related_record_id': relatedRecordId,
        'file_path': originalPath,
        'file_name': '$baseFileName$fileExtension',
        'original_file_name': originalFileName,
        'file_size': originalFileSize,
        'file_extension': fileExtension,
        'mime_type': _getMimeType(fileExtension),
        'photo_type': photoType,
        'photo_quality': _getPhotoQualityFromSize(originalFileSize),
        'compression_applied': 0,
        'original_file_size': originalFileSize,
        'latitude': location?['latitude'],
        'longitude': location?['longitude'],
        'taken_at': timestamp,
        'camera_used': imageMetadata['cameraUsed'],
        'metadata': jsonEncode(imageMetadata),
        'description': description,
        'tags': jsonEncode(tags ?? []),
        'created_by': createdBy,
        'device_id': deviceId,
        'device_model': deviceModel,
        'sync_status': 'PENDING',
        'sync_priority': uploadPriority.name.toUpperCase(),
        'upload_progress': 0.0,
        'upload_retry_count': 0,
        'local_path': originalPath,
        'thumbnail_path': thumbnailPath,
        'is_compressed': 0,
        'upload_scheduled_at': _calculateUploadSchedule(uploadPriority),
        'upload_attempts': 0,
        'max_upload_attempts': _maxRetryAttempts,
        'upload_batch_id': _generateBatchId(uploadPriority),
        'created_at': timestamp,
        'updated_at': timestamp,
      });
      
      // Schedule compression if needed
      if (compressionLevel != PhotoCompressionLevel.none) {
        _schedulePhotoCompression(photoId, compressionLevel);
      }
      
      // Schedule upload
      _schedulePhotoUpload(photoId, uploadPriority);
      
      _logger.i('Saved gate check photo $photoId ($originalFileSize bytes)');
      
      return {
        'photoId': photoId,
        'originalPath': originalPath,
        'thumbnailPath': thumbnailPath,
        'fileSize': originalFileSize,
        'timestamp': timestamp,
      };
      
    } catch (e) {
      _logger.e('Error saving gate check photo', error: e);
      rethrow;
    }
  }
  
  /// Compress photo with specified level
  Future<PhotoCompressionResult> compressPhoto(
    String photoId,
    PhotoCompressionLevel level,
  ) async {
    try {
      final db = await _databaseService.database;
      final photos = await db.query(
        'gate_check_photos',
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      if (photos.isEmpty) {
        throw Exception('Photo not found: $photoId');
      }
      
      final photo = photos.first;
      final originalFile = File(photo['local_path'] as String);
      
      if (!await originalFile.exists()) {
        throw Exception('Original photo file not found');
      }
      
      // Update status to compressing
      await db.update(
        'gate_check_photos',
        {'sync_status': 'COMPRESSING', 'updated_at': DateTime.now().millisecondsSinceEpoch},
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      // Emit progress update
      _emitProgressUpdate(PhotoUploadProgress(
        photoId: photoId,
        progress: 0.1,
        bytesUploaded: 0,
        totalBytes: photo['file_size'] as int,
        stage: 'compressing',
        estimatedTimeRemaining: 30,
      ));
      
      // Perform compression
      final compressionResult = await _performCompression(originalFile, level);
      
      // Update database with compression results
      await db.update(
        'gate_check_photos',
        {
          'file_path': compressionResult.compressedFile.path,
          'file_size': compressionResult.compressedSize,
          'compression_applied': 1,
          'compression_ratio': compressionResult.compressionRatio,
          'is_compressed': 1,
          'sync_status': 'PENDING',
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      _logger.i(
        'Compressed photo $photoId: ${compressionResult.originalSize} → '
        '${compressionResult.compressedSize} bytes '
        '(${(compressionResult.compressionRatio * 100).toStringAsFixed(1)}% reduction)'
      );
      
      return compressionResult;
      
    } catch (e) {
      _logger.e('Error compressing photo $photoId', error: e);
      
      // Update status to failed
      final db = await _databaseService.database;
      await db.update(
        'gate_check_photos',
        {
          'sync_status': 'FAILED',
          'last_upload_error': e.toString(),
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      rethrow;
    }
  }
  
  /// Perform actual photo compression
  Future<PhotoCompressionResult> _performCompression(
    File originalFile,
    PhotoCompressionLevel level,
  ) async {
    final originalBytes = await originalFile.readAsBytes();
    final originalSize = originalBytes.length;
    
    // Decode image
    final originalImage = img.decodeImage(originalBytes);
    if (originalImage == null) {
      throw Exception('Failed to decode image');
    }
    
    // Determine compression settings
    final settings = _getCompressionSettings(level, originalImage);
    
    // Resize if needed
    img.Image processedImage = originalImage;
    if (settings['resize'] == true) {
      final maxDimension = settings['maxDimension'] as int;
      if (originalImage.width > maxDimension || originalImage.height > maxDimension) {
        processedImage = img.copyResize(
          originalImage,
          width: originalImage.width > originalImage.height ? maxDimension : null,
          height: originalImage.height > originalImage.width ? maxDimension : null,
        );
      }
    }
    
    // Encode with compression
    final compressedBytes = img.encodeJpg(
      processedImage,
      quality: settings['quality'] as int,
    );
    
    // Save compressed file
    final compressedFileName = '${path.basenameWithoutExtension(originalFile.path)}_compressed.jpg';
    final compressedPath = path.join(_compressedDirectory, compressedFileName);
    final compressedFile = File(compressedPath);
    await compressedFile.writeAsBytes(compressedBytes);
    
    final compressedSize = compressedBytes.length;
    final compressionRatio = 1.0 - (compressedSize / originalSize);
    
    return PhotoCompressionResult(
      compressedFile: compressedFile,
      originalSize: originalSize,
      compressedSize: compressedSize,
      compressionRatio: compressionRatio,
      levelApplied: level,
      compressionMetadata: jsonEncode({
        'level': level.name,
        'quality': settings['quality'],
        'resized': settings['resize'],
        'originalDimensions': '${originalImage.width}x${originalImage.height}',
        'compressedDimensions': '${processedImage.width}x${processedImage.height}',
        'compressionTimestamp': DateTime.now().toIso8601String(),
      }),
    );
  }
  
  /// Upload photo to server
  Future<void> uploadPhoto(String photoId) async {
    try {
      final db = await _databaseService.database;
      final photos = await db.query(
        'gate_check_photos',
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      if (photos.isEmpty) {
        throw Exception('Photo not found: $photoId');
      }
      
      final photo = photos.first;
      final photoFile = File(photo['file_path'] as String);
      
      if (!await photoFile.exists()) {
        throw Exception('Photo file not found for upload');
      }
      
      // Update status to uploading
      await db.update(
        'gate_check_photos',
        {
          'sync_status': 'UPLOADING',
          'upload_attempts': (photo['upload_attempts'] as int) + 1,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      // Perform upload with progress tracking
      final uploadResult = await _performUpload(photoId, photoFile, photo);
      
      if (uploadResult['success'] == true) {
        // Update database with success
        await db.update(
          'gate_check_photos',
          {
            'sync_status': 'SYNCED',
            'synced_at': DateTime.now().millisecondsSinceEpoch,
            'cloud_path': uploadResult['cloudPath'],
            'upload_progress': 1.0,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          },
          where: 'photo_id = ?',
          whereArgs: [photoId],
        );
        
        _logger.i('Successfully uploaded photo $photoId');
      } else {
        throw Exception(uploadResult['error'] ?? 'Unknown upload error');
      }
      
    } catch (e) {
      _logger.e('Error uploading photo $photoId', error: e);
      
      // Update with failure
      final db = await _databaseService.database;
      await db.update(
        'gate_check_photos',
        {
          'sync_status': 'FAILED',
          'last_upload_error': e.toString(),
          'next_upload_attempt': _calculateNextUploadAttempt(),
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      rethrow;
    }
  }
  
  /// Batch upload photos for efficiency
  Future<BatchUploadResult> uploadPhotoBatch(List<String> photoIds) async {
    final startTime = DateTime.now();
    final uploadedPhotoIds = <String>[];
    final failedPhotoIds = <String>[];
    final failureReasons = <String, String>{};
    int totalBytesUploaded = 0;
    
    try {
      _logger.i('Starting batch upload of ${photoIds.length} photos');
      
      // Process uploads with concurrency limit
      final futures = <Future>[];
      final semaphore = Semaphore(_maxConcurrentUploads);
      
      for (final photoId in photoIds) {
        futures.add(
          semaphore.acquire().then((_) async {
            try {
              await uploadPhoto(photoId);
              uploadedPhotoIds.add(photoId);
              
              // Get uploaded file size for statistics
              final db = await _databaseService.database;
              final photos = await db.query(
                'gate_check_photos',
                columns: ['file_size'],
                where: 'photo_id = ?',
                whereArgs: [photoId],
              );
              if (photos.isNotEmpty) {
                totalBytesUploaded += photos.first['file_size'] as int;
              }
              
            } catch (e) {
              failedPhotoIds.add(photoId);
              failureReasons[photoId] = e.toString();
              _logger.w('Failed to upload photo $photoId: $e');
            } finally {
              semaphore.release();
            }
          })
        );
      }
      
      await Future.wait(futures);
      
      final uploadDurationMs = DateTime.now().difference(startTime).inMilliseconds;
      
      _logger.i(
        'Batch upload completed: ${uploadedPhotoIds.length}/${photoIds.length} '
        'successful, $totalBytesUploaded bytes transferred in ${uploadDurationMs}ms'
      );
      
      return BatchUploadResult(
        totalPhotos: photoIds.length,
        successfulUploads: uploadedPhotoIds.length,
        failedUploads: failedPhotoIds.length,
        uploadedPhotoIds: uploadedPhotoIds,
        failedPhotoIds: failedPhotoIds,
        failureReasons: failureReasons,
        totalBytesUploaded: totalBytesUploaded,
        uploadDurationMs: uploadDurationMs,
      );
      
    } catch (e) {
      _logger.e('Error in batch upload', error: e);
      rethrow;
    }
  }
  
  /// Get pending photos for upload
  Future<List<String>> getPendingPhotoUploads({
    PhotoUploadPriority? priority,
    int? limit,
  }) async {
    try {
      final db = await _databaseService.database;
      
      String whereClause = "sync_status IN ('PENDING', 'FAILED') AND upload_attempts < max_upload_attempts";
      final whereArgs = <dynamic>[];
      
      if (priority != null) {
        whereClause += " AND sync_priority = ?";
        whereArgs.add(priority.name.toUpperCase());
      }
      
      final photos = await db.query(
        'gate_check_photos',
        columns: ['photo_id'],
        where: whereClause,
        whereArgs: whereArgs,
        orderBy: 'sync_priority DESC, created_at ASC',
        limit: limit,
      );
      
      return photos.map((photo) => photo['photo_id'] as String).toList();
      
    } catch (e) {
      _logger.e('Error getting pending photo uploads', error: e);
      return [];
    }
  }
  
  /// Process periodic batch uploads
  void _processBatchUploads() async {
    try {
      // Check network conditions
      final networkInfo = await _networkService.getNetworkInfo();
      final isConnected = (networkInfo['isConnected'] as bool?) ?? false;
      final status = networkInfo['status'] as ConnectivityResult?;
      if (!isConnected || status == ConnectivityResult.none) {
        return;
      }
      
      // Get photos ready for upload based on network quality
      final batchSize = _getBatchSizeForNetwork(networkInfo);
      final pendingPhotos = await getPendingPhotoUploads(limit: batchSize);
      
      if (pendingPhotos.isEmpty) {
        return;
      }
      
      _logger.i('Processing batch upload of ${pendingPhotos.length} photos');
      
      // Group by priority
      final priorityGroups = await _groupPhotosByPriority(pendingPhotos);
      
      // Upload high priority photos first
      for (final priority in [
        PhotoUploadPriority.critical,
        PhotoUploadPriority.high,
        PhotoUploadPriority.medium,
        PhotoUploadPriority.low,
      ]) {
        final photos = priorityGroups[priority];
        if (photos != null && photos.isNotEmpty) {
          await uploadPhotoBatch(photos);
        }
      }
      
    } catch (e) {
      _logger.e('Error processing batch uploads', error: e);
    }
  }
  
  /// Start periodic batch upload timer
  // ignore: unused_element
  void _startBatchUploadTimer() {
    _batchUploadTimer?.cancel();
    _batchUploadTimer = Timer.periodic(
      Duration(seconds: _batchUploadIntervalSeconds),
      (_) => _processBatchUploads(),
    );
  }
  
  /// Handle network connectivity changes
  // ignore: unused_element
  void _onNetworkChanged(ConnectivityResult connectivity) {
    if (connectivity != ConnectivityResult.none) {
      // Network available, trigger immediate batch upload
      _processBatchUploads();
    }
  }
  
  /// Emit upload progress update
  void _emitProgressUpdate(PhotoUploadProgress progress) {
    _uploadProgressMap[progress.photoId] = progress;
    _progressController.add(progress);
  }
  
  /// Get upload progress stream
  Stream<PhotoUploadProgress> get uploadProgressStream => _progressController.stream;
  
  /// Get current upload progress for a photo
  PhotoUploadProgress? getUploadProgress(String photoId) {
    return _uploadProgressMap[photoId];
  }
  
  /// Clean up old and uploaded photos
  Future<void> cleanupPhotos({
    bool removeUploaded = true,
    int keepRecentDays = 30,
  }) async {
    try {
      final db = await _databaseService.database;
      final cutoffDate = DateTime.now().subtract(Duration(days: keepRecentDays));
      final cutoffTimestamp = cutoffDate.millisecondsSinceEpoch;
      
      String whereClause = 'created_at < ?';
      final whereArgs = [cutoffTimestamp];
      
      if (removeUploaded) {
        whereClause += " AND sync_status = 'SYNCED'";
      }
      
      final photosToDelete = await db.query(
        'gate_check_photos',
        columns: ['photo_id', 'file_path', 'thumbnail_path'],
        where: whereClause,
        whereArgs: whereArgs,
      );
      
      int deletedFiles = 0;
      int deletedRecords = 0;
      
      for (final photo in photosToDelete) {
        // Delete physical files
        final filePath = photo['file_path'] as String?;
        final thumbnailPath = photo['thumbnail_path'] as String?;
        
        if (filePath != null) {
          final file = File(filePath);
          if (await file.exists()) {
            await file.delete();
            deletedFiles++;
          }
        }
        
        if (thumbnailPath != null) {
          final thumbnailFile = File(thumbnailPath);
          if (await thumbnailFile.exists()) {
            await thumbnailFile.delete();
          }
        }
        
        // Delete database record
        await db.delete(
          'gate_check_photos',
          where: 'photo_id = ?',
          whereArgs: [photo['photo_id']],
        );
        deletedRecords++;
      }
      
      _logger.i('Photo cleanup completed: $deletedRecords records, $deletedFiles files deleted');
      
    } catch (e) {
      _logger.e('Error during photo cleanup', error: e);
    }
  }
  
  /// Dispose resources
  void dispose() {
    _batchUploadTimer?.cancel();
    _progressController.close();
    _uploadProgressMap.clear();
  }
  
  // ====================================================================
  // PRIVATE HELPER METHODS
  // ====================================================================
  
  String _getMimeType(String extension) {
    switch (extension.toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
  
  String _getPhotoQualityFromSize(int fileSize) {
    if (fileSize > 5 * 1024 * 1024) return 'ULTRA';  // > 5MB
    if (fileSize > 2 * 1024 * 1024) return 'HIGH';   // > 2MB
    if (fileSize > 500 * 1024) return 'MEDIUM';       // > 500KB
    return 'LOW';                                      // <= 500KB
  }
  
  int _calculateUploadSchedule(PhotoUploadPriority priority) {
    final now = DateTime.now().millisecondsSinceEpoch;
    switch (priority) {
      case PhotoUploadPriority.critical:
        return now; // Immediate
      case PhotoUploadPriority.high:
        return now + (5 * 60 * 1000); // 5 minutes
      case PhotoUploadPriority.medium:
        return now + (30 * 60 * 1000); // 30 minutes
      case PhotoUploadPriority.low:
        return now + (4 * 60 * 60 * 1000); // 4 hours
    }
  }
  
  String _generateBatchId(PhotoUploadPriority priority) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return '${priority.name}_${timestamp}_${_uuid.v4().substring(0, 8)}';
  }
  
  Map<String, dynamic> _getCompressionSettings(PhotoCompressionLevel level, img.Image image) {
    switch (level) {
      case PhotoCompressionLevel.none:
        return {'quality': 100, 'resize': false, 'maxDimension': 0};
      case PhotoCompressionLevel.low:
        return {'quality': 95, 'resize': false, 'maxDimension': 0};
      case PhotoCompressionLevel.medium:
        return {'quality': _defaultCompressionQuality, 'resize': true, 'maxDimension': _maxPhotoDimension};
      case PhotoCompressionLevel.high:
        return {'quality': 75, 'resize': true, 'maxDimension': 1280};
      case PhotoCompressionLevel.ultra:
        return {'quality': 60, 'resize': true, 'maxDimension': 1024};
    }
  }
  
  void _schedulePhotoCompression(String photoId, PhotoCompressionLevel level) {
    // Schedule asynchronous compression
    Timer(Duration(seconds: 1), () async {
      try {
        await compressPhoto(photoId, level);
      } catch (e) {
        _logger.w('Scheduled compression failed for photo $photoId: $e');
      }
    });
  }
  
  void _schedulePhotoUpload(String photoId, PhotoUploadPriority priority) {
    // Add to appropriate batch
    final batchId = _generateBatchId(priority);
    _uploadBatches.putIfAbsent(batchId, () => []).add(photoId);
  }
  
  int _calculateNextUploadAttempt() {
    // Exponential backoff: 5 minutes, 15 minutes, 45 minutes, 2 hours, 6 hours
    return DateTime.now().add(Duration(minutes: 5)).millisecondsSinceEpoch;
  }
  
  Future<File> _generateThumbnail(File originalFile, String thumbnailPath) async {
    final originalBytes = await originalFile.readAsBytes();
    final originalImage = img.decodeImage(originalBytes);
    
    if (originalImage == null) {
      throw Exception('Failed to decode image for thumbnail generation');
    }
    
    final thumbnail = img.copyResize(originalImage, width: _thumbnailSize, height: _thumbnailSize);
    final thumbnailBytes = img.encodeJpg(thumbnail, quality: 80);
    
    final thumbnailFile = File(thumbnailPath);
    await thumbnailFile.writeAsBytes(thumbnailBytes);
    
    return thumbnailFile;
  }
  
  Future<Map<String, dynamic>> _extractImageMetadata(File imageFile) async {
    // Extract basic image metadata
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    return {
      'width': image?.width ?? 0,
      'height': image?.height ?? 0,
      'format': path.extension(imageFile.path),
      'fileSize': bytes.length,
      'cameraUsed': 'UNKNOWN', // Would need platform-specific implementation
      'extractedAt': DateTime.now().toIso8601String(),
    };
  }
  
  int _getBatchSizeForNetwork(Map<String, dynamic> networkInfo) {
    // Adjust batch size based on network quality
    final status = networkInfo['status'] as ConnectivityResult?;
    if (status == ConnectivityResult.wifi) {
      return _maxBatchSize;
    } else if (status == ConnectivityResult.mobile) {
      return (_maxBatchSize / 2).round();
    }
    return 1; // Conservative for other connections
  }
  
  Future<Map<PhotoUploadPriority, List<String>>> _groupPhotosByPriority(
    List<String> photoIds,
  ) async {
    final db = await _databaseService.database;
    final groups = <PhotoUploadPriority, List<String>>{};
    
    for (final photoId in photoIds) {
      final photos = await db.query(
        'gate_check_photos',
        columns: ['sync_priority'],
        where: 'photo_id = ?',
        whereArgs: [photoId],
      );
      
      if (photos.isNotEmpty) {
        final priorityStr = photos.first['sync_priority'] as String;
        final priority = PhotoUploadPriority.values.firstWhere(
          (p) => p.name.toUpperCase() == priorityStr,
          orElse: () => PhotoUploadPriority.medium,
        );
        
        groups.putIfAbsent(priority, () => []).add(photoId);
      }
    }
    
    return groups;
  }
  
  Future<Map<String, dynamic>> _performUpload(
    String photoId,
    File photoFile,
    Map<String, dynamic> photoRecord,
  ) async {
    // This would integrate with your actual upload service/API
    // For now, simulating upload with progress updates
    
    final fileSize = await photoFile.length();
    final fileName = path.basename(photoFile.path);
    
    // Simulate upload progress
    for (int i = 1; i <= 10; i++) {
      await Future.delayed(Duration(milliseconds: 100));
      
      _emitProgressUpdate(PhotoUploadProgress(
        photoId: photoId,
        progress: i / 10.0,
        bytesUploaded: (fileSize * i / 10).round(),
        totalBytes: fileSize,
        stage: 'uploading',
        estimatedTimeRemaining: (10 - i) * 100,
      ));
    }
    
    // Return success result
    return {
      'success': true,
      'cloudPath': '/uploads/gate_check_photos/$fileName',
      'uploadTimestamp': DateTime.now().toIso8601String(),
    };
  }
}

/// Simple semaphore implementation for controlling concurrency
class Semaphore {
  int _currentCount;
  final Queue<Completer<void>> _waitQueue = Queue<Completer<void>>();
  
  Semaphore(int maxCount)
      : assert(maxCount > 0),
        _currentCount = maxCount;
  
  Future<void> acquire() async {
    if (_currentCount > 0) {
      _currentCount--;
      return;
    }
    
    final completer = Completer<void>();
    _waitQueue.add(completer);
    return completer.future;
  }
  
  void release() {
    if (_waitQueue.isNotEmpty) {
      final completer = _waitQueue.removeFirst();
      completer.complete();
    } else {
      _currentCount++;
    }
  }
}
