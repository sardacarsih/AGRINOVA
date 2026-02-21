package services

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// HierarchyService handles user hierarchy operations based on managerId
type HierarchyService struct {
	db *gorm.DB
}

// NewHierarchyService creates a new hierarchy service
func NewHierarchyService(db *gorm.DB) *HierarchyService {
	return &HierarchyService{db: db}
}

// GetParent returns the manager (Asisten) for a given user (Mandor)
// Uses User.manager_id field to find the parent
func (s *HierarchyService) GetParent(ctx context.Context, userID string) (*auth.User, error) {
	// First get the user's manager_id
	var user struct {
		ManagerID *string
	}
	err := s.db.WithContext(ctx).
		Table("users").
		Select("manager_id").
		Where("id = ? AND is_active = true", userID).
		First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if user.ManagerID == nil || *user.ManagerID == "" {
		return nil, nil // No parent
	}

	// Get the parent user
	var parent auth.User
	err = s.db.WithContext(ctx).
		Where("id = ? AND is_active = true", *user.ManagerID).
		First(&parent).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get parent user: %w", err)
	}

	return &parent, nil
}

// GetChildren returns all users that have the given user as their manager
// For an Asisten, this returns all their Mandors
func (s *HierarchyService) GetChildren(ctx context.Context, managerID string) ([]*auth.User, error) {
	var children []*auth.User
	err := s.db.WithContext(ctx).
		Where("manager_id = ? AND is_active = true", managerID).
		Find(&children).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get children: %w", err)
	}
	return children, nil
}

// GetChildrenByRole returns children filtered by role
func (s *HierarchyService) GetChildrenByRole(ctx context.Context, managerID string, role auth.UserRole) ([]*auth.User, error) {
	var children []*auth.User
	err := s.db.WithContext(ctx).
		Where("manager_id = ? AND role = ? AND is_active = true", managerID, role).
		Find(&children).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get children by role: %w", err)
	}
	return children, nil
}

// ValidateHierarchy checks if parentID is the actual manager of childID
func (s *HierarchyService) ValidateHierarchy(ctx context.Context, parentID, childID string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Table("users").
		Where("id = ? AND manager_id = ? AND is_active = true", childID, parentID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetUserTokens returns all active FCM tokens for a user
func (s *HierarchyService) GetUserTokens(ctx context.Context, userID string) ([]string, error) {
	var tokens []string
	err := s.db.WithContext(ctx).
		Table("user_device_tokens").
		Select("token").
		Where("user_id = ? AND is_active = true AND deleted_at IS NULL", userID).
		Pluck("token", &tokens).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get tokens: %w", err)
	}
	return tokens, nil
}

// GetMultipleUserTokens returns FCM tokens for multiple users
func (s *HierarchyService) GetMultipleUserTokens(ctx context.Context, userIDs []string) ([]string, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}

	var tokens []string
	err := s.db.WithContext(ctx).
		Table("user_device_tokens").
		Select("token").
		Where("user_id IN ? AND is_active = true AND deleted_at IS NULL", userIDs).
		Pluck("token", &tokens).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get tokens: %w", err)
	}
	return tokens, nil
}

// RegisterDeviceToken registers or updates an FCM token for a user
func (s *HierarchyService) RegisterDeviceToken(ctx context.Context, userID, token, platform, deviceID string) error {
	// Check if token already exists
	var existing models.UserDeviceToken
	err := s.db.WithContext(ctx).
		Where("token = ?", token).
		First(&existing).Error

	if err == nil {
		// Token exists, update it if user is different
		if existing.UserID != userID {
			existing.UserID = userID
			existing.Platform = platform
			existing.DeviceID = deviceID
			existing.IsActive = true
			return s.db.WithContext(ctx).Save(&existing).Error
		}
		// Same user, just ensure it's active
		return s.db.WithContext(ctx).
			Model(&existing).
			Updates(map[string]interface{}{
				"is_active":  true,
				"platform":   platform,
				"device_id":  deviceID,
				"updated_at": s.db.NowFunc(),
			}).Error
	}

	if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check existing token: %w", err)
	}

	// Create new token
	newToken := models.UserDeviceToken{
		UserID:   userID,
		Token:    token,
		Platform: platform,
		DeviceID: deviceID,
		IsActive: true,
	}
	return s.db.WithContext(ctx).Create(&newToken).Error
}

// UnregisterDeviceToken removes an FCM token
func (s *HierarchyService) UnregisterDeviceToken(ctx context.Context, token string) error {
	return s.db.WithContext(ctx).
		Where("token = ?", token).
		Delete(&models.UserDeviceToken{}).Error
}

// DeactivateUserTokens deactivates all tokens for a user (on logout)
func (s *HierarchyService) DeactivateUserTokens(ctx context.Context, userID string) error {
	return s.db.WithContext(ctx).
		Model(&models.UserDeviceToken{}).
		Where("user_id = ?", userID).
		Update("is_active", false).Error
}

// CleanupInvalidTokens removes tokens that failed to send
func (s *HierarchyService) CleanupInvalidTokens(ctx context.Context, tokens []string) error {
	if len(tokens) == 0 {
		return nil
	}
	return s.db.WithContext(ctx).
		Where("token IN ?", tokens).
		Delete(&models.UserDeviceToken{}).Error
}
