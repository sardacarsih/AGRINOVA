import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'database_service.dart';
import 'connectivity_service.dart';
import 'jwt_storage_service.dart';
import 'enhanced_batch_sync_service.dart';
import 'gate_check_photo_sync_service.dart';
import 'harvest_sync_service.dart';
import '../di/dependency_injection.dart';

/// Background Sync Service for Satpam Gate Check Operations
/// 
/// Features:
/// - Network-aware background synchronization
/// - Workmanager integration for persistent background tasks
/// - Battery optimization with adaptive sync intervals
/// - Offline queue management with intelligent retry
/// - Cross-app sync coordination
/// - Background photo upload processing
/// - Sync conflict detection and resolution
/// - Performance monitoring and optimization
class BackgroundSyncService {
  static final Logger _logger = Logger();
  static final BackgroundSyncService _instance = BackgroundSyncService._internal();
  
  factory BackgroundSyncService() => _instance;
  BackgroundSyncService._internal();
  
  // Service dependencies
  late DatabaseService _databaseService;
  late ConnectivityService _connectivityService;
  late JWTStorageService _jwtStorageService;
  late EnhancedBatchSyncService _batchSyncService;
  late GateCheckPhotoSyncService _photoSyncService;
  late HarvestSyncService _harvestSyncService;
  
  // Background task configuration
  static const String _syncTaskName = 'agrinova_background_sync';
  static const String _photoTaskName = 'agrinova_photo_sync';
  static const String _conflictTaskName = 'agrinova_conflict_resolution';
  
  // Sync intervals (in minutes)
  static const int _normalSyncInterval = 15;
  static const int _batterySavingSyncInterval = 30;
  static const int _photoSyncInterval = 10;
  
  // State management
  bool _isInitialized = false;
  bool _backgroundSyncEnabled = true;
  bool _photoSyncEnabled = true;
  bool _batterySavingMode = false;
  StreamSubscription<NetworkStatus>? _connectivitySubscription;
  Timer? _foregroundSyncTimer;
  
  // Performance monitoring
  DateTime? _lastBackgroundSync;
  DateTime? _lastSuccessfulSync;
  int _backgroundSyncAttempts = 0;
  int _backgroundSyncSuccesses = 0;
  
  /// Initialize the background sync service
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      _logger.i('Initializing Background Sync Service');
      
      // Initialize service dependencies
      await _initializeServices();
      
      // Initialize Workmanager for background tasks
      await _initializeWorkmanager();
      
      // Setup network monitoring
      await _setupNetworkMonitoring();
      
      // Schedule background tasks
      await _scheduleBackgroundTasks();
      
      // Setup foreground sync timer
      _setupForegroundSync();
      
