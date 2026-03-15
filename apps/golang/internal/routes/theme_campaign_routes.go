package routes

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	appmiddleware "agrinovagraphql/server/internal/middleware"
	"agrinovagraphql/server/internal/theme"
	log "agrinovagraphql/server/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	themeAssetMaxUploadSize            = 2 * 1024 * 1024 // 2 MB
	themeAssetMaxProcessingSize        = 12 * 1024 * 1024
	themeAssetsDirName                 = "theme-assets"
	themeAssetRetentionMaxFilesPerPath = 60
	themeAssetRetentionMaxAge          = 180 * 24 * time.Hour
)

var supportedThemeAssetMimeTypes = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/svg+xml": ".svg",
}

var allowedThemeAssetKeys = map[string]struct{}{
	"backgroundImage": {},
	"illustration":    {},
}

type themeAssetDimension struct {
	width  int
	height int
}

var recommendedThemeAssetDimensions = map[string]map[string]themeAssetDimension{
	"web": {
		"backgroundImage": {width: 1920, height: 1080},
		"illustration":    {width: 1500, height: 600},
	},
	"mobile": {
		"backgroundImage": {width: 1080, height: 2400},
		"illustration":    {width: 1200, height: 480},
	},
}

var utf8BOM = []byte{0xEF, 0xBB, 0xBF}
var svgRootPattern = regexp.MustCompile(`(?is)^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype[^>]*>\s*)?(?:<!--.*?-->\s*)*<svg\b`)
var svgUnsafePattern = regexp.MustCompile(`(?is)<\s*script|\son[a-z]+\s*=|javascript:|<\s*foreignobject`)
var svgCommentPattern = regexp.MustCompile(`(?s)<!--.*?-->`)
var svgInterTagWhitespacePattern = regexp.MustCompile(`>\s+<`)
var svgRepeatedWhitespacePattern = regexp.MustCompile(`\s{2,}`)

type themeCampaignHandler struct {
	service    *theme.Service
	uploadsDir string
}

func SetupThemeCampaignRoutes(r *gin.RouterGroup, db *gorm.DB, uploadsDir string) {
	handler := &themeCampaignHandler{
		service:    theme.NewService(db),
		uploadsDir: normalizeUploadsRoot(uploadsDir),
	}

	r.POST("/assets/upload", handler.uploadAsset)
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
		service:    theme.NewService(db),
		uploadsDir: "",
	}

	r.GET("/theme-runtime", handler.resolveRuntimeTheme)
}

func (h *themeCampaignHandler) uploadAsset(c *gin.Context) {
	if _, ok := requireSuperAdmin(c); !ok {
		return
	}

	platform := normalizeThemeAssetPlatform(c.PostForm("platform"))
	if platform == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "platform must be web or mobile"})
		return
	}

	assetKey := strings.TrimSpace(c.PostForm("assetKey"))
	if _, ok := allowedThemeAssetKeys[assetKey]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"message": "assetKey must be backgroundImage or illustration"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "file is required"})
		return
	}
	if fileHeader.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "file is empty"})
		return
	}
	if fileHeader.Size > themeAssetMaxProcessingSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": "file exceeds 12 MB processing limit"})
		return
	}

	contentType, content, err := readUploadedAssetContent(fileHeader, themeAssetMaxProcessingSize)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ext, isSupported := supportedThemeAssetMimeTypes[contentType]
	if !isSupported {
		c.JSON(http.StatusBadRequest, gin.H{"message": "unsupported file type. allowed: jpg, png, webp, gif, svg"})
		return
	}

	if platform == "mobile" && assetKey == "backgroundImage" && contentType != "image/svg+xml" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "mobile backgroundImage must be SVG"})
		return
	}

	if len(content) > themeAssetMaxUploadSize {
		contentType, content, err = transformThemeAssetForUpload(contentType, content, platform, assetKey)
		if err != nil {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": err.Error()})
			return
		}
	}

	uploadWarning := ""
	if len(content) > themeAssetMaxUploadSize {
		if contentType == "image/svg+xml" {
			uploadWarning = "svg exceeds 2 MB after optimization and was stored with best-effort optimization"
		} else {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": "file exceeds 2 MB after optimization"})
			return
		}
	}

	if contentType == "image/svg+xml" {
		if err := validateSafeSVG(content); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}
	}

	absoluteDir := filepath.Join(h.uploadsDir, themeAssetsDirName, platform, assetKey)
	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("failed to create upload directory: %v", err)})
		return
	}

	storedFileName := uuid.NewString() + ext
	absolutePath := filepath.Join(absoluteDir, storedFileName)
	if err := os.WriteFile(absolutePath, content, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("failed to save file: %v", err)})
		return
	}
	_ = pruneThemeAssetDirectory(absoluteDir, storedFileName)

	filePath := uploadURLPath(themeAssetsDirName, platform, assetKey, storedFileName)
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"path":         filePath,
		"contentType":  contentType,
		"size":         len(content),
		"originalName": fileHeader.Filename,
		"warning":      uploadWarning,
	})
}

