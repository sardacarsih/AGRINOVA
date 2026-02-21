import 'dart:io';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart';

import 'permission_service.dart';

class CameraService {
  static final Logger _logger = Logger();
  final List<CameraDescription> _cameras;
  final PermissionService _permissionService;

  CameraController? _controller;
  bool _isInitialized = false;
  bool _isTakingPicture = false;

  CameraService({
    required List<CameraDescription> cameras,
    required PermissionService permissionService,
  })  : _cameras = cameras,
        _permissionService = permissionService;

  // Getters
  CameraController? get controller => _controller;
  bool get isInitialized =>
      _isInitialized && (_controller?.value.isInitialized ?? false);
  List<CameraDescription> get availableCameras => _cameras;

  // Initialize camera
  Future<bool> initialize({
    CameraLensDirection direction = CameraLensDirection.back,
    ResolutionPreset resolution = ResolutionPreset.high,
  }) async {
    try {
      // Check camera permission
      if (!await _permissionService.hasCameraPermission()) {
        final granted = await _permissionService.requestCameraPermission();
        if (!granted) {
          _logger.w('Camera permission not granted');
          return false;
        }
      }

      // Find camera with specified direction
      final camera = _cameras.firstWhere(
        (camera) => camera.lensDirection == direction,
        orElse: () => _cameras.first,
      );

      // Dispose existing controller
      await dispose();

      _controller = await _initializeControllerWithFallback(
        camera: camera,
        preferredResolution: resolution,
      );

      if (_controller == null) {
        _logger.e('Failed to initialize camera for all supported resolutions');
        _isInitialized = false;
        return false;
      }

      _isInitialized = true;

      _logger.d('Camera initialized successfully');
      return true;
    } catch (e) {
      _logger.e('Error initializing camera: $e');
      _isInitialized = false;
      return false;
    }
  }

  Future<CameraController?> _initializeControllerWithFallback({
    required CameraDescription camera,
    required ResolutionPreset preferredResolution,
  }) async {
    final triedResolutions = <ResolutionPreset>{};
    final resolutionOrder = <ResolutionPreset>[
      preferredResolution,
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
        if (resolution != preferredResolution) {
          _logger.w('Camera initialized with fallback resolution: $resolution');
        }
        return trialController;
      } catch (e) {
        _logger.w('Camera init failed at $resolution: $e');
        try {
          await trialController?.dispose();
        } catch (_) {}
      }
    }