      _isInitialized = true;
      _logger.i('Background Sync Service initialized successfully');
      
    } catch (e) {
      _logger.e('Failed to initialize Background Sync Service', error: e);
      rethrow;
    }
  }
  
  /// Initialize service dependencies
  Future<void> _initializeServices() async {
    _databaseService = DatabaseService();
    _connectivityService = ConnectivityService(Connectivity());
    await _connectivityService.initialize();
    _jwtStorageService = JWTStorageService();
    
    // Initialize sync services
    _batchSyncService = EnhancedBatchSyncService();
    await _batchSyncService.initialize();
    
    _photoSyncService = GateCheckPhotoSyncService();
    await _photoSyncService.initialize();

    // Initialize Harvest Sync (Separated)
    if (sl.isRegistered<HarvestSyncService>()) {
      _harvestSyncService = sl<HarvestSyncService>();
    } else {
      // Logic for background isolate if not registered yet
      // For now we assume SL is init
    }
  }
  
  /// Initialize Workmanager for background task execution
  Future<void> _initializeWorkmanager() async {
    try {
      await Workmanager().initialize(
        _backgroundSyncDispatcher,
        isInDebugMode: kDebugMode,
      );
      
      // Register unique background sync task
      await Workmanager().registerPeriodicTask(
        _syncTaskName,
        _syncTaskName,
        frequency: Duration(minutes: _normalSyncInterval),
        initialDelay: Duration(minutes: 2),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
          requiresCharging: false,
        ),
        inputData: {
          'sync_type': 'background_sync',
          'priority': 'normal',
        },
      );
      
      // Register photo sync task
      if (_photoSyncEnabled) {
        await Workmanager().registerPeriodicTask(
          _photoTaskName,
          _photoTaskName,
          frequency: Duration(minutes: _photoSyncInterval),
          initialDelay: Duration(minutes: 1),
          constraints: Constraints(
            networkType: NetworkType.connected,
            requiresBatteryNotLow: true,
          ),
          inputData: {
            'sync_type': 'photo_sync',
            'priority': 'low',
          },
        );
      }
      
      // Register conflict resolution task
      await Workmanager().registerPeriodicTask(
        _conflictTaskName,
        _conflictTaskName,
        frequency: Duration(minutes: 20),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
        ),
        inputData: {
          'sync_type': 'conflict_resolution',
          'priority': 'high',
        },
      );
      
      _logger.i('Workmanager background tasks registered successfully');
      
    } catch (e) {
      _logger.e('Failed to initialize Workmanager', error: e);
      // Continue without background tasks if Workmanager fails
    }
  }
  
  /// Setup network connectivity monitoring
  Future<void> _setupNetworkMonitoring() async {
    _connectivitySubscription = _connectivityService.networkStatusStream.listen(
      _onNetworkStatusChanged,
      onError: (error) => _logger.e('Network monitoring error', error: error),
    );
  }
  
  /// Handle network connectivity changes
  void _onNetworkStatusChanged(NetworkStatus status) async {
    _logger.d('Network status changed: $status');
    
    if (status == NetworkStatus.online) {
      // Network became available - trigger immediate sync
      _logger.i('Network connectivity restored - triggering immediate sync');
      
      // Small delay to ensure network is fully established
      Timer(const Duration(seconds: 3), () {
        _performImmediateSync(trigger: 'network_restored');
      });
      
      // Update sync intervals based on network quality
      await _adaptSyncIntervals();
    }
  }
  
  /// Schedule background tasks based on current configuration
  Future<void> _scheduleBackgroundTasks() async {
    try {
      final interval = _batterySavingMode 
          ? _batterySavingSyncInterval
          : _normalSyncInterval;
      
      // Cancel existing tasks
      await Workmanager().cancelByUniqueName(_syncTaskName);
      
      // Reschedule with new interval
      await Workmanager().registerPeriodicTask(
        _syncTaskName,
        _syncTaskName,
        frequency: Duration(minutes: interval),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: !_batterySavingMode, // Allow sync even on low battery in battery saving mode
          requiresCharging: false,
        ),
        inputData: {
          'sync_type': 'background_sync',
          'priority': _batterySavingMode ? 'low' : 'normal',
          'battery_saving': _batterySavingMode,
        },
      );
      
      _logger.i('Background tasks rescheduled with ${interval}min interval');
      
    } catch (e) {
      _logger.e('Failed to schedule background tasks', error: e);
    }
  }
  
  /// Setup foreground sync timer for when app is active
  void _setupForegroundSync() {
    _foregroundSyncTimer?.cancel();
    
    final interval = _batterySavingMode 
        ? Duration(minutes: _batterySavingSyncInterval)
        : Duration(minutes: _normalSyncInterval);
    
    _foregroundSyncTimer = Timer.periodic(interval, (timer) {
      if (_backgroundSyncEnabled && _connectivityService.isOnline) {
        _performForegroundSync();
      }
    });
    
    _logger.d('Foreground sync timer setup with ${interval.inMinutes}min interval');
  }
  
  /// Perform immediate sync (foreground)
  Future<void> _performImmediateSync({String trigger = 'manual'}) async {
    if (!_backgroundSyncEnabled || !_connectivityService.isOnline) {
      return;
    }
    
    try {
      _logger.i('Starting immediate sync - trigger: $trigger');
      
      // Update sync attempt statistics
      _backgroundSyncAttempts++;
      
      // Get pending operations count
      final pendingOps = await _batchSyncService.getPendingSyncCount();
      
      if (pendingOps == 0) {
        _logger.d('No pending operations for sync');
        return;
      }
      
      _logger.i('Syncing $pendingOps pending operations');
      
      // Perform batch sync
      final result = await _batchSyncService.forceSyncNow();
      
      if (result.success) {
        _backgroundSyncSuccesses++;
        _lastSuccessfulSync = DateTime.now();
        
        // Also trigger Harvest Sync (Mandor)
        try {
          if (sl.isRegistered<HarvestSyncService>()) {
             await _harvestSyncService.syncNow();
          }
        } catch (e) {
           _logger.e('Error syncing harvest: $e');
        }

        // Record sync performance metrics
        await _recordSyncMetrics(
          syncType: 'immediate',
          trigger: trigger,
          success: true,
          operationsProcessed: result.totalRecordsProcessed,
          duration: Duration.zero, // Would be calculated from actual sync duration
        );
        
        _logger.i('Immediate sync completed successfully');
      } else {
        _logger.w('Immediate sync failed: ${result.message}');
        
        await _recordSyncMetrics(
          syncType: 'immediate',
          trigger: trigger,
          success: false,
          error: result.message,
        );
      }
      
    } catch (e) {
      _logger.e('Error in immediate sync', error: e);
      
      await _recordSyncMetrics(
        syncType: 'immediate',
        trigger: trigger,
        success: false,
        error: e.toString(),
      );
    }
  }
  
  /// Perform foreground sync (app is active)
  Future<void> _performForegroundSync() async {
    try {
      // Check authentication status
      final isAuthenticated = await _jwtStorageService.isAuthenticated();
      if (!isAuthenticated) {
        _logger.d('Not authenticated, skipping foreground sync');
        return;
      }
      
      // Perform lightweight sync check
      final pendingCount = await _batchSyncService.getPendingSyncCount();
      
      if (pendingCount > 0) {
        _logger.d('Foreground sync: $pendingCount pending operations');
        await _performImmediateSync(trigger: 'foreground');
      }
      
      // Sync photos if any are pending
      if (_photoSyncEnabled) {
        final pendingPhotos = await _photoSyncService.getPendingPhotoUploads(limit: 5);
        if (pendingPhotos.isNotEmpty) {
          _logger.d('Foreground photo sync: ${pendingPhotos.length} pending photos');
          await _photoSyncService.uploadPhotoBatch(pendingPhotos);
        }
      }
      
    } catch (e) {
      _logger.e('Error in foreground sync', error: e);
    }
  }
  
  /// Adapt sync intervals based on network quality and battery status
  Future<void> _adaptSyncIntervals() async {
    try {
      // Get current network info (this would need to be implemented in ConnectivityService)
      final networkQuality = await _getNetworkQuality();
      final batteryLevel = await _getBatteryLevel();
      
      bool shouldUseBatterySaving = batteryLevel < 20 || networkQuality == 'poor';
      
      if (shouldUseBatterySaving != _batterySavingMode) {
        _batterySavingMode = shouldUseBatterySaving;
        
        _logger.i('Adapting sync intervals - Battery saving: $shouldUseBatterySaving');
        
        // Reschedule tasks with new intervals
        await _scheduleBackgroundTasks();
        _setupForegroundSync();
      }
      
    } catch (e) {
      _logger.e('Error adapting sync intervals', error: e);
    }
  }
  
  /// Record sync performance metrics
  Future<void> _recordSyncMetrics({
    required String syncType,
    required String trigger,
    required bool success,
    int operationsProcessed = 0,
    Duration? duration,
    String? error,
  }) async {
    try {
      await _databaseService.insert('sync_performance_metrics', {
        'metric_id': DateTime.now().millisecondsSinceEpoch.toString(),
        'sync_type': syncType,
        'trigger': trigger,
        'success': success ? 1 : 0,
        'operations_processed': operationsProcessed,
        'duration_ms': duration?.inMilliseconds ?? 0,
        'error_message': error,
        'network_available': _connectivityService.isOnline ? 1 : 0,
        'battery_saving_mode': _batterySavingMode ? 1 : 0,
        'measured_at': DateTime.now().millisecondsSinceEpoch,
        'created_at': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (e) {
      _logger.e('Error recording sync metrics', error: e);
    }
  }
  
  /// Public API methods
  
  /// Enable or disable background sync
  Future<void> setBackgroundSyncEnabled(bool enabled) async {
    _backgroundSyncEnabled = enabled;
    
    if (enabled) {
      await _scheduleBackgroundTasks();
      _setupForegroundSync();
    } else {
      await Workmanager().cancelByUniqueName(_syncTaskName);
      _foregroundSyncTimer?.cancel();
    }
    
    _logger.i('Background sync ${enabled ? 'enabled' : 'disabled'}');
  }
  
  /// Enable or disable photo sync
  Future<void> setPhotoSyncEnabled(bool enabled) async {
    _photoSyncEnabled = enabled;
    
    if (enabled) {
      await Workmanager().registerPeriodicTask(
        _photoTaskName,
        _photoTaskName,
        frequency: Duration(minutes: _photoSyncInterval),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
        ),
      );
    } else {
      await Workmanager().cancelByUniqueName(_photoTaskName);
    }
    
    _logger.i('Photo sync ${enabled ? 'enabled' : 'disabled'}');
  }
  
  /// Force immediate sync
  Future<void> forceSyncNow() async {
    await _performImmediateSync(trigger: 'manual_force');
  }
  
  /// Get background sync status
  BackgroundSyncStatus getStatus() {
    return BackgroundSyncStatus(
      isEnabled: _backgroundSyncEnabled,
      isPhotoSyncEnabled: _photoSyncEnabled,
      isBatterySavingMode: _batterySavingMode,
      lastBackgroundSync: _lastBackgroundSync,
      lastSuccessfulSync: _lastSuccessfulSync,
      backgroundSyncAttempts: _backgroundSyncAttempts,
      backgroundSyncSuccesses: _backgroundSyncSuccesses,
      successRate: _backgroundSyncAttempts > 0 
          ? _backgroundSyncSuccesses / _backgroundSyncAttempts 
          : 0.0,
    );
  }
  
  /// Get sync performance statistics
  Future<List<Map<String, dynamic>>> getSyncMetrics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      String whereClause = '1=1';
      List<dynamic> whereArgs = [];
      
      if (startDate != null) {
        whereClause += ' AND measured_at >= ?';
        whereArgs.add(startDate.millisecondsSinceEpoch);
      }
      
      if (endDate != null) {
        whereClause += ' AND measured_at <= ?';
        whereArgs.add(endDate.millisecondsSinceEpoch);
      }
      
      return await _databaseService.query(
        'sync_performance_metrics',
        where: whereClause,
        whereArgs: whereArgs,
        orderBy: 'measured_at DESC',
        limit: 100,
      );
    } catch (e) {
      _logger.e('Error getting sync metrics', error: e);
      return [];
    }
  }
  
  /// Clean up old sync metrics
  Future<void> cleanupOldMetrics({int keepDays = 30}) async {
    try {
      final cutoffDate = DateTime.now().subtract(Duration(days: keepDays));
      
      await _databaseService.delete(
        'sync_performance_metrics',
        where: 'measured_at < ?',
        whereArgs: [cutoffDate.millisecondsSinceEpoch],
      );
      
      _logger.d('Cleaned up sync metrics older than $keepDays days');
    } catch (e) {
      _logger.e('Error cleaning up old metrics', error: e);
    }
  }
  
  /// Dispose resources
  Future<void> dispose() async {
    _connectivitySubscription?.cancel();
    _foregroundSyncTimer?.cancel();
    
    // Cancel all background tasks
    await Workmanager().cancelByUniqueName(_syncTaskName);
    await Workmanager().cancelByUniqueName(_photoTaskName);
    await Workmanager().cancelByUniqueName(_conflictTaskName);
    
    _logger.i('Background Sync Service disposed');
  }
  
  // Helper methods
  
  Future<String> _getNetworkQuality() async {
    // This would need to be implemented based on actual network measurements
    // For now, return a placeholder
    return 'good';
  }
  
  Future<int> _getBatteryLevel() async {
    // This would need to be implemented using battery_plus package
    // For now, return a safe value
    return 50;
  }
}

