# Debug Authentication Diagnostic Tool

## Overview

A comprehensive diagnostic tool for testing authentication with specific credentials (satpam/demo123) in the Agrinova Flutter mobile app. This tool is designed to help troubleshoot authentication issues in development environments, particularly with USB Android devices using ADB reverse tunneling.

## Features

### 1. **Comprehensive Test Suite**
The diagnostic tool runs 8 different test categories:

- **System Information**: Environment and configuration validation
- **Network Connectivity**: Connection to GraphQL server via ADB reverse
- **GraphQL Server Health**: Schema introspection and endpoint availability
- **Device Information**: Device fingerprinting and binding validation
- **Database Functionality**: SQLite operations and PRAGMA configuration
- **GraphQL Authentication**: mobileLogin mutation testing with satpam/demo123
- **JWT Token Storage**: Secure storage read/write operations
- **Offline Token Validation**: Offline authentication capability testing

### 2. **Real-time Progress Tracking**
- Live test execution progress
- Individual test status indicators
- Detailed timing information
- Expandable result cards with full details

### 3. **Diagnostic Report Generation**
- Complete test results summary
- Copy-to-clipboard functionality
- Detailed error logging and troubleshooting tips
- Formatted output for easy sharing

## Access Instructions

### For Debug Mode Only
1. Ensure app is running in debug mode (`ApiConstants.isDebugMode = true`)
2. Navigate to the login page
3. Look for the debug section at the bottom
4. Click **"Auth Debug"** button to open the diagnostic tool

### Alternative Access (Development)
The debug page can also be accessed programmatically:
```dart
Navigator.of(context).push(
  MaterialPageRoute(
    builder: (context) => const DebugAuthPage(),
  ),
);
```

## Default Test Credentials

- **Username**: `satpam`
- **Password**: `demo123`
- **Platform**: `ANDROID`
- **Expected Role**: `SATPAM`

These credentials can be modified in the diagnostic UI before running tests.

## Test Details

### 1. System Information Test
Validates the development environment:
- Platform detection (Android/iOS)
- Debug mode verification
- Base URL configuration
- GraphQL endpoint setup
- App version information

### 2. Network Connectivity Test
Tests connection to the GraphQL server:
- ADB reverse tunnel verification (localhost:8080)
- Health endpoint accessibility
- Network status detection
- Connection timeout handling

### 3. GraphQL Server Health Test
Validates GraphQL server functionality:
- Schema introspection query execution
- mobileLogin mutation availability check
- GraphQL endpoint response validation
- Error handling for server issues

### 4. Device Information Test
Verifies device data collection:
- Device ID generation
- Device fingerprint creation
- Platform information gathering
- Hardware details collection

### 5. Database Functionality Test
Tests SQLite database operations:
- Database initialization
- Table creation and CRUD operations
- PRAGMA configuration validation
- Android compatibility verification

### 6. GraphQL Authentication Test
Tests complete authentication flow:
- mobileLogin mutation execution
- Token generation and validation
- User role verification
- Assignment data retrieval
- Device binding confirmation

### 7. JWT Token Storage Test
Validates secure token management:
- Token storage operations
- Secure retrieval functionality
- Flutter Secure Storage validation
- Token cleanup verification

### 8. Offline Token Validation Test
Tests offline authentication capability:
- Offline token presence check
- Validation mutation execution
- Expiration date verification
- Device trust level confirmation

## Troubleshooting Guide

### Common Issues and Solutions

#### Network Connection Failures
- **Issue**: Cannot connect to GraphQL server
- **Solution**: Verify ADB reverse tunnel: `adb reverse tcp:8080 tcp:8080`
- **Check**: Ensure GraphQL server is running on localhost:8080

#### Authentication Failures
- **Issue**: satpam/demo123 credentials rejected
- **Solution**: Verify user exists in database with correct password
- **Check**: Review server logs for authentication error details

#### Database Issues
- **Issue**: SQLite PRAGMA errors on Android
- **Solution**: Database service includes Android-compatible fallbacks
- **Check**: Verify app has proper storage permissions

#### GraphQL Schema Errors
- **Issue**: mobileLogin mutation not found
- **Solution**: Ensure GraphQL server has latest schema
- **Check**: Verify server is running the correct version

#### Token Storage Problems
- **Issue**: Secure storage operations failing
- **Solution**: Check app permissions and device capabilities
- **Check**: Verify Flutter Secure Storage plugin configuration

## Implementation Files

### Core Service
- `/lib/core/services/debug_auth_service.dart` - Main diagnostic service
- `/lib/core/utils/auth_debug_helper.dart` - Updated helper with GraphQL support

### User Interface
- `/lib/features/auth/presentation/pages/debug_auth_page.dart` - Diagnostic UI
- `/lib/features/auth/presentation/pages/login_page.dart` - Updated with debug access

### Dependencies
- Integrates with existing service locator pattern
- Uses GraphQL client service for authentication tests
- Leverages database service for SQLite validation
- Connects to JWT storage service for token tests

## Usage Tips

1. **Run Tests in Order**: The diagnostic tool runs tests sequentially for dependency validation
2. **Check Network First**: Ensure network connectivity before running authentication tests
3. **Review Details**: Expand test result cards to see detailed information
4. **Copy Reports**: Use the copy button to share diagnostic information
5. **Clear Results**: Use the clear button to reset test results

## Security Considerations

- **Debug Mode Only**: Tool is only accessible in debug mode
- **Test Credentials**: Uses predefined test credentials (satpam/demo123)
- **No Production Use**: Disabled in production builds
- **Secure Cleanup**: Test tokens are properly cleaned up after testing

## Development Notes

The diagnostic tool is designed specifically for:
- USB Android development with ADB reverse tunneling
- GraphQL authentication system testing
- Offline-first architecture validation
- Device binding and trust management verification

This tool significantly reduces authentication troubleshooting time and provides comprehensive visibility into the authentication system's health and configuration.