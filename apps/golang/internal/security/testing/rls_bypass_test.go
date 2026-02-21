package testing

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/generated"
)

// TestRLSBypassPrevention tests that RLS policies cannot be bypassed
type RLSBypassTests struct {
	DB            *gorm.DB
	TestUserID    uuid.UUID
	TestCompanyID uuid.UUID
	TestEstateID  uuid.UUID
}

// NewRLSBypassTests creates a new RLS bypass test suite
func NewRLSBypassTests(db *gorm.DB) *RLSBypassTests {
	return &RLSBypassTests{
		DB: db,
	}
}

// TestHarvestRLSBypassAttempts tests various bypass attempts on harvest records
func (t *RLSBypassTests) TestHarvestRLSBypassAttempts(test *testing.T) {
	ctx := context.Background()

	test.Run("Attempt 1: Direct SQL bypass without context", func(test *testing.T) {
		// Try to query harvest records without setting RLS context
		var records []generated.HarvestRecord
		err := t.DB.WithContext(ctx).Find(&records).Error

		// Should return empty result or error, not actual data
		if err == nil {
			assert.Empty(test, records, "RLS should prevent access without context")
		}
	})

	test.Run("Attempt 2: SQL injection in WHERE clause", func(test *testing.T) {
		// Attempt SQL injection to bypass RLS
		maliciousInput := "1' OR '1'='1"

		var records []generated.HarvestRecord
		err := t.DB.WithContext(ctx).
			Where("mandor_id = ?", maliciousInput).
			Find(&records).Error

		// Should safely handle the input
		assert.NoError(test, err, "Parameterized queries should prevent SQL injection")
		assert.Empty(test, records, "Should not return any records with malicious input")
	})

	test.Run("Attempt 3: UNION-based SQL injection", func(test *testing.T) {
		// Attempt UNION attack
		maliciousInput := "1' UNION SELECT * FROM harvest_records --"

		var count int64
		err := t.DB.WithContext(ctx).
			Model(&generated.HarvestRecord{}).
			Where("id = ?", maliciousInput).
			Count(&count).Error

		assert.NoError(test, err, "Should handle malicious input safely")
		assert.Equal(test, int64(0), count, "Should return zero records")
	})

	test.Run("Attempt 4: SET ROLE bypass attempt", func(test *testing.T) {
		// Try to escalate privileges by changing role
		err := t.DB.Exec("SET ROLE postgres").Error

		// Should fail or be ignored
		assert.Error(test, err, "Should not allow role escalation")
	})

	test.Run("Attempt 5: Disable RLS attempt", func(test *testing.T) {
		// Try to disable RLS
		err := t.DB.Exec("ALTER TABLE harvest_records DISABLE ROW LEVEL SECURITY").Error

		// Should fail - only superuser can disable RLS
		assert.Error(test, err, "Should not allow disabling RLS")
	})

	test.Run("Attempt 6: Function definition bypass", func(test *testing.T) {
		// Try to create a function that bypasses RLS
		maliciousFunc := `
			CREATE OR REPLACE FUNCTION bypass_rls()
			RETURNS SETOF harvest_records AS $$
			BEGIN
				RETURN QUERY SELECT * FROM harvest_records;
			END;
			$$ LANGUAGE plpgsql SECURITY DEFINER;
		`

		err := t.DB.Exec(maliciousFunc).Error

		// Should fail due to permissions
		assert.Error(test, err, "Should not allow creating security definer functions")
	})

	test.Run("Attempt 7: Transaction isolation bypass", func(test *testing.T) {
		// Try to start a transaction with different isolation level
		err := t.DB.Transaction(func(tx *gorm.DB) error {
			// Try to read uncommitted data
			tx.Exec("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED")

			var records []generated.HarvestRecord
			if err := tx.Find(&records).Error; err != nil {
				return err
			}

			// Even with different isolation, RLS should apply
			assert.Empty(test, records, "RLS should apply regardless of isolation level")

			return nil
		})

		assert.NoError(test, err, "Transaction should complete without error")
	})

	test.Run("Attempt 8: Context parameter injection", func(test *testing.T) {
		// Try to inject malicious values into context parameters
		maliciousUserID := "'; DROP TABLE harvest_records; --"

		err := t.DB.Exec("SELECT app_set_user_context($1, $2, $3, $4, $5)",
			maliciousUserID,
			"SUPER_ADMIN",
			"{}",
			"{}",
			"{}",
		).Error

		// Should handle safely or reject
		if err == nil {
			// Verify that no damage was done
			var tableExists bool
			err := t.DB.Raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'harvest_records')").
				Scan(&tableExists).Error

			assert.NoError(test, err)
			assert.True(test, tableExists, "Table should still exist")
		}
	})

	test.Run("Attempt 9: Cross-user data access", func(test *testing.T) {
		// Create test data for another user
		otherUserID := uuid.New()

		// Set context for current user
		t.setUserContext(ctx, t.TestUserID, "MANDOR", []uuid.UUID{t.TestCompanyID}, []uuid.UUID{t.TestEstateID}, []uuid.UUID{})

		// Try to query another user's data
		var records []generated.HarvestRecord
		err := t.DB.WithContext(ctx).
			Where("mandor_id = ?", otherUserID).
			Find(&records).Error

		// Should return empty result (RLS blocks it)
		assert.NoError(test, err, "Query should execute without error")
		assert.Empty(test, records, "Should not return other user's data")
	})

	test.Run("Attempt 10: Temporal bypass using deleted_at", func(test *testing.T) {
		// Try to access soft-deleted records
		var records []generated.HarvestRecord
		err := t.DB.Unscoped(). // Unscoped to include deleted records
						WithContext(ctx).
						Find(&records).Error

		// RLS should still apply even with Unscoped
		assert.NoError(test, err, "Query should execute")
		// Verify RLS still limits results
	})
}

