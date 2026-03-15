package theme

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const (
	testBaseThemeID     = "00000000-0000-0000-0000-000000000101"
	testCampaignThemeID = "00000000-0000-0000-0000-000000000102"
)

func TestResolveRuntimeThemeReturnsActiveCampaignWhenModeAllowed(t *testing.T) {
	service, db := newRuntimeThemeTestService(t)

	now := time.Now().UTC()
	startAt := now.Add(-1 * time.Hour)
	endAt := now.Add(1 * time.Hour)

	campaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000201",
		ThemeID:          testCampaignThemeID,
		CampaignGroupKey: "group-active",
		CampaignName:     "Active Campaign",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         100,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		AssetsJSON: JSONMap{
			"web": JSONMap{
				"backgroundImage": "https://example.com/campaign-web-bg.png",
			},
		},
		UpdatedBy: "tester",
	}
	if err := db.Create(&campaign).Error; err != nil {
		t.Fatalf("db.Create(campaign) error: %v", err)
	}

	payload, err := service.ResolveRuntimeTheme(context.Background(), RuntimeThemeContext{
		Platform: "web",
		Mode:     "dark",
	})
	if err != nil {
		t.Fatalf("ResolveRuntimeTheme(web,dark) error: %v", err)
	}
	if payload.Source != "ACTIVE_CAMPAIGN" {
		t.Errorf("ResolveRuntimeTheme(web,dark) source = %q, want %q", payload.Source, "ACTIVE_CAMPAIGN")
	}
	if !payload.ModeAllowed {
		t.Errorf("ResolveRuntimeTheme(web,dark) modeAllowed = %v, want %v", payload.ModeAllowed, true)
	}
	if payload.Campaign == nil {
		t.Fatalf("ResolveRuntimeTheme(web,dark) campaign = nil, want non-nil")
	}
	if payload.Campaign.ID != campaign.ID {
		t.Errorf("ResolveRuntimeTheme(web,dark) campaignID = %q, want %q", payload.Campaign.ID, campaign.ID)
	}
	if payload.Theme.ID != testCampaignThemeID {
		t.Errorf("ResolveRuntimeTheme(web,dark) themeID = %q, want %q", payload.Theme.ID, testCampaignThemeID)
	}
}

func TestResolveRuntimeThemeReturnsModeFallbackForTopPriorityBlockedCampaign(t *testing.T) {
	service, db := newRuntimeThemeTestService(t)

	now := time.Now().UTC()
	startAt := now.Add(-1 * time.Hour)
	endAt := now.Add(1 * time.Hour)

	blockedTopCampaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000202",
		ThemeID:          testCampaignThemeID,
		CampaignGroupKey: "group-top",
		CampaignName:     "Top Campaign Dark Blocked",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         200,
		LightModeEnabled: true,
		DarkModeEnabled:  false,
		AssetsJSON:       JSONMap{},
		UpdatedBy:        "tester",
	}
	if err := db.Create(&blockedTopCampaign).Error; err != nil {
		t.Fatalf("db.Create(blockedTopCampaign) error: %v", err)
	}

	lowerAllowedCampaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000203",
		ThemeID:          testCampaignThemeID,
		CampaignGroupKey: "group-lower",
		CampaignName:     "Lower Campaign Dark Allowed",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         100,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		AssetsJSON:       JSONMap{},
		UpdatedBy:        "tester",
	}
	if err := db.Create(&lowerAllowedCampaign).Error; err != nil {
		t.Fatalf("db.Create(lowerAllowedCampaign) error: %v", err)
	}

	payload, err := service.ResolveRuntimeTheme(context.Background(), RuntimeThemeContext{
		Platform: "web",
		Mode:     "dark",
	})
	if err != nil {
		t.Fatalf("ResolveRuntimeTheme(web,dark) error: %v", err)
	}
	if payload.Source != "MODE_FALLBACK_BASE" {
		t.Errorf("ResolveRuntimeTheme(web,dark) source = %q, want %q", payload.Source, "MODE_FALLBACK_BASE")
	}
	if payload.ModeAllowed {
		t.Errorf("ResolveRuntimeTheme(web,dark) modeAllowed = %v, want %v", payload.ModeAllowed, false)
	}
	if payload.Campaign == nil {
		t.Fatalf("ResolveRuntimeTheme(web,dark) campaign = nil, want non-nil")
	}
	if payload.Campaign.ID != blockedTopCampaign.ID {
		t.Errorf("ResolveRuntimeTheme(web,dark) campaignID = %q, want %q", payload.Campaign.ID, blockedTopCampaign.ID)
	}
	if payload.Theme.ID != testBaseThemeID {
		t.Errorf("ResolveRuntimeTheme(web,dark) themeID = %q, want %q", payload.Theme.ID, testBaseThemeID)
	}
}

