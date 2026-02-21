package services

// This file contains go:generate directives for generating test mocks.
//
// The mockery tool generates mock implementations of interfaces defined in this package.
// Mocks are generated in the './mocks' subdirectory and can be used in unit tests.
//
// Generated mock files:
//   - mocks/mock_master_service.go - Mock for MasterService interface
//
// To regenerate mocks:
//   - Run: go generate ./internal/master/services
//   - Or: make gen-mocks
//   - Or: make gen-all (generates everything)
//
// The MasterService interface provides CRUD operations for:
//   - Companies, Estates, Divisions, Blocks
//   - Users and their assignments
//   - TPH (Tempat Pengumpulan Hasil) locations
//   - Employees and organizational data
//
// Mock usage example:
//   import "agrinovagraphql/server/internal/master/services/mocks"
//
//   func TestMyFunction(t *testing.T) {
//       mockService := mocks.NewMockMasterService(t)
//       mockService.EXPECT().GetCompanyByID(ctx, 1).Return(company, nil)
//       // ... test code
//   }

//go:generate go run github.com/vektra/mockery/v2 --name=MasterService --output=./mocks --outpkg=mocks --case=snake
