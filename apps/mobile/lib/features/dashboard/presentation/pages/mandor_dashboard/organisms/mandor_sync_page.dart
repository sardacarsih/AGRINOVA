import 'dart:async';

import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../../../../../../core/di/dependency_injection.dart';
import '../../../../../../core/services/connectivity_service.dart';
import '../../../../../../core/services/mandor_master_sync_service.dart';
import '../../../../../../core/services/harvest_sync_service.dart';
import '../../../../../../core/utils/sync_error_message_helper.dart';
import '../mandor_components.dart';

/// Mandor Sync Page - UI for manual sync trigger
///
/// Features:
/// - Master data sync (employees, blocks) - one-way pull from server
/// - Harvest transaction sync - two-way (push pending, pull approved)
/// - Progress indicators and status feedback
class MandorSyncPage extends StatefulWidget {
  final VoidCallback? onMasterSyncCompleted;
  final bool showAppBar;
  final int refreshSignal;

  const MandorSyncPage({
    super.key,
    this.onMasterSyncCompleted,
    this.showAppBar = true,
    this.refreshSignal = 0,
  });

  @override
  State<MandorSyncPage> createState() => _MandorSyncPageState();
}

class _MandorSyncPageState extends State<MandorSyncPage> {
  final Logger _logger = Logger();

  bool _isSyncingAll = false;
  bool _isSyncingMaster = false;
  bool _isSyncingHarvest = false;
  bool _isPullingUpdates = false;
  bool _isOnline = false;
  bool _isStatusLoading = true;
  int _pendingUploadCount = 0;
  StreamSubscription<NetworkStatus>? _networkStatusSubscription;

  String? _lastMasterSyncResult;
  String? _lastHarvestSyncResult;
  String? _lastPullResult;
  DateTime? _lastSyncTime;

  void _notifySyncCompleted() {
    widget.onMasterSyncCompleted?.call();
  }

  @override
  void initState() {
    super.initState();
    _initializeSyncIndicators();
  }

