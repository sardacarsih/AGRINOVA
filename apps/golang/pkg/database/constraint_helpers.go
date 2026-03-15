package database

import (
	"fmt"

	"gorm.io/gorm"
)

func databaseConstraintExists(db *gorm.DB, tableName string, constraintName string) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database is nil")
	}

	var exists bool
	if err := db.Raw(
		`
		SELECT EXISTS (
			SELECT 1
			FROM pg_constraint c
			JOIN pg_class t ON t.oid = c.conrelid
			WHERE c.conname = ? AND t.relname = ?
		)
		`,
		constraintName,
		tableName,
	).Scan(&exists).Error; err != nil {
		return false, fmt.Errorf("failed checking constraint %s on %s: %w", constraintName, tableName, err)
	}

	return exists, nil
}
