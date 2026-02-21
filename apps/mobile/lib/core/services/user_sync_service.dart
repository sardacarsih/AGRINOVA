import '../database/enhanced_database_service.dart';
import '../models/jwt_models.dart';

/// Service to sync user data from login response to local SQLite database
/// This ensures that user data is available for foreign key relationships
class UserSyncService {
  late final EnhancedDatabaseService _db;

  UserSyncService() {
    _db = EnhancedDatabaseService();
  }

  /// Sync user data from login response to local database
  /// This is called after successful login to ensure user exists in local DB
  Future<void> syncUserDataToLocal(
      User user, Session? session, String companyId) async {
    try {
      print(
          '📱 UserSyncService: Starting user data sync for user: ${user.username}');

      // Start transaction to ensure data consistency
      await _db.transaction((txn) async {
        // 1. Ensure company exists first (required for user foreign key)
        await _ensureCompanyExists(txn, companyId, user.companyName);

        // 2. Insert or update user data
        await _upsertUser(txn, user, companyId);

        // 3. Insert or update user devices (only if session is available)
        if (session != null) {
          await _upsertUserDevice(txn, user.id, session);
        }

        print(
            '✅ UserSyncService: User data sync completed successfully for: ${user.username}');
      });
    } catch (e) {
      print(
          '❌ UserSyncService: Failed to sync user data to local database: $e');
      throw Exception('User data sync failed: $e');
    }
  }

  /// Ensure company exists in local database
  Future<void> _ensureCompanyExists(
      dynamic txn, String companyId, String? companyName) async {
    final existing = await txn.query(
      'companies',
      where: 'company_id = ?',
      whereArgs: [companyId],
      limit: 1,
    );

    if (existing.isEmpty) {
      final now = DateTime.now().millisecondsSinceEpoch;
      await txn.insert('companies', {
        'company_id': companyId,
        'code': companyName?.replaceAll(' ', '').toUpperCase() ?? 'UNKNOWN',
        'name': companyName ?? 'Unknown Company',
        'description': 'Company synced from login response',
        'is_active': 1,
        'created_at': now,
        'updated_at': now,
        'sync_status': 'SYNCED',
        'version': 1,
        'local_version': 1,
        'server_version': 1,
      });
      print('🏢 UserSyncService: Created company: $companyName ($companyId)');
    }
  }

  /// Insert or update user in local database
  Future<void> _upsertUser(dynamic txn, User user, String companyId) async {
    final userColumns = await _getTableColumns(txn, 'users');

    final existing = await txn.query(
      'users',
      where: 'user_id = ?',
      whereArgs: [user.id],
      limit: 1,
    );

    final now = DateTime.now().millisecondsSinceEpoch;

    // Debug logging to understand the data being inserted
    print('📱 UserSyncService: Syncing user data:');
    print('   - ID: ${user.id}');
    print('   - Username: ${user.username}');
    print('   - Full Name: ${user.fullName}');
    print('   - Email: ${user.email}');
    print('   - Role: ${user.role}');
    print('   - Company ID: $companyId');

    final userData = {
      'user_id': user.id ?? '', // Ensure non-null
      'username': user.username ?? 'unknown', // Ensure non-null
      'email': user.email ?? 'no-email@local.local', // Ensure non-null
      'phone': null, // Phone not available in current User model
      'full_name': user.fullName ??
          user.username ??
          'Unknown User', // Multiple fallbacks for safety
      'role': user.role ?? 'unknown', // Ensure non-null
      'company_id': companyId ?? '', // Ensure non-null
      'employee_id': null, // Employee ID not available in current User model
      'is_active': user.isActive ? 1 : 0,
      'last_login_at': now,
      'failed_login_attempts': 0,
      'account_locked_until': null,
      'two_factor_enabled': 0,
      'email_verified': 0, // Email verified not available in current model
      'must_change_password': user.mustChangePassword ? 1 : 0,
      'updated_at': now,
      'synced_at': now,
      'sync_status': 'SYNCED',
      'version': 1,
      'local_version': 1,
      'server_version': 1,
    };

    // Keep supervisor linkage in local DB using whichever schema is available.
    if (userColumns.contains('manager_id')) {
      userData['manager_id'] = user.managerId;
    }
    if (userColumns.contains('manager_name')) {
      userData['manager_name'] = user.managerName;
    }
    if (userColumns.contains('reporting_to_area_manager_id')) {
      userData['reporting_to_area_manager_id'] = user.managerId;
    }

    // Debug logging to verify final userData before insertion
    print('📱 UserSyncService: Final userData prepared for insertion:');
    print('   - user_id: ${userData['user_id']}');
    print('   - username: ${userData['username']}');
    print('   - email: ${userData['email']}');
    print('   - full_name: ${userData['full_name']}');
    print('   - role: ${userData['role']}');
    print('   - company_id: ${userData['company_id']}');

    if (existing.isEmpty) {
      // Insert new user
      userData['created_at'] = now;
      await txn.insert('users', userData);
      print('👤 UserSyncService: Created user in local DB: ${user.username}');
    } else {
      // Update existing user
      await txn.update(
        'users',
        userData,
        where: 'user_id = ?',
        whereArgs: [user.id],
      );
      print('🔄 UserSyncService: Updated user in local DB: ${user.username}');
    }
  }

