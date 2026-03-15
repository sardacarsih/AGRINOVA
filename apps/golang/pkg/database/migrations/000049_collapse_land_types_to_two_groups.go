package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000049CollapseLandTypesToTwoGroups merges land_types into two grouped types:
// TYPE_1 (Daratan, Rata, Bergelombang) and TYPE_2 (Berbukit, Rendahan, Gambut).
func Migration000049CollapseLandTypesToTwoGroups(db *gorm.DB) error {
	log.Println("Running migration: 000049_collapse_land_types_to_two_groups")

	if err := db.Exec(`
		INSERT INTO land_types (code, name, description, is_active, created_at, updated_at)
		VALUES
			('TYPE_1', 'Daratan, Rata, Bergelombang', 'Kelompok tipe lahan: Daratan, Rata, Bergelombang', TRUE, NOW(), NOW()),
			('TYPE_2', 'Berbukit, Rendahan, Gambut', 'Kelompok tipe lahan: Berbukit, Rendahan, Gambut', TRUE, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE
		SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			is_active = TRUE,
			updated_at = NOW();
	`).Error; err != nil {
		return err
	}

	isBaseTable, err := isTarifBlokBaseTable(db)
	if err != nil {
		return err
	}
	if !isBaseTable {
		log.Println("Migration 000049 skipped tarif_blok alignment: tarif_blok is not a base table")
		return nil
	}

	if err := db.Exec(`
		WITH target AS (
			SELECT
				(SELECT id FROM land_types WHERE code = 'TYPE_1' ORDER BY created_at DESC LIMIT 1) AS type_1_id,
				(SELECT id FROM land_types WHERE code = 'TYPE_2' ORDER BY created_at DESC LIMIT 1) AS type_2_id
		),
		source_map AS (
			SELECT lt.id AS source_id,
				CASE
					WHEN lt.code IN ('DARATAN', 'RATA', 'BERGELOMBANG') THEN t.type_1_id
					WHEN lt.code IN ('BERBUKIT', 'RENDAHAN', 'GAMBUT') THEN t.type_2_id
					ELSE NULL
				END AS target_id
			FROM land_types lt
			CROSS JOIN target t
		)
		UPDATE tarif_blok tb
		SET land_type_id = sm.target_id
		FROM source_map sm
		WHERE tb.land_type_id = sm.source_id
		  AND sm.target_id IS NOT NULL;

		WITH target AS (
			SELECT
				(SELECT id FROM land_types WHERE code = 'TYPE_1' ORDER BY created_at DESC LIMIT 1) AS type_1_id,
				(SELECT id FROM land_types WHERE code = 'TYPE_2' ORDER BY created_at DESC LIMIT 1) AS type_2_id
		),
		source_map AS (
			SELECT lt.id AS source_id,
				CASE
					WHEN lt.code IN ('DARATAN', 'RATA', 'BERGELOMBANG') THEN t.type_1_id
					WHEN lt.code IN ('BERBUKIT', 'RENDAHAN', 'GAMBUT') THEN t.type_2_id
					ELSE NULL
				END AS target_id
			FROM land_types lt
			CROSS JOIN target t
		)
		UPDATE blocks b
		SET land_type_id = sm.target_id
		FROM source_map sm
		WHERE b.land_type_id = sm.source_id
		  AND sm.target_id IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DELETE FROM land_types
		WHERE code IN ('DARATAN', 'RATA', 'BERGELOMBANG', 'BERBUKIT', 'RENDAHAN', 'GAMBUT');
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000049 completed: land_types collapsed to two grouped types")
	return nil
}
