package error_handling

import (
	"errors"
	"fmt"
	"net/http"
)

// =============================================================================
// Auth Error Types
// =============================================================================

// ErrorCode represents standardized error codes for auth operations
type ErrorCode string

const (
	// Authentication errors
	ErrCodeInvalidCredentials    ErrorCode = "INVALID_CREDENTIALS"
	ErrCodeInvalidToken          ErrorCode = "INVALID_TOKEN"
	ErrCodeExpiredToken          ErrorCode = "EXPIRED_TOKEN"
	ErrCodeMissingToken          ErrorCode = "MISSING_TOKEN"
	ErrCodeInvalidSession        ErrorCode = "INVALID_SESSION"
	ErrCodeExpiredSession        ErrorCode = "EXPIRED_SESSION"
	ErrCodeMissingSession        ErrorCode = "MISSING_SESSION"

	// Authorization errors
	ErrCodeUnauthorized          ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden            ErrorCode = "FORBIDDEN"
	ErrCodeInsufficientPermissions ErrorCode = "INSUFFICIENT_PERMISSIONS"

	// User management errors
	ErrCodeUserNotFound          ErrorCode = "USER_NOT_FOUND"
	ErrCodeUserAlreadyExists     ErrorCode = "USER_ALREADY_EXISTS"
	ErrCodeUserInactive          ErrorCode = "USER_INACTIVE"
	ErrCodeUserLocked            ErrorCode = "USER_LOCKED"

	// Device management errors
	ErrCodeDeviceNotFound        ErrorCode = "DEVICE_NOT_FOUND"
	ErrCodeDeviceNotAuthorized   ErrorCode = "DEVICE_NOT_AUTHORIZED"
	ErrCodeDeviceAlreadyBound    ErrorCode = "DEVICE_ALREADY_BOUND"
	ErrCodeMaxDevicesExceeded    ErrorCode = "MAX_DEVICES_EXCEEDED"

	// Validation errors
	ErrCodeValidationError       ErrorCode = "VALIDATION_ERROR"
	ErrCodeInvalidInput          ErrorCode = "INVALID_INPUT"
	ErrCodeMissingField          ErrorCode = "MISSING_FIELD"

	// System errors
	ErrCodeInternalServer        ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrCodeDatabaseError         ErrorCode = "DATABASE_ERROR"
	ErrCodeServiceUnavailable    ErrorCode = "SERVICE_UNAVAILABLE"
	ErrCodeRateLimitExceeded     ErrorCode = "RATE_LIMIT_EXCEEDED"

	// Security errors
	ErrCodeSuspiciousActivity    ErrorCode = "SUSPICIOUS_ACTIVITY"
	ErrCodeBruteForceDetected    ErrorCode = "BRUTE_FORCE_DETECTED"
	ErrCodeSecurityViolation     ErrorCode = "SECURITY_VIOLATION"
)

// AuthError represents a structured authentication error
type AuthError struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	HTTPStatus int                    `json:"-"`
	Cause      error                  `json:"-"`
}

