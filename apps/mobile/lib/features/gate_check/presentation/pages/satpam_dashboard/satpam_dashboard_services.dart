import 'dart:io';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import '../../../../../core/services/graphql_sync_service.dart';
import '../../../../../core/services/jwt_qr_service.dart';
import '../../../../../core/database/enhanced_database_service.dart';
import '../../../../../core/services/connectivity_service.dart';
import '../../../../../core/services/jwt_storage_service.dart';
import '../../../../../core/services/gate_check_camera_service.dart';
import '../../../data/models/gate_check_models.dart';
import '../../widgets/vehicle_camera_widget.dart';
import 'satpam_dashboard_helpers.dart';
import '../../../../../core/di/dependency_injection.dart';
import 'satpam_dashboard_dialogs.dart';

/// Business logic and service handlers for Satpam Dashboard
class SatpamDashboardServices {
  static final Logger _logger = Logger();

  /// Initialize all required services
  /// Initialize all required services
  static Future<SatpamDashboardServiceState> initializeServices() async {
    try {
      _logger.i(
        'Initializing SatpamDashboard services using Dependency Injection',
      );

      // Retrieve already initialized singletons from GetIt
      final databaseService = sl<EnhancedDatabaseService>();
      final connectivityService = sl<ConnectivityService>();
      final jwtStorageService = sl<JWTStorageService>();

      // JWTQRService - singleton factory
      final qrService = JWTQRService();
      await qrService.initialize();

      // Retrieve loaded Sync Service
      final syncService = sl<GraphQLSyncService>();

      _logger.i('All services retrieved from DI successfully');

      return SatpamDashboardServiceState(
        databaseService: databaseService,
        connectivityService: connectivityService,
        jwtStorageService: jwtStorageService,
        qrService: qrService,
        syncService: syncService,
        isInitialized: true,
      );
    } catch (e) {
      _logger.e('Service retrieval failed', error: e);
      return await _initializeFallbackServices();
    }
  }

  /// Initialize fallback services for offline-only operation
  static Future<SatpamDashboardServiceState>
  _initializeFallbackServices() async {
    try {
      _logger.i('Initializing fallback services for offline-only operation');

      final databaseService = EnhancedDatabaseService();
      final connectivityService = ConnectivityService(Connectivity());
      await connectivityService
          .initialize(); // Initialize for connectivity detection
      final jwtStorageService = JWTStorageService();

      _logger.i(
        'Fallback services initialized - dashboard will operate in offline-only mode',
      );
      return SatpamDashboardServiceState(
        databaseService: databaseService,
        connectivityService: connectivityService,
        jwtStorageService: jwtStorageService,
        isInitialized: true,
        isOfflineMode: true,
      );
    } catch (e) {
      _logger.e('Even fallback service initialization failed', error: e);
      return SatpamDashboardServiceState(isInitialized: false);
    }
  }

  /// Load dashboard data including stats and logs
  static Future<SatpamDashboardData> loadDashboardData({
    required SatpamDashboardServiceState serviceState,
    bool showLoading = true,
  }) async {
    try {
      _logger.i('Loading dashboard data...');

      // Load stats
      GateCheckStats? todayStats;
      List<GuestLog> recentLogs = [];
      List<AccessLog> recentAccessLogs = [];
      Map<String, dynamic> repositoryStats = {};

      if (serviceState.databaseService != null) {
        // Load real repository stats
        repositoryStats = await _loadRealRepositoryStats(serviceState);

        // Load today's stats from database
        todayStats = await _loadTodayStats(serviceState.databaseService!);

        // Load recent logs from database
        recentLogs = await _loadRecentGuestLogs(serviceState.databaseService!);
        recentAccessLogs = await _loadRecentAccessLogs(
          serviceState.databaseService!,
        );

        _logger.d('Dashboard data loaded successfully from database');
      } else {
        _logger.w('Database service not available - returning empty data');
      }

      return SatpamDashboardData(
        todayStats: todayStats,
        recentLogs: recentLogs,
        recentAccessLogs: recentAccessLogs,
        repositoryStats: repositoryStats,
      );
    } catch (e) {
      _logger.e('Error loading dashboard data', error: e);
      return SatpamDashboardData(
        repositoryStats: {'error_message': e.toString()},
      );
    }
  }

