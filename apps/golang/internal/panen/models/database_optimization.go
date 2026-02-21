package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// DatabaseOptimization provides methods to optimize harvest database queries
type DatabaseOptimization struct {
	db *gorm.DB
}

// NewDatabaseOptimization creates a new database optimization instance
func NewDatabaseOptimization(db *gorm.DB) *DatabaseOptimization {
	return &DatabaseOptimization{db: db}
}

// CreateIndexes creates optimal database indexes for harvest queries
func (do *DatabaseOptimization) CreateIndexes() error {
	// Primary index combinations based on common query patterns
	indexes := []string{
		// Index for Mandor-based queries (most common)
		"CREATE INDEX IF NOT EXISTS idx_harvest_mandor_date ON harvest_records(mandor_id, tanggal DESC)",

		// Index for Status-based queries
		"CREATE INDEX IF NOT EXISTS idx_harvest_status_date ON harvest_records(status, tanggal DESC)",

		// Index for Block-based queries
		"CREATE INDEX IF NOT EXISTS idx_harvest_block_date ON harvest_records(block_id, tanggal DESC)",

		// Composite index for Mandor + Status queries
		"CREATE INDEX IF NOT EXISTS idx_harvest_mandor_status ON harvest_records(mandor_id, status)",

		// Index for date range queries
		"CREATE INDEX IF NOT EXISTS idx_harvest_tanggal ON harvest_records(tanggal DESC)",

		// Index for approval workflow
		"CREATE INDEX IF NOT EXISTS idx_harvest_approved_by ON harvest_records(approved_by) WHERE approved_by IS NOT NULL",

		// Index for location-based queries
		"CREATE INDEX IF NOT EXISTS idx_harvest_location ON harvest_records(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL",

		// Index for search functionality (NIK-based)
		"CREATE INDEX IF NOT EXISTS idx_harvest_nik ON harvest_records(nik)",

		// Index for company/estate/division hierarchies
		"CREATE INDEX IF NOT EXISTS idx_harvest_division ON harvest_records(division_id)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_estate ON harvest_records(estate_id)",

		// Composite index for complex filtering
		"CREATE INDEX IF NOT EXISTS idx_harvest_composite ON harvest_records(mandor_id, status, tanggal DESC)",

		// Index for sync operations
		"CREATE INDEX IF NOT EXISTS idx_harvest_sync ON harvest_records(updated_at) WHERE is_synced = false",

		// Full-text search index (PostgreSQL specific)
		"CREATE INDEX IF NOT EXISTS idx_harvest_nik_text ON harvest_records USING gin(to_tsvector('simple', COALESCE(nik, '')))",
	}

	// Execute index creation
	for _, indexSQL := range indexes {
		if err := do.db.Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

// OptimizeQuery optimizes a harvest query based on filters
func (do *DatabaseOptimization) OptimizeQuery(query *gorm.DB, filters *HarvestFilters) *gorm.DB {
	// Apply most selective filters first for better performance

	// 1. Date range filtering (most selective for large datasets)
	if filters.DateFrom != nil || filters.DateTo != nil {
		query = do.applyDateFilter(query, filters)
	}

	// 2. Status filtering (very selective)
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}

	// 3. Mandor filtering (very selective for role-based access)
	if filters.MandorID != nil {
		query = query.Where("mandor_id = ?", *filters.MandorID)
	}

	// 4. Block filtering (selective for specific locations)
	if filters.BlockID != nil {
		query = query.Where("block_id = ?", *filters.BlockID)
	}

	// 5. Division filtering (for ASISTEN role)
	if len(filters.DivisionIDs) > 0 {
		query = query.Where("division_id IN ?", filters.DivisionIDs)
	}

	// 6. Estate filtering (for MANAGER role)
	if len(filters.EstateIDs) > 0 {
		query = query.Where("estate_id IN ?", filters.EstateIDs)
	}

	// 7. Company filtering (for AREA_MANAGER role)
	if len(filters.CompanyIDs) > 0 {
		// Join with blocks table for company filtering
		query = query.Joins("JOIN blocks ON harvest_records.block_id = blocks.id").
			Where("blocks.company_id IN ?", filters.CompanyIDs)
	}

	// 8. Search filtering (least selective, apply last)
	if filters.Search != nil && *filters.Search != "" {
		query = query.Where("nik ILIKE ? OR notes ILIKE ?",
			"%"+*filters.Search+"%", "%"+*filters.Search+"%")
	}

	// Apply ordering
	query = do.applyOrdering(query, filters)

	// Apply pagination
	query = do.applyPagination(query, filters)

	return query
}

// applyDateFilter applies date range filtering to the query
func (do *DatabaseOptimization) applyDateFilter(query *gorm.DB, filters *HarvestFilters) *gorm.DB {
	if filters.DateFrom != nil && filters.DateTo != nil {
		// Both dates specified - use BETWEEN for optimal performance
		return query.Where("tanggal BETWEEN ? AND ?",
			filters.DateFrom.Format("2006-01-02"),
			filters.DateTo.Format("2006-01-02"))
	} else if filters.DateFrom != nil {
		// Only start date specified
		return query.Where("tanggal >= ?", filters.DateFrom.Format("2006-01-02"))
	} else if filters.DateTo != nil {
		// Only end date specified
		return query.Where("tanggal <= ?", filters.DateTo.Format("2006-01-02"))
	}
	return query
}

// applyOrdering applies ordering to the query
func (do *DatabaseOptimization) applyOrdering(query *gorm.DB, filters *HarvestFilters) *gorm.DB {
	orderBy := DefaultHarvestOrderBy
	orderDir := DefaultOrderDir

	if filters.OrderBy != nil {
		orderBy = *filters.OrderBy
	}

	if filters.OrderDir != nil {
		orderDir = *filters.OrderDir
	}

	// Validate order direction
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = DefaultOrderDir
	}

	// Apply ordering
	return query.Order(fmt.Sprintf("%s %s", orderBy, orderDir))
}

