-- Additional tables for partial update and delta sync functionality
-- This extends the existing Agrinova mobile database schema

-- Delta Changes table for tracking field-level changes
CREATE TABLE delta_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_key TEXT NOT NULL UNIQUE, -- entityType_entityId
    entity_type TEXT NOT NULL, -- harvest_records, gate_check_records, etc.
    entity_id TEXT NOT NULL, -- ID of the changed entity
    changed_fields TEXT NOT NULL, -- JSON: {fieldName: {oldValue, newValue, changedAt}}
    metadata TEXT, -- JSON: additional context data
    timestamp INTEGER NOT NULL, -- when the change was tracked
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CONFLICTED
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT, -- error message if sync failed
    scheduled_retry_at INTEGER, -- when to retry sync
    completed_at INTEGER, -- when sync was completed
    server_version INTEGER, -- server version after successful sync
    conflict_type TEXT, -- type of conflict if any
    conflicted_at INTEGER, -- when conflict was detected
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Sync Batches table for tracking batch operations
CREATE TABLE sync_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- PARTIAL_UPDATE, FULL_SYNC, etc.
    batch_size INTEGER NOT NULL,
    entities_processed INTEGER DEFAULT 0,
    entities_successful INTEGER DEFAULT 0,
    entities_failed INTEGER DEFAULT 0,
    entities_conflicted INTEGER DEFAULT 0,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    status TEXT NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Field Change History for audit trail
CREATE TABLE field_change_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT, -- JSON serialized value
    new_value TEXT, -- JSON serialized value
    changed_by TEXT, -- user ID
    change_reason TEXT, -- manual edit, approval, etc.
    device_id TEXT,
    coordinates TEXT, -- GPS coordinates when change was made
    changed_at INTEGER NOT NULL,
    synced_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Sync Performance Metrics
CREATE TABLE sync_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL, -- BATCH_SYNC, PARTIAL_UPDATE, CONFLICT_RESOLUTION
    entity_type TEXT,
    records_count INTEGER NOT NULL,
    bytes_transferred INTEGER,
    duration_ms INTEGER NOT NULL,
    network_type TEXT, -- WIFI, MOBILE, etc.
    battery_level INTEGER,
    success_rate REAL, -- percentage of successful operations
    error_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    measured_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Enhanced sync_conflicts table (extends existing one)
-- Add columns to existing sync_conflicts table
ALTER TABLE sync_conflicts ADD COLUMN conflict_fields TEXT; -- JSON array of conflicted field names
ALTER TABLE sync_conflicts ADD COLUMN field_resolutions TEXT; -- JSON object with per-field resolutions
ALTER TABLE sync_conflicts ADD COLUMN auto_resolvable INTEGER DEFAULT 0;
ALTER TABLE sync_conflicts ADD COLUMN resolution_confidence REAL DEFAULT 0; -- 0-1 confidence score
ALTER TABLE sync_conflicts ADD COLUMN client_timestamp INTEGER; -- when conflict was detected on client
ALTER TABLE sync_conflicts ADD COLUMN server_timestamp INTEGER; -- when conflict was detected on server

-- Optimistic Locking Support
-- Add version control columns to main tables if not exists
-- These should be added to existing tables: harvest_records, gate_check_records, etc.

-- For harvest_records table
ALTER TABLE harvest_records ADD COLUMN client_version INTEGER DEFAULT 1;
ALTER TABLE harvest_records ADD COLUMN last_modified_by TEXT; -- user ID
ALTER TABLE harvest_records ADD COLUMN modification_reason TEXT; -- reason for last change
ALTER TABLE harvest_records ADD COLUMN device_sync_id TEXT; -- device-specific sync identifier

-- For gate_check_records table  
ALTER TABLE gate_check_records ADD COLUMN client_version INTEGER DEFAULT 1;
ALTER TABLE gate_check_records ADD COLUMN last_modified_by TEXT;
ALTER TABLE gate_check_records ADD COLUMN modification_reason TEXT;
ALTER TABLE gate_check_records ADD COLUMN device_sync_id TEXT;

-- Bandwidth Optimization table
CREATE TABLE sync_bandwidth_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    entity_type TEXT NOT NULL,
    full_sync_bytes INTEGER DEFAULT 0,
    partial_sync_bytes INTEGER DEFAULT 0,
    bandwidth_saved INTEGER DEFAULT 0, -- bytes saved by using partial sync
    sync_operations INTEGER DEFAULT 0,
    compression_ratio REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(date, entity_type)
);

-- Indexes for performance optimization
CREATE INDEX idx_delta_changes_entity ON delta_changes (entity_type, entity_id);
CREATE INDEX idx_delta_changes_status ON delta_changes (status, timestamp);
CREATE INDEX idx_delta_changes_scheduled_retry ON delta_changes (scheduled_retry_at, status);

CREATE INDEX idx_field_change_history_entity ON field_change_history (entity_type, entity_id);
CREATE INDEX idx_field_change_history_field ON field_change_history (entity_type, field_name);
CREATE INDEX idx_field_change_history_changed_at ON field_change_history (changed_at);
CREATE INDEX idx_field_change_history_changed_by ON field_change_history (changed_by);

CREATE INDEX idx_sync_batches_entity_type ON sync_batches (entity_type, started_at);
CREATE INDEX idx_sync_batches_status ON sync_batches (status);

