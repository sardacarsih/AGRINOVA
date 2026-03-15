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

func TestResolveRuntimeThemeMergesAppUINavbarAndFooterForMobile(t *testing.T) {
	service, db := newRuntimeThemeTestService(t)

	var campaignTheme Theme
	if err := db.First(&campaignTheme, "id = ?", testCampaignThemeID).Error; err != nil {
		t.Fatalf("db.First(campaignTheme) error: %v", err)
	}
	campaignTheme.AssetManifestJSON = JSONMap{
		"app_ui": JSONMap{
			"navbar": JSONMap{
				"backgroundColor": "#0F172A",
				"foregroundColor": "#FFFFFF",
			},
			"footer": JSONMap{
				"backgroundColor": "#111827",
				"foregroundColor": "#9CA3AF",
				"borderColor":     "#1F2937",
			},
		},
	}
	if err := db.Save(&campaignTheme).Error; err != nil {
		t.Fatalf("db.Save(campaignTheme) error: %v", err)
	}

	now := time.Now().UTC()
	startAt := now.Add(-30 * time.Minute)
	endAt := now.Add(30 * time.Minute)

	campaign := ThemeCampaign{
		ID:               "00000000-0000-0000-0000-000000000205",
		ThemeID:          testCampaignThemeID,
		CampaignGroupKey: "group-mobile-app-ui",
		CampaignName:     "Mobile App UI Campaign",
		Enabled:          true,
		StartAt:          &startAt,
		EndAt:            &endAt,
		Priority:         150,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		AssetsJSON: JSONMap{
			"mobile": JSONMap{
				"app_ui": JSONMap{
					"navbar": JSONMap{
						"iconColor": "#A7F3D0",
					},
					"footer": JSONMap{
						"accentColor": "#34D399",
					},
				},
			},
		},
		UpdatedBy: "tester",
	}
	if err := db.Create(&campaign).Error; err != nil {
		t.Fatalf("db.Create(campaign) error: %v", err)
	}

	payload, err := service.ResolveRuntimeTheme(context.Background(), RuntimeThemeContext{
		Platform: "mobile",
		Mode:     "light",
	})
	if err != nil {
		t.Fatalf("ResolveRuntimeTheme(mobile,light) error: %v", err)
	}

	if payload.Source != "ACTIVE_CAMPAIGN" {
		t.Fatalf("ResolveRuntimeTheme(mobile,light) source = %q, want %q", payload.Source, "ACTIVE_CAMPAIGN")
	}

	appUI := normalizeAppUISlots(payload.AppUI)
	navbarRaw, ok := appUI["navbar"]
	if !ok {
		t.Fatalf("payload.AppUI missing navbar slot")
	}
	navbar, ok := toInterfaceMap(navbarRaw)
	if !ok {
		t.Fatalf("payload.AppUI navbar is not an object")
	}

	footerRaw, ok := appUI["footer"]
	if !ok {
		t.Fatalf("payload.AppUI missing footer slot")
	}
	footer, ok := toInterfaceMap(footerRaw)
	if !ok {
		t.Fatalf("payload.AppUI footer is not an object")
	}

	if navbar["backgroundColor"] != "#0F172A" {
		t.Errorf("payload.AppUI.navbar.backgroundColor = %v, want %q", navbar["backgroundColor"], "#0F172A")
	}
	if navbar["foregroundColor"] != "#FFFFFF" {
		t.Errorf("payload.AppUI.navbar.foregroundColor = %v, want %q", navbar["foregroundColor"], "#FFFFFF")
	}
	if navbar["iconColor"] != "#A7F3D0" {
		t.Errorf("payload.AppUI.navbar.iconColor = %v, want %q", navbar["iconColor"], "#A7F3D0")
	}

	if footer["backgroundColor"] != "#111827" {
		t.Errorf("payload.AppUI.footer.backgroundColor = %v, want %q", footer["backgroundColor"], "#111827")
	}
	if footer["foregroundColor"] != "#9CA3AF" {
		t.Errorf("payload.AppUI.footer.foregroundColor = %v, want %q", footer["foregroundColor"], "#9CA3AF")
	}
	if footer["borderColor"] != "#1F2937" {
		t.Errorf("payload.AppUI.footer.borderColor = %v, want %q", footer["borderColor"], "#1F2937")
	}
	if footer["accentColor"] != "#34D399" {
		t.Errorf("payload.AppUI.footer.accentColor = %v, want %q", footer["accentColor"], "#34D399")
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
