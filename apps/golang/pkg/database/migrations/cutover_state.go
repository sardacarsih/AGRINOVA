package migrations

import "gorm.io/gorm"

const legacySchemaCutoverName = "legacy_master_schema"
const legacyUserSchemaCutoverName = "legacy_user_schema"

func ensureCutoverStateTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_cutover_state (
			name VARCHAR(100) PRIMARY KEY,
			is_finalized BOOLEAN NOT NULL DEFAULT false,
			finalized_at TIMESTAMPTZ
		);
	`).Error
}

func isCutoverFinalized(db *gorm.DB, cutoverName string) (bool, error) {
	if err := ensureCutoverStateTable(db); err != nil {
		return false, err
	}

	var finalized bool
	if err := db.Raw(`
		SELECT COALESCE(
			(
				SELECT is_finalized
				FROM schema_cutover_state
				WHERE name = ?
			),
			false
		);
	`, cutoverName).Scan(&finalized).Error; err != nil {
		return false, err
	}

	return finalized, nil
}

func markCutoverFinalized(db *gorm.DB, cutoverName string) error {
	if err := ensureCutoverStateTable(db); err != nil {
		return err
	}

	return db.Exec(`
		INSERT INTO schema_cutover_state (name, is_finalized, finalized_at)
		VALUES (?, true, NOW())
		ON CONFLICT (name)
		DO UPDATE SET
			is_finalized = EXCLUDED.is_finalized,
			finalized_at = EXCLUDED.finalized_at;
	`, cutoverName).Error
}

func isLegacySchemaFinalized(db *gorm.DB) (bool, error) {
	return isCutoverFinalized(db, legacySchemaCutoverName)
}

func markLegacySchemaFinalized(db *gorm.DB) error {
	return markCutoverFinalized(db, legacySchemaCutoverName)
}

func isLegacyUserSchemaFinalized(db *gorm.DB) (bool, error) {
	return isCutoverFinalized(db, legacyUserSchemaCutoverName)
}

func markLegacyUserSchemaFinalized(db *gorm.DB) error {
	return markCutoverFinalized(db, legacyUserSchemaCutoverName)
}
