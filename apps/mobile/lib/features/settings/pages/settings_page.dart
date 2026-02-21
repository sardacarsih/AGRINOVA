import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../../../core/services/app_update_service.dart';
import '../../../core/di/dependency_injection.dart';
import '../../../core/network/dio_client.dart'; // Minimal REST client for settings
import '../../../core/models/app_update_models.dart';
import '../../../shared/widgets/app_update_widgets.dart';
import 'network_settings_page.dart';
import 'package:url_launcher/url_launcher.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({Key? key}) : super(key: key);

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final Logger _logger = Logger();
  final AppUpdateService _updateService = AppUpdateService(dioClient: locate<DioClient>());
  
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
              onLaterTap: updateInfo.isCritical ? null : () {
                Navigator.of(context).pop();
              },
              onSkipTap: updateInfo.isCritical ? null : () {
                Navigator.of(context).pop();
                _skipVersion(updateInfo.latestVersion);
              },
            ),
          );
        } else {
          // Show no updates available message
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You have the latest version of Agrinova'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Failed to check for updates: $e');
      if (mounted) {
        setState(() => _isCheckingForUpdates = false);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to check for updates: $e'),
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to start update: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _skipVersion(String version) async {
    await _updateService.skipVersion(version);
    if (mounted) {
      setState(() {
        _pendingUpdate = null;
      });
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Version $version will be skipped'),
      ),
    );
  }

  void _onPolicyChanged(AppUpdatePolicy newPolicy) {
    setState(() {
      _updatePolicy = newPolicy;
    });
    
    // Save the new policy
    _updateService.setUpdatePolicy(newPolicy);
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Update settings saved'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Settings'),
          backgroundColor: Colors.green[600],
          foregroundColor: Colors.white,
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Colors.green[600],
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            
            // Update Settings Section
            _buildUpdateSection(),
            
            const Divider(),
            
            // Network Settings
            _buildNetworkSettingsSection(),
            

            
            const Divider(),

            // About Section
            _buildAboutSection(),
            
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildUpdateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'App Updates',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
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
                      'Current Version',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _isCheckingForUpdates ? null : _checkForUpdates,
                      icon: _isCheckingForUpdates 
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh, size: 18),
                      label: Text(_isCheckingForUpdates ? 'Checking...' : 'Check Now'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                        'v${snapshot.data!.version} (build ${snapshot.data!.buildNumber})',
                        style: Theme.of(context).textTheme.bodyMedium,
                      );
                    } else if (snapshot.hasError) {
                      return Text(
                        'Error: ${snapshot.error}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.red,
                        ),
                      );
                    } else {
                      return const Text(
                        'Loading version info...',
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
                      color: _pendingUpdate!.isCritical ? Colors.red.shade50 : Colors.blue.shade50,
                      border: Border.all(
                        color: _pendingUpdate!.isCritical ? Colors.red.shade300 : Colors.blue.shade300,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _pendingUpdate!.isCritical 
                            ? 'Critical Update Available' 
                            : 'Update Available',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: _pendingUpdate!.isCritical ? Colors.red : Colors.blue,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Version ${_pendingUpdate!.latestVersion} is ready to install',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: _pendingUpdate!.isCritical ? null : () {
                                setState(() {
                                  _pendingUpdate = null;
                                });
                              },
                              child: const Text('Dismiss'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () => _startUpdate(_pendingUpdate!),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _pendingUpdate!.isCritical ? Colors.red : Colors.blue,
                                foregroundColor: Colors.white,
                              ),
                              child: Text(_pendingUpdate!.isCritical ? 'Update Now' : 'Update'),
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

  Widget _buildNetworkSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'Network',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        
        Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: ListTile(
            leading: const Icon(Icons.wifi, color: Colors.blue),
            title: const Text('Network Settings'),
            subtitle: const Text('Configure server connection and API settings'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NetworkSettingsPage(),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAboutSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'About',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        
        Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.privacy_tip, color: Colors.blue),
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
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}