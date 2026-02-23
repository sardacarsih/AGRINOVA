import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../data/models/area_manager_dashboard_models.dart';
import '../../data/repositories/area_manager_dashboard_repository.dart';

part 'area_manager_dashboard_event.dart';
part 'area_manager_dashboard_state.dart';

enum AreaManagerDashboardPeriod {
  today,
  last7Days,
  monthToDate,
  custom,
}

/// BLoC for Area Manager Dashboard data management.
///
/// Fetches real data from the GraphQL API via [AreaManagerDashboardRepository].
/// Handles loading, refreshing, and error states.
class AreaManagerDashboardBloc
    extends Bloc<AreaManagerDashboardEvent, AreaManagerDashboardState> {
  final AreaManagerDashboardRepository repository;
  static final Logger _logger = Logger();
  AreaManagerDashboardPeriod _currentPeriod = AreaManagerDashboardPeriod.monthToDate;
  DateTime _currentDateFrom = _startOfMonth(DateTime.now());
  DateTime _currentDateTo = _endOfDay(DateTime.now());

  AreaManagerDashboardBloc({required this.repository})
      : super(const AreaManagerDashboardInitial()) {
    on<AreaManagerDashboardLoadRequested>(_onLoadRequested);
    on<AreaManagerDashboardRefreshRequested>(_onRefreshRequested);
    on<AreaManagerDashboardFilterChanged>(_onFilterChanged);
  }

  Future<void> _onLoadRequested(
    AreaManagerDashboardLoadRequested event,
    Emitter<AreaManagerDashboardState> emit,
  ) async {
    emit(const AreaManagerDashboardLoading());
    await _loadAll(emit);
  }

  Future<void> _onRefreshRequested(
    AreaManagerDashboardRefreshRequested event,
    Emitter<AreaManagerDashboardState> emit,
  ) async {
    // Keep current data visible while refreshing
    if (state is AreaManagerDashboardLoaded) {
      emit((state as AreaManagerDashboardLoaded).copyWith(isRefreshing: true));
    }
    await _loadAll(emit);
  }

  Future<void> _onFilterChanged(
    AreaManagerDashboardFilterChanged event,
    Emitter<AreaManagerDashboardState> emit,
  ) async {
    _currentPeriod = event.period;
    _currentDateFrom = _startOfDay(event.dateFrom);
    _currentDateTo = _endOfDay(event.dateTo);

    if (state is AreaManagerDashboardLoaded) {
      emit((state as AreaManagerDashboardLoaded).copyWith(isRefreshing: true));
    } else {
      emit(const AreaManagerDashboardLoading());
    }
    await _loadAll(emit);
  }

  Future<void> _loadAll(Emitter<AreaManagerDashboardState> emit) async {
    try {
      // Parallel fetch: dashboard stats + manager list
      final results = await Future.wait([
        repository.getDashboard(
          dateFrom: _currentDateFrom,
          dateTo: _currentDateTo,
        ),
        repository.getManagersUnderArea(),
      ]);

      final dashboard = results[0] as AreaManagerDashboardModel;
      final managers = results[1] as List<ManagerUserModel>;

      _logger.i(
        'AreaManagerDashboardBloc: loaded '
        '${dashboard.companyPerformance.length} companies, '
        '${managers.length} managers '
        '(period: $_currentPeriod, '
        'dateFrom: ${_currentDateFrom.toIso8601String()}, '
        'dateTo: ${_currentDateTo.toIso8601String()})',
      );

      emit(AreaManagerDashboardLoaded(
        stats: dashboard.stats,
        companyPerformance: dashboard.companyPerformance,
        alerts: dashboard.alerts,
        managers: managers,
        selectedPeriod: _currentPeriod,
        dateFrom: _currentDateFrom,
        dateTo: _currentDateTo,
        lastUpdated: DateTime.now(),
      ));
    } catch (e) {
      _logger.e('AreaManagerDashboardBloc: load error: $e');
      emit(AreaManagerDashboardError(message: e.toString()));
    }
  }

  static DateTime _startOfMonth(DateTime value) {
    return DateTime(value.year, value.month, 1);
  }

  static DateTime _startOfDay(DateTime value) {
    return DateTime(value.year, value.month, value.day);
  }

  static DateTime _endOfDay(DateTime value) {
    return DateTime(value.year, value.month, value.day, 23, 59, 59, 999);
  }
}
