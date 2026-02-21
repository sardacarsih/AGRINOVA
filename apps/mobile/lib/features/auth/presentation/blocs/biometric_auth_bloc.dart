import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:logger/logger.dart';

import '../../../../core/services/biometric_auth_service.dart';

// Events
abstract class BiometricAuthEvent extends Equatable {
  const BiometricAuthEvent();

  @override
  List<Object?> get props => [];
}

class BiometricCapabilitiesRequested extends BiometricAuthEvent {
  const BiometricCapabilitiesRequested();
}

class BiometricAuthenticationRequested extends BiometricAuthEvent {
  final String? reason;
  final BiometricType? preferredType;
  final bool allowFallback;

  const BiometricAuthenticationRequested({
    this.reason,
    this.preferredType,
    this.allowFallback = false,
  });

  @override
  List<Object?> get props => [reason, preferredType, allowFallback];
}

class BiometricEnableRequested extends BiometricAuthEvent {
  final String? reason;

  const BiometricEnableRequested({this.reason});

  @override
  List<Object?> get props => [reason];
}

class BiometricDisableRequested extends BiometricAuthEvent {
  const BiometricDisableRequested();
}

class BiometricStatusRequested extends BiometricAuthEvent {
  const BiometricStatusRequested();
}

class BiometricTypePreferenceChanged extends BiometricAuthEvent {
  final BiometricType type;

  const BiometricTypePreferenceChanged(this.type);

  @override
  List<Object?> get props => [type];
}

class BiometricLockReset extends BiometricAuthEvent {
  const BiometricLockReset();
}

class BiometricStatsRequested extends BiometricAuthEvent {
  const BiometricStatsRequested();
}

// States
abstract class BiometricAuthState extends Equatable {
  const BiometricAuthState();

  @override
  List<Object?> get props => [];
}

class BiometricAuthInitial extends BiometricAuthState {
  const BiometricAuthInitial();
}

class BiometricAuthLoading extends BiometricAuthState {
  final String? message;

  const BiometricAuthLoading({this.message});

  @override
  List<Object?> get props => [message];
}

class BiometricCapabilitiesLoaded extends BiometricAuthState {
  final BiometricCapabilities capabilities;

  const BiometricCapabilitiesLoaded(this.capabilities);

  @override
  List<Object?> get props => [capabilities];
}

class BiometricAuthSuccess extends BiometricAuthState {
  final DateTime timestamp;

  const BiometricAuthSuccess({required this.timestamp});

  @override
  List<Object?> get props => [timestamp];
}

class BiometricAuthFailed extends BiometricAuthState {
  final BiometricAuthResult result;
  final String message;
  final Duration? lockoutTimeRemaining;

  const BiometricAuthFailed({
    required this.result,
    required this.message,
    this.lockoutTimeRemaining,
  });

  @override
  List<Object?> get props => [result, message, lockoutTimeRemaining];
}

class BiometricAuthCancelled extends BiometricAuthState {
  const BiometricAuthCancelled();
}

class BiometricEnabled extends BiometricAuthState {
  final BiometricCapabilities capabilities;
  final BiometricType preferredType;

  const BiometricEnabled({
    required this.capabilities,
    required this.preferredType,
  });

  @override
  List<Object?> get props => [capabilities, preferredType];
}

class BiometricDisabled extends BiometricAuthState {
  const BiometricDisabled();
}

class BiometricStatusLoaded extends BiometricAuthState {
  final bool isEnabled;
  final bool isSupported;
  final bool isEnrolled;
  final BiometricCapabilities capabilities;
  final BiometricType preferredType;
  final bool isLocked;
  final Duration? lockoutTimeRemaining;

  const BiometricStatusLoaded({
    required this.isEnabled,
    required this.isSupported,
    required this.isEnrolled,
    required this.capabilities,
    required this.preferredType,
    required this.isLocked,
    this.lockoutTimeRemaining,
  });

  @override
  List<Object?> get props => [
        isEnabled,
        isSupported,
        isEnrolled,
        capabilities,
        preferredType,
        isLocked,
        lockoutTimeRemaining,
      ];
}

class BiometricStatsLoaded extends BiometricAuthState {
  final Map<String, dynamic> stats;

  const BiometricStatsLoaded(this.stats);

  @override
  List<Object?> get props => [stats];
}

class BiometricAuthError extends BiometricAuthState {
  final String message;
  final String? code;

  const BiometricAuthError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

// BLoC
class BiometricAuthBloc extends Bloc<BiometricAuthEvent, BiometricAuthState> {
  final BiometricAuthService _biometricAuthService;
  static final Logger _logger = Logger();

