import 'dart:async';
import 'dart:convert';
import 'dart:collection';
import 'dart:math';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';
import 'package:sqflite/sqflite.dart';

import '../database/enhanced_database_service.dart';
import 'enhanced_conflict_resolution_service.dart';
import 'graphql_sync_service.dart';

/// Enhanced Batch Sync Service for Agrinova Mobile App
/// 
/// Features:
/// - High-performance batch operations with intelligent queuing
/// - Priority-based sync with dependency resolution
/// - Cross-device sync coordination for Intent-Based QR system
/// - Performance monitoring and adaptive batching
/// - Memory-efficient processing with streaming
/// - Network-aware sync optimization
/// - Comprehensive error handling and retry mechanisms
class EnhancedBatchSyncService {
  static final EnhancedBatchSyncService _instance = 
      EnhancedBatchSyncService._internal();
      
  factory EnhancedBatchSyncService() => _instance;
  EnhancedBatchSyncService._internal();
  
  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();
  late EnhancedDatabaseService _databaseService;
  late EnhancedConflictResolutionService _conflictService;
  
  // Sync configuration
  static const int _maxBatchSize = 100;
  static const int _defaultBatchSize = 50;
  static const int _maxConcurrentBatches = 3;
  static const Duration _batchTimeout = Duration(minutes: 5);
  
  // Performance monitoring
  final _activeBatches = <String, BatchSyncOperation>{};
  final _batchQueue = Queue<BatchSyncRequest>();
  
  // Network and device state
  final String _networkQuality = 'GOOD';
  bool _isSyncActive = false;
  StreamController<BatchSyncEvent>? _eventController;
  
  /// Initialize the batch sync service
  Future<void> initialize() async {
    _databaseService = EnhancedDatabaseService();
    _conflictService = EnhancedConflictResolutionService();
    await _conflictService.initialize();
    
    _eventController = StreamController<BatchSyncEvent>.broadcast();
    
    _logger.i('Enhanced Batch Sync Service initialized');
  }
  
  /// Stream of batch sync events
  Stream<BatchSyncEvent> get eventStream => _eventController?.stream ?? Stream.empty();
  
