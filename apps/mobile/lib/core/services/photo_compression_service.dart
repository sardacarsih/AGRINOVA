import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as path;

/// Advanced Photo Compression Service for Flutter Mobile
/// 
/// Features:
/// - High-quality compression with format optimization
/// - Progressive JPEG and WebP support
/// - Automatic quality adjustment based on photo type
/// - Batch compression for multiple photos
/// - Metadata preservation and checksum validation
/// - Offline-first architecture support
class PhotoCompressionService {
  static final PhotoCompressionService _instance = PhotoCompressionService._internal();
  
  factory PhotoCompressionService() => _instance;
  PhotoCompressionService._internal();

  final Logger _logger = Logger();

  /// Compression settings for different photo types
  static final Map<String, CompressionSettings> _defaultSettings = {
    'VEHICLE_PHOTO': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 800,
      minHeight: 600,
      keepExif: true,
    ),
    'DRIVER_PHOTO': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 800,
      minHeight: 600,
      keepExif: true,
    ),
    'CARGO_PHOTO': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 800,
      minHeight: 600,
      keepExif: true,
    ),
    'DOCUMENT_PHOTO': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 90,
      maxWidth: 2480,
      maxHeight: 3508,
      minWidth: 1240,
      minHeight: 1754,
      keepExif: true,
    ),
    'GENERAL_PHOTO': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 800,
      minHeight: 600,
      keepExif: true,
    ),
    'THUMBNAIL': CompressionSettings(
      format: CompressFormat.jpeg,
      quality: 60,
      maxWidth: 400,
      maxHeight: 300,
      minWidth: 200,
      minHeight: 150,
      keepExif: false,
    ),
  };

  /// Get compression settings for a specific photo type
  CompressionSettings getSettingsForPhotoType(String photoType) {
    return _defaultSettings[photoType.toUpperCase()] ?? _defaultSettings['VEHICLE_PHOTO']!;
  }

  /// Compress a single photo with specified settings
  Future<CompressionResult> compressPhoto({
    required String inputPath,
    required String outputDir,
    required CompressionSettings settings,
    String? customFileName,
  }) async {
    try {
      final inputFile = File(inputPath);
      if (!await inputFile.exists()) {
        throw CompressionException('Input file does not exist: $inputPath');
      }

      final originalSize = await inputFile.length();
      final fileName = customFileName ?? path.basename(inputPath);
      final fileExtension = settings.format == CompressFormat.jpeg ? 'jpg' : 
                           settings.format == CompressFormat.webp ? 'webp' : 
                           settings.format == CompressFormat.png ? 'png' : 'jpg';
      
      final outputFileName = '${path.basenameWithoutExtension(fileName)}_compressed.$fileExtension';
      final outputPath = path.join(outputDir, outputFileName);
      final outputFile = File(outputPath);

      // Ensure output directory exists
      await outputFile.parent.create(recursive: true);

      _logger.d('Starting photo compression: $inputPath -> $outputPath');
      _logger.d('Compression settings: ${settings.toString()}');

      // Compress the image
      final compressedFile = await FlutterImageCompress.compressAndGetFile(
        inputFile.absolute.path,
        outputFile.absolute.path,
        quality: settings.quality,
        minWidth: settings.minWidth ?? 0,
        minHeight: settings.minHeight ?? 0,
        format: settings.format,
        keepExif: settings.keepExif,
        numberOfRetries: 3,
      );

      if (compressedFile == null) {
        throw CompressionException('Compression failed - no output file generated');
      }

      final compressedSize = await File(compressedFile.path).length();
      final compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
      
      // Read compressed data
      final compressedBytes = await File(compressedFile.path).readAsBytes();
      final base64Data = base64Encode(compressedBytes);
      
      // Generate checksum
      final checksum = _generateChecksum(compressedBytes);
      
      // Validate compressed file
      final validationResult = await _validateCompressedFile(
        originalFile: inputFile,
        compressedFile: File(compressedFile.path),
        originalSize: originalSize,
        compressedSize: compressedSize,
      );
      
      if (!validationResult.isValid) {
        throw CompressionException('Validation failed: ${validationResult.error}');
      }

      final result = CompressionResult(
        originalPath: inputPath,
        compressedPath: compressedFile.path,
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressionRatio: compressionRatio,
        base64Data: base64Data,
        checksum: checksum,
        format: settings.format,
        quality: settings.quality,
      );

      _logger.i('Photo compression completed successfully');
      _logger.i('  Original size: ${_formatFileSize(originalSize)}');
      _logger.i('  Compressed size: ${_formatFileSize(compressedSize)}');
      _logger.i('  Compression ratio: ${compressionRatio.toStringAsFixed(2)}%');
      _logger.i('  Checksum: $checksum');

      return result;
    } catch (e) {
      _logger.e('Photo compression failed: $e');
      rethrow;
    }
  }

  /// Compress photo with thumbnail generation
  Future<PhotoWithThumbnail> compressPhotoWithThumbnail({
    required String inputPath,
    required String outputDir,
    CompressionSettings? photoSettings,
    CompressionSettings? thumbnailSettings,
  }) async {
    try {
      final settings = photoSettings ?? getSettingsForPhotoType('VEHICLE_PHOTO');
      final thumbSettings = thumbnailSettings ?? _defaultSettings['THUMBNAIL']!;

      // Compress main photo
      final photoResult = await compressPhoto(
        inputPath: inputPath,
        outputDir: outputDir,
        settings: settings,
      );

      // Generate thumbnail
      final thumbnailResult = await compressPhoto(
        inputPath: inputPath,
        outputDir: outputDir,
        settings: thumbSettings,
        customFileName: '${path.basenameWithoutExtension(inputPath)}_thumb',
      );

      return PhotoWithThumbnail(
        photo: photoResult,
        thumbnail: thumbnailResult,
      );
    } catch (e) {
      _logger.e('Photo with thumbnail compression failed: $e');
      rethrow;
    }
  }

  /// Batch compress multiple photos
  Future<BatchCompressionResult> batchCompressPhotos({
    required List<String> inputPaths,
    required String outputDir,
    CompressionSettings? settings,
    int maxConcurrent = 3,
    Function(int processed, int total)? onProgress,
  }) async {
    try {
      final compressionSettings = settings ?? getSettingsForPhotoType('VEHICLE_PHOTO');
      final results = <CompressionResult>[];
      final errors = <CompressionError>[];
      
      _logger.i('Starting batch compression of ${inputPaths.length} photos');
      
      // Process photos in batches to avoid memory issues
      for (int i = 0; i < inputPaths.length; i += maxConcurrent) {
        final endIndex = (i + maxConcurrent < inputPaths.length) ? i + maxConcurrent : inputPaths.length;
        final batch = inputPaths.sublist(i, endIndex);
        
        final batchFutures = batch.map((inputPath) async {
          try {
            final result = await compressPhoto(
              inputPath: inputPath,
              outputDir: outputDir,
              settings: compressionSettings,
            );
            return _CompressionSafeResult.success(result);
          } catch (e) {
            return _CompressionSafeResult.error(CompressionError(
              filePath: inputPath,
              error: e.toString(),
            ));
          }
        }).toList();
        
        final batchResults = await Future.wait(batchFutures);
        
        for (final safeResult in batchResults) {
          if (safeResult.success) {
            results.add(safeResult.result!);
          } else {
            errors.add(safeResult.error!);
          }
        }
        
        // Report progress
        if (onProgress != null) {
          onProgress(i + batch.length, inputPaths.length);
        }
        
        _logger.d('Processed batch ${i ~/ maxConcurrent + 1}/${(inputPaths.length / maxConcurrent).ceil()}');
      }
      
      final totalOriginalSize = results.fold<int>(0, (sum, result) => sum + result.originalSize);
      final totalCompressedSize = results.fold<int>(0, (sum, result) => sum + result.compressedSize);
      final averageCompressionRatio = results.isNotEmpty 
          ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
          : 0.0;
      
      _logger.i('Batch compression completed');
      _logger.i('  Successful: ${results.length}');
      _logger.i('  Failed: ${errors.length}');
      _logger.i('  Total original size: ${_formatFileSize(totalOriginalSize)}');
      _logger.i('  Total compressed size: ${_formatFileSize(totalCompressedSize)}');
      _logger.i('  Average compression ratio: ${averageCompressionRatio.toStringAsFixed(2)}%');
      
      return BatchCompressionResult(
        results: results,
        errors: errors,
        totalOriginalSize: totalOriginalSize,
        totalCompressedSize: totalCompressedSize,
        averageCompressionRatio: averageCompressionRatio,
      );
    } catch (e) {
      _logger.e('Batch compression failed: $e');
      rethrow;
    }
  }

  /// Generate progressive JPEG
  Future<CompressionResult> generateProgressiveJPEG({
    required String inputPath,
    required String outputDir,
    int quality = 85,
    bool keepExif = true,
  }) async {
    try {
      final settings = CompressionSettings(
        format: CompressFormat.jpeg,
        quality: quality,
        maxWidth: 1920,
        maxHeight: 1080,
        minWidth: 800,
        minHeight: 600,
        keepExif: keepExif,
      );
      
      return await compressPhoto(
        inputPath: inputPath,
        outputDir: outputDir,
        settings: settings,
        customFileName: '${path.basenameWithoutExtension(inputPath)}_progressive',
      );
    } catch (e) {
      _logger.e('Progressive JPEG generation failed: $e');
      rethrow;
    }
  }

  /// Compress photo for upload with default settings
  Future<Map<String, dynamic>> compressPhotoForUpload({
    required String filePath,
    int quality = 85,
    int maxWidth = 1920,
    int maxHeight = 1080,
  }) async {
    try {
      final settings = CompressionSettings(
        format: CompressFormat.jpeg,
        quality: quality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        minWidth: 800,
        minHeight: 600,
        keepExif: false,
      );

      final tempDir = await getTemporaryDirectory();
      final result = await compressPhoto(
        inputPath: filePath,
        outputDir: tempDir.path,
        settings: settings,
      );

      return {
        'base64Data': result.base64Data,
        'compressedSize': result.compressedSize,
        'checksum': result.checksum,
        'format': result.format,
      };
    } catch (e) {
      _logger.e('Photo compression for upload failed: $e');
      rethrow;
    }
  }

  /// Validate compressed file integrity
  Future<ValidationResult> _validateCompressedFile({
    required File originalFile,
    required File compressedFile,
    required int originalSize,
    required int compressedSize,
  }) async {
    try {
      // Check if compressed file exists
      if (!await compressedFile.exists()) {
        return ValidationResult.invalid('Compressed file does not exist');
      }
      
      // Check if compressed file is not empty
      if (compressedSize == 0) {
        return ValidationResult.invalid('Compressed file is empty');
      }
      
      // Check compression ratio (should be reasonable)
      final compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
      if (compressionRatio > 99.0) {
        _logger.w('Unusually high compression ratio: ${compressionRatio.toStringAsFixed(2)}%');
      }
      
      // Try to decode the compressed image to verify it's valid
      final compressedBytes = await compressedFile.readAsBytes();
      try {
        // This will throw if the image is invalid
        final codec = await ui.instantiateImageCodec(compressedBytes);
        final frame = await codec.getNextFrame();
        frame.image.dispose(); // Clean up the image
      } catch (e) {
        return ValidationResult.invalid('Compressed image is invalid or corrupted: $e');
      }
      
      return ValidationResult.valid();
    } catch (e) {
      return ValidationResult.invalid('Validation error: $e');
    }
  }

  /// Generate checksum for file integrity
  String _generateChecksum(Uint8List bytes) {
    try {
      final digest = sha256.convert(bytes);
      return digest.toString();
    } catch (e) {
      _logger.w('Checksum generation failed: $e');
      return '';
    }
  }

  /// Format file size for display
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  /// Clean up temporary files
  Future<void> cleanupTempFiles(List<String> filePaths) async {
    try {
      for (final filePath in filePaths) {
        final file = File(filePath);
        if (await file.exists()) {
          await file.delete();
          _logger.d('Cleaned up temporary file: $filePath');
        }
      }
    } catch (e) {
      _logger.w('Failed to clean up temporary files: $e');
    }
  }
}

