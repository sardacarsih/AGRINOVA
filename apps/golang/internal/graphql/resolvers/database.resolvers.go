package resolvers

// This file implements diagnostic resolvers for database and RLS context verification

import (
	"context"
	"fmt"
	"strings"
	"time"

	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/pkg/database"
)

// RlsContext returns the current PostgreSQL RLS context for diagnostics
func (r *queryResolver) RlsContext(ctx context.Context) (*generated.RLSContextInfo, error) {
	db := database.GetDB()

	// Query PostgreSQL session variables set by RLS middleware
	var result struct {
		UserID      *string
		UserRole    *string
		CompanyIDs  *string
		EstateIDs   *string
		DivisionIDs *string
		ClientIP    *string
	}

	query := `
		SELECT
			current_setting('app.user_id', true) as user_id,
			current_setting('app.user_role', true) as user_role,
			current_setting('app.company_ids', true) as company_ids,
			current_setting('app.estate_ids', true) as estate_ids,
			current_setting('app.division_ids', true) as division_ids,
			inet_client_addr()::text as client_ip
	`

	err := db.WithContext(ctx).Raw(query).Scan(&result).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query RLS context: %w", err)
	}

	// Parse comma-separated IDs into arrays
	companyIDs := []string{}
	estateIDs := []string{}
	divisionIDs := []string{}

	if result.CompanyIDs != nil && *result.CompanyIDs != "" {
		companyIDs = strings.Split(*result.CompanyIDs, ",")
	}
	if result.EstateIDs != nil && *result.EstateIDs != "" {
		estateIDs = strings.Split(*result.EstateIDs, ",")
	}
	if result.DivisionIDs != nil && *result.DivisionIDs != "" {
		divisionIDs = strings.Split(*result.DivisionIDs, ",")
	}

	// Determine if RLS context is set
	isSet := result.UserID != nil && *result.UserID != ""

	// Get timestamp (approximate - when middleware set context)
	now := time.Now()

	// Extract user ID and role with nil checks
	var userId, userRole, clientIp *string
	if result.UserID != nil && *result.UserID != "" {
		userId = result.UserID
	}
	if result.UserRole != nil && *result.UserRole != "" {
		userRole = result.UserRole
	}
	if result.ClientIP != nil && *result.ClientIP != "" {
		clientIp = result.ClientIP
	}

	return &generated.RLSContextInfo{
		UserID:      userId,
		UserRole:    userRole,
		CompanyIds:  companyIDs,
		EstateIds:   estateIDs,
		DivisionIds: divisionIDs,
		IsSet:       isSet,
		SetAt:       &now,
		ClientIP:    clientIp,
	}, nil
}

// DatabaseHealth returns database health and RLS status
func (r *queryResolver) DatabaseHealth(ctx context.Context) (*generated.DatabaseHealthInfo, error) {
	db := database.GetDB()

	// Check database connection
	sqlDB, err := db.DB()
	if err != nil {
		return &generated.DatabaseHealthInfo{
			Connected:       false,
			RlsEnabled:      false,
			RlsTablesCount:  int32Ptr(0),
		}, nil
	}

	// Ping database
	err = sqlDB.Ping()
	connected := err == nil

	// Get PostgreSQL version
	var version string
	db.Raw("SELECT version()").Scan(&version)

	// Get active connections
	var activeConnections int32
	db.Raw("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'").Scan(&activeConnections)

	// Check if RLS is enabled on critical tables
	var rlsTablesCount int32
	query := `
		SELECT COUNT(*)
		FROM pg_tables t
		JOIN pg_class c ON c.relname = t.tablename
		WHERE t.schemaname = 'public'
		  AND c.relrowsecurity = true
		  AND t.tablename IN (
			  'harvest_records',
			  'gate_check_records',
			  'companies',
			  'users',
			  'estates',
			  'divisions',
			  'blocks'
		  )
	`
	db.Raw(query).Scan(&rlsTablesCount)

	rlsEnabled := rlsTablesCount > 0

	return &generated.DatabaseHealthInfo{
		Connected:       connected,
		Version:         &version,
		ActiveConnections: &activeConnections,
		RlsEnabled:      rlsEnabled,
		RlsTablesCount:  &rlsTablesCount,
	}, nil
}

// Helper function to create int32 pointer
func int32Ptr(i int32) *int32 {
	return &i
}
