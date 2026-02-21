package di

import (
	mobileApp "agrinovagraphql/server/internal/auth/features/mobile/application"
	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	mobileInfra "agrinovagraphql/server/internal/auth/features/mobile/infrastructure"
	mobileGraphQL "agrinovagraphql/server/internal/auth/features/mobile/interfaces/graphql"
	sharedApp "agrinovagraphql/server/internal/auth/features/shared/application"
	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	sharedInfra "agrinovagraphql/server/internal/auth/features/shared/infrastructure/postgres"
	securityInfra "agrinovagraphql/server/internal/auth/features/shared/infrastructure/security"
	webApp "agrinovagraphql/server/internal/auth/features/web/application"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
	webInfra "agrinovagraphql/server/internal/auth/features/web/infrastructure"
	webGraphQL "agrinovagraphql/server/internal/auth/features/web/interfaces/graphql"
	"agrinovagraphql/server/internal/auth/internal/config"
	"time"

	"github.com/google/wire"
	"gorm.io/gorm"
)

// ProviderSet is a collection of providers for the auth module
var ProviderSet = wire.NewSet(
	// Shared providers
	provideSharedRepositories,
	provideSecurityServices,

	// Web authentication providers
	provideWebConfig,
	provideWebCookieConfig,
	webInfra.NewCookieService,
	securityInfra.NewPasswordService,
	// Add RateLimiter (In-memory, 5 login attempts per minute, block for 5 minutes)
	func() *securityInfra.RateLimiter {
		return securityInfra.NewRateLimiter(5, time.Minute, 5*time.Minute)
	},
	wire.Bind(new(webDomain.RateLimiter), new(*securityInfra.RateLimiter)),
	webApp.NewService,
	webGraphQL.NewResolver,

	// Mobile authentication providers
	provideMobileConfig,
	mobileInfra.NewJWTService,
	mobileApp.NewService,
	mobileGraphQL.NewResolver,

	// Extended features
	sharedApp.NewSharedAuthService,
	// Bind TokenRevocationService to JWTService for SharedAuthService
	wire.Bind(new(sharedApp.TokenRevocationService), new(*mobileInfra.JWTService)),
	webApp.NewUserManagementService,

	// Main module provider
	NewAuthModule,
)

// AuthModule represents the complete authentication module
type AuthModule struct {
	WebResolver           *webGraphQL.Resolver
	MobileResolver        *mobileGraphQL.Resolver
	SharedAuthService     *sharedApp.SharedAuthService
	UserManagementService *webApp.UserManagementService
	WebAppService         *webApp.Service
	CookieService         *webInfra.CookieService
	TokenService          mobileDomain.TokenService
}

// NewAuthModule creates the complete authentication module
func NewAuthModule(
	webResolver *webGraphQL.Resolver,
	mobileResolver *mobileGraphQL.Resolver,
	sharedAuthService *sharedApp.SharedAuthService,
	userManagementService *webApp.UserManagementService,
	webAppService *webApp.Service,
	cookieService *webInfra.CookieService,
	tokenService mobileDomain.TokenService,
) *AuthModule {
	return &AuthModule{
		WebResolver:           webResolver,
		MobileResolver:        mobileResolver,
		SharedAuthService:     sharedAuthService,
		UserManagementService: userManagementService,
		WebAppService:         webAppService,
		CookieService:         cookieService,
		TokenService:          tokenService,
	}
}

// Shared repository providers

func provideSharedRepositories(db *gorm.DB) struct {
	UserRepo       sharedDomain.UserRepository
	SessionRepo    sharedDomain.SessionRepository
	DeviceRepo     sharedDomain.DeviceRepository
	AssignmentRepo sharedDomain.AssignmentRepository
	CompanyRepo    sharedDomain.CompanyRepository
	EstateRepo     sharedDomain.EstateRepository
	DivisionRepo   sharedDomain.DivisionRepository
} {
	return struct {
		UserRepo       sharedDomain.UserRepository
		SessionRepo    sharedDomain.SessionRepository
		DeviceRepo     sharedDomain.DeviceRepository
		AssignmentRepo sharedDomain.AssignmentRepository
		CompanyRepo    sharedDomain.CompanyRepository
		EstateRepo     sharedDomain.EstateRepository
		DivisionRepo   sharedDomain.DivisionRepository
	}{
		UserRepo:       sharedInfra.NewUserRepository(db),
		SessionRepo:    sharedInfra.NewSessionRepository(db),
		DeviceRepo:     sharedInfra.NewDeviceRepository(db),
		AssignmentRepo: sharedInfra.NewAssignmentRepository(db),
		CompanyRepo:    sharedInfra.NewCompanyRepository(db),
		EstateRepo:     sharedInfra.NewEstateRepository(db),
		DivisionRepo:   sharedInfra.NewDivisionRepository(db),
	}
}

// Security service providers

func provideSecurityServices() struct {
	PasswordService sharedDomain.PasswordService
	SecurityLogger  sharedDomain.SecurityEventLogger
} {
	return struct {
		PasswordService sharedDomain.PasswordService
		SecurityLogger  sharedDomain.SecurityEventLogger
	}{
		PasswordService: securityInfra.NewPasswordService(),
		SecurityLogger:  securityInfra.NewSecurityLogger(true),
	}
}

// Web configuration provider

func provideWebConfig(cfg *config.AuthConfig) webApp.WebConfig {
	return webApp.WebConfig{
		SessionDuration:    cfg.Web.SessionDuration,
		RememberMeDuration: cfg.Web.RememberMeDuration,
		CSRFSecret:         []byte(cfg.Web.CSRFSecret),
	}
}

// Web cookie configuration provider

func provideWebCookieConfig(cfg *config.AuthConfig) webInfra.CookieConfig {
	return webInfra.CookieConfig{
		SessionCookieName: cfg.Web.Cookie.SessionName,
		CSRFCookieName:    cfg.Web.Cookie.CSRFName,
		Domain:            cfg.Web.Cookie.Domain,
		SecureCookies:     cfg.Web.Cookie.Secure,
		SameSitePolicy:    cfg.Web.Cookie.SameSite,
		SessionDuration:   cfg.Web.SessionDuration,
		CSRFTokenDuration: cfg.Web.Cookie.CSRFDuration,
		CSRFSecret:        []byte(cfg.Web.CSRFSecret),
	}
}

// Mobile configuration provider

func provideMobileConfig(cfg *config.AuthConfig) mobileApp.MobileConfig {
	return mobileApp.MobileConfig{
		AccessTokenDuration:  cfg.Mobile.AccessTokenDuration,
		RefreshTokenDuration: cfg.Mobile.RefreshTokenDuration,
		OfflineTokenDuration: cfg.Mobile.OfflineTokenDuration,
		MaxDevicesPerUser:    cfg.Mobile.MaxDevicesPerUser,
		DeviceSecret:         cfg.Mobile.DeviceSecret,
	}
}

// Mobile JWT configuration provider

func provideMobileJWTConfig(cfg *config.AuthConfig) mobileInfra.JWTConfig {
	return mobileInfra.JWTConfig{
		AccessTokenSecret:    cfg.Mobile.JWT.AccessSecret,
		RefreshTokenSecret:   cfg.Mobile.JWT.RefreshSecret,
		OfflineTokenSecret:   cfg.Mobile.JWT.OfflineSecret,
		AccessTokenDuration:  cfg.Mobile.AccessTokenDuration,
		RefreshTokenDuration: cfg.Mobile.RefreshTokenDuration,
		OfflineTokenDuration: cfg.Mobile.OfflineTokenDuration,
		Issuer:               cfg.Mobile.JWT.Issuer,
	}
}
