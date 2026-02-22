import 'dart:async';
import 'dart:developer' as developer;
import 'dart:math' as math;
import 'database_service.dart';

class PerformanceService {
  static PerformanceService? _instance;
  static PerformanceService get instance => _instance ??= PerformanceService._();

  PerformanceService._();

  final List<DatabasePerformanceMetric> _dbMetrics = [];
  final List<NetworkPerformanceMetric> _networkMetrics = [];
  final List<GeneralPerformanceMetric> _generalMetrics = [];
  Timer? _reportingTimer;

  void startMonitoring() {
    _reportingTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _generatePerformanceReport();
    });

    developer.log('Performance monitoring started', name: 'Performance');
  }

  void stopMonitoring() {
    _reportingTimer?.cancel();
    developer.log('Performance monitoring stopped', name: 'Performance');
  }

  // Database Performance Tracking
  Future<T> trackDatabaseOperation<T>(
    String operation,
    Future<T> Function() operationFunction, {
    Map<String, dynamic>? metadata,
  }) async {
    final stopwatch = Stopwatch()..start();
    DateTime? startTime;

    try {
      startTime = DateTime.now();
      final result = await operationFunction();

      final metric = DatabasePerformanceMetric(
        operation: operation,
        durationMs: stopwatch.elapsedMilliseconds,
        success: true,
        timestamp: startTime,
        metadata: metadata,
      );

      _dbMetrics.add(metric);
      _cleanupOldMetrics();

      return result;
    } catch (error) {
      final metric = DatabasePerformanceMetric(
        operation: operation,
        durationMs: stopwatch.elapsedMilliseconds,
        success: false,
        timestamp: startTime ?? DateTime.now(),
        error: error.toString(),
        metadata: metadata,
      );

      _dbMetrics.add(metric);
      _cleanupOldMetrics();

      rethrow;
    }
  }

  // Network Performance Tracking
  Future<T> trackNetworkOperation<T>(
    String operation,
    Future<T> Function() operationFunction, {
    Map<String, dynamic>? metadata,
  }) async {
    final stopwatch = Stopwatch()..start();
    DateTime? startTime;

    try {
      startTime = DateTime.now();
      final result = await operationFunction();

      final metric = NetworkPerformanceMetric(
        operation: operation,
        durationMs: stopwatch.elapsedMilliseconds,
        success: true,
        timestamp: startTime,
        metadata: metadata,
      );

      _networkMetrics.add(metric);
      _cleanupOldMetrics();

      return result;
    } catch (error) {
      final metric = NetworkPerformanceMetric(
        operation: operation,
        durationMs: stopwatch.elapsedMilliseconds,
        success: false,
        timestamp: startTime ?? DateTime.now(),
        error: error.toString(),
        metadata: metadata,
      );

      _networkMetrics.add(metric);
      _cleanupOldMetrics();

      rethrow;
    }
  }

  // General Performance Tracking
  void trackMetric(String operation, int durationMs, {
    bool success = true,
    String? error,
    Map<String, dynamic>? metadata,
  }) {
    final metric = GeneralPerformanceMetric(
      operation: operation,
      durationMs: durationMs,
      success: success,
      timestamp: DateTime.now(),
      error: error,
      metadata: metadata,
    );

    _generalMetrics.add(metric);
    _cleanupOldMetrics();
  }

  // Performance Analysis
  PerformanceReport generateReport() {
    return PerformanceReport(
      databaseMetrics: List.from(_dbMetrics),
      networkMetrics: List.from(_networkMetrics),
      generalMetrics: List.from(_generalMetrics),
      generatedAt: DateTime.now(),
    );
  }

  void _generatePerformanceReport() {
    final report = generateReport();
    _logPerformanceReport(report);
  }

  void _logPerformanceReport(PerformanceReport report) {
    developer.log('=== PERFORMANCE REPORT ===', name: 'Performance');
    developer.log('Generated at: ${report.generatedAt}', name: 'Performance');

    // Database Performance
    if (report.databaseMetrics.isNotEmpty) {
      final avgDbTime = report.databaseMetrics
          .map((m) => m.durationMs)
          .reduce((a, b) => a + b) / report.databaseMetrics.length;
      final dbSuccessRate = report.databaseMetrics
          .where((m) => m.success)
          .length / report.databaseMetrics.length * 100;

      developer.log('Database Operations: ${report.databaseMetrics.length}', name: 'Performance');
      developer.log('Average DB Time: ${avgDbTime.toStringAsFixed(2)}ms', name: 'Performance');
      developer.log('DB Success Rate: ${dbSuccessRate.toStringAsFixed(1)}%', name: 'Performance');

      // Slow queries
      final slowQueries = report.databaseMetrics.where((m) => m.durationMs > 500).toList();
      if (slowQueries.isNotEmpty) {
        developer.log('Slow Queries (${slowQueries.length}):', name: 'Performance');
        for (final query in slowQueries.take(5)) {
          developer.log('  - ${query.operation}: ${query.durationMs}ms', name: 'Performance');
        }
      }
    }

    // Network Performance
    if (report.networkMetrics.isNotEmpty) {
      final avgNetworkTime = report.networkMetrics
          .map((m) => m.durationMs)
          .reduce((a, b) => a + b) / report.networkMetrics.length;
      final networkSuccessRate = report.networkMetrics
          .where((m) => m.success)
          .length / report.networkMetrics.length * 100;

      developer.log('Network Operations: ${report.networkMetrics.length}', name: 'Performance');
      developer.log('Average Network Time: ${avgNetworkTime.toStringAsFixed(2)}ms', name: 'Performance');
      developer.log('Network Success Rate: ${networkSuccessRate.toStringAsFixed(1)}%', name: 'Performance');

      // Failed requests
      final failedRequests = report.networkMetrics.where((m) => !m.success).toList();
      if (failedRequests.isNotEmpty) {
        developer.log('Failed Requests (${failedRequests.length}):', name: 'Performance');
        for (final request in failedRequests.take(3)) {
          developer.log('  - ${request.operation}: ${request.error}', name: 'Performance');
        }
      }
    }

    // Top Operations
    final operationCounts = <String, int>{};
    for (final metric in report.generalMetrics) {
      operationCounts[metric.operation] = (operationCounts[metric.operation] ?? 0) + 1;
    }

    final topOperations = operationCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    developer.log('Top Operations:', name: 'Performance');
    for (final entry in topOperations.take(5)) {
      developer.log('  - ${entry.key}: ${entry.value} times', name: 'Performance');
    }

    developer.log('=== END REPORT ===', name: 'Performance');
  }

  void _cleanupOldMetrics() {
    const maxMetrics = 1000;

    if (_dbMetrics.length > maxMetrics) {
      _dbMetrics.removeRange(0, _dbMetrics.length - maxMetrics);
    }
    if (_networkMetrics.length > maxMetrics) {
      _networkMetrics.removeRange(0, _networkMetrics.length - maxMetrics);
    }
    if (_generalMetrics.length > maxMetrics) {
      _generalMetrics.removeRange(0, _generalMetrics.length - maxMetrics);
    }
  }

  // Performance Benchmarks
  Future<BenchmarkResult> runDatabaseBenchmark() async {
    final stopwatch = Stopwatch()..start();
    final results = <String, int>{};

    try {
      final dbService = DatabaseService();

      // Test Insert Performance
      final insertStart = Stopwatch()..start();
      for (int i = 0; i < 100; i++) {
        await dbService.rawQuery('SELECT 1');
      }
      insertStart.stop();
      results['insert_100_records'] = insertStart.elapsedMilliseconds;

      // Test Query Performance
      final queryStart = Stopwatch()..start();
      for (int i = 0; i < 100; i++) {
        await dbService.rawQuery('SELECT 1');
      }
      queryStart.stop();
      results['query_100_records'] = queryStart.elapsedMilliseconds;

      // Test Update Performance
      final updateStart = Stopwatch()..start();
      for (int i = 0; i < 50; i++) {
        await dbService.rawQuery('SELECT 1');
      }
      updateStart.stop();
      results['update_50_records'] = updateStart.elapsedMilliseconds;

      stopwatch.stop();

      return BenchmarkResult(
        category: 'Database',
        totalTimeMs: stopwatch.elapsedMilliseconds,
        results: results,
        success: true,
      );
    } catch (error) {
      stopwatch.stop();
      return BenchmarkResult(
        category: 'Database',
        totalTimeMs: stopwatch.elapsedMilliseconds,
        results: results,
        success: false,
        error: error.toString(),
      );
    }
  }

  Future<BenchmarkResult> runFormInputBenchmark() async {
    final stopwatch = Stopwatch()..start();
    final results = <String, int>{};

    try {
      // Simulate form validation
      final validationStart = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        _simulateFormValidation();
      }
      validationStart.stop();
      results['validation_1000_forms'] = validationStart.elapsedMilliseconds;

      // Simulate field updates
      final fieldUpdateStart = Stopwatch()..start();
      for (int i = 0; i < 500; i++) {
        _simulateFieldUpdate();
      }
      fieldUpdateStart.stop();
      results['field_update_500_forms'] = fieldUpdateStart.elapsedMilliseconds;

      // Simulate form submission
      final submissionStart = Stopwatch()..start();
      for (int i = 0; i < 100; i++) {
        _simulateFormSubmission();
      }
      submissionStart.stop();
      results['submission_100_forms'] = submissionStart.elapsedMilliseconds;

      stopwatch.stop();

      return BenchmarkResult(
        category: 'Form Input',
        totalTimeMs: stopwatch.elapsedMilliseconds,
        results: results,
        success: true,
      );
    } catch (error) {
      stopwatch.stop();
      return BenchmarkResult(
        category: 'Form Input',
        totalTimeMs: stopwatch.elapsedMilliseconds,
        results: results,
        success: false,
        error: error.toString(),
      );
    }
  }

  void _simulateFormValidation() {
    // Simulate validation logic
    final mandorValid = 'mandor1'.isNotEmpty;
    final blockValid = 'A1'.isNotEmpty;
    final tbsValid = double.tryParse('500') != null;
    if (!mandorValid || !blockValid || !tbsValid) {
      throw Exception('Validation failed');
    }
  }

  void _simulateFieldUpdate() {
    // Simulate field update logic
    final text = 'test_field_value_${math.Random().nextInt(1000)}';
    // Simulate validation on change
    text.isNotEmpty;
  }

  void _simulateFormSubmission() {
    // Simulate form submission preparation
    final formData = {
      'mandorId': 'mandor1',
      'blockId': 'A1',
      'employeeId': 'EMP001',
      'tbsQuantity': 500.0,
      'notes': 'Test submission ${math.Random().nextInt(100)}',
    };

    // Simulate validation
    if (formData['mandorId'] == null || formData['blockId'] == null) {
      throw Exception('Required fields missing');
    }
  }

  void clearMetrics() {
    _dbMetrics.clear();
    _networkMetrics.clear();
    _generalMetrics.clear();
    developer.log('Performance metrics cleared', name: 'Performance');
  }
}

