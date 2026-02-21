package resolvers

import (
	"context"

	"gorm.io/gorm"

	authModule "agrinovagraphql/server/internal/auth"
	authResolvers "agrinovagraphql/server/internal/auth/resolvers"
	authServices "agrinovagraphql/server/internal/auth/services"
	employeeServices "agrinovagraphql/server/internal/employee/services"
	featureResolvers "agrinovagraphql/server/internal/features/resolvers"
	featureServices "agrinovagraphql/server/internal/features/services"
	gateCheckResolvers "agrinovagraphql/server/internal/gatecheck/resolvers"
	gateCheckServices "agrinovagraphql/server/internal/gatecheck/services"
	gradingServices "agrinovagraphql/server/internal/grading/services"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/satpam"
	"agrinovagraphql/server/internal/graphql/generated"
	masterRepositories "agrinovagraphql/server/internal/master/repositories"
	masterResolvers "agrinovagraphql/server/internal/master/resolvers"
	masterServices "agrinovagraphql/server/internal/master/services"
	"agrinovagraphql/server/internal/middleware"
	"agrinovagraphql/server/internal/notifications/models"
	notificationRepositories "agrinovagraphql/server/internal/notifications/repositories"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
	panenResolvers "agrinovagraphql/server/internal/panen/resolvers"
	rbacResolvers "agrinovagraphql/server/internal/rbac/resolvers"
	rbacServices "agrinovagraphql/server/internal/rbac/services"
	syncServices "agrinovagraphql/server/internal/sync/services"
	websocketResolvers "agrinovagraphql/server/internal/websocket/resolvers"
	websocketServices "agrinovagraphql/server/internal/websocket/services"
	weighingServices "agrinovagraphql/server/internal/weighing/services"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	db *gorm.DB
	// uploadsDir is the filesystem root directory mapped to `/uploads`.
	uploadsDir string

	// Services
	RoleHierarchyService *authServices.RoleHierarchyService
	RBACService          *rbacServices.RBACService
	EmployeeService      *employeeServices.EmployeeService
	NotificationService  *notificationServices.NotificationService
	WeighingService      *weighingServices.WeighingService
	GradingService       *gradingServices.GradingService
	APIKeyService        *authServices.APIKeyService
	FeatureService       *featureServices.FeatureService
	GateCheckService     *gateCheckServices.GateCheckService
	// UnifiedAuthService and LogoutService disabled due to undefined GraphQL types
	// UnifiedAuthService   *authServices.UnifiedAuthService
	// LogoutService        *authServices.LogoutService

	// Domain resolvers
	AuthResolver      *authResolvers.AuthResolver
	RBACResolver      *rbacResolvers.RBACResolver
	FeatureResolver   *featureResolvers.FeatureResolver
	MasterResolver    *masterResolvers.MasterResolver
	PanenResolver     *panenResolvers.PanenResolver
	GateCheckResolver *gateCheckResolvers.GateCheckResolver

	// WebSocket resolver
	WebSocketSubscriptionResolver *websocketResolvers.SubscriptionResolver

	// WebSocket handler
	WebSocketHandler *websocketServices.WebSocketHandler

	// Auth integration with refactored module (disabled)
	// AuthIntegration *AuthIntegration

	// Event broadcaster (can be injected later)
	EventBroadcaster interface {
		OnHarvestRecordCreated(record *mandor.HarvestRecord)
		OnHarvestRecordApproved(record *mandor.HarvestRecord)
		OnHarvestRecordRejected(record *mandor.HarvestRecord)
		// TODO: Add GateCheckRecord type to schema first
		// OnGateCheckCreated(record *generated.GateCheckRecord)
		// OnGateCheckCompleted(record *generated.GateCheckRecord)
	}

	// FCM services for push notifications (injected from main.go)
	FCMNotificationService     HarvestFCMNotifier
	ManagerNotificationService *notificationServices.ManagerNotificationService
	HierarchyService           *authServices.HierarchyService

	// Sync services
	BkmSyncService   *syncServices.BkmSyncService
	BkmReportService *syncServices.BkmReportService
}

// HarvestFCMNotifier defines the FCM notification capability used by harvest flows.
// Keep this as an interface to make resolver behavior testable.
type HarvestFCMNotifier interface {
	NotifyAsistenNewHarvest(
		ctx context.Context,
		harvestID string,
		mandorID string,
		mandorName string,
		blockName string,
		bunchCount int32,
	) error
}

