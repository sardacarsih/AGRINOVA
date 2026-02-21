package services

// This file contains go:generate directives for generating test mocks.
//
// The mockery tool generates mock implementations of interfaces defined in this package.
// Mocks are generated in the './mocks' subdirectory and can be used in unit tests.
//
// Generated mock files:
//   - mocks/mock_notification_creator.go      - Mock for NotificationCreator interface
//   - mocks/mock_subscription_event_sender.go - Mock for SubscriptionEventSender interface
//
// To regenerate mocks:
//   - Run: go generate ./internal/websocket/services
//   - Or: make gen-mocks
//   - Or: make gen-all (generates everything)
//
// The NotificationCreator interface provides notification creation for:
//   - Database notification persistence
//   - WebSocket real-time notification delivery
//
// The SubscriptionEventSender interface provides GraphQL subscription event broadcasting for:
//   - WebSocket-based real-time updates
//   - Role-based event filtering
//   - Connection management
//
// Mock usage example:
//   import "agrinovagraphql/server/internal/websocket/services/mocks"
//
//   func TestMyFunction(t *testing.T) {
//       mockCreator := mocks.NewMockNotificationCreator(t)
//       mockCreator.EXPECT().CreateNotification(ctx, notification).Return(nil)
//       // ... test code
//   }

//go:generate go run github.com/vektra/mockery/v2 --name=NotificationCreator --output=./mocks --outpkg=mocks --case=snake
//go:generate go run github.com/vektra/mockery/v2 --name=SubscriptionEventSender --output=./mocks --outpkg=mocks --case=snake
