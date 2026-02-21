package services

import (
	"context"
	"log"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/asisten"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	notifServices "agrinovagraphql/server/internal/notifications/services"
	"agrinovagraphql/server/internal/panen/models"
)

// FCMPanenService wraps PanenService with FCM notification capabilities
type FCMPanenService struct {
	*PanenService
	fcmNotificationService *notifServices.FCMNotificationService
	db                     *gorm.DB
}

// NewFCMPanenService creates a new FCM-enabled panen service
func NewFCMPanenService(
	panenService *PanenService,
	fcmNotificationService *notifServices.FCMNotificationService,
	db *gorm.DB,
) *FCMPanenService {
	return &FCMPanenService{
		PanenService:           panenService,
		fcmNotificationService: fcmNotificationService,
		db:                     db,
	}
}

// CreateHarvestRecord creates a harvest record and notifies Asisten via FCM
func (s *FCMPanenService) CreateHarvestRecord(ctx context.Context, input mandor.CreateHarvestRecordInput) (*models.HarvestRecord, error) {
	// Create the harvest record using base service
	record, err := s.PanenService.CreateHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Get mandor and block info for notification
	mandorName, blockName := s.getMandorAndBlockInfo(ctx, record.MandorID, record.BlockID)

	// Send FCM notification to Asisten (async to not block response)
	if s.fcmNotificationService != nil {
		go func() {
			notifErr := s.fcmNotificationService.NotifyAsistenNewHarvest(
				context.Background(),
				record.ID,
				record.MandorID,
				mandorName,
				blockName,
				record.JumlahJanjang,
			)
			if notifErr != nil {
				log.Printf("Failed to send FCM notification for new harvest %s: %v", record.ID, notifErr)
			}
		}()
	}

	return record, nil
}

// ApproveHarvestRecord approves a harvest record and notifies Mandor via FCM
func (s *FCMPanenService) ApproveHarvestRecord(ctx context.Context, input asisten.ApproveHarvestInput) (*models.HarvestRecord, error) {
	// Get record info before approval (for notification)
	existingRecord, err := s.PanenService.GetHarvestRecord(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	// Approve the harvest record using base service
	record, err := s.PanenService.ApproveHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Get asisten and block info for notification
	asistenName := s.getUserName(ctx, input.ApprovedBy)
	_, blockName := s.getMandorAndBlockInfo(ctx, "", existingRecord.BlockID)

	// Send FCM notification to Mandor (async)
	if s.fcmNotificationService != nil {
		harvestDate := existingRecord.Tanggal.Format("02/01/2006")
		bunchCount := existingRecord.JumlahJanjang
		go func() {
			notifErr := s.fcmNotificationService.NotifyMandorApproved(
				context.Background(),
				record.ID,
				existingRecord.MandorID,
				asistenName,
				blockName,
				harvestDate,
				bunchCount,
			)
			if notifErr != nil {
				log.Printf("Failed to send FCM notification for approved harvest %s: %v", record.ID, notifErr)
			}
		}()
	}

	return record, nil
}

// RejectHarvestRecord rejects a harvest record and notifies Mandor via FCM
func (s *FCMPanenService) RejectHarvestRecord(ctx context.Context, input asisten.RejectHarvestInput) (*models.HarvestRecord, error) {
	// Get record info before rejection (for notification)
	existingRecord, err := s.PanenService.GetHarvestRecord(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	// Reject the harvest record using base service
	record, err := s.PanenService.RejectHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Get rejector info (from context or lookup)
	asistenName := s.getRejectorName(ctx)
	_, blockName := s.getMandorAndBlockInfo(ctx, "", existingRecord.BlockID)

	// Send FCM notification to Mandor (async)
	if s.fcmNotificationService != nil {
		harvestDate := existingRecord.Tanggal.Format("02/01/2006")
		bunchCount := existingRecord.JumlahJanjang
		go func() {
			notifErr := s.fcmNotificationService.NotifyMandorRejected(
				context.Background(),
				record.ID,
				existingRecord.MandorID,
				asistenName,
				blockName,
				input.RejectedReason,
				harvestDate,
				bunchCount,
			)
			if notifErr != nil {
				log.Printf("Failed to send FCM notification for rejected harvest %s: %v", record.ID, notifErr)
			}
		}()
	}

	return record, nil
}

// getMandorAndBlockInfo retrieves mandor name and block name for notification
func (s *FCMPanenService) getMandorAndBlockInfo(ctx context.Context, mandorID, blockID string) (mandorName, blockName string) {
	mandorName = "Mandor"
	blockName = "Block"

	if mandorID != "" {
		var user struct {
			Name string
		}
		if err := s.db.WithContext(ctx).Table("users").Select("name").Where("id = ?", mandorID).First(&user).Error; err == nil {
			mandorName = user.Name
		}
	}

	if blockID != "" {
		var block struct {
			Name string
		}
		if err := s.db.WithContext(ctx).Table("blocks").Select("name").Where("id = ?", blockID).First(&block).Error; err == nil {
			blockName = block.Name
		}
	}

	return
}

// getUserName retrieves user name by ID
func (s *FCMPanenService) getUserName(ctx context.Context, userID string) string {
	var user struct {
		Name string
	}
	if err := s.db.WithContext(ctx).Table("users").Select("name").Where("id = ?", userID).First(&user).Error; err == nil {
		return user.Name
	}
	return "User"
}

// getRejectorName gets the current user's name from context
func (s *FCMPanenService) getRejectorName(ctx context.Context) string {
	// Try to get user from context
	// This depends on your middleware implementation
	// For now, return a default
	return "Asisten"
}
