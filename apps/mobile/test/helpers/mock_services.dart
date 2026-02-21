import 'package:mocktail/mocktail.dart';

import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/services/jwt_storage_service.dart';
import 'package:agrinova_mobile/core/services/sync_service.dart';
import 'package:agrinova_mobile/core/network/dio_client.dart';
import 'package:agrinova_mobile/features/harvest/data/repositories/harvest_repository.dart';
import 'package:agrinova_mobile/features/gate_check/data/repositories/enhanced_gate_check_repository.dart';
import 'package:agrinova_mobile/features/approval/data/repositories/approval_repository.dart';
import 'package:agrinova_mobile/features/auth/data/repositories/auth_repository.dart';

/// Mock services for testing

// Core Services
class MockDatabaseService extends Mock implements DatabaseService {}

class MockJwtStorageService extends Mock implements JwtStorageService {}

class MockSyncService extends Mock implements SyncService {}

class MockDioClient extends Mock implements DioClient {}

// Repository Mocks
class MockHarvestRepository extends Mock implements HarvestRepository {}

class MockGateCheckRepository extends Mock implements EnhancedGateCheckRepository {}

class MockApprovalRepository extends Mock implements ApprovalRepository {}

class MockAuthRepository extends Mock implements AuthRepository {}

// Navigation Mock
class MockNavigatorObserver extends Mock implements NavigatorObserver {}

/// Mock data providers for consistent test data
class MockDataProvider {
  /// Mock harvest data
  static Map<String, dynamic> get mockHarvestData => {
    'id': 'harvest-001',
    'employeeId': 'emp-001',
    'employeeName': 'John Doe',
    'employeeCode': 'EMP001',
    'blockId': 'block-001',
    'blockName': 'Block A1',
    'divisionId': 'div-001',
    'divisionName': 'Division 1',
    'estateId': 'estate-001',
    'estateName': 'Estate One',
    'companyId': 'company-001',
    'companyName': 'Test Company',
    'tbsQuantity': 1500.0,
    'qualityGrade': 'A',
    'harvestDate': '2024-01-15T08:00:00.000Z',
    'notes': 'Test harvest notes',
    'photos': ['photo1.jpg', 'photo2.jpg'],
    'location': {
      'latitude': -6.2088,
      'longitude': 106.8456,
      'accuracy': 5.0,
    },
    'status': 'PENDING',
    'createdBy': 'mandor-001',
    'createdAt': '2024-01-15T08:00:00.000Z',
    'updatedAt': '2024-01-15T08:00:00.000Z',
    'syncStatus': 'PENDING',
  };

  /// Mock gate check data
  static Map<String, dynamic> get mockGateCheckData => {
    'id': 'gate-001',
    'licensePlate': 'B 1234 ABC',
    'driverName': 'Driver Name',
    'blockId': 'block-001',
    'blockName': 'Block A1',
    'estateId': 'estate-001',
    'estateName': 'Estate One',
    'doNumber': 'DO123456',
    'entryTime': '2024-01-15T09:00:00.000Z',
    'exitTime': null,
    'estimatedWeight': 5000.0,
    'actualWeight': null,
    'status': 'ENTRY',
    'notes': 'Test gate check notes',
    'photos': ['truck1.jpg'],
    'qrCode': 'QR123456',
    'createdBy': 'satpam-001',
    'createdAt': '2024-01-15T09:00:00.000Z',
    'updatedAt': '2024-01-15T09:00:00.000Z',
    'syncStatus': 'PENDING',
  };

  /// Mock approval data
  static Map<String, dynamic> get mockApprovalData => {
    'id': 'approval-001',
    'harvestId': 'harvest-001',
    'employeeId': 'emp-001',
    'employeeName': 'John Doe',
    'employeeCode': 'EMP001',
    'blockId': 'block-001',
    'blockName': 'Block A1',
    'divisionId': 'div-001',
    'divisionName': 'Division 1',
    'estateId': 'estate-001',
    'estateName': 'Estate One',
    'tbsQuantity': 1500.0,
    'qualityGrade': 'A',
    'harvestDate': '2024-01-15T08:00:00.000Z',
    'notes': 'Test harvest notes',
    'status': 'PENDING',
    'submittedAt': '2024-01-15T08:00:00.000Z',
    'approvedAt': null,
    'rejectedAt': null,
    'approvedBy': null,
    'rejectedBy': null,
    'approvalNotes': null,
    'rejectionNotes': null,
    'createdAt': '2024-01-15T08:00:00.000Z',
    'updatedAt': '2024-01-15T08:00:00.000Z',
  };

