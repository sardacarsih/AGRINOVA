part of 'manager_dashboard_bloc.dart';

abstract class ManagerDashboardState extends Equatable {
  const ManagerDashboardState();

  @override
  List<Object?> get props => [];
}

class ManagerDashboardInitial extends ManagerDashboardState {
  const ManagerDashboardInitial();
}

class ManagerDashboardLoading extends ManagerDashboardState {
  const ManagerDashboardLoading();
}

class ManagerDashboardLoaded extends ManagerDashboardState {
  final ManagerDashboardModel dashboard;
  final ManagerAnalyticsModel analytics;
  final DateTime lastUpdated;
  final bool isRefreshing;

  const ManagerDashboardLoaded({
    required this.dashboard,
    required this.analytics,
    required this.lastUpdated,
    this.isRefreshing = false,
  });

  ManagerDashboardLoaded copyWith({
    ManagerDashboardModel? dashboard,
    ManagerAnalyticsModel? analytics,
    DateTime? lastUpdated,
    bool? isRefreshing,
  }) {
    return ManagerDashboardLoaded(
      dashboard: dashboard ?? this.dashboard,
      analytics: analytics ?? this.analytics,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props => [
        dashboard,
        analytics,
        lastUpdated,
        isRefreshing,
      ];
}

class ManagerDashboardError extends ManagerDashboardState {
  final String message;

  const ManagerDashboardError({required this.message});

  @override
  List<Object?> get props => [message];
}
