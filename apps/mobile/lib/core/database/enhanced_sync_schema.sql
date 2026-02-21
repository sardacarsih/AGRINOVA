-- ============================================================================
-- AGRINOVA MOBILE ENHANCED SYNC TRANSACTION SCHEMA
-- Version: 2.0.0
-- Purpose: Offline-first sync with comprehensive transaction management
-- Features: Cross-device QR, conflict resolution, batch operations, audit trails
-- ============================================================================

-- Enhanced Sync Transaction Queue
-- Replaces and extends existing sync_queue table
CREATE TABLE IF NOT EXISTS sync_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,           -- Client-generated UUID
    operation_id TEXT UNIQUE NOT NULL,             -- Legacy compatibility
    
    -- Transaction Metadata
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'SINGLE_RECORD', 'BATCH_OPERATION', 'BULK_SYNC', 
        'CROSS_DEVICE_OPERATION', 'PARTIAL_UPDATE'
    )),
    operation_type TEXT NOT NULL CHECK (operation_type IN (
        'CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE'
    )),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
    
    -- Record Information
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,                       -- Local record ID
    server_record_id TEXT,                         -- Server record ID (after sync)
    record_ids TEXT,                               -- JSON array for batch operations
    
    -- Transaction Data
    data TEXT NOT NULL,                            -- JSON serialized data
    original_data TEXT,                            -- Original data for conflict resolution
    merged_data TEXT,                              -- Merged data from conflict resolution
    
    -- Dependencies & Relationships
    dependencies TEXT,                             -- JSON array of dependent transaction IDs
    parent_transaction_id TEXT,                    -- For batch operations
    child_transaction_ids TEXT,                    -- JSON array of child transactions
    
    -- Sync State Management
    status TEXT DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'PROCESSING', 'PARTIAL_SUCCESS', 'COMPLETED', 
        'FAILED', 'CANCELLED', 'CONFLICT', 'RETRY_SCHEDULED', 'EXPIRED'
    )),
    sync_attempt INTEGER DEFAULT 0,
    max_retry_count INTEGER DEFAULT 5,
    retry_backoff_ms INTEGER DEFAULT 1000,        -- Exponential backoff base
    
    -- Cross-Device Support (Intent-Based QR System)
    origin_device_id TEXT,                         -- Device that initiated transaction
    target_device_id TEXT,                         -- Target device (for cross-device ops)
    cross_device_operation INTEGER DEFAULT 0,     -- Boolean flag
    device_context TEXT,                           -- JSON device-specific context
    qr_intent_type TEXT CHECK (qr_intent_type IN ('ENTRY', 'EXIT', NULL)),
    qr_token_data TEXT,                            -- JWT token data for QR operations
    
    -- Conflict Resolution
    conflict_resolution_strategy TEXT CHECK (conflict_resolution_strategy IN (
        'CLIENT_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL', 'AUTO_RESOLVE'
    )),
    conflict_data TEXT,                            -- JSON conflict information
    auto_resolve_attempted INTEGER DEFAULT 0,     -- Boolean flag
    manual_resolution_required INTEGER DEFAULT 0, -- Boolean flag
    
    -- Performance & Quality Metrics
    estimated_processing_time INTEGER,             -- Milliseconds
    actual_processing_time INTEGER,                -- Milliseconds
    data_size_bytes INTEGER,
    compression_ratio REAL,                        -- Data compression efficiency
    network_quality TEXT CHECK (network_quality IN ('EXCELLENT', 'GOOD', 'POOR', 'OFFLINE')),
    
    -- Error Information
    last_error TEXT,
    error_details TEXT,                            -- Detailed error information
    error_count INTEGER DEFAULT 0,
    critical_error INTEGER DEFAULT 0,             -- Boolean flag
    
    -- User & Device Context
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    company_id TEXT,
    session_id TEXT,                               -- Sync session association
    
    -- Timestamps (Unix timestamp in milliseconds for SQLite compatibility)
    client_timestamp INTEGER NOT NULL,            -- When transaction was created
    scheduled_at INTEGER,                          -- When to retry/process
    processing_started_at INTEGER,                 -- When processing started
    processing_completed_at INTEGER,               -- When processing completed
    last_sync_attempt_at INTEGER,                  -- Last sync attempt
    expires_at INTEGER,                            -- Transaction expiry
    
    -- Standard Audit Fields
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
        'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'
    )),
    version INTEGER DEFAULT 1,
    
    -- Foreign Key Constraint (if users table exists)
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_transaction_id) REFERENCES sync_transactions (transaction_id) ON DELETE SET NULL
);

