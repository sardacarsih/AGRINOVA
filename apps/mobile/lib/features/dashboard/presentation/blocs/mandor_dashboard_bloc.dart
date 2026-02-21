import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../harvest/data/repositories/harvest_repository.dart';
import '../../../../core/services/unified_secure_storage_service.dart';

part 'mandor_dashboard_event.dart';
part 'mandor_dashboard_state.dart';

/// BLoC for Mandor Dashboard data management
///
/// Handles loading dashboard statistics, pending items,
/// and recent activity from the HarvestRepository.
class MandorDashboardBloc
    extends Bloc<MandorDashboardEvent, MandorDashboardState> {
  final HarvestRepository harvestRepository;
  static final Logger _logger = Logger();

  MandorDashboardBloc({
    required this.harvestRepository,
  }) : super(const MandorDashboardInitial()) {
    on<MandorDashboardLoadRequested>(_onLoadRequested);
    on<MandorDashboardRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onLoadRequested(
    MandorDashboardLoadRequested event,
    Emitter<MandorDashboardState> emit,
  ) async {
    emit(const MandorDashboardLoading());
    await _loadDashboardData(emit);
  }

  Future<void> _onRefreshRequested(
    MandorDashboardRefreshRequested event,
    Emitter<MandorDashboardState> emit,
  ) async {
    // Keep current data while refreshing
    if (state is MandorDashboardLoaded) {
      final currentState = state as MandorDashboardLoaded;
      emit(currentState.copyWith(isRefreshing: true));
    }
    await _loadDashboardData(emit);
  }

  Future<void> _loadDashboardData(Emitter<MandorDashboardState> emit) async {
    try {
      // Get current user info (kept for future role/user scoping).
      await UnifiedSecureStorageService.getUserInfo();

      final today = DateTime.now();

      // 1. Get today's harvests
      final todayHarvests = await harvestRepository.getHarvestsByDate(today);

      // 2. Calculate total harvest (jumlah janjang)
      final totalHarvestJanjang = todayHarvests.fold<double>(
        0,
        (sum, h) => sum + h.tbsQuantity,
      );

      // 3. Get pending harvests
      final pendingHarvests = await harvestRepository.getPendingHarvests();

      // 4. Count unique employees today
      final activeEmployeeIds = todayHarvests.map((h) => h.employeeId).toSet();

      // 5. Count unique blocks today
      final workedBlockIds = todayHarvests.map((h) => h.blockId).toSet();

      // 6. Get recent activity (last 5 harvests)
      final recentActivity = todayHarvests
          .take(5)
          .map((h) => ActivityData(
                id: h.id,
                title: '${h.employeeName} - ${h.blockName}',
                subtitle: '${h.tbsQuantity.toStringAsFixed(0)} janjang',
                time: _formatTime(h.createdAt),
                type: ActivityDataType.harvest,
                isSuccess: h.status == 'APPROVED',
              ))
          .toList();

      // 7. Map pending items
      final pendingItems = pendingHarvests
          .take(3)
          .map((h) => PendingItemData(
                id: h.id,
                title: h.employeeName,
                subtitle:
                    '${h.tbsQuantity.toStringAsFixed(0)} janjang • ${h.blockName}',
                time: _formatTime(h.createdAt),
              ))
          .toList();

      _logger
          .i('Dashboard loaded: ${totalHarvestJanjang.toStringAsFixed(0)} jjg, '
              '${pendingHarvests.length} pending, '
              '${activeEmployeeIds.length} employees, '
              '${workedBlockIds.length} blocks');

      emit(MandorDashboardLoaded(
        totalHarvestJanjang: totalHarvestJanjang,
        pendingCount: pendingHarvests.length,
        activeEmployees: activeEmployeeIds.length,
        workedBlocks: workedBlockIds.length,
        recentActivity: recentActivity,
        pendingItems: pendingItems,
        lastUpdated: DateTime.now(),
        isRefreshing: false,
      ));
    } catch (e) {
      _logger.e('Error loading dashboard data: $e');
      emit(MandorDashboardError(message: e.toString()));
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) {
      return 'Baru saja';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m lalu';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}j lalu';
    } else {
      return '${dateTime.day}/${dateTime.month}';
    }
  }
}
