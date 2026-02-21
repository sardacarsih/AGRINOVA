import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../data/models/area_manager_dashboard_models.dart';
import '../../data/repositories/area_manager_dashboard_repository.dart';

part 'area_manager_dashboard_event.dart';
part 'area_manager_dashboard_state.dart';

/// BLoC for Area Manager Dashboard data management.
///
/// Fetches real data from the GraphQL API via [AreaManagerDashboardRepository].
/// Handles loading, refreshing, and error states.
class AreaManagerDashboardBloc
    extends Bloc<AreaManagerDashboardEvent, AreaManagerDashboardState> {
  final AreaManagerDashboardRepository repository;
  static final Logger _logger = Logger();

  AreaManagerDashboardBloc({required this.repository})
      : super(const AreaManagerDashboardInitial()) {
    on<AreaManagerDashboardLoadRequested>(_onLoadRequested);
    on<AreaManagerDashboardRefreshRequested>(_onRefreshRequested);
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

  Future<void> _loadAll(Emitter<AreaManagerDashboardState> emit) async {
    try {
      // Parallel fetch: dashboard stats + manager list
      final results = await Future.wait([
        repository.getDashboard(),
        repository.getManagersUnderArea(),
      ]);

      final dashboard = results[0] as AreaManagerDashboardModel;
      final managers = results[1] as List<ManagerUserModel>;

      _logger.i(
        'AreaManagerDashboardBloc: loaded '
        '${dashboard.companyPerformance.length} companies, '
        '${managers.length} managers',
      );

      emit(AreaManagerDashboardLoaded(
        stats: dashboard.stats,
        companyPerformance: dashboard.companyPerformance,
        alerts: dashboard.alerts,
        managers: managers,
        lastUpdated: DateTime.now(),
      ));
    } catch (e) {
      _logger.e('AreaManagerDashboardBloc: load error: $e');
      emit(AreaManagerDashboardError(message: e.toString()));
    }
  }
}
