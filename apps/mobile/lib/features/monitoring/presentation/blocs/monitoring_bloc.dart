import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/utils/sync_error_message_helper.dart';

import '../../../approval/domain/entities/approval_item.dart';
import '../../data/repositories/monitoring_repository.dart';

abstract class MonitoringEvent extends Equatable {
  const MonitoringEvent();

  @override
  List<Object?> get props => [];
}

class MonitoringDataRequested extends MonitoringEvent {
  final String? estateId;
  final String period;
  final DateTime date;
  final bool showLoader;

  const MonitoringDataRequested({
    this.estateId,
    required this.period,
    required this.date,
    this.showLoader = true,
  });

  @override
  List<Object?> get props => [estateId, period, date, showLoader];
}

abstract class MonitoringState extends Equatable {
  const MonitoringState();

  @override
  List<Object?> get props => [];
}

class MonitoringInitial extends MonitoringState {
  const MonitoringInitial();
}

class MonitoringLoading extends MonitoringState {
  final bool showLoader;

  const MonitoringLoading({this.showLoader = true});

  @override
  List<Object?> get props => [showLoader];
}

class MonitoringLoaded extends MonitoringState {
  final String? estateId;
  final String period;
  final DateTime date;
  final MonitoringDashboardData data;

  const MonitoringLoaded({
    this.estateId,
    required this.period,
    required this.date,
    required this.data,
  });

  Map<String, dynamic> get stats => data.stats;
  List<Map<String, dynamic>> get chartData => data.chartData;
  List<Map<String, dynamic>> get recentActivities => data.recentActivities;
  Map<String, dynamic> get todayStats => data.todayStats;
  List<Map<String, dynamic>> get estateComparison => data.estateComparison;
  List<ApprovalItem> get pendingItems => data.pendingItems;
  List<ApprovalItem> get approvedItems => data.approvedItems;
  List<ApprovalItem> get rejectedItems => data.rejectedItems;
  AsistenMonitoringSnapshot? get asistenSnapshot =>
      data.asistenMonitoringSnapshot;
  MonitoringDateRange get dateRange => data.dateRange;

  @override
  List<Object?> get props => [estateId, period, date, data];
}

class MonitoringError extends MonitoringState {
  final String message;

  const MonitoringError({required this.message});

  @override
  List<Object?> get props => [message];
}

class MonitoringBloc extends Bloc<MonitoringEvent, MonitoringState> {
  final MonitoringRepository monitoringRepository;

  MonitoringBloc({
    required this.monitoringRepository,
  }) : super(const MonitoringInitial()) {
    on<MonitoringDataRequested>(_onDataRequested);
  }

  Future<void> _onDataRequested(
    MonitoringDataRequested event,
    Emitter<MonitoringState> emit,
  ) async {
    final hasLoadedState = state is MonitoringLoaded;
    if (event.showLoader || !hasLoadedState) {
      emit(MonitoringLoading(showLoader: event.showLoader));
    }

    try {
      final data = await monitoringRepository.getMonitoringData(
        estateId: event.estateId,
        period: event.period,
        date: event.date,
      );

      emit(
        MonitoringLoaded(
          estateId: event.estateId,
          period: event.period,
          date: event.date,
          data: data,
        ),
      );
    } catch (e) {
      emit(
        MonitoringError(
          message: SyncErrorMessageHelper.toUserMessage(
            e,
            action: 'memuat data monitoring',
          ),
        ),
      );
    }
  }
}