// Error implements the error interface
func (e *AuthError) Error() string {
	if e.Details != nil {
		return fmt.Sprintf("[%s] %s: %+v", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Unwrap returns the underlying cause
func (e *AuthError) Unwrap() error {
	return e.Cause
}

// =============================================================================
// Error Factory Functions
// =============================================================================

// NewAuthenticationError creates a new authentication error
func NewAuthenticationError(code ErrorCode, message string, cause error) *AuthError {
	return &AuthError{
		Code:       code,
		Message:    message,
		HTTPStatus: http.StatusUnauthorized,
		Cause:      cause,
	}
}

// NewAuthorizationError creates a new authorization error
func NewAuthorizationError(code ErrorCode, message string, cause error) *AuthError {
	status := http.StatusForbidden
	if code == ErrCodeUnauthorized {
		status = http.StatusUnauthorized
	}

	return &AuthError{
		Code:       code,
		Message:    message,
		HTTPStatus: status,
		Cause:      cause,
	}
}

// NewValidationError creates a new validation error
func NewValidationError(code ErrorCode, message string, details map[string]interface{}) *AuthError {
	return &AuthError{
		Code:       code,
		Message:    message,
		Details:    details,
		HTTPStatus: http.StatusBadRequest,
	}
}

// NewSystemError creates a new system error
func NewSystemError(code ErrorCode, message string, cause error) *AuthError {
	return &AuthError{
		Code:       code,
		Message:    message,
		HTTPStatus: http.StatusInternalServerError,
		Cause:      cause,
	}
}

// NewSecurityError creates a new security error
func NewSecurityError(code ErrorCode, message string, details map[string]interface{}) *AuthError {
	return &AuthError{
		Code:       code,
		Message:    message,
		Details:    details,
		HTTPStatus: http.StatusTooManyRequests,
	}
}

// =============================================================================
// Common Error Creation Helpers
// =============================================================================

// ErrInvalidCredentials creates an invalid credentials error
func ErrInvalidCredentials(cause error) *AuthError {
	return NewAuthenticationError(
		ErrCodeInvalidCredentials,
		"Invalid username or password",
		cause,
	)
}

// ErrInvalidToken creates an invalid token error
func ErrInvalidToken(cause error) *AuthError {
	return NewAuthenticationError(
		ErrCodeInvalidToken,
		"Invalid or malformed token",
		cause,
	)
}

// ErrExpiredToken creates an expired token error
func ErrExpiredToken() *AuthError {
	return NewAuthenticationError(
		ErrCodeExpiredToken,
		"Token has expired",
		nil,
	)
}

// ErrUserNotFound creates a user not found error
func ErrUserNotFound(userID string) *AuthError {
	return NewValidationError(
		ErrCodeUserNotFound,
		"User not found",
		map[string]interface{}{
			"user_id": userID,
		},
	)
}

// ErrUserInactive creates a user inactive error
func ErrUserInactive(userID string) *AuthError {
	return NewAuthorizationError(
		ErrCodeUserInactive,
		"User account is inactive",
		nil,
	)
}

// ErrDeviceNotAuthorized creates a device not authorized error
func ErrDeviceNotAuthorized(deviceID string) *AuthError {
	return NewAuthorizationError(
		ErrCodeDeviceNotAuthorized,
		"Device is not authorized",
		nil,
	)
}

// ErrMaxDevicesExceeded creates a max devices exceeded error
func ErrMaxDevicesExceeded(userID string, currentCount, maxAllowed int) *AuthError {
	return NewValidationError(
		ErrCodeMaxDevicesExceeded,
		"Maximum number of devices exceeded",
		map[string]interface{}{
			"user_id":        userID,
			"current_count":  currentCount,
			"max_allowed":    maxAllowed,
		},
	)
}

// ErrRateLimitExceeded creates a rate limit exceeded error
func ErrRateLimitExceeded(limit int, window string) *AuthError {
	return NewSecurityError(
		ErrCodeRateLimitExceeded,
		fmt.Sprintf("Rate limit exceeded. Maximum %d requests per %s", limit, window),
		map[string]interface{}{
			"limit":  limit,
			"window": window,
		},
	)
}

// =============================================================================
// Error Classification and Handling
// =============================================================================

// ErrorType represents the category of an error
type ErrorType string

const (
	ErrorTypeAuthentication ErrorType = "authentication"
	ErrorTypeAuthorization  ErrorType = "authorization"
	ErrorTypeValidation     ErrorType = "validation"
	ErrorTypeSystem         ErrorType = "system"
	ErrorTypeSecurity       ErrorType = "security"
)

// ClassifyError determines the type of error
func ClassifyError(err error) ErrorType {
	if err == nil {
		return ""
	}

	var authErr *AuthError
	if errors.As(err, &authErr) {
		switch authErr.Code {
		case ErrCodeInvalidCredentials, ErrCodeInvalidToken, ErrCodeExpiredToken,
			 ErrCodeMissingToken, ErrCodeInvalidSession, ErrCodeExpiredSession, ErrCodeMissingSession:
			return ErrorTypeAuthentication
		case ErrCodeUnauthorized, ErrCodeForbidden, ErrCodeInsufficientPermissions,
			 ErrCodeUserInactive, ErrCodeUserLocked, ErrCodeDeviceNotAuthorized:
			return ErrorTypeAuthorization
		case ErrCodeValidationError, ErrCodeInvalidInput, ErrCodeMissingField,
			 ErrCodeUserNotFound, ErrCodeUserAlreadyExists, ErrCodeDeviceNotFound,
			 ErrCodeDeviceAlreadyBound, ErrCodeMaxDevicesExceeded:
			return ErrorTypeValidation
		case ErrCodeSuspiciousActivity, ErrCodeBruteForceDetected, ErrCodeSecurityViolation,
			 ErrCodeRateLimitExceeded:
			return ErrorTypeSecurity
		default:
			return ErrorTypeSystem
		}
	}

	// If it's not an AuthError, classify as system error
	return ErrorTypeSystem
}

// IsRetryable determines if an error is retryable
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}

	errorType := ClassifyError(err)

	// System errors and some authentication errors might be retryable
	switch errorType {
	case ErrorTypeSystem:
		return true
	case ErrorTypeAuthentication:
		// Only retry authentication errors for network issues
		var authErr *AuthError
		if errors.As(err, &authErr) {
			return authErr.Code == ErrCodeServiceUnavailable
		}
		return false
	default:
		return false
	}
}

// IsClientError determines if an error is caused by the client
func IsClientError(err error) bool {
	if err == nil {
		return false
	}

	var authErr *AuthError
	if errors.As(err, &authErr) {
		return authErr.HTTPStatus >= 400 && authErr.HTTPStatus < 500
	}

	return false
}

// =============================================================================
// Error Response Formatting
// =============================================================================

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error ErrorDetails `json:"error"`
}

