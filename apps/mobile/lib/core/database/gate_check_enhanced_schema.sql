-- ====================================================================
-- AGRINOVA FLUTTER MOBILE - ENHANCED GATE CHECK SQLITE SCHEMA
-- ====================================================================
-- 
-- Comprehensive SQLite schema for offline-first gate check operations
-- Supporting: Intent-based QR system, Cross-device compatibility,
-- Photo documentation, Priority sync queues, and Conflict resolution
--
-- Key Features:
-- - Intent-based QR workflow (ENTRY/EXIT generation → opposite scan)
-- - Cross-device QR compatibility (no device binding restrictions)
-- - Single-use QR security with local validation
-- - Comprehensive photo documentation with deferred upload
-- - Priority-based sync queue management
-- - Robust conflict detection and resolution
-- - Performance-optimized indexing
-- - Data integrity with CHECK constraints
-- ====================================================================

-- ====================================================================
-- GUEST MANAGEMENT & INTENT-BASED QR SYSTEM
-- ====================================================================

-- Enhanced Guest Logs with Intent-Based QR Support
CREATE TABLE gate_guest_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id TEXT UNIQUE NOT NULL,
  driver_name TEXT NOT NULL,
  guest_purpose TEXT NOT NULL,
  vehicle_plate TEXT,
  destination TEXT, -- Estate/Division destination
  username TEXT, -- User who created the record
  
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
  qr_code_data TEXT, -- Generated QR content
  
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
  conflict_data TEXT, -- JSON data for conflicts
  needs_manual_resolution INTEGER DEFAULT 0,
  
  FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
);

-- QR Token Management for Cross-Device Operations
CREATE TABLE guest_qr_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_log_id INTEGER NOT NULL,
  jti TEXT UNIQUE NOT NULL, -- JWT Token ID
  
  -- Intent-Based System
  generation_intent TEXT NOT NULL CHECK (generation_intent IN ('ENTRY', 'EXIT')),
  allowed_scan TEXT NOT NULL CHECK (allowed_scan IN ('ENTRY', 'EXIT')),
  
  -- Cross-Device Support (No device binding for flexibility)
  generated_device TEXT, -- Device that generated QR
  scanned_device TEXT,   -- Device that scanned QR
  
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
  token_hash TEXT, -- For validation
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location_coordinates TEXT,
  
  -- Usage Tracking (JSON array)
  usage_history TEXT DEFAULT '[]',
  validation_method TEXT DEFAULT 'QR_SCAN' CHECK (validation_method IN ('QR_SCAN', 'MANUAL_ENTRY', 'BIOMETRIC', 'RFID', 'NFC')),
  
  -- Sync Management
  sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
  sync_priority TEXT DEFAULT 'HIGH' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  synced_at INTEGER,
  
  FOREIGN KEY (guest_log_id) REFERENCES gate_guest_logs (id) ON DELETE CASCADE
);

-- ====================================================================
-- ENHANCED GATE CHECK RECORDS
-- ====================================================================

-- Enhanced Gate Check Records with Advanced Features
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
  username TEXT, -- User who created the record
  
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
  conflict_data TEXT, -- JSON data for conflicts
  needs_manual_resolution INTEGER DEFAULT 0,
  
  FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE
);

-- ====================================================================
-- COMPREHENSIVE PHOTO DOCUMENTATION SYSTEM
-- ====================================================================

-- Enhanced Photo Management with Advanced Features
CREATE TABLE gate_check_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT UNIQUE NOT NULL,
  
  -- Photo Relationship (Polymorphic)
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
  camera_used TEXT, -- 'FRONT' or 'BACK'
  
  -- Metadata (JSON string)
  metadata TEXT, -- EXIF and other metadata
  description TEXT,
  tags TEXT, -- JSON array of tags
  
  -- User & Device Information
  created_by TEXT NOT NULL,
  device_id TEXT,
  device_model TEXT,
  device_fingerprint TEXT,
  
  -- Advanced Sync Management (Photos have special handling)
  sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
  sync_priority TEXT DEFAULT 'MEDIUM' CHECK (sync_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  upload_progress REAL DEFAULT 0.0,
  upload_retry_count INTEGER DEFAULT 0,
  last_upload_error TEXT,
  
  -- Storage Information
  local_path TEXT, -- Local mobile path
  cloud_path TEXT, -- Server storage path (after sync)
  thumbnail_path TEXT,
  is_compressed INTEGER DEFAULT 0,
  compression_ratio REAL,
  
  -- Deferred Upload Support
  upload_scheduled_at INTEGER, -- When to upload
  upload_attempts INTEGER DEFAULT 0,
  max_upload_attempts INTEGER DEFAULT 5,
  next_upload_attempt INTEGER, -- Next attempt time
  upload_batch_id TEXT, -- Group photos for batch upload
  
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
);

