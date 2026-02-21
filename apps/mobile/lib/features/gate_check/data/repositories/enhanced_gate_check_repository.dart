import 'dart:convert';
import 'dart:io';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

import '../models/gate_check_models.dart';
import '../../../../core/database/enhanced_database_service.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/services/gate_check_camera_service.dart';
import '../../../../core/services/jwt_qr_service.dart';

/// Enhanced Gate Check Repository for Offline-First Operations
/// 
/// Features:
/// - 100% offline-first architecture with SQLite storage
/// - Comprehensive guest and registered user management
/// - Photo documentation with metadata storage
/// - JWT-based QR token generation and validation
/// - Data synchronization queue management
/// - Statistics and reporting capabilities
class EnhancedGateCheckRepository {
  static final Logger _logger = Logger();
  final EnhancedDatabaseService _db;
  final LocationService _locationService;
  final GateCheckCameraService _cameraService;
  final JWTQRService _qrService;
  final Uuid _uuid = const Uuid();

  EnhancedGateCheckRepository({
    required EnhancedDatabaseService database,
    required LocationService locationService,
    required GateCheckCameraService cameraService,
    required JWTQRService qrService,
  }) : _db = database,
       _locationService = locationService,
       _cameraService = cameraService,
       _qrService = qrService;

  // =============================================================================
  // GUEST LOG OPERATIONS
  // =============================================================================

  /// Create new guest log entry with comprehensive validation
  Future<String> createGuestLog({
    required String name,
    required String vehiclePlate,
    required String cargoType,
    int? cargoQty,
    String? unit,
    required String gateId,
    required String action,
    String? vehicleType,
    String? vehicleCharacteristics,
    String? destination,
    String? cargoOwner,
    String? notes,
    double? estimatedWeight,
    double? actualWeight,
    String? doNumber,
    String? qrToken,
    String? createdBy,
    List<String>? photoIds,
  }) async {
    try {
      final guestId = _uuid.v4();
      final now = DateTime.now();
      
      // Get current location if available
      final location = await _locationService.getCurrentPosition();
      final coordinates = location != null 
          ? jsonEncode({
              'latitude': location.latitude,
              'longitude': location.longitude,
              'accuracy': location.accuracy,
              'timestamp': DateTime.now().millisecondsSinceEpoch,
            })
          : null;

      final guestLog = GuestLog(
        guestId: guestId,
        name: name.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        cargoType: cargoType.trim(),
        cargoQty: cargoQty,
        unit: unit?.trim(),
        gateId: gateId,
        action: action.toLowerCase(),
        timestamp: now,
        qrToken: qrToken,
        status: 'valid',
        vehicleType: vehicleType?.trim(),
        vehicleCharacteristics: vehicleCharacteristics?.trim(),
        destination: destination?.trim(),
        cargoOwner: cargoOwner?.trim(),
        notes: notes?.trim(),
        estimatedWeight: estimatedWeight,
        actualWeight: actualWeight,
        doNumber: doNumber?.trim(),
        coordinates: coordinates,
        deviceId: await _getDeviceId(),
        clientTimestamp: now.millisecondsSinceEpoch,
        createdBy: createdBy,
        syncStatus: 'PENDING',
      );

      // Insert guest log
      await _db.insertWithId('gate_guest_logs', guestLog.toDatabase());

      // Link photos if provided
      if (photoIds != null && photoIds.isNotEmpty) {
        await _linkPhotosToGuestLog(guestId, photoIds);
      }

      // Add to sync queue
      await _db.addToSyncQueue(
        operationType: 'CREATE',
        tableName: 'gate_guest_logs',
        recordId: guestId,
        data: guestLog.toDatabase(),
        priority: 2,
        userId: createdBy,
      );

      // Update gate statistics
      await _updateGateStats(gateId, action);

      // Log security event
      await _db.logSecurityEvent(
        userId: createdBy,
        eventType: 'GUEST_${action.toUpperCase()}',
        severity: 'MEDIUM',
        description: 'Guest ${action} logged: $name ($vehiclePlate)',
        metadata: {
          'guest_id': guestId,
          'vehicle_plate': vehiclePlate,
          'gate_id': gateId,
          'action': action,
        },
      );

      _logger.i('Guest log created: $guestId - $name ($vehiclePlate)');
      return guestId;
    } catch (e) {
      _logger.e('Error creating guest log', error: e);
      rethrow;
    }
  }

