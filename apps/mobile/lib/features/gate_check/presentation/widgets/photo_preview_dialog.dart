import 'dart:io';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../../../../core/services/gate_check_camera_service.dart';

/// Photo Preview Dialog Widget
/// 
/// Features:
/// - Display captured photo with full preview
/// - Retake photo functionality
/// - Confirm and save photo option
/// - Responsive layout for different screen sizes
/// - Photo metadata display
class PhotoPreviewDialog extends StatelessWidget {
  final GateCheckPhoto photo;
  final String vehiclePlate;
  final VoidCallback onRetake;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;
  
  static final Logger _logger = Logger();

  const PhotoPreviewDialog({
    super.key,
    required this.photo,
    required this.vehiclePlate,
    required this.onRetake,
    required this.onConfirm,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    
    return Dialog(
      insetPadding: EdgeInsets.all(isSmallScreen ? 16 : 24),
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: screenSize.height * 0.8,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              spreadRadius: 2,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            _buildHeader(context),
            
            // Photo Preview
            Expanded(
              child: _buildPhotoPreview(context, isSmallScreen),
            ),
            
            // Photo Metadata
            _buildPhotoMetadata(context, isSmallScreen),
            
            // Action Buttons
            _buildActionButtons(context, isSmallScreen),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo[600]!, Colors.indigo[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.camera_alt, color: Colors.white, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Foto Kendaraan',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Plat: $vehiclePlate',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: onCancel ?? () => Navigator.of(context).pop(),
            tooltip: 'Tutup',
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoPreview(BuildContext context, bool isSmallScreen) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _buildPhotoWidget(),
      ),
    );
  }

  Widget _buildPhotoWidget() {
    try {
      final file = File(photo.filePath);
      if (file.existsSync()) {
        return Image.file(
          file,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            _logger.e('Error loading photo from file', error: error);
            return _buildErrorWidget();
          },
        );
      } else {
        _logger.w('Photo file does not exist: ${photo.filePath}');
        return _buildErrorWidget();
      }
    } catch (e) {
      _logger.e('Error displaying photo preview', error: e);
      return _buildErrorWidget();
    }
  }

  Widget _buildErrorWidget() {
    return Container(
      height: 200,
      color: Colors.grey[100],
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.grey),
          SizedBox(height: 8),
          Text(
            'Tidak dapat menampilkan foto',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoMetadata(BuildContext context, bool isSmallScreen) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Detail Foto',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.indigo[700],
            ),
          ),
          const SizedBox(height: 8),
          _buildMetadataRow('Waktu Diambil', _formatDateTime(photo.timestamp)),
          if (_formatCoordinates(photo.location) != null)
            _buildMetadataRow('Koordinat', _formatCoordinates(photo.location)!),
          _buildMetadataRow('Ukuran File', _formatFileSize(photo.compressedSize)),
          _buildMetadataRow('Kategori', photo.category ?? '-'),
        ],
      ),
    );
  }

  Widget _buildMetadataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.black87,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, bool isSmallScreen) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(16),
          bottomRight: Radius.circular(16),
        ),
      ),
      child: Column(
        children: [
          if (isSmallScreen) ...[
            // Stack buttons vertically on small screens
            _buildConfirmButton(context, true),
            const SizedBox(height: 8),
            _buildRetakeButton(context, true),
          ] else ...[
            // Side by side buttons on larger screens
            Row(
              children: [
                Expanded(child: _buildRetakeButton(context, false)),
                const SizedBox(width: 12),
                Expanded(child: _buildConfirmButton(context, false)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConfirmButton(BuildContext context, bool fullWidth) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: ElevatedButton.icon(
        onPressed: () {
          _logger.d('Photo confirmed for vehicle: $vehiclePlate');
          Navigator.of(context).pop();
          onConfirm();
        },
        icon: const Icon(Icons.check_circle),
        label: const Text('Gunakan Foto Ini'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green[600],
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildRetakeButton(BuildContext context, bool fullWidth) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: OutlinedButton.icon(
        onPressed: () {
          _logger.d('Retaking photo for vehicle: $vehiclePlate');
          Navigator.of(context).pop();
          onRetake();
        },
        icon: const Icon(Icons.camera_alt),
        label: const Text('Ambil Ulang'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.indigo[600],
          side: BorderSide(color: Colors.indigo[600]!),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} '
           '${dateTime.hour.toString().padLeft(2, '0')}:'
           '${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String? _formatCoordinates(LocationData? location) {
    final lat = location?.latitude;
    final lng = location?.longitude;
    if (lat == null || lng == null) return null;
    return '${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}

/// Helper function to show the photo preview dialog
Future<void> showPhotoPreviewDialog({
  required BuildContext context,
  required GateCheckPhoto photo,
  required String vehiclePlate,
  required VoidCallback onRetake,
  required VoidCallback onConfirm,
  VoidCallback? onCancel,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (BuildContext context) {
      return PhotoPreviewDialog(
        photo: photo,
        vehiclePlate: vehiclePlate,
        onRetake: onRetake,
        onConfirm: onConfirm,
        onCancel: onCancel,
      );
    },
  );
}

