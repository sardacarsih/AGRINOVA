# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 📱 Agrinova Mobile App (Flutter)

Offline-first Flutter application for palm oil management with JWT authentication, biometric security, and enterprise-grade offline synchronization capabilities.

## 🔧 Development Commands

### Flutter Development
```bash
# Get dependencies
flutter pub get

# Run app on connected device/emulator
flutter run

# Run app on specific device
flutter run -d <device-id>

# Build for Android (debug)
flutter build apk --debug

# Build for Android (release)
flutter build apk --release

# Build for iOS
flutter build ios

# Run tests
flutter test

# Generate code (for json_serializable, retrofit, hive)
dart run build_runner build

# Generate code with conflict resolution
dart run build_runner build --delete-conflicting-outputs

# Clean build cache
flutter clean && flutter pub get

# Analyze code
flutter analyze

# Format code
dart format .
```

### Android-Specific Commands
```bash
# Build Android APK with specific flavor
flutter build apk --flavor dev --debug

# Install APK directly
flutter install

# View Android logs
flutter logs

# Launch Android emulator
flutter emulators --launch <emulator-name>
```

### Code Generation Commands
```bash
# Generate JSON serialization code
dart run build_runner build --build-filter="lib/core/models/*.dart"

# Generate Retrofit API clients
dart run build_runner build --build-filter="lib/**/data/services/*.dart"

# Generate Hive type adapters
dart run build_runner build --build-filter="lib/**/models/*.dart"

# Watch for changes and auto-generate
dart run build_runner watch
```

## 🏗️ Architecture Overview

### Clean Architecture + Feature-First Structure
```
lib/
├── core/                          # Shared infrastructure
│   ├── config/app_config.dart     # Application configuration constants
│   ├── di/                        # Dependency injection setup (GetIt)
│   ├── models/                    # Shared data models with JWT support
│   ├── network/dio_client.dart    # HTTP client with JWT interceptor
│   ├── routes/app_routes.dart     # Navigation routes with role-based routing
│   ├── services/                  # Core business services
│   │   ├── jwt_storage_service.dart    # Secure JWT token management
│   │   ├── database_service.dart      # SQLite offline-first storage
│   │   ├── device_service.dart        # Device fingerprinting & trust
│   │   ├── sync_service.dart          # Background synchronization
│   │   ├── role_service.dart          # Role-based access control
│   │   └── notification_service.dart  # Push notifications (Firebase)
│   └── theme/app_theme.dart       # Material 3 design system
├── features/                      # Feature modules (Clean Architecture)
│   ├── auth/
│   │   ├── data/                  # Repositories, API services, local storage
│   │   ├── domain/                # Entities, use cases, repository interfaces
│   │   └── presentation/          # BLoC, pages, widgets
│   ├── dashboard/                 # Role-specific dashboards
│   ├── harvest/                   # Harvest input and management
│   ├── gate_check/               # Gate check with QR scanning
│   ├── approval/                 # Approval workflow
│   ├── monitoring/               # Data monitoring and reporting
│   └── profile/                  # User profile management
├── shared/                       # Shared UI components and utilities
└── main.dart                     # App entry point with initialization
```

### State Management Architecture
- **BLoC Pattern**: All features use flutter_bloc for state management
- **Repository Pattern**: Data layer abstraction with online/offline implementations
- **Dependency Injection**: GetIt service locator pattern
- **Event-Driven**: BLoC events trigger state changes and side effects

### Security Architecture
- **JWT Authentication**: Standard JSON Web Tokens with 30-day offline validity
- **Flutter Secure Storage**: Hardware-backed token storage (Keystore/Keychain)
- **Biometric Authentication**: local_auth integration with fingerprint/Face ID
- **Device Binding**: Multi-factor device fingerprinting for anti-hijacking
- **Offline Security**: Encrypted credential storage with SQLite

### Offline-First Implementation
- **SQLite Database**: Local storage with automatic schema migrations
- **Sync Engine**: Background synchronization with conflict resolution
- **Connectivity Service**: Network state monitoring and queue management
- **30-Day Offline**: Extended JWT validity for field operations
- **Data Integrity**: Optimistic updates with server reconciliation

## 🔐 Authentication & Security

### JWT Token Management
The app uses a three-tier JWT system:
- **Access Token**: 15-minute validity for API requests
- **Refresh Token**: 7-day validity for token renewal
- **Offline Token**: 30-day validity for offline operations

### Device Security Layers
1. **Device Fingerprinting**: Unique device identification using device_info_plus
2. **Hardware Storage**: Flutter Secure Storage with Android Keystore/iOS Keychain
3. **Biometric Lock**: Optional biometric authentication with local_auth
4. **Device Trust**: Reduced friction for verified trusted devices
5. **Security Logging**: Comprehensive audit trails for compliance

### Role-Based Access Control
- **Mandor**: Harvest input, offline synchronization
- **Asisten**: Approval workflow, division monitoring
- **Satpam**: Gate check, QR scanning, truck logging
- **Manager**: Estate monitoring, reporting, multi-estate assignment
- **Area Manager**: Cross-estate oversight, manager reports
- **Company Admin**: User management, estate configuration
- **Super Admin**: Multi-company access, system administration