/// Background task dispatcher for Workmanager
@pragma('vm:entry-point')
void _backgroundSyncDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    final logger = Logger();
    
    try {
      logger.i('Executing background task: $taskName');
      
      // Initialize services for background execution
      await ServiceLocator.init(); // Ensure DI is ready
      final backgroundSync = BackgroundSyncService();
      await backgroundSync.initialize();
      
      switch (taskName) {
        case BackgroundSyncService._syncTaskName:
          await _executeBackgroundSync(inputData);
          break;
        case BackgroundSyncService._photoTaskName:
          await _executePhotoSync(inputData);
          break;
        case BackgroundSyncService._conflictTaskName:
          await _executeConflictResolution(inputData);
          break;
        default:
          logger.w('Unknown background task: $taskName');
          return false;
      }
      
      logger.i('Background task completed successfully: $taskName');
      return true;
      
    } catch (e) {
      logger.e('Background task failed: $taskName', error: e);
      return false;
    }
  });
}

/// Execute background sync task
Future<void> _executeBackgroundSync(Map<String, dynamic>? inputData) async {
  final logger = Logger();
  
  try {
    logger.d('Executing background sync task');
    
    // Initialize required services
    final batchSyncService = EnhancedBatchSyncService();
    await batchSyncService.initialize();
    
    // Check for pending operations
    final pendingCount = await batchSyncService.getPendingSyncCount();
    
    if (pendingCount > 0) {
      logger.i('Background sync: processing $pendingCount operations');
      
      // Execute batch sync
      final result = await batchSyncService.forceSyncNow();
      
      if (result.success) {
        logger.i('Background sync completed successfully');
      } else {
        logger.w('Background sync failed: ${result.message}');
      }
    } else {
      logger.d('No pending operations for background sync');
    }
    
  } catch (e) {
    logger.e('Error in background sync execution', error: e);
    rethrow;
  }
}

