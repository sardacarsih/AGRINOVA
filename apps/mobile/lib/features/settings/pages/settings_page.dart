import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../core/services/app_update_service.dart';
import '../../../core/di/dependency_injection.dart';
import '../../../core/network/dio_client.dart'; // Minimal REST client for settings
import '../../../core/models/app_update_models.dart';
import '../../../shared/widgets/app_update_widgets.dart';
import '../../auth/presentation/blocs/auth_bloc.dart';
import '../../dashboard/presentation/pages/asisten_dashboard/asisten_theme.dart';
import '../../dashboard/presentation/pages/manager_dashboard/manager_theme.dart';
import '../../dashboard/presentation/pages/area_manager_dashboard/area_manager_theme.dart';
import '../../dashboard/presentation/pages/mandor_dashboard/mandor_theme.dart';
import '../../gate_check/presentation/pages/satpam_dashboard/genz_theme.dart';
import 'package:url_launcher/url_launcher.dart';

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
  bool _isLoading = true;
  bool _isCheckingForUpdates = false;
  AppUpdateInfo? _pendingUpdate;

  @override
  void initState() {
    super.initState();
    _loadUpdatePolicy();
  }

  Future<void> _loadUpdatePolicy() async {
    try {
      // Initialize services if needed
      await _updateService.initialize();

      final policy = _updateService.getUpdatePolicy();
      final pendingUpdate = _updateService.pendingUpdate;

      if (mounted) {
        setState(() {
          _updatePolicy = policy;
          _pendingUpdate = pendingUpdate;
          _isLoading = false;
        });
      }
    } catch (e) {
      _logger.e('Failed to load update policy: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _checkForUpdates() async {
    if (_isCheckingForUpdates) return;

    try {
      setState(() => _isCheckingForUpdates = true);

      final updateInfo = await _updateService.checkForUpdates(forceCheck: true);

      if (mounted) {
        setState(() {
          _pendingUpdate = updateInfo;
          _isCheckingForUpdates = false;
        });

        if (updateInfo != null) {
          // Show update dialog
          await showDialog(
            context: context,
            builder: (context) => AppUpdateDialog(
              updateInfo: updateInfo,
              onUpdateTap: () {
                Navigator.of(context).pop();
                _startUpdate(updateInfo);
              },
              onLaterTap: updateInfo.isCritical
                  ? null
                  : () {
                      Navigator.of(context).pop();
                    },
              onSkipTap: updateInfo.isCritical
                  ? null
                  : () {
                      Navigator.of(context).pop();
                      _skipVersion(updateInfo.latestVersion);
                    },
            ),
          );
        } else {
          // Show no updates available message
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Aplikasi Agrinova Anda sudah versi terbaru'),
              backgroundColor: Colors.green,
            ),
          );
        }
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

    // Save the new policy
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
        appBar: AppBar(
          title: const Text('Pengaturan'),
          backgroundColor: roleTheme.appBarColor,
          foregroundColor: Colors.white,
          flexibleSpace: roleTheme.headerGradient == null
              ? null
              : Container(
                  decoration: BoxDecoration(
                    gradient: roleTheme.headerGradient!,
                  ),
                ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan'),
        backgroundColor: roleTheme.appBarColor,
        foregroundColor: Colors.white,
        flexibleSpace: roleTheme.headerGradient == null
            ? null
            : Container(
                decoration: BoxDecoration(gradient: roleTheme.headerGradient!),
              ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),

            // Update Settings Section
            _buildUpdateSection(roleTheme),

            const Divider(),

            // About Section
            _buildAboutSection(roleTheme),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildUpdateSection(_SettingsRoleTheme roleTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'Pembaruan Aplikasi',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),

        // Current Version Info
        Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Versi Saat Ini',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _isCheckingForUpdates
                          ? null
                          : _checkForUpdates,
                      icon: _isCheckingForUpdates
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.refresh, size: 18),
                      label: Text(
                        _isCheckingForUpdates
                            ? 'Memeriksa...'
                            : 'Periksa Sekarang',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: roleTheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                FutureBuilder<AppVersionInfo>(
                  future: () async {
                    await _updateService.initialize();
                    return _updateService.getCurrentVersion();
                  }(),
                  builder: (context, snapshot) {
                    if (snapshot.hasData) {
                      return Text(
                        'v${snapshot.data!.version} (tag git), build ${snapshot.data!.buildNumber}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      );
                    } else if (snapshot.hasError) {
                      return Text(
                        'Error: ${snapshot.error}',
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(color: Colors.red),
                      );
                    } else {
                      return const Text(
                        'Memuat info versi...',
                        style: TextStyle(color: Colors.grey),
                      );
                    }
                  },
                ),
                if (_pendingUpdate != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _pendingUpdate!.isCritical
                          ? Colors.red.shade50
                          : roleTheme.primary.withValues(alpha: 0.08),
                      border: Border.all(
                        color: _pendingUpdate!.isCritical
                            ? Colors.red.shade300
                            : roleTheme.primary.withValues(alpha: 0.35),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _pendingUpdate!.isCritical
                              ? 'Pembaruan Kritis Tersedia'
                              : 'Pembaruan Tersedia',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: _pendingUpdate!.isCritical
                                    ? Colors.red
                                    : roleTheme.primary,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Rilis terbaru: ${_pendingUpdate!.displayVersion}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: _pendingUpdate!.isCritical
                                  ? null
                                  : () {
                                      setState(() {
                                        _pendingUpdate = null;
                                      });
                                    },
                              child: const Text('Tutup'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () => _startUpdate(_pendingUpdate!),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _pendingUpdate!.isCritical
                                    ? Colors.red
                                    : roleTheme.primary,
                                foregroundColor: Colors.white,
                              ),
                              child: Text(
                                _pendingUpdate!.isCritical
                                    ? 'Perbarui Sekarang'
                                    : 'Perbarui',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Update Settings
        Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: AppUpdateSettingsWidget(
              policy: _updatePolicy,
              onPolicyChanged: _onPolicyChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAboutSection(_SettingsRoleTheme roleTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'About',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),

        Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.privacy_tip, color: roleTheme.primary),
                title: const Text('Privacy Policy'),
                subtitle: const Text('View our privacy policy'),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: _launchPrivacyPolicy,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _launchPrivacyPolicy() async {
    const url = 'https://agrinova.kskgroup.web.id/privacy-policy';
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not launch privacy policy'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error launching privacy policy: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
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
