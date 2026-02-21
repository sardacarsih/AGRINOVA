// @deprecated This file is deprecated and not used.
// Use `dependency_injection.dart` instead for all service registrations.
// This file will be removed in a future version.

import 'package:get_it/get_it.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:local_auth/local_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:camera/camera.dart';

import '../services/jwt_storage_service.dart';
import '../services/unified_secure_storage_service.dart';
import '../services/connectivity_service.dart';
import '../services/database_service.dart';
import '../services/biometric_auth_service.dart';
import '../services/device_service.dart';
import '../services/location_service.dart';
import '../services/camera_service.dart';
import '../services/notification_service.dart';
import '../services/permission_service.dart';
import '../services/jwt_qr_service.dart';
import '../database/enhanced_database_service.dart';
import '../services/gate_check_camera_service.dart';
import '../graphql/graphql_client.dart';
import '../services/user_sync_service.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/data/repositories/auth_repository.dart';
import '../../features/auth/data/services/graphql_auth_service.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/datasources/auth_local_datasource.dart';

final GetIt sl = GetIt.instance;

@Deprecated('Use ServiceLocator from dependency_injection.dart instead')
class ServiceLocator {
  static Future<void> init() async {
    await _registerExternalDependencies();
    await _registerCoreServices();
    await _registerDataSources();
    await _registerRepositories();
    await _registerBlocs();
  }

  static Future<void> _registerExternalDependencies() async {
    // Register External Services
    sl.registerLazySingleton<LocalAuthentication>(() => LocalAuthentication());
    sl.registerLazySingleton<FirebaseMessaging>(
        () => FirebaseMessaging.instance);
    sl.registerLazySingleton<FlutterLocalNotificationsPlugin>(
        () => FlutterLocalNotificationsPlugin());
    sl.registerLazySingleton<Connectivity>(() => Connectivity());

    // Initialize available cameras
    try {
      final cameras = await availableCameras();
      sl.registerSingleton<List<CameraDescription>>(cameras);
    } catch (e) {
      sl.registerSingleton<List<CameraDescription>>([]);
    }
  }

  static Future<void> _registerCoreServices() async {
    // Core Services
    await UnifiedSecureStorageService.initialize();
    // ignore: deprecated_member_use_from_same_package
    sl.registerLazySingleton<JWTStorageService>(() => JWTStorageService());
    sl.registerLazySingleton<DatabaseService>(() => DatabaseService());
    sl.registerLazySingleton<PermissionService>(() => PermissionService());
    sl.registerLazySingleton<ConnectivityService>(
        () => ConnectivityService(sl<Connectivity>()));
    sl.registerLazySingleton<UserSyncService>(() => UserSyncService());

    // Advanced Services
    sl.registerLazySingleton<LocationService>(() => LocationService(
          permissionService: sl<PermissionService>(),
        ));

    sl.registerLazySingleton<CameraService>(() => CameraService(
          cameras: sl<List<CameraDescription>>(),
          permissionService: sl<PermissionService>(),
        ));

    sl.registerLazySingleton<NotificationService>(() => NotificationService(
          firebaseMessaging: sl<FirebaseMessaging>(),
          localNotifications: sl<FlutterLocalNotificationsPlugin>(),
        ));

    // Device Service
    sl.registerLazySingleton<DeviceService>(() => DeviceService());

    // Biometric Auth Service
    sl.registerLazySingleton<BiometricAuthService>(() => BiometricAuthService(
          localAuth: sl<LocalAuthentication>(),
        ));

    // Register Enhanced Database Service
    sl.registerLazySingleton<EnhancedDatabaseService>(
        () => EnhancedDatabaseService());

    // Register Gate Check specific services
    sl.registerLazySingleton<GateCheckCameraService>(
        () => GateCheckCameraService(
              permissionService: sl<PermissionService>(),
              locationService: sl<LocationService>(),
            ));

    sl.registerLazySingleton<JWTQRService>(() => JWTQRService());

    // Register minimal Dio Client for app updates
    // Removed for now as we're using GraphQL
  }

  static Future<void> _registerDataSources() async {
    // GraphQL Services
    sl.registerLazySingleton<AgroGraphQLClient>(() => AgroGraphQLClient(
          connectivityService: sl<ConnectivityService>(),
        ));

    sl.registerLazySingleton<GraphQLAuthService>(() => GraphQLAuthService(
          graphqlClient: sl<AgroGraphQLClient>(),
        ));

    sl.registerLazySingleton<AuthRemoteDataSource>(
        () => AuthRemoteDataSourceImpl(sl<GraphQLAuthService>()));

    sl.registerLazySingleton<AuthLocalDataSource>(
      () => AuthLocalDataSourceImpl(
        localAuth: sl<LocalAuthentication>(),
        biometricAuthService: sl<BiometricAuthService>(),
      ),
    );
  }

  static Future<void> _registerRepositories() async {
    // Auth Repository
    sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(
          remoteDataSource: sl<AuthRemoteDataSource>(),
          localDataSource: sl<AuthLocalDataSource>(),
          connectivityService: sl<ConnectivityService>(),
        ));
  }

  static Future<void> _registerBlocs() async {
    // Auth BLoC is registered in the auth feature
  }
}

// Helper function for easy access
T locate<T extends Object>() => sl<T>();
