import 'dart:io';
import 'package:camera/camera.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

import 'permission_service.dart';
import 'location_service.dart';

/// Enhanced Camera Service for Gate Check Photo Documentation
///
/// Features:
/// - High-quality photo capture with metadata
/// - Automatic photo organization by date and session
/// - GPS location tagging
/// - Image compression with quality preservation
/// - Batch photo operations for entry/exit documentation
/// - Offline-first storage with sync preparation
class GateCheckCameraService {
  static final Logger _logger = Logger();
  final PermissionService _permissionService;
  final LocationService _locationService;
  final Uuid _uuid = const Uuid();

  CameraController? _controller;
  bool _isInitialized = false;
  bool _isTakingPicture = false;
  List<CameraDescription> _availableCameras = [];
  static List<CameraDescription>? _cachedCameras;

  // Photo storage paths
  late Directory _photoDirectory;
  late Directory _tempDirectory;

  // Configuration
  static const ResolutionPreset _defaultResolution = ResolutionPreset.medium;
  static const int _defaultQuality = 85;
  static const int _maxImageDimension = 1600;
  static const int _maxPhotosPerSession = 50;

  GateCheckCameraService({
    required PermissionService permissionService,
    required LocationService locationService,
  })  : _permissionService = permissionService,
        _locationService = locationService;

  /// Initialize camera service with photo storage setup
  Future<bool> initialize() async {
    try {
      if (_isInitialized) return true;

      // Check and request permissions
      if (!await _permissionService.hasCameraPermission()) {
        final granted = await _permissionService.requestCameraPermission();
        if (!granted) {
          _logger.w('Camera permission not granted');
          return false;
        }
      }

      // Initialize available cameras (cached to avoid repeated device scans)
      if (_cachedCameras == null || _cachedCameras!.isEmpty) {
        _cachedCameras = await availableCameras();
      }
      _availableCameras = List<CameraDescription>.from(_cachedCameras!);
      if (_availableCameras.isEmpty) {
        _logger.e('No cameras available on device');
        return false;
      }

      // Setup photo storage directories
      await _setupPhotoDirectories();

      // Initialize with back camera by default
      await _initializeCamera(CameraLensDirection.back);

      _isInitialized = true;
      _logger.i('Gate check camera service initialized successfully');
      return true;
    } catch (e) {
      _logger.e('Error initializing gate check camera service', error: e);
      return false;
    }
  }

  /// Initialize specific camera
  Future<bool> _initializeCamera(CameraLensDirection direction) async {
    try {
      await _disposeCurrentCamera();

      final camera = _availableCameras.firstWhere(
        (camera) => camera.lensDirection == direction,
        orElse: () => _availableCameras.first,
      );

      _controller = await _initializeControllerWithFallback(camera);
      if (_controller == null) {
        _logger.e('Failed to initialize camera for all supported resolutions');
        return false;
      }
      _logger.d('Camera initialized: ${camera.name}');
      return true;
    } catch (e) {
      _logger.e('Error initializing camera', error: e);
      return false;
    }
  }

  Future<CameraController?> _initializeControllerWithFallback(
    CameraDescription camera,
  ) async {
    final triedResolutions = <ResolutionPreset>{};
    final resolutionOrder = <ResolutionPreset>[
      _defaultResolution,
      ResolutionPreset.medium,
      ResolutionPreset.low,
    ];

    for (final resolution in resolutionOrder) {
      if (!triedResolutions.add(resolution)) continue;

      CameraController? trialController;
      try {
        trialController = CameraController(
          camera,
          resolution,
          enableAudio: false,
        );
        await trialController.initialize();

        if (resolution != _defaultResolution) {
          _logger.w('Camera initialized with fallback resolution: $resolution');
        }
        return trialController;
      } catch (e) {
        _logger.w('Camera init failed at $resolution', error: e);
        try {
          await trialController?.dispose();
        } catch (_) {}
      }
    }

    return null;
  }

