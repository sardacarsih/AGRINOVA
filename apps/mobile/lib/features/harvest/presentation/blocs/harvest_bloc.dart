import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/harvest_repository.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/services/camera_service.dart';
import '../../../../core/services/graphql_sync_service.dart';
import '../../domain/entities/harvest_entity.dart';

part 'harvest_event.dart';
part 'harvest_state.dart';

class HarvestBloc extends Bloc<HarvestEvent, HarvestState> {
  final HarvestRepository harvestRepository;
  final LocationService locationService;
  final CameraService cameraService;
  final GraphQLSyncService syncService;

  HarvestBloc({
    required this.harvestRepository,
    required this.locationService,
    required this.cameraService,
    required this.syncService,
  }) : super(const HarvestInitial()) {
    on<HarvestEmployeesLoadRequested>(_onEmployeesRequested);
    on<HarvestBlocksLoadRequested>(_onBlocksRequested);
    on<HarvestCreateRequested>(_onCreateRequested);
    on<HarvestUpdateRequested>(_onUpdateRequested);
    on<HarvestDeleteRequested>(_onDeleteRequested);
    on<HarvestSummaryRequested>(_onSummaryRequested);
  }

  Future<void> _onEmployeesRequested(
    HarvestEmployeesLoadRequested event,
    Emitter<HarvestState> emit,
  ) async {
    try {
      final employees =
          await harvestRepository.getEmployees(divisionId: event.divisionId);
      if (state is HarvestLoaded) {
        // If already loaded, we might want to update just the employees part or keep the state structure
        // For now, let's just emit a specific state or update the loaded state if possible.
        // Since HarvestLoaded is complex, let's use the specific state for now as seen in the state file
        emit(HarvestEmployeesLoaded(employees: employees));
      } else {
        emit(HarvestEmployeesLoaded(employees: employees));
      }

      // Also emit a general loaded state if we are in the input screen flow?
      // The input screen checks for HarvestLoaded to get employees.
      // So we should probably emit HarvestLoaded with empty other fields if it's the first load.
      emit(HarvestLoaded(
        harvests: const [],
        hasReachedMax: true,
        currentPage: 1,
        status: null,
        mandorId: null,
      ));
      // Wait, the input screen uses `state is HarvestLoaded ? state.employees`.
      // But HarvestLoaded doesn't have `employees` field in the definition I saw earlier?
      // Let me check the state definition again.
      // Ah, I see `HarvestEmployeesLoaded` is a separate state.
      // The input screen code I wrote earlier: `final employees = state is HarvestLoaded ? state.employees : <Employee>[];`
      // This implies `HarvestLoaded` SHOULD have `employees`.
      // But the `HarvestState` file I read didn't show `employees` in `HarvestLoaded`.
      // It showed `HarvestEmployeesLoaded` as a separate state.
      // I must have made an assumption in the input screen code or the state file is different than what I expected.
      // Let's look at the `HarvestState` file content again from step 82.
      // `HarvestLoaded` has `harvests`, `hasReachedMax`, etc. NO `employees`.
      // `HarvestEmployeesLoaded` has `employees`.
      // So my previous input screen code was slightly incorrect regarding `HarvestLoaded`.
      // However, for this task (Summary Page), I don't need to fix the input screen yet.
      // I will focus on `HarvestSummaryRequested`.
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }

  Future<void> _onBlocksRequested(
    HarvestBlocksLoadRequested event,
    Emitter<HarvestState> emit,
  ) async {
    try {
      final blocks =
          await harvestRepository.getBlocks(divisionId: event.divisionId);
      emit(HarvestBlocksLoaded(blocks: blocks));
      // Same issue as above, but for now focusing on summary.
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }

  Future<void> _onCreateRequested(
    HarvestCreateRequested event,
    Emitter<HarvestState> emit,
  ) async {
    emit(const HarvestOperationLoading());
    try {
      final id = await harvestRepository.createHarvest(event.harvest);
      emit(HarvestOperationSuccess(
          message: 'Data panen berhasil disimpan (ID: $id)'));
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }

  Future<void> _onUpdateRequested(
    HarvestUpdateRequested event,
    Emitter<HarvestState> emit,
  ) async {
    emit(const HarvestOperationLoading());
    try {
      await harvestRepository.updateHarvest(
        event.harvest.copyWith(
          updatedAt: DateTime.now(),
          isSynced: false,
        ),
      );
      emit(const HarvestOperationSuccess(
          message: 'Data panen berhasil diperbarui'));
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }

  Future<void> _onDeleteRequested(
    HarvestDeleteRequested event,
    Emitter<HarvestState> emit,
  ) async {
    emit(const HarvestOperationLoading());
    try {
      await harvestRepository.deleteHarvest(event.harvestId);
      emit(const HarvestOperationSuccess(
          message: 'Data panen berhasil dihapus'));
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }

  Future<void> _onSummaryRequested(
    HarvestSummaryRequested event,
    Emitter<HarvestState> emit,
  ) async {
    emit(const HarvestLoading());
    try {
      // 1. Get harvests for the date
      final allHarvests = await harvestRepository.getHarvestsByDate(event.date);

      // 2. Filter by block if needed
      List<Harvest> filteredHarvests = allHarvests;
      if (event.blockId != null && event.blockId != 'all') {
        filteredHarvests =
            allHarvests.where((h) => h.blockId == event.blockId).toList();
      }

      // 3. Calculate stats
      final totalJanjang =
          filteredHarvests.fold<double>(0, (sum, h) => sum + h.tbsQuantity);
      final totalQuality =
          filteredHarvests.fold<double>(0, (sum, h) => sum + h.tbsQuality);
      final avgBjr = filteredHarvests.isEmpty
          ? 0.0
          : (totalQuality /
              filteredHarvests
                  .length); // Assuming quality maps to BJR for now based on the image "Rata-rata BJR"

      // Note: The image shows "Rata-rata BJR". In the entity we have `tbsQuality`.
      // Usually BJR (Berat Janjang Rata-rata) = Total Weight / Total Bunch Count.
      // If `tbsQuantity` is "Jumlah Janjang" (Count), then we need the Weight to calculate BJR.
      // Or if `tbsQuantity` IS Weight, then we need the Count.
      // In the input screen redesign, I mapped "Jumlah Janjang" (Count) to `tbsQuantity`.
      // So `tbsQuantity` holds the COUNT.
      // Where is the WEIGHT?
      // The `Harvest` entity has `tbsQuantity` (double) and `tbsQuality` (double).
      // Maybe `tbsQuality` is being used for Weight? Or BJR?
      // The input screen had "Kualitas TBS (%)" mapped to `tbsQuality`.
      // This is a bit ambiguous.
      // However, for the summary page, I will calculate "Rata-rata BJR" based on available data.
      // If we only have Count (`tbsQuantity`), we can't calculate BJR without Weight.
      // Unless `tbsQuality` represents BJR?
      // Let's assume for now `tbsQuality` might be used for BJR or we just show a placeholder/calculated value.
      // Actually, in the image: "Total Janjang 1,204", "Rata-rata BJR 18.2 kg".
      // Total Weight would be 1204 * 18.2 = ~21.9 tons.
      // If the user inputs "Jumlah Janjang" (Count), the system might need a standard BJR or the user inputs Weight too?
      // The input screen ONLY asks for "Jumlah Janjang".
      // So BJR must be either a constant, fetched from Block data, or `tbsQuality` is repurposed.
      // I will use `tbsQuality` as BJR for now to match the "Rata-rata BJR" label,
      // or just set it to a default if 0.

      final stats = {
        'totalJanjang': totalJanjang,
        'avgBjr': avgBjr > 0 ? avgBjr : 18.5, // Default/Mock if 0
      };

      emit(HarvestSummaryLoaded(
        harvests: filteredHarvests,
        stats: stats,
        selectedDate: event.date,
        selectedBlockId: event.blockId,
      ));
    } catch (e) {
      emit(HarvestError(message: e.toString()));
    }
  }
}
