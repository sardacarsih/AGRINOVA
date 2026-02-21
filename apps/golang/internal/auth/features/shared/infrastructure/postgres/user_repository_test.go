package postgres

import (
	"context"
	"testing"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"log"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func stringPtr(s string) *string {
	return &s
}

func setupTestDB(t *testing.T) *gorm.DB {
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			LogLevel: logger.Info, // Log all SQL
		},
	)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: newLogger,
	})
	require.NoError(t, err)

	// Auto migrate tables
	err = db.AutoMigrate(&UserModel{}, &CompanyModel{}, &UserCompanyAssignmentModel{}, &UserEstateAssignmentModel{}, &UserDivisionAssignmentModel{})
	require.NoError(t, err)

	return db
}

func TestUserRepository_Create(t *testing.T) {
	// Arrange
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &domain.User{
		Username:  "testuser",
		Name:      "Test User",
		Email:     stringPtr("test@example.com"),
		Password:  "hashed-password",
		Role:      domain.RoleManager,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Assignments: []domain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "company-123",
				IsActive:  true,
			},
		},
	}

	// Act
	err := repo.Create(context.Background(), user)

	// Assert
	require.NoError(t, err)
	assert.NotEmpty(t, user.ID)
}

func TestUserRepository_FindByUsername(t *testing.T) {
	// Arrange
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &domain.User{
		Username: "testuser",
		Name:     "Test User",
		Role:     domain.RoleManager,
		IsActive: true,
		Assignments: []domain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "c1",
				IsActive:  true,
			},
		},
	}

	err := repo.Create(context.Background(), user)
	require.NoError(t, err)

	// Act
	found, err := repo.FindByUsername(context.Background(), "testuser")

	// Assert
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, user.Username, found.Username)
	assert.Equal(t, "Test User", found.Name)
	assert.Equal(t, user.Role, found.Role)
}

func TestUserRepository_FindByIdentifier(t *testing.T) {
	// Arrange
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &domain.User{
		Username: "testuser",
		Email:    stringPtr("test@example.com"),
		Name:     "Test User",
		Role:     domain.RoleManager,
		IsActive: true,
		Assignments: []domain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "c1",
				IsActive:  true,
			},
		},
	}

	err := repo.Create(context.Background(), user)
	require.NoError(t, err)

	// Act - Find by username
	found1, err := repo.FindByIdentifier(context.Background(), "testuser")
	require.NoError(t, err)
	assert.NotNil(t, found1)

	// Find by email
	found2, err := repo.FindByIdentifier(context.Background(), "test@example.com")
	require.NoError(t, err)
	assert.NotNil(t, found2)

	// Assert both found the same user
	assert.Equal(t, found1.ID, found2.ID)
}

func TestUserRepository_Update(t *testing.T) {
	// Arrange
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &domain.User{
		Username: "testuser",
		Name:     "Test User",
		Role:     domain.RoleManager,
		IsActive: true,
		Assignments: []domain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "c1",
				IsActive:  true,
			},
		},
	}

	err := repo.Create(context.Background(), user)
	require.NoError(t, err)

	// Act
	user.Name = "Updated User"

	err = repo.Update(context.Background(), user)

	// Assert
	require.NoError(t, err)

	updated, err := repo.FindByID(context.Background(), user.ID)
	require.NoError(t, err)
	assert.Equal(t, "Updated User", updated.Name)
}

