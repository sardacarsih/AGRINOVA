package domain

import "fmt"

// AppError represents a domain error
type AppError struct {
	Code    string
	Message string
	Field   string
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewAppError creates a new domain error
func NewAppError(code, message, field string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Field:   field,
	}
}

// Common error codes
const (
	ErrHarvestNotFound        = "HARVEST_NOT_FOUND"
	ErrInvalidMandor          = "INVALID_MANDOR"
	ErrInvalidBlock           = "INVALID_BLOCK"
	ErrHarvestAlreadyApproved = "HARVEST_ALREADY_APPROVED"
	ErrHarvestAlreadyRejected = "HARVEST_ALREADY_REJECTED"
	ErrInvalidApprover        = "INVALID_APPROVER"
	ErrCannotModifyApproved   = "CANNOT_MODIFY_APPROVED"
)
