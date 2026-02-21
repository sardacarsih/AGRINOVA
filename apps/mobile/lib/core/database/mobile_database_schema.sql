-- =============================================================================
-- AGRINOVA MOBILE DATABASE SCHEMA (SQLite)
-- Enhanced Offline-First Architecture with JWT Authentication & Sync Support
-- Version: 2.0
-- Target: Flutter Mobile App (Android/iOS)
-- =============================================================================

-- =============================================================================
-- AUTHENTICATION & SECURITY TABLES
-- =============================================================================

-- User Authentication Data (Enhanced JWT Support)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,                    -- Server UUID
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mandor', 'asisten', 'satpam', 'manager', 'area_manager', 'company_admin', 'super_admin')),
    company_id TEXT NOT NULL,
    employee_id TEXT,
    is_active INTEGER DEFAULT 1,
    password_hash TEXT,                              -- For offline authentication fallback
    last_login_at INTEGER,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until INTEGER,
    two_factor_enabled INTEGER DEFAULT 0,
    email_verified INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 0,
    reporting_to_area_manager_id TEXT,               -- Hierarchical reporting structure
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    -- Offline-first conflict resolution
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    conflict_data TEXT                               -- JSON for conflict resolution
);

-- JWT Token Storage (Secure Hardware-Backed Storage Reference)
CREATE TABLE jwt_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token_type TEXT NOT NULL CHECK (token_type IN ('ACCESS', 'REFRESH', 'OFFLINE')),
    token_hash TEXT NOT NULL,                        -- Hash for security, actual tokens in Flutter Secure Storage
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
);

-- Device Information & Authorization
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
    fcm_token TEXT,                                  -- Firebase Cloud Messaging
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
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Biometric Authentication Data
CREATE TABLE biometric_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    fingerprint_enabled INTEGER DEFAULT 0,
    face_id_enabled INTEGER DEFAULT 0,
    voice_enabled INTEGER DEFAULT 0,
    fingerprint_hash TEXT,                           -- Local biometric template hash
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
);

-- Offline Authentication Support
CREATE TABLE offline_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    offline_token_hash TEXT,                         -- 30-day offline JWT hash
    offline_pin_hash TEXT,                           -- Encrypted PIN for offline access
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
);

-- Security Events & Audit Trail
CREATE TABLE security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    device_id TEXT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    metadata TEXT,                                   -- JSON metadata
    ip_address TEXT,
    platform TEXT,
    is_resolved INTEGER DEFAULT 0,
    resolved_at INTEGER,
    occurred_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- =============================================================================
-- MASTER DATA TABLES (Hierarchical Structure)
-- =============================================================================

-- Company Master Data
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT UNIQUE NOT NULL,                 -- Server UUID
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1
);

-- Estate Master Data
CREATE TABLE estates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estate_id TEXT UNIQUE NOT NULL,                  -- Server UUID
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
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
);

-- Division Master Data
CREATE TABLE divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_id TEXT UNIQUE NOT NULL,                -- Server UUID
    estate_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    area_hectares REAL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    FOREIGN KEY (estate_id) REFERENCES estates (estate_id) ON DELETE CASCADE
);

-- Block Master Data
CREATE TABLE blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id BLOB UNIQUE NOT NULL,                   -- Server UUID (16-byte)
    division_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
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
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    FOREIGN KEY (division_id) REFERENCES divisions (division_id) ON DELETE CASCADE
);

-- Employee/Worker Master Data
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id BLOB UNIQUE NOT NULL,                -- Server UUID (16-byte)
    company_id TEXT NOT NULL,
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
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
);

-- =============================================================================
-- USER ASSIGNMENT TABLES (Multi-Assignment Support)
-- =============================================================================

-- User Estate Assignments (Manager multi-estate support)
CREATE TABLE user_estates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    estate_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    assigned_by TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (estate_id) REFERENCES estates (estate_id) ON DELETE CASCADE,
    UNIQUE (user_id, estate_id)
);

-- User Division Assignments (Asisten multi-division support)
CREATE TABLE user_divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    division_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    assigned_by TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (division_id) REFERENCES divisions (division_id) ON DELETE CASCADE,
    UNIQUE (user_id, division_id)
);

-- Area Manager Company Assignments (Multi-company support)
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
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
    UNIQUE (user_id, company_id)
);

