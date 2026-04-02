package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	panenModels "agrinovagraphql/server/internal/panen/models"
	panenResolvers "agrinovagraphql/server/internal/panen/resolvers"
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (r *mutationResolver) saveHarvestPhotoFromPayload(localID string, photoValue string) (string, error) {
	trimmed := strings.TrimSpace(photoValue)
	if trimmed == "" {
		return "", nil
	}

	if !strings.HasPrefix(strings.ToLower(trimmed), "data:image/") {
		return trimmed, nil
	}

	parts := strings.SplitN(trimmed, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid photo data URI")
	}

	header := strings.ToLower(strings.TrimSpace(parts[0]))
	if !strings.Contains(header, ";base64") {
		return "", fmt.Errorf("photo payload must be base64 data URI")
	}

	mimeType := "image/jpeg"
	if strings.HasPrefix(header, "data:") {
		rawMime := strings.TrimPrefix(header, "data:")
		rawMime = strings.SplitN(rawMime, ";", 2)[0]
		if rawMime != "" {
			mimeType = rawMime
		}
	}

	photoBytes, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		photoBytes, err = base64.RawStdEncoding.DecodeString(parts[1])
		if err != nil {
			return "", fmt.Errorf("invalid base64 photo data: %w", err)
		}
	}

	uploadDir := r.uploadAbsolutePath("harvest_photos")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload dir: %w", err)
	}

	ext := fileExtensionFromMimeType(mimeType)
	filePrefix := sanitizeFileComponent(localID)
	if filePrefix == "" {
		filePrefix = "harvest"
	}

	filename := fmt.Sprintf("%s_%d%s", filePrefix, time.Now().UnixNano(), ext)
	absolutePath := filepath.Join(uploadDir, filename)
	if err := os.WriteFile(absolutePath, photoBytes, 0644); err != nil {
		return "", fmt.Errorf("failed to save photo file: %w", err)
	}

	return uploadURLPath("harvest_photos", filename), nil
}

// updateHarvestRecordFromSync updates an existing harvest record from sync input
func (r *mutationResolver) updateHarvestRecordFromSync(
	ctx context.Context,
	panenResolver *panenResolvers.PanenResolver,
	serverID string,
	input *mandor.HarvestRecordSyncInput,
	deviceID string,
	karyawanID *string,
	nik *string,
	employeeDivisionID *string,
	employeeDivisionName *string,
	resetStatusToPending bool,
) (*mandor.HarvestRecord, error) {
	var karyawanPtr *string
	if nik != nil {
		karyawanPtr = nik
	}

	// Build update input
	updateInput := mandor.UpdateHarvestRecordInput{
		ID:                   serverID,
		DeviceID:             stringPointerIfNotEmpty(deviceID),
		KaryawanID:           karyawanID,
		EmployeeDivisionID:   employeeDivisionID,
		EmployeeDivisionName: employeeDivisionName,
		Karyawan:             karyawanPtr,
		JumlahJanjang:        &input.JumlahJanjang,
		BeratTbs:             &input.BeratTbs,
	}
	if input.JjgMatang != nil {
		updateInput.JjgMatang = input.JjgMatang
	}
	if input.JjgMentah != nil {
		updateInput.JjgMentah = input.JjgMentah
	}
	if input.JjgLewatMatang != nil {
		updateInput.JjgLewatMatang = input.JjgLewatMatang
	}
	if input.JjgBusukAbnormal != nil {
		updateInput.JjgBusukAbnormal = input.JjgBusukAbnormal
	}
	if input.JjgTangkaiPanjang != nil {
		updateInput.JjgTangkaiPanjang = input.JjgTangkaiPanjang
	}
	if input.TotalBrondolan != nil {
		updateInput.TotalBrondolan = input.TotalBrondolan
	}

	// Call the update service
	updated, err := panenResolver.UpdateHarvestRecordForSync(ctx, updateInput)
	if err != nil {
		return nil, fmt.Errorf("failed to update harvest record: %w", err)
	}

	updatedModel := (*panenModels.HarvestRecord)(updated)
	needsSave := false
	if input.PhotoURL != nil {
		photoValue := strings.TrimSpace(*input.PhotoURL)
		if photoValue == "" {
			updatedModel.PhotoURL = nil
			needsSave = true
		} else {
			resolvedPhotoURL, photoErr := r.saveHarvestPhotoFromPayload(input.LocalID, photoValue)
			if photoErr != nil {
				return nil, fmt.Errorf("failed to process harvest photo: %w", photoErr)
			}
			updatedModel.PhotoURL = &resolvedPhotoURL
			needsSave = true
		}
	}

	// Correction flow: when mandor edits rejected data and resubmits,
	// move status back to PENDING so it re-enters asisten approval queue.
	if resetStatusToPending {
		pending := panenModels.HarvestPending
		updatedModel.Status = pending
		updatedModel.RejectedReason = nil
		updatedModel.ApprovedAt = nil
		updatedModel.ApprovedBy = nil
		needsSave = true
	}

	if needsSave {
		if err := panenResolver.SaveHarvestRecord(ctx, updatedModel); err != nil {
			return nil, fmt.Errorf("failed to persist sync-only harvest updates: %w", err)
		}
	}

	return (*mandor.HarvestRecord)(updatedModel), nil
}

// checkAndResolveConflict detects conflicts between existing server record and incoming client data
// Returns (isConflict, error)
// Strategy: Server-authoritative - if server record was updated after client's lastUpdated, server wins
func (r *mutationResolver) checkAndResolveConflict(
	ctx context.Context,
	existing *panenModels.HarvestRecord,
	input *mandor.HarvestRecordSyncInput,
	deviceID string,
	karyawanID *string,
	nik *string,
) (bool, error) {
	// If no lastUpdated from client, no conflict detection possible - allow sync
	if input.LastUpdated == nil {
		return false, nil
	}

	clientLastUpdated := *input.LastUpdated
	serverUpdatedAt := existing.UpdatedAt

	// If server record was updated after client's lastUpdated, there's a conflict
	if serverUpdatedAt.After(clientLastUpdated) {
		// Server-authoritative: Server version wins
		// Log the conflict for audit purposes
		fmt.Printf("⚠️ [Conflict Detected] LocalID=%s, ClientUpdated=%v, ServerUpdated=%v - Server wins\n",
			input.LocalID, clientLastUpdated, serverUpdatedAt)

		// Don't update - return existing record as-is (server wins)
		// The client will receive the server version in the sync response
		return true, nil
	}

	// No conflict - caller will perform exactly one update write path.
	_ = ctx
	_ = existing
	_ = input
	_ = deviceID
	_ = karyawanID
	_ = nik
	return false, nil
}

func (r *mutationResolver) resolveHarvestNikFromSyncInput(
	input *mandor.HarvestRecordSyncInput,
	nik *string,
) *string {
	if nik != nil {
		return nik
	}
	if input == nil {
		return nil
	}
	return normalizeSyncNik(input.Nik)
}
