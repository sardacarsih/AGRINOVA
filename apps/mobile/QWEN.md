# Agrinova Mobile Application

## Project Overview

Agrinova is a comprehensive palm oil harvest management system with a Flutter-based mobile application designed for offline-first operation. The mobile app serves multiple roles in the palm oil production chain including Mandor (foreman), Asisten (assistant), Satpam (security), Manager, Area Manager, Company Admin, and Super Admin.

### Key Features

- **Offline-First Architecture**: Full functionality available even without internet connectivity
- **JWT Authentication**: Secure authentication with refresh tokens and offline token support
- **Role-Based Access Control**: Different dashboards and permissions based on user roles
- **Multi-Role Support**: Support for 7 distinct user roles with specific capabilities
- **SQLite Local Database**: Full local data storage with sync capabilities
- **Biometric Authentication**: Fingerprint and face recognition support
- **QR Code Scanning**: For gate check operations and visitor management
- **Real-time Sync**: Automatic synchronization when online
- **Device Management**: Device registration and trust management

## Technology Stack

- **Framework**: Flutter (Dart)
- **State Management**: Bloc/Cubit pattern
- **Database**: SQLite with sqflite package
- **Authentication**: JWT with refresh and offline tokens
- **Networking**: GraphQL with graphql_flutter
- **Storage**: flutter_secure_storage for sensitive data
- **Biometrics**: local_auth package
- **Connectivity**: connectivity_plus with internet_connection_checker
- **Dependency Injection**: get_it

## Project Structure

```
lib/
├── assets/                 # Images, icons, and other assets
├── core/                   # Core application functionality
│   ├── config/            # Application configuration
│   ├── constants/         # Application constants
│   ├── database/          # Database services and models
│   ├── di/                # Dependency injection setup
│   ├── error/             # Error handling
│   ├── graphql/           # GraphQL queries and mutations
│   ├── interceptors/       # Network interceptors
│   ├── models/            # Data models
│   ├── network/           # Network services
│   ├── repositories/       # Data repositories
│   ├── routes/            # Application routing
│   ├── services/           # Business logic services
│   ├── theme/             # UI themes
│   └── utils/             # Utility functions
├── features/               # Feature modules
│   ├── approval/          # Approval workflow
│   ├── auth/              # Authentication
│   ├── dashboard/         # Dashboard pages
│   ├── gate_check/        # Gate check operations
│   ├── harvest/           # Harvest management
│   ├── monitoring/        # Monitoring features
│   ├── profile/           # User profile
│   └── settings/          # Application settings
├── shared/                 # Shared components and utilities
└── main.dart              # Application entry point
```

## Authentication System

### JWT Token Management

The application uses a comprehensive JWT authentication system with three types of tokens:
- **Access Token**: Short-lived token for API access (15 minutes)
- **Refresh Token**: Longer-lived token to obtain new access tokens (7 days)
- **Offline Token**: Extended token for offline authentication (30 days)

### Login Flow

1. User enters credentials in the login form
2. Device information is collected (ID, fingerprint)
3. Login request is sent to GraphQL API
4. If successful, tokens are securely stored
5. User data is cached locally for offline access
6. Device is registered/trusted if needed

### Offline Authentication

When offline, the app can authenticate users using cached credentials:
1. Checks for valid offline token
2. Validates stored username/password hash
3. Retrieves cached user data
4. Creates mock login response with cached tokens

### Biometric Authentication

Users can enable biometric authentication for faster login:
1. Setup requires successful biometric verification
2. Enabled status is stored securely
3. Login can be performed with biometric authentication
4. Falls back to password if biometric fails

## Database Architecture

### Core Tables

The SQLite database contains tables for all application domains:

**Authentication & Security:**
- `users` - User information
- `jwt_tokens` - Stored JWT tokens
- `user_devices` - Registered devices
- `biometric_auth` - Biometric settings
- `offline_auth` - Offline authentication settings
- `security_events` - Security audit logs
- `used_tokens` - Used JWT tokens tracking
- `guest_tokens` - Guest access tokens
- `blacklisted_tokens` - Revoked tokens
- `access_logs` - Access audit trail
- `registered_users` - Pre-approved users