-- ====================================================================
-- ADVANCED SYNC QUEUE SYSTEM
-- ====================================================================

-- Enhanced Sync Queue with Priority and Batch Support
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  
  -- Sync Context
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  session_id TEXT,
  
  -- Operation Details
  operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE')),
  table_name TEXT NOT NULL,
  record_ids TEXT NOT NULL, -- JSON array for multiple records
  
  -- Priority & Scheduling
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEFERRED')),
  scheduled_at INTEGER, -- For deferred sync
  
  -- Data Payload (JSON string, potentially compressed)
  data_payload TEXT, -- Actual data to sync
  payload_size INTEGER,
  payload_hash TEXT, -- Integrity check
  is_compressed INTEGER DEFAULT 0,
  is_encrypted INTEGER DEFAULT 0,
  
  -- Batch Processing Support
  batch_id TEXT, -- Group related operations
  batch_size INTEGER DEFAULT 1,
  batch_position INTEGER DEFAULT 1,
  depends_on_transaction TEXT, -- Transaction ID dependency
  
  -- Execution Tracking
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at INTEGER,
  next_attempt_at INTEGER,
  backoff_multiplier REAL DEFAULT 2.0,
  
  -- Result & Error Tracking
  result_status TEXT CHECK (result_status IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CONFLICT_DETECTED', 'VALIDATION_ERROR', 'NETWORK_ERROR', 'SERVER_ERROR')),
  result_message TEXT,
  error_code TEXT,
  error_details TEXT, -- JSON error information
  conflict_data TEXT, -- JSON conflict information
  
  -- Network & Performance Metrics
  network_type TEXT, -- 'WIFI', '4G', '5G', 'OFFLINE'
  connection_quality TEXT CHECK (connection_quality IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
  sync_duration INTEGER, -- milliseconds
  data_bytes_transferred INTEGER,
  
  -- Smart Retry Logic
  retry_strategy TEXT DEFAULT 'EXPONENTIAL_BACKOFF' CHECK (retry_strategy IN ('EXPONENTIAL_BACKOFF', 'FIXED_INTERVAL', 'IMMEDIATE', 'MANUAL')),
  retry_delay_base INTEGER DEFAULT 1000, -- base delay in ms
  retry_delay_cap INTEGER DEFAULT 300000, -- max delay in ms (5 minutes)
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ====================================================================
-- CONFLICT DETECTION & RESOLUTION SYSTEM
-- ====================================================================

-- Enhanced Sync Conflicts with Advanced Resolution
CREATE TABLE sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conflict_id TEXT UNIQUE NOT NULL,
  
  -- Conflict Context
  transaction_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  
  -- Conflict Details
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('DATA_MISMATCH', 'TIMING_CONFLICT', 'STATE_CONFLICT', 'PERMISSION_CONFLICT', 'DUPLICATE_RECORD', 'FOREIGN_KEY_ERROR')),
  conflict_severity TEXT DEFAULT 'MEDIUM' CHECK (conflict_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  
  -- Conflicting Data (JSON strings)
  local_data TEXT NOT NULL, -- Local version of data
  server_data TEXT NOT NULL, -- Server version of data
  proposed_resolution TEXT, -- Auto-generated resolution
  
  -- Resolution Strategy
  resolution_strategy TEXT CHECK (resolution_strategy IN ('PREFER_LOCAL', 'PREFER_SERVER', 'MERGE_DATA', 'MANUAL_RESOLVE', 'CUSTOM_LOGIC')),
  auto_resolvable INTEGER DEFAULT 0,
  requires_manual_review INTEGER DEFAULT 1,
  
  -- Status & Resolution
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'RESOLVED', 'ESCALATED', 'IGNORED')),
  resolved_by TEXT,
  resolved_at INTEGER,
  resolution_notes TEXT,
  final_data TEXT, -- Final resolved data (JSON)
  
  -- Automatic Resolution Attempts
  auto_resolution_attempted INTEGER DEFAULT 0,
  auto_resolution_success INTEGER DEFAULT 0,
  auto_resolution_reason TEXT,
  
  -- User Notification
  user_notified INTEGER DEFAULT 0,
  notification_sent_at INTEGER,
  user_acknowledged INTEGER DEFAULT 0,
  user_acknowledged_at INTEGER,
  
  -- Timestamps
  detected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES sync_queue (transaction_id) ON DELETE CASCADE
);

