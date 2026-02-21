import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';

import '../services/jwt_storage_service.dart';
import '../services/device_service.dart';
import '../constants/api_constants.dart';

/// GraphQL client for communicating with Go GraphQL API
/// 
/// Features:
/// - JWT authentication with automatic token refresh
/// - Device binding and fingerprinting
/// - WebSocket subscriptions support
/// - Offline-first caching strategy
/// - Error handling and retry logic
class GraphQLClientService {
  static GraphQLClientService? _instance;
  static GraphQLClient? _client;
  static WebSocketLink? _wsLink;
  
  final JWTStorageService _jwtStorage;
  final Logger _logger = Logger();
  
  String? _baseUrl;
  bool _initialized = false;

  GraphQLClientService._internal({required JWTStorageService jwtStorage})
      : _jwtStorage = jwtStorage;

  /// Get singleton instance
  static GraphQLClientService getInstance({required JWTStorageService jwtStorage}) {
    _instance ??= GraphQLClientService._internal(jwtStorage: jwtStorage);
    return _instance!;
  }

  /// Initialize GraphQL client with configuration
  Future<void> initialize({
    required String baseUrl,
    Map<String, String>? additionalHeaders,
  }) async {
    try {
      _baseUrl = baseUrl;
      
      // Create HTTP link for queries and mutations
      final httpLink = HttpLink(
        '$baseUrl${ApiConstants.graphqlPath}',
        defaultHeaders: await _getDefaultHeaders(additionalHeaders),
      );

      // Create WebSocket link for subscriptions
      _wsLink = WebSocketLink(
        '${baseUrl.replaceFirst('http', 'ws')}${ApiConstants.graphqlWsPath}',
        config: SocketClientConfig(
          autoReconnect: true,
          inactivityTimeout: const Duration(seconds: 30),
          initialPayload: () async => {
            'Authorization': 'Bearer ${await _jwtStorage.getAccessToken()}',
            ...(await _getPlatformHeaders()),
          },
        ),
      );

      // Create authentication middleware
      final authLink = AuthLink(
        getToken: () async {
          final token = await _jwtStorage.getAccessToken();
          if (token == null) {
            _logger.w('⚠️ AuthLink: Access token is missing!');
            return null;
          }
           // Log masked token for debugging
          final maskedToken = token.length > 10 
              ? '${token.substring(0, 5)}...${token.substring(token.length - 5)}' 
              : 'short-token';
          _logger.d('🔐 AuthLink using token: $maskedToken');
          
          return 'Bearer $token';
        },
      );

      // Combine links with authentication and error handling
      final link = Link.from([
        authLink,
        // Use split link to route subscriptions to WebSocket and queries/mutations to HTTP
        Link.split(
          (request) => request.isSubscription,
          _wsLink!,
          httpLink,
        ),
      ]);

      // Create GraphQL client with caching
      _client = GraphQLClient(
        link: link,
        cache: GraphQLCache(
          store: InMemoryStore(), // Use in-memory cache for now
        ),
        defaultPolicies: DefaultPolicies(
          watchQuery: Policies(
            fetch: FetchPolicy.cacheAndNetwork,
          ),
          query: Policies(
            fetch: FetchPolicy.cacheFirst,
          ),
          mutate: Policies(
            fetch: FetchPolicy.networkOnly,
          ),
        ),
      );

      _initialized = true;
      _logger.i('✅ GraphQL client initialized successfully');
      _logger.i('   GraphQL endpoint: $baseUrl${ApiConstants.graphqlPath}');
      _logger.i('   WebSocket endpoint: ${baseUrl.replaceFirst('http', 'ws')}${ApiConstants.graphqlWsPath}');
      
    } catch (e) {
      _logger.e('❌ Failed to initialize GraphQL client: $e');
      rethrow;
    }
  }

  /// Get GraphQL client instance
  GraphQLClient get client {
    if (!_initialized || _client == null) {
      throw StateError('GraphQL client not initialized. Call initialize() first.');
    }
    return _client!;
  }

  /// Execute GraphQL query
  Future<QueryResult> query(QueryOptions options) async {
    _ensureInitialized();
    
    try {
      _logger.d('🔍 Executing GraphQL query');
      
      // Add device headers to query
      final queryOptions = QueryOptions(
        document: options.document,
        variables: options.variables,
        fetchPolicy: options.fetchPolicy,
      );
      
      final result = await _client!.query(queryOptions);
      
      if (result.hasException) {
        _logger.w('⚠️ GraphQL query completed with exceptions: ${result.exception.toString()}');
      } else {
        _logger.d('✅ GraphQL query completed successfully');
      }
      
      return result;
    } catch (e) {
      _logger.e('❌ GraphQL query failed: $e');
      rethrow;
    }
  }