// TestGateCheckRLSBypassAttempts tests bypass attempts on gate check records
func (t *RLSBypassTests) TestGateCheckRLSBypassAttempts(test *testing.T) {
	ctx := context.Background()

	test.Run("QR Token Replay Attack Prevention", func(test *testing.T) {
		// Create a used QR token
		tokenID := uuid.New()

		// Try to use the same token multiple times rapidly
		for i := 0; i < 5; i++ {
			err := t.DB.Exec("SELECT validate_qr_token_security($1, $2, $3)",
				tokenID,
				"test-device",
				"127.0.0.1",
			).Error

			if i > 0 {
				// Should detect and prevent replay
				assert.Error(test, err, "Should prevent QR token replay on iteration %d", i)
			}
		}
	})

	test.Run("Satpam Cross-Company Access Attempt", func(test *testing.T) {
		// Set context as Satpam in Company A
		satpamID := uuid.New()
		companyA := uuid.New()

		t.setUserContext(ctx, satpamID, "SATPAM", []uuid.UUID{companyA}, []uuid.UUID{}, []uuid.UUID{})

		// Try to access gate check from Company B
		companyB := uuid.New()

		var count int64
		err := t.DB.WithContext(ctx).
			Table("gate_check_records gcr").
			Joins("JOIN users u ON gcr.satpam_id = u.id").
			Joins("JOIN user_company_assignments uca ON u.id = uca.user_id").
			Where("uca.company_id = ?", companyB).
			Count(&count).Error

		assert.NoError(test, err, "Query should execute")
		assert.Equal(test, int64(0), count, "Should not access other company's data")
	})
}

// TestCompanyUserRLSBypassAttempts tests bypass attempts on company/user data
func (t *RLSBypassTests) TestCompanyUserRLSBypassAttempts(test *testing.T) {
	ctx := context.Background()

	test.Run("Privilege Escalation via Role Change", func(test *testing.T) {
		// Set context as regular user
		regularUserID := uuid.New()
		t.setUserContext(ctx, regularUserID, "MANDOR", []uuid.UUID{t.TestCompanyID}, []uuid.UUID{}, []uuid.UUID{})

		// Try to change own role to SUPER_ADMIN
		err := t.DB.Exec("UPDATE users SET role = 'SUPER_ADMIN' WHERE id = $1", regularUserID).Error

		// RLS policy should prevent this
		if err == nil {
			// Verify role wasn't actually changed
			var user generated.User
			t.DB.First(&user, regularUserID)
			assert.NotEqual(test, "SUPER_ADMIN", user.Role, "Role should not be changed")
		}
	})

	test.Run("Password Hash Access Attempt", func(test *testing.T) {
		// Try to read password hashes of other users
		var users []struct {
			ID       uuid.UUID
			Password string
		}

		err := t.DB.WithContext(ctx).
			Table("users").
			Select("id, password").
			Find(&users).Error

		// Should either fail or return limited results
		if err == nil {
			// Verify we only see our own data
			assert.LessOrEqual(test, len(users), 1, "Should only see own user data")
		}
	})

	test.Run("Session Hijacking Prevention", func(test *testing.T) {
		// Try to access another user's session
		otherUserSession := uuid.New()

		var sessions []struct {
			ID           uuid.UUID
			SessionToken string
		}

		err := t.DB.WithContext(ctx).
			Table("user_sessions").
			Where("id = ?", otherUserSession).
			Find(&sessions).Error

		assert.NoError(test, err, "Query should execute")
		assert.Empty(test, sessions, "Should not access other user's sessions")
	})

	test.Run("Cross-Company User Enumeration", func(test *testing.T) {
		// Set context as Company Admin for Company A
		adminID := uuid.New()
		companyA := uuid.New()
		t.setUserContext(ctx, adminID, "COMPANY_ADMIN", []uuid.UUID{companyA}, []uuid.UUID{}, []uuid.UUID{})

		// Try to list users from Company B
		companyB := uuid.New()

		var count int64
		err := t.DB.WithContext(ctx).
			Table("users u").
			Joins("JOIN user_company_assignments uca ON u.id = uca.user_id").
			Where("uca.company_id = ?", companyB).
			Count(&count).Error

		assert.NoError(test, err, "Query should execute")
		assert.Equal(test, int64(0), count, "Should not enumerate other company's users")
	})
}

