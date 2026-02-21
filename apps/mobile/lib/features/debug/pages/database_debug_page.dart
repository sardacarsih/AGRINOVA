import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';

import '../../../core/services/database_service.dart';
import '../../../core/services/database_debug_service.dart';

/// Database Debug Page
/// 
/// Provides a comprehensive interface for testing and debugging SQLite database
/// functionality to ensure proper operation across different Android devices.
class DatabaseDebugPage extends StatefulWidget {
  const DatabaseDebugPage({Key? key}) : super(key: key);

  @override
  State<DatabaseDebugPage> createState() => _DatabaseDebugPageState();
}

class _DatabaseDebugPageState extends State<DatabaseDebugPage> {
  final DatabaseService _databaseService = DatabaseService();
  
  bool _isLoading = false;
  String _statusMessage = 'Ready to test database functionality';
  Map<String, dynamic>? _databaseInfo;
  Map<String, dynamic>? _diagnostics;
  String? _testResults;

  @override
  void initState() {
    super.initState();
    _loadDatabaseInfo();
  }

  Future<void> _loadDatabaseInfo() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Loading database information...';
    });

    try {
      final info = await _databaseService.getDatabaseInfo();
      final diagnostics = await DatabaseDebugService.getDatabaseDiagnostics();
      
      setState(() {
        _databaseInfo = info;
        _diagnostics = diagnostics;
        _statusMessage = 'Database information loaded successfully';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error loading database info: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _runDatabaseTests() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Running comprehensive database tests...';
      _testResults = null;
    });

    try {
      final result = await DatabaseDebugService.runDatabaseTests();
      
      setState(() {
        _testResults = result.getSummary();
        _statusMessage = result.success 
          ? 'All database tests passed successfully!'
          : 'Some database tests failed. Check results below.';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Database tests failed: $e';
        _testResults = 'Test execution failed: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _runPerformanceBenchmark() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Running performance benchmark...';
    });

    try {
      final results = await DatabaseDebugService.runPerformanceBenchmark();
      
      setState(() {
        _statusMessage = results['success'] 
          ? 'Performance benchmark completed'
          : 'Performance benchmark failed: ${results['error']}';
      });

      // Show performance results in dialog
      if (mounted) {
        _showPerformanceResults(results);
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Performance benchmark failed: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showPerformanceResults(Map<String, dynamic> results) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Performance Benchmark Results'),
        content: SingleChildScrollView(
          child: Text(
            const JsonEncoder.withIndent('  ').convert(results),
            style: const TextStyle(fontFamily: 'monospace'),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(
                text: const JsonEncoder.withIndent('  ').convert(results),
              ));
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Results copied to clipboard')),
              );
            },
            child: const Text('Copy'),
          ),
        ],
      ),
    );
  }

  void _copyDiagnostics() {
    if (_diagnostics != null) {
      final jsonString = const JsonEncoder.withIndent('  ').convert(_diagnostics);
      Clipboard.setData(ClipboardData(text: jsonString));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Diagnostics copied to clipboard')),
      );
    }
  }

  void _copyTestResults() {
    if (_testResults != null) {
      Clipboard.setData(ClipboardData(text: _testResults!));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Test results copied to clipboard')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Database Debug'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadDatabaseInfo,
            tooltip: 'Refresh Information',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            _buildStatusCard(),
            const SizedBox(height: 16),
            
            // Action Buttons
            _buildActionButtons(),
            const SizedBox(height: 16),
            
            // Database Information
            if (_databaseInfo != null) ...[
              _buildInfoCard('Database Information', _databaseInfo!),
              const SizedBox(height: 16),
            ],
            
            // Test Results
            if (_testResults != null) ...[
              _buildTestResultsCard(),
              const SizedBox(height: 16),
            ],
            
            // Diagnostics (Expandable)
            if (_diagnostics != null) _buildDiagnosticsCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            if (_isLoading) 
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              Icon(
                _testResults?.contains('FAIL') == true 
                  ? Icons.error 
                  : Icons.check_circle,
                color: _testResults?.contains('FAIL') == true 
                  ? Colors.red 
                  : Colors.green,
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _statusMessage,
                style: const TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _runDatabaseTests,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Run Tests'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _runPerformanceBenchmark,
                icon: const Icon(Icons.speed),
                label: const Text('Benchmark'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoCard(String title, Map<String, dynamic> data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: () {
                    final jsonString = const JsonEncoder.withIndent('  ').convert(data);
                    Clipboard.setData(ClipboardData(text: jsonString));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Data copied to clipboard')),
                    );
                  },
                  tooltip: 'Copy to Clipboard',
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...data.entries.map((entry) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 120,
                    child: Text(
                      '${entry.key}:',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      entry.value.toString(),
                      style: const TextStyle(fontFamily: 'monospace'),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildTestResultsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Test Results',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: _copyTestResults,
                  tooltip: 'Copy Results',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Text(
                _testResults!,
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

  Widget _buildDiagnosticsCard() {
    return Card(
      child: ExpansionTile(
        title: const Text(
          'Full Diagnostics',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.copy),
              onPressed: _copyDiagnostics,
              tooltip: 'Copy Diagnostics',
            ),
            const Icon(Icons.expand_more),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Text(
                const JsonEncoder.withIndent('  ').convert(_diagnostics),
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}