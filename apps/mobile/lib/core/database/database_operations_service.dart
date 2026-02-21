import 'package:sqflite/sqflite.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

/// Database Operations Service for Agrinova Mobile App
/// 
/// Handles all CRUD operations and role-specific database interactions.
/// This includes generic operations, role-specific methods for Mandor, Satpam,
/// and other users, as well as photo storage and data management.
class DatabaseOperationsService {
  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();

  // Generic insert with conflict resolution
  Future<String> insertWithId(Database db, String table, Map<String, dynamic> values) async {
    try {
      // ALL tables use AUTOINCREMENT for 'id' field - let SQLite handle it
      // Only set business UUID keys like 'user_id', 'guest_id', 'harvest_id', etc.
      
      values['created_at'] = DateTime.now().millisecondsSinceEpoch;
      values['updated_at'] = DateTime.now().millisecondsSinceEpoch;
      
      final insertedRowId = await db.insert(table, values, conflictAlgorithm: ConflictAlgorithm.replace);
      _logger.d('Inserted record into $table with auto-generated row ID: $insertedRowId');
      
      // Return the business UUID for the specific table
      // Each table has its own business ID field
      String businessId;
      switch (table) {
        case 'gate_guest_logs':
          businessId = values['guest_id'] as String;
          break;
        case 'harvest_records':
          businessId = values['harvest_id'] as String;
          break;
        case 'gate_check_records':
          businessId = values['gate_check_id'] as String;
          break;
        case 'gate_qr_scan_history':
          businessId = values['scan_id'] as String;
          break;
        case 'harvest_employees':
          // For harvest_employees, we'll return the auto-generated row ID as string
          businessId = insertedRowId.toString();
          break;
        case 'gate_check_photos':
          businessId = values['photo_id'] as String;
          break;
        default:
          // For other tables, return the auto-generated row ID
          businessId = insertedRowId.toString();
          break;
      }
      
      return businessId;
    } catch (e) {
      _logger.e('Error inserting into $table', error: e);
      rethrow;
    }
  }

  // Batch insert for performance
  Future<List<String>> batchInsert(Database db, String table, List<Map<String, dynamic>> valuesList) async {
    try {
      final batch = db.batch();
      final businessIds = <String>[];
      
      for (var values in valuesList) {
        // Don't set 'id' - let SQLite AUTOINCREMENT handle it
        values['created_at'] = DateTime.now().millisecondsSinceEpoch;
        values['updated_at'] = DateTime.now().millisecondsSinceEpoch;
        
        batch.insert(table, values, conflictAlgorithm: ConflictAlgorithm.replace);
        
        // Extract the business ID based on table type
        String businessId;
        switch (table) {
          case 'gate_guest_logs':
            businessId = values['guest_id'] as String;
            break;
          case 'harvest_records':
            businessId = values['harvest_id'] as String;
            break;
          case 'gate_check_records':
            businessId = values['gate_check_id'] as String;
            break;
          case 'gate_qr_scan_history':
            businessId = values['scan_id'] as String;
            break;
          case 'gate_check_photos':
            businessId = values['photo_id'] as String;
            break;
          default:
            // For tables without business IDs, generate a UUID for tracking
            businessId = _uuid.v4();
            break;
        }
        businessIds.add(businessId);
      }
      
      await batch.commit(noResult: true);
      _logger.d('Batch inserted ${valuesList.length} records into $table');
      return businessIds;
    } catch (e) {
      _logger.e('Error batch inserting into $table', error: e);
      rethrow;
    }
  }

  // Update with version control
  Future<int> updateWithVersion(Database db, String table, Map<String, dynamic> values, String whereClause, List<dynamic> whereArgs) async {
    try {
      values['updated_at'] = DateTime.now().millisecondsSinceEpoch;
      
      // Increment local version for conflict resolution
      if (values.containsKey('local_version')) {
        values['local_version'] = (values['local_version'] as int? ?? 1) + 1;
      }
      
      final count = await db.update(table, values, where: whereClause, whereArgs: whereArgs);
      _logger.d('Updated $count records in $table');
      return count;
    } catch (e) {
      _logger.e('Error updating $table', error: e);
      rethrow;
    }
  }

