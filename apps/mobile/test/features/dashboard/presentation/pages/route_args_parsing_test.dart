import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';

import 'package:agrinova_mobile/core/models/jwt_models.dart';
import 'package:agrinova_mobile/core/services/notification_storage_service.dart';
import 'package:agrinova_mobile/features/approval/data/repositories/approval_repository.dart';
import 'package:agrinova_mobile/features/approval/domain/entities/approval_item.dart';
import 'package:agrinova_mobile/features/approval/presentation/blocs/approval_bloc.dart';
import 'package:agrinova_mobile/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:agrinova_mobile/features/dashboard/presentation/blocs/mandor_dashboard_bloc.dart';
import 'package:agrinova_mobile/features/dashboard/presentation/pages/asisten_page.dart';
import 'package:agrinova_mobile/features/dashboard/presentation/pages/mandor_page.dart';
import 'package:agrinova_mobile/features/harvest/presentation/blocs/harvest_bloc.dart';
import 'package:agrinova_mobile/features/monitoring/presentation/blocs/monitoring_bloc.dart';

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockApprovalBloc extends MockBloc<ApprovalEvent, ApprovalState>
    implements ApprovalBloc {}

class MockMonitoringBloc extends MockBloc<MonitoringEvent, MonitoringState>
    implements MonitoringBloc {}

class MockMandorDashboardBloc
    extends MockBloc<MandorDashboardEvent, MandorDashboardState>
    implements MandorDashboardBloc {}

class MockHarvestBloc extends MockBloc<HarvestEvent, HarvestState>
    implements HarvestBloc {}

class TestNotificationStorageService extends NotificationStorageService {
  @override
  Future<void> initialize() async {}

  @override
  Future<int> getUnreadCount() async => 0;
}

class TestApprovalRepository implements ApprovalRepository {
  @override
  Future<void> approveHarvest(String id, {String? notes}) async {}

  @override
  Future<ApprovalStats> getApprovalStats() async {
    return const ApprovalStats(
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    );
  }

  @override
  Future<List<ApprovalItem>> getPendingApprovals({
    String? status,
    String? divisionId,
    String? blockId,
    String? mandorId,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? priority,
    String? search,
    String? sortBy,
    String? sortDirection,
    int? page,
    int? pageSize,
  }) async {
    return const [];
  }

  @override
  Future<void> rejectHarvest(String id, String reason) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final getIt = GetIt.instance;

  group('AsistenPage route args parsing', () {
    late MockAuthBloc authBloc;

    setUp(() async {
      await getIt.reset();

      getIt.registerSingleton<NotificationStorageService>(
        TestNotificationStorageService(),
      );
      getIt.registerSingleton<ApprovalRepository>(TestApprovalRepository());
      getIt.registerFactory<ApprovalBloc>(() {
        final bloc = MockApprovalBloc();
        whenListen(
          bloc,
          const Stream<ApprovalState>.empty(),
          initialState: ApprovalLoading(),
        );
        return bloc;
      });
      getIt.registerFactory<MonitoringBloc>(() {
        final bloc = MockMonitoringBloc();
        whenListen(
          bloc,
          const Stream<MonitoringState>.empty(),
          initialState: const MonitoringInitial(),
        );
        return bloc;
      });

      authBloc = MockAuthBloc();
      whenListen(
        authBloc,
        Stream<AuthState>.value(
          AuthAuthenticated(
            user: _testUser(role: 'ASISTEN'),
            deviceTrusted: true,
          ),
        ),
        initialState: AuthAuthenticated(
          user: _testUser(role: 'ASISTEN'),
          deviceTrusted: true,
        ),
      );
    });

    tearDown(() async {
      await getIt.reset();
    });

    testWidgets(
      'moves to approval tab and shows harvest snackbar from notification args',
      (tester) async {
        await tester.pumpWidget(
          _buildRouteTestApp(
            arguments: const {
              'tab': 1,
              'panenId': 'panen-001',
              'action': 'APPROVAL_NEEDED',
              'type': 'HARVEST_APPROVAL_NEEDED',
            },
            child: BlocProvider<AuthBloc>.value(
              value: authBloc,
              child: const AsistenPage(),
            ),
          ),
        );

        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        final nav = tester.widget<BottomNavigationBar>(
          find.byType(BottomNavigationBar),
        );

        expect(nav.currentIndex, 1);
        expect(find.text('Membuka transaksi panen: panen-001'), findsOneWidget);
      },
    );

    testWidgets(
      'falls back to approval tab when tab value is invalid but panenId exists',
      (tester) async {
        await tester.pumpWidget(
          _buildRouteTestApp(
            arguments: const {
              'tab': 99,
              'panenId': 'panen-404',
              'action': 'REJECTED',
              'type': 'HARVEST_STATUS_UPDATE',
            },
            child: BlocProvider<AuthBloc>.value(
              value: authBloc,
              child: const AsistenPage(),
            ),
          ),
        );

        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        final nav = tester.widget<BottomNavigationBar>(
          find.byType(BottomNavigationBar),
        );

        expect(nav.currentIndex, 1);
        expect(find.text('Membuka transaksi panen: panen-404'), findsOneWidget);
      },
    );
  });