-- Enhanced Sync Conflicts with Field-Level Resolution
-- Replaces and extends existing sync_conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conflict_id TEXT UNIQUE NOT NULL,              -- Client-generated UUID
    transaction_id TEXT NOT NULL,                  -- Associated transaction
    
    -- Conflict Classification
    conflict_type TEXT NOT NULL CHECK (conflict_type IN (
        'VERSION_MISMATCH', 'DATA_CONFLICT', 'DELETE_CONFLICT',
        'CONSTRAINT_VIOLATION', 'CROSS_DEVICE_CONFLICT', 'SCHEMA_MISMATCH',
        'QR_TOKEN_CONFLICT', 'INTENT_MISMATCH'
    )),
    severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Record Information
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,                       -- Local record ID
    server_record_id TEXT,                         -- Server record ID
    
    -- Conflict Data
    local_data TEXT NOT NULL,                      -- JSON local data
    server_data TEXT NOT NULL,                     -- JSON server data
    base_data TEXT,                                -- Common ancestor data (3-way merge)
    
    -- Field-Level Conflict Resolution
    conflicting_fields TEXT,                       -- JSON array of field names
    field_resolutions TEXT,                        -- JSON object with per-field strategies
    auto_resolvable INTEGER DEFAULT 0,             -- Boolean flag
    resolution_confidence REAL DEFAULT 0.0,       -- 0.0-1.0 confidence score
    
    -- Resolution Information
    resolution_strategy TEXT CHECK (resolution_strategy IN (
        'CLIENT_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL', 'FIELD_LEVEL_MERGE'
    )),
    resolution_data TEXT,                          -- JSON final resolved data
    resolution_applied INTEGER DEFAULT 0,         -- Boolean flag
    resolution_notes TEXT,
    
    -- Cross-Device Conflict Context
    origin_device_id TEXT,                         -- Device that created original data
    conflict_device_id TEXT,                       -- Device that detected conflict
    cross_device_context TEXT,                     -- JSON cross-device information
    
    -- User & Resolution Context
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    resolved_by TEXT,                              -- User ID who resolved
    resolution_source TEXT CHECK (resolution_source IN ('AUTO', 'MANUAL', 'SYSTEM')),
    
    -- Timestamps
    detected_at INTEGER NOT NULL,
    resolved_at INTEGER,
    client_timestamp INTEGER,
    server_timestamp INTEGER,
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'AUTO_RESOLVED', 'MANUALLY_RESOLVED', 'ESCALATED', 'IGNORED', 'EXPIRED'
    )),
    
    -- Standard Audit Fields
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
        'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
    )),
    version INTEGER DEFAULT 1,
    
    -- Foreign Keys
    FOREIGN KEY (transaction_id) REFERENCES sync_transactions (transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Sync Session Management
CREATE TABLE IF NOT EXISTS sync_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,               -- Client-generated UUID
    
    -- Session Context
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT,
    session_type TEXT NOT NULL CHECK (session_type IN (
        'FULL_SYNC', 'INCREMENTAL_SYNC', 'PUSH_ONLY', 'PULL_ONLY', 
        'SELECTIVE_SYNC', 'CROSS_DEVICE_SYNC'
    )),
    
    -- Session Configuration
    tables_to_sync TEXT,                           -- JSON array of table names
    sync_direction TEXT DEFAULT 'BIDIRECTIONAL' CHECK (sync_direction IN (
        'PUSH', 'PULL', 'BIDIRECTIONAL'
    )),
    batch_size INTEGER DEFAULT 100,
    max_concurrent_operations INTEGER DEFAULT 5,
    conflict_resolution_mode TEXT DEFAULT 'AUTO' CHECK (conflict_resolution_mode IN (
        'AUTO', 'MANUAL', 'CLIENT_WINS', 'SERVER_WINS'
    )),
    
    -- Cross-Device Session Support
    multi_device_session INTEGER DEFAULT 0,       -- Boolean flag
    participating_devices TEXT,                    -- JSON array of device IDs
    session_coordinator_device TEXT,               -- Master device for coordination
    
    -- Session State
    status TEXT DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 
        'FAILED', 'CANCELLED', 'PARTIAL_SUCCESS'
    )),
    progress_percentage REAL DEFAULT 0.0,
    current_table TEXT,
    current_operation TEXT,
    
    -- Statistics
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    auto_resolved_conflicts INTEGER DEFAULT 0,
    manual_resolution_required INTEGER DEFAULT 0,
    
    -- Performance Metrics
    data_uploaded_bytes INTEGER DEFAULT 0,
    data_downloaded_bytes INTEGER DEFAULT 0,
    compression_savings_bytes INTEGER DEFAULT 0,
    network_type TEXT,                             -- 'WIFI', 'MOBILE', 'UNKNOWN'
    average_response_time INTEGER,                 -- Milliseconds
    peak_memory_usage INTEGER,                     -- Bytes
    battery_usage_percentage REAL,                 -- Estimated battery usage
    
    -- Timestamps
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    last_activity_at INTEGER NOT NULL,
    next_sync_scheduled_at INTEGER,                -- For incremental sync
    
    -- Error Information
    error_message TEXT,
    error_details TEXT,                            -- JSON error information
    
    -- Standard Audit Fields
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    version INTEGER DEFAULT 1
);

