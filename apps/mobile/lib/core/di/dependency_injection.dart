import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:internet_connection_checker/internet_connection_checker.dart';
import 'package:local_auth/local_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:camera/camera.dart';

import '../constants/api_constants.dart';
import '../services/jwt_storage_service.dart';
import '../services/unified_secure_storage_service.dart';
import '../services/connectivity_service.dart';
import '../services/database_service.dart';
import '../database/enhanced_database_service.dart';
import '../services/permission_service.dart';
import '../services/biometric_auth_service.dart';
import '../services/device_service.dart';
import '../network/graphql_client_service.dart';
import '../graphql/graphql_client.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/data/repositories/auth_repository.dart';
import '../../features/auth/data/services/graphql_auth_service.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/datasources/auth_local_datasource.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/presentation/blocs/auth_bloc.dart';
import '../../features/auth/presentation/blocs/biometric_auth_bloc.dart';
import '../../features/harvest/data/repositories/harvest_repository.dart';
import '../../features/harvest/presentation/blocs/harvest_bloc.dart';
import '../../features/dashboard/presentation/blocs/mandor_dashboard_bloc.dart';
import '../services/location_service.dart';
import '../services/camera_service.dart';
import '../services/graphql_sync_service.dart';
import '../services/harvest_sync_service.dart';
import '../services/mandor_master_sync_service.dart';
import '../../features/approval/data/repositories/approval_repository.dart';
import '../../features/approval/presentation/blocs/approval_bloc.dart';
import '../../features/monitoring/data/repositories/monitoring_repository.dart';
import '../../features/monitoring/presentation/blocs/monitoring_bloc.dart';
import '../../features/dashboard/data/repositories/area_manager_dashboard_repository.dart';
import '../../features/dashboard/data/repositories/manager_dashboard_repository.dart';
import '../../features/dashboard/data/repositories/company_admin_dashboard_repository.dart';
import '../../features/dashboard/data/repositories/super_admin_dashboard_repository.dart';
import '../../features/dashboard/presentation/blocs/area_manager_dashboard_bloc.dart';
import '../../features/dashboard/presentation/blocs/manager_dashboard_bloc.dart';
import '../services/fcm_service.dart';
import '../services/notification_storage_service.dart';

final sl = GetIt.instance;

class ServiceLocator {
  static Future<void> init() async {
    // External
    final sharedPreferences = await SharedPreferences.getInstance();
    sl.registerLazySingleton(() => sharedPreferences);
    sl.registerLazySingleton(() => Logger());
    sl.registerLazySingleton(() => Connectivity());
    sl.registerLazySingleton(() => InternetConnectionChecker.instance);
    sl.registerLazySingleton(() => LocalAuthentication());
    sl.registerLazySingleton(() => FirebaseMessaging.instance);
    sl.registerLazySingleton(() => FlutterLocalNotificationsPlugin());

    // FCM Service (singleton for push notifications)
    sl.registerLazySingleton<FCMService>(() => FCMService());

    // Notification Storage Service (for storing FCM notifications locally)
    sl.registerLazySingleton<NotificationStorageService>(
        () => NotificationStorageService());

    // Core Services
    sl.registerLazySingleton<ConnectivityService>(() => ConnectivityService(
          sl(),
        ));

    await UnifiedSecureStorageService.initialize();

    // ignore: deprecated_member_use_from_same_package
    sl.registerLazySingleton<JWTStorageService>(() => JWTStorageService());

    sl.registerLazySingleton<DeviceService>(() => DeviceService());

    sl.registerLazySingleton<GraphQLClientService>(() => AgroGraphQLClient(
          connectivityService: sl(),
        ));

    // Initialize GraphQL client with base URL
    final graphqlClient = sl<GraphQLClientService>();
    await graphqlClient.initialize(baseUrl: ApiConstants.baseUrl);

    sl.registerLazySingleton<GraphQLAuthService>(() => GraphQLAuthService(
          graphqlClient: sl<GraphQLClientService>(),
        ));

    sl.registerLazySingleton<BiometricAuthService>(() => BiometricAuthService(
          localAuth: sl<LocalAuthentication>(),
        ));

    sl.registerLazySingleton<DatabaseService>(() => DatabaseService());
    sl.registerLazySingleton<EnhancedDatabaseService>(
        () => EnhancedDatabaseService());

    // Permission Service (needed by Location and Camera services)
    sl.registerLazySingleton<PermissionService>(() => PermissionService());

    // Get available cameras
    List<CameraDescription> cameras = [];
    try {
      cameras = await availableCameras();
    } catch (e) {
      // Camera not available - continue without cameras
    }

    sl.registerLazySingleton<LocationService>(() => LocationService(
          permissionService: sl<PermissionService>(),
        ));

    sl.registerLazySingleton<CameraService>(() => CameraService(
          cameras: cameras,
          permissionService: sl<PermissionService>(),
        ));

    sl.registerLazySingleton<GraphQLSyncService>(() => GraphQLSyncService(
          database: sl<EnhancedDatabaseService>(),
          graphqlClient: sl<GraphQLClientService>() as AgroGraphQLClient,
          connectivity: sl<ConnectivityService>(),
        ));

    sl.registerLazySingleton<HarvestSyncService>(() => HarvestSyncService(
          graphqlClient: sl<GraphQLClientService>() as AgroGraphQLClient,
          databaseService: sl<EnhancedDatabaseService>(),
        ));

    sl.registerLazySingleton<MandorMasterSyncService>(
        () => MandorMasterSyncService(
              graphqlClient: sl<GraphQLClientService>() as AgroGraphQLClient,
              databaseService: sl<EnhancedDatabaseService>(),
            ));

    await _registerRepositories();
    await _registerBlocs();
  }

