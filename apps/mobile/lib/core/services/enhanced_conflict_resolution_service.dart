import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

import '../database/enhanced_database_service.dart';
import '../models/conflict_resolution_models.dart';

/// Enhanced Conflict Resolution Service for Agrinova Mobile App
/// 
/// Features:
/// - Field-level conflict resolution with merge strategies
/// - Cross-device conflict handling for Intent-Based QR system
/// - Automated conflict resolution with confidence scoring
/// - Manual conflict resolution workflow
/// - Performance optimized with batch processing
class EnhancedConflictResolutionService {
  static final EnhancedConflictResolutionService _instance = 
      EnhancedConflictResolutionService._internal();
  
  factory EnhancedConflictResolutionService() => _instance;
  EnhancedConflictResolutionService._internal();
  
  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();
  EnhancedDatabaseService? _databaseService;
  bool _isInitialized = false;
  
  // Resolution strategy configuration
  static const Map<String, double> _autoResolutionConfidenceThresholds = {
    'gate_guest_logs': 0.8,           // High confidence for guest logs
    'gate_check_records': 0.7,   // Medium-high for gate checks
    'harvest_records': 0.9,      // Very high for harvest data
    'notifications': 0.6,        // Lower threshold for notifications
  };
  
  // Field priorities for conflict resolution (higher = more important)
  static const Map<String, int> _fieldPriorities = {
    'id': 100,                   // Never override IDs
    'user_id': 95,               // User context is critical
    'created_by': 90,            // Creator information important
    'created_at': 85,            // Creation timestamp important
    'sync_status': 80,           // Sync state critical
    'status': 75,                // Business status important
    'updated_at': 70,            // Update timestamp
    'version': 65,               // Version control
    'notes': 30,                 // Notes can be merged
    'metadata': 25,              // Metadata less critical
  };
  
  /// Check if service is initialized
  bool get isInitialized => _isInitialized;
  