    return null;
  }

  // Take photo
  Future<XFile?> takePicture({
    String? customPath,
    bool compress = true,
    int quality = 85,
  }) async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return null;
      }

      if (_isTakingPicture || (_controller?.value.isTakingPicture ?? false)) {
        _logger.w('Picture capture already in progress');
        return null;
      }

      _isTakingPicture = true;

      // Take the picture
      final XFile picture = await _controller!.takePicture();

      // If no compression needed, return original
      if (!compress) {
        _logger.d('Picture taken: ${picture.path}');
        return picture;
      }

      // Compress and save
      final compressedFile = await _compressImage(
        picture.path,
        quality: quality,
        customPath: customPath,
      );

      // Clean up original if different from compressed
      if (compressedFile?.path != picture.path) {
        try {
          await File(picture.path).delete();
        } catch (e) {
          _logger.w('Could not delete original image: $e');
        }
      }

      _logger.d('Compressed picture saved: ${compressedFile?.path}');
      return compressedFile;
    } catch (e) {
      _logger.e('Error taking picture: $e');
      return null;
    } finally {
      _isTakingPicture = false;
    }
  }

  // Compress image
  Future<XFile?> _compressImage(
    String imagePath, {
    int quality = 85,
    String? customPath,
    int? maxWidth,
    int? maxHeight,
  }) async {
    try {
      final File imageFile = File(imagePath);
      final Uint8List imageBytes = await imageFile.readAsBytes();

      // Decode image
      img.Image? image = img.decodeImage(imageBytes);
      if (image == null) {
        _logger.e('Could not decode image');
        return null;
      }

      // Resize if needed
      if (maxWidth != null || maxHeight != null) {
        image = img.copyResize(
          image,
          width: maxWidth,
          height: maxHeight,
          interpolation: img.Interpolation.linear,
        );
      }

      // Encode with quality
      final List<int> compressedBytes = img.encodeJpg(image, quality: quality);

      // Save compressed image
      String outputPath;
      if (customPath != null) {
        outputPath = customPath;
      } else {
        final Directory tempDir = await getTemporaryDirectory();
        final String fileName =
            '${DateTime.now().millisecondsSinceEpoch}_compressed.jpg';
        outputPath = '${tempDir.path}/$fileName';
      }

      final File outputFile = File(outputPath);
      await outputFile.writeAsBytes(compressedBytes);

      _logger.d(
          'Image compressed: ${imageBytes.length} -> ${compressedBytes.length} bytes');
      return XFile(outputPath);
    } catch (e) {
      _logger.e('Error compressing image: $e');
      return null;
    }
  }

  // Switch camera
  Future<bool> switchCamera() async {
    try {
      if (!isInitialized || _cameras.length < 2) {
        _logger
            .w('Cannot switch camera - not enough cameras or not initialized');
        return false;
      }

      final currentDirection = _controller!.description.lensDirection;
      final newDirection = currentDirection == CameraLensDirection.back
          ? CameraLensDirection.front
          : CameraLensDirection.back;

      final success = await initialize(direction: newDirection);
      _logger.d('Camera switched to $newDirection');
      return success;
    } catch (e) {
      _logger.e('Error switching camera: $e');
      return false;
    }
  }

  // Set flash mode
  Future<bool> setFlashMode(FlashMode mode) async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return false;
      }

      await _controller!.setFlashMode(mode);
      _logger.d('Flash mode set to $mode');
      return true;
    } catch (e) {
      _logger.e('Error setting flash mode: $e');
      return false;
    }
  }

  // Toggle flash
  Future<FlashMode?> toggleFlash() async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return null;
      }

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
          newMode = FlashMode.torch;
          break;
        case FlashMode.torch:
          newMode = FlashMode.off;
          break;
      }

      await setFlashMode(newMode);
      return newMode;
    } catch (e) {
      _logger.e('Error toggling flash: $e');
      return null;
    }
  }

  // Set exposure offset
  Future<bool> setExposureOffset(double offset) async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return false;
      }

      await _controller!.setExposureOffset(offset);
      _logger.d('Exposure offset set to $offset');
      return true;
    } catch (e) {
      _logger.e('Error setting exposure offset: $e');
      return false;
    }
  }

  // Set zoom level
  Future<bool> setZoomLevel(double zoom) async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return false;
      }

      await _controller!.setZoomLevel(zoom);
      _logger.d('Zoom level set to $zoom');
      return true;
    } catch (e) {
      _logger.e('Error setting zoom level: $e');
      return false;
    }
  }

  // Get max zoom level
  Future<double> getMaxZoomLevel() async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return 1.0;
      }

      return await _controller!.getMaxZoomLevel();
    } catch (e) {
      _logger.e('Error getting max zoom level: $e');
      return 1.0;
    }
  }

  // Get min zoom level
  Future<double> getMinZoomLevel() async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return 1.0;
      }

      return await _controller!.getMinZoomLevel();
    } catch (e) {
      _logger.e('Error getting min zoom level: $e');
      return 1.0;
    }
  }

  // Start image stream (for QR scanning, etc.)
  Future<bool> startImageStream(
    Function(CameraImage) onImage,
  ) async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return false;
      }

      await _controller!.startImageStream(onImage);
      _logger.d('Image stream started');
      return true;
    } catch (e) {
      _logger.e('Error starting image stream: $e');
      return false;
    }
  }

  // Stop image stream
  Future<bool> stopImageStream() async {
    try {
      if (!isInitialized) {
        _logger.w('Camera not initialized');
        return false;
      }

      await _controller!.stopImageStream();
      _logger.d('Image stream stopped');
      return true;
    } catch (e) {
      _logger.e('Error stopping image stream: $e');
      return false;
    }
  }

  // Get camera info
  Map<String, dynamic> getCameraInfo() {
    if (!isInitialized) {
      return {
        'initialized': false,
        'error': 'Camera not initialized',
      };
    }

    final value = _controller!.value;
    final description = _controller!.description;

    return {
      'initialized': true,
      'isInitialized': value.isInitialized,
      'isRecordingVideo': value.isRecordingVideo,
      'isTakingPicture': value.isTakingPicture,
      'isStreamingImages': value.isStreamingImages,
      'flashMode': value.flashMode.toString(),
      'exposureMode': value.exposureMode.toString(),
      'focusMode': value.focusMode.toString(),
      'deviceOrientation': value.deviceOrientation.toString(),
      'description': {
        'name': description.name,
        'lensDirection': description.lensDirection.toString(),
        'sensorOrientation': description.sensorOrientation,
      },
      'previewSize': value.previewSize != null
          ? {
              'width': value.previewSize!.width,
              'height': value.previewSize!.height,
            }
          : null,
    };
  }

  // Dispose camera
  Future<void> dispose() async {
    try {
      if (_controller != null) {
        if (_controller!.value.isStreamingImages) {
          await _controller!.stopImageStream();
        }
        await _controller!.dispose();
        _controller = null;
      }
      _isInitialized = false;
      _isTakingPicture = false;
      _logger.d('Camera disposed');
    } catch (e) {
      _logger.e('Error disposing camera: $e');
    }
  }

  // Save image to gallery (requires additional permissions)
  Future<bool> saveToGallery(String imagePath) async {
    try {
      // This would require additional plugin like gallery_saver
      // For now, just log the action
      _logger.d('Would save image to gallery: $imagePath');
      return true;
    } catch (e) {
      _logger.e('Error saving to gallery: $e');
      return false;
    }
  }

  // Get image metadata
  Future<Map<String, dynamic>?> getImageMetadata(String imagePath) async {
    try {
      final File imageFile = File(imagePath);

      if (!await imageFile.exists()) {
        _logger.w('Image file does not exist: $imagePath');
        return null;
      }

      final stat = await imageFile.stat();
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);

      return {
        'path': imagePath,
        'size': stat.size,
        'modified': stat.modified.toIso8601String(),
        'width': image?.width ?? 0,
        'height': image?.height ?? 0,
        'format': imagePath.split('.').last.toUpperCase(),
      };
    } catch (e) {
      _logger.e('Error getting image metadata: $e');
      return null;
    }
  }
}