  /// Mock user data
  static Map<String, dynamic> get mockUserData => {
    'id': 'user-001',
    'username': 'testuser',
    'name': 'Test User',
    'email': 'test@example.com',
    'role': 'mandor',
    'companyId': 'company-001',
    'companyName': 'Test Company',
    'estateId': 'estate-001',
    'estateName': 'Estate One',
    'divisionId': 'div-001',
    'divisionName': 'Division 1',
    'isActive': true,
    'permissions': ['harvest:create', 'harvest:read'],
    'createdAt': '2024-01-01T00:00:00.000Z',
    'updatedAt': '2024-01-15T00:00:00.000Z',
  };

  /// Mock employee data
  static List<Map<String, dynamic>> get mockEmployeeList => [
    {
      'id': 'emp-001',
      'code': 'EMP001',
      'name': 'John Doe',
      'position': 'Harvester',
      'divisionId': 'div-001',
      'divisionName': 'Division 1',
      'isActive': true,
    },
    {
      'id': 'emp-002',
      'code': 'EMP002',
      'name': 'Jane Smith',
      'position': 'Harvester',
      'divisionId': 'div-001',
      'divisionName': 'Division 1',
      'isActive': true,
    },
  ];

  /// Mock block data
  static List<Map<String, dynamic>> get mockBlockList => [
    {
      'id': 'block-001',
      'code': 'BLK001',
      'name': 'Block A1',
      'divisionId': 'div-001',
      'divisionName': 'Division 1',
      'estateId': 'estate-001',
      'estateName': 'Estate One',
      'area': 25.5,
      'isActive': true,
    },
    {
      'id': 'block-002',
      'code': 'BLK002',
      'name': 'Block A2',
      'divisionId': 'div-001',
      'divisionName': 'Division 1',
      'estateId': 'estate-001',
      'estateName': 'Estate One',
      'area': 30.0,
      'isActive': true,
    },
  ];

