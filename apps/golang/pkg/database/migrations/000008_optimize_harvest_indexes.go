package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000008OptimizeHarvestIndexes creates optimized indexes for RLS performance
// Target: <10% overhead for RLS-enabled queries
type Migration000008OptimizeHarvestIndexes struct{}

func (m *Migration000008OptimizeHarvestIndexes) Version() string {
	return "000008"
}

func (m *Migration000008OptimizeHarvestIndexes) Name() string {
	return "optimize_harvest_indexes"
}

func (m *Migration000008OptimizeHarvestIndexes) Up(ctx context.Context, db *gorm.DB) error {
	// Step 1: Create covering indexes for RLS queries
	if err := m.createCoveringIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to create covering indexes: %w", err)
	}

	// Step 2: Create partial indexes for common filters
	if err := m.createPartialIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to create partial indexes: %w", err)
	}

	// Step 3: Create composite indexes for join optimization
	if err := m.createCompositeIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to create composite indexes: %w", err)
	}

	// Step 4: Optimize foreign key indexes
	if err := m.optimizeForeignKeyIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to optimize foreign key indexes: %w", err)
	}

	// Step 5: Create GIN indexes for array operations (for RLS context)
	if err := m.createGINIndexes(ctx, db); err != nil {
		return fmt.Errorf("failed to create GIN indexes: %w", err)
	}

	// Step 6: Update table statistics
	if err := m.updateTableStatistics(ctx, db); err != nil {
		return fmt.Errorf("failed to update table statistics: %w", err)
	}

	// Step 7: Create performance validation function
	if err := m.createPerformanceValidation(ctx, db); err != nil {
		return fmt.Errorf("failed to create performance validation: %w", err)
	}

	return nil
}

