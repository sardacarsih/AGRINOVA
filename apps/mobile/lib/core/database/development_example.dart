import 'package:logger/logger.dart';
import 'enhanced_database_service.dart';

/// Example usage of Enhanced Database Service in Development Mode
/// 
/// This example shows how to use the simplified database service
/// that automatically recreates the database on each app start.
/// 
/// Key Benefits for Development:
/// - No complex migrations to manage
/// - Fresh database schema on every restart
/// - Easy debugging and testing
/// - Quick schema changes without migration scripts
class DatabaseDevelopmentExample {
  static final Logger _logger = Logger();
  static late EnhancedDatabaseService _dbService;

  /// Initialize the database service in development mode
  static Future<void> initializeForDevelopment() async {
    _logger.i('Initializing database service in development mode...');
    
    _dbService = EnhancedDatabaseService();
    
    // The database will be automatically recreated on first access
    // due to _isDevelopmentMode = true
    await _dbService.database;
    
    _logger.i('Database initialized successfully');
    
    // Print development information
    await printDevelopmentStatus();
  }

  /// Print comprehensive development status
  static Future<void> printDevelopmentStatus() async {
    _logger.i('=== DEVELOPMENT MODE INFORMATION ===');
    
    // Get development info
    final devInfo = await _dbService.getDevelopmentInfo();
    _logger.i('Mode: ${devInfo['mode']}');
    _logger.i('Development Features: ${devInfo['development_features']}');
    _logger.i('Database Path: ${devInfo['database_path']}');
    _logger.i('Auto Recreate: ${devInfo['auto_recreate_on_start']}');
    
    // Get table information
    final tableNames = await _dbService.getTableNames();
    final tableCounts = await _dbService.getTableRowCounts();
    
    _logger.i('Total Tables: ${tableNames.length}');
    _logger.i('Tables Created:');
    for (final tableName in tableNames) {
      final count = tableCounts[tableName] ?? 0;
      _logger.i('  - $tableName: $count rows');
    }
    
    _logger.i('=====================================');
  }

  /// Example: Add test data for development
  static Future<void> addTestDataForDevelopment() async {
    if (!_dbService.isDevelopmentMode) {
      _logger.w('Test data insertion is only available in development mode');
      return;
    }

    _logger.i('Adding test data for development...');

    try {
      // Example: Create a test company
      await _dbService.insert('companies', {
        'company_id': 'test-company-1',
        'code': 'TEST001',
        'name': 'Test Company 1',
        'description': 'Test company for development',
        'is_active': 1,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      });

      // Example: Create a test user
      await _dbService.insert('users', {
        'user_id': 'test-user-1',
        'username': 'testuser',
        'full_name': 'Test User',
        'role': 'mandor',
        'company_id': 'test-company-1',
        'is_active': 1,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      });

      // Example: Create test estate
      await _dbService.insert('estates', {
        'estate_id': 'test-estate-1',
        'company_id': 'test-company-1',
        'code': 'EST001',
        'name': 'Test Estate 1',
        'location': 'Test Location',
        'is_active': 1,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      });

      _logger.i('Test data added successfully');
      
      // Print updated status
      await _dbService.printDatabaseStatus();
      
    } catch (e) {
      _logger.e('Error adding test data', error: e);
    }
  }

  /// Example: Test database recreation functionality
  static Future<void> testDatabaseRecreation() async {
    if (!_dbService.isDevelopmentMode) {
      _logger.w('Database recreation is only available in development mode');
      return;
    }

    _logger.i('Testing database recreation...');

    try {
      // Add some data first
      await addTestDataForDevelopment();
      
      _logger.i('Before recreation:');
      final beforeCounts = await _dbService.getTableRowCounts();
      _logger.i('Data: $beforeCounts');

      // Recreate database
      await _dbService.recreateDatabaseForDevelopment();

      _logger.i('After recreation:');
      final afterCounts = await _dbService.getTableRowCounts();
      _logger.i('Data: $afterCounts');

      _logger.i('Database recreation test completed');
      
    } catch (e) {
      _logger.e('Error during database recreation test', error: e);
    }
  }

  /// Example: Test schema reset functionality
  static Future<void> testSchemaReset() async {
    if (!_dbService.isDevelopmentMode) {
      _logger.w('Schema reset is only available in development mode');
      return;
    }

    _logger.i('Testing schema reset...');

    try {
      // Add some test data first
      await addTestDataForDevelopment();

      _logger.i('Before schema reset:');
      await _dbService.printDatabaseStatus();

      // Reset schema (drops all tables and recreates them)
      await _dbService.resetDatabaseSchema();

      _logger.i('After schema reset:');
      await _dbService.printDatabaseStatus();

      _logger.i('Schema reset test completed');
      
    } catch (e) {
      _logger.e('Error during schema reset test', error: e);
    }
  }

  /// Example: Quick development workflow
  static Future<void> quickDevelopmentWorkflow() async {
    _logger.i('=== QUICK DEVELOPMENT WORKFLOW ===');
    
    // 1. Initialize database
    await initializeForDevelopment();
    
    // 2. Add test data
    await addTestDataForDevelopment();
    
    // 3. Test some database operations
    final users = await _dbService.query('users', limit: 5);
    _logger.i('Found ${users.length} users in database');
    
    final companies = await _dbService.query('companies', limit: 5);
    _logger.i('Found ${companies.length} companies in database');
    
    // 4. Show final status
    _logger.i('=== FINAL STATUS ===');
    await _dbService.printDatabaseStatus();
    
    _logger.i('Quick development workflow completed!');
  }

  /// Development utility: Clear all data but keep tables
  static Future<void> clearAllDataKeepTables() async {
    if (!_dbService.isDevelopmentMode) {
      _logger.w('Data clearing is only available in development mode');
      return;
    }

    _logger.i('Clearing all data while keeping table structure...');

    try {
      final tableNames = await _dbService.getTableNames();
      
      for (final tableName in tableNames) {
        try {
          await _dbService.rawExecute('DELETE FROM $tableName');
          _logger.d('Cleared data from $tableName');
        } catch (e) {
          _logger.w('Failed to clear $tableName: $e');
        }
      }

      _logger.i('All data cleared successfully');
      await _dbService.printDatabaseStatus();
      
    } catch (e) {
      _logger.e('Error clearing data', error: e);
    }
  }
}

/// Simple usage example function
Future<void> runDatabaseDevelopmentExample() async {
  final logger = Logger();
  
  try {
    logger.i('Starting Database Development Example...');
    
    // Run the quick workflow
    await DatabaseDevelopmentExample.quickDevelopmentWorkflow();
    
    logger.i('Database Development Example completed successfully!');
    
  } catch (e) {
    logger.e('Error running database development example', error: e);
  }
}