import 'dart:async';
import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:uuid/uuid.dart';

import '../database/enhanced_database_service.dart';
import '../graphql/graphql_client.dart';
import '../graphql/auth_service.dart';
import '../graphql/gate_check_queries.dart';
import '../graphql/satpam_queries.dart';
import '../constants/api_constants.dart';
import 'connectivity_service.dart' as core;
import 'device_service.dart';
import 'unified_secure_storage_service.dart';
import 'photo_compression_service.dart';
import 'enhanced_conflict_resolution_service.dart';

enum _SyncAuthTierOutcome { accessValid, refreshed, renewed, reLoginRequired }

/// GraphQL-based Sync Service for Offline-First Gate Check Operations
///
/// Features:
/// - Offline-first architecture with SQLite storage
/// - GraphQL mutations for server synchronization
/// - Real-time subscriptions for live updates
/// - Batch processing with conflict resolution
/// - Photo compression and upload
/// - Background sync with retry logic
/// - Intent-based QR token synchronization
class GraphQLSyncService {
  static final Logger _logger = Logger();
  final EnhancedDatabaseService _db;
  final AgroGraphQLClient _graphqlClient;
  final core.ConnectivityService _connectivity;
  final PhotoCompressionService _photoService;
  final EnhancedConflictResolutionService _conflictResolver;
  final Uuid _uuid = const Uuid();

  // Sync configuration
  static const int _maxBatchSize = 20;
  static const int _photoBatchSize = 5;
  static const Duration _syncInterval = Duration(minutes: 3);
  static const Duration _retryDelay = Duration(seconds: 30);
  static const Duration _retryDelayAfterRefresh = Duration(seconds: 5);
  static const Duration _retryDelayAfterDeviceRenew = Duration(seconds: 10);

  // Sync queue limits to prevent storage exhaustion
  static const int _maxSyncQueueSize = 10000;
  static const Duration _recordRetentionPeriod = Duration(days: 30);

  // Sync state
  bool _isSyncing = false;
  bool _autoSyncEnabled = true;
  DateTime? _lastSyncAttempt;
  DateTime? _lastSuccessfulSync;
  Timer? _periodicSyncTimer;
  Timer? _retrySyncTimer;
  final StreamController<SyncProgress> _progressController =
      StreamController.broadcast();
  final List<StreamSubscription> _subscriptions = [];

  GraphQLSyncService({
    required EnhancedDatabaseService database,
    required AgroGraphQLClient graphqlClient,
    required core.ConnectivityService connectivity,
    PhotoCompressionService? photoService,
    EnhancedConflictResolutionService? conflictResolver,
  }) : _db = database,
       _graphqlClient = graphqlClient,
       _connectivity = connectivity,
       _photoService = photoService ?? PhotoCompressionService(),
       _conflictResolver =
           conflictResolver ?? EnhancedConflictResolutionService() {
    _initializeSyncService();
  }

  String? _normalizeOptionalText(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  /// Add item to sync queue
  Future<void> addToSyncQueue(Map<String, dynamic> data) async {
    try {
      final db = await _db.database;

      // Check queue size before inserting to prevent storage exhaustion
      final countResult = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED')",
      );
      final currentCount = countResult.first['count'] as int? ?? 0;

      if (currentCount >= _maxSyncQueueSize) {
        _logger.w(
          'Sync queue at maximum capacity ($currentCount). Pruning old records...',
        );
        await _pruneSyncQueue();

        // Recheck after pruning
        final recheckResult = await db.rawQuery(
          "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED')",
        );
        final recheckCount = recheckResult.first['count'] as int? ?? 0;

        if (recheckCount >= _maxSyncQueueSize) {
          _logger.e('Sync queue still full after pruning ($recheckCount)');
          throw Exception(
            'Sync queue full. Please sync data before adding more records.',
          );
        }
      }

      String opType = data['operationType'] ?? data['type'] ?? 'UNKNOWN';

      // Map domain specific types to generic DB operation types
      if (opType.startsWith('harvest_')) {
        final action = opType.replaceFirst('harvest_', '').toUpperCase();
        if (['CREATE', 'UPDATE', 'DELETE'].contains(action)) {
          opType = action;
        }
      }

      // Use table_name from caller (required)
      final tableName = data['tableName'] ?? data['table_name'] ?? 'unknown';

      await db.insert('sync_queue', {
        'operation_id': _uuid.v4(),
        'operation_type': opType,
        'table_name': tableName,
        'record_id': data['recordId'] ?? data['id'] ?? '',
        'data': jsonEncode(data['data'] ?? {}),
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'status': 'PENDING',
      });
      _logger.d('Added to sync queue: ${data['type']}');

      // Trigger immediate sync if online
      if (_connectivity.isOnline) {
        _scheduleImediateSync();
      }
    } catch (e) {
      _logger.e('Error adding to sync queue: $e');
      throw Exception('Failed to add to sync queue');
    }
  }

  /// Get the last sync time
  Future<DateTime?> getLastSyncTime() async {
    try {
      final result = await _db.rawQuery('''
        SELECT sync_completed_at
        FROM sync_logs
        WHERE status = 'COMPLETED'
          AND sync_completed_at IS NOT NULL
        ORDER BY sync_completed_at DESC
        LIMIT 1
      ''');

      if (result.isNotEmpty) {
        final rawValue = result.first['sync_completed_at'];
        final timestamp = rawValue is int
            ? rawValue
            : int.tryParse(rawValue?.toString() ?? '');

        if (timestamp != null && timestamp > 0) {
          _lastSuccessfulSync = DateTime.fromMillisecondsSinceEpoch(timestamp);
        }
      }
    } catch (e) {
      _logger.w('Failed to load last sync timestamp from sync_logs', error: e);
    }

    return _lastSuccessfulSync;
  }

  /// Initialize sync service with periodic sync and connectivity monitoring
  void _initializeSyncService() {
    _logger.i('Initializing GraphQL sync service...');

    // Start periodic sync
    _periodicSyncTimer = Timer.periodic(_syncInterval, (_) {
      if (_autoSyncEnabled &&
          !_isSyncing &&
          _connectivity.isOnline &&
          _graphqlClient.isInitialized) {
        _performFullSync();
      }
    });

    // Listen to connectivity changes
    _connectivity.networkStatusStream.listen((status) async {
      if (status == core.NetworkStatus.online && _autoSyncEnabled) {
        // Try to initialize GraphQL client if not already initialized
        if (!_graphqlClient.isInitialized) {
          _logger.i(
            'Network online but GraphQL client not initialized, attempting initialization...',
          );
          try {
            await _graphqlClient.initialize(baseUrl: ApiConstants.baseUrl);
            _logger.i('GraphQL client initialized after connectivity restored');
            _setupRealTimeSubscriptions();
          } catch (e) {
            _logger.e(
              'Failed to initialize GraphQL client after connectivity restored',
              error: e,
            );
            return;
          }
        }
        _scheduleImediateSync();
      }
    });

    // Setup real-time subscriptions (only if client is initialized)
    if (_graphqlClient.isInitialized) {
      _setupRealTimeSubscriptions();
    }
  }

  /// Force immediate synchronization
  Future<GraphQLSyncResult> forceSyncNow() async {
    return await syncNow(forceFullSync: true);
  }

  void _scheduleImediateSync() {
    if (!_isSyncing && _graphqlClient.isInitialized) {
      _performFullSync();
    }
  }