-- Enhanced Sync Dependencies with Topological Sorting Support
CREATE TABLE IF NOT EXISTS sync_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dependency_id TEXT UNIQUE NOT NULL,            -- Client-generated UUID
    parent_transaction_id TEXT NOT NULL,
    dependent_transaction_id TEXT NOT NULL,
    
    -- Dependency Metadata
    dependency_type TEXT NOT NULL CHECK (dependency_type IN (
        'HARD_DEPENDENCY', 'SOFT_DEPENDENCY', 'ORDERING_DEPENDENCY', 
        'REFERENTIAL_INTEGRITY', 'CROSS_DEVICE_DEPENDENCY'
    )),
    dependency_reason TEXT,
    is_blocking INTEGER DEFAULT 1,                 -- Boolean flag
    dependency_weight INTEGER DEFAULT 1,           -- For weighted dependency resolution
    
    -- Cross-Device Dependencies (for QR operations)
    cross_device_dependency INTEGER DEFAULT 0,     -- Boolean flag
    origin_device_context TEXT,                    -- JSON device context
    
    -- Status & Resolution
    status TEXT DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'SATISFIED', 'FAILED', 'TIMEOUT', 'IGNORED'
    )),
    resolution_attempts INTEGER DEFAULT 0,
    max_resolution_attempts INTEGER DEFAULT 5,
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    resolved_at INTEGER,
    timeout_at INTEGER,                            -- When dependency times out
    
    -- Foreign Keys
    FOREIGN KEY (parent_transaction_id) REFERENCES sync_transactions (transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (dependent_transaction_id) REFERENCES sync_transactions (transaction_id) ON DELETE CASCADE,
    
    -- Prevent circular dependencies
    CHECK (parent_transaction_id != dependent_transaction_id)
);

