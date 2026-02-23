part of 'area_manager_dashboard_bloc.dart';

/// Base state for Area Manager Dashboard
abstract class AreaManagerDashboardState extends Equatable {
  const AreaManagerDashboardState();

  @override
  List<Object?> get props => [];
}

/// Initial state before any data is loaded
class AreaManagerDashboardInitial extends AreaManagerDashboardState {
  const AreaManagerDashboardInitial();
}

/// Loading state (spinner visible, no data yet)
class AreaManagerDashboardLoading extends AreaManagerDashboardState {
  const AreaManagerDashboardLoading();
}

/// Loaded state containing real API data
class AreaManagerDashboardLoaded extends AreaManagerDashboardState {
  final AreaManagerStats stats;
  final List<CompanyPerformanceModel> companyPerformance;
  final List<RegionalAlertModel> alerts;
  final List<ManagerUserModel> managers;
  final AreaManagerDashboardPeriod selectedPeriod;
  final DateTime dateFrom;
  final DateTime dateTo;
  final DateTime lastUpdated;
  final bool isRefreshing;

  const AreaManagerDashboardLoaded({
    required this.stats,
    required this.companyPerformance,
    required this.alerts,
    required this.managers,
    required this.selectedPeriod,
    required this.dateFrom,
    required this.dateTo,
    required this.lastUpdated,
    this.isRefreshing = false,
  });

  AreaManagerDashboardLoaded copyWith({
    AreaManagerStats? stats,
    List<CompanyPerformanceModel>? companyPerformance,
    List<RegionalAlertModel>? alerts,
    List<ManagerUserModel>? managers,
    AreaManagerDashboardPeriod? selectedPeriod,
    DateTime? dateFrom,
    DateTime? dateTo,
    DateTime? lastUpdated,
    bool? isRefreshing,
  }) {
    return AreaManagerDashboardLoaded(
      stats: stats ?? this.stats,
      companyPerformance: companyPerformance ?? this.companyPerformance,
      alerts: alerts ?? this.alerts,
      managers: managers ?? this.managers,
      selectedPeriod: selectedPeriod ?? this.selectedPeriod,
      dateFrom: dateFrom ?? this.dateFrom,
      dateTo: dateTo ?? this.dateTo,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props => [
        stats,
        companyPerformance,
        alerts,
        managers,
        selectedPeriod,
        dateFrom,
        dateTo,
        lastUpdated,
        isRefreshing,
      ];
}

/// Error state when data fetch fails
class AreaManagerDashboardError extends AreaManagerDashboardState {
  final String message;

  const AreaManagerDashboardError({required this.message});

  @override
  List<Object?> get props => [message];
}