/// Execute photo sync task
Future<void> _executePhotoSync(Map<String, dynamic>? inputData) async {
  final logger = Logger();
  
  try {
    logger.d('Executing photo sync task');
    
    // Initialize photo sync service
    final photoSyncService = GateCheckPhotoSyncService();
    await photoSyncService.initialize();
    
    // Get pending photos (limit for background processing)
    final pendingPhotos = await photoSyncService.getPendingPhotoUploads(limit: 10);
    
    if (pendingPhotos.isNotEmpty) {
      logger.i('Background photo sync: processing ${pendingPhotos.length} photos');
      
      // Upload photos in batch
      final result = await photoSyncService.uploadPhotoBatch(pendingPhotos);
      
      logger.i('Background photo sync completed: ${result.successfulUploads}/${result.totalPhotos} uploaded');
    } else {
      logger.d('No pending photos for background sync');
    }
    
  } catch (e) {
    logger.e('Error in photo sync execution', error: e);
    rethrow;
  }
}

/// Execute conflict resolution task
Future<void> _executeConflictResolution(Map<String, dynamic>? inputData) async {
  final logger = Logger();
  
  try {
    logger.d('Executing conflict resolution task');
    
    // Initialize conflict resolution service
    final conflictService = EnhancedConflictResolutionService();
    await conflictService.initialize();
    
    // Auto-resolve eligible conflicts
    final result = await conflictService.batchAutoResolveConflicts(maxConflicts: 20);
    
    if (result.totalProcessed > 0) {
      logger.i('Background conflict resolution: ${result.successCount}/${result.totalProcessed} resolved');
    } else {
      logger.d('No conflicts to resolve in background');
    }
    
  } catch (e) {
    logger.e('Error in conflict resolution execution', error: e);
    rethrow;
  }
}

