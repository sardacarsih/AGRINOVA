package database

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	
	"agrinovagraphql/server/internal/graphql/generated"
)

// TestDatabaseRelationships tests database relationship integrity
func TestDatabaseRelationships(t *testing.T) {
	// Setup in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: false,
	})
	require.NoError(t, err)

	// Run migrations
	err = AutoMigrateWithGORM(db)
	require.NoError(t, err)

	ctx := context.Background()
	service := NewRelationshipService(db)

	t.Run("CreateCompanyWithRelationships", func(t *testing.T) {
		// Create company
		company := &generated.Company{
			Nama:   "Test Company",
			Alamat: stringPtr("Test Address"),
			Status: generated.CompanyStatusActive,
		}
		
		err := db.WithContext(ctx).Create(company).Error
		require.NoError(t, err)
		assert.NotEmpty(t, company.ID)

		// Create user with company relationship
		user := &generated.User{
			Username:  "testuser",
			Nama:      "Test User",
			Email:     stringPtr("test@example.com"),
			Password:  "hashedpassword",
			Role:      generated.UserRoleManager,
			CompanyID: company.ID,
			IsActive:  true,
		}
		
		err = db.WithContext(ctx).Create(user).Error
		require.NoError(t, err)
		assert.NotEmpty(t, user.ID)

		// Verify relationship
		var retrievedUser generated.User
		err = db.WithContext(ctx).Preload("Company").First(&retrievedUser, user.ID).Error
		require.NoError(t, err)
		assert.Equal(t, company.ID, retrievedUser.CompanyID)
		assert.NotNil(t, retrievedUser.Company)
		assert.Equal(t, company.Nama, retrievedUser.Company.Nama)
	})

	t.Run("CreateEstateHierarchy", func(t *testing.T) {
		// Create company first
		company := &generated.Company{
			Nama:   "Estate Company",
			Status: generated.CompanyStatusActive,
		}
		err := db.WithContext(ctx).Create(company).Error
		require.NoError(t, err)

		// Create estate
		estate := &generated.Estate{
			Nama:      "Test Estate",
			Lokasi:    stringPtr("Test Location"),
			LuasHa:    float64Ptr(100.5),
			CompanyID: company.ID,
		}
		err = db.WithContext(ctx).Create(estate).Error
		require.NoError(t, err)

		// Create division
		division := &generated.Division{
			Nama:     "Test Division",
			Kode:     "DIV001",
			EstateID: estate.ID,
		}
		err = db.WithContext(ctx).Create(division).Error
		require.NoError(t, err)

		// Create block
		block := &generated.Block{
			KodeBlok:     "BLK001",
			Nama:         "Test Block",
			LuasHa:       float64Ptr(25.0),
			JenisTanaman: stringPtr("Kelapa Sawit"),
			TahunTanam:   int32Ptr(2020),
			DivisionID:   division.ID,
		}
		err = db.WithContext(ctx).Create(block).Error
		require.NoError(t, err)

		// Verify complete hierarchy
		var retrievedBlock generated.Block
		err = db.WithContext(ctx).
			Preload("Division").
			Preload("Division.Estate").
			Preload("Division.Estate.Company").
			First(&retrievedBlock, block.ID).Error
		require.NoError(t, err)

		assert.Equal(t, division.ID, retrievedBlock.DivisionID)
		assert.Equal(t, estate.ID, retrievedBlock.Division.EstateID)
		assert.Equal(t, company.ID, retrievedBlock.Division.Estate.CompanyID)
		assert.Equal(t, "Estate Company", retrievedBlock.Division.Estate.Company.Nama)
	})

	t.Run("CreateUserAssignments", func(t *testing.T) {
		// Create company, user, and estate
		company := &generated.Company{
			Nama:   "Assignment Company",
			Status: generated.CompanyStatusActive,
		}
		err := db.WithContext(ctx).Create(company).Error
		require.NoError(t, err)

		user := &generated.User{
			Username:  "manager",
			Nama:      "Test Manager",
			Password:  "hashedpassword",
			Role:      generated.UserRoleManager,
			CompanyID: company.ID,
			IsActive:  true,
		}
		err = db.WithContext(ctx).Create(user).Error
		require.NoError(t, err)

		estate := &generated.Estate{
			Nama:      "Assigned Estate",
			CompanyID: company.ID,
		}
		err = db.WithContext(ctx).Create(estate).Error
		require.NoError(t, err)

		// Create estate assignment
		assignment := &generated.UserEstateAssignment{
			UserID:     user.ID,
			EstateID:   estate.ID,
			IsActive:   true,
			AssignedBy: user.ID,
			AssignedAt: time.Now(),
		}
		err = db.WithContext(ctx).Create(assignment).Error
		require.NoError(t, err)

		// Verify assignment with relationships
		var retrievedAssignment generated.UserEstateAssignment
		err = db.WithContext(ctx).
			Preload("User").
			Preload("Estate").
			First(&retrievedAssignment, assignment.ID).Error
		require.NoError(t, err)

		assert.Equal(t, user.ID, retrievedAssignment.UserID)
		assert.Equal(t, estate.ID, retrievedAssignment.EstateID)
		assert.True(t, retrievedAssignment.IsActive)
		assert.Equal(t, "Test Manager", retrievedAssignment.User.Nama)
		assert.Equal(t, "Assigned Estate", retrievedAssignment.Estate.Nama)
	})

	t.Run("CreateHarvestRecord", func(t *testing.T) {
		// Setup hierarchy
		company := createTestCompany(t, db, ctx, "Harvest Company")
		estate := createTestEstate(t, db, ctx, "Harvest Estate", company.ID)
		division := createTestDivision(t, db, ctx, "Harvest Division", estate.ID)
		block := createTestBlock(t, db, ctx, "Harvest Block", division.ID)
		mandor := createTestUser(t, db, ctx, "mandor", "Test Mandor", generated.UserRoleMandor, company.ID)

		// Create harvest record
		harvest := &generated.HarvestRecord{
			Tanggal:       time.Now(),
			MandorID:      mandor.ID,
			BlockID:       block.ID,
			Karyawan:      "Test Worker",
			BeratTbs:      150.5,
			JumlahJanjang: 25,
			Status:        generated.HarvestStatusPending,
		}
		err := db.WithContext(ctx).Create(harvest).Error
		require.NoError(t, err)

		// Verify harvest with relationships
		var retrievedHarvest generated.HarvestRecord
		err = db.WithContext(ctx).
			Preload("Mandor").
			Preload("Block").
			Preload("Block.Division").
			Preload("Block.Division.Estate").
			Preload("Block.Division.Estate.Company").
			First(&retrievedHarvest, harvest.ID).Error
		require.NoError(t, err)

		assert.Equal(t, mandor.ID, retrievedHarvest.MandorID)
		assert.Equal(t, block.ID, retrievedHarvest.BlockID)
		assert.Equal(t, "Test Mandor", retrievedHarvest.Mandor.Nama)
		assert.Equal(t, "Harvest Block", retrievedHarvest.Block.Nama)
		assert.True(t, retrievedHarvest.IsPending())
		assert.False(t, retrievedHarvest.IsApproved())
	})

	t.Run("ValidateRelationshipIntegrity", func(t *testing.T) {
		// Test relationship service
		err := service.ValidateAndFixRelationships(ctx)
		assert.NoError(t, err)

		// Get statistics
		stats, err := service.GetRelationshipStatistics(ctx)
		require.NoError(t, err)
		assert.NotNil(t, stats)
		
		// Should have data from previous tests
		assert.Greater(t, stats.TotalCompanies, int64(0))
		assert.Greater(t, stats.TotalUsers, int64(0))
	})

	t.Run("TestUserBusinessMethods", func(t *testing.T) {
		user := &generated.User{
			Role: generated.UserRoleAsisten,
		}

		assert.True(t, user.IsAsisten())
		assert.False(t, user.IsManager())
		assert.True(t, user.CanApproveHarvest())

		managerUser := &generated.User{
			Role: generated.UserRoleManager,
		}

		assert.True(t, managerUser.IsManager())
		assert.False(t, managerUser.IsAsisten())
		assert.True(t, managerUser.CanApproveHarvest())

		mandorUser := &generated.User{
			Role: generated.UserRoleMandor,
		}

		assert.False(t, mandorUser.CanApproveHarvest())
	})

	t.Run("TestHarvestBusinessMethods", func(t *testing.T) {
		harvest := &generated.HarvestRecord{
			Status: generated.HarvestStatusPending,
		}

		assert.True(t, harvest.IsPending())
		assert.False(t, harvest.IsApproved())
		assert.True(t, harvest.CanBeModified())

		harvest.Status = generated.HarvestStatusApproved
		assert.False(t, harvest.IsPending())
		assert.True(t, harvest.IsApproved())
		assert.False(t, harvest.CanBeModified())
	})
}

