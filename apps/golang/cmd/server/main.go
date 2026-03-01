package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	// GraphQL and service imports
	authModule "agrinovagraphql/server/internal/auth"
	sharedAuthInfra "agrinovagraphql/server/internal/auth/features/shared/infrastructure/postgres"
	authServices "agrinovagraphql/server/internal/auth/services"

	// Clean architecture module
	authMiddlewarePkg "agrinovagraphql/server/internal/auth/middleware"
	"agrinovagraphql/server/internal/graphql/directives"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	rbacServices "agrinovagraphql/server/internal/rbac/services"

	// Shared and pkg imports
	"agrinovagraphql/server/internal/graphql/resolvers"
	"agrinovagraphql/server/internal/routes"
	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"
	"agrinovagraphql/server/pkg/logger"

	syncServices "agrinovagraphql/server/internal/sync/services"

	// WebSocket imports
	websocketResolvers "agrinovagraphql/server/internal/websocket/resolvers"
	websocketServices "agrinovagraphql/server/internal/websocket/services"

	// FCM imports
	notifServices "agrinovagraphql/server/internal/notifications/services"
	"agrinovagraphql/server/pkg/fcm"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// version is injected at build time via:
//
//	go build -ldflags "-X main.version=1.2.3"
//
// Falls back to "dev" when built without ldflags (local development).
var version = "dev"