  Future<Set<String>> _getTableColumns(dynamic txn, String tableName) async {
    final result = await txn.rawQuery('PRAGMA table_info($tableName)');
    return result
        .map((row) => row['name']?.toString().toLowerCase())
        .whereType<String>()
        .toSet();
  }

  /// Insert or update user device information
  Future<void> _upsertUserDevice(
      dynamic txn, String userId, Session session) async {
    final existing = await txn.query(
      'user_devices',
      where: 'user_id = ? AND device_id = ?',
      whereArgs: [userId, session.deviceId],
      limit: 1,
    );

    final now = DateTime.now().millisecondsSinceEpoch;
    final deviceData = {
      'user_id': userId,
      'device_id': session.deviceId,
      'device_name': 'Mobile Device', // Not available in current Session model
      'device_model':
          'Flutter Device', // Not available in current Session model
      'platform': 'ANDROID', // Not available in current Session model
      'os_version': 'flutter',
      'app_version': '1.0.0',
      'device_fingerprint': '', // Not available in current Session model
      'is_authorized': 1,
      'is_trusted': 0, // Device trusted not available in Session model
      'is_primary': 1,
      'is_active': 1,
      'last_seen_at': now,
      'authorized_at': now,
      'updated_at': now,
      'synced_at': now,
      'sync_status': 'SYNCED',
      'version': 1,
    };

    if (existing.isEmpty) {
      // Insert new device
      deviceData['registered_at'] = now;
      deviceData['created_at'] = now;
      await txn.insert('user_devices', deviceData);
      print(
          '📱 UserSyncService: Created user device in local DB: ${session.deviceId}');
    } else {
      // Update existing device
      await txn.update(
        'user_devices',
        deviceData,
        where: 'user_id = ? AND device_id = ?',
        whereArgs: [userId, session.deviceId],
      );
      print(
          '🔄 UserSyncService: Updated user device in local DB: ${session.deviceId}');
    }
  }

  /// Check if user exists in local database
  Future<bool> userExistsLocally(String userId) async {
    try {
      final result = await _db.query(
        'users',
        where: 'user_id = ? AND is_active = 1',
        whereArgs: [userId],
        limit: 1,
      );
      return result.isNotEmpty;
    } catch (e) {
      print('❌ UserSyncService: Error checking if user exists locally: $e');
      return false;
    }
  }

  /// Get local user data
  Future<Map<String, dynamic>?> getLocalUser(String userId) async {
    try {
      final result = await _db.query(
        'users',
        where: 'user_id = ? AND is_active = 1',
        whereArgs: [userId],
        limit: 1,
      );
      return result.isNotEmpty ? result.first : null;
    } catch (e) {
      print('❌ UserSyncService: Error getting local user data: $e');
      return null;
    }
  }

  /// Clean up old/unused user data
  Future<void> cleanupOldUserData() async {
    try {
      final cutoffTime = DateTime.now()
          .subtract(const Duration(days: 30))
          .millisecondsSinceEpoch;

      await _db.transaction((txn) async {
        // Mark old devices as inactive
        await txn.update(
          'user_devices',
          {
            'is_active': 0,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          },
          where: 'last_seen_at < ? AND is_active = 1',
          whereArgs: [cutoffTime],
        );

        // Clean up old JWT tokens
        await txn.delete(
          'jwt_tokens',
          where: 'expires_at < ? OR is_revoked = 1',
          whereArgs: [DateTime.now().millisecondsSinceEpoch],
        );
      });

      print('🧹 UserSyncService: User data cleanup completed');
    } catch (e) {
      print('❌ UserSyncService: Error during user data cleanup: $e');
    }
  }
}
