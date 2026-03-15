package theme

import "testing"

func TestNormalizeCampaignAssets_LegacyShapeCopiesToBothPlatforms(t *testing.T) {
	input := JSONMap{
		"backgroundImage": "https://example.com/bg.png",
		"illustration":    "https://example.com/hero.png",
		"iconPack":        "outline-enterprise",
		"accentAsset":     "leaf-ribbon",
	}

	normalized := normalizeCampaignAssets(input)
	web := normalizePlatformAssets(normalized["web"])
	mobile := normalizePlatformAssets(normalized["mobile"])

	if web["backgroundImage"] != "https://example.com/bg.png" {
		t.Fatalf("expected web background to be copied from legacy asset")
	}
	if mobile["backgroundImage"] != "https://example.com/bg.png" {
		t.Fatalf("expected mobile background to be copied from legacy asset")
	}
}

func TestMergeThemeAssetsWithCampaign_UsesFallbackForBlankValues(t *testing.T) {
	base := JSONMap{
		"backgroundImage": "https://example.com/base-bg.png",
		"illustration":    "https://example.com/base-hero.png",
		"iconPack":        "base-icons",
		"accentAsset":     "base-accent",
	}
	override := JSONMap{
		"backgroundImage": "",
		"illustration":    "https://example.com/campaign-hero.png",
		"iconPack":        "",
		"accentAsset":     "campaign-accent",
	}

	merged := mergeThemeAssetsWithCampaign(base, override)

	if merged["backgroundImage"] != "https://example.com/base-bg.png" {
		t.Fatalf("expected blank campaign value to fallback to base background")
	}
	if merged["illustration"] != "https://example.com/campaign-hero.png" {
		t.Fatalf("expected non-blank campaign illustration to override base")
	}
	if merged["iconPack"] != "base-icons" {
		t.Fatalf("expected blank campaign iconPack to fallback to base")
	}
	if merged["accentAsset"] != "campaign-accent" {
		t.Fatalf("expected campaign accent asset to override base")
	}
}

func TestCollectVisualOptions_CombinesDefaultThemeAndCampaignValues(t *testing.T) {
	themes := []Theme{
		{
			AssetManifestJSON: JSONMap{
				"iconPack":    "theme-icons",
				"accentAsset": "theme-accent",
			},
		},
	}
	campaigns := []ThemeCampaign{
		{
			AssetsJSON: JSONMap{
				"web": JSONMap{
					"iconPack":    "web-icons",
					"accentAsset": "web-accent",
				},
				"mobile": JSONMap{
					"iconPack":    "mobile-icons",
					"accentAsset": "mobile-accent",
				},
			},
		},
	}

	iconPacks, accentAssets := collectVisualOptions(themes, campaigns)

	expectedIconPacks := []string{
		"glyph-ops",
		"mobile-icons",
		"outline-enterprise",
		"rounded-enterprise",
		"theme-icons",
		"web-icons",
	}
	expectedAccentAssets := []string{
		"diamond-grid",
		"leaf-ribbon",
		"mobile-accent",
		"none",
		"theme-accent",
		"wave-bars",
		"web-accent",
	}

	for _, option := range expectedIconPacks {
		if !containsValue(iconPacks, option) {
			t.Fatalf("expected icon pack option %q to be present", option)
		}
	}

	for _, option := range expectedAccentAssets {
		if !containsValue(accentAssets, option) {
			t.Fatalf("expected accent asset option %q to be present", option)
		}
	}
}

func TestNormalizeCampaignAssets_RejectsLegacyThemePaths(t *testing.T) {
	input := JSONMap{
		"web": JSONMap{
			"backgroundImage": "/theme-dummy/ramadan-core/web-background.svg",
			"illustration":    "/theme-assets/ramadan-core/web-illustration.svg",
		},
		"mobile": JSONMap{
			"backgroundImage": "theme-dummy/ramadan-core/mobile-background.svg",
			"illustration":    "theme-assets/ramadan-core/mobile-illustration.svg",
		},
	}

	normalized := normalizeCampaignAssets(input)
	web := normalizePlatformAssets(normalized["web"])
	mobile := normalizePlatformAssets(normalized["mobile"])

	if web["backgroundImage"] != "" {
		t.Fatalf("expected legacy web background path to be rejected")
	}
	if web["illustration"] != "" {
		t.Fatalf("expected legacy web illustration path to be rejected")
	}
	if mobile["backgroundImage"] != "" {
		t.Fatalf("expected legacy mobile background path to be rejected")
	}
	if mobile["illustration"] != "" {
		t.Fatalf("expected legacy mobile illustration path to be rejected")
	}
}

