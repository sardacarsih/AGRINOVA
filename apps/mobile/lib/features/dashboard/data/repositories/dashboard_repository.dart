
import 'package:agrinova_mobile/core/services/database_service.dart';
import 'package:agrinova_mobile/core/services/graphql_sync_service.dart';

abstract class DashboardRepository {}

class DashboardRepositoryImpl implements DashboardRepository {
  final DatabaseService databaseService;
  final GraphQLSyncService syncService;

  DashboardRepositoryImpl({
    required this.databaseService,
    required this.syncService,
  });
}