  BiometricAuthBloc({
    required BiometricAuthService biometricAuthService,
  })  : _biometricAuthService = biometricAuthService,
        super(const BiometricAuthInitial()) {
    on<BiometricCapabilitiesRequested>(_onCapabilitiesRequested);
    on<BiometricAuthenticationRequested>(_onAuthenticationRequested);
    on<BiometricEnableRequested>(_onEnableRequested);
    on<BiometricDisableRequested>(_onDisableRequested);
    on<BiometricStatusRequested>(_onStatusRequested);
    on<BiometricTypePreferenceChanged>(_onTypePreferenceChanged);
    on<BiometricLockReset>(_onLockReset);
    on<BiometricStatsRequested>(_onStatsRequested);
  }

  Future<void> _onCapabilitiesRequested(
    BiometricCapabilitiesRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(
          message: 'Memeriksa kemampuan biometrik...'));

      final capabilities =
          await _biometricAuthService.getBiometricCapabilities();

      emit(BiometricCapabilitiesLoaded(capabilities));

      _logger.d(
          'Biometric capabilities loaded: ${capabilities.availableBiometrics}');
    } catch (e) {
      _logger.e('Error loading biometric capabilities: $e');
      emit(BiometricAuthError(
          message: 'Gagal memeriksa kemampuan biometrik: $e'));
    }
  }

  Future<void> _onAuthenticationRequested(
    BiometricAuthenticationRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(
          message: 'Melakukan autentikasi biometrik...'));

      final result = await _biometricAuthService.authenticate(
        reason: event.reason,
        preferredType: event.preferredType,
        allowFallback: event.allowFallback,
      );

      switch (result) {
        case BiometricAuthResult.success:
          emit(BiometricAuthSuccess(timestamp: DateTime.now()));
          _logger.i('Biometric authentication successful');
          break;

        case BiometricAuthResult.cancelled:
          emit(const BiometricAuthCancelled());
          _logger.d('Biometric authentication cancelled by user');
          break;

        case BiometricAuthResult.failed:
          emit(BiometricAuthFailed(
            result: result,
            message: 'Autentikasi biometrik gagal. Silakan coba lagi.',
          ));
          break;

        case BiometricAuthResult.temporarilyLocked:
          final lockoutTime =
              await _biometricAuthService.getLockoutTimeRemaining();
          emit(BiometricAuthFailed(
            result: result,
            message:
                'Autentikasi biometrik terkunci sementara karena terlalu banyak percobaan gagal.',
            lockoutTimeRemaining: lockoutTime,
          ));
          break;

        case BiometricAuthResult.permanentlyLocked:
          emit(BiometricAuthFailed(
            result: result,
            message:
                'Autentikasi biometrik terkunci permanen. Gunakan PIN atau password.',
          ));
          break;

        case BiometricAuthResult.notAvailable:
          emit(BiometricAuthFailed(
            result: result,
            message: 'Autentikasi biometrik tidak tersedia di perangkat ini.',
          ));
          break;

        case BiometricAuthResult.notEnrolled:
          emit(BiometricAuthFailed(
            result: result,
            message:
                'Belum ada biometrik yang terdaftar. Silakan atur di pengaturan perangkat.',
          ));
          break;

        case BiometricAuthResult.deviceNotSupported:
          emit(BiometricAuthFailed(
            result: result,
            message: 'Perangkat tidak mendukung autentikasi biometrik.',
          ));
          break;

        case BiometricAuthResult.biometricDisabled:
          emit(BiometricAuthFailed(
            result: result,
            message: 'Autentikasi biometrik dinonaktifkan.',
          ));
          break;
      }
    } catch (e) {
      _logger.e('Error during biometric authentication: $e');
      emit(BiometricAuthError(
          message: 'Terjadi kesalahan saat autentikasi biometrik: $e'));
    }
  }

  Future<void> _onEnableRequested(
    BiometricEnableRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(
          message: 'Mengaktifkan autentikasi biometrik...'));

      final success = await _biometricAuthService.enableBiometricAuth(
        reason: event.reason,
      );

      if (success) {
        final capabilities =
            await _biometricAuthService.getBiometricCapabilities();
        final preferredType =
            await _biometricAuthService.getPreferredBiometricType();

        emit(BiometricEnabled(
          capabilities: capabilities,
          preferredType: preferredType,
        ));
        add(const BiometricStatusRequested());

        _logger.i('Biometric authentication enabled successfully');
      } else {
        emit(const BiometricAuthError(
          message:
              'Gagal mengaktifkan autentikasi biometrik. Silakan coba lagi.',
        ));
      }
    } catch (e) {
      _logger.e('Error enabling biometric authentication: $e');
      emit(BiometricAuthError(
          message:
              'Terjadi kesalahan saat mengaktifkan autentikasi biometrik: $e'));
    }
  }

  Future<void> _onDisableRequested(
    BiometricDisableRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(
          message: 'Menonaktifkan autentikasi biometrik...'));

      await _biometricAuthService.disableBiometricAuth();

      emit(const BiometricDisabled());
      add(const BiometricStatusRequested());

      _logger.i('Biometric authentication disabled successfully');
    } catch (e) {
      _logger.e('Error disabling biometric authentication: $e');
      emit(BiometricAuthError(
          message:
              'Terjadi kesalahan saat menonaktifkan autentikasi biometrik: $e'));
    }
  }

  Future<void> _onStatusRequested(
    BiometricStatusRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(message: 'Memuat status biometrik...'));

      final isEnabled = await _biometricAuthService.isBiometricEnabled();
      final capabilities =
          await _biometricAuthService.getBiometricCapabilities();
      final preferredType =
          await _biometricAuthService.getPreferredBiometricType();
      final lockoutTime = await _biometricAuthService.getLockoutTimeRemaining();

      emit(BiometricStatusLoaded(
        isEnabled: isEnabled,
        isSupported: capabilities.isDeviceSupported,
        isEnrolled: capabilities.isEnrolled,
        capabilities: capabilities,
        preferredType: preferredType,
        isLocked: lockoutTime != null,
        lockoutTimeRemaining: lockoutTime,
      ));

      _logger.d(
          'Biometric status loaded: enabled=$isEnabled, supported=${capabilities.isDeviceSupported}');
    } catch (e) {
      _logger.e('Error loading biometric status: $e');
      emit(BiometricAuthError(message: 'Gagal memuat status biometrik: $e'));
    }
  }

  Future<void> _onTypePreferenceChanged(
    BiometricTypePreferenceChanged event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      await _biometricAuthService.setPreferredBiometricType(event.type);

      // Reload status to reflect changes
      add(const BiometricStatusRequested());

      _logger.d('Biometric type preference changed to: ${event.type}');
    } catch (e) {
      _logger.e('Error changing biometric type preference: $e');
      emit(BiometricAuthError(
          message: 'Gagal mengubah preferensi tipe biometrik: $e'));
    }
  }

  Future<void> _onLockReset(
    BiometricLockReset event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(const BiometricAuthLoading(message: 'Mereset kunci biometrik...'));

      await _biometricAuthService.resetBiometricLock();

      // Reload status to reflect changes
      add(const BiometricStatusRequested());

      _logger.i('Biometric lock reset successfully');
    } catch (e) {
      _logger.e('Error resetting biometric lock: $e');
      emit(BiometricAuthError(message: 'Gagal mereset kunci biometrik: $e'));
    }
  }

  Future<void> _onStatsRequested(
    BiometricStatsRequested event,
    Emitter<BiometricAuthState> emit,
  ) async {
    try {
      emit(
          const BiometricAuthLoading(message: 'Memuat statistik biometrik...'));

      final stats = await _biometricAuthService.getBiometricStats();

      emit(BiometricStatsLoaded(stats));

      _logger.d('Biometric stats loaded: $stats');
    } catch (e) {
      _logger.e('Error loading biometric stats: $e');
      emit(BiometricAuthError(message: 'Gagal memuat statistik biometrik: $e'));
    }
  }

  // Helper methods for UI
  static String getBiometricTypeDisplayName(BiometricType type) {
    switch (type) {
      case BiometricType.fingerprint:
        return 'Sidik Jari';
      case BiometricType.face:
        return 'Pengenalan Wajah';
      case BiometricType.iris:
        return 'Pemindaian Iris';
      case BiometricType.strong:
        return 'Biometrik Kuat';
      case BiometricType.weak:
        return 'Biometrik Lemah';
    }
  }

  static String getBiometricResultMessage(BiometricAuthResult result) {
    switch (result) {
      case BiometricAuthResult.success:
        return 'Autentikasi berhasil';
      case BiometricAuthResult.failed:
        return 'Autentikasi gagal';
      case BiometricAuthResult.cancelled:
        return 'Autentikasi dibatalkan';
      case BiometricAuthResult.notAvailable:
        return 'Biometrik tidak tersedia';
      case BiometricAuthResult.notEnrolled:
        return 'Biometrik belum didaftarkan';
      case BiometricAuthResult.temporarilyLocked:
        return 'Sementara terkunci';
      case BiometricAuthResult.permanentlyLocked:
        return 'Terkunci permanen';
      case BiometricAuthResult.deviceNotSupported:
        return 'Perangkat tidak mendukung';
      case BiometricAuthResult.biometricDisabled:
        return 'Biometrik dinonaktifkan';
    }
  }
}
