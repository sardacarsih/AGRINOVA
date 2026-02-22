// Gen Z Dashboard Tab - Organism Component
// Complete dashboard with welcome, stats, and activity sections
// REDESIGNED with Glassmorphism + Neon Glow styling

import 'dart:ui';
import 'package:flutter/material.dart';
import 'genz_tab_container.dart';
import '../../../../../../../shared/widgets/current_user_avatar.dart';

/// Complete Gen Z styled dashboard tab with Glassmorphism + Neon effects
class GenZDashboardTab extends StatelessWidget {
  final String userName;
  final String userRole;
  final String? companyName;
  final String shiftInfo;
  final int totalEntry;
  final int totalExit;
  final int totalRecords;
  final int syncedRecords;
  final int pendingRecords;
  final List<ActivityData> recentActivities;
  final VoidCallback? onRefresh;
  final VoidCallback? onViewAllHistory;
  final bool isLoading;

  const GenZDashboardTab({
    super.key,
    required this.userName,
    required this.userRole,
    this.companyName,
    required this.shiftInfo,
    required this.totalEntry,
    required this.totalExit,
    this.totalRecords = 0,
    this.syncedRecords = 0,
    this.pendingRecords = 0,
    required this.recentActivities,
    this.onRefresh,
    this.onViewAllHistory,
    this.isLoading = false,
  });

