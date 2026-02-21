package postgres

import (
	"context"
	"testing"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserRepository_DeletedCompanyDoesNotBreakUserLoading(t *testing.T) {
	// Arrange
	db := setupTestDB(t)
	// ENABLE DEBUG LOGGING
	db = db.Debug()
	repo := NewUserRepository(db)

	// 1. Create a Company
	company := &CompanyModel{
		ID:        "company-soft-deleted",
		Name:      "Deleted Corp",
		Status:    "ACTIVE",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	err := db.Create(company).Error
	require.NoError(t, err)

	// 2. Delete the company
	err = db.Delete(company).Error
	require.NoError(t, err)

	// 3. Create a User assigned to that Company
	user := &domain.User{
		Username:  "manager_deleted_company",
		Name:      "Manager Deleted",
		Email:     stringPtr("manager_del@example.com"),
		Password:  "secret",
		Role:      domain.RoleManager,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Assignments: []domain.Assignment{
			{
				ID:        "assign-del",
				CompanyID: company.ID,
				IsActive:  true,
			},
		},
	}

	err = repo.Create(context.Background(), user)
	require.NoError(t, err)

	// Act
	// 4. Find with filters
	users, _, err := repo.FindWithFilters(context.Background(), domain.UserFilters{})
	require.NoError(t, err)
	require.Len(t, users, 1)

	foundUser := users[0]

	// Assert
	// 5. Check assignment still exists and user loading does not fail
	require.NotEmpty(t, foundUser.Assignments)
	assignment := foundUser.Assignments[0]

	assert.Equal(t, company.ID, assignment.CompanyID)
	assert.Nil(t, assignment.Company, "Company should be nil when referenced row is deleted")
}
