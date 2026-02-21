import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../../../core/services/database_service.dart';
import '../../../../core/services/performance_service.dart';
import '../widgets/performance_monitor.dart';

class DebugHarvestPerformancePage extends StatefulWidget {
  const DebugHarvestPerformancePage({super.key});

  @override
  State<DebugHarvestPerformancePage> createState() =>
      _DebugHarvestPerformancePageState();
}

class _DebugHarvestPerformancePageState
    extends State<DebugHarvestPerformancePage> {
  final _StopWatchTimerCompat _stopWatch = _StopWatchTimerCompat();
  final ScrollController _scrollController = ScrollController();
  final List<PerformanceMetric> _metrics = [];

  // Form field controllers
  final TextEditingController _mandorController = TextEditingController(
    text: 'mandor1',
  );
  final TextEditingController _blockController = TextEditingController(
    text: 'A1',
  );
  final TextEditingController _employeeController = TextEditingController(
    text: 'EMP001',
  );
  final TextEditingController _tbsController = TextEditingController(
    text: '500',
  );
  final TextEditingController _notesController = TextEditingController();

  // Performance tracking
  DateTime? _formStartTime;
  DateTime? _validationStartTime;
  DateTime? _saveStartTime;
  DateTime? _syncStartTime;
  DateTime? _completeTime;

  // Data generation
  final List<Map<String, dynamic>> _generatedEmployees = [];
  int _employeeCount = 1;

  // Network simulation
  bool _simulateSlowNetwork = false;
  bool _simulateOfflineMode = false;
  bool _simulateSyncFailure = false;

  @override
  void initState() {
    super.initState();
    _stopWatch.onStart();
    _formStartTime = DateTime.now();
    _generateTestData();
    _addMetric(
      'Page Load',
      DateTime.now().difference(_formStartTime!).inMilliseconds,
    );
  }

  @override
  void dispose() {
    _stopWatch.dispose();
    _scrollController.dispose();
    _mandorController.dispose();
    _blockController.dispose();
    _employeeController.dispose();
    _tbsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _generateTestData() {
    final random = Random();
    final blocks = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];
    final employees = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'];

    setState(() {
      _blockController.text = blocks[random.nextInt(blocks.length)];
      _employeeController.text = employees[random.nextInt(employees.length)];
      _tbsController.text = (300 + random.nextInt(400)).toString();
    });
  }

  void _addMetric(String operation, int durationMs, {String? details}) {
    setState(() {
      _metrics.add(
        PerformanceMetric(
          operation: operation,
          durationMs: durationMs,
          timestamp: DateTime.now(),
          details: details,
        ),
      );
    });

    // Auto-scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _runPerformanceTest() async {
    // Reset metrics
    setState(() {
      _metrics.clear();
      _formStartTime = DateTime.now();
    });

    _stopWatch.onReset();
    _stopWatch.onStart();

    try {
      // Test 1: Form validation
      await _testFormValidation();

      // Test 2: Local save
      await _testLocalSave();

      // Test 3: Multi-employee generation
      await _testMultiEmployeeGeneration();

      // Test 4: Photo simulation
      await _testPhotoSimulation();

      // Test 5: Sync operation
      if (!_simulateOfflineMode) {
        await _testSyncOperation();
      }

      // Test 6: Batch operations
      await _testBatchOperations();

      _completeTime = DateTime.now();
      final totalTime = _completeTime!
          .difference(_formStartTime!)
          .inMilliseconds;
      _addMetric(
        'TOTAL TEST TIME',
        totalTime,
        details: 'Complete performance test finished',
      );

      _showTestResults(totalTime);
    } catch (e) {
      _addMetric('ERROR', 0, details: 'Test failed: $e');
    } finally {
      _stopWatch.onStop();
    }
  }

  Future<void> _testFormValidation() async {
    _validationStartTime = DateTime.now();

    // Simulate form validation
    await Future.delayed(
      Duration(milliseconds: _simulateSlowNetwork ? 200 : 50),
    );

    // Validate fields
    final mandorValid = _mandorController.text.isNotEmpty;
    final blockValid = _blockController.text.isNotEmpty;
    final employeeValid = _employeeController.text.isNotEmpty;
    final tbsValid = double.tryParse(_tbsController.text) != null;

    await Future.delayed(
      Duration(milliseconds: _simulateSlowNetwork ? 100 : 20),
    );

    final totalTime = DateTime.now()
        .difference(_validationStartTime!)
        .inMilliseconds;

    _addMetric(
      'Form Validation',
      totalTime,
      details:
          'Mandor: $mandorValid, Block: $blockValid, Employee: $employeeValid, TBS: $tbsValid',
    );
  }

  Future<void> _testLocalSave() async {
    _saveStartTime = DateTime.now();

    // Create harvest record
    final harvestData = {
      'mandorId': _mandorController.text,
      'blockId': _blockController.text,
      'employees': _generatedEmployees.isNotEmpty
          ? _generatedEmployees
          : [
              {
                'employeeId': _employeeController.text,
                'tbsQuantity': double.tryParse(_tbsController.text) ?? 0,
                'tbsQuality': 85.0 + Random().nextDouble() * 10,
              },
            ],
      'notes': _notesController.text,
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'PENDING',
    };

    // Track database operation with PerformanceService
    await PerformanceService.instance.trackDatabaseOperation(
      'insert_harvest_record',
      () async {
        // Simulate database save
        await Future.delayed(
          Duration(milliseconds: _simulateSlowNetwork ? 300 : 100),
        );

        // Actual database operation (simulated)
        return await DatabaseService().insert('app_metrics', {
          'id': 'perf_${DateTime.now().millisecondsSinceEpoch}',
          'metric_name': 'harvest_debug_save',
          'metric_value': 1.0,
          'metric_type': 'COUNTER',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'metadata': harvestData.toString(),
        });
      },
      metadata: {
        'mandorId': _mandorController.text,
        'blockId': _blockController.text,
        'employeeCount': _generatedEmployees.isNotEmpty
            ? _generatedEmployees.length
            : 1,
      },
    );

    final saveTime = DateTime.now().difference(_saveStartTime!).inMilliseconds;
    _addMetric(
      'Local Save',
      saveTime,
      details: 'Harvest record saved to SQLite',
    );
  }

  Future<void> _testMultiEmployeeGeneration() async {
    final genStart = DateTime.now();

    setState(() {
      _generatedEmployees.clear();
      for (int i = 0; i < _employeeCount; i++) {
        _generatedEmployees.add({
          'employeeId': '${_employeeController.text.substring(0, 6)}${i + 1}',
          'tbsQuantity': 300 + Random().nextInt(400),
          'tbsQuality': 80.0 + Random().nextDouble() * 15,
        });
      }
    });

    await Future.delayed(
      Duration(milliseconds: _simulateSlowNetwork ? 50 : 10),
    );

    final genTime = DateTime.now().difference(genStart).inMilliseconds;
    _addMetric(
      'Multi-Employee Generation',
      genTime,
      details: '${_generatedEmployees.length} employees generated',
    );
  }

  Future<void> _testPhotoSimulation() async {
    final photoStart = DateTime.now();

    // Simulate photo capture and compression
    await Future.delayed(
      Duration(milliseconds: _simulateSlowNetwork ? 1000 : 300),
    );

    // Simulate multiple photos
    final photoCount = 3;
    for (int i = 0; i < photoCount; i++) {
      await Future.delayed(
        Duration(milliseconds: _simulateSlowNetwork ? 200 : 50),
      );
    }

    final photoTime = DateTime.now().difference(photoStart).inMilliseconds;
    _addMetric(
      'Photo Processing',
      photoTime,
      details: '$photoCount photos processed',
    );
  }

  Future<void> _testSyncOperation() async {
    _syncStartTime = DateTime.now();

    try {
      if (_simulateSyncFailure) {
        await Future.delayed(Duration(seconds: 5));
        throw Exception('Simulated sync failure');
      }

      // Simulate network sync
      await Future.delayed(
        Duration(milliseconds: _simulateSlowNetwork ? 2000 : 500),
      );

      // Simulate GraphQL mutation
      await Future.delayed(
        Duration(milliseconds: _simulateSlowNetwork ? 300 : 100),
      );

      final syncTime = DateTime.now()
          .difference(_syncStartTime!)
          .inMilliseconds;
      _addMetric(
        'Sync Operation',
        syncTime,
        details: 'Successfully synced to server',
      );
    } catch (e) {
      final syncTime = DateTime.now()
          .difference(_syncStartTime!)
          .inMilliseconds;
      _addMetric('Sync Failed', syncTime, details: 'Sync error: $e');
    }
  }

  Future<void> _testBatchOperations() async {
    final batchStart = DateTime.now();

    // Simulate batch insert for multiple harvest records
    final batchSize = 10;
    for (int i = 0; i < batchSize; i++) {
      await Future.delayed(
        Duration(milliseconds: _simulateSlowNetwork ? 20 : 5),
      );
    }

    final batchTime = DateTime.now().difference(batchStart).inMilliseconds;
    _addMetric(
      'Batch Operations',
      batchTime,
      details: '$batchSize records processed',
    );
  }

  void _showTestResults(int totalTime) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Performance Test Results'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total Time: ${totalTime}ms'),
            const SizedBox(height: 8),
            Text('Operations: ${_metrics.length}'),
            const SizedBox(height: 8),
            Text(
              'Average: ${(totalTime / _metrics.length).round()}ms per operation',
            ),
            const SizedBox(height: 16),
            const Text(
              'Status:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              totalTime < 3000
                  ? '🟢 Excellent'
                  : totalTime < 5000
                  ? '🟡 Good'
                  : totalTime < 8000
                  ? '🟠 Fair'
                  : '🔴 Needs Improvement',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _exportMetrics();
            },
            child: const Text('Export'),
          ),
        ],
      ),
    );
  }

  void _exportMetrics() {
    // Simulate export functionality
    final report = _metrics
        .map(
          (m) =>
              '${m.timestamp.toIso8601String()} - ${m.operation}: ${m.durationMs}ms${m.details != null ? ' (${m.details})' : ''}',
        )
        .join('\n');

    debugPrint('=== PERFORMANCE REPORT ===');
    debugPrint(report);
    debugPrint('=== END REPORT ===');

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Performance report exported to debug console'),
      ),
    );
  }

  void _runStressTest() async {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Starting stress test...')));

    for (int i = 0; i < 5; i++) {
      await _runPerformanceTest();
      await Future.delayed(const Duration(seconds: 1));
    }
    if (!mounted) return;

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Stress test completed!')));
  }

  Future<void> _runBenchmarkTests() async {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Running benchmark tests...')));

    final benchmarkStart = DateTime.now();

    try {
      // Database Benchmark
      final dbResult = await PerformanceService.instance.runDatabaseBenchmark();
      _addMetric(
        'Database Benchmark',
        dbResult.totalTimeMs,
        details: 'Success: ${dbResult.success}',
      );

      // Form Input Benchmark
      final formResult = await PerformanceService.instance
          .runFormInputBenchmark();
      _addMetric(
        'Form Input Benchmark',
        formResult.totalTimeMs,
        details: 'Success: ${formResult.success}',
      );

      final totalBenchmarkTime = DateTime.now()
          .difference(benchmarkStart)
          .inMilliseconds;
      _addMetric(
        'Total Benchmark Time',
        totalBenchmarkTime,
        details: 'Database + Form Input tests',
      );
      if (!mounted) return;

      _showBenchmarkResults(dbResult, formResult, totalBenchmarkTime);
    } catch (error) {
      _addMetric('Benchmark Error', 0, details: error.toString());
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Benchmark failed: $error')));
      }
    }
  }

  void _showBenchmarkResults(
    BenchmarkResult dbResult,
    BenchmarkResult formResult,
    int totalTime,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Benchmark Results'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Total Time: ${totalTime}ms'),
              const SizedBox(height: 16),

              const Text(
                'Database Performance:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              if (dbResult.success) ...[
                for (final entry in dbResult.results.entries)
                  Text('  ${entry.key}: ${entry.value}ms'),
              ] else
                Text(
                  '  Error: ${dbResult.error}',
                  style: TextStyle(color: Colors.red),
                ),

              const SizedBox(height: 16),

              const Text(
                'Form Input Performance:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              if (formResult.success) ...[
                for (final entry in formResult.results.entries)
                  Text('  ${entry.key}: ${entry.value}ms'),
              ] else
                Text(
                  '  Error: ${formResult.error}',
                  style: TextStyle(color: Colors.red),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PerformanceMonitor(
      enabled: true,
      onPerformanceWarning: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ Performance warning detected!'),
            backgroundColor: Colors.orange,
          ),
        );
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Harvest Performance Debug'),
          backgroundColor: Colors.red.withValues(alpha: 0.1),
          actions: [
            IconButton(
              onPressed: _clearMetrics,
              icon: const Icon(Icons.clear_all),
              tooltip: 'Clear Metrics',
            ),
            IconButton(
              onPressed: _exportMetrics,
              icon: const Icon(Icons.download),
              tooltip: 'Export Report',
            ),
          ],
        ),
        body: Column(
          children: [
            // Timer and Status
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.grey[100],
              child: Row(
                children: [
                  StreamBuilder<int>(
                    stream: _stopWatch.rawTime,
                    initialData: 0,
                    builder: (context, snapshot) {
                      final value = snapshot.data!;
                      final displayTime = _StopWatchTimerCompat.getDisplayTime(
                        value,
                      );
                      return Text(
                        'Timer: $displayTime',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      );
                    },
                  ),
                  const Spacer(),
                  _buildStatusChip(),
                ],
              ),
            ),

            // Control Panel
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Network Simulation',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      FilterChip(
                        label: const Text('Slow Network'),
                        selected: _simulateSlowNetwork,
                        onSelected: (value) =>
                            setState(() => _simulateSlowNetwork = value),
                      ),
                      FilterChip(
                        label: const Text('Offline Mode'),
                        selected: _simulateOfflineMode,
                        onSelected: (value) =>
                            setState(() => _simulateOfflineMode = value),
                      ),
                      FilterChip(
                        label: const Text('Sync Failure'),
                        selected: _simulateSyncFailure,
                        onSelected: (value) =>
                            setState(() => _simulateSyncFailure = value),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _runPerformanceTest,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Run Test'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: _runStressTest,
                        icon: const Icon(Icons.speed),
                        label: const Text('Stress Test'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: _runBenchmarkTests,
                        icon: const Icon(Icons.analytics),
                        label: const Text('Benchmark'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: _generateTestData,
                        icon: const Icon(Icons.refresh),
                        label: const Text('New Data'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Form Preview
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Test Data',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _mandorController,
                          decoration: const InputDecoration(
                            labelText: 'Mandor ID',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _blockController,
                          decoration: const InputDecoration(
                            labelText: 'Block',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _employeeController,
                          decoration: const InputDecoration(
                            labelText: 'Employee ID',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _tbsController,
                          decoration: const InputDecoration(
                            labelText: 'TBS Quantity',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 100,
                        child: TextField(
                          decoration: const InputDecoration(
                            labelText: 'Employees',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => setState(
                            () => _employeeCount = int.tryParse(value) ?? 1,
                          ),
                          controller: TextEditingController(
                            text: _employeeCount.toString(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Performance Metrics
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'Performance Metrics',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        Text('${_metrics.length} operations'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        controller: _scrollController,
                        itemCount: _metrics.length,
                        itemBuilder: (context, index) {
                          final metric = _metrics[index];
                          return PerformanceMetricCard(metric: metric);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip() {
    if (_metrics.isEmpty) {
      return const Chip(
        label: Text('Ready', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.grey,
      );
    }

    final lastMetric = _metrics.last;
    Color color;
    String status;

    if (lastMetric.operation.contains('ERROR') ||
        lastMetric.operation.contains('FAILED')) {
      color = Colors.red;
      status = 'Error';
    } else if (lastMetric.operation == 'TOTAL TEST TIME') {
      if (lastMetric.durationMs < 3000) {
        color = Colors.green;
        status = 'Excellent';
      } else if (lastMetric.durationMs < 5000) {
        color = Colors.lightGreen;
        status = 'Good';
      } else if (lastMetric.durationMs < 8000) {
        color = Colors.orange;
        status = 'Fair';
      } else {
        color = Colors.red;
        status = 'Poor';
      }
    } else {
      color = Colors.blue;
      status = 'Running';
    }

    return Chip(
      label: Text(status, style: const TextStyle(color: Colors.white)),
      backgroundColor: color,
    );
  }

  void _clearMetrics() {
    setState(() {
      _metrics.clear();
      _formStartTime = DateTime.now();
      _validationStartTime = null;
      _saveStartTime = null;
      _syncStartTime = null;
      _completeTime = null;
    });
    _stopWatch.onReset();
    _stopWatch.onStart();
  }
}

class _StopWatchTimerCompat {
  final Stopwatch _stopwatch = Stopwatch();
  final StreamController<int> _controller = StreamController<int>.broadcast();
  Timer? _ticker;

  Stream<int> get rawTime => _controller.stream;

  void onStart() {
    _stopwatch.start();
    _ticker ??= Timer.periodic(const Duration(milliseconds: 100), (_) {
      _controller.add(_stopwatch.elapsedMilliseconds);
    });
  }

  void onStop() {
    _stopwatch.stop();
  }

  void onReset() {
    _stopwatch.reset();
    _controller.add(0);
  }

  void dispose() {
    _ticker?.cancel();
    _controller.close();
  }

  static String getDisplayTime(int milliseconds) {
    final totalSeconds = milliseconds ~/ 1000;
    final minutes = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (totalSeconds % 60).toString().padLeft(2, '0');
    final centis = ((milliseconds % 1000) ~/ 10).toString().padLeft(2, '0');
    return '$minutes:$seconds.$centis';
  }
}

class PerformanceMetric {
  final String operation;
  final int durationMs;
  final DateTime timestamp;
  final String? details;

  PerformanceMetric({
    required this.operation,
    required this.durationMs,
    required this.timestamp,
    this.details,
  });
}

class PerformanceMetricCard extends StatelessWidget {
  final PerformanceMetric metric;

  const PerformanceMetricCard({super.key, required this.metric});

  @override
  Widget build(BuildContext context) {
    Color getColor() {
      if (metric.operation.contains('ERROR') ||
          metric.operation.contains('FAILED')) {
        return Colors.red.withValues(alpha: 0.1);
      }
      if (metric.durationMs < 100) {
        return Colors.green.withValues(alpha: 0.1);
      }
      if (metric.durationMs < 500) {
        return Colors.lightGreen.withValues(alpha: 0.1);
      }
      if (metric.durationMs < 1000) {
        return Colors.yellow.withValues(alpha: 0.1);
      }
      return Colors.orange.withValues(alpha: 0.1);
    }

    return Card(
      color: getColor(),
      margin: const EdgeInsets.only(bottom: 4),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            SizedBox(
              width: 120,
              child: Text(
                metric.operation,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            SizedBox(
              width: 60,
              child: Text(
                '${metric.durationMs}ms',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: metric.durationMs > 1000 ? Colors.red : Colors.black,
                ),
              ),
            ),
            const SizedBox(width: 8),
            if (metric.details != null)
              Expanded(
                child: Text(
                  metric.details!,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
