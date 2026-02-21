package auth

import (
	"agrinovagraphql/server/internal/auth/internal/di"

	"gorm.io/gorm"
)

// AuthModule exposes the authentication module components
type AuthModule = di.AuthModule

// NewAuthModuleV2 initializes the new authentication module
func NewAuthModuleV2(db *gorm.DB) (*AuthModule, error) {
	return di.NewAuthModuleV2(db)
}