  /// Setup periodic sync timer
  void _setupPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(_syncInterval, (_) {
      if (_autoSyncEnabled &&
          _connectivity.isOnline &&
          !_isSyncing &&
          _graphqlClient.isInitialized) {
        _performFullSync();
      }
    });
  }

  /// Setup real-time GraphQL subscriptions
  void _setupRealTimeSubscriptions() {
    unawaited(_setupRealTimeSubscriptionsAsync());
  }

  Future<void> _setupRealTimeSubscriptionsAsync() async {
    try {
      // Check if GraphQL client is properly initialized before subscribing
      // The client may not be ready if called too early during app startup
      try {
        // This will throw if _client is not initialized
        _graphqlClient.client;
      } catch (e) {
        _logger.w(
          'GraphQL client not yet initialized, skipping real-time subscriptions setup',
        );
        // Schedule retry after a short delay
        Timer(const Duration(seconds: 5), () {
          if (_autoSyncEnabled && _connectivity.isOnline) {
            _setupRealTimeSubscriptions();
          }
        });
        return;
      }

      // Subscribe to real-time vehicle entry updates
      final vehicleEntrySubscription = _graphqlClient
          .subscribe<Map<String, dynamic>>(
            GateCheckQueries.guestLogUpdatesOptions(),
          );

      _subscriptions.add(
        vehicleEntrySubscription.listen(
          (result) => _handleVehicleEntrySubscriptionUpdate(result),
          onError: (error) {
            _logger.e('Vehicle entry subscription error', error: error);
            _reconnectSubscriptions();
          },
        ),
      );

      // Subscribe to device-scoped sync status updates
      final deviceId = await _getDeviceId();
      if (deviceId.isNotEmpty) {
        final syncStatusSubscription = _graphqlClient
            .subscribe<Map<String, dynamic>>(
              SatpamQueries.satpamSyncUpdateOptions(deviceId: deviceId),
            );

        _subscriptions.add(
          syncStatusSubscription.listen(
            (result) => _handleSyncStatusSubscriptionUpdate(result),
            onError: (error) {
              _logger.e('Sync status subscription error', error: error);
              _reconnectSubscriptions();
            },
          ),
        );
      }

      _logger.d('Real-time satpam GraphQL subscriptions established');
    } catch (e) {
      _logger.e('Failed to setup real-time subscriptions', error: e);
    }
  }

  Future<void> _handleVehicleEntrySubscriptionUpdate(QueryResult result) async {
    try {
      if (result.hasException || result.data == null) return;

      final payload = result.data!['satpamVehicleEntry'];
      if (payload is! Map) return;

      final record = Map<String, dynamic>.from(payload);
      final guestLogId = record['id'] as String?;
      if (guestLogId == null || guestLogId.isEmpty) return;

      await _handleGuestLogUpdated({'guestLogId': guestLogId, ...record});
    } catch (e) {
      _logger.e('Error handling vehicle entry subscription update', error: e);
    }
  }

  void _handleSyncStatusSubscriptionUpdate(QueryResult result) {
    try {
      if (result.hasException || result.data == null) return;

      final payload = result.data!['satpamSyncUpdate'];
      if (payload is! Map) return;

      final status = Map<String, dynamic>.from(payload);
      final pendingSyncCount =
          (status['pendingSyncCount'] as num?)?.toInt() ?? 0;
      final lastSyncAtRaw = status['lastSyncAt'] as String?;

      if (lastSyncAtRaw != null && lastSyncAtRaw.isNotEmpty) {
        _lastSuccessfulSync = DateTime.tryParse(lastSyncAtRaw);
      }

      // If server signals there are pending records, trigger an immediate sync attempt.
      if (pendingSyncCount > 0 &&
          !_isSyncing &&
          _connectivity.isOnline &&
          _graphqlClient.isInitialized) {
        _scheduleImediateSync();
      }
    } catch (e) {
      _logger.e('Error handling sync status subscription update', error: e);
    }
  }

  /// Handle legacy real-time updates from GraphQL subscriptions.
  // ignore: unused_element
  Future<void> _handleRealTimeUpdate(QueryResult result) async {
    try {
      if (result.hasException || result.data == null) return;

      final updateData = result.data!['gateCheckUpdates'];
      if (updateData == null) return;

      final updateType = updateData['type'] as String?;
      final data = updateData['data'];

      if (data == null) return;

      switch (updateType) {
        case 'QRTokenGenerated':
          await _handleQRTokenGenerated(data);
          break;
        case 'QRTokenValidated':
          await _handleQRTokenValidated(data);
          break;
        case 'GuestLogUpdated':
          await _handleGuestLogUpdated(data);
          break;
        case 'PhotoUploaded':
          await _handlePhotoUploaded(data);
          break;
        default:
          _logger.d('Unknown real-time update type: $updateType');
      }
    } catch (e) {
      _logger.e('Error handling real-time update', error: e);
    }
  }

  /// Handle QR token generation updates
  Future<void> _handleQRTokenGenerated(Map<String, dynamic> data) async {
    try {
      final tokenId = data['tokenId'] as String?;
      final guestName = data['guestName'] as String?;
      final intent = data['generationIntent'] as String?;

      if (tokenId != null) {
        // Update local cache with server-generated token info
        await _db.insert('qr_tokens_cache', {
          'token_id': tokenId,
          'driver_name': guestName,
          'generation_intent': intent,
          'status': 'ACTIVE',
          'created_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        });

        _logger.d('QR token generation update cached: $tokenId');
      }
    } catch (e) {
      _logger.e('Error handling QR token generated update', error: e);
    }
  }

  /// Handle QR token validation updates
  Future<void> _handleQRTokenValidated(Map<String, dynamic> data) async {
    try {
      final tokenId = data['tokenId'] as String?;
      final validatedAt = data['validatedAt'] as String?;

      if (tokenId != null) {
        // Update local token cache
        await _db.update(
          'qr_tokens_cache',
          {
            'status': 'USED',
            'validated_at': validatedAt != null
                ? DateTime.parse(validatedAt).millisecondsSinceEpoch
                : DateTime.now().millisecondsSinceEpoch,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          },
          where: 'token_id = ?',
          whereArgs: [tokenId],
        );

        _logger.d('QR token validation update cached: $tokenId');
      }
    } catch (e) {
      _logger.e('Error handling QR token validated update', error: e);
    }
  }

  /// Handle guest log updates
  Future<void> _handleGuestLogUpdated(Map<String, dynamic> data) async {
    try {
      final guestLogId = data['guestLogId'] as String?;

      if (guestLogId != null) {
        // Check for conflicts with local data
        final localRecord = await _db.query(
          'gate_guest_logs',
          where: 'guest_id = ? OR server_record_id = ?',
          whereArgs: [guestLogId, guestLogId],
          limit: 1,
        );

        if (localRecord.isNotEmpty) {
          // Handle potential conflict
          await _conflictResolver.resolveGuestLogConflict(
            localData: localRecord.first,
            serverData: data,
          );
        }

        _logger.d('Guest log update processed: $guestLogId');
      }
    } catch (e) {
      _logger.e('Error handling guest log update', error: e);
    }
  }

  /// Handle photo upload updates
  Future<void> _handlePhotoUploaded(Map<String, dynamic> data) async {
    try {
      final photoId = data['photoId'] as String?;
      final tokenId = data['tokenId'] as String?;

      if (photoId != null) {
        // Update local photo sync status
        await _db.update(
          'gate_check_photos',
          {
            'sync_status': 'SYNCED',
            'server_photo_id': photoId,
            'synced_at': DateTime.now().millisecondsSinceEpoch,
          },
          where:
              'photo_id = ? OR (gate_check_id IN (SELECT guest_id FROM gate_guest_logs WHERE qr_token = ?))',
          whereArgs: [photoId, tokenId],
        );

        _logger.d('Photo upload update processed: $photoId');
      }
    } catch (e) {
      _logger.e('Error handling photo upload update', error: e);
    }
  }

  /// Reconnect subscriptions after error
  void _reconnectSubscriptions() {
    _logger.w('Reconnecting real-time subscriptions...');

    // Cancel existing subscriptions
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _subscriptions.clear();

    // Wait before reconnecting
    Timer(const Duration(seconds: 5), () {
      if (_connectivity.isOnline) {
        _setupRealTimeSubscriptions();
      }
    });
  }

  /// Ensure a valid access token exists before making authenticated GraphQL
  /// calls. Implements the 3-tier strategy:
  ///   Tier 1 — Access token valid        → proceed
  ///   Tier 2 — Access expired            → call refreshToken mutation
  ///   Tier 3 — Refresh expired/revoked   → call deviceRenew mutation
  ///   All failed                         → return false (user must re-login)
  Future<_SyncAuthTierOutcome> _ensureAuthWithTier() async {
    // Tier 1: only proceed if access token itself is still valid.
    final accessToken = await UnifiedSecureStorageService.getAccessToken();
    final hasAccessToken = accessToken != null && accessToken.trim().isNotEmpty;
    if (hasAccessToken) {
      final accessNeedsRefresh =
          await UnifiedSecureStorageService.needsTokenRefresh();
      if (!accessNeedsRefresh) {
        return _SyncAuthTierOutcome.accessValid;
      }
      _logger.i(
        '_ensureAuth: access token expired/near expiry, trying refresh tiers...',
      );
    }

    final authGql = GraphQLAuthService(_graphqlClient.client);
    final deviceInfo = await DeviceService.getDeviceInfo();

    // Tier 2: try refreshToken
    final refreshToken = await UnifiedSecureStorageService.getRefreshToken();
    if (refreshToken != null) {
      try {
        _logger.i('_ensureAuth: access expired, trying refreshToken...');
        final payload = await authGql.refreshToken(
          refreshToken: refreshToken,
          deviceId: deviceInfo.deviceId,
          deviceFingerprint: deviceInfo.fingerprint,
        );
        await UnifiedSecureStorageService.storeAuthResponse(payload);
        await _graphqlClient.updateAuthToken(payload.accessToken);
        _logger.i('_ensureAuth: refreshToken succeeded');
        return _SyncAuthTierOutcome.refreshed;
      } catch (e) {
        _logger.w('_ensureAuth: refreshToken failed: $e');
      }
    }

    // Tier 3: try deviceRenew
    final offlineToken = await UnifiedSecureStorageService.getOfflineToken();
    if (offlineToken != null) {
      try {
        _logger.i('_ensureAuth: trying deviceRenew...');
        final payload = await authGql.deviceRenew(
          offlineToken: offlineToken,
          deviceId: deviceInfo.deviceId,
          deviceFingerprint: deviceInfo.fingerprint,
        );
        await UnifiedSecureStorageService.storeAuthResponse(payload);
        await _graphqlClient.updateAuthToken(payload.accessToken);
        _logger.i('_ensureAuth: deviceRenew succeeded');
        return _SyncAuthTierOutcome.renewed;
      } catch (e) {
        _logger.w('_ensureAuth: deviceRenew failed: $e');
      }
    }

    _logger.e('_ensureAuth: all auth tiers exhausted');
    return _SyncAuthTierOutcome.reLoginRequired;
  }

  /// Perform manual sync with progress tracking
  Future<GraphQLSyncResult> syncNow({bool forceFullSync = false}) async {
    if (_isSyncing) {
      return GraphQLSyncResult.error('Sync already in progress');
    }

    // Check connectivity - do an active check for USB debugging scenarios
    if (!_connectivity.isOnline) {
      _logger.w(
        'Connectivity reports offline, attempting active connection check...',
      );
      final hasConnection = await _connectivity.checkConnection();
      if (!hasConnection) {
        return GraphQLSyncResult.error('No internet connection');
      }
      _logger.i('Active connection check succeeded - proceeding with sync');
    }

    // Try to initialize GraphQL client if not initialized
    if (!_graphqlClient.isInitialized) {
      _logger.w('GraphQL client not initialized, attempting to initialize...');
      try {
        await _graphqlClient.initialize(baseUrl: ApiConstants.baseUrl);
        _logger.i('GraphQL client initialized successfully during sync');
      } catch (e) {
        _logger.e('Failed to initialize GraphQL client during sync', error: e);
        return GraphQLSyncResult.error(
          'GraphQL client initialization failed. Please restart the app.',
        );
      }
    }

    // Double check after initialization attempt
    if (!_graphqlClient.isInitialized) {
      _logger.w('GraphQL client still not initialized after attempt');
      return GraphQLSyncResult.error(
        'GraphQL client not initialized. Please restart the app.',
      );
    }

    return await _performFullSync(forceFullSync: forceFullSync);
  }

  /// Perform full synchronization
  Future<GraphQLSyncResult> _performFullSync({
    bool forceFullSync = false,
  }) async {
    _isSyncing = true;
    _lastSyncAttempt = DateTime.now();

    try {
      // Check if GraphQL client is initialized before proceeding
      if (!_graphqlClient.isInitialized) {
        _logger.w('GraphQL client not initialized, skipping sync operations');
        _isSyncing = false;
        return GraphQLSyncResult.error('GraphQL client not initialized');
      }

      // Ensure valid access token using 3-tier strategy before sync
      final authOutcome = await _ensureAuthWithTier();
      if (authOutcome == _SyncAuthTierOutcome.reLoginRequired) {
        _logger.w(
          'All auth tiers failed — user must re-login before sync can proceed.',
        );
        _isSyncing = false;
        return GraphQLSyncResult.error(
          'Sesi berakhir. Silahkan login ulang untuk melanjutkan sinkronisasi.',
        );
      }

      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.starting,
          message: 'Starting GraphQL synchronization...',
          progress: 0.0,
        ),
      );

      final result = GraphQLSyncResult.success();

      // Phase 1: Upload guest logs
      final guestLogResult = await _syncGuestLogs();
      result.mergeWith(guestLogResult);

      // Phase 2: Upload employee logs
      final employeeLogResult = await _syncEmployeeLogs();
      result.mergeWith(employeeLogResult);

      // Phase 3: Sync QR tokens
      final qrTokenResult = await _syncQRTokens();
      result.mergeWith(qrTokenResult);

      // Phase 4: Upload photos (batch processing)
      final photoResult = await _syncPhotos();
      result.mergeWith(photoResult);

      // Phase 5: Resolve any conflicts
      final conflictResult = await _resolveConflicts();
      result.mergeWith(conflictResult);

      // Phase 6: Pull server updates
      final pullResult = await _pullServerUpdates();
      result.mergeWith(pullResult);

      // Update sync timestamp
      if (result.success) {
        _lastSuccessfulSync = DateTime.now();
        await _updateSyncTimestamp(result.success);
      }

      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.completed,
          message: result.message,
          progress: 1.0,
          result: result,
        ),
      );

      if (!result.success) {
        await _scheduleRetryForFailure(
          messages: [result.message, ...result.errors],
        );
      }

      return result;
    } catch (e) {
      _logger.e('GraphQL sync failed', error: e);

      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Sync failed: ${e.toString()}',
      );
      final errorResult = GraphQLSyncResult.error(errorMessage);

      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.error,
          message: errorResult.message,
          progress: 0.0,
          result: errorResult,
        ),
      );

      await _scheduleRetryForFailure(
        sourceError: e,
        messages: [errorResult.message],
      );

      return errorResult;
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync guest logs using GraphQL mutations
  /// Note: Guest log sync is only available for SATPAM role
  Future<GraphQLSyncResult> _syncGuestLogs() async {
    try {
      // Check if current user is SATPAM - guest log sync is only for security role
      final user = await UnifiedSecureStorageService.getUserInfo();
      final userRole = user?.role.toUpperCase() ?? '';

      if (userRole != 'SATPAM') {
        _logger.d(
          'Skipping guest log sync - not available for role: $userRole',
        );
        return GraphQLSyncResult(
          success: true,
          message: 'Guest log sync skipped (not applicable for $userRole role)',
          recordsProcessed: 0,
          errors: [],
        );
      }

      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.syncingGuestLogs,
          message: 'Syncing guest logs to server...',
          progress: 0.1,
        ),
      );

      final pendingLogs = await _db.query(
        'gate_guest_logs',
        where: 'sync_status IN (?, ?)',
        whereArgs: ['PENDING', 'FAILED'],
        limit: _maxBatchSize,
        orderBy: 'created_at ASC',
      );

      if (pendingLogs.isEmpty) {
        _logger.d('No pending guest logs to sync');
        return GraphQLSyncResult(
          success: true,
          message: 'No guest logs to sync',
          recordsProcessed: 0,
          errors: [],
        );
      }

      final deviceId = await _getDeviceId();
      final errors = <String>[];

      // Build batch records for Satpam sync
      final guestLogRecords = <Map<String, dynamic>>[];
      for (final logData in pendingLogs) {
        // STRICT ID CHECK: Must have guest_id to sync back status correctly
        final localId = logData['guest_id']?.toString();
        if (localId == null || localId.isEmpty) {
          _logger.e(
            'Found guest log without guest_id in pending queue. Skipping to avoid sync status mismatch. Record: $logData',
          );
          continue;
        }

        // Handle timestamps based on generation_intent
        final intent = logData['generation_intent']?.toString();
        int? entryTimeMs = logData['entry_time'] as int?;
        int? exitTimeMs = logData['exit_time'] as int?;

        // Only fallback to created_at for ENTRY records
        if (intent == 'ENTRY' && entryTimeMs == null) {
          entryTimeMs =
              logData['timestamp'] as int? ?? logData['created_at'] as int?;
        }
        // Only fallback to created_at for EXIT records
        if (intent == 'EXIT' && exitTimeMs == null) {
          exitTimeMs =
              logData['timestamp'] as int? ?? logData['created_at'] as int?;
        }

        // Map Indonesian vehicle types to GraphQL VehicleType enum
        // Backend enum: CAR, TRUCK, PICKUP, VAN, MOTORBIKE, BUS, OTHER
        // Mobile uses: Truk, Mobil, PickUp, Van, Motor, Bus, Lainnya
        String mapVehicleType(String? vehicleType) {
          final type = (vehicleType ?? '').toLowerCase().trim();
          switch (type) {
            case 'truk':
            case 'truck':
              return 'TRUCK';
            case 'mobil':
            case 'car':
              return 'CAR';
            case 'pickup':
            case 'pick up':
            case 'pick-up':
              return 'PICKUP';
            case 'van':
            case 'minibus':
              return 'VAN';
            case 'motor':
            case 'motorbike':
            case 'motorcycle':
              return 'MOTORBIKE';
            case 'bus':
              return 'BUS';
            case 'lainnya':
            case 'other':
            default:
              return 'OTHER';
          }
        }

        // Status is raw ENTRY/EXIT from generation_intent
        guestLogRecords.add({
          'id': localId,
          'serverId': logData['server_record_id'],
          'operation': logData['server_record_id'] != null
              ? 'UPDATE'
              : 'CREATE',
          'data': {
            'localId': logData['guest_id']?.toString() ?? localId,
            'driverName': logData['driver_name']?.toString() ?? 'Unknown',
            'vehiclePlate': logData['vehicle_plate']?.toString() ?? '',
            'vehicleType': mapVehicleType(logData['vehicle_type']?.toString()),
            'destination': logData['destination']?.toString(),
            // Cargo Fields
            'loadType': logData['load_type']?.toString(),
            'cargoVolume': logData['cargo_volume']?.toString(),
            'cargoOwner': logData['cargo_owner']?.toString(),
            'estimatedWeight': logData['estimated_weight'] != null
                ? (logData['estimated_weight'] is num
                      ? logData['estimated_weight'].toDouble()
                      : double.tryParse(logData['estimated_weight'].toString()))
                : null,
            'deliveryOrderNumber': logData['delivery_order_number']?.toString(),
            'gatePosition':
                logData['gate_position']?.toString() ??
                logData['entry_gate']?.toString() ??
                logData['exit_gate']?.toString(),
            'notes': logData['notes']?.toString(),
            'latitude': logData['latitude'] as double?,
            'longitude': logData['longitude'] as double?,
            'idCardNumber': logData['id_card_number']?.toString(),
            'secondCargo': _normalizeOptionalText(
              logData['second_cargo'] ?? logData['secondCargo'],
            ),
            // Time and gate fields
            'entryTime': entryTimeMs != null
                ? DateTime.fromMillisecondsSinceEpoch(
                    entryTimeMs,
                  ).toUtc().toIso8601String()
                : null,
            'exitTime': exitTimeMs != null
                ? DateTime.fromMillisecondsSinceEpoch(
                    exitTimeMs,
                  ).toUtc().toIso8601String()
                : null,
            'entryGate': logData['entry_gate']?.toString(),
            'exitGate': logData['exit_gate']?.toString(),
            'generationIntent': logData['generation_intent']?.toString(),
            'registrationSource': logData['registration_source']?.toString(),
          },
          'localVersion': logData['local_version'] ?? 1,
          'lastUpdated': DateTime.now().toUtc().toIso8601String(),
          'photoIds': <String>[],
        });
      }

      // Use Satpam batch sync mutation
      final mutationOptions = SatpamQueries.syncSatpamRecordsOptions(
        deviceId: deviceId,
        guestLogs: guestLogRecords,
        clientTimestamp: DateTime.now().toUtc(),
        conflictResolution: 'LATEST_WINS',
      );

      final result = await _graphqlClient.mutate(mutationOptions);

      if (result.hasException) {
        _logger.e('GraphQL mutation failed', error: result.exception);
        final errorMessage = await _resolveSyncErrorMessage(
          result.exception!,
          fallback: 'Sync failed: ${result.exception}',
        );
        return GraphQLSyncResult.error(errorMessage);
      }

      final syncData = result.data?['syncSatpamRecords'];
      if (syncData == null) {
        return GraphQLSyncResult.error('No sync response from server');
      }

      final success = syncData['success'] as bool? ?? false;
      final transactionId = syncData['transactionId'] as String?;
      final syncResults = syncData['results'] as List<dynamic>? ?? [];

      // Update local records based on sync results
      int processedCount = 0;
      for (final syncResult in syncResults) {
        final localId = syncResult['id'] as String?;
        final itemSuccess = syncResult['success'] as bool? ?? false;
        final serverId = syncResult['serverId'] as String?;
        final error = syncResult['error'] as String?;

        if (localId == null) {
          _logger.w('Sync result missing localId, skipping update');
          continue;
        }

        if (itemSuccess && serverId != null) {
          final rowsUpdated = await _db.update(
            'gate_guest_logs',
            {
              'sync_status': 'SYNCED',
              'server_record_id': serverId,
              'sync_transaction_id': transactionId,
              'synced_at': DateTime.now().millisecondsSinceEpoch,
            },
            where: 'guest_id = ?',
            whereArgs: [localId],
          );

          if (rowsUpdated > 0) {
            processedCount++;
            _logger.d(
              'Guest log synced and updated locally: $localId -> $serverId',
            );

            // Update sync_queue to clear the "Pending" count on dashboard
            try {
              final queueUpdated = await _db.update(
                'sync_queue',
                {
                  'status': 'COMPLETED',
                  'completed_at': DateTime.now().millisecondsSinceEpoch,
                  'server_record_id': serverId,
                },
                where: 'table_name = ? AND record_id = ? AND status = ?',
                whereArgs: ['gate_guest_logs', localId, 'PENDING'],
              );
              _logger.d(
                'Updated sync_queue for guest log $localId: $queueUpdated items completed',
              );
            } catch (queueError) {
              _logger.w(
                'Failed to update sync_queue for $localId',
                error: queueError,
              );
            }
          } else {
            _logger.w(
              'Guest log synced to server but failed to update local status. GuestID: $localId (Rows updated: 0)',
            );
            // This logic path confirms the user's issue: Server OK, but Local DB not updated.
            // Usually implies guest_id mismatch or record deleted.
          }
        } else {
          errors.add('Failed to sync $localId: ${error ?? "unknown error"}');
          await _db.update(
            'gate_guest_logs',
            {'sync_status': 'FAILED'},
            where: 'guest_id = ?',
            whereArgs: [localId],
          );
        }
      }

      return GraphQLSyncResult(
        success: success && errors.isEmpty,
        message: syncData['message'] as String? ?? 'Sync completed',
        recordsProcessed: processedCount,
        errors: errors,
      );
    } catch (e) {
      _logger.e('Error syncing guest logs', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Guest logs sync failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Sync employee logs using GraphQL mutations
  Future<GraphQLSyncResult> _syncEmployeeLogs() async {
    try {
      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.syncingAccessLogs,
          message: 'Syncing employee logs to server...',
          progress: 0.2,
        ),
      );

      // Query pending employee logs from local database
      final pendingLogs = await _db.query(
        'gate_employee_logs',
        where: 'sync_status IN (?, ?)',
        whereArgs: ['PENDING', 'FAILED'],
        limit: _maxBatchSize,
        orderBy: 'created_at ASC',
      );

      if (pendingLogs.isEmpty) {
        _logger.d('No pending employee logs to sync');
        return GraphQLSyncResult(
          success: true,
          message: 'No employee logs to sync',
          recordsProcessed: 0,
          errors: [],
        );
      }

      int processedCount = 0;
      final errors = <String>[];

      // Build batch records for sync - based on EMPLOYEE_ACCESS QR format
      final records = <Map<String, dynamic>>[];
      for (final logData in pendingLogs) {
        records.add({
          'localId': logData['log_id'],
          'serverId': logData['server_record_id'],
          'companyId': logData['company_id'], // Added companyId
          // QR Code fields
          'iddata': logData['iddata'],
          'nik': logData['employee_id'], // Mapped from employee_id
          'nama': logData['employee_name'], // Mapped from employee_name
          'departement': logData['department'], // Mapped from department
          // Gate check fields
          'action': logData['action'],
          'gatePosition': logData['gate_id'], // Mapped from gate_id
          'scannedAt': (logData['entry_time'] ?? logData['created_at'])
              ?.toString(), // Mapped from entry_time
          'qrTimestamp': logData['created_at']
              ?.toString(), // Mapped from created_at
          // Scan info
          'scannedById': logData['created_by'], // Mapped from created_by
          'deviceId': logData['device_id'],
          // Optional
          'photoPath': logData['photo_path'],
          'notes': logData['notes'],
          // Coordinates not in schema, ignoring or assuming null
          // 'latitude': logData['latitude'],
          // 'longitude': logData['longitude'],
          // Sync
          'localVersion': logData['local_version'] ?? 1,
        });
      }

      // Process each log individually (can be optimized to batch later)
      for (int i = 0; i < pendingLogs.length; i++) {
        final logData = pendingLogs[i];
        final record = records[i];

        try {
          // Use existing syncGuestLog mutation structure adapted for employee
          final mutationOptions = GateCheckQueries.syncEmployeeLogOptions(
            deviceId: await _getDeviceId(),
            record: record,
            clientTimestamp: DateTime.now().toUtc().toIso8601String(),
          );

          final result = await _graphqlClient.mutate(mutationOptions);

          if (result.hasException) {
            final errorMessage = await _resolveSyncErrorMessage(
              result.exception!,
              fallback: 'GraphQL mutation failed: ${result.exception}',
            );
            throw Exception(errorMessage);
          }

          final syncData = result.data?['syncEmployeeLog'];
          if (syncData?['success'] == true) {
            // Update local record as synced
            await _db.update(
              'gate_employee_logs',
              {
                'sync_status': 'SYNCED',
                'server_record_id': syncData['employeeLogId'],
                'synced_at': DateTime.now().millisecondsSinceEpoch,
              },
              where: 'log_id = ?',
              whereArgs: [logData['log_id']],
            );

            processedCount++;
            _logger.d(
              'Employee log synced: ${logData['local_id'] ?? logData['log_id']}',
            );
          } else {
            throw Exception(
              'Server rejected employee log sync: ${syncData?['message']}',
            );
          }
        } catch (e) {
          final logId = logData['local_id'] ?? logData['log_id'];
          errors.add('Failed to sync employee log $logId: $e');

          // Mark as failed for retry
          await _db.update(
            'gate_employee_logs',
            {'sync_status': 'FAILED'},
            where: 'log_id = ?',
            whereArgs: [logData['log_id']],
          );
        }
      }

      return GraphQLSyncResult(
        success: errors.isEmpty,
        message: 'Employee logs sync completed: $processedCount processed',
        recordsProcessed: processedCount,
        errors: errors,
      );
    } catch (e) {
      _logger.e('Error syncing employee logs', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Employee logs sync failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Get device ID for sync operations
  Future<String> _getDeviceId() async {
    return DeviceService.getDeviceId();
  }

  /// Map local database photo type to backend schema enum
  String _mapPhotoType(String localType) {
    switch (localType.toUpperCase()) {
      case 'ENTRY':
        return 'ENTRY';
      case 'EXIT':
        return 'EXIT';
      case 'VEHICLE':
        return 'VEHICLE';
      case 'VEHICLE_FRONT':
        return 'FRONT';
      case 'VEHICLE_BACK':
        return 'BACK';
      case 'GUEST':
        return 'GENERAL';
      case 'DOCUMENT':
        return 'DOCUMENT';
      case 'QR_CODE':
        return 'GENERAL';
      default:
        return 'GENERAL';
    }
  }

  Future<String?> _resolveAuthErrorMessage(OperationException exception) async {
    var isUnauthenticated = false;

    for (final error in exception.graphqlErrors) {
      final code = error.extensions?['code']?.toString();
      final message = error.message.toLowerCase();

      if (code == 'UNAUTHENTICATED' ||
          code == 'ACCESS_EXPIRED' ||
          message.contains('authentication required') ||
          message.contains('access token expired') ||
          message.contains('no user context') ||
          message.contains('tidak terautentikasi')) {
        isUnauthenticated = true;
        break;
      }
    }

    if (!isUnauthenticated) {
      return null;
    }

    final token = await UnifiedSecureStorageService.getAccessToken();
    if (token == null || token.trim().isEmpty) {
      return 'Token tidak ditemukan';
    }

    if (await UnifiedSecureStorageService.needsTokenRefresh()) {
      return 'Token kadaluarsa';
    }

    // Token exists but auth failed (revoked/invalid). Treat as expired for user clarity.
    return 'Token kadaluarsa';
  }

  Future<String> _resolveSyncErrorMessage(
    Object error, {
    String? fallback,
  }) async {
    if (error is OperationException) {
      final authMessage = await _resolveAuthErrorMessage(error);
      if (authMessage != null) {
        return authMessage;
      }
    }

    return fallback ?? error.toString();
  }

  /// Sync QR tokens using GraphQL mutations
  Future<GraphQLSyncResult> _syncQRTokens() async {
    try {
      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.syncingQRTokens,
          message: 'Syncing QR tokens...',
          progress: 0.3,
        ),
      );

      final pendingTokens = await _db.query(
        'gate_qr_tokens',
        where: 'sync_status = ?',
        whereArgs: ['PENDING'],
        limit: _maxBatchSize,
      );

      int processedCount = 0;
      final errors = <String>[];

      for (final tokenData in pendingTokens) {
        try {
          // For Intent-Based QR System, sync validation results
          if (tokenData['validation_status'] != null) {
            final mutationOptions = GateCheckQueries.validateQRTokenOptions(
              qrToken: tokenData['token_data'],
              scanIntent: tokenData['scan_intent'] ?? 'ENTRY',
              deviceId: tokenData['device_id'],
              scannerLocation: tokenData['scanner_location'],
            );

            final result = await _graphqlClient.mutate(mutationOptions);

            if (result.hasException) {
              final errorMessage = await _resolveSyncErrorMessage(
                result.exception!,
                fallback: 'QR validation sync failed: ${result.exception}',
              );
              throw Exception(errorMessage);
            }

            final validationData = result.data?['validateQRToken'];
            if (validationData?['success'] == true) {
              await _db.update(
                'qr_tokens',
                {
                  'sync_status': 'SYNCED',
                  'server_validation_id':
                      validationData['tokenData']?['tokenId'],
                  'synced_at': DateTime.now().millisecondsSinceEpoch,
                },
                where: 'id = ?',
                whereArgs: [tokenData['id']],
              );
              processedCount++;
            }
          } else {
            // Skip tokens without validation status
            processedCount++;
          }
        } catch (e) {
          errors.add('Failed to sync QR token ${tokenData['id']}: $e');
          await _db.update(
            'qr_tokens',
            {'sync_status': 'FAILED', 'sync_error': e.toString()},
            where: 'id = ?',
            whereArgs: [tokenData['id']],
          );
        }
      }

      return GraphQLSyncResult(
        success: errors.isEmpty,
        message: 'QR tokens sync completed',
        recordsProcessed: processedCount,
        errors: errors,
      );
    } catch (e) {
      _logger.e('Error syncing QR tokens', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'QR tokens sync failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Sync photos using GraphQL mutations with compression
  Future<GraphQLSyncResult> _syncPhotos() async {
    try {
      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.syncingPhotos,
          message: 'Compressing and uploading photos...',
          progress: 0.6,
        ),
      );

      final pendingPhotos = await _db.rawQuery(
        '''
        SELECT p.* FROM gate_check_photos p
        LEFT JOIN gate_guest_logs l ON p.related_record_id = l.guest_id
        WHERE p.sync_status IN ('PENDING', 'FAILED')
        AND (p.related_record_type != 'GUEST_LOG' OR l.sync_status = 'SYNCED')
        ORDER BY p.taken_at ASC
        LIMIT ?
      ''',
        [_photoBatchSize],
      );

      // --- DEBUG START ---
      try {
        final allPhotosCount = await _db.rawQuery(
          'SELECT COUNT(*) as count FROM gate_check_photos',
        );
        _logger.i(
          '📸 DEBUG: Total photos in DB: ${allPhotosCount.first['count']}',
        );

        final statusCounts = await _db.rawQuery(
          'SELECT sync_status, COUNT(*) as count FROM gate_check_photos GROUP BY sync_status',
        );
        _logger.i('📸 DEBUG: Photo status breakdown: $statusCounts');

        final blockedPhotos = await _db.rawQuery('''
          SELECT p.photo_id, p.related_record_id, l.sync_status as parent_status 
          FROM gate_check_photos p
          LEFT JOIN gate_guest_logs l ON p.related_record_id = l.guest_id
          WHERE p.sync_status IN ('PENDING', 'FAILED')
          AND p.related_record_type = 'GUEST_LOG'
          AND (l.sync_status != 'SYNCED' OR l.sync_status IS NULL)
          LIMIT 5
        ''');
        if (blockedPhotos.isNotEmpty) {
          _logger.w(
            '📸 DEBUG: Sample blocked photos (Parent not synced): $blockedPhotos',
          );
        }
      } catch (e) {
        _logger.e('📸 DEBUG ERROR: $e');
      }
      // --- DEBUG END ---

      _logger.i(
        '📸 Syncing photos: Found ${pendingPhotos.length} pending photos eligible for sync',
      );

      if (pendingPhotos.isEmpty) {
        return GraphQLSyncResult(
          success: true,
          message: 'No photos to sync',
          recordsProcessed: 0,
          errors: [],
        );
      }

      int processedCount = 0;
      final errors = <String>[];

      // Group photos by guest log ID for Satpam sync
      final photoGroups = <String, List<Map<String, dynamic>>>{};
      for (final photo in pendingPhotos) {
        // Correct column is related_record_id in enhanced_database_service
        final guestLogId = photo['related_record_id']?.toString() ?? '';
        if (guestLogId.isEmpty) {
          _logger.w(
            '⚠️ Photo ${photo['photo_id']} skipped: Missing related_record_id',
          );
          continue;
        }

        photoGroups[guestLogId] ??= [];
        photoGroups[guestLogId]!.add(photo);
      }

      final deviceId = await _getDeviceId();
      final batchId = _uuid.v4();

      _logger.d('📸 Photo groups to sync: ${photoGroups.keys.length}');

      for (final entry in photoGroups.entries) {
        try {
          final guestLogId = entry.key;
          final photos = entry.value;

          _logger.i(
            '📸 Processing batch for GuestLog: $guestLogId (${photos.length} photos)',
          );

          // Map to SatpamPhotoSyncRecord for backend
          final syncPhotosInput = <Map<String, dynamic>>[];
          for (final photo in photos) {
            try {
              final compressedData = await _photoService.compressPhotoForUpload(
                filePath: photo['file_path'],
                quality: 85,
                maxWidth: 1920,
                maxHeight: 1080,
              );

              syncPhotosInput.add({
                'localId': photo['photo_id'],
                'photoId': photo['photo_id'],
                'guestLogId': guestLogId,
                'photoType': _mapPhotoType(
                  photo['photo_type']?.toString() ?? '',
                ),
                'localPath': photo['file_path'],
                'fileName': photo['file_name'],
                'fileSize': photo['file_size'],
                'fileHash': '', // Optional hash
                'photoData': compressedData['base64Data'],
                'takenAt': DateTime.fromMillisecondsSinceEpoch(
                  photo['taken_at'] as int? ??
                      DateTime.now().millisecondsSinceEpoch,
                ).toUtc().toIso8601String(),
              });
            } catch (e) {
              _logger.e('❌ Error compressing photo ${photo['photo_id']}: $e');
              errors.add('Compression failed for ${photo['photo_id']}: $e');

              // Mark as FAILED so it doesn't block future syncs
              await _db.update(
                'gate_check_photos',
                {
                  'sync_status': 'FAILED',
                  'sync_error': 'Compression failed: $e',
                },
                where: 'photo_id = ?',
                whereArgs: [photo['photo_id']],
              );
            }
          }

          if (syncPhotosInput.isEmpty) {
            _logger.w(
              '⚠️ Batch for $guestLogId skipped: No valid photos after compression',
            );
            continue;
          }

          // Upload via SyncSatpamPhotos mutation (Correct for backend)
          final mutationOptions = SatpamQueries.syncSatpamPhotosOptions(
            deviceId: deviceId,
            photos: syncPhotosInput,
            batchId: batchId,
          );

          _logger.d(
            '📡 Sending Mutation SyncSatpamPhotos for batch $batchId...',
          );
          final result = await _graphqlClient.mutate(mutationOptions);

          if (result.hasException) {
            final errorMessage = await _resolveSyncErrorMessage(
              result.exception!,
              fallback: 'Photo sync failed: ${result.exception}',
            );
            _logger.e('❌ Photo sync mutation failed: $errorMessage');
            throw Exception(errorMessage);
          }

          final syncResult = result.data?['syncSatpamPhotos'];
          _logger.i('✅ Server Response: $syncResult');

          if (syncResult != null) {
            final successfulUploads =
                syncResult['successfulUploads'] as int? ?? 0;
            final failedUploads = syncResult['failedUploads'] as int? ?? 0;
            final serverErrors =
                (syncResult['errors'] as List?)?.cast<Map<String, dynamic>>() ??
                [];

            // 1. Mark FAILED photos
            for (final error in serverErrors) {
              final targetId = error['photoId'] as String?;

              if (targetId != null) {
                await _db.update(
                  'gate_check_photos',
                  {
                    'sync_status': 'FAILED',
                    'sync_error': error['error'] ?? 'Unknown server error',
                  },
                  where: 'photo_id = ?',
                  whereArgs: [targetId],
                );
                _logger.w('⚠️ Photo $targetId failed sync: ${error['error']}');
              }
            }

            // 2. Mark SYNCED photos (All in batch EXCEPT those in errors)
            // This assumes batch wasn't completely rejected
            if (successfulUploads > 0) {
              final failedIds = serverErrors
                  .map((e) => e['photoId'] as String?)
                  .where((id) => id != null)
                  .toSet();

              for (final photo in photos) {
                if (!failedIds.contains(photo['photo_id'])) {
                  await _db.update(
                    'gate_check_photos',
                    {
                      'sync_status': 'SYNCED',
                      'synced_at': DateTime.now().millisecondsSinceEpoch,
                      'sync_error': null, // Clear any previous error
                    },
                    where: 'photo_id = ?',
                    whereArgs: [photo['photo_id']],
                  );
                }
              }
              processedCount += successfulUploads;
            }

            if (failedUploads > 0) {
              errors.add(
                'Batch $guestLogId finished with $failedUploads failures',
              );
            }
          }
        } catch (e) {
          _logger.e('❌ Failed to upload photo batch for $entry.key', error: e);
          errors.add('Failed to upload photo batch for $entry.key: $e');

          // Mark photos as failed
          for (final photo in entry.value) {
            await _db.update(
              'gate_check_photos',
              {'sync_status': 'FAILED'},
              where: 'photo_id = ?',
              whereArgs: [photo['photo_id']],
            );
          }
        }
      }

      return GraphQLSyncResult(
        success: errors.isEmpty,
        message: 'Photos sync completed',
        recordsProcessed: processedCount,
        errors: errors,
      );
    } catch (e) {
      _logger.e('❌ Error in _syncPhotos top-level', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Photos sync failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Resolve sync conflicts using conflict resolution service
  Future<GraphQLSyncResult> _resolveConflicts() async {
    try {
      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.resolvingConflicts,
          message: 'Resolving data conflicts...',
          progress: 0.8,
        ),
      );

      final conflicts = await _conflictResolver.getPendingConflicts();
      int resolvedCount = 0;
      final errors = <String>[];

      for (final conflict in conflicts) {
        try {
          final resolution = await _conflictResolver.autoResolveConflict(
            conflictId: conflict.conflictId,
          );

          if (resolution.success) {
            // Apply resolution via GraphQL mutation
            final mutationOptions = GateCheckQueries.resolveSyncConflictOptions(
              conflictId: conflict.conflictId,
              resolutionStrategy: resolution.resolutionStrategy,
              mergedData: resolution.resolvedData,
            );

            await _graphqlClient.mutate(mutationOptions);
            resolvedCount++;
          }
        } catch (e) {
          errors.add('Failed to resolve conflict ${conflict.conflictId}: $e');
        }
      }

      return GraphQLSyncResult(
        success: errors.isEmpty,
        message: 'Conflicts resolution completed',
        recordsProcessed: resolvedCount,
        errors: errors,
      );
    } catch (e) {
      _logger.e('Error resolving conflicts', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Conflict resolution failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Pull updates from server
  Future<GraphQLSyncResult> _pullServerUpdates() async {
    try {
      _notifyProgress(
        SyncProgress(
          phase: GraphQLSyncPhase.pullingUpdates,
          message: 'Pulling server updates...',
          progress: 0.9,
        ),
      );

      // Pull QR tokens
      await _pullQRTokens();

      // Pull guest logs updates
      await _pullGuestLogs();

      // Pull sync transactions status
      await _pullSyncTransactions();

      return GraphQLSyncResult.success('Server updates completed');
    } catch (e) {
      _logger.e('Error pulling server updates', error: e);
      final errorMessage = await _resolveSyncErrorMessage(
        e,
        fallback: 'Pull updates failed: $e',
      );
      return GraphQLSyncResult.error(errorMessage);
    }
  }

  /// Pull QR tokens from server
  /// NOTE: Disabled - Backend doesn't have a root qrTokens query in schema.
  /// QR tokens are managed via role-specific APIs (e.g., satpam).
  Future<void> _pullQRTokens() async {
    // Skip QR token pull - not supported by current backend schema
    _logger.d('Skipping QR token pull: Not supported by backend schema');
    return;

    // ignore: dead_code
    try {
      final queryOptions = GateCheckQueries.getQRTokensOptions(limit: 50);
      final result = await _graphqlClient.query(queryOptions);

      // Check for GraphQL errors including authentication errors
      if (result.hasException) {
        final errors = result.exception?.graphqlErrors ?? [];
        for (final error in errors) {
          if (error.message.contains('authentication required') ||
              error.message.contains('no user context')) {
            _logger.w(
              'Authentication error pulling QR tokens: ${error.message}. Skipping QR token sync.',
            );
            return; // Skip gracefully, don't throw
          }
        }
        _logger.w('GraphQL error pulling QR tokens: ${result.exception}');
        return;
      }

      if (result.data != null) {
        final tokens = result.data!['qrTokens'] as List<dynamic>?;

        if (tokens != null) {
          for (final tokenData in tokens) {
            // Extract guest data from nested guestLog if available
            final guestLog = tokenData['guestLog'] as Map<String, dynamic>?;

            await _db.insert('qr_tokens_cache', {
              'token_id': tokenData['id'],
              'jti': tokenData['jti'],
              'generation_intent': tokenData['generationIntent'],
              'allowed_scan': tokenData['allowedScan'],
              'current_usage': tokenData['currentUsage'],
              'max_usage': tokenData['maxUsage'],
              'status': tokenData['status'],
              'expires_at': tokenData['expiresAt'] != null
                  ? DateTime.parse(
                      tokenData['expiresAt'],
                    ).millisecondsSinceEpoch
                  : null,
              'generated_at': tokenData['generatedAt'] != null
                  ? DateTime.parse(
                      tokenData['generatedAt'],
                    ).millisecondsSinceEpoch
                  : null,
              'last_used_at': tokenData['lastUsedAt'] != null
                  ? DateTime.parse(
                      tokenData['lastUsedAt'],
                    ).millisecondsSinceEpoch
                  : null,
              // Guest info from nested guestLog
              'driver_name': guestLog?['driverName'] ?? guestLog?['guestName'],
              'vehicle_plate': guestLog?['vehiclePlate'],
              'vehicle_type': guestLog?['vehicleType'],
              'guest_log_id': guestLog?['id'],
              'guest_log_status': guestLog?['status'],
              // Timestamps
              'created_at': tokenData['createdAt'] != null
                  ? DateTime.parse(
                      tokenData['createdAt'],
                    ).millisecondsSinceEpoch
                  : DateTime.now().millisecondsSinceEpoch,
              'updated_at': DateTime.now().millisecondsSinceEpoch,
            });
          }

          _logger.d('Pulled ${tokens.length} QR tokens from server');
        }
      }
    } catch (e) {
      _logger.e('Error pulling QR tokens', error: e);
    }
  }

  /// Pull guest logs updates from server using satpamServerUpdates query
  /// Only available for SATPAM role
  Future<void> _pullGuestLogs() async {
    try {
      // Check if current user is SATPAM
      final user = await UnifiedSecureStorageService.getUserInfo();
      final userRole = user?.role.toUpperCase() ?? '';

      if (userRole != 'SATPAM') {
        _logger.d(
          'Skipping guest log pull - not available for role: $userRole',
        );
        return;
      }

      final deviceId = await _getDeviceId();

      // Get last sync time
      final lastSync = await _db.query(
        'sync_logs',
        orderBy: 'sync_completed_at DESC',
        limit: 1,
      );

      DateTime since;
      if (lastSync.isNotEmpty && lastSync.first['sync_completed_at'] != null) {
        since = DateTime.fromMillisecondsSinceEpoch(
          lastSync.first['sync_completed_at'] as int,
        );
      } else {
        // Default to 7 days ago if no sync history
        since = DateTime.now().subtract(const Duration(days: 7));
      }

      final queryOptions = SatpamQueries.satpamServerUpdatesOptions(
        since: since,
        deviceId: deviceId,
      );

      final result = await _graphqlClient.query(queryOptions);

      // Check for GraphQL errors including authentication errors
      if (result.hasException) {
        final errors = result.exception?.graphqlErrors ?? [];
        for (final error in errors) {
          if (error.message.contains('authentication required') ||
              error.message.contains('no user context') ||
              error.message.contains('tidak terautentikasi')) {
            _logger.w(
              'Authentication error pulling guest logs: ${error.message}. Skipping.',
            );
            return;
          }
        }
        _logger.w('GraphQL error pulling guest logs: ${result.exception}');
        return;
      }

      if (result.data != null) {
        final serverLogs =
            result.data!['satpamServerUpdates'] as List<dynamic>?;

        if (serverLogs != null && serverLogs.isNotEmpty) {
          int processedCount = 0;

          for (final logData in serverLogs) {
            try {
              final serverId = logData['id'] as String?;
              final localId = logData['localId'] as String?;

              if (serverId == null) continue;

              // Check if record exists locally
              final existingRecords = await _db.query(
                'gate_guest_logs',
                where: 'server_record_id = ? OR guest_id = ?',
                whereArgs: [serverId, localId],
                limit: 1,
              );

              final guestLogData = {
                'server_record_id': serverId,
                'gate_position':
                    logData['gatePosition'] ??
                    'OUTSIDE', // Use server value or default
                'guest_id': logData['guestId'] ?? serverId,
                'driver_name': logData['driverName'] ?? logData['guestName'],
                'destination':
                    logData['destination'] ?? logData['guestPurpose'],
                // guest_phone removed as it doesn't exist in local DB
                'vehicle_plate': logData['vehiclePlate'],
                'vehicle_type': logData['vehicleType'],
                'notes': logData['notes'],
                'sync_status': 'SYNCED',
                'synced_at': DateTime.now().millisecondsSinceEpoch,
                'updated_at': DateTime.now().millisecondsSinceEpoch,
                'id_card_number': logData['idCardNumber'],
                'second_cargo': _normalizeOptionalText(logData['secondCargo']),
                'latitude': logData['latitude'] != null
                    ? (logData['latitude'] as num).toDouble()
                    : null,
                'cargo_volume': logData['cargoVolume'],
                'cargo_owner': logData['cargoOwner'],
                'estimated_weight': logData['estimatedWeight'] != null
                    ? (logData['estimatedWeight'] as num).toDouble()
                    : null,
                'delivery_order_number': logData['deliveryOrderNumber'],
                'load_type': logData['loadType'],
                'created_by': logData['createdBy'] ?? 'SERVER',
                'generation_intent': logData['generationIntent'],
              };

              if (existingRecords.isNotEmpty) {
                // Update existing record
                await _db.update(
                  'gate_guest_logs',
                  guestLogData,
                  where: 'server_record_id = ? OR guest_id = ?',
                  whereArgs: [serverId, localId],
                );
              } else {
                // Insert new record
                guestLogData['created_at'] =
                    DateTime.now().millisecondsSinceEpoch;
                await _db.insert('gate_guest_logs', guestLogData);
              }

              processedCount++;
            } catch (e) {
              _logger.w('Error processing server guest log: $e');
            }
          }

          _logger.d('Pulled $processedCount guest logs from server');
        } else {
          _logger.d('No new guest logs from server');
        }
      }
    } catch (e) {
      _logger.e('Error pulling guest logs', error: e);
    }
  }

  /// Pull sync transactions status
  /// Pull sync transactions status
  Future<void> _pullSyncTransactions() async {
    // Disabled: Not supported by backend currently
    /*
    try {
      final queryOptions = GateCheckQueries.getSyncTransactionsOptions(limit: 100);
      final result = await _graphqlClient.query(queryOptions);
      
      if (!result.hasException && result.data != null) {
        final transactions = result.data!['syncTransactions'] as List<dynamic>?;
        
        if (transactions != null) {
          for (final transactionData in transactions) {
            await _db.insert('sync_transactions_cache', {
              'transaction_id': transactionData['id'],
              'operation': transactionData['operation'],
              'status': transactionData['status'],
              'started_at': DateTime.parse(transactionData['startedAt']).millisecondsSinceEpoch,
              'completed_at': transactionData['completedAt'] != null
                  ? DateTime.parse(transactionData['completedAt']).millisecondsSinceEpoch
                  : null,
              'updated_at': DateTime.now().millisecondsSinceEpoch,
            });
          }
          
          _logger.d('Pulled ${transactions.length} sync transactions');
        }
      }
    } catch (e) {
      _logger.e('Error pulling sync transactions', error: e);
    }
    */
  }

  /// Update sync timestamp
  Future<void> _updateSyncTimestamp(bool success) async {
    try {
      final user = await UnifiedSecureStorageService.getUserInfo();

      // We need user info for the log. If user is null or missing required fields,
      // we cannot satisfy the database constraints (user_role CHECK, company_id NOT NULL).
      if (user == null || user.companyId == null) {
        _logger.w(
          'Skipping sync log: Missing user or company info (User: ${user?.username})',
        );
        return;
      }

      // Ensure role is valid for the CHECK constraint
      // simple check, strict validation is done by DB
      if (user.role.isEmpty) {
        _logger.w('Skipping sync log: Empty user role');
        return;
      }

      // Check if referenced user and company exist to avoid FK violation
      // This is common during initial sync when master data hasn't been pulled yet
      final userExists = await _db.rawQuery(
        'SELECT 1 FROM users WHERE user_id = ? LIMIT 1',
        [user.id],
      );

      final companyExists = await _db.rawQuery(
        'SELECT 1 FROM companies WHERE company_id = ? LIMIT 1',
        [user.companyId],
      );

      if (userExists.isEmpty || companyExists.isEmpty) {
        _logger.w(
          'Skipping sync log: Referenced user (${userExists.isNotEmpty}) or company (${companyExists.isNotEmpty}) not found locally',
        );
        return;
      }

      await _db.insert('sync_logs', {
        'log_id': _uuid.v4(),
        'device_id': await _getDeviceId(),
        'user_id': user.id,
        'user_role': user.role,
        'company_id': user.companyId!,
        'operation_type': 'GRAPHQL_FULL_SYNC',
        'sync_started_at':
            _lastSyncAttempt?.millisecondsSinceEpoch ??
            DateTime.now().millisecondsSinceEpoch,
        'sync_completed_at': DateTime.now().millisecondsSinceEpoch,
        'status': success ? 'COMPLETED' : 'FAILED',
        'created_at': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (e) {
      _logger.e('Error updating sync timestamp', error: e);
    }
  }

  bool _containsAnyKeyword(String text, List<String> keywords) {
    for (final keyword in keywords) {
      if (text.contains(keyword)) {
        return true;
      }
    }
    return false;
  }

  bool _isTerminalSessionFailure(String text) {
    final normalized = text.toLowerCase();
    return _containsAnyKeyword(normalized, const [
      'session_expired',
      'session_revoked',
      'session expired',
      'session revoked',
      'sesi berakhir',
      'login ulang',
    ]);
  }

  bool _isLikelyAuthFailure(String text) {
    final normalized = text.toLowerCase();
    return _containsAnyKeyword(normalized, const [
      'unauthenticated',
      'unauthorized',
      'authentication required',
      'no user context',
      'tidak terautentikasi',
      'token kadaluarsa',
      'token expired',
      '401',
      'refresh_expired',
      'refresh_revoked',
      'session_expired',
      'session_revoked',
    ]);
  }

  Future<void> _scheduleRetryForFailure({
    Object? sourceError,
    List<String>? messages,
  }) async {
    final combinedText = [
      ...?messages,
      if (sourceError != null) sourceError.toString(),
    ].where((text) => text.trim().isNotEmpty).join(' | ');

    if (_isTerminalSessionFailure(combinedText)) {
      _logger.w(
        'Sync retry skipped: session is terminal, user must login again.',
      );
      return;
    }

    if (_isLikelyAuthFailure(combinedText)) {
      final authOutcome = await _ensureAuthWithTier();
      if (authOutcome == _SyncAuthTierOutcome.reLoginRequired) {
        _logger.w(
          'Sync retry skipped: auth tiers exhausted, user must login again.',
        );
        return;
      }
      if (authOutcome == _SyncAuthTierOutcome.refreshed) {
        _scheduleRetrySync(
          delay: _retryDelayAfterRefresh,
          reason: 'auth_refreshed',
        );
        return;
      }
      if (authOutcome == _SyncAuthTierOutcome.renewed) {
        _scheduleRetrySync(
          delay: _retryDelayAfterDeviceRenew,
          reason: 'device_renewed',
        );
        return;
      }
    }

    _scheduleRetrySync(reason: 'generic_failure');
  }

  /// Schedule retry sync after failure
  void _scheduleRetrySync({Duration? delay, String reason = 'sync_failure'}) {
    final effectiveDelay = delay ?? _retryDelay;
    _retrySyncTimer?.cancel();
    _logger.d(
      'Scheduling retry sync in ${effectiveDelay.inSeconds}s (reason: $reason)',
    );
    _retrySyncTimer = Timer(effectiveDelay, () {
      if (_autoSyncEnabled && _connectivity.isOnline && !_isSyncing) {
        _performFullSync();
      }
    });
  }

  /// Notify progress listeners
  void _notifyProgress(SyncProgress progress) {
    if (!_progressController.isClosed) {
      _progressController.add(progress);
    }
  }

  // Public API

  /// Get current sync status
  SyncServiceStatus getSyncStatus() {
    return SyncServiceStatus(
      isOnline: _connectivity.isOnline,
      isSyncing: _isSyncing,
      lastSuccessfulSync: _lastSuccessfulSync,
    );
  }

  /// Get sync progress stream
  Stream<SyncProgress> get progressStream => _progressController.stream;

  /// Check if sync is in progress
  bool get isSyncing => _isSyncing;

  /// Enable or disable auto sync
  void setAutoSyncEnabled(bool enabled) {
    _autoSyncEnabled = enabled;
    if (enabled) {
      _setupPeriodicSync();
    } else {
      _periodicSyncTimer?.cancel();
    }
    _logger.d('Auto sync ${enabled ? 'enabled' : 'disabled'}');
  }

  /// Get last successful sync time
  DateTime? get lastSuccessfulSync => _lastSuccessfulSync;

  /// Get pending sync count
  Future<int> getPendingSyncCount() async {
    try {
      final guestPending = await _countUnsyncedRows('gate_guest_logs');
      final employeePending = await _countUnsyncedRows('gate_employee_logs');
      final photoPending = await _countUnsyncedRows('gate_check_photos');
      return guestPending + employeePending + photoPending;
    } catch (e) {
      _logger.e('Error getting pending sync count', error: e);
      return 0;
    }
  }

  Future<int> _countUnsyncedRows(String tableName) async {
    try {
      final result = await _db.rawQuery(
        "SELECT COUNT(*) as count FROM $tableName WHERE sync_status IN ('PENDING', 'FAILED')",
      );

      if (result.isEmpty) return 0;
      final rawValue = result.first['count'];
      if (rawValue is int) return rawValue;
      return int.tryParse(rawValue?.toString() ?? '') ?? 0;
    } catch (e) {
      _logger.d('Skipping unsynced count for $tableName: $e');
      return 0;
    }
  }

  /// Reset failed records for retry
  Future<void> resetFailedRecords() async {
    try {
      await _db.update(
        'gate_guest_logs',
        {'sync_status': 'PENDING'},
        where: 'sync_status = ?',
        whereArgs: ['FAILED'],
      );
      await _db.update(
        'gate_employee_logs',
        {'sync_status': 'PENDING'},
        where: 'sync_status = ?',
        whereArgs: ['FAILED'],
      );
      await _db.update(
        'gate_check_photos',
        {'sync_status': 'PENDING'},
        where: 'sync_status = ?',
        whereArgs: ['FAILED'],
      );

      _logger.i('Failed records reset for retry');
    } catch (e) {
      _logger.e('Error resetting failed records', error: e);
    }
  }

  /// Prune old sync queue records to prevent storage exhaustion
  Future<void> _pruneSyncQueue() async {
    try {
      final db = await _db.database;
      final cutoffTime = DateTime.now()
          .subtract(_recordRetentionPeriod)
          .millisecondsSinceEpoch;

      // Delete successfully synced records older than retention period
      final deletedSynced = await db.delete(
        'sync_queue',
        where: "status = 'SYNCED' AND created_at < ?",
        whereArgs: [cutoffTime],
      );
      _logger.d('Pruned $deletedSynced old synced records');

      // Delete failed records older than retention period with max retries exhausted
      final deletedFailed = await db.delete(
        'sync_queue',
        where: "status = 'FAILED' AND created_at < ? AND retry_count >= 5",
        whereArgs: [cutoffTime],
      );
      _logger.d('Pruned $deletedFailed old failed records');

      _logger.i(
        'Sync queue pruned: ${deletedSynced + deletedFailed} records removed',
      );
    } catch (e) {
      _logger.e('Error pruning sync queue', error: e);
    }
  }

  /// Get sync queue statistics for monitoring
  Future<Map<String, int>> getSyncQueueStats() async {
    try {
      final db = await _db.database;
      final stats = <String, int>{};

      final pending = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'",
      );
      stats['pending'] = pending.first['count'] as int? ?? 0;

      final failed = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED'",
      );
      stats['failed'] = failed.first['count'] as int? ?? 0;

      final synced = await db.rawQuery(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'SYNCED'",
      );
      stats['synced'] = synced.first['count'] as int? ?? 0;

      stats['total'] = stats['pending']! + stats['failed']! + stats['synced']!;
      stats['maxSize'] = _maxSyncQueueSize;

      return stats;
    } catch (e) {
      _logger.e('Error getting sync queue stats', error: e);
      return {'total': 0, 'maxSize': _maxSyncQueueSize};
    }
  }

  /// Dispose resources
  Future<void> dispose() async {
    try {
      _periodicSyncTimer?.cancel();
      _periodicSyncTimer = null;

      _retrySyncTimer?.cancel();
      _retrySyncTimer = null;

      for (final subscription in _subscriptions) {
        await subscription.cancel();
      }
      _subscriptions.clear();

      if (!_progressController.isClosed) {
        await _progressController.close();
      }

      // Reset state flags
      _isSyncing = false;
      _autoSyncEnabled = false;

      _logger.i('GraphQL sync service disposed');
    } catch (e) {
      _logger.e('Error disposing GraphQL sync service', error: e);
    }
  }
}

/// GraphQL sync result class
class GraphQLSyncResult {
  bool success;
  String message;
  int recordsProcessed;
  List<String> errors;
  DateTime timestamp;

  GraphQLSyncResult({
    required this.success,
    required this.message,
    required this.recordsProcessed,
    required this.errors,
  }) : timestamp = DateTime.now();

  GraphQLSyncResult.success([String? msg])
    : this(
        success: true,
        message: msg ?? 'Sync completed successfully',
        recordsProcessed: 0,
        errors: [],
      );

  GraphQLSyncResult.error(String error)
    : this(
        success: false,
        message: error,
        recordsProcessed: 0,
        errors: [error],
      );

  void mergeWith(GraphQLSyncResult other) {
    success = success && other.success;
    recordsProcessed += other.recordsProcessed;
    errors.addAll(other.errors);

    if (!other.success && success) {
      message = other.message;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'success': success,
      'message': message,
      'records_processed': recordsProcessed,
      'errors': errors,
      'timestamp': timestamp.toUtc().toIso8601String(),
    };
  }
}

/// Sync progress class
class SyncProgress {
  final GraphQLSyncPhase phase;
  final String message;
  final double progress;
  final GraphQLSyncResult? result;
  final DateTime timestamp;

  SyncProgress({
    required this.phase,
    required this.message,
    required this.progress,
    this.result,
  }) : timestamp = DateTime.now();
}

/// GraphQL sync phases
enum GraphQLSyncPhase {
  starting,
  syncingGuestLogs,
  syncingAccessLogs,
  syncingQRTokens,
  syncingPhotos,
  resolvingConflicts,
  pullingUpdates,
  completed,
  error,
}

/// Sync service status DTO
class SyncServiceStatus {
  final bool isOnline;
  final bool isSyncing;
  final DateTime? lastSuccessfulSync;
  final int pendingCount;

  SyncServiceStatus({
    required this.isOnline,
    required this.isSyncing,
    this.lastSuccessfulSync,
    this.pendingCount = 0,
  });
}
