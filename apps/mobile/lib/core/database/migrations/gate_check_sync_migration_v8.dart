import 'dart:async';
import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

/**
 * ====================================================================
 * FLUTTER GATE CHECK SYNC MIGRATION V8
 * ====================================================================
 * 
 * Comprehensive migration to transform existing gate check data
 * to the new enhanced sync architecture
 * 
 * Migration Features:
 * - Preserve all existing gate check data
 * - Upgrade schema to support intent-based QR system
 * - Add comprehensive sync management fields
 * - Implement photo documentation system
 * - Create conflict resolution support
 * - Add performance optimization indexes
 * - Ensure backward compatibility
 * ====================================================================
 */

class GateCheckSyncMigrationV8 {
  static final Logger _logger = Logger();
  static final Uuid _uuid = const Uuid();
  
  static const int fromVersion = 7;
  static const int toVersion = 8;
  
  /// Instance method to call the static migration
  Future<void> migrate(Database db) async {
    await executeMigration(db);
  }
  
  /// Execute the complete migration from version 7 to 8
  static Future<void> executeMigration(Database db) async {
    try {
      _logger.i('Starting Gate Check Sync Migration V8');
      
      await db.transaction((txn) async {
        // Step 1: Backup existing data
        await _backupExistingData(txn);
        
        // Step 2: Create new enhanced tables
        await _createEnhancedTables(txn);
        
        // Step 3: Migrate existing data to new structure
        await _migrateExistingData(txn);
        
        // Step 4: Create performance indexes
        await _createPerformanceIndexes(txn);
        
        // Step 5: Setup triggers and constraints
        await _setupTriggersAndConstraints(txn);
        
        // Step 6: Cleanup old tables (optional - can be kept for safety)
        // await _cleanupOldTables(txn);
        
        // Step 7: Verify migration integrity
        await _verifyMigrationIntegrity(txn);
        
        _logger.i('Gate Check Sync Migration V8 completed successfully');
      });
      
    } catch (e) {
      _logger.e('Error during Gate Check Sync Migration V8', error: e);
      rethrow;
    }
  }
  
  /// Backup existing data before migration
  static Future<void> _backupExistingData(Transaction txn) async {
    try {
      _logger.d('Creating backup tables for existing data');
      
      // Backup guest_logs (if exists)
      try {
        await txn.execute('''
          CREATE TABLE guest_logs_backup_v7 AS
          SELECT * FROM guest_logs
        ''');
        _logger.d('Backed up guest_logs table');
      } catch (e) {
        _logger.w('guest_logs table may not exist, skipping backup');
      }
      
      // Backup gate_check_records (if exists)
      try {
        await txn.execute('''
          CREATE TABLE gate_check_records_backup_v7 AS
          SELECT * FROM gate_check_records
        ''');
        _logger.d('Backed up gate_check_records table');
      } catch (e) {
        _logger.w('gate_check_records table may not exist, skipping backup');
      }
      
      // Backup gate_check_photos (if exists)
      try {
        await txn.execute('''
          CREATE TABLE gate_check_photos_backup_v7 AS
          SELECT * FROM gate_check_photos
        ''');
        _logger.d('Backed up gate_check_photos table');
      } catch (e) {
        _logger.w('gate_check_photos table may not exist, skipping backup');
      }
      
    } catch (e) {
      _logger.e('Error backing up existing data', error: e);
      rethrow;
    }
  }
  
