package routes

import (
	"net/http"
	"strconv"
	"strings"

	appmiddleware "agrinovagraphql/server/internal/middleware"
	"agrinovagraphql/server/internal/theme"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type themeCampaignHandler struct {
	service *theme.Service
}

func SetupThemeCampaignRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := &themeCampaignHandler{
		service: theme.NewService(db),
	}

	r.GET("/dashboard", handler.getDashboard)
	r.GET("/themes", handler.getThemes)
	r.POST("/themes", handler.createTheme)
	r.PUT("/themes/:id", handler.updateTheme)
	r.POST("/themes/:id/toggle-active", handler.toggleThemeActive)
	r.POST("/campaigns", handler.createCampaign)
	r.PUT("/campaigns/:id", handler.updateCampaign)
	r.DELETE("/campaigns/:id", handler.deleteCampaign)
	r.POST("/campaigns/:id/toggle-enabled", handler.toggleCampaignEnabled)
	r.POST("/campaigns/:id/duplicate", handler.duplicateCampaign)
	r.POST("/settings/default-theme", handler.setDefaultTheme)
	r.POST("/settings/kill-switch", handler.setKillSwitch)
}

func SetupPublicThemeCampaignRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := &themeCampaignHandler{
		service: theme.NewService(db),
	}

	r.GET("/theme-runtime", handler.resolveRuntimeTheme)
}

func (h *themeCampaignHandler) getDashboard(c *gin.Context) {
	if _, ok := requireSuperAdmin(c); !ok {
		return
	}

	page := parseInt(c.Query("page"), 1)
	pageSize := parseInt(c.Query("pageSize"), 5)

	payload, err := h.service.GetDashboard(c.Request.Context(), theme.DashboardQuery{
		Search:        c.Query("search"),
		Status:        c.Query("status"),
		SortField:     c.Query("sortField"),
		SortDirection: c.Query("sortDirection"),
		Page:          page,
		PageSize:      pageSize,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, payload)
}

func (h *themeCampaignHandler) getThemes(c *gin.Context) {
	if _, ok := requireSuperAdmin(c); !ok {
		return
	}

	result, err := h.service.GetThemes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"themes": result})
}

func (h *themeCampaignHandler) createTheme(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var input theme.ThemeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	result, err := h.service.CreateTheme(c.Request.Context(), actor, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) updateTheme(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var input theme.ThemeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	result, err := h.service.UpdateTheme(c.Request.Context(), actor, strings.TrimSpace(c.Param("id")), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) toggleThemeActive(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	result, err := h.service.ToggleThemeActive(c.Request.Context(), actor, strings.TrimSpace(c.Param("id")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) createCampaign(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var input theme.CampaignInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	result, err := h.service.CreateCampaign(c.Request.Context(), actor, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) updateCampaign(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var input theme.CampaignInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	result, err := h.service.UpdateCampaign(c.Request.Context(), actor, strings.TrimSpace(c.Param("id")), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) deleteCampaign(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	if err := h.service.DeleteCampaign(c.Request.Context(), actor, strings.TrimSpace(c.Param("id"))); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

func (h *themeCampaignHandler) toggleCampaignEnabled(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	result, err := h.service.ToggleCampaignEnabled(c.Request.Context(), actor, strings.TrimSpace(c.Param("id")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) duplicateCampaign(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	result, err := h.service.DuplicateCampaign(c.Request.Context(), actor, strings.TrimSpace(c.Param("id")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *themeCampaignHandler) setKillSwitch(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var payload struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	settings, err := h.service.SetGlobalKillSwitch(c.Request.Context(), actor, payload.Enabled)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *themeCampaignHandler) setDefaultTheme(c *gin.Context) {
	actor, ok := requireSuperAdmin(c)
	if !ok {
		return
	}

	var payload struct {
		ThemeID string `json:"theme_id"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
		return
	}

	settings, err := h.service.SetDefaultTheme(c.Request.Context(), actor, payload.ThemeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *themeCampaignHandler) resolveRuntimeTheme(c *gin.Context) {
	result, err := h.service.ResolveRuntimeTheme(c.Request.Context(), theme.RuntimeThemeContext{
		Platform: c.Query("platform"),
		Mode:     c.Query("mode"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func requireSuperAdmin(c *gin.Context) (string, bool) {
	userID := strings.TrimSpace(appmiddleware.GetCurrentUserID(c.Request.Context()))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "authentication required"})
		return "", false
	}

	role := strings.ToUpper(strings.TrimSpace(string(appmiddleware.GetUserRoleFromContext(c.Request.Context()))))
	if role != "SUPER_ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"message": "SUPER_ADMIN role required"})
		return "", false
	}

	return userID, true
}

func parseInt(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