**Master Data:**
- `companies` - Company information
- `estates` - Estate information
- `divisions` - Division information
- `blocks` - Block information
- `employees` - Employee information

**User Assignments:**
- `user_estates` - User to estate assignments
- `user_divisions` - User to division assignments
- `area_manager_companies` - Area manager company access

**Harvest Operations:**
- `harvest_records` - Harvest entry records
- `harvest_employees` - Employees in harvest records
- `tbs_records` - TBS (Fresh Fruit Bunches) records

**Gate Check Operations:**
- `gate_check_records` - Gate check entries
- `gate_check_stats` - Gate statistics
- `qr_scan_history` - QR code scanning history
- `guest_logs` - Guest visitor logs
- `gate_check_photos` - Photos taken during gate checks

**Sync Management:**
- `sync_queue` - Pending sync operations
- `sync_conflicts` - Sync conflicts
- `sync_log` - Sync session tracking
- `sync_logs` - Individual sync operation logs

**System:**
- `notifications` - User notifications
- `system_settings` - Application settings
- `audit_trail` - General audit logs

### Offline-First Design

All data operations are performed locally first, then synchronized when online:
1. Data is stored in local SQLite database
2. Changes are queued for synchronization
3. Sync service processes queue when online
4. Conflicts are detected and resolved
5. Data is synchronized with central server

## Role-Based Access Control

### User Roles

1. **Mandor** (Foreman) - Field data collection
2. **Asisten** (Assistant) - Harvest approval
3. **Satpam** (Security) - Gate check operations
4. **Manager** - Estate-level management
5. **Area Manager** - Multi-estate oversight
6. **Company Admin** - Company administration
7. **Super Admin** - System-wide administration

### Role Permissions

Each role has specific permissions defined in AppConfig:
- Harvest input/viewing capabilities
- Approval workflow access
- Gate check operations
- QR scanner access
- User management
- Reporting and monitoring
- System administration

### Dashboard Customization

Dashboards are customized based on user roles:
- Different navigation items
- Role-specific features and widgets
- Customized quick stats
- Role-appropriate action buttons

## Network Management

### Connectivity Service

The app uses a comprehensive connectivity service that:
1. Monitors network status (online/offline)
2. Checks actual internet connectivity (not just network connection)
3. Provides real-time status updates
4. Handles connectivity changes gracefully
5. Supports manual connection checking

### Offline Mode

When offline, the app:
1. Continues to function with local data
2. Queues all data changes for sync
3. Shows offline status indicator
4. Allows authentication with cached credentials
5. Prevents operations requiring server communication

## Building and Running

### Prerequisites

- Flutter SDK 3.0.0 or higher
- Dart SDK 3.0.0 or higher
- Android Studio or Xcode for mobile development

### Setup

1. Clone the repository
2. Run `flutter pub get` to install dependencies
3. Ensure all required environment variables are set

### Running the App

```bash
# For development
flutter run

# For specific device
flutter run -d <device_id>

# Build for release
flutter build apk  # Android
flutter build ios  # iOS
```

### Environment Configuration

The app uses environment-specific configuration in `lib/core/config/app_config.dart`:
- Base URLs for API endpoints
- Token expiration times
- Database settings
- Feature flags
- Role definitions

## Development Conventions

### Code Structure

- Follows feature-first organization
- Uses dependency injection for service management
- Implements repository pattern for data access
- Uses BLoC pattern for state management
- Separates UI from business logic

### Naming Conventions

- Files: snake_case.dart
- Classes: PascalCase
- Methods: camelCase
- Constants: UPPER_SNAKE_CASE
- Variables: camelCase

### Testing

The app includes:
- Unit tests for business logic
- Widget tests for UI components
- Integration tests for critical flows

Run tests with:
```bash
flutter test
```

## Key Services

### AuthRepository

Handles all authentication logic:
- Online/offline login
- Token refresh
- Logout operations
- Biometric authentication
- Device trust management

### DatabaseService

Manages local data storage:
- Database initialization
- CRUD operations
- Query execution
- Transaction management