  /// Update guest log for exit processing
  Future<void> updateGuestLogExit({
    required String guestId,
    double? actualWeight,
    String? exitNotes,
    String? updatedBy,
    List<String>? exitPhotoIds,
  }) async {
    try {
      final now = DateTime.now();
      final updateData = <String, dynamic>{
        'exit_time': now.millisecondsSinceEpoch,
        'actual_weight': actualWeight,
        'updated_at': now.millisecondsSinceEpoch,
        'updated_by': updatedBy,
        'sync_status': 'PENDING',
      };

      if (exitNotes != null && exitNotes.trim().isNotEmpty) {
        // Append exit notes to existing notes
        final existingLog = await getGuestLogById(guestId);
        final combinedNotes = existingLog != null && existingLog.notes != null
            ? '${existingLog.notes}\n\nExit Notes: ${exitNotes.trim()}'
            : 'Exit Notes: ${exitNotes.trim()}';
        updateData['notes'] = combinedNotes;
      }

      await _db.updateWithVersion(
        'gate_guest_logs',
        updateData,
        'guest_id = ?',
        [guestId],
      );

      // Link exit photos
      if (exitPhotoIds != null && exitPhotoIds.isNotEmpty) {
        await _linkPhotosToGuestLog(guestId, exitPhotoIds);
      }

      // Update gate statistics for exit
      final guestLog = await getGuestLogById(guestId);
      if (guestLog != null) {
        await _updateGateStats(guestLog.gateId, 'exit');
      }

      _logger.i('Guest log updated for exit: $guestId');
    } catch (e) {
      _logger.e('Error updating guest log for exit', error: e);
      rethrow;
    }
  }

  /// Get guest log by ID
  Future<GuestLog?> getGuestLogById(String guestId) async {
    try {
      final results = await _db.query(
        'gate_guest_logs',
        where: 'guest_id = ?',
        whereArgs: [guestId],
        limit: 1,
      );

      if (results.isEmpty) return null;
      return GuestLog.fromDatabase(results.first);
    } catch (e) {
      _logger.e('Error getting guest log by ID', error: e);
      return null;
    }
  }

  /// Get guest logs by vehicle plate
  Future<List<GuestLog>> getGuestLogsByVehicle(String vehiclePlate) async {
    try {
      final results = await _db.query(
        'gate_guest_logs',
        where: 'vehicle_plate = ?',
        whereArgs: [vehiclePlate.trim().toUpperCase()],
        orderBy: 'timestamp DESC',
      );

      return results.map((data) => GuestLog.fromDatabase(data)).toList();
    } catch (e) {
      _logger.e('Error getting guest logs by vehicle', error: e);
      return [];
    }
  }

  /// Get recent guest logs
  Future<List<GuestLog>> getRecentGuestLogs({
    String? gateId,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      String whereClause = '1=1';
      List<dynamic> whereArgs = [];

      if (gateId != null) {
        whereClause += ' AND gate_id = ?';
        whereArgs.add(gateId);
      }

      final results = await _db.query(
        'gate_guest_logs',
        where: whereClause,
        whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
        orderBy: 'timestamp DESC',
        limit: limit,
        offset: offset,
      );

      return results.map((data) => GuestLog.fromDatabase(data)).toList();
    } catch (e) {
      _logger.e('Error getting recent guest logs', error: e);
      return [];
    }
  }

