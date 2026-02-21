# Agrinova Mobile Database Migration Guide

## Overview
This guide covers the migration from the basic mobile database (v1) to the enhanced offline-first database (v2) with comprehensive JWT authentication and sync capabilities.

## Database Version History

### Version 1 (Basic Schema)
- Simple tables: users, harvest, harvest_workers, gate_checks
- Basic sync queue
- Limited security features

### Version 2 (Enhanced Schema)
- Comprehensive authentication & security tables
- Enhanced sync management with conflict resolution
- Role-based data structures
- Performance optimization with indexes
- Audit logging and monitoring

## Migration Process

### 1. Automatic Migration
The `EnhancedDatabaseService` automatically handles migration from v1 to v2:
- Detects existing database version
- Backs up existing data (if any)
- Creates new enhanced schema
- Migrates compatible data

### 2. Manual Migration Steps (if needed)

#### Step 1: Backup Existing Data
```dart
// Backup current database before migration
final backupPath = await getDatabasePath().then((path) => '${path}.backup');
final dbFile = File(await getDatabasePath());
if (await dbFile.exists()) {
  await dbFile.copy(backupPath);
}
```

#### Step 2: Initialize Enhanced Database
```dart
final dbService = EnhancedDatabaseService();
await dbService.database; // Triggers migration
```

#### Step 3: Verify Migration
```dart
final stats = await dbService.getDatabaseStats();
print('Migration completed. Database stats: $stats');
```

## Schema Changes

### New Tables Added

#### Authentication & Security
- `jwt_tokens` - JWT token management
- `user_devices` - Device authorization
- `biometric_auth` - Biometric authentication data
- `offline_auth` - Offline authentication support
- `security_events` - Security audit trail

#### Enhanced Master Data
- `companies` - Company master data with sync support
- `estates` - Estate data with location information
- `divisions` - Division data with area information
- `blocks` - Block data with GPS coordinates
- `employees` - Employee master data

#### User Assignment Tables
- `user_estates` - Manager multi-estate assignments
- `user_divisions` - Asisten multi-division assignments
- `area_manager_companies` - Area Manager multi-company assignments

#### Enhanced Operational Tables
- `harvest_records` - Enhanced harvest data with GPS, photos, and validation
- `harvest_employees` - Detailed employee work records
- `gate_check_records` - Comprehensive gate check data
- `gate_check_stats` - Daily gate statistics
- `qr_scan_history` - QR code scanning history

#### Sync & Conflict Management
- `sync_queue` - Enhanced sync queue with dependencies
- `sync_conflicts` - Conflict resolution data
- `sync_logs` - Sync operation audit trail

#### System & Monitoring
- `notifications` - Local notification management
- `user_activity_logs` - User activity tracking
- `system_metrics` - Performance metrics
- `app_settings` - Application settings

### Enhanced Fields

#### Common Enhancement Fields
- `sync_status` - Track sync state (PENDING, SYNCING, SYNCED, FAILED, CONFLICT)
- `version` / `local_version` / `server_version` - Version control for conflict resolution
- `conflict_data` - JSON data for conflict resolution
- `needs_sync` - Flag for records requiring sync

#### Security Fields
- `device_id` / `device_fingerprint` - Device identification
- `client_timestamp` - Mobile app timestamp
- `coordinates` - GPS location data
- `photo_paths` - Local photo storage paths

## Performance Optimizations

### Indexes Added
- **Authentication Indexes**: User lookups, token validation
- **Master Data Indexes**: Hierarchical queries, active records
- **Operational Indexes**: Date ranges, status filtering, sync operations
- **Sync Indexes**: Queue processing, conflict resolution

### Database Configuration
- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Optimized Cache**: 10MB cache size for better performance
- **Memory Temp Store**: Temporary tables in memory
- **Foreign Key Constraints**: Data integrity enforcement

## Data Migration Strategy

### Compatible Data
Data that can be migrated automatically:
- User basic information → `users` table
- Basic harvest records → `harvest_records` table
- Basic gate check records → `gate_check_records` table

### Enhanced Data
New data that will be populated on first use:
- JWT tokens (generated on login)
- Device information (collected on app startup)
- Master data (synced from server)
- User assignments (synced from server)

## Testing Migration

### Unit Tests
```dart
void main() {
  group('Database Migration Tests', () {
    test('should migrate from v1 to v2', () async {
      final db = EnhancedDatabaseService();
      await db.database;
      
      final stats = await db.getDatabaseStats();
      expect(stats['users'], isA<int>());
      expect(stats['harvest_records'], isA<int>());
    });
    
    test('should preserve existing data', () async {
      // Test data preservation during migration
    });
    
    test('should create all indexes', () async {
      // Test index creation
    });
  });
}
```

