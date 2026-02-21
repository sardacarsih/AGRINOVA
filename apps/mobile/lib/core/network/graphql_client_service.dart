import 'package:graphql_flutter/graphql_flutter.dart';

/// GraphQL client service interface for GraphQL operations
abstract class GraphQLClientService {
  /// Execute GraphQL query
  Future<QueryResult<T>> query<T>(QueryOptions options);

  /// Execute GraphQL mutation
  Future<QueryResult<T>> mutate<T>(MutationOptions options);

  /// Subscribe to GraphQL subscription
  Stream<QueryResult<T>> subscribe<T>(SubscriptionOptions<T> options);

  /// Watch GraphQL query (reactive)
  ObservableQuery<T> watchQuery<T>(WatchQueryOptions options);

  /// Initialize GraphQL client
  Future<void> initialize({
    required String baseUrl,
    Map<String, String>? additionalHeaders,
  });

  /// Test connection
  Future<bool> testConnection();

  /// Get underlying GraphQL client
  GraphQLClient get client;
}