/// Background sync status data class
class BackgroundSyncStatus {
  final bool isEnabled;
  final bool isPhotoSyncEnabled;
  final bool isBatterySavingMode;
  final DateTime? lastBackgroundSync;
  final DateTime? lastSuccessfulSync;
  final int backgroundSyncAttempts;
  final int backgroundSyncSuccesses;
  final double successRate;
  
  BackgroundSyncStatus({
    required this.isEnabled,
    required this.isPhotoSyncEnabled,
    required this.isBatterySavingMode,
    this.lastBackgroundSync,
    this.lastSuccessfulSync,
    required this.backgroundSyncAttempts,
    required this.backgroundSyncSuccesses,
    required this.successRate,
  });
  
  Map<String, dynamic> toMap() {
    return {
      'isEnabled': isEnabled,
      'isPhotoSyncEnabled': isPhotoSyncEnabled,
      'isBatterySavingMode': isBatterySavingMode,
      'lastBackgroundSync': lastBackgroundSync?.toIso8601String(),
      'lastSuccessfulSync': lastSuccessfulSync?.toIso8601String(),
      'backgroundSyncAttempts': backgroundSyncAttempts,
      'backgroundSyncSuccesses': backgroundSyncSuccesses,
      'successRate': successRate,
    };
  }
}

