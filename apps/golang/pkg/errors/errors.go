package errors

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Domain error types
type ErrorType string

const (
	ErrorTypeValidation     ErrorType = "VALIDATION_ERROR"
	ErrorTypeAuthentication ErrorType = "AUTHENTICATION_ERROR"
	ErrorTypeAuthorization  ErrorType = "AUTHORIZATION_ERROR"
	ErrorTypeNotFound       ErrorType = "NOT_FOUND_ERROR"
	ErrorTypeConflict       ErrorType = "CONFLICT_ERROR"
	ErrorTypeInternal       ErrorType = "INTERNAL_ERROR"
	ErrorTypeDatabase       ErrorType = "DATABASE_ERROR"
	ErrorTypeSyncConflict   ErrorType = "SYNC_CONFLICT_ERROR"
)

// DomainError represents a domain-specific error
type DomainError struct {
	Type    ErrorType `json:"type"`
	Message string    `json:"message"`
	Details string    `json:"details,omitempty"`
	Code    int       `json:"code"`
}

func (e *DomainError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s (%s)", e.Type, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// Error constructors for each domain
func NewValidationError(message, details string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeValidation,
		Message: message,
		Details: details,
		Code:    http.StatusBadRequest,
	}
}

func NewAuthenticationError(message string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeAuthentication,
		Message: message,
		Code:    http.StatusUnauthorized,
	}
}

func NewAuthorizationError(message string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeAuthorization,
		Message: message,
		Code:    http.StatusForbidden,
	}
}

func NewNotFoundError(resource string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeNotFound,
		Message: fmt.Sprintf("%s not found", resource),
		Code:    http.StatusNotFound,
	}
}

func NewConflictError(message, details string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeConflict,
		Message: message,
		Details: details,
		Code:    http.StatusConflict,
	}
}

func NewInternalError(message string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeInternal,
		Message: message,
		Code:    http.StatusInternalServerError,
	}
}

func NewDatabaseError(details string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeDatabase,
		Message: "Database operation failed",
		Details: details,
		Code:    http.StatusInternalServerError,
	}
}

func NewSyncConflictError(message, details string) *DomainError {
	return &DomainError{
		Type:    ErrorTypeSyncConflict,
		Message: message,
		Details: details,
		Code:    http.StatusConflict,
	}
}

// HTTP Response Helper Functions
func SendUnauthorizedError(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, gin.H{
		"error":   "unauthorized",
		"message": message,
	})
}

func SendValidationError(c *gin.Context, message string, details ...interface{}) {
	response := gin.H{
		"error":   "validation_error",
		"message": message,
	}
	if len(details) > 0 {
		response["details"] = details[0]
	}
	c.JSON(http.StatusBadRequest, response)
}

func SendNotFoundError(c *gin.Context, resource string) {
	c.JSON(http.StatusNotFound, gin.H{
		"error":   "not_found",
		"message": fmt.Sprintf("%s not found", resource),
	})
}

func SendInternalError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, gin.H{
		"error":   "internal_error",
		"message": message,
	})
}

func SendForbiddenError(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "forbidden",
		"message": message,
	})
}