func TestUserRepository_Update_PersistsCompanyAssignmentChanges(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &domain.User{
		Username: "multi-company-user",
		Name:     "Multi Company",
		Role:     domain.RoleAreaManager,
		IsActive: true,
		Assignments: []domain.Assignment{
			{ID: "assign-c1", CompanyID: "company-1", IsActive: true},
			{ID: "assign-c2", CompanyID: "company-2", IsActive: true},
			{ID: "assign-c3", CompanyID: "company-3", IsActive: true},
			{ID: "assign-c4", CompanyID: "company-4", IsActive: true},
		},
	}

	err := repo.Create(context.Background(), user)
	require.NoError(t, err)

	current, err := repo.FindByID(context.Background(), user.ID)
	require.NoError(t, err)
	require.NotNil(t, current)

	// Keep only company-1 and company-2 active.
	deactivated := 0
	for i := range current.Assignments {
		if current.Assignments[i].EstateID != nil || current.Assignments[i].DivisionID != nil {
			continue
		}
		if current.Assignments[i].ID == "assign-c3" || current.Assignments[i].ID == "assign-c4" {
			current.Assignments[i].IsActive = false
			current.Assignments[i].UpdatedAt = time.Now()
			deactivated++
		}
	}
	require.Equal(t, 2, deactivated)

	err = repo.Update(context.Background(), current)
	require.NoError(t, err)

	updated, err := repo.FindByID(context.Background(), user.ID)
	require.NoError(t, err)
	require.NotNil(t, updated)

	activeCompanies := make(map[string]bool)
	for _, assignment := range updated.Assignments {
		if assignment.EstateID != nil || assignment.DivisionID != nil {
			continue
		}
		if assignment.IsActive {
			activeCompanies[assignment.CompanyID] = true
		}
	}

	assert.Len(t, activeCompanies, 2)
	assert.True(t, activeCompanies["company-1"])
	assert.True(t, activeCompanies["company-2"])
	assert.False(t, activeCompanies["company-3"])
	assert.False(t, activeCompanies["company-4"])
}

func TestUserRepository_FindWithFilters(t *testing.T) {
	t.Log("Starting TestUserRepository_FindWithFilters")
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	// Create test users
	users := []*domain.User{
		{
			Username: "user1",
			Name:     "User One",
			Email:    stringPtr("user1@example.com"),
			Password: "password",
			Role:     domain.RoleManager,
			IsActive: true,
			Assignments: []domain.Assignment{
				{
					ID:        "assign-1",
					CompanyID: "company-1",
					IsActive:  true,
				},
			},
		},
		{
			Username: "user2",
			Name:     "User Two",
			Email:    stringPtr("user2@example.com"),
			Password: "password",
			Role:     domain.RoleAsisten,
			IsActive: true,
			Assignments: []domain.Assignment{
				{
					ID:        "assign-2",
					CompanyID: "company-1",
					IsActive:  true,
				},
			},
		},
		{
			Username: "user3",
			Name:     "User Three",
			Email:    stringPtr("user3@example.com"),
			Password: "password",
			Role:     domain.RoleManager,
			IsActive: false,
			Assignments: []domain.Assignment{
				{
					ID:        "assign-3",
					CompanyID: "company-2",
					IsActive:  true,
				},
			},
		},
	}

	for i, u := range users {
		err := repo.Create(context.Background(), u)
		if err != nil {
			t.Logf("Failed to create user %d: %v", i, err)
			t.Fail()
		}
	}
	// Explicitly mark user3 inactive in sqlite test DB.
	err := db.Model(&UserModel{}).Where("username = ?", "user3").Update("is_active", false).Error
	require.NoError(t, err)
	t.Log("Users created successfully")

	// Test filter by company
	companyID := "company-1"
	t.Logf("Filtering by company: %s", companyID)
	usersFound, total, err := repo.FindWithFilters(context.Background(), domain.UserFilters{
		CompanyID: &companyID,
	})

	if err != nil {
		t.Logf("Error finding users by company: %v", err)
	}
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, usersFound, 2)
	t.Log("Filter by company passed")

	// Test filter by role
	roleManager := domain.RoleManager
	t.Logf("Filtering by role: %s", roleManager)
	usersFound, total, err = repo.FindWithFilters(context.Background(), domain.UserFilters{
		Role: &roleManager,
	})

	if err != nil {
		t.Logf("Error finding users by role: %v", err)
	}
	require.NoError(t, err)
	assert.Equal(t, int64(2), total) // user1 and user3
	assert.Len(t, usersFound, 2)
	t.Log("Filter by role passed")

	// Test filter by active status
	isActive := true
	t.Logf("Filtering by active status: %v", isActive)
	usersFound, total, err = repo.FindWithFilters(context.Background(), domain.UserFilters{
		IsActive: &isActive,
	})

	if err != nil {
		t.Logf("Error finding users by status: %v", err)
	}
	require.NoError(t, err)
	assert.Equal(t, int64(2), total) // user1 and user2
	assert.Len(t, usersFound, 2)
	t.Log("Filter by status passed")

	// Test search
	search := "User One"
	t.Logf("Searching for: %s", search)
	usersFound, total, err = repo.FindWithFilters(context.Background(), domain.UserFilters{
		Search: &search,
	})

	if err != nil {
		t.Logf("Error searching users: %v", err)
	}
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, usersFound, 1)
	assert.Equal(t, "user1", usersFound[0].Username)
	// ... previous code ...
}