func readUploadedAssetContent(fileHeader *multipart.FileHeader, maxSize int64) (string, []byte, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", nil, fmt.Errorf("failed to open file")
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		return "", nil, fmt.Errorf("failed to read file")
	}
	if int64(len(content)) > maxSize {
		return "", nil, fmt.Errorf("file exceeds 12 MB processing limit")
	}
	if len(content) == 0 {
		return "", nil, fmt.Errorf("file is empty")
	}

	contentType := detectThemeAssetContentType(content, fileHeader.Filename)
	return contentType, content, nil
}

func detectThemeAssetContentType(content []byte, fileName string) string {
	sniffLength := len(content)
	if sniffLength > 512 {
		sniffLength = 512
	}

	detectedType := normalizeMimeType(http.DetectContentType(content[:sniffLength]))
	if detectedType == "image/svg+xml" {
		return detectedType
	}

	if !hasSVGRootElement(content) {
		return detectedType
	}

	fileExt := strings.ToLower(strings.TrimSpace(filepath.Ext(fileName)))
	if fileExt == ".svg" {
		return "image/svg+xml"
	}

	switch detectedType {
	case "", "application/octet-stream", "application/xml", "text/plain", "text/xml":
		return "image/svg+xml"
	}

	if strings.Contains(detectedType, "xml") {
		return "image/svg+xml"
	}

	return detectedType
}

func hasSVGRootElement(content []byte) bool {
	trimmed := normalizedSVGText(content)
	if trimmed == "" {
		return false
	}
	return svgRootPattern.MatchString(trimmed)
}

func validateSafeSVG(content []byte) error {
	trimmed := normalizedSVGText(content)
	if trimmed == "" {
		return fmt.Errorf("svg file is empty")
	}
	lower := strings.ToLower(trimmed)
	if !hasSVGRootElement(content) {
		return fmt.Errorf("invalid svg document")
	}
	if svgUnsafePattern.MatchString(lower) {
		return fmt.Errorf("svg contains disallowed script or event attributes")
	}
	return nil
}

func normalizedSVGText(content []byte) string {
	trimmed := bytes.TrimSpace(content)
	trimmed = bytes.TrimPrefix(trimmed, utf8BOM)
	trimmed = bytes.TrimSpace(trimmed)
	return string(trimmed)
}

func transformThemeAssetForUpload(contentType string, content []byte, platform string, assetKey string) (string, []byte, error) {
	if len(content) <= themeAssetMaxUploadSize {
		return contentType, content, nil
	}

	if contentType == "image/svg+xml" {
		if err := validateSafeSVG(content); err != nil {
			return "", nil, err
		}
		optimized, err := optimizeThemeAssetSVG(content)
		if err != nil {
			return "", nil, err
		}
		return "image/svg+xml", optimized, nil
	}

	optimizedType, optimizedContent, err := optimizeThemeAssetRaster(contentType, content, platform, assetKey)
	if err != nil {
		return "", nil, err
	}
	if len(optimizedContent) > themeAssetMaxUploadSize {
		return "", nil, fmt.Errorf("image cannot be optimized below 2 MB")
	}
	return optimizedType, optimizedContent, nil
}

func optimizeThemeAssetSVG(content []byte) ([]byte, error) {
	normalized := normalizedSVGText(content)
	if normalized == "" {
		return nil, fmt.Errorf("svg file is empty")
	}

	withoutComments := svgCommentPattern.ReplaceAllString(normalized, "")
	collapsedInterTag := svgInterTagWhitespacePattern.ReplaceAllString(withoutComments, "><")
	collapsedWhitespace := svgRepeatedWhitespacePattern.ReplaceAllString(collapsedInterTag, " ")
	optimized := strings.TrimSpace(collapsedWhitespace)
	if optimized == "" {
		return nil, fmt.Errorf("invalid svg document")
	}

	return []byte(optimized), nil
}

