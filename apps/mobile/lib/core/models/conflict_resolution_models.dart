import 'dart:convert';

/// Data models for conflict resolution service

class ConflictDetectionResult {
  final bool hasConflict;
  final String conflictId;
  final String? conflictType;
  final List<String> conflictingFields;
  final Map<String, FieldConflictAnalysis> fieldAnalysis;
  final bool autoResolvable;
  final double resolutionConfidence;
  final String? recommendedStrategy;
  
  ConflictDetectionResult({
    required this.hasConflict,
    required this.conflictId,
    this.conflictType,
    required this.conflictingFields,
    required this.fieldAnalysis,
    required this.autoResolvable,
    required this.resolutionConfidence,
    this.recommendedStrategy,
  });
}

class FieldConflictAnalysis {
  final String field;
  final bool hasConflict;
  final dynamic localValue;
  final dynamic serverValue;
  final int priority;
  final String recommendedStrategy;
  final double confidence;
  
  FieldConflictAnalysis({
    required this.field,
    required this.hasConflict,
    this.localValue,
    this.serverValue,
    required this.priority,
    required this.recommendedStrategy,
    required this.confidence,
  });
}

class AutoResolutionCapability {
  final bool canAutoResolve;
  final double confidence;
  final String recommendedStrategy;
  
  AutoResolutionCapability({
    required this.canAutoResolve,
    required this.confidence,
    required this.recommendedStrategy,
  });
}

class FieldResolution {
  final dynamic resolvedValue;
  final String strategy;
  
  FieldResolution({
    required this.resolvedValue,
    required this.strategy,
  });
}

class ConflictResolutionResult {
  final bool success;
  final String conflictId;
  final Map<String, dynamic>? resolvedData;
  final String resolutionStrategy;
  final Map<String, String>? resolutionDetails;
  final String? errorMessage;
  
  ConflictResolutionResult({
    required this.success,
    required this.conflictId,
    this.resolvedData,
    required this.resolutionStrategy,
    this.resolutionDetails,
    this.errorMessage,
  });
}

class ConflictSummary {
  final String conflictId;
  final String tableName;
  final String recordId;
  final String conflictType;
  final String severity;
  final List<String> conflictingFields;
  final bool autoResolvable;
  final double resolutionConfidence;
  final DateTime detectedAt;
  
  ConflictSummary({
    required this.conflictId,
    required this.tableName,
    required this.recordId,
    required this.conflictType,
    required this.severity,
    required this.conflictingFields,
    required this.autoResolvable,
    required this.resolutionConfidence,
    required this.detectedAt,
  });
  
  factory ConflictSummary.fromMap(Map<String, dynamic> map) {
    return ConflictSummary(
      conflictId: map['conflict_id'] as String,
      tableName: map['table_name'] as String,
      recordId: map['record_id'] as String,
      conflictType: map['conflict_type'] as String,
      severity: map['severity'] as String,
      conflictingFields: (jsonDecode(map['conflicting_fields'] as String) as List)
          .map((e) => e.toString()).toList(),
      autoResolvable: (map['auto_resolvable'] as int) == 1,
      resolutionConfidence: (map['resolution_confidence'] as num).toDouble(),
      detectedAt: DateTime.fromMillisecondsSinceEpoch(map['detected_at'] as int),
    );
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
  
  double get successRate => totalProcessed > 0 ? successCount / totalProcessed : 0.0;
}