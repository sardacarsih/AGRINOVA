package theme

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringArray stores []string into JSONB columns.
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	payload, err := json.Marshal(a)
	if err != nil {
		return nil, err
	}
	return payload, nil
}

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = StringArray{}
		return nil
	}

	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported StringArray scan type: %T", value)
	}

	if len(raw) == 0 {
		*a = StringArray{}
		return nil
	}

	var decoded []string
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return err
	}

	*a = StringArray(decoded)
	return nil
}

// JSONMap stores generic objects into JSONB columns.
type JSONMap map[string]interface{}

func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return []byte(`{}`), nil
	}
	payload, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return payload, nil
}

func (m *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*m = JSONMap{}
		return nil
	}

	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported JSONMap scan type: %T", value)
	}

	if len(raw) == 0 {
		*m = JSONMap{}
		return nil
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return err
	}

	*m = JSONMap(decoded)
	return nil
}

type Theme struct {
	ID                string    `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Code              string    `gorm:"column:code;type:varchar(120);uniqueIndex;not null" json:"code"`
	Name              string    `gorm:"column:name;type:varchar(160);not null" json:"name"`
	Type              string    `gorm:"column:type;type:varchar(20);not null" json:"type"`
	TokenJSON         JSONMap   `gorm:"column:token_json;type:jsonb;not null" json:"token_json"`
	AssetManifestJSON JSONMap   `gorm:"column:asset_manifest_json;type:jsonb;not null" json:"asset_manifest_json"`
	IsActive          bool      `gorm:"column:is_active;not null" json:"is_active"`
	CreatedAt         time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Theme) TableName() string {
	return "themes"
}

type ThemeCampaign struct {
	ID               string     `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ThemeID          string     `gorm:"column:theme_id;type:uuid;not null;index" json:"theme_id"`
	CampaignGroupKey string     `gorm:"column:campaign_group_key;type:varchar(180);not null;index" json:"campaign_group_key"`
	CampaignName     string     `gorm:"column:campaign_name;type:varchar(180);not null;index" json:"campaign_name"`
	Description      string     `gorm:"column:description;type:text" json:"description"`
	Enabled          bool       `gorm:"column:enabled;not null" json:"enabled"`
	StartAt          *time.Time `gorm:"column:start_at;type:timestamptz" json:"start_at,omitempty"`
	EndAt            *time.Time `gorm:"column:end_at;type:timestamptz" json:"end_at,omitempty"`
	Priority         int        `gorm:"column:priority;not null" json:"priority"`
	LightModeEnabled bool       `gorm:"column:light_mode_enabled;not null" json:"light_mode_enabled"`
	DarkModeEnabled  bool       `gorm:"column:dark_mode_enabled;not null" json:"dark_mode_enabled"`
	AssetsJSON       JSONMap    `gorm:"column:assets_json;type:jsonb;not null" json:"assets"`
	UpdatedBy        string     `gorm:"column:updated_by;type:varchar(180);not null" json:"updated_by"`
	UpdatedAt        time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	CreatedAt        time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (ThemeCampaign) TableName() string {
	return "theme_campaigns"
}

type ThemeSettings struct {
	ID               int       `gorm:"column:id;primaryKey" json:"id"`
	DefaultThemeID   string    `gorm:"column:default_theme_id;type:uuid;not null" json:"default_theme_id"`
	GlobalKillSwitch bool      `gorm:"column:global_kill_switch;not null" json:"global_kill_switch"`
	UpdatedAt        time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (ThemeSettings) TableName() string {
	return "theme_settings"
}

type ThemeAuditLog struct {
	ID          string    `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ActorUserID string    `gorm:"column:actor_user_id;type:varchar(180);not null" json:"actor_user_id"`
	Action      string    `gorm:"column:action;type:varchar(80);not null" json:"action"`
	EntityType  string    `gorm:"column:entity_type;type:varchar(80);not null" json:"entity_type"`
	EntityID    string    `gorm:"column:entity_id;type:varchar(180);not null" json:"entity_id"`
	BeforeJSON  JSONMap   `gorm:"column:before_json;type:jsonb;not null" json:"before_json"`
	AfterJSON   JSONMap   `gorm:"column:after_json;type:jsonb;not null" json:"after_json"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (ThemeAuditLog) TableName() string {
	return "theme_audit_logs"
}
