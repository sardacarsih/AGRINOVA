# 📱 Mobile Login Data Format Guide
## Agrinova GraphQL API - Mobile Authentication

> **Panduan lengkap untuk format data login mobile aplikasi Agrinova**

---

## 🔐 1. Format Data Login Dasar (Basic Mobile Login)

### GraphQL Mutation
```graphql
mutation MobileLoginBasic {
  login(input: {
    identifier: "username_atau_email"
    password: "password_user"
    platform: ANDROID  # atau IOS
  }) {
    accessToken
    refreshToken
    offlineToken
    tokenType
    expiresIn
    user {
      id
      username
      nama
      role
      company {
        id
        nama
      }
    }
    assignments {
      companies { id nama }
      estates { id nama }
      divisions { id nama }
    }
  }
}
```

### Variables JSON
```json
{
  "input": {
    "identifier": "satpam1",
    "password": "demo123",
    "platform": "ANDROID"
  }
}
```

---

## 🛡️ 2. Format Data Login Lengkap (Full Mobile Login with Security)

### GraphQL Mutation dengan Device Binding
```graphql
mutation MobileLoginFull($input: LoginInput!) {
  login(input: $input) {
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
      nama
      email
      noTelpon
      role
      companyId
      company {
        id
        nama
        status
      }
      isActive
      createdAt
      updatedAt
    }
    assignments {
      companies {
        id
        nama
        status
      }
      estates {
        id
        nama
        lokasi
        luasHa
      }
      divisions {
        id
        nama
        kode
        estate {
          id
          nama
        }
      }
    }
  }
}
```

### Variables JSON Lengkap
```json
{
  "input": {
    "identifier": "satpam1",
    "password": "demo123",
    "platform": "ANDROID",
    "deviceId": "android_abc123def456",
    "deviceFingerprint": "sha256_device_fingerprint_hash",
    "rememberDevice": true,
    "deviceInfo": {
      "model": "Samsung Galaxy S21",
      "osVersion": "Android 13",
      "appVersion": "1.0.0",
      "deviceName": "Samsung SM-G991B",
      "screenResolution": "2400x1080",
      "deviceLanguage": "id-ID"
    },
    "biometricHash": "sha256_biometric_hash_optional"
  }
}
```

---

## 📋 3. Field Descriptions

### Required Fields (Wajib)
- **`identifier`** (String): Username atau email user
- **`password`** (String): Password user
- **`platform`** (PlatformType): ANDROID, IOS, atau WEB

### Optional Fields for Enhanced Security
- **`deviceId`** (String): ID unik device mobile
- **`deviceFingerprint`** (String): Hash fingerprint device untuk keamanan
- **`rememberDevice`** (Boolean): Apakah device ini dipercaya
- **`deviceInfo`** (Object): Informasi detail device
- **`biometricHash`** (String): Hash biometric untuk autentikasi tambahan

### DeviceInfo Object Structure
```json
{
  "model": "Model device (Samsung Galaxy S21)",
  "osVersion": "Versi OS (Android 13)",
  "appVersion": "Versi aplikasi (1.0.0)",
  "deviceName": "Nama device (Samsung SM-G991B)", 
  "screenResolution": "Resolusi layar (2400x1080)",
  "deviceLanguage": "Bahasa device (id-ID)"
}
```

---

## 🎯 4. Response Format Yang Diterima

### Successful Login Response
```json
{
  "data": {
    "login": {
      "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "offlineToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "expiresAt": "2025-09-11T02:15:00Z",
      "refreshExpiresAt": "2025-09-18T01:15:00Z",
      "offlineExpiresAt": "2025-10-11T01:15:00Z",
      "user": {
        "id": "a0000000-0000-0000-0000-000000000011",
        "username": "satpam1",
        "nama": "Satpam Gate Agrinova 1",
        "role": "SATPAM",
        "company": {
          "id": "01234567-89ab-cdef-0123-456789abcdef",
          "nama": "PT Agrinova Sawit Utama"
        }
      },
      "assignments": {
        "companies": [
          {
            "id": "01234567-89ab-cdef-0123-456789abcdef",
            "nama": "PT Agrinova Sawit Utama",
            "status": "ACTIVE"
          }
        ],
        "estates": [],
        "divisions": []
      }
    }
  }
}
```

### Error Response
```json
{
  "errors": [
    {
      "message": "invalid credentials",
      "path": ["login"]
    }
  ]
}
```

---

## 🚀 5. Flutter/Dart Implementation

