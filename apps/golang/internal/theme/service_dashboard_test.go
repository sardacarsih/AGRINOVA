package theme

import (
	"context"
	"reflect"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSanitizeUserLookupIDs(t *testing.T) {
	validA := "00000000-0000-0000-0000-000000000111"
	validB := "00000000-0000-0000-0000-000000000222"

	testCases := []struct {
		name  string
		input []string
		want  []string
	}{
		{
			name:  "returns nil for empty input",
			input: nil,
			want:  nil,
		},
		{
			name:  "filters non uuid values and trims whitespace",
			input: []string{" system-seed ", "unknown", " ", validA, "\t" + validB + "\n"},
			want:  []string{validA, validB},
		},
		{
			name:  "deduplicates valid uuid values",
			input: []string{validA, validA, validB, validB, "system-seed"},
			want:  []string{validA, validB},
		},
		{
			name:  "rejects uuid-like but invalid format",
			input: []string{"00000000-0000-0000-0000-00000000011Z", validA},
			want:  []string{validA},
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := sanitizeUserLookupIDs(tc.input)
			if !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("sanitizeUserLookupIDs() = %#v, want %#v", got, tc.want)
			}
		})
	}
}

func TestGetDashboardWithSystemSeedActorsSkipsUserLookupAndResolvesDisplayName(t *testing.T) {
	service, db := newDashboardTestService(t)

	now := time.Now().UTC()
	startAt := now.Add(-1 * time.Hour)
	endAt := now.Add(1 * time.Hour)

	theme := Theme{
		ID:                "00000000-0000-0000-0000-000000000901",
		Code:              "base-default",
		Name:              "Base Default",
		Type:              "base",
		TokenJSON:         JSONMap{"accentColor": "#059669"},
		AssetManifestJSON: JSONMap{"backgroundImage": "https://example.com/base-bg.png"},
		IsActive:          true,
	}
	if err := db.Create(&theme).Error; err != nil {
		t.Fatalf("db.Create(theme) error: %v", err)
	}

	settings := ThemeSettings{
		ID:               1,
		DefaultThemeID:   theme.ID,
		GlobalKillSwitch: false,
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("db.Create(settings) error: %v", err)
	}

	campaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000902",
		ThemeID:          theme.ID,
		CampaignGroupKey: "seed-campaign",
		CampaignName:     "Seed Campaign",
		Description:      "Created by system seed",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         100,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		AssetsJSON:       JSONMap{},
		UpdatedBy:        "system-seed",
	}
	if err := db.Create(&campaign).Error; err != nil {
		t.Fatalf("db.Create(campaign) error: %v", err)
	}

	log := ThemeAuditLog{
		ID:          "00000000-0000-0000-0000-000000000903",
		ActorUserID: "system-seed",
		Action:      "CREATE_CAMPAIGN",
		EntityType:  "theme_campaigns",
		EntityID:    campaign.ID,
		BeforeJSON:  JSONMap{},
		AfterJSON:   JSONMap{"campaign_name": campaign.CampaignName},
	}
	if err := db.Create(&log).Error; err != nil {
		t.Fatalf("db.Create(log) error: %v", err)
	}

	payload, err := service.GetDashboard(context.Background(), DashboardQuery{
		Page:     1,
		PageSize: 5,
	})
	if err != nil {
		t.Fatalf("GetDashboard() error: %v", err)
	}

	if len(payload.Campaigns) != 1 {
		t.Fatalf("GetDashboard() campaigns len = %d, want 1", len(payload.Campaigns))
	}
	if payload.Campaigns[0].UpdatedBy != "System Seed" {
		t.Fatalf("GetDashboard() campaign updated_by = %q, want %q", payload.Campaigns[0].UpdatedBy, "System Seed")
	}

	if payload.ActiveCampaign == nil {
		t.Fatalf("GetDashboard() active_campaign = nil, want non-nil")
	}
	if payload.ActiveCampaign.UpdatedBy != "System Seed" {
		t.Fatalf("GetDashboard() active campaign updated_by = %q, want %q", payload.ActiveCampaign.UpdatedBy, "System Seed")
	}

	if len(payload.AuditLogs) != 1 {
		t.Fatalf("GetDashboard() audit_logs len = %d, want 1", len(payload.AuditLogs))
	}
	if payload.AuditLogs[0].Actor != "System Seed" {
		t.Fatalf("GetDashboard() audit actor = %q, want %q", payload.AuditLogs[0].Actor, "System Seed")
	}
}

func newDashboardTestService(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping dashboard DB tests; sqlite driver unavailable: %v", err)
		return nil, nil
	}

	if err := db.AutoMigrate(&Theme{}, &ThemeCampaign{}, &ThemeSettings{}, &ThemeAuditLog{}); err != nil {
		t.Fatalf("db.AutoMigrate(theme dashboard models) error: %v", err)
	}

	return NewService(db), db
}
