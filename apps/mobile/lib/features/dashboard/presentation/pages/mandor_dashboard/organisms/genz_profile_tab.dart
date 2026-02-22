import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../core/constants/api_constants.dart';
import '../../../../../../core/database/enhanced_database_service.dart';
import '../../../../../../shared/widgets/current_user_avatar.dart';
import '../mandor_theme.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../../auth/presentation/pages/change_password_page.dart';

/// Gen Z Profile Tab
///
/// User profile with:
/// - Avatar & user info card
/// - Division/role display
/// - Quick settings
/// - Logout button
/// - App version
class GenZProfileTab extends StatelessWidget {
  final VoidCallback? onLogout;

  const GenZProfileTab({
    super.key,
    this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          return _buildContent(context, state);
        }
        return _buildLoadingState();
      },
    );
  }

  Widget _buildLoadingState() {
    return Container(
      decoration: BoxDecoration(gradient: MandorTheme.darkGradient),
      child: Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation(MandorTheme.forestGreen),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AuthAuthenticated state) {
    return Container(
      decoration: BoxDecoration(gradient: MandorTheme.darkGradient),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile Card
            _buildProfileCard(state),
            const SizedBox(height: 24),

            // Quick Info
            _buildQuickInfo(state),
            const SizedBox(height: 24),

            // Settings Section
            _buildSettingsSection(context),
            const SizedBox(height: 24),

            // App Info
            _buildAppInfo(),
            const SizedBox(height: 24),

            // Logout Button
            _buildLogoutButton(context),

            const SizedBox(height: 120), // Space for bottom nav
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard(AuthAuthenticated state) {
    final user = state.user;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            MandorTheme.forestGreen.withValues(alpha: 0.3),
            MandorTheme.darkGreen.withValues(alpha: 0.3),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: MandorTheme.forestGreen.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: MandorTheme.primaryGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: MandorTheme.forestGreen.withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Padding(
              padding: EdgeInsets.all(3),
              child: CurrentUserAvatar(
                size: 74,
                shape: BoxShape.circle,
                backgroundColor: Color(0x22000000),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Name
          Text(
            user.fullName,
            style: MandorTheme.headingMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),

          // Role Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: MandorTheme.forestGreen.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
              border:
                  Border.all(color: MandorTheme.forestGreen.withValues(alpha: 0.5)),
            ),
            child: Text(
              'Mandor',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: MandorTheme.forestGreen,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Username
          Text(
            '@${user.username}',
            style: MandorTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickInfo(AuthAuthenticated state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Informasi', style: MandorTheme.labelMedium),
          const SizedBox(height: 16),
          _buildInfoRow(
            icon: Icons.business_rounded,
            label: 'Company',
            value: state.user.companyName ?? '-',
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.park_rounded,
            label: 'Estate',
            value: state.user.estate ?? '-',
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.location_city_rounded,
            label: 'Divisi',
            value: state.user.division ?? '-',
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          FutureBuilder<String>(
            future: _resolveSupervisorName(state.user.id, state.user.managerId),
            builder: (context, snapshot) {
              final fallback = _normalizeValue(state.user.managerName) ?? '-';
              final resolvedName = _normalizeValue(snapshot.data);
              final supervisorName = _isUuidLike(resolvedName)
                  ? fallback
                  : (resolvedName ?? fallback);

              return _buildInfoRow(
                icon: Icons.supervisor_account_rounded,
                label: 'Atasan',
                value: supervisorName,
              );
            },
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.email_rounded,
            label: 'Email',
            value: state.user.email,
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.wifi_off_rounded,
            label: 'Mode Offline',
            value: state.isOfflineMode ? 'Aktif' : 'Tidak Aktif',
            valueColor: state.isOfflineMode
                ? MandorTheme.amberOrange
                : MandorTheme.forestGreen,
          ),
        ],
      ),
    );
  }

  Future<String> _resolveSupervisorName(
      String currentUserId, String? fallbackManagerId) async {
    try {
      final databaseService = EnhancedDatabaseService();
      final tableInfo =
          await databaseService.rawQuery('PRAGMA table_info(users)');

      final columns = tableInfo
          .map((column) => column['name']?.toString().toLowerCase())
          .whereType<String>()
          .toSet();

      final userIdColumn = columns.contains('user_id')
          ? 'user_id'
          : (columns.contains('id') ? 'id' : null);
      if (userIdColumn == null) {
        return _normalizeValue(fallbackManagerId) ?? '-';
      }

      final managerColumns = <String>[];
      if (columns.contains('manager_name')) managerColumns.add('manager_name');
      if (columns.contains('manager_id')) managerColumns.add('manager_id');
      if (columns.contains('reporting_to_area_manager_id')) {
        managerColumns.add('reporting_to_area_manager_id');
      }

      String? managerName;
      String? managerId;

      if (managerColumns.isNotEmpty) {
        final currentUserRows = await databaseService.query(
          'users',
          columns: managerColumns,
          where: '$userIdColumn = ?',
          whereArgs: [currentUserId],
          limit: 1,
        );

        if (currentUserRows.isNotEmpty) {
          final currentUser = currentUserRows.first;
          managerName =
              _normalizeValue(currentUser['manager_name']?.toString());
          managerId = _normalizeValue(currentUser['manager_id']?.toString()) ??
              _normalizeValue(
                  currentUser['reporting_to_area_manager_id']?.toString());
        }
      }

      managerId ??= _normalizeValue(fallbackManagerId);
      if (managerName != null) return managerName;
      if (managerId == null) return '-';

      final supervisorRows = await databaseService.query(
        'users',
        columns: const ['full_name', 'username'],
        where: '$userIdColumn = ?',
        whereArgs: [managerId],
        limit: 1,
      );

      if (supervisorRows.isEmpty) {
        return '-';
      }

      final supervisor = supervisorRows.first;
      return _normalizeValue(supervisor['full_name']?.toString()) ??
          _normalizeValue(supervisor['username']?.toString()) ??
          '-';
    } catch (_) {
      return '-';
    }
  }

  String? _normalizeValue(String? value) {
    if (value == null) return null;
    final normalized = value.trim();
    if (normalized.isEmpty) return null;
    if (normalized == '-' || normalized.toLowerCase() == 'null') return null;
    return normalized;
  }

  bool _isUuidLike(String? value) {
    final normalized = _normalizeValue(value);
    if (normalized == null) return false;
    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-'
      r'[0-9a-fA-F]{4}-'
      r'[0-9a-fA-F]{4}-'
      r'[0-9a-fA-F]{4}-'
      r'[0-9a-fA-F]{12}$',
    );
    return uuidRegex.hasMatch(normalized);
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: MandorTheme.gray700,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: MandorTheme.gray400, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: MandorTheme.labelSmall),
              const SizedBox(height: 2),
              Text(
                value,
                style: MandorTheme.bodyMedium.copyWith(
                  color: valueColor ?? Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Container(
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Pengaturan', style: MandorTheme.labelMedium),
          ),
          _buildSettingItem(
            icon: Icons.lock_outline_rounded,
            title: 'Ubah Password',
            subtitle: 'Ganti password akun',
            onTap: () => _openChangePassword(context),
          ),
          _buildSettingItem(
            icon: Icons.notifications_rounded,
            title: 'Notifikasi',
            subtitle: 'Atur pemberitahuan',
            onTap: () => _showComingSoon(context),
          ),
          _buildSettingItem(
            icon: Icons.language_rounded,
            title: 'Bahasa',
            subtitle: 'Indonesia',
            onTap: () => _showComingSoon(context),
          ),
          _buildSettingItem(
            icon: Icons.help_rounded,
            title: 'Bantuan',
            subtitle: 'FAQ dan panduan',
            onTap: () => _showComingSoon(context),
          ),
          _buildSettingItem(
            icon: Icons.info_rounded,
            title: 'Tentang Aplikasi',
            subtitle: 'Versi dan informasi',
            onTap: () => _showComingSoon(context),
            showDivider: false,
          ),
        ],
      ),
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: MandorTheme.gray700,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: MandorTheme.gray400, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: MandorTheme.bodyMedium.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      Text(subtitle, style: MandorTheme.labelSmall),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: MandorTheme.gray500),
              ],
            ),
          ),
        ),
        if (showDivider)
          const Divider(color: Color(0xFF374151), height: 1, indent: 56),
      ],
    );
  }

  Widget _buildAppInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: MandorTheme.primaryGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.agriculture_rounded,
                color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Agrinova Mobile',
                    style: MandorTheme.bodyMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    )),
                Text(
                  'v${ApiConstants.appVersionDisplay}',
                  style: MandorTheme.labelSmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton.icon(
        onPressed: () => _confirmLogout(context),
        icon: Icon(Icons.logout_rounded, color: MandorTheme.coralRed),
        label: Text(
          'Keluar',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: MandorTheme.coralRed,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: MandorTheme.coralRed.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Keluar Aplikasi?', style: MandorTheme.headingSmall),
        content: Text(
          'Anda yakin ingin keluar dari aplikasi?',
          style: MandorTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal', style: TextStyle(color: MandorTheme.gray400)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(AuthLogoutRequested());
              onLogout?.call();
            },
            child:
                Text('Keluar', style: TextStyle(color: MandorTheme.coralRed)),
          ),
        ],
      ),
    );
  }

  void _openChangePassword(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ChangePasswordPage(),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Fitur ini sedang dalam pengembangan'),
        backgroundColor: MandorTheme.amberOrange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