  // Neon colors
  static const Color neonPurple = Color(0xFF8B5CF6);
  static const Color neonGreen = Color(0xFF10B981);
  static const Color neonRed = Color(0xFFEF4444);
  static const Color neonBlue = Color(0xFF3B82F6);

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return GenZTabContainer(
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const CircularProgressIndicator(color: neonPurple),
          ),
        ),
      );
    }

    return GenZScrollableTab(
      children: [
        _buildWelcomeCard(),
        const SizedBox(height: 28),
        _buildStatsSection(),
        const SizedBox(height: 28),
        _buildSyncStatsSection(),
        const SizedBox(height: 28),
        _buildActivitySection(),
      ],
    );
  }

  /// Glassmorphism welcome card with purple neon glow
  Widget _buildWelcomeCard() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          // Purple neon glow
          BoxShadow(
            color: neonPurple.withValues(alpha: 0.4),
            blurRadius: 30,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF7C3AED).withValues(alpha: 0.9),
                  const Color(0xFF6D28D9).withValues(alpha: 0.85),
                  const Color(0xFF5B21B6).withValues(alpha: 0.8),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.2),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon and Welcome text row
                Row(
                  children: [
                    // Dashboard icon with glassmorphism
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.3),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const CurrentUserAvatar(
                        size: 56,
                        shape: BoxShape.rectangle,
                        borderRadius: BorderRadius.all(Radius.circular(16)),
                      ),
                    ),
                    const SizedBox(width: 18),
                    // Welcome text
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Selamat Datang',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _displayUserName(userName),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                _buildRoleHeroCard(),

                const SizedBox(height: 14),

                // Info badges row with glassmorphism
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _buildGlassBadge(
                      icon: Icons.door_front_door_rounded,
                      label: 'Pos: $shiftInfo',
                      glowColor: neonBlue,
                    ),
                    if (companyName != null)
                      _buildGlassBadge(
                        icon: Icons.business_rounded,
                        label: companyName!,
                        glowColor: neonGreen,
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

  Widget _buildRoleHeroCard() {
    final roleName = _getRoleDisplayName(userRole).toUpperCase();
    final bool isSatpamRole = userRole.toLowerCase() == 'satpam';
    final roleDescription =
        isSatpamRole ? 'Petugas Keamanan Pos Aktif' : 'Role Operasional Aktif';
    final Color roleAccent =
        isSatpamRole ? const Color(0xFF22D3EE) : const Color(0xFFE879F9);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            roleAccent.withValues(alpha: 0.28),
            roleAccent.withValues(alpha: 0.12),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: roleAccent.withValues(alpha: 0.55),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: roleAccent.withValues(alpha: 0.35),
            blurRadius: 16,
            spreadRadius: -2,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: roleAccent.withValues(alpha: 0.45)),
            ),
            child: Icon(
              isSatpamRole ? Icons.verified_user_rounded : Icons.badge_rounded,
              color: roleAccent,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ROLE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: roleAccent,
                    letterSpacing: 1.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  roleName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  roleDescription,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.82),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Glassmorphism badge with subtle glow
  Widget _buildGlassBadge({
    required IconData icon,
    required String label,
    required Color glowColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.25),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: 0.2),
            blurRadius: 8,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: glowColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// Stats section with neon glowing cards
  Widget _buildStatsSection() {
    final total = totalEntry + totalExit;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.today_rounded, color: neonPurple, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Statistik Hari Ini',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            // Total card - Frosted glass
            Expanded(
              child: _buildGlassStatCard(
                label: 'Total:',
                value: total.toString(),
                glowColor: neonPurple,
                icon: Icons.summarize_rounded,
                isNeutral: true,
              ),
            ),
            const SizedBox(width: 12),
            // Masuk card - Green neon glow
            Expanded(
              child: _buildGlassStatCard(
                label: 'Masuk:',
                value: totalEntry.toString(),
                glowColor: neonGreen,
                icon: Icons.arrow_upward_rounded,
              ),
            ),
            const SizedBox(width: 12),
            // Keluar card - Red neon glow
            Expanded(
              child: _buildGlassStatCard(
                label: 'Keluar:',
                value: totalExit.toString(),
                glowColor: neonRed,
                icon: Icons.arrow_downward_rounded,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Sync statistics section with glassmorphism styling
  Widget _buildSyncStatsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.sync_rounded, color: neonBlue, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Status Sync',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            // Total Records
            Expanded(
              child: _buildGlassStatCard(
                label: 'Total:',
                value: totalRecords.toString(),
                glowColor: neonBlue,
                icon: Icons.storage_rounded,
              ),
            ),
            const SizedBox(width: 12),
            // Synced Records
            Expanded(
              child: _buildGlassStatCard(
                label: 'Synced:',
                value: syncedRecords.toString(),
                glowColor: neonGreen,
                icon: Icons.cloud_done_rounded,
              ),
            ),
            const SizedBox(width: 12),
            // Pending Records
            Expanded(
              child: _buildGlassStatCard(
                label: 'Pending:',
                value: pendingRecords.toString(),
                glowColor: const Color(0xFFF59E0B), // Always yellow/amber
                icon: Icons.cloud_upload_rounded,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Glassmorphism stat card with neon glow
  Widget _buildGlassStatCard({
    required String label,
    required String value,
    required Color glowColor,
    IconData? icon,
    bool isNeutral = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: isNeutral ? 0.15 : 0.35),
            blurRadius: 20,
            spreadRadius: -3,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isNeutral
                    ? [
                        const Color(0xFF1F2937).withValues(alpha: 0.9),
                        const Color(0xFF374151).withValues(alpha: 0.7),
                      ]
                    : [
                        glowColor.withValues(alpha: 0.25),
                        glowColor.withValues(alpha: 0.1),
                      ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isNeutral
                    ? Colors.white.withValues(alpha: 0.1)
                    : glowColor.withValues(alpha: 0.4),
                width: 1.5,
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                    if (icon != null) ...[
                      const SizedBox(width: 4),
                      Icon(icon, size: 16, color: glowColor),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: isNeutral ? Colors.white : glowColor,
                    shadows: isNeutral
                        ? null
                        : [
                            Shadow(
                              color: glowColor.withValues(alpha: 0.5),
                              blurRadius: 10,
                            ),
                          ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Activity section with glassmorphism list items
  Widget _buildActivitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Aktivitas Terbaru',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.3,
              ),
            ),
            if (onViewAllHistory != null)
              GestureDetector(
                onTap: onViewAllHistory,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: neonPurple.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: neonPurple.withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Text(
                    'Lihat Semua',
                    style: TextStyle(
                      fontSize: 12,
                      color: neonPurple,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 18),
        if (recentActivities.isEmpty)
          _buildEmptyActivity()
        else
          Column(
            children: recentActivities.take(5).map((activity) {
              return _buildGlassActivityItem(activity);
            }).toList(),
          ),
      ],
    );
  }

  /// Glassmorphism activity item with neon accent
  Widget _buildGlassActivityItem(ActivityData activity) {
    final isEntry = activity.isEntry;
    final accentColor = isEntry ? neonGreen : neonRed;
    final arrowIcon =
        isEntry ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.1),
            blurRadius: 15,
            spreadRadius: -5,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  const Color(0xFF1F2937).withValues(alpha: 0.9),
                  const Color(0xFF1F2937).withValues(alpha: 0.7),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
            child: Row(
              children: [
                // Direction arrow with neon glow
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: accentColor.withValues(alpha: 0.3),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: accentColor.withValues(alpha: 0.3),
                        blurRadius: 12,
                        spreadRadius: -4,
                      ),
                    ],
                  ),
                  child: Icon(
                    arrowIcon,
                    color: accentColor,
                    size: 24,
                  ),
                ),

                const SizedBox(width: 16),

                // Vehicle plate and destination
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activity.plate,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            activity.destination ??
                                (isEntry
                                    ? 'Pengiriman TBS'
                                    : 'Keluar Kendaraan'),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withValues(alpha: 0.5),
                            ),
                          ),
                          if (activity.registrationSource != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: (activity.registrationSource == 'QR_SCAN'
                                        ? neonBlue
                                        : Colors.orange)
                                    .withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color:
                                      (activity.registrationSource == 'QR_SCAN'
                                              ? neonBlue
                                              : Colors.orange)
                                          .withValues(alpha: 0.4),
                                  width: 0.5,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    activity.registrationSource == 'QR_SCAN'
                                        ? Icons.qr_code_2_rounded
                                        : Icons.edit_note_rounded,
                                    size: 10,
                                    color:
                                        activity.registrationSource == 'QR_SCAN'
                                            ? neonBlue
                                            : Colors.orange[300],
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    activity.registrationSource == 'QR_SCAN'
                                        ? 'QR'
                                        : 'MANUAL',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: activity.registrationSource ==
                                              'QR_SCAN'
                                          ? neonBlue
                                          : Colors.orange[300],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Driver name
                Text(
                  activity.driver,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                ),

                const SizedBox(width: 16),

                // Time with subtle glow
                Text(
                  activity.time,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    shadows: [
                      Shadow(
                        color: Colors.white.withValues(alpha: 0.3),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyActivity() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          padding: const EdgeInsets.all(48),
          decoration: BoxDecoration(
            color: const Color(0xFF1F2937).withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Icons.inbox_rounded,
                  size: 56,
                  color: Colors.white.withValues(alpha: 0.3),
                ),
                const SizedBox(height: 16),
                Text(
                  'Belum ada aktivitas hari ini',
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.white.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getRoleDisplayName(String role) {
    switch (role.toLowerCase()) {
      case 'satpam':
        return 'Satpam';
      case 'mandor':
        return 'Mandor';
      case 'asisten':
        return 'Asisten';
      case 'manager':
        return 'Manager';
      case 'area_manager':
        return 'Area Manager';
      case 'company_admin':
        return 'Company Admin';
      case 'super_admin':
        return 'Super Admin';
      default:
        return role
            .split('_')
            .where((part) => part.isNotEmpty)
            .map((part) =>
                '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}')
            .join(' ');
    }
  }

  String _displayUserName(String value) {
    final normalized = value.trim();
    return normalized.isEmpty ? 'Pengguna' : normalized;
  }
}

/// Data class for activity items
class ActivityData {
  final String plate;
  final String driver;
  final String time;
  final String? destination;
  final bool isEntry;
  final String? registrationSource;

  const ActivityData({
    required this.plate,
    required this.driver,
    required this.time,
    this.destination,
    required this.isEntry,
    this.registrationSource,
  });
}