func main() {
	// Initialize logger
	log := logger.New()
	log.Info("Starting Agrinova GraphQL Server...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration: %v", err)
	}
	uploadsDir, err := resolveUploadsDir(cfg.UploadsDir)
	if err != nil {
		log.Fatal("Failed to initialize uploads directory: %v", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Connect to database
	dbConfig := &database.DatabaseConfig{
		Host:     cfg.Database.Host,
		Port:     strconv.Itoa(cfg.Database.Port),
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  "disable",
	}
	dbService, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatal("Failed to connect to database: %v", err)
	}

	// Service startup must not run migrations.
	// Execute migrations explicitly via the dedicated migration entrypoint:
	//   go run ./cmd/migrate/main.go
	if err := dbService.Health(context.Background()); err != nil {
		log.Fatal("Database health check failed. Run migrations first with `go run ./cmd/migrate/main.go`: %v", err)
	}

	// GraphQL schema will be loaded automatically by gqlgen

	// Initialize services for GraphQL
	services := initializeServices(cfg)

	// Initialize Auth Module V2 (Clean Architecture)
	authModuleV2, err := authModule.NewAuthModuleV2(database.GetDB())
	if err != nil {
		log.Fatal("Failed to initialize auth module: %v", err)
	}

	// Start periodic cleanup for expired/inactive web sessions.
	sessionRepo := sharedAuthInfra.NewSessionRepository(database.GetDB())
	startSessionCleanupWorker(context.Background(), log, sessionRepo)

	// Initialize WebSocket services
	connectionManager := websocketServices.NewConnectionManager()
	wsHandler := websocketServices.NewWebSocketHandler(connectionManager, authModuleV2.TokenService, services.auth.user)
	subscriptionResolver := websocketResolvers.NewSubscriptionResolver(wsHandler)
	eventBroadcaster := websocketServices.NewEventBroadcaster(database.GetDB(), wsHandler)

	// Initialize FCM services for push notifications
	hierarchyService := authServices.NewHierarchyService(database.GetDB())
	var fcmNotificationService resolvers.HarvestFCMNotifier

	// Try to initialize FCM provider (optional - won't fail if credentials missing)
	fcmProvider, fcmCredentialPath, err := initializeFCMProvider(log)
	if err != nil {
		log.Warn("⚠️  FCM provider not initialized (push notifications disabled): %v", err)
	} else {
		fcmNotificationService = notifServices.NewFCMNotificationService(fcmProvider, hierarchyService)
		log.Info("✅ FCM provider initialized - push notifications enabled (credentials: %s)", fcmCredentialPath)
	}

	// Note: GraphQL resolvers are now implemented directly in the resolver package

	// Setup Gin router
	router := gin.New()

	// Global middleware
	if envFlagEnabled("AGRINOVA_HTTP_ACCESS_LOG") {
		router.Use(gin.Logger())
	}
	router.Use(gin.Recovery())
	router.Use(corsMiddleware(cfg.CORS.AllowedOrigins))
	router.Use(securityHeadersMiddleware())

	// CSRF Protection middleware (TODO: Implement CSRF middleware)
	// csrfConfig := middleware.DefaultCSRFConfig(
	// 	[]byte(cfg.Auth.CSRFSecret),
	// 	cfg.Auth.CookieDomain,
	// 	cfg.Auth.SecureCookies,
	// )
	// csrfMiddleware := middleware.NewCSRFMiddleware(csrfConfig)
	// router.Use(csrfMiddleware.GraphQLMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "agrinova-graphql",
			"version": version,
		})
	})

	// Initialize main GraphQL resolver with all services
	resolver := resolvers.NewResolver(
		database.GetDB(), // Pass database connection
		authModuleV2,     // Pass new Auth Module
		services.auth.user,
		services.auth.password,
		services.auth.device,
		services.auth.platform,
		services.auth.rateLimit,
		services.auth.securityLogging,
		cfg.Auth.JWTAccessSecret, // JWT secret for gate check QR token generation
		uploadsDir,
	)

	// Add WebSocket subscription resolver to main resolver
	resolver.WebSocketSubscriptionResolver = subscriptionResolver

	// Add event broadcaster to resolver
	resolver.EventBroadcaster = eventBroadcaster

	// Add FCM notification service to resolver (for harvest notifications)
	resolver.FCMNotificationService = fcmNotificationService
	resolver.HierarchyService = hierarchyService

	// Initialize WebAuth middleware for GraphQL context
	webAuthMiddleware := middleware.NewWebAuthMiddleware(
		authModuleV2.WebAppService,
		authModuleV2.CookieService,
		log,
	)

	// Initialize RLS (Row-Level Security) Context Middleware
	// This middleware sets PostgreSQL session context for database-level security
	rlsMiddleware := middleware.NewRLSContextMiddleware(middleware.RLSMiddlewareConfig{
		DB:                        database.GetDB(),
		EnableApplicationFallback: true, // Fall back to app-level checks if RLS fails
		ContextTimeout:            15 * time.Minute,
		EnableAuditLogging:        true,  // Log RLS context operations for security monitoring
		BypassForSuperAdmin:       false, // SECURITY: Never bypass RLS for any role
	})

	log.Info("✅ RLS Context Middleware initialized - PostgreSQL Row-Level Security ACTIVE")

	// Initialize authentication directives
	authDirectives := directives.NewAuthDirectives()

	// Create GraphQL executable schema using gqlgen with WebSocket support
	srv := handler.New(generated.NewExecutableSchema(generated.Config{
		Resolvers:  resolver,
		Directives: authDirectives,
	}))

	// Enable introspection for development (playground)
	srv.Use(extension.Introspection{})

	// Add WebSocket transport for GraphQL subscriptions
	srv.AddTransport(transport.Websocket{
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// In production, implement proper origin checking
				return true
			},
		},
	})

	// Add other transports
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})

	// GraphQL endpoints with authentication and HTTP context middleware
	// Security layers (executed in order):
	// 1. webAuthMiddleware.WebSessionMiddleware() - Validates web session and adds user to context
	// 2. webAuthMiddleware.GraphQLContextMiddleware() - Adds HTTP context
	// 3. rlsMiddleware.Middleware(srv) - Sets PostgreSQL RLS context + user assignments
	// 4. srv - GraphQL handler with RLS-enforced database queries
	// Initialize RoleHierarchy and RBAC services for AuthMiddleware
	roleHierarchyService := authServices.NewRoleHierarchyService()
	rbacService := rbacServices.NewRBACService(database.GetDB())

	// Initialize AuthMiddleware for JWT authentication
	authMiddleware := middleware.NewAuthMiddleware(
		authModuleV2.TokenService,
		roleHierarchyService,
		rbacService,
	)

	// GraphQL endpoints with authentication and HTTP context middleware
	// Security layers (executed in order):
	// 1. authMiddleware.GraphQLAuth() - Validates JWT token (Bearer) and adds user to context
	// 2. webAuthMiddleware.WebSessionMiddleware() - Validates web session and adds user to context
	// 3. webAuthMiddleware.GraphQLContextMiddleware() - Adds HTTP context
	// 4. rlsMiddleware.Middleware(srv) - Sets PostgreSQL RLS context + user assignments
	// 5. srv - GraphQL handler with RLS-enforced database queries
	router.POST(cfg.Server.GraphQLEndpoint,
		authMiddleware.GraphQLAuth(),
		webAuthMiddleware.WebSessionMiddleware(),
		webAuthMiddleware.GraphQLContextMiddleware(),
		gin.WrapH(rlsMiddleware.Middleware(srv)),
	)
	router.GET(cfg.Server.GraphQLEndpoint,
		authMiddleware.GraphQLAuth(),
		webAuthMiddleware.WebSessionMiddleware(),
		webAuthMiddleware.GraphQLContextMiddleware(),
		gin.WrapH(rlsMiddleware.Middleware(srv)),
	)

	// WebSocket endpoint for direct WebSocket connections (non-GraphQL)
	router.GET("/ws", wsHandler.HandleWebSocket)

	// Vehicle tax document upload endpoint (multipart form-data)
	router.POST("/vehicle-tax-documents/upload",
		authMiddleware.GraphQLAuth(),
		webAuthMiddleware.WebSessionMiddleware(),
		webAuthMiddleware.GraphQLContextMiddleware(),
		resolver.HandleVehicleTaxDocumentUpload,
	)

	// Profile avatar upload endpoint (multipart form-data)
	router.POST("/profile/avatar/upload",
		authMiddleware.GraphQLAuth(),
		webAuthMiddleware.WebSessionMiddleware(),
		webAuthMiddleware.GraphQLContextMiddleware(),
		resolver.HandleProfileAvatarUpload,
	)

	// Static file serving for uploads
	// This allows access to uploaded photos (e.g., http://localhost:8080/uploads/satpam_photos/file.jpg)
	router.Static("/uploads", uploadsDir)

	// ============================
	// External Integration Routes (API Key auth)
	// ============================
	apiKeyService := authServices.NewAPIKeyService(database.GetDB(), services.auth.password)
	apiKeyMiddleware := authMiddlewarePkg.NewAPIKeyMiddleware(apiKeyService)
	bkmSyncService := syncServices.NewBkmSyncService(database.GetDB())

	apiGroup := router.Group("/api")
	routes.SetupExternalIntegrationRoutes(apiGroup, apiKeyMiddleware, bkmSyncService)

	log.Info("🔑 External API routes registered at /api/external/*")

	// GraphQL playground endpoint
	router.GET("/playground", gin.WrapH(playground.Handler("GraphQL playground", cfg.Server.GraphQLEndpoint)))

	// Note: REST API endpoints have been removed in favor of pure GraphQL implementation
	// All authentication and business logic is now handled through GraphQL mutations and queries

	// Start server
	port := ":" + strconv.Itoa(cfg.Server.Port)
	log.Info("🚀 GraphQL Server running on http://localhost%s", port)
	log.Info("📊 GraphQL Playground available at http://localhost%s/playground", port)
	log.Info("🔌 WebSocket endpoint available at ws://localhost%s/ws", port)
	log.Info("⚡ GraphQL Subscriptions available at ws://localhost%s%s", port, cfg.Server.GraphQLEndpoint)
	log.Info("🏥 Health check available at http://localhost%s/health", port)

	log.Info("Uploads directory mounted at %s", uploadsDir)

	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server: %v", err)
	}
}