  static Future<void> _registerRepositories() async {
    // Auth Data Sources
    sl.registerLazySingleton<AuthRemoteDataSource>(
        () => AuthRemoteDataSourceImpl(
              sl<GraphQLAuthService>(),
            ));

    sl.registerLazySingleton<AuthLocalDataSource>(() => AuthLocalDataSourceImpl(
          localAuth: sl<LocalAuthentication>(),
          biometricAuthService: sl<BiometricAuthService>(),
        ));

    // Auth Repository
    sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(
          remoteDataSource: sl<AuthRemoteDataSource>(),
          localDataSource: sl<AuthLocalDataSource>(),
          connectivityService: sl<ConnectivityService>(),
        ));

    // Auth Use Cases
    sl.registerLazySingleton(() => LoginUseCase(sl()));
    sl.registerLazySingleton(() => LogoutUseCase(sl()));

    sl.registerLazySingleton<HarvestRepository>(() => HarvestRepositoryImpl(
          databaseService: sl<EnhancedDatabaseService>(),
          locationService: sl<LocationService>(),
          cameraService: sl<CameraService>(),
          connectivityService: sl<ConnectivityService>(),
        ));

    sl.registerLazySingleton<ApprovalRepository>(() => ApprovalRepositoryImpl(
          graphQLClient: sl<GraphQLClientService>() as AgroGraphQLClient,
        ));

    sl.registerLazySingleton<MonitoringRepository>(
        () => MonitoringRepositoryImpl(
              approvalRepository: sl<ApprovalRepository>(),
              graphqlClient: sl<GraphQLClientService>(),
            ));

    sl.registerLazySingleton<AreaManagerDashboardRepository>(
        () => AreaManagerDashboardRepository(
              graphqlClient: sl<GraphQLClientService>(),
            ));

    sl.registerLazySingleton<ManagerDashboardRepository>(
      () =>
          ManagerDashboardRepository(graphqlClient: sl<GraphQLClientService>()),
    );

    sl.registerLazySingleton<CompanyAdminDashboardRepository>(
      () => CompanyAdminDashboardRepository(
        graphqlClient: sl<GraphQLClientService>(),
      ),
    );

    sl.registerLazySingleton<SuperAdminDashboardRepository>(
      () => SuperAdminDashboardRepository(
        graphqlClient: sl<GraphQLClientService>(),
      ),
    );
  }

  static Future<void> _registerBlocs() async {
    sl.registerFactory(() => AuthBloc(
          authRepository: sl(),
          connectivityService: sl(),
        ));

    sl.registerFactory(() => BiometricAuthBloc(
          biometricAuthService: sl<BiometricAuthService>(),
        ));

    sl.registerFactory(() => HarvestBloc(
          harvestRepository: sl<HarvestRepository>(),
          locationService: sl<LocationService>(),
          cameraService: sl<CameraService>(),
          syncService: sl<GraphQLSyncService>(),
        ));

    sl.registerFactory(() => MandorDashboardBloc(
          harvestRepository: sl<HarvestRepository>(),
        ));

    sl.registerFactory(() => ApprovalBloc(
          approvalRepository: sl<ApprovalRepository>(),
        ));

    sl.registerFactory(() => MonitoringBloc(
          monitoringRepository: sl<MonitoringRepository>(),
        ));

    sl.registerFactory(() => AreaManagerDashboardBloc(
          repository: sl<AreaManagerDashboardRepository>(),
        ));

    sl.registerFactory(() => ManagerDashboardBloc(
          repository: sl<ManagerDashboardRepository>(),
        ));
  }
}

// Helper function for easy access
T locate<T extends Object>() => sl<T>();
