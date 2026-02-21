import 'package:agrinova_mobile/core/graphql/manager_dashboard_queries.dart';
import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:agrinova_mobile/features/dashboard/data/models/manager_dashboard_models.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class ManagerDashboardRepository {
  final GraphQLClientService _graphqlClient;

  ManagerDashboardRepository({required GraphQLClientService graphqlClient})
      : _graphqlClient = graphqlClient;

  Future<ManagerDashboardModel> getDashboard() async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(ManagerDashboardQueries.dashboardQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    final data = result.data?['managerDashboard'] as Map<String, dynamic>?;
    if (data == null) {
      throw Exception('No managerDashboard payload returned');
    }

    return ManagerDashboardModel.fromJson(data);
  }

  Future<ManagerAnalyticsModel> getAnalytics({String period = 'WEEKLY'}) async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(ManagerDashboardQueries.analyticsQuery),
        variables: {'period': period},
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    final data = result.data?['managerAnalytics'] as Map<String, dynamic>?;
    if (data == null) {
      throw Exception('No managerAnalytics payload returned');
    }

    return ManagerAnalyticsModel.fromJson(data);
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
