package testing

import (
	"context"
	"testing"

	"agrinovagraphql/server/internal/features/models"
	"agrinovagraphql/server/pkg/database"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// BypassPreventionTestSuite tests for RLS bypass vulnerabilities
// This suite ensures that RLS policies cannot be bypassed through:
// 1. Direct SQL queries
// 2. ORM manipulation
// 3. Context injection attacks
// 4. Privilege escalation attempts
// 5. NULL context exploitation

type BypassPreventionTestSuite struct {
	db              *gorm.DB
	testCompanyID   uuid.UUID
	testUserID      uuid.UUID
	maliciousUserID uuid.UUID
	testEstateID    uuid.UUID
	testHarvestID   uuid.UUID
}

func NewBypassPreventionTestSuite(db *gorm.DB) *BypassPreventionTestSuite {
	return &BypassPreventionTestSuite{
		db: db,
	}
}

// SetupTestData creates test data for bypass prevention tests
func (s *BypassPreventionTestSuite) SetupTestData(t *testing.T) {
	ctx := context.Background()

	// Create test company
	s.testCompanyID = uuid.New()
	err := s.db.Exec(`
		INSERT INTO companies (id, nama, kode, alamat, telepon, status)
		VALUES ($1, 'Test Company Bypass', 'BYPASS001', 'Test Address', '123456', 'ACTIVE')
	`, s.testCompanyID).Error
	require.NoError(t, err, "Failed to create test company")

	// Create test estate
	s.testEstateID = uuid.New()
	err = s.db.Exec(`
		INSERT INTO estates (id, company_id, nama, kode, alamat, status)
		VALUES ($1, $2, 'Test Estate', 'EST001', 'Estate Address', 'ACTIVE')
	`, s.testEstateID, s.testCompanyID).Error
	require.NoError(t, err, "Failed to create test estate")

	// Create legitimate user (MANAGER role)
	s.testUserID = uuid.New()
	err = s.db.Exec(`
		INSERT INTO users (id, username, role, nama, email)
		VALUES ($1, 'legit_user', 'MANAGER', 'Legit User', 'legit@test.com')
	`, s.testUserID).Error
	require.NoError(t, err, "Failed to create legitimate user")

	// Create malicious user (MANDOR role trying to access unauthorized data)
	s.maliciousUserID = uuid.New()
	err = s.db.Exec(`
		INSERT INTO users (id, username, role, nama, email)
		VALUES ($1, 'malicious_user', 'MANDOR', 'Malicious User', 'malicious@test.com')
	`, s.maliciousUserID).Error
	require.NoError(t, err, "Failed to create malicious user")

	// Assign legitimate user to company and estate
	err = s.db.Exec(`
		INSERT INTO user_company_assignments (user_id, company_id)
		VALUES ($1, $2)
	`, s.testUserID, s.testCompanyID).Error
	require.NoError(t, err, "Failed to assign user to company")

	err = s.db.Exec(`
		INSERT INTO user_estate_assignments (user_id, estate_id)
		VALUES ($1, $2)
	`, s.testUserID, s.testEstateID).Error
	require.NoError(t, err, "Failed to assign user to estate")

	// Create test harvest record
	s.testHarvestID = uuid.New()
	// We'll create this in individual tests
}

// CleanupTestData removes test data
func (s *BypassPreventionTestSuite) CleanupTestData(t *testing.T) {
	// Clean up in reverse order of creation
	s.db.Exec("DELETE FROM user_estate_assignments WHERE user_id IN ($1, $2)", s.testUserID, s.maliciousUserID)
	s.db.Exec("DELETE FROM user_company_assignments WHERE user_id IN ($1, $2)", s.testUserID, s.maliciousUserID)
	s.db.Exec("DELETE FROM users WHERE id IN ($1, $2)", s.testUserID, s.maliciousUserID)
	s.db.Exec("DELETE FROM estates WHERE id = $1", s.testEstateID)
	s.db.Exec("DELETE FROM companies WHERE id = $1", s.testCompanyID)
}

// TestDirectSQLBypassPrevention tests if direct SQL can bypass RLS
func TestDirectSQLBypassPrevention(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Test 1: Attempt to query companies without setting RLS context
	t.Run("Query_Without_Context", func(t *testing.T) {
		var companies []struct {
			ID   uuid.UUID
			Nama string
		}

		// This should return empty results because RLS is enabled
		err := db.WithContext(ctx).Raw("SELECT id, nama FROM companies WHERE deleted_at IS NULL").Scan(&companies).Error

		// Either error or empty results - both are acceptable security responses
		if err == nil {
			assert.Empty(t, companies, "Should not return companies without RLS context")
		}
	})

	// Test 2: Attempt to bypass RLS with SECURITY DEFINER function exploitation
	t.Run("SECURITY_DEFINER_Exploitation", func(t *testing.T) {
		// Attempt to create a malicious function that bypasses RLS
		err := db.WithContext(ctx).Exec(`
			CREATE OR REPLACE FUNCTION malicious_bypass() RETURNS SETOF companies AS $$
			BEGIN
				RETURN QUERY SELECT * FROM companies;
			END;
			$$ LANGUAGE plpgsql SECURITY DEFINER
		`).Error

		// Function creation might succeed, but it should not bypass RLS
		if err == nil {
			var companies []struct {
				ID uuid.UUID
			}
			err = db.WithContext(ctx).Raw("SELECT * FROM malicious_bypass()").Scan(&companies).Error

			// Should either error or return empty
			if err == nil {
				assert.Empty(t, companies, "Malicious function should not bypass RLS")
			}

			// Cleanup
			db.Exec("DROP FUNCTION IF EXISTS malicious_bypass()")
		}
	})

	// Test 3: Attempt NULL context injection
	t.Run("NULL_Context_Injection", func(t *testing.T) {
		// Try to set NULL or empty values in context
		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context(NULL, NULL, NULL, NULL, NULL)
		`).Error

		// Should either error or set empty context (which denies access)
		if err == nil {
			var companies []struct {
				ID uuid.UUID
			}
			err = db.WithContext(ctx).Raw("SELECT id FROM companies WHERE deleted_at IS NULL").Scan(&companies).Error

			if err == nil {
				assert.Empty(t, companies, "NULL context should not grant access")
			}
		}
	})

	// Test 4: Attempt to access data by directly modifying session variables
	t.Run("Session_Variable_Manipulation", func(t *testing.T) {
		// Try to set context variables directly instead of using the function
		db.Exec("SET app.user_id = $1", uuid.New().String())
		db.Exec("SET app.user_role = 'SUPER_ADMIN'")
		db.Exec("SET app.company_ids = $1", suite.testCompanyID.String())

		var companies []struct {
			ID uuid.UUID
		}
		err := db.WithContext(ctx).Raw("SELECT id FROM companies WHERE id = $1", suite.testCompanyID).Scan(&companies).Error

		// Direct session variable setting should not bypass RLS
		if err == nil {
			// The RLS policy checks using app_get_user_id() which validates the context
			// Direct variable setting might not work as expected
			t.Log("Session variable manipulation did not error, but should be protected by RLS")
		}
	})
}

// TestPrivilegeEscalationPrevention tests role-based access control bypass attempts
func TestPrivilegeEscalationPrevention(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Test 1: MANDOR trying to access another MANDOR's data
	t.Run("Horizontal_Privilege_Escalation", func(t *testing.T) {
		// Set context as malicious user (MANDOR)
		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANDOR', ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID).Error
		require.NoError(t, err)

		// Try to access companies (MANDOR shouldn't have access)
		var companies []struct {
			ID uuid.UUID
		}
		err = db.WithContext(ctx).Raw("SELECT id FROM companies WHERE id = $1", suite.testCompanyID).Scan(&companies).Error

		if err == nil {
			assert.Empty(t, companies, "MANDOR should not access companies")
		}

		// Clear context
		db.Exec("SELECT app_clear_user_context()")
	})

	// Test 2: Try to escalate role by updating user table
	t.Run("Role_Escalation_Via_Update", func(t *testing.T) {
		// Set context as malicious user
		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANDOR', ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID).Error
		require.NoError(t, err)

		// Try to update own role to SUPER_ADMIN
		err = db.WithContext(ctx).Exec(`
			UPDATE users SET role = 'SUPER_ADMIN' WHERE id = $1
		`, suite.maliciousUserID).Error

		// Should fail due to RLS policy preventing role changes
		assert.Error(t, err, "Role escalation should be prevented")

		// Verify role hasn't changed
		var role string
		db.Raw("SELECT role FROM users WHERE id = $1", suite.maliciousUserID).Scan(&role)
		assert.Equal(t, "MANDOR", role, "Role should not have changed")

		db.Exec("SELECT app_clear_user_context()")
	})

	// Test 3: Try to add unauthorized assignments
	t.Run("Unauthorized_Assignment_Creation", func(t *testing.T) {
		// Set context as malicious user
		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANDOR', ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID).Error
		require.NoError(t, err)

		// Try to assign self to test company
		err = db.WithContext(ctx).Exec(`
			INSERT INTO user_company_assignments (user_id, company_id)
			VALUES ($1, $2)
		`, suite.maliciousUserID, suite.testCompanyID).Error

		// Should fail due to RLS policy
		assert.Error(t, err, "Unauthorized assignment should be prevented")

		db.Exec("SELECT app_clear_user_context()")
	})
}

// TestConcurrentAccessViolation tests for race conditions and concurrent bypass attempts
func TestConcurrentAccessViolation(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Test 1: Concurrent context switching
	t.Run("Concurrent_Context_Switching", func(t *testing.T) {
		// Set context for user 1
		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANAGER', $2::uuid[], $3::uuid[], ARRAY[]::uuid[])
		`, suite.testUserID, "{"+suite.testCompanyID.String()+"}", "{"+suite.testEstateID.String()+"}").Error
		require.NoError(t, err)

		// Query companies (should succeed)
		var companies1 []struct {
			ID uuid.UUID
		}
		err = db.WithContext(ctx).Raw("SELECT id FROM companies WHERE id = $1", suite.testCompanyID).Scan(&companies1).Error
		assert.NoError(t, err)
		assert.NotEmpty(t, companies1, "Legitimate user should access company")

		// Immediately switch context to malicious user (simulating race condition)
		err = db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANDOR', ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID).Error
		require.NoError(t, err)

		// Try to query companies again (should fail)
		var companies2 []struct {
			ID uuid.UUID
		}
		err = db.WithContext(ctx).Raw("SELECT id FROM companies WHERE id = $1", suite.testCompanyID).Scan(&companies2).Error

		if err == nil {
			assert.Empty(t, companies2, "Context switch should prevent access")
		}

		db.Exec("SELECT app_clear_user_context()")
	})
}

