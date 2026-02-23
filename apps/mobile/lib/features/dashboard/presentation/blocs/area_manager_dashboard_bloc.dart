import 'dart:async';
import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/utils/sync_error_message_helper.dart';

import '../../data/models/area_manager_dashboard_models.dart';
import '../../data/repositories/area_manager_dashboard_repository.dart';

part 'area_manager_dashboard_event.dart';
part 'area_manager_dashboard_state.dart';

enum AreaManagerDashboardPeriod { today, last7Days, monthToDate, custom }

/// BLoC for Area Manager Dashboard data management.
///
/// Fetches real data from the GraphQL API via [AreaManagerDashboardRepository].
/// Handles loading, refreshing, and error states.
class AreaManagerDashboardBloc
    extends Bloc<AreaManagerDashboardEvent, AreaManagerDashboardState> {
  static const String _cacheKey = 'area_manager_dashboard_loaded_v1';

  final AreaManagerDashboardRepository repository;
  static final Logger _logger = Logger();
  AreaManagerDashboardPeriod _currentPeriod =
      AreaManagerDashboardPeriod.monthToDate;
  DateTime _currentDateFrom = _startOfMonth(DateTime.now());
  DateTime _currentDateTo = _endOfDay(DateTime.now());
  AreaManagerDashboardLoaded? _lastLoadedState;

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

      final loadedState = AreaManagerDashboardLoaded(
        stats: dashboard.stats,
        companyPerformance: dashboard.companyPerformance,
        alerts: dashboard.alerts,
        managers: managers,
        selectedPeriod: _currentPeriod,
        dateFrom: _currentDateFrom,
        dateTo: _currentDateTo,
        lastUpdated: DateTime.now(),
      );
      _lastLoadedState = loadedState;
      emit(loadedState);
      unawaited(_saveLoadedCache(loadedState));
    } catch (e) {
      _logger.e('AreaManagerDashboardBloc: load error: $e');
      final cachedState = _lastLoadedState ?? await _loadCachedState();
      if (cachedState != null) {
        _lastLoadedState = cachedState;
        _currentPeriod = cachedState.selectedPeriod;
        _currentDateFrom = cachedState.dateFrom;
        _currentDateTo = cachedState.dateTo;
        emit(cachedState.copyWith(isRefreshing: false));
        return;
      }

      emit(
        AreaManagerDashboardError(
          message: SyncErrorMessageHelper.toUserMessage(
            e,
            action: 'memuat data monitoring estate',
          ),
        ),
      );
    }
  }

  Future<void> _saveLoadedCache(AreaManagerDashboardLoaded state) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final payload = <String, dynamic>{
        'stats': _statsToJson(state.stats),
        'companyPerformance': state.companyPerformance
            .map(_companyToJson)
            .toList(),
        'alerts': state.alerts.map(_alertToJson).toList(),
        'managers': state.managers.map(_managerToJson).toList(),
        'selectedPeriod': state.selectedPeriod.name,
        'dateFrom': state.dateFrom.toIso8601String(),
        'dateTo': state.dateTo.toIso8601String(),
        'lastUpdated': state.lastUpdated.toIso8601String(),
      };
      await prefs.setString(_cacheKey, jsonEncode(payload));
    } catch (_) {
      // Ignore cache write failures.
    }
  }

  Future<AreaManagerDashboardLoaded?> _loadCachedState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null || raw.trim().isEmpty) {
        return null;
      }

      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final statsRaw = decoded['stats'];
      final companiesRaw = decoded['companyPerformance'];
      final alertsRaw = decoded['alerts'];
      final managersRaw = decoded['managers'];
      if (statsRaw is! Map<String, dynamic> ||
          companiesRaw is! List ||
          alertsRaw is! List ||
          managersRaw is! List) {
        return null;
      }

      final stats = AreaManagerStats.fromJson(statsRaw);
      final companies = companiesRaw
          .whereType<Map<String, dynamic>>()
          .map(CompanyPerformanceModel.fromJson)
          .toList(growable: false);
      final alerts = alertsRaw
          .whereType<Map<String, dynamic>>()
          .map(RegionalAlertModel.fromJson)
          .toList(growable: false);
      final managers = managersRaw
          .whereType<Map<String, dynamic>>()
          .map(ManagerUserModel.fromJson)
          .toList(growable: false);

      final period = _periodFromString(decoded['selectedPeriod']?.toString());
      final dateFrom = DateTime.tryParse(decoded['dateFrom']?.toString() ?? '');
      final dateTo = DateTime.tryParse(decoded['dateTo']?.toString() ?? '');
      final lastUpdated = DateTime.tryParse(
        decoded['lastUpdated']?.toString() ?? '',
      );

      if (dateFrom == null || dateTo == null || lastUpdated == null) {
        return null;
      }

      return AreaManagerDashboardLoaded(
        stats: stats,
        companyPerformance: companies,
        alerts: alerts,
        managers: managers,
        selectedPeriod: period,
        dateFrom: dateFrom,
        dateTo: dateTo,
        lastUpdated: lastUpdated,
      );
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _statsToJson(AreaManagerStats stats) {
    return {
      'totalCompanies': stats.totalCompanies,
      'totalEstates': stats.totalEstates,
      'totalDivisions': stats.totalDivisions,
      'totalEmployees': stats.totalEmployees,
      'todayProduction': stats.todayProduction,
      'monthlyProduction': stats.monthlyProduction,
      'monthlyTarget': stats.monthlyTarget,
      'targetAchievement': stats.targetAchievement,
      'avgEfficiency': stats.avgEfficiency,
      'topPerformingCompany': stats.topPerformingCompany,
    };
  }

  Map<String, dynamic> _companyToJson(CompanyPerformanceModel company) {
    return {
      'companyId': company.companyId,
      'companyName': company.companyName,
      'estatesCount': company.estatesCount,
      'todayProduction': company.todayProduction,
      'monthlyProduction': company.monthlyProduction,
      'targetAchievement': company.targetAchievement,
      'efficiencyScore': company.efficiencyScore,
      'qualityScore': company.qualityScore,
      'trend': company.trend,
      'status': company.status,
      'pendingIssues': company.pendingIssues,
    };
  }

  Map<String, dynamic> _alertToJson(RegionalAlertModel alert) {
    return {
      'id': alert.id,
      'type': alert.type,
      'severity': alert.severity,
      'title': alert.title,
      'message': alert.message,
      'companyId': alert.companyId,
      'companyName': alert.companyName,
      'createdAt': alert.createdAt.toIso8601String(),
      'isRead': alert.isRead,
    };
  }

  Map<String, dynamic> _managerToJson(ManagerUserModel manager) {
    return {
      'id': manager.id,
      'name': manager.name,
      'username': manager.username,
      'email': manager.email,
      'isActive': manager.isActive,
    };
  }

  AreaManagerDashboardPeriod _periodFromString(String? raw) {
    switch (raw) {
      case 'today':
        return AreaManagerDashboardPeriod.today;
      case 'last7Days':
        return AreaManagerDashboardPeriod.last7Days;
      case 'custom':
        return AreaManagerDashboardPeriod.custom;
      case 'monthToDate':
      default:
        return AreaManagerDashboardPeriod.monthToDate;
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