  group('MandorPage route args parsing', () {
    late MockAuthBloc authBloc;

    setUp(() async {
      await getIt.reset();

      getIt.registerSingleton<NotificationStorageService>(
        TestNotificationStorageService(),
      );
      getIt.registerFactory<MandorDashboardBloc>(() {
        final bloc = MockMandorDashboardBloc();
        whenListen(
          bloc,
          const Stream<MandorDashboardState>.empty(),
          initialState: const MandorDashboardLoading(),
        );
        return bloc;
      });
      getIt.registerFactory<HarvestBloc>(() {
        final bloc = MockHarvestBloc();
        whenListen(
          bloc,
          const Stream<HarvestState>.empty(),
          initialState: const HarvestInitial(),
        );
        return bloc;
      });

      authBloc = MockAuthBloc();
      whenListen(
        authBloc,
        Stream<AuthState>.value(
          AuthAuthenticated(
            user: _testUser(role: 'MANDOR'),
            deviceTrusted: true,
          ),
        ),
        initialState: AuthAuthenticated(
          user: _testUser(role: 'MANDOR'),
          deviceTrusted: true,
        ),
      );
    });

    tearDown(() async {
      await getIt.reset();
    });

    testWidgets(
      'opens Riwayat Panen tab and shows harvest snackbar from route args',
      (tester) async {
        await tester.pumpWidget(
          _buildRouteTestApp(
            arguments: const {
              'tab': 2,
              'panenId': 'harvest-001',
              'action': 'OPEN_HISTORY',
              'type': 'HARVEST_STATUS_UPDATE',
            },
            child: BlocProvider<AuthBloc>.value(
              value: authBloc,
              child: const MandorPage(),
            ),
          ),
        );

        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        final appBar = tester.widget<AppBar>(find.byType(AppBar).first);
        final title = appBar.title as Text;

        expect(title.data, 'Riwayat Panen');
        expect(
          find.text('Membuka transaksi panen: harvest-001'),
          findsOneWidget,
        );

        await tester.pump(const Duration(seconds: 11));
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );

    testWidgets(
      'falls back to Riwayat Panen tab when tab is invalid and panenId exists',
      (tester) async {
        await tester.pumpWidget(
          _buildRouteTestApp(
            arguments: const {
              'tab': 99,
              'panenId': 'harvest-404',
              'action': 'OPEN_DETAIL',
              'type': 'HARVEST_STATUS_UPDATE',
            },
            child: BlocProvider<AuthBloc>.value(
              value: authBloc,
              child: const MandorPage(),
            ),
          ),
        );

        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        final appBar = tester.widget<AppBar>(find.byType(AppBar).first);
        final title = appBar.title as Text;

        expect(title.data, 'Riwayat Panen');
        expect(
          find.text('Membuka transaksi panen: harvest-404'),
          findsOneWidget,
        );

        await tester.pump(const Duration(seconds: 11));
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  });
}

Widget _buildRouteTestApp({
  required Map<String, dynamic> arguments,
  required Widget child,
}) {
  return MaterialApp(
    onGenerateRoute: (settings) {
      return MaterialPageRoute<void>(
        settings: RouteSettings(
          name: settings.name,
          arguments: arguments,
        ),
        builder: (_) => child,
      );
    },
  );
}

User _testUser({required String role}) {
  return User(
    id: 'user-001',
    username: role.toLowerCase(),
    email: 'test@agrinova.local',
    role: role,
    fullName: 'Test User',
    division: 'Divisi A',
    estate: 'Estate A',
    assignedDivisions: const ['divisi-a'],
  );
}