// Required imports (these would need to be added to pubspec.yaml)
class Workmanager {
  static Workmanager? _instance;
  
  factory Workmanager() => _instance ??= Workmanager._internal();
  Workmanager._internal();
  
  Future<void> initialize(Function callback, {bool isInDebugMode = false}) async {
    // Workmanager initialization
  }
  
  Future<void> registerPeriodicTask(
    String uniqueName,
    String taskName, {
    Duration? frequency,
    Duration? initialDelay,
    Constraints? constraints,
    Map<String, dynamic>? inputData,
  }) async {
    // Register periodic background task
  }
  
  Future<void> cancelByUniqueName(String uniqueName) async {
    // Cancel specific background task
  }
  
  void executeTask(Future<bool> Function(String taskName, Map<String, dynamic>? inputData) task) {
    // Execute background task
  }
}

class Constraints {
  final NetworkType? networkType;
  final bool? requiresBatteryNotLow;
  final bool? requiresCharging;
  
  Constraints({
    this.networkType,
    this.requiresBatteryNotLow,
    this.requiresCharging,
  });
}

enum NetworkType { connected, unmetered, notRequired }

// Mock classes that would be properly imported
class RoleBasedSyncService {}
class EnhancedConflictResolutionService {
  Future<void> initialize() async {}
  Future<BatchResolutionResult> batchAutoResolveConflicts({int? maxConflicts}) async {
    return BatchResolutionResult(totalProcessed: 0, successCount: 0, failureCount: 0, errors: []);
  }
}

class BatchResolutionResult {
  final int totalProcessed;
  final int successCount;
  final int failureCount;
  final List<String> errors;
  
  BatchResolutionResult({
    required this.totalProcessed,
    required this.successCount,
    required this.failureCount,
    required this.errors,
  });
}