// ErrorDetails contains error information for API responses
type ErrorDetails struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	RequestID  string                 `json:"request_id,omitempty"`
	Timestamp  int64                  `json:"timestamp"`
}

// ToErrorResponse converts an error to a standardized response format
func ToErrorResponse(err error, requestID string) *ErrorResponse {
	if err == nil {
		return nil
	}

	var authErr *AuthError
	if errors.As(err, &authErr) {
		return &ErrorResponse{
			Error: ErrorDetails{
				Code:      authErr.Code,
				Message:   authErr.Message,
				Details:   authErr.Details,
				RequestID: requestID,
				Timestamp: getCurrentTimestamp(),
			},
		}
	}

	// For non-AuthError, create a generic error response
	return &ErrorResponse{
		Error: ErrorDetails{
			Code:      ErrCodeInternalServer,
			Message:   err.Error(),
			RequestID: requestID,
			Timestamp: getCurrentTimestamp(),
		},
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

// getCurrentTimestamp returns the current Unix timestamp
func getCurrentTimestamp() int64 {
	// In a real implementation, this would use time.Now().Unix()
	// For now, returning a placeholder
	return 0
}

// WrapError wraps an error with additional context
func WrapError(err error, code ErrorCode, message string) *AuthError {
	if err == nil {
		return nil
	}

	var authErr *AuthError
	if errors.As(err, &authErr) {
		// If it's already an AuthError, preserve the original code but add context
		return &AuthError{
			Code:       authErr.Code,
			Message:    fmt.Sprintf("%s: %s", message, authErr.Message),
			Details:    authErr.Details,
			HTTPStatus: authErr.HTTPStatus,
			Cause:      authErr,
		}
	}

	// Wrap non-AuthError
	return NewSystemError(code, message, err)
}