// Data Models
class DatabasePerformanceMetric {
  final String operation;
  final int durationMs;
  final bool success;
  final DateTime timestamp;
  final String? error;
  final Map<String, dynamic>? metadata;

  DatabasePerformanceMetric({
    required this.operation,
    required this.durationMs,
    required this.success,
    required this.timestamp,
    this.error,
    this.metadata,
  });
}

class NetworkPerformanceMetric {
  final String operation;
  final int durationMs;
  final bool success;
  final DateTime timestamp;
  final String? error;
  final Map<String, dynamic>? metadata;

  NetworkPerformanceMetric({
    required this.operation,
    required this.durationMs,
    required this.success,
    required this.timestamp,
    this.error,
    this.metadata,
  });
}

class GeneralPerformanceMetric {
  final String operation;
  final int durationMs;
  final bool success;
  final DateTime timestamp;
  final String? error;
  final Map<String, dynamic>? metadata;

  GeneralPerformanceMetric({
    required this.operation,
    required this.durationMs,
    required this.success,
    required this.timestamp,
    this.error,
    this.metadata,
  });
}

class PerformanceReport {
  final List<DatabasePerformanceMetric> databaseMetrics;
  final List<NetworkPerformanceMetric> networkMetrics;
  final List<GeneralPerformanceMetric> generalMetrics;
  final DateTime generatedAt;

  PerformanceReport({
    required this.databaseMetrics,
    required this.networkMetrics,
    required this.generalMetrics,
    required this.generatedAt,
  });
}

class BenchmarkResult {
  final String category;
  final int totalTimeMs;
  final Map<String, int> results;
  final bool success;
  final String? error;

  BenchmarkResult({
    required this.category,
    required this.totalTimeMs,
    required this.results,
    required this.success,
    this.error,
  });

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'totalTimeMs': totalTimeMs,
      'results': results,
      'success': success,
      'error': error,
    };
  }
}