  /// Create new enhanced tables with full sync support
  static Future<void> _createEnhancedTables(Transaction txn) async {
    try {
      _logger.d('Creating enhanced gate check tables');
      
      // Drop existing tables to recreate with new structure
      await txn.execute('DROP TABLE IF EXISTS guest_logs');
      await txn.execute('DROP TABLE IF EXISTS gate_guest_logs');
      await txn.execute('DROP TABLE IF EXISTS gate_check_records');
      await txn.execute('DROP TABLE IF EXISTS gate_check_photos');
      
      // Create enhanced guest_logs table
      await txn.execute('''
        CREATE TABLE gate_guest_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_id TEXT UNIQUE NOT NULL,
          driver_name TEXT NOT NULL,
          guest_purpose TEXT NOT NULL,
          vehicle_plate TEXT,
          vehicle_type TEXT DEFAULT 'OTHER',
          destination TEXT,
          username TEXT,
          
          -- Intent-Based QR System Fields
          generation_intent TEXT CHECK (generation_intent IN ('ENTRY', 'EXIT')),
          status TEXT DEFAULT 'ENTRY' CHECK (status IN ('ENTRY', 'EXIT', 'REGISTERED_FOR_ENTRY', 'EXITED', 'INSIDE', 'CANCELLED')),
          
          -- Timing Fields
          entry_time INTEGER,
          exit_time INTEGER,

          -- Gate Information
          gate_position TEXT NOT NULL,
          entry_gate TEXT,
          exit_gate TEXT,
          
          -- Documentation
          notes TEXT,
          photo_path TEXT,
          qr_code_data TEXT,
          
          -- User & Device Tracking
          created_by TEXT NOT NULL,
          device_id TEXT,
          device_name TEXT,
          device_fingerprint TEXT,
          
          -- Enhanced Sync Management
          sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
          sync_priority TEXT DEFAULT 'HIGH' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          sync_retry_count INTEGER DEFAULT 0,
          sync_version INTEGER DEFAULT 1,
          last_sync_error TEXT,
          
          -- Timestamps
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          synced_at INTEGER,
          
          -- Conflict Resolution Support
          local_version INTEGER DEFAULT 1,
          server_version INTEGER,
          conflict_data TEXT,
          needs_manual_resolution INTEGER DEFAULT 0,
          
          FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
        )
      ''');
      
      // Create guest_qr_tokens table
      await txn.execute('''
        CREATE TABLE guest_qr_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_log_id INTEGER NOT NULL,
          jti TEXT UNIQUE NOT NULL,
          
          -- Intent-Based System
          generation_intent TEXT NOT NULL CHECK (generation_intent IN ('ENTRY', 'EXIT')),
          allowed_scan TEXT NOT NULL CHECK (allowed_scan IN ('ENTRY', 'EXIT')),
          
          -- Cross-Device Support
          generated_device TEXT,
          scanned_device TEXT,
          
          -- Single-Use Security
          max_usage INTEGER DEFAULT 1,
          current_usage INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'INVALID')),
          
          -- Token Lifecycle
          expires_at INTEGER NOT NULL,
          generated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          first_used_at INTEGER,
          last_used_at INTEGER,
          
          -- Security & Validation
          token_hash TEXT,
          device_fingerprint TEXT,
          ip_address TEXT,
          user_agent TEXT,
          location_coordinates TEXT,
          
          -- Usage Tracking
          usage_history TEXT DEFAULT '[]',
          validation_method TEXT DEFAULT 'QR_SCAN' CHECK (validation_method IN ('QR_SCAN', 'MANUAL_ENTRY', 'BIOMETRIC', 'RFID', 'NFC')),
          
          -- Sync Management
          sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
          sync_priority TEXT DEFAULT 'HIGH' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          synced_at INTEGER,
          
          FOREIGN KEY (guest_log_id) REFERENCES gate_guest_logs (id) ON DELETE CASCADE
        )
      ''');
      
      // Create enhanced gate_check_records table
      await txn.execute('''
        CREATE TABLE gate_check_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gate_check_id TEXT UNIQUE NOT NULL,
          company_id TEXT NOT NULL,
          
          -- Basic Information
          pos_number TEXT NOT NULL,
          vehicle_plate TEXT NOT NULL,
          driver_name TEXT NOT NULL,
          vehicle_type TEXT NOT NULL,
          vehicle_characteristics TEXT,
          username TEXT,
          
          -- Destination & Load Information
          destination_location TEXT NOT NULL,
          load_type TEXT NOT NULL,
          load_volume REAL NOT NULL,
          load_owner TEXT NOT NULL,
          estimated_weight REAL,
          actual_weight REAL,
          do_number TEXT,
          
          -- QR Code Integration
          qr_code_data TEXT,
          linked_guest_log_id TEXT,
          
          -- Timing & Status
          entry_time INTEGER NOT NULL,
          exit_time INTEGER,
          status TEXT DEFAULT 'ENTERING' CHECK (status IN ('ENTERING', 'INSIDE', 'EXITING', 'EXITED', 'CANCELLED', 'ERROR')),
          passed INTEGER DEFAULT 0,
          
          -- Validation & Security
          validation_notes TEXT,
          security_notes TEXT,
          emergency_flag INTEGER DEFAULT 0,
          approval_required INTEGER DEFAULT 0,
          approved_by TEXT,
          approval_timestamp INTEGER,
          
          -- User & Device Tracking
          created_by TEXT NOT NULL,
          device_id TEXT,
          device_name TEXT,
          device_fingerprint TEXT,
          
          -- Location & Environmental
          gate_position TEXT NOT NULL,
          weather_conditions TEXT,
          latitude REAL,
          longitude REAL,
          
          -- Enhanced Sync Management
          sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
          sync_priority TEXT DEFAULT 'HIGH' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          sync_retry_count INTEGER DEFAULT 0,
          sync_version INTEGER DEFAULT 1,
          last_sync_error TEXT,
          
          -- Timestamps
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          synced_at INTEGER,
          
          -- Conflict Resolution Support
          local_version INTEGER DEFAULT 1,
          server_version INTEGER,
          conflict_data TEXT,
          needs_manual_resolution INTEGER DEFAULT 0,
          
          FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
          FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
        )
      ''');
      
      // Create enhanced gate_check_photos table
      await txn.execute('''
        CREATE TABLE gate_check_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          photo_id TEXT UNIQUE NOT NULL,
          
          -- Photo Relationship
          related_record_type TEXT NOT NULL CHECK (related_record_type IN ('GUEST_LOG', 'GATE_CHECK_RECORD', 'QR_SCAN', 'SECURITY_INCIDENT', 'EQUIPMENT_CHECK')),
          related_record_id TEXT NOT NULL,
          
          -- File Information
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          original_file_name TEXT,
          file_size INTEGER NOT NULL,
          file_extension TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          
          -- Photo Details
          photo_type TEXT NOT NULL CHECK (photo_type IN ('ENTRY', 'EXIT', 'VEHICLE', 'VEHICLE_FRONT', 'VEHICLE_BACK', 'GUEST', 'DOCUMENT', 'QR_CODE', 'SECURITY', 'EQUIPMENT')),
          photo_quality TEXT DEFAULT 'MEDIUM' CHECK (photo_quality IN ('LOW', 'MEDIUM', 'HIGH', 'ULTRA')),
          compression_applied INTEGER DEFAULT 0,
          original_file_size INTEGER,
          
          -- Location & Context
          latitude REAL,
          longitude REAL,
          taken_at INTEGER NOT NULL,
          camera_used TEXT,
          
          -- Metadata
          metadata TEXT,
          description TEXT,
          tags TEXT,
          
          -- User & Device Information
          created_by TEXT NOT NULL,
          device_id TEXT,
          device_model TEXT,
          device_fingerprint TEXT,
          
          -- Advanced Sync Management
          sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
          sync_priority TEXT DEFAULT 'MEDIUM' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          upload_progress REAL DEFAULT 0.0,
          upload_retry_count INTEGER DEFAULT 0,
          last_upload_error TEXT,
          
          -- Storage Information
          local_path TEXT,
          cloud_path TEXT,
          thumbnail_path TEXT,
          is_compressed INTEGER DEFAULT 0,
          compression_ratio REAL,
          
          -- Deferred Upload Support
          upload_scheduled_at INTEGER,
          upload_attempts INTEGER DEFAULT 0,
          max_upload_attempts INTEGER DEFAULT 5,
          next_upload_attempt INTEGER,
          upload_batch_id TEXT,
          
          -- Timestamps
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          synced_at INTEGER,
          
          -- Conflict Resolution Support
          local_version INTEGER DEFAULT 1,
          server_version INTEGER,
          conflict_data TEXT,
          needs_manual_resolution INTEGER DEFAULT 0,
          
          FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
        )
      ''');
      
      _logger.d('Enhanced tables created successfully');
      
    } catch (e) {
      _logger.e('Error creating enhanced tables', error: e);
      rethrow;
    }
  }
  
