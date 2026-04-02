package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	panenModels "agrinovagraphql/server/internal/panen/models"
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

func isNilValue(value interface{}) bool {
	if value == nil {
		return true
	}

	switch reflect.ValueOf(value).Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return reflect.ValueOf(value).IsNil()
	default:
		return false
	}
}

func stringPointerIfNotEmpty(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeSyncKaryawanID(karyawanID string) *string {
	trimmed := strings.TrimSpace(karyawanID)
	if !isUuidString(trimmed) {
		return nil
	}
	return &trimmed
}

func normalizeSyncNik(nik string) *string {
	trimmed := strings.TrimSpace(nik)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeSyncOptionalUUID(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if !isUuidString(trimmed) {
		return nil
	}
	return &trimmed
}

func normalizeSyncOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func harvestWorkerLabel(karyawan string, nik *string, karyawanID *string) string {
	trimmedKaryawan := strings.TrimSpace(karyawan)
	if trimmedKaryawan != "" {
		return trimmedKaryawan
	}
	if nik != nil {
		trimmedNik := strings.TrimSpace(*nik)
		if trimmedNik != "" {
			return trimmedNik
		}
	}
	if karyawanID != nil {
		trimmedKaryawanID := strings.TrimSpace(*karyawanID)
		if trimmedKaryawanID != "" {
			return trimmedKaryawanID
		}
	}

	return ""
}

func isUuidString(value string) bool {
	_, err := uuid.Parse(strings.TrimSpace(value))
	return err == nil
}

var nonFileSafeChars = regexp.MustCompile(`[^a-zA-Z0-9_-]`)

func sanitizeFileComponent(value string) string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return ""
	}
	return nonFileSafeChars.ReplaceAllString(normalized, "_")
}

func fileExtensionFromMimeType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/heic":
		return ".heic"
	case "image/heif":
		return ".heif"
	default:
		return ".jpg"
	}
}

// convertToMandorHarvestRecord converts a HarvestRecord to MandorHarvestRecord
func convertToMandorHarvestRecord(record *mandor.HarvestRecord) *mandor.MandorHarvestRecord {
	if record == nil {
		return nil
	}

	mandorName := ""
	if record.Mandor != nil {
		mandorName = record.Mandor.Name
	}

	blockName := ""
	divisionID := ""
	divisionName := ""
	estateID := ""
	estateName := ""

	if record.Block != nil {
		blockName = record.Block.Name
		if record.Block.Division != nil {
			divisionID = record.Block.Division.ID
			divisionName = record.Block.Division.Name
			if record.Block.Division.Estate != nil {
				estateID = record.Block.Division.Estate.ID
				estateName = record.Block.Division.Estate.Name
			}
		}
	}

	// Get approver name if available
	var approvedByName *string
	if record.ApprovedBy != nil && *record.ApprovedBy != "" {
		approvedByName = record.ApprovedBy
	}

	var coordinates *common.Coordinates
	if record.Latitude != nil && record.Longitude != nil {
		coordinates = &common.Coordinates{
			Latitude:  *record.Latitude,
			Longitude: *record.Longitude,
		}
	}

	var photos []*mandor.HarvestPhoto
	if record.PhotoURL != nil && strings.TrimSpace(*record.PhotoURL) != "" {
		serverURL := strings.TrimSpace(*record.PhotoURL)
		photos = []*mandor.HarvestPhoto{
			{
				ID:         fmt.Sprintf("%s-photo", record.ID),
				ServerURL:  &serverURL,
				SyncStatus: common.SyncStatusSynced,
				TakenAt:    record.CreatedAt,
			},
		}
	}

	return &mandor.MandorHarvestRecord{
		ID:                record.ID,
		LocalID:           record.LocalID,
		Tanggal:           record.Tanggal,
		MandorID:          record.MandorID,
		MandorName:        mandorName,
		CompanyID:         record.CompanyID,
		AsistenID:         record.AsistenID,
		BlockID:           record.BlockID,
		BlockName:         blockName,
		DivisionID:        divisionID,
		DivisionName:      divisionName,
		EstateID:          estateID,
		EstateName:        estateName,
		Karyawan:          harvestWorkerLabel(record.Karyawan, record.Nik, record.KaryawanID),
		JumlahJanjang:     record.JumlahJanjang,
		JjgMatang:         record.JjgMatang,
		JjgMentah:         record.JjgMentah,
		JjgLewatMatang:    record.JjgLewatMatang,
		JjgBusukAbnormal:  record.JjgBusukAbnormal,
		JjgTangkaiPanjang: record.JjgTangkaiPanjang,
		TotalBrondolan:    record.TotalBrondolan,
		BeratTbs:          record.BeratTbs,
		Status:            record.Status,
		ApprovedBy:        record.ApprovedBy,
		ApprovedByName:    approvedByName,
		ApprovedAt:        record.ApprovedAt,
		RejectedReason:    record.RejectedReason,
		Notes:             record.Notes,
		Coordinates:       coordinates,
		Photos:            photos,
		CreatedAt:         record.CreatedAt,
		UpdatedAt:         record.UpdatedAt,
		SyncStatus:        common.SyncStatusSynced,
		ServerVersion:     1, // Default version
	}
}

func appendUniqueHarvestScopeID(target []string, seen map[string]struct{}, raw string) []string {
	id := strings.TrimSpace(raw)
	if id == "" {
		return target
	}
	if _, exists := seen[id]; exists {
		return target
	}
	seen[id] = struct{}{}
	return append(target, id)
}

func harvestScopeContains(scope []string, value string) bool {
	target := strings.TrimSpace(value)
	if target == "" {
		return false
	}
	for _, scopeID := range scope {
		if strings.EqualFold(strings.TrimSpace(scopeID), target) {
			return true
		}
	}
	return false
}

func isHarvestRecordInScopedAssignments(record *panenModels.HarvestRecord, filters *panenModels.HarvestFilters) bool {
	if record == nil || filters == nil {
		return false
	}

	if len(filters.CompanyIDs) > 0 {
		if record.CompanyID == nil || !harvestScopeContains(filters.CompanyIDs, *record.CompanyID) {
			return false
		}
	}
	if len(filters.EstateIDs) > 0 {
		if record.EstateID == nil || !harvestScopeContains(filters.EstateIDs, *record.EstateID) {
			return false
		}
	}
	if len(filters.DivisionIDs) > 0 {
		if record.DivisionID == nil || !harvestScopeContains(filters.DivisionIDs, *record.DivisionID) {
			return false
		}
	}
	if len(filters.MandorIDs) > 0 {
		if strings.TrimSpace(record.MandorID) == "" || !harvestScopeContains(filters.MandorIDs, record.MandorID) {
			return false
		}
	}

	return true
}
