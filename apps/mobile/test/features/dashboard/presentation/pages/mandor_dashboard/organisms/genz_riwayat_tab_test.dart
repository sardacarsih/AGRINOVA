import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:agrinova_mobile/features/dashboard/presentation/pages/mandor_dashboard/organisms/genz_riwayat_tab.dart';
import 'package:agrinova_mobile/features/harvest/domain/entities/harvest_entity.dart';
import 'package:agrinova_mobile/features/harvest/presentation/blocs/harvest_bloc.dart';

class MockHarvestBloc extends MockBloc<HarvestEvent, HarvestState>
    implements HarvestBloc {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('GenZRiwayatTab focused harvest behavior', () {
    late MockHarvestBloc mockHarvestBloc;

    setUp(() {
      mockHarvestBloc = MockHarvestBloc();
    });

    testWidgets(
      'auto-opens detail dialog when focused harvest exists in summary list',
      (tester) async {
        final focusedHarvest = _buildHarvest(
          id: 'harvest-001',
          status: 'APPROVED',
          isSynced: true,
        );

        final summaryState = HarvestSummaryLoaded(
          harvests: [focusedHarvest],
          stats: const {
            'totalJanjang': 1.0,
            'avgBjr': 18.0,
          },
          selectedDate: DateTime(2026, 2, 16),
        );

        whenListen(
          mockHarvestBloc,
          Stream<HarvestState>.fromIterable([summaryState]),
          initialState: const HarvestInitial(),
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BlocProvider<HarvestBloc>.value(
                value: mockHarvestBloc,
                child: const GenZRiwayatTab(
                  mandorId: 'mandor-001',
                  focusHarvestId: 'harvest-001',
                  autoOpenFocusedHarvest: true,
                ),
              ),
            ),
          ),
        );

        await tester.pump();
        await tester.pumpAndSettle();

        expect(find.text('Detail Panen'), findsOneWidget);
        expect(find.text('harvest-001'), findsWidgets);
      },
    );
  });
}

Harvest _buildHarvest({
  required String id,
  required String status,
  required bool isSynced,
}) {
  final createdAt = DateTime(2026, 2, 16, 9, 0);
  return Harvest(
    id: id,
    employeeId: 'employee-001',
    employeeName: 'Karyawan Test',
    blockId: 'block-001',
    blockName: 'Blok A1',
    divisionId: 'division-001',
    divisionName: 'Divisi 1',
    estateId: 'estate-001',
    estateName: 'Estate 1',
    tbsQuantity: 12,
    jumlahJanjang: 12,
    jjgMatang: 10,
    jjgMentah: 1,
    jjgLewatMatang: 1,
    jjgBusukAbnormal: 0,
    jjgTangkaiPanjang: 0,
    tbsQuality: 18.2,
    qualityGrade: 'A',
    harvestDate: DateTime(2026, 2, 16),
    createdAt: createdAt,
    status: status,
    mandorId: 'mandor-001',
    mandorName: 'Mandor Test',
    isSynced: isSynced,
  );
}