func initializeFCMProvider(log *logger.Logger) (*fcm.FCMProvider, string, error) {
	candidates := resolveFCMCredentialCandidates()
	if len(candidates) == 0 {
		return nil, "", fmt.Errorf("no FCM credential path candidates configured")
	}

	for _, candidate := range candidates {
		fileInfo, statErr := os.Stat(candidate)
		if statErr != nil || fileInfo.IsDir() {
			continue
		}

		provider, err := fcm.NewFCMProvider(candidate)
		if err == nil {
			return provider, candidate, nil
		}

		log.Warn("FCM credentials candidate failed (%s): %v", candidate, err)
	}

	return nil, "", fmt.Errorf(
		"no valid FCM credentials file found (set AGRINOVA_FCM_CREDENTIALS_FILE). Checked: %v",
		candidates,
	)
}

func resolveUploadsDir(configuredDir string) (string, error) {
	resolved := strings.TrimSpace(configuredDir)
	if resolved == "" {
		resolved = "./uploads"
	}

	resolved = filepath.Clean(resolved)
	if !filepath.IsAbs(resolved) {
		absPath, err := filepath.Abs(resolved)
		if err != nil {
			return "", fmt.Errorf("failed to resolve absolute uploads directory: %w", err)
		}
		resolved = absPath
	}

	if err := os.MkdirAll(resolved, 0755); err != nil {
		return "", fmt.Errorf("failed to create uploads directory: %w", err)
	}

	return resolved, nil
}

