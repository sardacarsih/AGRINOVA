import 'package:graphql_flutter/graphql_flutter.dart';

class AuthQueries {
  // Mobile Login Mutation - Direct for mobile clients
  static const String loginMutation = r'''
    mutation MobileLogin($input: MobileLoginInput!) {
      mobileLogin(input: $input) {
        accessToken
        refreshToken
        offlineToken
        tokenType
        expiresIn
        expiresAt
        refreshExpiresAt
        offlineExpiresAt
        user {
          id
          username
          name
          email
          avatar
          role
          isActive
          managerId
          manager {
            id
            name
          }
        }
        assignments {
          companies {
            id
            name
            status
            address
            phone
          }
          estates {
            id
            name
            companyId
            location
            luasHa
          }
          divisions {
            id
            name
            code
            estateId
          }
        }
      }
    }
  ''';

  // Refresh Token Mutation
  static const String refreshTokenMutation = r'''
    mutation RefreshToken($input: RefreshTokenInput!) {
      refreshToken(input: $input) {
        accessToken
        refreshToken
        offlineToken
        tokenType
        expiresIn
        expiresAt
        refreshExpiresAt
        offlineExpiresAt
        user {
          id
          username
          name
          email
          avatar
          role
          isActive
          managerId
        }
        assignments {
          companies {
            id
            name
            status
          }
          estates {
            id
            name
            companyId
          }
          divisions {
            id
            name
            code
            estateId
          }
        }
      }
    }
  ''';

  // Device Renew Mutation — exchange offline token for new access+refresh tokens
  static const String deviceRenewMutation = r'''
    mutation DeviceRenew($input: DeviceRenewInput!) {
      deviceRenew(input: $input) {
        accessToken
        refreshToken
        offlineToken
        tokenType
        expiresIn
        expiresAt
        refreshExpiresAt
        offlineExpiresAt
        user {
          id
          username
          name
          email
          avatar
          role
          isActive
          managerId
        }
        assignments {
          companies { id name status }
          estates { id name companyId }
          divisions { id name code estateId }
        }
      }
    }
  ''';

  // Logout Mutation
  static const String logoutMutation = r'''
    mutation Logout {
      logout
    }
  ''';

  // Change Password Mutation
  static const String changePasswordMutation = r'''
    mutation ChangePassword($input: ChangePasswordInput!) {
      changePassword(input: $input)
    }
  ''';

  // Validate Offline Token Mutation
  static const String validateOfflineTokenMutation = r'''
    mutation ValidateOfflineToken($input: ValidateOfflineTokenInput!) {
      validateOfflineToken(input: $input) {
        valid
        payload {
          sub
          username
          role
          permissions
          iat
          exp
          jti
        }
        reason
      }
    }
  ''';

  // Register Device Mutation
  static const String registerDeviceMutation = r'''
    mutation RegisterDevice($input: DeviceRegistrationInput!) {
      registerDevice(input: $input) {
        success
        trusted
        deviceId
      }
    }
  ''';

  // Revoke Device Mutation
  static const String revokeDeviceMutation = r'''
    mutation RevokeDevice($deviceId: String!) {
      revokeDevice(deviceId: $deviceId) {
        success
      }
    }
  ''';

  // Trust Device Mutation
  static const String trustDeviceMutation = r'''
    mutation TrustDevice($deviceId: String!) {
      trustDevice(deviceId: $deviceId) {
        success
      }
    }
  ''';

  // Get Current User Query
  static const String getCurrentUserQuery = r'''
    query Me {
      me {
        id
        username
        email
        avatar
        role
        nama: name
        isActive
        companyId
        permissions
      }
    }
  ''';

  // Get User Devices Query
  static const String getUserDevicesQuery = r'''
    query UserDevices {
      userDevices {
        id
        deviceId
        platform
        lastSeen
        isActive
        deviceFingerprint
        trusted
      }
    }
  ''';

  /// Create login mutation options - using MobileLoginInput
  static MutationOptions loginOptions({
    required String identifier,
    required String password,
    String? deviceId,
    String? deviceFingerprint,
    String platform = 'ANDROID',
  }) {
    return MutationOptions(
      document: gql(loginMutation),
      variables: {
        'input': {
          'identifier': identifier,
          'password': password,
          'platform': platform,
          if (deviceId != null) 'deviceId': deviceId,
          if (deviceFingerprint != null) 'deviceFingerprint': deviceFingerprint,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create refresh token mutation options
  static MutationOptions refreshTokenOptions({
    required String refreshToken,
    required String deviceId,
    required String fingerprint,
  }) {
    return MutationOptions(
      document: gql(refreshTokenMutation),
      variables: {
        'input': {
          'refreshToken': refreshToken,
          'deviceId': deviceId,
          'deviceFingerprint': fingerprint,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create device renew mutation options
  static MutationOptions deviceRenewOptions({
    required String offlineToken,
    required String deviceId,
    String? deviceFingerprint,
  }) {
    return MutationOptions(
      document: gql(deviceRenewMutation),
      variables: {
        'input': {
          'offlineToken': offlineToken,
          'deviceId': deviceId,
          if (deviceFingerprint != null) 'deviceFingerprint': deviceFingerprint,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create logout mutation options
  static MutationOptions logoutOptions({String? deviceId}) {
    return MutationOptions(
      document: gql(logoutMutation),
      // No variables needed for argument-less logout
      variables: {},
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create change password mutation options
  static MutationOptions changePasswordOptions({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
    bool logoutOtherDevices = false,
  }) {
    return MutationOptions(
      document: gql(changePasswordMutation),
      variables: {
        'input': {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
          'logoutOtherDevices': logoutOtherDevices,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create validate offline token mutation options
  static MutationOptions validateOfflineTokenOptions({
    required String offlineToken,
    required String deviceId,
    required String fingerprint,
  }) {
    return MutationOptions(
      document: gql(validateOfflineTokenMutation),
      variables: {
        'input': {
          'offlineToken': offlineToken,
          'deviceId': deviceId,
          'deviceFingerprint': fingerprint,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create register device mutation options
  static MutationOptions registerDeviceOptions({
    required String deviceId,
    required String fingerprint,
    required String platform,
    String? osVersion,
    String? appVersion,
  }) {
    return MutationOptions(
      document: gql(registerDeviceMutation),
      variables: {
        'input': {
          'deviceId': deviceId,
          'fingerprint': fingerprint,
          'platform': platform,
          if (osVersion != null) 'osVersion': osVersion,
          if (appVersion != null) 'appVersion': appVersion,
        },
      },
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }

  /// Create get current user query options
  static QueryOptions getCurrentUserOptions() {
    return QueryOptions(
      document: gql(getCurrentUserQuery),
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheFirst,
    );
  }

  /// Create get user devices query options
  static QueryOptions getUserDevicesOptions() {
    return QueryOptions(
      document: gql(getUserDevicesQuery),
      errorPolicy: ErrorPolicy.all,
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }
}