  @override
  void dispose() {
    _networkStatusSubscription?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant MandorSyncPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshSignal != widget.refreshSignal) {
      unawaited(_refreshSyncIndicators());
    }
  }

  Future<void> _initializeSyncIndicators() async {
    try {
      final connectivityService = sl<ConnectivityService>();
      _isOnline = connectivityService.isOnline;

      _networkStatusSubscription = connectivityService.networkStatusStream
          .listen((status) {
            if (!mounted) return;
            setState(() {
              _isOnline = status == NetworkStatus.online;
            });
          });
    } catch (e) {
      _logger.w('Failed to subscribe connectivity status: $e');
    }

    await _refreshSyncIndicators();
  }

  Future<void> _refreshSyncIndicators() async {
    try {
      final connectivityService = sl<ConnectivityService>();
      final harvestSyncService = sl<HarvestSyncService>();
      final pendingCount = await harvestSyncService.getPendingSyncCount();

      if (!mounted) return;
      setState(() {
        _isOnline = connectivityService.isOnline;
        _pendingUploadCount = pendingCount;
        _isStatusLoading = false;
      });
    } catch (e) {
      _logger.w('Failed to refresh sync indicators: $e');
      if (!mounted) return;
      setState(() {
        _isStatusLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = Container(
      decoration: BoxDecoration(gradient: MandorTheme.darkGradient),
      child: RefreshIndicator(
        onRefresh: _syncAll,
        color: MandorTheme.forestGreen,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sync All Card
              _buildSyncAllCard(),

              const SizedBox(height: 24),

              // Individual Sync Options
              Text('Sinkronisasi Manual', style: MandorTheme.headingSmall),
              const SizedBox(height: 12),

              // Master Data Sync Card
              _buildSyncCard(
                title: 'Data Master',
                subtitle: 'Divisi, Karyawan & Blok dari server',
                icon: Icons.people_outline_rounded,
                color: MandorTheme.skyBlue,
                isLoading: _isSyncingMaster,
                result: _lastMasterSyncResult,
                onSync: _syncMasterData,
              ),

              const SizedBox(height: 12),

              // Harvest Upload Sync Card
              _buildSyncCard(
                title: 'Upload Panen',
                subtitle: 'Kirim data panen ke server',
                icon: Icons.cloud_upload_outlined,
                color: MandorTheme.forestGreen,
                isLoading: _isSyncingHarvest,
                result: _lastHarvestSyncResult,
                onSync: _syncHarvestUpload,
              ),

              const SizedBox(height: 12),

              // Pull Approved Harvests Card
              _buildSyncCard(
                title: 'Update Status Approval',
                subtitle: 'Ambil status approval dari server',
                icon: Icons.cloud_download_outlined,
                color: MandorTheme.amberOrange,
                isLoading: _isPullingUpdates,
                result: _lastPullResult,
                onSync: _pullApprovalUpdates,
              ),

              const SizedBox(height: 24),

              // Last Sync Info
              if (_lastSyncTime != null) _buildLastSyncInfo(),

              const SizedBox(height: 24),

              // Sync Info Card
              _buildInfoCard(),
            ],
          ),
        ),
      ),
    );

    if (!widget.showAppBar) {
      return content;
    }

    return Scaffold(
      backgroundColor: MandorTheme.gray900,
      appBar: AppBar(
        title: const Text(
          'Sinkronisasi Data',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: MandorTheme.darkGreen,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: content,
    );
  }

  Widget _buildSyncAllCard() {
    final connectionColor = _isStatusLoading
        ? MandorTheme.gray500
        : (_isOnline ? MandorTheme.forestGreen : MandorTheme.coralRed);
    final connectionLabel = _isStatusLoading
        ? 'Mengecek koneksi...'
        : (_isOnline ? 'Online' : 'Offline');
    final pendingLabel = _isStatusLoading
        ? 'Menghitung data upload...'
        : 'Menunggu upload: $_pendingUploadCount data';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            MandorTheme.darkGreen,
            MandorTheme.forestGreen.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: MandorTheme.forestGreen.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _isSyncingAll ? null : _syncAll,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: _isSyncingAll
                          ? const Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Icon(
                              Icons.sync_rounded,
                              color: Colors.white,
                              size: 28,
                            ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sinkronkan Semua',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isSyncingAll
                                ? 'Sinkronisasi sedang berjalan...'
                                : 'Sinkronkan data master & transaksi',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: Colors.white.withValues(alpha: 0.6),
                      size: 18,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildStatusChip(
                      icon: _isOnline
                          ? Icons.wifi_rounded
                          : Icons.wifi_off_rounded,
                      label: connectionLabel,
                      color: connectionColor,
                    ),
                    _buildStatusChip(
                      icon: Icons.cloud_upload_rounded,
                      label: pendingLabel,
                      color: MandorTheme.amberOrange,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isLoading,
    required String? result,
    required VoidCallback onSync,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: MandorTheme.gray800,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: result != null
              ? color.withValues(alpha: 0.3)
              : Colors.transparent,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onSync,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: isLoading
                          ? Padding(
                              padding: const EdgeInsets.all(10),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  color,
                                ),
                              ),
                            )
                          : Icon(icon, color: color, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: MandorTheme.bodyLarge.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(subtitle, style: MandorTheme.bodySmall),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Sync',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                if (result != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: MandorTheme.gray700,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          result.contains('berhasil') ||
                                  result.contains('success')
                              ? Icons.check_circle_outline_rounded
                              : Icons.info_outline_rounded,
                          color:
                              result.contains('berhasil') ||
                                  result.contains('success')
                              ? MandorTheme.forestGreen
                              : MandorTheme.amberOrange,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            result,
                            style: MandorTheme.bodySmall.copyWith(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLastSyncInfo() {
    final timeAgo = _getTimeAgo(_lastSyncTime!);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MandorTheme.gray800.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.history_rounded, color: MandorTheme.gray500, size: 18),
          const SizedBox(width: 10),
          Text(
            'Terakhir sync: $timeAgo',
            style: MandorTheme.bodySmall.copyWith(color: MandorTheme.gray400),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MandorTheme.skyBlue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: MandorTheme.skyBlue.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline_rounded,
                color: MandorTheme.skyBlue,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Informasi Sinkronisasi',
                style: MandorTheme.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: MandorTheme.skyBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem('Data Master', 'Diambil dari server ketika online'),
          const SizedBox(height: 6),
          _buildInfoItem('Upload Panen', 'Mengirim data panen lokal ke server'),
          const SizedBox(height: 6),
          _buildInfoItem('Update Status', 'Mengambil status approval terbaru'),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 6,
          height: 6,
          margin: const EdgeInsets.only(top: 6, right: 8),
          decoration: BoxDecoration(
            color: MandorTheme.gray500,
            shape: BoxShape.circle,
          ),
        ),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: MandorTheme.bodySmall,
              children: [
                TextSpan(
                  text: '$title: ',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                TextSpan(text: description),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return 'Baru saja';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} menit lalu';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} jam lalu';
    } else {
      return '${difference.inDays} hari lalu';
    }
  }

  // Sync Methods

  Future<void> _syncAll() async {
    if (_isSyncingAll) return;

    setState(() => _isSyncingAll = true);
    _logger.i('Starting full sync...');

    try {
      // 1. Sync master data
      await _syncMasterData();

      // 2. Upload pending harvests
      await _syncHarvestUpload();

      // 3. Pull approval updates
      await _pullApprovalUpdates();

      final failures = [
        _lastMasterSyncResult,
        _lastHarvestSyncResult,
        _lastPullResult,
      ].whereType<String>().where(_isFailureMessage).toList();

      if (failures.isEmpty) {
        setState(() => _lastSyncTime = DateTime.now());
        _notifySyncCompleted();
        _showSnackBar('Sinkronisasi selesai', isSuccess: true);
      } else {
        _showSnackBar(failures.first, isSuccess: false);
      }
    } catch (e) {
      _logger.e('Full sync error: $e');
      final friendlyMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'sinkronisasi data',
      );
      _showSnackBar(friendlyMessage, isSuccess: false);
    } finally {
      setState(() => _isSyncingAll = false);
      await _refreshSyncIndicators();
    }
  }

  Future<void> _syncMasterData() async {
    if (_isSyncingMaster) return;

    setState(() {
      _isSyncingMaster = true;
      _lastMasterSyncResult = null;
    });

    _logger.i('Syncing master data...');

    try {
      final syncService = sl<MandorMasterSyncService>();
      final result = await syncService.syncAll();

      setState(() {
        _lastMasterSyncResult = result.success
            ? 'Berhasil: ${result.divisionsSynced} divisi, ${result.employeesSynced} karyawan, ${result.blocksSynced} blok tersinkron'
            : result.message;
      });

      if (result.success) {
        _notifySyncCompleted();
        setState(() => _lastSyncTime = DateTime.now());
      }
    } catch (e) {
      _logger.e('Master sync error: $e');
      setState(() {
        _lastMasterSyncResult = SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi data master',
        );
      });
    } finally {
      setState(() => _isSyncingMaster = false);
      await _refreshSyncIndicators();
    }
  }

  Future<void> _syncHarvestUpload() async {
    if (_isSyncingHarvest) return;

    setState(() {
      _isSyncingHarvest = true;
      _lastHarvestSyncResult = null;
    });

    _logger.i('Uploading harvest data...');

    try {
      final harvestSync = sl<HarvestSyncService>();
      final pendingBefore = await harvestSync.getPendingSyncCount();
      await harvestSync.syncNow();
      final pendingAfter = await harvestSync.getPendingSyncCount();
      final failedAfter = await harvestSync.getFailedSyncCount();
      final recentErrors = await harvestSync.getRecentSyncErrorMessages(
        limit: 1,
      );
      final syncedCount = (pendingBefore - pendingAfter).clamp(
        0,
        pendingBefore,
      );

      setState(() {
        if (pendingBefore == 0) {
          _lastHarvestSyncResult = 'Tidak ada data panen yang perlu dikirim';
        } else if (syncedCount > 0 && pendingAfter == 0) {
          _lastHarvestSyncResult =
              'Berhasil: $syncedCount data panen berhasil dikirim ke server';
        } else if (syncedCount > 0) {
          _lastHarvestSyncResult =
              'Sebagian berhasil: $syncedCount data terkirim, '
              '$pendingAfter data masih menunggu upload'
              '${failedAfter > 0 ? ' ($failedAfter gagal).' : '.'}';
        } else if (recentErrors.isNotEmpty) {
          final compactReason = _compactSyncError(recentErrors.first);
          _lastHarvestSyncResult =
              'Upload belum berhasil. Penyebab: $compactReason';
        } else {
          _lastHarvestSyncResult =
              'Sinkronisasi selesai, belum ada data yang berhasil dikirim. '
              'Periksa data panen dan coba lagi.';
        }
        _lastSyncTime = DateTime.now();
      });
      _notifySyncCompleted();
    } catch (e) {
      _logger.e('Harvest upload error: $e');
      setState(() {
        _lastHarvestSyncResult = SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'upload data panen',
        );
      });
    } finally {
      setState(() => _isSyncingHarvest = false);
      await _refreshSyncIndicators();
    }
  }

  String _compactSyncError(String rawError) {
    var value = rawError.trim();
    if (value.isEmpty) {
      return 'alasan tidak tersedia';
    }

    value = value.replaceFirst(
      RegExp(r'^Invalid sync payload:\s*', caseSensitive: false),
      '',
    );
    return value.length <= 140 ? value : '${value.substring(0, 137)}...';
  }

  Future<void> _pullApprovalUpdates() async {
    if (_isPullingUpdates) return;

    setState(() {
      _isPullingUpdates = true;
      _lastPullResult = null;
    });

    _logger.i('Pulling approval updates...');

    try {
      final syncService = sl<HarvestSyncService>();
      final result = await syncService.pullServerUpdatesWithResult();
      final bool hasUnsafe = result.hasUnsafeRecords;
      final String summaryMessage;

      if (result.totalReceived == 0) {
        summaryMessage = 'Tidak ada update status panen baru';
      } else if (!hasUnsafe) {
        summaryMessage =
            'Berhasil: ${result.appliedCount} update status diterapkan';
      } else {
        summaryMessage =
            'Sebagian update diterapkan: ${result.appliedCount} sukses, '
            '${result.skippedCount} tertunda. Silakan sinkron ulang.';
      }

      setState(() {
        _lastPullResult = summaryMessage;
        if (result.appliedCount > 0 || result.cursorAdvanced) {
          _lastSyncTime = DateTime.now();
        }
      });
      if (!hasUnsafe) {
        _notifySyncCompleted();
      }
    } catch (e) {
      _logger.e('Pull updates error: $e');
      setState(() {
        _lastPullResult = SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'pengambilan update status panen',
        );
      });
    } finally {
      setState(() => _isPullingUpdates = false);
      await _refreshSyncIndicators();
    }
  }

  bool _isFailureMessage(String message) {
    final value = message.toLowerCase();
    return value.contains('gagal') ||
        value.contains('tidak dapat') ||
        value.contains('belum berhasil') ||
        value.contains('belum lengkap') ||
        value.contains('error') ||
        value.contains('kendala');
  }

  void _showSnackBar(String message, {required bool isSuccess}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess
                  ? Icons.check_circle_rounded
                  : Icons.error_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isSuccess
            ? MandorTheme.forestGreen
            : MandorTheme.coralRed,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}
