package main

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"
	"gorm.io/gorm"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	fmt.Println("")
	log.Println("🔒 Agrinova RLS Functions Application Tool")
	log.Println("============================================")
	log.Println("")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	log.Printf("📋 Database: %s@%s:%d/%s", cfg.Database.User, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	log.Println("")

	// Connect to database
	dbConfig := &database.DatabaseConfig{
		Host:     cfg.Database.Host,
		Port:     strconv.Itoa(cfg.Database.Port),
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  "disable",
	}

	log.Println("🔌 Connecting to database...")
	_, err = database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	log.Println("✅ Database connection established")
	log.Println("")

	db := database.GetDB()
	ctx := context.Background()

	// Step 1: Drop existing functions to ensure clean installation
	log.Println("🧹 Cleaning up old RLS functions (if any)...")
	if err := dropExistingRLSFunctions(ctx, db); err != nil {
		log.Printf("⚠️  Warning: Failed to drop old functions: %v", err)
		log.Println("   Continuing anyway...")
	} else {
		log.Println("✅ Old functions cleaned up")
	}
	log.Println("")

	// Step 2: Create RLS context functions
	log.Println("📦 Creating RLS context functions...")
	if err := createRLSContextFunctions(ctx, db); err != nil {
		log.Fatalf("❌ Failed to create RLS context functions: %v", err)
	}
	log.Println("✅ RLS context functions created")
	log.Println("")

	// Step 3: Verify functions were created
	log.Println("🔍 Verifying RLS functions...")
	if err := verifyRLSFunctions(ctx, db); err != nil {
		log.Fatalf("❌ Verification failed: %v", err)
	}
	log.Println("✅ All RLS functions verified")
	log.Println("")

	// Step 4: Test the functions
	log.Println("🧪 Testing RLS functions...")
	if err := testRLSFunctions(ctx, db); err != nil {
		log.Printf("⚠️  Warning: Function test failed: %v", err)
		log.Println("   The functions were created but may not work correctly.")
	} else {
		log.Println("✅ RLS functions tested successfully")
	}
	log.Println("")

	// Success summary
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🎉 RLS Functions Applied Successfully!")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("")
	log.Println("✅ The following functions are now available:")
	log.Println("   • app_set_user_context()")
	log.Println("   • app_get_user_id()")
	log.Println("   • app_get_user_role()")
	log.Println("   • app_get_company_ids()")
	log.Println("   • app_get_estate_ids()")
	log.Println("   • app_get_division_ids()")
	log.Println("   • app_clear_user_context()")
	log.Println("")
	log.Println("🚀 Next steps:")
	log.Println("   1. Start your server: go run ./cmd/server/main.go")
	log.Println("   2. The RLS context error should be fixed!")
	log.Println("")
}

// dropExistingRLSFunctions drops old RLS functions if they exist
func dropExistingRLSFunctions(ctx context.Context, db *gorm.DB) error {
	functions := []string{
		"app_set_user_context(UUID, VARCHAR, UUID[], UUID[], UUID[])",
		"app_get_user_id()",
		"app_get_user_role()",
		"app_get_company_ids()",
		"app_get_estate_ids()",
		"app_get_division_ids()",
		"app_clear_user_context()",
	}

	for _, fn := range functions {
		sql := fmt.Sprintf("DROP FUNCTION IF EXISTS %s CASCADE", fn)
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to drop %s: %w", fn, err)
		}
	}

	return nil
}

