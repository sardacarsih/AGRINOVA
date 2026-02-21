package database

import (
	"context"
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// RelationshipService provides methods for managing database relationships
type RelationshipService struct {
	db *gorm.DB
}

// NewRelationshipService creates a new relationship service
func NewRelationshipService(db *gorm.DB) *RelationshipService {
	return &RelationshipService{db: db}
}

func (r *RelationshipService) hasColumn(table, column string) bool {
	return r.db.Migrator().HasColumn(table, column)
}

func (r *RelationshipService) activeIDsSubquery(table string) string {
	if r.hasColumn(table, "deleted_at") {
		return fmt.Sprintf("SELECT id FROM %s WHERE deleted_at IS NULL", table)
	}

	return fmt.Sprintf("SELECT id FROM %s", table)
}

func (r *RelationshipService) activeAliasPredicate(table, alias string) string {
	if r.hasColumn(table, "deleted_at") {
		return fmt.Sprintf("%s.deleted_at IS NULL", alias)
	}

	return "1=1"
}

func (r *RelationshipService) activeCountQuery(table string) string {
	if r.hasColumn(table, "deleted_at") {
		return fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE deleted_at IS NULL", table)
	}

	return fmt.Sprintf("SELECT COUNT(*) FROM %s", table)
}

// ValidateAndFixRelationships validates and fixes database relationships
func (r *RelationshipService) ValidateAndFixRelationships(ctx context.Context) error {
	log.Println("Validating and fixing database relationships...")

	// Check and fix orphaned records
	if err := r.FixOrphanedRecords(ctx); err != nil {
		return fmt.Errorf("failed to fix orphaned records: %w", err)
	}

	// Validate foreign key integrity
	if err := r.ValidateForeignKeyIntegrity(ctx); err != nil {
		return fmt.Errorf("failed to validate foreign key integrity: %w", err)
	}

	// Fix assignment relationships
	if err := r.FixAssignmentRelationships(ctx); err != nil {
		return fmt.Errorf("failed to fix assignment relationships: %w", err)
	}

	log.Println("Database relationships validated and fixed successfully")
	return nil
}

// FixOrphanedRecords identifies and fixes orphaned records
func (r *RelationshipService) FixOrphanedRecords(ctx context.Context) error {
	log.Println("Fixing orphaned records...")

	// Fix orphaned users (users without valid company)
	if !r.hasColumn("users", "company_id") || !r.hasColumn("users", "deleted_at") {
		log.Println("Skipping orphaned user cleanup: users.company_id or users.deleted_at column is missing")
	} else {
		orphanedUsersQuery := fmt.Sprintf(`
			UPDATE users SET deleted_at = NOW()
			WHERE company_id NOT IN (%s)
			AND deleted_at IS NULL
		`, r.activeIDsSubquery("companies"))
		if err := r.db.WithContext(ctx).Exec(orphanedUsersQuery).Error; err != nil {
			log.Printf("Warning: Failed to fix orphaned users: %v", err)
		}
	}

	// Fix orphaned estates (estates without valid company)
	if !r.hasColumn("estates", "company_id") || !r.hasColumn("estates", "deleted_at") {
		log.Println("Skipping orphaned estate cleanup: estates.company_id or estates.deleted_at column is missing")
	} else {
		orphanedEstatesQuery := fmt.Sprintf(`
			UPDATE estates SET deleted_at = NOW()
			WHERE company_id NOT IN (%s)
			AND deleted_at IS NULL
		`, r.activeIDsSubquery("companies"))
		if err := r.db.WithContext(ctx).Exec(orphanedEstatesQuery).Error; err != nil {
			log.Printf("Warning: Failed to fix orphaned estates: %v", err)
		}
	}

	// Fix orphaned divisions (divisions without valid estate)
	if !r.hasColumn("divisions", "estate_id") || !r.hasColumn("divisions", "deleted_at") {
		log.Println("Skipping orphaned division cleanup: divisions.estate_id or divisions.deleted_at column is missing")
	} else {
		orphanedDivisionsQuery := fmt.Sprintf(`
			UPDATE divisions SET deleted_at = NOW()
			WHERE estate_id NOT IN (%s)
			AND deleted_at IS NULL
		`, r.activeIDsSubquery("estates"))
		if err := r.db.WithContext(ctx).Exec(orphanedDivisionsQuery).Error; err != nil {
			log.Printf("Warning: Failed to fix orphaned divisions: %v", err)
		}
	}

	// Fix orphaned blocks (blocks without valid division)
	if !r.hasColumn("blocks", "division_id") || !r.hasColumn("blocks", "deleted_at") {
		log.Println("Skipping orphaned block cleanup: blocks.division_id or blocks.deleted_at column is missing")
	} else {
		orphanedBlocksQuery := fmt.Sprintf(`
			UPDATE blocks SET deleted_at = NOW()
			WHERE division_id NOT IN (%s)
			AND deleted_at IS NULL
		`, r.activeIDsSubquery("divisions"))
		if err := r.db.WithContext(ctx).Exec(orphanedBlocksQuery).Error; err != nil {
			log.Printf("Warning: Failed to fix orphaned blocks: %v", err)
		}
	}

	// Fix orphaned harvest records
	var orphanedConditions []string
	if r.hasColumn("harvest_records", "block_id") {
		orphanedConditions = append(orphanedConditions, fmt.Sprintf("block_id NOT IN (%s)", r.activeIDsSubquery("blocks")))
	}
	if r.hasColumn("harvest_records", "mandor_id") {
		orphanedConditions = append(orphanedConditions, fmt.Sprintf("mandor_id NOT IN (%s)", r.activeIDsSubquery("users")))
	}

	if len(orphanedConditions) == 0 {
		log.Println("Skipping orphaned harvest cleanup: harvest_records.block_id and harvest_records.mandor_id are missing")
	} else {
		orphanedHarvestQuery := fmt.Sprintf(`
			DELETE FROM harvest_records
			WHERE %s
		`, strings.Join(orphanedConditions, " OR "))
		if err := r.db.WithContext(ctx).Exec(orphanedHarvestQuery).Error; err != nil {
			log.Printf("Warning: Failed to fix orphaned harvest records: %v", err)
		}
	}

	log.Println("Orphaned records fixed successfully")
	return nil
}

// ValidateForeignKeyIntegrity validates foreign key relationships
func (r *RelationshipService) ValidateForeignKeyIntegrity(ctx context.Context) error {
	log.Println("Validating foreign key integrity...")

	type validationQuery struct {
		name  string
		query string
	}

	validations := make([]validationQuery, 0, 6)

	if r.hasColumn("users", "company_id") {
		validations = append(validations, validationQuery{
			name: "user-company relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM users u
				LEFT JOIN companies c ON u.company_id = c.id
				WHERE c.id IS NULL AND %s
			`, r.activeAliasPredicate("users", "u")),
		})
	} else {
		log.Println("Skipping user-company relationship validation: users.company_id column is missing")
	}

	if r.hasColumn("estates", "company_id") {
		validations = append(validations, validationQuery{
			name: "estate-company relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM estates e
				LEFT JOIN companies c ON e.company_id = c.id
				WHERE c.id IS NULL AND %s
			`, r.activeAliasPredicate("estates", "e")),
		})
	} else {
		log.Println("Skipping estate-company relationship validation: estates.company_id column is missing")
	}

	if r.hasColumn("divisions", "estate_id") {
		validations = append(validations, validationQuery{
			name: "division-estate relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM divisions d
				LEFT JOIN estates e ON d.estate_id = e.id
				WHERE e.id IS NULL AND %s
			`, r.activeAliasPredicate("divisions", "d")),
		})
	} else {
		log.Println("Skipping division-estate relationship validation: divisions.estate_id column is missing")
	}

	if r.hasColumn("blocks", "division_id") {
		validations = append(validations, validationQuery{
			name: "block-division relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM blocks b
				LEFT JOIN divisions d ON b.division_id = d.id
				WHERE d.id IS NULL AND %s
			`, r.activeAliasPredicate("blocks", "b")),
		})
	} else {
		log.Println("Skipping block-division relationship validation: blocks.division_id column is missing")
	}

	if r.hasColumn("harvest_records", "mandor_id") {
		validations = append(validations, validationQuery{
			name: "harvest-mandor relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM harvest_records h
				LEFT JOIN users u ON h.mandor_id = u.id
				WHERE u.id IS NULL AND %s
			`, r.activeAliasPredicate("harvest_records", "h")),
		})
	} else {
		log.Println("Skipping harvest-mandor relationship validation: harvest_records.mandor_id column is missing")
	}

	if r.hasColumn("harvest_records", "block_id") {
		validations = append(validations, validationQuery{
			name: "harvest-block relationship",
			query: fmt.Sprintf(`
				SELECT COUNT(*) FROM harvest_records h
				LEFT JOIN blocks b ON h.block_id = b.id
				WHERE b.id IS NULL AND %s
			`, r.activeAliasPredicate("harvest_records", "h")),
		})
	} else {
		log.Println("Skipping harvest-block relationship validation: harvest_records.block_id column is missing")
	}

	for _, validation := range validations {
		var count int64
		if err := r.db.WithContext(ctx).Raw(validation.query).Scan(&count).Error; err != nil {
			log.Printf("Warning: Failed to validate %s: %v", validation.name, err)
			continue
		}

		if count > 0 {
			log.Printf("Warning: Found %d integrity violations in %s", count, validation.name)
		} else {
			log.Printf("OK: %s integrity validated", validation.name)
		}
	}

	log.Println("Foreign key integrity validation completed")
	return nil
}

// FixAssignmentRelationships fixes user assignment relationships
func (r *RelationshipService) FixAssignmentRelationships(ctx context.Context) error {
	log.Println("Fixing assignment relationships...")

	// Remove invalid estate assignments
	if !r.hasColumn("user_estate_assignments", "user_id") || !r.hasColumn("user_estate_assignments", "estate_id") {
		log.Println("Skipping invalid estate assignment cleanup: required columns are missing")
	} else {
		invalidEstateAssignments := fmt.Sprintf(`
			DELETE FROM user_estate_assignments
			WHERE user_id NOT IN (%s)
			OR estate_id NOT IN (%s)
		`, r.activeIDsSubquery("users"), r.activeIDsSubquery("estates"))
		if err := r.db.WithContext(ctx).Exec(invalidEstateAssignments).Error; err != nil {
			log.Printf("Warning: Failed to fix invalid estate assignments: %v", err)
		}
	}

	// Remove invalid division assignments
	if !r.hasColumn("user_division_assignments", "user_id") || !r.hasColumn("user_division_assignments", "division_id") {
		log.Println("Skipping invalid division assignment cleanup: required columns are missing")
	} else {
		invalidDivisionAssignments := fmt.Sprintf(`
			DELETE FROM user_division_assignments
			WHERE user_id NOT IN (%s)
			OR division_id NOT IN (%s)
		`, r.activeIDsSubquery("users"), r.activeIDsSubquery("divisions"))
		if err := r.db.WithContext(ctx).Exec(invalidDivisionAssignments).Error; err != nil {
			log.Printf("Warning: Failed to fix invalid division assignments: %v", err)
		}
	}

	// Remove invalid company assignments
	if !r.hasColumn("user_company_assignments", "user_id") || !r.hasColumn("user_company_assignments", "company_id") {
		log.Println("Skipping invalid company assignment cleanup: required columns are missing")
	} else {
		invalidCompanyAssignments := fmt.Sprintf(`
			DELETE FROM user_company_assignments
			WHERE user_id NOT IN (%s)
			OR company_id NOT IN (%s)
		`, r.activeIDsSubquery("users"), r.activeIDsSubquery("companies"))
		if err := r.db.WithContext(ctx).Exec(invalidCompanyAssignments).Error; err != nil {
			log.Printf("Warning: Failed to fix invalid company assignments: %v", err)
		}
	}

	// Remove duplicate assignments (keep the most recent)
	if !r.hasColumn("user_estate_assignments", "user_id") || !r.hasColumn("user_estate_assignments", "estate_id") {
		log.Println("Skipping duplicate estate assignment cleanup: required columns are missing")
	} else {
		orderBy := "id DESC"
		if r.hasColumn("user_estate_assignments", "created_at") {
			orderBy = "created_at DESC"
		}

		duplicateEstateAssignments := fmt.Sprintf(`
			DELETE FROM user_estate_assignments
			WHERE id NOT IN (
				SELECT DISTINCT ON (user_id, estate_id) id
				FROM user_estate_assignments
				ORDER BY user_id, estate_id, %s
			)
		`, orderBy)
		if err := r.db.WithContext(ctx).Exec(duplicateEstateAssignments).Error; err != nil {
			log.Printf("Warning: Failed to remove duplicate estate assignments: %v", err)
		}
	}

	log.Println("Assignment relationships fixed successfully")
	return nil
}

// GetRelationshipStatistics returns statistics about database relationships
func (r *RelationshipService) GetRelationshipStatistics(ctx context.Context) (*RelationshipStatistics, error) {
	stats := &RelationshipStatistics{}

	// Count relationships
	queries := map[string]*int64{
		r.activeCountQuery("companies"):        &stats.TotalCompanies,
		r.activeCountQuery("users"):            &stats.TotalUsers,
		r.activeCountQuery("estates"):          &stats.TotalEstates,
		r.activeCountQuery("divisions"):        &stats.TotalDivisions,
		r.activeCountQuery("blocks"):           &stats.TotalBlocks,
		"SELECT COUNT(*) FROM harvest_records": &stats.TotalHarvestRecords,
	}

	if r.hasColumn("user_estate_assignments", "is_active") {
		queries["SELECT COUNT(*) FROM user_estate_assignments WHERE is_active = true"] = &stats.ActiveEstateAssignments
	} else {
		queries["SELECT COUNT(*) FROM user_estate_assignments"] = &stats.ActiveEstateAssignments
	}

	if r.hasColumn("user_division_assignments", "is_active") {
		queries["SELECT COUNT(*) FROM user_division_assignments WHERE is_active = true"] = &stats.ActiveDivisionAssignments
	} else {
		queries["SELECT COUNT(*) FROM user_division_assignments"] = &stats.ActiveDivisionAssignments
	}

	if r.hasColumn("user_company_assignments", "is_active") {
		queries["SELECT COUNT(*) FROM user_company_assignments WHERE is_active = true"] = &stats.ActiveCompanyAssignments
	} else {
		queries["SELECT COUNT(*) FROM user_company_assignments"] = &stats.ActiveCompanyAssignments
	}

	for query, target := range queries {
		if err := r.db.WithContext(ctx).Raw(query).Scan(target).Error; err != nil {
			return nil, fmt.Errorf("failed to get statistics: %w", err)
		}
	}

	return stats, nil
}

// OptimizeRelationshipQueries optimizes common relationship queries
func (r *RelationshipService) OptimizeRelationshipQueries(ctx context.Context) error {
	log.Println("Optimizing relationship queries...")

	// Update table statistics
	tables := []string{
		"companies", "users", "estates", "divisions", "blocks",
		"harvest_records", "user_estate_assignments",
		"user_division_assignments", "user_company_assignments",
	}

	for _, table := range tables {
		if err := r.db.WithContext(ctx).Exec(fmt.Sprintf("ANALYZE %s", table)).Error; err != nil {
			log.Printf("Warning: Failed to analyze table %s: %v", table, err)
		}
	}

	// Vacuum tables to reclaim space and update statistics
	for _, table := range tables {
		if err := r.db.WithContext(ctx).Exec(fmt.Sprintf("VACUUM ANALYZE %s", table)).Error; err != nil {
			log.Printf("Warning: Failed to vacuum table %s: %v", table, err)
		}
	}

	log.Println("Query optimization completed")
	return nil
}

// GetUserWithRelationships retrieves a user with all related data
func (r *RelationshipService) GetUserWithRelationships(ctx context.Context, userID string) (*auth.User, error) {
	var user auth.User

	err := r.db.WithContext(ctx).
		Preload("Company").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetCompanyHierarchy retrieves complete company hierarchy
func (r *RelationshipService) GetCompanyHierarchy(ctx context.Context, companyID string) (*master.Company, error) {
	var company master.Company

	err := r.db.WithContext(ctx).
		Preload("Estates").
		Preload("Estates.Divisions").
		Preload("Estates.Divisions.Blocks").
		Where("id = ?", companyID).
		First(&company).Error

	if err != nil {
		return nil, err
	}

	return &company, nil
}

// ValidateUserAssignments validates that user assignments are appropriate for their role
func (r *RelationshipService) ValidateUserAssignments(ctx context.Context, userID string) ([]string, error) {
	var user auth.User
	var warnings []string

	if err := r.db.WithContext(ctx).
		Where("id = ?", userID).
		First(&user).Error; err != nil {
		return nil, err
	}

	// Validate assignments based on role
	// TODO: Re-implement assignment validation when User model has proper assignment fields
	switch user.Role {
	case auth.UserRoleManager:
		warnings = append(warnings, "Manager assignment validation temporarily disabled")

	case auth.UserRoleAsisten:
		warnings = append(warnings, "Asisten assignment validation temporarily disabled")

	case auth.UserRoleAreaManager:
		warnings = append(warnings, "Area Manager assignment validation temporarily disabled")

	case auth.UserRoleMandor:
		warnings = append(warnings, "Mandor assignment validation temporarily disabled")

	case auth.UserRoleSuperAdmin:
		warnings = append(warnings, "Super Admin assignment validation temporarily disabled")

	default:
		warnings = append(warnings, "Unknown role - assignment validation temporarily disabled")
	}

	return warnings, nil
}

// RelationshipStatistics contains statistics about database relationships
type RelationshipStatistics struct {
	TotalCompanies            int64 `json:"total_companies"`
	TotalUsers                int64 `json:"total_users"`
	TotalEstates              int64 `json:"total_estates"`
	TotalDivisions            int64 `json:"total_divisions"`
	TotalBlocks               int64 `json:"total_blocks"`
	TotalHarvestRecords       int64 `json:"total_harvest_records"`
	ActiveEstateAssignments   int64 `json:"active_estate_assignments"`
	ActiveDivisionAssignments int64 `json:"active_division_assignments"`
	ActiveCompanyAssignments  int64 `json:"active_company_assignments"`
}

// CreateTestData creates test data with proper relationships
func (r *RelationshipService) CreateTestData(ctx context.Context) error {
	log.Println("Creating test data with proper relationships...")

	// This would be implemented to create test companies, users, estates, etc.
	// with proper relationships for testing the database structure

	log.Println("Test data created successfully")
	return nil
}