  /// Load real repository statistics
  static Future<Map<String, dynamic>> _loadRealRepositoryStats(
    SatpamDashboardServiceState serviceState,
  ) async {
    final stats = <String, dynamic>{};

    try {
      final db = serviceState.databaseService;
      if (db == null) {
        stats['error_message'] = 'Database service not available';
        return stats;
      }

      // Service status
      stats['service_status'] = {
        'database_service': serviceState.databaseService != null,
        'sync_service': serviceState.syncService != null,
        'qr_service': serviceState.qrService != null,
        'connectivity_service': serviceState.connectivityService != null,
        'jwt_storage_service': serviceState.jwtStorageService != null,
      };

      // OPTIMIZATION: Run independent queries in parallel
      final results = await Future.wait([
        _getGuestLogCount(db),
        _getTodayGuestLogCount(db),
        _getEmployeeLogCount(db),
        _getPendingSyncCount(db),
        serviceState.syncService != null
            ? serviceState.syncService!.getLastSyncTime()
            : Future.value(null),
      ]);

      // Basic counts
      stats['total_gate_guest_logs'] = results[0] ?? 0;
      stats['today_gate_guest_logs'] = results[1] ?? 0;
      stats['total_employee_logs'] = results[2] ?? 0;
      stats['pending_sync'] = results[3] ?? 0;

      // Last sync time
      if (results[4] != null) {
        stats['last_sync'] = results[4];
      }

      // Database health - run this asynchronously/later if possible,
      // but for now keeping it here but noting it might differ in speed
      // OPTIMIZATION: We could move this to a separate low-priority call if needed
      // For now, we'll keep it but wrap in try-catch to not block unrelated stats if it fails
      try {
        final dbHealth = await db.getDatabaseHealth();
        stats['database_storage'] = {
          'size_mb': dbHealth['size_mb'] ?? '0.00',
          'health_status': dbHealth['status'] ?? 'unknown',
        };
      } catch (e) {
        stats['database_storage'] = {'status': 'error'};
      }

      // Connectivity status
      // NON-BLOCKING CHECK: Use current property instead of awaiting check
      if (serviceState.connectivityService != null) {
        final isOnline = serviceState.connectivityService!.isOnline;
        stats['is_online'] = isOnline;
        _logger.d('Connectivity status: isOnline=$isOnline');
      } else {
        stats['is_online'] = false;
      }

      // Photo storage info
      stats['photo_storage'] = await _getPhotoStats(db);

      stats['is_syncing'] = false; // Would be updated during sync operations
    } catch (e) {
      _logger.e('Error loading repository stats', error: e);
      stats['error_message'] = 'Error loading stats: ${e.toString()}';
    }

    return stats;
  }