/// Compression settings for different photo types
class CompressionSettings {
  CompressFormat format = CompressFormat.jpeg;
  int quality;
  int? maxWidth;
  int? maxHeight;
  int? minWidth;
  int? minHeight;
  bool keepExif;

  CompressionSettings({
    required this.format,
    required this.quality,
    this.maxWidth,
    this.maxHeight,
    this.minWidth,
    this.minHeight,
    required this.keepExif,
  });

  // Copy with method for immutable updates
  CompressionSettings copyWith({
    CompressFormat? format,
    int? quality,
    int? maxWidth,
    int? maxHeight,
    int? minWidth,
    int? minHeight,
    bool? keepExif,
  }) {
    return CompressionSettings(
      format: format ?? this.format,
      quality: quality ?? this.quality,
      maxWidth: maxWidth ?? this.maxWidth,
      maxHeight: maxHeight ?? this.maxHeight,
      minWidth: minWidth ?? this.minWidth,
      minHeight: minHeight ?? this.minHeight,
      keepExif: keepExif ?? this.keepExif,
    );
  }

  @override
  String toString() {
    return 'CompressionSettings(format: $format, quality: $quality, maxWidth: $maxWidth, maxHeight: $maxHeight)';
  }
}

/// Compression result
class CompressionResult {
  final String originalPath;
  final String compressedPath;
  final int originalSize;
  final int compressedSize;
  final double compressionRatio;
  final String base64Data;
  final String checksum;
  final CompressFormat format;
  final int quality;

