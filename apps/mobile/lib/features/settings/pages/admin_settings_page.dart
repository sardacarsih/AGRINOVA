import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/services/role_service.dart';
import '../../auth/presentation/blocs/auth_bloc.dart';

class AdminSettingsPage extends StatelessWidget {
  const AdminSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final role = _currentRole(context);
    final roleLabel = RoleService.getRoleDisplayName(role);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan Admin'),
        backgroundColor: const Color(0xFF1F2937),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.admin_panel_settings,
                  color: Color(0xFF1D4ED8),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Akses admin aktif: $roleLabel',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _buildSection(
            context: context,
            title: 'Kontrol Akses',
            subtitle: 'Role, hak akses, dan pengelolaan pengguna',
            icon: Icons.group_outlined,
          ),
          const SizedBox(height: 12),
          _buildSection(
            context: context,
            title: 'Konfigurasi Sistem',
            subtitle: 'Parameter global, kebijakan, dan integrasi',
            icon: Icons.settings_suggest_outlined,
          ),
          const SizedBox(height: 12),
          _buildSection(
            context: context,
            title: 'Keamanan & Audit',
            subtitle: 'Audit trail, kontrol sesi, dan kebijakan keamanan',
            icon: Icons.verified_user_outlined,
          ),
        ],
      ),
    );
  }

  String _currentRole(BuildContext context) {
    try {
      final state = BlocProvider.of<AuthBloc>(context, listen: false).state;
      if (state is AuthAuthenticated) {
        return state.user.role;
      }
      if (state is AuthOfflineMode) {
        return state.user.role;
      }
    } catch (_) {
      // Fallback to unknown role when AuthBloc isn't available in tree.
    }

    return 'unknown';
  }

  Widget _buildSection({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Icon(icon, color: const Color(0xFF111827)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Modul ini belum tersedia di aplikasi mobile'),
            ),
          );
        },
      ),
    );
  }
}