  /// Setup photo storage directories
  Future<void> _setupPhotoDirectories() async {
    final appDir = await getApplicationDocumentsDirectory();

    _photoDirectory = Directory(path.join(appDir.path, 'gate_check_photos'));
    _tempDirectory = Directory(path.join(appDir.path, 'temp_photos'));

    if (!await _photoDirectory.exists()) {
      await _photoDirectory.create(recursive: true);
    }

    if (!await _tempDirectory.exists()) {
      await _tempDirectory.create(recursive: true);
    }

    _logger.d('Photo directories created: ${_photoDirectory.path}');
  }

  /// Capture entry photo with metadata
  Future<GateCheckPhoto?> captureEntryPhoto({
    required String gateCheckId,
    required String vehiclePlate,
    String? notes,
  }) async {
    return await _capturePhoto(
      type: PhotoType.entry,
      gateCheckId: gateCheckId,
      vehiclePlate: vehiclePlate,
      notes: notes,
    );
  }

  /// Capture exit photo with metadata
  Future<GateCheckPhoto?> captureExitPhoto({
    required String gateCheckId,
    required String vehiclePlate,
    String? notes,
  }) async {
    return await _capturePhoto(
      type: PhotoType.exit,
      gateCheckId: gateCheckId,
      vehiclePlate: vehiclePlate,
      notes: notes,
    );
  }

  /// Capture general documentation photo
  Future<GateCheckPhoto?> captureDocumentationPhoto({
    required String gateCheckId,
    required String vehiclePlate,
    String? category,
    String? notes,
  }) async {
    return await _capturePhoto(
      type: PhotoType.documentation,
      gateCheckId: gateCheckId,
      vehiclePlate: vehiclePlate,
      category: category,
      notes: notes,
    );
  }

  /// Internal photo capture method
  Future<GateCheckPhoto?> _capturePhoto({
    required PhotoType type,
    required String gateCheckId,
    required String vehiclePlate,
    String? category,
    String? notes,
  }) async {
    if (!_isInitialized || _controller == null) {
      _logger.w('Camera not initialized');
      return null;
    }

    if (_isTakingPicture || (_controller?.value.isTakingPicture ?? false)) {
      _logger.w('Photo capture already in progress');
      return null;
    }

    try {
      _isTakingPicture = true;

      // Take the picture
      final XFile picture = await _controller!.takePicture();

      // Resolve location with fast fallback to avoid blocking capture flow
      final location = await _resolveLocationForCapture();

      // Generate unique photo ID and filename
      final photoId = _uuid.v4();
      final timestamp = DateTime.now();
      final dateStr =
          '${timestamp.year}${timestamp.month.toString().padLeft(2, '0')}${timestamp.day.toString().padLeft(2, '0')}';
      final filename =
          '${type.name}_${vehiclePlate.replaceAll(' ', '_')}_${timestamp.millisecondsSinceEpoch}.jpg';

      // Create daily directory
      final dailyDir = Directory(path.join(_photoDirectory.path, dateStr));
      if (!await dailyDir.exists()) {
        await dailyDir.create();
      }

      final finalPath = path.join(dailyDir.path, filename);

      // Compress and save the image with metadata
      final compressedPhoto = await _processAndSaveImage(
        picture.path,
        finalPath,
        metadata: GateCheckPhotoMetadata(
          photoId: photoId,
          gateCheckId: gateCheckId,
          type: type,
          vehiclePlate: vehiclePlate,
          category: category,
          timestamp: timestamp,
          location: location,
          notes: notes,
          originalSize: await _getFileSize(picture.path),
        ),
      );

      // Clean up temporary file
      try {
        await File(picture.path).delete();
      } catch (e) {
        _logger.w('Could not delete temporary file: ${picture.path}');
      }

      if (compressedPhoto != null) {
        _logger.i('Photo captured: ${type.name} for $vehiclePlate');
        return compressedPhoto;
      }

      return null;
    } catch (e) {
      _logger.e('Error capturing photo', error: e);
      return null;
    } finally {
      _isTakingPicture = false;
    }
  }

