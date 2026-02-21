import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

class HarvestPhotoWidget extends StatefulWidget {
  final String? imagePath;
  final ValueChanged<String?> onPhotoTaken;

  const HarvestPhotoWidget({
    Key? key,
    this.imagePath,
    required this.onPhotoTaken,
  }) : super(key: key);

  @override
  State<HarvestPhotoWidget> createState() => _HarvestPhotoWidgetState();
}

class _HarvestPhotoWidgetState extends State<HarvestPhotoWidget> {
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.imagePath != null) ...[
          _buildImagePreview(),
          const SizedBox(height: 16),
        ],
        _buildCameraControls(),
      ],
    );
  }

  Widget _buildImagePreview() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.file(
              File(widget.imagePath!),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: Colors.grey.shade100,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 48,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Gagal memuat foto',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 20,
                  ),
                  onPressed: () => widget.onPhotoTaken(null),
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraControls() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isLoading ? null : () => _takePicture(ImageSource.camera),
                icon: _isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.camera_alt),
                label: Text(_isLoading ? 'Mengambil...' : 'Kamera'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isLoading ? null : () => _takePicture(ImageSource.gallery),
                icon: const Icon(Icons.photo_library),
                label: const Text('Galeri'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Foto dapat membantu verifikasi kualitas panen',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade600,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Future<void> _takePicture(ImageSource source) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Request camera permission if taking from camera
      if (source == ImageSource.camera) {
        final cameraPermission = await Permission.camera.request();
        if (cameraPermission.isDenied) {
          _showPermissionDialog('Kamera', 'mengambil foto panen');
          return;
        }
        if (cameraPermission.isPermanentlyDenied) {
          _showPermissionSettingsDialog('Kamera');
          return;
        }
      }

      // Request storage permission for gallery access
      if (source == ImageSource.gallery) {
        final storagePermission = await Permission.storage.request();
        if (storagePermission.isDenied) {
          final photosPermission = await Permission.photos.request();
          if (photosPermission.isDenied) {
            _showPermissionDialog('Penyimpanan', 'mengakses galeri foto');
            return;
          }
          if (photosPermission.isPermanentlyDenied) {
            _showPermissionSettingsDialog('Galeri');
            return;
          }
        }
      }

      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (image != null) {
        widget.onPhotoTaken(image.path);
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Foto berhasil diambil'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengambil foto: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showPermissionDialog(String permissionType, String purpose) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.warning,
          color: Colors.orange,
          size: 48,
        ),
        title: Text('Izin $permissionType Diperlukan'),
        content: Text(
          'Aplikasi memerlukan akses $permissionType untuk $purpose. '
          'Silakan berikan izin pada dialog berikutnya.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Mengerti'),
          ),
        ],
      ),
    );
  }

  void _showPermissionSettingsDialog(String permissionType) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.settings,
          color: Colors.blue,
          size: 48,
        ),
        title: Text('Izin $permissionType Ditolak'),
        content: Text(
          'Izin $permissionType telah ditolak secara permanen. '
          'Silakan aktifkan melalui Pengaturan > Aplikasi > Agrinova > Izin.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
            },
            child: const Text('Buka Pengaturan'),
          ),
        ],
      ),
    );
  }
}