import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:agrinova_mobile/features/approval/domain/entities/approval_item.dart';
import 'package:agrinova_mobile/features/approval/presentation/blocs/approval_bloc.dart';
import 'package:agrinova_mobile/features/approval/presentation/pages/approval_view.dart';

class MockApprovalBloc extends MockBloc<ApprovalEvent, ApprovalState>
    implements ApprovalBloc {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await initializeDateFormatting('id_ID');
  });

  group('ApprovalView focus notification behavior', () {
    late MockApprovalBloc mockApprovalBloc;

    setUp(() {
      mockApprovalBloc = MockApprovalBloc();
    });

    testWidgets(
      'shows snackbar and opens detail dialog when focused approval exists',
      (tester) async {
        final approvalItem = _buildApprovalItem(id: 'panen-001');
        final loadedState = ApprovalLoaded(
          approvals: [approvalItem],
          stats: const ApprovalStats(
            pendingCount: 1,
            approvedCount: 0,
            rejectedCount: 0,
          ),
          activeFilterStatus: 'PENDING',
        );

        whenListen(
          mockApprovalBloc,
          Stream<ApprovalState>.fromIterable([loadedState]),
          initialState: ApprovalLoading(),
        );

        await tester.pumpWidget(
          _buildApprovalViewTestApp(
            bloc: mockApprovalBloc,
            focusApprovalId: 'panen-001',
          ),
        );

        await tester.pump();
        await tester.pumpAndSettle();

        expect(
          find.text('Membuka detail transaksi panen panen-001'),
          findsOneWidget,
        );
        expect(find.text('Detail Approval Panen'), findsOneWidget);
      },
    );

    testWidgets(
      'shows warning snackbar and does not open detail dialog when focused approval is missing',
      (tester) async {
        final loadedState = ApprovalLoaded(
          approvals: const [],
          stats: const ApprovalStats(
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
          ),
          activeFilterStatus: 'PENDING',
        );

        whenListen(
          mockApprovalBloc,
          Stream<ApprovalState>.fromIterable([loadedState]),
          initialState: ApprovalLoading(),
        );

        await tester.pumpWidget(
          _buildApprovalViewTestApp(
            bloc: mockApprovalBloc,
            focusApprovalId: 'panen-404',
          ),
        );

        await tester.pump();
        await tester.pumpAndSettle();

        expect(
          find.text(
            'Transaksi panen panen-404 tidak ada pada filter PENDING',
          ),
          findsOneWidget,
        );
        expect(find.text('Detail Approval Panen'), findsNothing);
      },
    );
  });
}

Widget _buildApprovalViewTestApp({
  required ApprovalBloc bloc,
  required String focusApprovalId,
}) {
  return MaterialApp(
    home: Scaffold(
      body: BlocProvider<ApprovalBloc>.value(
        value: bloc,
        child: ApprovalView(
          initialStatus: 'PENDING',
          focusApprovalId: focusApprovalId,
        ),
      ),
    ),
  );
}

ApprovalItem _buildApprovalItem({
  required String id,
}) {
  return ApprovalItem(
    id: id,
    mandorName: 'Mandor Test',
    mandorId: 'mandor-001',
    blockName: 'A1',
    blockId: 'block-001',
    divisionName: 'Divisi 1',
    divisionId: 'division-001',
    harvestDate: DateTime(2026, 2, 16),
    employeeCount: 1,
    employees: 'Karyawan Test',
    tbsCount: 10,
    weight: 120.0,
    submittedAt: DateTime(2026, 2, 16, 9, 30),
    elapsedTime: '10 menit lalu',
    status: 'PENDING',
    hasPhoto: false,
  );
}