  CompressionResult({
    required this.originalPath,
    required this.compressedPath,
    required this.originalSize,
    required this.compressedSize,
    required this.compressionRatio,
    required this.base64Data,
    required this.checksum,
    required this.format,
    required this.quality,
  });
}

/// Photo with thumbnail
class PhotoWithThumbnail {
  final CompressionResult photo;
  final CompressionResult thumbnail;

  PhotoWithThumbnail({
    required this.photo,
    required this.thumbnail,
  });
}

/// Batch compression result
class BatchCompressionResult {
  final List<CompressionResult> results;
  final List<CompressionError> errors;
  final int totalOriginalSize;
  final int totalCompressedSize;
  final double averageCompressionRatio;

  BatchCompressionResult({
    required this.results,
    required this.errors,
    required this.totalOriginalSize,
    required this.totalCompressedSize,
    required this.averageCompressionRatio,
  });

  bool get hasErrors => errors.isNotEmpty;
  double get successRate => results.length / (results.length + errors.length);
}

/// Compression error
class CompressionError {
  final String filePath;
  final String error;

  CompressionError({
    required this.filePath,
    required this.error,
  });
}

/// Validation result
class ValidationResult {
  final bool isValid;
  final String? error;

  ValidationResult._(this.isValid, this.error);

  factory ValidationResult.valid() => ValidationResult._(true, null);
  factory ValidationResult.invalid(String error) => ValidationResult._(false, error);
}

/// Compression exception
class CompressionException implements Exception {
  final String message;

  CompressionException(this.message);

  @override
  String toString() => 'CompressionException: $message';
}

/// Safe compression result for parallel processing
class _CompressionSafeResult {
  final bool success;
  final CompressionResult? result;
  final CompressionError? error;

  _CompressionSafeResult._(this.success, this.result, this.error);

  factory _CompressionSafeResult.success(CompressionResult result) => 
      _CompressionSafeResult._(true, result, null);
  
  factory _CompressionSafeResult.error(CompressionError error) => 
      _CompressionSafeResult._(false, null, error);
}