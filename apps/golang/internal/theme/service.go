package theme

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CampaignStatus string

const (
	CampaignStatusDraft     CampaignStatus = "DRAFT"
	CampaignStatusScheduled CampaignStatus = "SCHEDULED"
	CampaignStatusActive    CampaignStatus = "ACTIVE"
	CampaignStatusExpired   CampaignStatus = "EXPIRED"
	CampaignStatusDisabled  CampaignStatus = "DISABLED"
)

var campaignAssetKeys = []string{
	"backgroundImage",
	"illustration",
	"iconPack",
	"accentAsset",
}

var defaultIconPackOptions = []string{
	"outline-enterprise",
	"rounded-enterprise",
	"glyph-ops",
}

var defaultAccentAssetOptions = []string{
	"none",
	"leaf-ribbon",
	"diamond-grid",
	"wave-bars",
}

type DashboardQuery struct {
	Search        string
	Status        string
	SortField     string
	SortDirection string
	Page          int
	PageSize      int
}

type CampaignInput struct {
	CampaignGroupKey string     `json:"campaign_group_key"`
	CampaignName     string     `json:"campaign_name"`
	ThemeID          string     `json:"theme_id"`
	Description      string     `json:"description"`
	Enabled          bool       `json:"enabled"`
	StartAt          *time.Time `json:"start_at"`
	EndAt            *time.Time `json:"end_at"`
	Priority         int        `json:"priority"`
	LightModeEnabled bool       `json:"light_mode_enabled"`
	DarkModeEnabled  bool       `json:"dark_mode_enabled"`
	Assets           JSONMap    `json:"assets"`
}

type ThemeInput struct {
	Code              string  `json:"code"`
	Name              string  `json:"name"`
	Type              string  `json:"type"`
	IsActive          bool    `json:"is_active"`
	TokenJSON         JSONMap `json:"token_json"`
	AssetManifestJSON JSONMap `json:"asset_manifest_json"`
}

type CampaignDTO struct {
	ID               string     `json:"id"`
	ThemeID          string     `json:"theme_id"`
	CampaignGroupKey string     `json:"campaign_group_key"`
	CampaignName     string     `json:"campaign_name"`
	Description      string     `json:"description"`
	Enabled          bool       `json:"enabled"`
	StartAt          *time.Time `json:"start_at,omitempty"`
	EndAt            *time.Time `json:"end_at,omitempty"`
	Priority         int        `json:"priority"`
	LightModeEnabled bool       `json:"light_mode_enabled"`
	DarkModeEnabled  bool       `json:"dark_mode_enabled"`
	Assets           JSONMap    `json:"assets"`
	UpdatedBy        string     `json:"updated_by"`
	UpdatedAt        time.Time  `json:"updated_at"`
	Status           string     `json:"status"`
}