-- Sync Performance Metrics & Analytics
CREATE TABLE IF NOT EXISTS sync_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id TEXT UNIQUE NOT NULL,                -- Client-generated UUID
    
    -- Context
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT,
    session_id TEXT,                               -- Associated sync session
    transaction_id TEXT,                           -- Associated transaction
    
    -- Metric Classification
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'SYNC_DURATION', 'CONFLICT_RESOLUTION_TIME', 'NETWORK_LATENCY',
        'BATCH_PROCESSING_TIME', 'QUEUE_PROCESSING_TIME', 'DATABASE_OPERATION_TIME',
        'COMPRESSION_RATIO', 'ERROR_RATE', 'SUCCESS_RATE', 'RETRY_COUNT'
    )),
    metric_category TEXT CHECK (metric_category IN (
        'PERFORMANCE', 'RELIABILITY', 'EFFICIENCY', 'ERROR_TRACKING'
    )),
    
    -- Metric Data
    metric_value REAL NOT NULL,                    -- Numeric value
    metric_unit TEXT DEFAULT 'ms',                 -- 'ms', 'percentage', 'bytes', 'count'
    baseline_value REAL,                           -- Baseline for comparison
    threshold_warning REAL,                        -- Warning threshold
    threshold_critical REAL,                       -- Critical threshold
    
    -- Context Information
    table_name TEXT,
    operation_type TEXT,
    record_count INTEGER,
    data_size_bytes INTEGER,
    
    -- Device & Network Context
    network_type TEXT,
    connection_quality TEXT,
    device_performance_class TEXT,                 -- 'HIGH', 'MEDIUM', 'LOW'
    battery_level INTEGER,
    available_memory_mb INTEGER,
    storage_available_mb INTEGER,
    
    -- Timestamps
    measured_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    
    -- Standard Fields
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
        'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
    )),
    version INTEGER DEFAULT 1
);

-- Sync Event Log for Audit & Debugging
CREATE TABLE IF NOT EXISTS sync_event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,                 -- Client-generated UUID
    
    -- Event Classification
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
    
    -- Event Data
    message TEXT NOT NULL,
    description TEXT,
    event_data TEXT,                               -- JSON event-specific data
    
    -- Context
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT,
    session_id TEXT,
    transaction_id TEXT,
    conflict_id TEXT,
    
    -- Related Records
    table_name TEXT,
    record_id TEXT,
    operation_type TEXT,
    
    -- Performance Data
    duration_ms INTEGER,
    memory_usage_bytes INTEGER,
    network_bytes INTEGER,
    
    -- Timestamps
    event_timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    
    -- Standard Fields
    sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN (
        'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
    )),
    version INTEGER DEFAULT 1
);

-- ============================================================================
-- PERFORMANCE INDEXES FOR MOBILE SQLITE
-- ============================================================================

