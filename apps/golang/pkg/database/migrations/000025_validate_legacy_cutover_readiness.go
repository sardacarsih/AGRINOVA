package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration000025ValidateLegacyCutoverReadiness validates canonical/legacy parity
// before destructive legacy column removal.
func Migration000025ValidateLegacyCutoverReadiness(db *gorm.DB) error {
	log.Println("Running migration: 000025_validate_legacy_cutover_readiness")

	finalized, err := isLegacySchemaFinalized(db)
	if err != nil {
		return err
	}
	if finalized {
		log.Println("Migration 000025 skipped: legacy schema already finalized")
		return nil
	}

	var hasLegacyColumns bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'companies'
			  AND column_name = 'nama'
		);
	`).Scan(&hasLegacyColumns).Error; err != nil {
		return fmt.Errorf("migration 000025 failed checking legacy column presence: %w", err)
	}
	if !hasLegacyColumns {
		log.Println("Migration 000025 skipped: no legacy master columns detected")
		return nil
	}

	checks := []struct {
		name  string
		query string
	}{
		{
			name: "companies name/nama parity",
			query: `
				SELECT COUNT(*)
				FROM companies
				WHERE COALESCE(NULLIF(name, ''), '') <> COALESCE(NULLIF(nama, ''), '');
			`,
		},
		{
			name: "companies company_code/kode parity",
			query: `
				SELECT COUNT(*)
				FROM companies
				WHERE COALESCE(NULLIF(company_code, ''), '') <> COALESCE(NULLIF(kode, ''), '');
			`,
		},
		{
			name: "companies address/alamat parity",
			query: `
				SELECT COUNT(*)
				FROM companies
				WHERE COALESCE(NULLIF(address, ''), '') <> COALESCE(NULLIF(alamat, ''), '');
			`,
		},
		{
			name: "companies phone/telepon parity",
			query: `
				SELECT COUNT(*)
				FROM companies
				WHERE COALESCE(NULLIF(phone, ''), '') <> COALESCE(NULLIF(telepon, ''), '');
			`,
		},
		{
			name: "estates name/nama parity",
			query: `
				SELECT COUNT(*)
				FROM estates
				WHERE COALESCE(NULLIF(name, ''), '') <> COALESCE(NULLIF(nama, ''), '');
			`,
		},
		{
			name: "estates code/kode parity",
			query: `
				SELECT COUNT(*)
				FROM estates
				WHERE COALESCE(NULLIF(code, ''), '') <> COALESCE(NULLIF(kode, ''), '');
			`,
		},
		{
			name: "estates location/lokasi parity",
			query: `
				SELECT COUNT(*)
				FROM estates
				WHERE COALESCE(NULLIF(location, ''), '') <> COALESCE(NULLIF(lokasi, ''), '');
			`,
		},
		{
			name: "estates area_ha/luas_ha parity",
			query: `
				SELECT COUNT(*)
				FROM estates
				WHERE area_ha IS DISTINCT FROM luas_ha;
			`,
		},
		{
			name: "divisions name/nama parity",
			query: `
				SELECT COUNT(*)
				FROM divisions
				WHERE COALESCE(NULLIF(name, ''), '') <> COALESCE(NULLIF(nama, ''), '');
			`,
		},
		{
			name: "divisions code/kode parity",
			query: `
				SELECT COUNT(*)
				FROM divisions
				WHERE COALESCE(NULLIF(code, ''), '') <> COALESCE(NULLIF(kode, ''), '');
			`,
		},
		{
			name: "blocks name/nama parity",
			query: `
				SELECT COUNT(*)
				FROM blocks
				WHERE COALESCE(NULLIF(name, ''), '') <> COALESCE(NULLIF(nama, ''), '');
			`,
		},
		{
			name: "blocks block_code/kode_blok parity",
			query: `
				SELECT COUNT(*)
				FROM blocks
				WHERE COALESCE(NULLIF(block_code, ''), '') <> COALESCE(NULLIF(kode_blok, ''), '');
			`,
		},
		{
			name: "blocks area_ha/luas_ha parity",
			query: `
				SELECT COUNT(*)
				FROM blocks
				WHERE area_ha IS DISTINCT FROM luas_ha;
			`,
		},
		{
			name: "blocks crop_type/jenis_tanaman parity",
			query: `
				SELECT COUNT(*)
				FROM blocks
				WHERE COALESCE(NULLIF(crop_type, ''), '') <> COALESCE(NULLIF(jenis_tanaman, ''), '');
			`,
		},
		{
			name: "blocks planting_year/tahun_tanam parity",
			query: `
				SELECT COUNT(*)
				FROM blocks
				WHERE planting_year IS DISTINCT FROM tahun_tanam;
			`,
		},
	}

	for _, check := range checks {
		var mismatchCount int64
		if err := db.Raw(check.query).Scan(&mismatchCount).Error; err != nil {
			return fmt.Errorf("migration 000025 failed to run check %q: %w", check.name, err)
		}
		if mismatchCount > 0 {
			return fmt.Errorf("migration 000025 parity check failed for %q: %d mismatched rows", check.name, mismatchCount)
		}
	}

	log.Println("Migration 000025 completed: cutover parity checks passed")
	return nil
}