### Service Class Implementation
```dart
import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';

class MobileAuthService {
  static const String graphqlEndpoint = 'http://localhost:8080/graphql';
  static const _storage = FlutterSecureStorage();
  
  // GraphQL Client
  static GraphQLClient get client {
    final HttpLink httpLink = HttpLink(graphqlEndpoint);
    return GraphQLClient(
      link: httpLink,
      cache: GraphQLCache(store: InMemoryStore()),
    );
  }

  // Generate Device ID
  static Future<String> generateDeviceId() async {
    String? stored = await _storage.read(key: 'device_id');
    if (stored != null) return stored;
    
    final deviceInfo = DeviceInfoPlugin();
    String deviceId;
    
    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      deviceId = 'android_${androidInfo.id}';
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      deviceId = 'ios_${iosInfo.identifierForVendor}';
    } else {
      deviceId = 'mobile_${DateTime.now().millisecondsSinceEpoch}';
    }
    
    await _storage.write(key: 'device_id', value: deviceId);
    return deviceId;
  }

  // Generate Device Fingerprint
  static Future<String> generateDeviceFingerprint() async {
    final deviceInfo = DeviceInfoPlugin();
    String fingerprint = '';
    
    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      fingerprint = '${androidInfo.model}_${androidInfo.brand}_${androidInfo.device}';
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      fingerprint = '${iosInfo.model}_${iosInfo.systemName}_${iosInfo.systemVersion}';
    }
    
    final bytes = utf8.encode(fingerprint);
    final digest = sha256.convert(bytes);
    return digest.toString().substring(0, 32);
  }

  // Get Device Information
  static Future<Map<String, dynamic>> getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    final packageInfo = await PackageInfo.fromPlatform();
    
    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return {
        'model': '${androidInfo.brand} ${androidInfo.model}',
        'osVersion': 'Android ${androidInfo.version.release}',
        'appVersion': packageInfo.version,
        'deviceName': '${androidInfo.brand} ${androidInfo.device}',
        'screenResolution': '${androidInfo.displayMetrics.widthPx}x${androidInfo.displayMetrics.heightPx}',
        'deviceLanguage': Platform.localeName,
      };
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return {
        'model': iosInfo.model,
        'osVersion': '${iosInfo.systemName} ${iosInfo.systemVersion}',
        'appVersion': packageInfo.version,
        'deviceName': iosInfo.name,
        'screenResolution': 'iOS_Resolution',
        'deviceLanguage': Platform.localeName,
      };
    }
    
    return {
      'model': 'Unknown',
      'osVersion': 'Unknown',
      'appVersion': packageInfo.version,
      'deviceName': 'Mobile Device',
      'screenResolution': 'Unknown',
      'deviceLanguage': Platform.localeName,
    };
  }

  // Basic Mobile Login
  static Future<AuthResponse?> loginBasic({
    required String identifier,
    required String password,
  }) async {
    const String mutation = '''
      mutation MobileLoginBasic(\$input: LoginInput!) {
        login(input: \$input) {
          accessToken
          refreshToken
          offlineToken
          tokenType
          expiresIn
          user {
            id
            username
            nama
            role
            company {
              id
              nama
            }
          }
          assignments {
            companies { id nama }
            estates { id nama }
            divisions { id nama }
          }
        }
      }
    ''';

    final variables = {
      'input': {
        'identifier': identifier,
        'password': password,
        'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
      }
    };

    try {
      final result = await client.mutate(
        MutationOptions(
          document: gql(mutation),
          variables: variables,
        ),
      );

      if (result.hasException) {
        print('Login error: ${result.exception.toString()}');
        return null;
      }

      final loginData = result.data?['login'];
      if (loginData != null) {
        // Store tokens securely
        await _storeTokens(loginData);
        return AuthResponse.fromJson(loginData);
      }
    } catch (e) {
      print('Login exception: $e');
    }
    
    return null;
  }

  // Full Mobile Login with Device Binding
  static Future<AuthResponse?> loginFull({
    required String identifier,
    required String password,
    bool rememberDevice = true,
  }) async {
    const String mutation = '''
      mutation MobileLoginFull(\$input: LoginInput!) {
        login(input: \$input) {
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
            nama
            email
            noTelpon
            role
            companyId
            company {
              id
              nama
              status
            }
            isActive
          }
          assignments {
            companies {
              id
              nama
              status
            }
            estates {
              id
              nama
              lokasi
              luasHa
            }
            divisions {
              id
              nama
              kode
              estate {
                id
                nama
              }
            }
          }
        }
      }
    ''';

    final deviceId = await generateDeviceId();
    final deviceFingerprint = await generateDeviceFingerprint();
    final deviceInfo = await getDeviceInfo();

    final variables = {
      'input': {
        'identifier': identifier,
        'password': password,
        'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
        'deviceId': deviceId,
        'deviceFingerprint': deviceFingerprint,
        'rememberDevice': rememberDevice,
        'deviceInfo': deviceInfo,
      }
    };

    try {
      final result = await client.mutate(
        MutationOptions(
          document: gql(mutation),
          variables: variables,
        ),
      );

      if (result.hasException) {
        print('Full login error: ${result.exception.toString()}');
        return null;
      }

      final loginData = result.data?['login'];
      if (loginData != null) {
        // Store tokens securely
        await _storeTokens(loginData);
        return AuthResponse.fromJson(loginData);
      }
    } catch (e) {
      print('Full login exception: $e');
    }
    
    return null;
  }

  // Store Tokens Securely
  static Future<void> _storeTokens(Map<String, dynamic> loginData) async {
    if (loginData['accessToken'] != null) {
      await _storage.write(key: 'access_token', value: loginData['accessToken']);
    }
    if (loginData['refreshToken'] != null) {
      await _storage.write(key: 'refresh_token', value: loginData['refreshToken']);
    }
    if (loginData['offlineToken'] != null) {
      await _storage.write(key: 'offline_token', value: loginData['offlineToken']);
    }
    
    // Store user data
    await _storage.write(key: 'user_data', value: jsonEncode(loginData['user']));
    await _storage.write(key: 'assignments', value: jsonEncode(loginData['assignments']));
  }

  // Get Stored Tokens
  static Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: 'refresh_token');
  }

  static Future<String?> getOfflineToken() async {
    return await _storage.read(key: 'offline_token');
  }

  // Logout
  static Future<void> logout() async {
    await _storage.deleteAll();
  }
}

// Auth Response Model
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final String? offlineToken;
  final String tokenType;
  final int expiresIn;
  final DateTime? expiresAt;
  final DateTime? refreshExpiresAt;
  final DateTime? offlineExpiresAt;
  final User user;
  final UserAssignments assignments;

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    this.offlineToken,
    required this.tokenType,
    required this.expiresIn,
    this.expiresAt,
    this.refreshExpiresAt,
    this.offlineExpiresAt,
    required this.user,
    required this.assignments,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
      offlineToken: json['offlineToken'],
      tokenType: json['tokenType'],
      expiresIn: json['expiresIn'],
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
      refreshExpiresAt: json['refreshExpiresAt'] != null ? DateTime.parse(json['refreshExpiresAt']) : null,
      offlineExpiresAt: json['offlineExpiresAt'] != null ? DateTime.parse(json['offlineExpiresAt']) : null,
      user: User.fromJson(json['user']),
      assignments: UserAssignments.fromJson(json['assignments']),
    );
  }
}

// User Model
class User {
  final String id;
  final String username;
  final String nama;
  final String? email;
  final String? noTelpon;
  final String role;
  final String companyId;
  final Company company;
  final bool isActive;

  User({
    required this.id,
    required this.username,
    required this.nama,
    this.email,
    this.noTelpon,
    required this.role,
    required this.companyId,
    required this.company,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      nama: json['nama'],
      email: json['email'],
      noTelpon: json['noTelpon'],
      role: json['role'],
      companyId: json['companyId'],
      company: Company.fromJson(json['company']),
      isActive: json['isActive'] ?? true,
    );
  }
}

// Company Model
class Company {
  final String id;
  final String nama;
  final String? status;

  Company({
    required this.id,
    required this.nama,
    this.status,
  });

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: json['id'],
      nama: json['nama'],
      status: json['status'],
    );
  }
}

// User Assignments Model
class UserAssignments {
  final List<Company> companies;
  final List<Estate> estates;
  final List<Division> divisions;

  UserAssignments({
    required this.companies,
    required this.estates,
    required this.divisions,
  });

  factory UserAssignments.fromJson(Map<String, dynamic> json) {
    return UserAssignments(
      companies: (json['companies'] as List? ?? [])
          .map((e) => Company.fromJson(e))
          .toList(),
      estates: (json['estates'] as List? ?? [])
          .map((e) => Estate.fromJson(e))
          .toList(),
      divisions: (json['divisions'] as List? ?? [])
          .map((e) => Division.fromJson(e))
          .toList(),
    );
  }
}

// Estate Model
class Estate {
  final String id;
  final String nama;
  final String? lokasi;
  final double? luasHa;

  Estate({
    required this.id,
    required this.nama,
    this.lokasi,
    this.luasHa,
  });

  factory Estate.fromJson(Map<String, dynamic> json) {
    return Estate(
      id: json['id'],
      nama: json['nama'],
      lokasi: json['lokasi'],
      luasHa: json['luasHa']?.toDouble(),
    );
  }
}

// Division Model  
class Division {
  final String id;
  final String nama;
  final String? kode;
  final Estate? estate;

  Division({
    required this.id,
    required this.nama,
    this.kode,
    this.estate,
  });

  factory Division.fromJson(Map<String, dynamic> json) {
    return Division(
      id: json['id'],
      nama: json['nama'],
      kode: json['kode'],
      estate: json['estate'] != null ? Estate.fromJson(json['estate']) : null,
    );
  }
}
```

