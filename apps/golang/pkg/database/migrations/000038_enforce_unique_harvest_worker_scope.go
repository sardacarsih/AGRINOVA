package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000038EnforceUniqueHarvestWorkerScope enforces business uniqueness for harvest records:
// no duplicate worker on the same company + day + block.
func Migration000038EnforceUniqueHarvestWorkerScope(db *gorm.DB) error {
	log.Println("Running migration: 000038_enforce_unique_harvest_worker_scope")

	var hasDeletedAt bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'harvest_records'
				AND column_name = 'deleted_at'
		);
	`).Scan(&hasDeletedAt).Error; err != nil {
		return err
	}

	activeFilter := ""
	if hasDeletedAt {
		activeFilter = "AND deleted_at IS NULL"
	}

	// Keep one canonical row for each scoped business key before creating the unique index.
	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY
						company_id,
						(tanggal AT TIME ZONE 'Asia/Jakarta')::date,
						block_id,
						COALESCE(karyawan_id::text, NULLIF(LOWER(BTRIM(nik)), ''))
					ORDER BY
						CASE status
							WHEN 'APPROVED' THEN 0
							WHEN 'PENDING' THEN 1
							WHEN 'SYNCED' THEN 2
							ELSE 3
						END,
						approved_at DESC NULLS LAST,
						updated_at DESC NULLS LAST,
						created_at DESC NULLS LAST,
						id DESC
				) AS rn
			FROM harvest_records
			WHERE company_id IS NOT NULL
				AND tanggal IS NOT NULL
				AND block_id IS NOT NULL
				AND COALESCE(karyawan_id::text, NULLIF(LOWER(BTRIM(nik)), '')) IS NOT NULL
				` + activeFilter + `
		)
		DELETE FROM harvest_records hr
		USING ranked r
		WHERE hr.id = r.id
			AND r.rn > 1;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DROP INDEX IF EXISTS uq_harvest_records_company_date_block_worker;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_harvest_records_company_date_block_worker
		ON harvest_records (
			company_id,
			((tanggal AT TIME ZONE 'Asia/Jakarta')::date),
			block_id,
			COALESCE(karyawan_id::text, NULLIF(LOWER(BTRIM(nik)), ''))
		)
		WHERE company_id IS NOT NULL
			AND tanggal IS NOT NULL
			AND block_id IS NOT NULL
			AND COALESCE(karyawan_id::text, NULLIF(LOWER(BTRIM(nik)), '')) IS NOT NULL
			` + activeFilter + `;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000038 completed: harvest uniqueness is now scoped by company/date/block/worker")
	return nil
}
