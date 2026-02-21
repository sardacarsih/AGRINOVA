import 'dart:convert';
import 'package:logger/logger.dart';
import '../database/enhanced_database_service.dart';
import 'device_service.dart';
import 'jwt_storage_service.dart';

/// Role-Based Sync Service for Agrinova Mobile App
/// 
/// Provides role-specific synchronization logic for:
/// - Mandor: Harvest data sync with priority
/// - Satpam: Gate check data sync with real-time priority  
/// - Manager: Monitoring data sync
/// 
/// Features:
/// - Role-specific sync priorities
/// - Context-aware sync operations
/// - Performance metrics per role
/// - Intelligent conflict resolution per role type
class RoleBasedSyncService {
  static final Logger _logger = Logger();
  final EnhancedDatabaseService _db;
  final JWTStorageService _jwtStorage;

  RoleBasedSyncService({
    required EnhancedDatabaseService database,
    required JWTStorageService jwtStorage,
  }) : _db = database,
       _jwtStorage = jwtStorage;

  /// Log role-specific sync operation
  Future<String> logRoleSync({
    required String userId,
    required String userRole,
    required String companyId,
    required String operationType,
    required String syncContext,
    required String tableName,
    int recordCount = 0,
    int syncPriority = 1,
    Map<String, dynamic>? roleSpecificMetrics,
  }) async {
    final syncLog = {
      'log_id': _generateLogId(),
      'device_id': await _getDeviceId(),
      'user_id': userId,
      'user_role': userRole,
      'company_id': companyId,
      'operation_type': operationType,
      'sync_context': syncContext,
      'table_name': tableName,
      'record_count': recordCount,
      'records_processed': 0,
      'records_successful': 0,
      'records_failed': 0,
      'conflicts_detected': 0,
      'conflicts_resolved': 0,
      'sync_priority': syncPriority,
      'sync_started_at': DateTime.now().millisecondsSinceEpoch,
      'sync_completed_at': null,
      'duration_ms': null,
      'status': 'STARTED',
      'error_message': null,
      'error_details': null,
      'network_type': await _getNetworkType(),
      'battery_level': await _getBatteryLevel(),
      'data_usage_kb': 0,
      'role_specific_metrics': roleSpecificMetrics != null ? jsonEncode(roleSpecificMetrics) : null,
      'created_at': DateTime.now().millisecondsSinceEpoch,
    };

    await _db.insert('sync_logs', syncLog);
    _logger.d('Started ${userRole} sync for ${syncContext}: ${syncLog['log_id']}');
    
    return syncLog['log_id'] as String;
  }

  /// Complete role-specific sync operation
  Future<void> completeRoleSync({
    required String logId,
    required int recordsProcessed,
    required int recordsSuccessful,
    required int recordsFailed,
    int conflictsDetected = 0,
    int conflictsResolved = 0,
    int dataUsageKb = 0,
    Map<String, dynamic>? roleSpecificMetrics,
  }) async {
    final syncCompletedAt = DateTime.now().millisecondsSinceEpoch;
    
    // Get sync start time to calculate duration
    final syncLog = await _db.query('sync_logs', where: 'log_id = ?', whereArgs: [logId]);
    if (syncLog.isEmpty) return;
    
    final syncStartedAt = syncLog.first['sync_started_at'] as int;
    final durationMs = syncCompletedAt - syncStartedAt;

    await _db.update(
      'sync_logs',
      {
        'records_processed': recordsProcessed,
        'records_successful': recordsSuccessful,
        'records_failed': recordsFailed,
        'conflicts_detected': conflictsDetected,
        'conflicts_resolved': conflictsResolved,
        'sync_completed_at': syncCompletedAt,
        'duration_ms': durationMs,
        'status': recordsFailed > 0 ? 'FAILED' : 'COMPLETED',
        'data_usage_kb': dataUsageKb,
        'role_specific_metrics': roleSpecificMetrics != null ? jsonEncode(roleSpecificMetrics) : null,
      },
      where: 'log_id = ?',
      whereArgs: [logId],
    );

    _logger.d('Completed sync $logId: $recordsSuccessful/$recordsProcessed successful');
  }

  /// Mark role-specific sync as failed
  Future<void> failRoleSync({
    required String logId,
    required String errorMessage,
    String? errorDetails,
    int recordsProcessed = 0,
    int recordsSuccessful = 0,
  }) async {
    final syncCompletedAt = DateTime.now().millisecondsSinceEpoch;
    
    // Get sync start time to calculate duration
    final syncLog = await _db.query('sync_logs', where: 'log_id = ?', whereArgs: [logId]);
    if (syncLog.isEmpty) return;
    
    final syncStartedAt = syncLog.first['sync_started_at'] as int;
    final durationMs = syncCompletedAt - syncStartedAt;

    await _db.update(
      'sync_logs',
      {
        'records_processed': recordsProcessed,
        'records_successful': recordsSuccessful,
        'records_failed': recordsProcessed - recordsSuccessful,
        'sync_completed_at': syncCompletedAt,
        'duration_ms': durationMs,
        'status': 'FAILED',
        'error_message': errorMessage,
        'error_details': errorDetails,
      },
      where: 'log_id = ?',
      whereArgs: [logId],
    );

    _logger.e('Failed sync $logId: $errorMessage');
  }

