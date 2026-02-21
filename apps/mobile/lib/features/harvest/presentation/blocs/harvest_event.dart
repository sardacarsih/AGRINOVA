part of 'harvest_bloc.dart';

abstract class HarvestEvent extends Equatable {
  const HarvestEvent();

  @override
  List<Object?> get props => [];
}

// Load Events
class HarvestLoadRequested extends HarvestEvent {
  final String? status;
  final String? mandorId;

  const HarvestLoadRequested({
    this.status,
    this.mandorId,
  });

  @override
  List<Object?> get props => [status, mandorId];
}

class HarvestRefresh extends HarvestEvent {
  final String? status;
  final String? mandorId;

  const HarvestRefresh({
    this.status,
    this.mandorId,
  });

  @override
  List<Object?> get props => [status, mandorId];
}

// CRUD Events
class HarvestCreateRequested extends HarvestEvent {
  final Harvest harvest;

  const HarvestCreateRequested(this.harvest);

  @override
  List<Object?> get props => [harvest];
}

class HarvestUpdateRequested extends HarvestEvent {
  final Harvest harvest;

  const HarvestUpdateRequested(this.harvest);

  @override
  List<Object?> get props => [harvest];
}

class HarvestDeleteRequested extends HarvestEvent {
  final String harvestId;

  const HarvestDeleteRequested(this.harvestId);

  @override
  List<Object?> get props => [harvestId];
}

// Photo and Location Events
class HarvestPhotoCaptureRequested extends HarvestEvent {
  final String harvestId;

  const HarvestPhotoCaptureRequested(this.harvestId);

  @override
  List<Object?> get props => [harvestId];
}

class HarvestLocationRequested extends HarvestEvent {
  const HarvestLocationRequested();
}

// Data Load Events
class HarvestEmployeesLoadRequested extends HarvestEvent {
  final String? divisionId;

  const HarvestEmployeesLoadRequested({this.divisionId});

  @override
  List<Object?> get props => [divisionId];
}

class HarvestBlocksLoadRequested extends HarvestEvent {
  final String? divisionId;

  const HarvestBlocksLoadRequested({this.divisionId});

  @override
  List<Object?> get props => [divisionId];
}

// Sync Events
class HarvestSyncRequested extends HarvestEvent {
  const HarvestSyncRequested();
}

// Stats Events
class HarvestStatsRequested extends HarvestEvent {
  final DateTime startDate;
  final DateTime endDate;

  const HarvestStatsRequested({
    required this.startDate,
    required this.endDate,
  });

  @override
  List<Object?> get props => [startDate, endDate];
}

class HarvestSummaryRequested extends HarvestEvent {
  final DateTime date;
  final String? blockId;

  const HarvestSummaryRequested({
    required this.date,
    this.blockId,
  });

  @override
  List<Object?> get props => [date, blockId];
}

// Error Handling Events
class HarvestClearError extends HarvestEvent {
  const HarvestClearError();
}

// Bulk Operations Events
class HarvestBulkCreateRequested extends HarvestEvent {
  final List<Harvest> harvests;

  const HarvestBulkCreateRequested(this.harvests);

  @override
  List<Object?> get props => [harvests];
}

class HarvestBulkUpdateRequested extends HarvestEvent {
  final List<Harvest> harvests;

  const HarvestBulkUpdateRequested(this.harvests);

  @override
  List<Object?> get props => [harvests];
}

class HarvestBulkDeleteRequested extends HarvestEvent {
  final List<String> harvestIds;

  const HarvestBulkDeleteRequested(this.harvestIds);

  @override
  List<Object?> get props => [harvestIds];
}

// Filter and Search Events
class HarvestFilterChanged extends HarvestEvent {
  final String? status;
  final String? employeeId;
  final String? blockId;
  final DateTime? startDate;
  final DateTime? endDate;

  const HarvestFilterChanged({
    this.status,
    this.employeeId,
    this.blockId,
    this.startDate,
    this.endDate,
  });

  @override
  List<Object?> get props => [
    status,
    employeeId,
    blockId,
    startDate,
    endDate,
  ];
}

class HarvestSearchRequested extends HarvestEvent {
  final String query;
  final String? mandorId;

  const HarvestSearchRequested({
    required this.query,
    this.mandorId,
  });

  @override
  List<Object?> get props => [query, mandorId];
}

// Pagination Events
class HarvestLoadMoreRequested extends HarvestEvent {
  final String? status;
  final String? mandorId;
  final int currentPage;

  const HarvestLoadMoreRequested({
    this.status,
    this.mandorId,
    required this.currentPage,
  });

  @override
  List<Object?> get props => [status, mandorId, currentPage];
}

// Validation Events
class HarvestValidateRequested extends HarvestEvent {
  final Harvest harvest;

  const HarvestValidateRequested(this.harvest);

  @override
  List<Object?> get props => [harvest];
}