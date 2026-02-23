import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/api_constants.dart';
import '../../core/di/dependency_injection.dart';
import '../../core/routes/app_routes.dart';
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
    return PopupMenuButton<String>(
      onSelected: (value) => _handleMenuAction(context, value),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'profile',
          child: Row(
            children: [
              Icon(Icons.person, size: 20, color: Colors.grey[700]),
              SizedBox(width: 12),
              Text('Profile'),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'settings',
          child: Row(
            children: [
              Icon(Icons.settings, size: 20, color: Colors.grey[700]),
              SizedBox(width: 12),
              Text('Settings'),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'biometric',
          child: Row(
            children: [
              Icon(Icons.fingerprint, size: 20, color: Colors.grey[700]),
              SizedBox(width: 12),
              Text('Biometric'),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'web_qr_login',
          child: Row(
            children: [
              Icon(Icons.qr_code_scanner, size: 20, color: Colors.grey[700]),
              SizedBox(width: 12),
              Text('QR Login Web'),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'about',
          child: Row(
            children: [
              Icon(Icons.info_outline, size: 20, color: Colors.grey[700]),
              SizedBox(width: 12),
              Text('About'),
            ],
          ),
        ),
        PopupMenuDivider(),
        PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              Icon(Icons.logout, color: Colors.red, size: 20),
              SizedBox(width: 12),
              Text('Logout', style: TextStyle(color: Colors.red)),
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
        title: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.blue),
            SizedBox(width: 8),
            Text('About Agrinova'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Agrinova Mobile App'),
            SizedBox(height: 8),
            Text('Version: ${ApiConstants.appVersionDisplay}'),
            SizedBox(height: 8),
            Text(
              'Palm oil management system with offline-first capabilities and JWT authentication.',
            ),
            SizedBox(height: 16),
            if (username != null || role != null) ...[
              Divider(),
              SizedBox(height: 8),
              if (username != null)
                Text(
                  'User: $username',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
              if (role != null)
                Text(
                  'Role: $role',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
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
        title: Row(
          children: [
            Icon(Icons.logout, color: Colors.red),
            SizedBox(width: 8),
            Text('Konfirmasi Keluar'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Apakah Anda yakin ingin keluar?'),
            SizedBox(height: 8),
            if (username != null)
              Text(
                'Pengguna: $username',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ),
            SizedBox(height: 16),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange[300]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning, color: Colors.orange, size: 20),
                  SizedBox(width: 8),
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
            child: Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => _performLogout(context, dialogContext),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('Keluar'),
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
