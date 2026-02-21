package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000006SeedSystemFeatures seeds the initial system features
type Migration000006SeedSystemFeatures struct{}

func (m *Migration000006SeedSystemFeatures) Version() string {
	return "000006"
}

func (m *Migration000006SeedSystemFeatures) Name() string {
	return "seed_system_features"
}

func (m *Migration000006SeedSystemFeatures) Up(ctx context.Context, db *gorm.DB) error {
	// Define system features hierarchically
	// Format: name, display_name, description, module, parent_name, metadata_json
	features := [][]string{
		// Harvest Module Features
		{"harvest", "Harvest Management", "Access to harvest management system", "harvest", "", `{"resource_type":"harvest_record","ui_metadata":{"icon":"harvest","color":"green"}}`},
		{"harvest.view", "View Harvests", "View harvest records and statistics", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["read"],"required_scope":"division"}`},
		{"harvest.create", "Create Harvests", "Create new harvest records", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["create"],"required_scope":"division"}`},
		{"harvest.update", "Update Harvests", "Update existing harvest records", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["update"],"required_scope":"division"}`},
		{"harvest.delete", "Delete Harvests", "Delete harvest records", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["delete"],"required_scope":"division"}`},
		{"harvest.approve", "Approve Harvests", "Approve harvest records", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["approve"],"required_scope":"estate"}`},
		{"harvest.export", "Export Harvests", "Export harvest data", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["export"],"required_scope":"estate"}`},
		{"harvest.statistics", "Harvest Statistics", "View harvest statistics and analytics", "harvest", "harvest", `{"resource_type":"harvest_record","actions":["read"],"required_scope":"estate"}`},

		// Gate Check Module Features
		{"gatecheck", "Gate Check", "Access to gate check system", "gatecheck", "", `{"resource_type":"gate_check","ui_metadata":{"icon":"security","color":"blue"}}`},
		{"gatecheck.view", "View Gate Checks", "View gate check records", "gatecheck", "gatecheck", `{"resource_type":"gate_check","actions":["read"],"required_scope":"estate"}`},
		{"gatecheck.create", "Create Gate Checks", "Create new gate check records", "gatecheck", "gatecheck", `{"resource_type":"gate_check","actions":["create"],"required_scope":"estate"}`},
		{"gatecheck.update", "Update Gate Checks", "Update gate check records", "gatecheck", "gatecheck", `{"resource_type":"gate_check","actions":["update"],"required_scope":"estate"}`},
		{"gatecheck.sync", "Sync Gate Checks", "Synchronize offline gate check data", "gatecheck", "gatecheck", `{"resource_type":"gate_check","actions":["sync"],"required_scope":"estate"}`},
		{"gatecheck.photos", "Manage Photos", "Upload and manage gate check photos", "gatecheck", "gatecheck", `{"resource_type":"gate_check","actions":["create","read","delete"],"required_scope":"estate"}`},

		// Company Management Features
		{"company", "Company Management", "Access to company management", "company", "", `{"resource_type":"company","ui_metadata":{"icon":"business","color":"purple"}}`},
		{"company.view", "View Companies", "View company information", "company", "company", `{"resource_type":"company","actions":["read"],"required_scope":"global"}`},
		{"company.create", "Create Companies", "Create new companies", "company", "company", `{"resource_type":"company","actions":["create"],"required_scope":"global"}`},
		{"company.update", "Update Companies", "Update company information", "company", "company", `{"resource_type":"company","actions":["update"],"required_scope":"company"}`},
		{"company.delete", "Delete Companies", "Delete companies", "company", "company", `{"resource_type":"company","actions":["delete"],"required_scope":"global"}`},

		// User Management Features
		{"user", "User Management", "Access to user management", "user", "", `{"resource_type":"user","ui_metadata":{"icon":"people","color":"orange"}}`},
		{"user.view", "View Users", "View user information", "user", "user", `{"resource_type":"user","actions":["read"],"required_scope":"company"}`},
		{"user.create", "Create Users", "Create new users", "user", "user", `{"resource_type":"user","actions":["create"],"required_scope":"company"}`},
		{"user.update", "Update Users", "Update user information", "user", "user", `{"resource_type":"user","actions":["update"],"required_scope":"company"}`},
		{"user.delete", "Delete Users", "Delete users", "user", "user", `{"resource_type":"user","actions":["delete"],"required_scope":"company"}`},
		{"user.approve", "Approve Users", "Approve user registrations", "user", "user", `{"resource_type":"user","actions":["approve"],"required_scope":"company"}`},
		{"user.assign", "Assign Users", "Assign users to estates/divisions", "user", "user", `{"resource_type":"user","actions":["assign"],"required_scope":"company"}`},

		// Estate Management Features
		{"estate", "Estate Management", "Access to estate management", "estate", "", `{"resource_type":"estate","ui_metadata":{"icon":"location","color":"teal"}}`},
		{"estate.view", "View Estates", "View estate information", "estate", "estate", `{"resource_type":"estate","actions":["read"],"required_scope":"company"}`},
		{"estate.create", "Create Estates", "Create new estates", "estate", "estate", `{"resource_type":"estate","actions":["create"],"required_scope":"company"}`},
		{"estate.update", "Update Estates", "Update estate information", "estate", "estate", `{"resource_type":"estate","actions":["update"],"required_scope":"company"}`},
		{"estate.delete", "Delete Estates", "Delete estates", "estate", "estate", `{"resource_type":"estate","actions":["delete"],"required_scope":"company"}`},

		// Division Management Features
		{"division", "Division Management", "Access to division management", "division", "", `{"resource_type":"division","ui_metadata":{"icon":"grid","color":"indigo"}}`},
		{"division.view", "View Divisions", "View division information", "division", "division", `{"resource_type":"division","actions":["read"],"required_scope":"estate"}`},
		{"division.create", "Create Divisions", "Create new divisions", "division", "division", `{"resource_type":"division","actions":["create"],"required_scope":"estate"}`},
		{"division.update", "Update Divisions", "Update division information", "division", "division", `{"resource_type":"division","actions":["update"],"required_scope":"estate"}`},
		{"division.delete", "Delete Divisions", "Delete divisions", "division", "division", `{"resource_type":"division","actions":["delete"],"required_scope":"estate"}`},

		// Reporting Features
		{"reports", "Reporting", "Access to reporting and analytics", "reports", "", `{"resource_type":"report","ui_metadata":{"icon":"chart","color":"red"}}`},
		{"reports.harvest", "Harvest Reports", "View harvest reports", "reports", "reports", `{"resource_type":"report","actions":["read"],"required_scope":"estate"}`},
		{"reports.performance", "Performance Reports", "View performance reports", "reports", "reports", `{"resource_type":"report","actions":["read"],"required_scope":"company"}`},
		{"reports.analytics", "Analytics Dashboard", "Access analytics dashboard", "reports", "reports", `{"resource_type":"report","actions":["read"],"required_scope":"company"}`},
		{"reports.export", "Export Reports", "Export reports and data", "reports", "reports", `{"resource_type":"report","actions":["export"],"required_scope":"estate"}`},

		// System Administration Features
		{"admin", "System Administration", "Access to system administration", "admin", "", `{"resource_type":"system","ui_metadata":{"icon":"settings","color":"gray"}}`},
		{"admin.settings", "System Settings", "Manage system settings", "admin", "admin", `{"resource_type":"system","actions":["read","update"],"required_scope":"global"}`},
		{"admin.roles", "Role Management", "Manage roles and permissions", "admin", "admin", `{"resource_type":"role","actions":["read","create","update","delete"],"required_scope":"global"}`},
		{"admin.features", "Feature Management", "Manage feature flags and access", "admin", "admin", `{"resource_type":"feature","actions":["read","create","update","delete"],"required_scope":"global"}`},
		{"admin.audit", "Audit Logs", "View system audit logs", "admin", "admin", `{"resource_type":"audit","actions":["read"],"required_scope":"global"}`},
		{"admin.apikeys", "API Key Management", "Manage API keys", "admin", "admin", `{"resource_type":"api_key","actions":["read","create","update","delete"],"required_scope":"global"}`},
	}

	// First pass: Insert all features without parent_id
	for _, feature := range features {
		name := feature[0]
		displayName := feature[1]
		description := feature[2]
		module := feature[3]
		metadata := feature[5]

		sql := `
			INSERT INTO features (name, display_name, description, module, is_active, is_system, metadata)
			VALUES (?, ?, ?, ?, true, true, ?::jsonb)
			ON CONFLICT (name) DO NOTHING;
		`

		if err := db.WithContext(ctx).Exec(sql, name, displayName, description, module, metadata).Error; err != nil {
			return fmt.Errorf("failed to insert feature %s: %w", name, err)
		}
	}

	// Second pass: Update parent_id for child features
	for _, feature := range features {
		name := feature[0]
		parentName := feature[4]

		if parentName != "" {
			sql := `
				UPDATE features
				SET parent_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL)
				WHERE name = ? AND deleted_at IS NULL;
			`

			if err := db.WithContext(ctx).Exec(sql, parentName, name).Error; err != nil {
				return fmt.Errorf("failed to update parent for feature %s: %w", name, err)
			}
		}
	}

	return nil
}

func (m *Migration000006SeedSystemFeatures) Down(ctx context.Context, db *gorm.DB) error {
	// Delete all system features
	if err := db.WithContext(ctx).Exec(`
		DELETE FROM features WHERE is_system = true;
	`).Error; err != nil {
		return fmt.Errorf("failed to delete system features: %w", err)
	}

	return nil
}
