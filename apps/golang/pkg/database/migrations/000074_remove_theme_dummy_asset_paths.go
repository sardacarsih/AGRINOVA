package migrations

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"path"
	"strings"

	"gorm.io/gorm"
)

// Migration000074RemoveThemeDummyAssetPaths rewrites legacy theme asset paths
// (/theme-dummy/* and /theme-assets/*) into /uploads/theme-assets/*.
func Migration000074RemoveThemeDummyAssetPaths(db *gorm.DB) error {
	log.Println("Running migration: 000074_remove_theme_dummy_asset_paths")

	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	themesUpdated, err := migrateThemeAssetManifestPaths(tx)
	if err != nil {
		tx.Rollback()
		return err
	}

	campaignsUpdated, err := migrateThemeCampaignAssetPaths(tx)
	if err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	log.Printf("Migration 000074 completed. themes updated: %d, campaigns updated: %d", themesUpdated, campaignsUpdated)
	return nil
}

func migrateThemeAssetManifestPaths(tx *gorm.DB) (int, error) {
	exists, err := migrationTableExists(tx, "themes")
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, nil
	}

	type row struct {
		ID                string `gorm:"column:id"`
		AssetManifestJSON []byte `gorm:"column:asset_manifest_json"`
	}

	var rows []row
	if err := tx.Raw("SELECT id, asset_manifest_json FROM themes").Scan(&rows).Error; err != nil {
		return 0, fmt.Errorf("load themes for migration 000074: %w", err)
	}

	updated := 0
	for _, currentRow := range rows {
		payload := map[string]interface{}{}
		if len(currentRow.AssetManifestJSON) > 0 {
			if err := json.Unmarshal(currentRow.AssetManifestJSON, &payload); err != nil {
				return updated, fmt.Errorf("decode themes.asset_manifest_json id=%s: %w", currentRow.ID, err)
			}
		}

		if !rewriteLegacyThemeAssetPaths(payload) {
			continue
		}

		normalizedJSON, err := json.Marshal(payload)
		if err != nil {
			return updated, fmt.Errorf("encode themes.asset_manifest_json id=%s: %w", currentRow.ID, err)
		}

		if err := tx.Exec("UPDATE themes SET asset_manifest_json = ?::jsonb WHERE id = ?", string(normalizedJSON), currentRow.ID).Error; err != nil {
			return updated, fmt.Errorf("update themes.asset_manifest_json id=%s: %w", currentRow.ID, err)
		}
		updated++
	}

	return updated, nil
}

func migrateThemeCampaignAssetPaths(tx *gorm.DB) (int, error) {
	exists, err := migrationTableExists(tx, "theme_campaigns")
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, nil
	}

	type row struct {
		ID         string `gorm:"column:id"`
		AssetsJSON []byte `gorm:"column:assets_json"`
	}

	var rows []row
	if err := tx.Raw("SELECT id, assets_json FROM theme_campaigns").Scan(&rows).Error; err != nil {
		return 0, fmt.Errorf("load theme_campaigns for migration 000074: %w", err)
	}

	updated := 0
	for _, currentRow := range rows {
		payload := map[string]interface{}{}
		if len(currentRow.AssetsJSON) > 0 {
			if err := json.Unmarshal(currentRow.AssetsJSON, &payload); err != nil {
				return updated, fmt.Errorf("decode theme_campaigns.assets_json id=%s: %w", currentRow.ID, err)
			}
		}

		if !rewriteLegacyThemeAssetPaths(payload) {
			continue
		}

		normalizedJSON, err := json.Marshal(payload)
		if err != nil {
			return updated, fmt.Errorf("encode theme_campaigns.assets_json id=%s: %w", currentRow.ID, err)
		}

		if err := tx.Exec("UPDATE theme_campaigns SET assets_json = ?::jsonb WHERE id = ?", string(normalizedJSON), currentRow.ID).Error; err != nil {
			return updated, fmt.Errorf("update theme_campaigns.assets_json id=%s: %w", currentRow.ID, err)
		}
		updated++
	}

	return updated, nil
}

func rewriteLegacyThemeAssetPaths(payload map[string]interface{}) bool {
	changed := rewriteLegacyThemeAssetFields(payload)

	if nestedWeb, ok := asJSONMap(payload["web"]); ok {
		if rewriteLegacyThemeAssetFields(nestedWeb) {
			payload["web"] = nestedWeb
			changed = true
		}
	}

	if nestedMobile, ok := asJSONMap(payload["mobile"]); ok {
		if rewriteLegacyThemeAssetFields(nestedMobile) {
			payload["mobile"] = nestedMobile
			changed = true
		}
	}

	return changed
}

func rewriteLegacyThemeAssetFields(payload map[string]interface{}) bool {
	changed := false
	for _, key := range []string{"backgroundImage", "illustration"} {
		value, ok := payload[key]
		if !ok {
			continue
		}
		stringValue, ok := value.(string)
		if !ok {
			continue
		}

		normalized, didChange := normalizeLegacyThemeAssetPath(stringValue)
		if !didChange {
			continue
		}

		payload[key] = normalized
		changed = true
	}

	return changed
}

func normalizeLegacyThemeAssetPath(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", false
	}

	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	lower := strings.ToLower(normalized)

	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		parsedURL, err := url.Parse(trimmed)
		if err != nil {
			return trimmed, false
		}

		lowerPath := strings.ToLower(parsedURL.Path)
		switch {
		case strings.HasPrefix(lowerPath, "/theme-dummy/"):
			parsedURL.Path = buildCanonicalThemeAssetPath(parsedURL.Path[len("/theme-dummy/"):])
			return parsedURL.String(), true
		case strings.HasPrefix(lowerPath, "/theme-assets/"):
			parsedURL.Path = buildCanonicalThemeAssetPath(parsedURL.Path[len("/theme-assets/"):])
			return parsedURL.String(), true
		}

		return trimmed, false
	}

	switch {
	case strings.HasPrefix(lower, "/theme-dummy/"):
		return buildCanonicalThemeAssetPath(normalized[len("/theme-dummy/"):]), true
	case strings.HasPrefix(lower, "theme-dummy/"):
		return buildCanonicalThemeAssetPath(normalized[len("theme-dummy/"):]), true
	case strings.HasPrefix(lower, "/theme-assets/"):
		return buildCanonicalThemeAssetPath(normalized[len("/theme-assets/"):]), true
	case strings.HasPrefix(lower, "theme-assets/"):
		return buildCanonicalThemeAssetPath(normalized[len("theme-assets/"):]), true
	default:
		return trimmed, false
	}
}

func buildCanonicalThemeAssetPath(suffix string) string {
	cleanSuffix := strings.Trim(strings.ReplaceAll(suffix, "\\", "/"), "/")
	if cleanSuffix == "" {
		return "/uploads/theme-assets"
	}
	return path.Clean("/uploads/theme-assets/" + cleanSuffix)
}

func asJSONMap(raw interface{}) (map[string]interface{}, bool) {
	switch value := raw.(type) {
	case map[string]interface{}:
		return value, true
	default:
		return nil, false
	}
}

func migrationTableExists(tx *gorm.DB, tableName string) (bool, error) {
	var exists bool
	if err := tx.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = ?
		)
	`, tableName).Scan(&exists).Error; err != nil {
		return false, fmt.Errorf("inspect table %s for migration 000074: %w", tableName, err)
	}
	return exists, nil
}
