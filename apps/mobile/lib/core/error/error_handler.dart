import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';

import 'app_error.dart';
import 'error_reporter.dart';

/// Global error handler for the application
class ErrorHandler {
  static final ErrorHandler _instance = ErrorHandler._internal();
  factory ErrorHandler() => _instance;
  ErrorHandler._internal();

  late final ErrorReporter _errorReporter;
  final List<ErrorListener> _listeners = [];

  /// Initialize the error handler
  void initialize({
    required ErrorReporter errorReporter,
  }) {
    _errorReporter = errorReporter;
    
    // Set up Flutter error handling
    FlutterError.onError = _handleFlutterError;
    
    // Set up Dart error handling for async errors
    PlatformDispatcher.instance.onError = _handlePlatformError;
  }

  /// Add error listener
  void addListener(ErrorListener listener) {
    _listeners.add(listener);
  }

  /// Remove error listener
  void removeListener(ErrorListener listener) {
    _listeners.remove(listener);
  }

  /// Handle and convert exceptions to AppError
  AppError handleError(dynamic error, {StackTrace? stackTrace}) {
    AppError appError;

    if (error is AppError) {
      appError = error;
    } else if (error is DioException) {
      appError = _handleDioError(error);
    } else if (error is SocketException) {
      appError = _handleSocketException(error);
    } else if (error is TimeoutException) {
      appError = _handleTimeoutException(error);
    } else if (error is FormatException) {
      appError = _handleFormatException(error);
    } else if (error is FileSystemException) {
      appError = _handleFileSystemException(error);
    } else {
      appError = SystemError.unexpected(error.toString());
    }

    // Report error
    _errorReporter.reportError(appError, stackTrace);

    // Notify listeners
    for (final listener in _listeners) {
      listener.onError(appError, stackTrace);
    }

    return appError;
  }

  /// Handle Flutter framework errors
  void _handleFlutterError(FlutterErrorDetails details) {
    handleError(details.exception, stackTrace: details.stack);
    
    if (kDebugMode) {
      FlutterError.presentError(details);
    }
  }

  /// Handle platform/Dart errors
  bool _handlePlatformError(Object error, StackTrace stackTrace) {
    handleError(error, stackTrace: stackTrace);
    return true;
  }

  /// Handle Dio HTTP errors
  AppError _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkError.timeout();

      case DioExceptionType.connectionError:
        if (error.error is SocketException) {
          return NetworkError.noConnection();
        }
        return NetworkError.requestError(error.message ?? 'Connection error');

      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode ?? 0;
        final serverMessage = _extractServerMessage(error.response);
        
        if (statusCode == 401) {
          return AuthError.unauthorized();
        } else if (statusCode == 403) {
          return AuthError.unauthorized();
        } else if (statusCode == 404) {
          return BusinessError.resourceNotFound('Resource', 'unknown');
        } else {
          return NetworkError.serverError(statusCode, serverMessage);
        }

      case DioExceptionType.cancel:
        return NetworkError.requestError('Request was cancelled');