  /// Ensure service is initialized before use
  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await initialize();
    }
  }
  
  /// Initialize the conflict resolution service
  Future<void> initialize() async {
    if (_isInitialized) return;
    _databaseService = EnhancedDatabaseService();
    _isInitialized = true;
    _logger.i('Enhanced Conflict Resolution Service initialized');
  }
  
  /// Detect conflicts between local and server data
  Future<ConflictDetectionResult> detectConflicts({
    required String tableName,
    required String recordId,
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    String? transactionId,
  }) async {
    try {
      final conflictId = _uuid.v4();
      final conflictingFields = <String>[];
      final fieldAnalysis = <String, FieldConflictAnalysis>{};
      
      // Analyze each field for conflicts
      final allFields = <String>{...localData.keys, ...serverData.keys};
      
      for (final field in allFields) {
        final analysis = _analyzeFieldConflict(
          field: field,
          localValue: localData[field],
          serverValue: serverData[field],
          tableName: tableName,
        );
        
        fieldAnalysis[field] = analysis;
        
        if (analysis.hasConflict) {
          conflictingFields.add(field);
        }
      }
      
      if (conflictingFields.isEmpty) {
        return ConflictDetectionResult(
          hasConflict: false,
          conflictId: conflictId,
          conflictingFields: [],
          fieldAnalysis: fieldAnalysis,
          autoResolvable: true,
          resolutionConfidence: 1.0,
        );
      }
      
      // Determine conflict type and auto-resolution capability
      final conflictType = _determineConflictType(
        localData: localData,
        serverData: serverData,
        conflictingFields: conflictingFields,
        tableName: tableName,
      );
      
      final autoResolution = _calculateAutoResolutionCapability(
        tableName: tableName,
        conflictingFields: conflictingFields,
        fieldAnalysis: fieldAnalysis,
        conflictType: conflictType,
      );
      
      // Store conflict in database
      await _storeConflictRecord(
        conflictId: conflictId,
        tableName: tableName,
        recordId: recordId,
        localData: localData,
        serverData: serverData,
        conflictType: conflictType,
        conflictingFields: conflictingFields,
        fieldAnalysis: fieldAnalysis,
        autoResolvable: autoResolution.canAutoResolve,
        confidence: autoResolution.confidence,
        transactionId: transactionId,
      );
      
      return ConflictDetectionResult(
        hasConflict: true,
        conflictId: conflictId,
        conflictType: conflictType,
        conflictingFields: conflictingFields,
        fieldAnalysis: fieldAnalysis,
        autoResolvable: autoResolution.canAutoResolve,
        resolutionConfidence: autoResolution.confidence,
        recommendedStrategy: autoResolution.recommendedStrategy,
      );
      
    } catch (e) {
      _logger.e('Error detecting conflicts', error: e);
      rethrow;
    }
  }
  
  /// Automatically resolve conflicts where possible
  Future<ConflictResolutionResult> autoResolveConflict({
    required String conflictId,
    String? userId,
  }) async {
    try {
      await _ensureInitialized();
      // Retrieve conflict from database
      final db = await _databaseService!.database;
      final conflictRows = await db.query(
        'sync_conflicts_enhanced',
        where: 'conflict_id = ?',
        whereArgs: [conflictId],
      );
      
      if (conflictRows.isEmpty) {
        throw Exception('Conflict not found: $conflictId');
      }
      
      final conflictData = conflictRows.first;
      final localData = jsonDecode(conflictData['local_data'] as String) as Map<String, dynamic>;
      final serverData = jsonDecode(conflictData['server_data'] as String) as Map<String, dynamic>;
      final conflictingFields = jsonDecode(conflictData['conflicting_fields'] as String) as List<dynamic>;
      
      if (conflictData['auto_resolvable'] != 1) {
        return ConflictResolutionResult(
          success: false,
          conflictId: conflictId,
          errorMessage: 'Conflict is not auto-resolvable',
          resolutionStrategy: 'MANUAL_REQUIRED',
        );
      }
      
      // Apply field-level resolution strategies
      final resolvedData = <String, dynamic>{};
      final resolutionDetails = <String, String>{};
      
      // Start with local data as base
      resolvedData.addAll(localData);
      
      for (final field in conflictingFields) {
        final fieldStr = field.toString();
        final resolution = _resolveFieldConflict(
          field: fieldStr,
          localValue: localData[fieldStr],
          serverValue: serverData[fieldStr],
          tableName: conflictData['table_name'] as String,
        );
        
        resolvedData[fieldStr] = resolution.resolvedValue;
        resolutionDetails[fieldStr] = resolution.strategy;
      }
      
      // Special handling for cross-device QR operations
      if (conflictData['table_name'] == 'gate_guest_logs') {
        final qrResolution = _resolveQRConflict(localData, serverData);
        if (qrResolution != null) {
          resolvedData.addAll(qrResolution);
          resolutionDetails['qr_specific'] = 'CROSS_DEVICE_MERGE';
        }
      }
      
      // Update conflict record with resolution
      await db.update(
        'sync_conflicts_enhanced',
        {
          'status': 'AUTO_RESOLVED',
          'resolution_strategy': 'FIELD_LEVEL_MERGE',
          'resolution_data': jsonEncode(resolvedData),
          'field_resolutions': jsonEncode(resolutionDetails),
          'resolved_at': DateTime.now().millisecondsSinceEpoch,
          'resolved_by': userId ?? 'SYSTEM_AUTO_RESOLVE',
          'resolution_source': 'AUTO',
          'resolution_applied': 1,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'conflict_id = ?',
        whereArgs: [conflictId],
      );
      
      _logger.i('Auto-resolved conflict: $conflictId');
      
      return ConflictResolutionResult(
        success: true,
        conflictId: conflictId,
        resolvedData: resolvedData,
        resolutionStrategy: 'FIELD_LEVEL_MERGE',
        resolutionDetails: resolutionDetails,
      );
      
    } catch (e) {
      _logger.e('Error auto-resolving conflict', error: e);
      return ConflictResolutionResult(
        success: false,
        conflictId: conflictId,
        errorMessage: e.toString(),
        resolutionStrategy: 'ERROR',
      );
    }
  }
  
  /// Manually resolve conflicts with user input
  Future<ConflictResolutionResult> manualResolveConflict({
    required String conflictId,
    required String resolutionStrategy, // 'CLIENT_WINS', 'SERVER_WINS', 'MERGE', 'CUSTOM'
    Map<String, dynamic>? customResolutionData,
    Map<String, String>? fieldLevelChoices, // field -> 'LOCAL' or 'SERVER' or 'CUSTOM'
    String? userId,
    String? resolutionNotes,
  }) async {
    try {
      await _ensureInitialized();
      // Retrieve conflict from database
      final db = await _databaseService!.database;
      final conflictRows = await db.query(
        'sync_conflicts_enhanced',
        where: 'conflict_id = ?',
        whereArgs: [conflictId],
      );
      
      if (conflictRows.isEmpty) {
        throw Exception('Conflict not found: $conflictId');
      }
      
      final conflictData = conflictRows.first;
      final localData = jsonDecode(conflictData['local_data'] as String) as Map<String, dynamic>;
      final serverData = jsonDecode(conflictData['server_data'] as String) as Map<String, dynamic>;
      
      Map<String, dynamic> resolvedData;
      Map<String, String> resolutionDetails = {};
      
      switch (resolutionStrategy) {
        case 'CLIENT_WINS':
          resolvedData = Map<String, dynamic>.from(localData);
          resolutionDetails['strategy'] = 'CLIENT_WINS';
          break;
          
        case 'SERVER_WINS':
          resolvedData = Map<String, dynamic>.from(serverData);
          resolutionDetails['strategy'] = 'SERVER_WINS';
          break;
          
        case 'MERGE':
          resolvedData = _mergeData(localData, serverData);
          resolutionDetails['strategy'] = 'MERGE';
          break;
          
        case 'CUSTOM':
          if (customResolutionData == null) {
            throw Exception('Custom resolution data required for CUSTOM strategy');
          }
          resolvedData = Map<String, dynamic>.from(customResolutionData);
          resolutionDetails['strategy'] = 'CUSTOM';
          break;
          
        default:
          throw Exception('Unknown resolution strategy: $resolutionStrategy');
      }
      
      // Apply field-level choices if provided
      if (fieldLevelChoices != null) {
        for (final entry in fieldLevelChoices.entries) {
          final field = entry.key;
          final choice = entry.value;
          
          switch (choice) {
            case 'LOCAL':
              if (localData.containsKey(field)) {
                resolvedData[field] = localData[field];
                resolutionDetails[field] = 'LOCAL_CHOSEN';
              }
              break;
            case 'SERVER':
              if (serverData.containsKey(field)) {
                resolvedData[field] = serverData[field];
                resolutionDetails[field] = 'SERVER_CHOSEN';
              }
              break;
            case 'CUSTOM':
              // Custom value should already be in customResolutionData
              resolutionDetails[field] = 'CUSTOM_VALUE';
              break;
          }
        }
      }
      
      // Update conflict record with manual resolution
      await db.update(
        'sync_conflicts_enhanced',
        {
          'status': 'MANUALLY_RESOLVED',
          'resolution_strategy': resolutionStrategy,
          'resolution_data': jsonEncode(resolvedData),
          'field_resolutions': jsonEncode(resolutionDetails),
          'resolved_at': DateTime.now().millisecondsSinceEpoch,
          'resolved_by': userId ?? 'MANUAL_USER',
          'resolution_source': 'MANUAL',
          'resolution_applied': 1,
          'resolution_notes': resolutionNotes,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'conflict_id = ?',
        whereArgs: [conflictId],
      );
      
      _logger.i('Manually resolved conflict: $conflictId with strategy: $resolutionStrategy');
      
      return ConflictResolutionResult(
        success: true,
        conflictId: conflictId,
        resolvedData: resolvedData,
        resolutionStrategy: resolutionStrategy,
        resolutionDetails: resolutionDetails,
      );
      
    } catch (e) {
      _logger.e('Error manually resolving conflict', error: e);
      return ConflictResolutionResult(
        success: false,
        conflictId: conflictId,
        errorMessage: e.toString(),
        resolutionStrategy: 'ERROR',
      );
    }
  }
  
  /// Get all pending conflicts that require resolution
  Future<List<ConflictSummary>> getPendingConflicts({
    String? userId,
    String? tableName,
    bool autoResolvableOnly = false,
  }) async {
    try {
      await _ensureInitialized();
      final db = await _databaseService!.database;
      
      String whereClause = "status = 'PENDING'";
      List<dynamic> whereArgs = [];
      
      if (userId != null) {
        whereClause += " AND user_id = ?";
        whereArgs.add(userId);
      }
      
      if (tableName != null) {
        whereClause += " AND table_name = ?";
        whereArgs.add(tableName);
      }
      
      if (autoResolvableOnly) {
        whereClause += " AND auto_resolvable = 1";
      }
      
      final conflicts = await db.query(
        'sync_conflicts_enhanced',
        where: whereClause,
        whereArgs: whereArgs,
        orderBy: 'severity DESC, detected_at ASC',
      );
      
      return conflicts.map((conflict) => ConflictSummary.fromMap(conflict)).toList();
      
    } catch (e) {
      _logger.e('Error getting pending conflicts', error: e);
      return [];
    }
  }
  
  /// Batch auto-resolve all eligible conflicts
  Future<BatchResolutionResult> batchAutoResolveConflicts({
    String? userId,
    String? tableName,
    int? maxConflicts,
  }) async {
    try {
      final pendingConflicts = await getPendingConflicts(
        userId: userId,
        tableName: tableName,
        autoResolvableOnly: true,
      );
      
      final conflictsToProcess = maxConflicts != null 
          ? pendingConflicts.take(maxConflicts).toList()
          : pendingConflicts;
      
      int successCount = 0;
      int failureCount = 0;
      final errors = <String>[];
      
      for (final conflict in conflictsToProcess) {
        try {
          final result = await autoResolveConflict(
            conflictId: conflict.conflictId,
            userId: userId,
          );
          
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            errors.add('${conflict.conflictId}: ${result.errorMessage}');
          }
        } catch (e) {
          failureCount++;
          errors.add('${conflict.conflictId}: $e');
        }
      }
      
      _logger.i('Batch auto-resolution completed: $successCount success, $failureCount failures');
      
      return BatchResolutionResult(
        totalProcessed: conflictsToProcess.length,
        successCount: successCount,
        failureCount: failureCount,
        errors: errors,
      );
      
    } catch (e) {
      _logger.e('Error in batch auto-resolve', error: e);
      return BatchResolutionResult(
        totalProcessed: 0,
        successCount: 0,
        failureCount: 1,
        errors: [e.toString()],
      );
    }
  }
  
  // Private helper methods
  
  FieldConflictAnalysis _analyzeFieldConflict({
    required String field,
    dynamic localValue,
    dynamic serverValue,
    required String tableName,
  }) {
    final hasConflict = !_areValuesEqual(localValue, serverValue);
    final priority = _fieldPriorities[field] ?? 50; // Default priority
    
    String recommendedStrategy;
    double confidence;
    
    if (!hasConflict) {
      recommendedStrategy = 'NO_CONFLICT';
      confidence = 1.0;
    } else if (localValue == null && serverValue != null) {
      recommendedStrategy = 'SERVER_WINS';
      confidence = 0.9;
    } else if (localValue != null && serverValue == null) {
      recommendedStrategy = 'CLIENT_WINS';
      confidence = 0.9;
    } else if (priority >= 80) {
      // High priority fields - be conservative
      recommendedStrategy = 'MANUAL';
      confidence = 0.3;
    } else if (field == 'updated_at' || field == 'synced_at') {
      recommendedStrategy = 'LATEST_TIMESTAMP';
      confidence = 0.8;
    } else if (field == 'notes' || field == 'metadata') {
      recommendedStrategy = 'MERGE';
      confidence = 0.7;
    } else {
      recommendedStrategy = 'SERVER_WINS'; // Default to server for unknown fields
      confidence = 0.6;
    }
    
    return FieldConflictAnalysis(
      field: field,
      hasConflict: hasConflict,
      localValue: localValue,
      serverValue: serverValue,
      priority: priority,
      recommendedStrategy: recommendedStrategy,
      confidence: confidence,
    );
  }
  
  String _determineConflictType({
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    required List<String> conflictingFields,
    required String tableName,
  }) {
    // Check for version mismatch
    if (conflictingFields.contains('version')) {
      return 'VERSION_MISMATCH';
    }
    
    // Check for cross-device specific conflicts (QR operations)
    if (tableName == 'gate_guest_logs' && 
        (conflictingFields.contains('qr_intent_type') || 
         conflictingFields.contains('status'))) {
      return 'CROSS_DEVICE_CONFLICT';
    }
    
    // Check for constraint violations
    if (conflictingFields.contains('id') || 
        conflictingFields.contains('user_id') ||
        conflictingFields.contains('created_by')) {
      return 'CONSTRAINT_VIOLATION';
    }
    
    // Check for delete conflicts
    if ((localData.containsKey('deleted_at') && localData['deleted_at'] != null) ||
        (serverData.containsKey('deleted_at') && serverData['deleted_at'] != null)) {
      return 'DELETE_CONFLICT';
    }
    
    return 'DATA_CONFLICT';
  }
  
  AutoResolutionCapability _calculateAutoResolutionCapability({
    required String tableName,
    required List<String> conflictingFields,
    required Map<String, FieldConflictAnalysis> fieldAnalysis,
    required String conflictType,
  }) {
    final threshold = _autoResolutionConfidenceThresholds[tableName] ?? 0.7;
    
    // Cannot auto-resolve certain conflict types
    if (conflictType == 'CONSTRAINT_VIOLATION' || conflictType == 'DELETE_CONFLICT') {
      return AutoResolutionCapability(
        canAutoResolve: false,
        confidence: 0.0,
        recommendedStrategy: 'MANUAL',
      );
    }
    
    // Calculate average confidence across all conflicting fields
    double totalConfidence = 0.0;
    for (final field in conflictingFields) {
      final analysis = fieldAnalysis[field];
      if (analysis != null) {
        totalConfidence += analysis.confidence;
      }
    }
    
    final averageConfidence = conflictingFields.isNotEmpty 
        ? totalConfidence / conflictingFields.length
        : 0.0;
    
    final canAutoResolve = averageConfidence >= threshold;
    
    String recommendedStrategy;
    if (!canAutoResolve) {
      recommendedStrategy = 'MANUAL';
    } else if (conflictType == 'VERSION_MISMATCH') {
      recommendedStrategy = 'SERVER_WINS';
    } else {
      recommendedStrategy = 'FIELD_LEVEL_MERGE';
    }
    
    return AutoResolutionCapability(
      canAutoResolve: canAutoResolve,
      confidence: averageConfidence,
      recommendedStrategy: recommendedStrategy,
    );
  }
  
  FieldResolution _resolveFieldConflict({
    required String field,
    dynamic localValue,
    dynamic serverValue,
    required String tableName,
  }) {
    // Timestamp fields - use latest
    if (field == 'updated_at' || field == 'synced_at' || field == 'last_activity_at') {
      final localTime = localValue is int ? localValue : 0;
      final serverTime = serverValue is int ? serverValue : 0;
      
      return FieldResolution(
        resolvedValue: localTime > serverTime ? localValue : serverValue,
        strategy: 'LATEST_TIMESTAMP',
      );
    }
    
    // Version fields - use higher version
    if (field == 'version') {
      final localVer = localValue is int ? localValue : 0;
      final serverVer = serverValue is int ? serverValue : 0;
      
      return FieldResolution(
        resolvedValue: localVer > serverVer ? localValue : serverValue,
        strategy: 'HIGHER_VERSION',
      );
    }
    
    // Notes and metadata - attempt merge
    if (field == 'notes' || field == 'metadata') {
      return FieldResolution(
        resolvedValue: _mergeTextFields(localValue, serverValue),
        strategy: 'TEXT_MERGE',
      );
    }
    
    // High priority fields - prefer local (user's device context)
    final priority = _fieldPriorities[field] ?? 50;
    if (priority >= 80) {
      return FieldResolution(
        resolvedValue: localValue,
        strategy: 'CLIENT_PRIORITY',
      );
    }
    
    // Default - prefer server for consistency
    return FieldResolution(
      resolvedValue: serverValue,
      strategy: 'SERVER_DEFAULT',
    );
  }
  
  Map<String, dynamic>? _resolveQRConflict(
    Map<String, dynamic> localData,
    Map<String, dynamic> serverData,
  ) {
    // Special logic for Intent-Based QR system
    final localStatus = localData['status'] as String?;
    final serverStatus = serverData['status'] as String?;
    final localIntent = localData['qr_intent_type'] as String?;
    final serverIntent = serverData['qr_intent_type'] as String?;
    
    if (localIntent != null && serverIntent != null) {
      // Cross-device QR operation detected
      final resolution = <String, dynamic>{};
      
      // Use the most recent status change
      final localUpdated = localData['updated_at'] as int? ?? 0;
      final serverUpdated = serverData['updated_at'] as int? ?? 0;
      
      if (localUpdated > serverUpdated) {
        resolution['status'] = localStatus;
        resolution['qr_intent_type'] = localIntent;
      } else {
        resolution['status'] = serverStatus;
        resolution['qr_intent_type'] = serverIntent;
      }
      
      // Merge entry and exit times
      resolution['entry_time'] = localData['entry_time'] ?? serverData['entry_time'];
      resolution['exit_time'] = localData['exit_time'] ?? serverData['exit_time'];
      
      return resolution;
    }
    
    return null;
  }
  
  Map<String, dynamic> _mergeData(
    Map<String, dynamic> localData,
    Map<String, dynamic> serverData,
  ) {
    final merged = Map<String, dynamic>.from(serverData);
    
    // Merge fields with intelligent strategies
    for (final entry in localData.entries) {
      final field = entry.key;
      final localValue = entry.value;
      final serverValue = serverData[field];
      
      if (!_areValuesEqual(localValue, serverValue)) {
        final resolution = _resolveFieldConflict(
          field: field,
          localValue: localValue,
          serverValue: serverValue,
          tableName: 'merge_operation',
        );
        merged[field] = resolution.resolvedValue;
      }
    }
    
    return merged;
  }
  
  String _mergeTextFields(dynamic localValue, dynamic serverValue) {
    if (localValue == null) return serverValue?.toString() ?? '';
    if (serverValue == null) return localValue.toString();
    
    final localText = localValue.toString();
    final serverText = serverValue.toString();
    
    if (localText == serverText) return localText;
    
    // Simple merge - combine both with separator
    return '$localText\n--- MERGED ---\n$serverText';
  }
  
  bool _areValuesEqual(dynamic value1, dynamic value2) {
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;
    
    // Handle different numeric types
    if (value1 is num && value2 is num) {
      return value1.compareTo(value2) == 0;
    }
    
    return value1 == value2;
  }
  
  Future<void> _storeConflictRecord({
    required String conflictId,
    required String tableName,
    required String recordId,
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    required String conflictType,
    required List<String> conflictingFields,
    required Map<String, FieldConflictAnalysis> fieldAnalysis,
    required bool autoResolvable,
    required double confidence,
    String? transactionId,
  }) async {
    await _ensureInitialized();
    final db = await _databaseService!.database;
    
    await db.insert('sync_conflicts_enhanced', {
      'conflict_id': conflictId,
      'transaction_id': transactionId ?? _uuid.v4(),
      'conflict_type': conflictType,
      'severity': _calculateSeverity(conflictType, conflictingFields.length),
      'table_name': tableName,
      'record_id': recordId,
      'local_data': jsonEncode(localData),
      'server_data': jsonEncode(serverData),
      'conflicting_fields': jsonEncode(conflictingFields),
      'field_resolutions': jsonEncode(_extractResolutionStrategies(fieldAnalysis)),
      'auto_resolvable': autoResolvable ? 1 : 0,
      'resolution_confidence': confidence,
      'user_id': localData['user_id'] ?? 'UNKNOWN',
      'device_id': 'CURRENT_DEVICE', // TODO: Get actual device ID
      'detected_at': DateTime.now().millisecondsSinceEpoch,
      'client_timestamp': DateTime.now().millisecondsSinceEpoch,
      'server_timestamp': DateTime.now().millisecondsSinceEpoch,
      'status': 'PENDING',
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
      'sync_status': 'PENDING',
      'version': 1,
    });
  }
  
  String _calculateSeverity(String conflictType, int fieldCount) {
    if (conflictType == 'CONSTRAINT_VIOLATION' || conflictType == 'DELETE_CONFLICT') {
      return 'CRITICAL';
    } else if (conflictType == 'CROSS_DEVICE_CONFLICT') {
      return 'HIGH';
    } else if (fieldCount > 5) {
      return 'HIGH';
    } else if (fieldCount > 2) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
  
  Map<String, String> _extractResolutionStrategies(
    Map<String, FieldConflictAnalysis> fieldAnalysis,
  ) {
    final strategies = <String, String>{};
    for (final entry in fieldAnalysis.entries) {
      strategies[entry.key] = entry.value.recommendedStrategy;
    }
    return strategies;
  }
  
  /// Gate Check specific conflict resolution methods
  
  /// Resolve guest log conflicts with Intent-Based QR logic
  Future<ConflictResolutionResult> resolveGuestLogConflict({
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    String? userId,
  }) async {
    try {
      final conflictId = _uuid.v4();
      
      // Detect conflicts specifically for guest logs
      final detectionResult = await detectConflicts(
        tableName: 'gate_guest_logs',
        recordId: localData['guest_id'] ?? serverData['guest_id'] ?? conflictId,
        localData: localData,
        serverData: serverData,
      );
      
      if (!detectionResult.hasConflict) {
        return ConflictResolutionResult(
          success: true,
          conflictId: conflictId,
          resolvedData: localData,
          resolutionStrategy: 'NO_CONFLICT',
        );
      }
      
      // Apply Intent-Based QR specific resolution logic
      final resolvedData = _resolveGuestLogData(localData, serverData);
      
      // Store resolution
      final db = await _databaseService!.database;
      await db.update(
        'sync_conflicts_enhanced',
        {
          'status': 'AUTO_RESOLVED_QR',
          'resolution_strategy': 'INTENT_BASED_MERGE',
          'resolution_data': jsonEncode(resolvedData),
          'resolved_at': DateTime.now().millisecondsSinceEpoch,
          'resolved_by': userId ?? 'SYSTEM_QR_RESOLVER',
          'resolution_source': 'GATE_CHECK_AUTO',
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'conflict_id = ?',
        whereArgs: [detectionResult.conflictId],
      );
      
      _logger.i('Resolved guest log conflict with Intent-Based QR logic: ${detectionResult.conflictId}');
      
      return ConflictResolutionResult(
        success: true,
        conflictId: detectionResult.conflictId,
        resolvedData: resolvedData,
        resolutionStrategy: 'INTENT_BASED_MERGE',
        resolutionDetails: {'qr_specific': 'Intent-Based resolution applied'},
      );
      
    } catch (e) {
      _logger.e('Error resolving guest log conflict', error: e);
      return ConflictResolutionResult(
        success: false,
        conflictId: 'error',
        errorMessage: e.toString(),
        resolutionStrategy: 'ERROR',
      );
    }
  }
  
  /// Resolve QR token conflicts for cross-device operations
  Future<ConflictResolutionResult> resolveQRTokenConflict({
    required Map<String, dynamic> localTokenData,
    required Map<String, dynamic> serverTokenData,
    String? userId,
  }) async {
    try {
      final conflictId = _uuid.v4();
      
      // QR tokens are single-use, so resolve based on validation status
      final localUsed = localTokenData['status'] == 'used' || localTokenData['used_at'] != null;
      final serverUsed = serverTokenData['status'] == 'used' || serverTokenData['used_at'] != null;
      
      Map<String, dynamic> resolvedData;
      String strategy;
      
      if (localUsed && serverUsed) {
        // Both show as used - use the one with earlier used_at timestamp (first validator wins)
        final localUsedAt = localTokenData['used_at'] as int? ?? 0x7FFFFFFF;
        final serverUsedAt = serverTokenData['used_at'] as int? ?? 0x7FFFFFFF;
        
        if (localUsedAt < serverUsedAt) {
          resolvedData = Map<String, dynamic>.from(localTokenData);
          strategy = 'FIRST_VALIDATOR_WINS_LOCAL';
        } else {
          resolvedData = Map<String, dynamic>.from(serverTokenData);
          strategy = 'FIRST_VALIDATOR_WINS_SERVER';
        }
      } else if (localUsed) {
        resolvedData = Map<String, dynamic>.from(localTokenData);
        strategy = 'LOCAL_VALIDATION_WINS';
      } else if (serverUsed) {
        resolvedData = Map<String, dynamic>.from(serverTokenData);
        strategy = 'SERVER_VALIDATION_WINS';
      } else {
        // Neither used - merge data preserving generation information
        resolvedData = _mergeQRTokenData(localTokenData, serverTokenData);
        strategy = 'TOKEN_DATA_MERGE';
      }
      
      _logger.i('Resolved QR token conflict with strategy: $strategy');
      
      return ConflictResolutionResult(
        success: true,
        conflictId: conflictId,
        resolvedData: resolvedData,
        resolutionStrategy: strategy,
        resolutionDetails: {'qr_token_conflict': 'Cross-device QR resolution applied'},
      );
      
    } catch (e) {
      _logger.e('Error resolving QR token conflict', error: e);
      return ConflictResolutionResult(
        success: false,
        conflictId: 'error',
        errorMessage: e.toString(),
        resolutionStrategy: 'ERROR',
      );
    }
  }
  
  /// Process server guest log data and detect/resolve conflicts
  Future<void> processServerGuestLog(Map<String, dynamic> serverGuestLog) async {
    try {
      final guestLogId = serverGuestLog['id'] ?? serverGuestLog['guest_id'];
      if (guestLogId == null) return;
      
      // Check if we have local data for this guest log
      final db = await _databaseService!.database;
      final localRecords = await db.query(
        'gate_guest_logs',
        where: 'guest_id = ? OR server_record_id = ?',
        whereArgs: [guestLogId, guestLogId],
      );
      
      if (localRecords.isEmpty) {
        // No local record - just insert server data
        await _insertServerGuestLog(serverGuestLog);
        return;
      }
      
      final localRecord = localRecords.first;
      
      // Detect and resolve conflicts
      final conflictResult = await resolveGuestLogConflict(
        localData: localRecord,
        serverData: serverGuestLog,
        userId: 'SERVER_SYNC_PROCESSOR',
      );
      
      if (conflictResult.success && conflictResult.resolvedData != null) {
        // Update local record with resolved data
        await db.update(
          'gate_guest_logs',
          {
            ...conflictResult.resolvedData!,
            'sync_status': 'SYNCED',
            'server_record_id': guestLogId,
            'last_conflict_resolved_at': DateTime.now().millisecondsSinceEpoch,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          },
          where: 'guest_id = ?',
          whereArgs: [localRecord['guest_id']],
        );
        
        _logger.d('Processed server guest log with conflict resolution: $guestLogId');
      }
      
    } catch (e) {
      _logger.e('Error processing server guest log', error: e);
    }
  }
  
  /// Insert server guest log data
  Future<void> _insertServerGuestLog(Map<String, dynamic> serverGuestLog) async {
    try {
      await _ensureInitialized();
      final db = await _databaseService!.database;
      
      // Transform server data to local schema
      final localData = {
        'guest_id': serverGuestLog['id'] ?? _uuid.v4(),
        'driver_name': serverGuestLog['driverName'] ?? serverGuestLog['driver_name'] ?? serverGuestLog['guestName'],
        'destination': serverGuestLog['destination'] ?? serverGuestLog['purpose'] ?? '',
        'vehicle_plate': serverGuestLog['vehiclePlate'] ?? serverGuestLog['vehicle_plate'],
        'entry_time': serverGuestLog['entryAt'] != null 
          ? DateTime.parse(serverGuestLog['entryAt']).millisecondsSinceEpoch
          : DateTime.now().millisecondsSinceEpoch,
        'exit_time': serverGuestLog['exitAt'] != null 
          ? DateTime.parse(serverGuestLog['exitAt']).millisecondsSinceEpoch
          : null,
        'status': _mapServerStatusToLocal(serverGuestLog['status']),
        'gate_position': 'SERVER_SYNC',
        'created_by': 'SERVER_SYNC',
        'qr_code_data': serverGuestLog['qrToken'],
        'notes': serverGuestLog['notes'],
        'sync_status': 'SYNCED',
        'server_record_id': serverGuestLog['id'],
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      };
      
      await db.insert('gate_guest_logs', localData);
      _logger.d('Inserted server guest log: ${serverGuestLog['id']}');
      
    } catch (e) {
      _logger.e('Error inserting server guest log', error: e);
    }
  }
  
  /// Resolve guest log data using Intent-Based QR logic
  Map<String, dynamic> _resolveGuestLogData(
    Map<String, dynamic> localData,
    Map<String, dynamic> serverData,
  ) {
    final resolved = Map<String, dynamic>.from(localData);
    
    // Merge core guest information (prefer server for consistency)
    resolved['driver_name'] = serverData['driver_name'] ?? localData['driver_name'];
    resolved['vehicle_plate'] = serverData['vehicle_plate'] ?? localData['vehicle_plate'];
    
    // Handle entry and exit times (Intent-Based QR logic)
    final localEntryTime = localData['entry_time'] as int?;
    final serverEntryTime = serverData['entry_time'] as int?;
    final localExitTime = localData['exit_time'] as int?;
    final serverExitTime = serverData['exit_time'] as int?;
    
    // Use earliest entry time (when guest first entered)
    if (localEntryTime != null && serverEntryTime != null) {
      resolved['entry_time'] = localEntryTime < serverEntryTime ? localEntryTime : serverEntryTime;
    } else {
      resolved['entry_time'] = localEntryTime ?? serverEntryTime;
    }
    
    // Use latest exit time (when guest actually exited)
    if (localExitTime != null && serverExitTime != null) {
      resolved['exit_time'] = localExitTime > serverExitTime ? localExitTime : serverExitTime;
    } else {
      resolved['exit_time'] = localExitTime ?? serverExitTime;
    }
    
    // generation_intent is the source of truth, no need to set status
    
    // Merge QR token data (prefer the one with actual token)
    resolved['qr_code_data'] = serverData['qr_code_data'] ?? localData['qr_code_data'];
    
    // Merge notes
    final localNotes = localData['notes'] as String?;
    final serverNotes = serverData['notes'] as String?;
    if (localNotes != null && serverNotes != null && localNotes != serverNotes) {
      resolved['notes'] = '$localNotes\n[SERVER]: $serverNotes';
    } else {
      resolved['notes'] = localNotes ?? serverNotes;
    }
    
    // Keep sync metadata
    resolved['sync_status'] = 'SYNCED';
    resolved['server_record_id'] = serverData['id'] ?? serverData['server_record_id'];
    resolved['last_conflict_resolved_at'] = DateTime.now().millisecondsSinceEpoch;
    resolved['updated_at'] = DateTime.now().millisecondsSinceEpoch;
    
    return resolved;
  }
  
  /// Merge QR token data for cross-device conflicts
  Map<String, dynamic> _mergeQRTokenData(
    Map<String, dynamic> localData,
    Map<String, dynamic> serverData,
  ) {
    final merged = Map<String, dynamic>.from(serverData);
    
    // Preserve generation metadata from original generator
    final localGenerated = localData['generated_at'] as int? ?? 0;
    final serverGenerated = serverData['generated_at'] as int? ?? 0;
    
    if (localGenerated < serverGenerated) {
      // Local was generated first - preserve its generation data
      merged['generated_at'] = localData['generated_at'];
      merged['generated_by'] = localData['generated_by'];
      merged['device_id'] = localData['device_id'];
      merged['device_fingerprint'] = localData['device_fingerprint'];
    }
    
    // Always use latest status update
    final localUpdated = localData['updated_at'] as int? ?? 0;
    final serverUpdated = serverData['updated_at'] as int? ?? 0;
    
    if (localUpdated > serverUpdated) {
      merged['status'] = localData['status'];
      merged['used_at'] = localData['used_at'];
      merged['used_by'] = localData['used_by'];
      merged['scanner_device_id'] = localData['scanner_device_id'];
    }
    
    merged['updated_at'] = DateTime.now().millisecondsSinceEpoch;
    return merged;
  }
  
  /// Map server status to local status format
  String _mapServerStatusToLocal(String? serverStatus) {
    switch (serverStatus?.toUpperCase()) {
      case 'ENTERED':
      case 'INSIDE':
        return 'ENTRY';
      case 'EXITED':
      case 'EXIT':
        return 'EXIT';
      case 'CANCELLED':
      case 'INVALID':
        return 'CANCELLED';
      default:
        return 'ENTRY';
    }
  }
  
  /// Get pending conflicts specifically for gate check operations
  Future<List<ConflictSummary>> getGateCheckConflicts({String? userId}) async {
    return getPendingConflicts(
      userId: userId,
      tableName: 'gate_guest_logs',
    );
  }
  
  /// Get pending conflicts for QR token operations
  Future<List<ConflictSummary>> getQRTokenConflicts({String? userId}) async {
    return getPendingConflicts(
      userId: userId,
      tableName: 'qr_tokens',
    );
  }
}