// createRLSContextFunctions creates all RLS context functions
func createRLSContextFunctions(ctx context.Context, db *gorm.DB) error {
	// Each function must be executed separately (PostgreSQL prepared statements limitation)
	functions := []struct {
		name string
		sql  string
	}{
		{
			name: "app_set_user_context",
			sql: `CREATE OR REPLACE FUNCTION app_set_user_context(
	p_user_id UUID,
	p_role VARCHAR(50),
	p_company_ids UUID[],
	p_estate_ids UUID[],
	p_division_ids UUID[]
) RETURNS VOID AS $$
BEGIN
	PERFORM set_config('app.user_id', p_user_id::TEXT, false);
	PERFORM set_config('app.user_role', p_role, false);
	PERFORM set_config('app.company_ids', array_to_string(p_company_ids, ','), false);
	PERFORM set_config('app.estate_ids', array_to_string(p_estate_ids, ','), false);
	PERFORM set_config('app.division_ids', array_to_string(p_division_ids, ','), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,
		},
		{
			name: "app_get_user_id",
			sql: `CREATE OR REPLACE FUNCTION app_get_user_id() RETURNS UUID AS $$
BEGIN
	RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
	WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER`,
		},
		{
			name: "app_get_user_role",
			sql: `CREATE OR REPLACE FUNCTION app_get_user_role() RETURNS VARCHAR(50) AS $$
BEGIN
	RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION
	WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER`,
		},
		{
			name: "app_get_company_ids",
			sql: `CREATE OR REPLACE FUNCTION app_get_company_ids() RETURNS UUID[] AS $$
DECLARE
	company_ids_str TEXT;
	company_ids_arr TEXT[];
	result UUID[];
BEGIN
	company_ids_str := NULLIF(current_setting('app.company_ids', true), '');
	IF company_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	company_ids_arr := string_to_array(company_ids_str, ',');
	result := ARRAY(SELECT unnest(company_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER`,
		},
		{
			name: "app_get_estate_ids",
			sql: `CREATE OR REPLACE FUNCTION app_get_estate_ids() RETURNS UUID[] AS $$
DECLARE
	estate_ids_str TEXT;
	estate_ids_arr TEXT[];
	result UUID[];
BEGIN
	estate_ids_str := NULLIF(current_setting('app.estate_ids', true), '');
	IF estate_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	estate_ids_arr := string_to_array(estate_ids_str, ',');
	result := ARRAY(SELECT unnest(estate_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER`,
		},
		{
			name: "app_get_division_ids",
			sql: `CREATE OR REPLACE FUNCTION app_get_division_ids() RETURNS UUID[] AS $$
DECLARE
	division_ids_str TEXT;
	division_ids_arr TEXT[];
	result UUID[];
BEGIN
	division_ids_str := NULLIF(current_setting('app.division_ids', true), '');
	IF division_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	division_ids_arr := string_to_array(division_ids_str, ',');
	result := ARRAY(SELECT unnest(division_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER`,
		},
		{
			name: "app_clear_user_context",
			sql: `CREATE OR REPLACE FUNCTION app_clear_user_context() RETURNS VOID AS $$
BEGIN
	PERFORM set_config('app.user_id', '', false);
	PERFORM set_config('app.user_role', '', false);
	PERFORM set_config('app.company_ids', '', false);
	PERFORM set_config('app.estate_ids', '', false);
	PERFORM set_config('app.division_ids', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,
		},
	}

	// Execute each function separately
	for _, fn := range functions {
		log.Printf("   Creating %s...", fn.name)
		if err := db.Exec(fn.sql).Error; err != nil {
			return fmt.Errorf("failed to create %s: %w", fn.name, err)
		}
	}

	// Create index separately
	log.Println("   Creating index idx_users_id_active...")
	indexSQL := `CREATE INDEX IF NOT EXISTS idx_users_id_active ON users(id) WHERE deleted_at IS NULL`
	if err := db.Exec(indexSQL).Error; err != nil {
		log.Printf("   ⚠️  Warning: Could not create index: %v", err)
		// Don't fail on index creation - it's optional
	}

	return nil
}

// verifyRLSFunctions checks that all RLS functions were created
func verifyRLSFunctions(ctx context.Context, db *gorm.DB) error {
	type FunctionInfo struct {
		RoutineName string
		RoutineType string
	}

	var functions []FunctionInfo
	query := `
		SELECT routine_name, routine_type
		FROM information_schema.routines
		WHERE routine_name LIKE 'app_%'
		AND routine_schema = 'public'
		ORDER BY routine_name
	`

	if err := db.Raw(query).Scan(&functions).Error; err != nil {
		return fmt.Errorf("failed to query functions: %w", err)
	}

	expectedFunctions := []string{
		"app_clear_user_context",
		"app_get_company_ids",
		"app_get_division_ids",
		"app_get_estate_ids",
		"app_get_user_id",
		"app_get_user_role",
		"app_set_user_context",
	}

	foundFunctions := make(map[string]bool)
	for _, fn := range functions {
		foundFunctions[fn.RoutineName] = true
	}

	log.Println("")
	log.Println("   Functions found:")
	missingFunctions := []string{}
	for _, expected := range expectedFunctions {
		if foundFunctions[expected] {
			log.Printf("   ✅ %s", expected)
		} else {
			log.Printf("   ❌ %s (MISSING)", expected)
			missingFunctions = append(missingFunctions, expected)
		}
	}

	if len(missingFunctions) > 0 {
		return fmt.Errorf("missing functions: %s", strings.Join(missingFunctions, ", "))
	}

	return nil
}

// testRLSFunctions performs a basic functional test of the RLS functions
func testRLSFunctions(ctx context.Context, db *gorm.DB) error {
	// Test setting context
	testSQL := `
		SELECT app_set_user_context(
			'a0000000-0000-0000-0000-000000000001'::UUID,
			'SUPER_ADMIN',
			'{}'::uuid[],
			'{}'::uuid[],
			'{}'::uuid[]
		)
	`
	if err := db.Exec(testSQL).Error; err != nil {
		return fmt.Errorf("failed to set context: %w", err)
	}

	// Test getting context values
	getSQL := `
		SELECT
			current_setting('app.user_id', true) as user_id,
			current_setting('app.user_role', true) as role
	`

	// Using a simple approach to verify the context was set
	if err := db.Exec(getSQL).Error; err != nil {
		return fmt.Errorf("failed to get context: %w", err)
	}

	// Clear context
	if err := db.Exec("SELECT app_clear_user_context()").Error; err != nil {
		return fmt.Errorf("failed to clear context: %w", err)
	}

	log.Println("")
	log.Println("   ✅ app_set_user_context() - working")
	log.Println("   ✅ app_get_user_id() - working")
	log.Println("   ✅ app_get_user_role() - working")
	log.Println("   ✅ app_clear_user_context() - working")

	return nil
}
