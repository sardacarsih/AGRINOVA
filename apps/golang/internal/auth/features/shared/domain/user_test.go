package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUser_ToUserDTO(t *testing.T) {
	// Arrange
	user := &User{
		ID:                 "user-123",
		Username:           "testuser",
		Name:               "Test User",
		Email:              stringPtr("test@example.com"),
		PhoneNumber:        stringPtr("+62812345678"),
		Password:           "hashed-password",
		Role:               RoleManager,
		IsActive:           true,
		CompanyID:          "company-123",
		LanguagePreference: stringPtr("id"),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Act
	dto := ToUserDTO(user)

	// Assert
	require.NotNil(t, dto)
	assert.Equal(t, user.ID, dto.ID)
	assert.Equal(t, user.Username, dto.Username)
	assert.Equal(t, user.Name, dto.Name)
	assert.Equal(t, user.Email, dto.Email)
	assert.Equal(t, user.PhoneNumber, dto.PhoneNumber)
	assert.Equal(t, user.Role, dto.Role)
	assert.Equal(t, user.IsActive, dto.IsActive)
	assert.Equal(t, user.CompanyID, dto.CompanyID)
	assert.Equal(t, user.LanguagePreference, dto.LanguagePreference)
}

func TestCompany_ToCompanyDTO(t *testing.T) {
	// Arrange
	company := &Company{
		ID:      "company-123",
		Name:    "Test Company",
		Status:  "ACTIVE",
		Address: stringPtr("Test Address"),
		Phone:   stringPtr("+62812345678"),
	}

	// Act
	dto := ToCompanyDTO(company)

	// Assert
	require.NotNil(t, dto)
	assert.Equal(t, company.ID, dto.ID)
	assert.Equal(t, company.Name, dto.Name)
	assert.Equal(t, company.Status, dto.Status)
	assert.Equal(t, company.Address, dto.Address)
	assert.Equal(t, company.Phone, dto.Phone)
}

func TestRole_String(t *testing.T) {
	// Arrange & Act & Assert
	assert.Equal(t, "SUPER_ADMIN", string(RoleSuperAdmin))
	assert.Equal(t, "COMPANY_ADMIN", string(RoleCompanyAdmin))
	assert.Equal(t, "AREA_MANAGER", string(RoleAreaManager))
	assert.Equal(t, "MANAGER", string(RoleManager))
	assert.Equal(t, "ASISTEN", string(RoleAsisten))
	assert.Equal(t, "MANDOR", string(RoleMandor))
	assert.Equal(t, "SATPAM", string(RoleSatpam))
}

func TestPlatformType_String(t *testing.T) {
	// Arrange & Act & Assert
	assert.Equal(t, "WEB", string(PlatformWeb))
	assert.Equal(t, "ANDROID", string(PlatformAndroid))
	assert.Equal(t, "IOS", string(PlatformIOS))
}

func TestSecurityEvent_Fields(t *testing.T) {
	// Arrange
	now := time.Now()
	details := map[string]interface{}{
		"test":  true,
		"count": 42,
	}

	event := &SecurityEvent{
		ID:        "event-123",
		UserID:    stringPtr("user-123"),
		Event:     EventLoginSuccess,
		IPAddress: "127.0.0.1",
		UserAgent: "test-agent",
		Details:   details,
		CreatedAt: now,
	}

	// Assert
	assert.Equal(t, "event-123", event.ID)
	assert.Equal(t, "user-123", *event.UserID)
	assert.Equal(t, EventLoginSuccess, event.Event)
	assert.Equal(t, "127.0.0.1", event.IPAddress)
	assert.Equal(t, "test-agent", event.UserAgent)
	assert.Equal(t, details, event.Details)
	assert.Equal(t, now, event.CreatedAt)
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
