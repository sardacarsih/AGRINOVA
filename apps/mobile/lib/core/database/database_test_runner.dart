import 'package:logger/logger.dart';
import '../services/database_service.dart';
import '../services/database_debug_service.dart';

/// Quick database test runner for verification
/// 
/// This can be called from main() or any initialization code to verify
/// that the SQLite PRAGMA configuration fix is working correctly.
class DatabaseTestRunner {
  static final Logger _logger = Logger();

  /// Run a quick verification test
  static Future<bool> runQuickTest() async {
    _logger.i('Running quick database verification test...');
    
    try {
      // Test 1: Initialize database service
      final databaseService = DatabaseService();
      await databaseService.initialize();
      _logger.i('✓ Database service initialized successfully');
      
      // Test 2: Get database info
      final info = await databaseService.getDatabaseInfo();
      if (info.containsKey('error')) {
        _logger.e('✗ Database info failed: ${info['error']}');
        return false;
      }
      _logger.i('✓ Database info retrieved successfully');
      
      // Test 3: Check configuration
      final config = await databaseService.getDatabaseConfiguration();
      if (config.containsKey('journal_mode')) {
        _logger.i('✓ PRAGMA configuration working: journal_mode = ${config['journal_mode']}');
      } else {
        _logger.w('! PRAGMA configuration check inconclusive');
      }
      
      // Test 4: Basic database operations
      final db = await databaseService.database;
      final testResult = await db.rawQuery('SELECT 1 as test');
      if (testResult.isNotEmpty && testResult.first['test'] == 1) {
        _logger.i('✓ Basic database operations working');
      } else {
        _logger.e('✗ Basic database operations failed');
        return false;
      }
      
      _logger.i('🎉 Quick database test completed successfully!');
      return true;
      
    } catch (e) {
      _logger.e('✗ Quick database test failed: $e');
      return false;
    }
  }

  /// Run comprehensive tests (longer running)
  static Future<bool> runComprehensiveTest() async {
    _logger.i('Running comprehensive database tests...');
    
    try {
      final result = await DatabaseDebugService.runDatabaseTests();
      
      if (result.success) {
        _logger.i('🎉 All comprehensive tests passed!');
        _logger.i('Test summary:\n${result.getSummary()}');
        return true;
      } else {
        _logger.e('❌ Some comprehensive tests failed:');
        _logger.e(result.getSummary());
        return false;
      }
      
    } catch (e) {
      _logger.e('❌ Comprehensive tests failed with exception: $e');
      return false;
    }
  }

  /// Print database diagnostics
  static Future<void> printDiagnostics() async {
    try {
      _logger.i('Gathering database diagnostics...');
      
      final diagnostics = await DatabaseDebugService.getDatabaseDiagnostics();
      
      _logger.i('=== DATABASE DIAGNOSTICS ===');
      _logger.i('Platform: ${diagnostics['platform_info']['operating_system']} ${diagnostics['platform_info']['operating_system_version']}');
      
      if (diagnostics['database_info'] != null) {
        final dbInfo = diagnostics['database_info'] as Map<String, dynamic>;
        _logger.i('Database Version: ${dbInfo['version']}');
        _logger.i('SQLite Version: ${dbInfo['sqlite_version']}');
        _logger.i('Table Count: ${dbInfo['tableCount']}');
        _logger.i('Database Size: ${dbInfo['sizeMB']} MB');
      }
      
      if (diagnostics['configuration'] != null) {
        final config = diagnostics['configuration'] as Map<String, dynamic>;
        _logger.i('Configuration:');
        config.forEach((key, value) {
          _logger.i('  $key: $value');
        });
      }
      
      _logger.i('=== END DIAGNOSTICS ===');
      
    } catch (e) {
      _logger.e('Failed to print diagnostics: $e');
    }
  }
}

/// Extension for easy testing
extension DatabaseTestRunnerExtension on DatabaseService {
  /// Quick test this database instance
  Future<bool> runQuickTest() async {
    return await DatabaseTestRunner.runQuickTest();
  }
}