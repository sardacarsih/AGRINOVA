package services

// This file contains go:generate directives for generating test mocks.
//
// The mockery tool generates mock implementations of interfaces defined in this package.
// Mocks are generated in the './mocks' subdirectory and can be used in unit tests.
//
// Generated mock files:
//   - mocks/mock_event_broadcaster.go - Mock for EventBroadcaster interface
//
// To regenerate mocks:
//   - Run: go generate ./internal/panen/services
//   - Or: make gen-mocks
//   - Or: make gen-all (generates everything)
//
// The EventBroadcaster interface provides real-time event broadcasting for:
//   - Harvest record creation (PENDING status)
//   - Harvest record approval (APPROVED status)
//   - Harvest record rejection (REJECTED status)
//   - WebSocket notifications to connected clients
//
// Mock usage example:
//   import "agrinovagraphql/server/internal/panen/services/mocks"
//
//   func TestMyFunction(t *testing.T) {
//       mockBroadcaster := mocks.NewMockEventBroadcaster(t)
//       mockBroadcaster.EXPECT().OnHarvestRecordCreated(ctx, record).Return()
//       // ... test code
//   }

//go:generate go run github.com/vektra/mockery/v2 --name=EventBroadcaster --output=./mocks --outpkg=mocks --case=snake
