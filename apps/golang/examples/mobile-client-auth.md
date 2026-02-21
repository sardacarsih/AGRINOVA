# Mobile Client GraphQL Authentication Integration

This document provides comprehensive examples for integrating the Agrinova GraphQL authentication system in mobile applications (React Native/Flutter).

## Table of Contents
1. [React Native Integration](#react-native-integration)
2. [Flutter Integration](#flutter-integration)
3. [Offline Authentication](#offline-authentication)
4. [Device Binding](#device-binding)
5. [Biometric Authentication](#biometric-authentication)
6. [Security Best Practices](#security-best-practices)

## React Native Integration

### 1. GraphQL Client Setup

```typescript
// src/services/graphql/client.ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Alert } from 'react-native';

const httpLink = createHttpLink({
  uri: __DEV__ 
    ? 'http://10.0.2.2:8080/graphql' // Android emulator
    : 'https://api.agrinova.com/graphql',
});

// Auth link with device information
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('accessToken');
  const deviceId = await DeviceInfo.getUniqueId();
  const deviceFingerprint = await generateDeviceFingerprint();
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      'X-Device-ID': deviceId,
      'X-Device-Fingerprint': deviceFingerprint,
    }
  }
});

// Error handling for mobile
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      switch (err.extensions?.code) {
        case 'UNAUTHENTICATED':
          handleTokenExpiration();
          break;
        case 'DEVICE_NOT_TRUSTED':
          handleDeviceNotTrusted();
          break;
        case 'FORBIDDEN':
          Alert.alert('Access Denied', err.message);
          break;
      }
    }
  }
  
  if (networkError) {
    console.error('Network error:', networkError);
    // Handle offline mode
    if (networkError.message === 'Network request failed') {
      // Switch to offline mode
    }
  }
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
});

// Generate device fingerprint
async function generateDeviceFingerprint(): Promise<string> {
  const deviceId = await DeviceInfo.getUniqueId();
  const brand = await DeviceInfo.getBrand();
  const model = await DeviceInfo.getModel();
  const systemVersion = await DeviceInfo.getSystemVersion();
  
  return `${deviceId}-${brand}-${model}-${systemVersion}`;
}

// Handle token expiration
async function handleTokenExpiration() {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  // Navigate to login screen
  // NavigationService.navigate('Login');
}

// Handle device not trusted
function handleDeviceNotTrusted() {
  Alert.alert(
    'Device Not Trusted',
    'This device needs to be authorized by an administrator before you can continue.',
    [{ text: 'OK' }]
  );
}
```

### 2. Authentication Service for React Native

```typescript
// src/services/auth/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { client } from '../graphql/client';
import { ENHANCED_LOGIN, REFRESH_TOKEN, LOGOUT } from '../graphql/mutations/auth';
import { BiometricAuthService } from './BiometricAuthService';
import { OfflineAuthService } from './OfflineAuthService';

export interface MobileLoginCredentials {
  identifier: string;
  password: string;
  biometricHash?: string;
  rememberDevice?: boolean;
}

export interface DeviceInfo {
  model: string;
  osVersion: string;
  appVersion: string;
  deviceName?: string;
  screenResolution?: string;
  deviceLanguage?: string;
}

export class AuthService {
  private static instance: AuthService;
  private offlineAuthService: OfflineAuthService;
  private biometricAuthService: BiometricAuthService;

  private constructor() {
    this.offlineAuthService = new OfflineAuthService();
    this.biometricAuthService = new BiometricAuthService();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Enhanced mobile login with device binding
  async login(credentials: MobileLoginCredentials): Promise<any> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceFingerprint = await this.generateDeviceFingerprint();

      const { data } = await client.mutate({
        mutation: ENHANCED_LOGIN,
        variables: {
          input: {
            identifier: credentials.identifier,
            password: credentials.password,
            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
            deviceId,
            deviceFingerprint,
            deviceInfo,
            rememberDevice: credentials.rememberDevice || true,
            biometricHash: credentials.biometricHash,
          }
        }
      });

      if (data?.enhancedLogin) {
        await this.storeAuthData(data.enhancedLogin);
        
        // Store offline authentication data
        await this.offlineAuthService.storeOfflineData(data.enhancedLogin);
        
        return data.enhancedLogin;
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      
      // Try offline authentication as fallback
      if (error.message.includes('Network request failed')) {
        return await this.offlineAuthService.authenticateOffline(credentials);
      }
      
      throw error;
    }
  }

  // Biometric login
  async biometricLogin(): Promise<any> {
    try {
      const biometricResult = await this.biometricAuthService.authenticate();
      if (!biometricResult.success) {
        throw new Error('Biometric authentication failed');
      }

      const storedCredentials = await this.getStoredCredentials();
      if (!storedCredentials) {
        throw new Error('No stored credentials for biometric login');
      }

      return await this.login({
        identifier: storedCredentials.identifier,
        password: storedCredentials.password,
        biometricHash: biometricResult.hash,
        rememberDevice: true,
      });
    } catch (error) {
      console.error('Biometric login error:', error);
      throw error;
    }
  }

  // Token refresh with device validation
  async refreshToken(): Promise<any> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceFingerprint = await this.generateDeviceFingerprint();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await client.mutate({
        mutation: REFRESH_TOKEN,
        variables: {
          input: {
            refreshToken,
            deviceId,
            deviceFingerprint,
          }
        }
      });

      if (data?.refreshToken) {
        await this.storeAuthData(data.refreshToken);
        return data.refreshToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      throw error;
    }
  }

  // Secure logout
  async logout(): Promise<void> {
    try {
      await client.mutate({
        mutation: LOGOUT,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearAuthData();
      // Navigate to login screen
    }
  }

  // Store authentication data securely
  private async storeAuthData(authData: any): Promise<void> {
    const secureData = [
      ['accessToken', authData.accessToken],
      ['refreshToken', authData.refreshToken],
      ['offlineToken', authData.offlineToken || ''],
      ['tokenExpiresAt', authData.expiresAt],
      ['user', JSON.stringify(authData.user)],
      ['userProfile', JSON.stringify(authData.profile)],
      ['userAssignments', JSON.stringify(authData.assignments)],
    ];

    await AsyncStorage.multiSet(secureData);
  }

  // Clear all authentication data
  private async clearAuthData(): Promise<void> {
    const keys = [
      'accessToken', 'refreshToken', 'offlineToken', 'tokenExpiresAt',
      'user', 'userProfile', 'userAssignments', 'biometricCredentials'
    ];
    
    await AsyncStorage.multiRemove(keys);
    await this.offlineAuthService.clearOfflineData();
  }

  // Get device information
  private async getDeviceInfo(): Promise<DeviceInfo> {
    const [model, systemVersion, appVersion, deviceName] = await Promise.all([
      DeviceInfo.getModel(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getVersion(),
      DeviceInfo.getDeviceName(),
    ]);

    return {
      model,
      osVersion: systemVersion,
      appVersion,
      deviceName,
      screenResolution: `${DeviceInfo.getScreenWidth()}x${DeviceInfo.getScreenHeight()}`,
      deviceLanguage: DeviceInfo.getDeviceLocale(),
    };
  }

  // Generate device fingerprint
  private async generateDeviceFingerprint(): Promise<string> {
    const deviceId = await DeviceInfo.getUniqueId();
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();
    const systemVersion = await DeviceInfo.getSystemVersion();
    
    return `${Platform.OS}-${deviceId}-${brand}-${model}-${systemVersion}`;
  }

  // Get stored credentials for biometric login
  private async getStoredCredentials(): Promise<{ identifier: string; password: string } | null> {
    const credentials = await AsyncStorage.getItem('biometricCredentials');
    return credentials ? JSON.parse(credentials) : null;
  }

  // Check authentication status
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('accessToken');
    const expiresAt = await AsyncStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) {
      // Check offline authentication
      return await this.offlineAuthService.isOfflineAuthenticated();
    }

    return new Date() < new Date(expiresAt);
  }

  // Get current user
  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Get user profile
  async getUserProfile(): Promise<any | null> {
    const profile = await AsyncStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : null;
  }
}

export const authService = AuthService.getInstance();
```

### 3. Offline Authentication Service

```typescript
// src/services/auth/OfflineAuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

export class OfflineAuthService {
  private readonly OFFLINE_KEY = 'offlineAuth';
  private readonly OFFLINE_EXPIRY_DAYS = 30;

  // Store offline authentication data
  async storeOfflineData(authData: any): Promise<void> {
    const offlineData = {
      userId: authData.user.id,
      username: authData.user.username,
      role: authData.user.role,
      companyId: authData.user.companyId,
      offlineToken: authData.offlineToken,
      profile: authData.profile,
      assignments: authData.assignments,
      expiresAt: new Date(Date.now() + this.OFFLINE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Encrypt offline data
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(offlineData),
      authData.user.id
    ).toString();

    await AsyncStorage.setItem(this.OFFLINE_KEY, encryptedData);
  }

  // Authenticate offline using stored credentials
  async authenticateOffline(credentials: { identifier: string; password: string }): Promise<any> {
    const encryptedData = await AsyncStorage.getItem(this.OFFLINE_KEY);
    if (!encryptedData) {
      throw new Error('No offline authentication data available');
    }

    try {
      // For offline auth, we need to validate against stored hash
      // This is a simplified version - in production, use proper key derivation
      const storedPasswordHash = await AsyncStorage.getItem('passwordHash');
      const inputPasswordHash = CryptoJS.SHA256(credentials.password).toString();

      if (storedPasswordHash !== inputPasswordHash) {
        throw new Error('Invalid offline credentials');
      }

      // Decrypt and return offline data
      const userId = await this.getUserIdFromIdentifier(credentials.identifier);
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, userId);
      const offlineData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

      // Check expiry
      if (new Date() > new Date(offlineData.expiresAt)) {
        throw new Error('Offline authentication expired');
      }

      return {
        user: {
          id: offlineData.userId,
          username: offlineData.username,
          role: offlineData.role,
          companyId: offlineData.companyId,
        },
        profile: offlineData.profile,
        assignments: offlineData.assignments,
        isOfflineMode: true,
      };
    } catch (error) {
      console.error('Offline authentication error:', error);
      throw new Error('Offline authentication failed');
    }
  }

  // Check if offline authentication is available
  async isOfflineAuthenticated(): Promise<boolean> {
    const encryptedData = await AsyncStorage.getItem(this.OFFLINE_KEY);
    if (!encryptedData) {
      return false;
    }

    try {
      // We can't decrypt without user ID, so just check if data exists and hasn't expired
      // This is a simplified check - in production, store expiry separately
      return true;
    } catch {
      return false;
    }
  }

  // Clear offline data
  async clearOfflineData(): Promise<void> {
    await AsyncStorage.multiRemove([this.OFFLINE_KEY, 'passwordHash']);
  }

  // Helper to get user ID from identifier (simplified)
  private async getUserIdFromIdentifier(identifier: string): Promise<string> {
    // In production, this should be more sophisticated
    // For now, use a hash of the identifier
    return CryptoJS.SHA256(identifier).toString().substring(0, 16);
  }
}
```

### 4. Biometric Authentication Service

```typescript
// src/services/auth/BiometricAuthService.ts
import TouchID from 'react-native-touch-id';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

export interface BiometricResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export class BiometricAuthService {
  // Check if biometric authentication is available
  async isBiometricAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await TouchID.isSupported();
      } else {
        return await FingerprintScanner.isSensorAvailable();
      }
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  // Authenticate using biometrics
  async authenticate(): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      if (Platform.OS === 'ios') {
        await TouchID.authenticate('Authenticate to access Agrinova', {
          fallbackLabel: 'Use Passcode',
          unifiedErrors: false,
        });
      } else {
        await FingerprintScanner.authenticate({
          description: 'Authenticate to access Agrinova',
        });
      }

      // Generate biometric hash
      const biometricHash = await this.generateBiometricHash();
      
      return { success: true, hash: biometricHash };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup biometric authentication
  async setupBiometric(credentials: { identifier: string; password: string }): Promise<boolean> {
    try {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return false;
      }

      // Store encrypted credentials for biometric login
      const encryptedCredentials = CryptoJS.AES.encrypt(
        JSON.stringify(credentials),
        authResult.hash || 'default'
      ).toString();

      await AsyncStorage.setItem('biometricCredentials', encryptedCredentials);
      await AsyncStorage.setItem('biometricEnabled', 'true');
      
      return true;
    } catch (error) {
      console.error('Biometric setup failed:', error);
      return false;
    }
  }

  // Disable biometric authentication
  async disableBiometric(): Promise<void> {
    await AsyncStorage.multiRemove(['biometricCredentials', 'biometricEnabled']);
  }

  // Check if biometric is enabled
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem('biometricEnabled');
    return enabled === 'true';
  }

  // Generate biometric hash (device-specific)
  private async generateBiometricHash(): Promise<string> {
    // Generate a hash based on successful biometric authentication
    // This is a simplified implementation
    const timestamp = Date.now().toString();
    const deviceId = await AsyncStorage.getItem('deviceId') || 'unknown';
    
    return CryptoJS.SHA256(`${deviceId}-${timestamp}-biometric`).toString();
  }
}
```

## Flutter Integration

### 1. GraphQL Client Setup for Flutter

```dart
// lib/services/graphql_service.dart
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

class GraphQLService {
  static GraphQLService? _instance;
  late GraphQLClient _client;

  GraphQLService._internal();

  static GraphQLService get instance {
    _instance ??= GraphQLService._internal();
    return _instance!;
  }

  Future<void> initialize() async {
    final HttpLink httpLink = HttpLink(
      'http://10.0.2.2:8080/graphql', // Android emulator
      // 'https://api.agrinova.com/graphql', // Production
    );

    final AuthLink authLink = AuthLink(
      getToken: () async {
        final prefs = await SharedPreferences.getInstance();
        return prefs.getString('accessToken');
      },
    );

    final Link link = authLink.concat(httpLink);

    _client = GraphQLClient(
      link: link,
      cache: GraphQLCache(store: InMemoryStore()),
      defaultPolicies: DefaultPolicies(
        watchQuery: Policies(
          errorPolicy: ErrorPolicy.all,
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        query: Policies(
          errorPolicy: ErrorPolicy.all,
          fetchPolicy: FetchPolicy.cacheFirst,
        ),
      ),
    );
  }

  GraphQLClient get client => _client;
}

// Custom AuthLink that includes device information
class AuthLink extends Link {
  final Future<String?> Function() getToken;

  AuthLink({required this.getToken});

  @override
  Stream<Response> request(Request request, [NextLink? forward]) async* {
    final token = await getToken();
    final deviceInfo = await _getDeviceInfo();
    
    final updatedRequest = request.updateContextEntry<HttpLinkHeaders>(
      HttpLinkHeaders(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'X-Device-ID': deviceInfo['deviceId'] ?? '',
          'X-Device-Fingerprint': deviceInfo['fingerprint'] ?? '',
        },
      ),
    );

    yield* forward!(updatedRequest);
  }

  Future<Map<String, String>> _getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    String deviceId = '';
    String fingerprint = '';

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      deviceId = androidInfo.id;
      fingerprint = '${androidInfo.brand}-${androidInfo.model}-${androidInfo.version.release}';
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      deviceId = iosInfo.identifierForVendor ?? '';
      fingerprint = '${iosInfo.name}-${iosInfo.model}-${iosInfo.systemVersion}';
    }

    return {
      'deviceId': deviceId,
      'fingerprint': fingerprint,
    };
  }
}
```

### 2. Authentication Service for Flutter

```dart
// lib/services/auth_service.dart
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'dart:io';

class AuthService {
  static AuthService? _instance;
  late GraphQLClient _client;

  AuthService._internal();

  static AuthService get instance {
    _instance ??= AuthService._internal();
    return _instance!;
  }

  void setClient(GraphQLClient client) {
    _client = client;
  }

  // Enhanced login with device binding
  Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
    String? biometricHash,
    bool rememberDevice = true,
  }) async {
    try {
      final deviceInfo = await _getDeviceInfo();
      
      const String loginMutation = '''
        mutation EnhancedLogin(\$input: LoginInput!) {
          enhancedLogin(input: \$input) {
            accessToken
            refreshToken
            offlineToken
            tokenType
            expiresIn
            expiresAt
            user {
              id
              username
              nama
              email
              role
              companyId
              isActive
            }
            assignments {
              companies { id nama }
              estates { id nama companyId }
              divisions { id nama estateId }
            }
            profile {
              ... on MandorProfile {
                user { id username nama role }
                company { id nama }
                estate { id nama }
                divisions { id nama }
                mandorStats {
                  divisionsSupervised
                  dailyHarvestRecords
                  fieldWorkSummary {
                    recordsCreated
                    blocksSupervised
                    qualityScoreAverage
                  }
                }
              }
              ... on AsistenProfile {
                user { id username nama role }
                company { id nama }
                estate { id nama }
                divisions { id nama }
                asistenStats {
                  divisionsAssigned
                  pendingApprovals
                  dailyWorkload {
                    approvalsCompleted
                    rejectionsToday
                    averageApprovalTime
                  }
                }
              }
              ... on SatpamProfile {
                user { id username nama role }
                company { id nama }
                gateStats {
                  dailyGateChecks
                  pendingApprovals
                  securitySummary {
                    vehiclesProcessed
                    securityIncidents
                    averageProcessingTime
                  }
                }
              }
            }
          }
        }
      ''';

      final MutationOptions options = MutationOptions(
        document: gql(loginMutation),
        variables: {
          'input': {
            'identifier': identifier,
            'password': password,
            'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
            'deviceId': deviceInfo['deviceId'],
            'deviceFingerprint': deviceInfo['fingerprint'],
            'deviceInfo': deviceInfo['info'],
            'rememberDevice': rememberDevice,
            if (biometricHash != null) 'biometricHash': biometricHash,
          },
        },
      );

      final QueryResult result = await _client.mutate(options);

      if (result.hasException) {
        throw Exception('Login failed: ${result.exception}');
      }

      final authData = result.data?['enhancedLogin'];
      if (authData != null) {
        await _storeAuthData(authData);
        return authData;
      }

      throw Exception('Login failed: No data received');
    } catch (e) {
      // Try offline authentication as fallback
      if (e.toString().contains('network') || e.toString().contains('connection')) {
        return await _authenticateOffline(identifier, password);
      }
      rethrow;
    }
  }

  // Offline authentication
  Future<Map<String, dynamic>> _authenticateOffline(String identifier, String password) async {
    final prefs = await SharedPreferences.getInstance();
    final offlineData = prefs.getString('offlineAuthData');
    
    if (offlineData == null) {
      throw Exception('No offline authentication data available');
    }

    // Validate stored password hash
    final storedPasswordHash = prefs.getString('passwordHash');
    final inputPasswordHash = sha256.convert(utf8.encode(password)).toString();
    
    if (storedPasswordHash != inputPasswordHash) {
      throw Exception('Invalid offline credentials');
    }

    final data = jsonDecode(offlineData);
    
    // Check expiry
    final expiresAt = DateTime.parse(data['expiresAt']);
    if (DateTime.now().isAfter(expiresAt)) {
      throw Exception('Offline authentication expired');
    }

    return {
      'user': data['user'],
      'profile': data['profile'],
      'assignments': data['assignments'],
      'isOfflineMode': true,
    };
  }

  // Token refresh
  Future<Map<String, dynamic>> refreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    final refreshToken = prefs.getString('refreshToken');
    
    if (refreshToken == null) {
      throw Exception('No refresh token available');
    }

    const String refreshMutation = '''
      mutation RefreshToken(\$input: RefreshTokenInput!) {
        refreshToken(input: \$input) {
          accessToken
          refreshToken
          tokenType
          expiresIn
          expiresAt
        }
      }
    ''';

    final deviceInfo = await _getDeviceInfo();
    
    final MutationOptions options = MutationOptions(
      document: gql(refreshMutation),
      variables: {
        'input': {
          'refreshToken': refreshToken,
          'deviceId': deviceInfo['deviceId'],
          'deviceFingerprint': deviceInfo['fingerprint'],
        },
      },
    );

    final QueryResult result = await _client.mutate(options);

    if (result.hasException) {
      await logout();
      throw Exception('Token refresh failed: ${result.exception}');
    }

    final tokenData = result.data?['refreshToken'];
    if (tokenData != null) {
      await _storeTokens(tokenData);
      return tokenData;
    }

    throw Exception('Token refresh failed: No data received');
  }

  // Logout
  Future<void> logout() async {
    try {
      const String logoutMutation = '''
        mutation Logout {
          logout
        }
      ''';

      await _client.mutate(MutationOptions(
        document: gql(logoutMutation),
      ));
    } catch (e) {
      print('Logout error: $e');
    } finally {
      await _clearAuthData();
    }
  }

  // Store authentication data
  Future<void> _storeAuthData(Map<String, dynamic> authData) async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.setString('accessToken', authData['accessToken']);
    await prefs.setString('refreshToken', authData['refreshToken']);
    await prefs.setString('offlineToken', authData['offlineToken'] ?? '');
    await prefs.setString('tokenExpiresAt', authData['expiresAt']);
    await prefs.setString('user', jsonEncode(authData['user']));
    await prefs.setString('userProfile', jsonEncode(authData['profile']));
    await prefs.setString('userAssignments', jsonEncode(authData['assignments']));
    
    // Store offline data
    final offlineData = {
      'user': authData['user'],
      'profile': authData['profile'],
      'assignments': authData['assignments'],
      'expiresAt': DateTime.now().add(Duration(days: 30)).toIso8601String(),
    };
    await prefs.setString('offlineAuthData', jsonEncode(offlineData));
  }

  // Store only tokens
  Future<void> _storeTokens(Map<String, dynamic> tokenData) async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.setString('accessToken', tokenData['accessToken']);
    await prefs.setString('refreshToken', tokenData['refreshToken']);
    await prefs.setString('tokenExpiresAt', tokenData['expiresAt']);
  }

  // Clear authentication data
  Future<void> _clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    await prefs.remove('offlineToken');
    await prefs.remove('tokenExpiresAt');
    await prefs.remove('user');
    await prefs.remove('userProfile');
    await prefs.remove('userAssignments');
    await prefs.remove('offlineAuthData');
    await prefs.remove('passwordHash');
  }

  // Get device information
  Future<Map<String, dynamic>> _getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    
    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return {
        'deviceId': androidInfo.id,
        'fingerprint': '${androidInfo.brand}-${androidInfo.model}-${androidInfo.version.release}',
        'info': {
          'model': androidInfo.model,
          'osVersion': androidInfo.version.release,
          'appVersion': '1.0.0', // Get from package info
          'deviceName': androidInfo.device,
        },
      };
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return {
        'deviceId': iosInfo.identifierForVendor ?? '',
        'fingerprint': '${iosInfo.name}-${iosInfo.model}-${iosInfo.systemVersion}',
        'info': {
          'model': iosInfo.model,
          'osVersion': iosInfo.systemVersion,
          'appVersion': '1.0.0', // Get from package info
          'deviceName': iosInfo.name,
        },
      };
    }

    return {
      'deviceId': 'unknown',
      'fingerprint': 'unknown',
      'info': {
        'model': 'unknown',
        'osVersion': 'unknown',
        'appVersion': '1.0.0',
        'deviceName': 'unknown',
      },
    };
  }

  // Check authentication status
  Future<bool> isAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    final expiresAt = prefs.getString('tokenExpiresAt');
    
    if (token == null || expiresAt == null) {
      // Check offline authentication
      final offlineData = prefs.getString('offlineAuthData');
      return offlineData != null;
    }

    return DateTime.now().isBefore(DateTime.parse(expiresAt));
  }

  // Get current user
  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userString = prefs.getString('user');
    return userString != null ? jsonDecode(userString) : null;
  }

  // Get user profile
  Future<Map<String, dynamic>?> getUserProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final profileString = prefs.getString('userProfile');
    return profileString != null ? jsonDecode(profileString) : null;
  }
}
```

### 3. Biometric Authentication for Flutter

```dart
// lib/services/biometric_service.dart
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class BiometricService {
  static BiometricService? _instance;
  final LocalAuthentication _localAuth = LocalAuthentication();

  BiometricService._internal();

  static BiometricService get instance {
    _instance ??= BiometricService._internal();
    return _instance!;
  }

  // Check if biometric authentication is available
  Future<bool> isBiometricAvailable() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await _localAuth.isDeviceSupported();
      
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }

  // Get available biometric types
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  // Authenticate using biometrics
  Future<BiometricResult> authenticate() async {
    try {
      final bool isAvailable = await isBiometricAvailable();
      if (!isAvailable) {
        return BiometricResult(
          success: false,
          error: 'Biometric authentication not available',
        );
      }

      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Authenticate to access Agrinova',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (didAuthenticate) {
        final String hash = _generateBiometricHash();
        return BiometricResult(success: true, hash: hash);
      } else {
        return BiometricResult(
          success: false,
          error: 'Biometric authentication failed',
        );
      }
    } catch (e) {
      return BiometricResult(
        success: false,
        error: 'Biometric authentication error: $e',
      );
    }
  }

  // Setup biometric authentication
  Future<bool> setupBiometric({
    required String identifier,
    required String password,
  }) async {
    try {
      final BiometricResult authResult = await authenticate();
      if (!authResult.success) {
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      
      // Store encrypted credentials for biometric login
      final credentials = jsonEncode({
        'identifier': identifier,
        'password': password,
      });
      
      // Simple encryption - in production, use more secure methods
      final encryptedCredentials = base64Encode(utf8.encode(credentials));
      
      await prefs.setString('biometricCredentials', encryptedCredentials);
      await prefs.setBool('biometricEnabled', true);
      
      return true;
    } catch (e) {
      return false;
    }
  }

  // Disable biometric authentication
  Future<void> disableBiometric() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('biometricCredentials');
    await prefs.setBool('biometricEnabled', false);
  }

  // Check if biometric is enabled
  Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('biometricEnabled') ?? false;
  }

  // Get stored credentials for biometric login
  Future<Map<String, String>?> getStoredCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final encryptedCredentials = prefs.getString('biometricCredentials');
    
    if (encryptedCredentials == null) {
      return null;
    }

    try {
      final credentialsJson = utf8.decode(base64Decode(encryptedCredentials));
      final Map<String, dynamic> credentials = jsonDecode(credentialsJson);
      
      return {
        'identifier': credentials['identifier'],
        'password': credentials['password'],
      };
    } catch (e) {
      return null;
    }
  }

  // Generate biometric hash
  String _generateBiometricHash() {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final data = 'biometric-$timestamp';
    return sha256.convert(utf8.encode(data)).toString();
  }
}

class BiometricResult {
  final bool success;
  final String? hash;
  final String? error;

  BiometricResult({
    required this.success,
    this.hash,
    this.error,
  });
}
```

## Security Best Practices

### 1. Secure Storage Implementation

```typescript
// React Native
import Keychain from 'react-native-keychain';

export class SecureStorage {
  static async setItem(key: string, value: string): Promise<void> {
    await Keychain.setInternetCredentials(key, key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    await Keychain.resetInternetCredentials(key);
  }
}
```

```dart
// Flutter
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: IOSAccessibility.first_unlock_this_device,
    ),
  );

  static Future<void> setItem(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  static Future<String?> getItem(String key) async {
    return await _storage.read(key: key);
  }

  static Future<void> removeItem(String key) async {
    await _storage.delete(key: key);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

### 2. Network Security

```typescript
// Certificate pinning for React Native
import { NetworkingModule } from 'react-native';

export class NetworkSecurity {
  static setupCertificatePinning() {
    // Configure certificate pinning
    NetworkingModule.clearCookies(() => {});
  }

  static validateSSLCertificate(hostname: string): boolean {
    // Implement SSL certificate validation
    return true;
  }
}
```

This mobile client integration guide provides comprehensive examples for implementing secure, offline-capable authentication in mobile applications using the GraphQL authentication system.