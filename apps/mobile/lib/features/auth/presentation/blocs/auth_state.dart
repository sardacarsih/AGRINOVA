part of 'auth_bloc.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final User user;
  final bool deviceTrusted;
  final bool biometricAvailable;
  final bool biometricEnabled;
  final bool isOfflineMode;
  final bool isFirstLogin;
  final DateTime? lastSync;
  final DateTime? lastPasswordChangedAt;
  final String? passwordChangeErrorMessage;

  const AuthAuthenticated({
    required this.user,
    required this.deviceTrusted,
    this.biometricAvailable = false,
    this.biometricEnabled = false,
    this.isOfflineMode = false,
    this.isFirstLogin = false,
    this.lastSync,
    this.lastPasswordChangedAt,
    this.passwordChangeErrorMessage,
  });

  AuthAuthenticated copyWith({
    User? user,
    bool? deviceTrusted,
    bool? biometricAvailable,
    bool? biometricEnabled,
    bool? isOfflineMode,
    bool? isFirstLogin,
    DateTime? lastSync,
    DateTime? lastPasswordChangedAt,
    String? passwordChangeErrorMessage,
    bool clearPasswordChangeError = false,
  }) {
    return AuthAuthenticated(
      user: user ?? this.user,
      deviceTrusted: deviceTrusted ?? this.deviceTrusted,
      biometricAvailable: biometricAvailable ?? this.biometricAvailable,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      isOfflineMode: isOfflineMode ?? this.isOfflineMode,
      isFirstLogin: isFirstLogin ?? this.isFirstLogin,
      lastSync: lastSync ?? this.lastSync,
      lastPasswordChangedAt:
          lastPasswordChangedAt ?? this.lastPasswordChangedAt,
      passwordChangeErrorMessage: clearPasswordChangeError
          ? null
          : passwordChangeErrorMessage ?? this.passwordChangeErrorMessage,
    );
  }

  // Helper getters
  bool get canUseBiometric => biometricAvailable && biometricEnabled;
  bool get needsPasswordChange => isFirstLogin;
  bool get canWorkOffline => user.role == 'mandor' || user.role == 'satpam';

  @override
  List<Object?> get props => [
        user,
        deviceTrusted,
        biometricAvailable,
        biometricEnabled,
        isOfflineMode,
        isFirstLogin,
        lastSync,
        lastPasswordChangedAt,
        passwordChangeErrorMessage,
      ];
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthError extends AuthState {
  final String message;

  const AuthError({required this.message});

  @override
  List<Object?> get props => [message];
}

class AuthOfflineMode extends AuthState {
  final User user;
  final DateTime lastSync;

  const AuthOfflineMode({
    required this.user,
    required this.lastSync,
  });

  @override
  List<Object?> get props => [user, lastSync];
}

class AuthBiometricRequired extends AuthState {
  final String reason;

  const AuthBiometricRequired({
    this.reason = 'Please authenticate with biometric',
  });

  @override
  List<Object?> get props => [reason];
}