// NewResolver creates a new resolver with all domain resolvers initialized
func NewResolver(
	db *gorm.DB,
	authModuleV2 *authModule.AuthModule,
	userService *authServices.UserService,
	passwordService *authServices.PasswordService,
	deviceService *authServices.DeviceService,
	platformService *authServices.PlatformDetectionService,
	rateLimitService *authServices.RateLimitService,
	securityLoggingService *authServices.SecurityLoggingService,
	jwtSecret string,
	uploadsDir string,
) *Resolver {
	// authModuleV2 is now passed in

	// Initialize master domain
	masterRepository := masterRepositories.NewMasterRepository(db)
	masterService := masterServices.NewMasterService(masterRepository, db)

	// Initialize role hierarchy service
	roleHierarchyService := authServices.NewRoleHierarchyService()

	// Initialize RBAC service
	rbacService := rbacServices.NewRBACService(db)

	// Initialize auth middleware with RBAC - use TokenService from AuthModuleV2
	authMiddleware := middleware.NewAuthMiddleware(authModuleV2.TokenService, roleHierarchyService, rbacService)

	masterResolver := masterResolvers.NewMasterResolver(masterService, authMiddleware)

	// Initialize panen (harvest) domain
	panenResolver := panenResolvers.NewPanenResolver(db, authMiddleware)

	// Initialize gatecheck domain
	gateCheckResolver := gateCheckResolvers.NewGateCheckResolver(db, authMiddleware)
	gateCheckService := gateCheckServices.NewGateCheckService(db, jwtSecret, uploadsDir)

	// Initialize employee service
	employeeService := employeeServices.NewEmployeeService(db)

	// Initialize notification repository and service
	notificationRepo := notificationRepositories.NewNotificationRepository(db)
	notificationService := notificationServices.NewNotificationService(notificationRepo, nil, nil)

	// Initialize weighing service
	weighingService := weighingServices.NewWeighingService(db)

	// Initialize grading service
	// gradingService := gradingServices.NewGradingService(db)

	// Initialize API key service
	apiKeyService := authServices.NewAPIKeyService(db, passwordService)

	// Initialize RBAC resolver
	rbacResolver := rbacResolvers.NewRBACResolver(rbacService)

	// Initialize feature service and resolver
	featureService := featureServices.NewFeatureService(db)
	featureCompositionService := featureServices.NewFeatureCompositionService(db)
	featureResolver := featureResolvers.NewFeatureResolver(featureService, featureCompositionService, authMiddleware)

	// Initialize WebSocket connection manager
	connectionManager := websocketServices.NewConnectionManager()

	// Initialize WebSocket handler
	webSocketHandler := websocketServices.NewWebSocketHandler(connectionManager, authModuleV2.TokenService, userService)

	// Initialize WebSocket subscription resolver
	webSocketSubscriptionResolver := websocketResolvers.NewSubscriptionResolver(webSocketHandler)

	// 5. Inject into Global AuthResolver
	// We update the Global Resolvers to use the New Module's resolvers for Logic
	globalAuthResolver := authResolvers.NewAuthResolver()

	if authModuleV2 != nil {
		globalAuthResolver.SetMobileResolver(authModuleV2.MobileResolver)
		globalAuthResolver.SetWebResolver(authModuleV2.WebResolver)
		globalAuthResolver.SetSharedAuthService(authModuleV2.SharedAuthService)
		globalAuthResolver.SetUserManagementService(authModuleV2.UserManagementService)
	}

	// Initialize hierarchy service
	hierarchyService := authServices.NewHierarchyService(db)

	// Initialize BKM sync service
	bkmSyncService := syncServices.NewBkmSyncService(db)
	bkmReportService := syncServices.NewBkmReportService(db)

	return &Resolver{
		db:                            db,
		uploadsDir:                    normalizeUploadsRoot(uploadsDir),
		HierarchyService:              hierarchyService,
		RoleHierarchyService:          roleHierarchyService,
		RBACService:                   rbacService,
		EmployeeService:               employeeService,
		NotificationService:           notificationService,
		WeighingService:               weighingService,
		GradingService:                gradingServices.NewGradingService(db),
		APIKeyService:                 apiKeyService,
		FeatureService:                featureService,
		GateCheckService:              gateCheckService,
		AuthResolver:                  globalAuthResolver,
		RBACResolver:                  rbacResolver,
		FeatureResolver:               featureResolver,
		MasterResolver:                masterResolver,
		PanenResolver:                 panenResolver,
		GateCheckResolver:             gateCheckResolver,
		WebSocketHandler:              webSocketHandler,
		WebSocketSubscriptionResolver: webSocketSubscriptionResolver,
		BkmSyncService:                bkmSyncService,
		BkmReportService:              bkmReportService,
	}
}

// NotificationSummary returns generated.NotificationSummaryResolver implementation.
func (r *Resolver) NotificationSummary() generated.NotificationSummaryResolver {
	return &notificationSummaryResolver{r}
}

// notificationSummaryResolver handles field resolvers for NotificationSummary type
type notificationSummaryResolver struct{ *Resolver }

// CountByType returns notification counts grouped by type
func (r *notificationSummaryResolver) CountByType(ctx context.Context, obj *models.NotificationSummary) ([]*generated.NotificationTypeCount, error) {
	// Convert from models.NotificationTypeCount to generated.NotificationTypeCount
	var result []*generated.NotificationTypeCount
	for _, count := range obj.CountByType {
		result = append(result, &generated.NotificationTypeCount{
			Type:        count.Type,
			Count:       count.Count,
			UnreadCount: count.UnreadCount,
		})
	}
	return result, nil
}

// SatpamGuestLogSyncRecord returns generated.SatpamGuestLogSyncRecordResolver implementation.
func (r *Resolver) SatpamGuestLogSyncRecord() generated.SatpamGuestLogSyncRecordResolver {
	return &satpamGuestLogSyncRecordResolver{r}
}

type satpamGuestLogSyncRecordResolver struct{ *Resolver }

func (r *satpamGuestLogSyncRecordResolver) ID(ctx context.Context, obj *satpam.SatpamGuestLogSyncRecord, data string) error {
	obj.LocalID = data
	return nil
}

// SatpamSyncItemResult returns generated.SatpamSyncItemResultResolver implementation.
func (r *Resolver) SatpamSyncItemResult() generated.SatpamSyncItemResultResolver {
	return &satpamSyncItemResultResolver{r}
}