  /// Get guest logs by date range
  Future<List<GuestLog>> getGuestLogsByDateRange(
    DateTime startDate,
    DateTime endDate, {
    String? gateId,
  }) async {
    try {
      String whereClause = 'timestamp >= ? AND timestamp <= ?';
      List<dynamic> whereArgs = [
        startDate.millisecondsSinceEpoch,
        endDate.millisecondsSinceEpoch,
      ];

      if (gateId != null) {
        whereClause += ' AND gate_id = ?';
        whereArgs.add(gateId);
      }

      final results = await _db.query(
        'gate_guest_logs',
        where: whereClause,
        whereArgs: whereArgs,
        orderBy: 'timestamp DESC',
      );

      return results.map((data) => GuestLog.fromDatabase(data)).toList();
    } catch (e) {
      _logger.e('Error getting guest logs by date range', error: e);
      return [];
    }
  }

  // =============================================================================
  // REGISTERED USER OPERATIONS
  // =============================================================================

  /// Create or update registered user
  Future<String> upsertRegisteredUser(RegisteredUser user) async {
    try {
      await _db.insert('registered_users', user.toDatabase());
      
      _logger.d('Registered user upserted: ${user.userId}');
      return user.userId;
    } catch (e) {
      _logger.e('Error upserting registered user', error: e);
      rethrow;
    }
  }

  /// Search registered users
  Future<List<RegisteredUser>> searchRegisteredUsers(String query) async {
    try {
      final searchPattern = '%${query.toLowerCase()}%';
      final results = await _db.query(
        'registered_users',
        where: '''
          (LOWER(name) LIKE ? OR 
           LOWER(department) LIKE ? OR 
           LOWER(vehicle_plate) LIKE ? OR 
           LOWER(user_id) LIKE ?) 
          AND status = 'active'
        ''',
        whereArgs: [searchPattern, searchPattern, searchPattern, searchPattern],
        orderBy: 'name ASC',
        limit: 20,
      );

      return results.map((data) => RegisteredUser.fromDatabase(data)).toList();
    } catch (e) {
      _logger.e('Error searching registered users', error: e);
      return [];
    }
  }

  /// Get registered user by ID
  Future<RegisteredUser?> getRegisteredUserById(String userId) async {
    try {
      final results = await _db.query(
        'registered_users',
        where: 'user_id = ? AND status = ?',
        whereArgs: [userId, 'active'],
        limit: 1,
      );

      if (results.isEmpty) return null;
      return RegisteredUser.fromDatabase(results.first);
    } catch (e) {
      _logger.e('Error getting registered user by ID', error: e);
      return null;
    }
  }

  // =============================================================================
  // ACCESS LOG OPERATIONS
  // =============================================================================

  /// Create access log entry
  Future<String> createAccessLog({
    required String userType,
    String? userId,
    required String name,
    String? vehiclePlate,
    required String gateId,
    required String action,
    required String status,
    String? photoPath,
    String? validationNotes,
    String? createdBy,
  }) async {
    // Access logs are deprecated - return dummy ID to maintain interface compatibility
    _logger.w('Attempted to create deprecated access log for: $name');
    return _uuid.v4();
  }

  /// Get recent access logs
  Future<List<AccessLog>> getRecentAccessLogs({
    String? gateId,
    int limit = 50,
  }) async {
    // Access logs are deprecated
    return [];
  }

  // =============================================================================
  // JWT QR TOKEN OPERATIONS
  // =============================================================================