  // Soft delete (mark as inactive)
  Future<int> softDelete(Database db, String table, String whereClause, List<dynamic> whereArgs) async {
    try {
      final values = {
        'is_active': 0,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      };
      
      final count = await db.update(table, values, where: whereClause, whereArgs: whereArgs);
      _logger.d('Soft deleted $count records from $table');
      return count;
    } catch (e) {
      _logger.e('Error soft deleting from $table', error: e);
      rethrow;
    }
  }

  // =============================================================================
  // ROLE-SPECIFIC DATABASE OPERATIONS
  // =============================================================================

  // Mandor Operations
  Future<String> createHarvestRecord(Database db, Map<String, dynamic> harvestData, Function(Map<String, dynamic>) addToSyncQueue) async {
    final harvestId = _uuid.v4();
    harvestData['harvest_id'] = harvestId;
    harvestData['status'] = 'PENDING';
    harvestData['sync_status'] = 'PENDING';
    harvestData['needs_sync'] = 1;
    
    await insertWithId(db, 'harvest_records', harvestData);
    
    // Add to sync queue
    await addToSyncQueue({
      'operationType': 'CREATE',
      'tableName': 'harvest_records',
      'recordId': harvestId,
      'data': harvestData,
      'priority': 2, // High priority for harvest data
    });
    
    return harvestId;
  }

  Future<void> addHarvestEmployee(Database db, String harvestId, Map<String, dynamic> employeeData) async {
    employeeData['harvest_id'] = harvestId;
    await insertWithId(db, 'harvest_employees', employeeData);
  }

  Future<List<Map<String, dynamic>>> getHarvestRecordsByMandor(Database db, String mandorId) async {
    return await db.query(
      'harvest_records',
      where: 'mandor_id = ? AND is_active = 1',
      whereArgs: [mandorId],
      orderBy: 'harvest_date DESC',
    );
  }

  // Satpam Operations
  Future<String> createGateCheckRecord(Database db, Map<String, dynamic> gateCheckData, Function(Map<String, dynamic>) addToSyncQueue, {String? username}) async {
    final gateCheckId = _uuid.v4();
    gateCheckData['gate_check_id'] = gateCheckId;
    gateCheckData['status'] = 'ENTERING';
    gateCheckData['sync_status'] = 'PENDING';
    gateCheckData['needs_sync'] = 1;
    
    // Add username for audit trail
    if (username != null) {
      gateCheckData['username'] = username;
    }
    
    await insertWithId(db, 'gate_check_records', gateCheckData);
    
    // Add to sync queue
    await addToSyncQueue({
      'operationType': 'CREATE',
      'tableName': 'gate_check_records',
      'recordId': gateCheckId,
      'data': gateCheckData,
      'priority': 2,
    });
    
    return gateCheckId;
  }

  Future<void> updateGateCheckExit(Database db, String gateCheckId, Map<String, dynamic> exitData) async {
    exitData['exit_time'] = DateTime.now().millisecondsSinceEpoch;
    exitData['status'] = 'EXIT';
    exitData['needs_sync'] = 1;
    
    await updateWithVersion(
      db,
      'gate_check_records',
      exitData,
      'gate_check_id = ?',
      [gateCheckId],
    );
  }

  Future<String> recordQRScan(Database db, String userId, Map<String, dynamic> scanData) async {
    final scanId = _uuid.v4();
    scanData['scan_id'] = scanId;
    scanData['user_id'] = userId;
    scanData['scanned_at'] = DateTime.now().millisecondsSinceEpoch;
    
    await insertWithId(db, 'gate_qr_scan_history', scanData);
    return scanId;
  }

