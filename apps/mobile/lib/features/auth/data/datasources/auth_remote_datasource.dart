import '../../../../core/models/jwt_models.dart';
import '../services/graphql_auth_service.dart';

abstract class AuthRemoteDataSource {
  Future<JWTLoginResponse> login(JWTLoginRequest request);
  Future<JWTRefreshResponse> refreshToken(JWTRefreshRequest request);
  Future<void> logout(String? deviceId);
  Future<void> registerDevice(DeviceRegistrationRequest request);
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
    bool logoutOtherDevices,
  });
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final GraphQLAuthService _graphqlService;

  AuthRemoteDataSourceImpl(this._graphqlService);

  @override
  Future<JWTLoginResponse> login(JWTLoginRequest request) async {
    // Pass directly to the existing robust GraphQL service
    // which already contains the retry retry logic and error mapping
    return _graphqlService.login(request);
  }

  @override
  Future<JWTRefreshResponse> refreshToken(JWTRefreshRequest request) async {
    return _graphqlService.refreshToken(request);
  }

  @override
  Future<void> logout(String? deviceId) async {
    return _graphqlService.logout(deviceId: deviceId);
  }

  @override
  Future<void> registerDevice(DeviceRegistrationRequest request) async {
    return _graphqlService.registerDevice(request);
  }

  @override
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
    bool logoutOtherDevices = false,
  }) async {
    return _graphqlService.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
      logoutOtherDevices: logoutOtherDevices,
    );
  }
}