  /// Get role-specific sync statistics
  Future<Map<String, dynamic>> getRoleSyncStats(String userRole, String companyId) async {
    final result = await _db.query(
      'role_sync_status',
      where: 'user_role = ? AND company_id = ?',
      whereArgs: [userRole, companyId],
    );

    if (result.isEmpty) {
      return {
        'user_role': userRole,
        'company_id': companyId,
        'total_syncs': 0,
        'successful_syncs': 0,
        'failed_syncs': 0,
        'ongoing_syncs': 0,
        'avg_duration_ms': 0,
        'total_records_processed': 0,
        'total_records_successful': 0,
        'total_conflicts_detected': 0,
        'last_successful_sync': null,
      };
    }

    return Map<String, dynamic>.from(result.first);
  }

  /// Get Mandor harvest sync performance
  Future<Map<String, dynamic>> getMandorHarvestSyncStats(String mandorId) async {
    final result = await _db.query(
      'mandor_harvest_sync',
      where: 'user_id = ?',
      whereArgs: [mandorId],
    );

    if (result.isEmpty) {
      return {
        'user_id': mandorId,
        'harvest_sync_count': 0,
        'total_harvest_records': 0,
        'successful_harvest_records': 0,
        'avg_sync_duration': 0,
        'last_harvest_sync': null,
        'failed_harvest_syncs': 0,
      };
    }

    return Map<String, dynamic>.from(result.first);
  }

  /// Get Satpam gate check sync performance  
  Future<Map<String, dynamic>> getSatpamGateSyncStats(String satpamId) async {
    final result = await _db.query(
      'satpam_gate_sync',
      where: 'user_id = ?',
      whereArgs: [satpamId],
    );

    if (result.isEmpty) {
      return {
        'user_id': satpamId,
        'gate_sync_count': 0,
        'total_gate_records': 0,
        'successful_gate_records': 0,
        'avg_sync_duration': 0,
        'last_gate_sync': null,
        'failed_gate_syncs': 0,
      };
    }

    return Map<String, dynamic>.from(result.first);
  }

  /// Get recent sync operations by role
  Future<List<Map<String, dynamic>>> getRecentRoleSyncs({
    required String userRole,
    String? companyId,
    String? syncContext,
    int limit = 10,
  }) async {
    String whereClause = 'user_role = ?';
    List<dynamic> whereArgs = [userRole];

    if (companyId != null) {
      whereClause += ' AND company_id = ?';
      whereArgs.add(companyId);
    }

    if (syncContext != null) {
      whereClause += ' AND sync_context = ?';
      whereArgs.add(syncContext);
    }

    return await _db.query(
      'sync_logs',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'sync_started_at DESC',
      limit: limit,
    );
  }

  /// Get sync priority for role and context
  int getSyncPriority(String userRole, String syncContext) {
    // Priority levels: 1 = Lowest, 5 = Highest
    final priorityMatrix = {
      'mandor': {
        'HARVEST_DATA': 5,      // Critical for mandor operations
        'MASTER_DATA': 3,       // Important for validations
        'USER_DATA': 2,
        'MIXED': 3,
      },
      'satpam': {
        'GATE_CHECK_DATA': 5,   // Critical for satpam operations
        'MASTER_DATA': 4,       // Important for vehicle validations
        'USER_DATA': 2,
        'MIXED': 3,
      },
      'manager': {
        'APPROVAL_DATA': 4,
        'HARVEST_DATA': 4,
        'GATE_CHECK_DATA': 3,
        'MASTER_DATA': 3,
        'USER_DATA': 2,
        'MIXED': 3,
      },
    };

    return priorityMatrix[userRole]?[syncContext] ?? 1;
  }

  /// Helper methods
  String _generateLogId() {
    return 'sync_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
  }

  Future<String> _getDeviceId() async {
    return DeviceService.getDeviceId();
  }

  Future<String> _getNetworkType() async {
    // This would detect actual network type (WiFi, Mobile, etc.)
    return 'WIFI';
  }

  Future<int> _getBatteryLevel() async {
    // This would get actual battery level
    return 85;
  }
}

/// Sync operation status
enum RoleSyncStatus {
  started,
  completed,  
  failed,
  cancelled,
}

/// Sync context types for different roles
class SyncContext {
  static const String harvestData = 'HARVEST_DATA';
  static const String gateCheckData = 'GATE_CHECK_DATA';  
  static const String approvalData = 'APPROVAL_DATA';
  static const String masterData = 'MASTER_DATA';
  static const String userData = 'USER_DATA';
  static const String mixed = 'MIXED';
}

/// Role-specific sync metrics
class RoleSyncMetrics {
  static Map<String, dynamic> mandorMetrics({
    int? harvestCount,
    int? blocksCovered,
    double? totalWeight,
    int? employeesInvolved,
  }) {
    return {
      'harvest_count': harvestCount,
      'blocks_covered': blocksCovered,
      'total_weight': totalWeight,
      'employees_involved': employeesInvolved,
    };
  }

  static Map<String, dynamic> satpamMetrics({
    int? vehicleEntries,
    int? vehicleExits,
    int? guestRegistrations,
    int? qrScansProcessed,
  }) {
    return {
      'vehicle_entries': vehicleEntries,
      'vehicle_exits': vehicleExits,
      'guest_registrations': guestRegistrations,
      'qr_scans_processed': qrScansProcessed,
    };
  }
}