// Helper functions for test setup

func createTestCompany(t *testing.T, db *gorm.DB, ctx context.Context, name string) *generated.Company {
	company := &generated.Company{
		Nama:   name,
		Status: generated.CompanyStatusActive,
	}
	err := db.WithContext(ctx).Create(company).Error
	require.NoError(t, err)
	return company
}

func createTestEstate(t *testing.T, db *gorm.DB, ctx context.Context, name, companyID string) *generated.Estate {
	estate := &generated.Estate{
		Nama:      name,
		CompanyID: companyID,
	}
	err := db.WithContext(ctx).Create(estate).Error
	require.NoError(t, err)
	return estate
}

func createTestDivision(t *testing.T, db *gorm.DB, ctx context.Context, name, estateID string) *generated.Division {
	division := &generated.Division{
		Nama:     name,
		Kode:     "TEST",
		EstateID: estateID,
	}
	err := db.WithContext(ctx).Create(division).Error
	require.NoError(t, err)
	return division
}

func createTestBlock(t *testing.T, db *gorm.DB, ctx context.Context, name, divisionID string) *generated.Block {
	block := &generated.Block{
		KodeBlok:   "TEST",
		Nama:       name,
		DivisionID: divisionID,
	}
	err := db.WithContext(ctx).Create(block).Error
	require.NoError(t, err)
	return block
}

func createTestUser(t *testing.T, db *gorm.DB, ctx context.Context, username, name string, role generated.UserRole, companyID string) *generated.User {
	user := &generated.User{
		Username:  username,
		Nama:      name,
		Password:  "hashedpassword",
		Role:      role,
		CompanyID: companyID,
		IsActive:  true,
	}
	err := db.WithContext(ctx).Create(user).Error
	require.NoError(t, err)
	return user
}

func stringPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}

func int32Ptr(i int32) *int32 {
	return &i
}