  /// Migrate existing data to new enhanced structure
  static Future<void> _migrateExistingData(Transaction txn) async {
    try {
      _logger.d('Migrating existing data to new structure');
      
      // Migrate guest_logs data
      await _migrateGuestLogsData(txn);
      
      // Migrate gate_check_records data
      await _migrateGateCheckRecordsData(txn);
      
      // Migrate gate_check_photos data
      await _migrateGateCheckPhotosData(txn);
      
      _logger.d('Data migration completed successfully');
      
    } catch (e) {
      _logger.e('Error migrating existing data', error: e);
      rethrow;
    }
  }
  
  /// Migrate guest logs with enhanced fields
  static Future<void> _migrateGuestLogsData(Transaction txn) async {
    try {
      // Check if backup table exists
      final backupTables = await txn.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='guest_logs_backup_v7'"
      );
      
      if (backupTables.isEmpty) {
        _logger.w('No guest_logs backup found, skipping migration');
        return;
      }
      
      // Get all records from backup
      final backupRecords = await txn.query('SELECT * FROM guest_logs_backup_v7');
      
      for (final record in backupRecords) {
        // Map old fields to new structure with enhancements
        final newRecord = <String, dynamic>{
          'guest_id': record['guest_id'] ?? _uuid.v4(),
          'driver_name': record['driver_name'] ?? record['guest_name'] ?? 'Unknown',
          'guest_purpose': record['guest_purpose'] ?? 'Business Visit',
          'vehicle_plate': record['vehicle_plate'],
          'destination': record['destination'],
          'username': record['username'],
          
          // Set default generation intent based on status
          'generation_intent': _deriveGenerationIntent(record['status']),
          'status': _normalizeGuestStatus(record['status']),
          
          'entry_time': record['entry_time'],
          'exit_time': record['exit_time'],
          'gate_position': record['gate_position'] ?? 'MAIN_GATE',
          'notes': record['notes'],
          'photo_path': record['photo_path'],
          'qr_code_data': record['qr_code_data'],
          
          'created_by': record['created_by'] ?? 'system',
          'device_id': record['device_id'],
          'device_name': record['device_name'],
          
          // Enhanced sync fields with defaults
          'sync_status': record['sync_status'] ?? 'PENDING',
          'sync_priority': 'HIGH',
          'sync_retry_count': record['sync_retry_count'] ?? 0,
          'sync_version': 1,
          
          // Timestamps
          'created_at': record['created_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'updated_at': record['updated_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'synced_at': record['synced_at'],
          
          // Conflict resolution defaults
          'local_version': 1,
          'needs_manual_resolution': 0,
        };
        
        await txn.insert('gate_guest_logs', newRecord);
      }
      
      _logger.d('Migrated ${backupRecords.length} guest log records');
      
    } catch (e) {
      _logger.e('Error migrating guest logs data', error: e);
      rethrow;
    }
  }
  