func resolveFCMCredentialCandidates() []string {
	candidates := make([]string, 0, 4)

	appendUnique := func(path string) {
		trimmed := strings.TrimSpace(path)
		if trimmed == "" {
			return
		}
		for _, existing := range candidates {
			if strings.EqualFold(existing, trimmed) {
				return
			}
		}
		candidates = append(candidates, trimmed)
	}

	appendUnique(os.Getenv("AGRINOVA_FCM_CREDENTIALS_FILE"))
	appendUnique(os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"))

	if executablePath, err := os.Executable(); err == nil {
		appendUnique(filepath.Join(filepath.Dir(executablePath), "firebase-service-account.json"))
	}

	appendUnique("./firebase-service-account.json")

	return candidates
}

func startSessionCleanupWorker(ctx context.Context, log *logger.Logger, sessionRepo *sharedAuthInfra.SessionRepository) {
	const cleanupInterval = 30 * time.Minute
	const inactiveRetention = 30 * 24 * time.Hour

	cleanup := func() {
		if err := sessionRepo.RevokeExpiredSessions(ctx); err != nil {
			log.Warn("Session cleanup: failed to revoke expired sessions: %v", err)
		}
		if err := sessionRepo.CleanupOldSessions(ctx, inactiveRetention); err != nil {
			log.Warn("Session cleanup: failed to delete old inactive sessions: %v", err)
		}
	}

	// Run once at startup so stale rows don't linger until the first tick.
	cleanup()

	go func() {
		ticker := time.NewTicker(cleanupInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Info("Session cleanup worker stopped")
				return
			case <-ticker.C:
				cleanup()
			}
		}
	}()

	log.Info("Session cleanup worker started (interval: %s, retention: %s)", cleanupInterval, inactiveRetention)
}

func envFlagEnabled(key string) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

// Services contains all authentication services for GraphQL
type Services struct {
	auth struct {
		device          *authServices.DeviceService
		platform        *authServices.PlatformDetectionService
		user            *authServices.UserService
		password        *authServices.PasswordService
		rateLimit       *authServices.RateLimitService
		securityLogging *authServices.SecurityLoggingService
	}
	// Refactored auth module (disabled)
	// refactoredAuth struct {
	// 	module           *authModule.AuthModule
	// 	webAuthService    webDomain.WebAuthService
	// 	mobileAuthService mobileDomain.MobileAuthService
	// }
}

