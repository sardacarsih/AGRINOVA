import 'package:agrinova_mobile/core/graphql/super_admin_queries.dart';
import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:agrinova_mobile/features/dashboard/data/models/super_admin_dashboard_models.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class SuperAdminDashboardRepository {
  final GraphQLClientService _graphqlClient;

  SuperAdminDashboardRepository({
    required GraphQLClientService graphqlClient,
  }) : _graphqlClient = graphqlClient;

  Future<SuperAdminDashboardModel> getDashboard() async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(SuperAdminQueries.dashboardQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    final data = result.data?['superAdminDashboard'] as Map<String, dynamic>?;
    if (data == null) {
      throw Exception('No superAdminDashboard payload returned');
    }

    return SuperAdminDashboardModel.fromJson(data);
  }

  String _exceptionMessage(OperationException? exception) {
    if (exception == null) {
      return 'Unknown GraphQL error';
    }
    if (exception.graphqlErrors.isNotEmpty) {
      return exception.graphqlErrors.map((e) => e.message).join(', ');
    }
    return exception.toString();
  }
}