  /// Migrate gate check records with enhanced fields
  static Future<void> _migrateGateCheckRecordsData(Transaction txn) async {
    try {
      final backupTables = await txn.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gate_check_records_backup_v7'"
      );
      
      if (backupTables.isEmpty) {
        _logger.w('No gate_check_records backup found, skipping migration');
        return;
      }
      
      final backupRecords = await txn.query('SELECT * FROM gate_check_records_backup_v7');
      
      for (final record in backupRecords) {
        final newRecord = <String, dynamic>{
          'gate_check_id': record['gate_check_id'] ?? _uuid.v4(),
          'company_id': record['company_id'] ?? 'default_company',
          'pos_number': record['pos_number'] ?? '001',
          'vehicle_plate': record['vehicle_plate'] ?? 'UNKNOWN',
          'driver_name': record['driver_name'] ?? 'Unknown Driver',
          'vehicle_type': record['vehicle_type'] ?? 'TRUCK',
          'vehicle_characteristics': record['vehicle_characteristics'],
          'username': record['username'],
          
          'destination_location': record['destination_location'] ?? 'Estate',
          'load_type': record['load_type'] ?? 'TBS',
          'load_volume': record['load_volume'] ?? 0.0,
          'load_owner': record['load_owner'] ?? 'Company',
          'estimated_weight': record['estimated_weight'],
          'actual_weight': record['actual_weight'],
          'do_number': record['do_number'],
          
          'qr_code_data': record['qr_code_data'],
          'linked_guest_log_id': record['linked_guest_log_id'],
          
          'entry_time': record['entry_time'] ?? DateTime.now().millisecondsSinceEpoch,
          'exit_time': record['exit_time'],
          'status': _normalizeVehicleStatus(record['status']),
          'passed': record['passed'] ?? 0,
          
          'validation_notes': record['validation_notes'],
          'security_notes': record['security_notes'],
          'emergency_flag': record['emergency_flag'] ?? 0,
          
          'created_by': record['created_by'] ?? 'system',
          'device_id': record['device_id'],
          'device_name': record['device_name'],
          
          'gate_position': record['gate_position'] ?? 'MAIN_GATE',
          'weather_conditions': record['weather_conditions'],
          'latitude': record['latitude'],
          'longitude': record['longitude'],
          
          // Enhanced sync fields
          'sync_status': record['sync_status'] ?? 'PENDING',
          'sync_priority': 'HIGH',
          'sync_retry_count': record['sync_retry_count'] ?? 0,
          'sync_version': 1,
          
          'created_at': record['created_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'updated_at': record['updated_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'synced_at': record['synced_at'],
          
          'local_version': 1,
          'needs_manual_resolution': 0,
        };
        
        await txn.insert('gate_check_records', newRecord);
      }
      
      _logger.d('Migrated ${backupRecords.length} gate check records');
      
    } catch (e) {
      _logger.e('Error migrating gate check records', error: e);
      rethrow;
    }
  }
  