-- =============================================================================
-- MANDOR DATA TABLES (Harvest/Panen Operations)
-- =============================================================================

-- Harvest/Panen Main Records
CREATE TABLE harvest_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    harvest_id TEXT UNIQUE NOT NULL,                 -- Generated UUID for offline-first
    server_id TEXT,                                  -- Server UUID after sync success
    panen_number TEXT,                               -- Server-generated number
    block_id BLOB NOT NULL,                          -- Canonical block UUID (16-byte)
    company_id TEXT,                                 -- Context tenant/company
    estate_id TEXT,                                  -- Context estate
    division_id TEXT,                                -- Canonical division UUID
    division_code TEXT,                              -- Human-readable division code
    mandor_scope TEXT,                               -- Comma-separated mandor division scope
    karyawan_id BLOB NOT NULL,                       -- Canonical employee UUID (16-byte)
    karyawan_nik TEXT NOT NULL,                      -- Employee NIK snapshot at capture time
    employee_division_id TEXT,                       -- Employee-origin division UUID snapshot
    employee_division_name TEXT,                     -- Employee-origin division name snapshot
    harvest_date INTEGER NOT NULL,                   -- Date as timestamp
    mandor_id TEXT NOT NULL,
    asisten_id TEXT,
    approved_by_id TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PKS_RECEIVED', 'PKS_WEIGHED')),
    approval_date INTEGER,
    rejection_reason TEXT,
    approval_notes TEXT,
    required_corrections TEXT,
    adjustment_reason TEXT,
    jumlah_janjang INTEGER DEFAULT 0,                -- Total bunches
    jjg_matang INTEGER DEFAULT 0,                    -- Ripe bunches
    jjg_mentah INTEGER DEFAULT 0,                    -- Unripe bunches
    jjg_lewat_matang INTEGER DEFAULT 0,              -- Overripe bunches
    jjg_busuk_abnormal INTEGER DEFAULT 0,            -- Rotten/abnormal bunches
    jjg_tangkai_panjang INTEGER DEFAULT 0,           -- Long-stalk bunches
    total_weight REAL DEFAULT 0,
    total_brondolan REAL DEFAULT 0,
    notes TEXT,
    client_timestamp INTEGER,                        -- Mobile app timestamp
    device_id TEXT,
    coordinates TEXT,                                -- GPS coordinates JSON
    bjr REAL,                                        -- Bunch to Juice Ratio
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
    conflict_data TEXT,                              -- JSON for conflict resolution
    -- Offline-first fields
    is_draft INTEGER DEFAULT 0,                      -- Draft mode for incomplete entries
    validation_errors TEXT,                          -- JSON validation errors
    photo_paths TEXT,                                -- JSON array of local photo paths
    FOREIGN KEY (mandor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Harvest Employee Records
CREATE TABLE harvest_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    harvest_id TEXT NOT NULL,
    employee_id BLOB NOT NULL,
    role TEXT,                                       -- Worker role in harvest
    tbs_count INTEGER DEFAULT 0,
    weight REAL DEFAULT 0,
    brondolan REAL DEFAULT 0,
    work_hours REAL,
    overtime_hours REAL,
    check_in_time INTEGER,
    check_out_time INTEGER,
    productivity_rate REAL,                          -- TBS per hour
    quality_score REAL,                              -- Quality assessment
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    FOREIGN KEY (harvest_id) REFERENCES harvest_records (harvest_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE RESTRICT,
    UNIQUE (harvest_id, employee_id)
);

-- =============================================================================
-- SATPAM DATA TABLES (Gate Check Operations)
-- =============================================================================

-- Gate Check Main Records
CREATE TABLE gate_check_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gate_check_id TEXT UNIQUE NOT NULL,              -- Generated UUID
    pos_number TEXT NOT NULL,                        -- Gate position number
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
    actual_weight REAL,                              -- Final weight from PKS
    do_number TEXT,                                  -- Delivery Order number
    qr_code_data TEXT,                               -- Scanned QR code data
    entry_time INTEGER NOT NULL,
    exit_time INTEGER,
    status TEXT DEFAULT 'ENTERING' CHECK (status IN ('ENTERING', 'INSIDE', 'EXITING', 'EXITED', 'CANCELLED', 'ERROR')),
    passed INTEGER DEFAULT 0,                        -- Pass/Fail status
    validation_notes TEXT,                           -- Validation issues
    notes TEXT,
    created_by TEXT NOT NULL,                        -- Satpam user ID
    photos TEXT,                                     -- JSON array of photo paths
    coordinates TEXT,                                -- GPS coordinates JSON
    client_timestamp INTEGER,                        -- Mobile app timestamp
    device_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    needs_sync INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    conflict_data TEXT,                              -- JSON for conflict resolution
    -- Validation fields
    harvest_match_status TEXT,                       -- Match with approved harvest data
    harvest_reference_id TEXT,                       -- Reference to harvest record
    validation_errors TEXT,                          -- JSON validation errors
    compliance_score REAL,                          -- Compliance assessment
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
    FOREIGN KEY (harvest_reference_id) REFERENCES harvest_records (harvest_id) ON DELETE SET NULL
);

