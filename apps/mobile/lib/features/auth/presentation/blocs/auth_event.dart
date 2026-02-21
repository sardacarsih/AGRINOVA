part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

class AuthLoginRequested extends AuthEvent {
  final String username;
  final String password;
  final String? biometricHash;
  final bool? rememberDevice;

  const AuthLoginRequested({
    required this.username,
    required this.password,
    this.biometricHash,
    this.rememberDevice,
  });

  @override
  List<Object?> get props =>
      [username, password, biometricHash, rememberDevice];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

class AuthEmergencyLogoutRequested extends AuthEvent {
  const AuthEmergencyLogoutRequested();
}

class AuthRefreshRequested extends AuthEvent {
  const AuthRefreshRequested();
}

class AuthStatusChanged extends AuthEvent {
  final bool isAuthenticated;

  const AuthStatusChanged(this.isAuthenticated);

  @override
  List<Object?> get props => [isAuthenticated];
}

class AuthBiometricRequested extends AuthEvent {
  const AuthBiometricRequested();
}

class AuthBiometricSetupRequested extends AuthEvent {
  final bool enable;
  final String? reason;

  const AuthBiometricSetupRequested({
    required this.enable,
    this.reason,
  });

  @override
  List<Object?> get props => [enable, reason];
}

class AuthOfflineLoginRequested extends AuthEvent {
  final String username;
  final String password;

  const AuthOfflineLoginRequested({
    required this.username,
    required this.password,
  });

  @override
  List<Object?> get props => [username, password];
}

class AuthDeviceTrustRequested extends AuthEvent {
  const AuthDeviceTrustRequested();
}

class AuthPasswordChangeRequested extends AuthEvent {
  final String currentPassword;
  final String newPassword;
  final bool logoutOtherDevices;

  const AuthPasswordChangeRequested({
    required this.currentPassword,
    required this.newPassword,
    this.logoutOtherDevices = false,
  });

  @override
  List<Object?> get props => [
        currentPassword,
        newPassword,
        logoutOtherDevices,
      ];
}

class AuthLocalUserUpdated extends AuthEvent {
  final User user;

  const AuthLocalUserUpdated({
    required this.user,
  });

  @override
  List<Object?> get props => [user];
}