func optimizeThemeAssetRaster(contentType string, content []byte, platform string, assetKey string) (string, []byte, error) {
	srcImage, err := decodeThemeAssetRaster(contentType, content)
	if err != nil {
		return "", nil, err
	}

	targetDimension := recommendedThemeAssetDimensions["web"]["backgroundImage"]
	if byAsset, ok := recommendedThemeAssetDimensions[platform]; ok {
		if byKey, ok := byAsset[assetKey]; ok {
			targetDimension = byKey
		}
	}

	srcBounds := srcImage.Bounds()
	srcWidth := srcBounds.Dx()
	srcHeight := srcBounds.Dy()
	if srcWidth <= 0 || srcHeight <= 0 {
		return "", nil, fmt.Errorf("invalid raster image dimensions")
	}

	baseWidth, baseHeight := fitWithinBounds(srcWidth, srcHeight, targetDimension.width, targetDimension.height)
	if baseWidth <= 0 || baseHeight <= 0 {
		return "", nil, fmt.Errorf("invalid resize target")
	}

	scaleFactors := []float64{1.0, 0.9, 0.8, 0.7, 0.6, 0.5}
	for _, scale := range scaleFactors {
		width := int(float64(baseWidth) * scale)
		height := int(float64(baseHeight) * scale)
		if width < 1 {
			width = 1
		}
		if height < 1 {
			height = 1
		}

		resized := resizeNearest(srcImage, width, height)
		encodeMimes := rasterEncodeMimeCandidates(contentType, imageHasAlpha(resized))
		for _, candidateMime := range encodeMimes {
			qualities := []int{85, 75, 65, 55}
			if candidateMime == "image/png" || candidateMime == "image/gif" {
				qualities = []int{0}
			}

			for _, quality := range qualities {
				encoded, encodedMime, err := encodeThemeAssetRaster(resized, candidateMime, quality)
				if err != nil {
					continue
				}
				if len(encoded) <= themeAssetMaxUploadSize {
					return encodedMime, encoded, nil
				}
			}
		}
	}

	return "", nil, fmt.Errorf("image cannot be optimized below 2 MB")
}

func decodeThemeAssetRaster(contentType string, content []byte) (image.Image, error) {
	reader := bytes.NewReader(content)
	switch contentType {
	case "image/jpeg":
		decoded, err := jpeg.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode jpeg")
		}
		return decoded, nil
	case "image/png":
		decoded, err := png.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode png")
		}
		return decoded, nil
	case "image/gif":
		decoded, err := gif.Decode(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decode gif")
		}
		return decoded, nil
	default:
		return nil, fmt.Errorf("server optimization for %s is not supported", contentType)
	}
}

func fitWithinBounds(sourceWidth int, sourceHeight int, maxWidth int, maxHeight int) (int, int) {
	if sourceWidth <= 0 || sourceHeight <= 0 || maxWidth <= 0 || maxHeight <= 0 {
		return 0, 0
	}

	width := sourceWidth
	height := sourceHeight
	if width > maxWidth {
		height = height * maxWidth / width
		width = maxWidth
	}
	if height > maxHeight {
		width = width * maxHeight / height
		height = maxHeight
	}

	if width < 1 {
		width = 1
	}
	if height < 1 {
		height = 1
	}
	return width, height
}

func resizeNearest(source image.Image, targetWidth int, targetHeight int) image.Image {
	sourceBounds := source.Bounds()
	sourceWidth := sourceBounds.Dx()
	sourceHeight := sourceBounds.Dy()
	if sourceWidth == targetWidth && sourceHeight == targetHeight {
		return source
	}

	dst := image.NewNRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	for y := 0; y < targetHeight; y++ {
		sourceY := sourceBounds.Min.Y + (y*sourceHeight)/targetHeight
		for x := 0; x < targetWidth; x++ {
			sourceX := sourceBounds.Min.X + (x*sourceWidth)/targetWidth
			dst.Set(x, y, source.At(sourceX, sourceY))
		}
	}
	return dst
}

func imageHasAlpha(img image.Image) bool {
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := img.At(x, y).RGBA()
			if a != 0xFFFF {
				return true
			}
		}
	}
	return false
}

func rasterEncodeMimeCandidates(contentType string, hasAlpha bool) []string {
	switch contentType {
	case "image/jpeg":
		return []string{"image/jpeg"}
	case "image/png":
		if hasAlpha {
			return []string{"image/png", "image/gif"}
		}
		return []string{"image/png", "image/jpeg"}
	case "image/gif":
		return []string{"image/gif", "image/png", "image/jpeg"}
	default:
		if hasAlpha {
			return []string{"image/png", "image/gif"}
		}
		return []string{"image/jpeg", "image/png"}
	}
}

