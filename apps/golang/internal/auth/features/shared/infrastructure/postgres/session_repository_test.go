package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSessionRepositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Exec(`
		CREATE TABLE user_sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			device_id TEXT,
			session_token TEXT NOT NULL,
			refresh_token TEXT,
			platform TEXT NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			last_activity DATETIME,
			expires_at DATETIME,
			is_active BOOLEAN DEFAULT TRUE,
			login_method TEXT NOT NULL,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error)

	return db
}

func TestSessionRepository_RevokeExpiredSessions_OnlyTouchesActiveRows(t *testing.T) {
	db := setupSessionRepositoryTestDB(t)
	repo := NewSessionRepository(db)

	now := time.Now()
	activeUpdatedAt := now.Add(-2 * time.Hour)
	inactiveUpdatedAt := now.Add(-48 * time.Hour)

	require.NoError(t, db.Exec(`
		INSERT INTO user_sessions (
			id, user_id, session_token, platform, last_activity, expires_at,
			is_active, login_method, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"session-active-expired",
		"user-1",
		"active-expired-token",
		"WEB",
		now.Add(-2*time.Hour),
		now.Add(-1*time.Hour),
		true,
		"PASSWORD",
		now.Add(-72*time.Hour),
		activeUpdatedAt,
	).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO user_sessions (
			id, user_id, session_token, platform, last_activity, expires_at,
			is_active, login_method, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"session-inactive-expired",
		"user-2",
		"inactive-expired-token",
		"WEB",
		now.Add(-72*time.Hour),
		now.Add(-48*time.Hour),
		false,
		"PASSWORD",
		now.Add(-96*time.Hour),
		inactiveUpdatedAt,
	).Error)

	require.NoError(t, repo.RevokeExpiredSessions(context.Background()))

	var activeExpired SessionModel
	require.NoError(t, db.First(&activeExpired, "id = ?", "session-active-expired").Error)
	assert.False(t, activeExpired.IsActive)

	var inactiveExpired SessionModel
	require.NoError(t, db.First(&inactiveExpired, "id = ?", "session-inactive-expired").Error)
	assert.False(t, inactiveExpired.IsActive)
	assert.WithinDuration(t, inactiveUpdatedAt, inactiveExpired.UpdatedAt, time.Second)
}
