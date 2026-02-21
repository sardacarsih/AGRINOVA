import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/services/debug_auth_service.dart';
import '../../../../core/constants/api_constants.dart';

/// Debug authentication page for comprehensive auth testing
/// Accessible only in debug mode for troubleshooting auth issues
class DebugAuthPage extends StatefulWidget {
  const DebugAuthPage({Key? key}) : super(key: key);

  @override
  State<DebugAuthPage> createState() => _DebugAuthPageState();
}

class _DebugAuthPageState extends State<DebugAuthPage> {
  final _usernameController = TextEditingController(text: 'satpam');
  final _passwordController = TextEditingController(text: 'demo123');
  
  List<DebugTestResult> _testResults = [];
  bool _isRunning = false;
  String? _currentTest;
  late final DebugAuthService _debugService;

  @override
  void initState() {
    super.initState();
    _debugService = DebugAuthService.create();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Run comprehensive diagnostics
  Future<void> _runDiagnostics() async {
    if (_isRunning) return;

    setState(() {
      _isRunning = true;
      _testResults.clear();
      _currentTest = 'Initializing diagnostics...';
    });

    try {
      final username = _usernameController.text.trim();
      final password = _passwordController.text.trim();

      // Run tests one by one with UI updates
      final tests = [
        'System Information',
        'Network Connectivity', 
        'GraphQL Server Health',
        'Device Information',
        'Database Functionality',
        'GraphQL Authentication',
        'JWT Token Storage',
        'Offline Token Validation',
      ];

      for (int i = 0; i < tests.length; i++) {
        setState(() {
          _currentTest = '${tests[i]} (${i + 1}/${tests.length})';
        });

        // Small delay for UI responsiveness
        await Future.delayed(const Duration(milliseconds: 300));
      }

      // Run actual diagnostics
      final results = await _debugService.runComprehensiveDiagnostics(
        username: username,
        password: password,
      );

      setState(() {
        _testResults = results;
        _isRunning = false;
        _currentTest = null;
      });

      // Show completion message
      final passCount = results.where((r) => r.success).length;
      final totalCount = results.length;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Diagnostics completed: $passCount/$totalCount tests passed'),
          backgroundColor: passCount == totalCount ? Colors.green : Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      setState(() {
        _isRunning = false;
        _currentTest = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Diagnostics failed: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  /// Copy diagnostic report to clipboard
  Future<void> _copyDiagnosticReport() async {
    if (_testResults.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No test results available to copy'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final report = _debugService.generateDiagnosticReport(_testResults);
    await Clipboard.setData(ClipboardData(text: report));

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Diagnostic report copied to clipboard'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Clear test results
  void _clearResults() {
    setState(() {
      _testResults.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Authentication Diagnostics'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        actions: [
          if (_testResults.isNotEmpty)
            IconButton(
              onPressed: _copyDiagnosticReport,
              icon: const Icon(Icons.copy),
              tooltip: 'Copy Report',
            ),
          if (_testResults.isNotEmpty)
            IconButton(
              onPressed: _clearResults,
              icon: const Icon(Icons.clear),
              tooltip: 'Clear Results',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Warning Banner
            _buildWarningBanner(theme),
            
            const SizedBox(height: 16),
            
            // System Information Card
            _buildSystemInfoCard(theme),
            
            const SizedBox(height: 16),
            
            // Credentials Input Card
            _buildCredentialsCard(theme),
            
            const SizedBox(height: 16),
            
            // Run Diagnostics Button
            _buildRunDiagnosticsButton(theme),
            
            const SizedBox(height: 16),
            
            // Current Test Indicator
            if (_isRunning) _buildCurrentTestIndicator(theme),
            
            // Test Results
            if (_testResults.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildTestResults(theme),
            ],
          ],
        ),
      ),
    );
  }

  /// Warning banner for debug mode
  Widget _buildWarningBanner(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Debug Mode Only',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.orange.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'This diagnostic tool is for troubleshooting authentication issues. Use with caution.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.orange.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// System information card
  Widget _buildSystemInfoCard(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.blue),
                const SizedBox(width: 8),
                Text(
                  'System Information',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoRow('Base URL', ApiConstants.baseUrl),
            _buildInfoRow('GraphQL Endpoint', '${ApiConstants.baseUrl}/graphql'),
            _buildInfoRow('App Version', ApiConstants.appVersion),
            _buildInfoRow('Debug Mode', ApiConstants.isDebugMode.toString()),
            _buildInfoRow('Platform', Theme.of(context).platform.name),
          ],
        ),
      ),
    );
  }

  /// Info row helper
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
    );
  }

  /// Credentials input card
  Widget _buildCredentialsCard(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.account_circle, color: Colors.green),
                const SizedBox(width: 8),
                Text(
                  'Test Credentials',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Username field
            TextFormField(
              controller: _usernameController,
              decoration: const InputDecoration(
                labelText: 'Username',
                hintText: 'Enter username to test',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
              enabled: !_isRunning,
            ),
            
            const SizedBox(height: 16),
            
            // Password field
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password',
                hintText: 'Enter password to test',
                prefixIcon: Icon(Icons.lock),
                border: OutlineInputBorder(),
              ),
              enabled: !_isRunning,
            ),
            
            const SizedBox(height: 12),
            
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info, color: Colors.blue, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Default credentials: satpam / demo123',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Run diagnostics button
  Widget _buildRunDiagnosticsButton(ThemeData theme) {
    return ElevatedButton.icon(
      onPressed: _isRunning ? null : _runDiagnostics,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      icon: _isRunning
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : const Icon(Icons.play_arrow),
      label: Text(
        _isRunning ? 'Running Diagnostics...' : 'Run Comprehensive Diagnostics',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    );
  }

  /// Current test indicator
  Widget _buildCurrentTestIndicator(ThemeData theme) {
    return Card(
      color: Colors.blue.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Running Test',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _currentTest ?? 'Please wait...',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Test results display
  Widget _buildTestResults(ThemeData theme) {
    final passCount = _testResults.where((r) => r.success).length;
    final totalCount = _testResults.length;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Results header
        Card(
          color: passCount == totalCount ? Colors.green.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  passCount == totalCount ? Icons.check_circle : Icons.warning,
                  color: passCount == totalCount ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Test Results Summary',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$passCount of $totalCount tests passed',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _copyDiagnosticReport,
                  icon: const Icon(Icons.copy),
                  tooltip: 'Copy Full Report',
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: 8),
        
        // Individual test results
        ...(_testResults.map((result) => _buildTestResultCard(result, theme))),
      ],
    );
  }

  /// Individual test result card
  Widget _buildTestResultCard(DebugTestResult result, ThemeData theme) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        leading: Icon(
          result.success ? Icons.check_circle : Icons.error,
          color: result.success ? Colors.green : Colors.red,
        ),
        title: Text(
          result.testName,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(
          result.message,
          style: theme.textTheme.bodySmall,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: result.success ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            result.statusText,
            style: TextStyle(
              color: result.success ? Colors.green.shade700 : Colors.red.shade700,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
        children: [
          if (result.details != null && result.details!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Details:',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: theme.colorScheme.outline.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: result.details!.entries.map((entry) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 120,
                                child: Text(
                                  '${entry.key}:',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  entry.value.toString(),
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Timestamp: ${result.timestamp.toLocal()}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}