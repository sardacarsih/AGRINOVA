import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'app_error.dart';

/// Error reporter interface
abstract class ErrorReporter {
  Future<void> reportError(AppError error, StackTrace? stackTrace);
  Future<void> reportCrash(dynamic error, StackTrace stackTrace);
  Future<void> reportCustomEvent(String name, Map<String, dynamic> parameters);
}

/// Console error reporter for development
class ConsoleErrorReporter implements ErrorReporter {
  @override
  Future<void> reportError(AppError error, StackTrace? stackTrace) async {
    if (kDebugMode) {
      print('🔴 AppError: ${error.code} - ${error.message}');
      if (error.details != null) {
        print('   Details: ${error.details}');
      }
      if (stackTrace != null) {
        print('   StackTrace: ${stackTrace.toString()}');
      }
    }
  }

  @override
  Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
    if (kDebugMode) {
      print('💥 Crash: $error');
      print('   StackTrace: ${stackTrace.toString()}');
    }
  }

  @override
  Future<void> reportCustomEvent(String name, Map<String, dynamic> parameters) async {
    if (kDebugMode) {
      print('📊 Event: $name');
      print('   Parameters: ${jsonEncode(parameters)}');
    }
  }
}

/// File-based error reporter for local logging
class FileErrorReporter implements ErrorReporter {
  final String _logDirectory;
  final int _maxLogFiles;
  final int _maxLogSizeBytes;

  FileErrorReporter({
    required String logDirectory,
    int maxLogFiles = 10,
    int maxLogSizeBytes = 5 * 1024 * 1024, // 5MB
  })  : _logDirectory = logDirectory,
        _maxLogFiles = maxLogFiles,
        _maxLogSizeBytes = maxLogSizeBytes;

  @override
  Future<void> reportError(AppError error, StackTrace? stackTrace) async {
    final logEntry = await _createLogEntry(
      level: 'ERROR',
      message: error.message,
      details: {
        'code': error.code,
        'details': error.details,
        'stackTrace': stackTrace?.toString(),
      },
    );
    
    await _writeLog(logEntry);
  }

  @override
  Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
    final logEntry = await _createLogEntry(
      level: 'CRASH',
      message: error.toString(),
      details: {
        'stackTrace': stackTrace.toString(),
      },
    );
    
    await _writeLog(logEntry);
  }

  @override
  Future<void> reportCustomEvent(String name, Map<String, dynamic> parameters) async {
    final logEntry = await _createLogEntry(
      level: 'EVENT',
      message: name,
      details: parameters,
    );
    
    await _writeLog(logEntry);
  }

  Future<Map<String, dynamic>> _createLogEntry({
    required String level,
    required String message,
    Map<String, dynamic>? details,
  }) async {
    final timestamp = DateTime.now().toIso8601String();
    final deviceInfo = await _getDeviceInfo();
    final appInfo = await _getAppInfo();

    return {
      'timestamp': timestamp,
      'level': level,
      'message': message,
      'details': details,
      'device': deviceInfo,
      'app': appInfo,
    };
  }

  Future<void> _writeLog(Map<String, dynamic> logEntry) async {
    try {
      final directory = Directory(_logDirectory);
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final today = DateTime.now();
      final fileName = 'agrinova_${today.year}${today.month.toString().padLeft(2, '0')}${today.day.toString().padLeft(2, '0')}.log';
      final logFile = File('${directory.path}/$fileName');

      // Check file size and rotate if necessary
      if (await logFile.exists()) {
        final fileSize = await logFile.length();
        if (fileSize >= _maxLogSizeBytes) {
          await _rotateLogFiles(directory, fileName);
        }
      }

      // Write log entry
      final logLine = '${jsonEncode(logEntry)}\n';
      await logFile.writeAsString(logLine, mode: FileMode.append);

      // Clean old log files
      await _cleanOldLogFiles(directory);
    } catch (e) {
      // Fallback to console if file writing fails
      if (kDebugMode) {
        print('Failed to write log: $e');
        print('Log entry: ${jsonEncode(logEntry)}');
      }
    }
  }

  Future<void> _rotateLogFiles(Directory directory, String fileName) async {
    final baseName = fileName.replaceAll('.log', '');
    final rotatedFileName = '${baseName}_${DateTime.now().millisecondsSinceEpoch}.log';
    
    final originalFile = File('${directory.path}/$fileName');
    final rotatedFile = File('${directory.path}/$rotatedFileName');
    
    if (await originalFile.exists()) {
      await originalFile.rename(rotatedFile.path);
    }
  }

  Future<void> _cleanOldLogFiles(Directory directory) async {
    final files = await directory.list().where((entity) => entity is File).cast<File>().toList();
    final logFiles = files.where((file) => file.path.endsWith('.log')).toList();

    // Sort by modification date (newest first)
    logFiles.sort((a, b) {
      final aModified = a.statSync().modified;
      final bModified = b.statSync().modified;
      return bModified.compareTo(aModified);
    });

    // Delete old files if we exceed the limit
    if (logFiles.length > _maxLogFiles) {
      final filesToDelete = logFiles.skip(_maxLogFiles);
      for (final file in filesToDelete) {
        try {
          await file.delete();
        } catch (e) {
          if (kDebugMode) {
            print('Failed to delete old log file: ${file.path}, error: $e');
          }
        }
      }
    }
  }

  Future<Map<String, dynamic>> _getDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        return {
          'platform': 'android',
          'model': androidInfo.model,
          'manufacturer': androidInfo.manufacturer,
          'version': androidInfo.version.release,
          'sdkInt': androidInfo.version.sdkInt,
        };
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return {
          'platform': 'ios',
          'model': iosInfo.model,
          'name': iosInfo.name,
          'systemVersion': iosInfo.systemVersion,
        };
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get device info: $e');
      }
    }
    
    return {'platform': Platform.operatingSystem};
  }

  Future<Map<String, dynamic>> _getAppInfo() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      return {
        'appName': packageInfo.appName,
        'packageName': packageInfo.packageName,
        'version': packageInfo.version,
        'buildNumber': packageInfo.buildNumber,
      };
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get app info: $e');
      }
      return {};
    }
  }
}