-- Sync Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_sync_transactions_status ON sync_transactions (status);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_priority ON sync_transactions (priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_user_device ON sync_transactions (user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_table_name ON sync_transactions (table_name);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_sync_status ON sync_transactions (sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_retry_schedule ON sync_transactions (scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_cross_device ON sync_transactions (cross_device_operation, origin_device_id);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_parent ON sync_transactions (parent_transaction_id);

-- Processing queue optimization
CREATE INDEX IF NOT EXISTS idx_sync_transactions_processing_queue ON sync_transactions (
    status, priority DESC, created_at ASC
) WHERE status IN ('PENDING', 'RETRY_SCHEDULED');

-- Sync Conflicts Indexes
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_transaction ON sync_conflicts_enhanced (transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts_enhanced (status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table_record ON sync_conflicts_enhanced (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_auto_resolvable ON sync_conflicts_enhanced (auto_resolvable, resolution_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_severity ON sync_conflicts_enhanced (severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_device ON sync_conflicts_enhanced (user_id, device_id);

-- Sync Sessions Indexes  
CREATE INDEX IF NOT EXISTS idx_sync_sessions_device_user ON sync_sessions (device_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_status ON sync_sessions (status);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_active ON sync_sessions (status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_type ON sync_sessions (session_type);

-- Sync Dependencies Indexes
CREATE INDEX IF NOT EXISTS idx_sync_dependencies_parent ON sync_dependencies (parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_dependencies_dependent ON sync_dependencies (dependent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_dependencies_blocking ON sync_dependencies (is_blocking, status);
CREATE INDEX IF NOT EXISTS idx_sync_dependencies_cross_device ON sync_dependencies (cross_device_dependency);

-- Sync Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_sync_metrics_device_user ON sync_performance_metrics (device_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_type ON sync_performance_metrics (metric_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_session ON sync_performance_metrics (session_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_transaction ON sync_performance_metrics (transaction_id);

-- Sync Event Log Indexes
CREATE INDEX IF NOT EXISTS idx_sync_event_log_type ON sync_event_log (event_type, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_device_user ON sync_event_log (device_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_session ON sync_event_log (session_id);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_transaction ON sync_event_log (transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_severity ON sync_event_log (severity, event_timestamp DESC);

-- ============================================================================
-- LEGACY COMPATIBILITY VIEWS
-- For existing code that uses old sync_queue and sync_conflicts tables
-- ============================================================================

-- Compatibility view for sync_queue
CREATE VIEW IF NOT EXISTS sync_queue AS
SELECT 
    id,
    operation_id,
    operation_type,
    table_name,
    record_id,
    server_record_id,
    data,
    dependencies,
    priority,
    sync_attempt as retry_count,
    max_retry_count as max_retries,
    last_error,
    error_details,
    created_at,
    scheduled_at,
    processing_started_at as started_at,
    processing_completed_at as completed_at,
    user_id,
    device_id,
    CASE 
        WHEN status = 'RETRY_SCHEDULED' THEN 'PENDING'
        ELSE status 
    END as status
FROM sync_transactions;

-- Compatibility view for sync_conflicts
CREATE VIEW IF NOT EXISTS sync_conflicts AS
SELECT 
    id,
    conflict_id,
    table_name,
    record_id,
    server_record_id,
    local_data,
    server_data,
    conflict_type,
    conflicting_fields,
    resolution_strategy,
    resolution_data,
    resolved_by,
    resolved_at,
    auto_resolvable,
    user_id,
    device_id,
    created_at,
    status
FROM sync_conflicts_enhanced;

-- ============================================================================
-- DATA MIGRATION HELPERS
-- ============================================================================

-- Function to migrate existing sync_queue data (if old table exists)
-- Note: SQLite doesn't support stored procedures, so this would be application code

-- Example migration for sync_queue data:
/*
INSERT OR IGNORE INTO sync_transactions (
    operation_id, transaction_id, transaction_type, operation_type,
    table_name, record_id, server_record_id, data, dependencies,
    priority, sync_attempt, max_retry_count, last_error, error_details,
    user_id, device_id, status, client_timestamp, created_at, updated_at
)
SELECT 
    operation_id,
    COALESCE(operation_id, hex(randomblob(16))) as transaction_id,
    'SINGLE_RECORD' as transaction_type,
    operation_type,
    table_name,
    record_id,
    server_record_id,
    data,
    dependencies,
    priority,
    retry_count as sync_attempt,
    max_retries as max_retry_count,
    last_error,
    error_details,
    user_id,
    device_id,
    status,
    created_at as client_timestamp,
    created_at,
    COALESCE(started_at, created_at) as updated_at
FROM old_sync_queue;
*/

-- ============================================================================
-- SQLITE-SPECIFIC OPTIMIZATIONS
-- ============================================================================

-- Enable Write-Ahead Logging for better concurrent performance
-- PRAGMA journal_mode = WAL;

-- Enable foreign key constraints
-- PRAGMA foreign_keys = ON;

-- Optimize SQLite for mobile performance
-- PRAGMA cache_size = -64000;  -- 64MB cache
-- PRAGMA synchronous = NORMAL; -- Balance between safety and speed
-- PRAGMA temp_store = MEMORY;  -- Keep temp tables in memory
-- PRAGMA mmap_size = 134217728; -- 128MB memory map

-- Auto-vacuum for storage management
-- PRAGMA auto_vacuum = INCREMENTAL;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Clean up completed transactions (older than 7 days)
/*
DELETE FROM sync_transactions 
WHERE status IN ('COMPLETED', 'CANCELLED') 
  AND processing_completed_at < (strftime('%s', 'now') - 604800) * 1000;
*/

-- Clean up resolved conflicts (older than 14 days)  
/*
DELETE FROM sync_conflicts_enhanced 
WHERE status IN ('AUTO_RESOLVED', 'MANUALLY_RESOLVED') 
  AND resolved_at < (strftime('%s', 'now') - 1209600) * 1000;
*/

-- Clean up old event logs (older than 30 days)
/*
DELETE FROM sync_event_log 
WHERE event_timestamp < (strftime('%s', 'now') - 2592000) * 1000;
*/

-- Vacuum database to reclaim space
/*
PRAGMA incremental_vacuum;
*/

-- ============================================================================
-- END ENHANCED SYNC SCHEMA
-- ============================================================================