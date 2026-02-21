import 'package:agrinova_mobile/core/graphql/company_admin_queries.dart';
import 'package:agrinova_mobile/core/network/graphql_client_service.dart';
import 'package:agrinova_mobile/features/dashboard/data/models/company_admin_dashboard_models.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class CompanyAdminDashboardRepository {
  final GraphQLClientService _graphqlClient;

  CompanyAdminDashboardRepository({
    required GraphQLClientService graphqlClient,
  }) : _graphqlClient = graphqlClient;

  Future<CompanyAdminDashboardModel> getDashboard() async {
    final result = await _graphqlClient.query(
      QueryOptions(
        document: gql(CompanyAdminQueries.dashboardQuery),
        fetchPolicy: FetchPolicy.networkOnly,
      ),
    );

    if (result.hasException) {
      throw Exception(_exceptionMessage(result.exception));
    }

    final data = result.data?['companyAdminDashboard'] as Map<String, dynamic>?;
    if (data == null) {
      throw Exception('No companyAdminDashboard payload returned');
    }

    return CompanyAdminDashboardModel.fromJson(data);
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