  /// Process and save image with compression and metadata
  Future<GateCheckPhoto?> _processAndSaveImage(
      String sourcePath, String targetPath,
      {required GateCheckPhotoMetadata metadata}) async {
    try {
      final sourceFile = File(sourcePath);
      final sourceBytes = await sourceFile.readAsBytes();

      // Decode image
      img.Image? image = img.decodeImage(sourceBytes);
      if (image == null) {
        _logger.e('Could not decode image: $sourcePath');
        return null;
      }

      // Downscale oversized images to speed up watermarking/compression.
      if (image.width > _maxImageDimension ||
          image.height > _maxImageDimension) {
        image = image.width >= image.height
            ? img.copyResize(
                image,
                width: _maxImageDimension,
                interpolation: img.Interpolation.linear,
              )
            : img.copyResize(
                image,
                height: _maxImageDimension,
                interpolation: img.Interpolation.linear,
              );
      }

      // Add timestamp watermark
      image = _addTimestampWatermark(image, metadata.timestamp);

      // Add location watermark if available
      if (metadata.location != null) {
        image = _addLocationWatermark(image, metadata.location!);
      }

      // Compress image
      final compressedBytes = img.encodeJpg(image, quality: _defaultQuality);

      // Save to final location
      final targetFile = File(targetPath);
      await targetFile.writeAsBytes(compressedBytes);

      final compressedSize = compressedBytes.length;
      final compressionRatio = metadata.originalSize > 0
          ? ((metadata.originalSize - compressedSize) /
              metadata.originalSize *
              100)
          : null;

      _logger.d(
          'Image processed: ${metadata.originalSize} -> $compressedSize bytes (${compressionRatio?.toStringAsFixed(1) ?? 'n/a'}% compression)');

      return GateCheckPhoto(
        photoId: metadata.photoId,
        gateCheckId: metadata.gateCheckId,
        type: metadata.type,
        vehiclePlate: metadata.vehiclePlate,
        category: metadata.category,
        filePath: targetPath,
        timestamp: metadata.timestamp,
        location: metadata.location,
        notes: metadata.notes,
        originalSize: metadata.originalSize,
        compressedSize: compressedSize,
        compressionRatio: compressionRatio,
        syncStatus: 'PENDING',
      );
    } catch (e) {
      _logger.e('Error processing image', error: e);
      return null;
    }
  }

  /// Resolve location quickly without making capture wait too long.
  Future<LocationData?> _resolveLocationForCapture() async {
    try {
      final lastKnown = await _locationService.getLastKnownPosition();
      final current = await _locationService.getCurrentPosition(
        accuracy: LocationAccuracy.medium,
        timeout: const Duration(seconds: 2),
      );
      final resolved = current ?? lastKnown;
      if (resolved == null) return null;

      return LocationData(
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        altitude: resolved.altitude,
        accuracy: resolved.accuracy,
      );
    } catch (e) {
      _logger.w('Could not resolve capture location quickly', error: e);
      return null;
    }
  }

  /// Add timestamp watermark to image
  img.Image _addTimestampWatermark(img.Image image, DateTime timestamp) {
    final timestampText =
        '${timestamp.day.toString().padLeft(2, '0')}/${timestamp.month.toString().padLeft(2, '0')}/${timestamp.year} ${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}:${timestamp.second.toString().padLeft(2, '0')}';

    return img.drawString(
      image,
      timestampText,
      font: img.arial24,
      x: 10,
      y: image.height - 35,
      color: img.ColorRgb8(255, 255, 255),
    );
  }

  /// Add location watermark to image
  img.Image _addLocationWatermark(img.Image image, LocationData location) {
    final locationText =
        'Lat: ${location.latitude?.toStringAsFixed(6)} Lng: ${location.longitude?.toStringAsFixed(6)}';

    return img.drawString(
      image,
      locationText,
      font: img.arial14,
      x: 10,
      y: image.height - 60,
      color: img.ColorRgb8(255, 255, 255),
    );
  }