-- Gate Check Statistics (Daily Aggregates)
CREATE TABLE gate_check_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT NOT NULL,
    date INTEGER NOT NULL,                           -- Date as timestamp (day start)
    vehicles_inside INTEGER DEFAULT 0,
    today_entries INTEGER DEFAULT 0,
    today_exits INTEGER DEFAULT 0,
    pending_exit INTEGER DEFAULT 0,
    average_load_time REAL DEFAULT 0,               -- Average time inside gate
    compliance_rate REAL DEFAULT 0,                 -- Percentage of compliant entries
    total_weight_in REAL DEFAULT 0,
    total_weight_out REAL DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    version INTEGER DEFAULT 1,
    FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
    UNIQUE (company_id, date)
);

-- QR Scanner History
CREATE TABLE qr_scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT UNIQUE NOT NULL,                    -- Generated UUID
    user_id TEXT NOT NULL,
    qr_data TEXT NOT NULL,                           -- Raw QR code data
    scan_type TEXT NOT NULL CHECK (scan_type IN ('VEHICLE', 'DO', 'TBS', 'EMPLOYEE', 'UNKNOWN')),
    parsed_data TEXT,                                -- JSON parsed data
    related_record_type TEXT,                        -- Type of related record
    related_record_id TEXT,                          -- ID of related record
    scan_result TEXT NOT NULL CHECK (scan_result IN ('SUCCESS', 'INVALID', 'DUPLICATE', 'ERROR')),
    error_message TEXT,
    location_coordinates TEXT,                       -- GPS coordinates JSON
    photo_path TEXT,                                 -- Photo of scanned item
    scanned_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- =============================================================================
-- SYNC & CONFLICT RESOLUTION TABLES
-- =============================================================================

-- Sync Queue for Offline Operations
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL,               -- Generated UUID
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE')),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,                         -- Local record ID
    server_record_id TEXT,                           -- Server record ID (after sync)
    data TEXT NOT NULL,                              -- JSON serialized data
    dependencies TEXT,                               -- JSON array of dependent operations
    priority INTEGER DEFAULT 1,                     -- Higher = more priority
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    error_details TEXT,                              -- Detailed error information
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),  -- Track modifications
    scheduled_at INTEGER,                            -- When to retry
    started_at INTEGER,                              -- When sync started
    completed_at INTEGER,                            -- When sync completed
    user_id TEXT,                                    -- User who initiated the operation
    device_id TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Trigger to automatically update updated_at timestamp on sync_queue modifications
CREATE TRIGGER sync_queue_update_timestamp 
AFTER UPDATE ON sync_queue 
BEGIN
  UPDATE sync_queue SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Sync Conflict Resolution
CREATE TABLE sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conflict_id TEXT UNIQUE NOT NULL,                -- Generated UUID
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,                         -- Local record ID
    server_record_id TEXT NOT NULL,                  -- Server record ID
    local_data TEXT NOT NULL,                        -- JSON local data
    server_data TEXT NOT NULL,                       -- JSON server data
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('VERSION_MISMATCH', 'DATA_CONFLICT', 'DELETE_CONFLICT', 'CONSTRAINT_VIOLATION')),
    conflict_fields TEXT,                            -- JSON array of conflicting fields
    resolution_strategy TEXT CHECK (resolution_strategy IN ('LOCAL_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL')),
    resolution_data TEXT,                            -- JSON resolved data
    resolved_by TEXT,                                -- User ID who resolved
    resolved_at INTEGER,
    auto_resolvable INTEGER DEFAULT 0,               -- Can be auto-resolved
    user_id TEXT NOT NULL,
    device_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),  -- Track modifications
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'MANUAL_REQUIRED')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Trigger to automatically update updated_at timestamp on sync_conflicts modifications
CREATE TRIGGER sync_conflicts_update_timestamp 
AFTER UPDATE ON sync_conflicts 
BEGIN
  UPDATE sync_conflicts SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Sync Logs for Audit & Debugging