---

## 🎛️ 6. Usage Examples

### Simple Login (Satpam)
```dart
// Basic Login
final authResponse = await MobileAuthService.loginBasic(
  identifier: 'satpam1',
  password: 'demo123',
);

if (authResponse != null) {
  print('Login successful: ${authResponse.user.nama}');
  print('Role: ${authResponse.user.role}');
  print('Access Token: ${authResponse.accessToken}');
  print('Offline Token: ${authResponse.offlineToken}');
} else {
  print('Login failed');
}
```

### Full Login with Device Binding
```dart
// Full Login with Security
final authResponse = await MobileAuthService.loginFull(
  identifier: 'mandor1',
  password: 'demo123',
  rememberDevice: true,
);

if (authResponse != null) {
  print('Full login successful');
  print('User: ${authResponse.user.nama}');
  print('Company: ${authResponse.user.company.nama}');
  print('Offline until: ${authResponse.offlineExpiresAt}');
  
  // Access assignments
  print('Estates: ${authResponse.assignments.estates.length}');
  print('Divisions: ${authResponse.assignments.divisions.length}');
} else {
  print('Full login failed');
}
```

---

## 🔑 7. Token Management

### Token Types & Duration
- **Access Token**: 15 menit (untuk operasi API)
- **Refresh Token**: 7 hari (untuk perpanjang access token)  
- **Offline Token**: 30 hari (untuk operasi offline penuh)