func encodeThemeAssetRaster(img image.Image, contentType string, quality int) ([]byte, string, error) {
	var buffer bytes.Buffer
	switch contentType {
	case "image/jpeg":
		if quality <= 0 {
			quality = 80
		}
		if err := jpeg.Encode(&buffer, img, &jpeg.Options{Quality: quality}); err != nil {
			return nil, "", err
		}
		return buffer.Bytes(), "image/jpeg", nil
	case "image/png":
		encoder := png.Encoder{CompressionLevel: png.BestCompression}
		if err := encoder.Encode(&buffer, img); err != nil {
			return nil, "", err
		}
		return buffer.Bytes(), "image/png", nil
	case "image/gif":
		if err := gif.Encode(&buffer, img, &gif.Options{NumColors: 256}); err != nil {
			return nil, "", err
		}
		return buffer.Bytes(), "image/gif", nil
	default:
		return nil, "", fmt.Errorf("unsupported encode content type")
	}
}

func normalizeThemeAssetPlatform(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "web":
		return "web"
	case "mobile":
		return "mobile"
	default:
		return ""
	}
}

func normalizeUploadsRoot(dir string) string {
	trimmed := strings.TrimSpace(dir)
	if trimmed == "" {
		return filepath.Clean("./uploads")
	}

	cleaned := filepath.Clean(trimmed)
	if cleaned == "." {
		return filepath.Clean("./uploads")
	}
	return cleaned
}

func uploadURLPath(parts ...string) string {
	cleaned := make([]string, 0, len(parts)+1)
	cleaned = append(cleaned, "uploads")
	for _, part := range parts {
		normalized := strings.Trim(strings.ReplaceAll(part, "\\", "/"), "/")
		if normalized == "" {
			continue
		}
		cleaned = append(cleaned, normalized)
	}
	return "/" + path.Join(cleaned...)
}

func normalizeMimeType(contentType string) string {
	normalized := strings.ToLower(strings.TrimSpace(contentType))
	if idx := strings.Index(normalized, ";"); idx >= 0 {
		normalized = strings.TrimSpace(normalized[:idx])
	}
	return normalized
}

type retainedFile struct {
	name    string
	path    string
	modTime time.Time
}

func pruneThemeAssetDirectory(directory string, keepFileName string) error {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return err
	}

	now := time.Now()
	candidates := make([]retainedFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := strings.TrimSpace(entry.Name())
		if name == "" || name == keepFileName {
			continue
		}
		info, err := entry.Info()
		if err != nil || !info.Mode().IsRegular() {
			continue
		}

		absolutePath := filepath.Join(directory, name)
		if now.Sub(info.ModTime()) > themeAssetRetentionMaxAge {
			_ = os.Remove(absolutePath)
			continue
		}

		candidates = append(candidates, retainedFile{
			name:    name,
			path:    absolutePath,
			modTime: info.ModTime(),
		})
	}

	if len(candidates) <= themeAssetRetentionMaxFilesPerPath {
		return nil
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].modTime.Before(candidates[j].modTime)
	})

	excess := len(candidates) - themeAssetRetentionMaxFilesPerPath
	for i := 0; i < excess; i++ {
		_ = os.Remove(candidates[i].path)
	}

	return nil
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
	platform := strings.TrimSpace(c.Query("platform"))
	mode := strings.TrimSpace(c.Query("mode"))

	result, err := h.service.ResolveRuntimeTheme(c.Request.Context(), theme.RuntimeThemeContext{
		Platform: platform,
		Mode:     mode,
	})
	if err != nil {
		log.Warn(
			"Theme runtime resolve failed platform=%s mode=%s error=%v",
			platform,
			mode,
			err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	campaignID := ""
	campaignName := ""
	if result.Campaign != nil {
		campaignID = result.Campaign.ID
		campaignName = result.Campaign.CampaignName
	}

	if result.Source != "ACTIVE_CAMPAIGN" {
		log.Info(
			"Theme runtime fallback source=%s platform=%s mode=%s applied_mode=%s mode_allowed=%t kill_switch=%t theme_id=%s campaign_id=%s campaign_name=%s",
			result.Source,
			platform,
			mode,
			result.AppliedMode,
			result.ModeAllowed,
			result.KillSwitchEnabled,
			result.Theme.ID,
			campaignID,
			campaignName,
		)
	} else {
		log.Debug(
			"Theme runtime active campaign platform=%s mode=%s applied_mode=%s theme_id=%s campaign_id=%s campaign_name=%s",
			platform,
			mode,
			result.AppliedMode,
			result.Theme.ID,
			campaignID,
			campaignName,
		)
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