  Future<List<Map<String, dynamic>>> getGateCheckRecordsByCompany(Database db, String companyId) async {
    return await db.query(
      'gate_check_records',
      where: 'company_id = ?',
      whereArgs: [companyId],
      orderBy: 'entry_time DESC',
    );
  }

  Future<List<Map<String, dynamic>>> getActiveVehiclesInGate(Database db, String companyId) async {
    return await db.query(
      'gate_check_records',
      where: 'company_id = ? AND status IN (?, ?)',
      whereArgs: [companyId, 'ENTERING', 'INSIDE'],
      orderBy: 'entry_time ASC',
    );
  }

  // Guest Log Operations (for Satpam Dashboard) - Enhanced for Intent-Based QR System
  Future<String> createGuestLog(Database db, Map<String, dynamic> guestData, Function(Map<String, dynamic>) addToSyncQueue) async {
    final guestId = _uuid.v4();
    guestData['guest_id'] = guestId;
    
    // Don't override status if it's already set (for intent-based system)
    if (!guestData.containsKey('status')) {
      guestData['status'] = 'ENTRY'; // Default fallback only
    }
    
    guestData['sync_status'] = 'PENDING';
    
    // Don't override entry_time if it's already set (for intent-based system)
    if (!guestData.containsKey('entry_time')) {
      guestData['entry_time'] = DateTime.now().millisecondsSinceEpoch; // Default fallback only
    }
    
    await insertWithId(db, 'gate_guest_logs', guestData);
    
    // Add to sync queue
    await addToSyncQueue({
      'operationType': 'CREATE',
      'tableName': 'gate_guest_logs',
      'recordId': guestId,
      'data': guestData,
      'priority': 2,
    });
    
    return guestId;
  }