      case DioExceptionType.unknown:
      default:
        if (error.error is SocketException) {
          return NetworkError.noConnection();
        }
        return NetworkError.requestError(error.message ?? 'Unknown network error');
    }
  }

  /// Handle socket exceptions
  AppError _handleSocketException(SocketException error) {
    return NetworkError.noConnection();
  }

  /// Handle timeout exceptions
  AppError _handleTimeoutException(TimeoutException error) {
    return NetworkError.timeout();
  }

  /// Handle format exceptions
  AppError _handleFormatException(FormatException error) {
    return ValidationError.invalidFormat('Data', 'Valid format');
  }

  /// Handle file system exceptions
  AppError _handleFileSystemException(FileSystemException error) {
    switch (error.osError?.errorCode) {
      case 2: // File not found
        return FileError.notFound(error.path ?? 'Unknown');
      case 13: // Permission denied
        return DeviceError.permissionDenied('File access');
      case 28: // No space left
        return DeviceError.storageNotAvailable();
      default:
        return FileError.readFailed(error.path ?? 'Unknown', error.message);
    }
  }

  /// Extract server error message from response
  String? _extractServerMessage(Response? response) {
    if (response?.data is Map) {
      final data = response!.data as Map<String, dynamic>;
      return data['message'] ?? data['error'] ?? data['detail'];
    }
    return null;
  }

  /// Handle specific business logic errors
  AppError handleBusinessError(String operation, dynamic error) {
    if (error is AppError) {
      return error;
    }

    // Map common business operation errors
    switch (operation) {
      case 'harvest_approval':
        if (error.toString().contains('already approved')) {
          return BusinessError.harvestAlreadyApproved('unknown');
        }
        break;
      case 'data_sync':
        if (error.toString().contains('conflict')) {
          return SyncError.conflictDetected('Data', 'unknown');
        }
        break;
      case 'authentication':
        if (error.toString().contains('invalid credentials')) {
          return AuthError.invalidCredentials();
        }
        break;
    }

    return handleError(error);
  }

  /// Handle validation errors
  ValidationError handleValidationError(String field, dynamic value, String rule) {
    switch (rule) {
      case 'required':
        return ValidationError.required(field);
      case 'email':
        return ValidationError.invalidFormat(field, 'email@domain.com');
      case 'phone':
        return ValidationError.invalidFormat(field, '+62xxxxxxxxxx');
      case 'number':
        return ValidationError.invalidFormat(field, 'numeric value');
      default:
        return ValidationError.custom('$field validation failed: $rule');
    }
  }

  /// Check if error is recoverable
  bool isRecoverable(AppError error) {
    switch (error.code) {
      case 'NETWORK_NO_CONNECTION':
      case 'NETWORK_TIMEOUT':
      case 'NETWORK_SERVER_ERROR':
      case 'AUTH_TOKEN_EXPIRED':
      case 'SYNC_CONFLICT_DETECTED':
        return true;
      
      case 'AUTH_INVALID_CREDENTIALS':
      case 'AUTH_ACCOUNT_LOCKED':
      case 'BUSINESS_INSUFFICIENT_PERMISSION':
      case 'VALIDATION_REQUIRED':
      case 'DB_CORRUPTED_DATA':
        return false;
      
      default:
        return true; // Assume recoverable by default
    }
  }

  /// Get user-friendly message for error
  String getUserMessage(AppError error) {
    // Return the localized message from the error
    return error.message;
  }

  /// Get recovery suggestion for error
  String? getRecoverySuggestion(AppError error) {
    switch (error.code) {
      case 'NETWORK_NO_CONNECTION':
        return 'Periksa koneksi internet dan coba lagi';
      
      case 'NETWORK_TIMEOUT':
        return 'Coba lagi dalam beberapa saat';
      
      case 'AUTH_TOKEN_EXPIRED':
        return 'Silakan login kembali';
      
      case 'DEVICE_PERMISSION_DENIED':
        return 'Berikan izin melalui pengaturan aplikasi';
      
      case 'DEVICE_STORAGE_NOT_AVAILABLE':
        return 'Kosongkan ruang penyimpanan dan coba lagi';
      
      case 'SYNC_CONFLICT_DETECTED':
        return 'Data akan diselaraskan secara otomatis';
      
      case 'VALIDATION_REQUIRED':
        return 'Pastikan semua field yang wajib telah diisi';
      
      default:
        return null;
    }
  }

  /// Get appropriate action for error
  ErrorAction getErrorAction(AppError error) {
    if (!isRecoverable(error)) {
      return ErrorAction.showError;
    }

    switch (error.code) {
      case 'NETWORK_NO_CONNECTION':
      case 'NETWORK_TIMEOUT':
        return ErrorAction.retry;
      
      case 'AUTH_TOKEN_EXPIRED':
        return ErrorAction.logout;
      
      case 'SYNC_CONFLICT_DETECTED':
        return ErrorAction.sync;
      
      case 'DEVICE_PERMISSION_DENIED':
        return ErrorAction.openSettings;
      
      default:
        return ErrorAction.showError;
    }
  }
}

/// Error listener interface
abstract class ErrorListener {
  void onError(AppError error, StackTrace? stackTrace);
}

/// Error actions that can be taken
enum ErrorAction {
  showError,
  retry,
  logout,
  sync,
  openSettings,
  ignore,
}
