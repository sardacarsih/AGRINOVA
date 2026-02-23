package services

import (
	"context"
	"fmt"
	"log"

	"agrinovagraphql/server/internal/auth/services"
	authDomain "agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/pkg/fcm"
)

// FCMNotificationService handles FCM push notifications for harvest workflow
type FCMNotificationService struct {
	fcmProvider      *fcm.FCMProvider
	hierarchyService *services.HierarchyService
	payloadBuilder   *fcm.PayloadBuilder
}

// NewFCMNotificationService creates a new FCM notification service
func NewFCMNotificationService(
	fcmProvider *fcm.FCMProvider,
	hierarchyService *services.HierarchyService,
) *FCMNotificationService {
	return &FCMNotificationService{
		fcmProvider:      fcmProvider,
		hierarchyService: hierarchyService,
		payloadBuilder:   fcm.NewPayloadBuilder(),
	}
}

// NotifyAsistenNewHarvest sends FCM to Asisten when Mandor creates/syncs harvest
func (s *FCMNotificationService) NotifyAsistenNewHarvest(
	ctx context.Context,
	harvestID string,
	mandorID string,
	mandorName string,
	blockName string,
	bunchCount int32,
) error {
	if s == nil || s.hierarchyService == nil || s.payloadBuilder == nil || s.fcmProvider == nil {
		return nil
	}

	// Get parent (Asisten) of this Mandor
	parent, err := s.hierarchyService.GetParent(ctx, mandorID)
	if err != nil {
		return fmt.Errorf("failed to get parent asisten: %w", err)
	}
	if parent == nil {
		log.Printf("No parent asisten found for mandor %s, skipping FCM notification", mandorID)
		return nil
	}

	if parent.Role != authDomain.UserRoleAsisten {
		log.Printf(
			"Parent role for mandor %s is %s (expected ASISTEN), continuing with available hierarchy",
			mandorID,
			parent.Role,
		)
	}

	// Get Asisten's FCM tokens
	tokens, err := s.hierarchyService.GetUserTokens(ctx, parent.ID)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}
	if len(tokens) == 0 {
		log.Printf("No FCM tokens for asisten %s (parent of mandor %s)", parent.ID, mandorID)
		return nil
	}

	// Build and send payload
	payload := s.payloadBuilder.ForHarvestApprovalNeeded(harvestID, mandorName, blockName, bunchCount)
	result, err := s.fcmProvider.SendToTokens(ctx, tokens, payload)
	if err != nil {
		return fmt.Errorf("failed to send FCM: %w", err)
	}

	// Cleanup invalid tokens
	if len(result.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), result.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("FCM sent to asisten %s for harvest %s: %d success, %d failed",
		parent.ID, harvestID, result.SuccessCount, result.FailureCount)

	// Also notify manager (parent of asisten) so manager icon badge updates.
	manager, err := s.hierarchyService.GetParent(ctx, parent.ID)
	if err != nil {
		return fmt.Errorf("failed to get manager parent: %w", err)
	}
	if manager == nil {
		return nil
	}

	if manager.Role != authDomain.UserRoleManager {
		log.Printf(
			"Parent role for asisten %s is %s (expected MANAGER), skipping manager FCM",
			parent.ID,
			manager.Role,
		)
		return nil
	}

	managerTokens, err := s.hierarchyService.GetUserTokens(ctx, manager.ID)
	if err != nil {
		return fmt.Errorf("failed to get manager FCM tokens: %w", err)
	}
	if len(managerTokens) == 0 {
		log.Printf("No FCM tokens for manager %s (parent of asisten %s)", manager.ID, parent.ID)
		return nil
	}

	managerPayload := s.payloadBuilder.ForManagerHarvestApprovalNeeded(
		harvestID,
		mandorName,
		blockName,
		bunchCount,
	)
	managerResult, err := s.fcmProvider.SendToTokens(ctx, managerTokens, managerPayload)
	if err != nil {
		return fmt.Errorf("failed to send manager FCM: %w", err)
	}

	if len(managerResult.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), managerResult.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid manager tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("FCM sent to manager %s for harvest %s: %d success, %d failed",
		manager.ID, harvestID, managerResult.SuccessCount, managerResult.FailureCount)

	return nil
}

