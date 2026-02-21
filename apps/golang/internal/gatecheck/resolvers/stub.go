package resolvers

import (
	"agrinovagraphql/server/internal/middleware"
	"gorm.io/gorm"
)

// GateCheckResolver is a placeholder resolver.
// The main implementation is disabled due to missing GraphQL types in the schema.
type GateCheckResolver struct {
	db             *gorm.DB
	authMiddleware *middleware.AuthMiddleware
}

// NewGateCheckResolver creates a new GateCheckResolver placeholder.
func NewGateCheckResolver(db *gorm.DB, authMiddleware *middleware.AuthMiddleware) *GateCheckResolver {
	return &GateCheckResolver{
		db:             db,
		authMiddleware: authMiddleware,
	}
}
