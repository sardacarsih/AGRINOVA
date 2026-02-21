import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';
import 'database_service.dart';

/// Database debugging and testing service
/// 
/// Provides comprehensive testing and debugging capabilities for SQLite database
/// to ensure proper functionality across different Android devices and configurations.
class DatabaseDebugService {
  static final Logger _logger = Logger();
  static final DatabaseService _databaseService = DatabaseService();

  /// Run comprehensive database tests
  static Future<DatabaseTestResult> runDatabaseTests() async {
    _logger.i('Starting comprehensive database tests...');
    
    final result = DatabaseTestResult();
    final startTime = DateTime.now();

    try {
      // Test 1: Basic Initialization
      result.tests['initialization'] = await _testInitialization();
      
      // Test 2: PRAGMA Configuration
      result.tests['pragma_configuration'] = await _testPragmaConfiguration();
      
      // Test 3: Table Creation
      result.tests['table_creation'] = await _testTableCreation();
      
      // Test 4: Basic CRUD Operations
      result.tests['crud_operations'] = await _testCrudOperations();
      
      // Test 5: Transaction Support
      result.tests['transactions'] = await _testTransactions();
      
      // Test 6: Index Performance
      result.tests['indexes'] = await _testIndexes();
      
      // Test 7: Foreign Key Constraints
      result.tests['foreign_keys'] = await _testForeignKeys();
      
      result.success = result.tests.values.every((test) => test.success);
      result.duration = DateTime.now().difference(startTime);
      
      _logger.i('Database tests completed in ${result.duration.inMilliseconds}ms');
      
    } catch (e) {
      result.success = false;
      result.error = e.toString();
      _logger.e('Database tests failed: $e');
    }

    return result;
  }

  /// Test basic database initialization
  static Future<TestResult> _testInitialization() async {
    try {
      _logger.d('Testing database initialization...');
      
      final db = await _databaseService.database;
      if (!db.isOpen) {
        return TestResult(false, 'Database is not open');
      }

      final info = await _databaseService.getDatabaseInfo();
      if (info.containsKey('error')) {
        return TestResult(false, 'Database info error: ${info['error']}');
      }

      return TestResult(true, 'Database initialized successfully');
    } catch (e) {
      return TestResult(false, 'Initialization failed: $e');
    }
  }

  /// Test PRAGMA configuration compatibility
  static Future<TestResult> _testPragmaConfiguration() async {
    try {
      _logger.d('Testing PRAGMA configuration...');
      
      final config = await _databaseService.getDatabaseConfiguration();
      
      // Check required configurations
      final required = ['foreign_keys', 'journal_mode'];
      final missing = <String>[];
      
      for (final key in required) {
        if (!config.containsKey(key) || config[key] == 'unknown') {
          missing.add(key);
        }
      }
      
      if (missing.isNotEmpty) {
        return TestResult(false, 'Missing PRAGMA configurations: ${missing.join(', ')}');
      }
      
      // Log configuration details
      _logger.d('PRAGMA configuration: $config');
      
      return TestResult(true, 'PRAGMA configuration successful');
    } catch (e) {
      return TestResult(false, 'PRAGMA configuration failed: $e');
    }
  }

