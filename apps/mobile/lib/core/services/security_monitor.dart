import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:device_info_plus/device_info_plus.dart';

import '../constants/api_constants.dart';
import '../models/jwt_models.dart';
import 'device_service.dart';

/// Security event types for comprehensive logging
enum SecurityEventType {
  login,
  logout,
  tokenRefresh,
  tokenExpired,
  biometricAuth,
  deviceBinding,
  offlineAuth,
  suspiciousActivity,
  deviceTrust,
  passwordChange,
  sessionValidation,
  apiError,
  networkError,
}

/// Security event model for structured logging
class SecurityEvent {
  final String id;
  final SecurityEventType type;
  final String message;
  final String? userId;
  final String? username;
  final String? deviceId;
  final String? sessionId;
  final Map<String, dynamic>? metadata;
  final DateTime timestamp;
  final String severity; // 'low', 'medium', 'high', 'critical'

  SecurityEvent({
    required this.id,
    required this.type,
    required this.message,
    this.userId,
    this.username,
    this.deviceId,
    this.sessionId,
    this.metadata,
    required this.timestamp,
    required this.severity,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'message': message,
        'userId': userId,
        'username': username,
        'deviceId': deviceId,
        'sessionId': sessionId,
        'metadata': metadata,
        'timestamp': timestamp.toIso8601String(),
        'severity': severity,
        'platform': 'flutter',
        'appVersion': '1.0.0',
      };

  factory SecurityEvent.fromJson(Map<String, dynamic> json) => SecurityEvent(
        id: json['id'],
        type: SecurityEventType.values
            .firstWhere((e) => e.name == json['type']),
        message: json['message'],
        userId: json['userId'],
        username: json['username'],
        deviceId: json['deviceId'],
        sessionId: json['sessionId'],
        metadata: json['metadata'],
        timestamp: DateTime.parse(json['timestamp']),
        severity: json['severity'],
      );
}

/// Comprehensive security monitoring service
class SecurityMonitor {
  static SecurityMonitor? _instance;
  static SecurityMonitor get instance => _instance ??= SecurityMonitor._();
  