  /// Switch between front and back camera
  Future<bool> switchCamera() async {
    if (!_isInitialized || _availableCameras.length < 2) {
      return false;
    }

    try {
      final currentDirection =
          _controller?.description.lensDirection ?? CameraLensDirection.back;
      final newDirection = currentDirection == CameraLensDirection.back
          ? CameraLensDirection.front
          : CameraLensDirection.back;

      return await _initializeCamera(newDirection);
    } catch (e) {
      _logger.e('Error switching camera', error: e);
      return false;
    }
  }

  /// Set flash mode
  Future<bool> setFlashMode(FlashMode mode) async {
    if (!_isInitialized || _controller == null) {
      return false;
    }

    try {
      await _controller!.setFlashMode(mode);
      return true;
    } catch (e) {
      _logger.e('Error setting flash mode', error: e);
      return false;
    }
  }

  /// Toggle flash through modes
  Future<FlashMode?> toggleFlash() async {
    if (!_isInitialized || _controller == null) {
      return null;
    }

    try {
      final currentMode = _controller!.value.flashMode;
      FlashMode newMode;

      switch (currentMode) {
        case FlashMode.off:
          newMode = FlashMode.auto;
          break;
        case FlashMode.auto:
          newMode = FlashMode.always;
          break;
        case FlashMode.always:
        case FlashMode.torch:
          newMode = FlashMode.off;
          break;
      }

      await setFlashMode(newMode);
      return newMode;
    } catch (e) {
      _logger.e('Error toggling flash', error: e);
      return null;
    }
  }

  /// Get photos for a specific gate check
  Future<List<GateCheckPhoto>> getPhotosForGateCheck(String gateCheckId) async {
    try {
      final photos = <GateCheckPhoto>[];
      await for (final entity in _photoDirectory.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.jpg')) {
          // This is a simplified implementation
          // In practice, you'd store photo metadata in SQLite and query from there
          final filename = path.basename(entity.path);
          if (filename.contains(gateCheckId)) {
            // Create photo object from file (simplified)
            // In reality, this would come from database
            final stat = await entity.stat();
            photos.add(GateCheckPhoto(
              photoId: _uuid.v4(),
              gateCheckId: gateCheckId,
              type: PhotoType.documentation,
              vehiclePlate: '',
              filePath: entity.path,
              timestamp: stat.modified,
              compressedSize: stat.size,
              syncStatus: 'PENDING',
            ));
          }
        }
      }

      photos.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      return photos;
    } catch (e) {
      _logger.e('Error getting photos for gate check', error: e);
      return [];
    }
  }

  /// Get photos by date range
  Future<List<GateCheckPhoto>> getPhotosByDateRange(
      DateTime start, DateTime end) async {
    // Implementation would query photos from database by date range
    // This is a placeholder
    return [];
  }

  /// Clean up old photos (older than specified days)
  Future<void> cleanupOldPhotos({int daysToKeep = 30}) async {
    try {
      final cutoffDate = DateTime.now().subtract(Duration(days: daysToKeep));
      final cutoffDateStr =
          '${cutoffDate.year}${cutoffDate.month.toString().padLeft(2, '0')}${cutoffDate.day.toString().padLeft(2, '0')}';

      await for (final entity in _photoDirectory.list()) {
        if (entity is Directory) {
          final dirname = path.basename(entity.path);
          if (dirname.length == 8 && int.tryParse(dirname) != null) {
            if (dirname.compareTo(cutoffDateStr) < 0) {
              await entity.delete(recursive: true);
              _logger.i('Deleted old photo directory: $dirname');
            }
          }
        }
      }
    } catch (e) {
      _logger.e('Error cleaning up old photos', error: e);
    }
  }

  /// Get storage statistics
  Future<Map<String, dynamic>> getStorageStats() async {
    try {
      int totalFiles = 0;
      int totalSize = 0;
      int pendingSync = 0;

      await for (final entity in _photoDirectory.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.jpg')) {
          final stat = await entity.stat();
          totalFiles++;
          totalSize += stat.size;
          // In practice, sync status would be checked from database
          pendingSync++; // Placeholder
        }
      }

      return {
        'total_files': totalFiles,
        'total_size_mb': (totalSize / (1024 * 1024)).toStringAsFixed(2),
        'pending_sync': pendingSync,
        'storage_path': _photoDirectory.path,
      };
    } catch (e) {
      _logger.e('Error getting storage stats', error: e);
      return {};
    }
  }

  /// Get file size
  Future<int> _getFileSize(String filePath) async {
    try {
      final file = File(filePath);
      final stat = await file.stat();
      return stat.size;
    } catch (e) {
      return 0;
    }
  }

  /// Dispose current camera
  Future<void> _disposeCurrentCamera() async {
    if (_controller != null) {
      try {
        await _controller!.dispose();
      } catch (e) {
        _logger.w('Error disposing camera controller', error: e);
      }
      _controller = null;
    }
    _isTakingPicture = false;
  }

  /// Dispose camera service
  Future<void> dispose() async {
    await _disposeCurrentCamera();
    _isInitialized = false;
    _logger.d('Gate check camera service disposed');
  }

  // Getters
  bool get isInitialized => _isInitialized;
  CameraController? get controller => _controller;
  bool get isCameraReady =>
      _isInitialized && (_controller?.value.isInitialized ?? false);
  String get photoStoragePath => _photoDirectory.path;
}

