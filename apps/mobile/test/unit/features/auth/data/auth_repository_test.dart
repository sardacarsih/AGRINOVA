import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:agrinova_mobile/core/models/jwt_models.dart';
import 'package:agrinova_mobile/core/services/connectivity_service.dart';
import 'package:agrinova_mobile/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:agrinova_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:agrinova_mobile/features/auth/data/repositories/auth_repository.dart';

class MockAuthRemoteDataSource extends Mock implements AuthRemoteDataSource {}

class MockAuthLocalDataSource extends Mock implements AuthLocalDataSource {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class FakeJWTLoginRequest extends Fake implements JWTLoginRequest {}

class FakeJWTLoginResponse extends Fake implements JWTLoginResponse {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    registerFallbackValue(FakeJWTLoginRequest());
    registerFallbackValue(FakeJWTLoginResponse());
  });

  group('AuthRepositoryImpl.authenticateOffline', () {
    late MockAuthRemoteDataSource remote;
    late MockAuthLocalDataSource local;
    late MockConnectivityService connectivity;
    late AuthRepositoryImpl repository;

    final user = const User(
      id: 'user-1',
      username: 'mandor',
      email: 'mandor@agrinova.local',
      role: 'MANDOR',
      fullName: 'Mandor',
    );

    setUp(() {
      remote = MockAuthRemoteDataSource();
      local = MockAuthLocalDataSource();
      connectivity = MockConnectivityService();
      repository = AuthRepositoryImpl(
        remoteDataSource: remote,
        localDataSource: local,
        connectivityService: connectivity,
      );
    });

    test('rejects when no valid offline session is available', () async {
      when(() => local.hasValidOfflineAuth()).thenAnswer((_) async => false);

      await expectLater(
        () => repository.authenticateOffline('mandor', 'secret'),
        throwsA(
          predicate(
            (error) =>
                error.toString().contains('No valid offline session found'),
          ),
        ),
      );
    });

    test('rejects when username does not match stored user', () async {
      when(() => local.hasValidOfflineAuth()).thenAnswer((_) async => true);
      when(() => local.getUser()).thenAnswer((_) async => user);

      await expectLater(
        () => repository.authenticateOffline('other-user', 'secret'),
        throwsA(
          predicate(
            (error) => error.toString().contains('Offline login user mismatch'),
          ),
        ),
      );
    });

    test('rejects when offline password verifier fails', () async {
      when(() => local.hasValidOfflineAuth()).thenAnswer((_) async => true);
      when(() => local.getUser()).thenAnswer((_) async => user);
      when(() => local.verifyOfflineCredentials(any(), any()))
          .thenAnswer((_) async => false);

      await expectLater(
        () => repository.authenticateOffline('mandor', 'wrong-password'),
        throwsA(
          predicate(
            (error) => error
                .toString()
                .contains('Invalid username or password for offline login'),
          ),
        ),
      );
    });

    test('requires biometric when biometric is enabled', () async {
      when(() => local.hasValidOfflineAuth()).thenAnswer((_) async => true);
      when(() => local.getUser()).thenAnswer((_) async => user);
      when(() => local.verifyOfflineCredentials(any(), any()))
          .thenAnswer((_) async => true);
      when(() => local.isBiometricEnabled()).thenAnswer((_) async => true);
      when(() => local.isBiometricSupported()).thenAnswer((_) async => true);
      when(() => local.authenticateBiometric(
            reason: any(named: 'reason'),
            allowFallback: any(named: 'allowFallback'),
            checkEnabled: any(named: 'checkEnabled'),
          )).thenAnswer((_) async => false);

      await expectLater(
        () => repository.authenticateOffline('mandor', 'secret'),
        throwsA(
          predicate(
            (error) => error
                .toString()
                .contains('Biometric verification required for offline login'),
          ),
        ),
      );
    });

    test('succeeds when password verifier passes and biometric is disabled',
        () async {
      when(() => local.hasValidOfflineAuth()).thenAnswer((_) async => true);
      when(() => local.getUser()).thenAnswer((_) async => user);
      when(() => local.verifyOfflineCredentials(any(), any()))
          .thenAnswer((_) async => true);
      when(() => local.isBiometricEnabled()).thenAnswer((_) async => false);
      when(() => local.isBiometricSupported()).thenAnswer((_) async => true);
      when(() => local.getAccessToken())
          .thenAnswer((_) async => 'access-token');
      when(() => local.isDeviceTrusted()).thenAnswer((_) async => true);

      final response = await repository.authenticateOffline('mandor', 'secret');

      expect(response.user.username, user.username);
      expect(response.accessToken, 'access-token');
      verifyNever(
        () => local.authenticateBiometric(
          reason: any(named: 'reason'),
          allowFallback: any(named: 'allowFallback'),
          checkEnabled: any(named: 'checkEnabled'),
        ),
      );
    });
  });

  group('AuthRepositoryImpl biometric policy', () {
    late MockAuthRemoteDataSource remote;
    late MockAuthLocalDataSource local;
    late MockConnectivityService connectivity;
    late AuthRepositoryImpl repository;

    setUp(() {
      remote = MockAuthRemoteDataSource();
      local = MockAuthLocalDataSource();
      connectivity = MockConnectivityService();
      repository = AuthRepositoryImpl(
        remoteDataSource: remote,
        localDataSource: local,
        connectivityService: connectivity,
      );
    });

    test('authenticateWithBiometric uses strict biometric-only policy',
        () async {
      when(() => local.authenticateBiometric(
            reason: any(named: 'reason'),
            allowFallback: any(named: 'allowFallback'),
            checkEnabled: any(named: 'checkEnabled'),
          )).thenAnswer((_) async => true);

      final result = await repository.authenticateWithBiometric();

      expect(result, true);
      verify(() => local.authenticateBiometric(
            reason: any(named: 'reason'),
            allowFallback: false,
            checkEnabled: true,
          )).called(1);
    });
  });

  group('AuthRepositoryImpl login', () {
    late MockAuthRemoteDataSource remote;
    late MockAuthLocalDataSource local;
    late MockConnectivityService connectivity;
    late AuthRepositoryImpl repository;

    final user = const User(
      id: 'user-1',
      username: 'mandor',
      email: 'mandor@agrinova.local',
      role: 'MANDOR',
      fullName: 'Mandor',
    );

    JWTLoginResponse buildResponse() => JWTLoginResponse(
          accessToken: 'access',
          refreshToken: 'refresh',
          offlineToken: 'offline',
          deviceBinding: 'binding',
          tokenType: 'Bearer',
          expiresIn: 3600,
          expiresAt: DateTime.now().add(const Duration(hours: 1)),
          user: user,
          deviceTrusted: true,
        );

    setUp(() {
      remote = MockAuthRemoteDataSource();
      local = MockAuthLocalDataSource();
      connectivity = MockConnectivityService();
      repository = AuthRepositoryImpl(
        remoteDataSource: remote,
        localDataSource: local,
        connectivityService: connectivity,
      );

      when(() => connectivity.isOnline).thenReturn(true);
      when(() => local.saveAuthData(
            any(),
            rememberDevice: any(named: 'rememberDevice'),
          )).thenAnswer((_) async {});
      when(() => local.saveOfflineCredentials(any(), any()))
          .thenAnswer((_) async {});
      when(() => local.clearOfflineCredentials()).thenAnswer((_) async {});
    });

    test('stores offline credential verifier when rememberDevice is true',
        () async {
      when(() => remote.login(any())).thenAnswer((_) async => buildResponse());

      await repository.login(const JWTLoginRequest(
        username: 'mandor',
        password: 'password123',
        deviceId: 'device-1',
        deviceFingerprint: 'fingerprint-1',
        rememberDevice: true,
      ));

      verify(() => local.saveOfflineCredentials('mandor', 'password123'))
          .called(1);
      verifyNever(() => local.clearOfflineCredentials());
    });

    test('clears offline credential verifier when rememberDevice is false',
        () async {
      when(() => remote.login(any())).thenAnswer((_) async => buildResponse());

      await repository.login(const JWTLoginRequest(
        username: 'mandor',
        password: 'password123',
        deviceId: 'device-1',
        deviceFingerprint: 'fingerprint-1',
        rememberDevice: false,
      ));

      verify(() => local.clearOfflineCredentials()).called(1);
      verifyNever(() => local.saveOfflineCredentials(any(), any()));
    });
  });
}