// initializeServices creates and configures all domain services
func initializeServices(cfg *config.Config) *Services {
	services := &Services{}

	// Initialize auth services with Viper configuration
	// jwtService removed (using authModuleV2.TokenService)

	// Initialize device service with Viper configuration
	deviceConfig := authServices.DeviceConfig{
		MaxDevicesPerUser: cfg.Auth.MaxDevicesPerUser,
		DeviceSecret:      cfg.Auth.DeviceSecret,
		AutoTrustDuration: 7 * 24 * time.Hour, // TODO: Make this configurable
		RequireManualAuth: cfg.Auth.RequireManualAuth,
	}
	services.auth.device = authServices.NewDeviceService(deviceConfig)

	services.auth.platform = authServices.NewPlatformDetectionService()
	services.auth.user = authServices.NewUserService()
	// Initialize password service with secure Argon2 defaults
	// Using Argon2id which is more secure than bcrypt
	services.auth.password = authServices.NewPasswordService()

	// Initialize rate limiting service with configuration
	rateLimitConfig := authServices.RateLimitConfig{
		MaxLoginAttempts:      5,
		MaxRefreshAttempts:    10,
		LoginWindowDuration:   15 * time.Minute,
		RefreshWindowDuration: 5 * time.Minute,
		LockoutDuration:       30 * time.Minute,
	}
	services.auth.rateLimit = authServices.NewRateLimitServiceWithConfig(rateLimitConfig)

	// Initialize security logging service with configuration
	securityLoggingConfig := authServices.SecurityLoggingConfig{
		EnableDetailed: true,
		RetentionDays:  90,
		AsyncLogging:   true,
		AlertThresholds: map[authServices.SecurityEventType]int{
			authServices.EventLoginFailure:           5,
			authServices.EventBruteForceDetected:     1,
			authServices.EventSuspiciousActivity:     3,
			authServices.EventInputValidationFailure: 10,
			authServices.EventRateLimitExceeded:      1,
		},
	}
	services.auth.securityLogging = authServices.NewSecurityLoggingService(securityLoggingConfig)
	// webAuthService and cookieService removed (using authModuleV2)
	// services.auth.webAuth = authServices.NewWebAuthService(database.GetDB(), services.auth.cookie, services.auth.password, services.auth.user, nil)

	// Initialize refactored auth module (disabled)
	// refactoredAuthModule, err := authModule.NewAuthModuleV2(database.GetDB())
	// if err != nil {
	// 	log.Fatal("Failed to initialize refactored auth module: %v", err)
	// }
	// services.refactoredAuth.module = refactoredAuthModule

	// Extract services from refactored module for easy access
	// Note: This is a temporary approach for gradual migration
	// In the future, we'll use the module's resolvers directly

	// For now, create mock services that implement the required interfaces
	// TODO: Replace with actual services from the refactored module
	// services.refactoredAuth.webAuthService = &tempWebAuthService{}
	// services.refactoredAuth.mobileAuthService = &tempMobileAuthService{}

	return services
}

// GraphQL handlers are now provided by gqlgen

// corsMiddleware adds CORS headers (same as original)
func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// CRITICAL FIX: We MUST set specific origin when using credentials
		// Access-Control-Allow-Origin: * does NOT work with credentials!
		originToSet := origin
		if origin == "" {
			// If no origin header (same-origin request), allow localhost
			originToSet = "http://localhost:3000"
		}

		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// For local development, also allow common localhost variants
		if !allowed && (strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")) {
			allowed = true
		}

		// CRITICAL: Set specific origin for cookie support (not wildcard)
		if allowed || origin == "" {
			c.Header("Access-Control-Allow-Origin", originToSet)
		}

		// CRITICAL CORS headers for cookie authentication
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Cookie")
		c.Header("Access-Control-Expose-Headers", "Set-Cookie, X-CSRF-Token, Content-Type")
		c.Header("Access-Control-Max-Age", "86400") // Cache preflight for 24 hours

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// securityHeadersMiddleware adds comprehensive security headers
func securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// HSTS (HTTP Strict Transport Security)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// Content Security Policy for GraphQL API
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; " +
			"style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; " +
			"img-src 'self' data: cdn.jsdelivr.net; " +
			"font-src 'self' cdn.jsdelivr.net; " +
			"connect-src 'self'; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"object-src 'none'"
		c.Header("Content-Security-Policy", csp)

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature Policy)
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")

		// Remove server information
		c.Header("Server", "")

		c.Next()
	}
}
