import 'dart:async';
import '../config/logout_config.dart';

/// Performance tracker for measuring logout operations
class LogoutPerformanceTracker {
  final Stopwatch _stopwatch = Stopwatch();
  final List<String> _operationLog = [];
  final List<String> _warnings = [];
  final List<String> _errors = [];
  LogoutType _logoutType = LogoutType.standard;
  
  /// Start tracking logout performance
  void startTracking(LogoutType type) {
    _logoutType = type;
    _stopwatch.start();
    _operationLog.clear();
    _warnings.clear();
    _errors.clear();
    _logOperation('Logout tracking started', type: type.name);
  }
  
  /// Log an operation with timing
  void logOperation(String operation) {
    _logOperation(operation);
  }
  
  void _logOperation(String operation, {String? type}) {
    final elapsed = _stopwatch.elapsedMilliseconds;
    final entry = '[$elapsed ms] $operation${type != null ? ' ($type)' : ''}';
    _operationLog.add(entry);
    if (LogoutConfig.logCleanupProgress) {
      print('🔍 $entry');
    }
  }
  
  /// Log a warning
  void logWarning(String warning) {
    _warnings.add(warning);
    _logOperation('⚠️ WARNING: $warning');
  }
  
  /// Log an error
  void logError(String error) {
    _errors.add(error);
    _logOperation('❌ ERROR: $error');
  }
  
  /// Complete tracking and return result
  LogoutResult completeTracking() {
    _stopwatch.stop();
    final duration = Duration(milliseconds: _stopwatch.elapsedMilliseconds);
    _logOperation('Logout tracking completed');
    
    final result = LogoutResult(
      success: true, // Always true since we don't fail logout due to cleanup issues
      type: _logoutType,
      duration: duration,
      warnings: List.unmodifiable(_warnings),
      errors: List.unmodifiable(_errors),
    );
    
    _printSummary(result);
    return result;
  }
  
  /// Print performance summary
  void _printSummary(LogoutResult result) {
    if (!LogoutConfig.showDetailedLogoutMessages) return;
    
    print('\n📊 LOGOUT PERFORMANCE SUMMARY');
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    print('Type: ${result.type.name.toUpperCase()}');
    print('Duration: ${result.duration.inMilliseconds}ms');
    print('Warnings: ${result.warnings.length}');
    print('Errors: ${result.errors.length}');
    print('Status: ${result.isClean ? '✅ CLEAN' : result.hasErrors ? '❌ WITH ERRORS' : '⚠️ WITH WARNINGS'}');
    
    if (result.hasWarnings) {
      print('\n⚠️ Warnings:');
      for (final warning in result.warnings) {
        print('  • $warning');
      }
    }
    
    if (result.hasErrors) {
      print('\n❌ Errors:');
      for (final error in result.errors) {
        print('  • $error');
      }
    }
    
    print('\n📝 Operation Log:');
    for (final operation in _operationLog) {
      print('  $operation');
    }
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /// Get current elapsed time
  int get elapsedMilliseconds => _stopwatch.elapsedMilliseconds;
  
  /// Check if tracking is active
  bool get isTracking => _stopwatch.isRunning;
}

/// Global logout performance tracker instance
final logoutPerformanceTracker = LogoutPerformanceTracker();