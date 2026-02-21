import 'dart:async';
import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:logger/logger.dart';
// Removed complex migrations for development mode
import 'database_tables_service.dart';
import 'database_operations_service.dart';
import 'database_sync_service.dart';

/// Enhanced Database Service for Agrinova Mobile App (Refactored)
///
/// Features:
/// - Offline-first architecture with SQLite
/// - JWT authentication support with secure token management
/// - Comprehensive sync management with conflict resolution
/// - Role-based data access (Mandor, Asisten, Satpam)
/// - Performance-optimized with proper indexing
/// - Transaction support for data integrity
/// - Audit logging and security event tracking
///
/// This is the main orchestrator that coordinates specialized services:
/// - DatabaseTablesService: Schema management and table creation
/// - DatabaseOperationsService: CRUD operations and role-specific methods
/// - DatabaseSyncService: Synchronization and authentication management
class EnhancedDatabaseService {
  static Database? _database;
  static final EnhancedDatabaseService _instance =
      EnhancedDatabaseService._internal();
  static const String _mandorDatabaseName = 'agrinova_mandor.db';
  static const String _satpamDatabaseName = 'agrinova_satpam.db';
  static String _activeDatabaseName = _mandorDatabaseName;

  factory EnhancedDatabaseService() => _instance;
  EnhancedDatabaseService._internal();

  final Logger _logger = Logger();

  // Service instances
  final DatabaseTablesService _tablesService = DatabaseTablesService();
  final DatabaseOperationsService _operationsService =
      DatabaseOperationsService();
  final DatabaseSyncService _syncService = DatabaseSyncService();

  // Development mode configuration
  static const int _currentDatabaseVersion =
      26; // Added harvest_records employee division snapshot columns
  static const bool _isDevelopmentMode = true;
  static const bool _recreateDatabaseOnStartupInDevelopment = false;

  // Get database instance (singleton) with connection validation
  Future<Database> get database async {
    if (_database != null) {
      // Validate the connection is still usable
      try {
        await _database!.rawQuery('SELECT 1');
      } catch (e) {
        _logger.w('Database connection stale, reopening: $e');
        try {
          await _database!.close();
        } catch (_) {}
        _database = null;
      }
    }
    _database ??= await _initDatabase();
    return _database!;
  }

  /// Force refresh database connection (call this if you get SQLITE_READONLY_DBMOVED)
  Future<Database> refreshConnection() async {
    _logger.i('Forcing database connection refresh...');
    if (_database != null) {
      try {
        await _database!.close();
      } catch (e) {
        _logger.w('Error closing stale database: $e');
      }
      _database = null;
    }
    return await database;
  }

  Future<void> configureDatabaseForRole(String? role) async {
    final normalizedRole = (role ?? '').trim().toLowerCase();
    final targetDatabaseName = _databaseNameForRole(normalizedRole);

    if (_isDevelopmentMode &&
        targetDatabaseName == _satpamDatabaseName &&
        _activeDatabaseName != _satpamDatabaseName) {
      await _ensureSatpamDatabaseSeededFromMandor();
    }

    if (_activeDatabaseName == targetDatabaseName) {
      _logger.d(
          'Database already configured for role=$normalizedRole using $_activeDatabaseName');
      return;
    }

    await closeDatabase();
    _activeDatabaseName = targetDatabaseName;
    _logger.i(
        'Switched active database for role=$normalizedRole to $_activeDatabaseName');

    await database;
  }

  Future<void> resetToDefaultDatabaseProfile() async {
    if (_activeDatabaseName == _mandorDatabaseName) {
      return;
    }
    await closeDatabase();
    _activeDatabaseName = _mandorDatabaseName;
    _logger.i('Reset active database profile to $_activeDatabaseName');
  }

  String _databaseNameForRole(String normalizedRole) {
    if (normalizedRole == 'satpam') {
      return _satpamDatabaseName;
    }
    if (normalizedRole == 'mandor') {
      return _mandorDatabaseName;
    }

    if (_isDevelopmentMode) {
      return _mandorDatabaseName;
    }

    return 'agrinova_v2.db';
  }

  Future<void> _ensureSatpamDatabaseSeededFromMandor() async {
    final sourcePath = await _getDatabasePathForName(_mandorDatabaseName);
    final targetPath = await _getDatabasePathForName(_satpamDatabaseName);
    final sourceFile = File(sourcePath);
    final targetFile = File(targetPath);

    if (!await sourceFile.exists()) {
      _logger.w(
          'Source database $_mandorDatabaseName not found. Satpam DB will be initialized empty.');
      return;
    }
    if (await targetFile.exists()) {
      _logger.i(
          'Satpam database already exists at $targetPath, skipping dev copy.');
      return;
    }

    await sourceFile.copy(targetPath);
    _logger.i('Seeded $_satpamDatabaseName from $_mandorDatabaseName');

    final sourceWal = File('$sourcePath-wal');
    final sourceShm = File('$sourcePath-shm');
    if (await sourceWal.exists()) {
      await sourceWal.copy('$targetPath-wal');
    }
    if (await sourceShm.exists()) {
      await sourceShm.copy('$targetPath-shm');
    }
  }

  // Initialize enhanced database with new schema
  Future<Database> _initDatabase() async {
    try {
      final String dbPath = await getDatabasePath();

      _logger.i(
          'Initializing enhanced database at: $dbPath (Development Mode: $_isDevelopmentMode, Active DB: $_activeDatabaseName)');

      // Development-only optional database recreation
      if (_isDevelopmentMode && _recreateDatabaseOnStartupInDevelopment) {
        final file = File(dbPath);
        if (await file.exists()) {
          await file.delete();
          _logger.i(
              '🗑️ DELETED existing database for fresh development schema v$_currentDatabaseVersion');
        }

        // Also delete any related files (WAL, SHM)
        final walFile = File('$dbPath-wal');
        final shmFile = File('$dbPath-shm');
        if (await walFile.exists()) {
          await walFile.delete();
          _logger.i('🗑️ Deleted WAL file');
        }
        if (await shmFile.exists()) {
          await shmFile.delete();
          _logger.i('🗑️ Deleted SHM file');
        }
      }

      Database db;

      try {
        // Simple initialization for development
        db = await openDatabase(
          dbPath,
          version: _currentDatabaseVersion,
          onCreate: _createEnhancedTables,
          onUpgrade: _onUpgradeDatabase,
          onOpen: _onOpenDatabase,
        );
        _logger.i(
            '✅ Database created successfully with NEW SCHEMA v$_currentDatabaseVersion');
        _logger.i(
            '✅ Schema: usage_metadata in used_tokens, removed redundant username from gate_guest_logs');
      } catch (error) {
        _logger.e('Database initialization failed', error: error);
        rethrow;
      }

      _logger.i('Enhanced database initialization completed successfully');
      return db;
    } catch (e) {
      _logger.e('Critical error during database initialization', error: e);
      rethrow;
    }
  }

  // Development mode: No complex table verification needed
  // Tables are always created fresh, so verification is unnecessary

  // Create all enhanced tables (Development Mode - Simple Creation)
  Future<void> _createEnhancedTables(Database db, int version) async {
    _logger.i(
        'Creating enhanced database tables for development (version: $version)');
    await _tablesService.createEnhancedTables(db, version);
    _logger.i('Enhanced database tables created successfully');
  }