CREATE INDEX idx_sync_performance_metrics_type ON sync_performance_metrics (metric_type, measured_at);
CREATE INDEX idx_sync_performance_metrics_entity ON sync_performance_metrics (entity_type, measured_at);

CREATE INDEX idx_sync_conflicts_entity_fields ON sync_conflicts (table_name, record_id, status);
CREATE INDEX idx_sync_conflicts_auto_resolvable ON sync_conflicts (auto_resolvable, status);

-- Views for reporting and monitoring
CREATE VIEW partial_update_stats AS
SELECT 
    entity_type,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_changes,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_changes,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_changes,
    COUNT(CASE WHEN status = 'CONFLICTED' THEN 1 END) as conflicted_changes,
    AVG(retry_count) as avg_retry_count,
    MIN(timestamp) as oldest_change,
    MAX(timestamp) as newest_change
FROM delta_changes
GROUP BY entity_type;

CREATE VIEW sync_efficiency_report AS
SELECT 
    s.date,
    s.entity_type,
    s.sync_operations,
    s.partial_sync_bytes,
    s.full_sync_bytes,
    s.bandwidth_saved,
    ROUND(
        CASE 
            WHEN s.full_sync_bytes > 0 
            THEN (CAST(s.bandwidth_saved AS REAL) / s.full_sync_bytes) * 100 
            ELSE 0 
        END, 2
    ) as bandwidth_saved_percentage,
    s.compression_ratio
FROM sync_bandwidth_stats s
ORDER BY s.date DESC, s.entity_type;

CREATE VIEW conflict_resolution_summary AS
SELECT 
    table_name,
    conflict_type,
    COUNT(*) as total_conflicts,
    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_conflicts,
    COUNT(CASE WHEN auto_resolvable = 1 THEN 1 END) as auto_resolvable_conflicts,
    AVG(resolution_confidence) as avg_resolution_confidence,
    MIN(created_at) as oldest_conflict,
    MAX(resolved_at) as latest_resolution
FROM sync_conflicts
GROUP BY table_name, conflict_type;

-- Triggers for maintaining field change history
CREATE TRIGGER trg_harvest_field_changes
AFTER UPDATE OF status, jumlah_janjang, total_weight, total_brondolan, approval_notes ON harvest_records
FOR EACH ROW
WHEN NEW.sync_status = 'PENDING' OR OLD.sync_status = 'PENDING'
BEGIN
    -- Track status changes
    INSERT INTO field_change_history (
        entity_type, entity_id, field_name, old_value, new_value, 
        changed_by, change_reason, changed_at
    )
    SELECT 'harvest_records', NEW.harvest_id, 'status', 
           json_object('value', OLD.status), json_object('value', NEW.status),
           NEW.last_modified_by, NEW.modification_reason, NEW.updated_at
    WHERE OLD.status != NEW.status;
    
    -- Track quantity changes  
    INSERT INTO field_change_history (
        entity_type, entity_id, field_name, old_value, new_value,
        changed_by, change_reason, changed_at
    )
    SELECT 'harvest_records', NEW.harvest_id, 'total_weight',
           json_object('value', OLD.total_weight), json_object('value', NEW.total_weight),
           NEW.last_modified_by, NEW.modification_reason, NEW.updated_at
    WHERE OLD.total_weight != NEW.total_weight;
END;

CREATE TRIGGER trg_gate_check_field_changes  
AFTER UPDATE OF status, exit_time, actual_weight, validation_notes ON gate_check_records
FOR EACH ROW
WHEN NEW.sync_status = 'PENDING' OR OLD.sync_status = 'PENDING'
BEGIN
    -- Track status changes
    INSERT INTO field_change_history (
        entity_type, entity_id, field_name, old_value, new_value,
        changed_by, change_reason, changed_at  
    )
    SELECT 'gate_check_records', NEW.gate_check_id, 'status',
           json_object('value', OLD.status), json_object('value', NEW.status),
           NEW.last_modified_by, NEW.modification_reason, NEW.updated_at
    WHERE OLD.status != NEW.status;
    
    -- Track exit time changes
    INSERT INTO field_change_history (
        entity_type, entity_id, field_name, old_value, new_value,
        changed_by, change_reason, changed_at
    )
    SELECT 'gate_check_records', NEW.gate_check_id, 'exit_time',
           json_object('value', OLD.exit_time), json_object('value', NEW.exit_time),
           NEW.last_modified_by, NEW.modification_reason, NEW.updated_at  
    WHERE OLD.exit_time != NEW.exit_time;
END;

-- Cleanup procedures (would be called periodically)
-- Note: SQLite doesn't have stored procedures, so these would be implemented in Dart

-- Function to clean up old completed delta changes
-- DELETE FROM delta_changes 
-- WHERE status = 'COMPLETED' 
--   AND completed_at < strftime('%s', 'now', '-7 days') * 1000;

-- Function to clean up old field change history
-- DELETE FROM field_change_history 
-- WHERE created_at < strftime('%s', 'now', '-30 days') * 1000;

-- Function to clean up old sync performance metrics
-- DELETE FROM sync_performance_metrics 
-- WHERE created_at < strftime('%s', 'now', '-14 days') * 1000;
