import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:logger/logger.dart';

import '../../domain/repositories/auth_repository.dart';
import '../../../../core/models/jwt_models.dart';
import '../../../../core/services/unified_secure_storage_service.dart';
import '../../../../core/services/device_service.dart';
import '../../../../core/services/role_service.dart';
import '../../../../core/services/security_monitor.dart';
import '../../../../core/services/connectivity_service.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/services/fcm_service.dart';
import '../../../../core/services/notification_storage_service.dart';
import '../../../../core/database/enhanced_database_service.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  static final Logger _logger = Logger();

  final AuthRepository _authRepository;
  final ConnectivityService _connectivityService;

  late StreamSubscription<bool> _authStatusSubscription;
  late StreamSubscription<NetworkStatus> _networkStatusSubscription;

  AuthBloc({
    required AuthRepository authRepository,
    required ConnectivityService connectivityService,
  })  : _authRepository = authRepository,
        _connectivityService = connectivityService,
        super(AuthInitial()) {
    // Register event handlers
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
    on<AuthEmergencyLogoutRequested>(_onAuthEmergencyLogoutRequested);
    on<AuthRefreshRequested>(_onAuthRefreshRequested);
    on<AuthStatusChanged>(_onAuthStatusChanged);
    on<AuthBiometricRequested>(_onAuthBiometricRequested);
    on<AuthBiometricSetupRequested>(_onAuthBiometricSetupRequested);
    on<AuthOfflineLoginRequested>(_onAuthOfflineLoginRequested);
    on<AuthDeviceTrustRequested>(_onAuthDeviceTrustRequested);
    on<AuthPasswordChangeRequested>(_onAuthPasswordChangeRequested);
    on<AuthLocalUserUpdated>(_onAuthLocalUserUpdated);

    // Listen to auth status changes
    _authStatusSubscription = _authRepository.authStatusStream.listen(
      (isAuthenticated) => add(AuthStatusChanged(isAuthenticated)),
      onError: (error) {
        _logger.e('Auth status stream error: $error');
        add(AuthStatusChanged(false));
      },
    );

    // Listen to network status changes for enhanced connectivity awareness
    _networkStatusSubscription =
        _connectivityService.networkStatusStream.listen(
      (networkStatus) {
        _logger.d('Network status changed: $networkStatus');
        // Add network-specific handling if needed
      },
      onError: (error) {
        _logger.e('Network status stream error: $error');
      },
    );
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      _logger.d('Checking authentication status');

      // "Remember this device" is role-agnostic and must apply for all roles.
      // If disabled, force fresh login on app start.
      final rememberDeviceEnabled =
          await UnifiedSecureStorageService.isRememberDeviceEnabled();
      if (!rememberDeviceEnabled) {
        await UnifiedSecureStorageService.clearAuthData();
        emit(AuthUnauthenticated());
        return;
      }

      final isAuthenticated =
          await UnifiedSecureStorageService.isAuthenticated();

      if (!isAuthenticated) {
        // Check if we're offline and have valid offline auth for supported roles
        final isOnline = _connectivityService.isOnline;
        if (!isOnline) {
          final hasValidOffline =
              await UnifiedSecureStorageService.hasValidOfflineAuth();
          if (hasValidOffline) {
            final user = await UnifiedSecureStorageService.getUserInfo();
            if (user != null && _isOfflineCapableRole(user.role)) {
              _logger.i('Offline mode: Valid offline token for ${user.role}');

              // Check if biometric/PIN is required for offline access
              final biometricAvailable =
                  await _authRepository.isBiometricAvailable();
              final biometricEnabled =
                  await _authRepository.isBiometricEnabled();

              if (biometricEnabled && biometricAvailable) {
                _logger.i('Biometric verification required for offline access');
                emit(const AuthBiometricRequired(
                  reason: 'Verifikasi identitas untuk akses offline',
                ));
                return;
              }

              // No biometric required, grant offline access directly
              await _configureNotificationStorageForUser(user);
              emit(AuthOfflineMode(
                user: user,
                lastSync: DateTime.now(),
              ));
              return;
            }
          }
        }

        _logger.d('User not authenticated or token expired');
        emit(AuthUnauthenticated());
        return;
      }

      // User is authenticated, get user info
      final user = await UnifiedSecureStorageService.getUserInfo();
      if (user == null) {
        _logger.w('User info not found, logging out');
        emit(AuthUnauthenticated());
        return;
      }

      // If online and token needs refresh, attempt refresh
      final isOnline = _connectivityService.isOnline;
      if (isOnline) {
        final needsRefresh =
            await UnifiedSecureStorageService.needsTokenRefresh();
        if (needsRefresh) {
          _logger.i('Token needs refresh, attempting auto-refresh...');
          final refreshSuccess = await _attemptTokenRefresh();
          if (!refreshSuccess) {
            _logger.w('Token refresh failed, requiring re-login');
            emit(AuthUnauthenticated());
            return;
          }
          _logger.i('Token refreshed successfully');
        }
      }

      final deviceTrusted = await UnifiedSecureStorageService.isDeviceTrusted();
      final biometricAvailable = await _authRepository.isBiometricAvailable();
      final biometricEnabled = await _authRepository.isBiometricEnabled();

      _logger.d('User authenticated: ${user.username}, role: ${user.role}');
      await _configureDatabaseProfileForUser(user);

      if (biometricEnabled && biometricAvailable) {
        _logger.i('Biometric enabled, requesting authentication');
        emit(const AuthBiometricRequired(
          reason: 'Silakan verifikasi identitas Anda untuk melanjutkan',
        ));
      } else {
        await _configureNotificationStorageForUser(user);
        emit(AuthAuthenticated(
          user: user,
          deviceTrusted: deviceTrusted,
          biometricAvailable: biometricAvailable,
          biometricEnabled: biometricEnabled,
          isOfflineMode: !isOnline,
        ));

        // Initialize FCM service and register token for push notifications
        try {
          final fcmService = ServiceLocator.get<FCMService>();
          await fcmService.initialize();
          await fcmService.registerTokenIfAuthenticated();
        } catch (e) {
          _logger.w('Failed to initialize FCM service: $e');
        }
      }
    } catch (e) {
      _logger.e('Failed to check authentication: $e');
      emit(AuthError(message: 'Failed to check authentication: $e'));
    }
  }

  /// Check if role supports offline mode
  bool _isOfflineCapableRole(String role) {
    return role == 'MANDOR' || role == 'SATPAM';
  }

  Future<void> _configureDatabaseProfileForUser(User user) async {
    try {
      await ServiceLocator.get<EnhancedDatabaseService>()
          .configureDatabaseForRole(user.role);
    } catch (e) {
      _logger
          .w('Failed to configure role database profile for ${user.role}: $e');
    }
  }

  Future<void> _configureNotificationStorageForUser(User user) async {
    try {
      final storage = ServiceLocator.get<NotificationStorageService>();
      await storage.initialize();
      await storage.setActiveUser(user.id);
    } catch (e) {
      _logger.w(
          'Failed to configure notification storage for user ${user.id}: $e');
    }
  }

  Future<void> _clearNotificationStorageScope() async {
    try {
      final storage = ServiceLocator.get<NotificationStorageService>();
      await storage.initialize();
      await storage.clearOnLogout();
    } catch (e) {
      _logger.w('Failed to clear notification storage scope: $e');
    }
  }

  /// Attempt to refresh the token
  Future<bool> _attemptTokenRefresh() async {
    try {
      final refreshToken = await UnifiedSecureStorageService.getRefreshToken();
      if (refreshToken == null) return false;

      final deviceInfo = await DeviceService.getDeviceInfo();
      final refreshRequest = JWTRefreshRequest(
        refreshToken: refreshToken,
        deviceId: deviceInfo.deviceId,
        fingerprint: deviceInfo.fingerprint,
      );

      final response = await _authRepository.refreshToken(refreshRequest);
      await UnifiedSecureStorageService.storeRefreshTokens(response);
      return true;
    } catch (e) {
      _logger.e('Token refresh failed: $e');
      return false;
    }
  }

  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      _logger.d('Processing login request for: ${event.username}');

      // Get network status for enhanced logging
      final networkStatus = _connectivityService.currentStatus;
      _logger.d('Current network status: $networkStatus');

      // Log authentication attempt
      await SecurityMonitor.instance.logAuthEvent(
        SecurityEventType.login,
        'Login attempt started',
        username: event.username,
        metadata: {
          'networkStatus': networkStatus.name,
          'biometricRequested': event.biometricHash != null,
          'rememberDevice': event.rememberDevice ?? false,
        },
        severity: 'low',
      );

      final deviceInfo = await DeviceService.getDeviceInfo();

      final loginRequest = JWTLoginRequest(
        username: event.username,
        password: event.password,
        deviceId: deviceInfo.deviceId,
        deviceFingerprint: deviceInfo.fingerprint,
        biometricHash: event.biometricHash,
        rememberDevice: event.rememberDevice,
      );

      // Repository now handles all authentication logic including network awareness
      final response = await _authRepository.login(loginRequest);

      // Check role permissions (non-blocking)
      try {
        final hasPermissions =
            RoleService.hasEssentialPermissions(response.user.role);
        if (!hasPermissions) {
          _logger
              .w('User role ${response.user.role} lacks essential permissions');
          await SecurityMonitor.instance.logSuspiciousActivity(
            'User with insufficient role permissions attempted login',
            userId: response.user.id,
            username: response.user.username,
            details: {'role': response.user.role},
          );
        }
      } catch (permissionError) {
        _logger.w('Failed to check role permissions: $permissionError');
        // Don't fail login due to permission check errors
      }

      final biometricAvailable = await _authRepository.isBiometricAvailable();
      final biometricEnabled = await _authRepository.isBiometricEnabled();

      _logger.d(
          'Login successful for: ${response.user.username}, role: ${response.user.role}');
      await _configureDatabaseProfileForUser(response.user);
      await _configureNotificationStorageForUser(response.user);

      emit(AuthAuthenticated(
        user: response.user,
        deviceTrusted: response.deviceTrusted,
        biometricAvailable: biometricAvailable,
        biometricEnabled: biometricEnabled,
        isFirstLogin: response.isFirstLogin ?? false,
        isOfflineMode: networkStatus == NetworkStatus.offline,
      ));

      // Initialize FCM service and register token after successful login
      try {
        final fcmService = ServiceLocator.get<FCMService>();
        await fcmService.initialize();
        await fcmService.registerTokenIfAuthenticated();
      } catch (e) {
        _logger.w('Failed to initialize FCM service post-login: $e');
      }
    } catch (e) {
      _logger.e('Login failed: $e');
      _logger.e('Login error details - Type: ${e.runtimeType}');
      _logger.e('Login error stack trace: ${StackTrace.current}');

      // Log additional context for debugging
      final networkStatus = _connectivityService.currentStatus;
      _logger.d('Current network status during error: $networkStatus');

      // Enhanced error logging for security issues
      await SecurityMonitor.instance.logAuthEvent(
        SecurityEventType.login,
        'Login failed in AuthBloc: ${e.toString()}',
        username: event.username,
        metadata: {
          'successful': false,
          'errorType': e.runtimeType.toString(),
          'errorMessage': e.toString(),
          'networkStatus': networkStatus.name,
          'blocLocation': 'AuthBloc._onAuthLoginRequested',
          'line': '171', // For debugging reference
        },
        severity: 'medium',
      );

      // Provide user-friendly error message
      String userMessage;
      if (e.toString().contains('Invalid username or password')) {
        userMessage =
            'Invalid username or password. Please check your credentials.';
      } else if (e.toString().contains('Network error') ||
          e.toString().contains('Unable to connect')) {
        userMessage =
            'Unable to connect to server. Please check your internet connection and try again.';
      } else if (e.toString().contains('timeout')) {
        userMessage =
            'Connection timeout. Please check your network and try again.';
      } else if (e.toString().contains('Server error')) {
        userMessage = 'Server error. Please try again later.';
      } else if (e.toString().contains('Security validation') ||
          e.toString().contains('JWT validation')) {
        userMessage =
            'Authentication validation error. Please try again or contact support if the issue persists.';
      } else {
        userMessage =
            'Login failed. Please try again or contact support if the issue persists.';
      }

      emit(AuthError(message: userMessage));
    }
  }

  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    // Immediate loading state for user feedback
    emit(AuthLoading());

    try {
      // Fast logout with optimized cleanup
      await _authRepository.logout();
      await ServiceLocator.get<EnhancedDatabaseService>()
          .resetToDefaultDatabaseProfile();

      // Unregister FCM token
      try {
        await ServiceLocator.get<FCMService>().unregisterToken();
      } catch (e) {
        _logger.w('Failed to unregister FCM token: $e');
      }

      await _clearNotificationStorageScope();

      _logger.d('Fast logout completed successfully');
    } catch (e) {
      // Even if cleanup encounters errors, user is logged out
      _logger.w(
          'Logout completed with cleanup warnings (user still logged out): $e');
    }

    // Always emit AuthUnauthenticated quickly
    emit(AuthUnauthenticated());
    _logger.d('User logged out - UI updated');
  }

  Future<void> _onAuthEmergencyLogoutRequested(
    AuthEmergencyLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    // Instant logout - no loading state, immediate result
    _logger.d('Emergency logout requested - executing instant logout');

    try {
      // Ultra-fast logout
      await _authRepository.emergencyLogout();
      await ServiceLocator.get<EnhancedDatabaseService>()
          .resetToDefaultDatabaseProfile();
      await _clearNotificationStorageScope();
      _logger.d('Emergency logout completed instantly');
    } catch (e) {
      // Even if emergency logout has issues, user is logged out
      _logger.w('Emergency logout completed with warnings: $e');
    }

    // Immediate state update
    emit(AuthUnauthenticated());
    _logger.d('Emergency logout - UI updated instantly');
  }

  Future<void> _onAuthRefreshRequested(
    AuthRefreshRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final refreshToken = await UnifiedSecureStorageService.getRefreshToken();
      if (refreshToken == null) {
        emit(AuthUnauthenticated());
        return;
      }

      final deviceInfo = await DeviceService.getDeviceInfo();
      final refreshRequest = JWTRefreshRequest(
        refreshToken: refreshToken,
        deviceId: deviceInfo.deviceId,
        fingerprint: deviceInfo.fingerprint,
      );

      final response = await _authRepository.refreshToken(refreshRequest);
      await UnifiedSecureStorageService.storeRefreshTokens(response);

      if (state is AuthAuthenticated) {
        final currentState = state as AuthAuthenticated;
        emit(currentState.copyWith(deviceTrusted: response.deviceTrusted));
      }
    } catch (e) {
      emit(AuthError(message: 'Failed to refresh token: $e'));
    }
  }

  void _onAuthStatusChanged(
    AuthStatusChanged event,
    Emitter<AuthState> emit,
  ) {
    if (!event.isAuthenticated && state is! AuthUnauthenticated) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthBiometricRequested(
    AuthBiometricRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      _logger.d('Processing biometric authentication request');

      // Check if biometric is available and enabled
      final isAvailable = await _authRepository.isBiometricAvailable();
      if (!isAvailable) {
        emit(AuthError(message: 'Biometric authentication not available'));
        return;
      }

      final isEnabled = await _authRepository.isBiometricEnabled();
      if (!isEnabled) {
        emit(AuthError(message: 'Biometric authentication not enabled'));
        return;
      }

      // Perform biometric authentication
      final isAuthenticated = await _authRepository.authenticateWithBiometric();
      if (isAuthenticated) {
        final isOnline = _connectivityService.isOnline;

        // Biometric auth is only a local verification. We still require
        // a valid local session/token before granting app access.
        if (isOnline) {
          final hasValidSession =
              await UnifiedSecureStorageService.isAuthenticated();
          if (!hasValidSession) {
            _logger
                .w('Biometric auth passed but no valid online session found');
            emit(const AuthUnauthenticated());
            return;
          }

          final needsRefresh =
              await UnifiedSecureStorageService.needsTokenRefresh();
          if (needsRefresh) {
            final refreshSuccess = await _attemptTokenRefresh();
            if (!refreshSuccess) {
              _logger.w('Biometric auth passed but token refresh failed');
              emit(const AuthUnauthenticated());
              return;
            }
          }
        } else {
          final hasValidOffline =
              await UnifiedSecureStorageService.hasValidOfflineAuth();
          if (!hasValidOffline) {
            _logger
                .w('Biometric auth passed but no valid offline session found');
            emit(const AuthUnauthenticated());
            return;
          }
        }

        final user = await UnifiedSecureStorageService.getUserInfo();
        final deviceTrusted =
            await UnifiedSecureStorageService.isDeviceTrusted();

        if (user != null) {
          _logger
              .d('Biometric authentication successful for: ${user.username}');
          await _configureDatabaseProfileForUser(user);
          await _configureNotificationStorageForUser(user);

          // Check connectivity to determine which state to emit
          if (!isOnline && _isOfflineCapableRole(user.role)) {
            emit(AuthOfflineMode(
              user: user,
              lastSync: DateTime.now(), // ideally fetch from storage
            ));
          } else if (!isOnline && !_isOfflineCapableRole(user.role)) {
            _logger.w('Role ${user.role} is not allowed to continue offline');
            emit(const AuthUnauthenticated());
          } else {
            emit(AuthAuthenticated(
              user: user,
              deviceTrusted: deviceTrusted,
              biometricAvailable: true,
              biometricEnabled: true,
              isOfflineMode: !isOnline,
            ));
          }
        } else {
          _logger.w('User info not found after biometric auth');
          emit(AuthUnauthenticated());
        }
      } else {
        _logger.w('Biometric authentication failed');
        emit(AuthError(message: 'Biometric authentication failed'));
      }
    } catch (e) {
      _logger.e('Biometric authentication error: $e');
      emit(AuthError(message: 'Biometric authentication error: $e'));
    }
  }

  Future<void> _onAuthBiometricSetupRequested(
    AuthBiometricSetupRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      _logger.d('Processing biometric setup request');

      final isAvailable = await _authRepository.isBiometricAvailable();
      if (!isAvailable) {
        emit(AuthError(
            message: 'Biometric authentication not available on this device'));
        return;
      }

      final success = await _authRepository.setupBiometric(
        event.enable,
        event.reason ?? 'Please authenticate to enable biometric login',
      );

      if (success) {
        _logger.d(
            'Biometric setup ${event.enable ? 'enabled' : 'disabled'} successfully');

        // Update current state with new biometric status
        if (state is AuthAuthenticated) {
          final currentState = state as AuthAuthenticated;
          emit(currentState.copyWith(
            biometricEnabled: event.enable,
          ));
        }
      } else {
        emit(AuthError(
            message:
                'Failed to ${event.enable ? 'enable' : 'disable'} biometric authentication'));
      }
    } catch (e) {
      _logger.e('Biometric setup error: $e');
      emit(AuthError(message: 'Biometric setup error: $e'));
    }
  }

  Future<void> _onAuthOfflineLoginRequested(
    AuthOfflineLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      _logger.d('Processing offline login request for: ${event.username}');

      final response = await _authRepository.authenticateOffline(
        event.username,
        event.password,
      );

      final biometricAvailable = await _authRepository.isBiometricAvailable();
      final biometricEnabled = await _authRepository.isBiometricEnabled();
      await _configureDatabaseProfileForUser(response.user);
      await _configureNotificationStorageForUser(response.user);

      _logger.d('Offline login successful for: ${response.user.username}');
      emit(AuthAuthenticated(
        user: response.user,
        deviceTrusted: response.deviceTrusted,
        biometricAvailable: biometricAvailable,
        biometricEnabled: biometricEnabled,
        isOfflineMode: true,
      ));
    } catch (e) {
      _logger.e('Offline login error: $e');
      emit(AuthError(message: 'Offline authentication error: $e'));
    }
  }

  Future<void> _onAuthDeviceTrustRequested(
    AuthDeviceTrustRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      _logger.d('Processing device trust request');

      final success = await _authRepository.requestDeviceTrust();

      if (success) {
        _logger.d('Device trust request successful');

        // Update current state with new device trust status
        if (state is AuthAuthenticated) {
          final currentState = state as AuthAuthenticated;
          emit(currentState.copyWith(deviceTrusted: true));
        }
      } else {
        emit(AuthError(message: 'Failed to establish device trust'));
      }
    } catch (e) {
      _logger.e('Device trust error: $e');
      emit(AuthError(message: 'Device trust error: $e'));
    }
  }

  Future<void> _onAuthPasswordChangeRequested(
    AuthPasswordChangeRequested event,
    Emitter<AuthState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuthAuthenticated) {
      return;
    }
    final baseState = currentState.copyWith(clearPasswordChangeError: true);

    try {
      _logger.d('Processing password change request');
      emit(baseState);

      final success = await _authRepository.changePassword(
        event.currentPassword,
        event.newPassword,
        logoutOtherDevices: event.logoutOtherDevices,
      );

      if (success) {
        _logger.d('Password changed successfully');
        emit(
          baseState.copyWith(
            lastPasswordChangedAt: DateTime.now(),
            clearPasswordChangeError: true,
          ),
        );
      } else {
        emit(
          baseState.copyWith(
            passwordChangeErrorMessage: 'Gagal mengubah password.',
          ),
        );
      }
    } catch (e) {
      _logger.e('Password change error: $e');
      emit(
        baseState.copyWith(
          passwordChangeErrorMessage: _mapPasswordChangeErrorMessage(e),
        ),
      );
    }
  }

  String _mapPasswordChangeErrorMessage(Object error) {
    final raw = error.toString();
    final message = raw.startsWith('Exception: ') ? raw.substring(11) : raw;
    final lower = message.toLowerCase();

    if (lower.contains('invalid_current_password') ||
        lower.contains('current password')) {
      return 'Password saat ini tidak sesuai.';
    }
    if (lower.contains('internet') || lower.contains('online')) {
      return 'Perlu koneksi internet untuk mengganti password.';
    }
    if (lower.contains('password')) {
      return message;
    }
    return 'Gagal mengubah password. Silakan coba lagi.';
  }

  Future<void> _onAuthLocalUserUpdated(
    AuthLocalUserUpdated event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await UnifiedSecureStorageService.updateUserProfileFields(
        userId: event.user.id,
        fullName: event.user.fullName,
        email: event.user.email,
        avatar: event.user.avatar,
        companyName: event.user.companyName,
        estate: event.user.estate,
        division: event.user.division,
        managerName: event.user.managerName,
      );

      if (state is AuthAuthenticated) {
        final currentState = state as AuthAuthenticated;
        emit(currentState.copyWith(user: event.user));
      } else if (state is AuthOfflineMode) {
        final currentState = state as AuthOfflineMode;
        emit(AuthOfflineMode(
          user: event.user,
          lastSync: currentState.lastSync,
        ));
      }
    } catch (e) {
      _logger.w('Failed to update local user state: $e');
    }
  }

  @override
  Future<void> close() async {
    await _authStatusSubscription.cancel();
    await _networkStatusSubscription.cancel();
    _logger.d('AuthBloc closed');
    return super.close();
  }
}
