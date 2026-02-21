import '../../../../core/models/jwt_models.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository _repository;

  LoginUseCase(this._repository);

  Future<JWTLoginResponse> call(JWTLoginRequest request) {
    return _repository.login(request);
  }
}
