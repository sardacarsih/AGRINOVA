import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/approval_item.dart';
import '../../data/repositories/approval_repository.dart';
import '../../../../core/services/fcm_service.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/services/notification_storage_service.dart';

part 'approval_event.dart';
part 'approval_state.dart';

class ApprovalBloc extends Bloc<ApprovalEvent, ApprovalState> {
  final ApprovalRepository _approvalRepository;
  final NotificationStorageService _notificationStorage =
      ServiceLocator.get<NotificationStorageService>();

  StreamSubscription? _notificationSubscription;

  ApprovalBloc({required ApprovalRepository approvalRepository})
      : _approvalRepository = approvalRepository,
        super(ApprovalInitial()) {
    on<ApprovalLoadRequested>(_onLoadRequested);
    on<ApprovalRefreshRequested>(_onRefreshRequested);
    on<ApprovalApproveRequested>(_onApproveRequested);
    on<ApprovalRejectRequested>(_onRejectRequested);

    // Listen to harvest notifications for auto-refresh
    _notificationSubscription =
        FCMService.harvestNotificationStream.listen((event) {
      if (event.type == 'HARVEST_APPROVAL_NEEDED') {
        add(const ApprovalRefreshRequested());
      }
    });
  }

  @override
  Future<void> close() {
    _notificationSubscription?.cancel();
    return super.close();
  }

  Future<void> _onLoadRequested(
    ApprovalLoadRequested event,
    Emitter<ApprovalState> emit,
  ) async {
    emit(ApprovalLoading());
    try {
      final status = event.status == 'SEMUA' ? null : event.status;

      // Fetch data in parallel
      final results = await Future.wait([
        _approvalRepository.getPendingApprovals(
          status: status,
          divisionId: event.divisionId,
          search: event.search,
        ),
        _approvalRepository.getApprovalStats(),
      ]);

      final approvals = results[0] as List<ApprovalItem>;
      final stats = results[1] as ApprovalStats;

      emit(ApprovalLoaded(
        approvals: approvals,
        stats: stats,
        activeFilterStatus: event.status ?? 'PENDING',
      ));
    } catch (e) {
      emit(ApprovalError(message: e.toString()));
    }
  }

  Future<void> _onRefreshRequested(
    ApprovalRefreshRequested event,
    Emitter<ApprovalState> emit,
  ) async {
    // Determine current filter from state if possible, else default
    String? currentStatus = 'PENDING';
    if (state is ApprovalLoaded) {
      currentStatus = (state as ApprovalLoaded).activeFilterStatus;
    }

    add(ApprovalLoadRequested(status: currentStatus));
  }

  Future<void> _onApproveRequested(
    ApprovalApproveRequested event,
    Emitter<ApprovalState> emit,
  ) async {
    try {
      await _approvalRepository.approveHarvest(event.id, notes: event.notes);
      await _notificationStorage
          .markHarvestApprovalNotificationsAsRead(event.id);
      emit(const ApprovalActionSuccess(message: 'Data berhasil disetujui'));
      add(const ApprovalRefreshRequested());
    } catch (e) {
      emit(ApprovalActionFailure(message: e.toString()));
      // If failure, we might want to revert to Loaded?
      // But we lost the previous state data unless we stored it.
      // For now, the UI should handle not losing the view, or we reload.
      add(const ApprovalRefreshRequested());
    }
  }

  Future<void> _onRejectRequested(
    ApprovalRejectRequested event,
    Emitter<ApprovalState> emit,
  ) async {
    try {
      await _approvalRepository.rejectHarvest(event.id, event.reason);
      await _notificationStorage
          .markHarvestApprovalNotificationsAsRead(event.id);
      emit(const ApprovalActionSuccess(message: 'Data berhasil ditolak'));
      add(const ApprovalRefreshRequested());
    } catch (e) {
      emit(ApprovalActionFailure(message: e.toString()));
      add(const ApprovalRefreshRequested());
    }
  }
}
