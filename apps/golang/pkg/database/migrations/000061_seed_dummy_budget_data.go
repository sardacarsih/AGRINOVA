package migrations

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

// Migration000061SeedDummyBudgetData inserts dummy production budget records
// for all divisions in the current and previous 2 months, so the Manager
// Dashboard "Target Bulanan" widget displays realistic values.
func Migration000061SeedDummyBudgetData(db *gorm.DB) error {
	log.Println("Running migration: 000061_seed_dummy_budget_data")

	now := time.Now()
	periods := make([]string, 3)
	for i := 0; i < 3; i++ {
		t := now.AddDate(0, -i, 0)
		periods[i] = fmt.Sprintf("%04d-%02d", t.Year(), int(t.Month()))
	}

	// Find admin user to use as created_by
	var createdBy string
	if err := db.Raw(`
		SELECT id::text FROM users
		WHERE role IN ('SUPER_ADMIN','COMPANY_ADMIN','MANAGER')
		AND is_active = true
		ORDER BY
			CASE role WHEN 'SUPER_ADMIN' THEN 1 WHEN 'COMPANY_ADMIN' THEN 2 WHEN 'MANAGER' THEN 3 END,
			created_at ASC
		LIMIT 1
	`).Scan(&createdBy).Error; err != nil || createdBy == "" {
		log.Println("  Skipping budget seed — no admin user found")
		return nil
	}

	for _, period := range periods {
		if err := db.Exec(`
			INSERT INTO manager_division_production_budgets
				(id, division_id, period_month, target_ton, planned_cost, actual_cost, notes, created_by, workflow_status, override_approved, created_at, updated_at)
			SELECT
				gen_random_uuid(),
				d.id,
				?,
				-- Target between 50-200 ton, weighted by number of blocks in division
				GREATEST(50, LEAST(200, COALESCE(block_counts.cnt, 1) * 25.0)),
				-- Planned cost: target_ton * 1500000
				GREATEST(50, LEAST(200, COALESCE(block_counts.cnt, 1) * 25.0)) * 1500000,
				0,
				'Seed data — auto generated',
				?,
				'APPROVED',
				false,
				NOW(),
				NOW()
			FROM divisions d
			LEFT JOIN (
				SELECT division_id, COUNT(*) AS cnt
				FROM blocks
				GROUP BY division_id
			) block_counts ON block_counts.division_id = d.id
			WHERE NOT EXISTS (
				SELECT 1 FROM manager_division_production_budgets b
				WHERE b.division_id = d.id AND b.period_month = ?
			)
		`, period, createdBy, period).Error; err != nil {
			log.Printf("  Warning: failed to seed budgets for %s: %v", period, err)
			// Continue — non-critical
		}
	}

	var count int64
	db.Raw(`SELECT COUNT(*) FROM manager_division_production_budgets`).Scan(&count)
	log.Printf("Migration 000061 completed: %d total budget records", count)
	return nil
}
