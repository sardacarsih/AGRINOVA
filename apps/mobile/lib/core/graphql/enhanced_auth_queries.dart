import 'package:graphql_flutter/graphql_flutter.dart';

class EnhancedAuthQueries {
  // Device Binding Mutation (for enhanced security)
  static String bindDevice = '''
    mutation BindDevice(\$input: DeviceBindInput!) {
      bindDevice(input: \$input) {
        success
        message
        device {
          id
          deviceId
          platform
          lastSeen
          isActive
        }
        bindingToken
      }
    }
  ''';

  // Device Unbinding Mutation
  static String unbindDevice = '''
    mutation UnbindDevice(\$deviceId: String!) {
      unbindDevice(deviceId: \$deviceId) {
        success
        message
      }
    }
  ''';

  // Get User Devices Query
  static String myDevices = '''
    query MyDevices {
      myDevices {
        id
        deviceId
        platform
        lastSeen
        isActive
        deviceFingerprint
        trusted
        createdAt
      }
    }
  ''';

  // Refresh Token Mutation
  static String refreshToken = '''
    mutation RefreshToken(\$input: RefreshTokenInput!) {
      refreshToken(input: \$input) {
        success
        accessToken
        refreshToken
        expiresIn
        user {
          id
          username
          isActive
        }
      }
    }
  ''';

  // Current User Query
  static String me = '''
    query Me {
      me {
        id
        username
        email
        name
        role
        isActive
        company {
          id
          name
          code
        }
        createdAt
        updatedAt
      }
    }
  ''';

  // Get Performance Metrics Query (for monitoring)
  static String performanceMetrics = '''
    query GetPerformanceMetrics {
      getPerformanceMetrics {
        totalOperations
        averageDuration
        peakConcurrency
        operationsPerSec
        lastReset
      }
    }
  ''';

  // Create GraphQL Options for Device Binding
  static MutationOptions createBindDeviceOptions(Map<String, dynamic> input) {
    return MutationOptions(
      document: gql(bindDevice),
      variables: {'input': input},
      fetchPolicy: FetchPolicy.noCache,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Create GraphQL Options for Device Unbinding
  static MutationOptions createUnbindDeviceOptions(String deviceId) {
    return MutationOptions(
      document: gql(unbindDevice),
      variables: {'deviceId': deviceId},
      fetchPolicy: FetchPolicy.noCache,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Create GraphQL Options for My Devices Query
  static QueryOptions createMyDevicesOptions() {
    return QueryOptions(
      document: gql(myDevices),
      fetchPolicy: FetchPolicy.networkOnly,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Create GraphQL Options for Refresh Token
  static MutationOptions createRefreshTokenOptions(Map<String, dynamic> input) {
    return MutationOptions(
      document: gql(refreshToken),
      variables: {'input': input},
      fetchPolicy: FetchPolicy.noCache,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Create GraphQL Options for Current User Query
  static QueryOptions createMeOptions() {
    return QueryOptions(
      document: gql(me),
      fetchPolicy: FetchPolicy.networkOnly,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Create GraphQL Options for Performance Metrics
  static QueryOptions createPerformanceMetricsOptions() {
    return QueryOptions(
      document: gql(performanceMetrics),
      fetchPolicy: FetchPolicy.networkOnly,
      errorPolicy: ErrorPolicy.all,
    );
  }

  // Helper method to create device binding input
  static Map<String, dynamic> createDeviceBindInput({
    required String deviceId,
    required String deviceFingerprint,
    required String platform,
    Map<String, dynamic>? deviceInfo,
  }) {
    return {
      'deviceId': deviceId,
      'deviceFingerprint': deviceFingerprint,
      'platform': platform,
      'deviceInfo': ?deviceInfo,
    };
  }

  // Helper method to create refresh token input
  static Map<String, dynamic> createRefreshTokenInput({
    required String refreshToken,
    String? deviceId,
  }) {
    return {
      'refreshToken': refreshToken,
      'deviceId': ?deviceId,
    };
  }

  // Get error message from GraphQL error
  static String getErrorMessage(dynamic error) {
    if (error == null) {
      return 'Unknown error occurred';
    }

    if (error is OperationException) {
      final graphQLError = error;
      if (graphQLError.graphqlErrors.isNotEmpty) {
        return graphQLError.graphqlErrors.first.message;
      }
      if (graphQLError.linkException != null) {
        return graphQLError.linkException.toString();
      }
    }

    if (error is String) {
      return error;
    }

    if (error is Map && error.containsKey('message')) {
      return error['message'].toString();
    }

    return error.toString();
  }

  // Create subscription for real-time logout notifications
  static String logoutSubscription = '''
    subscription OnLogoutEvent(\$userId: ID!) {
      logoutEvent(userId: \$userId) {
        id
        userId
        platform
        deviceId
        timestamp
        reason
        successful
      }
    }
  ''';

  // Create subscription options for logout notifications
  static SubscriptionOptions createLogoutSubscriptionOptions(String userId) {
    return SubscriptionOptions(
      document: gql(logoutSubscription),
      variables: {'userId': userId},
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }
}

// Extension to make gql function available
extension StringExtension on String {
  String get gql => this;
}