### Token Usage
```dart
// Use Access Token for API calls
final accessToken = await MobileAuthService.getAccessToken();

final authLink = AuthLink(
  getToken: () async => 'Bearer $accessToken',
);

final client = GraphQLClient(
  link: authLink.concat(httpLink),
  cache: GraphQLCache(store: InMemoryStore()),
);
```

---

## ⚡ 8. Best Practices

### Security
1. **Selalu gunakan HTTPS** untuk produksi
2. **Store tokens** menggunakan Flutter Secure Storage
3. **Implement device fingerprinting** untuk keamanan tambahan
4. **Use biometric authentication** jika tersedia
5. **Regular token refresh** untuk keamanan optimal

### Performance
1. **Cache device information** untuk menghindari query berulang
2. **Implement offline-first** dengan SQLite
3. **Background sync** saat koneksi tersedia
4. **Optimistic updates** untuk UX yang lebih baik

### Error Handling
```dart
try {
  final response = await MobileAuthService.loginBasic(
    identifier: username,
    password: password,
  );
  
  if (response == null) {
    throw Exception('Login failed: Invalid credentials');
  }
  
  // Handle success
} catch (e) {
  // Handle specific error types
  if (e.toString().contains('invalid credentials')) {
    showDialog(context, 'Username atau password salah');
  } else if (e.toString().contains('network')) {
    showDialog(context, 'Koneksi internet bermasalah');
  } else {
    showDialog(context, 'Terjadi kesalahan: ${e.toString()}');
  }
}
```

---

## 📚 9. Role-Specific Examples

### Satpam (Gate Check Operations)
```dart
final satpamLogin = await MobileAuthService.loginFull(
  identifier: 'satpam1',
  password: 'demo123',
);

// Satpam akan mendapat:
// - Company-level access
// - Offline token 30 hari
// - Gate check permissions
```

### Mandor (Field Operations)
```dart
final mandorLogin = await MobileAuthService.loginFull(
  identifier: 'mandor1', 
  password: 'demo123',
);

// Mandor akan mendapat:
// - Division-level access
// - Harvest input permissions  
// - Offline capability
```

### Manager (Multi-Estate Access)
```dart
final managerLogin = await MobileAuthService.loginFull(
  identifier: 'manager1',
  password: 'demo123',
);

// Manager akan mendapat:
// - Multiple estate access
// - Monitoring permissions
// - Extended offline capability
```

---

## 🚀 Quick Start Summary

1. **Install dependencies** di `pubspec.yaml`:
   ```yaml
   dependencies:
     graphql_flutter: ^5.1.2
     flutter_secure_storage: ^9.0.0
     device_info_plus: ^9.1.0
     package_info_plus: ^4.2.0
     crypto: ^3.0.3
   ```

2. **Copy MobileAuthService** class ke project Anda

3. **Initialize login**:
   ```dart
   final auth = await MobileAuthService.loginBasic(
     identifier: 'your_username',
     password: 'your_password',
   );
   ```

4. **Handle response** dan store tokens untuk offline capability

---

> **🎉 Selamat!** Anda sekarang memiliki implementasi login mobile yang lengkap dan aman untuk aplikasi Agrinova.