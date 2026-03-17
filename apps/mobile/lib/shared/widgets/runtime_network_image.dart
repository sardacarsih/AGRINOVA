import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Shared widget for rendering network images with smart SVG/raster detection.
///
/// Detects the image format from the URL and renders accordingly:
/// - Known SVG URLs → SvgPicture.network
/// - Known raster URLs → Image.network
/// - Unknown → tries SVG first, falls back to raster
class RuntimeNetworkImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit fit;
  final Widget? loadingFallback;
  final Widget? errorFallback;

  const RuntimeNetworkImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.contain,
    this.loadingFallback,
    this.errorFallback,
  });

  @override
  Widget build(BuildContext context) {
    final trimmedUrl = imageUrl.trim();
    if (trimmedUrl.isEmpty) {
      return errorFallback ?? const SizedBox.shrink();
    }

    final loading = loadingFallback ?? const SizedBox.shrink();
    final error = errorFallback ?? const SizedBox.shrink();

    if (_isLikelyRasterAssetUrl(trimmedUrl)) {
      return _buildRasterNetworkImage(
        trimmedUrl,
        fit: fit,
        loadingFallback: loading,
        errorFallback: error,
        allowSvgFallback: true,
      );
    }

    if (_isSvgAssetUrl(trimmedUrl)) {
      return _buildSvgNetworkImage(
        trimmedUrl,
        fit: fit,
        loadingFallback: loading,
        errorFallback: error,
        allowRasterFallback: true,
      );
    }

    // Unknown extension/format: try SVG first, then fallback to raster.
    return _buildSvgNetworkImage(
      trimmedUrl,
      fit: fit,
      loadingFallback: loading,
      errorFallback: error,
      allowRasterFallback: true,
    );
  }

  Widget _buildSvgNetworkImage(
    String url, {
    required BoxFit fit,
    required Widget loadingFallback,
    required Widget errorFallback,
    required bool allowRasterFallback,
  }) {
    return SvgPicture.network(
      url,
      fit: fit,
      placeholderBuilder: (context) => loadingFallback,
      errorBuilder: (context, error, stackTrace) {
        if (kDebugMode) {
          debugPrint(
            'RuntimeNetworkImage SVG failed: $url | error: $error',
          );
        }
        if (!allowRasterFallback) {
          return errorFallback;
        }
        return _buildRasterNetworkImage(
          url,
          fit: fit,
          loadingFallback: loadingFallback,
          errorFallback: errorFallback,
          allowSvgFallback: false,
        );
      },
    );
  }

  Widget _buildRasterNetworkImage(
    String url, {
    required BoxFit fit,
    required Widget loadingFallback,
    required Widget errorFallback,
    required bool allowSvgFallback,
  }) {
    return Image.network(
      url,
      fit: fit,
      filterQuality: FilterQuality.medium,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return loadingFallback;
      },
      errorBuilder: (context, error, stackTrace) {
        if (kDebugMode) {
          debugPrint(
            'RuntimeNetworkImage raster failed: $url | error: $error',
          );
        }
        if (!allowSvgFallback) {
          return errorFallback;
        }
        return _buildSvgNetworkImage(
          url,
          fit: fit,
          loadingFallback: loadingFallback,
          errorFallback: errorFallback,
          allowRasterFallback: false,
        );
      },
    );
  }

  static bool _isSvgAssetUrl(String imageUrl) {
    final normalized = imageUrl.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    if (normalized.contains('image/svg+xml')) return true;

    final uri = Uri.tryParse(normalized);
    if (uri != null) {
      const svgHintKeys = [
        'format',
        'mime',
        'contentType',
        'content_type',
        'fileType',
        'file_type',
      ];
      for (final key in svgHintKeys) {
        final queryValue = uri.queryParameters[key];
        if (queryValue != null && queryValue.toLowerCase().contains('svg')) {
          return true;
        }
      }
    }
    final path = uri?.path ?? normalized;
    return path.endsWith('.svg');
  }

  static bool _isLikelyRasterAssetUrl(String imageUrl) {
    final normalized = imageUrl.trim().toLowerCase();
    if (normalized.isEmpty || normalized.contains('image/svg+xml')) {
      return false;
    }
    final uri = Uri.tryParse(normalized);
    final path = uri?.path ?? normalized;
    return path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.webp') ||
        path.endsWith('.gif') ||
        path.endsWith('.bmp');
  }
}
