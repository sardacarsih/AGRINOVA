package services_test

import (
	"context"
	"testing"

	"agrinovagraphql/server/internal/master/services/mocks"
	"github.com/stretchr/testify/assert"
)

// Example test demonstrating how to use generated mocks
// This shows the workflow for using mockery-generated mocks with testify
func TestMasterService_GetCompanyByID(t *testing.T) {
	// Create mock service using generated mock
	mockService := mocks.NewMockMasterService(t)

	// Test data
	ctx := context.Background()
	companyID := "company-123"
	userID := "user-456"

	// Setup expectation - the mock should return nil company and nil error
	mockService.On("GetCompanyByID", ctx, companyID, userID).
		Return(nil, nil).
		Once()

	// Call the mocked method
	_, err := mockService.GetCompanyByID(ctx, companyID, userID)

	// Verify behavior
	assert.NoError(t, err)

	// Verify all expectations were met
	mockService.AssertExpectations(t)
}

// Example showing how mocks enable isolated unit testing
// You can test logic that depends on MasterService without actual database
func TestBusinessLogic_WithMockedService(t *testing.T) {
	mockService := mocks.NewMockMasterService(t)
	ctx := context.Background()

	// Setup expectations for multiple operations
	mockService.On("GetCompanies", ctx, (*interface{})(nil), "user-123").
		Return(nil, nil).
		Once()

	// Execute business logic that uses the service
	_, err := mockService.GetCompanies(ctx, nil, "user-123")

	// Verify
	assert.NoError(t, err)
	mockService.AssertExpectations(t)
}