func TestNormalizeCampaignAssets_RejectsDataURLs(t *testing.T) {
	input := JSONMap{
		"backgroundImage": "data:image/svg+xml;base64,AAA",
		"illustration":    "javascript:alert(1)",
		"iconPack":        "outline-enterprise",
		"accentAsset":     "none",
	}

	normalized := normalizeCampaignAssets(input)
	web := normalizePlatformAssets(normalized["web"])

	if web["backgroundImage"] != "" {
		t.Fatalf("expected backgroundImage data url to be removed")
	}
	if web["illustration"] != "" {
		t.Fatalf("expected illustration javascript url to be removed")
	}
}

func TestNormalizeThemeAssetManifest_MapsLegacyValuesIntoAppUISlots(t *testing.T) {
	manifest := normalizeThemeAssetManifest(JSONMap{
		"backgroundImage": "https://example.com/base-bg.png",
		"illustration":    "https://example.com/empty-state.png",
		"accentAsset":     "leaf-ribbon",
	})

	appUI := normalizeAppUISlots(manifest["app_ui"])
	emptyState, _ := appUI["empty_state_illustration"].(JSONMap)
	dashboard, _ := appUI["dashboard"].(JSONMap)
	modalAccent, _ := appUI["modal_accent"].(JSONMap)

	if emptyState["asset"] != "https://example.com/empty-state.png" {
		t.Fatalf("expected empty state illustration asset fallback from legacy illustration")
	}
	if dashboard["asset"] != "https://example.com/base-bg.png" {
		t.Fatalf("expected dashboard asset fallback from legacy background")
	}
	if modalAccent["accentColor"] != "leaf-ribbon" {
		t.Fatalf("expected modal accent fallback from legacy accent asset")
	}
}

func TestNormalizeCampaignAssets_PreservesTypedAppUISlots(t *testing.T) {
	normalized := normalizeCampaignAssets(JSONMap{
		"mobile": JSONMap{
			"app_ui": JSONMap{
				"navbar": JSONMap{
					"backgroundColor": "#0F172A",
					"foregroundColor": "#FFFFFF",
				},
			},
		},
	})

	mobile := normalizePlatformAssets(normalized["mobile"])
	appUI := normalizeAppUISlots(mobile["app_ui"])
	navbar, _ := appUI["navbar"].(JSONMap)

	if navbar["backgroundColor"] != "#0F172A" {
		t.Fatalf("expected typed app_ui.navbar.backgroundColor to be preserved")
	}
	if navbar["foregroundColor"] != "#FFFFFF" {
		t.Fatalf("expected typed app_ui.navbar.foregroundColor to be preserved")
	}
}

func TestMergeThemeAssetsWithCampaign_MergesTypedAppUISlots(t *testing.T) {
	base := JSONMap{
		"app_ui": JSONMap{
			"navbar": JSONMap{
				"backgroundColor": "#14532D",
			},
		},
	}
	override := JSONMap{
		"app_ui": JSONMap{
			"navbar": JSONMap{
				"foregroundColor": "#FFFFFF",
			},
		},
	}

	merged := mergeThemeAssetsWithCampaign(base, override)
	appUI := normalizeAppUISlots(merged["app_ui"])
	navbar, _ := appUI["navbar"].(JSONMap)

	if navbar["backgroundColor"] != "#14532D" {
		t.Fatalf("expected base app_ui slot value to remain when campaign is blank")
	}
	if navbar["foregroundColor"] != "#FFFFFF" {
		t.Fatalf("expected campaign app_ui slot value to override/add")
	}
}

func TestValidateThemeInputRejectsUnsupportedAppUISlot(t *testing.T) {
	err := validateThemeInput(ThemeInput{
		Code:     "base-default",
		Name:     "Base Default",
		Type:     "base",
		IsActive: true,
		AssetManifestJSON: JSONMap{
			"app_ui": JSONMap{
				"unknown_slot": JSONMap{
					"backgroundColor": "#FFFFFF",
				},
			},
		},
	})

	if err == nil {
		t.Fatalf("expected unsupported app_ui slot to fail validation")
	}
}

func TestValidateCampaignInputRejectsNonStringAppUIProperty(t *testing.T) {
	err := validateCampaignInput(CampaignInput{
		CampaignGroupKey: "ramadan-core",
		CampaignName:     "Ramadan Core",
		ThemeID:          "00000000-0000-0000-0000-000000000101",
		Enabled:          true,
		Priority:         90,
		LightModeEnabled: true,
		DarkModeEnabled:  true,
		Assets: JSONMap{
			"mobile": JSONMap{
				"app_ui": JSONMap{
					"navbar": JSONMap{
						"backgroundColor": 123,
					},
				},
			},
		},
	})

	if err == nil {
		t.Fatalf("expected non-string app_ui property value to fail validation")
	}
}

func containsValue(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
