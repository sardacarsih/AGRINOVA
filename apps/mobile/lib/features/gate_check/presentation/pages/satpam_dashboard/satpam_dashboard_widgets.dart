import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../data/models/gate_check_models.dart';
import '../../widgets/guest_registration_form.dart';
import '../../widgets/gate_stat_card_widget.dart';
import 'satpam_dashboard_constants.dart';

/// Reusable UI components for Satpam Dashboard
class SatpamDashboardWidgets {
  /// Build sync status indicator with pending count badge
  static Widget buildSyncStatusIndicator({
    required Map<String, dynamic> repositoryStats,
    required VoidCallback onSyncPressed,
  }) {
    final pendingCount = repositoryStats['pending_sync'] ?? 0;
    
    return Stack(
      children: [
        IconButton(
          icon: const Icon(Icons.sync),
          onPressed: onSyncPressed,
          tooltip: 'Status Sync',
        ),
        if (pendingCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                pendingCount > 99 ? '99+' : pendingCount.toString(),
                style: const TextStyle(color: Colors.white, fontSize: 10),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  /// Build main body with tab view
  static Widget buildBody({
    required TabController tabController,
    required Widget dashboardTab,
    required Widget registrationTab,
    required Widget validationTab,
    required Widget historyTab,
  }) {
    return Expanded(
      child: TabBarView(
        controller: tabController,
        children: [
          dashboardTab,
          registrationTab,
          validationTab,
          historyTab,
        ],
      ),
    );
  }

  /// Build dashboard tab with refresh indicator
  static Widget buildDashboardTab({
    required Future<void> Function() onRefresh,
    required Widget welcomeSection,
    required Widget statsSection,
    required Widget activitySection,
  }) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            welcomeSection,
            const SizedBox(height: 24),
            statsSection,
            const SizedBox(height: 24),
            activitySection,
          ],
        ),
      ),
    );
  }

  /// Build welcome section with gradient background
  static Widget buildWelcomeSection({
    required BuildContext context,
    required Widget shiftInfoCard,
    required bool isOfflineMode,
    String? userName,
    String? userRole,
    String? companyName,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo[600]!, Colors.indigo[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius * 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.security, color: Colors.white, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Greeting text
                    Text(
                      'Selamat datang',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                    if (userName != null) ...[
                      const SizedBox(height: 4),
                      // User's name
                      Text(
                        userName!,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 18,
                        ),
                      ),
                    ],
                    if (userRole != null || companyName != null) ...[
                      const SizedBox(height: 6),
                      // Company and role
                      Text(
                        userRole != null ? 
                          '${companyName ?? 'Agrinova Palm Oil'} (${_getRoleDisplayName(userRole)})' : 
                          'Sistem Pemeriksaan Gerbang Canggih',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: SatpamDashboardConstants.largePadding),
          shiftInfoCard,
          if (isOfflineMode) buildOfflineModeCard(),
        ],
      ),
    );
  }

  /// Build shift info card
  static Widget buildShiftInfoCard({
    required String shiftInfoText,
    required String currentTime,
  }) {
    return Container(
      padding: const EdgeInsets.all(SatpamDashboardConstants.mediumPadding),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.2),
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius),
        border: Border.all(color: Colors.green.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          Icon(Icons.access_time, color: Colors.green[100], size: 20),
          const SizedBox(width: SatpamDashboardConstants.smallPadding),
          Expanded(
            child: Text(
              shiftInfoText,
              style: TextStyle(
                color: Colors.green[100],
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Text(
            currentTime,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  /// Build offline mode warning card
  static Widget buildOfflineModeCard() {
    return Container(
      margin: const EdgeInsets.only(top: SatpamDashboardConstants.smallPadding),
      padding: const EdgeInsets.all(SatpamDashboardConstants.smallPadding),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.2),
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius),
        border: Border.all(color: Colors.orange.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          Icon(Icons.offline_bolt, color: Colors.orange[100], size: 16),
          const SizedBox(width: SatpamDashboardConstants.smallPadding),
          Expanded(
            child: Text(
              'Mode Offline - Data akan di-sync saat terhubung',
              style: TextStyle(
                color: Colors.orange[100],
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build today's statistics section
  static Widget buildTodayStatsSection({
    required BuildContext context,
    required GateCheckStats? todayStats,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Aktivitas Hari Ini',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: SatpamDashboardConstants.mediumPadding),
        LayoutBuilder(
          builder: (context, constraints) {
            return GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.3,
              crossAxisSpacing: SatpamDashboardConstants.mediumPadding,
              mainAxisSpacing: SatpamDashboardConstants.mediumPadding,
              children: [
                GateStatCards.buildVehiclesInsideCard(
                  count: todayStats?.vehiclesInside ?? 0,
                  pendingExit: todayStats?.pendingExit ?? 0,
                ),
                GateStatCards.buildTodayEntriesCard(
                  count: todayStats?.todayEntries ?? 0,
                ),
                GateStatCards.buildTodayExitsCard(
                  count: todayStats?.todayExits ?? 0,
                ),
                GateStatCards.buildComplianceCard(
                  rate: todayStats?.complianceRate ?? 0.0,
                  violations: todayStats?.violationCount ?? 0,
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  /// Build individual stat card
  static Widget buildStatCard({
    required BuildContext context,
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.mediumPadding),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: SatpamDashboardConstants.iconSize),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.start,
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color.withOpacity(0.7),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  /// Build recent activity section
  static Widget buildRecentActivitySection({
    required BuildContext context,
    required VoidCallback onViewAll,
    required Widget activityList,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Aktivitas Terkini',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              child: const Text('Lihat Semua'),
            ),
          ],
        ),
        const SizedBox(height: SatpamDashboardConstants.mediumPadding),
        activityList,
      ],
    );
  }

  /// Build recent activity list with mock data
  static Widget buildRecentActivityList() {
    // Mock recent activity data
    final mockActivity = [
      {
        'plate': 'B 9876 XYZ',
        'action': 'EXIT',
        'time': '10:15',
        'driver': 'Budi Driver',
        'duration': '45 min',
      },
      {
        'plate': 'B 5432 GHI',
        'action': 'ENTRY',
        'time': '09:45',
        'driver': 'Sari Supir',
        'duration': '30 min',
      },
      {
        'plate': 'B 1111 JKL',
        'action': 'EXIT',
        'time': '09:30',
        'driver': 'Ahmad Driver',
        'duration': '1h 15m',
      },
    ];

    return Column(
      children: mockActivity.map((activity) => buildRecentActivityItem(activity)).toList(),
    );
  }

  /// Build individual recent activity item
  static Widget buildRecentActivityItem(Map<String, dynamic> activity) {
    final action = activity['action'] as String;
    final isEntry = action == 'ENTRY';
    final actionColor = isEntry ? Colors.green : Colors.blue;

    return Container(
      margin: const EdgeInsets.only(bottom: SatpamDashboardConstants.smallPadding),
      padding: const EdgeInsets.all(SatpamDashboardConstants.mediumPadding),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(SatpamDashboardConstants.smallPadding),
            decoration: BoxDecoration(
              color: actionColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius),
            ),
            child: Icon(
              isEntry ? Icons.login : Icons.logout,
              color: actionColor,
              size: 20,
            ),
          ),
          const SizedBox(width: SatpamDashboardConstants.mediumPadding),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity['plate'] as String,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${activity['driver']} • ${activity['time']} • ${activity['duration']}',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: SatpamDashboardConstants.smallPadding,
              vertical: 4,
            ),
            decoration: BoxDecoration(
              color: actionColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              action,
              style: TextStyle(
                color: actionColor,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  /// Build registration tab with form and intent selection
  static Widget buildRegistrationTab({
    required Function(String) onVehiclePlateChanged,
    Function(GateCheckFormData)? onFormDataChanged, // Complete form data callback
    required Function(String) onCameraPressed,
    required VoidCallback onQRGeneratePressed,
    required bool isLoading,
    bool isLoadingAction = false, // Loading state for QR generation
    required String? errorMessage,
    required GateCheckFormData initialData,
    required String generationIntent, // Current intent
    required Function(String) onIntentChanged, // Intent change callback
    bool isRegistered = false, // Apakah form sudah ter-register (mode cetak ulang)
    VoidCallback? onRegisterNewPressed, // Callback untuk tombol "Daftar Tamu Baru"
  }) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Intent Selection Card
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Generate QR Code Untuk:',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text('ENTRY (Masuk)'),
                          subtitle: const Text('Scan untuk EXIT'),
                          value: 'ENTRY',
                          groupValue: generationIntent,
                          onChanged: (value) => onIntentChanged(value!),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text('EXIT (Keluar)'),
                          subtitle: const Text('Scan untuk ENTRY'),
                          value: 'EXIT',
                          groupValue: generationIntent,
                          onChanged: (value) => onIntentChanged(value!),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Guest Registration Form
          GuestRegistrationForm(
            onVehiclePlateChanged: onVehiclePlateChanged,
            onFormDataChanged: onFormDataChanged,
            onCameraPressed: onCameraPressed,
            onQRGeneratePressed: onQRGeneratePressed,
            isLoading: isLoading,
            isLoadingAction: isLoadingAction,
            errorMessage: errorMessage,
            initialData: initialData,
            isRegistered: isRegistered,
            onRegisterNewPressed: onRegisterNewPressed,
          ),
        ],
      ),
    );
  }

  /// Build history tab with filters and list
  static Widget buildHistoryTab({
    required BuildContext context,
    required Widget historyFilters,
    required Widget historyList,
  }) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Riwayat Pemeriksaan Gerbang',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(height: 16),
          historyFilters,
          const SizedBox(height: 16),
          historyList,
        ],
      ),
    );
  }

  /// Build history filters section
  static Widget buildHistoryFilters() {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          // Use Column instead of Row to prevent overflow
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: 'Filter berdasarkan Aksi',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              isDense: true,
            ),
            items: ['Semua', 'Masuk', 'Keluar'].map((action) {
              return DropdownMenuItem(
                value: action, 
                child: Text(action, style: const TextStyle(fontSize: 14)),
              );
            }).toList(),
            onChanged: (value) {
              // Handle filter change
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: 'Periode Waktu',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              isDense: true,
            ),
            items: ['Hari Ini', '7 Hari Terakhir', '30 Hari Terakhir'].map((period) {
              return DropdownMenuItem(
                value: period, 
                child: Text(period, style: const TextStyle(fontSize: 14)),
              );
            }).toList(),
            onChanged: (value) {
              // Handle filter change
            },
          ),
        ],
      ),
    );
  }

  /// Build history list with mock data
  static Widget buildHistoryList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      itemBuilder: (context, index) {
        final isEntry = index % 2 == 0;
        return Container(
          margin: const EdgeInsets.only(bottom: SatpamDashboardConstants.mediumPadding),
          padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(SatpamDashboardConstants.mediumPadding),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'B ${1000 + index}0 ABC',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: SatpamDashboardConstants.smallPadding,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: (isEntry ? Colors.green : Colors.blue).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isEntry ? 'MASUK' : 'KELUAR',
                      style: TextStyle(
                        color: isEntry ? Colors.green : Colors.blue,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: SatpamDashboardConstants.smallPadding),
              Text('Sopir: Tamu Driver ${index + 1}'),
              Text('Waktu: ${09 + index}:${30 + index}'),
              const Text('Tujuan: Pengiriman'),
              if (!isEntry)
                Text('Durasi: ${45 + index * 15} menit'),
            ],
          ),
        );
      },
    );
  }

  /// Build bottom navigation bar with dark theme to match GenZ dashboard
  static Widget buildBottomNavigation({
    required int currentIndex,
    required Function(int) onTap,
  }) {
    // GenZ theme colors
    const Color darkBg = Color(0xFF1a1a2e);
    const Color neonPurple = Color(0xFF8B5CF6);
    const Color unselectedColor = Color(0xFF6B7280);
    
    return Container(
      decoration: BoxDecoration(
        color: darkBg,
        boxShadow: [
          BoxShadow(
            color: neonPurple.withOpacity(0.15),
            blurRadius: 20,
            spreadRadius: -5,
            offset: const Offset(0, -5),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: Colors.white.withOpacity(0.08),
            width: 1,
          ),
        ),
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: currentIndex,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: neonPurple,
        unselectedItemColor: unselectedColor,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w400,
          fontSize: 11,
        ),
        items: [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined, color: currentIndex == 0 ? neonPurple : unselectedColor),
            activeIcon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: neonPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.dashboard_rounded, color: neonPurple),
            ),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_add_outlined, color: currentIndex == 1 ? neonPurple : unselectedColor),
            activeIcon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: neonPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.person_add_rounded, color: neonPurple),
            ),
            label: 'Daftar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_outlined, color: currentIndex == 2 ? neonPurple : unselectedColor),
            activeIcon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: neonPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.qr_code_scanner_rounded, color: neonPurple),
            ),
            label: 'Validasi',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_outlined, color: currentIndex == 3 ? neonPurple : unselectedColor),
            activeIcon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: neonPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.history_rounded, color: neonPurple),
            ),
            label: 'Riwayat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sync_outlined, color: currentIndex == 4 ? neonPurple : unselectedColor),
            activeIcon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: neonPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.sync_rounded, color: neonPurple),
            ),
            label: 'Sync',
          ),
        ],
        onTap: onTap,
      ),
    );
  }

  /// Build floating action button - REMOVED as per design update
  static Widget buildFloatingActionButton({
    required int currentTabIndex,
    required VoidCallback onPressed,
  }) {
    // Floating action button removed - registration moved to tab
    return const SizedBox.shrink();
  }

  /// Build sync status row
  static Widget buildSyncStatusRow(String label, String value, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: SatpamDashboardConstants.smallPadding),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  /// Helper method to get user role display name
  static String _getRoleDisplayName(String role) {
    switch (role.toLowerCase()) {
      case 'satpam':
        return 'Security Guard';
      case 'mandor':
        return 'Supervisor';
      case 'asisten':
        return 'Assistant Manager';
      case 'manager':
        return 'Manager';
      case 'area_manager':
        return 'Area Manager';
      case 'company_admin':
        return 'Company Admin';
      case 'super_admin':
        return 'Super Admin';
      default:
        return role.toUpperCase();
    }
  }
}