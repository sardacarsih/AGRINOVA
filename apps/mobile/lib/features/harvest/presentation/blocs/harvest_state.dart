part of 'harvest_bloc.dart';

abstract class HarvestState extends Equatable {
  const HarvestState();

  @override
  List<Object?> get props => [];
}

// Initial State
class HarvestInitial extends HarvestState {
  const HarvestInitial();
}

// Loading States
class HarvestLoading extends HarvestState {
  const HarvestLoading();
}

class HarvestOperationLoading extends HarvestState {
  const HarvestOperationLoading();
}

// Success States
class HarvestLoaded extends HarvestState {
  final List<Harvest> harvests;
  final bool hasReachedMax;
  final int currentPage;
  final String? status;
  final String? mandorId;
  final bool isCreating;
  final bool isUpdating;
  final bool isDeleting;
  final bool isCapturingPhoto;
  final String? error;

  const HarvestLoaded({
    required this.harvests,
    required this.hasReachedMax,
    required this.currentPage,
    this.status,
    this.mandorId,
    this.isCreating = false,
    this.isUpdating = false,
    this.isDeleting = false,
    this.isCapturingPhoto = false,
    this.error,
  });

  HarvestLoaded copyWith({
    List<Harvest>? harvests,
    bool? hasReachedMax,
    int? currentPage,
    String? status,
    String? mandorId,
    bool? isCreating,
    bool? isUpdating,
    bool? isDeleting,
    bool? isCapturingPhoto,
    String? error,
  }) {
    return HarvestLoaded(
      harvests: harvests ?? this.harvests,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      currentPage: currentPage ?? this.currentPage,
      status: status ?? this.status,
      mandorId: mandorId ?? this.mandorId,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      isDeleting: isDeleting ?? this.isDeleting,
      isCapturingPhoto: isCapturingPhoto ?? this.isCapturingPhoto,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
        harvests,
        hasReachedMax,
        currentPage,
        status,
        mandorId,
        isCreating,
        isUpdating,
        isDeleting,
        isCapturingPhoto,
        error,
      ];
}

class HarvestOperationSuccess extends HarvestState {
  final String message;

  const HarvestOperationSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

// Data Specific States
class HarvestLocationLoaded extends HarvestState {
  final double? latitude;
  final double? longitude;
  final double? accuracy;

  const HarvestLocationLoaded({
    this.latitude,
    this.longitude,
    this.accuracy,
  });

  @override
  List<Object?> get props => [latitude, longitude, accuracy];
}

class HarvestEmployeesLoaded extends HarvestState {
  final List<Employee> employees;

  const HarvestEmployeesLoaded({required this.employees});

  @override
  List<Object?> get props => [employees];
}

class HarvestBlocksLoaded extends HarvestState {
  final List<Block> blocks;

  const HarvestBlocksLoaded({required this.blocks});

  @override
  List<Object?> get props => [blocks];
}

class HarvestStatsLoaded extends HarvestState {
  final Map<String, dynamic> stats;

  const HarvestStatsLoaded({required this.stats});

  @override
  List<Object?> get props => [stats];
}

class HarvestSummaryLoaded extends HarvestState {
  final List<Harvest> harvests;
  final Map<String, dynamic> stats;
  final DateTime selectedDate;
  final String? selectedBlockId;

  const HarvestSummaryLoaded({
    required this.harvests,
    required this.stats,
    required this.selectedDate,
    this.selectedBlockId,
  });

  @override
  List<Object?> get props => [harvests, stats, selectedDate, selectedBlockId];
}

// Sync States
class HarvestSyncInProgress extends HarvestState {
  final int unsyncedCount;
  final int processedCount;

  const HarvestSyncInProgress({
    required this.unsyncedCount,
    this.processedCount = 0,
  });

  @override
  List<Object?> get props => [unsyncedCount, processedCount];
}

class HarvestSyncCompleted extends HarvestState {
  final int syncedCount;
  final int failedCount;
  final String? error;

  const HarvestSyncCompleted({
    required this.syncedCount,
    this.failedCount = 0,
    this.error,
  });

  @override
  List<Object?> get props => [syncedCount, failedCount, error];
}

// Validation State
class HarvestValidationResult extends HarvestState {
  final List<String> errors;
  final bool isValid;

  const HarvestValidationResult({
    required this.errors,
    required this.isValid,
  });

  @override
  List<Object?> get props => [errors, isValid];
}

// Search State
class HarvestSearchResults extends HarvestState {
  final List<Harvest> results;
  final String query;
  final bool hasMore;

  const HarvestSearchResults({
    required this.results,
    required this.query,
    this.hasMore = false,
  });

  @override
  List<Object?> get props => [results, query, hasMore];
}

// Filter State
class HarvestFiltered extends HarvestState {
  final List<Harvest> filteredHarvests;
  final Map<String, dynamic> filters;

  const HarvestFiltered({
    required this.filteredHarvests,
    required this.filters,
  });

  @override
  List<Object?> get props => [filteredHarvests, filters];
}

// Bulk Operation State
class HarvestBulkOperationInProgress extends HarvestState {
  final int totalItems;
  final int processedItems;
  final String operation;

  const HarvestBulkOperationInProgress({
    required this.totalItems,
    required this.processedItems,
    required this.operation,
  });

  @override
  List<Object?> get props => [totalItems, processedItems, operation];
}

class HarvestBulkOperationCompleted extends HarvestState {
  final int successCount;
  final int failureCount;
  final String operation;
  final List<String> errors;

  const HarvestBulkOperationCompleted({
    required this.successCount,
    required this.failureCount,
    required this.operation,
    this.errors = const [],
  });

  @override
  List<Object?> get props => [successCount, failureCount, operation, errors];
}

// Error State
class HarvestError extends HarvestState {
  final String message;
  final String? errorCode;
  final dynamic originalError;

  const HarvestError({
    required this.message,
    this.errorCode,
    this.originalError,
  });

  @override
  List<Object?> get props => [message, errorCode, originalError];
}

// Specialized Error States
class HarvestLocationError extends HarvestState {
  final String message;
  final bool isPermissionDenied;

  const HarvestLocationError({
    required this.message,
    this.isPermissionDenied = false,
  });

  @override
  List<Object?> get props => [message, isPermissionDenied];
}

class HarvestCameraError extends HarvestState {
  final String message;
  final bool isPermissionDenied;

  const HarvestCameraError({
    required this.message,
    this.isPermissionDenied = false,
  });

  @override
  List<Object?> get props => [message, isPermissionDenied];
}

class HarvestNetworkError extends HarvestState {
  final String message;
  final bool isOffline;

  const HarvestNetworkError({
    required this.message,
    this.isOffline = false,
  });

  @override
  List<Object?> get props => [message, isOffline];
}

class HarvestValidationError extends HarvestState {
  final List<String> fieldErrors;
  final Map<String, String> errors;

  const HarvestValidationError({
    required this.fieldErrors,
    required this.errors,
  });

  @override
  List<Object?> get props => [fieldErrors, errors];
}