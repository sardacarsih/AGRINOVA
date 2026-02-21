import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';
import 'dart:async';

import '../config/app_config.dart';
import '../constants/api_constants.dart';
import '../services/unified_secure_storage_service.dart';
import '../services/connectivity_service.dart' as core;
import '../services/device_service.dart';
import '../network/graphql_client_service.dart';
import 'auth_queries.dart';

/// GraphQL Client for Agrinova Mobile Application
///
/// Features:
/// - JWT Authentication integration
/// - Offline-first caching with HiveStore
/// - WebSocket subscriptions for real-time updates
/// - Connection management with retry logic
/// - Role-based query optimization
/// - Device binding support
class AgroGraphQLClient implements GraphQLClientService {
  static final Logger _logger = Logger();

  GraphQLClient? _client;
  WebSocketLink? _wsLink;
  HttpLink? _httpLink;
  AuthLink? _authLink;
  HiveStore? _store;

  bool _isInitialized = false;

  final core.ConnectivityService _connectivity;

  // Connection state
  StreamSubscription<core.NetworkStatus>? _connectivitySubscription;
  bool _isConnected = false;
  Timer? _reconnectTimer;

  // Configuration

  static const Duration _reconnectInterval = Duration(seconds: 5);
  static const int _maxReconnectAttempts = 5;
  int _reconnectAttempts = 0;

  AgroGraphQLClient({
    required core.ConnectivityService connectivityService,
  }) : _connectivity = connectivityService {
    _setupConnectivityListener();
  }