  /// Test table creation functionality
  static Future<TestResult> _testTableCreation() async {
    try {
      _logger.d('Testing table creation...');
      
      final db = await _databaseService.database;
      
      // Get table count
      final tables = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      final tableCount = tables.first['count'] as int;
      
      if (tableCount == 0) {
        return TestResult(false, 'No tables found in database');
      }
      
      // Check for key tables
      final keyTables = ['users', 'companies', 'estates', 'divisions', 'harvest_records'];
      final existingTables = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN (${keyTables.map((t) => "'$t'").join(',')})"
      );
      
      if (existingTables.length != keyTables.length) {
        return TestResult(false, 'Missing key tables. Found: ${existingTables.length}/${keyTables.length}');
      }
      
      return TestResult(true, 'Table creation successful ($tableCount tables)');
    } catch (e) {
      return TestResult(false, 'Table creation test failed: $e');
    }
  }

  /// Test basic CRUD operations
  static Future<TestResult> _testCrudOperations() async {
    try {
      _logger.d('Testing CRUD operations...');
      
      final testTableName = 'test_crud_${DateTime.now().millisecondsSinceEpoch}';
      final db = await _databaseService.database;
      
      // Create test table
      await db.execute('''
        CREATE TEMPORARY TABLE $testTableName (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      ''');
      
      // INSERT test
      final insertId = await db.insert(testTableName, {
        'name': 'test_record',
        'value': 42,
      });
      
      if (insertId == 0) {
        return TestResult(false, 'INSERT operation failed');
      }
      
      // SELECT test
      final selectResult = await db.query(
        testTableName, 
        where: 'id = ?', 
        whereArgs: [insertId]
      );
      
      if (selectResult.isEmpty) {
        return TestResult(false, 'SELECT operation failed');
      }
      
      // UPDATE test
      final updateCount = await db.update(
        testTableName,
        {'value': 84},
        where: 'id = ?',
        whereArgs: [insertId],
      );
      
      if (updateCount == 0) {
        return TestResult(false, 'UPDATE operation failed');
      }
      
      // DELETE test
      final deleteCount = await db.delete(
        testTableName,
        where: 'id = ?',
        whereArgs: [insertId],
      );
      
      if (deleteCount == 0) {
        return TestResult(false, 'DELETE operation failed');
      }
      
      // Clean up
      await db.execute('DROP TABLE $testTableName');
      
      return TestResult(true, 'CRUD operations successful');
    } catch (e) {
      return TestResult(false, 'CRUD operations failed: $e');
    }
  }

  /// Test transaction support
  static Future<TestResult> _testTransactions() async {
    try {
      _logger.d('Testing transaction support...');
      
      final db = await _databaseService.database;
      bool transactionCompleted = false;
      
      await db.transaction((txn) async {
        // Create temporary test table in transaction
        await txn.execute('''
          CREATE TEMPORARY TABLE test_transaction (
            id INTEGER PRIMARY KEY,
            data TEXT
          )
        ''');
        
        // Insert test data
        await txn.insert('test_transaction', {'id': 1, 'data': 'test'});
        
        // Verify data exists in transaction
        final result = await txn.query('test_transaction');
        if (result.isEmpty) {
          throw Exception('Transaction data not found');
        }
        
        transactionCompleted = true;
      });
      
      if (!transactionCompleted) {
        return TestResult(false, 'Transaction was not completed');
      }
      
      return TestResult(true, 'Transaction support working');
    } catch (e) {
      return TestResult(false, 'Transaction test failed: $e');
    }
  }

  /// Test index functionality
  static Future<TestResult> _testIndexes() async {
    try {
      _logger.d('Testing index functionality...');
      
      final db = await _databaseService.database;
      
      // Get index count
      final indexes = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
      );
      
      final indexCount = indexes.first['count'] as int;
      
      if (indexCount == 0) {
        return TestResult(false, 'No indexes found in database');
      }
      
      // Test index usage with EXPLAIN QUERY PLAN
      try {
        final queryPlan = await db.rawQuery(
          'EXPLAIN QUERY PLAN SELECT * FROM users WHERE username = ?',
          ['test']
        );
        
        // Log query plan for debugging
        _logger.d('Query plan: $queryPlan');
      } catch (e) {
        _logger.w('Query plan test failed: $e');
      }
      
      return TestResult(true, 'Index functionality working ($indexCount indexes)');
    } catch (e) {
      return TestResult(false, 'Index test failed: $e');
    }
  }

  /// Test foreign key constraints
  static Future<TestResult> _testForeignKeys() async {
    try {
      _logger.d('Testing foreign key constraints...');
      
      final config = await _databaseService.getDatabaseConfiguration();
      final foreignKeysEnabled = config['foreign_keys'] == 1 || config['foreign_keys'] == '1';
      
      if (!foreignKeysEnabled) {
        return TestResult(false, 'Foreign keys are not enabled');
      }
      
      return TestResult(true, 'Foreign key constraints enabled');
    } catch (e) {
      return TestResult(false, 'Foreign key test failed: $e');
    }
  }

  /// Get detailed database diagnostics
  static Future<Map<String, dynamic>> getDatabaseDiagnostics() async {
    try {
      final db = await _databaseService.database;
      final info = await _databaseService.getDatabaseInfo();
      final config = await _databaseService.getDatabaseConfiguration();
      
      // Get SQLite compile options
      List<Map<String, dynamic>> compileOptions = [];
      try {
        compileOptions = await db.rawQuery('PRAGMA compile_options');
      } catch (e) {
        _logger.w('Failed to get compile options: $e');
      }
      
      // Get database file stats
      final file = File(db.path);
      final fileStats = await file.stat();
      
      return {
        'database_info': info,
        'configuration': config,
        'compile_options': compileOptions,
        'file_stats': {
          'path': db.path,
          'size_bytes': fileStats.size,
          'modified': fileStats.modified.toIso8601String(),
          'type': fileStats.type.toString(),
        },
        'platform_info': {
          'is_android': Platform.isAndroid,
          'is_ios': Platform.isIOS,
          'operating_system': Platform.operatingSystem,
          'operating_system_version': Platform.operatingSystemVersion,
        },
        'timestamp': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      return {
        'error': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      };
    }
  }

  /// Performance benchmark
  static Future<Map<String, dynamic>> runPerformanceBenchmark() async {
    _logger.i('Running database performance benchmark...');
    
    final results = <String, dynamic>{};
    
    try {
      final db = await _databaseService.database;
      
      // Benchmark 1: Simple INSERT operations
      final insertStart = DateTime.now();
      await db.transaction((txn) async {
        for (int i = 0; i < 1000; i++) {
          await txn.execute('''
            INSERT INTO app_metrics (id, metric_name, metric_value, metric_type, timestamp) 
            VALUES (?, ?, ?, ?, ?)
          ''', [
            'bench_$i',
            'test_metric',
            i.toDouble(),
            'COUNTER',
            DateTime.now().millisecondsSinceEpoch,
          ]);
        }
      });
      final insertDuration = DateTime.now().difference(insertStart);
      results['insert_1000_records_ms'] = insertDuration.inMilliseconds;
      
      // Benchmark 2: SELECT operations
      final selectStart = DateTime.now();
      for (int i = 0; i < 100; i++) {
        await db.query('app_metrics', limit: 10);
      }
      final selectDuration = DateTime.now().difference(selectStart);
      results['select_100_queries_ms'] = selectDuration.inMilliseconds;
      
      // Cleanup benchmark data
      await db.delete('app_metrics', where: 'metric_name = ?', whereArgs: ['test_metric']);
      
      results['success'] = true;
    } catch (e) {
      results['success'] = false;
      results['error'] = e.toString();
    }
    
    return results;
  }
}

/// Test result for individual database tests
class TestResult {
  final bool success;
  final String message;
  
  TestResult(this.success, this.message);
  
  @override
  String toString() => 'TestResult(success: $success, message: $message)';
}

/// Comprehensive database test result
class DatabaseTestResult {
  bool success = false;
  String? error;
  Duration duration = Duration.zero;
  Map<String, TestResult> tests = {};
  
  /// Get formatted test summary
  String getSummary() {
    final successCount = tests.values.where((t) => t.success).length;
    final totalCount = tests.length;
    
    final buffer = StringBuffer();
    buffer.writeln('Database Test Summary:');
    buffer.writeln('Overall: ${success ? 'PASS' : 'FAIL'}');
    buffer.writeln('Tests: $successCount/$totalCount passed');
    buffer.writeln('Duration: ${duration.inMilliseconds}ms');
    
    if (error != null) {
      buffer.writeln('Error: $error');
    }
    
    buffer.writeln('\nDetailed Results:');
    tests.forEach((name, result) {
      final status = result.success ? 'PASS' : 'FAIL';
      buffer.writeln('  $name: $status - ${result.message}');
    });
    
    return buffer.toString();
  }
}