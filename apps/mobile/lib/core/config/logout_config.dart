/// Logout configuration options for different logout behaviors
class LogoutConfig {
  // Timeout settings (in seconds)
  static const int apiLogoutTimeout = 5;
  static const int tokenClearingTimeout = 3;
  static const int offlineCredentialsClearingTimeout = 2;
  
  // Logout behavior options
  static const bool useParallelCleanup = true;
  static const bool allowPartialCleanup = true;
  static const bool enableBackgroundCleanup = true;
  
  // Emergency logout settings
  static const bool enableEmergencyLogout = true;
  static const bool skipApiCallInEmergency = true;
  
  // User experience settings
  static const bool showDetailedLogoutMessages = true;
  static const bool logCleanupProgress = true;
}

/// Logout behavior types
enum LogoutType {
  /// Standard logout with API call and complete cleanup
  standard,
  
  /// Fast logout with parallel operations and timeouts
  fast,
  
  /// Emergency logout with fire-and-forget cleanup
  emergency,
}

/// Logout result information
class LogoutResult {
  final bool success;
  final LogoutType type;
  final Duration duration;
  final List<String> warnings;
  final List<String> errors;
  
  const LogoutResult({
    required this.success,
    required this.type,
    required this.duration,
    this.warnings = const [],
    this.errors = const [],
  });
  
  bool get hasWarnings => warnings.isNotEmpty;
  bool get hasErrors => errors.isNotEmpty;
  bool get isClean => !hasWarnings && !hasErrors;
  
  @override
  String toString() {
    return 'LogoutResult(success: $success, type: $type, duration: ${duration.inMilliseconds}ms, warnings: ${warnings.length}, errors: ${errors.length})';
  }
}