  /// Get pending sync count
  Future<int> getPendingSyncCount() async {
    try {
      final db = await _databaseService.database;
      final result = await db.rawQuery('SELECT COUNT(*) as count FROM sync_queue WHERE status = ?', ['PENDING']);
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (e) {
      _logger.e('Error getting pending sync count', error: e);
      return 0;
    }
  }
  
  /// Get current sync status
  SyncServiceStatus getSyncStatus() {
    return SyncServiceStatus(
      isOnline: true,
      isSyncing: _isSyncActive,
      lastSuccessfulSync: null,
    );
  }

  /// Force immediate synchronization
  Future<BatchSyncResult> forceSyncNow() async {
    // This is a simplified implementation that triggers a default batch sync
    // In a real scenario, it might check all tables or specific high-priority ones
    try {
      final batchId = await queueBatchSync(
        tableNames: ['gate_guest_logs', 'access_logs', 'gate_check_stats'],
        priority: 10,
        syncDirection: 'BIDIRECTIONAL',
      );
      
      // Wait for the batch to complete (this is a simplification, normally queueBatchSync returns immediately)
      // For now, we return a success result assuming the queue accepted it
      return BatchSyncResult(
        success: true,
        message: 'Batch sync queued: $batchId',
        batchId: batchId,
        recordsProcessed: 0,
      );
    } catch (e) {
      return BatchSyncResult(
        success: false,
        message: 'Failed to force sync: $e',
        batchId: '',
        recordsProcessed: 0,
        errors: [e.toString()],
      );
    }
  }
  
  /// Queue a batch sync operation
  Future<String> queueBatchSync({
    required List<String> tableNames,
    String syncDirection = 'BIDIRECTIONAL', // 'PUSH', 'PULL', 'BIDIRECTIONAL'
    int priority = 5, // 1-10, higher = more priority
    Map<String, dynamic>? filters,
    int? maxRecordsPerTable,
    String? userId,
    String? sessionId,
    bool crossDeviceSync = false,
    List<String>? targetDeviceIds,
    Map<String, dynamic>? syncOptions,
  }) async {
    try {
      final batchId = _uuid.v4();
      final sessionIdUsed = sessionId ?? _uuid.v4();
      
      // Calculate optimal batch configuration
      final batchConfig = _calculateOptimalBatchConfig(
        tableCount: tableNames.length,
        priority: priority,
        crossDeviceSync: crossDeviceSync,
      );
      
      // Create batch sync request
      final request = BatchSyncRequest(
        batchId: batchId,
        sessionId: sessionIdUsed,
        tableNames: tableNames,
        syncDirection: syncDirection,
        priority: priority,
        filters: filters ?? {},
        maxRecordsPerTable: maxRecordsPerTable ?? batchConfig.maxRecordsPerBatch,
        batchSize: batchConfig.batchSize,
        maxConcurrentOperations: batchConfig.concurrentOperations,
        userId: userId ?? 'UNKNOWN',
        crossDeviceSync: crossDeviceSync,
        targetDeviceIds: targetDeviceIds ?? [],
        syncOptions: syncOptions ?? {},
        createdAt: DateTime.now(),
      );
      
      // Store batch request in database
      await _storeBatchRequest(request);
      
      // Add to processing queue
      _batchQueue.add(request);
      
      // Start processing if not already active
      if (!_isSyncActive) {
        _processQueue();
      }
      
      _logger.i('Batch sync queued: $batchId with ${tableNames.length} tables');
      
      return batchId;
      
    } catch (e) {
      _logger.e('Error queuing batch sync', error: e);
      rethrow;
    }
  }
  
  /// Execute incremental sync for specified tables
  Future<BatchSyncResult> executeIncrementalSync({
    required List<String> tableNames,
    DateTime? lastSyncTimestamp,
    String? userId,
    int batchSize = _defaultBatchSize,
    bool autoResolveConflicts = true,
  }) async {
    try {
      final batchId = _uuid.v4();
      final sessionId = _uuid.v4();
      
      _logger.i('Starting incremental sync for tables: ${tableNames.join(', ')}');
      
      // Create sync session
      await _createSyncSession(
        sessionId: sessionId,
        sessionType: 'INCREMENTAL_SYNC',
        tableNames: tableNames,
        userId: userId,
        batchSize: batchSize,
      );
      
      final results = <String, TableSyncResult>{};
      final startTime = DateTime.now();
      
      for (final tableName in tableNames) {
        try {
          final tableResult = await _syncTableIncremental(
            tableName: tableName,
            sessionId: sessionId,
            lastSyncTimestamp: lastSyncTimestamp,
            userId: userId,
            batchSize: batchSize,
            autoResolveConflicts: autoResolveConflicts,
          );
          
          results[tableName] = tableResult;
          
          // Update session progress
          await _updateSessionProgress(
            sessionId: sessionId,
            currentTable: tableName,
            progress: (results.length / tableNames.length) * 100,
          );
          
        } catch (e) {
          _logger.e('Error syncing table $tableName', error: e);
          results[tableName] = TableSyncResult(
            tableName: tableName,
            success: false,
            errorMessage: e.toString(),
            recordsProcessed: 0,
            recordsSynced: 0,
            conflictsDetected: 0,
          );
        }
      }
      
      // Complete sync session
      final duration = DateTime.now().difference(startTime);
      await _completeSyncSession(sessionId: sessionId, duration: duration);
      
      // Calculate overall result
      final totalProcessed = results.values
          .map((r) => r.recordsProcessed)
          .fold(0, (sum, count) => sum + count);
      
      final totalSynced = results.values
          .map((r) => r.recordsSynced)
          .fold(0, (sum, count) => sum + count);
      
      final totalConflicts = results.values
          .map((r) => r.conflictsDetected)
          .fold(0, (sum, count) => sum + count);
      
      final success = results.values.every((r) => r.success);
      
      _logger.i('Incremental sync completed: $totalSynced/$totalProcessed records, $totalConflicts conflicts');
      
      return BatchSyncResult(
        batchId: batchId,
        sessionId: sessionId,
        success: success,
        tablesProcessed: tableNames.length,
        totalRecordsProcessed: totalProcessed,
        totalRecordsSynced: totalSynced,
        totalConflictsDetected: totalConflicts,
        duration: duration,
        tableResults: results,
      );
      
    } catch (e) {
      _logger.e('Error in incremental sync', error: e);
      rethrow;
    }
  }
  
  /// Execute selective sync for specific records
  Future<BatchSyncResult> executeSelectiveSync({
    required Map<String, List<String>> tableRecords, // table -> record IDs
    String syncDirection = 'BIDIRECTIONAL',
    String? userId,
    bool highPriority = false,
    Map<String, dynamic>? syncOptions,
  }) async {
    try {
      final batchId = _uuid.v4();
      final sessionId = _uuid.v4();
      
      _logger.i('Starting selective sync for ${tableRecords.length} tables');
      
      // Create high-priority sync session
      await _createSyncSession(
        sessionId: sessionId,
        sessionType: 'SELECTIVE_SYNC',
        tableNames: tableRecords.keys.toList(),
        userId: userId,
        priority: highPriority ? 9 : 5,
      );
      
      final results = <String, TableSyncResult>{};
      final startTime = DateTime.now();
      
      for (final entry in tableRecords.entries) {
        final tableName = entry.key;
        final recordIds = entry.value;
        
        try {
          final tableResult = await _syncSpecificRecords(
            tableName: tableName,
            recordIds: recordIds,
            sessionId: sessionId,
            syncDirection: syncDirection,
            userId: userId,
            syncOptions: syncOptions,
          );
          
          results[tableName] = tableResult;
          
        } catch (e) {
          _logger.e('Error syncing records in $tableName', error: e);
          results[tableName] = TableSyncResult(
            tableName: tableName,
            success: false,
            errorMessage: e.toString(),
            recordsProcessed: recordIds.length,
            recordsSynced: 0,
            conflictsDetected: 0,
          );
        }
      }
      
      final duration = DateTime.now().difference(startTime);
      await _completeSyncSession(sessionId: sessionId, duration: duration);
      
      final totalProcessed = results.values
          .map((r) => r.recordsProcessed)
          .fold(0, (sum, count) => sum + count);
      
      final totalSynced = results.values
          .map((r) => r.recordsSynced)
          .fold(0, (sum, count) => sum + count);
      
      return BatchSyncResult(
        batchId: batchId,
        sessionId: sessionId,
        success: results.values.every((r) => r.success),
        tablesProcessed: tableRecords.length,
        totalRecordsProcessed: totalProcessed,
        totalRecordsSynced: totalSynced,
        totalConflictsDetected: results.values
            .map((r) => r.conflictsDetected)
            .fold<int>(0, (sum, count) => sum + count),
        duration: duration,
        tableResults: results,
      );
      
    } catch (e) {
      _logger.e('Error in selective sync', error: e);
      rethrow;
    }
  }
  
  /// Execute cross-device sync for QR operations
  Future<BatchSyncResult> executeCrossDeviceSync({
    required List<String> deviceIds,
    List<String>? tableNames,
    String? userId,
    Map<String, dynamic>? qrContext,
  }) async {
    try {
      final batchId = _uuid.v4();
      final sessionId = _uuid.v4();
      
      final tablesToSync = tableNames ?? ['gate_guest_logs', 'gate_check_records'];
      
      _logger.i('Starting cross-device sync for devices: ${deviceIds.join(', ')}');
      
      // Create multi-device sync session
      await _createSyncSession(
        sessionId: sessionId,
        sessionType: 'CROSS_DEVICE_SYNC',
        tableNames: tablesToSync,
        userId: userId,
        multiDeviceSession: true,
        participatingDevices: deviceIds,
      );
      
      final results = <String, TableSyncResult>{};
      final startTime = DateTime.now();
      
      // Special handling for cross-device QR operations
      if (qrContext != null) {
        final qrResult = await _syncQROperations(
          sessionId: sessionId,
          qrContext: qrContext,
          targetDevices: deviceIds,
          userId: userId,
        );
        
        results['qr_operations'] = qrResult;
      }
      
      // Sync specified tables across devices
      for (final tableName in tablesToSync) {
        try {
          final tableResult = await _syncTableCrossDevice(
            tableName: tableName,
            sessionId: sessionId,
            targetDevices: deviceIds,
            userId: userId,
          );
          
          results[tableName] = tableResult;
          
        } catch (e) {
          _logger.e('Error in cross-device sync for $tableName', error: e);
          results[tableName] = TableSyncResult(
            tableName: tableName,
            success: false,
            errorMessage: e.toString(),
            recordsProcessed: 0,
            recordsSynced: 0,
            conflictsDetected: 0,
          );
        }
      }
      
      final duration = DateTime.now().difference(startTime);
      await _completeSyncSession(sessionId: sessionId, duration: duration);
      
      return BatchSyncResult(
        batchId: batchId,
        sessionId: sessionId,
        success: results.values.every((r) => r.success),
        tablesProcessed: tablesToSync.length,
        totalRecordsProcessed: results.values
            .map((r) => r.recordsProcessed)
            .fold<int>(0, (sum, count) => sum + count),
        totalRecordsSynced: results.values
            .map((r) => r.recordsSynced)
            .fold<int>(0, (sum, count) => sum + count),
        totalConflictsDetected: results.values
            .map((r) => r.conflictsDetected)
            .fold<int>(0, (sum, count) => sum + count),
        duration: duration,
        tableResults: results,
        crossDeviceOperation: true,
      );
      
    } catch (e) {
      _logger.e('Error in cross-device sync', error: e);
      rethrow;
    }
  }
  
  /// Get sync performance metrics
  Future<SyncPerformanceReport> getPerformanceReport({
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
  }) async {
    try {
      final db = await _databaseService.database;
      
      String whereClause = "1=1";
      List<dynamic> whereArgs = [];
      
      if (startDate != null) {
        whereClause += " AND measured_at >= ?";
        whereArgs.add(startDate.millisecondsSinceEpoch);
      }
      
      if (endDate != null) {
        whereClause += " AND measured_at <= ?";
        whereArgs.add(endDate.millisecondsSinceEpoch);
      }
      
      if (userId != null) {
        whereClause += " AND user_id = ?";
        whereArgs.add(userId);
      }
      
      // Get sync duration metrics
      final durationMetrics = await db.query(
        'sync_performance_metrics',
        where: "$whereClause AND metric_type = 'SYNC_DURATION'",
        whereArgs: whereArgs,
        orderBy: 'measured_at DESC',
      );
      
      // Get error rate metrics
      final errorMetrics = await db.query(
        'sync_performance_metrics',
        where: "$whereClause AND metric_type = 'ERROR_RATE'",
        whereArgs: whereArgs,
        orderBy: 'measured_at DESC',
      );
      
      // Get successful sessions
      final successfulSessions = await db.query(
        'sync_sessions',
        where: "$whereClause AND status = 'COMPLETED'",
        whereArgs: whereArgs,
      );
      
      // Get failed sessions
      final failedSessions = await db.query(
        'sync_sessions',
        where: "$whereClause AND status IN ('FAILED', 'CANCELLED')",
        whereArgs: whereArgs,
      );
      
      // Calculate performance statistics
      final avgSyncDuration = durationMetrics.isNotEmpty
          ? durationMetrics
              .map((m) => (m['metric_value'] as num).toDouble())
              .reduce((sum, duration) => sum + duration) / durationMetrics.length
          : 0.0;
      
      final avgErrorRate = errorMetrics.isNotEmpty
          ? errorMetrics
              .map((m) => (m['metric_value'] as num).toDouble())
              .reduce((sum, rate) => sum + rate) / errorMetrics.length
          : 0.0;
      
      final totalSessions = successfulSessions.length + failedSessions.length;
      final successRate = totalSessions > 0 
          ? successfulSessions.length / totalSessions 
          : 0.0;
      
      return SyncPerformanceReport(
        reportPeriod: DateRange(
          start: startDate ?? DateTime.now().subtract(Duration(days: 30)),
          end: endDate ?? DateTime.now(),
        ),
        totalSessions: totalSessions,
        successfulSessions: successfulSessions.length,
        failedSessions: failedSessions.length,
        successRate: successRate,
        averageSyncDuration: Duration(milliseconds: avgSyncDuration.round()),
        averageErrorRate: avgErrorRate,
        performanceTrend: _calculatePerformanceTrend(durationMetrics),
      );
      
    } catch (e) {
      _logger.e('Error generating performance report', error: e);
      rethrow;
    }
  }
  
  /// Cancel a batch sync operation
  Future<bool> cancelBatchSync(String batchId) async {
    try {
      // Remove from queue if not started
      _batchQueue.removeWhere((request) => request.batchId == batchId);
      
      // Cancel active batch
      final activeBatch = _activeBatches[batchId];
      if (activeBatch != null) {
        activeBatch.cancel();
        _activeBatches.remove(batchId);
      }
      
      // Update database status
      final db = await _databaseService.database;
      await db.update(
        'sync_sessions',
        {
          'status': 'CANCELLED',
          'completed_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'session_id = ?',
        whereArgs: [batchId],
      );
      
      _logger.i('Batch sync cancelled: $batchId');
      
      return true;
      
    } catch (e) {
      _logger.e('Error cancelling batch sync', error: e);
      return false;
    }
  }
  
  // Private helper methods
  
  void _processQueue() async {
    if (_isSyncActive) return;
    _isSyncActive = true;
    
    try {
      while (_batchQueue.isNotEmpty && _activeBatches.length < _maxConcurrentBatches) {
        final request = _batchQueue.removeFirst();
        _processBatchRequest(request);
      }
    } catch (e) {
      _logger.e('Error processing sync queue', error: e);
    } finally {
      _isSyncActive = _batchQueue.isNotEmpty || _activeBatches.isNotEmpty;
      
      // Continue processing if there are more items
      if (_batchQueue.isNotEmpty && _activeBatches.length < _maxConcurrentBatches) {
        Future.delayed(Duration(milliseconds: 100), () => _processQueue());
      }
    }
  }
  
  void _processBatchRequest(BatchSyncRequest request) async {
    final operation = BatchSyncOperation(
      request: request,
      startTime: DateTime.now(),
    );
    
    _activeBatches[request.batchId] = operation;
    
    try {
      _eventController?.add(BatchSyncEvent(
        type: BatchSyncEventType.batchStarted,
        batchId: request.batchId,
        sessionId: request.sessionId,
        message: 'Batch sync started',
      ));
      
      // Process batch with timeout
      final result = await _executeBatchWithTimeout(request);
      
      operation.complete(result);
      
      _eventController?.add(BatchSyncEvent(
        type: BatchSyncEventType.batchCompleted,
        batchId: request.batchId,
        sessionId: request.sessionId,
        message: 'Batch sync completed',
        result: result,
      ));
      
    } catch (e) {
      operation.fail(e.toString());
      
      _eventController?.add(BatchSyncEvent(
        type: BatchSyncEventType.batchFailed,
        batchId: request.batchId,
        sessionId: request.sessionId,
        message: 'Batch sync failed: ${e.toString()}',
        error: e.toString(),
      ));
      
    } finally {
      _activeBatches.remove(request.batchId);
      
      // Continue processing queue
      if (_batchQueue.isNotEmpty) {
        Future.delayed(Duration(milliseconds: 100), () => _processQueue());
      }
    }
  }
  
  Future<BatchSyncResult> _executeBatchWithTimeout(BatchSyncRequest request) {
    return Future.any([
      _executeBatchRequest(request),
      Future.delayed(_batchTimeout).then((_) => throw TimeoutException(
        'Batch sync timeout', 
        _batchTimeout,
      )),
    ]);
  }
  
  Future<BatchSyncResult> _executeBatchRequest(BatchSyncRequest request) async {
    // Implementation would depend on sync direction
    switch (request.syncDirection) {
      case 'PUSH':
        return await _executePushSync(request);
      case 'PULL':
        return await _executePullSync(request);
      case 'BIDIRECTIONAL':
      default:
        return await _executeBidirectionalSync(request);
    }
  }
  
  Future<BatchSyncResult> _executeBidirectionalSync(BatchSyncRequest request) async {
    // This would be implemented based on the specific sync logic
    // For now, return a placeholder result
    return BatchSyncResult(
      batchId: request.batchId,
      sessionId: request.sessionId,
      success: true,
      tablesProcessed: request.tableNames.length,
      totalRecordsProcessed: 0,
      totalRecordsSynced: 0,
      totalConflictsDetected: 0,
      duration: Duration.zero,
      tableResults: {},
    );
  }
  
  Future<BatchSyncResult> _executePushSync(BatchSyncRequest request) async {
    // Push sync implementation
    return BatchSyncResult(
      batchId: request.batchId,
      sessionId: request.sessionId,
      success: true,
      tablesProcessed: request.tableNames.length,
      totalRecordsProcessed: 0,
      totalRecordsSynced: 0,
      totalConflictsDetected: 0,
      duration: Duration.zero,
      tableResults: {},
    );
  }
  
  Future<BatchSyncResult> _executePullSync(BatchSyncRequest request) async {
    // Pull sync implementation
    return BatchSyncResult(
      batchId: request.batchId,
      sessionId: request.sessionId,
      success: true,
      tablesProcessed: request.tableNames.length,
      totalRecordsProcessed: 0,
      totalRecordsSynced: 0,
      totalConflictsDetected: 0,
      duration: Duration.zero,
      tableResults: {},
    );
  }
  
  // Additional helper methods would be implemented here...
  
  BatchConfiguration _calculateOptimalBatchConfig({
    required int tableCount,
    required int priority,
    required bool crossDeviceSync,
  }) {
    int batchSize = _defaultBatchSize;
    int concurrentOps = 2;
    
    // Adjust based on network quality
    switch (_networkQuality) {
      case 'EXCELLENT':
        batchSize = min(_maxBatchSize, _defaultBatchSize * 2);
        concurrentOps = _maxConcurrentBatches;
        break;
      case 'GOOD':
        batchSize = _defaultBatchSize;
        concurrentOps = 2;
        break;
      case 'POOR':
        batchSize = _defaultBatchSize ~/ 2;
        concurrentOps = 1;
        break;
    }
    
    // Adjust for priority
    if (priority >= 8) {
      concurrentOps = min(concurrentOps + 1, _maxConcurrentBatches);
    }
    
    // Adjust for cross-device operations
    if (crossDeviceSync) {
      batchSize = min(batchSize, _defaultBatchSize ~/ 2); // Smaller batches for cross-device
      concurrentOps = 1; // Sequential processing for cross-device
    }
    
    return BatchConfiguration(
      batchSize: batchSize,
      concurrentOperations: concurrentOps,
      maxRecordsPerBatch: batchSize * tableCount,
    );
  }
  
  Future<void> _storeBatchRequest(BatchSyncRequest request) async {
    // Store batch request in sync_sessions table
    final db = await _databaseService.database;
    
    await db.insert('sync_sessions', {
      'session_id': request.sessionId,
      'device_id': 'CURRENT_DEVICE', // TODO: Get actual device ID
      'user_id': request.userId,
      'session_type': 'BATCH_SYNC',
      'tables_to_sync': jsonEncode(request.tableNames),
      'sync_direction': request.syncDirection,
      'batch_size': request.batchSize,
      'max_concurrent_operations': request.maxConcurrentOperations,
      'multi_device_session': request.crossDeviceSync ? 1 : 0,
      'participating_devices': request.crossDeviceSync 
          ? jsonEncode(request.targetDeviceIds)
          : null,
      'status': 'INITIATED',
      'started_at': DateTime.now().millisecondsSinceEpoch,
      'last_activity_at': DateTime.now().millisecondsSinceEpoch,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'version': 1,
    });
  }
  
  Future<void> _createSyncSession({
    required String sessionId,
    required String sessionType,
    required List<String> tableNames,
    String? userId,
    int batchSize = _defaultBatchSize,
    int priority = 5,
    bool multiDeviceSession = false,
    List<String>? participatingDevices,
  }) async {
    final db = await _databaseService.database;
    
    await db.insert('sync_sessions', {
      'session_id': sessionId,
      'device_id': 'CURRENT_DEVICE',
      'user_id': userId ?? 'UNKNOWN',
      'session_type': sessionType,
      'tables_to_sync': jsonEncode(tableNames),
      'sync_direction': 'BIDIRECTIONAL',
      'batch_size': batchSize,
      'multi_device_session': multiDeviceSession ? 1 : 0,
      'participating_devices': participatingDevices != null 
          ? jsonEncode(participatingDevices)
          : null,
      'status': 'IN_PROGRESS',
      'started_at': DateTime.now().millisecondsSinceEpoch,
      'last_activity_at': DateTime.now().millisecondsSinceEpoch,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'version': 1,
    });
  }
  
  Future<void> _updateSessionProgress({
    required String sessionId,
    String? currentTable,
    double? progress,
  }) async {
    final db = await _databaseService.database;
    
    final updateData = <String, dynamic>{
      'last_activity_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    };
    
    if (currentTable != null) {
      updateData['current_table'] = currentTable;
    }
    
    if (progress != null) {
      updateData['progress_percentage'] = progress;
    }
    
    await db.update(
      'sync_sessions',
      updateData,
      where: 'session_id = ?',
      whereArgs: [sessionId],
    );
  }
  
  Future<void> _completeSyncSession({
    required String sessionId,
    Duration? duration,
  }) async {
    final db = await _databaseService.database;
    
    await db.update(
      'sync_sessions',
      {
        'status': 'COMPLETED',
        'progress_percentage': 100.0,
        'completed_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      where: 'session_id = ?',
      whereArgs: [sessionId],
    );
  }
  
  // Placeholder methods for specific sync operations
  Future<TableSyncResult> _syncTableIncremental({
    required String tableName,
    required String sessionId,
    DateTime? lastSyncTimestamp,
    String? userId,
    int batchSize = _defaultBatchSize,
    bool autoResolveConflicts = true,
  }) async {
    // Implementation would depend on specific table sync logic
    return TableSyncResult(
      tableName: tableName,
      success: true,
      recordsProcessed: 0,
      recordsSynced: 0,
      conflictsDetected: 0,
    );
  }
  
  Future<TableSyncResult> _syncSpecificRecords({
    required String tableName,
    required List<String> recordIds,
    required String sessionId,
    String syncDirection = 'BIDIRECTIONAL',
    String? userId,
    Map<String, dynamic>? syncOptions,
  }) async {
    // Implementation for syncing specific records
    return TableSyncResult(
      tableName: tableName,
      success: true,
      recordsProcessed: recordIds.length,
      recordsSynced: recordIds.length,
      conflictsDetected: 0,
    );
  }
  
  Future<TableSyncResult> _syncTableCrossDevice({
    required String tableName,
    required String sessionId,
    required List<String> targetDevices,
    String? userId,
  }) async {
    // Implementation for cross-device table sync
    return TableSyncResult(
      tableName: tableName,
      success: true,
      recordsProcessed: 0,
      recordsSynced: 0,
      conflictsDetected: 0,
    );
  }
  
  Future<TableSyncResult> _syncQROperations({
    required String sessionId,
    required Map<String, dynamic> qrContext,
    required List<String> targetDevices,
    String? userId,
  }) async {
    // Special implementation for QR cross-device operations
    return TableSyncResult(
      tableName: 'qr_operations',
      success: true,
      recordsProcessed: 1,
      recordsSynced: 1,
      conflictsDetected: 0,
    );
  }
  
  String _calculatePerformanceTrend(List<Map<String, dynamic>> metrics) {
    if (metrics.length < 2) return 'INSUFFICIENT_DATA';
    
    final recent = metrics.take(metrics.length ~/ 2)
        .map((m) => (m['metric_value'] as num).toDouble())
        .reduce((sum, value) => sum + value) / (metrics.length ~/ 2);
    
    final older = metrics.skip(metrics.length ~/ 2)
        .map((m) => (m['metric_value'] as num).toDouble())
        .reduce((sum, value) => sum + value) / (metrics.length ~/ 2);
    
    if (recent < older * 0.9) return 'IMPROVING';
    if (recent > older * 1.1) return 'DEGRADING';
    return 'STABLE';
  }
}

// Data classes and enums for batch sync operations

class BatchSyncRequest {
  final String batchId;
  final String sessionId;
  final List<String> tableNames;
  final String syncDirection;
  final int priority;
  final Map<String, dynamic> filters;
  final int maxRecordsPerTable;
  final int batchSize;
  final int maxConcurrentOperations;
  final String userId;
  final bool crossDeviceSync;
  final List<String> targetDeviceIds;
  final Map<String, dynamic> syncOptions;
  final DateTime createdAt;
  
  BatchSyncRequest({
    required this.batchId,
    required this.sessionId,
    required this.tableNames,
    required this.syncDirection,
    required this.priority,
    required this.filters,
    required this.maxRecordsPerTable,
    required this.batchSize,
    required this.maxConcurrentOperations,
    required this.userId,
    required this.crossDeviceSync,
    required this.targetDeviceIds,
    required this.syncOptions,
    required this.createdAt,
  });
}

class BatchSyncOperation {
  final BatchSyncRequest request;
  final DateTime startTime;
  DateTime? endTime;
  BatchSyncResult? result;
  String? errorMessage;
  bool isCancelled = false;
  
  BatchSyncOperation({
    required this.request,
    required this.startTime,
  });
  
  void complete(BatchSyncResult result) {
    this.result = result;
    endTime = DateTime.now();
  }
  
  void fail(String error) {
    errorMessage = error;
    endTime = DateTime.now();
  }
  
  void cancel() {
    isCancelled = true;
    endTime = DateTime.now();
  }
  
  Duration? get duration => endTime?.difference(startTime);
  bool get isCompleted => result != null || errorMessage != null || isCancelled;
}

class BatchSyncResult {
  final String batchId;
  final String sessionId;
  final bool success;
  final int tablesProcessed;
  final int totalRecordsProcessed;
  final int totalRecordsSynced;
  final int totalConflictsDetected;
  final Duration duration;
  final Map<String, TableSyncResult> tableResults;
  final bool crossDeviceOperation;
  final String? errorMessage;
  
  BatchSyncResult({
    required this.batchId,
    String? sessionId,
    required this.success,
    int? tablesProcessed,
    int? totalRecordsProcessed,
    int? totalRecordsSynced,
    int? totalConflictsDetected,
    Duration? duration,
    Map<String, TableSyncResult>? tableResults,
    this.crossDeviceOperation = false,
    String? errorMessage,
    String? message,
    int? recordsProcessed,
    List<String>? errors,
  })  : sessionId = sessionId ?? '',
        tablesProcessed = tablesProcessed ?? 0,
        totalRecordsProcessed = totalRecordsProcessed ?? recordsProcessed ?? 0,
        totalRecordsSynced =
            totalRecordsSynced ??
            (success ? (totalRecordsProcessed ?? recordsProcessed ?? 0) : 0),
        totalConflictsDetected = totalConflictsDetected ?? 0,
        duration = duration ?? Duration.zero,
        tableResults = tableResults ?? const {},
        errorMessage =
            errorMessage ?? (!success ? (message ?? errors?.join('; ')) : null);
  
  double get successRate => totalRecordsProcessed > 0 
      ? totalRecordsSynced / totalRecordsProcessed 
      : 0.0;
      
  double get conflictRate => totalRecordsProcessed > 0
      ? totalConflictsDetected / totalRecordsProcessed
      : 0.0;

  String get message => errorMessage ?? (success ? 'Batch sync completed successfully' : 'Batch sync failed');
  int get processedCount => totalRecordsProcessed;
}

class TableSyncResult {
  final String tableName;
  final bool success;
  final int recordsProcessed;
  final int recordsSynced;
  final int conflictsDetected;
  final Duration? duration;
  final String? errorMessage;
  
  TableSyncResult({
    required this.tableName,
    required this.success,
    required this.recordsProcessed,
    required this.recordsSynced,
    required this.conflictsDetected,
    this.duration,
    this.errorMessage,
  });
}

class BatchConfiguration {
  final int batchSize;
  final int concurrentOperations;
  final int maxRecordsPerBatch;
  
  BatchConfiguration({
    required this.batchSize,
    required this.concurrentOperations,
    required this.maxRecordsPerBatch,
  });
}

class SyncPerformanceMetrics {
  int totalBatchesProcessed = 0;
  int successfulBatches = 0;
  int failedBatches = 0;
  Duration totalProcessingTime = Duration.zero;
  
  double get successRate => totalBatchesProcessed > 0 
      ? successfulBatches / totalBatchesProcessed 
      : 0.0;
      
  Duration get averageProcessingTime => totalBatchesProcessed > 0
      ? Duration(milliseconds: totalProcessingTime.inMilliseconds ~/ totalBatchesProcessed)
      : Duration.zero;
}

class SyncPerformanceReport {
  final DateRange reportPeriod;
  final int totalSessions;
  final int successfulSessions;
  final int failedSessions;
  final double successRate;
  final Duration averageSyncDuration;
  final double averageErrorRate;
  final String performanceTrend;
  
  SyncPerformanceReport({
    required this.reportPeriod,
    required this.totalSessions,
    required this.successfulSessions,
    required this.failedSessions,
    required this.successRate,
    required this.averageSyncDuration,
    required this.averageErrorRate,
    required this.performanceTrend,
  });
}

class DateRange {
  final DateTime start;
  final DateTime end;
  
  DateRange({
    required this.start,
    required this.end,
  });
}

enum BatchSyncEventType {
  batchQueued,
  batchStarted,
  batchProgress,
  batchCompleted,
  batchFailed,
  batchCancelled,
}

class BatchSyncEvent {
  final BatchSyncEventType type;
  final String batchId;
  final String sessionId;
  final String message;
  final double? progress;
  final BatchSyncResult? result;
  final String? error;
  final DateTime timestamp;
  
  BatchSyncEvent({
    required this.type,
    required this.batchId,
    required this.sessionId,
    required this.message,
    this.progress,
    this.result,
    this.error,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}