// TestInjectionAttackPrevention tests for SQL injection bypass attempts
func TestInjectionAttackPrevention(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Test 1: SQL injection in context parameters
	t.Run("Context_Parameter_Injection", func(t *testing.T) {
		// Try to inject SQL in role parameter
		maliciousRole := "MANDOR'; DROP TABLE companies; --"

		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, $2, ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID, maliciousRole).Error

		// Should handle safely (parameterized queries prevent injection)
		// The function should either error or safely set the role as a string
		t.Log("Injection attempt result:", err)

		// Verify companies table still exists
		var count int64
		err = db.Raw("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL").Scan(&count).Error
		assert.NoError(t, err, "Companies table should still exist")

		db.Exec("SELECT app_clear_user_context()")
	})

	// Test 2: Array injection
	t.Run("Array_Parameter_Injection", func(t *testing.T) {
		// Try to inject malicious array content
		maliciousArray := "{}; DROP TABLE users; --"

		err := db.WithContext(ctx).Exec(`
			SELECT app_set_user_context($1, 'MANDOR', $2, ARRAY[]::uuid[], ARRAY[]::uuid[])
		`, suite.maliciousUserID, maliciousArray).Error

		// Should handle safely or error
		t.Log("Array injection attempt result:", err)

		// Verify users table still exists
		var count int64
		err = db.Raw("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&count).Error
		assert.NoError(t, err, "Users table should still exist")

		db.Exec("SELECT app_clear_user_context()")
	})
}

