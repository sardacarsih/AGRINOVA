package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000044OptimizeBkmReportIndexes adds indexes that target BKM report
// query patterns (filter by periode/pekerjaan, join by masterid, normalized
// lookups for estate/company/division/block reference mapping).
func Migration000044OptimizeBkmReportIndexes(db *gorm.DB) error {
	log.Println("Running migration: 000044_optimize_bkm_report_indexes")

	indexes := []string{
		// Core BKM report scan pattern: m.periode + join m.masterid=d.masterid + d.pekerjaan.
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_periode_masterid ON ais_bkmmaster (periode, masterid)",
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_periode_sort ON ais_bkmmaster (periode, estate, divisi, tanggal, masterid)",
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_periode_estate_norm ON ais_bkmmaster (periode, (UPPER(BTRIM(COALESCE(estate, '')))))",
		"CREATE INDEX IF NOT EXISTS idx_bkmdetail_pekerjaan_masterid_blok ON ais_bkmdetail (pekerjaan, masterid, blok)",

		// Normalized estate checks used by company/scoped EXISTS filters.
		"CREATE INDEX IF NOT EXISTS idx_estates_company_code_norm ON estates (company_id, (UPPER(BTRIM(COALESCE(code, '')))))",
		"CREATE INDEX IF NOT EXISTS idx_estates_company_name_norm ON estates (company_id, (UPPER(BTRIM(COALESCE(name, '')))))",

		// Normalized reference lookups used in lateral joins.
		"CREATE INDEX IF NOT EXISTS idx_companies_company_code_norm ON companies ((UPPER(BTRIM(COALESCE(company_code, '')))))",
		"CREATE INDEX IF NOT EXISTS idx_divisions_code_norm_id ON divisions ((UPPER(BTRIM(COALESCE(code, '')))), id)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_block_code_norm_division_id_id ON blocks ((UPPER(BTRIM(COALESCE(block_code, '')))), division_id, id)",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create BKM report index: %v", err)
		}
	}

	log.Println("Migration 000044 completed: bkm report indexes created")
	return nil
}
