import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'satpam_dashboard_constants.dart';

/// Gen Z Sync Tab - Full Page Sync Dashboard
/// 
/// Replaces the dialog-based sync with a comprehensive dashboard view.
/// Features dark theme, neon accents, and detailed sync statistics.
class GenZSyncTab extends StatelessWidget {
  final Map<String, dynamic> repositoryStats;
  final bool isLoading;
  final Function() onManualSync;

  const GenZSyncTab({
    Key? key,
    required this.repositoryStats,
    required this.isLoading,
    required this.onManualSync,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Colors
    const darkBg = Color(0xFF111827);
    const cardBg = Color(0xFF1F2937);
    const neonPurple = Color(0xFF8B5CF6);
    const neonGreen = Color(0xFF10B981);
    const neonOrange = Color(0xFFF59E0B);
    const neonBlue = Color(0xFF3B82F6);
    const neonRed = Color(0xFFEF4444);

    // Stats
    final totalRecords = ((repositoryStats['total_gate_guest_logs'] as int?) ?? 0) + 
                         ((repositoryStats['total_employee_logs'] as int?) ?? 0);
    final pendingSync = (repositoryStats['pending_sync'] as int?) ?? 0;
    final syncedRecords = totalRecords - pendingSync;
    final isOnline = repositoryStats['is_online'] == true;
    final lastSync = repositoryStats['last_sync'] as DateTime?;
    final lastSyncFormatted = lastSync != null 
        ? DateFormat('dd MMM yyyy, HH:mm').format(lastSync) 
        : 'Belum pernah';
    
    final dbSize = repositoryStats['database_storage']?['size_mb'] ?? '0.00';
    final dbStatus = repositoryStats['database_storage']?['health_status'] ?? 'Unknown';

    return Container(
      color: darkBg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            _buildHeader(context, isOnline, neonGreen, neonRed),
            
            const SizedBox(height: 24),

            // Main Action Card (Manual Sync)
            _buildSyncActionCard(
              context, 
              isLoading, 
              isOnline, 
              pendingSync, 
              lastSyncFormatted,
              neonPurple,
              neonOrange
            ),

            const SizedBox(height: 24),

            // Statistics Grid
            Text(
              'Statistik Database',
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    label: 'Total Record',
                    value: totalRecords.toString(),
                    icon: Icons.storage_rounded,
                    color: neonBlue,
                    cardBg: cardBg,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    label: 'Terupload',
                    value: syncedRecords.toString(),
                    icon: Icons.cloud_done_rounded,
                    color: neonGreen,
                    cardBg: cardBg,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    label: 'Pending',
                    value: pendingSync.toString(),
                    icon: Icons.cloud_upload_rounded,
                    color: pendingSync > 0 ? neonOrange : neonGreen,
                    cardBg: cardBg,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    label: 'Ukuran DB',
                    value: '$dbSize MB',
                    icon: Icons.data_usage_rounded,
                    color: Colors.pinkAccent,
                    cardBg: cardBg,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    label: 'Total Foto',
                    value: (repositoryStats['photo_storage']?['total_files'] ?? 0).toString(),
                    icon: Icons.photo_camera_rounded,
                    color: Colors.cyanAccent,
                    cardBg: cardBg,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    label: 'Foto Pending',
                    value: (repositoryStats['photo_storage']?['pending_files'] ?? 0).toString(),
                    icon: Icons.cloud_upload_rounded,
                    color: (repositoryStats['photo_storage']?['pending_files'] ?? 0) > 0 
                        ? neonOrange 
                        : neonGreen,
                    cardBg: cardBg,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Error Display
            if (repositoryStats['error_message'] != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: neonRed.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: neonRed.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: neonRed),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        repositoryStats['error_message'].toString(),
                        style: const TextStyle(color: neonRed),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isOnline, Color neonGreen, Color neonRed) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Status Sinkronisasi',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Kelola data lokal dan cloud',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 14,
              ),
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: (isOnline ? neonGreen : neonRed).withOpacity(0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: (isOnline ? neonGreen : neonRed).withOpacity(0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                color: isOnline ? neonGreen : neonRed,
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                isOnline ? 'Online' : 'Offline',
                style: TextStyle(
                  color: isOnline ? neonGreen : neonRed,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSyncActionCard(
    BuildContext context, 
    bool isLoading,
    bool isOnline, 
    int pendingSync,
    String lastSyncTime,
    Color neonPurple,
    Color neonOrange,
  ) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            neonPurple.withOpacity(0.2),
            neonPurple.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: neonPurple.withOpacity(0.3),
        ),
        boxShadow: [
          BoxShadow(
            color: neonPurple.withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: -5,
          ),
        ],
      ),
      child: Column(
        children: [
          // Icon & Status Text
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: neonPurple.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.sync_rounded,
                  color: neonPurple,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isLoading ? 'Sedang Sinkronisasi...' : (pendingSync > 0 ? 'Data Belum Tersimpan' : 'Semua Data Tersimpan'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Terakhir sync: $lastSyncTime',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Action Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: isLoading ? null : onManualSync,
              style: ElevatedButton.styleFrom(
                backgroundColor: neonPurple,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : const Text(
                      'Mulai Sinkronisasi Sekarang',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
          
          if (pendingSync > 0) ...[
            const SizedBox(height: 12),
            Text(
              '$pendingSync data menunggu untuk di-upload',
              style: TextStyle(
                color: neonOrange,
                fontSize: 12,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatTile({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
    required Color cardBg,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }


}