// applyPagination applies pagination to the query
func (do *DatabaseOptimization) applyPagination(query *gorm.DB, filters *HarvestFilters) *gorm.DB {
	limit := DefaultHarvestLimit
	offset := 0

	if filters.Limit != nil {
		limit = *filters.Limit
		// Enforce maximum limit to prevent performance issues
		if limit > MaxHarvestLimit {
			limit = MaxHarvestLimit
		}
	}

	if filters.Offset != nil {
		offset = *filters.Offset
	}

	return query.Offset(offset).Limit(limit)
}

// AnalyzeSlowQueries identifies and reports slow queries
func (do *DatabaseOptimization) AnalyzeSlowQueries() (*QueryAnalysis, error) {
	analysis := &QueryAnalysis{
		SlowQueries: make([]SlowQuery, 0),
		Indexes:     make([]IndexInfo, 0),
	}

	// Check for missing indexes on large tables
	var tables []struct {
		TableName string `json:"table_name"`
		RowCount  int64  `json:"row_count"`
	}

	err := do.db.Raw(`
		SELECT schemaname||'.'||tablename as table_name,
		       n_tup_ins + n_tup_upd + n_tup_del as row_count
		FROM pg_stat_user_tables
		WHERE schemaname = 'public'
		AND tablename IN ('harvest_records', 'blocks', 'users')
		ORDER BY row_count DESC
	`).Scan(&tables).Error

	if err != nil {
		return nil, fmt.Errorf("failed to analyze table sizes: %w", err)
	}

	// Analyze each table
	for _, table := range tables {
		if table.RowCount > 10000 { // Only analyze tables with significant data
			analysis.TotalRows += table.RowCount
			analysis.AnalyzedTables = append(analysis.AnalyzedTables, table.TableName)
		}
	}

	// Check index usage
	var indexes []IndexInfo
	err = do.db.Raw(`
		SELECT schemaname||'.'||tablename as table_name,
		       indexname as index_name,
		       idx_scan as index_scans,
		       idx_tup_read as tuples_read,
		       idx_tup_fetch as tuples_fetched
		FROM pg_stat_user_indexes
		WHERE schemaname = 'public'
		AND tablename LIKE '%harvest%'
		ORDER BY idx_scan DESC
	`).Scan(&indexes).Error

	if err != nil {
		return nil, fmt.Errorf("failed to analyze indexes: %w", err)
	}

	analysis.Indexes = indexes

	return analysis, nil
}

