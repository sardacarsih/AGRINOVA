package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"agrinovagraphql/server/internal/gatecheck/models"
	"agrinovagraphql/server/internal/graphql/domain/common"
	satpam "agrinovagraphql/server/internal/graphql/domain/satpam"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GateCheckService handles all gate check operations
type GateCheckService struct {
	db         *gorm.DB
	jwtSecret  string
	uploadsDir string
}

// NewGateCheckService creates a new gate check service
func NewGateCheckService(db *gorm.DB, jwtSecret string, uploadsDir string) *GateCheckService {
	return &GateCheckService{
		db:         db,
		jwtSecret:  jwtSecret,
		uploadsDir: normalizeUploadsDir(uploadsDir),
	}
}

func normalizeUploadsDir(uploadDir string) string {
	trimmed := strings.TrimSpace(uploadDir)
	if trimmed == "" {
		return "./uploads"
	}

	cleaned := filepath.Clean(trimmed)
	if cleaned == "." {
		return "./uploads"
	}

	return cleaned
}

func (s *GateCheckService) satpamPhotoUploadDir() string {
	return filepath.Join(s.uploadsDir, "satpam_photos")
}

func satpamPhotoURLPath(filename string) string {
	return "/" + path.Join("uploads", "satpam_photos", filename)
}

// getWIBLocation returns the Asia/Jakarta timezone (WIB, UTC+7) for same-day date comparison
func getWIBLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}
	return loc
}

// GuestLog database model for GORM
type GuestLog struct {
	ID               string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	LocalID          *string `gorm:"column:local_id;type:varchar(255)"`
	IDCardNumber     *string
	DriverName       string             `gorm:"not null"`
	VehiclePlate     string             `gorm:"not null;index"`
	VehicleType      satpam.VehicleType `gorm:"type:varchar(20);not null"`
	Destination      *string
	GatePosition     string     `gorm:"not null"`
	EntryTime        *time.Time `gorm:"index"`
	ExitTime         *time.Time
	EntryGate        *string
	ExitGate         *string
	GenerationIntent string `gorm:"type:varchar(10)"`
	Notes            *string
	QRCodeData       *string
	Photos           []models.GateCheckPhoto `gorm:"foreignKey:RelatedRecordID;constraint:OnDelete:CASCADE"`

	LoadType            *string `gorm:"type:varchar(100)"`
	CargoVolume         *string
	CargoOwner          *string
	EstimatedWeight     *float64
	DeliveryOrderNumber *string
	SecondCargo         *string `gorm:"type:varchar(255)"` // Muatan 2nd from Satpam validation
	AuthorizedUserID    string  `gorm:"type:uuid;not null"`
	CompanyID           string  `gorm:"type:uuid;not null"`
	CreatedBy           string  `gorm:"type:uuid;not null"`
	CreatedUserID       string  `gorm:"type:uuid;not null"`
	DeviceID            string  `gorm:"type:varchar(255)"`
	Latitude            *float64
	Longitude           *float64
	RegistrationSource  *satpam.RegistrationSource `gorm:"type:varchar(20)"`
	SyncStatus          common.SyncStatus          `gorm:"type:varchar(20);default:'PENDING'"`
	CreatedAt           time.Time                  `gorm:"autoCreateTime"`
	UpdatedAt           time.Time                  `gorm:"autoUpdateTime"`
	DeletedAt           gorm.DeletedAt             `gorm:"index"`
}

// TableName returns the table name for GuestLog
func (GuestLog) TableName() string {
	return "gate_guest_logs"
}