### Integration Tests
```dart
void main() {
  group('Enhanced Database Integration', () {
    test('should support JWT token operations', () async {
      final db = EnhancedDatabaseService();
      
      await db.storeJWTToken(
        userId: 'test-user',
        tokenType: 'ACCESS',
        tokenHash: 'hash123',
        deviceId: 'device123',
        deviceFingerprint: 'fingerprint',
        expiresAt: DateTime.now().add(Duration(hours: 1)),
      );
      
      final token = await db.getValidJWTToken('test-user', 'ACCESS');
      expect(token, isNotNull);
    });
    
    test('should support harvest operations', () async {
      final db = EnhancedDatabaseService();
      
      final harvestId = await db.createHarvestRecord({
        'block_id': 'block123',
        'mandor_id': 'mandor123',
        'harvest_date': DateTime.now().millisecondsSinceEpoch,
        'total_tbs': 100,
        'total_weight': 2500.0,
      });
      
      expect(harvestId, isNotNull);
      expect(harvestId.length, equals(36)); // UUID length
    });
  });
}
```

## Rollback Strategy

### If Migration Fails
1. **Restore Backup**: Copy backup database back to original location
2. **Use v1 Service**: Temporarily use original `DatabaseService`
3. **Report Issue**: Log migration failure details
4. **Manual Recovery**: Extract critical data manually if needed

### Rollback Code Example
```dart
Future<void> rollbackMigration() async {
  try {
    final dbPath = await getDatabasePath();
    final backupPath = '${dbPath}.backup';
    
    final backupFile = File(backupPath);
    if (await backupFile.exists()) {
      final dbFile = File(dbPath);
      await dbFile.delete();
      await backupFile.copy(dbPath);
      
      print('Database rolled back successfully');
    }
  } catch (e) {
    print('Rollback failed: $e');
  }
}
```

## Post-Migration Steps

### 1. Update App Configuration
```dart
// Update app_config.dart
static const int databaseVersion = 2;
static const String databaseName = 'agrinova_v2.db';
```

### 2. Initialize Services
```dart
// Update main.dart or service initialization
final dbService = EnhancedDatabaseService();
await dbService.database; // Initialize enhanced database
```

### 3. Update API Integration
- Ensure sync services work with new schema
- Update data models to match new structure
- Test JWT authentication flow

### 4. Verify Data Integrity
```dart
final stats = await dbService.getDatabaseStats();
print('Post-migration stats: $stats');

// Verify critical tables have expected data
final userCount = await dbService.query('users', columns: ['COUNT(*) as count']);
print('User count: ${userCount.first['count']}');
```

## Troubleshooting

### Common Issues

#### 1. Migration Timeout
**Problem**: Migration takes too long on large databases
**Solution**: 
```dart
// Increase database timeout
await openDatabase(
  dbPath,
  version: version,
  onCreate: _createTables,
  onUpgrade: _upgradeDatabase,
  onOpen: _onOpenDatabase,
  // Add timeout
  singleInstance: false,
);
```

#### 2. Foreign Key Constraint Failures
**Problem**: Data doesn't meet new foreign key requirements
**Solution**: 
```dart
// Temporarily disable foreign keys during migration
await db.execute('PRAGMA foreign_keys = OFF');
// Perform migration
await db.execute('PRAGMA foreign_keys = ON');
```

#### 3. Insufficient Storage Space
**Problem**: Enhanced database requires more storage
**Solution**: Check available storage before migration

#### 4. Index Creation Failures
**Problem**: Index creation fails due to data conflicts
**Solution**: Clean conflicting data before creating indexes

### Debug Commands

```dart
// Check database integrity
await db.execute('PRAGMA integrity_check');

// Analyze database statistics
await db.execute('ANALYZE');

// Check table structure
await db.rawQuery('PRAGMA table_info(users)');

// Check index usage
await db.rawQuery('EXPLAIN QUERY PLAN SELECT * FROM users WHERE user_id = ?', ['test']);
```

## Performance Monitoring

### Key Metrics to Monitor
- Database file size growth
- Query execution times
- Sync operation performance
- Conflict resolution efficiency
- Storage usage patterns

### Monitoring Code
```dart
Future<Map<String, dynamic>> getPerformanceMetrics() async {
  final stopwatch = Stopwatch()..start();
  
  // Test common queries
  await db.query('users', limit: 1);
  final userQueryTime = stopwatch.elapsedMicroseconds;
  
  stopwatch.reset();
  await db.query('harvest_records', 
    where: 'sync_status = ?', 
    whereArgs: ['PENDING'], 
    limit: 10
  );
  final harvestQueryTime = stopwatch.elapsedMicroseconds;
  
  return {
    'user_query_time_us': userQueryTime,
    'harvest_query_time_us': harvestQueryTime,
    'database_size_mb': await _getDatabaseSize(),
  };
}
```

This migration guide ensures a smooth transition to the enhanced database schema while maintaining data integrity and application functionality.
