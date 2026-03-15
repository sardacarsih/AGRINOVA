import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/api_constants.dart';
import '../../core/di/dependency_injection.dart';
import '../../core/routes/app_routes.dart';
import '../../core/theme/runtime_theme_slot_resolver.dart';
import '../../features/auth/presentation/blocs/auth_bloc.dart';
import '../../features/auth/presentation/blocs/biometric_auth_bloc.dart';
import '../../features/auth/presentation/pages/biometric_settings_page.dart';
import 'server_profile_page.dart';

class LogoutMenuWidget extends StatelessWidget {
  final String? username;
  final String? role;
  final VoidCallback? onProfileTap;

  const LogoutMenuWidget({
    super.key,
    this.username,
    this.role,
    this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    final sidebarBg = RuntimeThemeSlotResolver.sidebarBackground(context);
    final menuTextColor = RuntimeThemeSlotResolver.sidebarForeground(context);
    final menuIconColor = RuntimeThemeSlotResolver.sidebarIcon(context);

    return PopupMenuButton<String>(
      color: sidebarBg,
      onSelected: (value) => _handleMenuAction(context, value),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'profile',
          child: Row(
            children: [
              Icon(Icons.person, size: 20, color: menuIconColor),
              const SizedBox(width: 12),
              Text('Profile', style: TextStyle(color: menuTextColor)),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'settings',
          child: Row(
            children: [
              Icon(Icons.settings, size: 20, color: menuIconColor),
              const SizedBox(width: 12),
              Text('Settings', style: TextStyle(color: menuTextColor)),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'biometric',
          child: Row(
            children: [
              Icon(Icons.fingerprint, size: 20, color: menuIconColor),
              const SizedBox(width: 12),
              Text('Biometric', style: TextStyle(color: menuTextColor)),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'web_qr_login',
          child: Row(
            children: [
              Icon(Icons.qr_code_scanner, size: 20, color: menuIconColor),
              const SizedBox(width: 12),
              Text('QR Login Web', style: TextStyle(color: menuTextColor)),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'about',
          child: Row(
            children: [
              Icon(Icons.info_outline, size: 20, color: menuIconColor),
              const SizedBox(width: 12),
              Text('About', style: TextStyle(color: menuTextColor)),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              Icon(Icons.logout, color: Colors.red, size: 20),
              const SizedBox(width: 12),
              const Text('Logout', style: TextStyle(color: Colors.red)),
            ],
          ),
        ),
      ],
      tooltip: 'User Menu',
      icon: const Icon(Icons.more_vert),
    );
  }

  void _handleMenuAction(BuildContext context, String action) {
    switch (action) {
      case 'profile':
        if (onProfileTap != null) {
          onProfileTap!.call();
        } else {
          _navigateToProfile(context);
        }
        break;
      case 'settings':
        _navigateToSettings(context);
        break;
      case 'biometric':
        _navigateToBiometricSettings(context);
        break;
      case 'web_qr_login':
        _navigateToWebQRLogin(context);
        break;
      case 'about':
        _showAboutDialog(context);
        break;
      case 'logout':
        _showLogoutConfirmation(context);
        break;
    }
  }

  void _navigateToProfile(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const ServerProfilePage(title: 'Profil Pengguna'),
      ),
    );
  }

  void _navigateToSettings(BuildContext context) {
    Navigator.pushNamed(context, AppRoutes.settingsPage);
  }

  void _navigateToBiometricSettings(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BlocProvider(
          create: (context) => sl<BiometricAuthBloc>(),
          child: const BiometricSettingsPage(),
        ),
      ),
    );
  }

  void _navigateToWebQRLogin(BuildContext context) {
    Navigator.pushNamed(context, AppRoutes.webQRLogin);
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          context,
          fallback: Theme.of(context).dialogTheme.backgroundColor,
        ),
        title: Row(
          children: [
            Icon(
              Icons.info_outline,
              color: RuntimeThemeSlotResolver.modalAccent(
                context,
                fallback: Colors.blue,
              ),
            ),
            const SizedBox(width: 8),
            const Text('About Agrinova'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Agrinova Mobile App'),
            const SizedBox(height: 8),
            Text('Version: ${ApiConstants.appVersionDisplay}'),
            const SizedBox(height: 8),
            const Text(
              'Palm oil management system with offline-first capabilities and JWT authentication.',
            ),
            const SizedBox(height: 16),
            if (username != null || role != null) ...[
              const Divider(),
              const SizedBox(height: 8),
              if (username != null)
                Text(
                  'User: $username',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              if (role != null)
                Text(
                  'Role: $role',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Close',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  context,
                  fallback: Theme.of(context).colorScheme.secondary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutConfirmation(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback: Theme.of(dialogContext).dialogTheme.backgroundColor,
        ),
        title: Row(
          children: [
            Icon(Icons.logout, color: Colors.red),
            const SizedBox(width: 8),
            const Text('Konfirmasi Keluar'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Apakah Anda yakin ingin keluar?'),
            const SizedBox(height: 8),
            if (username != null)
              Text(
                'Pengguna: $username',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange[300]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Data offline yang belum tersimpan tetap aman di perangkat dan akan sinkron saat Anda login kembali.',
                      style: TextStyle(color: Colors.orange[800], fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              'Batal',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  dialogContext,
                  fallback: Theme.of(dialogContext).colorScheme.secondary,
                ),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => _performLogout(context, dialogContext),
            style: ElevatedButton.styleFrom(
              backgroundColor: RuntimeThemeSlotResolver.modalAccent(
                dialogContext,
                fallback: Colors.red,
              ),
              foregroundColor: Colors.white,
            ),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }

  void _performLogout(BuildContext parentContext, BuildContext dialogContext) {
    final authBloc = parentContext.read<AuthBloc>();
    Navigator.pop(dialogContext); // Close confirmation dialog
    if (!parentContext.mounted) return;

    // Perform logout via AuthBloc
    authBloc.add(AuthLogoutRequested());
  }
}