  /// Generate QR token for guest
  Future<String> generateGuestQRToken({
    required String guestId,
    required String name,
    required String vehiclePlate,
    required String cargoType,
    required String generationIntent,
    int? cargoQty,
    String? unit,
    String? vehicleType,
    String? destination,
    String? cargoOwner,
    double? estimatedWeight,
    String? doNumber,
    String? notes,
    Duration? validityPeriod,
    String? createdBy,
  }) async {
    try {
      final token = await _qrService.generateGuestToken(
        guestId: guestId,
        name: name,
        vehiclePlate: vehiclePlate,
        cargoType: cargoType,
        generationIntent: generationIntent,
        cargoQty: cargoQty,
        unit: unit,
        vehicleType: vehicleType,
        destination: destination,
        cargoOwner: cargoOwner,
        estimatedWeight: estimatedWeight,
        doNumber: doNumber,
        notes: notes,
        expiry: validityPeriod ?? const Duration(hours: 24),
        createdBy: createdBy,
      );

      _logger.i('QR token generated for guest: $guestId');
      return token;
    } catch (e) {
      _logger.e('Error generating guest QR token', error: e);
      rethrow;
    }
  }

  /// Validate QR token
  Future<ValidationResult> validateQRToken(String token) async {
    try {
      return await _qrService.validateToken(token);
    } catch (e) {
      _logger.e('Error validating QR token', error: e);
      return ValidationResult.invalid('Token validation failed');
    }
  }

  /// Generate QR code data from token
  String generateQRData(String token) {
    return _qrService.generateQRData(token);
  }

  // =============================================================================
  // PHOTO MANAGEMENT
  // =============================================================================

  /// Capture and store entry photo
  Future<String?> captureEntryPhoto({
    required String gateCheckId,
    required String vehiclePlate,
    String? notes,
  }) async {
    try {
      final photo = await _cameraService.captureEntryPhoto(
        gateCheckId: gateCheckId,
        vehiclePlate: vehiclePlate,
        notes: notes,
      );

      if (photo != null) {
        // Store photo metadata in database
        await _db.insert('gate_check_photos', photo.toMap());
        
        _logger.i('Entry photo captured: ${photo.photoId}');
        return photo.photoId;
      }
      
      return null;
    } catch (e) {
      _logger.e('Error capturing entry photo', error: e);
      return null;
    }
  }

  /// Capture and store exit photo
  Future<String?> captureExitPhoto({
    required String gateCheckId,
    required String vehiclePlate,
    String? notes,
  }) async {
    try {
      final photo = await _cameraService.captureExitPhoto(
        gateCheckId: gateCheckId,
        vehiclePlate: vehiclePlate,
        notes: notes,
      );

      if (photo != null) {
        await _db.insert('gate_check_photos', photo.toMap());
        
        _logger.i('Exit photo captured: ${photo.photoId}');
        return photo.photoId;
      }
      
      return null;
    } catch (e) {
      _logger.e('Error capturing exit photo', error: e);
      return null;
    }
  }

  /// Get actual device ID from DeviceService
  Future<String> _getDeviceId() async {
    return await DeviceService.getDeviceId();
  }

  /// Clean up old records
  Future<void> cleanupOldRecords({int daysToKeep = 90}) async {
    try {
      final cutoffDate = DateTime.now().subtract(Duration(days: daysToKeep));
      final cutoffTimestamp = cutoffDate.millisecondsSinceEpoch;

      // Clean old guest logs
      await _db.delete('gate_guest_logs', 'timestamp < ? AND sync_status = ?', 
          [cutoffTimestamp, 'SYNCED']);

      // Access logs cleanup removed (deprecated)

      // Clean old photos
      await _cameraService.cleanupOldPhotos(daysToKeep: daysToKeep);

      _logger.i('Cleaned up old records older than $daysToKeep days');
    } catch (e) {
      _logger.e('Error cleaning up old records', error: e);
    }
  }

