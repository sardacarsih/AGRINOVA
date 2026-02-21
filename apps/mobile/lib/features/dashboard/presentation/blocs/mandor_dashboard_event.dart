part of 'mandor_dashboard_bloc.dart';

/// Base event for Mandor Dashboard
abstract class MandorDashboardEvent extends Equatable {
  const MandorDashboardEvent();

  @override
  List<Object?> get props => [];
}

/// Load dashboard data event
class MandorDashboardLoadRequested extends MandorDashboardEvent {
  const MandorDashboardLoadRequested();
}

/// Refresh dashboard data event
class MandorDashboardRefreshRequested extends MandorDashboardEvent {
  const MandorDashboardRefreshRequested();
}