/// Photo types for gate check documentation
enum PhotoType {
  entry('Entry Photo'),
  exit('Exit Photo'),
  documentation('Documentation'),
  violation('Violation Evidence'),
  damage('Damage Assessment'),
  cargo('Cargo Documentation');

  const PhotoType(this.displayName);
  final String displayName;
}

/// Gate check photo model
class GateCheckPhoto {
  final String photoId;
  final String gateCheckId;
  final PhotoType type;
  final String vehiclePlate;
  final String? category;
  final String filePath;
  final DateTime timestamp;
  final LocationData? location;
  final String? notes;
  final int? originalSize;
  final int compressedSize;
  final double? compressionRatio;
  final String syncStatus;

  const GateCheckPhoto({
    required this.photoId,
    required this.gateCheckId,
    required this.type,
    required this.vehiclePlate,
    this.category,
    required this.filePath,
    required this.timestamp,
    this.location,
    this.notes,
    this.originalSize,
    required this.compressedSize,
    this.compressionRatio,
    required this.syncStatus,
  });

  Map<String, dynamic> toMap() {
    return {
      'photo_id': photoId,
      'gate_check_id': gateCheckId,
      'type': type.name,
      'vehicle_plate': vehiclePlate,
      'category': category,
      'file_path': filePath,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'location_lat': location?.latitude,
      'location_lng': location?.longitude,
      'notes': notes,
      'original_size': originalSize,
      'compressed_size': compressedSize,
      'compression_ratio': compressionRatio,
      'sync_status': syncStatus,
    };
  }
}

/// Photo metadata for processing
class GateCheckPhotoMetadata {
  final String photoId;
  final String gateCheckId;
  final PhotoType type;
  final String vehiclePlate;
  final String? category;
  final DateTime timestamp;
  final LocationData? location;
  final String? notes;
  final int originalSize;

  const GateCheckPhotoMetadata({
    required this.photoId,
    required this.gateCheckId,
    required this.type,
    required this.vehiclePlate,
    this.category,
    required this.timestamp,
    this.location,
    this.notes,
    required this.originalSize,
  });
}

/// Location data structure
class LocationData {
  final double? latitude;
  final double? longitude;
  final double? altitude;
  final double? accuracy;

  const LocationData({
    this.latitude,
    this.longitude,
    this.altitude,
    this.accuracy,
  });
}
