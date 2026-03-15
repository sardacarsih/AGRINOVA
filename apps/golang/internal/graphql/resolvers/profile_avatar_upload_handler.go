package resolvers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"agrinovagraphql/server/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const profileAvatarMaxUploadSize = 5 * 1024 * 1024 // 5 MB

var supportedProfileAvatarMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

func (r *Resolver) HandleProfileAvatarUpload(c *gin.Context) {
	ctx := c.Request.Context()
	userID := sanitizeUploadPathSegment(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "authentication required",
		})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "file is required",
		})
		return
	}

	if fileHeader.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "file is empty",
		})
		return
	}

	if fileHeader.Size > profileAvatarMaxUploadSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"success": false,
			"message": "file exceeds 5 MB",
		})
		return
	}

	contentType, err := detectUploadedFileContentType(fileHeader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to read upload: %v", err),
		})
		return
	}

	ext, isSupported := supportedProfileAvatarMimeTypes[contentType]
	if !isSupported {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "unsupported file type. allowed: jpg, jpeg, png, webp, gif",
		})
		return
	}

	absoluteDir := r.uploadAbsolutePath("avatars", userID)
	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to create upload directory: %v", err),
		})
		return
	}

	storedFileName := uuid.NewString() + ext
	absolutePath := filepath.Join(absoluteDir, storedFileName)
	if err := c.SaveUploadedFile(fileHeader, absolutePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to save file: %v", err),
		})
		return
	}

	filePath := uploadURLPath("avatars", userID, storedFileName)
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "avatar uploaded successfully",
		"filePath":     filePath,
		"originalName": fileHeader.Filename,
		"size":         fileHeader.Size,
	})
}

func detectUploadedFileContentType(fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	buffer := make([]byte, 512)
	bytesRead, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	return normalizeMimeType(http.DetectContentType(buffer[:bytesRead])), nil
}

func normalizeMimeType(contentType string) string {
	normalized := strings.ToLower(strings.TrimSpace(contentType))
	if idx := strings.Index(normalized, ";"); idx >= 0 {
		normalized = strings.TrimSpace(normalized[:idx])
	}
	return normalized
}

func sanitizeUploadPathSegment(value string) string {
	normalized := strings.TrimSpace(strings.ReplaceAll(value, "\\", "/"))
	normalized = strings.Trim(normalized, "/")
	normalized = strings.ReplaceAll(normalized, "..", "")
	normalized = strings.ReplaceAll(normalized, "/", "_")
	return normalized
}