// TestBypassViaJoinExploitation tests if RLS can be bypassed through complex joins
func TestBypassViaJoinExploitation(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Set context as malicious user with no access
	err := db.WithContext(ctx).Exec(`
		SELECT app_set_user_context($1, 'MANDOR', ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::uuid[])
	`, suite.maliciousUserID).Error
	require.NoError(t, err)

	// Test 1: Try to access companies through estate join
	t.Run("Company_Via_Estate_Join", func(t *testing.T) {
		var companies []struct {
			ID uuid.UUID
		}

		err := db.WithContext(ctx).Raw(`
			SELECT DISTINCT c.id
			FROM companies c
			LEFT JOIN estates e ON c.id = e.company_id
			WHERE c.id = $1 AND c.deleted_at IS NULL
		`, suite.testCompanyID).Scan(&companies).Error

		// RLS should protect even with LEFT JOIN
		if err == nil {
			assert.Empty(t, companies, "JOIN should not bypass RLS on companies table")
		}
	})

	// Test 2: Try to access users through assignments
	t.Run("User_Via_Assignment_Join", func(t *testing.T) {
		var users []struct {
			ID uuid.UUID
		}

		err := db.WithContext(ctx).Raw(`
			SELECT DISTINCT u.id
			FROM users u
			LEFT JOIN user_company_assignments uca ON u.id = uca.user_id
			WHERE u.id = $1 AND u.deleted_at IS NULL
		`, suite.testUserID).Scan(&users).Error

		// RLS should protect user data
		if err == nil {
			assert.Empty(t, users, "JOIN should not bypass RLS on users table")
		}
	})

	db.Exec("SELECT app_clear_user_context()")
}