## 📱 Key Features & Implementation

### Offline-First Capabilities
- **SQLite Database**: Local persistence with migration support
- **Background Sync**: Automatic data synchronization when online
- **Conflict Resolution**: Server-authoritative conflict resolution
- **Queue Management**: Offline action queue with retry logic
- **Data Validation**: Local validation with server verification

### Real-time Features
- **Firebase Messaging**: Push notifications with JWT device binding
- **Local Notifications**: flutter_local_notifications integration
- **Sync Notifications**: Real-time sync status and conflict alerts
- **Role-based Notifications**: Targeted messaging by user role

### Hardware Integration
- **Camera**: Multi-camera support with permission management
- **Location**: GPS tracking with background location updates
- **QR Scanner**: mobile_scanner for gate check and asset tracking
- **Biometrics**: Hardware-backed biometric authentication
- **Connectivity**: Real-time network state monitoring

## 🧪 Testing Strategy

### Test Structure
```bash
test/
├── unit/                    # Unit tests for business logic
├── widget/                  # Widget tests for UI components
├── integration/             # Integration tests for flows
└── mocks/                   # Mock implementations for testing
```

### Testing Commands
```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/unit/auth/auth_bloc_test.dart

# Run tests with coverage
flutter test --coverage

# Generate coverage report
genhtml coverage/lcov.info -o coverage/html

# Run integration tests
flutter test integration_test/
```

## 🔄 Data Synchronization

### Sync Architecture
- **Bidirectional Sync**: Local ↔ Server data synchronization
- **Optimistic Updates**: Local-first with server reconciliation  
- **Conflict Resolution**: Last-write-wins with manual resolution for critical data
- **Batch Operations**: Efficient bulk sync operations
- **Delta Sync**: Only sync changed data since last sync

### Sync Triggers
- **Manual Sync**: Pull-to-refresh and explicit sync buttons
- **Connection Sync**: Automatic sync when network connectivity restored
- **Background Sync**: Background app refresh for data consistency (every 15 minutes when backgrounded)

## 🎨 UI/UX Guidelines

### Design System
- **Material 3**: Latest Material Design with dynamic theming
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Accessibility**: Screen reader support and accessibility semantics
- **Dark Mode**: System-responsive light/dark theme switching
- **Custom Fonts**: Inter font family for consistency

### Key UI Components
- **Role-based Dashboards**: Customized interfaces per user role
- **Form Components**: reactive_forms with validation
- **Data Visualization**: fl_chart and syncfusion_flutter_charts
- **Loading States**: flutter_spinkit with consistent loading indicators
- **Error Handling**: Comprehensive error states with user-friendly messages

## 🚀 Build & Deployment

### Build Configurations
```bash
# Development build with debug symbols
flutter build apk --debug --flavor dev

# Staging build for internal testing  
flutter build apk --release --flavor staging

# Production build for app store
flutter build apk --release --flavor production
```

### Environment Configuration
- **Development**: localhost API, debug logging enabled
- **Staging**: staging API, limited logging
- **Production**: production API, error reporting only

### Release Process
1. Update version in `pubspec.yaml`
2. Generate release notes
3. Build release APK: `flutter build apk --release`
4. Test on physical devices
5. Upload to internal testing (Google Play Console)
6. Promote to production after QA approval

## 🔍 Debugging & Development

### Debugging Tools
```bash
# Launch with debug tools
flutter run --debug

# Profile mode for performance analysis
flutter run --profile

# DevTools for advanced debugging
flutter pub global activate devtools
flutter pub global run devtools

# Inspector for widget tree analysis
flutter inspector

# Performance profiling
flutter run --profile --trace-startup
```

### Common Issues & Solutions

**Build Issues:**
- Run `flutter clean && flutter pub get` for dependency issues
- Check Android SDK versions in `android/app/build.gradle`
- Verify Flutter/Dart SDK versions match project requirements

**JWT Issues:**
- Check secure storage permissions in AndroidManifest.xml
- Verify JWT token format and expiration in debug logs
- Test offline token validation with network disabled

**Sync Issues:**
- Monitor sync service logs for database conflicts
- Check network connectivity service status
- Verify API endpoint accessibility and response format

**Performance Issues:**
- Use Flutter DevTools for performance profiling
- Monitor memory usage during long offline sessions
- Check SQLite query performance for large datasets

## 📋 Development Workflow

### Code Standards
- **Linting**: flutter_lints for code quality enforcement
- **Formatting**: dart format with 80-character line limit
- **Architecture**: Feature-first Clean Architecture pattern
- **State Management**: BLoC pattern for all stateful features
- **Error Handling**: Comprehensive error types with user messaging

### Git Workflow
- **Feature Branches**: Create feature branches from main
- **Code Review**: All changes require review before merge
- **Testing**: Unit tests required for business logic
- **Documentation**: Update relevant documentation with changes

### Performance Considerations
- **Memory Management**: Proper disposal of controllers and streams
- **Database Optimization**: Efficient SQLite queries with indexing
- **Image Handling**: cached_network_image for efficient image loading
- **Background Processing**: Isolates for CPU-intensive operations
- **Battery Optimization**: Efficient location and sync strategies