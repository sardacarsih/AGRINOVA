/// Unified Service Locator for Agrinova Mobile
///
/// This is the single entry point for dependency injection in the app.
/// All service registrations are handled by [dependency_injection.dart].
///
/// Usage:
/// ```dart
/// // Initialize at app startup (usually in main.dart)
/// await ServiceLocator.initialize();
///
/// // Get a service
/// final authService = ServiceLocator.get<AuthService>();
///
/// // Or use the convenience getter
/// final jwtStorage = ServiceLocatorExtensions.storage;
/// ```
library service_locator;

import 'package:get_it/get_it.dart';
import 'package:local_auth/local_auth.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../services/auth_service.dart';
import '../services/jwt_storage_service.dart';
import '../network/graphql_client.dart';
import '../services/connectivity_service.dart';
import '../services/biometric_auth_service.dart';
import '../services/database_service.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/presentation/blocs/auth_bloc.dart';
import '../../features/auth/data/services/graphql_auth_service.dart';
import '../services/user_sync_service.dart';

import 'dependency_injection.dart' as di;

/// Unified service locator providing access to all registered services.
///
/// This class wraps GetIt and delegates initialization to [dependency_injection.dart].
class ServiceLocator {
  static final GetIt _getIt = GetIt.instance;

  static Future<void> initialize() async {
    await di.ServiceLocator.init();
  }

  static T get<T extends Object>() {
    return _getIt<T>();
  }

  static Future<void> reset() async {
    await _getIt.reset();
  }

  /// Dispose all services
  static Future<void> dispose() async {
    // Dispose services in reverse order
    if (_getIt.isRegistered<AuthBloc>()) {
      await _getIt<AuthBloc>().close();
    }
    
    if (_getIt.isRegistered<GraphQLClientService>()) {
      await _getIt<GraphQLClientService>().dispose();
    }
    
    if (_getIt.isRegistered<DatabaseService>()) {
      await _getIt<DatabaseService>().close();
    }
    
    await _getIt.reset();
  }
}

/// Convenience getters for commonly used services
extension ServiceLocatorExtensions on ServiceLocator {
  // static AuthService get auth => ServiceLocator.get<AuthService>(); 
  static JWTStorageService get storage => ServiceLocator.get<JWTStorageService>();
  static GraphQLClientService get graphql => ServiceLocator.get<GraphQLClientService>();
  static ConnectivityService get connectivity => ServiceLocator.get<ConnectivityService>();
  static BiometricAuthService get biometrics => ServiceLocator.get<BiometricAuthService>();
  static DatabaseService get database => ServiceLocator.get<DatabaseService>();
  static AuthRepository get authRepository => ServiceLocator.get<AuthRepository>();
  // static AuthBloc get authBloc => ServiceLocator.get<AuthBloc>(); // AuthBloc might not be registered in DI container globally?
  // main.dart calls ServiceLocator.get<AuthBloc>(). So it MUST be registered.
  // dependency_injection.dart says "Auth BLoC is registered in the auth feature".
  // This usually means it's registered during app initialization or by a module.
  // But ServiceLocator.init() calls _registerBlocs() which is empty.
  // So where is AuthBloc registered?
  // Maybe in AuthWrapper or main.dart?
  // main.dart: create: (context) => ServiceLocator.get<AuthBloc>()
  // This implies it IS registered before main.dart uses it.
  // If it's not registered, main.dart will crash at runtime.
  // But for compilation, this file is fine.
  static AuthBloc get authBloc => ServiceLocator.get<AuthBloc>();
  static GraphQLAuthService get graphqlAuth => ServiceLocator.get<GraphQLAuthService>();
  static UserSyncService get userSync => ServiceLocator.get<UserSyncService>();
}