  /// Update gate statistics
  Future<void> _updateGateStats(String gateId, String action) async {
    try {
      final today = DateTime.now();
      final dateStr = DateTime(today.year, today.month, today.day).millisecondsSinceEpoch;
      
      // Check if stats exist for today
      final List<Map<String, dynamic>> existing = await _db.query(
        'gate_check_stats',
        where: 'gate_id = ? AND date = ?',
        whereArgs: [gateId, dateStr],
      );
      
      if (existing.isEmpty) {
        // Create new stats record
        await _db.insert('gate_check_stats', {
          'gate_id': gateId,
          'date': dateStr,
          'vehicles_inside': action == 'entry' ? 1 : 0,
          'today_entries': action == 'entry' ? 1 : 0,
          'today_exits': action == 'exit' ? 1 : 0,
          'pending_exit': action == 'entry' ? 1 : 0,
          'average_load_time': 0.0,
          'compliance_rate': 100.0,
          'total_weight_in': 0.0,
          'total_weight_out': 0.0,
          'violation_count': 0,
          'created_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
          'sync_status': 'PENDING',
        });
      } else {
        // Update existing stats
        final stats = existing.first;
        int vehiclesInside = stats['vehicles_inside'] as int;
        int todayEntries = stats['today_entries'] as int;
        int todayExits = stats['today_exits'] as int;
        int pendingExit = stats['pending_exit'] as int;
        
        if (action == 'entry') {
          vehiclesInside++;
          todayEntries++;
          pendingExit++;
        } else if (action == 'exit') {
          vehiclesInside = vehiclesInside > 0 ? vehiclesInside - 1 : 0;
          todayExits++;
          pendingExit = pendingExit > 0 ? pendingExit - 1 : 0;
        }
        
        await _db.update(
          'gate_check_stats',
          {
            'vehicles_inside': vehiclesInside,
            'today_entries': todayEntries,
            'today_exits': todayExits,
            'pending_exit': pendingExit,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
            'sync_status': 'PENDING',
          },
          where: 'gate_id = ? AND date = ?',
          whereArgs: [gateId, dateStr],
        );
      }
    } catch (e) {
      _logger.e('Error updating gate stats', error: e);
    }
  }

  /// Link photos to guest log
  Future<void> _linkPhotosToGuestLog(String guestId, List<String> photoIds) async {
    try {
      for (final photoId in photoIds) {
        await _db.update(
          'gate_check_photos',
          {
            'related_record_id': guestId,
            'related_record_type': 'GUEST_LOG',
            'updated_at': DateTime.now().millisecondsSinceEpoch,
            'sync_status': 'PENDING',
          },
          where: 'photo_id = ?',
          whereArgs: [photoId],
        );
      }
    } catch (e) {
      _logger.e('Error linking photos to guest log', error: e);
    }
  }

  /// Validate repository integrity
  Future<Map<String, dynamic>> validateIntegrity() async {
    try {
      final issues = <String>[];
      final stats = <String, dynamic>{};

      // Check for orphaned records
      final orphanedPhotos = await _db.rawQuery('''
        SELECT COUNT(*) as count FROM gate_check_photos p
        LEFT JOIN gate_guest_logs g ON p.gate_check_id = g.guest_id
        WHERE g.guest_id IS NULL
      ''');
      
      final orphanCount = orphanedPhotos.first['count'] as int;
      if (orphanCount > 0) {
        issues.add('Found $orphanCount orphaned photos');
      }

      // Check sync consistency
      final pendingSyncOld = await _db.rawQuery('''
        SELECT COUNT(*) as count FROM sync_queue 
        WHERE status = 'PENDING' AND created_at < ?
      ''', [DateTime.now().subtract(const Duration(hours: 24)).millisecondsSinceEpoch]);
      
      final oldPendingCount = pendingSyncOld.first['count'] as int;
      if (oldPendingCount > 0) {
        issues.add('Found $oldPendingCount old pending sync operations');
      }

      return {
        'issues': issues,
        'is_healthy': issues.isEmpty,
        'orphaned_photos': orphanCount,
        'old_pending_sync': oldPendingCount,
        'timestamp': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      _logger.e('Error validating repository integrity', error: e);
      return {
        'issues': ['Integrity check failed: ${e.toString()}'],
        'is_healthy': false,
        'error': e.toString(),
      };
    }
  }
}