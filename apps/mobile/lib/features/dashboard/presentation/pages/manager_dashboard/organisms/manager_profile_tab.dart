import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../manager_theme.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../../../core/services/role_service.dart';
import '../../../../../../shared/widgets/auth_listener_wrapper.dart';
import 'package:go_router/go_router.dart';
import 'manager_monitor_tab.dart';
import 'manager_analytics_tab.dart';

/// Organism: Manager Profile Tab
/// Full profile page with user info, settings, and logout
class ManagerProfileTab extends StatelessWidget {
  const ManagerProfileTab({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthAuthenticated) {
            return Scaffold(
              backgroundColor: ManagerTheme.scaffoldBackground, // Light background
              appBar: AppBar(
                title: const Text(
                  'Profil Manager',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                backgroundColor: ManagerTheme.primaryPurple,
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
                centerTitle: true,
              ),
              body: _buildContent(context, state),
              bottomNavigationBar: _buildBottomNavigation(context),
            );
          }
          return _buildLoadingState();
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return Scaffold(
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: AppBar(
        title: const Text('Profil Manager'),
        backgroundColor: ManagerTheme.primaryPurple,
      ),
      body: const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(ManagerTheme.primaryPurple),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AuthAuthenticated state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(ManagerTheme.paddingMedium),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildProfileHeaderCard(state),
          const SizedBox(height: ManagerTheme.paddingLarge), // 24px
          _buildPerformanceStatsCard(),
          const SizedBox(height: ManagerTheme.paddingLarge),
          _buildSectionTitle('Informasi Jabatan'),
          const SizedBox(height: ManagerTheme.paddingSmall),
          _buildInformationSection(state),
          const SizedBox(height: ManagerTheme.paddingLarge),
          _buildSectionTitle('Cakupan Estate'),
          const SizedBox(height: ManagerTheme.paddingSmall),
          _buildEstateOverviewSection(),
          const SizedBox(height: ManagerTheme.paddingLarge),
          _buildSettingsSection(context),
          const SizedBox(height: ManagerTheme.paddingLarge),
          _buildAppInfoCard(),
          const SizedBox(height: ManagerTheme.paddingLarge),
          _buildLogoutButton(context),
          const SizedBox(height: 50),
        ],
      ),
    );
  }

  Widget _buildProfileHeaderCard(AuthAuthenticated state) {
    final user = state.user;
    final initials = (user.fullName ?? user.username)
        .split(' ')
        .take(2)
        .map((e) => e.isNotEmpty ? e[0].toUpperCase() : '')
        .join();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: ManagerTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: ManagerTheme.primaryPurple.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              color: Colors.white.withOpacity(0.1),
            ),
            child: Center(
              child: Text(
                initials,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.fullName ?? user.username,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    RoleService.getRoleDisplayName(user.role),
                    style: const TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'PT Agrinova Plantation',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
                Text(
                  user.estate ?? 'Kebun Utara',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceStatsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ManagerTheme.whiteCardDecoration,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildStatItem(Icons.agriculture_rounded, '1,234 ton', 'Produksi'),
          _buildVerticalDivider(),
          _buildStatItem(Icons.ads_click_rounded, '87.5%', 'Target'),
          _buildVerticalDivider(),
          _buildStatItem(Icons.groups_rounded, '48', 'Tim'),
          _buildVerticalDivider(),
          _buildStatItem(Icons.spa_rounded, '3 Estate', 'Estate'),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: ManagerTheme.primaryPurple, size: 24),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      height: 40,
      width: 1,
      color: Colors.grey[200],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: ManagerTheme.primaryPurple,
      ),
    );
  }

  Widget _buildInformationSection(AuthAuthenticated state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ManagerTheme.whiteCardDecoration,
      child: Column(
        children: [
          _buildInfoRow(Icons.business_rounded, 'Estate', state.user.estate ?? 'Kebun Utara'),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.email_rounded, 'Email', state.user.email ?? 'surya@agrinova.com'),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.phone_rounded, 'Telepon', '+62 812-9876-5432'), // Mock
          const SizedBox(height: 12),
          _buildInfoRow(Icons.calendar_today_rounded, 'Bergabung', '20 Maret 2021'), // Mock
          const SizedBox(height: 12),
          _buildInfoRow(Icons.star_rounded, 'Penghargaan', 'Manager Terbaik 2023'), // Mock
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: ManagerTheme.primaryPurple),
        const SizedBox(width: 12),
        SizedBox(width: 100, child: Text(label, style: ManagerTheme.bodyMedium)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  Widget _buildEstateOverviewSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ManagerTheme.whiteCardDecoration,
      child: Column(
        children: [
          _buildOverviewRow('Area Total', '1,250 ha'),
          const SizedBox(height: 8),
          _buildOverviewRow('Blok Aktif', '45 blok'),
          const SizedBox(height: 8),
          _buildOverviewRow('Divisi', '4 divisi'),
          const SizedBox(height: 8),
          _buildOverviewRow('Kapasitas Panen', '60 ton/hari'),
        ],
      ),
    );
  }

  Widget _buildOverviewRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: ManagerTheme.bodyMedium),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
      ],
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Container(
      decoration: ManagerTheme.whiteCardDecoration,
      child: Column(
        children: [
          _buildSettingItem(Icons.notifications_outlined, 'Notifikasi'),
          const Divider(height: 1),
          _buildSettingItem(Icons.lock_outline_rounded, 'Keamanan'),
          const Divider(height: 1),
          _buildSettingItem(Icons.download_rounded, 'Export Data'),
          const Divider(height: 1),
          _buildSettingItem(Icons.help_outline_rounded, 'Bantuan'),
        ],
      ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title) {
    return ListTile(
      leading: Icon(icon, color: ManagerTheme.primaryPurple),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
      onTap: () {}, // TODO: Implement settings navigation
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
    );
  }

  Widget _buildAppInfoCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: ManagerTheme.primaryPurple.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.spa_rounded, color: ManagerTheme.primaryPurple),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Agrinova Mobile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text('v1.0.0 Manager Edition', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () => _confirmLogout(context),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: ManagerTheme.rejectedRed),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
        child: const Text('Keluar', style: TextStyle(color: ManagerTheme.rejectedRed, fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar Aplikasi?'),
        content: const Text('Anda yakin ingin keluar?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(AuthLogoutRequested());
            },
            child: const Text('Keluar', style: TextStyle(color: ManagerTheme.rejectedRed)),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        currentIndex: 3, // Profile tab selected
        selectedItemColor: ManagerTheme.primaryPurple,
        unselectedItemColor: Colors.grey[600],
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.monitor_outlined), label: 'Monitor'),
          BottomNavigationBarItem(icon: Icon(Icons.analytics_outlined), label: 'Analytics'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
        onTap: (index) => _handleBottomNavigation(context, index),
      ),
    );
  }

  void _handleBottomNavigation(BuildContext context, int index) {
    switch (index) {
      case 0:
        // Go back to Dashboard
        Navigator.pop(context);
        break;
      case 1:
        // Go to Monitor
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ManagerMonitorTab()),
        );
        break;
      case 2:
        // Go to Analytics
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ManagerAnalyticsTab()),
        );
        break;
      case 3:
        // Already on Profile
        break;
    }
  }
}