CREATE TABLE sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id TEXT UNIQUE NOT NULL,                     -- Generated UUID
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('FULL_SYNC', 'INCREMENTAL_SYNC', 'PUSH_SYNC', 'PULL_SYNC')),
    table_name TEXT,
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    sync_started_at INTEGER NOT NULL,
    sync_completed_at INTEGER,
    duration_ms INTEGER,                             -- Sync duration in milliseconds
    status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    error_message TEXT,
    error_details TEXT,                              -- Detailed error information
    network_type TEXT,                               -- WIFI, MOBILE, OFFLINE
    battery_level INTEGER,                           -- Device battery level during sync
    data_usage_kb INTEGER,                           -- Network data usage
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- =============================================================================
-- NOTIFICATION & REAL-TIME COMMUNICATION
-- =============================================================================

-- Local Notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id TEXT UNIQUE NOT NULL,            -- Generated UUID
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT,                                       -- JSON notification data
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    category TEXT,                                   -- Notification category
    channels TEXT,                                   -- Notification channels JSON
    is_read INTEGER DEFAULT 0,
    read_at INTEGER,
    is_delivered INTEGER DEFAULT 0,
    delivered_at INTEGER,
    schedule_at INTEGER,                             -- Scheduled notification
    expires_at INTEGER,                              -- Notification expiry
    action_url TEXT,                                 -- Deep link URL
    related_record_type TEXT,                        -- Related record type
    related_record_id TEXT,                          -- Related record ID
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- =============================================================================
-- SYSTEM & MONITORING TABLES
-- =============================================================================

-- User Activity Logs
CREATE TABLE user_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    metadata TEXT,                                   -- JSON metadata
    ip_address TEXT,
    user_agent TEXT,
    platform TEXT,
    location_coordinates TEXT,                       -- GPS coordinates JSON
    timestamp INTEGER NOT NULL,
    session_id TEXT,
    duration_ms INTEGER,                             -- Action duration
    success INTEGER DEFAULT 1,                       -- Success/failure flag
    error_message TEXT,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- System Performance Metrics
CREATE TABLE system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    device_id TEXT,
    user_id TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT,                                   -- JSON additional data
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Application Settings & Preferences
CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,                                    -- NULL for global settings
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'INTEGER', 'REAL', 'BOOLEAN', 'JSON')),
    is_encrypted INTEGER DEFAULT 0,                  -- Encrypted sensitive settings
    is_synced INTEGER DEFAULT 0,                     -- Sync with server
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    UNIQUE (user_id, setting_key)
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Authentication & Security Indexes
CREATE INDEX idx_users_user_id ON users (user_id);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_company_id ON users (company_id);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_sync_status ON users (sync_status);
CREATE INDEX idx_users_reporting_hierarchy ON users (reporting_to_area_manager_id, role);

CREATE INDEX idx_jwt_tokens_user_id ON jwt_tokens (user_id);
CREATE INDEX idx_jwt_tokens_device_id ON jwt_tokens (device_id);
CREATE INDEX idx_jwt_tokens_token_type ON jwt_tokens (token_type);
CREATE INDEX idx_jwt_tokens_expires_at ON jwt_tokens (expires_at);
CREATE INDEX idx_jwt_tokens_is_active ON jwt_tokens (is_active);

