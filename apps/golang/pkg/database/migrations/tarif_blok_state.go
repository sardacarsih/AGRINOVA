package migrations

import "gorm.io/gorm"

func isTarifBlokBaseTable(db *gorm.DB) (bool, error) {
	var exists bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = 'tarif_blok'
			  AND table_type = 'BASE TABLE'
		)
	`).Scan(&exists).Error; err != nil {
		return false, err
	}
	return exists, nil
}
