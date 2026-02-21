import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';

/// Database Tables Service for Agrinova Mobile App
///
/// Handles all table creation and schema management for the SQLite database.
/// This includes authentication, master data, user assignments, harvest,
/// gate check, sync, and system tables.
class DatabaseTablesService {
  final Logger _logger = Logger();

  // Create all enhanced tables
  Future<void> createEnhancedTables(Database db, int version) async {
    _logger.i('Creating enhanced database tables version: $version');

    await db.transaction((txn) async {
      // Execute the complete schema from the SQL file
      await createAuthenticationTables(txn);
      await createMasterDataTables(txn);
      await createUserAssignmentTables(txn);
      await createHarvestTables(txn);
      await createGateCheckTables(txn);
      await createSyncTables(txn);
      await createSystemTables(txn);
      await createIndexes(txn);
      await createViews(txn);
    });

    _logger.i('Enhanced database tables created successfully');
  }

  // Authentication & Security Tables
  Future<void> createAuthenticationTables(Transaction txn) async {
    // Users table with enhanced security features
    await txn.execute('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        phone TEXT,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('mandor', 'asisten', 'satpam', 'manager', 'area_manager', 'company_admin', 'super_admin')),
        company_id TEXT NOT NULL,
        employee_id TEXT,
        is_active INTEGER DEFAULT 1,
        password_hash TEXT,
        last_login_at INTEGER,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until INTEGER,
        two_factor_enabled INTEGER DEFAULT 0,
        email_verified INTEGER DEFAULT 0,
        must_change_password INTEGER DEFAULT 0,
        reporting_to_area_manager_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        conflict_data TEXT
      )
    ''');

    // JWT Tokens table
    await txn.execute('''
      CREATE TABLE jwt_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token_type TEXT NOT NULL CHECK (token_type IN ('ACCESS', 'REFRESH', 'OFFLINE')),
        token_hash TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_fingerprint TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_revoked INTEGER DEFAULT 0,
        revoked_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER,
        platform TEXT DEFAULT 'FLUTTER' CHECK (platform IN ('FLUTTER', 'ANDROID', 'IOS')),
        app_version TEXT,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // User Devices table
    await txn.execute('''
      CREATE TABLE user_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        device_id TEXT UNIQUE NOT NULL,
        device_name TEXT NOT NULL,
        device_model TEXT,
        platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
        os_version TEXT,
        app_version TEXT,
        device_fingerprint TEXT NOT NULL,
        is_authorized INTEGER DEFAULT 0,
        is_trusted INTEGER DEFAULT 0,
        is_primary INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        fcm_token TEXT,
        push_notifications_enabled INTEGER DEFAULT 1,
        last_seen_at INTEGER NOT NULL,
        registered_at INTEGER NOT NULL,
        authorized_at INTEGER,
        revoked_at INTEGER,
        revoked_reason TEXT,
        biometric_enabled INTEGER DEFAULT 0,
        pin_enabled INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // Biometric Authentication
    await txn.execute('''
      CREATE TABLE biometric_auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        fingerprint_enabled INTEGER DEFAULT 0,
        face_id_enabled INTEGER DEFAULT 0,
        voice_enabled INTEGER DEFAULT 0,
        fingerprint_hash TEXT,
        face_template_hash TEXT,
        voice_template_hash TEXT,
        is_active INTEGER DEFAULT 0,
        enabled_at INTEGER,
        last_used_at INTEGER,
        failed_attempts INTEGER DEFAULT 0,
        max_failed_attempts INTEGER DEFAULT 5,
        locked_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES user_devices (device_id) ON DELETE CASCADE,
        UNIQUE (user_id, device_id)
      )
    ''');

    // Offline Authentication
    await txn.execute('''
      CREATE TABLE offline_auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        offline_token_hash TEXT,
        offline_pin_hash TEXT,
        offline_enabled INTEGER DEFAULT 0,
        offline_duration_days INTEGER DEFAULT 30,
        last_sync_at INTEGER,
        offline_expires_at INTEGER,
        max_offline_attempts INTEGER DEFAULT 5,
        current_offline_attempts INTEGER DEFAULT 0,
        offline_locked_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // Security Events
    await txn.execute('''
      CREATE TABLE security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        device_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        description TEXT NOT NULL,
        metadata TEXT,
        ip_address TEXT,
        platform TEXT,
        is_resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        occurred_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Used Tokens (JWT Token Management)
    await txn.execute('''
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
        usage_metadata TEXT, -- JSON metadata for phase tracking and additional context
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Guest Tokens (JWT QR Code Metadata)
    await txn.execute('''
      CREATE TABLE guest_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti TEXT UNIQUE NOT NULL,
        guest_id TEXT NOT NULL,
        name TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        payload TEXT NOT NULL,
        issued_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        is_used INTEGER DEFAULT 0,
        used_at INTEGER,
        created_by TEXT,
        token_version INTEGER DEFAULT 1,
        device_bound TEXT,
        cargo_type TEXT,
        estimated_weight REAL,
        do_number TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Blacklisted Tokens (Revoked Token Management)
    await txn.execute('''
      CREATE TABLE blacklisted_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti TEXT UNIQUE NOT NULL,
        token_type TEXT DEFAULT 'GUEST_ACCESS' CHECK (token_type IN ('GUEST_ACCESS', 'ACCESS', 'REFRESH', 'OFFLINE')),
        revoked_at INTEGER NOT NULL,
        reason TEXT NOT NULL,
        revoked_by TEXT,
        original_expires_at INTEGER,
        guest_id TEXT,
        vehicle_plate TEXT,
        security_incident INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        FOREIGN KEY (revoked_by) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Gate Employee Logs (Renamed from employee_logs)
    await txn.execute('''
      CREATE TABLE gate_employee_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id TEXT UNIQUE NOT NULL,
        employee_id TEXT NOT NULL,
        iddata TEXT, -- Added for HRIS ID (company_nik)
        company_id TEXT, -- Added for multi-tenancy
        employee_name TEXT NOT NULL,
        employee_role TEXT,
        department TEXT,
        vehicle_plate TEXT,
        gate_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('ENTRY', 'EXIT')),
        status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
        entry_time INTEGER,
        exit_time INTEGER,
        photo_path TEXT,
        notes TEXT,
        validation_method TEXT DEFAULT 'QR_CODE' CHECK (validation_method IN ('MANUAL', 'QR_CODE', 'RFID', 'BIOMETRIC')),
        created_by TEXT NOT NULL,
        device_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        server_record_id TEXT,
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
      )
    ''');

    // Registered Users (Gate Check Pre-approved Users)
    await txn.execute('''
      CREATE TABLE registered_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        position TEXT,
        email TEXT,
        phone TEXT,
        vehicle_plate TEXT,
        rfid_card_id TEXT,
        biometric_template TEXT,
        access_level INTEGER DEFAULT 1 CHECK (access_level IN (1, 2, 3, 4, 5)),
        access_hours TEXT DEFAULT '24/7',
        valid_from INTEGER,
        valid_until INTEGER,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
        photo_path TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        company_name TEXT,
        visitor_type TEXT CHECK (visitor_type IN ('EMPLOYEE', 'CONTRACTOR', 'VISITOR', 'VENDOR', 'GUEST')),
        special_permissions TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        approved_by TEXT,
        approval_timestamp INTEGER,
        last_access_at INTEGER,
        access_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
        FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');
  }

  // Master Data Tables
  Future<void> createMasterDataTables(Transaction txn) async {
    // Companies
    await txn.execute('''
      CREATE TABLE companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT UNIQUE NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1
      )
    ''');

    // Estates
    await txn.execute('''
      CREATE TABLE estates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estate_id TEXT UNIQUE NOT NULL,
        company_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        area_hectares REAL,
        latitude REAL,
        longitude REAL,
        elevation REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
      )
    ''');

    // Divisions
    await txn.execute('''
      CREATE TABLE divisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        division_id TEXT UNIQUE NOT NULL,
        estate_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        area_hectares REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        FOREIGN KEY (estate_id) REFERENCES estates (estate_id) ON DELETE CASCADE
      )
    ''');

    // Blocks
    await txn.execute('''
      CREATE TABLE blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id BLOB UNIQUE NOT NULL,
        division_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        area REAL,
        area_hectares REAL,
        planting_year INTEGER,
        palm_count INTEGER,
        variety_type TEXT,
        latitude REAL,
        longitude REAL,
        elevation REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        FOREIGN KEY (division_id) REFERENCES divisions (division_id) ON DELETE CASCADE
      )
    ''');

    // Employees
    await txn.execute('''
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id BLOB UNIQUE NOT NULL,
        company_id TEXT NOT NULL,
        division_id TEXT,
        employee_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        phone TEXT,
        address TEXT,
        birth_date INTEGER,
        hire_date INTEGER,
        employee_type TEXT DEFAULT 'BULANAN' CHECK (employee_type IN ('BULANAN', 'KHT', 'BORONGAN', 'KHL')),
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
      )
    ''');
  }

  // User Assignment Tables
  Future<void> createUserAssignmentTables(Transaction txn) async {
    // User Estates
    await txn.execute('''
      CREATE TABLE user_estates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        estate_id TEXT NOT NULL,
        assigned_at INTEGER NOT NULL,
        assigned_by TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (estate_id) REFERENCES estates (estate_id) ON DELETE CASCADE,
        UNIQUE (user_id, estate_id)
      )
    ''');

    // User Divisions
    await txn.execute('''
      CREATE TABLE user_divisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        assigned_at INTEGER NOT NULL,
        assigned_by TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (division_id) REFERENCES divisions (division_id) ON DELETE CASCADE,
        UNIQUE (user_id, division_id)
      )
    ''');

    // Area Manager Companies
    await txn.execute('''
      CREATE TABLE area_manager_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        can_view_reports INTEGER DEFAULT 1,
        can_manage_users INTEGER DEFAULT 1,
        can_access_system_logs INTEGER DEFAULT 0,
        can_export_data INTEGER DEFAULT 1,
        assigned_at INTEGER NOT NULL,
        assigned_by TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
        UNIQUE (user_id, company_id)
      )
    ''');
  }

  // Harvest/Panen Tables (Mandor Role)
  Future<void> createHarvestTables(Transaction txn) async {
    // Harvest Records
    await txn.execute('''
      CREATE TABLE harvest_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        harvest_id TEXT UNIQUE NOT NULL,
        server_id TEXT,
        panen_number TEXT,
        block_id BLOB NOT NULL,
        company_id TEXT,
        estate_id TEXT,
        division_id TEXT,
        division_code TEXT,
        mandor_scope TEXT,
        karyawan_id BLOB NOT NULL,
        karyawan_nik TEXT NOT NULL,
        employee_division_id TEXT,
        employee_division_name TEXT,
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
        sync_status TEXT DEFAULT 'PENDING',
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

    // Harvest Employees
    await txn.execute('''
      CREATE TABLE harvest_employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        harvest_id TEXT NOT NULL,
        employee_id BLOB NOT NULL,
        role TEXT,
        tbs_count INTEGER DEFAULT 0,
        weight REAL DEFAULT 0,
        brondolan REAL DEFAULT 0,
        work_hours REAL,
        overtime_hours REAL,
        check_in_time INTEGER,
        check_out_time INTEGER,
        productivity_rate REAL,
        quality_score REAL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        FOREIGN KEY (harvest_id) REFERENCES harvest_records (harvest_id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE RESTRICT,
        UNIQUE (harvest_id, employee_id)
      )
    ''');
  }

  // Gate Check Tables (Satpam Role)
  Future<void> createGateCheckTables(Transaction txn) async {
    // Gate Check Records
    await txn.execute('''
      CREATE TABLE gate_check_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gate_check_id TEXT UNIQUE NOT NULL,
        pos_number TEXT NOT NULL,
        company_id TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        vehicle_characteristics TEXT,
        destination_location TEXT NOT NULL,
        load_type TEXT NOT NULL,
        load_volume REAL NOT NULL,
        load_owner TEXT NOT NULL,
        estimated_weight REAL,
        actual_weight REAL,
        do_number TEXT,
        qr_code_data TEXT,
        entry_time INTEGER NOT NULL,
        exit_time INTEGER,
        status TEXT DEFAULT 'ENTERING' CHECK (status IN ('ENTERING', 'INSIDE', 'EXITING', 'EXITED', 'CANCELLED', 'ERROR')),
        passed INTEGER DEFAULT 0,
        validation_notes TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        photos TEXT,
        coordinates TEXT,
        client_timestamp INTEGER,
        device_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        needs_sync INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        local_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,
        conflict_data TEXT,
        harvest_match_status TEXT,
        harvest_reference_id TEXT,
        validation_errors TEXT,
        compliance_score REAL,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
        FOREIGN KEY (harvest_reference_id) REFERENCES harvest_records (harvest_id) ON DELETE SET NULL
      )
    ''');

    // Gate Check Stats
    await txn.execute('''
      CREATE TABLE gate_check_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        vehicles_inside INTEGER DEFAULT 0,
        today_entries INTEGER DEFAULT 0,
        today_exits INTEGER DEFAULT 0,
        pending_exit INTEGER DEFAULT 0,
        average_load_time REAL DEFAULT 0,
        compliance_rate REAL DEFAULT 0,
        total_weight_in REAL DEFAULT 0,
        total_weight_out REAL DEFAULT 0,
        violation_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        version INTEGER DEFAULT 1,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
        UNIQUE (company_id, date)
      )
    ''');

    // Gate QR Scan History (Renamed from qr_scan_history)
    await txn.execute('''
      CREATE TABLE gate_qr_scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        qr_data TEXT NOT NULL,
        scan_type TEXT NOT NULL CHECK (scan_type IN ('VEHICLE', 'DO', 'TBS', 'EMPLOYEE', 'UNKNOWN')),
        parsed_data TEXT,
        related_record_type TEXT,
        related_record_id TEXT,
        scan_result TEXT NOT NULL CHECK (scan_result IN ('SUCCESS', 'INVALID', 'DUPLICATE', 'ERROR')),
        error_message TEXT,
        location_coordinates TEXT,
        photo_path TEXT,
        scanned_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // Gate Guest Logs (Renamed from guest_logs)
    await txn.execute('''
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
        company_id TEXT, -- Added for multi-tenancy
        status TEXT DEFAULT 'ENTRY' CHECK (status IN ('ENTRY', 'EXIT', 'REGISTERED_FOR_ENTRY', 'EXITED', 'INSIDE', 'CANCELLED')),
        generation_intent TEXT CHECK (generation_intent IN ('ENTRY', 'EXIT')),
        notes TEXT,
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
        entry_pos TEXT,
        exit_pos TEXT,
        checkpoints TEXT, -- JSON
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

    // Gate Check Photos (for Photo Documentation)
    await txn.execute('''
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
        sync_error TEXT,
        is_uploaded INTEGER DEFAULT 0,
        upload_url TEXT,
        server_photo_id TEXT
      )
    ''');

    // Gate QR Tokens table for Intent-Based QR System (Renamed from qr_tokens)
    await txn.execute('''
      CREATE TABLE gate_qr_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT UNIQUE NOT NULL,
        generation_intent TEXT NOT NULL CHECK (generation_intent IN ('ENTRY', 'EXIT')),
        allowed_scan TEXT NOT NULL CHECK (allowed_scan IN ('ENTRY', 'EXIT')),
        driver_name TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        vehicle_type TEXT,
        notes TEXT,
        generated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        generated_by TEXT,
        device_id TEXT NOT NULL,
        device_fingerprint TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
        cross_device_enabled INTEGER DEFAULT 1,
        single_use INTEGER DEFAULT 1,
        used_at INTEGER,
        used_by TEXT,
        scanner_device_id TEXT,
        validation_status TEXT,
        token_data TEXT,
        scan_intent TEXT,
        scanner_location TEXT,
        server_validation_id TEXT,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        sync_error TEXT,
        synced_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        FOREIGN KEY (generated_by) REFERENCES users (user_id) ON DELETE RESTRICT,
        FOREIGN KEY (used_by) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Gate QR Validations table for tracking token validations (Renamed from qr_validations)
    await txn.execute('''
      CREATE TABLE gate_qr_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT NOT NULL,
        scan_intent TEXT NOT NULL CHECK (scan_intent IN ('ENTRY', 'EXIT')),
        generation_intent TEXT NOT NULL CHECK (generation_intent IN ('ENTRY', 'EXIT')),
        driver_name TEXT,
        vehicle_plate TEXT,
        vehicle_type TEXT,
        scanner_device_id TEXT NOT NULL,
        generator_device_id TEXT,
        is_cross_device INTEGER DEFAULT 0,
        scanner_location TEXT,
        validated_at INTEGER NOT NULL,
        validated_by TEXT NOT NULL,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        synced_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (validated_by) REFERENCES users (user_id) ON DELETE RESTRICT
      )
    ''');

    // QR Validation Failures for audit trail
    await txn.execute('''
      CREATE TABLE qr_validation_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_data_hash TEXT NOT NULL,
        scan_intent TEXT,
        error_message TEXT NOT NULL,
        scanner_device_id TEXT NOT NULL,
        attempted_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    ''');

    // QR Tokens Cache for server-pulled tokens
    await txn.execute('''
      CREATE TABLE qr_tokens_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT UNIQUE NOT NULL,
        generation_intent TEXT,
        allowed_scan TEXT,
        driver_name TEXT,
        vehicle_plate TEXT,
        status TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');

    // Sync Transactions Cache for server-pulled sync transactions
    await txn.execute('''
      CREATE TABLE sync_transactions_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        operation TEXT,
        status TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        updated_at INTEGER NOT NULL
      )
    ''');
  }

  // Sync & Conflict Resolution Tables
  Future<void> createSyncTables(Transaction txn) async {
    // Sync Queue
    await txn.execute('''
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
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Sync Conflicts
    await txn.execute('''
      CREATE TABLE sync_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conflict_id TEXT UNIQUE NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        conflict_type TEXT NOT NULL CHECK (conflict_type IN ('UPDATE_CONFLICT', 'DELETE_CONFLICT', 'INSERT_CONFLICT')),
        resolution_strategy TEXT CHECK (resolution_strategy IN ('SERVER_WINS', 'CLIENT_WINS', 'MERGE', 'MANUAL')),
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        resolved_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        user_id TEXT,
        device_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Sync Log (Session-based sync tracking)
    await txn.execute('''
      CREATE TABLE sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_session_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        records_processed INTEGER DEFAULT 0,
        records_succeeded INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        duration_ms INTEGER,
        error_details TEXT,
        user_id TEXT,
        device_id TEXT,
        status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');

    // Sync Logs (Role-based Individual operation audit trail)
    await txn.execute('''
      CREATE TABLE sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id TEXT UNIQUE NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_role TEXT NOT NULL CHECK (user_role IN ('MANDOR', 'ASISTEN', 'SATPAM', 'MANAGER', 'AREA_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'TIMBANGAN', 'GRADING')),
        company_id TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('FULL_SYNC', 'INCREMENTAL_SYNC', 'PUSH_SYNC', 'PULL_SYNC', 'ROLE_SPECIFIC_SYNC', 'GRAPHQL_FULL_SYNC')),
        sync_context TEXT CHECK (sync_context IN ('HARVEST_DATA', 'GATE_CHECK_DATA', 'APPROVAL_DATA', 'MASTER_DATA', 'USER_DATA', 'MIXED')),
        table_name TEXT,
        record_count INTEGER DEFAULT 0,
        records_processed INTEGER DEFAULT 0,
        records_successful INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        conflicts_detected INTEGER DEFAULT 0,
        conflicts_resolved INTEGER DEFAULT 0,
        sync_priority INTEGER DEFAULT 1 CHECK (sync_priority IN (1, 2, 3, 4, 5)),
        sync_started_at INTEGER NOT NULL,
        sync_completed_at INTEGER,
        duration_ms INTEGER,
        status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'CANCELLED')),
        error_message TEXT,
        error_details TEXT,
        network_type TEXT,
        battery_level INTEGER,
        data_usage_kb INTEGER,
        role_specific_metrics TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
      )
    ''');

    // Sync Metadata (Key-value store for sync timestamps)
    await txn.execute('''
      CREATE TABLE sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    ''');

    // Triggers for automatic timestamp updates
    await txn.execute('''
      CREATE TRIGGER sync_queue_update_timestamp 
      AFTER UPDATE ON sync_queue 
      BEGIN
        UPDATE sync_queue SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
      END;
    ''');

    await txn.execute('''
      CREATE TRIGGER sync_conflicts_update_timestamp 
      AFTER UPDATE ON sync_conflicts 
      BEGIN
        UPDATE sync_conflicts SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
      END;
    ''');

    // =========================================================================
    // ENHANCED SYNC TABLES (for EnhancedConflictResolutionService)
    // =========================================================================

    // Enhanced Sync Transactions (replaces and extends sync_queue)
    await txn.execute('''
      CREATE TABLE sync_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        operation_id TEXT UNIQUE NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN (
          'SINGLE_RECORD', 'BATCH_OPERATION', 'BULK_SYNC', 
          'CROSS_DEVICE_OPERATION', 'PARTIAL_UPDATE'
        )),
        operation_type TEXT NOT NULL CHECK (operation_type IN (
          'CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE'
        )),
        priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        server_record_id TEXT,
        record_ids TEXT,
        data TEXT NOT NULL,
        original_data TEXT,
        merged_data TEXT,
        dependencies TEXT,
        parent_transaction_id TEXT,
        child_transaction_ids TEXT,
        status TEXT DEFAULT 'PENDING' CHECK (status IN (
          'PENDING', 'PROCESSING', 'PARTIAL_SUCCESS', 'COMPLETED', 
          'FAILED', 'CANCELLED', 'CONFLICT', 'RETRY_SCHEDULED', 'EXPIRED'
        )),
        sync_attempt INTEGER DEFAULT 0,
        max_retry_count INTEGER DEFAULT 5,
        retry_backoff_ms INTEGER DEFAULT 1000,
        origin_device_id TEXT,
        target_device_id TEXT,
        cross_device_operation INTEGER DEFAULT 0,
        device_context TEXT,
        qr_intent_type TEXT CHECK (qr_intent_type IN ('ENTRY', 'EXIT', NULL)),
        qr_token_data TEXT,
        conflict_resolution_strategy TEXT CHECK (conflict_resolution_strategy IN (
          'CLIENT_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL', 'AUTO_RESOLVE'
        )),
        conflict_data TEXT,
        auto_resolve_attempted INTEGER DEFAULT 0,
        manual_resolution_required INTEGER DEFAULT 0,
        estimated_processing_time INTEGER,
        actual_processing_time INTEGER,
        data_size_bytes INTEGER,
        compression_ratio REAL,
        network_quality TEXT CHECK (network_quality IN ('EXCELLENT', 'GOOD', 'POOR', 'OFFLINE')),
        last_error TEXT,
        error_details TEXT,
        error_count INTEGER DEFAULT 0,
        critical_error INTEGER DEFAULT 0,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        company_id TEXT,
        session_id TEXT,
        client_timestamp INTEGER NOT NULL,
        scheduled_at INTEGER,
        processing_started_at INTEGER,
        processing_completed_at INTEGER,
        last_sync_attempt_at INTEGER,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
          'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'
        )),
        version INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // Enhanced Sync Conflicts with Field-Level Resolution
    await txn.execute('''
      CREATE TABLE sync_conflicts_enhanced (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conflict_id TEXT UNIQUE NOT NULL,
        transaction_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL CHECK (conflict_type IN (
          'VERSION_MISMATCH', 'DATA_CONFLICT', 'DELETE_CONFLICT',
          'CONSTRAINT_VIOLATION', 'CROSS_DEVICE_CONFLICT', 'SCHEMA_MISMATCH',
          'QR_TOKEN_CONFLICT', 'INTENT_MISMATCH'
        )),
        severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        server_record_id TEXT,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        base_data TEXT,
        conflicting_fields TEXT,
        field_resolutions TEXT,
        auto_resolvable INTEGER DEFAULT 0,
        resolution_confidence REAL DEFAULT 0.0,
        resolution_strategy TEXT CHECK (resolution_strategy IN (
          'CLIENT_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL', 'FIELD_LEVEL_MERGE'
        )),
        resolution_data TEXT,
        resolution_applied INTEGER DEFAULT 0,
        resolution_notes TEXT,
        origin_device_id TEXT,
        conflict_device_id TEXT,
        cross_device_context TEXT,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        resolved_by TEXT,
        resolution_source TEXT CHECK (resolution_source IN ('AUTO', 'MANUAL', 'SYSTEM')),
        detected_at INTEGER NOT NULL,
        resolved_at INTEGER,
        client_timestamp INTEGER,
        server_timestamp INTEGER,
        status TEXT DEFAULT 'PENDING' CHECK (status IN (
          'PENDING', 'AUTO_RESOLVED', 'MANUALLY_RESOLVED', 'ESCALATED', 'IGNORED', 'EXPIRED'
        )),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
          'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
        )),
        version INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // Sync Sessions
    await txn.execute('''
      CREATE TABLE sync_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id TEXT,
        session_type TEXT NOT NULL CHECK (session_type IN (
          'FULL_SYNC', 'INCREMENTAL_SYNC', 'PUSH_ONLY', 'PULL_ONLY', 
          'SELECTIVE_SYNC', 'CROSS_DEVICE_SYNC'
        )),
        tables_to_sync TEXT,
        sync_direction TEXT DEFAULT 'BIDIRECTIONAL' CHECK (sync_direction IN (
          'PUSH', 'PULL', 'BIDIRECTIONAL'
        )),
        batch_size INTEGER DEFAULT 100,
        max_concurrent_operations INTEGER DEFAULT 5,
        conflict_resolution_mode TEXT DEFAULT 'AUTO' CHECK (conflict_resolution_mode IN (
          'AUTO', 'MANUAL', 'CLIENT_WINS', 'SERVER_WINS'
        )),
        multi_device_session INTEGER DEFAULT 0,
        participating_devices TEXT,
        session_coordinator_device TEXT,
        status TEXT DEFAULT 'INITIATED' CHECK (status IN (
          'INITIATED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 
          'FAILED', 'CANCELLED', 'PARTIAL_SUCCESS'
        )),
        progress_percentage REAL DEFAULT 0.0,
        current_table TEXT,
        current_operation TEXT,
        total_transactions INTEGER DEFAULT 0,
        successful_transactions INTEGER DEFAULT 0,
        failed_transactions INTEGER DEFAULT 0,
        conflicts_detected INTEGER DEFAULT 0,
        conflicts_resolved INTEGER DEFAULT 0,
        auto_resolved_conflicts INTEGER DEFAULT 0,
        manual_resolution_required INTEGER DEFAULT 0,
        data_uploaded_bytes INTEGER DEFAULT 0,
        data_downloaded_bytes INTEGER DEFAULT 0,
        compression_savings_bytes INTEGER DEFAULT 0,
        network_type TEXT,
        average_response_time INTEGER,
        peak_memory_usage INTEGER,
        battery_usage_percentage REAL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        last_activity_at INTEGER NOT NULL,
        next_sync_scheduled_at INTEGER,
        error_message TEXT,
        error_details TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        version INTEGER DEFAULT 1
      )
    ''');

    // Sync Dependencies
    await txn.execute('''
      CREATE TABLE sync_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dependency_id TEXT UNIQUE NOT NULL,
        parent_transaction_id TEXT NOT NULL,
        dependent_transaction_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL CHECK (dependency_type IN (
          'HARD_DEPENDENCY', 'SOFT_DEPENDENCY', 'ORDERING_DEPENDENCY', 
          'REFERENTIAL_INTEGRITY', 'CROSS_DEVICE_DEPENDENCY'
        )),
        dependency_reason TEXT,
        is_blocking INTEGER DEFAULT 1,
        dependency_weight INTEGER DEFAULT 1,
        cross_device_dependency INTEGER DEFAULT 0,
        origin_device_context TEXT,
        status TEXT DEFAULT 'PENDING' CHECK (status IN (
          'PENDING', 'SATISFIED', 'FAILED', 'TIMEOUT', 'IGNORED'
        )),
        resolution_attempts INTEGER DEFAULT 0,
        max_resolution_attempts INTEGER DEFAULT 5,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER,
        timeout_at INTEGER,
        CHECK (parent_transaction_id != dependent_transaction_id)
      )
    ''');

    // Sync Performance Metrics
    await txn.execute('''
      CREATE TABLE sync_performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_id TEXT UNIQUE NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id TEXT,
        session_id TEXT,
        transaction_id TEXT,
        metric_type TEXT NOT NULL CHECK (metric_type IN (
          'SYNC_DURATION', 'CONFLICT_RESOLUTION_TIME', 'NETWORK_LATENCY',
          'BATCH_PROCESSING_TIME', 'QUEUE_PROCESSING_TIME', 'DATABASE_OPERATION_TIME',
          'COMPRESSION_RATIO', 'ERROR_RATE', 'SUCCESS_RATE', 'RETRY_COUNT'
        )),
        metric_category TEXT CHECK (metric_category IN (
          'PERFORMANCE', 'RELIABILITY', 'EFFICIENCY', 'ERROR_TRACKING'
        )),
        metric_value REAL NOT NULL,
        metric_unit TEXT DEFAULT 'ms',
        baseline_value REAL,
        threshold_warning REAL,
        threshold_critical REAL,
        table_name TEXT,
        operation_type TEXT,
        record_count INTEGER,
        data_size_bytes INTEGER,
        network_type TEXT,
        connection_quality TEXT,
        device_performance_class TEXT,
        battery_level INTEGER,
        available_memory_mb INTEGER,
        storage_available_mb INTEGER,
        measured_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
          'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
        )),
        version INTEGER DEFAULT 1
      )
    ''');

    // Sync Event Log
    await txn.execute('''
      CREATE TABLE sync_event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN (
          'SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'CONFLICT_DETECTED',
          'CONFLICT_RESOLVED', 'TRANSACTION_CREATED', 'TRANSACTION_COMPLETED',
          'CROSS_DEVICE_OPERATION', 'QR_OPERATION', 'BATCH_OPERATION',
          'ERROR_OCCURRED', 'RETRY_ATTEMPTED', 'DEPENDENCY_RESOLVED'
        )),
        event_category TEXT CHECK (event_category IN (
          'SYNC', 'CONFLICT', 'TRANSACTION', 'ERROR', 'CROSS_DEVICE', 'PERFORMANCE'
        )),
        severity TEXT DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
        message TEXT NOT NULL,
        description TEXT,
        event_data TEXT,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id TEXT,
        session_id TEXT,
        transaction_id TEXT,
        conflict_id TEXT,
        table_name TEXT,
        record_id TEXT,
        operation_type TEXT,
        duration_ms INTEGER,
        memory_usage_bytes INTEGER,
        network_bytes INTEGER,
        event_timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
          'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
        )),
        version INTEGER DEFAULT 1
      )
    ''');

    // Photo Sync Queue (for background photo upload)
    await txn.execute('''
      CREATE TABLE photo_sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT UNIQUE NOT NULL,
        token_id TEXT NOT NULL,
        photo_type TEXT,
        original_file_path TEXT,
        original_size INTEGER,
        compressed_data TEXT,
        compressed_size INTEGER,
        compression_ratio REAL,
        photo_format TEXT,
        checksum TEXT,
        thumbnail_data TEXT,
        compression_metadata TEXT,
        sync_priority TEXT,
        sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        synced_at INTEGER,
        created_at INTEGER NOT NULL,
        metadata TEXT
      )
    ''');
  }

  // System Tables
  Future<void> createSystemTables(Transaction txn) async {
    // App Settings (for storing sync timestamps and other app-level settings)
    await txn.execute('''
      CREATE TABLE app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'STRING' CHECK (type IN ('STRING', 'INTEGER', 'REAL', 'BOOLEAN', 'JSON')),
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    ''');

    // Notifications
    await txn.execute('''
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'APPROVAL', 'SYNC')),
        category TEXT DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'HARVEST', 'GATE_CHECK', 'SYNC', 'SECURITY', 'SYSTEM')),
        priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3, 4, 5)),
        is_read INTEGER DEFAULT 0,
        is_persistent INTEGER DEFAULT 0,
        action_required INTEGER DEFAULT 0,
        action_type TEXT,
        action_data TEXT,
        scheduled_at INTEGER,
        delivered_at INTEGER,
        read_at INTEGER,
        expires_at INTEGER,
        related_record_type TEXT,
        related_record_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    ''');

    // System Settings
    await txn.execute('''
      CREATE TABLE system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'INTEGER', 'BOOLEAN', 'JSON')),
        description TEXT,
        is_user_configurable INTEGER DEFAULT 0,
        requires_restart INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');

    // Audit Trail
    await txn.execute('''
      CREATE TABLE audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'SELECT')),
        old_values TEXT,
        new_values TEXT,
        changed_fields TEXT,
        ip_address TEXT,
        user_agent TEXT,
        platform TEXT,
        device_id TEXT,
        occurred_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_status TEXT DEFAULT 'PENDING',
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
      )
    ''');
  }

  // Create performance indexes
  Future<void> createIndexes(Transaction txn) async {
    // User indexes
    await txn.execute('CREATE INDEX idx_users_user_id ON users (user_id)');
    await txn.execute('CREATE INDEX idx_users_username ON users (username)');
    await txn
        .execute('CREATE INDEX idx_users_company_id ON users (company_id)');
    await txn.execute('CREATE INDEX idx_users_role ON users (role)');
    await txn
        .execute('CREATE INDEX idx_users_sync_status ON users (sync_status)');

    // JWT Token indexes
    await txn
        .execute('CREATE INDEX idx_jwt_tokens_user_id ON jwt_tokens (user_id)');
    await txn.execute(
        'CREATE INDEX idx_jwt_tokens_device_id ON jwt_tokens (device_id)');
    await txn.execute(
        'CREATE INDEX idx_jwt_tokens_expires_at ON jwt_tokens (expires_at)');
    await txn.execute(
        'CREATE INDEX idx_jwt_tokens_is_active ON jwt_tokens (is_active)');

    // Harvest indexes
    await txn.execute(
        'CREATE INDEX idx_harvest_records_harvest_id ON harvest_records (harvest_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_mandor_id ON harvest_records (mandor_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_status ON harvest_records (status)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_sync_status ON harvest_records (sync_status)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_harvest_date ON harvest_records (harvest_date)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_server_id ON harvest_records (server_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_block_id ON harvest_records (block_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_company_id ON harvest_records (company_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_division_id ON harvest_records (division_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_division_code ON harvest_records (division_code)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_karyawan_id ON harvest_records (karyawan_id)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_karyawan_nik ON harvest_records (karyawan_nik)');
    await txn.execute(
        'CREATE INDEX idx_harvest_records_employee_division_id ON harvest_records (employee_division_id)');

    // Gate Check indexes
    await txn.execute(
        'CREATE INDEX idx_gate_check_records_gate_check_id ON gate_check_records (gate_check_id)');
    await txn.execute(
        'CREATE INDEX idx_gate_check_records_vehicle_plate ON gate_check_records (vehicle_plate)');
    await txn.execute(
        'CREATE INDEX idx_gate_check_records_status ON gate_check_records (status)');
    await txn.execute(
        'CREATE INDEX idx_gate_check_records_entry_time ON gate_check_records (entry_time)');
    await txn.execute(
        'CREATE INDEX idx_gate_check_records_sync_status ON gate_check_records (sync_status)');

    // Guest Log indexes
    await txn.execute(
        'CREATE INDEX idx_gate_guest_logs_guest_id ON gate_guest_logs (guest_id)');
    await txn.execute(
        'CREATE INDEX idx_gate_guest_logs_status ON gate_guest_logs (status)');
    await txn.execute(
        'CREATE INDEX idx_gate_guest_logs_generation_intent ON gate_guest_logs (generation_intent)');
    await txn.execute(
        'CREATE INDEX idx_gate_guest_logs_sync_status ON gate_guest_logs (sync_status)');

    // Sync indexes
    await txn
        .execute('CREATE INDEX idx_sync_queue_status ON sync_queue (status)');
    await txn.execute(
        'CREATE INDEX idx_sync_queue_priority ON sync_queue (priority)');
    await txn
        .execute('CREATE INDEX idx_sync_queue_user_id ON sync_queue (user_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_queue_table_name ON sync_queue (table_name)');

    // Sync Logs indexes (Role-Based Performance Optimization)
    await txn.execute(
        'CREATE INDEX idx_sync_logs_device_id ON sync_logs (device_id)');
    await txn
        .execute('CREATE INDEX idx_sync_logs_user_id ON sync_logs (user_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_operation_type ON sync_logs (operation_type)');
    await txn
        .execute('CREATE INDEX idx_sync_logs_status ON sync_logs (status)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_sync_started_at ON sync_logs (sync_started_at)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_sync_completed_at ON sync_logs (sync_completed_at)');

    // Role-Specific Sync Indexes
    await txn.execute(
        'CREATE INDEX idx_sync_logs_user_role ON sync_logs (user_role)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_company_id ON sync_logs (company_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_sync_context ON sync_logs (sync_context)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_sync_priority ON sync_logs (sync_priority)');

    // Composite Indexes for Role-Based Queries
    await txn.execute(
        'CREATE INDEX idx_sync_logs_role_status ON sync_logs (user_role, status)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_role_context ON sync_logs (user_role, sync_context)');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_mandor_harvest ON sync_logs (user_role, sync_context) WHERE user_role = "mandor" AND sync_context = "HARVEST_DATA"');
    await txn.execute(
        'CREATE INDEX idx_sync_logs_satpam_gate ON sync_logs (user_role, sync_context) WHERE user_role = "satpam" AND sync_context = "GATE_CHECK_DATA"');

    // App Settings index
    await txn
        .execute('CREATE INDEX idx_app_settings_key ON app_settings (key)');

    // Notification indexes
    await txn.execute(
        'CREATE INDEX idx_notifications_user_id ON notifications (user_id)');
    await txn.execute(
        'CREATE INDEX idx_notifications_is_read ON notifications (is_read)');
    await txn
        .execute('CREATE INDEX idx_notifications_type ON notifications (type)');
    await txn.execute(
        'CREATE INDEX idx_notifications_created_at ON notifications (created_at)');

    // QR Tokens indexes (Intent-Based QR System)
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_token_id ON gate_qr_tokens (token_id)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_status ON gate_qr_tokens (status)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_generation_intent ON gate_qr_tokens (generation_intent)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_expires_at ON gate_qr_tokens (expires_at)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_sync_status ON gate_qr_tokens (sync_status)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_generated_by ON gate_qr_tokens (generated_by)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_vehicle_plate ON gate_qr_tokens (vehicle_plate)');

    // QR Validations indexes
    await txn.execute(
        'CREATE INDEX idx_qr_validations_token_id ON gate_qr_validations (token_id)');
    await txn.execute(
        'CREATE INDEX idx_qr_validations_validated_at ON gate_qr_validations (validated_at)');
    await txn.execute(
        'CREATE INDEX idx_qr_validations_sync_status ON gate_qr_validations (sync_status)');
    await txn.execute(
        'CREATE INDEX idx_qr_validations_scan_intent ON gate_qr_validations (scan_intent)');

    // QR Tokens Cache indexes
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_cache_token_id ON qr_tokens_cache (token_id)');
    await txn.execute(
        'CREATE INDEX idx_qr_tokens_cache_status ON qr_tokens_cache (status)');

    // Enhanced Sync Transactions indexes
    await txn.execute(
        'CREATE INDEX idx_sync_transactions_status ON sync_transactions (status)');
    await txn.execute(
        'CREATE INDEX idx_sync_transactions_priority ON sync_transactions (priority DESC, created_at ASC)');
    await txn.execute(
        'CREATE INDEX idx_sync_transactions_user_device ON sync_transactions (user_id, device_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_transactions_table_name ON sync_transactions (table_name)');
    await txn.execute(
        'CREATE INDEX idx_sync_transactions_sync_status ON sync_transactions (sync_status)');

    // Enhanced Sync Conflicts indexes
    await txn.execute(
        'CREATE INDEX idx_sync_conflicts_enhanced_status ON sync_conflicts_enhanced (status)');
    await txn.execute(
        'CREATE INDEX idx_sync_conflicts_enhanced_severity ON sync_conflicts_enhanced (severity, detected_at DESC)');
    await txn.execute(
        'CREATE INDEX idx_sync_conflicts_enhanced_table_record ON sync_conflicts_enhanced (table_name, record_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_conflicts_enhanced_user_device ON sync_conflicts_enhanced (user_id, device_id)');

    // Sync Sessions indexes
    await txn.execute(
        'CREATE INDEX idx_sync_sessions_device_user ON sync_sessions (device_id, user_id)');
    await txn.execute(
        'CREATE INDEX idx_sync_sessions_status ON sync_sessions (status)');

    // Sync Event Log indexes
    await txn.execute(
        'CREATE INDEX idx_sync_event_log_severity ON sync_event_log (severity, event_timestamp DESC)');

    // Additional synchronization indexes
    await txn.execute(
        'CREATE INDEX idx_gate_guest_logs_server_record_id ON gate_guest_logs (server_record_id)');
    await txn.execute(
        'CREATE INDEX idx_photo_sync_queue_local_id ON photo_sync_queue (local_id)');
    await txn.execute(
        'CREATE INDEX idx_photo_sync_queue_sync_status ON photo_sync_queue (sync_status)');
    await txn.execute(
        'CREATE INDEX idx_photo_sync_queue_token_id ON photo_sync_queue (token_id)');
  }

  // Create views for complex queries
  Future<void> createViews(Transaction txn) async {
    // User Permissions View
    await txn.execute('''
      CREATE VIEW user_permissions AS
      SELECT 
        u.user_id,
        u.username,
        u.role,
        u.company_id,
        GROUP_CONCAT(DISTINCT ue.estate_id) as estate_ids,
        GROUP_CONCAT(DISTINCT ud.division_id) as division_ids
      FROM users u
      LEFT JOIN user_estates ue ON u.user_id = ue.user_id AND ue.is_active = 1
      LEFT JOIN user_divisions ud ON u.user_id = ud.user_id AND ud.is_active = 1
      WHERE u.is_active = 1
      GROUP BY u.user_id, u.username, u.role, u.company_id
    ''');

    // Harvest Summary View
    await txn.execute('''
      CREATE VIEW harvest_summary AS
      SELECT 
        hr.harvest_id,
        hr.harvest_date,
        hr.status,
        hr.mandor_id,
        u.full_name as mandor_name,
        b.name as block_name,
        d.name as division_name,
        e.name as estate_name,
        hr.jumlah_janjang,
        hr.jjg_matang,
        hr.jjg_mentah,
        hr.jjg_lewat_matang,
        hr.jjg_busuk_abnormal,
        hr.jjg_tangkai_panjang,
        hr.total_weight,
        hr.total_brondolan
      FROM harvest_records hr
      JOIN users u ON hr.mandor_id = u.user_id
      LEFT JOIN blocks b ON b.block_id = hr.block_id
      LEFT JOIN divisions d ON d.division_id = b.division_id
        AND (hr.division_id IS NULL OR hr.division_id = '' OR d.division_id = hr.division_id)
        AND (hr.division_code IS NULL OR hr.division_code = '' OR d.code = hr.division_code)
      LEFT JOIN estates e ON d.estate_id = e.estate_id
    ''');

    // Gate Check Dashboard View
    await txn.execute('''
      CREATE VIEW gate_check_dashboard AS
      SELECT 
        gcr.gate_check_id,
        gcr.vehicle_plate,
        gcr.driver_name,
        gcr.status,
        gcr.entry_time,
        gcr.exit_time,
        c.name as company_name,
        u.full_name as created_by_name,
        CASE 
          WHEN gcr.exit_time IS NULL THEN 'INSIDE'
          ELSE 'COMPLETED'
        END as current_status
      FROM gate_check_records gcr
      JOIN companies c ON gcr.company_id = c.company_id
      JOIN users u ON gcr.created_by = u.user_id
      ORDER BY gcr.entry_time DESC
    ''');

    // Role-Specific Sync Status View
    await txn.execute('''
      CREATE VIEW role_sync_status AS
      SELECT 
        sl.user_role,
        sl.company_id,
        sl.sync_context,
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN sl.status = 'COMPLETED' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN sl.status = 'FAILED' THEN 1 END) as failed_syncs,
        COUNT(CASE WHEN sl.status = 'STARTED' THEN 1 END) as ongoing_syncs,
        AVG(sl.duration_ms) as avg_duration_ms,
        SUM(sl.records_processed) as total_records_processed,
        SUM(sl.records_successful) as total_records_successful,
        SUM(sl.conflicts_detected) as total_conflicts_detected,
        MAX(sl.sync_completed_at) as last_successful_sync,
        c.name as company_name
      FROM sync_logs sl
      JOIN companies c ON sl.company_id = c.company_id
      WHERE sl.sync_completed_at IS NOT NULL
      GROUP BY sl.user_role, sl.company_id, sl.sync_context, c.name
    ''');

    // Mandor Harvest Sync View
    await txn.execute('''
      CREATE VIEW mandor_harvest_sync AS
      SELECT 
        sl.user_id,
        u.full_name as mandor_name,
        sl.company_id,
        c.name as company_name,
        COUNT(*) as harvest_sync_count,
        SUM(sl.records_processed) as total_harvest_records,
        SUM(sl.records_successful) as successful_harvest_records,
        AVG(sl.duration_ms) as avg_sync_duration,
        MAX(sl.sync_completed_at) as last_harvest_sync,
        COUNT(CASE WHEN sl.status = 'FAILED' THEN 1 END) as failed_harvest_syncs
      FROM sync_logs sl
      JOIN users u ON sl.user_id = u.user_id
      JOIN companies c ON sl.company_id = c.company_id
      WHERE sl.user_role = 'mandor' AND sl.sync_context = 'HARVEST_DATA'
      GROUP BY sl.user_id, u.full_name, sl.company_id, c.name
    ''');

    // Satpam Gate Check Sync View
    await txn.execute('''
      CREATE VIEW satpam_gate_sync AS
      SELECT 
        sl.user_id,
        u.full_name as satpam_name,
        sl.company_id,
        c.name as company_name,
        COUNT(*) as gate_sync_count,
        SUM(sl.records_processed) as total_gate_records,
        SUM(sl.records_successful) as successful_gate_records,
        AVG(sl.duration_ms) as avg_sync_duration,
        MAX(sl.sync_completed_at) as last_gate_sync,
        COUNT(CASE WHEN sl.status = 'FAILED' THEN 1 END) as failed_gate_syncs
      FROM sync_logs sl
      JOIN users u ON sl.user_id = u.user_id
      JOIN companies c ON sl.company_id = c.company_id
      WHERE sl.user_role = 'satpam' AND sl.sync_context = 'GATE_CHECK_DATA'
      GROUP BY sl.user_id, u.full_name, sl.company_id, c.name
    ''');
  }
}
