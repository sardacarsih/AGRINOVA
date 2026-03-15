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

func containsValue(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
