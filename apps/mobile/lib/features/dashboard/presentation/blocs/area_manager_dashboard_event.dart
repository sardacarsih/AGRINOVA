part of 'area_manager_dashboard_bloc.dart';

/// Base event for Area Manager Dashboard
abstract class AreaManagerDashboardEvent extends Equatable {
  const AreaManagerDashboardEvent();

  @override
  List<Object?> get props => [];
}

/// Load dashboard data (initial load)
class AreaManagerDashboardLoadRequested extends AreaManagerDashboardEvent {
  const AreaManagerDashboardLoadRequested();
}

/// Refresh all dashboard data (keeps current data visible while reloading)
class AreaManagerDashboardRefreshRequested extends AreaManagerDashboardEvent {
  const AreaManagerDashboardRefreshRequested();
}
