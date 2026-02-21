part of 'mandor_dashboard_bloc.dart';

/// Base state for Mandor Dashboard
abstract class MandorDashboardState extends Equatable {
  const MandorDashboardState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class MandorDashboardInitial extends MandorDashboardState {
  const MandorDashboardInitial();
}

/// Loading state
class MandorDashboardLoading extends MandorDashboardState {
  const MandorDashboardLoading();
}

/// Loaded state with dashboard data
class MandorDashboardLoaded extends MandorDashboardState {
  final double totalHarvestJanjang;
  final int pendingCount;
  final int activeEmployees;
  final int workedBlocks;
  final List<ActivityData> recentActivity;
  final List<PendingItemData> pendingItems;
  final DateTime lastUpdated;
  final bool isRefreshing;

  const MandorDashboardLoaded({
    required this.totalHarvestJanjang,
    required this.pendingCount,
    required this.activeEmployees,
    required this.workedBlocks,
    required this.recentActivity,
    required this.pendingItems,
    required this.lastUpdated,
    this.isRefreshing = false,
  });

  MandorDashboardLoaded copyWith({
    double? totalHarvestJanjang,
    int? pendingCount,
    int? activeEmployees,
    int? workedBlocks,
    List<ActivityData>? recentActivity,
    List<PendingItemData>? pendingItems,
    DateTime? lastUpdated,
    bool? isRefreshing,
  }) {
    return MandorDashboardLoaded(
      totalHarvestJanjang: totalHarvestJanjang ?? this.totalHarvestJanjang,
      pendingCount: pendingCount ?? this.pendingCount,
      activeEmployees: activeEmployees ?? this.activeEmployees,
      workedBlocks: workedBlocks ?? this.workedBlocks,
      recentActivity: recentActivity ?? this.recentActivity,
      pendingItems: pendingItems ?? this.pendingItems,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  /// Formatted harvest value for display
  String get harvestDisplayValue {
    return '${totalHarvestJanjang.toStringAsFixed(0)} jjg';
  }

  @override
  List<Object?> get props => [
        totalHarvestJanjang,
        pendingCount,
        activeEmployees,
        workedBlocks,
        recentActivity,
        pendingItems,
        lastUpdated,
        isRefreshing,
      ];
}

/// Error state
class MandorDashboardError extends MandorDashboardState {
  final String message;

  const MandorDashboardError({required this.message});

  @override
  List<Object?> get props => [message];
}

// Data classes for state

/// Activity data type
enum ActivityDataType {
  harvest,
  approval,
  sync,
  employee,
  block,
}

/// Activity data for recent activity list
class ActivityData extends Equatable {
  final String id;
  final String title;
  final String subtitle;
  final String time;
  final ActivityDataType type;
  final bool isSuccess;

  const ActivityData({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.type,
    this.isSuccess = true,
  });

  @override
  List<Object?> get props => [id, title, subtitle, time, type, isSuccess];
}

/// Pending item data for pending list
class PendingItemData extends Equatable {
  final String id;
  final String title;
  final String subtitle;
  final String time;

  const PendingItemData({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.time,
  });

  @override
  List<Object?> get props => [id, title, subtitle, time];
}