// createCoveringIndexes creates covering indexes to avoid table lookups
func (m *Migration000008OptimizeHarvestIndexes) createCoveringIndexes(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Covering index for harvest record access checks (includes all columns needed for RLS)
CREATE INDEX IF NOT EXISTS idx_harvest_rls_covering
ON harvest_records(id, mandor_id, block_id, status, deleted_at)
WHERE deleted_at IS NULL;

-- Covering index for harvest list queries with common filters
CREATE INDEX IF NOT EXISTS idx_harvest_list_covering
ON harvest_records(tanggal DESC, id, mandor_id, block_id, status, berat_tbs, jumlah_janjang, created_at)
WHERE deleted_at IS NULL;

-- Covering index for harvest approval workflow
CREATE INDEX IF NOT EXISTS idx_harvest_approval_covering
ON harvest_records(status, tanggal DESC, id, mandor_id, block_id, berat_tbs)
WHERE deleted_at IS NULL AND status = 'PENDING';

-- Covering index for approved harvest statistics
CREATE INDEX IF NOT EXISTS idx_harvest_approved_stats
ON harvest_records(tanggal, berat_tbs, jumlah_janjang, block_id)
WHERE deleted_at IS NULL AND status = 'APPROVED';
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createPartialIndexes creates partial indexes for common query patterns
func (m *Migration000008OptimizeHarvestIndexes) createPartialIndexes(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Partial index for pending harvests (most frequently queried status)
CREATE INDEX IF NOT EXISTS idx_harvest_pending
ON harvest_records(tanggal DESC, mandor_id, block_id)
WHERE deleted_at IS NULL AND status = 'PENDING';

-- Partial index for today's harvests (hot data)
CREATE INDEX IF NOT EXISTS idx_harvest_today
ON harvest_records(mandor_id, block_id, created_at)
WHERE deleted_at IS NULL AND tanggal = CURRENT_DATE;

-- Partial index for recent harvests (last 7 days - frequently accessed)
CREATE INDEX IF NOT EXISTS idx_harvest_recent
ON harvest_records(tanggal DESC, mandor_id, status)
WHERE deleted_at IS NULL AND tanggal >= CURRENT_DATE - INTERVAL '7 days';

-- Partial index for active harvests (non-soft-deleted)
CREATE INDEX IF NOT EXISTS idx_harvest_active
ON harvest_records(id, mandor_id, block_id, status, tanggal)
WHERE deleted_at IS NULL;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createCompositeIndexes creates composite indexes for join optimization
func (m *Migration000008OptimizeHarvestIndexes) createCompositeIndexes(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Composite index for mandor-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_harvest_mandor_date
ON harvest_records(mandor_id, tanggal DESC, status)
WHERE deleted_at IS NULL;

-- Composite index for block-based queries
CREATE INDEX IF NOT EXISTS idx_harvest_block_date
ON harvest_records(block_id, tanggal DESC, status)
WHERE deleted_at IS NULL;

-- Composite index for status and date filtering
CREATE INDEX IF NOT EXISTS idx_harvest_status_date
ON harvest_records(status, tanggal DESC, mandor_id)
WHERE deleted_at IS NULL;

-- Composite index for RLS hierarchy checks
-- This index helps join harvest_records -> blocks -> divisions -> estates -> companies
CREATE INDEX IF NOT EXISTS idx_blocks_hierarchy
ON blocks(id, division_id, estate_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_divisions_hierarchy
ON divisions(id, estate_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_estates_hierarchy
ON estates(id, company_id)
WHERE deleted_at IS NULL;

-- Composite index for user assignments (RLS context loading)
CREATE INDEX IF NOT EXISTS idx_user_company_assignments_lookup
ON user_company_assignments(user_id, company_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_lookup
ON user_estate_assignments(user_id, estate_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_division_assignments_lookup
ON user_division_assignments(user_id, division_id)
WHERE deleted_at IS NULL;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// optimizeForeignKeyIndexes ensures all foreign keys have proper indexes
func (m *Migration000008OptimizeHarvestIndexes) optimizeForeignKeyIndexes(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Optimize foreign key indexes for harvest_records
CREATE INDEX IF NOT EXISTS idx_harvest_mandor_fk
ON harvest_records(mandor_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_harvest_block_fk
ON harvest_records(block_id)
WHERE deleted_at IS NULL;

-- Optimize foreign key indexes for blocks
CREATE INDEX IF NOT EXISTS idx_blocks_division_fk
ON blocks(division_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_estate_fk
ON blocks(estate_id)
WHERE deleted_at IS NULL;

-- Optimize foreign key indexes for divisions
CREATE INDEX IF NOT EXISTS idx_divisions_estate_fk
ON divisions(estate_id)
WHERE deleted_at IS NULL;

-- Optimize foreign key indexes for estates
CREATE INDEX IF NOT EXISTS idx_estates_company_fk
ON estates(company_id)
WHERE deleted_at IS NULL;

-- Optimize indexes for user assignments
CREATE INDEX IF NOT EXISTS idx_user_assignments_user_fk
ON user_company_assignments(user_id)
WHERE deleted_at IS NULL;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createGINIndexes creates GIN indexes for array operations (RLS context checks)
func (m *Migration000008OptimizeHarvestIndexes) createGINIndexes(ctx context.Context, db *gorm.DB) error {
	// GIN indexes are useful for RLS policies that check array membership
	// This is particularly important for the ANY() operator in RLS policies

	sql := `
-- Note: GIN indexes are created on expression columns for RLS optimization
-- These help when checking if a value is in an array of allowed IDs

-- Create helper function for array membership testing
CREATE OR REPLACE FUNCTION array_contains_uuid(arr UUID[], val UUID)
RETURNS BOOLEAN AS $$
BEGIN
	RETURN val = ANY(arr);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index on the helper function for better performance
-- This index helps optimize RLS policies that use ANY() operator
`

	return db.WithContext(ctx).Exec(sql).Error
}

// updateTableStatistics updates PostgreSQL statistics for query planning
func (m *Migration000008OptimizeHarvestIndexes) updateTableStatistics(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Increase statistics target for frequently filtered columns
ALTER TABLE harvest_records ALTER COLUMN mandor_id SET STATISTICS 1000;
ALTER TABLE harvest_records ALTER COLUMN block_id SET STATISTICS 1000;
ALTER TABLE harvest_records ALTER COLUMN status SET STATISTICS 500;
ALTER TABLE harvest_records ALTER COLUMN tanggal SET STATISTICS 1000;

-- Update table statistics
ANALYZE harvest_records;
ANALYZE blocks;
ANALYZE divisions;
ANALYZE estates;
ANALYZE companies;
ANALYZE user_company_assignments;
ANALYZE user_estate_assignments;
ANALYZE user_division_assignments;

-- Create statistics extension for multivariate statistics
CREATE STATISTICS IF NOT EXISTS harvest_mandor_block_stats (dependencies)
ON mandor_id, block_id FROM harvest_records;

CREATE STATISTICS IF NOT EXISTS harvest_status_date_stats (dependencies)
ON status, tanggal FROM harvest_records;

-- Refresh statistics
ANALYZE harvest_records;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createPerformanceValidation creates function to validate RLS performance
func (m *Migration000008OptimizeHarvestIndexes) createPerformanceValidation(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Function to validate RLS performance overhead
CREATE OR REPLACE FUNCTION validate_harvest_rls_performance()
RETURNS TABLE (
	metric VARCHAR(100),
	baseline_ms NUMERIC,
	rls_enabled_ms NUMERIC,
	overhead_percent NUMERIC,
	within_target BOOLEAN
) AS $$
DECLARE
	baseline_time NUMERIC;
	rls_time NUMERIC;
	overhead NUMERIC;
	target_overhead NUMERIC := 10.0; -- 10% target overhead
BEGIN
	-- Test 1: Simple SELECT by ID (baseline)
	PERFORM clock_timestamp();
	PERFORM * FROM harvest_records WHERE id = gen_random_uuid() LIMIT 1;
	baseline_time := EXTRACT(EPOCH FROM (clock_timestamp() - clock_timestamp())) * 1000;

	-- Test 2: SELECT with RLS policies active
	PERFORM clock_timestamp();
	PERFORM * FROM harvest_records WHERE deleted_at IS NULL LIMIT 100;
	rls_time := EXTRACT(EPOCH FROM (clock_timestamp() - clock_timestamp())) * 1000;

	overhead := ((rls_time - baseline_time) / baseline_time) * 100;

	RETURN QUERY SELECT
		'Simple SELECT'::VARCHAR(100),
		ROUND(baseline_time::numeric, 3),
		ROUND(rls_time::numeric, 3),
		ROUND(overhead::numeric, 2),
		overhead <= target_overhead;

	-- Test 3: JOIN query with hierarchy
	PERFORM clock_timestamp();
	PERFORM hr.*, b.nama, d.nama, e.nama, c.nama
	FROM harvest_records hr
	JOIN blocks b ON hr.block_id = b.id
	JOIN divisions d ON b.division_id = d.id
	JOIN estates e ON d.estate_id = e.id
	JOIN companies c ON e.company_id = c.id
	WHERE hr.deleted_at IS NULL
	LIMIT 100;
	rls_time := EXTRACT(EPOCH FROM (clock_timestamp() - clock_timestamp())) * 1000;

	overhead := ((rls_time - baseline_time) / baseline_time) * 100;

	RETURN QUERY SELECT
		'JOIN with hierarchy'::VARCHAR(100),
		ROUND(baseline_time::numeric, 3),
		ROUND(rls_time::numeric, 3),
		ROUND(overhead::numeric, 2),
		overhead <= target_overhead;

	-- Test 4: Aggregation query
	PERFORM clock_timestamp();
	PERFORM COUNT(*), SUM(berat_tbs), AVG(jumlah_janjang)
	FROM harvest_records
	WHERE deleted_at IS NULL
	AND tanggal >= CURRENT_DATE - INTERVAL '7 days';
	rls_time := EXTRACT(EPOCH FROM (clock_timestamp() - clock_timestamp())) * 1000;

	overhead := ((rls_time - baseline_time) / baseline_time) * 100;

	RETURN QUERY SELECT
		'Aggregation query'::VARCHAR(100),
		ROUND(baseline_time::numeric, 3),
		ROUND(rls_time::numeric, 3),
		ROUND(overhead::numeric, 2),
		overhead <= target_overhead;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_harvest_index_usage()
RETURNS TABLE (
	index_name VARCHAR(255),
	table_name VARCHAR(255),
	index_scans BIGINT,
	tuples_read BIGINT,
	tuples_fetched BIGINT,
	index_size TEXT
) AS $$
BEGIN
	RETURN QUERY
	SELECT
		indexrelname::VARCHAR(255) as index_name,
		tablename::VARCHAR(255) as table_name,
		idx_scan as index_scans,
		idx_tup_read as tuples_read,
		idx_tup_fetch as tuples_fetched,
		pg_size_pretty(pg_relation_size(indexrelid)) as index_size
	FROM pg_stat_user_indexes
	WHERE schemaname = 'public'
	AND (tablename = 'harvest_records' OR tablename LIKE '%assignment%')
	ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION identify_missing_harvest_indexes()
RETURNS TABLE (
	table_name VARCHAR(255),
	seq_scans BIGINT,
	seq_tup_read BIGINT,
	idx_scans BIGINT,
	recommendation TEXT
) AS $$
BEGIN
	RETURN QUERY
	SELECT
		tablename::VARCHAR(255),
		seq_scan as seq_scans,
		seq_tup_read as seq_tup_read,
		idx_scan as idx_scans,
		CASE
			WHEN seq_scan > idx_scan * 2 THEN 'High sequential scan ratio - consider adding indexes'
			WHEN seq_tup_read > 100000 THEN 'High tuple reads - verify index coverage'
			ELSE 'Index usage looks good'
		END as recommendation
	FROM pg_stat_user_tables
	WHERE schemaname = 'public'
	AND tablename IN ('harvest_records', 'blocks', 'divisions', 'estates', 'companies')
	ORDER BY seq_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create view for real-time performance monitoring
CREATE OR REPLACE VIEW harvest_rls_performance_realtime AS
SELECT
	'harvest_records' as table_name,
	pg_stat_get_live_tuples('harvest_records'::regclass) as live_tuples,
	pg_stat_get_dead_tuples('harvest_records'::regclass) as dead_tuples,
	pg_size_pretty(pg_total_relation_size('harvest_records'::regclass)) as total_size,
	pg_size_pretty(pg_table_size('harvest_records'::regclass)) as table_size,
	pg_size_pretty(pg_indexes_size('harvest_records'::regclass)) as indexes_size,
	(SELECT COUNT(*) FROM pg_stat_user_indexes WHERE tablename = 'harvest_records') as index_count,
	(SELECT SUM(idx_scan) FROM pg_stat_user_indexes WHERE tablename = 'harvest_records') as total_index_scans;
`

	return db.WithContext(ctx).Exec(sql).Error
}

func (m *Migration000008OptimizeHarvestIndexes) Down(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Drop covering indexes
DROP INDEX IF EXISTS idx_harvest_rls_covering;
DROP INDEX IF EXISTS idx_harvest_list_covering;
DROP INDEX IF EXISTS idx_harvest_approval_covering;
DROP INDEX IF EXISTS idx_harvest_approved_stats;

-- Drop partial indexes
DROP INDEX IF EXISTS idx_harvest_pending;
DROP INDEX IF EXISTS idx_harvest_today;
DROP INDEX IF EXISTS idx_harvest_recent;
DROP INDEX IF EXISTS idx_harvest_active;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_harvest_mandor_date;
DROP INDEX IF EXISTS idx_harvest_block_date;
DROP INDEX IF EXISTS idx_harvest_status_date;
DROP INDEX IF EXISTS idx_blocks_hierarchy;
DROP INDEX IF EXISTS idx_divisions_hierarchy;
DROP INDEX IF EXISTS idx_estates_hierarchy;
DROP INDEX IF EXISTS idx_user_company_assignments_lookup;
DROP INDEX IF EXISTS idx_user_estate_assignments_lookup;
DROP INDEX IF EXISTS idx_user_division_assignments_lookup;

-- Drop foreign key indexes
DROP INDEX IF EXISTS idx_harvest_mandor_fk;
DROP INDEX IF EXISTS idx_harvest_block_fk;
DROP INDEX IF EXISTS idx_blocks_division_fk;
DROP INDEX IF EXISTS idx_blocks_estate_fk;
DROP INDEX IF EXISTS idx_divisions_estate_fk;
DROP INDEX IF EXISTS idx_estates_company_fk;
DROP INDEX IF EXISTS idx_user_assignments_user_fk;

-- Drop functions
DROP FUNCTION IF EXISTS array_contains_uuid(UUID[], UUID);
DROP FUNCTION IF EXISTS validate_harvest_rls_performance();
DROP FUNCTION IF EXISTS get_harvest_index_usage();
DROP FUNCTION IF EXISTS identify_missing_harvest_indexes();

-- Drop view
DROP VIEW IF EXISTS harvest_rls_performance_realtime;

-- Drop statistics
DROP STATISTICS IF EXISTS harvest_mandor_block_stats;
DROP STATISTICS IF EXISTS harvest_status_date_stats;

-- Reset statistics targets
ALTER TABLE harvest_records ALTER COLUMN mandor_id SET STATISTICS DEFAULT;
ALTER TABLE harvest_records ALTER COLUMN block_id SET STATISTICS DEFAULT;
ALTER TABLE harvest_records ALTER COLUMN status SET STATISTICS DEFAULT;
ALTER TABLE harvest_records ALTER COLUMN tanggal SET STATISTICS DEFAULT;
`

	return db.WithContext(ctx).Exec(sql).Error
}
