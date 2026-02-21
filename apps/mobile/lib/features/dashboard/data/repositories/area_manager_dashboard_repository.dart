import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:agrinova_mobile/core/graphql/area_manager_queries.dart';
import 'package:agrinova_mobile/features/dashboard/data/models/area_manager_dashboard_models.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';

/// Repository for Area Manager dashboard data.
///
/// Fetches real data from the GraphQL API and maps it to domain models.
class AreaManagerDashboardRepository {
  final GraphQLClientService _graphqlClient;
  final Logger _logger;

  AreaManagerDashboardRepository({
    required GraphQLClientService graphqlClient,
    Logger? logger,
  })  : _graphqlClient = graphqlClient,
        _logger = logger ?? Logger();

  /// Fetches the main dashboard data (stats, company performance, alerts).
  Future<AreaManagerDashboardModel> getDashboard() async {
    _logger.d('AreaManagerDashboardRepository: fetching dashboard');

    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(AreaManagerQueries.dashboardQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      final msg = result.exception?.graphqlErrors.isNotEmpty == true
          ? result.exception!.graphqlErrors.map((e) => e.message).join(', ')
          : result.exception.toString();
      _logger.e('AreaManagerDashboardRepository: dashboard error: $msg');
      throw Exception(msg);
    }

    final data = result.data?['areaManagerDashboard'] as Map<String, dynamic>?;
    if (data == null) {
      throw Exception('No dashboard data returned from server');
    }

    return AreaManagerDashboardModel.fromJson(data);
  }

  /// Fetches the list of manager users under this area manager's scope.
  ///
  /// Optionally filtered by [companyId].
  Future<List<ManagerUserModel>> getManagersUnderArea({String? companyId}) async {
    _logger.d('AreaManagerDashboardRepository: fetching managers');

    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(AreaManagerQueries.managersUnderAreaQuery),
        variables: {'companyId': companyId},
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      final msg = result.exception?.graphqlErrors.isNotEmpty == true
          ? result.exception!.graphqlErrors.map((e) => e.message).join(', ')
          : result.exception.toString();
      _logger.e('AreaManagerDashboardRepository: managers error: $msg');
      throw Exception(msg);
    }

    final list = result.data?['managersUnderArea'] as List? ?? [];
    return list
        .map((e) => ManagerUserModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
