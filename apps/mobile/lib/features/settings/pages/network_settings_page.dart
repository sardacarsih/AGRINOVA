import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import 'dart:async';
import 'dart:io';

import '../../../core/services/config_service.dart';
import '../../../core/constants/api_constants.dart';

class NetworkSettingsPage extends StatefulWidget {
  const NetworkSettingsPage({Key? key}) : super(key: key);

  @override
  State<NetworkSettingsPage> createState() => _NetworkSettingsPageState();
}

class _NetworkSettingsPageState extends State<NetworkSettingsPage> {
  final Logger _logger = Logger();

  ConfigData? _currentConfig;
  bool _isLoading = true;
  bool _isTestingConnection = false;
  Map<String, dynamic>? _networkStatus;
  Environment _selectedEnvironment = Environment.development;
  StreamSubscription<ConfigData>? _configSubscription;

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
    _setupConfigurationListener();
  }

  @override
  void dispose() {
    _configSubscription?.cancel();
    super.dispose();
  }

  void _setupConfigurationListener() {
    _configSubscription = ConfigService.configStream.listen((config) {
      if (mounted) {
        setState(() {
          _currentConfig = config;
          _selectedEnvironment = config.environment;
        });
      }
    });
  }

  Future<void> _loadConfiguration() async {
    try {
      setState(() => _isLoading = true);

      final config = await ConfigService.getConfig();
      final status = await ConfigService.getStatus();

      setState(() {
        _currentConfig = config;
        _networkStatus = status;
        _selectedEnvironment = config.environment;
        _isLoading = false;
      });
    } catch (e) {
      _logger.e('Failed to load configuration: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _refreshConfiguration() async {
    try {
      await ConfigService.refreshConfiguration();
      await _loadConfiguration();
      _showSnackBar('Configuration refreshed', Colors.green);
    } catch (e) {
      _logger.e('Failed to refresh configuration: $e');
      _showSnackBar('Failed to refresh configuration', Colors.red);
    }
  }

  Future<void> _testConnection() async {
    try {
      setState(() => _isTestingConnection = true);

      final isReachable = await ConfigService.testConnection();
      _showSnackBar(
        isReachable ? 'Server is reachable!' : 'Server is not reachable',
        isReachable ? Colors.green : Colors.red,
      );
    } catch (e) {
      _logger.e('Connection test failed: $e');
      _showSnackBar('Connection test failed: $e', Colors.red);
    } finally {
      setState(() => _isTestingConnection = false);
    }
  }

  Future<void> _setEnvironment(Environment environment) async {
    try {
      await ConfigService.setEnvironment(environment);
      await _loadConfiguration();
      _showSnackBar('Environment changed to ${environment.name}', Colors.green);
    } catch (e) {
      _logger.e('Failed to set environment: $e');
      _showSnackBar('Failed to change environment', Colors.red);
    }
  }

  Future<void> _resetConfiguration() async {
    try {
      await ConfigService.resetToDefaults();
      await _loadConfiguration();
      _showSnackBar('Configuration reset to defaults', Colors.green);
    } catch (e) {
      _logger.e('Failed to reset configuration: $e');
      _showSnackBar('Failed to reset configuration', Colors.red);
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Network Settings'),
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
        title: const Text('Network Settings'),
        backgroundColor: Colors.green[600],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _refreshConfiguration,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCurrentStatusCard(),
            const SizedBox(height: 16),
            _buildEnvironmentCard(),
            const SizedBox(height: 16),
            _buildActionsCard(),
            if (_networkStatus != null) ...[
              const SizedBox(height: 16),
              _buildDebugInfoCard(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current Configuration',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildStatusRow('Environment', _currentConfig?.environment.name ?? 'Unknown'),
            _buildStatusRow('Base URL', _currentConfig?.baseUrl ?? 'Unknown'),
            if (kDebugMode) _buildStatusRow('API Constants URL', ApiConstants.baseUrl),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isTestingConnection ? null : _testConnection,
                icon: _isTestingConnection
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.wifi_find),
                label: Text(_isTestingConnection ? 'Testing...' : 'Test Connection'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnvironmentCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Environment',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Environment is set at build time via --dart-define-from-file. '
              'You can override it here for testing.',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 16),
            ...Environment.values.map((env) => RadioListTile<Environment>(
              title: Text(env.name.toUpperCase()),
              value: env,
              groupValue: _selectedEnvironment,
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedEnvironment = value);
                  _setEnvironment(value);
                }
              },
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Actions',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _resetConfiguration,
                icon: const Icon(Icons.restore),
                label: const Text('Reset to Defaults'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDebugInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Debug Information',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _formatDebugInfo(_networkStatus!),
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.grey[700],
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDebugInfo(Map<String, dynamic> info) {
    final buffer = StringBuffer();
    info.forEach((key, value) {
      buffer.writeln('$key: $value');
    });

    if (kDebugMode) {
      buffer.writeln('\n--- Real-time ---');
      buffer.writeln('API Constants Base URL: ${ApiConstants.baseUrl}');
      buffer.writeln('Last Updated: ${DateTime.now().toIso8601String()}');
    }

    return buffer.toString();
  }
}
