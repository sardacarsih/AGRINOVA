import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:agrinova_mobile/features/gate_check/presentation/pages/satpam_dashboard/satpam_dashboard_helpers.dart';
import 'package:agrinova_mobile/core/services/pos_settings_service.dart';
// import logger

import '../../../data/models/gate_check_models.dart';

/// Collection of dialog widgets for Satpam Dashboard
class SatpamDashboardDialogs {
  /// Show QR Generation Dialog with generated QR Code
  static Future<void> showQRGenerationDialog(
    BuildContext context, {
    required String qrData,
    required String guestName,
    required String vehiclePlate,
    required String purpose,
    required String cargoType,
    required String generationIntent,
    Map<String, dynamic>? metadata,
  }) async {
    final GlobalKey qrKey = GlobalKey();

    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              generationIntent == 'ENTRY' ? Icons.login : Icons.logout,
              color: generationIntent == 'ENTRY' ? Colors.green : Colors.orange,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'QR Code ${generationIntent == 'ENTRY' ? 'Masuk' : 'Keluar'}',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Guest Information
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Column(
                    children: [
                      _buildInfoRow('Nama Tamu', guestName),
                      _buildInfoRow('No. Kendaraan', vehiclePlate),
                      _buildInfoRow('Tujuan', purpose),
                      _buildInfoRow('Jenis Muatan', cargoType),
                      _buildInfoRow('Intent', generationIntent),
                      if (metadata?['expires_at'] != null)
                        _buildInfoRow(
                          'Berlaku Hingga',
                          DateTime.parse(
                            metadata!['expires_at'],
                          ).toString().substring(0, 16),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // QR Code
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.withValues(alpha: 0.1),
                        spreadRadius: 1,
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: RepaintBoundary(
                    key: qrKey,
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 250.0,
                      errorCorrectionLevel: QrErrorCorrectLevel.M,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),

                const SizedBox(height: 8),
                Text(
                  'Scan QR Code untuk verifikasi ${generationIntent == 'ENTRY' ? 'keluar' : 'masuk'}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 16),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Share button
                    ElevatedButton.icon(
                      onPressed: () async {
                        try {
                          await _shareQRCodeImage(
                            context,
                            qrKey,
                            guestName,
                            vehiclePlate,
                          );
                        } catch (e) {
                          if (context.mounted) {
                            SatpamDashboardHelpers.showSnackBar(
                              context,
                              'Error sharing QR: $e',
                              isError: true,
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.share, size: 16),
                      label: const Text('Bagikan'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                    ),

                    // Print data button
                    ElevatedButton.icon(
                      onPressed: () async {
                        await _printQRCodeFromDetails(
                          context,
                          qrData,
                          guestName,
                          vehiclePlate,
                          purpose,
                          generationIntent,
                          metadata,
                        );
                      },
                      icon: const Icon(Icons.print, size: 16),
                      label: const Text('Cetak'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  /// Share QR Code as image (simplified version)
  static Future<void> _shareQRCodeImage(
    BuildContext context,
    GlobalKey qrKey,
    String guestName,
    String vehiclePlate,
  ) async {
    try {
      // Capture QR code as image
      RenderRepaintBoundary boundary =
          qrKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      ByteData? byteData = await image.toByteData(
        format: ui.ImageByteFormat.png,
      );
      Uint8List pngBytes = byteData!.buffer.asUint8List();

      // Save to temporary file
      final directory = await getTemporaryDirectory();
      final file = File(
        '${directory.path}/guest_qr_${DateTime.now().millisecondsSinceEpoch}.png',
      );
      await file.writeAsBytes(pngBytes);

      // Share the file
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'QR Code Tamu - $guestName ($vehiclePlate)',
        ),
      );

      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'QR Code berhasil dibagikan',
        );
      }
    } catch (e) {
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error sharing QR Code: $e',
          isError: true,
        );
      }
    }
  }

  /// Show sync status dialog with simplified modern design
  static void showSyncDialog({
    required BuildContext context,
    required Map<String, dynamic> repositoryStats,
    required Future<void> Function() onManualSync,
    required Future<void> Function() onDatabaseHealth,
  }) {
    // Calculate stats
    final totalGuest = (repositoryStats['total_gate_guest_logs'] as int?) ?? 0;
    final totalEmployee = (repositoryStats['total_employee_logs'] as int?) ?? 0;
    final totalRecords = totalGuest + totalEmployee;
    final pendingSync = (repositoryStats['pending_sync'] as int?) ?? 0;
    final syncedRecords = totalRecords - pendingSync;
    final isOnline = repositoryStats['is_online'] == true;
    final isSyncing = repositoryStats['is_syncing'] == true;
    final lastSync = repositoryStats['last_sync'] as DateTime?;

    // Colors
    const darkBg = Color(0xFF1F2937);
    const cardBg = Color(0xFF374151);
    const neonPurple = Color(0xFF8B5CF6);
    const neonGreen = Color(0xFF10B981);
    const neonOrange = Color(0xFFF59E0B);
    const neonBlue = Color(0xFF3B82F6);

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          width: 340,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: darkBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            boxShadow: [
              BoxShadow(
                color: neonPurple.withValues(alpha: 0.2),
                blurRadius: 30,
                spreadRadius: -5,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: neonPurple.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.sync_rounded,
                      color: neonPurple,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Text(
                      'Status Sync',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  // Connection status indicator
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: (isOnline ? neonGreen : Colors.red).withValues(
                        alpha: 0.15,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: (isOnline ? neonGreen : Colors.red).withValues(
                          alpha: 0.3,
                        ),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isOnline
                              ? Icons.wifi_rounded
                              : Icons.wifi_off_rounded,
                          color: isOnline ? neonGreen : Colors.red,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isOnline ? 'Online' : 'Offline',
                          style: TextStyle(
                            color: isOnline ? neonGreen : Colors.red,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 28),

              // Stats Grid - 3 cards in a row
              Row(
                children: [
                  _buildMiniStatCard(
                    label: 'Total',
                    value: totalRecords.toString(),
                    icon: Icons.storage_rounded,
                    color: neonBlue,
                  ),
                  const SizedBox(width: 12),
                  _buildMiniStatCard(
                    label: 'Synced',
                    value: syncedRecords.toString(),
                    icon: Icons.cloud_done_rounded,
                    color: neonGreen,
                  ),
                  const SizedBox(width: 12),
                  _buildMiniStatCard(
                    label: 'Pending',
                    value: pendingSync.toString(),
                    icon: Icons.cloud_upload_rounded,
                    color: pendingSync > 0 ? neonOrange : neonGreen,
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Last sync info
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardBg.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.history_rounded,
                      color: Colors.white.withValues(alpha: 0.6),
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Sync Terakhir',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.6),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatLastSyncTime(lastSync),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Database size
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Database',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${repositoryStats['database_storage']?['size_mb'] ?? '0.00'} MB',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Error message if any
              if (repositoryStats['error_message'] != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.red.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        color: Colors.red,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          repositoryStats['error_message'].toString(),
                          style: const TextStyle(
                            color: Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white.withValues(alpha: 0.7),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Tutup'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: isSyncing
                          ? null
                          : () async {
                              Navigator.pop(context);
                              await onManualSync();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: neonPurple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isSyncing)
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(
                                  Colors.white,
                                ),
                              ),
                            )
                          else
                            const Icon(Icons.sync_rounded, size: 18),
                          const SizedBox(width: 8),
                          Text(isSyncing ? 'Syncing...' : 'Sync Now'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build mini stat card for sync dialog
  static Widget _buildMiniStatCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 24,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Format last sync time (overloaded for DateTime)
  static String _formatLastSyncTime(DateTime? lastSyncTime) {
    if (lastSyncTime == null) return 'Belum pernah sync';
    final Duration diff = DateTime.now().difference(lastSyncTime);
    if (diff.inSeconds < 60) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    return '${diff.inDays} hari lalu';
  }

  /// Show gate info dialog with actual POS settings
  static void showPOSSettingsDialog(BuildContext context) async {
    final settings = await POSSettingsService.getSettings();
    if (!context.mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.location_on, color: Colors.blue),
            SizedBox(width: 8),
            Text('Informasi Gerbang'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Gate ID: ${settings.posNumber}'),
            const SizedBox(height: 8),
            Text('Nama: ${settings.posName}'),
            const SizedBox(height: 8),
            const Text('Status: Aktif'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  /// Show QR code dialog with actual QR code and print functionality
  static void showQRCodeDialog({
    required BuildContext context,
    required String qrData,
    required GateCheckFormData formData,
    required String generationIntent, // NEW: Generation intent parameter
    String? companyName,
  }) {
    final GlobalKey qrKey = GlobalKey();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.qr_code, color: Colors.blue),
            SizedBox(width: 8),
            Text('QR Code Tamu'),
          ],
        ),
        content: SizedBox(
          width: 320,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Actual QR Code
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.withValues(alpha: 0.1),
                        spreadRadius: 1,
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: RepaintBoundary(
                    key: qrKey,
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 200.0,
                      backgroundColor: Colors.white,
                      errorCorrectionLevel: QrErrorCorrectLevel.M,
                      embeddedImage: null, // Could add logo here
                      embeddedImageStyle: const QrEmbeddedImageStyle(
                        size: Size(40, 40),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // QR Code Info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: Colors.blue[700],
                            size: 16,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              generationIntent == 'ENTRY'
                                  ? 'QR Code untuk akses tamu - valid untuk KELUAR saja'
                                  : 'QR Code untuk akses tamu - valid untuk MASUK saja',
                              style: TextStyle(
                                color: Colors.blue[700],
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            color: Colors.blue[600],
                            size: 14,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Berlaku hari ini',
                            style: TextStyle(
                              color: Colors.blue[600],
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Guest info card
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Informasi Tamu',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          'Nama',
                          formData.guestName ??
                              (formData.driverName.isNotEmpty
                                  ? formData.driverName
                                  : 'N/A'),
                        ),
                        _buildInfoRow(
                          'Perusahaan',
                          formData.guestCompany ?? 'N/A',
                        ),
                        _buildInfoRow(
                          'No. Plat',
                          formData.vehiclePlate.isNotEmpty
                              ? formData.vehiclePlate
                              : 'N/A',
                        ),
                        _buildInfoRow(
                          'Tujuan',
                          formData.purposeOfVisit ??
                              (formData.destination.isNotEmpty
                                  ? formData.destination
                                  : 'N/A'),
                        ),
                        _buildInfoRow(
                          'Jenis Kendaraan',
                          formData.vehicleType.isNotEmpty
                              ? formData.vehicleType
                              : 'N/A',
                        ),
                        if (formData.loadType.isNotEmpty)
                          _buildInfoRow('Jenis Muatan', formData.loadType),
                        if (formData.loadVolume.isNotEmpty)
                          _buildInfoRow('Volume Muatan', formData.loadVolume),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
          ElevatedButton.icon(
            onPressed: () => _shareQRCode(context, qrKey, formData),
            icon: const Icon(Icons.share),
            label: const Text('Share'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
          ElevatedButton.icon(
            onPressed: () =>
                _printQRCode(context, qrData, formData, generationIntent),
            icon: const Icon(Icons.print),
            label: const Text('Cetak'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// Show vehicle details dialog
  static void showVehicleDetailsDialog({
    required BuildContext context,
    required String vehiclePlate,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.local_shipping, color: Colors.blue),
            const SizedBox(width: 8),
            Text('Detail Kendaraan $vehiclePlate'),
          ],
        ),
        content: const SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Detail kendaraan akan ditampilkan di sini'),
              // Vehicle details would be loaded and displayed here
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  /// Show emergency entry dialog
  static void showEmergencyEntryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.emergency, color: Colors.red),
            SizedBox(width: 8),
            Text('Entry Darurat'),
          ],
        ),
        content: const Text('Fitur entry darurat akan tersedia segera'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Handle emergency entry
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Konfirmasi'),
          ),
        ],
      ),
    );
  }

  /// Show exit processing dialog
  static void showExitProcessingDialog({
    required BuildContext context,
    required String vehiclePlate,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.logout, color: Colors.blue),
            const SizedBox(width: 8),
            Text('Proses Keluar $vehiclePlate'),
          ],
        ),
        content: const Text('Fitur proses keluar akan tersedia segera'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Handle exit processing
            },
            child: const Text('Proses Keluar'),
          ),
        ],
      ),
    );
  }

  /// Build sync status row
  static Widget _buildSyncStatusRow(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Text(
              value,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build service status rows
  // ignore: unused_element
  static List<Widget> _buildServiceStatusRows(
    Map<String, dynamic> repositoryStats,
  ) {
    final serviceStatus =
        repositoryStats['service_status'] as Map<String, dynamic>? ?? {};
    final services = [
      {
        'key': 'database_service',
        'label': 'Database Service',
        'icon': Icons.storage,
      },
      {'key': 'sync_service', 'label': 'Sync Service', 'icon': Icons.sync},
      {'key': 'qr_service', 'label': 'QR Service', 'icon': Icons.qr_code},
      {
        'key': 'connectivity_service',
        'label': 'Connectivity Service',
        'icon': Icons.wifi,
      },
      {
        'key': 'jwt_storage_service',
        'label': 'JWT Storage Service',
        'icon': Icons.security,
      },
    ];

    return services.map((service) {
      final isAvailable = serviceStatus[service['key']] ?? false;
      return _buildSyncStatusRow(
        (service['label'] as String?) ?? 'Unknown Service',
        isAvailable ? 'Available' : 'Unavailable',
        service['icon'] as IconData,
        isAvailable ? Colors.green : Colors.red,
      );
    }).toList();
  }

  /// Get health status color
  // ignore: unused_element
  static Color _getHealthStatusColor(String? status) {
    switch (status) {
      case 'healthy':
        return Colors.green;
      case 'warning':
        return Colors.orange;
      case 'error':
        return Colors.red;
      case 'unavailable':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  /// Build info row for QR dialog
  static Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  /// Share QR Code as image
  static Future<void> _shareQRCode(
    BuildContext context,
    GlobalKey qrKey,
    GateCheckFormData formData,
  ) async {
    try {
      // Capture QR code as image
      RenderRepaintBoundary boundary =
          qrKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      ByteData? byteData = await image.toByteData(
        format: ui.ImageByteFormat.png,
      );
      Uint8List pngBytes = byteData!.buffer.asUint8List();

      // Save to temporary file
      final directory = await getTemporaryDirectory();
      final file = File(
        '${directory.path}/guest_qr_${DateTime.now().millisecondsSinceEpoch}.png',
      );
      await file.writeAsBytes(pngBytes);

      // Share the file
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text:
              'QR Code Tamu - '
              '${formData.guestName ?? (formData.driverName.isNotEmpty ? formData.driverName : 'Guest')} '
              '(${formData.vehiclePlate.isNotEmpty ? formData.vehiclePlate : 'N/A'})',
        ),
      );
      if (!context.mounted) return;

      SatpamDashboardHelpers.showSnackBar(
        context,
        'QR Code berhasil dibagikan',
      );
    } catch (e) {
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error membagikan QR Code: $e',
          isError: true,
        );
      }
    }
  }

  /// Print QR Code as PDF (Alternative implementation without PDF dependency)
  static Future<void> _printQRCode(
    BuildContext context,
    String qrData,
    GateCheckFormData formData,
    String? generationIntent,
  ) async {
    try {
      // Create PDF document
      final pdf = pw.Document();

      // Generate QR code image for PDF
      final qrImage = await QrPainter(
        data: qrData,
        version: QrVersions.auto,
        errorCorrectionLevel: QrErrorCorrectLevel.M,
        gapless: false,
      ).toImage(300);

      final qrImageData = await qrImage.toByteData(
        format: ui.ImageByteFormat.png,
      );
      final qrPngBytes = qrImageData!.buffer.asUint8List();

      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.roll80,
          build: (pw.Context context) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text(
                  'AGRINOVA',
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                pw.Text('Gate Pass', style: const pw.TextStyle(fontSize: 10)),
                pw.Divider(),
                pw.Image(pw.MemoryImage(qrPngBytes), width: 150, height: 150),
                pw.SizedBox(height: 10),
                _buildPdfInfoRow(
                  'Nama',
                  formData.guestName ??
                      (formData.driverName.isNotEmpty
                          ? formData.driverName
                          : 'N/A'),
                ),
                _buildPdfInfoRow(
                  'Plat',
                  formData.vehiclePlate.isNotEmpty
                      ? formData.vehiclePlate
                      : 'N/A',
                ),
                _buildPdfInfoRow(
                  'Tujuan',
                  formData.purposeOfVisit ??
                      (formData.destination.isNotEmpty
                          ? formData.destination
                          : 'N/A'),
                ),
                pw.Divider(),
                pw.Text(
                  DateTime.now().toString().substring(0, 16),
                  style: const pw.TextStyle(fontSize: 8),
                ),
              ],
            );
          },
        ),
      );

      // Extract data for printing if needed
      final vehiclePlate = formData.vehiclePlate.isNotEmpty
          ? formData.vehiclePlate
          : 'N/A';

      // Use system print dialog (simplified after multi-POS removal)
      if (context.mounted) {
        await Printing.layoutPdf(
          onLayout: (PdfPageFormat format) async => pdf.save(),
          name:
              'QR_Code_Tamu_${vehiclePlate}_${DateTime.now().millisecondsSinceEpoch}',
        );
        if (context.mounted) {
          SatpamDashboardHelpers.showSnackBar(
            context,
            'QR Code siap untuk dicetak',
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error mencetak QR Code: $e',
          isError: true,
        );
      }
    }
  }

  /// Show alternative printing options when PDF is unavailable
  // ignore: unused_element
  static void _showPrintAlternatives(
    BuildContext context,
    String qrData,
    GateCheckFormData formData,
  ) {
    final GlobalKey qrKey = GlobalKey();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.print, color: Colors.blue),
            SizedBox(width: 8),
            Text('Opsi Cetak QR Code'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // QR Code widget for sharing
                RepaintBoundary(
                  key: qrKey,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    color: Colors.white,
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 200.0,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Fitur cetak PDF sementara tidak tersedia. Silakan gunakan alternatif berikut:',
                  style: TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.share, color: Colors.green),
                  title: const Text('Bagikan QR Code'),
                  subtitle: const Text('Simpan atau kirim gambar QR code'),
                  onTap: () {
                    Navigator.of(context).pop();
                    _shareQRCode(context, qrKey, formData);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.screenshot, color: Colors.orange),
                  title: const Text('Screenshot QR Code'),
                  subtitle: const Text('Ambil screenshot dari layar QR code'),
                  onTap: () {
                    Navigator.of(context).pop();
                    SatpamDashboardHelpers.showSnackBar(
                      context,
                      'Silakan screenshot layar QR Code untuk mencetak',
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  /// Print QR Code from details (for generated dialog)
  static Future<void> _printQRCodeFromDetails(
    BuildContext context,
    String qrData,
    String guestName,
    String vehiclePlate,
    String purpose,
    String generationIntent,
    Map<String, dynamic>? metadata,
  ) async {
    try {
      // Create PDF document
      final pdf = pw.Document();

      // Generate QR code image for PDF
      final qrImage = await QrPainter(
        data: qrData,
        version: QrVersions.auto,
        errorCorrectionLevel: QrErrorCorrectLevel.M,
        gapless: false,
      ).toImage(300);

      final qrImageData = await qrImage.toByteData(
        format: ui.ImageByteFormat.png,
      );
      final qrPngBytes = qrImageData!.buffer.asUint8List();

      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.roll80,
          build: (pw.Context context) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text(
                  'AGRINOVA',
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                pw.Text(
                  'Gate Pass System',
                  style: const pw.TextStyle(fontSize: 10),
                ),
                pw.Divider(),
                pw.Text(
                  generationIntent == 'ENTRY' ? 'MASUK' : 'KELUAR',
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                pw.SizedBox(height: 10),
                pw.Image(pw.MemoryImage(qrPngBytes), width: 150, height: 150),
                pw.SizedBox(height: 10),
                _buildPdfInfoRow('Nama', guestName),
                _buildPdfInfoRow('Plat', vehiclePlate),
                _buildPdfInfoRow('Tujuan', purpose),
                if (metadata?['expires_at'] != null)
                  _buildPdfInfoRow(
                    'Exp',
                    DateTime.parse(
                      metadata!['expires_at'],
                    ).toString().substring(0, 16),
                  ),
                pw.Divider(),
                pw.Text(
                  DateTime.now().toString().substring(0, 16),
                  style: const pw.TextStyle(fontSize: 8),
                ),
              ],
            );
          },
        ),
      );

      // Use system print dialog (simplified after multi-POS removal)
      if (context.mounted) {
        await Printing.layoutPdf(
          onLayout: (PdfPageFormat format) async => pdf.save(),
          name:
              'GatePass_${vehiclePlate}_${DateTime.now().millisecondsSinceEpoch}',
        );
      }
    } catch (e) {
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error mencetak: $e',
          isError: true,
        );
      }
    }
  }

  static pw.Widget _buildPdfInfoRow(String label, String value) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            '$label:',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
          ),
          pw.Expanded(
            child: pw.Text(
              value,
              textAlign: pw.TextAlign.right,
              style: const pw.TextStyle(fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }

  /// Show dialog to select Entry or Exit for employee scan
  static Future<String?> showEmployeeActionDialog(
    BuildContext context,
    String employeeName,
  ) async {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Pilih Jenis Akses'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Karyawan: $employeeName',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text('Silakan pilih akses untuk scan ini:'),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context, 'ENTRY'),
                    icon: const Icon(Icons.login),
                    label: const Text('MASUK'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context, 'EXIT'),
                    icon: const Icon(Icons.logout),
                    label: const Text('KELUAR'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, null), // Cancel
            child: const Text('Batal', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
    );
  }
}
