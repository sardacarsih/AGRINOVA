
import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/services/jwt_storage_service.dart';

abstract class ProfileRepository {}

class ProfileRepositoryImpl implements ProfileRepository {
  final DatabaseService databaseService;
  final JWTStorageService jwtStorageService;

  ProfileRepositoryImpl({
    required this.databaseService,
    required this.jwtStorageService,
  });
}