  // Update guest log with exit information
  Future<void> updateGuestLogExit(Database db, String guestId, Map<String, dynamic> exitData) async {
    try {
      // Add timestamp for exit
      exitData['exit_time'] = DateTime.now().millisecondsSinceEpoch;
      exitData['updated_at'] = DateTime.now().millisecondsSinceEpoch;
      
      await db.update(
        'gate_guest_logs',
        exitData,
        where: 'guest_id = ?',
        whereArgs: [guestId],
      );
      
      _logger.d('Guest log updated for exit: $guestId');
    } catch (e) {
      _logger.e('Error updating guest log exit', error: e);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getRecentGuestLogs(Database db, {int limit = 10}) async {
    return await db.query(
      'gate_guest_logs',
      orderBy: 'created_at DESC',
      limit: limit,
    );
  }

  Future<List<Map<String, dynamic>>> getActiveGuests(Database db) async {
    return await db.query(
      'gate_guest_logs',
      where: 'status = ?',
      whereArgs: ['INSIDE'],
      orderBy: 'entry_time ASC',
    );
  }

  // Photo Storage Operations
  Future<String> storeGateCheckPhoto(Database db, {
    required String relatedRecordType,
    required String relatedRecordId,
    required String filePath,
    required String fileName,
    required int fileSize,
    required String photoType,
    required String createdBy,
    double? latitude,
    double? longitude,
  }) async {
    final photoId = _uuid.v4();

    // Extract file extension and derive mime type for v8 schema compatibility
    final dotIndex = fileName.lastIndexOf('.');
    final fileExtension = dotIndex != -1 ? fileName.substring(dotIndex).toLowerCase() : '.jpg';
    String mimeType;
    switch (fileExtension) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      default:
        mimeType = 'image/jpeg';
    }

    final photoData = {
      'photo_id': photoId,
      'related_record_type': relatedRecordType,
      'related_record_id': relatedRecordId,
      'file_path': filePath,
      'file_name': fileName,
      'original_file_name': fileName,
      'file_size': fileSize,
      'file_extension': fileExtension,
      'mime_type': mimeType,
      'photo_type': photoType,
      'latitude': latitude,
      'longitude': longitude,
      'taken_at': DateTime.now().millisecondsSinceEpoch,
      'created_by': createdBy,
      'sync_status': 'PENDING',
      'is_uploaded': 0,
    };

    await insertWithId(db, 'gate_check_photos', photoData);
    return photoId;
  }

  Future<List<Map<String, dynamic>>> getPhotosForRecord(Database db, String recordType, String recordId) async {
    return await db.query(
      'gate_check_photos',
      where: 'related_record_type = ? AND related_record_id = ?',
      whereArgs: [recordType, recordId],
      orderBy: 'taken_at ASC',
    );
  }

  // =============================================================================
  // GENERIC DATABASE OPERATIONS
  // =============================================================================

  Future<int> insert(Database db, String table, Map<String, dynamic> values) async {
    try {
      final id = await db.insert(table, values, conflictAlgorithm: ConflictAlgorithm.replace);
      _logger.d('Inserted record into $table with ID: $id');
      return id;
    } catch (e) {
      _logger.e('Error inserting into $table', error: e);
      rethrow;
    }
  }

  Future<int> update(Database db, String table, Map<String, dynamic> values, {String? where, List<Object?>? whereArgs}) async {
    try {
      final count = await db.update(table, values, where: where, whereArgs: whereArgs);
      _logger.d('Updated $count records in $table');
      return count;
    } catch (e) {
      _logger.e('Error updating $table', error: e);
      rethrow;
    }
  }

  Future<int> delete(Database db, String table, String whereClause, List<dynamic> whereArgs) async {
    try {
      final count = await db.delete(table, where: whereClause, whereArgs: whereArgs);
      _logger.d('Deleted $count records from $table');
      return count;
    } catch (e) {
      _logger.e('Error deleting from $table', error: e);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> query(
    Database db,
    String table, {
    List<String>? columns,
    String? where,
    List<dynamic>? whereArgs,
    String? orderBy,
    int? limit,
    int? offset,
  }) async {
    try {
      return await db.query(
        table,
        columns: columns,
        where: where,
        whereArgs: whereArgs,
        orderBy: orderBy,
        limit: limit,
        offset: offset,
      );
    } catch (e) {
      _logger.e('Error querying $table', error: e);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> rawQuery(Database db, String sql, [List<dynamic>? arguments]) async {
    try {
      return await db.rawQuery(sql, arguments);
    } catch (e) {
      _logger.e('Error executing raw query', error: e);
      rethrow;
    }
  }

  Future<void> rawExecute(Database db, String sql, [List<dynamic>? arguments]) async {
    try {
      await db.execute(sql, arguments);
    } catch (e) {
      _logger.e('Error executing raw SQL', error: e);
      rethrow;
    }
  }

  Future<T> transaction<T>(Database db, Future<T> Function(Transaction) action) async {
    try {
      return await db.transaction(action);
    } catch (e) {
      _logger.e('Error in database transaction', error: e);
      rethrow;
    }
  }

  // Clear user data (for logout)
  Future<void> clearUserData(Database db, String userId) async {
    await db.transaction((txn) async {
      await txn.delete('harvest_records', where: 'mandor_id = ?', whereArgs: [userId]);
      await txn.delete('gate_check_records', where: 'created_by = ?', whereArgs: [userId]);
      await txn.delete('gate_guest_logs', where: 'created_by = ?', whereArgs: [userId]);
      await txn.delete('gate_employee_logs', where: 'created_by = ?', whereArgs: [userId]);
      await txn.delete('gate_check_photos', where: 'created_by = ?', whereArgs: [userId]);
      await txn.delete('gate_qr_tokens', where: 'generated_by = ?', whereArgs: [userId]);
      await txn.delete('sync_queue', where: 'user_id = ?', whereArgs: [userId]);
      await txn.delete('notifications', where: 'user_id = ?', whereArgs: [userId]);
      await txn.delete('user_activity_logs', where: 'user_id = ?', whereArgs: [userId]);
    });
    _logger.i('Cleared data for user: $userId');
  }
}
