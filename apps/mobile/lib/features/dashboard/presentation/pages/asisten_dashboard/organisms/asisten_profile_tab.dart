import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../asisten_theme.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';

/// Organism: Profile Tab
/// Profile tab for Asisten dashboard - Redesigned to match design image
class AsistenProfileTab extends StatelessWidget {
  final VoidCallback? onLogout;

  const AsistenProfileTab({
    super.key,
    this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! AuthAuthenticated) {
          return const Center(child: CircularProgressIndicator());
        }

        final user = state.user;

        return Scaffold(
          backgroundColor: AsistenTheme.scaffoldBackground,
          body: CustomScrollView(
            slivers: [
              // Blue Header with Profile Info
              SliverToBoxAdapter(
                child: _buildProfileHeader(user),
              ),
              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats Cards Row
                      _buildStatsCardsRow(),
                      const SizedBox(height: 20),
                      
                      // Informasi Akun Section
                      _buildAccountInfoSection(user),
                      const SizedBox(height: 20),
                      
                      // Pengaturan Section
                      _buildSettingsSection(context),
                      const SizedBox(height: 20),
                      
                      // App Info
                      _buildAppInfoSection(),
                      const SizedBox(height: 16),
                      
                      // Logout Button
                      _buildLogoutButton(context),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(dynamic user) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1976D2), Color(0xFF42A5F5)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Title
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'Profil Saya',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Profile Info Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _getInitials(user.fullName ?? user.username),
                        style: const TextStyle(
                          color: Color(0xFF1976D2),
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Name
                  Text(
                    user.fullName ?? user.username,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Role Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.4),
                        width: 1,
                      ),
                    ),
                    child: const Text(
                      'Asisten',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Username
                  Text(
                    '@${user.username}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Division
                  Text(
                    user.division ?? 'Divisi Utara',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCardsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.assignment_turned_in_outlined,
            iconColor: const Color(0xFF1976D2),
            value: '1,245',
            label: 'Total Disetujui',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.check_circle_outline,
            iconColor: const Color(0xFF43A047),
            value: '98.5%',
            label: 'Approval Rate',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.eco_outlined,
            iconColor: const Color(0xFFE65100),
            value: '28.3 ton',
            label: 'Rata-rata Harian',
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: iconColor,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF757575),
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAccountInfoSection(dynamic user) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Informasi Akun',
              style: TextStyle(
                color: AsistenTheme.primaryBlue,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _buildInfoRow(
            icon: Icons.email_outlined,
            label: 'Email',
            value: user.email ?? 'darmawan@agrinova.com',
          ),
          _buildInfoRow(
            icon: Icons.phone_outlined,
            label: 'Telepon',
            value: '+62 812-3456-7890', // TODO: Add phone to User model when API supports it
          ),
          _buildInfoRow(
            icon: Icons.calendar_today_outlined,
            label: 'Bergabung',
            value: '15 Januari 2023',
          ),
          _buildInfoRow(
            icon: Icons.business_outlined,
            label: 'Divisi',
            value: user.division ?? 'Divisi Utara',
            showDivider: false,
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF757575), size: 20),
              const SizedBox(width: 12),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF424242),
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              Text(
                value,
                style: const TextStyle(
                  color: Color(0xFF424242),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 48,
            endIndent: 16,
            color: Colors.grey.withValues(alpha: 0.2),
          ),
      ],
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Pengaturan',
              style: TextStyle(
                color: AsistenTheme.primaryBlue,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _buildSettingsRow(
            icon: Icons.notifications_outlined,
            label: 'Notifikasi',
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF43A047).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Aktif',
                style: TextStyle(
                  color: Color(0xFF43A047),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            onTap: () => _showComingSoon(context, 'Notifikasi'),
          ),
          _buildSettingsRow(
            icon: Icons.lock_outline,
            label: 'Keamanan',
            onTap: () => _showComingSoon(context, 'Keamanan'),
          ),
          _buildSettingsRow(
            icon: Icons.language,
            label: 'Bahasa',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text(
                  'Indonesia',
                  style: TextStyle(
                    color: Color(0xFF757575),
                    fontSize: 14,
                  ),
                ),
                Icon(Icons.chevron_right, color: Color(0xFF9E9E9E)),
              ],
            ),
            onTap: () => _showComingSoon(context, 'Bahasa'),
          ),
          _buildSettingsRow(
            icon: Icons.help_outline,
            label: 'Bantuan',
            onTap: () => _showComingSoon(context, 'Bantuan'),
          ),
          _buildSettingsRow(
            icon: Icons.info_outline,
            label: 'Tentang Aplikasi',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text(
                  'v1.0.0',
                  style: TextStyle(
                    color: Color(0xFF757575),
                    fontSize: 14,
                  ),
                ),
                Icon(Icons.chevron_right, color: Color(0xFF9E9E9E)),
              ],
            ),
            onTap: () => _showComingSoon(context, 'Tentang Aplikasi'),
            showDivider: false,
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildSettingsRow({
    required IconData icon,
    required String label,
    Widget? trailing,
    required VoidCallback onTap,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(icon, color: const Color(0xFF757575), size: 20),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF424242),
                    fontSize: 14,
                  ),
                ),
                const Spacer(),
                trailing ??
                    const Icon(Icons.chevron_right, color: Color(0xFF9E9E9E)),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(
            height: 1,
            indent: 48,
            endIndent: 16,
            color: Colors.grey.withValues(alpha: 0.2),
          ),
      ],
    );
  }

  Widget _buildAppInfoSection() {
    return Center(
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFF1976D2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.eco,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Agrinova Mobile',
            style: TextStyle(
              color: Color(0xFF1976D2),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'v1.0.0',
            style: TextStyle(
              color: Color(0xFF9E9E9E),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          context.read<AuthBloc>().add(AuthLogoutRequested());
          onLogout?.call();
        },
        icon: const Icon(
          Icons.logout,
          color: Color(0xFFE53935),
          size: 20,
        ),
        label: const Text(
          'Keluar',
          style: TextStyle(
            color: Color(0xFFE53935),
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFE53935), width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(25),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'A';
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature dalam pengembangan'),
        backgroundColor: AsistenTheme.pendingOrange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

