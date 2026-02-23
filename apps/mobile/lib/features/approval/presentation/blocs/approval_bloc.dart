import 'dart:async';
import 'dart:convert';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/approval_item.dart';
import '../../data/repositories/approval_repository.dart';
import '../../../../core/services/fcm_service.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/services/notification_storage_service.dart';
import '../../../../core/utils/sync_error_message_helper.dart';

part 'approval_event.dart';
part 'approval_state.dart';

class ApprovalBloc extends Bloc<ApprovalEvent, ApprovalState> {
  static const String _cachePrefix = 'approval_loaded_cache_v1_';

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
    _notificationSubscription = FCMService.harvestNotificationStream.listen((
      event,
    ) {
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
          includeQuality: true,
        ),
        _approvalRepository.getApprovalStats(),
      ]);

      final approvals = results[0] as List<ApprovalItem>;
      final stats = results[1] as ApprovalStats;
      final activeFilterStatus = event.status ?? 'PENDING';

      await _saveLoadedCache(
        activeFilterStatus: activeFilterStatus,
        approvals: approvals,
        stats: stats,
      );

      emit(
        ApprovalLoaded(
          approvals: approvals,
          stats: stats,
          activeFilterStatus: activeFilterStatus,
          warningMessage: null,
        ),
      );
    } catch (e) {
      final activeFilterStatus = event.status ?? 'PENDING';
      final friendlyMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'memuat data approval',
      );
      final cachedState = await _loadCachedState(
        activeFilterStatus: activeFilterStatus,
      );
      if (cachedState != null) {
        emit(
          cachedState.copyWith(
            activeFilterStatus: activeFilterStatus,
            warningMessage:
                'Menampilkan data terakhir tersimpan. $friendlyMessage',
          ),
        );
        return;
      }

      emit(ApprovalError(message: friendlyMessage));
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

  Future<void> _saveLoadedCache({
    required String activeFilterStatus,
    required List<ApprovalItem> approvals,
    required ApprovalStats stats,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final payload = <String, dynamic>{
        'activeFilterStatus': activeFilterStatus,
        'stats': stats.toJson(),
        'approvals': approvals.map((item) => item.toJson()).toList(),
      };
      await prefs.setString(
        _cacheKeyForStatus(activeFilterStatus),
        jsonEncode(payload),
      );
    } catch (_) {
      // Ignore cache persistence errors.
    }
  }

  Future<ApprovalLoaded?> _loadCachedState({
    required String activeFilterStatus,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKeyForStatus(activeFilterStatus));
      if (raw == null || raw.trim().isEmpty) {
        return null;
      }

      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final statsRaw = decoded['stats'];
      final approvalsRaw = decoded['approvals'];
      if (statsRaw is! Map<String, dynamic> || approvalsRaw is! List) {
        return null;
      }

      final approvals = approvalsRaw
          .whereType<Map<String, dynamic>>()
          .map(ApprovalItem.fromJson)
          .toList(growable: false);

      return ApprovalLoaded(
        approvals: approvals,
        stats: ApprovalStats.fromJson(statsRaw),
        activeFilterStatus:
            decoded['activeFilterStatus']?.toString() ?? activeFilterStatus,
      );
    } catch (_) {
      return null;
    }
  }

  String _cacheKeyForStatus(String status) {
    final normalized = status.trim().toUpperCase();
    return '$_cachePrefix$normalized';
  }

  Future<void> _onApproveRequested(
    ApprovalApproveRequested event,
    Emitter<ApprovalState> emit,
  ) async {
    try {
      await _approvalRepository.approveHarvest(event.id, notes: event.notes);
      await _notificationStorage.markHarvestApprovalNotificationsAsRead(
        event.id,
      );
      emit(const ApprovalActionSuccess(message: 'Data berhasil disetujui'));
      add(const ApprovalRefreshRequested());
    } catch (e) {
      emit(
        ApprovalActionFailure(
          message: SyncErrorMessageHelper.toUserMessage(
            e,
            action: 'menyetujui data panen',
          ),
        ),
      );
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
      await _notificationStorage.markHarvestApprovalNotificationsAsRead(
        event.id,
      );
      emit(const ApprovalActionSuccess(message: 'Data berhasil ditolak'));
      add(const ApprovalRefreshRequested());
    } catch (e) {
      emit(
        ApprovalActionFailure(
          message: SyncErrorMessageHelper.toUserMessage(
            e,
            action: 'menolak data panen',
          ),
        ),
      );
      add(const ApprovalRefreshRequested());
    }
  }
}
