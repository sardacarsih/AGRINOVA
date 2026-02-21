import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';
import '../services/device_service.dart';

/// Database Sync Service for Agrinova Mobile App
/// 
/// Handles all synchronization operations, authentication management,
/// and conflict resolution for the offline-first architecture.
class DatabaseSyncService {
  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();

  // =============================================================================
  // SYNC MANAGEMENT
  // =============================================================================

  Future<void> addToSyncQueue(Database db, {
    required String operationType,
    required String tableName,
    required String recordId,
    required Map<String, dynamic> data,
    int priority = 1,
    String? userId,
  }) async {
    final operationId = _uuid.v4();
    final deviceId = await _getDeviceId();
    
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('sync_queue', {
      'operation_id': operationId,
      'operation_type': operationType,
      'table_name': tableName,
      'record_id': recordId,
      'server_record_id': null,  // Add missing column
      'data': jsonEncode(data),
      'dependencies': null,  // Add missing column
      'priority': priority,
      'retry_count': 0,  // Add missing column with default value
      'max_retries': 3,  // Add missing column with default value
      'last_error': null,  // Add missing column
      'error_details': null,  // Add missing column
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'scheduled_at': null,  // Add missing column
      'started_at': null,  // Add missing column
      'completed_at': null,  // Add missing column
      'user_id': userId,
      'device_id': deviceId,
      'status': 'PENDING',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingSyncOperations(Database db, {int limit = 50}) async {
    return await db.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['PENDING'],
      orderBy: 'priority DESC, created_at ASC',
      limit: limit,
    );
  }

  Future<void> markSyncOperationCompleted(Database db, String operationId, {String? serverRecordId}) async {
    await db.update('sync_queue', {
      'status': 'COMPLETED',
      'completed_at': DateTime.now().millisecondsSinceEpoch,
      'server_record_id': serverRecordId,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    }, 
    where: 'operation_id = ?', 
    whereArgs: [operationId]);
  }

  Future<void> markSyncOperationFailed(Database db, String operationId, String error) async {
    await db.execute(
      'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?, status = ?, scheduled_at = ?, updated_at = ? WHERE operation_id = ?',
      [
        error, 
        'FAILED', 
        DateTime.now().add(const Duration(minutes: 5)).millisecondsSinceEpoch,
        DateTime.now().millisecondsSinceEpoch,
        operationId
      ],
    );
  }

  Future<void> createSyncConflict(Database db, {
    required String tableName,
    required String recordId,
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    required String conflictType,
    required String userId,
  }) async {
    final conflictId = _uuid.v4();
    final deviceId = await _getDeviceId();
    
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('sync_conflicts', {
      'conflict_id': conflictId,
      'table_name': tableName,
      'record_id': recordId,
      'server_record_id': null,  // Add missing column
      'local_data': jsonEncode(localData),
      'server_data': jsonEncode(serverData),
      'conflict_type': conflictType,
      'conflict_fields': null,  // Add missing column
      'resolution_strategy': null,  // Add missing column
      'resolution_data': null,  // Add missing column
      'resolved_by': null,  // Add missing column
      'resolved_at': null,  // Add missing column
      'auto_resolvable': 0,  // Add missing column with default value
      'user_id': userId,
      'device_id': deviceId,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'status': 'PENDING',  // Add missing column
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingConflicts(Database db, {String? userId}) async {
    final where = userId != null ? 'status = ? AND user_id = ?' : 'status = ?';
    final whereArgs = userId != null ? ['PENDING', userId] : ['PENDING'];
    
    return await db.query(
      'sync_conflicts',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'created_at ASC',
    );
  }

  Future<void> resolveSyncConflict(Database db, String conflictId, String resolutionStrategy, {String? resolvedBy}) async {
    await db.update('sync_conflicts', {
      'status': 'RESOLVED',  // Update status to RESOLVED instead of resolved = 1
      'resolved_at': DateTime.now().millisecondsSinceEpoch,
      'resolution_strategy': resolutionStrategy,
      'resolved_by': resolvedBy,
    },
    where: 'conflict_id = ?',
    whereArgs: [conflictId]);
  }

  // =============================================================================
  // AUTHENTICATION & SECURITY
  // =============================================================================

  Future<void> storeJWTToken(Database db, {
    required String userId,
    required String tokenType,
    required String tokenHash,
    required String deviceId,
    required String deviceFingerprint,
    required DateTime expiresAt,
    String? appVersion,
  }) async {
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('jwt_tokens', {
      'user_id': userId,
      'token_type': tokenType,
      'token_hash': tokenHash,
      'device_id': deviceId,
      'device_fingerprint': deviceFingerprint,
      'expires_at': expiresAt.millisecondsSinceEpoch,
      'is_active': 1,  // Add missing column with default value
      'is_revoked': 0,  // Add missing column with default value
      'revoked_at': null,  // Add missing column
      'app_version': appVersion,
      'platform': 'FLUTTER',  // Add missing column with default value
      'last_used_at': DateTime.now().millisecondsSinceEpoch,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Map<String, dynamic>?> getValidJWTToken(Database db, String userId, String tokenType) async {
    final tokens = await db.query(
      'jwt_tokens',
      where: 'user_id = ? AND token_type = ? AND is_active = 1 AND is_revoked = 0 AND expires_at > ?',
      whereArgs: [userId, tokenType, DateTime.now().millisecondsSinceEpoch],
      orderBy: 'created_at DESC',
      limit: 1,
    );
    
    return tokens.isNotEmpty ? tokens.first : null;
  }

  Future<void> revokeJWTTokens(Database db, String userId, {String? tokenType}) async {
    final where = tokenType != null ? 'user_id = ? AND token_type = ?' : 'user_id = ?';
    final whereArgs = tokenType != null ? [userId, tokenType] : [userId];
    
    await db.update('jwt_tokens', {
      'is_revoked': 1,
      'revoked_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    }, 
    where: where, 
    whereArgs: whereArgs);
  }

  Future<void> updateTokenLastUsed(Database db, String tokenHash) async {
    await db.update('jwt_tokens', {
      'last_used_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'token_hash = ?',
    whereArgs: [tokenHash]);
  }

  Future<void> cleanupExpiredTokens(Database db) async {
    final expiredCount = await db.delete(
      'jwt_tokens',
      where: 'expires_at < ?',
      whereArgs: [DateTime.now().millisecondsSinceEpoch],
    );
    
    if (expiredCount > 0) {
      _logger.d('Cleaned up $expiredCount expired tokens');
    }
  }

  // =============================================================================
  // DEVICE MANAGEMENT
  // =============================================================================

  Future<void> registerDevice(Database db, {
    required String userId,
    required String deviceId,
    required String deviceName,
    required String deviceModel,
    required String platform,
    required String osVersion,
    required String appVersion,
    required String deviceFingerprint,
    String? fcmToken,
  }) async {
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('user_devices', {
      'user_id': userId,
      'device_id': deviceId,
      'device_name': deviceName,
      'device_model': deviceModel,
      'platform': platform,
      'os_version': osVersion,
      'app_version': appVersion,
      'device_fingerprint': deviceFingerprint,
      'is_authorized': 0,  // Add missing column with default value
      'is_trusted': 0,  // Add missing column with default value
      'is_primary': 0,  // Add missing column with default value
      'is_active': 1,  // Add missing column with default value
      'fcm_token': fcmToken,
      'push_notifications_enabled': 1,  // Add missing column with default value
      'authorized_at': null,  // Add missing column
      'revoked_at': null,  // Add missing column
      'revoked_reason': null,  // Add missing column
      'biometric_enabled': 0,  // Add missing column with default value
      'pin_enabled': 0,  // Add missing column with default value
      'last_seen_at': DateTime.now().millisecondsSinceEpoch,
      'registered_at': DateTime.now().millisecondsSinceEpoch,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'synced_at': null,  // Add missing column
      'sync_status': 'PENDING',  // Add missing column with default value
      'version': 1,  // Add missing column with default value
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateDeviceLastSeen(Database db, String deviceId) async {
    await db.update('user_devices', {
      'last_seen_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'device_id = ?',
    whereArgs: [deviceId]);
  }

  Future<Map<String, dynamic>?> getDeviceInfo(Database db, String deviceId) async {
    final devices = await db.query(
      'user_devices',
      where: 'device_id = ? AND is_active = 1',
      whereArgs: [deviceId],
      limit: 1,
    );
    
    return devices.isNotEmpty ? devices.first : null;
  }

  Future<void> revokeDevice(Database db, String deviceId, String reason, {String? revokedBy}) async {
    await db.update('user_devices', {
      'is_active': 0,
      'revoked_at': DateTime.now().millisecondsSinceEpoch,
      'revoked_reason': reason,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'device_id = ?',
    whereArgs: [deviceId]);

    // Also revoke all tokens for this device
    await revokeDeviceTokens(db, deviceId);
  }

  Future<void> revokeDeviceTokens(Database db, String deviceId) async {
    await db.update('jwt_tokens', {
      'is_revoked': 1,
      'revoked_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'device_id = ?',
    whereArgs: [deviceId]);
  }

  // =============================================================================
  // SECURITY EVENTS
  // =============================================================================

  Future<void> logSecurityEvent(Database db, {
    String? userId,
    required String eventType,
    required String severity,
    required String description,
    Map<String, dynamic>? metadata,
    String? deviceId,
  }) async {
    final actualDeviceId = deviceId ?? await _getDeviceId();
    
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('security_events', {
      'user_id': userId,
      'device_id': actualDeviceId,
      'event_type': eventType,
      'severity': severity,
      'description': description,
      'metadata': metadata != null ? jsonEncode(metadata) : null,
      'ip_address': null,  // Add missing column
      'platform': 'FLUTTER',
      'is_resolved': 0,  // Add missing column with default value
      'resolved_at': null,  // Add missing column
      'occurred_at': DateTime.now().millisecondsSinceEpoch,
      'synced_at': null,
      'sync_status': 'PENDING',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getSecurityEvents(Database db, {
    String? userId,
    String? severity,
    int? limit,
    DateTime? since,
  }) async {
    String where = '1=1';
    final whereArgs = <dynamic>[];

    if (userId != null) {
      where += ' AND user_id = ?';
      whereArgs.add(userId);
    }

    if (severity != null) {
      where += ' AND severity = ?';
      whereArgs.add(severity);
    }

    if (since != null) {
      where += ' AND occurred_at >= ?';
      whereArgs.add(since.millisecondsSinceEpoch);
    }

    return await db.query(
      'security_events',
      where: where,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'occurred_at DESC',
      limit: limit,
    );
  }

  Future<void> markSecurityEventResolved(Database db, String eventId, {String? resolvedBy}) async {
    await db.update('security_events', {
      'is_resolved': 1,
      'resolved_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'id = ?',
    whereArgs: [eventId]);
  }

  // =============================================================================
  // OFFLINE AUTHENTICATION
  // =============================================================================

  Future<void> setupOfflineAuth(Database db, {
    required String userId,
    required String offlineTokenHash,
    String? offlinePinHash,
    int offlineDurationDays = 30,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final expiresAt = DateTime.now().add(Duration(days: offlineDurationDays)).millisecondsSinceEpoch;

    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('offline_auth', {
      'user_id': userId,
      'offline_token_hash': offlineTokenHash,
      'offline_pin_hash': offlinePinHash,
      'offline_enabled': 1,
      'offline_duration_days': offlineDurationDays,
      'last_sync_at': now,
      'offline_expires_at': expiresAt,
      'max_offline_attempts': 5,  // Add missing column with default value
      'current_offline_attempts': 0,
      'offline_locked_until': null,  // Add missing column
      'created_at': now,
      'updated_at': now,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Map<String, dynamic>?> getOfflineAuth(Database db, String userId) async {
    final result = await db.query(
      'offline_auth',
      where: 'user_id = ? AND offline_enabled = 1 AND offline_expires_at > ?',
      whereArgs: [userId, DateTime.now().millisecondsSinceEpoch],
      limit: 1,
    );

    return result.isNotEmpty ? result.first : null;
  }

  Future<void> incrementOfflineAttempts(Database db, String userId) async {
    await db.execute(
      'UPDATE offline_auth SET current_offline_attempts = current_offline_attempts + 1, updated_at = ? WHERE user_id = ?',
      [DateTime.now().millisecondsSinceEpoch, userId],
    );
  }

  Future<void> resetOfflineAttempts(Database db, String userId) async {
    await db.update('offline_auth', {
      'current_offline_attempts': 0,
      'offline_locked_until': null,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'user_id = ?',
    whereArgs: [userId]);
  }

  Future<void> lockOfflineAuth(Database db, String userId, Duration lockDuration) async {
    final lockUntil = DateTime.now().add(lockDuration).millisecondsSinceEpoch;
    
    await db.update('offline_auth', {
      'offline_locked_until': lockUntil,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'user_id = ?',
    whereArgs: [userId]);
  }

  Future<void> disableOfflineAuth(Database db, String userId) async {
    await db.update('offline_auth', {
      'offline_enabled': 0,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'user_id = ?',
    whereArgs: [userId]);
  }

  // =============================================================================
  // NOTIFICATION MANAGEMENT
  // =============================================================================

  Future<String> createNotification(Database db, {
    required String userId,
    required String title,
    required String message,
    required String type,
    String category = 'GENERAL',
    int priority = 1,
    bool isPersistent = false,
    bool actionRequired = false,
    String? actionType,
    Map<String, dynamic>? actionData,
    DateTime? scheduledAt,
    DateTime? expiresAt,
    String? relatedRecordType,
    String? relatedRecordId,
  }) async {
    final notificationId = _uuid.v4();
    
    // Don't set 'id' manually - let SQLite AUTOINCREMENT handle it
    await db.insert('notifications', {
      'notification_id': notificationId,
      'user_id': userId,
      'type': type,
      'title': title,
      'body': message,  // Use 'body' instead of 'message' to match schema
      'data': actionData != null ? jsonEncode(actionData) : null,
      'priority': priority == 1 ? 'NORMAL' : priority == 2 ? 'HIGH' : priority >= 3 ? 'URGENT' : 'LOW',  // Convert to TEXT enum
      'category': category,
      'channels': null,  // Add missing column
      'is_read': 0,  // Add missing column with default value
      'read_at': null,  // Add missing column
      'is_delivered': 0,  // Add missing column with default value
      'delivered_at': null,  // Add missing column
      'schedule_at': scheduledAt?.millisecondsSinceEpoch,  // Use 'schedule_at' to match schema
      'expires_at': expiresAt?.millisecondsSinceEpoch,
      'action_url': null,  // Add missing column
      'related_record_type': relatedRecordType,
      'related_record_id': relatedRecordId,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'synced_at': null,  // Add missing column
      'sync_status': 'PENDING',  // Add missing column
    }, conflictAlgorithm: ConflictAlgorithm.replace);

    return notificationId;
  }

  Future<List<Map<String, dynamic>>> getUserNotifications(Database db, String userId, {
    bool unreadOnly = false,
    int? limit,
    String? category,
  }) async {
    String where = 'user_id = ?';
    final whereArgs = <dynamic>[userId];

    if (unreadOnly) {
      where += ' AND is_read = 0';
    }

    if (category != null) {
      where += ' AND category = ?';
      whereArgs.add(category);
    }

    // Don't show expired notifications
    where += ' AND (expires_at IS NULL OR expires_at > ?)';
    whereArgs.add(DateTime.now().millisecondsSinceEpoch);

    return await db.query(
      'notifications',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'priority DESC, created_at DESC',
      limit: limit,
    );
  }

  Future<void> markNotificationAsRead(Database db, String notificationId) async {
    await db.update('notifications', {
      'is_read': 1,
      'read_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: 'notification_id = ?',
    whereArgs: [notificationId]);
  }

  Future<void> markAllNotificationsAsRead(Database db, String userId, {String? category}) async {
    String where = 'user_id = ? AND is_read = 0';
    final whereArgs = [userId];

    if (category != null) {
      where += ' AND category = ?';
      whereArgs.add(category);
    }

    await db.update('notifications', {
      'is_read': 1,
      'read_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    },
    where: where,
    whereArgs: whereArgs);
  }

  Future<int> getUnreadNotificationCount(Database db, String userId, {String? category}) async {
    String where = 'user_id = ? AND is_read = 0';
    final whereArgs = <dynamic>[userId];

    if (category != null) {
      where += ' AND category = ?';
      whereArgs.add(category);
    }

    // Don't count expired notifications
    where += ' AND (expires_at IS NULL OR expires_at > ?)';
    whereArgs.add(DateTime.now().millisecondsSinceEpoch);

    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM notifications WHERE $where',
      whereArgs,
    );

    return (result.first['count'] as int?) ?? 0;
  }

  Future<void> cleanupExpiredNotifications(Database db) async {
    final expiredCount = await db.delete(
      'notifications',
      where: 'expires_at IS NOT NULL AND expires_at < ? AND is_persistent = 0',
      whereArgs: [DateTime.now().millisecondsSinceEpoch],
    );

    if (expiredCount > 0) {
      _logger.d('Cleaned up $expiredCount expired notifications');
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  Future<String> _getDeviceId() async {
    return await DeviceService.getDeviceId();
  }

  Future<Map<String, dynamic>> getSyncStats(Database db) async {
    final stats = <String, dynamic>{};

    try {
      // Pending sync operations
      final pendingSync = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_queue WHERE status = ?',
        ['PENDING']
      );
      stats['pending_sync'] = pendingSync.first['count'] ?? 0;

      // Failed sync operations
      final failedSync = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_queue WHERE status = ?',
        ['FAILED']
      );
      stats['failed_sync'] = failedSync.first['count'] ?? 0;

      // Completed sync operations (last 24 hours)
      final yesterday = DateTime.now().subtract(const Duration(days: 1)).millisecondsSinceEpoch;
      final completedSync = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_queue WHERE status = ? AND completed_at > ?',
        ['COMPLETED', yesterday]
      );
      stats['completed_sync_24h'] = completedSync.first['count'] ?? 0;

      // Pending conflicts
      final pendingConflicts = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_conflicts WHERE status = ?',
        ['PENDING']
      );
      stats['pending_conflicts'] = pendingConflicts.first['count'] ?? 0;

      // High priority pending operations
      final highPrioritySync = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_queue WHERE status = ? AND priority >= ?',
        ['PENDING', 3]
      );
      stats['high_priority_pending'] = highPrioritySync.first['count'] ?? 0;

    } catch (e) {
      stats['error'] = e.toString();
      _logger.e('Error getting sync stats', error: e);
    }

    return stats;
  }

  Future<void> cleanupCompletedSyncOperations(Database db, {int keepDays = 7}) async {
    final cutoffDate = DateTime.now().subtract(Duration(days: keepDays)).millisecondsSinceEpoch;
    
    final deletedCount = await db.delete(
      'sync_queue',
      where: 'status = ? AND completed_at < ?',
      whereArgs: ['COMPLETED', cutoffDate],
    );

    if (deletedCount > 0) {
      _logger.d('Cleaned up $deletedCount completed sync operations older than $keepDays days');
    }
  }

  Future<void> retryFailedSyncOperations(Database db, {int maxRetries = 3}) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    
    final updatedCount = await db.rawUpdate(
      'UPDATE sync_queue SET status = ?, scheduled_at = ? WHERE status = ? AND retry_count < ? AND (scheduled_at IS NULL OR scheduled_at <= ?)',
      ['PENDING', now, 'FAILED', maxRetries, now],
    );

    if (updatedCount > 0) {
      _logger.d('Retried $updatedCount failed sync operations');
    }
  }
}