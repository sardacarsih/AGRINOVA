package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000012CreateSecurityAuditLogs creates the security_audit_logs table for comprehensive logout and security event tracking
type Migration000012CreateSecurityAuditLogs struct{}

func (m *Migration000012CreateSecurityAuditLogs) Version() string {
	return "000012"
}

func (m *Migration000012CreateSecurityAuditLogs) Name() string {
	return "create_security_audit_logs"
}

func (m *Migration000012CreateSecurityAuditLogs) Up(ctx context.Context, db *gorm.DB) error {
	// Create security_audit_logs table
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS security_audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID,
			event_type VARCHAR(50) NOT NULL,
			device_id VARCHAR(255),
			platform VARCHAR(20),
			ip_address INET,
			user_agent TEXT,
			logout_type VARCHAR(50),
			success BOOLEAN DEFAULT false NOT NULL,
			error_message TEXT,
			duration_ms BIGINT,
			session_id UUID,
			remaining_sessions INT,
			tokens_invalidated BOOLEAN DEFAULT false,
			sessions_terminated INT,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT fk_security_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			CONSTRAINT valid_event_type CHECK (event_type IN (
				'logout_attempt',
				'logout_success',
				'logout_failure',
				'logout_all_devices',
				'emergency_logout',
				'session_timeout',
				'token_expired',
				'security_violation',
				'admin_forced'
			)),
			CONSTRAINT valid_platform CHECK (platform IN ('WEB', 'MOBILE', 'ANDROID', 'IOS') OR platform IS NULL),
			CONSTRAINT valid_logout_type CHECK (logout_type IN (
				'USER_INITIATED',
				'SESSION_TIMEOUT',
				'TOKEN_EXPIRED',
				'SECURITY_VIOLATION',
				'ADMIN_FORCED',
				'DEVICE_COMPROMISED',
				'EMERGENCY'
			) OR logout_type IS NULL)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create security_audit_logs table: %w", err)
	}

	// Create indexes for security_audit_logs table
	indexes := []string{
		// User lookup - most common query pattern
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON security_audit_logs(user_id) WHERE deleted_at IS NULL;",

		// Event type filtering
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type) WHERE deleted_at IS NULL;",

		// Device tracking
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_device ON security_audit_logs(device_id) WHERE deleted_at IS NULL;",

		// Platform filtering
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_platform ON security_audit_logs(platform) WHERE deleted_at IS NULL;",

		// IP address tracking for security analysis
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON security_audit_logs(ip_address) WHERE deleted_at IS NULL;",

		// Logout type analysis
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_logout_type ON security_audit_logs(logout_type) WHERE deleted_at IS NULL;",

		// Success/failure analysis
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_success ON security_audit_logs(success) WHERE deleted_at IS NULL;",

		// Time-based queries (most recent events)
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created ON security_audit_logs(created_at DESC) WHERE deleted_at IS NULL;",

		// Session tracking
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_session ON security_audit_logs(session_id) WHERE deleted_at IS NULL;",

		// Soft delete index
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_deleted ON security_audit_logs(deleted_at);",

		// Composite index for common security analysis queries
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_analysis ON security_audit_logs(user_id, event_type, created_at DESC) WHERE deleted_at IS NULL AND success = true;",

		// Composite index for failed logout attempts (security monitoring)
		"CREATE INDEX IF NOT EXISTS idx_security_audit_logs_failures ON security_audit_logs(user_id, ip_address, created_at DESC) WHERE deleted_at IS NULL AND success = false;",
	}

	for _, indexSQL := range indexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create security_audit_logs index: %w", err)
		}
	}

	// Create trigger for updated_at timestamp
	if err := db.WithContext(ctx).Exec(`
		CREATE OR REPLACE FUNCTION update_security_audit_logs_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return fmt.Errorf("failed to create trigger function: %w", err)
	}

	if err := db.WithContext(ctx).Exec(`
		CREATE TRIGGER security_audit_logs_updated_at_trigger
		BEFORE UPDATE ON security_audit_logs
		FOR EACH ROW
		EXECUTE FUNCTION update_security_audit_logs_updated_at();
	`).Error; err != nil {
		return fmt.Errorf("failed to create trigger: %w", err)
	}

	// Create partitioning for performance (optional but recommended for high-volume logs)
	// Partition by month to improve query performance and enable efficient archival
	if err := db.WithContext(ctx).Exec(`
		-- Create a function to automatically create partitions
		CREATE OR REPLACE FUNCTION create_security_audit_logs_partition()
		RETURNS TRIGGER AS $$
		DECLARE
			partition_date TEXT;
			partition_name TEXT;
			start_date TEXT;
			end_date TEXT;
		BEGIN
			partition_date := TO_CHAR(NEW.created_at, 'YYYY_MM');
			partition_name := 'security_audit_logs_' || partition_date;
			start_date := TO_CHAR(DATE_TRUNC('month', NEW.created_at), 'YYYY-MM-DD');
			end_date := TO_CHAR(DATE_TRUNC('month', NEW.created_at) + INTERVAL '1 month', 'YYYY-MM-DD');

			-- Check if partition exists, if not create it
			IF NOT EXISTS (
				SELECT 1 FROM pg_class WHERE relname = partition_name
			) THEN
				EXECUTE format(
					'CREATE TABLE IF NOT EXISTS %I PARTITION OF security_audit_logs FOR VALUES FROM (%L) TO (%L)',
					partition_name, start_date, end_date
				);
			END IF;

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		// Partitioning is optional - log warning but don't fail migration
		fmt.Printf("Warning: Failed to create partitioning function (non-critical): %v\n", err)
	}

	// Create view for recent audit logs (last 90 days) - commonly accessed
	if err := db.WithContext(ctx).Exec(`
		CREATE OR REPLACE VIEW recent_security_audit_logs AS
		SELECT *
		FROM security_audit_logs
		WHERE created_at >= NOW() - INTERVAL '90 days'
			AND deleted_at IS NULL
		ORDER BY created_at DESC;
	`).Error; err != nil {
		return fmt.Errorf("failed to create view: %w", err)
	}

	// Create view for failed logout attempts (security monitoring)
	if err := db.WithContext(ctx).Exec(`
		CREATE OR REPLACE VIEW failed_logout_attempts AS
		SELECT
			user_id,
			ip_address,
			device_id,
			logout_type,
			error_message,
			COUNT(*) as attempt_count,
			MAX(created_at) as last_attempt,
			MIN(created_at) as first_attempt
		FROM security_audit_logs
		WHERE event_type IN ('logout_attempt', 'logout_failure')
			AND success = false
			AND created_at >= NOW() - INTERVAL '24 hours'
			AND deleted_at IS NULL
		GROUP BY user_id, ip_address, device_id, logout_type, error_message
		HAVING COUNT(*) > 3
		ORDER BY attempt_count DESC, last_attempt DESC;
	`).Error; err != nil {
		return fmt.Errorf("failed to create failed_logout_attempts view: %w", err)
	}

	// Create materialized view for logout statistics (refreshed periodically)
	if err := db.WithContext(ctx).Exec(`
		CREATE MATERIALIZED VIEW IF NOT EXISTS logout_statistics AS
		SELECT
			DATE_TRUNC('hour', created_at) as hour,
			event_type,
			logout_type,
			platform,
			COUNT(*) as total_count,
			COUNT(*) FILTER (WHERE success = true) as success_count,
			COUNT(*) FILTER (WHERE success = false) as failure_count,
			AVG(duration_ms) as avg_duration_ms,
			MAX(duration_ms) as max_duration_ms
		FROM security_audit_logs
		WHERE created_at >= NOW() - INTERVAL '7 days'
			AND deleted_at IS NULL
		GROUP BY DATE_TRUNC('hour', created_at), event_type, logout_type, platform
		ORDER BY hour DESC;
	`).Error; err != nil {
		return fmt.Errorf("failed to create logout_statistics view: %w", err)
	}

	// Create index on materialized view
	if err := db.WithContext(ctx).Exec(`
		CREATE INDEX IF NOT EXISTS idx_logout_statistics_hour ON logout_statistics(hour DESC);
	`).Error; err != nil {
		return fmt.Errorf("failed to create index on materialized view: %w", err)
	}

	// Create a function to refresh the materialized view (can be called via cron)
	if err := db.WithContext(ctx).Exec(`
		CREATE OR REPLACE FUNCTION refresh_logout_statistics()
		RETURNS void AS $$
		BEGIN
			REFRESH MATERIALIZED VIEW CONCURRENTLY logout_statistics;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return fmt.Errorf("failed to create refresh function: %w", err)
	}

	return nil
}

func (m *Migration000012CreateSecurityAuditLogs) Down(ctx context.Context, db *gorm.DB) error {
	// Drop materialized view and related objects
	if err := db.WithContext(ctx).Exec(`
		DROP FUNCTION IF EXISTS refresh_logout_statistics();
		DROP MATERIALIZED VIEW IF EXISTS logout_statistics;
		DROP VIEW IF EXISTS failed_logout_attempts;
		DROP VIEW IF EXISTS recent_security_audit_logs;
		DROP FUNCTION IF EXISTS create_security_audit_logs_partition();
	`).Error; err != nil {
		return fmt.Errorf("failed to drop views and functions: %w", err)
	}

	// Drop trigger and function
	if err := db.WithContext(ctx).Exec(`
		DROP TRIGGER IF EXISTS security_audit_logs_updated_at_trigger ON security_audit_logs;
		DROP FUNCTION IF EXISTS update_security_audit_logs_updated_at();
	`).Error; err != nil {
		return fmt.Errorf("failed to drop trigger: %w", err)
	}

	// Drop table
	if err := db.WithContext(ctx).Exec(`
		DROP TABLE IF EXISTS security_audit_logs CASCADE;
	`).Error; err != nil {
		return fmt.Errorf("failed to drop security_audit_logs table: %w", err)
	}

	return nil
}