-- ====================================================================
-- COMPREHENSIVE SYNC LOGGING SYSTEM
-- ====================================================================

-- Detailed Sync Operation Logging
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Log Context
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  session_id TEXT,
  transaction_id TEXT,
  
  -- Operation Details
  log_type TEXT NOT NULL CHECK (log_type IN ('TRANSACTION_START', 'TRANSACTION_END', 'DATA_UPLOAD', 'DATA_DOWNLOAD', 'CONFLICT_DETECTED', 'CONFLICT_RESOLVED', 'ERROR_OCCURRED', 'PERFORMANCE_METRIC', 'NETWORK_STATUS', 'DEVICE_STATUS')),
  operation TEXT NOT NULL, -- Detailed operation name
  table_name TEXT NOT NULL,
  record_id TEXT,
  
  -- Status & Results
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'CANCELLED', 'WARNING')),
  message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  
  -- Performance Metrics
  duration INTEGER, -- milliseconds
  data_size INTEGER, -- bytes
  network_latency INTEGER, -- milliseconds
  memory_usage INTEGER, -- bytes
  cpu_usage REAL, -- percentage
  
  -- Context Data (JSON strings)
  metadata TEXT,
  before_data TEXT,
  after_data TEXT,
  environment_info TEXT, -- Device/network info
  
  -- Filtering & Categorization
  log_level TEXT DEFAULT 'INFO' CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
  component TEXT NOT NULL, -- Which component logged this
  category TEXT, -- Additional categorization
  tags TEXT, -- JSON array of tags for filtering
  
  -- Timestamps
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  
  -- Log Retention Management
  retention_days INTEGER DEFAULT 30,
  archived INTEGER DEFAULT 0,
  archived_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ====================================================================
-- REAL-TIME GATE STATUS & STATISTICS
-- ====================================================================