/// Remote error reporter for sending logs to server
class RemoteErrorReporter implements ErrorReporter {
  final String _baseUrl;
  final String _apiKey;
  final Duration _timeout;
  
  RemoteErrorReporter({
    required String baseUrl,
    required String apiKey,
    Duration timeout = const Duration(seconds: 10),
  })  : _baseUrl = baseUrl,
        _apiKey = apiKey,
        _timeout = timeout;

  @override
  Future<void> reportError(AppError error, StackTrace? stackTrace) async {
    final payload = await _createErrorPayload(
      type: 'error',
      error: error.toString(),
      message: error.message,
      details: {
        'code': error.code,
        'details': error.details,
        'stackTrace': stackTrace?.toString(),
      },
    );
    
    await _sendToServer(payload);
  }

  @override
  Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
    final payload = await _createErrorPayload(
      type: 'crash',
      error: error.toString(),
      message: 'Application crash',
      details: {
        'stackTrace': stackTrace.toString(),
      },
    );
    
    await _sendToServer(payload);
  }

  @override
  Future<void> reportCustomEvent(String name, Map<String, dynamic> parameters) async {
    final payload = await _createEventPayload(
      name: name,
      parameters: parameters,
    );
    
    await _sendToServer(payload);
  }

  Future<Map<String, dynamic>> _createErrorPayload({
    required String type,
    required String error,
    required String message,
    Map<String, dynamic>? details,
  }) async {
    final deviceInfo = await _getDeviceInfo();
    final appInfo = await _getAppInfo();

    return {
      'type': type,
      'timestamp': DateTime.now().toIso8601String(),
      'error': error,
      'message': message,
      'details': details,
      'device': deviceInfo,
      'app': appInfo,
    };
  }

  Future<Map<String, dynamic>> _createEventPayload({
    required String name,
    required Map<String, dynamic> parameters,
  }) async {
    final deviceInfo = await _getDeviceInfo();
    final appInfo = await _getAppInfo();

    return {
      'type': 'event',
      'timestamp': DateTime.now().toIso8601String(),
      'name': name,
      'parameters': parameters,
      'device': deviceInfo,
      'app': appInfo,
    };
  }

  Future<void> _sendToServer(Map<String, dynamic> payload) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = _timeout;
      
      final request = await client.postUrl(Uri.parse('$_baseUrl/errors'));
      request.headers.set('Content-Type', 'application/json');
      request.headers.set('Authorization', 'Bearer $_apiKey');
      
      request.add(utf8.encode(jsonEncode(payload)));
      
      final response = await request.close();
      
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to send error report: ${response.statusCode}');
      }
      
      client.close();
    } catch (e) {
      // Fallback to console if remote reporting fails
      if (kDebugMode) {
        print('Failed to send error to server: $e');
        print('Payload: ${jsonEncode(payload)}');
      }
    }
  }

  Future<Map<String, dynamic>> _getDeviceInfo() async {
    // Reuse implementation from FileErrorReporter
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        return {
          'platform': 'android',
          'model': androidInfo.model,
          'manufacturer': androidInfo.manufacturer,
          'version': androidInfo.version.release,
          'sdkInt': androidInfo.version.sdkInt,
        };
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return {
          'platform': 'ios',
          'model': iosInfo.model,
          'name': iosInfo.name,
          'systemVersion': iosInfo.systemVersion,
        };
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get device info: $e');
      }
    }
    
    return {'platform': Platform.operatingSystem};
  }

  Future<Map<String, dynamic>> _getAppInfo() async {
    // Reuse implementation from FileErrorReporter
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      return {
        'appName': packageInfo.appName,
        'packageName': packageInfo.packageName,
        'version': packageInfo.version,
        'buildNumber': packageInfo.buildNumber,
      };
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get app info: $e');
      }
      return {};
    }
  }
}

/// Composite error reporter that combines multiple reporters
class CompositeErrorReporter implements ErrorReporter {
  final List<ErrorReporter> _reporters;

  CompositeErrorReporter(this._reporters);

  @override
  Future<void> reportError(AppError error, StackTrace? stackTrace) async {
    await Future.wait(
      _reporters.map((reporter) => reporter.reportError(error, stackTrace)),
    );
  }

  @override
  Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
    await Future.wait(
      _reporters.map((reporter) => reporter.reportCrash(error, stackTrace)),
    );
  }

  @override
  Future<void> reportCustomEvent(String name, Map<String, dynamic> parameters) async {
    await Future.wait(
      _reporters.map((reporter) => reporter.reportCustomEvent(name, parameters)),
    );
  }
}