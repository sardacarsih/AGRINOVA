import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/di/dependency_injection.dart';
import '../../../core/models/app_update_models.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/services/app_update_service.dart';
import '../../../core/services/role_service.dart';
import '../../../shared/widgets/app_update_widgets.dart';
import '../../auth/presentation/blocs/auth_bloc.dart';
import '../../dashboard/presentation/pages/area_manager_dashboard/area_manager_theme.dart';
import '../../dashboard/presentation/pages/asisten_dashboard/asisten_theme.dart';
import '../../dashboard/presentation/pages/manager_dashboard/manager_theme.dart';
import '../../dashboard/presentation/pages/mandor_dashboard/mandor_theme.dart';
import '../../gate_check/presentation/pages/satpam_dashboard/genz_theme.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final Logger _logger = Logger();
  final AppUpdateService _updateService = AppUpdateService(
    dioClient: locate<DioClient>(),
  );

  AppUpdatePolicy _updatePolicy = AppUpdatePolicy.defaults();
  AppUpdateInfo? _pendingUpdate;
  AppVersionInfo? _currentVersion;
  String? _versionError;
  bool _isLoading = true;
  bool _isCheckingForUpdates = false;

  @override
  void initState() {
    super.initState();
    _loadUpdatePolicy();
  }

  Future<void> _loadUpdatePolicy() async {
    AppUpdatePolicy nextPolicy = _updatePolicy;
    AppUpdateInfo? nextPendingUpdate = _pendingUpdate;
    AppVersionInfo? nextCurrentVersion = _currentVersion;
    String? nextVersionError = _versionError;

    try {
      await _updateService.initialize();
      nextPolicy = _updateService.getUpdatePolicy();
      nextPendingUpdate = _updateService.pendingUpdate;

      try {
        nextCurrentVersion = _updateService.getCurrentVersion();
        nextVersionError = null;
      } catch (e) {
        _logger.e('Failed to load version info: $e');
        nextVersionError = 'Gagal memuat informasi versi aplikasi';
      }
    } catch (e) {
      _logger.e('Failed to load update policy: $e');
      nextVersionError ??= 'Gagal memuat pengaturan pembaruan';
    }

    if (!mounted) return;
    setState(() {
      _updatePolicy = nextPolicy;
      _pendingUpdate = nextPendingUpdate;
      _currentVersion = nextCurrentVersion;
      _versionError = nextVersionError;
      _isLoading = false;
    });
  }

  Future<void> _checkForUpdates() async {
    if (_isCheckingForUpdates) return;

    try {
      setState(() => _isCheckingForUpdates = true);

      final updateInfo = await _updateService.checkForUpdates(forceCheck: true);

      if (!mounted) return;
      setState(() {
        _pendingUpdate = updateInfo;
        _isCheckingForUpdates = false;
      });

      if (updateInfo != null) {
        await showDialog(
          context: context,
          builder: (dialogContext) => AppUpdateDialog(
            updateInfo: updateInfo,
            onUpdateTap: () {
              Navigator.of(dialogContext).pop();
              _startUpdate(updateInfo);
            },
            onLaterTap: updateInfo.isCritical
                ? null
                : () {
                    Navigator.of(dialogContext).pop();
                  },
            onSkipTap: updateInfo.isCritical
                ? null
                : () {
                    Navigator.of(dialogContext).pop();
                    _skipVersion(updateInfo.latestVersion);
                  },
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Aplikasi Agrinova Anda sudah versi terbaru'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      _logger.e('Failed to check for updates: $e');
      if (!mounted) return;
      setState(() => _isCheckingForUpdates = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memeriksa pembaruan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _startUpdate(AppUpdateInfo updateInfo) async {
    try {
      await _updateService.startUpdate(updateInfo);
    } catch (e) {
      _logger.e('Failed to start update: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memulai pembaruan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _skipVersion(String version) async {
    await _updateService.skipVersion(version);
    if (!mounted) return;

    setState(() {
      _pendingUpdate = null;
    });

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Versi $version akan dilewati')));
  }

  void _onPolicyChanged(AppUpdatePolicy newPolicy) {
    setState(() {
      _updatePolicy = newPolicy;
    });

    _updateService.setUpdatePolicy(newPolicy);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Pengaturan pembaruan tersimpan'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roleTheme = _resolveRoleTheme(context);

    if (_isLoading) {
      return Scaffold(
        appBar: _buildAppBar(roleTheme),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: _buildAppBar(roleTheme),
      body: RefreshIndicator(
        onRefresh: _loadUpdatePolicy,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
          children: [
            _buildHeaderCard(roleTheme),
            const SizedBox(height: 16),
            _buildMenuCard(roleTheme),
            if (_pendingUpdate != null) ...[
              const SizedBox(height: 16),
              _buildPendingUpdateCard(roleTheme),
            ],
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(_SettingsRoleTheme roleTheme) {
    return AppBar(
      title: const Text('Pengaturan'),
      backgroundColor: roleTheme.appBarColor,
      foregroundColor: Colors.white,
      flexibleSpace: roleTheme.headerGradient == null
          ? null
          : Container(
              decoration: BoxDecoration(gradient: roleTheme.headerGradient!),
            ),
    );
  }

  Widget _buildHeaderCard(_SettingsRoleTheme roleTheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          colors: [
            roleTheme.primary.withValues(alpha: 0.15),
            roleTheme.primary.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: roleTheme.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: roleTheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.settings_rounded, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pengaturan Aplikasi',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Atur kebijakan, legal, dan informasi versi aplikasi',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard(_SettingsRoleTheme roleTheme) {
    final canOpenAdminSettings = _canOpenAdminSettings();

    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          _buildMenuTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Kebijakan Privasi',
            subtitle: 'Lihat bagaimana data Anda dikelola',
            iconColor: roleTheme.primary,
            onTap: _launchPrivacyPolicy,
          ),
          _buildTileDivider(),
          _buildMenuTile(
            icon: Icons.description_outlined,
            title: 'Syarat & Ketentuan',
            subtitle: 'Ketentuan penggunaan aplikasi Agrinova',
            iconColor: roleTheme.primary,
            onTap: _launchTermsAndConditions,
          ),
          _buildTileDivider(),
          _buildMenuTile(
            icon: Icons.system_update_alt_rounded,
            title: 'Pembaruan Aplikasi',
            subtitle: _updateStatusSubtitle(),
            badgeText: _pendingUpdate == null ? null : 'Baru',
            iconColor: roleTheme.primary,
            onTap: () => _openUpdateSettingsSheet(roleTheme),
          ),
          _buildTileDivider(),
          _buildMenuTile(
            icon: Icons.info_outline_rounded,
            title: 'Versi Aplikasi',
            subtitle: _versionSubtitle(),
            iconColor: roleTheme.primary,
            onTap: _showVersionDialog,
          ),
          if (canOpenAdminSettings) ...[
            _buildTileDivider(),
            _buildMenuTile(
              icon: Icons.admin_panel_settings_outlined,
              title: 'Pengaturan Admin',
              subtitle: 'Kelola konfigurasi tingkat admin',
              iconColor: roleTheme.primary,
              onTap: () {
                Navigator.pushNamed(context, AppRoutes.adminSettingsPage);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color iconColor,
    String? badgeText,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (badgeText != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade100,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            badgeText,
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: Colors.orange.shade900,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildTileDivider() {
    return Divider(height: 1, color: Colors.grey.shade200, indent: 66);
  }

  Widget _buildPendingUpdateCard(_SettingsRoleTheme roleTheme) {
    final update = _pendingUpdate!;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: update.isCritical
            ? Colors.red.shade50
            : roleTheme.primary.withValues(alpha: 0.08),
        border: Border.all(
          color: update.isCritical
              ? Colors.red.shade300
              : roleTheme.primary.withValues(alpha: 0.28),
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(
            update.isCritical
                ? Icons.warning_amber_rounded
                : Icons.new_releases,
            color: update.isCritical ? Colors.red.shade700 : roleTheme.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              update.isCritical
                  ? 'Pembaruan kritis ${update.displayVersion} tersedia'
                  : 'Pembaruan ${update.displayVersion} tersedia',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: () => _startUpdate(update),
            style: FilledButton.styleFrom(
              backgroundColor: update.isCritical
                  ? Colors.red
                  : roleTheme.primary,
            ),
            child: const Text('Perbarui'),
          ),
        ],
      ),
    );
  }

  Future<void> _openUpdateSettingsSheet(_SettingsRoleTheme roleTheme) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        return SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Pembaruan Aplikasi',
                  style: Theme.of(
                    sheetContext,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  _versionSubtitle(),
                  style: Theme.of(
                    sheetContext,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _isCheckingForUpdates
                        ? null
                        : () {
                            Navigator.of(sheetContext).pop();
                            _checkForUpdates();
                          },
                    icon: _isCheckingForUpdates
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded),
                    label: Text(
                      _isCheckingForUpdates
                          ? 'Sedang memeriksa...'
                          : 'Periksa Pembaruan Sekarang',
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: roleTheme.primary,
                      side: BorderSide(color: roleTheme.primary),
                    ),
                  ),
                ),
                if (_pendingUpdate != null) ...[
                  const SizedBox(height: 14),
                  _buildPendingUpdateCard(roleTheme),
                ],
                const SizedBox(height: 14),
                Card(
                  margin: EdgeInsets.zero,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: AppUpdateSettingsWidget(
                      policy: _updatePolicy,
                      onPolicyChanged: _onPolicyChanged,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showVersionDialog() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        final version = _currentVersion;
        return AlertDialog(
          title: const Text('Versi Aplikasi'),
          content: version == null
              ? Text(_versionError ?? 'Informasi versi belum tersedia')
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildVersionRow('Nama Aplikasi', version.appName),
                    const SizedBox(height: 8),
                    _buildVersionRow('Versi', 'v${version.version}'),
                    const SizedBox(height: 8),
                    _buildVersionRow('Build', '${version.buildNumber}'),
                    const SizedBox(height: 8),
                    _buildVersionRow('Package', version.packageName),
                  ],
                ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Tutup'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildVersionRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            '$label:',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        Expanded(child: Text(value)),
      ],
    );
  }

  String _updateStatusSubtitle() {
    final update = _pendingUpdate;
    if (update == null) {
      return 'Periksa update dan atur preferensi pembaruan';
    }
    if (update.isCritical) {
      return 'Pembaruan kritis ${update.displayVersion} tersedia';
    }
    return 'Pembaruan ${update.displayVersion} tersedia';
  }

  String _versionSubtitle() {
    final version = _currentVersion;
    if (version != null) {
      return 'v${version.version} (build ${version.buildNumber})';
    }
    return _versionError ?? 'Informasi versi belum tersedia';
  }

  Future<void> _launchPrivacyPolicy() async {
    await _launchExternalUrl(
      url: 'https://agrinova.kskgroup.web.id/privacy-policy',
      failureMessage: 'Tidak dapat membuka Kebijakan Privasi',
    );
  }

  Future<void> _launchTermsAndConditions() async {
    await _launchExternalUrl(
      url: 'https://agrinova.kskgroup.web.id/terms-of-service',
      failureMessage: 'Tidak dapat membuka Syarat & Ketentuan',
    );
  }

  Future<void> _launchExternalUrl({
    required String url,
    required String failureMessage,
  }) async {
    final uri = Uri.parse(url);
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (opened) {
        return;
      }
      final openedFallback = await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
      );
      if (openedFallback) {
        return;
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(failureMessage), backgroundColor: Colors.red),
      );
    } catch (e) {
      _logger.e('Error launching URL ($url): $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Terjadi kesalahan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  _SettingsRoleTheme _resolveRoleTheme(BuildContext context) {
    AuthState? state;
    try {
      state = BlocProvider.of<AuthBloc>(context, listen: false).state;
    } catch (_) {
      state = null;
    }

    final role = state is AuthAuthenticated
        ? state.user.role.toUpperCase()
        : '';

    switch (role) {
      case 'MANDOR':
        return const _SettingsRoleTheme(
          appBarColor: MandorTheme.darkGreen,
          primary: MandorTheme.forestGreen,
          headerGradient: LinearGradient(
            colors: [MandorTheme.darkGreen, MandorTheme.forestGreen],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
        );
      case 'ASISTEN':
        return const _SettingsRoleTheme(
          appBarColor: AsistenTheme.primaryBlueDark,
          primary: AsistenTheme.primaryBlue,
          headerGradient: AsistenTheme.headerGradient,
        );
      case 'MANAGER':
        return const _SettingsRoleTheme(
          appBarColor: ManagerTheme.primaryPurpleDark,
          primary: ManagerTheme.primaryPurple,
          headerGradient: ManagerTheme.headerGradient,
        );
      case 'AREA_MANAGER':
        return const _SettingsRoleTheme(
          appBarColor: AreaManagerTheme.primaryTealDark,
          primary: AreaManagerTheme.primaryTeal,
          headerGradient: AreaManagerTheme.headerGradient,
        );
      case 'SATPAM':
        return const _SettingsRoleTheme(
          appBarColor: GenZTheme.deepPurple,
          primary: GenZTheme.electricPurple,
          headerGradient: GenZTheme.primaryGradient,
        );
      case 'COMPANY_ADMIN':
        return const _SettingsRoleTheme(
          appBarColor: Color(0xFFEA580C),
          primary: Color(0xFFEA580C),
        );
      case 'SUPER_ADMIN':
        return const _SettingsRoleTheme(
          appBarColor: Color(0xFFB91C1C),
          primary: Color(0xFFB91C1C),
        );
      default:
        return const _SettingsRoleTheme(
          appBarColor: Color(0xFF16A34A),
          primary: Color(0xFF16A34A),
        );
    }
  }

  bool _canOpenAdminSettings() {
    final role = _currentRoleUpper();
    if (role.isEmpty) return false;

    return RoleService.hasPermission(role, 'system_configuration') ||
        RoleService.hasPermission(role, 'system_administration');
  }

  String _currentRoleUpper() {
    AuthState? state;
    try {
      state = BlocProvider.of<AuthBloc>(context, listen: false).state;
    } catch (_) {
      state = null;
    }

    if (state is AuthAuthenticated) {
      return state.user.role.toUpperCase();
    }
    if (state is AuthOfflineMode) {
      return state.user.role.toUpperCase();
    }

    return '';
  }
}

class _SettingsRoleTheme {
  final Color appBarColor;
  final Color primary;
  final LinearGradient? headerGradient;

  const _SettingsRoleTheme({
    required this.appBarColor,
    required this.primary,
    this.headerGradient,
  });
}