  SecurityMonitor._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'agrinova_security_logs',
      preferencesKeyPrefix: 'security_',
    ),
    iOptions: IOSOptions(
      groupId: 'group.com.agrinova.mobile.security',
      accountName: 'agrinova_security_monitor',
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  static const String _eventsKey = 'security_events';
  static const String _suspiciousActivityKey = 'suspicious_activity';
  static const int _maxStoredEvents = 1000;

  /// Log authentication event
  Future<void> logAuthEvent(
    SecurityEventType type,
    String message, {
    String? userId,
    String? username,
    String? sessionId,
    Map<String, dynamic>? metadata,
    String severity = 'medium',
  }) async {
    try {
      final deviceInfo = await DeviceService.getDeviceInfo();
      
      final event = SecurityEvent(
        id: _generateEventId(),
        type: type,
        message: message,
        userId: userId,
        username: username,
        deviceId: deviceInfo.deviceId,
        sessionId: sessionId,
        metadata: {
          'deviceFingerprint': deviceInfo.fingerprint,
          'platform': deviceInfo.platform,
          'osVersion': deviceInfo.osVersion,
          'appVersion': deviceInfo.appVersion,
          ...?metadata,
        },
        timestamp: DateTime.now(),
        severity: severity,
      );

      await _storeSecurityEvent(event);
      await _printSecurityLog(event);
      
      // Check for suspicious activity patterns
      await _checkSuspiciousActivity(event);
      
    } catch (e) {
      print('❌ Failed to log security event: $e');
    }
  }

  /// Log successful login
  Future<void> logLogin(String username, String userId, String sessionId, {
    bool isOffline = false,
    bool isBiometric = false,
  }) async {
    await logAuthEvent(
      SecurityEventType.login,
      'User login successful',
      userId: userId,
      username: username,
      sessionId: sessionId,
      metadata: {
        'isOffline': isOffline,
        'isBiometric': isBiometric,
        'loginMethod': isOffline ? 'offline' : 'online',
        'authType': isBiometric ? 'biometric' : 'password',
      },
      severity: 'low',
    );
  }

  /// Log logout
  Future<void> logLogout(String? username, String? userId, {
    bool isForced = false,
  }) async {
    await logAuthEvent(
      SecurityEventType.logout,
      'User logout ${isForced ? '(forced)' : '(voluntary)'}',
      userId: userId,
      username: username,
      metadata: {
        'isForced': isForced,
        'reason': isForced ? 'security_policy' : 'user_initiated',
      },
      severity: isForced ? 'medium' : 'low',
    );
  }

  /// Log token refresh
  Future<void> logTokenRefresh(String? userId, String? sessionId, {
    bool successful = true,
    String? errorMessage,
  }) async {
    await logAuthEvent(
      SecurityEventType.tokenRefresh,
      'JWT token refresh ${successful ? 'successful' : 'failed'}',
      userId: userId,
      sessionId: sessionId,
      metadata: {
        'successful': successful,
        'errorMessage': errorMessage,
        'refreshReason': 'automatic_renewal',
      },
      severity: successful ? 'low' : 'medium',
    );
  }

  /// Log token expiration
  Future<void> logTokenExpired(String? userId, String tokenType) async {
    await logAuthEvent(
      SecurityEventType.tokenExpired,
      '$tokenType token expired',
      userId: userId,
      metadata: {
        'tokenType': tokenType,
        'action': 'force_refresh',
      },
      severity: 'medium',
    );
  }

  /// Log biometric authentication
  Future<void> logBiometricAuth(String? username, {
    bool successful = true,
    String? errorMessage,
  }) async {
    await logAuthEvent(
      SecurityEventType.biometricAuth,
      'Biometric authentication ${successful ? 'successful' : 'failed'}',
      username: username,
      metadata: {
        'successful': successful,
        'errorMessage': errorMessage,
        'biometricType': 'fingerprint_or_face',
      },
      severity: successful ? 'low' : 'medium',
    );
  }

  /// Log device binding event
  Future<void> logDeviceBinding(String? userId, String deviceId, {
    bool successful = true,
    bool isNewDevice = false,
  }) async {
    await logAuthEvent(
      SecurityEventType.deviceBinding,
      'Device binding ${successful ? 'successful' : 'failed'}',
      userId: userId,
      metadata: {
        'targetDeviceId': deviceId,
        'successful': successful,
        'isNewDevice': isNewDevice,
        'bindingType': 'jwt_device_binding',
      },
      severity: isNewDevice ? 'medium' : 'low',
    );
  }

  /// Log suspicious activity
  Future<void> logSuspiciousActivity(String description, {
    String? userId,
    String? username,
    Map<String, dynamic>? details,
  }) async {
    await logAuthEvent(
      SecurityEventType.suspiciousActivity,
      'Suspicious activity detected: $description',
      userId: userId,
      username: username,
      metadata: {
        'description': description,
        'threatLevel': 'medium',
        'requiresAction': true,
        ...?details,
      },
      severity: 'high',
    );
  }

  /// Log API errors
  Future<void> logApiError(String endpoint, int statusCode, String error, {
    String? userId,
  }) async {
    await logAuthEvent(
      SecurityEventType.apiError,
      'API error on $endpoint: $error',
      userId: userId,
      metadata: {
        'endpoint': endpoint,
        'statusCode': statusCode,
        'errorMessage': error,
        'errorType': 'api_error',
      },
      severity: statusCode >= 500 ? 'high' : 'medium',
    );
  }

  /// Log network errors
  Future<void> logNetworkError(String error, {
    String? endpoint,
    String? userId,
  }) async {
    await logAuthEvent(
      SecurityEventType.networkError,
      'Network error: $error',
      userId: userId,
      metadata: {
        'endpoint': endpoint,
        'errorMessage': error,
        'errorType': 'network_error',
      },
      severity: 'low',
    );
  }

  /// Get security events for debugging
  Future<List<SecurityEvent>> getSecurityEvents({
    int limit = 100,
    SecurityEventType? filterType,
    String? filterSeverity,
  }) async {
    try {
      final eventsJson = await _storage.read(key: _eventsKey);
      if (eventsJson == null) return [];

      final eventsList = jsonDecode(eventsJson) as List;
      var events = eventsList
          .map((e) => SecurityEvent.fromJson(e))
          .toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      // Apply filters
      if (filterType != null) {
        events = events.where((e) => e.type == filterType).toList();
      }
      
      if (filterSeverity != null) {
        events = events.where((e) => e.severity == filterSeverity).toList();
      }

      return events.take(limit).toList();
    } catch (e) {
      print('❌ Failed to get security events: $e');
      return [];
    }
  }

  /// Clear old security events
  Future<void> clearSecurityEvents() async {
    try {
      await _storage.delete(key: _eventsKey);
      await _storage.delete(key: _suspiciousActivityKey);
      print('✅ Security events cleared');
    } catch (e) {
      print('❌ Failed to clear security events: $e');
    }
  }

  /// Get security summary
  Future<Map<String, dynamic>> getSecuritySummary() async {
    try {
      final events = await getSecurityEvents(limit: 500);
      
      final summary = {
        'totalEvents': events.length,
        'eventsByType': <String, int>{},
        'eventsBySeverity': <String, int>{},
        'recentHighSeverityEvents': 0,
        'lastLoginTime': null,
        'totalLogins': 0,
        'totalLogouts': 0,
        'suspiciousActivityCount': 0,
      };

      for (final event in events) {
        // Count by type
        final eventsByType = summary['eventsByType'] as Map<String, dynamic>;
        eventsByType[event.type.name] = (eventsByType[event.type.name] ?? 0) + 1;
        
        // Count by severity
        final eventsBySeverity = summary['eventsBySeverity'] as Map<String, dynamic>;
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] ?? 0) + 1;
        
        // Count recent high severity events (last 24 hours)
        if (event.severity == 'high' && 
            event.timestamp.isAfter(DateTime.now().subtract(const Duration(hours: 24)))) {
          summary['recentHighSeverityEvents'] = (summary['recentHighSeverityEvents'] as int) + 1;
        }
        
        // Track login/logout counts
        if (event.type == SecurityEventType.login) {
          summary['totalLogins'] = (summary['totalLogins'] as int) + 1;
          if (summary['lastLoginTime'] == null) {
            summary['lastLoginTime'] = event.timestamp.toIso8601String();
          }
        }
        
        if (event.type == SecurityEventType.logout) {
          summary['totalLogouts'] = (summary['totalLogouts'] as int) + 1;
        }
        
        if (event.type == SecurityEventType.suspiciousActivity) {
          summary['suspiciousActivityCount'] = (summary['suspiciousActivityCount'] as int) + 1;
        }
      }

      return summary;
    } catch (e) {
      print('❌ Failed to get security summary: $e');
      return {'error': e.toString()};
    }
  }

  // PRIVATE HELPER METHODS
  
  Future<void> _storeSecurityEvent(SecurityEvent event) async {
    try {
      final eventsJson = await _storage.read(key: _eventsKey);
      List<Map<String, dynamic>> events = [];
      
      if (eventsJson != null) {
        final eventsList = jsonDecode(eventsJson) as List;
        events = eventsList.cast<Map<String, dynamic>>();
      }
      
      // Add new event
      events.add(event.toJson());
      
      // Keep only the most recent events
      if (events.length > _maxStoredEvents) {
        events = events.sublist(events.length - _maxStoredEvents);
      }
      
      await _storage.write(key: _eventsKey, value: jsonEncode(events));
    } catch (e) {
      print('❌ Failed to store security event: $e');
    }
  }

  Future<void> _printSecurityLog(SecurityEvent event) async {
    final severityIcon = {
      'low': '🟢',
      'medium': '🟡', 
      'high': '🔴',
      'critical': '🚨',
    }[event.severity] ?? '⚪';
    
    print('$severityIcon SECURITY LOG [${event.type.name.toUpperCase()}] ${event.message}');
    print('   📅 ${event.timestamp.toLocal()}');
    if (event.username != null) print('   👤 User: ${event.username}');
    if (event.deviceId != null) print('   📱 Device: ${event.deviceId}');
    if (event.sessionId != null) print('   🔑 Session: ${event.sessionId}');
    if (event.metadata != null && event.metadata!.isNotEmpty) {
      print('   📋 Metadata: ${event.metadata}');
    }
    print('   ═══════════════════════════════════════');
  }

  Future<void> _checkSuspiciousActivity(SecurityEvent event) async {
    // Check for multiple failed login attempts
    if (event.type == SecurityEventType.login && 
        event.metadata?['successful'] == false) {
      await _trackFailedLogin(event);
    }
    
    // Check for unusual device binding attempts
    if (event.type == SecurityEventType.deviceBinding && 
        event.metadata?['isNewDevice'] == true) {
      await _trackDeviceBinding(event);
    }
    
    // Check for token refresh failures
    if (event.type == SecurityEventType.tokenRefresh && 
        event.metadata?['successful'] == false) {
      await _trackTokenFailures(event);
    }
  }

  Future<void> _trackFailedLogin(SecurityEvent event) async {
    // Implementation for tracking failed login attempts
    // Could implement rate limiting or account lockout logic here
  }

  Future<void> _trackDeviceBinding(SecurityEvent event) async {
    // Implementation for tracking unusual device binding
    // Could flag accounts with too many new device registrations
  }

  Future<void> _trackTokenFailures(SecurityEvent event) async {
    // Implementation for tracking token refresh failures  
    // Could indicate compromised refresh tokens
  }

  String _generateEventId() {
    return 'sec_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
  }
}