-- Local Gate Status Caching
CREATE TABLE gate_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gate_position TEXT UNIQUE NOT NULL,
  
  -- Current Status
  is_active INTEGER DEFAULT 1,
  current_status TEXT DEFAULT 'OPERATIONAL' CHECK (current_status IN ('OPERATIONAL', 'MAINTENANCE', 'LIMITED_SERVICE', 'OFFLINE', 'EMERGENCY')),
  last_activity INTEGER,
  
  -- Vehicle Tracking
  vehicles_inside INTEGER DEFAULT 0,
  today_entries INTEGER DEFAULT 0,
  today_exits INTEGER DEFAULT 0,
  peak_hour_entries INTEGER DEFAULT 0,
  
  -- Staff & Security
  current_staff TEXT DEFAULT '[]', -- JSON array of user IDs
  emergency_contacts TEXT DEFAULT '[]', -- JSON array
  security_level TEXT DEFAULT 'NORMAL' CHECK (security_level IN ('NORMAL', 'ELEVATED', 'HIGH', 'MAXIMUM', 'LOCKDOWN')),
  
  -- Environmental Conditions
  weather_conditions TEXT,
  visibility TEXT CHECK (visibility IN ('EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'SEVERELY_LIMITED')),
  road_conditions TEXT CHECK (road_conditions IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'HAZARDOUS')),
  
  -- Equipment Status (JSON)
  equipment_status TEXT DEFAULT '{}',
  maintenance_notes TEXT,
  last_maintenance_at INTEGER,
  
  -- Sync Management
  last_sync_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  sync_frequency INTEGER DEFAULT 30, -- seconds
  sync_status TEXT DEFAULT 'SYNCED' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- ====================================================================
-- NETWORK & DEVICE STATUS TRACKING
-- ====================================================================

-- Network Status History for Sync Optimization
CREATE TABLE network_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  
  -- Network Information
  connection_type TEXT NOT NULL CHECK (connection_type IN ('WIFI', '4G', '5G', '3G', '2G', 'ETHERNET', 'OFFLINE')),
  network_name TEXT, -- WiFi SSID or cellular provider
  signal_strength INTEGER, -- 0-100 percentage
  bandwidth_estimate INTEGER, -- Kbps
  latency INTEGER, -- milliseconds
  
  -- Connection Quality Metrics
  quality_score REAL, -- 0-1 calculated quality score
  is_metered INTEGER DEFAULT 0, -- Is connection metered
  is_stable INTEGER DEFAULT 1, -- Connection stability
  packet_loss REAL DEFAULT 0, -- Packet loss percentage
  
  -- Usage Statistics
  bytes_sent INTEGER DEFAULT 0,
  bytes_received INTEGER DEFAULT 0,
  sync_operations_count INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  
  -- Optimal Sync Conditions
  is_optimal_for_sync INTEGER DEFAULT 0,
  is_optimal_for_photos INTEGER DEFAULT 0,
  recommended_batch_size INTEGER DEFAULT 10,
  recommended_retry_delay INTEGER DEFAULT 5000,
  
  -- Timestamps
  measured_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Device Performance Metrics
CREATE TABLE device_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  
  -- Device Performance
  cpu_usage REAL, -- percentage
  memory_usage INTEGER, -- bytes
  storage_available INTEGER, -- bytes
  battery_level INTEGER, -- percentage
  is_charging INTEGER DEFAULT 0,
  
  -- App Performance
  app_memory_usage INTEGER, -- bytes
  database_size INTEGER, -- bytes
  photos_storage_size INTEGER, -- bytes
  cache_size INTEGER, -- bytes
  
  -- Performance Scores
  sync_performance_score REAL, -- 0-1 calculated score
  photo_processing_score REAL, -- 0-1 calculated score
  database_performance_score REAL, -- 0-1 calculated score
  
  -- Optimization Recommendations
  should_cleanup_cache INTEGER DEFAULT 0,
  should_compress_photos INTEGER DEFAULT 0,
  should_defer_sync INTEGER DEFAULT 0,
  recommended_sync_batch_size INTEGER DEFAULT 10,
  
  -- Timestamps
  measured_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- ====================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ====================================================================

-- Guest Logs Indexes
CREATE INDEX idx_gate_guest_logs_guest_id ON gate_guest_logs (guest_id);
CREATE INDEX idx_gate_guest_logs_status ON gate_guest_logs (status);
CREATE INDEX idx_gate_guest_logs_generation_intent ON gate_guest_logs (generation_intent);
CREATE INDEX idx_gate_guest_logs_sync_status ON gate_guest_logs (sync_status);
CREATE INDEX idx_gate_guest_logs_sync_priority ON gate_guest_logs (sync_priority);
CREATE INDEX idx_gate_guest_logs_sync_queue ON gate_guest_logs (sync_status, sync_priority, created_at);
CREATE INDEX idx_gate_guest_logs_driver_name ON gate_guest_logs (driver_name);
CREATE INDEX idx_gate_guest_logs_vehicle_plate ON gate_guest_logs (vehicle_plate);
CREATE INDEX idx_gate_guest_logs_destination ON gate_guest_logs (destination);
CREATE INDEX idx_gate_guest_logs_entry_time ON gate_guest_logs (entry_time);
CREATE INDEX idx_gate_guest_logs_created_by ON gate_guest_logs (created_by);
CREATE INDEX idx_gate_guest_logs_device_id ON gate_guest_logs (device_id);
CREATE INDEX idx_gate_guest_logs_conflict_resolution ON gate_guest_logs (needs_manual_resolution, conflict_data);

-- QR Tokens Indexes
CREATE INDEX idx_guest_qr_tokens_jti ON guest_qr_tokens (jti);
CREATE INDEX idx_guest_qr_tokens_guest_log_id ON guest_qr_tokens (guest_log_id);
CREATE INDEX idx_guest_qr_tokens_status ON guest_qr_tokens (status);
CREATE INDEX idx_guest_qr_tokens_intent ON guest_qr_tokens (generation_intent, allowed_scan);
CREATE INDEX idx_guest_qr_tokens_expires_at ON guest_qr_tokens (expires_at);
CREATE INDEX idx_guest_qr_tokens_generated_device ON guest_qr_tokens (generated_device);
CREATE INDEX idx_guest_qr_tokens_scanned_device ON guest_qr_tokens (scanned_device);
CREATE INDEX idx_guest_qr_tokens_sync_status ON guest_qr_tokens (sync_status, sync_priority);
CREATE INDEX idx_guest_qr_tokens_usage ON guest_qr_tokens (current_usage, max_usage, status);

-- Gate Check Records Indexes
CREATE INDEX idx_gate_check_records_gate_check_id ON gate_check_records (gate_check_id);
CREATE INDEX idx_gate_check_records_vehicle_plate ON gate_check_records (vehicle_plate);
CREATE INDEX idx_gate_check_records_status ON gate_check_records (status);
CREATE INDEX idx_gate_check_records_entry_time ON gate_check_records (entry_time);
CREATE INDEX idx_gate_check_records_sync_status ON gate_check_records (sync_status);
CREATE INDEX idx_gate_check_records_sync_queue ON gate_check_records (sync_status, sync_priority, created_at);
CREATE INDEX idx_gate_check_records_created_by ON gate_check_records (created_by);
CREATE INDEX idx_gate_check_records_device_id ON gate_check_records (device_id);
CREATE INDEX idx_gate_check_records_emergency ON gate_check_records (emergency_flag);
CREATE INDEX idx_gate_check_records_linked_guest ON gate_check_records (linked_guest_log_id);
CREATE INDEX idx_gate_check_records_conflict_resolution ON gate_check_records (needs_manual_resolution, conflict_data);

-- Photos Indexes
CREATE INDEX idx_gate_check_photos_photo_id ON gate_check_photos (photo_id);
CREATE INDEX idx_gate_check_photos_related_record ON gate_check_photos (related_record_type, related_record_id);
CREATE INDEX idx_gate_check_photos_photo_type ON gate_check_photos (photo_type);
CREATE INDEX idx_gate_check_photos_taken_at ON gate_check_photos (taken_at);
CREATE INDEX idx_gate_check_photos_sync_status ON gate_check_photos (sync_status);
CREATE INDEX idx_gate_check_photos_upload_queue ON gate_check_photos (sync_status, upload_progress, sync_priority);
CREATE INDEX idx_gate_check_photos_created_by ON gate_check_photos (created_by);
CREATE INDEX idx_gate_check_photos_device_id ON gate_check_photos (device_id);
CREATE INDEX idx_gate_check_photos_upload_batch ON gate_check_photos (upload_batch_id);
CREATE INDEX idx_gate_check_photos_upload_schedule ON gate_check_photos (upload_scheduled_at, upload_attempts);

-- Sync Queue Indexes
CREATE INDEX idx_sync_queue_transaction_id ON sync_queue (transaction_id);
CREATE INDEX idx_sync_queue_status ON sync_queue (status);
CREATE INDEX idx_sync_queue_priority ON sync_queue (priority);
CREATE INDEX idx_sync_queue_processing_queue ON sync_queue (status, priority, scheduled_at, created_at);
CREATE INDEX idx_sync_queue_user_id ON sync_queue (user_id);
CREATE INDEX idx_sync_queue_device_id ON sync_queue (device_id);
CREATE INDEX idx_sync_queue_table_operation ON sync_queue (table_name, operation);
CREATE INDEX idx_sync_queue_batch ON sync_queue (batch_id, batch_position);
CREATE INDEX idx_sync_queue_dependencies ON sync_queue (depends_on_transaction, status);
CREATE INDEX idx_sync_queue_retry ON sync_queue (next_attempt_at, attempts, max_attempts);
CREATE INDEX idx_sync_queue_network_conditions ON sync_queue (network_type, connection_quality);

-- Conflicts Indexes
CREATE INDEX idx_sync_conflicts_conflict_id ON sync_conflicts (conflict_id);
CREATE INDEX idx_sync_conflicts_transaction_id ON sync_conflicts (transaction_id);
CREATE INDEX idx_sync_conflicts_table_record ON sync_conflicts (table_name, record_id);
CREATE INDEX idx_sync_conflicts_status ON sync_conflicts (status);
CREATE INDEX idx_sync_conflicts_severity ON sync_conflicts (conflict_severity);
CREATE INDEX idx_sync_conflicts_resolution_queue ON sync_conflicts (status, requires_manual_review, conflict_severity);
CREATE INDEX idx_sync_conflicts_user_id ON sync_conflicts (user_id);
CREATE INDEX idx_sync_conflicts_device_id ON sync_conflicts (device_id);
CREATE INDEX idx_sync_conflicts_auto_resolution ON sync_conflicts (auto_resolvable, auto_resolution_attempted);
CREATE INDEX idx_sync_conflicts_user_notification ON sync_conflicts (user_notified, user_acknowledged);

-- Sync Logs Indexes
CREATE INDEX idx_sync_logs_user_id ON sync_logs (user_id);
CREATE INDEX idx_sync_logs_device_id ON sync_logs (device_id);
CREATE INDEX idx_sync_logs_transaction_id ON sync_logs (transaction_id);
CREATE INDEX idx_sync_logs_log_type ON sync_logs (log_type);
CREATE INDEX idx_sync_logs_status ON sync_logs (status);
CREATE INDEX idx_sync_logs_table_operation ON sync_logs (table_name, operation);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs (timestamp);
CREATE INDEX idx_sync_logs_log_level ON sync_logs (log_level);
CREATE INDEX idx_sync_logs_component ON sync_logs (component);
CREATE INDEX idx_sync_logs_retention ON sync_logs (archived, retention_days, created_at);
CREATE INDEX idx_sync_logs_performance ON sync_logs (log_type, duration, data_size);

-- Network & Device Metrics Indexes
CREATE INDEX idx_network_status_device_id ON network_status (device_id);
CREATE INDEX idx_network_status_measured_at ON network_status (measured_at);
CREATE INDEX idx_network_status_connection_type ON network_status (connection_type);
CREATE INDEX idx_network_status_quality ON network_status (quality_score, is_optimal_for_sync);
CREATE INDEX idx_device_metrics_device_id ON device_metrics (device_id);
CREATE INDEX idx_device_metrics_measured_at ON device_metrics (measured_at);
CREATE INDEX idx_device_metrics_performance ON device_metrics (sync_performance_score, photo_processing_score);

-- Gate Status Indexes
CREATE INDEX idx_gate_status_gate_position ON gate_status (gate_position);
CREATE INDEX idx_gate_status_current_status ON gate_status (current_status);
CREATE INDEX idx_gate_status_security_level ON gate_status (security_level);
CREATE INDEX idx_gate_status_last_activity ON gate_status (last_activity);
CREATE INDEX idx_gate_status_sync ON gate_status (sync_status, last_sync_at);

-- ====================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ====================================================================

-- Automatically update 'updated_at' timestamps
CREATE TRIGGER gate_guest_logs_update_timestamp 
AFTER UPDATE ON gate_guest_logs 
BEGIN
  UPDATE gate_guest_logs SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

CREATE TRIGGER gate_check_records_update_timestamp 
AFTER UPDATE ON gate_check_records 
BEGIN
  UPDATE gate_check_records SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

CREATE TRIGGER gate_check_photos_update_timestamp 
AFTER UPDATE ON gate_check_photos 
BEGIN
  UPDATE gate_check_photos SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

CREATE TRIGGER sync_queue_update_timestamp 
AFTER UPDATE ON sync_queue 
BEGIN
  UPDATE sync_queue SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

CREATE TRIGGER sync_conflicts_update_timestamp 
AFTER UPDATE ON sync_conflicts 
BEGIN
  UPDATE sync_conflicts SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Automatically increment local version on data changes
CREATE TRIGGER gate_guest_logs_increment_version 
AFTER UPDATE ON gate_guest_logs 
WHEN OLD.local_version = NEW.local_version
BEGIN
  UPDATE gate_guest_logs SET local_version = local_version + 1 WHERE id = NEW.id;
END;

CREATE TRIGGER gate_check_records_increment_version 
AFTER UPDATE ON gate_check_records 
WHEN OLD.local_version = NEW.local_version
BEGIN
  UPDATE gate_check_records SET local_version = local_version + 1 WHERE id = NEW.id;
END;

-- Automatically set sync status to PENDING on data changes
CREATE TRIGGER gate_guest_logs_mark_for_sync 
AFTER UPDATE ON gate_guest_logs 
WHEN NEW.sync_status = 'SYNCED' AND (OLD.driver_name != NEW.driver_name OR OLD.status != NEW.status OR OLD.notes != NEW.notes)
BEGIN
  UPDATE gate_guest_logs SET sync_status = 'PENDING', sync_retry_count = 0 WHERE id = NEW.id;
END;

CREATE TRIGGER gate_check_records_mark_for_sync 
AFTER UPDATE ON gate_check_records 
WHEN NEW.sync_status = 'SYNCED' AND (OLD.status != NEW.status OR OLD.validation_notes != NEW.validation_notes OR OLD.exit_time != NEW.exit_time)
BEGIN
  UPDATE gate_check_records SET sync_status = 'PENDING', sync_retry_count = 0 WHERE id = NEW.id;
END;