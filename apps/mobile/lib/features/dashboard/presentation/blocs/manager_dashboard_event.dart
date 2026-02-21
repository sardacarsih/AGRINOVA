part of 'manager_dashboard_bloc.dart';

abstract class ManagerDashboardEvent extends Equatable {
  const ManagerDashboardEvent();

  @override
  List<Object?> get props => [];
}

class ManagerDashboardLoadRequested extends ManagerDashboardEvent {
  const ManagerDashboardLoadRequested();
}

class ManagerDashboardRefreshRequested extends ManagerDashboardEvent {
  const ManagerDashboardRefreshRequested();
}

class ManagerAnalyticsPeriodChanged extends ManagerDashboardEvent {
  final String period;

  const ManagerAnalyticsPeriodChanged({required this.period});

  @override
  List<Object?> get props => [period];
}