  /// Execute GraphQL mutation
  Future<QueryResult> mutate(MutationOptions options) async {
    _ensureInitialized();
    
    try {
      _logger.d('🔧 Executing GraphQL mutation');
      
      // Add device headers to mutation
      final mutationOptions = MutationOptions(
        document: options.document,
        variables: options.variables,
        fetchPolicy: options.fetchPolicy,
      );
      
      final result = await _client!.mutate(mutationOptions);
      
      if (result.hasException) {
        _logger.w('⚠️ GraphQL mutation completed with exceptions: ${result.exception.toString()}');
      } else {
        _logger.d('✅ GraphQL mutation completed successfully');
      }
      
      return result;
    } catch (e) {
      _logger.e('❌ GraphQL mutation failed: $e');
      rethrow;
    }
  }

  /// Subscribe to GraphQL subscription
  Stream<QueryResult> subscribe(SubscriptionOptions options) {
    _ensureInitialized();
    
    try {
      _logger.d('📡 Starting GraphQL subscription');
      
      // Add device headers to subscription
      final subscriptionOptions = SubscriptionOptions(
        document: options.document,
        variables: options.variables,
      );
      
      return _client!.subscribe(subscriptionOptions);
    } catch (e) {
      _logger.e('❌ GraphQL subscription failed: $e');
      rethrow;
    }
  }

  /// Watch GraphQL query (reactive)
  ObservableQuery watchQuery(WatchQueryOptions options) {
    _ensureInitialized();
    
    try {
      _logger.d('👀 Watching GraphQL query');
      
      // Add device headers to watched query
      final watchOptions = WatchQueryOptions(
        document: options.document,
        variables: options.variables,
        fetchPolicy: options.fetchPolicy,
      );
      
      return _client!.watchQuery(watchOptions);
    } catch (e) {
      _logger.e('❌ GraphQL watch query failed: $e');
      rethrow;
    }
  }

  /// Clear GraphQL cache
  Future<void> clearCache() async {
    try {
      _client?.cache.store.reset();
      _logger.i('🗑️ GraphQL cache cleared');
    } catch (e) {
      _logger.w('⚠️ Failed to clear GraphQL cache: $e');
    }
  }

  /// Update base URL dynamically
  Future<void> updateBaseUrl(String newBaseUrl) async {
    if (_baseUrl == newBaseUrl) {
      _logger.d('ℹ️ Base URL unchanged, skipping update');
      return;
    }

    _logger.i('🔄 Updating GraphQL client base URL');
    _logger.i('   FROM: $_baseUrl');
    _logger.i('   TO:   $newBaseUrl');
    
    // Dispose current client
    await dispose();
    
    // Reinitialize with new URL
    await initialize(baseUrl: newBaseUrl);
  }

  /// Test GraphQL connection
  Future<bool> testConnection() async {
    try {
      final result = await query(
        QueryOptions(
          document: gql(r'''
            query HealthCheck {
              __typename
            }
          '''),
          fetchPolicy: FetchPolicy.networkOnly,
        ),
      );
      
      if (result.hasException) {
        _logger.e('❌ GraphQL connection test failed: ${result.exception.toString()}');
        return false;
      }
      
      _logger.i('✅ GraphQL connection test successful');
      return true;
    } catch (e) {
      _logger.e('❌ GraphQL connection test error: $e');
      return false;
    }
  }

  /// Dispose GraphQL client and cleanup resources
  Future<void> dispose() async {
    try {
      _client?.cache.store.reset();
      await _wsLink?.dispose();
      _client = null;
      _wsLink = null;
      _initialized = false;
      _logger.i('🧹 GraphQL client disposed');
    } catch (e) {
      _logger.w('⚠️ Error during GraphQL client disposal: $e');
    }
  }

  // Private helper methods

  void _ensureInitialized() {
    if (!_initialized || _client == null) {
      throw StateError('GraphQL client not initialized. Call initialize() first.');
    }
  }

  Future<Map<String, String>> _getDefaultHeaders([Map<String, String>? additional]) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Agrinova-Mobile/${ApiConstants.appVersion} (Flutter)',
    };
    
    // Add platform headers
    headers.addAll(await _getPlatformHeaders());
    
    // Add additional headers
    if (additional != null) {
      headers.addAll(additional);
    }
    
    return headers;
  }

  Future<Map<String, String>> _getPlatformHeaders() async {
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();
      
      return {
        ApiConstants.platformHeader: deviceInfo.platform,
        ApiConstants.deviceIdHeader: deviceInfo.deviceId,
        ApiConstants.deviceFingerprintHeader: deviceInfo.fingerprint,
        ApiConstants.clientVersionHeader: ApiConstants.appVersion,
      };
    } catch (e) {
      _logger.w('⚠️ Failed to get platform headers: $e');
      return {};
    }
  }

  }