// EmployeeLog represents employee access log
type EmployeeLog struct {
	ID           string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	LocalID      string `gorm:"index"`
	CompanyID    string `gorm:"index"`
	NIK          string `gorm:"size:50"`
	Nama         string
	Department   string
	Action       string `gorm:"size:20"`
	GatePosition string `gorm:"size:50"`
	ScannedAt    *time.Time
	ScannedByID  string
	DeviceID     string
	Notes        string
	QRCodeData   string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

// TableName returns the table name for EmployeeLog
func (EmployeeLog) TableName() string {
	return "gate_employee_logs"
}

// QRTokenDB database model for QR tokens
type QRTokenDB struct {
	ID               string               `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	JTI              string               `gorm:"not null;unique;index"`
	Token            string               `gorm:"type:text;not null"`
	GenerationIntent satpam.GateIntent    `gorm:"type:varchar(10);not null"`
	AllowedScan      satpam.GateIntent    `gorm:"type:varchar(10);not null"`
	Status           satpam.QRTokenStatus `gorm:"type:varchar(20);default:'ACTIVE'"`
	ExpiresAt        time.Time            `gorm:"not null;index"`
	GeneratedAt      time.Time            `gorm:"not null"`
	GuestLogID       *string              `gorm:"type:uuid"`
	CompanyID        string               `gorm:"type:uuid;not null"`
	GeneratedBy      string               `gorm:"type:uuid;not null"`
	DeviceID         string               `gorm:"type:varchar(255)"`
	UsageCount       int                  `gorm:"default:0"`
	MaxUsage         int                  `gorm:"default:1"`
	CreatedAt        time.Time            `gorm:"autoCreateTime"`
	UpdatedAt        time.Time            `gorm:"autoUpdateTime"`
}

// TableName returns the table name for QRTokenDB
func (QRTokenDB) TableName() string {
	return "satpam_qr_tokens"
}

// UserContext holds user information from context
type UserContext struct {
	ID        string
	CompanyID string
	Role      string
}

func ensureAuthenticated(ctx context.Context) error {
	if middleware.GetUserFromContext(ctx) == "" {
		return errors.New("user tidak terautentikasi")
	}
	return nil
}

func resolveCompanyScope(ctx context.Context, companyIDs []string) ([]string, error) {
	if len(companyIDs) > 0 {
		return companyIDs, nil
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return nil, errors.New("company tidak ditemukan")
	}

	return []string{companyID}, nil
}

// getUserContext extracts user information from context
func getUserContext(ctx context.Context) (*UserContext, error) {
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user tidak terautentikasi")
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return nil, errors.New("company tidak ditemukan")
	}

	return &UserContext{
		ID:        userID,
		CompanyID: companyID,
		Role:      string(middleware.GetUserRoleFromContext(ctx)),
	}, nil
}

func resolveDestination(destination *string, fallback string) *string {
	if destination != nil {
		trimmed := strings.TrimSpace(*destination)
		if trimmed != "" {
			return &trimmed
		}
	}
	fallbackTrimmed := strings.TrimSpace(fallback)
	if fallbackTrimmed == "" {
		return nil
	}
	return &fallbackTrimmed
}

// deriveEntryTime determines the entry time from sync data.
// If explicitly provided, use it. If not, set to now for ENTRY intent.
func deriveEntryTime(entryTime *time.Time, intent satpam.GateIntent) *time.Time {
	if entryTime != nil {
		return entryTime
	}
	if intent == satpam.GateIntentEntry {
		now := time.Now()
		return &now
	}
	return nil
}

// deriveEntryGate determines the entry gate from sync data.
// Falls back to gatePosition for ENTRY intent.
func deriveEntryGate(entryGate *string, gatePosition string, intent satpam.GateIntent) *string {
	if entryGate != nil {
		trimmedEntryGate := strings.TrimSpace(*entryGate)
		if trimmedEntryGate != "" {
			return &trimmedEntryGate
		}
	}
	trimmedGatePosition := strings.TrimSpace(gatePosition)
	if intent == satpam.GateIntentEntry && trimmedGatePosition != "" {
		return &trimmedGatePosition
	}
	return nil
}

// deriveExitGate determines the exit gate from sync data.
// Falls back to gatePosition for EXIT intent.
func deriveExitGate(exitGate *string, gatePosition string, intent satpam.GateIntent) *string {
	if exitGate != nil {
		trimmedExitGate := strings.TrimSpace(*exitGate)
		if trimmedExitGate != "" {
			return &trimmedExitGate
		}
	}
	trimmedGatePosition := strings.TrimSpace(gatePosition)
	if intent == satpam.GateIntentExit && trimmedGatePosition != "" {
		return &trimmedGatePosition
	}
	return nil
}

// RegisterGuest registers a new guest and returns the guest log with QR token
func (s *GateCheckService) RegisterGuest(ctx context.Context, input satpam.CreateGuestRegistrationInput) (*satpam.GuestRegistrationResult, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return &satpam.GuestRegistrationResult{
			Success: false,
			Message: "User tidak terautentikasi",
		}, nil
	}

	// Create entry time
	now := time.Now()

	// Create guest log record
	resolvedDestination := resolveDestination(input.Destination, "")
	guestLog := &GuestLog{
		ID:                  uuid.New().String(),
		LocalID:             &input.LocalID,
		IDCardNumber:        input.IDCardNumber,
		DriverName:          input.DriverName,
		VehiclePlate:        input.VehiclePlate,
		VehicleType:         input.VehicleType,
		Destination:         resolvedDestination,
		EntryTime:           &now,
		EntryGate:           &input.GatePosition,
		GatePosition:        input.GatePosition,
		Notes:               input.Notes,
		AuthorizedUserID:    user.ID,
		CompanyID:           user.CompanyID,
		CreatedBy:           user.ID,
		CreatedUserID:       user.ID,
		DeviceID:            input.DeviceID,
		Latitude:            input.Latitude,
		Longitude:           input.Longitude,
		SyncStatus:          common.SyncStatusSynced,
		LoadType:            input.LoadType,
		CargoVolume:         input.CargoVolume,
		CargoOwner:          input.CargoOwner,
		EstimatedWeight:     input.EstimatedWeight,
		DeliveryOrderNumber: input.DeliveryOrderNumber,
		SecondCargo:         input.SecondCargo,
		RegistrationSource:  input.RegistrationSource,
	}

	// Save to database
	if err := s.db.Create(guestLog).Error; err != nil {
		return &satpam.GuestRegistrationResult{
			Success: false,
			Message: "Gagal menyimpan data tamu",
		}, nil
	}

	// Generate QR token
	qrToken, err := s.generateQRToken(ctx, guestLog.ID, satpam.GateIntentEntry, input.DeviceID, 60, user.ID, user.CompanyID)
	if err != nil {
		// Guest log created but QR failed - still return success but with warning
		return &satpam.GuestRegistrationResult{
			Success:  true,
			Message:  "Tamu terdaftar, tetapi gagal membuat QR code",
			GuestLog: s.convertToSatpamGuestLog(guestLog),
		}, nil
	}

	// Update guest log with QR code data
	guestLog.QRCodeData = &qrToken.Token
	s.db.Save(guestLog)

	return &satpam.GuestRegistrationResult{
		Success:  true,
		Message:  "Tamu berhasil didaftarkan",
		GuestLog: s.convertToSatpamGuestLog(guestLog),
		QRToken:  qrToken,
	}, nil
}

// GenerateGuestQR generates a QR token for an existing guest log
func (s *GateCheckService) GenerateGuestQR(ctx context.Context, guestLogID string, intent satpam.GateIntent, deviceID string, expiryMinutes *int32) (*satpam.SatpamQRToken, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	// Verify guest log exists
	var guestLog GuestLog
	if err := s.db.Where("id = ?", guestLogID).First(&guestLog).Error; err != nil {
		return nil, errors.New("data tamu tidak ditemukan")
	}

	minutes := int32(60)
	if expiryMinutes != nil {
		minutes = *expiryMinutes
	}

	return s.generateQRToken(ctx, guestLogID, intent, deviceID, int(minutes), user.ID, user.CompanyID)
}

// ProcessGuestExit processes a guest exit
func (s *GateCheckService) ProcessGuestExit(ctx context.Context, input satpam.ProcessExitInput) (*satpam.ProcessExitResult, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return &satpam.ProcessExitResult{
			Success:     false,
			Message:     "User tidak terautentikasi",
			WasOverstay: false,
		}, nil
	}

	var guestLog GuestLog

	// Find guest log based on identifier type
	switch input.IdentifierType {
	case satpam.ExitIdentifierTypeGuestLogID:
		if err := s.db.Where("id = ?", input.Identifier).First(&guestLog).Error; err != nil {
			return &satpam.ProcessExitResult{
				Success:     false,
				Message:     "Data tamu tidak ditemukan",
				WasOverstay: false,
			}, nil
		}
	case satpam.ExitIdentifierTypePlate:
		if err := s.db.Where("vehicle_plate = ? AND exit_time IS NULL AND entry_time IS NOT NULL", input.Identifier).Order("entry_time DESC").First(&guestLog).Error; err != nil {
			return &satpam.ProcessExitResult{
				Success:     false,
				Message:     "Kendaraan tidak ditemukan di dalam area",
				WasOverstay: false,
			}, nil
		}
	case satpam.ExitIdentifierTypeQRToken:
		// Validate QR token first
		var qrToken QRTokenDB

		// Attempt to find token in DB first
		tokenFound := false
		if err := s.db.Where("jti = ? OR token = ?", input.Identifier, input.Identifier).First(&qrToken).Error; err == nil {
			tokenFound = true
		}

		// STATELESS FALLBACK: If token not found in DB (because of device isolation),
		// try to parse JWT directly and trust it if signature is valid.
		if !tokenFound {
			// Extract JWT from input (Identifier is the QR data/Token)
			tokenString := input.Identifier
			// If it's a raw JTI or not a JWT, we can't do stateless validation without the DB record
			// But input.Identifier from mobile for QR type is usually the full token string

			parsedToken, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(s.jwtSecret), nil
			})

			if err == nil && parsedToken.Valid {
				claims, ok := parsedToken.Claims.(jwt.MapClaims)
				if ok {
					// Check intent
					intentStr, _ := claims["i"].(string) // try short key
					if intentStr == "" {
						intentStr, _ = claims["intent"].(string) // try long key (legacy)
					}

					if intentStr == string(satpam.GateIntentEntry) {
						// Valid ENTRY token, allow EXIT
						// Extract data for stateless record creation
						plate, _ := claims["p"].(string)
						if plate == "" {
							plate, _ = claims["vehicle_plate"].(string)
						}

						driverName, _ := claims["n"].(string)
						if driverName == "" {
							driverName, _ = claims["guest_name"].(string)
						}

						entryTimeUnix, _ := claims["et"].(float64)

						guestLogID, _ := claims["g"].(string)
						if guestLogID == "" {
							guestLogID, _ = claims["guest_log"].(string)
						}

						vehicleType, _ := claims["vt"].(string)
						if vehicleType == "" {
							vehicleType, _ = claims["vehicle_type"].(string)
						}
						if vehicleType == "" {
							vehicleType = "OTHER"
						}

						secondCargo, _ := claims["sc"].(string)
						if secondCargo == "" {
							secondCargo, _ = claims["second_cargo"].(string)
						}

						// Create new EXIT record
						now := time.Now()
						var entryTime *time.Time
						if entryTimeUnix > 0 {
							et := time.Unix(int64(entryTimeUnix), 0)
							entryTime = &et
						}

						newGuestLog := &GuestLog{
							ID:               uuid.New().String(),
							DriverName:       driverName,
							VehiclePlate:     plate,
							VehicleType:      satpam.VehicleType(vehicleType),
							GatePosition:     input.ExitGate,
							GenerationIntent: "EXIT",
							EntryTime:        entryTime,
							ExitTime:         &now,
							ExitGate:         &input.ExitGate,
							Notes:            input.Notes,
							AuthorizedUserID: user.ID,
							CompanyID:        user.CompanyID,
							CreatedBy:        user.ID,
							CreatedUserID:    user.ID,
							DeviceID:         input.DeviceID,
							SyncStatus:       common.SyncStatusSynced,
						}

						if secondCargo != "" {
							newGuestLog.SecondCargo = &secondCargo
						} else if input.SecondCargo != nil {
							newGuestLog.SecondCargo = input.SecondCargo
						}

						if input.Notes != nil {
							note := fmt.Sprintf("Stateless Exit. Ref Entry: %s. %s", guestLogID, *input.Notes)
							newGuestLog.Notes = &note
						} else {
							note := fmt.Sprintf("Stateless Exit. Ref Entry: %s", guestLogID)
							newGuestLog.Notes = &note
						}

						if err := s.db.Create(newGuestLog).Error; err != nil {
							return &satpam.ProcessExitResult{
								Success: false,
								Message: "Gagal membuat record exit stateless: " + err.Error(),
							}, nil
						}

						return &satpam.ProcessExitResult{
							Success:     true,
							Message:     "Keluar berhasil diproses (Stateless)",
							GuestLog:    s.convertToSatpamGuestLog(newGuestLog),
							WasOverstay: false, // Calc specific logic if needed
						}, nil
					}
				}
			}

			// If fall-through here, neither DB token found nor valid stateless JWT
			return &satpam.ProcessExitResult{
				Success:     false,
				Message:     "QR token tidak valid / tidak ditemukan",
				WasOverstay: false,
			}, nil
		}

		if qrToken.GuestLogID == nil {
			return &satpam.ProcessExitResult{
				Success:     false,
				Message:     "QR token tidak terkait dengan data tamu",
				WasOverstay: false,
			}, nil
		}
		if err := s.db.Where("id = ?", *qrToken.GuestLogID).First(&guestLog).Error; err != nil {
			return &satpam.ProcessExitResult{
				Success:     false,
				Message:     "Data tamu tidak ditemukan (DB)",
				WasOverstay: false,
			}, nil
		}
	default:
		return &satpam.ProcessExitResult{
			Success:     false,
			Message:     "Tipe identifier tidak valid",
			WasOverstay: false,
		}, nil
	}

	// Check if already exited (exit_time already set)
	if guestLog.ExitTime != nil {
		return &satpam.ProcessExitResult{
			Success:     false,
			Message:     "Tamu sudah keluar sebelumnya",
			WasOverstay: false,
			GuestLog:    s.convertToSatpamGuestLog(&guestLog),
		}, nil
	}

	// Process exit
	now := time.Now()
	guestLog.ExitTime = &now
	guestLog.ExitGate = &input.ExitGate
	guestLog.GenerationIntent = "EXIT"

	if input.SecondCargo != nil {
		guestLog.SecondCargo = input.SecondCargo
	}

	// Calculate duration
	var wasOverstay bool
	if guestLog.EntryTime != nil {
		durationMinutes := int32(now.Sub(*guestLog.EntryTime).Minutes())

		// Check overstay (8 hours = 480 minutes)
		wasOverstay = durationMinutes > 480
	}

	if input.Notes != nil {
		guestLog.Notes = input.Notes
	}

	// Update with RLS context
	_ = user // RLS handled by middleware
	if err := s.db.Save(&guestLog).Error; err != nil {
		return &satpam.ProcessExitResult{
			Success:     false,
			Message:     "Gagal memproses keluar",
			WasOverstay: false,
		}, nil
	}

	return &satpam.ProcessExitResult{
		Success:     true,
		Message:     "Keluar berhasil diproses",
		GuestLog:    s.convertToSatpamGuestLog(&guestLog),
		WasOverstay: wasOverstay,
	}, nil
}

// ValidateQR validates a QR token
func (s *GateCheckService) ValidateQR(ctx context.Context, qrData string, expectedIntent satpam.GateIntent, deviceID string) (*satpam.QRValidationResult, error) {
	// Try to find token in database
	var qrToken QRTokenDB
	if err := s.db.Where("token = ? OR jti = ?", qrData, qrData).First(&qrToken).Error; err != nil {
		return &satpam.QRValidationResult{
			IsValid:           false,
			Message:           "QR token tidak ditemukan",
			AllowedOperations: []satpam.GateIntent{},
		}, nil
	}

	// Check if expired
	if time.Now().After(qrToken.ExpiresAt) {
		return &satpam.QRValidationResult{
			IsValid:           false,
			Message:           "QR token sudah kadaluarsa",
			AllowedOperations: []satpam.GateIntent{},
			TokenInfo:         s.convertToSatpamQRToken(&qrToken),
		}, nil
	}

	// Check if already used
	if qrToken.Status == satpam.QRTokenStatusUsed {
		return &satpam.QRValidationResult{
			IsValid:           false,
			Message:           "QR token sudah digunakan",
			AllowedOperations: []satpam.GateIntent{},
			TokenInfo:         s.convertToSatpamQRToken(&qrToken),
		}, nil
	}

	// Get associated guest log if exists
	var guestLog *satpam.SatpamGuestLog
	if qrToken.GuestLogID != nil {
		var gl GuestLog
		if err := s.db.Where("id = ?", *qrToken.GuestLogID).First(&gl).Error; err == nil {
			guestLog = s.convertToSatpamGuestLog(&gl)
		}
	}

	return &satpam.QRValidationResult{
		IsValid:           true,
		Message:           "QR token valid",
		TokenInfo:         s.convertToSatpamQRToken(&qrToken),
		GuestLog:          guestLog,
		AllowedOperations: []satpam.GateIntent{qrToken.AllowedScan},
	}, nil
}

// GetVehiclesInside returns vehicles currently inside
// A vehicle is considered "inside" only if:
// 1. It has an ENTRY record with entry_time set and exit_time NULL
// 2. There is NO separate EXIT record for the same vehicle_plate + vehicle_type after the entry
func (s *GateCheckService) GetVehiclesInside(ctx context.Context, search *string, companyIDs []string) ([]*satpam.VehicleInsideInfo, error) {
	if err := ensureAuthenticated(ctx); err != nil {
		return nil, err
	}

	scopedCompanyIDs, err := resolveCompanyScope(ctx, companyIDs)
	if err != nil {
		return nil, err
	}

	var guestLogs []GuestLog
	// Find ENTRY records that don't have exit_time set
	query := s.db.Preload("Photos").Where("exit_time IS NULL AND entry_time IS NOT NULL AND company_id IN ?", scopedCompanyIDs)

	if search != nil && *search != "" {
		searchTerm := "%" + *search + "%"
		query = query.Where("vehicle_plate ILIKE ? OR driver_name ILIKE ?", searchTerm, searchTerm)
	}

	if err := query.Order("entry_time DESC").Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	// Filter out vehicles that have a separate EXIT record on the same calendar day (WIB)
	var filteredLogs []GuestLog
	wibLoc := getWIBLocation()
	for _, gl := range guestLogs {
		if gl.EntryTime == nil {
			continue
		}
		// Calculate same-day boundaries in WIB timezone
		entryWIB := gl.EntryTime.In(wibLoc)
		dayStart := time.Date(entryWIB.Year(), entryWIB.Month(), entryWIB.Day(), 0, 0, 0, 0, wibLoc)
		dayEnd := dayStart.AddDate(0, 0, 1)

		// Check if there's a separate EXIT record for this vehicle on the same day
		var exitCount int64
		s.db.Model(&GuestLog{}).
			Where("vehicle_plate = ? AND vehicle_type = ? AND company_id = ?", gl.VehiclePlate, gl.VehicleType, gl.CompanyID).
			Where("generation_intent = ? AND exit_time IS NOT NULL", "EXIT").
			Where("exit_time >= ? AND exit_time < ?", dayStart, dayEnd).
			Count(&exitCount)

		// Only include if no matching EXIT record exists on the same day
		if exitCount == 0 {
			filteredLogs = append(filteredLogs, gl)
		}
	}

	result := make([]*satpam.VehicleInsideInfo, len(filteredLogs))
	for i, gl := range filteredLogs {
		duration := int32(0)
		isOverstay := false
		if gl.EntryTime != nil {
			duration = int32(time.Since(*gl.EntryTime).Minutes())
			isOverstay = duration > 480 // 8 hours
		}
		entryGate := gl.EntryGate
		if entryGate == nil || strings.TrimSpace(*entryGate) == "" {
			trimmedGatePosition := strings.TrimSpace(gl.GatePosition)
			if trimmedGatePosition != "" {
				entryGate = &trimmedGatePosition
			}
		}

		result[i] = &satpam.VehicleInsideInfo{
			GuestLogID:          gl.ID,
			CompanyID:           gl.CompanyID,
			VehiclePlate:        gl.VehiclePlate,
			VehicleType:         gl.VehicleType,
			DriverName:          gl.DriverName,
			EntryTime:           *gl.EntryTime,
			Duration:            duration,
			IsOverstay:          isOverstay,
			Destination:         gl.Destination,
			QRCode:              gl.QRCodeData,
			LoadType:            gl.LoadType,
			CargoVolume:         gl.CargoVolume,
			CargoOwner:          gl.CargoOwner,
			EstimatedWeight:     gl.EstimatedWeight,
			DeliveryOrderNumber: gl.DeliveryOrderNumber,
			IDCardNumber:        gl.IDCardNumber,
			SecondCargo:         gl.SecondCargo,
			EntryGate:           entryGate,
			Photos:              mapPhotosToDomain(gl.Photos),
		}
	}

	return result, nil
}

// GetVehiclesOutside returns vehicles that have exited the estate today
// but have no matching ENTRY record on the same calendar day (WIB).
// Duration = now - exit_time (how long since they left)
func (s *GateCheckService) GetVehiclesOutside(ctx context.Context, search *string) ([]*satpam.VehicleOutsideInfo, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	wibLoc := getWIBLocation()
	now := time.Now()
	todayWIB := now.In(wibLoc)
	todayStart := time.Date(todayWIB.Year(), todayWIB.Month(), todayWIB.Day(), 0, 0, 0, 0, wibLoc)
	todayEnd := todayStart.AddDate(0, 0, 1)

	var guestLogs []GuestLog
	// Find EXIT records for today that have exit_time set
	query := s.db.Preload("Photos").Where("generation_intent = ? AND exit_time IS NOT NULL AND company_id = ?", "EXIT", user.CompanyID).
		Where("exit_time >= ? AND exit_time < ?", todayStart, todayEnd)

	if search != nil && *search != "" {
		searchTerm := "%" + *search + "%"
		query = query.Where("vehicle_plate ILIKE ? OR driver_name ILIKE ?", searchTerm, searchTerm)
	}

	if err := query.Order("exit_time DESC").Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	// Filter to only those without a matching ENTRY on the same day
	var filteredLogs []GuestLog
	for _, gl := range guestLogs {
		if gl.ExitTime == nil {
			continue
		}
		exitWIB := gl.ExitTime.In(wibLoc)
		dayStart := time.Date(exitWIB.Year(), exitWIB.Month(), exitWIB.Day(), 0, 0, 0, 0, wibLoc)
		dayEnd := dayStart.AddDate(0, 0, 1)

		var entryCount int64
		s.db.Model(&GuestLog{}).
			Where("vehicle_plate = ? AND vehicle_type = ? AND company_id = ?", gl.VehiclePlate, gl.VehicleType, user.CompanyID).
			Where("entry_time IS NOT NULL AND exit_time IS NULL").
			Where("entry_time >= ? AND entry_time < ?", dayStart, dayEnd).
			Count(&entryCount)

		if entryCount == 0 {
			filteredLogs = append(filteredLogs, gl)
		}
	}

	result := make([]*satpam.VehicleOutsideInfo, len(filteredLogs))
	for i, gl := range filteredLogs {
		duration := int32(0)
		if gl.ExitTime != nil {
			duration = int32(now.Sub(*gl.ExitTime).Minutes())
		}

		result[i] = &satpam.VehicleOutsideInfo{
			GuestLogID:          gl.ID,
			CompanyID:           gl.CompanyID,
			VehiclePlate:        gl.VehiclePlate,
			VehicleType:         gl.VehicleType,
			DriverName:          gl.DriverName,
			ExitTime:            *gl.ExitTime,
			ExitGate:            gl.ExitGate,
			Duration:            duration,
			Destination:         gl.Destination,
			LoadType:            gl.LoadType,
			CargoVolume:         gl.CargoVolume,
			CargoOwner:          gl.CargoOwner,
			EstimatedWeight:     gl.EstimatedWeight,
			DeliveryOrderNumber: gl.DeliveryOrderNumber,
			IDCardNumber:        gl.IDCardNumber,
			SecondCargo:         gl.SecondCargo,
			Photos:              mapPhotosToDomain(gl.Photos),
		}
	}

	return result, nil
}

// GetVehiclesCompleted returns vehicles that have completed both entry and exit today (WIB).
func (s *GateCheckService) GetVehiclesCompleted(ctx context.Context, search *string) ([]*satpam.VehicleCompletedInfo, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	wibLoc := getWIBLocation()
	now := time.Now()
	todayWIB := now.In(wibLoc)
	todayStart := time.Date(todayWIB.Year(), todayWIB.Month(), todayWIB.Day(), 0, 0, 0, 0, wibLoc)
	todayEnd := todayStart.AddDate(0, 0, 1)

	var guestLogs []GuestLog
	// Find records that have exit_time being today.
	// We allow entry_time to be NULL initially (split record case), and try to find a matching entry record in the loop.
	query := s.db.Preload("Photos").Where("exit_time IS NOT NULL AND company_id = ?", user.CompanyID).
		Where("exit_time >= ? AND exit_time < ?", todayStart, todayEnd)

	if search != nil && *search != "" {
		searchTerm := "%" + *search + "%"
		query = query.Where("vehicle_plate ILIKE ? OR driver_name ILIKE ?", searchTerm, searchTerm)
	}

	if err := query.Order("exit_time DESC").Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	log.Printf("GetVehiclesCompleted: Today is %v, Start: %v, End: %v", todayWIB, todayStart, todayEnd)
	log.Printf("GetVehiclesCompleted: Found %d records with exit_time today", len(guestLogs))

	result := make([]*satpam.VehicleCompletedInfo, 0, len(guestLogs))
	for _, gl := range guestLogs {
		// Handle Split Records: If EntryTime is missing, look for a matching "Open" entry record on the same day
		if gl.EntryTime == nil {
			var entryLog GuestLog
			// Find most recent entry for this vehicle today that happened before this exit
			// and is still "open" (exit_time is null)
			if err := s.db.Preload("Photos").Where("vehicle_plate = ? AND vehicle_type = ? AND company_id = ?", gl.VehiclePlate, gl.VehicleType, user.CompanyID).
				Where("entry_time >= ? AND entry_time < ?", todayStart, *gl.ExitTime).
				Where("exit_time IS NULL").
				Order("entry_time DESC").
				First(&entryLog).Error; err == nil {
				// Log found matching entry
				log.Printf("Found Entry for Exit: ID=%s -> Entry: ID=%s, Plate=%s, Date=%v", gl.ID, entryLog.ID, gl.VehiclePlate, entryLog.EntryTime)

				// Found a matching entry! Stitch them together.
				gl.EntryTime = entryLog.EntryTime
				if gl.EntryGate == nil {
					gl.EntryGate = entryLog.EntryGate
				}
				// Carry over cargo-related fields from entry record if missing on exit record
				if gl.SecondCargo == nil && entryLog.SecondCargo != nil {
					gl.SecondCargo = entryLog.SecondCargo
				}
				if gl.LoadType == nil && entryLog.LoadType != nil {
					gl.LoadType = entryLog.LoadType
				}
				if gl.CargoVolume == nil && entryLog.CargoVolume != nil {
					gl.CargoVolume = entryLog.CargoVolume
				}
				if gl.CargoOwner == nil && entryLog.CargoOwner != nil {
					gl.CargoOwner = entryLog.CargoOwner
				}
				if gl.EstimatedWeight == nil && entryLog.EstimatedWeight != nil {
					gl.EstimatedWeight = entryLog.EstimatedWeight
				}
				if gl.DeliveryOrderNumber == nil && entryLog.DeliveryOrderNumber != nil {
					gl.DeliveryOrderNumber = entryLog.DeliveryOrderNumber
				}
				if gl.IDCardNumber == nil && entryLog.IDCardNumber != nil {
					gl.IDCardNumber = entryLog.IDCardNumber
				}
				if gl.Destination == nil && entryLog.Destination != nil {
					gl.Destination = entryLog.Destination
				}
				if gl.DriverName == "" && entryLog.DriverName != "" {
					gl.DriverName = entryLog.DriverName
				}
				// Merge photos from entry record
				if len(gl.Photos) == 0 && len(entryLog.Photos) > 0 {
					gl.Photos = entryLog.Photos
				}
			} else {
				log.Printf("No Entry found for Exit: ID=%s, Plate=%s (Today start: %v)", gl.ID, gl.VehiclePlate, todayStart)
			}
		}

		// Only include if we have a valid start and end time (Complete trip)
		if gl.EntryTime != nil && gl.ExitTime != nil {
			sc := "<nil>"
			if gl.SecondCargo != nil {
				sc = *gl.SecondCargo
			}
			log.Printf("[DEBUG] VehicleCompleted: Plate=%s, Driver=%s, SecondCargo=%s, LoadType=%v, Intent=%s",
				gl.VehiclePlate, gl.DriverName, sc, gl.LoadType, gl.GenerationIntent)
			result = append(result, s.ConvertToVehicleCompletedInfo(&gl))
		}
	}

	return result, nil
}

// GetDashboardStats returns dashboard statistics
// Counts unique vehicles based on vehicle_plate and vehicle_type combination
// Uses generation_intent to determine if record is ENTRY or EXIT
func (s *GateCheckService) GetDashboardStats(ctx context.Context, companyIDs []string) (*satpam.SatpamDashboardStats, error) {
	if err := ensureAuthenticated(ctx); err != nil {
		return nil, err
	}

	scopedCompanyIDs, err := resolveCompanyScope(ctx, companyIDs)
	if err != nil {
		return nil, err
	}

	wibLoc := getWIBLocation()
	nowWIB := time.Now().In(wibLoc)
	today := time.Date(nowWIB.Year(), nowWIB.Month(), nowWIB.Day(), 0, 0, 0, 0, wibLoc)
	todayEnd := today.AddDate(0, 0, 1)

	// Count unique vehicles currently inside (by vehicle_plate + vehicle_type)
	// A vehicle is inside if:
	// 1. It has entry_time but no exit_time in the ENTRY record
	// 2. There is NO separate EXIT record for the same vehicle on the same calendar day (WIB)
	var vehiclesInside int64
	s.db.Raw(`
		SELECT COUNT(DISTINCT (vehicle_plate, vehicle_type))
		FROM gate_guest_logs AS entry
		WHERE entry.exit_time IS NULL
		AND entry.entry_time IS NOT NULL
		AND entry.company_id IN ?
		AND NOT EXISTS (
			SELECT 1 FROM gate_guest_logs AS exit_rec
			WHERE exit_rec.vehicle_plate = entry.vehicle_plate
			AND exit_rec.vehicle_type = entry.vehicle_type
			AND exit_rec.company_id = entry.company_id
			AND exit_rec.generation_intent = 'EXIT'
			AND exit_rec.exit_time IS NOT NULL
			AND DATE(exit_rec.exit_time AT TIME ZONE 'Asia/Jakarta') = DATE(entry.entry_time AT TIME ZONE 'Asia/Jakarta')
		)
	`, scopedCompanyIDs).Scan(&vehiclesInside)

	// Count vehicles outside today (EXIT records today with no same-day ENTRY)
	var vehiclesOutsideCount int64
	s.db.Raw(`
		SELECT COUNT(DISTINCT (vehicle_plate, vehicle_type))
		FROM gate_guest_logs AS exit_rec
		WHERE exit_rec.generation_intent = 'EXIT'
		AND exit_rec.exit_time IS NOT NULL
		AND exit_rec.exit_time >= ?
		AND exit_rec.exit_time < ?
		AND exit_rec.company_id IN ?
		AND NOT EXISTS (
			SELECT 1 FROM gate_guest_logs AS entry
			WHERE entry.vehicle_plate = exit_rec.vehicle_plate
			AND entry.vehicle_type = exit_rec.vehicle_type
			AND entry.company_id = exit_rec.company_id
			AND entry.entry_time IS NOT NULL
			AND entry.exit_time IS NULL
			AND DATE(entry.entry_time AT TIME ZONE 'Asia/Jakarta') = DATE(exit_rec.exit_time AT TIME ZONE 'Asia/Jakarta')
		)
	`, today, todayEnd, scopedCompanyIDs).Scan(&vehiclesOutsideCount)

	// Count unique vehicles with ENTRY intent today (by vehicle_plate + vehicle_type)
	var todayEntries int64
	s.db.Model(&GuestLog{}).
		Where("generation_intent = ? AND created_at >= ? AND company_id IN ?", "ENTRY", today, scopedCompanyIDs).
		Distinct("vehicle_plate", "vehicle_type").
		Count(&todayEntries)

	// Count unique vehicles with EXIT intent today (by vehicle_plate + vehicle_type)
	var todayExits int64
	s.db.Model(&GuestLog{}).
		Where("generation_intent = ? AND created_at >= ? AND company_id IN ?", "EXIT", today, scopedCompanyIDs).
		Distinct("vehicle_plate", "vehicle_type").
		Count(&todayExits)

	// Count overstay vehicles (inside for more than 8 hours)
	// Uses NOT EXISTS with same-day constraint
	var overstayCount int64
	eightHoursAgo := time.Now().Add(-8 * time.Hour)
	s.db.Raw(`
		SELECT COUNT(DISTINCT (vehicle_plate, vehicle_type))
		FROM gate_guest_logs AS entry
		WHERE entry.exit_time IS NULL
		AND entry.entry_time IS NOT NULL
		AND entry.entry_time < ?
		AND entry.company_id IN ?
		AND NOT EXISTS (
			SELECT 1 FROM gate_guest_logs AS exit_rec
			WHERE exit_rec.vehicle_plate = entry.vehicle_plate
			AND exit_rec.vehicle_type = entry.vehicle_type
			AND exit_rec.company_id = entry.company_id
			AND exit_rec.generation_intent = 'EXIT'
			AND exit_rec.exit_time IS NOT NULL
			AND DATE(exit_rec.exit_time AT TIME ZONE 'Asia/Jakarta') = DATE(entry.entry_time AT TIME ZONE 'Asia/Jakarta')
		)
	`, eightHoursAgo, scopedCompanyIDs).Scan(&overstayCount)

	// Count missing exit (ENTRY > 24 hours without EXIT on the same day)
	var missingExitCount int64
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	s.db.Raw(`
		SELECT COUNT(DISTINCT (vehicle_plate, vehicle_type))
		FROM gate_guest_logs AS entry
		WHERE entry.generation_intent = 'ENTRY'
		AND entry.exit_time IS NULL
		AND entry.entry_time IS NOT NULL
		AND entry.entry_time < ?
		AND entry.company_id IN ?
		AND NOT EXISTS (
			SELECT 1 FROM gate_guest_logs AS exit_rec
			WHERE exit_rec.vehicle_plate = entry.vehicle_plate
			AND exit_rec.vehicle_type = entry.vehicle_type
			AND exit_rec.company_id = entry.company_id
			AND exit_rec.generation_intent = 'EXIT'
			AND exit_rec.exit_time IS NOT NULL
			AND DATE(exit_rec.exit_time AT TIME ZONE 'Asia/Jakarta') = DATE(entry.entry_time AT TIME ZONE 'Asia/Jakarta')
		)
	`, twentyFourHoursAgo, scopedCompanyIDs).Scan(&missingExitCount)

	// Count missing entry (EXIT without prior ENTRY)
	var missingEntryCount int64
	s.db.Raw(`
		SELECT COUNT(DISTINCT (vehicle_plate, vehicle_type))
		FROM gate_guest_logs AS exit_rec
		WHERE exit_rec.generation_intent = 'EXIT'
		AND exit_rec.exit_time IS NOT NULL
		AND exit_rec.exit_time < ?
		AND exit_rec.company_id IN ?
		AND NOT EXISTS (
			SELECT 1 FROM gate_guest_logs AS entry
			WHERE entry.vehicle_plate = exit_rec.vehicle_plate
			AND entry.vehicle_type = exit_rec.vehicle_type
			AND entry.company_id = exit_rec.company_id
			AND entry.generation_intent = 'ENTRY'
			AND entry.entry_time IS NOT NULL
			AND entry.entry_time < exit_rec.exit_time
		)
	`, twentyFourHoursAgo, scopedCompanyIDs).Scan(&missingEntryCount)

	return &satpam.SatpamDashboardStats{
		VehiclesInside:    int32(vehiclesInside),
		VehiclesOutside:   int32(vehiclesOutsideCount),
		TodayEntries:      int32(todayEntries),
		TodayExits:        int32(todayExits),
		PendingExits:      int32(vehiclesInside),
		GuestsToday:       int32(todayEntries),
		QRScansToday:      int32(todayEntries + todayExits), // Total scans
		AvgProcessingTime: 0,                                // TODO: Calculate average
		OverstayCount:     int32(overstayCount),
		MissingExitCount:  int32(missingExitCount),
		MissingEntryCount: int32(missingEntryCount),
	}, nil
}

// ConvertToVehicleCompletedInfo converts a GuestLog to a VehicleCompletedInfo
func (s *GateCheckService) ConvertToVehicleCompletedInfo(gl *GuestLog) *satpam.VehicleCompletedInfo {
	durationInside := int32(0)
	if gl.EntryTime != nil && gl.ExitTime != nil {
		diff := gl.ExitTime.Sub(*gl.EntryTime).Minutes()
		if diff < 0 {
			// EXIT DULUAN case: entryTime - exitTime
			durationInside = int32((*gl.EntryTime).Sub(*gl.ExitTime).Minutes())
		} else {
			durationInside = int32(diff)
		}
	}

	return &satpam.VehicleCompletedInfo{
		GuestLogID:          gl.ID,
		CompanyID:           gl.CompanyID,
		VehiclePlate:        gl.VehiclePlate,
		VehicleType:         gl.VehicleType,
		DriverName:          gl.DriverName,
		EntryTime:           *gl.EntryTime,
		ExitTime:            *gl.ExitTime,
		EntryGate:           gl.EntryGate,
		ExitGate:            gl.ExitGate,
		DurationInside:      durationInside,
		Destination:         gl.Destination,
		LoadType:            gl.LoadType,
		CargoVolume:         gl.CargoVolume,
		CargoOwner:          gl.CargoOwner,
		EstimatedWeight:     gl.EstimatedWeight,
		DeliveryOrderNumber: gl.DeliveryOrderNumber,
		IDCardNumber:        gl.IDCardNumber,
		SecondCargo:         gl.SecondCargo,
		Photos:              mapPhotosToDomain(gl.Photos),
	}
}

// SyncSatpamRecords syncs satpam records from mobile device
func (s *GateCheckService) SyncSatpamRecords(ctx context.Context, input satpam.SatpamSyncInput) (*satpam.SatpamSyncResult, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return &satpam.SatpamSyncResult{
			Success: false,
			Message: "User tidak terautentikasi",
		}, nil
	}

	var syncedCount, failedCount, conflictCount int32
	var results []*satpam.SatpamSyncItemResult
	transactionID := uuid.New().String()

	fmt.Printf("SyncSatpamRecords: DeviceID=%s, GuestLogs=%d\n", input.DeviceID, len(input.GuestLogs))

	// Process guest logs
	for _, record := range input.GuestLogs {
		result := &satpam.SatpamSyncItemResult{
			LocalID:     record.LocalID,
			RecordType:  "GUEST_LOG",
			Success:     false,
			Status:      common.SyncItemStatusRejected,
			HasConflict: false,
		}

		// Skip if no data
		if record.Data == nil {
			errMsg := "no data provided"
			result.Error = &errMsg
			failedCount++
			results = append(results, result)
			continue
		}

		data := record.Data
		resolvedDestination := resolveDestination(data.Destination, "")
		guestLog := &GuestLog{
			ID:                  uuid.New().String(),
			LocalID:             &record.LocalID,
			DriverName:          data.DriverName,
			VehiclePlate:        data.VehiclePlate,
			VehicleType:         data.VehicleType,
			Destination:         resolvedDestination,
			IDCardNumber:        data.IDCardNumber,
			SecondCargo:         data.SecondCargo,
			Notes:               data.Notes,
			LoadType:            data.LoadType,
			CargoVolume:         data.CargoVolume,
			CargoOwner:          data.CargoOwner,
			EstimatedWeight:     data.EstimatedWeight,
			DeliveryOrderNumber: data.DeliveryOrderNumber,
			Latitude:            data.Latitude,
			Longitude:           data.Longitude,
			GatePosition:        data.GatePosition,
			CompanyID:           user.CompanyID,
			CreatedBy:           user.ID,
			CreatedUserID:       user.ID,
			DeviceID:            input.DeviceID,
			SyncStatus:          common.SyncStatusSynced,
			AuthorizedUserID:    user.ID,
			QRCodeData:          data.QrToken,
			GenerationIntent:    string(data.GenerationIntent),
			EntryTime:           data.EntryTime,
			ExitTime:            data.ExitTime,
			EntryGate:           deriveEntryGate(data.EntryGate, data.GatePosition, data.GenerationIntent),
			ExitGate:            deriveExitGate(data.ExitGate, data.GatePosition, data.GenerationIntent),
			RegistrationSource:  data.RegistrationSource,
		}

		// Check if record already exists by localID
		var existingLog GuestLog
		if err := s.db.Where("local_id = ? AND company_id = ?", record.LocalID, user.CompanyID).First(&existingLog).Error; err == nil {
			// Update existing record
			guestLog.ID = existingLog.ID

			if err := s.db.Save(guestLog).Error; err != nil {
				errMsg := err.Error()
				result.Error = &errMsg
				failedCount++
				results = append(results, result)
				continue
			}
		} else {
			if err := s.db.Create(guestLog).Error; err != nil {
				errMsg := err.Error()
				result.Error = &errMsg
				failedCount++
				results = append(results, result)
				continue
			}
		}

		result.Success = true
		result.Status = common.SyncItemStatusAccepted
		result.ServerID = &guestLog.ID
		serverVersion := int32(1)
		result.ServerVersion = &serverVersion
		syncedCount++
		results = append(results, result)
	}

	return &satpam.SatpamSyncResult{
		Success:           failedCount == 0,
		TransactionID:     transactionID,
		RecordsProcessed:  syncedCount + failedCount,
		RecordsSuccessful: syncedCount,
		RecordsFailed:     failedCount,
		ConflictsDetected: conflictCount,
		Results:           results,
		ServerTimestamp:   time.Now(),
		Message:           fmt.Sprintf("Synced %d records, %d failed", syncedCount, failedCount),
	}, nil
}

// Helper methods

func (s *GateCheckService) generateQRToken(ctx context.Context, guestLogID string, intent satpam.GateIntent, deviceID string, expiryMinutes int, userID, companyID string) (*satpam.SatpamQRToken, error) {
	jti := generateJTI()
	now := time.Now()
	expiresAt := now.Add(time.Duration(expiryMinutes) * time.Minute)

	// Determine allowed scan intent (opposite of generation intent)
	allowedScan := satpam.GateIntentExit
	if intent == satpam.GateIntentExit {
		allowedScan = satpam.GateIntentEntry
	}

	// Create JWT claims (Minified for Compact QR)
	claims := jwt.MapClaims{
		"j":   jti,                 // jti
		"g":   guestLogID,          // guest_log
		"i":   string(intent),      // intent
		"a":   string(allowedScan), // allowed
		"d":   deviceID,            // device
		"c":   companyID,           // company
		"iat": now.Unix(),
		"exp": expiresAt.Unix(),
	}

	// Fetch guest log to add extra data for stateless validation
	var guestLog GuestLog
	if err := s.db.Where("id = ?", guestLogID).First(&guestLog).Error; err == nil {
		claims["p"] = guestLog.VehiclePlate         // plate
		claims["n"] = guestLog.DriverName           // name
		claims["vt"] = string(guestLog.VehicleType) // vehicle_type
		if guestLog.EntryTime != nil {
			claims["et"] = guestLog.EntryTime.Unix() // entry_time
		}
		if guestLog.SecondCargo != nil {
			claims["sc"] = *guestLog.SecondCargo // second_cargo
		}
	}

	// Sign token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, fmt.Errorf("gagal membuat token: %w", err)
	}

	// Save to database
	qrToken := &QRTokenDB{
		ID:               uuid.New().String(),
		JTI:              jti,
		Token:            tokenString,
		GenerationIntent: intent,
		AllowedScan:      allowedScan,
		Status:           satpam.QRTokenStatusActive,
		ExpiresAt:        expiresAt,
		GeneratedAt:      now,
		GuestLogID:       &guestLogID,
		CompanyID:        companyID,
		GeneratedBy:      userID,
		DeviceID:         deviceID,
		MaxUsage:         1,
	}

	if err := s.db.Create(qrToken).Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan token: %w", err)
	}

	return s.convertToSatpamQRToken(qrToken), nil
}

func (s *GateCheckService) convertToSatpamGuestLog(gl *GuestLog) *satpam.SatpamGuestLog {
	var intent *satpam.GateIntent
	if gl.GenerationIntent != "" {
		i := satpam.GateIntent(gl.GenerationIntent)
		intent = &i
	}

	// Map photos first to get the URL
	photos := mapPhotosToDomain(gl.Photos)
	var photoURL *string
	if len(photos) > 0 {
		photoURL = &photos[0].PhotoURL
	}

	return &satpam.SatpamGuestLog{
		ID:               gl.ID,
		CompanyID:        gl.CompanyID,
		LocalID:          gl.LocalID,
		IDCardNumber:     gl.IDCardNumber,
		DriverName:       gl.DriverName,
		VehiclePlate:     gl.VehiclePlate,
		VehicleType:      gl.VehicleType,
		Destination:      gl.Destination,
		GatePosition:     &gl.GatePosition,
		GenerationIntent: intent,
		EntryTime:        gl.EntryTime,
		ExitTime:         gl.ExitTime,
		EntryGate:        gl.EntryGate,
		ExitGate:         gl.ExitGate,
		Latitude:         gl.Latitude,
		Longitude:        gl.Longitude,
		QRCodeData:       gl.QRCodeData,

		LoadType:            gl.LoadType,
		CargoVolume:         gl.CargoVolume,
		CargoOwner:          gl.CargoOwner,
		EstimatedWeight:     gl.EstimatedWeight,
		DeliveryOrderNumber: gl.DeliveryOrderNumber,
		SecondCargo:         gl.SecondCargo,
		CreatedBy:           gl.CreatedBy,
		CreatedAt:           gl.CreatedAt,
		SyncStatus:          gl.SyncStatus,
		DeviceID:            &gl.DeviceID,
		RegistrationSource:  gl.RegistrationSource,
		PhotoURL:            photoURL,
		Photos:              photos,
	}
}

// ConvertToSatpamGuestLog is a public wrapper for the conversion method
func (s *GateCheckService) ConvertToSatpamGuestLog(gl *GuestLog) *satpam.SatpamGuestLog {
	return s.convertToSatpamGuestLog(gl)
}

// findExistingPhoto checks if a photo file already exists for a localID (offline UUID)
// in the uploads directory. This handles cases where photos are synced before the record.
func (s *GateCheckService) findExistingPhoto(localID string) *string {
	uploadDir := s.satpamPhotoUploadDir()
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		fmt.Printf("findExistingPhoto: error reading dir %s: %v\n", uploadDir, err)
		return nil
	}

	for _, f := range files {
		// Photos are named like LOCAL_ID_TIMESTAMP.jpg
		if !f.IsDir() && strings.HasPrefix(f.Name(), localID+"_") {
			urlPath := satpamPhotoURLPath(f.Name())
			return &urlPath
		}
	}
	return nil
}

// normalizePhotoURL ensures photo paths have a leading slash for frontend proxy compatibility.
// Handles legacy data stored without the leading slash.
func normalizePhotoURL(path *string) *string {
	if path == nil || *path == "" {
		return path
	}
	p := *path
	if strings.HasPrefix(p, "http") {
		return path
	}
	if strings.HasPrefix(p, "uploads/") {
		p = "/" + p
		return &p
	}
	return path
}

// getPrimaryPhotoURL returns the normalized URL for the first photo in a slice
func getPrimaryPhotoURL(photos []models.GateCheckPhoto) *string {
	if len(photos) > 0 {
		return normalizePhotoURL(&photos[0].FilePath)
	}
	return nil
}

// mapPhotosToDomain converts database photo models to GraphQL domain models
func mapPhotosToDomain(photos []models.GateCheckPhoto) []*satpam.SatpamPhoto {
	result := make([]*satpam.SatpamPhoto, len(photos))
	for i, p := range photos {
		result[i] = &satpam.SatpamPhoto{
			ID:        p.ID,
			PhotoID:   p.PhotoID,
			PhotoType: satpam.PhotoType(p.PhotoType),
			PhotoURL:  *normalizePhotoURL(&p.FilePath),
			TakenAt:   p.TakenAt,
		}
	}
	return result
}

func (s *GateCheckService) convertToSatpamQRToken(qt *QRTokenDB) *satpam.SatpamQRToken {
	return &satpam.SatpamQRToken{
		ID:               qt.ID,
		Token:            qt.Token,
		Jti:              qt.JTI,
		GenerationIntent: qt.GenerationIntent,
		AllowedScan:      qt.AllowedScan,
		Status:           qt.Status,
		ExpiresAt:        qt.ExpiresAt,
		GeneratedAt:      qt.GeneratedAt,
		GuestLogID:       qt.GuestLogID,
	}
}

func generateJTI() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ======================================
// Multi-POS Gate System Methods
// ======================================

// GenerateMultiPOSQR generates a QR token for multi-checkpoint journey
func (s *GateCheckService) GenerateMultiPOSQR(ctx context.Context, input *models.GenerateMultiPOSQRRequest) (*models.QRToken, string, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, "", errors.New("user tidak terautentikasi")
	}

	jti := generateJTI()
	now := time.Now()

	// Default expiry is 24 hours if not specified
	expiryMinutes := 1440 // 24 hours
	if input.ExpiryMinutes > 0 {
		expiryMinutes = input.ExpiryMinutes
	}
	expiresAt := now.Add(time.Duration(expiryMinutes) * time.Minute)

	// Build all steps: checkpoints only (Entry/Exit POS removed)
	allSteps := append([]string{}, input.Checkpoints...)

	// Create JWT claims for multi-POS
	claims := jwt.MapClaims{
		"jti":           jti,
		"iss":           "agrinova-gate-check",
		"iat":           now.Unix(),
		"exp":           expiresAt.Unix(),
		"guest_name":    input.GuestName,
		"vehicle_plate": input.VehiclePlate,
		"vehicle_type":  string(input.VehicleType),
		"token_type":    "MULTI_POS",
		"current_step":  0,
		"total_steps":   len(allSteps),
		"status":        string(models.JourneyActive),
		"company_id":    user.CompanyID,
		"generated_by":  user.ID,
	}

	// Sign token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, "", fmt.Errorf("gagal membuat token: %w", err)
	}

	// Save to database
	tokenID := uuid.New().String()
	qrToken := &models.QRToken{
		ID:               uuid.New().String(),
		JTI:              jti,
		TokenID:          tokenID,
		JWTToken:         tokenString,
		TokenHash:        jti, // Use JTI as hash for simplicity
		GenerationIntent: models.GateEntry,
		AllowedScan:      models.GateEntry,
		AllowedAction:    models.GateEntry,
		Intent:           models.GateEntry,
		Status:           models.QRTokenActive,
		ExpiresAt:        expiresAt,
		GeneratedAt:      now,
		CompanyID:        user.CompanyID,
		GeneratedBy:      user.ID,
		GeneratedUserID:  user.ID,
		GenerationDevice: input.DeviceID,
		MaxUsage:         len(allSteps),
		Checkpoints:      models.StringArray(input.Checkpoints),
		Passed:           models.StringArray{},
		CurrentStep:      0,
		TotalSteps:       len(allSteps),
		JourneyStatus:    models.JourneyActive,
	}

	if err := s.db.Create(qrToken).Error; err != nil {
		return nil, "", fmt.Errorf("gagal menyimpan token: %w", err)
	}

	nextPOS := ""
	if len(allSteps) > 0 {
		nextPOS = allSteps[0]
	}

	qrWrapper := fmt.Sprintf(`{"type":"agrinova_multi_pos","version":"2.0","jti":"%s","jwt":"%s","guest_name":"%s","vehicle_plate":"%s","progress":"0/%d","next_pos":"%s"}`,
		jti, tokenString, input.GuestName, input.VehiclePlate, len(allSteps), nextPOS)

	return qrToken, qrWrapper, nil
}

// ScanMultiPOSQR processes a QR scan at any checkpoint
func (s *GateCheckService) ScanMultiPOSQR(ctx context.Context, input *models.ScanMultiPOSQRInput) (*models.MultiPOSScanResult, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: "User tidak terautentikasi",
		}, nil
	}

	// Extract JTI from QR data (could be JWT or wrapper)
	jti := extractJTIFromQR(input.QRData)
	if jti == "" {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: "Format QR tidak valid",
		}, nil
	}

	// Find token in database
	var qrToken models.QRToken
	if err := s.db.Where("jti = ? AND company_id = ?", jti, user.CompanyID).First(&qrToken).Error; err != nil {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: "QR token tidak ditemukan",
		}, nil
	}

	// Check expiry
	if time.Now().After(qrToken.ExpiresAt) {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: "QR token sudah kadaluarsa",
		}, nil
	}

	// Check if already completed
	if qrToken.JourneyStatus == models.JourneyCompleted {
		return &models.MultiPOSScanResult{
			IsValid:    false,
			Message:    "Perjalanan sudah selesai",
			IsComplete: true,
		}, nil
	}

	// Check if POS is in journey
	if !qrToken.IsPOSInJourney(input.CurrentPOSID) {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: fmt.Sprintf("POS %s tidak ada dalam perjalanan", input.CurrentPOSID),
		}, nil
	}

	// Check if already scanned at this POS
	if qrToken.HasPassedPOS(input.CurrentPOSID) {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: fmt.Sprintf("Sudah di-scan di %s", input.CurrentPOSID),
		}, nil
	}

	// Check sequence
	allSteps := qrToken.GetAllSteps()
	expectedPOS := qrToken.GetNextExpectedPOS()
	if expectedPOS == nil || input.CurrentPOSID != *expectedPOS {
		expectedStr := "unknown"
		if expectedPOS != nil {
			expectedStr = *expectedPOS
		}
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: fmt.Sprintf("Urutan salah. Seharusnya: %s", expectedStr),
		}, nil
	}

	// Determine POS role
	posRole := qrToken.GetPOSRole(input.CurrentPOSID)

	// Log checkpoint
	checkpointLog := &models.CheckpointLog{
		ID:         uuid.New().String(),
		LocalID:    fmt.Sprintf("%s_%s_%d", jti, input.CurrentPOSID, time.Now().Unix()),
		JTI:        jti,
		POSID:      input.CurrentPOSID,
		POSRole:    posRole,
		StepNumber: qrToken.CurrentStep + 1,
		ScannedAt:  time.Now(),
		ScannedBy:  user.ID,
		DeviceID:   input.DeviceID,
		Latitude:   input.Latitude,
		Longitude:  input.Longitude,
		SyncStatus: "SYNCED",
		CompanyID:  user.CompanyID,
		CreatedAt:  time.Now(),
	}

	if err := s.db.Create(checkpointLog).Error; err != nil {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: fmt.Sprintf("Gagal menyimpan checkpoint: %v", err),
		}, nil
	}

	// Update token state
	qrToken.AdvanceStep(input.CurrentPOSID)
	isComplete := qrToken.IsJourneyComplete()

	if isComplete {
		qrToken.JourneyStatus = models.JourneyCompleted
		qrToken.Status = models.QRTokenUsed
	} else {
		qrToken.JourneyStatus = models.JourneyInProgress
	}

	if err := s.db.Save(&qrToken).Error; err != nil {
		return &models.MultiPOSScanResult{
			IsValid: false,
			Message: fmt.Sprintf("Gagal update token: %v", err),
		}, nil
	}

	// Build result
	stepNumber := int32(qrToken.CurrentStep)
	totalSteps := int32(qrToken.TotalSteps)
	currentPOS := input.CurrentPOSID

	result := &models.MultiPOSScanResult{
		IsValid:           true,
		Message:           fmt.Sprintf("Checkpoint %d/%d berhasil", qrToken.CurrentStep, qrToken.TotalSteps),
		GuestName:         getGuestNameFromToken(&qrToken),
		VehiclePlate:      getVehiclePlateFromToken(&qrToken),
		CurrentPOS:        &currentPOS,
		POSRole:           &posRole,
		StepNumber:        &stepNumber,
		TotalSteps:        &totalSteps,
		IsComplete:        isComplete,
		PassedCheckpoints: []string(qrToken.Passed),
	}

	if !isComplete && qrToken.CurrentStep < len(allSteps) {
		nextPOS := allSteps[qrToken.CurrentStep]
		result.NextPOS = &nextPOS

		// Generate updated QR
		updatedQR, _ := s.generateUpdatedQRWrapper(&qrToken)
		result.UpdatedQRData = &updatedQR
	}

	return result, nil
}

// SyncCheckpointLog syncs a checkpoint log from mobile device
func (s *GateCheckService) SyncCheckpointLog(ctx context.Context, input *models.SyncCheckpointLogRequest) (*models.CheckpointLog, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	// Check if already synced
	var existingLog models.CheckpointLog
	if err := s.db.Where("local_id = ? AND company_id = ?", input.LocalID, user.CompanyID).First(&existingLog).Error; err == nil {
		// Already exists, update synced_at
		now := time.Now()
		existingLog.SyncedAt = &now
		existingLog.SyncStatus = "SYNCED"
		s.db.Save(&existingLog)
		return &existingLog, nil
	}

	// Create new checkpoint log
	now := time.Now()
	checkpointLog := &models.CheckpointLog{
		ID:         uuid.New().String(),
		LocalID:    input.LocalID,
		JTI:        input.JTI,
		POSID:      input.POSID,
		POSRole:    input.POSRole,
		StepNumber: input.StepNumber,
		ScannedAt:  input.ScannedAt,
		ScannedBy:  input.ScannedBy,
		DeviceID:   input.DeviceID,
		Latitude:   input.Latitude,
		Longitude:  input.Longitude,
		SyncStatus: "SYNCED",
		SyncedAt:   &now,
		CompanyID:  user.CompanyID,
		CreatedAt:  now,
	}

	if err := s.db.Create(checkpointLog).Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan checkpoint log: %w", err)
	}

	// Update QR token state if exists
	var qrToken models.QRToken
	if err := s.db.Where("jti = ?", input.JTI).First(&qrToken).Error; err == nil {
		// Update passed checkpoints
		if !qrToken.HasPassedPOS(input.POSID) {
			qrToken.AdvanceStep(input.POSID)
			if qrToken.IsJourneyComplete() {
				qrToken.JourneyStatus = models.JourneyCompleted
				qrToken.Status = models.QRTokenUsed
			} else {
				qrToken.JourneyStatus = models.JourneyInProgress
			}
			s.db.Save(&qrToken)
		}
	}

	return checkpointLog, nil
}

// SyncCheckpointLogs syncs multiple checkpoint logs from mobile device
func (s *GateCheckService) SyncCheckpointLogs(ctx context.Context, inputs []*models.SyncCheckpointLogRequest) ([]*models.CheckpointLog, error) {
	results := make([]*models.CheckpointLog, 0, len(inputs))
	for _, input := range inputs {
		log, err := s.SyncCheckpointLog(ctx, input)
		if err != nil {
			continue // Skip failed syncs
		}
		results = append(results, log)
	}
	return results, nil
}

// GetJourneyStatus returns the status of a journey by JTI
func (s *GateCheckService) GetJourneyStatus(ctx context.Context, jti string) (*models.JourneyStatusResponse, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	// Find token
	var qrToken models.QRToken
	if err := s.db.Where("jti = ? AND company_id = ?", jti, user.CompanyID).First(&qrToken).Error; err != nil {
		return nil, errors.New("journey tidak ditemukan")
	}
	// Get checkpoint logs
	var checkpointLogs []models.CheckpointLog
	s.db.Where("jti = ?", jti).Order("step_number ASC").Find(&checkpointLogs)

	// Build response
	response := &models.JourneyStatusResponse{
		JTI:               qrToken.JTI,
		GuestName:         getStringFromToken(&qrToken, "guest_name"),
		VehiclePlate:      getStringFromToken(&qrToken, "vehicle_plate"),
		Checkpoints:       []string(qrToken.Checkpoints),
		PassedCheckpoints: make([]models.CheckpointDetail, len(checkpointLogs)),
		JourneyStatus:     qrToken.JourneyStatus,
		CurrentStep:       int(qrToken.CurrentStep),
		TotalSteps:        int(qrToken.TotalSteps),
		Passed:            []string(qrToken.Passed),
	}

	for i, log := range checkpointLogs {
		response.PassedCheckpoints[i] = models.CheckpointDetail{
			POSID:      log.POSID,
			POSRole:    log.POSRole,
			StepNumber: log.StepNumber,
			ScannedAt:  log.ScannedAt,
			DeviceID:   log.DeviceID,
		}
	}

	// Calculate start and completion times
	if len(checkpointLogs) > 0 {
		startedAt := checkpointLogs[0].ScannedAt
		response.StartedAt = &startedAt
		if qrToken.JourneyStatus == models.JourneyCompleted {
			lastLog := checkpointLogs[len(checkpointLogs)-1]
			completedAt := lastLog.ScannedAt
			response.CompletedAt = &completedAt
			duration := int(lastLog.ScannedAt.Sub(checkpointLogs[0].ScannedAt).Minutes())
			response.Duration = &duration
		}
	}

	return response, nil
}

// GetActiveJourneys returns all active journeys for a company
func (s *GateCheckService) GetActiveJourneys(ctx context.Context, status *models.JourneyStatus, limit *int32) ([]*models.JourneyStatusResponse, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	query := s.db.Where("company_id = ?", user.CompanyID)

	// Filter by status if provided
	if status != nil {
		query = query.Where("journey_status = ?", *status)
	} else {
		// Default to active and in-progress journeys
		query = query.Where("journey_status IN ?", []string{
			string(models.JourneyActive),
			string(models.JourneyInProgress),
		})
	}

	// Apply limit
	queryLimit := 50
	if limit != nil && *limit > 0 {
		queryLimit = int(*limit)
	}
	query = query.Limit(queryLimit)

	var tokens []models.QRToken
	if err := query.Order("created_at DESC").Find(&tokens).Error; err != nil {
		return nil, err
	}

	results := make([]*models.JourneyStatusResponse, len(tokens))
	for i, token := range tokens {
		results[i] = &models.JourneyStatusResponse{
			JTI:           token.JTI,
			GuestName:     getStringFromToken(&token, "guest_name"),
			VehiclePlate:  getStringFromToken(&token, "vehicle_plate"),
			Checkpoints:   []string(token.Checkpoints),
			JourneyStatus: token.JourneyStatus,
			CurrentStep:   int(token.CurrentStep),
			TotalSteps:    int(token.TotalSteps),
			Passed:        []string(token.Passed),
		}
	}

	return results, nil
}

// GetCheckpointLogs returns checkpoint logs for a journey
func (s *GateCheckService) GetCheckpointLogs(ctx context.Context, jti string) ([]*models.CheckpointLog, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	var logs []models.CheckpointLog
	if err := s.db.Where("jti = ? AND company_id = ?", jti, user.CompanyID).Order("step_number ASC").Find(&logs).Error; err != nil {
		return nil, err
	}

	result := make([]*models.CheckpointLog, len(logs))
	for i := range logs {
		result[i] = &logs[i]
	}
	return result, nil
}

// GetPOSCheckpointHistory returns checkpoint history for a specific POS
func (s *GateCheckService) GetPOSCheckpointHistory(ctx context.Context, posID string, dateFrom, dateTo *time.Time, limit *int32) ([]*models.CheckpointLog, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	query := s.db.Where("pos_id = ? AND company_id = ?", posID, user.CompanyID)

	// Apply date filters if provided
	if dateFrom != nil {
		query = query.Where("scanned_at >= ?", *dateFrom)
	}
	if dateTo != nil {
		query = query.Where("scanned_at <= ?", *dateTo)
	}

	queryLimit := 100
	if limit != nil && *limit > 0 {
		queryLimit = int(*limit)
	}
	query = query.Limit(queryLimit)

	var logs []models.CheckpointLog
	if err := query.Order("scanned_at DESC").Find(&logs).Error; err != nil {
		return nil, err
	}

	result := make([]*models.CheckpointLog, len(logs))
	for i := range logs {
		result[i] = &logs[i]
	}
	return result, nil
}

// CancelJourney cancels an active journey
func (s *GateCheckService) CancelJourney(ctx context.Context, jti string, reason *string) (*models.JourneyStatusResponse, error) {
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, errors.New("user tidak terautentikasi")
	}

	var qrToken models.QRToken
	if err := s.db.Where("jti = ? AND company_id = ?", jti, user.CompanyID).First(&qrToken).Error; err != nil {
		return nil, errors.New("journey tidak ditemukan")
	}

	if qrToken.JourneyStatus == models.JourneyCompleted {
		return nil, errors.New("tidak bisa membatalkan journey yang sudah selesai")
	}

	qrToken.JourneyStatus = models.JourneyCancelled
	qrToken.Status = models.QRTokenCancelled

	if err := s.db.Save(&qrToken).Error; err != nil {
		return nil, fmt.Errorf("gagal membatalkan journey: %w", err)
	}

	return &models.JourneyStatusResponse{
		JTI:           qrToken.JTI,
		GuestName:     getStringFromToken(&qrToken, "guest_name"),
		VehiclePlate:  getStringFromToken(&qrToken, "vehicle_plate"),
		Checkpoints:   []string(qrToken.Checkpoints),
		JourneyStatus: qrToken.JourneyStatus,
		CurrentStep:   int(qrToken.CurrentStep),
		TotalSteps:    int(qrToken.TotalSteps),
		Passed:        []string(qrToken.Passed),
	}, nil
}

// GetQRTokenByJTI retrieves a QR token by its JTI identifier
func (s *GateCheckService) GetQRTokenByJTI(ctx context.Context, jti string) (*models.QRToken, error) {
	var token models.QRToken
	if err := s.db.Where("jti = ?", jti).First(&token).Error; err != nil {
		return nil, err
	}
	return &token, nil
}

// Helper functions for multi-POS

func extractJTIFromQR(qrData string) string {
	// Try to parse as JWT first
	if token, _, err := jwt.NewParser().ParseUnverified(qrData, jwt.MapClaims{}); err == nil {
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if jti, ok := claims["jti"].(string); ok {
				return jti
			}
		}
	}
	// If not a JWT, assume it's the JTI itself or try to extract from wrapper
	// Simple check - if it looks like a hex string, it might be the JTI
	if len(qrData) == 32 {
		return qrData
	}
	return ""
}

func getGuestNameFromToken(token *models.QRToken) *string {
	// Parse the JWT to get guest name
	if parsedToken, _, err := jwt.NewParser().ParseUnverified(token.JWTToken, jwt.MapClaims{}); err == nil {
		if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
			if name, ok := claims["guest_name"].(string); ok {
				return &name
			}
		}
	}
	return nil
}

func getVehiclePlateFromToken(token *models.QRToken) *string {
	if parsedToken, _, err := jwt.NewParser().ParseUnverified(token.JWTToken, jwt.MapClaims{}); err == nil {
		if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
			if plate, ok := claims["vehicle_plate"].(string); ok {
				return &plate
			}
		}
	}
	return nil
}

func getStringFromToken(token *models.QRToken, key string) string {
	if parsedToken, _, err := jwt.NewParser().ParseUnverified(token.JWTToken, jwt.MapClaims{}); err == nil {
		if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
			if val, ok := claims[key].(string); ok {
				return val
			}
		}
	}
	return ""
}

func getStringPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (s *GateCheckService) generateUpdatedQRWrapper(token *models.QRToken) (string, error) {
	allSteps := token.GetAllSteps()
	nextPOS := ""
	if token.CurrentStep < len(allSteps) {
		nextPOS = allSteps[token.CurrentStep]
	}

	return fmt.Sprintf(`{"type":"agrinova_multi_pos","version":"2.0","jti":"%s","jwt":"%s","guest_name":"%s","vehicle_plate":"%s","progress":"%d/%d","next_pos":"%s"}`,
		token.JTI, token.JWTToken, getStringFromToken(token, "guest_name"), getStringFromToken(token, "vehicle_plate"),
		token.CurrentStep, token.TotalSteps, nextPOS), nil
}

// Ensure unused imports are used
var _ = models.SyncCompleted

// SyncEmployeeLog syncs employee access logs from mobile
func (s *GateCheckService) SyncEmployeeLog(ctx context.Context, input generated.EmployeeLogSyncInput) (*generated.EmployeeLogSyncResult, error) {
	// Parse timestamp
	scanTime := time.Now()
	if input.Record.ScannedAt != nil {
		if t, err := time.Parse(time.RFC3339, *input.Record.ScannedAt); err == nil {
			scanTime = t
		}
	}

	recordId := uuid.New().String()

	log := &EmployeeLog{
		ID:           recordId,
		LocalID:      input.Record.LocalID,
		CompanyID:    getStringPtr(input.Record.CompanyID),
		NIK:          getStringPtr(input.Record.Nik),
		Nama:         getStringPtr(input.Record.Nama),
		Department:   getStringPtr(input.Record.Departement),
		Action:       input.Record.Action,
		GatePosition: input.Record.GatePosition,
		ScannedAt:    &scanTime,
		ScannedByID:  getStringPtr(input.Record.ScannedByID),
		DeviceID:     getStringPtr(input.Record.DeviceID),
		Notes:        getStringPtr(input.Record.Notes),
		QRCodeData:   getStringPtr(input.Record.Iddata),
	}

	// Check for duplicates based on LocalID
	var existing EmployeeLog
	if err := s.db.Where("local_id = ?", log.LocalID).First(&existing).Error; err == nil {
		// Update existing
		log.ID = existing.ID
		log.CreatedAt = existing.CreatedAt
		if err := s.db.Save(log).Error; err != nil {
			return &generated.EmployeeLogSyncResult{
				Success: false,
				Message: fmt.Sprintf("Failed to update: %v", err),
			}, nil
		}
	} else {
		// Create new
		if err := s.db.Create(log).Error; err != nil {
			return &generated.EmployeeLogSyncResult{
				Success: false,
				Message: fmt.Sprintf("Failed to create: %v", err),
			}, nil
		}
	}

	return &generated.EmployeeLogSyncResult{
		Success:         true,
		Message:         "Synced successfully",
		EmployeeLogID:   &log.ID,
		ServerTimestamp: time.Now(),
	}, nil
}

// SyncSatpamPhotos syncs photos from mobile
// SyncSatpamPhotos syncs photos from mobile
func (s *GateCheckService) SyncSatpamPhotos(ctx context.Context, input generated.SatpamPhotoSyncInput) (*generated.SatpamPhotoSyncResult, error) {
	fmt.Printf("SyncSatpamPhotos: Received %d photos\n", len(input.Photos))

	// Get User Context
	user, err := getUserContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %v", err)
	}

	uploadDir := s.satpamPhotoUploadDir()
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %v", err)
	}

	successful := 0
	failed := 0
	totalBytes := 0
	var errorsList []*common.PhotoUploadError

	for _, photo := range input.Photos {
		// Decode base64
		data, err := base64.StdEncoding.DecodeString(photo.PhotoData)
		if err != nil {
			msg := fmt.Sprintf("Failed to decode base64: %v", err)
			code := "DECODE_ERROR"
			errorsList = append(errorsList, &common.PhotoUploadError{
				PhotoID: photo.PhotoID,
				Error:   msg,
				Code:    &code,
			})
			failed++
			continue
		}

		// Generate file name
		ext := ".jpg" // Default to jpg
		filename := fmt.Sprintf("%s_%d%s", photo.PhotoID, photo.TakenAt.Unix(), ext)
		filepath := filepath.Join(uploadDir, filename)

		// Save to file
		if err := os.WriteFile(filepath, data, 0644); err != nil {
			msg := fmt.Sprintf("Failed to save file: %v", err)
			code := "SAVE_ERROR"
			errorsList = append(errorsList, &common.PhotoUploadError{
				PhotoID: photo.PhotoID,
				Error:   msg,
				Code:    &code,
			})
			failed++
			continue
		}

		successful++
		totalBytes += len(data)
		relativePath := satpamPhotoURLPath(filename)

		// 1. Look up GuestLog FIRST to get the correct Server ID for linking
		var guestLog models.GuestLog
		var relatedID string
		var found bool

		// If GuestLogID is provided, try to find it
		if photo.GuestLogID != "" {
			// Try finding by LocalID first (common in sync) or ID
			if err := s.db.Where("local_id = ? OR id = ?", photo.GuestLogID, photo.GuestLogID).First(&guestLog).Error; err == nil {
				found = true
				relatedID = guestLog.ID
				// Link photo to GuestLog
				fmt.Printf("SyncSatpamPhotos: Found GuestLog %s (LocalID: %v) for photo\n", guestLog.ID, guestLog.LocalID)
			} else {
				fmt.Printf("SyncSatpamPhotos: GuestLog not found for ID: %s. Error: %v\n", photo.GuestLogID, err)
				// Use the provided ID as fallback, even if it might fail FK check
				relatedID = photo.GuestLogID
			}
		}

		// 2. Insert into gate_check_photos table (Populate ALL fields)
		photoRecord := models.GateCheckPhoto{
			// ID: Generated by DB (default: uuid)
			PhotoID:            photo.PhotoID,
			RelatedRecordType:  models.RecordTypeGuestLog,
			RelatedRecordID:    relatedID, // Server ID (if found) or Mobile ID (if not)
			FilePath:           relativePath,
			FileName:           filename,
			FileSize:           int64(len(data)),
			FileExtension:      ext,
			MimeType:           "image/jpeg",
			PhotoType:          models.PhotoType(photo.PhotoType),
			PhotoQuality:       models.PhotoQualityMedium,
			CompressionApplied: false,
			TakenAt:            photo.TakenAt,
			LocalPath:          photo.LocalPath,
			FileHash:           photo.FileHash,
			SyncStatus:         "SYNCED",
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
			DeviceID:           input.DeviceID,
			CreatedUserID:      user.ID,
			CloudPath:          &relativePath,
		}

		if err := s.db.Create(&photoRecord).Error; err != nil {
			fmt.Printf("SyncSatpamPhotos: Failed to insert gate_check_photos record: %v\n", err)
			// Don't fail the whole sync, but log it
		}

		// Add error if orphan (for mobile feedback)
		if photo.GuestLogID != "" && !found {
			msg := fmt.Sprintf("Photo uploaded but GuestLog %s not found", photo.GuestLogID)
			code := "ORPHAN_PHOTO"
			errorsList = append(errorsList, &common.PhotoUploadError{
				PhotoID: photo.PhotoID,
				Error:   msg,
				Code:    &code,
			})
		}
	}

	return &generated.SatpamPhotoSyncResult{
		PhotosProcessed:    int32(len(input.Photos)),
		SuccessfulUploads:  int32(successful),
		FailedUploads:      int32(failed),
		TotalBytesUploaded: int32(totalBytes),
		Errors:             errorsList,
		SyncedAt:           time.Now(),
	}, nil
}

// sanitizeEntryTime ensures entry time is not significantly in the future relative to creation time.
// This handles cases where sync might have incorrectly updated EntryTime to "Now".
func sanitizeEntryTime(entryTime time.Time, createdAt time.Time) time.Time {
	// If entryTime is more than 5 minutes after createdAt, it's suspicious
	// (Entry should happen before or at Creation/Sync)
	// Buffer of 5 mins for clock skew
	if entryTime.After(createdAt.Add(5 * time.Minute)) {
		return createdAt
	}
	return entryTime
}