  /// Migrate gate check photos with enhanced fields
  static Future<void> _migrateGateCheckPhotosData(Transaction txn) async {
    try {
      final backupTables = await txn.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gate_check_photos_backup_v7'"
      );
      
      if (backupTables.isEmpty) {
        _logger.w('No gate_check_photos backup found, skipping migration');
        return;
      }
      
      final backupRecords = await txn.query('SELECT * FROM gate_check_photos_backup_v7');
      
      for (final record in backupRecords) {
        final newRecord = <String, dynamic>{
          'photo_id': record['photo_id'] ?? _uuid.v4(),
          'related_record_type': record['related_record_type'] ?? 'GATE_CHECK_RECORD',
          'related_record_id': record['related_record_id'] ?? 'unknown',
          
          'file_path': record['file_path'] ?? '',
          'file_name': record['file_name'] ?? 'unknown.jpg',
          'original_file_name': record['original_file_name'],
          'file_size': record['file_size'] ?? 0,
          'file_extension': record['file_extension'] ?? '.jpg',
          'mime_type': record['mime_type'] ?? 'image/jpeg',
          
          'photo_type': record['photo_type'] ?? 'VEHICLE',
          'photo_quality': record['photo_quality'] ?? 'MEDIUM',
          'compression_applied': record['compression_applied'] ?? 0,
          'original_file_size': record['original_file_size'],
          
          'latitude': record['latitude'],
          'longitude': record['longitude'],
          'taken_at': record['taken_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'camera_used': record['camera_used'],
          
          'metadata': record['metadata'],
          'description': record['description'],
          'tags': record['tags'] ?? '[]',
          
          'created_by': record['created_by'] ?? 'system',
          'device_id': record['device_id'],
          'device_model': record['device_model'],
          
          // Enhanced sync and upload management
          'sync_status': record['sync_status'] ?? 'PENDING',
          'sync_priority': 'MEDIUM',
          'upload_progress': record['upload_progress'] ?? 0.0,
          'upload_retry_count': record['upload_retry_count'] ?? 0,
          
          'local_path': record['local_path'] ?? record['file_path'],
          'cloud_path': record['cloud_path'],
          'thumbnail_path': record['thumbnail_path'],
          'is_compressed': record['is_compressed'] ?? 0,
          'compression_ratio': record['compression_ratio'],
          
          'upload_attempts': record['upload_attempts'] ?? 0,
          'max_upload_attempts': 5,
          'upload_batch_id': record['upload_batch_id'],
          
          'created_at': record['created_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'updated_at': record['updated_at'] ?? DateTime.now().millisecondsSinceEpoch,
          'synced_at': record['synced_at'],
          
          'local_version': 1,
          'needs_manual_resolution': 0,
        };
        
        await txn.insert('gate_check_photos', newRecord);
      }
      
      _logger.d('Migrated ${backupRecords.length} photo records');
      
    } catch (e) {
      _logger.e('Error migrating gate check photos', error: e);
      rethrow;
    }
  }
  
  /// Create performance-optimized indexes
  static Future<void> _createPerformanceIndexes(Transaction txn) async {
    try {
      _logger.d('Creating performance indexes');
      
      // Guest Logs Indexes
      final guestLogIndexes = [
        'CREATE INDEX idx_gate_guest_logs_guest_id ON gate_guest_logs (guest_id)',
        'CREATE INDEX idx_gate_guest_logs_status ON gate_guest_logs (status)',
        'CREATE INDEX idx_gate_guest_logs_generation_intent ON gate_guest_logs (generation_intent)',
        'CREATE INDEX idx_gate_guest_logs_sync_status ON gate_guest_logs (sync_status)',
        'CREATE INDEX idx_gate_guest_logs_sync_priority ON gate_guest_logs (sync_priority)',
        'CREATE INDEX idx_gate_guest_logs_sync_queue ON gate_guest_logs (sync_status, sync_priority, created_at)',
        'CREATE INDEX idx_gate_guest_logs_driver_name ON gate_guest_logs (driver_name)',
        'CREATE INDEX idx_gate_guest_logs_vehicle_plate ON gate_guest_logs (vehicle_plate)',
        'CREATE INDEX idx_gate_guest_logs_destination ON gate_guest_logs (destination)',
        'CREATE INDEX idx_gate_guest_logs_entry_time ON gate_guest_logs (entry_time)',
        'CREATE INDEX idx_gate_guest_logs_created_by ON gate_guest_logs (created_by)',
        'CREATE INDEX idx_gate_guest_logs_device_id ON gate_guest_logs (device_id)',
        'CREATE INDEX idx_gate_guest_logs_conflict_resolution ON gate_guest_logs (needs_manual_resolution, conflict_data)',
      ];
      
      // QR Tokens Indexes
      final qrTokenIndexes = [
        'CREATE INDEX idx_guest_qr_tokens_jti ON guest_qr_tokens (jti)',
        'CREATE INDEX idx_guest_qr_tokens_guest_log_id ON guest_qr_tokens (guest_log_id)',
        'CREATE INDEX idx_guest_qr_tokens_status ON guest_qr_tokens (status)',
        'CREATE INDEX idx_guest_qr_tokens_intent ON guest_qr_tokens (generation_intent, allowed_scan)',
        'CREATE INDEX idx_guest_qr_tokens_expires_at ON guest_qr_tokens (expires_at)',
        'CREATE INDEX idx_guest_qr_tokens_generated_device ON guest_qr_tokens (generated_device)',
        'CREATE INDEX idx_guest_qr_tokens_scanned_device ON guest_qr_tokens (scanned_device)',
        'CREATE INDEX idx_guest_qr_tokens_sync_status ON guest_qr_tokens (sync_status, sync_priority)',
        'CREATE INDEX idx_guest_qr_tokens_usage ON guest_qr_tokens (current_usage, max_usage, status)',
      ];
      
      // Gate Check Records Indexes
      final gateCheckIndexes = [
        'CREATE INDEX idx_gate_check_records_gate_check_id ON gate_check_records (gate_check_id)',
        'CREATE INDEX idx_gate_check_records_vehicle_plate ON gate_check_records (vehicle_plate)',
        'CREATE INDEX idx_gate_check_records_status ON gate_check_records (status)',
        'CREATE INDEX idx_gate_check_records_entry_time ON gate_check_records (entry_time)',
        'CREATE INDEX idx_gate_check_records_sync_status ON gate_check_records (sync_status)',
        'CREATE INDEX idx_gate_check_records_sync_queue ON gate_check_records (sync_status, sync_priority, created_at)',
        'CREATE INDEX idx_gate_check_records_created_by ON gate_check_records (created_by)',
        'CREATE INDEX idx_gate_check_records_device_id ON gate_check_records (device_id)',
        'CREATE INDEX idx_gate_check_records_emergency ON gate_check_records (emergency_flag)',
        'CREATE INDEX idx_gate_check_records_linked_guest ON gate_check_records (linked_guest_log_id)',
        'CREATE INDEX idx_gate_check_records_conflict_resolution ON gate_check_records (needs_manual_resolution, conflict_data)',
      ];
      
      // Photos Indexes
      final photoIndexes = [
        'CREATE INDEX idx_gate_check_photos_photo_id ON gate_check_photos (photo_id)',
        'CREATE INDEX idx_gate_check_photos_related_record ON gate_check_photos (related_record_type, related_record_id)',
        'CREATE INDEX idx_gate_check_photos_photo_type ON gate_check_photos (photo_type)',
        'CREATE INDEX idx_gate_check_photos_taken_at ON gate_check_photos (taken_at)',
        'CREATE INDEX idx_gate_check_photos_sync_status ON gate_check_photos (sync_status)',
        'CREATE INDEX idx_gate_check_photos_upload_queue ON gate_check_photos (sync_status, upload_progress, sync_priority)',
        'CREATE INDEX idx_gate_check_photos_created_by ON gate_check_photos (created_by)',
        'CREATE INDEX idx_gate_check_photos_device_id ON gate_check_photos (device_id)',
        'CREATE INDEX idx_gate_check_photos_upload_batch ON gate_check_photos (upload_batch_id)',
        'CREATE INDEX idx_gate_check_photos_upload_schedule ON gate_check_photos (upload_scheduled_at, upload_attempts)',
      ];
      
      // Execute all index creation commands
      final allIndexes = [
        ...guestLogIndexes,
        ...qrTokenIndexes,
        ...gateCheckIndexes,
        ...photoIndexes,
      ];
      
      for (final indexSql in allIndexes) {
        try {
          await txn.execute(indexSql);
        } catch (e) {
          _logger.w('Index creation failed (may already exist): $indexSql');
        }
      }
      
      _logger.d('Created ${allIndexes.length} performance indexes');
      
    } catch (e) {
      _logger.e('Error creating performance indexes', error: e);
      rethrow;
    }
  }
  
  /// Setup triggers and constraints for automatic updates
  static Future<void> _setupTriggersAndConstraints(Transaction txn) async {
    try {
      _logger.d('Setting up triggers and constraints');
      
      // Updated timestamp triggers
      await txn.execute('''
        CREATE TRIGGER gate_guest_logs_update_timestamp 
        AFTER UPDATE ON gate_guest_logs 
        BEGIN
          UPDATE gate_guest_logs SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
        END
      ''');
      
      await txn.execute('''
        CREATE TRIGGER gate_check_records_update_timestamp 
        AFTER UPDATE ON gate_check_records 
        BEGIN
          UPDATE gate_check_records SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
        END
      ''');
      
      await txn.execute('''
        CREATE TRIGGER gate_check_photos_update_timestamp 
        AFTER UPDATE ON gate_check_photos 
        BEGIN
          UPDATE gate_check_photos SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
        END
      ''');
      
      // Local version increment triggers
      await txn.execute('''
        CREATE TRIGGER gate_guest_logs_increment_version 
        AFTER UPDATE ON gate_guest_logs 
        WHEN OLD.local_version = NEW.local_version
        BEGIN
          UPDATE gate_guest_logs SET local_version = local_version + 1 WHERE id = NEW.id;
        END
      ''');
      
      await txn.execute('''
        CREATE TRIGGER gate_check_records_increment_version 
        AFTER UPDATE ON gate_check_records 
        WHEN OLD.local_version = NEW.local_version
        BEGIN
          UPDATE gate_check_records SET local_version = local_version + 1 WHERE id = NEW.id;
        END
      ''');
      
      // Sync status update triggers
      await txn.execute('''
        CREATE TRIGGER gate_guest_logs_mark_for_sync 
        AFTER UPDATE ON gate_guest_logs 
        WHEN NEW.sync_status = 'SYNCED' AND (OLD.driver_name != NEW.driver_name OR OLD.status != NEW.status OR OLD.notes != NEW.notes)
        BEGIN
          UPDATE gate_guest_logs SET sync_status = 'PENDING', sync_retry_count = 0 WHERE id = NEW.id;
        END
      ''');
      
      await txn.execute('''
        CREATE TRIGGER gate_check_records_mark_for_sync 
        AFTER UPDATE ON gate_check_records 
        WHEN NEW.sync_status = 'SYNCED' AND (OLD.status != NEW.status OR OLD.validation_notes != NEW.validation_notes OR OLD.exit_time != NEW.exit_time)
        BEGIN
          UPDATE gate_check_records SET sync_status = 'PENDING', sync_retry_count = 0 WHERE id = NEW.id;
        END
      ''');
      
      _logger.d('Setup triggers and constraints completed');
      
    } catch (e) {
      _logger.e('Error setting up triggers and constraints', error: e);
      rethrow;
    }
  }
  
  /// Verify migration integrity
  static Future<void> _verifyMigrationIntegrity(Transaction txn) async {
    try {
      _logger.d('Verifying migration integrity');
      
      // Count records in new tables
      final guestLogsCount = Sqflite.firstIntValue(
        await txn.rawQuery('SELECT COUNT(*) FROM guest_logs')
      ) ?? 0;
      
      final gateCheckRecordsCount = Sqflite.firstIntValue(
        await txn.rawQuery('SELECT COUNT(*) FROM gate_check_records')
      ) ?? 0;
      
      final photosCount = Sqflite.firstIntValue(
        await txn.rawQuery('SELECT COUNT(*) FROM gate_check_photos')
      ) ?? 0;
      
      _logger.i(
        'Migration verification: $guestLogsCount guest logs, '
        '$gateCheckRecordsCount gate check records, '
        '$photosCount photos migrated'
      );
      
      // Verify table structures
      final tableStructures = [
        'guest_logs',
        'guest_qr_tokens',
        'gate_check_records',
        'gate_check_photos',
      ];
      
      for (final tableName in tableStructures) {
        final tableInfo = await txn.rawQuery('PRAGMA table_info($tableName)');
        _logger.d('Table $tableName has ${tableInfo.length} columns');
      }
      
      // Verify indexes
      final indexes = await txn.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_guest%' OR name LIKE 'idx_gate%'"
      );
      _logger.d('Created ${indexes.length} indexes for gate check tables');
      
      _logger.d('Migration integrity verification completed successfully');
      
    } catch (e) {
      _logger.e('Error verifying migration integrity', error: e);
      rethrow;
    }
  }
  