type ThemeDTO struct {
	ID       string  `json:"id"`
	Code     string  `json:"code"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	IsActive bool    `json:"is_active"`
	Tokens   JSONMap `json:"token_json"`
	Assets   JSONMap `json:"asset_manifest_json"`
}

type AuditLogDTO struct {
	ID            string    `json:"id"`
	Actor         string    `json:"actor"`
	Action        string    `json:"action"`
	TargetEntity  string    `json:"target_entity"`
	Timestamp     time.Time `json:"timestamp"`
	BeforeSummary string    `json:"before_summary"`
	AfterSummary  string    `json:"after_summary"`
}

type DashboardPayload struct {
	Campaigns      []CampaignDTO `json:"campaigns"`
	Themes         []ThemeDTO    `json:"themes"`
	Settings       ThemeSettings `json:"settings"`
	AuditLogs      []AuditLogDTO `json:"audit_logs"`
	TotalFiltered  int           `json:"total_filtered"`
	TotalPages     int           `json:"total_pages"`
	Page           int           `json:"page"`
	PageSize       int           `json:"page_size"`
	ActiveCampaign *CampaignDTO  `json:"active_campaign,omitempty"`
	Stats          struct {
		Total             int  `json:"total"`
		Active            int  `json:"active"`
		Scheduled         int  `json:"scheduled"`
		KillSwitchEnabled bool `json:"killSwitchEnabled"`
	} `json:"stats"`
	VisualOptions struct {
		IconPacks    []string `json:"icon_packs"`
		AccentAssets []string `json:"accent_assets"`
	} `json:"visual_options"`
}

type RuntimeThemeContext struct {
	Platform string
	Mode     string
}

type RuntimeThemePayload struct {
	Source            string       `json:"source"`
	KillSwitchEnabled bool         `json:"kill_switch_enabled"`
	AppliedMode       string       `json:"applied_mode"`
	ModeAllowed       bool         `json:"mode_allowed"`
	Theme             ThemeDTO     `json:"theme"`
	Campaign          *CampaignDTO `json:"campaign,omitempty"`
	Token             JSONMap      `json:"token_json"`
	Assets            JSONMap      `json:"asset_manifest_json"`
}

type Service struct {
	db *gorm.DB
}

type userDisplayRow struct {
	ID       string `gorm:"column:id"`
	Name     string `gorm:"column:name"`
	Username string `gorm:"column:username"`
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetDashboard(ctx context.Context, query DashboardQuery) (*DashboardPayload, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 5
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var campaigns []ThemeCampaign
	if err := s.db.WithContext(ctx).Order("updated_at DESC").Find(&campaigns).Error; err != nil {
		return nil, fmt.Errorf("load campaigns: %w", err)
	}

	now := time.Now()
	filtered := make([]ThemeCampaign, 0, len(campaigns))
	for _, campaign := range campaigns {
		if !matchCampaignFilters(campaign, query, now) {
			continue
		}
		filtered = append(filtered, campaign)
	}

	sortCampaigns(filtered, query.SortField, query.SortDirection, now)
	totalFiltered := len(filtered)
	totalPages := totalFiltered / pageSize
	if totalFiltered%pageSize != 0 {
		totalPages++
	}
	if totalPages == 0 {
		totalPages = 1
	}
	if page > totalPages {
		page = totalPages
	}

	start := (page - 1) * pageSize
	end := start + pageSize
	if end > totalFiltered {
		end = totalFiltered
	}

	paginated := []ThemeCampaign{}
	if start < end {
		paginated = filtered[start:end]
	}

	var themes []Theme
	if err := s.db.WithContext(ctx).Order("name ASC").Find(&themes).Error; err != nil {
		return nil, fmt.Errorf("load themes: %w", err)
	}

	settings, err := s.getSettings(ctx)
	if err != nil {
		return nil, err
	}

	var auditLogs []ThemeAuditLog
	if err := s.db.WithContext(ctx).Order("created_at DESC").Limit(25).Find(&auditLogs).Error; err != nil {
		return nil, fmt.Errorf("load audit logs: %w", err)
	}

	userIDs := collectActorIDs(paginated, auditLogs)
	userDisplayByID, err := s.loadUserDisplayMap(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	payload := &DashboardPayload{
		Campaigns:     make([]CampaignDTO, 0, len(paginated)),
		Themes:        make([]ThemeDTO, 0, len(themes)),
		AuditLogs:     make([]AuditLogDTO, 0, len(auditLogs)),
		TotalFiltered: totalFiltered,
		TotalPages:    totalPages,
		Page:          page,
		PageSize:      pageSize,
		Settings:      settings,
	}

	for _, theme := range themes {
		payload.Themes = append(payload.Themes, toThemeDTO(theme))
	}

	activeCampaigns := make([]ThemeCampaign, 0, len(campaigns))
	for _, campaign := range campaigns {
		status := resolveCampaignStatus(campaign, now)
		if status == CampaignStatusActive {
			activeCampaigns = append(activeCampaigns, campaign)
		}
	}
	sort.Slice(activeCampaigns, func(i, j int) bool {
		if activeCampaigns[i].Priority == activeCampaigns[j].Priority {
			return activeCampaigns[i].UpdatedAt.After(activeCampaigns[j].UpdatedAt)
		}
		return activeCampaigns[i].Priority > activeCampaigns[j].Priority
	})
	if len(activeCampaigns) > 0 {
		candidate := toCampaignDTO(activeCampaigns[0], now)
		candidate.UpdatedBy = resolveActorDisplayName(candidate.UpdatedBy, userDisplayByID)
		payload.ActiveCampaign = &candidate
	}

	for _, campaign := range paginated {
		campaignDTO := toCampaignDTO(campaign, now)
		campaignDTO.UpdatedBy = resolveActorDisplayName(campaignDTO.UpdatedBy, userDisplayByID)
		payload.Campaigns = append(payload.Campaigns, campaignDTO)
	}

	for _, log := range auditLogs {
		payload.AuditLogs = append(payload.AuditLogs, AuditLogDTO{
			ID:            log.ID,
			Actor:         resolveActorDisplayName(log.ActorUserID, userDisplayByID),
			Action:        log.Action,
			TargetEntity:  log.EntityID,
			Timestamp:     log.CreatedAt,
			BeforeSummary: summarizeJSON(log.BeforeJSON),
			AfterSummary:  summarizeJSON(log.AfterJSON),
		})
	}

	payload.Stats.Total = len(campaigns)
	for _, campaign := range campaigns {
		status := resolveCampaignStatus(campaign, now)
		if status == CampaignStatusActive {
			payload.Stats.Active++
		}
		if status == CampaignStatusScheduled {
			payload.Stats.Scheduled++
		}
	}
	payload.Stats.KillSwitchEnabled = settings.GlobalKillSwitch
	payload.VisualOptions.IconPacks, payload.VisualOptions.AccentAssets = collectVisualOptions(themes, campaigns)

	return payload, nil
}

func (s *Service) loadUserDisplayMap(ctx context.Context, ids []string) (map[string]string, error) {
	result := map[string]string{}
	lookupIDs := sanitizeUserLookupIDs(ids)
	if len(lookupIDs) == 0 {
		return result, nil
	}

	rows := make([]userDisplayRow, 0, len(lookupIDs))
	if err := s.db.WithContext(ctx).
		Table("users").
		Select("id, name, username").
		Where("id IN ?", lookupIDs).
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("load users for display labels: %w", err)
	}

	for _, row := range rows {
		id := strings.TrimSpace(row.ID)
		if id == "" {
			continue
		}

		name := strings.TrimSpace(row.Name)
		if name == "" {
			name = strings.TrimSpace(row.Username)
		}
		if name == "" {
			continue
		}

		result[id] = name
	}

	return result, nil
}

func sanitizeUserLookupIDs(ids []string) []string {
	if len(ids) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(ids))
	result := make([]string, 0, len(ids))
	for _, raw := range ids {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}

		if _, err := uuid.Parse(trimmed); err != nil {
			continue
		}

		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}

	return result
}

func (s *Service) GetThemes(ctx context.Context) ([]ThemeDTO, error) {
	var themes []Theme
	if err := s.db.WithContext(ctx).
		Order("CASE WHEN type = 'base' THEN 0 ELSE 1 END, name ASC").
		Find(&themes).Error; err != nil {
		return nil, fmt.Errorf("load themes: %w", err)
	}

	result := make([]ThemeDTO, 0, len(themes))
	for _, item := range themes {
		result = append(result, toThemeDTO(item))
	}
	return result, nil
}

func (s *Service) CreateTheme(ctx context.Context, actor string, input ThemeInput) (*ThemeDTO, error) {
	if err := validateThemeInput(input); err != nil {
		return nil, err
	}

	createdTheme := Theme{
		Code:              strings.TrimSpace(input.Code),
		Name:              strings.TrimSpace(input.Name),
		Type:              strings.ToLower(strings.TrimSpace(input.Type)),
		TokenJSON:         normalizeThemeTokens(input.TokenJSON),
		AssetManifestJSON: normalizeThemeAssetManifest(input.AssetManifestJSON),
		IsActive:          input.IsActive,
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	if err := tx.Create(&createdTheme).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("create theme: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "CREATE_THEME", "themes", createdTheme.ID, JSONMap{}, JSONMap{
		"code":      createdTheme.Code,
		"name":      createdTheme.Name,
		"type":      createdTheme.Type,
		"is_active": createdTheme.IsActive,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toThemeDTO(createdTheme)
	return &dto, nil
}

func (s *Service) UpdateTheme(ctx context.Context, actor string, themeID string, input ThemeInput) (*ThemeDTO, error) {
	if strings.TrimSpace(themeID) == "" {
		return nil, fmt.Errorf("theme id is required")
	}
	if err := validateThemeInput(input); err != nil {
		return nil, err
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var existingTheme Theme
	if err := tx.First(&existingTheme, "id = ?", strings.TrimSpace(themeID)).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("theme not found: %w", err)
	}

	settings, err := s.getSettingsTx(tx)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if !input.IsActive && settings.DefaultThemeID == existingTheme.ID {
		tx.Rollback()
		return nil, fmt.Errorf("default theme cannot be deactivated")
	}

	before := JSONMap{
		"code":      existingTheme.Code,
		"name":      existingTheme.Name,
		"type":      existingTheme.Type,
		"is_active": existingTheme.IsActive,
	}

	existingTheme.Code = strings.TrimSpace(input.Code)
	existingTheme.Name = strings.TrimSpace(input.Name)
	existingTheme.Type = strings.ToLower(strings.TrimSpace(input.Type))
	existingTheme.TokenJSON = normalizeThemeTokens(input.TokenJSON)
	existingTheme.AssetManifestJSON = normalizeThemeAssetManifest(input.AssetManifestJSON)
	existingTheme.IsActive = input.IsActive
	existingTheme.UpdatedAt = time.Now()

	if err := tx.Save(&existingTheme).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("update theme: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "UPDATE_THEME", "themes", existingTheme.ID, before, JSONMap{
		"code":      existingTheme.Code,
		"name":      existingTheme.Name,
		"type":      existingTheme.Type,
		"is_active": existingTheme.IsActive,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toThemeDTO(existingTheme)
	return &dto, nil
}

func (s *Service) ToggleThemeActive(ctx context.Context, actor string, themeID string) (*ThemeDTO, error) {
	if strings.TrimSpace(themeID) == "" {
		return nil, fmt.Errorf("theme id is required")
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var existingTheme Theme
	if err := tx.First(&existingTheme, "id = ?", strings.TrimSpace(themeID)).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("theme not found: %w", err)
	}

	settings, err := s.getSettingsTx(tx)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	nextActive := !existingTheme.IsActive
	if !nextActive && settings.DefaultThemeID == existingTheme.ID {
		tx.Rollback()
		return nil, fmt.Errorf("default theme cannot be deactivated")
	}

	beforeActive := existingTheme.IsActive
	existingTheme.IsActive = nextActive
	existingTheme.UpdatedAt = time.Now()
	if err := tx.Save(&existingTheme).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("toggle theme active: %w", err)
	}

	action := "DEACTIVATE_THEME"
	if existingTheme.IsActive {
		action = "ACTIVATE_THEME"
	}
	if err := s.appendAuditTx(
		tx,
		actor,
		action,
		"themes",
		existingTheme.ID,
		JSONMap{"is_active": beforeActive},
		JSONMap{"is_active": existingTheme.IsActive},
	); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toThemeDTO(existingTheme)
	return &dto, nil
}

func (s *Service) SetDefaultTheme(ctx context.Context, actor string, themeID string) (*ThemeSettings, error) {
	themeID = strings.TrimSpace(themeID)
	if themeID == "" {
		return nil, fmt.Errorf("theme id is required")
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var selectedTheme Theme
	if err := tx.First(&selectedTheme, "id = ?", themeID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("theme not found: %w", err)
	}
	if !selectedTheme.IsActive {
		tx.Rollback()
		return nil, fmt.Errorf("default theme must be active")
	}

	settings, err := s.getSettingsTx(tx)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	before := settings.DefaultThemeID
	settings.DefaultThemeID = selectedTheme.ID
	settings.UpdatedAt = time.Now()

	if err := tx.Save(&settings).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("set default theme: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "SET_DEFAULT_THEME", "theme_settings.default_theme_id", "1", JSONMap{
		"default_theme_id": before,
	}, JSONMap{
		"default_theme_id": settings.DefaultThemeID,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &settings, nil
}

func (s *Service) CreateCampaign(ctx context.Context, actor string, input CampaignInput) (*CampaignDTO, error) {
	if err := validateCampaignInput(input); err != nil {
		return nil, err
	}
	if _, err := s.findThemeByID(ctx, strings.TrimSpace(input.ThemeID)); err != nil {
		return nil, fmt.Errorf("invalid theme_id: %w", err)
	}

	campaign := ThemeCampaign{
		ThemeID:          strings.TrimSpace(input.ThemeID),
		CampaignGroupKey: strings.TrimSpace(input.CampaignGroupKey),
		CampaignName:     strings.TrimSpace(input.CampaignName),
		Description:      strings.TrimSpace(input.Description),
		Enabled:          input.Enabled,
		StartAt:          input.StartAt,
		EndAt:            input.EndAt,
		Priority:         input.Priority,
		LightModeEnabled: input.LightModeEnabled,
		DarkModeEnabled:  input.DarkModeEnabled,
		AssetsJSON:       normalizeCampaignAssets(input.Assets),
		UpdatedBy:        actor,
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	if err := tx.Create(&campaign).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("create campaign: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "CREATE_CAMPAIGN", "theme_campaigns", campaign.ID, JSONMap{}, JSONMap{
		"campaign_name":      campaign.CampaignName,
		"campaign_group_key": campaign.CampaignGroupKey,
		"enabled":            campaign.Enabled,
		"priority":           campaign.Priority,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toCampaignDTO(campaign, time.Now())
	return &dto, nil
}

func (s *Service) UpdateCampaign(ctx context.Context, actor string, campaignID string, input CampaignInput) (*CampaignDTO, error) {
	if campaignID == "" {
		return nil, fmt.Errorf("campaign id is required")
	}
	if err := validateCampaignInput(input); err != nil {
		return nil, err
	}
	if _, err := s.findThemeByID(ctx, strings.TrimSpace(input.ThemeID)); err != nil {
		return nil, fmt.Errorf("invalid theme_id: %w", err)
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var campaign ThemeCampaign
	if err := tx.First(&campaign, "id = ?", campaignID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("campaign not found: %w", err)
	}
	before := JSONMap{
		"campaign_name":      campaign.CampaignName,
		"campaign_group_key": campaign.CampaignGroupKey,
		"enabled":            campaign.Enabled,
		"priority":           campaign.Priority,
	}

	campaign.ThemeID = strings.TrimSpace(input.ThemeID)
	campaign.CampaignGroupKey = strings.TrimSpace(input.CampaignGroupKey)
	campaign.CampaignName = strings.TrimSpace(input.CampaignName)
	campaign.Description = strings.TrimSpace(input.Description)
	campaign.Enabled = input.Enabled
	campaign.StartAt = input.StartAt
	campaign.EndAt = input.EndAt
	campaign.Priority = input.Priority
	campaign.LightModeEnabled = input.LightModeEnabled
	campaign.DarkModeEnabled = input.DarkModeEnabled
	campaign.AssetsJSON = normalizeCampaignAssets(input.Assets)
	campaign.UpdatedBy = actor
	campaign.UpdatedAt = time.Now()

	if err := tx.Save(&campaign).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("update campaign: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "UPDATE_CAMPAIGN", "theme_campaigns", campaign.ID, before, JSONMap{
		"campaign_name":      campaign.CampaignName,
		"campaign_group_key": campaign.CampaignGroupKey,
		"enabled":            campaign.Enabled,
		"priority":           campaign.Priority,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toCampaignDTO(campaign, time.Now())
	return &dto, nil
}

func (s *Service) ToggleCampaignEnabled(ctx context.Context, actor string, campaignID string) (*CampaignDTO, error) {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	var campaign ThemeCampaign
	if err := tx.First(&campaign, "id = ?", campaignID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("campaign not found: %w", err)
	}

	beforeEnabled := campaign.Enabled
	campaign.Enabled = !campaign.Enabled
	campaign.UpdatedBy = actor
	campaign.UpdatedAt = time.Now()

	if err := tx.Save(&campaign).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("toggle campaign: %w", err)
	}

	action := "DISABLE_CAMPAIGN"
	if campaign.Enabled {
		action = "ENABLE_CAMPAIGN"
	}
	if err := s.appendAuditTx(tx, actor, action, "theme_campaigns", campaign.ID, JSONMap{"enabled": beforeEnabled}, JSONMap{"enabled": campaign.Enabled}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toCampaignDTO(campaign, time.Now())
	return &dto, nil
}

func (s *Service) DuplicateCampaign(ctx context.Context, actor string, campaignID string) (*CampaignDTO, error) {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	var source ThemeCampaign
	if err := tx.First(&source, "id = ?", campaignID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("campaign not found: %w", err)
	}

	duplicated := source
	duplicated.ID = ""
	duplicated.CampaignName = strings.TrimSpace(source.CampaignName) + " (Copy)"
	duplicated.CampaignGroupKey = buildDuplicateCampaignGroupKey(source.CampaignGroupKey)
	duplicated.Enabled = false
	duplicated.UpdatedBy = actor
	duplicated.UpdatedAt = time.Now()
	duplicated.CreatedAt = time.Now()

	if err := tx.Create(&duplicated).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("duplicate campaign: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "DUPLICATE_CAMPAIGN", "theme_campaigns", duplicated.ID, JSONMap{"source_id": source.ID}, JSONMap{
		"campaign_group_key": duplicated.CampaignGroupKey,
		"enabled":            duplicated.Enabled,
	}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	dto := toCampaignDTO(duplicated, time.Now())
	return &dto, nil
}

func (s *Service) DeleteCampaign(ctx context.Context, actor string, campaignID string) error {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return tx.Error
	}

	var campaign ThemeCampaign
	if err := tx.First(&campaign, "id = ?", campaignID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("campaign not found: %w", err)
	}

	if err := tx.Delete(&ThemeCampaign{}, "id = ?", campaignID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("delete campaign: %w", err)
	}

	if err := s.appendAuditTx(tx, actor, "DELETE_CAMPAIGN", "theme_campaigns", campaign.ID, JSONMap{
		"campaign_name":      campaign.CampaignName,
		"campaign_group_key": campaign.CampaignGroupKey,
		"enabled":            campaign.Enabled,
		"priority":           campaign.Priority,
	}, JSONMap{"deleted": true}); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}
	return nil
}

func (s *Service) SetGlobalKillSwitch(ctx context.Context, actor string, enabled bool) (*ThemeSettings, error) {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	settings, err := s.getSettingsTx(tx.WithContext(ctx))
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	before := settings.GlobalKillSwitch
	settings.GlobalKillSwitch = enabled
	settings.UpdatedAt = time.Now()

	if err := tx.Save(&settings).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("update kill switch: %w", err)
	}

	action := "DISABLE_GLOBAL_KILL_SWITCH"
	if enabled {
		action = "ENABLE_GLOBAL_KILL_SWITCH"
	}
	if err := s.appendAuditTx(tx, actor, action, "theme_settings.global_kill_switch", "1", JSONMap{"value": before}, JSONMap{"value": enabled}); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	return &settings, nil
}

func (s *Service) ResolveRuntimeTheme(ctx context.Context, runtimeCtx RuntimeThemeContext) (*RuntimeThemePayload, error) {
	settings, err := s.getSettings(ctx)
	if err != nil {
		return nil, err
	}

	theme, err := s.findThemeByID(ctx, settings.DefaultThemeID)
	if err != nil {
		return nil, err
	}

	payload := &RuntimeThemePayload{
		Source:            "BASE_THEME",
		KillSwitchEnabled: settings.GlobalKillSwitch,
		AppliedMode:       normalizeRuntimeMode(runtimeCtx.Mode),
		ModeAllowed:       true,
		Theme: ThemeDTO{
			ID:       theme.ID,
			Code:     theme.Code,
			Name:     theme.Name,
			Type:     theme.Type,
			IsActive: theme.IsActive,
			Tokens:   cloneJSONMap(theme.TokenJSON),
			Assets:   cloneJSONMap(theme.AssetManifestJSON),
		},
		Token:  cloneJSONMap(theme.TokenJSON),
		Assets: cloneJSONMap(theme.AssetManifestJSON),
	}

	if settings.GlobalKillSwitch {
		payload.Source = "KILL_SWITCH_BASE"
		return payload, nil
	}

	platform := normalizeRuntimePlatform(runtimeCtx.Platform)
	mode := normalizeRuntimeMode(runtimeCtx.Mode)
	now := time.Now()

	var candidate ThemeCampaign
	err = s.db.WithContext(ctx).
		Where("enabled = ?", true).
		Where("(start_at IS NULL OR start_at <= ?)", now).
		Where("(end_at IS NULL OR end_at >= ?)", now).
		Order("priority DESC, updated_at DESC").
		Limit(1).
		Find(&candidate).Error
	if err != nil {
		return nil, fmt.Errorf("load runtime campaign candidates: %w", err)
	}
	if candidate.ID == "" {
		return payload, nil
	}

	resolvedTheme, themeErr := s.findThemeByID(ctx, candidate.ThemeID)
	if themeErr != nil {
		return payload, nil
	}

	campaignDTO := toCampaignDTO(candidate, now)
	if !isCampaignModeAllowed(candidate, mode) {
		payload.Source = "MODE_FALLBACK_BASE"
		payload.ModeAllowed = false
		payload.Campaign = &campaignDTO
		return payload, nil
	}

	platformAssets := selectCampaignPlatformAssets(candidate.AssetsJSON, platform)
	assets := mergeThemeAssetsWithCampaign(resolvedTheme.AssetManifestJSON, platformAssets)

	payload.Source = "ACTIVE_CAMPAIGN"
	payload.ModeAllowed = true
	payload.Theme = ThemeDTO{
		ID:       resolvedTheme.ID,
		Code:     resolvedTheme.Code,
		Name:     resolvedTheme.Name,
		Type:     resolvedTheme.Type,
		IsActive: resolvedTheme.IsActive,
		Tokens:   cloneJSONMap(resolvedTheme.TokenJSON),
		Assets:   cloneJSONMap(resolvedTheme.AssetManifestJSON),
	}
	payload.Campaign = &campaignDTO
	payload.Token = cloneJSONMap(resolvedTheme.TokenJSON)
	payload.Assets = assets
	return payload, nil

}

func (s *Service) findThemeByID(ctx context.Context, themeID string) (*Theme, error) {
	var theme Theme
	if err := s.db.WithContext(ctx).First(&theme, "id = ?", themeID).Error; err != nil {
		return nil, fmt.Errorf("theme not found: %w", err)
	}
	return &theme, nil
}

func (s *Service) getSettings(ctx context.Context) (ThemeSettings, error) {
	return s.getSettingsTx(s.db.WithContext(ctx))
}

func (s *Service) getSettingsTx(tx *gorm.DB) (ThemeSettings, error) {
	var settings ThemeSettings
	if err := tx.First(&settings, "id = ?", 1).Error; err != nil {
		return ThemeSettings{}, fmt.Errorf("load theme settings: %w", err)
	}
	return settings, nil
}

func (s *Service) appendAuditTx(tx *gorm.DB, actor string, action string, entityType string, entityID string, before JSONMap, after JSONMap) error {
	log := ThemeAuditLog{
		ActorUserID: strings.TrimSpace(actor),
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		BeforeJSON:  cloneJSONMap(before),
		AfterJSON:   cloneJSONMap(after),
	}
	if log.ActorUserID == "" {
		log.ActorUserID = "unknown"
	}
	if err := tx.Create(&log).Error; err != nil {
		return fmt.Errorf("append theme audit log: %w", err)
	}
	return nil
}

func validateCampaignInput(input CampaignInput) error {
	if strings.TrimSpace(input.CampaignGroupKey) == "" {
		return fmt.Errorf("campaign_group_key is required")
	}
	if strings.TrimSpace(input.CampaignName) == "" {
		return fmt.Errorf("campaign_name is required")
	}
	if strings.TrimSpace(input.ThemeID) == "" {
		return fmt.Errorf("theme_id is required")
	}
	if input.Priority == 0 {
		return fmt.Errorf("priority is required")
	}
	if input.EndAt != nil && input.StartAt != nil && input.EndAt.Before(*input.StartAt) {
		return fmt.Errorf("end date cannot be earlier than start date")
	}
	return nil
}

func validateThemeInput(input ThemeInput) error {
	if strings.TrimSpace(input.Code) == "" {
		return fmt.Errorf("code is required")
	}
	if strings.TrimSpace(input.Name) == "" {
		return fmt.Errorf("name is required")
	}

	themeType := strings.ToLower(strings.TrimSpace(input.Type))
	if themeType != "base" && themeType != "seasonal" {
		return fmt.Errorf("type must be either base or seasonal")
	}

	return nil
}

func resolveCampaignStatus(campaign ThemeCampaign, now time.Time) CampaignStatus {
	if !campaign.Enabled {
		return CampaignStatusDisabled
	}
	if campaign.StartAt == nil || campaign.EndAt == nil {
		return CampaignStatusDraft
	}
	if campaign.EndAt.Before(*campaign.StartAt) {
		return CampaignStatusDraft
	}
	if now.Before(*campaign.StartAt) {
		return CampaignStatusScheduled
	}
	if now.After(*campaign.EndAt) {
		return CampaignStatusExpired
	}
	return CampaignStatusActive
}

func toThemeDTO(theme Theme) ThemeDTO {
	return ThemeDTO{
		ID:       theme.ID,
		Code:     theme.Code,
		Name:     theme.Name,
		Type:     theme.Type,
		IsActive: theme.IsActive,
		Tokens:   cloneJSONMap(theme.TokenJSON),
		Assets:   cloneJSONMap(theme.AssetManifestJSON),
	}
}

func toCampaignDTO(campaign ThemeCampaign, now time.Time) CampaignDTO {
	return CampaignDTO{
		ID:               campaign.ID,
		ThemeID:          campaign.ThemeID,
		CampaignGroupKey: campaign.CampaignGroupKey,
		CampaignName:     campaign.CampaignName,
		Description:      campaign.Description,
		Enabled:          campaign.Enabled,
		StartAt:          campaign.StartAt,
		EndAt:            campaign.EndAt,
		Priority:         campaign.Priority,
		LightModeEnabled: campaign.LightModeEnabled,
		DarkModeEnabled:  campaign.DarkModeEnabled,
		Assets:           normalizeCampaignAssets(campaign.AssetsJSON),
		UpdatedBy:        campaign.UpdatedBy,
		UpdatedAt:        campaign.UpdatedAt,
		Status:           string(resolveCampaignStatus(campaign, now)),
	}
}

func collectActorIDs(campaigns []ThemeCampaign, logs []ThemeAuditLog) []string {
	set := map[string]struct{}{}

	for _, campaign := range campaigns {
		id := strings.TrimSpace(campaign.UpdatedBy)
		if id == "" {
			continue
		}
		set[id] = struct{}{}
	}

	for _, log := range logs {
		id := strings.TrimSpace(log.ActorUserID)
		if id == "" {
			continue
		}
		set[id] = struct{}{}
	}

	result := make([]string, 0, len(set))
	for id := range set {
		result = append(result, id)
	}
	return result
}

func isUUIDLike(value string) bool {
	if len(value) != 36 {
		return false
	}
	return value[8] == '-' && value[13] == '-' && value[18] == '-' && value[23] == '-'
}

func resolveActorDisplayName(actor string, userDisplayByID map[string]string) string {
	trimmed := strings.TrimSpace(actor)
	if trimmed == "" {
		return "-"
	}

	lower := strings.ToLower(trimmed)
	switch lower {
	case "system-seed":
		return "System Seed"
	case "unknown":
		return "Unknown"
	}

	if display, ok := userDisplayByID[trimmed]; ok && strings.TrimSpace(display) != "" {
		return display
	}

	if isUUIDLike(trimmed) {
		return fmt.Sprintf("User %s", trimmed[:8])
	}

	return trimmed
}

func matchCampaignFilters(campaign ThemeCampaign, query DashboardQuery, now time.Time) bool {
	searchValue := strings.ToLower(strings.TrimSpace(query.Search))
	if searchValue != "" {
		target := strings.ToLower(campaign.CampaignName + " " + campaign.Description + " " + campaign.CampaignGroupKey)
		if !strings.Contains(target, searchValue) {
			return false
		}
	}

	statusValue := strings.ToUpper(strings.TrimSpace(query.Status))
	if statusValue != "" && statusValue != "ALL" {
		if string(resolveCampaignStatus(campaign, now)) != statusValue {
			return false
		}
	}

	return true
}

func sortCampaigns(campaigns []ThemeCampaign, sortField string, sortDirection string, now time.Time) {
	normalizedField := strings.ToLower(strings.TrimSpace(sortField))
	if normalizedField == "" {
		normalizedField = "updated_at"
	}
	desc := strings.EqualFold(strings.TrimSpace(sortDirection), "desc")
	if strings.TrimSpace(sortDirection) == "" {
		desc = true
	}

	sort.SliceStable(campaigns, func(i, j int) bool {
		a := campaigns[i]
		b := campaigns[j]
		cmp := 0
		switch normalizedField {
		case "campaign_name":
			cmp = strings.Compare(strings.ToLower(a.CampaignName), strings.ToLower(b.CampaignName))
		case "priority":
			if a.Priority < b.Priority {
				cmp = -1
			} else if a.Priority > b.Priority {
				cmp = 1
			}
		case "start_at":
			ta := timeOrZero(a.StartAt)
			tb := timeOrZero(b.StartAt)
			if ta.Before(tb) {
				cmp = -1
			} else if ta.After(tb) {
				cmp = 1
			}
		case "end_at":
			ta := timeOrZero(a.EndAt)
			tb := timeOrZero(b.EndAt)
			if ta.Before(tb) {
				cmp = -1
			} else if ta.After(tb) {
				cmp = 1
			}
		case "status":
			cmp = strings.Compare(string(resolveCampaignStatus(a, now)), string(resolveCampaignStatus(b, now)))
		default:
			if a.UpdatedAt.Before(b.UpdatedAt) {
				cmp = -1
			} else if a.UpdatedAt.After(b.UpdatedAt) {
				cmp = 1
			}
		}
		if cmp == 0 {
			return a.ID < b.ID
		}
		if desc {
			return cmp > 0
		}
		return cmp < 0
	})
}

func summarizeJSON(value JSONMap) string {
	if len(value) == 0 {
		return "-"
	}
	keys := make([]string, 0, len(value))
	for key := range value {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	firstKey := keys[0]
	return fmt.Sprintf("%s:%v", firstKey, value[firstKey])
}

func sortedKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func collectVisualOptions(themes []Theme, campaigns []ThemeCampaign) ([]string, []string) {
	iconSet := make(map[string]struct{})
	accentSet := make(map[string]struct{})

	for _, option := range defaultIconPackOptions {
		addVisualOption(iconSet, option)
	}
	for _, option := range defaultAccentAssetOptions {
		addVisualOption(accentSet, option)
	}

	for _, currentTheme := range themes {
		addVisualOption(iconSet, toTrimmedString(currentTheme.AssetManifestJSON["iconPack"]))
		addVisualOption(accentSet, toTrimmedString(currentTheme.AssetManifestJSON["accentAsset"]))

		webAssets := normalizePlatformAssets(currentTheme.AssetManifestJSON["web"])
		mobileAssets := normalizePlatformAssets(currentTheme.AssetManifestJSON["mobile"])
		addVisualOption(iconSet, toTrimmedString(webAssets["iconPack"]))
		addVisualOption(accentSet, toTrimmedString(webAssets["accentAsset"]))
		addVisualOption(iconSet, toTrimmedString(mobileAssets["iconPack"]))
		addVisualOption(accentSet, toTrimmedString(mobileAssets["accentAsset"]))
	}

	for _, campaign := range campaigns {
		normalizedAssets := normalizeCampaignAssets(campaign.AssetsJSON)
		webAssets := normalizePlatformAssets(normalizedAssets["web"])
		mobileAssets := normalizePlatformAssets(normalizedAssets["mobile"])
		addVisualOption(iconSet, toTrimmedString(webAssets["iconPack"]))
		addVisualOption(accentSet, toTrimmedString(webAssets["accentAsset"]))
		addVisualOption(iconSet, toTrimmedString(mobileAssets["iconPack"]))
		addVisualOption(accentSet, toTrimmedString(mobileAssets["accentAsset"]))
	}

	return sortedKeys(iconSet), sortedKeys(accentSet)
}

func addVisualOption(target map[string]struct{}, value string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return
	}
	target[trimmed] = struct{}{}
}

func toTrimmedString(value interface{}) string {
	stringValue, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(stringValue)
}

func normalizeRuntimePlatform(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "mobile":
		return "mobile"
	default:
		return "web"
	}
}

func normalizeRuntimeMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "dark":
		return "dark"
	case "light":
		return "light"
	default:
		return ""
	}
}

func isCampaignModeAllowed(campaign ThemeCampaign, mode string) bool {
	switch mode {
	case "dark":
		return campaign.DarkModeEnabled
	case "light":
		return campaign.LightModeEnabled
	default:
		return true
	}
}

func normalizeThemeTokens(input JSONMap) JSONMap {
	if input == nil {
		input = JSONMap{}
	}

	result := JSONMap{
		"accentColor":     strings.TrimSpace(toTrimmedString(input["accentColor"])),
		"accentSoftColor": strings.TrimSpace(toTrimmedString(input["accentSoftColor"])),
		"loginCardBorder": strings.TrimSpace(toTrimmedString(input["loginCardBorder"])),
	}

	for key, value := range input {
		if _, exists := result[key]; exists {
			continue
		}
		stringValue, ok := value.(string)
		if ok {
			result[key] = strings.TrimSpace(stringValue)
			continue
		}
		result[key] = value
	}

	return result
}

func normalizeThemeAssetManifest(input JSONMap) JSONMap {
	if input == nil {
		input = JSONMap{}
	}

	result := emptyPlatformAssets()
	for _, key := range campaignAssetKeys {
		if value := toTrimmedString(input[key]); value != "" {
			result[key] = value
		}
	}
	if result["iconPack"] == "" {
		result["iconPack"] = defaultIconPackOptions[0]
	}
	if result["accentAsset"] == "" {
		result["accentAsset"] = defaultAccentAssetOptions[0]
	}

	for key, value := range input {
		if _, exists := result[key]; exists {
			continue
		}
		result[key] = value
	}

	return result
}

func selectCampaignPlatformAssets(campaignAssets JSONMap, platform string) JSONMap {
	normalized := normalizeCampaignAssets(campaignAssets)
	raw, ok := normalized[platform]
	if !ok {
		return emptyPlatformAssets()
	}
	return normalizePlatformAssets(raw)
}

func mergeThemeAssetsWithCampaign(baseAssets JSONMap, platformAssets JSONMap) JSONMap {
	merged := cloneJSONMap(baseAssets)
	for _, key := range campaignAssetKeys {
		value, ok := platformAssets[key]
		if !ok {
			continue
		}
		stringValue, ok := value.(string)
		if !ok {
			continue
		}
		trimmed := strings.TrimSpace(stringValue)
		if trimmed == "" {
			continue
		}
		merged[key] = trimmed
	}
	return merged
}

func normalizeCampaignAssets(input JSONMap) JSONMap {
	if input == nil {
		input = JSONMap{}
	}

	webRaw, hasWeb := input["web"]
	mobileRaw, hasMobile := input["mobile"]
	if hasWeb || hasMobile {
		return JSONMap{
			"web":    normalizePlatformAssets(webRaw),
			"mobile": normalizePlatformAssets(mobileRaw),
		}
	}

	legacy := normalizePlatformAssets(input)
	return JSONMap{
		"web":    cloneJSONMap(legacy),
		"mobile": cloneJSONMap(legacy),
	}
}

func normalizePlatformAssets(raw interface{}) JSONMap {
	result := emptyPlatformAssets()
	if raw == nil {
		return result
	}

	var source map[string]interface{}
	switch value := raw.(type) {
	case JSONMap:
		source = map[string]interface{}(value)
	case map[string]interface{}:
		source = value
	default:
		return result
	}

	for _, key := range campaignAssetKeys {
		candidate, ok := source[key]
		if !ok {
			continue
		}
		stringValue, ok := candidate.(string)
		if !ok {
			continue
		}
		result[key] = strings.TrimSpace(stringValue)
	}
	return result
}

func emptyPlatformAssets() JSONMap {
	return JSONMap{
		"backgroundImage": "",
		"illustration":    "",
		"iconPack":        "",
		"accentAsset":     "",
	}
}

func buildDuplicateCampaignGroupKey(base string) string {
	normalized := strings.TrimSpace(base)
	if normalized == "" {
		normalized = "campaign"
	}
	return fmt.Sprintf("%s-copy-%d", normalized, time.Now().Unix())
}

func timeOrZero(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

func cloneJSONMap(input JSONMap) JSONMap {
	if len(input) == 0 {
		return JSONMap{}
	}
	result := make(JSONMap, len(input))
	for key, value := range input {
		result[key] = value
	}
	return result
}