  /// Mock JWT tokens
  static Map<String, String> get mockJwtTokens => {
    'accessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'refreshToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'offlineToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  };

  /// Mock dashboard stats
  static Map<String, dynamic> get mockDashboardStats => {
    'totalHarvest': 150.5,
    'harvestTrend': 'up',
    'pendingApproval': 5,
    'approvalTrend': 'down',
    'gateCheckCount': 12,
    'gateCheckTrend': 'stable',
    'productivity': 85.2,
    'productivityTrend': 'up',
  };

  /// Mock sync status
  static Map<String, dynamic> get mockSyncStatus => {
    'isOnline': true,
    'lastSyncTime': '2024-01-15T10:30:00.000Z',
    'pendingUploads': 3,
    'syncInProgress': false,
    'conflictsCount': 0,
  };

  /// Mock device info
  static Map<String, dynamic> get mockDeviceInfo => {
    'deviceId': 'test-device-001',
    'platform': 'android',
    'model': 'Test Phone',
    'osVersion': '13',
    'appVersion': '1.0.0',
    'isJailbroken': false,
    'isTrusted': true,
  };
}

/// Mock response helpers
class MockResponseHelper {
  /// Create success response
  static Map<String, dynamic> successResponse({
    dynamic data,
    String message = 'Success',
  }) {
    return {
      'success': true,
      'message': message,
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Create error response
  static Map<String, dynamic> errorResponse({
    String message = 'Error occurred',
    String code = 'UNKNOWN_ERROR',
    int statusCode = 500,
    dynamic details,
  }) {
    return {
      'success': false,
      'error': {
        'message': message,
        'code': code,
        'statusCode': statusCode,
        'details': details,
      },
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Create paginated response
  static Map<String, dynamic> paginatedResponse({
    required List<dynamic> data,
    int page = 1,
    int limit = 20,
    int? total,
  }) {
    final totalItems = total ?? data.length;
    final totalPages = (totalItems / limit).ceil();

    return {
      'success': true,
      'data': data,
      'pagination': {
        'page': page,
        'limit': limit,
        'total': totalItems,
        'totalPages': totalPages,
        'hasNext': page < totalPages,
        'hasPrev': page > 1,
      },
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}

/// Mock behavior configurations
class MockBehaviorConfig {
  /// Configure mock harvest repository with default behaviors
  static void configureHarvestRepository(MockHarvestRepository mock) {
    // Setup default successful responses
    when(() => mock.getAllHarvests()).thenAnswer(
      (_) async => [MockDataProvider.mockHarvestData],
    );

    when(() => mock.createHarvest(any())).thenAnswer(
      (_) async => 'harvest-001',
    );

    when(() => mock.updateHarvest(any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.deleteHarvest(any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.getHarvestById(any())).thenAnswer(
      (_) async => MockDataProvider.mockHarvestData,
    );

    when(() => mock.getEmployees()).thenAnswer(
      (_) async => MockDataProvider.mockEmployeeList,
    );

    when(() => mock.getBlocks()).thenAnswer(
      (_) async => MockDataProvider.mockBlockList,
    );
  }

  /// Configure mock gate check repository with default behaviors
  static void configureGateCheckRepository(MockGateCheckRepository mock) {
    when(() => mock.getAllGateChecks()).thenAnswer(
      (_) async => [MockDataProvider.mockGateCheckData],
    );

    when(() => mock.createGateCheck(any())).thenAnswer(
      (_) async => 'gate-001',
    );

    when(() => mock.updateGateCheck(any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.getTruckByLicensePlate(any())).thenAnswer(
      (_) async => MockDataProvider.mockGateCheckData,
    );

    when(() => mock.generateQRCode(any())).thenAnswer(
      (_) async => 'QR123456',
    );
  }

  /// Configure mock approval repository with default behaviors
  static void configureApprovalRepository(MockApprovalRepository mock) {
    when(() => mock.getPendingApprovals()).thenAnswer(
      (_) async => [MockDataProvider.mockApprovalData],
    );

    when(() => mock.approveHarvest(any(), any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.rejectHarvest(any(), any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.getApprovalHistory()).thenAnswer(
      (_) async => [MockDataProvider.mockApprovalData],
    );
  }

  /// Configure mock auth repository with default behaviors
  static void configureAuthRepository(MockAuthRepository mock) {
    when(() => mock.login(any(), any())).thenAnswer(
      (_) async => {
        'user': MockDataProvider.mockUserData,
        'tokens': MockDataProvider.mockJwtTokens,
      },
    );

    when(() => mock.refreshToken(any())).thenAnswer(
      (_) async => MockDataProvider.mockJwtTokens,
    );

    when(() => mock.logout()).thenAnswer(
      (_) async {},
    );

    when(() => mock.getCurrentUser()).thenAnswer(
      (_) async => MockDataProvider.mockUserData,
    );

    when(() => mock.validateBiometric()).thenAnswer(
      (_) async => true,
    );
  }

  /// Configure mock sync service with default behaviors
  static void configureSyncService(MockSyncService mock) {
    when(() => mock.syncAll()).thenAnswer(
      (_) async {},
    );

    when(() => mock.getSyncStatus()).thenAnswer(
      (_) async => MockDataProvider.mockSyncStatus,
    );

    when(() => mock.isOnline()).thenAnswer(
      (_) => true,
    );

    when(() => mock.getPendingUploads()).thenAnswer(
      (_) async => 3,
    );
  }

  /// Configure mock JWT storage service with default behaviors
  static void configureJwtStorageService(MockJwtStorageService mock) {
    when(() => mock.storeTokens(any(), any(), any())).thenAnswer(
      (_) async {},
    );

    when(() => mock.getAccessToken()).thenAnswer(
      (_) async => MockDataProvider.mockJwtTokens['accessToken'],
    );

    when(() => mock.getRefreshToken()).thenAnswer(
      (_) async => MockDataProvider.mockJwtTokens['refreshToken'],
    );

    when(() => mock.getOfflineToken()).thenAnswer(
      (_) async => MockDataProvider.mockJwtTokens['offlineToken'],
    );

    when(() => mock.clearTokens()).thenAnswer(
      (_) async {},
    );

    when(() => mock.hasValidTokens()).thenAnswer(
      (_) async => true,
    );
  }
}