  // ====================================================================
  // HELPER METHODS
  // ====================================================================
  
  /// Derive generation intent from existing status
  static String? _deriveGenerationIntent(dynamic status) {
    if (status == null) return null;
    
    switch (status.toString().toUpperCase()) {
      case 'REGISTERED_FOR_ENTRY':
        return 'ENTRY';
      case 'REGISTERED_FOR_EXIT':
        return 'EXIT';
      case 'INSIDE':
        return 'EXIT'; // If inside, next intent would be EXIT
      case 'EXITED':
        return 'ENTRY'; // If exited, next intent would be ENTRY
      default:
        return 'ENTRY'; // Default to ENTRY
    }
  }
  
  /// Normalize guest status to ensure compatibility
  static String _normalizeGuestStatus(dynamic status) {
    if (status == null) return 'INSIDE';
    
    final validStatuses = [
      'REGISTERED_FOR_ENTRY',
      'INSIDE', 
      'REGISTERED_FOR_EXIT',
      'EXITED',
      'CANCELLED'
    ];
    
    final statusStr = status.toString().toUpperCase();
    return validStatuses.contains(statusStr) ? statusStr : 'INSIDE';
  }
  
  /// Normalize vehicle status to ensure compatibility
  static String _normalizeVehicleStatus(dynamic status) {
    if (status == null) return 'ENTERING';
    
    final validStatuses = [
      'ENTERING',
      'INSIDE',
      'EXITING', 
      'EXITED',
      'CANCELLED',
      'ERROR'
    ];
    
    final statusStr = status.toString().toUpperCase();
    return validStatuses.contains(statusStr) ? statusStr : 'ENTERING';
  }
}