import 'dart:async';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:logger/logger.dart';

import '../constants/api_constants.dart';

/// SQLite database helper for offline-first functionality
/// 
/// Manages local storage for:
/// - User data and authentication tokens
/// - Harvest data (panen)
/// - Gate check records
/// - Master data (companies, estates, divisions)
/// - Sync queue for offline operations
class DatabaseHelper {
  static final Logger _logger = Logger();
  static Database? _database;
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  /// Initialize database with tables
  Future<Database> _initDatabase() async {
    try {
      final databasesPath = await getDatabasesPath();
      final path = join(databasesPath, DatabaseConstants.databaseName);

      _logger.i('Initializing database at: $path');

      final database = await openDatabase(
        path,
        version: DatabaseConstants.databaseVersion,
        onCreate: _onCreate,
        onUpgrade: _onUpgrade,
        onConfigure: _onConfigure,
      );

      _logger.i('Database initialized successfully');
      return database;
    } catch (e) {
      _logger.e('Failed to initialize database', error: e);
      rethrow;
    }
  }

  /// Configure database settings
  Future<void> _onConfigure(Database db) async {
    // Enable foreign key constraints
    await db.execute('PRAGMA foreign_keys = ON');
    // Enable WAL mode for better concurrency
    await db.execute('PRAGMA journal_mode = WAL');
  }

  /// Create database tables
  Future<void> _onCreate(Database db, int version) async {
    try {
      _logger.i('Creating database tables...');

      // Users table for offline authentication
      await db.execute('''
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          nama TEXT,
          role TEXT NOT NULL,
          company_id TEXT,
          company_name TEXT,
          permissions TEXT, -- JSON array
          profile TEXT, -- JSON object
          is_active INTEGER DEFAULT 1,
          created_at TEXT,
          updated_at TEXT,
          synced_at TEXT
        )
      ''');

      // User assignments table
      await db.execute('''
        CREATE TABLE user_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          companies TEXT, -- JSON array
          estates TEXT, -- JSON array
          divisions TEXT, -- JSON array
          created_at TEXT,
          updated_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      ''');

      // Harvest data table (panen)
      await db.execute('''
        CREATE TABLE harvest_data (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          company_id TEXT,
          estate_id TEXT,
          division_id TEXT,
          blok_id TEXT,
          karyawan_id TEXT,
          tanggal_panen TEXT NOT NULL,
          janjang_count INTEGER NOT NULL,
          brondolan_kg REAL NOT NULL,
          total_kg REAL NOT NULL,
          latitude REAL,
          longitude REAL,
          status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
          approval_user_id TEXT,
          approval_notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'PENDING', -- PENDING, SYNCED, ERROR
          sync_error TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      ''');

      // Gate check records table
      await db.execute('''
        CREATE TABLE gate_check_records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          qr_token TEXT,
          intent TEXT NOT NULL, -- ENTRY, EXIT
          nomor_polisi TEXT NOT NULL,
          supir TEXT NOT NULL,
          blok TEXT,
          muatan TEXT,
          do_number TEXT,
          waktu_scan TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          status TEXT DEFAULT 'VALID',
          created_at TEXT NOT NULL,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'PENDING',
          sync_error TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      ''');

      // Master data - Companies
      await db.execute('''
        CREATE TABLE companies (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          kode_pabrik TEXT,
          alamat TEXT,
          latitude REAL,
          longitude REAL,
          contact_person TEXT,
          telepon TEXT,
          email TEXT,
          status TEXT,
          tanggal_berdiri TEXT,
          luas_lahan REAL,
          jumlah_blok INTEGER,
          varietas_utama TEXT,
          kapasitas_pabrik REAL,
          created_at TEXT,
          updated_at TEXT,
          synced_at TEXT
        )
      ''');

      // Master data - Estates
      await db.execute('''
        CREATE TABLE estates (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          kode TEXT,
          company_id TEXT NOT NULL,
          area_manager TEXT,
          manager TEXT,
          alamat TEXT,
          latitude REAL,
          longitude REAL,
          luas_total REAL,
          luas_planting_area REAL,
          jumlah_blok INTEGER,
          varietas_utama TEXT,
          tahun_tanam TEXT,
          status_operasional TEXT,
          created_at TEXT,
          updated_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (company_id) REFERENCES companies (id)
        )
      ''');

      // Master data - Divisions
      await db.execute('''
        CREATE TABLE divisions (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          kode TEXT,
          estate_id TEXT NOT NULL,
          asisten TEXT,
          mandor TEXT,
          luas_divisi REAL,
          jumlah_blok INTEGER,
          varietas_dominan TEXT,
          umur_tanaman_rata_rata INTEGER,
          target_produksi REAL,
          status_operasional TEXT,
          created_at TEXT,
          updated_at TEXT,
          synced_at TEXT,
          FOREIGN KEY (estate_id) REFERENCES estates (id)
        )
      ''');

      // Sync queue for offline operations
      await db.execute('''
        CREATE TABLE sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT, -- JSON data
          endpoint TEXT, -- GraphQL mutation/query
          priority INTEGER DEFAULT 0,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, SUCCESS, FAILED
          error_message TEXT,
          created_at TEXT NOT NULL,
          processed_at TEXT
        )
      ''');

      // Device information table
      await db.execute('''
        CREATE TABLE device_info (
          id INTEGER PRIMARY KEY,
          device_id TEXT UNIQUE NOT NULL,
          fingerprint TEXT NOT NULL,
          platform TEXT NOT NULL,
          os_version TEXT,
          app_version TEXT,
          model TEXT,
          brand TEXT,
          device_name TEXT,
          is_trusted INTEGER DEFAULT 0,
          last_active TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT
        )
      ''');

      // Authentication tokens table
      await db.execute('''
        CREATE TABLE auth_tokens (
          id INTEGER PRIMARY KEY,
          user_id TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          offline_token TEXT,
          token_type TEXT DEFAULT 'Bearer',
          expires_at TEXT,
          refresh_expires_at TEXT,
          offline_expires_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      ''');

      // Create indexes for better performance
      await _createIndexes(db);

      _logger.i('Database tables created successfully');
    } catch (e) {
      _logger.e('Failed to create database tables', error: e);
      rethrow;
    }
  }

