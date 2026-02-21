import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:agrinova_mobile/core/models/jwt_models.dart';
import 'package:agrinova_mobile/features/auth/presentation/blocs/auth_bloc.dart';
import 'package:agrinova_mobile/features/auth/presentation/pages/change_password_page.dart';

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class FakeAuthEvent extends Fake implements AuthEvent {}

class FakeAuthState extends Fake implements AuthState {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    registerFallbackValue(FakeAuthEvent());
    registerFallbackValue(FakeAuthState());
  });

  group('ChangePasswordPage', () {
    late MockAuthBloc authBloc;
    late StreamController<AuthState> authStateController;
    late AuthAuthenticated authenticatedState;

    setUp(() {
      authBloc = MockAuthBloc();
      authStateController = StreamController<AuthState>.broadcast();
      authenticatedState = AuthAuthenticated(
        user: const User(
          id: 'user-001',
          username: 'mandor',
          email: 'mandor@agrinova.local',
          role: 'MANDOR',
          fullName: 'Mandor Test',
        ),
        deviceTrusted: true,
      );

      when(() => authBloc.state).thenReturn(authenticatedState);
      when(() => authBloc.stream).thenAnswer((_) => authStateController.stream);
      when(() => authBloc.add(any())).thenReturn(null);
    });

    tearDown(() async {
      await authStateController.close();
    });

    testWidgets('shows validation messages when form is empty', (tester) async {
      await tester.pumpWidget(_buildTestApp(authBloc));

      await tester.tap(find.text('Simpan Password Baru'));
      await tester.pump();

      expect(find.text('Password saat ini wajib diisi'), findsOneWidget);
      expect(find.text('Password baru wajib diisi'), findsOneWidget);
      expect(find.text('Konfirmasi password wajib diisi'), findsOneWidget);
    });

    testWidgets('dispatches AuthPasswordChangeRequested on submit',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(authBloc));

      await tester.enterText(
        find.byType(TextFormField).at(0),
        'password-lama',
      );
      await tester.enterText(
        find.byType(TextFormField).at(1),
        'password-baru-123',
      );
      await tester.enterText(
        find.byType(TextFormField).at(2),
        'password-baru-123',
      );

      await tester.tap(find.text('Simpan Password Baru'));
      await tester.pump();

      final capturedEvent = verify(() => authBloc.add(captureAny()))
          .captured
          .single as AuthPasswordChangeRequested;

      expect(capturedEvent.currentPassword, 'password-lama');
      expect(capturedEvent.newPassword, 'password-baru-123');
      expect(capturedEvent.logoutOtherDevices, false);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows snackbar when bloc returns password error',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(authBloc));

      await tester.enterText(
        find.byType(TextFormField).at(0),
        'salah-password',
      );
      await tester.enterText(
        find.byType(TextFormField).at(1),
        'password-baru-123',
      );
      await tester.enterText(
        find.byType(TextFormField).at(2),
        'password-baru-123',
      );

      await tester.tap(find.text('Simpan Password Baru'));
      await tester.pump();

      authStateController.add(
        authenticatedState.copyWith(
          passwordChangeErrorMessage: 'Password saat ini tidak sesuai.',
        ),
      );
      await tester.pump();

      expect(find.text('Password saat ini tidak sesuai.'), findsOneWidget);

      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNotNull);
    });
  });
}

Widget _buildTestApp(AuthBloc authBloc) {
  return MaterialApp(
    home: BlocProvider<AuthBloc>.value(
      value: authBloc,
      child: const ChangePasswordPage(),
    ),
  );
}