// QueryAnalysis contains analysis results for database queries
type QueryAnalysis struct {
	TotalRows       int64       `json:"total_rows"`
	AnalyzedTables  []string    `json:"analyzed_tables"`
	SlowQueries     []SlowQuery `json:"slow_queries"`
	Indexes         []IndexInfo `json:"indexes"`
	Recommendations []string    `json:"recommendations"`
}

// SlowQuery represents a slow query analysis
type SlowQuery struct {
	Query           string        `json:"query"`
	Duration        time.Duration `json:"duration"`
	ExecCount       int64         `json:"exec_count"`
	Recommendations []string      `json:"recommendations"`
}

// IndexInfo contains information about database indexes
type IndexInfo struct {
	TableName     string `json:"table_name"`
	IndexName     string `json:"index_name"`
	IndexScans    int64  `json:"index_scans"`
	TuplesRead    int64  `json:"tuples_read"`
	TuplesFetched int64  `json:"tuples_fetched"`
}

// OptimizeForRealTime optimizes the database for real-time subscription performance
func (do *DatabaseOptimization) OptimizeForRealTime() error {
	optimizations := []string{
		// Enable parallel query execution
		"SET max_parallel_workers_per_gather = 4",

		// Increase work memory for sorting operations
		"SET work_mem = '256MB'",

		// Optimize for OLTP workload
		"SET random_page_cost = 1.1",

		// Increase checkpoint timeout for better performance
		"SET checkpoint_completion_target = 0.9",

		// Optimize for high concurrency
		"SET max_connections = 200",
	}

	for _, optimization := range optimizations {
		if err := do.db.Exec(optimization).Error; err != nil {
			return fmt.Errorf("failed to apply optimization '%s': %w", optimization, err)
		}
	}

	return nil
}

// VacuumHarvestTable performs maintenance on the harvest table
func (do *DatabaseOptimization) VacuumHarvestTable() error {
	// Perform VACUUM ANALYZE to update statistics and reclaim space
	err := do.db.Exec("VACUUM ANALYZE harvest_records").Error
	if err != nil {
		return fmt.Errorf("failed to vacuum harvest table: %w", err)
	}

	// Update table statistics
	err = do.db.Exec("ANALYZE harvest_records").Error
	if err != nil {
		return fmt.Errorf("failed to analyze harvest table: %w", err)
	}

	return nil
}

// GetQueryPerformanceMetrics returns performance metrics for common queries
func (do *DatabaseOptimization) GetQueryPerformanceMetrics() (map[string]QueryMetrics, error) {
	metrics := make(map[string]QueryMetrics)

	// Test common query patterns
	queries := map[string]string{
		"mandor_daily_harvests": `
			SELECT COUNT(*) as count
			FROM harvest_records
			WHERE mandor_id = $1
			AND DATE(tanggal) = CURRENT_DATE`,

		"pending_approvals": `
			SELECT COUNT(*) as count
			FROM harvest_records
			WHERE status = 'PENDING'`,

		"monthly_statistics": `
			SELECT
				COUNT(*) as total,
				SUM(berat_tbs) as total_tbs,
				AVG(berat_tbs) as avg_tbs
			FROM harvest_records
			WHERE tanggal >= $1`,
	}

	for name, query := range queries {
		start := time.Now()
		var result struct {
			Count int64 `json:"count"`
		}

		// Execute query (using dummy parameters for testing)
		err := do.db.Raw(query, "test-id", time.Now().AddDate(0, 0, -30)).Scan(&result).Error
		duration := time.Since(start)

		if err != nil {
			metrics[name] = QueryMetrics{
				Query:       query,
				Duration:    duration,
				Success:     false,
				Error:       err.Error(),
				RecordCount: 0,
			}
		} else {
			metrics[name] = QueryMetrics{
				Query:       query,
				Duration:    duration,
				Success:     true,
				Error:       "",
				RecordCount: result.Count,
			}
		}
	}

	return metrics, nil
}

// QueryMetrics contains performance metrics for a query
type QueryMetrics struct {
	Query       string        `json:"query"`
	Duration    time.Duration `json:"duration"`
	Success     bool          `json:"success"`
	Error       string        `json:"error"`
	RecordCount int64         `json:"record_count"`
}