func TestResolveRuntimeThemeReturnsBaseThemeWhenNoActiveCampaign(t *testing.T) {
	service, db := newRuntimeThemeTestService(t)

	now := time.Now().UTC()
	startAt := now.Add(-2 * time.Hour)
	endAt := now.Add(-1 * time.Hour)

	expiredCampaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000204",
		ThemeID:          testCampaignThemeID,
		CampaignGroupKey: "group-expired",
		CampaignName:     "Expired Campaign",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         100,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		AssetsJSON:       JSONMap{},
		UpdatedBy:        "tester",
	}
	if err := db.Create(&expiredCampaign).Error; err != nil {
		t.Fatalf("db.Create(expiredCampaign) error: %v", err)
	}

	payload, err := service.ResolveRuntimeTheme(context.Background(), RuntimeThemeContext{
		Platform: "mobile",
		Mode:     "dark",
	})
	if err != nil {
		t.Fatalf("ResolveRuntimeTheme(mobile,dark) error: %v", err)
	}
	if payload.Source != "BASE_THEME" {
		t.Errorf("ResolveRuntimeTheme(mobile,dark) source = %q, want %q", payload.Source, "BASE_THEME")
	}
	if payload.Campaign != nil {
		t.Errorf("ResolveRuntimeTheme(mobile,dark) campaign = %v, want nil", payload.Campaign)
	}
	if payload.Theme.ID != testBaseThemeID {
		t.Errorf("ResolveRuntimeTheme(mobile,dark) themeID = %q, want %q", payload.Theme.ID, testBaseThemeID)
	}
}

func newRuntimeThemeTestService(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping runtime DB tests; sqlite driver unavailable: %v", err)
		return nil, nil
	}

	if err := db.AutoMigrate(&Theme{}, &ThemeCampaign{}, &ThemeSettings{}); err != nil {
		t.Fatalf("db.AutoMigrate(theme runtime models) error: %v", err)
	}

	baseTheme := Theme{
		ID:                testBaseThemeID,
		Code:              "base-default",
		Name:              "Base Default",
		Type:              "base",
		TokenJSON:         JSONMap{"accentColor": "#059669"},
		AssetManifestJSON: JSONMap{"backgroundImage": "https://example.com/base-bg.png"},
		IsActive:          true,
	}
	if err := db.Create(&baseTheme).Error; err != nil {
		t.Fatalf("db.Create(baseTheme) error: %v", err)
	}

	campaignTheme := Theme{
		ID:                testCampaignThemeID,
		Code:              "seasonal-test",
		Name:              "Seasonal Test",
		Type:              "seasonal",
		TokenJSON:         JSONMap{"accentColor": "#0f766e"},
		AssetManifestJSON: JSONMap{"backgroundImage": "https://example.com/seasonal-bg.png"},
		IsActive:          true,
	}
	if err := db.Create(&campaignTheme).Error; err != nil {
		t.Fatalf("db.Create(campaignTheme) error: %v", err)
	}

	settings := ThemeSettings{
		ID:               1,
		DefaultThemeID:   testBaseThemeID,
		GlobalKillSwitch: false,
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("db.Create(themeSettings) error: %v", err)
	}

	return NewService(db), db
}
