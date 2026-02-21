package resolvers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"agrinovagraphql/server/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const vehicleTaxDocumentMaxUploadSize = 10 * 1024 * 1024 // 10 MB

func (r *Resolver) HandleVehicleTaxDocumentUpload(c *gin.Context) {
	ctx := c.Request.Context()
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "authentication required",
		})
		return
	}

	vehicleTaxID := strings.TrimSpace(c.PostForm("vehicleTaxId"))
	if vehicleTaxID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "vehicleTaxId is required",
		})
		return
	}

	documentType := normalizeVehicleTaxDocumentType(c.PostForm("documentType"))
	if !isValidVehicleTaxDocumentType(documentType) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "documentType must be one of BUKTI_BAYAR, STNK, NOTICE, OTHER",
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

	if fileHeader.Size > vehicleTaxDocumentMaxUploadSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"success": false,
			"message": "file exceeds 10 MB",
		})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !isAllowedVehicleTaxDocumentExtension(ext) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "unsupported file type. allowed: pdf, jpg, jpeg, png, webp",
		})
		return
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, vehicleTaxID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	absoluteDir := r.uploadAbsolutePath("vehicle_tax_documents", vehicle.CompanyID, vehicleTaxID)
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

	filePath := uploadURLPath("vehicle_tax_documents", vehicle.CompanyID, vehicleTaxID, storedFileName)
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "upload successful",
		"filePath":     filePath,
		"originalName": fileHeader.Filename,
		"size":         fileHeader.Size,
		"documentType": documentType,
	})
}

func isAllowedVehicleTaxDocumentExtension(ext string) bool {
	switch strings.ToLower(strings.TrimSpace(ext)) {
	case ".pdf", ".jpg", ".jpeg", ".png", ".webp":
		return true
	default:
		return false
	}
}
