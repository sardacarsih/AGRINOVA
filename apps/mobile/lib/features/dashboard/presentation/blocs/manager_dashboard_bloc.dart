import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/manager_dashboard_models.dart';
import '../../data/repositories/manager_dashboard_repository.dart';

part 'manager_dashboard_event.dart';
part 'manager_dashboard_state.dart';

class ManagerDashboardBloc
    extends Bloc<ManagerDashboardEvent, ManagerDashboardState> {
  final ManagerDashboardRepository repository;
  String _currentPeriod = 'WEEKLY';

  ManagerDashboardBloc({required this.repository})
      : super(const ManagerDashboardInitial()) {
    on<ManagerDashboardLoadRequested>(_onLoadRequested);
    on<ManagerDashboardRefreshRequested>(_onRefreshRequested);
    on<ManagerAnalyticsPeriodChanged>(_onPeriodChanged);
  }

  Future<void> _onLoadRequested(
    ManagerDashboardLoadRequested event,
    Emitter<ManagerDashboardState> emit,
  ) async {
    emit(const ManagerDashboardLoading());
    await _loadAll(emit);
  }

  Future<void> _onRefreshRequested(
    ManagerDashboardRefreshRequested event,
    Emitter<ManagerDashboardState> emit,
  ) async {
    if (state is ManagerDashboardLoaded) {
      emit((state as ManagerDashboardLoaded).copyWith(isRefreshing: true));
    } else {
      emit(const ManagerDashboardLoading());
    }
    await _loadAll(emit);
  }

  Future<void> _onPeriodChanged(
    ManagerAnalyticsPeriodChanged event,
    Emitter<ManagerDashboardState> emit,
  ) async {
    _currentPeriod = event.period;

    final currentState = state;
    if (currentState is! ManagerDashboardLoaded) {
      emit(const ManagerDashboardLoading());
      await _loadAll(emit);
      return;
    }

    emit(currentState.copyWith(isRefreshing: true));
    try {
      final analytics = await repository.getAnalytics(period: _currentPeriod);
      emit(currentState.copyWith(
        analytics: analytics,
        lastUpdated: DateTime.now(),
        isRefreshing: false,
      ));
    } catch (e) {
      emit(ManagerDashboardError(message: e.toString()));
    }
  }

  Future<void> _loadAll(Emitter<ManagerDashboardState> emit) async {
    try {
      final results = await Future.wait([
        repository.getDashboard(),
        repository.getAnalytics(period: _currentPeriod),
      ]);

      emit(ManagerDashboardLoaded(
        dashboard: results[0] as ManagerDashboardModel,
        analytics: results[1] as ManagerAnalyticsModel,
        lastUpdated: DateTime.now(),
      ));
    } catch (e) {
      emit(ManagerDashboardError(message: e.toString()));
    }
  }
}