// NotifyMandorApproved sends FCM to Mandor when Asisten approves harvest
func (s *FCMNotificationService) NotifyMandorApproved(
	ctx context.Context,
	harvestID string,
	mandorID string,
	asistenName string,
	blockName string,
	harvestDate string,
	bunchCount int32,
) error {
	if s == nil || s.hierarchyService == nil || s.payloadBuilder == nil || s.fcmProvider == nil {
		return nil
	}

	// Get Mandor's FCM tokens
	tokens, err := s.hierarchyService.GetUserTokens(ctx, mandorID)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}
	if len(tokens) == 0 {
		log.Printf("No FCM tokens for mandor %s", mandorID)
		return nil
	}

	// Build and send payload
	payload := s.payloadBuilder.ForHarvestApproved(harvestID, asistenName, blockName, harvestDate, bunchCount)
	result, err := s.fcmProvider.SendToTokens(ctx, tokens, payload)
	if err != nil {
		return fmt.Errorf("failed to send FCM: %w", err)
	}

	// Cleanup invalid tokens
	if len(result.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), result.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("FCM approval sent to mandor %s for harvest %s: %d success, %d failed",
		mandorID, harvestID, result.SuccessCount, result.FailureCount)

	return nil
}

// NotifyMandorRejected sends FCM to Mandor when Asisten rejects harvest
func (s *FCMNotificationService) NotifyMandorRejected(
	ctx context.Context,
	harvestID string,
	mandorID string,
	asistenName string,
	blockName string,
	reason string,
	harvestDate string,
	bunchCount int32,
) error {
	if s == nil || s.hierarchyService == nil || s.payloadBuilder == nil || s.fcmProvider == nil {
		return nil
	}

	// Get Mandor's FCM tokens
	tokens, err := s.hierarchyService.GetUserTokens(ctx, mandorID)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}
	if len(tokens) == 0 {
		log.Printf("No FCM tokens for mandor %s", mandorID)
		return nil
	}

	// Build and send payload
	payload := s.payloadBuilder.ForHarvestRejected(harvestID, asistenName, blockName, reason, harvestDate, bunchCount)
	result, err := s.fcmProvider.SendToTokens(ctx, tokens, payload)
	if err != nil {
		return fmt.Errorf("failed to send FCM: %w", err)
	}

	// Cleanup invalid tokens
	if len(result.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), result.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("FCM rejection sent to mandor %s for harvest %s: %d success, %d failed",
		mandorID, harvestID, result.SuccessCount, result.FailureCount)

	return nil
}

// NotifyMultipleMandors sends FCM to multiple Mandors (batch notification)
func (s *FCMNotificationService) NotifyMultipleMandors(
	ctx context.Context,
	mandorIDs []string,
	payload fcm.FCMPayload,
) error {
	if s == nil || s.hierarchyService == nil || s.fcmProvider == nil {
		return nil
	}

	if len(mandorIDs) == 0 {
		return nil
	}

	tokens, err := s.hierarchyService.GetMultipleUserTokens(ctx, mandorIDs)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}
	if len(tokens) == 0 {
		log.Printf("No FCM tokens for mandors: %v", mandorIDs)
		return nil
	}

	result, err := s.fcmProvider.SendToTokens(ctx, tokens, payload)
	if err != nil {
		return fmt.Errorf("failed to send FCM: %w", err)
	}

	// Cleanup invalid tokens
	if len(result.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), result.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("FCM sent to %d mandors: %d success, %d failed",
		len(mandorIDs), result.SuccessCount, result.FailureCount)

	return nil
}