  /// Create database indexes
  Future<void> _createIndexes(Database db) async {
    try {
      // Users table indexes
      await db.execute('CREATE INDEX idx_users_username ON users (username)');
      await db.execute('CREATE INDEX idx_users_email ON users (email)');
      await db.execute('CREATE INDEX idx_users_role ON users (role)');
      await db.execute('CREATE INDEX idx_users_company_id ON users (company_id)');

      // Harvest data indexes
      await db.execute('CREATE INDEX idx_harvest_user_id ON harvest_data (user_id)');
      await db.execute('CREATE INDEX idx_harvest_tanggal ON harvest_data (tanggal_panen)');
      await db.execute('CREATE INDEX idx_harvest_status ON harvest_data (status)');
      await db.execute('CREATE INDEX idx_harvest_sync_status ON harvest_data (sync_status)');
      await db.execute('CREATE INDEX idx_harvest_estate_division ON harvest_data (estate_id, division_id)');

      // Gate check indexes
      await db.execute('CREATE INDEX idx_gate_check_user_id ON gate_check_records (user_id)');
      await db.execute('CREATE INDEX idx_gate_check_waktu ON gate_check_records (waktu_scan)');
      await db.execute('CREATE INDEX idx_gate_check_sync_status ON gate_check_records (sync_status)');
      await db.execute('CREATE INDEX idx_gate_check_nomor_polisi ON gate_check_records (nomor_polisi)');

      // Master data indexes
      await db.execute('CREATE INDEX idx_estates_company_id ON estates (company_id)');
      await db.execute('CREATE INDEX idx_divisions_estate_id ON divisions (estate_id)');

      // Sync queue indexes
      await db.execute('CREATE INDEX idx_sync_queue_status ON sync_queue (status)');
      await db.execute('CREATE INDEX idx_sync_queue_table_record ON sync_queue (table_name, record_id)');
      await db.execute('CREATE INDEX idx_sync_queue_priority ON sync_queue (priority DESC, created_at ASC)');

      _logger.d('Database indexes created successfully');
    } catch (e) {
      _logger.e('Failed to create database indexes', error: e);
      rethrow;
    }
  }

  /// Handle database upgrades
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    _logger.i('Upgrading database from version $oldVersion to $newVersion');
    
    // Add migration logic here for future versions
    if (oldVersion < 2) {
      // Example migration for version 2
      // await db.execute('ALTER TABLE users ADD COLUMN new_field TEXT');
    }
  }

  /// Get database statistics
  Future<Map<String, int>> getDatabaseStats() async {
    try {
      final db = await database;
      final stats = <String, int>{};

      final tables = [
        'users',
        'harvest_data',
        'gate_check_records',
        'companies',
        'estates',
        'divisions',
        'sync_queue',
        'auth_tokens',
      ];

      for (final table in tables) {
        final result = await db.rawQuery('SELECT COUNT(*) as count FROM $table');
        stats[table] = result.first['count'] as int;
      }

      return stats;
    } catch (e) {
      _logger.e('Failed to get database statistics', error: e);
      return {};
    }
  }

  /// Clear all data (for logout or reset)
  Future<void> clearAllData() async {
    try {
      final db = await database;

      await db.transaction((txn) async {
        await txn.execute('DELETE FROM auth_tokens');
        await txn.execute('DELETE FROM sync_queue');
        await txn.execute('DELETE FROM gate_check_records');
        await txn.execute('DELETE FROM harvest_data');
        await txn.execute('DELETE FROM user_assignments');
        await txn.execute('DELETE FROM users');
        // Keep master data for offline reference
      });

      _logger.i('All user data cleared from database');
    } catch (e) {
      _logger.e('Failed to clear database data', error: e);
      rethrow;
    }
  }

  /// Close database connection
  Future<void> close() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
      _logger.i('Database connection closed');
    }
  }

  /// Delete database file (for testing)
  Future<void> deleteDatabase() async {
    try {
      final databasesPath = await getDatabasesPath();
      final path = join(databasesPath, DatabaseConstants.databaseName);
      
      if (_database != null) {
        await _database!.close();
        _database = null;
      }
      
      await databaseFactory.deleteDatabase(path);
      _logger.i('Database deleted successfully');
    } catch (e) {
      _logger.e('Failed to delete database', error: e);
      rethrow;
    }
  }

  /// Check database integrity
  Future<bool> checkIntegrity() async {
    try {
      final db = await database;
      final result = await db.rawQuery('PRAGMA integrity_check');
      final isOk = result.first['integrity_check'] == 'ok';
      
      if (isOk) {
        _logger.d('Database integrity check passed');
      } else {
        _logger.w('Database integrity check failed: ${result.first}');
      }
      
      return isOk;
    } catch (e) {
      _logger.e('Failed to check database integrity', error: e);
      return false;
    }
  }

  /// Vacuum database to reclaim space
  Future<void> vacuum() async {
    try {
      final db = await database;
      await db.execute('VACUUM');
      _logger.i('Database vacuum completed');
    } catch (e) {
      _logger.e('Failed to vacuum database', error: e);
    }
  }
}