  /// Get photo storage stats
  static Future<Map<String, dynamic>> _getPhotoStats(
    EnhancedDatabaseService db,
  ) async {
    try {
      // Check if table exists first
      final tableCheck = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='gate_check_photos'",
      );
      if (tableCheck.isEmpty) {
        return {
          'total_files': 0,
          'pending_files': 0,
          'synced_files': 0,
          'total_size_mb': '0.00',
        };
      }

      final totalResult = await db.rawQuery(
        'SELECT COUNT(*) as count FROM gate_check_photos',
      );
      final total = totalResult.isNotEmpty
          ? totalResult.first['count'] as int? ?? 0
          : 0;

      final pendingResult = await db.rawQuery(
        "SELECT COUNT(*) as count FROM gate_check_photos WHERE sync_status = 'PENDING'",
      );
      final pending = pendingResult.isNotEmpty
          ? pendingResult.first['count'] as int? ?? 0
          : 0;

      return {
        'total_files': total,
        'pending_files': pending,
        'synced_files': total - pending,
        // Estimate 0.5MB per photo if we can't check file size easily
        'total_size_mb': (total * 0.5).toStringAsFixed(2),
      };
    } catch (e) {
      _logger.w('Error getting photo stats', error: e);
      return {
        'total_files': 0,
        'pending_files': 0,
        'synced_files': 0,
        'total_size_mb': '0.00',
      };
    }
  }

  /// Get guest log count
  static Future<int?> _getGuestLogCount(EnhancedDatabaseService db) async {
    try {
      final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM gate_guest_logs',
      );
      return result.isNotEmpty ? result.first['count'] as int? : 0;
    } catch (e) {
      _logger.w('Error getting guest log count', error: e);
      return null;
    }
  }

  /// Get today's guest log count
  static Future<int?> _getTodayGuestLogCount(EnhancedDatabaseService db) async {
    try {
      final todayStart = DateTime.now()
          .subtract(const Duration(hours: 24))
          .millisecondsSinceEpoch;
      final result = await db.rawQuery(
        "SELECT COUNT(*) as count FROM gate_guest_logs WHERE created_at >= ? AND (generation_intent IS NULL OR generation_intent != 'EXIT')",
        [todayStart],
      );
      return result.isNotEmpty ? result.first['count'] as int? : 0;
    } catch (e) {
      _logger.w('Error getting today guest log count', error: e);
      return null;
    }
  }

  /// Get employee log count
  static Future<int?> _getEmployeeLogCount(EnhancedDatabaseService db) async {
    try {
      // OPTIMIZATION: Removed expensive sqlite_master check.
      // Just try query directly. If table doesn't exist, it will throw, catch it.
      final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM gate_employee_logs',
      );
      return result.isNotEmpty ? result.first['count'] as int? : 0;
    } catch (e) {
      // Table likely doesn't exist yet or other error - return 0 silently
      return 0;
    }
  }

  /// Get pending sync count
  static Future<int?> _getPendingSyncCount(EnhancedDatabaseService db) async {
    try {
      final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM sync_queue WHERE status = ?',
        ['PENDING'],
      );
      return result.isNotEmpty ? result.first['count'] as int? : 0;
    } catch (e) {
      _logger.w('Error getting pending sync count', error: e);
      return null;
    }
  }

  /// Load today's statistics from database
  static Future<GateCheckStats?> _loadTodayStats(
    EnhancedDatabaseService db,
  ) async {
    try {
      final now = DateTime.now();
      final todayStart = DateTime(
        now.year,
        now.month,
        now.day,
      ).millisecondsSinceEpoch;
      final todayEnd = DateTime(
        now.year,
        now.month,
        now.day,
        23,
        59,
        59,
      ).millisecondsSinceEpoch;

      // OPTIMIZATION: Run independent queries in parallel
      final results = await Future.wait([
        // Count vehicles inside (entries without corresponding exit)
        db.rawQuery(
          '''
          SELECT COUNT(*) as count FROM gate_guest_logs
          WHERE generation_intent = 'ENTRY' AND exit_time IS NULL AND entry_time >= ? AND entry_time <= ?
        ''',
          [todayStart, todayEnd],
        ),

        // Count today's entries
        db.rawQuery(
          '''
          SELECT COUNT(*) as count FROM gate_guest_logs 
          WHERE entry_time >= ? AND entry_time <= ? AND (generation_intent IS NULL OR generation_intent != 'EXIT')
        ''',
          [todayStart, todayEnd],
        ),

        // Count today's exits
        db.rawQuery(
          '''
          SELECT COUNT(*) as count FROM gate_guest_logs 
          WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL
        ''',
          [todayStart, todayEnd],
        ),
      ]);

      final vehiclesInsideQuery = results[0];
      final vehiclesInside = vehiclesInsideQuery.isNotEmpty
          ? vehiclesInsideQuery.first['count'] as int? ?? 0
          : 0;

      final todayEntriesQuery = results[1];
      final todayEntries = todayEntriesQuery.isNotEmpty
          ? todayEntriesQuery.first['count'] as int? ?? 0
          : 0;

      final todayExitsQuery = results[2];
      final todayExits = todayExitsQuery.isNotEmpty
          ? todayExitsQuery.first['count'] as int? ?? 0
          : 0;

      // Access Logs Deprecated
      final accessLogsCount = 0;

      // Calculate compliance rate (simplified)
      final complianceRate = todayEntries > 0
          ? ((todayEntries - (vehiclesInside * 0.1)) / todayEntries * 100)
                .clamp(0.0, 100.0)
          : 100.0;

      return GateCheckStats(
        gateId: 'GATE_001',
        date: DateTime(now.year, now.month, now.day),
        vehiclesInside: vehiclesInside,
        todayEntries: todayEntries,
        todayExits: todayExits,
        pendingExit: vehiclesInside,
        averageLoadTime: 45.0, // Default value
        complianceRate: complianceRate,
        totalWeightIn: 0.0, // Would need weight data from actual implementation
        totalWeightOut:
            0.0, // Would need weight data from actual implementation
        violationCount: accessLogsCount > 10
            ? (accessLogsCount * 0.05).round()
            : 0,
        createdAt: now,
        updatedAt: now,
      );
    } catch (e) {
      _logger.e('Error loading today stats from database', error: e);
      return null;
    }
  }

  /// Load recent guest logs from database
  static Future<List<GuestLog>> _loadRecentGuestLogs(
    EnhancedDatabaseService db,
  ) async {
    try {
      final recentLogsQuery = await db.rawQuery('''
        SELECT * FROM gate_guest_logs 
        ORDER BY created_at DESC 
        LIMIT 10
      ''');

      return recentLogsQuery.map((row) {
        return GuestLog.fromDatabase(row);
      }).toList();
    } catch (e) {
      _logger.e('Error loading recent guest logs from database', error: e);
      return [];
    }
  }

  /// Load recent access logs from database
  static Future<List<AccessLog>> _loadRecentAccessLogs(
    EnhancedDatabaseService db,
  ) async {
    // Access logs are deprecated
    return [];
  }

  /// Load comprehensive history data from database
  /// Load comprehensive history data from database
  static Future<List<Map<String, dynamic>>> loadHistoryData({
    required SatpamDashboardServiceState serviceState,
    String? dateFilter = 'today',
    String? actionFilter = 'all',
    int limit = 50,
  }) async {
    try {
      if (serviceState.databaseService == null) {
        _logger.w('Database service not available for history data');
        return [];
      }

      final db = serviceState.databaseService!;

      // DEBUG: RAW DUMP REMOVED

      final historyItems = <Map<String, dynamic>>[];

      // Calculate date range based on filter
      final now = DateTime.now();
      DateTime startDate;
      DateTime endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);

      switch (dateFilter) {
        case 'week':
          startDate = now.subtract(const Duration(days: 7));
          break;
        case 'month':
          startDate = DateTime(now.year, now.month, 1);
          break;
        case 'all':
          startDate = DateTime(2020, 1, 1); // Far past date
          break;
        default: // 'today'
          startDate = DateTime(now.year, now.month, now.day);
      }

      final startMillis = startDate.millisecondsSinceEpoch;
      final endMillis = endDate.millisecondsSinceEpoch;

      // 1. QUERY GUEST LOGS
      String guestLogQuery = '''
        SELECT * FROM gate_guest_logs 
        WHERE created_at >= ? AND created_at <= ?
      ''';

      List<dynamic> guestQueryArgs = [startMillis, endMillis];

      // Add action filter for guests if specified
      if (actionFilter != null && actionFilter != 'all') {
        guestLogQuery += ' AND UPPER(generation_intent) = ?';
        guestQueryArgs.add(actionFilter.toUpperCase());
      }

      guestLogQuery += ' ORDER BY created_at DESC LIMIT ?';
      guestQueryArgs.add(limit);

      final guestLogsResult = await db.rawQuery(guestLogQuery, guestQueryArgs);

      // Process Guest Logs (Split into Entry/Exit events)
      for (final row in guestLogsResult) {
        final entryTime = row['entry_time'] as int?;
        final exitTime = row['exit_time'] as int?;
        // Use generation_intent as the single source of truth
        var intent = row['generation_intent']?.toString().toUpperCase();

        // Fallback: derive intent from time fields if generation_intent is missing
        if (intent == null || intent.isEmpty) {
          intent = (exitTime != null && entryTime == null) ? 'EXIT' : 'ENTRY';
        }

        final generationIntent = intent;

        _logger.w(
          'HISTORY DEBUG: ID=${row['id']} INTENT=$generationIntent ENTRY=${row['entry_time']} EXIT=${row['exit_time']}',
        );

        // Helper to add guest item
        void addGuestItem(String type, int timestamp) {
          final displayTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
          historyItems.add({
            'id': '${row['id']}_${type.toLowerCase()}', // Unique ID for list
            'original_id': row['id'],
            'type': 'GUEST',
            'vehicle_plate': row['vehicle_plate']?.toString() ?? 'N/A',
            'action': type, // ENTRY or EXIT
            'generation_intent': type,
            'time':
                '${displayTime.hour.toString().padLeft(2, '0')}:${displayTime.minute.toString().padLeft(2, '0')}',
            'date':
                '${displayTime.year}-${displayTime.month.toString().padLeft(2, '0')}-${displayTime.day.toString().padLeft(2, '0')}',
            'timestamp': timestamp,
            'driver_name': row['driver_name']?.toString(),
            'destination': row['destination']?.toString(),
            'sync_status': row['sync_status']?.toString() ?? 'PENDING',
            'qr_code_data': row['qr_code_data']?.toString(),
            'entry_gate': row['entry_gate']?.toString(),
            'exit_gate': row['exit_gate']?.toString(),
            'is_real': true,
          });
        }

        // Add Entry Event if exists and matches filter - SUPPRESS IF INTENT IS EXIT
        if (entryTime != null &&
            (actionFilter == 'all' || actionFilter == 'entry')) {
          // Fix: If intent is EXIT, do NOT show the artificial entry event
          if (generationIntent != 'EXIT') {
            addGuestItem('ENTRY', entryTime);
          }
        }

        // Add Exit Event if exists and matches filter
        if (exitTime != null &&
            (actionFilter == 'all' || actionFilter == 'exit')) {
          addGuestItem('EXIT', exitTime);
        }

        // Fallback: If no entry/exit time but has created_at (e.g. pending), use created_at based on intent
        if (entryTime == null && exitTime == null) {
          final createdAt =
              row['created_at'] as int? ??
              DateTime.now().millisecondsSinceEpoch;
          if (actionFilter == 'all' ||
              actionFilter == generationIntent.toLowerCase()) {
            // For EXIT intent without exit_time (shouldn't happen with new logic but for safety), show as EXIT
            addGuestItem(generationIntent, createdAt);
          }
        }
      }

      // 2. QUERY EMPLOYEE LOGS
      // Check if table exists first (migrations might be pending)
      try {
        final tableCheck = await db.rawQuery(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='gate_employee_logs'",
        );

        if (tableCheck.isNotEmpty) {
          String empLogQuery = '''
            SELECT * FROM gate_employee_logs 
            WHERE created_at >= ? AND created_at <= ?
          ''';

          List<dynamic> empQueryArgs = [startMillis, endMillis];

          if (actionFilter != null && actionFilter != 'all') {
            empLogQuery += ' AND UPPER(action) = ?';
            empQueryArgs.add(actionFilter.toUpperCase());
          }

          empLogQuery += ' ORDER BY created_at DESC LIMIT ?';
          empQueryArgs.add(limit);

          final empLogsResult = await db.rawQuery(empLogQuery, empQueryArgs);

          // Process Employee Logs
          for (final row in empLogsResult) {
            final createdAt =
                row['created_at'] as int? ??
                DateTime.now().millisecondsSinceEpoch;
            final displayTime = DateTime.fromMillisecondsSinceEpoch(createdAt);
            final action = row['action']?.toString().toUpperCase() ?? 'ENTRY';

            historyItems.add({
              'id': 'emp_${row['id']}',
              'original_id': row['id'],
              'type': 'EMPLOYEE',
              'vehicle_plate': row['vehicle_plate']?.toString() ?? 'N/A',
              'action': action,
              'generation_intent': action,
              'time':
                  '${displayTime.hour.toString().padLeft(2, '0')}:${displayTime.minute.toString().padLeft(2, '0')}',
              'date':
                  '${displayTime.year}-${displayTime.month.toString().padLeft(2, '0')}-${displayTime.day.toString().padLeft(2, '0')}',
              'timestamp': createdAt,
              'driver_name': row['employee_name']?.toString(),
              'destination': 'Employee Access',
              'sync_status': row['sync_status']?.toString() ?? 'PENDING',
              'is_real': true,
            });
          }
        }
      } catch (e) {
        // Ignore employee table error if it doesn't exist yet
        _logger.w(
          'Employee logs table error (might not exist yet): ${e.toString()}',
        );
      }

      // Sort combined list by timestamp (most recent first)
      historyItems.sort((a, b) {
        final timestampA = a['timestamp'] as int? ?? 0;
        final timestampB = b['timestamp'] as int? ?? 0;
        return timestampB.compareTo(timestampA);
      });

      _logger.d(
        'Loaded ${historyItems.length} history items (Guests + Employees)',
      );
      return historyItems;
    } catch (e) {
      _logger.e('Error loading history data from database', error: e);
      return [];
    }
  }

  /// Perform manual sync operation
  static Future<void> performManualSync({
    required BuildContext context,
    required SatpamDashboardServiceState serviceState,
    required Function() onSyncStart,
    required Function() onSyncComplete,
  }) async {
    try {
      onSyncStart();

      // Show loading indicator
      SatpamDashboardHelpers.showSnackBar(context, 'Memulai sync manual...');

      // Perform sync
      bool syncSuccess = false;
      String syncErrorMessage = 'Unknown error';

      if (serviceState.syncService != null) {
        try {
          final result = await serviceState.syncService!.syncNow(
            forceFullSync: true,
          );
          syncSuccess = result.success;
          if (!syncSuccess && result.errors.isNotEmpty) {
            syncErrorMessage = result.errors.first;
          }
        } catch (syncError) {
          _logger.e('Sync operation failed with exception', error: syncError);
          syncSuccess = false;
          syncErrorMessage = syncError.toString();
        }
      } else {
        syncSuccess = false;
        syncErrorMessage = 'Sync service not initialized';
        _logger.w('Sync service not available for manual sync');
      }
      if (!context.mounted) return;

      if (syncSuccess) {
        SatpamDashboardHelpers.showSnackBar(context, 'Sync berhasil');
      } else {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Sync gagal: $syncErrorMessage',
          isError: true,
        );
      }
    } catch (e) {
      _logger.e('Error performing manual sync', error: e);
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error: ${e.toString()}',
          isError: true,
        );
      }
    } finally {
      onSyncComplete();
    }
  }

  /// Handle guest registration
  static Future<void> handleGuestRegistration({
    required BuildContext context,
    required GateCheckFormData formData,
    required SatpamDashboardServiceState serviceState,
    required Function(bool) setLoading,
    required Function(String?) setError,
    String generationIntent = 'ENTRY', // New parameter
  }) async {
    try {
      setLoading(true);
      setError(null);

      // Validate form data
      if (formData.guestName == null || formData.guestName!.isEmpty) {
        throw Exception('Nama tamu tidak boleh kosong');
      }

      if (formData.vehiclePlate.isEmpty) {
        throw Exception('Nomor plat kendaraan tidak boleh kosong');
      }

      // Save to database (if available)
      int photosSaved = 0;
      String? createdGuestId;
      if (serviceState.databaseService != null) {
        final now = DateTime.now();

        final gateName = formData.posNumber.isNotEmpty
            ? formData.posNumber
            : 'MAIN_GATE';

        final guestLogData = {
          'driver_name': formData.guestName!,
          'destination': formData.purposeOfVisit ?? 'Visit',
          'vehicle_plate': formData.vehiclePlate,
          'vehicle_type': formData.vehicleType.isNotEmpty
              ? formData.vehicleType
              : 'Lainnya',
          'gate_position': gateName,
          'created_by': await _getUserIdFromJWT() ?? 'system_user',
          'company_id': await _getCompanyIdFromJWT() ?? '',
          'generation_intent': generationIntent,
          'entry_time': generationIntent == 'ENTRY'
              ? now.millisecondsSinceEpoch
              : null,
          'exit_time': generationIntent == 'EXIT'
              ? now.millisecondsSinceEpoch
              : null,
          'entry_gate': generationIntent == 'ENTRY' ? gateName : null,
          'exit_gate': generationIntent == 'EXIT' ? gateName : null,
          'created_at': now.millisecondsSinceEpoch,
          'updated_at': now.millisecondsSinceEpoch,
          'load_type': formData.loadType.isNotEmpty ? formData.loadType : null,
          'cargo_volume': formData.loadVolume.isNotEmpty
              ? formData.loadVolume
              : null,
          'cargo_owner': formData.loadOwner.isNotEmpty
              ? formData.loadOwner
              : null,
          'estimated_weight': formData.estimatedWeight,
          'delivery_order_number': formData.doNumber?.isNotEmpty == true
              ? formData.doNumber
              : null,
          'notes': formData.notes?.isNotEmpty == true ? formData.notes : null,
          'registration_source': 'MANUAL',
        };

        final newGuestId = await serviceState.databaseService!.createGuestLog(
          guestLogData,
        );
        createdGuestId = newGuestId;
        _logger.i('Guest registration saved to database: $createdGuestId');

        // Store photos to gate_check_photos table for sync
        if (formData.photos.isNotEmpty) {
          photosSaved = await _storePhotosForGuestLog(
            databaseService: serviceState.databaseService!,
            guestLogId: newGuestId,
            photoPaths: formData.photos,
            createdBy: guestLogData['created_by'] as String,
          );
        }
      }

      // Generate QR code (if service available)
      if (serviceState.qrService != null) {
        await _generateGuestQRToken(
          serviceState.qrService!,
          formData,
          generationIntent,
          guestId: createdGuestId,
        );
      }
      if (!context.mounted) return;

      SatpamDashboardHelpers.showSnackBar(
        context,
        'Registrasi tamu berhasil. $photosSaved Foto tersimpan.',
      );
    } catch (e) {
      _logger.e('Error handling guest registration', error: e);
      setError(e.toString());
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error: ${e.toString()}',
          isError: true,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /// Handle photo capture with preview - Returns the path of the captured photo or null
  static Future<String?> handlePhotoCapture({
    required BuildContext context,
    required String? vehiclePlate,
    required SatpamDashboardServiceState serviceState,
    String note = '', // Added note parameter for context (Front/Back)
  }) async {
    try {
      _logger.i('Capturing photo for vehicle: $vehiclePlate');

      if (vehiclePlate?.isEmpty ?? true) {
        throw Exception(
          'Mohon isi nomor plat kendaraan terlebih dahulu sebelum mengambil foto',
        );
      }

      return await _showCameraInterface(
        context,
        vehiclePlate!,
        serviceState,
        note,
      );
    } catch (e) {
      _logger.e('Error capturing photo', error: e);
      SatpamDashboardHelpers.showSnackBar(
        context,
        'Error mengambil foto: ${e.toString()}',
        isError: true,
      );
      return null;
    }
  }

  /// Show camera interface with full preview support
  static Future<String?> _showCameraInterface(
    BuildContext context,
    String vehiclePlate,
    SatpamDashboardServiceState serviceState,
    String note,
  ) async {
    try {
      _logger.i('Opening camera interface for vehicle: $vehiclePlate');

      // Navigate to full-screen camera widget
      final photo = await Navigator.of(context).push<GateCheckPhoto>(
        MaterialPageRoute(
          builder: (context) => VehicleCameraWidget(
            gateCheckId: 'temp_${DateTime.now().millisecondsSinceEpoch}',
            vehiclePlate: vehiclePlate,
            category: 'GUEST_ENTRY',
            notes: note.isNotEmpty
                ? note
                : 'Entry photo for guest registration',
            onPhotoTaken: (GateCheckPhoto capturedPhoto) {
              // Photo captured successfully - VehicleCameraWidget handles navigation
              _logger.d(
                'Photo captured in callback: ${capturedPhoto.filePath}',
              );
            },
            onCancel: () {
              // Camera cancelled - VehicleCameraWidget handles navigation
              _logger.d('Camera cancelled by user');
            },
          ),
        ),
      );

      if (photo != null) {
        _logger.i('Photo captured successfully: ${photo.filePath}');
        return photo.filePath;
      } else {
        _logger.d('Photo capture cancelled by user');
        return null;
      }
    } catch (e) {
      _logger.e('Error in camera interface', error: e);
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error membuka kamera: ${e.toString()}',
          isError: true,
        );
      }
      return null;
    }
  }

  /// Handle QR code generation with intent selection
  ///
  /// [existingGuestLogId] - Jika di-set, ini adalah mode regenerate/cetak ulang.
  /// Database record TIDAK akan dibuat ulang, hanya generate token baru.
  static Future<Map<String, dynamic>?> handleQRGeneration({
    required BuildContext context,
    required GateCheckFormData formData,
    required SatpamDashboardServiceState serviceState,
    required String generationIntent, // 'ENTRY' or 'EXIT'
    String?
    existingGuestLogId, // ID untuk regenerate (cetak ulang tanpa duplikasi)
  }) async {
    try {
      final isRegeneration =
          existingGuestLogId != null && existingGuestLogId.isNotEmpty;
      _logger.i(
        'Generating QR code for guest: ${formData.guestName} with intent: $generationIntent (regenerate: $isRegeneration)',
      );

      // Validate form data
      if (formData.guestName == null || formData.guestName!.isEmpty) {
        throw Exception('Nama tamu tidak boleh kosong');
      }

      if (formData.vehiclePlate.isEmpty) {
        throw Exception('Nomor plat kendaraan tidak boleh kosong');
      }

      // Gunakan existing ID jika ini adalah regeneration (cetak ulang)
      String? guestId = existingGuestLogId;
      int photosSaved = 0;

      // Check for duplicate vehicle entry - SKIP jika regeneration
      if (!isRegeneration &&
          generationIntent == 'ENTRY' &&
          serviceState.databaseService != null) {
        // cleaned plate
        final cleanPlate = formData.vehiclePlate.trim().toUpperCase();

        // Query for active sessions
        final activeLogs = await serviceState.databaseService!.query(
          'gate_guest_logs',
          where:
              'vehicle_plate = ? AND generation_intent = ? AND exit_time IS NULL',
          whereArgs: [cleanPlate, 'ENTRY'],
          orderBy: 'created_at DESC',
          limit: 1,
        );

        if (activeLogs.isNotEmpty) {
          final lastLog = activeLogs.first;
          _logger.i(
            'Duplicate vehicle entry attempt: $cleanPlate - reusing existing session',
          );

          // Notify user
          if (context.mounted) {
            SatpamDashboardHelpers.showSnackBar(
              context,
              'Kendaraan tercatat di dalam area. Menampilkan ulang QR Code...',
            );
          }

          // Use existing business guest_id and skip DB creation
          final existingGuestId = lastLog['guest_id']?.toString();
          if (existingGuestId != null && existingGuestId.isNotEmpty) {
            guestId = existingGuestId;
          } else {
            _logger.w(
              'Active session found without guest_id; creating new record to avoid ID mismatch',
            );
          }
        }
      }

      // Save guest data to database first (only if new)
      if (guestId == null && serviceState.databaseService != null) {
        final now = DateTime.now();

        final gateName = formData.posNumber.isNotEmpty
            ? formData.posNumber
            : 'MAIN_GATE';

        final guestLogData = {
          'driver_name': formData.guestName!,
          'destination': formData.purposeOfVisit ?? 'Visit',
          'vehicle_plate': formData.vehiclePlate,
          'vehicle_type': formData.vehicleType.isNotEmpty
              ? formData.vehicleType
              : 'Lainnya',
          'gate_position': gateName,
          'created_by': await _getUserIdFromJWT() ?? 'system_user',
          'company_id': await _getCompanyIdFromJWT() ?? '',
          'generation_intent': generationIntent,
          'entry_time': generationIntent == 'ENTRY'
              ? now.millisecondsSinceEpoch
              : null,
          'exit_time': generationIntent == 'EXIT'
              ? now.millisecondsSinceEpoch
              : null,
          'entry_gate': generationIntent == 'ENTRY' ? gateName : null,
          'exit_gate': generationIntent == 'EXIT' ? gateName : null,
          'created_at': now.millisecondsSinceEpoch,
          'updated_at': now.millisecondsSinceEpoch,
          // Cargo fields - required for sync to server
          'load_type': formData.loadType.isNotEmpty ? formData.loadType : null,
          'cargo_volume': formData.loadVolume.isNotEmpty
              ? formData.loadVolume
              : null,
          'cargo_owner': formData.loadOwner.isNotEmpty
              ? formData.loadOwner
              : null,
          'estimated_weight': formData.estimatedWeight,
          'delivery_order_number': formData.doNumber?.isNotEmpty == true
              ? formData.doNumber
              : null,
          'notes': formData.notes?.isNotEmpty == true ? formData.notes : null,
          'registration_source': 'MANUAL',
        };

        guestId = await serviceState.databaseService!.createGuestLog(
          guestLogData,
        );
        _logger.i(
          'Guest data saved to database with ID: $guestId for intent: $generationIntent',
        );

        // Store photos to gate_check_photos table for sync
        if (formData.photos.isNotEmpty) {
          photosSaved = await _storePhotosForGuestLog(
            databaseService: serviceState.databaseService!,
            guestLogId: guestId,
            photoPaths: formData.photos,
            createdBy: guestLogData['created_by'] as String,
          );
        }
      } else if (isRegeneration) {
        // Regeneration mode: skip database creation, reuse existing ID
        _logger.i(
          'Regenerating QR for existing guest log ID: $guestId (no new database record created)',
        );
      }

      // Generate QR token after saving to database
      if (serviceState.qrService != null) {
        final qrData = await _generateGuestQRToken(
          serviceState.qrService!,
          formData,
          generationIntent,
          guestId: guestId,
        );

        // Persist QR data back to the guest log record for reprint support
        if (guestId != null && serviceState.databaseService != null) {
          try {
            await serviceState.databaseService!.update(
              'gate_guest_logs',
              {
                'qr_code_data': qrData,
                'updated_at': DateTime.now().millisecondsSinceEpoch,
              },
              where: 'guest_id = ?',
              whereArgs: [guestId],
            );
            _logger.i('QR data persisted to guest log: $guestId');
          } catch (e) {
            _logger.w(
              'Failed to persist QR data to guest log (non-fatal)',
              error: e,
            );
          }
        }

        _logger.i(
          'QR code generated successfully for guest: ${formData.guestName} (regenerate: $isRegeneration)',
        );
        return {
          'qrData': qrData,
          'guestName': formData.guestName,
          'vehiclePlate': formData.vehiclePlate,
          'guestId': guestId,
          'generationIntent': generationIntent,
          'isRegeneration': isRegeneration,
          'photosSaved': photosSaved,
        };
      } else {
        _logger.w('QR service not available - cannot generate QR code');
        throw Exception('QR service tidak tersedia');
      }
    } catch (e) {
      _logger.e('Error generating QR code and saving data', error: e);
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error generating QR code: ${e.toString()}',
          isError: true,
        );
      }
      return null;
    }
  }

  /// Handle employee QR scan
  static Future<bool> handleEmployeeQR({
    required SatpamDashboardServiceState serviceState,
    required Map<String, dynamic> employeeData,
    required String gateId,
    required BuildContext context,
  }) async {
    try {
      if (serviceState.databaseService == null) {
        throw Exception('Database service not initialized');
      }

      // Prompt for Entry/Exit action
      final actionStr = await SatpamDashboardDialogs.showEmployeeActionDialog(
        context,
        employeeData['name'] ?? 'Unknown Employee',
      );

      if (actionStr == null) {
        // User cancelled
        return false;
      }

      // Generate unique log ID
      final logId = const Uuid().v4();
      final now = DateTime.now();

      // Get current user ID (Satpam)
      final currentUserId = await _getUserIdFromJWT();

      final accessLogData = {
        'log_id': logId,
        'employee_id':
            employeeData['nik'] ??
            'UNKNOWN', // Fallback as employee_id is required
        'iddata': employeeData['iddata'], // HRIS ID
        'employee_name': employeeData['name'] ?? 'Unknown Employee',
        'department': employeeData['department'],
        'gate_id': gateId,
        'action': actionStr, // Use selected action (ENTRY or EXIT)
        'status': 'SUCCESS',
        'entry_time': actionStr == 'ENTRY' ? now.millisecondsSinceEpoch : null,
        'exit_time': actionStr == 'EXIT' ? now.millisecondsSinceEpoch : null,
        'validation_method': 'QR_CODE',
        'notes': 'Employee QR Scan: ${employeeData['department']} ($actionStr)',
        'created_by': currentUserId ?? 'system',
        'created_at': now.millisecondsSinceEpoch,
        'updated_at': now.millisecondsSinceEpoch,
        'sync_status': 'PENDING',
      };

      // Insert into gate_employee_logs
      await serviceState.databaseService!.insertWithId(
        'gate_employee_logs',
        accessLogData,
      );

      _logger.i(
        'Employee access log created: $logId - ${employeeData['name']}',
      );

      // Show success feedback
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Akses Karyawan Berhasil: ${employeeData['name']}',
        );
      }

      return true;
    } catch (e) {
      _logger.e('Error handling employee QR', error: e);
      if (context.mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Gagal memproses QR Karyawan: ${e.toString()}',
          isError: true,
        );
      }
      return false;
    }
  }

  /// Get current time formatted
  static String getCurrentTime() {
    final now = DateTime.now();
    return '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
  }

  /// Check if in offline mode
  static bool isOfflineMode(SatpamDashboardServiceState serviceState) {
    return serviceState.isOfflineMode ||
        serviceState.connectivityService == null;
  }

  /// Get current user ID directly from JWT storage (no database validation)
  static Future<String?> _getUserIdFromJWT() async {
    try {
      final jwtStorageService = JWTStorageService();
      final currentUserId = await jwtStorageService.getCurrentUserId();

      _logger.d('JWT Storage returned user ID: $currentUserId');

      if (currentUserId?.isEmpty ?? true) {
        _logger.w('No current user ID found in JWT storage');
        return null;
      }

      return currentUserId;
    } catch (e) {
      _logger.w('Error getting user ID from JWT: $e');
      return null;
    }
  }

  /// Get current company ID from JWT storage
  static Future<String?> _getCompanyIdFromJWT() async {
    try {
      final jwtStorageService = JWTStorageService();
      final user = await jwtStorageService.getUserInfo();

      if (user?.companyId == null) {
        _logger.d('No company ID found in user info');
        return null;
      }
      return user!.companyId;
    } catch (e) {
      _logger.w('Error getting company ID from JWT: $e');
      return null;
    }
  }

  /// Store photos to gate_check_photos table for sync - Returns count of saved photos
  static Future<int> _storePhotosForGuestLog({
    required EnhancedDatabaseService databaseService,
    required String guestLogId,
    required List<String> photoPaths,
    required String createdBy,
  }) async {
    int savedCount = 0;
    for (int i = 0; i < photoPaths.length; i++) {
      final filePath = photoPaths[i];
      try {
        final file = File(filePath);
        if (!await file.exists()) {
          _logger.w('Photo file not found, skipping: $filePath');
          continue;
        }
        final fileSize = await file.length();
        final fileName = filePath.split('/').last;
        // First photo = VEHICLE_FRONT, second = VEHICLE_BACK
        final photoType = i == 0 ? 'VEHICLE_FRONT' : 'VEHICLE_BACK';

        await databaseService.storeGateCheckPhoto(
          relatedRecordType: 'GUEST_LOG',
          relatedRecordId: guestLogId,
          filePath: filePath,
          fileName: fileName,
          fileSize: fileSize,
          photoType: photoType,
          createdBy: createdBy,
        );
        _logger.i(
          'Photo stored to gate_check_photos: $fileName ($photoType) for guest: $guestLogId',
        );
        savedCount++;
      } catch (e) {
        _logger.e(
          'Failed to store photo to gate_check_photos: $filePath',
          error: e,
        );
      }
    }
    return savedCount;
  }

  /// Generate guest QR token using the correct JWT service method
  static Future<String> _generateGuestQRToken(
    JWTQRService qrService,
    GateCheckFormData formData,
    String generationIntent, { // NEW: 'ENTRY' or 'EXIT'
    String? guestId,
  }) async {
    try {
      // Prefer persisted business guest_id so token and record stay traceable
      final resolvedGuestId = (guestId != null && guestId.isNotEmpty)
          ? guestId
          : 'guest_${DateTime.now().millisecondsSinceEpoch}';

      // Get current user ID directly from JWT storage (no database validation)
      String? currentUserId = await _getUserIdFromJWT();

      if (currentUserId == null) {
        _logger.w(
          'No authenticated user found, using null for QR token creation',
        );
        // QR service can handle null created_by - this is normal for offline-first mobile
      } else {
        _logger.d('Using authenticated user for QR generation: $currentUserId');
      }

      // Generate JWT token with form data and intent
      final token = await qrService.generateGuestToken(
        guestId: resolvedGuestId,
        name: formData.guestName ?? formData.driverName,
        vehiclePlate: formData.vehiclePlate,
        destination: formData.purposeOfVisit ?? formData.destination,
        cargoType: formData.loadType.isNotEmpty ? formData.loadType : 'GUEST',
        generationIntent: generationIntent, // NEW: Intent-based system
        cargoVolume: formData.loadVolume.isNotEmpty
            ? formData.loadVolume
            : null, // "Seperempat", "Setengah", "Penuh"
        vehicleType: formData.vehicleType.isNotEmpty
            ? formData.vehicleType
            : null,
        cargoOwner: formData.guestCompany ?? formData.loadOwner,
        estimatedWeight: formData.estimatedWeight,
        doNumber: formData.doNumber,
        notes: formData.notes,
        createdBy: currentUserId, // Use actual current user ID
      );

      // Generate QR data from token
      final qrData = qrService.generateQRData(token);

      _logger.d(
        'Generated QR token for guest: ${formData.guestName ?? formData.driverName}',
      );
      return qrData;
    } catch (e) {
      _logger.e('Error generating guest QR token', error: e);
      rethrow;
    }
  }
}

/// Service state container
class SatpamDashboardServiceState {
  final EnhancedDatabaseService? databaseService;
  final ConnectivityService? connectivityService;
  final JWTStorageService? jwtStorageService;
  final JWTQRService? qrService;
  final GraphQLSyncService? syncService;
  final bool isInitialized;
  final bool isOfflineMode;

  SatpamDashboardServiceState({
    this.databaseService,
    this.connectivityService,
    this.jwtStorageService,
    this.qrService,
    this.syncService,
    this.isInitialized = false,
    this.isOfflineMode = false,
  });
}

/// Dashboard data container
class SatpamDashboardData {
  final GateCheckStats? todayStats;
  final List<GuestLog> recentLogs;
  final List<AccessLog> recentAccessLogs;
  final Map<String, dynamic> repositoryStats;

  SatpamDashboardData({
    this.todayStats,
    this.recentLogs = const [],
    this.recentAccessLogs = const [],
    this.repositoryStats = const {},
  });
}
