import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// Security monitoring utility for form submissions and validations
/// Provides enhanced security logging and anomaly detection
class FormSecurityMonitor {
  static final Logger _logger = Logger();
  static final Map<String, List<DateTime>> _submissionAttempts = {};
  static final Map<String, List<String>> _validationFailures = {};
  
  // Security thresholds
  static const int maxSubmissionAttemptsPerMinute = 10;
  static const int maxValidationFailuresPerMinute = 20;
  static const Duration suspiciousActivityWindow = Duration(minutes: 5);
  
  /// Monitor form submission attempts for rate limiting and abuse detection
  static bool monitorSubmissionAttempt(String userId, String formType) {
    final now = DateTime.now();
    final userKey = '$userId-$formType';
    
    // Initialize if not exists
    _submissionAttempts[userKey] ??= [];
    
    // Clean old entries
    _submissionAttempts[userKey]!.removeWhere(
      (time) => now.difference(time) > const Duration(minutes: 1),
    );
    
    // Check rate limit
    if (_submissionAttempts[userKey]!.length >= maxSubmissionAttemptsPerMinute) {
      _logger.w('Rate limit exceeded for user $userId on form $formType');
      _logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        'userId': userId,
        'formType': formType,
        'attempts': _submissionAttempts[userKey]!.length,
        'timestamp': now.toIso8601String(),
      });
      return false;
    }
    
    // Record attempt
    _submissionAttempts[userKey]!.add(now);
    
    return true;
  }
  
  /// Monitor validation failures for potential abuse or attacks
  static void monitorValidationFailure(String userId, String fieldName, String errorType) {
    final now = DateTime.now();
    final userKey = '$userId-$fieldName';
    
    // Initialize if not exists
    _validationFailures[userKey] ??= [];
    
    // Clean old entries
    _validationFailures[userKey]!.removeWhere(
      (entry) {
        final timeStr = entry.split('|').first;
        final entryTime = DateTime.tryParse(timeStr);
        return entryTime == null || now.difference(entryTime).abs().inMinutes > 1;
      },
    );
    
    // Record failure
    _validationFailures[userKey]!.add('${now.toIso8601String()}|$errorType');
    
    // Check for suspicious patterns
    if (_validationFailures[userKey]!.length >= maxValidationFailuresPerMinute) {
      _logger.w('Excessive validation failures for user $userId on field $fieldName');
      _logSecurityEvent('EXCESSIVE_VALIDATION_FAILURES', {
        'userId': userId,
        'fieldName': fieldName,
        'failures': _validationFailures[userKey]!.length,
        'timestamp': now.toIso8601String(),
      });
    }
  }
  
  /// Detect potential injection attempts in form data
  static bool detectInjectionAttempt(String input, String fieldName) {
    final suspiciousPatterns = [
      // SQL injection patterns
      RegExp(r'(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)', caseSensitive: false),
      // XSS patterns
      RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false),
      RegExp(r'javascript:', caseSensitive: false),
      RegExp(r'on\w+\s*=', caseSensitive: false),
      // Command injection patterns
      RegExp(r'[;&|`$()]'),
      // Path traversal patterns
      RegExp(r'\.\.[\\/]'),
    ];
    
    for (final pattern in suspiciousPatterns) {
      if (pattern.hasMatch(input)) {
        _logger.w('Potential injection attempt detected in field $fieldName');
        _logSecurityEvent('INJECTION_ATTEMPT_DETECTED', {
          'fieldName': fieldName,
          'inputLength': input.length,
          'pattern': pattern.pattern,
          'timestamp': DateTime.now().toIso8601String(),
        });
        return true;
      }
    }
    
    return false;
  }
  
  /// Log security events for audit trail
  static void _logSecurityEvent(String eventType, Map<String, dynamic> details) {
    final securityEvent = {
      'type': eventType,
      'timestamp': DateTime.now().toIso8601String(),
      'details': details,
      'severity': _getEventSeverity(eventType),
    };
    
    _logger.w('SECURITY_EVENT: $securityEvent');
    
    // In production, this would send to security monitoring service
    if (kDebugMode) {
      print('🔒 Security Event: $eventType - ${details.toString()}');
    }
  }
  
  /// Get event severity level
  static String _getEventSeverity(String eventType) {
    switch (eventType) {
      case 'INJECTION_ATTEMPT_DETECTED':
        return 'HIGH';
      case 'RATE_LIMIT_EXCEEDED':
        return 'MEDIUM';
      case 'EXCESSIVE_VALIDATION_FAILURES':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }
  
  /// Clear monitoring data (for testing or privacy)
  static void clearMonitoringData() {
    _submissionAttempts.clear();
    _validationFailures.clear();
  }
  
  /// Get security statistics
  static Map<String, dynamic> getSecurityStatistics() {
    return {
      'activeUsers': _submissionAttempts.keys.length,
      'totalAttempts': _submissionAttempts.values.fold(0, (sum, list) => sum + list.length),
      'totalFailures': _validationFailures.values.fold(0, (sum, list) => sum + list.length),
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}

/// Enhanced error message utility with security considerations
class SecureErrorMessageUtil {
  static const Map<String, String> _safeErrorMessages = {
    'INVALID_INPUT': 'Input tidak valid. Harap periksa format data.',
    'RATE_LIMITED': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
    'VALIDATION_FAILED': 'Data tidak memenuhi persyaratan. Periksa kembali.',
    'NETWORK_ERROR': 'Koneksi bermasalah. Periksa jaringan Anda.',
    'UNAUTHORIZED': 'Anda tidak memiliki izin untuk operasi ini.',
    'SERVER_ERROR': 'Terjadi kesalahan server. Coba lagi nanti.',
    'TIMEOUT': 'Permintaan timeout. Periksa koneksi Anda.',
  };
  
  /// Get user-friendly error message without exposing system details
  static String getSafeErrorMessage(String errorCode, {String? context}) {
    final baseMessage = _safeErrorMessages[errorCode] ?? 'Terjadi kesalahan yang tidak diketahui.';
    
    if (context != null && context.isNotEmpty) {
      return '$baseMessage Context: $context';
    }
    
    return baseMessage;
  }
  
  /// Sanitize error message to prevent information disclosure
  static String sanitizeErrorMessage(String rawError) {
    // Remove sensitive information patterns
    final sanitized = rawError
        .replaceAll(RegExp(r'password.*?[\s\n]', caseSensitive: false), '[REDACTED] ')
        .replaceAll(RegExp(r'token.*?[\s\n]', caseSensitive: false), '[REDACTED] ')
        .replaceAll(RegExp(r'key.*?[\s\n]', caseSensitive: false), '[REDACTED] ')
        .replaceAll(RegExp(r'secret.*?[\s\n]', caseSensitive: false), '[REDACTED] ')
        .replaceAll(RegExp(r'/[a-zA-Z]:/'), '[PATH] ')  // Remove file paths
        .replaceAll(RegExp(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'), '[IP] '); // Remove IP addresses
    
    return sanitized.length > 200 ? '${sanitized.substring(0, 200)}...' : sanitized;
  }
}