func TestUserRepository_FindWithFilters_Duplicates(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	// User with multiple assignments
	user := &domain.User{
		Username: "duplicate_test",
		Name:     "Duplicate Test",
		Role:     domain.RoleManager,
		IsActive: true,
		Assignments: []domain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "company-1",
				IsActive:  true,
			},
			{
				ID:        "assign-2",
				CompanyID: "company-1",
				IsActive:  true,
			},
		},
	}

	err := repo.Create(context.Background(), user)
	require.NoError(t, err)

	// Search that triggers join
	companyID := "company-1"
	usersFound, total, err := repo.FindWithFilters(context.Background(), domain.UserFilters{
		CompanyID: &companyID,
	})

	require.NoError(t, err)
	assert.Equal(t, int64(1), total, "Should only find 1 unique user")
	assert.Len(t, usersFound, 1, "Should only return 1 unique user")
}

func TestUserRepository_Delete_AllowsDeleteWhenNoTransactionsAndCleansDependencies(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT
		)
	`).Error
	require.NoError(t, err)

	user := &domain.User{
		Username: "delete-me",
		Name:     "Delete Me",
		Role:     domain.RoleMandor,
		IsActive: true,
		Assignments: []domain.Assignment{
			{ID: "assign-company", CompanyID: "company-1", IsActive: true},
			{ID: "assign-estate", CompanyID: "company-1", EstateID: stringPtr("estate-1"), IsActive: true},
			{ID: "assign-division", CompanyID: "company-1", DivisionID: stringPtr("division-1"), IsActive: true},
		},
	}
	err = repo.Create(context.Background(), user)
	require.NoError(t, err)

	err = db.Exec("INSERT INTO user_sessions (id, user_id) VALUES (?, ?)", "session-1", user.ID).Error
	require.NoError(t, err)

	err = repo.Delete(context.Background(), user.ID)
	require.NoError(t, err)

	var usersCount int64
	err = db.Table("users").Where("id = ?", user.ID).Count(&usersCount).Error
	require.NoError(t, err)
	assert.Equal(t, int64(0), usersCount)

	var companyAssignments int64
	err = db.Table("user_company_assignments").Where("user_id = ?", user.ID).Count(&companyAssignments).Error
	require.NoError(t, err)
	assert.Equal(t, int64(0), companyAssignments)

	var estateAssignments int64
	err = db.Table("user_estate_assignments").Where("user_id = ?", user.ID).Count(&estateAssignments).Error
	require.NoError(t, err)
	assert.Equal(t, int64(0), estateAssignments)

	var divisionAssignments int64
	err = db.Table("user_division_assignments").Where("user_id = ?", user.ID).Count(&divisionAssignments).Error
	require.NoError(t, err)
	assert.Equal(t, int64(0), divisionAssignments)

	var sessionCount int64
	err = db.Table("user_sessions").Where("user_id = ?", user.ID).Count(&sessionCount).Error
	require.NoError(t, err)
	assert.Equal(t, int64(0), sessionCount)
}

func TestUserRepository_Delete_BlocksMandorWithHarvestTransactions(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	err := db.Exec(`
		CREATE TABLE IF NOT EXISTS harvest_records (
			id TEXT PRIMARY KEY,
			mandor_id TEXT,
			approved_by TEXT,
			deleted_at DATETIME
		)
	`).Error
	require.NoError(t, err)

	user := &domain.User{
		Username: "mandor-1",
		Name:     "Mandor 1",
		Role:     domain.RoleMandor,
		IsActive: true,
		Assignments: []domain.Assignment{
			{ID: "assign-company", CompanyID: "company-1", IsActive: true},
		},
	}
	err = repo.Create(context.Background(), user)
	require.NoError(t, err)

	err = db.Exec("INSERT INTO harvest_records (id, mandor_id) VALUES (?, ?)", "harvest-1", user.ID).Error
	require.NoError(t, err)

	err = repo.Delete(context.Background(), user.ID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "transaksi panen")

	stillExists, findErr := repo.FindByID(context.Background(), user.ID)
	require.NoError(t, findErr)
	require.NotNil(t, stillExists)
}

func TestSanity(t *testing.T) {
	t.Log("Sanity test passed")
}
