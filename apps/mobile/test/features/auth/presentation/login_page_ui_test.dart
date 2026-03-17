import 'package:agrinova_mobile/core/di/dependency_injection.dart';
import 'package:agrinova_mobile/core/services/connectivity_service.dart';
import 'package:agrinova_mobile/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:agrinova_mobile/features/auth/presentation/blocs/biometric_auth_bloc.dart';
import 'package:agrinova_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:agrinova_mobile/shared/widgets/runtime_network_image.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockBiometricAuthBloc
    extends MockBloc<BiometricAuthEvent, BiometricAuthState>
    implements BiometricAuthBloc {}

class MockConnectivityService extends Mock implements ConnectivityService {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const packageInfoChannel = MethodChannel(
    'dev.fluttercommunity.plus/package_info',
  );

  setUpAll(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(packageInfoChannel, (call) async {
      if (call.method == 'getAll') {
        return <String, dynamic>{
          'appName': 'Agrinova',
          'packageName': 'com.agrinova.mobile',
          'version': '1.0.0',
          'buildNumber': '1',
          'buildSignature': '',
        };
      }
      return null;
    });
  });

  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(packageInfoChannel, null);
  });

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'login_theme_selection_mode': 'manual',
      'login_theme_selection_id': 'normal',
      'login_theme_payload_cache': '''
{"version":"test","updatedAt":"2026-03-16T00:00:00.000Z","activeThemeId":"normal","themes":[{"id":"normal","label":"Normal","lightTokens":{"bgGradient":["#FFF8FAFC","#FFE2E8F0","#FFDBEAFE"],"surface":"#BFFFFFFF","surfaceBorder":"#FFCBD5E1","textPrimary":"#FF0F172A","textSecondary":"#FF334155","inputFill":"#F2FFFFFF","inputBorder":"#FFCBD5E1","buttonGradient":["#FF00FF87","#FF00D9FF"],"buttonText":"#FF0F172A","link":"#FF0369A1"},"darkTokens":{"bgGradient":["#FF1A1A2E","#FF16213E","#FF0F3460"],"surface":"#1AFFFFFF","surfaceBorder":"#29FFFFFF","textPrimary":"#FFFFFFFF","textSecondary":"#FFB7C3D4","inputFill":"#14FFFFFF","inputBorder":"#29FFFFFF","buttonGradient":["#FF00FF87","#FF00D9FF"],"buttonText":"#FF1A1A2E","link":"#FF00D9FF"},"assets":{"backgroundImage":"https://example.com/theme-bg.jpg","illustration":"","iconPack":"outline-enterprise","accentAsset":"none"}}]}
''',
      'login_theme_payload_fetched_at': DateTime.now().toIso8601String(),
    });

    await sl.reset();
  });

  tearDown(() async {
    await sl.reset();
  });

  testWidgets('renders login essentials and hides manual theme controls', (
    tester,
  ) async {
    final authBloc = MockAuthBloc();
    final biometricBloc = MockBiometricAuthBloc();
    final connectivityService = MockConnectivityService();

    when(() => authBloc.state).thenReturn(const AuthInitial());
    when(() => authBloc.stream).thenAnswer((_) => const Stream<AuthState>.empty());
    when(() => biometricBloc.state).thenReturn(const BiometricAuthInitial());
    when(() => biometricBloc.stream).thenAnswer(
      (_) => const Stream<BiometricAuthState>.empty(),
    );
    when(() => connectivityService.initialize()).thenAnswer((_) async {});
    when(() => connectivityService.networkStatusStream).thenAnswer(
      (_) => const Stream<NetworkStatus>.empty(),
    );

    sl.registerSingleton<ConnectivityService>(connectivityService);
    sl.registerSingleton<BiometricAuthBloc>(biometricBloc);

    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<AuthBloc>.value(
          value: authBloc,
          child: const LoginPage(),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 150));

    expect(find.text('Welcome back 👋'), findsOneWidget);
    expect(find.text('Masuk ke akun Agrinova kamu'), findsOneWidget);
    expect(find.text('Username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Ingat perangkat ini'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget);
    expect(find.byType(RuntimeNetworkImage), findsOneWidget);
    expect(find.byKey(const Key('loginBackgroundImageLayer')), findsOneWidget);
    expect(find.byKey(const Key('loginBackgroundOverlayLayer')), findsOneWidget);

    expect(find.byIcon(Icons.palette_outlined), findsNothing);
    expect(find.byIcon(Icons.dark_mode_rounded), findsNothing);
    expect(find.byIcon(Icons.light_mode_rounded), findsNothing);
    expect(find.textContaining('Theme:'), findsNothing);
    expect(find.textContaining('Campaign:'), findsNothing);
    expect(find.text('Lupa Password'), findsNothing);
    expect(find.text('Belum punya akun? Daftar'), findsNothing);
  });
}