### ConnectivityService

Manages network connectivity:
- Status monitoring
- Online/offline detection
- Connection type identification

### JWTStorageService

Securely stores authentication tokens:
- Token encryption
- Secure storage using flutter_secure_storage
- Token validation and parsing
- User info caching

## Security Features

### Data Protection

- Sensitive data stored in encrypted shared preferences
- JWT tokens stored securely
- Biometric authentication support
- Device binding and trust management
- Token expiration and refresh handling

### Audit Trail

- Security events logging
- User activity tracking
- Access logs for gate operations
- Device registration tracking

### Token Management

- Blacklisted token tracking
- Used token validation
- Guest token management
- JWT payload validation

## Sync Architecture

### Sync Queue

All data changes are queued for synchronization:
- Create, update, delete operations
- Priority-based processing
- Retry mechanism for failures
- Dependency tracking

### Conflict Resolution

Handles sync conflicts:
- Version-based conflict detection
- Automatic resolution strategies
- Manual resolution when needed
- Conflict logging and reporting

### Offline Durations

Different roles have different offline capabilities:
- Mandor: 30 days
- Asisten: 14 days
- Satpam: 30 days
- Manager: 7 days
- Others: 1 day

## API Integration

### GraphQL Client

Uses graphql_flutter for API communication:
- Mutations for data changes
- Queries for data retrieval
- Subscription support for real-time updates
- Error handling and retry logic

### Auth Queries

Specific GraphQL operations for authentication:
- Login mutation
- Refresh token mutation
- Logout mutation
- Device registration
- Offline token validation

## Device Management

### Device Registration

Devices must be registered and trusted:
- Device fingerprinting
- Platform detection
- Registration status tracking
- Trust management

### Biometric Support

Platform-specific biometric authentication:
- Fingerprint recognition
- Face ID (iOS) / Face Unlock (Android)
- Fallback to PIN/pattern
- Biometric status tracking

## Performance Optimization

### Database Optimization

- Indexes on frequently queried fields
- Proper foreign key relationships
- Efficient query patterns
- Transaction usage for batch operations

### Memory Management

- Proper resource disposal
- Stream subscription cleanup
- Database connection management
- Image caching and compression

### Network Optimization

- Efficient sync batching
- Compression for large data transfers
- Smart retry mechanisms
- Bandwidth-aware operations

## Error Handling

### Authentication Errors

- Invalid credentials handling
- Token expiration management
- Network error recovery
- Device binding issues

### Database Errors

- Constraint violations
- Transaction failures
- Query execution errors
- Migration issues

### Network Errors

- Connection timeouts
- Server errors
- Data parsing failures
- Retry logic for transient errors

## Testing Strategy

### Unit Tests

- Business logic validation
- Service layer testing
- Model serialization/deserialization
- Utility function testing

### Widget Tests

- UI component behavior
- User interaction testing
- State management validation
- Navigation flow testing

### Integration Tests

- End-to-end flow validation
- Authentication workflows
- Data sync processes
- Offline/online transitions

## Deployment

### Release Process

1. Update version numbers
2. Run full test suite
3. Build release packages
4. Deploy to app stores
5. Update backend services if needed

### Environment-Specific Builds

- Development builds with debug features
- Staging builds for QA testing
- Production builds with optimizations

## Troubleshooting

### Common Issues

1. **Login failures** - Check network connectivity and credentials
2. **Sync issues** - Verify server availability and token validity
3. **Database errors** - Check storage space and permissions
4. **Biometric problems** - Ensure device support and permissions
5. **Offline mode issues** - Verify token expiration and cached data

### Debugging Features

- Detailed logging with logger package
- Auth status debugging
- Database inspection tools
- Network request monitoring
- Sync queue inspection

## Future Enhancements

### Planned Features

- Enhanced reporting capabilities
- Advanced analytics and dashboards
- Machine learning for yield prediction
- IoT integration for field sensors
- Advanced photo processing and OCR
- Voice command support
- Augmented reality for field operations

### Performance Improvements

- Database query optimization
- Image compression improvements
- Background sync efficiency
- Memory usage reduction
- Battery optimization