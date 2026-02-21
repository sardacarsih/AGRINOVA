import 'dart:io';

import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:logger/logger.dart';

import '../../../../core/services/gate_check_camera_service.dart';
import '../../../../core/services/permission_service.dart';
import '../../../../core/services/location_service.dart';

/// Vehicle Camera Widget for Gate Check Photo Documentation
///
/// Features:
/// - Full-screen camera interface
/// - Vehicle photo capture with metadata
/// - Flash control and camera switching
/// - Real-time camera preview
/// - Photo compression and optimization
/// - Location tagging integration
class VehicleCameraWidget extends StatefulWidget {
  final String gateCheckId;
  final String vehiclePlate;
  final String? category;
  final String? notes;
  final Function(GateCheckPhoto) onPhotoTaken;
  final VoidCallback? onCancel;

  const VehicleCameraWidget({
    Key? key,
    required this.gateCheckId,
    required this.vehiclePlate,
    this.category,
    this.notes,
    required this.onPhotoTaken,
    this.onCancel,
  }) : super(key: key);

  @override
  State<VehicleCameraWidget> createState() => _VehicleCameraWidgetState();
}

class _VehicleCameraWidgetState extends State<VehicleCameraWidget>
    with WidgetsBindingObserver {
  static final Logger _logger = Logger();

  GateCheckCameraService? _cameraService;
  bool _isInitialized = false;
  bool _isCapturing = false;
  String _errorMessage = '';
  FlashMode _currentFlashMode = FlashMode.auto;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraService?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final service = _cameraService;
    if (service == null) return;

    if (state == AppLifecycleState.resumed) {
      if (!_isInitialized && mounted) {
        _initializeCamera();
      }
      return;
    }

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      service.dispose();
      if (mounted) {
        setState(() {
          _isInitialized = false;
        });
      }
    }
  }

  Future<void> _initializeCamera() async {
    try {
      setState(() {
        _isInitialized = false;
        _errorMessage = '';
      });

      // Initialize camera service
      _cameraService = GateCheckCameraService(
        permissionService: PermissionService(),
        locationService: LocationService(
          permissionService: PermissionService(),
        ),
      );

      final success = await _cameraService!.initialize();
      if (!success) {
        throw Exception('Failed to initialize camera service');
      }

      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }

      _logger.i('Vehicle camera initialized successfully');
    } catch (e) {
      _logger.e('Error initializing vehicle camera', error: e);
      if (mounted) {
        setState(() {
          _errorMessage = 'Error initializing camera: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _capturePhoto() async {
    if (!_isInitialized || _isCapturing || _cameraService == null) return;

    setState(() {
      _isCapturing = true;
    });

    try {
      // Add small delay to ensure camera is ready and prevent buffer overflow
      await Future.delayed(const Duration(milliseconds: 100));

      final photo = await _cameraService!.captureDocumentationPhoto(
        gateCheckId: widget.gateCheckId,
        vehiclePlate: widget.vehiclePlate,
        category: widget.category,
        notes: widget.notes,
      );

      if (photo != null) {
        _logger.i('Vehicle photo captured successfully: ${photo.filePath}');

        // Show photo preview before finishing
        await _showCapturedPhotoPreview(photo);
      } else {
        throw Exception('Failed to capture photo');
      }
    } catch (e) {
      _logger.e('Error capturing vehicle photo', error: e);

      // Different error handling based on error type
      String errorMessage = 'Gagal mengambil foto';
      bool canRetry = true;

      if (e.toString().contains('ImageReader') ||
          e.toString().contains('buffer')) {
        errorMessage = 'Kamera sedang sibuk, coba lagi dalam beberapa detik';
      } else if (e.toString().contains('camera') ||
          e.toString().contains('CameraException')) {
        errorMessage = 'Kamera tidak tersedia';
        canRetry = false;
      } else if (e.toString().contains('permission')) {
        errorMessage = 'Izin kamera diperlukan';
        canRetry = false;
      } else {
        errorMessage = 'Gagal mengambil foto: ${e.toString()}';
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error, color: Colors.white),
                SizedBox(width: 8),
                Expanded(
                  child: Text(errorMessage),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 4),
            action: canRetry
                ? SnackBarAction(
                    label: 'COBA LAGI',
                    textColor: Colors.white,
                    onPressed: () {
                      // Retry after a short delay to prevent buffer overflow
                      Future.delayed(const Duration(milliseconds: 1500), () {
                        if (mounted && _isInitialized) {
                          _capturePhoto();
                        }
                      });
                    },
                  )
                : null,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCapturing = false;
        });
      }
    }
  }

  Future<void> _switchCamera() async {
    if (!_isInitialized || _cameraService == null) return;

    try {
      final success = await _cameraService!.switchCamera();
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Tidak dapat mengganti kamera'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      _logger.e('Error switching camera', error: e);
    }
  }

  Future<void> _toggleFlash() async {
    if (!_isInitialized || _cameraService == null) return;

    try {
      final newFlashMode = await _cameraService!.toggleFlash();
      if (newFlashMode != null) {
        setState(() {
          _currentFlashMode = newFlashMode;
        });
      }
    } catch (e) {
      _logger.e('Error toggling flash', error: e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Camera preview or error message
            if (_errorMessage.isNotEmpty)
              _buildErrorScreen()
            else if (!_isInitialized)
              _buildLoadingScreen()
            else
              _buildCameraPreview(),

            // Top controls
            _buildTopControls(),

            // Bottom controls
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Center(
      child: Container(
        margin: EdgeInsets.all(20),
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.red[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red[200]!),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.camera_alt_outlined,
              size: 64,
              color: Colors.red[400],
            ),
            SizedBox(height: 16),
            Text(
              'Kamera Tidak Tersedia',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.red[700],
              ),
            ),
            SizedBox(height: 8),
            Text(
              _errorMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.red[600],
              ),
            ),
            SizedBox(height: 20),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton(
                  onPressed: () {
                    if (widget.onCancel != null) {
                      widget.onCancel!();
                    }
                    Navigator.of(context).pop(null);
                  },
                  child: Text('Batal'),
                ),
                SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: _initializeCamera,
                  icon: Icon(Icons.refresh),
                  label: Text('Coba Lagi'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Center(
      child: Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey[900]!.withOpacity(0.8),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
            SizedBox(height: 16),
            Text(
              'Memuat Kamera...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraPreview() {
    final controller = _cameraService?.controller;
    if (controller == null || !controller.value.isInitialized) {
      return _buildLoadingScreen();
    }

    return CameraPreview(controller);
  }

  Widget _buildTopControls() {
    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Close button
          Container(
            decoration: BoxDecoration(
              color: Colors.black54,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: Icon(Icons.close, color: Colors.white),
              onPressed: () {
                if (widget.onCancel != null) {
                  widget.onCancel!();
                }
                Navigator.of(context).pop(null);
              },
            ),
          ),

          // Vehicle info
          Container(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.directions_car, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text(
                  widget.vehiclePlate,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          // Flash toggle
          if (_isInitialized)
            Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  _getFlashIcon(_currentFlashMode),
                  color: Colors.white,
                ),
                onPressed: _toggleFlash,
              ),
            )
          else
            SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildBottomControls() {
    return Positioned(
      bottom: 32,
      left: 16,
      right: 16,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Switch camera button
          if (_isInitialized)
            Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(Icons.cameraswitch, color: Colors.white),
                iconSize: 32,
                onPressed: _switchCamera,
              ),
            )
          else
            SizedBox(width: 64),

          // Capture button
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.grey[300]!,
                width: 4,
              ),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(40),
                onTap: _isInitialized && !_isCapturing ? _capturePhoto : null,
                child: Center(
                  child: _isCapturing
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.blue),
                          ),
                        )
                      : Icon(
                          Icons.camera_alt,
                          size: 32,
                          color: _isInitialized ? Colors.blue : Colors.grey,
                        ),
                ),
              ),
            ),
          ),

          // Gallery/preview button (placeholder)
          Container(
            decoration: BoxDecoration(
              color: Colors.black54,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: Icon(Icons.photo_library, color: Colors.white),
              iconSize: 32,
              onPressed: () {
                // TODO: Implement photo gallery/preview
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content:
                        Text('Gallery akan tersedia dalam update mendatang'),
                    backgroundColor: Colors.orange,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showCapturedPhotoPreview(GateCheckPhoto photo) async {
    try {
      final screenHeight = MediaQuery.of(context).size.height;
      final screenWidth = MediaQuery.of(context).size.width;

      // Show captured photo preview dialog
      final result = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: EdgeInsets.all(10),
          child: Container(
            width: screenWidth - 20,
            height: screenHeight * 0.8,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                // Photo preview - flexible height
                Expanded(
                  flex: 7,
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(12)),
                    ),
                    child: ClipRRect(
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(12)),
                      child: Image.file(
                        File(photo.filePath),
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey[300],
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.error, size: 48, color: Colors.grey),
                                SizedBox(height: 8),
                                Text('Gagal memuat foto'),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),

                // Info and actions - fixed height
                Container(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Foto Kendaraan ${widget.vehiclePlate}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Ukuran: ${(File(photo.filePath).lengthSync() / 1024).toStringAsFixed(1)} KB',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                      SizedBox(height: 12),

                      // Action buttons
                      Row(
                        children: [
                          Expanded(
                            child: TextButton(
                              onPressed: () => Navigator.of(context).pop(false),
                              child: Text('AMBIL ULANG'),
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.orange,
                                padding: EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => Navigator.of(context).pop(true),
                              child: Text('GUNAKAN FOTO'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green,
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      if (result == true) {
        // User confirmed - use the photo
        _logger.i('Photo confirmed by user');

        // Show success feedback
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('Foto kendaraan berhasil disimpan'),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Call callback and navigate back with result
        widget.onPhotoTaken(photo);
        if (mounted) {
          Navigator.of(context).pop(photo);
        }
      } else {
        // User wants to retake - reset capture state and delete failed photo
        _logger.i('User chose to retake photo');

        // Delete the captured file
        try {
          final file = File(photo.filePath);
          if (await file.exists()) {
            await file.delete();
            _logger.d('Deleted unwanted photo file: ${photo.filePath}');
          }
        } catch (e) {
          _logger.w('Could not delete photo file: $e');
        }

        // Reset capture state - user can take another photo
        if (mounted) {
          setState(() {
            _isCapturing = false;
          });
        }
      }
    } catch (e) {
      _logger.e('Error showing photo preview', error: e);

      // Fallback - just use the photo if preview fails
      widget.onPhotoTaken(photo);
      if (mounted) {
        Navigator.of(context).pop(photo);
      }
    }
  }

  IconData _getFlashIcon(FlashMode flashMode) {
    switch (flashMode) {
      case FlashMode.off:
        return Icons.flash_off;
      case FlashMode.auto:
        return Icons.flash_auto;
      case FlashMode.always:
        return Icons.flash_on;
      case FlashMode.torch:
        return Icons.flashlight_on;
      default:
        return Icons.flash_auto;
    }
  }
}
