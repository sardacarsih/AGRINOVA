package models

import "time"

// PasswordReset stores one-time password reset tokens in hashed form.
type PasswordReset struct {
	ID        string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string     `json:"user_id" gorm:"type:uuid;not null;index"`
	TokenHash string     `json:"token_hash" gorm:"type:char(64);not null;uniqueIndex"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null;index"`
	UsedAt    *time.Time `json:"used_at" gorm:"index"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
}

// TableName returns the database table name for PasswordReset.
func (PasswordReset) TableName() string {
	return "password_resets"
}