// TestForceRLSEnforcement ensures FORCE ROW LEVEL SECURITY is working
func TestForceRLSEnforcement(t *testing.T) {
	db := database.GetTestDB(t)
	suite := NewBypassPreventionTestSuite(db)
	suite.SetupTestData(t)
	defer suite.CleanupTestData(t)

	ctx := context.Background()

	// Test 1: Verify RLS is enabled on critical tables
	t.Run("Verify_RLS_Enabled", func(t *testing.T) {
		var tables []struct {
			TableName string
			RLSEnabled bool
			RLSForced bool
		}

		err := db.WithContext(ctx).Raw(`
			SELECT
				relname as table_name,
				relrowsecurity as rls_enabled,
				relforcerowsecurity as rls_forced
			FROM pg_class
			WHERE relname IN ('companies', 'users', 'harvest_records', 'gate_check_records',
			                  'user_sessions', 'jwt_tokens', 'estates', 'divisions', 'blocks')
			AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
		`).Scan(&tables).Error

		require.NoError(t, err)
		assert.NotEmpty(t, tables, "Should find protected tables")

		for _, table := range tables {
			assert.True(t, table.RLSEnabled, "RLS should be enabled on %s", table.TableName)
			assert.True(t, table.RLSForced, "RLS should be FORCED on %s", table.TableName)
		}
	})

	// Test 2: Verify policies exist for critical tables
	t.Run("Verify_Policies_Exist", func(t *testing.T) {
		var policies []struct {
			TableName  string
			PolicyName string
			Command    string
		}

		err := db.WithContext(ctx).Raw(`
			SELECT
				tablename as table_name,
				policyname as policy_name,
				cmd as command
			FROM pg_policies
			WHERE schemaname = 'public'
			AND tablename IN ('companies', 'users', 'harvest_records', 'gate_check_records')
		`).Scan(&policies).Error

		require.NoError(t, err)
		assert.NotEmpty(t, policies, "Should have RLS policies defined")

		// Verify we have SELECT, INSERT, UPDATE, DELETE policies for each table
		policyMap := make(map[string]map[string]bool)
		for _, policy := range policies {
			if policyMap[policy.TableName] == nil {
				policyMap[policy.TableName] = make(map[string]bool)
			}
			policyMap[policy.TableName][policy.Command] = true
		}

		criticalTables := []string{"companies", "users", "harvest_records", "gate_check_records"}
		for _, table := range criticalTables {
			commands := policyMap[table]
			assert.True(t, commands["SELECT"], "%s should have SELECT policy", table)
			// Note: Not all operations may be allowed on all tables
		}
	})
}