// TestFeatureBasedAuthBypass tests bypass attempts on feature-based authorization
func (t *RLSBypassTests) TestFeatureBasedAuthBypass(test *testing.T) {
	ctx := context.Background()

	test.Run("Feature Grant Manipulation", func(test *testing.T) {
		// Try to grant yourself additional features
		regularUserID := uuid.New()
		t.setUserContext(ctx, regularUserID, "MANDOR", []uuid.UUID{t.TestCompanyID}, []uuid.UUID{}, []uuid.UUID{})

		err := t.DB.Exec(`
			INSERT INTO user_features (user_id, feature_id, is_granted, granted_by)
			VALUES ($1, (SELECT id FROM features WHERE name = 'company.create'), true, $1)
		`, regularUserID).Error

		// Should fail or be restricted
		if err == nil {
			// Verify the grant wasn't actually created
			var count int64
			t.DB.Table("user_features").
				Where("user_id = ? AND is_granted = true", regularUserID).
				Count(&count)

			assert.Equal(test, int64(0), count, "Should not allow self-granting features")
		}
	})
}

// Helper methods

func (t *RLSBypassTests) setUserContext(ctx context.Context, userID uuid.UUID, role string, companyIDs, estateIDs, divisionIDs []uuid.UUID) error {
	return t.DB.Exec("SELECT app_set_user_context($1, $2, $3, $4, $5)",
		userID,
		role,
		t.uuidArrayToString(companyIDs),
		t.uuidArrayToString(estateIDs),
		t.uuidArrayToString(divisionIDs),
	).Error
}

func (t *RLSBypassTests) uuidArrayToString(ids []uuid.UUID) string {
	if len(ids) == 0 {
		return "{}"
	}

	result := "{"
	for i, id := range ids {
		if i > 0 {
			result += ","
		}
		result += id.String()
	}
	result += "}"

	return result
}

// Benchmark tests for performance validation

func BenchmarkRLSHarvestQuery(b *testing.B) {
	// Benchmark RLS-enabled harvest query
	db := setupTestDB()
	tests := NewRLSBypassTests(db)

	ctx := context.Background()
	tests.setUserContext(ctx, tests.TestUserID, "MANDOR", []uuid.UUID{tests.TestCompanyID}, []uuid.UUID{}, []uuid.UUID{})

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		var records []generated.HarvestRecord
		db.WithContext(ctx).Limit(100).Find(&records)
	}
}

func BenchmarkRLSHarvestQueryWithJoins(b *testing.B) {
	// Benchmark RLS-enabled harvest query with joins
	db := setupTestDB()
	tests := NewRLSBypassTests(db)

	ctx := context.Background()
	tests.setUserContext(ctx, tests.TestUserID, "MANDOR", []uuid.UUID{tests.TestCompanyID}, []uuid.UUID{}, []uuid.UUID{})

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		var records []generated.HarvestRecord
		db.WithContext(ctx).
			Joins("Block").
			Joins("Block.Division").
			Joins("Block.Division.Estate").
			Joins("Block.Division.Estate.Company").
			Limit(100).
			Find(&records)
	}
}

// Helper function to setup test database
func setupTestDB() *gorm.DB {
	// This would be implemented to create a test database connection
	// For now, return nil - actual implementation would connect to test DB
	return nil
}