CREATE INDEX idx_user_devices_user_id ON user_devices (user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices (device_id);
CREATE INDEX idx_user_devices_is_authorized ON user_devices (is_authorized);
CREATE INDEX idx_user_devices_is_active ON user_devices (is_active);
CREATE INDEX idx_user_devices_sync_status ON user_devices (sync_status);

-- Master Data Indexes
CREATE INDEX idx_companies_company_id ON companies (company_id);
CREATE INDEX idx_companies_code ON companies (code);
CREATE INDEX idx_companies_is_active ON companies (is_active);
CREATE INDEX idx_companies_sync_status ON companies (sync_status);

CREATE INDEX idx_estates_estate_id ON estates (estate_id);
CREATE INDEX idx_estates_company_id ON estates (company_id);
CREATE INDEX idx_estates_code ON estates (code);
CREATE INDEX idx_estates_is_active ON estates (is_active);
CREATE INDEX idx_estates_sync_status ON estates (sync_status);

CREATE INDEX idx_divisions_division_id ON divisions (division_id);
CREATE INDEX idx_divisions_estate_id ON divisions (estate_id);
CREATE INDEX idx_divisions_code ON divisions (code);
CREATE INDEX idx_divisions_is_active ON divisions (is_active);
CREATE INDEX idx_divisions_sync_status ON divisions (sync_status);

CREATE INDEX idx_blocks_block_id ON blocks (block_id);
CREATE INDEX idx_blocks_division_id ON blocks (division_id);
CREATE INDEX idx_blocks_code ON blocks (code);
CREATE INDEX idx_blocks_is_active ON blocks (is_active);
CREATE INDEX idx_blocks_sync_status ON blocks (sync_status);
CREATE INDEX idx_blocks_location ON blocks (latitude, longitude);

CREATE INDEX idx_employees_employee_id ON employees (employee_id);
CREATE INDEX idx_employees_company_id ON employees (company_id);
CREATE INDEX idx_employees_employee_code ON employees (employee_code);
CREATE INDEX idx_employees_is_active ON employees (is_active);
CREATE INDEX idx_employees_sync_status ON employees (sync_status);

-- Assignment Indexes
CREATE INDEX idx_user_estates_user_id ON user_estates (user_id);
CREATE INDEX idx_user_estates_estate_id ON user_estates (estate_id);
CREATE INDEX idx_user_estates_is_active ON user_estates (is_active);

CREATE INDEX idx_user_divisions_user_id ON user_divisions (user_id);
CREATE INDEX idx_user_divisions_division_id ON user_divisions (division_id);
CREATE INDEX idx_user_divisions_is_active ON user_divisions (is_active);

CREATE INDEX idx_area_manager_companies_user_id ON area_manager_companies (user_id);
CREATE INDEX idx_area_manager_companies_company_id ON area_manager_companies (company_id);
CREATE INDEX idx_area_manager_companies_is_active ON area_manager_companies (is_active);

-- Harvest/Panen Indexes
CREATE INDEX idx_harvest_records_harvest_id ON harvest_records (harvest_id);
CREATE INDEX idx_harvest_records_block_id ON harvest_records (block_id);
CREATE INDEX idx_harvest_records_mandor_id ON harvest_records (mandor_id);
CREATE INDEX idx_harvest_records_status ON harvest_records (status);
CREATE INDEX idx_harvest_records_harvest_date ON harvest_records (harvest_date);
CREATE INDEX idx_harvest_records_sync_status ON harvest_records (sync_status);
CREATE INDEX idx_harvest_records_server_id ON harvest_records (server_id);
CREATE INDEX idx_harvest_records_company_id ON harvest_records (company_id);
CREATE INDEX idx_harvest_records_division_id ON harvest_records (division_id);
CREATE INDEX idx_harvest_records_division_code ON harvest_records (division_code);
CREATE INDEX idx_harvest_records_karyawan_id ON harvest_records (karyawan_id);
CREATE INDEX idx_harvest_records_karyawan_nik ON harvest_records (karyawan_nik);
CREATE INDEX idx_harvest_records_employee_division_id ON harvest_records (employee_division_id);
CREATE INDEX idx_harvest_records_needs_sync ON harvest_records (needs_sync);
CREATE INDEX idx_harvest_records_is_draft ON harvest_records (is_draft);
CREATE INDEX idx_harvest_records_date_status ON harvest_records (harvest_date, status);

CREATE INDEX idx_harvest_employees_harvest_id ON harvest_employees (harvest_id);
CREATE INDEX idx_harvest_employees_employee_id ON harvest_employees (employee_id);
CREATE INDEX idx_harvest_employees_sync_status ON harvest_employees (sync_status);

-- Gate Check Indexes
CREATE INDEX idx_gate_check_records_gate_check_id ON gate_check_records (gate_check_id);
CREATE INDEX idx_gate_check_records_company_id ON gate_check_records (company_id);
CREATE INDEX idx_gate_check_records_vehicle_plate ON gate_check_records (vehicle_plate);
CREATE INDEX idx_gate_check_records_driver_name ON gate_check_records (driver_name);
CREATE INDEX idx_gate_check_records_status ON gate_check_records (status);
CREATE INDEX idx_gate_check_records_entry_time ON gate_check_records (entry_time);
CREATE INDEX idx_gate_check_records_exit_time ON gate_check_records (exit_time);
CREATE INDEX idx_gate_check_records_created_by ON gate_check_records (created_by);
CREATE INDEX idx_gate_check_records_sync_status ON gate_check_records (sync_status);
CREATE INDEX idx_gate_check_records_needs_sync ON gate_check_records (needs_sync);
CREATE INDEX idx_gate_check_records_vehicle_tracking ON gate_check_records (vehicle_plate, entry_time);

CREATE INDEX idx_gate_check_stats_company_id ON gate_check_stats (company_id);
CREATE INDEX idx_gate_check_stats_date ON gate_check_stats (date);
CREATE INDEX idx_gate_check_stats_sync_status ON gate_check_stats (sync_status);

CREATE INDEX idx_qr_scan_history_user_id ON qr_scan_history (user_id);
CREATE INDEX idx_qr_scan_history_scan_type ON qr_scan_history (scan_type);
CREATE INDEX idx_qr_scan_history_scan_result ON qr_scan_history (scan_result);
CREATE INDEX idx_qr_scan_history_scanned_at ON qr_scan_history (scanned_at);
CREATE INDEX idx_qr_scan_history_sync_status ON qr_scan_history (sync_status);

-- Sync & Conflict Resolution Indexes
CREATE INDEX idx_sync_queue_operation_type ON sync_queue (operation_type);
CREATE INDEX idx_sync_queue_table_name ON sync_queue (table_name);
CREATE INDEX idx_sync_queue_status ON sync_queue (status);
CREATE INDEX idx_sync_queue_priority ON sync_queue (priority, created_at);
CREATE INDEX idx_sync_queue_user_id ON sync_queue (user_id);
CREATE INDEX idx_sync_queue_scheduled_at ON sync_queue (scheduled_at);

CREATE INDEX idx_sync_conflicts_table_name ON sync_conflicts (table_name);
CREATE INDEX idx_sync_conflicts_user_id ON sync_conflicts (user_id);
CREATE INDEX idx_sync_conflicts_status ON sync_conflicts (status);
CREATE INDEX idx_sync_conflicts_conflict_type ON sync_conflicts (conflict_type);
CREATE INDEX idx_sync_conflicts_auto_resolvable ON sync_conflicts (auto_resolvable);

CREATE INDEX idx_sync_logs_device_id ON sync_logs (device_id);
CREATE INDEX idx_sync_logs_user_id ON sync_logs (user_id);
CREATE INDEX idx_sync_logs_operation_type ON sync_logs (operation_type);
CREATE INDEX idx_sync_logs_status ON sync_logs (status);
CREATE INDEX idx_sync_logs_sync_started_at ON sync_logs (sync_started_at);

-- Notification Indexes
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_priority ON notifications (priority);
CREATE INDEX idx_notifications_schedule_at ON notifications (schedule_at);
CREATE INDEX idx_notifications_expires_at ON notifications (expires_at);
CREATE INDEX idx_notifications_sync_status ON notifications (sync_status);

-- System Indexes
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs (user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs (action);
CREATE INDEX idx_user_activity_logs_entity_type ON user_activity_logs (entity_type);
CREATE INDEX idx_user_activity_logs_timestamp ON user_activity_logs (timestamp);
CREATE INDEX idx_user_activity_logs_sync_status ON user_activity_logs (sync_status);

CREATE INDEX idx_system_metrics_metric_type ON system_metrics (metric_type);
CREATE INDEX idx_system_metrics_metric_name ON system_metrics (metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics (timestamp);
CREATE INDEX idx_system_metrics_sync_status ON system_metrics (sync_status);

CREATE INDEX idx_app_settings_user_id ON app_settings (user_id);
CREATE INDEX idx_app_settings_setting_key ON app_settings (setting_key);
CREATE INDEX idx_app_settings_is_synced ON app_settings (is_synced);

-- =============================================================================
-- VIEWS FOR COMPLEX QUERIES
-- =============================================================================

-- User Details with Assignments View
CREATE VIEW user_details_view AS
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.role,
    u.email,
    u.phone,
    u.is_active,
    c.name as company_name,
    c.company_id,
    GROUP_CONCAT(DISTINCT e.name) as assigned_estates,
    GROUP_CONCAT(DISTINCT d.name) as assigned_divisions,
    u.reporting_to_area_manager_id,
    rm.full_name as reports_to_manager,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.company_id
LEFT JOIN user_estates ue ON u.user_id = ue.user_id AND ue.is_active = 1
LEFT JOIN estates e ON ue.estate_id = e.estate_id
LEFT JOIN user_divisions ud ON u.user_id = ud.user_id AND ud.is_active = 1
LEFT JOIN divisions d ON ud.division_id = d.division_id
LEFT JOIN users rm ON u.reporting_to_area_manager_id = rm.user_id
GROUP BY u.user_id;

-- Harvest Summary View
CREATE VIEW harvest_summary_view AS
SELECT 
    hr.harvest_id,
    hr.panen_number,
    hr.harvest_date,
    hr.status,
    b.name as block_name,
    b.code as block_code,
    d.name as division_name,
    e.name as estate_name,
    c.name as company_name,
    m.full_name as mandor_name,
    a.full_name as approved_by_name,
    hr.jumlah_janjang,
    hr.jjg_matang,
    hr.jjg_mentah,
    hr.jjg_lewat_matang,
    hr.jjg_busuk_abnormal,
    hr.jjg_tangkai_panjang,
    hr.total_weight,
    hr.total_brondolan,
    hr.approval_date,
    hr.bjr,
    hr.created_at,
    hr.sync_status,
    hr.needs_sync
FROM harvest_records hr
LEFT JOIN blocks b ON b.block_id = hr.block_id
LEFT JOIN divisions d ON d.division_id = b.division_id
  AND (hr.division_id IS NULL OR hr.division_id = '' OR d.division_id = hr.division_id)
  AND (hr.division_code IS NULL OR hr.division_code = '' OR d.code = hr.division_code)
LEFT JOIN estates e ON d.estate_id = e.estate_id
LEFT JOIN companies c ON e.company_id = c.company_id
JOIN users m ON hr.mandor_id = m.user_id
LEFT JOIN users a ON hr.approved_by_id = a.user_id;

-- Gate Check Summary View
CREATE VIEW gate_check_summary_view AS
SELECT 
    gc.gate_check_id,
    gc.pos_number,
    gc.vehicle_plate,
    gc.driver_name,
    gc.vehicle_type,
    gc.destination_location,
    gc.load_type,
    gc.load_volume,
    gc.estimated_weight,
    gc.actual_weight,
    gc.entry_time,
    gc.exit_time,
    gc.status,
    gc.passed,
    c.name as company_name,
    s.full_name as satpam_name,
    hr.panen_number as related_harvest,
    gc.validation_notes,
    gc.compliance_score,
    gc.created_at,
    gc.sync_status,
    gc.needs_sync
FROM gate_check_records gc
JOIN companies c ON gc.company_id = c.company_id
JOIN users s ON gc.created_by = s.user_id
LEFT JOIN harvest_records hr ON gc.harvest_reference_id = hr.harvest_id;

-- Sync Status Overview
CREATE VIEW sync_status_overview AS
SELECT 
    'harvest_records' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as pending_sync,
    SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed_sync,
    SUM(CASE WHEN sync_status = 'CONFLICT' THEN 1 ELSE 0 END) as conflicts
FROM harvest_records
UNION ALL
SELECT 
    'gate_check_records' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as pending_sync,
    SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed_sync,
    SUM(CASE WHEN sync_status = 'CONFLICT' THEN 1 ELSE 0 END) as conflicts
FROM gate_check_records
;

-- =============================================================================
-- END OF MOBILE DATABASE SCHEMA
-- =============================================================================