  // Database upgrade handler
  Future<void> _onUpgradeDatabase(
      Database db, int oldVersion, int newVersion) async {
    _logger.i('Upgrading database from v$oldVersion to v$newVersion');

    if (oldVersion < 12) {
      // v12: Fix gate_check_photos CHECK constraints for photo sync
      // Recreate table with expanded photo_type CHECK (adds VEHICLE_FRONT, VEHICLE_BACK)
      // and default values for file_extension/mime_type
      _logger
          .i('Applying v12 migration: expanding gate_check_photos constraints');
      try {
        // Backup existing data
        await db.execute(
            'CREATE TABLE IF NOT EXISTS gate_check_photos_backup_v11 AS SELECT * FROM gate_check_photos');

        // Drop and recreate with corrected CHECK constraints
        await db.execute('DROP TABLE IF EXISTS gate_check_photos');
        await db.execute('''
          CREATE TABLE gate_check_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id TEXT UNIQUE NOT NULL,
            related_record_type TEXT NOT NULL CHECK (related_record_type IN ('GATE_CHECK', 'GUEST_LOG', 'QR_SCAN')),
            related_record_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            original_file_name TEXT,
            file_size INTEGER NOT NULL,
            file_extension TEXT NOT NULL DEFAULT '.jpg',
            mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
            photo_type TEXT NOT NULL CHECK (photo_type IN ('ENTRY', 'EXIT', 'VEHICLE', 'VEHICLE_FRONT', 'VEHICLE_BACK', 'GUEST', 'DOCUMENT', 'QR_CODE')),
            latitude REAL,
            longitude REAL,
            taken_at INTEGER NOT NULL,
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            synced_at INTEGER,
            sync_status TEXT DEFAULT 'PENDING',
            is_uploaded INTEGER DEFAULT 0,
            upload_url TEXT,
            server_photo_id TEXT,
            FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
          )
        ''');

        // Restore data from backup (if any existed)
        try {
          await db.execute('''
            INSERT INTO gate_check_photos (photo_id, related_record_type, related_record_id, file_path, file_name, file_size, photo_type, latitude, longitude, taken_at, created_by, synced_at, sync_status, is_uploaded, upload_url, server_photo_id)
            SELECT photo_id, related_record_type, related_record_id, file_path, file_name, file_size,
              CASE WHEN photo_type IN ('ENTRY', 'EXIT', 'VEHICLE', 'VEHICLE_FRONT', 'VEHICLE_BACK', 'GUEST', 'DOCUMENT', 'QR_CODE') THEN photo_type ELSE 'VEHICLE' END,
              latitude, longitude, taken_at, created_by, synced_at, sync_status, is_uploaded, upload_url, server_photo_id
            FROM gate_check_photos_backup_v11
          ''');
        } catch (e) {
          _logger.w('No data to restore from backup: $e');
        }

        // Recreate indexes
        await db.execute(
            'CREATE INDEX IF NOT EXISTS idx_gate_check_photos_photo_id ON gate_check_photos (photo_id)');
        await db.execute(
            'CREATE INDEX IF NOT EXISTS idx_gate_check_photos_sync_status ON gate_check_photos (sync_status)');
        await db.execute(
            'CREATE INDEX IF NOT EXISTS idx_gate_check_photos_related_record ON gate_check_photos (related_record_type, related_record_id)');

        // Cleanup backup
        await db.execute('DROP TABLE IF EXISTS gate_check_photos_backup_v11');

        _logger.i('v12 migration completed successfully');
      } catch (e) {
        _logger.e('v12 migration failed', error: e);
      }
    }

    if (oldVersion < 14) {
      // v14: Remove FK from gate_check_photos & ensure updated_at exists
      _logger.i(
          'Applying v14 migration: recreating gate_check_photos without FK constraint');
      try {
        await db.execute('DROP TABLE IF EXISTS gate_check_photos');
        await db.execute('''
          CREATE TABLE gate_check_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id TEXT UNIQUE NOT NULL,
            related_record_type TEXT NOT NULL CHECK (related_record_type IN ('GATE_CHECK', 'GUEST_LOG', 'QR_SCAN')),
            related_record_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            original_file_name TEXT,
            file_size INTEGER NOT NULL,
            file_extension TEXT NOT NULL DEFAULT '.jpg',
            mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
            photo_type TEXT NOT NULL CHECK (photo_type IN ('ENTRY', 'EXIT', 'VEHICLE', 'VEHICLE_FRONT', 'VEHICLE_BACK', 'GUEST', 'DOCUMENT', 'QR_CODE')),
            latitude REAL,
            longitude REAL,
            taken_at INTEGER NOT NULL,
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            synced_at INTEGER,
            sync_status TEXT DEFAULT 'PENDING',
            is_uploaded INTEGER DEFAULT 0,
            upload_url TEXT,
            server_photo_id TEXT
          )
        ''');
        _logger.i('✅ v14 migration finished successfully');
      } catch (e) {
        _logger.e('❌ v14 migration failed', error: e);
      }
    }

    if (oldVersion < 15) {
      // v15: Add sync_error to gate_check_photos table
      _logger
          .i('Applying v15 migration: adding sync_error to gate_check_photos');
      try {
        await db.execute(
            'ALTER TABLE gate_check_photos ADD COLUMN sync_error TEXT');
        _logger.i('✅ v15 migration finished successfully');
      } catch (e) {
        _logger.w(
            '⚠️ v15 migration skipped or failed (column might already exist): $e');
      }
    }

    if (oldVersion < 16) {
      _logger.i(
          'Applying v16 migration: aligning harvest_records columns with sync contract');

      await _safeAlterTableAddColumn(db, 'harvest_records', 'server_id TEXT');
      await _safeAlterTableAddColumn(db, 'harvest_records', 'block_code TEXT');
      await _safeAlterTableAddColumn(db, 'harvest_records', 'company_id TEXT');
      await _safeAlterTableAddColumn(db, 'harvest_records', 'estate_id TEXT');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'division_code TEXT');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'mandor_scope TEXT');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'karyawan_nik TEXT');
      await _safeAlterTableAddColumn(db, 'harvest_records', 'asisten_id TEXT');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'sync_error_message TEXT');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'sync_retry_count INTEGER DEFAULT 0');
      await _safeAlterTableAddColumn(
          db, 'harvest_records', 'last_sync_attempt INTEGER');

      await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_harvest_records_server_id ON harvest_records (server_id)');
      await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id ON harvest_records (company_id)');
      await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_harvest_records_division_code ON harvest_records (division_code)');
      _logger.i('✅ v16 migration finished successfully');
    }
    if (oldVersion < 17) {
      _logger.i(
          'Applying v17 migration: migrate harvest_records identity to block_code/division_code/karyawan_nik');
      try {
        await _migrateHarvestRecordsToCodeIdentity(db);
        _logger.i('✅ v17 migration finished successfully');
      } catch (e) {
        _logger.e('❌ v17 migration failed', error: e);
      }
    }

    if (oldVersion < 18) {
      _logger.i(
          'Applying v18 migration: remove legacy aggregate fields and add janjang quality columns');
      try {
        await _migrateHarvestRecordsToJanjangQuality(db);
        _logger.i('✅ v18 migration finished successfully');
      } catch (e) {
        _logger.e('❌ v18 migration failed', error: e);
      }
    }

    if (oldVersion < 19) {
      _logger.i(
          'Applying v19 migration: add canonical block_id/division_id/employee_id columns to harvest_records');
      try {
        await _safeAlterTableAddColumn(db, 'harvest_records', 'block_id TEXT');
        await _safeAlterTableAddColumn(
            db, 'harvest_records', 'division_id TEXT');
        await _safeAlterTableAddColumn(
            db, 'harvest_records', 'employee_id TEXT');

        // Backfill from existing block_code and karyawan_nik snapshots when possible.
        await db.execute('''
          UPDATE harvest_records
          SET block_id = (
            SELECT b.block_id
            FROM blocks b
            WHERE b.block_id = harvest_records.block_code OR b.code = harvest_records.block_code
            LIMIT 1
          )
          WHERE (block_id IS NULL OR block_id = '')
            AND block_code IS NOT NULL
            AND TRIM(block_code) <> ''
        ''');

        await db.execute('''
          UPDATE harvest_records
          SET employee_id = (
            SELECT e.employee_id
            FROM employees e
            WHERE e.employee_id = harvest_records.karyawan_nik
              OR e.employee_code = harvest_records.karyawan_nik
            LIMIT 1
          )
          WHERE (employee_id IS NULL OR employee_id = '')
            AND karyawan_nik IS NOT NULL
            AND TRIM(karyawan_nik) <> ''
        ''');

        await _createHarvestRecordIndexes(db);
        _logger.i('✅ v19 migration finished successfully');
      } catch (e) {
        _logger.e('❌ v19 migration failed', error: e);
      }
    }
    if (oldVersion < 20) {
      _logger.i(
          'Applying v20 migration: remove legacy block_code/karyawan_nik from harvest_records');
      try {
        await _dropLegacyHarvestIdentityColumns(db);
        _logger.i('v20 migration finished successfully');
      } catch (e) {
        _logger.e('v20 migration failed', error: e);
      }
    }

    if (oldVersion < 21) {
      _logger.i('Applying v21 migration: drop deprecated tbs_records table');
      try {
        await db.execute('DROP TABLE IF EXISTS tbs_records');
        _logger.i('v21 migration finished successfully');
      } catch (e) {
        _logger.e('v21 migration failed', error: e);
      }
    }

    if (oldVersion < 22) {
      _logger.i(
          'Applying v22 migration: rebuild schema with UUID BLOB keys for blocks/employees/harvest');
      try {
        await _rebuildSchemaForBlobUuid(db);
        _logger.i('v22 migration finished successfully');
      } catch (e) {
        _logger.e('v22 migration failed', error: e);
      }
    }

    if (oldVersion < 23) {
      _logger.i(
          'Applying v23 migration: align harvest schema to karyawan_id (BLOB) + karyawan_nik (TEXT)');
      try {
        await _rebuildSchemaForBlobUuid(db);
        _logger.i('v23 migration finished successfully');
      } catch (e) {
        _logger.e('v23 migration failed', error: e);
      }
    }

    if (oldVersion < 24) {
      _logger.i(
          'Applying v24 migration: enforce NOT NULL harvest_records.karyawan_id + karyawan_nik');
      try {
        await _rebuildSchemaForBlobUuid(db);
        _logger.i('v24 migration finished successfully');
      } catch (e) {
        _logger.e('v24 migration failed', error: e);
      }
    }

    if (oldVersion < 25) {
      _logger.i(
          'Applying v25 migration: add employees.division_id for cross-division detection');
      try {
        await _safeAlterTableAddColumn(db, 'employees', 'division_id TEXT');
        await db.execute(
            'CREATE INDEX IF NOT EXISTS idx_employees_division_id ON employees (division_id)');
        _logger.i('v25 migration finished successfully');
      } catch (e) {
        _logger.e('v25 migration failed', error: e);
      }
    }

    if (oldVersion < 26) {
      _logger.i(
          'Applying v26 migration: add employee division snapshot columns to harvest_records');
      try {
        await _safeAlterTableAddColumn(
            db, 'harvest_records', 'employee_division_id TEXT');
        await _safeAlterTableAddColumn(
            db, 'harvest_records', 'employee_division_name TEXT');
        await db.execute('''
          UPDATE harvest_records
          SET
            employee_division_id = (
              SELECT e.division_id
              FROM employees e
              WHERE e.employee_id = harvest_records.karyawan_id
              LIMIT 1
            ),
            employee_division_name = (
              SELECT d.name
              FROM employees e
              LEFT JOIN divisions d ON d.division_id = e.division_id
              WHERE e.employee_id = harvest_records.karyawan_id
              LIMIT 1
            )
          WHERE (
            employee_division_id IS NULL OR TRIM(employee_division_id) = ''
            OR employee_division_name IS NULL OR TRIM(employee_division_name) = ''
          )
            AND karyawan_id IS NOT NULL
        ''');
        await db.execute(
            'CREATE INDEX IF NOT EXISTS idx_harvest_records_employee_division_id ON harvest_records (employee_division_id)');
        _logger.i('v26 migration finished successfully');
      } catch (e) {
        _logger.e('v26 migration failed', error: e);
      }
    }
  }

  Future<void> _rebuildSchemaForBlobUuid(Database db) async {
    await db.execute('PRAGMA foreign_keys = OFF');
    try {
      final objects = await db.rawQuery('''
        SELECT type, name
        FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%'
          AND type IN ('view', 'trigger', 'table')
      ''');

      await db.transaction((txn) async {
        for (final object in objects) {
          final type = object['type']?.toString() ?? '';
          final name = object['name']?.toString() ?? '';
          if (name.isEmpty) continue;

          if (type == 'view') {
            await txn.execute('DROP VIEW IF EXISTS $name');
          } else if (type == 'trigger') {
            await txn.execute('DROP TRIGGER IF EXISTS $name');
          } else if (type == 'table') {
            await txn.execute('DROP TABLE IF EXISTS $name');
          }
        }
      });
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }

    await _tablesService.createEnhancedTables(db, _currentDatabaseVersion);
  }

  Future<void> _safeAlterTableAddColumn(
    Database db,
    String tableName,
    String columnDefinition,
  ) async {
    try {
      await db.execute('ALTER TABLE $tableName ADD COLUMN $columnDefinition');
    } catch (e) {
      _logger.w('ALTER TABLE skipped for $tableName ($columnDefinition): $e');
    }
  }

  Future<void> _migrateHarvestRecordsToCodeIdentity(Database db) async {
    final tableExists = await db.rawQuery('''
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'harvest_records'
      LIMIT 1
    ''');
    if (tableExists.isEmpty) {
      return;
    }

    final columns = await db.rawQuery('PRAGMA table_info(harvest_records)');
    final columnNames = columns
        .map((column) => (column['name']?.toString() ?? '').trim())
        .where((name) => name.isNotEmpty)
        .toSet();

    final hasLegacyBlockId = columnNames.contains('block_id');
    final hasLegacyDivisionId = columnNames.contains('division_id');
    final hasLegacyKaryawanId = columnNames.contains('karyawan_id');

    final hasLegacyIdentityColumns =
        hasLegacyBlockId || hasLegacyDivisionId || hasLegacyKaryawanId;
    if (!hasLegacyIdentityColumns) {
      await _createHarvestRecordIndexes(db);
      _logger.i(
          'harvest_records already uses code/NIK identity columns, rebuild skipped');
      return;
    }

    final blockCodeExpr = hasLegacyBlockId
        ? "COALESCE(NULLIF(hr_old.block_code, ''), (SELECT b.code FROM blocks b WHERE b.block_id = hr_old.block_id LIMIT 1), hr_old.block_id, '')"
        : "COALESCE(NULLIF(hr_old.block_code, ''), '')";
    final divisionCodeExpr = hasLegacyDivisionId
        ? "COALESCE(NULLIF(hr_old.division_code, ''), (SELECT d.code FROM blocks b LEFT JOIN divisions d ON d.division_id = b.division_id WHERE b.code = hr_old.block_code LIMIT 1), hr_old.division_id, '')"
        : "COALESCE(NULLIF(hr_old.division_code, ''), '')";
    final karyawanNikExpr = hasLegacyKaryawanId
        ? "COALESCE(NULLIF(hr_old.karyawan_nik, ''), (SELECT e.employee_code FROM employees e WHERE e.employee_id = hr_old.karyawan_id LIMIT 1), hr_old.karyawan_id, '')"
        : "COALESCE(NULLIF(hr_old.karyawan_nik, ''), '')";

    await db.execute('PRAGMA foreign_keys = OFF');
    try {
      await db.transaction((txn) async {
        await txn.execute('DROP TABLE IF EXISTS harvest_records_v17');
        await txn.execute('''
          CREATE TABLE harvest_records_v17 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            harvest_id TEXT UNIQUE NOT NULL,
            server_id TEXT,
            panen_number TEXT,
            block_code TEXT NOT NULL,
            company_id TEXT,
            estate_id TEXT,
            division_code TEXT,
            mandor_scope TEXT,
            karyawan_nik TEXT,
            harvest_date INTEGER NOT NULL,
            mandor_id TEXT NOT NULL,
            asisten_id TEXT,
            approved_by_id TEXT,
            status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PKS_RECEIVED', 'PKS_WEIGHED')),
            approval_date INTEGER,
            rejection_reason TEXT,
            approval_notes TEXT,
            required_corrections TEXT,
            adjustment_reason TEXT,
            total_employees INTEGER DEFAULT 0,
            total_tbs INTEGER DEFAULT 0,
            total_weight REAL DEFAULT 0,
            total_brondolan REAL DEFAULT 0,
            average_ripeness TEXT,
            notes TEXT,
            client_timestamp INTEGER,
            device_id TEXT,
            coordinates TEXT,
            pks_weight REAL,
            bjr REAL,
            oer REAL,
            ker REAL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            updated_by TEXT,
            synced_at INTEGER,
            sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
            sync_error_message TEXT,
            sync_retry_count INTEGER DEFAULT 0,
            last_sync_attempt INTEGER,
            needs_sync INTEGER DEFAULT 1,
            version INTEGER DEFAULT 1,
            local_version INTEGER DEFAULT 1,
            server_version INTEGER DEFAULT 1,
            conflict_data TEXT,
            is_draft INTEGER DEFAULT 0,
            validation_errors TEXT,
            photo_paths TEXT,
            FOREIGN KEY (mandor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
            FOREIGN KEY (approved_by_id) REFERENCES users (user_id) ON DELETE SET NULL
          )
        ''');

        await txn.execute('''
          INSERT INTO harvest_records_v17 (
            id,
            harvest_id,
            server_id,
            panen_number,
            block_code,
            company_id,
            estate_id,
            division_code,
            mandor_scope,
            karyawan_nik,
            harvest_date,
            mandor_id,
            asisten_id,
            approved_by_id,
            status,
            approval_date,
            rejection_reason,
            approval_notes,
            required_corrections,
            adjustment_reason,
            total_employees,
            total_tbs,
            total_weight,
            total_brondolan,
            average_ripeness,
            notes,
            client_timestamp,
            device_id,
            coordinates,
            pks_weight,
            bjr,
            oer,
            ker,
            created_at,
            updated_at,
            created_by,
            updated_by,
            synced_at,
            sync_status,
            sync_error_message,
            sync_retry_count,
            last_sync_attempt,
            needs_sync,
            version,
            local_version,
            server_version,
            conflict_data,
            is_draft,
            validation_errors,
            photo_paths
          )
          SELECT
            hr_old.id,
            hr_old.harvest_id,
            hr_old.server_id,
            hr_old.panen_number,
            $blockCodeExpr,
            hr_old.company_id,
            hr_old.estate_id,
            $divisionCodeExpr,
            hr_old.mandor_scope,
            $karyawanNikExpr,
            hr_old.harvest_date,
            hr_old.mandor_id,
            hr_old.asisten_id,
            hr_old.approved_by_id,
            COALESCE(hr_old.status, 'PENDING'),
            hr_old.approval_date,
            hr_old.rejection_reason,
            hr_old.approval_notes,
            hr_old.required_corrections,
            hr_old.adjustment_reason,
            COALESCE(hr_old.total_employees, 0),
            COALESCE(hr_old.total_tbs, 0),
            COALESCE(hr_old.total_weight, 0),
            COALESCE(hr_old.total_brondolan, 0),
            hr_old.average_ripeness,
            hr_old.notes,
            hr_old.client_timestamp,
            hr_old.device_id,
            hr_old.coordinates,
            hr_old.pks_weight,
            hr_old.bjr,
            hr_old.oer,
            hr_old.ker,
            hr_old.created_at,
            hr_old.updated_at,
            hr_old.created_by,
            hr_old.updated_by,
            hr_old.synced_at,
            COALESCE(hr_old.sync_status, 'PENDING'),
            hr_old.sync_error_message,
            COALESCE(hr_old.sync_retry_count, 0),
            hr_old.last_sync_attempt,
            COALESCE(hr_old.needs_sync, 1),
            COALESCE(hr_old.version, 1),
            COALESCE(hr_old.local_version, 1),
            COALESCE(hr_old.server_version, 1),
            hr_old.conflict_data,
            COALESCE(hr_old.is_draft, 0),
            hr_old.validation_errors,
            hr_old.photo_paths
          FROM harvest_records hr_old
        ''');

        await txn.execute('DROP TABLE harvest_records');
        await txn.execute(
            'ALTER TABLE harvest_records_v17 RENAME TO harvest_records');
        await _createHarvestRecordIndexes(txn);
      });
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }

  Future<void> _migrateHarvestRecordsToJanjangQuality(Database db) async {
    final tableExists = await db.rawQuery('''
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'harvest_records'
      LIMIT 1
    ''');
    if (tableExists.isEmpty) {
      return;
    }

    final columns = await db.rawQuery('PRAGMA table_info(harvest_records)');
    final columnNames = columns
        .map((column) => (column['name']?.toString() ?? '').trim())
        .where((name) => name.isNotEmpty)
        .toSet();

    final hasJumlahJanjang = columnNames.contains('jumlah_janjang');
    final hasJjgMatang = columnNames.contains('jjg_matang');
    final hasJjgMentah = columnNames.contains('jjg_mentah');
    final hasJjgLewatMatang = columnNames.contains('jjg_lewat_matang');
    final hasJjgBusukAbnormal = columnNames.contains('jjg_busuk_abnormal');
    final hasJjgTangkaiPanjang = columnNames.contains('jjg_tangkai_panjang');
    final hasTotalTbs = columnNames.contains('total_tbs');

    final jumlahJanjangExpr = hasJumlahJanjang
        ? "COALESCE(hr_old.jumlah_janjang, 0)"
        : (hasTotalTbs ? "COALESCE(hr_old.total_tbs, 0)" : "0");
    final jjgMatangExpr = hasJjgMatang
        ? "COALESCE(hr_old.jjg_matang, 0)"
        : (hasTotalTbs
            ? "COALESCE(hr_old.total_tbs, 0)"
            : (hasJumlahJanjang ? "COALESCE(hr_old.jumlah_janjang, 0)" : "0"));
    final jjgMentahExpr = hasJjgMentah ? "COALESCE(hr_old.jjg_mentah, 0)" : "0";
    final jjgLewatMatangExpr =
        hasJjgLewatMatang ? "COALESCE(hr_old.jjg_lewat_matang, 0)" : "0";
    final jjgBusukAbnormalExpr =
        hasJjgBusukAbnormal ? "COALESCE(hr_old.jjg_busuk_abnormal, 0)" : "0";
    final jjgTangkaiPanjangExpr =
        hasJjgTangkaiPanjang ? "COALESCE(hr_old.jjg_tangkai_panjang, 0)" : "0";

    await db.execute('PRAGMA foreign_keys = OFF');
    try {
      await db.transaction((txn) async {
        await txn.execute('DROP TABLE IF EXISTS harvest_records_v18');
        await txn.execute('''
          CREATE TABLE harvest_records_v18 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            harvest_id TEXT UNIQUE NOT NULL,
            server_id TEXT,
            panen_number TEXT,
            block_code TEXT NOT NULL,
            company_id TEXT,
            estate_id TEXT,
            division_code TEXT,
            mandor_scope TEXT,
            karyawan_nik TEXT,
            harvest_date INTEGER NOT NULL,
            mandor_id TEXT NOT NULL,
            asisten_id TEXT,
            approved_by_id TEXT,
            status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PKS_RECEIVED', 'PKS_WEIGHED')),
            approval_date INTEGER,
            rejection_reason TEXT,
            approval_notes TEXT,
            required_corrections TEXT,
            adjustment_reason TEXT,
            jumlah_janjang INTEGER DEFAULT 0,
            jjg_matang INTEGER DEFAULT 0,
            jjg_mentah INTEGER DEFAULT 0,
            jjg_lewat_matang INTEGER DEFAULT 0,
            jjg_busuk_abnormal INTEGER DEFAULT 0,
            jjg_tangkai_panjang INTEGER DEFAULT 0,
            total_weight REAL DEFAULT 0,
            total_brondolan REAL DEFAULT 0,
            notes TEXT,
            client_timestamp INTEGER,
            device_id TEXT,
            coordinates TEXT,
            bjr REAL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            updated_by TEXT,
            synced_at INTEGER,
            sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
            sync_error_message TEXT,
            sync_retry_count INTEGER DEFAULT 0,
            last_sync_attempt INTEGER,
            needs_sync INTEGER DEFAULT 1,
            version INTEGER DEFAULT 1,
            local_version INTEGER DEFAULT 1,
            server_version INTEGER DEFAULT 1,
            conflict_data TEXT,
            is_draft INTEGER DEFAULT 0,
            validation_errors TEXT,
            photo_paths TEXT,
            FOREIGN KEY (mandor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
            FOREIGN KEY (approved_by_id) REFERENCES users (user_id) ON DELETE SET NULL
          )
        ''');

        await txn.execute('''
          INSERT INTO harvest_records_v18 (
            id,
            harvest_id,
            server_id,
            panen_number,
            block_code,
            company_id,
            estate_id,
            division_code,
            mandor_scope,
            karyawan_nik,
            harvest_date,
            mandor_id,
            asisten_id,
            approved_by_id,
            status,
            approval_date,
            rejection_reason,
            approval_notes,
            required_corrections,
            adjustment_reason,
            jumlah_janjang,
            jjg_matang,
            jjg_mentah,
            jjg_lewat_matang,
            jjg_busuk_abnormal,
            jjg_tangkai_panjang,
            total_weight,
            total_brondolan,
            notes,
            client_timestamp,
            device_id,
            coordinates,
            bjr,
            created_at,
            updated_at,
            created_by,
            updated_by,
            synced_at,
            sync_status,
            sync_error_message,
            sync_retry_count,
            last_sync_attempt,
            needs_sync,
            version,
            local_version,
            server_version,
            conflict_data,
            is_draft,
            validation_errors,
            photo_paths
          )
          SELECT
            hr_old.id,
            hr_old.harvest_id,
            hr_old.server_id,
            hr_old.panen_number,
            COALESCE(hr_old.block_code, ''),
            hr_old.company_id,
            hr_old.estate_id,
            hr_old.division_code,
            hr_old.mandor_scope,
            hr_old.karyawan_nik,
            hr_old.harvest_date,
            hr_old.mandor_id,
            hr_old.asisten_id,
            hr_old.approved_by_id,
            COALESCE(hr_old.status, 'PENDING'),
            hr_old.approval_date,
            hr_old.rejection_reason,
            hr_old.approval_notes,
            hr_old.required_corrections,
            hr_old.adjustment_reason,
            $jumlahJanjangExpr,
            $jjgMatangExpr,
            $jjgMentahExpr,
            $jjgLewatMatangExpr,
            $jjgBusukAbnormalExpr,
            $jjgTangkaiPanjangExpr,
            COALESCE(hr_old.total_weight, 0),
            COALESCE(hr_old.total_brondolan, 0),
            hr_old.notes,
            hr_old.client_timestamp,
            hr_old.device_id,
            hr_old.coordinates,
            hr_old.bjr,
            hr_old.created_at,
            hr_old.updated_at,
            hr_old.created_by,
            hr_old.updated_by,
            hr_old.synced_at,
            COALESCE(hr_old.sync_status, 'PENDING'),
            hr_old.sync_error_message,
            COALESCE(hr_old.sync_retry_count, 0),
            hr_old.last_sync_attempt,
            COALESCE(hr_old.needs_sync, 1),
            COALESCE(hr_old.version, 1),
            COALESCE(hr_old.local_version, 1),
            COALESCE(hr_old.server_version, 1),
            hr_old.conflict_data,
            COALESCE(hr_old.is_draft, 0),
            hr_old.validation_errors,
            hr_old.photo_paths
          FROM harvest_records hr_old
        ''');

        await txn.execute('DROP TABLE harvest_records');
        await txn.execute(
            'ALTER TABLE harvest_records_v18 RENAME TO harvest_records');
        await _createHarvestRecordIndexes(txn);
      });
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }

  Future<void> _dropLegacyHarvestIdentityColumns(Database db) async {
    final tableExists = await db.rawQuery('''
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'harvest_records'
      LIMIT 1
    ''');
    if (tableExists.isEmpty) {
      return;
    }

    final columns = await db.rawQuery('PRAGMA table_info(harvest_records)');
    final columnNames = columns
        .map((column) => (column['name']?.toString() ?? '').trim())
        .where((name) => name.isNotEmpty)
        .toSet();

    final hasBlockCode = columnNames.contains('block_code');
    final hasKaryawanNik = columnNames.contains('karyawan_nik');
    if (!hasBlockCode && !hasKaryawanNik) {
      await _createHarvestRecordIndexes(db);
      _logger.i(
          'harvest_records already without block_code/karyawan_nik, rebuild skipped');
      return;
    }

    final blockIdExpr = hasBlockCode
        ? "COALESCE(NULLIF(hr_old.block_id, ''), (SELECT b.block_id FROM blocks b WHERE b.block_id = hr_old.block_code OR b.code = hr_old.block_code LIMIT 1), '')"
        : "COALESCE(NULLIF(hr_old.block_id, ''), '')";
    final employeeIdExpr = hasKaryawanNik
        ? "COALESCE(NULLIF(hr_old.employee_id, ''), (SELECT e.employee_id FROM employees e WHERE e.employee_id = hr_old.karyawan_nik OR e.employee_code = hr_old.karyawan_nik LIMIT 1), '')"
        : "COALESCE(NULLIF(hr_old.employee_id, ''), '')";

    await db.execute('PRAGMA foreign_keys = OFF');
    try {
      await db.transaction((txn) async {
        await txn.execute('DROP TABLE IF EXISTS harvest_records_v20');
        await txn.execute('''
          CREATE TABLE harvest_records_v20 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            harvest_id TEXT UNIQUE NOT NULL,
            server_id TEXT,
            panen_number TEXT,
            block_id TEXT NOT NULL,
            company_id TEXT,
            estate_id TEXT,
            division_id TEXT,
            division_code TEXT,
            mandor_scope TEXT,
            employee_id TEXT,
            harvest_date INTEGER NOT NULL,
            mandor_id TEXT NOT NULL,
            asisten_id TEXT,
            approved_by_id TEXT,
            status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PKS_RECEIVED', 'PKS_WEIGHED')),
            approval_date INTEGER,
            rejection_reason TEXT,
            approval_notes TEXT,
            required_corrections TEXT,
            adjustment_reason TEXT,
            jumlah_janjang INTEGER DEFAULT 0,
            jjg_matang INTEGER DEFAULT 0,
            jjg_mentah INTEGER DEFAULT 0,
            jjg_lewat_matang INTEGER DEFAULT 0,
            jjg_busuk_abnormal INTEGER DEFAULT 0,
            jjg_tangkai_panjang INTEGER DEFAULT 0,
            total_weight REAL DEFAULT 0,
            total_brondolan REAL DEFAULT 0,
            notes TEXT,
            client_timestamp INTEGER,
            device_id TEXT,
            coordinates TEXT,
            bjr REAL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            updated_by TEXT,
            synced_at INTEGER,
            sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
            sync_error_message TEXT,
            sync_retry_count INTEGER DEFAULT 0,
            last_sync_attempt INTEGER,
            needs_sync INTEGER DEFAULT 1,
            version INTEGER DEFAULT 1,
            local_version INTEGER DEFAULT 1,
            server_version INTEGER DEFAULT 1,
            conflict_data TEXT,
            is_draft INTEGER DEFAULT 0,
            validation_errors TEXT,
            photo_paths TEXT,
            FOREIGN KEY (mandor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
            FOREIGN KEY (approved_by_id) REFERENCES users (user_id) ON DELETE SET NULL
          )
        ''');

        await txn.execute('''
          INSERT INTO harvest_records_v20 (
            id,
            harvest_id,
            server_id,
            panen_number,
            block_id,
            company_id,
            estate_id,
            division_id,
            division_code,
            mandor_scope,
            employee_id,
            harvest_date,
            mandor_id,
            asisten_id,
            approved_by_id,
            status,
            approval_date,
            rejection_reason,
            approval_notes,
            required_corrections,
            adjustment_reason,
            jumlah_janjang,
            jjg_matang,
            jjg_mentah,
            jjg_lewat_matang,
            jjg_busuk_abnormal,
            jjg_tangkai_panjang,
            total_weight,
            total_brondolan,
            notes,
            client_timestamp,
            device_id,
            coordinates,
            bjr,
            created_at,
            updated_at,
            created_by,
            updated_by,
            synced_at,
            sync_status,
            sync_error_message,
            sync_retry_count,
            last_sync_attempt,
            needs_sync,
            version,
            local_version,
            server_version,
            conflict_data,
            is_draft,
            validation_errors,
            photo_paths
          )
          SELECT
            hr_old.id,
            hr_old.harvest_id,
            hr_old.server_id,
            hr_old.panen_number,
            $blockIdExpr,
            hr_old.company_id,
            hr_old.estate_id,
            hr_old.division_id,
            hr_old.division_code,
            hr_old.mandor_scope,
            $employeeIdExpr,
            hr_old.harvest_date,
            hr_old.mandor_id,
            hr_old.asisten_id,
            hr_old.approved_by_id,
            COALESCE(hr_old.status, 'PENDING'),
            hr_old.approval_date,
            hr_old.rejection_reason,
            hr_old.approval_notes,
            hr_old.required_corrections,
            hr_old.adjustment_reason,
            COALESCE(hr_old.jumlah_janjang, 0),
            COALESCE(hr_old.jjg_matang, 0),
            COALESCE(hr_old.jjg_mentah, 0),
            COALESCE(hr_old.jjg_lewat_matang, 0),
            COALESCE(hr_old.jjg_busuk_abnormal, 0),
            COALESCE(hr_old.jjg_tangkai_panjang, 0),
            COALESCE(hr_old.total_weight, 0),
            COALESCE(hr_old.total_brondolan, 0),
            hr_old.notes,
            hr_old.client_timestamp,
            hr_old.device_id,
            hr_old.coordinates,
            hr_old.bjr,
            hr_old.created_at,
            hr_old.updated_at,
            hr_old.created_by,
            hr_old.updated_by,
            hr_old.synced_at,
            COALESCE(hr_old.sync_status, 'PENDING'),
            hr_old.sync_error_message,
            COALESCE(hr_old.sync_retry_count, 0),
            hr_old.last_sync_attempt,
            COALESCE(hr_old.needs_sync, 1),
            COALESCE(hr_old.version, 1),
            COALESCE(hr_old.local_version, 1),
            COALESCE(hr_old.server_version, 1),
            hr_old.conflict_data,
            COALESCE(hr_old.is_draft, 0),
            hr_old.validation_errors,
            hr_old.photo_paths
          FROM harvest_records hr_old
        ''');

        await txn.execute('DROP TABLE harvest_records');
        await txn.execute(
            'ALTER TABLE harvest_records_v20 RENAME TO harvest_records');
        await _createHarvestRecordIndexes(txn);
      });
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }

  Future<void> _createHarvestRecordIndexes(DatabaseExecutor db) async {
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_harvest_id ON harvest_records (harvest_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_id ON harvest_records (mandor_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_status ON harvest_records (status)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_sync_status ON harvest_records (sync_status)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_harvest_date ON harvest_records (harvest_date)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_server_id ON harvest_records (server_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_block_id ON harvest_records (block_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id ON harvest_records (company_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_division_id ON harvest_records (division_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_division_code ON harvest_records (division_code)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_id ON harvest_records (karyawan_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_nik ON harvest_records (karyawan_nik)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_harvest_records_employee_division_id ON harvest_records (employee_division_id)');
  }

  // Database open handler
  Future<void> _onOpenDatabase(Database db) async {
    try {
      _logger.i('Configuring database PRAGMA settings');

      // Essential PRAGMA settings for performance and reliability
      // Use rawQuery for PRAGMA commands as execute() doesn't work on some Android versions
      try {
        // Temporarily disable foreign keys for development to fix gate_guest_logs constraint issue
        _logger.i('Development mode: $_isDevelopmentMode');
        if (_isDevelopmentMode) {
          await db.rawQuery('PRAGMA foreign_keys = OFF');
          _logger.w('🔥 Foreign keys DISABLED for development mode');

          // Verify the setting
          final result = await db.rawQuery('PRAGMA foreign_keys');
          _logger.i('✅ Foreign keys pragma verification: $result');
        } else {
          await db.rawQuery('PRAGMA foreign_keys = ON');
          _logger.i('Foreign keys enabled for production mode');
        }
      } catch (e) {
        _logger.w('Failed to configure foreign keys', error: e);
      }

      // Use rawQuery for PRAGMA commands as execute() doesn't work on some Android versions
      try {
        await db.rawQuery('PRAGMA journal_mode = WAL');
      } catch (e) {
        _logger.w('Failed to set journal mode', error: e);
      }

      try {
        await db.rawQuery('PRAGMA synchronous = NORMAL');
      } catch (e) {
        _logger.w('Failed to set synchronous mode', error: e);
      }

      try {
        await db.rawQuery('PRAGMA cache_size = -2000');
      } catch (e) {
        _logger.w('Failed to set cache size', error: e);
      }

      try {
        await db.rawQuery('PRAGMA temp_store = MEMORY');
      } catch (e) {
        _logger.w('Failed to set temp store', error: e);
      }

      _logger.i('Database PRAGMA configuration completed');
    } catch (e) {
      _logger.e('Critical error during database configuration', error: e);
      // Don't rethrow - allow database to continue functioning
    }
  }

  // =============================================================================
  // DELEGATED METHODS TO SPECIALIZED SERVICES
  // =============================================================================

  // Generic Operations (delegated to OperationsService)
  Future<String> insertWithId(String table, Map<String, dynamic> values) async {
    final db = await database;
    return await _operationsService.insertWithId(db, table, values);
  }

  Future<List<String>> batchInsert(
      String table, List<Map<String, dynamic>> valuesList) async {
    final db = await database;
    return await _operationsService.batchInsert(db, table, valuesList);
  }

  Future<int> updateWithVersion(String table, Map<String, dynamic> values,
      String whereClause, List<dynamic> whereArgs) async {
    final db = await database;
    return await _operationsService.updateWithVersion(
        db, table, values, whereClause, whereArgs);
  }

  Future<int> softDelete(
      String table, String whereClause, List<dynamic> whereArgs) async {
    final db = await database;
    return await _operationsService.softDelete(
        db, table, whereClause, whereArgs);
  }

  // Role-specific Operations (delegated to OperationsService)
  Future<String> createHarvestRecord(Map<String, dynamic> harvestData) async {
    final db = await database;
    return await _operationsService.createHarvestRecord(
        db, harvestData, _addToSyncQueueWrapper);
  }

  Future<void> addHarvestEmployee(
      String harvestId, Map<String, dynamic> employeeData) async {
    final db = await database;
    await _operationsService.addHarvestEmployee(db, harvestId, employeeData);
  }

  Future<List<Map<String, dynamic>>> getHarvestRecordsByMandor(
      String mandorId) async {
    final db = await database;
    return await _operationsService.getHarvestRecordsByMandor(db, mandorId);
  }

  Future<String> createGateCheckRecord(Map<String, dynamic> gateCheckData,
      {String? username}) async {
    final db = await database;
    return await _operationsService.createGateCheckRecord(
        db, gateCheckData, _addToSyncQueueWrapper,
        username: username);
  }

  Future<void> updateGateCheckExit(
      String gateCheckId, Map<String, dynamic> exitData) async {
    final db = await database;
    await _operationsService.updateGateCheckExit(db, gateCheckId, exitData);
  }

  Future<String> recordQRScan(
      String userId, Map<String, dynamic> scanData) async {
    final db = await database;
    return await _operationsService.recordQRScan(db, userId, scanData);
  }

  Future<List<Map<String, dynamic>>> getGateCheckRecordsByCompany(
      String companyId) async {
    final db = await database;
    return await _operationsService.getGateCheckRecordsByCompany(db, companyId);
  }

  Future<List<Map<String, dynamic>>> getActiveVehiclesInGate(
      String companyId) async {
    final db = await database;
    return await _operationsService.getActiveVehiclesInGate(db, companyId);
  }

  Future<String> createGuestLog(Map<String, dynamic> guestData) async {
    final db = await database;
    return await _operationsService.createGuestLog(
        db, guestData, _addToSyncQueueWrapper);
  }

  Future<void> updateGuestLogExit(
      String guestId, Map<String, dynamic> exitData) async {
    final db = await database;
    await _operationsService.updateGuestLogExit(db, guestId, exitData);
  }

  Future<List<Map<String, dynamic>>> getRecentGuestLogs(
      {int limit = 10}) async {
    final db = await database;
    return await _operationsService.getRecentGuestLogs(db, limit: limit);
  }

  Future<List<Map<String, dynamic>>> getActiveGuests() async {
    final db = await database;
    return await _operationsService.getActiveGuests(db);
  }

  Future<String> storeGateCheckPhoto({
    required String relatedRecordType,
    required String relatedRecordId,
    required String filePath,
    required String fileName,
    required int fileSize,
    required String photoType,
    required String createdBy,
    double? latitude,
    double? longitude,
  }) async {
    final db = await database;
    return await _operationsService.storeGateCheckPhoto(db,
        relatedRecordType: relatedRecordType,
        relatedRecordId: relatedRecordId,
        filePath: filePath,
        fileName: fileName,
        fileSize: fileSize,
        photoType: photoType,
        createdBy: createdBy,
        latitude: latitude,
        longitude: longitude);
  }

  Future<List<Map<String, dynamic>>> getPhotosForRecord(
      String recordType, String recordId) async {
    final db = await database;
    return await _operationsService.getPhotosForRecord(
        db, recordType, recordId);
  }

  // Sync Management (delegated to SyncService)
  Future<void> addToSyncQueue({
    required String operationType,
    required String tableName,
    required String recordId,
    required Map<String, dynamic> data,
    int priority = 1,
    String? userId,
  }) async {
    final db = await database;
    await _syncService.addToSyncQueue(db,
        operationType: operationType,
        tableName: tableName,
        recordId: recordId,
        data: data,
        priority: priority,
        userId: userId);
  }

  // Wrapper for operations service callbacks
  Future<void> _addToSyncQueueWrapper(Map<String, dynamic> syncData) async {
    await addToSyncQueue(
      operationType: syncData['operationType'],
      tableName: syncData['tableName'],
      recordId: syncData['recordId'],
      data: syncData['data'],
      priority: syncData['priority'] ?? 1,
      userId: syncData['userId'],
    );
  }

  Future<List<Map<String, dynamic>>> getPendingSyncOperations(
      {int limit = 50}) async {
    final db = await database;
    return await _syncService.getPendingSyncOperations(db, limit: limit);
  }

  Future<void> markSyncOperationCompleted(String operationId,
      {String? serverRecordId}) async {
    final db = await database;
    await _syncService.markSyncOperationCompleted(db, operationId,
        serverRecordId: serverRecordId);
  }

  Future<void> markSyncOperationFailed(String operationId, String error) async {
    final db = await database;
    await _syncService.markSyncOperationFailed(db, operationId, error);
  }

  Future<void> createSyncConflict({
    required String tableName,
    required String recordId,
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    required String conflictType,
    required String userId,
  }) async {
    final db = await database;
    await _syncService.createSyncConflict(db,
        tableName: tableName,
        recordId: recordId,
        localData: localData,
        serverData: serverData,
        conflictType: conflictType,
        userId: userId);
  }

  Future<List<Map<String, dynamic>>> getPendingConflicts(
      {String? userId}) async {
    final db = await database;
    return await _syncService.getPendingConflicts(db, userId: userId);
  }

  // Authentication & Security (delegated to SyncService)
  Future<void> storeJWTToken({
    required String userId,
    required String tokenType,
    required String tokenHash,
    required String deviceId,
    required String deviceFingerprint,
    required DateTime expiresAt,
    String? appVersion,
  }) async {
    final db = await database;
    await _syncService.storeJWTToken(db,
        userId: userId,
        tokenType: tokenType,
        tokenHash: tokenHash,
        deviceId: deviceId,
        deviceFingerprint: deviceFingerprint,
        expiresAt: expiresAt,
        appVersion: appVersion);
  }

  Future<Map<String, dynamic>?> getValidJWTToken(
      String userId, String tokenType) async {
    final db = await database;
    return await _syncService.getValidJWTToken(db, userId, tokenType);
  }

  Future<void> revokeJWTTokens(String userId, {String? tokenType}) async {
    final db = await database;
    await _syncService.revokeJWTTokens(db, userId, tokenType: tokenType);
  }

  Future<void> logSecurityEvent({
    String? userId,
    required String eventType,
    required String severity,
    required String description,
    Map<String, dynamic>? metadata,
    String? deviceId,
  }) async {
    final db = await database;
    await _syncService.logSecurityEvent(db,
        userId: userId,
        eventType: eventType,
        severity: severity,
        description: description,
        metadata: metadata,
        deviceId: deviceId);
  }

  // Generic database operations (delegated to OperationsService)
  Future<int> insert(String table, Map<String, dynamic> values) async {
    final db = await database;
    return await _operationsService.insert(db, table, values);
  }

  Future<int> update(String table, Map<String, dynamic> values,
      {String? where, List<Object?>? whereArgs}) async {
    final db = await database;
    return await _operationsService.update(db, table, values,
        where: where, whereArgs: whereArgs);
  }

  Future<int> delete(
      String table, String whereClause, List<dynamic> whereArgs) async {
    final db = await database;
    return await _operationsService.delete(db, table, whereClause, whereArgs);
  }

  Future<List<Map<String, dynamic>>> query(
    String table, {
    List<String>? columns,
    String? where,
    List<dynamic>? whereArgs,
    String? orderBy,
    int? limit,
    int? offset,
  }) async {
    final db = await database;
    return await _operationsService.query(db, table,
        columns: columns,
        where: where,
        whereArgs: whereArgs,
        orderBy: orderBy,
        limit: limit,
        offset: offset);
  }

  Future<List<Map<String, dynamic>>> rawQuery(String sql,
      [List<dynamic>? arguments]) async {
    final db = await database;
    return await _operationsService.rawQuery(db, sql, arguments);
  }

  Future<void> rawExecute(String sql, [List<dynamic>? arguments]) async {
    final db = await database;
    await _operationsService.rawExecute(db, sql, arguments);
  }

  Future<T> transaction<T>(Future<T> Function(Transaction) action) async {
    final db = await database;
    return await _operationsService.transaction(db, action);
  }

  // Database maintenance and utilities
  Future<Map<String, dynamic>> getDatabaseStats() async {
    final db = await database;
    final stats = <String, dynamic>{};

    try {
      final tables = [
        'users',
        'companies',
        'estates',
        'divisions',
        'blocks',
        'employees',
        'harvest_records',
        'harvest_employees',
        'gate_check_records',
        'gate_check_stats',
        'gate_qr_scan_history',
        'gate_qr_tokens',
        'gate_guest_logs',
        'gate_employee_logs',
        'gate_check_photos',
        'sync_queue',
        'sync_conflicts',
        'sync_log',
        'sync_logs',
        'notifications'
      ];

      for (final table in tables) {
        final count = await rawQuery('SELECT COUNT(*) as count FROM $table');
        stats[table] = count.first['count'];
      }

      final syncStats = await _syncService.getSyncStats(db);
      stats.addAll(syncStats);

      final dbPath = await getDatabasePath();
      final file = File(dbPath);
      if (await file.exists()) {
        stats['database_size_kb'] = (await file.length()) ~/ 1024;
      }
    } catch (e) {
      stats['error'] = e.toString();
    }

    return stats;
  }

  Future<String> getDatabasePath() async {
    return _getDatabasePathForName(_activeDatabaseName);
  }

  Future<String> _getDatabasePathForName(String dbName) async {
    final Directory documentsDirectory =
        await getApplicationDocumentsDirectory();
    return path.join(documentsDirectory.path, dbName);
  }

  Future<void> closeDatabase() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
      _logger.i('Enhanced database closed');
    }
  }

  Future<void> deleteDatabase() async {
    await closeDatabase();
    final dbPath = await getDatabasePath();
    final file = File(dbPath);
    if (await file.exists()) {
      await file.delete();
      _logger.i('Enhanced database file deleted');
    }
  }

  // Development helpers for easy database recreation
  Future<void> recreateDatabaseForDevelopment() async {
    if (_isDevelopmentMode) {
      _logger.i('Recreating database for development...');
      await deleteDatabase();
      _database = null; // Reset singleton
      await database; // This will trigger _initDatabase again
      _logger.i('Database recreated successfully');
    } else {
      _logger.w('Database recreation is only allowed in development mode');
    }
  }

  Future<void> resetDatabaseSchema() async {
    if (_isDevelopmentMode) {
      _logger.i('Resetting database schema...');
      final db = await database;

      // Get all table names
      final tables = await db.rawQuery(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

      // Drop all tables
      for (final table in tables) {
        final tableName = table['name'] as String;
        try {
          await db.execute('DROP TABLE IF EXISTS $tableName');
          _logger.d('Dropped table: $tableName');
        } catch (e) {
          _logger.w('Failed to drop table $tableName: $e');
        }
      }

      // Recreate all tables
      await _tablesService.createEnhancedTables(db, _currentDatabaseVersion);
      _logger.i('Database schema reset completed');
    } else {
      _logger.w('Schema reset is only allowed in development mode');
    }
  }

  Future<void> clearUserData(String userId) async {
    final db = await database;
    await _operationsService.clearUserData(db, userId);
  }

  Future<Map<String, dynamic>> getDatabaseHealth() async {
    final health = <String, dynamic>{};

    try {
      final dbPath = await getDatabasePath();
      final file = File(dbPath);

      if (await file.exists()) {
        final sizeBytes = await file.length();
        health['size_mb'] = (sizeBytes / (1024 * 1024)).toStringAsFixed(2);
        health['size_bytes'] = sizeBytes;
        health['status'] = 'healthy';
      } else {
        health['size_mb'] = '0.00';
        health['size_bytes'] = 0;
        health['status'] = 'missing';
      }

      // Check database connectivity
      try {
        final db = await database;
        await db.rawQuery('SELECT 1');
        health['connectivity'] = 'connected';
      } catch (e) {
        health['connectivity'] = 'failed';
        health['connectivity_error'] = e.toString();
      }
    } catch (e) {
      health['status'] = 'error';
      health['error'] = e.toString();
    }

    return health;
  }

  // =============================================================================
  // DEVELOPMENT MODE UTILITIES
  // =============================================================================

  /// Check if running in development mode
  bool get isDevelopmentMode => _isDevelopmentMode;

  /// Get comprehensive development information
  Future<Map<String, dynamic>> getDevelopmentInfo() async {
    if (!_isDevelopmentMode) {
      return {'mode': 'PRODUCTION', 'development_features': false};
    }

    final dbPath = await getDatabasePath();
    final file = File(dbPath);
    final exists = await file.exists();

    return {
      'mode': 'DEVELOPMENT',
      'development_features': true,
      'active_database': _activeDatabaseName,
      'database_path': dbPath,
      'database_exists': exists,
      'database_size_bytes': exists ? await file.length() : 0,
      'auto_recreate_on_start': _recreateDatabaseOnStartupInDevelopment,
      'available_dev_commands': [
        'recreateDatabaseForDevelopment()',
        'resetDatabaseSchema()',
        'clearUserData(userId)',
        'deleteDatabase()',
        'configureDatabaseForRole(role)'
      ]
    };
  }

  /// Get list of all table names in database
  Future<List<String>> getTableNames() async {
    try {
      final db = await database;
      final result = await db.rawQuery(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      return result.map((row) => row['name'] as String).toList();
    } catch (e) {
      _logger.e('Error getting table names', error: e);
      return [];
    }
  }

  /// Get row count for each table (useful for development monitoring)
  Future<Map<String, int>> getTableRowCounts() async {
    try {
      final db = await database;
      final tableNames = await getTableNames();
      final counts = <String, int>{};

      for (final tableName in tableNames) {
        try {
          final result =
              await db.rawQuery('SELECT COUNT(*) as count FROM $tableName');
          counts[tableName] = (result.first['count'] as int?) ?? 0;
        } catch (e) {
          counts[tableName] = -1; // Error indicator
        }
      }

      return counts;
    } catch (e) {
      _logger.e('Error getting table row counts', error: e);
      return {};
    }
  }

  /// Quick database status for development debugging
  Future<void> printDatabaseStatus() async {
    if (!_isDevelopmentMode) {
      _logger
          .i('Database status printing is only available in development mode');
      return;
    }

    try {
      final devInfo = await getDevelopmentInfo();
      final tableCounts = await getTableRowCounts();
      final stats = await getDatabaseStats();

      _logger.i('=== DEVELOPMENT DATABASE STATUS ===');
      _logger.i('Mode: ${devInfo['mode']}');
      _logger.i('Database Path: ${devInfo['database_path']}');
      _logger.i('Database Size: ${devInfo['database_size_bytes']} bytes');
      _logger.i('Tables: ${tableCounts.keys.length}');

      _logger.i('--- TABLE ROW COUNTS ---');
      tableCounts.forEach((table, count) {
        _logger.i('  $table: $count rows');
      });

      _logger.i('--- SYNC STATUS ---');
      _logger.i('  Pending Sync: ${stats['pending_sync'] ?? 0}');
      _logger.i('  Failed Sync: ${stats['failed_sync'] ?? 0}');
      _logger.i('  Pending Conflicts: ${stats['pending_conflicts'] ?? 0}');

      _logger.i('=====================================');
    } catch (e) {
      _logger.e('Error printing database status', error: e);
    }
  }
}
