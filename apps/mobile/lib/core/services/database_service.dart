import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import '../models/jwt_models.dart';

class DatabaseService {
  static final Logger _logger = Logger();
  static Database? _database;
  static final DatabaseService _instance = DatabaseService._internal();
  
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  // Get database instance
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initializeDatabase();
    return _database!;
  }

  // Initialize database
  Future<Database> _initializeDatabase() async {
    try {
      _logger.d('Initializing database');
      
      final databasesPath = await getDatabasesPath();
      final path = join(databasesPath, AppConfig.databaseName);

      final database = await openDatabase(
        path,
        version: AppConfig.databaseVersion,
        onCreate: _createDatabase,
        onUpgrade: _upgradeDatabase,
        onConfigure: _configureDatabase,
      );

      _logger.d('Database initialized successfully');
      return database;
    } catch (e) {
      _logger.e('Error initializing database: $e');
      rethrow;
    }
  }

  // Configure database settings
  Future<void> _configureDatabase(Database db) async {
    try {
      // Enable foreign keys
      await db.execute('PRAGMA foreign_keys = ON');
      
      // Set WAL mode for better concurrency
      // Note: Use rawQuery for PRAGMA statements that return data (like journal_mode)
      await db.rawQuery('PRAGMA journal_mode = WAL');
      
      // Optimize cache size (in pages, 1 page = 1024 bytes by default)
      await db.execute('PRAGMA cache_size = -2000'); // 2MB cache
      
      // Set synchronous mode to NORMAL for better performance
      await db.execute('PRAGMA synchronous = NORMAL');
      
      // Set temp store to memory for better performance
      await db.execute('PRAGMA temp_store = MEMORY');
      
      _logger.d('Database configured');
    } catch (e) {
      _logger.e('Error configuring database: $e');
    }
  }

  // Create database tables
  Future<void> _createDatabase(Database db, int version) async {
    try {
      _logger.d('Creating database tables');
      
      // Authentication & Security Tables
      await _createAuthTables(db);
      
      // Master Data Tables
      await _createMasterDataTables(db);
      
      // User Assignment Tables
      await _createUserAssignmentTables(db);
      
      // Harvest Operation Tables
      await _createHarvestTables(db);
      
      // Gate Check Operation Tables
      await _createGateCheckTables(db);
      
      // Sync Management Tables
      await _createSyncTables(db);
      
      // System & Monitoring Tables
      await _createSystemTables(db);
      
      _logger.d('Database tables created successfully');
    } catch (e) {
      _logger.e('Error creating database: $e');
      rethrow;
    }
  }

  // Authentication & Security Tables
  Future<void> _createAuthTables(Database db) async {
    // JWT Tokens table
    await db.execute('''
      CREATE TABLE jwt_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_type TEXT NOT NULL,
        token_value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // User Devices table
    await db.execute('''
      CREATE TABLE user_devices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        os_version TEXT,
        app_version TEXT,
        device_fingerprint TEXT NOT NULL,
        is_authorized INTEGER NOT NULL DEFAULT 0,
        is_trusted INTEGER NOT NULL DEFAULT 0,
        is_primary INTEGER NOT NULL DEFAULT 0,
        fcm_token TEXT,
        last_seen_at INTEGER NOT NULL,
        registered_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Biometric Auth table
    await db.execute('''
      CREATE TABLE biometric_auth (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        fingerprint_enabled INTEGER NOT NULL DEFAULT 0,
        face_id_enabled INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 0,
        enabled_at INTEGER,
        last_used_at INTEGER,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // User Sessions table
    await db.execute('''
      CREATE TABLE user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT NOT NULL,
        device_id TEXT,
        platform TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        last_activity_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Security Events table
    await db.execute('''
      CREATE TABLE security_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON
        device_id TEXT,
        ip_address TEXT,
        occurred_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Offline Auth table
    await db.execute('''
      CREATE TABLE offline_auth (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        offline_token_hash TEXT,
        offline_enabled INTEGER NOT NULL DEFAULT 0,
        offline_duration INTEGER NOT NULL DEFAULT 7,
        last_sync_at INTEGER,
        offline_expires_at INTEGER,
        max_offline_attempts INTEGER NOT NULL DEFAULT 5,
        current_offline_attempts INTEGER NOT NULL DEFAULT 0,
        offline_locked_until INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Users table (main user storage)
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        company_id TEXT,
        company_name TEXT,
        manager_id TEXT,
        manager_name TEXT,
        permissions TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        last_login_at INTEGER,
        password_changed_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'SYNCED',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1
      )
    ''');

    // Used Tokens table (JWT Token Management)
    await db.execute('''
      CREATE TABLE used_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti TEXT UNIQUE NOT NULL,
        user_id TEXT,
        token_type TEXT DEFAULT 'GUEST_ACCESS' CHECK (token_type IN ('GUEST_ACCESS', 'DEVICE_ACCESS', 'TEMPORARY_ACCESS')),
        used_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        device_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        location_coordinates TEXT,
        validation_method TEXT DEFAULT 'QR_SCAN' CHECK (validation_method IN ('QR_SCAN', 'MANUAL_ENTRY', 'BIOMETRIC')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED'))
      )
    ''');

    // Employee Logs table - Based on EMPLOYEE_ACCESS QR Code format
    // Input hanya melalui scan QR karyawan dengan format HRIS
    await db.execute('''
      CREATE TABLE employee_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id TEXT UNIQUE NOT NULL,
        
        -- Fields dari QR Code EMPLOYEE_ACCESS
        iddata TEXT NOT NULL,
        nik TEXT NOT NULL,
        nama TEXT NOT NULL,
        departement TEXT,
        
        -- Gate Check Info
        action TEXT NOT NULL CHECK (action IN ('ENTRY', 'EXIT')),
        gate_position TEXT NOT NULL,
        
        -- Timestamps
        scanned_at INTEGER NOT NULL,
        qr_timestamp INTEGER NOT NULL,
        
        -- Scan Info
        scanned_by_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        
        -- Optional
        photo_path TEXT,
        notes TEXT,
        latitude REAL,
        longitude REAL,
        
        -- Sync
        server_record_id TEXT,
        local_version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED'))
      )
    ''');
  }

  // Master Data Tables (Updated: Removed companies, estates, divisions as per new requirements)
  Future<void> _createMasterDataTables(Database db) async {
    // Blocks table
    await db.execute('''
      CREATE TABLE blocks (
        id TEXT PRIMARY KEY,
        division_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        area REAL,
        planting_year INTEGER,
        palm_count INTEGER,
        variety_type TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        latitude REAL,
        longitude REAL,
        elevation REAL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'SYNCED',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1,
        UNIQUE(division_id, code)
      )
    ''');

    // Employees table
    await db.execute('''
      CREATE TABLE employees (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        employee_id TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        phone TEXT,
        address TEXT,
        birth_date INTEGER,
        hire_date INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        employee_type TEXT NOT NULL DEFAULT 'BULANAN',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'SYNCED',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1
      )
    ''');
  }

  // User Assignment Tables
  Future<void> _createUserAssignmentTables(Database db) async {
    // User Estates table
    await db.execute('''
      CREATE TABLE user_estates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        estate_id TEXT NOT NULL,
        estate_name TEXT,
        estate_code TEXT,
        location TEXT,
        assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, estate_id)
      )
    ''');

    // User Divisions table
    await db.execute('''
      CREATE TABLE user_divisions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        division_name TEXT,
        division_code TEXT,
        assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, division_id)
      )
    ''');

    // User Companies table (for Area Managers)
    await db.execute('''
      CREATE TABLE user_companies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        company_name TEXT,
        can_view_reports INTEGER NOT NULL DEFAULT 1,
        can_manage_users INTEGER NOT NULL DEFAULT 1,
        can_access_system_logs INTEGER NOT NULL DEFAULT 0,
        can_export_data INTEGER NOT NULL DEFAULT 1,
        assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, company_id)
      )
    ''');
  }

  // Harvest Operation Tables
  Future<void> _createHarvestTables(Database db) async {
    // Harvest Records table
    await db.execute('''
      CREATE TABLE harvest_records (
        id TEXT PRIMARY KEY,
        harvest_number TEXT NOT NULL UNIQUE,
        block_id TEXT NOT NULL,
        harvest_date INTEGER NOT NULL,
        mandor_id TEXT NOT NULL,
        approved_by_id TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        approval_date INTEGER,
        rejection_reason TEXT,
        total_employees INTEGER NOT NULL DEFAULT 0,
        total_tbs INTEGER NOT NULL DEFAULT 0,
        total_weight REAL NOT NULL DEFAULT 0.0,
        total_brondolan REAL NOT NULL DEFAULT 0.0,
        average_ripeness TEXT,
        notes TEXT,
        approval_notes TEXT,
        required_corrections TEXT,
        client_timestamp INTEGER,
        device_id TEXT,
        coordinates TEXT,
        photos TEXT, -- JSON array of photo paths
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'PENDING',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1,
        company_id TEXT,
        manager_id TEXT,
        asisten_id TEXT,
        FOREIGN KEY (block_id) REFERENCES blocks (id)
      )
    ''');

    // Harvest Employees table
    await db.execute('''
      CREATE TABLE harvest_employees (
        id TEXT PRIMARY KEY,
        harvest_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        role TEXT,
        tbs_count INTEGER NOT NULL DEFAULT 0,
        weight REAL NOT NULL DEFAULT 0.0,
        brondolan REAL NOT NULL DEFAULT 0.0,
        work_hours REAL,
        overtime_hours REAL,
        check_in_time INTEGER,
        check_out_time INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'SYNCED',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (harvest_id) REFERENCES harvest_records (id),
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        UNIQUE(harvest_id, employee_id)
      )
    ''');

  }

  // Gate Check Operation Tables
  Future<void> _createGateCheckTables(Database db) async {
    // Gate Check Records table
    await db.execute('''
      CREATE TABLE gate_check_records (
        id TEXT PRIMARY KEY,
        pos_number TEXT NOT NULL,
        date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        time TEXT NOT NULL,
        passed INTEGER NOT NULL DEFAULT 0,
        driver_name TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        vehicle_characteristics TEXT,
        destination_location TEXT NOT NULL,
        load_type TEXT NOT NULL,
        load_volume REAL NOT NULL,
        load_owner TEXT NOT NULL,
        notes TEXT,
        entry_time INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        exit_time INTEGER,
        status TEXT NOT NULL DEFAULT 'ENTERING',
        photos TEXT, -- JSON array of photo paths
        qr_data TEXT, -- JSON of scanned QR code data
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'PENDING',
        synced_at INTEGER,
        version INTEGER NOT NULL DEFAULT 1
      )
    ''');

    // Gate Check Photos table (for photo sync)
    await db.execute('''
      CREATE TABLE gate_check_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id TEXT UNIQUE NOT NULL,
        gate_check_id TEXT,
        guest_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('VEHICLE', 'DRIVER', 'CARGO', 'DOCUMENT', 'GENERAL')),
        category TEXT NOT NULL CHECK (category IN ('ENTRY', 'EXIT', 'INSPECTION')),
        file_path TEXT NOT NULL,
        original_path TEXT,
        compressed_path TEXT,
        file_size INTEGER,
        compressed_size INTEGER,
        vehicle_plate TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        notes TEXT,
        metadata TEXT, -- JSON with EXIF data, GPS coordinates etc.
        compression_quality INTEGER DEFAULT 80,
        upload_priority INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        FOREIGN KEY (gate_check_id) REFERENCES gate_check_records (id),
        FOREIGN KEY (guest_id) REFERENCES gate_guest_logs (guest_id)
      )
    ''');

    // Registered Users table (for cross-device validation)
    await db.execute('''
      CREATE TABLE registered_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        position TEXT,
        vehicle_plate TEXT,
        phone TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
        is_authorized INTEGER NOT NULL DEFAULT 1,
        access_level TEXT DEFAULT 'STANDARD' CHECK (access_level IN ('STANDARD', 'PRIORITY', 'EXECUTIVE', 'EMERGENCY')),
        company_id TEXT,
        notes TEXT,
        registered_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED'))
      )
    ''');

    // Gate Check Stats table
    await db.execute('''
      CREATE TABLE gate_check_stats (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        vehicles_inside INTEGER NOT NULL DEFAULT 0,
        today_entries INTEGER NOT NULL DEFAULT 0,
        today_exits INTEGER NOT NULL DEFAULT 0,
        pending_exit INTEGER NOT NULL DEFAULT 0,
        average_load_time REAL NOT NULL DEFAULT 0.0,
        compliance_rate REAL NOT NULL DEFAULT 0.0,
        date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // QR Scan History table
    await db.execute('''
      CREATE TABLE qr_scan_history (
        id TEXT PRIMARY KEY,
        gate_check_id TEXT,
        scan_type TEXT NOT NULL, -- 'VEHICLE', 'DO', 'GENERAL'
        qr_data TEXT NOT NULL,
        parsed_data TEXT, -- JSON
        scan_result TEXT NOT NULL DEFAULT 'SUCCESS',
        scan_time INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        scanner_user_id TEXT NOT NULL,
        validation_status TEXT, -- 'VALID', 'INVALID', 'EXPIRED'
        validation_message TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (gate_check_id) REFERENCES gate_check_records (id)
      )
    ''');

    // Guest Logs table (for Intent-Based QR System)
    await db.execute('''
      CREATE TABLE gate_guest_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id TEXT UNIQUE NOT NULL,
        driver_name TEXT NOT NULL,
        contact_person TEXT,
        destination TEXT,
        entry_time INTEGER,
        exit_time INTEGER,
        vehicle_plate TEXT,
        vehicle_type TEXT DEFAULT 'OTHER',
        gate_position TEXT NOT NULL,
        created_by TEXT NOT NULL,
        company_id TEXT,
        status TEXT DEFAULT 'ENTRY' CHECK (status IN ('ENTRY', 'EXIT')),
        generation_intent TEXT CHECK (generation_intent IN ('ENTRY', 'EXIT')),
        notes TEXT,
        photo_path TEXT,
        qr_code_data TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
        
        -- New server columns
        entry_gate TEXT,
        exit_gate TEXT,
        authorized_user_id TEXT,
        created_user_id TEXT,
        device_id TEXT,
        checkpoints TEXT,
        journey_status TEXT,
        local_id TEXT,
        deleted_at INTEGER,
        id_card_number TEXT,
        latitude REAL,
        longitude REAL,
        cargo_volume TEXT,
        cargo_owner TEXT,
        estimated_weight REAL,
        delivery_order_number TEXT,
        load_type TEXT,
        second_cargo TEXT,
        server_record_id TEXT,
        sync_transaction_id TEXT,
        registration_source TEXT
      )
    ''');
  }

  // Sync Management Tables
  Future<void> _createSyncTables(Database db) async {
    // Sync Queue table
    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT UNIQUE NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE')),
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        server_record_id TEXT,
        data TEXT NOT NULL,
        dependencies TEXT,
        priority INTEGER DEFAULT 1,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        last_error TEXT,
        error_details TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        scheduled_at INTEGER,
        started_at INTEGER,
        completed_at INTEGER,
        user_id TEXT,
        device_id TEXT,
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'))
      )
    ''');

    // Sync Conflicts table
    await db.execute('''
      CREATE TABLE sync_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conflict_id TEXT UNIQUE NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        server_record_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        conflict_type TEXT NOT NULL CHECK (conflict_type IN ('VERSION_MISMATCH', 'DATA_CONFLICT', 'DELETE_CONFLICT', 'CONSTRAINT_VIOLATION')),
        conflict_fields TEXT,
        resolution_strategy TEXT CHECK (resolution_strategy IN ('LOCAL_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL')),
        resolution_data TEXT,
        resolved_by TEXT,
        resolved_at INTEGER,
        auto_resolvable INTEGER DEFAULT 0,
        user_id TEXT NOT NULL,
        device_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'MANUAL_REQUIRED'))
      )
    ''');

    // Enhanced Sync Logs table (for gate check operations)
    await db.execute('''
      CREATE TABLE sync_logs (
        id TEXT PRIMARY KEY,
        log_id TEXT UNIQUE NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('FULL_SYNC', 'PARTIAL_SYNC', 'PHOTO_SYNC', 'DATA_SYNC', 'PULL_SYNC')),
        sync_started_at INTEGER NOT NULL,
        sync_completed_at INTEGER,
        records_processed INTEGER DEFAULT 0,
        records_success INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        photos_synced INTEGER DEFAULT 0,
        bytes_uploaded INTEGER DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
        error_details TEXT, -- JSON array of errors
        network_type TEXT, -- 'WIFI', 'MOBILE', 'OFFLINE'
        battery_level INTEGER,
        storage_used REAL, -- MB
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    ''');
  }

  // System & Monitoring Tables
  Future<void> _createSystemTables(Database db) async {
    // Notifications table
    await db.execute('''
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data TEXT, -- JSON
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        is_read INTEGER NOT NULL DEFAULT 0,
        read_at INTEGER,
        schedule_at INTEGER,
        expires_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // User Activity Logs table
    await db.execute('''
      CREATE TABLE user_activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        metadata TEXT, -- JSON
        ip_address TEXT,
        user_agent TEXT,
        platform TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // App Metrics table
    await db.execute('''
      CREATE TABLE app_metrics (
        id TEXT PRIMARY KEY,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_type TEXT NOT NULL, -- 'COUNTER', 'GAUGE', 'HISTOGRAM'
        tags TEXT, -- JSON
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // App Settings table
    await db.execute('''
      CREATE TABLE app_settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL',
        description TEXT,
        is_user_configurable INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Create indexes for better performance
    await _createIndexes(db);
  }

  // Create database indexes
  Future<void> _createIndexes(Database db) async {
    _logger.d('Creating database indexes');

    // JWT Tokens indexes
    await db.execute('CREATE INDEX idx_jwt_tokens_type ON jwt_tokens (token_type)');
    await db.execute('CREATE INDEX idx_jwt_tokens_expires_at ON jwt_tokens (expires_at)');

    // User Devices indexes
    await db.execute('CREATE INDEX idx_user_devices_user_id ON user_devices (user_id)');
    await db.execute('CREATE INDEX idx_user_devices_device_id ON user_devices (device_id)');
    await db.execute('CREATE INDEX idx_user_devices_is_authorized ON user_devices (is_authorized)');



    // Blocks indexes
    await db.execute('CREATE INDEX idx_blocks_division_id ON blocks (division_id)');
    await db.execute('CREATE INDEX idx_blocks_code ON blocks (code)');
    await db.execute('CREATE INDEX idx_blocks_is_active ON blocks (is_active)');
    await db.execute('CREATE INDEX idx_blocks_location ON blocks (latitude, longitude)');

    // Employees indexes
    await db.execute('CREATE INDEX idx_employees_company_id ON employees (company_id)');
    await db.execute('CREATE INDEX idx_employees_employee_id ON employees (employee_id)');
    await db.execute('CREATE INDEX idx_employees_is_active ON employees (is_active)');

    // Harvest Records indexes
    await db.execute('CREATE INDEX idx_harvest_records_block_id ON harvest_records (block_id)');
    await db.execute('CREATE INDEX idx_harvest_records_mandor_id ON harvest_records (mandor_id)');
    await db.execute('CREATE INDEX idx_harvest_records_status ON harvest_records (status)');
    await db.execute('CREATE INDEX idx_harvest_records_harvest_date ON harvest_records (harvest_date)');
    await db.execute('CREATE INDEX idx_harvest_records_sync_status ON harvest_records (sync_status)');

    // Gate Check Records indexes
    await db.execute('CREATE INDEX idx_gate_check_records_vehicle_plate ON gate_check_records (vehicle_plate)');
    await db.execute('CREATE INDEX idx_gate_check_records_date ON gate_check_records (date)');
    await db.execute('CREATE INDEX idx_gate_check_records_status ON gate_check_records (status)');
    await db.execute('CREATE INDEX idx_gate_check_records_sync_status ON gate_check_records (sync_status)');

    // Sync Queue indexes
    await db.execute('CREATE INDEX idx_sync_queue_status ON sync_queue (status)');
    await db.execute('CREATE INDEX idx_sync_queue_priority ON sync_queue (priority)');
    await db.execute('CREATE INDEX idx_sync_queue_created_at ON sync_queue (created_at)');
    await db.execute('CREATE INDEX idx_sync_queue_table_operation ON sync_queue (table_name, operation_type)');

    // Notifications indexes
    await db.execute('CREATE INDEX idx_notifications_user_id ON notifications (user_id)');
    await db.execute('CREATE INDEX idx_notifications_is_read ON notifications (is_read)');
    await db.execute('CREATE INDEX idx_notifications_created_at ON notifications (created_at)');

    // User Activity Logs indexes
    await db.execute('CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs (user_id)');
    await db.execute('CREATE INDEX idx_user_activity_logs_action ON user_activity_logs (action)');
    await db.execute('CREATE INDEX idx_user_activity_logs_timestamp ON user_activity_logs (timestamp)');

    // Guest Logs indexes
    // Gate Guest Logs indexes
    await db.execute('CREATE INDEX idx_gate_guest_logs_guest_id ON gate_guest_logs (guest_id)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_status ON gate_guest_logs (status)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_generation_intent ON gate_guest_logs (generation_intent)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_sync_status ON gate_guest_logs (sync_status)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_created_at ON gate_guest_logs (created_at)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_entry_time ON gate_guest_logs (entry_time)');
    await db.execute('CREATE INDEX idx_gate_guest_logs_exit_time ON gate_guest_logs (exit_time)');

    // Used Tokens indexes
    await db.execute('CREATE INDEX idx_used_tokens_jti ON used_tokens (jti)');
    await db.execute('CREATE INDEX idx_used_tokens_user_id ON used_tokens (user_id)');
    await db.execute('CREATE INDEX idx_used_tokens_expires_at ON used_tokens (expires_at)');
    await db.execute('CREATE INDEX idx_used_tokens_sync_status ON used_tokens (sync_status)');



    // Gate Check Photos indexes
    await db.execute('CREATE INDEX idx_gate_check_photos_gate_check_id ON gate_check_photos (gate_check_id)');
    await db.execute('CREATE INDEX idx_gate_check_photos_guest_id ON gate_check_photos (guest_id)');
    await db.execute('CREATE INDEX idx_gate_check_photos_vehicle_plate ON gate_check_photos (vehicle_plate)');
    await db.execute('CREATE INDEX idx_gate_check_photos_type ON gate_check_photos (type)');
    await db.execute('CREATE INDEX idx_gate_check_photos_category ON gate_check_photos (category)');
    await db.execute('CREATE INDEX idx_gate_check_photos_timestamp ON gate_check_photos (timestamp)');
    await db.execute('CREATE INDEX idx_gate_check_photos_sync_status ON gate_check_photos (sync_status)');

    // Registered Users indexes
    await db.execute('CREATE INDEX idx_registered_users_user_id ON registered_users (user_id)');
    await db.execute('CREATE INDEX idx_registered_users_name ON registered_users (name)');
    await db.execute('CREATE INDEX idx_registered_users_vehicle_plate ON registered_users (vehicle_plate)');
    await db.execute('CREATE INDEX idx_registered_users_status ON registered_users (status)');
    await db.execute('CREATE INDEX idx_registered_users_company_id ON registered_users (company_id)');
    await db.execute('CREATE INDEX idx_registered_users_sync_status ON registered_users (sync_status)');

    // QR Scan History indexes
    await db.execute('CREATE INDEX idx_qr_scan_history_gate_check_id ON qr_scan_history (gate_check_id)');
    await db.execute('CREATE INDEX idx_qr_scan_history_scan_type ON qr_scan_history (scan_type)');
    await db.execute('CREATE INDEX idx_qr_scan_history_scan_time ON qr_scan_history (scan_time)');
    await db.execute('CREATE INDEX idx_qr_scan_history_scanner_user_id ON qr_scan_history (scanner_user_id)');

    // Sync Logs indexes
    await db.execute('CREATE INDEX idx_sync_logs_device_id ON sync_logs (device_id)');
    await db.execute('CREATE INDEX idx_sync_logs_user_id ON sync_logs (user_id)');
    await db.execute('CREATE INDEX idx_sync_logs_operation_type ON sync_logs (operation_type)');
    await db.execute('CREATE INDEX idx_sync_logs_status ON sync_logs (status)');
    await db.execute('CREATE INDEX idx_sync_logs_sync_started_at ON sync_logs (sync_started_at)');

    _logger.d('Database indexes created');
  }

  // Upgrade database
  Future<void> _upgradeDatabase(Database db, int oldVersion, int newVersion) async {
    _logger.d('Upgrading database from version $oldVersion to $newVersion');
    
    // Version-specific migrations
    if (oldVersion < 5) {
      // Migration v4 -> v5: Add registration_source column to gate_guest_logs
      await _migrateV4ToV5(db);
    }

    if (oldVersion < 6) {
      // Migration v5 -> v6: Remove deprecated tbs_records table
      await db.execute('DROP TABLE IF EXISTS tbs_records');
    }
    
    // If there are larger schema changes that can't be migrated, recreate
    // For now, we only add columns for minor upgrades
  }

  // Migration v4 -> v5: Add registration_source column
  Future<void> _migrateV4ToV5(Database db) async {
    _logger.d('Running migration v4 -> v5: Adding registration_source column');
    try {
      // Check if column already exists
      final columns = await db.rawQuery("PRAGMA table_info(gate_guest_logs)");
      final columnNames = columns.map((c) => c['name'] as String).toList();
      
      if (!columnNames.contains('registration_source')) {
        await db.execute('ALTER TABLE gate_guest_logs ADD COLUMN registration_source TEXT');
        _logger.d('Added registration_source column to gate_guest_logs');
      } else {
        _logger.d('registration_source column already exists');
      }
    } catch (e) {
      _logger.e('Error in migration v4 -> v5: $e');
      // Don't rethrow - allow app to continue even if migration fails
    }
  }

  // Drop all tables (for upgrade)
  Future<void> _dropAllTables(Database db) async {
    final tables = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'"
    );
    
    for (final table in tables) {
      final tableName = table['name'] as String;
      await db.execute('DROP TABLE IF EXISTS $tableName');
    }
  }

  // Execute raw query
  Future<List<Map<String, dynamic>>> rawQuery(String sql, [List<dynamic>? arguments]) async {
    try {
      final db = await database;
      return await db.rawQuery(sql, arguments);
    } catch (e) {
      _logger.e('Error executing raw query: $e');
      rethrow;
    }
  }

  // Insert record
  Future<int> insert(String table, Map<String, dynamic> values, {ConflictAlgorithm? conflictAlgorithm}) async {
    try {
      final db = await database;
      return await db.insert(table, values, conflictAlgorithm: conflictAlgorithm);
    } catch (e) {
      _logger.e('Error inserting into $table: $e');
      rethrow;
    }
  }

  // Update record
  Future<int> update(String table, Map<String, dynamic> values, {String? where, List<dynamic>? whereArgs}) async {
    try {
      final db = await database;
      return await db.update(table, values, where: where, whereArgs: whereArgs);
    } catch (e) {
      _logger.e('Error updating $table: $e');
      rethrow;
    }
  }

  // Delete record
  Future<int> delete(String table, {String? where, List<dynamic>? whereArgs}) async {
    try {
      final db = await database;
      return await db.delete(table, where: where, whereArgs: whereArgs);
    } catch (e) {
      _logger.e('Error deleting from $table: $e');
      rethrow;
    }
  }

  // Query records
  Future<List<Map<String, dynamic>>> query(
    String table, {
    bool? distinct,
    List<String>? columns,
    String? where,
    List<dynamic>? whereArgs,
    String? groupBy,
    String? having,
    String? orderBy,
    int? limit,
    int? offset,
  }) async {
    try {
      final db = await database;
      return await db.query(
        table,
        distinct: distinct,
        columns: columns,
        where: where,
        whereArgs: whereArgs,
        groupBy: groupBy,
        having: having,
        orderBy: orderBy,
        limit: limit,
        offset: offset,
      );
    } catch (e) {
      _logger.e('Error querying $table: $e');
      rethrow;
    }
  }

  // Execute transaction
  Future<T> transaction<T>(Future<T> Function(Transaction txn) action) async {
    try {
      final db = await database;
      return await db.transaction(action);
    } catch (e) {
      _logger.e('Error executing transaction: $e');
      rethrow;
    }
  }

  // Get database info
  Future<Map<String, dynamic>> getDatabaseInfo() async {
    try {
      final db = await database;
      final version = await db.getVersion();
      final path = db.path;
      final isOpen = db.isOpen;
      
      // Get table count
      final tables = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      );
      final tableCount = tables.first['count'] as int;
      
      // Get database size
      final file = File(path);
      final size = await file.length();
      
      return {
        'path': path,
        'version': version,
        'isOpen': isOpen,
        'tableCount': tableCount,
        'sizeBytes': size,
        'sizeMB': (size / (1024 * 1024)).toStringAsFixed(2),
      };
    } catch (e) {
      _logger.e('Error getting database info: $e');
      return {'error': e.toString()};
    }
  }

  // Initialize service (for compatibility with service locator)
  Future<void> initialize() async {
    try {
      await database; // This will initialize the database
      _logger.d('DatabaseService initialized');
    } catch (e) {
      _logger.e('Error initializing DatabaseService: $e');
      rethrow;
    }
  }

  // Store AuthUser (for compatibility with authentication service)
  Future<void> storeAuthUser(AuthUser user, UserAssignments? assignments) async {
    try {
      await transaction((txn) async {
        // Store user in users table (adapted for existing schema)
        await txn.insert(
          'users',
          {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.name,
            'role': user.role,
            'company_id': user.companyId,
            'company_name': user.companyName,
            'manager_id': user.managerId,
            'manager_name': user.managerName,
            'permissions': user.permissions?.join(','),
            'is_active': 1,
            'created_at': DateTime.now().millisecondsSinceEpoch,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );

        // Store assignments if provided
        if (assignments != null) {
          // Store company assignments
          for (final company in assignments.companies) {
            await txn.insert(
              'user_companies',
              {
                'id': '${user.id}_${company.id}',
                'user_id': user.id,
                'company_id': company.id,
                'company_name': company.name,
                'assigned_at': DateTime.now().millisecondsSinceEpoch,
                'is_active': 1,
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }

          // Store estate assignments
          for (final estate in assignments.estates) {
            await txn.insert(
              'user_estates',
              {
                'id': '${user.id}_${estate.id}',
                'user_id': user.id,
                'estate_id': estate.id,
                'estate_name': estate.name,
                'estate_code': estate.kode ?? estate.id,
                'location': estate.alamat,
                'assigned_at': DateTime.now().millisecondsSinceEpoch,
                'is_active': 1,
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }

          // Store division assignments
          for (final division in assignments.divisions) {
            await txn.insert(
              'user_divisions',
              {
                'id': '${user.id}_${division.id}',
                'user_id': user.id,
                'division_id': division.id,
                'division_name': division.name,
                'division_code': division.kode ?? division.id,
                'assigned_at': DateTime.now().millisecondsSinceEpoch,
                'is_active': 1,
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }
        }
      });

      _logger.d('AuthUser stored: ${user.username}');
    } catch (e) {
      _logger.e('Error storing AuthUser: $e');
      rethrow;
    }
  }

  // Get AuthUser (for compatibility with authentication service)
  Future<AuthUser?> getAuthUser(String userId) async {
    try {
      final users = await query(
        'users',
        where: 'id = ?',
        whereArgs: [userId],
        limit: 1,
      );

      if (users.isEmpty) return null;

      final userData = users.first;
      return AuthUser(
        id: userData['id'] as String,
        username: userData['username'] as String,
        email: userData['email'] as String?,
        name: userData['full_name'] as String?,
        role: userData['role'] as String,
        companyId: userData['company_id'] as String?,
        companyName: userData['company_name'] as String?,
        managerId: userData['manager_id'] as String?,
        managerName: userData['manager_name'] as String?,
        permissions: (userData['permissions'] as String?)?.split(','),
      );
    } catch (e) {
      _logger.e('Error getting AuthUser: $e');
      return null;
    }
  }

  // Get UserAssignments (for compatibility with authentication service)
  Future<UserAssignments?> getUserAssignments(String userId) async {
    try {
      // Get company assignments
      final companies = await rawQuery('''
        SELECT c.* FROM companies c
        INNER JOIN user_companies uc ON c.id = uc.company_id
        WHERE uc.user_id = ? AND uc.is_active = 1
      ''', [userId]);

      // Get estate assignments
      final estates = await rawQuery('''
        SELECT e.* FROM estates e
        INNER JOIN user_estates ue ON e.id = ue.estate_id
        WHERE ue.user_id = ? AND ue.is_active = 1
      ''', [userId]);

      // Get division assignments
      final divisions = await rawQuery('''
        SELECT d.* FROM divisions d
        INNER JOIN user_divisions ud ON d.id = ud.division_id
        WHERE ud.user_id = ? AND ud.is_active = 1
      ''', [userId]);

      return UserAssignments(
        companies: companies.map((c) => AuthCompany(
          id: c['id'] as String,
          name: c['name'] as String,
        )).toList(),
        estates: estates.map((e) => AuthEstate(
          id: e['id'] as String,
          name: e['name'] as String,
          companyId: e['company_id'] as String?,
          kode: e['code'] as String?,
          alamat: e['location'] as String?,
          luasTotal: e['area'] as double?,
        )).toList(),
        divisions: divisions.map((d) => AuthDivision(
          id: d['id'] as String,
          name: d['name'] as String,
          estateId: d['estate_id'] as String?,
          kode: d['code'] as String?,
          luasDivisi: d['area'] as double?,
        )).toList(),
      );
    } catch (e) {
      _logger.e('Error getting UserAssignments: $e');
      return null;
    }
  }

  // Store DeviceInfo (for compatibility with authentication service)
  Future<void> storeDeviceInfo(DeviceInfo deviceInfo) async {
    try {
      await insert(
        'user_devices',
        {
          'id': deviceInfo.deviceId,
          'user_id': 'system', // Will be updated when user logs in
          'device_id': deviceInfo.deviceId,
          'device_name': deviceInfo.deviceName ?? 'Unknown Device',
          'platform': deviceInfo.platform,
          'os_version': deviceInfo.osVersion,
          'app_version': deviceInfo.appVersion,
          'device_fingerprint': deviceInfo.fingerprint,
          'is_authorized': 0,
          'is_trusted': 0,
          'is_primary': 0,
          'last_seen_at': DateTime.now().millisecondsSinceEpoch,
          'registered_at': DateTime.now().millisecondsSinceEpoch,
          'created_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      _logger.d('DeviceInfo stored: ${deviceInfo.deviceId}');
    } catch (e) {
      _logger.e('Error storing DeviceInfo: $e');
      rethrow;
    }
  }

  // Store authentication tokens
  Future<void> storeAuthTokens({
    required String userId,
    required String accessToken,
    required String refreshToken,
    String? offlineToken,
    String? tokenType,
    String? expiresAt,
    String? refreshExpiresAt,
    String? offlineExpiresAt,
  }) async {
    try {
      await insert(
        'jwt_tokens',
        {
          'token_type': tokenType ?? 'Bearer',
          'token_value': accessToken,
          'expires_at': expiresAt != null ? 
                        DateTime.parse(expiresAt).millisecondsSinceEpoch : 
                        DateTime.now().add(Duration(minutes: 15)).millisecondsSinceEpoch,
          'created_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
      );

      _logger.d('Auth tokens stored for user: $userId');
    } catch (e) {
      _logger.e('Error storing auth tokens: $e');
      rethrow;
    }
  }

  // Add to sync queue
  Future<void> addToSyncQueue({
    required String operationType,
    required String tableName,
    required String recordId,
    required Map<String, dynamic> data,
    required String endpoint,
    int priority = 0,
  }) async {
    try {
      await insert('sync_queue', {
        'operation_id': '${DateTime.now().millisecondsSinceEpoch}_$recordId',
        'operation_type': operationType,
        'table_name': tableName,
        'record_id': recordId,
        'data': jsonEncode(data),
        'priority': priority,
        'retry_count': 0,
        'max_retries': 3,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'status': 'PENDING',
      });

      _logger.d('Added to sync queue: $operationType $tableName/$recordId');
    } catch (e) {
      _logger.e('Error adding to sync queue: $e');
      rethrow;
    }
  }

  // Get pending sync items
  Future<List<Map<String, dynamic>>> getPendingSyncItems({int limit = 10}) async {
    try {
      return await query(
        'sync_queue',
        where: 'status = ?',
        whereArgs: ['PENDING'],
        orderBy: 'priority DESC, created_at ASC',
        limit: limit,
      );
    } catch (e) {
      _logger.e('Error getting pending sync items: $e');
      return [];
    }
  }

  // Update sync item status
  Future<void> updateSyncItemStatus(int syncId, String status, {String? errorMessage}) async {
    try {
      await update(
        'sync_queue',
        {
          'status': status,
          'last_error': errorMessage,
          'completed_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'id = ?',
        whereArgs: [syncId],
      );

      _logger.d('Updated sync item $syncId status to: $status');
    } catch (e) {
      _logger.e('Error updating sync item status: $e');
      rethrow;
    }
  }

  // Get database statistics
  Future<Map<String, int>> getStats() async {
    try {
      final stats = <String, int>{};
      
      final tables = [
        'users',
        'companies',
        'estates',
        'divisions',
        'harvest_records',
        'gate_check_records',
        'sync_queue',
        'jwt_tokens',
      ];

      for (final table in tables) {
        final result = await rawQuery('SELECT COUNT(*) as count FROM $table');
        stats[table] = result.first['count'] as int;
      }

      return stats;
    } catch (e) {
      _logger.e('Error getting database stats: $e');
      return {};
    }
  }

  // Clear user data (for logout)
  Future<void> clearUserData() async {
    try {
      await transaction((txn) async {
        await txn.execute('DELETE FROM jwt_tokens');
        await txn.execute('DELETE FROM user_sessions');
        await txn.execute('DELETE FROM sync_queue WHERE status = "PENDING"');
        await txn.execute('DELETE FROM user_companies');
        await txn.execute('DELETE FROM user_estates');
        await txn.execute('DELETE FROM user_divisions');
        await txn.execute('DELETE FROM users');
      });

      _logger.i('User data cleared from database');
    } catch (e) {
      _logger.e('Error clearing user data: $e');
      rethrow;
    }
  }

  // Vacuum database
  Future<void> vacuum() async {
    try {
      final db = await database;
      await db.execute('VACUUM');
      _logger.i('Database vacuum completed');
    } catch (e) {
      _logger.e('Error vacuuming database: $e');
    }
  }

  // Close database
  Future<void> close() async {
    try {
      if (_database != null) {
        await _database!.close();
        _database = null;
        _logger.d('Database closed');
      }
    } catch (e) {
      _logger.e('Error closing database: $e');
    }
  }
}
