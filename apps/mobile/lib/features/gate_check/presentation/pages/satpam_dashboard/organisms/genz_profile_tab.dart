import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../../auth/presentation/pages/change_password_page.dart';
import '../../../../../../core/services/profile_photo_service.dart';
import '../../../../../../shared/widgets/current_user_avatar.dart';
import '../genz_theme.dart';

/// Gen Z Profile Tab for Satpam Dashboard
///
/// User profile with:
/// - Avatar & user info card (with photo upload)
/// - Division/role display
/// - Quick settings
/// - Logout button
/// - App version
class GenZProfileTab extends StatefulWidget {
  final VoidCallback? onLogout;
  final VoidCallback? onBiometricSettings;

  const GenZProfileTab({
    Key? key,
    this.onLogout,
    this.onBiometricSettings,
  }) : super(key: key);

  @override
  State<GenZProfileTab> createState() => _GenZProfileTabState();
}

class _GenZProfileTabState extends State<GenZProfileTab> {
  final ProfilePhotoService _photoService = ProfilePhotoService();
  final ImagePicker _picker = ImagePicker();
  String? _profilePhotoPath;
  bool _isLoadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _loadProfilePhoto();
  }

  Future<void> _loadProfilePhoto() async {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      final path = await _photoService.getProfilePhotoPath(authState.user.id);
      if (mounted) {
        setState(() {
          _profilePhotoPath = path;
        });
      }
    }
  }

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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF111827), Color(0xFF1F2937)],
        ),
      ),
      child: const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation(GenZTheme.electricPurple),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AuthAuthenticated state) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF111827), Color(0xFF1F2937)],
        ),
      ),
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

            const SizedBox(height: 100), // Space for bottom nav
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
            GenZTheme.electricPurple.withValues(alpha: 0.3),
            GenZTheme.neoBlue.withValues(alpha: 0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border:
            Border.all(color: GenZTheme.electricPurple.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          // Avatar with photo upload
          GestureDetector(
            onTap: () => _showPhotoOptions(state.user.id),
            child: Stack(
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    gradient: _profilePhotoPath == null
                        ? const LinearGradient(
                            colors: [
                              GenZTheme.electricPurple,
                              GenZTheme.neoBlue
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: GenZTheme.electricPurple.withValues(alpha: 0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: _isLoadingPhoto
                        ? const Center(
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const CurrentUserAvatar(
                            size: 90,
                            shape: BoxShape.circle,
                            backgroundColor: Color(0x22000000),
                          ),
                  ),
                ),
                // Camera icon overlay
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: GenZTheme.electricPurple,
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: const Color(0xFF111827), width: 2),
                    ),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Name
          Text(
            user.fullName ?? user.username,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),

          // Role Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: GenZTheme.electricPurple.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: GenZTheme.electricPurple.withValues(alpha: 0.5)),
            ),
            child: Text(
              _getRoleDisplayName(user.role),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: GenZTheme.electricPurple,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Username
          Text(
            '@${user.username}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }

  void _showPhotoOptions(String userId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1F2937),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Ubah Foto Profil',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              _buildPhotoOption(
                icon: Icons.camera_alt_rounded,
                label: 'Ambil Foto',
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(userId, ImageSource.camera);
                },
              ),
              const SizedBox(height: 12),
              _buildPhotoOption(
                icon: Icons.photo_library_rounded,
                label: 'Pilih dari Galeri',
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(userId, ImageSource.gallery);
                },
              ),
              if (_profilePhotoPath != null) ...[
                const SizedBox(height: 12),
                _buildPhotoOption(
                  icon: Icons.delete_rounded,
                  label: 'Hapus Foto',
                  isDestructive: true,
                  onTap: () {
                    Navigator.pop(context);
                    _deletePhoto(userId);
                  },
                ),
              ],
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDestructive
              ? Colors.red.withValues(alpha: 0.1)
              : Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDestructive
                ? Colors.red.withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.1),
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isDestructive ? Colors.red : GenZTheme.electricPurple,
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                color: isDestructive ? Colors.red : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(String userId, ImageSource source) async {
    try {
      // Request permission
      if (source == ImageSource.camera) {
        final permission = await Permission.camera.request();
        if (permission.isDenied || permission.isPermanentlyDenied) {
          _showPermissionError('kamera');
          return;
        }
      }

      setState(() => _isLoadingPhoto = true);

      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 512,
        maxHeight: 512,
        preferredCameraDevice: CameraDevice.front,
      );

      if (image != null) {
        final savedPath = await _photoService.saveProfilePhoto(
          userId,
          File(image.path),
        );

        if (savedPath != null && mounted) {
          setState(() {
            _profilePhotoPath = savedPath;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Foto profil berhasil diperbarui'),
              backgroundColor: GenZTheme.mintGreen,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengubah foto: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingPhoto = false);
      }
    }
  }

  Future<void> _deletePhoto(String userId) async {
    final success = await _photoService.deleteProfilePhoto(userId);
    if (success && mounted) {
      setState(() {
        _profilePhotoPath = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Foto profil dihapus'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  void _showPermissionError(String type) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Izin akses $type diperlukan'),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'Pengaturan',
          textColor: Colors.white,
          onPressed: () => openAppSettings(),
        ),
      ),
    );
  }

  Widget _buildQuickInfo(AuthAuthenticated state) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: GenZTheme.glassCardDark(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informasi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: GenZTheme.electricPurple,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
            icon: Icons.business_rounded,
            label: 'Perusahaan',
            value: state.user.companyName ?? 'Agrinova Palm Oil',
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.email_rounded,
            label: 'Email',
            value: state.user.email ?? '-',
          ),
          const Divider(color: Color(0xFF374151), height: 24),
          _buildInfoRow(
            icon: Icons.wifi_off_rounded,
            label: 'Mode Offline',
            value: state.isOfflineMode ? 'Aktif' : 'Tidak Aktif',
            valueColor:
                state.isOfflineMode ? Colors.orange : GenZTheme.mintGreen,
          ),
        ],
      ),
    );
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
            color: const Color(0xFF374151),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: const Color(0xFF9CA3AF), size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: valueColor ?? Colors.white,
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
      decoration: GenZTheme.glassCardDark(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Pengaturan',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: GenZTheme.electricPurple,
              ),
            ),
          ),
          _buildSettingItem(
            icon: Icons.fingerprint_rounded,
            title: 'Keamanan Biometrik / PIN',
            subtitle: 'Sidik jari, wajah, atau PIN perangkat',
            onTap: () {
              widget.onBiometricSettings?.call();
            },
          ),
          _buildSettingItem(
            icon: Icons.lock_outline_rounded,
            title: 'Ubah Password',
            subtitle: 'Ganti password akun',
            onTap: () => _openChangePassword(),
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
                    color: const Color(0xFF374151),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: const Color(0xFF9CA3AF), size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    color: Color(0xFF6B7280)),
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
      decoration: GenZTheme.glassCardDark(),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [GenZTheme.electricPurple, GenZTheme.neoBlue],
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.security_rounded,
                color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Agrinova Mobile',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'v1.0.0 • Satpam Dashboard',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
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
        icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
        label: const Text(
          'Keluar',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.redAccent,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.5)),
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
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Keluar Aplikasi?',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        content: Text(
          'Anda yakin ingin keluar dari aplikasi?',
          style: TextStyle(
            fontSize: 14,
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Batal',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(AuthLogoutRequested());
              widget.onLogout?.call();
            },
            child:
                const Text('Keluar', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Fitur ini sedang dalam pengembangan'),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _openChangePassword() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ChangePasswordPage(),
      ),
    );
  }

  String _getRoleDisplayName(String role) {
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