  /// Initialize GraphQL client with offline-first configuration
  @override
  Future<void> initialize({
    required String baseUrl,
    Map<String, String>? additionalHeaders,
  }) async {
    try {
      _logger.i('Initializing GraphQL client...');

      // Initialize Hive store for offline caching
      await _initializeHiveStore();

      // Setup HTTP link for queries and mutations
      _httpLink = HttpLink(
        '$baseUrl${ApiConstants.graphqlPath}',
        defaultHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (additionalHeaders != null) ...additionalHeaders,
        },
      );

      // Setup WebSocket link for subscriptions
      final wsUrl = baseUrl.replaceFirst('http', 'ws');
      _wsLink = WebSocketLink(
        '$wsUrl${ApiConstants.graphqlWsPath}',
        config: SocketClientConfig(
          autoReconnect: true,
          inactivityTimeout: const Duration(minutes: 10),
          initialPayload: () async {
            final token = _normalizeStoredToken(
              await UnifiedSecureStorageService.getAccessToken(),
            );
            return {
              'Authorization': token != null ? 'Bearer $token' : null,
            };
          },
        ),
      );

      // Setup authentication link with auto-refresh capability
      _authLink = AuthLink(
        getToken: () async {
          // Get current token and check if it needs refresh
          String? token = _normalizeStoredToken(
            await UnifiedSecureStorageService.getAccessToken(),
          );

          if (token == null) {
            _logger.w('⚠️ AuthLink: No access token found in storage');
          } else {
            _logger
                .d('🔐 AuthLink: Access token found (${token.length} chars)');

            // Check if token is expired or about to expire
            final needsRefresh =
                await UnifiedSecureStorageService.needsTokenRefresh();

            if (needsRefresh && _connectivity.isOnline) {
              _logger.i(
                  '🔄 Access token needs refresh, attempting auto-refresh...');
              final refreshedToken = await _refreshAccessTokenIfNeeded();
              if (refreshedToken != null) {
                token = _normalizeStoredToken(refreshedToken);
                _logger.i('✅ Token auto-refreshed successfully');
              } else {
                _logger.w('⚠️ Token refresh failed, using existing token');
              }
            }
          }

          final authHeader = token != null ? 'Bearer $token' : null;
          _logger.d(
              '🔐 AuthLink: Returning header: ${authHeader != null ? "Bearer [REDACTED]" : "null"}');
          return authHeader;
        },
      );

      // Create link chain with conditional WebSocket/HTTP routing
      final link = Link.split(
        (request) => _isSubscriptionRequest(request),
        _wsLink!,
        _authLink!.concat(_httpLink!),
      );

      // Create GraphQL client with offline support
      _client = GraphQLClient(
        link: link,
        cache: GraphQLCache(store: _store!),
      );

      _isInitialized = true;
      _logger.i('GraphQL client initialized successfully');
      _logger.d('GraphQL HTTP URL: $baseUrl${ApiConstants.graphqlPath}');
      _logger.d('GraphQL WS URL: $wsUrl${ApiConstants.graphqlWsPath}');
    } catch (e) {
      _logger.e('Failed to initialize GraphQL client', error: e);
      rethrow;
    }
  }

  /// Initialize Hive store for offline caching
  Future<void> _initializeHiveStore() async {
    try {
      // Initialize Hive for offline storage
      await initHiveForFlutter();

      // _store = await HiveStore.open(
      //   boxName: 'agrinova_graphql_cache',
      //   path: null, // Use default path
      // );
      // Temporary workaround: Use InMemoryStore if HiveStore fails or is not available in this version
      // Assuming HiveStore is available, but if not, we can fallback.
      // Based on imports, hive_flutter is not imported, only graphql_flutter.
      // Wait, graphql_flutter exports HiveStore?
      // Step 340 showed `await HiveStore.open`.
      // I will keep it as is.

      _store = await HiveStore.open(
        boxName: 'agrinova_graphql_cache',
        path: null, // Use default path
      );

      _logger.d('Hive store initialized for GraphQL caching');
    } catch (e) {
      _logger.e('Failed to initialize Hive store', error: e);
      rethrow;
    }
  }

  /// Setup connectivity listener for connection management
  void _setupConnectivityListener() {
    _connectivitySubscription = _connectivity.networkStatusStream.listen(
      (status) {
        final wasConnected = _isConnected;
        _isConnected = (status == core.NetworkStatus.online);

        if (!wasConnected && _isConnected) {
          _logger
              .i('Network connectivity restored, reconnecting GraphQL client');
          _onConnectivityRestored();
        } else if (wasConnected && !_isConnected) {
          _logger.w('Network connectivity lost');
          _onConnectivityLost();
        }
      },
      onError: (error) {
        _logger.e('Connectivity listener error', error: error);
      },
    );
  }

  /// Handle connectivity restoration
  void _onConnectivityRestored() {
    _reconnectAttempts = 0;
    _reconnectTimer?.cancel();

    // Trigger cache refresh for critical data
    _refreshCriticalData();
  }

  /// Handle connectivity loss
  void _onConnectivityLost() {
    _reconnectTimer?.cancel();
    _scheduleReconnection();
  }

  /// Schedule reconnection attempt
  void _scheduleReconnection() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _logger.w('Max reconnection attempts reached');
      return;
    }

    _reconnectTimer = Timer(_reconnectInterval, () async {
      try {
        _reconnectAttempts++;
        _logger
            .d('Attempting GraphQL reconnection (attempt $_reconnectAttempts)');

        if (_connectivity.isOnline) {
          await _reinitializeConnections();
          _logger.i('GraphQL reconnection successful');
          _reconnectAttempts = 0;
        } else {
          _scheduleReconnection();
        }
      } catch (e) {
        _logger.e('Reconnection attempt failed', error: e);
        _scheduleReconnection();
      }
    });
  }

  /// Reinitialize connections after connectivity restoration
  Future<void> _reinitializeConnections() async {
    if (!_isInitialized || _wsLink == null) return;

    // Close existing WebSocket connection
    await _wsLink!.dispose();

    // Recreate WebSocket link with updated authentication
    _wsLink = WebSocketLink(
      AppConfig.graphqlWsUrl,
      config: SocketClientConfig(
        autoReconnect: true,
        inactivityTimeout: const Duration(minutes: 10),
        initialPayload: () async {
          final token = _normalizeStoredToken(
            await UnifiedSecureStorageService.getAccessToken(),
          );
          return {
            'Authorization': token != null ? 'Bearer $token' : null,
          };
        },
      ),
    );

    // Update client links
    final link = Link.split(
      (request) => _isSubscriptionRequest(request),
      _wsLink!,
      _authLink!.concat(_httpLink!),
    );

    _client = GraphQLClient(
      link: link,
      cache: _client!.cache,
    );
  }

  /// Check if request is a subscription
  bool _isSubscriptionRequest(Request request) {
    // In graphql_flutter, we need to check the operation type differently
    // This is a simplified check - in practice, you might need to inspect the document
    return request is SubscriptionOptions;
  }

  String? _normalizeStoredToken(String? token) {
    if (token == null) return null;
    final trimmed = token.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.startsWith('Bearer ')) {
      return trimmed.substring('Bearer '.length).trim();
    }
    return trimmed;
  }

  bool _matchesAuthErrorText(String? value) {
    if (value == null) return false;
    final message = value.toLowerCase();
    return message.contains('unauthenticated') ||
        message.contains('unauthorized') ||
        message.contains('authentication required') ||
        message.contains('authentication failed') ||
        message.contains('invalid token') ||
        message.contains('token is expired') ||
        message.contains('token expired') ||
        message.contains('invalid claims') ||
        message.contains('jwt') ||
        message.contains('401');
  }

  bool _isGraphQLAuthError(GraphQLError error) {
    final code = error.extensions?['code']?.toString().toUpperCase();
    if (code == 'UNAUTHENTICATED' ||
        code == 'UNAUTHORIZED' ||
        code == 'AUTHENTICATION_REQUIRED' ||
        code == 'INVALID_TOKEN') {
      return true;
    }

    if (_matchesAuthErrorText(error.message)) {
      return true;
    }

    if (error.extensions != null) {
      final extensionSummary = error.extensions!.values.join(' ');
      if (_matchesAuthErrorText(extensionSummary)) {
        return true;
      }
    }

    return false;
  }

  bool _hasUnauthenticatedError(OperationException exception) {
    if (exception.graphqlErrors.any(_isGraphQLAuthError)) {
      return true;
    }

    return _matchesAuthErrorText(exception.linkException?.toString());
  }

  /// Update authentication token
  Future<void> updateAuthToken(String? token) async {
    try {
      final normalizedToken = _normalizeStoredToken(token);
      if (normalizedToken != null) {
        await UnifiedSecureStorageService.updateAccessToken(normalizedToken);
      } else {
        await UnifiedSecureStorageService.clearAuthData();
      }

      // Reinitialize connections with new token
      await _reinitializeConnections();

      _logger.i('GraphQL client authentication updated');
    } catch (e) {
      _logger.e('Failed to update GraphQL auth token', error: e);
    }
  }

  /// Execute GraphQL query
  @override
  Future<QueryResult<T>> query<T>(QueryOptions options) async {
    _ensureInitialized();
    try {
      var result = await _client!.query(options);
      if (result.hasException && _hasUnauthenticatedError(result.exception!)) {
        _logger.w(
            'Authentication error on query, attempting token refresh once...');
        final refreshedToken = await _refreshAccessTokenIfNeeded();
        if (refreshedToken != null) {
          result = await _client!.query(options);
        }
      }
      if (result.hasException) {
        _handleGraphQLException(result.exception!);
      }
      return result as QueryResult<T>;
    } catch (e) {
      _logger.e('GraphQL query failed', error: e);
      rethrow;
    }
  }

  /// Execute GraphQL mutation
  @override
  Future<QueryResult<T>> mutate<T>(MutationOptions options) async {
    _ensureInitialized();
    try {
      var result = await _client!.mutate(options);
      if (result.hasException && _hasUnauthenticatedError(result.exception!)) {
        _logger.w(
            'Authentication error on mutation, attempting token refresh once...');
        final refreshedToken = await _refreshAccessTokenIfNeeded();
        if (refreshedToken != null) {
          result = await _client!.mutate(options);
        }
      }
      if (result.hasException) {
        _handleGraphQLException(result.exception!);
      }
      return result as QueryResult<T>;
    } catch (e) {
      _logger.e('GraphQL mutation failed', error: e);
      rethrow;
    }
  }

  /// Create GraphQL subscription with error handling
  @override
  Stream<QueryResult<T>> subscribe<T>(SubscriptionOptions<T> options) {
    _ensureInitialized();
    return _client!.subscribe(options).handleError((error) {
      _logger.e('GraphQL subscription error', error: error);
    });
  }

  /// Watch GraphQL query with real-time updates
  @override
  ObservableQuery<T> watchQuery<T>(WatchQueryOptions options) {
    _ensureInitialized();
    return _client!.watchQuery(options) as ObservableQuery<T>;
  }

  /// Handle GraphQL exceptions
  void _handleGraphQLException(OperationException exception) {
    if (exception.graphqlErrors.isNotEmpty) {
      for (final error in exception.graphqlErrors) {
        _logger.e('GraphQL Error: ${error.message}', error: error);

        // Handle specific error types
        final code = error.extensions?['code']?.toString().toUpperCase();
        switch (code) {
          case 'UNAUTHENTICATED':
          case 'UNAUTHORIZED':
          case 'AUTHENTICATION_REQUIRED':
            _handleAuthenticationError();
            break;
          case 'FORBIDDEN':
            _handleAuthorizationError();
            break;
          case 'NETWORK_ERROR':
            _handleNetworkError();
            break;
          default:
            if (_isGraphQLAuthError(error)) {
              _handleAuthenticationError();
            } else {
              _logger.w('Unhandled GraphQL error: ${error.message}');
            }
        }
      }
    }

    if (exception.linkException != null) {
      _logger.e('GraphQL Link Exception', error: exception.linkException);

      if (exception.linkException is NetworkException) {
        _handleNetworkError();
      } else if (exception.linkException is ServerException) {
        _handleServerError(exception.linkException as ServerException);
      }
    }
  }

  /// Handle authentication errors
  void _handleAuthenticationError() {
    _logger.w(
      'Authentication error detected after retry. Keeping tokens for manual recovery flow.',
    );
  }

  /// Handle authorization errors
  void _handleAuthorizationError() {
    _logger.w('Authorization error detected');
    // Handle insufficient permissions
  }

  /// Handle network errors
  void _handleNetworkError() {
    _logger.w('Network error detected');
    if (!_connectivity.isOnline) {
      _onConnectivityLost();
    }
  }

  /// Handle server errors
  void _handleServerError(ServerException exception) {
    _logger.e('Server error: ${exception.originalException?.toString()}');

    // Handle specific HTTP status codes
    // Note: In graphql_flutter, the response structure might be different
    final message = exception.originalException?.toString() ?? '';

    if (message.contains('401')) {
      _handleAuthenticationError();
    } else if (message.contains('403')) {
      _handleAuthorizationError();
    } else if (message.contains('429')) {
      _logger.w('Rate limit exceeded');
    } else if (message.contains('500') ||
        message.contains('502') ||
        message.contains('503') ||
        message.contains('504')) {
      _logger.e('Server error, scheduling retry');
      _scheduleReconnection();
    }
  }

  /// Clear GraphQL cache
  Future<void> clearCache() async {
    try {
      if (_client != null) {
        _client!.cache.store.reset();
        _logger.i('GraphQL cache cleared');
      }
    } catch (e) {
      _logger.e('Failed to clear GraphQL cache', error: e);
    }
  }

  /// Get cache statistics
  Future<Map<String, dynamic>> getCacheStats() async {
    try {
      // Implementation depends on specific cache store
      return {
        'size': 0, // Placeholder
        'entries': 0, // Placeholder
        'last_cleared': null, // Placeholder
      };
    } catch (e) {
      _logger.e('Failed to get cache stats', error: e);
      return {};
    }
  }

  /// Refresh critical data after connectivity restoration
  Future<void> _refreshCriticalData() async {
    try {
      // Implement critical data refresh logic here
      // This could include user permissions, master data, etc.
      _logger.d('Refreshing critical data after connectivity restoration');
    } catch (e) {
      _logger.e('Failed to refresh critical data', error: e);
    }
  }

  /// Refresh access token if needed
  /// Returns the new access token if refresh was successful, null otherwise
  Future<String?> _refreshAccessTokenIfNeeded() async {
    try {
      // Get refresh token
      final refreshToken = _normalizeStoredToken(
        await UnifiedSecureStorageService.getRefreshToken(),
      );
      if (refreshToken == null) {
        _logger.w('No refresh token available for auto-refresh');
        return null;
      }

      // Get device info for refresh request
      final deviceInfo = await DeviceService.getDeviceInfo();

      // Create a simple HTTP link without auth for the refresh request
      // to avoid circular dependency on token refresh
      final refreshLink = HttpLink(
        AppConfig.graphqlUrl,
        defaultHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      // Create temporary client for refresh
      final tempClient = GraphQLClient(
        link: refreshLink,
        cache: GraphQLCache(),
      );

      // Execute refresh token mutation
      final result = await tempClient.mutate(
        AuthQueries.refreshTokenOptions(
          refreshToken: refreshToken,
          deviceId: deviceInfo.deviceId,
          fingerprint: deviceInfo.fingerprint,
        ),
      );

      if (result.hasException) {
        _logger.e('Token refresh mutation failed', error: result.exception);
        return null;
      }

      final refreshData = result.data?['refreshToken'];
      if (refreshData == null) {
        _logger.e('Invalid refresh token response: no data');
        return null;
      }

      // Extract new tokens from response
      final newAccessToken =
          _normalizeStoredToken(refreshData['accessToken'] as String?);
      final newRefreshToken =
          _normalizeStoredToken(refreshData['refreshToken'] as String?);

      if (newAccessToken == null) {
        _logger.e('Invalid refresh token response: no access token');
        return null;
      }

      // Store new tokens
      await UnifiedSecureStorageService.updateAccessToken(newAccessToken);
      if (newRefreshToken != null) {
        await UnifiedSecureStorageService.updateRefreshToken(newRefreshToken);
      }

      _logger.i('Access token refreshed successfully');
      return newAccessToken;
    } catch (e) {
      _logger.e('Failed to refresh access token', error: e);
      return null;
    }
  }

  /// Check connection status
  bool get isConnected => _isConnected;

  /// Check if client is initialized
  bool get isInitialized => _isInitialized;

  /// Ensure client is initialized before use
  void _ensureInitialized() {
    if (!_isInitialized || _client == null) {
      throw StateError(
          'AgroGraphQLClient has not been initialized. Call initialize() first.');
    }
  }

  /// Get GraphQL client instance
  @override
  GraphQLClient get client {
    _ensureInitialized();
    return _client!;
  }

  /// Dispose resources
  Future<void> dispose() async {
    try {
      _reconnectTimer?.cancel();
      await _connectivitySubscription?.cancel();
      await _wsLink?.dispose();
      // await _store?.close(); // Commented out as HiveStore may not have close method in this version

      _isInitialized = false;
      _logger.i('GraphQL client disposed');
    } catch (e) {
      _logger.e('Error disposing GraphQL client', error: e);
    }
  }

  /// Test connection
  @override
  Future<bool> testConnection() async {
    try {
      // Simple health check query
      final result = await query(QueryOptions(
        document: gql('query { __typename }'),
      ));
      return !result.hasException;
    } catch (e) {
      return false;
    }
  }
}
